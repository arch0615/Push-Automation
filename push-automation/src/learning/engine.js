const db = require('../db/database');

const MIN_IMPRESSIONS = 50;
const PRIOR_CTR = 1.0;
const PRIOR_WEIGHT = 20;

function templateCtrForUrl(urlId) {
  const rows = db.prepare(`
    SELECT c.template,
           SUM(cp.impressions) AS impressions,
           SUM(cp.clicks) AS clicks
    FROM campaigns cp
    JOIN copies c ON c.id = cp.copy_id
    WHERE c.url_id = ?
    GROUP BY c.template
  `).all(urlId);

  return rows.map(r => {
    const effCtr = (r.clicks + (PRIOR_CTR * PRIOR_WEIGHT / 100)) /
                   (r.impressions + PRIOR_WEIGHT) * 100;
    return {
      template: r.template,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      raw_ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
      adjusted_ctr: effCtr,
      reliable: (r.impressions || 0) >= MIN_IMPRESSIONS,
    };
  });
}

function bestTemplateForUrl(urlId) {
  const stats = templateCtrForUrl(urlId);
  if (stats.length === 0) return null;
  return stats.reduce((a, b) => b.adjusted_ctr > a.adjusted_ctr ? b : a);
}

function bestHourForUrl(urlId) {
  const rows = db.prepare(`
    SELECT CAST(strftime('%H', cp.sent_at, 'localtime') AS INTEGER) AS hour,
           SUM(cp.impressions) AS impressions,
           SUM(cp.clicks) AS clicks
    FROM campaigns cp
    JOIN copies c ON c.id = cp.copy_id
    WHERE c.url_id = ? AND cp.impressions > 0
    GROUP BY hour
  `).all(urlId);

  if (rows.length === 0) return null;
  const ranked = rows.map(r => ({
    hour: r.hour,
    ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    impressions: r.impressions,
  })).sort((a, b) => b.ctr - a.ctr);
  return ranked[0];
}

function pickWeightedTemplate(urlId, niche, candidateTemplates) {
  const stats = templateCtrForUrl(urlId);
  const statMap = new Map(stats.map(s => [s.template, s]));

  const weights = candidateTemplates.map(t => {
    const s = statMap.get(t.key);
    const base = s ? s.adjusted_ctr : PRIOR_CTR;
    return Math.max(0.1, base);
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidateTemplates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidateTemplates[i];
  }
  return candidateTemplates[candidateTemplates.length - 1];
}

module.exports = {
  templateCtrForUrl,
  bestTemplateForUrl,
  bestHourForUrl,
  pickWeightedTemplate,
};
