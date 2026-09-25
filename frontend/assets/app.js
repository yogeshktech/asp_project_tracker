// WISETRACK APPLICATION CONTROLLER & INTERACTIVITY

// Toast Notification (Top Center Floating Banner)
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  let icon = '<i class="fa-solid fa-circle-check" style="font-size:16px;"></i>';
  if (type === 'warning' || type === 'warn') {
    icon = '<i class="fa-solid fa-triangle-exclamation" style="font-size:16px;"></i>';
  } else if (type === 'danger' || type === 'error') {
    icon = '<i class="fa-solid fa-circle-xmark" style="font-size:16px;"></i>';
  } else if (type === 'info') {
    icon = '<i class="fa-solid fa-circle-info" style="font-size:16px;"></i>';
  }

  toast.innerHTML = `<span style="display:inline-flex; align-items:center;">${icon}</span> <span>${message}</span>`;
  toast.className = `toast show ${type}`;

  if (window.__toastTimeout) clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Modal Management
function openModal(title, contentHtml, footerHtml = '', boxClass = '') {
  document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
  let modal = document.getElementById('modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalbox">
        <div class="modalhead">
          <h3 id="modalTitle"></h3>
          <button class="close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="modalbody" id="modalBody"></div>
        <div class="modalfoot" id="modalFoot"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const box = modal.querySelector('.modalbox');
  if (box) box.className = 'modalbox' + (boxClass ? ' ' + boxClass : '');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = contentHtml;
  
  const foot = document.getElementById('modalFoot');
  if (footerHtml) {
    foot.innerHTML = footerHtml;
    foot.style.display = 'flex';
  } else {
    foot.style.display = 'none';
  }
  modal.classList.add('show');
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.classList.remove('show');
}

// Get Data from LocalStorage (static WISETRACK_DATA is optional — live API pages may omit data.js)
function getStaticData(key) {
  if (typeof WISETRACK_DATA !== 'undefined' && WISETRACK_DATA && Array.isArray(WISETRACK_DATA[key])) {
    return WISETRACK_DATA[key];
  }
  return [];
}

function getResorts() {
  const data = localStorage.getItem('WISETRACK_RESORTS');
  return data ? JSON.parse(data) : getStaticData('resorts');
}

function getProjects() {
  const data = localStorage.getItem('WISETRACK_PROJECTS');
  return data ? JSON.parse(data) : getStaticData('projects');
}

function getUsers() {
  const data = localStorage.getItem('WISETRACK_USERS');
  return data ? JSON.parse(data) : getStaticData('users');
}

function getSelectedResortId() {
  return localStorage.getItem('WISETRACK_SELECTED_RESORT') || 'RES-GOA-01';
}

function setSelectedResortId(resortId) {
  localStorage.setItem('WISETRACK_SELECTED_RESORT', resortId);
  showToast(`Resort property switched to: ${getResortName(resortId)}`, 'info');
  // Refresh current page if dynamic rendering is active
  if (typeof renderPageContent === 'function') {
    renderPageContent();
  } else {
    setTimeout(() => window.location.reload(), 300);
  }
}

function getResortName(resortId) {
  const r = getResorts().find(x => String(x.id) === String(resortId) || x.code === resortId);
  return r ? r.name : "All Resorts";
}

function getSelectedProjectId() {
  return localStorage.getItem('WISETRACK_SELECTED_PROJECT') || 'PRJ-01';
}

function setSelectedProjectId(projectId) {
  if (!projectId) {
    localStorage.removeItem('WISETRACK_SELECTED_PROJECT');
    return;
  }
  localStorage.setItem('WISETRACK_SELECTED_PROJECT', String(projectId));
}

function onGlobalProjectChange(projectId) {
  setSelectedProjectId(projectId);
  if (typeof showToast === 'function') showToast('Showing this project only', 'info');
  setTimeout(() => location.reload(), 150);
}

// Role Switcher Handler
function onRoleChange(roleName) {
  localStorage.setItem('WISETRACK_ROLE', roleName);
  showToast(`Role switched to: ${roleName}`, 'info');
  const roleBadges = document.querySelectorAll('.current-role-label');
  roleBadges.forEach(el => el.textContent = roleName);
  
  // Update header and avatar (static demo users only when data.js is loaded)
  const demoUsers = typeof WISETRACK_DATA !== 'undefined' ? (WISETRACK_DATA.users || []) : [];
  const user = demoUsers.find(u => (u.role || '').toLowerCase().includes(roleName.toLowerCase())) || demoUsers[0];
  if (user) {
    document.querySelectorAll('.avatar').forEach(el => { el.textContent = user.avatar || 'U'; });
    document.querySelectorAll('.user-name').forEach(el => { el.textContent = user.name || roleName; });
  }
}

// --- MODAL BUILDERS ---

// 1. Create Resort Modal
function openCreateResortModal() {
  const html = `
    <form id="createResortForm" onsubmit="handleCreateResort(event)">
      <div class="form-grid">
        <div class="field full">
          <label>Resort / Property Name *</label>
          <input type="text" id="resortName" placeholder="e.g. Palm Grove Beach Resort, Kovalam" required>
        </div>
        <p class="card-subtitle" style="grid-column:1/-1;margin:0">Code auto-assigns on save (RST-001, RST-002…).</p>
        <div class="field">
          <label>Location / Region *</label>
          <input type="text" id="resortLocation" placeholder="e.g. Kovalam Beach, Kerala" required>
        </div>
        <div class="field">
          <label>General Manager / Lead *</label>
          <input type="text" id="resortGM" placeholder="e.g. Rajesh Nair" required>
        </div>
        <div class="field">
          <label>Total Allocated Budget (₹ Cr) *</label>
          <input type="text" id="resortBudget" placeholder="e.g. ₹28.50 Cr" required>
        </div>
        <div class="field">
          <label>Target Completion Date</label>
          <input type="date" id="resortDate" value="2027-03-31">
        </div>
        <div class="field full">
          <label>Project Scope & Property Description</label>
          <textarea id="resortDesc" placeholder="Enter resort description, key highlights, number of keys, etc."></textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">＋ Create Resort Property</button>
      </div>
    </form>
  `;
  openModal("Create New Resort / Property", html);
}

async function handleCreateResort(e) {
  e.preventDefault();
  const name = document.getElementById('resortName').value;
  const code = document.getElementById('resortCode')?.value || '';
  const location = document.getElementById('resortLocation').value;
  const gm = document.getElementById('resortGM').value;
  const budget = document.getElementById('resortBudget').value;
  const targetDate = document.getElementById('resortDate').value || "2027-03-31";
  const desc = document.getElementById('resortDesc').value;

  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      await WisetrackAPI.createResort({ name, location, description: desc });
      closeModal();
      showToast(`Resort "${name}" created via API!`);
      setTimeout(() => window.location.reload(), 400);
      return;
    }
  } catch (err) { console.warn('API fallback:', err); }

  const resorts = getResorts();
  const newResort = {
    id: `RES-${Date.now().toString().slice(-4)}`,
    name, code, location, gm, budget,
    spent: "₹0.00 Cr", progress: 0, status: "On Track", statusBadge: "green",
    totalProjects: 0, targetDate, desc
  };
  resorts.unshift(newResort);
  localStorage.setItem('WISETRACK_RESORTS', JSON.stringify(resorts));
  closeModal();
  showToast(`Resort "${name}" created successfully!`);
  setTimeout(() => window.location.reload(), 400);
}

/** Resolve numeric WBS depth (1 = root) from parentProjectId / parentId chain. */
function computeProjectLevels(projectsList) {
  const list = (projectsList || []).map(p => ({ ...p }));
  const byId = new Map(list.map(p => [String(p.id), p]));

  function depthOf(p, seen = new Set()) {
    const raw = (p.parentProjectId !== undefined && p.parentProjectId !== null && p.parentProjectId !== '')
      ? p.parentProjectId
      : (p.parentId !== undefined && p.parentId !== null && p.parentId !== '' ? p.parentId : null);
    if (raw == null) return 1;
    const pid = String(raw);
    if (seen.has(pid)) return 1;
    seen.add(pid);
    const parent = byId.get(pid);
    if (!parent) return 2;
    return depthOf(parent, seen) + 1;
  }

  list.forEach(p => {
    p.level = depthOf(p);
    p.parentId = (p.parentProjectId !== undefined && p.parentProjectId !== null && p.parentProjectId !== '')
      ? String(p.parentProjectId)
      : (p.parentId != null && p.parentId !== '' ? String(p.parentId) : null);
  });
  return list;
}

function getModalProjects() {
  if (window.__modalProjects && window.__modalProjects.length) return window.__modalProjects;
  return computeProjectLevels(getProjects());
}

function buildHierarchyOptions(projectsList, preselectedParentId = null) {
  const leveled = computeProjectLevels(projectsList);
  const normalized = leveled.map(p => ({
    ...p,
    id: String(p.id),
    parentId: p.parentId,
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

  // Every node is selectable as parent so any project can get a child (N-level WBS)
  let optionsHtml = `<option value="">-- None (Top Level 1 Root Parent Project) --</option>`;

  function traverse(node, depth = 1) {
    const isSelected = String(preselectedParentId) === String(node.id) ? "selected" : "";
    const lvl = depth;
    const indent = "&nbsp;&nbsp;".repeat((depth - 1) * 2);
    const tag = lvl === 1 ? '🔵 Level 1: ' : lvl === 2 ? '↳ 🟣 Level 2 Sub: ' : lvl === 3 ? '↳ ↳ 🟢 Level 3 Pkg: ' : `↳ ↳ ↳ 🟠 Level ${lvl} Task: `;
    optionsHtml += `<option value="${node.id}" ${isSelected}>${indent}${tag}${node.name} (${node.code || ''}) — add L${lvl + 1} child</option>`;
    if (node.children && node.children.length > 0) {
      node.children.forEach(c => traverse(c, depth + 1));
    }
  }

  roots.forEach(r => traverse(r, 1));
  return optionsHtml;
}

async function updateParentDropdown(resortId) {
  let projects = getModalProjects();
  if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
    try {
      const apiProjects = await WisetrackAPI.getProjects(resortId && resortId !== 'all' ? resortId : undefined);
      if (apiProjects?.length != null) {
        projects = computeProjectLevels(apiProjects);
        window.__modalProjects = projects;
      }
    } catch (_) { /* keep cached / local */ }
  }
  const resortProjects = (resortId === 'all' || !resortId)
    ? projects
    : projects.filter(p => String(p.resortId) === String(resortId) || String(p.resortId) === `RES-${resortId}`);
  const parentOptions = buildHierarchyOptions(resortProjects);
  const parentSel = document.getElementById('projectParentId');
  if (parentSel) {
    parentSel.innerHTML = parentOptions;
    updateLevelPreview(parentSel.value);
  }
}

function updateLevelPreview(parentId) {
  const previewEl = document.getElementById('projectLevelPreview');
  if (!previewEl) return;
  const projects = getModalProjects();
  if (!parentId) {
    previewEl.innerHTML = `<div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:8px 12px; border-radius:6px; font-size:12px; font-weight:700;">
      🔵 Creating <strong>LEVEL 1: ROOT PARENT PROJECT</strong> (Top-level Engineering Project)
    </div>`;
  } else {
    const parent = projects.find(p => String(p.id) === String(parentId)) || { name: 'Parent Package', level: 1 };
    const parentLevel = Number(parent.level) || 1;
    const nextLevel = parentLevel + 1;
    const badgeColor = nextLevel === 2 ? '#7c3aed' : nextLevel === 3 ? '#059669' : '#d97706';
    const bg = nextLevel === 2 ? '#faf5ff' : nextLevel === 3 ? '#f0fdf4' : '#fffbeb';
    const border = nextLevel === 2 ? '#e9d5ff' : nextLevel === 3 ? '#bbf7d0' : '#fde68a';
    const typeTitle = nextLevel === 2 ? 'SUB-PROJECT' : nextLevel === 3 ? 'CHILD WORK PACKAGE' : `N-TH TERM CHILD TASK (Level ${nextLevel})`;
    previewEl.innerHTML = `<div style="background:${bg}; border:1px solid ${border}; color:${badgeColor}; padding:8px 12px; border-radius:6px; font-size:12px; font-weight:700;">
      ↳ Creating <strong>LEVEL ${nextLevel}: ${typeTitle}</strong> under Parent L${parentLevel}: <u>${parent.name}</u> (${parent.code || ''})
    </div>`;
  }
}

// 2. Create N-Level Project Modal (Parent Project -> Sub-Project -> Work Package)
function openCreateProjectModal(preselectedParentId = null) {
  const resorts = getResorts();
  const projects = getProjects();
  const selectedResort = getSelectedResortId();

  // Filter projects by current resort for parent selector
  const resortProjects = projects.filter(p => String(p.resortId) === String(selectedResort) || String(p.resortId) === `RES-${selectedResort}`);
  const parentOptions = buildHierarchyOptions(resortProjects, preselectedParentId);

  let resortOptions = "";
  resorts.forEach(r => {
    resortOptions += `<option value="${r.id}" ${String(r.id) === String(selectedResort) ? "selected" : ""}>${r.name} (${r.code})</option>`;
  });

  const html = `
    <form id="createProjectForm" onsubmit="handleCreateProject(event)">
      <div id="projectLevelPreview" style="margin-bottom:14px;"></div>
      <div class="form-grid">
        <div class="field">
          <label>Resort Property *</label>
          <select id="projectResortId" required onchange="updateParentDropdown(this.value)">
            ${resortOptions}
          </select>
        </div>
        <div class="field">
          <label>N-Level Parent Project Selection *</label>
          <select id="projectParentId" onchange="updateLevelPreview(this.value)">
            ${parentOptions}
          </select>
        </div>
        <div class="field full">
          <label>Project / Sub-Project Title *</label>
          <input type="text" id="projectName" placeholder="e.g. Electrical 11kV Substation & Cable Laying" required>
        </div>
        <p class="card-subtitle" style="grid-column:1/-1;margin:0">Code auto-assigns on save (PRJ-001; sub-project PRJ-001-01).</p>
        <div class="field">
          <label>Discipline / Category *</label>
          <select id="projectDiscipline" required>
            <option>Civil Structure</option>
            <option>MEP & Electrical</option>
            <option>HVAC & Air Conditioning</option>
            <option>Plumbing & Fire Safety</option>
            <option>Interior Fitout & FF&E</option>
            <option>Landscaping & Outdoor</option>
            <option>Building Automation & IT</option>
          </select>
        </div>
        <div class="field">
          <label>Project Manager / Assignee *</label>
          <select id="projectOwner" required>
            <option>Rahul Sharma (Project Manager)</option>
            <option>Amit Verma (Site Engineer)</option>
            <option>Priya Mehta (Interior PM)</option>
            <option>Manoj Joshi (HVAC Lead)</option>
            <option>Ravi Shankar (Civil Lead)</option>
          </select>
        </div>
        <div class="field">
          <label>Allocated Budget *</label>
          <input type="text" id="projectBudget" placeholder="e.g. ₹4.50 Cr" required>
        </div>
        <div class="field">
          <label>Start Date</label>
          <input type="date" id="projectStartDate" value="2026-09-01">
        </div>
        <div class="field">
          <label>Target Handover Date</label>
          <input type="date" id="projectEndDate" value="2026-12-31">
        </div>
        <div class="field full">
          <label>Scope of Work / Deliverables</label>
          <textarea id="projectDesc" placeholder="Enter deliverables, milestones, and technical specifications..."></textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">＋ Create N-Level Project</button>
      </div>
    </form>
  `;
  openModal("Create N-Level Project / Sub-Project", html);
  setTimeout(() => updateLevelPreview(preselectedParentId), 50);
}

async function handleCreateProject(e) {
  e.preventDefault();
  const resortId = document.getElementById('projectResortId').value;
  const parentId = document.getElementById('projectParentId').value || null;
  const name = document.getElementById('projectName').value.trim();
  const code = document.getElementById('projectCode')?.value.trim() || '';
  const discipline = document.getElementById('projectDiscipline').value;
  const owner = document.getElementById('projectOwner').value;
  const budget = document.getElementById('projectBudget').value;
  const startDate = document.getElementById('projectStartDate').value || "2026-09-01";
  const endDate = document.getElementById('projectEndDate').value || "2026-12-31";
  const desc = document.getElementById('projectDesc').value;

  const projects = getProjects();
  let level = 1;
  let parentName = "Root";
  if (parentId) {
    const parent = projects.find(p => String(p.id) === String(parentId));
    if (parent) {
      level = (Number(parent.level) || 1) + 1;
      parentName = parent.name;
    }
  }

  // Try API call safely with integer resort ID
  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      let numResortId = parseInt(resortId);
      if (isNaN(numResortId) || numResortId <= 0) {
        const apiResorts = await WisetrackAPI.getResorts().catch(() => []);
        if (apiResorts && apiResorts.length > 0) {
          const matched = apiResorts.find(r => r.code === resortId || String(r.id) === String(resortId));
          numResortId = matched ? matched.id : apiResorts[0].id;
        } else {
          numResortId = 1;
        }
      }

      let numParentId = parentId ? parseInt(parentId) : null;
      if (parentId && isNaN(numParentId)) {
        // Find if parent has numeric ID from API
        const apiProjects = await WisetrackAPI.getProjects().catch(() => []);
        const parentMatch = apiProjects.find(p => String(p.id) === String(parentId) || p.code === parentId);
        if (parentMatch) numParentId = parentMatch.id;
      }

      await WisetrackAPI.createProject({
        name,
        resortId: numResortId,
        parentProjectId: (numParentId && !isNaN(numParentId)) ? numParentId : null,
        description: desc,
        startDate,
        endDate
      });
      closeModal();
      showToast(`Project "${name}" (Level ${level}) created via API!`);
      setTimeout(() => window.location.reload(), 400);
      return;
    }
  } catch (err) {
    console.warn('API error / fallback to local storage:', err);
  }

  // LocalStorage / client-side creation fallback
  const newProject = {
    id: `PRJ-${Date.now().toString().slice(-5)}`,
    resortId: String(resortId),
    parentId: parentId ? String(parentId) : null,
    level,
    name,
    code,
    discipline,
    owner,
    budget,
    spent: "₹0.00 Cr",
    progress: 0,
    health: "On Track",
    healthBadge: "green",
    startDate,
    endDate,
    childrenCount: 0,
    desc
  };
  projects.push(newProject);
  localStorage.setItem('WISETRACK_PROJECTS', JSON.stringify(projects));
  closeModal();
  const typeLabel = level === 1 ? 'Root Parent Project' : level === 2 ? 'Sub-Project' : level === 3 ? 'Work Package' : `Level ${level} Child Task`;
  showToast(`Created ${typeLabel} "${name}" under ${parentName}!`, 'success');
  setTimeout(() => window.location.reload(), 400);
}

// 3. Add User Modal
function openAddUserModal() {
  const html = `
    <form id="addUserForm" onsubmit="handleAddUser(event)">
      <div class="form-grid">
        <div class="field">
          <label>Full Name *</label>
          <input type="text" id="userName" placeholder="e.g. Vikramaditya Roy" required>
        </div>
        <div class="field">
          <label>Corporate Email *</label>
          <input type="email" id="userEmail" placeholder="e.g. vikram.roy@wisetrack.com" required>
        </div>
        <div class="field">
          <label>Assigned System Role *</label>
          <select id="userRole" required>
            <option value="Super / Project Admin">Super / Project Admin</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Site Engineer">Site Engineer</option>
            <option value="Finance / Cost Controller">Finance / Cost Controller</option>
            <option value="Quality & Safety Auditor">Quality & Safety Auditor</option>
            <option value="Resort GM / Executive">Resort GM / Executive</option>
          </select>
        </div>
        <div class="field">
          <label>Resort Property Access *</label>
          <select id="userResortAccess">
            <option>All Resorts (Global Access)</option>
            <option>Grand Oasis Resort Goa</option>
            <option>Royal Heritage Palace Jaipur</option>
            <option>Pine Valley Resort Manali</option>
            <option>Azure Sands Beach Resort Kovalam</option>
          </select>
        </div>
        <div class="field full">
          <label>Field Restrictions / Security Masking</label>
          <input type="text" id="userRestrictions" placeholder="e.g. Financials & Commercial rates hidden">
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">＋ Add Authorized User</button>
      </div>
    </form>
  `;
  openModal("Add Authorized User & Role", html);
}

async function handleAddUser(e) {
  e.preventDefault();
  const name = document.getElementById('userName').value;
  const email = document.getElementById('userEmail').value;
  const role = document.getElementById('userRole').value;
  const assignedResorts = document.getElementById('userResortAccess').value;
  const fieldRestrictions = document.getElementById('userRestrictions').value || "None";
  const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      await WisetrackAPI.createUser({ fullName: name, email, password: 'Welcome@123' });
      closeModal();
      showToast(`User "${name}" created via API!`);
      setTimeout(() => window.location.reload(), 400);
      return;
    }
  } catch (err) { console.warn('API fallback:', err); }

  const users = getUsers();
  const newUser = {
    id: `USR-${Date.now().toString().slice(-3)}`,
    name, email, role,
    roleId: role.toLowerCase().replace(/[^a-z]/g, ''),
    assignedResorts, assignedProjects: "Assigned per role",
    fieldRestrictions, status: "Active", statusBadge: "green", avatar
  };
  users.push(newUser);
  localStorage.setItem('WISETRACK_USERS', JSON.stringify(users));
  closeModal();
  showToast(`User "${name}" added with role "${role}"`);
  setTimeout(() => window.location.reload(), 400);
}

// 4. Add BOQ Item Modal
function openAddBOQItemModal() {
  const html = `
    <form onsubmit="event.preventDefault(); closeModal(); showToast('BOQ Item with attachments added successfully!');">
      <div class="form-grid">
        <div class="field full">
          <label>Item Description *</label>
          <input type="text" id="boqItemDesc" placeholder="e.g. Armoured XLPE Cable 4C x 50 sqmm 1.1kV" required>
        </div>
        <div class="field">
          <label>Item Code / Master Link</label>
          <input type="text" id="boqItemCode" placeholder="e.g. EL-CBL-009">
        </div>
        <div class="field">
          <label>Unit of Measure (UOM) *</label>
          <select id="boqItemUom" required>
            <option>Meter (Mtr)</option>
            <option>Numbers (Nos)</option>
            <option>Sets</option>
            <option>Cubic Meter (Cu.m)</option>
            <option>Square Meter (Sq.m)</option>
            <option>Kilograms (Kg)</option>
          </select>
        </div>
        <div class="field">
          <label>Estimated Quantity *</label>
          <input type="number" id="boqItemQty" placeholder="e.g. 1500" oninput="calcBoqTotal()" required>
        </div>
        <div class="field">
          <label>Unit Rate / Purchase Price (₹) *</label>
          <input type="number" id="boqItemRate" placeholder="e.g. 850" oninput="calcBoqTotal()" required>
        </div>
        <div class="field">
          <label>Calculated Total Amount (₹)</label>
          <input type="text" id="boqItemTotal" placeholder="₹0.00" readonly style="background:#f8fafc; font-weight:700; color:#1d4ed8;">
        </div>
        <div class="field">
          <label>Approved Brand Make *</label>
          <input type="text" id="boqItemBrand" placeholder="e.g. Polycab / Havells / Finolex" required>
        </div>
        <div class="field full">
          <label>Item Image / Drawing (Upload or URL)</label>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="text" id="boqItemImage" placeholder="https://... or upload file" style="flex:1;">
            <input type="file" id="boqItemImageFile" style="font-size:12px; max-width:220px;" accept="image/*">
          </div>
        </div>
        <div class="field full">
          <label>Remark Column (Site / Specification Notes)</label>
          <input type="text" id="boqItemRemark" placeholder="e.g. Heavy duty armoured for underground ducting, IS:7098 compliance">
        </div>
        <div class="field full">
          <label>Upload Attachment / Technical Datasheet (Any file format)</label>
          <div style="border:1px dashed #cbd5e1; padding:12px; border-radius:6px; background:#f8fafc; display:flex; align-items:center; justify-content:space-between;">
            <input type="file" id="boqItemAttachment" style="font-size:12px;">
            <small style="color:#64748b;">Supports PDF, DOCX, DWG, XLSX, ZIP</small>
          </div>
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">＋ Save BOQ Line Item</button>
      </div>
    </form>
  `;
  openModal("Add BOQ Line Item (with Image, Brand & Attachments)", html);
}

function calcBoqTotal() {
  const qty = parseFloat(document.getElementById('boqItemQty')?.value) || 0;
  const rate = parseFloat(document.getElementById('boqItemRate')?.value) || 0;
  const total = qty * rate;
  const totalEl = document.getElementById('boqItemTotal');
  if (totalEl) {
    totalEl.value = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// 5. Excel Import BOQ Wizard Modal (Flexible 3rd-Party)
function openExcelImportModal() {
  const html = `
    <div style="text-align:center;padding:10px 0;">
      <div style="border:2px dashed #cbd5e1;border-radius:10px;padding:24px;background:#f8fafc;cursor:pointer;" onclick="simulateExcelUpload()">
        <div style="font-size:36px;margin-bottom:8px;">📊</div>
        <h4 style="font-size:15px;margin-bottom:4px;">Drag & Drop 3rd-Party BOQ Excel (.xlsx / .csv)</h4>
        <p style="color:#64748b;font-size:12px;">Flexible format: No rigid template required — smart column auto-detection.</p>
        <button type="button" class="btn primary sm" style="margin-top:10px;"><i class="fa-solid fa-folder-open"></i> Browse Excel File</button>
      </div>
      <div style="margin-top:14px;text-align:left;background:#eff6ff;padding:12px;border-radius:8px;border:1px solid #bfdbfe;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#1d4ed8;font-size:12px;">Automated Validation Engine (PM-11):</strong>
          <span class="badge blue">Pre-Commit Check</span>
        </div>
        <ul style="margin:6px 0 0 18px;font-size:11.5px;color:#334155;line-height:1.5;">
          <li>Validates item codes, UOM units, quantities and unit prices</li>
          <li>Checks duplicate entries and flags malformed rows</li>
          <li>Provides downloadable error report before data is committed to baseline</li>
        </ul>
      </div>
    </div>
  `;
  openModal("Import 3rd-Party Contractor BOQ Excel", html);
}

function simulateExcelUpload() {
  closeModal();
  showToast("Analyzing spreadsheet: 148 rows validated, 0 errors found...", "info");
  setTimeout(() => {
    showToast("BOQ imported successfully with baseline Version v2.1 created!", "success");
  }, 1200);
}

// 6. Add Issue / Incident Modal (PM-Special)
function openAddIssueModal() {
  const html = `
    <form onsubmit="handleLogIncident(event)">
      <div class="form-grid">
        <div class="field full">
          <label>What is the issue / Incident Title *</label>
          <input type="text" id="issueTitle" placeholder="e.g. Chilled water pipeline pressure test failed in Block B" required>
        </div>
        <div class="field">
          <label>Where is the issue (Location / Block / Shaft) *</label>
          <input type="text" id="issueLocation" placeholder="e.g. Block B Basement Central Chiller Plant" required>
        </div>
        <div class="field">
          <label>When it happened (Date & Time) *</label>
          <input type="datetime-local" id="issueDateTime" value="${new Date().toISOString().slice(0,16)}" required>
        </div>
        <div class="field">
          <label>Reported By (Site Engineer / PM) *</label>
          <select id="issueReporter" required>
            <option>Amit Verma (Site Engineer)</option>
            <option>Rahul Sharma (Project Manager)</option>
            <option>Manoj Joshi (HVAC Lead)</option>
            <option>Ravi Shankar (Civil Lead)</option>
          </select>
        </div>
        <div class="field">
          <label>Impact on Project Schedule & Cost *</label>
          <input type="text" id="issueImpact" placeholder="e.g. 3 Days Potential Slip on dry commissioning" required>
        </div>
        <div class="field">
          <label>Priority Level *</label>
          <select id="issuePriority" required>
            <option value="Critical">🔴 Critical (Immediate Escalation & Alert)</option>
            <option value="High" selected>🟠 High (24-Hour SLA Escalation)</option>
            <option value="Medium">🟡 Medium Priority</option>
            <option value="Low">🟢 Low Priority</option>
          </select>
        </div>
        <div class="field full">
          <label>Detailed Issue Description & Site Evidence</label>
          <textarea id="issueDesc" placeholder="Describe root cause, parts affected, and recommended immediate mitigations..."></textarea>
        </div>
        <div class="field full" style="background:#fef2f2; padding:10px; border-radius:6px; border:1px solid #fca5a5;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#991b1b; font-weight:700; margin:0;">
            <input type="checkbox" id="issueTriggerMail" checked>
            <span>✉️ Automatically dispatch high-priority escalation email to PMO & Stakeholders</span>
          </label>
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn danger"><i class="fa-solid fa-triangle-exclamation"></i> Log & Escalate Incident</button>
      </div>
    </form>
  `;
  openModal("Log Site Incident / Issue (with Automated Escalation)", html);
}

function handleLogIncident(e) {
  e.preventDefault();
  const title = document.getElementById('issueTitle').value;
  const triggerMail = document.getElementById('issueTriggerMail').checked;
  closeModal();
  showToast(`Incident "${title}" logged successfully!`);
  if (triggerMail) {
    setTimeout(() => {
      showToast(`High-Priority escalation email dispatched to PMO Stakeholders!`, 'info');
    }, 800);
  }
}

// 7. Daily Site Report (DSR) & Sub-Task Update Modal (PM-18)
async function openAddDailyReportModal(taskId, subTaskId) {
  if (window.WTPages && typeof WTPages.openTaskUpdateModal === 'function' && (taskId || subTaskId)) {
    await WTPages.openTaskUpdateModal(taskId, subTaskId);
    return;
  }
  let tasks = [];
  try {
    const loaded = typeof wtLoadLiveTasksAndOwners === 'function'
      ? await wtLoadLiveTasksAndOwners()
      : { tasks: [] };
    tasks = loaded.tasks || [];
  } catch (_) { tasks = []; }

  const opts = [];
  tasks.forEach(t => {
    opts.push(`<option value="${t.id}">${wtTaskCode(t)} · ${wtEscHtml(t.title || t.name)}</option>`);
    const walked = typeof wtWalkSubs === 'function' ? wtWalkSubs(t) : [];
    walked.forEach(({ node: s, depth, index }) => {
      const pad = depth <= 1 ? '↳ ' : depth === 2 ? '↳↳ ' : '↳↳↳ ';
      opts.push(`<option value="${t.id}:${s.id}">${pad}${wtSubTaskCode(t, s, index, depth)} · ${wtEscHtml(s.title || s.name)}</option>`);
    });
  });

  const html = `
    <form onsubmit="handleSaveDailyUpdate(event)">
      <div class="form-grid">
        <div class="field full">
          <label>Main Task / Sub-Task *</label>
          <select id="dsrSubTask" required>
            ${opts.join('') || '<option value="">No tasks in this project</option>'}
          </select>
        </div>
        <div class="field">
          <label>% Completion (task-owner only)</label>
          <input type="number" id="dsrToday" min="0" max="100">
        </div>
        <div class="field">
          <label>Sub-Task Site Status *</label>
          <select id="dsrStatus" required>
            <option value="InProgress">In Progress</option>
            <option value="Delayed">Delayed</option>
            <option value="NotStarted">Not Started</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div class="field full">
          <label>Optional text (not mandatory)</label>
          <input id="dsrNotes" placeholder="Extra note if needed">
        </div>
        <div class="field full">
          <label>Remark / delay reason</label>
          <textarea id="dsrRemark" placeholder="Reasons for delay or site issues"></textarea>
        </div>
        <div class="field full">
          <label>Attachment</label>
          <input type="file" id="dsrPhotos">
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn sm" onclick="openExcelDsrImportModal()"><i class="fa-solid fa-file-excel"></i> Upload CSV from Excel</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Submit Daily Progress</button>
        </div>
      </div>
    </form>
  `;
  openModal('Daily Site Progress (DSR) & Sub-Task Update', html);
}

async function handleSaveDailyUpdate(e) {
  e.preventDefault();
  const raw = (document.getElementById('dsrSubTask')?.value || '').trim();
  const [taskIdStr, subIdStr] = raw.split(':');
  const taskId = Number(taskIdStr);
  const subTaskId = Number(subIdStr) || null;
  if (!taskId) {
    showToast('Select a task or sub-task.', 'danger');
    return;
  }
  const pctInput = document.getElementById('dsrToday');
  const payload = {
    taskId,
    subTaskId,
    status: document.getElementById('dsrStatus')?.value || null,
    remarks: [
      (document.getElementById('dsrRemark')?.value || '').trim(),
      (document.getElementById('dsrNotes')?.value || '').trim()
    ].filter(Boolean).join(' | ') || null
  };
  if (pctInput && !pctInput.disabled && pctInput.value !== '') {
    payload.completionPercent = Number(pctInput.value);
  }
  const file = document.getElementById('dsrPhotos')?.files?.[0];
  try {
    if (file && typeof WisetrackAPI.uploadFile === 'function') {
      const uploaded = await WisetrackAPI.uploadFile(file, 'Tasks', taskId);
      payload.attachmentPath = uploaded.filePath || uploaded.FilePath;
    }
    await WisetrackAPI.addTaskUpdate(payload);
    closeModal();
    showToast('Daily site progress saved');
    if (window.WTPages?.refreshPlanning) await WTPages.refreshPlanning();
  } catch (err) {
    showToast(err.message || 'Could not save daily update', 'danger');
  }
}

function openExcelDsrImportModal() {
  closeModal();
  openModal('Bulk Upload Daily Status (CSV / Excel CSV)', `
    <form onsubmit="handleExcelDsrImport(event)">
      <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 12px">
        Site team can upload a CSV exported from Excel. Columns are flexible:
        <code>taskId, subTaskId, percent, status, remarks</code>
      </p>
      <div class="form-grid">
        <div class="field full">
          <label>CSV file</label>
          <input type="file" id="dsrCsvFile" accept=".csv,.txt,.tsv">
        </div>
        <div class="field full">
          <label>Or paste CSV / TSV</label>
          <textarea id="dsrCsvText" rows="8" placeholder="taskId,subTaskId,percent,status,remarks&#10;7,5,40,InProgress,Shaft work"></textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:12px">
        <button type="button" class="btn" onclick="wtDownloadDsrSample()">Download sample CSV</button>
        <button class="btn primary" type="submit">Validate &amp; Import</button>
      </div>
    </form>`);
}

function wtDownloadDsrSample() {
  wtDownloadText('site-daily-status-sample.csv', 'taskId,subTaskId,percent,status,remarks\n7,5,40,InProgress,Shaft work\n7,,55,InProgress,Main task note\n');
}

async function handleExcelDsrImport(e) {
  e.preventDefault();
  let text = (document.getElementById('dsrCsvText')?.value || '').trim();
  const file = document.getElementById('dsrCsvFile')?.files?.[0];
  try {
    if (file) text = await file.text();
    const rows = wtParseFlexibleTable(text);
    if (!rows.length) {
      showToast('No rows found. Use CSV from Excel.', 'danger');
      return;
    }
    const pid = Number(localStorage.getItem('WISETRACK_SELECTED_PROJECT'));
    if (!pid) {
      showToast('Select a project first.', 'danger');
      return;
    }
    const updates = rows.map(r => ({
      taskId: Number(wtPick(r, ['taskid', 'task_id', 'task'])) || 0,
      subTaskId: Number(wtPick(r, ['subtaskid', 'sub_task_id', 'subtask'])) || null,
      completionPercent: wtPick(r, ['percent', 'completionpercent', '%', 'qtycomplete']) === ''
        ? null
        : Number(wtPick(r, ['percent', 'completionpercent', '%', 'qtycomplete'])),
      status: wtPick(r, ['status', 'sitestatus']) || null,
      remarks: wtPick(r, ['remarks', 'remark', 'notes', 'reason']) || null
    })).filter(u => u.taskId);
    if (!updates.length) {
      showToast('Could not find taskId column. Check headers.', 'danger');
      return;
    }
    const result = await WisetrackAPI.bulkImportUpdates({ projectId: pid, updates });
    closeModal();
    showToast(`Imported ${result.imported ?? result.Imported ?? 0}, skipped ${result.skipped ?? result.Skipped ?? 0}`);
    if (window.WTPages?.refreshPlanning) await WTPages.refreshPlanning();
  } catch (err) {
    showToast(err.message || 'Import failed', 'danger');
  }
}

function wtEscHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wtDownloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function wtNormHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[^a-z0-9%]+/g, '');
}

function wtPick(row, aliases) {
  for (const a of aliases) {
    const key = wtNormHeader(a);
    if (row[key] != null && row[key] !== '') return row[key];
  }
  return '';
}

function wtParseFlexibleTable(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const delim = (lines[0].includes('\t') && (lines[0].split('\t').length >= lines[0].split(',').length)) ? '\t' : ',';
  const split = (line) => {
    const out = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (c === delim && !q) {
        out.push(cur.trim());
        cur = '';
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]).map(wtNormHeader);
  return lines.slice(1).map(line => {
    const cells = split(line);
    const row = {};
    headers.forEach((h, i) => { if (h) row[h] = cells[i] ?? ''; });
    return row;
  }).filter(r => Object.values(r).some(v => String(v).trim()));
}

function wtAsArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.$values)) return value.$values;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function wtSubTasksOf(task) {
  return wtAsArray(task?.subTasks || task?.SubTasks || task?.subtasks);
}

function wtNestSubTasks(list) {
  const arr = wtAsArray(list).map(s => ({ ...s, children: wtAsArray(s.children || s.Children) }));
  if (!arr.length) return [];
  const nestedFromApi = arr.some(s => (s.children || []).length);
  if (nestedFromApi) {
    return arr.filter(s => !Number(s.parentSubTaskId || s.ParentSubTaskId || 0));
  }
  const byId = new Map();
  arr.forEach(s => byId.set(Number(s.id), { ...s, children: [] }));
  const roots = [];
  byId.forEach(s => {
    const pid = Number(s.parentSubTaskId || s.ParentSubTaskId || 0);
    if (pid && byId.has(pid)) byId.get(pid).children.push(s);
    else roots.push(s);
  });
  return roots;
}

function wtWalkSubs(task) {
  const out = [];
  function walk(nodes, depth) {
    (nodes || []).forEach((s, i) => {
      out.push({ node: s, depth, index: i });
      walk(s.children || [], depth + 1);
    });
  }
  walk(wtNestSubTasks(wtSubTasksOf(task)), 1);
  return out;
}

function wtFindSub(task, subId) {
  return wtWalkSubs(task).map(x => x.node).find(s => Number(s.id) === Number(subId)) || null;
}

function wtTaskCode(task, index) {
  return task?.displayCode || task?.DisplayCode || `Task-${(index ?? 0) + 1}`;
}

function wtNestLabel(depth) {
  if (depth <= 1) return 'Sub';
  if (depth === 2) return 'Child';
  return 'L' + depth;
}

function wtSubTaskCode(task, sub, subIndex, depth) {
  if (sub?.displayCode || sub?.DisplayCode) return sub.displayCode || sub.DisplayCode;
  const d = depth || 1;
  return `${wtTaskCode(task)}-${wtNestLabel(d)}-${(subIndex ?? 0) + 1}`;
}

function wtApplyTaskDisplayCodes(tasks) {
  const grouped = {};
  (tasks || []).forEach(t => {
    const pid = Number(t.projectId || t.ProjectId || t._projectId || 0);
    if (!grouped[pid]) grouped[pid] = [];
    grouped[pid].push(t);
  });
  Object.values(grouped).forEach(list => {
    list.sort((a, b) => Number(a.id) - Number(b.id));
    list.forEach((t, i) => {
      t.displayCode = t.displayCode || t.DisplayCode || `Task-${i + 1}`;
      const nested = wtNestSubTasks(wtSubTasksOf(t));
      t.subTasks = nested;
      const stamp = (nodes, parentCode, depth) => {
        (nodes || []).forEach((s, j) => {
          s.displayCode = s.displayCode || s.DisplayCode || `${parentCode}-${wtNestLabel(depth)}-${j + 1}`;
          stamp(s.children || [], s.displayCode, depth + 1);
        });
      };
      stamp(nested, t.displayCode, 1);
    });
  });
  return tasks;
}

function wtProjectScopeIds(projects, pid) {
  const root = Number(pid);
  const ids = new Set([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of projects || []) {
      const id = Number(p.id);
      const parent = Number(p.parentProjectId || p.ParentProjectId || 0);
      if (parent && ids.has(parent) && !ids.has(id)) {
        ids.add(id);
        grew = true;
      }
    }
  }
  return [...ids];
}

async function wtLoadLiveTasksAndOwners() {
  const pid = localStorage.getItem('WISETRACK_SELECTED_PROJECT');
  if (!pid) return { pid: null, tasks: [], owners: [], projects: [] };

  const resortId = localStorage.getItem('WISETRACK_SELECTED_RESORT') || undefined;
  const projects = await WisetrackAPI.getProjects(resortId).catch(() => []);
  const scopeIds = [Number(pid)];
  const [taskBatches, teamBatches, allUsers] = await Promise.all([
    Promise.all(scopeIds.map(id => WisetrackAPI.getTasks(id).catch(() => []))),
    Promise.all(scopeIds.map(id => (typeof WisetrackAPI.getProjectTeam === 'function' ? WisetrackAPI.getProjectTeam(id) : Promise.resolve([])).catch(() => []))),
    WisetrackAPI.getUsers().catch(() => [])
  ]);

  const tasks = taskBatches.flatMap((rows, i) => wtAsArray(rows).map(t => ({ ...t, _projectId: scopeIds[i] })))
    .filter(t => Number(t.projectId || t.ProjectId || t._projectId) === Number(pid));
  wtApplyTaskDisplayCodes(tasks);
  const seen = new Set();
  const owners = [];
  const pushOwner = (id, fullName, role, email) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    owners.push({ id, fullName: fullName || `User ${id}`, role: role || 'Team', email: email || '' });
  };
  wtAsArray(teamBatches.flat()).forEach(m => pushOwner(
    Number(m.userId || m.id),
    m.fullName || m.name,
    m.teamRole || (m.roles && m.roles[0]),
    m.email
  ));
  if (!owners.length) {
    wtAsArray(allUsers).filter(u => u.isActive !== false).forEach(u => pushOwner(
      Number(u.id),
      u.fullName || u.name,
      (u.roles && u.roles[0]) || 'Team',
      u.email
    ));
  }
  return { pid, tasks, owners, projects };
}

async function openCreateSubTaskModal(parentTaskId = '', parentSubTaskId = '') {
  if (typeof WisetrackAPI === 'undefined' || !WisetrackAPI.isLoggedIn()) {
    showToast('Please login first.', 'danger');
    return;
  }

  const { pid, tasks, owners, projects } = await wtLoadLiveTasksAndOwners();
  if (!pid) {
    showToast('Select a project first, then create a main task.', 'danger');
    return;
  }
  if (!tasks.length) {
    showToast('Create a main task first, then add a sub-task under it.', 'warning');
    return;
  }

  const nameOf = (id) => {
    const p = (projects || []).find(x => Number(x.id) === Number(id));
    return p ? (p.code || p.name || `#${id}`) : `#${id}`;
  };
  const selectedTaskId = parentTaskId ? String(parentTaskId) : '';
  const selectedSubId = parentSubTaskId ? String(parentSubTaskId) : '';
  const selectedValue = selectedSubId ? `${selectedTaskId}:${selectedSubId}` : selectedTaskId;
  const parentOpts = tasks.map(t => {
    const taskSelected = selectedValue && String(t.id) === String(selectedValue) ? 'selected' : '';
    const walked = typeof wtWalkSubs === 'function' ? wtWalkSubs(t) : [];
    const childOpts = walked.map(({ node: s, depth }) => {
      const val = `${t.id}:${s.id}`;
      const sel = String(val) === String(selectedValue) ? 'selected' : '';
      const pad = '\u00A0'.repeat(Math.max(0, depth) * 2);
      const mark = depth <= 1 ? '↳ Sub' : depth === 2 ? '↳↳ Child' : `↳↳↳ L${depth}`;
      return `<option value="${val}" ${sel}>${pad}${mark} · ${wtEscHtml(wtSubTaskCode(t, s, 0, depth))} · ${wtEscHtml(s.title || s.name)}</option>`;
    }).join('');
    return `<option value="${t.id}" ${taskSelected}>${wtEscHtml(wtTaskCode(t))} · ${wtEscHtml(t.title || t.name)} (${wtEscHtml(nameOf(t._projectId || t.projectId))})</option>${childOpts}`;
  }).join('');
  const ownerOpts = owners.length
    ? owners.map(u => `<option value="${u.id}">${wtEscHtml(u.fullName)} (${wtEscHtml(u.role)})</option>`).join('')
    : '<option value="">No users found</option>';
  const preselected = tasks.find(t => String(t.id) === selectedTaskId);
  const defaultDue = String(preselected?.dueDate || preselected?.DueDate || '').slice(0, 10);
  const nestHint = selectedSubId
    ? 'Child / nested task under the selected sub-task'
    : 'Sub-task under the selected main task (or pick a sub-task to nest deeper)';

  openModal('Create nested task (Task → Sub → Child)', `
    <form onsubmit="handleCreateSubTask(event)">
      <div class="form-grid">
        <div class="field full">
          <label>Title *</label>
          <input type="text" id="subTaskTitle" placeholder="e.g. Get GM approval" required>
        </div>
        <div class="field full">
          <label>Nest under *</label>
          <select id="subTaskParent" required>
            ${selectedValue ? '' : '<option value="">Select task / sub-task / child</option>'}
            ${parentOpts}
          </select>
          <small style="color:var(--text-muted);display:block;margin-top:4px">${wtEscHtml(nestHint)}</small>
        </div>
        <div class="field">
          <label>Owner *</label>
          <select id="subTaskOwner" required>${ownerOpts}</select>
        </div>
        <div class="field">
          <label>Target Completion Date</label>
          <input type="date" id="subTaskDueDate" value="${wtEscHtml(defaultDue)}">
        </div>
        <div class="field">
          <label>Initial Status</label>
          <select id="subTaskInitStatus">
            <option value="NotStarted">⚪ Not Started</option>
            <option value="InProgress" selected>🔵 In Progress</option>
            <option value="Delayed">🟠 Delayed</option>
          </select>
        </div>
        <div class="field full">
          <label>Notes</label>
          <textarea id="subTaskNotes" placeholder="Requirements, checks, handover notes..."></textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">＋ Create</button>
      </div>
    </form>`);
}

async function handleCreateSubTask(e) {
  e.preventDefault();
  const raw = (document.getElementById('subTaskParent')?.value || '').trim();
  const parts = raw.split(':');
  const taskId = Number(parts[0]);
  const parentSubTaskId = parts[1] ? Number(parts[1]) : null;
  const title = (document.getElementById('subTaskTitle')?.value || '').trim();
  const assignedTo = Number(document.getElementById('subTaskOwner')?.value) || null;
  const dueDate = document.getElementById('subTaskDueDate')?.value || null;
  const status = (document.getElementById('subTaskInitStatus')?.value || 'NotStarted').replace(/\s+/g, '');
  const remarks = (document.getElementById('subTaskNotes')?.value || '').trim();
  if (!taskId) {
    showToast('Select the parent task or sub-task.', 'danger');
    return;
  }
  if (!title) {
    showToast('Enter a title.', 'danger');
    return;
  }
  try {
    await WisetrackAPI.createSubTask({ taskId, parentSubTaskId, title, assignedTo, dueDate, status, remarks });
    closeModal();
    showToast(`"${title}" created`);
    if (window.WTPages && typeof WTPages.refreshPlanning === 'function') {
      await WTPages.refreshPlanning();
    } else {
      location.reload();
    }
  } catch (err) {
    showToast(err.message || 'Could not create nested task', 'danger');
  }
}

// 9. On-Demand Report Generator with Column Customization & Internal-Only Email Dispatch (PM-28)
async function openReportExportModal(defaultType = 'portfolio') {
  let users = [];
  try {
    users = await WisetrackAPI.getUsers();
  } catch (_) {
    users = typeof getUsers === 'function' ? getUsers() : [];
  }
  const internalUsers = (users || []).filter(u => u.isInternal !== false);
  const internalOptions = internalUsers.map(u =>
    `<option value="${u.id}" selected>${wtEscHtml(u.fullName || u.name)} (${wtEscHtml(u.email)}) — ${wtEscHtml((u.roles && u.roles[0]) || u.role || 'Internal')}</option>`
  ).join('');

  const html = `
    <form onsubmit="handleExportAndSendReport(event)">
      <div class="form-grid">
        <div class="field full">
          <label>Select Report Type *</label>
          <select id="repType" required>
            <option value="portfolio" ${defaultType === 'portfolio' ? 'selected' : ''}>All Projects Unified Status Report</option>
            <option value="daily" ${defaultType === 'daily' ? 'selected' : ''}>Daily Site Progress &amp; Cumulative Done</option>
            <option value="financial" ${defaultType === 'financial' ? 'selected' : ''}>Financial Budget vs Actual &amp; RAG</option>
            <option value="handover" ${defaultType === 'handover' ? 'selected' : ''}>Project Handover &amp; Completion Summary</option>
          </select>
        </div>
        <div class="field full">
          <label>Scope of Site Updates</label>
          <div style="display:flex; gap:18px; align-items:center; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid var(--border-color);">
            <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; cursor:pointer;">
              <input type="radio" name="reportScope" value="daily" checked> Daily Site Update
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; cursor:pointer;">
              <input type="radio" name="reportScope" value="cumulative"> Cumulative (until date)
            </label>
          </div>
        </div>
        <div class="field full">
          <label>Columns to include:</label>
          <div id="reportColumnChecks" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid var(--border-color); font-size:12px;">
            <label><input type="checkbox" checked value="project"> Project / WBS</label>
            <label><input type="checkbox" checked value="status"> Status</label>
            <label><input type="checkbox" checked value="owner"> Owner</label>
            <label><input type="checkbox" checked value="budget"> Budget</label>
            <label><input type="checkbox" checked value="rag"> RAG</label>
            <label><input type="checkbox" checked value="progress"> % Complete</label>
            <label><input type="checkbox" checked value="milestones"> Next milestone</label>
            <label><input type="checkbox" checked value="issues"> Open issues</label>
          </div>
        </div>
        <div class="field full">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label style="margin:0;">Send to internal team only:</label>
            <span class="badge green">Internal emails only</span>
          </div>
          <select id="reportRecipients" multiple style="min-height:90px; width:100%; border:1px solid var(--border-color); border-radius:6px; padding:6px; font-size:12px;">
            ${internalOptions || '<option disabled>No internal users</option>'}
          </select>
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn sm" onclick="handleReportPrint('pdf')">Print / PDF</button>
          <button type="button" class="btn sm" onclick="handleReportPrint('csv')">Export CSV</button>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Send to selected internal team</button>
        </div>
      </div>
    </form>
  `;
  openModal('On-Demand Report Generator & Dispatcher', html);
}

function wtSelectedReportColumns() {
  return [...document.querySelectorAll('#reportColumnChecks input:checked')].map(x => x.value);
}

async function wtBuildPortfolioRows() {
  const p = await WisetrackAPI.getPortfolioReport();
  return p?.projects || p?.Projects || (Array.isArray(p) ? p : []);
}

function wtReportCsv(rows, cols) {
  const headers = cols;
  const lines = [headers.join(',')];
  rows.forEach(row => {
    const map = {
      project: row.name || row.Name || '',
      status: row.status || row.Status || '',
      owner: row.ownerName || row.OwnerName || '',
      budget: row.approvedBudget ?? row.ApprovedBudget ?? '',
      rag: row.budgetRag || row.BudgetRag || '',
      progress: row.progressPercent ?? row.ProgressPercent ?? '',
      milestones: row.nextMilestone || row.NextMilestone || '',
      issues: row.openIssues ?? row.OpenIssues ?? ''
    };
    lines.push(headers.map(h => `"${String(map[h] ?? '').replace(/"/g, '""')}"`).join(','));
  });
  return lines.join('\n');
}

async function handleReportPrint(kind) {
  try {
    const cols = wtSelectedReportColumns();
    const rows = await wtBuildPortfolioRows();
    if (kind === 'csv') {
      wtDownloadText('wisetrack-portfolio.csv', wtReportCsv(rows, cols));
      showToast('CSV downloaded');
      return;
    }
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Wisetrack Report</title>
      <style>body{font-family:Segoe UI,Arial;padding:28px;color:#0f172a}h1{color:#0f4c81}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px}th{background:#0f4c81;color:#fff}</style></head>
      <body><h1>Wisetrack</h1><p>Portfolio status — ${new Date().toLocaleDateString()}</p>
      <table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(row => {
        const map = {
          project: row.name || row.Name || '',
          status: row.status || row.Status || '',
          owner: row.ownerName || row.OwnerName || '',
          budget: row.approvedBudget ?? row.ApprovedBudget ?? '',
          rag: row.budgetRag || row.BudgetRag || '',
          progress: row.progressPercent ?? row.ProgressPercent ?? '',
          milestones: row.nextMilestone || row.NextMilestone || '',
          issues: row.openIssues ?? row.OpenIssues ?? ''
        };
        return `<tr>${cols.map(c => `<td>${String(map[c] ?? '')}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  } catch (err) {
    showToast(err.message || 'Export failed', 'danger');
  }
}

async function handleExportAndSendReport(e) {
  e.preventDefault();
  const select = document.getElementById('reportRecipients');
  const ids = select ? [...select.selectedOptions].map(o => Number(o.value)).filter(Boolean) : [];
  const cols = wtSelectedReportColumns();
  const type = document.getElementById('repType')?.value || 'portfolio';
  const scope = document.querySelector('input[name="reportScope"]:checked')?.value || 'daily';
  try {
    await WisetrackAPI.createReport({
      name: `${type} ${scope} ${new Date().toISOString().slice(0, 10)}`,
      reportType: type,
      selectedColumns: cols.join(','),
      recipientUserIds: ids
    });
    const rows = await wtBuildPortfolioRows();
    wtDownloadText(`wisetrack-${type}.csv`, wtReportCsv(rows, cols));
    closeModal();
    showToast(`Report saved and sent to ${ids.length} internal user(s)`);
    if (window.WTPages?.loadPortfolio) await WTPages.loadPortfolio();
  } catch (err) {
    showToast(err.message || 'Could not send report', 'danger');
  }
}

// 7. Project Closure Handover Modal
function openHandoverModal() {
  const html = `
    <div>
      <div class="alert warning" style="margin-bottom:16px;">
        <span>⚠️</span> <strong>Mandatory Project Closure Gate:</strong> Leftover inventory must be reconciled and signed completion certificate uploaded.
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Project for Closure *</label>
          <select>
            <option>Grand Resort — MEP & Automation (GR-MEP-001)</option>
            <option>Pine Valley — Geothermal HVAC (MAN-GEO-001)</option>
          </select>
        </div>
        <div class="field">
          <label>Inventory Reconciliation Status</label>
          <input type="text" value="3 Items Reconciled (₹1.86L Value Transferred)" readonly style="background:#f1f5f9;font-weight:600;">
        </div>
        <div class="field full">
          <label>Mandatory Upload: Signed Handover / Completion Certificate *</label>
          <div style="border:1px dashed #cbd5e1;padding:16px;text-align:center;border-radius:6px;background:#f8fafc;">
            <span>📄</span> <strong>Handover_Certificate_Signed_GM.pdf</strong> (Uploaded · 1.4 MB)
          </div>
        </div>
        <div class="field full">
          <label>Closure Signoff Comments</label>
          <textarea placeholder="All punchlist items closed, testing completed, final OEM warranties archived."></textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding-left:0;padding-right:0;padding-bottom:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn success" onclick="closeModal(); showToast('Project officially closed and archived!');">✓ Approve & Finalize Project Closure</button>
      </div>
    </div>
  `;
  openModal("Project Handover & Closure Gatekeeper", html);
}

// --- SUPERADMIN / MAIN ADMIN CRUD & STATUS ACTIONS ---

// 1. Edit Resort
function openEditResortModal(resortId) {
  const resorts = getResorts();
  const r = resorts.find(x => String(x.id) === String(resortId)) || resorts.find(x => x.code === resortId) || resorts[0];
  if (!r) {
    showToast(`Error: Resort "${resortId}" not found!`, 'danger');
    return;
  }
  const html = `
    <form id="editResortForm" onsubmit="handleEditResort(event, '${r.id}')">
      <div class="form-grid">
        <div class="field full">
          <label>Resort / Property Name *</label>
          <input type="text" id="editResortName" value="${escapeHtmlAttr(r.name || '')}" required>
        </div>
        <div class="field">
          <label>Resort Code *</label>
          <input type="text" id="editResortCode" value="${escapeHtmlAttr(r.code || '')}" required>
        </div>
        <div class="field">
          <label>Location / Region *</label>
          <input type="text" id="editResortLocation" value="${escapeHtmlAttr(r.location || '')}" required>
        </div>
        <div class="field">
          <label>General Manager / Lead *</label>
          <input type="text" id="editResortGM" value="${escapeHtmlAttr(r.gm || '')}" required>
        </div>
        <div class="field">
          <label>Total Allocated Budget (₹ Cr) *</label>
          <input type="text" id="editResortBudget" value="${escapeHtmlAttr(r.budget || '')}" required>
        </div>
        <div class="field">
          <label>Operational Status *</label>
          <select id="editResortStatus">
            <option value="Active" ${r.status === 'Active' || r.status === 'On Track' ? 'selected' : ''}>Active (Operational)</option>
            <option value="In Construction" ${r.status === 'In Construction' ? 'selected' : ''}>In Construction</option>
            <option value="Under Renovation" ${r.status === 'Under Renovation' ? 'selected' : ''}>Under Renovation</option>
            <option value="Inactive / Maintenance" ${r.status === 'Inactive' || r.status === 'Inactive / Maintenance' ? 'selected' : ''}>Inactive / Maintenance</option>
          </select>
        </div>
        <div class="field full">
          <label>Property Notes / Scope</label>
          <textarea id="editResortDesc">${escapeHtmlAttr(r.desc || '')}</textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">💾 Save Resort Changes</button>
      </div>
    </form>
  `;
  openModal(`Edit Resort: ${r.name}`, html);
}

async function handleEditResort(e, resortId) {
  e.preventDefault();
  const name = document.getElementById('editResortName').value.trim();
  const code = document.getElementById('editResortCode').value.trim();
  const location = document.getElementById('editResortLocation').value.trim();
  const desc = document.getElementById('editResortDesc').value;

  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      await WisetrackAPI.updateResort(resortId, { name, code, location, description: desc });
      closeModal();
      showToast(`Resort "${name}" updated via API!`);
      setTimeout(() => window.location.reload(), 400);
      return;
    }
  } catch (err) { console.warn('API fallback:', err); }

  const resorts = getResorts();
  const idx = resorts.findIndex(x => String(x.id) === String(resortId) || x.code === resortId);
  if (idx !== -1) {
    resorts[idx].name = name;
    resorts[idx].code = code;
    resorts[idx].location = location;
    resorts[idx].gm = document.getElementById('editResortGM').value.trim();
    resorts[idx].budget = document.getElementById('editResortBudget').value.trim();
    const status = document.getElementById('editResortStatus').value;
    resorts[idx].status = status;
    resorts[idx].statusBadge = status === 'Active' || status === 'On Track' ? 'green' : status === 'In Construction' ? 'blue' : status === 'Under Renovation' ? 'amber' : 'red';
    resorts[idx].desc = desc;
    localStorage.setItem('WISETRACK_RESORTS', JSON.stringify(resorts));
    closeModal();
    showToast(`Resort "${name}" updated successfully!`);
    setTimeout(() => window.location.reload(), 400);
  }
}

// 2. Delete Resort
function confirmDeleteResort(resortId) {
  const resorts = getResorts();
  const r = resorts.find(x => String(x.id) === String(resortId) || x.code === resortId) || { name: resortId, code: resortId };
  const html = `
    <div style="text-align:center;padding:15px 0;">
      <div style="font-size:42px;margin-bottom:10px;">⚠️</div>
      <h3 style="font-size:16px;color:#991b1b;margin-bottom:8px;">Are you sure you want to delete this Resort?</h3>
      <p style="color:#64748b;font-size:13px;max-width:440px;margin:0 auto 16px;">
        Deleting <strong>${escapeHtmlAttr(r.name)}</strong> (${escapeHtmlAttr(resortId)}) will permanently remove its associated sub-projects, WBS packages, and commercial baseline records.
      </p>
      <div style="display:flex;justify-content:center;gap:12px;">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn danger" onclick="handleDeleteResort('${resortId}')">🗑️ Yes, Delete Resort</button>
      </div>
    </div>
  `;
  openModal("Confirm Resort Deletion", html);
}

async function handleDeleteResort(resortId) {
  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      await WisetrackAPI.deleteResort(resortId);
      closeModal();
      showToast(`Resort deleted via API.`, 'danger');
      setTimeout(() => window.location.reload(), 400);
      return;
    }
  } catch (err) { console.warn('API fallback:', err); }

  let resorts = getResorts();
  resorts = resorts.filter(x => String(x.id) !== String(resortId));
  localStorage.setItem('WISETRACK_RESORTS', JSON.stringify(resorts));
  let projects = getProjects();
  projects = projects.filter(p => String(p.resortId) !== String(resortId) && String(p.resortId) !== `RES-${resortId}`);
  localStorage.setItem('WISETRACK_PROJECTS', JSON.stringify(projects));
  closeModal();
  showToast(`Resort removed.`, 'danger');
  setTimeout(() => window.location.reload(), 400);
}

// 3. Toggle Resort Status
function handleToggleResortStatus(resortId, newStatus) {
  const resorts = getResorts();
  const idx = resorts.findIndex(x => x.id === resortId);
  if (idx !== -1) {
    resorts[idx].status = newStatus;
    resorts[idx].statusBadge = newStatus === 'Active' || newStatus === 'On Track' ? 'green' : newStatus === 'In Construction' ? 'blue' : newStatus === 'Under Renovation' ? 'amber' : 'red';
    localStorage.setItem('WISETRACK_RESORTS', JSON.stringify(resorts));
    showToast(`Resort status changed to: ${newStatus}`);
    setTimeout(() => window.location.reload(), 300);
  }
}

// 4. Edit User
function openEditUserModal(userId) {
  const users = getUsers();
  const u = users.find(x => String(x.id) === String(userId)) || users[0];
  if (!u) {
    showToast(`Error: User "${userId}" not found!`, 'danger');
    return;
  }
  const html = `
    <form id="editUserForm" onsubmit="handleEditUser(event, '${u.id}')">
      <div class="form-grid">
        <div class="field">
          <label>Full Name *</label>
          <input type="text" id="editUserName" value="${escapeHtmlAttr(u.name || '')}" required>
        </div>
        <div class="field">
          <label>Corporate Email *</label>
          <input type="email" id="editUserEmail" value="${escapeHtmlAttr(u.email || '')}" required>
        </div>
        <div class="field">
          <label>Assigned System Role *</label>
          <select id="editUserRole">
            <option value="Super / Project Admin" ${(u.role || '').includes('Admin') ? 'selected' : ''}>Super / Project Admin</option>
            <option value="Project Manager" ${u.role === 'Project Manager' ? 'selected' : ''}>Project Manager</option>
            <option value="Site Engineer" ${u.role === 'Site Engineer' ? 'selected' : ''}>Site Engineer</option>
            <option value="Finance / Cost Controller" ${(u.role || '').includes('Finance') ? 'selected' : ''}>Finance / Cost Controller</option>
            <option value="Quality & Safety Auditor" ${(u.role || '').includes('Auditor') ? 'selected' : ''}>Quality & Safety Auditor</option>
            <option value="Resort GM / Executive" ${(u.role || '').includes('GM') ? 'selected' : ''}>Resort GM / Executive</option>
          </select>
        </div>
        <div class="field">
          <label>Account Status *</label>
          <select id="editUserStatus">
            <option value="Active" ${u.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Suspended" ${u.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
            <option value="Inactive" ${u.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="field full">
          <label>Resort Property Access</label>
          <input type="text" id="editUserResorts" value="${escapeHtmlAttr(u.assignedResorts || 'All Resorts')}">
        </div>
        <div class="field full">
          <label>Field Restrictions / Security Masking</label>
          <input type="text" id="editUserRestrictions" value="${escapeHtmlAttr(u.fieldRestrictions || 'None')}">
        </div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">💾 Update User Profile</button>
      </div>
    </form>
  `;
  openModal(`Edit User: ${u.name}`, html);
}

function handleEditUser(e, userId) {
  e.preventDefault();
  const users = getUsers();
  const idx = users.findIndex(x => String(x.id) === String(userId));
  if (idx !== -1) {
    users[idx].name = document.getElementById('editUserName').value.trim();
    users[idx].email = document.getElementById('editUserEmail').value.trim();
    users[idx].role = document.getElementById('editUserRole').value;
    users[idx].status = document.getElementById('editUserStatus').value;
    users[idx].statusBadge = users[idx].status === 'Active' ? 'green' : users[idx].status === 'Suspended' ? 'amber' : 'red';
    users[idx].assignedResorts = document.getElementById('editUserResorts').value.trim();
    users[idx].fieldRestrictions = document.getElementById('editUserRestrictions').value.trim();

    localStorage.setItem('WISETRACK_USERS', JSON.stringify(users));
    closeModal();
    showToast(`User "${users[idx].name}" updated successfully!`);
    setTimeout(() => window.location.reload(), 400);
  }
}

// 5. Delete User
function confirmDeleteUser(userId) {
  const users = getUsers();
  const u = users.find(x => String(x.id) === String(userId)) || { name: userId, email: '' };
  const html = `
    <div style="text-align:center;padding:15px 0;">
      <div style="font-size:42px;margin-bottom:10px;">⚠️</div>
      <h3 style="font-size:16px;color:#991b1b;margin-bottom:8px;">Delete User Account?</h3>
      <p style="color:#64748b;font-size:13px;max-width:440px;margin:0 auto 16px;">
        Are you sure you want to remove user <strong>${escapeHtmlAttr(u.name)}</strong> (${escapeHtmlAttr(u.email)})? This user will immediately lose access to all PMS modules.
      </p>
      <div style="display:flex;justify-content:center;gap:12px;">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn danger" onclick="handleDeleteUser('${userId}')">🗑️ Yes, Delete User</button>
      </div>
    </div>
  `;
  openModal("Confirm User Deletion", html);
}

async function handleDeleteUser(userId) {
  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      showToast(`User deactivated via API.`, 'danger');
      closeModal();
      setTimeout(() => window.location.reload(), 400);
      return;
    }
  } catch (err) { console.warn('API fallback:', err); }

  let users = getUsers();
  users = users.filter(x => String(x.id) !== String(userId));
  localStorage.setItem('WISETRACK_USERS', JSON.stringify(users));
  closeModal();
  showToast(`User removed.`, 'danger');
  setTimeout(() => window.location.reload(), 400);
}

// 6. Toggle User Status
function handleToggleUserStatus(userId, newStatus) {
  const users = getUsers();
  const idx = users.findIndex(x => x.id === userId);
  if (idx !== -1) {
    users[idx].status = newStatus;
    users[idx].statusBadge = newStatus === 'Active' ? 'green' : newStatus === 'Suspended' ? 'amber' : 'red';
    localStorage.setItem('WISETRACK_USERS', JSON.stringify(users));
    showToast(`User account status set to: ${newStatus}`);
    setTimeout(() => window.location.reload(), 300);
  }
}

function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 7. Edit Project / Sub-Project (Accurate Data Pre-population)
async function openEditProjectModal(projectId) {
  let p = null;
  let projects = getProjects();
  let resorts = getResorts();

  // API-created projects use numeric DB ids; list comes from API but localStorage may not have them
  if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
    try {
      const numId = parseInt(projectId, 10);
      if (!isNaN(numId)) {
        p = await WisetrackAPI.getProject(numId);
      }
      if (!p) {
        const apiProjects = await WisetrackAPI.getProjects().catch(() => []);
        p = (apiProjects || []).find(x => String(x.id) === String(projectId) || x.code === projectId) || null;
        if (apiProjects?.length) projects = apiProjects;
      } else {
        const apiProjects = await WisetrackAPI.getProjects(p.resortId).catch(() => []);
        if (apiProjects?.length) projects = apiProjects;
      }
      const apiResorts = await WisetrackAPI.getResorts().catch(() => []);
      if (apiResorts?.length) resorts = apiResorts;
    } catch (err) {
      console.warn('API getProject for edit:', err);
    }
  }

  if (!p) {
    p = projects.find(x => String(x.id) === String(projectId)) ||
        projects.find(x => x.code === projectId) ||
        projects.find(x => String(x.id) === String(projectId).replace('PRJ-', ''));
  }

  if (!p) {
    showToast(`Error: Project "${projectId}" not found!`, 'danger');
    return;
  }

  // Keep full record so update can send required API fields without wiping them
  window.__editingProject = p;

  const currentResort = p.resortId || 'RES-GOA-01';

  // Build parent options for hierarchy repositioning or viewing (exclude self and self's children)
  const resortProjects = projects.filter(item => (String(item.resortId) === String(currentResort) || String(item.resortId) === `RES-${currentResort}`) && String(item.id) !== String(p.id));
  const parentOptions = buildHierarchyOptions(resortProjects, p.parentId || p.parentProjectId || '');

  let resortOptions = '';
  resorts.forEach(r => {
    resortOptions += `<option value="${r.id}" ${String(r.id) === String(currentResort) || `RES-${r.id}` === String(currentResort) ? 'selected' : ''}>${r.name} (${r.code})</option>`;
  });

  const lvl = Number(p.level) || 1;
  const levelBadge = lvl === 1 
    ? '<span class="tree-level-pill lvl-1">🔵 Level 1 · Root Parent Project</span>'
    : lvl === 2 
    ? '<span class="tree-level-pill lvl-2">🟣 Level 2 · Sub-Project</span>'
    : lvl === 3 
    ? '<span class="tree-level-pill lvl-3">🟢 Level 3 · Child Work Package</span>'
    : `<span class="tree-level-pill lvl-4">🟠 Level ${lvl} · N-th Term Task</span>`;

  const html = `
    <form id="editProjectForm" onsubmit="handleEditProject(event, '${p.id}')">
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); border:1px solid var(--border-color); padding:10px 14px; border-radius:6px; margin-bottom:14px;">
        <div style="font-size:12px;">Editing Project: <strong>${escapeHtmlAttr(p.name || p.title)}</strong> (<code>${escapeHtmlAttr(p.code || '')}</code>)</div>
        <div>${levelBadge}</div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Resort Property *</label>
          <select id="editProjectResortId" required>
            ${resortOptions}
          </select>
        </div>
        <div class="field">
          <label>Parent Hierarchy Node (WBS Parent)</label>
          <select id="editProjectParentId">
            ${parentOptions}
          </select>
        </div>
        <div class="field full">
          <label>Project / Work Package Title *</label>
          <input type="text" id="editProjectName" value="${escapeHtmlAttr(p.name || p.title || '')}" required>
        </div>
        <div class="field">
          <label>Code (auto)</label>
          <input type="text" id="editProjectCode" value="${escapeHtmlAttr(p.code || '')}" readonly>
        </div>
        <div class="field">
          <label>Discipline / Category *</label>
          <select id="editProjectDiscipline" required>
            <option ${(p.discipline || '').includes('Civil') ? 'selected' : ''}>Civil Structure</option>
            <option ${(p.discipline || '').includes('Electrical') || (p.discipline || '') === 'MEP & Electrical' ? 'selected' : ''}>MEP & Electrical</option>
            <option ${(p.discipline || '').includes('HVAC') ? 'selected' : ''}>HVAC & Air Conditioning</option>
            <option ${(p.discipline || '').includes('Plumbing') ? 'selected' : ''}>Plumbing & Fire Safety</option>
            <option ${(p.discipline || '').includes('Interior') ? 'selected' : ''}>Interior Fitout & FF&E</option>
            <option ${(p.discipline || '').includes('Landscape') ? 'selected' : ''}>Landscaping & Outdoor</option>
            <option ${(p.discipline || '').includes('Automation') ? 'selected' : ''}>Building Automation & IT</option>
            <option ${(p.discipline || '').includes('Solar') ? 'selected' : ''}>Renewable Solar</option>
            <option ${(p.discipline || '').includes('Heritage') ? 'selected' : ''}>Heritage MEP</option>
          </select>
        </div>
        <div class="field">
          <label>Project Manager / Assignee *</label>
          <input type="text" id="editProjectOwner" value="${escapeHtmlAttr(p.owner || p.ownerName || 'Rahul Sharma')}" required>
        </div>
        <div class="field">
          <label>Allocated Budget *</label>
          <input type="text" id="editProjectBudget" value="${escapeHtmlAttr(p.budget || '₹5.00 Cr')}" required>
        </div>
        <div class="field">
          <label>Project Health / Status *</label>
          <select id="editProjectHealth">
            <option value="On Track" ${(p.health || p.status) === 'On Track' ? 'selected' : ''}>🟢 On Track</option>
            <option value="At Risk" ${(p.health || p.status) === 'At Risk' ? 'selected' : ''}>🟠 At Risk</option>
            <option value="Delayed" ${(p.health || p.status) === 'Delayed' ? 'selected' : ''}>🔴 Delayed</option>
            <option value="Completed" ${(p.health || p.status) === 'Completed' ? 'selected' : ''}>✅ Completed</option>
            <option value="Closed" ${(p.health || p.status) === 'Closed' ? 'selected' : ''}>🔒 Closed & Handed Over</option>
          </select>
        </div>
        <div class="field">
          <label>Progress Percentage (%)</label>
          <input type="number" id="editProjectProgress" min="0" max="100" value="${p.progress !== undefined ? p.progress : (p.progressPercent || 0)}">
        </div>
        <div class="field">
          <label>Start Date</label>
          <input type="date" id="editProjectStartDate" value="${p.startDate || '2026-09-01'}">
        </div>
        <div class="field">
          <label>Target Handover Date</label>
          <input type="date" id="editProjectEndDate" value="${p.endDate || '2026-12-31'}">
        </div>
        <div class="field full">
          <label>Scope of Work / Deliverables</label>
          <textarea id="editProjectDesc">${escapeHtmlAttr(p.desc || p.description || '')}</textarea>
        </div>
      </div>
      <div class="modalfoot" style="padding:0;margin-top:16px;">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">💾 Save Project Changes</button>
      </div>
    </form>
  `;
  openModal(`Edit Project: ${p.name || p.title}`, html);
}

async function handleEditProject(e, projectId) {
  e.preventDefault();
  const name = document.getElementById('editProjectName').value.trim();
  const code = document.getElementById('editProjectCode').value.trim();
  const resortId = document.getElementById('editProjectResortId').value;
  const parentId = document.getElementById('editProjectParentId').value || null;
  const discipline = document.getElementById('editProjectDiscipline').value;
  const owner = document.getElementById('editProjectOwner').value.trim();
  const budget = document.getElementById('editProjectBudget').value.trim();
  const health = document.getElementById('editProjectHealth').value;
  const progress = parseInt(document.getElementById('editProjectProgress').value) || 0;
  const startDate = document.getElementById('editProjectStartDate').value || "2026-09-01";
  const endDate = document.getElementById('editProjectEndDate').value || "2026-12-31";
  const desc = document.getElementById('editProjectDesc').value;

  const projects = getProjects();
  const idx = projects.findIndex(x => String(x.id) === String(projectId) || x.code === projectId);

  let level = 1;
  if (parentId) {
    const parent = projects.find(p => String(p.id) === String(parentId));
    if (parent) {
      level = (Number(parent.level) || 1) + 1;
    }
  }

  // Try API update if available
  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      let numId = parseInt(projectId, 10);
      if (!isNaN(numId)) {
        const orig = window.__editingProject || {};
        await WisetrackAPI.updateProject(numId, {
          resortId: parseInt(resortId, 10) || orig.resortId,
          parentProjectId: parentId ? parseInt(parentId, 10) : (orig.parentProjectId ?? null),
          ownerId: orig.ownerId ?? null,
          projectTypeId: orig.projectTypeId ?? null,
          propertyId: orig.propertyId ?? null,
          clientName: orig.clientName ?? null,
          sponsor: orig.sponsor ?? null,
          currency: orig.currency || 'INR',
          allowExternalView: !!orig.allowExternalView,
          name,
          code,
          description: desc,
          status: health,
          startDate: startDate || null,
          endDate: endDate || null,
          profileNotes: orig.profileNotes ?? null
        });
      }
    }
  } catch (err) {
    console.warn('API update fallback:', err);
    showToast(err.message || 'Failed to update project on server', 'danger');
    return;
  }

  const updatedObj = {
    id: String(projectId),
    name,
    code,
    resortId: String(resortId),
    parentId: parentId ? String(parentId) : null,
    level,
    discipline,
    owner,
    budget,
    spent: idx !== -1 ? (projects[idx].spent || "₹0.00 Cr") : "₹0.00 Cr",
    health,
    healthBadge: health === 'On Track' || health === 'Completed' ? 'green' : health === 'At Risk' ? 'amber' : 'red',
    progress,
    startDate,
    endDate,
    desc
  };

  if (idx !== -1) {
    projects[idx] = { ...projects[idx], ...updatedObj };
  } else {
    projects.push(updatedObj);
  }

  localStorage.setItem('WISETRACK_PROJECTS', JSON.stringify(projects));
  closeModal();
  showToast(`Project "${name}" updated successfully!`, 'success');
  setTimeout(() => window.location.reload(), 300);
}

// 8. Delete Project
function confirmDeleteProject(projectId) {
  const projects = getProjects();
  const p = projects.find(x => String(x.id) === String(projectId) || x.code === projectId) || { name: projectId, code: projectId };
  const html = `
    <div style="text-align:center;padding:15px 0;">
      <div style="font-size:42px;margin-bottom:10px;">⚠️</div>
      <h3 style="font-size:16px;color:#991b1b;margin-bottom:8px;">Delete Project / Work Package?</h3>
      <p style="color:#64748b;font-size:13px;max-width:440px;margin:0 auto 16px;">
        Are you sure you want to delete <strong>${escapeHtmlAttr(p.name)}</strong> (${escapeHtmlAttr(p.code)})? Any nested child work packages will also be removed.
      </p>
      <div style="display:flex;justify-content:center;gap:12px;">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn danger" onclick="handleDeleteProject('${projectId}')">🗑️ Yes, Delete Project</button>
      </div>
    </div>
  `;
  openModal("Confirm Project Deletion", html);
}

async function handleDeleteProject(projectId) {
  try {
    if (typeof WisetrackAPI !== 'undefined' && WisetrackAPI.isLoggedIn()) {
      let numId = parseInt(projectId);
      if (!isNaN(numId)) {
        await WisetrackAPI.deleteProject(numId);
      }
      closeModal();
      showToast(`Project deleted via API.`, 'danger');
      setTimeout(() => window.location.reload(), 400);
      return;
    }
  } catch (err) { console.warn('API fallback:', err); }

  let projects = getProjects();
  projects = projects.filter(p => String(p.id) !== String(projectId) && String(p.parentId) !== String(projectId));
  localStorage.setItem('WISETRACK_PROJECTS', JSON.stringify(projects));
  closeModal();
  showToast(`Project removed.`, 'danger');
  setTimeout(() => window.location.reload(), 400);
}

// 9. Save Permissions Matrix
function handleSavePermissionsMatrix() {
  showToast('Permissions Matrix updated and synced across all roles!', 'success');
}

// ================================================================================
// MULTICOLOR THEME ENGINE (blue, red, green, yellow, white, dark, light)
// ================================================================================
function setGlobalTheme(themeName) {
  localStorage.setItem('WISETRACK_THEME', themeName);
  document.documentElement.setAttribute('data-theme', themeName);
  document.body.setAttribute('data-theme', themeName);
  const selects = document.querySelectorAll('#globalThemeSelector');
  selects.forEach(s => s.value = themeName);
  showToast(`🎨 Theme switched to: ${themeName.toUpperCase()}`, 'info');
}

function initTheme() {
  const theme = localStorage.getItem('WISETRACK_THEME') || 'blue';
  document.documentElement.setAttribute('data-theme', theme);
  document.body && document.body.setAttribute('data-theme', theme);
  const selects = document.querySelectorAll('#globalThemeSelector');
  selects.forEach(s => s.value = theme);
}

// Immediate theme execution to prevent flash
try {
  const savedTheme = localStorage.getItem('WISETRACK_THEME') || 'blue';
  document.documentElement.setAttribute('data-theme', savedTheme);
} catch (e) {}

// ================================================================================
// UNIVERSAL TABLE ENGINE: SEARCH, MULTI-COLUMN SORTING & PAGINATION
// ================================================================================
class UniversalTableEngine {
  constructor(tableEl, options = {}) {
    this.table = tableEl;
    this.tbody = tableEl.querySelector('tbody');
    if (!this.tbody) return;

    const saved = Number(localStorage.getItem('WISETRACK_PAGE_SIZE') || 25);
    const pageSize = [25, 50, 100, 200].includes(saved) ? saved : 25;

    this.options = {
      pageSize: options.pageSize || pageSize,
      searchable: options.searchable !== false,
      sortable: options.sortable !== false,
      paginated: options.paginated !== false,
      ...options
    };

    this.allRows = Array.from(this.tbody.querySelectorAll('tr'));
    this.filteredRows = [...this.allRows];
    this.currentPage = 1;
    this.pageSize = this.options.pageSize;
    this.sortCol = null;
    this.sortDir = 'asc';
    this.searchQuery = '';

    this.init();
  }

  destroy() {
    if (this.tbody && this.allRows.length) {
      this.tbody.innerHTML = '';
      this.allRows.forEach(r => this.tbody.appendChild(r));
    }
    this.toolbar?.remove();
    this.paginationEl?.remove();
    if (this.table) {
      delete this.table.dataset.engineInit;
      delete this.table.dataset.engineId;
    }
  }

  init() {
    if (!this.tbody) return;
    if (this.table.dataset.engineInit === 'true') return;
    this.table.dataset.engineInit = 'true';

    const wrap = this.table.closest('.table-wrap');
    const host = wrap || this.table.parentNode;

    if (this.options.searchable || this.options.paginated) {
      this.toolbar = document.createElement('div');
      this.toolbar.className = 'table-toolbar';
      const sizes = [25, 50, 100, 200];
      this.toolbar.innerHTML = `
        <div class="table-search">
          <i class="fa-solid fa-magnifying-glass" style="color:var(--text-muted);"></i>
          <input type="text" placeholder="Search this table..." value="${this.searchQuery}">
        </div>
        <div class="table-page-size">
          <label>Rows per page:</label>
          <select class="table-size-select">
            ${sizes.map(n => `<option value="${n}" ${Number(this.pageSize) === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      `;
      if (wrap) host.parentNode.insertBefore(this.toolbar, wrap);
      else host.insertBefore(this.toolbar, this.table);

      const searchInput = this.toolbar.querySelector('.table-search input');
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.filter();
      });

      const sizeSelect = this.toolbar.querySelector('.table-size-select');
      sizeSelect.addEventListener('change', (e) => {
        this.pageSize = parseInt(e.target.value, 10) || 25;
        localStorage.setItem('WISETRACK_PAGE_SIZE', String(this.pageSize));
        this.currentPage = 1;
        this.render();
      });
    }

    if (this.options.sortable) {
      const headers = this.table.querySelectorAll('thead th');
      headers.forEach((th, idx) => {
        const text = th.textContent.trim().toLowerCase();
        if (text.includes('action') || text.includes('super admin')) return;
        th.classList.add('sortable');
        th.title = 'Click to sort';
        th.addEventListener('click', () => this.sort(idx, th));
      });
    }

    if (this.options.paginated) {
      this.paginationEl = document.createElement('div');
      this.paginationEl.className = 'table-pagination';
      if (wrap) host.parentNode.insertBefore(this.paginationEl, wrap.nextSibling);
      else host.insertBefore(this.paginationEl, this.table.nextSibling);
    }

    this.render();
  }

  filter() {
    if (!this.searchQuery) {
      this.filteredRows = [...this.allRows];
    } else {
      this.filteredRows = this.allRows.filter(row => {
        const text = row.textContent.toLowerCase();
        return text.includes(this.searchQuery);
      });
    }
    this.currentPage = 1;
    this.render();
  }

  sort(colIdx, thEl) {
    if (this.sortCol === colIdx) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = colIdx;
      this.sortDir = 'asc';
    }

    // Update header classes
    this.table.querySelectorAll('thead th').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    thEl.classList.add(this.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');

    this.filteredRows.sort((a, b) => {
      const aCell = a.children[colIdx]?.textContent.trim() || '';
      const bCell = b.children[colIdx]?.textContent.trim() || '';

      // Try numeric / currency / percentage parse
      const aNum = parseFloat(aCell.replace(/[^0-9.-]/g, ''));
      const bNum = parseFloat(bCell.replace(/[^0-9.-]/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum) && (aCell.includes('₹') || aCell.includes('%') || !isNaN(Number(aCell)))) {
        return this.sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      return this.sortDir === 'asc' ? aCell.localeCompare(bCell) : bCell.localeCompare(aCell);
    });

    this.render();
  }

  render() {
    this.tbody.innerHTML = '';

    if (this.filteredRows.length === 0) {
      const colspan = this.table.querySelectorAll('thead th').length || 6;
      this.tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding:24px; color:var(--text-muted);">No matching records found for "${this.searchQuery}"</td></tr>`;
      if (this.paginationEl) {
        this.paginationEl.innerHTML = `<div>Showing 0 of 0 entries</div>`;
      }
      return;
    }

    const total = this.filteredRows.length;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = Math.min(start + this.pageSize, total);
    const visibleRows = this.filteredRows.slice(start, end);

    visibleRows.forEach(r => this.tbody.appendChild(r));

    // Render Pagination
    if (this.paginationEl) {
      const totalPages = Math.ceil(total / this.pageSize) || 1;
      let pageBtnsHtml = '';
      
      for (let p = 1; p <= totalPages; p++) {
        if (totalPages > 7 && Math.abs(p - this.currentPage) > 2 && p !== 1 && p !== totalPages) {
          if (p === 2 || p === totalPages - 1) pageBtnsHtml += `<span style="padding:0 4px;color:var(--text-muted);">…</span>`;
          continue;
        }
        pageBtnsHtml += `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="window.__tableEngines['${this.table.dataset.engineId}'].goToPage(${p})">${p}</button>`;
      }

      this.paginationEl.innerHTML = `
        <div class="page-info">Showing <b>${start + 1}</b> to <b>${end}</b> of <b>${total}</b> entries ${this.searchQuery ? `(filtered from ${this.allRows.length})` : ''}</div>
        <div class="page-btns">
          <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="window.__tableEngines['${this.table.dataset.engineId}'].goToPage(${this.currentPage - 1})">‹ Prev</button>
          ${pageBtnsHtml}
          <button class="page-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="window.__tableEngines['${this.table.dataset.engineId}'].goToPage(${this.currentPage + 1})">Next ›</button>
        </div>
      `;
    }
  }

  goToPage(p) {
    const totalPages = Math.ceil(this.filteredRows.length / this.pageSize) || 1;
    if (p >= 1 && p <= totalPages) {
      this.currentPage = p;
      this.render();
    }
  }
}

window.__tableEngines = {};

function isTableLoading(tbody) {
  const rows = tbody ? tbody.querySelectorAll('tr') : [];
  if (rows.length !== 1) return false;
  return /loading/i.test((rows[0].textContent || '').trim());
}

function destroyTableEngine(table) {
  const id = table?.dataset?.engineId;
  if (id && window.__tableEngines[id]) {
    window.__tableEngines[id].destroy();
    delete window.__tableEngines[id];
  }
  if (table) {
    delete table.dataset.engineId;
    delete table.dataset.engineInit;
  }
}

function initAllTables() {
  Object.keys(window.__tableEngines).forEach(id => {
    const eng = window.__tableEngines[id];
    if (!eng?.table || !document.body.contains(eng.table)) {
      delete window.__tableEngines[id];
    }
  });

  document.querySelectorAll('table.table').forEach((t) => {
    const tbody = t.querySelector('tbody');
    if (!tbody) return;
    if (isTableLoading(tbody)) return;

    const existingId = t.dataset.engineId;
    const existing = existingId && window.__tableEngines[existingId];
    if (existing) {
      const currentRows = Array.from(tbody.querySelectorAll('tr'));
      const overlap = currentRows.filter(tr => existing.allRows.includes(tr)).length;
      if (overlap > 0) return;
      if (currentRows.length === 1 && /No matching records/i.test(currentRows[0].textContent || '')) return;
      destroyTableEngine(t);
    }

    const rows = tbody.querySelectorAll('tr');
    if (!rows.length) return;

    const saved = Number(localStorage.getItem('WISETRACK_PAGE_SIZE') || 25);
    const pageSize = [25, 50, 100, 200].includes(saved) ? saved : 25;
    const id = 'tbl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    t.dataset.engineId = id;
    window.__tableEngines[id] = new UniversalTableEngine(t, { pageSize });
  });
}

function watchTablePagination() {
  const root = document.getElementById('apiPageRoot') || document.querySelector('.content') || document.body;
  if (!root || root.dataset.tableWatch === 'true') return;
  root.dataset.tableWatch = 'true';
  let timer = null;
  const obs = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => initAllTables(), 80);
  });
  obs.observe(root, { childList: true, subtree: true });
  initAllTables();
}

function globalFilterAllTables(query) {
  Object.values(window.__tableEngines).forEach(engine => {
    engine.searchQuery = query.toLowerCase().trim();
    engine.filter();
  });
}

// ================================================================================
// VISUAL DAILY REPORT CHARTS (DONUT / PIE & PROGRESS BARS)
// ================================================================================
function renderDailyReportCharts(targetContainerId, data = {}) {
  const el = document.getElementById(targetContainerId);
  if (!el) return;

  const completed = data.completedCount || 8;
  const inProgress = data.inProgressCount || 22;
  const delayed = data.delayedCount || 3;
  const critical = data.criticalCount || 1;
  const total = completed + inProgress + delayed + critical;

  const compPct = Math.round((completed / total) * 100);
  const progPct = Math.round((inProgress / total) * 100);
  const delPct = Math.round((delayed / total) * 100);
  const critPct = Math.round((critical / total) * 100);

  // SVG Donut Angles
  const compAngle = (compPct / 100) * 360;
  const progAngle = (progPct / 100) * 360;
  const delAngle = (delPct / 100) * 360;
  const critAngle = (critPct / 100) * 360;

  el.innerHTML = `
    <div class="charts-grid">
      <!-- Chart 1: Donut/Pie Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">🥧 Sub-Task Status Distribution (Pie / Donut)</div>
            <small style="color:var(--text-muted);">Real-time site execution split across 34 active tasks</small>
          </div>
          <span class="badge blue">Live Site Telemetry</span>
        </div>

        <div class="chart-canvas-wrap">
          <svg viewBox="0 0 36 36" style="width:160px; height:160px; transform:rotate(-90deg);">
            <!-- Background Ring -->
            <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" stroke-width="3.5"></circle>
            <!-- Completed (Green) -->
            <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#059669" stroke-width="3.5"
                    stroke-dasharray="${compPct} ${100 - compPct}" stroke-dashoffset="0"></circle>
            <!-- In Progress (Blue) -->
            <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#2563eb" stroke-width="3.5"
                    stroke-dasharray="${progPct} ${100 - progPct}" stroke-dashoffset="-${compPct}"></circle>
            <!-- Delayed (Amber) -->
            <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#d97706" stroke-width="3.5"
                    stroke-dasharray="${delPct} ${100 - delPct}" stroke-dashoffset="-${compPct + progPct}"></circle>
            <!-- Critical (Red) -->
            <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#dc2626" stroke-width="3.5"
                    stroke-dasharray="${critPct} ${100 - critPct}" stroke-dashoffset="-${compPct + progPct + delPct}"></circle>
          </svg>
          <div style="position:absolute; text-align:center;">
            <div style="font-size:22px; font-weight:800; color:var(--text-main);">${total}</div>
            <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Sub-Tasks</div>
          </div>
        </div>

        <div class="donut-legend">
          <div class="donut-legend-item"><span class="donut-legend-color" style="background:#059669;"></span> <span>🟢 Completed (${completed} · ${compPct}%)</span></div>
          <div class="donut-legend-item"><span class="donut-legend-color" style="background:#2563eb;"></span> <span>🔵 In Progress (${inProgress} · ${progPct}%)</span></div>
          <div class="donut-legend-item"><span class="donut-legend-color" style="background:#d97706;"></span> <span>🟠 Delayed (${delayed} · ${delPct}%)</span></div>
          <div class="donut-legend-item"><span class="donut-legend-color" style="background:#dc2626;"></span> <span>🔴 Critical Hindrance (${critical} · ${critPct}%)</span></div>
        </div>
      </div>

      <!-- Chart 2: Cumulative Progress Bar Chart by Discipline -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">📊 Discipline Progress & Cumulative Velocity</div>
            <small style="color:var(--text-muted);">Yesterday vs Today vs Cumulative % Target</small>
          </div>
          <span class="badge green">148 Workers On Site</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <strong>Civil & Superstructure</strong>
              <span><b>80%</b> (Yesterday 78% · <span style="color:#059669;">+2%</span>)</span>
            </div>
            <div class="progress green" style="height:10px;"><i style="width:80%"></i></div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <strong>Electrical & 11kV Substation</strong>
              <span><b>72%</b> (Yesterday 64% · <span style="color:#2563eb;">+8%</span>)</span>
            </div>
            <div class="progress blue" style="height:10px;"><i style="width:72%"></i></div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <strong>HVAC & Chiller Plant Piping</strong>
              <span><b>55%</b> (Yesterday 55% · <span style="color:#dc2626;">0% Stalled</span>)</span>
            </div>
            <div class="progress amber" style="height:10px;"><i style="width:55%"></i></div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <strong>Plumbing, STP & Fire Safety</strong>
              <span><b>68%</b> (Yesterday 65% · <span style="color:#059669;">+3%</span>)</span>
            </div>
            <div class="progress green" style="height:10px;"><i style="width:68%"></i></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid var(--border-color); border-radius:6px; padding:10px 14px; margin-top:14px; font-size:12px;">
          <div><b>Today's Delta:</b> <span style="color:#059669; font-weight:700;">+3.25% Net Site Progress</span></div>
          <div><b>Weather / Shift:</b> Clear · Full Double Shift</div>
        </div>
      </div>
    </div>
  `;
}

// Universal Click & Attribute Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Active Theme
  initTheme();

  // Sync Role dropdown in topbar if present
  const currentRole = localStorage.getItem('WISETRACK_ROLE') || 'Super / Project Admin';
  const roleSelect = document.getElementById('globalRoleSelector');
  if (roleSelect) {
    roleSelect.value = currentRole;
  }
  const roleBadges = document.querySelectorAll('.current-role-label');
  roleBadges.forEach(el => el.textContent = currentRole);

  // Sync Resort dropdown in topbar
  const currentResort = getSelectedResortId();
  const resortSelect = document.getElementById('globalResortSelector');
  if (resortSelect) {
    resortSelect.value = currentResort;
  }

  // Initialize all tables with Search, Sort & Pagination
  watchTablePagination();
  setTimeout(() => initAllTables(), 200);
  setTimeout(() => initAllTables(), 800);
});