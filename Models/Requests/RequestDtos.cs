namespace project_tracker_madhu.Models.Requests;

public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<long> PermissionIds { get; set; } = new();
}

public class UpdateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<long> PermissionIds { get; set; } = new();
}

public class AssignRolePermissionsRequest
{
    public List<long> PermissionIds { get; set; } = new();
}

public class CreatePermissionRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
}

public class UpdatePermissionRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
}

public class AssignUserRolesRequest
{
    public List<long> RoleIds { get; set; } = new();
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsInternal { get; set; } = true;
    public bool IsAdmin { get; set; }
    public List<long> RoleIds { get; set; } = new();
    public List<long> ProjectIds { get; set; } = new();
    public List<UserProjectPermissionDto> Permissions { get; set; } = new();
}

public class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsInternal { get; set; } = true;
    public bool IsAdmin { get; set; }
    public List<long> RoleIds { get; set; } = new();
}

public class CreateResortRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Code { get; set; }
}

public class UpdateResortRequest : CreateResortRequest
{
    public bool IsActive { get; set; } = true;
}

public class CreatePropertyRequest
{
    public long ResortId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
}

public class UpdatePropertyRequest : CreatePropertyRequest
{
    public bool IsActive { get; set; } = true;
}

public class CreateProjectTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateProjectTypeRequest : CreateProjectTypeRequest
{
    public bool IsActive { get; set; } = true;
}

public class CreateProjectDto
{
    public long ResortId { get; set; }
    public long? ParentProjectId { get; set; }
    public long? OwnerId { get; set; }
    public long? ProjectTypeId { get; set; }
    public long? PropertyId { get; set; }
    public string? ClientName { get; set; }
    public string? Sponsor { get; set; }
    public string Currency { get; set; } = "INR";
    public bool AllowExternalView { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "Draft";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ProfileNotes { get; set; }
}

public class UpdateProjectDto : CreateProjectDto { }

public class AssignProjectUserRequest
{
    public long UserId { get; set; }
    public string? TeamRole { get; set; }
}

public class UserProjectPermissionDto
{
    public long? ProjectId { get; set; }
    public long UserId { get; set; }
    public string Module { get; set; } = string.Empty;
    public bool CanView { get; set; } = true;
    public bool CanEdit { get; set; }
    public bool CanUpdate { get; set; }
    public bool CanDelete { get; set; }
}

public class ReplaceUserAccessRequest
{
    public bool IsAdmin { get; set; }
    public List<UserProjectPermissionDto> Permissions { get; set; } = new();
}

public class UserAccessDto
{
    public bool IsAdmin { get; set; }
    public List<UserProjectPermissionDto> Permissions { get; set; } = new();
}

public class CreateBudgetRequest
{
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal ApprovedAmount { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal RagAmberPercent { get; set; } = 80;
    public decimal RagRedPercent { get; set; } = 100;
}

public class CreateCostCenterRequest
{
    public long? ProjectId { get; set; }
    public long? SubProjectId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateCostCenterRequest : CreateCostCenterRequest { }

public class CreateAllocationRequest
{
    public long BudgetId { get; set; }
    public long CostCenterId { get; set; }
    public decimal AllocatedAmount { get; set; }
    public string? Remarks { get; set; }
}

public class BudgetVersionRequest
{
    public decimal TotalAmount { get; set; }
    public string? Remarks { get; set; }
    public long? ApproverId { get; set; }
}

public class CreateItemRequest
{
    public string ItemCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? UnitId { get; set; }
    public long? BrandId { get; set; }
    public long? CategoryId { get; set; }
    public decimal UnitPrice { get; set; }
    public string? ImageUrl { get; set; }
    public DateOnly? EffectiveDate { get; set; }
    public string? Source { get; set; }
}

public class UpdateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public long? ParentId { get; set; }
}

public class BOQImportDto
{
    public long ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public bool Commit { get; set; }
    public Dictionary<string, string>? ColumnMapping { get; set; }
    public List<BOQImportLineDto> Lines { get; set; } = new();
}

public class BOQImportLineDto
{
    public long? ItemId { get; set; }
    public string? ItemCode { get; set; }
    public int? LineNo { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Brand { get; set; }
    public string? Remarks { get; set; }
    public string? AttachmentPath { get; set; }
}

public class CreateMilestoneRequest
{
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public long? OwnerId { get; set; }
    public long? DependsOnMilestoneId { get; set; }
}

public class CreateTaskRequest
{
    public long ProjectId { get; set; }
    public long? MilestoneId { get; set; }
    public long? DependsOnTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? AssignedTo { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? Remarks { get; set; }
}

public class CreateSubTaskRequest
{
    public long TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long? AssignedTo { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? Status { get; set; }
    public string? Remarks { get; set; }
}

public class CreateTaskUpdateRequest
{
    public long TaskId { get; set; }
    public long? SubTaskId { get; set; }
    public decimal? CompletionPercent { get; set; }
    public string? Status { get; set; }
    public string? Remarks { get; set; }
    public string? AttachmentPath { get; set; }
}

public class TaskBulkImportRequest
{
    public long ProjectId { get; set; }
    public List<CreateTaskUpdateRequest> Updates { get; set; } = new();
}

public class CreatePurchaseCostRequest
{
    public long ProjectId { get; set; }
    public long? BoqItemId { get; set; }
    public long? CostCenterId { get; set; }
    public string? Vendor { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateOnly? PurchaseDate { get; set; }
}

public class CreateActualCostRequest
{
    public long ProjectId { get; set; }
    public long? BoqItemId { get; set; }
    public long? CostCenterId { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateOnly? CostDate { get; set; }
}

public class VarianceExplanationRequest
{
    public long ProjectId { get; set; }
    public string VarianceType { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
}

public class CreateIssueRequest
{
    public long ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? What { get; set; }
    public string? Location { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? Impact { get; set; }
    public long? PriorityId { get; set; }
}

public class CreateIssueCommentRequest
{
    public string Comment { get; set; } = string.Empty;
}

public class CreateNotificationRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string Type { get; set; } = "Info";
    public string? RelatedType { get; set; }
    public long? RelatedId { get; set; }
    public List<long> UserIds { get; set; } = new();
    public bool SendEmail { get; set; } = true;
}

public class CreateEscalationRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string TriggerType { get; set; } = string.Empty;
    public int DelayHours { get; set; } = 24;
    public long? TargetRoleId { get; set; }
}

public class ReportFilterDto
{
    public long? ProjectId { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? ReportType { get; set; }
    public string? ProjectType { get; set; }
    public string? Client { get; set; }
}

public class CreateReportRequest
{
    public string Name { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public long? ProjectId { get; set; }
    public string? FilterJson { get; set; }
    public string? SelectedColumns { get; set; }
    public List<long> RecipientUserIds { get; set; } = new();
}

public class CreateInventoryRequest
{
    public long ProjectId { get; set; }
    public long? ItemId { get; set; }
    public string? Description { get; set; }
    public decimal Quantity { get; set; }
    public long? UnitId { get; set; }
    public string? Remarks { get; set; }
}

public class ProjectClosureDto
{
    public long ProjectId { get; set; }
    public string? HandoverNotes { get; set; }
    public string? SignedDocumentPath { get; set; }
    public bool IsMandatoryComplete { get; set; }
}

public class MilestoneTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public long? ProjectTypeId { get; set; }
    public string TemplateJson { get; set; } = "[]";
}

public class CloneTemplateRequest
{
    public long TemplateId { get; set; }
    public long ProjectId { get; set; }
}
