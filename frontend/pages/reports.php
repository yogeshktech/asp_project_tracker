<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">Executive Reports & Dossier Generator</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">EXECUTIVE INSIGHTS & EXPORTS · PM-28 COMPLIANCE</div>
      <h1>Project Reports & Automated Exports</h1>
      <p>Generate board-ready PDF progress packs, financial cost variance dossiers, customizable column exports, and internal email dispatch.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="openReportExportModal('daily')"><i class="fa-solid fa-calendar-day"></i> Daily Progress Report</button>
      <button class="btn primary" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-chart-pie"></i> Custom Export & Dispatch</button>
    </div>
  </div>

  <!-- Standard Report Pack Cards -->
  <div class="grid g3">
    <div class="card">
      <span class="badge blue">Monthly</span>
      <h3 style="font-size:15px; margin:10px 0 4px;">Monthly Progress Pack (PDF)</h3>
      <p style="font-size:12px; color:var(--text-muted); line-height:1.6; min-height:42px;">Executive summary of milestone completions, N-level package health, and upcoming critical paths.</p>
      <div style="border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:var(--text-muted);">PDF · 18 Pages</span>
        <button class="btn sm primary" onclick="openReportExportModal('portfolio')">Configure & Send ➔</button>
      </div>
    </div>

    <div class="card">
      <span class="badge green">Daily & Cumulative</span>
      <h3 style="font-size:15px; margin:10px 0 4px;">Daily Site Progress Dossier</h3>
      <p style="font-size:12px; color:var(--text-muted); line-height:1.6; min-height:42px;">Daily site update + cumulative until-date completion, manpower deployed, and photo logs.</p>
      <div style="border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:var(--text-muted);">PDF / Excel</span>
        <button class="btn sm primary" onclick="openReportExportModal('daily')">Configure & Send ➔</button>
      </div>
    </div>

    <div class="card">
      <span class="badge amber">Finance</span>
      <h3 style="font-size:15px; margin:10px 0 4px;">Budget vs Actual & 80% RAG</h3>
      <p style="font-size:12px; color:var(--text-muted); line-height:1.6; min-height:42px;">Cost center breakdown, committed purchase orders, forecast variance, and 80% threshold warnings.</p>
      <div style="border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:var(--text-muted);">Excel Spreadsheet</span>
        <button class="btn sm primary" onclick="openReportExportModal('financial')">Configure & Send ➔</button>
      </div>
    </div>
  </div>

  <!-- Unified All-Projects Single Status Report Matrix -->
  <div class="card" style="margin-top:20px;">
    <div class="card-header">
      <div>
        <h3 class="card-title">All Projects Status in One Master Report (PM-28 Single View)</h3>
        <div class="card-subtitle">Comprehensive cross-portfolio executive roll-up across all resorts and sub-projects</div>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-sliders"></i> Customize Columns</button>
        <button class="btn sm" onclick="showToast('Exporting Single Report View to Excel...', 'info')"><i class="fa-solid fa-file-excel"></i> Export Excel</button>
        <button class="btn sm primary" onclick="showToast('Generating Single Master PDF Report...', 'info')"><i class="fa-solid fa-file-pdf"></i> Export Branded PDF</button>
      </div>
    </div>

    <!-- Security & Email Dispatch Notice -->
    <div style="display:flex; justify-content:space-between; align-items:center; background:#eff6ff; padding:10px 14px; border-radius:6px; border:1px solid #bfdbfe; margin-bottom:14px; font-size:12px;">
      <div>
        <strong style="color:#1d4ed8;">🔒 Enterprise Dispatch Protection:</strong>
        <span style="color:#1e3a8a;">Automated report dispatch is strictly restricted to internal team emails only (external addresses blocked).</span>
      </div>
      <button class="btn sm primary" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-envelope"></i> Send to Internal Team</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>RESORT & CODE</th>
            <th>PROJECT / PACKAGE TITLE</th>
            <th>DISCIPLINE</th>
            <th>PROJECT LEAD</th>
            <th>BUDGET (₹)</th>
            <th>COMMITTED (₹)</th>
            <th>DAILY %</th>
            <th>UNTIL-DATE %</th>
            <th>80% RAG STATUS</th>
            <th>ACTIVE ISSUES</th>
            <th>NEXT CRITICAL MILESTONE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Grand Oasis Goa</strong>
              <small>RES-GOA-01</small>
            </td>
            <td>
              <strong>Main Resort Building Phase-1</strong>
              <small>GR-CIV-001 · Level 1</small>
            </td>
            <td>Civil Structure</td>
            <td>Amit Verma</td>
            <td>₹16.50 Cr</td>
            <td>₹13.20 Cr</td>
            <td><span class="badge blue">+2% Today</span></td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress green" style="width:50px; margin:0;"><i style="width:80%"></i></div>
                <b>80%</b>
              </div>
            </td>
            <td><span class="badge green">Healthy (&lt;70%)</span></td>
            <td><span class="badge green">0 Roadblocks</span></td>
            <td><small>Roof Casting · 15 Oct 2026</small></td>
          </tr>
          <tr>
            <td>
              <strong>Grand Oasis Goa</strong>
              <small>RES-GOA-01</small>
            </td>
            <td>
              <strong>Electrical Distribution & Substation</strong>
              <small>GR-MEP-001-ELE · Level 2</small>
            </td>
            <td>MEP & Electrical</td>
            <td>Rahul Sharma</td>
            <td>₹5.10 Cr</td>
            <td>₹4.30 Cr</td>
            <td><span class="badge blue">+8% Today</span></td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress amber" style="width:50px; margin:0;"><i style="width:84%"></i></div>
                <b>84%</b>
              </div>
            </td>
            <td><span class="badge red">84% Cost Alert</span></td>
            <td><span class="badge amber">#ISS-1023 Under Review</span></td>
            <td><small>Cable Tray 75% · 24 Aug 2026</small></td>
          </tr>
          <tr>
            <td>
              <strong>Grand Oasis Goa</strong>
              <small>RES-GOA-01</small>
            </td>
            <td>
              <strong>HVAC Central Chiller Plant & VRV</strong>
              <small>GR-MEP-001-HVAC · Level 2</small>
            </td>
            <td>HVAC</td>
            <td>Manoj Joshi</td>
            <td>₹4.80 Cr</td>
            <td>₹3.65 Cr</td>
            <td><span class="badge gray">0% Today</span></td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress amber" style="width:50px; margin:0;"><i style="width:65%"></i></div>
                <b>65%</b>
              </div>
            </td>
            <td><span class="badge amber">76% Watch</span></td>
            <td><span class="badge red">#ISS-1024 Port Delay</span></td>
            <td><small>Chiller Dry Run · 15 Oct 2026</small></td>
          </tr>
          <tr>
            <td>
              <strong>Royal Heritage Jaipur</strong>
              <small>RES-JAI-02</small>
            </td>
            <td>
              <strong>Palace Wing Restoration & Automation</strong>
              <small>JAI-CIV-002 · Level 1</small>
            </td>
            <td>Heritage MEP</td>
            <td>Priya Mehta</td>
            <td>₹18.40 Cr</td>
            <td>₹11.20 Cr</td>
            <td><span class="badge blue">+1.5% Today</span></td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress green" style="width:50px; margin:0;"><i style="width:58%"></i></div>
                <b>58%</b>
              </div>
            </td>
            <td><span class="badge green">Healthy</span></td>
            <td><span class="badge green">0 Roadblocks</span></td>
            <td><small>Courtyard Lighting · 30 Nov 2026</small></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

