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
    Task<List<string>> GetInternalUserEmailsAsync(IEnumerable<long> userIds);
    Task<int> CountProjectsAsync(IEnumerable<long>? projectIds = null);
    Task<int> CountOpenIssuesAsync(IEnumerable<long>? projectIds = null);
    Task<int> CountOverdueTasksAsync(IEnumerable<long>? projectIds = null);
    Task<decimal> SumApprovedBudgetAsync(IEnumerable<long>? projectIds = null);
    Task<decimal> SumActualCostAsync(IEnumerable<long>? projectIds = null);
    Task<List<Project>> RecentProjectsAsync(int take, IEnumerable<long>? projectIds = null);
    Task<PortfolioReportDto> GetPortfolioReportAsync(long userId);
    Task<DailySiteReportDto> GetDailySiteReportAsync(long projectId, DateOnly date);
    Task<List<ComparableProjectDto>> GetComparableProjectsAsync(ReportFilterDto filter);
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

    public Task<List<string>> GetInternalUserEmailsAsync(IEnumerable<long> userIds) =>
        _db.Users.Where(u => userIds.Contains(u.Id) && u.IsInternal).Select(u => u.Email).ToListAsync();

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

    public async Task<PortfolioReportDto> GetPortfolioReportAsync(long userId)
    {
        var projectIds = await _db.ProjectUsers.Where(pu => pu.UserId == userId).Select(pu => pu.ProjectId)
            .Union(_db.Projects.Where(p => p.OwnerId == userId).Select(p => p.Id))
            .Distinct()
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var projects = await _db.Projects.Where(p => projectIds.Contains(p.Id)).AsNoTracking().ToListAsync();
        var rows = new List<ProjectStatusRowDto>();

        foreach (var p in projects)
        {
            var nextMilestone = await _db.Milestones
                .Where(m => m.ProjectId == p.Id && m.Status != "Completed")
                .OrderBy(m => m.DueDate)
                .Select(m => m.Name)
                .FirstOrDefaultAsync();

            var overdue = await _db.Tasks.AnyAsync(t => t.ProjectId == p.Id && t.DueDate < today && t.Status != "Completed");
            var budget = await _db.Budgets.Where(b => b.ProjectId == p.Id).SumAsync(b => b.ApprovedAmount);
            var actual = await _db.ActualCosts.Where(c => c.ProjectId == p.Id).SumAsync(c => c.Amount);
            var rag = budget == 0 ? "Green" : actual / budget * 100 >= 100 ? "Red" : actual / budget * 100 >= 80 ? "Amber" : "Green";

            rows.Add(new ProjectStatusRowDto
            {
                ProjectId = p.Id,
                Name = p.Name,
                Status = p.Status,
                NextMilestone = nextMilestone,
                ScheduleRisk = overdue ? "High" : "Low",
                BudgetRag = rag,
                OpenIssues = await _db.Issues.CountAsync(i => i.ProjectId == p.Id && i.Status == "Open")
            });
        }

        return new PortfolioReportDto { Projects = rows };
    }

    public async Task<DailySiteReportDto> GetDailySiteReportAsync(long projectId, DateOnly date)
    {
        var tasks = await _db.Tasks.Where(t => t.ProjectId == projectId).AsNoTracking().ToListAsync();
        var updates = await _db.TaskUpdates.Include(u => u.Task)
            .Where(u => u.Task.ProjectId == projectId && u.UpdateDate == date)
            .AsNoTracking()
            .ToListAsync();

        return new DailySiteReportDto
        {
            ProjectId = projectId,
            ReportDate = date,
            OverallCompletionPercent = tasks.Count == 0 ? 0 : tasks.Average(t => t.CompletionPercent),
            TaskUpdates = updates.Select(u => new TaskDailyStatusDto
            {
                TaskId = u.TaskId,
                Title = tasks.FirstOrDefault(t => t.Id == u.TaskId)?.Title ?? "",
                CompletionPercent = u.CompletionPercent ?? 0,
                Status = u.Status ?? "",
                Remarks = u.Remarks
            }).ToList()
        };
    }

    public async Task<List<ComparableProjectDto>> GetComparableProjectsAsync(ReportFilterDto filter)
    {
        var q = _db.Projects.Include(p => p.ProjectType).Where(p => p.Status == "Closed").AsQueryable();
        if (filter.ProjectId.HasValue) q = q.Where(p => p.Id != filter.ProjectId);
        if (!string.IsNullOrWhiteSpace(filter.Client)) q = q.Where(p => p.ClientName == filter.Client);

        var projects = await q.Take(20).AsNoTracking().ToListAsync();
        var result = new List<ComparableProjectDto>();

        foreach (var p in projects)
        {
            result.Add(new ComparableProjectDto
            {
                ProjectId = p.Id,
                Name = p.Name,
                ProjectType = p.ProjectType?.Name,
                ApprovedBudget = await _db.Budgets.Where(b => b.ProjectId == p.Id).SumAsync(b => b.ApprovedAmount),
                ActualCost = await _db.ActualCosts.Where(c => c.ProjectId == p.Id).SumAsync(c => c.Amount),
                DurationDays = p.StartDate.HasValue && p.EndDate.HasValue
                    ? p.EndDate.Value.DayNumber - p.StartDate.Value.DayNumber
                    : null
            });
        }
        return result;
    }

    public async Task<List<ExceptionItemDto>> GetExceptionsAsync(IEnumerable<long> projectIds)
    {
        var ids = projectIds.ToList();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var inactiveSince = DateTime.UtcNow.AddDays(-7);
        var list = new List<ExceptionItemDto>();

        var overdue = await _db.Tasks
            .Where(t => ids.Contains(t.ProjectId) && t.DueDate < today && t.Status != "Completed")
            .Take(20)
            .ToListAsync();
        list.AddRange(overdue.Select(t => new ExceptionItemDto
        {
            Type = "OverdueTask",
            RelatedId = t.Id,
            Title = t.Title,
            Message = "Task overdue"
        }));

        return list;
    }
}
