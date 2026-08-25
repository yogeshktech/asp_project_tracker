    <footer style="padding: 18px 30px; border-top: 1px solid var(--border-color); background: #ffffff; display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--text-muted);">
      <div>
        <strong>WISETRACK Engineering PMS</strong> &copy; 2026. Resort Portfolio & Multi-Level Project Control System.
      </div>
      <div style="display:flex; gap:16px;">
        <span><i class="fa-solid fa-lock"></i> Role-Based Access Control</span>
        <span>•</span>
        <span><i class="fa-solid fa-chart-pie"></i> N-Level WBS Hierarchy</span>
        <span>•</span>
        <span>⚡ 80% Cost Escalation Active</span>
      </div>
    </footer>
  </div> <!-- End .main -->
</div> <!-- End .app -->

<!-- Universal Modal Container -->
<div class="modal" id="modal">
  <div class="modalbox">
    <div class="modalhead">
      <h3 id="modalTitle">Modal</h3>
      <button class="close-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modalbody" id="modalBody"></div>
    <div class="modalfoot" id="modalFoot"></div>
  </div>
</div>

<!-- Toast Notification -->
<div class="toast" id="toast"></div>

<!-- Application Script -->
<script src="assets/app.js"></script>
</body>
</html>
