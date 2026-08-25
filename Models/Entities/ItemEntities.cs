using System.ComponentModel.DataAnnotations.Schema;

namespace project_tracker_madhu.Models.Entities;

[Table("brands")]
public class Brand
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

[Table("units")]
public class Unit
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

[Table("item_categories")]
public class ItemCategory
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? ParentId { get; set; }
    public ItemCategory? Parent { get; set; }
}

[Table("items")]
public class Item
{
    public long Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? UnitId { get; set; }
    public long? BrandId { get; set; }
    public long? CategoryId { get; set; }
    public decimal UnitPrice { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Unit? Unit { get; set; }
    public Brand? Brand { get; set; }
    public ItemCategory? Category { get; set; }
}
