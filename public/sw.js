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
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open Exona' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Exona Protocol', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
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
