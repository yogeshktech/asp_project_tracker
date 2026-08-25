<?php
// Dynamic computations for Executive Dashboard
$totalProjects = count($projects);
$completedCount = count(array_filter($projects, fn($p) => ($p['progress'] ?? 0) >= 100 || ($p['health'] ?? '') === 'Completed'));
$onTrackCount = count(array_filter($projects, fn($p) => ($p['health'] ?? '') === 'On Track' && ($p['progress'] ?? 0) < 100));
$delayedCount = count(array_filter($projects, fn($p) => in_array($p['health'] ?? '', ['Delayed', 'At Risk'])));
$alertCount = count(array_filter($projects, fn($p) => ($p['progress'] ?? 0) >= 80 && ($p['progress'] ?? 0) < 100)) ?: 2;

$healthPercent = $totalProjects > 0 ? round(($onTrackCount / $totalProjects) * 100) : 75;

// Dynamic Donut Angles
$cPct = $totalProjects > 0 ? round(($completedCount / $totalProjects) * 100) : 21;
$oPct = $totalProjects > 0 ? round(($onTrackCount / $totalProjects) * 100) : 54;
$dPct = $totalProjects > 0 ? round(($delayedCount / $totalProjects) * 100) : 13;
$aPct = max(0, 100 - $cPct - $oPct - $dPct);

$offset1 = 0;
$offset2 = -$cPct;
$offset3 = -($cPct + $oPct);
$offset4 = -($cPct + $oPct + $dPct);

// Average Resort Progress
$resortProgressSum = array_sum(array_column($resorts, 'progress'));
$avgResortProgress = count($resorts) > 0 ? round($resortProgressSum / count($resorts), 1) : 65.0;
?>
<div class="content">
  <div class="breadcrumb-nav">
    <span>Portfolio Overview</span>
    <span>/</span>
    <span class="current">Executive Master Dashboard</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">PORTFOLIO INTELLIGENCE & TELEMETRY · WISERESORT PMO</div>
      <h1>Resort Portfolio & All-Projects Progress Control</h1>
      <p>Real-time cross-resort progress tracking, package status counts, 80% CapEx threshold alerts, and real-time field telemetry.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + New Resort</button>
      <button class="btn primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Create N-Level Project</button>
    </div>
  </div>

  <!-- Global Project Counts & Financial Metrics -->
  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Total Work Packages</span>
      <span class="kpi-value"><?php echo $totalProjects; ?> Projects</span>
      <span class="kpi-sub">Across <?php echo count($resorts); ?> Master Resorts</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">On Track & Healthy</span>
      <span class="kpi-value"><?php echo $onTrackCount; ?> Active</span>
      <span class="kpi-sub"><?php echo $healthPercent; ?>% Portfolio Health</span>
    </div>
    <div class="kpi warning">
      <span class="kpi-label">80% Budget & Risk Alerts</span>
      <span class="kpi-value"><?php echo $alertCount; ?> Packages</span>
      <span class="kpi-sub"><?php echo $delayedCount; ?> Delayed · <?php echo $alertCount; ?> Cost Center</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Total Master CapEx</span>
      <span class="kpi-value">₹148.50 Cr</span>
      <span class="kpi-sub">₹106.80 Cr Committed (71.9%)</span>
    </div>
  </div>

  <!-- Visual Analytics: Project Status Donut & Resort Velocity Bar Charts -->
  <div class="charts-grid">
    <!-- Chart 1: Projects by Status Donut -->
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">🥧 All Projects Status Distribution & Counts</div>
          <small style="color:var(--text-muted);"><?php echo $totalProjects; ?> Total Packages across Civil, MEP, HVAC & Fitouts</small>
        </div>
        <span class="badge blue"><?php echo $totalProjects; ?> Total Packages</span>
      </div>

      <div class="chart-canvas-wrap">
        <svg viewBox="0 0 36 36" style="width:160px; height:160px; transform:rotate(-90deg);">
          <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--border-light)" stroke-width="3.5"></circle>
          <!-- Completed -->
          <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#059669" stroke-width="3.5"
                  stroke-dasharray="<?php echo $cPct; ?> <?php echo 100 - $cPct; ?>" stroke-dashoffset="<?php echo $offset1; ?>"></circle>
          <!-- On Track -->
          <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#2563eb" stroke-width="3.5"
                  stroke-dasharray="<?php echo $oPct; ?> <?php echo 100 - $oPct; ?>" stroke-dashoffset="<?php echo $offset2; ?>"></circle>
          <!-- Delayed -->
          <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#d97706" stroke-width="3.5"
                  stroke-dasharray="<?php echo $dPct; ?> <?php echo 100 - $dPct; ?>" stroke-dashoffset="<?php echo $offset3; ?>"></circle>
          <!-- 80% Cost Alert -->
          <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#dc2626" stroke-width="3.5"
                  stroke-dasharray="<?php echo $aPct; ?> <?php echo 100 - $aPct; ?>" stroke-dashoffset="<?php echo $offset4; ?>"></circle>
        </svg>
        <div style="position:absolute; text-align:center;">
          <div style="font-size:22px; font-weight:800; color:var(--text-main);"><?php echo $totalProjects; ?></div>
          <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Packages</div>
        </div>
      </div>

      <div class="donut-legend">
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#059669;"></span> <span>🟢 Completed (<?php echo $completedCount; ?> Pkgs · <?php echo $cPct; ?>%)</span></div>
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#2563eb;"></span> <span>🔵 On Track (<?php echo $onTrackCount; ?> Pkgs · <?php echo $oPct; ?>%)</span></div>
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#d97706;"></span> <span>🟠 Delayed (<?php echo $delayedCount; ?> Pkgs · <?php echo $dPct; ?>%)</span></div>
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#dc2626;"></span> <span>🔴 80% Cost Alert (<?php echo $alertCount; ?> Pkgs · <?php echo $aPct; ?>%)</span></div>
      </div>
    </div>

    <!-- Chart 2: Resort-wise Progress & CapEx Rollup -->
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">📊 Resort-wise Physical Progress & CapEx Velocity</div>
          <small style="color:var(--text-muted);">Weighted engineering completion % per Resort property</small>
        </div>
        <span class="badge green"><?php echo count($resorts); ?> Active Properties</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
        <?php foreach ($resorts as $r): 
          $progClass = $r['progress'] >= 75 ? 'green' : ($r['progress'] >= 50 ? 'blue' : 'amber');
        ?>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <strong><?php echo htmlspecialchars($r['name']); ?> (<?php echo htmlspecialchars($r['code']); ?>)</strong>
              <span><b><?php echo $r['progress']; ?>%</b> (CapEx: <?php echo $r['budget']; ?> · <span style="color:var(--primary);"><?php echo $r['spent']; ?> Spent</span>)</span>
            </div>
            <div class="progress <?php echo $progClass; ?>" style="height:10px;"><i style="width:<?php echo $r['progress']; ?>%"></i></div>
          </div>
        <?php endforeach; ?>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--border-light); border:1px solid var(--border-color); border-radius:6px; padding:10px 14px; margin-top:14px; font-size:12px;">
        <div><b>Average Portfolio Progress:</b> <span style="color:var(--primary); font-weight:700;"><?php echo $avgResortProgress; ?>% Overall Execution</span></div>
        <div><a href="index.php?page=reports" class="btn sm primary">Generate PDF Pack ➔</a></div>
      </div>
    </div>
  </div>

  <!-- Master All-Projects Live Progress Matrix (Comprehensive Table) -->
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">All-Projects Live Progress & Status Control Matrix</h3>
        <div class="card-subtitle">Comprehensive status report of all packages, managers, budgets, completion % and active roadblocks</div>
      </div>
      <div class="btn-group">
        <a href="index.php?page=projects" class="btn sm"><i class="fa-solid fa-folder-tree"></i> WBS Hierarchy</a>
        <button class="btn sm" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-sliders"></i> Export Custom Report</button>
        <button class="btn sm primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> Add Work Package</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>RESORT & CODE</th>
            <th>PROJECT / PACKAGE TITLE</th>
            <th>DISCIPLINE</th>
            <th>PROJECT MANAGER</th>
            <th>APPROVED BUDGET</th>
            <th>COMMITTED SPEND</th>
            <th>PHYSICAL PROGRESS</th>
            <th>80% RAG STATUS</th>
            <th>ACTIVE ROADBLOCK</th>
            <th>TARGET OPENING</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($projects as $p): 
            $prog = $p['progress'] ?? 50;
            $progColor = $prog >= 80 ? 'green' : ($prog >= 50 ? 'blue' : 'amber');
            $rag = $prog >= 80 ? '84% Cost Alert' : ($prog >= 70 ? 'Healthy (<70%)' : 'Watch List');
            $ragBadge = $prog >= 80 ? 'red' : ($prog >= 70 ? 'green' : 'amber');
            $issueTxt = ($p['health'] ?? '') === 'At Risk' ? '#ISS-1024 Port Customs' : '0 Roadblocks';
            $issueBadge = ($p['health'] ?? '') === 'At Risk' ? 'amber' : 'green';
          ?>
            <tr>
              <td>
                <strong><?php echo htmlspecialchars($p['resortName'] ?? 'Master Resort'); ?></strong>
                <small><?php echo htmlspecialchars($p['resortId'] ?? 'RES-01'); ?></small>
              </td>
              <td>
                <strong><?php echo htmlspecialchars($p['name']); ?></strong>
                <small><?php echo htmlspecialchars($p['code']); ?> · Level <?php echo $p['level'] ?? 1; ?></small>
              </td>
              <td><span class="badge blue"><?php echo htmlspecialchars($p['discipline'] ?? 'Engineering'); ?></span></td>
              <td><b><?php echo htmlspecialchars($p['owner'] ?? 'Lead PM'); ?></b></td>
              <td><?php echo $p['budget'] ?? '₹10.00 Cr'; ?></td>
              <td><?php echo $p['spent'] ?? '₹6.50 Cr'; ?></td>
              <td>
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="progress <?php echo $progColor; ?>" style="width:55px; margin:0;"><i style="width:<?php echo $prog; ?>%"></i></div>
                  <b><?php echo $prog; ?>%</b>
                </div>
              </td>
              <td><span class="badge <?php echo $ragBadge; ?>"><?php echo $rag; ?></span></td>
              <td><span class="badge <?php echo $issueBadge; ?>"><?php echo $issueTxt; ?></span></td>
              <td><small><?php echo htmlspecialchars($p['endDate'] ?? '31 Dec 2026'); ?></small></td>
              <td>
                <a href="index.php?page=planning" class="btn sm" onclick="setSelectedProjectId('<?php echo $p['id']; ?>')">Open ➔</a>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Live Activity Stream & Exception Radar -->
  <div class="grid g2" style="margin-top:20px;">
    <!-- Live Telemetry Stream -->
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">📡 Live Site Activity & Operations Stream</h3>
          <div class="card-subtitle">Real-time daily field progress, milestone completions, and site engineer logs</div>
        </div>
        <span class="badge green">Live Sync</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; align-items:flex-start; gap:12px; padding:10px; background:var(--border-light); border-radius:8px; border:1px solid var(--border-color);">
          <span style="font-size:20px;">⚡</span>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <strong style="font-size:13px;">Grand Oasis Goa · Block A Main Riser</strong>
              <small style="color:var(--text-muted);">10 mins ago</small>
            </div>
            <p style="font-size:12px; margin:3px 0 0;">Rahul Sharma logged <b>+8% daily progress (72% total)</b>. Completed 350m Polycab cabling with 14 workers.</p>
          </div>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:10px; background:#fef2f2; border-radius:8px; border:1px solid #fecaca;">
          <span style="font-size:20px;">❄️</span>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <strong style="font-size:13px; color:#991b1b;">Grand Oasis Goa · HVAC Chiller Valves</strong>
              <span class="badge red">Customs Delay</span>
            </div>
            <p style="font-size:12px; margin:3px 0 0; color:#7f1d1d;">Port customs clearance delay logged (#ISS-1024). Automated escalation dispatch sent to PMO.</p>
          </div>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:10px; background:var(--border-light); border-radius:8px; border:1px solid var(--border-color);">
          <span style="font-size:20px;">🏛️</span>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <strong style="font-size:13px;">Royal Heritage Jaipur · Palace Wing</strong>
              <small style="color:var(--text-muted);">2 hrs ago</small>
            </div>
            <p style="font-size:12px; margin:3px 0 0;">Priya Mehta certified <b>58% progress</b> on Courtyard Lighting & Automation fitout.</p>
          </div>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:10px; background:var(--border-light); border-radius:8px; border:1px solid var(--border-color);">
          <span style="font-size:20px;">🏊</span>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <strong style="font-size:13px;">Himalayan Sanctuary Manali · Pool Complex</strong>
              <small style="color:var(--text-muted);">4 hrs ago</small>
            </div>
            <p style="font-size:12px; margin:3px 0 0;">Plunge pool waterproofing completed 100% and certified by QA auditor.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Active 80% Cost Alerts & PMO Actions -->
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">⚠️ Cost Center 80% RAG Alerts & Quick Actions</h3>
          <div class="card-subtitle">Automated triggers and shortcuts requiring PMO signoff</div>
        </div>
        <a href="index.php?page=notifications" class="btn sm">All Alerts ➔</a>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong style="color:#991b1b; font-size:13px;">🚨 Electrical Cost Center at 84% Utilization</strong>
            <span class="badge red">80% Trigger</span>
          </div>
          <p style="font-size:12px; margin:4px 0 8px; color:var(--text-main);">Grand Oasis Goa: ₹1.68 Cr of ₹2.00 Cr utilized. Discretionary orders locked.</p>
          <a href="index.php?page=budget" class="btn sm" style="background:#fff; border-color:#fca5a5; color:#991b1b;">Review Budget ➔</a>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
          <button class="btn primary" onclick="openCreateProjectModal()" style="justify-content:flex-start; text-align:left;">
            <span>🗂️</span> <span>Create N-Level Project Package</span>
          </button>
          <button class="btn" onclick="openAddDailyReportModal()" style="justify-content:flex-start; text-align:left;">
            <span>📝</span> <span>Log Daily Site Progress (DSR)</span>
          </button>
          <button class="btn" onclick="openReportExportModal('portfolio')" style="justify-content:flex-start; text-align:left;">
            <span>📊</span> <span>Generate Executive Master PDF Dossier</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>


