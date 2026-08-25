<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/data.php';

$currentPage = basename($_SERVER['PHP_SELF'], ".php");
if (!isset($pageTitle)) {
    $pageTitle = "Enterprise Control";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo htmlspecialchars($pageTitle); ?> — <?php echo APP_NAME; ?></title>
  <link rel="stylesheet" href="assets/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer">
  <script src="assets/data.js"></script>
</head>
<body>
<div class="app">
  <?php include __DIR__ . '/sidebar.php'; ?>
  
  <div class="main">
    <header class="topbar">
      <div class="topbar-left">
        <div class="resort-selector-wrap">
          <label>Property:</label>
          <select class="resort-select" id="globalResortSelector" onchange="setSelectedResortId(this.value)">
            <?php foreach ($resorts as $resort): ?>
              <option value="<?php echo $resort['id']; ?>"><?php echo htmlspecialchars($resort['name']); ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="search-box">
          <span><i class="fa-solid fa-magnifying-glass"></i></span>
          <input type="text" placeholder="Search resorts, projects, tasks, BOQ items, items..." onkeyup="if(event.key==='Enter') showToast('Searching for: ' + this.value, 'info')">
        </div>
      </div>

      <div class="topbar-right">
        <!-- Quick Action Trigger -->
        <div class="btn-group">
          <button class="btn sm primary" onclick="openCreateProjectModal()"><i class="fa-solid fa-plus"></i> New Project</button>
          <button class="btn sm" onclick="openCreateResortModal()"><i class="fa-solid fa-plus"></i> New Resort</button>
        </div>

        <!-- Theme Switcher -->
        <div class="theme-switcher" title="Switch Theme Palette">
          <i class="fa-solid fa-palette"></i>
          <select id="globalThemeSelector" onchange="setGlobalTheme(this.value)">
            <option value="blue">🔵 Blue</option>
            <option value="red">🔴 Red</option>
            <option value="green">🟢 Green</option>
            <option value="yellow">🟡 Yellow</option>
            <option value="white">⚪ White</option>
            <option value="dark">⚫ Dark</option>
            <option value="light">🟣 Light</option>
          </select>
        </div>

        <!-- Role Switcher for Demo -->
        <div class="role-switcher-dropdown" title="Simulate different role permissions">
          <span><i class="fa-solid fa-user"></i> Role:</span>
          <select id="globalRoleSelector" onchange="onRoleChange(this.value)">
            <option value="Super / Project Admin">Project Admin</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Site Engineer">Site Engineer</option>
            <option value="Finance / Cost Controller">Finance Officer</option>
            <option value="Quality & Safety Auditor">Auditor</option>
            <option value="Resort GM / Executive">Resort GM</option>
          </select>
        </div>

        <!-- Notification Bell -->
        <a href="notifications.php" class="header-action-btn" title="View Notifications & Escalations">
          <span><i class="fa-solid fa-bell"></i></span>
          <span class="notification-count">4</span>
        </a>

        <!-- Logout / User -->
        <a href="login.php" class="header-action-btn" title="Sign Out / Change User" style="color:#ef4444;">
          <span><i class="fa-solid fa-right-from-bracket"></i></span>
        </a>
      </div>
    </header>
