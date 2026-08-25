using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Costs;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Costs;

public interface ICostService
{
    Task<PurchaseCost> AddPurchaseAsync(CreatePurchaseCostRequest request, long? userId);
    Task<ActualCost> AddActualAsync(CreateActualCostRequest request, long? userId);
    Task<List<PurchaseCost>> GetPurchasesAsync(long userId, long projectId);
    Task<List<ActualCost>> GetActualsAsync(long userId, long projectId);
    Task<CostVarianceDto> GetVarianceAsync(long userId, long projectId);
}

public class CostService : ICostService
{
    private readonly ICostRepository _repository;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;

    public CostService(ICostRepository repository, IPermissionService permissions, IAuditService audit)
    {
        _repository = repository;
        _permissions = permissions;
        _audit = audit;
    }

    public async Task<PurchaseCost> AddPurchaseAsync(CreatePurchaseCostRequest request, long? userId)
    {
        if (userId.HasValue && !await _permissions.CanEditModuleAsync(userId.Value, request.ProjectId, "Costs"))
            throw new UnauthorizedAccessException("No permission.");
        var cost = await _repository.AddPurchaseAsync(new PurchaseCost
        {
            ProjectId = request.ProjectId,
            BoqItemId = request.BoqItemId,
            CostCenterId = request.CostCenterId,
            Vendor = request.Vendor,
            Description = request.Description,
            Amount = request.Amount,
            PurchaseDate = request.PurchaseDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "PurchaseCost", cost.Id);
        return cost;
    }

    public async Task<ActualCost> AddActualAsync(CreateActualCostRequest request, long? userId)
    {
        if (userId.HasValue && !await _permissions.CanEditModuleAsync(userId.Value, request.ProjectId, "Costs"))
            throw new UnauthorizedAccessException("No permission.");
        var cost = await _repository.AddActualAsync(new ActualCost
        {
            ProjectId = request.ProjectId,
            BoqItemId = request.BoqItemId,
            CostCenterId = request.CostCenterId,
            Description = request.Description,
            Amount = request.Amount,
            CostDate = request.CostDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "ActualCost", cost.Id);
        return cost;
    }

    public async Task<List<PurchaseCost>> GetPurchasesAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return new();
        return await _repository.GetPurchasesAsync(projectId);
    }

    public async Task<List<ActualCost>> GetActualsAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return new();
        return await _repository.GetActualsAsync(projectId);
    }

    public async Task<CostVarianceDto> GetVarianceAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId))
            throw new UnauthorizedAccessException("No permission.");

        var approved = await _repository.GetApprovedBudgetAsync(projectId);
        var allocated = await _repository.GetAllocatedBudgetAsync(projectId);
        var purchases = (await _repository.GetPurchasesAsync(projectId)).Sum(x => x.Amount);
        var actuals = (await _repository.GetActualsAsync(projectId)).Sum(x => x.Amount);
        var variance = approved - actuals;
        var percent = approved == 0 ? 0 : Math.Abs(variance) / approved * 100;
        var ccRollups = await _repository.GetCostCenterRollupsAsync(projectId);
        var worstRag = ccRollups.Count == 0 ? "Green" :
            ccRollups.Any(c => c.RagStatus == "Red") ? "Red" :
            ccRollups.Any(c => c.RagStatus == "Amber") ? "Amber" : "Green";

        return new CostVarianceDto
        {
            ProjectId = projectId,
            ApprovedBudget = approved,
            AllocatedBudget = allocated,
            PurchaseTotal = purchases,
            ActualTotal = actuals,
            ForecastTotal = actuals + purchases * 0.1m,
            VarianceAmount = variance,
            VariancePercent = Math.Round(percent, 2),
            RagStatus = worstRag,
            CostCenters = ccRollups
        };
    }
}
