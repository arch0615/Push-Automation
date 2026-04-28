const db = require('../db/database');
const { getCampaignStats } = require('../izooto/client');

function isWebPushCampaign(campaignId) {
  return String(campaignId || '').startsWith('wp_');
}

async function refreshOneCampaign(campaignRow) {
  if (isWebPushCampaign(campaignRow.izooto_campaign_id)) {
    const fresh = db.prepare('SELECT impressions, clicks, ctr FROM campaigns WHERE id = ?').get(campaignRow.id);
    if (fresh && fresh.impressions > 0) {
      const ctr = (fresh.clicks / fresh.impressions) * 100;
      db.prepare('UPDATE campaigns SET ctr = ? WHERE id = ?').run(ctr, campaignRow.id);
      return { id: campaignRow.id, ...fresh, ctr, source: 'webpush' };
    }
    return { id: campaignRow.id, source: 'webpush', skipped: 'no_data_yet' };
  }

  const site = db.prepare(`
    SELECT s.* FROM sites s
    JOIN urls u ON u.site_id = s.id
    JOIN copies c ON c.url_id = u.id
    WHERE c.id = ?
  `).get(campaignRow.copy_id);

  const stats = await getCampaignStats(site?.api_key, campaignRow.izooto_campaign_id);
  const impressions = Number(stats.impressions || 0);
  const clicks = Number(stats.clicks || 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  db.prepare(`
    UPDATE campaigns
    SET impressions = ?, clicks = ?, ctr = ?
    WHERE id = ?
  `).run(impressions, clicks, ctr, campaignRow.id);

  return { id: campaignRow.id, impressions, clicks, ctr, source: 'izooto', mock: stats.mock || false };
}

async function refreshRecent(limit = 100) {
  const rows = db.prepare(`
    SELECT id, copy_id, izooto_campaign_id
    FROM campaigns
    WHERE izooto_campaign_id IS NOT NULL
    ORDER BY sent_at DESC
    LIMIT ?
  `).all(limit);

  const results = [];
  for (const r of rows) {
    try {
      results.push(await refreshOneCampaign(r));
    } catch (e) {
      console.error(`CTR refresh failed for campaign ${r.id}:`, e.message);
      results.push({ id: r.id, error: e.message });
    }
  }
  return results;
}

module.exports = { refreshOneCampaign, refreshRecent, isWebPushCampaign };
