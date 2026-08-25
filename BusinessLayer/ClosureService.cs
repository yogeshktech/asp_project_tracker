using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Closure;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.BusinessLayer.Closure;

public interface IClosureService
{
    Task<Inventory> AddInventoryAsync(CreateInventoryRequest request, long? userId);
    Task<List<Inventory>> GetInventoryAsync(long projectId);
    Task<ProjectCompletionReport> CloseProjectAsync(ProjectClosureDto dto, long userId);
}

public class ClosureService : IClosureService
{
    private readonly IClosureRepository _repository;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;

    public ClosureService(IClosureRepository repository, IPermissionService permissions, IAuditService audit)
    {
        _repository = repository;
        _permissions = permissions;
        _audit = audit;
    }

    public async Task<Inventory> AddInventoryAsync(CreateInventoryRequest request, long? userId)
    {
        if (userId.HasValue && !await _permissions.CanEditModuleAsync(userId.Value, request.ProjectId, "Closure"))
            throw new UnauthorizedAccessException("No permission.");
        var inv = await _repository.AddInventoryAsync(new Inventory
        {
            ProjectId = request.ProjectId,
            ItemId = request.ItemId,
            Description = request.Description,
            Quantity = request.Quantity,
            UnitId = request.UnitId,
            Remarks = request.Remarks,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Inventory", inv.Id);
        return inv;
    }

    public Task<List<Inventory>> GetInventoryAsync(long projectId) => _repository.GetInventoryAsync(projectId);

    public async Task<ProjectCompletionReport> CloseProjectAsync(ProjectClosureDto dto, long userId)
    {
        if (!await _permissions.IsProjectManagerAsync(userId, dto.ProjectId))
            throw new UnauthorizedAccessException("Only Project Manager can close a project.");

        if (string.IsNullOrWhiteSpace(dto.SignedDocumentPath))
            throw new InvalidOperationException("Signed Project Completion Report is mandatory.");

        if (!dto.IsMandatoryComplete)
            throw new InvalidOperationException("Handover / completion report must be marked complete.");

        var inventory = await _repository.GetInventoryAsync(dto.ProjectId);
        if (inventory.Count == 0)
            throw new InvalidOperationException("Leftover inventory must be updated before project closure.");

        var report = await _repository.UpsertCompletionAsync(new ProjectCompletionReport
        {
            ProjectId = dto.ProjectId,
            HandoverNotes = dto.HandoverNotes,
            SignedDocumentPath = dto.SignedDocumentPath,
            IsMandatoryComplete = true,
            ClosedBy = userId,
            ClosedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });

        await _repository.SetProjectStatusAsync(dto.ProjectId, "Closed");
        await _audit.LogAsync(userId, "Close", "Project", dto.ProjectId);
        return report;
    }
}
