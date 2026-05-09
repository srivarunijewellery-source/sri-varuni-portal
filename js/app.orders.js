// app_orders.js — globals are declared in app_config.js, not here

// ── Cart helpers ─────────────────────────────────────────────────────────────
function cartTotal() {
  return orderCart.reduce((s, i) => s + i.price * i.qty, 0);
}

function renderCart() {
  const empty = document.getElementById('cart-empty');
  const wrap  = document.getElementById('cart-table-wrap');
  const tbody = document.getElementById('cart-tbody');
  const tot   = document.getElementById('cart-total');
  if (!empty || !wrap || !tbody) return;
  if (orderCart.length === 0) {
    empty.style.display = 'block';
    wrap.style.display  = 'none';
    if (tot) tot.textContent = '₹0';
    return;
  }
  empty.style.display = 'none';
  wrap.style.display  = 'block';
  let total = 0;
  tbody.innerHTML = orderCart.map((item, i) => {
    const lt = item.price * item.qty;
    total += lt;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;width:52px;">
        ${item.image
          ? `<img src="${item.image}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">`
          : `<div style="width:40px;height:40px;border-radius:6px;background:#3d2456;display:flex;align-items:center;justify-content:center;color:#c9a96e;font-size:18px;">◆</div>`}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;font-family:monospace;font-size:11px;color:#5a3578;">${item.sl}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;">
        <div style="font-size:13px;font-weight:600;color:#1a0f2e;">${item.name}</div>
        <div style="font-size:11px;color:#8b7aa0;">${item.details || ''}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:center;">
        <button onclick="cartQty(${i},-1)" style="border:1px solid #e8d5f0;background:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:14px;">−</button>
        <strong style="color:#1a0f2e;">${item.qty}</strong>
        <button onclick="cartQty(${i},1)" style="border:1px solid #e8d5f0;background:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:14px;">+</button>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:right;color:#4a3560;">₹${item.price.toLocaleString()}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:right;font-weight:700;color:#2d1b3d;">₹${lt.toLocaleString()}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:center;">
        <button onclick="removeCartItem(${i})" style="border:none;background:#fee2e2;color:#9b1c1c;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;">✕</button>
      </td>
    </tr>`;
  }).join('');
  if (tot) tot.textContent = '₹' + total.toLocaleString();
}

function cartQty(i, d) {
  orderCart[i].qty = Math.max(1, orderCart[i].qty + d);
  renderCart();
}

function removeCartItem(i) {
  orderCart.splice(i, 1);
  renderCart();
}

// ── Product lookup ────────────────────────────────────────────────────────────
function quickFill(sl) {
  const inp = document.getElementById('product-sl');
  if (inp) inp.value = sl;
  lookupAndAdd();
}

function lookupAndAdd() {
  const sl  = (document.getElementById('product-sl').value || '').trim().toUpperCase();
  const qty = parseInt(document.getElementById('add-qty').value) || 1;
  if (!sl) { showToast('Enter a product SL number', 'error'); return; }

  // Re-sync in case catalog loaded after page init
  if (Object.keys(PRODUCTS).length === 0 && Object.keys(CATALOG).length > 0) {
    syncCatalogToProducts();
  }

  const prod = PRODUCTS[sl];
  if (!prod) {
    showToast(Object.keys(PRODUCTS).length === 0
      ? 'Catalog still loading — try again in a moment'
      : 'Product not found: ' + sl, 'error');
    return;
  }
  const ex = orderCart.find(i => i.sl === sl);
  if (ex) { ex.qty += qty; showToast('Updated qty for ' + prod.name); }
  else    { orderCart.push({ sl, name: prod.name, details: prod.details || '', price: prod.price, qty, image: prod.image || null }); showToast('Added: ' + prod.name); }
  document.getElementById('product-sl').value = '';
  document.getElementById('add-qty').value = '1';
  renderCart();
}

// ── Screenshots ───────────────────────────────────────────────────────────────
function handleUpload(input) {
  if (!input.files || !input.files.length) return;
  Array.from(input.files).forEach(file => {
    if (!file.type.startsWith('image/')) { showToast('Only image files allowed', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast(file.name + ' too large (max 10MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      uploadedScreenshots.push({ dataUrl: ev.target.result, name: file.name });
      renderScreenshotGrid();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderScreenshotGrid() {
  const grid = document.getElementById('screenshots-grid');
  if (!grid) return;
  if (uploadedScreenshots.length === 0) { grid.style.display = 'none'; grid.innerHTML = ''; return; }
  grid.style.display = 'flex';
  grid.innerHTML = uploadedScreenshots.map((ss, i) =>
    `<div style="position:relative;width:80px;height:80px;flex-shrink:0;">
      <img src="${ss.dataUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #2d7a4f;">
      <button onclick="removeScreenshot(${i})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#9b1c1c;color:#fff;border:none;cursor:pointer;font-size:11px;line-height:1;">✕</button>
    </div>`
  ).join('') +
  `<div onclick="document.getElementById('upi-screenshot-input').click()" style="width:80px;height:80px;border:2px dashed #e8d5f0;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#8b7aa0;font-size:11px;gap:4px;">+<div>Add</div></div>`;
}

function removeScreenshot(i) {
  uploadedScreenshots.splice(i, 1);
  renderScreenshotGrid();
}

// ── Ship-to-self ──────────────────────────────────────────────────────────────
function toggleShipToSelf() {
  shipToSelfOn = !shipToSelfOn;
  const toggle = document.getElementById('ship-self-toggle');
  const knob   = document.getElementById('ship-self-knob');
  if (shipToSelfOn) {
    if (toggle) toggle.style.background = 'var(--ok)';
    if (knob)   knob.style.transform    = 'translateX(18px)';
    const u = currentUserProfile || {};
    document.getElementById('cust-name').value    = u.name    || '';
    document.getElementById('cust-phone').value   = u.phone   || '';
    document.getElementById('cust-address').value = u.address || '';
    document.getElementById('cust-city').value    = u.city    || '';
    document.getElementById('cust-state').value   = u.state   || '';
    document.getElementById('cust-pin').value     = u.pin     || '';
    showToast(!u.address ? 'Add your address in My Profile first' : 'Address auto-filled', !u.address ? 'error' : 'success');
  } else {
    if (toggle) toggle.style.background = 'var(--border)';
    if (knob)   knob.style.transform    = 'translateX(0)';
    ['cust-name','cust-phone','cust-address','cust-city','cust-state','cust-pin']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
}

// ── Credit toggle ─────────────────────────────────────────────────────────────
function toggleApplyCredit() {
  applyCreditToOrder = !applyCreditToOrder;
  const toggle = document.getElementById('credit-apply-toggle');
  const knob   = document.getElementById('credit-apply-knob');
  const label  = document.getElementById('credit-apply-label');
  const row    = document.getElementById('credit-apply-amount-row');
  if (toggle) { toggle.style.background = applyCreditToOrder ? '#059669' : '#d1fae5'; toggle.style.borderColor = applyCreditToOrder ? '#059669' : '#6ee7b7'; }
  if (knob)  knob.style.transform = applyCreditToOrder ? 'translateX(20px)' : 'translateX(0)';
  if (label) label.textContent    = applyCreditToOrder ? 'Applied ✓' : 'Apply';
  if (row)   row.style.display    = applyCreditToOrder ? 'flex' : 'none';
  if (applyCreditToOrder) {
    const inp = document.getElementById('credit-apply-input');
    if (inp) inp.value = Math.min(resellerCreditBalance || 0, cartTotal());
  }
  updatePaymentAmountDisplay();
}

function updatePaymentAmountDisplay() {
  const total   = cartTotal();
  const balance = (typeof resellerCreditBalance === 'number' && !isNaN(resellerCreditBalance)) ? resellerCreditBalance : 0;
  const inp     = document.getElementById('credit-apply-input');
  const used    = applyCreditToOrder ? Math.min(parseInt((inp && inp.value) || 0) || 0, balance, total) : 0;
  const payable = Math.max(0, total - used);
  const pamount = document.getElementById('payment-amount');
  if (!pamount) return;
  pamount.innerHTML = used > 0
    ? `₹${payable.toLocaleString()} <span style="font-size:13px;font-weight:400;color:#059669;">(-₹${used.toLocaleString()} credit applied)</span>`
    : `₹${payable.toLocaleString()}`;
}

// ── Step navigation ───────────────────────────────────────────────────────────
function goToStep(step) {
  try {
    if (step === 2 && orderCart.length === 0) { showToast('Add at least one product first', 'error'); return; }

    if (step === 3) {
      const n = document.getElementById('cust-name');
      const a = document.getElementById('cust-address');
      const p = document.getElementById('cust-pin');
      if (!n || !n.value.trim()) { showToast('Enter customer name', 'error'); return; }
      if (!a || !a.value.trim()) { showToast('Enter delivery address', 'error'); return; }
      if (!p || !p.value.trim()) { showToast('Enter pincode', 'error'); return; }
      try {
        const total = cartTotal();
        const pamount = document.getElementById('payment-amount');
        if (pamount) pamount.textContent = '₹' + total.toLocaleString();
        const balance = (typeof resellerCreditBalance === 'number' && !isNaN(resellerCreditBalance)) ? resellerCreditBalance : 0;
        const cs = document.getElementById('credit-apply-section');
        if (cs) {
          cs.style.display = balance > 0 ? 'block' : 'none';
          if (balance > 0) {
            const ca = document.getElementById('credit-avail-amount');
            const cm = document.getElementById('credit-apply-max');
            const ci = document.getElementById('credit-apply-input');
            if (ca) ca.textContent = '₹' + balance.toLocaleString();
            if (cm) cm.textContent = Math.min(balance, total).toLocaleString();
            if (ci) ci.max = Math.min(balance, total);
          }
        }
        updatePaymentAmountDisplay();
      } catch(e) { console.warn('Credit section error (non-fatal):', e); }
    }

    if (step === 4) {
      if (!uploadedScreenshots || uploadedScreenshots.length === 0) { showToast('Please upload at least one payment screenshot', 'error'); return; }
      const txn = document.getElementById('upi-txn');
      if (!txn || !txn.value.trim()) { showToast('Please enter the UPI Transaction ID', 'error'); return; }
      try {
        const total = cartTotal();
        const confItems = document.getElementById('conf-items-list');
        if (confItems) {
          confItems.innerHTML = orderCart.map(item =>
            `<div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #e8d5f0;">
              <div><span style="font-family:monospace;font-size:11px;color:#5a3578;">${item.sl}</span>
              <span style="font-size:13px;font-weight:500;margin-left:10px;color:#1a0f2e;">${item.name}</span></div>
              <div style="font-size:13px;color:#4a3560;">${item.qty} × ₹${item.price.toLocaleString()} = <strong style="color:#2d1b3d;">₹${(item.qty*item.price).toLocaleString()}</strong></div>
            </div>`
          ).join('');
        }
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
        set('conf-amount', '₹' + total.toLocaleString());
        set('conf-cname',  document.getElementById('cust-name')?.value || '');
        set('conf-cphone', document.getElementById('cust-phone')?.value || '');
        set('conf-caddr',  `${document.getElementById('cust-address')?.value || ''}, ${document.getElementById('cust-city')?.value || ''} - ${document.getElementById('cust-state')?.value || ''}`);
        set('conf-cpin',   document.getElementById('cust-pin')?.value || '');
      } catch(e) { console.warn('Confirm screen error (non-fatal):', e); }
    }

    for (let i = 1; i <= 4; i++) {
      const el  = document.getElementById('order-step-' + i);
      const dot = document.getElementById('step-' + i);
      if (el)  el.style.display = (i === step) ? 'block' : 'none';
      if (dot) {
        dot.className = 'step' + (i < step ? ' done' : i === step ? ' active' : '');
        const num = dot.querySelector('.step-num');
        if (num) num.textContent = i < step ? '✓' : String(i);
      }
    }
    const steps = document.getElementById('order-steps');
    if (steps) steps.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(err) {
    console.error('goToStep error:', err);
    showToast('Error: ' + err.message, 'error');
  }
}

// ── Place order ───────────────────────────────────────────────────────────────
async function placeOrder() {
  if (window_placingOrder) { showToast('Already placing order, please wait...'); return; }
  window_placingOrder = true;
  const btn = document.querySelector('#order-step-4 .btn-primary');
  if (btn) { btn.textContent = 'Placing...'; btn.disabled = true; }

  try {
    // Upload screenshots using dataURLtoBlob (defined in app_config.js — no fetch needed)
    let screenshotUrl = null;
    if (uploadedScreenshots.length > 0 && SESSION) {
      const urls = [];
      for (const ss of uploadedScreenshots) {
        try {
          const blob = dataURLtoBlob(ss.dataUrl);           // ← safe, no fetch
          const path = SESSION.userId + '/' + Date.now() + '_' + ss.name;
          const url  = await sb.uploadFile('screenshots', path, blob, SESSION.token);
          urls.push(url);
        } catch(ex) {
          console.warn('Screenshot upload failed:', ex.message);
          // continue — don't block order for screenshot failure
        }
      }
      if (urls.length) screenshotUrl = urls.join(',');
    }

    const balance = (typeof resellerCreditBalance === 'number' && !isNaN(resellerCreditBalance)) ? resellerCreditBalance : 0;
    const cinp    = document.getElementById('credit-apply-input');
    const used    = applyCreditToOrder ? Math.min(parseInt((cinp && cinp.value) || 0) || 0, balance, cartTotal()) : 0;

    const body = {
      reseller_id:      SESSION.userId,
      reseller_name:    currentUser.name,
      reseller_email:   currentUser.email,
      customer_name:    document.getElementById('cust-name').value.trim(),
      customer_phone:   document.getElementById('cust-phone').value.trim(),
      customer_address: document.getElementById('cust-address').value.trim(),
      customer_city:    document.getElementById('cust-city').value.trim(),
      customer_state:   document.getElementById('cust-state').value.trim(),
      customer_pin:     document.getElementById('cust-pin').value.trim(),
      items:            JSON.parse(JSON.stringify(orderCart)),
      total_price:      cartTotal(),
      upi_txn_id:       document.getElementById('upi-txn').value.trim(),
      screenshot_url:   screenshotUrl,
      notes:            (document.getElementById('order-notes')?.value || '').trim(),
      status:           'pending',
      payment_status:   'pending',
      credit_applied:   used
    };

    console.log('Placing order:', JSON.stringify(body).slice(0, 200));
    await sb.post('orders', body, SESSION.token);
    console.log('Order posted successfully');

    await loadOrders();

    // Reset all state
    orderCart = [];
    uploadedScreenshots = [];
    shipToSelfOn = false;
    applyCreditToOrder = false;
    ['cust-name','cust-phone','cust-address','cust-city','cust-state','cust-pin','upi-txn','order-notes']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const t = document.getElementById('ship-self-toggle');
    const k = document.getElementById('ship-self-knob');
    if (t) t.style.background = 'var(--border)';
    if (k) k.style.transform  = 'translateX(0)';
    renderCart();
    renderScreenshotGrid();
    const badge = document.getElementById('nav-order-count');
    if (badge) badge.textContent = ORDERS.filter(o => o.resellerEmail === currentUser.email).length;

    if (used > 0) {
      sb.post('credits', {
        reseller_id: SESSION.userId,
        amount:      -used,
        note:        'Credit applied to order ' + (ORDERS[0]?.id || ''),
        issued_by:   SESSION.userId
      }, SESSION.token).catch(e => console.warn('Credit deduction failed:', e));
      resellerCreditBalance = Math.max(0, balance - used);
      const sc = document.getElementById('stat-credits');
      if (sc) sc.textContent = '₹' + resellerCreditBalance.toLocaleString();
    }

    showToast('Order placed successfully! Awaiting payment verification.', 'success');
    goToStep(1);
    setTimeout(() => showPage('my-orders'), 1500);

  } catch(err) {
    console.error('placeOrder FAILED:', err);
    // Always show a visible, specific error
    const msg = err.message || 'Unknown error';
    showToast('Order failed: ' + msg, 'error');
    // Keep toast longer for errors
    setTimeout(() => {
      const t = document.getElementById('toast');
      if (t) t.classList.remove('show');
    }, 6000);
  } finally {
    window_placingOrder = false;
    if (btn) { btn.textContent = '✓ Place Order'; btn.disabled = false; }
  }
}

// ── Cancel order ──────────────────────────────────────────────────────────────
async function cancelOrder(orderId) {
  const o = ORDERS.find(x => x.id === orderId);
  if (!o) return;
  if (o.status !== 'pending') { showToast('Only pending orders can be cancelled', 'error'); return; }
  if (!confirm('Cancel order ' + orderId + '? This cannot be undone.')) return;
  try {
    await sb.patch('orders', 'order_number=eq.' + orderId, { status: 'cancelled' }, SESSION.token);
    o.status = 'cancelled';
    closeModal('modal-order');
    renderMyOrders('all');
    renderDashboard();
    showToast('Order ' + orderId + ' cancelled');
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}
