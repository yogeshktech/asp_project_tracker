namespace project_tracker_madhu.Models.Responses;

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public long UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
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
    public bool IsActive { get; set; }
    public bool IsInternal { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class ProjectTeamMemberDto
{
    public long UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? TeamRole { get; set; }
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
    public string Currency { get; set; } = "INR";
    public bool AllowExternalView { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ProfileNotes { get; set; }
    public string Level { get; set; } = "Project";
    public List<ProjectResponseDto> SubProjects { get; set; } = new();
}

public class CostVarianceDto
{
    public long ProjectId { get; set; }
    public decimal ApprovedBudget { get; set; }
    public decimal AllocatedBudget { get; set; }
    public decimal PurchaseTotal { get; set; }
    public decimal ActualTotal { get; set; }
    public decimal ForecastTotal { get; set; }
    public decimal VarianceAmount { get; set; }
    public decimal VariancePercent { get; set; }
    public string RagStatus { get; set; } = "Green";
    public List<CostCenterRollupDto> CostCenters { get; set; } = new();
}

public class CostCenterRollupDto
{
    public long CostCenterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Allocated { get; set; }
    public decimal Spent { get; set; }
    public decimal Variance { get; set; }
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
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
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
    public string? NextMilestone { get; set; }
    public string ScheduleRisk { get; set; } = string.Empty;
    public string BudgetRag { get; set; } = string.Empty;
    public int OpenIssues { get; set; }
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
    public string Title { get; set; } = string.Empty;
    public decimal CompletionPercent { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class ComparableProjectDto
{
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProjectType { get; set; }
    public decimal ApprovedBudget { get; set; }
    public decimal ActualCost { get; set; }
    public int? DurationDays { get; set; }
}

public class TaskItemDto
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? MilestoneId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? AssignedTo { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "NotStarted";
    public decimal CompletionPercent { get; set; }
    public string? Remarks { get; set; }
    public List<SubTaskItemDto> SubTasks { get; set; } = new();
    public bool CanDelete { get; set; }
    public bool CanEditPercent { get; set; }
}

public class SubTaskItemDto
{
    public long Id { get; set; }
    public long TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long? AssignedTo { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "NotStarted";
    public decimal CompletionPercent { get; set; }
    public string? Remarks { get; set; }
    public bool CanDelete { get; set; }
    public bool CanEditPercent { get; set; }
}

public class TaskBulkImportResultDto
{
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public List<string> Errors { get; set; } = new();
}
