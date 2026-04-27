(function () {
  var SERVER = 'https://pushudc.top';
  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  var SITE = script.getAttribute('data-site');
  if (!SITE) { console.warn('[push] data-site attribute required'); return; }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] Web Push not supported');
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

  function fetchJson(path, opts) {
    return fetch(SERVER + path, opts).then(function (r) { return r.json(); });
  }

  function register() {
    return navigator.serviceWorker.register(SERVER + '/sw.js', { scope: '/' }).catch(function () {
      // Fallback: try same-origin SW path
      return navigator.serviceWorker.register('/sw.js');
    });
  }

  async function subscribe() {
    try {
      var permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      var reg = await navigator.serviceWorker.ready;
      var keyResp = await fetchJson('/api/push/vapid-key');
      if (!keyResp.publicKey) throw new Error('No VAPID key');

      var existing = await reg.pushManager.getSubscription();
      if (!existing) {
        existing = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyResp.publicKey),
        });
      }

      await fetch(SERVER + '/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: existing.toJSON(), site: SITE }),
      });
    } catch (e) {
      console.warn('[push] subscribe failed:', e.message);
    }
  }

  function showPrompt() {
    if (Notification.permission === 'granted') { subscribe(); return; }
    if (Notification.permission === 'denied') return;

    var bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#1f2937;color:#fff;padding:14px 18px;font-family:system-ui,sans-serif;font-size:14px;display:flex;gap:12px;align-items:center;justify-content:center;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
    bar.innerHTML = '<span>🔔 Receba as melhores ofertas em primeira mão</span>' +
                    '<button id="pushAccept" style="background:#8b5cf6;color:#fff;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-weight:600">Permitir</button>' +
                    '<button id="pushDeny" style="background:transparent;color:#9ca3af;border:none;padding:8px 12px;cursor:pointer">Agora não</button>';
    document.body.appendChild(bar);
    document.getElementById('pushAccept').onclick = function () { bar.remove(); subscribe(); };
    document.getElementById('pushDeny').onclick = function () { bar.remove(); };
  }

  register().then(function () {
    setTimeout(showPrompt, 3000);
  });
})();
