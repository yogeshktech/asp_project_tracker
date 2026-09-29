using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.DatabaseLayer.Reports;

public interface IReportRepository
{
    Task<Report> AddAsync(Report report, IEnumerable<string> emails);
    Task<List<Report>> GetAllAsync();
    Task<List<Report>> GetByUserAsync(long userId);
    Task<Report?> GetAsync(long reportId);
    Task<List<string>> GetInternalUserEmailsAsync(IEnumerable<long> userIds);
    Task<List<string>> GetProjectInternalUserEmailsAsync(long projectId, IEnumerable<long> userIds);
    Task<int> CountProjectsAsync(IEnumerable<long>? projectIds = null);
    Task<int> CountOpenIssuesAsync(IEnumerable<long>? projectIds = null);
    Task<int> CountOverdueTasksAsync(IEnumerable<long>? projectIds = null);
    Task<decimal> SumApprovedBudgetAsync(IEnumerable<long>? projectIds = null);
    Task<decimal> SumActualCostAsync(IEnumerable<long>? projectIds = null);
    Task<List<Project>> RecentProjectsAsync(int take, IEnumerable<long>? projectIds = null);
    Task<PortfolioReportDto> GetPortfolioReportAsync(IEnumerable<long> projectIds);
    Task<DailySiteReportDto> GetDailySiteReportAsync(long projectId, DateOnly date, bool cumulative = false);
    Task<List<Boq>> GetBoqsForReportAsync(long projectId);
    Task<List<ComparableProjectDto>> GetComparableProjectsAsync(ReportFilterDto filter, IEnumerable<long> allowedProjectIds);
    Task<List<ExceptionItemDto>> GetExceptionsAsync(IEnumerable<long> projectIds);
}

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _db;
    public ReportRepository(AppDbContext db) => _db = db;

    public async Task<Report> AddAsync(Report report, IEnumerable<string> emails)
    {
        _db.Reports.Add(report);
        await _db.SaveChangesAsync();
        foreach (var email in emails.Where(e => !string.IsNullOrWhiteSpace(e)))
            _db.ReportRecipients.Add(new ReportRecipient { ReportId = report.Id, Email = email });
        await _db.SaveChangesAsync();
        return report;
    }

    public Task<List<Report>> GetAllAsync() =>
        _db.Reports.Include(r => r.Recipients).AsNoTracking().ToListAsync();

    public Task<List<Report>> GetByUserAsync(long userId) =>
        _db.Reports.Include(r => r.Recipients).Where(r => r.CreatedBy == userId).AsNoTracking().ToListAsync();

    public Task<Report?> GetAsync(long reportId) =>
        _db.Reports.Include(r => r.Recipients).AsNoTracking().FirstOrDefaultAsync(r => r.Id == reportId);

    public Task<List<string>> GetInternalUserEmailsAsync(IEnumerable<long> userIds) =>
        _db.Users.Where(u => userIds.Contains(u.Id) && u.IsInternal).Select(u => u.Email).ToListAsync();

    public Task<List<string>> GetProjectInternalUserEmailsAsync(long projectId, IEnumerable<long> userIds)
    {
        var ids = userIds.Distinct().ToList();
        return _db.Users.Where(u => ids.Contains(u.Id) && u.IsInternal
            && (_db.ProjectUsers.Any(pu => pu.ProjectId == projectId && pu.UserId == u.Id)
                || _db.Projects.Any(p => p.Id == projectId && p.OwnerId == u.Id)))
            .Select(u => u.Email).ToListAsync();
    }

    public Task<int> CountProjectsAsync(IEnumerable<long>? projectIds = null)
    {
        var q = _db.Projects.AsQueryable();
        if (projectIds != null) q = q.Where(p => projectIds.Contains(p.Id));
        return q.CountAsync();
    }

    public Task<int> CountOpenIssuesAsync(IEnumerable<long>? projectIds = null)
    {
        var q = _db.Issues.Where(i => i.Status == "Open");
        if (projectIds != null) q = q.Where(i => projectIds.Contains(i.ProjectId));
        return q.CountAsync();
    }

    public Task<int> CountOverdueTasksAsync(IEnumerable<long>? projectIds = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var q = _db.Tasks.Where(t => t.DueDate != null && t.DueDate < today && t.Status != "Completed");
        if (projectIds != null) q = q.Where(t => projectIds.Contains(t.ProjectId));
        return q.CountAsync();
    }

    public Task<decimal> SumApprovedBudgetAsync(IEnumerable<long>? projectIds = null)
    {
        var q = _db.Budgets.AsQueryable();
        if (projectIds != null) q = q.Where(b => projectIds.Contains(b.ProjectId));
        return q.SumAsync(b => b.ApprovedAmount);
    }

    public Task<decimal> SumActualCostAsync(IEnumerable<long>? projectIds = null)
    {
        var q = _db.ActualCosts.AsQueryable();
        if (projectIds != null) q = q.Where(c => projectIds.Contains(c.ProjectId));
        return q.SumAsync(c => c.Amount);
    }

    public Task<List<Project>> RecentProjectsAsync(int take, IEnumerable<long>? projectIds = null)
    {
        var q = _db.Projects.Include(p => p.Resort).AsQueryable();
        if (projectIds != null) q = q.Where(p => projectIds.Contains(p.Id));
        return q.OrderByDescending(p => p.CreatedAt).Take(take).AsNoTracking().ToListAsync();
    }

    public async Task<PortfolioReportDto> GetPortfolioReportAsync(IEnumerable<long> allowedProjectIds)
    {
        var projectIds = allowedProjectIds.Distinct().ToList();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var projects = await _db.Projects.Where(p => projectIds.Contains(p.Id)).AsNoTracking().ToListAsync();
        var rows = new List<ProjectStatusRowDto>();

        foreach (var p in projects)
        {
            var nextMilestone = await _db.Milestones
                .Where(m => m.ProjectId == p.Id && m.Status != "Completed")
                .OrderBy(m => m.DueDate)
                .Select(m => new { m.Name, m.DueDate })
                .FirstOrDefaultAsync();

            var overdueTasks = await _db.Tasks.CountAsync(t => t.ProjectId == p.Id && t.DueDate < today && t.Status != "Completed");
            var overdueMilestones = await _db.Milestones.CountAsync(m => m.ProjectId == p.Id && m.DueDate < today && m.Status != "Completed");
            var dueSoonTasks = await _db.Tasks.CountAsync(t => t.ProjectId == p.Id && t.DueDate >= today && t.DueDate <= today.AddDays(7) && t.Status != "Completed");
            var dueSoonMilestones = await _db.Milestones.CountAsync(m => m.ProjectId == p.Id && m.DueDate >= today && m.DueDate <= today.AddDays(7) && m.Status != "Completed");
            var budget = await _db.Budgets.Where(b => b.ProjectId == p.Id).SumAsync(b => b.ApprovedAmount);
            var purchases = await _db.PurchaseCosts.Where(c => c.ProjectId == p.Id).SumAsync(c => c.Amount);
            var actual = await _db.ActualCosts.Where(c => c.ProjectId == p.Id).SumAsync(c => c.Amount);
            var unresolvedIssues = await _db.Issues.CountAsync(i => i.ProjectId == p.Id && i.Status != "Closed" && i.Status != "Resolved");
            var unresolved = unresolvedIssues + overdueTasks + overdueMilestones;
            var varianceExplanations = await _db.VarianceExplanations.Where(v => v.ProjectId == p.Id).AsNoTracking()
                .Select(v => new VarianceExplanationDto { VarianceType = v.VarianceType, Explanation = v.Explanation, CreatedAt = v.CreatedAt })
                .ToListAsync();
            var forecast = purchases + actual;
            var rag = budget == 0 ? "Unbudgeted" : forecast / budget * 100 >= 100 ? "Red" : forecast / budget * 100 >= 80 ? "Amber" : "Green";

            rows.Add(new ProjectStatusRowDto
            {
                ProjectId = p.Id,
                Name = p.Name,
                Status = p.Status,
                OwnerName = p.OwnerId.HasValue ? await _db.Users.Where(u => u.Id == p.OwnerId.Value).Select(u => u.FullName).FirstOrDefaultAsync() : null,
                NextMilestone = nextMilestone?.Name,
                NextMilestoneDueDate = nextMilestone?.DueDate,
                ScheduleRisk = overdueTasks + overdueMilestones > 0 ? "High" : dueSoonTasks + dueSoonMilestones > 0 ? "Medium" : "Low",
                BudgetRag = rag,
                ApprovedBudget = budget,
                PurchaseCommitment = purchases,
                ActualCost = actual,
                UnresolvedExceptions = unresolved,
                OpenIssues = unresolvedIssues,
                ProgressPercent = await _db.Tasks.Where(t => t.ProjectId == p.Id).Select(t => (decimal?)t.CompletionPercent).AverageAsync() ?? 0,
                VarianceExplanations = varianceExplanations
            });
        }

        return new PortfolioReportDto { Projects = rows };
    }

    public async Task<DailySiteReportDto> GetDailySiteReportAsync(long projectId, DateOnly date, bool cumulative = false)
    {
        var tasks = await _db.Tasks.Where(t => t.ProjectId == projectId).AsNoTracking().ToListAsync();
        var updateQuery = _db.TaskUpdates.Include(u => u.Task).ThenInclude(t => t.SubTasks)
            .Where(u => u.Task.ProjectId == projectId && (cumulative ? u.UpdateDate <= date : u.UpdateDate == date));
        var history = await updateQuery
            .AsNoTracking()
            .ToListAsync();
        var updates = history
            .GroupBy(u => new { u.TaskId, u.SubTaskId })
            .Select(g =>
            {
                var latest = g.OrderByDescending(u => u.UpdateDate).ThenByDescending(u => u.CreatedAt).First();
                latest.CompletionPercent = g.Where(u => u.CompletionPercent.HasValue)
                    .OrderByDescending(u => u.UpdateDate).ThenByDescending(u => u.CreatedAt)
                    .Select(u => u.CompletionPercent).FirstOrDefault();
                return latest;
            })
            .OrderBy(u => u.TaskId).ThenBy(u => u.SubTaskId)
            .ToList();

        return new DailySiteReportDto
        {
            ProjectId = projectId,
            ReportDate = date,
            OverallCompletionPercent = updates.Count == 0 ? 0 : updates.Where(u => u.CompletionPercent.HasValue).Select(u => u.CompletionPercent!.Value).DefaultIfEmpty(0).Average(),
            TaskUpdates = updates.Select(u => new TaskDailyStatusDto
            {
                TaskId = u.TaskId,
                SubTaskId = u.SubTaskId,
                Title = tasks.FirstOrDefault(t => t.Id == u.TaskId)?.Title ?? "",
                SubTaskTitle = u.SubTaskId.HasValue ? u.Task.SubTasks.FirstOrDefault(s => s.Id == u.SubTaskId)?.Title : null,
                CompletionPercent = u.CompletionPercent ?? 0,
                Status = u.Status ?? "",
                Remarks = u.Remarks
            }).ToList()
        };
    }

    public async Task<List<ComparableProjectDto>> GetComparableProjectsAsync(ReportFilterDto filter, IEnumerable<long> allowedProjectIds)
    {
        var allowed = allowedProjectIds.Distinct().ToList();
        if (allowed.Count == 0) return new();
        var q = _db.Projects.Include(p => p.ProjectType)
            .Where(p => p.Status == "Closed" && allowed.Contains(p.Id));
        if (filter.ProjectId.HasValue) q = q.Where(p => p.Id != filter.ProjectId.Value);
        if (!string.IsNullOrWhiteSpace(filter.Client))
        {
            var client = $"%{filter.Client.Trim()}%";
            q = q.Where(p => p.ClientName != null && EF.Functions.ILike(p.ClientName, client));
        }
        if (!string.IsNullOrWhiteSpace(filter.ProjectType))
            q = q.Where(p => p.ProjectType != null && p.ProjectType.Name == filter.ProjectType.Trim());
        if (!string.IsNullOrWhiteSpace(filter.Scope))
        {
            var scope = $"%{filter.Scope.Trim()}%";
            q = q.Where(p => (p.Description != null && EF.Functions.ILike(p.Description, scope))
                || (p.ProfileNotes != null && EF.Functions.ILike(p.ProfileNotes, scope)));
        }
        if (filter.FromDate.HasValue) q = q.Where(p => p.EndDate.HasValue && p.EndDate.Value >= filter.FromDate.Value);
        if (filter.ToDate.HasValue) q = q.Where(p => p.EndDate.HasValue && p.EndDate.Value <= filter.ToDate.Value);

        var projects = await q.OrderByDescending(p => p.EndDate).Take(100).AsNoTracking().ToListAsync();
        var comparableRows = new List<(Project Project, bool IsReference)>();
        if (filter.ProjectId.HasValue && allowed.Contains(filter.ProjectId.Value))
        {
            var reference = await _db.Projects.Include(p => p.ProjectType).AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == filter.ProjectId.Value);
            if (reference != null) comparableRows.Add((reference, true));
        }
        comparableRows.AddRange(projects.Select(p => (p, false)));
        var result = new List<ComparableProjectDto>();

        foreach (var (p, isReference) in comparableRows)
        {
            var projectIds = await _db.Projects.Where(c => c.ParentProjectId == p.Id).Select(c => c.Id).ToListAsync();
            projectIds.Add(p.Id);
            var approved = await _db.Budgets.Where(b => projectIds.Contains(b.ProjectId)).SumAsync(b => b.ApprovedAmount);
            var purchases = await _db.PurchaseCosts.Where(c => projectIds.Contains(c.ProjectId)).SumAsync(c => c.Amount);
            var actuals = await _db.ActualCosts.Where(c => projectIds.Contains(c.ProjectId)).SumAsync(c => c.Amount);
            var varianceExplanations = await _db.VarianceExplanations.Where(v => projectIds.Contains(v.ProjectId)).AsNoTracking()
                .Select(v => new VarianceExplanationDto { VarianceType = v.VarianceType, Explanation = v.Explanation, CreatedAt = v.CreatedAt })
                .ToListAsync();
            result.Add(new ComparableProjectDto
            {
                ProjectId = p.Id,
                Name = p.Name,
                ProjectType = p.ProjectType?.Name,
                Client = p.ClientName,
                Scope = p.Description ?? p.ProfileNotes,
                IsReferenceProject = isReference,
                Currency = p.Currency,
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                ApprovedBudget = approved,
                PurchaseCost = purchases,
                ActualCost = actuals,
                TotalCost = purchases + actuals,
                VarianceExplanations = varianceExplanations,
                DurationDays = p.StartDate.HasValue && p.EndDate.HasValue
                    ? p.EndDate.Value.DayNumber - p.StartDate.Value.DayNumber
                    : null
            });
        }
        return result;
    }

    public async Task<List<ExceptionItemDto>> GetExceptionsAsync(IEnumerable<long> projectIds)
    {
        var ids = projectIds.Distinct().ToList();
        if (ids.Count == 0) return new();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var inactiveSince = DateTime.UtcNow.AddDays(-7);
        var atRiskUntil = today.AddDays(7);
        var list = new List<ExceptionItemDto>();

        var tasks = await _db.Tasks.Include(t => t.Project)
            .Where(t => ids.Contains(t.ProjectId) && t.Status != "Completed" && t.CompletionPercent < 100)
            .AsNoTracking().ToListAsync();
        var taskIds = tasks.Select(t => t.Id).ToList();
        var latestTaskUpdates = await _db.TaskUpdates
            .Where(u => taskIds.Contains(u.TaskId))
            .GroupBy(u => new { u.TaskId, u.SubTaskId })
            .Select(g => new { g.Key.TaskId, g.Key.SubTaskId, LastUpdate = g.Max(u => u.CreatedAt) })
            .ToListAsync();
        var taskLastUpdates = latestTaskUpdates.Where(u => u.SubTaskId == null)
            .ToDictionary(u => u.TaskId, u => (DateTime?)u.LastUpdate);
        var subTaskLastUpdates = latestTaskUpdates.Where(u => u.SubTaskId != null)
            .ToDictionary(u => u.SubTaskId!.Value, u => (DateTime?)u.LastUpdate);

        void AddTaskException(string type, long id, long projectId, string projectName, string kind, string title, string message) =>
            list.Add(new ExceptionItemDto { Type = type, RelatedId = id, ProjectId = projectId, ProjectName = projectName, ItemKind = kind, Title = title, Message = message });

        foreach (var t in tasks)
        {
            var lastUpdate = taskLastUpdates.GetValueOrDefault(t.Id) ?? t.UpdatedAt ?? t.CreatedAt;
            if (t.DueDate < today)
                AddTaskException("Overdue", t.Id, t.ProjectId, t.Project.Name, "Task", t.Title, "Task is overdue.");
            else if ((t.DueDate.HasValue && t.DueDate.Value <= atRiskUntil)
                || t.Status.Contains("risk", StringComparison.OrdinalIgnoreCase)
                || t.Status.Contains("blocked", StringComparison.OrdinalIgnoreCase))
                AddTaskException("AtRisk", t.Id, t.ProjectId, t.Project.Name, "Task", t.Title, "Task due within 7 days and not complete.");
            if (lastUpdate < inactiveSince)
                AddTaskException("Inactive", t.Id, t.ProjectId, t.Project.Name, "Task", t.Title, "No progress update in the last 7 days.");
            if (t.Status.Contains("critical", StringComparison.OrdinalIgnoreCase))
                AddTaskException("Critical", t.Id, t.ProjectId, t.Project.Name, "Task", t.Title, "Task is marked critical.");
        }

        var activeSubTasks = await _db.SubTasks.Include(s => s.Task).ThenInclude(t => t.Project)
            .Where(s => taskIds.Contains(s.TaskId) && s.Status != "Completed" && s.CompletionPercent < 100)
            .AsNoTracking().ToListAsync();
        foreach (var s in activeSubTasks)
        {
            var lastUpdate = subTaskLastUpdates.GetValueOrDefault(s.Id) ?? s.CreatedAt;
            if (s.DueDate < today)
                AddTaskException("Overdue", s.Id, s.Task.ProjectId, s.Task.Project.Name, "Sub-task", s.Title, "Sub-task is overdue.");
            else if ((s.DueDate.HasValue && s.DueDate.Value <= atRiskUntil)
                || s.Status.Contains("risk", StringComparison.OrdinalIgnoreCase)
                || s.Status.Contains("blocked", StringComparison.OrdinalIgnoreCase))
                AddTaskException("AtRisk", s.Id, s.Task.ProjectId, s.Task.Project.Name, "Sub-task", s.Title, "Sub-task due within 7 days and not complete.");
            if (lastUpdate < inactiveSince)
                AddTaskException("Inactive", s.Id, s.Task.ProjectId, s.Task.Project.Name, "Sub-task", s.Title, "No progress update in the last 7 days.");
            if (s.Status.Contains("critical", StringComparison.OrdinalIgnoreCase))
                AddTaskException("Critical", s.Id, s.Task.ProjectId, s.Task.Project.Name, "Sub-task", s.Title, "Sub-task is marked critical.");
        }

        var criticalIssues = await _db.Issues.Include(i => i.Project).Include(i => i.Priority)
            .Where(i => ids.Contains(i.ProjectId) && i.Status != "Closed" && i.Status != "Resolved"
                && i.Priority != null && (i.Priority.Code == "CRITICAL" || i.Priority.Name == "Critical"))
            .AsNoTracking().ToListAsync();
        foreach (var issue in criticalIssues)
            AddTaskException("Critical", issue.Id, issue.ProjectId, issue.Project.Name, "Issue", issue.Title, "Critical issue is still open.");

        return list.OrderBy(e => e.Type == "Critical" ? 0 : e.Type == "Overdue" ? 1 : e.Type == "AtRisk" ? 2 : 3)
            .ThenBy(e => e.ProjectName).ThenBy(e => e.Title).Take(100).ToList();

    }

    public Task<List<Boq>> GetBoqsForReportAsync(long projectId) =>
        _db.Boqs.Include(b => b.Versions).ThenInclude(v => v.Items)
            .Where(b => b.ProjectId == projectId).AsNoTracking().ToListAsync();
}
