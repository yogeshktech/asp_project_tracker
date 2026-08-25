<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=users">Users</a>
    <span>/</span>
    <span class="current">Granular Permissions Matrix</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">ENTERPRISE RBAC & SECURITY MATRIX</div>
      <h1>Granular Permissions Matrix</h1>
      <p>Module-by-module security control: Super Admin can configure View, Create, Edit, Delete, and Approve permissions for each system role.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="handleResetPermissions()">🔄 Reset to Factory Defaults</button>
      <button class="btn primary" onclick="handleSavePermissionsMatrix()">💾 Save Permissions Changes</button>
    </div>
  </div>

  <div class="alert" style="background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8;">
    <span>🔐</span>
    <div>
      <strong>Super Admin Permission Control:</strong> Changes made here apply instantly to all users assigned to that role. Commercial rates are masked automatically for Site Engineers according to the field-level policy.
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Module-by-Module Access Control Matrix</h3>
        <div class="card-subtitle">Checkboxes specify active rights: View, Create, Edit, Delete, Approve, Export</div>
      </div>
      <button class="btn sm primary" onclick="handleSavePermissionsMatrix()">💾 Save Matrix</button>
    </div>

    <div class="table-wrap">
      <table class="table perm-table">
        <thead>
          <tr>
            <th style="min-width:200px;">SYSTEM MODULE</th>
            <th style="text-align:center;">SUPER ADMIN</th>
            <th style="text-align:center;">PROJECT MANAGER</th>
            <th style="text-align:center;">SITE ENGINEER</th>
            <th style="text-align:center;">FINANCE CONTROLLER</th>
            <th style="text-align:center;">QUALITY AUDITOR</th>
            <th style="text-align:center;">RESORT GM</th>
            <th style="text-align:center;">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($permissionMatrix as $modKey => $perm): ?>
            <tr>
              <td>
                <strong style="font-size:13.5px;"><?php echo htmlspecialchars($perm['module']); ?></strong>
                <small style="color:var(--text-muted); display:block;">Key: <code><?php echo $modKey; ?></code></small>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" class="perm-checkbox" <?php echo $perm['super_admin'] ? 'checked' : ''; ?> title="Super Admin">
                <div style="font-size:10px; color:var(--text-muted);">Full</div>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" class="perm-checkbox" <?php echo $perm['project_manager'] ? 'checked' : ''; ?> title="Project Manager">
                <div style="font-size:10px; color:var(--text-muted);"><?php echo $perm['project_manager'] ? 'Active' : 'No Access'; ?></div>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" class="perm-checkbox" <?php echo $perm['site_engineer'] ? 'checked' : ''; ?> title="Site Engineer">
                <div style="font-size:10px; color:var(--text-muted);"><?php echo $perm['site_engineer'] ? 'Active' : 'No Access'; ?></div>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" class="perm-checkbox" <?php echo $perm['finance_controller'] ? 'checked' : ''; ?> title="Finance Controller">
                <div style="font-size:10px; color:var(--text-muted);"><?php echo $perm['finance_controller'] ? 'Active' : 'No Access'; ?></div>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" class="perm-checkbox" <?php echo $perm['quality_auditor'] ? 'checked' : ''; ?> title="Quality Auditor">
                <div style="font-size:10px; color:var(--text-muted);"><?php echo $perm['quality_auditor'] ? 'Active' : 'No Access'; ?></div>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" class="perm-checkbox" <?php echo $perm['resort_gm'] ? 'checked' : ''; ?> title="Resort GM">
                <div style="font-size:10px; color:var(--text-muted);"><?php echo $perm['resort_gm'] ? 'Active' : 'No Access'; ?></div>
              </td>
              <td style="text-align:center;">
                <button class="btn sm" onclick="showToast('Granular modal configured for <?php echo htmlspecialchars($perm['module']); ?>', 'info')">⚙️ Configure</button>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div class="grid g2" style="margin-top:20px;">
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Field-Level Security & Masking Rules</h3>
      </div>
      <div style="font-size:12.5px; line-height:1.8; color:var(--text-muted);">
        <div><i class="fa-solid fa-lock"></i> <b>Unit Rate & Financial Masking:</b> Automatically masked for Site Engineers across BOQ, Item Master, and Budget centers.</div>
        <div><i class="fa-solid fa-lock"></i> <b>Audit Trail Immutability:</b> Forensic write-logs cannot be deleted or edited by any role except database administrator.</div>
        <div><i class="fa-solid fa-lock"></i> <b>Gateway Signoff Authority:</b> Only Quality Auditor and PMO Lead can certify milestones.</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Role Assignment Shortcuts</h3>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <a href="index.php?page=users" class="btn primary sm" style="text-decoration:none;">👥 Manage Users Directory ➔</a>
        <button class="btn sm" onclick="showToast('Permission audit log exported to CSV', 'info')">📜 Export Permissions Audit</button>
      </div>
    </div>
  </div>
</div>
