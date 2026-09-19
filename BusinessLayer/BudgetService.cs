using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Costs;
using project_tracker_madhu.DatabaseLayer.Budgets;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Budgets;

public interface IBudgetService
{
    Task<List<Budget>> GetByProjectAsync(long userId, long projectId);
    Task<Budget> CreateAsync(CreateBudgetRequest request, long? userId);
    Task<BudgetVersion> ReviseAsync(long budgetId, decimal totalAmount, string? remarks, long? userId, long? approverId);
    Task<CostCenter> CreateCostCenterAsync(CreateCostCenterRequest request, long? userId);
    Task<List<CostCenter>> GetCostCentersAsync(long? projectId);
    Task<CostCenter?> UpdateCostCenterAsync(long id, UpdateCostCenterRequest request, long? userId);
    Task DeleteCostCenterAsync(long id, long? userId);
    Task AllocateAsync(CreateAllocationRequest request, long? userId);
}

public class BudgetService : IBudgetService
{
    private readonly IBudgetRepository _repository;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;

    public BudgetService(IBudgetRepository repository, IPermissionService permissions, IAuditService audit)
    {
        _repository = repository;
        _permissions = permissions;
        _audit = audit;
    }

    public async Task<List<Budget>> GetByProjectAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Budgets")) return new();
        return await _repository.GetByProjectAsync(projectId);
    }

    public async Task<Budget> CreateAsync(CreateBudgetRequest request, long? userId)
    {
        if (userId.HasValue && !await _permissions.CanEditModuleAsync(userId.Value, request.ProjectId, "Budgets"))
            throw new UnauthorizedAccessException("No permission.");

        var budget = await _repository.AddAsync(new Budget
        {
            ProjectId = request.ProjectId,
            Name = request.Name,
            ApprovedAmount = request.ApprovedAmount,
            Currency = request.Currency,
            RagAmberPercent = request.RagAmberPercent,
            RagRedPercent = request.RagRedPercent,
            Status = "Approved",
            CreatedAt = DateTime.UtcNow
        });
        await _repository.AddVersionAsync(new BudgetVersion
        {
            BudgetId = budget.Id,
            VersionNo = 1,
            TotalAmount = request.ApprovedAmount,
            Remarks = "Initial baseline",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Budget", budget.Id);
        return budget;
    }

    public async Task<BudgetVersion> ReviseAsync(long budgetId, decimal totalAmount, string? remarks, long? userId, long? approverId)
    {
        var budget = await _repository.GetAsync(budgetId) ?? throw new InvalidOperationException("Budget not found");
        if (userId.HasValue && !await _permissions.CanEditModuleAsync(userId.Value, budget.ProjectId, "Budgets"))
            throw new UnauthorizedAccessException("No permission.");

        var next = (budget.Versions.Count == 0 ? 0 : budget.Versions.Max(v => v.VersionNo)) + 1;
        budget.ApprovedAmount = totalAmount;
        budget.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(budget);
        var version = await _repository.AddVersionAsync(new BudgetVersion
        {
            BudgetId = budgetId,
            VersionNo = next,
            TotalAmount = totalAmount,
            Remarks = remarks,
            CreatedBy = approverId ?? userId,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Revise", "Budget", budgetId, $"Version {next}");
        return version;
    }

    public async Task<CostCenter> CreateCostCenterAsync(CreateCostCenterRequest request, long? userId)
    {
        var cc = await _repository.AddCostCenterAsync(new CostCenter
        {
            ProjectId = request.SubProjectId ?? request.ProjectId,
            Code = request.Code,
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "CostCenter", cc.Id);
        return cc;
    }

    public Task<List<CostCenter>> GetCostCentersAsync(long? projectId) => _repository.GetCostCentersAsync(projectId);

    public async Task<CostCenter?> UpdateCostCenterAsync(long id, UpdateCostCenterRequest request, long? userId)
    {
        var cc = await _repository.GetCostCenterAsync(id);
        if (cc == null) return null;
        cc.ProjectId = request.SubProjectId ?? request.ProjectId;
        cc.Code = request.Code;
        cc.Name = request.Name;
        cc.Description = request.Description;
        await _repository.UpdateCostCenterAsync(cc);
        await _audit.LogAsync(userId, "Update", "CostCenter", id);
        return cc;
    }

    public async Task DeleteCostCenterAsync(long id, long? userId)
    {
        await _repository.DeleteCostCenterAsync(id);
        await _audit.LogAsync(userId, "Delete", "CostCenter", id);
    }

    public async Task AllocateAsync(CreateAllocationRequest request, long? userId)
    {
        await _repository.AddAllocationAsync(new BudgetAllocation
        {
            BudgetId = request.BudgetId,
            CostCenterId = request.CostCenterId,
            AllocatedAmount = request.AllocatedAmount,
            Remarks = request.Remarks
        });
        await _audit.LogAsync(userId, "Allocate", "Budget", request.BudgetId);
    }
}
