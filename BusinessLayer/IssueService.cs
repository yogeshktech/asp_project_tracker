using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.DatabaseLayer.Issues;
using project_tracker_madhu.DatabaseLayer.Notifications;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.BusinessLayer.Issues;

public interface IIssueService
{
    Task<List<Issue>> GetByProjectAsync(long userId, long projectId);
    Task<Issue?> GetAsync(long userId, long id);
    Task<Issue> CreateAsync(CreateIssueRequest request, long? userId);
    Task AddCommentAsync(long userId, long issueId, string comment);
    Task EscalateHighPriorityAsync(long issueId);
    Task<List<IssuePriority>> GetPrioritiesAsync();
}

public class IssueService : IIssueService
{
    private readonly IIssueRepository _repository;
    private readonly INotificationRepository _notifications;
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;

    public IssueService(IIssueRepository repository, INotificationRepository notifications, AppDbContext db,
        IEmailService email, IPermissionService permissions, IAuditService audit)
    {
        _repository = repository;
        _notifications = notifications;
        _db = db;
        _email = email;
        _permissions = permissions;
        _audit = audit;
    }

    public async Task<List<Issue>> GetByProjectAsync(long userId, long projectId)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return new();
        return await _repository.GetByProjectAsync(projectId);
    }

    public async Task<Issue?> GetAsync(long userId, long id)
    {
        var issue = await _repository.GetAsync(id);
        if (issue == null || !await _permissions.CanViewProjectAsync(userId, issue.ProjectId)) return null;
        return issue;
    }

    public async Task<Issue> CreateAsync(CreateIssueRequest request, long? userId)
    {
        if (userId.HasValue && !await _permissions.CanViewProjectAsync(userId.Value, request.ProjectId))
            throw new UnauthorizedAccessException("No permission to log issues on this project.");

        var issue = await _repository.AddAsync(new Issue
        {
            ProjectId = request.ProjectId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? (request.What ?? "Issue") : request.Title,
            What = request.What,
            Location = request.Location,
            OccurredAt = request.OccurredAt,
            Impact = request.Impact,
            PriorityId = request.PriorityId,
            ReportedBy = userId,
            Status = "Open",
            CreatedAt = DateTime.UtcNow
        });

        var priorities = await _repository.GetPrioritiesAsync();
        var priority = priorities.FirstOrDefault(p => p.Id == request.PriorityId);
        if (priority != null && (priority.Code is "HIGH" or "CRITICAL"))
            await NotifyHighPriorityAsync(issue, priority.Name);

        await _audit.LogAsync(userId, "Create", "Issue", issue.Id);
        return issue;
    }

    public async Task AddCommentAsync(long userId, long issueId, string comment)
    {
        var issue = await _repository.GetAsync(issueId) ?? throw new InvalidOperationException("Issue not found");
        if (!await _permissions.CanViewProjectAsync(userId, issue.ProjectId))
            throw new UnauthorizedAccessException("No permission.");
        await _repository.AddCommentAsync(new IssueComment
        {
            IssueId = issueId,
            UserId = userId,
            Comment = comment,
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task EscalateHighPriorityAsync(long issueId)
    {
        var issue = await _repository.GetAsync(issueId);
        if (issue == null) return;
        issue.IsEscalated = true;
        issue.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(issue);
        await NotifyHighPriorityAsync(issue, issue.Priority?.Name ?? "High");
    }

    public Task<List<IssuePriority>> GetPrioritiesAsync() => _repository.GetPrioritiesAsync();

    private async Task NotifyHighPriorityAsync(Issue issue, string priorityName)
    {
        issue.IsEscalated = true;
        issue.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(issue);

        var stakeholderIds = await _db.ProjectUsers
            .Where(pu => pu.ProjectId == issue.ProjectId &&
                         (pu.TeamRole != null && (pu.TeamRole.Contains("Manager") || pu.TeamRole.Contains("Owner"))))
            .Select(pu => pu.UserId)
            .Distinct()
            .ToListAsync();

        var adminIds = await _db.UserRoles
            .Include(ur => ur.Role)
            .Where(ur => ur.Role.Name == "Admin")
            .Select(ur => ur.UserId)
            .ToListAsync();

        var userIds = stakeholderIds.Union(adminIds).Distinct().ToList();
        if (userIds.Count == 0) return;

        await _notifications.AddAsync(new Notification
        {
            Title = $"High priority issue: {issue.Title}",
            Body = $"Priority: {priorityName}. What: {issue.What}. Location: {issue.Location}",
            Type = "IssueEscalation",
            RelatedType = "Issue",
            RelatedId = issue.Id,
            CreatedAt = DateTime.UtcNow
        }, userIds);

        var emails = await _db.Users.Where(u => userIds.Contains(u.Id) && u.IsInternal).Select(u => u.Email).ToListAsync();
        await _email.SendAsync(emails, $"Wisetrack: High priority issue - {issue.Title}",
            $"Issue '{issue.Title}' reported. Priority: {priorityName}. Impact: {issue.Impact}");
    }
}
