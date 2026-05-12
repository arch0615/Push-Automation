const db = require('../db/database');
const settings = require('../api/settings');
const izooto = require('../izooto/client');
const webpush = require('../webpush/client');
const { generateVariations } = require('../ai/generate');
const { composeForCopy } = require('../images/composer');
const { getCta } = require('../ai/templates');

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
    WHERE c.url_id = ? AND cp.id IS NULL AND (c.status IS NULL OR c.status != 'paused')
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
  const lang = url.language || 'pt-BR';
  const variations = await generateVariations(url.url, url.label, url.niche, needed, url.id, lang);
  const insert = db.prepare(`
    INSERT INTO copies (url_id, template, title, description, image_filename, variation, language)
    VALUES (?, ?, ?, ?, ?, ?, ?)
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
    insert.run(url.id, v.template, v.title, v.description, imageFilename, pendingCount + i + 1, lang);
    created++;
  }
  return created;
}

async function sendOneForUrl(url) {
  if (settings.get('system_paused', 'false') === 'true') return { skipped: 'system_paused' };
  if (url.status !== 'ativa') return { skipped: 'paused' };

  const sentToday = getSentToday(url.id);
  if (sentToday >= (url.daily_limit || 3)) return { skipped: 'daily_limit_reached', sentToday };

  await ensureFreshVariations(url);
  const copy = pickNextCopy(url.id);
  if (!copy) return { skipped: 'no_pending_copy' };

  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(url.site_id);
  if (!site) return { skipped: 'site_not_found' };

  const baseUrl = settings.get('public_base_url', 'https://pushudc.top');
  const iconUrl = copy.image_filename
    ? `${baseUrl}/images/generated/${copy.image_filename}`
    : null;

  const provider = settings.get('delivery_provider', 'webpush');
  const campaignInsert = db.prepare(`
    INSERT INTO campaigns (copy_id, izooto_campaign_id, sent_at, impressions)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?)
  `);

  const trackingParams = settings.get('tracking_params', '');
  function appendParams(rawUrl, campaignId) {
    if (!trackingParams && !campaignId) return rawUrl;
    let extra = trackingParams || '';
    if (campaignId) {
      const cidParam = `utm_campaign=push_${campaignId}`;
      extra = extra ? `${extra}&${cidParam}` : cidParam;
    }
    if (!extra) return rawUrl;
    const sep = rawUrl.includes('?') ? '&' : '?';
    return rawUrl + sep + extra;
  }

  let result, impressions = 0;
  if (provider === 'webpush') {
    const subCount = webpush.getSubscriberCount(site.id);
    const insertRow = campaignInsert.run(copy.id, null, subCount);
    const campaignId = insertRow.lastInsertRowid;
    const landingWithParams = appendParams(url.url, campaignId);
    const cta = getCta(copy.template, url.language || 'pt-BR');
    result = await webpush.sendCampaign(site.id, {
      title: copy.title,
      body: copy.description,
      icon: iconUrl,
      url: landingWithParams,
      campaignId,
      trackingHost: baseUrl,
      cta,
    });
    impressions = result.sent || 0;
    // impressions = accepted by push service ("sent_201"); delivered_count is
    // populated asynchronously by the SW pingback as users actually receive
    // the push. Splitting failed/expired lets the dashboard distinguish
    // "transient failure (retry next time)" from "dead endpoint (was cleaned
    // up at send time)". Total failures stays in `failed` for backward compat.
    db.prepare('UPDATE campaigns SET izooto_campaign_id = ?, impressions = ?, failed = ?, expired_count = ? WHERE id = ?')
      .run(
        result.izooto_campaign_id,
        impressions,
        (result.failed || 0) + (result.expired || 0),
        result.expired || 0,
        campaignId,
      );
    db.prepare(`UPDATE copies SET status = 'sent' WHERE id = ?`).run(copy.id);
    return {
      sent: true,
      copy_id: copy.id,
      title: copy.title,
      template: copy.template,
      provider: 'webpush',
      subscribers: subCount,
      delivered: result.sent,
      failed: result.failed,
      mock: result.mock || false,
    };
  } else {
    const landingWithParams = appendParams(url.url, null);
    result = await izooto.sendCampaign(site.api_key, {
      name: `${site.name}-${url.id}-v${copy.variation}-${Date.now()}`,
      title: copy.title,
      message: copy.description,
      iconUrl,
      landingUrl: landingWithParams,
    });
    campaignInsert.run(copy.id, result.izooto_campaign_id, 0);
    db.prepare(`UPDATE copies SET status = 'sent' WHERE id = ?`).run(copy.id);
    return {
      sent: true,
      copy_id: copy.id,
      title: copy.title,
      template: copy.template,
      provider: 'izooto',
      izooto_campaign_id: result.izooto_campaign_id,
      mock: result.mock || false,
    };
  }
}

async function runCycle(opts = {}) {
  const onlyFixedSites = opts.onlyFixedSites !== false;
  const sql = onlyFixedSites
    ? `SELECT u.* FROM urls u JOIN sites s ON s.id = u.site_id WHERE u.status = 'ativa' AND s.daily_target = 0`
    : `SELECT u.* FROM urls u WHERE u.status = 'ativa'`;
  const urls = db.prepare(sql).all();
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

function getSentTodayGlobal() {
  const row = db.prepare(`
    SELECT COUNT(*) AS n FROM campaigns
    WHERE DATE(sent_at) = DATE('now', 'localtime')
  `).get();
  return row?.n || 0;
}

function getSentTodayForSite(siteId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n FROM campaigns c
    JOIN copies p ON p.id = c.copy_id
    JOIN urls u ON u.id = p.url_id
    WHERE u.site_id = ? AND DATE(c.sent_at) = DATE('now', 'localtime')
  `).get(siteId);
  return row?.n || 0;
}

function parseHHMM(str) {
  const [h, m] = String(str || '').split(':').map(n => parseInt(n, 10));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function pickNextUrlForSite(siteId) {
  const urls = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM campaigns c
       JOIN copies p ON p.id = c.copy_id
       WHERE p.url_id = u.id AND DATE(c.sent_at) = DATE('now', 'localtime')) AS sent_today
    FROM urls u
    WHERE u.status = 'ativa' AND u.site_id = ?
  `).all(siteId);

  const eligible = urls.filter(u => u.sent_today < (u.daily_limit || 999));
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const ratioA = a.sent_today / (a.daily_limit || 1);
    const ratioB = b.sent_today / (b.daily_limit || 1);
    return ratioA - ratioB;
  });
  return eligible[0];
}

async function runSmartTick() {
  const sites = db.prepare(`
    SELECT id, name, domain, daily_target, active_window_start, active_window_end
    FROM sites
    WHERE daily_target > 0
  `).all();

  if (sites.length === 0) return { skipped: 'no_sites_with_target' };

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const results = [];

  for (const site of sites) {
    const startMin = parseHHMM(site.active_window_start);
    const endMin = parseHHMM(site.active_window_end);
    if (startMin == null || endMin == null) continue;
    if (nowMin < startMin || nowMin > endMin) {
      results.push({ site_id: site.id, domain: site.domain, skipped: 'outside_window' });
      continue;
    }

    const elapsed = nowMin - startMin;
    const total = Math.max(1, endMin - startMin);
    const expectedSent = (elapsed / total) * site.daily_target;
    const sentToday = getSentTodayForSite(site.id);

    if (sentToday >= site.daily_target) {
      results.push({ site_id: site.id, domain: site.domain, skipped: 'site_target_reached', sentToday, target: site.daily_target });
      continue;
    }
    if (sentToday >= expectedSent) {
      results.push({ site_id: site.id, domain: site.domain, skipped: 'on_pace', sentToday, expected: Math.floor(expectedSent) });
      continue;
    }

    const url = pickNextUrlForSite(site.id);
    if (!url) {
      results.push({ site_id: site.id, domain: site.domain, skipped: 'no_eligible_url' });
      continue;
    }

    try {
      const r = await sendOneForUrl(url);
      results.push({ site_id: site.id, domain: site.domain, url_id: url.id, label: url.label, sentToday: sentToday + 1, target: site.daily_target, ...r });
    } catch (e) {
      results.push({ site_id: site.id, error: e.message });
    }
  }

  return { ok: true, results };
}

module.exports = { runCycle, runSmartTick, sendOneForUrl, ensureFreshVariations, getSentTodayGlobal, getSentTodayForSite };
