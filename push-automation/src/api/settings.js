const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => { out[r.key] = r.value; });
  res.json(out);
});

router.patch('/', (req, res) => {
  const entries = Object.entries(req.body || {});
  if (entries.length === 0) return res.status(400).json({ error: 'No settings provided' });
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  entries.forEach(([k, v]) => stmt.run(k, String(v)));

  const schedulerKeys = ['send_times', 'timezone', 'daily_target', 'active_window_start', 'active_window_end'];
  if (entries.some(([k]) => schedulerKeys.includes(k))) {
    try {
      const scheduler = require('../scheduler/cron');
      const info = scheduler.start();
      console.log('[settings] Scheduler restarted:', info);
    } catch (e) { console.error('[settings] Scheduler restart failed:', e.message); }
  }

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => { out[r.key] = r.value; });
  res.json(out);
});

function get(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

module.exports = router;
module.exports.get = get;
