// ══════════════════════════════════════════════
// SUPABASE CONFIG
// ══════════════════════════════════════════════
const SUPABASE_URL = 'https://brtepaeqocjxmkinrwpg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydGVwYWVxb2NqeG1raW5yd3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzQ2ODQsImV4cCI6MjA5Mzc1MDY4NH0.1qke-Eagrl6Vaef2hrFoOKoB2pSnqEoQKmGN7i3EkI0';

// ══════════════════════════════════════════════
// GLOBAL STATE — declared once here, never re-declared elsewhere
// ══════════════════════════════════════════════
let SESSION             = null;
let currentUser         = null;
let currentUserProfile  = null;

// Data stores
let ORDERS    = [];
let RESELLERS = [];
let CATALOG   = {};
let PRODUCTS  = {};

// Order flow state
let orderCart             = [];
let uploadedScreenshots   = [];
let shipToSelfOn          = false;
let applyCreditToOrder    = false;
let resellerCreditBalance = 0;
let window_placingOrder   = false;

// Admin / UI state
let currentTrackingOrderId = null;
let resellerFilter         = 'active';
let currentCreditReseller  = null;
let editingProductSL       = null;
let pendingProductImage    = null;
let pendingLogoData        = null;

// ══════════════════════════════════════════════
// SUPABASE REST API HELPERS
// ══════════════════════════════════════════════
const sb = {
  authHeaders: function(token) {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + (token || SUPABASE_KEY),
      'Content-Type': 'application/json'
    };
  },
  async get(table, params, token) {
    const url = SUPABASE_URL + '/rest/v1/' + table + (params ? '?' + params : '');
    const r = await fetch(url, { headers: this.authHeaders(token) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(table, body, token) {
    const url = SUPABASE_URL + '/rest/v1/' + table;
    const headers = { ...this.authHeaders(token), 'Prefer': 'return=minimal' };
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (r.status !== 200 && r.status !== 201 && r.status !== 204) {
      const errText = await r.text();
      throw new Error(errText);
    }
    const text = await r.text();
    return text ? JSON.parse(text) : {};
  },
  async patch(table, params, body, token) {
    const url = SUPABASE_URL + '/rest/v1/' + table + '?' + params;
    const headers = { ...this.authHeaders(token), 'Prefer': 'return=minimal' };
    const r = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    const text = await r.text();
    return text ? JSON.parse(text) : {};
  },
  async uploadFile(bucket, path, file, token) {
    const url = SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + (token || SUPABASE_KEY) },
      body: file
    });
    if (!r.ok) throw new Error(await r.text());
    return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
  },
  async signIn(email, password) {
    const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || 'Login failed');
    return data;
  },
  async signUp(email, password, meta) {
    const r = await fetch(SUPABASE_URL + '/auth/v1/signup', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, data: meta })
    });
    const data = await r.json();
    if (data.error || data.error_description || (data.msg && !data.id && !data.user)) {
      throw new Error(data.error_description || data.error || data.msg || 'Signup failed');
    }
    return data;
  },
  async resetPassword(email) {
    const r = await fetch(SUPABASE_URL + '/auth/v1/recover', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.error_description || 'Failed'); }
    return true;
  },
  async signOut(token) {
    await fetch(SUPABASE_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
    });
  }
};

// ── Session helpers ──────────────────────────────────────────────────────────
function saveSession(data) {
  SESSION = { token: data.access_token, userId: data.user.id, email: data.user.email };
  try { localStorage.setItem('sv_session', JSON.stringify(SESSION)); } catch(e) {}
}

function loadSession() {
  try {
    const s = localStorage.getItem('sv_session');
    if (s) SESSION = JSON.parse(s);
  } catch(e) {}
  return SESSION;
}

function clearSession() {
  SESSION = null;
  try { localStorage.removeItem('sv_session'); } catch(e) {}
}
