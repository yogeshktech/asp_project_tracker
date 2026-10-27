using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.BusinessLayer.Budgets;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Controllers;

[ApiController]
[Authorize]
[Route("api/budgets")]
public class BudgetsController : ControllerBase
{
    private readonly IBudgetService _budgetService;
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IPermissionService _permissions;
    public BudgetsController(IBudgetService budgetService, AppDbContext db, IWebHostEnvironment env, IPermissionService permissions)
    { _budgetService = budgetService; _db = db; _env = env; _permissions = permissions; }
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _budgetService.GetByProjectAsync(UserId, projectId));

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> Create([FromForm] CreateBudgetRequest request)
    {
        if (request.Attachments.Count == 0) return BadRequest(new { message = "Attach at least one budget file." });
        var files = await StoreAttachmentsAsync(request.Attachments, "budget");
        try
        {
            var budget = await _budgetService.CreateAsync(request, UserId);
            _db.BudgetRecordAttachments.AddRange(files.Select(file => new BudgetRecordAttachment
            {
                BudgetId = budget.Id, FilePath = file.Path, FileName = file.Name, UploadedBy = UserId, UploadedAt = DateTime.UtcNow
            }));
            await _db.SaveChangesAsync();
            return Ok(budget);
        }
        catch { DeleteStoredFiles(files.Select(file => file.Path)); throw; }
    }

    [HttpPut("{id:long}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> Update(long id, [FromForm] UpdateBudgetRequest request)
    {
        var current = await _db.Budgets.FindAsync(id);
        if (current == null) return NotFound();
        var files = request.Attachments.Count > 0 ? await StoreAttachmentsAsync(request.Attachments, "budget") : new List<(string Path, string Name)>();
        try
        {
            var budget = await _budgetService.UpdateAsync(id, request, UserId);
            _db.BudgetRecordAttachments.AddRange(files.Select(file => new BudgetRecordAttachment
            {
                BudgetId = budget.Id, FilePath = file.Path, FileName = file.Name, UploadedBy = UserId, UploadedAt = DateTime.UtcNow
            }));
            await _db.SaveChangesAsync();
            return Ok(budget);
        }
        catch { DeleteStoredFiles(files.Select(file => file.Path)); throw; }
    }

    [HttpGet("{id:long}/attachments/{attachmentId:long}/file")]
    public async Task<IActionResult> BudgetAttachment(long id, long attachmentId, [FromQuery] bool download = false)
    {
        var budget = await _db.Budgets.AsNoTracking().Include(b => b.Attachments).FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null || !budget.Attachments.Any(a => a.Id == attachmentId)) return NotFound();
        if (!(await _budgetService.GetByProjectAsync(UserId, budget.ProjectId)).Any(b => b.Id == id)) return NotFound();
        var attachment = budget.Attachments.First(a => a.Id == attachmentId);
        return ServeAttachment(attachment.FilePath, attachment.FileName, download);
    }

    [HttpDelete("{id:long}/attachments/{attachmentId:long}")]
    public async Task<IActionResult> DeleteBudgetAttachment(long id, long attachmentId)
    {
        var budget = await _db.Budgets.FindAsync(id);
        if (budget == null) return NotFound();
        await _permissions.EnsureModuleAsync(UserId, budget.ProjectId, "Budgets", "update");
        var attachment = await _db.BudgetRecordAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.BudgetId == id);
        if (attachment == null) return NotFound();
        var path = attachment.FilePath;
        _db.BudgetRecordAttachments.Remove(attachment);
        await _db.SaveChangesAsync();
        DeleteStoredFile(path);
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            var paths = await _db.BudgetRecordAttachments.Where(a => a.BudgetId == id).Select(a => a.FilePath).ToListAsync();
            var legacyPath = await _db.Budgets.Where(b => b.Id == id).Select(b => b.AttachmentPath).FirstOrDefaultAsync();
            await _budgetService.DeleteAsync(id, UserId);
            DeleteStoredFiles(paths.Append(legacyPath));
            return NoContent();
        }
        catch (InvalidOperationException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("{id:long}/revise")]
    public async Task<IActionResult> Revise(long id, [FromBody] BudgetVersionRequest request) =>
        Ok(await _budgetService.ReviseAsync(id, request.TotalAmount, request.Remarks, UserId));

    [HttpGet("cost-centers")]
    public async Task<IActionResult> CostCenters([FromQuery] long? projectId) =>
        Ok(await _budgetService.GetCostCentersAsync(UserId, projectId));

    [HttpPost("cost-centers")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> CreateCostCenter([FromForm] CreateCostCenterRequest request)
    {
        if (request.Attachments.Count == 0) return BadRequest(new { message = "Attach at least one cost center file." });
        var files = await StoreAttachmentsAsync(request.Attachments, "costcenter");
        try
        {
            var center = await _budgetService.CreateCostCenterAsync(request, UserId);
            _db.BudgetRecordAttachments.AddRange(files.Select(file => new BudgetRecordAttachment
            {
                CostCenterId = center.Id, FilePath = file.Path, FileName = file.Name, UploadedBy = UserId, UploadedAt = DateTime.UtcNow
            }));
            await _db.SaveChangesAsync();
            return Ok(center);
        }
        catch { DeleteStoredFiles(files.Select(file => file.Path)); throw; }
    }

    [HttpPut("cost-centers/{id:long}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> UpdateCostCenter(long id, [FromForm] UpdateCostCenterRequest request)
    {
        var current = await _db.CostCenters.FindAsync(id);
        if (current == null) return NotFound();
        var files = request.Attachments.Count > 0 ? await StoreAttachmentsAsync(request.Attachments, "costcenter") : new List<(string Path, string Name)>();
        try
        {
            var cc = await _budgetService.UpdateCostCenterAsync(id, request, UserId);
            if (cc == null) { DeleteStoredFiles(files.Select(file => file.Path)); return NotFound(); }
            _db.BudgetRecordAttachments.AddRange(files.Select(file => new BudgetRecordAttachment
            {
                CostCenterId = cc.Id, FilePath = file.Path, FileName = file.Name, UploadedBy = UserId, UploadedAt = DateTime.UtcNow
            }));
            await _db.SaveChangesAsync();
            return Ok(cc);
        }
        catch { DeleteStoredFiles(files.Select(file => file.Path)); throw; }
    }

    [HttpGet("cost-centers/{id:long}/attachments/{attachmentId:long}/file")]
    public async Task<IActionResult> CostCenterAttachment(long id, long attachmentId, [FromQuery] bool download = false)
    {
        var center = await _db.CostCenters.AsNoTracking().Include(c => c.Attachments).FirstOrDefaultAsync(c => c.Id == id);
        if (center == null) return NotFound();
        var visible = await _budgetService.GetCostCentersAsync(UserId, center.ProjectId);
        var attachment = center.Attachments.FirstOrDefault(a => a.Id == attachmentId);
        if (!visible.Any(c => c.Id == id) || attachment == null) return NotFound();
        return ServeAttachment(attachment.FilePath, attachment.FileName, download);
    }

    [HttpDelete("cost-centers/{id:long}/attachments/{attachmentId:long}")]
    public async Task<IActionResult> DeleteCostCenterAttachment(long id, long attachmentId)
    {
        var center = await _db.CostCenters.FindAsync(id);
        if (center == null) return NotFound();
        var visible = await _budgetService.GetCostCentersAsync(UserId, center.ProjectId);
        if (!visible.Any(c => c.Id == id)) return NotFound();
        if (center.ProjectId.HasValue) await _permissions.EnsureModuleAsync(UserId, center.ProjectId.Value, "Budgets", "update");
        var attachment = await _db.BudgetRecordAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.CostCenterId == id);
        if (attachment == null) return NotFound();
        var path = attachment.FilePath;
        _db.BudgetRecordAttachments.Remove(attachment);
        await _db.SaveChangesAsync();
        DeleteStoredFile(path);
        return NoContent();
    }

    private async Task<List<(string Path, string Name)>> StoreAttachmentsAsync(IReadOnlyCollection<IFormFile> files, string scope)
    {
        if (files.Count > 10) throw new InvalidOperationException("Upload up to 10 files at a time.");
        var allowed = new[] { ".xlsx", ".xls", ".pdf", ".csv", ".doc", ".docx", ".txt" };
        var prepared = files.Select(file => (File: file, Extension: Path.GetExtension(file.FileName).ToLowerInvariant())).ToList();
        if (prepared.Any(item => item.File.Length == 0)) throw new InvalidOperationException("Empty attachments cannot be uploaded.");
        if (prepared.Any(item => !allowed.Contains(item.Extension))) throw new InvalidOperationException("Allowed attachment formats: Excel, PDF, CSV, Word, and TXT.");
        if (prepared.Any(item => item.File.Length > 25_000_000)) throw new InvalidOperationException("Each attachment must be 25 MB or smaller.");
        var directory = Path.Combine(_env.ContentRootPath, "uploads");
        Directory.CreateDirectory(directory);
        var storedFiles = new List<(string Path, string Name)>();
        try
        {
            foreach (var item in prepared)
            {
                var stored = $"{scope}_{Guid.NewGuid():N}{item.Extension}";
                await using (var stream = System.IO.File.Create(Path.Combine(directory, stored))) await item.File.CopyToAsync(stream);
                storedFiles.Add(($"/uploads/{stored}", Path.GetFileName(item.File.FileName)));
            }
            return storedFiles;
        }
        catch { DeleteStoredFiles(storedFiles.Select(file => file.Path)); throw; }
    }

    private IActionResult ServeAttachment(string? path, string? name, bool download)
    {
        if (string.IsNullOrWhiteSpace(path)) return NotFound();
        var stored = Path.GetFileName(path);
        if (!stored.StartsWith("budget_", StringComparison.Ordinal) && !stored.StartsWith("costcenter_", StringComparison.Ordinal)) return NotFound();
        var fullPath = Path.Combine(_env.ContentRootPath, "uploads", stored);
        if (!System.IO.File.Exists(fullPath)) return NotFound();
        var contentType = new FileExtensionContentTypeProvider().TryGetContentType(stored, out var detected) ? detected : "application/octet-stream";
        return PhysicalFile(fullPath, contentType, download ? Path.GetFileName(name ?? stored) : null, enableRangeProcessing: true);
    }

    private void DeleteStoredFile(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;
        var stored = Path.GetFileName(path);
        if (stored.StartsWith("budget_", StringComparison.Ordinal) || stored.StartsWith("costcenter_", StringComparison.Ordinal))
        {
            var fullPath = Path.Combine(_env.ContentRootPath, "uploads", stored);
            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
        }
    }

    private void DeleteStoredFiles(IEnumerable<string?> paths)
    {
        foreach (var path in paths) DeleteStoredFile(path);
    }

    [HttpDelete("cost-centers/{id:long}")]
    public async Task<IActionResult> DeleteCostCenter(long id)
    {
        var paths = await _db.BudgetRecordAttachments.Where(a => a.CostCenterId == id).Select(a => a.FilePath).ToListAsync();
        var legacyPath = await _db.CostCenters.Where(c => c.Id == id).Select(c => c.AttachmentPath).FirstOrDefaultAsync();
        await _budgetService.DeleteCostCenterAsync(id, UserId);
        DeleteStoredFiles(paths.Append(legacyPath));
        return NoContent();
    }

    [HttpPost("allocations")]
    public async Task<IActionResult> Allocate([FromBody] CreateAllocationRequest request)
    {
        await _budgetService.AllocateAsync(request, UserId);
        return Ok();
    }

    [HttpGet("project-allocations/{projectId:long}")]
    public async Task<IActionResult> ProjectAllocationSummary(long projectId)
    {
        try { return Ok(await _budgetService.GetProjectAllocationSummaryAsync(UserId, projectId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("project-allocations/{fromProjectId:long}")]
    public async Task<IActionResult> AllocateToProject(long fromProjectId, [FromBody] CreateProjectBudgetAllocationRequest request)
    {
        try { await _budgetService.AllocateToProjectAsync(UserId, fromProjectId, request); return Ok(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
