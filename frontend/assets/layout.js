// Shared sidebar + topbar — Font Awesome, all API modules
const WT_NAV = [
  { group: 'Overview' },
  { href: 'dashboard.html', icon: 'fa-chart-pie', label: 'Dashboard' },
  { href: 'resorts.html', icon: 'fa-hotel', label: 'Resorts' },
  { href: 'workflow.html', icon: 'fa-compass', label: 'Workflow Guide' },
  { group: 'Hierarchy & Projects' },
  { href: 'projects.html', icon: 'fa-folder-tree', label: 'Projects' },
  { href: 'project-detail.html', icon: 'fa-helmet-safety', label: 'Project Workspace' },
  { group: 'Execution & Site' },
  { href: 'planning.html', icon: 'fa-calendar-days', label: 'Tasks & Planning' },
  { href: 'milestones.html', icon: 'fa-bullseye', label: 'Milestones' },
  { href: 'daily-report.html', icon: 'fa-clipboard-list', label: 'Daily Report' },
  { href: 'issues.html', icon: 'fa-triangle-exclamation', label: 'Issues' },
  { group: 'Commercial & Cost' },
  { href: 'boq.html', icon: 'fa-list-check', label: 'BOQ' },
  { href: 'budget.html', icon: 'fa-coins', label: 'Budgets & Cost Centers' },
  { href: 'costs.html', icon: 'fa-chart-line', label: 'Purchases & Actuals' },
  { href: 'items.html', icon: 'fa-box', label: 'Item Master' },
  { href: 'inventory.html', icon: 'fa-lock', label: 'Inventory & Closure' },
  { group: 'Governance' },
  { href: 'users.html', icon: 'fa-users', label: 'Users' },
  { href: 'roles.html', icon: 'fa-user-shield', label: 'Roles & Permissions' },
  { href: 'notifications.html', icon: 'fa-bell', label: 'Notifications' },
  { href: 'audit-logs.html', icon: 'fa-scroll', label: 'Audit Logs' },
  { href: 'reports.html', icon: 'fa-file-lines', label: 'Reports' },
  { href: 'settings.html', icon: 'fa-gear', label: 'Settings' },
];

function wtCurrentPage() {
  return (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
}

function wtBuildSidebar() {
  const page = wtCurrentPage();
  let html = `
    <div class="side-header">
      <a href="dashboard.html" class="logo">
        <div class="logo-badge">W</div>
        <div><div>WISETRACK</div><div class="logo-sub">API Console</div></div>
      </a>
    </div>
    <div class="side-scroll">`;
  for (const item of WT_NAV) {
    if (item.group) {
      html += `<div class="nav-group-title">${item.group}</div>`;
      continue;
    }
    const active = page === item.href ? ' active' : '';
    html += `<a class="nav-link${active}" href="${item.href}"><span class="nav-icon"><i class="fa-solid ${item.icon}"></i></span><span>${item.label}</span></a>`;
  }
  html += `</div>
    <div class="side-user">
      <div class="avatar">U</div>
      <div class="user-meta">
        <div class="user-name">User</div>
        <div class="user-role-badge current-role-label">Role</div>
      </div>
    </div>`;
  return html;
}

function wtBuildTopbar() {
  const currentTheme = localStorage.getItem('WISETRACK_THEME') || 'blue';
  return `
    <div class="topbar-left">
      <div class="resort-selector-wrap">
        <label>Resort:</label>
        <select class="resort-select" id="globalResortSelector" onchange="setSelectedResortId(this.value)"></select>
      </div>
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="globalTableSearch" placeholder="Search tables, projects, items..." onkeyup="if(typeof globalFilterAllTables==='function') globalFilterAllTables(this.value)">
      </div>
    </div>
    <div class="topbar-right">
      <!-- Theme Switcher -->
      <div class="theme-switcher" title="Switch Theme Palette">
        <i class="fa-solid fa-palette"></i>
        <select id="globalThemeSelector" onchange="setGlobalTheme(this.value)">
          <option value="blue" ${currentTheme === 'blue' ? 'selected' : ''}>🔵 Blue</option>
          <option value="red" ${currentTheme === 'red' ? 'selected' : ''}>🔴 Red</option>
          <option value="green" ${currentTheme === 'green' ? 'selected' : ''}>🟢 Green</option>
          <option value="yellow" ${currentTheme === 'yellow' ? 'selected' : ''}>🟡 Yellow</option>
          <option value="white" ${currentTheme === 'white' ? 'selected' : ''}>⚪ White</option>
          <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>⚫ Dark</option>
          <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>🟣 Light</option>
        </select>
      </div>
      <span class="badge blue" style="font-size:11px;">Live API</span>
      <a href="notifications.html" class="header-action-btn" title="Inbox"><i class="fa-solid fa-bell"></i></a>
      <a href="login.html" class="header-action-btn" title="Logout" style="color:#ef4444;"><i class="fa-solid fa-right-from-bracket"></i></a>
    </div>`;
}

function wtApplyLayout() {
  const side = document.querySelector('aside.side');
  if (side) side.innerHTML = wtBuildSidebar();
  const top = document.querySelector('header.topbar');
  if (top) top.innerHTML = wtBuildTopbar();

  // Apply active theme
  if (typeof initTheme === 'function') initTheme();

  // Remove leftover static footers / duplicate chrome that break layout
  document.querySelectorAll('.main > footer, .workflow-guide-banner').forEach(el => el.remove());
}
