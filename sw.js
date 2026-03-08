// Service Worker for ACCIOS CORE — Offline-first PWA
const CACHE_NAME = 'accios-core-v45';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/Propuesta-Xazai-2026.html',
  '/index_Estephano.html',
  '/assets/images/logo-ac.jpeg',
  '/assets/images/burbuja-ac.png',
  '/css/reset.css',
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/glassmorphism.css',
  '/css/components.css',
  '/css/animations.css',
  '/css/auth.css',
  '/css/pages.css',
  '/css/admin.css',
  '/css/onboarding.css',
  '/css/finance.css',
  '/css/dashboard.css',
  '/css/lavaina.css',
  '/css/behavior.css',
  '/css/command-center.css',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — cleanup old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests and Firebase/CDN calls
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore') || e.request.url.includes('googleapis') || e.request.url.includes('gstatic')) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
