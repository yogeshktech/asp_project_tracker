using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Costs;
using project_tracker_madhu.DatabaseLayer.Budgets;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;
using project_tracker_madhu.DatabaseLayer.Context;
using Microsoft.EntityFrameworkCore;

namespace project_tracker_madhu.BusinessLayer.Budgets;

public interface IBudgetService
{
    Task<List<Budget>> GetByProjectAsync(long userId, long projectId);
    Task<Budget> CreateAsync(CreateBudgetRequest request, long? userId);
    Task<Budget> UpdateAsync(long budgetId, UpdateBudgetRequest request, long? userId);
    Task<BudgetVersion> ReviseAsync(long budgetId, decimal totalAmount, string? remarks, long? userId);
    Task<CostCenter> CreateCostCenterAsync(CreateCostCenterRequest request, long? userId);
    Task<List<CostCenter>> GetCostCentersAsync(long userId, long? projectId);
    Task<CostCenter?> UpdateCostCenterAsync(long id, UpdateCostCenterRequest request, long? userId);
    Task DeleteCostCenterAsync(long id, long? userId);
    Task AllocateAsync(CreateAllocationRequest request, long? userId);
}

public class BudgetService : IBudgetService
{
    private readonly IBudgetRepository _repository;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;
    private readonly AppDbContext _db;

    public BudgetService(IBudgetRepository repository, IPermissionService permissions, IAuditService audit, AppDbContext db)
    {
        _repository = repository;
        _permissions = permissions;
        _audit = audit;
        _db = db;
    }

    public async Task<List<Budget>> GetByProjectAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Budgets")) return new();
        return await _repository.GetByProjectAsync(projectId);
    }

    public async Task<Budget> CreateAsync(CreateBudgetRequest request, long? userId)
    {
        if (request.ApprovedAmount <= 0) throw new InvalidOperationException("Approved budget must be greater than zero.");
        if (userId.HasValue && !await _permissions.CanEditModuleAsync(userId.Value, request.ProjectId, "Budgets"))
            throw new UnauthorizedAccessException("No permission.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
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
            Currency = request.Currency,
            Remarks = "Initial approved baseline",
            CreatedBy = userId,
            ApproverId = userId,
            CreatedAt = DateTime.UtcNow
        });
        await transaction.CommitAsync();
        await _audit.LogAsync(userId, "Create", "Budget", budget.Id);
        return budget;
    }

    public async Task<Budget> UpdateAsync(long budgetId, UpdateBudgetRequest request, long? userId)
    {
        var budget = await _repository.GetAsync(budgetId) ?? throw new InvalidOperationException("Budget not found");
        if (request.ApprovedAmount <= 0) throw new InvalidOperationException("Approved budget must be greater than zero.");
        if (userId.HasValue && !await _permissions.CanUpdateModuleAsync(userId.Value, budget.ProjectId, "Budgets"))
            throw new UnauthorizedAccessException("No update permission on budget.");
        var allocated = await _db.BudgetAllocations.Where(a => a.BudgetId == budgetId).SumAsync(a => (decimal?)a.AllocatedAmount) ?? 0;
        if (request.ApprovedAmount < allocated) throw new InvalidOperationException("Approved budget cannot be lower than the amount already allocated.");
        var amountChanged = request.ApprovedAmount != budget.ApprovedAmount;
        var baselineChanged = amountChanged || !string.Equals(request.Currency, budget.Currency, StringComparison.OrdinalIgnoreCase);
        if (baselineChanged && string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException("A reason is required when changing the approved budget or its currency.");
        var next = (budget.Versions.Count == 0 ? 0 : budget.Versions.Max(v => v.VersionNo)) + 1;
        budget.Name = request.Name;
        budget.ApprovedAmount = request.ApprovedAmount;
        budget.Currency = request.Currency;
        budget.UpdatedAt = DateTime.UtcNow;
        await using var transaction = await _db.Database.BeginTransactionAsync();
        await _repository.UpdateAsync(budget);
        if (baselineChanged) await _repository.AddVersionAsync(new BudgetVersion
        {
            BudgetId = budget.Id, VersionNo = next, TotalAmount = request.ApprovedAmount, Currency = request.Currency,
            Remarks = request.Remarks!.Trim(), CreatedBy = userId, ApproverId = userId, CreatedAt = DateTime.UtcNow
        });
        await transaction.CommitAsync();
        await _audit.LogAsync(userId, "Update", "Budget", budget.Id, baselineChanged ? $"Version {next}" : "Budget details updated");
        return budget;
    }

    public async Task<BudgetVersion> ReviseAsync(long budgetId, decimal totalAmount, string? remarks, long? userId)
    {
        var budget = await _repository.GetAsync(budgetId) ?? throw new InvalidOperationException("Budget not found");
        if (totalAmount <= 0) throw new InvalidOperationException("Approved budget must be greater than zero.");
        if (string.IsNullOrWhiteSpace(remarks)) throw new InvalidOperationException("Revision reason is required.");
        if (userId.HasValue && !await _permissions.CanUpdateModuleAsync(userId.Value, budget.ProjectId, "Budgets"))
            throw new UnauthorizedAccessException("No permission.");
        var allocated = await _db.BudgetAllocations.Where(a => a.BudgetId == budgetId).SumAsync(a => (decimal?)a.AllocatedAmount) ?? 0;
        if (totalAmount < allocated) throw new InvalidOperationException("Approved budget cannot be lower than the amount already allocated.");

        var next = (budget.Versions.Count == 0 ? 0 : budget.Versions.Max(v => v.VersionNo)) + 1;
        budget.ApprovedAmount = totalAmount;
        budget.UpdatedAt = DateTime.UtcNow;
        await using var transaction = await _db.Database.BeginTransactionAsync();
        await _repository.UpdateAsync(budget);
        var version = await _repository.AddVersionAsync(new BudgetVersion
        {
            BudgetId = budgetId,
            VersionNo = next,
            TotalAmount = totalAmount,
            Currency = budget.Currency,
            Remarks = remarks.Trim(),
            CreatedBy = userId,
            ApproverId = userId,
            CreatedAt = DateTime.UtcNow
        });
        await transaction.CommitAsync();
        await _audit.LogAsync(userId, "Revise", "Budget", budgetId, $"Version {next}");
        return version;
    }

    public async Task<CostCenter> CreateCostCenterAsync(CreateCostCenterRequest request, long? userId)
    {
        var projectId = request.SubProjectId ?? request.ProjectId ?? 0;
        if (userId.HasValue && projectId > 0)
            await _permissions.EnsureModuleAsync(userId.Value, projectId, "Budgets", "edit");
        var cc = await _repository.AddCostCenterAsync(new CostCenter
        {
            ProjectId = request.SubProjectId ?? request.ProjectId,
            Code = EntityCodes.Next((await _repository.GetCostCentersAsync(null)).Select(c => c.Code), EntityCodes.CostCenter),
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "CostCenter", cc.Id);
        return cc;
    }

    public async Task<List<CostCenter>> GetCostCentersAsync(long userId, long? projectId)
    {
        var isAdmin = await _permissions.IsAdminAsync(userId);
        if (projectId.HasValue && !isAdmin
            && !await _permissions.CanViewModuleAsync(userId, projectId.Value, "Budgets")) return new();
        if (projectId.HasValue)
        {
            // Direct sub-projects act as cost centers beneath their parent project.
            var children = await _db.Projects.Where(p => p.ParentProjectId == projectId.Value).ToListAsync();
            var existing = await _repository.GetCostCentersAsync(null);
            foreach (var child in children.Where(p => !existing.Any(c => c.ProjectId == p.Id)))
                existing.Add(await _repository.AddCostCenterAsync(new CostCenter
                {
                    ProjectId = child.Id,
                    Code = EntityCodes.Next(existing.Select(c => c.Code), EntityCodes.CostCenter),
                    Name = $"{child.Code ?? $"PRJ-{child.Id}"} — {child.Name}",
                    Description = "Auto-created from sub-project for parent budget allocation.",
                    CreatedAt = DateTime.UtcNow
                }));
        }
        if (isAdmin) return await _repository.GetCostCentersAsync(projectId);
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var centers = await _repository.GetCostCentersAsync(projectId);
        var visible = new List<CostCenter>();
        foreach (var center in centers)
        {
            if (!center.ProjectId.HasValue) continue;
            var parentOwnedCenter = projectId.HasValue && await _db.Projects.AnyAsync(p =>
                p.Id == center.ProjectId.Value && p.ParentProjectId == projectId.Value);
            if ((allowed.Contains(center.ProjectId.Value) && await _permissions.CanViewModuleAsync(userId, center.ProjectId.Value, "Budgets"))
                || (parentOwnedCenter && await _permissions.CanViewModuleAsync(userId, projectId!.Value, "Budgets")))
                visible.Add(center);
        }
        return visible;
    }

    public async Task<CostCenter?> UpdateCostCenterAsync(long id, UpdateCostCenterRequest request, long? userId)
    {
        var cc = await _repository.GetCostCenterAsync(id);
        if (cc == null) return null;
        if (userId.HasValue && cc.ProjectId.HasValue)
            await _permissions.EnsureModuleAsync(userId.Value, cc.ProjectId.Value, "Budgets", "update");
        cc.ProjectId = request.SubProjectId ?? request.ProjectId;
        if (string.IsNullOrWhiteSpace(cc.Code))
            cc.Code = EntityCodes.Next((await _repository.GetCostCentersAsync(null)).Select(c => c.Code), EntityCodes.CostCenter);
        cc.Name = request.Name;
        cc.Description = request.Description;
        await _repository.UpdateCostCenterAsync(cc);
        await _audit.LogAsync(userId, "Update", "CostCenter", id);
        return cc;
    }

    public async Task DeleteCostCenterAsync(long id, long? userId)
    {
        var cc = await _repository.GetCostCenterAsync(id);
        if (userId.HasValue && cc?.ProjectId != null)
            await _permissions.EnsureModuleAsync(userId.Value, cc.ProjectId.Value, "Budgets", "delete");
        await _repository.DeleteCostCenterAsync(id);
        await _audit.LogAsync(userId, "Delete", "CostCenter", id);
    }

    public async Task AllocateAsync(CreateAllocationRequest request, long? userId)
    {
        var budget = await _repository.GetAsync(request.BudgetId) ?? throw new InvalidOperationException("Budget not found.");
        var center = await _repository.GetCostCenterAsync(request.CostCenterId) ?? throw new InvalidOperationException("Cost center not found.");
        var belongsToBudgetProject = center.ProjectId == budget.ProjectId;
        var isChildProjectCenter = center.ProjectId.HasValue && await _db.Projects
            .AnyAsync(p => p.Id == center.ProjectId.Value && p.ParentProjectId == budget.ProjectId);
        if (!belongsToBudgetProject && !isChildProjectCenter)
            throw new InvalidOperationException("A budget can only be allocated to its project or a direct sub-project cost center.");
        if (request.AllocatedAmount <= 0) throw new InvalidOperationException("Allocated amount must be greater than zero.");
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, budget.ProjectId, "Budgets", "edit");
        var alreadyAllocated = await _db.BudgetAllocations.Where(a => a.BudgetId == budget.Id).SumAsync(a => (decimal?)a.AllocatedAmount) ?? 0;
        if (alreadyAllocated + request.AllocatedAmount > budget.ApprovedAmount)
            throw new InvalidOperationException("Allocations cannot exceed the approved budget baseline.");
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
