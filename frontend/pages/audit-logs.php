<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">Governance & Audit Logs</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">ENTERPRISE GOVERNANCE & COMPLIANCE</div>
      <h1>System Audit Logs & History</h1>
      <p>Immutable forensic trail: User identity, timestamp, operation type, affected WBS node, and IP address.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="showToast('Audit trail exported to CSV format', 'info')"><i class="fa-solid fa-download"></i> Export Audit Log (CSV)</button>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Chronological System Events</h3>
        <div class="card-subtitle">All write, edit, baseline change, gateway approval, and user permission actions</div>
      </div>
      <span class="badge green">Tamper-Proof Ledger</span>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>TIMESTAMP</th>
            <th>USER / IDENTITY</th>
            <th>ROLE</th>
            <th>ACTION TYPE</th>
            <th>MODULE</th>
            <th>AUDIT DETAIL / RECORD</th>
            <th>IP ADDRESS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>18 Aug 2026 15:10</td>
            <td><strong>Yogesh Kumar</strong></td>
            <td><span class="badge blue">Project Admin</span></td>
            <td><span class="badge green">CREATE</span></td>
            <td>N-Level Project</td>
            <td>Added Work Package <code>GR-MEP-001-ELE-T2</code> under <code>GR-MEP-001</code></td>
            <td>192.168.1.45</td>
          </tr>
          <tr>
            <td>18 Aug 2026 14:35</td>
            <td><strong>Rahul Sharma</strong></td>
            <td><span class="badge blue">Project Manager</span></td>
            <td><span class="badge blue">UPDATE</span></td>
            <td>Daily Site Report</td>
            <td>Updated Block A Main Riser progress to <b>72%</b> (+8%)</td>
            <td>192.168.1.88</td>
          </tr>
          <tr>
            <td>18 Aug 2026 12:15</td>
            <td><strong>Neeraj Singh</strong></td>
            <td><span class="badge amber">Finance Controller</span></td>
            <td><span class="badge green">APPROVE</span></td>
            <td>BOQ Baseline</td>
            <td>Approved BOQ Version v2.1 for Grand Oasis Resort MEP (₹8.68 Cr)</td>
            <td>192.168.1.92</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
