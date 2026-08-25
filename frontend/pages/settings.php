<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">System & Security Settings</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">SYSTEM CONFIGURATION</div>
      <h1>System, Notification & Security Settings</h1>
      <p>Configure PMO parameters, currency baselines, 80% RAG threshold trigger limits, and security policies.</p>
    </div>
    <div class="head-actions">
      <button class="btn primary" onclick="showToast('System configuration saved successfully!', 'success')">Save Configuration</button>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h3 class="card-title">General PMO Parameters</h3></div>
    <div class="form-grid">
      <div class="field"><label>Organization / Holding Entity</label><input type="text" value="Wisetrack Engineering & Hospitality PMO"></div>
      <div class="field"><label>System Base Currency</label><select><option selected>INR — Indian Rupee (₹)</option><option>USD — US Dollar ($)</option></select></div>
      <div class="field"><label>Cost Center Warning Trigger (RAG Threshold)</label><input type="text" value="80%"></div>
      <div class="field"><label>Inactive Task Warning Threshold</label><input type="text" value="7 Days"></div>
      <div class="field"><label>Email / SMS Escalation Notifications</label><select><option selected>Enabled (Instant Dispatch)</option><option>Disabled</option></select></div>
      <div class="field"><label>Default Executive Report Format</label><select><option selected>PDF Executive Dossier</option><option>Excel (.xlsx)</option></select></div>
    </div>
  </div>
</div>
