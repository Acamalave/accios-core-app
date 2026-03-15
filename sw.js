// ACCIOS CORE — Service Worker v131
// Strategy: Network-first with offline cache fallback
// Aggressive cache invalidation for all platforms (iOS, Android PWA, desktop)

const CACHE_NAME = 'accios-v131';
const APP_VERSION = 123;
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Navigation requests (HTML pages) — ALWAYS network, never cache
// This is the key fix for Android PWA: ensures fresh HTML on every launch
function isNavigationRequest(request, url) {
  return (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    (request.headers.get('accept') || '').includes('text/html')
  );
}

// Install: cache minimal shell, skip waiting immediately
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: purge ALL old caches, claim clients, notify them to reload
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
     .then(() => {
       // Notify all open tabs to reload for fresh content
       self.clients.matchAll({ type: 'window' }).then(clients => {
         clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: APP_VERSION }));
       });
     })
  );
});

// Fetch handler
self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip external origins (Firebase, CDNs, etc.) — never intercept
  if (url.origin !== self.location.origin) return;

  // Skip API routes and version check — never intercept
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/version.json') return;

  // HTML / navigation requests → ALWAYS go to network (no cache)
  // This guarantees Android PWA gets the latest index.html with updated APP_VERSION
  if (isNavigationRequest(request, url)) {
    e.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Versioned assets (?v=XXX) → network-only, cache buster handles freshness
  if (url.search.includes('v=')) {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Everything else (images, fonts, etc.) → network-first with cache fallback
  e.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          return cached || caches.match('/index.html');
        });
      })
  );
});

// ─── Periodic version check (Android PWA doesn't auto-check SW updates) ───
// When a client sends a VERSION_CHECK message, respond with current SW version
self.addEventListener('message', (e) => {
  if (e.data?.type === 'VERSION_CHECK') {
    e.source?.postMessage({ type: 'SW_VERSION', version: APP_VERSION });
  }
});

// ─── Push Notifications ───────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = { title: 'ACCIOS CORE', body: 'Tienes una nueva notificación' };
  try {
    if (e.data) data = e.data.json();
  } catch (_) {
    data.body = e.data?.text() || data.body;
  }

  e.waitUntil(
    self.registration.showNotification(data.title || 'ACCIOS CORE', {
      body: data.body || '',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
