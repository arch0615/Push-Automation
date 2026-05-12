const cron = require('node-cron');
const db = require('../db/database');
const { runCycle, runSmartTick } = require('./sender');
const { refreshRecent } = require('../learning/tracker');
const { processDueWelcomes } = require('../welcome/manager');
const { autoPauseLosers } = require('../learning/copyLearning');
const settings = require('../api/settings');

// Zombie cleanup: a subscriber counts as zombie if they've been registered
// for more than ZOMBIE_GRACE_DAYS AND their last confirmed delivery (from the
// SW pingback) is either NULL or older than ZOMBIE_STALE_DAYS. Confirmed
// deliveries reset the clock automatically, so any subscriber whose browser
// still receives pushes will never get cleaned. Marks active=0 — the existing
// active=0 filter in webpush.sendCampaign keeps them out of future sends.
// We never DELETE rows; the dashboard can still surface historical CTR.
const ZOMBIE_GRACE_DAYS = 30;
const ZOMBIE_STALE_DAYS = 30;

function runZombieCleanup() {
  const stmt = db.prepare(`
    UPDATE subscribers
       SET active = 0
     WHERE active = 1
       AND created_at < datetime('now', ?)
       AND (
         last_delivery_confirmed_at IS NULL
         OR last_delivery_confirmed_at < datetime('now', ?)
       )
  `);
  const info = stmt.run(`-${ZOMBIE_GRACE_DAYS} days`, `-${ZOMBIE_STALE_DAYS} days`);
  return { removed: info.changes ?? 0 };
}

const jobs = [];

function parseTime(raw) {
  const [h, m] = String(raw || '').split(':').map(n => parseInt(n, 10));
  if (isNaN(h) || isNaN(m)) return null;
  return { hour: h, minute: m };
}

function parseSendTimes(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseTime)
    .filter(Boolean);
}

function stopAll() {
  while (jobs.length) {
    const j = jobs.pop();
    try { j.stop(); } catch (_) {}
  }
}

function start() {
  stopAll();
  const tz = settings.get('timezone', 'America/Sao_Paulo');
  const info = { timezone: tz };

  const sitesWithTarget = db.prepare('SELECT COUNT(*) AS n FROM sites WHERE daily_target > 0').get().n;

  const smartJob = cron.schedule('*/5 * * * *', async () => {
    try {
      const r = await runSmartTick();
      if (r.results && r.results.some(x => x.sent)) {
        console.log(`[smart] tick:`, JSON.stringify(r.results));
      }
    } catch (e) {
      console.error('[smart] tick failed:', e.message);
    }
  }, { timezone: tz });
  jobs.push(smartJob);
  info.smart_tick = 'every 5 min (per-site)';
  info.sites_with_target = sitesWithTarget;
  console.log(`[scheduler] Smart tick every 5 min (${sitesWithTarget} sites with daily_target > 0)`);

  const timesRaw = settings.get('send_times', '08:00,12:00,18:00');
  const times = parseSendTimes(timesRaw);
  info.fixed_times = timesRaw;
  info.fixed_registered = times.length;

  for (const t of times) {
    const expr = `${t.minute} ${t.hour} * * *`;
    const job = cron.schedule(expr, async () => {
      console.log(`[fixed] Running cycle at ${new Date().toISOString()}`);
      try {
        const results = await runCycle();
        const sent = results.filter(r => r.sent).length;
        if (sent > 0) console.log(`[fixed] Sent ${sent} pushes`);
      } catch (e) {
        console.error('[fixed] Cycle failed:', e.message);
      }
    }, { timezone: tz });
    jobs.push(job);
  }
  console.log(`[scheduler] ${times.length} fixed-time jobs registered (fallback for sites with daily_target = 0)`);

  const ctrJob = cron.schedule('0 */6 * * *', async () => {
    try {
      const r = await refreshRecent(100);
      console.log(`[ctr] Updated ${r.length} campaigns`);

      const urls = db.prepare(`SELECT DISTINCT url_id FROM copies`).all();
      let totalPaused = 0;
      for (const { url_id } of urls) {
        const r = autoPauseLosers(url_id);
        if (r.paused) totalPaused += r.paused;
      }
      if (totalPaused) console.log(`[copy-learning] auto-paused ${totalPaused} losing copies across ${urls.length} URLs`);
    } catch (e) {
      console.error('[ctr] Refresh failed:', e.message);
    }
  }, { timezone: tz });
  jobs.push(ctrJob);

  const welcomeJob = cron.schedule('*/5 * * * *', async () => {
    try {
      const r = await processDueWelcomes();
      if (r.sent > 0 || r.failed > 0) console.log(`[welcome] processed=${r.processed} sent=${r.sent} failed=${r.failed}`);
    } catch (e) {
      console.error('[welcome] tick failed:', e.message);
    }
  }, { timezone: tz });
  jobs.push(welcomeJob);
  console.log(`[scheduler] Registered welcome flow every 5 minutes`);

  // Daily zombie cleanup at 03:30 local — quiet hour, after midnight rollover,
  // before any morning send cycle. Only removes subscribers we have STRONG
  // evidence aren't receiving pushes (>30d old, never confirmed or >30d stale).
  const cleanupJob = cron.schedule('30 3 * * *', () => {
    try {
      const r = runZombieCleanup();
      if (r.removed > 0) console.log(`[zombie-cleanup] marked ${r.removed} subscriber(s) inactive`);
    } catch (e) {
      console.error('[zombie-cleanup] failed:', e.message);
    }
  }, { timezone: tz });
  jobs.push(cleanupJob);
  info.zombie_cleanup = `daily 03:30 (grace=${ZOMBIE_GRACE_DAYS}d, stale=${ZOMBIE_STALE_DAYS}d)`;
  console.log(`[scheduler] Zombie cleanup registered for 03:30 daily`);

  return info;
}

module.exports = { start, stopAll, runZombieCleanup };
