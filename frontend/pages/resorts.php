<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">Resorts & Properties Master</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 1 · MASTER RESORT PROPERTIES DIRECTORY</div>
      <h1>Resorts & Multi-Property Management</h1>
      <p>Super Admin control: Listing, CapEx budgets, assigned General Managers, status changes, and full property lifecycle management.</p>
    </div>
    <div class="head-actions">
      <button class="btn primary" onclick="openCreateResortModal()"><i class="fa-solid fa-plus"></i> Create New Resort</button>
    </div>
  </div>

  <!-- Summary KPIs -->
  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Total Properties</span>
      <span class="kpi-value"><?php echo count($resorts); ?> Resorts</span>
      <span class="kpi-sub">Across 4 Major States</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Cumulative CapEx</span>
      <span class="kpi-value">₹148.50 Cr</span>
      <span class="kpi-sub">Total Master Allocation</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Total Committed</span>
      <span class="kpi-value">₹106.80 Cr</span>
      <span class="kpi-sub">71.9% Financial Progress</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Master Status</span>
      <span class="kpi-value">4 Active / On Track</span>
      <span class="kpi-sub">Zero Blocked Sites</span>
    </div>
  </div>

  <!-- Super Admin Action Bar & Table Listing -->
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Master Resort Properties Directory & Control</h3>
        <div class="card-subtitle">Super Admin / Main Admin rights: Edit details, change operational status, delete or create new properties</div>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="showToast('Exporting Resorts directory to CSV format...', 'info')"><i class="fa-solid fa-download"></i> Export CSV</button>
        <button class="btn sm primary" onclick="openCreateResortModal()"><i class="fa-solid fa-plus"></i> Add Resort</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>RESORT CODE & NAME</th>
            <th>LOCATION / REGION</th>
            <th>GENERAL MANAGER (GM)</th>
            <th>CAPEX BUDGET</th>
            <th>COMMITTED SPEND</th>
            <th>OVERALL PROGRESS</th>
            <th>TARGET OPENING</th>
            <th>STATUS</th>
            <th>SUPER ADMIN ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($resorts as $r): ?>
            <tr>
              <td>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:22px;"><i class="fa-solid fa-hotel"></i></span>
                  <div>
                    <strong style="font-size:13.5px; color:var(--text-main);"><?php echo htmlspecialchars($r['name']); ?></strong>
                    <small style="color:var(--text-muted);">Code: <code><?php echo htmlspecialchars($r['code']); ?></code> · ID: <?php echo $r['id']; ?></small>
                  </div>
                </div>
              </td>
              <td><?php echo htmlspecialchars($r['location']); ?></td>
              <td><b><?php echo htmlspecialchars($r['gm']); ?></b></td>
              <td><b style="color:var(--text-main);"><?php echo $r['budget']; ?></b></td>
              <td><?php echo $r['spent']; ?></td>
              <td>
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="progress" style="width:70px; margin:0;"><i style="width:<?php echo $r['progress']; ?>%"></i></div>
                  <span style="font-size:12px; font-weight:700;"><?php echo $r['progress']; ?>%</span>
                </div>
              </td>
              <td><small><?php echo isset($r['targetDate']) ? $r['targetDate'] : '31 Dec 2026'; ?></small></td>
              <td>
                <select class="resort-status-dropdown" onchange="handleToggleResortStatus('<?php echo $r['id']; ?>', this.value)" style="padding:4px 8px; border-radius:6px; font-size:11.5px; font-weight:700; border:1px solid var(--border-color); background:#fff;">
                  <option value="Active" <?php echo ($r['status'] == 'Active' || $r['status'] == 'On Track') ? 'selected' : ''; ?>><i class="fa-solid fa-circle" style="color:#059669;font-size:8px;"></i> Active / On Track</option>
                  <option value="In Construction" <?php echo ($r['status'] == 'In Construction') ? 'selected' : ''; ?>><i class="fa-solid fa-circle" style="color:#2563eb;font-size:8px;"></i> In Construction</option>
                  <option value="Under Renovation" <?php echo ($r['status'] == 'Under Renovation') ? 'selected' : ''; ?>>🟠 Under Renovation</option>
                  <option value="Inactive" <?php echo ($r['status'] == 'Inactive') ? 'selected' : ''; ?>><i class="fa-solid fa-circle" style="color:#dc2626;font-size:8px;"></i> Inactive / Blocked</option>
                </select>
              </td>
              <td>
                <div class="btn-group">
                  <a href="index.php?page=projects" class="btn sm" onclick="setSelectedResortId('<?php echo $r['id']; ?>')" title="Explore N-Level WBS Packages">Packages ➔</a>
                  <button class="btn sm" onclick="openEditResortModal('<?php echo $r['id']; ?>')" title="Edit Resort Details"><i class="fa-solid fa-pen"></i> Edit</button>
                  <button class="btn sm danger" onclick="confirmDeleteResort('<?php echo $r['id']; ?>')" title="Delete Resort"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Section 2: Properties under Resorts & Section 3: Project Types / Disciplines -->
  <div class="grid g2" style="margin-top:20px;">
    <!-- Section 2: Properties Master -->
    <div class="card" style="margin-bottom:0;">
      <div class="card-header">
        <div>
          <h3 class="card-title">🏢 2. Resort Properties Master (Sub-Properties & Blocks)</h3>
          <div class="card-subtitle">Specific physical properties, hotel wings, villas, and phases mapped to parent resort</div>
        </div>
        <button class="btn sm primary" onclick="showToast('Add Property form opened', 'info')"><i class="fa-solid fa-plus"></i> Add Property</button>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>PROPERTY NAME</th>
              <th>PARENT RESORT</th>
              <th>CODE</th>
              <th>LOCATION</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Main Palace Wing & Suites</strong></td>
              <td>Grand Oasis Goa</td>
              <td><code>PROP-GOA-01</code></td>
              <td>North Goa Coast</td>
              <td><span class="badge green">Active</span></td>
            </tr>
            <tr>
              <td><strong>Luxury Oceanfront Villas Cluster</strong></td>
              <td>Grand Oasis Goa</td>
              <td><code>PROP-GOA-02</code></td>
              <td>South Ridge</td>
              <td><span class="badge blue">In Construction</span></td>
            </tr>
            <tr>
              <td><strong>Heritage Courtyard & Spa Block</strong></td>
              <td>Royal Heritage Jaipur</td>
              <td><code>PROP-JAI-01</code></td>
              <td>Jaipur Palace Grounds</td>
              <td><span class="badge amber">Under Fitout</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 3: Project Types & Discipline Catalog -->
    <div class="card" style="margin-bottom:0;">
      <div class="card-header">
        <div>
          <h3 class="card-title">🏷️ 3. Project Types & Engineering Disciplines</h3>
          <div class="card-subtitle">Standardized engineering classifications across all packages (Civil, MEP, HVAC, Fitout)</div>
        </div>
        <button class="btn sm primary" onclick="showToast('Add Project Type form opened', 'info')"><i class="fa-solid fa-plus"></i> Add Type</button>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>DISCIPLINE / TYPE</th>
              <th>CATEGORY CODE</th>
              <th>SCOPE DESCRIPTION</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge blue">MEP & Electrical</span></td>
              <td><code>DISC-MEP-01</code></td>
              <td>Substation 11kV, HT/LT panels, busducts & riser distribution</td>
              <td><button class="btn sm" onclick="showToast('Editing MEP type', 'info')">Edit</button></td>
            </tr>
            <tr>
              <td><span class="badge green">Civil Structure</span></td>
              <td><code>DISC-CIV-01</code></td>
              <td>RCC foundation, columns, beam casting & waterproofing</td>
              <td><button class="btn sm" onclick="showToast('Editing Civil type', 'info')">Edit</button></td>
            </tr>
            <tr>
              <td><span class="badge amber">HVAC & Chillers</span></td>
              <td><code>DISC-HVAC-01</code></td>
              <td>Central water-cooled screw chillers, AHU & duct network</td>
              <td><button class="btn sm" onclick="showToast('Editing HVAC type', 'info')">Edit</button></td>
            </tr>
            <tr>
              <td><span class="badge gray">Interior Fitouts</span></td>
              <td><code>DISC-INT-01</code></td>
              <td>Guest room joinery, loose furniture, lighting & automation</td>
              <td><button class="btn sm" onclick="showToast('Editing Interior type', 'info')">Edit</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

