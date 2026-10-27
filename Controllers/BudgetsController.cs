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
    public BudgetsController(IBudgetService budgetService, AppDbContext db, IWebHostEnvironment env)
    { _budgetService = budgetService; _db = db; _env = env; }
    private long UserId => UserContext.GetUserId(User)!.Value;

    [HttpGet("project/{projectId:long}")]
    public async Task<IActionResult> GetByProject(long projectId) =>
        Ok(await _budgetService.GetByProjectAsync(UserId, projectId));

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Create([FromForm] CreateBudgetRequest request)
    {
        if (request.Attachment == null || request.Attachment.Length == 0) return BadRequest(new { message = "A budget attachment is required." });
        var file = await StoreAttachmentAsync(request.Attachment, "budget");
        try
        {
            var budget = await _budgetService.CreateAsync(request, UserId);
            budget.AttachmentPath = file.Path; budget.AttachmentName = file.Name;
            await _db.SaveChangesAsync();
            return Ok(budget);
        }
        catch { DeleteStoredFile(file.Path); throw; }
    }

    [HttpPut("{id:long}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Update(long id, [FromForm] UpdateBudgetRequest request)
    {
        var current = await _db.Budgets.FindAsync(id);
        if (current == null) return NotFound();
        if (request.Attachment == null || request.Attachment.Length == 0)
            return BadRequest(new { message = "A budget attachment is required when editing. Choose the file to keep or replace before saving." });
        var oldPath = current.AttachmentPath;
        var file = await StoreAttachmentAsync(request.Attachment, "budget");
        try
        {
            var budget = await _budgetService.UpdateAsync(id, request, UserId);
            budget.AttachmentPath = file.Path; budget.AttachmentName = file.Name;
            await _db.SaveChangesAsync();
            DeleteStoredFile(oldPath);
            return Ok(budget);
        }
        catch { DeleteStoredFile(file.Path); throw; }
    }

    [HttpGet("{id:long}/attachment")]
    public async Task<IActionResult> BudgetAttachment(long id, [FromQuery] bool download = false)
    {
        var budget = (await _budgetService.GetByProjectAsync(UserId,
            await _db.Budgets.Where(b => b.Id == id).Select(b => b.ProjectId).FirstOrDefaultAsync())).FirstOrDefault(b => b.Id == id);
        if (budget == null) return NotFound();
        return ServeAttachment(budget.AttachmentPath, budget.AttachmentName, download);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            var attachmentPath = await _db.Budgets.Where(b => b.Id == id).Select(b => b.AttachmentPath).FirstOrDefaultAsync();
            await _budgetService.DeleteAsync(id, UserId);
            DeleteStoredFile(attachmentPath);
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
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> CreateCostCenter([FromForm] CreateCostCenterRequest request)
    {
        if (request.Attachment == null || request.Attachment.Length == 0) return BadRequest(new { message = "A cost center attachment is required." });
        var file = await StoreAttachmentAsync(request.Attachment, "costcenter");
        try
        {
            var center = await _budgetService.CreateCostCenterAsync(request, UserId);
            center.AttachmentPath = file.Path; center.AttachmentName = file.Name;
            await _db.SaveChangesAsync();
            return Ok(center);
        }
        catch { DeleteStoredFile(file.Path); throw; }
    }

    [HttpPut("cost-centers/{id:long}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> UpdateCostCenter(long id, [FromForm] UpdateCostCenterRequest request)
    {
        var current = await _db.CostCenters.FindAsync(id);
        if (current == null) return NotFound();
        if (request.Attachment == null || request.Attachment.Length == 0)
            return BadRequest(new { message = "A cost center attachment is required when editing. Choose the file to keep or replace before saving." });
        var oldPath = current.AttachmentPath;
        var file = await StoreAttachmentAsync(request.Attachment, "costcenter");
        try
        {
            var cc = await _budgetService.UpdateCostCenterAsync(id, request, UserId);
            if (cc == null) { DeleteStoredFile(file.Path); return NotFound(); }
            cc.AttachmentPath = file.Path; cc.AttachmentName = file.Name;
            await _db.SaveChangesAsync();
            DeleteStoredFile(oldPath);
            return Ok(cc);
        }
        catch { DeleteStoredFile(file.Path); throw; }
    }

    [HttpGet("cost-centers/{id:long}/attachment")]
    public async Task<IActionResult> CostCenterAttachment(long id, [FromQuery] bool download = false)
    {
        var center = await _db.CostCenters.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (center == null) return NotFound();
        var visible = await _budgetService.GetCostCentersAsync(UserId, center.ProjectId);
        if (!visible.Any(c => c.Id == id)) return NotFound();
        return ServeAttachment(center.AttachmentPath, center.AttachmentName, download);
    }

    private async Task<(string Path, string Name)> StoreAttachmentAsync(IFormFile file, string scope)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".xlsx", ".xls", ".pdf", ".csv", ".doc", ".docx", ".txt" };
        if (!allowed.Contains(extension)) throw new InvalidOperationException("Allowed attachment formats: Excel, PDF, CSV, Word, and TXT.");
        if (file.Length > 25_000_000) throw new InvalidOperationException("Attachment must be 25 MB or smaller.");
        var stored = $"{scope}_{Guid.NewGuid():N}{extension}";
        var directory = Path.Combine(_env.ContentRootPath, "uploads");
        Directory.CreateDirectory(directory);
        await using (var stream = System.IO.File.Create(Path.Combine(directory, stored))) await file.CopyToAsync(stream);
        return ($"/uploads/{stored}", Path.GetFileName(file.FileName));
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

    [HttpDelete("cost-centers/{id:long}")]
    public async Task<IActionResult> DeleteCostCenter(long id)
    {
        var attachmentPath = await _db.CostCenters.Where(c => c.Id == id).Select(c => c.AttachmentPath).FirstOrDefaultAsync();
        await _budgetService.DeleteCostCenterAsync(id, UserId);
        DeleteStoredFile(attachmentPath);
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
