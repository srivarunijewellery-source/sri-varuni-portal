document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeScreenshotViewer();
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('SRI VARUNI PORTAL v3.2 - CREDITS + NOTIFICATIONS FIXED');
  // Set date
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  });

  // Always show login first — fast, no network needed
  showScreen('login');

  // Try to load brand logo (non-blocking, swallow all errors)
  try { await loadBrandLogo(); } catch(e) {}

  // Try to restore previous session silently
  try {
    const saved = loadSession();
    if (saved && saved.token) {
      const profiles = await sb.get('profiles', 'id=eq.' + saved.userId + '&select=*', saved.token);
      if (profiles && profiles.length) {
        currentUserProfile = profiles[0];
        currentUser = { email: saved.email, name: profiles[0].name, role: profiles[0].role, ...profiles[0] };
        await loadAllData();
        enterApp();
      } else {
        clearSession();
      }
    }
  } catch(e) {
    clearSession(); // bad session, stay on login
  }
})