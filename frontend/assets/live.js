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

async function applyLoggedInUser() {
  const name = localStorage.getItem('WISETRACK_USER_NAME') || 'User';
  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.getMyAccess) {
      const access = await WisetrackAPI.getMyAccess();
      localStorage.setItem('WISETRACK_IS_ADMIN', access.isAdmin ? 'true' : 'false');
      localStorage.setItem('WISETRACK_PERMISSIONS', JSON.stringify(access.permissions || []));
    }
  } catch (_) { /* keep cached flags */ }
  const initials = name.split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'U';
  document.querySelectorAll('.user-name').forEach(el => { el.textContent = name; });
  document.querySelectorAll('.avatar').forEach(el => { el.textContent = initials; });
  const accessLabel = (typeof wtIsAdmin === 'function' && wtIsAdmin()) ? 'Admin' : 'User';
  document.querySelectorAll('.current-role-label').forEach(el => { el.textContent = accessLabel; });
  document.querySelectorAll('a[href="login.html"]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); WisetrackAPI.logout(); };
  });
  if (typeof wtBuildSidebar === 'function') {
    const side = document.querySelector('aside.side');
    if (side) side.innerHTML = wtBuildSidebar();
    document.querySelectorAll('.current-role-label').forEach(el => { el.textContent = accessLabel; });
    document.querySelectorAll('.user-name').forEach(el => { el.textContent = name; });
    document.querySelectorAll('.avatar').forEach(el => { el.textContent = initials; });
  }
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
  localStorage.removeItem('WISETRACK_SELECTED_PROJECT');
  if (typeof showToast === 'function') showToast('Resort switched', 'info');
  setTimeout(() => location.reload(), 200);
}

function wtProjectsAsTree(projects) {
  const list = projects || [];
  const byParent = new Map();
  list.forEach(p => {
    const key = Number(p.parentProjectId || p.parentId || 0);
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(p);
  });
  const out = [];
  const seen = new Set();
  function walk(parentId, depth) {
    (byParent.get(parentId) || []).forEach(p => {
      const id = Number(p.id);
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ ...p, _depth: depth });
      walk(id, depth + 1);
    });
  }
  walk(0, 0);
  list.forEach(p => {
    const id = Number(p.id);
    if (!seen.has(id)) {
      seen.add(id);
      out.push({ ...p, _depth: 0 });
    }
  });
  return out;
}

function wtPreferProject(projects) {
  const list = projects || [];
  if (!list.length) return null;
  return list.find(p => /MEP/i.test(p.code || '') || /MEP/i.test(p.name || ''))
    || list.find(p => p.parentProjectId && String(p.status || '').toLowerCase() === 'active')
    || list.find(p => p.parentProjectId)
    || list.find(p => String(p.status || '').toLowerCase() === 'active')
    || list[0];
}

async function fillProjectSelector() {
  const button = document.getElementById('globalProjectButton');
  const menu = document.getElementById('globalProjectMenu');
  if (!button || !menu) return;
  try {
    const resortId = localStorage.getItem('WISETRACK_SELECTED_RESORT') || undefined;
    const projects = await WisetrackAPI.getProjects(resortId || undefined).catch(() => []);
    const tree = typeof wtProjectsAsTree === 'function' ? wtProjectsAsTree(projects) : (projects || []);
    let cur = localStorage.getItem('WISETRACK_SELECTED_PROJECT') || '';
    if (!cur || !tree.some(p => String(p.id) === String(cur))) {
      const prefer = wtPreferProject(tree);
      cur = prefer ? String(prefer.id) : '';
      if (cur) localStorage.setItem('WISETRACK_SELECTED_PROJECT', cur);
      else localStorage.removeItem('WISETRACK_SELECTED_PROJECT');
    }
    const children = new Map();
    const ids = new Set(tree.map(p => Number(p.id)));
    tree.forEach(p => {
      const parent = Number(p.parentProjectId || p.parentId || 0);
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(p);
    });
    window.wtProjectExpanded = window.wtProjectExpanded || new Set();
    const renderNode = (p, depth = 0) => {
      const id = Number(p.id);
      const kids = children.get(id) || [];
      const expanded = window.wtProjectExpanded.has(id);
      return `<div class="project-tree-row" style="--tree-depth:${depth}">
        ${kids.length ? `<button type="button" class="project-tree-expand" aria-label="${expanded ? 'Collapse' : 'Expand'} ${esc(p.name || p.title)}" aria-expanded="${expanded}" onclick="wtToggleProjectNode(${id})"><i class="fa-solid fa-chevron-${expanded ? 'down' : 'right'}"></i></button>` : '<span class="project-tree-spacer"></span>'}
        <button type="button" class="project-tree-option${String(p.id) === String(cur) ? ' selected' : ''}" onclick="wtChooseProject(${id})">${esc(p.name || p.title)} <small>${esc(p.code || '#' + p.id)}</small></button>
      </div>${kids.length && expanded ? renderBranch(id, depth + 1) : ''}`;
    };
    const renderBranch = (parentId, depth = 0) => (children.get(Number(parentId)) || []).map(p => renderNode(p, depth)).join('');
    const roots = tree.filter(p => {
      const parent = Number(p.parentProjectId || p.parentId || 0);
      return !parent || !ids.has(parent);
    });
    menu.innerHTML = roots.length ? roots.map(p => renderNode(p)).join('') : '<div class="project-tree-empty">No projects</div>';
    const selected = tree.find(p => String(p.id) === String(cur));
    button.innerHTML = `${esc(selected ? (selected.name || selected.title) : 'No projects')} <small>${selected ? esc(selected.code || '#' + selected.id) : ''}</small><i class="fa-solid fa-chevron-down"></i>`;
  } catch (err) {
    menu.innerHTML = `<div class="project-tree-empty">${esc(err.message)}</div>`;
    button.textContent = 'Projects unavailable';
  }
}

function wtToggleProjectMenu() {
  const button = document.getElementById('globalProjectButton');
  const menu = document.getElementById('globalProjectMenu');
  if (!button || !menu) return;
  menu.hidden = !menu.hidden;
  button.setAttribute('aria-expanded', String(!menu.hidden));
}

function wtToggleProjectNode(id) {
  window.wtProjectExpanded = window.wtProjectExpanded || new Set();
  if (window.wtProjectExpanded.has(Number(id))) window.wtProjectExpanded.delete(Number(id));
  else window.wtProjectExpanded.add(Number(id));
  fillProjectSelector();
  const menu = document.getElementById('globalProjectMenu');
  const button = document.getElementById('globalProjectButton');
  if (menu) menu.hidden = false;
  if (button) button.setAttribute('aria-expanded', 'true');
}

function wtChooseProject(id) {
  onGlobalProjectChange(String(id));
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
    tbody.innerHTML = `<tr><td colspan="8" style="color:#dc2626;">API failed: ${esc(err.message)}. Is backend API service running?</td></tr>`;
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
    const inbox = await WisetrackAPI.getInbox(1, 25);
    const rows = Array.isArray(inbox) ? inbox : (inbox?.items || []);
    list.innerHTML = rows.length ? rows.map(n => {
      const note = n.notification || n;
      return `
      <div class="card" style="margin-bottom:12px;">
        <strong>${esc(note.title || note.subject || 'Notification')}</strong>
        <p style="color:var(--text-muted);margin:6px 0 0;">${esc(note.message || note.body || '')}</p>
        <small>${esc(note.createdAt || '')}</small>
      </div>
    `;
    }).join('') : '<div class="card">Inbox empty.</div>';
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
  const location = document.getElementById('resortLocation').value;
  try {
    const saved = await WisetrackAPI.createResort({ name, location });
    closeModal();
    await fillResortSelector();
    if (typeof WTPages !== 'undefined' && typeof WTPages.refreshResorts === 'function') {
      await WTPages.refreshResorts();
    }
    showToast(`Resort "${name}" created successfully · ${saved.code || saved.Code || 'RST'}`, 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleEditResort(e, resortId) {
  e.preventDefault();
  const name = document.getElementById('editResortName').value;
  const code = document.getElementById('editResortCode').value;
  const location = document.getElementById('editResortLocation').value;
  const isActive = document.getElementById('editResortIsActive').value === 'true';
  try {
    await WisetrackAPI.updateResort(resortId, { name, code, location, isActive });
    closeModal();
    await fillResortSelector();
    if (typeof WTPages !== 'undefined' && typeof WTPages.refreshResorts === 'function') await WTPages.refreshResorts();
    showToast(`Resort updated successfully`);
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
  const desc = document.getElementById('projectDesc')?.value || '';
  const startDate = document.getElementById('projectStartDate')?.value || null;
  const endDate = document.getElementById('projectEndDate')?.value || null;
  const ownerId = Number(document.getElementById('projectOwnerId')?.value || 0) || null;
  const teamUserIds = [...(document.getElementById('projectTeamIds')?.selectedOptions || [])]
    .map(option => Number(option.value)).filter(id => id > 0);
  const initialBudget = Number(document.getElementById('projectInitialBudget')?.value || 0);
  const budgetCurrency = document.getElementById('projectBudgetCurrency')?.value || 'INR';
  const code = document.getElementById('projectCode')?.value.trim() || null;
  const clientName = document.getElementById('projectClient')?.value.trim() || null;
  const sponsor = document.getElementById('projectSponsor')?.value.trim() || null;
  const currency = document.getElementById('projectCurrency')?.value || 'INR';
  const status = document.getElementById('projectStatus')?.value || 'Draft';
  const profileNotes = document.getElementById('projectNotes')?.value.trim() || null;
  const attachments = [...(document.getElementById('projectAttachments')?.files || [])];

  const projects = (typeof getModalProjects === 'function' ? getModalProjects() : []) || [];
  let level = 1;
  if (parentProjectId) {
    const parent = projects.find(p => String(p.id) === String(parentProjectId));
    level = (Number(parent?.level) || 1) + 1;
  }

  try {
    const saved = await WisetrackAPI.createProject({
      resortId,
      parentProjectId,
      name,
      code,
      ownerId,
      teamUserIds,
      clientName,
      sponsor,
      currency,
      profileNotes,
      description: desc,
      status,
      startDate: startDate || null,
      endDate: endDate || null
    });
    const projectId = Number(saved.id || saved.Id);
    let attachmentWarning = '';
    for (const file of attachments) {
      try { await WisetrackAPI.uploadFile(file, 'Project', projectId); }
      catch (uploadErr) { attachmentWarning = ` Attachment upload failed: ${uploadErr.message}`; break; }
    }
    let budgetWarning = '';
    if (initialBudget > 0) {
      try {
        await WisetrackAPI.createBudget({ projectId, name: 'Initial Project Budget', approvedAmount: initialBudget, currency: budgetCurrency });
      } catch (budgetErr) {
        budgetWarning = ` Project saved, but initial budget could not be added: ${budgetErr.message}`;
      }
    }
    if (attachmentWarning) budgetWarning += attachmentWarning;
    closeModal();
    const label = level === 1 ? 'Level 1 Root Project' : level === 2 ? 'Level 2 Sub-Project' : level === 3 ? 'Level 3 Work Package' : `Level ${level} Child`;
    showToast(`${label} "${name}" saved (${saved.code || saved.Code || ''})${initialBudget > 0 && !budgetWarning ? ' · initial budget added' : ''}${budgetWarning}`, budgetWarning ? 'warning' : 'success');
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
  let users = [];
  try {
    resorts = await WisetrackAPI.getResorts();
    const rid = localStorage.getItem('WISETRACK_SELECTED_RESORT') || (resorts[0] && resorts[0].id);
    // All projects (roots + nested) so any node can be chosen as parent → N-level WBS
    projects = await WisetrackAPI.getProjects(rid || undefined);
    users = await WisetrackAPI.getUsers();
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
  const currentUserId = Number(localStorage.getItem('WISETRACK_USER_ID'));
  const activeUsers = users.filter(u => u.isActive !== false);
  const userOptions = activeUsers.map(u => `<option value="${u.id}">${esc(u.fullName || u.email)}</option>`).join('');
  const ownerOptions = `<option value="">Select owner</option>` + activeUsers.map(u =>
    `<option value="${u.id}" ${Number(u.id) === currentUserId ? 'selected' : ''}>${esc(u.fullName || u.email)}</option>`
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
        <div class="field"><label>Project Code</label><input type="text" id="projectCode" placeholder="Auto-generated if blank"></div>
        <div class="field">
          <label>Project Owner</label>
          <select id="projectOwnerId">${ownerOptions}</select>
        </div>
        <div class="field">
          <label>Initial Approved Budget</label>
          <input type="number" id="projectInitialBudget" min="0" step="0.01" placeholder="Leave blank to add later">
        </div>
        <div class="field">
          <label>Budget Currency</label>
          <select id="projectBudgetCurrency"><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option></select>
        </div>
        <div class="field">
          <label>Project Team</label>
          <select id="projectTeamIds" multiple size="4">${userOptions}</select>
          <small class="card-subtitle">Owner is included in the project team automatically.</small>
        </div>
        <p class="card-subtitle" style="grid-column:1/-1;margin:0">Code auto-assigns on save (PRJ-001; child PRJ-001-01).</p>
        <div class="field">
          <label>Start Date</label>
          <input type="date" id="projectStartDate">
        </div>
        <div class="field">
          <label>End Date</label>
          <input type="date" id="projectEndDate">
        </div>
        <div class="field"><label>Status</label><select id="projectStatus"><option value="Draft">Draft</option><option value="Active">Active</option><option value="On Track">On Track</option><option value="At Risk">At Risk</option><option value="Delayed">Delayed</option></select></div>
        <div class="field full">
          <label>Description</label>
          <textarea id="projectDesc"></textarea>
        </div>
        <div class="field"><label>Client</label><input id="projectClient" type="text"></div>
        <div class="field"><label>Sponsor</label><input id="projectSponsor" type="text"></div>
        <div class="field"><label>Project Currency</label><select id="projectCurrency"><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
        <div class="field"><label>Relevant Notes</label><textarea id="projectNotes"></textarea></div>
        <div class="field full"><label>Attachments</label><input type="file" id="projectAttachments" multiple></div>
        <p class="card-subtitle" style="grid-column:1/-1;margin:0">Schedule dates, team, budget, tasks, issues, BOQ, costs and other records remain linked to this project.</p>
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
        <p class="card-subtitle" style="grid-column:1/-1;margin:0">Code auto-assigns from the resort name (for example, ORB-RST-001).</p>
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
          <div class="field"><label>Code (auto)</label><input id="editResortCode" value="${esc(r.code || '')}" readonly></div>
          <div class="field"><label>Location</label><input id="editResortLocation" value="${esc(r.location || '')}"></div>
          <div class="field"><label>Status</label><select id="editResortIsActive"><option value="true" ${(r.isActive ?? r.IsActive) ? 'selected' : ''}>Active</option><option value="false" ${(r.isActive ?? r.IsActive) ? '' : 'selected'}>Inactive</option></select></div>
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
  if (typeof fillProjectSelector === 'function') await fillProjectSelector();

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
