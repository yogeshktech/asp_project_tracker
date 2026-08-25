<?php
/**
 * ============================================================================
 * WISETRACK ENGINEERING PROJECT CONTROL & RESORT SUITE — MAIN MASTER ROUTER
 * ============================================================================
 * Single Main File Architecture:
 * - includes/header.php (Head, Topbar, Search, Role & Resort Switchers)
 * - includes/sidebar.php (Unified Left Sidebar Navigation)
 * - pages/{page}.php (Pure Dynamic Middle Content)
 * - includes/footer.php (Global Footer, Universal Modals, Toast Engine)
 */

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/data.php';

// Determine current requested page
if (!isset($page)) {
    $page = isset($_GET['page']) ? trim($_GET['page']) : 'dashboard';
}

// Registry of supported pages
$allowed_pages = [
    'dashboard'      => ['title' => 'Portfolio Dashboard', 'section' => 'Overview'],
    'resorts'        => ['title' => 'Resorts & Properties Master', 'section' => 'Overview'],
    'workflow'       => ['title' => 'Step-by-Step Lifecycle Guide', 'section' => 'Overview'],
    'projects'       => ['title' => 'N-Level Projects Hierarchy', 'section' => 'Hierarchy & Projects'],
    'project-detail' => ['title' => 'Project Workspace', 'section' => 'Hierarchy & Projects'],
    'planning'       => ['title' => 'Planning & WBS Structure', 'section' => 'Execution & Site'],
    'milestones'     => ['title' => 'Gateway Milestones & Approvals', 'section' => 'Execution & Site'],
    'daily-report'   => ['title' => 'Daily Site Reports (DSR)', 'section' => 'Execution & Site'],
    'issues'         => ['title' => 'Issues & Incidents Tracker', 'section' => 'Execution & Site'],
    'boq'            => ['title' => 'Bill of Quantities (BOQ)', 'section' => 'Commercial & Cost'],
    'budget'         => ['title' => 'Budget & Cost Centers (80% RAG)', 'section' => 'Commercial & Cost'],
    'items'          => ['title' => 'Item Master & Rate Catalog', 'section' => 'Commercial & Cost'],
    'inventory'      => ['title' => 'Leftover Inventory & Closure Gate', 'section' => 'Commercial & Cost'],
    'users'          => ['title' => 'Users & Permissions Management', 'section' => 'Governance & Admin'],
    'permissions'    => ['title' => 'Granular Permissions Matrix', 'section' => 'Governance & Admin'],
    'notifications'  => ['title' => 'Alerts & Escalation Rules', 'section' => 'Governance & Admin'],
    'audit-logs'     => ['title' => 'System Audit Trail Logs', 'section' => 'Governance & Admin'],
    'reports'        => ['title' => 'Executive Reports & Dossiers', 'section' => 'Governance & Admin'],
    'settings'       => ['title' => 'System & Security Settings', 'section' => 'Governance & Admin']
];

if (!array_key_exists($page, $allowed_pages)) {
    $page = 'dashboard';
}

$currentPage = $page;
$pageTitle = $allowed_pages[$page]['title'];

// 1. Unified Topbar & Head Include
include __DIR__ . '/includes/header.php';

// 2. Dynamic Middle Content Include (Only this part changes per page)
$contentFile = __DIR__ . '/pages/' . $page . '.php';
if (file_exists($contentFile)) {
    include $contentFile;
} else {
    // Fallback if file not found
    include __DIR__ . '/pages/dashboard.php';
}

// 3. Unified Modals & Footer Include
include __DIR__ . '/includes/footer.php';
?>
