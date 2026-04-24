const express = require('express');
const db = require('../db/database');
const { generateVariations } = require('../ai/generate');
const { composeForCopy } = require('../images/composer');

const router = express.Router();

router.get('/sites', (req, res) => {
  const sites = db.prepare('SELECT id, name, domain, app_id, CASE WHEN api_key IS NULL THEN 0 ELSE 1 END AS has_api_key FROM sites').all();
  res.json(sites);
});

router.patch('/sites/:id', (req, res) => {
  const { api_key, domain, name } = req.body;
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  db.prepare(`
    UPDATE sites
    SET api_key = COALESCE(?, api_key),
        domain = COALESCE(?, domain),
        name = COALESCE(?, name)
    WHERE id = ?
  `).run(api_key, domain, name, req.params.id);
  const updated = db.prepare('SELECT id, name, domain, app_id, CASE WHEN api_key IS NULL THEN 0 ELSE 1 END AS has_api_key FROM sites WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT u.*, s.name AS site_name, s.domain AS site_domain
    FROM urls u
    JOIN sites s ON s.id = u.site_id
    ORDER BY u.created_at DESC
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const url = db.prepare('SELECT * FROM urls WHERE id = ?').get(req.params.id);
  if (!url) return res.status(404).json({ error: 'URL not found' });
  const copies = db.prepare('SELECT * FROM copies WHERE url_id = ? ORDER BY created_at DESC').all(url.id);
  res.json({ ...url, copies });
});

router.post('/', (req, res) => {
  const { site_id, url, label, niche, daily_limit } = req.body;
  if (!site_id || !url || !label || !niche) {
    return res.status(400).json({ error: 'site_id, url, label, niche are required' });
  }
  const site = db.prepare('SELECT id FROM sites WHERE id = ?').get(site_id);
  if (!site) return res.status(400).json({ error: 'Invalid site_id' });

  const result = db.prepare(`
    INSERT INTO urls (site_id, url, label, niche, daily_limit)
    VALUES (?, ?, ?, ?, ?)
  `).run(site_id, url, label, niche, daily_limit || 3);

  const created = db.prepare('SELECT * FROM urls WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.patch('/:id', (req, res) => {
  const { status, daily_limit, label, niche } = req.body;
  const url = db.prepare('SELECT * FROM urls WHERE id = ?').get(req.params.id);
  if (!url) return res.status(404).json({ error: 'URL not found' });

  db.prepare(`
    UPDATE urls
    SET status = COALESCE(?, status),
        daily_limit = COALESCE(?, daily_limit),
        label = COALESCE(?, label),
        niche = COALESCE(?, niche)
    WHERE id = ?
  `).run(status, daily_limit, label, niche, req.params.id);

  const updated = db.prepare('SELECT * FROM urls WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM urls WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'URL not found' });
  res.status(204).end();
});

router.post('/:id/generate', async (req, res) => {
  const url = db.prepare('SELECT * FROM urls WHERE id = ?').get(req.params.id);
  if (!url) return res.status(404).json({ error: 'URL not found' });

  try {
    const count = req.body?.count || 3;
    const variations = await generateVariations(url.url, url.label, url.niche, count, url.id);

    const insert = db.prepare(`
      INSERT INTO copies (url_id, template, title, description, image_filename, variation)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const saved = [];
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      let imageFilename = null;
      try {
        const img = await composeForCopy(v);
        imageFilename = img.filename;
      } catch (imgErr) {
        console.error(`Image compose failed for ${v.template}:`, imgErr.message);
      }
      const r = insert.run(url.id, v.template, v.title, v.description, imageFilename, i + 1);
      saved.push({ id: r.lastInsertRowid, ...v, image_filename: imageFilename });
    }

    res.json({ url_id: url.id, variations: saved });
  } catch (e) {
    console.error('Generation error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
