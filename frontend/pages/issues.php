<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">Issue / Incident Tracker & Escalation</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">SITE GOVERNANCE & RISK MANAGEMENT</div>
      <h1>Issue & Incident Management</h1>
      <p>Real-time roadblock logging: What happened, where, schedule impact, and automated escalation to PMO.</p>
    </div>
    <div class="head-actions">
      <button class="btn primary" onclick="openAddIssueModal()"><i class="fa-solid fa-plus"></i> Log New Issue</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi danger">
      <span class="kpi-label">Critical / High Priority</span>
      <span class="kpi-value">2 Issues</span>
      <span class="kpi-sub">Immediate PMO resolution needed</span>
    </div>
    <div class="kpi warning">
      <span class="kpi-label">Medium Priority</span>
      <span class="kpi-value">1 Issue</span>
      <span class="kpi-sub">Material quality quarantine</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Resolved This Month</span>
      <span class="kpi-value">18 Issues</span>
      <span class="kpi-sub">Avg resolution: 1.8 days</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Escalation SLA</span>
      <span class="kpi-value">24 Hours</span>
      <span class="kpi-sub">For High / Critical tickets</span>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Active Site Exceptions & Roadblocks</h3>
        <div class="card-subtitle">Triaged by severity and target turnaround</div>
      </div>
      <button class="btn sm" onclick="showToast('Exporting issue escalation summary', 'info')"><i class="fa-solid fa-file-lines"></i> Export Issue Log</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>TICKET / ISSUE TITLE</th>
            <th>WHERE / LOCATION</th>
            <th>RESORT & PROJECT</th>
            <th>REPORTED BY</th>
            <th>SCHEDULE IMPACT</th>
            <th>PRIORITY</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>HVAC valve flanges consignment delayed at port customs</strong>
              <small>#ISS-1024 · Logged 18 Aug 10:20</small>
            </td>
            <td>Block B Central Plant</td>
            <td>
              <strong>Grand Oasis Resort Goa</strong>
              <small>GR-MEP-001-HVAC</small>
            </td>
            <td>Site Engineer</td>
            <td><b style="color:#dc2626;">3 Days Potential Slip</b></td>
            <td><span class="badge red">High</span></td>
            <td><span class="badge amber">Escalated to PMO</span></td>
            <td><button class="btn sm" onclick="showToast('PMO notification re-sent to supplier', 'info')">Triage ➔</button></td>
          </tr>
          <tr>
            <td>
              <strong>Electrical single line drawing revision approval pending</strong>
              <small>#ISS-1023 · Logged 17 Aug 14:15</small>
            </td>
            <td>Block A Guest Wing</td>
            <td>
              <strong>Grand Oasis Resort Goa</strong>
              <small>GR-MEP-001-ELE</small>
            </td>
            <td>Rahul Sharma</td>
            <td>Cabling team standby</td>
            <td><span class="badge red">High</span></td>
            <td><span class="badge blue">Under Review</span></td>
            <td><button class="btn sm" onclick="showToast('Drawing approved by Electrical Lead', 'success')">Approve</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
