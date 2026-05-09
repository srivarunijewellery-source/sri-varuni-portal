function loadProfile() {
  if (!currentUserProfile) return;
  const u = currentUserProfile;
  const el = id => document.getElementById(id);
  if (el('prof-name'))     el('prof-name').value     = u.name     || '';
  if (el('prof-phone'))    el('prof-phone').value    = u.phone    || '';
  if (el('prof-email'))    el('prof-email').value    = u.email    || '';
  if (el('prof-business')) el('prof-business').value = u.business || '';
  if (el('prof-gst'))      el('prof-gst').value      = u.gst      || '';
  if (el('prof-pan'))      el('prof-pan').value      = u.pan      || '';
  if (el('prof-address'))  el('prof-address').value  = u.address  || '';
  if (el('prof-city'))     el('prof-city').value     = u.city     || '';
  if (el('prof-state'))    el('prof-state').value    = u.state    || '';
  if (el('prof-pin'))      el('prof-pin').value      = u.pin      || '';
  updateProfileBanner();
}

async function saveProfile() {
  if (!SESSION) return;
  const body = {
    name:     document.getElementById('prof-name').value.trim(),
    phone:    document.getElementById('prof-phone').value.trim(),
    business: document.getElementById('prof-business').value.trim(),
    gst:      document.getElementById('prof-gst').value.trim().toUpperCase(),
    pan:      document.getElementById('prof-pan').value.trim().toUpperCase(),
    address:  document.getElementById('prof-address').value.trim(),
    city:     document.getElementById('prof-city').value.trim(),
    state:    document.getElementById('prof-state').value.trim(),
    pin:      document.getElementById('prof-pin').value.trim(),
  };
  try {
    await sb.patch('profiles', 'id=eq.' + SESSION.userId, body, SESSION.token);
    Object.assign(currentUserProfile, body);
    currentUser.name = body.name;
    document.getElementById('sidebar-name').textContent = body.name;
    document.getElementById('sidebar-avatar').textContent = body.name.charAt(0).toUpperCase();
    updateProfileBanner();
    showToast('Profile saved successfully');
  } catch(err) { showToast('Failed to save: ' + err.message, 'error'); }
}

async function changePassword() {
  const cur  = document.getElementById('prof-curpass').value;
  const nw   = document.getElementById('prof-newpass').value;
  const conf = document.getElementById('prof-confpass').value;
  if (!cur || !nw) { showToast('Enter current and new password', 'error'); return; }
  if (nw !== conf) { showToast('New passwords do not match', 'error'); return; }
  if (nw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  // Re-authenticate then update
  try {
    await sb.signIn(currentUser.email, cur); // verify current
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SESSION.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nw })
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.msg || 'Failed'); }
    document.getElementById('prof-curpass').value = '';
    document.getElementById('prof-newpass').value = '';
    document.getElementById('prof-confpass').value = '';
    showToast('Password updated successfully');
  } catch(err) { showToast(err.message || 'Failed', 'error'); }
}

async function saveLogo() {
  if (!pendingLogoData) { showToast('Please upload a logo first', 'error'); return; }
  try {
    const blob = await (await fetch(pendingLogoData)).blob();
    const path = 'logo_' + Date.now() + '.png';
    const url  = await sb.uploadFile('brand', path, blob, SESSION.token);
    await sb.patch('settings', 'key=eq.logo_url', { value: url }, SESSION.token);
    applyLogoEverywhere(url);
    closeModal('modal-logo');
    showToast('Logo updated across the portal');
  } catch(err) { showToast('Failed to upload logo: ' + err.message, 'error'); }
}

async function loadBrandLogo() {
  try {
    const rows = await sb.get('settings', 'key=eq.logo_url&select=value');
    if (rows && rows.length && rows[0] && rows[0].value) applyLogoEverywhere(rows[0].value);
  } catch(e) { /* logo optional - swallow silently */ }
}

function applyLogoEverywhere(url) {
  if (!url) return;
  ['auth-logo-img','sidebar-logo-img'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.src = url; el.style.display = 'block'; }
  });
  ['auth-icon-default','sidebar-icon-default'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function updateProfileBanner() {
  var name = (document.getElementById('prof-name') || {}).value || '';
  var biz  = (document.getElementById('prof-business') || {}).value || '';
  var av   = document.getElementById('prof-avatar-big');
  var bn   = document.getElementById('prof-banner-name');
  var bb   = document.getElementById('prof-banner-biz');
  if (av) av.textContent = (name || 'R').charAt(0).toUpperCase();
  if (bn) bn.textContent = name || 'Reseller Account';
  if (bb) bb.textContent = biz || 'Update your details below';
}