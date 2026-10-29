using Amazon.S3;
using Amazon.S3.Model;

namespace project_tracker_madhu.Common;

public interface IUploadStorage
{
    bool UsesSpaces { get; }
    Task SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken = default);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
}

/// <summary>
/// Uses DigitalOcean Spaces when credentials are configured, and local uploads during development otherwise.
/// Object keys remain independent of the bucket and endpoint so those can be changed through configuration.
/// </summary>
public sealed class UploadStorage : IUploadStorage, IDisposable
{
    private readonly string _bucket;
    private readonly string _uploadsDirectory;
    private readonly IAmazonS3? _spaces;

    public bool UsesSpaces => _spaces != null;

    public UploadStorage(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var section = configuration.GetSection("DigitalOcean");
        var accessKey = section["AccessKey"];
        var secretKey = section["SecretKey"];
        _bucket = section["BucketName"] ?? string.Empty;
        var endpoint = section["ServiceUrl"];
        _uploadsDirectory = Path.Combine(environment.ContentRootPath, "uploads");

        if (!string.IsNullOrWhiteSpace(accessKey) && !string.IsNullOrWhiteSpace(secretKey))
        {
            if (string.IsNullOrWhiteSpace(_bucket) || string.IsNullOrWhiteSpace(endpoint))
                throw new InvalidOperationException("DigitalOcean BucketName and ServiceUrl are required when Spaces credentials are configured.");

            _spaces = new AmazonS3Client(accessKey, secretKey, new AmazonS3Config
            {
                ServiceURL = endpoint.TrimEnd('/'),
                AuthenticationRegion = section["SigningRegion"] ?? "us-east-1",
                ForcePathStyle = false
            });
        }
    }

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        var safeKey = NormalizeKey(key);
        if (_spaces != null)
        {
            await _spaces.PutObjectAsync(new PutObjectRequest
            {
                BucketName = _bucket,
                Key = safeKey,
                InputStream = content,
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
                AutoCloseStream = false
            }, cancellationToken);
            return;
        }

        var path = LocalPath(safeKey);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var output = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await content.CopyToAsync(output, cancellationToken);
    }

    public async Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken = default)
    {
        var safeKey = NormalizeKey(key);
        if (_spaces != null)
        {
            try
            {
                var response = await _spaces.GetObjectAsync(new GetObjectRequest { BucketName = _bucket, Key = safeKey }, cancellationToken);
                return new OwnedResponseStream(response);
            }
            catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
        }

        var path = LocalPath(safeKey);
        return File.Exists(path) ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true) : null;
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        var safeKey = NormalizeKey(key);
        if (_spaces != null)
        {
            await _spaces.DeleteObjectAsync(new DeleteObjectRequest { BucketName = _bucket, Key = safeKey }, cancellationToken);
            return;
        }

        var path = LocalPath(safeKey);
        if (File.Exists(path)) File.Delete(path);
    }

    private string LocalPath(string key)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_uploadsDirectory, key.Replace('/', Path.DirectorySeparatorChar)));
        var root = Path.GetFullPath(_uploadsDirectory) + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid upload storage key.");
        return fullPath;
    }

    public static string NormalizeKey(string key)
    {
        var normalized = (key ?? string.Empty).Replace('\\', '/').TrimStart('/');
        if (normalized.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase)) normalized = normalized[8..];
        if (string.IsNullOrWhiteSpace(normalized) || normalized.Split('/').Any(part => part is "." or ".."))
            throw new InvalidOperationException("Invalid upload storage key.");
        return normalized;
    }

    public void Dispose() => _spaces?.Dispose();

    private sealed class OwnedResponseStream : Stream
    {
        private readonly GetObjectResponse _response;
        public OwnedResponseStream(GetObjectResponse response) => _response = response;
        private Stream Inner => _response.ResponseStream;
        public override bool CanRead => Inner.CanRead;
        public override bool CanSeek => Inner.CanSeek;
        public override bool CanWrite => false;
        public override long Length => Inner.Length;
        public override long Position { get => Inner.Position; set => Inner.Position = value; }
        public override int Read(byte[] buffer, int offset, int count) => Inner.Read(buffer, offset, count);
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) => Inner.ReadAsync(buffer, cancellationToken);
        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) => Inner.ReadAsync(buffer, offset, count, cancellationToken);
        public override long Seek(long offset, SeekOrigin origin) => Inner.Seek(offset, origin);
        public override void Flush() => Inner.Flush();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        protected override void Dispose(bool disposing)
        {
            if (disposing) _response.Dispose();
            base.Dispose(disposing);
        }
        public override ValueTask DisposeAsync()
        {
            _response.Dispose();
            GC.SuppressFinalize(this);
            return ValueTask.CompletedTask;
        }
    }
}
