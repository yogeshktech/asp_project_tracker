using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("resorts")]
public class Resort
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Code { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}

[Table("projects")]
public class Project
{
    public long Id { get; set; }
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
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Resort Resort { get; set; } = null!;
    public Project? ParentProject { get; set; }
    public User? Owner { get; set; }
    public ProjectType? ProjectType { get; set; }
    public Property? Property { get; set; }
    public ICollection<Project> SubProjects { get; set; } = new List<Project>();
    public ICollection<ProjectUser> ProjectUsers { get; set; } = new List<ProjectUser>();
}

[Table("project_users")]
public class ProjectUser
{
    public long ProjectId { get; set; }
    public long UserId { get; set; }
    public string? TeamRole { get; set; }
    public Project Project { get; set; } = null!;
    public User User { get; set; } = null!;
}

[Table("project_permissions")]
public class ProjectPermission
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long UserId { get; set; }
    public string Module { get; set; } = string.Empty;
    public bool CanView { get; set; } = true;
    public bool CanEdit { get; set; }
    public Project Project { get; set; } = null!;
    public User User { get; set; } = null!;
}
