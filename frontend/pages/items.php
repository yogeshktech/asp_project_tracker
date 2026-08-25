<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <span class="current">Item Master & Rate Catalog</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">MASTER DATA CATALOG · PM-12 COMPLIANCE</div>
      <h1>Item Master & Price Database (Item DB)</h1>
      <p>Reusable materials catalog: Item, Unit, Purchase Price, Description, Image, Brand, Category, and live RFQ App Integration.</p>
    </div>
    <div class="head-actions">
      <button class="btn" onclick="showToast('Syncing live market rates from RFQ App...', 'info')"><i class="fa-solid fa-arrows-rotate"></i> Sync RFQ App</button>
      <button class="btn primary" onclick="openModal('Add Master Item', '<form onsubmit=\'event.preventDefault();closeModal();showToast(\x22Item with Image & Brand saved to master catalog!\x22)\'><div class=\x22form-grid\x22><div class=\x22field\x22><label>Item Code *</label><input required placeholder=\x22e.g. EL-CBL-020\x22></div><div class=\x22field\x22><label>Category *</label><select><option>Electrical Cabling</option><option>Switchgear & Panels</option><option>HVAC & Chillers</option><option>Civil Raw Materials</option><option>Plumbing & Sanitary</option></select></div><div class=\x22field full\x22><label>Item Description / Specification *</label><input required placeholder=\x22e.g. 4C x 70 sqmm Armoured Copper Cable IS:7098\x22></div><div class=\x22field\x22><label>Unit of Measure (UOM) *</label><select><option>Meter (Mtr)</option><option>Numbers (Nos)</option><option>Sets</option><option>Cu.m</option><option>Sq.m</option><option>Kg</option></select></div><div class=\x22field\x22><label>Purchase Price / Unit Rate (₹) *</label><input type=\x22number\x22 placeholder=\x221200\x22 required></div><div class=\x22field full\x22><label>Approved Brand Makes *</label><input placeholder=\x22e.g. Polycab / Havells / Finolex\x22 required></div><div class=\x22field full\x22><label>Item Image / CAD Drawing</label><input type=\x22file\x22 accept=\x22image/*,.dwg,.pdf\x22></div></div><div class=\x22modalfoot\x22 style=\x22padding:0;margin-top:14px;\x22><button type=\x22button\x22 class=\x22btn\x22 onclick=\x22closeModal()\x22>Cancel</button><button type=\x22submit\x22 class=\x22btn primary\x22><i class=\x22fa-solid fa-plus\x22></i> Save to Item Master</button></div></form>')"><i class="fa-solid fa-plus"></i> Add Master Item</button>
    </div>
  </div>

  <!-- RFQ App Sync Status Banner -->
  <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:18px;">🔄</span>
      <div>
        <strong style="color:#15803d;">RFQ App Connected & Synced:</strong>
        <span style="color:#166534; margin-left:4px;">Vendor quotes and catalog benchmark prices automatically update effective purchasing baselines.</span>
      </div>
    </div>
    <span class="badge green">RFQ Sync Active</span>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Approved Materials, Equipment & Services Catalog</h3>
        <div class="card-subtitle">Linked automatically during BOQ imports and contractor bill certification</div>
      </div>
      <div class="btn-group">
        <button class="btn sm" onclick="showToast('Syncing RFQ price benchmarks...', 'info')"><i class="fa-solid fa-arrows-rotate"></i> RFQ Sync</button>
        <button class="btn sm" onclick="showToast('Exporting Item Master catalog to Excel', 'info')"><i class="fa-solid fa-download"></i> Export Catalog</button>
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
            <th>PURCHASE PRICE (₹)</th>
            <th>APPROVED BRANDS</th>
            <th>CATEGORY</th>
            <th>RFQ INTEGRATION</th>
            <th>EFFECTIVE DATE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid var(--border-color);">🔌</div>
            </td>
            <td><b>EL-CBL-001</b></td>
            <td>
              <strong>XLPE Copper Cable 4C x 16 sqmm</strong>
              <small>IS:7098 (Part 1) armoured copper conductor</small>
            </td>
            <td>Meter</td>
            <td><b>₹420</b></td>
            <td>Polycab / Havells</td>
            <td><span class="badge blue">Electrical</span></td>
            <td><span class="badge green">Synced from RFQ</span></td>
            <td>01 Aug 2026</td>
          </tr>
          <tr>
            <td>
              <div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid var(--border-color);">🔘</div>
            </td>
            <td><b>EL-SW-014</b></td>
            <td>
              <strong>Modular Switch 16A 1-Way</strong>
              <small>Antibacterial polycarbonate face plate with indicator</small>
            </td>
            <td>Nos</td>
            <td><b>₹485</b></td>
            <td>Schneider / Legrand</td>
            <td><span class="badge blue">Switchgear</span></td>
            <td><span class="badge green">Synced from RFQ</span></td>
            <td>01 Aug 2026</td>
          </tr>
          <tr>
            <td>
              <div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid var(--border-color);">❄️</div>
            </td>
            <td><b>HVAC-CHL-01</b></td>
            <td>
              <strong>Water-Cooled Screw Chiller 250 TR</strong>
              <small>VFD compressor, R-134a eco refrigerant, AHRI certified</small>
            </td>
            <td>Set</td>
            <td><b>₹38,00,000</b></td>
            <td>Daikin / Carrier</td>
            <td><span class="badge amber">HVAC</span></td>
            <td><span class="badge blue">Direct OEM RFP</span></td>
            <td>01 May 2026</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

