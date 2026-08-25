<div class="content">
  <div class="breadcrumb-nav">
    <a href="index.php?page=dashboard">Dashboard</a>
    <span>/</span>
    <a href="index.php?page=projects">Projects</a>
    <span>/</span>
    <span class="current">Leftover Inventory & Mandatory Closure Gate</span>
  </div>

  <div class="head">
    <div>
      <div class="eyebrow">STEP 7 · MANDATORY PROJECT CLOSURE GATEKEEPER</div>
      <h1>Leftover Inventory & Project Handover</h1>
      <p>Material reconciliation (Received vs Used vs Leftover), scrap/resort transfer value, and signed completion signoff.</p>
    </div>
    <div class="head-actions">
      <button class="btn success" onclick="openHandoverModal()"><i class="fa-solid fa-lock"></i> Execute Handover Signoff</button>
      <button class="btn primary" onclick="openModal('Add Surplus Material Record', '<form onsubmit=\'event.preventDefault();closeModal();showToast(\x22Inventory record added!\x22)\'><div class=\x22form-grid\x22><div class=\x22field full\x22><label>Material / Item Name *</label><input required placeholder=\x22e.g. 25mm Heavy Duty PVC Conduit\x22></div><div class=\x22field\x22><label>Project Package *</label><select><option>Grand Resort — MEP (GR-MEP-001)</option><option>Grand Resort — Civil (GR-CIV-001)</option></select></div><div class=\x22field\x22><label>Leftover Qty *</label><input placeholder=\x22e.g. 120 Mtr\x22 required></div><div class=\x22field\x22><label>Estimated Value</label><input placeholder=\x22e.g. ₹7,800\x22 required></div><div class=\x22field full\x22><label>Proposed Disposition Action</label><select><option>Transfer to Royal Heritage Jaipur</option><option>Keep in Resort Central Maintenance Spares</option><option>Return to Vendor for Credit Note</option><option>Scrap Sale</option></select></div></div><div class=\x22modalfoot\x22 style=\x22padding:0;margin-top:14px;\x22><button type=\x22button\x22 class=\x22btn\x22 onclick=\x22closeModal()\x22>Cancel</button><button type=\x22submit\x22 class=\x22btn primary\x22><i class="fa-solid fa-plus"></i> Save Inventory</button></div></form>')"><i class="fa-solid fa-plus"></i> Add Leftover Item</button>
    </div>
  </div>

  <div class="alert warning">
    <span><i class="fa-solid fa-lock"></i></span>
    <div>
      <strong>Mandatory Project Closure Gate:</strong> Project archiving is strictly blocked until (1) all unused/surplus materials are reconciled with assigned transfer destinations, and (2) the signed handover & completion certificate from the General Manager is uploaded.
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Leftover Materials Reconciliation — Grand Resort MEP</h3>
        <div class="card-subtitle">Current Surplus Valuation: ₹1,86,800</div>
      </div>
      <button class="btn sm" onclick="showToast('Exporting material reconciliation dossier', 'info')"><i class="fa-solid fa-file-lines"></i> Export Inventory Sheet</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>MATERIAL / ITEM</th>
            <th>PROJECT PACKAGE</th>
            <th>RECEIVED</th>
            <th>USED ON SITE</th>
            <th>LEFTOVER</th>
            <th>VALUE (₹)</th>
            <th>DISPOSITION ACTION</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>XLPE Copper Cable 4C x 16 sqmm</strong>
              <small>Polycab heavy duty</small>
            </td>
            <td>Grand Resort MEP (GR-MEP-001)</td>
            <td>5,000 Mtr</td>
            <td>4,620 Mtr</td>
            <td><b>380 Mtr</b></td>
            <td>₹1,59,600</td>
            <td>Transfer to Royal Heritage Palace Jaipur</td>
            <td><span class="badge green">Reconciled</span></td>
          </tr>
          <tr>
            <td>
              <strong>Modular Switch 16A Schneider</strong>
              <small>Antibacterial white</small>
            </td>
            <td>Grand Resort MEP (GR-MEP-001)</td>
            <td>650 Nos</td>
            <td>610 Nos</td>
            <td><b>40 Nos</b></td>
            <td>₹19,400</td>
            <td>Store in Resort Central Maintenance Spares</td>
            <td><span class="badge green">Reconciled</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
