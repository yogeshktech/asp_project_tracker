<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">PMO Requirement Workflow Guide (PM-01 to PM-30)</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STANDARDIZED WORKFLOW · END-TO-END PMO PLAYBOOK</div>
      <h1>Wisetrack Application Workflow & Requirement Guide</h1>
      <p>Complete end-to-end execution flow mapped directly to requirements <strong>PM-01 through PM-30</strong> from <code>Engg. Project Tracking-Wisetrack-v0.1.docx</code>.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + Create Resort</button>
      <button class="btn primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Create N-Level Project</button>
    </div>
  </div>

  <!-- Summary Banner -->
  <div class="card" style="background:linear-gradient(135deg, #1e3a8a, #1d4ed8); color:#ffffff; padding:20px 24px; margin-bottom:24px; border:none;">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <div style="font-size:11px; font-weight:800; letter-spacing:1px; opacity:0.85; text-transform:uppercase;">MASTER ARCHITECTURE HIERARCHY</div>
        <h2 style="font-size:20px; font-weight:800; margin:4px 0 6px; color:#fff;">Resort Destination ➔ Level 1 Root Project ➔ Level 2 Sub-Project ➔ Level 3 Work Package ➔ Daily Tasks</h2>
        <p style="font-size:13px; opacity:0.9; margin:0; max-width:850px;">
          Every project package is treated as an independent Cost Center (CC). Tracks budget baselines, contractor BOQs, daily site progress %, automated 80% RAG escalation alerts, and hard gatekeeper closure.
        </p>
      </div>
      <span class="badge" style="background:rgba(255,255,255,0.2); color:#fff; font-size:13px; padding:6px 14px; border:1px solid rgba(255,255,255,0.3);">
        ✓ 100% Requirement Compliance
      </span>
    </div>
  </div>

  <!-- Step-by-Step 8 Stages Grid -->
  <div class="grid g2">

    <!-- STAGE 1 -->
    <div class="card" style="border-left: 5px solid #2563eb;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge blue">STAGE 1</span>
        <span class="badge gray">PM-01, PM-02, PM-06</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">1. Resort Property & Master Portfolio Setup</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        Super Admin creates the master resort destination profile. Sets overall destination CapEx ceiling, assigned General Manager, destination code, and target opening date.
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 User Actions:</b> Click <code>+ New Resort</code> in topbar or Resorts page.</div>
        <div><b>🔹 Key Data:</b> Resort Code (<code>RES-GOA-01</code>), CapEx Budget (₹48.50 Cr), Location, GM signoff authority.</div>
        <div><b>🔹 Security:</b> Users only see resorts they are explicitly authorized to access (PM-02).</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <button class="btn sm primary" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + Create Resort</button>
        <a href="index.php?page=resorts" class="btn sm">Go to Resorts ➔</a>
      </div>
    </div>

    <!-- STAGE 2 -->
    <div class="card" style="border-left: 5px solid #7c3aed;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge" style="background:#f3e8ff; color:#7c3aed; border:1px solid #e9d5ff;">STAGE 2</span>
        <span class="badge gray">PM-06, PM-07, PM-09</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">2. N-Level Projects & WBS Packages</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        Build infinite multi-level WBS packages: <strong>Level 1 Root</strong> (Civil, MEP, Renovation) ➔ <strong>Level 2 Sub-Projects</strong> (Guest Wings, Substation) ➔ <strong>Level 3 Work Packages</strong> (Transformers, Cables).
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 Hierarchy Rule:</b> Each sub-project is considered an independent Cost Center (CC) under the parent.</div>
        <div><b>🔹 Live Preview:</b> Modal shows colored level pill before creating (<code>🔵 Level 1</code>, <code>🟣 Level 2</code>, <code>🟢 Level 3</code>).</div>
        <div><b>🔹 Super Admin Rights:</b> Ability to add, modify, reparent, or delete any sub-project package.</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <button class="btn sm primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Add Project</button>
        <a href="index.php?page=projects" class="btn sm">Explore N-Level Tree ➔</a>
      </div>
    </div>

    <!-- STAGE 3 -->
    <div class="card" style="border-left: 5px solid #059669;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge green">STAGE 3</span>
        <span class="badge gray">PM-15, PM-16, PM-17, PM-18</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">3. Gateway Milestones & Backward Scheduling</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        Establish critical path gateways. Uses <strong>backward scheduling</strong>: starts from required Handover date backward through CEIG approval, testing, installation, delivery, and procurement freeze.
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 Reusable Templates (PM-16):</b> Clone milestone templates from previous projects, Excel, or MS Project.</div>
        <div><b>🔹 Exception Assistant (PM-19):</b> Flags any milestone or task that has had zero progress in the last 7 days.</div>
        <div><b>🔹 Evidence Upload:</b> Attach statutory approvals, CEIG inspection certificates, and quality approvals.</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <button class="btn sm primary" onclick="openAddMilestoneModal()"><i class="fa-solid fa-flag"></i> + Milestone</button>
        <a href="index.php?page=milestones" class="btn sm">Milestones Tracker ➔</a>
      </div>
    </div>

    <!-- STAGE 4 -->
    <div class="card" style="border-left: 5px solid #d97706;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a;">STAGE 4</span>
        <span class="badge gray">PM-10, PM-11, PM-12, PM-13, PM-14</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">4. Flexible BOQ Import & Item Rate Master</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        Import 3rd-party contractor Excel BOQs without rigid templates. Intelligent auto-mapper links line items to the central <strong>Item DB</strong> (Polycab, Schneider, ABB, Daikin) with purchase price baselines.
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 Item DB Fields:</b> Item Code, Unit, Purchase Price, Description, Image, Brand, and Remarks.</div>
        <div><b>🔹 Validation Engine (PM-11):</b> Validates duplicate codes, units, and malformed rates before committing.</div>
        <div><b>🔹 Baseline Lock (PM-14):</b> Preserves original approved BOQ baseline and tracks version revisions.</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <button class="btn sm primary" onclick="openExcelImportModal()"><i class="fa-solid fa-file-excel"></i> Import BOQ</button>
        <a href="index.php?page=boq" class="btn sm">View BOQ Module ➔</a>
      </div>
    </div>

    <!-- STAGE 5 -->
    <div class="card" style="border-left: 5px solid #dc2626;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge danger">STAGE 5</span>
        <span class="badge gray">PM-07, PM-08, PM-21, PM-22, PM-24</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">5. Budget Baselines & 80% RAG Escalation Alerts</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        Distribute funds across Cost Centers. <strong>Mandatory 80% Rule:</strong> Whenever 80% of a Cost Center's budget is committed/spent, the system automatically triggers Red RAG flags and email alerts.
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 Escalation Matrix:</b> High-priority email notification sent automatically to PM, Finance Controller, and GM.</div>
        <div><b>🔹 Variance Explanations (PM-24):</b> Users must record reasons for cost/schedule variances.</div>
        <div><b>🔹 Revision History (PM-08):</b> Full audit trail of budget revisions with dates, approvers, and justification.</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <button class="btn sm" onclick="openAddCostModal()"><i class="fa-solid fa-receipt"></i> Log Expense</button>
        <a href="index.php?page=budget" class="btn sm">Budget & Cost Centers ➔</a>
      </div>
    </div>

    <!-- STAGE 6 -->
    <div class="card" style="border-left: 5px solid #8b5cf6;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge" style="background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe;">STAGE 6</span>
        <span class="badge gray">PM-18, PM-19, Incident Tracker</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">6. Daily Site Reports (DSR) & Incident Tracker</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        Site Engineers log daily progress %, manpower count, and geo-tagged photo evidence. Any roadblock (customs delay, drawing revision, vendor failure) is logged into the Incident Tracker.
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 Sub-Task % Lock:</b> Progress % can ONLY be modified by the designated Task Owner (PM-18).</div>
        <div><b>🔹 Status Dropdown & Remarks:</b> Site team selects Status and adds remarks explaining reasons for delay.</div>
        <div><b>🔹 Incident Email Alerts:</b> High-priority issues instantly trigger email alerts with Location, Impact & Owner.</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <button class="btn sm primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Submit DSR</button>
        <a href="index.php?page=daily-report" class="btn sm">Daily Reports ➔</a>
      </div>
    </div>

    <!-- STAGE 7 -->
    <div class="card" style="border-left: 5px solid #0284c7;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge blue">STAGE 7</span>
        <span class="badge gray">PM-25, PM-26, PM-27, PM-28, PM-29</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">7. Multi-Project Dashboards & Internal Export Whitelist</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        Executives and PMs get real-time portfolio dashboards showing overall project counts, health status, and live site velocity. On-demand report generator creates branded PDF/Excel summaries.
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 Whitelist Email Rule (PM-28):</b> Reports can ONLY be dispatched to approved internal team emails.</div>
        <div><b>🔹 Customizable Columns:</b> Users can select exactly which columns to include in exported summaries.</div>
        <div><b>🔹 Daily vs Cumulative Velocity:</b> Tracks today's site update progress alongside total until-date completion %.</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <a href="index.php?page=dashboard" class="btn sm primary">Portfolio Dashboard ➔</a>
        <a href="index.php?page=reports" class="btn sm">Reports Generator ➔</a>
      </div>
    </div>

    <!-- STAGE 8 -->
    <div class="card" style="border-left: 5px solid #047857;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="badge green">STAGE 8</span>
        <span class="badge gray">PM-30, Mandatory Closure</span>
      </div>
      <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">8. Leftover Inventory & Mandatory Closure Gate</h3>
      <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
        <strong>Hard Gatekeeper Rule:</strong> A project CANNOT be marked completed or closed until surplus leftover materials are reconciled and a signed Handover Certificate from the GM is uploaded.
      </p>
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
        <div><b>🔹 Step A:</b> Leftover Inventory Reconcile (cables, leftover switchgear, tiles recorded with quantity & store action).</div>
        <div><b>🔹 Step B:</b> Project Completion Handover Report (signed PDF upload by General Manager / PM).</div>
        <div><b>🔹 Step C:</b> Formal Closure Execution (only authorized Project Manager or Super Admin can close).</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
        <button class="btn sm success" onclick="openHandoverModal()"><i class="fa-solid fa-lock"></i> Handover Signoff</button>
        <a href="index.php?page=inventory" class="btn sm">Inventory & Closure ➔</a>
      </div>
    </div>

  </div>

  <!-- Role Responsibilities Matrix Section -->
  <div class="card" style="margin-top:24px;">
    <div class="card-header">
      <div>
        <h3 class="card-title">Governance & Role-Based Responsibilities Matrix (PM-02 & PM-03)</h3>
        <div class="card-subtitle">Granular access rights, field masking, and module responsibilities across corporate roles</div>
      </div>
      <a href="index.php?page=users" class="btn sm">Manage Users & Matrix ➔</a>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>ROLE TITLE</th>
            <th>PRIMARY RESPONSIBILITIES IN WORKFLOW</th>
            <th>ACCESSIBLE MODULES</th>
            <th>FIELD MASKING & RESTRICTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong style="color:#1d4ed8;">Super / Project Admin</strong></td>
            <td>Full system setup, Resort creation, N-level project definition, budget baseline approvals, role management, and audit log inspection.</td>
            <td><span class="badge blue">All Modules (Full Access)</span></td>
            <td>None (Unrestricted access)</td>
          </tr>
          <tr>
            <td><strong style="color:#7c3aed;">Project Manager (PM)</strong></td>
            <td>Milestone planning, backward scheduling, contractor BOQ version approvals, vendor POs, issue resolution, and project closure execution.</td>
            <td><span class="badge green">Projects, Milestones, BOQ, Budget, Closure</span></td>
            <td>Restricted from editing admin system roles.</td>
          </tr>
          <tr>
            <td><strong style="color:#059669;">Site Engineer</strong></td>
            <td>Submits Daily Site Reports (DSR), updates sub-task completion %, logs geo-tagged site photos, and records site roadblocks into Issue Tracker.</td>
            <td><span class="badge green">Daily Reports, Issues, Tasks</span></td>
            <td><strong>Field Masked:</strong> Commercial unit rates, vendor purchase prices, and contract baselines are hidden.</td>
          </tr>
          <tr>
            <td><strong style="color:#d97706;">Finance / Cost Controller</strong></td>
            <td>Monitors Cost Center expenditures, approves budget revisions, tracks 80% RAG variance alerts, and reconciles commercial line items.</td>
            <td><span class="badge amber">Budget, Cost Centers, Reports, Invoices</span></td>
            <td>Cannot modify site milestone dates.</td>
          </tr>
          <tr>
            <td><strong style="color:#dc2626;">Quality & Safety Auditor</strong></td>
            <td>Reviews milestone evidence, inspects CEIG statutory clearance files, audits leftover inventory reconciliation before handover.</td>
            <td><span class="badge blue">Milestones, Audit Logs, Inventory</span></td>
            <td>Read-only view on budgets and commercial rates.</td>
          </tr>
          <tr>
            <td><strong style="color:#047857;">Resort General Manager (GM)</strong></td>
            <td>Reviews executive portfolio summaries, monitors overall resort progress, approves major scope changes, and signs Handover Certificate.</td>
            <td><span class="badge green">Dashboard, Reports, Handover Gate</span></td>
            <td>Restricted to assigned resort property only.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

