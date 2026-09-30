using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Costs;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Costs;

public interface ICostService
{
    Task<PurchaseCost> AddPurchaseAsync(CreatePurchaseCostRequest request, long? userId);
    Task<PurchaseCost> UpdatePurchaseAsync(long id, CreatePurchaseCostRequest request, long userId);
    Task DeletePurchaseAsync(long id, long userId);
    Task<ActualCost> AddActualAsync(CreateActualCostRequest request, long? userId);
    Task<ActualCost> UpdateActualAsync(long id, CreateActualCostRequest request, long userId);
    Task DeleteActualAsync(long id, long userId);
    Task<CostImportResultDto> ImportAsync(CostImportBatchRequest request, long userId);
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
        await ValidateCostDimensionsAsync(request.ProjectId, request.BoqItemId, request.CostCenterId);
        if (request.Amount <= 0) throw new InvalidOperationException("Amount must be greater than zero.");
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
        await ValidateCostDimensionsAsync(request.ProjectId, request.BoqItemId, request.CostCenterId);
        if (request.Amount <= 0) throw new InvalidOperationException("Amount must be greater than zero.");
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

    public async Task<PurchaseCost> UpdatePurchaseAsync(long id, CreatePurchaseCostRequest request, long userId)
    {
        var cost = await _repository.GetPurchaseAsync(id) ?? throw new InvalidOperationException("Purchase not found.");
        await _permissions.EnsureModuleAsync(userId, cost.ProjectId, "Costs", "update");
        if (request.ProjectId != cost.ProjectId) throw new InvalidOperationException("Cost project cannot be changed.");
        if (request.Amount <= 0) throw new InvalidOperationException("Amount must be greater than zero.");
        await ValidateCostDimensionsAsync(cost.ProjectId, request.BoqItemId, request.CostCenterId);
        cost.BoqItemId = request.BoqItemId; cost.CostCenterId = request.CostCenterId;
        cost.Vendor = request.Vendor; cost.Description = request.Description; cost.Amount = request.Amount;
        cost.PurchaseDate = request.PurchaseDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        await _repository.UpdatePurchaseAsync(cost);
        await _audit.LogAsync(userId, "Update", "PurchaseCost", id);
        return cost;
    }

    public async Task DeletePurchaseAsync(long id, long userId)
    {
        var cost = await _repository.GetPurchaseAsync(id) ?? throw new InvalidOperationException("Purchase not found.");
        await _permissions.EnsureModuleAsync(userId, cost.ProjectId, "Costs", "delete");
        await _repository.DeletePurchaseAsync(id);
        await _audit.LogAsync(userId, "Delete", "PurchaseCost", id);
    }

    public async Task<ActualCost> UpdateActualAsync(long id, CreateActualCostRequest request, long userId)
    {
        var cost = await _repository.GetActualAsync(id) ?? throw new InvalidOperationException("Actual cost not found.");
        await _permissions.EnsureModuleAsync(userId, cost.ProjectId, "Costs", "update");
        if (request.ProjectId != cost.ProjectId) throw new InvalidOperationException("Cost project cannot be changed.");
        if (request.Amount <= 0) throw new InvalidOperationException("Amount must be greater than zero.");
        await ValidateCostDimensionsAsync(cost.ProjectId, request.BoqItemId, request.CostCenterId);
        cost.BoqItemId = request.BoqItemId; cost.CostCenterId = request.CostCenterId;
        cost.Description = request.Description; cost.Amount = request.Amount;
        cost.CostDate = request.CostDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        await _repository.UpdateActualAsync(cost);
        await _audit.LogAsync(userId, "Update", "ActualCost", id);
        return cost;
    }

    public async Task DeleteActualAsync(long id, long userId)
    {
        var cost = await _repository.GetActualAsync(id) ?? throw new InvalidOperationException("Actual cost not found.");
        await _permissions.EnsureModuleAsync(userId, cost.ProjectId, "Costs", "delete");
        await _repository.DeleteActualAsync(id);
        await _audit.LogAsync(userId, "Delete", "ActualCost", id);
    }

    public async Task<CostImportResultDto> ImportAsync(CostImportBatchRequest request, long userId)
    {
        if (!string.Equals(request.Type, "Purchase", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(request.Type, "Actual", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Type must be Purchase or Actual.");
        if (request.Rows.Count == 0) throw new InvalidOperationException("Import file contains no cost rows.");
        var result = new CostImportResultDto();
        for (var index = 0; index < request.Rows.Count; index++)
        {
            var row = request.Rows[index];
            try
            {
                if (string.Equals(request.Type, "Purchase", StringComparison.OrdinalIgnoreCase))
                    await AddPurchaseAsync(new CreatePurchaseCostRequest
                    {
                        ProjectId = request.ProjectId, BoqItemId = row.BoqItemId, CostCenterId = row.CostCenterId,
                        Amount = row.Amount, PurchaseDate = row.CostDate, Vendor = row.Vendor, Description = row.Description
                    }, userId);
                else
                    await AddActualAsync(new CreateActualCostRequest
                    {
                        ProjectId = request.ProjectId, BoqItemId = row.BoqItemId, CostCenterId = row.CostCenterId,
                        Amount = row.Amount, CostDate = row.CostDate, Description = row.Description
                    }, userId);
                result.Imported++;
            }
            catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException)
            {
                result.Skipped++;
                result.Errors.Add($"Row {index + 2}: {ex.Message}");
            }
        }
        return result;
    }

    private async Task ValidateCostDimensionsAsync(long projectId, long? boqItemId, long? costCenterId)
    {
        if (projectId <= 0) throw new InvalidOperationException("Project is required.");
        if (boqItemId.HasValue && !await _repository.BoqItemBelongsToProjectAsync(projectId, boqItemId.Value))
            throw new InvalidOperationException("BOQ line does not belong to this project.");
        if (costCenterId.HasValue && !await _repository.CostCenterBelongsToProjectAsync(projectId, costCenterId.Value))
            throw new InvalidOperationException("Cost Center does not belong to this project.");
    }

    public async Task<List<PurchaseCost>> GetPurchasesAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Costs")) return new();
        return await _repository.GetPurchasesAsync(projectId);
    }

    public async Task<List<ActualCost>> GetActualsAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Costs")) return new();
        return await _repository.GetActualsAsync(projectId);
    }

    public async Task<CostVarianceDto> GetVarianceAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Costs")
            && !await _permissions.CanViewModuleAsync(userId, projectId, "Budgets"))
            throw new UnauthorizedAccessException("No permission.");

        var approved = await _repository.GetApprovedBudgetAsync(projectId);
        var allocated = await _repository.GetAllocatedBudgetAsync(projectId);
        var (purchases, actuals) = await _repository.GetProjectCostTotalsAsync(projectId);
        var forecast = purchases + actuals;
        var actualVariance = approved - actuals;
        var forecastVariance = approved - forecast;
        var percent = approved == 0 ? 0 : Math.Abs(actualVariance) / approved * 100;
        var ccRollups = await _repository.GetCostCenterRollupsAsync(projectId);
        var worstRag = ccRollups.Count == 0 ? "Green" :
            ccRollups.Any(c => c.RagStatus == "Red") ? "Red" :
            ccRollups.Any(c => c.RagStatus == "Amber") ? "Amber" : "Green";

        return new CostVarianceDto
        {
            ProjectId = projectId,
            Currency = await _repository.GetProjectCurrencyAsync(projectId),
            Budget = approved,
            CurrentCommitment = purchases,
            ActualSpend = actuals,
            ApprovedBudget = approved,
            AllocatedBudget = allocated,
            PurchaseTotal = purchases,
            ActualTotal = actuals,
            ForecastTotal = forecast,
            VarianceAmount = actualVariance,
            VariancePercent = Math.Round(percent, 2),
            ForecastVarianceAmount = forecastVariance,
            BudgetStatus = actuals > approved ? "Over Budget" : actuals < approved ? "Under Budget" : "On Budget",
            RagStatus = worstRag,
            CostCenters = ccRollups
        };
    }
}
