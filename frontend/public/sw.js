self.addEventListener('push', function (event) {
  if (!event.data) {
    console.log('Push event but no data.');
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'AV Scheduler';
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-192x192.png',
      data: {
        url: data.url || '/'
      },
      tag: data.tag || 'av-scheduler-notification',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error parsing push notification data:', err);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('AV Scheduler', {
        body: text,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: {
          url: '/'
        }
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (windowClients.length > 0) {
        let client = windowClients[0];
        if ('navigate' in client && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch event listener (required for PWA installability on Chrome/Android)
self.addEventListener('fetch', function () {
  // No-op: let the browser fetch the resource normally.
  // This satisfies the PWA criteria of having a fetch handler registered.
});
