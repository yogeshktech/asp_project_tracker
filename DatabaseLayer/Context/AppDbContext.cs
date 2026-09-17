using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Resort> Resorts => Set<Resort>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectUser> ProjectUsers => Set<ProjectUser>();
    public DbSet<ProjectPermission> ProjectPermissions => Set<ProjectPermission>();
    public DbSet<ProjectType> ProjectTypes => Set<ProjectType>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<VarianceExplanation> VarianceExplanations => Set<VarianceExplanation>();
    public DbSet<MilestoneTemplate> MilestoneTemplates => Set<MilestoneTemplate>();
    public DbSet<CostCenter> CostCenters => Set<CostCenter>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<BudgetVersion> BudgetVersions => Set<BudgetVersion>();
    public DbSet<BudgetAllocation> BudgetAllocations => Set<BudgetAllocation>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<ItemCategory> ItemCategories => Set<ItemCategory>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<project_tracker_madhu.Models.Entities.Boq> Boqs => Set<project_tracker_madhu.Models.Entities.Boq>();
    public DbSet<BoqVersion> BoqVersions => Set<BoqVersion>();
    public DbSet<BoqItem> BoqItems => Set<BoqItem>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<ProjectTask> Tasks => Set<ProjectTask>();
    public DbSet<SubTask> SubTasks => Set<SubTask>();
    public DbSet<TaskUpdate> TaskUpdates => Set<TaskUpdate>();
    public DbSet<TaskAttachment> TaskAttachments => Set<TaskAttachment>();
    public DbSet<PurchaseCost> PurchaseCosts => Set<PurchaseCost>();
    public DbSet<ActualCost> ActualCosts => Set<ActualCost>();
    public DbSet<IssuePriority> IssuePriorities => Set<IssuePriority>();
    public DbSet<Issue> Issues => Set<Issue>();
    public DbSet<IssueComment> IssueComments => Set<IssueComment>();
    public DbSet<IssueAttachment> IssueAttachments => Set<IssueAttachment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationRecipient> NotificationRecipients => Set<NotificationRecipient>();
    public DbSet<EscalationRule> EscalationRules => Set<EscalationRule>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ReportRecipient> ReportRecipients => Set<ReportRecipient>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<ProjectCompletionReport> ProjectCompletionReports => Set<ProjectCompletionReport>();
    public DbSet<FileRecord> FileRecords => Set<FileRecord>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });
        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId);
        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId);

        modelBuilder.Entity<RolePermission>().HasKey(x => new { x.RoleId, x.PermissionId });
        modelBuilder.Entity<RolePermission>()
            .HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId);
        modelBuilder.Entity<RolePermission>()
            .HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId);

        modelBuilder.Entity<ProjectUser>().HasKey(x => new { x.ProjectId, x.UserId });
        modelBuilder.Entity<Project>()
            .HasMany(x => x.SubProjects)
            .WithOne(x => x.ParentProject)
            .HasForeignKey(x => x.ParentProjectId);

        modelBuilder.Entity<ProjectTask>()
            .HasOne(x => x.Assignee)
            .WithMany()
            .HasForeignKey(x => x.AssignedTo);

        modelBuilder.Entity<ProjectTask>()
            .HasMany(x => x.SubTasks)
            .WithOne(x => x.Task)
            .HasForeignKey(x => x.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Issue>()
            .HasOne(x => x.Reporter)
            .WithMany()
            .HasForeignKey(x => x.ReportedBy);

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                var column = ToSnakeCase(property.Name);
                property.SetColumnName(column);
            }
        }

        // Identity columns use serial names already via snake_case
        modelBuilder.Entity<BoqVersion>().Property(x => x.BoqId).HasColumnName("boq_id");
    }

    private static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name)) return name;
        var chars = new List<char> { char.ToLowerInvariant(name[0]) };
        for (var i = 1; i < name.Length; i++)
        {
            if (char.IsUpper(name[i]))
            {
                chars.Add('_');
                chars.Add(char.ToLowerInvariant(name[i]));
            }
            else
            {
                chars.Add(name[i]);
            }
        }
        return new string(chars.ToArray());
    }
}
