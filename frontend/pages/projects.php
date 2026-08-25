<?php
$selectedResortId = $_GET['resortId'] ?? 'RES-GOA-01';
$currentResort = null;
foreach ($resorts as $r) {
    if ($r['id'] === $selectedResortId) {
        $currentResort = $r;
        break;
    }
}
if (!$currentResort && !empty($resorts)) {
    $currentResort = $resorts[0];
    $selectedResortId = $currentResort['id'];
}

// Filter projects for selected resort (or all)
$resortProjects = array_values(array_filter($projects, function($p) use ($selectedResortId) {
    return empty($selectedResortId) || $selectedResortId === 'all' || ($p['resortId'] ?? '') === $selectedResortId;
}));

// Build project hierarchy map for recursive rendering
$projectTree = [];
$projectMap = [];
foreach ($resortProjects as $p) {
    $p['children'] = [];
    $projectMap[$p['id']] = $p;
}
foreach ($projectMap as $id => $p) {
    if (!empty($p['parentId']) && isset($projectMap[$p['parentId']])) {
        $projectMap[$p['parentId']]['children'][] = &$projectMap[$id];
    } else {
        $projectTree[] = &$projectMap[$id];
    }
}

function renderPhpTreeNode($node, $depth = 1, $parentName = '') {
    $hasChildren = !empty($node['children']);
    $prog = $node['progress'] ?? 0;
    $progColor = $prog >= 80 ? 'green' : ($prog >= 50 ? 'blue' : 'amber');
    $levelClass = $depth === 1 ? 'level-1' : ($depth === 2 ? 'level-2' : ($depth === 3 ? 'level-3' : 'level-4'));
    $icon = $depth === 1 ? '🏗️' : ($depth === 2 ? '↳ 🏢' : ($depth === 3 ? '↳ ↳ 🔨' : '↳ ↳ ↳ ⚡'));
    $healthBadge = $node['healthBadge'] ?? ($prog >= 80 ? 'green' : ($prog >= 50 ? 'blue' : 'amber'));
    $health = $node['health'] ?? 'On Track';
    
    // Level Pill & Relation Tag
    $levelPill = '';
    $relationTxt = '';
    $addBtnTxt = '';
    if ($depth === 1) {
        $levelPill = '<span class="tree-level-pill lvl-1">🔵 Level 1 · Root Parent</span>';
        $relationTxt = 'Root Major Project';
        $addBtnTxt = '+ Sub-Project (L2)';
    } elseif ($depth === 2) {
        $levelPill = '<span class="tree-level-pill lvl-2">🟣 Level 2 · Sub-Project</span>';
        $relationTxt = '↳ Child of Level 1: <strong>' . htmlspecialchars($parentName) . '</strong>';
        $addBtnTxt = '+ Work Package (L3)';
    } elseif ($depth === 3) {
        $levelPill = '<span class="tree-level-pill lvl-3">🟢 Level 3 · Child Package</span>';
        $relationTxt = '↳ ↳ Child of Level 2: <strong>' . htmlspecialchars($parentName) . '</strong>';
        $addBtnTxt = '+ Sub-Task (L4)';
    } else {
        $levelPill = '<span class="tree-level-pill lvl-4">🟠 Level ' . $depth . ' · N-th Term Task</span>';
        $relationTxt = '↳ ↳ ↳ Child of Level ' . ($depth - 1) . ': <strong>' . htmlspecialchars($parentName) . '</strong>';
        $addBtnTxt = '+ Child Task';
    }
    
    $html = '
    <div class="tree-node">
      <div class="tree-header ' . $levelClass . '" onclick="toggleTreeNode(this)">
        <span class="tree-toggle">' . ($hasChildren ? '▼' : '•') . '</span>
        <span style="font-size:15px;">' . $icon . '</span>
        <div class="tree-title">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
            ' . $levelPill . '
            <strong style="font-size:14px;">' . htmlspecialchars($node['name']) . '</strong>
          </div>
          <small style="color:var(--text-muted); font-size:11.5px;">' . $relationTxt . ' · WBS: <code>' . htmlspecialchars($node['code']) . '</code> · Discipline: <b>' . htmlspecialchars($node['discipline'] ?? 'General') . '</b> · Lead: <b>' . htmlspecialchars($node['owner'] ?? 'Lead PM') . '</b> · Budget: <b>' . htmlspecialchars($node['budget'] ?? '₹5.00 Cr') . '</b></small>
        </div>
        <div class="tree-meta">
          <div class="progress ' . $progColor . '" style="width:60px; margin:0;"><i style="width:' . $prog . '%"></i></div>
          <span>' . $prog . '%</span>
          <span class="badge ' . $healthBadge . '">' . htmlspecialchars($health) . '</span>
          <button class="btn sm primary" title="Add Child Sub-Package" onclick="event.stopPropagation(); openCreateProjectModal(\'' . $node['id'] . '\');"><i class="fa-solid fa-plus"></i> ' . $addBtnTxt . '</button>
          <button class="btn sm" title="Edit Package" onclick="event.stopPropagation(); openEditProjectModal(\'' . $node['id'] . '\');"><i class="fa-solid fa-pen"></i></button>
          <button class="btn sm danger" title="Delete Package" onclick="event.stopPropagation(); confirmDeleteProject(\'' . $node['id'] . '\');"><i class="fa-solid fa-trash"></i></button>
          <a href="index.php?page=project-detail" class="btn sm" title="Open Workspace" onclick="event.stopPropagation(); setSelectedProjectId(\'' . $node['id'] . '\');">Open ➔</a>
        </div>
      </div>';
    
    if ($hasChildren) {
        $html .= '<div class="tree-children">';
        foreach ($node['children'] as $child) {
            $html .= renderPhpTreeNode($child, $depth + 1, $node['name']);
        }
        $html .= '</div>';
    }
    
    $html .= '</div>';
    return $html;
}
?>
<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=resorts">Resorts</a>
    <span>/</span>
    <span class="current">N-Level Projects Hierarchy</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 2 · MULTI-LEVEL WBS STRUCTURE</div>
      <h1>N-Level Project Hierarchy & Packages</h1>
      <p>Resort Property ➔ Level 1 Major Project ➔ Level 2 Sub-Project ➔ Level 3 Work Packages ➔ Tasks. Super Admin can edit, delete, or add sub-packages.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + New Resort</button>
      <button class="btn primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Create N-Level Project</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Selected Property</span>
      <span class="kpi-value" id="currentResortLabel"><?php echo htmlspecialchars($currentResort['name'] ?? 'Master Resort'); ?></span>
      <span class="kpi-sub"><?php echo htmlspecialchars($currentResort['code'] ?? 'RES-01'); ?></span>
    </div>
    <div class="kpi">
      <span class="kpi-label">WBS Hierarchy Depth</span>
      <span class="kpi-value">3 Nested Levels</span>
      <span class="kpi-sub">Root ➔ Sub ➔ Work Package</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Active Work Packages</span>
      <span class="kpi-value"><?php echo count($resortProjects); ?> Packages</span>
      <span class="kpi-sub">Civil, MEP, HVAC, Interiors</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Sub-Project Budget</span>
      <span class="kpi-value"><?php echo htmlspecialchars($currentResort['budget'] ?? '₹48.50 Cr'); ?></span>
      <span class="kpi-sub"><?php echo htmlspecialchars($currentResort['spent'] ?? '₹34.20 Cr'); ?> Committed</span>
    </div>
  </div>

  <!-- Filter & View Selector -->
  <div class="card" style="padding:14px 20px; margin-bottom:16px;">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-weight:700; font-size:12px; color:var(--text-muted);">FILTER BY RESORT:</span>
        <select id="projectFilterResort" class="resort-select" style="background:var(--bg-card); color:var(--text-main); border:1px solid var(--border-color); padding:6px 10px; border-radius:6px;" onchange="location.href='index.php?page=projects&resortId=' + this.value">
          <option value="all" <?php echo $selectedResortId === 'all' ? 'selected' : ''; ?>>🌐 All Master Resorts (Full Portfolio)</option>
          <?php foreach ($resorts as $resort): ?>
            <option value="<?php echo $resort['id']; ?>" <?php echo $resort['id'] === $selectedResortId ? 'selected' : ''; ?>>
              <?php echo htmlspecialchars($resort['name']); ?> (<?php echo $resort['code']; ?>)
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="btn-group">
        <button class="btn sm primary" id="btnTree" onclick="toggleProjectView('tree', this)">🌲 Tree Hierarchy View</button>
        <button class="btn sm" id="btnTable" onclick="toggleProjectView('table', this)">▤ Table List View</button>
        <button class="btn sm" id="btnCards" onclick="toggleProjectView('cards', this)">▦ Card Grid View</button>
      </div>
    </div>
  </div>

  <!-- VIEW 1: Interactive Tree View -->
  <div id="treeViewContainer" class="tree-container">
    <!-- Resort Root Node -->
    <div class="tree-node">
      <div class="tree-header level-0">
        <span style="font-size:16px;"><i class="fa-solid fa-hotel"></i></span>
        <div class="tree-title">
          <strong style="font-size:14px;"><?php echo htmlspecialchars($currentResort['name'] ?? 'Master Resort'); ?> (<?php echo htmlspecialchars($currentResort['code'] ?? 'RES'); ?>)</strong>
          <small>Master Resort Property · CapEx Budget: <?php echo htmlspecialchars($currentResort['budget'] ?? '₹48.50 Cr'); ?> · Overall Progress <?php echo htmlspecialchars($currentResort['progress'] ?? 76); ?>% · GM: <?php echo htmlspecialchars($currentResort['gm'] ?? 'PMO Lead'); ?></small>
        </div>
        <div class="tree-meta">
          <span class="badge green"><?php echo htmlspecialchars($currentResort['progress'] ?? 76); ?>% Delivered</span>
          <button class="btn sm primary" onclick="openCreateProjectModal();"><i class="fa-solid fa-plus"></i> Add Level-1 Major Project</button>
        </div>
      </div>
    </div>

    <!-- Recursive Project Tree Rendering -->
    <?php if (empty($projectTree)): ?>
      <div style="padding:32px; text-align:center; color:var(--text-muted);">
        No projects found for this resort property. Click <b>+ Create N-Level Project</b> above to add one.
      </div>
    <?php else: ?>
      <?php foreach ($projectTree as $rootProject): ?>
        <?php echo renderPhpTreeNode($rootProject, 1, $currentResort['name'] ?? 'Root'); ?>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>

  <!-- VIEW 2: Table List View -->
  <div id="tableViewContainer" class="card" style="display:none; margin-top:20px; padding:0;">
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>WBS LEVEL & TYPE</th>
            <th>PROJECT TITLE & SCOPE</th>
            <th>PARENT HIERARCHY RELATION</th>
            <th>WBS CODE</th>
            <th>DISCIPLINE</th>
            <th>OWNER</th>
            <th>BUDGET</th>
            <th>PROGRESS</th>
            <th>STATUS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($resortProjects as $p): 
            $prog = $p['progress'] ?? 50;
            $progColor = $prog >= 80 ? 'green' : ($prog >= 50 ? 'blue' : 'amber');
            $lvl = $p['level'] ?? 1;
            $parentObj = null;
            if (!empty($p['parentId'])) {
              foreach ($projects as $item) {
                if ($item['id'] === $p['parentId']) { $parentObj = $item; break; }
              }
            }
          ?>
            <tr>
              <td>
                <span class="tree-level-pill lvl-<?php echo min(4, $lvl); ?>">
                  <?php echo $lvl == 1 ? '🔵 Level 1 · Root' : ($lvl == 2 ? '🟣 Level 2 · Sub' : ($lvl == 3 ? '🟢 Level 3 · Package' : '🟠 Level ' . $lvl . ' · Task')); ?>
                </span>
              </td>
              <td>
                <strong><?php echo htmlspecialchars($p['name']); ?></strong>
                <?php if (!empty($p['desc'])): ?>
                  <small style="color:var(--text-muted);"><?php echo htmlspecialchars($p['desc']); ?></small>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($parentObj): ?>
                  <small style="font-weight:600; color:var(--text-main);">↳ Parent: <u><?php echo htmlspecialchars($parentObj['name']); ?></u></small>
                  <small style="color:var(--text-muted);">Code: <?php echo htmlspecialchars($parentObj['code']); ?></small>
                <?php else: ?>
                  <span class="badge blue">None (Root Parent)</span>
                <?php endif; ?>
              </td>
              <td><code><?php echo htmlspecialchars($p['code']); ?></code></td>
              <td><span class="badge blue"><?php echo htmlspecialchars($p['discipline'] ?? 'General'); ?></span></td>
              <td><?php echo htmlspecialchars($p['owner'] ?? 'Lead PM'); ?></td>
              <td><b><?php echo $p['budget'] ?? '₹5.00 Cr'; ?></b></td>
              <td>
                <div style="display:flex; align-items:center; gap:6px;">
                  <div class="progress <?php echo $progColor; ?>" style="width:50px; margin:0;"><i style="width:<?php echo $prog; ?>%"></i></div>
                  <span><?php echo $prog; ?>%</span>
                </div>
              </td>
              <td><span class="badge <?php echo $p['healthBadge'] ?? 'green'; ?>"><?php echo $p['health'] ?? 'On Track'; ?></span></td>
              <td>
                <div class="btn-group">
                  <button class="btn sm primary" title="Add Child Sub-Package" onclick="openCreateProjectModal('<?php echo $p['id']; ?>')"><i class="fa-solid fa-plus"></i></button>
                  <button class="btn sm" onclick="openEditProjectModal('<?php echo $p['id']; ?>')"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn sm danger" onclick="confirmDeleteProject('<?php echo $p['id']; ?>')"><i class="fa-solid fa-trash"></i></button>
                  <a href="index.php?page=project-detail" class="btn sm" onclick="setSelectedProjectId('<?php echo $p['id']; ?>')">Workspace</a>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 3: Card Grid View -->
  <div id="cardsViewContainer" class="grid g3" style="display:none; margin-top:20px;">
    <?php foreach ($resortProjects as $p): 
      $prog = $p['progress'] ?? 50;
      $progColor = $prog >= 80 ? 'green' : ($prog >= 50 ? 'blue' : 'amber');
      $lvl = $p['level'] ?? 1;
      $parentObj = null;
      if (!empty($p['parentId'])) {
        foreach ($projects as $item) {
          if ($item['id'] === $p['parentId']) { $parentObj = $item; break; }
        }
      }
    ?>
      <div class="card" style="margin-bottom:0; border-top: 4px solid <?php echo $lvl == 1 ? '#2563eb' : ($lvl == 2 ? '#7c3aed' : ($lvl == 3 ? '#059669' : '#d97706')); ?>;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <span class="badge <?php echo $p['healthBadge'] ?? 'green'; ?>"><?php echo $p['health'] ?? 'On Track'; ?></span>
          <span class="tree-level-pill lvl-<?php echo min(4, $lvl); ?>">
            <?php echo $lvl == 1 ? '🔵 Level 1 Parent' : ($lvl == 2 ? '🟣 Level 2 Sub' : ($lvl == 3 ? '🟢 Level 3 Package' : '🟠 Level ' . $lvl . ' Task')); ?>
          </span>
        </div>
        <h3 style="font-size:15px; font-weight:800; margin:10px 0 4px;"><?php echo htmlspecialchars($p['name']); ?></h3>
        <?php if ($parentObj): ?>
          <div style="font-size:11px; color:#6b21a8; background:#faf5ff; padding:3px 6px; border-radius:4px; margin-bottom:6px;">
            ↳ Parent: <b><?php echo htmlspecialchars($parentObj['name']); ?></b>
          </div>
        <?php endif; ?>
        <div style="font-size:11.5px; color:var(--text-muted);">Code: <code><?php echo $p['code']; ?></code> · <?php echo htmlspecialchars($p['discipline'] ?? 'General'); ?></div>
        <p style="font-size:12px; color:var(--text-muted); margin:10px 0; min-height:36px;"><?php echo htmlspecialchars($p['desc'] ?? 'Engineering deliverable package with milestones and technical specifications.'); ?></p>
        <div class="progress <?php echo $progColor; ?>"><i style="width:<?php echo $prog; ?>%"></i></div>
        <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:12px;">
          <span><b><?php echo $prog; ?>%</b> complete</span>
          <span>Budget: <b><?php echo $p['budget'] ?? '₹5.00 Cr'; ?></b></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
          <div class="btn-group">
            <button class="btn sm primary" title="Add Child Sub-Package" onclick="openCreateProjectModal('<?php echo $p['id']; ?>')"><i class="fa-solid fa-plus"></i></button>
            <button class="btn sm" onclick="openEditProjectModal('<?php echo $p['id']; ?>')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" onclick="confirmDeleteProject('<?php echo $p['id']; ?>')"><i class="fa-solid fa-trash"></i></button>
          </div>
          <a href="index.php?page=project-detail" class="btn sm" onclick="setSelectedProjectId('<?php echo $p['id']; ?>')">Workspace ➔</a>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div>

<script>
function toggleProjectView(view, btn) {
  document.getElementById('treeViewContainer').style.display = view === 'tree' ? 'block' : 'none';
  document.getElementById('cardsViewContainer').style.display = view === 'cards' ? 'grid' : 'none';
  document.getElementById('tableViewContainer').style.display = view === 'table' ? 'block' : 'none';
  
  const buttons = btn.parentElement.querySelectorAll('.btn');
  buttons.forEach(b => b.classList.remove('primary'));
  btn.classList.add('primary');
}

function toggleTreeNode(headerEl) {
  const toggle = headerEl.querySelector('.tree-toggle');
  const node = headerEl.closest('.tree-node');
  const childrenWrap = node.querySelector('.tree-children');
  if (childrenWrap) {
    const isHidden = childrenWrap.style.display === 'none';
    childrenWrap.style.display = isHidden ? 'block' : 'none';
    if (toggle) toggle.textContent = isHidden ? '▼' : '▶';
  }
}

// Client-Side N-Level Hierarchy Dynamic Synchronization
function syncClientSideProjects() {
  if (typeof getProjects !== 'function') return;
  const allProjects = getProjects();
  if (!allProjects || !allProjects.length) return;

  const resortSel = document.getElementById('projectFilterResort');
  const selectedResort = resortSel ? resortSel.value : 'all';

  const filtered = selectedResort === 'all' 
    ? allProjects 
    : allProjects.filter(p => String(p.resortId) === String(selectedResort) || String(p.resortId) === `RES-${selectedResort}`);

  // 1. Normalize
  const normalized = filtered.map(p => ({
    ...p,
    id: String(p.id),
    parentId: (p.parentProjectId !== undefined && p.parentProjectId !== null) ? String(p.parentProjectId) : (p.parentId ? String(p.parentId) : null),
    children: []
  }));

  const map = new Map();
  normalized.forEach(p => map.set(p.id, p));

  const roots = [];
  normalized.forEach(p => {
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId).children.push(p);
    } else {
      roots.push(p);
    }
  });

  // 2. Render Recursive Tree
  function renderNode(node, depth = 1, parentName = '') {
    const hasChildren = node.children && node.children.length > 0;
    const prog = node.progress || 0;
    const progColor = prog >= 80 ? 'green' : (prog >= 50 ? 'blue' : 'amber');
    const levelClass = depth === 1 ? 'level-1' : (depth === 2 ? 'level-2' : (depth === 3 ? 'level-3' : 'level-4'));
    const icon = depth === 1 ? '🏗️' : (depth === 2 ? '↳ 🏢' : (depth === 3 ? '↳ ↳ 🔨' : '↳ ↳ ↳ ⚡'));

    let levelPill = '';
    let relationTxt = '';
    let addBtnTxt = '';
    if (depth === 1) {
      levelPill = '<span class="tree-level-pill lvl-1">🔵 Level 1 · Root Parent</span>';
      relationTxt = 'Root Major Project';
      addBtnTxt = '+ Sub-Project (L2)';
    } else if (depth === 2) {
      levelPill = '<span class="tree-level-pill lvl-2">🟣 Level 2 · Sub-Project</span>';
      relationTxt = `↳ Child of Level 1: <strong>${escapeHtml(parentName)}</strong>`;
      addBtnTxt = '+ Work Package (L3)';
    } else if (depth === 3) {
      levelPill = '<span class="tree-level-pill lvl-3">🟢 Level 3 · Child Package</span>';
      relationTxt = `↳ ↳ Child of Level 2: <strong>${escapeHtml(parentName)}</strong>`;
      addBtnTxt = '+ Sub-Task (L4)';
    } else {
      levelPill = `<span class="tree-level-pill lvl-4">🟠 Level ${depth} · N-th Term Task</span>`;
      relationTxt = `↳ ↳ ↳ Child of Level ${depth - 1}: <strong>${escapeHtml(parentName)}</strong>`;
      addBtnTxt = '+ Child Task';
    }

    return `
      <div class="tree-node">
        <div class="tree-header ${levelClass}" onclick="toggleTreeNode(this)">
          <span class="tree-toggle">${hasChildren ? '▼' : '•'}</span>
          <span style="font-size:15px;">${icon}</span>
          <div class="tree-title">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
              ${levelPill}
              <strong style="font-size:14px;">${escapeHtml(node.name || '')}</strong>
            </div>
            <small style="color:var(--text-muted); font-size:11.5px;">${relationTxt} · WBS: <code>${escapeHtml(node.code || '')}</code> · Discipline: <b>${escapeHtml(node.discipline || 'General')}</b> · Lead: <b>${escapeHtml(node.owner || 'Lead PM')}</b> · Budget: <b>${node.budget || '₹5.00 Cr'}</b></small>
          </div>
          <div class="tree-meta">
            <div class="progress ${progColor}" style="width:60px; margin:0;"><i style="width:${prog}%"></i></div>
            <span>${prog}%</span>
            <span class="badge ${node.healthBadge || (prog >= 80 ? 'green' : 'amber')}">${escapeHtml(node.health || 'On Track')}</span>
            <button class="btn sm primary" title="Add Child Sub-Package" onclick="event.stopPropagation(); openCreateProjectModal('${node.id}');"><i class="fa-solid fa-plus"></i> ${addBtnTxt}</button>
            <button class="btn sm" title="Edit Package" onclick="event.stopPropagation(); openEditProjectModal('${node.id}');"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" title="Delete Package" onclick="event.stopPropagation(); confirmDeleteProject('${node.id}');"><i class="fa-solid fa-trash"></i></button>
            <a href="index.php?page=project-detail" class="btn sm" title="Open Workspace" onclick="event.stopPropagation(); setSelectedProjectId('${node.id}');">Open ➔</a>
          </div>
        </div>
        ${hasChildren ? `<div class="tree-children">${node.children.map(c => renderNode(c, depth + 1, node.name)).join('')}</div>` : ''}
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const treeRoot = document.getElementById('treeViewContainer');
  if (treeRoot && roots.length > 0) {
    const resortHeader = treeRoot.querySelector('.level-0')?.closest('.tree-node');
    const resortHtml = resortHeader ? resortHeader.outerHTML : '';
    treeRoot.innerHTML = resortHtml + roots.map(r => renderNode(r, 1, 'Root')).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => syncClientSideProjects(), 100);
});
</script>


