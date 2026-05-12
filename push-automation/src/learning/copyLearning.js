const db = require('../db/database');

const MIN_IMPRESSIONS_FOR_LEARNING = 50;

function getTopAndBottomCopies(urlId, n = 3, language = null) {
  const langFilter = language ? `AND c.language = '${language === 'en' ? 'en' : 'pt-BR'}'` : '';
  const candidates = db.prepare(`
    SELECT c.id, c.template, c.title, c.description, c.language,
           SUM(cp.impressions) AS impressions,
           SUM(cp.clicks) AS clicks,
           CASE WHEN SUM(cp.impressions) > 0
                THEN (CAST(SUM(cp.clicks) AS REAL) / SUM(cp.impressions)) * 100
                ELSE 0 END AS ctr
    FROM copies c
    JOIN campaigns cp ON cp.copy_id = c.id
    WHERE c.url_id = ? ${langFilter}
    GROUP BY c.id
    HAVING impressions >= ?
    ORDER BY ctr DESC
  `).all(urlId, MIN_IMPRESSIONS_FOR_LEARNING);

  if (candidates.length === 0) return { winners: [], losers: [] };

  const winners = candidates.slice(0, n);
  const losers = candidates.length > n
    ? candidates.slice(-Math.min(n, candidates.length - winners.length))
    : [];
  return { winners, losers };
}

function autoPauseLosers(urlId, ctrThresholdRatio = 0.4, minImpressions = MIN_IMPRESSIONS_FOR_LEARNING) {
  const stats = db.prepare(`
    SELECT c.id,
           SUM(cp.impressions) AS impressions,
           SUM(cp.clicks) AS clicks,
           CASE WHEN SUM(cp.impressions) > 0
                THEN (CAST(SUM(cp.clicks) AS REAL) / SUM(cp.impressions)) * 100
                ELSE 0 END AS ctr
    FROM copies c
    JOIN campaigns cp ON cp.copy_id = c.id
    WHERE c.url_id = ? AND c.status != 'paused'
    GROUP BY c.id
    HAVING impressions >= ?
  `).all(urlId, minImpressions);

  if (stats.length === 0) return { paused: 0 };

  const avgCtr = stats.reduce((s, r) => s + r.ctr, 0) / stats.length;
  const cutoff = avgCtr * ctrThresholdRatio;

  const losers = stats.filter(s => s.ctr < cutoff);
  if (losers.length === 0) return { paused: 0, avgCtr };

  const ids = losers.map(l => l.id);
  db.prepare(`UPDATE copies SET status = 'paused' WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  return { paused: ids.length, avgCtr, ids };
}

module.exports = { getTopAndBottomCopies, autoPauseLosers, MIN_IMPRESSIONS_FOR_LEARNING };
