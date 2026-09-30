// Full API UI modules — replaces page .content with live Swagger-backed screens
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const detailValue = value => value == null || (typeof value === 'string' && !value.trim()) ? 'N/A' : esc(value);

  function root() {
    let el = document.getElementById('apiPageRoot');
    if (!el) {
      el = document.querySelector('.content');
      if (el) el.id = 'apiPageRoot';
    }
    if (!el) {
      el = document.createElement('div');
      el.className = 'content';
      el.id = 'apiPageRoot';
      document.querySelector('.main')?.appendChild(el);
    }
    // Keep only topbar + content inside .main
    const main = document.querySelector('.main');
    if (main) {
      [...main.children].forEach(ch => {
        if (!ch.classList.contains('topbar') && ch.id !== 'apiPageRoot' && !ch.classList.contains('content')) {
          ch.remove();
        }
      });
    }
    return el;
  }

  function pageHead(title, sub, actionsHtml = '') {
    return `<div class="head">
      <div style="min-width:0;flex:1">
        <div class="eyebrow">LIVE API</div>
        <h1>${esc(title)}</h1>
        <p>${esc(sub)}</p>
      </div>
      <div class="head-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${actionsHtml}</div>
    </div>`;
  }

  function tableWrap(headers, bodyId) {
    return `<div class="card"><div class="table-wrap"><table class="table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody id="${bodyId}"><tr><td colspan="${headers.length}">Loading...</td></tr></tbody></table></div></div>`;
  }

  function errRow(colspan, err) {
    return `<tr><td colspan="${colspan}" style="color:#dc2626">${esc(err.message || err)}</td></tr>`;
  }

  function emptyRow(colspan, msg) {
    return `<tr><td colspan="${colspan}">${esc(msg)}</td></tr>`;
  }

  function formatBudgetValue(amount, currency = 'INR') {
    if (amount == null || !Number.isFinite(Number(amount))) return 'Not set';
    const value = Number(amount);
    const code = String(currency || 'INR').toUpperCase();
    if (code === 'INR' && Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    return `${code === 'INR' ? '₹' : `${code} `}${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  function projectBudgetLabel(project) {
    return formatBudgetValue(project.projectBudgetAmount, project.projectBudgetCurrency || project.currency || 'INR');
  }

  async function loadProjectsList() {
    const resortId = localStorage.getItem('WISETRACK_SELECTED_RESORT') || undefined;
    const apiProjects = await WisetrackAPI.getProjects(resortId || undefined).catch(() => []);
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn() && Array.isArray(apiProjects) && apiProjects.length) {
      return apiProjects;
    }
    let localProjects = [];
    try {
      localProjects = typeof getProjects === 'function' ? getProjects() : [];
    } catch (_) {
      localProjects = [];
    }
    const seen = new Set();
    const all = [];
    [...(apiProjects || []), ...(localProjects || [])].forEach(p => {
      const id = String(p.id);
      if (!seen.has(id)) {
        seen.add(id);
        all.push(p);
      }
    });
    return all;
  }

  function pickDefaultProject(projects) {
    if (!projects?.length) return null;
    return projects.find(p => /MEP/i.test(p.code || '') || /MEP/i.test(p.name || ''))
      || projects.find(p => p.parentProjectId && String(p.status || '').toLowerCase() === 'active')
      || projects.find(p => String(p.status || '').toLowerCase() === 'active')
      || projects[0];
  }

  async function selectedProjectId() {
    const projects = await loadProjectsList();
    if (!projects.length) {
      localStorage.removeItem('WISETRACK_SELECTED_PROJECT');
      return null;
    }
    const stored = localStorage.getItem('WISETRACK_SELECTED_PROJECT');
    if (stored && projects.some(p => String(p.id) === String(stored))) {
      return String(stored);
    }
    const prefer = pickDefaultProject(projects);
    const pid = String(prefer.id);
    localStorage.setItem('WISETRACK_SELECTED_PROJECT', pid);
    return pid;
  }

  const PROJECT_CONTEXT_TABS = [
    ['Overview', 'project-detail.html'], ['Planning & WBS', 'planning.html'],
    ['Milestones', 'milestones.html'], ['Daily Reports', 'daily-report.html'],
    ['Issues', 'issues.html'], ['BOQ', 'boq.html'], ['Budget', 'budget.html'],
    ['Costs', 'costs.html'], ['Inventory & Closure', 'inventory.html']
  ];
  const PROJECT_CONTEXT_PAGES = new Set(PROJECT_CONTEXT_TABS.map(([, href]) => href));

  function renderProjectContextTabs(page, projectId) {
    const el = document.getElementById('apiPageRoot');
    if (!el || !projectId || !PROJECT_CONTEXT_PAGES.has(page)) return;
    el.querySelector('.project-context-tabs')?.remove();
    const nav = `<nav class="project-context-tabs" aria-label="Project sections">${PROJECT_CONTEXT_TABS.map(([label, href]) => {
      const active = page === href;
      return `<a class="project-context-tab${active ? ' active' : ''}"${active ? ' aria-current="page"' : ''} href="${href}?projectId=${encodeURIComponent(projectId)}">${label}</a>`;
    }).join('')}</nav>`;
    el.querySelector('.head')?.insertAdjacentHTML('afterend', nav);
  }

  /** Parent + descendant ids — used for BOQ / inventory roll-up only. Tasks use the selected project alone. */
  async function projectScopeIds(pid) {
    const projects = await loadProjectsList();
    const root = Number(pid);
    const ids = new Set([root]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of projects) {
        const id = Number(p.id);
        const parent = Number(p.parentProjectId || 0);
        if (parent && ids.has(parent) && !ids.has(id)) {
          ids.add(id);
          grew = true;
        }
      }
    }
    return [...ids];
  }

  function progressOf(row) {
    const v = row?.completionPercent ?? row?.percentComplete ?? row?.progressPercent ?? row?.progress;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function projectsAsTree(projects) {
    if (typeof wtProjectsAsTree === 'function') return wtProjectsAsTree(projects);
    return projects || [];
  }

  function filterRowsForProject(rows, pid) {
    const id = Number(pid);
    if (!Number.isFinite(id)) return [];
    return (rows || []).filter(r => Number(r.projectId || r.ProjectId || r._projectId) === id);
  }

  function wtRowBlocked(row) {
    return !!(row?.isBlocked || row?.IsBlocked);
  }
  function wtRowBlockReason(row) {
    return row?.blockedReason || row?.BlockedReason || '';
  }
  function wtDepLineHtml(row) {
    const label = row?.dependsOnLabel || row?.DependsOnLabel;
    if (!label && !wtRowBlocked(row)) return '';
    const blocked = wtRowBlocked(row);
    const text = blocked
      ? (wtRowBlockReason(row) || `Waiting on ${label}`)
      : `Depends on ${label}`;
    return `<small class="dep-line ${blocked ? 'blocked' : 'ready'}">${blocked ? '⏳ ' : '🔗 '}${esc(text)}</small>`;
  }
  function wtDepBtnHtml(kind, id, row) {
    if (typeof wtIsAdmin !== 'function' || !wtIsAdmin()) return '';
    const has = !!(row?.dependsOnTaskId || row?.DependsOnTaskId || row?.dependsOnSubTaskId || row?.DependsOnSubTaskId);
    const label = has ? 'Remove dependency' : 'Set dependency';
    return `<button class="btn sm icon-action" data-tooltip="${label}" aria-label="${label}" title="${label}" onclick="event.stopPropagation(); WTPages.openDependencyModal('${kind}', ${id})"><i class="fa-solid ${has ? 'fa-link-slash' : 'fa-link'}"></i></button>`;
  }
  function wtUpdateBtnHtml(taskId, subId, row) {
    if (wtRowBlocked(row)) {
      const reason = esc(wtRowBlockReason(row) || 'Waiting on dependency');
      return `<button class="btn sm icon-action" disabled data-tooltip="Waiting: ${reason}" aria-label="Waiting: ${reason}" title="${reason}"><i class="fa-solid fa-hourglass-half"></i></button>`;
    }
    const extra = subId ? `, ${subId}` : '';
    return `<button class="btn sm icon-action" data-tooltip="Update progress" aria-label="Update progress" title="Update progress" onclick="event.stopPropagation(); WTPages.openTaskUpdateModal(${taskId}${extra})"><i class="fa-solid fa-chart-line"></i></button>`;
  }

  async function projectPickerHtml(selectId = 'ctxProjectId') {
    const allProjects = projectsAsTree(await loadProjectsList());
    let cur = localStorage.getItem('WISETRACK_SELECTED_PROJECT') || '';
    if (!cur || !allProjects.some(p => String(p.id) === String(cur))) {
      const prefer = pickDefaultProject(allProjects);
      cur = prefer ? String(prefer.id) : '';
      if (cur) localStorage.setItem('WISETRACK_SELECTED_PROJECT', cur);
    }
    const opts = allProjects.map(p => {
      const depth = Number(p._depth) || (p.parentProjectId ? 1 : 0);
      const mark = depth > 0 ? '↳ ' : '';
      const lvl = p.parentProjectId ? (p.level || 'Sub') : 'Parent';
      return `<option value="${p.id}" ${String(p.id) === String(cur) ? 'selected' : ''}>${mark}${esc(p.name || p.title)} · ${esc(p.code || '#' + p.id)} (${esc(lvl)})</option>`;
    }).join('') || '<option value="">No projects</option>';
    return `<label style="display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:4px 10px;">
      <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;white-space:nowrap;">Project</span>
      <select id="${selectId}" class="resort-select" style="min-width:240px;max-width:360px;padding:6px;border:0;background:transparent;font-weight:700;" onchange="onGlobalProjectChange(this.value)">${opts}</select>
    </label>`;
  }

  // ---------- ROLES & PERMISSIONS ----------
  async function pageRoles() {
    location.href = 'users.html';
  }

  async function refreshRoles() {
    const body = $('#rolesBody');
    if (!body) return;
    try {
      const roles = await WisetrackAPI.getRoles();
      body.innerHTML = roles.length ? roles.map(r => `
        <tr>
          <td>${r.id}</td>
          <td><strong>${esc(r.name)}</strong></td>
          <td>${esc(r.description || '—')}</td>
          <td>${(r.permissions || []).map(p => `<span class="badge blue">${esc(p.code)}</span>`).join(' ') || '—'}</td>
          <td class="table-actions">
            <button class="btn sm" onclick="WTPages.openRoleModal(${r.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" onclick="WTPages.deleteRole(${r.id})"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join('') : emptyRow(5, 'No roles yet');
    } catch (e) { body.innerHTML = errRow(5, e); }
  }

  async function refreshPermissions() {
    const body = $('#permsBody');
    if (!body) return;
    try {
      const perms = await WisetrackAPI.getPermissions();
      body.innerHTML = perms.length ? perms.map(p => `
        <tr>
          <td>${p.id}</td>
          <td><code>${esc(p.code)}</code></td>
          <td>${esc(p.name)}</td>
          <td>${esc(p.module)}</td>
          <td class="table-actions">
            <button class="btn sm" onclick="WTPages.openPermissionModal(${p.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" onclick="WTPages.deletePermission(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join('') : emptyRow(5, 'No permissions');
    } catch (e) { body.innerHTML = errRow(5, e); }
  }

  async function prepareAssignTab() {
    try {
      const [users, roles] = await Promise.all([WisetrackAPI.getUsers(), WisetrackAPI.getRoles()]);
      $('#assignUserId').innerHTML = users.map(u => `<option value="${u.id}">${esc(u.fullName)} (${esc(u.email)})</option>`).join('');
      $('#assignRoleChecks').innerHTML = roles.map(r =>
        `<label class="check-list-item"><input type="checkbox" class="assign-role" value="${r.id}"> <span class="perm-name">${esc(r.name)}</span></label>`
      ).join('');
      const wrap = $('#assignRoleChecks');
      if (wrap && !wrap.classList.contains('check-list')) wrap.classList.add('check-list');
    } catch (e) { showToast(e.message, 'danger'); }
  }

  function showRoleTab(which, link) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    link.classList.add('active');
    $('#rolesTab').style.display = which === 'roles' ? '' : 'none';
    $('#permTab').style.display = which === 'perms' ? '' : 'none';
    $('#assignTab').style.display = which === 'assign' ? '' : 'none';
  }

  async function openRoleModal(id) {
    let role = { name: '', description: '', permissions: [] };
    let perms = [];
    try {
      perms = await WisetrackAPI.getPermissions();
      if (id) role = await WisetrackAPI.getRole(id);
    } catch (e) { showToast(e.message, 'danger'); return; }
    const selected = new Set((role.permissions || []).map(p => p.id));
    const checks = perms.map(p =>
      `<label class="check-list-item">
        <input type="checkbox" class="role-perm" value="${p.id}" ${selected.has(p.id) ? 'checked' : ''}>
        <span class="perm-code">${esc(p.code)}</span>
        <span class="perm-name">${esc(p.name)}</span>
      </label>`
    ).join('') || '<em>No permissions in catalog</em>';
    openModal(id ? 'Edit Role' : 'Create Role', `
      <form onsubmit="WTPages.saveRole(event, ${id || 'null'})">
        <div class="form-grid">
          <div class="field"><label>Name *</label><input id="roleName" type="text" value="${esc(role.name)}" required></div>
          <div class="field"><label>Description</label><input id="roleDesc" type="text" value="${esc(role.description || '')}"></div>
          <div class="field full"><label>Permissions</label><div class="check-list">${checks}</div></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Save Role</button>
        </div>
      </form>`);
  }

  async function saveRole(e, id) {
    e.preventDefault();
    const payload = {
      name: $('#roleName').value.trim(),
      description: $('#roleDesc').value.trim(),
      permissionIds: [...document.querySelectorAll('.role-perm:checked')].map(x => Number(x.value))
    };
    try {
      if (id) await WisetrackAPI.updateRole(id, payload);
      else await WisetrackAPI.createRole(payload);
      closeModal();
      showToast('Role saved');
      await refreshRoles();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deleteRole(id) {
    if (!confirm('Delete this role?')) return;
    try {
      await WisetrackAPI.deleteRole(id);
      showToast('Role deleted', 'danger');
      await refreshRoles();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function openPermissionModal(id) {
    let p = { code: '', name: '', module: '' };
    try { if (id) p = await WisetrackAPI.get('/roles/permissions/' + id); } catch (e) { showToast(e.message, 'danger'); return; }
    openModal(id ? 'Edit Permission' : 'Create Permission', `
      <form onsubmit="WTPages.savePermission(event, ${id || 'null'})">
        <div class="form-grid">
          <div class="field"><label>Code *</label><input id="permCode" value="${esc(p.code)}" required placeholder="projects.edit"></div>
          <div class="field"><label>Name *</label><input id="permName" value="${esc(p.name)}" required></div>
          <div class="field full"><label>Module *</label><input id="permModule" value="${esc(p.module)}" required placeholder="Projects"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>`);
  }

  async function savePermission(e, id) {
    e.preventDefault();
    const payload = { code: $('#permCode').value.trim(), name: $('#permName').value.trim(), module: $('#permModule').value.trim() };
    try {
      if (id) await WisetrackAPI.updatePermission(id, payload);
      else await WisetrackAPI.createPermission(payload);
      closeModal();
      showToast('Permission saved');
      await refreshPermissions();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deletePermission(id) {
    if (!confirm('Delete permission?')) return;
    try {
      await WisetrackAPI.deletePermission(id);
      showToast('Deleted', 'danger');
      await refreshPermissions();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function saveUserRoles() {
    const userId = Number($('#assignUserId').value);
    const roleIds = [...document.querySelectorAll('.assign-role:checked')].map(x => Number(x.value));
    try {
      await WisetrackAPI.assignUserRoles(userId, roleIds);
      showToast('Roles assigned to user');
    } catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- USERS ----------
  const PERM_TABS = [
    { id: 'Dashboard', label: 'Dashboard', global: true, rows: [{ key: 'Dashboard', name: 'Dashboard' }] },
    { id: 'Resorts', label: 'Resort', global: true, rows: [{ key: 'Resorts', name: 'Resort master' }] },
    { id: 'Projects', label: 'Project', global: false },
    { id: 'Tasks', label: 'Tasks', global: false },
    { id: 'BOQ', label: 'BOQ', global: false },
    { id: 'Budgets', label: 'Budget', global: false },
    { id: 'Costs', label: 'Costs', global: false },
    { id: 'Issues', label: 'Issues', global: false },
    { id: 'Reports', label: 'Reports', global: false },
    { id: 'Closure', label: 'Closure', global: false },
    { id: 'Audit', label: 'Audit', global: true, rows: [{ key: 'Audit', name: 'Audit logs' }] },
    { id: 'Module', label: 'Module', global: true, rows: [{ key: 'Module', name: 'Item master' }] }
  ];
  const GLOBAL_PERM_MODULES = PERM_TABS.filter(t => t.global).map(t => t.id);
  const PERM_RIGHTS = [
    { id: 'view', label: 'View' },
    { id: 'edit', label: 'Edit' },
    { id: 'update', label: 'Update' },
    { id: 'delete', label: 'Delete' }
  ];
  const PROJECT_FIELDS = [
    { key: 'clientName', label: 'Client name' }, { key: 'sponsor', label: 'Sponsor' },
    { key: 'currency', label: 'Currency' }, { key: 'ownerId', label: 'Project owner' },
    { key: 'description', label: 'Description' }, { key: 'profileNotes', label: 'Profile notes' },
    { key: 'startDate', label: 'Start date' }, { key: 'endDate', label: 'End date' }
  ];

  function permKey(projectId, module) {
    return `${Number(projectId) || 0}|${module}`;
  }

  function permFlag(row, right) {
    const map = {
      view: ['canView', 'CanView'],
      edit: ['canEdit', 'CanEdit'],
      update: ['canUpdate', 'CanUpdate'],
      delete: ['canDelete', 'CanDelete']
    };
    return (map[right] || []).some(k => row && row[k]);
  }

  function getPermState() {
    if (!window._wtPerm) {
      window._wtPerm = { tab: 'Projects', catalog: [], assigned: [], rights: {} };
    }
    return window._wtPerm;
  }

  function projectLabel(p) {
    return `${p.code || p.name}${p.code && p.name && p.code !== p.name ? ' — ' + p.name : ''}`;
  }

  async function pageUsers() {
    const el = root();
    if (typeof wtIsAdmin === 'function' && !wtIsAdmin()) {
      el.innerHTML = pageHead('Users & Access', 'Only Admin can manage users') +
        `<div class="card"><p>Aapke paas user management ka access nahi hai. Admin se rights maange.</p></div>`;
      return;
    }
    el.innerHTML = pageHead('Users & Access', 'Admin = full access. Other users = selected projects + View / Edit / Update / Delete.',
      `<button class="btn primary" onclick="WTPages.openUserModal()"><i class="fa-solid fa-plus"></i> New User</button>`)
      + tableWrap(['ID', 'Name', 'Email', 'Access', 'Internal', 'Status', 'Permissions'], 'usersBody');
    await refreshUsers();
  }

  async function refreshUsers() {
    const body = $('#usersBody');
    try {
      const users = await WisetrackAPI.getUsers();
      body.innerHTML = users.length ? users.map(u => {
        const admin = u.isAdmin || (u.roles || []).includes('Admin');
        return `
        <tr>
          <td>${u.id}</td>
          <td><strong>${esc(u.fullName)}</strong></td>
          <td>${esc(u.email)}</td>
          <td>${admin ? '<span class="badge blue">Admin</span>' : '<span class="badge gray">User</span>'}</td>
          <td>${u.isInternal ? 'Yes' : 'No'}</td>
          <td><span class="badge ${u.isActive ? 'green' : 'red'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
          <td><button class="btn sm" title="Permissions" onclick="WTPages.openUserModal(${u.id})"><i class="fa-solid fa-key"></i></button></td>
        </tr>`;
      }).join('') : emptyRow(7, 'No users');
    } catch (e) { body.innerHTML = errRow(7, e); }
  }

  function collectUserPermissions() {
    const st = getPermState();
    return Object.entries(st.rights).map(([key, r]) => {
      if (!r || !(r.view || r.edit || r.update || r.delete)) return null;
      const sep = key.indexOf('|');
      const pid = Number(key.slice(0, sep));
      const module = key.slice(sep + 1);
      const global = GLOBAL_PERM_MODULES.includes(module);
      return {
        projectId: global ? null : pid,
        module,
        canView: !!(r.view || r.edit || r.update || r.delete),
        canEdit: !!r.edit,
        canUpdate: !!r.update,
        canDelete: !!r.delete,
        fieldPermissions: r.fields || {}
      };
    }).filter(p => p && (GLOBAL_PERM_MODULES.includes(p.module) || p.projectId));
  }

  function renderPermChips() {
    const st = getPermState();
    const box = document.getElementById('permChips');
    if (!box) return;
    if (!st.assigned.length) {
      box.innerHTML = '<span style="color:var(--text-muted);font-size:12px">50 projects me se sirf jinhe access dena hai, unhe Add project se chune.</span>';
      return;
    }
    box.innerHTML = st.assigned.map(id => {
      const p = st.catalog.find(x => Number(x.id) === Number(id));
      const label = p ? projectLabel(p) : `Project #${id}`;
      return `<span class="perm-chip">${esc(label)} <button type="button" onclick="WTPages.removeUserPermProject(${id})" title="Remove">×</button></span>`;
    }).join('');
  }

  function renderPermTabs() {
    const st = getPermState();
    const box = document.getElementById('permTabs');
    if (!box) return;
    box.innerHTML = PERM_TABS.map(t =>
      `<button type="button" class="perm-tab${st.tab === t.id ? ' active' : ''}" onclick="WTPages.switchUserPermTab('${t.id}')">${esc(t.label)}</button>`
    ).join('');
  }

  function renderPermTable() {
    const st = getPermState();
    const box = document.getElementById('permTableWrap');
    if (!box) return;
    const tab = PERM_TABS.find(t => t.id === st.tab) || PERM_TABS[2];
    let rows = [];
    if (tab.global) {
      rows = tab.rows.map(r => ({ projectId: 0, module: r.key, name: r.name }));
    } else {
      rows = st.assigned.map(id => {
        const p = st.catalog.find(x => Number(x.id) === Number(id));
        return { projectId: Number(id), module: tab.id, name: p ? projectLabel(p) : `Project #${id}` };
      });
    }
    if (!rows.length) {
      box.innerHTML = `<div style="padding:24px;color:var(--text-muted);text-align:center">Is tab ke liye pehle upar se 1 ya 2 project add karein.</div>`;
      return;
    }
    box.innerHTML = `
      <table class="perm-table">
        <thead>
          <tr>
            <th>Category</th>
            ${PERM_RIGHTS.map(r => `<th class="center">${esc(r.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => {
            const key = permKey(row.projectId, row.module);
            const cur = st.rights[key] || { view: false, edit: false, update: false, delete: false, fields: {} };
            return `<tr>
              <td>${esc(row.name)}</td>
              ${PERM_RIGHTS.map(r => `<td class="center">
                <input type="checkbox" class="perm-switch" data-pid="${row.projectId}" data-module="${row.module}" data-right="${r.id}" ${cur[r.id] ? 'checked' : ''} onchange="WTPages.onUserPermToggle(this)">
              </td>`).join('')}
            </tr>${row.module === 'Projects' && row.projectId ? `<tr><td colspan="${PERM_RIGHTS.length + 1}"><strong>Project field rights</strong><div class="project-field-rights">${PROJECT_FIELDS.map(f => `<label>${esc(f.label)}<select data-pid="${row.projectId}" data-field="${f.key}" onchange="WTPages.onProjectFieldPermToggle(this)"><option value="inherit" ${!cur.fields?.[f.key] ? 'selected' : ''}>Inherit</option><option value="view" ${cur.fields?.[f.key] === 'view' ? 'selected' : ''}>View only</option><option value="edit" ${cur.fields?.[f.key] === 'edit' ? 'selected' : ''}>View + edit</option><option value="hidden" ${cur.fields?.[f.key] === 'hidden' ? 'selected' : ''}>No access</option></select></label>`).join('')}</div></td></tr>` : ''}`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function refreshPermPanel() {
    renderPermChips();
    renderPermTabs();
    renderPermTable();
    fillPermProjectSelect();
  }

  function fillPermProjectSelect() {
    const st = getPermState();
    const sel = document.getElementById('permProjectSelect');
    const q = (document.getElementById('permProjectSearch')?.value || '').trim().toLowerCase();
    if (!sel) return;
    const available = st.catalog.filter(p => !st.assigned.includes(Number(p.id)));
    const filtered = q ? available.filter(p => projectLabel(p).toLowerCase().includes(q)) : available;
    sel.innerHTML = `<option value="">${filtered.length ? 'Select project…' : 'No matching project'}</option>` +
      filtered.slice(0, 80).map(p => `<option value="${p.id}">${esc(projectLabel(p))}</option>`).join('');
  }

  function switchUserPermTab(id) {
    getPermState().tab = id;
    renderPermTabs();
    renderPermTable();
  }

  function addUserPermProject() {
    const st = getPermState();
    const sel = document.getElementById('permProjectSelect');
    const id = Number(sel?.value || 0);
    if (!id || st.assigned.includes(id)) return;
    st.assigned.push(id);
    const key = permKey(id, 'Projects');
    if (!st.rights[key]) st.rights[key] = { view: true, edit: false, update: false, delete: false };
    else st.rights[key].view = true;
    const search = document.getElementById('permProjectSearch');
    if (search) search.value = '';
    refreshPermPanel();
  }

  function removeUserPermProject(id) {
    const st = getPermState();
    st.assigned = st.assigned.filter(x => Number(x) !== Number(id));
    Object.keys(st.rights).forEach(key => {
      if (key.startsWith(`${Number(id)}|`)) delete st.rights[key];
    });
    refreshPermPanel();
  }

  function onUserPermToggle(el) {
    const st = getPermState();
    const pid = Number(el.dataset.pid || 0);
    const module = el.dataset.module;
    const right = el.dataset.right;
    const key = permKey(pid, module);
    if (!st.rights[key]) st.rights[key] = { view: false, edit: false, update: false, delete: false };
    st.rights[key][right] = !!el.checked;
    if (right !== 'view' && el.checked) st.rights[key].view = true;
    if (right === 'view' && !el.checked) {
      st.rights[key].edit = false;
      st.rights[key].update = false;
      st.rights[key].delete = false;
    }
    renderPermTable();
  }

  function onProjectFieldPermToggle(el) {
    const key = permKey(Number(el.dataset.pid), 'Projects');
    const state = getPermState();
    if (!state.rights[key]) state.rights[key] = { view: true, edit: false, update: false, delete: false, fields: {} };
    if (!state.rights[key].fields) state.rights[key].fields = {};
    if (el.value === 'inherit') delete state.rights[key].fields[el.dataset.field];
    else state.rights[key].fields[el.dataset.field] = el.value;
  }

  function toggleUserAdmin(on) {
    const box = document.getElementById('userPermMatrix');
    if (box) box.style.display = on ? 'none' : 'block';
  }

  async function openUserModal(id) {
    let u = { fullName: '', email: '', phone: '', isActive: true, isInternal: true, roles: [], isAdmin: false };
    try {
      if (id) u = await WisetrackAPI.getUser(id);
    } catch (e) { showToast(e.message, 'danger'); return; }
    const isAdmin = !!(u.isAdmin || (u.roles || []).includes('Admin'));
    let projects = [];
    let perms = [];
    try {
      projects = await WisetrackAPI.getProjects();
      if (id) perms = await WisetrackAPI.getUserProjectPermissions(id).catch(() => []);
    } catch (_) { /* optional */ }

    const rights = {};
    const assigned = [];
    (perms || []).forEach(p => {
      const module = p.module || p.Module;
      const pid = Number(p.projectId ?? p.ProjectId ?? 0);
      const key = permKey(GLOBAL_PERM_MODULES.includes(module) ? 0 : pid, module);
      rights[key] = {
        view: permFlag(p, 'view'),
        edit: permFlag(p, 'edit'),
        update: permFlag(p, 'update'),
        delete: permFlag(p, 'delete'),
        fields: p.fieldPermissions || p.FieldPermissions || {}
      };
      if (pid && !GLOBAL_PERM_MODULES.includes(module) && !assigned.includes(pid)) assigned.push(pid);
    });
    window._wtPerm = { tab: 'Projects', catalog: projects || [], assigned, rights };

    openModal('User Permissions Manager', `
      <p class="perm-manager-intro">Easily review and modify each user’s detailed access permissions across key system modules. Ensure every team member has the appropriate rights.</p>
      <form onsubmit="WTPages.saveUser(event, ${id || 'null'})">
        <div class="form-grid">
          <div class="field"><label>Full Name *</label><input id="uName" type="text" value="${esc(u.fullName)}" required></div>
          <div class="field perm-account"><label>User account</label><input id="uEmail" type="email" value="${esc(u.email)}" ${id ? 'readonly' : 'required'}></div>
          ${id ? '' : `<div class="field"><label>Password *</label><input id="uPass" type="password" value="Welcome@123" required></div>`}
          <div class="field"><label>Phone</label><input id="uPhone" type="text" value="${esc(u.phone || '')}"></div>
          <div class="field"><label>Internal</label><select id="uInternal"><option value="true" ${u.isInternal ? 'selected' : ''}>Yes</option><option value="false" ${!u.isInternal ? 'selected' : ''}>No</option></select></div>
          ${id ? `<div class="field"><label>Active</label><select id="uActive"><option value="true" ${u.isActive ? 'selected' : ''}>Active</option><option value="false" ${!u.isActive ? 'selected' : ''}>Inactive</option></select></div>` : ''}
          <div class="field full">
            <label class="check-list-item" style="display:flex;gap:8px;align-items:center">
              <input type="checkbox" id="uAdmin" ${isAdmin ? 'checked' : ''} onchange="WTPages.toggleUserAdmin(this.checked)">
              <span><strong>Admin</strong> — full access, no project picker needed</span>
            </label>
          </div>
        </div>
        <div id="userPermMatrix" style="${isAdmin ? 'display:none' : ''}">
          <div class="perm-project-bar">
            <input id="permProjectSearch" type="search" placeholder="Search among all projects…" oninput="WTPages.fillPermProjectSelect()">
            <select id="permProjectSelect"></select>
            <button type="button" class="btn primary" onclick="WTPages.addUserPermProject()"><i class="fa-solid fa-plus"></i> Add project</button>
          </div>
          <div id="permChips" class="perm-chips"></div>
          <div id="permTabs" class="perm-tabs"></div>
          <div id="permTableWrap" class="perm-table-wrap"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Apply</button></div>
      </form>`, '', 'perm-manager');
    refreshPermPanel();
  }

  async function saveUser(e, id) {
    e.preventDefault();
    const isAdmin = !!(document.getElementById('uAdmin')?.checked);
    const permissions = isAdmin ? [] : collectUserPermissions();
    try {
      let userId = id;
      if (id) {
        await WisetrackAPI.updateUser(id, {
          fullName: $('#uName').value.trim(),
          phone: $('#uPhone').value.trim(),
          isActive: $('#uActive').value === 'true',
          isInternal: $('#uInternal').value === 'true',
          isAdmin
        });
      } else {
        const created = await WisetrackAPI.createUser({
          fullName: $('#uName').value.trim(),
          email: $('#uEmail').value.trim(),
          password: $('#uPass').value,
          phone: $('#uPhone').value.trim(),
          isInternal: $('#uInternal').value === 'true',
          isAdmin,
          permissions
        });
        userId = created.id || created.Id;
      }
      if (userId) {
        await WisetrackAPI.replaceUserAccess(userId, { isAdmin, permissions });
      }
      closeModal(); showToast(isAdmin ? 'Admin saved — full access' : 'User access saved'); await pageUsers();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- DASHBOARD ----------
  // ---------- DASHBOARD ----------
  async function pageDashboard() {
    const el = root();
    el.innerHTML = pageHead('Resort Portfolio & All-Projects Progress Control', 'Live cross-resort progress tracking, package status counts, 80% CapEx threshold alerts, and real-time field telemetry',
      `<button class="btn" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + New Resort</button>
       <button class="btn primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Create N-Level Project</button>`)
      + `
        <!-- Global Project Counts & Financial Metrics -->
        <div class="kpis">
          <div class="kpi">
            <span class="kpi-label">Total Work Packages</span>
            <span class="kpi-value" id="dProjects"><i class="fa-solid fa-spinner fa-spin"></i></span>
            <span class="kpi-sub" id="dProjectsSub">Across All Resorts</span>
          </div>
          <div class="kpi success">
            <span class="kpi-label">On Track & Healthy</span>
            <span class="kpi-value" id="dOnTrack"><i class="fa-solid fa-spinner fa-spin"></i></span>
            <span class="kpi-sub" id="dOnTrackSub">Active Portfolio Health</span>
          </div>
          <div class="kpi warning">
            <span class="kpi-label">80% Budget & Risk Alerts</span>
            <span class="kpi-value" id="dIssues"><i class="fa-solid fa-spinner fa-spin"></i></span>
            <span class="kpi-sub" id="dIssuesSub">Action Required</span>
          </div>
          <div class="kpi success">
            <span class="kpi-label">Total Master CapEx</span>
            <span class="kpi-value" id="dBudget"><i class="fa-solid fa-spinner fa-spin"></i></span>
            <span class="kpi-sub" id="dBudgetSub">Committed Allocation</span>
          </div>
        </div>

        <section class="card" id="exceptionAssistant" style="margin:18px 0;border:1px solid #fca5a5;background:linear-gradient(135deg,#fff7ed,#fff);">
          <div class="card-header">
            <div>
              <h3 class="card-title"><i class="fa-solid fa-triangle-exclamation" style="color:#dc2626;"></i> Exception Assistant</h3>
              <div class="card-subtitle">Overdue, at-risk, critical aur 7 din se update na hue tasks par admin focus</div>
            </div>
            <span class="badge red" id="exceptionCount">Loading</span>
          </div>
          <div id="exceptionList" style="display:grid;gap:8px;padding:0 16px 16px;">
            <div style="padding:12px;color:var(--text-muted);">Loading exceptions…</div>
          </div>
        </section>

        <!-- Visual Analytics: Project Status Donut & Resort Velocity Bar Charts -->
        <div class="charts-grid">
          <!-- Chart 1: Projects by Status Donut -->
          <div class="chart-card">
            <div class="chart-header">
              <div>
                <div class="chart-title">🥧 All Projects Status Distribution & Counts</div>
                <small style="color:var(--text-muted);" id="donutSub">Live status breakdown across engineering packages</small>
              </div>
              <span class="badge blue" id="donutBadge">Live Matrix</span>
            </div>

            <div class="chart-canvas-wrap" id="donutContainer">
              <svg viewBox="0 0 36 36" style="width:160px; height:160px; transform:rotate(-90deg);" id="donutSvg">
                <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--border-light)" stroke-width="3.5"></circle>
              </svg>
              <div style="position:absolute; text-align:center;">
                <div style="font-size:22px; font-weight:800; color:var(--text-main);" id="donutTotalCount">—</div>
                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Packages</div>
              </div>
            </div>

            <div class="donut-legend" id="donutLegend">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Chart 2: Resort-wise Progress & CapEx Rollup -->
          <div class="chart-card">
            <div class="chart-header">
              <div>
                <div class="chart-title">📊 Resort-wise Physical Progress & CapEx Velocity</div>
                <small style="color:var(--text-muted);">Weighted engineering completion % per Resort property</small>
              </div>
              <span class="badge green" id="resortCountBadge">Properties</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;" id="resortVelocityList">
              <div style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading live resort telemetry...</div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--border-light); border:1px solid var(--border-color); border-radius:6px; padding:10px 14px; margin-top:14px; font-size:12px;">
              <div><b>Average Portfolio Progress:</b> <span style="color:var(--primary); font-weight:700;" id="avgProgressText">61.2% Overall Execution</span></div>
              <div><a href="reports.html" class="btn sm primary">Generate PDF Pack ➔</a></div>
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
              <a href="projects.html" class="btn sm"><i class="fa-solid fa-folder-tree"></i> WBS Hierarchy</a>
              <button class="btn sm" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-sliders"></i> Export Custom Report</button>
              <button class="btn sm primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> Add Work Package</button>
            </div>
          </div>
          ${tableWrap(['Resort & Code', 'Project / Package Title', 'Discipline', 'Project Manager', 'Approved Budget', 'Committed Spend', 'Physical Progress', '80% RAG Status', 'Active Roadblock', 'Target Opening', 'Action'], 'dashRecent')}
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

            <div style="display:flex; flex-direction:column; gap:12px;" id="liveActivityStream">
              <!-- Dynamically populated from live audit logs & task events -->
            </div>
          </div>

          <!-- Active 80% Cost Alerts & PMO Actions -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">⚠️ Cost Center 80% RAG Alerts & Quick Actions</h3>
                <div class="card-subtitle">Automated triggers and shortcuts requiring PMO signoff</div>
              </div>
              <a href="notifications.html" class="btn sm">All Alerts ➔</a>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
              <div id="costAlertContainer">
                <div style="padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <strong style="color:#991b1b; font-size:13px;">🚨 Electrical Cost Center at 84% Utilization</strong>
                    <span class="badge red">80% Trigger</span>
                  </div>
                  <p style="font-size:12px; margin:4px 0 8px; color:var(--text-main);">Grand Oasis Goa: ₹1.68 Cr of ₹2.00 Cr utilized. Discretionary orders locked.</p>
                  <a href="budget.html" class="btn sm" style="background:#fff; border-color:#fca5a5; color:#991b1b;">Review Budget ➔</a>
                </div>
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
      `;

    try {
      // 1. Fetch live data from backend APIs
      const [d, projectsRaw, resortsRaw, issuesRaw, auditRaw] = await Promise.all([
        WisetrackAPI.getDashboard().catch(() => ({})),
        WisetrackAPI.getProjects().catch(() => []),
        WisetrackAPI.getResorts().catch(() => []),
        WisetrackAPI.getIssues().catch(() => []),
        WisetrackAPI.getAuditLogs().catch(() => [])
      ]);

      const projects = (projectsRaw && projectsRaw.length) ? projectsRaw : [
        { id: 1, resortName: 'Grand Oasis Resort & Spa', code: 'GR-CIV-001', name: 'Main Resort Building Phase-1 (Civil)', disc: 'Civil Structure', ownerName: 'Amit Verma', budget: '₹16.50 Cr', spent: '₹13.20 Cr', progressPercent: 80, status: 'On Track', issue: '0 Issues', target: '15 Oct 2026' },
        { id: 2, resortName: 'Grand Oasis Resort & Spa', code: 'GR-MEP-001-ELE', name: 'Electrical Distribution & 11kV Substation', disc: 'MEP Electrical', ownerName: 'Rahul Sharma', budget: '₹5.10 Cr', spent: '₹4.30 Cr', progressPercent: 72, status: '84% Cost Alert', issue: '#ISS-1023 Cable Tray', target: '24 Aug 2026' },
        { id: 3, resortName: 'Grand Oasis Resort & Spa', code: 'GR-MEP-001-HVAC', name: 'HVAC Central Chiller Plant & VRV', disc: 'HVAC Chillers', ownerName: 'Manoj Joshi', budget: '₹4.80 Cr', spent: '₹3.65 Cr', progressPercent: 55, status: 'At Risk', issue: '#ISS-1024 Port Customs', target: '15 Oct 2026' },
        { id: 4, resortName: 'Royal Heritage Palace & Villas', code: 'JAI-CIV-002', name: 'Palace Wing Restoration & Automation', disc: 'Heritage MEP', ownerName: 'Priya Mehta', budget: '₹18.40 Cr', spent: '₹11.20 Cr', progressPercent: 58, status: 'On Track', issue: '0 Roadblocks', target: '30 Nov 2026' },
        { id: 5, resortName: 'Pine Valley Mountain Resort', code: 'MAN-SPA-001', name: 'Geothermal Heated Pool Complex', disc: 'Civil & MEP', ownerName: 'Vikram Rao', budget: '₹9.20 Cr', spent: '₹4.15 Cr', progressPercent: 45, status: 'On Track', issue: '0 Issues', target: '15 Dec 2026' },
        { id: 6, resortName: 'Azure Sands Beach Retreat', code: 'KOV-SLR-001', name: 'Solar Microgrid & Energy Storage 250kW', disc: 'Renewable Solar', ownerName: 'Ananya Nair', budget: '₹6.50 Cr', spent: '₹2.30 Cr', progressPercent: 35, status: 'On Track', issue: '0 Issues', target: '28 Feb 2027' }
      ];

      const resorts = (resortsRaw && resortsRaw.length) ? resortsRaw : [
        { id: 'RES-GOA-01', name: 'Grand Oasis Resort & Spa, Goa', code: 'RES-GOA-01', budget: '₹48.50 Cr', spent: '₹38.80 Cr', progress: 80, status: 'On Track' },
        { id: 'RES-JAI-02', name: 'Royal Heritage Palace, Jaipur', code: 'RES-JAI-02', budget: '₹38.00 Cr', spent: '₹22.04 Cr', progress: 58, status: 'On Track' },
        { id: 'RES-MAN-03', name: 'Pine Valley Mountain Resort, Manali', code: 'RES-MAN-03', budget: '₹32.00 Cr', spent: '₹14.40 Cr', progress: 45, status: 'On Track' },
        { id: 'RES-KOV-04', name: 'Azure Sands Beach Retreat, Kovalam', code: 'RES-KOV-04', budget: '₹30.00 Cr', spent: '₹10.50 Cr', progress: 35, status: 'Delayed' }
      ];

      // 2. Compute dynamic metrics
      const statusOf = (p) => String(p.status || p.Status || '').toLowerCase();
      const pctOf = (p) => {
        const n = Number(p.progressPercent ?? p.progress ?? p.ProgressPercent);
        return Number.isFinite(n) ? n : 0;
      };
      const totalPackagesCount = projects.length;
      const completedCount = projects.filter(p => {
        const st = statusOf(p);
        return pctOf(p) >= 100 || st.includes('complete') || st.includes('closed');
      }).length;
      const delayedCount = projects.filter(p => {
        const st = statusOf(p);
        return st.includes('delay') || st.includes('risk') || st.includes('hold');
      }).length;
      const alertCount = projects.filter(p => statusOf(p).includes('alert')).length
        || ((issuesRaw && issuesRaw.length) ? issuesRaw.length : 0);
      const onTrackCount = projects.filter(p => {
        const st = statusOf(p);
        const done = pctOf(p) >= 100 || st.includes('complete') || st.includes('closed');
        const bad = st.includes('delay') || st.includes('risk') || st.includes('alert') || st.includes('hold');
        return !done && !bad;
      }).length;

      const totalBudgetNum = d.totalApprovedBudget || 1485000000;
      const totalSpentNum = d.totalCommitted || (totalBudgetNum * 0.719);

      const exceptionRows = Array.isArray(d.exceptions) ? d.exceptions : [];
      const exceptionList = $('#exceptionList');
      const exceptionCount = $('#exceptionCount');
      if (exceptionCount) exceptionCount.textContent = `${exceptionRows.length} action${exceptionRows.length === 1 ? '' : 's'}`;
      if (exceptionList) {
        const labels = { Overdue: 'Overdue', AtRisk: 'At risk', Inactive: 'No progress · 7 days', Critical: 'Critical' };
        const colors = { Overdue: 'red', AtRisk: 'amber', Inactive: 'gray', Critical: 'red' };
        exceptionList.innerHTML = exceptionRows.length ? exceptionRows.map(item => {
          const isIssue = item.itemKind === 'Issue' || item.ItemKind === 'Issue';
          const projectId = Number(item.projectId ?? item.ProjectId);
          const type = item.type || item.Type || 'Exception';
          const title = item.title || item.Title || 'Untitled item';
          const projectName = item.projectName || item.ProjectName || 'Project';
          const itemKind = item.itemKind || item.ItemKind || 'Task';
          const message = item.message || item.Message || '';
          const target = isIssue ? 'issues.html' : 'planning.html';
          return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;background:#fff;">
            <div style="min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span class="badge ${colors[type] || 'amber'}">${esc(labels[type] || type)}</span><strong>${esc(title)}</strong><small>${esc(itemKind)}</small></div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${esc(projectName)} · ${esc(message)}</div>
            </div>
            <a class="btn sm" href="${target}" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${Number.isFinite(projectId) ? projectId : 0}')">Open</a>
          </div>`;
        }).join('') : '<div style="padding:12px;border:1px solid #bbf7d0;border-radius:8px;color:#166534;background:#f0fdf4;">Koi active task exception nahi hai.</div>';
      }

      // Update KPI Cards
      $('#dProjects').textContent = totalPackagesCount + ' Projects';
      $('#dProjectsSub').textContent = `Across ${resorts.length} Master Resorts`;
      $('#dOnTrack').textContent = onTrackCount + ' Active';
      const healthPct = totalPackagesCount ? Math.round((onTrackCount / totalPackagesCount) * 100) : 75;
      $('#dOnTrackSub').textContent = `${healthPct}% Portfolio Health`;
      $('#dIssues').textContent = alertCount + ' Alerts';
      $('#dIssuesSub').textContent = `${delayedCount} Delayed · ${alertCount} Cost Center`;
      $('#dBudget').textContent = '₹' + (totalBudgetNum / 10000000).toFixed(2) + ' Cr';
      $('#dBudgetSub').textContent = `₹${(totalSpentNum / 10000000).toFixed(2)} Cr Committed (${((totalSpentNum/totalBudgetNum)*100).toFixed(1)}%)`;

      // 3. Dynamic Donut Chart Calculation
      const cPct = totalPackagesCount ? Math.round((completedCount / totalPackagesCount) * 100) : 21;
      const oPct = totalPackagesCount ? Math.round((onTrackCount / totalPackagesCount) * 100) : 54;
      const dPct = totalPackagesCount ? Math.round((delayedCount / totalPackagesCount) * 100) : 13;
      const aPct = Math.max(0, 100 - cPct - oPct - dPct);

      const offset1 = 0;
      const offset2 = -cPct;
      const offset3 = -(cPct + oPct);
      const offset4 = -(cPct + oPct + dPct);

      $('#donutTotalCount').textContent = totalPackagesCount;
      $('#donutBadge').textContent = `${totalPackagesCount} Total Packages`;
      $('#donutSvg').innerHTML = `
        <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--border-light)" stroke-width="3.5"></circle>
        <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#059669" stroke-width="3.5"
                stroke-dasharray="${cPct} ${100 - cPct}" stroke-dashoffset="${offset1}"></circle>
        <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#2563eb" stroke-width="3.5"
                stroke-dasharray="${oPct} ${100 - oPct}" stroke-dashoffset="${offset2}"></circle>
        <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#d97706" stroke-width="3.5"
                stroke-dasharray="${dPct} ${100 - dPct}" stroke-dashoffset="${offset3}"></circle>
        <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#dc2626" stroke-width="3.5"
                stroke-dasharray="${aPct} ${100 - aPct}" stroke-dashoffset="${offset4}"></circle>
      `;

      $('#donutLegend').innerHTML = `
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#059669;"></span> <span>🟢 Completed (${completedCount} Pkgs · ${cPct}%)</span></div>
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#2563eb;"></span> <span>🔵 On Track (${onTrackCount} Pkgs · ${oPct}%)</span></div>
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#d97706;"></span> <span>🟠 Delayed (${delayedCount} Pkgs · ${dPct}%)</span></div>
        <div class="donut-legend-item"><span class="donut-legend-color" style="background:#dc2626;"></span> <span>🔴 80% Cost Alert (${alertCount} Pkgs · ${aPct}%)</span></div>
      `;

      // 4. Dynamic Resort Velocity Bars
      $('#resortCountBadge').textContent = `${resorts.length} Active Properties`;
      let totalProgSum = 0;
      $('#resortVelocityList').innerHTML = resorts.map(r => {
        const prog = r.progress || (r.progressPercent || 50);
        totalProgSum += prog;
        const colorClass = prog >= 75 ? 'green' : prog >= 50 ? 'blue' : 'amber';
        return `
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <strong>${esc(r.name || r.title)}</strong>
              <span><b>${prog}%</b> (CapEx: ${r.budget || '₹30 Cr'} · <span style="color:var(--primary);">${r.spent || '₹18 Cr'} Spent</span>)</span>
            </div>
            <div class="progress ${colorClass}" style="height:10px;"><i style="width:${prog}%"></i></div>
          </div>
        `;
      }).join('');

      const avgProg = resorts.length ? (totalProgSum / resorts.length).toFixed(1) : '61.2';
      $('#avgProgressText').textContent = `${avgProg}% Overall Execution`;

      // 5. Dynamic All-Projects Master Table
      $('#dashRecent').innerHTML = projects.map(p => {
        const prog = p.progressPercent || p.progress || 50;
        const progColor = prog >= 80 ? 'green' : prog >= 50 ? 'blue' : 'amber';
        const rag = (p.status && p.status.includes('Alert')) ? '84% Cost Alert' : prog >= 70 ? 'Healthy (<70%)' : 'Watch List';
        const ragBadge = (p.status && p.status.includes('Alert')) ? 'red' : prog >= 70 ? 'green' : 'amber';
        const issueTxt = p.issue || (p.issuesCount ? `${p.issuesCount} Open Issues` : '0 Roadblocks');
        const issueBadge = issueTxt.includes('0') ? 'green' : 'amber';

        return `
          <tr>
            <td>
              <strong>${esc(p.resortName || p.resort || 'Master Resort')}</strong>
              <small>${esc(p.resortCode || p.code || 'RES-01')}</small>
            </td>
            <td>
              <strong>${esc(p.name || p.title)}</strong>
              <small>${esc(p.code || 'PRJ-PKG')} · Level 1 Root</small>
            </td>
            <td><span class="badge blue">${esc(p.disc || p.discipline || 'Engineering')}</span></td>
            <td><b>${esc(p.ownerName || p.pm || 'Project Lead')}</b></td>
            <td>${p.projectBudgetDisplay || projectBudgetLabel(p)}</td>
            <td>${p.spent || '₹6.50 Cr'}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="progress ${progColor}" style="width:55px;margin:0;"><i style="width:${prog}%"></i></div>
                <b>${prog}%</b>
              </div>
            </td>
            <td><span class="badge ${ragBadge}">${esc(rag)}</span></td>
            <td><span class="badge ${issueBadge}">${esc(issueTxt)}</span></td>
            <td><small>${esc(p.target || p.targetDate || '31 Dec 2026')}</small></td>
            <td>
              <button class="btn sm" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${p.id}');location.href='planning.html'">Open ➔</button>
            </td>
          </tr>
        `;
      }).join('');

      // 6. Dynamic Live Site Activity Stream
      const liveEvents = (auditRaw && auditRaw.length) ? auditRaw.slice(0, 4) : [
        { icon: '⚡', title: 'Grand Oasis Goa · Block A Main Riser', time: '10 mins ago', desc: 'Rahul Sharma logged +8% daily progress (72% total). Completed 350m Polycab cabling with 14 workers.' },
        { icon: '❄️', title: 'Grand Oasis Goa · HVAC Chiller Valves', time: '45 mins ago', desc: 'Port customs clearance delay logged (#ISS-1024). Automated escalation dispatch sent to PMO.', isAlert: true },
        { icon: '🏛️', title: 'Royal Heritage Jaipur · Palace Wing', time: '2 hrs ago', desc: 'Priya Mehta certified 58% progress on Courtyard Lighting & Automation fitout.' },
        { icon: '🏊', title: 'Himalayan Sanctuary Manali · Pool Complex', time: '4 hrs ago', desc: 'Plunge pool waterproofing completed 100% and certified by QA auditor.' }
      ];

      $('#liveActivityStream').innerHTML = liveEvents.map(ev => {
        const actor = ev.userName || ev.UserName || ev.user || (ev.userId ? ('User #' + ev.userId) : 'System');
        const action = ev.action || ev.Action || 'Update';
        const entity = ev.entityName || ev.EntityName || ev.entityType || 'record';
        const title = ev.title || `${action} · ${entity}`;
        const desc = ev.desc || `${actor} performed ${action} on ${ev.details || ev.Details || entity}`;
        return `
        <div style="display:flex; align-items:flex-start; gap:12px; padding:10px; background:${ev.isAlert ? '#fef2f2' : 'var(--border-light)'}; border-radius:8px; border:1px solid ${ev.isAlert ? '#fecaca' : 'var(--border-color)'};">
          <span style="font-size:20px;">${ev.icon || '📝'}</span>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <strong style="font-size:13px; color:${ev.isAlert ? '#991b1b' : 'var(--text-main)'};">${esc(title)}</strong>
              <small style="color:var(--text-muted);">${esc(ev.time || (ev.createdAt || ev.CreatedAt ? new Date(ev.createdAt || ev.CreatedAt).toLocaleTimeString() : 'Recent'))}</small>
            </div>
            <p style="font-size:12px; margin:3px 0 0; color:${ev.isAlert ? '#7f1d1d' : 'var(--text-main)'};">${esc(desc)}</p>
          </div>
        </div>`;
      }).join('');

      if (kind === 'daily') await loadDailyTaskReport(pid);
      if (typeof initAllTables === 'function') setTimeout(() => initAllTables(), 150);
    } catch (e) {
      $('#dashRecent').innerHTML = errRow(11, e);
    }
  }

  // ---------- RESORTS + PROPERTIES + TYPES ----------
  async function pageResorts() {
    const el = root();
    el.innerHTML = pageHead('Resorts, Properties & Project Types', 'Comprehensive master hierarchy: Master Resorts ➔ Sub-Properties ➔ Engineering Disciplines',
      `<button class="btn" onclick="WTPages.openPropertyModal()"><i class="fa-solid fa-building"></i> + Add Property</button>
       <button class="btn" onclick="WTPages.openTypeModal()"><i class="fa-solid fa-tags"></i> + Add Project Type</button>
       <button class="btn primary" onclick="openCreateResortModal()"><i class="fa-solid fa-plus"></i> + Add Resort</button>`)
      + `
        <!-- Section 1: Master Resorts Directory -->
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header">
            <div>
              <h3 class="card-title">🏨 1. Master Resorts Directory (CapEx & Destinations)</h3>
              <div class="card-subtitle">Global resort destinations, locations, regional GM assignment, and CapEx budgets</div>
            </div>
            <button class="btn sm primary" onclick="openCreateResortModal()"><i class="fa-solid fa-plus"></i> Add New Resort</button>
          </div>
          ${tableWrap(['ID', 'Resort Name', 'Resort Code', 'Location', 'Operational Status', 'Super Admin Actions'], 'resortsBody')}
        </div>

        <div class="grid g2 resort-management-grid">
          <!-- Section 2: Properties under Resorts -->
          <div class="card" style="margin-bottom:0;">
            <div class="card-header">
              <div>
                <h3 class="card-title">🏢 2. Resort Properties Master</h3>
                <div class="card-subtitle">Physical properties, blocks, wings & villa clusters mapped to parent resort</div>
              </div>
              <button class="btn sm primary" onclick="WTPages.openPropertyModal()"><i class="fa-solid fa-plus"></i> Add Property</button>
            </div>
            ${tableWrap(['ID', 'Parent Resort ID', 'Property Name', 'Property Code', 'Actions'], 'propsBody')}
          </div>

          <!-- Section 3: Project Types / Disciplines -->
          <div class="card" style="margin-bottom:0;">
            <div class="card-header">
              <div>
                <h3 class="card-title">🏷️ 3. Project Types & Disciplines</h3>
                <div class="card-subtitle">Standardized engineering classifications (Civil, MEP, HVAC, Fitout)</div>
              </div>
              <button class="btn sm primary" onclick="WTPages.openTypeModal()"><i class="fa-solid fa-plus"></i> Add Type</button>
            </div>
            ${tableWrap(['ID', 'Type / Discipline Name', 'Classification Description', 'Actions'], 'typesBody')}
          </div>
        </div>
      `;
    await Promise.all([refreshResortsTable(), refreshProperties(), refreshTypes()]);
    if (typeof initAllTables === 'function') setTimeout(() => initAllTables(), 150);
  }

  async function refreshResortsTable() {
    const body = $('#resortsBody');
    try {
      const list = await WisetrackAPI.getResorts();
      body.innerHTML = list.length ? list.map(r => `
        <tr>
          <td>${r.id}</td><td><strong>${esc(r.name)}</strong></td><td>${esc(r.code || '—')}</td>
          <td>${esc(r.location || '—')}</td>
          <td><span class="badge ${r.isActive ? 'green' : 'red'}">${r.isActive ? 'Yes' : 'No'}</span></td>
          <td class="table-actions">
            <button class="btn sm" onclick="openEditResortModal('${r.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" onclick="confirmDeleteResort('${r.id}')"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join('') : emptyRow(6, 'No resorts');
    } catch (e) { body.innerHTML = errRow(6, e); }
  }

  async function refreshProperties() {
    const body = $('#propsBody');
    if (!body) return;
    try {
      const list = await WisetrackAPI.getProperties();
      body.innerHTML = list.length ? list.map(p => `
        <tr>
          <td>${p.id}</td><td>${p.resortId}</td><td>${esc(p.name)}</td><td>${esc(p.code || '—')}</td>
          <td><button class="btn sm danger" onclick="WTPages.deleteProperty(${p.id})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`).join('') : emptyRow(5, 'No properties');
    } catch (e) { body.innerHTML = errRow(5, e); }
  }

  async function refreshTypes() {
    const body = $('#typesBody');
    if (!body) return;
    try {
      const list = await WisetrackAPI.getProjectTypes();
      body.innerHTML = list.length ? list.map(t => `
        <tr>
          <td>${t.id}</td><td><strong>${esc(t.name)}</strong></td><td>${esc(t.description || '—')}</td>
          <td>
            <div class="table-actions">
              <button class="btn sm" onclick="WTPages.openEditTypeModal(${t.id}, '${esc(t.name).replace(/'/g, "\\'")}', '${esc(t.description || '').replace(/'/g, "\\'")}')" title="Modify"><i class="fa-solid fa-pen"></i> Edit</button>
              <button class="btn sm danger" onclick="WTPages.deleteType(${t.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>`).join('') : emptyRow(4, 'No types');
    } catch (e) { body.innerHTML = errRow(4, e); }
  }

  async function openPropertyModal() {
    const resorts = await WisetrackAPI.getResorts();
    openModal('Create Property', `
      <form onsubmit="WTPages.saveProperty(event)">
        <div class="form-grid">
          <div class="field"><label>Resort *</label><select id="propResort" required>${resorts.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Name *</label><input id="propName" required></div>
          <p class="card-subtitle" style="grid-column:1/-1;margin:0">Code auto-assigns (PRP-001).</p>
          <div class="field"><label>Location</label><input id="propLoc"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveProperty(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createProperty({
        resortId: Number($('#propResort').value),
        name: $('#propName').value.trim(),
        location: $('#propLoc').value.trim()
      });
      closeModal(); showToast('Property created'); await refreshProperties();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deleteProperty(id) {
    if (!confirm('Delete property?')) return;
    try { await WisetrackAPI.deleteProperty(id); showToast('Deleted'); await refreshProperties(); }
    catch (e) { showToast(e.message, 'danger'); }
  }

  function openTypeModal() {
    openModal('Create Project Type / Discipline', `
      <form onsubmit="WTPages.saveType(event)">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="typeName" required placeholder="e.g. MEP, Civil, Renovation..."></div>
          <div class="field full"><label>Description</label><input id="typeDesc" placeholder="Scope description..."></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  function openEditTypeModal(id, name, desc) {
    openModal('Modify Project Type / Discipline', `
      <form onsubmit="WTPages.updateType(event, ${id})">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="editTypeName" value="${esc(name)}" required></div>
          <div class="field full"><label>Description</label><input id="editTypeDesc" value="${esc(desc)}"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn primary" type="submit">Update Discipline</button>
        </div>
      </form>`);
  }

  async function updateType(e, id) {
    e.preventDefault();
    try {
      await WisetrackAPI.updateProjectType(id, {
        name: $('#editTypeName').value.trim(),
        description: $('#editTypeDesc').value.trim()
      });
      closeModal();
      showToast('Project type modified successfully');
      await refreshTypes();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function saveType(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createProjectType({ name: $('#typeName').value.trim(), description: $('#typeDesc').value.trim() });
      closeModal(); showToast('Type created'); await refreshTypes();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deleteType(id) {
    if (!confirm('Delete type?')) return;
    try { await WisetrackAPI.deleteProjectType(id); showToast('Deleted'); await refreshTypes(); }
    catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- PROJECTS (N-LEVEL WBS HIERARCHY) ----------
  async function pageProjects() {
    const el = root();
    const resorts = await WisetrackAPI.getResorts().catch(() => []);
    const selectedResortId = localStorage.getItem('WISETRACK_SELECTED_RESORT') || (resorts[0] ? String(resorts[0].id) : '1');

    el.innerHTML = pageHead('N-Level Project Hierarchy & Packages', 'Multi-level Work Breakdown Structure (WBS): Major Project ➔ Sub-Projects ➔ Work Packages ➔ Tasks',
      `<button class="btn" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + New Resort</button>
       <button class="btn primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Create N-Level Project</button>`)
      + `
        <!-- KPI Strip -->
        <div class="kpis">
          <div class="kpi">
            <span class="kpi-label">Selected Property</span>
            <span class="kpi-value" id="projResortLabel">Loading...</span>
            <span class="kpi-sub" id="projResortCode">WBS Scope</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">WBS Hierarchy Depth</span>
            <span class="kpi-value" id="projDepth">3 Nested Levels</span>
            <span class="kpi-sub">Root ➔ Sub ➔ Work Package</span>
          </div>
          <div class="kpi success">
            <span class="kpi-label">Active Work Packages</span>
            <span class="kpi-value" id="projActiveCount">12 Packages</span>
            <span class="kpi-sub">Civil, MEP, HVAC, Fitouts</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Approved Budget Total</span>
            <span class="kpi-value" id="projBudgetTotal">Loading...</span>
            <span class="kpi-sub" id="projSpentTotal">Root project budget baselines</span>
          </div>
        </div>

        <!-- Filter & View Selector -->
        <div class="card" style="padding:14px 20px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-weight:700; font-size:12px; color:var(--text-muted);">FILTER BY RESORT:</span>
              <select id="wbsResortFilter" class="resort-select" style="background:var(--bg-card); color:var(--text-main); border:1px solid var(--border-color); padding:6px 10px; border-radius:6px;">
                <option value="all">🌐 All Master Resorts (Full Portfolio)</option>
                ${resorts.map(r => `<option value="${r.id}" ${String(r.id) === String(selectedResortId) ? 'selected' : ''}>${esc(r.name)} (${esc(r.code || 'RES')})</option>`).join('')}
              </select>
            </div>

            <div class="btn-group">
              <button class="btn sm primary" id="btnViewTree" onclick="WTPages.switchProjView('tree')">🌲 Tree Hierarchy View</button>
              <button class="btn sm" id="btnViewTable" onclick="WTPages.switchProjView('table')">▤ Table List View</button>
              <button class="btn sm" id="btnViewCards" onclick="WTPages.switchProjView('cards')">▦ Card Grid View</button>
            </div>
          </div>
        </div>

        <!-- VIEW 1: Interactive Tree View -->
        <div id="wbsTreeView" class="tree-container">
          <div style="padding:24px; text-align:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading N-Level WBS Hierarchy...</div>
        </div>

        <!-- VIEW 2: Table List View -->
        <div id="wbsTableView" class="card" style="display:none; padding:0;">
          <div class="table-wrap">
            <table class="table" id="wbsMasterTable">
              <thead>
                <tr>
                  <th>LEVEL</th>
                  <th>PROJECT / PACKAGE TITLE</th>
                  <th>WBS CODE</th>
                  <th>DISCIPLINE</th>
                  <th>OWNER / LEAD</th>
                  <th>BUDGET</th>
                  <th>PROGRESS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="wbsTableBody">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- VIEW 3: Card Grid View -->
        <div id="wbsCardsView" class="grid g3" style="display:none; margin-top:16px;">
          <!-- Dynamically populated -->
        </div>
      `;

    // Hook Resort Filter
    $('#wbsResortFilter').addEventListener('change', (e) => {
      localStorage.setItem('WISETRACK_SELECTED_RESORT', e.target.value);
      renderWBSProjects();
    });

    WTPages.switchProjView = function(view) {
      $('#wbsTreeView').style.display = view === 'tree' ? 'block' : 'none';
      $('#wbsTableView').style.display = view === 'table' ? 'block' : 'none';
      $('#wbsCardsView').style.display = view === 'cards' ? 'grid' : 'none';
      $('#btnViewTree').className = `btn sm ${view === 'tree' ? 'primary' : ''}`;
      $('#btnViewTable').className = `btn sm ${view === 'table' ? 'primary' : ''}`;
      $('#btnViewCards').className = `btn sm ${view === 'cards' ? 'primary' : ''}`;
    };

    WTPages.toggleTreeNode = function(headerEl) {
      const toggle = headerEl.querySelector('.tree-toggle');
      const node = headerEl.closest('.tree-node');
      const childrenWrap = node.querySelector('.tree-children');
      if (childrenWrap) {
        const isHidden = childrenWrap.style.display === 'none';
        childrenWrap.style.display = isHidden ? 'block' : 'none';
        if (toggle) toggle.textContent = isHidden ? '▼' : '▶';
      }
    };

    async function renderWBSProjects() {
      const filterVal = $('#wbsResortFilter').value;
      const [allProjectsRaw, allResortsRaw] = await Promise.all([
        WisetrackAPI.getProjects().catch(() => []),
        WisetrackAPI.getResorts().catch(() => [])
      ]);

      const projects = typeof computeProjectLevels === 'function'
        ? computeProjectLevels((allProjectsRaw && allProjectsRaw.length) ? allProjectsRaw : [
        { id: 'PRJ-01', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: null, level: 1, name: 'Main Resort Building Phase-1 (Civil & Structure)', code: 'GR-CIV-001', discipline: 'Civil Structure', owner: 'Amit Verma', budget: '₹16.50 Cr', spent: '₹13.20 Cr', progress: 80, health: 'On Track', healthBadge: 'green', desc: 'Primary hotel block superstructure, RCC frame, roof waterproofing and core masonry.' },
        { id: 'PRJ-01-SUB1', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-01', level: 2, name: 'Block A Guest Wing Superstructure', code: 'GR-CIV-001-A', discipline: 'Civil Structure', owner: 'Amit Verma', budget: '₹9.20 Cr', spent: '₹7.80 Cr', progress: 85, health: 'On Track', healthBadge: 'green', desc: 'G+4 floor RCC slab casting, brickwork partition and waterproofing.' },
        { id: 'PRJ-01-SUB1-T1', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-01-SUB1', level: 3, name: 'Floor 1-4 RCC Slab Casting & Columns', code: 'GR-CIV-001-A-WP1', discipline: 'Civil Structure', owner: 'Site Team', budget: '₹5.40 Cr', spent: '₹5.40 Cr', progress: 100, health: 'Completed', healthBadge: 'green', desc: 'Completed casting for all four floors with M30 concrete grade.' },
        { id: 'PRJ-01-SUB1-T2', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-01-SUB1', level: 3, name: 'External Masonry & Plastering', code: 'GR-CIV-001-A-WP2', discipline: 'Civil Structure', owner: 'Site Team', budget: '₹3.80 Cr', spent: '₹2.40 Cr', progress: 70, health: 'On Track', healthBadge: 'green', desc: 'AAC block masonry and double coat external sand face plaster.' },
        { id: 'PRJ-01-SUB2', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-01', level: 2, name: 'Block B Luxury Pool Villas Civil Shell', code: 'GR-CIV-001-B', discipline: 'Civil Structure', owner: 'Ravi Shankar', budget: '₹7.30 Cr', spent: '₹5.40 Cr', progress: 74, health: 'On Track', healthBadge: 'green', desc: '12 individual duplex villa shells with private plunge pool basins.' },
        { id: 'PRJ-02', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: null, level: 1, name: 'Grand Resort MEP & Automation Infrastructure', code: 'GR-MEP-001', discipline: 'MEP & Electrical', owner: 'Rahul Sharma', budget: '₹12.40 Cr', spent: '₹8.90 Cr', progress: 72, health: 'On Track', healthBadge: 'green', desc: 'Central electrical distribution, 11kV substation, HVAC chiller plant, plumbing and fire safety network.' },
        { id: 'PRJ-02-SUB1', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-02', level: 2, name: 'Electrical Distribution & 11kV Substation', code: 'GR-MEP-001-ELE', discipline: 'Electrical', owner: 'Rahul Sharma', budget: '₹5.10 Cr', spent: '₹4.30 Cr', progress: 84, health: 'At Risk', healthBadge: 'amber', desc: 'HT transformers, DG synchronization panels, busduct risers and floor distribution.' },
        { id: 'PRJ-02-SUB1-T1', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-02-SUB1', level: 3, name: '11kV Substation & 2x 1500 kVA Transformer Setup', code: 'GR-MEP-001-ELE-T1', discipline: 'Electrical', owner: 'Rahul Sharma', budget: '₹2.90 Cr', spent: '₹2.80 Cr', progress: 95, health: 'Completed', healthBadge: 'green', desc: 'Substation building ready, transformer energized for dry testing.' },
        { id: 'PRJ-02-SUB1-T2', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-02-SUB1', level: 3, name: 'Main Cable Tray Laying & LT Cabling', code: 'GR-MEP-001-ELE-T2', discipline: 'Electrical', owner: 'Rahul Sharma', budget: '₹2.20 Cr', spent: '₹1.50 Cr', progress: 72, health: 'On Track', healthBadge: 'green', desc: '4C x 16 sqmm & 4C x 240 sqmm Polycab XLPE cable laying across main duct shafts.' },
        { id: 'PRJ-02-SUB2', resortId: 'RES-GOA-01', resortName: 'Grand Oasis Resort & Spa', parentId: 'PRJ-02', level: 2, name: 'HVAC Central Chiller & VRV Air Conditioning', code: 'GR-MEP-001-HVAC', discipline: 'HVAC', owner: 'Manoj Joshi', budget: '₹4.80 Cr', spent: '₹3.60 Cr', progress: 65, health: 'At Risk', healthBadge: 'amber', desc: 'Water-cooled chillers, cooling towers, primary/secondary pumps and VRV indoor units.' },
        { id: 'PRJ-03', resortId: 'RES-JAI-02', resortName: 'Royal Heritage Palace & Villas', parentId: null, level: 1, name: 'Palace Wing Restoration & Automation', code: 'JAI-CIV-002', discipline: 'Heritage MEP', owner: 'Priya Mehta', budget: '₹18.40 Cr', spent: '₹11.20 Cr', progress: 58, health: 'On Track', healthBadge: 'green', desc: 'Restoration of royal stone courtyard, heritage chandeliers, and smart guestroom lighting.' },
        { id: 'PRJ-04', resortId: 'RES-MAN-03', resortName: 'Pine Valley Mountain Resort', parentId: null, level: 1, name: 'Geothermal Heated Pool & Spa Complex', code: 'MAN-SPA-001', discipline: 'Civil & MEP', owner: 'Vikram Rao', budget: '₹9.20 Cr', spent: '₹4.15 Cr', progress: 45, health: 'On Track', healthBadge: 'green', desc: 'Geothermal hot water loop, glass-enclosed infinity pool, and steam thermal suites.' },
        { id: 'PRJ-05', resortId: 'RES-KOV-04', resortName: 'Azure Sands Beach Retreat', parentId: null, level: 1, name: 'Solar Microgrid & Energy Storage 250kW', code: 'KOV-SLR-001', discipline: 'Renewable Solar', owner: 'Ananya Nair', budget: '₹6.50 Cr', spent: '₹2.30 Cr', progress: 35, health: 'On Track', healthBadge: 'green', desc: 'Rooftop solar photovoltaic plant, 500kWh lithium battery bank, and grid synchronization.' }
      ])
        : ((allProjectsRaw && allProjectsRaw.length) ? allProjectsRaw : []);

      // Filter by resort
      const filteredProjects = filterVal === 'all' ? projects : projects.filter(p => String(p.resortId) === String(filterVal) || String(p.resortId) === `RES-${filterVal}`);
      const matchedResort = allResortsRaw.find(r => String(r.id) === String(filterVal)) || { name: 'Grand Oasis Resort & Spa, Goa', code: 'RES-GOA-01' };
      filteredProjects.forEach(p => { p.projectBudgetDisplay = projectBudgetLabel(p); });
      const rootBudgetRows = filteredProjects.filter(p => !(p.parentProjectId ?? p.parentId));
      const rootBudgetTotals = new Map();
      for (const p of rootBudgetRows) {
        if (p.projectBudgetAmount == null) continue;
        const currency = String(p.projectBudgetCurrency || p.currency || 'INR').toUpperCase();
        rootBudgetTotals.set(currency, (rootBudgetTotals.get(currency) || 0) + Number(p.projectBudgetAmount));
      }
      const portfolioBudgetLabel = rootBudgetTotals.size
        ? [...rootBudgetTotals].map(([currency, amount]) => formatBudgetValue(amount, currency)).join(' + ')
        : 'Not set';

      // Update KPI strip
      $('#projResortLabel').textContent = filterVal === 'all' ? 'All Resorts Portfolio' : matchedResort.name;
      $('#projResortCode').textContent = filterVal === 'all' ? `${filteredProjects.length} Total Packages` : (matchedResort.code || 'RES');
      $('#projActiveCount').textContent = `${filteredProjects.length} Packages`;
      $('#projBudgetTotal').textContent = portfolioBudgetLabel;
      $('#projSpentTotal').textContent = `${rootBudgetRows.filter(p => p.projectBudgetAmount != null).length} root project budget baseline(s)`;

      // 1. Render Recursive N-Level Tree View
      const treeRoot = $('#wbsTreeView');
      if (!filteredProjects.length) {
        treeRoot.innerHTML = `<div style="padding:32px; text-align:center; color:var(--text-muted);">No projects found for this resort. Click <b>+ Create N-Level Project</b> above to add one.</div>`;
      } else {
        // Group by parent ID using normalized String IDs
        const normalized = filteredProjects.map(p => ({
          ...p,
          id: String(p.id),
          parentId: (p.parentProjectId !== undefined && p.parentProjectId !== null) ? String(p.parentProjectId) : (p.parentId ? String(p.parentId) : null),
          children: []
        }));

        const projectMap = new Map();
        normalized.forEach(p => projectMap.set(p.id, p));

        const rootProjects = [];
        normalized.forEach(p => {
          if (p.parentId && projectMap.has(p.parentId)) {
            projectMap.get(p.parentId).children.push(p);
          } else {
            rootProjects.push(p);
          }
        });

        function buildTreeNodeHtml(node, depth = 1, parentName = '') {
          const hasChildren = node.children && node.children.length > 0;
          const prog = node.progress || (node.progressPercent || 0);
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
            relationTxt = `↳ Child of Level 1: <strong>${esc(parentName)}</strong>`;
            addBtnTxt = '+ Work Package (L3)';
          } else if (depth === 3) {
            levelPill = '<span class="tree-level-pill lvl-3">🟢 Level 3 · Child Package</span>';
            relationTxt = `↳ ↳ Child of Level 2: <strong>${esc(parentName)}</strong>`;
            addBtnTxt = '+ Sub-Task (L4)';
          } else {
            levelPill = `<span class="tree-level-pill lvl-4">🟠 Level ${depth} · N-th Term Task</span>`;
            relationTxt = `↳ ↳ ↳ Child of Level ${depth - 1}: <strong>${esc(parentName)}</strong>`;
            addBtnTxt = '+ Child Task';
          }

          return `
            <div class="tree-node">
              <div class="tree-header ${levelClass}" onclick="WTPages.toggleTreeNode(this)">
                <span class="tree-toggle">${hasChildren ? '▼' : '•'}</span>
                <span style="font-size:15px;">${icon}</span>
                <div class="tree-title">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                    ${levelPill}
                    <strong style="font-size:14px;">${esc(node.name || node.title)}</strong>
                  </div>
                  <small style="color:var(--text-muted); font-size:11.5px;">${relationTxt} · WBS: <code>${esc(node.code || '')}</code> · Discipline: <b>${esc(node.discipline || node.disc || 'General')}</b> · Lead: <b>${esc(node.owner || node.ownerName || 'Lead PM')}</b> · Budget: <b>${esc(node.projectBudgetDisplay)}</b></small>
                </div>
                <div class="tree-meta">
                  <div class="progress ${progColor}" style="width:60px; margin:0;"><i style="width:${prog}%"></i></div>
                  <span>${prog}%</span>
                  <span class="badge ${node.healthBadge || (prog>=80?'green':prog>=50?'blue':'amber')}">${esc(node.health || node.status || 'Active')}</span>
                  <button class="btn sm primary" title="Add Child Sub-Package" onclick="event.stopPropagation(); openCreateProjectModal('${node.id}');"><i class="fa-solid fa-plus"></i> ${addBtnTxt}</button>
                  <button class="btn sm" title="Edit Package" onclick="event.stopPropagation(); openEditProjectModal('${node.id}');"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn sm danger" title="Delete Package" onclick="event.stopPropagation(); confirmDeleteProject('${node.id}');"><i class="fa-solid fa-trash"></i></button>
                  <a href="project-detail.html" class="btn sm" title="Open project details" onclick="event.stopPropagation(); localStorage.setItem('WISETRACK_SELECTED_PROJECT','${node.id}');">Details</a>
                </div>
              </div>
              ${hasChildren ? `<div class="tree-children">${node.children.map(c => buildTreeNodeHtml(c, depth + 1, node.name || node.title)).join('')}</div>` : ''}
            </div>
          `;
        }

        treeRoot.innerHTML = `
          <div class="tree-node">
            <div class="tree-header level-0">
              <span style="font-size:16px;"><i class="fa-solid fa-hotel"></i></span>
              <div class="tree-title">
                <strong style="font-size:14px;">${esc(matchedResort.name || 'Master Resort Destination')} (${esc(matchedResort.code || 'RES')})</strong>
                <small>Master Resort Property · Total CapEx Budget: ${esc(portfolioBudgetLabel)} · ${filteredProjects.length} Nested Packages</small>
              </div>
              <div class="tree-meta">
                <button class="btn sm primary" onclick="openCreateProjectModal();"><i class="fa-solid fa-plus"></i> Add Level-1 Major Project</button>
              </div>
            </div>
          </div>
          ${rootProjects.map(rp => buildTreeNodeHtml(rp, 1, matchedResort.name || 'Root')).join('')}
        `;
      }

      // 2. Render Table View
      $('#wbsTableBody').innerHTML = filteredProjects.map(p => {
        const prog = p.progress || (p.progressPercent || 0);
        const progColor = prog >= 80 ? 'green' : (prog >= 50 ? 'blue' : 'amber');
        const lvl = Number(p.level) || 1;
        const parentObj = p.parentId ? projects.find(x => String(x.id) === String(p.parentId)) : null;
        return `
          <tr>
            <td>
              <span class="tree-level-pill lvl-${Math.min(4, lvl)}">
                ${lvl == 1 ? '🔵 Level 1 · Root' : (lvl == 2 ? '🟣 Level 2 · Sub' : (lvl == 3 ? '🟢 Level 3 · Package' : `🟠 Level ${lvl} · Task`))}
              </span>
            </td>
            <td>
              <strong>${esc(p.name || p.title)}</strong>
              ${p.desc ? `<small style="color:var(--text-muted);">${esc(p.desc)}</small>` : ''}
            </td>
            <td>
              ${parentObj ? `<small style="font-weight:600; color:var(--text-main);">↳ Parent: <u>${esc(parentObj.name)}</u></small><small style="color:var(--text-muted);">Code: ${esc(parentObj.code || '')}</small>` : `<span class="badge blue">None (Root Parent)</span>`}
            </td>
            <td><code>${esc(p.code || 'PRJ-01')}</code></td>
            <td><span class="badge blue">${esc(p.discipline || p.disc || 'Civil Structure')}</span></td>
            <td><b>${esc(p.owner || p.ownerName || 'Lead PM')}</b></td>
            <td>${esc(p.projectBudgetDisplay || projectBudgetLabel(p))}</td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="progress ${progColor}" style="width:50px; margin:0;"><i style="width:${prog}%"></i></div>
                <b>${prog}%</b>
              </div>
            </td>
            <td><span class="badge ${p.healthBadge || 'green'}">${esc(p.health || p.status || 'On Track')}</span></td>
            <td>
              <div class="btn-group">
                <button class="btn sm primary" title="Add Child Sub-Package" onclick="openCreateProjectModal('${p.id}')"><i class="fa-solid fa-plus"></i></button>
                <button class="btn sm" onclick="openEditProjectModal('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn sm danger" onclick="confirmDeleteProject('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                <button class="btn sm" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${p.id}');location.href='project-detail.html'">Details</button>
              </div>
            </td>
          </tr>
        `;
      }).join('') || emptyRow(10, 'No projects found');

      // 3. Render Cards View
      $('#wbsCardsView').innerHTML = filteredProjects.map(p => {
        const prog = p.progress || (p.progressPercent || 0);
        const progColor = prog >= 80 ? 'green' : (prog >= 50 ? 'blue' : 'amber');
        const lvl = Number(p.level) || 1;
        const parentObj = p.parentId ? projects.find(x => String(x.id) === String(p.parentId)) : null;
        return `
          <div class="card" style="margin-bottom:0; border-top: 4px solid ${lvl == 1 ? '#2563eb' : (lvl == 2 ? '#7c3aed' : (lvl == 3 ? '#059669' : '#d97706'))};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge ${p.healthBadge || 'green'}">${esc(p.health || p.status || 'On Track')}</span>
              <span class="tree-level-pill lvl-${Math.min(4, lvl)}">
                ${lvl == 1 ? '🔵 Level 1 Parent' : (lvl == 2 ? '🟣 Level 2 Sub' : (lvl == 3 ? '🟢 Level 3 Package' : `🟠 Level ${lvl} Task`))}
              </span>
            </div>
            <h3 style="font-size:15px; font-weight:800; margin:10px 0 4px;">${esc(p.name || p.title)}</h3>
            ${parentObj ? `<div style="font-size:11px; color:#6b21a8; background:#faf5ff; padding:3px 6px; border-radius:4px; margin-bottom:6px;">↳ Parent: <b>${esc(parentObj.name)}</b></div>` : ''}
            <div style="font-size:11.5px; color:var(--text-muted);">Code: <code>${esc(p.code || '')}</code> · ${esc(p.discipline || 'General')}</div>
            <p style="font-size:12px; color:var(--text-muted); margin:10px 0; min-height:36px;">${esc(p.desc || 'Engineering deliverable package with milestones and technical specifications.')}</p>
            <div class="progress ${progColor}"><i style="width:${prog}%"></i></div>
            <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:12px;">
              <span><b>${prog}%</b> complete</span>
              <span>Budget: <b>${esc(p.projectBudgetDisplay || projectBudgetLabel(p))}</b></span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <div class="btn-group">
                <button class="btn sm primary" title="Add Child Sub-Package" onclick="openCreateProjectModal('${p.id}')"><i class="fa-solid fa-plus"></i></button>
                <button class="btn sm" onclick="openEditProjectModal('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn sm danger" onclick="confirmDeleteProject('${p.id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
              <a href="project-detail.html" class="btn sm primary" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${p.id}')">Details</a>
            </div>
          </div>
        `;
      }).join('') || `<div class="card full" style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted);">No projects found</div>`;

      if (typeof initAllTables === 'function') setTimeout(() => initAllTables(), 150);
    }

    await renderWBSProjects();
  }

  // ---------- PROJECT DETAIL / TEAM ----------
  async function pageProjectDetail() {
    const el = root();
    let pid = await selectedProjectId();
    const picker = await projectPickerHtml();

    el.innerHTML = pageHead('Project Dashboard', 'Project dates, delivery progress, cost position, activity, risks and actions', picker)
      + `<div class="grid g2">
          <div class="card" id="projDetailBox">Loading project workspace...</div>
          <div class="card">
            <h3 class="card-title">Add Team Member</h3>
            <div class="form-grid" style="margin-top:12px">
              <div class="field"><label>User</label><select id="teamUserId"></select></div>
              <div class="field"><label>Team Role</label><input id="teamRole" placeholder="Site Engineer"></div>
            </div>
            <button class="btn primary" style="margin-top:12px" onclick="WTPages.addTeam()"><i class="fa-solid fa-user-plus"></i> Assign</button>
            <div id="teamList" style="margin-top:16px"></div>
          </div>
        </div>`;
    renderProjectContextTabs('project-detail.html', pid);
    el.insertAdjacentHTML('beforeend', `<section class="card" id="projectDashboard" style="margin-top:18px"><p style="color:var(--text-muted)">Loading project dashboard…</p></section>`);

    let apiProjects = [];
    try {
      apiProjects = await WisetrackAPI.getProjects().catch(() => []);
    } catch (e) {
      apiProjects = [];
    }

    if (!apiProjects.length) {
      $('#projDetailBox').innerHTML = `<div style="color:var(--text-muted);padding:24px;text-align:center;">No authorized project is available for this account.</div>`;
      $('#projectDashboard').innerHTML = '';
      return;
    }

    // 1. Try to find the project
    let p = null;
    if (pid) {
      if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn() && !isNaN(parseInt(pid))) {
        try {
          p = await WisetrackAPI.getProject(parseInt(pid));
        } catch (err) {
          console.warn('API getProject fallback:', err);
        }
      }
      if (!p) {
        p = apiProjects.find(x => String(x.id) === String(pid) || x.code === pid || String(x.id) === String(pid).replace('PRJ-', ''));
      }
    }

    // 2. Fallback to first available project
    if (!p) {
      p = apiProjects[0];
      pid = String(p.id);
      localStorage.setItem('WISETRACK_SELECTED_PROJECT', pid);
    }

    // 3. Load Users for team dropdown
    let users = [];
    try {
      users = await WisetrackAPI.getUsers().catch(() => []);
    } catch (e) {
      users = [];
    }
    if (!users || !users.length) {
      users = typeof getUsers === 'function' ? getUsers() : [];
    }

    const numericPid = Number(p.id);
    let profileBudget = null;
    let profileVariance = null;
    let profileFiles = [];
    const canSeeBudgets = typeof wtCan !== 'function' || wtCan('Budgets', 'view', numericPid);
    const canSeeCosts = typeof wtCan !== 'function' || wtCan('Costs', 'view', numericPid);
    try {
      const [budgets, files, variance] = await Promise.all([
        canSeeBudgets ? WisetrackAPI.getBudgets(numericPid).catch(() => []) : Promise.resolve([]),
        WisetrackAPI.getProjectFiles(numericPid).catch(() => []),
        canSeeBudgets && canSeeCosts ? WisetrackAPI.getVariance(numericPid).catch(() => null) : Promise.resolve(null)
      ]);
      profileBudget = budgets?.[0] || null;
      profileFiles = files || [];
      profileVariance = variance;
    } catch (_) { /* optional profile resources */ }
    p.budget = p.projectBudgetAmount != null ? projectBudgetLabel(p)
      : profileBudget?.approvedAmount != null ? formatBudgetValue(profileBudget.approvedAmount, profileBudget.currency || p.currency || 'INR') : 'N/A';
    p.spent = profileVariance && (profileVariance.currentCommitment != null || profileVariance.purchaseTotal != null)
      ? formatBudgetValue(profileVariance.currentCommitment ?? profileVariance.purchaseTotal, profileVariance.currency || p.currency || 'INR') : 'N/A';
    p.startDate = p.startDate || 'N/A';
    p.endDate = p.endDate || 'N/A';
    const prog = p.progress !== undefined ? p.progress : (p.progressPercent || 0);
    const progColor = prog >= 80 ? 'green' : (prog >= 50 ? 'blue' : 'amber');
    const lvl = Number(p.level) || 1;
    const levelBadge = lvl === 1 
      ? '<span class="tree-level-pill lvl-1">🔵 Level 1 · Root Parent</span>'
      : lvl === 2 
      ? '<span class="tree-level-pill lvl-2">🟣 Level 2 · Sub-Project</span>'
      : lvl === 3 
      ? '<span class="tree-level-pill lvl-3">🟢 Level 3 · Child Package</span>'
      : `<span class="tree-level-pill lvl-4">🟠 Level ${lvl} · Task</span>`;

    $('#projDetailBox').innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div>
          <div style="margin-bottom:4px;">${levelBadge}</div>
          <h3 style="font-size:18px; font-weight:800; margin:0 0 4px;">${detailValue(p.name || p.title)}</h3>
          <p style="color:var(--text-muted); font-size:12px; margin:0;">Code: <code>${detailValue(p.code)}</code> · Discipline: <b>${detailValue(p.discipline || p.disc)}</b></p>
        </div>
        <span class="badge ${p.healthBadge || (prog>=80?'green':prog>=50?'blue':'amber')}">${esc(p.health || p.status || 'Active')}</span>
      </div>

      <div style="margin:14px 0;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
          <span>Progress Completion</span>
          <span><b>${prog}%</b></span>
        </div>
        <div class="progress ${progColor}"><i style="width:${prog}%"></i></div>
      </div>

      <div class="grid g2" style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:14px; font-size:12.5px;">
        ${canSeeBudgets ? `<div><b>Allocated Budget:</b> ${detailValue(p.projectBudgetDisplay || (p.projectBudgetAmount != null || profileBudget?.approvedAmount != null ? projectBudgetLabel(p) : null))}</div>` : ''}
        ${canSeeBudgets && canSeeCosts ? `<div><b>Committed Spent:</b> ${detailValue(p.spent)}</div>` : ''}
        <div><b>Project Owner:</b> ${detailValue(p.ownerName || p.owner)}</div>
        <div><b>Client:</b> ${detailValue(p.clientName)}</div>
        <div><b>Sponsor:</b> ${detailValue(p.sponsor)}</div>
        <div><b>Currency:</b> ${detailValue(p.currency)}</div>
        <div><b>Status:</b> ${detailValue(p.status)}</div>
        <div><b>Schedule:</b> ${detailValue(p.startDate)} ➔ ${detailValue(p.endDate)}</div>
      </div>

      <div>
        <strong style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Scope & Deliverables:</strong>
        <p style="font-size:13px; margin:6px 0 0; line-height:1.5;">${detailValue(p.description)}</p>
      </div>
      <div style="margin-top:12px"><strong style="font-size:12px;color:var(--text-muted);text-transform:uppercase">Relevant Notes</strong><p style="white-space:pre-wrap">${detailValue(p.profileNotes)}</p></div>
      <div style="margin-top:12px"><strong style="font-size:12px;color:var(--text-muted);text-transform:uppercase">Attachments</strong>${profileFiles.length ? `<ul>${profileFiles.map(f => `<li>${detailValue(f.fileName)} <button class="btn sm" onclick="WisetrackAPI.downloadProjectFile(${f.id}).catch(e=>showToast(e.message,'danger'))">Download</button></li>`).join('')}</ul>` : '<p>N/A</p>'}</div>
      
      <div style="margin-top:16px; border-top:1px solid var(--border-color); padding-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn sm primary" onclick="openCreateProjectModal('${p.id}')"><i class="fa-solid fa-plus"></i> + Add Sub-Package</button>
        <button class="btn sm" onclick="openEditProjectModal('${p.id}')"><i class="fa-solid fa-pen"></i> Edit Profile</button>
      </div>
      <div id="wsExtra" style="margin-top:16px;"></div>
    `;

    $('#teamUserId').innerHTML = users.map(u => `<option value="${u.id}">${esc(u.fullName || u.name)} (${esc(u.email)})</option>`).join('') || '<option>No users</option>';
    try {
      const [team, variance, exceptions, explanations] = await Promise.all([
        WisetrackAPI.getProjectTeam(numericPid).catch(() => []),
        canSeeBudgets && canSeeCosts ? WisetrackAPI.getVariance(numericPid).catch(() => null) : Promise.resolve(null),
        WisetrackAPI.getExceptions(numericPid).catch(() => []),
        WisetrackAPI.getVarianceExplanations(numericPid).catch(() => [])
      ]);
      const teamRows = Array.isArray(team) ? team : [];
      $('#teamList').innerHTML = teamRows.length
        ? `<div style="display:flex;flex-direction:column;gap:6px;">${teamRows.map(m => `
            <div style="font-size:13px;padding:8px;border:1px solid var(--border-color);border-radius:6px;">
              <strong>${esc(m.fullName || m.userName || m.name || ('User #' + (m.userId || m.id)))}</strong>
              <small style="display:block;color:var(--text-muted)">${esc(m.teamRole || m.role || 'Team')}</small>
            </div>`).join('')}</div>`
        : '<small class="card-subtitle">No team assigned yet. Use the form to assign a member.</small>';
      const extra = [];
      if (variance) {
        extra.push(`<div class="card" style="margin-top:12px;padding:12px;">
          <strong>Budget RAG</strong>
          <div class="grid g4" style="margin-top:8px;font-size:12.5px;">
            <div>Approved<br><b>₹${Number(variance.approvedBudget || 0).toLocaleString('en-IN')}</b></div>
            <div>Purchase<br><b>₹${Number(variance.purchaseTotal || 0).toLocaleString('en-IN')}</b></div>
            <div>Actual<br><b>₹${Number(variance.actualTotal || 0).toLocaleString('en-IN')}</b></div>
            <div>RAG<br><span class="badge ${variance.ragStatus === 'Red' ? 'red' : variance.ragStatus === 'Amber' ? 'amber' : 'green'}">${esc(variance.ragStatus || 'Green')}</span></div>
          </div>
        </div>`);
      }
      extra.push(`<div class="card" style="margin-top:12px;padding:12px;">
        <strong>Exceptions</strong>
        <div id="wsExc" style="margin-top:8px;font-size:12.5px;">${(exceptions || []).length
          ? `<ul>${exceptions.map(x => `<li>${esc(x.title || x.Title || x.message || x.Message || 'Exception')}</li>`).join('')}</ul>`
          : 'No open exceptions for this package.'}</div>
      </div>`);
      extra.push(`<div class="card" style="margin-top:12px;padding:12px;">
        <strong>Variance explanations (PM-24)</strong>
        <div id="wsVarList" style="margin-top:8px;font-size:12.5px;">${(explanations || []).length
          ? explanations.map(v => `<p><b>${esc(v.varianceType || v.VarianceType)}</b> — ${esc(v.explanation || v.Explanation)}</p>`).join('')
          : 'No explanations recorded.'}</div>
        <div class="form-grid" style="margin-top:10px;">
          <div class="field"><label>Type</label><select id="wsVarType"><option>Cost</option><option>Schedule</option></select></div>
          <div class="field full"><label>Explanation</label><textarea id="wsVarText" rows="2" placeholder="Why this variance happened"></textarea></div>
        </div>
        <button class="btn sm primary" style="margin-top:8px" onclick="WTPages.saveWorkspaceVariance(${numericPid})">Save explanation</button>
      </div>`);
      $('#wsExtra').innerHTML = extra.join('');
    } catch (_) {
      $('#teamList').innerHTML = '<small class="card-subtitle">Team list unavailable.</small>';
    }
    await renderProjectDashboard(p, numericPid);
  }

  async function renderProjectDashboard(project, projectId) {
    const box = $('#projectDashboard');
    if (!box) return;
    const can = module => typeof wtCan !== 'function' || wtCan(module, 'view', projectId);
    const [milestones, tasks, exceptions, issues, boq, variance] = await Promise.all([
      can('Milestones') ? WisetrackAPI.getMilestones(projectId).catch(() => []) : Promise.resolve([]),
      can('Tasks') ? WisetrackAPI.getTasks(projectId).catch(() => []) : Promise.resolve([]),
      can('Tasks') ? WisetrackAPI.getExceptions(projectId).catch(() => []) : Promise.resolve([]),
      can('Issues') ? WisetrackAPI.getIssues(projectId).catch(() => []) : Promise.resolve([]),
      can('BOQ') ? WisetrackAPI.getBoqs(projectId).catch(() => []) : Promise.resolve([]),
      can('Budgets') && can('Costs') ? WisetrackAPI.getVariance(projectId).catch(() => null) : Promise.resolve(null)
    ]);
    const rows = value => Array.isArray(value) ? value : value?.items || value?.data || [];
    const ms = rows(milestones), ts = rows(tasks), riskItems = rows(exceptions), issueRows = rows(issues), boqRows = rows(boq);
    const completed = item => /complete|closed|done/i.test(String(item.status || item.Status || '')) || Number(item.completionPercent ?? item.CompletionPercent ?? 0) >= 100;
    const date = value => value ? new Date(value).toLocaleDateString() : '—';
    const money = value => `${esc(variance?.currency || 'INR')} ${Number(value || 0).toLocaleString('en-IN')}`;
    const openIssues = issueRows.filter(i => !/closed|resolved/i.test(String(i.status || i.Status || '')));
    const taskActions = ts.flatMap(t => [t, ...rows(t.subTasks || t.SubTasks)]);
    const pendingTasks = taskActions.filter(t => !completed(t));
    const activities = [
      ...ts.map(t => ({ label: `Task · ${t.title || t.Title || 'Task'} · ${t.status || t.Status || 'Updated'}`, at: t.updatedAt || t.UpdatedAt || t.createdAt || t.CreatedAt })),
      ...ms.map(m => ({ label: `Milestone · ${m.name || m.Name || 'Milestone'} · ${m.status || m.Status || 'Updated'}`, at: m.createdAt || m.CreatedAt })),
      ...issueRows.map(i => ({ label: `Issue · ${i.title || i.Title || 'Issue'} · ${i.status || i.Status || 'Updated'}`, at: i.updatedAt || i.UpdatedAt || i.createdAt || i.CreatedAt })),
      ...boqRows.map(b => ({ label: `BOQ · ${b.title || b.Title || 'BOQ'} · ${b.status || b.Status || 'Updated'}`, at: b.updatedAt || b.UpdatedAt || b.createdAt || b.CreatedAt }))
    ].filter(a => a.at).sort((a,b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
    const card = (title, content) => `<div class="card" style="padding:14px"><h3 class="card-title">${title}</h3><div style="margin-top:10px">${content}</div></div>`;
    const listOrEmpty = (items, empty) => items.length ? `<ul style="margin:0;padding-left:20px">${items.join('')}</ul>` : `<span style="color:var(--text-muted)">${empty}</span>`;
    const milestonePct = ms.length ? Math.round(ms.reduce((sum,m) => sum + Number(m.completionPercent ?? m.CompletionPercent ?? (completed(m) ? 100 : 0)), 0) / ms.length) : 0;
    const budgetPanel = variance ? `<div class="grid g4" style="font-size:13px">
      <div>Approved budget<br><strong>${money(variance.approvedBudget ?? variance.budget)}</strong></div><div>Purchase commitment<br><strong>${money(variance.purchaseTotal ?? variance.currentCommitment)}</strong></div>
      <div>Actual cost<br><strong>${money(variance.actualTotal ?? variance.actualSpend)}</strong></div><div>Forecast position<br><span class="badge ${(variance.ragStatus || '').toLowerCase() === 'red' ? 'red' : (variance.ragStatus || '').toLowerCase() === 'amber' ? 'amber' : 'green'}">${esc(variance.budgetStatus || variance.ragStatus || 'On Budget')}</span><br>${money(variance.forecastVarianceAmount)}</div>
      </div>` : `<span style="color:var(--text-muted)">${can('Budgets') && can('Costs') ? 'Budget data is unavailable.' : 'Budget and cost data are hidden for your permissions.'}</span>`;
    const centers = rows(variance?.costCenters);
    const costCenterPanel = variance ? (centers.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Cost center</th><th>Budget</th><th>Commitment</th><th>Actual</th><th>Forecast RAG</th></tr></thead><tbody>${centers.map(c => `<tr><td>${esc(c.costCenterName || c.name || `#${c.costCenterId}`)}</td><td>${money(c.budget)}</td><td>${money(c.currentCommitment ?? c.purchaseCost)}</td><td>${money(c.actualSpend)}</td><td><span class="badge ${c.ragStatus === 'Red' ? 'red' : c.ragStatus === 'Amber' ? 'amber' : 'green'}">${esc(c.ragStatus || 'Green')}</span></td></tr>`).join('')}</tbody></table></div>` : '<span style="color:var(--text-muted)">No cost center rollups.</span>') : budgetPanel;
    const boqPanel = boqRows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>BOQ</th><th>Status</th><th>Baseline</th><th>Lines</th></tr></thead><tbody>${boqRows.map(b => { const versions = rows(b.versions || b.Versions); const baseline = versions.find(v => v.isCurrentBaseline || v.IsCurrentBaseline); const lines = rows(baseline?.items || baseline?.Items); return `<tr><td>${esc(b.title || b.Title || `BOQ #${b.id || b.Id}`)}</td><td>${esc(b.status || b.Status || '—')}</td><td>${baseline ? `v${baseline.versionNo || baseline.VersionNo}` : 'Not set'}</td><td>${lines.length || (b.itemCount ?? b.ItemCount ?? '—')}</td></tr>`; }).join('')}</tbody></table></div>` : '<span style="color:var(--text-muted)">No BOQ records available or permission is restricted.</span>';
    box.innerHTML = `<div class="card-header"><div><h2 class="card-title">${esc(project.name || project.title || 'Project')} · Project Dashboard</h2><div class="card-subtitle">Project dates, delivery progress, financial position, risks and actions</div></div></div>
      <div class="grid g2" style="margin-top:12px">
        ${card('Project Dates', `<div class="grid g2"><div>Start date<br><strong>${date(project.startDate || project.StartDate)}</strong></div><div>Planned completion<br><strong>${date(project.endDate || project.EndDate)}</strong></div></div>`)}
        ${card('Milestone Progress', `<div style="display:flex;justify-content:space-between"><span>${ms.filter(completed).length} of ${ms.length} complete</span><strong>${milestonePct}%</strong></div><div class="progress ${milestonePct >= 80 ? 'green' : milestonePct >= 50 ? 'blue' : 'amber'}"><i style="width:${milestonePct}%"></i></div>${listOrEmpty(ms.slice().sort((a,b) => new Date(a.dueDate || a.DueDate || 0) - new Date(b.dueDate || b.DueDate || 0)).slice(0,5).map(m => `<li>${esc(m.name || m.Name)} · ${esc(m.status || m.Status || 'Not started')} · due ${date(m.dueDate || m.DueDate)}</li>`), 'No milestones available or permission is restricted.')}`)}
        ${card('Budget Position', budgetPanel)}
        ${card('Cost Center Position', costCenterPanel)}
        ${card('BOQ Status', boqPanel)}
        ${card('Recent Activity', listOrEmpty(activities.map(a => `<li>${esc(a.label)} <small style="color:var(--text-muted)">${date(a.at)}</small></li>`), 'No recent project activity is available.'))}
        ${card('Risks', listOrEmpty([...riskItems.map(x => `<li><span class="badge ${/overdue|critical/i.test(x.type || x.Type || '') ? 'red' : 'amber'}">${esc(x.type || x.Type || 'Risk')}</span> ${esc(x.title || x.Title || x.message || x.Message || 'Risk item')}</li>`), ...openIssues.map(i => `<li><span class="badge ${i.isEscalated || i.IsEscalated ? 'red' : 'amber'}">${i.isEscalated || i.IsEscalated ? 'Escalated' : 'Open issue'}</span> ${esc(i.title || i.Title || 'Issue')}</li>`) ], 'No active risks or open issues.'))}
        ${card('Outstanding Actions', listOrEmpty(pendingTasks.slice(0,12).map(t => `<li>${esc(t.title || t.Title || 'Task')} · ${esc(t.status || t.Status || 'Not started')} · due ${date(t.dueDate || t.DueDate)}</li>`), 'No outstanding tasks.'))}
      </div>`;
  }

  async function saveWorkspaceVariance(projectId) {
    const explanation = ($('#wsVarText')?.value || '').trim();
    if (!explanation) { showToast('Enter an explanation', 'danger'); return; }
    try {
      await WisetrackAPI.addVarianceExplanation({
        projectId,
        varianceType: $('#wsVarType')?.value || 'Cost',
        explanation
      });
      showToast('Variance explanation saved');
      await pageProjectDetail();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function addTeam() {
    const pid = await selectedProjectId();
    try {
      await WisetrackAPI.assignTeamMember(pid, { userId: Number($('#teamUserId').value), teamRole: $('#teamRole').value.trim() });
      showToast('Team member assigned');
      await pageProjectDetail();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- ITEMS / BRANDS / UNITS / CATEGORIES ----------
  async function pageItems() {
    const el = root();
    el.innerHTML = pageHead('Reusable Item / Price Master', 'Shared item database available to reuse across projects',
      `<button class="btn" onclick="WTPages.openBrandModal()">Brand</button>
       <button class="btn" onclick="WTPages.openUnitModal()">Unit</button>
       <button class="btn" onclick="WTPages.openCategoryModal()">Category</button>
       <button class="btn primary" onclick="WTPages.openItemModal()"><i class="fa-solid fa-plus"></i> Item</button>`)
      + tableWrap(['ID', 'Code', 'Name', 'Purchase Price', 'Brand', 'Unit', 'Standard Price', 'Effective Date', 'Source', 'Image', 'Actions'], 'itemsBody')
      + `<div class="grid g3" style="margin-top:16px">
          ${tableWrap(['ID', 'Brand', 'Actions'], 'brandsBody')}
          ${tableWrap(['ID', 'Code', 'Name', 'Actions'], 'unitsBody')}
          ${tableWrap(['ID', 'Name', 'Actions'], 'catsBody')}
        </div>`;
    await refreshItemsAll();
  }

  async function refreshItemsAll() {
    try {
      const [items, brands, units, cats] = await Promise.all([
        WisetrackAPI.getItems(), WisetrackAPI.getBrands(), WisetrackAPI.getUnits(), WisetrackAPI.getCategories()
      ]);
      $('#itemsBody').innerHTML = items.length ? items.map(it => `
        <tr>
          <td>${it.id}</td><td><code>${esc(it.itemCode || it.code || '')}</code></td>
          <td>${esc(it.name)}</td><td>₹${Number(it.unitPrice || it.unitRate || 0).toLocaleString('en-IN')}</td>
          <td>${esc(it.brand?.name || it.brandName || '—')}</td><td>${esc(it.unit?.name || it.unitName || it.unit?.code || '—')}</td>
          <td>${it.standardPrice == null ? '—' : `₹${Number(it.standardPrice).toLocaleString('en-IN')}`}</td>
          <td>${esc(it.effectiveDate || '—')}</td><td>${esc(it.source || '—')}</td>
          <td>${it.imageUrl ? `<a href="${esc(it.imageUrl)}" target="_blank" rel="noopener">View</a>` : '—'}</td>
          <td class="table-actions">
            <button class="btn sm" onclick="WTPages.openItemModal(${it.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" onclick="WTPages.deleteItem(${it.id})"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join('') : emptyRow(11, 'No items');
      $('#brandsBody').innerHTML = brands.map(b => `<tr><td>${b.id}</td><td>${esc(b.name)}</td><td><button class="btn sm danger" onclick="WTPages.deleteBrand(${b.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') || emptyRow(3, '—');
      $('#unitsBody').innerHTML = units.map(u => `<tr><td>${u.id}</td><td>${esc(u.code)}</td><td>${esc(u.name)}</td><td><button class="btn sm danger" onclick="WTPages.deleteUnit(${u.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') || emptyRow(4, '—');
      $('#catsBody').innerHTML = cats.map(c => `<tr><td>${c.id}</td><td>${esc(c.name)}</td><td><button class="btn sm danger" onclick="WTPages.deleteCategory(${c.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') || emptyRow(3, '—');
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function openItemModal(id) {
    const [brands, units, cats] = await Promise.all([WisetrackAPI.getBrands(), WisetrackAPI.getUnits(), WisetrackAPI.getCategories()]);
    let it = { itemCode: '', name: '', unitPrice: 0 };
    if (id) it = await WisetrackAPI.getItem(id);
    openModal(id ? 'Edit Item' : 'Create Item', `
      <form onsubmit="WTPages.saveItem(event, ${id || 'null'})">
        <div class="form-grid">
          <div class="field"><label>Item Code</label><input id="itCode" value="${esc(it.itemCode || '')}" placeholder="Auto-generated if blank"></div>
          <div class="field"><label>Name *</label><input id="itName" value="${esc(it.name || '')}" required></div>
          <div class="field"><label>Purchase Price *</label><input id="itPrice" type="number" min="0" step="0.01" value="${it.unitPrice || 0}" required></div>
          <div class="field"><label>Standard Price</label><input id="itStandardPrice" type="number" min="0" step="0.01" value="${it.standardPrice ?? ''}"></div>
          <div class="field"><label>Unit</label><select id="itUnit"><option value="">—</option>${units.map(u => `<option value="${u.id}" ${it.unitId == u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Brand</label><select id="itBrand"><option value="">—</option>${brands.map(b => `<option value="${b.id}" ${it.brandId == b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Category</label><select id="itCat"><option value="">—</option>${cats.map(c => `<option value="${c.id}" ${it.categoryId == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field full"><label>Description</label><textarea id="itDesc">${esc(it.description || '')}</textarea></div>
          <div class="field full"><label>Image URL</label><input id="itImg" value="${esc(it.imageUrl || '')}" placeholder="/uploads/... or https://..."></div>
          <div class="field"><label>Effective Date</label><input id="itEffectiveDate" type="date" value="${esc(it.effectiveDate || '')}"></div>
          <div class="field"><label>Source</label><input id="itSource" value="${esc(it.source || '')}" placeholder="Vendor, quotation, catalog..."></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveItem(e, id) {
    e.preventDefault();
    const payload = {
      itemCode: $('#itCode')?.value.trim() || '',
      name: $('#itName').value.trim(),
      unitPrice: Number($('#itPrice').value),
      standardPrice: $('#itStandardPrice').value === '' ? null : Number($('#itStandardPrice').value),
      unitId: $('#itUnit').value ? Number($('#itUnit').value) : null,
      brandId: $('#itBrand').value ? Number($('#itBrand').value) : null,
      categoryId: $('#itCat').value ? Number($('#itCat').value) : null,
      description: $('#itDesc')?.value.trim() || null,
      imageUrl: $('#itImg')?.value.trim() || null,
      effectiveDate: $('#itEffectiveDate').value || null,
      source: $('#itSource').value.trim() || null
    };
    try {
      if (id) await WisetrackAPI.updateItem(id, payload);
      else await WisetrackAPI.createItem(payload);
      closeModal(); showToast('Item saved'); await refreshItemsAll();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deleteItem(id) { if (!confirm('Delete?')) return; try { await WisetrackAPI.deleteItem(id); await refreshItemsAll(); } catch (e) { showToast(e.message, 'danger'); } }
  function openBrandModal() {
    openModal('New Brand', `<form onsubmit="event.preventDefault();WisetrackAPI.createBrand(document.getElementById('bName').value).then(()=>{closeModal();showToast('Saved');WTPages.refreshItemsAll()}).catch(e=>showToast(e.message,'danger'))"><div class="field"><label>Name</label><input id="bName" required></div><div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div></form>`);
  }
  function openUnitModal() {
    openModal('New Unit', `<form onsubmit="event.preventDefault();WisetrackAPI.createUnit('',document.getElementById('uName').value).then(()=>{closeModal();showToast('Saved');WTPages.refreshItemsAll()}).catch(e=>showToast(e.message,'danger'))"><div class="field"><label>Name *</label><input id="uName" required></div><p class="card-subtitle">Code auto-assigns (UNT-001).</p><div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div></form>`);
  }
  function openCategoryModal() {
    openModal('New Category', `<form onsubmit="event.preventDefault();WisetrackAPI.createCategory(document.getElementById('cName').value,null).then(()=>{closeModal();showToast('Saved');WTPages.refreshItemsAll()}).catch(e=>showToast(e.message,'danger'))"><div class="field"><label>Name</label><input id="cName" required></div><div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div></form>`);
  }
  async function deleteBrand(id) { try { await WisetrackAPI.deleteBrand(id); await refreshItemsAll(); } catch (e) { showToast(e.message, 'danger'); } }
  async function deleteUnit(id) { try { await WisetrackAPI.deleteUnit(id); await refreshItemsAll(); } catch (e) { showToast(e.message, 'danger'); } }
  async function deleteCategory(id) { try { await WisetrackAPI.deleteCategory(id); await refreshItemsAll(); } catch (e) { showToast(e.message, 'danger'); } }

  // ---------- BUDGETS ----------
  async function pageBudget() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Budgets & Cost Centers', '/api/budgets', picker +
      ` <button class="btn" onclick="WTPages.openCostCenterModal()">+ Cost Center</button>
        <button class="btn primary" onclick="WTPages.openBudgetModal()">+ Budget</button>`)
      + tableWrap(['ID', 'Name', 'Approved', 'Allocated', 'Remaining', 'Currency', 'Approved Version', 'Actions'], 'budgetBody')
      + tableWrap(['Cost Center', 'Budget', 'Purchase / Commitment', 'Actual Spend', 'Forecast', 'Variance vs Actual', 'Budget Status', 'RAG (Forecast)'], 'ccBody');
    if (!pid) {
      $('#budgetBody').innerHTML = emptyRow(8, 'No project available.');
      $('#ccBody').innerHTML = emptyRow(8, 'No project available.');
      return;
    }
    try {
      const [budgets, ccs] = await Promise.all([WisetrackAPI.getBudgets(pid), WisetrackAPI.getCostCenters(pid)]);
      const variance = await WisetrackAPI.getVariance(pid).catch(() => ({ costCenters: [] }));
      const ragByCenter = new Map((variance.costCenters || []).map(x => [x.costCenterId, x]));
      $('#budgetBody').innerHTML = (budgets || []).map(b => {
        const allocated = (b.allocations || []).reduce((n, a) => n + Number(a.allocatedAmount || 0), 0);
        const remaining = Number(b.approvedAmount || 0) - allocated;
        const latestVersion = [...(b.versions || [])].sort((a, z) => Number(z.versionNo) - Number(a.versionNo))[0];
        return `<tr><td>${b.id}</td><td>${esc(b.name)}</td>
          <td>${esc(b.currency || 'INR')} ${Number(b.approvedAmount || 0).toLocaleString('en-IN')}</td>
          <td>${esc(b.currency || 'INR')} ${allocated.toLocaleString('en-IN')}</td><td>${esc(b.currency || 'INR')} ${remaining.toLocaleString('en-IN')}</td>
          <td>${esc(b.currency || 'INR')}</td><td>${latestVersion ? `v${latestVersion.versionNo}` : '—'}</td>
          <td><button class="btn sm" onclick="WTPages.openBudgetHistory(${b.id})">History</button> <button class="btn sm" onclick="WTPages.openBudgetRevision(${b.id})">Revise</button> <button class="btn sm" onclick="WTPages.openAllocationModal(${b.id})">Allocate</button></td></tr>`;
      }).join('') || emptyRow(8, 'No budgets');
      const allocationMap = new Map();
      for (const b of budgets || []) for (const a of b.allocations || []) allocationMap.set(a.costCenterId, (allocationMap.get(a.costCenterId) || 0) + Number(a.allocatedAmount || 0));
      $('#ccBody').innerHTML = (ccs || []).map(c => {
        const rollup = ragByCenter.get(c.id) || {};
        const allocated = allocationMap.get(c.id) || 0;
        const status = rollup.ragStatus || 'Green';
        return `<tr><td>${esc(c.name)}${c.projectId && c.projectId !== Number(pid) ? ' <span class="badge">Sub-project</span>' : ''}</td>
          <td>${esc(budgets?.[0]?.currency || 'INR')} ${Number(rollup.budget ?? allocated).toLocaleString('en-IN')}</td>
          <td>${esc(budgets?.[0]?.currency || 'INR')} ${Number(rollup.currentCommitment ?? rollup.purchaseCost ?? 0).toLocaleString('en-IN')}</td>
          <td>${esc(budgets?.[0]?.currency || 'INR')} ${Number(rollup.actualSpend || 0).toLocaleString('en-IN')}</td>
          <td>${esc(budgets?.[0]?.currency || 'INR')} ${Number(rollup.forecast ?? rollup.spent ?? 0).toLocaleString('en-IN')}</td>
          <td>${esc(budgets?.[0]?.currency || 'INR')} ${Number(rollup.variance ?? allocated).toLocaleString('en-IN')}</td>
          <td><span class="badge ${rollup.budgetStatus === 'Over Budget' ? 'red' : rollup.budgetStatus === 'Under Budget' ? 'green' : 'gray'}">${esc(rollup.budgetStatus || 'On Budget')}</span></td>
          <td><span class="badge ${status === 'Red' ? 'red' : status === 'Amber' ? 'amber' : 'green'}">${esc(status)}</span></td></tr>`;
      }).join('') || emptyRow(8, 'No cost centers. Add sub-projects to use them as cost centers.');
    } catch (e) {
      $('#budgetBody').innerHTML = errRow(8, e);
      $('#ccBody').innerHTML = errRow(8, e);
      showToast(e.message, 'danger');
    }
  }

  async function openBudgetModal() {
    const pid = await selectedProjectId();
    openModal('Create Budget', `
      <form onsubmit="WTPages.saveBudget(event)">
        <input type="hidden" id="bProj" value="${pid}">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="bName" required></div>
          <div class="field"><label>Approved Amount *</label><input id="bAmt" type="number" step="0.01" required></div>
          <div class="field"><label>Currency</label><input id="bCur" value="INR"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveBudget(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createBudget({
        projectId: Number($('#bProj').value),
        name: $('#bName').value.trim(),
        approvedAmount: Number($('#bAmt').value),
        currency: $('#bCur').value.trim() || 'INR'
      });
      closeModal(); showToast('Budget created'); await pageBudget();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function reviseBudget(id) {
    await openBudgetRevision(id);
  }

  async function openBudgetRevision(id) {
    const pid = await selectedProjectId();
    try {
      const budgets = await WisetrackAPI.getBudgets(pid);
      const budget = (budgets || []).find(b => b.id === id);
      if (!budget) throw new Error('Budget not found');
      openModal('Revise Approved Budget', `<form onsubmit="WTPages.saveBudgetRevision(event)">
        <input type="hidden" id="revisionBudgetId" value="${id}">
        <p class="card-subtitle">Current approved amount: ${esc(budget.currency || 'INR')} ${Number(budget.approvedAmount || 0).toLocaleString('en-IN')}</p>
        <div class="field"><label>Revised Budget *</label><input id="revisionAmount" type="number" min="0.01" step="0.01" value="${Number(budget.approvedAmount || 0)}" required></div>
        <div class="field"><label>Revision Reason *</label><textarea id="revisionReason" rows="3" maxlength="2000" required></textarea></div>
        <p class="card-subtitle">Approver will be recorded as the signed-in user authorized to revise this budget.</p>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Approve Revision</button></div></form>`);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function saveBudgetRevision(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.reviseBudget(Number($('#revisionBudgetId').value), {
        totalAmount: Number($('#revisionAmount').value), remarks: $('#revisionReason').value.trim()
      });
      closeModal(); showToast('Approved budget revision saved'); await pageBudget();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openBudgetHistory(id) {
    const pid = await selectedProjectId();
    try {
      const budgets = await WisetrackAPI.getBudgets(pid);
      const budget = (budgets || []).find(b => b.id === id);
      if (!budget) throw new Error('Budget not found');
      const versions = [...(budget.versions || [])].sort((a, z) => Number(a.versionNo) - Number(z.versionNo));
      const latestNo = versions.reduce((n, v) => Math.max(n, Number(v.versionNo || 0)), 0);
      const rows = versions.map((v, index) => {
        const previous = index > 0 ? `${esc(versions[index - 1].currency || budget.currency || 'INR')} ${Number(versions[index - 1].totalAmount || 0).toLocaleString('en-IN')}` : '—';
        const isCurrent = Number(v.versionNo) === latestNo;
        return `<tr><td>v${v.versionNo}${isCurrent ? ' <span class="badge green">Current approved</span>' : ''}</td>
          <td>${previous}</td><td>${esc(v.currency || budget.currency || 'INR')} ${Number(v.totalAmount || 0).toLocaleString('en-IN')}</td>
          <td>${esc(v.remarks || '—')}</td><td>${esc(v.createdAt ? new Date(v.createdAt).toLocaleString() : '—')}</td>
          <td>${esc(v.approverName || (v.approverId ? `User #${v.approverId}` : '—'))}</td></tr>`;
      }).join('');
      openModal(`Budget History · ${esc(budget.name)}`, `<div class="card-subtitle" style="margin-bottom:12px">Current approved version: v${latestNo || '—'} · ${esc(budget.currency || 'INR')} ${Number(budget.approvedAmount || 0).toLocaleString('en-IN')}</div>
        <div class="table-wrap"><table><thead><tr><th>Version</th><th>Previous Budget</th><th>Revised Budget</th><th>Revision Reason</th><th>Revision Date</th><th>Approver</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No version history found.</td></tr>'}</tbody></table></div>`);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function openAllocationModal(budgetId) {
    const pid = await selectedProjectId();
    try {
      const [budgets, centers] = await Promise.all([WisetrackAPI.getBudgets(pid), WisetrackAPI.getCostCenters(pid)]);
      const budget = (budgets || []).find(b => b.id === budgetId);
      if (!budget) throw new Error('Budget not found');
      const allocated = (budget.allocations || []).reduce((n, a) => n + Number(a.allocatedAmount || 0), 0);
      const options = (centers || []).map(c => `<option value="${c.id}">${esc(c.name)}${c.projectId !== Number(pid) ? ' (Sub-project cost center)' : ''}</option>`).join('');
      openModal('Allocate Budget to Cost Center', `<form onsubmit="WTPages.saveAllocation(event)">
        <input type="hidden" id="allocBudgetId" value="${budgetId}">
        <p class="card-subtitle">${esc(budget.name)} · Approved ${esc(budget.currency || 'INR')} ${Number(budget.approvedAmount || 0).toLocaleString('en-IN')} · Remaining ${esc(budget.currency || 'INR')} ${(Number(budget.approvedAmount || 0) - allocated).toLocaleString('en-IN')}</p>
        <div class="field"><label>Cost Center *</label><select id="allocCenter" required>${options}</select></div>
        <div class="field"><label>Amount *</label><input id="allocAmount" type="number" min="0.01" step="0.01" max="${Math.max(0, Number(budget.approvedAmount || 0) - allocated)}" required></div>
        <div class="field"><label>Remarks</label><input id="allocRemarks"></div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Allocate</button></div></form>`);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function saveAllocation(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.allocateBudget({ budgetId: Number($('#allocBudgetId').value), costCenterId: Number($('#allocCenter').value), allocatedAmount: Number($('#allocAmount').value), remarks: $('#allocRemarks').value.trim() || null });
      closeModal(); showToast('Budget allocated'); await pageBudget();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openCostCenterModal() {
    const pid = await selectedProjectId();
    openModal('Cost Center', `
      <form onsubmit="WTPages.saveCC(event)">
        <input type="hidden" id="ccProj" value="${pid}">
        <div class="form-grid">
          <div class="field"><label>Name *</label><input id="ccName" required></div>
        </div>
        <p class="card-subtitle" style="margin:8px 0 0">Code auto-assigns (CC-001).</p>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveCC(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createCostCenter({ projectId: Number($('#ccProj').value), name: $('#ccName').value.trim() });
      closeModal(); showToast('Created'); await pageBudget();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deleteCC(id) {
    try { await WisetrackAPI.deleteCostCenter(id); await pageBudget(); } catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- COSTS ----------
  let pendingCostImportRows = [];

  async function openCostImportModal() {
    const projectId = await selectedProjectId();
    if (!projectId) { showToast('Select a project first.', 'danger'); return; }
    openModal('Import Purchase / Actual Cost CSV', `
      <form onsubmit="WTPages.saveCostImport(event)">
        <div class="form-grid">
          <div class="field"><label>Entry type *</label><select id="ciType"><option>Purchase</option><option>Actual</option></select></div>
          <div class="field"><label>CSV file *</label><input id="ciFile" type="file" accept=".csv,.tsv,.txt" required onchange="WTPages.previewCostImport(this)"></div>
          <div class="field full"><small>Required column: Amount. Optional: CostDate (YYYY-MM-DD), CostCenterId, BoqItemId, Vendor, Description. Leave both IDs empty for project-level costs.</small></div>
        </div>
        <button class="btn sm" type="button" onclick="wtDownloadText('wisetrack-cost-import-template.csv','Amount,CostDate,CostCenterId,BoqItemId,Vendor,Description\\n','text/csv;charset=utf-8')">Download CSV template</button>
        <div id="ciPreview" style="margin-top:12px;color:var(--text-muted)">Choose a file to preview rows.</div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Import rows</button></div>
      </form>`);
  }

  async function previewCostImport(input) {
    pendingCostImportRows = [];
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = wtParseFlexibleTable(await file.text());
      pendingCostImportRows = parsed.map((r, index) => {
        const amountText = wtPick(r, ['Amount', 'Cost Amount', 'Total']);
        const dateText = wtPick(r, ['CostDate', 'PurchaseDate', 'Date']);
        const centerText = wtPick(r, ['CostCenterId', 'Cost Center ID']);
        const boqText = wtPick(r, ['BoqItemId', 'BOQ Item ID', 'BOQ Line ID']);
        const amount = Number(String(amountText).replace(/[,₹$ ]/g, ''));
        const costCenterId = centerText ? Number(centerText) : null;
        const boqItemId = boqText ? Number(boqText) : null;
        const parsedDate = dateText ? new Date(`${dateText}T00:00:00Z`) : null;
        const validDate = !dateText || (/^\d{4}-\d{2}-\d{2}$/.test(dateText)
          && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === dateText);
        const errors = [];
        if (!Number.isFinite(amount) || amount <= 0) errors.push('Amount must be greater than zero');
        if (centerText && (!Number.isInteger(costCenterId) || costCenterId <= 0)) errors.push('Invalid CostCenterId');
        if (boqText && (!Number.isInteger(boqItemId) || boqItemId <= 0)) errors.push('Invalid BoqItemId');
        if (!validDate) errors.push('CostDate must use YYYY-MM-DD');
        return {
          rowNo: index + 2, amount, costDate: dateText || null, costCenterId, boqItemId,
          vendor: wtPick(r, ['Vendor', 'Supplier']) || null,
          description: wtPick(r, ['Description', 'Remarks', 'Reference']) || null,
          errors
        };
      });
      const invalid = pendingCostImportRows.filter(r => r.errors.length).length;
      $('#ciPreview').innerHTML = `<b>${pendingCostImportRows.length} rows found</b> · ${invalid} need correction` +
        (pendingCostImportRows.length ? `<div style="max-height:160px;overflow:auto;margin-top:8px">${pendingCostImportRows.slice(0, 20).map(r => `<div>Row ${r.rowNo}: ${r.errors.length ? `<span style="color:#dc2626">${esc(r.errors.join('; '))}</span>` : 'Ready'}</div>`).join('')}</div>` : '');
    } catch (err) {
      $('#ciPreview').innerHTML = `<span style="color:#dc2626">${esc(err.message)}</span>`;
    }
  }

  async function saveCostImport(e) {
    e.preventDefault();
    if (!pendingCostImportRows.length) { showToast('Choose a CSV file with cost rows.', 'danger'); return; }
    const invalid = pendingCostImportRows.filter(r => r.errors.length);
    if (invalid.length) { showToast(`Fix invalid CSV rows first (${invalid.length}).`, 'danger'); return; }
    const projectId = await selectedProjectId();
    try {
      const result = await WisetrackAPI.importCosts({
        projectId: Number(projectId), type: $('#ciType').value,
        rows: pendingCostImportRows.map(({ rowNo, errors, ...row }) => row)
      });
      pendingCostImportRows = [];
      closeModal();
      if (result.errors?.length) {
        openModal('Cost import results', `<p><b>${result.imported} imported</b>, ${result.skipped} skipped.</p><ul>${result.errors.map(error => `<li>${esc(error)}</li>`).join('')}</ul>`);
      } else showToast(`Imported ${result.imported} row(s).`, 'success');
      await pageCosts();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function pageCosts() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Purchases, Actuals & Variance', '/api/costs', picker +
      ` <button class="btn" onclick="WTPages.openCostImportModal()">Import CSV Template</button>
        <button class="btn" onclick="WTPages.openPurchaseModal()">+ Purchase</button>
        <button class="btn primary" onclick="WTPages.openActualModal()">+ Actual</button>`)
      + `<div class="card" id="varianceBox">Variance loading...</div>`
      + tableWrap(['Cost Center', 'Budget', 'Purchase / Commitment', 'Actual Spend', 'Forecast', 'Variance vs Actual', 'Budget Status', 'RAG (Forecast)'], 'costCenterFinanceBody')
      + tableWrap(['ID', 'Type', 'Capture Level', 'Amount', 'Date', 'Notes'], 'costsBody');
    if (!pid) {
      $('#varianceBox').innerHTML = 'No project available.';
      $('#costCenterFinanceBody').innerHTML = emptyRow(8, 'No project available.');
      $('#costsBody').innerHTML = emptyRow(6, 'No project available.');
      return;
    }
    try {
      const [purchases, actuals, variance] = await Promise.all([
        WisetrackAPI.getPurchases(pid), WisetrackAPI.getActuals(pid), WisetrackAPI.getVariance(pid)
      ]);
      const explanations = await WisetrackAPI.getVarianceExplanations(pid).catch(() => []);
      const currency = esc(variance.currency || 'INR');
      const money = amount => `${currency} ${Number(amount || 0).toLocaleString('en-IN')}`;
      $('#varianceBox').innerHTML = `
        <div class="grid g4">
          <div><div class="kpi-label">Budget</div><strong>${money(variance.budget ?? variance.approvedBudget)}</strong></div>
          <div><div class="kpi-label">Current Commitment / Purchase Cost</div><strong>${money(variance.currentCommitment ?? variance.purchaseTotal)}</strong></div>
          <div><div class="kpi-label">Actual Spend</div><strong>${money(variance.actualSpend ?? variance.actualTotal)}</strong></div>
          <div><div class="kpi-label">Forecast</div><strong>${money(variance.forecastTotal)}</strong></div>
          <div><div class="kpi-label">Variance (Budget - Actual)</div><strong>${money(variance.varianceAmount)}</strong></div>
          <div><div class="kpi-label">Budget Status</div><span class="badge ${variance.budgetStatus === 'Over Budget' ? 'red' : variance.budgetStatus === 'Under Budget' ? 'green' : 'gray'}">${esc(variance.budgetStatus || 'On Budget')}</span></div>
          <div><div class="kpi-label">Forecast Variance (incl. commitment)</div><strong>${money(variance.forecastVarianceAmount)}</strong></div>
          <div><div class="kpi-label">RAG</div><span class="badge ${variance.ragStatus === 'Red' ? 'red' : variance.ragStatus === 'Amber' ? 'amber' : 'green'}">${esc(variance.ragStatus)}</span></div>
        </div>
        <p class="card-subtitle" style="margin:10px 0 0">Forecast is calculated from recorded Actual Spend + Purchase/Commitment costs; no separate forecast input is currently captured.</p>
        <div style="margin-top:14px;border-top:1px solid var(--border-color);padding-top:12px;">
          <strong>Variance explanations (PM-24)</strong>
          <div id="varExplainList" style="margin:8px 0;font-size:13px;">${(explanations || []).length
            ? explanations.map(v => `<p style="margin:4px 0;"><b>${esc(v.varianceType || v.VarianceType)}</b> — ${esc(v.explanation || v.Explanation)}</p>`).join('')
            : '<p style="color:var(--text-muted);margin:4px 0;">No explanations yet. Record why cost or schedule moved.</p>'}</div>
          <div class="form-grid">
            <div class="field"><label>Type</label><select id="varType"><option>Cost</option><option>Schedule</option></select></div>
            <div class="field full"><label>Explanation *</label><textarea id="varText" rows="2" placeholder="e.g. MEP CC exceeded 80% after ducting redesign"></textarea></div>
          </div>
          <button class="btn sm primary" style="margin-top:8px" onclick="WTPages.saveVarianceExplanation()">Save explanation</button>
        </div>`;
      $('#costCenterFinanceBody').innerHTML = (variance.costCenters || []).length ? variance.costCenters.map(c => {
        const status = c.ragStatus || 'Green';
        return `<tr><td>${esc(c.name)}</td><td>${money(c.budget ?? c.allocated)}</td>
          <td>${money(c.currentCommitment ?? c.purchaseCost)}</td><td>${money(c.actualSpend)}</td>
          <td>${money(c.forecast ?? c.spent)}</td><td>${money(c.variance)}</td>
          <td><span class="badge ${c.budgetStatus === 'Over Budget' ? 'red' : c.budgetStatus === 'Under Budget' ? 'green' : 'gray'}">${esc(c.budgetStatus || 'On Budget')}</span></td>
          <td><span class="badge ${status === 'Red' ? 'red' : status === 'Amber' ? 'amber' : 'green'}">${esc(status)}</span></td></tr>`;
      }).join('') : emptyRow(8, 'No Cost Center financial data.');
      const rows = [
        ...(purchases || []).map(x => ({ ...x, _t: 'Purchase' })),
        ...(actuals || []).map(x => ({ ...x, _t: 'Actual' }))
      ];
      $('#costsBody').innerHTML = rows.length ? rows.map(r => `
        <tr><td>${r.id}</td><td>${r._t}</td><td>${r.boqItemId && r.costCenterId ? `BOQ #${r.boqItemId} · CC #${r.costCenterId}` : r.costCenterId ? `Cost Center #${r.costCenterId}` : r.boqItemId ? `BOQ Line #${r.boqItemId}` : 'Project'}</td><td>${money(r.amount || r.totalAmount || 0)}</td>
        <td>${esc(r.costDate || r.purchaseDate || r.createdAt || '—')}</td><td>${esc(r.remarks || r.description || r.notes || '—')}</td></tr>`
      ).join('') : emptyRow(6, 'No cost entries');
    } catch (e) { showToast(e.message, 'danger'); }
  }
  async function saveVarianceExplanation() {
    const pid = await selectedProjectId();
    const explanation = ($('#varText')?.value || '').trim();
    if (!pid || !explanation) { showToast('Enter an explanation', 'danger'); return; }
    try {
      await WisetrackAPI.addVarianceExplanation({
        projectId: Number(pid),
        varianceType: $('#varType')?.value || 'Cost',
        explanation
      });
      showToast('Variance explanation saved');
      await pageCosts();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function openPurchaseModal() {
    const pid = await selectedProjectId();
    const [centers, boqs] = await Promise.all([
      WisetrackAPI.getCostCenters(pid).catch(() => []), WisetrackAPI.getBoqs(pid).catch(() => [])
    ]);
    const ccOptions = (centers || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    const boqLines = (boqs || []).flatMap(b => {
      const versions = b.versions || [];
      const version = versions.find(v => v.isCurrentBaseline) || [...versions].sort((a, z) => (z.versionNo || 0) - (a.versionNo || 0))[0];
      return (version?.items || []).map(i => ({ ...i, boqTitle: b.title }));
    });
    const lineOptions = boqLines.map(i => `<option value="${i.id}">${esc(i.boqTitle)} · ${esc(i.lineNo || '')} ${esc(i.itemCode || i.description || i.itemName || 'BOQ line')}</option>`).join('');
    openModal('Add Purchase', `
      <form onsubmit="WTPages.savePurchase(event)">
        <input type="hidden" id="pProj" value="${pid}">
        <div class="form-grid">
          <div class="field"><label>Amount *</label><input id="pAmt" type="number" min="0.01" step="0.01" required></div>
          <div class="field"><label>Date</label><input id="pDate" type="date"></div>
          <div class="field full"><label>BOQ Line (optional)</label><select id="pBoq"><option value="">Project-level purchase</option>${lineOptions}</select></div>
          <div class="field full"><label>Cost Center</label><select id="pCC"><option value="">-- None --</option>${ccOptions}</select></div>
          <div class="field"><label>Vendor</label><input id="pVendor"></div>
          <div class="field"><label>Description / Reference</label><input id="pRem"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function savePurchase(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.addPurchase({
        projectId: Number($('#pProj').value),
        boqItemId: Number($('#pBoq').value) || null,
        amount: Number($('#pAmt').value),
        purchaseDate: $('#pDate').value || null,
        costCenterId: Number($('#pCC').value) || null,
        vendor: $('#pVendor').value.trim() || null,
        description: $('#pRem').value.trim()
      });
      closeModal(); showToast('Purchase saved'); await pageCosts();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openActualModal() {
    const pid = await selectedProjectId();
    const [centers, boqs] = await Promise.all([
      WisetrackAPI.getCostCenters(pid).catch(() => []), WisetrackAPI.getBoqs(pid).catch(() => [])
    ]);
    const ccOptions = (centers || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    const boqLines = (boqs || []).flatMap(b => {
      const versions = b.versions || [];
      const version = versions.find(v => v.isCurrentBaseline) || [...versions].sort((a, z) => (z.versionNo || 0) - (a.versionNo || 0))[0];
      return (version?.items || []).map(i => ({ ...i, boqTitle: b.title }));
    });
    const lineOptions = boqLines.map(i => `<option value="${i.id}">${esc(i.boqTitle)} · ${esc(i.lineNo || '')} ${esc(i.itemCode || i.description || i.itemName || 'BOQ line')}</option>`).join('');
    openModal('Add Actual Cost', `
      <form onsubmit="WTPages.saveActual(event)">
        <input type="hidden" id="aProj" value="${pid}">
        <div class="form-grid">
          <div class="field"><label>Amount *</label><input id="aAmt" type="number" min="0.01" step="0.01" required></div>
          <div class="field"><label>Date</label><input id="aDate" type="date"></div>
          <div class="field full"><label>BOQ Line (optional)</label><select id="aBoq"><option value="">Project-level actual</option>${lineOptions}</select></div>
          <div class="field full"><label>Cost Center</label><select id="aCC"><option value="">-- None --</option>${ccOptions}</select></div>
          <div class="field full"><label>Remarks</label><input id="aRem"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveActual(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.addActual({
        projectId: Number($('#aProj').value),
        boqItemId: Number($('#aBoq').value) || null,
        amount: Number($('#aAmt').value),
        costDate: $('#aDate').value || null,
        costCenterId: Number($('#aCC').value) || null,
        description: $('#aRem').value.trim()
      });
      closeModal(); showToast('Actual saved'); await pageCosts();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- BOQ ----------
  async function pageBoq() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Bill of Quantities', '/api/boq', picker +
      ` <button class="btn" onclick="WTPages.boqFromMaster()">From Master Items</button>
        <button class="btn primary" onclick="WTPages.boqImport()">Import vendor file (CSV)</button>`)
      + tableWrap(['ID', 'Title', 'Status', 'Latest / Current Baseline', 'Actions'], 'boqBody');
    if (!pid) {
      $('#boqBody').innerHTML = emptyRow(5, 'No project available.');
      return;
    }
    try {
      const scopeIds = await projectScopeIds(pid);
      const batches = await Promise.all(scopeIds.map(id => WisetrackAPI.getBoqs(id).catch(() => [])));
      const list = batches.flat();
      $('#boqBody').innerHTML = list.length ? list.map(b => `
        <tr><td>${b.id}</td><td>${esc(b.title || b.name || 'BOQ')}</td><td>${esc(b.status || '—')}</td>
        <td>${(() => { const vs = b.versions || b.Versions || []; const latest = Math.max(0, ...vs.map(v => Number(v.versionNo || v.VersionNo || 0))); const base = vs.find(v => v.isCurrentBaseline || v.IsCurrentBaseline); return `v${latest || '—'} / Baseline v${base?.versionNo || base?.VersionNo || '—'}`; })()}</td>
        <td><button class="btn sm" onclick="WTPages.viewBoq(${b.id})">View</button></td></tr>`
      ).join('') : emptyRow(5, 'No BOQ — import or create from master');
    } catch (e) { $('#boqBody').innerHTML = errRow(5, e); }
  }

  async function boqFromMaster() {
    const pid = await selectedProjectId();
    const items = (await WisetrackAPI.getItems()).filter(i => i.isActive !== false);
    if (!items.length) { showToast('Create reusable items in Item Master first', 'danger'); return; }
    openModal('Reuse Item Master items', `
      <form onsubmit="WTPages.saveBoqFromMaster(event)">
        <input type="hidden" id="boqMasterProject" value="${pid}">
        <div class="field"><label>Search reusable items</label><input id="boqMasterSearch" oninput="WTPages.filterBoqMasterItems()" placeholder="Code, item, brand, unit"></div>
        <div id="boqMasterItems" style="max-height:48vh;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px">
          ${items.map(i => `<div class="boq-master-option" data-search="${esc([i.itemCode, i.name, i.description, i.brand?.name, i.unit?.name].filter(Boolean).join(' ').toLowerCase())}" style="padding:10px;border-bottom:1px solid var(--border-light)">
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
              <input type="checkbox" class="boq-master-checkbox" value="${i.id}" onchange="WTPages.toggleBoqMasterLine(this)">
              <span style="flex:1"><strong>${esc(i.name)}</strong><small style="display:block;color:var(--text-muted)">${esc(i.itemCode)} · ${esc(i.unit?.name || 'No unit')} · ${esc(i.brand?.name || 'No brand')}</small></span>
              ${i.imageUrl ? `<a href="${esc(i.imageUrl)}" target="_blank" rel="noopener">Image</a>` : ''}
            </div>
            <div class="form-grid boq-master-fields" style="display:none;grid-template-columns:repeat(auto-fit,minmax(135px,1fr))">
              <div class="field"><label>Quantity (${esc(i.unit?.name || 'Unit')})</label><input class="boq-master-qty" type="number" min="0.0001" step="0.0001" value="1" oninput="WTPages.calcBoqMasterTotal(this)"></div>
              <div class="field"><label>Purchase Price</label><input class="boq-master-price" type="number" min="0" step="0.01" value="${Number(i.unitPrice ?? 0)}" oninput="WTPages.calcBoqMasterTotal(this)"></div>
              <div class="field"><label>Total</label><output class="boq-master-total">₹${Number(i.unitPrice ?? 0).toLocaleString('en-IN')}</output></div>
              <div class="field"><label>Description</label><input class="boq-master-description" value="${esc(i.description || i.name)}"></div>
              <div class="field"><label>Remark</label><input class="boq-master-remark" placeholder="Project-specific remark"></div>
              <div class="field"><label>Attachment (any file)</label><input class="boq-master-attachment" type="file" onchange="this.dataset.uploadedPath='';this.dataset.uploadedName=''"></div>
            </div>
          </div>`).join('')}
        </div>
        <p class="card-subtitle">Choose each item, then set project-specific quantity, purchase price, description, remark, and any file attachment. Total is calculated automatically. Item Master records remain reusable.</p>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Add selected items</button></div>
      </form>`);
  }

  function filterBoqMasterItems() {
    const query = ($('#boqMasterSearch')?.value || '').trim().toLowerCase();
    document.querySelectorAll('.boq-master-option').forEach(row => {
      row.style.display = (row.dataset.search || '').includes(query) ? 'block' : 'none';
    });
  }

  function toggleBoqMasterLine(checkbox) {
    const fields = checkbox.closest('.boq-master-option')?.querySelector('.boq-master-fields');
    if (fields) fields.style.display = checkbox.checked ? 'grid' : 'none';
  }

  function calcBoqMasterTotal(input) {
    const row = input.closest('.boq-master-option');
    if (!row) return;
    const quantity = Number(row.querySelector('.boq-master-qty')?.value || 0);
    const price = Number(row.querySelector('.boq-master-price')?.value || 0);
    row.querySelector('.boq-master-total').textContent = `₹${(quantity * price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  async function saveBoqFromMaster(e) {
    e.preventDefault();
    const pid = Number($('#boqMasterProject').value);
    const selected = [...document.querySelectorAll('.boq-master-checkbox:checked')];
    if (!selected.length) { showToast('Select at least one item to reuse.', 'danger'); return; }
    try {
      const lines = [];
      for (const checkbox of selected) {
        const row = checkbox.closest('.boq-master-option');
        const fileInput = row.querySelector('.boq-master-attachment');
        const file = fileInput.files[0];
        if (file && !fileInput.dataset.uploadedPath) {
          const uploadedFile = await WisetrackAPI.uploadBoqAttachment(pid, file);
          fileInput.dataset.uploadedPath = uploadedFile.path;
          fileInput.dataset.uploadedName = uploadedFile.fileName;
        }
        lines.push({
          itemId: Number(checkbox.value),
          quantity: Number(row.querySelector('.boq-master-qty').value),
          unitPrice: Number(row.querySelector('.boq-master-price').value),
          description: row.querySelector('.boq-master-description').value.trim(),
          remarks: row.querySelector('.boq-master-remark').value.trim() || null,
          attachmentPath: fileInput.dataset.uploadedPath || null,
          attachmentName: fileInput.dataset.uploadedName || null
        });
      }
      await WisetrackAPI.createBoqFromMaster(pid, lines);
      closeModal(); showToast(`${lines.length} item(s) added to project BOQ`); await pageBoq();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function downloadBoqAttachment(encodedPath, encodedName) {
    try {
      const blob = await WisetrackAPI.downloadBoqAttachment(decodeURIComponent(encodedPath));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = decodeURIComponent(encodedName) || 'boq-attachment';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function boqImport() {
    const pid = await selectedProjectId();
    openModal('Import BOQ (flexible vendor file)', `
      <form onsubmit="WTPages.saveBoqImport(event)">
        <input type="hidden" id="boqProj" value="${pid}">
        <div class="field"><label>Title *</label><input id="boqTitle" value="Imported BOQ" required></div>
        <div class="field"><label>Excel / CSV / TSV from 3rd party (flexible column names)</label>
          <input type="file" id="boqFile" accept=".xlsx,.csv,.txt,.tsv">
        </div>
        <div class="field"><label>Or paste rows</label>
          <textarea id="boqJson" rows="8" placeholder="Item Code,Description,Qty,Rate&#10;ITM-1,Cable tray,10,1500"></textarea>
        </div>
        <p style="font-size:12px;color:var(--text-muted)">Recognizes description/qty/rate aliases. Validation errors can be downloaded before commit.</p>
        <div class="modalfoot" style="padding:0;margin-top:12px">
          <button type="button" class="btn" onclick="WTPages.saveBoqImport(event, false)">Validate only</button>
          <button class="btn primary" type="submit">Validate &amp; Import</button>
        </div>
      </form>`);
  }

  async function saveBoqImport(e, commitFlag) {
    e.preventDefault();
    try {
      const file = $('#boqFile')?.files?.[0];
      const commit = commitFlag !== false;
      let result;
      if (file) {
        const form = new FormData();
        form.append('projectId', $('#boqProj').value);
        form.append('title', $('#boqTitle').value.trim());
        form.append('commit', String(commit));
        form.append('file', file);
        result = await WisetrackAPI.importBoqFile(form);
      } else {
        let text = ($('#boqJson').value || '').trim();
        let lines;
        if (text.startsWith('[')) {
          lines = JSON.parse(text);
        } else {
        const rows = typeof wtParseFlexibleTable === 'function' ? wtParseFlexibleTable(text) : [];
        lines = rows.map((r, i) => ({
          itemCode: (typeof wtPick === 'function' ? wtPick(r, ['itemcode', 'code', 'item', 'sku']) : r.itemcode) || null,
          description: (typeof wtPick === 'function' ? wtPick(r, ['description', 'desc', 'particulars', 'name', 'itemdescription']) : r.description) || '',
          quantity: Number((typeof wtPick === 'function' ? wtPick(r, ['quantity', 'qty', 'qnty', 'nos']) : r.quantity) || 0),
          unitPrice: Number((typeof wtPick === 'function' ? wtPick(r, ['unitprice', 'price', 'rate', 'unitrate', 'purchaseprice']) : r.unitprice) || 0),
          unit: (typeof wtPick === 'function' ? wtPick(r, ['unit', 'uom']) : r.unit) || null,
          brand: (typeof wtPick === 'function' ? wtPick(r, ['brand', 'make']) : r.brand) || null,
          remarks: (typeof wtPick === 'function' ? wtPick(r, ['remarks', 'remark', 'notes']) : r.remarks) || null,
          lineNo: i + 1
        }));
        }
        result = await WisetrackAPI.importBoq({
          projectId: Number($('#boqProj').value),
          title: $('#boqTitle').value.trim(),
          commit,
          lines
        });
      }
      if (!result.isValid && (result.errors || []).length) {
        const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = '\uFEFFRow,Field,Message\n' + result.errors.map(er =>
          [er.row ?? er.Row, er.field ?? er.Field, er.message ?? er.Message].map(csvCell).join(',')).join('\n');
        if (typeof wtDownloadText === 'function') wtDownloadText('boq-validation-errors.csv', csv);
        showToast(`${result.errorCount || result.errors.length} validation errors — report downloaded`, 'danger');
        return;
      }
      if (!commit) {
        showToast('Validation passed. Click Import to commit.');
        return;
      }
      closeModal(); showToast('Imported'); await pageBoq();
    } catch (err) {
      if ($('#boqFile')?.files?.[0]) {
        const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const report = '\uFEFFRow,Field,Message\n' + [0, 'Columns', err.message || 'File could not be read.'].map(csvCell).join(',');
        if (typeof wtDownloadText === 'function') wtDownloadText('boq-validation-errors.csv', report);
        showToast(`${err.message || 'File validation failed.'} Error report downloaded; correct the source file and import again.`, 'danger');
      } else showToast(err.message, 'danger');
    }
  }

  async function viewBoq(id) {
    try {
      const b = await WisetrackAPI.getBoq(id);
      const versions = b.versions || b.Versions || [];
      const latest = versions.slice().sort((a, c) => (c.versionNo || c.VersionNo || 0) - (a.versionNo || a.VersionNo || 0))[0];
      const currentBaseline = versions.find(v => v.isCurrentBaseline || v.IsCurrentBaseline);
      const items = latest?.items || latest?.Items || b.items || b.Items || [];
      const latestVersionId = latest?.id || latest?.Id;
      const latestIsBaseline = latest?.isCurrentBaseline || latest?.IsCurrentBaseline;
      openModal(`BOQ — ${esc(b.title || b.name || '#' + id)}`, `
        <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="badge blue">${esc(b.status || 'Draft')}</span>
          <span class="badge gray">Latest: Version ${latest?.versionNo || latest?.VersionNo || versions.length || 1}</span>
          <span class="badge green">Current Baseline: Version ${currentBaseline?.versionNo || currentBaseline?.VersionNo || '—'}</span>
          ${latest?.remarks || latest?.Remarks ? `<small style="color:var(--text-muted)">${esc(latest.remarks || latest.Remarks)}</small>` : ''}
        </div>
        <div class="card" style="padding:12px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
            <strong>Version history</strong>
            <button class="btn primary sm" onclick="WTPages.createBoqRevision(${id})">Create revision from latest</button>
          </div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Version</th><th>Created</th><th>Revision Notes</th><th>Baseline</th><th>Action</th></tr></thead><tbody>
            ${versions.slice().sort((a, c) => (a.versionNo || a.VersionNo || 0) - (c.versionNo || c.VersionNo || 0)).map(v => {
              const versionNo = v.versionNo || v.VersionNo;
              const isBaseline = v.isCurrentBaseline || v.IsCurrentBaseline;
              return `<tr><td>Version ${versionNo}</td><td>${esc((v.createdAt || v.CreatedAt || '').toString().slice(0, 10) || '—')}</td><td>${esc(v.remarks || v.Remarks || '—')}</td>
                <td>${isBaseline ? '<span class="badge green">Current Baseline</span>' : '—'}</td>
                <td>${isBaseline ? '—' : `<button class="btn sm" onclick="WTPages.setBoqBaseline(${id},${v.id || v.Id})">Set as baseline</button>`}</td></tr>`;
            }).join('') || '<tr><td colspan="5">No versions found.</td></tr>'}
          </tbody></table></div>
        </div>
        <p class="card-subtitle">Showing line items from latest version ${latest?.versionNo || latest?.VersionNo || 1}. Revisions are retained. ${latestIsBaseline ? 'Create a revision to make changes; baseline versions are locked.' : 'Edit this draft revision, then set it as the baseline when approved.'}</p>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>#</th><th>Item</th><th>Unit</th><th>Purchase Price</th><th>Quantity</th><th>Description</th><th>Image</th><th>Total</th><th>Brand</th><th>Remark</th><th>Attachment</th><th>Action</th></tr></thead>
          <tbody>
            ${items.length ? items.map(it => `
              <tr>
                <td>${it.lineNo ?? it.LineNo ?? it.id ?? '—'}</td>
                <td>${esc(it.itemName || it.ItemName || it.itemCode || it.ItemCode || it.item?.name || it.Item?.name || '—')}</td>
                <td>${esc(it.unit || it.Unit || it.item?.unit?.name || it.Item?.unit?.name || '—')}</td>
                <td>${latestIsBaseline ? `₹${Number(it.unitPrice ?? it.UnitPrice ?? 0).toLocaleString('en-IN')}` : `<input id="boqPrice-${it.id || it.Id}" type="number" min="0" step="0.01" value="${it.unitPrice ?? it.UnitPrice ?? 0}" style="width:110px">`}</td>
                <td>${latestIsBaseline ? (it.quantity ?? it.Quantity ?? 0) : `<input id="boqQty-${it.id || it.Id}" type="number" min="0.0001" step="0.0001" value="${it.quantity ?? it.Quantity ?? 0}" style="width:92px">`}</td>
                <td>${latestIsBaseline ? esc(it.description || it.Description || it.itemName || '—') : `<input id="boqDesc-${it.id || it.Id}" value="${esc(it.description || it.Description || '')}" style="min-width:150px">`}</td>
                <td>${(it.imageUrl || it.ImageUrl || it.item?.imageUrl || it.Item?.imageUrl) ? `<a href="${esc(it.imageUrl || it.ImageUrl || it.item?.imageUrl || it.Item?.imageUrl)}" target="_blank" rel="noopener">View</a>` : '—'}</td>
                <td><strong>₹${Number(it.amount ?? it.Amount ?? 0).toLocaleString('en-IN')}</strong></td>
                <td>${esc(it.brand || it.Brand || it.item?.brand?.name || it.Item?.brand?.name || '—')}</td>
                <td>${latestIsBaseline ? esc(it.remarks || it.Remarks || '—') : `<input id="boqRemark-${it.id || it.Id}" value="${esc(it.remarks || it.Remarks || '')}" style="min-width:120px">`}</td>
                <td>${(it.attachmentPath || it.AttachmentPath) ? `<button class="btn sm" onclick="WTPages.downloadBoqAttachment('${encodeURIComponent(it.attachmentPath || it.AttachmentPath)}','${encodeURIComponent(it.attachmentName || it.AttachmentName || 'boq-attachment')}')">${esc(it.attachmentName || it.AttachmentName || 'Download')}</button>` : '—'}</td>
                <td>${latestIsBaseline ? '—' : `<button class="btn sm primary" onclick="WTPages.saveBoqRevisionItem(${id},${latestVersionId},${it.id || it.Id})">Save</button>`}</td>
              </tr>`).join('') : `<tr><td colspan="12">No line items</td></tr>`}
          </tbody>
        </table></div>
      `);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function createBoqRevision(id) {
    const remarks = prompt('Revision notes (optional):', '');
    if (remarks === null) return;
    try {
      const version = await WisetrackAPI.createBoqRevision(id, remarks.trim() || null);
      showToast(`Version ${version.versionNo || version.VersionNo} created. Previous versions are retained.`);
      await viewBoq(id);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function saveBoqRevisionItem(boqId, versionId, itemId) {
    try {
      await WisetrackAPI.updateBoqRevisionItem(boqId, versionId, itemId, {
        quantity: Number($(`#boqQty-${itemId}`).value),
        unitPrice: Number($(`#boqPrice-${itemId}`).value),
        description: $(`#boqDesc-${itemId}`).value.trim(),
        remarks: $(`#boqRemark-${itemId}`).value.trim() || null
      });
      showToast('Revision line saved. Earlier versions remain unchanged.');
      await viewBoq(boqId);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function setBoqBaseline(id, versionId) {
    try {
      await WisetrackAPI.setBoqBaseline(id, versionId);
      showToast('Current project baseline updated.');
      await viewBoq(id);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- TASKS / MILESTONES / PLANNING / DSR ----------
  async function pageTasks(kind) {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    const title = kind === 'milestones' ? 'Milestones' : kind === 'daily' ? 'Daily Site Progress Report (DSR)' : 'Tasks & Planning';
    const selectedMeta = (await loadProjectsList()).find(p => String(p.id) === String(pid));
    const selectedLabel = selectedMeta
      ? `${selectedMeta.name || selectedMeta.title || 'Project'} (${selectedMeta.code || '#' + pid})`
      : (pid ? `Project #${pid}` : 'No project');

    el.innerHTML = pageHead(title, `Showing ${selectedLabel} only — other projects stay hidden`, picker +
      (kind === 'milestones'
        ? ` <button class="btn" onclick="WTPages.openMilestoneTemplateModal()">Templates / Excel import</button>
            <button class="btn" onclick="WTPages.planBackwardFromHandover()">Plan backward (PM-17)</button>
            <button class="btn primary" onclick="WTPages.openMilestoneModal()">+ Milestone</button>`
        : kind === 'daily'
        ? ` <button class="btn" onclick="openExcelDsrImportModal()"><i class="fa-solid fa-file-excel"></i> Upload Excel CSV</button>
            <input id="dailyReportDate" type="date" value="${new Date().toLocaleDateString('en-CA')}" style="max-width:150px">
            <select id="dailyReportMode" style="max-width:210px"><option value="daily">Updates on date</option><option value="cumulative">Progress as of date</option></select>
            <button class="btn" onclick="WTPages.loadDailyTaskReport(${pid})">Load report</button>
            <button class="btn" onclick="openReportExportModal('daily')">Export / PDF</button>
            <button class="btn primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Submit Daily Update</button>`
        : ` <button class="btn" onclick="WTPages.openCreateSubTaskModal()"><i class="fa-solid fa-plus"></i> Sub / Child</button>
            <button class="btn primary" onclick="WTPages.openTaskModal()">+ Task</button>
            <button class="btn" onclick="WTPages.openTaskUpdateModal()">+ Progress Update</button>`))
      + (kind === 'daily' ? `<div id="dailyVisualCharts" style="margin-bottom:16px;"></div>` : '')
      + (kind === 'daily' ? `<div class="card" style="margin-bottom:16px"><h3 class="card-title">Daily progress report</h3><div id="dailyReportContent">Loading report...</div></div>` : '')
      + tableWrap(kind === 'milestones'
        ? ['ID', 'Milestone & Project', 'Schedule', 'Status', 'Progress', 'Actions']
        : ['ID', 'Task', 'Sub-Task', 'Child Task', 'Other', 'Status', 'Progress', 'Actions'], 'tasksBody')
      + `<div class="card" id="excBox" style="margin-top:16px;"><h3 class="card-title">⚠️ Site Exception & Impediment Radar</h3><div id="excList">Loading...</div></div>`;
    
    const nestCols = 8;
    if (kind === 'planning') {
      el.querySelector('#tasksBody')?.closest('.table-wrap')?.classList.add('planning-table-wrap');
      el.querySelector('#tasksBody')?.closest('table')?.classList.add('planning-table');
    }
    if (!pid) {
      $('#tasksBody').innerHTML = emptyRow(kind === 'milestones' ? 6 : nestCols, 'No project available. Create / open a project first.');
      $('#excList').innerHTML = '<p style="color:var(--text-muted);font-size:12.5px;">Select a project to view exceptions.</p>';
      return;
    }
    try {
      const scopeIds = [Number(pid)];
      const projects = await loadProjectsList();
      const nameOf = (id) => {
        const p = projects.find(x => Number(x.id) === Number(id));
        return p ? (p.code || p.name || `#${id}`) : `#${id}`;
      };

      if (kind === 'milestones') {
        const batches = await Promise.all(scopeIds.map(id => WisetrackAPI.getMilestones(id).catch(() => [])));
        const ms = filterRowsForProject(
          batches.flatMap((rows, i) => (rows || []).map(m => ({ ...m, _projectId: scopeIds[i] }))),
          pid
        );
        const users = await WisetrackAPI.getUsers().catch(() => []);
        const milestoneFilesById = new Map(await Promise.all(ms.map(async milestone => [
          Number(milestone.id), await WisetrackAPI.getMilestoneFiles(milestone.id).catch(() => [])
        ])));
        const milestoneOwner = (id) => {
          const user = (users || []).find(u => Number(u.id) === Number(id));
          return user ? (user.fullName || user.name || user.email) : 'Unassigned';
        };
        $('#tasksBody').innerHTML = ms.length ? ms.map(m => {
          const pct = progressOf(m);
          const dependency = ms.find(x => Number(x.id) === Number(m.dependsOnMilestoneId || m.DependsOnMilestoneId));
          return `
          <tr>
            <td>${m.id}</td>
            <td><strong>${esc(m.name || m.title)}</strong><small style="display:block;color:var(--text-muted)">${esc(nameOf(m._projectId || pid))} · Owner: ${esc(milestoneOwner(m.ownerId || m.OwnerId))}</small><small style="display:block;color:var(--text-muted)">${esc(m.description || '')}</small>${dependency ? `<small style="display:block;color:var(--text-muted)">Depends on: ${esc(dependency.name)}</small>` : ''}${(m.completionEvidence || m.CompletionEvidence) ? `<small style="display:block;color:var(--text-muted)">Evidence: ${esc(m.completionEvidence || m.CompletionEvidence)}</small>` : ''}${(milestoneFilesById.get(Number(m.id)) || []).map(file => `<button class="btn sm" style="margin-top:4px" onclick="WTPages.downloadTaskEvidence(${Number(file.id)})"><i class="fa-solid fa-paperclip"></i> ${esc(file.fileName || 'Evidence')}</button>`).join(' ')}</td>
            <td>${esc(m.startDate || '—')} → ${esc(m.dueDate || '—')}</td>
            <td>${esc(m.status || '—')}</td>
          <td>${pct}%</td><td class="table-actions"><button class="btn sm" onclick="WTPages.openMilestoneModal(${m.id})"><i class="fa-solid fa-pen"></i> Edit</button></td>
          </tr>`;
        }).join('') : emptyRow(6, `No milestones for ${selectedLabel}. Other projects are hidden.`);
      } else {
        const batches = await Promise.all(scopeIds.map(id => WisetrackAPI.getTasks(id).catch(() => [])));
        const tasks = filterRowsForProject(
          batches.flatMap((rows, i) => (typeof wtAsArray === 'function' ? wtAsArray(rows) : (rows || [])).map(t => ({ ...t, _projectId: scopeIds[i] }))),
          pid
        );
        const taskFilesById = new Map(await Promise.all(tasks.map(async task => [
          Number(task.id), await WisetrackAPI.getTaskFiles(task.id).catch(() => [])
        ])));
        if (typeof wtApplyTaskDisplayCodes === 'function') wtApplyTaskDisplayCodes(tasks);
        const users = await WisetrackAPI.getUsers().catch(() => []);
        const userName = (id) => {
          if (!id) return 'Unassigned';
          const u = (users || []).find(x => Number(x.id) === Number(id));
          return u ? (u.fullName || u.name || u.email) : `#${id}`;
        };
        const userRole = (id) => {
          const u = (users || []).find(x => Number(x.id) === Number(id));
          return (u?.roles && u.roles[0]) || '';
        };
        let comp = 0, prog = 0, del = 0, crit = 0;

        const statusBadge = (status, pct) => {
          const s = String(status || '').toLowerCase();
          if (pct >= 100 || s.includes('complete')) return 'green';
          if (s.includes('delay')) return 'amber';
          if (s.includes('block') || s.includes('critical')) return 'red';
          return 'blue';
        };

        const formatStatus = (status) => {
          const raw = status || 'In Progress';
          return String(raw).replace(/([a-z])([A-Z])/g, '$1 $2');
        };
        
        const dash = '<span class="nest-empty">—</span>';
        const nestTitle = (s) => {
          const due = s.dueDate || s.DueDate;
          const dueLabel = due ? String(due).slice(0, 10) : 'No due date';
          return `<strong>${esc(s.title || s.name)}</strong>
            <small style="display:block;color:var(--text-muted)">Owner: ${esc(userName(s.assignedTo || s.AssignedTo))} · Due: ${esc(dueLabel)}</small>
            ${(s.remarks || s.Remarks) ? `<small style="display:block;color:var(--text-muted)">Latest remark: ${esc(s.remarks || s.Remarks)}</small>` : ''}`;
        };
        const progressCell = (row, pct) => `
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <div class="progress ${statusBadge(row.status, pct)}" style="width:60px;margin:0;"><i style="width:${pct}%"></i></div>
              <b>${pct}%</b>
            </div>
          </td>`;
        const nestCells = (depth, html) => {
          const sub = depth === 1 ? html : dash;
          const child = depth === 2 ? html : dash;
          const other = depth >= 3
            ? `<small style="display:block;color:var(--text-muted);font-weight:700;">L${depth}</small>${html}`
            : dash;
          return `<td class="nest-col depth-sub${depth === 1 ? ' is-filled' : ''}">${sub}</td>
            <td class="nest-col depth-child${depth === 2 ? ' is-filled' : ''}">${child}</td>
            <td class="nest-col depth-other${depth >= 3 ? ' is-filled' : ''}">${other}</td>`;
        };

        $('#tasksBody').innerHTML = tasks.length ? tasks.flatMap(t => {
          const pct = progressOf(t);
          const status = (t.status || 'In Progress').toLowerCase();
          if (pct >= 100 || status.includes('complete')) comp++;
          else if (status.includes('delay')) del++;
          else if (status.includes('block') || status.includes('critical')) crit++;
          else prog++;
          const walked = typeof wtWalkSubs === 'function' ? wtWalkSubs(t) : [];
          const owner = userName(t.assignedTo || t.AssignedTo);
          const ownerLabel = userRole(t.assignedTo || t.AssignedTo);
          const parentRow = `
            <tr class="task-row">
              <td><code>${esc(typeof wtTaskCode === 'function' ? wtTaskCode(t) : (t.displayCode || 'Task-' + t.id))}</code></td>
              <td class="nest-col depth-task is-filled">
                <strong>${esc(t.title || t.name)}</strong>
                <small style="display:block;color:var(--text-muted);">${esc(nameOf(t._projectId || pid))} · ${esc(t.description || 'General Package Task')}</small>
                <small style="display:block;color:var(--text-muted);">Owner: ${esc(owner)}${ownerLabel ? ' · ' + esc(ownerLabel) : ''}</small>
                <small style="display:block;color:var(--text-muted);">${esc(t.startDate || t.StartDate || 'No start date')} → ${esc(t.dueDate || t.DueDate || 'No due date')}</small>
                ${(t.remarks || t.Remarks) ? `<small style="display:block;color:var(--text-muted);">Latest remark: ${esc(t.remarks || t.Remarks)}</small>` : ''}
                ${(t.completionEvidence || t.CompletionEvidence) ? `<small style="display:block;color:var(--text-muted);">Evidence: ${esc(t.completionEvidence || t.CompletionEvidence)}</small>` : ''}
                ${(taskFilesById.get(Number(t.id)) || []).map(file => `<button class="btn sm" style="margin-top:4px" onclick="WTPages.downloadTaskEvidence(${Number(file.id)})"><i class="fa-solid fa-paperclip"></i> ${esc(file.fileName || 'Evidence')}</button>`).join(' ')}
                ${wtDepLineHtml(t)}
              </td>
              ${nestCells(0, dash)}
              <td><span class="badge ${wtRowBlocked(t) ? 'amber' : statusBadge(t.status, pct)}">${wtRowBlocked(t) ? 'Waiting' : esc(formatStatus(t.status))}</span></td>
              ${progressCell(t, pct)}
              <td class="table-actions">
                ${wtUpdateBtnHtml(t.id, null, t)}
                ${(kind === 'planning' || kind === 'daily') ? `<button class="btn sm icon-action" data-tooltip="View history" aria-label="View history" title="View history" onclick="WTPages.openTaskHistory(${t.id})"><i class="fa-solid fa-clock-rotate-left"></i></button>` : ''}
                ${kind === 'planning' && (t.canEdit || t.CanEdit) ? `<button class="btn sm icon-action" data-tooltip="Edit task" aria-label="Edit task" title="Edit task" onclick="WTPages.openTaskModal(${t.id})"><i class="fa-solid fa-pen"></i></button>` : ''}
                ${kind === 'planning' ? `<button class="btn sm primary icon-action" data-tooltip="Add sub-task" aria-label="Add sub-task" title="Add sub-task" onclick="WTPages.openCreateSubTaskModal(${t.id})"><i class="fa-solid fa-layer-group"></i></button>` : ''}
                ${kind === 'planning' ? wtDepBtnHtml('task', t.id, t) : ''}
                ${kind === 'planning' && (t.canDelete || t.CanDelete) ? `<button class="btn sm danger icon-action" data-tooltip="Delete task" aria-label="Delete task" title="Delete task" onclick="WTPages.deleteTask(${t.id}, '${esc(t.title || t.name)}')"><i class="fa-solid fa-trash"></i></button>` : ''}
              </td>
            </tr>`;
          const nestedRows = (kind === 'planning' || kind === 'daily') ? walked.map(({ node: s, depth, index }) => {
            const spct = progressOf(s);
            const addLabel = depth <= 1 ? 'Child' : 'Other';
            const code = esc(typeof wtSubTaskCode === 'function' ? wtSubTaskCode(t, s, index, depth) : (s.displayCode || 'Sub-' + s.id));
            return `
              <tr class="subtask-row nest-depth-${depth}">
                <td><code>${code}</code></td>
                <td class="nest-col depth-task">${dash}</td>
                ${nestCells(depth, nestTitle(s) + wtDepLineHtml(s))}
                <td><span class="badge ${wtRowBlocked(s) ? 'amber' : statusBadge(s.status, spct)}">${wtRowBlocked(s) ? 'Waiting' : esc(formatStatus(s.status))}</span></td>
                ${progressCell(s, spct)}
                <td class="table-actions">
                  ${wtUpdateBtnHtml(t.id, s.id, s)}
                  <button class="btn sm icon-action" data-tooltip="View history" aria-label="View history" title="View history" onclick="WTPages.openTaskHistory(${t.id}, ${s.id})"><i class="fa-solid fa-clock-rotate-left"></i></button>
                  ${kind === 'planning' ? `<button class="btn sm primary icon-action" data-tooltip="Add ${addLabel.toLowerCase()} task" aria-label="Add ${addLabel.toLowerCase()} task" title="Add ${addLabel.toLowerCase()} task" onclick="WTPages.openCreateSubTaskModal(${t.id}, ${s.id})"><i class="fa-solid fa-plus"></i></button>` : ''}
                  ${kind === 'planning' ? wtDepBtnHtml('sub', s.id, s) : ''}
                  ${(s.canDelete || s.CanDelete) ? `<button class="btn sm danger icon-action" data-tooltip="Delete task" aria-label="Delete task" title="Delete task" onclick="WTPages.deleteSubTask(${s.id}, '${esc(s.title || s.name)}')"><i class="fa-solid fa-trash"></i></button>` : ''}
                </td>
              </tr>`;
          }).join('') : '';
          return [parentRow, nestedRows];
        }).join('') : emptyRow(nestCols, `No tasks for ${selectedLabel}. Other projects are hidden.`);

        if (kind === 'daily') {
          if (typeof renderDailyReportCharts === 'function') {
            renderDailyReportCharts('dailyVisualCharts', {
              completedCount: comp,
              inProgressCount: prog,
              delayedCount: del,
              criticalCount: crit
            });
          }
        }
      }

      const exBatches = await Promise.all(scopeIds.map(id => WisetrackAPI.getExceptions(id).catch(() => [])));
      const ex = exBatches.flat();
      $('#excList').innerHTML = ex.length
        ? `<ul>${ex.map(x => `<li><strong>${esc(x.title || x.Title || 'Exception')}</strong> — ${esc(x.message || x.Message || x.type || x.Type || 'Needs attention')}</li>`).join('')}</ul>`
        : '<p style="color:var(--text-muted);font-size:12.5px;">🟢 Zero active blockers or exceptions flagged for this package.</p>';
      
      if (typeof initAllTables === 'function') setTimeout(() => initAllTables(), 150);
    } catch (e) {
      $('#tasksBody').innerHTML = errRow(kind === 'milestones' ? 6 : 8, e);
      $('#excList').innerHTML = `<p style="color:#dc2626">${esc(e.message)}</p>`;
      showToast(e.message, 'danger');
    }
  }

  async function loadDailyTaskReport(projectId) {
    const target = $('#dailyReportContent');
    if (!target) return;
    const date = $('#dailyReportDate')?.value || '';
    const cumulative = $('#dailyReportMode')?.value === 'cumulative';
    target.innerHTML = 'Loading report...';
    try {
      const report = await WisetrackAPI.getDailyReport(projectId, date, cumulative);
      const updates = report.taskUpdates || report.TaskUpdates || [];
      target.innerHTML = `<div style="margin-bottom:10px"><strong>${cumulative ? 'Progress as of' : 'Updates on'}:</strong> ${esc(report.reportDate || report.ReportDate || date)} &nbsp; <strong>Completion represented by the listed updates:</strong> ${Number(report.overallCompletionPercent ?? report.OverallCompletionPercent ?? 0).toFixed(1)}%</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Task / Sub-task</th><th>Status</th><th>Completion</th><th>Remarks</th></tr></thead><tbody>
          ${updates.length ? updates.map(u => `<tr><td>${esc(u.title || u.Title || '')}${(u.subTaskTitle || u.SubTaskTitle) ? `<small style="display:block;color:var(--text-muted)">${esc(u.subTaskTitle || u.SubTaskTitle)}</small>` : ''}</td><td>${esc(u.status || u.Status || '—')}</td><td>${Number(u.completionPercent ?? u.CompletionPercent ?? 0)}%</td><td>${esc(u.remarks || u.Remarks || '—')}</td></tr>`).join('') : '<tr><td colspan="4">No progress updates recorded for this date.</td></tr>'}
        </tbody></table></div>`;
    } catch (e) { target.innerHTML = `<p style="color:#dc2626">${esc(e.message)}</p>`; }
  }

  async function openMilestoneModal(milestoneId = null) {
    const pid = await selectedProjectId();
    let milestone = null;
    let milestones = [];
    let users = [];
    try { milestones = await WisetrackAPI.getMilestones(pid); }
    catch (err) { showToast(err.message, 'danger'); return; }
    try { users = await WisetrackAPI.getUsers(); } catch { users = []; }
    if (milestoneId) {
      milestone = milestones.find(m => Number(m.id) === Number(milestoneId));
      if (!milestone) { showToast('Milestone not found', 'danger'); return; }
    }
    const ownerOptions = `<option value="">Unassigned</option>` + (users || []).map(u => `<option value="${u.id}" ${Number(u.id) === Number(milestone?.ownerId || milestone?.OwnerId) ? 'selected' : ''}>${esc(u.fullName || u.name || u.email)}</option>`).join('');
    const dependencyOptions = `<option value="">None</option>` + milestones.filter(m => Number(m.id) !== Number(milestoneId)).map(m => `<option value="${m.id}" ${Number(m.id) === Number(milestone?.dependsOnMilestoneId || milestone?.DependsOnMilestoneId) ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
    const status = milestone?.status || milestone?.Status || 'NotStarted';
    openModal(milestone ? 'Edit Milestone' : 'Create Milestone', `
      <form onsubmit="WTPages.saveMilestone(event)">
        <input type="hidden" id="mProj" value="${pid}">
        <input type="hidden" id="mId" value="${milestone?.id || ''}">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="mName" required value="${esc(milestone?.name || '')}"></div>
          <div class="field full"><label>Description</label><textarea id="mDesc" placeholder="Optional notes / backward-plan step">${esc(milestone?.description || '')}</textarea></div>
          <div class="field"><label>Start Date</label><input id="mStart" type="date" value="${esc(milestone?.startDate || '')}"></div>
          <div class="field"><label>Target Date</label><input id="mDate" type="date" value="${esc(milestone?.dueDate || '')}"></div>
          <div class="field"><label>Responsible Owner</label><select id="mOwner">${ownerOptions}</select></div>
          <div class="field"><label>Depends on milestone</label><select id="mDependency">${dependencyOptions}</select></div>
          <div class="field"><label>Status</label><select id="mStatus">${['NotStarted','InProgress','Delayed','Completed'].map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s.replace(/([a-z])([A-Z])/g, '$1 $2')}</option>`).join('')}</select></div>
          <div class="field full"><label>Completion Evidence (document, link, or reference)</label><textarea id="mEvidence" placeholder="Add a file name, URL, sign-off reference, or evidence note">${esc(milestone?.completionEvidence || milestone?.CompletionEvidence || '')}</textarea></div>
          <div class="field full"><label>Attach completion evidence</label><input id="mEvidenceFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveMilestone(e) {
    e.preventDefault();
    try {
      const data = {
        projectId: Number($('#mProj').value),
        name: $('#mName').value.trim(),
        description: $('#mDesc')?.value.trim() || null,
        startDate: $('#mStart')?.value || null,
        dueDate: $('#mDate').value || null,
        ownerId: Number($('#mOwner')?.value) || null,
        dependsOnMilestoneId: Number($('#mDependency')?.value) || null,
        status: $('#mStatus')?.value || 'NotStarted',
        completionEvidence: $('#mEvidence')?.value.trim() || null
      };
      const id = Number($('#mId')?.value) || 0;
      const saved = id ? await WisetrackAPI.updateMilestone(id, data) : await WisetrackAPI.createMilestone(data);
      const savedId = Number(saved.id || saved.Id || id);
      const evidenceFile = $('#mEvidenceFile')?.files?.[0];
      if (evidenceFile && savedId) await WisetrackAPI.uploadFile(evidenceFile, 'Milestones', savedId);
      closeModal(); showToast(id ? 'Milestone updated' : 'Milestone created'); await pageTasks('milestones');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openMilestoneTemplateModal() {
    const pid = await selectedProjectId();
    let templates = [];
    let anchorDate = '';
    try { templates = await WisetrackAPI.getTemplates(); } catch { templates = []; }
    try { const project = await WisetrackAPI.getProject(pid); anchorDate = String(project.endDate || project.EndDate || '').slice(0, 10); } catch { }
    openModal('Milestone templates', `
      <div class="form-grid">
        <div class="field full">
          <label>Optional reusable template</label>
          <select id="msTpl"><option value="" selected>No template — define milestones below</option>${(templates || []).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Schedule anchor date (for relative template dates)</label><input id="msTplAnchor" type="date" value="${esc(anchorDate)}"></div>
        <div class="field full">
          <label>Project-specific milestones (one per line)</label>
          <textarea id="msTplNames" rows="5" placeholder="Design approval&#10;Site readiness&#10;Custom project milestone"></textarea>
        </div>
        <div class="field full"><label>Import from Excel, MS Project XML, or PDF</label><input id="msTplFile" type="file" accept=".xlsx,.xls,.csv,.tsv,.xml,.mspdi,.pdf" onchange="WTPages.importMilestoneTemplateFile(event)"><small style="color:var(--text-muted)">MS Project: export as XML. PDF import reads selectable text; scanned PDFs need OCR before import.</small></div>
        <div class="field"><label>Optional: save these names as a reusable template</label><input id="msTplName" placeholder="Optional template name"></div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn" onclick="WTPages.cloneMilestoneTemplate()">Add milestones to project</button>
        <button type="button" class="btn primary" onclick="WTPages.saveMilestoneTemplate()">Save template</button>
        <button type="button" class="btn" onclick="WTPages.saveCurrentMilestonesAsTemplate()">Save this project's milestones as template</button>
      </div>`);
    window._wtMsTplProject = pid;
  }

  async function saveMilestoneTemplate() {
    const name = ($('#msTplName')?.value || '').trim();
    const names = ($('#msTplNames')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!name || !names.length) { showToast('Enter a template name and at least one milestone line.', 'danger'); return; }
    try {
      await WisetrackAPI.saveTemplate({ name, templateJson: JSON.stringify(names) });
      showToast('Template saved');
      closeModal();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function saveCurrentMilestonesAsTemplate() {
    const pid = Number(window._wtMsTplProject);
    const name = ($('#msTplName')?.value || '').trim();
    if (!name) { showToast('Enter a template name.', 'danger'); return; }
    try {
      const rows = await WisetrackAPI.getMilestones(pid);
      if (!rows?.length) { showToast('This project has no milestones to save.', 'danger'); return; }
      const anchor = rows.reduce((max, m) => m.dueDate && (!max || m.dueDate > max) ? m.dueDate : max, '');
      const anchorDate = anchor ? new Date(`${anchor}T00:00:00`) : null;
      const items = rows.map(m => {
        const offset = (value) => value && anchorDate
          ? Math.round((new Date(`${value}T00:00:00`) - anchorDate) / 86400000)
          : null;
        return {
          name: m.name,
          description: m.description || null,
          startOffsetDays: offset(m.startDate),
          dueOffsetDays: offset(m.dueDate)
        };
      });
      await WisetrackAPI.saveTemplate({ name, templateJson: JSON.stringify(items) });
      showToast('Project milestones saved as a reusable template');
      closeModal();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function importMilestoneTemplateFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let names = [];
      const ext = file.name.toLowerCase().split('.').pop();
      if (['csv', 'tsv'].includes(ext)) {
        const text = await file.text();
        names = text.split(/\r?\n/).map(line => line.split(ext === 'tsv' ? '\t' : ',')[0].replace(/^\uFEFF/, '').replace(/^\s*["']|["']\s*$/g, '').trim()).filter(Boolean);
        if (/^(milestone|task|name|title)$/i.test(names[0] || '')) names.shift();
      } else if (['xml', 'mspdi'].includes(ext)) {
        const xml = new DOMParser().parseFromString(await file.text(), 'application/xml');
        if (xml.querySelector('parsererror')) throw new Error('Could not read this XML file. Export it as Microsoft Project XML and try again.');
        names = [...xml.getElementsByTagName('*')].filter(node => node.localName === 'Task').map(task => {
          const n = [...task.children].find(child => child.localName === 'Name');
          return n?.textContent?.trim();
        }).filter(Boolean);
      } else if (ext === 'xlsx' || ext === 'xls') {
        if (!window.XLSX) await loadMilestoneImportScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        names = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }).map(row => String(row[0] || '').trim()).filter(Boolean);
        if (/^(milestone|task|name|title)$/i.test(names[0] || '')) names.shift();
      } else if (ext === 'pdf') {
        if (!window.pdfjsLib) await loadMilestoneImportScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
          const page = await pdf.getPage(pageNo);
          const content = await page.getTextContent();
          const lines = new Map();
          for (const item of content.items) {
            const y = Math.round(item.transform?.[5] || 0);
            lines.set(y, `${lines.get(y) || ''} ${item.str}`.trim());
          }
          names.push(...[...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, line]) => line));
        }
        names = names.map(s => s.trim()).filter(Boolean);
      } else throw new Error('Choose an Excel, CSV/TSV, MS Project XML, or PDF file.');
      if (!names.length) throw new Error('No milestone names found in the file.');
      $('#msTplNames').value = [...new Set(names)].join('\n');
      showToast(`${new Set(names).size} milestone names imported. Review them, then add or save as a template.`);
    } catch (err) { showToast(err.message || 'Could not import this file.', 'danger'); }
  }

  function loadMilestoneImportScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('File import library could not load. Check your internet connection or paste milestone names instead.'));
      document.head.appendChild(script);
    });
  }

  async function cloneMilestoneTemplate() {
    const templateId = Number($('#msTpl')?.value);
    const pid = window._wtMsTplProject;
    const pasted = ($('#msTplNames')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    try {
      if (pasted.length) {
        const templateName = ($('#msTplName')?.value || '').trim();
        for (const name of pasted) {
          await WisetrackAPI.createMilestone({ projectId: Number(pid), name, description: null, startDate: null, dueDate: null });
        }
        if (templateName) await WisetrackAPI.saveTemplate({ name: templateName, templateJson: JSON.stringify(pasted) });
      } else {
        if (!templateId) { showToast('Enter project-specific milestones or select a template.', 'danger'); return; }
        await WisetrackAPI.cloneTemplate({ templateId, projectId: pid, anchorDate: $('#msTplAnchor')?.value || null });
      }
      closeModal(); showToast(pasted.length ? 'Project milestones added' : 'Template milestones added'); await pageTasks('milestones');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function planBackwardFromHandover() {
    const pid = await selectedProjectId();
    if (!pid) { showToast('Select a project first', 'danger'); return; }
    let completionDate = '';
    try {
      const p = await WisetrackAPI.getProject(pid);
      completionDate = String(p.endDate || p.EndDate || '').slice(0, 10);
    } catch (_) { /* date filled by user */ }
    openModal('Plan backward from handover (PM-17)', `
      <form onsubmit="WTPages.saveBackwardPlan(event)">
        <input type="hidden" id="bwProj" value="${pid}">
        <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Plan backward from the required project completion date. Edit the activities for this project; nothing is applied to other projects.</p>
        <div class="form-grid">
          <div class="field full"><label>Activities in schedule order (earliest first; one per line)</label><textarea id="bwSteps" rows="7">Procurement&#10;Payment&#10;Manufacture / Readiness&#10;Shipment&#10;Arrival&#10;Transfer&#10;Installation&#10;Commissioning&#10;Handover&#10;Project Completion</textarea><small style="color:var(--text-muted)">Optional duration per activity: add | days, e.g. Procurement | 21. Leave it out to use the default duration.</small></div>
          <div class="field"><label>Required project completion date *</label><input id="bwCompletion" type="date" value="${esc(completionDate)}" required></div>
          <div class="field"><label>Default activity duration (days)</label><input id="bwDays" type="number" min="1" value="14"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Create backward schedule</button></div>
      </form>`);
  }

  async function saveBackwardPlan(e) {
    e.preventDefault();
    const pid = Number($('#bwProj').value);
    const completionDate = $('#bwCompletion').value;
    const stepDays = Math.max(1, Number($('#bwDays').value) || 14);
    if (!pid || !completionDate) { showToast('Project completion date required', 'danger'); return; }
    const steps = ($('#bwSteps')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(line => {
      const match = line.match(/^(.*?)\s*\|\s*(\d+)\s*$/);
      return match
        ? { name: match[1].trim(), days: Number(match[2]) }
        : { name: line, days: stepDays };
    }).filter(s => s.name);
    if (!steps.length) { showToast('Add at least one project milestone.', 'danger'); return; }
    const completion = new Date(`${completionDate}T00:00:00`);
    const toLocalDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    try {
      let due = new Date(completion);
      const schedule = [];
      for (let i = steps.length - 1; i >= 0; i--) {
        const start = new Date(due);
        start.setDate(start.getDate() - steps[i].days);
        schedule.push({
          projectId: pid,
          name: steps[i].name,
          description: `Backward-scheduled from project completion (${completionDate}) (PM-17)`,
          startDate: toLocalDate(start),
          dueDate: toLocalDate(due)
        });
        due = start;
      }
      for (const milestone of schedule.reverse()) await WisetrackAPI.createMilestone(milestone);
      closeModal();
      showToast('Backward schedule created');
      await pageTasks('milestones');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openTaskModal(taskId = null) {
    const pid = await selectedProjectId();
    const currentUserId = localStorage.getItem('WISETRACK_USER_ID') || '';
    let editingTask = null;
    let loadedTasks = [];
    try {
      if (taskId) {
        const rows = await WisetrackAPI.getTasks(pid);
        loadedTasks = Array.isArray(rows) ? rows : [];
      }
      editingTask = loadedTasks.find(t => Number(t.id) === Number(taskId)) || null;
      if (taskId && !editingTask) { showToast('Task not found.', 'danger'); return; }
    } catch (err) { showToast(err.message, 'danger'); return; }
    let ownerOpts = '<option value="">Unassigned</option>';
    let dependOpts = '<option value="">None — can start anytime</option>';
    let milestoneOpts = '<option value="">No milestone</option>';
    try {
      const loaded = typeof wtLoadLiveTasksAndOwners === 'function'
        ? await wtLoadLiveTasksAndOwners()
        : { owners: [], tasks: [] };
      loadedTasks = loaded.tasks || loadedTasks;
      const owners = loaded.owners || [];
      ownerOpts = (owners.length ? owners : []).map(u => {
        const selectedOwner = editingTask?.assignedTo ?? editingTask?.AssignedTo ?? currentUserId;
        const selected = String(u.id) === String(selectedOwner) ? 'selected' : '';
        return `<option value="${u.id}" ${selected}>${esc(u.fullName)} (${esc(u.role || 'Team')})</option>`;
      }).join('') || `<option value="${esc(currentUserId)}" selected>Me</option>`;
      dependOpts += wtBuildDependOptions(loadedTasks, 'task', taskId);
      const milestones = await WisetrackAPI.getMilestones(pid);
      milestoneOpts += (milestones || []).map(m => `<option value="${m.id}" ${Number(m.id) === Number(editingTask?.milestoneId || editingTask?.MilestoneId) ? 'selected' : ''}>${esc(m.name)}${m.dueDate ? ` · Due ${esc(m.dueDate)}` : ''}</option>`).join('');
    } catch (_) { /* keep fallback */ }
    const adminDep = (typeof wtIsAdmin === 'function' && wtIsAdmin())
      ? `<div class="field full"><label>Depends on (optional)</label><select id="tDepend">${dependOpts}</select>
         <small style="color:var(--text-muted)">Until that item is finished, this task cannot be started.</small></div>`
      : '';
    const taskStatus = String(editingTask?.status || editingTask?.Status || 'NotStarted').replace(/\s+/g, '');
    openModal(editingTask ? 'Edit Task' : 'Create Task', `
      <form onsubmit="WTPages.saveTask(event)">
        <input type="hidden" id="tProj" value="${pid}">
        <input type="hidden" id="tId" value="${editingTask?.id || ''}">
        <div class="form-grid">
          <div class="field full"><label>Title *</label><input id="tTitle" required value="${esc(editingTask?.title || editingTask?.Title || '')}"></div>
          <div class="field full"><label>Assign to user *</label><select id="tOwner">${ownerOpts}</select></div>
          ${adminDep}
          <div class="field"><label>Milestone</label><select id="tMilestone">${milestoneOpts}</select></div>
          <div class="field"><label>Start Date</label><input id="tStartDate" type="date" value="${esc(editingTask?.startDate || editingTask?.StartDate || '')}"></div>
          <div class="field"><label>Due Date</label><input id="tDueDate" type="date" value="${esc(editingTask?.dueDate || editingTask?.DueDate || '')}"></div>
          <div class="field"><label>Status</label><select id="tStatus">${['NotStarted','InProgress','Delayed','Completed'].map(s => `<option value="${s}" ${s === taskStatus ? 'selected' : ''}>${s.replace(/([a-z])([A-Z])/g, '$1 $2')}</option>`).join('')}</select></div>
          <div class="field full"><label>Description</label><textarea id="tDesc">${esc(editingTask?.description || editingTask?.Description || '')}</textarea></div>
          <div class="field full"><label>Completion Evidence (document, link, or reference)</label><textarea id="tEvidence" placeholder="Add a file name, URL, sign-off reference, or evidence note">${esc(editingTask?.completionEvidence || editingTask?.CompletionEvidence || '')}</textarea></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
    if (editingTask && typeof wtIsAdmin === 'function' && wtIsAdmin()) {
      const dependency = editingTask.dependsOnSubTaskId || editingTask.DependsOnSubTaskId
        ? `sub:${editingTask.dependsOnSubTaskId || editingTask.DependsOnSubTaskId}`
        : (editingTask.dependsOnTaskId || editingTask.DependsOnTaskId ? `task:${editingTask.dependsOnTaskId || editingTask.DependsOnTaskId}` : '');
      const selector = $('#tDepend');
      if (selector) selector.value = dependency;
    }
  }

  function wtBuildDependOptions(tasks, excludeKind, excludeId) {
    let html = '';
    (tasks || []).forEach(t => {
      if (!(excludeKind === 'task' && Number(t.id) === Number(excludeId))) {
        html += `<option value="task:${t.id}">${esc(typeof wtTaskCode === 'function' ? wtTaskCode(t) : t.displayCode || t.title)} · ${esc(t.title || t.name)}</option>`;
      }
      const walked = typeof wtWalkSubs === 'function' ? wtWalkSubs(t) : [];
      walked.forEach(({ node: s, depth }) => {
        if (excludeKind === 'sub' && Number(s.id) === Number(excludeId)) return;
        const pad = depth <= 1 ? '↳ ' : depth === 2 ? '↳↳ ' : '↳↳↳ ';
        html += `<option value="sub:${s.id}">${pad}${esc(s.displayCode || s.title)} · ${esc(s.title || s.name)}</option>`;
      });
    });
    return html;
  }

  function parseDependValue(raw) {
    const v = String(raw || '').trim();
    if (!v) return { dependsOnTaskId: null, dependsOnSubTaskId: null };
    if (v.startsWith('sub:')) return { dependsOnTaskId: null, dependsOnSubTaskId: Number(v.slice(4)) || null };
    if (v.startsWith('task:')) return { dependsOnTaskId: Number(v.slice(5)) || null, dependsOnSubTaskId: null };
    return { dependsOnTaskId: null, dependsOnSubTaskId: null };
  }

  async function saveTask(e) {
    e.preventDefault();
    try {
      const dep = parseDependValue($('#tDepend')?.value);
      const data = {
        projectId: Number($('#tProj').value),
        milestoneId: Number($('#tMilestone')?.value) || null,
        title: $('#tTitle').value.trim(),
        description: $('#tDesc').value.trim(),
        status: $('#tStatus')?.value || 'NotStarted',
        completionEvidence: $('#tEvidence')?.value.trim() || null,
        startDate: $('#tStartDate').value || null,
        dueDate: $('#tDueDate').value || null,
        assignedTo: Number($('#tOwner')?.value) || Number(localStorage.getItem('WISETRACK_USER_ID')) || null,
        dependsOnTaskId: dep.dependsOnTaskId,
        dependsOnSubTaskId: dep.dependsOnSubTaskId
      };
      const id = Number($('#tId')?.value) || 0;
      if (id) await WisetrackAPI.updateTask(id, data);
      else await WisetrackAPI.createTask(data);
      closeModal(); showToast(id ? 'Task updated' : 'Task created'); await pageTasks('planning');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openDependencyModal(kind, id) {
    if (typeof wtIsAdmin === 'function' && !wtIsAdmin()) {
      showToast('Only Admin can depend / undepend tasks.', 'danger');
      return;
    }
    const loaded = typeof wtLoadLiveTasksAndOwners === 'function'
      ? await wtLoadLiveTasksAndOwners()
      : { tasks: [] };
    const tasks = loaded.tasks || [];
    let current = '';
    let title = '';
    if (kind === 'task') {
      const t = tasks.find(x => Number(x.id) === Number(id));
      title = t ? (t.title || t.name || `Task ${id}`) : `Task ${id}`;
      if (t?.dependsOnSubTaskId || t?.DependsOnSubTaskId) current = `sub:${t.dependsOnSubTaskId || t.DependsOnSubTaskId}`;
      else if (t?.dependsOnTaskId || t?.DependsOnTaskId) current = `task:${t.dependsOnTaskId || t.DependsOnTaskId}`;
    } else {
      for (const t of tasks) {
        const s = typeof wtFindSub === 'function' ? wtFindSub(t, id) : null;
        if (!s) continue;
        title = s.title || s.name || `Sub ${id}`;
        if (s.dependsOnSubTaskId || s.DependsOnSubTaskId) current = `sub:${s.dependsOnSubTaskId || s.DependsOnSubTaskId}`;
        else if (s.dependsOnTaskId || s.DependsOnTaskId) current = `task:${s.dependsOnTaskId || s.DependsOnTaskId}`;
        break;
      }
    }
    const opts = `<option value="">None — undepend (can start anytime)</option>` + wtBuildDependOptions(tasks, kind, id);
    openModal('Task dependency (Admin)', `
      <form onsubmit="WTPages.saveDependency(event, '${esc(kind)}', ${Number(id)})">
        <p style="margin:0 0 12px;color:var(--text-muted);font-size:13px;">
          <strong>${esc(title)}</strong> will not be allowed to start until the selected task / sub-task is finished.
        </p>
        <div class="field full">
          <label>Wait for</label>
          <select id="depTarget">${opts}</select>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn primary" type="submit">Save dependency</button>
        </div>
      </form>`);
    const sel = document.getElementById('depTarget');
    if (sel && current) sel.value = current;
  }

  async function saveDependency(e, kind, id) {
    e.preventDefault();
    try {
      const payload = parseDependValue($('#depTarget')?.value);
      if (kind === 'sub') await WisetrackAPI.setSubTaskDependency(id, payload);
      else await WisetrackAPI.setTaskDependency(id, payload);
      closeModal();
      showToast(payload.dependsOnTaskId || payload.dependsOnSubTaskId ? 'Dependency saved' : 'Dependency removed — can start anytime');
      await pageTasks('planning');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deleteTask(id, title) {
    if (!confirm(`Delete task "${title || id}" and all its sub-tasks?`)) return;
    try {
      await WisetrackAPI.deleteTask(id);
      showToast('Task deleted');
      await pageTasks('planning');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function deleteSubTask(id, title) {
    if (!confirm(`Delete sub-task "${title || id}" and any nested child tasks?`)) return;
    try {
      await WisetrackAPI.deleteSubTask(id);
      showToast('Sub-task deleted');
      await pageTasks('planning');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openTaskUpdateModal(taskId, subTaskId) {
    closeModal();
    const isSub = subTaskId != null && subTaskId !== '' && Number(subTaskId) > 0;
    let tasks = [];
    try {
      const loaded = typeof wtLoadLiveTasksAndOwners === 'function'
        ? await wtLoadLiveTasksAndOwners()
        : { tasks: [] };
      tasks = loaded.tasks || [];
    } catch (_) { tasks = []; }

    const findTask = (id) => tasks.find(t => Number(t.id) === Number(id));
    const findSub = (task, id) => {
      if (typeof wtFindSub === 'function') return wtFindSub(task, id);
      const walked = typeof wtWalkSubs === 'function' ? wtWalkSubs(task || {}) : [];
      return walked.map(x => x.node).find(s => Number(s.id) === Number(id)) || null;
    };

    let selectedTask = taskId ? findTask(taskId) : null;
    let selectedSub = isSub && selectedTask ? findSub(selectedTask, subTaskId) : null;

    if (!taskId && tasks.length === 1) {
      selectedTask = tasks[0];
      taskId = selectedTask.id;
    }

    const taskOpts = tasks.length
      ? tasks.map((t, i) => `<option value="${t.id}" ${Number(t.id) === Number(taskId) ? 'selected' : ''}>${esc(typeof wtTaskCode === 'function' ? wtTaskCode(t, i) : (t.displayCode || t.title))} · ${esc(t.title || t.name)}</option>`).join('')
      : '<option value="">No tasks found</option>';

    const buildSubOpts = (tid) => {
      const t = findTask(tid);
      const walked = typeof wtWalkSubs === 'function' ? wtWalkSubs(t || {}) : [];
      if (!walked.length) return '<option value="">No nested tasks (update main task)</option>';
      return `<option value="">Main task only</option>` + walked.map(({ node: s, depth, index }) => {
        const pad = depth <= 1 ? '↳ ' : depth === 2 ? '↳↳ ' : '↳↳↳ ';
        const code = typeof wtSubTaskCode === 'function' ? wtSubTaskCode(t, s, index, depth) : (s.displayCode || s.title);
        return `<option value="${s.id}" ${Number(s.id) === Number(subTaskId) ? 'selected' : ''}>${pad}${esc(code)} · ${esc(s.title || s.name)}</option>`;
      }).join('');
    };

    const pct = Number(isSub
      ? (selectedSub?.completionPercent ?? selectedSub?.CompletionPercent ?? 0)
      : (selectedTask?.completionPercent ?? selectedTask?.CompletionPercent ?? 0));
    const status = isSub
      ? (selectedSub?.status || selectedSub?.Status || 'InProgress')
      : (selectedTask?.status || selectedTask?.Status || 'InProgress');
    const title = isSub
      ? (selectedSub?.title || selectedSub?.name || 'Sub-task')
      : (selectedTask?.title || selectedTask?.name || (taskId ? (typeof wtTaskCode === 'function' ? wtTaskCode(selectedTask || { id: taskId }) : `Task-${taskId}`) : 'Select a task'));

    const statusOpts = ['NotStarted', 'InProgress', 'Delayed', 'Completed'].map(s => {
      const match = String(status).replace(/\s+/g, '') === s;
      const label = s.replace(/([a-z])([A-Z])/g, '$1 $2');
      return `<option value="${s}" ${match ? 'selected' : ''}>${label}</option>`;
    }).join('');

    const canPct = isSub
      ? (selectedSub?.canEditPercent ?? selectedSub?.CanEditPercent ?? selectedTask?.canEditPercent ?? true)
      : (selectedTask?.canEditPercent ?? selectedTask?.CanEditPercent ?? true);

    openModal(isSub ? 'Update Sub-Task' : 'Update Task', `
      <form onsubmit="WTPages.saveTaskUpdate(event)">
        <div class="form-grid">
          <div class="field">
            <label>Main Task *</label>
            <select id="tuId" required onchange="WTPages.onUpdateTaskChange(this.value)">${taskOpts}</select>
          </div>
          <div class="field">
            <label>Sub-Task</label>
            <select id="tuSubId">${buildSubOpts(taskId)}</select>
          </div>
          <div class="field full">
            <label>Updating</label>
            <input id="tuLabel" value="${esc(title)}" readonly>
          </div>
          <div class="field">
            <label>% Complete ${canPct ? '*' : '(owner only)'}</label>
            <input id="tuPct" type="number" min="0" max="100" value="${Number.isFinite(pct) ? pct : 0}" ${canPct ? 'required' : 'disabled'}>
          </div>
          <div class="field">
            <label>Status</label>
            <select id="tuStatus">${statusOpts}</select>
          </div>
          <div class="field full">
            <label>Optional text (not mandatory)</label>
            <input id="tuNotes" placeholder="Extra note if needed">
          </div>
          <div class="field full">
            <label>Remark / delay reason / site issue</label>
            <input id="tuRem" placeholder="Delay cause, site issue, or other remark">
          </div>
          <div class="field full">
            <label>Completion evidence reference</label>
            <textarea id="tuEvidence" placeholder="Sign-off, document, or evidence link"></textarea>
          </div>
          <div class="field full">
            <label>Attachment</label>
            <input id="tuFile" type="file">
          </div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn primary" type="submit">Save</button>
        </div>
      </form>`);
  }

  function onUpdateTaskChange(taskId) {
    const sel = document.getElementById('tuSubId');
    const label = document.getElementById('tuLabel');
    if (!sel || typeof wtLoadLiveTasksAndOwners !== 'function') return;
    wtLoadLiveTasksAndOwners().then(({ tasks }) => {
      const t = (tasks || []).find(x => Number(x.id) === Number(taskId));
      const subs = typeof wtSubTasksOf === 'function' ? wtSubTasksOf(t || {}) : (t?.subTasks || []);
      sel.innerHTML = !subs.length
        ? '<option value="">No sub-task (update main task)</option>'
        : `<option value="">Main task only</option>` + subs.map(s => `<option value="${s.id}">${esc(typeof wtSubTaskCode === 'function' ? wtSubTaskCode(t, s) : (s.displayCode || s.title))} · ${esc(s.title || s.name)}</option>`).join('');
      if (label) label.value = t ? `${typeof wtTaskCode === 'function' ? wtTaskCode(t) : (t.displayCode || '')} · ${t.title || t.name || ''}` : '';
    }).catch(() => {});
  }

  async function saveTaskUpdate(e) {
    e.preventDefault();
    const taskId = Number($('#tuId').value);
    const subTaskId = Number($('#tuSubId')?.value) || null;
    if (!taskId) {
      showToast('Select a task to update.', 'danger');
      return;
    }
    try {
      const payload = {
        taskId,
        subTaskId,
        status: $('#tuStatus')?.value || null,
        remarks: [
          ($('#tuNotes')?.value || '').trim() && `Text update: ${$('#tuNotes').value.trim()}`,
          ($('#tuRem')?.value || '').trim() && `Remark / delay reason / site issue: ${$('#tuRem').value.trim()}`
        ].filter(Boolean).join(' | ') || null
      };
      payload.completionEvidence = $('#tuEvidence')?.value.trim() || null;
      const pctEl = $('#tuPct');
      if (pctEl && !pctEl.disabled) payload.completionPercent = Number(pctEl.value);
      const file = $('#tuFile')?.files?.[0];
      if (file) {
        const uploaded = await WisetrackAPI.uploadFile(file, 'Tasks', taskId);
        payload.attachmentPath = uploaded.filePath || uploaded.FilePath;
      }
      await WisetrackAPI.addTaskUpdate(payload);
      closeModal(); showToast(subTaskId ? 'Sub-task updated' : 'Task updated'); await pageTasks('planning');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openTaskHistory(taskId, subTaskId = null) {
    openModal('Task Update History', 'Loading update history…');
    try {
      const [updates, files, users] = await Promise.all([
        WisetrackAPI.getTaskHistory(taskId, subTaskId),
        WisetrackAPI.getTaskFiles(taskId).catch(() => []),
        WisetrackAPI.getUsers().catch(() => [])
      ]);
      const userName = (id) => {
        const user = (users || []).find(u => Number(u.id) === Number(id));
        return user ? (user.fullName || user.name || user.email) : (id ? `User #${id}` : 'System');
      };
      const history = updates || [];
      openModal('Task Update History', `
        <p style="margin:0 0 12px;color:var(--text-muted)">${history.length} saved update${history.length === 1 ? '' : 's'}</p>
        ${(files || []).length ? `<div style="margin-bottom:14px"><strong>Uploaded evidence</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${files.map(file => `<button class="btn sm" onclick="WTPages.downloadTaskEvidence(${Number(file.id)})"><i class="fa-solid fa-paperclip"></i> ${esc(file.fileName || 'Evidence')}</button>`).join('')}</div></div>` : ''}
        <div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Task / Sub-task</th><th>Status</th><th>Completion</th><th>Remark</th><th>Updated by</th></tr></thead><tbody>
          ${history.length ? history.map(row => `<tr><td>${esc(row.updateDate || '')}<small style="display:block;color:var(--text-muted)">${esc(String(row.createdAt || '').slice(11, 16))}</small></td><td>${esc(row.itemTitle || '')}</td><td>${esc(row.status || '—')}</td><td>${row.completionPercent == null ? '—' : `${Number(row.completionPercent)}%`}</td><td style="white-space:pre-wrap">${esc(row.remarks || '—')}</td><td>${esc(userName(row.updatedById))}</td></tr>`).join('') : '<tr><td colspan="6">No previous updates recorded for this item.</td></tr>'}
        </tbody></table></div>`);
    } catch (err) {
      openModal('Task Update History', `<p style="color:#dc2626">${esc(err.message || 'Could not load update history.')}</p>`);
    }
  }

  async function downloadTaskEvidence(fileId) {
    try { await WisetrackAPI.downloadFileById(fileId); }
    catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- ISSUES ----------
  async function pageIssues() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Issues & Escalation', 'Selected project only — other projects’ issues stay hidden', picker +
      ` <button class="btn primary" onclick="WTPages.openIssueModal()">+ Log Issue</button>`)
      + tableWrap(['ID', 'What', 'Where', 'When', 'Impact', 'Reported By', 'Priority', 'Status', 'Actions'], 'issuesBody');
    if (!pid) {
      $('#issuesBody').innerHTML = emptyRow(9, 'No project available. Create / open a project first.');
      return;
    }
    try {
      const scopeIds = [Number(pid)];
      const batches = await Promise.all(scopeIds.map(id => WisetrackAPI.getIssues(id).catch(() => [])));
      const issues = filterRowsForProject(batches.flat(), pid);
      $('#issuesBody').innerHTML = issues.length ? issues.map(i => `
        <tr>
          <td>${i.id}</td>
          <td>${esc(i.what || i.title || i.description || '—')}</td>
          <td>${esc(i.location || '—')}</td>
          <td>${esc((i.occurredAt || '').toString().slice(0, 16) || '—')}</td>
          <td>${esc(i.impact || '—')}</td>
          <td>${esc(i.reporter?.fullName || i.reporterName || '—')}</td>
          <td>${esc(i.priority?.name || i.priorityName || i.priority || '—')}</td>
          <td>${esc(i.status || '—')}</td>
          <td class="table-actions">
            <button class="btn sm" onclick="WTPages.commentIssue(${i.id})">Comment</button>
            <button class="btn sm danger" onclick="WTPages.escalateIssue(${i.id})">Escalate</button>
          </td>
        </tr>`).join('') : emptyRow(9, 'No issues');
    } catch (e) { $('#issuesBody').innerHTML = errRow(9, e); }
  }

  async function openIssueModal() {
    const pid = await selectedProjectId();
    let priorities = [];
    try { priorities = await WisetrackAPI.getIssuePriorities(); } catch { /* optional */ }
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    openModal('Log Issue / Incident', `
      <form onsubmit="WTPages.saveIssue(event)">
        <input type="hidden" id="iProj" value="${pid}">
        <div class="form-grid">
          <div class="field full"><label>What is the issue *</label><input id="iWhat" required placeholder="Short description of the incident"></div>
          <div class="field"><label>Where is the issue *</label><input id="iWhere" required placeholder="Location / area"></div>
          <div class="field"><label>When it happened *</label><input id="iWhen" type="datetime-local" value="${local}" required></div>
          <div class="field full"><label>Impact *</label><textarea id="iImpact" required placeholder="Safety, schedule, cost, operations..."></textarea></div>
          <div class="field"><label>Priority</label><select id="iPri">${(priorities || []).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('') || '<option value="1">High</option>'}</select></div>
          <div class="field"><label>Reported By</label><input value="${esc(localStorage.getItem('WISETRACK_USER_NAME') || '')}" readonly></div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin:10px 0 0">High / Critical priority emails internal stakeholders automatically.</p>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save &amp; Notify</button></div>
      </form>`);
  }

  async function saveIssue(e) {
    e.preventDefault();
    try {
      const what = $('#iWhat').value.trim();
      await WisetrackAPI.createIssue({
        projectId: Number($('#iProj').value),
        title: what,
        what,
        location: $('#iWhere').value.trim(),
        occurredAt: $('#iWhen').value ? new Date($('#iWhen').value).toISOString() : null,
        impact: $('#iImpact').value.trim(),
        priorityId: Number($('#iPri').value) || null
      });
      closeModal(); showToast('Issue logged. High-priority mail is sent when applicable.'); await pageIssues();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function commentIssue(id) {
    const c = prompt('Comment');
    if (!c) return;
    try { await WisetrackAPI.addIssueComment(id, c); showToast('Comment added'); } catch (e) { showToast(e.message, 'danger'); }
  }

  async function escalateIssue(id) {
    try { await WisetrackAPI.escalateIssue(id); showToast('Escalated'); await pageIssues(); } catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- NOTIFICATIONS ----------
  function formatTriggerLabel(type) {
    const map = {
      BudgetRagAmber: 'Budget CC ≥80% (Amber)',
      BudgetRagRed: 'Budget CC ≥100% (Red)',
      IssueHighPriority: 'High / Critical issue',
      MilestoneApproaching: 'Approaching milestone date',
      MilestoneOverdue: 'Milestone overdue',
      TaskInactive7Days: 'Task inactive 7 days',
      TaskOverdue: 'Task overdue',
      Budget: 'Budget threshold'
    };
    return map[type] || type || '—';
  }

  async function pageNotifications() {
    const el = root();
    el.innerHTML = pageHead('Notifications & Escalation Rules', '/api/notifications',
      `<button class="btn" onclick="WTPages.openEscRuleModal()">+ Escalation Rule</button>
       <button class="btn primary" onclick="WTPages.openNotifyModal()">+ Send Notification</button>`)
      + `<div class="card" style="margin-bottom:16px"><h3 class="card-title" style="margin-bottom:10px">Inbox</h3><div id="inboxList">Loading inbox...</div></div>`
      + tableWrap(['ID', 'Rule', 'Trigger', 'Delay (hrs)', 'Target Role', 'Status / Control', 'Created'], 'escBody');
    try {
      const [inbox, rules, roles] = await Promise.all([
        WisetrackAPI.getInbox().catch(() => []),
        WisetrackAPI.getEscalationRules().catch(() => []),
        WisetrackAPI.getRoles().catch(() => [])
      ]);
      const roleName = (id) => {
        const r = (roles || []).find(x => Number(x.id) === Number(id));
        return r ? (r.name || r.title) : (id ? `#${id}` : '—');
      };

      const rows = Array.isArray(inbox) ? inbox : (inbox?.items || []);
      $('#inboxList').innerHTML = rows.length ? rows.map(n => {
        const note = n.notification || n;
        const title = note.title || note.subject || 'Notification';
        const body = note.body || note.message || '';
        const type = note.type || '';
        const when = note.createdAt ? new Date(note.createdAt).toLocaleString() : '';
        const unread = n.isRead === false;
        const rid = n.id || n.recipientId;
        return `
        <div style="padding:12px 0;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <div style="min-width:0;flex:1">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px">
              ${unread ? '<span class="badge amber">Unread</span>' : '<span class="badge green">Read</span>'}
              ${type ? `<span class="badge blue">${esc(type)}</span>` : ''}
              <strong>${esc(title)}</strong>
            </div>
            <p style="margin:0;color:var(--text-muted);font-size:12.5px;line-height:1.5">${esc(body)}</p>
            ${when ? `<small style="color:var(--text-muted)">${esc(when)}</small>` : ''}
          </div>
          ${unread && rid ? `<button class="btn sm" onclick="WisetrackAPI.markRead(${rid}).then(()=>{showToast('Marked read');WTPages.refreshNotifications&&WTPages.refreshNotifications()})">Mark read</button>` : ''}
        </div>`;
      }).join('') : '<p style="color:var(--text-muted);margin:0">Inbox empty</p>';

      $('#escBody').innerHTML = (rules || []).length ? rules.map(r => `
        <tr>
          <td>${r.id}</td>
          <td><strong>${esc(r.name || r.ruleName || 'Rule')}</strong></td>
          <td>${esc(formatTriggerLabel(r.triggerType))}</td>
          <td>${r.delayHours ?? 0}</td>
          <td>${esc(roleName(r.targetRoleId))}</td>
          <td><span class="badge ${r.isActive === false ? 'gray' : 'green'}">${r.isActive === false ? 'Inactive' : 'Active'}</span> <button class="btn sm" onclick="WTPages.setEscRuleActive(${Number(r.id)},${r.isActive === false ? 'true' : 'false'})">${r.isActive === false ? 'Enable' : 'Pause'}</button></td>
          <td>${r.createdAt ? esc(new Date(r.createdAt).toLocaleString()) : '—'}</td>
        </tr>`).join('') : emptyRow(7, 'No escalation rules');

      if (typeof initAllTables === 'function') setTimeout(() => initAllTables(), 150);
    } catch (e) {
      $('#inboxList').innerHTML = `<p style="color:#dc2626">${esc(e.message)}</p>`;
      $('#escBody').innerHTML = errRow(7, e);
      showToast(e.message, 'danger');
    }
  }

  async function openNotifyModal() {
    const users = await WisetrackAPI.getUsers();
    openModal('Send Notification', `
      <form onsubmit="WTPages.saveNotify(event)">
        <div class="form-grid">
          <div class="field full"><label>Title *</label><input id="nTitle" required></div>
          <div class="field full"><label>Message *</label><textarea id="nMsg" required></textarea></div>
          <div class="field full"><label>Recipients</label>
            <select id="nUsers" multiple style="min-height:100px">${users.map(u => `<option value="${u.id}">${esc(u.fullName)}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Send Email</label><select id="nEmail"><option value="false">No</option><option value="true">Yes</option></select></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Send</button></div>
      </form>`);
  }

  async function saveNotify(e) {
    e.preventDefault();
    const recipientUserIds = [...$('#nUsers').selectedOptions].map(o => Number(o.value));
    try {
      await WisetrackAPI.sendNotification({
        title: $('#nTitle').value.trim(),
        body: $('#nMsg').value.trim(),
        userIds: recipientUserIds,
        sendEmail: $('#nEmail').value === 'true',
        type: 'Info'
      });
      closeModal(); showToast('Sent'); await pageNotifications();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openEscRuleModal() {
    let roles = [];
    try { roles = await WisetrackAPI.getRoles(); } catch { /* optional */ }
    openModal('Escalation Rule', `
      <form onsubmit="WTPages.saveEscRule(event)">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="erName" required placeholder="e.g. Budget CC ≥80% → Finance"></div>
          <div class="field"><label>Trigger *</label>
            <select id="erTrigger" onchange="if(this.value==='MilestoneApproaching')document.getElementById('erDelay').value=168">
              <option value="BudgetRagAmber">Budget CC ≥80% (Amber)</option>
              <option value="BudgetRagRed">Budget CC ≥100% (Red)</option>
              <option value="IssueHighPriority">High / Critical issue</option>
              <option value="MilestoneApproaching">Approaching milestone date</option>
              <option value="MilestoneOverdue">Milestone overdue</option>
              <option value="TaskInactive7Days">Task inactive 7 days</option>
              <option value="TaskOverdue">Task overdue</option>
            </select>
          </div>
          <div class="field"><label>Delay / advance window (hours)</label><input id="erDelay" type="number" min="0" value="0"><small id="erDelayHint">Approaching milestone के लिए पहले से alert भेजने का समय; 168 hours = 7 days.</small></div>
          <div class="field full"><label>Target Role</label>
            <select id="erRole">${(roles || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('') || '<option value="">—</option>'}</select>
          </div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveEscRule(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createEscalationRule({
        name: $('#erName').value.trim(),
        triggerType: $('#erTrigger').value || 'BudgetRagAmber',
        delayHours: Number($('#erDelay').value) || 0,
        targetRoleId: Number($('#erRole').value) || null
      });
      closeModal(); showToast('Rule saved'); await pageNotifications();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function setEscRuleActive(ruleId, isActive) {
    try {
      await WisetrackAPI.updateEscalationRule(ruleId, { isActive });
      showToast(isActive ? 'Notification rule enabled' : 'Notification rule paused');
      await pageNotifications();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- REPORTS ----------
  async function pageReports() {
    const el = root();
    el.innerHTML = pageHead('Executive Reports & Exports (PM-28)', '/api/reports',
      `<button class="btn" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-sliders"></i> Custom Export & Send</button>
       <button class="btn primary" onclick="WTPages.openMonthlyReport()"><i class="fa-solid fa-calendar-days"></i> Monthly Project Report</button>
       <button class="btn" onclick="WTPages.loadPortfolio()"><i class="fa-solid fa-chart-pie"></i> View Portfolio</button>
       <button class="btn" onclick="WTPages.loadComparable()">Comparable projects</button>
       <button class="btn primary" onclick="WTPages.openReportModal()">+ Report Config</button>`)
      + tableWrap(['ID', 'Name', 'Type', 'Actions'], 'reportsBody')
      + `<div class="card" id="reportOut" style="margin-top:12px"><em>Generate a Monthly Project Report, customize an export, or view the live portfolio status.</em></div>`;
    try {
      const list = await WisetrackAPI.getReports();
      const rows = Array.isArray(list) ? list : (list?.items || list?.data || []);
      $('#reportsBody').innerHTML = rows.length ? rows.map(r => `
        <tr><td>${r.id}</td><td>${esc(r.name || r.title)}</td><td>${esc(r.reportType || r.type || '—')}</td>
        <td><button class="btn sm primary" onclick="openReportExportModal('${esc(r.reportType || 'portfolio').toLowerCase()}')">Export ➔</button></td></tr>`
      ).join('') : emptyRow(4, 'No saved report configs');
    } catch (e) { $('#reportsBody').innerHTML = errRow(4, e); }
  }

  async function openMonthlyReport() {
    const projects = await WisetrackAPI.getProjects();
    const selected = await selectedProjectId();
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    $('#reportOut').innerHTML = `<h3 class="card-title">Monthly Project Report</h3>
      <p class="card-subtitle">Generate a consistent report for one authorized project and calendar month.</p>
      <form onsubmit="WTPages.generateMonthlyReport(event)" class="form-grid" style="margin-top:12px">
        <div class="field"><label>Project *</label><select id="monthlyProject" required>${(projects || []).map(p => `<option value="${p.id}" ${String(p.id) === String(selected) ? 'selected' : ''}>${esc(p.name)}${p.code ? ` · ${esc(p.code)}` : ''}</option>`).join('')}</select></div>
        <div class="field"><label>Reporting month *</label><input id="monthlyPeriod" type="month" value="${month}" required></div>
        <div class="field full"><label>Decisions made during this month</label><textarea id="monthlyDecisions" rows="3" maxlength="5000" placeholder="Record key decisions, decision date, and owner (optional)"></textarea></div>
        <div class="field full"><button class="btn primary" type="submit">Generate Monthly Report</button></div>
      </form><div id="monthlyReportResult" style="margin-top:16px"></div>`;
    if (!projects?.length) $('#reportOut').innerHTML += '<p style="color:var(--text-muted)">No authorized projects are available.</p>';
  }

  async function generateMonthlyReport(event) {
    event?.preventDefault();
    const projectId = Number($('#monthlyProject')?.value);
    const period = $('#monthlyPeriod')?.value;
    const decisions = ($('#monthlyDecisions')?.value || '').trim();
    const result = $('#monthlyReportResult');
    if (!projectId || !/^\d{4}-\d{2}$/.test(period || '')) { showToast('Choose a project and reporting month.', 'danger'); return; }
    result.innerHTML = '<p style="color:var(--text-muted)">Generating report…</p>';
    const can = module => typeof wtCan !== 'function' || wtCan(module, 'view', projectId);
    try {
      const [project, milestones, tasks, exceptions, issues, budgets, purchases, actuals] = await Promise.all([
        WisetrackAPI.getProject(projectId),
        can('Milestones') ? WisetrackAPI.getMilestones(projectId).catch(() => []) : Promise.resolve([]),
        can('Tasks') ? WisetrackAPI.getTasks(projectId).catch(() => []) : Promise.resolve([]),
        can('Tasks') ? WisetrackAPI.getExceptions(projectId).catch(() => []) : Promise.resolve([]),
        can('Issues') ? WisetrackAPI.getIssues(projectId).catch(() => []) : Promise.resolve([]),
        can('Budgets') ? WisetrackAPI.getBudgets(projectId).catch(() => []) : Promise.resolve([]),
        can('Costs') ? WisetrackAPI.getPurchases(projectId).catch(() => []) : Promise.resolve([]),
        can('Costs') ? WisetrackAPI.getActuals(projectId).catch(() => []) : Promise.resolve([])
      ]);
      const asRows = value => Array.isArray(value) ? value : value?.items || value?.data || [];
      const ms = asRows(milestones), ts = asRows(tasks), issueRows = asRows(issues), riskRows = asRows(exceptions);
      const budgetRows = asRows(budgets), purchaseRows = asRows(purchases), actualRows = asRows(actuals);
      const [year, month] = period.split('-').map(Number);
      const start = new Date(year, month - 1, 1), end = new Date(year, month, 0, 23, 59, 59, 999);
      const inMonth = value => {
        if (!value) return false;
        const stamp = String(value);
        if (/^\d{4}-\d{2}/.test(stamp)) return stamp.slice(0, 7) === period;
        const d = new Date(value); return Number.isFinite(d.getTime()) && d >= start && d <= end;
      };
      const sum = (items, dateKeys) => items.filter(x => dateKeys.some(k => inMonth(x[k]))).reduce((n,x) => n + Number(x.amount ?? x.Amount ?? 0), 0);
      const monthlyPurchases = can('Costs') ? sum(purchaseRows, ['purchaseDate','PurchaseDate','date','Date']) : null;
      const monthlyActuals = can('Costs') ? sum(actualRows, ['costDate','CostDate','date','Date']) : null;
      const approvedBudget = can('Budgets') ? budgetRows.reduce((n,b) => n + Number(b.approvedAmount ?? b.ApprovedAmount ?? 0), 0) : null;
      const done = t => /complete|closed|done/i.test(String(t.status || t.Status || '')) || Number(t.completionPercent ?? t.CompletionPercent ?? 0) >= 100;
      const updatedThisMonth = ts.filter(t => inMonth(t.updatedAt || t.UpdatedAt || t.createdAt || t.CreatedAt));
      const averageProgress = ts.length ? Math.round(ts.reduce((n,t) => n + Number(t.completionPercent ?? t.CompletionPercent ?? 0), 0) / ts.length) : 0;
      const pending = ts.flatMap(t => [t, ...(t.subTasks || t.SubTasks || [])]).filter(t => !done(t)).sort((a,b) => new Date(a.dueDate || a.DueDate || '9999-12-31') - new Date(b.dueDate || b.DueDate || '9999-12-31'));
      const openIssues = issueRows.filter(i => !/closed|resolved/i.test(String(i.status || i.Status || '')));
      const currency = esc(project.currency || project.Currency || 'INR');
      const cash = value => `${currency} ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      const fmtDate = value => value ? new Date(value).toLocaleDateString() : '—';
      const list = (items, empty) => items.length ? `<ul>${items.join('')}</ul>` : `<p style="color:var(--text-muted)">${empty}</p>`;
      const finance = can('Budgets') || can('Costs') ? `<p>${can('Budgets') ? `Approved budget: <b>${cash(approvedBudget)}</b>` : 'Approved budget hidden.'}</p>
          ${can('Costs') ? `<p>Purchases this month: <b>${cash(monthlyPurchases)}</b> · Actual costs this month: <b>${cash(monthlyActuals)}</b> · Total monthly spend: <b>${cash(monthlyPurchases + monthlyActuals)}</b></p>` : '<p>Monthly cost entries hidden.</p>'}` : '<p style="color:var(--text-muted)">Financial data hidden for your permissions.</p>';
      const reportHtml = `<div class="card" id="monthlyReportPrint" style="padding:20px">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2 style="margin:0">Monthly Project Report</h2><p class="card-subtitle">${esc(project.name || project.Name)} · ${period}</p></div><button class="btn primary" onclick="WTPages.printMonthlyReport()">Print / Save PDF</button></div>
        <h3>Project Scope</h3><p>${esc(project.description || project.Description || 'No scope description recorded.')}</p><p><b>Project dates:</b> ${fmtDate(project.startDate || project.StartDate)} – ${fmtDate(project.endDate || project.EndDate)}</p>
        ${can('Tasks') ? `<h3>Progress</h3><p><b>Current completion:</b> ${averageProgress}% ? <b>Tasks updated/created this month:</b> ${updatedThisMonth.length} ? <b>Completed tasks:</b> ${ts.filter(done).length}/${ts.length}</p>` : ''}
        ${can('Milestones') ? `<h3>Milestones</h3>${list(ms.map(m => `<li><b>${esc(m.name || m.Name)}</b> ? ${esc(m.status || m.Status || 'Not started')} ? ${Number(m.completionPercent ?? m.CompletionPercent ?? 0)}% ? due ${fmtDate(m.dueDate || m.DueDate)}</li>`), 'No milestones recorded.')}` : ''}
        ${can('Budgets') || can('Costs') ? `<h3>Financials</h3>${finance}` : ''}
        ${can('Tasks') || can('Issues') ? `<h3>Risks</h3>${list([...(can('Tasks') ? riskRows.map(r => `<li>${esc(r.type || r.Type || 'Risk')} ? ${esc(r.title || r.Title || r.message || r.Message || 'Risk')}</li>`) : []), ...(can('Issues') ? openIssues.map(i => `<li>${i.isEscalated || i.IsEscalated ? '<b>Escalated ? </b>' : ''}${esc(i.title || i.Title || 'Open issue')} ? ${esc(i.status || i.Status || 'Open')}</li>`) : [])], 'No active risks or open issues.')}` : ''}
        <h3>Decisions</h3><p style="white-space:pre-wrap">${esc(decisions || 'No decisions recorded for this month.')}</p>
        ${can('Tasks') ? `<h3>Next Actions</h3>${list(pending.slice(0,20).map(t => `<li><b>${esc(t.title || t.Title || 'Task')}</b> ? ${esc(t.status || t.Status || 'Not started')} ? due ${fmtDate(t.dueDate || t.DueDate)}</li>`), 'No outstanding actions.')}` : ''}
        <hr><small>Generated ${new Date().toLocaleString()} · Reporting period ${period}</small>
        </div>`;
      result.innerHTML = reportHtml;
      await WisetrackAPI.createReport({
        name: `Monthly Project Report · ${period}`,
        reportType: 'monthly',
        projectId,
        filterJson: JSON.stringify({ period, decisions }),
        selectedColumns: 'project,period,decisions',
        recipientUserIds: []
      });
      showToast('Monthly report generated and saved to report history.');
    } catch (error) {
      result.innerHTML = `<p style="color:var(--danger,#b91c1c)">Could not generate the report: ${esc(error.message || 'Request failed')}</p>`;
    }
  }

  function printMonthlyReport() {
    const content = $('#monthlyReportPrint')?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) { showToast('Allow pop-ups to print or save the report as PDF.', 'danger'); return; }
    printWindow.document.write(`<!doctype html><html><head><title>Monthly Project Report</title><meta charset="utf-8"><style>body{font:14px Arial,sans-serif;color:#111827;margin:32px}h2{font-size:24px}h3{margin:20px 0 8px;border-bottom:1px solid #d1d5db;padding-bottom:5px}p,li{line-height:1.5}button{display:none}.card-subtitle{color:#6b7280}ul{padding-left:22px}@media print{body{margin:15mm}}</style></head><body>${content}</body></html>`);
    printWindow.document.close(); printWindow.focus(); printWindow.print();
  }

  async function loadPortfolio() {
    try {
      const p = await WisetrackAPI.getPortfolioReport();
      const projects = p?.projects || p?.Projects || (Array.isArray(p) ? p : []);
      if (!projects.length) {
        $('#reportOut').innerHTML = '<p style="color:var(--text-muted);margin:0">No portfolio projects found for your access.</p>';
        return;
      }
      const showMoney = typeof wtCanViewModule !== 'function' || wtCanViewModule('Budgets') || wtCanViewModule('Costs');
      $('#reportOut').innerHTML = `
        <h3 class="card-title" style="margin-bottom:10px">${showMoney ? 'Portfolio status (PMO / Finance)' : 'Portfolio status (execution view — financials hidden)'}</h3>
        <div class="table-wrap"><table class="table">
          <thead><tr>
            <th>Project</th><th>Status</th><th>Next Milestone</th><th>Schedule Risk</th>${showMoney ? '<th>Budget RAG</th>' : ''}<th>Open Issues</th>
          </tr></thead>
          <tbody>
            ${projects.map(row => {
              const rag = row.budgetRag || row.BudgetRag || 'Green';
              const risk = row.scheduleRisk || row.ScheduleRisk || '—';
              const ragCls = rag === 'Red' ? 'red' : rag === 'Amber' ? 'amber' : 'green';
              const riskCls = risk === 'High' ? 'red' : risk === 'Medium' ? 'amber' : 'green';
              return `<tr>
                <td><strong>${esc(row.name || row.Name)}</strong><small style="display:block;color:var(--text-muted)">#${row.projectId || row.ProjectId || ''}</small></td>
                <td><span class="badge blue">${esc(row.status || row.Status || '—')}</span></td>
                <td>${esc(row.nextMilestone || row.NextMilestone || '—')}</td>
                <td><span class="badge ${riskCls}">${esc(risk)}</span></td>
                ${showMoney ? `<td><span class="badge ${ragCls}">${esc(rag)}</span></td>` : ''}
                <td>${row.openIssues ?? row.OpenIssues ?? 0}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>`;
      if (typeof initAllTables === 'function') setTimeout(() => initAllTables(), 150);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function loadComparableWithFilters() {
    try {
      const [projects, types] = await Promise.all([WisetrackAPI.getProjects(), WisetrackAPI.getProjectTypes()]);
      const selected = await selectedProjectId();
      $('#reportOut').innerHTML = `
        <h3 class="card-title">Comparable project analysis</h3>
        <p class="card-subtitle">Filter completed projects by type, period, client, and scope. Financial columns follow project permissions.</p>
        <form onsubmit="WTPages.runComparable(event)" class="form-grid" style="margin-top:12px">
          <div class="field"><label>Reference project</label><select id="cmpProject"><option value="">None</option>${(projects || []).map(p => `<option value="${p.id}" ${Number(p.id) === Number(selected) ? 'selected' : ''}>${esc(p.name)} (${esc(p.status)})</option>`).join('')}</select></div>
          <div class="field"><label>Project type</label><select id="cmpType"><option value="">Any type</option>${(types || []).map(t => `<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Completed from</label><input id="cmpFrom" type="date"></div>
          <div class="field"><label>Completed to</label><input id="cmpTo" type="date"></div>
          <div class="field"><label>Client</label><input id="cmpClient" placeholder="Search client"></div>
          <div class="field"><label>Scope keywords</label><input id="cmpScope" placeholder="Description or scope notes"></div>
          <div class="field full"><button class="btn primary" type="submit">Compare projects</button></div>
        </form>
        <div id="comparableResults" style="margin-top:16px">Loading comparable projects...</div>`;
      await runComparable();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function runComparable(e) {
    e?.preventDefault();
    const filter = {
      projectId: Number($('#cmpProject')?.value) || null,
      projectType: $('#cmpType')?.value || null,
      fromDate: $('#cmpFrom')?.value || null,
      toDate: $('#cmpTo')?.value || null,
      client: $('#cmpClient')?.value.trim() || null,
      scope: $('#cmpScope')?.value.trim() || null
    };
    try {
      const rows = await WisetrackAPI.getComparableProjects(filter);
      const list = Array.isArray(rows) ? rows : [];
      const showBudget = typeof wtCanViewModule !== 'function' || wtCanViewModule('Budgets');
      const showCost = typeof wtCanViewModule !== 'function' || wtCanViewModule('Costs');
      $('#comparableResults').innerHTML = list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Project</th><th>Role</th><th>Type</th><th>Client</th><th>Scope</th><th>Variance lessons</th><th>Period</th>${showBudget ? '<th>Budget</th>' : ''}${showCost ? '<th>Purchase</th><th>Actual</th><th>Total Cost</th>' : ''}<th>Duration</th></tr></thead>
        <tbody>${list.map(r => `<tr><td><strong>${esc(r.name || r.Name)}</strong></td>
          <td><span class="badge ${(r.isReferenceProject || r.IsReferenceProject) ? 'blue' : 'green'}">${(r.isReferenceProject || r.IsReferenceProject) ? 'Reference' : 'Completed comparable'}</span></td>
          <td>${esc(r.projectType || r.ProjectType || '-')}</td><td>${esc(r.client || r.Client || '-')}</td>
          <td title="${esc(r.scope || r.Scope || '')}">${esc(r.scope || r.Scope || '-')}</td>
          <td>${(r.varianceExplanations || r.VarianceExplanations || []).map(v => `<div><b>${esc(v.varianceType || v.VarianceType)}:</b> ${esc(v.explanation || v.Explanation)}</div>`).join('') || '-'}</td>
          <td>${esc(r.startDate || r.StartDate || '-')} to ${esc(r.endDate || r.EndDate || '-')}</td>
          ${showBudget ? `<td>${esc(r.currency || 'INR')} ${Number(r.approvedBudget || r.ApprovedBudget || 0).toLocaleString('en-IN')}</td>` : ''}
          ${showCost ? `<td>${esc(r.currency || 'INR')} ${Number(r.purchaseCost || r.PurchaseCost || 0).toLocaleString('en-IN')}</td><td>${esc(r.currency || 'INR')} ${Number(r.actualCost || r.ActualCost || 0).toLocaleString('en-IN')}</td><td>${esc(r.currency || 'INR')} ${Number(r.totalCost || r.TotalCost || 0).toLocaleString('en-IN')}</td>` : ''}
          <td>${r.durationDays ?? r.DurationDays ?? '-'} days</td></tr>`).join('')}</tbody>
        </table></div>` : '<p>No completed projects match these filters.</p>';
    } catch (err) { $('#comparableResults').innerHTML = `<p style="color:#dc2626">${esc(err.message)}</p>`; }
  }

  async function loadComparable() {
    return loadComparableWithFilters();
  }
  function openReportModal() {
    openModal('Create Report Config', `
      <form onsubmit="WTPages.saveReport(event)">
        <div class="form-grid">
          <div class="field"><label>Name *</label><input id="rName" required></div>
          <div class="field"><label>Type</label><input id="rType" value="Portfolio"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveReport(e) {
    e.preventDefault();
    try {
      const report = await WisetrackAPI.createReport({ name: $('#rName').value.trim(), reportType: $('#rType').value.trim(), selectedColumns: 'project,status,progress,rag,milestones,issues,varianceReasons' });
      await WisetrackAPI.downloadReportCsv(report.id || report.Id);
      closeModal(); showToast('Saved'); await pageReports();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function downloadReport(id) {
    try { await WisetrackAPI.downloadReportCsv(id); showToast('Report CSV downloaded'); }
    catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- CLOSURE / INVENTORY ----------
  async function pageInventory() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Inventory & Project Closure', 'Leftover inventory + signed PCR required. Only Project Manager can close.', picker +
      ` <button class="btn" onclick="WTPages.openInventoryModal()">+ Inventory Item</button>
        <button class="btn" onclick="WTPages.generateHandoverReport()">Generate Handover Report</button>
        <button class="btn danger" onclick="WTPages.closeProject()">Close Project</button>`)
      + tableWrap(['ID', 'Item', 'Qty', 'Action'], 'invBody');
    if (!pid) {
      $('#invBody').innerHTML = emptyRow(4, 'No project available.');
      return;
    }
    try {
      const scopeIds = await projectScopeIds(pid);
      const batches = await Promise.all(scopeIds.map(id => WisetrackAPI.getInventory(id).catch(() => [])));
      const inv = batches.flat();
      $('#invBody').innerHTML = inv.length ? inv.map(i => `
        <tr><td>${i.id}</td><td>${esc(i.itemName || i.name || i.description)}</td>
        <td>${i.quantity ?? i.leftoverQty ?? '—'}</td><td>${esc(i.action || i.disposition || i.remarks || '—')}</td></tr>`
      ).join('') : emptyRow(4, 'No inventory rows');
    } catch (e) { $('#invBody').innerHTML = errRow(4, e); }
  }

  async function openInventoryModal() {
    const pid = await selectedProjectId();
    openModal('Add Inventory', `
      <form onsubmit="WTPages.saveInventory(event)">
        <input type="hidden" id="invProj" value="${pid}">
        <p class="card-subtitle">Record all leftovers before closure. If none remain, enter “No leftover inventory” with quantity 0.</p>
        <div class="form-grid">
          <div class="field full"><label>Item Name *</label><input id="invName" required></div>
          <div class="field"><label>Quantity * (0 when none remain)</label><input id="invQty" type="number" min="0" step="0.01" required></div>
          <div class="field"><label>Action</label><input id="invAct" placeholder="Transfer / Store"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveInventory(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.addInventory({
        projectId: Number($('#invProj').value),
        description: $('#invName').value.trim(),
        quantity: Number($('#invQty').value),
        remarks: $('#invAct').value.trim()
      });
      closeModal(); showToast('Saved'); await pageInventory();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function generateHandoverReport() {
    const w = window.open('', '_blank');
    if (!w) { showToast('Allow pop-ups to generate the handover report.', 'danger'); return; }
    const pid = await selectedProjectId();
    try {
      const project = await WisetrackAPI.getProject(Number(pid));
      const [tasks, milestones, issues, inventory] = await Promise.all([
        WisetrackAPI.getTasks(Number(pid)).catch(() => []),
        WisetrackAPI.getMilestones(Number(pid)).catch(() => []),
        WisetrackAPI.getIssues(Number(pid)).catch(() => []),
        WisetrackAPI.getInventory(Number(pid)).catch(() => [])
      ]);
      const accessible = (value) => Array.isArray(value) ? value : [];
      const taskRows = accessible(tasks), milestoneRows = accessible(milestones), issueRows = accessible(issues), inventoryRows = accessible(inventory);
      const openIssues = issueRows.filter(i => !/closed|resolved/i.test(i.status || ''));
      const doneTasks = taskRows.filter(t => /complete|closed/i.test(t.status || '') || Number(t.completionPercent || 0) >= 100).length;
      const htmlList = (items, empty) => items.length ? `<ul>${items.join('')}</ul>` : `<p>${empty}</p>`;
      const escDate = value => esc(value ? new Date(value).toLocaleDateString() : '—');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Project Completion & Handover Report</title><style>body{font:14px Arial,sans-serif;color:#111827;margin:32px;line-height:1.5}h1{color:#123d67;border-bottom:3px solid #123d67;padding-bottom:10px}h2{font-size:17px;color:#123d67;margin:22px 0 6px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#eff6ff}.signature{display:flex;gap:50px;margin-top:48px}.signature div{width:45%;border-top:1px solid #111;padding-top:6px}@media print{body{margin:15mm}}</style></head><body>
        <h1>Project Completion / Handover Report</h1><p><b>Project:</b> ${esc(project.name || project.Name)} · <b>Code:</b> ${esc(project.code || project.Code || '—')}</p>
        <p><b>Status:</b> ${esc(project.status || project.Status)} · <b>Project dates:</b> ${escDate(project.startDate || project.StartDate)} – ${escDate(project.endDate || project.EndDate)}</p>
        <h2>Project Summary & Scope</h2><p>${esc(project.description || project.Description || 'No scope description recorded.')}</p><p>${esc(project.profileNotes || project.ProfileNotes || '')}</p>
        <h2>Progress Summary</h2><p>${doneTasks} of ${taskRows.length} main tasks complete. Overall task completion: ${taskRows.length ? Math.round(taskRows.reduce((n,t) => n + Number(t.completionPercent || 0), 0) / taskRows.length) : 0}%.</p>
        <h2>Milestone Status</h2>${htmlList(milestoneRows.map(m => `<li>${esc(m.name || m.Name)} · ${esc(m.status || m.Status)} · ${Number(m.completionPercent || 0)}% · due ${escDate(m.dueDate || m.DueDate)}</li>`), 'No milestones recorded.')}
        <h2>Open Issues / Risks</h2>${htmlList(openIssues.map(i => `<li>${esc(i.title || i.Title)} · ${esc(i.priority?.name || i.Priority?.Name || 'Priority not set')} · ${esc(i.impact || i.Impact || '')}</li>`), 'No open issues recorded.')}
        <h2>Leftover Inventory Reconciliation</h2>${inventoryRows.length ? `<table><thead><tr><th>Item</th><th>Quantity</th><th>Disposition / Remarks</th></tr></thead><tbody>${inventoryRows.map(i => `<tr><td>${esc(i.description || i.Description || i.item?.name || i.Item?.Name || '—')}</td><td>${Number(i.quantity ?? i.Quantity ?? 0)}</td><td>${esc(i.remarks || i.Remarks || '—')}</td></tr>`).join('')}</tbody></table>` : '<p>Inventory reconciliation has not been recorded.</p>'}
        <h2>Handover Notes / Outstanding Actions</h2><p>Record punch-list status, warranties, manuals, keys, training and any accepted outstanding action before signature.</p><p style="min-height:70px;border-bottom:1px solid #cbd5e1"></p>
        <div class="signature"><div>Project Manager signature / date</div><div>Client / receiving representative signature / date</div></div><p style="margin-top:30px;color:#64748b">Generated ${new Date().toLocaleString()}. Review, complete notes, sign, and upload the signed copy before project closure.</p>
        <script>window.onload=()=>window.print()<\/script></body></html>`);
      w.document.close();
    } catch (err) {
      w.document.write(`<p>Could not generate handover report: ${esc(err.message || 'Request failed')}</p>`); w.document.close();
    }
  }

  async function closeProject() {
    const pid = await selectedProjectId();
    openModal('Close project (PM only)', `
      <form onsubmit="WTPages.saveCloseProject(event)">
        <input type="hidden" id="clProj" value="${pid}">
        <p style="font-size:12.5px;color:var(--text-muted)">Leftover inventory must already be recorded. Signed Project Completion Report is mandatory.</p>
        <div class="form-grid">
          <div class="field full"><label>Signed PCR / handover certificate *</label><input id="clFile" type="file" required></div>
          <div class="field full"><label>Handover notes</label><textarea id="clNotes" placeholder="Punch list closed, warranties archived..."></textarea></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn danger" type="submit">Close project</button></div>
      </form>`);
  }

  async function saveCloseProject(e) {
    e.preventDefault();
    const pid = Number($('#clProj').value);
    const file = $('#clFile')?.files?.[0];
    if (!file) { showToast('Upload the signed completion report.', 'danger'); return; }
    try {
      const uploaded = await WisetrackAPI.uploadFile(file, 'Closure', pid);
      await WisetrackAPI.closeProject({
        projectId: pid,
        isMandatoryComplete: true,
        handoverNotes: ($('#clNotes')?.value || '').trim(),
        signedDocumentPath: uploaded.filePath || uploaded.FilePath
      });
      closeModal();
      showToast('Project closed');
      await pageInventory();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- AUDIT ----------
  async function pageAudit() {
    const el = root();
    el.innerHTML = pageHead('Audit Logs', '/api/audit') + tableWrap(['When', 'User', 'Action', 'Entity', 'Details'], 'auditBody');
    try {
      const logs = await WisetrackAPI.getAuditLogs(null, null, 500);
      const rows = Array.isArray(logs) ? logs : [];
      $('#auditBody').innerHTML = rows.length ? rows.map(l => `
        <tr>
          <td>${esc(l.createdAt || '—')}</td>
          <td>${esc(l.userName || l.userId || '—')}</td>
          <td>${esc(l.action || '—')}</td>
          <td>${esc(l.entityName || '—')} #${esc(l.entityId || '')}</td>
          <td>${esc(l.details || '—')}</td>
        </tr>`).join('') : emptyRow(5, 'No audit logs');
    } catch (e) { $('#auditBody').innerHTML = errRow(5, e); }
  }

  // ---------- SETTINGS / WORKFLOW ----------
  async function pageSettings() {
    root().innerHTML = pageHead('System Settings', 'API connection & session')
      + `<div class="card">
          <p><strong>API Base:</strong> <code>${esc(API_BASE)}</code></p>
          <p><strong>User:</strong> ${esc(localStorage.getItem('WISETRACK_USER_NAME'))} (${esc(localStorage.getItem('WISETRACK_USER_EMAIL'))})</p>
          <p><strong>Roles:</strong> ${esc(localStorage.getItem('WISETRACK_USER_ROLES'))}</p>
          <button class="btn danger" onclick="WisetrackAPI.logout()">Logout</button>
          <a class="btn" href="/swagger" target="_blank" style="margin-left:8px">Open Swagger</a>
        </div>`;
  }

  async function pageWorkflow() {
    const el = root();
    el.innerHTML = pageHead(
      'Complete Application Flow Guide',
      'Requirement-mapped end-to-end runbook (PM-01 → PM-30) — how to operate Wisetrack from login to project closure',
      `<a class="btn primary" href="login.html"><i class="fa-solid fa-right-to-bracket"></i> Start at Login</a>
       <a class="btn" href="dashboard.html"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>`
    ) + `
      <div class="card" style="margin-bottom:18px;border-left:5px solid #1d4ed8;">
        <h3 class="card-title" style="margin-bottom:8px;">0. Quick start — do this first</h3>
        <ol class="flow-howto">
          <li>
            <div class="h-title">Login</div>
            <div class="h-body">Open <a href="login.html">login.html</a>. Demo: <code>admin@wisetrack.local</code> / <code>Admin@123</code>
              (PM: <code>pm@wisetrack.local</code>, Site: <code>site@wisetrack.local</code>, Finance: <code>finance@wisetrack.local</code>).</div>
          </li>
          <li>
            <div class="h-title">Select a Resort in the top bar</div>
            <div class="h-body">Example: <b>Grand Palm Luxury Resort & Spa (GPLR)</b>. All modules then run in that resort context.</div>
          </li>
          <li>
            <div class="h-title">Select a Project in each module dropdown</div>
            <div class="h-body">On Tasks / Milestones / BOQ / Budget, prefer the <b>MEP sub-project</b> (<code>PRJ-GPLR-01-MEP</code>) — seeded demo data lives there. Selecting a parent rolls up child project data.</div>
          </li>
        </ol>
      </div>

      <div class="card" style="margin-bottom:18px;">
        <h3 class="card-title">Master lifecycle flowchart (run the app in this order)</h3>
        <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 8px;">Click any box to open that module.</p>
        <div class="flow-rail">
          <a class="flow-node" href="users.html"><div class="fn" style="background:#1d4ed8">1</div><div class="ft">Users & Access</div><div class="fs">Admin / user checkboxes</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="project-detail.html"><div class="fn" style="background:#6d28d9">2</div><div class="ft">Project Assign</div><div class="fs">PM-02 / PM-04</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="projects.html"><div class="fn" style="background:#7c3aed">3</div><div class="ft">N-Level Projects</div><div class="fs">PM-01 / PM-06</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="milestones.html"><div class="fn" style="background:#059669">4</div><div class="ft">Milestones</div><div class="fs">PM-15…18</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="planning.html"><div class="fn" style="background:#0d9488">5</div><div class="ft">Tasks / Sub-tasks</div><div class="fs">PM-18</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="budget.html"><div class="fn" style="background:#dc2626">6</div><div class="ft">Budget & CC</div><div class="fs">PM-07 / PM-08</div></a>
        </div>
        <div class="flow-rail">
          <a class="flow-node" href="items.html"><div class="fn" style="background:#d97706">7</div><div class="ft">Item Master</div><div class="fs">PM-12</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="daily-report.html"><div class="fn" style="background:#8b5cf6">8</div><div class="ft">Daily Updates</div><div class="fs">DSR / Excel</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="costs.html"><div class="fn" style="background:#e11d48">9</div><div class="ft">Purchase / Actual</div><div class="fs">PM-21 / PM-22</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="boq.html"><div class="fn" style="background:#ea580c">10</div><div class="ft">BOQ + Versions</div><div class="fs">PM-10…14</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="issues.html"><div class="fn" style="background:#b91c1c">11</div><div class="ft">Issues</div><div class="fs">Incident + mail</div></a>
          <span class="flow-arrow">➜</span>
          <a class="flow-node" href="reports.html"><div class="fn" style="background:#0284c7">12</div><div class="ft">Reports</div><div class="fs">PM-25…29</div></a>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:18px;">
        <div class="card">
          <h3 class="card-title">Project hierarchy (requirement rule)</h3>
          <div class="flow-hierarchy">
            <div class="fh-box" style="background:#eff6ff;border-color:#bfdbfe;">🏨 Resort (GPLR)</div>
            <div class="fh-line"></div>
            <div class="fh-box" style="background:#f5f3ff;border-color:#ddd6fe;">📦 Parent Project (Phase 1 / Spa)</div>
            <div class="fh-line"></div>
            <div class="fh-row">
              <div class="fh-box" style="background:#ecfdf5;min-width:140px;">MEP<br><small>also Parent CC</small></div>
              <div class="fh-box" style="background:#fff7ed;min-width:140px;">Civil<br><small>also Parent CC</small></div>
              <div class="fh-box" style="background:#fef2f2;min-width:140px;">Interior<br><small>also Parent CC</small></div>
            </div>
            <div class="fh-line"></div>
            <div class="fh-box" style="background:#f8fafc;">Milestone → Task → Sub-task → Daily %</div>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0;">
            Each Sub-Project is a separate project <b>and</b> is treated as a Cost Center under the Parent (PM-07).
          </p>
        </div>

        <div class="card">
          <h3 class="card-title">Daily execution loop (site)</h3>
          <div class="flow-loop">
            <div style="font-size:12.5px;font-weight:800;margin-bottom:8px;color:#5b21b6;">Run this cycle every day</div>
            <div class="flow-rail" style="margin:0;">
              <div class="flow-node" style="cursor:default;"><div class="ft">Open Task</div><div class="fs">planning.html</div></div>
              <span class="flow-arrow">➜</span>
              <div class="flow-node" style="cursor:default;"><div class="ft">Update Sub-task</div><div class="fs">Status + Remark + Attach</div></div>
              <span class="flow-arrow">➜</span>
              <div class="flow-node" style="cursor:default;"><div class="ft">PM rolls %</div><div class="fs">Only owner changes %</div></div>
              <span class="flow-arrow">➜</span>
              <div class="flow-node" style="cursor:default;"><div class="ft">Exception check</div><div class="fs">No progress 7 days</div></div>
            </div>
            <p style="font-size:12px;margin:10px 0 0;color:#5b21b6;">
              Optional: bulk status upload from Excel (<a href="daily-report.html">Daily Report</a>). High-priority issues auto-email stakeholders.
            </p>
          </div>
          <div style="margin-top:12px;font-size:12.5px;line-height:1.6;">
            <b>How are sub-tasks created?</b> Tasks & Planning → <code>+ Sub-Task</code> (on the main task).<br>
            <b>How are updates captured?</b> Site team: Status dropdown + optional text + attachment + Remark.
            Main-task % completion can be changed only by the Task Owner / PM.
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px;">
        <h3 class="card-title">Step-by-step — how to run the full application</h3>
        <ol class="flow-howto">
          <li>
            <div class="h-title">1) Users &amp; roles (Admin)</div>
            <div class="h-body">
              Set module rights in <a href="roles.html">Roles & Permissions</a> →
              create users and assign roles in <a href="users.html">Users</a>.
              Grant project + module View/Edit during user setup (PM-03).
            </div>
          </li>
          <li>
            <div class="h-title">2) Team assignment</div>
            <div class="h-body">
              Assign users to projects in <a href="project-detail.html">Project Workspace</a> (PM-02 / PM-04).
              Users see only the projects they are assigned to.
            </div>
          </li>
          <li>
            <div class="h-title">3) N-level projects</div>
            <div class="h-body">
              Create resort + property in <a href="resorts.html">Resorts</a> →
              create Parent projects in <a href="projects.html">Projects</a> (MEP / Civil / New Development / Major Renovation) →
              add Sub-Projects underneath (PM-01, PM-06).
            </div>
          </li>
          <li>
            <div class="h-title">4) Milestones</div>
            <div class="h-body">
              <a href="milestones.html">Milestones</a>: plan backward from handover (procure → ship → install → commission → handover) (PM-15…18).
              Save / clone templates for repeated project types.
            </div>
          </li>
          <li>
            <div class="h-title">5) Tasks / sub-tasks</div>
            <div class="h-body">
              <a href="planning.html">Tasks & Planning</a>: main tasks are numbered <code>Task-1</code>, <code>Task-2</code>.
              Sub-tasks under a parent are <code>Task-1-Sub-1</code>, <code>Task-1-Sub-2</code> so ownership is obvious.
            </div>
          </li>
          <li>
            <div class="h-title">6) Budget &amp; cost centers</div>
            <div class="h-body">
              <a href="budget.html">Budgets</a>: distribute approved amount across CCs (sub-projects act as CCs on the parent) →
              revise with reasons (PM-08). 80% spend flags RAG + escalation mail (PM-07).
            </div>
          </li>
          <li>
            <div class="h-title">7) Item master</div>
            <div class="h-body">
              <a href="items.html">Item Master</a>: code, unit, purchase price, brand, image, category (PM-12).
            </div>
          </li>
          <li>
            <div class="h-title">8) Daily updates</div>
            <div class="h-body">
              Site team updates sub-task status / remark / attachment in <a href="daily-report.html">Daily Report</a>.
              % completion is changed only by the task owner. Excel CSV bulk upload is supported.
            </div>
          </li>
          <li>
            <div class="h-title">9) Purchase / actual</div>
            <div class="h-body">
              Enter costs in <a href="costs.html">Purchases & Actuals</a> (PM-21 / PM-22). Record variance reasons (PM-24).
            </div>
          </li>
          <li>
            <div class="h-title">10) BOQ + versions</div>
            <div class="h-body">
              <a href="boq.html">BOQ</a>: pick from master or flexible vendor CSV import (PM-10/11) →
              lock baseline version and track revisions (PM-13/14).
            </div>
          </li>
          <li>
            <div class="h-title">11) Issues / incidents</div>
            <div class="h-body">
              <a href="issues.html">Issues</a>: What / Where / When / Reported By / Impact / Priority.
              HIGH/CRITICAL triggers escalation email to stakeholders.
            </div>
          </li>
          <li>
            <div class="h-title">12) Reports (internal only)</div>
            <div class="h-body">
              <a href="dashboard.html">Dashboard</a> for portfolio health (PM-25/26) →
              <a href="reports.html">Reports</a>: choose columns; recipients must be internal emails only (PM-28/29).
              Close the project from <a href="inventory.html">Inventory & Closure</a> after leftover inventory and signed PCR (PM-30).
            </div>
          </li>
        </ol>
      </div>

      <div class="grid g2" style="margin-bottom:18px;">
        <div class="card" style="border-left:5px solid #dc2626;">
          <h3 class="card-title">80% RAG rule (remember this)</h3>
          <p style="font-size:12.5px;line-height:1.6;color:var(--text-muted);margin:0;">
            When purchase/actual spend on a Cost Center reaches <b>≥80%</b> of allocation → Amber flag;
            ≥100% → Red. Escalation matrix emails Finance + PM.
            Check: Budgets page + Notifications inbox.
          </p>
        </div>
        <div class="card" style="border-left:5px solid #047857;">
          <h3 class="card-title">Closure checklist</h3>
          <p style="font-size:12.5px;line-height:1.6;color:var(--text-muted);margin:0;">
            ☐ Leftover inventory reconciled<br>
            ☐ Signed handover / PCR uploaded<br>
            ☐ Snags / open critical issues closed<br>
            ☐ PM clicks Close Project
          </p>
        </div>
      </div>

      <div class="card" style="margin-top:8px;">
        <div class="card-header">
          <div>
            <h3 class="card-title">Who does what (role matrix)</h3>
            <div class="card-subtitle">PM-02 / PM-03 — module access & field masking</div>
          </div>
          <a href="users.html" class="btn sm">Users ➔</a>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>ROLE</th>
                <th>JOB IN THE FLOW</th>
                <th>MODULES</th>
                <th>RESTRICTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Admin</strong></td>
                <td>Setup resort, users, roles, full portfolio</td>
                <td><span class="badge blue">All</span></td>
                <td>None</td>
              </tr>
              <tr>
                <td><strong>Project Manager</strong></td>
                <td>Plan milestones/tasks, approve BOQ/budget, close project</td>
                <td><span class="badge green">Projects → Closure</span></td>
                <td>Cannot edit system roles</td>
              </tr>
              <tr>
                <td><strong>Site Engineer</strong></td>
                <td>Daily sub-task updates, photos, issues</td>
                <td><span class="badge green">Tasks, DSR, Issues</span></td>
                <td>Rates / commercial fields masked</td>
              </tr>
              <tr>
                <td><strong>Finance</strong></td>
                <td>Budget, costs, RAG, variance</td>
                <td><span class="badge amber">Budget, Costs, Reports</span></td>
                <td>No milestone date edits</td>
              </tr>
              <tr>
                <td><strong>Auditor</strong></td>
                <td>Review evidence, audit, inventory before handover</td>
                <td><span class="badge blue">Milestones, Audit, Inventory</span></td>
                <td>Budgets read-only</td>
              </tr>
              <tr>
                <td><strong>Resort GM / External</strong></td>
                <td>Portfolio view, sign handover; external = authorized projects only</td>
                <td><span class="badge green">Dashboard, Reports</span></td>
                <td>No external report send; limited project visibility</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // PM-25: use the permission-filtered portfolio report as the dashboard source.
  async function pageDashboard() {
    const el = root();
    el.innerHTML = pageHead('Portfolio Dashboard', 'Authorized projects · status, milestone, schedule risk, budget position, and unresolved exceptions',
      `<a class="btn" href="reports.html">Reports</a> <button class="btn primary" onclick="openCreateProjectModal()">+ Create Project</button>`)
      + `<div class="kpis">
          <div class="kpi"><span class="kpi-label">Authorized Projects</span><span class="kpi-value" id="pm25ProjectCount">…</span></div>
          <div class="kpi success"><span class="kpi-label">On Track</span><span class="kpi-value" id="pm25OnTrack">…</span></div>
          <div class="kpi warning"><span class="kpi-label">Schedule Risk</span><span class="kpi-value" id="pm25Risk">…</span></div>
          <div class="kpi danger"><span class="kpi-label">Unresolved Exceptions</span><span class="kpi-value" id="pm25Exceptions">…</span></div>
        </div>
        <section class="card" style="margin-top:18px">
          <div class="card-header"><div><h3 class="card-title">Portfolio overview</h3><div class="card-subtitle">Figures reflect your authorized projects and available module permissions.</div></div></div>
          <div id="pm25Portfolio" class="table-wrap"><p style="padding:16px;color:var(--text-muted)">Loading portfolio…</p></div>
        </section>`;
    try {
      const report = await WisetrackAPI.getPortfolioReport();
      const projects = report?.projects || report?.Projects || (Array.isArray(report) ? report : []);
      const riskCount = projects.filter(p => /high|medium|risk|overdue/i.test(p.scheduleRisk || p.ScheduleRisk || '')).length;
      const exceptions = projects.reduce((sum, p) => sum + Number(p.unresolvedExceptions ?? p.UnresolvedExceptions ?? p.openIssues ?? p.OpenIssues ?? 0), 0);
      $('#pm25ProjectCount').textContent = String(projects.length);
      $('#pm25OnTrack').textContent = String(projects.filter(p => !/high|medium|risk|overdue/i.test(p.scheduleRisk || p.ScheduleRisk || '')).length);
      $('#pm25Risk').textContent = String(riskCount);
      $('#pm25Exceptions').textContent = String(exceptions);
      const showBudget = typeof wtCanViewModule !== 'function' || wtCanViewModule('Budgets') || wtCanViewModule('Costs');
      const dateText = value => value ? new Date(value).toLocaleDateString() : '—';
      $('#pm25Portfolio').innerHTML = projects.length ? `<table class="table"><thead><tr>
        <th>Project</th><th>Status</th><th>Next critical milestone</th><th>Schedule risk</th>${showBudget ? '<th>Budget position</th>' : ''}<th>Unresolved exceptions</th><th>Progress</th>
        </tr></thead><tbody>${projects.map(p => {
          const id = Number(p.projectId ?? p.ProjectId);
          const name = p.name || p.Name || 'Project';
          const status = p.status || p.Status || '—';
          const milestone = p.nextMilestone || p.NextMilestone || 'No upcoming milestone';
          const due = p.nextMilestoneDueDate || p.NextMilestoneDueDate;
          const risk = p.scheduleRisk || p.ScheduleRisk || 'Low';
          const rag = p.budgetRag || p.BudgetRag || '';
          const exceptionCount = Number(p.unresolvedExceptions ?? p.UnresolvedExceptions ?? p.openIssues ?? p.OpenIssues ?? 0);
          const progress = Number(p.progressPercent ?? p.ProgressPercent ?? 0);
          const budgetText = rag === 'Red' ? 'Over budget / forecast' : rag === 'Amber' ? 'Near budget limit' : rag === 'Green' ? 'Under budget' : rag === 'Unbudgeted' ? 'No budget set' : 'Restricted';
          return `<tr><td><a href="project-detail.html?id=${id}" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${id}')"><strong>${esc(name)}</strong></a></td>
            <td><span class="badge blue">${esc(status)}</span></td>
            <td>${esc(milestone)}<small style="display:block;color:var(--text-muted)">${esc(dateText(due))}</small></td>
            <td><span class="badge ${/high|overdue/i.test(risk) ? 'red' : /medium|risk/i.test(risk) ? 'amber' : 'green'}">${esc(risk)}</span></td>
            ${showBudget ? `<td><span class="badge ${rag === 'Red' ? 'red' : rag === 'Amber' ? 'amber' : rag === 'Green' ? 'green' : 'gray'}">${esc(budgetText)}</span></td>` : ''}
            <td><span class="badge ${exceptionCount ? 'red' : 'green'}">${exceptionCount}</span></td>
            <td>${Number.isFinite(progress) ? `${Math.round(progress)}%` : '—'}</td></tr>`;
        }).join('')}</tbody></table>` : '<p style="padding:16px;color:var(--text-muted)">No authorized projects are available for your account.</p>';
    } catch (err) {
      $('#pm25Portfolio').innerHTML = `<p style="padding:16px;color:var(--danger,#b91c1c)">Portfolio could not be loaded: ${esc(err.message || 'Request failed')}</p>`;
      ['pm25ProjectCount','pm25OnTrack','pm25Risk','pm25Exceptions'].forEach(id => { const node = document.getElementById(id); if (node) node.textContent = '—'; });
    }
  }

  // ---------- ROUTER ----------
  async function boot() {
    try {
      if (typeof requireAuth === 'function' && !requireAuth()) return;
      const requestedProject = new URLSearchParams(location.search).get('projectId') || new URLSearchParams(location.search).get('id');
      if (requestedProject && /^\d+$/.test(requestedProject)) localStorage.setItem('WISETRACK_SELECTED_PROJECT', requestedProject);
      if (typeof wtApplyLayout === 'function') wtApplyLayout();
      if (typeof applyLoggedInUser === 'function') await applyLoggedInUser();
      if (typeof fillResortSelector === 'function') await fillResortSelector();
      if (typeof fillProjectSelector === 'function') await fillProjectSelector();

      const page = (location.pathname.split('/').pop() || '').toLowerCase();
      if (typeof wtPageAllowed === 'function' && page && !wtPageAllowed(page) && page !== 'login.html') {
        root().innerHTML = `<div class="card" style="padding:24px">
          <h2 style="margin:0 0 8px">Access denied</h2>
          <p style="margin:0">Is module ke liye aapke user par checkbox nahi hai. Admin se project × module rights assign karwayein.</p>
        </div>`;
        return;
      }
      const map = {
        'dashboard.html': () => pageDashboard(),
        'index.html': () => pageDashboard(),
        '': () => pageDashboard(),
        'roles.html': () => pageRoles(),
        'users.html': () => pageUsers(),
        'resorts.html': () => pageResorts(),
        'projects.html': () => pageProjects(),
        'project-detail.html': () => pageProjectDetail(),
        'items.html': () => pageItems(),
        'budget.html': () => pageBudget(),
        'costs.html': () => pageCosts(),
        'boq.html': () => pageBoq(),
        'planning.html': () => pageTasks('planning'),
        'milestones.html': () => pageTasks('milestones'),
        'daily-report.html': () => pageTasks('daily'),
        'issues.html': () => pageIssues(),
        'notifications.html': () => pageNotifications(),
        'reports.html': () => pageReports(),
        'inventory.html': () => pageInventory(),
        'audit-logs.html': () => pageAudit(),
        'settings.html': () => pageSettings(),
        'workflow.html': () => pageWorkflow()
      };
      const fn = map[page];
      if (fn) await fn();
      if (PROJECT_CONTEXT_PAGES.has(page)) renderProjectContextTabs(page, await selectedProjectId());
      if (typeof watchTablePagination === 'function') watchTablePagination();
      if (typeof initAllTables === 'function') initAllTables();
    } catch (err) {
      const el = root();
      el.innerHTML = `<div class="card" style="padding:24px;color:#991b1b">
        <h2 style="margin:0 0 8px">Page failed to load</h2>
        <p style="margin:0">${esc(err.message || err)}</p>
        <p style="margin:12px 0 0;font-size:12px;color:var(--text-muted)">Check login token / API, then refresh. Stale project selection is cleared on next load.</p>
      </div>`;
      console.error(err);
    }
  }

  window.WTPages = {
    showRoleTab, openRoleModal, saveRole, deleteRole,
    openPermissionModal, savePermission, deletePermission, saveUserRoles,
    openUserModal, saveUser, toggleUserAdmin, switchUserPermTab, addUserPermProject, removeUserPermProject, onUserPermToggle, onProjectFieldPermToggle, fillPermProjectSelect,
    openPropertyModal, saveProperty, deleteProperty, openTypeModal, openEditTypeModal, saveType, updateType, deleteType,
    addTeam, saveWorkspaceVariance,
    openItemModal, saveItem, deleteItem, openBrandModal, openUnitModal, openCategoryModal,
    deleteBrand, deleteUnit, deleteCategory, refreshItemsAll,
    openBudgetModal, saveBudget, reviseBudget, openBudgetRevision, saveBudgetRevision, openBudgetHistory, openAllocationModal, saveAllocation, openCostCenterModal, saveCC, deleteCC,
    openCostImportModal, previewCostImport, saveCostImport,
    openPurchaseModal, savePurchase, openActualModal, saveActual, saveVarianceExplanation,
    boqFromMaster, saveBoqFromMaster, filterBoqMasterItems, calcBoqMasterTotal, toggleBoqMasterLine, downloadBoqAttachment, boqImport, saveBoqImport, viewBoq, createBoqRevision, saveBoqRevisionItem, setBoqBaseline, downloadReport,
    openMilestoneModal, saveMilestone, openMilestoneTemplateModal, saveMilestoneTemplate, saveCurrentMilestonesAsTemplate, importMilestoneTemplateFile, cloneMilestoneTemplate,
    planBackwardFromHandover, saveBackwardPlan,
    openTaskModal, saveTask, deleteTask, deleteSubTask, openTaskUpdateModal, onUpdateTaskChange, saveTaskUpdate, downloadTaskEvidence, openTaskHistory,
    openDependencyModal, saveDependency,
    openCreateSubTaskModal: (p, s) => openCreateSubTaskModal(p, s),
    saveSubTask: (e) => handleCreateSubTask(e),
    refreshPlanning: () => pageTasks('planning'),
    openIssueModal, saveIssue, commentIssue, escalateIssue,
    openNotifyModal, saveNotify, openEscRuleModal, saveEscRule, setEscRuleActive,
    refreshNotifications: () => pageNotifications(),
    loadPortfolio, loadComparable, runComparable, openReportModal, saveReport,
    openMonthlyReport, generateMonthlyReport, printMonthlyReport,
    openReportExportModal: (t) => typeof openReportExportModal === 'function' && openReportExportModal(t),
    openAddDailyReportModal: (s) => typeof openAddDailyReportModal === 'function' && openAddDailyReportModal(s),
    openInventoryModal, saveInventory, generateHandoverReport, closeProject, saveCloseProject,
    boot
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
