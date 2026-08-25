using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("boqs")]
public class Boq
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Project Project { get; set; } = null!;
    public ICollection<BoqVersion> Versions { get; set; } = new List<BoqVersion>();
}

[Table("boq_versions")]
public class BoqVersion
{
    public long Id { get; set; }
    public long BoqId { get; set; }
    public int VersionNo { get; set; }
    public string? Remarks { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Boq Boq { get; set; } = null!;
    public ICollection<BoqItem> Items { get; set; } = new List<BoqItem>();
}

[Table("boq_items")]
public class BoqItem
{
    public long Id { get; set; }
    public long BoqVersionId { get; set; }
    public long? ItemId { get; set; }
    public int? LineNo { get; set; }
    public string? Description { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? Remarks { get; set; }
    public BoqVersion BoqVersion { get; set; } = null!;
    public Item? Item { get; set; }
}
