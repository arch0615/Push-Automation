var SW_VERSION = 'v5-2026-05-12';
var TRACKING_HOST = 'https://pushudc.top';

// Fire a one-shot pingback to the server when a push event arrives, so the
// dashboard can show true delivery rate (received-by-browser) instead of just
// accepted-by-push-service. fire-and-forget; failures are intentionally
// swallowed so they never block the notification render.
function confirmDelivery(host, cid, sid) {
  if (!cid || !sid) return Promise.resolve();
  var url = (host || TRACKING_HOST) + '/api/push/delivery-confirm';
  return fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cid: cid, sid: sid }),
  }).catch(function () {});
}

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

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    confirmDelivery(data.trackingHost, data.campaignId, data._sid),
  ]));
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
