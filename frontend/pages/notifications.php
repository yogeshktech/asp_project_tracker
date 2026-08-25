<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">Alerts & Escalation Rules</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">AUTOMATED GOVERNANCE & EXCEPTIONS</div>
      <h1>Notifications & Escalation Rules</h1>
      <p>Real-time exception feed, automated budget threshold triggers, and SLA escalation workflows.</p>
    </div>
    <div class="head-actions">
      <button class="btn primary" onclick="openModal('Create Escalation Rule', '<form onsubmit=\'event.preventDefault();closeModal();showToast(\x22Escalation rule saved!\x22)\'><div class=\x22form-grid\x22><div class=\x22field full\x22><label>Trigger Condition *</label><select><option>Budget Cost Center reaches 80%</option><option>Gateway Milestone delayed > 3 days</option><option>High Priority Issue unassigned > 24 hours</option></select></div><div class=\x22field\x22><label>Escalate To Role *</label><select><option>Project Manager & Finance Controller</option><option>General Manager & VP</option><option>Quality Auditor</option></select></div><div class=\x22field\x22><label>Notification Channel</label><select><option>In-App Alert + Instant Email</option><option>In-App Only</option></select></div></div><div class=\x22modalfoot\x22 style=\x22padding:0;margin-top:14px;\x22><button type=\x22button\x22 class=\x22btn\x22 onclick=\x22closeModal()\x22>Cancel</button><button type=\x22submit\x22 class=\x22btn primary\x22><i class="fa-solid fa-plus"></i> Save Escalation Rule</button></div></form>')"><i class="fa-solid fa-plus"></i> Add Escalation Rule</button>
    </div>
  </div>

  <div class="grid g2">
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Live Notification Feed</h3>
          <div class="card-subtitle">Chronological alerts dispatched to stakeholders</div>
        </div>
        <button class="btn sm" onclick="showToast('All notifications marked as read', 'info')">Mark All Read</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong style="color:#991b1b; font-size:13px;"><i class="fa-solid fa-circle" style="color:#dc2626;font-size:8px;"></i> Budget Alert — Electrical reached 84%</strong>
            <small style="color:#64748b;">10 mins ago</small>
          </div>
          <p style="font-size:12px; color:#334155; margin:4px 0 8px;">Cost center utilization exceeded 80% safety limit (₹1.68 Cr of ₹2.00 Cr used). Escalated to Finance & PM.</p>
          <a href="index.php?page=budget" class="btn sm" style="background:#fff; border-color:#fca5a5; color:#991b1b;">View Cost Center ➔</a>
        </div>

        <div style="padding:12px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong style="color:#92400e; font-size:13px;">🟠 High-Priority Issue Logged (#ISS-1024)</strong>
            <small style="color:#64748b;">1 hr ago</small>
          </div>
          <p style="font-size:12px; color:#334155; margin:4px 0 8px;">HVAC valve flanges shipment delay at port customs. Potential impact: 3 days on dry commissioning.</p>
          <a href="index.php?page=issues" class="btn sm" style="background:#fff; border-color:#fcd34d; color:#92400e;">Open Ticket ➔</a>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Configured Escalation Matrix</h3>
      </div>
      <div style="display:flex; flex-direction:column; gap:14px; font-size:12.5px;">
        <div style="padding:10px; background:#f8fafc; border:1px solid var(--border-color); border-radius:6px;">
          <strong style="color:var(--text-main);">Rule #1: Budget Utilization &ge; 80%</strong>
          <p style="color:var(--text-muted); margin:3px 0;">Dispatches instant warning to Assigned PM and Finance Controller. Disables discretionary purchase approvals.</p>
        </div>
        <div style="padding:10px; background:#f8fafc; border:1px solid var(--border-color); border-radius:6px;">
          <strong style="color:var(--text-main);">Rule #2: Gateway Milestone Overdue &gt; 3 Days</strong>
          <p style="color:var(--text-muted); margin:3px 0;">Escalates to Central PMO Director and triggers mandatory exception recovery plan.</p>
        </div>
      </div>
    </div>
  </div>
</div>
