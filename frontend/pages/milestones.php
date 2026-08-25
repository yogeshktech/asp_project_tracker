<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=projects">Projects</a>
    <span>/</span>
    <span class="current">Milestones & Gateway Schedule</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 3 · GATEWAY MILESTONE SYSTEM</div>
      <h1>Project Milestones & Critical Gateways</h1>
      <p>Gateway signoffs, quality auditor approvals, predecessor locks and planned handover dates.</p>
    </div>
    <div class="head-actions">
      <button class="btn primary" onclick="openModal('Create Milestone Gateway', '<form onsubmit=\'event.preventDefault();closeModal();showToast(\x22Milestone added!\x22)\'><div class=\x22form-grid\x22><div class=\x22field full\x22><label>Milestone Title *</label><input required placeholder=\x22e.g. Substation Transformer Dry Commissioning\x22></div><div class=\x22field\x22><label>Target Date *</label><input type=\x22date\x22 required value=\x222026-10-15\x22></div><div class=\x22field\x22><label>Auditor / Signoff Lead</label><select><option>Dr. Arvind Swaminathan (Auditor)</option><option>Rahul Sharma (PM)</option></select></div><div class=\x22field full\x22><label>Gate Deliverables</label><textarea placeholder=\x22List mandatory certificates required to pass this gateway...\x22></textarea></div></div><div class=\x22modalfoot\x22 style=\x22padding:0;margin-top:14px;\x22><button type=\x22button\x22 class=\x22btn\x22 onclick=\x22closeModal()\x22>Cancel</button><button type=\x22submit\x22 class=\x22btn primary\x22><i class="fa-solid fa-plus"></i> Save Milestone</button></div></form>')"><i class="fa-solid fa-plus"></i> Add Milestone Gateway</button>
    </div>
  </div>

  <div class="grid g-2-1">
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Grand Resort MEP & Automation — Milestone Sequence</h3>
          <div class="card-subtitle">Linear dependency chain from statutory kickoff to resort handover</div>
        </div>
        <span class="badge blue">6 Gateways</span>
      </div>

      <div class="timeline">
        <div class="event completed">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong>M-01: Project Kickoff & Statutory Approvals</strong>
            <span class="badge green">Completed · 100%</span>
          </div>
          <small>Target: 15 Jan 2026 · Signed off by PMO & Client GM</small>
        </div>

        <div class="event completed">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong>M-02: BOQ Baseline Freeze & Vendor Procurement</strong>
            <span class="badge green">Completed · 100%</span>
          </div>
          <small>Target: 28 Feb 2026 · Approved by Finance & Contracts Controller</small>
        </div>

        <div class="event completed">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong>M-03: Substation Equipment Delivery & Site Readiness</strong>
            <span class="badge green">Completed · 100%</span>
          </div>
          <small>Target: 15 Jul 2026 · Quality Passed by Dr. Arvind Swaminathan (Auditor)</small>
        </div>

        <div class="event active">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong>M-04: Cable Tray & Main Distribution Cabling 75%</strong>
            <span class="badge blue">Current Stage · 72%</span>
          </div>
          <small>Target: 24 Aug 2026 · Owner: Rahul Sharma · 350m Polycab pulled</small>
        </div>

        <div class="event">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong>M-05: Chiller Plant Dry Commissioning & VRV Testing</strong>
            <span class="badge gray">Planned · 0%</span>
          </div>
          <small>Target: 15 Oct 2026 · Owner: Manoj Joshi · Depends on M-04 and valve customs clearance</small>
        </div>

        <div class="event">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong>M-06: Final Handover Gate & Signed GM Certificate</strong>
            <span class="badge gray">Planned · 0%</span>
          </div>
          <small>Target: 24 Dec 2026 · Mandatory Leftover Material Reconciliation Gatekeeper</small>
        </div>
      </div>
    </div>

    <div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Auditor Signoff Gate</h3>
        </div>
        <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6;">
          Quality and Safety Auditors must certify each gateway before succeeding milestones are unlocked.
        </p>
        <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:6px; padding:12px; margin:14px 0; font-size:12px;">
          <div style="color:var(--text-muted); font-size:11px;">CURRENT AUDITOR:</div>
          <strong style="color:var(--text-main);">Dr. Arvind Swaminathan</strong>
          <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">Last inspection: Substation LT Panels (Passed)</div>
        </div>
        <button class="btn primary sm" style="width:100%;" onclick="showToast('Quality Inspection certificate downloaded', 'info')">
          <i class="fa-solid fa-file-lines"></i> Download Inspection Certificate
        </button>
      </div>
    </div>
  </div>
</div>
