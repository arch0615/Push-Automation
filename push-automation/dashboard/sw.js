self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch (_) { data = { title: 'Notificação', body: event.data?.text() || '' }; }

  const title = data.title || 'Notificação';
  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/favicon-32x32.png',
    image: data.image,
    badge: data.badge || '/favicon-32x32.png',
    data: { url: data.url || '/', campaignId: data.campaignId },
    requireInteraction: false,
    tag: data.tag || 'push-' + Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(target));
});
