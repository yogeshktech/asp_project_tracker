<?php
require_once __DIR__ . '/includes/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — <?php echo APP_NAME; ?> Project Control</title>
  <link rel="stylesheet" href="assets/style.css">
  <script src="assets/data.js"></script>
</head>
<body>
<div class="auth-wrapper">
  <div class="auth-card">
    <div class="auth-logo">
      <div class="logo-badge">W</div>
      <div>
        <h2 style="font-size: 19px; font-weight: 800; color:#0f172a; margin:0;"><?php echo APP_NAME; ?></h2>
        <div style="font-size: 11px; font-weight:700; color: #64748b; text-transform:uppercase; letter-spacing:0.8px;">Engineering Project Control</div>
      </div>
    </div>

    <div class="auth-title">Sign In to Wisetrack</div>
    <p class="auth-desc">Enterprise Portfolio Management, N-Level Projects & Governance</p>

    <!-- Quick Demo Role Switcher -->
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:18px;">
      <div style="font-size:11px; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase;">⚡ Quick Demo Login (Select Role):</div>
      <div class="demo-account-pills">
        <button type="button" class="demo-pill" onclick="selectDemoRole('Super / Project Admin', 'yogesh.k@wisetrack.com')">👑 Project Admin</button>
        <button type="button" class="demo-pill" onclick="selectDemoRole('Project Manager', 'rahul.s@wisetrack.com')">👷 Project Manager</button>
        <button type="button" class="demo-pill" onclick="selectDemoRole('Site Engineer', 'amit.v@wisetrack.com')">🔨 Site Engineer</button>
        <button type="button" class="demo-pill" onclick="selectDemoRole('Finance / Cost Controller', 'neeraj.s@wisetrack.com')">💰 Finance Officer</button>
        <button type="button" class="demo-pill" onclick="selectDemoRole('Quality & Safety Auditor', 'arvind.s@wisetrack.com')">🔍 Auditor</button>
        <button type="button" class="demo-pill" onclick="selectDemoRole('Resort GM / Executive', 'gm.goa@wisetrack.com')">🏨 Resort GM</button>
      </div>
    </div>

    <form onsubmit="handleLogin(event)">
      <div class="field" style="margin-bottom:14px;">
        <label>Corporate Email / Username</label>
        <input type="email" id="loginEmail" value="yogesh.k@wisetrack.com" required placeholder="name@wisetrack.com">
      </div>

      <div class="field" style="margin-bottom:14px;">
        <label>Password</label>
        <input type="password" id="loginPass" value="wisetrack2026" required placeholder="••••••••">
      </div>

      <div class="field" style="margin-bottom:20px;">
        <label>Select Role Context</label>
        <select id="loginRole">
          <option value="Super / Project Admin">Super / Project Admin (Global)</option>
          <option value="Project Manager">Project Manager (WBS & Tasks)</option>
          <option value="Site Engineer">Site Engineer (DSR & Progress)</option>
          <option value="Finance / Cost Controller">Finance / Cost Controller</option>
          <option value="Quality & Safety Auditor">Quality & Safety Auditor</option>
          <option value="Resort GM / Executive">Resort GM / Executive</option>
        </select>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-size:12px;">
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" checked> Remember session
        </label>
        <a href="#" onclick="showToast('Password reset link sent to registered email', 'info'); return false;" style="color:#2563eb; text-decoration:none; font-weight:600;">Forgot Password?</a>
      </div>

      <button type="submit" class="btn primary lg" style="width:100%;">
        Sign In to Workspace ➔
      </button>
    </form>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
function selectDemoRole(role, email) {
  document.getElementById('loginRole').value = role;
  document.getElementById('loginEmail').value = email;
  showToast('Demo role selected: ' + role, 'info');
}

function handleLogin(e) {
  e.preventDefault();
  const role = document.getElementById('loginRole').value;
  const email = document.getElementById('loginEmail').value;
  localStorage.setItem('WISETRACK_ROLE', role);
  showToast('Welcome back! Logging into Wisetrack...', 'success');
  setTimeout(() => {
    window.location.href = 'dashboard.php';
  }, 600);
}
</script>
<script src="assets/app.js"></script>
</body>
</html>
