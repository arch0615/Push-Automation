var SW_VERSION = 'v4-2026-04-29';
var TRACKING_HOST = 'https://pushudc.top';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = null;
  try { data = event.data && event.data.json(); } catch (_) {
    var raw = event.data && event.data.text();
    if (raw && raw.trim()) data = { title: 'Notificação', body: raw };
  }

  // Trim whitespace so " " counts as empty
  var t = data && data.title ? String(data.title).trim() : '';
  var b = data && (data.body || data.message) ? String(data.body || data.message).trim() : '';

  if (!t || !b) {
    // Chrome requires we show a notification. We show one with a tag
    // and immediately replace+close it via the same tag so nothing
    // visible accumulates.
    event.waitUntil(
      self.registration.showNotification('•', { tag: 'silent-ping', silent: true, requireInteraction: false, body: '' })
        .then(function () { return self.registration.getNotifications({ tag: 'silent-ping' }); })
        .then(function (notifs) { notifs.forEach(function (n) { n.close(); }); })
    );
    return;
  }

  var title = t;
  var actions = [];
  if (data.cta) {
    actions.push({ action: 'open', title: data.cta });
  }

  var fallbackIcon = (data.trackingHost || TRACKING_HOST) + '/favicon-32x32.png';
  var options = {
    body: b,
    icon: data.icon || fallbackIcon,
    image: data.image,
    badge: data.badge || fallbackIcon,
    actions: actions,
    data: {
      url: data.url || '/',
      campaignId: data.campaignId,
      trackPath: data.trackPath || ('/api/push/track-click/' + (data.campaignId || 0)),
      trackingHost: data.trackingHost || TRACKING_HOST,
    },
    requireInteraction: false,
    tag: data.tag || 'push-' + Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var d = event.notification.data || {};
  var target = d.url || '/';
  var trackUrl = (d.trackingHost || TRACKING_HOST) + (d.trackPath || ('/api/push/track-click/' + (d.campaignId || 0)));

  event.waitUntil(Promise.all([
    fetch(trackUrl, { method: 'POST', keepalive: true, mode: 'no-cors' }).catch(function () {}),
    self.clients.openWindow(target),
  ]));
});
