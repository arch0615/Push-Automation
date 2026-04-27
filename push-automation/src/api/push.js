const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/vapid-key', (req, res) => {
  const pub = process.env.VAPID_PUBLIC;
  if (!pub) return res.status(500).json({ error: 'VAPID not configured' });
  res.set('Access-Control-Allow-Origin', '*');
  res.json({ publicKey: pub });
});

router.post('/subscribe', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const { subscription, site } = req.body || {};
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }
  if (!site) return res.status(400).json({ error: 'Site identifier required' });

  const siteRow = db.prepare(`
    SELECT id FROM sites WHERE name = ? OR domain = ? OR app_id = ?
  `).get(site, site, site);
  if (!siteRow) return res.status(404).json({ error: 'Site not registered' });

  const ua = req.headers['user-agent'] || '';
  try {
    db.prepare(`
      INSERT INTO subscribers (site_id, endpoint, p256dh, auth, user_agent, active, last_seen)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(endpoint) DO UPDATE SET
        active = 1,
        last_seen = CURRENT_TIMESTAMP,
        site_id = excluded.site_id
    `).run(siteRow.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, ua);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/unsubscribe', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });
  db.prepare('UPDATE subscribers SET active = 0 WHERE endpoint = ?').run(endpoint);
  res.json({ ok: true });
});

router.options('/subscribe', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});

router.options('/vapid-key', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.sendStatus(204);
});

router.get('/click/:campaignId', (req, res) => {
  const campaignId = parseInt(req.params.campaignId, 10);
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing url');

  try {
    db.prepare(`
      INSERT INTO clicks (campaign_id, ip, user_agent)
      VALUES (?, ?, ?)
    `).run(campaignId, req.ip, req.headers['user-agent'] || '');

    db.prepare(`
      UPDATE campaigns
      SET clicks = (SELECT COUNT(*) FROM clicks WHERE campaign_id = ?),
          ctr = CASE WHEN impressions > 0
                THEN (CAST((SELECT COUNT(*) FROM clicks WHERE campaign_id = ?) AS REAL) / impressions) * 100
                ELSE 0 END
      WHERE id = ?
    `).run(campaignId, campaignId, campaignId);
  } catch (e) {
    console.error('Click tracking failed:', e.message);
  }

  res.redirect(302, target);
});

module.exports = router;
