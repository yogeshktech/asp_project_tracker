<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=projects">Projects</a>
    <span>/</span>
    <span class="current">Budget & Cost Centers (80% RAG)</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 5 · FINANCIAL GOVERNANCE</div>
      <h1>Budget, Cost Centers & 80% RAG Alerts</h1>
      <p>Cost center allocations, commitment tracking, forecast variance, and automated 80% safety threshold escalations.</p>
    </div>
    <div class="head-actions">
      <button class="btn primary" onclick="openModal('Allocate Cost Center Budget', '<form onsubmit=\'event.preventDefault();closeModal();showToast(\x22Budget allocated!\x22)\'><div class=\x22form-grid\x22><div class=\x22field full\x22><label>Cost Center Name *</label><input required placeholder=\x22e.g. Landscaping & Swimming Pool Infrastructure\x22></div><div class=\x22field\x22><label>Allocated Amount (₹ Cr) *</label><input required placeholder=\x22e.g. ₹3.50 Cr\x22></div><div class=\x22field\x22><label>Resort Destination</label><select><option>Grand Oasis Resort Goa</option><option>Royal Heritage Jaipur</option></select></div><div class=\x22field full\x22><label>RAG Trigger Threshold</label><input value=\x2280% (System Default)\x22 readonly style=\x22background:#f1f5f9;\x22></div></div><div class=\x22modalfoot\x22 style=\x22padding:0;margin-top:14px;\x22><button type=\x22button\x22 class=\x22btn\x22 onclick=\x22closeModal()\x22>Cancel</button><button type=\x22submit\x22 class=\x22btn primary\x22><i class="fa-solid fa-plus"></i> Save Cost Center</button></div></form>')"><i class="fa-solid fa-plus"></i> Add Cost Center</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Approved Budget</span>
      <span class="kpi-value">₹12.40 Cr</span>
      <span class="kpi-sub">Grand Resort MEP Baseline</span>
    </div>
    <div class="kpi warning">
      <span class="kpi-label">Committed Spend</span>
      <span class="kpi-value">₹8.90 Cr</span>
      <span class="kpi-sub">71.7% Committed</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Actual Disbursed</span>
      <span class="kpi-value">₹6.90 Cr</span>
      <span class="kpi-sub">55.6% Invoiced & Paid</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">EAC Forecast</span>
      <span class="kpi-value">₹12.05 Cr</span>
      <span class="kpi-sub">-₹35.0L Projected Savings</span>
    </div>
  </div>

  <div class="alert danger">
    <span><i class="fa-solid fa-triangle-exclamation"></i></span>
    <div>
      <strong>80% RAG Escalation Active:</strong> Cost center <b>"MEP — Electrical Distribution"</b> has reached <b>84% utilization</b> (₹1.68 Cr of ₹2.00 Cr used). An automated exception notification has been dispatched to the Project Manager and Finance Controller.
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Cost Center RAG Matrix</h3>
        <div class="card-subtitle">Red: &ge;80% (Escalated) · Amber: 70-79% (Watch) · Green: &lt;70% (Healthy)</div>
      </div>
      <button class="btn sm" onclick="showToast('Cost report generated', 'info')"><i class="fa-solid fa-chart-pie"></i> Generate Cost Sheet</button>
    </div>

    <div class="rag-row">
      <div>
        <strong style="font-size:13px;">MEP — Electrical Distribution</strong>
        <small style="color:var(--text-muted);">Allocated: ₹2.00 Cr · Used: ₹1.68 Cr</small>
      </div>
      <div><div class="progress red" style="margin:0;"><i style="width:84%"></i></div></div>
      <strong style="color:#dc2626;">84%</strong>
      <span class="badge red">Critical (&gt;80%)</span>
    </div>

    <div class="rag-row">
      <div>
        <strong style="font-size:13px;">MEP — HVAC & Chiller Plant</strong>
        <small style="color:var(--text-muted);">Allocated: ₹3.20 Cr · Used: ₹2.43 Cr</small>
      </div>
      <div><div class="progress amber" style="margin:0;"><i style="width:76%"></i></div></div>
      <strong style="color:#d97706;">76%</strong>
      <span class="badge amber">Watch</span>
    </div>

    <div class="rag-row">
      <div>
        <strong style="font-size:13px;">Civil Structure & Superstructure</strong>
        <small style="color:var(--text-muted);">Allocated: ₹9.20 Cr · Used: ₹7.82 Cr</small>
      </div>
      <div><div class="progress red" style="margin:0;"><i style="width:85%"></i></div></div>
      <strong style="color:#dc2626;">85%</strong>
      <span class="badge red">Critical (&gt;80%)</span>
    </div>
  </div>
</div>
