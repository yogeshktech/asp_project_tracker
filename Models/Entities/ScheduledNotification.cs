using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("scheduled_notifications")]
public class ScheduledNotification
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string RelatedType { get; set; } = "Project";
    public long RelatedId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset ScheduledAt { get; set; }
    public bool SendEmail { get; set; }
    public string Status { get; set; } = "Pending";
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessingAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string? LastError { get; set; }

    [JsonIgnore]
    public Project Project { get; set; } = null!;

    public ICollection<ScheduledNotificationRecipient> Recipients { get; set; } = new List<ScheduledNotificationRecipient>();
}

[Table("scheduled_notification_recipients")]
public class ScheduledNotificationRecipient
{
    public long ScheduledNotificationId { get; set; }
    public long UserId { get; set; }

    [JsonIgnore]
    public ScheduledNotification ScheduledNotification { get; set; } = null!;

    [JsonIgnore]
    public User User { get; set; } = null!;
}
