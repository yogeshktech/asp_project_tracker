using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Tasks;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Tasks;

public interface ITaskService
{
    Task<List<Milestone>> GetMilestonesAsync(long projectId);
    Task<Milestone> CreateMilestoneAsync(CreateMilestoneRequest request, long? userId);
    Task<List<TaskItemDto>> GetTasksAsync(long projectId, long userId);
    Task<ProjectTask> CreateTaskAsync(CreateTaskRequest request, long? userId);
    Task<SubTaskItemDto> CreateSubTaskAsync(CreateSubTaskRequest request, long? userId);
    Task DeleteTaskAsync(long taskId, long userId);
    Task DeleteSubTaskAsync(long subTaskId, long userId);
    Task<TaskUpdate> AddDailyUpdateAsync(CreateTaskUpdateRequest request, long? userId);
    Task<TaskBulkImportResultDto> BulkImportUpdatesAsync(TaskBulkImportRequest request, long? userId);
    Task<List<ExceptionItemDto>> GetExceptionsAsync(long projectId);
    Task<DailySiteReportDto> GetDailyReportAsync(long projectId, DateOnly? date);
}

public class TaskService : ITaskService
{
    private readonly ITaskRepository _repository;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;

    public TaskService(ITaskRepository repository, IPermissionService permissions, IAuditService audit)
    {
        _repository = repository;
        _permissions = permissions;
        _audit = audit;
    }

    public Task<List<Milestone>> GetMilestonesAsync(long projectId) => _repository.GetMilestonesAsync(projectId);

    public async Task<Milestone> CreateMilestoneAsync(CreateMilestoneRequest request, long? userId)
    {
        var milestone = await _repository.AddMilestoneAsync(new Milestone
        {
            ProjectId = request.ProjectId,
            Name = request.Name,
            Description = request.Description,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            Status = "NotStarted",
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Milestone", milestone.Id);
        return milestone;
    }

    public async Task<List<TaskItemDto>> GetTasksAsync(long projectId, long userId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Tasks")) return new();
        var tasks = await _repository.GetTasksAsync(projectId);
        var isAdmin = await _permissions.IsAdminAsync(userId);
        var canEdit = isAdmin || await _permissions.CanEditModuleAsync(userId, projectId, "Tasks");
        var canUpdate = isAdmin || await _permissions.CanUpdateModuleAsync(userId, projectId, "Tasks");
        var canDelete = isAdmin || await _permissions.CanDeleteModuleAsync(userId, projectId, "Tasks");
        var ordered = tasks.OrderBy(t => t.Id).ToList();
        return ordered.Select((t, i) =>
        {
            var dto = MapTask(t, userId, isAdmin, canEdit, canUpdate, canDelete);
            dto.DisplayCode = $"Task-{i + 1}";
            var subs = (t.SubTasks ?? Array.Empty<SubTask>()).OrderBy(s => s.Id).ToList();
            dto.SubTasks = subs.Select((s, j) =>
            {
                var subDto = MapSubTask(s, userId, isAdmin, canEdit, canUpdate, canDelete, t.AssignedTo);
                subDto.DisplayCode = $"{dto.DisplayCode}-Sub-{j + 1}";
                return subDto;
            }).ToList();
            return dto;
        }).ToList();
    }

    private static TaskItemDto MapTask(ProjectTask t, long userId, bool isAdmin, bool canEdit, bool canUpdate, bool canDelete)
    {
        var canDeleteTask = isAdmin || canDelete || t.AssignedTo == userId;
        var canEditPercent = isAdmin || canUpdate || canEdit || t.AssignedTo == userId;
        return new TaskItemDto
        {
            Id = t.Id,
            ProjectId = t.ProjectId,
            MilestoneId = t.MilestoneId,
            Title = t.Title,
            Description = t.Description,
            AssignedTo = t.AssignedTo,
            StartDate = t.StartDate,
            DueDate = t.DueDate,
            Status = t.Status,
            CompletionPercent = t.CompletionPercent,
            Remarks = t.Remarks,
            CanDelete = canDeleteTask,
            CanEditPercent = canEditPercent,
            SubTasks = (t.SubTasks ?? Array.Empty<SubTask>())
                .Select(s => MapSubTask(s, userId, isAdmin, canEdit, canUpdate, canDelete, t.AssignedTo))
                .ToList()
        };
    }

    private static SubTaskItemDto MapSubTask(SubTask s, long userId, bool isAdmin, bool canEdit, bool canUpdate, bool canDelete, long? parentAssignedTo) => new()
    {
        Id = s.Id,
        TaskId = s.TaskId,
        Title = s.Title,
        AssignedTo = s.AssignedTo,
        DueDate = s.DueDate,
        Status = s.Status,
        CompletionPercent = s.CompletionPercent,
        Remarks = s.Remarks,
        CanDelete = isAdmin || canDelete || s.AssignedTo == userId || parentAssignedTo == userId,
        CanEditPercent = isAdmin || canUpdate || canEdit || s.AssignedTo == userId || parentAssignedTo == userId
    };

    private static SubTaskItemDto MapSubTask(SubTask s) => MapSubTask(s, 0, false, false, false, false, null);

    private async Task EnsureCanManageTaskAsync(long userId, ProjectTask task)
    {
        if (await _permissions.IsAdminAsync(userId)) return;
        if (task.AssignedTo == userId) return;
        if (await _permissions.CanDeleteModuleAsync(userId, task.ProjectId, "Tasks")) return;
        throw new UnauthorizedAccessException("You can only manage tasks assigned to you.");
    }

    public async Task<ProjectTask> CreateTaskAsync(CreateTaskRequest request, long? userId)
    {
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, request.ProjectId, "Tasks", "edit");
        var task = await _repository.AddTaskAsync(new ProjectTask
        {
            ProjectId = request.ProjectId,
            MilestoneId = request.MilestoneId,
            DependsOnTaskId = request.DependsOnTaskId,
            Title = request.Title,
            Description = request.Description,
            AssignedTo = request.AssignedTo ?? userId,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            Remarks = request.Remarks,
            Status = "NotStarted",
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Task", task.Id);
        return task;
    }

    public async Task<SubTaskItemDto> CreateSubTaskAsync(CreateSubTaskRequest request, long? userId)
    {
        var parent = await _repository.GetTaskAsync(request.TaskId)
            ?? throw new InvalidOperationException("Parent task not found.");
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, parent.ProjectId, "Tasks", "edit");
        var status = string.IsNullOrWhiteSpace(request.Status)
            ? "NotStarted"
            : request.Status.Replace(" ", "");
        var sub = await _repository.AddSubTaskAsync(new SubTask
        {
            TaskId = request.TaskId,
            Title = request.Title,
            AssignedTo = request.AssignedTo ?? parent.AssignedTo ?? userId,
            DueDate = request.DueDate,
            Remarks = request.Remarks,
            Status = status,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "SubTask", sub.Id);
        var dto = MapSubTask(sub, userId ?? 0, false, false, false, false, parent.AssignedTo);
        var projectTasks = await _repository.GetTasksAsync(parent.ProjectId);
        var taskNo = projectTasks.OrderBy(t => t.Id).Select((t, i) => (t.Id, No: i + 1)).First(x => x.Id == parent.Id).No;
        var subNo = projectTasks.First(t => t.Id == parent.Id).SubTasks.OrderBy(s => s.Id)
            .Select((s, i) => (s.Id, No: i + 1)).First(x => x.Id == sub.Id).No;
        dto.DisplayCode = $"Task-{taskNo}-Sub-{subNo}";
        return dto;
    }

    public async Task DeleteTaskAsync(long taskId, long userId)
    {
        var task = await _repository.GetTaskAsync(taskId) ?? throw new InvalidOperationException("Task not found");
        await EnsureCanManageTaskAsync(userId, task);
        await _repository.DeleteTaskAsync(taskId);
        await _audit.LogAsync(userId, "Delete", "Task", taskId);
    }

    public async Task DeleteSubTaskAsync(long subTaskId, long userId)
    {
        var sub = await _repository.GetSubTaskAsync(subTaskId) ?? throw new InvalidOperationException("Sub-task not found");
        var parent = sub.Task ?? await _repository.GetTaskAsync(sub.TaskId)
            ?? throw new InvalidOperationException("Parent task not found");
        if (!await _permissions.IsAdminAsync(userId)
            && sub.AssignedTo != userId
            && parent.AssignedTo != userId
            && !await _permissions.CanDeleteModuleAsync(userId, parent.ProjectId, "Tasks"))
            throw new UnauthorizedAccessException("You can only delete sub-tasks assigned to you.");
        await _repository.DeleteSubTaskAsync(subTaskId);
        await _audit.LogAsync(userId, "Delete", "SubTask", subTaskId);
    }

    public async Task<TaskUpdate> AddDailyUpdateAsync(CreateTaskUpdateRequest request, long? userId)
    {
        var task = await _repository.GetTaskAsync(request.TaskId) ?? throw new InvalidOperationException("Task not found");
        if (userId.HasValue && !await _permissions.CanViewProjectAsync(userId.Value, task.ProjectId))
            throw new UnauthorizedAccessException("No permission to update this project.");

        var canEditModule = userId.HasValue && await _permissions.CanUpdateModuleAsync(userId.Value, task.ProjectId, "Tasks");
        var isAdmin = userId.HasValue && await _permissions.IsAdminAsync(userId.Value);
        SubTask? sub = null;
        if (request.SubTaskId.HasValue)
            sub = task.SubTasks.FirstOrDefault(s => s.Id == request.SubTaskId);

        var canChangePercent = isAdmin || canEditModule
            || (sub != null ? sub.AssignedTo == userId || task.AssignedTo == userId : task.AssignedTo == userId);

        if (request.CompletionPercent.HasValue && !canChangePercent)
            throw new UnauthorizedAccessException("Only the task owner can change % completion.");

        if (sub != null)
        {
            if (request.CompletionPercent.HasValue) sub.CompletionPercent = request.CompletionPercent.Value;
            if (!string.IsNullOrWhiteSpace(request.Status)) sub.Status = request.Status;
            if (!string.IsNullOrWhiteSpace(request.Remarks)) sub.Remarks = request.Remarks;
        }
        else if (request.CompletionPercent.HasValue && canChangePercent)
        {
            task.CompletionPercent = request.CompletionPercent.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && request.SubTaskId == null)
            task.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Remarks))
            task.Remarks = request.Remarks;
        task.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateTaskAsync(task);

        if (!string.IsNullOrWhiteSpace(request.AttachmentPath))
        {
            await _repository.AddAttachmentAsync(new TaskAttachment
            {
                TaskId = task.Id,
                FileName = Path.GetFileName(request.AttachmentPath),
                FilePath = request.AttachmentPath,
                UploadedBy = userId,
                UploadedAt = DateTime.UtcNow
            });
        }

        return await _repository.AddUpdateAsync(new TaskUpdate
        {
            TaskId = request.TaskId,
            SubTaskId = request.SubTaskId,
            UpdatedBy = userId,
            UpdateDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CompletionPercent = request.CompletionPercent,
            Status = request.Status,
            Remarks = request.Remarks,
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<TaskBulkImportResultDto> BulkImportUpdatesAsync(TaskBulkImportRequest request, long? userId)
    {
        var result = new TaskBulkImportResultDto();
        foreach (var update in request.Updates)
        {
            var task = await _repository.GetTaskAsync(update.TaskId);
            if (task == null || task.ProjectId != request.ProjectId)
            {
                result.Skipped++;
                result.Errors.Add($"Task {update.TaskId} not found in project {request.ProjectId}.");
                continue;
            }
            try
            {
                await AddDailyUpdateAsync(update, userId);
                result.Imported++;
            }
            catch (Exception ex)
            {
                result.Skipped++;
                result.Errors.Add($"Task {update.TaskId}: {ex.Message}");
            }
        }
        await _audit.LogAsync(userId, "Import", "TaskUpdate", request.ProjectId, $"{result.Imported} imported, {result.Skipped} skipped");
        return result;
    }

    public async Task<List<ExceptionItemDto>> GetExceptionsAsync(long projectId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var inactiveSince = DateTime.UtcNow.AddDays(-7);
        var tasks = await _repository.GetTasksAsync(projectId);
        var exceptions = new List<ExceptionItemDto>();

        foreach (var task in tasks.Where(t => t.DueDate != null && t.DueDate < today && t.Status != "Completed"))
        {
            exceptions.Add(new ExceptionItemDto
            {
                Type = "OverdueTask",
                RelatedId = task.Id,
                Title = task.Title,
                Message = "Task is overdue."
            });
        }

        foreach (var task in tasks.Where(t => t.Status != "Completed"))
        {
            var lastUpdate = await _repository.GetLastUpdateAsync(task.Id);
            if (lastUpdate == null || lastUpdate.CreatedAt < inactiveSince)
            {
                exceptions.Add(new ExceptionItemDto
                {
                    Type = "InactiveTask",
                    RelatedId = task.Id,
                    Title = task.Title,
                    Message = "No progress in the last 7 days."
                });
            }
        }

        return exceptions;
    }

    public async Task<DailySiteReportDto> GetDailyReportAsync(long projectId, DateOnly? date)
    {
        var reportDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var tasks = await _repository.GetTasksAsync(projectId);
        var updates = await _repository.GetUpdatesForDateAsync(projectId, reportDate);

        return new DailySiteReportDto
        {
            ProjectId = projectId,
            ReportDate = reportDate,
            OverallCompletionPercent = tasks.Count == 0 ? 0 : tasks.Average(t => t.CompletionPercent),
            TaskUpdates = updates.Select(u => new TaskDailyStatusDto
            {
                TaskId = u.TaskId,
                Title = tasks.FirstOrDefault(t => t.Id == u.TaskId)?.Title ?? $"Task {u.TaskId}",
                CompletionPercent = u.CompletionPercent ?? 0,
                Status = u.Status ?? "",
                Remarks = u.Remarks
            }).ToList()
        };
    }
}
