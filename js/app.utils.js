function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
  else console.warn('Screen not found:', name);
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + name);
  if (pageEl) pageEl.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector('.nav-item[data-page="' + name + '"]');
  if (navItem) navItem.classList.add('active');
  const titles = {
    'dashboard': 'Dashboard', 'place-order': 'Place New Order',
    'my-orders': 'My Orders', 'invoices': 'My Invoices',
    'admin-dashboard': 'Admin Overview', 'admin-orders': 'All Orders',
    'admin-resellers': 'Reseller Management', 'admin-invoices': 'All Invoices',
  };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'my-orders') renderMyOrders('all');
  if (name === 'invoices') renderInvoices('reseller');
  if (name === 'my-profile') loadProfile();
  if (name === 'admin-orders') renderAdminOrders();
  if (name === 'admin-resellers') renderResellers();
  if (name === 'admin-invoices') renderAdminInvoices();
  if (name === 'admin-dashboard') renderAdminPending();
  if (name === 'admin-catalog') renderCatalog();
  if (name === 'place-order') {
    window_placingOrder = false;
    orderCart = [];
    uploadedScreenshots = [];
    renderScreenshotGrid();
    renderCart();
    shipToSelfOn = false;
    // Reload catalog if PRODUCTS is empty (race condition fix)
    if (Object.keys(PRODUCTS).length === 0 && SESSION) {
      loadCatalog().then(() => {
        console.log('Catalog reloaded for place-order, products:', Object.keys(PRODUCTS).length);
      });
    }
    var toggle = document.getElementById('ship-self-toggle');
    var knob   = document.getElementById('ship-self-knob');
    if (toggle) toggle.style.background = 'var(--border)';
    if (knob)   knob.style.transform = 'translateX(0)';
    const up = document.getElementById('upload-preview');
    const sl = document.getElementById('product-sl');
    if (up) up.classList.remove('show');
    if (sl) sl.value = '';
    document.getElementById('add-qty').value = '1';
    const notes = document.getElementById('order-notes');
    if (notes) notes.value = '';
    goToStep(1);
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3500);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function statusBadge(status) {
  const map = { pending: 'badge-pending', confirmed: 'badge-confirmed', shipped: 'badge-shipped', delivered: 'badge-delivered', cancelled: 'badge-cancelled' };
  return `<span class="badge ${map[status]||'badge-pending'}"><span class="badge-dot"></span>${status.charAt(0).toUpperCase()+status.slice(1)}</span>`;
}

function formatDate(d) { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }

function calcGST(price, gstPct) { return Math.round(price * gstPct / 100); }

function invoiceNo(orderId) { return 'INV-' + orderId.replace('SVO-', '2024-'); }

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
  document.body.style.overflow = '';
}