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

    public Task<List<Budget>> GetByProjectAsync(long projectId) =>
        _db.Budgets.Include(b => b.Allocations).ThenInclude(a => a.CostCenter)
            .Include(b => b.Versions)
            .Where(b => b.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<Budget?> GetAsync(long id) =>
        _db.Budgets.Include(b => b.Allocations).Include(b => b.Versions)
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<Budget> AddAsync(Budget budget)
    {
        _db.Budgets.Add(budget);
        await _db.SaveChangesAsync();
        return budget;
    }

    public async Task UpdateAsync(Budget budget)
    {
        _db.Budgets.Update(budget);
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
        if (projectId.HasValue) q = q.Where(c => c.ProjectId == projectId);
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
