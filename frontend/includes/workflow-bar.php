<?php
// Step-by-Step Project Flow Bar
$stepsList = [
  ['num' => 1, 'name' => '1. Resort Setup', 'url' => 'resorts.php', 'page' => 'resorts'],
  ['num' => 2, 'name' => '2. N-Level Projects', 'url' => 'projects.php', 'page' => 'projects'],
  ['num' => 3, 'name' => '3. Milestones', 'url' => 'milestones.php', 'page' => 'milestones'],
  ['num' => 4, 'name' => '4. BOQ & Rates', 'url' => 'boq.php', 'page' => 'boq'],
  ['num' => 5, 'name' => '5. Budget & Cost', 'url' => 'budget.php', 'page' => 'budget'],
  ['num' => 6, 'name' => '6. Daily Site Logs', 'url' => 'daily-report.php', 'page' => 'daily-report'],
  ['num' => 7, 'name' => '7. Handover & Closure', 'url' => 'inventory.php', 'page' => 'inventory'],
  ['num' => 8, 'name' => '8. Governance & Roles', 'url' => 'users.php', 'page' => 'users']
];
$currentPage = basename($_SERVER['PHP_SELF'], ".php");
?>
<div class="workflow-guide-banner">
  <div style="font-weight:700;letter-spacing:0.5px;text-transform:uppercase;font-size:11px;display:flex;align-items:center;gap:6px;">
    <span>⚡</span> <span>Project Lifecycle:</span>
  </div>
  
  <div class="step-indicator-bar">
    <?php foreach ($stepsList as $index => $step): ?>
      <a href="<?php echo $step['url']; ?>" class="step-item <?php echo ($currentPage === $step['page']) ? 'active' : ''; ?>">
        <div class="step-num"><?php echo $step['num']; ?></div>
        <span><?php echo $step['name']; ?></span>
      </a>
      <?php if ($index < count($stepsList) - 1): ?>
        <span class="step-arrow">➔</span>
      <?php endif; ?>
    <?php endforeach; ?>
  </div>

  <a href="workflow.php" style="color:#93c5fd;text-decoration:none;font-weight:600;font-size:11px;white-space:nowrap;">
    Full Guide ↗
  </a>
</div>
