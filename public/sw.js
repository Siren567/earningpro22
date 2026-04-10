// StockPulse AI — Service Worker
// Handles: push notifications + static asset caching + offline fallback

const CACHE = 'stockpulse-v2';
const OFFLINE_URL = '/offline.html';

// ── Install: pre-cache offline fallback ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: caching strategy ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET from same origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Never cache API, auth, or Supabase calls
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/functions/')
  ) return;

  // Navigation requests: network-first, fall back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images, SVG): cache-first
  if (
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico|gif)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // manifest.json and offline.html: cache-first
  if (url.pathname === '/manifest.json' || url.pathname === '/offline.html') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

// ── Skip-waiting on demand (triggered by main.jsx on update) ────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'StockPulse Alert', body: event.data.text() };
  }

  const title = payload.title || 'StockPulse AI';
  const options = {
    body:               payload.body    || '',
    icon:               payload.icon    || '/logo.svg',
    badge:              payload.badge   || '/logo.svg',
    tag:                payload.tag     || 'stockpulse-alert',
    data:               payload.data    || {},
    requireInteraction: false,
    silent:             false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/Alerts';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.endsWith(url) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
