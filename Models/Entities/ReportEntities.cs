using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("reports")]
public class Report
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public long? ProjectId { get; set; }
    public string? FilterJson { get; set; }
    public string? SelectedColumns { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project? Project { get; set; }
    public ICollection<ReportRecipient> Recipients { get; set; } = new List<ReportRecipient>();
}

[Table("report_recipients")]
public class ReportRecipient
{
    public long Id { get; set; }
    public long ReportId { get; set; }
    public long? UserId { get; set; }
    public string? Email { get; set; }
    public Report Report { get; set; } = null!;
}
