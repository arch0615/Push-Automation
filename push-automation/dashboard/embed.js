(function () {
  var SERVER = 'https://pushudc.top';
  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  var SITE = script.getAttribute('data-site');
  if (!SITE) { console.warn('[push] data-site attribute required'); return; }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('[push] Web Push not supported in this browser');
    return;
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function registerSW() {
    try {
      var reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      try { await reg.update(); } catch (_) {}
      return reg;
    } catch (e) {
      console.warn('[push] sw.js not found at site root. Upload it from the dashboard.', e.message);
      return null;
    }
  }

  // Auto-update existing SW on every page load
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (reg) { try { reg.update(); } catch (_) {} });
    });
  }

  async function subscribe() {
    try {
      if (Notification.permission === 'denied') return false;

      var permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') return false;

      var reg = await registerSW();
      if (!reg) {
        console.warn('[push] sw.js missing on site root — cannot complete subscription');
        return false;
      }

      await navigator.serviceWorker.ready;

      var keyResp = await fetch(SERVER + '/api/push/vapid-key').then(function (r) { return r.json(); });
      if (!keyResp.publicKey) throw new Error('No VAPID key');

      var existing = await reg.pushManager.getSubscription();
      if (!existing) {
        existing = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyResp.publicKey),
        });
      }

      var resp = await fetch(SERVER + '/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: existing.toJSON(), site: SITE }),
      });
      var body = await resp.json();
      if (!resp.ok) {
        console.warn('[push] subscribe failed:', body.error);
        return false;
      }
      console.log('[push] subscribed to', SITE);
      return true;
    } catch (e) {
      console.warn('[push] subscribe failed:', e.message);
      return false;
    }
  }

  function start() {
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      if (Notification.permission === 'granted') subscribe();
      return;
    }
    setTimeout(subscribe, 2000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    window.addEventListener('DOMContentLoaded', start);
  }
})();
