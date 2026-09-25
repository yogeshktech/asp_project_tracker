// Full API UI modules — replaces page .content with live Swagger-backed screens
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);

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
    return `<button class="btn sm" onclick="event.stopPropagation(); WTPages.openDependencyModal('${kind}', ${id})">${has ? 'Undepend' : 'Depend'}</button>`;
  }
  function wtUpdateBtnHtml(taskId, subId, row) {
    if (wtRowBlocked(row)) {
      return `<button class="btn sm" disabled title="${esc(wtRowBlockReason(row) || 'Waiting on dependency')}">Waiting</button>`;
    }
    const extra = subId ? `, ${subId}` : '';
    return `<button class="btn sm" onclick="event.stopPropagation(); WTPages.openTaskUpdateModal(${taskId}${extra})"><i class="fa-solid fa-pen"></i> Update</button>`;
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
        canDelete: !!r.delete
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
            const cur = st.rights[key] || { view: false, edit: false, update: false, delete: false };
            return `<tr>
              <td>${esc(row.name)}</td>
              ${PERM_RIGHTS.map(r => `<td class="center">
                <input type="checkbox" class="perm-switch" data-pid="${row.projectId}" data-module="${row.module}" data-right="${r.id}" ${cur[r.id] ? 'checked' : ''} onchange="WTPages.onUserPermToggle(this)">
              </td>`).join('')}
            </tr>`;
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
        delete: permFlag(p, 'delete')
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
            <td>${p.budget || '₹10.00 Cr'}</td>
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

        <div class="grid g2">
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
          <td>${t.id}</td><td>${esc(t.name)}</td><td>${esc(t.description || '—')}</td>
          <td><button class="btn sm danger" onclick="WTPages.deleteType(${t.id})"><i class="fa-solid fa-trash"></i></button></td>
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
    openModal('Create Project Type', `
      <form onsubmit="WTPages.saveType(event)">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="typeName" required></div>
          <div class="field full"><label>Description</label><input id="typeDesc"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save</button></div>
      </form>`);
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
            <span class="kpi-label">Allocated Budget</span>
            <span class="kpi-value" id="projBudgetTotal">₹48.50 Cr</span>
            <span class="kpi-sub" id="projSpentTotal">₹34.20 Cr Committed</span>
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

      // Update KPI strip
      $('#projResortLabel').textContent = filterVal === 'all' ? 'All Resorts Portfolio' : matchedResort.name;
      $('#projResortCode').textContent = filterVal === 'all' ? `${filteredProjects.length} Total Packages` : (matchedResort.code || 'RES');
      $('#projActiveCount').textContent = `${filteredProjects.length} Packages`;

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
                  <small style="color:var(--text-muted); font-size:11.5px;">${relationTxt} · WBS: <code>${esc(node.code || '')}</code> · Discipline: <b>${esc(node.discipline || node.disc || 'General')}</b> · Lead: <b>${esc(node.owner || node.ownerName || 'Lead PM')}</b> · Budget: <b>${node.budget || '₹5.00 Cr'}</b></small>
                </div>
                <div class="tree-meta">
                  <div class="progress ${progColor}" style="width:60px; margin:0;"><i style="width:${prog}%"></i></div>
                  <span>${prog}%</span>
                  <span class="badge ${node.healthBadge || (prog>=80?'green':prog>=50?'blue':'amber')}">${esc(node.health || node.status || 'Active')}</span>
                  <button class="btn sm primary" title="Add Child Sub-Package" onclick="event.stopPropagation(); openCreateProjectModal('${node.id}');"><i class="fa-solid fa-plus"></i> ${addBtnTxt}</button>
                  <button class="btn sm" title="Edit Package" onclick="event.stopPropagation(); openEditProjectModal('${node.id}');"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn sm danger" title="Delete Package" onclick="event.stopPropagation(); confirmDeleteProject('${node.id}');"><i class="fa-solid fa-trash"></i></button>
                  <a href="project-detail.html" class="btn sm" title="Open Workspace" onclick="event.stopPropagation(); localStorage.setItem('WISETRACK_SELECTED_PROJECT','${node.id}');">Open ➔</a>
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
                <small>Master Resort Property · Total CapEx Budget: ${matchedResort.budget || '₹48.50 Cr'} · ${filteredProjects.length} Nested Packages</small>
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
            <td>${p.budget || '₹5.00 Cr'}</td>
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
                <button class="btn sm" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${p.id}');location.href='project-detail.html'">Workspace</button>
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
              <span>Budget: <b>${p.budget || '₹5.00 Cr'}</b></span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <div class="btn-group">
                <button class="btn sm primary" title="Add Child Sub-Package" onclick="openCreateProjectModal('${p.id}')"><i class="fa-solid fa-plus"></i></button>
                <button class="btn sm" onclick="openEditProjectModal('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn sm danger" onclick="confirmDeleteProject('${p.id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
              <a href="project-detail.html" class="btn sm primary" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${p.id}')">Workspace ➔</a>
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

    el.innerHTML = pageHead('Project Workspace', 'Team assignment & project detail workspace', picker)
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

    const localProjects = (() => {
      try { return typeof getProjects === 'function' ? getProjects() : []; }
      catch (_) { return []; }
    })();
    let apiProjects = [];
    try {
      apiProjects = await WisetrackAPI.getProjects().catch(() => []);
    } catch (e) {
      apiProjects = [];
    }

    const allMerged = [...(apiProjects || []), ...(localProjects || [])];
    if (!allMerged.length) {
      $('#projDetailBox').innerHTML = `<div style="color:var(--text-muted);padding:24px;text-align:center;">No projects found. Please create a project first.</div>`;
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
        p = allMerged.find(x => String(x.id) === String(pid) || x.code === pid || String(x.id) === String(pid).replace('PRJ-', ''));
      }
    }

    // 2. Fallback to first available project
    if (!p) {
      p = allMerged[0];
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
          <h3 style="font-size:18px; font-weight:800; margin:0 0 4px;">${esc(p.name || p.title)}</h3>
          <p style="color:var(--text-muted); font-size:12px; margin:0;">Code: <code>${esc(p.code || '')}</code> · Discipline: <b>${esc(p.discipline || p.disc || 'General')}</b></p>
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
        <div><b>Allocated Budget:</b> ${esc(p.budget || '₹5.00 Cr')}</div>
        <div><b>Committed Spent:</b> ${esc(p.spent || '₹0.00 Cr')}</div>
        <div><b>Assigned Lead:</b> ${esc(p.owner || p.ownerName || 'Rahul Sharma')}</div>
        <div><b>Schedule:</b> ${esc(p.startDate || '2026-09-01')} ➔ ${esc(p.endDate || '2026-12-31')}</div>
      </div>

      <div>
        <strong style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Scope & Deliverables:</strong>
        <p style="font-size:13px; margin:6px 0 0; line-height:1.5;">${esc(p.desc || p.description || 'Deliverables, milestones, and engineering specifications for this package.')}</p>
      </div>
      
      <div style="margin-top:16px; border-top:1px solid var(--border-color); padding-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn sm primary" onclick="openCreateProjectModal('${p.id}')"><i class="fa-solid fa-plus"></i> + Add Sub-Package</button>
        <button class="btn sm" onclick="openEditProjectModal('${p.id}')"><i class="fa-solid fa-pen"></i> Edit Package</button>
        <a class="btn sm" href="planning.html">Tasks</a>
        <a class="btn sm" href="budget.html">Budget</a>
        <a class="btn sm" href="issues.html">Issues</a>
        <a class="btn sm" href="costs.html">Costs</a>
      </div>
      <div id="wsExtra" style="margin-top:16px;"></div>
    `;

    $('#teamUserId').innerHTML = users.map(u => `<option value="${u.id}">${esc(u.fullName || u.name)} (${esc(u.email)})</option>`).join('') || '<option>No users</option>';
    const numericPid = Number(p.id);
    try {
      const [team, variance, exceptions, explanations] = await Promise.all([
        WisetrackAPI.getProjectTeam(numericPid).catch(() => []),
        WisetrackAPI.getVariance(numericPid).catch(() => null),
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
    el.innerHTML = pageHead('Item / Brand / Unit / Category Master', 'CRUD /api/items*',
      `<button class="btn" onclick="WTPages.openBrandModal()">Brand</button>
       <button class="btn" onclick="WTPages.openUnitModal()">Unit</button>
       <button class="btn" onclick="WTPages.openCategoryModal()">Category</button>
       <button class="btn primary" onclick="WTPages.openItemModal()"><i class="fa-solid fa-plus"></i> Item</button>`)
      + tableWrap(['ID', 'Code', 'Name', 'Price', 'Brand', 'Unit', 'Actions'], 'itemsBody')
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
          <td class="table-actions">
            <button class="btn sm" onclick="WTPages.openItemModal(${it.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" onclick="WTPages.deleteItem(${it.id})"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join('') : emptyRow(7, 'No items');
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
          ${id ? `<div class="field"><label>Code (auto)</label><input id="itCode" value="${esc(it.itemCode || '')}" readonly></div>` : `<p class="card-subtitle" style="grid-column:1/-1;margin:0">Item code auto-assigns on save (ITM-001).</p>`}
          <div class="field"><label>Name *</label><input id="itName" value="${esc(it.name || '')}" required></div>
          <div class="field"><label>Unit Price *</label><input id="itPrice" type="number" step="0.01" value="${it.unitPrice || 0}" required></div>
          <div class="field"><label>Unit</label><select id="itUnit"><option value="">—</option>${units.map(u => `<option value="${u.id}" ${it.unitId == u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Brand</label><select id="itBrand"><option value="">—</option>${brands.map(b => `<option value="${b.id}" ${it.brandId == b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Category</label><select id="itCat"><option value="">—</option>${cats.map(c => `<option value="${c.id}" ${it.categoryId == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field full"><label>Description</label><textarea id="itDesc">${esc(it.description || '')}</textarea></div>
          <div class="field full"><label>Image URL</label><input id="itImg" value="${esc(it.imageUrl || '')}" placeholder="/uploads/... or https://..."></div>
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
      unitId: $('#itUnit').value ? Number($('#itUnit').value) : null,
      brandId: $('#itBrand').value ? Number($('#itBrand').value) : null,
      categoryId: $('#itCat').value ? Number($('#itCat').value) : null,
      description: $('#itDesc')?.value.trim() || null,
      imageUrl: $('#itImg')?.value.trim() || null
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
      + tableWrap(['ID', 'Name', 'Approved', 'Currency', 'RAG%', 'Actions'], 'budgetBody')
      + tableWrap(['ID', 'Code', 'Name', 'Project', 'Actions'], 'ccBody');
    if (!pid) {
      $('#budgetBody').innerHTML = emptyRow(6, 'No project available.');
      $('#ccBody').innerHTML = emptyRow(5, 'No project available.');
      return;
    }
    try {
      const [budgets, ccs] = await Promise.all([WisetrackAPI.getBudgets(pid), WisetrackAPI.getCostCenters(pid)]);
      $('#budgetBody').innerHTML = (budgets || []).map(b => `
        <tr>
          <td>${b.id}</td><td>${esc(b.name)}</td><td>₹${Number(b.approvedAmount || 0).toLocaleString('en-IN')}</td>
          <td>${esc(b.currency || 'INR')}</td><td>${b.ragAmberPercent || 80}</td>
          <td><button class="btn sm" onclick="WTPages.reviseBudget(${b.id})">Revise</button></td>
        </tr>`).join('') || emptyRow(6, 'No budgets');
      $('#ccBody').innerHTML = (ccs || []).map(c => `
        <tr><td>${c.id}</td><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${c.projectId || '—'}</td>
        <td><button class="btn sm danger" onclick="WTPages.deleteCC(${c.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`
      ).join('') || emptyRow(5, 'No cost centers');
    } catch (e) {
      $('#budgetBody').innerHTML = errRow(6, e);
      $('#ccBody').innerHTML = errRow(5, e);
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
    const amt = prompt('New total amount?');
    if (!amt) return;
    try {
      await WisetrackAPI.reviseBudget(id, { totalAmount: Number(amt), remarks: 'UI revise' });
      showToast('Revised'); await pageBudget();
    } catch (e) { showToast(e.message, 'danger'); }
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
  async function pageCosts() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Purchases, Actuals & Variance', '/api/costs', picker +
      ` <button class="btn" onclick="WTPages.openPurchaseModal()">+ Purchase</button>
        <button class="btn primary" onclick="WTPages.openActualModal()">+ Actual</button>`)
      + `<div class="card" id="varianceBox">Variance loading...</div>`
      + tableWrap(['ID', 'Type', 'Amount', 'Date', 'Notes'], 'costsBody');
    if (!pid) {
      $('#varianceBox').innerHTML = 'No project available.';
      $('#costsBody').innerHTML = emptyRow(5, 'No project available.');
      return;
    }
    try {
      const [purchases, actuals, variance] = await Promise.all([
        WisetrackAPI.getPurchases(pid), WisetrackAPI.getActuals(pid), WisetrackAPI.getVariance(pid)
      ]);
      const explanations = await WisetrackAPI.getVarianceExplanations(pid).catch(() => []);
      $('#varianceBox').innerHTML = `
        <div class="grid g4">
          <div><div class="kpi-label">Approved</div><strong>₹${Number(variance.approvedBudget || 0).toLocaleString('en-IN')}</strong></div>
          <div><div class="kpi-label">Purchase</div><strong>₹${Number(variance.purchaseTotal || 0).toLocaleString('en-IN')}</strong></div>
          <div><div class="kpi-label">Actual</div><strong>₹${Number(variance.actualTotal || 0).toLocaleString('en-IN')}</strong></div>
          <div><div class="kpi-label">RAG</div><span class="badge ${variance.ragStatus === 'Red' ? 'red' : variance.ragStatus === 'Amber' ? 'amber' : 'green'}">${esc(variance.ragStatus)}</span></div>
        </div>
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
      const rows = [
        ...(purchases || []).map(x => ({ ...x, _t: 'Purchase' })),
        ...(actuals || []).map(x => ({ ...x, _t: 'Actual' }))
      ];
      $('#costsBody').innerHTML = rows.length ? rows.map(r => `
        <tr><td>${r.id}</td><td>${r._t}</td><td>₹${Number(r.amount || r.totalAmount || 0).toLocaleString('en-IN')}</td>
        <td>${esc(r.costDate || r.purchaseDate || r.createdAt || '—')}</td><td>${esc(r.remarks || r.notes || '—')}</td></tr>`
      ).join('') : emptyRow(5, 'No cost entries');
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
    openModal('Add Purchase', `
      <form onsubmit="WTPages.savePurchase(event)">
        <input type="hidden" id="pProj" value="${pid}">
        <div class="form-grid">
          <div class="field"><label>Amount *</label><input id="pAmt" type="number" step="0.01" required></div>
          <div class="field"><label>Date</label><input id="pDate" type="date"></div>
          <div class="field full"><label>Remarks</label><input id="pRem"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function savePurchase(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.addPurchase({
        projectId: Number($('#pProj').value),
        amount: Number($('#pAmt').value),
        purchaseDate: $('#pDate').value || null,
        description: $('#pRem').value.trim()
      });
      closeModal(); showToast('Purchase saved'); await pageCosts();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openActualModal() {
    const pid = await selectedProjectId();
    openModal('Add Actual Cost', `
      <form onsubmit="WTPages.saveActual(event)">
        <input type="hidden" id="aProj" value="${pid}">
        <div class="form-grid">
          <div class="field"><label>Amount *</label><input id="aAmt" type="number" step="0.01" required></div>
          <div class="field"><label>Date</label><input id="aDate" type="date"></div>
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
        amount: Number($('#aAmt').value),
        costDate: $('#aDate').value || null,
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
      + tableWrap(['ID', 'Title', 'Status', 'Actions'], 'boqBody');
    if (!pid) {
      $('#boqBody').innerHTML = emptyRow(4, 'No project available.');
      return;
    }
    try {
      const scopeIds = await projectScopeIds(pid);
      const batches = await Promise.all(scopeIds.map(id => WisetrackAPI.getBoqs(id).catch(() => [])));
      const list = batches.flat();
      $('#boqBody').innerHTML = list.length ? list.map(b => `
        <tr><td>${b.id}</td><td>${esc(b.title || b.name || 'BOQ')}</td><td>${esc(b.status || '—')}</td>
        <td><button class="btn sm" onclick="WTPages.viewBoq(${b.id})">View</button></td></tr>`
      ).join('') : emptyRow(4, 'No BOQ — import or create from master');
    } catch (e) { $('#boqBody').innerHTML = errRow(4, e); }
  }

  async function boqFromMaster() {
    const pid = await selectedProjectId();
    const items = await WisetrackAPI.getItems();
    if (!items.length) { showToast('Create items first', 'danger'); return; }
    const ids = items.slice(0, 20).map(i => i.id);
    try {
      await WisetrackAPI.createBoqFromMaster(pid, ids);
      showToast('BOQ created from master'); await pageBoq();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function boqImport() {
    const pid = await selectedProjectId();
    openModal('Import BOQ (flexible vendor file)', `
      <form onsubmit="WTPages.saveBoqImport(event)">
        <input type="hidden" id="boqProj" value="${pid}">
        <div class="field"><label>Title *</label><input id="boqTitle" value="Imported BOQ" required></div>
        <div class="field"><label>CSV / TSV from 3rd party (any column names)</label>
          <input type="file" id="boqFile" accept=".csv,.txt,.tsv">
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
      let text = ($('#boqJson').value || '').trim();
      const file = $('#boqFile')?.files?.[0];
      if (file) text = await file.text();
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
      const commit = commitFlag !== false;
      const result = await WisetrackAPI.importBoq({
        projectId: Number($('#boqProj').value),
        title: $('#boqTitle').value.trim(),
        commit,
        lines
      });
      if (!result.isValid && (result.errors || []).length) {
        const csv = 'Row,Field,Message\n' + result.errors.map(er =>
          `${er.row || er.Row},"${er.field || er.Field}","${er.message || er.Message}"`).join('\n');
        if (typeof wtDownloadText === 'function') wtDownloadText('boq-validation-errors.csv', csv);
        showToast(`${result.errorCount || result.errors.length} validation errors — report downloaded`, 'danger');
        return;
      }
      if (!commit) {
        showToast('Validation passed. Click Import to commit.');
        return;
      }
      closeModal(); showToast('Imported'); await pageBoq();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function viewBoq(id) {
    try {
      const b = await WisetrackAPI.getBoq(id);
      const versions = b.versions || b.Versions || [];
      const latest = versions.slice().sort((a, c) => (c.versionNo || c.VersionNo || 0) - (a.versionNo || a.VersionNo || 0))[0];
      const items = latest?.items || latest?.Items || b.items || b.Items || [];
      openModal(`BOQ — ${esc(b.title || b.name || '#' + id)}`, `
        <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="badge blue">${esc(b.status || 'Draft')}</span>
          <span class="badge gray">Version ${latest?.versionNo || latest?.VersionNo || versions.length || 1}</span>
          ${latest?.remarks || latest?.Remarks ? `<small style="color:var(--text-muted)">${esc(latest.remarks || latest.Remarks)}</small>` : ''}
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th><th>Remarks</th></tr></thead>
          <tbody>
            ${items.length ? items.map(it => `
              <tr>
                <td>${it.lineNo ?? it.LineNo ?? it.id ?? '—'}</td>
                <td>${esc(it.description || it.Description || it.itemName || '—')}</td>
                <td>${it.quantity ?? it.Quantity ?? 0}</td>
                <td>₹${Number(it.unitPrice ?? it.UnitPrice ?? 0).toLocaleString('en-IN')}</td>
                <td><strong>₹${Number(it.amount ?? it.Amount ?? 0).toLocaleString('en-IN')}</strong></td>
                <td>${esc(it.remarks || it.Remarks || '—')}</td>
              </tr>`).join('') : `<tr><td colspan="6">No line items</td></tr>`}
          </tbody>
        </table></div>
      `);
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
            <button class="btn primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Submit Daily Update</button>`
        : ` <button class="btn" onclick="WTPages.openCreateSubTaskModal()"><i class="fa-solid fa-plus"></i> Sub / Child</button>
            <button class="btn primary" onclick="WTPages.openTaskModal()">+ Task</button>
            <button class="btn" onclick="WTPages.openTaskUpdateModal()">+ Progress Update</button>`))
      + (kind === 'daily' ? `<div id="dailyVisualCharts" style="margin-bottom:16px;"></div>` : '')
      + tableWrap(kind === 'milestones'
        ? ['ID', 'Title & Package', 'Status', 'Progress', 'Actions']
        : ['ID', 'Task', 'Sub-Task', 'Child Task', 'Other', 'Status', 'Progress', 'Actions'], 'tasksBody')
      + `<div class="card" id="excBox" style="margin-top:16px;"><h3 class="card-title">⚠️ Site Exception & Impediment Radar</h3><div id="excList">Loading...</div></div>`;
    
    const nestCols = 8;
    if (!pid) {
      $('#tasksBody').innerHTML = emptyRow(kind === 'milestones' ? 5 : nestCols, 'No project available. Create / open a project first.');
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
        $('#tasksBody').innerHTML = ms.length ? ms.map(m => {
          const pct = progressOf(m);
          return `
          <tr>
            <td>${m.id}</td>
            <td><strong>${esc(m.name || m.title)}</strong><small style="display:block;color:var(--text-muted)">${esc(nameOf(m._projectId || pid))}</small></td>
            <td>${esc(m.status || '—')}</td>
            <td>${pct}%</td><td>—</td>
          </tr>`;
        }).join('') : emptyRow(5, `No milestones for ${selectedLabel}. Other projects are hidden.`);
      } else {
        const batches = await Promise.all(scopeIds.map(id => WisetrackAPI.getTasks(id).catch(() => [])));
        const tasks = filterRowsForProject(
          batches.flatMap((rows, i) => (typeof wtAsArray === 'function' ? wtAsArray(rows) : (rows || [])).map(t => ({ ...t, _projectId: scopeIds[i] }))),
          pid
        );
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
            <small style="display:block;color:var(--text-muted)">Owner: ${esc(userName(s.assignedTo || s.AssignedTo))} · Due: ${esc(dueLabel)}</small>`;
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
                ${wtDepLineHtml(t)}
              </td>
              ${nestCells(0, dash)}
              <td><span class="badge ${wtRowBlocked(t) ? 'amber' : statusBadge(t.status, pct)}">${wtRowBlocked(t) ? 'Waiting' : esc(formatStatus(t.status))}</span></td>
              ${progressCell(t, pct)}
              <td class="table-actions">
                ${wtUpdateBtnHtml(t.id, null, t)}
                ${kind === 'planning' ? `<button class="btn sm primary" onclick="WTPages.openCreateSubTaskModal(${t.id})"><i class="fa-solid fa-plus"></i> Sub-Task</button>` : ''}
                ${kind === 'planning' ? wtDepBtnHtml('task', t.id, t) : ''}
                ${kind === 'planning' && (t.canDelete || t.CanDelete) ? `<button class="btn sm danger" onclick="WTPages.deleteTask(${t.id}, '${esc(t.title || t.name)}')"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
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
                  ${kind === 'planning' ? `<button class="btn sm primary" onclick="WTPages.openCreateSubTaskModal(${t.id}, ${s.id})"><i class="fa-solid fa-plus"></i> ${addLabel}</button>` : ''}
                  ${kind === 'planning' ? wtDepBtnHtml('sub', s.id, s) : ''}
                  ${(s.canDelete || s.CanDelete) ? `<button class="btn sm danger" onclick="WTPages.deleteSubTask(${s.id}, '${esc(s.title || s.name)}')"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
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
      $('#tasksBody').innerHTML = errRow(kind === 'milestones' ? 5 : 8, e);
      $('#excList').innerHTML = `<p style="color:#dc2626">${esc(e.message)}</p>`;
      showToast(e.message, 'danger');
    }
  }

  async function openMilestoneModal() {
    const pid = await selectedProjectId();
    openModal('Create Milestone', `
      <form onsubmit="WTPages.saveMilestone(event)">
        <input type="hidden" id="mProj" value="${pid}">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="mName" required></div>
          <div class="field full"><label>Description</label><textarea id="mDesc" placeholder="Optional notes / backward-plan step"></textarea></div>
          <div class="field"><label>Start Date</label><input id="mStart" type="date"></div>
          <div class="field"><label>Target Date</label><input id="mDate" type="date"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveMilestone(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createMilestone({
        projectId: Number($('#mProj').value),
        name: $('#mName').value.trim(),
        description: $('#mDesc')?.value.trim() || null,
        startDate: $('#mStart')?.value || null,
        dueDate: $('#mDate').value || null
      });
      closeModal(); showToast('Milestone created'); await pageTasks('milestones');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openMilestoneTemplateModal() {
    const pid = await selectedProjectId();
    let templates = [];
    try { templates = await WisetrackAPI.getTemplates(); } catch { templates = []; }
    openModal('Milestone templates', `
      <div class="form-grid">
        <div class="field full">
          <label>Clone saved template into this project</label>
          <select id="msTpl">${(templates || []).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('') || '<option value="">None saved yet</option>'}</select>
        </div>
        <div class="field full">
          <label>Or paste names from Excel / MSP export (one per line)</label>
          <textarea id="msTplNames" rows="5" placeholder="Procurement&#10;Manufacture&#10;Shipment&#10;Installation&#10;Commissioning&#10;Handover"></textarea>
        </div>
        <div class="field"><label>Save as template name</label><input id="msTplName" placeholder="MEP handover pack"></div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn" onclick="WTPages.cloneMilestoneTemplate()">Clone into project</button>
        <button type="button" class="btn primary" onclick="WTPages.saveMilestoneTemplate()">Save template</button>
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

  async function cloneMilestoneTemplate() {
    const templateId = Number($('#msTpl')?.value);
    const pid = window._wtMsTplProject;
    const pasted = ($('#msTplNames')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    try {
      if (pasted.length && !templateId) {
        const saved = await WisetrackAPI.saveTemplate({ name: `Import ${new Date().toISOString().slice(0, 10)}`, templateJson: JSON.stringify(pasted) });
        await WisetrackAPI.cloneTemplate({ templateId: saved.id || saved.Id, projectId: pid });
      } else {
        if (!templateId) { showToast('Select a template or paste names.', 'danger'); return; }
        await WisetrackAPI.cloneTemplate({ templateId, projectId: pid });
      }
      closeModal(); showToast('Milestones cloned'); await pageTasks('milestones');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function planBackwardFromHandover() {
    const pid = await selectedProjectId();
    if (!pid) { showToast('Select a project first', 'danger'); return; }
    let handover = '';
    try {
      const p = await WisetrackAPI.getProject(pid);
      handover = String(p.endDate || p.EndDate || '').slice(0, 10);
    } catch (_) { /* date filled by user */ }
    openModal('Plan backward from handover (PM-17)', `
      <form onsubmit="WTPages.saveBackwardPlan(event)">
        <input type="hidden" id="bwProj" value="${pid}">
        <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Creates the standard chain from the handover date backward: Procurement → Payment → Manufacture → Shipment → Arrival → Installation → Commissioning → Handover.</p>
        <div class="form-grid">
          <div class="field"><label>Handover / opening date *</label><input id="bwHandover" type="date" value="${esc(handover)}" required></div>
          <div class="field"><label>Days per step</label><input id="bwDays" type="number" min="1" value="14"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Create chain</button></div>
      </form>`);
  }

  async function saveBackwardPlan(e) {
    e.preventDefault();
    const pid = Number($('#bwProj').value);
    const handover = $('#bwHandover').value;
    const stepDays = Math.max(1, Number($('#bwDays').value) || 14);
    if (!pid || !handover) { showToast('Handover date required', 'danger'); return; }
    const steps = ['Procurement', 'Payment', 'Manufacture / readiness', 'Shipment', 'Arrival / transfer', 'Installation', 'Commissioning', 'Handover'];
    const end = new Date(handover + 'T00:00:00');
    try {
      for (let i = 0; i < steps.length; i++) {
        const due = new Date(end);
        due.setDate(due.getDate() - ((steps.length - 1 - i) * stepDays));
        const start = new Date(due);
        start.setDate(start.getDate() - stepDays);
        await WisetrackAPI.createMilestone({
          projectId: pid,
          name: steps[i],
          description: 'Backward-scheduled from handover (PM-17)',
          startDate: start.toISOString().slice(0, 10),
          dueDate: due.toISOString().slice(0, 10)
        });
      }
      closeModal();
      showToast('Backward plan created');
      await pageTasks('milestones');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openTaskModal() {
    const pid = await selectedProjectId();
    const currentUserId = localStorage.getItem('WISETRACK_USER_ID') || '';
    let ownerOpts = '<option value="">Unassigned</option>';
    let dependOpts = '<option value="">None — can start anytime</option>';
    try {
      const loaded = typeof wtLoadLiveTasksAndOwners === 'function'
        ? await wtLoadLiveTasksAndOwners()
        : { owners: [], tasks: [] };
      const owners = loaded.owners || [];
      ownerOpts = (owners.length ? owners : []).map(u => {
        const selected = String(u.id) === String(currentUserId) ? 'selected' : '';
        return `<option value="${u.id}" ${selected}>${esc(u.fullName)} (${esc(u.role || 'Team')})</option>`;
      }).join('') || `<option value="${esc(currentUserId)}" selected>Me</option>`;
      dependOpts += wtBuildDependOptions(loaded.tasks || [], null, null);
    } catch (_) { /* keep fallback */ }
    const adminDep = (typeof wtIsAdmin === 'function' && wtIsAdmin())
      ? `<div class="field full"><label>Depends on (optional)</label><select id="tDepend">${dependOpts}</select>
         <small style="color:var(--text-muted)">Until that item is finished, this task cannot be started.</small></div>`
      : '';
    openModal('Create Task', `
      <form onsubmit="WTPages.saveTask(event)">
        <input type="hidden" id="tProj" value="${pid}">
        <div class="form-grid">
          <div class="field full"><label>Title *</label><input id="tTitle" required></div>
          <div class="field full"><label>Assign to user *</label><select id="tOwner">${ownerOpts}</select></div>
          ${adminDep}
          <div class="field full"><label>Description</label><textarea id="tDesc"></textarea></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
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
      await WisetrackAPI.createTask({
        projectId: Number($('#tProj').value),
        title: $('#tTitle').value.trim(),
        description: $('#tDesc').value.trim(),
        assignedTo: Number($('#tOwner')?.value) || Number(localStorage.getItem('WISETRACK_USER_ID')) || null,
        dependsOnTaskId: dep.dependsOnTaskId,
        dependsOnSubTaskId: dep.dependsOnSubTaskId
      });
      closeModal(); showToast('Task created'); await pageTasks('planning');
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
            <label>Remark / delay reason</label>
            <input id="tuRem" placeholder="Site issues, delay reasons...">
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
        remarks: [($('#tuRem').value || '').trim(), ($('#tuNotes')?.value || '').trim()].filter(Boolean).join(' | ') || null
      };
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
      MilestoneOverdue: 'Milestone overdue',
      TaskInactive7Days: 'Task inactive 7 days',
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
      + tableWrap(['ID', 'Rule', 'Trigger', 'Delay (hrs)', 'Target Role', 'Status', 'Created'], 'escBody');
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
          <td><span class="badge ${r.isActive === false ? 'gray' : 'green'}">${r.isActive === false ? 'Inactive' : 'Active'}</span></td>
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
            <select id="erTrigger">
              <option value="BudgetRagAmber">Budget CC ≥80% (Amber)</option>
              <option value="BudgetRagRed">Budget CC ≥100% (Red)</option>
              <option value="IssueHighPriority">High / Critical issue</option>
              <option value="MilestoneOverdue">Milestone overdue</option>
              <option value="TaskInactive7Days">Task inactive 7 days</option>
            </select>
          </div>
          <div class="field"><label>Delay (hours)</label><input id="erDelay" type="number" min="0" value="0"></div>
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

  // ---------- REPORTS ----------
  async function pageReports() {
    const el = root();
    el.innerHTML = pageHead('Executive Reports & Exports (PM-28)', '/api/reports',
      `<button class="btn" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-sliders"></i> Custom Export & Send</button>
       <button class="btn" onclick="WTPages.loadPortfolio()"><i class="fa-solid fa-chart-pie"></i> View Portfolio</button>
       <button class="btn" onclick="WTPages.loadComparable()">Comparable projects</button>
       <button class="btn primary" onclick="WTPages.openReportModal()">+ Report Config</button>`)
      + tableWrap(['ID', 'Name', 'Type', 'Actions'], 'reportsBody')
      + `<div class="card" id="reportOut" style="margin-top:12px"><em>Select "Custom Export & Send" to customize columns and send to internal team only, or click View Portfolio for a live status table.</em></div>`;
    try {
      const list = await WisetrackAPI.getReports();
      const rows = Array.isArray(list) ? list : (list?.items || list?.data || []);
      $('#reportsBody').innerHTML = rows.length ? rows.map(r => `
        <tr><td>${r.id}</td><td>${esc(r.name || r.title)}</td><td>${esc(r.reportType || r.type || '—')}</td>
        <td><button class="btn sm primary" onclick="openReportExportModal('${esc(r.reportType || 'portfolio').toLowerCase()}')">Export ➔</button></td></tr>`
      ).join('') : emptyRow(4, 'No saved report configs');
    } catch (e) { $('#reportsBody').innerHTML = errRow(4, e); }
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

  async function loadComparable() {
    try {
      const rows = await WisetrackAPI.getComparableProjects({});
      const list = Array.isArray(rows) ? rows : [];
      const showMoney = typeof wtCanViewModule !== 'function' || wtCanViewModule('Budgets') || wtCanViewModule('Costs');
      $('#reportOut').innerHTML = list.length ? `
        <h3 class="card-title">${showMoney ? 'Comparable completed projects' : 'Comparable projects (financials hidden for this user)'}</h3>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Project</th><th>Type</th>${showMoney ? '<th>Budget</th><th>Actual</th>' : ''}<th>Duration</th></tr></thead>
          <tbody>${list.map(r => `<tr>
            <td>${esc(r.name || r.Name)}</td>
            <td>${esc(r.projectType || r.ProjectType || '—')}</td>
            ${showMoney ? `<td>₹${Number(r.approvedBudget || r.ApprovedBudget || 0).toLocaleString('en-IN')}</td>
            <td>₹${Number(r.actualCost || r.ActualCost || 0).toLocaleString('en-IN')}</td>` : ''}
            <td>${r.durationDays ?? r.DurationDays ?? '—'} days</td>
          </tr>`).join('')}</tbody>
        </table></div>` : '<p>No comparable closed projects yet.</p>';
    } catch (e) { showToast(e.message, 'danger'); }
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
      await WisetrackAPI.createReport({ name: $('#rName').value.trim(), reportType: $('#rType').value.trim() });
      closeModal(); showToast('Saved'); await pageReports();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- CLOSURE / INVENTORY ----------
  async function pageInventory() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Inventory & Project Closure', 'Leftover inventory + signed PCR required. Only Project Manager can close.', picker +
      ` <button class="btn" onclick="WTPages.openInventoryModal()">+ Inventory Item</button>
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
        <div class="form-grid">
          <div class="field full"><label>Item Name *</label><input id="invName" required></div>
          <div class="field"><label>Quantity *</label><input id="invQty" type="number" step="0.01" required></div>
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

  // ---------- ROUTER ----------
  async function boot() {
    try {
      if (typeof requireAuth === 'function' && !requireAuth()) return;
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
    openUserModal, saveUser, toggleUserAdmin, switchUserPermTab, addUserPermProject, removeUserPermProject, onUserPermToggle, fillPermProjectSelect,
    openPropertyModal, saveProperty, deleteProperty, openTypeModal, saveType, deleteType,
    addTeam, saveWorkspaceVariance,
    openItemModal, saveItem, deleteItem, openBrandModal, openUnitModal, openCategoryModal,
    deleteBrand, deleteUnit, deleteCategory, refreshItemsAll,
    openBudgetModal, saveBudget, reviseBudget, openCostCenterModal, saveCC, deleteCC,
    openPurchaseModal, savePurchase, openActualModal, saveActual, saveVarianceExplanation,
    boqFromMaster, boqImport, saveBoqImport, viewBoq,
    openMilestoneModal, saveMilestone, openMilestoneTemplateModal, saveMilestoneTemplate, cloneMilestoneTemplate,
    planBackwardFromHandover, saveBackwardPlan,
    openTaskModal, saveTask, deleteTask, deleteSubTask, openTaskUpdateModal, onUpdateTaskChange, saveTaskUpdate,
    openDependencyModal, saveDependency,
    openCreateSubTaskModal: (p, s) => openCreateSubTaskModal(p, s),
    saveSubTask: (e) => handleCreateSubTask(e),
    refreshPlanning: () => pageTasks('planning'),
    openIssueModal, saveIssue, commentIssue, escalateIssue,
    openNotifyModal, saveNotify, openEscRuleModal, saveEscRule,
    refreshNotifications: () => pageNotifications(),
    loadPortfolio, loadComparable, openReportModal, saveReport,
    openReportExportModal: (t) => typeof openReportExportModal === 'function' && openReportExportModal(t),
    openAddDailyReportModal: (s) => typeof openAddDailyReportModal === 'function' && openAddDailyReportModal(s),
    openInventoryModal, saveInventory, closeProject, saveCloseProject,
    boot
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
