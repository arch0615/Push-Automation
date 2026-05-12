const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const db = require('../db/database');
const { extractFromImage } = require('../ai/ocr');

const router = express.Router();
const EXAMPLES_DIR = path.join(__dirname, '../../examples');
if (!fs.existsSync(EXAMPLES_DIR)) fs.mkdirSync(EXAMPLES_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, or WEBP allowed'));
    }
    cb(null, true);
  },
});

router.get('/', (req, res) => {
  const siteId = req.query.site_id ? parseInt(req.query.site_id, 10) : null;
  let rows;
  if (siteId) {
    rows = db.prepare(`
      SELECT e.*, s.domain AS site_domain
      FROM examples e
      LEFT JOIN sites s ON s.id = e.site_id
      WHERE e.site_id = ? OR e.site_id IS NULL
      ORDER BY e.created_at DESC
    `).all(siteId);
  } else {
    rows = db.prepare(`
      SELECT e.*, s.domain AS site_domain
      FROM examples e
      LEFT JOIN sites s ON s.id = e.site_id
      ORDER BY e.created_at DESC
    `).all();
  }
  res.json(rows);
});

router.get('/image/:filename', (req, res) => {
  const safe = path.basename(req.params.filename || '');
  if (!safe) return res.status(404).end();
  const file = path.join(EXAMPLES_DIR, safe);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Image not found' });
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(file);
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const siteIdRaw = req.body.site_id;
  const siteId = siteIdRaw && siteIdRaw !== '' && siteIdRaw !== 'null' ? parseInt(siteIdRaw, 10) : null;
  const label = (req.body.label || '').toString().slice(0, 80) || null;

  const hash = crypto.createHash('sha1').update(req.file.buffer).update(String(Date.now())).digest('hex').slice(0, 16);
  const filename = `ex_${hash}.png`;
  const filepath = path.join(EXAMPLES_DIR, filename);

  try {
    await sharp(req.file.buffer).png().toFile(filepath);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid image: ' + e.message });
  }

  let extracted = [];
  let ocrError = null;
  try {
    extracted = await extractFromImage(filepath);
  } catch (e) {
    ocrError = e.message;
  }

  if (extracted.length === 0) {
    const r = db.prepare(`
      INSERT INTO examples (site_id, image_filename, title, description, label, enabled)
      VALUES (?, ?, NULL, NULL, ?, 0)
    `).run(siteId, filename, label);
    const row = db.prepare('SELECT * FROM examples WHERE id = ?').get(r.lastInsertRowid);
    return res.status(201).json({
      saved: 1,
      extracted: 0,
      ocr_error: ocrError,
      examples: [row],
      message: ocrError
        ? 'Imagem salva, mas a IA não conseguiu ler o texto agora (cota da OpenAI ou erro). Pode tentar de novo depois.'
        : 'Imagem salva, mas nenhum texto de notificação foi reconhecido. Verifique se o screenshot está nítido.',
    });
  }

  const insert = db.prepare(`
    INSERT INTO examples (site_id, image_filename, title, description, label, enabled)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  const inserted = [];
  for (const e of extracted) {
    const r = insert.run(siteId, filename, e.title, e.body, label);
    inserted.push(db.prepare('SELECT * FROM examples WHERE id = ?').get(r.lastInsertRowid));
  }

  res.status(201).json({ saved: inserted.length, extracted: extracted.length, examples: inserted });
});

router.post('/text', (req, res) => {
  const { site_id, title, description, label } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'title obrigatório' });
  const siteId = site_id && site_id !== '' && site_id !== 'null' ? parseInt(site_id, 10) : null;
  const r = db.prepare(`
    INSERT INTO examples (site_id, image_filename, title, description, label, enabled)
    VALUES (?, '', ?, ?, ?, 1)
  `).run(siteId,
        String(title).trim().slice(0, 120),
        description ? String(description).trim().slice(0, 200) : null,
        label ? String(label).slice(0, 80) : null);
  res.status(201).json(db.prepare('SELECT * FROM examples WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM examples WHERE id = ?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'Example not found' });
  const { title, description, label, enabled, site_id } = req.body || {};
  db.prepare(`
    UPDATE examples
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        label = COALESCE(?, label),
        enabled = COALESCE(?, enabled),
        site_id = COALESCE(?, site_id)
    WHERE id = ?
  `).run(title, description, label,
         enabled === undefined ? null : (enabled ? 1 : 0),
         site_id === undefined ? null : site_id,
         req.params.id);
  res.json(db.prepare('SELECT * FROM examples WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM examples WHERE id = ?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'Example not found' });
  db.prepare('DELETE FROM examples WHERE id = ?').run(req.params.id);
  // Delete file only if no other examples reference it
  const stillUsed = db.prepare('SELECT 1 FROM examples WHERE image_filename = ? LIMIT 1').get(ex.image_filename);
  if (!stillUsed) {
    const file = path.join(EXAMPLES_DIR, ex.image_filename);
    if (fs.existsSync(file)) try { fs.unlinkSync(file); } catch (_) {}
  }
  res.status(204).end();
});

router.post('/:id/retry-ocr', async (req, res) => {
  const ex = db.prepare('SELECT * FROM examples WHERE id = ?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'Example not found' });
  const filepath = path.join(EXAMPLES_DIR, ex.image_filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Image file missing on disk' });
  try {
    const extracted = await extractFromImage(filepath);
    if (extracted.length === 0) {
      return res.json({ ok: true, extracted: 0, message: 'OCR ran but no notification text recognized.' });
    }
    db.prepare('DELETE FROM examples WHERE image_filename = ?').run(ex.image_filename);
    const insert = db.prepare(`
      INSERT INTO examples (site_id, image_filename, title, description, label, enabled)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const inserted = [];
    for (const e of extracted) {
      const r = insert.run(ex.site_id, ex.image_filename, e.title, e.body, ex.label);
      inserted.push(db.prepare('SELECT * FROM examples WHERE id = ?').get(r.lastInsertRowid));
    }
    res.json({ ok: true, extracted: inserted.length, examples: inserted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
