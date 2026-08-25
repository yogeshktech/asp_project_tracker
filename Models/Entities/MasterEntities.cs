using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("project_types")]
public class ProjectType
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

[Table("properties")]
public class Property
{
    public long Id { get; set; }
    public long ResortId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Resort Resort { get; set; } = null!;
}

[Table("variance_explanations")]
public class VarianceExplanation
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string VarianceType { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project Project { get; set; } = null!;
}

[Table("milestone_templates")]
public class MilestoneTemplate
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? ProjectTypeId { get; set; }
    public string TemplateJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
}
