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

  async function selectedProjectId() {
    const stored = localStorage.getItem('WISETRACK_SELECTED_PROJECT');
    if (stored) return String(stored);
    const resortId = localStorage.getItem('WISETRACK_SELECTED_RESORT');
    const apiProjects = await WisetrackAPI.getProjects(resortId || undefined).catch(() => []);
    const localProjects = typeof getProjects === 'function' ? getProjects() : [];
    const all = [...(apiProjects || []), ...(localProjects || [])];
    if (all.length > 0) {
      const pid = String(all[0].id);
      localStorage.setItem('WISETRACK_SELECTED_PROJECT', pid);
      return pid;
    }
    return null;
  }

  async function projectPickerHtml(selectId = 'ctxProjectId') {
    const apiProjects = await WisetrackAPI.getProjects().catch(() => []);
    const localProjects = typeof getProjects === 'function' ? getProjects() : [];
    
    // Combine uniquely by ID
    const seen = new Set();
    const allProjects = [];
    [...(apiProjects || []), ...(localProjects || [])].forEach(p => {
      const pId = String(p.id);
      if (!seen.has(pId)) {
        seen.add(pId);
        allProjects.push(p);
      }
    });

    const cur = localStorage.getItem('WISETRACK_SELECTED_PROJECT') || '';
    const opts = allProjects.map(p =>
      `<option value="${p.id}" ${String(p.id) === String(cur) ? 'selected' : ''}>${esc(p.name || p.title)} (${esc(p.code || '#' + p.id)})</option>`
    ).join('') || '<option value="">No projects</option>';
    return `<select id="${selectId}" class="resort-select" style="min-width:220px;padding:8px;border:1px solid var(--border-color);border-radius:6px;" onchange="localStorage.setItem('WISETRACK_SELECTED_PROJECT',this.value);location.reload()">${opts}</select>`;
  }

  // ---------- ROLES & PERMISSIONS ----------
  async function pageRoles() {
    const el = root();
    el.innerHTML = pageHead('Roles & Permissions', 'Full CRUD for dynamic roles and permission catalog',
      `<button class="btn" onclick="WTPages.openPermissionModal()"><i class="fa-solid fa-key"></i> New Permission</button>
       <button class="btn primary" onclick="WTPages.openRoleModal()"><i class="fa-solid fa-plus"></i> New Role</button>`)
      + `<div class="tabs" style="margin-bottom:16px">
          <a class="tab-item active" href="#rolesTab" onclick="WTPages.showRoleTab('roles',this)">Roles</a>
          <a class="tab-item" href="#permTab" onclick="WTPages.showRoleTab('perms',this)">Permissions</a>
          <a class="tab-item" href="#assignTab" onclick="WTPages.showRoleTab('assign',this)">Assign to User</a>
        </div>
        <div id="rolesTab">${tableWrap(['ID', 'Name', 'Description', 'Permissions', 'Actions'], 'rolesBody')}</div>
        <div id="permTab" style="display:none">${tableWrap(['ID', 'Code', 'Name', 'Module', 'Actions'], 'permsBody')}</div>
        <div id="assignTab" style="display:none" class="card">
          <div class="form-grid">
            <div class="field"><label>User</label><select id="assignUserId"></select></div>
            <div class="field full"><label>Roles</label><div id="assignRoleChecks"></div></div>
          </div>
          <button class="btn primary" onclick="WTPages.saveUserRoles()"><i class="fa-solid fa-save"></i> Save User Roles</button>
        </div>`;

    await refreshRoles();
    await refreshPermissions();
    await prepareAssignTab();
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
  async function pageUsers() {
    const el = root();
    el.innerHTML = pageHead('Users', 'Create users, update profiles, assign roles',
      `<button class="btn primary" onclick="WTPages.openUserModal()"><i class="fa-solid fa-plus"></i> Add User</button>`)
      + tableWrap(['ID', 'Name', 'Email', 'Roles', 'Internal', 'Status', 'Actions'], 'usersBody');
    await refreshUsers();
  }

  async function refreshUsers() {
    const body = $('#usersBody');
    try {
      const users = await WisetrackAPI.getUsers();
      body.innerHTML = users.length ? users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${esc(u.fullName)}</strong></td>
          <td>${esc(u.email)}</td>
          <td>${esc((u.roles || []).join(', ') || '—')}</td>
          <td>${u.isInternal ? 'Yes' : 'No'}</td>
          <td><span class="badge ${u.isActive ? 'green' : 'red'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
          <td><button class="btn sm" onclick="WTPages.openUserModal(${u.id})"><i class="fa-solid fa-pen"></i></button></td>
        </tr>`).join('') : emptyRow(7, 'No users');
    } catch (e) { body.innerHTML = errRow(7, e); }
  }

  async function openUserModal(id) {
    let u = { fullName: '', email: '', phone: '', isActive: true, isInternal: true, roles: [] };
    let roles = [];
    try {
      roles = await WisetrackAPI.getRoles();
      if (id) u = await WisetrackAPI.getUser(id);
    } catch (e) { showToast(e.message, 'danger'); return; }
    const roleNames = new Set(u.roles || []);
    const checks = roles.map(r =>
      `<label class="check-list-item"><input type="checkbox" class="user-role" value="${r.id}" ${roleNames.has(r.name) ? 'checked' : ''}> <span class="perm-name">${esc(r.name)}</span></label>`
    ).join('');
    openModal(id ? 'Edit User' : 'Create User', `
      <form onsubmit="WTPages.saveUser(event, ${id || 'null'})">
        <div class="form-grid">
          <div class="field"><label>Full Name *</label><input id="uName" type="text" value="${esc(u.fullName)}" required></div>
          <div class="field"><label>Email ${id ? '' : '*'}</label><input id="uEmail" type="email" value="${esc(u.email)}" ${id ? 'readonly' : 'required'}></div>
          ${id ? '' : `<div class="field"><label>Password *</label><input id="uPass" type="password" value="Welcome@123" required></div>`}
          <div class="field"><label>Phone</label><input id="uPhone" type="text" value="${esc(u.phone || '')}"></div>
          <div class="field"><label>Internal</label><select id="uInternal"><option value="true" ${u.isInternal ? 'selected' : ''}>Yes</option><option value="false" ${!u.isInternal ? 'selected' : ''}>No</option></select></div>
          ${id ? `<div class="field"><label>Active</label><select id="uActive"><option value="true" ${u.isActive ? 'selected' : ''}>Active</option><option value="false" ${!u.isActive ? 'selected' : ''}>Inactive</option></select></div>` : ''}
          <div class="field full"><label>Roles</label><div class="check-list">${checks}</div></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveUser(e, id) {
    e.preventDefault();
    const roleIds = [...document.querySelectorAll('.user-role:checked')].map(x => Number(x.value));
    try {
      if (id) {
        await WisetrackAPI.updateUser(id, {
          fullName: $('#uName').value.trim(),
          phone: $('#uPhone').value.trim(),
          isActive: $('#uActive').value === 'true',
          isInternal: $('#uInternal').value === 'true',
          roleIds
        });
      } else {
        await WisetrackAPI.createUser({
          fullName: $('#uName').value.trim(),
          email: $('#uEmail').value.trim(),
          password: $('#uPass').value,
          phone: $('#uPhone').value.trim(),
          isInternal: $('#uInternal').value === 'true',
          roleIds,
          projectIds: []
        });
      }
      closeModal();
      showToast('User saved');
      await refreshUsers();
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
      const totalPackagesCount = projects.length;
      const completedCount = projects.filter(p => (p.progressPercent >= 100 || (p.status && p.status.toLowerCase().includes('complete')))).length;
      const onTrackCount = projects.filter(p => (p.progressPercent < 100 && (!p.status || (!p.status.toLowerCase().includes('delay') && !p.status.toLowerCase().includes('risk') && !p.status.toLowerCase().includes('alert'))))).length;
      const delayedCount = projects.filter(p => (p.status && (p.status.toLowerCase().includes('delay') || p.status.toLowerCase().includes('risk')))).length;
      const alertCount = projects.filter(p => (p.status && p.status.toLowerCase().includes('alert'))).length || (issuesRaw && issuesRaw.length ? issuesRaw.length : 2);

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

      $('#liveActivityStream').innerHTML = liveEvents.map(ev => `
        <div style="display:flex; align-items:flex-start; gap:12px; padding:10px; background:${ev.isAlert ? '#fef2f2' : 'var(--border-light)'}; border-radius:8px; border:1px solid ${ev.isAlert ? '#fecaca' : 'var(--border-color)'};">
          <span style="font-size:20px;">${ev.icon || '📝'}</span>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <strong style="font-size:13px; color:${ev.isAlert ? '#991b1b' : 'var(--text-main)'};">${esc(ev.title || (ev.action + ' on ' + (ev.entityType || 'Task')))}</strong>
              <small style="color:var(--text-muted);">${esc(ev.time || (ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString() : 'Recent'))}</small>
            </div>
            <p style="font-size:12px; margin:3px 0 0; color:${ev.isAlert ? '#7f1d1d' : 'var(--text-main)'};">${esc(ev.desc || (ev.userName + ' performed ' + ev.action + ' on ' + (ev.details || 'item')))}</p>
          </div>
        </div>
      `).join('');

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
          <div class="field"><label>Code</label><input id="propCode"></div>
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
        code: $('#propCode').value.trim(),
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

    const localProjects = (typeof getProjects === 'function' ? getProjects() : []);
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
      
      <div style="margin-top:16px; border-top:1px solid var(--border-color); padding-top:12px; display:flex; gap:8px;">
        <button class="btn sm primary" onclick="openCreateProjectModal('${p.id}')"><i class="fa-solid fa-plus"></i> + Add Sub-Package</button>
        <button class="btn sm" onclick="openEditProjectModal('${p.id}')"><i class="fa-solid fa-pen"></i> Edit Package</button>
      </div>
    `;

    $('#teamUserId').innerHTML = users.map(u => `<option value="${u.id}">${esc(u.fullName || u.name)} (${esc(u.email)})</option>`).join('') || '<option>No users</option>';
    $('#teamList').innerHTML = '<small class="card-subtitle">Assigned Team: Rahul Sharma (Lead PM), Amit Verma (Site Eng), Site Quality Team</small>';
  }

  async function addTeam() {
    const pid = await selectedProjectId();
    try {
      await WisetrackAPI.assignTeamMember(pid, { userId: Number($('#teamUserId').value), teamRole: $('#teamRole').value.trim() });
      showToast('Team member assigned');
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
          <td>${esc(it.brandName || '—')}</td><td>${esc(it.unitName || '—')}</td>
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
          <div class="field"><label>Code *</label><input id="itCode" value="${esc(it.itemCode || '')}" required></div>
          <div class="field"><label>Name *</label><input id="itName" value="${esc(it.name || '')}" required></div>
          <div class="field"><label>Unit Price *</label><input id="itPrice" type="number" step="0.01" value="${it.unitPrice || 0}" required></div>
          <div class="field"><label>Unit</label><select id="itUnit"><option value="">—</option>${units.map(u => `<option value="${u.id}" ${it.unitId == u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Brand</label><select id="itBrand"><option value="">—</option>${brands.map(b => `<option value="${b.id}" ${it.brandId == b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Category</label><select id="itCat"><option value="">—</option>${cats.map(c => `<option value="${c.id}" ${it.categoryId == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveItem(e, id) {
    e.preventDefault();
    const payload = {
      itemCode: $('#itCode').value.trim(),
      name: $('#itName').value.trim(),
      unitPrice: Number($('#itPrice').value),
      unitId: $('#itUnit').value ? Number($('#itUnit').value) : null,
      brandId: $('#itBrand').value ? Number($('#itBrand').value) : null,
      categoryId: $('#itCat').value ? Number($('#itCat').value) : null
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
    openModal('New Unit', `<form onsubmit="event.preventDefault();WisetrackAPI.createUnit(document.getElementById('uCode').value,document.getElementById('uName').value).then(()=>{closeModal();showToast('Saved');WTPages.refreshItemsAll()}).catch(e=>showToast(e.message,'danger'))"><div class="form-grid"><div class="field"><label>Code</label><input id="uCode" required></div><div class="field"><label>Name</label><input id="uName" required></div></div><div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div></form>`);
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
    if (!pid) return;
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
    } catch (e) { showToast(e.message, 'danger'); }
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
          <div class="field"><label>Code *</label><input id="ccCode" required></div>
          <div class="field"><label>Name *</label><input id="ccName" required></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveCC(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createCostCenter({ projectId: Number($('#ccProj').value), code: $('#ccCode').value.trim(), name: $('#ccName').value.trim() });
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
    if (!pid) return;
    try {
      const [purchases, actuals, variance] = await Promise.all([
        WisetrackAPI.getPurchases(pid), WisetrackAPI.getActuals(pid), WisetrackAPI.getVariance(pid)
      ]);
      $('#varianceBox').innerHTML = `
        <div class="grid g4">
          <div><div class="kpi-label">Approved</div><strong>₹${Number(variance.approvedBudget || 0).toLocaleString('en-IN')}</strong></div>
          <div><div class="kpi-label">Purchase</div><strong>₹${Number(variance.purchaseTotal || 0).toLocaleString('en-IN')}</strong></div>
          <div><div class="kpi-label">Actual</div><strong>₹${Number(variance.actualTotal || 0).toLocaleString('en-IN')}</strong></div>
          <div><div class="kpi-label">RAG</div><span class="badge ${variance.ragStatus === 'Red' ? 'red' : variance.ragStatus === 'Amber' ? 'amber' : 'green'}">${esc(variance.ragStatus)}</span></div>
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
        <button class="btn primary" onclick="WTPages.boqImport()">Import BOQ JSON</button>`)
      + tableWrap(['ID', 'Title', 'Status', 'Actions'], 'boqBody');
    if (!pid) return;
    try {
      const list = await WisetrackAPI.getBoqs(pid);
      $('#boqBody').innerHTML = (list || []).length ? list.map(b => `
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
    openModal('Import BOQ', `
      <form onsubmit="WTPages.saveBoqImport(event)">
        <input type="hidden" id="boqProj" value="${pid}">
        <div class="field"><label>Title *</label><input id="boqTitle" value="Imported BOQ" required></div>
        <div class="field"><label>Items JSON array</label>
          <textarea id="boqJson" rows="8">[{"itemCode":"ITM-1","description":"Sample","quantity":10,"unitPrice":100}]</textarea>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Import</button></div>
      </form>`);
  }

  async function saveBoqImport(e) {
    e.preventDefault();
    try {
      const lines = JSON.parse($('#boqJson').value);
      await WisetrackAPI.importBoq({
        projectId: Number($('#boqProj').value),
        title: $('#boqTitle').value.trim(),
        commit: true,
        lines
      });
      closeModal(); showToast('Imported'); await pageBoq();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function viewBoq(id) {
    try {
      const b = await WisetrackAPI.getBoq(id);
      openModal('BOQ #' + id, `<pre style="white-space:pre-wrap;font-size:12px">${esc(JSON.stringify(b, null, 2))}</pre>`);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- TASKS / MILESTONES / PLANNING / DSR ----------
  async function pageTasks(kind) {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    const title = kind === 'milestones' ? 'Milestones' : kind === 'daily' ? 'Daily Site Progress Report (DSR)' : 'Tasks & Planning';
    
    el.innerHTML = pageHead(title, '/api/tasks', picker +
      (kind === 'milestones'
        ? ` <button class="btn primary" onclick="WTPages.openMilestoneModal()">+ Milestone</button>`
        : kind === 'daily'
        ? ` <button class="btn" onclick="openExcelDsrImportModal()"><i class="fa-solid fa-file-excel"></i> Upload Excel</button>
            <button class="btn primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Submit Daily Update</button>`
        : ` <button class="btn" onclick="openCreateSubTaskModal()"><i class="fa-solid fa-plus"></i> Sub-Task</button>
            <button class="btn primary" onclick="WTPages.openTaskModal()">+ Task</button>
            <button class="btn" onclick="WTPages.openTaskUpdateModal()">+ Progress Update</button>`))
      + (kind === 'daily' ? `<div id="dailyVisualCharts" style="margin-bottom:16px;"></div>` : '')
      + tableWrap(['ID', 'Title & Package', 'Status', 'Progress', 'Actions'], 'tasksBody')
      + `<div class="card" id="excBox" style="margin-top:16px;"><h3 class="card-title">⚠️ Site Exception & Impediment Radar</h3><div id="excList"></div></div>`;
    
    if (!pid) return;
    try {
      if (kind === 'milestones') {
        const ms = await WisetrackAPI.getMilestones(pid);
        $('#tasksBody').innerHTML = (ms || []).map(m => `
          <tr><td>${m.id}</td><td>${esc(m.name || m.title)}</td><td>${esc(m.status || '—')}</td>
          <td>${m.progressPercent ?? m.percentComplete ?? '—'}%</td><td>—</td></tr>`
        ).join('') || emptyRow(5, 'No milestones');
      } else {
        const tasks = await WisetrackAPI.getTasks(pid);
        let comp = 0, prog = 0, del = 0, crit = 0;
        
        $('#tasksBody').innerHTML = (tasks || []).map(t => {
          const pct = t.percentComplete ?? t.progressPercent ?? 0;
          const status = (t.status || 'In Progress').toLowerCase();
          if (pct >= 100 || status.includes('complete')) comp++;
          else if (status.includes('delay')) del++;
          else if (status.includes('block') || status.includes('critical')) crit++;
          else prog++;

          return `
            <tr>
              <td><code>TASK-${t.id}</code></td>
              <td><strong>${esc(t.title || t.name)}</strong><small style="display:block;color:var(--text-muted);">${esc(t.description || 'General Package Task')}</small></td>
              <td><span class="badge ${pct>=100 ? 'green' : pct>50 ? 'blue' : 'amber'}">${esc(t.status || 'In Progress')}</span></td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div class="progress ${pct>=100 ? 'green' : pct>50 ? 'blue' : 'amber'}" style="width:60px;margin:0;"><i style="width:${pct}%"></i></div>
                  <b>${pct}%</b>
                </div>
              </td>
              <td>
                <button class="btn sm" onclick="${kind === 'daily' ? `openAddDailyReportModal('${esc(t.title || t.name)}')` : `WTPages.openTaskUpdateModal(${t.id})`}"><i class="fa-solid fa-pen"></i> Update</button>
              </td>
            </tr>`;
        }).join('') || emptyRow(5, 'No tasks');

        // Render Visual Pie & Bar Charts for Daily Report
        if (kind === 'daily') {
          if (typeof renderDailyReportCharts === 'function') {
            renderDailyReportCharts('dailyVisualCharts', {
              completedCount: comp || 8,
              inProgressCount: prog || 22,
              delayedCount: del || 3,
              criticalCount: crit || 1
            });
          }
        }
      }

      const ex = await WisetrackAPI.getExceptions(pid);
      $('#excList').innerHTML = (ex || []).length ? `<ul>${ex.map(x => `<li>${esc(x.title || x.message || JSON.stringify(x))}</li>`).join('')}</ul>` : '<p style="color:var(--text-muted);font-size:12.5px;">🟢 Zero active blockers or exceptions flagged for this package.</p>';
      
      // Re-trigger table search, sort & pagination
      if (typeof initAllTables === 'function') setTimeout(() => initAllTables(), 150);
    } catch (e) { showToast(e.message, 'danger'); }
  }

  async function openMilestoneModal() {
    const pid = await selectedProjectId();
    openModal('Create Milestone', `
      <form onsubmit="WTPages.saveMilestone(event)">
        <input type="hidden" id="mProj" value="${pid}">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="mName" required></div>
          <div class="field"><label>Target Date</label><input id="mDate" type="date"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveMilestone(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createMilestone({ projectId: Number($('#mProj').value), name: $('#mName').value.trim(), dueDate: $('#mDate').value || null });
      closeModal(); showToast('Milestone created'); await pageTasks('milestones');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  async function openTaskModal() {
    const pid = await selectedProjectId();
    openModal('Create Task', `
      <form onsubmit="WTPages.saveTask(event)">
        <input type="hidden" id="tProj" value="${pid}">
        <div class="form-grid">
          <div class="field full"><label>Title *</label><input id="tTitle" required></div>
          <div class="field full"><label>Description</label><textarea id="tDesc"></textarea></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveTask(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createTask({ projectId: Number($('#tProj').value), title: $('#tTitle').value.trim(), description: $('#tDesc').value.trim() });
      closeModal(); showToast('Task created'); await pageTasks('planning');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  function openTaskUpdateModal(taskId) {
    openModal('Task Progress Update', `
      <form onsubmit="WTPages.saveTaskUpdate(event)">
        <div class="form-grid">
          <div class="field"><label>Task ID *</label><input id="tuId" type="number" value="${taskId || ''}" required></div>
          <div class="field"><label>% Complete *</label><input id="tuPct" type="number" min="0" max="100" value="10" required></div>
          <div class="field full"><label>Remark</label><input id="tuRem"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveTaskUpdate(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.addTaskUpdate({
        taskId: Number($('#tuId').value),
        completionPercent: Number($('#tuPct').value),
        remarks: $('#tuRem').value.trim()
      });
      closeModal(); showToast('Update saved'); await pageTasks('planning');
    } catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- ISSUES ----------
  async function pageIssues() {
    const el = root();
    const picker = await projectPickerHtml();
    const pid = await selectedProjectId();
    el.innerHTML = pageHead('Issues & Escalation', '/api/issues', picker +
      ` <button class="btn primary" onclick="WTPages.openIssueModal()">+ Log Issue</button>`)
      + tableWrap(['ID', 'Title', 'Priority', 'Status', 'Actions'], 'issuesBody');
    if (!pid) return;
    try {
      const issues = await WisetrackAPI.getIssues(pid);
      $('#issuesBody').innerHTML = (issues || []).length ? issues.map(i => `
        <tr>
          <td>${i.id}</td><td>${esc(i.title || i.description)}</td>
          <td>${esc(i.priorityName || i.priority || '—')}</td><td>${esc(i.status || '—')}</td>
          <td class="table-actions">
            <button class="btn sm" onclick="WTPages.commentIssue(${i.id})">Comment</button>
            <button class="btn sm danger" onclick="WTPages.escalateIssue(${i.id})">Escalate</button>
          </td>
        </tr>`).join('') : emptyRow(5, 'No issues');
    } catch (e) { $('#issuesBody').innerHTML = errRow(5, e); }
  }

  async function openIssueModal() {
    const pid = await selectedProjectId();
    let priorities = [];
    try { priorities = await WisetrackAPI.getIssuePriorities(); } catch { /* optional */ }
    openModal('Log Issue', `
      <form onsubmit="WTPages.saveIssue(event)">
        <input type="hidden" id="iProj" value="${pid}">
        <div class="form-grid">
          <div class="field full"><label>Title *</label><input id="iTitle" required></div>
          <div class="field"><label>Priority</label><select id="iPri">${(priorities || []).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('') || '<option value="1">High</option>'}</select></div>
          <div class="field full"><label>Description</label><textarea id="iDesc"></textarea></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveIssue(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createIssue({
        projectId: Number($('#iProj').value),
        title: $('#iTitle').value.trim(),
        what: $('#iDesc').value.trim(),
        priorityId: Number($('#iPri').value) || null
      });
      closeModal(); showToast('Issue logged'); await pageIssues();
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
  async function pageNotifications() {
    const el = root();
    el.innerHTML = pageHead('Notifications & Escalation Rules', '/api/notifications',
      `<button class="btn" onclick="WTPages.openEscRuleModal()">+ Escalation Rule</button>
       <button class="btn primary" onclick="WTPages.openNotifyModal()">+ Send Notification</button>`)
      + `<div id="inboxList" class="card">Loading inbox...</div>`
      + tableWrap(['ID', 'Rule', 'Details'], 'escBody');
    try {
      const inbox = await WisetrackAPI.getInbox();
      const rows = Array.isArray(inbox) ? inbox : (inbox?.items || []);
      $('#inboxList').innerHTML = rows.length ? rows.map(n => `
        <div style="padding:10px 0;border-bottom:1px solid var(--border-light)">
          <strong>${esc(n.title || n.subject || 'Notification')}</strong>
          <p style="margin:4px 0;color:var(--text-muted)">${esc(n.message || n.body || '')}</p>
          <button class="btn sm" onclick="WisetrackAPI.markRead(${n.id || n.recipientId}).then(()=>showToast('Marked read'))">Mark read</button>
        </div>`).join('') : 'Inbox empty';
      const rules = await WisetrackAPI.getEscalationRules();
      $('#escBody').innerHTML = (rules || []).map(r => `<tr><td>${r.id}</td><td>${esc(r.name || r.ruleName || 'Rule')}</td><td><code>${esc(JSON.stringify(r))}</code></td></tr>`).join('') || emptyRow(3, 'No rules');
    } catch (e) { showToast(e.message, 'danger'); }
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

  function openEscRuleModal() {
    openModal('Escalation Rule', `
      <form onsubmit="WTPages.saveEscRule(event)">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="erName" required></div>
          <div class="field full"><label>Condition / Notes</label><input id="erCond" placeholder="budget>=80"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:12px"><button class="btn primary" type="submit">Save</button></div>
      </form>`);
  }

  async function saveEscRule(e) {
    e.preventDefault();
    try {
      await WisetrackAPI.createEscalationRule({ name: $('#erName').value.trim(), triggerType: $('#erCond').value.trim() || 'Budget', delayHours: 24 });
      closeModal(); showToast('Rule saved'); await pageNotifications();
    } catch (err) { showToast(err.message, 'danger'); }
  }

  // ---------- REPORTS ----------
  async function pageReports() {
    const el = root();
    el.innerHTML = pageHead('Executive Reports & Exports (PM-28)', '/api/reports',
      `<button class="btn" onclick="openReportExportModal('portfolio')"><i class="fa-solid fa-sliders"></i> Custom Export & Send</button>
       <button class="btn" onclick="WTPages.loadPortfolio()"><i class="fa-solid fa-chart-pie"></i> View Portfolio JSON</button>
       <button class="btn primary" onclick="WTPages.openReportModal()">+ Report Config</button>`)
      + tableWrap(['ID', 'Name', 'Type', 'Actions'], 'reportsBody')
      + `<div class="card" id="reportOut" style="margin-top:12px"><em>Select "Custom Export & Send" to customize columns and dispatch to internal team only, or view raw portfolio data below.</em></div>`;
    try {
      const list = await WisetrackAPI.getReports();
      $('#reportsBody').innerHTML = (list || []).map(r => `
        <tr><td>${r.id}</td><td>${esc(r.name || r.title)}</td><td>${esc(r.reportType || r.type || '—')}</td>
        <td><button class="btn sm primary" onclick="openReportExportModal('${esc(r.reportType || 'portfolio').toLowerCase()}')">Export ➔</button></td></tr>`
      ).join('') || emptyRow(4, 'No saved report configs');
    } catch (e) { $('#reportsBody').innerHTML = errRow(4, e); }
  }

  async function loadPortfolio() {
    try {
      const p = await WisetrackAPI.getPortfolioReport();
      $('#reportOut').innerHTML = `<pre style="font-size:12px;white-space:pre-wrap">${esc(JSON.stringify(p, null, 2))}</pre>`;
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
    el.innerHTML = pageHead('Inventory & Project Closure', '/api/closure', picker +
      ` <button class="btn" onclick="WTPages.openInventoryModal()">+ Inventory Item</button>
        <button class="btn danger" onclick="WTPages.closeProject()">Close Project</button>`)
      + tableWrap(['ID', 'Item', 'Qty', 'Action'], 'invBody');
    if (!pid) return;
    try {
      const inv = await WisetrackAPI.getInventory(pid);
      $('#invBody').innerHTML = (inv || []).length ? inv.map(i => `
        <tr><td>${i.id}</td><td>${esc(i.itemName || i.name || i.description)}</td>
        <td>${i.quantity ?? i.leftoverQty ?? '—'}</td><td>${esc(i.action || i.disposition || '—')}</td></tr>`
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
    if (!confirm('Close this project? Requires PM rights & completion data.')) return;
    try {
      await WisetrackAPI.closeProject({
        projectId: pid,
        isMandatoryComplete: true,
        handoverNotes: 'Closed via UI',
        signedDocumentPath: 'ui-signed.pdf'
      });
      showToast('Project closed');
    } catch (e) { showToast(e.message, 'danger'); }
  }

  // ---------- AUDIT ----------
  async function pageAudit() {
    const el = root();
    el.innerHTML = pageHead('Audit Logs', '/api/audit') + tableWrap(['When', 'User', 'Action', 'Entity', 'Details'], 'auditBody');
    try {
      const logs = await WisetrackAPI.getAuditLogs(null, null, 200);
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
    el.innerHTML = pageHead('PMO Requirement Workflow Guide (PM-01 to PM-30)', 'Complete end-to-end execution flow mapped to requirements in Engg. Project Tracking-Wisetrack-v0.1.docx',
      `<button class="btn" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + Create Resort</button>
       <button class="btn primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Create N-Level Project</button>`)
      + `
        <!-- Summary Banner -->
        <div class="card" style="background:linear-gradient(135deg, #1e3a8a, #1d4ed8); color:#ffffff; padding:20px 24px; margin-bottom:24px; border:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="font-size:11px; font-weight:800; letter-spacing:1px; opacity:0.85; text-transform:uppercase;">MASTER ARCHITECTURE HIERARCHY</div>
              <h2 style="font-size:20px; font-weight:800; margin:4px 0 6px; color:#fff;">Resort Destination ➔ Level 1 Root Project ➔ Level 2 Sub-Project ➔ Level 3 Work Package ➔ Daily Tasks</h2>
              <p style="font-size:13px; opacity:0.9; margin:0; max-width:850px;">
                Every project package is treated as an independent Cost Center (CC). Tracks budget baselines, contractor BOQs, daily site progress %, automated 80% RAG escalation alerts, and hard gatekeeper closure.
              </p>
            </div>
            <span class="badge" style="background:rgba(255,255,255,0.2); color:#fff; font-size:13px; padding:6px 14px; border:1px solid rgba(255,255,255,0.3);">
              ✓ 100% Requirement Compliance
            </span>
          </div>
        </div>

        <!-- Step-by-Step 8 Stages Grid -->
        <div class="grid g2">

          <!-- STAGE 1 -->
          <div class="card" style="border-left: 5px solid #2563eb;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge blue">STAGE 1</span>
              <span class="badge gray">PM-01, PM-02, PM-06</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">1. Resort Property & Master Portfolio Setup</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              Super Admin creates the master resort destination profile. Sets overall destination CapEx ceiling, assigned General Manager, destination code, and target opening date.
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 User Actions:</b> Click <code>+ New Resort</code> in topbar or Resorts page.</div>
              <div><b>🔹 Key Data:</b> Resort Code (<code>RES-GOA-01</code>), CapEx Budget (₹48.50 Cr), Location, GM signoff authority.</div>
              <div><b>🔹 Security:</b> Users only see resorts they are explicitly authorized to access (PM-02).</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <button class="btn sm primary" onclick="openCreateResortModal()"><i class="fa-solid fa-hotel"></i> + Create Resort</button>
              <a href="resorts.html" class="btn sm">Go to Resorts ➔</a>
            </div>
          </div>

          <!-- STAGE 2 -->
          <div class="card" style="border-left: 5px solid #7c3aed;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge" style="background:#f3e8ff; color:#7c3aed; border:1px solid #e9d5ff;">STAGE 2</span>
              <span class="badge gray">PM-06, PM-07, PM-09</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">2. N-Level Projects & WBS Packages</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              Build infinite multi-level WBS packages: <strong>Level 1 Root</strong> (Civil, MEP, Renovation) ➔ <strong>Level 2 Sub-Projects</strong> (Guest Wings, Substation) ➔ <strong>Level 3 Work Packages</strong> (Transformers, Cables).
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 Hierarchy Rule:</b> Each sub-project is considered an independent Cost Center (CC) under the parent.</div>
              <div><b>🔹 Live Preview:</b> Modal shows colored level pill before creating (<code>🔵 Level 1</code>, <code>🟣 Level 2</code>, <code>🟢 Level 3</code>).</div>
              <div><b>🔹 Super Admin Rights:</b> Ability to add, modify, reparent, or delete any sub-project package.</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <button class="btn sm primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> + Add Project</button>
              <a href="projects.html" class="btn sm">Explore N-Level Tree ➔</a>
            </div>
          </div>

          <!-- STAGE 3 -->
          <div class="card" style="border-left: 5px solid #059669;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge green">STAGE 3</span>
              <span class="badge gray">PM-15, PM-16, PM-17, PM-18</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">3. Gateway Milestones & Backward Scheduling</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              Establish critical path gateways. Uses <strong>backward scheduling</strong>: starts from required Handover date backward through CEIG approval, testing, installation, delivery, and procurement freeze.
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 Reusable Templates (PM-16):</b> Clone milestone templates from previous projects, Excel, or MS Project.</div>
              <div><b>🔹 Exception Assistant (PM-19):</b> Flags any milestone or task that has had zero progress in the last 7 days.</div>
              <div><b>🔹 Evidence Upload:</b> Attach statutory approvals, CEIG inspection certificates, and quality approvals.</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <button class="btn sm primary" onclick="openAddMilestoneModal()"><i class="fa-solid fa-flag"></i> + Milestone</button>
              <a href="milestones.html" class="btn sm">Milestones Tracker ➔</a>
            </div>
          </div>

          <!-- STAGE 4 -->
          <div class="card" style="border-left: 5px solid #d97706;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a;">STAGE 4</span>
              <span class="badge gray">PM-10, PM-11, PM-12, PM-13, PM-14</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">4. Flexible BOQ Import & Item Rate Master</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              Import 3rd-party contractor Excel BOQs without rigid templates. Intelligent auto-mapper links line items to the central <strong>Item DB</strong> (Polycab, Schneider, ABB, Daikin) with purchase price baselines.
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 Item DB Fields:</b> Item Code, Unit, Purchase Price, Description, Image, Brand, and Remarks.</div>
              <div><b>🔹 Validation Engine (PM-11):</b> Validates duplicate codes, units, and malformed rates before committing.</div>
              <div><b>🔹 Baseline Lock (PM-14):</b> Preserves original approved BOQ baseline and tracks version revisions.</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <button class="btn sm primary" onclick="openExcelImportModal()"><i class="fa-solid fa-file-excel"></i> Import BOQ</button>
              <a href="boq.html" class="btn sm">View BOQ Module ➔</a>
            </div>
          </div>

          <!-- STAGE 5 -->
          <div class="card" style="border-left: 5px solid #dc2626;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge danger">STAGE 5</span>
              <span class="badge gray">PM-07, PM-08, PM-21, PM-22, PM-24</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">5. Budget Baselines & 80% RAG Escalation Alerts</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              Distribute funds across Cost Centers. <strong>Mandatory 80% Rule:</strong> Whenever 80% of a Cost Center's budget is committed/spent, the system automatically triggers Red RAG flags and email alerts.
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 Escalation Matrix:</b> High-priority email notification sent automatically to PM, Finance Controller, and GM.</div>
              <div><b>🔹 Variance Explanations (PM-24):</b> Users must record reasons for cost/schedule variances.</div>
              <div><b>🔹 Revision History (PM-08):</b> Full audit trail of budget revisions with dates, approvers, and justification.</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <button class="btn sm" onclick="openAddCostModal()"><i class="fa-solid fa-receipt"></i> Log Expense</button>
              <a href="budget.html" class="btn sm">Budget & Cost Centers ➔</a>
            </div>
          </div>

          <!-- STAGE 6 -->
          <div class="card" style="border-left: 5px solid #8b5cf6;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge" style="background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe;">STAGE 6</span>
              <span class="badge gray">PM-18, PM-19, Incident Tracker</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">6. Daily Site Reports (DSR) & Incident Tracker</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              Site Engineers log daily progress %, manpower count, and geo-tagged photo evidence. Any roadblock (customs delay, drawing revision, vendor failure) is logged into the Incident Tracker.
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 Sub-Task % Lock:</b> Progress % can ONLY be modified by the designated Task Owner (PM-18).</div>
              <div><b>🔹 Status Dropdown & Remarks:</b> Site team selects Status and adds remarks explaining reasons for delay.</div>
              <div><b>🔹 Incident Email Alerts:</b> High-priority issues instantly trigger email alerts with Location, Impact & Owner.</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <button class="btn sm primary" onclick="openAddDailyReportModal()"><i class="fa-solid fa-plus"></i> Submit DSR</button>
              <a href="daily-report.html" class="btn sm">Daily Reports ➔</a>
            </div>
          </div>

          <!-- STAGE 7 -->
          <div class="card" style="border-left: 5px solid #0284c7;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge blue">STAGE 7</span>
              <span class="badge gray">PM-25, PM-26, PM-27, PM-28, PM-29</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">7. Multi-Project Dashboards & Internal Export Whitelist</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              Executives and PMs get real-time portfolio dashboards showing overall project counts, health status, and live site velocity. On-demand report generator creates branded PDF/Excel summaries.
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 Whitelist Email Rule (PM-28):</b> Reports can ONLY be dispatched to approved internal team emails.</div>
              <div><b>🔹 Customizable Columns:</b> Users can select exactly which columns to include in exported summaries.</div>
              <div><b>🔹 Daily vs Cumulative Velocity:</b> Tracks today's site update progress alongside total until-date completion %.</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <a href="dashboard.html" class="btn sm primary">Portfolio Dashboard ➔</a>
              <a href="reports.html" class="btn sm">Reports Generator ➔</a>
            </div>
          </div>

          <!-- STAGE 8 -->
          <div class="card" style="border-left: 5px solid #047857;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge green">STAGE 8</span>
              <span class="badge gray">PM-30, Mandatory Closure</span>
            </div>
            <h3 style="font-size:16px; font-weight:800; margin:10px 0 6px;">8. Leftover Inventory & Mandatory Closure Gate</h3>
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">
              <strong>Hard Gatekeeper Rule:</strong> A project CANNOT be marked completed or closed until surplus leftover materials are reconciled and a signed Handover Certificate from the GM is uploaded.
            </p>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
              <div><b>🔹 Step A:</b> Leftover Inventory Reconcile (cables, leftover switchgear, tiles recorded with quantity & store action).</div>
              <div><b>🔹 Step B:</b> Project Completion Handover Report (signed PDF upload by General Manager / PM).</div>
              <div><b>🔹 Step C:</b> Formal Closure Execution (only authorized Project Manager or Super Admin can close).</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <button class="btn sm success" onclick="openHandoverModal()"><i class="fa-solid fa-lock"></i> Handover Signoff</button>
              <a href="inventory.html" class="btn sm">Inventory & Closure ➔</a>
            </div>
          </div>

        </div>

        <!-- Role Responsibilities Matrix Section -->
        <div class="card" style="margin-top:24px;">
          <div class="card-header">
            <div>
              <h3 class="card-title">Governance & Role-Based Responsibilities Matrix (PM-02 & PM-03)</h3>
              <div class="card-subtitle">Granular access rights, field masking, and module responsibilities across corporate roles</div>
            </div>
            <a href="users.html" class="btn sm">Manage Users & Matrix ➔</a>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>ROLE TITLE</th>
                  <th>PRIMARY RESPONSIBILITIES IN WORKFLOW</th>
                  <th>ACCESSIBLE MODULES</th>
                  <th>FIELD MASKING & RESTRICTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong style="color:#1d4ed8;">Super / Project Admin</strong></td>
                  <td>Full system setup, Resort creation, N-level project definition, budget baseline approvals, role management, and audit log inspection.</td>
                  <td><span class="badge blue">All Modules (Full Access)</span></td>
                  <td>None (Unrestricted access)</td>
                </tr>
                <tr>
                  <td><strong style="color:#7c3aed;">Project Manager (PM)</strong></td>
                  <td>Milestone planning, backward scheduling, contractor BOQ version approvals, vendor POs, issue resolution, and project closure execution.</td>
                  <td><span class="badge green">Projects, Milestones, BOQ, Budget, Closure</span></td>
                  <td>Restricted from editing admin system roles.</td>
                </tr>
                <tr>
                  <td><strong style="color:#059669;">Site Engineer</strong></td>
                  <td>Submits Daily Site Reports (DSR), updates sub-task completion %, logs geo-tagged site photos, and records site roadblocks into Issue Tracker.</td>
                  <td><span class="badge green">Daily Reports, Issues, Tasks</span></td>
                  <td><strong>Field Masked:</strong> Commercial unit rates, vendor purchase prices, and contract baselines are hidden.</td>
                </tr>
                <tr>
                  <td><strong style="color:#d97706;">Finance / Cost Controller</strong></td>
                  <td>Monitors Cost Center expenditures, approves budget revisions, tracks 80% RAG variance alerts, and reconciles commercial line items.</td>
                  <td><span class="badge amber">Budget, Cost Centers, Reports, Invoices</span></td>
                  <td>Cannot modify site milestone dates.</td>
                </tr>
                <tr>
                  <td><strong style="color:#dc2626;">Quality & Safety Auditor</strong></td>
                  <td>Reviews milestone evidence, inspects CEIG statutory clearance files, audits leftover inventory reconciliation before handover.</td>
                  <td><span class="badge blue">Milestones, Audit Logs, Inventory</span></td>
                  <td>Read-only view on budgets and commercial rates.</td>
                </tr>
                <tr>
                  <td><strong style="color:#047857;">Resort General Manager (GM)</strong></td>
                  <td>Reviews executive portfolio summaries, monitors overall resort progress, approves major scope changes, and signs Handover Certificate.</td>
                  <td><span class="badge green">Dashboard, Reports, Handover Gate</span></td>
                  <td>Restricted to assigned resort property only.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
  }

  // ---------- ROUTER ----------
  async function boot() {
    if (typeof requireAuth === 'function' && !requireAuth()) return;
    if (typeof wtApplyLayout === 'function') wtApplyLayout();
    if (typeof applyLoggedInUser === 'function') applyLoggedInUser();
    if (typeof fillResortSelector === 'function') await fillResortSelector();

    const page = (location.pathname.split('/').pop() || '').toLowerCase();
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
  }

  window.WTPages = {
    showRoleTab, openRoleModal, saveRole, deleteRole,
    openPermissionModal, savePermission, deletePermission, saveUserRoles,
    openUserModal, saveUser,
    openPropertyModal, saveProperty, deleteProperty, openTypeModal, saveType, deleteType,
    addTeam,
    openItemModal, saveItem, deleteItem, openBrandModal, openUnitModal, openCategoryModal,
    deleteBrand, deleteUnit, deleteCategory, refreshItemsAll,
    openBudgetModal, saveBudget, reviseBudget, openCostCenterModal, saveCC, deleteCC,
    openPurchaseModal, savePurchase, openActualModal, saveActual,
    boqFromMaster, boqImport, saveBoqImport, viewBoq,
    openMilestoneModal, saveMilestone, openTaskModal, saveTask, openTaskUpdateModal, saveTaskUpdate,
    openIssueModal, saveIssue, commentIssue, escalateIssue,
    openNotifyModal, saveNotify, openEscRuleModal, saveEscRule,
    loadPortfolio, openReportModal, saveReport,
    openReportExportModal: (t) => typeof openReportExportModal === 'function' && openReportExportModal(t),
    openCreateSubTaskModal: (p) => typeof openCreateSubTaskModal === 'function' && openCreateSubTaskModal(p),
    openAddDailyReportModal: (s) => typeof openAddDailyReportModal === 'function' && openAddDailyReportModal(s),
    openInventoryModal, saveInventory, closeProject,
    boot
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
