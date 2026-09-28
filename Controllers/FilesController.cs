using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    private readonly IPermissionService _permissions;

    public FilesController(AppDbContext db, IWebHostEnvironment env, IAuditService audit, IPermissionService permissions)
    {
        _db = db;
        _env = env;
        _audit = audit;
        _permissions = permissions;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? module, [FromQuery] long? relatedId)
    {
        if (!string.Equals(module, "Project", StringComparison.OrdinalIgnoreCase) || !relatedId.HasValue)
            return BadRequest(new { message = "Specify a project attachment scope." });
        if (string.Equals(module, "Project", StringComparison.OrdinalIgnoreCase) && relatedId.HasValue &&
            !await _permissions.CanViewProjectAsync(UserContext.GetUserId(User)!.Value, relatedId.Value)) return Forbid();
        var files = await _db.FileRecords.AsNoTracking()
            .Where(f => f.Module == module && f.RelatedId == relatedId)
            .OrderByDescending(f => f.UploadedAt)
            .Select(f => new { f.Id, f.FileName, f.ContentType, f.SizeBytes, f.Module, f.RelatedId, f.UploadedBy, f.UploadedAt })
            .ToListAsync();
        return Ok(files);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Download(long id)
    {
        var record = await _db.FileRecords.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id);
        if (record == null) return NotFound();
        if (string.Equals(record.Module, "Project", StringComparison.OrdinalIgnoreCase) && record.RelatedId.HasValue &&
            !await _permissions.CanViewProjectAsync(UserContext.GetUserId(User)!.Value, record.RelatedId.Value)) return Forbid();
        var path = Path.Combine(_env.ContentRootPath, "uploads", Path.GetFileName(record.FilePath));
        if (!System.IO.File.Exists(path)) return NotFound();
        return PhysicalFile(path, record.ContentType ?? "application/octet-stream", record.FileName);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Upload([FromForm] FileUploadRequest request)
    {
        var file = request.File;
        var module = request.Module;
        var relatedId = request.RelatedId;
        if (string.Equals(module, "Project", StringComparison.OrdinalIgnoreCase) && !relatedId.HasValue)
            return BadRequest(new { message = "Project attachments require a project id." });
        if (string.Equals(module, "Project", StringComparison.OrdinalIgnoreCase) && relatedId.HasValue &&
            !await _permissions.CanEditModuleAsync(UserContext.GetUserId(User)!.Value, relatedId.Value, "Projects")) return Forbid();
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
