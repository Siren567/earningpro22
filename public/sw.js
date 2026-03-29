// Gako Service Worker — handles web push notifications
const CACHE_NAME = 'gako-sw-v1';

// ── Push event ──────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Gako Alert', body: event.data.text() };
  }

  const title = payload.title || 'Gako';
  const options = {
    body:               payload.body    || '',
    icon:               payload.icon    || '/gako-icon-192.png',
    badge:              payload.badge   || '/gako-badge-96.png',
    tag:                payload.tag     || 'gako-earnings',
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
        // Try to focus an existing window on the correct URL
        for (const client of clientList) {
          if (client.url.endsWith(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // No matching window — open a new one
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ── Minimal install / activate lifecycle ────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim())
);
