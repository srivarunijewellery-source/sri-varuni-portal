async function verifyPayment(orderId) {
  const o = ORDERS.find(x => x.id === orderId);
  if (!o) return;
  try {
    await sb.patch('orders', 'order_number=eq.' + orderId, { status: 'confirmed', payment_status: 'verified' }, SESSION.token);
    o.status = 'confirmed'; o.paymentStatus = 'verified';
    closeModal('modal-order');
    renderAdminPending();
    if (document.getElementById('page-admin-orders').classList.contains('active')) renderAdminOrders();
    showToast('Payment verified. Reseller notified!');
    const badge = document.getElementById('admin-order-badge');
    if (badge) badge.textContent = ORDERS.filter(o => ['pending','confirmed'].includes(o.status)).length;
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

async function saveTracking() {
  const num = document.getElementById('tracking-number').value.trim();
  const courier = document.getElementById('tracking-courier').value;
  const eta = document.getElementById('tracking-eta').value;
  if (!num) { showToast('Enter tracking number', 'error'); return; }

  const o = ORDERS.find(x => x.id === currentTrackingOrderId);
  if (!o) return;

  try {
    await sb.patch('orders', 'order_number=eq.' + currentTrackingOrderId, {
      tracking_number: num, courier, eta: eta || null, status: 'shipped'
    }, SESSION.token);
    o.tracking = num; o.courier = courier; o.status = 'shipped';
    closeModal('modal-tracking');
    renderAdminPending();
    if (document.getElementById('page-admin-orders').classList.contains('active')) renderAdminOrders();
    showToast('Tracking added! Reseller notified via WhatsApp.');
    const badge = document.getElementById('admin-order-badge');
    if (badge) badge.textContent = ORDERS.filter(o => ['pending','confirmed'].includes(o.status)).length;
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

async function addReseller() {
  const name = document.getElementById('ar-name').value.trim();
  const email = document.getElementById('ar-email').value.trim();
  const pass  = document.getElementById('ar-pass').value;
  const phone = document.getElementById('ar-phone').value.trim();
  const business = document.getElementById('ar-business').value.trim();
  const city  = document.getElementById('ar-city').value.trim();
  if (!name || !email) { showToast('Name and email are required', 'error'); return; }

  const btn = document.querySelector('#modal-add-reseller .btn-primary');
  btn.textContent = 'Creating...'; btn.disabled = true;

  try {
    const signupResult = await sb.signUp(email, pass || 'Varuni@123', { name, phone, business, city, role: 'reseller' });
    // Manually insert profile
    if (signupResult && (signupResult.user || signupResult.id)) {
      const uid = signupResult.user ? signupResult.user.id : signupResult.id;
      if (uid) {
        const adminUpsertUrl = SUPABASE_URL + '/rest/v1/profiles';
        await fetch(adminUpsertUrl, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SESSION.token,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({ id: uid, email, name, phone, business, city, role: 'reseller', status: 'active' })
        }).catch(() => {});
      }
    }
    await loadResellers();
    closeModal('modal-add-reseller');
    renderResellers();
    showToast('Reseller account created!');
  } catch(err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Create Account & Send Login'; btn.disabled = false;
  }
}

function openEditOrder(orderId) {
  const o = ORDERS.find(x => x.id === orderId);
  if (!o) return;
  document.getElementById('edit-order-id').value = orderId;
  document.getElementById('edit-cust-name').value    = o.customer || '';
  document.getElementById('edit-cust-phone').value   = o.phone    || '';
  document.getElementById('edit-cust-address').value = o.address  || '';
  document.getElementById('edit-cust-city').value    = o.city     || '';
  document.getElementById('edit-cust-state').value   = o.state    || '';
  document.getElementById('edit-cust-pin').value     = o.pin      || '';
  document.getElementById('edit-order-status').value = o.status   || 'pending';
  document.getElementById('edit-upi-txn').value      = o.upiTxn   || '';
  document.getElementById('edit-price').value        = o.price    || '';
  document.getElementById('edit-notes').value        = o.notes    || '';
  closeModal('modal-order');
  openModal('modal-edit-order');
}

async function saveEditOrder() {
  const orderId = document.getElementById('edit-order-id').value;
  const o = ORDERS.find(x => x.id === orderId);
  if (!o) return;

  const body = {
    customer_name:    document.getElementById('edit-cust-name').value.trim(),
    customer_phone:   document.getElementById('edit-cust-phone').value.trim(),
    customer_address: document.getElementById('edit-cust-address').value.trim(),
    customer_city:    document.getElementById('edit-cust-city').value.trim(),
    customer_state:   document.getElementById('edit-cust-state').value.trim(),
    customer_pin:     document.getElementById('edit-cust-pin').value.trim(),
    status:           document.getElementById('edit-order-status').value,
    upi_txn_id:       document.getElementById('edit-upi-txn').value.trim(),
    total_price:      parseInt(document.getElementById('edit-price').value) || o.price,
    notes:            document.getElementById('edit-notes').value.trim(),
  };

  const btn = document.querySelector('#modal-edit-order .btn-primary');
  btn.textContent = 'Saving...'; btn.disabled = true;

  try {
    await sb.patch('orders', 'order_number=eq.' + orderId, body, SESSION.token);
    // Update local cache
    Object.assign(o, {
      customer: body.customer_name, phone: body.customer_phone,
      address: body.customer_address, city: body.customer_city,
      state: body.customer_state, pin: body.customer_pin,
      status: body.status, upiTxn: body.upi_txn_id,
      price: body.total_price, notes: body.notes
    });
    closeModal('modal-edit-order');
    renderAdminOrders();
    renderAdminPending();
    showToast('Order updated successfully');
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
  finally { btn.textContent = 'Save Changes'; btn.disabled = false; }
}