<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=projects">Projects</a>
    <span>/</span>
    <span class="current">Bill of Quantities (BOQ)</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 4 · COMMERCIAL & RATE ENGINE · PM-13 COMPLIANCE</div>
      <h1>Bill of Quantities (BOQ) & Estimating</h1>
      <p>Item, Unit, Purchase Price, Quantity, Description, Image, Total, Brand, Remark Column, and uploadable attachment files.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="openExcelImportModal()"><i class="fa-solid fa-file-excel"></i> Flexible 3rd-Party Import</button>
      <button class="btn primary" onclick="openAddBOQItemModal()"><i class="fa-solid fa-plus"></i> Add BOQ Line Item</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Active Items</span>
      <span class="kpi-value">486 Line Items</span>
      <span class="kpi-sub">Civil, Electrical, HVAC, Plumbing</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Baseline v1.0 Value</span>
      <span class="kpi-value">₹8.42 Cr</span>
      <span class="kpi-sub">Approved 28 Feb 2026</span>
    </div>
    <div class="kpi warning">
      <span class="kpi-label">Revised v2.1 Value</span>
      <span class="kpi-value">₹8.68 Cr</span>
      <span class="kpi-sub">+₹26.0L Variance (3.08%)</span>
    </div>
    <div class="kpi success">
      <span class="kpi-label">Committed Value</span>
      <span class="kpi-value">₹6.71 Cr</span>
      <span class="kpi-sub">Purchase orders released</span>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Approved BOQ Line Items — Grand Resort MEP</h3>
        <div class="card-subtitle">Version 2.1 Baseline · Complete Item, Image, Brand, Rate, Remark & Attachment Tracking</div>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="openExcelImportModal()"><i class="fa-solid fa-upload"></i> Import 3rd Party Excel</button>
        <button class="btn sm" onclick="showToast('Exporting BOQ to Excel...', 'info')"><i class="fa-solid fa-download"></i> Export Excel</button>
        <button class="btn sm" onclick="showToast('BOQ Version 2.1 PDF exported', 'info')"><i class="fa-solid fa-file-lines"></i> Export PDF</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>IMAGE</th>
            <th>ITEM CODE</th>
            <th>DESCRIPTION & SPECIFICATIONS</th>
            <th>UOM</th>
            <th>QTY</th>
            <th>PURCHASE RATE (₹)</th>
            <th>TOTAL AMOUNT</th>
            <th>APPROVED BRAND</th>
            <th>REMARK COLUMN</th>
            <th>ATTACHMENT</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid var(--border-color);">🔌</div>
            </td>
            <td><code>EL-CBL-001</code></td>
            <td>
              <strong>XLPE Copper Cable 4C x 16 sqmm 1.1kV</strong>
              <small>IS:7098 Part 1 armoured heavy duty conductor</small>
            </td>
            <td>Meter</td>
            <td>5,200</td>
            <td>₹420</td>
            <td><b>₹21,84,000</b></td>
            <td>Polycab / Havells</td>
            <td><small>Underground duct routing shaft 2</small></td>
            <td>
              <span class="badge gray" style="cursor:pointer;" onclick="showToast('Downloading Datasheet: Polycab_XLPE_IS7098.pdf', 'info')">📄 Spec.pdf</span>
            </td>
            <td><span class="badge green">Approved</span></td>
            <td><button class="btn sm" onclick="openAddBOQItemModal()">Edit</button></td>
          </tr>
          <tr>
            <td>
              <div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid var(--border-color);">⚡</div>
            </td>
            <td><code>EL-CBL-002</code></td>
            <td>
              <strong>Armoured Copper Cable 4C x 240 sqmm Substation Main</strong>
              <small>Main HT/LT feeder riser cable</small>
            </td>
            <td>Meter</td>
            <td>850</td>
            <td>₹3,450</td>
            <td><b>₹29,32,500</b></td>
            <td>Havells / Finolex</td>
            <td><small>Main feeder from 11kV substation to block A</small></td>
            <td>
              <span class="badge gray" style="cursor:pointer;" onclick="showToast('Downloading Datasheet: Havells_HT_Feeder.pdf', 'info')">📄 Spec.pdf</span>
            </td>
            <td><span class="badge green">Approved</span></td>
            <td><button class="btn sm" onclick="openAddBOQItemModal()">Edit</button></td>
          </tr>
          <tr>
            <td>
              <div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid var(--border-color);">🔘</div>
            </td>
            <td><code>EL-SW-014</code></td>
            <td>
              <strong>Modular 16A Switch & Socket with Plate</strong>
              <small>Antibacterial polycarbonate plate with indicator</small>
            </td>
            <td>Nos</td>
            <td>650</td>
            <td>₹485</td>
            <td><b>₹3,15,250</b></td>
            <td>Schneider Electric</td>
            <td><small>Guest room wing fitout specification</small></td>
            <td>
              <span class="badge gray" style="cursor:pointer;" onclick="showToast('Downloading Datasheet: Schneider_Modular.pdf', 'info')">📄 Spec.pdf</span>
            </td>
            <td><span class="badge green">Approved</span></td>
            <td><button class="btn sm" onclick="openAddBOQItemModal()">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

