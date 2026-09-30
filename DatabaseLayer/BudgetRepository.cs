using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Budgets;

public interface IBudgetRepository
{
    Task<List<Budget>> GetByProjectAsync(long projectId);
    Task<Budget?> GetAsync(long id);
    Task<Budget> AddAsync(Budget budget);
    Task UpdateAsync(Budget budget);
    Task DeleteAsync(long id);
    Task<CostCenter?> GetCostCenterAsync(long id);
    Task<CostCenter> AddCostCenterAsync(CostCenter costCenter);
    Task UpdateCostCenterAsync(CostCenter costCenter);
    Task DeleteCostCenterAsync(long id);
    Task<List<CostCenter>> GetCostCentersAsync(long? projectId);
    Task AddAllocationAsync(BudgetAllocation allocation);
    Task<BudgetVersion> AddVersionAsync(BudgetVersion version);
}

public class BudgetRepository : IBudgetRepository
{
    private readonly AppDbContext _db;
    public BudgetRepository(AppDbContext db) => _db = db;

    public async Task<List<Budget>> GetByProjectAsync(long projectId)
    {
        var budgets = await _db.Budgets.Include(b => b.Allocations).ThenInclude(a => a.CostCenter)
            .Include(b => b.Versions).ThenInclude(v => v.Approver)
            .Where(b => b.ProjectId == projectId).AsNoTracking().ToListAsync();
        foreach (var version in budgets.SelectMany(b => b.Versions))
            version.ApproverName = version.Approver?.FullName;
        return budgets;
    }

    public Task<Budget?> GetAsync(long id) =>
        _db.Budgets.Include(b => b.Allocations).Include(b => b.Versions).ThenInclude(v => v.Approver)
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<Budget> AddAsync(Budget budget)
    {
        _db.Budgets.Add(budget);
        await _db.SaveChangesAsync();
        return budget;
    }

    public async Task UpdateAsync(Budget budget)
    {
        _db.Entry(budget).State = EntityState.Modified;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var budget = await _db.Budgets.FindAsync(id) ?? throw new InvalidOperationException("Budget not found.");
        _db.Budgets.Remove(budget);
        await _db.SaveChangesAsync();
    }

    public Task<CostCenter?> GetCostCenterAsync(long id) => _db.CostCenters.FirstOrDefaultAsync(c => c.Id == id);

    public async Task<CostCenter> AddCostCenterAsync(CostCenter costCenter)
    {
        _db.CostCenters.Add(costCenter);
        await _db.SaveChangesAsync();
        return costCenter;
    }

    public async Task UpdateCostCenterAsync(CostCenter costCenter)
    {
        _db.CostCenters.Update(costCenter);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteCostCenterAsync(long id)
    {
        var cc = await _db.CostCenters.FindAsync(id) ?? throw new InvalidOperationException("Cost center not found");
        _db.CostCenters.Remove(cc);
        await _db.SaveChangesAsync();
    }

    public Task<List<CostCenter>> GetCostCentersAsync(long? projectId)
    {
        var q = _db.CostCenters.AsNoTracking().AsQueryable();
        if (projectId.HasValue) q = q.Where(c => c.ProjectId == projectId ||
            (c.ProjectId.HasValue && _db.Projects.Any(p => p.Id == c.ProjectId && p.ParentProjectId == projectId)));
        return q.ToListAsync();
    }

    public async Task AddAllocationAsync(BudgetAllocation allocation)
    {
        _db.BudgetAllocations.Add(allocation);
        await _db.SaveChangesAsync();
    }

    public async Task<BudgetVersion> AddVersionAsync(BudgetVersion version)
    {
        _db.BudgetVersions.Add(version);
        await _db.SaveChangesAsync();
        return version;
    }
}
