<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=projects">Projects</a>
    <span>/</span>
    <span class="current">Planning & Work Breakdown Structure (WBS)</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 3 · TASK & SUB-TASK EXECUTION ENGINE · PM-18 COMPLIANCE</div>
      <h1>Planning & Work Breakdown Structure (WBS)</h1>
      <p>Hierarchical task management: Root Package ➔ Main Task ➔ Sub-Tasks with daily % completion, site status dropdown, and attachments.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="openCreateSubTaskModal()"><i class="fa-solid fa-plus"></i> Create Sub-Task</button>
      <button class="btn primary" onclick="openModal('Create New Task / WBS Element', '<form onsubmit=\'event.preventDefault();closeModal();showToast(\x22Main Task created successfully!\x22)\'><div class=\x22form-grid\x22><div class=\x22field full\x22><label>Main Task Title *</label><input required placeholder=\x22e.g. Main Substation 11kV HT/LT Installation\x22></div><div class=\x22field\x22><label>Parent WBS Node</label><select><option>Grand Resort — MEP (GR-MEP-001)</option><option>Civil Structure (GR-CIV-001)</option></select></div><div class=\x22field\x22><label>Task Owner (Responsible Lead)</label><select><option>Rahul Sharma (PM)</option><option>Amit Verma (Site Engg)</option><option>Manoj Joshi (HVAC Lead)</option></select></div><div class=\x22field\x22><label>Target Date</label><input type=\x22date\x22 value=\x222026-10-15\x22></div><div class=\x22field\x22><label>Weightage %</label><input type=\x22number\x22 value=\x2225\x22></div></div><div class=\x22modalfoot\x22 style=\x22padding:0;margin-top:14px;\x22><button type=\x22button\x22 class=\x22btn\x22 onclick=\x22closeModal()\x22>Cancel</button><button type=\x22submit\x22 class=\x22btn primary\x22><i class=\x22fa-solid fa-plus\x22></i> Create Main Task</button></div></form>')"><i class="fa-solid fa-plus"></i> Add Main Task</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi success">
      <span class="kpi-label">Completed Tasks</span>
      <span class="kpi-value">61 Tasks</span>
      <span class="kpi-sub">74.3% WBS completed</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">In Progress</span>
      <span class="kpi-value">16 Tasks</span>
      <span class="kpi-sub">Under active site execution</span>
    </div>
    <div class="kpi warning">
      <span class="kpi-label">Tasks At Risk</span>
      <span class="kpi-value">3 Tasks</span>
      <span class="kpi-sub">HVAC chiller piping & port delay</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Total Assigned</span>
      <span class="kpi-value">82 Tasks</span>
      <span class="kpi-sub">Across 6 engineers</span>
    </div>
  </div>

  <!-- Task & Nested Sub-Tasks WBS Structure -->
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Grand Resort — MEP & Automation (GR-MEP-001)</h3>
        <div class="card-subtitle">Main Tasks and nested Sub-Tasks hierarchy with daily progress controls</div>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="openExcelDsrImportModal()"><i class="fa-solid fa-file-excel"></i> Bulk Import Updates</button>
        <button class="btn sm primary" onclick="openCreateSubTaskModal()"><i class="fa-solid fa-plus"></i> Add Sub-Task</button>
      </div>
    </div>

    <!-- Main Task 1 -->
    <div style="border:1px solid var(--border-color); border-radius:8px; margin-bottom:14px; overflow:hidden;">
      <div style="background:#f8fafc; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:16px;">⚡</span>
          <div>
            <strong style="font-size:14px; color:var(--text-main);">Main Task 1: Main Cable Tray Laying & LT Cabling (GR-MEP-001-ELE)</strong>
            <div style="font-size:11.5px; color:var(--text-muted);">Owner: <b>Rahul Sharma</b> · Due: 15 Oct 2026 · Weightage: 35%</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="progress green" style="width:70px; margin:0;"><i style="width:72%"></i></div>
          <span style="font-weight:700; font-size:12px;">72% Overall</span>
          <span class="badge blue">In Progress</span>
          <button class="btn sm" onclick="openCreateSubTaskModal('TASK-01')"><i class="fa-solid fa-plus"></i> Sub-Task</button>
        </div>
      </div>

      <!-- Nested Sub-Tasks List -->
      <div style="padding:12px 16px; background:#fff;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">Nested Sub-Tasks (Daily Updated by Site Team):</div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-light); font-size:12.5px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>↳ 🔌</span>
            <div>
              <strong>Sub-Task 1.1: Block A Main Riser Cabling (Shaft 2)</strong>
              <div style="font-size:11px; color:var(--text-muted);">Lead: Rahul Sharma · 14 Workers Deployed · 350m pulled</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="badge blue">72% Completed</span>
            <span class="badge green">🔵 In Progress</span>
            <span class="badge gray">📷 4 Photos</span>
            <button class="btn sm" onclick="openAddDailyReportModal('Block A Main Riser Cabling')"><i class="fa-solid fa-pen"></i> Daily Update</button>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:12.5px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>↳ 🔌</span>
            <div>
              <strong>Sub-Task 1.2: Substation LT Panel Cable Glanding & Termination</strong>
              <div style="font-size:11px; color:var(--text-muted);">Lead: Site Team · 8 Workers Deployed · Target: 20 Aug 2026</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="badge blue">45% Completed</span>
            <span class="badge green">🔵 In Progress</span>
            <span class="badge gray">📷 2 Photos</span>
            <button class="btn sm" onclick="openAddDailyReportModal('Substation LT Panel Installation')"><i class="fa-solid fa-pen"></i> Daily Update</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Task 2 -->
    <div style="border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
      <div style="background:#f8fafc; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:16px;">❄️</span>
          <div>
            <strong style="font-size:14px; color:var(--text-main);">Main Task 2: HVAC Chilled Water Piping & AHU Positioning (GR-MEP-001-HVAC)</strong>
            <div style="font-size:11.5px; color:var(--text-muted);">Owner: <b>Manoj Joshi</b> · Due: 29 Aug 2026 · Weightage: 30%</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="progress amber" style="width:70px; margin:0;"><i style="width:55%"></i></div>
          <span style="font-weight:700; font-size:12px;">55% Overall</span>
          <span class="badge amber">At Risk (#ISS-1024)</span>
          <button class="btn sm" onclick="openCreateSubTaskModal('TASK-02')"><i class="fa-solid fa-plus"></i> Sub-Task</button>
        </div>
      </div>

      <!-- Nested Sub-Tasks List -->
      <div style="padding:12px 16px; background:#fff;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">Nested Sub-Tasks (Daily Updated by Site Team):</div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-light); font-size:12.5px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>↳ ❄️</span>
            <div>
              <strong>Sub-Task 2.1: Chiller Plant Header Welding & Pressure Hydro-Test</strong>
              <div style="font-size:11px; color:var(--text-muted);">Lead: Manoj Joshi · 6 Workers Deployed · Test pressure 12 bar passed</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="badge green">100% Completed</span>
            <span class="badge green">🟢 Completed</span>
            <span class="badge gray">📄 Test Report</span>
            <button class="btn sm" onclick="showToast('Hydro test certified by QA Auditor', 'success')">Certified</button>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:12.5px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>↳ ❄️</span>
            <div>
              <strong>Sub-Task 2.2: Valve Flanges & Actuator Integration (Blocked)</strong>
              <div style="font-size:11px; color:#dc2626;">Consignment customs delayed at port · 3 days delay impact</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="badge red">55% (Stalled)</span>
            <span class="badge red">🔴 Critical Hindrance</span>
            <button class="btn sm danger" onclick="openAddIssueModal()"><i class="fa-solid fa-triangle-exclamation"></i> View Issue</button>
            <button class="btn sm" onclick="openAddDailyReportModal('HVAC Valve Flanges')"><i class="fa-solid fa-pen"></i> Update</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

