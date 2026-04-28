require('dotenv').config();
const webpush = require('web-push');
const db = require('../db/database');

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC;
  const priv = process.env.VAPID_PRIVATE;
  const contact = process.env.VAPID_CONTACT || 'mailto:admin@example.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(contact, pub, priv);
  configured = true;
  return true;
}

const PERMANENTLY_DEAD_CODES = new Set([400, 401, 403, 404, 410]);

function isPayloadValid(p) {
  if (!p) return false;
  const title = String(p.title || '').trim();
  const body = String(p.body || p.message || '').trim();
  return title.length > 0 && body.length > 0;
}

async function sendToSubscriber(subscriber, payload) {
  configure();
  if (!isPayloadValid(payload)) {
    console.warn('[webpush] refusing to send empty payload to sub', subscriber.id);
    return { ok: false, error: 'empty_payload' };
  }
  const sub = {
    endpoint: subscriber.endpoint,
    keys: { p256dh: subscriber.p256dh, auth: subscriber.auth },
  };
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600 });
    return { ok: true };
  } catch (e) {
    if (PERMANENTLY_DEAD_CODES.has(e.statusCode)) {
      db.prepare('UPDATE subscribers SET active = 0 WHERE id = ?').run(subscriber.id);
      return { ok: false, expired: true, status: e.statusCode };
    }
    return { ok: false, error: e.message, status: e.statusCode };
  }
}

async function sendCampaign(siteId, payload) {
  configure();
  const subs = db.prepare(`
    SELECT id, endpoint, p256dh, auth FROM subscribers
    WHERE site_id = ? AND active = 1
  `).all(siteId);

  if (subs.length === 0) {
    return { mock: true, izooto_campaign_id: `wp_empty_${Date.now()}`, status: 'no_subscribers', sent: 0, failed: 0 };
  }

  let sent = 0, failed = 0, expired = 0;
  for (const s of subs) {
    const r = await sendToSubscriber(s, payload);
    if (r.ok) sent++;
    else if (r.expired) expired++;
    else failed++;
  }

  return {
    izooto_campaign_id: `wp_${Date.now()}`,
    status: 'sent',
    sent,
    failed,
    expired,
    total: subs.length,
  };
}

function getSubscriberCount(siteId) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM subscribers WHERE site_id = ? AND active = 1').get(siteId);
  return row?.n || 0;
}

module.exports = { sendCampaign, sendToSubscriber, getSubscriberCount, configure };
