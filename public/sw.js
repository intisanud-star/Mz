importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log(`Workbox is loaded`);

  // Force update new service worker
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  self.addEventListener('activate', () => {
    clients.claim();
  });

  // 1. Pre-caching (Simplified for this manual file)
  // In a full Vite PWA setup, this would be generated. 
  // Here we'll use dynamic caching for navigation and assets.

  // Cache Pages (Navigation)
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages-cache',
    })
  );

  // Cache Assets (Images, Styles, JS)
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-assets',
    })
  );

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Cache API requests (Firebase/Firestore is handled by its own SDK, but generic APIs are here)
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  );

  // 2. Background Sync
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('offlineQueue', {
    maxRetentionTime: 24 * 60 // Retry for up to 24 Hours
  });

  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('/api/sync') || url.pathname.includes('/api/push'),
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin]
    }),
    'POST'
  );
}

// 3. Push Notifications (Enhanced)
self.addEventListener('push', function(event) {
  let data = { title: 'Exona Protocol', body: 'New System Update Received' };
  try {
    data = event.data.json();
  } catch (e) {
    console.log('Non-JSON push received, using fallback');
  }

  const options = {
    body: data.body || data.text || 'Protocol message incoming',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: data.category || 'system',
    renotify: true,
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'View Update' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Exona Protocol', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
