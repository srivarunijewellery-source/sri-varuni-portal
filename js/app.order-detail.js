function buildScreenshotSection(o) {
  if (!o.screenshotUrl) return '';
  const urls = o.screenshotUrl.split(',').map(u => u.trim()).filter(Boolean);
  if (!urls.length) return '';
  const thumbs = urls.map((url, i) =>
    '<div style="position:relative;cursor:zoom-in;display:inline-block;" onclick="openScreenshotViewer(\'' + url + '\', ' + i + ', ' + urls.length + ')">' +
    '<img src="' + url + '" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--border);display:block;" onerror="this.style.display=\'none\'">' +
    '<div style="position:absolute;inset:0;background:rgba(0,0,0,.35);border-radius:8px;display:flex;align-items:center;justify-content:center;opacity:0;transition:.15s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>' +
    '</div></div>'
  ).join('');
  return '<div style="margin-top:12px;">' +
    '<div style="font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--tl);margin-bottom:8px;">Payment Screenshots (' + urls.length + ')</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">' + thumbs + '</div>' +
    '<a href="' + urls[0] + '" download target="_blank" style="font-size:12px;color:var(--pl);text-decoration:none;display:inline-flex;align-items:center;gap:5px;">' +
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
    'Download screenshot' + (urls.length > 1 ? 's (' + urls.length + ')' : '') + '</a></div>';
}

function openScreenshotViewer(url, idx, total) {
  const overlay = document.getElementById('screenshot-viewer-overlay');
  if (!overlay) return;
  const img = document.getElementById('screenshot-viewer-img');
  const dl  = document.getElementById('screenshot-download-btn');
  const counter = document.getElementById('screenshot-viewer-counter');
  if (img) img.src = url;
  if (dl)  dl.href = url;
  if (counter) counter.textContent = total > 1 ? (idx + 1) + ' / ' + total : '';
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeScreenshotViewer() {
  const overlay = document.getElementById('screenshot-viewer-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function viewOrder(orderId) {
  const o = ORDERS.find(x => x.id === orderId);
  if (!o) { showToast('Order not found', 'error'); return; }
  currentTrackingOrderId = orderId;
  const isAdmin = currentUser && currentUser.role === 'admin';

  const itemsSection = (o.items && o.items.length > 1)
    ? '<div style="margin:4px 0 8px"><div style="font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text-light);margin-bottom:6px">Items (' + o.items.length + ')</div>' +
      o.items.map(function(it) {
        return '<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f5f0f9">' +
          '<span><code style="font-size:11px;color:var(--purple-light)">' + it.sl + '</code>&nbsp; ' + it.name + '</span>' +
          '<span style="color:var(--text-mid);white-space:nowrap">' + it.qty + ' &times; ₹' + it.price.toLocaleString() + ' = <strong>₹' + (it.qty * it.price).toLocaleString() + '</strong></span>' +
          '</div>';
      }).join('') + '</div>'
    : '<div class="info-row"><label>Product SL</label><span style="font-family:monospace;font-size:12px">' + (o.sl || '—') + '</span></div>' +
      '<div class="info-row"><label>Product</label><span>' + (o.product || '—') + '</span></div>' +
      '<div class="info-row"><label>Quantity</label><span>' + (o.qty || 1) + '</span></div>';

  document.getElementById('modal-order-body').innerHTML =
    '<div style="margin-bottom:16px">' + statusBadge(o.status) + '</div>' +
    '<div class="grid-2"><div>' +
    '<p class="text-sm text-muted fw-600 mb-16" style="letter-spacing:1px;text-transform:uppercase">Order Info</p>' +
    '<div class="info-row"><label>Order ID</label><span style="font-family:monospace;font-size:12px">' + o.id + '</span></div>' +
    itemsSection +
    '<div class="info-row"><label>Total</label><span style="font-weight:700;color:var(--purple-dark)">₹' + o.price.toLocaleString() + '</span></div>' +
    '<div class="info-row"><label>Date</label><span>' + (o.date ? formatDate(o.date) : '—') + '</span></div>' +
    '<div class="info-row"><label>UPI Txn ID</label><span style="font-family:monospace;font-size:12px">' + (o.upiTxn || '—') + '</span></div>' +
    '<div class="info-row"><label>Payment</label><span class="badge ' + (o.paymentStatus === 'verified' ? 'badge-delivered' : 'badge-pending') + '">' + (o.paymentStatus === 'verified' ? '&#10003; Verified' : 'Pending') + '</span></div>' +
    buildScreenshotSection(o) +
    '</div><div>' +
    '<p class="text-sm text-muted fw-600 mb-16" style="letter-spacing:1px;text-transform:uppercase">Ship To</p>' +
    '<div class="info-row"><label>Customer</label><span>' + (o.customer || '—') + '</span></div>' +
    '<div class="info-row"><label>Phone</label><span>' + (o.phone || '—') + '</span></div>' +
    '<div class="info-row"><label>Address</label><span>' + (o.address || '—') + '</span></div>' +
    '<div class="info-row"><label>City</label><span>' + (o.city || '—') + '</span></div>' +
    '<div class="info-row"><label>State</label><span>' + (o.state || '—') + '</span></div>' +
    '<div class="info-row"><label>Pincode</label><span style="font-family:monospace">' + (o.pin || '—') + '</span></div>' +
    (o.tracking ? '<div class="info-row"><label>Courier</label><span>' + o.courier + '</span></div><div class="info-row"><label>Tracking</label><span style="font-family:monospace">' + o.tracking + '</span></div>' : '') +
    '</div></div>';

  const footer = document.getElementById('modal-order-footer');
  if (isAdmin) {
    footer.innerHTML =
      '<button class="btn btn-outline" onclick="closeModal(\'modal-order\')">Close</button>' +
      '<button class="btn btn-outline btn-sm" onclick="openEditOrder(\'' + o.id + '\')">&#9998; Edit</button>' +
      (o.status === 'pending' ? '<button class="btn btn-success btn-sm" onclick="verifyPayment(\'' + o.id + '\')">&#10003; Verify Payment</button>' : '') +
      (o.status === 'confirmed' ? '<button class="btn btn-primary btn-sm" onclick="openTracking(\'' + o.id + '\')">&#43; Add Tracking</button>' : '') +
      '<button class="btn btn-outline btn-sm" onclick="showInvoice(\'' + o.id + '\')">Invoice</button>';
  } else {
    footer.innerHTML =
      '<button class="btn btn-outline" onclick="closeModal(\'modal-order\')">Close</button>' +
      '<button class="btn btn-outline btn-sm" onclick="showInvoice(\'' + o.id + '\')">Invoice</button>' +
      (o.tracking ? '<button class="btn btn-primary btn-sm" onclick="showLabel(\'' + o.id + '\')">Shipping Label</button>' : '') +
      (o.status === 'pending' ? '<button class="btn btn-danger btn-sm" onclick="cancelOrder(\'' + o.id + '\')">&#215; Cancel Order</button>' : '');
  }
  openModal('modal-order');
}

function openTracking(orderId) {
  currentTrackingOrderId = orderId;
  document.getElementById('tracking-eta').value = '';
  document.getElementById('tracking-number').value = '';
  closeModal('modal-order');
  openModal('modal-tracking');
}