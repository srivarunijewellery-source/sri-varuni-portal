async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const alertEl = document.getElementById('login-alert');
  alertEl.classList.remove('show');

  if (!email || !pass) {
    document.getElementById('login-alert-msg').textContent = 'Please enter email and password.';
    alertEl.classList.add('show'); return;
  }

  const btn = document.querySelector('#screen-login .btn-primary');
  btn.textContent = 'Signing in...'; btn.disabled = true;

  const dbg = document.getElementById('debug-panel');
  function log(msg) { 
    console.log(msg);
    if (dbg) { dbg.style.display='block'; dbg.textContent += msg + '\n'; dbg.scrollTop = dbg.scrollHeight; }
  }
  try {
    log('1. Attempting login to: ' + SUPABASE_URL);
    const data = await sb.signIn(email, pass);
    log('2. Login OK, user: ' + data.user.id);
    saveSession(data);
    let profile = null;
    try {
      log('3. Fetching profile...');
      const profiles = await sb.get('profiles', 'id=eq.' + data.user.id + '&select=*', data.access_token);
      profile = profiles && profiles[0] ? profiles[0] : null;
      log('4. Profile: ' + (profile ? profile.role + '/' + profile.status : 'NOT FOUND'));
    } catch(pe) { log('4. Profile fetch failed: ' + pe.message); }

    // If profile missing, create a fallback
    if (!profile) {
      profile = { id: data.user.id, email, name: email.split('@')[0], role: 'reseller', status: 'active' };
    }
    
    // Block pending resellers
    if (profile.role === 'reseller' && profile.status === 'pending') {
      await sb.signOut(data.access_token).catch(() => {});
      clearSession();
      throw new Error('Your account is pending admin approval. You will be notified once approved. Contact: +91 92475 51711');
    }
    if (profile.status === 'suspended') {
      await sb.signOut(data.access_token).catch(() => {});
      clearSession();
      throw new Error('Your account has been suspended. Contact: +91 92475 51711');
    }

    currentUserProfile = profile;
    currentUser = { email, name: profile.name, role: profile.role, ...profile };
    await loadAllData();
    enterApp();
  } catch(err) {
    let msg = err.message || 'Login failed.';
    console.error('Full login error:', err);
    if (dbg) { dbg.style.display='block'; dbg.textContent += 'ERROR: ' + JSON.stringify(err.message) + '\n'; }
    if (msg.includes('Invalid login') || msg.includes('invalid_grant')) msg = 'Incorrect email or password.';
    if (msg.includes('Email not confirmed')) msg = 'Please verify your email — check inbox.';
    if (msg.includes('fetch') || msg.toLowerCase().includes('failed to fetch')) msg = 'Cannot reach Supabase. Check URL/key.';
    document.getElementById('login-alert-msg').textContent = 'Error: ' + msg;
    alertEl.classList.add('show');
  } finally {
    btn.textContent = 'Sign In to Portal'; btn.disabled = false;
  }
}

function handleAdminLogin() {
  document.getElementById('login-email').value = 'admin@srivaruni.com';
  document.getElementById('login-password').value = '';
  showToast('Enter your admin password then click Sign In', 'success');
  document.getElementById('login-password').focus();
}

async function handleSignup() {
  const name     = document.getElementById('su-name').value.trim();
  const email    = document.getElementById('su-email').value.trim();
  const pass     = document.getElementById('su-pass').value;
  const pass2    = document.getElementById('su-pass2').value;
  const phone    = document.getElementById('su-phone').value.trim();
  const business = document.getElementById('su-business').value.trim();
  const city     = document.getElementById('su-city').value.trim();

  if (!name || !email || !pass) { showToast('Please fill all required fields', 'error'); return; }
  if (pass !== pass2) { showToast('Passwords do not match', 'error'); return; }
  if (pass.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }

  const btn = document.querySelector('#screen-signup .btn-primary');
  btn.textContent = 'Submitting...'; btn.disabled = true;

  try {
    const result = await sb.signUp(email, pass, { name, phone, business, city, role: 'reseller', status: 'pending' });
    console.log('signUp result:', JSON.stringify(result).slice(0, 200));

    // Get user ID from result (Supabase returns different shapes)
    const userId = result?.user?.id || result?.id || null;
    console.log('userId:', userId);

    if (userId) {
      // Always manually upsert profile - don't rely on trigger
      const r = await fetch(SUPABASE_URL + '/rest/v1/profiles', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ id: userId, email, name, phone, business, city, role: 'reseller', status: 'pending' })
      });
      console.log('Profile upsert status:', r.status, await r.text());
    } else {
      // No userId means email confirmation is required - profile will be created on confirm
      console.log('No userId in signup result - email confirmation likely required');
    }
    showScreen('signup-success');
  } catch(err) {
    console.error('Signup error:', err);
    showToast(err.message || 'Signup failed. Please try again.', 'error');
  } finally {
    btn.textContent = 'Submit Request'; btn.disabled = false;
  }
}

async function handleForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showToast('Enter your email address', 'error'); return; }
  try {
    await sb.resetPassword(email);
    document.getElementById('forgot-success').style.display = 'flex';
    showToast('Reset link sent!');
  } catch(err) {
    showToast(err.message || 'Failed to send reset link', 'error');
  }
}

async function handleLogout() {
  if (SESSION) await sb.signOut(SESSION.token).catch(() => {});
  clearSession();
  currentUser = null; currentUserProfile = null;
  ORDERS = []; RESELLERS = []; CATALOG = {}; PRODUCTS = {};
  showScreen('login');
  showToast('Signed out successfully');
}

async function enterApp() {
  const isAdmin = currentUser.role === 'admin';
  document.getElementById('sidebar-name').textContent = currentUser.name || currentUser.email;
  document.getElementById('sidebar-role').textContent = isAdmin ? 'Admin / Owner' : 'Reseller Account';
  document.getElementById('sidebar-avatar').textContent = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
  document.getElementById('admin-bar').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('nav-reseller').style.display = isAdmin ? 'none' : 'block';
  document.getElementById('nav-admin').style.display = isAdmin ? 'block' : 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' });
  showScreen('app');
  const pc = document.querySelector('.page-content');
  if (pc) pc.style.opacity = '0.5';
  await loadAllData();
  if (pc) pc.style.opacity = '1';
  if (isAdmin) showPage('admin-dashboard');
  else showPage('dashboard');
}