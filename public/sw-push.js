// Push notification handler for the service worker
// This file extends the PWA service worker to handle push events

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'New Notification',
      body: event.data.text(),
    };
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.svg',
    badge: data.badge || '/icons/icon-192x192.svg',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [],
    tag: data.type || 'general',
    renotify: true,
  };

  // Add actions based on notification type
  if (data.data?.type === 'leave_approval' || data.data?.type === 'leave_rejection') {
    options.actions = [
      { action: 'view', title: 'View Details' },
    ];
  } else if (data.data?.type === 'attendance_reminder') {
    options.actions = [
      { action: 'checkin', title: 'Check In' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/employee-portal';

  // Navigate based on notification type
  switch (data.type) {
    case 'leave_approval':
    case 'leave_rejection':
      url = '/employee-portal?tab=leave';
      break;
    case 'attendance_reminder':
      url = '/kiosk';
      break;
    case 'document_expiry':
      url = '/employee-portal?tab=documents';
      break;
    case 'announcement':
      url = '/employee-portal?tab=overview';
      break;
  }

  // Handle action clicks
  if (event.action === 'checkin') {
    url = '/kiosk';
  } else if (event.action === 'view') {
    // Keep the default URL based on type
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient) {
              focusedClient.navigate(url);
            }
          });
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push subscription change (when the browser refreshes the subscription)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options).then((subscription) => {
      // You would typically send this to your server to update the stored subscription
      console.log('Push subscription renewed:', subscription);
    })
  );
});
