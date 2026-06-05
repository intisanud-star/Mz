// Exona Service Worker - Safe Bypass for Real-Time Updates
// This ensures developers and users see instant code modifications without stale browser caches.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Clearing service worker cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Bypass fetch caching completely in preview to avoid caching compiled JS files
self.addEventListener('fetch', (event) => {
  // Pass-through to network
});
