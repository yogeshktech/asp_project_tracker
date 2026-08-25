================================================================================
WISETRACK ENGINEERING PROJECT CONTROL & RESORT PORTFOLIO SUITE (v2.4 ENTERPRISE)
================================================================================

All requirements from "requirments/Engg. Project Tracking-Wisetrack-v0.1.docx" have been fully integrated:

1. SHARED UNIFIED HEADER & FOOTER:
   - Modular PHP includes: `includes/header.php`, `includes/sidebar.php`, `includes/workflow-bar.php`, `includes/footer.php`.
   - Complete static HTML pages synced with exact header, sidebar, topbar resort selector, search, role simulator, and modal engine.

2. LOGIN & AUTHENTICATION FLOW:
   - `login.php` / `login.html`: Dedicated sign-in page with quick demo login role pills (Project Admin, Project Manager, Site Engineer, Finance Officer, Auditor, Resort GM).
   - Global Role Switcher in the topbar to test different permission viewpoints live.

3. STEP-BY-STEP GUIDED LIFECYCLE:
   - Step 1: Resort Setup (`resorts.php` / `resorts.html`)
   - Step 2: N-Level Projects & Packages (`projects.php` / `projects.html`)
   - Step 3: Gateway Milestones (`milestones.php` / `milestones.html`)
   - Step 4: BOQ & Rate Master (`boq.php` / `boq.html`)
   - Step 5: Budget Baselines & 80% RAG Alerts (`budget.php` / `budget.html`)
   - Step 6: Daily Site Logs & Issues (`daily-report.php` / `daily-report.html` & `issues.php` / `issues.html`)
   - Step 7: Leftover Inventory & Mandatory Closure Gate (`inventory.php` / `inventory.html`)
   - Step 8: Governance, Roles & Audit (`users.php` / `users.html` & `audit-logs.php` / `audit-logs.html`)
   - Full Playbook: `workflow.php` / `workflow.html`

4. RESORT CREATION & N-LEVEL PROJECT CREATION:
   - "＋ Create Resort" modal: Add new master resort property with location, budget ceiling, GM, and target opening.
   - "＋ Create N-Level Project" modal: Create Level 1 Root Projects, Level 2 Sub-Projects, or Level 3 Work Packages nested under any parent project or resort.
   - Interactive N-Level Tree Explorer in `projects.php` / `projects.html` with expand/collapse hierarchy.

5. ROLES & GRANULAR PERMISSIONS MATRIX:
   - `users.php` / `users.html` includes:
     * User Directory with field masking rules (e.g. rates hidden from Site Engineers).
     * Interactive Module-by-Module Granular Permissions Matrix (View, Create, Edit, Delete, Approve).
     * Role definitions for 6 corporate roles.

6. HOW TO RUN:
   - OPTION A (PHP Server with modular header/footer):
     Run in terminal: `php -S localhost:8000`
     Open: `http://localhost:8000/login.php` or `http://localhost:8000/dashboard.php`
   - OPTION B (Direct HTML / Live Server):
     Open `login.html` or `dashboard.html` or `index.html` directly in any web browser.

7. API CONNECTION (ASP.NET Core Backend) — LIVE MODE:
   IMPORTANT: Open frontend ONLY through the API host (not by double-clicking HTML files).

   1. Ensure PostgreSQL is running and database `wisetrack` exists
      (run Database/wisetrack_schema.sql + wisetrack_schema_v2_migration.sql in DBeaver if needed).
   2. Start API:  `dotnet run --launch-profile http`
   3. Open browser:  http://localhost:5189/app/login.html
   4. Login with seeded admin:
        Email:    admin@wisetrack.local
        Password: Admin@123
   5. Pages (Resorts / Projects / Users / Dashboard / Issues / Items / Notifications / Audit)
      now load from live APIs — static demo data is hidden.

   API base: http://localhost:5189/api
   Swagger:  http://localhost:5189/swagger
================================================================================