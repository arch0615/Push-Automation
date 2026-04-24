const cron = require('node-cron');
const { runCycle } = require('./sender');
const { refreshRecent } = require('../learning/tracker');
const settings = require('../api/settings');

const jobs = [];

function parseSendTimes(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const [h, m] = s.split(':').map(n => parseInt(n, 10));
      if (isNaN(h) || isNaN(m)) return null;
      return { hour: h, minute: m };
    })
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
  const timesRaw = settings.get('send_times', '08:00,12:00,18:00');
  const tz = settings.get('timezone', 'America/Sao_Paulo');
  const times = parseSendTimes(timesRaw);

  for (const t of times) {
    const expr = `${t.minute} ${t.hour} * * *`;
    const job = cron.schedule(expr, async () => {
      console.log(`[scheduler] Running cycle at ${new Date().toISOString()}`);
      try {
        const results = await runCycle();
        console.log(`[scheduler] Cycle complete:`, JSON.stringify(results));
      } catch (e) {
        console.error('[scheduler] Cycle failed:', e.message);
      }
    }, { timezone: tz });
    jobs.push(job);
    console.log(`[scheduler] Registered daily job at ${t.hour}:${String(t.minute).padStart(2, '0')} ${tz}`);
  }

  const ctrJob = cron.schedule('0 */6 * * *', async () => {
    console.log(`[ctr] Refreshing stats at ${new Date().toISOString()}`);
    try {
      const r = await refreshRecent(100);
      console.log(`[ctr] Updated ${r.length} campaigns`);
    } catch (e) {
      console.error('[ctr] Refresh failed:', e.message);
    }
  }, { timezone: tz });
  jobs.push(ctrJob);
  console.log(`[scheduler] Registered CTR refresh every 6 hours`);

  return { registered: times.length, timezone: tz, times: timesRaw, ctr_poll: '0 */6 * * *' };
}

module.exports = { start, stopAll };
