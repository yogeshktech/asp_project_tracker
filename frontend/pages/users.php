<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">Users & Access Control</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 8 · GOVERNANCE & ACCESS CONTROL</div>
      <h1>System Users & Role Management</h1>
      <p>Super Admin control: User directory, system role assignments, resort property access, field-level restrictions, status change, edit, and deletion.</p>
    </div>
    <div class="head-actions">
      <a href="index.php?page=permissions" class="btn">🔐 Permissions Matrix</a>
      <button class="btn primary" onclick="openAddUserModal()"><i class="fa-solid fa-plus"></i> Add Authorized User</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Authorized Personnel</span>
      <span class="kpi-value"><?php echo count($users); ?> Users</span>
      <span class="kpi-sub">Across 6 System Roles</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Active Accounts</span>
      <span class="kpi-value">7 Active</span>
      <span class="kpi-sub">0 Suspended</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Field Masking Active</span>
      <span class="kpi-value">2 Engineers</span>
      <span class="kpi-sub">Rates & Financials Hidden</span>
    </div>
    <div class="kpi warning">
      <span class="kpi-label">Super Admins</span>
      <span class="kpi-value">1 Super Admin</span>
      <span class="kpi-sub">Global Unrestricted Access</span>
    </div>
  </div>

  <!-- Users Table with Super Admin CRUD -->
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Authorized Personnel Master Directory</h3>
        <div class="card-subtitle">Manage user accounts, roles, resort property assignments, and security masking</div>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="showToast('Exporting user directory to CSV...', 'info')"><i class="fa-solid fa-download"></i> Export CSV</button>
        <button class="btn sm primary" onclick="openAddUserModal()"><i class="fa-solid fa-plus"></i> Add New User</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>USER & CONTACT</th>
            <th>SYSTEM ROLE</th>
            <th>RESORT PROPERTY ACCESS</th>
            <th>ASSIGNED WBS PACKAGES</th>
            <th>SECURITY RESTRICTIONS / MASKING</th>
            <th>STATUS</th>
            <th>SUPER ADMIN ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($users as $u): ?>
            <tr>
              <td>
                <div style="display:flex; align-items:center; gap:10px;">
                  <div class="avatar"><?php echo htmlspecialchars($u['avatar']); ?></div>
                  <div>
                    <strong style="font-size:13.5px; color:var(--text-main);"><?php echo htmlspecialchars($u['name']); ?></strong>
                    <small style="color:var(--text-muted); display:block;"><?php echo htmlspecialchars($u['email']); ?> · ID: <?php echo $u['id']; ?></small>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge <?php echo (strpos($u['role'], 'Admin') !== false) ? 'blue' : (strpos($u['role'], 'Finance') !== false ? 'amber' : (strpos($u['role'], 'Auditor') !== false ? 'red' : 'gray')); ?>">
                  <?php echo htmlspecialchars($u['role']); ?>
                </span>
              </td>
              <td><b><?php echo htmlspecialchars($u['assignedResorts']); ?></b></td>
              <td><small><?php echo htmlspecialchars($u['assignedProjects']); ?></small></td>
              <td>
                <?php if ($u['fieldRestrictions'] === 'None'): ?>
                  <span class="badge green">Full Unmasked</span>
                <?php else: ?>
                  <span class="badge amber"><?php echo htmlspecialchars($u['fieldRestrictions']); ?></span>
                <?php endif; ?>
              </td>
              <td>
                <select class="user-status-dropdown" onchange="handleToggleUserStatus('<?php echo $u['id']; ?>', this.value)" style="padding:4px 8px; border-radius:6px; font-size:11.5px; font-weight:700; border:1px solid var(--border-color); background:#fff;">
                  <option value="Active" <?php echo ($u['status'] == 'Active') ? 'selected' : ''; ?>><i class="fa-solid fa-circle" style="color:#059669;font-size:8px;"></i> Active</option>
                  <option value="Suspended" <?php echo ($u['status'] == 'Suspended') ? 'selected' : ''; ?>>🟠 Suspended</option>
                  <option value="Inactive" <?php echo ($u['status'] == 'Inactive') ? 'selected' : ''; ?>><i class="fa-solid fa-circle" style="color:#dc2626;font-size:8px;"></i> Inactive</option>
                </select>
              </td>
              <td>
                <div class="btn-group">
                  <button class="btn sm" onclick="openEditUserModal('<?php echo $u['id']; ?>')" title="Edit User Profile & Role"><i class="fa-solid fa-pen"></i> Edit</button>
                  <button class="btn sm danger" onclick="confirmDeleteUser('<?php echo $u['id']; ?>')" title="Delete User Account"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Role Overview Cards -->
  <div class="grid g3" style="margin-top:20px;">
    <?php foreach ($roles as $roleKey => $roleDef): ?>
      <div class="card" style="margin-bottom:0;">
        <span class="badge <?php echo $roleDef['badge']; ?>"><?php echo htmlspecialchars($roleDef['title']); ?></span>
        <h4 style="font-size:15px; margin:10px 0 4px;"><?php echo htmlspecialchars($roleDef['title']); ?></h4>
        <p style="font-size:12px; color:var(--text-muted); line-height:1.6; min-height:48px;">
          <?php echo htmlspecialchars($roleDef['desc']); ?>
        </p>
        <div style="border-top:1px solid var(--border-color); padding-top:10px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11.5px; color:var(--text-muted);">
            Rate Masked: <b><?php echo $roleDef['fieldMasking']['ratesMasked'] ? '<i class="fa-solid fa-lock"></i> Yes' : '🔓 No'; ?></b>
          </span>
          <a href="index.php?page=permissions" class="btn sm">View Matrix ➔</a>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div>
