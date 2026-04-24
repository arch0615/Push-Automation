const express = require('express');
const db = require('../db/database');
const { refreshRecent } = require('../learning/tracker');
const { templateCtrForUrl, bestTemplateForUrl, bestHourForUrl } = require('../learning/engine');

const router = express.Router();

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get('/summary', (req, res) => {
  const period = req.query.period || 'week';
  const days = period === 'month' ? 30 : 7;

  const rows = db.prepare(`
    SELECT DATE(cp.sent_at, 'localtime') AS day,
           COUNT(*) AS sent,
           SUM(cp.impressions) AS impressions,
           SUM(cp.clicks) AS clicks
    FROM campaigns cp
    WHERE cp.sent_at >= datetime('now', '-${days} days')
    GROUP BY day
    ORDER BY day DESC
  `).all();

  const totals = rows.reduce((a, r) => ({
    sent: a.sent + r.sent,
    impressions: a.impressions + (r.impressions || 0),
    clicks: a.clicks + (r.clicks || 0),
  }), { sent: 0, impressions: 0, clicks: 0 });

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  res.json({ period, days, totals: { ...totals, ctr }, daily: rows });
});

router.get('/url/:id/insights', (req, res) => {
  const urlId = parseInt(req.params.id, 10);
  const url = db.prepare('SELECT * FROM urls WHERE id = ?').get(urlId);
  if (!url) return res.status(404).json({ error: 'URL not found' });

  const templates = templateCtrForUrl(urlId);
  const best = bestTemplateForUrl(urlId);
  const bestHour = bestHourForUrl(urlId);

  res.json({
    url_id: urlId,
    label: url.label,
    templates: templates.sort((a, b) => b.adjusted_ctr - a.adjusted_ctr),
    best_template: best,
    best_hour: bestHour,
  });
});

router.get('/export.csv', (req, res) => {
  const days = parseInt(req.query.days || '7', 10);
  const rows = db.prepare(`
    SELECT cp.sent_at, s.domain AS site, u.label AS url_label, u.url, u.niche,
           c.template, c.variation, c.title, c.description,
           cp.impressions, cp.clicks, cp.ctr, cp.izooto_campaign_id
    FROM campaigns cp
    JOIN copies c ON c.id = cp.copy_id
    JOIN urls u ON u.id = c.url_id
    JOIN sites s ON s.id = u.site_id
    WHERE cp.sent_at >= datetime('now', '-${days} days')
    ORDER BY cp.sent_at DESC
  `).all();

  const headers = ['sent_at','site','url_label','url','niche','template','variation','title','description','impressions','clicks','ctr','izooto_campaign_id'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => csvEscape(r[h])).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="campanhas_${days}d.csv"`);
  res.send(lines.join('\n'));
});

router.post('/refresh-ctr', async (req, res) => {
  try {
    const results = await refreshRecent(100);
    res.json({ ok: true, count: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
