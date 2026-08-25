// WISETRACK LIVE DATA — loads pages from ASP.NET APIs (no static demo data)

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function requireAuth() {
  if (location.pathname.endsWith('login.html')) return false;
  if (!WisetrackAPI.isLoggedIn()) {
    location.href = 'login.html';
    return false;
  }
  return true;
}

function applyLoggedInUser() {
  const name = localStorage.getItem('WISETRACK_USER_NAME') || 'User';
  const roles = JSON.parse(localStorage.getItem('WISETRACK_USER_ROLES') || '[]');
  const initials = name.split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'U';
  document.querySelectorAll('.user-name').forEach(el => { el.textContent = name; });
  document.querySelectorAll('.avatar').forEach(el => { el.textContent = initials; });
  document.querySelectorAll('.current-role-label').forEach(el => {
    el.textContent = roles[0] || localStorage.getItem('WISETRACK_ROLE') || 'User';
  });
  document.querySelectorAll('a[href="login.html"]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); WisetrackAPI.logout(); };
  });
}

async function fillResortSelector() {
  const sel = document.getElementById('globalResortSelector');
  if (!sel) return;
  try {
    const resorts = await WisetrackAPI.getResorts();
    const selected = localStorage.getItem('WISETRACK_SELECTED_RESORT') || '';
    sel.innerHTML = (resorts || []).map(r =>
      `<option value="${r.id}" ${String(r.id) === String(selected) ? 'selected' : ''}>${esc(r.name)}${r.code ? ' (' + esc(r.code) + ')' : ''}</option>`
    ).join('') || '<option value="">No resorts</option>';
    if (resorts?.length && !selected) {
      localStorage.setItem('WISETRACK_SELECTED_RESORT', String(resorts[0].id));
    }
  } catch (err) {
    sel.innerHTML = `<option value="">API error: ${esc(err.message)}</option>`;
  }
}

function setSelectedResortId(id) {
  localStorage.setItem('WISETRACK_SELECTED_RESORT', String(id));
  if (typeof showToast === 'function') showToast('Resort switched', 'info');
  setTimeout(() => location.reload(), 200);
}

async function loadResortsPage() {
  const tbody = document.getElementById('apiResortsBody');
  const kpiCount = document.getElementById('apiResortCount');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8">Loading from API...</td></tr>';
  try {
    const resorts = await WisetrackAPI.getResorts();
    if (kpiCount) kpiCount.textContent = `${resorts.length} Destinations`;

    if (!resorts.length) {
      tbody.innerHTML = '<tr><td colspan="8">No resorts in database. Click "+ Create New Resort".</td></tr>';
      return;
    }

    tbody.innerHTML = resorts.map(r => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">🏨</span>
            <div>
              <strong style="font-size:13.5px;">${esc(r.name)}</strong>
              <small style="display:block;color:var(--text-muted);">Code: <code>${esc(r.code || '-')}</code> · ID: ${r.id}</small>
            </div>
          </div>
        </td>
        <td>${esc(r.location || '-')}</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td><span class="badge ${r.isActive ? 'green' : 'red'}">${r.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="btn-group">
            <a href="projects.html" class="btn sm" onclick="localStorage.setItem('WISETRACK_SELECTED_RESORT','${r.id}')">Packages ➔</a>
            <button class="btn sm" onclick="openEditResortModal('${r.id}')">✏️ Edit</button>
            <button class="btn sm danger" onclick="confirmDeleteResort('${r.id}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#dc2626;">API failed: ${esc(err.message)}. Is backend running on :5189?</td></tr>`;
  }
}

async function loadProjectsPage() {
  const tree = document.getElementById('apiProjectsTree');
  const kpiCount = document.getElementById('apiProjectCount');
  if (!tree) return;

  tree.innerHTML = '<div class="card" style="padding:20px;">Loading projects from API...</div>';
  try {
    const resortId = localStorage.getItem('WISETRACK_SELECTED_RESORT');
    const projects = await WisetrackAPI.getProjects(resortId || undefined);
    if (kpiCount) kpiCount.textContent = `${projects.length} Projects`;

    if (!projects.length) {
      tree.innerHTML = '<div class="card" style="padding:20px;">No projects found. Create one with "+ New Project".</div>';
      return;
    }

    const byParent = {};
    projects.forEach(p => {
      const key = p.parentProjectId || 0;
      (byParent[key] ||= []).push(p);
    });

    function renderLevel(parentId, depth) {
      return (byParent[parentId] || []).map(p => `
        <div class="tree-node">
          <div class="tree-header level-${Math.min(depth, 4)}">
            <span class="tree-toggle">▸</span>
            <div class="tree-title">
              <span class="tree-level-pill lvl-${Math.min(depth, 4)}">${depth === 1 ? '🔵 L1 Root' : depth === 2 ? '🟣 L2 Sub' : depth === 3 ? '🟢 L3 Pkg' : `🟠 L${depth}`}</span>
              <strong>${esc(p.name)}</strong>
              <small>${esc(p.code || '')} · ${esc(p.status)} · ID ${p.id}</small>
            </div>
            <div class="tree-meta">
              <span>${esc(p.ownerName || 'Unassigned')}</span>
              <span class="badge ${p.status === 'Active' || p.status === 'OnTrack' ? 'green' : 'gray'}">${esc(p.status)}</span>
              <button class="btn sm primary" onclick="openCreateProjectModal('${p.id}')">+ Child L${depth + 1}</button>
              <button class="btn sm" onclick="openEditProjectModal('${p.id}')">Edit</button>
              <button class="btn sm danger" onclick="confirmDeleteProject('${p.id}')">Delete</button>
            </div>
          </div>
          ${renderLevel(p.id, depth + 1)}
        </div>
      `).join('');
    }

    tree.innerHTML = `<div class="tree-container">${renderLevel(0, 1)}</div>`;
  } catch (err) {
    tree.innerHTML = `<div class="card" style="padding:20px;color:#dc2626;">API failed: ${esc(err.message)}</div>`;
  }
}

async function loadUsersPage() {
  const tbody = document.getElementById('apiUsersBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7">Loading users from API...</td></tr>';
  try {
    const users = await WisetrackAPI.getUsers();
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => {
      const avatar = (u.fullName || '?').split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase();
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="avatar" style="width:32px;height:32px;font-size:11px;">${esc(avatar)}</div>
              <div>
                <strong>${esc(u.fullName)}</strong>
                <small style="display:block;">ID: ${u.id}</small>
              </div>
            </div>
          </td>
          <td>${esc(u.email)}</td>
          <td>${esc((u.roles || []).join(', ') || '—')}</td>
          <td>${u.isInternal ? 'Internal' : 'External'}</td>
          <td>—</td>
          <td><span class="badge ${u.isActive ? 'green' : 'red'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="btn sm" onclick="openEditUserModal('${u.id}')">✏️ Edit</button>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#dc2626;">API failed: ${esc(err.message)}</td></tr>`;
  }
}

async function loadDashboardPage() {
  const kpiProjects = document.getElementById('apiDashProjects');
  const kpiIssues = document.getElementById('apiDashIssues');
  const kpiBudget = document.getElementById('apiDashBudget');
  const kpiOverdue = document.getElementById('apiDashOverdue');
  const recentBody = document.getElementById('apiDashRecent');
  if (!kpiProjects && !recentBody) return;

  try {
    const dash = await WisetrackAPI.getDashboard();
    if (kpiProjects) kpiProjects.textContent = String(dash.projectCount ?? 0);
    if (kpiIssues) kpiIssues.textContent = String(dash.openIssueCount ?? 0);
    if (kpiOverdue) kpiOverdue.textContent = String(dash.overdueTaskCount ?? 0);
    if (kpiBudget) {
      const b = Number(dash.totalApprovedBudget || 0);
      kpiBudget.textContent = '₹' + b.toLocaleString('en-IN');
    }
    if (recentBody) {
      const rows = dash.recentProjects || [];
      recentBody.innerHTML = rows.length ? rows.map(p => `
        <tr>
          <td><strong>${esc(p.name)}</strong><small>${esc(p.code || '')}</small></td>
          <td>${esc(p.resortName || '-')}</td>
          <td>${esc(p.ownerName || '-')}</td>
          <td>—</td>
          <td>—</td>
          <td><span class="badge gray">${esc(p.status)}</span></td>
          <td>—</td>
          <td><a href="project-detail.html" class="btn sm" onclick="localStorage.setItem('WISETRACK_SELECTED_PROJECT','${p.id}')">Open ➔</a></td>
        </tr>
      `).join('') : '<tr><td colspan="8">No projects yet. Create a resort and project first.</td></tr>';
    }
  } catch (err) {
    if (recentBody) recentBody.innerHTML = `<tr><td colspan="8" style="color:#dc2626;">API failed: ${esc(err.message)}</td></tr>`;
    if (typeof showToast === 'function') showToast(err.message, 'danger');
  }
}

async function loadIssuesPage() {
  const tbody = document.getElementById('apiIssuesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8">Select a project context — loading open issues where available...</td></tr>';
  try {
    const projects = await WisetrackAPI.getProjects();
    if (!projects.length) {
      tbody.innerHTML = '<tr><td colspan="8">No projects — cannot load issues.</td></tr>';
      return;
    }
    const all = [];
    for (const p of projects.slice(0, 10)) {
      try {
        const issues = await WisetrackAPI.getIssues(p.id);
        (issues || []).forEach(i => all.push({ ...i, projectName: p.name }));
      } catch { /* skip */ }
    }
    if (!all.length) {
      tbody.innerHTML = '<tr><td colspan="8">No issues in API.</td></tr>';
      return;
    }
    tbody.innerHTML = all.map(i => `
      <tr>
        <td><strong>#${i.id}</strong></td>
        <td>${esc(i.title || i.description || '-')}</td>
        <td>${esc(i.projectName || '-')}</td>
        <td>${esc(i.priorityName || i.priority || '-')}</td>
        <td>${esc(i.status || '-')}</td>
        <td>${esc(i.reportedByName || '-')}</td>
        <td>${esc(i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '-')}</td>
        <td><button class="btn sm" onclick="WisetrackAPI.escalateIssue(${i.id}).then(()=>showToast('Escalated')).catch(e=>showToast(e.message,'danger'))">Escalate</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#dc2626;">${esc(err.message)}</td></tr>`;
  }
}

async function loadItemsPage() {
  const tbody = document.getElementById('apiItemsBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7">Loading items...</td></tr>';
  try {
    const items = await WisetrackAPI.getItems();
    tbody.innerHTML = items.length ? items.map(it => `
      <tr>
        <td><code>${esc(it.code || it.itemCode || '-')}</code></td>
        <td>${esc(it.name || it.description || '-')}</td>
        <td>${esc(it.unitName || it.uom || '-')}</td>
        <td>${esc(it.brandName || '-')}</td>
        <td>${esc(it.categoryName || '-')}</td>
        <td>${it.unitRate != null ? '₹' + Number(it.unitRate).toLocaleString('en-IN') : '—'}</td>
        <td><button class="btn sm" onclick="showToast('Item ID '+${it.id})">View</button></td>
      </tr>
    `).join('') : '<tr><td colspan="7">No items in master.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#dc2626;">${esc(err.message)}</td></tr>`;
  }
}

async function loadNotificationsPage() {
  const list = document.getElementById('apiNotificationsList');
  if (!list) return;
  list.innerHTML = '<div class="card">Loading inbox...</div>';
  try {
    const inbox = await WisetrackAPI.getInbox();
    const rows = Array.isArray(inbox) ? inbox : (inbox?.items || []);
    list.innerHTML = rows.length ? rows.map(n => `
      <div class="card" style="margin-bottom:12px;">
        <strong>${esc(n.title || n.subject || 'Notification')}</strong>
        <p style="color:var(--text-muted);margin:6px 0 0;">${esc(n.message || n.body || '')}</p>
        <small>${esc(n.createdAt || '')}</small>
      </div>
    `).join('') : '<div class="card">Inbox empty.</div>';
  } catch (err) {
    list.innerHTML = `<div class="card" style="color:#dc2626;">${esc(err.message)}</div>`;
  }
}

async function loadAuditPage() {
  const tbody = document.getElementById('apiAuditBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6">Loading audit logs...</td></tr>';
  try {
    const logs = await WisetrackAPI.getAuditLogs(null, null, 100);
    const rows = Array.isArray(logs) ? logs : [];
    tbody.innerHTML = rows.length ? rows.map(l => `
      <tr>
        <td>${esc(l.createdAt || l.timestamp || '-')}</td>
        <td>${esc(l.userName || l.actorName || l.userId || '-')}</td>
        <td>${esc(l.action || '-')}</td>
        <td>${esc(l.entityName || l.module || '-')}</td>
        <td>${esc(l.details || l.message || l.entityId || '-')}</td>
        <td>—</td>
      </tr>
    `).join('') : '<tr><td colspan="6">No audit logs yet.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc2626;">${esc(err.message)}</td></tr>`;
  }
}

// Override CRUD handlers to ALWAYS use API (no localStorage fallback)
async function handleCreateResort(e) {
  e.preventDefault();
  const name = document.getElementById('resortName').value;
  const code = document.getElementById('resortCode').value;
  const location = document.getElementById('resortLocation').value;
  try {
    await WisetrackAPI.createResort({ name, code, location });
    closeModal();
    showToast(`Resort "${name}" saved to API`);
    setTimeout(() => location.reload(), 400);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleEditResort(e, resortId) {
  e.preventDefault();
  const name = document.getElementById('editResortName').value;
  const code = document.getElementById('editResortCode').value;
  const location = document.getElementById('editResortLocation').value;
  try {
    await WisetrackAPI.updateResort(resortId, { name, code, location, isActive: true });
    closeModal();
    showToast(`Resort updated`);
    setTimeout(() => location.reload(), 400);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleDeleteResort(resortId) {
  try {
    await WisetrackAPI.deleteResort(resortId);
    closeModal();
    showToast('Resort deleted', 'danger');
    setTimeout(() => location.reload(), 400);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleCreateProject(e) {
  e.preventDefault();
  const resortId = parseInt(document.getElementById('projectResortId').value, 10);
  const parentRaw = document.getElementById('projectParentId').value;
  const parentProjectId = parentRaw ? parseInt(parentRaw, 10) : null;
  const name = document.getElementById('projectName').value;
  const code = document.getElementById('projectCode').value;
  const desc = document.getElementById('projectDesc')?.value || '';
  const startDate = document.getElementById('projectStartDate')?.value || null;
  const endDate = document.getElementById('projectEndDate')?.value || null;

  const projects = (typeof getModalProjects === 'function' ? getModalProjects() : []) || [];
  let level = 1;
  if (parentProjectId) {
    const parent = projects.find(p => String(p.id) === String(parentProjectId));
    level = (Number(parent?.level) || 1) + 1;
  }

  try {
    await WisetrackAPI.createProject({
      resortId,
      parentProjectId,
      name,
      code,
      description: desc,
      status: 'Draft',
      startDate: startDate || null,
      endDate: endDate || null
    });
    closeModal();
    const label = level === 1 ? 'Level 1 Root Project' : level === 2 ? 'Level 2 Sub-Project' : level === 3 ? 'Level 3 Work Package' : `Level ${level} Child`;
    showToast(`${label} "${name}" saved`);
    setTimeout(() => location.reload(), 400);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleDeleteProject(projectId) {
  try {
    await WisetrackAPI.deleteProject(projectId);
    closeModal();
    showToast('Project deleted', 'danger');
    setTimeout(() => location.reload(), 400);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleAddUser(e) {
  e.preventDefault();
  const fullName = document.getElementById('userName').value;
  const email = document.getElementById('userEmail').value;
  try {
    await WisetrackAPI.createUser({ fullName, email, password: 'Welcome@123', isInternal: true, roleIds: [] });
    closeModal();
    showToast(`User "${fullName}" created (password: Welcome@123)`);
    setTimeout(() => location.reload(), 400);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function openCreateProjectModal(preselectedParentId = null) {
  let resorts = [];
  let projects = [];
  try {
    resorts = await WisetrackAPI.getResorts();
    const rid = localStorage.getItem('WISETRACK_SELECTED_RESORT') || (resorts[0] && resorts[0].id);
    // All projects (roots + nested) so any node can be chosen as parent → N-level WBS
    projects = await WisetrackAPI.getProjects(rid || undefined);
  } catch (err) {
    showToast(err.message, 'danger');
    return;
  }

  projects = typeof computeProjectLevels === 'function' ? computeProjectLevels(projects) : projects;
  window.__modalProjects = projects;

  const selectedResort = localStorage.getItem('WISETRACK_SELECTED_RESORT') || (resorts[0] && String(resorts[0].id)) || '';
  const resortOptions = resorts.map(r =>
    `<option value="${r.id}" ${String(r.id) === String(selectedResort) ? 'selected' : ''}>${esc(r.name)}</option>`
  ).join('');

  const resortProjects = selectedResort
    ? projects.filter(p => String(p.resortId) === String(selectedResort))
    : projects;
  const parentOptions = typeof buildHierarchyOptions === 'function'
    ? buildHierarchyOptions(resortProjects, preselectedParentId)
    : (`<option value="">-- None (Root Project) --</option>` +
       resortProjects.map(p => `<option value="${p.id}" ${String(p.id) === String(preselectedParentId) ? 'selected' : ''}>${esc(p.name)}</option>`).join(''));

  const html = `
    <form id="createProjectForm" onsubmit="handleCreateProject(event)">
      <div id="projectLevelPreview" style="margin-bottom:14px;"></div>
      <div class="form-grid">
        <div class="field">
          <label>Resort *</label>
          <select id="projectResortId" required onchange="updateParentDropdown(this.value)">${resortOptions}</select>
        </div>
        <div class="field">
          <label>N-Level Parent (any project can have a child)</label>
          <select id="projectParentId" onchange="updateLevelPreview(this.value)">${parentOptions}</select>
        </div>
        <div class="field full">
          <label>Project / Sub-Project Title *</label>
          <input type="text" id="projectName" required>
        </div>
        <div class="field">
          <label>Code</label>
          <input type="text" id="projectCode">
        </div>
        <div class="field">
          <label>Start Date</label>
          <input type="date" id="projectStartDate">
        </div>
        <div class="field">
          <label>End Date</label>
          <input type="date" id="projectEndDate">
        </div>
        <div class="field full">
          <label>Description</label>
          <textarea id="projectDesc"></textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">＋ Create N-Level Project</button>
      </div>
    </form>`;
  openModal('Create N-Level Project / Sub-Project', html);
  setTimeout(() => {
    if (typeof updateLevelPreview === 'function') updateLevelPreview(preselectedParentId || '');
  }, 50);
}

async function openCreateResortModal() {
  const html = `
    <form id="createResortForm" onsubmit="handleCreateResort(event)">
      <div class="form-grid">
        <div class="field full">
          <label>Resort Name *</label>
          <input type="text" id="resortName" required>
        </div>
        <div class="field">
          <label>Code</label>
          <input type="text" id="resortCode">
        </div>
        <div class="field">
          <label>Location</label>
          <input type="text" id="resortLocation">
        </div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">＋ Create Resort</button>
      </div>
    </form>`;
  openModal('Create Resort (API)', html);
}

async function openEditResortModal(resortId) {
  try {
    const r = await WisetrackAPI.getResort(resortId);
    const html = `
      <form onsubmit="handleEditResort(event, '${r.id}')">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input id="editResortName" value="${esc(r.name)}" required></div>
          <div class="field"><label>Code</label><input id="editResortCode" value="${esc(r.code || '')}"></div>
          <div class="field"><label>Location</label><input id="editResortLocation" value="${esc(r.location || '')}"></div>
        </div>
        <div class="modalfoot" style="padding:0;margin-top:16px;">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>`;
    openModal('Edit Resort (API)', html);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Full API UI is handled by modules.js (WTPages). Keep only auth + chrome helpers here.
  if (typeof WTPages !== 'undefined') return;
  if (!requireAuth()) return;
  applyLoggedInUser();
  await fillResortSelector();

  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  if (page === 'resorts.html') await loadResortsPage();
  else if (page === 'projects.html') await loadProjectsPage();
  else if (page === 'users.html') await loadUsersPage();
  else if (page === 'dashboard.html' || page === 'index.html' || page === '') await loadDashboardPage();
  else if (page === 'issues.html') await loadIssuesPage();
  else if (page === 'items.html') await loadItemsPage();
  else if (page === 'notifications.html') await loadNotificationsPage();
  else if (page === 'audit-logs.html') await loadAuditPage();
});
