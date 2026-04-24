const db = require('../db/database');
const settings = require('../api/settings');
const { sendCampaign } = require('../izooto/client');
const { generateVariations } = require('../ai/generate');
const { composeForCopy } = require('../images/composer');

const MIN_VARIATIONS = 3;

function getSentToday(urlId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n
    FROM campaigns c
    JOIN copies p ON p.id = c.copy_id
    WHERE p.url_id = ? AND DATE(c.sent_at) = DATE('now', 'localtime')
  `).get(urlId);
  return row?.n || 0;
}

function pickNextCopy(urlId) {
  const pending = db.prepare(`
    SELECT c.* FROM copies c
    LEFT JOIN campaigns cp ON cp.copy_id = c.id
    WHERE c.url_id = ? AND cp.id IS NULL
    ORDER BY c.variation ASC, c.created_at ASC
    LIMIT 1
  `).get(urlId);
  return pending;
}

async function ensureFreshVariations(url) {
  const pendingCount = db.prepare(`
    SELECT COUNT(*) AS n FROM copies c
    LEFT JOIN campaigns cp ON cp.copy_id = c.id
    WHERE c.url_id = ? AND cp.id IS NULL
  `).get(url.id).n;

  if (pendingCount >= MIN_VARIATIONS) return 0;

  const needed = MIN_VARIATIONS - pendingCount;
  const variations = await generateVariations(url.url, url.label, url.niche, needed, url.id);
  const insert = db.prepare(`
    INSERT INTO copies (url_id, template, title, description, image_filename, variation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let created = 0;
  for (let i = 0; i < variations.length; i++) {
    const v = variations[i];
    let imageFilename = null;
    try {
      const img = await composeForCopy(v);
      imageFilename = img.filename;
    } catch (e) {
      console.error(`Image failed for ${v.template}:`, e.message);
    }
    insert.run(url.id, v.template, v.title, v.description, imageFilename, pendingCount + i + 1);
    created++;
  }
  return created;
}

async function sendOneForUrl(url) {
  if (url.status !== 'ativa') return { skipped: 'paused' };

  const sentToday = getSentToday(url.id);
  if (sentToday >= (url.daily_limit || 3)) return { skipped: 'daily_limit_reached', sentToday };

  await ensureFreshVariations(url);
  const copy = pickNextCopy(url.id);
  if (!copy) return { skipped: 'no_pending_copy' };

  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(url.site_id);
  if (!site) return { skipped: 'site_not_found' };

  const baseUrl = settings.get('public_base_url', 'http://pushudc.top');
  const iconUrl = copy.image_filename
    ? `${baseUrl}/images/generated/${copy.image_filename}`
    : null;

  const result = await sendCampaign(site.api_key, {
    name: `${site.name}-${url.id}-v${copy.variation}-${Date.now()}`,
    title: copy.title,
    message: copy.description,
    iconUrl,
    landingUrl: url.url,
  });

  db.prepare(`
    INSERT INTO campaigns (copy_id, izooto_campaign_id, sent_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(copy.id, result.izooto_campaign_id);

  db.prepare(`UPDATE copies SET status = 'sent' WHERE id = ?`).run(copy.id);

  return {
    sent: true,
    copy_id: copy.id,
    title: copy.title,
    template: copy.template,
    izooto_campaign_id: result.izooto_campaign_id,
    mock: result.mock || false,
  };
}

async function runCycle() {
  const urls = db.prepare(`SELECT * FROM urls WHERE status = 'ativa'`).all();
  const results = [];
  for (const url of urls) {
    try {
      const r = await sendOneForUrl(url);
      results.push({ url_id: url.id, label: url.label, ...r });
    } catch (e) {
      console.error(`Send failed for URL ${url.id}:`, e.message);
      results.push({ url_id: url.id, label: url.label, error: e.message });
    }
  }
  return results;
}

module.exports = { runCycle, sendOneForUrl, ensureFreshVariations };
