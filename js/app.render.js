function renderDashboard() {
  const myOrders = ORDERS.filter(o => o.resellerEmail === currentUser?.email);
  
  // Update stat cards dynamically
  const total     = myOrders.length;
  const pending   = myOrders.filter(o => o.status === 'pending').length;
  const shipped   = myOrders.filter(o => o.status === 'shipped').length;
  const delivered = myOrders.filter(o => o.status === 'delivered').length;
  const thisMonth = myOrders.filter(o => {
    const d = new Date(o.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setStat('stat-total',     total);
  setStat('stat-pending',   pending);
  setStat('stat-shipped',   shipped);
  setStat('stat-delivered', delivered);
  setStat('stat-month',     thisMonth > 0 ? '↑ ' + thisMonth + ' this month' : '');

  // Update nav badge
  const badge = document.getElementById('nav-order-count');
  if (badge) badge.textContent = total;

  // Load credits balance
  if (SESSION && SESSION.userId) {
    sb.get('credits', 'reseller_id=eq.' + SESSION.userId + '&select=amount', SESSION.token)
      .then(rows => {
        const bal = rows ? rows.reduce((sum, r) => sum + (r.amount || 0), 0) : 0;
        setStat('stat-credits', '₹' + parseInt(bal).toLocaleString());
      }).catch(err => {
        console.warn('Credits fetch error:', err);
        setStat('stat-credits', '₹0');
      });
  }

  const tbody = document.getElementById('reseller-orders-tbody');
  tbody.innerHTML = myOrders.slice(0, 5).map(o => `
    <tr>
      <td><span style="font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size:12px; color:var(--purple-light);">${o.id}</span></td>
      <td><strong>${o.product}</strong></td>
      <td>${o.customer}</td>
      <td style="font-weight:600;">₹${o.price.toLocaleString()}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--text-light); font-size:12px;">${formatDate(o.date)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewOrder('${o.id}')">View</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7"><div class="empty-state"><p>No orders yet. Place your first order!</p></div></td></tr>';
}

function renderMyOrders(filter) {
  let orders = ORDERS.filter(o => o.resellerEmail === currentUser?.email);
  if (filter !== 'all') orders = orders.filter(o => o.status === filter);
  const tbody = document.getElementById('my-orders-tbody');
  if (!tbody) return;
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span style="font-family:monospace;font-size:12px;color:var(--purple-light);">${o.id}</span></td>
      <td>${o.product}</td>
      <td>${o.customer}</td>
      <td style="font-weight:600;">₹${o.price.toLocaleString()}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-size:12px;color:var(--text-light);font-family:monospace;">${o.tracking || '—'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewOrder('${o.id}')">View</button>
        <button class="btn btn-outline btn-sm" onclick="showInvoice('${o.id}')" style="margin-left:4px;">Invoice</button>
        ${o.status === 'pending' ? '<button class="btn btn-danger btn-sm" onclick="cancelOrder(\'' + o.id + '\')" style="margin-left:4px;">Cancel</button>' : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7"><div class="empty-state" style="padding:24px;"><p>No orders found.</p></div></td></tr>';
}

function filterOrders(filter, el) {
  document.querySelectorAll('#page-my-orders .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderMyOrders(filter);
}

function renderAdminPending() {
  const pending = ORDERS.filter(o => o.status === 'pending' || o.status === 'confirmed');

  // Update admin stat cards
  const now = new Date();
  const monthRevenue = ORDERS.filter(o => {
    const d = new Date(o.date || o.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, o) => sum + (o.price || 0), 0);

  const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setStat('admin-stat-total',     ORDERS.length);
  setStat('admin-stat-pending',   pending.length);
  setStat('admin-stat-revenue',   '₹' + monthRevenue.toLocaleString());
  setStat('admin-stat-resellers', RESELLERS.length);

  const badge = document.getElementById('admin-order-badge');
  if (badge) badge.textContent = pending.length;

  const tbody = document.getElementById('admin-pending-tbody');
  if (!tbody) return;
  tbody.innerHTML = pending.map(o => `
    <tr>
      <td><span style="font-family:monospace;font-size:12px;color:var(--purple-light);">${o.id}</span></td>
      <td>${o.reseller || '—'}</td>
      <td>${o.product}</td>
      <td style="font-weight:600;">₹${o.price.toLocaleString()}</td>
      <td>${statusBadge(o.status)}</td>
      <td>
        ${o.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="verifyPayment('${o.id}')">✓ Verify</button>` : ''}
        ${o.status === 'confirmed' ? `<button class="btn btn-primary btn-sm" onclick="openTracking('${o.id}')">+ Ship</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6"><div class="empty-state" style="padding:24px;"><p>All caught up!</p></div></td></tr>';
}

function renderAdminOrders() {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;
  tbody.innerHTML = ORDERS.map(o => `
    <tr>
      <td><span style="font-family:monospace;font-size:12px;color:var(--purple-light);">${o.id}</span></td>
      <td>${o.reseller || '—'}</td>
      <td>${o.product}</td>
      <td>${o.customer}</td>
      <td style="font-weight:600;">₹${o.price.toLocaleString()}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--text-light);font-size:12px;">${o.date ? formatDate(o.date) : '—'}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="viewOrder('${o.id}')">View</button>
        <button class="btn btn-outline btn-sm" onclick="openEditOrder('${o.id}')">Edit</button>
        <button class="btn btn-outline btn-sm" onclick="showInvoice('${o.id}')">Invoice</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8"><div class="empty-state" style="padding:24px;"><p>No orders yet.</p></div></td></tr>';
}

function searchOrders(q) {
  document.querySelectorAll('#admin-orders-tbody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function renderResellers() {
  const filtered = RESELLERS.filter(r => resellerFilter === 'pending'
    ? (r.status === 'pending' || r.status === 'suspended')
    : r.status === 'active'
  );

  const pendingCount = RESELLERS.filter(r => r.status === 'pending').length;
  const badge = document.getElementById('pending-resellers-badge');
  if (badge) badge.textContent = pendingCount;

  const tbody = document.getElementById('resellers-tbody');
  if (!tbody) return;
  tbody.innerHTML = filtered.map(r => {
    const isPending = r.status === 'pending' || r.status === 'suspended';
    return `<tr>
      <td><strong>${r.name || '—'}</strong></td>
      <td>${r.business || '—'}</td>
      <td style="font-family:monospace;font-size:12px;">${r.phone || '—'}</td>
      <td>${r.city || '—'}</td>
      <td><span class="badge badge-confirmed">${r.orders || 0}</span></td>
      <td>${isPending
        ? '<span class="badge badge-pending">Pending</span>'
        : '<span class="badge badge-delivered">Active</span>'}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        ${isPending
          ? `<button class="btn btn-success btn-sm" onclick="approveReseller('${r.email}')">&#10003; Approve</button>
             <button class="btn btn-danger btn-sm" onclick="rejectReseller('${r.email}')">&#215; Reject</button>`
          : `<button class="btn btn-outline btn-sm" onclick="viewResellerDetail('${r.email}')">View</button>
             <button class="btn btn-gold btn-sm" onclick="openIssueCredit('${r.email}')">+ Credit</button>`}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty-state" style="padding:24px;"><p>${resellerFilter === 'pending' ? 'No pending requests' : 'No active resellers'}</p></div></td></tr>`;
}