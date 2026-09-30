using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.DatabaseLayer.Costs;

public interface ICostRepository
{
    Task<PurchaseCost> AddPurchaseAsync(PurchaseCost cost);
    Task<PurchaseCost?> GetPurchaseAsync(long id);
    Task UpdatePurchaseAsync(PurchaseCost cost);
    Task DeletePurchaseAsync(long id);
    Task<ActualCost> AddActualAsync(ActualCost cost);
    Task<ActualCost?> GetActualAsync(long id);
    Task UpdateActualAsync(ActualCost cost);
    Task DeleteActualAsync(long id);
    Task<bool> CostCenterBelongsToProjectAsync(long projectId, long costCenterId);
    Task<bool> BoqItemBelongsToProjectAsync(long projectId, long boqItemId);
    Task<List<PurchaseCost>> GetPurchasesAsync(long projectId);
    Task<List<ActualCost>> GetActualsAsync(long projectId);
    Task<decimal> GetApprovedBudgetAsync(long projectId);
    Task<decimal> GetAllocatedBudgetAsync(long projectId);
    Task<(decimal Purchase, decimal Actual)> GetProjectCostTotalsAsync(long projectId);
    Task<string> GetProjectCurrencyAsync(long projectId);
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

    public Task<PurchaseCost?> GetPurchaseAsync(long id) => _db.PurchaseCosts.FirstOrDefaultAsync(c => c.Id == id);
    public async Task UpdatePurchaseAsync(PurchaseCost cost) { _db.PurchaseCosts.Update(cost); await _db.SaveChangesAsync(); }
    public async Task DeletePurchaseAsync(long id)
    {
        var cost = await _db.PurchaseCosts.FindAsync(id) ?? throw new InvalidOperationException("Purchase not found.");
        _db.PurchaseCosts.Remove(cost);
        await _db.SaveChangesAsync();
    }

    public Task<ActualCost?> GetActualAsync(long id) => _db.ActualCosts.FirstOrDefaultAsync(c => c.Id == id);
    public async Task UpdateActualAsync(ActualCost cost) { _db.ActualCosts.Update(cost); await _db.SaveChangesAsync(); }
    public async Task DeleteActualAsync(long id)
    {
        var cost = await _db.ActualCosts.FindAsync(id) ?? throw new InvalidOperationException("Actual cost not found.");
        _db.ActualCosts.Remove(cost);
        await _db.SaveChangesAsync();
    }

    public Task<List<PurchaseCost>> GetPurchasesAsync(long projectId) =>
        _db.PurchaseCosts.Where(c => c.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<List<ActualCost>> GetActualsAsync(long projectId) =>
        _db.ActualCosts.Where(c => c.ProjectId == projectId).AsNoTracking().ToListAsync();

    public Task<decimal> GetApprovedBudgetAsync(long projectId) =>
        _db.Budgets.Where(b => b.ProjectId == projectId ||
            _db.Projects.Any(p => p.Id == b.ProjectId && p.ParentProjectId == projectId)).SumAsync(b => b.ApprovedAmount);

    public Task<decimal> GetAllocatedBudgetAsync(long projectId) =>
        _db.BudgetAllocations.Where(a => a.Budget.ProjectId == projectId).SumAsync(a => a.AllocatedAmount);

    public async Task<(decimal Purchase, decimal Actual)> GetProjectCostTotalsAsync(long projectId)
    {
        var projectIds = _db.Projects.Where(p => p.Id == projectId || p.ParentProjectId == projectId).Select(p => p.Id);
        var purchase = await _db.PurchaseCosts.Where(c => projectIds.Contains(c.ProjectId)).SumAsync(c => c.Amount);
        var actual = await _db.ActualCosts.Where(c => projectIds.Contains(c.ProjectId)).SumAsync(c => c.Amount);
        return (purchase, actual);
    }

    public Task<bool> CostCenterBelongsToProjectAsync(long projectId, long costCenterId) =>
        _db.CostCenters.AnyAsync(c => c.Id == costCenterId &&
            (c.ProjectId == projectId || (c.ProjectId.HasValue && _db.Projects.Any(p => p.Id == c.ProjectId && p.ParentProjectId == projectId))));

    public Task<bool> BoqItemBelongsToProjectAsync(long projectId, long boqItemId) =>
        _db.BoqItems.AnyAsync(i => i.Id == boqItemId && i.BoqVersion.Boq.ProjectId == projectId);

    public async Task<string> GetProjectCurrencyAsync(long projectId) =>
        await _db.Projects.Where(p => p.Id == projectId).Select(p => p.Currency).FirstOrDefaultAsync() ?? "INR";

    public async Task<(decimal Amber, decimal Red)> GetRagAsync(long projectId)
    {
        var budget = await _db.Budgets.Where(b => b.ProjectId == projectId).OrderByDescending(b => b.Id).FirstOrDefaultAsync();
        return budget == null ? (80, 100) : (budget.RagAmberPercent, budget.RagRedPercent);
    }

    public async Task<List<CostCenterRollupDto>> GetCostCenterRollupsAsync(long projectId)
    {
        var (amber, red) = await GetRagAsync(projectId);
        var centers = await _db.CostCenters.Where(c => c.ProjectId == projectId ||
            (c.ProjectId.HasValue && _db.Projects.Any(p => p.Id == c.ProjectId && p.ParentProjectId == projectId)))
            .AsNoTracking().ToListAsync();
        var result = new List<CostCenterRollupDto>();

        foreach (var cc in centers)
        {
            var allocated = await _db.BudgetAllocations.Where(a => a.CostCenterId == cc.Id && a.Budget.ProjectId == projectId).SumAsync(a => a.AllocatedAmount);
            var purchase = await _db.PurchaseCosts.Where(c => c.CostCenterId == cc.Id &&
                (c.ProjectId == projectId || _db.Projects.Any(p => p.Id == c.ProjectId && p.ParentProjectId == projectId))).SumAsync(c => c.Amount);
            var actual = await _db.ActualCosts.Where(c => c.CostCenterId == cc.Id &&
                (c.ProjectId == projectId || _db.Projects.Any(p => p.Id == c.ProjectId && p.ParentProjectId == projectId))).SumAsync(c => c.Amount);
            var forecast = purchase + actual;
            var actualVariance = allocated - actual;
            var forecastVariance = allocated - forecast;
            var pct = allocated == 0 ? 0 : forecast / allocated * 100;
            result.Add(new CostCenterRollupDto
            {
                CostCenterId = cc.Id,
                Name = cc.Name,
                Budget = allocated,
                CurrentCommitment = purchase,
                PurchaseCost = purchase,
                ActualSpend = actual,
                Forecast = forecast,
                Allocated = allocated,
                Spent = forecast,
                Variance = actualVariance,
                ForecastVariance = forecastVariance,
                BudgetStatus = actual > allocated ? "Over Budget" : actual < allocated ? "Under Budget" : "On Budget",
                RagStatus = pct >= red ? "Red" : pct >= amber ? "Amber" : "Green"
            });
        }
        return result;
    }
}
