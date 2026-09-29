using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Tasks;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Tasks;

public interface ITaskService
{
    Task<List<Milestone>> GetMilestonesAsync(long projectId, long userId);
    Task<Milestone> CreateMilestoneAsync(CreateMilestoneRequest request, long? userId);
    Task<Milestone> UpdateMilestoneAsync(long milestoneId, CreateMilestoneRequest request, long userId);
    Task<List<TaskItemDto>> GetTasksAsync(long projectId, long userId);
    Task<List<TaskHistoryItemDto>> GetTaskHistoryAsync(long taskId, long? subTaskId, long userId);
    Task<ProjectTask> CreateTaskAsync(CreateTaskRequest request, long? userId);
    Task<ProjectTask> UpdateTaskAsync(long taskId, CreateTaskRequest request, long userId);
    Task<SubTaskItemDto> CreateSubTaskAsync(CreateSubTaskRequest request, long? userId);
    Task DeleteTaskAsync(long taskId, long userId);
    Task DeleteSubTaskAsync(long subTaskId, long userId);
    Task<TaskUpdate> AddDailyUpdateAsync(CreateTaskUpdateRequest request, long? userId);
    Task<TaskBulkImportResultDto> BulkImportUpdatesAsync(TaskBulkImportRequest request, long? userId);
    Task<List<ExceptionItemDto>> GetExceptionsAsync(long projectId, long userId);
    Task<DailySiteReportDto> GetDailyReportAsync(long projectId, DateOnly? date, long userId);
    Task SetTaskDependencyAsync(long taskId, SetTaskDependencyRequest request, long userId);
    Task SetSubTaskDependencyAsync(long subTaskId, SetTaskDependencyRequest request, long userId);
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

    public async Task<List<Milestone>> GetMilestonesAsync(long projectId, long userId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Tasks")) return new();
        var milestones = await _repository.GetMilestonesAsync(projectId);
        var tasks = await _repository.GetTasksAsync(projectId);
        foreach (var milestone in milestones)
        {
            var attached = tasks.Where(t => t.MilestoneId == milestone.Id).ToList();
            if (attached.Count == 0) continue;
            milestone.CompletionPercent = attached.Average(t => t.CompletionPercent);
        }
        return milestones;
    }

    public async Task<Milestone> CreateMilestoneAsync(CreateMilestoneRequest request, long? userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) throw new InvalidOperationException("Milestone name is required.");
        if (request.StartDate.HasValue && request.DueDate.HasValue && request.StartDate.Value > request.DueDate.Value)
            throw new InvalidOperationException("Milestone start date must be on or before its target date.");
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, request.ProjectId, "Tasks", "edit");
        await EnsureMilestoneDependencyAsync(request.ProjectId, null, request.DependsOnMilestoneId);
        await EnsureMilestoneCanStartAsync(request.ProjectId, request.DependsOnMilestoneId, request.Status);
        var milestone = await _repository.AddMilestoneAsync(new Milestone
        {
            ProjectId = request.ProjectId,
            Name = request.Name,
            Description = request.Description,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            OwnerId = request.OwnerId,
            DependsOnMilestoneId = request.DependsOnMilestoneId,
            CompletionEvidence = request.CompletionEvidence,
            Status = NormalizeMilestoneStatus(request.Status),
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Milestone", milestone.Id);
        return milestone;
    }

    public async Task<Milestone> UpdateMilestoneAsync(long milestoneId, CreateMilestoneRequest request, long userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) throw new InvalidOperationException("Milestone name is required.");
        if (request.StartDate.HasValue && request.DueDate.HasValue && request.StartDate.Value > request.DueDate.Value)
            throw new InvalidOperationException("Milestone start date must be on or before its target date.");
        var milestone = (await _repository.GetMilestonesAsync(request.ProjectId))
            .FirstOrDefault(m => m.Id == milestoneId)
            ?? throw new InvalidOperationException("Milestone not found in this project.");
        await _permissions.EnsureModuleAsync(userId, request.ProjectId, "Tasks", "edit");
        await EnsureMilestoneDependencyAsync(request.ProjectId, milestoneId, request.DependsOnMilestoneId);
        await EnsureMilestoneCanStartAsync(request.ProjectId, request.DependsOnMilestoneId, request.Status);
        milestone.Name = request.Name.Trim();
        milestone.Description = request.Description;
        milestone.StartDate = request.StartDate;
        milestone.DueDate = request.DueDate;
        milestone.OwnerId = request.OwnerId;
        milestone.DependsOnMilestoneId = request.DependsOnMilestoneId;
        milestone.CompletionEvidence = request.CompletionEvidence;
        milestone.Status = NormalizeMilestoneStatus(request.Status);
        await _repository.UpdateMilestoneAsync(milestone);
        await _audit.LogAsync(userId, "Update", "Milestone", milestone.Id);
        return milestone;
    }

    private async Task EnsureMilestoneDependencyAsync(long projectId, long? milestoneId, long? dependencyId)
    {
        if (!dependencyId.HasValue) return;
        var milestones = await _repository.GetMilestonesAsync(projectId);
        var dependency = milestones.FirstOrDefault(m => m.Id == dependencyId.Value)
            ?? throw new InvalidOperationException("Select a dependency milestone from this project.");
        var seen = new HashSet<long>();
        var current = dependency;
        while (true)
        {
            if (milestoneId.HasValue && current.Id == milestoneId.Value)
                throw new InvalidOperationException("That milestone dependency would create a cycle.");
            if (!seen.Add(current.Id) || !current.DependsOnMilestoneId.HasValue) break;
            var next = milestones.FirstOrDefault(m => m.Id == current.DependsOnMilestoneId.Value);
            if (next == null) break;
            current = next;
        }
    }

    private async Task EnsureMilestoneCanStartAsync(long projectId, long? dependencyId, string? status)
    {
        if (!dependencyId.HasValue || NormalizeMilestoneStatus(status) == "NotStarted") return;
        var dependency = (await _repository.GetMilestonesAsync(projectId)).FirstOrDefault(m => m.Id == dependencyId.Value);
        if (dependency == null || !LooksComplete(dependency.Status, dependency.CompletionPercent))
            throw new InvalidOperationException("This milestone is waiting on its dependency and cannot be started yet.");
    }

    private static string NormalizeMilestoneStatus(string? status) => (status ?? "").Replace(" ", "", StringComparison.Ordinal).ToLowerInvariant() switch
    {
        "inprogress" => "InProgress",
        "delayed" => "Delayed",
        "completed" => "Completed",
        "notstarted" => "NotStarted",
        _ => "NotStarted"
    };

    public async Task<List<TaskItemDto>> GetTasksAsync(long projectId, long userId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Tasks")) return new();
        var tasks = await _repository.GetTasksAsync(projectId);
        var isAdmin = await _permissions.IsAdminAsync(userId);
        var canEdit = isAdmin || await _permissions.CanEditModuleAsync(userId, projectId, "Tasks");
        var canUpdate = isAdmin || await _permissions.CanUpdateModuleAsync(userId, projectId, "Tasks");
        var canDelete = isAdmin || await _permissions.CanDeleteModuleAsync(userId, projectId, "Tasks");
        var ordered = tasks.OrderBy(t => t.Id).ToList();
        var mapped = ordered.Select((t, i) =>
        {
            var dto = MapTask(t, userId, isAdmin, canEdit, canUpdate, canDelete);
            dto.DisplayCode = $"Task-{i + 1}";
            var subs = (t.SubTasks ?? Array.Empty<SubTask>()).OrderBy(s => s.Id).ToList();
            dto.SubTasks = BuildSubTree(subs, null, dto.DisplayCode, 1, userId, isAdmin, canEdit, canUpdate, canDelete, t.AssignedTo);
            return dto;
        }).ToList();
        ApplyDependencyFlags(ordered, mapped);
        return mapped;
    }

    public async Task<List<TaskHistoryItemDto>> GetTaskHistoryAsync(long taskId, long? subTaskId, long userId)
    {
        var task = await _repository.GetTaskAsync(taskId) ?? throw new InvalidOperationException("Task not found.");
        if (!await _permissions.CanViewModuleAsync(userId, task.ProjectId, "Tasks"))
            throw new UnauthorizedAccessException("You cannot view this task's history.");
        if (subTaskId.HasValue && !(task.SubTasks ?? Array.Empty<SubTask>()).Any(s => s.Id == subTaskId.Value))
            throw new InvalidOperationException("Sub-task does not belong to the selected task.");
        var updates = await _repository.GetTaskHistoryAsync(taskId, subTaskId);
        return updates.Select(update => new TaskHistoryItemDto
        {
            Id = update.Id,
            ItemTitle = update.SubTaskId.HasValue
                ? (task.SubTasks ?? Array.Empty<SubTask>()).FirstOrDefault(s => s.Id == update.SubTaskId.Value)?.Title ?? "Sub-task"
                : task.Title,
            UpdateDate = update.UpdateDate,
            CreatedAt = update.CreatedAt,
            UpdatedById = update.UpdatedBy,
            CompletionPercent = update.CompletionPercent,
            Status = update.Status,
            Remarks = update.Remarks
        }).ToList();
    }

    private static TaskItemDto MapTask(ProjectTask t, long userId, bool isAdmin, bool canEdit, bool canUpdate, bool canDelete)
    {
        var canDeleteTask = isAdmin || canDelete || t.AssignedTo == userId;
        var canEditPercent = isAdmin || t.AssignedTo == userId;
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
            CanEdit = isAdmin || canEdit,
            CanEditPercent = canEditPercent,
            DependsOnTaskId = t.DependsOnTaskId,
            DependsOnSubTaskId = t.DependsOnSubTaskId,
            CompletionEvidence = t.CompletionEvidence,
            SubTasks = new()
        };
    }

    private static string NestLabel(int depth) => depth switch
    {
        1 => "Sub",
        2 => "Child",
        _ => $"L{depth}"
    };

    private static List<SubTaskItemDto> BuildSubTree(
        List<SubTask> all,
        long? parentId,
        string parentCode,
        int depth,
        long userId,
        bool isAdmin,
        bool canEdit,
        bool canUpdate,
        bool canDelete,
        long? parentAssignedTo)
    {
        return all.Where(s => s.ParentSubTaskId == parentId)
            .Select((s, j) =>
            {
                var dto = MapSubTask(s, userId, isAdmin, canEdit, canUpdate, canDelete, parentAssignedTo);
                dto.DisplayCode = $"{parentCode}-{NestLabel(depth)}-{j + 1}";
                dto.Children = BuildSubTree(all, s.Id, dto.DisplayCode, depth + 1, userId, isAdmin, canEdit, canUpdate, canDelete, parentAssignedTo);
                return dto;
            })
            .ToList();
    }

    private static SubTaskItemDto MapSubTask(SubTask s, long userId, bool isAdmin, bool canEdit, bool canUpdate, bool canDelete, long? parentAssignedTo) => new()
    {
        Id = s.Id,
        TaskId = s.TaskId,
        ParentSubTaskId = s.ParentSubTaskId,
        Title = s.Title,
        AssignedTo = s.AssignedTo,
        DueDate = s.DueDate,
        Status = s.Status,
        CompletionPercent = s.CompletionPercent,
        Remarks = s.Remarks,
        CanDelete = isAdmin || canDelete || s.AssignedTo == userId || parentAssignedTo == userId,
        CanEditPercent = isAdmin || s.AssignedTo == userId || parentAssignedTo == userId,
        DependsOnTaskId = s.DependsOnTaskId,
        DependsOnSubTaskId = s.DependsOnSubTaskId
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
        if (request.StartDate.HasValue && request.DueDate.HasValue && request.StartDate.Value > request.DueDate.Value)
            throw new InvalidOperationException("Task start date must be on or before its due date.");
        if (request.MilestoneId.HasValue && !(await _repository.GetMilestonesAsync(request.ProjectId)).Any(m => m.Id == request.MilestoneId.Value))
            throw new InvalidOperationException("Select a milestone that belongs to this project.");
        if (request.DependsOnTaskId.HasValue || request.DependsOnSubTaskId.HasValue)
        {
            if (userId.HasValue && !await _permissions.IsAdminAsync(userId.Value))
                throw new UnauthorizedAccessException("Only Admin can set a dependency.");
            var existing = await _repository.GetTasksAsync(request.ProjectId);
            ApplyRequestedDependency(existing, "T:new", new SetTaskDependencyRequest
            {
                DependsOnTaskId = request.DependsOnTaskId,
                DependsOnSubTaskId = request.DependsOnSubTaskId
            }, 0, null);
        }
        var task = await _repository.AddTaskAsync(new ProjectTask
        {
            ProjectId = request.ProjectId,
            MilestoneId = request.MilestoneId,
            DependsOnTaskId = request.DependsOnTaskId,
            DependsOnSubTaskId = request.DependsOnSubTaskId,
            Title = request.Title,
            Description = request.Description,
            CompletionEvidence = request.CompletionEvidence,
            AssignedTo = request.AssignedTo ?? userId,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            Remarks = request.Remarks,
            Status = NormalizeMilestoneStatus(request.Status),
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", "Task", task.Id);
        return task;
    }

    public async Task<ProjectTask> UpdateTaskAsync(long taskId, CreateTaskRequest request, long userId)
    {
        var task = await _repository.GetTaskAsync(taskId) ?? throw new InvalidOperationException("Task not found.");
        if (task.ProjectId != request.ProjectId) throw new InvalidOperationException("Task project cannot be changed.");
        await _permissions.EnsureModuleAsync(userId, task.ProjectId, "Tasks", "edit");
        if (string.IsNullOrWhiteSpace(request.Title)) throw new InvalidOperationException("Task title is required.");
        if (request.StartDate.HasValue && request.DueDate.HasValue && request.StartDate.Value > request.DueDate.Value)
            throw new InvalidOperationException("Task start date must be on or before its due date.");
        if (request.MilestoneId.HasValue && !(await _repository.GetMilestonesAsync(task.ProjectId)).Any(m => m.Id == request.MilestoneId.Value))
            throw new InvalidOperationException("Select a milestone that belongs to this project.");
        var isAdmin = await _permissions.IsAdminAsync(userId);
        if (!isAdmin && (request.DependsOnTaskId.HasValue || request.DependsOnSubTaskId.HasValue))
            throw new UnauthorizedAccessException("Only Admin can set a dependency.");
        if (isAdmin)
            ApplyRequestedDependency(await _repository.GetTasksAsync(task.ProjectId), "T:" + task.Id, new SetTaskDependencyRequest
            {
                DependsOnTaskId = request.DependsOnTaskId,
                DependsOnSubTaskId = request.DependsOnSubTaskId
            }, task.Id, null);

        task.Title = request.Title.Trim();
        task.Description = request.Description;
        task.CompletionEvidence = request.CompletionEvidence;
        task.AssignedTo = request.AssignedTo;
        task.MilestoneId = request.MilestoneId;
        task.StartDate = request.StartDate;
        task.DueDate = request.DueDate;
        task.Status = NormalizeMilestoneStatus(request.Status);
        if (isAdmin)
        {
            task.DependsOnTaskId = request.DependsOnSubTaskId.HasValue ? null : request.DependsOnTaskId;
            task.DependsOnSubTaskId = request.DependsOnSubTaskId;
        }
        task.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateTaskAsync(task);
        await _audit.LogAsync(userId, "Update", "Task", task.Id);
        return task;
    }

    public async Task<SubTaskItemDto> CreateSubTaskAsync(CreateSubTaskRequest request, long? userId)
    {
        var parent = await _repository.GetTaskAsync(request.TaskId)
            ?? throw new InvalidOperationException("Parent task not found.");
        if (userId.HasValue) await _permissions.EnsureModuleAsync(userId.Value, parent.ProjectId, "Tasks", "edit");
        SubTask? nestParent = null;
        if (request.ParentSubTaskId.HasValue)
        {
            nestParent = (parent.SubTasks ?? Array.Empty<SubTask>())
                .FirstOrDefault(s => s.Id == request.ParentSubTaskId.Value)
                ?? throw new InvalidOperationException("Parent sub-task not found under this task.");
        }
        var status = string.IsNullOrWhiteSpace(request.Status)
            ? "NotStarted"
            : request.Status.Replace(" ", "");
        if (LooksStarted(status, 0))
        {
            var allForStart = await _repository.GetTasksAsync(parent.ProjectId);
            var (blocked, reason) = EvaluateSubBlock(allForStart, parent, new SubTask
            {
                TaskId = parent.Id,
                ParentSubTaskId = nestParent?.Id,
                DependsOnTaskId = request.DependsOnTaskId,
                DependsOnSubTaskId = request.DependsOnSubTaskId,
                Status = "NotStarted",
                CompletionPercent = 0
            });
            if (blocked)
                throw new InvalidOperationException(reason ?? "This item is waiting on a dependency and cannot be started.");
        }
        var sub = await _repository.AddSubTaskAsync(new SubTask
        {
            TaskId = request.TaskId,
            ParentSubTaskId = nestParent?.Id,
            DependsOnTaskId = request.DependsOnTaskId,
            DependsOnSubTaskId = request.DependsOnSubTaskId,
            Title = request.Title,
            AssignedTo = request.AssignedTo ?? parent.AssignedTo ?? userId,
            DueDate = request.DueDate,
            Remarks = request.Remarks,
            Status = status,
            CreatedAt = DateTime.UtcNow
        });
        await _audit.LogAsync(userId, "Create", nestParent == null ? "SubTask" : "ChildTask", sub.Id);
        var projectTasks = await _repository.GetTasksAsync(parent.ProjectId);
        var taskNo = projectTasks.OrderBy(t => t.Id).Select((t, i) => (t.Id, No: i + 1)).First(x => x.Id == parent.Id).No;
        var siblings = (projectTasks.First(t => t.Id == parent.Id).SubTasks ?? Array.Empty<SubTask>())
            .Where(s => s.ParentSubTaskId == nestParent?.Id)
            .OrderBy(s => s.Id)
            .ToList();
        var depth = 1;
        var ancestor = nestParent;
        var allSubs = (projectTasks.First(t => t.Id == parent.Id).SubTasks ?? Array.Empty<SubTask>()).ToList();
        while (ancestor != null)
        {
            depth++;
            ancestor = allSubs.FirstOrDefault(s => s.Id == ancestor.ParentSubTaskId);
        }
        var subNo = siblings.Select((s, i) => (s.Id, No: i + 1)).First(x => x.Id == sub.Id).No;
        var dto = MapSubTask(sub, userId ?? 0, false, false, false, false, parent.AssignedTo);
        dto.DisplayCode = $"Task-{taskNo}-{NestLabel(depth)}-{subNo}";
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

        var isAdmin = userId.HasValue && await _permissions.IsAdminAsync(userId.Value);
        SubTask? sub = null;
        if (request.SubTaskId.HasValue)
            sub = task.SubTasks.FirstOrDefault(s => s.Id == request.SubTaskId)
                ?? throw new InvalidOperationException("Sub-task does not belong to the selected task.");

        if (request.CompletionPercent.HasValue && (request.CompletionPercent.Value < 0 || request.CompletionPercent.Value > 100))
            throw new InvalidOperationException("Completion must be between 0 and 100 percent.");
        var canChangePercent = isAdmin || task.AssignedTo == userId || (sub != null && sub.AssignedTo == userId);
        var canSubmitUpdate = isAdmin || (userId.HasValue && await _permissions.CanUpdateModuleAsync(userId.Value, task.ProjectId, "Tasks"))
            || task.AssignedTo == userId || (sub != null && sub.AssignedTo == userId);
        if (!canSubmitUpdate)
            throw new UnauthorizedAccessException("You need Tasks update permission or task ownership to submit an update.");
        if (request.CompletionPercent.HasValue && !canChangePercent)
            throw new UnauthorizedAccessException("Only the task owner can change completion percentage.");

        var projectTasks = await _repository.GetTasksAsync(task.ProjectId);
        if (sub != null)
            EnsureCanStart(projectTasks, task, sub, request.Status, request.CompletionPercent);
        else
            EnsureCanStart(projectTasks, task, null, request.Status, request.CompletionPercent);

        if (sub != null)
        {
            if (request.CompletionPercent.HasValue) sub.CompletionPercent = request.CompletionPercent.Value;
            if (!string.IsNullOrWhiteSpace(request.Status)) sub.Status = request.Status;
            if (!string.IsNullOrWhiteSpace(request.Remarks)) sub.Remarks = request.Remarks;
            if (task.SubTasks.Count > 0)
                task.CompletionPercent = task.SubTasks.Average(s => s.CompletionPercent);
        }
        else if (request.CompletionPercent.HasValue && canChangePercent)
        {
            task.CompletionPercent = request.CompletionPercent.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && request.SubTaskId == null)
            task.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Remarks))
            task.Remarks = request.Remarks;
        if (!string.IsNullOrWhiteSpace(request.CompletionEvidence))
            task.CompletionEvidence = request.CompletionEvidence.Trim();
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

    public async Task<List<ExceptionItemDto>> GetExceptionsAsync(long projectId, long userId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Tasks")) return new();
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

    public async Task<DailySiteReportDto> GetDailyReportAsync(long projectId, DateOnly? date, long userId)
    {
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Tasks"))
            throw new UnauthorizedAccessException("You cannot view task reports for this project.");
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
                SubTaskId = u.SubTaskId,
                Title = tasks.FirstOrDefault(t => t.Id == u.TaskId)?.Title ?? $"Task {u.TaskId}",
                SubTaskTitle = u.SubTaskId.HasValue
                    ? tasks.FirstOrDefault(t => t.Id == u.TaskId)?.SubTasks.FirstOrDefault(s => s.Id == u.SubTaskId)?.Title
                    : null,
                CompletionPercent = u.CompletionPercent ?? 0,
                Status = u.Status ?? "",
                Remarks = u.Remarks
            }).ToList()
        };
    }

    public async Task SetTaskDependencyAsync(long taskId, SetTaskDependencyRequest request, long userId)
    {
        if (!await _permissions.IsAdminAsync(userId))
            throw new UnauthorizedAccessException("Only Admin can depend or undepend a task.");
        var task = await _repository.GetTaskAsync(taskId) ?? throw new InvalidOperationException("Task not found");
        var all = await _repository.GetTasksAsync(task.ProjectId);
        ApplyRequestedDependency(all, "T:" + task.Id, request, task.Id, null);
        task.DependsOnTaskId = request.DependsOnSubTaskId.HasValue ? null : request.DependsOnTaskId;
        task.DependsOnSubTaskId = request.DependsOnSubTaskId;
        await _repository.UpdateTaskAsync(task);
        await _audit.LogAsync(userId, request.DependsOnTaskId == null && request.DependsOnSubTaskId == null ? "Undepend" : "Depend", "Task", task.Id);
    }

    public async Task SetSubTaskDependencyAsync(long subTaskId, SetTaskDependencyRequest request, long userId)
    {
        if (!await _permissions.IsAdminAsync(userId))
            throw new UnauthorizedAccessException("Only Admin can depend or undepend a task.");
        var sub = await _repository.GetSubTaskAsync(subTaskId) ?? throw new InvalidOperationException("Sub-task not found");
        var parent = sub.Task ?? await _repository.GetTaskAsync(sub.TaskId)
            ?? throw new InvalidOperationException("Parent task not found");
        var all = await _repository.GetTasksAsync(parent.ProjectId);
        ApplyRequestedDependency(all, "S:" + sub.Id, request, parent.Id, sub.Id);
        sub.DependsOnTaskId = request.DependsOnSubTaskId.HasValue ? null : request.DependsOnTaskId;
        sub.DependsOnSubTaskId = request.DependsOnSubTaskId;
        await _repository.UpdateSubTaskAsync(sub);
        await _audit.LogAsync(userId, request.DependsOnTaskId == null && request.DependsOnSubTaskId == null ? "Undepend" : "Depend", "SubTask", sub.Id);
    }

    private static bool LooksComplete(string? status, decimal pct)
    {
        if (pct >= 100) return true;
        var s = (status ?? "").Replace(" ", "", StringComparison.Ordinal);
        return s.Contains("Complete", StringComparison.OrdinalIgnoreCase);
    }

    private static bool LooksStarted(string? status, decimal? pct)
    {
        if (pct.HasValue && pct.Value > 0) return true;
        if (string.IsNullOrWhiteSpace(status)) return false;
        var s = status.Replace(" ", "", StringComparison.Ordinal);
        return !s.Equals("NotStarted", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsIdle(string? status, decimal pct) =>
        !LooksStarted(status, pct) && pct <= 0;

    private static string LabelOfTask(IEnumerable<ProjectTask> all, long id)
    {
        var t = all.FirstOrDefault(x => x.Id == id);
        return t == null ? $"Task #{id}" : $"“{t.Title}”";
    }

    private static string LabelOfSub(IEnumerable<ProjectTask> all, long id)
    {
        foreach (var t in all)
        {
            var s = (t.SubTasks ?? Array.Empty<SubTask>()).FirstOrDefault(x => x.Id == id);
            if (s != null) return $"“{s.Title}” (under {t.Title})";
        }
        return $"Sub-task #{id}";
    }

    private static (bool blocked, string? reason, string? label) OwnWait(IEnumerable<ProjectTask> all, long? depTaskId, long? depSubId)
    {
        if (depSubId.HasValue)
        {
            var label = LabelOfSub(all, depSubId.Value);
            var host = all.SelectMany(t => (t.SubTasks ?? Array.Empty<SubTask>()).Select(s => (t, s)))
                .FirstOrDefault(x => x.s.Id == depSubId.Value);
            var done = host.s != null && LooksComplete(host.s.Status, host.s.CompletionPercent);
            return done ? (false, null, label) : (true, $"Waiting for {label} to finish — this task cannot start until then.", label);
        }
        if (depTaskId.HasValue)
        {
            var label = LabelOfTask(all, depTaskId.Value);
            var t = all.FirstOrDefault(x => x.Id == depTaskId.Value);
            var done = t != null && LooksComplete(t.Status, t.CompletionPercent);
            return done ? (false, null, label) : (true, $"Waiting for {label} to finish — this task cannot start until then.", label);
        }
        return (false, null, null);
    }

    private static (bool blocked, string? reason) EvaluateTaskBlock(IReadOnlyList<ProjectTask> all, ProjectTask task)
    {
        var own = OwnWait(all, task.DependsOnTaskId, task.DependsOnSubTaskId);
        return (own.blocked, own.reason);
    }

    private static (bool blocked, string? reason) EvaluateSubBlock(IReadOnlyList<ProjectTask> all, ProjectTask parent, SubTask sub)
    {
        var own = OwnWait(all, sub.DependsOnTaskId, sub.DependsOnSubTaskId);
        if (own.blocked) return (true, own.reason);
        var parentBlock = EvaluateTaskBlock(all, parent);
        if (parentBlock.blocked)
            return (true, parentBlock.reason);
        if (sub.ParentSubTaskId is long pid)
        {
            var ancestor = (parent.SubTasks ?? Array.Empty<SubTask>()).FirstOrDefault(s => s.Id == pid);
            if (ancestor != null)
            {
                var up = EvaluateSubBlock(all, parent, ancestor);
                if (up.blocked) return up;
            }
        }
        return (false, null);
    }

    private static void EnsureCanStart(IReadOnlyList<ProjectTask> all, ProjectTask task, SubTask? sub, string? newStatus, decimal? newPct)
    {
        var curStatus = sub?.Status ?? task.Status;
        var curPct = sub?.CompletionPercent ?? task.CompletionPercent;
        if (!IsIdle(curStatus, curPct)) return;
        if (!LooksStarted(newStatus, newPct)) return;
        var (blocked, reason) = sub == null
            ? EvaluateTaskBlock(all, task)
            : EvaluateSubBlock(all, task, sub);
        if (blocked)
            throw new InvalidOperationException(reason ?? "Cannot start until the dependency is finished.");
    }

    private static void ApplyDependencyFlags(List<ProjectTask> entities, List<TaskItemDto> dtos)
    {
        var byId = dtos.ToDictionary(d => d.Id);
        foreach (var t in entities)
        {
            if (!byId.TryGetValue(t.Id, out var dto)) continue;
            var own = OwnWait(entities, t.DependsOnTaskId, t.DependsOnSubTaskId);
            dto.DependsOnLabel = own.label;
            dto.IsBlocked = own.blocked;
            dto.BlockedReason = own.reason;
            StampSubFlags(entities, t, dto.SubTasks, dto.IsBlocked, dto.BlockedReason);
        }
    }

    private static void StampSubFlags(List<ProjectTask> all, ProjectTask parent, List<SubTaskItemDto> nodes, bool parentBlocked, string? parentReason)
    {
        foreach (var dto in nodes)
        {
            var entity = (parent.SubTasks ?? Array.Empty<SubTask>()).FirstOrDefault(s => s.Id == dto.Id);
            var own = entity == null ? (false, (string?)null, (string?)null) : OwnWait(all, entity.DependsOnTaskId, entity.DependsOnSubTaskId);
            dto.DependsOnLabel = own.Item3;
            dto.IsBlocked = own.Item1 || parentBlocked;
            dto.BlockedReason = own.Item1 ? own.Item2 : (parentBlocked ? parentReason : null);
            StampSubFlags(all, parent, dto.Children, dto.IsBlocked, dto.BlockedReason);
        }
    }

    private static void ApplyRequestedDependency(
        IReadOnlyList<ProjectTask> all,
        string fromKey,
        SetTaskDependencyRequest request,
        long ownerTaskId,
        long? ownerSubId)
    {
        if (request.DependsOnTaskId == null && request.DependsOnSubTaskId == null) return;
        if (request.DependsOnSubTaskId.HasValue)
        {
            var hit = all.SelectMany(t => (t.SubTasks ?? Array.Empty<SubTask>()).Select(s => (t, s)))
                .FirstOrDefault(x => x.s.Id == request.DependsOnSubTaskId.Value);
            if (hit.s == null) throw new InvalidOperationException("Dependency sub-task not found in this project.");
            if (ownerSubId == request.DependsOnSubTaskId) throw new InvalidOperationException("A task cannot depend on itself.");
            if (hit.t.Id == ownerTaskId && ownerSubId == null)
                throw new InvalidOperationException("A task cannot depend on its own sub-task (that would deadlock).");
            if (ownerSubId.HasValue && IsSubAncestor(all, ownerTaskId, ownerSubId.Value, request.DependsOnSubTaskId.Value))
                throw new InvalidOperationException("Cannot depend on a child item under this task (deadlock).");
            if (WouldCycle(all, fromKey, "S:" + request.DependsOnSubTaskId.Value))
                throw new InvalidOperationException("That dependency would create a cycle.");
            return;
        }
        if (request.DependsOnTaskId.HasValue)
        {
            var t = all.FirstOrDefault(x => x.Id == request.DependsOnTaskId.Value)
                ?? throw new InvalidOperationException("Dependency task not found in this project.");
            if (ownerSubId == null && t.Id == ownerTaskId)
                throw new InvalidOperationException("A task cannot depend on itself.");
            if (ownerSubId.HasValue && t.Id == ownerTaskId)
                throw new InvalidOperationException("A sub-task cannot depend on its parent task (it already waits if the parent is blocked).");
            if (WouldCycle(all, fromKey, "T:" + request.DependsOnTaskId.Value))
                throw new InvalidOperationException("That dependency would create a cycle.");
        }
    }

    private static bool IsSubAncestor(IReadOnlyList<ProjectTask> all, long taskId, long subId, long maybeChildId)
    {
        var subs = all.FirstOrDefault(t => t.Id == taskId)?.SubTasks ?? Array.Empty<SubTask>();
        long? cursor = maybeChildId;
        var guard = 0;
        while (cursor.HasValue && guard++ < 50)
        {
            if (cursor.Value == subId) return true;
            cursor = subs.FirstOrDefault(s => s.Id == cursor.Value)?.ParentSubTaskId;
        }
        return false;
    }

    private static bool WouldCycle(IReadOnlyList<ProjectTask> all, string fromKey, string toKey)
    {
        var waits = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var t in all)
        {
            var tk = "T:" + t.Id;
            if (t.DependsOnSubTaskId.HasValue) waits[tk] = "S:" + t.DependsOnSubTaskId.Value;
            else if (t.DependsOnTaskId.HasValue) waits[tk] = "T:" + t.DependsOnTaskId.Value;
            foreach (var s in t.SubTasks ?? Array.Empty<SubTask>())
            {
                var sk = "S:" + s.Id;
                if (s.DependsOnSubTaskId.HasValue) waits[sk] = "S:" + s.DependsOnSubTaskId.Value;
                else if (s.DependsOnTaskId.HasValue) waits[sk] = "T:" + s.DependsOnTaskId.Value;
            }
        }
        waits[fromKey] = toKey;
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var cur = toKey;
        var hops = 0;
        while (cur != null && hops++ < 80)
        {
            if (cur == fromKey) return true;
            if (!seen.Add(cur)) break;
            if (!waits.TryGetValue(cur, out cur)) break;
        }
        return false;
    }
}
