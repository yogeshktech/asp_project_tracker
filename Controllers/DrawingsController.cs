using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/drawings")]
public sealed class DrawingsController : ControllerBase
{
    private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".webp"] = "image/webp",
        [".pdf"] = "application/pdf", [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xls"] = "application/vnd.ms-excel",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    private readonly AppDbContext _db;
    private readonly IUploadStorage _storage;
    private readonly IPermissionService _permissions;

    public DrawingsController(AppDbContext db, IUploadStorage storage, IPermissionService permissions)
    {
        _db = db;
        _storage = storage;
        _permissions = permissions;
    }

    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] long projectId)
    {
        if (!await _permissions.CanViewModuleAsync(UserId, projectId, "Drawings")) return Forbid();
        var rows = await _db.DrawingUploads.AsNoTracking()
            .Where(x => x.ProjectId == projectId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        var extras = await _db.DrawingUploadFiles.AsNoTracking()
            .Where(x => rows.Select(r => r.Id).Contains(x.DrawingUploadId)).ToListAsync();
        return Ok(rows.Select(x => ToDto(x, extras.Where(f => f.DrawingUploadId == x.Id))));
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Create([FromForm] DrawingUploadForm form)
    {
        if (!await _permissions.CanEditModuleAsync(UserId, form.ProjectId, "Drawings")) return Forbid();
        if (string.IsNullOrWhiteSpace(form.Name)) return BadRequest(new { message = "Name is required." });
        if (form.Name.Trim().Length > 200) return BadRequest(new { message = "Name must be 200 characters or fewer." });
        if (form.Description?.Length > 2000) return BadRequest(new { message = "Description must be 2000 characters or fewer." });
        var files = GetFiles(form);
        if (files.Count == 0) return BadRequest(new { message = "Choose a drawing file to upload." });
        if (!await _db.Projects.AnyAsync(x => x.Id == form.ProjectId)) return NotFound(new { message = "Project not found." });
        if (files.Any(f => f.Length == 0 || !TryGetContentType(f.FileName, out _))) return BadRequest(new { message = "Choose non-empty files of type JPG, JPEG, WEBP, PDF, DOC, DOCX, XLS, XLSX." });

        var storedKeys = new List<string>();
        foreach (var file in files)
        {
            var key = $"drawing_{form.ProjectId}_{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
            await using var stream = file.OpenReadStream();
            TryGetContentType(file.FileName, out var type);
            await _storage.SaveAsync(key, stream, type);
            storedKeys.Add(key);
        }

        var drawing = new DrawingUpload
        {
            ProjectId = form.ProjectId,
            Name = form.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(form.Description) ? null : form.Description.Trim(),
            FileName = Path.GetFileName(files[0].FileName),
            FilePath = storedKeys[0],
            ContentType = ContentTypeFor(files[0].FileName),
            SizeBytes = files[0].Length,
            UploadedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };
        try
        {
            _db.DrawingUploads.Add(drawing);
            await _db.SaveChangesAsync();
            foreach (var (file, index) in files.Skip(1).Select((file, index) => (file, index)))
                _db.DrawingUploadFiles.Add(new DrawingUploadFile { DrawingUploadId = drawing.Id, FileName = Path.GetFileName(file.FileName), FilePath = storedKeys[index + 1], ContentType = ContentTypeFor(file.FileName), SizeBytes = file.Length });
            await _db.SaveChangesAsync();
            return Ok(ToDto(drawing, _db.DrawingUploadFiles.Local.Where(f => f.DrawingUploadId == drawing.Id)));
        }
        catch
        {
            foreach (var key in storedKeys) await _storage.DeleteAsync(key);
            throw;
        }
    }

    [HttpPut("{id:long}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Update(long id, [FromForm] DrawingUploadForm form)
    {
        var drawing = await _db.DrawingUploads.FirstOrDefaultAsync(x => x.Id == id);
        if (drawing == null) return NotFound();
        if (!await _permissions.CanUpdateModuleAsync(UserId, drawing.ProjectId, "Drawings")) return Forbid();
        if (form.ProjectId != drawing.ProjectId) return BadRequest(new { message = "A drawing cannot be moved to another project." });
        if (string.IsNullOrWhiteSpace(form.Name)) return BadRequest(new { message = "Name is required." });
        if (form.Name.Trim().Length > 200) return BadRequest(new { message = "Name must be 200 characters or fewer." });
        if (form.Description?.Length > 2000) return BadRequest(new { message = "Description must be 2000 characters or fewer." });

        var oldKeys = new List<string> { drawing.FilePath };
        var oldExtras = await _db.DrawingUploadFiles.Where(x => x.DrawingUploadId == drawing.Id).ToListAsync();
        oldKeys.AddRange(oldExtras.Select(x => x.FilePath));
        var files = GetFiles(form);
        var newKeys = new List<string>();
        var removeExistingFile = form.RemoveFile && files.Count == 0;
        if (files.Count > 0)
        {
            if (files.Any(f => f.Length == 0 || !TryGetContentType(f.FileName, out _))) return BadRequest(new { message = "Choose non-empty files of type JPG, JPEG, WEBP, PDF, DOC, DOCX, XLS, XLSX." });
            foreach (var file in files)
            {
                var key = $"drawing_{drawing.ProjectId}_{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
                await using var stream = file.OpenReadStream();
                await _storage.SaveAsync(key, stream, ContentTypeFor(file.FileName));
                newKeys.Add(key);
            }
            drawing.FilePath = newKeys[0];
            drawing.FileName = Path.GetFileName(files[0].FileName);
            drawing.ContentType = ContentTypeFor(files[0].FileName);
            drawing.SizeBytes = files[0].Length;
            drawing.UploadedBy = UserId;
            _db.DrawingUploadFiles.RemoveRange(oldExtras);
            foreach (var (file, index) in files.Skip(1).Select((file, index) => (file, index)))
                _db.DrawingUploadFiles.Add(new DrawingUploadFile { DrawingUploadId = drawing.Id, FileName = Path.GetFileName(file.FileName), FilePath = newKeys[index + 1], ContentType = ContentTypeFor(file.FileName), SizeBytes = file.Length });
        }
        else if (removeExistingFile)
        {
            _db.DrawingUploadFiles.RemoveRange(oldExtras);
            drawing.FilePath = string.Empty;
            drawing.FileName = string.Empty;
            drawing.ContentType = "application/octet-stream";
            drawing.SizeBytes = 0;
        }

        drawing.Name = form.Name.Trim();
        drawing.Description = string.IsNullOrWhiteSpace(form.Description) ? null : form.Description.Trim();
        drawing.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _db.SaveChangesAsync();
        }
        catch
        {
            foreach (var key in newKeys) await _storage.DeleteAsync(key);
            throw;
        }
        if (files.Count > 0 || removeExistingFile) foreach (var key in oldKeys) if (!string.IsNullOrEmpty(key)) await _storage.DeleteAsync(key);
        return Ok(ToDto(drawing, await _db.DrawingUploadFiles.AsNoTracking().Where(f => f.DrawingUploadId == drawing.Id).ToListAsync()));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var drawing = await _db.DrawingUploads.FirstOrDefaultAsync(x => x.Id == id);
        if (drawing == null) return NotFound();
        if (!await _permissions.CanDeleteModuleAsync(UserId, drawing.ProjectId, "Drawings")) return Forbid();
        var extraKeys = await _db.DrawingUploadFiles.Where(x => x.DrawingUploadId == id).Select(x => x.FilePath).ToListAsync();
        _db.DrawingUploads.Remove(drawing);
        await _db.SaveChangesAsync();
        await _storage.DeleteAsync(drawing.FilePath);
        foreach (var key in extraKeys) await _storage.DeleteAsync(key);
        return NoContent();
    }

    [HttpGet("{id:long}/file")]
    public async Task<IActionResult> File(long id, [FromQuery] bool download = false)
    {
        var drawing = await _db.DrawingUploads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (drawing == null) return NotFound();
        if (!await _permissions.CanViewModuleAsync(UserId, drawing.ProjectId, "Drawings")) return Forbid();
        if (string.IsNullOrWhiteSpace(drawing.FilePath)) return NotFound();
        var stream = await _storage.OpenReadAsync(drawing.FilePath);
        if (stream == null) return NotFound();
        return download
            ? base.File(stream, drawing.ContentType, drawing.FileName, enableRangeProcessing: true)
            : base.File(stream, drawing.ContentType, enableRangeProcessing: true);
    }

    [HttpGet("{id:long}/files/{fileId:long}")]
    public async Task<IActionResult> ExtraFile(long id, long fileId, [FromQuery] bool download = false)
    {
        var drawing = await _db.DrawingUploads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (drawing == null) return NotFound();
        if (!await _permissions.CanViewModuleAsync(UserId, drawing.ProjectId, "Drawings")) return Forbid();
        var file = await _db.DrawingUploadFiles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == fileId && x.DrawingUploadId == id);
        if (file == null) return NotFound();
        var stream = await _storage.OpenReadAsync(file.FilePath);
        if (stream == null) return NotFound();
        return download ? base.File(stream, file.ContentType, file.FileName, enableRangeProcessing: true) : base.File(stream, file.ContentType, enableRangeProcessing: true);
    }

    private static bool TryGetContentType(string fileName, out string contentType) =>
        AllowedTypes.TryGetValue(Path.GetExtension(fileName), out contentType!);

    private static List<IFormFile> GetFiles(DrawingUploadForm form) => form.Files.Where(x => x.Length > 0).ToList() is { Count: > 0 } files ? files : form.File is { Length: > 0 } legacy ? new List<IFormFile> { legacy } : new List<IFormFile>();
    private static string ContentTypeFor(string fileName) { TryGetContentType(fileName, out var value); return value; }
    private static object ToDto(DrawingUpload drawing, IEnumerable<DrawingUploadFile> extras) => new
    {
        drawing.Id, drawing.ProjectId, drawing.Name, drawing.Description, drawing.FileName,
        drawing.ContentType, drawing.SizeBytes, drawing.UploadedBy, drawing.CreatedAt, drawing.UpdatedAt,
        Files = new[] { new { Id = 0L, drawing.FileName, drawing.ContentType, drawing.SizeBytes } }.Concat(extras.Select(f => new { f.Id, f.FileName, f.ContentType, f.SizeBytes }))
    };
}

public sealed class DrawingUploadForm
{
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public IFormFile? File { get; set; }
    public List<IFormFile> Files { get; set; } = new();
    public bool RemoveFile { get; set; }
}
