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
    Task<PortfolioReportDto> GetPortfolioReportAsync(long userId);
    Task<DailySiteReportDto?> GetDailyReportAsync(long userId, long projectId, DateOnly? date);
    Task<List<ComparableProjectDto>> GetComparableProjectsAsync(ReportFilterDto filter);
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
        var internalEmails = await _repository.GetInternalUserEmailsAsync(request.RecipientUserIds);
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

    public Task<PortfolioReportDto> GetPortfolioReportAsync(long userId) =>
        _repository.GetPortfolioReportAsync(userId);

    public async Task<DailySiteReportDto?> GetDailyReportAsync(long userId, long projectId, DateOnly? date)
    {
        if (!await _permissions.CanViewProjectAsync(userId, projectId)) return null;
        return await _repository.GetDailySiteReportAsync(projectId, date ?? DateOnly.FromDateTime(DateTime.UtcNow));
    }

    public Task<List<ComparableProjectDto>> GetComparableProjectsAsync(ReportFilterDto filter) =>
        _repository.GetComparableProjectsAsync(filter);
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

        return new DashboardResponseDto
        {
            ProjectCount = allowed.Count,
            OpenIssueCount = await _repository.CountOpenIssuesAsync(allowed),
            OverdueTaskCount = await _repository.CountOverdueTasksAsync(allowed),
            TotalApprovedBudget = await _repository.SumApprovedBudgetAsync(allowed),
            TotalActualCost = await _repository.SumActualCostAsync(allowed),
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
