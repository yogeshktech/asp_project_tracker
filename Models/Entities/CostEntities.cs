using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("purchase_costs")]
public class PurchaseCost
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? BoqItemId { get; set; }
    public long? CostCenterId { get; set; }
    public string? Vendor { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateOnly PurchaseDate { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project Project { get; set; } = null!;
}

[Table("actual_costs")]
public class ActualCost
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? BoqItemId { get; set; }
    public long? CostCenterId { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateOnly CostDate { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Project Project { get; set; } = null!;
}
