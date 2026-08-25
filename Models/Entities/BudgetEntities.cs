using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("cost_centers")]
public class CostCenter
{
    public long Id { get; set; }
    public long? ProjectId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project? Project { get; set; }
}

[Table("budgets")]
public class Budget
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal ApprovedAmount { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal RagAmberPercent { get; set; } = 10;
    public decimal RagRedPercent { get; set; } = 20;
    public string Status { get; set; } = "Draft";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Project Project { get; set; } = null!;
    public ICollection<BudgetVersion> Versions { get; set; } = new List<BudgetVersion>();
    public ICollection<BudgetAllocation> Allocations { get; set; } = new List<BudgetAllocation>();
}

[Table("budget_versions")]
public class BudgetVersion
{
    public long Id { get; set; }
    public long BudgetId { get; set; }
    public int VersionNo { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Remarks { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Budget Budget { get; set; } = null!;
}

[Table("budget_allocations")]
public class BudgetAllocation
{
    public long Id { get; set; }
    public long BudgetId { get; set; }
    public long CostCenterId { get; set; }
    public decimal AllocatedAmount { get; set; }
    public string? Remarks { get; set; }
    public Budget Budget { get; set; } = null!;
    public CostCenter CostCenter { get; set; } = null!;
}
