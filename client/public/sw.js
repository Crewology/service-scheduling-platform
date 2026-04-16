const CACHE_NAME = 'ologycrew-v2';
const DATA_CACHE_NAME = 'ologycrew-data-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Install: cache core shell + offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch Handler ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip OAuth and SSE — always go to network
  if (
    url.pathname.startsWith('/oauth') ||
    request.headers.get('accept')?.includes('text/event-stream')
  ) {
    return;
  }

  // Cache booking data API calls (network-first, cache fallback)
  if (url.pathname.startsWith('/api/trpc/') && url.pathname.includes('booking')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Return a JSON response indicating offline
            return new Response(
              JSON.stringify([{ result: { data: { json: { offline: true, bookings: [] } } } }]),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Skip other API calls — always go to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For navigation requests (HTML pages): network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetched;
    })
  );
});

// ─── Push Notification Handler ───────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'OlogyCrew', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || 'https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/android-chrome-192x192_3e2c5d17.png',
    badge: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/favicon-32x32_9b666460.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: data.id || Date.now(),
    },
    actions: data.actions || [],
    tag: data.tag || 'ologycrew-notification',
    renotify: !!data.tag,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'OlogyCrew', options)
      .then(() => {
        // Update app badge count
        if (self.navigator && self.navigator.setAppBadge) {
          // Increment badge - get current count from all visible notifications
          self.registration.getNotifications().then((notifications) => {
            const count = notifications.length + 1;
            self.navigator.setAppBadge(count).catch(() => {});
          });
        }
      })
  );
});

// ─── Notification Click Handler ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  // Handle action button clicks
  if (event.action === 'view') {
    event.waitUntil(clients.openWindow(targetUrl));
    return;
  }

  if (event.action === 'dismiss') {
    return;
  }

  // Clear badge when user interacts with notification
  if (self.navigator && self.navigator.clearAppBadge) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  // Default: open/focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── Background Sync ────────────────────────────────────────────
const QUEUE_KEY = 'ologycrew-offline-queue';

function getQueueFromStorage() {
  // Service workers don't have localStorage, so we use IndexedDB via a simple wrapper
  // However, for simplicity we communicate with the client to replay
  return [];
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'ologycrew-sync-actions') {
    event.waitUntil(
      // Notify all clients to replay their offline queue
      self.clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({ type: 'REPLAY_OFFLINE_QUEUE' });
        });
      })
    );
  }

  if (event.tag === 'sync-bookings') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({ type: 'REPLAY_OFFLINE_QUEUE' });
        });
      })
    );
  }
});
