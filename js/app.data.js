async function loadAllData() {
  try {
    await Promise.all([
      loadCatalog().catch(e => console.warn('Catalog load failed:', e)),
      loadOrders().catch(e => console.warn('Orders load failed:', e))
    ]);
    if (currentUser && currentUser.role === 'admin') {
      await loadResellers().catch(e => console.warn('Resellers load failed:', e));
    }
  } catch(e) { console.warn('loadAllData error:', e); }
}

async function loadCatalog() {
  try {
    const rows = await sb.get('catalog', 'order=sl_number.asc&select=*', SESSION && SESSION.token);
    CATALOG = {};
    rows.forEach(p => {
      CATALOG[p.sl_number] = {
        id: p.id, name: p.name, details: p.details, price: p.price,
        gst: p.gst_pct, stock: p.stock, status: p.status, image: p.image_url
      };
    });
    syncCatalogToProducts();
  } catch(e) { console.error('loadCatalog:', e); }
}

async function loadOrders() {
  try {
    let query = 'order=created_at.desc&select=*';
    if (currentUser && currentUser.role !== 'admin') {
      query += '&reseller_id=eq.' + (SESSION && SESSION.userId);
    }
    const rows = await sb.get('orders', query, SESSION && SESSION.token);
    console.log('loadOrders fetched', rows.length, 'orders');
    ORDERS = rows.map(r => ({
      id: r.order_number, _uuid: r.id,
      sl: r.items && r.items[0] ? r.items[0].sl : '',
      product: r.items && r.items.length > 1 ? r.items.length + ' items' : (r.items[0] ? r.items[0].name : ''),
      items: r.items || [],
      qty: (r.items || []).reduce((s, i) => s + i.qty, 0),
      price: r.total_price,
      reseller: r.reseller_name, resellerEmail: r.reseller_email,
      customer: r.customer_name, phone: r.customer_phone,
      address: r.customer_address, city: r.customer_city,
      state: r.customer_state, pin: r.customer_pin,
      status: r.status, tracking: r.tracking_number, courier: r.courier,
      date: r.created_at ? r.created_at.slice(0,10) : '',
      upiTxn: r.upi_txn_id, screenshotUrl: r.screenshot_url,
      paymentStatus: r.payment_status, notes: r.notes
    }));
  } catch(e) { console.error('loadOrders:', e); }
}

async function loadResellers() {
  try {
    // Fetch ALL resellers regardless of status (admin needs to see pending too)
    const rows = await sb.get('profiles', 'role=eq.reseller&select=*&order=created_at.desc', SESSION && SESSION.token);
    console.log('loadResellers fetched:', rows ? rows.length : 0, 'resellers', rows ? rows.map(r=>r.email+'/'+r.status).join(', ') : '');
    RESELLERS = rows.map(r => ({
      name: r.name, business: r.business, phone: r.phone,
      city: r.city, email: r.email, status: r.status || 'pending',
      orders: ORDERS.filter(o => o.resellerEmail === r.email).length
    }));
    // Update pending badge
    const pendingCount = RESELLERS.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('pending-resellers-badge');
    if (badge) badge.textContent = pendingCount;
  } catch(e) { console.error('loadResellers:', e); }
}

function syncCatalogToProducts() {
  Object.keys(CATALOG).forEach(function(sl) {
    var p = CATALOG[sl];
    if (p.status === 'active' && p.stock > 0) {
      PRODUCTS[sl] = { name: p.name, details: p.details, price: p.price, gst: p.gst, image: p.image || null };
    } else {
      delete PRODUCTS[sl];
    }
  });
}