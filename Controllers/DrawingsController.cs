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
        return Ok(rows.Select(ToDto));
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
        if (form.File == null || form.File.Length == 0) return BadRequest(new { message = "Choose a drawing file to upload." });
        if (!await _db.Projects.AnyAsync(x => x.Id == form.ProjectId)) return NotFound(new { message = "Project not found." });
        if (!TryGetContentType(form.File.FileName, out var contentType)) return BadRequest(new { message = "Allowed file types: JPG, JPEG, WEBP, PDF, DOC, DOCX, XLS, XLSX." });

        var storedKey = $"drawing_{form.ProjectId}_{Guid.NewGuid():N}{Path.GetExtension(form.File.FileName).ToLowerInvariant()}";
        await using (var stream = form.File.OpenReadStream())
            await _storage.SaveAsync(storedKey, stream, contentType);

        var drawing = new DrawingUpload
        {
            ProjectId = form.ProjectId,
            Name = form.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(form.Description) ? null : form.Description.Trim(),
            FileName = Path.GetFileName(form.File.FileName),
            FilePath = storedKey,
            ContentType = contentType,
            SizeBytes = form.File.Length,
            UploadedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };
        try
        {
            _db.DrawingUploads.Add(drawing);
            await _db.SaveChangesAsync();
            return Ok(ToDto(drawing));
        }
        catch
        {
            await _storage.DeleteAsync(storedKey);
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

        var oldKey = drawing.FilePath;
        string? newKey = null;
        var removeExistingFile = form.RemoveFile && form.File is not { Length: > 0 };
        if (form.File is { Length: > 0 })
        {
            if (!TryGetContentType(form.File.FileName, out var contentType)) return BadRequest(new { message = "Allowed file types: JPG, JPEG, WEBP, PDF, DOC, DOCX, XLS, XLSX." });
            newKey = $"drawing_{drawing.ProjectId}_{Guid.NewGuid():N}{Path.GetExtension(form.File.FileName).ToLowerInvariant()}";
            await using var stream = form.File.OpenReadStream();
            await _storage.SaveAsync(newKey, stream, contentType);
            drawing.FilePath = newKey;
            drawing.FileName = Path.GetFileName(form.File.FileName);
            drawing.ContentType = contentType;
            drawing.SizeBytes = form.File.Length;
            drawing.UploadedBy = UserId;
        }
        else if (removeExistingFile)
        {
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
            if (newKey != null) await _storage.DeleteAsync(newKey);
            throw;
        }
        if (newKey != null || removeExistingFile) await _storage.DeleteAsync(oldKey);
        return Ok(ToDto(drawing));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var drawing = await _db.DrawingUploads.FirstOrDefaultAsync(x => x.Id == id);
        if (drawing == null) return NotFound();
        if (!await _permissions.CanDeleteModuleAsync(UserId, drawing.ProjectId, "Drawings")) return Forbid();
        _db.DrawingUploads.Remove(drawing);
        await _db.SaveChangesAsync();
        await _storage.DeleteAsync(drawing.FilePath);
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

    private static bool TryGetContentType(string fileName, out string contentType) =>
        AllowedTypes.TryGetValue(Path.GetExtension(fileName), out contentType!);

    private static object ToDto(DrawingUpload drawing) => new
    {
        drawing.Id, drawing.ProjectId, drawing.Name, drawing.Description, drawing.FileName,
        drawing.ContentType, drawing.SizeBytes, drawing.UploadedBy, drawing.CreatedAt, drawing.UpdatedAt
    };
}

public sealed class DrawingUploadForm
{
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public IFormFile? File { get; set; }
    public bool RemoveFile { get; set; }
}
