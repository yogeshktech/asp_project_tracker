<?php
if (!isset($currentPage)) {
    $currentPage = isset($_GET['page']) ? trim($_GET['page']) : basename($_SERVER['PHP_SELF'], ".php");
    if ($currentPage == "index") $currentPage = "dashboard";
}
?>
<aside class="side">
  <div class="side-header">
    <a href="index.php?page=dashboard" class="logo">
      <div class="logo-badge"><i class="fa-solid fa-compass-drafting"></i></div>
      <div>
        <div>WISETRACK</div>
        <div class="logo-sub">Engineering Suite</div>
      </div>
    </a>
  </div>

  <div class="side-scroll">
    <div class="nav-group-title">Overview</div>
    <a class="nav-link <?php echo ($currentPage === 'dashboard') ? 'active' : ''; ?>" href="index.php?page=dashboard">
      <span class="nav-icon"><i class="fa-solid fa-chart-pie"></i></span>
      <span>Portfolio Dashboard</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'resorts') ? 'active' : ''; ?>" href="index.php?page=resorts">
      <span class="nav-icon"><i class="fa-solid fa-hotel"></i></span>
      <span>Resorts & Properties</span>
      <span class="nav-pill">4</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'workflow') ? 'active' : ''; ?>" href="index.php?page=workflow">
      <span class="nav-icon"><i class="fa-solid fa-compass"></i></span>
      <span>Step-by-Step Guide</span>
    </a>

    <div class="nav-group-title">Hierarchy & Projects</div>
    <a class="nav-link <?php echo ($currentPage === 'projects') ? 'active' : ''; ?>" href="index.php?page=projects">
      <span class="nav-icon"><i class="fa-solid fa-folder-tree"></i></span>
      <span>N-Level Projects</span>
      <span class="nav-pill">24</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'project-detail') ? 'active' : ''; ?>" href="index.php?page=project-detail">
      <span class="nav-icon"><i class="fa-solid fa-helmet-safety"></i></span>
      <span>Project Workspace</span>
    </a>

    <div class="nav-group-title">Execution & Site</div>
    <a class="nav-link <?php echo ($currentPage === 'planning') ? 'active' : ''; ?>" href="index.php?page=planning">
      <span class="nav-icon"><i class="fa-solid fa-calendar-days"></i></span>
      <span>Planning & WBS</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'milestones') ? 'active' : ''; ?>" href="index.php?page=milestones">
      <span class="nav-icon"><i class="fa-solid fa-bullseye"></i></span>
      <span>Milestones & Gates</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'daily-report') ? 'active' : ''; ?>" href="index.php?page=daily-report">
      <span class="nav-icon"><i class="fa-solid fa-clipboard-list"></i></span>
      <span>Daily Site Report (DSR)</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'issues') ? 'active' : ''; ?>" href="index.php?page=issues">
      <span class="nav-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
      <span>Issues & Incidents</span>
      <span class="nav-pill" style="background:#ef4444;">3</span>
    </a>

    <div class="nav-group-title">Commercial & Cost</div>
    <a class="nav-link <?php echo ($currentPage === 'boq') ? 'active' : ''; ?>" href="index.php?page=boq">
      <span class="nav-icon"><i class="fa-solid fa-list-check"></i></span>
      <span>Bill of Quantities (BOQ)</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'budget') ? 'active' : ''; ?>" href="index.php?page=budget">
      <span class="nav-icon"><i class="fa-solid fa-coins"></i></span>
      <span>Budget & Cost Centers</span>
      <span class="nav-pill" style="background:#f59e0b;">80% RAG</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'items') ? 'active' : ''; ?>" href="index.php?page=items">
      <span class="nav-icon"><i class="fa-solid fa-box"></i></span>
      <span>Item / Price Master</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'inventory') ? 'active' : ''; ?>" href="index.php?page=inventory">
      <span class="nav-icon"><i class="fa-solid fa-lock"></i></span>
      <span>Leftover Inventory & Closure</span>
    </a>

    <div class="nav-group-title">Governance & Administration</div>
    <a class="nav-link <?php echo ($currentPage === 'users') ? 'active' : ''; ?>" href="index.php?page=users">
      <span class="nav-icon"><i class="fa-solid fa-users"></i></span>
      <span>Users Directory</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'permissions') ? 'active' : ''; ?>" href="index.php?page=permissions">
      <span class="nav-icon">🔐</span>
      <span>Permissions Matrix</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'notifications') ? 'active' : ''; ?>" href="index.php?page=notifications">
      <span class="nav-icon"><i class="fa-solid fa-bell"></i></span>
      <span>Alerts & Escalation</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'audit-logs') ? 'active' : ''; ?>" href="index.php?page=audit-logs">
      <span class="nav-icon"><i class="fa-solid fa-scroll"></i></span>
      <span>Audit Logs & History</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'reports') ? 'active' : ''; ?>" href="index.php?page=reports">
      <span class="nav-icon"><i class="fa-solid fa-file-lines"></i></span>
      <span>Reports & Exports</span>
    </a>
    <a class="nav-link <?php echo ($currentPage === 'settings') ? 'active' : ''; ?>" href="index.php?page=settings">
      <span class="nav-icon"><i class="fa-solid fa-gear"></i></span>
      <span>System Settings</span>
    </a>
  </div>

  <div class="side-user">
    <div class="avatar"><?php echo isset($currentUser['avatar']) ? $currentUser['avatar'] : 'YK'; ?></div>
    <div class="user-meta">
      <div class="user-name"><?php echo htmlspecialchars(isset($currentUser['name']) ? $currentUser['name'] : 'Yogesh Kumar'); ?></div>
      <div class="user-role-badge current-role-label"><?php echo htmlspecialchars(isset($currentUser['role']) ? $currentUser['role'] : 'Super Admin'); ?></div>
    </div>
  </div>
</aside>
