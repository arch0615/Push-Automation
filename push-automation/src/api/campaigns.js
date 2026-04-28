const express = require('express');
const db = require('../db/database');
const { runCycle, sendOneForUrl } = require('../scheduler/sender');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.izooto_campaign_id, c.sent_at, c.impressions, c.clicks, c.ctr,
           p.title, p.description, p.template, p.variation,
           u.url, u.label, u.niche,
           s.id AS site_id, s.name AS site_name, s.domain AS site_domain
    FROM campaigns c
    JOIN copies p ON p.id = c.copy_id
    JOIN urls u ON u.id = p.url_id
    JOIN sites s ON s.id = u.site_id
    ORDER BY c.sent_at DESC
    LIMIT 200
  `).all();
  res.json(rows);
});

router.post('/send-now', (req, res) => {
  const activeUrls = db.prepare(`SELECT COUNT(*) AS n FROM urls WHERE status = 'ativa'`).get().n;
  res.json({ ok: true, queued_urls: activeUrls, message: 'Disparo iniciado em segundo plano. Atualize a aba Campanhas em alguns segundos para ver os envios.' });

  setImmediate(async () => {
    try {
      const results = await runCycle({ onlyFixedSites: false });
      const sent = results.filter(r => r.sent).length;
      console.log(`[send-now] manual cycle: sent=${sent} of ${results.length}`);
    } catch (e) {
      console.error('[send-now] manual cycle failed:', e.message);
    }
  });
});

router.post('/send-url/:id', async (req, res) => {
  const url = db.prepare('SELECT * FROM urls WHERE id = ?').get(req.params.id);
  if (!url) return res.status(404).json({ error: 'URL not found' });
  try {
    const result = await sendOneForUrl(url);
    res.json({ url_id: url.id, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
