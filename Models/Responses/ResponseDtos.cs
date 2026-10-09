using project_tracker_madhu.Models.Requests;

namespace project_tracker_madhu.Models.Responses;

public class PagedResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}

public class InboxNotificationDto
{
    public long Id { get; set; }
    public bool IsRead { get; set; }
    public InboxNotificationDetailDto Notification { get; set; } = new();
}

public class InboxNotificationDetailDto
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? RelatedType { get; set; }
    public long? RelatedId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ScheduledNotificationDto
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string RelatedType { get; set; } = string.Empty;
    public long RelatedId { get; set; }
    public string RelatedName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset ScheduledAt { get; set; }
    public bool SendEmail { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string? LastError { get; set; }
    public List<ScheduledNotificationUserDto> Recipients { get; set; } = new();
}

public class ScheduledNotificationUserDto
{
    public long UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public long UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public List<string> Roles { get; set; } = new();
    public bool IsAdmin { get; set; }
    public List<UserProjectPermissionDto> Permissions { get; set; } = new();
}

public class RoleResponseDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PermissionResponseDto> Permissions { get; set; } = new();
}

public class PermissionResponseDto
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
}

public class UserResponseDto
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsActive { get; set; }
    public bool IsInternal { get; set; }
    public bool IsAdmin { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class ProjectTeamMemberDto
{
    public long UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? TeamRole { get; set; }
    public bool IsInternal { get; set; }
}

public class ProjectResponseDto
{
    public long Id { get; set; }
    public long ResortId { get; set; }
    public string? ResortName { get; set; }
    public long? ParentProjectId { get; set; }
    public long? OwnerId { get; set; }
    public string? OwnerName { get; set; }
    public long? ProjectTypeId { get; set; }
    public string? ProjectTypeName { get; set; }
    public long? PropertyId { get; set; }
    public string? PropertyName { get; set; }
    public string? ClientName { get; set; }
    public string? Sponsor { get; set; }
    public string Currency { get; set; } = "MVR";
    public bool AllowExternalView { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ProfileNotes { get; set; }
    public decimal? ProjectBudgetAmount { get; set; }
    public decimal? ProjectBudgetAvailable { get; set; }
    public string? ProjectBudgetCurrency { get; set; }
    public string Level { get; set; } = "Project";
    public List<ProjectResponseDto> SubProjects { get; set; } = new();
}

public class ProjectBudgetAllocationHistoryDto
{
    public long Id { get; set; }
    public long FromProjectId { get; set; }
    public string FromProjectName { get; set; } = string.Empty;
    public long ToProjectId { get; set; }
    public string ToProjectName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "MVR";
    public string? Remarks { get; set; }
    public long? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProjectBudgetAllocationSummaryDto
{
    public long ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Currency { get; set; } = "MVR";
    public decimal TotalFunding { get; set; }
    public decimal AllocatedToChildren { get; set; }
    public decimal Available { get; set; }
    public List<ProjectBudgetChildDto> Children { get; set; } = new();
    public List<ProjectBudgetAllocationHistoryDto> History { get; set; } = new();
}

public class ProjectBudgetChildDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
}

public class CostVarianceDto
{
    public long ProjectId { get; set; }
    public string Currency { get; set; } = "MVR";
    public decimal Budget { get; set; }
    public decimal CurrentCommitment { get; set; }
    public decimal ActualSpend { get; set; }
    public decimal ApprovedBudget { get; set; }
    public decimal AllocatedBudget { get; set; }
    public decimal PurchaseTotal { get; set; }
    public decimal ActualTotal { get; set; }
    public decimal ForecastTotal { get; set; }
    public decimal VarianceAmount { get; set; }
    public decimal VariancePercent { get; set; }
    public decimal ForecastVarianceAmount { get; set; }
    public string BudgetStatus { get; set; } = "On Budget";
    public string RagStatus { get; set; } = "Green";
    public List<CostCenterRollupDto> CostCenters { get; set; } = new();
}

public class CostCenterRollupDto
{
    public long CostCenterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public decimal CurrentCommitment { get; set; }
    public decimal PurchaseCost { get; set; }
    public decimal ActualSpend { get; set; }
    public decimal Forecast { get; set; }
    public decimal Allocated { get; set; }
    public decimal Spent { get; set; }
    public decimal Variance { get; set; }
    public decimal ForecastVariance { get; set; }
    public string BudgetStatus { get; set; } = "On Budget";
    public string RagStatus { get; set; } = "Green";
}

public class DashboardResponseDto
{
    public int ProjectCount { get; set; }
    public int OpenIssueCount { get; set; }
    public int OverdueTaskCount { get; set; }
    public decimal TotalApprovedBudget { get; set; }
    public decimal TotalActualCost { get; set; }
    public List<ProjectResponseDto> RecentProjects { get; set; } = new();
    public List<ExceptionItemDto> Exceptions { get; set; } = new();
}

public class ExceptionItemDto
{
    public string Type { get; set; } = string.Empty;
    public long RelatedId { get; set; }
    public long ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ItemKind { get; set; } = "Task";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class CostImportResultDto
{
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class BOQValidationResultDto
{
    public bool IsValid { get; set; }
    public int TotalRows { get; set; }
    public int ErrorCount { get; set; }
    public List<BOQValidationErrorDto> Errors { get; set; } = new();
    public object? CommittedBoq { get; set; }
}

public class BOQValidationErrorDto
{
    public int Row { get; set; }
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class PortfolioReportDto
{
    public List<ProjectStatusRowDto> Projects { get; set; } = new();
}

public class ProjectStatusRowDto
{
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? OwnerName { get; set; }
    public string? NextMilestone { get; set; }
    public DateOnly? NextMilestoneDueDate { get; set; }
    public string ScheduleRisk { get; set; } = string.Empty;
    public string BudgetRag { get; set; } = string.Empty;
    public decimal ApprovedBudget { get; set; }
    public decimal PurchaseCommitment { get; set; }
    public decimal ActualCost { get; set; }
    public int UnresolvedExceptions { get; set; }
    public int OpenIssues { get; set; }
    public decimal ProgressPercent { get; set; }
    public List<VarianceExplanationDto> VarianceExplanations { get; set; } = new();
}

public class VarianceExplanationDto
{
    public string VarianceType { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class DailySiteReportDto
{
    public long ProjectId { get; set; }
    public DateOnly ReportDate { get; set; }
    public decimal OverallCompletionPercent { get; set; }
    public List<TaskDailyStatusDto> TaskUpdates { get; set; } = new();
}

public class TaskDailyStatusDto
{
    public long TaskId { get; set; }
    public long? SubTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? SubTaskTitle { get; set; }
    public decimal CompletionPercent { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class TaskHistoryItemDto
{
    public long Id { get; set; }
    public string ItemTitle { get; set; } = string.Empty;
    public DateOnly UpdateDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public decimal? CompletionPercent { get; set; }
    public string? Status { get; set; }
    public string? Remarks { get; set; }
}

public class ComparableProjectDto
{
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProjectType { get; set; }
    public string? Client { get; set; }
    public string? Scope { get; set; }
    public bool IsReferenceProject { get; set; }
    public string Currency { get; set; } = "MVR";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public decimal ApprovedBudget { get; set; }
    public decimal PurchaseCost { get; set; }
    public decimal ActualCost { get; set; }
    public decimal TotalCost { get; set; }
    public int? DurationDays { get; set; }
    public List<VarianceExplanationDto> VarianceExplanations { get; set; } = new();
}

public class TaskItemDto
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? MilestoneId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CompletionEvidence { get; set; }
    public long? AssignedTo { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "NotStarted";
    public decimal CompletionPercent { get; set; }
    public string? Remarks { get; set; }
    public List<SubTaskItemDto> SubTasks { get; set; } = new();
    public bool CanDelete { get; set; }
    public bool CanEdit { get; set; }
    public bool CanEditPercent { get; set; }
    public string DisplayCode { get; set; } = string.Empty;
    public long? DependsOnTaskId { get; set; }
    public long? DependsOnSubTaskId { get; set; }
    public string? DependsOnLabel { get; set; }
    public bool IsBlocked { get; set; }
    public string? BlockedReason { get; set; }
}

public class SubTaskItemDto
{
    public long Id { get; set; }
    public long TaskId { get; set; }
    public long? ParentSubTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long? AssignedTo { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "NotStarted";
    public decimal CompletionPercent { get; set; }
    public string? Remarks { get; set; }
    public bool CanDelete { get; set; }
    public bool CanEditPercent { get; set; }
    public string DisplayCode { get; set; } = string.Empty;
    public long? DependsOnTaskId { get; set; }
    public long? DependsOnSubTaskId { get; set; }
    public string? DependsOnLabel { get; set; }
    public bool IsBlocked { get; set; }
    public string? BlockedReason { get; set; }
    public List<SubTaskItemDto> Children { get; set; } = new();
}

public class TaskBulkImportResultDto
{
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public List<string> Errors { get; set; } = new();
}
