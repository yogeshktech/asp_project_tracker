// WISETRACK STATIC ENTERPRISE DATASET
const WISETRACK_DATA = {
  currentUser: {
    name: "Yogesh Kumar",
    email: "yogesh.k@wisetrack.com",
    role: "Project Admin",
    avatar: "YK",
    department: "Engineering PMO"
  },
  
  roles: [
    { id: "admin", name: "Super / Project Admin", badge: "Admin", desc: "Full administrative rights, project creation, role management and global approvals." },
    { id: "pm", name: "Project Manager", badge: "PM", desc: "Manage WBS, tasks, milestones, daily logs, issues and baseline updates." },
    { id: "site_engg", name: "Site Engineer", badge: "Site Engg", desc: "Daily site progress entry, issue reporting, site photo evidence (financials hidden)." },
    { id: "finance", name: "Finance / Cost Controller", badge: "Finance", desc: "Budget allocation, cost center variance, BOQ rate approvals, cashflow." },
    { id: "auditor", name: "Quality & Safety Auditor", badge: "Auditor", desc: "Gateway milestone signoffs, audit trail logs, handover compliance." },
    { id: "client_gm", name: "Resort GM / Executive", badge: "Executive", desc: "High-level portfolio health, milestone dashboards and executive reporting." }
  ],

  resorts: [
    {
      id: "RES-GOA-01",
      name: "Grand Oasis Resort & Spa",
      location: "Candolim Beach, Goa",
      code: "GOA-OASIS",
      gm: "Vikramaditya Roy",
      budget: "₹48.50 Cr",
      spent: "₹34.20 Cr",
      progress: 76,
      status: "On Track",
      statusBadge: "green",
      totalProjects: 6,
      targetDate: "30 Dec 2026",
      desc: "5-Star beachfront luxury luxury resort development featuring 180 keys, infinity pool, luxury villas, and central MEP plant."
    },
    {
      id: "RES-JAI-02",
      name: "Royal Heritage Palace & Villas",
      location: "Amer Road, Jaipur",
      code: "JAI-HERIT",
      gm: "Meenakshi Rathore",
      budget: "₹36.20 Cr",
      spent: "₹21.40 Cr",
      progress: 58,
      status: "At Risk",
      statusBadge: "amber",
      totalProjects: 4,
      targetDate: "15 Mar 2027",
      desc: "Heritage palace renovation and luxury tented villa expansion preserving Rajput architecture with modern MEP automation."
    },
    {
      id: "RES-MAN-03",
      name: "Pine Valley Mountain Resort",
      location: "Solang Valley, Manali",
      code: "MAN-PINE",
      gm: "Karan Grover",
      budget: "₹24.80 Cr",
      spent: "₹20.30 Cr",
      progress: 84,
      status: "On Track",
      statusBadge: "green",
      totalProjects: 3,
      targetDate: "15 Nov 2026",
      desc: "High-altitude eco-chalets, geothermal HVAC heating network and glass-domed observatory restaurant."
    },
    {
      id: "RES-KOV-04",
      name: "Azure Sands Beach Retreat",
      location: "Lighthouse Beach, Kovalam",
      code: "KOV-AZURE",
      gm: "Sangeeta Nair",
      budget: "₹19.40 Cr",
      spent: "₹9.80 Cr",
      progress: 42,
      status: "Delayed",
      statusBadge: "red",
      totalProjects: 3,
      targetDate: "28 Feb 2027",
      desc: "Ayurvedic wellness sanctuary featuring cliffside infinity pool and sustainable timber suites."
    }
  ],

  // N-Level Hierarchy of Projects
  projects: [
    // Grand Oasis Resort Goa (RES-GOA-01)
    {
      id: "PRJ-01",
      resortId: "RES-GOA-01",
      parentId: null, // Level 1 Root Project
      level: 1,
      name: "Main Resort Building Phase-1 (Civil & Structure)",
      code: "GR-CIV-001",
      discipline: "Civil Structure",
      owner: "Amit Verma",
      budget: "₹16.50 Cr",
      spent: "₹13.20 Cr",
      progress: 80,
      health: "On Track",
      healthBadge: "green",
      startDate: "10 Jan 2026",
      endDate: "30 Nov 2026",
      childrenCount: 2,
      desc: "Primary hotel block superstructure, RCC frame, roof waterproofing and core masonry."
    },
    {
      id: "PRJ-01-SUB1",
      resortId: "RES-GOA-01",
      parentId: "PRJ-01", // Level 2 Sub Project
      level: 2,
      name: "Block A Guest Wing Superstructure",
      code: "GR-CIV-001-A",
      discipline: "Civil Structure",
      owner: "Amit Verma",
      budget: "₹9.20 Cr",
      spent: "₹7.80 Cr",
      progress: 85,
      health: "On Track",
      healthBadge: "green",
      startDate: "10 Jan 2026",
      endDate: "15 Oct 2026",
      childrenCount: 2,
      desc: "G+4 floor RCC slab casting, brickwork partition and waterproofing."
    },
    {
      id: "PRJ-01-SUB1-T1",
      resortId: "RES-GOA-01",
      parentId: "PRJ-01-SUB1", // Level 3 Work Package / Sub-sub Project
      level: 3,
      name: "Floor 1-4 RCC Slab Casting & Columns",
      code: "GR-CIV-001-A-WP1",
      discipline: "Civil Structure",
      owner: "Site Team",
      budget: "₹5.40 Cr",
      spent: "₹5.40 Cr",
      progress: 100,
      health: "Completed",
      healthBadge: "green",
      startDate: "10 Jan 2026",
      endDate: "30 Jun 2026",
      childrenCount: 0,
      desc: "Completed casting for all four floors with M30 concrete grade."
    },
    {
      id: "PRJ-01-SUB1-T2",
      resortId: "RES-GOA-01",
      parentId: "PRJ-01-SUB1", // Level 3 Work Package
      level: 3,
      name: "External Masonry & Plastering",
      code: "GR-CIV-001-A-WP2",
      discipline: "Civil Structure",
      owner: "Site Team",
      budget: "₹3.80 Cr",
      spent: "₹2.40 Cr",
      progress: 70,
      health: "On Track",
      healthBadge: "green",
      startDate: "01 Jul 2026",
      endDate: "15 Oct 2026",
      childrenCount: 0,
      desc: "AAC block masonry and double coat external sand face plaster."
    },
    {
      id: "PRJ-01-SUB2",
      resortId: "RES-GOA-01",
      parentId: "PRJ-01", // Level 2 Sub Project
      level: 2,
      name: "Block B Luxury Pool Villas Civil Shell",
      code: "GR-CIV-001-B",
      discipline: "Civil Structure",
      owner: "Ravi Shankar",
      budget: "₹7.30 Cr",
      spent: "₹5.40 Cr",
      progress: 74,
      health: "On Track",
      healthBadge: "green",
      startDate: "15 Feb 2026",
      endDate: "30 Nov 2026",
      childrenCount: 0,
      desc: "12 individual duplex villa shells with private plunge pool basins."
    },
    {
      id: "PRJ-02",
      resortId: "RES-GOA-01",
      parentId: null, // Level 1 Root Project
      level: 1,
      name: "Grand Resort MEP & Automation Infrastructure",
      code: "GR-MEP-001",
      discipline: "MEP & Electrical",
      owner: "Rahul Sharma",
      budget: "₹12.40 Cr",
      spent: "₹8.90 Cr",
      progress: 72,
      health: "On Track",
      healthBadge: "green",
      startDate: "01 Mar 2026",
      endDate: "24 Dec 2026",
      childrenCount: 3,
      desc: "Central electrical distribution, 11kV substation, HVAC chiller plant, plumbing and fire safety network."
    },
    {
      id: "PRJ-02-SUB1",
      resortId: "RES-GOA-01",
      parentId: "PRJ-02", // Level 2 Sub Project
      level: 2,
      name: "Electrical Distribution & 11kV Substation",
      code: "GR-MEP-001-ELE",
      discipline: "Electrical",
      owner: "Rahul Sharma",
      budget: "₹5.10 Cr",
      spent: "₹4.30 Cr",
      progress: 84,
      health: "On Track",
      healthBadge: "green",
      startDate: "01 Mar 2026",
      endDate: "15 Oct 2026",
      childrenCount: 2,
      desc: "HT transformers, DG synchronization panels, busduct risers and floor distribution."
    },
    {
      id: "PRJ-02-SUB1-T1",
      resortId: "RES-GOA-01",
      parentId: "PRJ-02-SUB1", // Level 3 Work Package
      level: 3,
      name: "11kV Substation & 2x 1500 kVA Transformer Setup",
      code: "GR-MEP-001-ELE-T1",
      discipline: "Electrical",
      owner: "Rahul Sharma",
      budget: "₹2.90 Cr",
      spent: "₹2.80 Cr",
      progress: 95,
      health: "Completed",
      healthBadge: "green",
      startDate: "01 Mar 2026",
      endDate: "15 Aug 2026",
      childrenCount: 0,
      desc: "Substation building ready, transformer energized for dry testing."
    },
    {
      id: "PRJ-02-SUB1-T2",
      resortId: "RES-GOA-01",
      parentId: "PRJ-02-SUB1", // Level 3 Work Package
      level: 3,
      name: "Main Cable Tray Laying & LT Cabling",
      code: "GR-MEP-001-ELE-T2",
      discipline: "Electrical",
      owner: "Rahul Sharma",
      budget: "₹2.20 Cr",
      spent: "₹1.50 Cr",
      progress: 72,
      health: "On Track",
      healthBadge: "green",
      startDate: "15 Jun 2026",
      endDate: "15 Oct 2026",
      childrenCount: 0,
      desc: "4C x 16 sqmm & 4C x 240 sqmm Polycab XLPE cable laying across main duct shafts."
    },
    {
      id: "PRJ-02-SUB2",
      resortId: "RES-GOA-01",
      parentId: "PRJ-02", // Level 2 Sub Project
      level: 2,
      name: "HVAC Central Chiller & VRV Air Conditioning",
      code: "GR-MEP-001-HVAC",
      discipline: "HVAC",
      owner: "Manoj Joshi",
      budget: "₹4.80 Cr",
      spent: "₹3.60 Cr",
      progress: 65,
      health: "At Risk",
      healthBadge: "amber",
      startDate: "15 Apr 2026",
      endDate: "15 Nov 2026",
      childrenCount: 0,
      desc: "Water-cooled chillers, cooling towers, primary/secondary pumps and VRV indoor units."
    },
    {
      id: "PRJ-02-SUB3",
      resortId: "RES-GOA-01",
      parentId: "PRJ-02", // Level 2 Sub Project
      level: 2,
      name: "Plumbing, STP & Fire Fighting Network",
      code: "GR-MEP-001-PLM",
      discipline: "Plumbing & Fire",
      owner: "Sunil Patil",
      budget: "₹2.50 Cr",
      spent: "₹1.00 Cr",
      progress: 52,
      health: "On Track",
      healthBadge: "green",
      startDate: "01 May 2026",
      endDate: "20 Dec 2026",
      childrenCount: 0,
      desc: "Hydropneumatic pressure booster pumps, 100 KLD MBBR STP and sprinkler grid."
    },
    {
      id: "PRJ-03",
      resortId: "RES-GOA-01",
      parentId: null, // Level 1 Root Project
      level: 1,
      name: "Interior Fitout & Luxury FF&E",
      code: "GR-INT-001",
      discipline: "Interior Design",
      owner: "Priya Mehta",
      budget: "₹11.20 Cr",
      spent: "₹6.90 Cr",
      progress: 60,
      health: "On Track",
      healthBadge: "green",
      startDate: "01 Jul 2026",
      endDate: "20 Dec 2026",
      childrenCount: 0,
      desc: "Lobby bespoke marble cladding, false ceilings, acoustic woodwork and custom designer furniture."
    },

    // Royal Heritage Palace Jaipur (RES-JAI-02)
    {
      id: "PRJ-04",
      resortId: "RES-JAI-02",
      parentId: null, // Level 1
      level: 1,
      name: "Heritage Haveli Restoration & Structural Retrofit",
      code: "JAI-HER-001",
      discipline: "Conservation & Civil",
      owner: "Devendra Singh",
      budget: "₹18.40 Cr",
      spent: "₹11.20 Cr",
      progress: 62,
      health: "At Risk",
      healthBadge: "amber",
      startDate: "15 Jan 2026",
      endDate: "15 Jan 2027",
      childrenCount: 1,
      desc: "Lime mortar restoration, stone jali carving, structural stabilization and antique fresco preservation."
    },
    {
      id: "PRJ-04-SUB1",
      resortId: "RES-JAI-02",
      parentId: "PRJ-04", // Level 2
      level: 2,
      name: "Courtyard & Zenana Wing Stone Facade",
      code: "JAI-HER-001-FAC",
      discipline: "Conservation",
      owner: "Devendra Singh",
      budget: "₹8.00 Cr",
      spent: "₹5.10 Cr",
      progress: 55,
      health: "At Risk",
      healthBadge: "amber",
      startDate: "01 Mar 2026",
      endDate: "15 Dec 2026",
      childrenCount: 0,
      desc: "Handcrafted Dholpur pink sandstone archways and lime plastering."
    },

    // Pine Valley Resort Manali (RES-MAN-03)
    {
      id: "PRJ-05",
      resortId: "RES-MAN-03",
      parentId: null,
      level: 1,
      name: "Geothermal Heating & Winterization HVAC",
      code: "MAN-GEO-001",
      discipline: "HVAC & Energy",
      owner: "Arjun Rao",
      budget: "₹9.80 Cr",
      spent: "₹8.20 Cr",
      progress: 88,
      health: "On Track",
      healthBadge: "green",
      startDate: "01 Feb 2026",
      endDate: "30 Oct 2026",
      childrenCount: 0,
      desc: "Ground-source heat pump boreholes, heated floor hydronics, and snow-melt roof cables."
    }
  ],

  // Users & Permissions Matrix
  users: [
    {
      id: "USR-001",
      name: "Yogesh Kumar",
      email: "yogesh.k@wisetrack.com",
      role: "Super / Project Admin",
      roleId: "admin",
      assignedResorts: "All Resorts (4)",
      assignedProjects: "All Projects (24)",
      fieldRestrictions: "None (Full Access)",
      status: "Active",
      statusBadge: "green",
      avatar: "YK"
    },
    {
      id: "USR-002",
      name: "Rahul Sharma",
      email: "rahul.s@wisetrack.com",
      role: "Project Manager",
      roleId: "pm",
      assignedResorts: "Grand Oasis Resort Goa",
      assignedProjects: "GR-MEP-001, GR-CIV-001",
      fieldRestrictions: "None",
      status: "Active",
      statusBadge: "green",
      avatar: "RS"
    },
    {
      id: "USR-003",
      name: "Amit Verma",
      email: "amit.v@wisetrack.com",
      role: "Site Engineer",
      roleId: "site_engg",
      assignedResorts: "Grand Oasis Resort Goa",
      assignedProjects: "GR-CIV-001-A, GR-CIV-001-B",
      fieldRestrictions: "Financials & Rates Hidden",
      status: "Active",
      statusBadge: "green",
      avatar: "AV"
    },
    {
      id: "USR-004",
      name: "Neeraj Singh",
      email: "neeraj.s@wisetrack.com",
      role: "Finance / Cost Controller",
      roleId: "finance",
      assignedResorts: "All Resorts (4)",
      assignedProjects: "Commercial & Budget Modules",
      fieldRestrictions: "Commercial / Costing Only",
      status: "Active",
      statusBadge: "green",
      avatar: "NS"
    },
    {
      id: "USR-005",
      name: "Priya Mehta",
      email: "priya.m@wisetrack.com",
      role: "Project Manager",
      roleId: "pm",
      assignedResorts: "Grand Oasis Resort, Royal Heritage",
      assignedProjects: "GR-INT-001, JAI-HER-001",
      fieldRestrictions: "None",
      status: "Active",
      statusBadge: "green",
      avatar: "PM"
    },
    {
      id: "USR-006",
      name: "Dr. Arvind Swaminathan",
      email: "arvind.s@wisetrack.com",
      role: "Quality & Safety Auditor",
      roleId: "auditor",
      assignedResorts: "All Resorts (4)",
      assignedProjects: "Audit & Compliance Gates",
      fieldRestrictions: "Read-only + Milestone Signoff",
      status: "Active",
      statusBadge: "green",
      avatar: "AS"
    },
    {
      id: "USR-007",
      name: "Vikramaditya Roy",
      email: "gm.goa@wisetrack.com",
      role: "Resort GM / Executive",
      roleId: "client_gm",
      assignedResorts: "Grand Oasis Resort Goa",
      assignedProjects: "Executive Dashboard Only",
      fieldRestrictions: "High-level View Only",
      status: "Active",
      statusBadge: "green",
      avatar: "VR"
    }
  ],

  // Granular Permissions Matrix by Module
  permissionsMatrix: [
    { module: "Resorts & Properties", admin: [1,1,1,1,1], pm: [1,0,1,0,0], site_engg: [1,0,0,0,0], finance: [1,0,0,0,1], auditor: [1,0,0,0,1], client_gm: [1,0,0,0,1] },
    { module: "Projects (N-Level WBS)", admin: [1,1,1,1,1], pm: [1,1,1,1,1], site_engg: [1,0,1,0,0], finance: [1,0,0,0,1], auditor: [1,0,0,0,1], client_gm: [1,0,0,0,1] },
    { module: "Milestones & Gateways", admin: [1,1,1,1,1], pm: [1,1,1,0,1], site_engg: [1,0,0,0,0], finance: [1,0,0,0,0], auditor: [1,0,1,0,1], client_gm: [1,0,0,0,0] },
    { module: "BOQ & Item Master", admin: [1,1,1,1,1], pm: [1,1,1,0,1], site_engg: [1,0,0,0,0], finance: [1,1,1,1,1], auditor: [1,0,0,0,1], client_gm: [1,0,0,0,0] },
    { module: "Budget, Costs & Variance", admin: [1,1,1,1,1], pm: [1,1,1,0,1], site_engg: [0,0,0,0,0], finance: [1,1,1,1,1], auditor: [1,0,0,0,1], client_gm: [1,0,0,0,1] },
    { module: "Daily Site Reports (DSR)", admin: [1,1,1,1,1], pm: [1,1,1,0,1], site_engg: [1,1,1,0,1], finance: [1,0,0,0,1], auditor: [1,0,0,0,1], client_gm: [1,0,0,0,0] },
    { module: "Issues & Escalation", admin: [1,1,1,1,1], pm: [1,1,1,1,1], site_engg: [1,1,1,0,0], finance: [1,0,1,0,0], auditor: [1,1,1,1,1], client_gm: [1,0,0,0,0] },
    { module: "Inventory & Closure Gate", admin: [1,1,1,1,1], pm: [1,1,1,0,1], site_engg: [1,1,1,0,0], finance: [1,1,1,1,1], auditor: [1,0,1,0,1], client_gm: [1,0,0,0,1] },
    { module: "Audit Logs & Governance", admin: [1,0,0,0,1], pm: [0,0,0,0,0], site_engg: [0,0,0,0,0], finance: [0,0,0,0,0], auditor: [1,0,0,0,1], client_gm: [0,0,0,0,0] },
    { module: "System Settings", admin: [1,1,1,1,1], pm: [0,0,0,0,0], site_engg: [0,0,0,0,0], finance: [0,0,0,0,0], auditor: [0,0,0,0,0], client_gm: [0,0,0,0,0] }
  ],

  // Step by Step Project LifeCycle Stages
  steps: [
    { num: 1, name: "Resort Setup", url: "resorts.html", desc: "Create & configure master resort properties" },
    { num: 2, name: "N-Level Projects", url: "projects.html", desc: "Build parent projects, sub-projects & work packages" },
    { num: 3, name: "Milestones", url: "milestones.html", desc: "Set critical gateway milestones and dates" },
    { num: 4, name: "BOQ & Rates", url: "boq.html", desc: "Import Excel BOQ, rates & link Item Master" },
    { num: 5, name: "Budget Baselines", url: "budget.html", desc: "Allocate cost centers & set 80% RAG limits" },
    { num: 6, name: "Site Execution", url: "daily-report.html", desc: "Record daily site logs, progress % & issues" },
    { num: 7, name: "Inventory & Closure", url: "inventory.html", desc: "Reconcile leftover material & signed handover" },
    { num: 8, name: "Governance & Roles", url: "users.html", desc: "Manage granular roles, permissions & audit trail" }
  ],

  // BOQ Items
  boqItems: [
    { id: "BOQ-001", code: "EL-CBL-001", desc: "XLPE Copper Cable 4C x 16 sqmm 1.1kV Grade", uom: "Mtr", baselineQty: 5000, revisedQty: 5200, unitRate: 420, baselineTotal: 2100000, revisedTotal: 2184000, brand: "Polycab", status: "Approved", statusBadge: "green" },
    { id: "BOQ-002", code: "EL-CBL-002", desc: "Armoured Copper Cable 4C x 240 sqmm Substation Main", uom: "Mtr", baselineQty: 850, revisedQty: 850, unitRate: 3450, baselineTotal: 2932500, revisedTotal: 2932500, brand: "Havells", status: "Approved", statusBadge: "green" },
    { id: "BOQ-003", code: "EL-SW-014", desc: "Modular 16A Switch & Socket with Polycarbonate Plate", uom: "Nos", baselineQty: 600, revisedQty: 650, unitRate: 485, baselineTotal: 291000, revisedTotal: 315250, brand: "Schneider", status: "Approved", statusBadge: "green" },
    { id: "BOQ-004", code: "EL-PNL-025", desc: "Main LT Distribution Panel 250A with Microprocessor Trip", uom: "Nos", baselineQty: 12, revisedQty: 14, unitRate: 125000, baselineTotal: 1500000, revisedTotal: 1750000, brand: "ABB", status: "Revised", statusBadge: "amber" },
    { id: "BOQ-005", code: "HVAC-CHL-01", desc: "Water Cooled Screw Chiller 250 TR High Efficiency", uom: "Sets", baselineQty: 2, revisedQty: 2, unitRate: 3800000, baselineTotal: 7600000, revisedTotal: 7600000, brand: "Daikin", status: "Approved", statusBadge: "green" },
    { id: "BOQ-006", code: "CIV-RMC-M30", desc: "Ready Mix Concrete M30 Grade with Waterproof Additive", uom: "Cu.m", baselineQty: 2400, revisedQty: 2550, unitRate: 5800, baselineTotal: 13920000, revisedTotal: 14790000, brand: "UltraTech", status: "Approved", statusBadge: "green" }
  ],

  // Cost Centers / Budget (with 80% threshold calculation)
  costCenters: [
    { name: "MEP — Electrical Distribution", allocated: 20000000, actual: 16800000, forecast: 20400000, util: 84, status: "Critical (>80%)", statusBadge: "red", variance: "+₹4.0L Over" },
    { name: "MEP — HVAC & Chiller Plant", allocated: 32000000, actual: 24320000, forecast: 31200000, util: 76, status: "Watch (76%)", statusBadge: "amber", variance: "-₹8.0L Under" },
    { name: "Civil Structure & Core", allocated: 92000000, actual: 78200000, forecast: 91500000, util: 85, status: "Critical (>80%)", statusBadge: "red", variance: "-₹5.0L Under" },
    { name: "Plumbing, STP & Fire Safety", allocated: 18000000, actual: 9720000, forecast: 17100000, util: 54, status: "Healthy (54%)", statusBadge: "green", variance: "-₹9.0L Under" },
    { name: "Interior Fitout & Finishes", allocated: 45000000, actual: 27900000, forecast: 44200000, util: 62, status: "Healthy (62%)", statusBadge: "green", variance: "-₹8.0L Under" }
  ],

  // Milestones
  milestones: [
    { id: "M-01", name: "Project Kickoff & Statutory Clearances", date: "15 Jan 2026", status: "Completed", statusBadge: "green", owner: "Project PMO", progress: 100 },
    { id: "M-02", name: "BOQ Baseline & Vendor Procurement Finalized", date: "28 Feb 2026", status: "Completed", statusBadge: "green", owner: "Rahul Sharma", progress: 100 },
    { id: "M-03", name: "Substation Equipment Delivery & Site Readiness", date: "15 Jul 2026", status: "Completed", statusBadge: "green", owner: "Amit Verma", progress: 100 },
    { id: "M-04", name: "Cable Tray & Main Distribution Cabling 75%", date: "24 Aug 2026", status: "In Progress", statusBadge: "blue", owner: "Rahul Sharma", progress: 72 },
    { id: "M-05", name: "Chiller Plant Dry Commissioning", date: "15 Oct 2026", status: "Planned", statusBadge: "gray", owner: "Manoj Joshi", progress: 0 },
    { id: "M-06", name: "Final Handover & Project Closure Gate", date: "24 Dec 2026", status: "Planned", statusBadge: "gray", owner: "Project PMO", progress: 0 }
  ],

  // Daily Site Reports
  dailyReports: [
    { id: "DSR-104", date: "18 Aug 2026", subtask: "Block A Main Riser Cabling", owner: "Rahul Sharma", manpower: 14, yesterday: "64%", today: "72%", status: "In Progress", statusBadge: "blue", remark: "Completed 350m Polycab 4Cx16 cable pulling in shaft 2. Site photos uploaded." },
    { id: "DSR-103", date: "18 Aug 2026", subtask: "Substation LT Panel Installation", owner: "Site Team", manpower: 8, yesterday: "35%", today: "45%", status: "In Progress", statusBadge: "blue", remark: "2 ABB distribution panels positioned and grounded." },
    { id: "DSR-102", date: "18 Aug 2026", subtask: "HVAC Chilled Water Piping", owner: "Amit Verma", manpower: 6, yesterday: "55%", today: "55%", status: "No Progress (Delayed)", statusBadge: "amber", remark: "Valve flanges delayed at port customs. Followed up with supplier." },
    { id: "DSR-101", date: "17 Aug 2026", subtask: "Block B Plunge Pool Waterproofing", owner: "Ravi Shankar", manpower: 10, yesterday: "80%", today: "100%", status: "Completed", statusBadge: "green", remark: "Puddle flange sealing and 48hr flood test successful." }
  ],

  // Issues & Escalations
  issues: [
    { id: "ISS-1024", title: "HVAC valve flanges consignment delayed at port", block: "Block B Central Plant", resort: "Grand Oasis Resort Goa", project: "GR-MEP-001-HVAC", reportedBy: "Site Engineer", date: "18 Aug 2026", impact: "3 days potential delay", priority: "High", priorityBadge: "red", status: "Escalated to PMO", statusBadge: "amber" },
    { id: "ISS-1023", title: "Electrical single line drawing revision approval pending", block: "Block A Guest Wing", resort: "Grand Oasis Resort Goa", project: "GR-MEP-001-ELE", reportedBy: "Rahul Sharma", date: "17 Aug 2026", impact: "Cabling team standby", priority: "High", priorityBadge: "red", status: "Under Review", statusBadge: "blue" },
    { id: "ISS-1022", title: "Minor sand quality variance in batch C4", block: "Civil Batching", resort: "Royal Heritage Palace", project: "JAI-HER-001", reportedBy: "Amit Verma", date: "16 Aug 2026", impact: "Low - Batch quarantined", priority: "Medium", priorityBadge: "amber", status: "Resolved", statusBadge: "green" }
  ],

  // Item Master Catalog
  items: [
    { code: "EL-CBL-001", desc: "XLPE Copper Cable 4C x 16 sqmm", uom: "Meter", rate: 420, brand: "Polycab / Havells", category: "Electrical Cabling", effectiveDate: "01 Aug 2026", spec: "IS:7098 (Part 1) armoured copper conductor" },
    { code: "EL-SW-014", desc: "Modular Switch 16A 1-Way", uom: "Nos", rate: 485, brand: "Schneider Electric / Legrand", category: "Switchgear", effectiveDate: "01 Aug 2026", spec: "Antibacterial polycarbonate face plate" },
    { code: "EL-PNL-025", desc: "Distribution Panel 250A 415V IP54", uom: "Nos", rate: 125000, brand: "ABB / Siemens", category: "Panels & Switchboards", effectiveDate: "15 Jul 2026", spec: "Form 4b separation with MCCB incoming" },
    { code: "HVAC-CHL-01", desc: "Water-Cooled Screw Chiller 250 TR", uom: "Set", rate: 3800000, brand: "Daikin / Carrier", category: "HVAC Equipment", effectiveDate: "01 May 2026", spec: "VFD compressor, R-134a eco refrigerant" },
    { code: "CIV-RMC-M30", desc: "Ready Mix Concrete M30", uom: "Cu.m", rate: 5800, brand: "UltraTech / ACC", category: "Civil Raw Materials", effectiveDate: "01 Jan 2026", spec: "Slump 120±25mm with flyash mix design" }
  ],

  // Leftover Inventory (Mandatory for Project Closure)
  leftoverInventory: [
    { item: "XLPE Copper Cable 4C x 16 sqmm", project: "Grand Oasis Resort — MEP (GR-MEP-001)", received: "5,000 Mtr", used: "4,620 Mtr", leftover: "380 Mtr", unitVal: "₹420", totalVal: "₹1,59,600", action: "Transfer to Royal Heritage Jaipur", status: "Reconciled", statusBadge: "green" },
    { item: "Modular Switch 16A Schneider", project: "Grand Oasis Resort — MEP (GR-MEP-001)", received: "650 Nos", used: "610 Nos", leftover: "40 Nos", unitVal: "₹485", totalVal: "₹19,400", action: "Store in Resort Central Spares", status: "Reconciled", statusBadge: "green" },
    { item: "PVC Conduit 25mm Heavy Duty", project: "Grand Oasis Resort — MEP (GR-MEP-001)", received: "2,000 Mtr", used: "1,880 Mtr", leftover: "120 Mtr", unitVal: "₹65", totalVal: "₹7,800", action: "Store in Resort Central Spares", status: "Pending GM Signoff", statusBadge: "amber" }
  ],

  // Audit Logs
  auditLogs: [
    { time: "18 Aug 2026 15:10", user: "Yogesh Kumar", role: "Super / Project Admin", action: "CREATE", module: "N-Level Project", record: "Added Work Package GR-MEP-001-ELE-T2 under GR-MEP-001", ip: "192.168.1.45" },
    { time: "18 Aug 2026 14:35", user: "Rahul Sharma", role: "Project Manager", action: "UPDATE", module: "Daily Site Report", record: "Updated Block A Main Riser progress to 72%", ip: "192.168.1.88" },
    { time: "18 Aug 2026 12:15", user: "Neeraj Singh", role: "Finance Controller", action: "APPROVE", module: "BOQ Baseline", record: "Approved BOQ v2.1 for Grand Oasis Resort MEP", ip: "192.168.1.92" },
    { time: "18 Aug 2026 10:20", user: "Amit Verma", role: "Site Engineer", action: "LOG_ISSUE", module: "Issues", record: "Logged #ISS-1024: Port customs delay for HVAC valve flanges", ip: "192.168.1.104" },
    { time: "17 Aug 2026 17:00", user: "Dr. Arvind Swaminathan", role: "Auditor", action: "GATEWAY_SIGNOFF", module: "Milestones", record: "Passed Milestone M-03 Substation Delivery Quality Inspection", ip: "192.168.1.15" }
  ],

  // Notifications & Escalation Rules
  notifications: [
    { id: 1, type: "danger", title: "Budget Alert — Electrical Distribution reached 84%", time: "10 mins ago", desc: "Cost center utilization exceeded 80% safety limit (₹1.68 Cr of ₹2.00 Cr used). Escalated to Finance & PM.", link: "budget.html" },
    { id: 2, type: "warning", title: "High-Priority Issue Logged (#ISS-1024)", time: "1 hr ago", desc: "HVAC valve flanges shipment delay at port customs. Potential impact: 3 days.", link: "issues.html" },
    { id: 3, type: "info", title: "Daily Site Updates Submitted (4 Projects)", time: "2 hrs ago", desc: "Site engineers submitted progress updates for Grand Oasis & Royal Heritage.", link: "daily-report.html" },
    { id: 4, type: "success", title: "Milestone M-03 Signed Off by Quality Auditor", time: "Yesterday", desc: "Substation equipment delivery and site readiness approved.", link: "milestones.html" }
  ]
};

// LocalStorage initialization to preserve user modifications
function initWisetrackStorage() {
  if (!localStorage.getItem('WISETRACK_RESORTS')) {
    localStorage.setItem('WISETRACK_RESORTS', JSON.stringify(WISETRACK_DATA.resorts));
  }
  if (!localStorage.getItem('WISETRACK_PROJECTS')) {
    localStorage.setItem('WISETRACK_PROJECTS', JSON.stringify(WISETRACK_DATA.projects));
  }
  if (!localStorage.getItem('WISETRACK_USERS')) {
    localStorage.setItem('WISETRACK_USERS', JSON.stringify(WISETRACK_DATA.users));
  }
  if (!localStorage.getItem('WISETRACK_ROLE')) {
    localStorage.setItem('WISETRACK_ROLE', WISETRACK_DATA.currentUser.role);
  }
  if (!localStorage.getItem('WISETRACK_SELECTED_RESORT')) {
    localStorage.setItem('WISETRACK_SELECTED_RESORT', 'RES-GOA-01');
  }
}

initWisetrackStorage();
