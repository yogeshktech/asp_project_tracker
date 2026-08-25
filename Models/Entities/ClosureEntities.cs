using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("inventories")]
public class Inventory
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? ItemId { get; set; }
    public string? Description { get; set; }
    public decimal Quantity { get; set; }
    public long? UnitId { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project Project { get; set; } = null!;
    public Item? Item { get; set; }
}

[Table("project_completion_reports")]
public class ProjectCompletionReport
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string? HandoverNotes { get; set; }
    public string? SignedDocumentPath { get; set; }
    public bool IsMandatoryComplete { get; set; }
    public long? ClosedBy { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project Project { get; set; } = null!;
}

[Table("file_records")]
public class FileRecord
{
    public long Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? ContentType { get; set; }
    public long? SizeBytes { get; set; }
    public string? Module { get; set; }
    public long? RelatedId { get; set; }
    public long? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
}

[Table("audit_logs")]
public class AuditLog
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public long? EntityId { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}
