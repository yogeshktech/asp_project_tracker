using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Reports;
using project_tracker_madhu.Models.Entities;
using project_tracker_madhu.Models.Requests;
using project_tracker_madhu.Models.Responses;

namespace project_tracker_madhu.BusinessLayer.Reports;

public interface IReportService
{
    Task<Report> CreateAsync(CreateReportRequest request, long? userId);
    Task<List<Report>> GetAllAsync(long userId);
    Task<(byte[] Content, string FileName)> ExportCsvAsync(long userId, long reportId);
    Task<PortfolioReportDto> GetPortfolioReportAsync(long userId);
    Task<DailySiteReportDto?> GetDailyReportAsync(long userId, long projectId, DateOnly? date);
    Task<List<ComparableProjectDto>> GetComparableProjectsAsync(long userId, ReportFilterDto filter);
}

public interface IDashboardService
{
    Task<DashboardResponseDto> GetAsync(long userId);
}

public class ReportService : IReportService
{
    private readonly IReportRepository _repository;
    private readonly IPermissionService _permissions;
    private readonly IAuditService _audit;
    private readonly IEmailService _email;

    public ReportService(IReportRepository repository, IPermissionService permissions, IAuditService audit, IEmailService email)
    {
        _repository = repository;
        _permissions = permissions;
        _audit = audit;
        _email = email;
    }

    public async Task<Report> CreateAsync(CreateReportRequest request, long? userId)
    {
        if (userId.HasValue && request.ProjectId.HasValue)
            await _permissions.EnsureModuleAsync(userId.Value, request.ProjectId.Value, "Reports", "edit");
        var internalEmails = request.ProjectId.HasValue
            ? await _repository.GetProjectInternalUserEmailsAsync(request.ProjectId.Value, request.RecipientUserIds)
            : await _repository.GetInternalUserEmailsAsync(request.RecipientUserIds);
        if (request.RecipientUserIds.Count > 0 && internalEmails.Count != request.RecipientUserIds.Distinct().Count())
            throw new InvalidOperationException("Reports can only be sent to internal team members.");

        var report = await _repository.AddAsync(new Report
        {
            Name = request.Name,
            ReportType = request.ReportType,
            ProjectId = request.ProjectId,
            FilterJson = request.FilterJson,
            SelectedColumns = request.SelectedColumns,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        }, internalEmails);

        await _email.SendAsync(internalEmails, $"Wisetrack Report: {request.Name}",
            $"Report '{request.Name}' ({request.ReportType}) has been generated.");

        await _audit.LogAsync(userId, "Generate", "Report", report.Id);
        return report;
    }

    public async Task<List<Report>> GetAllAsync(long userId)
    {
        if (await _permissions.IsAdminAsync(userId))
            return await _repository.GetAllAsync();
        return await _repository.GetByUserAsync(userId);
    }

    public async Task<PortfolioReportDto> GetPortfolioReportAsync(long userId)
    {
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var report = await _repository.GetPortfolioReportAsync(allowed);
        foreach (var project in report.Projects)
            if (!await _permissions.CanViewModuleAsync(userId, project.ProjectId, "Budgets")
                || !await _permissions.CanViewModuleAsync(userId, project.ProjectId, "Costs")) project.BudgetRag = "";
        return report;
    }

    public async Task<(byte[] Content, string FileName)> ExportCsvAsync(long userId, long reportId)
    {
        var report = await _repository.GetAsync(reportId) ?? throw new InvalidOperationException("Report not found.");
        if (report.CreatedBy != userId && !await _permissions.IsAdminAsync(userId))
            throw new UnauthorizedAccessException("You cannot export this report.");
        var accessible = await _permissions.GetAccessibleProjectIdsAsync(userId);
        if (report.ProjectId.HasValue && !accessible.Contains(report.ProjectId.Value))
            throw new UnauthorizedAccessException("You do not have access to this project.");
        var rows = (await _repository.GetPortfolioReportAsync(accessible)).Projects.AsEnumerable();
        if (report.ProjectId.HasValue) rows = rows.Where(r => r.ProjectId == report.ProjectId.Value);
        var columns = (report.SelectedColumns ?? "project,status,progress,rag,milestones,issues")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(c => new[] { "project", "status", "progress", "rag", "milestones", "issues" }.Contains(c, StringComparer.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (columns.Count == 0) columns = ["project", "status", "progress", "rag", "milestones", "issues"];
        static string Escape(string? value) => "\"" + (value ?? "").Replace("\"", "\"\"") + "\"";
        var output = new System.Text.StringBuilder();
        output.AppendLine(string.Join(',', columns.Select(Escape)));
        foreach (var row in rows)
        {
            var canViewFinance = await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Budgets")
                && await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Costs");
            var values = columns.Select(c => c.ToLowerInvariant() switch
            {
                "project" => row.Name,
                "status" => row.Status,
                "progress" => row.ProgressPercent.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
                "rag" => canViewFinance ? row.BudgetRag : "",
                "milestones" => row.NextMilestone,
                "issues" => row.OpenIssues.ToString(System.Globalization.CultureInfo.InvariantCulture),
                _ => ""
            });
            output.AppendLine(string.Join(',', values.Select(Escape)));
        }
        await _audit.LogAsync(userId, "Export", "Report", report.Id, "CSV");
        return (new System.Text.UTF8Encoding(true).GetBytes(output.ToString()), $"wisetrack-report-{report.Id}.csv");
    }

    public async Task<DailySiteReportDto?> GetDailyReportAsync(long userId, long projectId, DateOnly? date)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return null;
        return await _repository.GetDailySiteReportAsync(projectId, date ?? DateOnly.FromDateTime(DateTime.UtcNow));
    }

    public async Task<List<ComparableProjectDto>> GetComparableProjectsAsync(long userId, ReportFilterDto filter)
    {
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var rows = await _repository.GetComparableProjectsAsync(filter, allowed);
        foreach (var row in rows)
        {
            if (!await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Budgets")) row.ApprovedBudget = 0;
            if (!await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Costs")) row.ActualCost = 0;
        }
        return rows;
    }
}

public class DashboardService : IDashboardService
{
    private readonly IReportRepository _repository;
    private readonly IPermissionService _permissions;

    public DashboardService(IReportRepository repository, IPermissionService permissions)
    {
        _repository = repository;
        _permissions = permissions;
    }

    public async Task<DashboardResponseDto> GetAsync(long userId)
    {
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var projects = await _repository.RecentProjectsAsync(5, allowed);
        var exceptions = await _repository.GetExceptionsAsync(allowed);
        var budgetProjects = new List<long>();
        var costProjects = new List<long>();
        foreach (var projectId in allowed)
        {
            if (await _permissions.CanViewModuleAsync(userId, projectId, "Budgets")) budgetProjects.Add(projectId);
            if (await _permissions.CanViewModuleAsync(userId, projectId, "Costs")) costProjects.Add(projectId);
        }

        return new DashboardResponseDto
        {
            ProjectCount = allowed.Count,
            OpenIssueCount = await _repository.CountOpenIssuesAsync(allowed),
            OverdueTaskCount = await _repository.CountOverdueTasksAsync(allowed),
            TotalApprovedBudget = await _repository.SumApprovedBudgetAsync(budgetProjects),
            TotalActualCost = await _repository.SumActualCostAsync(costProjects),
            RecentProjects = projects.Select(p => new ProjectResponseDto
            {
                Id = p.Id,
                ResortId = p.ResortId,
                ResortName = p.Resort?.Name,
                Name = p.Name,
                Code = p.Code,
                Status = p.Status,
                StartDate = p.StartDate,
                EndDate = p.EndDate
            }).ToList(),
            Exceptions = exceptions
        };
    }
}
