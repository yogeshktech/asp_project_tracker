using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.DatabaseLayer.Notifications;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Notifications;

public interface INotificationService
{
    Task<Notification> SendAsync(CreateNotificationRequest request);
    Task<PagedResponse<InboxNotificationDto>> GetInboxAsync(long userId, int page, int pageSize);
    Task MarkReadAsync(long recipientId);
    Task<EscalationRule> CreateRuleAsync(CreateEscalationRuleRequest request);
    Task<EscalationRule?> SetRuleActiveAsync(long ruleId, bool isActive);
    Task<List<EscalationRule>> GetRulesAsync();
    Task<ScheduledNotificationDto> ScheduleAsync(CreateScheduledNotificationRequest request, long createdBy);
    Task<List<ScheduledNotificationDto>> GetScheduledAsync(long? projectId, long userId);
    Task<bool> CancelScheduledAsync(long id, long userId);
    Task ProcessScheduledAsync();
}

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly IEmailService _email;
    private readonly AppDbContext _db;
    private readonly IPermissionService _permissions;

    public NotificationService(INotificationRepository repository, IEmailService email, AppDbContext db, IPermissionService permissions)
    {
        _repository = repository;
        _email = email;
        _db = db;
        _permissions = permissions;
    }

    public async Task<Notification> SendAsync(CreateNotificationRequest request)
    {
        var notification = await _repository.AddAsync(new Notification
        {
            Title = request.Title,
            Body = request.Body,
            Type = request.Type,
            RelatedType = request.RelatedType,
            RelatedId = request.RelatedId,
            CreatedAt = DateTime.UtcNow
        }, request.UserIds);

        if (request.SendEmail)
        {
            var emails = await _db.Users
                .Where(u => request.UserIds.Contains(u.Id) && u.IsInternal)
                .Select(u => u.Email)
                .ToListAsync();
            await _email.SendAsync(emails, request.Title, request.Body ?? request.Title);
        }

        return notification;
    }

    public async Task<PagedResponse<InboxNotificationDto>> GetInboxAsync(long userId, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var (items, totalCount) = await _repository.GetInboxAsync(userId, page, pageSize);
        return new PagedResponse<InboxNotificationDto>
        {
            Items = items.Select(r => new InboxNotificationDto
            {
                Id = r.Id,
                IsRead = r.IsRead,
                Notification = new InboxNotificationDetailDto
                {
                    Id = r.Notification.Id,
                    Title = r.Notification.Title,
                    Body = r.Notification.Body,
                    Type = r.Notification.Type,
                    RelatedType = r.Notification.RelatedType,
                    RelatedId = r.Notification.RelatedId,
                    CreatedAt = r.Notification.CreatedAt
                }
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }
    public Task MarkReadAsync(long recipientId) => _repository.MarkReadAsync(recipientId);

    public Task<EscalationRule> CreateRuleAsync(CreateEscalationRuleRequest request) =>
        _repository.AddRuleAsync(new EscalationRule
        {
            Name = request.Name,
            TriggerType = request.TriggerType,
            DelayHours = request.DelayHours,
            TargetRoleId = request.TargetRoleId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

    public Task<List<EscalationRule>> GetRulesAsync() => _repository.GetRulesAsync();
    public Task<EscalationRule?> SetRuleActiveAsync(long ruleId, bool isActive) => _repository.SetRuleActiveAsync(ruleId, isActive);

    public async Task<ScheduledNotificationDto> ScheduleAsync(CreateScheduledNotificationRequest request, long createdBy)
    {
        var title = request.Title.Trim();
        var body = request.Body.Trim();
        var relatedType = request.RelatedType.Trim();
        if (string.IsNullOrWhiteSpace(title)) throw new InvalidOperationException("Notification title is required.");
        if (string.IsNullOrWhiteSpace(body)) throw new InvalidOperationException("Notification message is required.");
        if (request.ScheduledAt <= DateTimeOffset.UtcNow) throw new InvalidOperationException("Schedule date and time must be in the future.");

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId)
            ?? throw new InvalidOperationException("Project not found.");
        if (!await _permissions.CanViewProjectAsync(createdBy, project.Id))
            throw new UnauthorizedAccessException("You cannot schedule notifications for this project.");
        var targetName = relatedType.ToLowerInvariant() switch
        {
            "project" when request.RelatedId == project.Id => project.Name,
            "task" => await _db.Tasks.Where(t => t.Id == request.RelatedId && t.ProjectId == project.Id)
                .Select(t => t.Title).FirstOrDefaultAsync() ?? throw new InvalidOperationException("Selected task does not belong to this project."),
            "milestone" => await _db.Milestones.Where(m => m.Id == request.RelatedId && m.ProjectId == project.Id)
                .Select(m => m.Name).FirstOrDefaultAsync() ?? throw new InvalidOperationException("Selected milestone does not belong to this project."),
            _ => throw new InvalidOperationException("Select a project, task, or milestone target.")
        };
        relatedType = char.ToUpperInvariant(relatedType[0]) + relatedType[1..].ToLowerInvariant();

        var userIds = request.UserIds.Distinct().ToList();
        if (userIds.Count == 0) throw new InvalidOperationException("Select at least one notification recipient.");
        var validUsers = await _db.Users.Where(u => userIds.Contains(u.Id) && u.IsActive && u.IsInternal)
            .Select(u => u.Id).ToListAsync();
        if (validUsers.Count != userIds.Count)
            throw new InvalidOperationException("Recipients must be active internal users.");
        foreach (var userId in userIds)
            if (!await _permissions.CanViewProjectAsync(userId, project.Id))
                throw new InvalidOperationException("Recipients must have access to this project.");

        var scheduled = new ScheduledNotification
        {
            ProjectId = project.Id,
            RelatedType = relatedType,
            RelatedId = request.RelatedId,
            Title = title,
            Body = body,
            ScheduledAt = request.ScheduledAt.ToUniversalTime(),
            SendEmail = request.SendEmail,
            Status = "Pending",
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            Recipients = userIds.Select(userId => new ScheduledNotificationRecipient { UserId = userId }).ToList()
        };
        _db.ScheduledNotifications.Add(scheduled);
        await _db.SaveChangesAsync();
        var saved = await _db.ScheduledNotifications.Include(s => s.Recipients).ThenInclude(r => r.User)
            .FirstAsync(s => s.Id == scheduled.Id);
        return MapScheduled(saved, project.Name, targetName);
    }

    public async Task<List<ScheduledNotificationDto>> GetScheduledAsync(long? projectId, long userId)
    {
        var accessibleProjectIds = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var query = _db.ScheduledNotifications.AsNoTracking().Include(s => s.Project)
            .Include(s => s.Recipients).ThenInclude(r => r.User)
            .Where(s => accessibleProjectIds.Contains(s.ProjectId)).AsQueryable();
        if (projectId.HasValue) query = query.Where(s => s.ProjectId == projectId.Value);
        var rows = await query.OrderByDescending(s => s.ScheduledAt).Take(100).ToListAsync();
        var result = new List<ScheduledNotificationDto>(rows.Count);
        foreach (var row in rows)
        {
            var targetName = await GetTargetNameAsync(row.RelatedType, row.RelatedId, row.Project.Name);
            result.Add(MapScheduled(row, row.Project.Name, targetName));
        }
        return result;
    }

    public async Task<bool> CancelScheduledAsync(long id, long userId)
    {
        var row = await _db.ScheduledNotifications.AsNoTracking()
            .Where(s => s.Id == id && s.Status == "Pending")
            .Select(s => new { s.Id, s.ProjectId }).FirstOrDefaultAsync();
        if (row == null) return false;
        if (!await _permissions.CanViewProjectAsync(userId, row.ProjectId))
            throw new UnauthorizedAccessException("You cannot cancel this project notification.");
        var updated = await _db.ScheduledNotifications
            .Where(s => s.Id == row.Id && s.Status == "Pending")
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.Status, "Cancelled"));
        return updated > 0;
    }

    public async Task ProcessScheduledAsync()
    {
        var now = DateTimeOffset.UtcNow;
        await _db.ScheduledNotifications
            .Where(s => s.Status == "Processing" && s.ProcessingAt < now.UtcDateTime.AddMinutes(-15))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.Status, "Pending")
                .SetProperty(s => s.ProcessingAt, (DateTime?)null));

        var dueIds = await _db.ScheduledNotifications.AsNoTracking()
            .Where(s => s.Status == "Pending" && s.ScheduledAt <= now)
            .OrderBy(s => s.ScheduledAt).Select(s => s.Id).Take(100).ToListAsync();

        foreach (var id in dueIds)
        {
            var claimed = await _db.ScheduledNotifications.Where(s => s.Id == id && s.Status == "Pending")
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.Status, "Processing")
                    .SetProperty(s => s.ProcessingAt, DateTime.UtcNow));
            if (claimed == 0) continue;

            var scheduled = await _db.ScheduledNotifications.Include(s => s.Project)
                .Include(s => s.Recipients).ThenInclude(r => r.User)
                .FirstOrDefaultAsync(s => s.Id == id);
            if (scheduled == null) continue;
            try
            {
                await SendAsync(new CreateNotificationRequest
                {
                    Title = scheduled.Title,
                    Body = scheduled.Body,
                    Type = "ScheduledReminder",
                    RelatedType = scheduled.RelatedType,
                    RelatedId = scheduled.RelatedId,
                    UserIds = scheduled.Recipients.Select(r => r.UserId).ToList(),
                    SendEmail = scheduled.SendEmail
                });
                scheduled.Status = "Sent";
                scheduled.SentAt = DateTime.UtcNow;
                scheduled.LastError = null;
            }
            catch (Exception ex)
            {
                scheduled.Status = "Failed";
                scheduled.LastError = ex.Message;
            }
            await _db.SaveChangesAsync();
        }
    }

    private async Task<string> GetTargetNameAsync(string relatedType, long relatedId, string projectName) =>
        relatedType == "Task"
            ? await _db.Tasks.Where(t => t.Id == relatedId).Select(t => t.Title).FirstOrDefaultAsync() ?? projectName
            : relatedType == "Milestone"
                ? await _db.Milestones.Where(m => m.Id == relatedId).Select(m => m.Name).FirstOrDefaultAsync() ?? projectName
                : projectName;

    private static ScheduledNotificationDto MapScheduled(
        ScheduledNotification row, string projectName, string targetName)
    {
        return new ScheduledNotificationDto
        {
            Id = row.Id,
            ProjectId = row.ProjectId,
            ProjectName = projectName,
            RelatedType = row.RelatedType,
            RelatedId = row.RelatedId,
            RelatedName = targetName,
            Title = row.Title,
            Body = row.Body,
            ScheduledAt = row.ScheduledAt,
            SendEmail = row.SendEmail,
            Status = row.Status,
            CreatedAt = row.CreatedAt,
            SentAt = row.SentAt,
            LastError = row.LastError,
            Recipients = row.Recipients.Select(r => new ScheduledNotificationUserDto
            {
                UserId = r.UserId,
                FullName = r.User?.FullName ?? string.Empty,
                Email = r.User?.Email ?? string.Empty
            }).ToList()
        };
    }
}
