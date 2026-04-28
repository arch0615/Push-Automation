const cron = require('node-cron');
const db = require('../db/database');
const { runCycle, runSmartTick } = require('./sender');
const { refreshRecent } = require('../learning/tracker');
const { processDueWelcomes } = require('../welcome/manager');
const settings = require('../api/settings');

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

  return info;
}

module.exports = { start, stopAll };
