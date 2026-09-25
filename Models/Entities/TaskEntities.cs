using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace project_tracker_madhu.Models.Entities;

[Table("milestones")]
public class Milestone
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "NotStarted";
    public decimal CompletionPercent { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project Project { get; set; } = null!;
    public ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();
}

[Table("tasks")]
public class ProjectTask
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? MilestoneId { get; set; }
    public long? DependsOnTaskId { get; set; }
    public long? DependsOnSubTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? AssignedTo { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "NotStarted";
    public decimal CompletionPercent { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Project Project { get; set; } = null!;
    public Milestone? Milestone { get; set; }
    public ProjectTask? DependsOnTask { get; set; }
    public User? Assignee { get; set; }
    public ICollection<SubTask> SubTasks { get; set; } = new List<SubTask>();
}

[Table("sub_tasks")]
public class SubTask
{
    public long Id { get; set; }
    public long TaskId { get; set; }
    public long? ParentSubTaskId { get; set; }
    public long? DependsOnTaskId { get; set; }
    public long? DependsOnSubTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long? AssignedTo { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "NotStarted";
    public decimal CompletionPercent { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    [JsonIgnore]
    public ProjectTask Task { get; set; } = null!;
    [JsonIgnore]
    public SubTask? Parent { get; set; }
    public ICollection<SubTask> Children { get; set; } = new List<SubTask>();
}

[Table("task_updates")]
public class TaskUpdate
{
    public long Id { get; set; }
    public long TaskId { get; set; }
    public long? SubTaskId { get; set; }
    public long? UpdatedBy { get; set; }
    public DateOnly UpdateDate { get; set; }
    public decimal? CompletionPercent { get; set; }
    public string? Status { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public ProjectTask Task { get; set; } = null!;
}

[Table("task_attachments")]
public class TaskAttachment
{
    public long Id { get; set; }
    public long TaskId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public ProjectTask Task { get; set; } = null!;
}
