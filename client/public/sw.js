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

// ─── Notification Grouping Config ───────────────────────────────
// Maps notification types to groups for collapsing multiple alerts
const NOTIFICATION_GROUPS = {
  message: {
    types: ['message_received'],
    tag: 'ologycrew-group-messages',
    label: 'messages',
    icon: '💬',
    url: '/messages',
  },
  booking: {
    types: ['booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_completed'],
    tag: 'ologycrew-group-bookings',
    label: 'booking updates',
    icon: '📅',
    url: '/my-bookings',
  },
  payment: {
    types: ['payment_received', 'payment_failed'],
    tag: 'ologycrew-group-payments',
    label: 'payment updates',
    icon: '💳',
    url: '/my-bookings',
  },
  quote: {
    types: ['quote_request_new', 'quote_response_received', 'quote_accepted', 'quote_declined'],
    tag: 'ologycrew-group-quotes',
    label: 'quote updates',
    icon: '📋',
    url: '/my-quotes',
  },
  reminder: {
    types: ['reminder_24h', 'reminder_1h'],
    tag: 'ologycrew-group-reminders',
    label: 'reminders',
    icon: '⏰',
    url: '/my-bookings',
  },
};

// Threshold: group after this many notifications of the same type exist
const GROUP_THRESHOLD = 2;

/**
 * Determine which group a notification type belongs to.
 * Returns null if it doesn't match any group (show individually).
 */
function getNotificationGroup(type) {
  if (!type) return null;
  for (const [key, group] of Object.entries(NOTIFICATION_GROUPS)) {
    if (group.types.includes(type)) return { key, ...group };
  }
  return null;
}

// ─── Push Notification Handler (with Grouping) ──────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'OlogyCrew', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const ICON_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/android-chrome-192x192_3e2c5d17.png';
  const BADGE_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/favicon-32x32_9b666460.png';

  event.waitUntil(
    self.registration.getNotifications().then((existingNotifications) => {
      const group = getNotificationGroup(data.tag?.split('-')[0] || data.type);

      if (group) {
        // Count existing notifications in this group
        const sameGroupNotifications = existingNotifications.filter(
          (n) => n.tag === group.tag || 
                 (n.data?.groupKey === group.key)
        );

        const totalCount = sameGroupNotifications.length + 1;

        if (totalCount >= GROUP_THRESHOLD) {
          // Close individual notifications in this group
          sameGroupNotifications.forEach((n) => n.close());

          // Show grouped summary notification
          return self.registration.showNotification(
            `${totalCount} new ${group.label}`,
            {
              body: `You have ${totalCount} new ${group.label}. Tap to view.`,
              icon: data.icon || ICON_URL,
              badge: BADGE_URL,
              vibrate: [100, 50, 100],
              tag: group.tag,
              renotify: true,
              data: {
                url: group.url,
                groupKey: group.key,
                isGrouped: true,
                count: totalCount,
                dateOfArrival: Date.now(),
              },
              actions: [
                { action: 'view', title: 'View All' },
                { action: 'dismiss', title: 'Dismiss' },
              ],
            }
          );
        }
      }

      // Show individual notification (below threshold or ungrouped type)
      const options = {
        body: data.body || 'You have a new notification',
        icon: data.icon || ICON_URL,
        badge: BADGE_URL,
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/',
          groupKey: group ? group.key : null,
          dateOfArrival: Date.now(),
          primaryKey: data.id || Date.now(),
        },
        actions: data.actions || [],
        tag: data.tag || 'ologycrew-notification',
        renotify: !!data.tag,
      };

      return self.registration.showNotification(data.title || 'OlogyCrew', options);
    }).then(() => {
      // Update app badge count
      if (self.navigator && self.navigator.setAppBadge) {
        self.registration.getNotifications().then((notifications) => {
          // For grouped notifications, use the count stored in data
          let totalCount = 0;
          notifications.forEach((n) => {
            if (n.data?.isGrouped && n.data?.count) {
              totalCount += n.data.count;
            } else {
              totalCount += 1;
            }
          });
          self.navigator.setAppBadge(Math.max(totalCount, 1)).catch(() => {});
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
    // Clear badge when user dismisses
    if (self.navigator && self.navigator.clearAppBadge) {
      self.navigator.clearAppBadge().catch(() => {});
    }
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
self.addEventListener('sync', (event) => {
  if (event.tag === 'ologycrew-sync-actions' || event.tag === 'sync-bookings') {
    event.waitUntil(
      // Notify all clients to replay their offline queue
      self.clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({ type: 'REPLAY_OFFLINE_QUEUE' });
        });
      })
    );
  }
});
