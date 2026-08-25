using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("issue_priorities")]
public class IssuePriority
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

[Table("issues")]
public class Issue
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? What { get; set; }
    public string? Location { get; set; }
    public DateTime? OccurredAt { get; set; }
    public long? ReportedBy { get; set; }
    public string? Impact { get; set; }
    public long? PriorityId { get; set; }
    public string Status { get; set; } = "Open";
    public bool IsEscalated { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Project Project { get; set; } = null!;
    public IssuePriority? Priority { get; set; }
    public User? Reporter { get; set; }
    public ICollection<IssueComment> Comments { get; set; } = new List<IssueComment>();
    public ICollection<IssueAttachment> Attachments { get; set; } = new List<IssueAttachment>();
}

[Table("issue_comments")]
public class IssueComment
{
    public long Id { get; set; }
    public long IssueId { get; set; }
    public long? UserId { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

[Table("issue_attachments")]
public class IssueAttachment
{
    public long Id { get; set; }
    public long IssueId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
}
