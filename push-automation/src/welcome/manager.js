const db = require('../db/database');
const settings = require('../api/settings');
const webpush = require('../webpush/client');
const { generateCopy } = require('../ai/generate');
const { compose } = require('../images/composer');
const { getCta, getTemplate } = require('../ai/templates');

function listStepsForSite(siteId) {
  return db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM welcome_sent ws WHERE ws.step_id = s.id) AS sent,
      (SELECT COUNT(*) FROM welcome_clicks wc WHERE wc.step_id = s.id) AS clicks,
      (SELECT MAX(sent_at) FROM welcome_sent ws WHERE ws.step_id = s.id) AS last_sent
    FROM welcome_steps s
    WHERE s.site_id = ?
    ORDER BY s.step_order ASC
  `).all(siteId);
}

function createStep(siteId, body) {
  const { delay_minutes, template, label, landing_url, enabled } = body;
  if (!template || !label || !landing_url) throw new Error('template, label e landing_url são obrigatórios');
  const max = db.prepare('SELECT COALESCE(MAX(step_order), 0) AS m FROM welcome_steps WHERE site_id = ?').get(siteId).m;
  const r = db.prepare(`
    INSERT INTO welcome_steps (site_id, step_order, delay_minutes, template, label, landing_url, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(siteId, max + 1, delay_minutes || 5, template, label, landing_url, enabled ? 1 : 0);
  return db.prepare('SELECT * FROM welcome_steps WHERE id = ?').get(r.lastInsertRowid);
}

function updateStep(stepId, body) {
  const existing = db.prepare('SELECT * FROM welcome_steps WHERE id = ?').get(stepId);
  if (!existing) return null;
  db.prepare(`
    UPDATE welcome_steps
    SET delay_minutes = COALESCE(?, delay_minutes),
        template = COALESCE(?, template),
        label = COALESCE(?, label),
        landing_url = COALESCE(?, landing_url),
        enabled = COALESCE(?, enabled)
    WHERE id = ?
  `).run(body.delay_minutes, body.template, body.label, body.landing_url,
         body.enabled === undefined ? null : (body.enabled ? 1 : 0), stepId);
  return db.prepare('SELECT * FROM welcome_steps WHERE id = ?').get(stepId);
}

function deleteStep(stepId) {
  return db.prepare('DELETE FROM welcome_steps WHERE id = ?').run(stepId).changes;
}

async function sendStepToSubscriber(subscriber, step, site) {
  const baseUrl = settings.get('public_base_url', 'https://pushudc.top');
  const language = 'pt-BR';

  const copy = await generateCopy(step.landing_url, step.label, 'geral', step.template, language);
  let imageFilename = null;
  try {
    const template = getTemplate(step.template);
    const iconPath = require('path').join(__dirname, '../../icons');
    const fs = require('fs');
    let iconFile = null;
    for (const cand of (template.icons || [template.icon])) {
      if (fs.existsSync(require('path').join(iconPath, cand))) { iconFile = cand; break; }
    }
    if (iconFile) {
      const img = await compose({ iconFile, title: copy.title });
      imageFilename = img.filename;
    }
  } catch (e) { /* image is optional */ }

  const iconUrl = imageFilename ? `${baseUrl}/images/generated/${imageFilename}` : null;
  const cta = getCta(step.template, language);

  const tracking = settings.get('tracking_params', '');
  const params = tracking ? (tracking + '&utm_campaign=welcome_' + step.id) : ('utm_campaign=welcome_' + step.id);
  const sep = step.landing_url.includes('?') ? '&' : '?';
  const fullUrl = step.landing_url + sep + params;

  const insertCampaign = db.prepare(`
    INSERT INTO copies (url_id, template, title, description, image_filename, variation, status)
    VALUES (NULL, ?, ?, ?, ?, ?, 'sent')
  `);

  await webpush.sendToSubscriber(subscriber, {
    title: copy.title,
    body: copy.description,
    icon: iconUrl,
    url: fullUrl,
    cta,
    trackingHost: baseUrl,
    trackPath: '/api/push/track-welcome-click/' + step.id,
  });

  db.prepare('INSERT INTO welcome_sent (subscriber_id, step_id) VALUES (?, ?)').run(subscriber.id, step.id);
}

async function processDueWelcomes() {
  const dueRows = db.prepare(`
    SELECT s.id AS sub_id, s.endpoint, s.p256dh, s.auth, s.site_id, s.created_at,
           ws.id AS step_id, ws.step_order, ws.delay_minutes, ws.template, ws.label, ws.landing_url
    FROM subscribers s
    JOIN welcome_steps ws ON ws.site_id = s.site_id AND ws.enabled = 1
    LEFT JOIN welcome_sent wsent ON wsent.subscriber_id = s.id AND wsent.step_id = ws.id
    WHERE s.active = 1
      AND wsent.id IS NULL
      AND datetime(s.created_at, '+' || (
        SELECT COALESCE(SUM(delay_minutes), 0)
        FROM welcome_steps
        WHERE site_id = s.site_id
          AND step_order <= ws.step_order
          AND enabled = 1
      ) || ' minutes') <= datetime('now')
    ORDER BY ws.step_order ASC
    LIMIT 100
  `).all();

  let sent = 0, failed = 0;
  for (const row of dueRows) {
    const subscriber = { id: row.sub_id, endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth };
    const step = { id: row.step_id, step_order: row.step_order, template: row.template, label: row.label, landing_url: row.landing_url };
    const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(row.site_id);
    try {
      await sendStepToSubscriber(subscriber, step, site);
      sent++;
    } catch (e) {
      console.error(`[welcome] step ${step.id} → sub ${subscriber.id} failed:`, e.message);
      failed++;
    }
  }
  return { processed: dueRows.length, sent, failed };
}

module.exports = { listStepsForSite, createStep, updateStep, deleteStep, processDueWelcomes };
