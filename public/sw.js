// Exona Service Worker - Hybrid Stale-While-Revalidate & Offline Core
// Delivers a lightning-fast native experience like WhatsApp and Telegram.
// Loads cached shell assets instantly under poor/zero-network conditions.

const CACHE_NAME = 'exona-core-cache-v2';

// Core structural assets to cache during installation
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/splash.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Pre-caching Exona application shell assets');
        return cache.addAll(PRE_CACHE_RESOURCES);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('Failed to pre-cache some files during install, proceeding anyway:', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Evicting historical service worker cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle standard GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip unsupported protocols (chrome-extension, edge, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Protect analytical, auth and dynamic firestore endpoints from caching interference
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

  // Handle SPA routing & index entry cleanly:
  // If the request is for a layout page navigation, serve /index.html instantly
  const isNavigation = event.request.mode === 'navigate' || 
                       url.pathname === '/' || 
                       url.pathname === '/index.html' ||
                       (!url.pathname.includes('.') && !url.pathname.endsWith('/'));

  if (isNavigation) {
    event.respondWith(
      caches.match('/index.html').then((cachedIndexResponse) => {
        const fetchPromise = fetch('/index.html')
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseCopy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseCopy));
            }
            return networkResponse;
          })
          .catch(() => null);

        // Serve instantly from regional local cache. Fall back to network fetch if not yet stored.
        return cachedIndexResponse || fetchPromise || caches.match('/');
      })
    );
    return;
  }

  // Stale-While-Revalidate Engine for general assets (bundled JS, CSS, fonts, assets)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent catch for network failure when offline
          return null;
        });

      // Serve from browser local cache instantly, or fall back to background fetch
      return cachedResponse || fetchPromise;
    })
  );
});
