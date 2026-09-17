// WISETRACK API LAYER — connects frontend to live ASP.NET Core backend
const API_BASE = (function () {
  const { hostname, origin, protocol } = window.location;
  const customBase = localStorage.getItem('WISETRACK_API_BASE');
  if (customBase) return customBase.replace(/\/+$/, '');

  // Prefer same-origin API when app is served by the ASP.NET host (/app/...)
  if (protocol === 'http:' || protocol === 'https:') {
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === 'demo-project-tracker.workarya.com' ||
      location.pathname.includes('/app')
    ) {
      return `${origin}/api`;
    }
  }

  return 'https://demo-project-tracker.workarya.com/api';
})();

const WisetrackAPI = {
  _token: () => localStorage.getItem('WISETRACK_TOKEN') || '',

  _headers(json = true) {
    const h = {};   
    const token = this._token();
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  },

  async _fetch(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { ...this._headers(), ...(options.headers || {}) }
    });

    if (res.status === 401) {
      localStorage.removeItem('WISETRACK_TOKEN');
      if (!location.pathname.endsWith('login.html')) {
        location.href = 'login.html';
      }
      throw new Error('Unauthorized — please login again');
    }

    if (res.status === 204) return null;

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      let msg = data?.message;
      if (!msg && data?.errors && typeof data.errors === 'object') {
        msg = Object.entries(data.errors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      }
      if (!msg) msg = data?.title || `API error ${res.status}`;
      throw new Error(msg);
    }
    return data;
  },

  get(url) { return this._fetch(url); },
  post(url, body) { return this._fetch(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this._fetch(url, { method: 'PUT', body: JSON.stringify(body) }); },
  del(url) { return this._fetch(url, { method: 'DELETE' }); },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Login failed');

    localStorage.setItem('WISETRACK_TOKEN', data.token);
    localStorage.setItem('WISETRACK_USER_ID', String(data.userId));
    localStorage.setItem('WISETRACK_USER_NAME', data.fullName || '');
    localStorage.setItem('WISETRACK_USER_EMAIL', data.email || email);
    localStorage.setItem('WISETRACK_USER_ROLES', JSON.stringify(data.roles || []));
    return data;
  },

  logout() {
    localStorage.removeItem('WISETRACK_TOKEN');
    localStorage.removeItem('WISETRACK_USER_ID');
    localStorage.removeItem('WISETRACK_USER_NAME');
    localStorage.removeItem('WISETRACK_USER_EMAIL');
    localStorage.removeItem('WISETRACK_USER_ROLES');
    location.href = 'login.html';
  },

  isLoggedIn() { return !!localStorage.getItem('WISETRACK_TOKEN'); },

  // Roles
  getRoles() { return this.get('/roles'); },
  getRole(id) { return this.get(`/roles/${id}`); },
  createRole(data) { return this.post('/roles', data); },
  updateRole(id, data) { return this.put(`/roles/${id}`, data); },
  deleteRole(id) { return this.del(`/roles/${id}`); },
  setRolePermissions(id, permissionIds) { return this.put(`/roles/${id}/permissions`, { permissionIds }); },
  assignUserRoles(userId, roleIds) { return this.put(`/roles/users/${userId}`, { roleIds }); },
  getPermissions() { return this.get('/roles/permissions/all'); },
  createPermission(data) { return this.post('/roles/permissions', data); },
  updatePermission(id, data) { return this.put(`/roles/permissions/${id}`, data); },
  deletePermission(id) { return this.del(`/roles/permissions/${id}`); },

  // Users
  getUsers() { return this.get('/users'); },
  getUser(id) { return this.get(`/users/${id}`); },
  createUser(data) { return this.post('/users', data); },
  updateUser(id, data) { return this.put(`/users/${id}`, data); },
  setProjectPermission(data) { return this.post('/users/project-permissions', data); },
  getUserProjectPermissions(userId) { return this.get(`/users/${userId}/project-permissions`); },

  async uploadFile(file, module, relatedId) {
    const fd = new FormData();
    fd.append('file', file);
    if (module) fd.append('module', module);
    if (relatedId) fd.append('relatedId', String(relatedId));
    const res = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this._token()}` },
      body: fd
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`);
    return data;
  },

  // Resorts
  getResorts() { return this.get('/projects/resorts'); },
  getResort(id) { return this.get(`/projects/resorts/${id}`); },
  createResort(data) { return this.post('/projects/resorts', data); },
  updateResort(id, data) { return this.put(`/projects/resorts/${id}`, data); },
  deleteResort(id) { return this.del(`/projects/resorts/${id}`); },

  // Properties
  getProperties(resortId) { return this.get(`/projects/properties${resortId ? '?resortId=' + resortId : ''}`); },
  createProperty(data) { return this.post('/projects/properties', data); },
  updateProperty(id, data) { return this.put(`/projects/properties/${id}`, data); },
  deleteProperty(id) { return this.del(`/projects/properties/${id}`); },

  // Project Types
  getProjectTypes() { return this.get('/projects/types'); },
  createProjectType(data) { return this.post('/projects/types', data); },
  updateProjectType(id, data) { return this.put(`/projects/types/${id}`, data); },
  deleteProjectType(id) { return this.del(`/projects/types/${id}`); },

  // Projects
  getProjects(resortId, parentId) {
    const q = new URLSearchParams();
    if (resortId) q.set('resortId', resortId);
    if (parentId) q.set('parentId', parentId);
    const s = q.toString();
    return this.get('/projects' + (s ? '?' + s : ''));
  },
  getProjectHierarchy(resortId) { return this.get(`/projects/hierarchy/${resortId}`); },
  getProject(id) { return this.get(`/projects/${id}`); },
  getProjectTeam(projectId) { return this.get(`/projects/${projectId}/team`); },
  createProject(data) { return this.post('/projects', data); },
  updateProject(id, data) { return this.put(`/projects/${id}`, data); },
  deleteProject(id) { return this.del(`/projects/${id}`); },
  assignTeamMember(projectId, data) { return this.post(`/projects/${projectId}/team`, data); },
  removeTeamMember(projectId, userId) { return this.del(`/projects/${projectId}/team/${userId}`); },

  // Budgets
  getBudgets(projectId) { return this.get(`/budgets/project/${projectId}`); },
  createBudget(data) { return this.post('/budgets', data); },
  reviseBudget(id, data) { return this.post(`/budgets/${id}/revise`, data); },
  getCostCenters(projectId) { return this.get(`/budgets/cost-centers${projectId ? '?projectId=' + projectId : ''}`); },
  createCostCenter(data) { return this.post('/budgets/cost-centers', data); },
  updateCostCenter(id, data) { return this.put(`/budgets/cost-centers/${id}`, data); },
  deleteCostCenter(id) { return this.del(`/budgets/cost-centers/${id}`); },
  allocateBudget(data) { return this.post('/budgets/allocations', data); },

  // Items
  getItems() { return this.get('/items'); },
  getItem(id) { return this.get(`/items/${id}`); },
  createItem(data) { return this.post('/items', data); },
  updateItem(id, data) { return this.put(`/items/${id}`, data); },
  deleteItem(id) { return this.del(`/items/${id}`); },
  getBrands() { return this.get('/items/brands'); },
  createBrand(name) { return this.post('/items/brands', { name }); },
  updateBrand(id, name) { return this.put(`/items/brands/${id}`, { name }); },
  deleteBrand(id) { return this.del(`/items/brands/${id}`); },
  getUnits() { return this.get('/items/units'); },
  createUnit(code, name) { return this.post('/items/units', { code, name }); },
  updateUnit(id, code, name) { return this.put(`/items/units/${id}`, { code, name }); },
  deleteUnit(id) { return this.del(`/items/units/${id}`); },
  getCategories() { return this.get('/items/categories'); },
  createCategory(name, parentId) { return this.post('/items/categories', { name, parentId }); },
  updateCategory(id, data) { return this.put(`/items/categories/${id}`, data); },
  deleteCategory(id) { return this.del(`/items/categories/${id}`); },

  // BOQ
  getBoqs(projectId) { return this.get(`/boq/project/${projectId}`); },
  getBoq(id) { return this.get(`/boq/${id}`); },
  importBoq(data) { return this.post('/boq/import', data); },
  createBoqFromMaster(projectId, itemIds) { return this.post('/boq/from-master', { projectId, itemIds }); },

  // Tasks
  getMilestones(projectId) { return this.get(`/tasks/milestones/${projectId}`); },
  createMilestone(data) { return this.post('/tasks/milestones', data); },
  getTasks(projectId) { return this.get(`/tasks/project/${projectId}`); },
  createTask(data) { return this.post('/tasks', data); },
  deleteTask(id) { return this.del(`/tasks/${id}`); },
  createSubTask(data) { return this.post('/tasks/subtasks', data); },
  deleteSubTask(id) { return this.del(`/tasks/subtasks/${id}`); },
  addTaskUpdate(data) { return this.post('/tasks/updates', data); },
  bulkImportUpdates(data) { return this.post('/tasks/bulk-import', data); },
  getExceptions(projectId) { return this.get(`/tasks/exceptions/${projectId}`); },
  getDailyTaskReport(projectId, date) { return this.get(`/tasks/daily-report/${projectId}${date ? '?date=' + date : ''}`); },

  // Costs
  getPurchases(projectId) { return this.get(`/costs/purchases/${projectId}`); },
  addPurchase(data) { return this.post('/costs/purchases', data); },
  getActuals(projectId) { return this.get(`/costs/actuals/${projectId}`); },
  addActual(data) { return this.post('/costs/actuals', data); },
  getVariance(projectId) { return this.get(`/costs/variance/${projectId}`); },

  // Issues
  getIssuePriorities() { return this.get('/issues/priorities'); },
  getIssues(projectId) { return this.get(`/issues/project/${projectId}`); },
  getIssue(id) { return this.get(`/issues/${id}`); },
  createIssue(data) { return this.post('/issues', data); },
  addIssueComment(issueId, comment) { return this.post(`/issues/${issueId}/comments`, { comment }); },
  escalateIssue(id) { return this.post(`/issues/${id}/escalate`); },

  // Notifications
  sendNotification(data) { return this.post('/notifications', data); },
  getInbox() { return this.get('/notifications/inbox'); },
  markRead(recipientId) { return this.post(`/notifications/${recipientId}/read`); },
  getEscalationRules() { return this.get('/notifications/escalation-rules'); },
  createEscalationRule(data) { return this.post('/notifications/escalation-rules', data); },

  // Reports
  getReports() { return this.get('/reports'); },
  createReport(data) { return this.post('/reports', data); },
  getPortfolioReport() { return this.get('/reports/portfolio'); },
  getDailyReport(projectId, date) { return this.get(`/reports/daily/${projectId}${date ? '?date=' + date : ''}`); },
  getComparableProjects(filter) { return this.post('/reports/comparable', filter); },

  // Dashboard
  getDashboard() { return this.get('/dashboard'); },

  // Closure
  getInventory(projectId) { return this.get(`/closure/inventory/${projectId}`); },
  addInventory(data) { return this.post('/closure/inventory', data); },
  closeProject(data) { return this.post('/closure/close', data); },

  // Audit
  getAuditLogs(entityName, entityId, take = 100) {
    const q = new URLSearchParams();
    if (entityName) q.set('entityName', entityName);
    if (entityId) q.set('entityId', entityId);
    q.set('take', String(take));
    return this.get('/audit?' + q.toString());
  },

  addVarianceExplanation(data) { return this.post('/projects/variance-explanations', data); },
  getVarianceExplanations(projectId) { return this.get(`/projects/${projectId}/variance-explanations`); },
  getTemplates() { return this.get('/projects/milestone-templates'); },
  saveTemplate(data) { return this.post('/projects/milestone-templates', data); },
  cloneTemplate(data) { return this.post('/projects/milestone-templates/clone', data); },
};
