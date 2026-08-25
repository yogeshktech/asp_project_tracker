<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=resorts">Grand Oasis Resort Goa</a>
    <span>/</span>
    <a href="index.php?page=projects">Level 1: MEP Infrastructure</a>
    <span>/</span>
    <span class="current">GR-MEP-001 Project Workspace</span>
  </div>

  <div class="hero">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
      <div>
        <div class="eyebrow">GRAND OASIS RESORT GOA · LEVEL 1 DISCIPLINE</div>
        <h2>Grand Resort — MEP & Building Automation</h2>
        <p>Code: <b>GR-MEP-001</b> · Project Lead: <b>Rahul Sharma</b> · Target Handover: <b>24 Dec 2026</b></p>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="openAddDailyReportModal()" style="background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.3); color:#fff;"><i class="fa-solid fa-plus"></i> Daily Site Update</button>
        <button class="btn sm" onclick="openAddIssueModal()" style="background:#ef4444; color:#fff; border-color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Log Site Issue</button>
        <button class="btn sm primary" onclick="openCreateProjectModal('PRJ-02')"><i class="fa-solid fa-plus"></i> Create Sub-Package</button>
      </div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi success">
      <span class="kpi-label">Milestone Progress</span>
      <span class="kpi-value">72% Completed</span>
      <span class="kpi-sub">On Track for Dec 2026</span>
    </div>
    <div class="kpi warning">
      <span class="kpi-label">Allocated Budget</span>
      <span class="kpi-value">₹12.40 Cr</span>
      <span class="kpi-sub">₹8.90 Cr Committed (71.7%)</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">BOQ Items</span>
      <span class="kpi-value">486 Line Items</span>
      <span class="kpi-sub">Baseline v2.1 Approved</span>
    </div>
    <div class="kpi danger">
      <span class="kpi-label">Active Exceptions</span>
      <span class="kpi-value">2 Open Issues</span>
      <span class="kpi-sub">1 Escalated Port Delay</span>
    </div>
  </div>

  <div class="tabs">
    <div class="tab-item active" onclick="switchProjectTab('overview', this)">Overview & Timeline</div>
    <div class="tab-item" onclick="switchProjectTab('subprojects', this)">Sub-Packages (3)</div>
    <div class="tab-item" onclick="switchProjectTab('boq', this)">BOQ Summary (486)</div>
    <div class="tab-item" onclick="switchProjectTab('daily', this)">Daily Logs</div>
    <div class="tab-item" onclick="switchProjectTab('closure', this)">Handover & Closure Gate</div>
  </div>

  <!-- TAB 1: Overview & Timeline -->
  <div id="tab-overview">
    <div class="grid g-2-1">
      <div>
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Engineering Gateway Milestones</h3>
              <div class="card-subtitle">Gateway approvals and critical path dependencies</div>
            </div>
            <a href="index.php?page=milestones" class="btn sm">Milestones Tracker ➔</a>
          </div>

          <div class="timeline">
            <div class="event completed">
              <strong>1. Project Kickoff & Approvals</strong>
              <small>15 Jan 2026 · Approved by PMO & Client</small>
            </div>
            <div class="event completed">
              <strong>2. BOQ Baseline Freeze & Vendor Procurement</strong>
              <small>28 Feb 2026 · Approved by Finance & Contracts</small>
            </div>
            <div class="event completed">
              <strong>3. Substation Transformer Delivery & Positioning</strong>
              <small>15 Jul 2026 · Quality Passed by Dr. Arvind Swaminathan</small>
            </div>
            <div class="event active">
              <strong>4. Main Cable Tray & LT Distribution Cabling (Current Stage)</strong>
              <small>01 Aug — 15 Oct 2026 · Progress: 72% · On Track</small>
            </div>
            <div class="event">
              <strong>5. Chiller Plant Testing & Commissioning</strong>
              <small>15 Oct — 30 Nov 2026 · Planned</small>
            </div>
            <div class="event">
              <strong>6. Statutory CEIG Clearance & Final Handover Gate</strong>
              <small>01 — 24 Dec 2026 · Final Handover Certificate</small>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Nested Level 2 Sub-Projects</h3>
              <div class="card-subtitle">Discipline work packages executing under this parent</div>
            </div>
            <button class="btn sm primary" onclick="openCreateProjectModal('PRJ-02')"><i class="fa-solid fa-plus"></i> Add Package</button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>SUB-PACKAGE</th>
                  <th>LEAD</th>
                  <th>BUDGET</th>
                  <th>PROGRESS</th>
                  <th>HEALTH</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Electrical Distribution & Substation</strong>
                    <small>GR-MEP-001-ELE · Level 2</small>
                  </td>
                  <td>Rahul Sharma</td>
                  <td>₹5.10 Cr</td>
                  <td><b>84%</b></td>
                  <td><span class="badge amber">84% Cost Alert</span></td>
                  <td>
                    <button class="btn sm" onclick="openEditProjectModal('PRJ-02-SUB1')"><i class="fa-solid fa-pen"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>HVAC Central Chiller Plant & VRV</strong>
                    <small>GR-MEP-001-HVAC · Level 2</small>
                  </td>
                  <td>Manoj Joshi</td>
                  <td>₹4.80 Cr</td>
                  <td><b>65%</b></td>
                  <td><span class="badge amber">At Risk (#ISS-1024)</span></td>
                  <td>
                    <button class="btn sm" onclick="openEditProjectModal('PRJ-02-SUB2')"><i class="fa-solid fa-pen"></i></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Critical Actions & Alerts</h3>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="padding:10px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; font-size:12px;">
              <span class="badge amber">Cost Alert</span>
              <strong style="display:block; margin:4px 0 2px;">Electrical Cost Center at 84%</strong>
              <span style="color:#92400e;">Utilization exceeded 80% threshold. Escalated to Finance.</span>
            </div>
            <div style="padding:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; font-size:12px;">
              <span class="badge red">Issue #ISS-1024</span>
              <strong style="display:block; margin:4px 0 2px;">HVAC Valve Flanges Delayed</strong>
              <span style="color:#991b1b;">Port customs clearance pending. 3 days potential slip.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 2: Sub-Projects -->
  <div id="tab-subprojects" style="display:none;">
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">All Sub-Projects & Work Packages</h3>
        <button class="btn sm primary" onclick="openCreateProjectModal('PRJ-02')"><i class="fa-solid fa-plus"></i> Create New Package</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>PACKAGE CODE</th>
              <th>WORK PACKAGE TITLE</th>
              <th>LEVEL</th>
              <th>OWNER</th>
              <th>BUDGET</th>
              <th>SPENT</th>
              <th>PROGRESS</th>
              <th>HEALTH</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GR-MEP-001-ELE</code></td>
              <td><strong>Electrical Distribution & Substation</strong></td>
              <td><span class="badge blue">Level 2</span></td>
              <td>Rahul Sharma</td>
              <td>₹5.10 Cr</td>
              <td>₹4.30 Cr</td>
              <td>84%</td>
              <td><span class="badge amber">84% Cost Alert</span></td>
              <td><button class="btn sm" onclick="openEditProjectModal('PRJ-02-SUB1')"><i class="fa-solid fa-pen"></i> Edit</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 3: BOQ Summary -->
  <div id="tab-boq" style="display:none;">
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Bill of Quantities Baseline (BOQ)</h3>
          <div class="card-subtitle">Approved Version: v2.1 (486 Line Items)</div>
        </div>
        <div class="btn-group">
          <button class="btn sm" onclick="openExcelImportModal()"><i class="fa-solid fa-chart-pie"></i> Import Excel</button>
          <button class="btn sm primary" onclick="openAddBOQItemModal()"><i class="fa-solid fa-plus"></i> Add BOQ Item</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>ITEM CODE</th>
              <th>DESCRIPTION</th>
              <th>UOM</th>
              <th>BASELINE QTY</th>
              <th>UNIT RATE</th>
              <th>TOTAL AMOUNT</th>
              <th>APPROVED BRAND</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>EL-CBL-001</b></td>
              <td>XLPE Copper Cable 4C x 16 sqmm 1.1kV</td>
              <td>Meter</td>
              <td>5,000</td>
              <td>₹420</td>
              <td>₹21,00,000</td>
              <td>Polycab</td>
              <td><span class="badge green">Approved</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 4: Daily Logs -->
  <div id="tab-daily" style="display:none;">
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Daily Site Report Submissions (DSR)</h3>
        <button class="btn sm primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Submit Daily Update</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>SUB-TASK / SHAFT</th>
              <th>ENGINEER</th>
              <th>LABOR</th>
              <th>PROGRESS</th>
              <th>STATUS</th>
              <th>REMARK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>18 Aug 2026</td>
              <td><strong>Block A Main Riser Cabling</strong></td>
              <td>Rahul Sharma</td>
              <td>14 Men</td>
              <td>64% ➔ 72%</td>
              <td><span class="badge blue">In Progress</span></td>
              <td>Completed 350m cable pulling. 📷 4 Photos Attached</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 5: Closure Gate -->
  <div id="tab-closure" style="display:none;">
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Mandatory Project Closure & Handover Gate</h3>
          <div class="card-subtitle">Leftover material reconciliation and signed completion audit</div>
        </div>
        <button class="btn sm success" onclick="openHandoverModal()"><i class="fa-solid fa-lock"></i> Execute Handover & Closure</button>
      </div>
      <div class="alert warning">
        <span><i class="fa-solid fa-triangle-exclamation"></i></span> <strong>Mandatory Closure Rule:</strong> A project cannot be marked completed or closed until leftover materials are reconciled and the signed handover certificate is archived.
      </div>
    </div>
  </div>
</div>

<script>
function switchProjectTab(tabId, el) {
  const tabs = ['overview', 'subprojects', 'boq', 'daily', 'closure'];
  tabs.forEach(t => {
    const elTab = document.getElementById('tab-' + t);
    if (elTab) elTab.style.display = (t === tabId) ? 'block' : 'none';
  });
  const tabItems = el.parentElement.querySelectorAll('.tab-item');
  tabItems.forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

// Dynamic Client-side Project Detail Synchronization
function syncSelectedProjectDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramPid = urlParams.get('projectId');
  const storedPid = localStorage.getItem('WISETRACK_SELECTED_PROJECT');
  const pid = paramPid || storedPid;

  if (!pid) return;

  const projects = typeof getProjects === 'function' ? getProjects() : [];
  const p = projects.find(x => String(x.id) === String(pid) || x.code === pid || String(x.id) === String(pid).replace('PRJ-', ''));
  if (!p) return;

  // Update Hero & Breadcrumbs
  const heroTitle = document.querySelector('.hero h2');
  if (heroTitle) heroTitle.textContent = p.name;

  const heroSub = document.querySelector('.hero p');
  if (heroSub) heroSub.innerHTML = `Code: <b>${p.code || 'PRJ'}</b> · Project Lead: <b>${p.owner || 'Lead PM'}</b> · Target Handover: <b>${p.endDate || '24 Dec 2026'}</b>`;

  const heroEyebrow = document.querySelector('.hero .eyebrow');
  if (heroEyebrow) {
    const lvl = Number(p.level) || 1;
    heroEyebrow.textContent = `LEVEL ${lvl} · ${p.discipline || 'GENERAL'} DISCIPLINE`;
  }

  const breadcrumbCurrent = document.querySelector('.breadcrumb-nav .current');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = `${p.code || 'PRJ'} Project Workspace`;
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => syncSelectedProjectDetails(), 100);
});
</script>
