using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.DatabaseLayer.Costs;

public interface ICostRepository
{
    Task<PurchaseCost> AddPurchaseAsync(PurchaseCost cost);
    Task<ActualCost> AddActualAsync(ActualCost cost);
    Task<List<PurchaseCost>> GetPurchasesAsync(long projectId);
    Task<List<ActualCost>> GetActualsAsync(long projectId);
    Task<decimal> GetApprovedBudgetAsync(long projectId);
    Task<decimal> GetAllocatedBudgetAsync(long projectId);
    Task<(decimal Amber, decimal Red)> GetRagAsync(long projectId);
    Task<List<CostCenterRollupDto>> GetCostCenterRollupsAsync(long projectId);
}

public class CostRepository : ICostRepository
{
    private readonly AppDbContext _db;
    public CostRepository(AppDbContext db) => _db = db;

    public async Task<PurchaseCost> AddPurchaseAsync(PurchaseCost cost)
    {
        _db.PurchaseCosts.Add(cost);
        await _db.SaveChangesAsync();
        return cost;
    }

    public async Task<ActualCost> AddActualAsync(ActualCost cost)
    {
        _db.ActualCosts.Add(cost);
        await _db.SaveChangesAsync();
        return cost;
    }

    public Task<List<PurchaseCost>> GetPurchasesAsync(long projectId) =>
        _db.PurchaseCosts.Where(c => c.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<List<ActualCost>> GetActualsAsync(long projectId) =>
        _db.ActualCosts.Where(c => c.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<decimal> GetApprovedBudgetAsync(long projectId) =>
        _db.Budgets.Where(b => b.ProjectId == projectId).SumAsync(b => b.ApprovedAmount);

    public Task<decimal> GetAllocatedBudgetAsync(long projectId) =>
        _db.BudgetAllocations.Where(a => a.Budget.ProjectId == projectId).SumAsync(a => a.AllocatedAmount);

    public async Task<(decimal Amber, decimal Red)> GetRagAsync(long projectId)
    {
        var budget = await _db.Budgets.Where(b => b.ProjectId == projectId).OrderByDescending(b => b.Id).FirstOrDefaultAsync();
        return budget == null ? (80, 100) : (budget.RagAmberPercent, budget.RagRedPercent);
    }

    public async Task<List<CostCenterRollupDto>> GetCostCenterRollupsAsync(long projectId)
    {
        var (amber, red) = await GetRagAsync(projectId);
        var centers = await _db.CostCenters.Where(c => c.ProjectId == projectId).AsNoTracking().ToListAsync();
        var result = new List<CostCenterRollupDto>();

        foreach (var cc in centers)
        {
            var allocated = await _db.BudgetAllocations.Where(a => a.CostCenterId == cc.Id).SumAsync(a => a.AllocatedAmount);
            var spent = await _db.PurchaseCosts.Where(c => c.CostCenterId == cc.Id).SumAsync(c => c.Amount);
            spent += await _db.ActualCosts.Where(c => c.CostCenterId == cc.Id).SumAsync(c => c.Amount);
            var pct = allocated == 0 ? 0 : spent / allocated * 100;
            result.Add(new CostCenterRollupDto
            {
                CostCenterId = cc.Id,
                Name = cc.Name,
                Allocated = allocated,
                Spent = spent,
                Variance = allocated - spent,
                RagStatus = pct >= red ? "Red" : pct >= amber ? "Amber" : "Green"
            });
        }
        return result;
    }
}
