using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // 1. Roles
        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
        if (adminRole == null)
        {
            adminRole = new Role { Name = "Admin", Description = "Full system access", CreatedAt = DateTime.UtcNow };
            db.Roles.Add(adminRole);
        }

        var pmRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "ProjectManager");
        if (pmRole == null)
        {
            pmRole = new Role { Name = "ProjectManager", Description = "Manage assigned projects", CreatedAt = DateTime.UtcNow };
            db.Roles.Add(pmRole);
        }

        var viewerRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Viewer");
        if (viewerRole == null)
        {
            viewerRole = new Role { Name = "Viewer", Description = "Read-only access", CreatedAt = DateTime.UtcNow };
            db.Roles.Add(viewerRole);
        }
        await db.SaveChangesAsync();

        // 2. Permissions
        var permissionDefs = new (string Code, string Name, string Module)[]
        {
            ("users.manage", "Manage users", "Users"),
            ("projects.view", "View projects", "Projects"),
            ("projects.edit", "Edit projects", "Projects"),
            ("budgets.edit", "Edit budgets", "Budgets"),
            ("boq.edit", "Edit BOQ", "BOQ"),
            ("tasks.edit", "Edit tasks", "Tasks"),
            ("costs.edit", "Edit costs", "Costs"),
            ("issues.edit", "Edit issues", "Issues"),
            ("reports.view", "View reports", "Reports"),
            ("closure.edit", "Close projects", "Closure")
        };

        var allPerms = await db.Permissions.ToListAsync();
        foreach (var def in permissionDefs)
        {
            if (!allPerms.Any(p => p.Code == def.Code))
            {
                var p = new Permission { Code = def.Code, Name = def.Name, Module = def.Module, CreatedAt = DateTime.UtcNow };
                db.Permissions.Add(p);
            }
        }
        await db.SaveChangesAsync();
        allPerms = await db.Permissions.ToListAsync();

        // Map all permissions to Admin role
        var existingRolePerms = await db.RolePermissions.Where(rp => rp.RoleId == adminRole.Id).ToListAsync();
        foreach (var perm in allPerms)
        {
            if (!existingRolePerms.Any(rp => rp.PermissionId == perm.Id))
            {
                db.RolePermissions.Add(new RolePermission { RoleId = adminRole.Id, PermissionId = perm.Id });
            }
        }
        await db.SaveChangesAsync();

        // 3. Issue Priorities
        if (!await db.IssuePriorities.AnyAsync())
        {
            db.IssuePriorities.AddRange(
                new IssuePriority { Code = "LOW", Name = "Low", SortOrder = 1 },
                new IssuePriority { Code = "MEDIUM", Name = "Medium", SortOrder = 2 },
                new IssuePriority { Code = "HIGH", Name = "High", SortOrder = 3 },
                new IssuePriority { Code = "CRITICAL", Name = "Critical", SortOrder = 4 }
            );
            await db.SaveChangesAsync();
        }

        // 4. Units
        if (!await db.Units.AnyAsync())
        {
            db.Units.AddRange(
                new Unit { Code = "NOS", Name = "Numbers" },
                new Unit { Code = "M", Name = "Meter" },
                new Unit { Code = "SQM", Name = "Square Meter" },
                new Unit { Code = "CUM", Name = "Cubic Meter" },
                new Unit { Code = "KG", Name = "Kilogram" },
                new Unit { Code = "LS", Name = "Lump Sum" },
                new Unit { Code = "LTR", Name = "Litre" },
                new Unit { Code = "TON", Name = "Metric Ton" },
                new Unit { Code = "SQFT", Name = "Square Feet" }
            );
            await db.SaveChangesAsync();
        }

        // 5. Project Types
        if (!await db.ProjectTypes.AnyAsync())
        {
            db.ProjectTypes.AddRange(
                new ProjectType { Name = "MEP", Description = "Mechanical Electrical Plumbing", CreatedAt = DateTime.UtcNow },
                new ProjectType { Name = "Civil", Description = "Civil works", CreatedAt = DateTime.UtcNow },
                new ProjectType { Name = "New Development", Description = "New development project", CreatedAt = DateTime.UtcNow },
                new ProjectType { Name = "Major Renovation", Description = "Major renovation project", CreatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }

        // 6. Admin User
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Email == "admin@wisetrack.local");
        if (admin == null)
        {
            admin = new User
            {
                Email = "admin@wisetrack.local",
                FullName = "System Admin",
                PasswordHash = PasswordUtility.Hash("Admin@123"),
                IsActive = true,
                IsInternal = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();

            db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });
            await db.SaveChangesAsync();
        }

        // 7. Sample Resort & Properties & Projects
        if (!await db.Resorts.AnyAsync())
        {
            var resort = new Resort
            {
                Name = "Grand Palm Luxury Resort & Spa",
                Code = "GPLR",
                Location = "Goa, India",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Resorts.Add(resort);
            await db.SaveChangesAsync();

            var prop = new Property
            {
                ResortId = resort.Id,
                Name = "Main Resort Villa & Convention Wing",
                Code = "PROP-01",
                Location = "Beachfront Sector 1",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Properties.Add(prop);
            await db.SaveChangesAsync();

            var projectType = await db.ProjectTypes.FirstOrDefaultAsync();

            // Level 1 Root Project
            var rootProject = new Project
            {
                ResortId = resort.Id,
                PropertyId = prop.Id,
                ProjectTypeId = projectType?.Id,
                Name = "Phase 1 Expansion & Renovation",
                Code = "PRJ-GPLR-01",
                Description = "Master expansion of luxury villas, spa and central MEP infrastructure.",
                Status = "Active",
                ClientName = "Grand Palm Hospitality Ltd.",
                Sponsor = "Board of Directors",
                Currency = "INR",
                OwnerId = admin.Id,
                StartDate = new DateOnly(2025, 1, 1),
                EndDate = new DateOnly(2026, 12, 31),
                CreatedAt = DateTime.UtcNow
            };
            db.Projects.Add(rootProject);
            await db.SaveChangesAsync();

            // Level 2 Sub-Project
            var subProject = new Project
            {
                ResortId = resort.Id,
                ParentProjectId = rootProject.Id,
                PropertyId = prop.Id,
                ProjectTypeId = projectType?.Id,
                Name = "Tower A - Luxury Suites Refurbishment",
                Code = "PRJ-GPLR-01-A",
                Description = "Complete overhaul of 48 luxury suites in Tower A.",
                Status = "Active",
                Currency = "INR",
                OwnerId = admin.Id,
                StartDate = new DateOnly(2025, 3, 1),
                EndDate = new DateOnly(2025, 11, 30),
                CreatedAt = DateTime.UtcNow
            };
            db.Projects.Add(subProject);
            await db.SaveChangesAsync();

            // Level 3 Work Package
            var workPkg1 = new Project
            {
                ResortId = resort.Id,
                ParentProjectId = subProject.Id,
                PropertyId = prop.Id,
                Name = "MEP & HVAC Modernization",
                Code = "PKG-MEP-01",
                Description = "Chilled water piping, VRV system, ducting, and electrical panels.",
                Status = "Active",
                Currency = "INR",
                OwnerId = admin.Id,
                StartDate = new DateOnly(2025, 3, 15),
                EndDate = new DateOnly(2025, 8, 30),
                CreatedAt = DateTime.UtcNow
            };

            var workPkg2 = new Project
            {
                ResortId = resort.Id,
                ParentProjectId = subProject.Id,
                PropertyId = prop.Id,
                Name = "Interior Fitout & Furnishing",
                Code = "PKG-INT-01",
                Description = "Flooring, wall paneling, ceiling, bathroom fittings, and bespoke FF&E.",
                Status = "Draft",
                Currency = "INR",
                OwnerId = admin.Id,
                StartDate = new DateOnly(2025, 6, 1),
                EndDate = new DateOnly(2025, 11, 15),
                CreatedAt = DateTime.UtcNow
            };
            db.Projects.AddRange(workPkg1, workPkg2);
            await db.SaveChangesAsync();

            // Assign Admin to Projects
            db.ProjectUsers.Add(new ProjectUser { ProjectId = rootProject.Id, UserId = admin.Id, TeamRole = "Project Director" });
            db.ProjectUsers.Add(new ProjectUser { ProjectId = subProject.Id, UserId = admin.Id, TeamRole = "Project Manager" });
            await db.SaveChangesAsync();

            // Cost Centers & Budgets
            var ccCivil = new CostCenter { ProjectId = rootProject.Id, Code = "CC-CIVIL", Name = "Civil & Structural", CreatedAt = DateTime.UtcNow };
            var ccMep = new CostCenter { ProjectId = rootProject.Id, Code = "CC-MEP", Name = "MEP & HVAC Works", CreatedAt = DateTime.UtcNow };
            var ccInterior = new CostCenter { ProjectId = rootProject.Id, Code = "CC-INT", Name = "Interiors & FF&E", CreatedAt = DateTime.UtcNow };
            db.CostCenters.AddRange(ccCivil, ccMep, ccInterior);
            await db.SaveChangesAsync();

            var budget = new Budget
            {
                ProjectId = rootProject.Id,
                Name = "Master Approved Budget FY2025-26",
                ApprovedAmount = 50000000m,
                Currency = "INR",
                RagAmberPercent = 10,
                RagRedPercent = 20,
                Status = "Approved",
                CreatedAt = DateTime.UtcNow
            };
            db.Budgets.Add(budget);
            await db.SaveChangesAsync();

            db.BudgetAllocations.AddRange(
                new BudgetAllocation { BudgetId = budget.Id, CostCenterId = ccCivil.Id, AllocatedAmount = 20000000m, Remarks = "Civil works" },
                new BudgetAllocation { BudgetId = budget.Id, CostCenterId = ccMep.Id, AllocatedAmount = 18000000m, Remarks = "MEP & Electrical packages" },
                new BudgetAllocation { BudgetId = budget.Id, CostCenterId = ccInterior.Id, AllocatedAmount = 12000000m, Remarks = "Interiors and fittings" }
            );
            await db.SaveChangesAsync();

            // Milestones & Tasks
            var ms1 = new Milestone
            {
                ProjectId = rootProject.Id,
                Name = "Phase 1 - Structural Inspection & Demolition",
                Status = "Completed",
                CompletionPercent = 100,
                StartDate = new DateOnly(2025, 1, 10),
                DueDate = new DateOnly(2025, 2, 28),
                CreatedAt = DateTime.UtcNow
            };
            var ms2 = new Milestone
            {
                ProjectId = rootProject.Id,
                Name = "Phase 2 - MEP First Fix & Ducting",
                Status = "InProgress",
                CompletionPercent = 65,
                StartDate = new DateOnly(2025, 3, 1),
                DueDate = new DateOnly(2025, 7, 31),
                CreatedAt = DateTime.UtcNow
            };
            db.Milestones.AddRange(ms1, ms2);
            await db.SaveChangesAsync();

            var task1 = new ProjectTask
            {
                ProjectId = rootProject.Id,
                MilestoneId = ms2.Id,
                Title = "Chilled Water Piping Installation - Level 1 to 4",
                Description = "Run insulated copper and MS chilled water risers across all 4 floors.",
                AssignedTo = admin.Id,
                Status = "InProgress",
                CompletionPercent = 70,
                StartDate = new DateOnly(2025, 3, 15),
                DueDate = new DateOnly(2025, 6, 15),
                CreatedAt = DateTime.UtcNow
            };
            var task2 = new ProjectTask
            {
                ProjectId = rootProject.Id,
                MilestoneId = ms2.Id,
                Title = "VRV Outdoor Condenser Unit Mounting",
                Description = "Mount and anchor 8x VRV condenser units on the service roof deck.",
                AssignedTo = admin.Id,
                Status = "NotStarted",
                CompletionPercent = 0,
                StartDate = new DateOnly(2025, 6, 1),
                DueDate = new DateOnly(2025, 7, 20),
                CreatedAt = DateTime.UtcNow
            };
            db.Tasks.AddRange(task1, task2);
            await db.SaveChangesAsync();

            // Item Master & Categories
            var catElec = new ItemCategory { Name = "Electrical" };
            var catPlumb = new ItemCategory { Name = "Plumbing & Piping" };
            var catHvac = new ItemCategory { Name = "HVAC & Cooling" };
            db.ItemCategories.AddRange(catElec, catPlumb, catHvac);
            await db.SaveChangesAsync();

            var brand1 = new Brand { Name = "Schneider Electric", CreatedAt = DateTime.UtcNow };
            var brand2 = new Brand { Name = "Daikin", CreatedAt = DateTime.UtcNow };
            var brand3 = new Brand { Name = "Kohler", CreatedAt = DateTime.UtcNow };
            db.Brands.AddRange(brand1, brand2, brand3);
            await db.SaveChangesAsync();

            var unitNos = await db.Units.FirstOrDefaultAsync(u => u.Code == "NOS");
            var unitM = await db.Units.FirstOrDefaultAsync(u => u.Code == "M");

            db.Items.AddRange(
                new Item { ItemCode = "ITM-ELEC-001", Name = "LED Panel Light 18W Recessed", CategoryId = catElec.Id, BrandId = brand1.Id, UnitId = unitNos?.Id, UnitPrice = 850m, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Item { ItemCode = "ITM-HVAC-001", Name = "VRV Indoor Fan Coil Unit 2.0 TR", CategoryId = catHvac.Id, BrandId = brand2.Id, UnitId = unitNos?.Id, UnitPrice = 45000m, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Item { ItemCode = "ITM-PLUM-001", Name = "Copper Refrigerant Pipe 1/2 Inch", CategoryId = catPlumb.Id, BrandId = brand1.Id, UnitId = unitM?.Id, UnitPrice = 620m, IsActive = true, CreatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();

            // Sample Issue
            var highPriority = await db.IssuePriorities.FirstOrDefaultAsync(p => p.Code == "HIGH");
            db.Issues.Add(new Issue
            {
                ProjectId = rootProject.Id,
                Title = "Ducting clash with structural beam on Level 3 East Wing",
                What = "HVAC return air duct route intersects with reinforced concrete beam B-14.",
                Location = "Level 3 - Corridor East",
                PriorityId = highPriority?.Id,
                Status = "Open",
                ReportedBy = admin.Id,
                OccurredAt = DateTime.UtcNow.AddDays(-2),
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }
}
