// ═══════════════════════════════════════════════════════════════
// Sri Varuni Partner Portal — Service Worker v1.0
// Handles: Web Push notifications, PWA offline shell cache
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'srivaruni-v1';
const VAPID_PUBLIC_KEY = 'BLV2yRPWGIEjYlnSE7XRUjhxhpcdu72JjFtbl2Xz--y7XyYWHld9amAYjWUHYmdVkJa1Vn3o1ddMZgzoWRCaqLk';

// ── Install: cache the app shell ─────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => 
      cache.addAll(['/', '/index.html']).catch(() => {})
    )
  );
});

// ── Activate: clean old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fallback to cache ──────────────────
self.addEventListener('fetch', event => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Skip Supabase API calls
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push: receive and display notification ───────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch(e) { data = { title: 'Sri Varuni', body: event.data.text() }; }

  const options = {
    body:    data.body || '',
    icon:    data.icon || '/icon-192.png',
    badge:   '/icon-badge.png',
    tag:     data.tag  || 'srivaruni-' + Date.now(),
    data:    { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Sri Varuni', options)
  );
});

// ── Notification click: open the app ─────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
