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
    Task BulkImportUpdatesAsync(TaskBulkImportRequest request, long? userId);
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
        var tasks = await _repository.GetTasksAsync(projectId);
        var isAdmin = await _permissions.IsAdminAsync(userId);
        var canEdit = isAdmin || await _permissions.CanEditModuleAsync(userId, projectId, "Tasks");
        return tasks.Select(t => MapTask(t, userId, isAdmin, canEdit)).ToList();
    }

    private static TaskItemDto MapTask(ProjectTask t, long userId, bool isAdmin, bool canEdit)
    {
        var canDeleteTask = isAdmin || canEdit || t.AssignedTo == userId;
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
            SubTasks = (t.SubTasks ?? Array.Empty<SubTask>())
                .Select(s => MapSubTask(s, userId, isAdmin, canEdit, t.AssignedTo))
                .ToList()
        };
    }

    private static SubTaskItemDto MapSubTask(SubTask s, long userId, bool isAdmin, bool canEdit, long? parentAssignedTo) => new()
    {
        Id = s.Id,
        TaskId = s.TaskId,
        Title = s.Title,
        AssignedTo = s.AssignedTo,
        DueDate = s.DueDate,
        Status = s.Status,
        CompletionPercent = s.CompletionPercent,
        Remarks = s.Remarks,
        CanDelete = isAdmin || canEdit || s.AssignedTo == userId || parentAssignedTo == userId
    };

    private static SubTaskItemDto MapSubTask(SubTask s) => MapSubTask(s, 0, false, false, null);

    private async Task EnsureCanManageTaskAsync(long userId, ProjectTask task)
    {
        if (await _permissions.IsAdminAsync(userId)) return;
        if (task.AssignedTo == userId) return;
        if (await _permissions.CanEditModuleAsync(userId, task.ProjectId, "Tasks")) return;
        throw new UnauthorizedAccessException("You can only manage tasks assigned to you.");
    }

    public async Task<ProjectTask> CreateTaskAsync(CreateTaskRequest request, long? userId)
    {
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
        return MapSubTask(sub);
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
            && !await _permissions.CanEditModuleAsync(userId, parent.ProjectId, "Tasks"))
            throw new UnauthorizedAccessException("You can only delete sub-tasks assigned to you.");
        await _repository.DeleteSubTaskAsync(subTaskId);
        await _audit.LogAsync(userId, "Delete", "SubTask", subTaskId);
    }

    public async Task<TaskUpdate> AddDailyUpdateAsync(CreateTaskUpdateRequest request, long? userId)
    {
        var task = await _repository.GetTaskAsync(request.TaskId) ?? throw new InvalidOperationException("Task not found");
        var isTaskOwner = userId.HasValue && (
            await _permissions.IsAdminAsync(userId.Value)
            || task.AssignedTo == userId
            || await _permissions.CanEditModuleAsync(userId.Value, task.ProjectId, "Tasks"));

        if (request.CompletionPercent.HasValue && !isTaskOwner && task.AssignedTo != userId)
            throw new UnauthorizedAccessException("Only task owner/assignee can change % completion on main task.");

        if (request.SubTaskId.HasValue)
        {
            var sub = task.SubTasks.FirstOrDefault(s => s.Id == request.SubTaskId);
            if (sub != null)
            {
                if (request.CompletionPercent.HasValue) sub.CompletionPercent = request.CompletionPercent.Value;
                if (!string.IsNullOrWhiteSpace(request.Status)) sub.Status = request.Status;
                if (!string.IsNullOrWhiteSpace(request.Remarks)) sub.Remarks = request.Remarks;
            }
        }
        else if (request.CompletionPercent.HasValue && isTaskOwner)
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

    public async Task BulkImportUpdatesAsync(TaskBulkImportRequest request, long? userId)
    {
        foreach (var update in request.Updates)
        {
            update.TaskId = update.TaskId == 0 ? update.TaskId : update.TaskId;
            var task = await _repository.GetTaskAsync(update.TaskId);
            if (task == null || task.ProjectId != request.ProjectId) continue;
            await AddDailyUpdateAsync(update, userId);
        }
        await _audit.LogAsync(userId, "Import", "TaskUpdate", request.ProjectId, $"{request.Updates.Count} rows");
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
