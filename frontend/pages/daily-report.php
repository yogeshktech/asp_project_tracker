<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=projects">Projects</a>
    <span>/</span>
    <span class="current">Daily Site Report (DSR)</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 6 · SITE OPERATIONS LOGBOOK · PM-18 COMPLIANCE</div>
      <h1>Daily Site Progress Report (DSR)</h1>
      <p>Daily progress recording: Yesterday vs Today vs Cumulative Until-Date %, site status dropdown, non-mandatory remarks, photo attachments, and Excel bulk sync.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="openExcelDsrImportModal()"><i class="fa-solid fa-file-excel"></i> Upload Status from Excel</button>
      <button class="btn primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Submit Daily Update</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Tasks Updated Today</span>
      <span class="kpi-value">34 Sub-tasks</span>
      <span class="kpi-sub">Across 4 Resorts</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Total Site Manpower</span>
      <span class="kpi-value">148 Workers</span>
      <span class="kpi-sub">Civil, MEP, HVAC labor</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Completed Today</span>
      <span class="kpi-value">8 Sub-Tasks</span>
      <span class="kpi-sub">Plunge pool waterproofing 100%</span>
    </div>
    <div class="kpi danger">
      <span class="kpi-label">Site Roadblocks / Issues</span>
      <span class="kpi-value">3 Hindrances</span>
      <span class="kpi-sub">1 Port customs delay logged</span>
    </div>
  </div>

  <!-- PM-18 Rule Guidance Callout -->
  <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
    <div>
      <strong style="color:#1d4ed8;"><i class="fa-solid fa-circle-info"></i> Daily Site Progress Protocol (PM-18):</strong>
      <span style="color:#1e3a8a; margin-left:6px;">Only Task-Owners can change % completion. Site engineers select status dropdown & optional delay remarks with photo evidence.</span>
    </div>
    <span class="badge blue">Task Owner Access Only</span>
  </div>

  <!-- Visual Charts: Donut/Pie & Velocity Bars -->
  <div id="phpDailyCharts" style="margin-bottom:16px;"></div>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof renderDailyReportCharts === 'function') {
        renderDailyReportCharts('phpDailyCharts', {
          completedCount: 8,
          inProgressCount: 22,
          delayedCount: 3,
          criticalCount: 1
        });
      }
    });
  </script>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Site Operations Log — 18 August 2026</h3>
        <div class="card-subtitle">Grand Oasis Resort & Spa, Goa (GR-MEP-001 & GR-CIV-001)</div>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="openExcelDsrImportModal()"><i class="fa-solid fa-file-excel"></i> Bulk Excel Sync</button>
        <button class="btn sm" onclick="showToast('Exporting Daily Log summary to PDF', 'info')"><i class="fa-solid fa-file-lines"></i> Export DSR PDF</button>
        <button class="btn sm primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Log Today's Progress</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>MAIN TASK & SUB-TASK</th>
            <th>TASK OWNER</th>
            <th>LABOR</th>
            <th>YESTERDAY %</th>
            <th>TODAY %</th>
            <th>UNTIL-DATE DONE</th>
            <th>STATUS DROPDOWN</th>
            <th>PROGRESS REMARKS & DELAY REASON (OPTIONAL)</th>
            <th>ATTACHMENTS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Main Cable Tray Laying & LT Cabling</strong>
              <small style="color:var(--text-muted); display:block;">↳ <b>Sub-Task:</b> Block A Main Riser Cabling (Shaft 2)</small>
            </td>
            <td><b>Rahul Sharma</b><small style="display:block; color:var(--text-muted);">Task Owner</small></td>
            <td>14 Men</td>
            <td>64%</td>
            <td><b style="color:#1d4ed8;">72% (+8%)</b></td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress green" style="width:45px; margin:0;"><i style="width:72%"></i></div>
                <span style="font-weight:700; font-size:11.5px;">72%</span>
              </div>
            </td>
            <td>
              <select style="padding:4px 6px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid var(--border-color); background:#fff;" onchange="showToast('Status updated to: ' + this.value, 'info')">
                <option selected>🔵 In Progress / On Track</option>
                <option>🔴 Critical Hindrance</option>
                <option>🟠 Delayed / Material Wait</option>
                <option>🟢 Completed</option>
              </select>
            </td>
            <td>
              <span style="font-size:12px;">Completed 350m Polycab 4Cx16 cable pulling in shaft 2. Alignment tested.</span>
            </td>
            <td>
              <span class="badge gray" style="cursor:pointer;" onclick="showToast('Viewing 4 Geotagged Site Inspection Photos', 'info')">📷 4 Photos</span>
            </td>
            <td>
              <button class="btn sm" onclick="openAddDailyReportModal('Block A Main Riser Cabling')"><i class="fa-solid fa-pen"></i> Update</button>
            </td>
          </tr>
          <tr>
            <td>
              <strong>Grand Resort MEP Infrastructure</strong>
              <small style="color:var(--text-muted); display:block;">↳ <b>Sub-Task:</b> Substation LT Panel Installation</small>
            </td>
            <td><b>Rahul Sharma</b><small style="display:block; color:var(--text-muted);">Task Owner</small></td>
            <td>8 Men</td>
            <td>35%</td>
            <td><b style="color:#1d4ed8;">45% (+10%)</b></td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress green" style="width:45px; margin:0;"><i style="width:45%"></i></div>
                <span style="font-weight:700; font-size:11.5px;">45%</span>
              </div>
            </td>
            <td>
              <select style="padding:4px 6px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid var(--border-color); background:#fff;" onchange="showToast('Status updated to: ' + this.value, 'info')">
                <option selected>🔵 In Progress / On Track</option>
                <option>🔴 Critical Hindrance</option>
                <option>🟠 Delayed / Material Wait</option>
                <option>🟢 Completed</option>
              </select>
            </td>
            <td>
              <span style="font-size:12px;">2 ABB distribution panels positioned and grounded with copper strip.</span>
            </td>
            <td>
              <span class="badge gray" style="cursor:pointer;" onclick="showToast('Viewing 2 Geotagged Site Inspection Photos', 'info')">📷 2 Photos</span>
            </td>
            <td>
              <button class="btn sm" onclick="openAddDailyReportModal('Substation LT Panel Installation')"><i class="fa-solid fa-pen"></i> Update</button>
            </td>
          </tr>
          <tr>
            <td>
              <strong>HVAC Chilled Water Piping & AHU Positioning</strong>
              <small style="color:var(--text-muted); display:block;">↳ <b>Sub-Task:</b> Valve Flanges & Actuator Integration</small>
            </td>
            <td><b>Manoj Joshi</b><small style="display:block; color:var(--text-muted);">Task Owner</small></td>
            <td>4 Men</td>
            <td>55%</td>
            <td><b style="color:#dc2626;">55% (0% - Stalled)</b></td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress amber" style="width:45px; margin:0;"><i style="width:55%"></i></div>
                <span style="font-weight:700; font-size:11.5px;">55%</span>
              </div>
            </td>
            <td>
              <select style="padding:4px 6px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid #f87171; background:#fef2f2; color:#991b1b;" onchange="showToast('Status updated to: ' + this.value, 'danger')">
                <option>🔵 In Progress / On Track</option>
                <option selected>🔴 Critical Hindrance (#ISS-1024)</option>
                <option>🟠 Delayed / Material Wait</option>
                <option>🟢 Completed</option>
              </select>
            </td>
            <td>
              <span style="font-size:12px; color:#dc2626;">Consignment held at customs port. Escalated to PMO for expedite clearance.</span>
            </td>
            <td>
              <span class="badge red" style="cursor:pointer;" onclick="showToast('Viewing Customs Port Delay Bill of Lading', 'info')">📄 Customs Docs</span>
            </td>
            <td>
              <button class="btn sm" onclick="openAddDailyReportModal('HVAC Valve Flanges')"><i class="fa-solid fa-pen"></i> Update</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

