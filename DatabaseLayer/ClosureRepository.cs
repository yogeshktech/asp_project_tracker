using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Closure;

public interface IClosureRepository
{
    Task<Inventory> AddInventoryAsync(Inventory inventory);
    Task<List<Inventory>> GetInventoryAsync(long projectId);
    Task<ProjectCompletionReport?> GetCompletionAsync(long projectId);
    Task<ProjectCompletionReport> UpsertCompletionAsync(ProjectCompletionReport report);
    Task SetProjectStatusAsync(long projectId, string status);
}

public class ClosureRepository : IClosureRepository
{
    private readonly AppDbContext _db;
    public ClosureRepository(AppDbContext db) => _db = db;

    public async Task<Inventory> AddInventoryAsync(Inventory inventory)
    {
        _db.Inventories.Add(inventory);
        await _db.SaveChangesAsync();
        return inventory;
    }

    public Task<List<Inventory>> GetInventoryAsync(long projectId) =>
        _db.Inventories.Include(i => i.Item).Where(i => i.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<ProjectCompletionReport?> GetCompletionAsync(long projectId) =>
        _db.ProjectCompletionReports.FirstOrDefaultAsync(r => r.ProjectId == projectId);

    public async Task<ProjectCompletionReport> UpsertCompletionAsync(ProjectCompletionReport report)
    {
        var existing = await GetCompletionAsync(report.ProjectId);
        if (existing == null)
        {
            _db.ProjectCompletionReports.Add(report);
            await _db.SaveChangesAsync();
            return report;
        }

        existing.HandoverNotes = report.HandoverNotes;
        existing.SignedDocumentPath = report.SignedDocumentPath;
        existing.IsMandatoryComplete = report.IsMandatoryComplete;
        existing.ClosedBy = report.ClosedBy;
        existing.ClosedAt = report.ClosedAt;
        await _db.SaveChangesAsync();
        return existing;
    }

    public async Task SetProjectStatusAsync(long projectId, string status)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null) return;
        project.Status = status;
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
