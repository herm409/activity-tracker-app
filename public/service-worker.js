/* ==============================================
   OnPar Activity Tracker — Service Worker
   Handles: caching (offline shell), push notifications
   ============================================== */

const CACHE_NAME = 'onpar-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ------- Install: cache app shell -------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ------- Activate: clean old caches -------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ------- Fetch: network-first, fallback to cache -------
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  );
});

// ------- Push: display a notification -------
self.addEventListener('push', (event) => {
  let data = { title: 'OnPar Tracker', body: "Don't forget to log today's activity! 🏌️", icon: 'https://i.ibb.co/HL4BXffN/On-Par-logo.png', badge: 'https://i.ibb.co/HL4BXffN/On-Par-logo.png' };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: 'onpar-reminder',
      renotify: true,
      requireInteraction: false,
      data: { url: '/' },
    })
  );
});

// ------- Notification click: focus/open app -------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// ------- Background Sync for end-of-day reminder scheduling -------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title = 'OnPar Tracker', body = "Don't forget to log today's activity! 🏌️" } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: 'https://i.ibb.co/HL4BXffN/On-Par-logo.png',
      badge: 'https://i.ibb.co/HL4BXffN/On-Par-logo.png',
      tag: 'onpar-eod-reminder',
      renotify: true,
      requireInteraction: false,
      data: { url: '/' },
    });
  }
});

