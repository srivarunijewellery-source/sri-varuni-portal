// ── Global order state ──────────────────────────────────────────────────────
var orderCart            = [];
var uploadedScreenshots  = [];
var shipToSelfOn         = false;
var applyCreditToOrder   = false;
var resellerCreditBalance = 0;
var window_placingOrder  = false;
var currentTrackingOrderId = null;

// ── Cart helpers ─────────────────────────────────────────────────────────────
function cartTotal() {
  return orderCart.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
}

function renderCart() {
  var empty = document.getElementById('cart-empty');
  var wrap  = document.getElementById('cart-table-wrap');
  var tbody = document.getElementById('cart-tbody');
  var tot   = document.getElementById('cart-total');
  if (!empty || !wrap || !tbody) return;
  if (orderCart.length === 0) {
    empty.style.display = 'block';
    wrap.style.display  = 'none';
    if (tot) tot.textContent = '₹0';
    return;
  }
  empty.style.display = 'none';
  wrap.style.display  = 'block';
  var total = 0;
  tbody.innerHTML = orderCart.map(function(item, i) {
    var lt = item.price * item.qty;
    total += lt;
    return '<tr>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;width:52px;">' +
        (item.image
          ? '<img src="'+item.image+'" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">'
          : '<div style="width:40px;height:40px;border-radius:6px;background:#3d2456;display:flex;align-items:center;justify-content:center;color:#c9a96e;font-size:18px;">◆</div>') +
      '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;font-family:monospace;font-size:11px;color:#5a3578;">' + item.sl + '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #f0eaf7;">' +
        '<div style="font-size:13px;font-weight:600;color:#1a0f2e;">' + item.name + '</div>' +
        '<div style="font-size:11px;color:#8b7aa0;">' + (item.details||'') + '</div>' +
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

// ── Product lookup & add ─────────────────────────────────────────────────────
function quickFill(sl) {
  document.getElementById('product-sl').value = sl;
  lookupAndAdd();
}

function lookupAndAdd() {
  var sl  = (document.getElementById('product-sl').value || '').trim().toUpperCase();
  var qty = parseInt(document.getElementById('add-qty').value) || 1;
  if (!sl) { showToast('Enter a product SL number', 'error'); return; }

  // If PRODUCTS is empty, catalog may not have loaded yet — try re-sync
  if (Object.keys(PRODUCTS).length === 0 && Object.keys(CATALOG).length > 0) {
    syncCatalogToProducts();
  }

  var prod = PRODUCTS[sl];
  if (!prod) {
    // Give a more helpful message: tell them if catalog is empty vs product not found
    if (Object.keys(PRODUCTS).length === 0) {
      showToast('Catalog is still loading — please wait a moment and try again', 'error');
    } else {
      showToast('Product not found: ' + sl, 'error');
    }
    return;
  }
  var ex = orderCart.find(function(i) { return i.sl === sl; });
  if (ex) {
    ex.qty += qty;
    showToast('Updated qty for ' + prod.name);
  } else {
    orderCart.push({ sl: sl, name: prod.name, details: prod.details||'', price: prod.price, qty: qty, image: prod.image||null });
    showToast('Added: ' + prod.name);
  }
  document.getElementById('product-sl').value = '';
  document.getElementById('add-qty').value = '1';
  renderCart();
}

// ── Screenshot upload ─────────────────────────────────────────────────────────
function handleUpload(input) {
  if (!input.files || !input.files.length) return;
  Array.from(input.files).forEach(function(file) {
    if (!file.type.startsWith('image/')) { showToast('Only image files allowed', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast(file.name + ' is too large (max 10MB)', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
      uploadedScreenshots.push({ file: file, dataUrl: ev.target.result, name: file.name });
      renderScreenshotGrid();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderScreenshotGrid() {
  var grid = document.getElementById('screenshots-grid');
  if (!grid) return;
  if (uploadedScreenshots.length === 0) { grid.style.display = 'none'; grid.innerHTML = ''; return; }
  grid.style.display = 'flex';
  grid.innerHTML = uploadedScreenshots.map(function(ss, i) {
    return '<div style="position:relative;width:80px;height:80px;flex-shrink:0;">' +
      '<img src="' + ss.dataUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #2d7a4f;">' +
      '<button onclick="removeScreenshot(' + i + ')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#9b1c1c;color:#fff;border:none;cursor:pointer;font-size:11px;line-height:1;">✕</button>' +
      '</div>';
  }).join('') +
  '<div onclick="document.getElementById(\'upi-screenshot-input\').click()" style="width:80px;height:80px;border:2px dashed #e8d5f0;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#8b7aa0;font-size:11px;gap:4px;">+<div>Add</div></div>';
}

function removeScreenshot(i) {
  uploadedScreenshots.splice(i, 1);
  renderScreenshotGrid();
}

// ── Ship-to-self toggle ───────────────────────────────────────────────────────
function toggleShipToSelf() {
  shipToSelfOn = !shipToSelfOn;
  var toggle = document.getElementById('ship-self-toggle');
  var knob   = document.getElementById('ship-self-knob');
  if (shipToSelfOn) {
    if (toggle) toggle.style.background = 'var(--ok)';
    if (knob)   knob.style.transform    = 'translateX(18px)';
    var u = currentUserProfile || {};
    document.getElementById('cust-name').value    = u.name    || '';
    document.getElementById('cust-phone').value   = u.phone   || '';
    document.getElementById('cust-address').value = u.address || '';
    document.getElementById('cust-city').value    = u.city    || '';
    document.getElementById('cust-state').value   = u.state   || '';
    document.getElementById('cust-pin').value     = u.pin     || '';
    if (!u.address) showToast('Add your address in My Profile first', 'error');
    else showToast('Address auto-filled from your profile');
  } else {
    if (toggle) toggle.style.background = 'var(--border)';
    if (knob)   knob.style.transform    = 'translateX(0)';
    ['cust-name','cust-phone','cust-address','cust-city','cust-state','cust-pin'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
  }
}

// ── Credit toggle ─────────────────────────────────────────────────────────────
function toggleApplyCredit() {
  applyCreditToOrder = !applyCreditToOrder;
  var toggle = document.getElementById('credit-apply-toggle');
  var knob   = document.getElementById('credit-apply-knob');
  var label  = document.getElementById('credit-apply-label');
  var row    = document.getElementById('credit-apply-amount-row');
  if (toggle) { toggle.style.background = applyCreditToOrder ? '#059669' : '#d1fae5'; toggle.style.borderColor = applyCreditToOrder ? '#059669' : '#6ee7b7'; }
  if (knob)   knob.style.transform  = applyCreditToOrder ? 'translateX(20px)' : 'translateX(0)';
  if (label)  label.textContent     = applyCreditToOrder ? 'Applied ✓' : 'Apply';
  if (row)    row.style.display     = applyCreditToOrder ? 'flex' : 'none';
  if (applyCreditToOrder) {
    var inp = document.getElementById('credit-apply-input');
    if (inp) inp.value = Math.min(resellerCreditBalance || 0, cartTotal());
  }
  updatePaymentAmountDisplay();
}

function updatePaymentAmountDisplay() {
  var total      = cartTotal();
  var balance    = (typeof resellerCreditBalance === 'number' && !isNaN(resellerCreditBalance)) ? resellerCreditBalance : 0;
  var inp        = document.getElementById('credit-apply-input');
  var creditUsed = applyCreditToOrder ? Math.min(parseInt((inp && inp.value) || 0) || 0, balance, total) : 0;
  var payable    = Math.max(0, total - creditUsed);
  var pamount    = document.getElementById('payment-amount');
  if (pamount) {
    if (creditUsed > 0) {
      pamount.innerHTML = '₹' + payable.toLocaleString() +
        ' <span style="font-size:13px;font-weight:400;color:#059669;">(-₹' + creditUsed.toLocaleString() + ' credit applied)</span>';
    } else {
      pamount.textContent = '₹' + payable.toLocaleString();
    }
  }
}

// ── Step navigation ───────────────────────────────────────────────────────────
function goToStep(step) {
  try {
    // Step 2 guard: need at least one product
    if (step === 2 && orderCart.length === 0) {
      showToast('Add at least one product first', 'error');
      return;
    }

    // Step 3 guard: validate customer fields
    if (step === 3) {
      var custName    = document.getElementById('cust-name');
      var custAddress = document.getElementById('cust-address');
      var custPin     = document.getElementById('cust-pin');
      if (!custName || !custName.value.trim())       { showToast('Enter customer name', 'error'); return; }
      if (!custAddress || !custAddress.value.trim()) { showToast('Enter delivery address', 'error'); return; }
      if (!custPin || !custPin.value.trim())         { showToast('Enter pincode', 'error'); return; }

      // Update payment display — wrapped so credit errors never block navigation
      try {
        var total   = cartTotal();
        var pamount = document.getElementById('payment-amount');
        if (pamount) pamount.textContent = '₹' + total.toLocaleString();

        var balance       = (typeof resellerCreditBalance === 'number' && !isNaN(resellerCreditBalance)) ? resellerCreditBalance : 0;
        var creditSection = document.getElementById('credit-apply-section');
        if (creditSection) {
          if (balance > 0) {
            creditSection.style.display = 'block';
            var creditAvail = document.getElementById('credit-avail-amount');
            var creditMax   = document.getElementById('credit-apply-max');
            if (creditAvail) creditAvail.textContent = '₹' + balance.toLocaleString();
            if (creditMax)   creditMax.textContent   = Math.min(balance, total).toLocaleString();
            var cinp = document.getElementById('credit-apply-input');
            if (cinp) cinp.max = Math.min(balance, total);
          } else {
            creditSection.style.display = 'none';
          }
        }
        updatePaymentAmountDisplay();
      } catch(creditErr) {
        console.warn('Credit display error (non-fatal):', creditErr);
      }
    }

    // Step 4 guard: require screenshot + UPI txn
    if (step === 4) {
      if (!uploadedScreenshots || uploadedScreenshots.length === 0) {
        showToast('Please upload at least one payment screenshot', 'error'); return;
      }
      var upiTxn = document.getElementById('upi-txn');
      if (!upiTxn || !upiTxn.value.trim()) {
        showToast('Please enter the UPI Transaction ID', 'error'); return;
      }

      // Populate confirm screen
      try {
        var total2    = cartTotal();
        var confItems = document.getElementById('conf-items-list');
        if (confItems) {
          confItems.innerHTML = orderCart.map(function(item) {
            return '<div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #e8d5f0;">' +
              '<div><span style="font-family:monospace;font-size:11px;color:#5a3578;">' + item.sl + '</span>' +
              '<span style="font-size:13px;font-weight:500;margin-left:10px;color:#1a0f2e;">' + item.name + '</span></div>' +
              '<div style="font-size:13px;color:#4a3560;">' + item.qty + ' × ₹' + item.price.toLocaleString() +
              ' = <strong style="color:#2d1b3d;">₹' + (item.qty * item.price).toLocaleString() + '</strong></div></div>';
          }).join('');
        }
        var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val || '—'; };
        set('conf-amount', '₹' + total2.toLocaleString());
        set('conf-cname',  (document.getElementById('cust-name')?.value    || ''));
        set('conf-cphone', (document.getElementById('cust-phone')?.value   || ''));
        set('conf-caddr',  (document.getElementById('cust-address')?.value || '') + ', ' +
                           (document.getElementById('cust-city')?.value    || '') + ' - ' +
                           (document.getElementById('cust-state')?.value   || ''));
        set('conf-cpin',   (document.getElementById('cust-pin')?.value     || ''));
      } catch(confErr) {
        console.warn('Confirm screen error (non-fatal):', confErr);
      }
    }

    // Switch step visibility
    for (var i = 1; i <= 4; i++) {
      var el  = document.getElementById('order-step-' + i);
      var dot = document.getElementById('step-' + i);
      if (el)  el.style.display = (i === step) ? 'block' : 'none';
      if (dot) {
        dot.className = 'step' + (i < step ? ' done' : i === step ? ' active' : '');
        var num = dot.querySelector('.step-num');
        if (num) num.textContent = i < step ? '✓' : String(i);
      }
    }

    // Scroll to top of order steps
    var orderSteps = document.getElementById('order-steps');
    if (orderSteps) orderSteps.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch(err) {
    console.error('goToStep error:', err);
    showToast('Navigation error: ' + err.message, 'error');
  }
}

// ── Place order ───────────────────────────────────────────────────────────────
async function placeOrder() {
  if (window_placingOrder) { showToast('Order is being placed, please wait...'); return; }
  window_placingOrder = true;
  var btn = document.querySelector('#order-step-4 .btn-primary');
  if (btn) { btn.textContent = 'Placing...'; btn.disabled = true; }
  try {
    var screenshotUrl = null;
    if (uploadedScreenshots.length > 0 && SESSION) {
      var urls = [];
      for (var ss of uploadedScreenshots) {
        try {
          var blob = await (await fetch(ss.dataUrl)).blob();
          var path = SESSION.userId + '/' + Date.now() + '_' + ss.name;
          var url  = await sb.uploadFile('screenshots', path, blob, SESSION.token);
          urls.push(url);
        } catch(ex) { console.warn('Screenshot upload failed:', ex.message); }
      }
      if (urls.length) screenshotUrl = urls.join(',');
    }
    var balance    = (typeof resellerCreditBalance === 'number' && !isNaN(resellerCreditBalance)) ? resellerCreditBalance : 0;
    var cinpEl     = document.getElementById('credit-apply-input');
    var creditUsed = applyCreditToOrder ? Math.min(parseInt((cinpEl && cinpEl.value) || 0) || 0, balance, cartTotal()) : 0;

    var body = {
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
      notes:            (document.getElementById('order-notes')?.value || '').trim(),
      status:           'pending',
      payment_status:   'pending',
      credit_applied:   creditUsed
    };
    await sb.post('orders', body, SESSION.token);
    await loadOrders();

    // Reset everything
    orderCart = [];
    uploadedScreenshots = [];
    shipToSelfOn = false;
    ['cust-name','cust-phone','cust-address','cust-city','cust-state','cust-pin','upi-txn','order-notes'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    var t = document.getElementById('ship-self-toggle');
    var k = document.getElementById('ship-self-knob');
    if (t) t.style.background = '#e8d5f0';
    if (k) k.style.transform = 'translateX(0)';
    renderCart();
    renderScreenshotGrid();
    var badge = document.getElementById('nav-order-count');
    if (badge) badge.textContent = ORDERS.filter(function(o) { return o.resellerEmail === currentUser.email; }).length;

    // Deduct credit if applied
    if (applyCreditToOrder && creditUsed > 0) {
      sb.post('credits', {
        reseller_id: SESSION.userId,
        amount: -creditUsed,
        note: 'Credit applied to order ' + (ORDERS[0]?.id || ''),
        issued_by: SESSION.userId
      }, SESSION.token).catch(function(e) { console.warn('Credit deduction failed:', e); });
      resellerCreditBalance = Math.max(0, (resellerCreditBalance || 0) - creditUsed);
      var statEl = document.getElementById('stat-credits');
      if (statEl) statEl.textContent = '₹' + resellerCreditBalance.toLocaleString();
    }
    applyCreditToOrder = false;

    showToast('Order placed! Awaiting payment verification.');
    goToStep(1);
    setTimeout(function() { showPage('my-orders'); }, 1200);
  } catch(err) {
    console.error('placeOrder error:', err);
    showToast('Failed: ' + (err.message || 'Please try again'), 'error');
  } finally {
    window_placingOrder = false;
    if (btn) { btn.textContent = '✓ Place Order'; btn.disabled = false; }
  }
}

// ── Cancel order ──────────────────────────────────────────────────────────────
async function cancelOrder(orderId) {
  var o = ORDERS.find(function(x) { return x.id === orderId; });
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
