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
        if (string.IsNullOrWhiteSpace(module) || !relatedId.HasValue)
            return BadRequest(new { message = "Specify an attachment scope." });
        if (string.Equals(module, "Project", StringComparison.OrdinalIgnoreCase) &&
            !await _permissions.CanViewProjectAsync(UserContext.GetUserId(User)!.Value, relatedId.Value)) return Forbid();
        if (string.Equals(module, "Tasks", StringComparison.OrdinalIgnoreCase) &&
            !await CanViewTaskFilesAsync(UserContext.GetUserId(User)!.Value, relatedId.Value)) return Forbid();
        if (string.Equals(module, "Milestones", StringComparison.OrdinalIgnoreCase) &&
            !await CanViewMilestoneFilesAsync(UserContext.GetUserId(User)!.Value, relatedId.Value)) return Forbid();
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
        if (string.Equals(record.Module, "Tasks", StringComparison.OrdinalIgnoreCase) && record.RelatedId.HasValue &&
            !await CanViewTaskFilesAsync(UserContext.GetUserId(User)!.Value, record.RelatedId.Value)) return Forbid();
        if (string.Equals(record.Module, "Milestones", StringComparison.OrdinalIgnoreCase) && record.RelatedId.HasValue &&
            !await CanViewMilestoneFilesAsync(UserContext.GetUserId(User)!.Value, record.RelatedId.Value)) return Forbid();
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
        if (string.Equals(module, "Tasks", StringComparison.OrdinalIgnoreCase))
        {
            if (!relatedId.HasValue) return BadRequest(new { message = "Task evidence requires a task id." });
            var userId = UserContext.GetUserId(User)!.Value;
            var task = await _db.Tasks.AsNoTracking().Where(t => t.Id == relatedId.Value)
                .Select(t => new { t.ProjectId, t.AssignedTo }).FirstOrDefaultAsync();
            if (task == null) return NotFound(new { message = "Task not found." });
            if (!await _permissions.CanViewModuleAsync(userId, task.ProjectId, "Tasks")) return Forbid();
            if (!await _permissions.CanEditModuleAsync(userId, task.ProjectId, "Tasks")
                && !await _permissions.CanUpdateModuleAsync(userId, task.ProjectId, "Tasks")
                && task.AssignedTo != userId
                && !await _db.SubTasks.AnyAsync(s => s.TaskId == relatedId.Value && s.AssignedTo == userId)) return Forbid();
        }
        if (string.Equals(module, "Milestones", StringComparison.OrdinalIgnoreCase))
        {
            if (!relatedId.HasValue) return BadRequest(new { message = "Milestone evidence requires a milestone id." });
            var userId = UserContext.GetUserId(User)!.Value;
            var milestone = await _db.Milestones.AsNoTracking().Where(m => m.Id == relatedId.Value)
                .Select(m => new { m.ProjectId, m.OwnerId }).FirstOrDefaultAsync();
            if (milestone == null) return NotFound(new { message = "Milestone not found." });
            if (!await _permissions.CanViewModuleAsync(userId, milestone.ProjectId, "Tasks")) return Forbid();
            if (!await _permissions.CanEditModuleAsync(userId, milestone.ProjectId, "Tasks")
                && !await _permissions.CanUpdateModuleAsync(userId, milestone.ProjectId, "Tasks")
                && milestone.OwnerId != userId) return Forbid();
        }
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

    private async Task<bool> CanViewTaskFilesAsync(long userId, long taskId)
    {
        var projectId = await _db.Tasks.AsNoTracking().Where(t => t.Id == taskId)
            .Select(t => (long?)t.ProjectId).FirstOrDefaultAsync();
        return projectId.HasValue && await _permissions.CanViewModuleAsync(userId, projectId.Value, "Tasks");
    }

    private async Task<bool> CanViewMilestoneFilesAsync(long userId, long milestoneId)
    {
        var projectId = await _db.Milestones.AsNoTracking().Where(m => m.Id == milestoneId)
            .Select(m => (long?)m.ProjectId).FirstOrDefaultAsync();
        return projectId.HasValue && await _permissions.CanViewModuleAsync(userId, projectId.Value, "Tasks");
    }
}

public class FileUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public string? Module { get; set; }
    public long? RelatedId { get; set; }
}
