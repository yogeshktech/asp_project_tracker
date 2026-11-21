using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using project_tracker_madhu.DatabaseLayer.Context;

#nullable disable

namespace project_tracker_madhu.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261121000000_AddCostCentreToBoqItems")]
public partial class AddCostCentreToBoqItems : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<long>(name: "cost_center_id", table: "boq_items", type: "bigint", nullable: true);
        migrationBuilder.AddColumn<decimal>(name: "budget_amount", table: "cost_centers", type: "numeric", nullable: false, defaultValue: 0m);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "cost_center_id", table: "boq_items");
        migrationBuilder.DropColumn(name: "budget_amount", table: "cost_centers");
    }
}
