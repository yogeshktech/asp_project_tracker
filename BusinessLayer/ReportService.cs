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
    Task<DailySiteReportDto?> GetDailyReportAsync(long userId, long projectId, DateOnly? date, bool cumulative = false);
    Task<List<ComparableProjectDto>> GetComparableProjectsAsync(long userId, ReportFilterDto filter);
}

public interface IDashboardService
{
    Task<DashboardResponseDto> GetAsync(long userId);
}

public class ReportService : IReportService
{
    private sealed class ReportFilterState
    {
        public DateOnly? Date { get; set; }
        public string? Scope { get; set; }
    }

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

        if (internalEmails.Count > 0)
        {
            if (userId.HasValue)
            {
                var (content, fileName) = await ExportCsvAsync(userId.Value, report.Id);
                await _email.SendAsync(internalEmails, $"Wisetrack Report: {request.Name}",
                    $"The requested {request.ReportType} report is attached.", content, fileName, "text/csv; charset=utf-8");
            }
            else
            {
                await _email.SendAsync(internalEmails, $"Wisetrack Report: {request.Name}",
                    $"Report '{request.Name}' ({request.ReportType}) has been generated.");
            }
        }

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
        {
            var canViewBudgets = await _permissions.CanViewModuleAsync(userId, project.ProjectId, "Budgets");
            var canViewCosts = await _permissions.CanViewModuleAsync(userId, project.ProjectId, "Costs");
            if (!canViewBudgets) project.ApprovedBudget = 0;
            if (!canViewCosts)
            {
                project.PurchaseCommitment = 0;
                project.ActualCost = 0;
            }
            if (!canViewBudgets || !canViewCosts) project.BudgetRag = "";
            var canViewTasks = await _permissions.CanViewModuleAsync(userId, project.ProjectId, "Tasks");
            var canViewMilestones = await _permissions.CanViewModuleAsync(userId, project.ProjectId, "Milestones");
            var canViewIssues = await _permissions.CanViewModuleAsync(userId, project.ProjectId, "Issues");
            if (!canViewTasks) project.ProgressPercent = 0;
            if (!canViewMilestones)
            {
                project.NextMilestone = null;
                project.NextMilestoneDueDate = null;
            }
            if (!canViewTasks || !canViewMilestones) project.ScheduleRisk = "";
            if (!canViewIssues) project.OpenIssues = 0;
            if (!canViewTasks || !canViewMilestones || !canViewIssues) project.UnresolvedExceptions = 0;
            project.VarianceExplanations = project.VarianceExplanations
                .Where(v => v.VarianceType == "Cost" ? canViewCosts : canViewTasks).ToList();
        }
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
        var type = report.ReportType.Trim().ToLowerInvariant();
        var allowedColumns = type switch
        {
            "daily" => new[] { "task", "subTask", "status", "percent", "remarks", "updatedAt" },
            "boq" => new[] { "item", "quantity", "purchasePrice", "total", "image", "brand", "remark" },
            _ => new[] { "project", "status", "owner", "budget", "rag", "progress", "milestones", "issues", "varianceReasons" }
        };
        var columns = (report.SelectedColumns ?? string.Join(',', allowedColumns))
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(c => allowedColumns.Contains(c, StringComparer.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (columns.Count == 0) columns = allowedColumns.ToList();
        var titles = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["project"] = "Project / WBS", ["status"] = "Status", ["owner"] = "Owner", ["budget"] = "Budget", ["rag"] = "RAG",
            ["progress"] = "% Complete", ["milestones"] = "Next Milestone", ["issues"] = "Open Issues", ["varianceReasons"] = "Variance Reasons",
            ["task"] = "Task", ["subTask"] = "Sub-Task", ["percent"] = "% Complete", ["remarks"] = "Remark", ["updatedAt"] = "Updated Date",
            ["item"] = "Item", ["quantity"] = "Quantity", ["purchasePrice"] = "Purchase Price", ["total"] = "Total", ["image"] = "Image", ["brand"] = "Brand", ["remark"] = "Remark"
        };
        static string Escape(string? value) => "\"" + (value ?? "").Replace("\"", "\"\"") + "\"";
        static string Safe(string? value) => !string.IsNullOrEmpty(value) && "=+-@\t\r".Contains(value[0]) ? "'" + value : value ?? "";
        var output = new System.Text.StringBuilder();
        output.AppendLine(string.Join(',', columns.Select(c => Escape(titles.GetValueOrDefault(c, c)))));
        if (type == "daily")
        {
            if (!report.ProjectId.HasValue) throw new InvalidOperationException("Daily report requires a project.");
            var filter = ParseReportFilter(report.FilterJson);
            var daily = await GetDailyReportAsync(userId, report.ProjectId.Value, filter.Date, filter.Scope == "cumulative")
                ?? throw new UnauthorizedAccessException("You cannot view this project's daily report.");
            foreach (var row in daily.TaskUpdates)
            {
                var values = columns.Select(c => c.ToLowerInvariant() switch
                {
                    "task" => row.Title,
                    "subtask" => row.SubTaskTitle,
                    "status" => row.Status,
                    "percent" => row.CompletionPercent.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
                    "remarks" => row.Remarks,
                    "updatedat" => daily.ReportDate.ToString("yyyy-MM-dd"),
                    _ => ""
                });
                output.AppendLine(string.Join(',', values.Select(v => Escape(Safe(v)))));
            }
        }
        else if (type == "boq")
        {
            if (!report.ProjectId.HasValue) throw new InvalidOperationException("BOQ report requires a project.");
            if (!await _permissions.CanViewModuleAsync(userId, report.ProjectId.Value, "BOQ")) throw new UnauthorizedAccessException("You cannot view BOQ data for this project.");
            var boqs = await _repository.GetBoqsForReportAsync(report.ProjectId.Value);
            foreach (var item in boqs.SelectMany(b => b.Versions.OrderByDescending(v => v.IsCurrentBaseline).ThenByDescending(v => v.VersionNo).FirstOrDefault()?.Items ?? new List<BoqItem>()))
            {
                var values = columns.Select(c => c.ToLowerInvariant() switch
                {
                    "item" => item.ItemName ?? item.Description,
                    "quantity" => item.Quantity.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
                    "purchaseprice" => item.UnitPrice.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
                    "total" => item.Amount.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
                    "image" => item.ImageUrl ?? item.AttachmentName,
                    "brand" => item.Brand,
                    "remark" => item.Remarks,
                    _ => ""
                });
                output.AppendLine(string.Join(',', values.Select(v => Escape(Safe(v)))));
            }
        }
        else
        {
            var rows = (await _repository.GetPortfolioReportAsync(accessible)).Projects.AsEnumerable();
            if (report.ProjectId.HasValue) rows = rows.Where(r => r.ProjectId == report.ProjectId.Value);
            foreach (var row in rows)
            {
                var canViewBudgets = await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Budgets");
                var canViewCosts = await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Costs");
                var canViewTasks = await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Tasks");
                var canViewMilestones = await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Milestones");
                var canViewIssues = await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Issues");
                var values = columns.Select(c => c.ToLowerInvariant() switch
                {
                    "project" => row.Name,
                    "status" => row.Status,
                    "owner" => "",
                    "budget" => canViewBudgets ? row.ApprovedBudget.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) : "",
                    "progress" => canViewTasks ? row.ProgressPercent.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) : "",
                    "rag" => canViewBudgets && canViewCosts ? row.BudgetRag : "",
                    "milestones" => canViewMilestones ? row.NextMilestone : "",
                    "issues" => canViewIssues ? row.OpenIssues.ToString(System.Globalization.CultureInfo.InvariantCulture) : "",
                    "variancereasons" => string.Join(" | ", row.VarianceExplanations.Where(v => v.VarianceType == "Cost" ? canViewCosts : canViewTasks).Select(v => $"{v.VarianceType}: {v.Explanation}")),
                    _ => ""
                });
                output.AppendLine(string.Join(',', values.Select(v => Escape(Safe(v)))));
            }
        }
        await _audit.LogAsync(userId, "Export", "Report", report.Id, "CSV");
        return (new System.Text.UTF8Encoding(true).GetBytes(output.ToString()), $"wisetrack-report-{report.Id}.csv");
    }

    private static ReportFilterState ParseReportFilter(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new ReportFilterState();
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<ReportFilterState>(json,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new ReportFilterState();
        }
        catch (System.Text.Json.JsonException) { return new ReportFilterState(); }
    }

    public async Task<DailySiteReportDto?> GetDailyReportAsync(long userId, long projectId, DateOnly? date, bool cumulative = false)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return null;
        if (!await _permissions.CanViewModuleAsync(userId, projectId, "Tasks"))
            throw new UnauthorizedAccessException("You cannot view task reports for this project.");
        return await _repository.GetDailySiteReportAsync(projectId, date ?? DateOnly.FromDateTime(DateTime.UtcNow), cumulative);
    }

    public async Task<List<ComparableProjectDto>> GetComparableProjectsAsync(long userId, ReportFilterDto filter)
    {
        var allowed = await _permissions.GetAccessibleProjectIdsAsync(userId);
        var rows = await _repository.GetComparableProjectsAsync(filter, allowed);
        foreach (var row in rows)
        {
            if (!await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Budgets")) row.ApprovedBudget = 0;
            if (!await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Costs"))
            {
                row.ActualCost = 0;
                row.PurchaseCost = 0;
                row.TotalCost = 0;
                row.VarianceExplanations = row.VarianceExplanations.Where(v => v.VarianceType != "Cost").ToList();
            }
            if (!await _permissions.CanViewModuleAsync(userId, row.ProjectId, "Tasks"))
                row.VarianceExplanations = row.VarianceExplanations.Where(v => v.VarianceType != "Schedule").ToList();
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
