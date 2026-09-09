self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

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
self.addEventListener('fetch', function (event) {
  // Only intercept GET requests. Non-GET requests (e.g. POST/PUT with FormData) must bypass SW
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  // Bypass SW for API calls, storage asset uploads/downloads, and external domains
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/storage')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(function (err) {
      console.warn('SW fetch failed:', err);
    })
  );
});

