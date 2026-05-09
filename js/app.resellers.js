function filterResellers(filter, el) {
  resellerFilter = filter;
  document.querySelectorAll('#page-admin-resellers .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderResellers();
}

async function approveReseller(email) {
  try {
    await sb.patch('profiles', 'email=eq.' + email, { status: 'active' }, SESSION.token);
    const r = RESELLERS.find(x => x.email === email);
    if (r) r.status = 'active';
    renderResellers();
    showToast('Reseller approved — they can now log in');
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

async function rejectReseller(email) {
  if (!confirm('Reject reseller request for ' + email + '?')) return;
  try {
    await sb.patch('profiles', 'email=eq.' + email, { status: 'suspended' }, SESSION.token);
    const idx = RESELLERS.findIndex(x => x.email === email);
    if (idx > -1) RESELLERS.splice(idx, 1);
    renderResellers();
    showToast('Reseller request rejected');
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

function openIssueCredit(email) {
  currentCreditReseller = RESELLERS.find(r => r.email === email);
  if (!currentCreditReseller) return;
  document.getElementById('credit-reseller-name').textContent = currentCreditReseller.name || email;
  document.getElementById('credit-amount').value = '';
  document.getElementById('credit-note').value = '';
  openModal('modal-credit');
}

async function saveCredit() {
  const amount = parseInt(document.getElementById('credit-amount').value);
  const note   = document.getElementById('credit-note').value.trim();
  if (!amount || amount === 0) { showToast('Enter a valid amount', 'error'); return; }
  if (!currentCreditReseller) return;
  const btn = document.querySelector('#modal-credit .btn-primary');
  btn.textContent = 'Issuing...'; btn.disabled = true;
  try {
    console.log('saveCredit: looking up profile for', currentCreditReseller.email);
    // Get reseller profile
    const rProfiles = await sb.get('profiles', 'email=eq.' + encodeURIComponent(currentCreditReseller.email) + '&select=id,email', SESSION.token);
    console.log('saveCredit: profiles result:', JSON.stringify(rProfiles));
    if (!rProfiles || !rProfiles.length) throw new Error('Reseller profile not found. Run fix-credits-rls.sql in Supabase first.');
    const resellerId = rProfiles[0].id;
    console.log('saveCredit: inserting credit for resellerId:', resellerId, 'amount:', amount);
    // Insert credit directly via fetch for full error visibility
    const creditUrl = SUPABASE_URL + '/rest/v1/credits';
    const creditRes = await fetch(creditUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SESSION.token,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        reseller_id: resellerId,
        amount: amount,
        note: note || (amount > 0 ? 'Credit issued by admin' : 'Credit deducted by admin'),
        issued_by: SESSION.userId
      })
    });
    const creditText = await creditRes.text();
    console.log('saveCredit: insert response', creditRes.status, creditText);
    if (!creditRes.ok && creditRes.status !== 201) throw new Error('Credit insert failed: ' + creditText);
    closeModal('modal-credit');
    showToast((amount > 0 ? '₹' + amount + ' credit issued to ' : '₹' + Math.abs(amount) + ' deducted from ') + currentCreditReseller.name);
  } catch(err) { 
    console.error('saveCredit error:', err);
    showToast('Failed: ' + err.message, 'error'); 
  }
  finally { btn.textContent = 'Issue Credit'; btn.disabled = false; }
}

async function loadResellerCredits(resellerId) {
  try { 
    const rows = await sb.get('credits', 'reseller_id=eq.' + resellerId + '&order=created_at.desc&select=*', SESSION.token);
    return rows || [];
  }
  catch(e) { console.warn('loadResellerCredits:', e.message); return []; }
}

async function viewResellerDetail(email) {
  const r = RESELLERS.find(x => x.email === email);
  if (!r) return;
  const profiles = await sb.get('profiles', 'email=eq.' + email + '&select=*', SESSION.token).catch(() => []);
  const profile = profiles[0] || {};
  const resellerOrders = ORDERS.filter(o => o.resellerEmail === email);
  const totalRevenue = resellerOrders.reduce((s, o) => s + o.price, 0);
  const credits = profile.id ? await loadResellerCredits(profile.id) : [];
  const creditBalance = credits.reduce((s, cr) => s + cr.amount, 0);
  const since = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—';

  document.getElementById('reseller-detail-body').innerHTML =
    '<div style="background:linear-gradient(135deg,var(--purple-dark),var(--purple-mid));border-radius:var(--radius);padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px;">' +
    '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--goldl));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--pd);flex-shrink:0;">' + (r.name||'R').charAt(0).toUpperCase() + '</div>' +
    '<div style="flex:1;"><div style="font-size:18px;font-weight:700;color:#fff;">' + (r.name||'—') + '</div><div style="font-size:12px;color:rgba(255,255,255,.5);">' + (r.business||'') + (r.city?' &middot; '+r.city:'') + '</div></div>' +
    '<span class="badge ' + (r.status==='active'?'badge-delivered':'badge-pending') + '">' + (r.status==='active'?'Active':'Pending') + '</span>' +
    '<button class="btn btn-gold btn-sm" onclick="closeModal(\'modal-reseller-detail\');openIssueCredit(\'' + email + '\')">+ Issue Credit</button></div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">' +
    [['Total Orders', resellerOrders.length, 'var(--pd)'],['Revenue', '₹'+totalRevenue.toLocaleString(), 'var(--ok)'],['Pending', resellerOrders.filter(o=>o.status==='pending').length, 'var(--warning)'],['Credits', '₹'+creditBalance.toLocaleString(), creditBalance>=0?'var(--ok)':'var(--err)']].map(([l,v,col]) =>
      '<div style="background:#faf8fc;border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">' +
      '<div style="font-size:20px;font-weight:700;color:'+col+';">'+v+'</div>' +
      '<div style="font-size:11px;color:var(--tl);margin-top:2px;">'+l+'</div></div>'
    ).join('') + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">' +
    // Contact
    '<div class="card"><div class="card-header" style="padding:12px 18px;"><h3 class="card-title" style="font-size:14px;">Contact</h3></div><div style="padding:12px 18px;">' +
    '<div class="info-row"><label>Email</label><span style="font-size:12px;">'+r.email+'</span></div>' +
    '<div class="info-row"><label>Phone</label><span>'+(r.phone||'—')+'</span></div>' +
    '<div class="info-row"><label>City</label><span>'+(r.city||'—')+'</span></div>' +
    '<div class="info-row"><label>Since</label><span>'+since+'</span></div>' +
    '<div class="info-row"><label>GST</label><span style="font-family:monospace;font-size:12px;">'+(profile.gst||'—')+'</span></div>' +
    '</div></div>' +
    // Credits history
    '<div class="card"><div class="card-header" style="padding:12px 18px;"><h3 class="card-title" style="font-size:14px;">Credits History</h3></div><div style="padding:0 18px;max-height:200px;overflow-y:auto;">' +
    (credits.length ? credits.map(cr => '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><div><div style="font-size:12px;">'+cr.note+'</div><div style="font-size:10px;color:var(--tl);">'+new Date(cr.created_at).toLocaleDateString('en-IN')+'</div></div><div style="font-weight:700;color:'+(cr.amount>=0?'var(--ok)':'var(--err)')+';">'+(cr.amount>=0?'+':'')+'₹'+Math.abs(cr.amount).toLocaleString()+'</div></div>').join('') : '<p style="font-size:12px;color:var(--tl);padding:12px 0;">No credits issued yet</p>') +
    '</div></div></div>' +
    // Orders table
    '<div class="card" style="margin-top:16px;"><div class="card-header" style="padding:12px 18px;"><h3 class="card-title" style="font-size:14px;">Orders ('+resellerOrders.length+')</h3></div><div style="overflow-x:auto;">' +
    '<table style="width:100%;border-collapse:collapse;"><thead><tr>' +
    ['Order ID','Product','Amount','Status','Date'].map(h => '<th style="padding:8px 14px;text-align:left;font-size:11px;color:var(--tl);background:#faf8fc;border-bottom:1px solid var(--border);">'+h+'</th>').join('') +
    '</tr></thead><tbody>' +
    (resellerOrders.slice(0,15).map(o => '<tr style="cursor:pointer;" onclick="closeModal(\'modal-reseller-detail\');viewOrder(\''+o.id+'\')">' +
      '<td style="padding:9px 14px;border-bottom:1px solid #f5f0f9;font-family:monospace;font-size:11px;color:var(--pl);">'+o.id+'</td>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #f5f0f9;font-size:12px;">'+o.product+'</td>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #f5f0f9;font-weight:600;font-size:12px;">₹'+o.price.toLocaleString()+'</td>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #f5f0f9;">'+statusBadge(o.status)+'</td>' +
      '<td style="padding:9px 14px;border-bottom:1px solid #f5f0f9;font-size:11px;color:var(--tl);">'+(o.date?formatDate(o.date):'—')+'</td></tr>').join('') || '<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--tl);">No orders yet</td></tr>') +
    '</tbody></table></div></div>';

  openModal('modal-reseller-detail');
}

function openAddReseller() { openModal('modal-add-reseller'); }