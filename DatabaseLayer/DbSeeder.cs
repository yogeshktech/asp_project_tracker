using Microsoft.EntityFrameworkCore;
using project_tracker_madhu.Common;
using project_tracker_madhu.DatabaseLayer.Context;
using project_tracker_madhu.Models.Entities;

namespace project_tracker_madhu.DatabaseLayer;

/// <summary>
/// Seeds masters + a full demo portfolio covering PM-01..PM-30 requirement scenarios.
/// </summary>
public static class DbSeeder
{
    private const string DemoPassword = "Admin@123";

    public static async Task SeedAsync(AppDbContext db)
    {
        var now = DateTime.UtcNow;

        // ── Roles (PM-01..PM-04 personas) ──────────────────────────────────
        var adminRole = await EnsureRoleAsync(db, "Admin", "Full system access");
        var pmRole = await EnsureRoleAsync(db, "ProjectManager", "Manage assigned projects; can close projects");
        var siteRole = await EnsureRoleAsync(db, "SiteEngineer", "Site execution — task/sub-task updates");
        var financeRole = await EnsureRoleAsync(db, "FinanceOfficer", "Budget, cost, and variance access");
        var auditorRole = await EnsureRoleAsync(db, "Auditor", "Read-only audit and reports");
        var viewerRole = await EnsureRoleAsync(db, "Viewer", "Read-only project visibility");
        var externalRole = await EnsureRoleAsync(db, "ExternalOwner", "Controlled external view of authorized projects only");
        await db.SaveChangesAsync();

        // ── Permissions (PM-03 modules) ────────────────────────────────────
        var permissionDefs = new (string Code, string Name, string Module)[]
        {
            ("users.manage", "Manage users & roles", "Users"),
            ("projects.view", "View projects", "Projects"),
            ("projects.edit", "Create/edit projects", "Projects"),
            ("budgets.view", "View budgets", "Budgets"),
            ("budgets.edit", "Edit budgets & cost centers", "Budgets"),
            ("boq.view", "View BOQ", "BOQ"),
            ("boq.edit", "Edit BOQ & imports", "BOQ"),
            ("items.manage", "Manage item/price master", "Items"),
            ("tasks.view", "View milestones & tasks", "Tasks"),
            ("tasks.edit", "Edit tasks / % completion (owner)", "Tasks"),
            ("tasks.site_update", "Site daily status & attachments", "Tasks"),
            ("costs.view", "View purchase & actual costs", "Costs"),
            ("costs.edit", "Enter purchase & actual costs", "Costs"),
            ("issues.view", "View issues", "Issues"),
            ("issues.edit", "Report & update issues", "Issues"),
            ("reports.view", "View reports", "Reports"),
            ("reports.export", "Export PDF/Excel (authorized)", "Reports"),
            ("closure.edit", "Close project (PM only)", "Closure"),
            ("audit.view", "View audit trail", "Audit"),
            ("notifications.manage", "Configure notifications", "Notifications")
        };

        foreach (var def in permissionDefs)
        {
            if (!await db.Permissions.AnyAsync(p => p.Code == def.Code))
            {
                db.Permissions.Add(new Permission
                {
                    Code = def.Code,
                    Name = def.Name,
                    Module = def.Module,
                    CreatedAt = now
                });
            }
        }
        await db.SaveChangesAsync();
        var allPerms = await db.Permissions.ToListAsync();

        await EnsureRolePermsAsync(db, adminRole.Id, allPerms.Select(p => p.Id));
        await EnsureRolePermsAsync(db, pmRole.Id, allPerms.Where(p => p.Code != "users.manage").Select(p => p.Id));
        await EnsureRolePermsAsync(db, siteRole.Id, allPerms.Where(p =>
            p.Code is "projects.view" or "tasks.view" or "tasks.site_update" or "issues.view" or "issues.edit").Select(p => p.Id));
        await EnsureRolePermsAsync(db, financeRole.Id, allPerms.Where(p =>
            p.Module is "Budgets" or "Costs" or "Reports" || p.Code == "projects.view").Select(p => p.Id));
        await EnsureRolePermsAsync(db, auditorRole.Id, allPerms.Where(p =>
            p.Code.EndsWith(".view") || p.Code == "audit.view" || p.Code == "reports.export").Select(p => p.Id));
        await EnsureRolePermsAsync(db, viewerRole.Id, allPerms.Where(p => p.Code.EndsWith(".view")).Select(p => p.Id));
        await EnsureRolePermsAsync(db, externalRole.Id, allPerms.Where(p =>
            p.Code is "projects.view" or "tasks.view" or "reports.view").Select(p => p.Id));
        await db.SaveChangesAsync();

        // ── Issue priorities ───────────────────────────────────────────────
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

        // ── Units / project types ──────────────────────────────────────────
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

        if (!await db.ProjectTypes.AnyAsync())
        {
            db.ProjectTypes.AddRange(
                new ProjectType { Name = "MEP", Description = "Mechanical Electrical Plumbing", CreatedAt = now },
                new ProjectType { Name = "Civil", Description = "Civil & structural works", CreatedAt = now },
                new ProjectType { Name = "New Development", Description = "New development project", CreatedAt = now },
                new ProjectType { Name = "Major Renovation", Description = "Major renovation project", CreatedAt = now }
            );
            await db.SaveChangesAsync();
        }

        // ── Users (PM-02 / PM-04) ──────────────────────────────────────────
        var admin = await EnsureUserAsync(db, "admin@wisetrack.local", "System Admin", true, adminRole.Id, "+91-90000-00001");
        var pm = await EnsureUserAsync(db, "pm@wisetrack.local", "Priya Mehta (PM)", true, pmRole.Id, "+91-90000-00002");
        var site = await EnsureUserAsync(db, "site@wisetrack.local", "Ravi Site Engineer", true, siteRole.Id, "+91-90000-00003");
        var finance = await EnsureUserAsync(db, "finance@wisetrack.local", "Ananya Finance", true, financeRole.Id, "+91-90000-00004");
        var auditor = await EnsureUserAsync(db, "auditor@wisetrack.local", "Karan Auditor", true, auditorRole.Id, "+91-90000-00005");
        var gm = await EnsureUserAsync(db, "gm@wisetrack.local", "Resort GM — Sunita Rao", true, viewerRole.Id, "+91-90000-00006");
        var external = await EnsureUserAsync(db, "owner@client.example", "External Project Owner", false, externalRole.Id, "+91-90000-00007");

        // Already have a full demo? skip portfolio insert
        if (await db.Resorts.AnyAsync(r => r.Code == "GPLR") && await db.SubTasks.AnyAsync() && await db.Boqs.AnyAsync())
            return;

        // If thin old seed exists, remove GPLR tree so we can reload rich demo
        if (await db.Resorts.AnyAsync(r => r.Code == "GPLR"))
            await WipeDemoResortAsync(db, "GPLR");

        await SeedFullPortfolioAsync(db, now, admin, pm, site, finance, auditor, gm, external);
    }

    private static async Task SeedFullPortfolioAsync(
        AppDbContext db, DateTime now,
        User admin, User pm, User site, User finance, User auditor, User gm, User external)
    {
        var typeMep = await db.ProjectTypes.FirstAsync(t => t.Name == "MEP");
        var typeCivil = await db.ProjectTypes.FirstAsync(t => t.Name == "Civil");
        var typeReno = await db.ProjectTypes.FirstAsync(t => t.Name == "Major Renovation");
        var typeNew = await db.ProjectTypes.FirstAsync(t => t.Name == "New Development");

        var unitNos = await db.Units.FirstAsync(u => u.Code == "NOS");
        var unitM = await db.Units.FirstAsync(u => u.Code == "M");
        var unitSqm = await db.Units.FirstAsync(u => u.Code == "SQM");
        var unitLs = await db.Units.FirstAsync(u => u.Code == "LS");

        var prioHigh = await db.IssuePriorities.FirstAsync(p => p.Code == "HIGH");
        var prioCrit = await db.IssuePriorities.FirstAsync(p => p.Code == "CRITICAL");
        var prioMed = await db.IssuePriorities.FirstAsync(p => p.Code == "MEDIUM");

        // ── Resort + property (PM-06 hierarchy root) ───────────────────────
        var resort = new Resort
        {
            Name = "Grand Palm Luxury Resort & Spa",
            Code = "GPLR",
            Location = "North Goa, India",
            IsActive = true,
            CreatedAt = now
        };
        db.Resorts.Add(resort);
        await db.SaveChangesAsync();

        var propMain = new Property
        {
            ResortId = resort.Id,
            Name = "Main Villa & Convention Wing",
            Code = "PROP-01",
            Location = "Beachfront Sector 1",
            Description = "Primary guest rooms, spa, and banquet facilities",
            IsActive = true,
            CreatedAt = now
        };
        var propSpa = new Property
        {
            ResortId = resort.Id,
            Name = "Ocean Spa Annex",
            Code = "PROP-02",
            Location = "Lagoon Edge",
            IsActive = true,
            CreatedAt = now
        };
        db.Properties.AddRange(propMain, propSpa);
        await db.SaveChangesAsync();

        // ── Parent Project A — Phase 1 Expansion (PM-01 / PM-06) ───────────
        var parentA = new Project
        {
            ResortId = resort.Id,
            PropertyId = propMain.Id,
            ProjectTypeId = typeReno.Id,
            Name = "Phase 1 Expansion & Renovation",
            Code = "PRJ-GPLR-01",
            Description = "Master expansion: villas, spa MEP, and central infrastructure.",
            Status = "Active",
            ClientName = "Grand Palm Hospitality Ltd.",
            Sponsor = "Board of Directors",
            Currency = "INR",
            OwnerId = pm.Id,
            AllowExternalView = true,
            StartDate = new DateOnly(2025, 1, 1),
            EndDate = new DateOnly(2026, 12, 31),
            ProfileNotes = "Handover gated on signed PCR + leftover inventory (PM-30).",
            CreatedAt = now
        };
        db.Projects.Add(parentA);
        await db.SaveChangesAsync();

        // Sub-projects treated as separate projects AND as parent CCs (PM-06 / PM-07)
        var subMep = new Project
        {
            ResortId = resort.Id,
            ParentProjectId = parentA.Id,
            PropertyId = propMain.Id,
            ProjectTypeId = typeMep.Id,
            Name = "MEP & HVAC Modernization",
            Code = "PRJ-GPLR-01-MEP",
            Description = "Chilled water, VRV, ducting, electrical panels.",
            Status = "Active",
            Currency = "INR",
            OwnerId = pm.Id,
            ClientName = parentA.ClientName,
            StartDate = new DateOnly(2025, 3, 1),
            EndDate = new DateOnly(2025, 10, 31),
            CreatedAt = now
        };
        var subCivil = new Project
        {
            ResortId = resort.Id,
            ParentProjectId = parentA.Id,
            PropertyId = propMain.Id,
            ProjectTypeId = typeCivil.Id,
            Name = "Civil & Structural Works",
            Code = "PRJ-GPLR-01-CIV",
            Description = "Demolition, RCC repairs, waterproofing.",
            Status = "Active",
            Currency = "INR",
            OwnerId = pm.Id,
            StartDate = new DateOnly(2025, 1, 15),
            EndDate = new DateOnly(2025, 8, 30),
            CreatedAt = now
        };
        var subInt = new Project
        {
            ResortId = resort.Id,
            ParentProjectId = parentA.Id,
            PropertyId = propMain.Id,
            ProjectTypeId = typeNew.Id,
            Name = "Interior Fitout & FF&E",
            Code = "PRJ-GPLR-01-INT",
            Description = "Flooring, paneling, bathroom fittings, FF&E.",
            Status = "Active",
            Currency = "INR",
            OwnerId = pm.Id,
            StartDate = new DateOnly(2025, 6, 1),
            EndDate = new DateOnly(2025, 12, 15),
            CreatedAt = now
        };
        db.Projects.AddRange(subMep, subCivil, subInt);
        await db.SaveChangesAsync();

        // Parent B — second concurrent project (PM-01 portfolio)
        var parentB = new Project
        {
            ResortId = resort.Id,
            PropertyId = propSpa.Id,
            ProjectTypeId = typeNew.Id,
            Name = "Ocean Spa New Development",
            Code = "PRJ-GPLR-02",
            Description = "Greenfield spa annex with treatment suites.",
            Status = "Active",
            ClientName = "Grand Palm Hospitality Ltd.",
            Sponsor = "Resort GM",
            Currency = "INR",
            OwnerId = pm.Id,
            StartDate = new DateOnly(2025, 4, 1),
            EndDate = new DateOnly(2026, 3, 31),
            CreatedAt = now
        };
        db.Projects.Add(parentB);
        await db.SaveChangesAsync();

        var subSpaShell = new Project
        {
            ResortId = resort.Id,
            ParentProjectId = parentB.Id,
            PropertyId = propSpa.Id,
            ProjectTypeId = typeCivil.Id,
            Name = "Spa Building Shell",
            Code = "PRJ-GPLR-02-SHELL",
            Status = "Active",
            Currency = "INR",
            OwnerId = pm.Id,
            StartDate = new DateOnly(2025, 4, 1),
            EndDate = new DateOnly(2025, 11, 30),
            CreatedAt = now
        };
        db.Projects.Add(subSpaShell);
        await db.SaveChangesAsync();

        // Closed sample project for comparable analysis (PM-23) + PCR (PM-30)
        var closedProj = new Project
        {
            ResortId = resort.Id,
            PropertyId = propMain.Id,
            ProjectTypeId = typeMep.Id,
            Name = "Tower B Chiller Replacement (Closed)",
            Code = "PRJ-GPLR-00-CLOSED",
            Description = "Prior completed MEP package for comparable analysis.",
            Status = "Closed",
            Currency = "INR",
            OwnerId = pm.Id,
            ClientName = "Grand Palm Hospitality Ltd.",
            StartDate = new DateOnly(2023, 2, 1),
            EndDate = new DateOnly(2023, 9, 30),
            CreatedAt = now.AddYears(-2)
        };
        db.Projects.Add(closedProj);
        await db.SaveChangesAsync();

        // ── Team assignment + deny-by-default others (PM-02) ───────────────
        db.ProjectUsers.AddRange(
            new ProjectUser { ProjectId = parentA.Id, UserId = admin.Id, TeamRole = "Portfolio Admin" },
            new ProjectUser { ProjectId = parentA.Id, UserId = pm.Id, TeamRole = "Project Manager" },
            new ProjectUser { ProjectId = parentA.Id, UserId = site.Id, TeamRole = "Site Engineer" },
            new ProjectUser { ProjectId = parentA.Id, UserId = finance.Id, TeamRole = "Finance" },
            new ProjectUser { ProjectId = parentA.Id, UserId = auditor.Id, TeamRole = "Auditor" },
            new ProjectUser { ProjectId = parentA.Id, UserId = gm.Id, TeamRole = "Resort GM" },
            new ProjectUser { ProjectId = parentA.Id, UserId = external.Id, TeamRole = "External Owner" },
            new ProjectUser { ProjectId = subMep.Id, UserId = pm.Id, TeamRole = "Project Manager" },
            new ProjectUser { ProjectId = subMep.Id, UserId = site.Id, TeamRole = "Site Engineer" },
            new ProjectUser { ProjectId = subCivil.Id, UserId = pm.Id, TeamRole = "Project Manager" },
            new ProjectUser { ProjectId = subCivil.Id, UserId = site.Id, TeamRole = "Site Engineer" },
            new ProjectUser { ProjectId = subInt.Id, UserId = pm.Id, TeamRole = "Project Manager" },
            new ProjectUser { ProjectId = parentB.Id, UserId = pm.Id, TeamRole = "Project Manager" },
            new ProjectUser { ProjectId = parentB.Id, UserId = site.Id, TeamRole = "Site Engineer" },
            new ProjectUser { ProjectId = parentB.Id, UserId = finance.Id, TeamRole = "Finance" },
            new ProjectUser { ProjectId = subSpaShell.Id, UserId = site.Id, TeamRole = "Site Engineer" },
            new ProjectUser { ProjectId = closedProj.Id, UserId = pm.Id, TeamRole = "Project Manager" },
            new ProjectUser { ProjectId = closedProj.Id, UserId = auditor.Id, TeamRole = "Auditor" }
        );

        // Granular module rights (PM-03) — finance can view budgets but not edit BOQ prices on site project
        db.ProjectPermissions.AddRange(
            new ProjectPermission { ProjectId = parentA.Id, UserId = finance.Id, Module = "Budgets", CanView = true, CanEdit = true },
            new ProjectPermission { ProjectId = parentA.Id, UserId = finance.Id, Module = "Costs", CanView = true, CanEdit = true },
            new ProjectPermission { ProjectId = parentA.Id, UserId = finance.Id, Module = "BOQ", CanView = true, CanEdit = false },
            new ProjectPermission { ProjectId = parentA.Id, UserId = site.Id, Module = "Tasks", CanView = true, CanEdit = false },
            new ProjectPermission { ProjectId = parentA.Id, UserId = site.Id, Module = "Issues", CanView = true, CanEdit = true },
            new ProjectPermission { ProjectId = parentA.Id, UserId = site.Id, Module = "Budgets", CanView = false, CanEdit = false },
            new ProjectPermission { ProjectId = parentA.Id, UserId = external.Id, Module = "Projects", CanView = true, CanEdit = false },
            new ProjectPermission { ProjectId = parentA.Id, UserId = external.Id, Module = "Budgets", CanView = false, CanEdit = false },
            new ProjectPermission { ProjectId = parentA.Id, UserId = external.Id, Module = "Reports", CanView = true, CanEdit = false },
            new ProjectPermission { ProjectId = parentB.Id, UserId = external.Id, Module = "Projects", CanView = false, CanEdit = false }
        );
        await db.SaveChangesAsync();

        // ── Cost centers: sub-projects as CC on parent (PM-07) ─────────────
        var ccMep = new CostCenter { ProjectId = parentA.Id, Code = "CC-MEP", Name = "MEP Sub-Project", Description = "Maps to PRJ-GPLR-01-MEP", CreatedAt = now };
        var ccCiv = new CostCenter { ProjectId = parentA.Id, Code = "CC-CIVIL", Name = "Civil Sub-Project", Description = "Maps to PRJ-GPLR-01-CIV", CreatedAt = now };
        var ccInt = new CostCenter { ProjectId = parentA.Id, Code = "CC-INT", Name = "Interior Sub-Project", Description = "Maps to PRJ-GPLR-01-INT", CreatedAt = now };
        var ccCont = new CostCenter { ProjectId = parentA.Id, Code = "CC-CONT", Name = "Contingency", CreatedAt = now };
        var ccSpa = new CostCenter { ProjectId = parentB.Id, Code = "CC-SPA-SHELL", Name = "Spa Shell", CreatedAt = now };
        db.CostCenters.AddRange(ccMep, ccCiv, ccInt, ccCont, ccSpa);
        await db.SaveChangesAsync();

        // Budget baseline + versions (PM-07 / PM-08)
        var budgetA = new Budget
        {
            ProjectId = parentA.Id,
            Name = "Master Approved Budget FY2025-26",
            ApprovedAmount = 50000000m,
            Currency = "INR",
            RagAmberPercent = 80, // flag when 80% of CC spent (requirement)
            RagRedPercent = 100,
            Status = "Approved",
            CreatedAt = now
        };
        db.Budgets.Add(budgetA);
        await db.SaveChangesAsync();

        db.BudgetVersions.AddRange(
            new BudgetVersion { BudgetId = budgetA.Id, VersionNo = 1, TotalAmount = 48000000m, Remarks = "Original baseline", CreatedBy = finance.Id, CreatedAt = now.AddMonths(-6) },
            new BudgetVersion { BudgetId = budgetA.Id, VersionNo = 2, TotalAmount = 50000000m, Remarks = "Board-approved revision (+4%) — steel escalation", CreatedBy = finance.Id, CreatedAt = now.AddMonths(-2) }
        );

        db.BudgetAllocations.AddRange(
            new BudgetAllocation { BudgetId = budgetA.Id, CostCenterId = ccMep.Id, AllocatedAmount = 18000000m, Remarks = "MEP package" },
            new BudgetAllocation { BudgetId = budgetA.Id, CostCenterId = ccCiv.Id, AllocatedAmount = 15000000m, Remarks = "Civil package" },
            new BudgetAllocation { BudgetId = budgetA.Id, CostCenterId = ccInt.Id, AllocatedAmount = 12000000m, Remarks = "Interiors" },
            new BudgetAllocation { BudgetId = budgetA.Id, CostCenterId = ccCont.Id, AllocatedAmount = 5000000m, Remarks = "Contingency" }
        );

        var budgetB = new Budget
        {
            ProjectId = parentB.Id,
            Name = "Spa Annex Budget",
            ApprovedAmount = 22000000m,
            Currency = "INR",
            RagAmberPercent = 80,
            RagRedPercent = 100,
            Status = "Approved",
            CreatedAt = now
        };
        db.Budgets.Add(budgetB);
        await db.SaveChangesAsync();
        db.BudgetAllocations.Add(new BudgetAllocation { BudgetId = budgetB.Id, CostCenterId = ccSpa.Id, AllocatedAmount = 22000000m });
        await db.SaveChangesAsync();

        // ── Item / brand / category master (PM-12) ─────────────────────────
        var catElec = new ItemCategory { Name = "Electrical" };
        var catPlumb = new ItemCategory { Name = "Plumbing & Piping" };
        var catHvac = new ItemCategory { Name = "HVAC & Cooling" };
        var catCivil = new ItemCategory { Name = "Civil Materials" };
        var catFfe = new ItemCategory { Name = "FF&E" };
        db.ItemCategories.AddRange(catElec, catPlumb, catHvac, catCivil, catFfe);
        await db.SaveChangesAsync();

        var brandSch = new Brand { Name = "Schneider Electric", CreatedAt = now };
        var brandDai = new Brand { Name = "Daikin", CreatedAt = now };
        var brandKoh = new Brand { Name = "Kohler", CreatedAt = now };
        var brandUltratech = new Brand { Name = "UltraTech", CreatedAt = now };
        var brandGeneric = new Brand { Name = "Generic / Local", CreatedAt = now };
        db.Brands.AddRange(brandSch, brandDai, brandKoh, brandUltratech, brandGeneric);
        await db.SaveChangesAsync();

        var items = new[]
        {
            new Item { ItemCode = "ITM-ELEC-001", Name = "LED Panel Light 18W Recessed", Description = "600x600 recessed LED panel", CategoryId = catElec.Id, BrandId = brandSch.Id, UnitId = unitNos.Id, UnitPrice = 850m, ImageUrl = "/uploads/demo/led-panel.jpg", IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-ELEC-002", Name = "MDB Panel 400A", Description = "Main distribution board", CategoryId = catElec.Id, BrandId = brandSch.Id, UnitId = unitNos.Id, UnitPrice = 185000m, IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-HVAC-001", Name = "VRV Indoor FCU 2.0 TR", Description = "Ceiling cassette", CategoryId = catHvac.Id, BrandId = brandDai.Id, UnitId = unitNos.Id, UnitPrice = 45000m, ImageUrl = "/uploads/demo/vrv-fcu.jpg", IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-HVAC-002", Name = "VRV Outdoor Condenser 16 HP", Description = "Roof-mounted outdoor unit", CategoryId = catHvac.Id, BrandId = brandDai.Id, UnitId = unitNos.Id, UnitPrice = 320000m, IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-PLUM-001", Name = "Copper Refrigerant Pipe 1/2\"", Description = "Insulated copper", CategoryId = catPlumb.Id, BrandId = brandGeneric.Id, UnitId = unitM.Id, UnitPrice = 620m, IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-PLUM-002", Name = "CPVC Pipe 25mm", Description = "Hot/cold water", CategoryId = catPlumb.Id, BrandId = brandGeneric.Id, UnitId = unitM.Id, UnitPrice = 95m, IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-CIV-001", Name = "OPC Cement 50kg", Description = "53 grade", CategoryId = catCivil.Id, BrandId = brandUltratech.Id, UnitId = unitNos.Id, UnitPrice = 420m, IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-CIV-002", Name = "Waterproofing Membrane", Description = "APP membrane 3mm", CategoryId = catCivil.Id, BrandId = brandGeneric.Id, UnitId = unitSqm.Id, UnitPrice = 280m, IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-FFE-001", Name = "Vanity Basin Set", Description = "Ceramic basin + mixer", CategoryId = catFfe.Id, BrandId = brandKoh.Id, UnitId = unitNos.Id, UnitPrice = 18500m, ImageUrl = "/uploads/demo/vanity.jpg", IsActive = true, CreatedAt = now },
            new Item { ItemCode = "ITM-LS-001", Name = "MEP Testing & Commissioning", Description = "Lump-sum T&C package", CategoryId = catHvac.Id, BrandId = brandGeneric.Id, UnitId = unitLs.Id, UnitPrice = 450000m, IsActive = true, CreatedAt = now }
        };
        db.Items.AddRange(items);
        await db.SaveChangesAsync();

        var itemLed = items[0];
        var itemVrv = items[2];
        var itemCopper = items[4];
        var itemCement = items[6];
        var itemVanity = items[8];

        // ── BOQ + versions + lines (PM-10..PM-14) ──────────────────────────
        var boq = new Boq
        {
            ProjectId = subMep.Id,
            Title = "MEP Bill of Quantities — Tower A",
            Status = "Baseline",
            CreatedBy = pm.Id,
            CreatedAt = now.AddMonths(-4)
        };
        db.Boqs.Add(boq);
        await db.SaveChangesAsync();

        var boqV1 = new BoqVersion { BoqId = boq.Id, VersionNo = 1, Remarks = "Initial import from vendor Excel (flexible columns)", CreatedBy = pm.Id, CreatedAt = now.AddMonths(-4) };
        var boqV2 = new BoqVersion { BoqId = boq.Id, VersionNo = 2, Remarks = "Baseline after quantity reconciliation", CreatedBy = pm.Id, CreatedAt = now.AddMonths(-3) };
        db.BoqVersions.AddRange(boqV1, boqV2);
        await db.SaveChangesAsync();

        db.BoqItems.AddRange(
            new BoqItem { BoqVersionId = boqV2.Id, ItemId = itemVrv.Id, LineNo = 1, Description = itemVrv.Name, Quantity = 48, UnitPrice = 45000m, Amount = 2160000m, Remarks = "Guest suites" },
            new BoqItem { BoqVersionId = boqV2.Id, ItemId = items[3].Id, LineNo = 2, Description = items[3].Name, Quantity = 8, UnitPrice = 320000m, Amount = 2560000m, Remarks = "Roof condensers" },
            new BoqItem { BoqVersionId = boqV2.Id, ItemId = itemCopper.Id, LineNo = 3, Description = itemCopper.Name, Quantity = 1200, UnitPrice = 620m, Amount = 744000m, Remarks = "Risers L1-L4" },
            new BoqItem { BoqVersionId = boqV2.Id, ItemId = itemLed.Id, LineNo = 4, Description = itemLed.Name, Quantity = 320, UnitPrice = 850m, Amount = 272000m, Remarks = "Corridors" },
            new BoqItem { BoqVersionId = boqV2.Id, ItemId = items[9].Id, LineNo = 5, Description = items[9].Name, Quantity = 1, UnitPrice = 450000m, Amount = 450000m, Remarks = "T&C" }
        );
        await db.SaveChangesAsync();
        var boqLines = await db.BoqItems.Where(b => b.BoqVersionId == boqV2.Id).OrderBy(b => b.LineNo).ToListAsync();

        // ── Milestone templates (PM-16) ────────────────────────────────────
        db.MilestoneTemplates.AddRange(
            new MilestoneTemplate
            {
                Name = "MEP Backward Schedule Template",
                ProjectTypeId = typeMep.Id,
                TemplateJson = """[{"name":"Handover","offsetDays":0},{"name":"Commissioning","offsetDays":-21},{"name":"Installation","offsetDays":-60},{"name":"Arrival on site","offsetDays":-90},{"name":"Shipment","offsetDays":-120},{"name":"Manufacture","offsetDays":-150},{"name":"PO / Procurement","offsetDays":-180}]""",
                CreatedAt = now
            },
            new MilestoneTemplate
            {
                Name = "Civil Standard Gates",
                ProjectTypeId = typeCivil.Id,
                TemplateJson = """[{"name":"Mobilization"},{"name":"Substructure"},{"name":"Superstructure"},{"name":"Finishes"},{"name":"Snagging"}]""",
                CreatedAt = now
            }
        );
        await db.SaveChangesAsync();

        // ── Milestones — backward from completion (PM-15..PM-18) ───────────
        var endMep = new DateOnly(2025, 10, 31);
        var msHandover = new Milestone { ProjectId = subMep.Id, Name = "Handover to Ops", Description = "Evidence: signed checklist", Status = "NotStarted", CompletionPercent = 0, DueDate = endMep, StartDate = endMep.AddDays(-7), CreatedAt = now };
        var msComm = new Milestone { ProjectId = subMep.Id, Name = "Commissioning & T&C", Status = "NotStarted", CompletionPercent = 10, DueDate = endMep.AddDays(-21), StartDate = endMep.AddDays(-35), CreatedAt = now };
        var msInstall = new Milestone { ProjectId = subMep.Id, Name = "Installation Complete", Status = "InProgress", CompletionPercent = 65, DueDate = endMep.AddDays(-60), StartDate = endMep.AddDays(-120), CreatedAt = now };
        var msArrival = new Milestone { ProjectId = subMep.Id, Name = "Material Arrival", Status = "Completed", CompletionPercent = 100, DueDate = endMep.AddDays(-90), StartDate = endMep.AddDays(-100), CreatedAt = now };
        var msProcure = new Milestone { ProjectId = subMep.Id, Name = "Procurement / PO", Status = "Completed", CompletionPercent = 100, DueDate = endMep.AddDays(-180), StartDate = endMep.AddDays(-200), CreatedAt = now };
        db.Milestones.AddRange(msHandover, msComm, msInstall, msArrival, msProcure);

        var msCiv1 = new Milestone { ProjectId = subCivil.Id, Name = "Waterproofing Sign-off", Status = "InProgress", CompletionPercent = 40, DueDate = new DateOnly(2025, 6, 30), StartDate = new DateOnly(2025, 5, 1), CreatedAt = now };
        db.Milestones.Add(msCiv1);
        await db.SaveChangesAsync();

        // ── Tasks + sub-tasks + daily updates (PM-18 / PM-19) ──────────────
        var taskPiping = new ProjectTask
        {
            ProjectId = subMep.Id,
            MilestoneId = msInstall.Id,
            Title = "Chilled Water Piping — Level 1 to 4",
            Description = "Insulated MS/copper risers; owner controls % completion.",
            AssignedTo = pm.Id,
            Status = "InProgress",
            CompletionPercent = 70,
            StartDate = new DateOnly(2025, 3, 15),
            DueDate = new DateOnly(2025, 6, 15),
            Remarks = "Delay risk on Level 3 east wing clash",
            CreatedAt = now
        };
        var taskVrv = new ProjectTask
        {
            ProjectId = subMep.Id,
            MilestoneId = msInstall.Id,
            Title = "VRV Condenser Mounting",
            Description = "8 outdoor units on service roof",
            AssignedTo = pm.Id,
            DependsOnTaskId = null,
            Status = "NotStarted",
            CompletionPercent = 0,
            StartDate = new DateOnly(2025, 6, 1),
            DueDate = new DateOnly(2025, 7, 20),
            CreatedAt = now
        };
        var taskInactive = new ProjectTask
        {
            ProjectId = subMep.Id,
            MilestoneId = msComm.Id,
            Title = "As-built drawings package",
            Description = "Inactive >7 days — exception assistant demo (PM-19)",
            AssignedTo = site.Id,
            Status = "InProgress",
            CompletionPercent = 15,
            StartDate = new DateOnly(2025, 5, 1),
            DueDate = new DateOnly(2025, 9, 15),
            Remarks = "No progress in prior seven days",
            CreatedAt = now.AddDays(-20),
            UpdatedAt = now.AddDays(-10)
        };
        db.Tasks.AddRange(taskPiping, taskVrv, taskInactive);
        await db.SaveChangesAsync();

        // dependency: VRV after piping
        taskVrv.DependsOnTaskId = taskPiping.Id;
        await db.SaveChangesAsync();

        var st1 = new SubTask { TaskId = taskPiping.Id, Title = "Level 1 riser hangers", AssignedTo = site.Id, Status = "Completed", CompletionPercent = 100, DueDate = new DateOnly(2025, 4, 1), Remarks = "Signed off", CreatedAt = now.AddDays(-40) };
        var st2 = new SubTask { TaskId = taskPiping.Id, Title = "Level 2–3 pipe insulation", AssignedTo = site.Id, Status = "InProgress", CompletionPercent = 60, DueDate = new DateOnly(2025, 5, 20), Remarks = "Material shortfall — foam lagging", CreatedAt = now.AddDays(-25) };
        var st3 = new SubTask { TaskId = taskPiping.Id, Title = "Level 4 pressure test", AssignedTo = site.Id, Status = "NotStarted", CompletionPercent = 0, DueDate = new DateOnly(2025, 6, 10), CreatedAt = now.AddDays(-10) };
        var st4 = new SubTask { TaskId = taskVrv.Id, Title = "Roof steel frame check", AssignedTo = site.Id, Status = "NotStarted", CompletionPercent = 0, DueDate = new DateOnly(2025, 6, 5), CreatedAt = now };
        db.SubTasks.AddRange(st1, st2, st3, st4);
        await db.SaveChangesAsync();

        db.TaskUpdates.AddRange(
            new TaskUpdate { TaskId = taskPiping.Id, SubTaskId = st1.Id, UpdatedBy = site.Id, UpdateDate = DateOnly.FromDateTime(now.AddDays(-35)), CompletionPercent = 100, Status = "Completed", Remarks = "Level 1 complete", CreatedAt = now.AddDays(-35) },
            new TaskUpdate { TaskId = taskPiping.Id, SubTaskId = st2.Id, UpdatedBy = site.Id, UpdateDate = DateOnly.FromDateTime(now.AddDays(-3)), CompletionPercent = 55, Status = "InProgress", Remarks = "Awaiting insulation delivery", CreatedAt = now.AddDays(-3) },
            new TaskUpdate { TaskId = taskPiping.Id, SubTaskId = st2.Id, UpdatedBy = site.Id, UpdateDate = DateOnly.FromDateTime(now.AddDays(-1)), CompletionPercent = 60, Status = "InProgress", Remarks = "Partial stock received", CreatedAt = now.AddDays(-1) },
            new TaskUpdate { TaskId = taskPiping.Id, UpdatedBy = pm.Id, UpdateDate = DateOnly.FromDateTime(now.AddDays(-1)), CompletionPercent = 70, Status = "InProgress", Remarks = "PM rolled up % from sub-tasks", CreatedAt = now.AddDays(-1) }
        );

        db.TaskAttachments.AddRange(
            new TaskAttachment { TaskId = taskPiping.Id, FileName = "site-photo-level2.jpg", FilePath = "/uploads/demo/site-photo-level2.jpg", UploadedBy = site.Id, UploadedAt = now.AddDays(-2) },
            new TaskAttachment { TaskId = taskPiping.Id, FileName = "daily-status-import.xlsx", FilePath = "/uploads/demo/daily-status-import.xlsx", UploadedBy = site.Id, UploadedAt = now.AddDays(-1) }
        );
        await db.SaveChangesAsync();

        // ── Purchase + actual costs (PM-09 / PM-21 / PM-22) — MEP CC ~85% spent → RAG amber/red flag
        db.PurchaseCosts.AddRange(
            new PurchaseCost { ProjectId = parentA.Id, CostCenterId = ccMep.Id, BoqItemId = boqLines[0].Id, Vendor = "CoolAir MEP Pvt Ltd", Description = "VRV FCU PO-7781", Amount = 2100000m, PurchaseDate = new DateOnly(2025, 2, 10), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-5) },
            new PurchaseCost { ProjectId = parentA.Id, CostCenterId = ccMep.Id, BoqItemId = boqLines[1].Id, Vendor = "CoolAir MEP Pvt Ltd", Description = "Outdoor condensers PO-7782", Amount = 2500000m, PurchaseDate = new DateOnly(2025, 2, 20), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-5) },
            new PurchaseCost { ProjectId = parentA.Id, CostCenterId = ccMep.Id, Vendor = "PipeTech India", Description = "Copper + insulation bulk", Amount = 900000m, PurchaseDate = new DateOnly(2025, 3, 5), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-4) },
            new PurchaseCost { ProjectId = parentA.Id, CostCenterId = ccCiv.Id, Vendor = "BuildRight", Description = "Cement & membrane", Amount = 4200000m, PurchaseDate = new DateOnly(2025, 2, 1), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-5) },
            new PurchaseCost { ProjectId = parentB.Id, CostCenterId = ccSpa.Id, Vendor = "ShellCon", Description = "Spa foundation package", Amount = 8500000m, PurchaseDate = new DateOnly(2025, 5, 1), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-2) }
        );

        // Actual spend pushes MEP CC to ~85% of 18L → RAG flag at 80%
        db.ActualCosts.AddRange(
            new ActualCost { ProjectId = parentA.Id, CostCenterId = ccMep.Id, Description = "Certified progress bill #1", Amount = 6000000m, CostDate = new DateOnly(2025, 4, 15), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-3) },
            new ActualCost { ProjectId = parentA.Id, CostCenterId = ccMep.Id, Description = "Certified progress bill #2", Amount = 4500000m, CostDate = new DateOnly(2025, 6, 15), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-1) },
            new ActualCost { ProjectId = parentA.Id, CostCenterId = ccMep.Id, Description = "Variation — ducting redesign", Amount = 900000m, CostDate = new DateOnly(2025, 7, 1), CreatedBy = finance.Id, CreatedAt = now.AddDays(-20) },
            new ActualCost { ProjectId = parentA.Id, CostCenterId = ccCiv.Id, Description = "Civil RA bill #3", Amount = 7100000m, CostDate = new DateOnly(2025, 5, 20), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-2) },
            new ActualCost { ProjectId = parentA.Id, CostCenterId = ccInt.Id, Description = "Deposit — FF&E vendor", Amount = 1500000m, CostDate = new DateOnly(2025, 6, 10), CreatedBy = finance.Id, CreatedAt = now.AddMonths(-1) }
        );
        await db.SaveChangesAsync();

        // Variance explanations (PM-24)
        db.VarianceExplanations.AddRange(
            new VarianceExplanation { ProjectId = parentA.Id, VarianceType = "Cost", Explanation = "MEP CC exceeded 80% of allocation due to ducting redesign after structural clash; board variation approved.", CreatedBy = finance.Id, CreatedAt = now.AddDays(-15) },
            new VarianceExplanation { ProjectId = parentA.Id, VarianceType = "Schedule", Explanation = "Level 3 piping delayed 12 days pending insulation stock and clash resolution.", CreatedBy = pm.Id, CreatedAt = now.AddDays(-5) }
        );
        await db.SaveChangesAsync();

        // ── Issues / incident tracker (requirement) ────────────────────────
        var issueClash = new Issue
        {
            ProjectId = subMep.Id,
            Title = "Ducting clash with beam B-14",
            What = "HVAC return air duct intersects RC beam B-14 on Level 3 East.",
            Location = "Level 3 — Corridor East",
            OccurredAt = now.AddDays(-5),
            ReportedBy = site.Id,
            Impact = "2-week delay risk on installation milestone; rework cost ~₹9L",
            PriorityId = prioHigh.Id,
            Status = "Open",
            IsEscalated = true,
            CreatedAt = now.AddDays(-5)
        };
        var issueSafety = new Issue
        {
            ProjectId = subCivil.Id,
            Title = "Scaffolding instability — North elevation",
            What = "Loose couplers reported during morning toolbox talk.",
            Location = "North elevation Level 2",
            OccurredAt = now.AddDays(-1),
            ReportedBy = site.Id,
            Impact = "Work stoppage until safety clearance",
            PriorityId = prioCrit.Id,
            Status = "Open",
            IsEscalated = true,
            CreatedAt = now.AddDays(-1)
        };
        var issueMat = new Issue
        {
            ProjectId = subMep.Id,
            Title = "Foam lagging shortfall",
            What = "Insulation stock short by ~200m",
            Location = "Site store",
            OccurredAt = now.AddDays(-8),
            ReportedBy = site.Id,
            Impact = "Sub-task Level 2–3 insulation slowed",
            PriorityId = prioMed.Id,
            Status = "InProgress",
            CreatedAt = now.AddDays(-8)
        };
        db.Issues.AddRange(issueClash, issueSafety, issueMat);
        await db.SaveChangesAsync();

        db.IssueComments.AddRange(
            new IssueComment { IssueId = issueClash.Id, UserId = pm.Id, Comment = "Raised RFI to structural consultant; interim route via service shaft.", CreatedAt = now.AddDays(-4) },
            new IssueComment { IssueId = issueClash.Id, UserId = site.Id, Comment = "Temporary hangers installed pending drawing revision.", CreatedAt = now.AddDays(-3) },
            new IssueComment { IssueId = issueSafety.Id, UserId = pm.Id, Comment = "Critical — notify all high-priority stakeholders (escalation mail).", CreatedAt = now.AddDays(-1) }
        );
        db.IssueAttachments.Add(new IssueAttachment
        {
            IssueId = issueClash.Id,
            FileName = "clash-photo.jpg",
            FilePath = "/uploads/demo/clash-photo.jpg",
            UploadedBy = site.Id,
            UploadedAt = now.AddDays(-5)
        });
        await db.SaveChangesAsync();

        // Escalation matrix (PM-07 / PM-20)
        var pmRole = await db.Roles.FirstAsync(r => r.Name == "ProjectManager");
        var finRole = await db.Roles.FirstAsync(r => r.Name == "FinanceOfficer");
        db.EscalationRules.AddRange(
            new EscalationRule { Name = "Budget CC ≥80% spent → Finance + PM", TriggerType = "BudgetRagAmber", DelayHours = 0, TargetRoleId = finRole.Id, IsActive = true, CreatedAt = now },
            new EscalationRule { Name = "Budget CC ≥100% → PM escalate", TriggerType = "BudgetRagRed", DelayHours = 4, TargetRoleId = pmRole.Id, IsActive = true, CreatedAt = now },
            new EscalationRule { Name = "High/Critical issue → stakeholders mail", TriggerType = "IssueHighPriority", DelayHours = 1, TargetRoleId = pmRole.Id, IsActive = true, CreatedAt = now },
            new EscalationRule { Name = "Milestone overdue", TriggerType = "MilestoneOverdue", DelayHours = 24, TargetRoleId = pmRole.Id, IsActive = true, CreatedAt = now },
            new EscalationRule { Name = "Task inactive 7 days", TriggerType = "TaskInactive7Days", DelayHours = 0, TargetRoleId = pmRole.Id, IsActive = true, CreatedAt = now }
        );
        await db.SaveChangesAsync();

        // Notifications (PM-20)
        var n1 = new Notification
        {
            Title = "RAG Amber — MEP Cost Center ≥80%",
            Body = "CC-MEP has consumed ~85% of ₹1.8 Cr allocation. Escalation mail queued to Finance & PM.",
            Type = "BudgetRag",
            RelatedType = "CostCenter",
            RelatedId = ccMep.Id,
            CreatedAt = now.AddDays(-2)
        };
        var n2 = new Notification
        {
            Title = "Critical Issue — Scaffolding",
            Body = "Safety stoppage on North elevation. Mail triggered to high-priority stakeholders.",
            Type = "IssueEscalation",
            RelatedType = "Issue",
            RelatedId = issueSafety.Id,
            CreatedAt = now.AddDays(-1)
        };
        var n3 = new Notification
        {
            Title = "Exception — As-built drawings inactive 7+ days",
            Body = "Task has not progressed in the prior seven days (PM-19).",
            Type = "TaskException",
            RelatedType = "Task",
            RelatedId = taskInactive.Id,
            CreatedAt = now
        };
        db.Notifications.AddRange(n1, n2, n3);
        await db.SaveChangesAsync();

        db.NotificationRecipients.AddRange(
            new NotificationRecipient { NotificationId = n1.Id, UserId = finance.Id, IsRead = false, SentEmail = true },
            new NotificationRecipient { NotificationId = n1.Id, UserId = pm.Id, IsRead = true, SentEmail = true, ReadAt = now.AddDays(-1) },
            new NotificationRecipient { NotificationId = n2.Id, UserId = pm.Id, IsRead = false, SentEmail = true },
            new NotificationRecipient { NotificationId = n2.Id, UserId = site.Id, IsRead = false, SentEmail = true },
            new NotificationRecipient { NotificationId = n2.Id, UserId = gm.Id, IsRead = false, SentEmail = true },
            new NotificationRecipient { NotificationId = n3.Id, UserId = pm.Id, IsRead = false, SentEmail = false }
        );
        await db.SaveChangesAsync();

        // Reports (PM-25..PM-29) — recipients = internal emails only
        var monthly = new Report
        {
            Name = "Monthly Project Report — Phase 1 Jul 2025",
            ReportType = "Monthly",
            ProjectId = parentA.Id,
            FilterJson = """{"month":"2025-07","include":["scope","progress","milestones","financials","risks","actions"]}""",
            SelectedColumns = "Project,Status,Budget,Actual,Variance,NextMilestone,OpenIssues",
            CreatedBy = pm.Id,
            CreatedAt = now.AddDays(-10)
        };
        var daily = new Report
        {
            Name = "Daily Site Report — MEP Piping",
            ReportType = "Daily",
            ProjectId = subMep.Id,
            FilterJson = """{"date":"today","source":"site-updates"}""",
            SelectedColumns = "Task,SubTask,Status,Percent,Remarks,UpdatedBy",
            CreatedBy = site.Id,
            CreatedAt = now.AddDays(-1)
        };
        var portfolio = new Report
        {
            Name = "Portfolio Status — All Authorized Projects",
            ReportType = "Portfolio",
            ProjectId = null,
            FilterJson = """{"resort":"GPLR"}""",
            SelectedColumns = "Code,Name,Status,BudgetPosition,ScheduleRisk,Exceptions",
            CreatedBy = admin.Id,
            CreatedAt = now.AddDays(-3)
        };
        var handover = new Report
        {
            Name = "Project Completion / Handover Report — Tower B Chiller",
            ReportType = "Completion",
            ProjectId = closedProj.Id,
            SelectedColumns = "Summary,Scope,Financials,Snags,Inventory,Signatures",
            CreatedBy = pm.Id,
            CreatedAt = now.AddYears(-1)
        };
        db.Reports.AddRange(monthly, daily, portfolio, handover);
        await db.SaveChangesAsync();

        db.ReportRecipients.AddRange(
            new ReportRecipient { ReportId = monthly.Id, UserId = pm.Id, Email = pm.Email },
            new ReportRecipient { ReportId = monthly.Id, UserId = finance.Id, Email = finance.Email },
            new ReportRecipient { ReportId = monthly.Id, UserId = gm.Id, Email = gm.Email },
            new ReportRecipient { ReportId = daily.Id, UserId = pm.Id, Email = pm.Email },
            new ReportRecipient { ReportId = portfolio.Id, UserId = admin.Id, Email = admin.Email },
            new ReportRecipient { ReportId = portfolio.Id, UserId = auditor.Id, Email = auditor.Email },
            new ReportRecipient { ReportId = handover.Id, UserId = pm.Id, Email = pm.Email }
            // external owner intentionally omitted — internal-only send list (PM-28)
        );
        await db.SaveChangesAsync();

        // Leftover inventory + PCR (PM-30 closure gate)
        db.Inventories.AddRange(
            new Inventory { ProjectId = closedProj.Id, ItemId = itemCopper.Id, Description = "Leftover copper pipe", Quantity = 45, UnitId = unitM.Id, Remarks = "Returned to central store", CreatedAt = now.AddYears(-1) },
            new Inventory { ProjectId = closedProj.Id, ItemId = itemLed.Id, Description = "Spare LED panels", Quantity = 12, UnitId = unitNos.Id, Remarks = "Transfer to Phase 1", CreatedAt = now.AddYears(-1) },
            new Inventory { ProjectId = subMep.Id, ItemId = itemCopper.Id, Description = "Open balance on site", Quantity = 80, UnitId = unitM.Id, Remarks = "Must update before close", CreatedAt = now }
        );

        db.ProjectCompletionReports.Add(new ProjectCompletionReport
        {
            ProjectId = closedProj.Id,
            HandoverNotes = "Chiller replacement handed over to Ops. All snags closed. Inventory updated.",
            SignedDocumentPath = "/uploads/demo/pcr-tower-b-signed.pdf",
            IsMandatoryComplete = true,
            ClosedBy = pm.Id,
            ClosedAt = now.AddYears(-1).AddDays(10),
            CreatedAt = now.AddYears(-1)
        });
        await db.SaveChangesAsync();

        db.FileRecords.AddRange(
            new FileRecord { FileName = "pcr-tower-b-signed.pdf", FilePath = "/uploads/demo/pcr-tower-b-signed.pdf", ContentType = "application/pdf", SizeBytes = 245000, Module = "Closure", RelatedId = closedProj.Id, UploadedBy = pm.Id, UploadedAt = now.AddYears(-1) },
            new FileRecord { FileName = "boq-vendor-flexible.xlsx", FilePath = "/uploads/demo/boq-vendor-flexible.xlsx", ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", SizeBytes = 88000, Module = "BOQ", RelatedId = boq.Id, UploadedBy = pm.Id, UploadedAt = now.AddMonths(-4) },
            new FileRecord { FileName = "milestone-template-msp.xml", FilePath = "/uploads/demo/milestone-template-msp.xml", ContentType = "application/xml", SizeBytes = 12000, Module = "Milestones", RelatedId = subMep.Id, UploadedBy = pm.Id, UploadedAt = now.AddMonths(-3) }
        );

        // Audit trail (PM-05)
        db.AuditLogs.AddRange(
            new AuditLog { UserId = admin.Id, Action = "Create", EntityName = "Project", EntityId = parentA.Id, Details = "Created parent project PRJ-GPLR-01", CreatedAt = now.AddMonths(-6) },
            new AuditLog { UserId = pm.Id, Action = "Assign", EntityName = "ProjectUser", EntityId = parentA.Id, Details = "Assigned site@wisetrack.local to Phase 1", CreatedAt = now.AddMonths(-5) },
            new AuditLog { UserId = finance.Id, Action = "Approve", EntityName = "Budget", EntityId = budgetA.Id, Details = "Budget v2 approved — steel escalation", CreatedAt = now.AddMonths(-2) },
            new AuditLog { UserId = pm.Id, Action = "Import", EntityName = "Boq", EntityId = boq.Id, Details = "Flexible Excel BOQ import committed after validation", CreatedAt = now.AddMonths(-4) },
            new AuditLog { UserId = pm.Id, Action = "Permission", EntityName = "ProjectPermission", EntityId = parentA.Id, Details = "External owner: Projects view only; Budgets denied", CreatedAt = now.AddMonths(-5) },
            new AuditLog { UserId = site.Id, Action = "Update", EntityName = "SubTask", EntityId = st2.Id, Details = "Daily % update 55→60", CreatedAt = now.AddDays(-1) },
            new AuditLog { UserId = pm.Id, Action = "Report", EntityName = "Report", EntityId = monthly.Id, Details = "Generated monthly report; recipients internal only", CreatedAt = now.AddDays(-10) },
            new AuditLog { UserId = pm.Id, Action = "Close", EntityName = "Project", EntityId = closedProj.Id, Details = "Closed after signed PCR + inventory update", CreatedAt = now.AddYears(-1).AddDays(10) }
        );
        await db.SaveChangesAsync();
    }

    private static async Task WipeDemoResortAsync(AppDbContext db, string resortCode)
    {
        var resort = await db.Resorts.FirstOrDefaultAsync(r => r.Code == resortCode);
        if (resort == null) return;

        var projectIds = await db.Projects.Where(p => p.ResortId == resort.Id).Select(p => p.Id).ToListAsync();
        if (projectIds.Count == 0)
        {
            db.Resorts.Remove(resort);
            await db.SaveChangesAsync();
            return;
        }

        var budgetIds = await db.Budgets.Where(b => projectIds.Contains(b.ProjectId)).Select(b => b.Id).ToListAsync();
        var boqIds = await db.Boqs.Where(b => projectIds.Contains(b.ProjectId)).Select(b => b.Id).ToListAsync();
        var boqVersionIds = await db.BoqVersions.Where(v => boqIds.Contains(v.BoqId)).Select(v => v.Id).ToListAsync();
        var taskIds = await db.Tasks.Where(t => projectIds.Contains(t.ProjectId)).Select(t => t.Id).ToListAsync();
        var issueIds = await db.Issues.Where(i => projectIds.Contains(i.ProjectId)).Select(i => i.Id).ToListAsync();
        var reportIds = await db.Reports.Where(r => r.ProjectId != null && projectIds.Contains(r.ProjectId.Value)).Select(r => r.Id).ToListAsync();
        var notifIds = await db.Notifications
            .Where(n =>
                (n.RelatedType == "Issue" && n.RelatedId != null && issueIds.Contains(n.RelatedId.Value)) ||
                (n.RelatedType == "Task" && n.RelatedId != null && taskIds.Contains(n.RelatedId.Value)) ||
                n.RelatedType == "CostCenter")
            .Select(n => n.Id)
            .ToListAsync();

        db.ReportRecipients.RemoveRange(db.ReportRecipients.Where(x => reportIds.Contains(x.ReportId)));
        db.Reports.RemoveRange(db.Reports.Where(x => reportIds.Contains(x.Id)));
        var portfolioReports = await db.Reports.Where(x => x.ReportType == "Portfolio").ToListAsync();
        var portfolioIds = portfolioReports.Select(r => r.Id).ToList();
        db.ReportRecipients.RemoveRange(db.ReportRecipients.Where(x => portfolioIds.Contains(x.ReportId)));
        db.Reports.RemoveRange(portfolioReports);
        db.NotificationRecipients.RemoveRange(db.NotificationRecipients.Where(x => notifIds.Contains(x.NotificationId)));
        db.Notifications.RemoveRange(db.Notifications.Where(x => notifIds.Contains(x.Id)));
        db.IssueAttachments.RemoveRange(db.IssueAttachments.Where(x => issueIds.Contains(x.IssueId)));
        db.IssueComments.RemoveRange(db.IssueComments.Where(x => issueIds.Contains(x.IssueId)));
        db.Issues.RemoveRange(db.Issues.Where(x => issueIds.Contains(x.Id)));
        db.TaskAttachments.RemoveRange(db.TaskAttachments.Where(x => taskIds.Contains(x.TaskId)));
        db.TaskUpdates.RemoveRange(db.TaskUpdates.Where(x => taskIds.Contains(x.TaskId)));
        db.SubTasks.RemoveRange(db.SubTasks.Where(x => taskIds.Contains(x.TaskId)));
        var tasks = await db.Tasks.Where(x => taskIds.Contains(x.Id)).ToListAsync();
        foreach (var t in tasks) t.DependsOnTaskId = null;
        await db.SaveChangesAsync();
        db.Tasks.RemoveRange(tasks);
        db.Milestones.RemoveRange(db.Milestones.Where(x => projectIds.Contains(x.ProjectId)));
        db.BoqItems.RemoveRange(db.BoqItems.Where(x => boqVersionIds.Contains(x.BoqVersionId)));
        db.BoqVersions.RemoveRange(db.BoqVersions.Where(x => boqIds.Contains(x.BoqId)));
        db.Boqs.RemoveRange(db.Boqs.Where(x => boqIds.Contains(x.Id)));
        db.PurchaseCosts.RemoveRange(db.PurchaseCosts.Where(x => projectIds.Contains(x.ProjectId)));
        db.ActualCosts.RemoveRange(db.ActualCosts.Where(x => projectIds.Contains(x.ProjectId)));
        db.BudgetAllocations.RemoveRange(db.BudgetAllocations.Where(x => budgetIds.Contains(x.BudgetId)));
        db.BudgetVersions.RemoveRange(db.BudgetVersions.Where(x => budgetIds.Contains(x.BudgetId)));
        db.Budgets.RemoveRange(db.Budgets.Where(x => budgetIds.Contains(x.Id)));
        db.CostCenters.RemoveRange(db.CostCenters.Where(x => x.ProjectId != null && projectIds.Contains(x.ProjectId.Value)));
        db.VarianceExplanations.RemoveRange(db.VarianceExplanations.Where(x => projectIds.Contains(x.ProjectId)));
        db.Inventories.RemoveRange(db.Inventories.Where(x => projectIds.Contains(x.ProjectId)));
        db.ProjectCompletionReports.RemoveRange(db.ProjectCompletionReports.Where(x => projectIds.Contains(x.ProjectId)));
        db.ProjectPermissions.RemoveRange(db.ProjectPermissions.Where(x => projectIds.Contains(x.ProjectId)));
        db.ProjectUsers.RemoveRange(db.ProjectUsers.Where(x => projectIds.Contains(x.ProjectId)));
        db.FileRecords.RemoveRange(db.FileRecords.Where(x => x.FilePath.StartsWith("/uploads/demo/")));
        db.AuditLogs.RemoveRange(db.AuditLogs.Where(x => x.Details != null && x.Details.Contains("GPLR") || x.Details != null && x.Details.Contains("PRJ-GPLR")));
        await db.SaveChangesAsync();

        for (var i = 0; i < 5; i++)
        {
            var leaves = await db.Projects
                .Where(p => projectIds.Contains(p.Id) && !db.Projects.Any(c => c.ParentProjectId == p.Id))
                .ToListAsync();
            if (leaves.Count == 0) break;
            db.Projects.RemoveRange(leaves);
            await db.SaveChangesAsync();
        }

        db.Properties.RemoveRange(db.Properties.Where(p => p.ResortId == resort.Id));
        db.Resorts.Remove(resort);
        await db.SaveChangesAsync();

        // Refresh item master with rich demo catalog
        db.BoqItems.RemoveRange(db.BoqItems);
        db.Inventories.RemoveRange(db.Inventories);
        db.Items.RemoveRange(db.Items);
        db.Brands.RemoveRange(db.Brands);
        db.ItemCategories.RemoveRange(db.ItemCategories);
        db.EscalationRules.RemoveRange(db.EscalationRules);
        db.MilestoneTemplates.RemoveRange(db.MilestoneTemplates);
        await db.SaveChangesAsync();
    }

    private static async Task<Role> EnsureRoleAsync(AppDbContext db, string name, string description)
    {
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == name);
        if (role != null) return role;
        role = new Role { Name = name, Description = description, CreatedAt = DateTime.UtcNow };
        db.Roles.Add(role);
        return role;
    }

    private static async Task EnsureRolePermsAsync(AppDbContext db, long roleId, IEnumerable<long> permissionIds)
    {
        var existing = await db.RolePermissions.Where(rp => rp.RoleId == roleId).Select(rp => rp.PermissionId).ToListAsync();
        foreach (var pid in permissionIds.Distinct())
        {
            if (!existing.Contains(pid))
                db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = pid });
        }
    }

    private static async Task<User> EnsureUserAsync(AppDbContext db, string email, string fullName, bool isInternal, long roleId, string? phone)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            user = new User
            {
                Email = email,
                FullName = fullName,
                PasswordHash = PasswordUtility.Hash(DemoPassword),
                IsActive = true,
                IsInternal = isInternal,
                Phone = phone,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            await db.SaveChangesAsync();
        }
        return user;
    }

    public static async Task EnsureUserBasedAccessAsync(AppDbContext db)
    {
        var modules = new[] { "Projects", "Budgets", "Costs", "BOQ", "Tasks", "Issues", "Reports", "Closure" };
        var pmRole = await db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == "ProjectManager");
        if (pmRole == null) return;

        var pmUserIds = await db.UserRoles.Where(ur => ur.RoleId == pmRole.Id).Select(ur => ur.UserId).ToListAsync();
        var owned = await db.Projects.AsNoTracking()
            .Where(p => p.OwnerId != null && pmUserIds.Contains(p.OwnerId.Value))
            .Select(p => new { p.Id, OwnerId = p.OwnerId!.Value })
            .ToListAsync();

        foreach (var row in owned)
        {
            foreach (var module in modules)
            {
                var exists = await db.ProjectPermissions.AnyAsync(p =>
                    p.UserId == row.OwnerId && p.ProjectId == row.Id && p.Module == module);
                if (exists) continue;
                db.ProjectPermissions.Add(new ProjectPermission
                {
                    UserId = row.OwnerId,
                    ProjectId = row.Id,
                    Module = module,
                    CanView = true,
                    CanEdit = true
                });
            }
        }
        await db.SaveChangesAsync();
    }
}
