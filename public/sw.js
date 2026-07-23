// Exona Service Worker - Dynamic Network-First Caching with Offline Fallback
// This ensures developers and users see instant code modifications while online,
// but can load and run the complete application seamlessly in offline mode.

const CACHE_NAME = 'exona-offline-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Clearing old service worker cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache dynamic assets on-the-fly and fall back to cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip unsupported schemes (chrome extension APIs, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Skip Firebase sockets, live database calls, or internal developer WS pathways
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/sockjs-node') ||
    url.pathname.includes('/ws')
  ) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the request is successful, clone and keep it in cache
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch((error) => {
        // Network error/offline -> Serve from the local cache storage
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If it is a navigation page layout request offline, render the SPA shell (index.html at root)
          if (isNavigation) {
            return caches.match('/');
          }

          return Promise.reject(error);
        });
      })
  );
});
