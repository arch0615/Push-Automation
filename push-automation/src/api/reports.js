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
  let whereClause;
  let days;
  if (period === 'today') {
    whereClause = `DATE(cp.sent_at, 'localtime') = DATE('now', 'localtime')`;
    days = 1;
  } else if (period === 'yesterday') {
    whereClause = `DATE(cp.sent_at, 'localtime') = DATE('now', 'localtime', '-1 day')`;
    days = 1;
  } else if (period === 'month') {
    whereClause = `cp.sent_at >= datetime('now', '-30 days')`;
    days = 30;
  } else {
    whereClause = `cp.sent_at >= datetime('now', '-7 days')`;
    days = 7;
  }

  const rows = db.prepare(`
    SELECT DATE(cp.sent_at, 'localtime') AS day,
           COUNT(*) AS sent,
           SUM(cp.impressions) AS impressions,
           SUM(cp.clicks) AS clicks
    FROM campaigns cp
    WHERE ${whereClause}
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

router.get('/top-copies', (req, res) => {
  const minImpressions = parseInt(req.query.min_impressions || '20', 10);
  const limitPerSite = parseInt(req.query.limit || '5', 10);

  const sites = db.prepare(`SELECT id, name, domain FROM sites ORDER BY id`).all();
  const result = sites.map(site => {
    const top = db.prepare(`
      SELECT c.id, c.template, c.title, c.description, c.status,
             SUM(cp.impressions) AS impressions,
             SUM(cp.clicks) AS clicks,
             CASE WHEN SUM(cp.impressions) > 0
                  THEN (CAST(SUM(cp.clicks) AS REAL) / SUM(cp.impressions)) * 100
                  ELSE 0 END AS ctr,
             u.label AS url_label
      FROM copies c
      JOIN urls u ON u.id = c.url_id
      JOIN campaigns cp ON cp.copy_id = c.id
      WHERE u.site_id = ?
      GROUP BY c.id
      HAVING impressions >= ?
      ORDER BY ctr DESC, impressions DESC
      LIMIT ?
    `).all(site.id, minImpressions, limitPerSite);
    return { site_id: site.id, site_name: site.name, site_domain: site.domain, copies: top };
  });

  res.json(result);
});

// New subscribers per day per site. Used by the Início page table the
// operator opens to verify the push system is still capturing leads
// (Julio reported on 2026-06-04 that Diário Vagas looked "stuck" — the
// active count was low but the all-time / daily-new counts were healthy;
// this endpoint exposes the daily-new view so the difference is visible).
router.get('/subscribers-daily', (req, res) => {
  const days = Math.max(1, Math.min(60, parseInt(req.query.days || '14', 10)));
  const sites = db.prepare(`SELECT id, domain FROM sites ORDER BY id`).all();
  const rows = db.prepare(`
    SELECT date(created_at) AS day, site_id, COUNT(*) AS new_subs
      FROM subscribers
     WHERE created_at >= date('now', ?)
     GROUP BY day, site_id
  `).all(`-${days} days`);

  // Build a dense date axis going back N days so days with zero new subs
  // still appear in the table (otherwise the operator can't tell "no
  // signups" from "no data").
  const dateAxis = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86_400_000);
    dateAxis.push(d.toISOString().slice(0, 10));
  }

  const bySite = new Map(sites.map((s) => [s.id, { domain: s.domain, per_day: new Array(days).fill(0), total: 0 }]));
  for (const r of rows) {
    const acc = bySite.get(r.site_id);
    if (!acc) continue;
    const idx = dateAxis.indexOf(r.day);
    if (idx === -1) continue;
    acc.per_day[idx] = r.new_subs;
    acc.total += r.new_subs;
  }

  const totalsPerDay = new Array(days).fill(0);
  for (const acc of bySite.values()) {
    for (let i = 0; i < days; i++) totalsPerDay[i] += acc.per_day[i];
  }

  res.json({
    days,
    dates: dateAxis,
    sites: [...bySite.values()].sort((a, b) => b.total - a.total),
    totals_per_day: totalsPerDay,
    grand_total: totalsPerDay.reduce((a, b) => a + b, 0),
  });
});

// Per-site subscriber lifetime stats. Two cohorts:
//   1) "Zombies" — subscribers we already lost (active=0). For these we
//      compute how long they were alive before the cleanup marked them
//      dead, using last_delivery_confirmed_at (or last_seen as fallback)
//      minus created_at. This is the retention reality of each site.
//   2) "Ativos" — subscribers still in the list. Their "lifetime" so far
//      is just now − created_at. Useful to see how fresh each site's
//      audience is on average.
//
// julianday() returns calendar-day-fraction; we round to one decimal so
// the dashboard shows e.g. "1.6 dias" rather than 1.6172...
router.get('/subscriber-lifetime', (req, res) => {
  const zombies = db.prepare(`
    SELECT s.id AS site_id, s.domain,
           COUNT(sub.id) AS zombies,
           ROUND(AVG(
             julianday(COALESCE(sub.last_delivery_confirmed_at, sub.last_seen))
             - julianday(sub.created_at)
           ), 1) AS avg_days_zombies,
           ROUND(MAX(
             julianday(COALESCE(sub.last_delivery_confirmed_at, sub.last_seen))
             - julianday(sub.created_at)
           ), 1) AS max_days_zombies
      FROM sites s
      JOIN subscribers sub ON sub.site_id = s.id
     WHERE sub.active = 0 AND sub.created_at IS NOT NULL
     GROUP BY s.id
  `).all();

  const actives = db.prepare(`
    SELECT s.id AS site_id, s.domain,
           COUNT(sub.id) AS actives,
           ROUND(AVG(julianday('now') - julianday(sub.created_at)), 1) AS avg_days_actives,
           ROUND(MAX(julianday('now') - julianday(sub.created_at)), 1) AS max_days_actives
      FROM sites s
      JOIN subscribers sub ON sub.site_id = s.id
     WHERE sub.active = 1 AND sub.created_at IS NOT NULL
     GROUP BY s.id
  `).all();

  // Stitch the two cohort rows together per site (one site can have data
  // on either side or both).
  const byId = new Map();
  for (const r of zombies) {
    byId.set(r.site_id, { domain: r.domain, zombies: r.zombies, avg_zombie_days: r.avg_days_zombies, max_zombie_days: r.max_days_zombies, actives: 0, avg_active_days: 0, max_active_days: 0 });
  }
  for (const r of actives) {
    const cur = byId.get(r.site_id) || { domain: r.domain, zombies: 0, avg_zombie_days: 0, max_zombie_days: 0 };
    cur.actives = r.actives;
    cur.avg_active_days = r.avg_days_actives;
    cur.max_active_days = r.max_days_actives;
    byId.set(r.site_id, cur);
  }

  const rows = [...byId.values()].sort((a, b) => (b.actives + b.zombies) - (a.actives + a.zombies));
  res.json({ sites: rows });
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
