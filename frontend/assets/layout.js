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
  { href: 'users.html', icon: 'fa-users', label: 'Users & Access' },
  { href: 'notifications.html', icon: 'fa-bell', label: 'Notifications' },
  { href: 'audit-logs.html', icon: 'fa-scroll', label: 'Audit Logs' },
  { href: 'reports.html', icon: 'fa-file-lines', label: 'Reports' },
  { href: 'settings.html', icon: 'fa-gear', label: 'Settings' },
];

const WT_NAV_ACCESS = {
  'dashboard.html': '*',
  'resorts.html': 'Resorts',
  'workflow.html': '*',
  'projects.html': 'Projects',
  'project-detail.html': 'Projects',
  'planning.html': 'Tasks',
  'milestones.html': 'Tasks',
  'daily-report.html': 'Tasks',
  'issues.html': 'Issues',
  'boq.html': 'BOQ',
  'budget.html': 'Budgets',
  'costs.html': 'Costs',
  'items.html': 'Module',
  'inventory.html': 'Closure',
  'users.html': 'admin',
  'roles.html': 'admin',
  'notifications.html': '*',
  'audit-logs.html': 'Audit',
  'reports.html': 'Reports',
  'settings.html': 'admin'
};

function wtIsAdmin() {
  return localStorage.getItem('WISETRACK_IS_ADMIN') === 'true';
}

function wtCanViewModule(module) {
  if (wtIsAdmin()) return true;
  const perms = JSON.parse(localStorage.getItem('WISETRACK_PERMISSIONS') || '[]');
  const on = (p) => p.canView || p.CanView || p.canEdit || p.CanEdit || p.canUpdate || p.CanUpdate || p.canDelete || p.CanDelete;
  if (!module || module === '*') return perms.some(on);
  return perms.some(p => String(p.module || p.Module) === module && on(p));
}

function wtCan(module, right, projectId) {
  if (wtIsAdmin()) return true;
  const perms = JSON.parse(localStorage.getItem('WISETRACK_PERMISSIONS') || '[]');
  const keys = {
    view: ['canView', 'CanView'],
    edit: ['canEdit', 'CanEdit'],
    update: ['canUpdate', 'CanUpdate'],
    delete: ['canDelete', 'CanDelete']
  }[right] || ['canView', 'CanView'];
  return perms.some(p => {
    if (String(p.module || p.Module) !== module) return false;
    if (projectId && Number(p.projectId || p.ProjectId || 0) !== Number(projectId)) return false;
    return keys.some(k => p[k]);
  });
}

function wtPageAllowed(href) {
  if (href === 'dashboard.html') return wtIsAdmin() || wtCanViewModule('*') || wtCanViewModule('Dashboard');
  if (href === 'items.html') return wtCanViewModule('Module') || wtCanViewModule('BOQ');
  if (href === 'resorts.html') return wtCanViewModule('Resorts') || wtCanViewModule('Projects');
  const need = WT_NAV_ACCESS[href];
  if (!need) return true;
  if (need === 'admin') return wtIsAdmin();
  if (need === '*') return wtIsAdmin() || wtCanViewModule('*');
  return wtCanViewModule(need);
}

function wtCurrentPage() {
  return (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
}

function wtIsMobileNav() {
  return window.matchMedia('(max-width: 960px)').matches;
}

function wtOpenNav() {
  document.body.classList.add('nav-open');
  document.documentElement.classList.add('nav-open');
}

function wtCloseNav() {
  document.body.classList.remove('nav-open');
  document.documentElement.classList.remove('nav-open');
}

function wtToggleNav() {
  if (document.body.classList.contains('nav-open')) wtCloseNav();
  else wtOpenNav();
}

function wtEnsureNavChrome() {
  if (!document.querySelector('.side-backdrop')) {
    const veil = document.createElement('div');
    veil.className = 'side-backdrop';
    veil.setAttribute('data-wt-nav-close', '1');
    document.body.appendChild(veil);
  }
}

function wtBuildSidebar() {
  const page = wtCurrentPage();
  let html = `
    <div class="side-header">
      <a href="dashboard.html" class="logo">
        <div class="logo-badge"><i class="fa-solid fa-compass-drafting"></i></div>
        <div><div>WISETRACK</div><div class="logo-sub">Project Control Suite</div></div>
      </a>
      <button type="button" class="side-close" data-wt-nav-close="1" aria-label="Close menu"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="side-scroll">`;
  for (const item of WT_NAV) {
    if (item.group) {
      html += `<div class="nav-group-title">${item.group}</div>`;
      continue;
    }
    if (typeof wtPageAllowed === 'function' && !wtPageAllowed(item.href)) continue;
    const active = page === item.href ? ' active' : '';
    html += `<a class="nav-link${active}" href="${item.href}"><span class="nav-icon"><i class="fa-solid ${item.icon}"></i></span><span>${item.label}</span></a>`;
  }
  const storedName = localStorage.getItem('WISETRACK_USER_NAME') || 'User';
  const initials = storedName.split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const roleLabel = wtIsAdmin() ? 'Project Admin' : (localStorage.getItem('WISETRACK_ROLE') || 'User');
  html += `</div>
    <div class="side-user">
      <div class="avatar">${initials}</div>
      <div class="user-meta">
        <div class="user-name">${storedName.replace(/[<>]/g, '')}</div>
        <div class="user-role-badge current-role-label">${roleLabel}</div>
      </div>
      <a href="login.html" title="Sign Out" style="color:var(--sidebar-muted); font-size:13px; margin-left:auto; padding:4px;"><i class="fa-solid fa-arrow-right-from-bracket"></i></a>
    </div>`;
  return html;
}

function wtBuildTopbar() {
  const currentTheme = localStorage.getItem('WISETRACK_THEME') || 'blue';
  return `
    <div class="topbar-left">
      <button type="button" class="nav-toggle" data-wt-nav-toggle="1" aria-label="Open menu">
        <i class="fa-solid fa-bars"></i>
      </button>
      <div class="resort-selector-wrap" title="Current Resort Scope">
        <label><i class="fa-solid fa-hotel" style="color:var(--primary); font-size:11px;"></i> Resort:</label>
        <select class="resort-select" id="globalResortSelector" onchange="setSelectedResortId(this.value)"></select>
      </div>
      <div class="resort-selector-wrap" title="Active Project Scope">
        <label><i class="fa-solid fa-layer-group" style="color:var(--primary); font-size:11px;"></i> Project:</label>
        <select class="resort-select" id="globalProjectSelector" onchange="onGlobalProjectChange(this.value)" title="Tasks and planning scope"></select>
      </div>
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="globalTableSearch" placeholder="Search records..." onkeyup="if(typeof globalFilterAllTables==='function') globalFilterAllTables(this.value)">
        <span style="font-size:10px; font-weight:700; background:var(--border-light); padding:1px 5px; border-radius:4px; border:1px solid var(--border-color); color:var(--text-muted); flex-shrink:0;">⌘K</span>
      </div>
    </div>
    <div class="topbar-right">
      <!-- Theme Switcher -->
      <div class="theme-switcher" title="Switch Theme Palette">
        <i class="fa-solid fa-palette"></i>
        <select id="globalThemeSelector" onchange="setGlobalTheme(this.value)">
          <option value="blue" ${currentTheme === 'blue' ? 'selected' : ''}>🔵 Sapphire</option>
          <option value="red" ${currentTheme === 'red' ? 'selected' : ''}>🔴 Ruby</option>
          <option value="green" ${currentTheme === 'green' ? 'selected' : ''}>🟢 Emerald</option>
          <option value="yellow" ${currentTheme === 'yellow' ? 'selected' : ''}>🟡 Amber</option>
          <option value="white" ${currentTheme === 'white' ? 'selected' : ''}>⚪ Studio</option>
          <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>⚫ Obsidian</option>
          <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>🟣 Amethyst</option>
        </select>
      </div>
      <span class="badge green" style="font-size:11px; padding:4px 10px;"><i class="fa-solid fa-circle-dot" style="font-size:9px;"></i> Live API</span>
      <a href="notifications.html" class="header-action-btn" title="Notifications & Escalations"><i class="fa-solid fa-bell"></i></a>
      <a href="login.html" class="header-action-btn" title="Sign Out" style="color:#ef4444;"><i class="fa-solid fa-right-from-bracket"></i></a>
    </div>`;
}

function wtApplyLayout() {
  wtEnsureNavChrome();
  const side = document.querySelector('aside.side');
  if (side) side.innerHTML = wtBuildSidebar();
  const top = document.querySelector('header.topbar');
  if (top) top.innerHTML = wtBuildTopbar();

  // Apply active theme
  if (typeof initTheme === 'function') initTheme();

  // Remove leftover static footers / duplicate chrome that break layout
  document.querySelectorAll('.main > footer, .workflow-guide-banner').forEach(el => el.remove());
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-wt-nav-toggle]')) {
    e.preventDefault();
    wtToggleNav();
    return;
  }
  if (e.target.closest('[data-wt-nav-close]') || e.target.closest('.side-backdrop')) {
    wtCloseNav();
    return;
  }
  if (wtIsMobileNav() && e.target.closest('.side .nav-link')) {
    wtCloseNav();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') wtCloseNav();
});

window.addEventListener('resize', () => {
  if (!wtIsMobileNav()) wtCloseNav();
});

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('aside.side') || document.querySelector('header.topbar')) {
    wtApplyLayout();
  }
});
