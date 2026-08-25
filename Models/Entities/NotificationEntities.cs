using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("notifications")]
public class Notification
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? RelatedType { get; set; }
    public long? RelatedId { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<NotificationRecipient> Recipients { get; set; } = new List<NotificationRecipient>();
}

[Table("notification_recipients")]
public class NotificationRecipient
{
    public long Id { get; set; }
    public long NotificationId { get; set; }
    public long UserId { get; set; }
    public bool IsRead { get; set; }
    public bool SentEmail { get; set; }
    public DateTime? ReadAt { get; set; }
    public Notification Notification { get; set; } = null!;
    public User User { get; set; } = null!;
}

[Table("escalation_rules")]
public class EscalationRule
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TriggerType { get; set; } = string.Empty;
    public int DelayHours { get; set; } = 24;
    public long? TargetRoleId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
