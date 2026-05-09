function quickFill(sl) {
  document.getElementById('product-sl').value = sl;
  lookupAndAdd();
}

function lookupAndAdd() {
  const sl  = (document.getElementById('product-sl').value || '').trim().toUpperCase();
  const qty = parseInt(document.getElementById('add-qty').value) || 1;
  if (!sl) { showToast('Enter a product SL number', 'error'); return; }
  const prod = PRODUCTS[sl];
  if (!prod) { showToast('Product not found: ' + sl, 'error'); return; }
  const ex = orderCart.find(i => i.sl === sl);
  if (ex) { ex.qty += qty; showToast('Updated qty for ' + prod.name); }
  else { orderCart.push({ sl, name: prod.name, details: prod.details||'', price: prod.price, qty, image: prod.image||null }); showToast('Added: ' + prod.name); }
  document.getElementById('product-sl').value = '';
  document.getElementById('add-qty').value = '1';
  renderCart();
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
    return '<tr>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;width:52px;">' +
        (item.image ? '<img src="'+item.image+'" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">' :
        '<div style="width:40px;height:40px;border-radius:6px;background:#3d2456;display:flex;align-items:center;justify-content:center;color:#c9a96e;font-size:18px;">◆</div>') +
      '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;font-family:monospace;font-size:11px;color:#5a3578;">' + item.sl + '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;">' +
        '<div style="font-size:13px;font-weight:600;color:#1a0f2e;">' + item.name + '</div>' +
        '<div style="font-size:11px;color:#8b7aa0;">' + item.details + '</div>' +
      '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:center;">' +
        '<button onclick="cartQty('+i+',-1)" style="border:1px solid #e8d5f0;background:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:14px;">−</button> ' +
        '<strong style="color:#1a0f2e;">' + item.qty + '</strong> ' +
        '<button onclick="cartQty('+i+',1)"  style="border:1px solid #e8d5f0;background:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:14px;">+</button>' +
      '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:right;color:#4a3560;">₹' + item.price.toLocaleString() + '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:right;font-weight:700;color:#2d1b3d;">₹' + lt.toLocaleString() + '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;text-align:center;">' +
        '<button onclick="removeCartItem('+i+')" style="border:none;background:#fee2e2;color:#9b1c1c;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;">✕</button>' +
      '</td></tr>';
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

function cartTotal() {
  return orderCart.reduce((s, i) => s + i.price * i.qty, 0);
}

function handleUpload(input) {
  if (!input.files || !input.files.length) return;
  Array.from(input.files).forEach(file => {
    if (!file.type.startsWith('image/')) { showToast('Only image files', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast(file.name + ' too large', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
      uploadedScreenshots.push({ file, dataUrl: ev.target.result, name: file.name });
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
    '<div style="position:relative;width:80px;height:80px;flex-shrink:0;">' +
    '<img src="' + ss.dataUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #2d7a4f;">' +
    '<button onclick="removeScreenshot(' + i + ')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#9b1c1c;color:#fff;border:none;cursor:pointer;font-size:11px;line-height:1;">✕</button>' +
    '</div>'
  ).join('') +
  '<div onclick="document.getElementById(\'upi-screenshot-input\').click()" style="width:80px;height:80px;border:2px dashed #e8d5f0;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#8b7aa0;font-size:11px;gap:4px;">+<div>Add</div></div>';
}

function removeScreenshot(i) {
  uploadedScreenshots.splice(i, 1);
  renderScreenshotGrid();
}

function toggleApplyCredit() {
  applyCreditToOrder = !applyCreditToOrder;
  const toggle = document.getElementById('credit-apply-toggle');
  const knob   = document.getElementById('credit-apply-knob');
  const label  = document.getElementById('credit-apply-label');
  const row    = document.getElementById('credit-apply-amount-row');
  if (toggle) toggle.style.background = applyCreditToOrder ? '#059669' : '#d1fae5';
  if (toggle) toggle.style.borderColor = applyCreditToOrder ? '#059669' : '#6ee7b7';
  if (knob)   knob.style.transform = applyCreditToOrder ? 'translateX(20px)' : 'translateX(0)';
  if (label)  label.textContent = applyCreditToOrder ? 'Applied ✓' : 'Apply';
  if (row)    row.style.display = applyCreditToOrder ? 'flex' : 'none';
  if (applyCreditToOrder) {
    const total = cartTotal();
    const inp = document.getElementById('credit-apply-input');
    if (inp) inp.value = Math.min(resellerCreditBalance, total);
  }
  // Update payment amount display
  updatePaymentAmountDisplay();
}

function updatePaymentAmountDisplay() {
  const total = cartTotal();
  const creditUsed = applyCreditToOrder ? 
    Math.min(parseInt(document.getElementById('credit-apply-input')?.value || 0) || 0, resellerCreditBalance, total) : 0;
  const payable = Math.max(0, total - creditUsed);
  const pamount = document.getElementById('payment-amount');
  if (pamount) {
    pamount.textContent = '₹' + payable.toLocaleString();
    if (creditUsed > 0) {
      pamount.innerHTML = '₹' + payable.toLocaleString() + 
        ' <span style="font-size:13px;font-weight:400;color:#059669;">(-₹' + creditUsed.toLocaleString() + ' credit applied)</span>';
    }
  }
}

function goToStep(step) {
  if (step === 2 && orderCart.length === 0) { showToast('Add at least one product first', 'error'); return; }
  if (step === 3) {
    if (!document.getElementById('cust-name').value.trim())    { showToast('Enter customer name', 'error'); return; }
    if (!document.getElementById('cust-address').value.trim()) { showToast('Enter delivery address', 'error'); return; }
    if (!document.getElementById('cust-pin').value.trim())     { showToast('Enter pincode', 'error'); return; }
    const total = cartTotal();
    const pamount = document.getElementById('payment-amount');
    if (pamount) pamount.textContent = '₹' + total.toLocaleString();
    // Show credit apply section if balance > 0
    const creditSection = document.getElementById('credit-apply-section');
    const creditAvail = document.getElementById('credit-avail-amount');
    const creditMax = document.getElementById('credit-apply-max');
    if (creditSection) {
      if (resellerCreditBalance > 0) {
        creditSection.style.display = 'block';
        if (creditAvail) creditAvail.textContent = '₹' + resellerCreditBalance.toLocaleString();
        if (creditMax) creditMax.textContent = Math.min(resellerCreditBalance, total).toLocaleString();
        const inp = document.getElementById('credit-apply-input');
        if (inp) inp.max = Math.min(resellerCreditBalance, total);
      } else {
        creditSection.style.display = 'none';
      }
    }
  }
  if (step === 4) {
    if (uploadedScreenshots.length === 0) { showToast('Please upload at least one payment screenshot', 'error'); return; }
    if (!document.getElementById('upi-txn').value.trim()) { showToast('Please enter the UPI Transaction ID', 'error'); return; }
    const total = cartTotal();
    const confItems = document.getElementById('conf-items-list');
    if (confItems) {
      confItems.innerHTML = orderCart.map(item =>
        '<div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #e8d5f0;">' +
        '<div><span style="font-family:monospace;font-size:11px;color:#5a3578;">' + item.sl + '</span>' +
        '<span style="font-size:13px;font-weight:500;margin-left:10px;color:#1a0f2e;">' + item.name + '</span></div>' +
        '<div style="font-size:13px;color:#4a3560;">' + item.qty + ' × ₹' + item.price.toLocaleString() +
        ' = <strong style="color:#2d1b3d;">₹' + (item.qty*item.price).toLocaleString() + '</strong></div></div>'
      ).join('');
    }
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val||'—'; };
    set('conf-amount', '₹' + total.toLocaleString());
    set('conf-cname',  document.getElementById('cust-name').value);
    set('conf-cphone', document.getElementById('cust-phone').value);
    set('conf-caddr',  document.getElementById('cust-address').value + ', ' + document.getElementById('cust-city').value + ' - ' + document.getElementById('cust-state').value);
    set('conf-cpin',   document.getElementById('cust-pin').value);
  }
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('order-step-' + i);
    if (el) el.style.display = (i === step) ? 'block' : 'none';
    const dot = document.getElementById('step-' + i);
    if (dot) {
      dot.className = 'step' + (i < step ? ' done' : i === step ? ' active' : '');
      const num = dot.querySelector('.step-num');
      if (num) num.textContent = i < step ? '✓' : i;
    }
  }
}

async function placeOrder() {
  if (window_placingOrder) { showToast('Order is being placed, please wait...'); return; }
  window_placingOrder = true;
  const btn = document.querySelector('#order-step-4 .btn-primary');
  if (btn) { btn.textContent = 'Placing...'; btn.disabled = true; }
  try {
    let screenshotUrl = null;
    if (uploadedScreenshots.length > 0 && SESSION) {
      const urls = [];
      for (const ss of uploadedScreenshots) {
        try {
          const blob = await (await fetch(ss.dataUrl)).blob();
          const path = SESSION.userId + '/' + Date.now() + '_' + ss.name;
          const url  = await sb.uploadFile('screenshots', path, blob, SESSION.token);
          urls.push(url);
        } catch(ex) { console.warn('Screenshot upload failed:', ex.message); }
      }
      if (urls.length) screenshotUrl = urls.join(',');
    }
    const body = {
      reseller_id:      SESSION.userId,
      reseller_name:    currentUser.name,
      reseller_email:   currentUser.email,
      customer_name:    document.getElementById('cust-name').value,
      customer_phone:   document.getElementById('cust-phone').value,
      customer_address: document.getElementById('cust-address').value,
      customer_city:    document.getElementById('cust-city').value,
      customer_state:   document.getElementById('cust-state').value,
      customer_pin:     document.getElementById('cust-pin').value,
      items:            JSON.parse(JSON.stringify(orderCart)),
      total_price:      cartTotal(),
      upi_txn_id:       document.getElementById('upi-txn').value.trim(),
      screenshot_url:   screenshotUrl,
      notes:            (document.getElementById('order-notes').value||'').trim(),
      status:           'pending',
      payment_status:   'pending',
      credit_applied:   applyCreditToOrder ? (parseInt(document.getElementById('credit-apply-input')?.value||0)||0) : 0
    };
    await sb.post('orders', body, SESSION.token);
    await loadOrders();
    // Reset everything
    orderCart = [];
    uploadedScreenshots = [];
    shipToSelfOn = false;
    ['cust-name','cust-phone','cust-address','cust-city','cust-state','cust-pin','upi-txn','order-notes'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value='';
    });
    const t = document.getElementById('ship-self-toggle');
    const k = document.getElementById('ship-self-knob');
    if(t) t.style.background='#e8d5f0';
    if(k) k.style.transform='translateX(0)';
    renderCart();
    renderScreenshotGrid();
    const badge = document.getElementById('nav-order-count');
    if (badge) badge.textContent = ORDERS.filter(o => o.resellerEmail === currentUser.email).length;
    // Deduct credit if applied
    if (applyCreditToOrder) {
      const creditUsed = parseInt(document.getElementById('credit-apply-input')?.value||0)||0;
      if (creditUsed > 0) {
        sb.post('credits', {
          reseller_id: SESSION.userId,
          amount: -creditUsed,
          note: 'Credit applied to order ' + (ORDERS[0]?.id || ''),
          issued_by: SESSION.userId
        }, SESSION.token).catch(e => console.warn('Credit deduction failed:', e));
        resellerCreditBalance = Math.max(0, resellerCreditBalance - creditUsed);
        setStat('stat-credits', '₹' + resellerCreditBalance.toLocaleString());
      }
      applyCreditToOrder = false;
    }
    showToast('Order placed! Awaiting payment verification.');
    goToStep(1);
    setTimeout(() => showPage('my-orders'), 1200);
  } catch(err) {
    console.error('placeOrder error:', err);
    showToast('Failed: ' + (err.message||'Please try again'), 'error');
  } finally {
    window_placingOrder = false;
    if (btn) { btn.textContent = '✓ Place Order'; btn.disabled = false; }
  }
}

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

function toggleShipToSelf() {
  shipToSelfOn = !shipToSelfOn;
  var toggle = document.getElementById('ship-self-toggle');
  var knob   = document.getElementById('ship-self-knob');
  if (shipToSelfOn) {
    toggle.style.background = 'var(--ok)';
    knob.style.transform = 'translateX(18px)';
    // Auto-fill from currentUserProfile (Supabase)
    var u = currentUserProfile || {};
    document.getElementById('cust-name').value    = u.name    || '';
    document.getElementById('cust-phone').value   = u.phone   || '';
    document.getElementById('cust-address').value = u.address || '';
    document.getElementById('cust-city').value    = u.city    || '';
    document.getElementById('cust-state').value   = u.state   || '';
    document.getElementById('cust-pin').value     = u.pin     || '';
    if (!u.address) showToast('Add your address in My Profile first — go to My Profile', 'error');
    else showToast('Address auto-filled from your profile');
  } else {
    toggle.style.background = 'var(--border)';
    knob.style.transform = 'translateX(0)';
    document.getElementById('cust-name').value    = '';
    document.getElementById('cust-phone').value   = '';
    document.getElementById('cust-address').value = '';
    document.getElementById('cust-city').value    = '';
    document.getElementById('cust-state').value   = '';
    document.getElementById('cust-pin').value     = '';
  }
}