using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IAuditService _audit;

    public FilesController(AppDbContext db, IWebHostEnvironment env, IAuditService audit)
    {
        _db = db;
        _env = env;
        _audit = audit;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Upload([FromForm] FileUploadRequest request)
    {
        var file = request.File;
        var module = request.Module;
        var relatedId = request.RelatedId;
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "A file is required." });

        var dir = Path.Combine(_env.ContentRootPath, "uploads");
        Directory.CreateDirectory(dir);

        var original = Path.GetFileName(file.FileName);
        var stored = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}_{original}";
        var physical = Path.Combine(dir, stored);
        await using (var stream = System.IO.File.Create(physical))
            await file.CopyToAsync(stream);

        var record = new FileRecord
        {
            FileName = original,
            FilePath = $"/uploads/{stored}",
            ContentType = file.ContentType,
            SizeBytes = file.Length,
            Module = module,
            RelatedId = relatedId,
            UploadedBy = UserContext.GetUserId(User),
            UploadedAt = DateTime.UtcNow
        };
        _db.FileRecords.Add(record);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(UserContext.GetUserId(User), "Create", "File", record.Id, original);
        return Ok(record);
    }
}

public class FileUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public string? Module { get; set; }
    public long? RelatedId { get; set; }
}
