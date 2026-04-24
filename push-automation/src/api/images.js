const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

const ICONS_DIR = path.join(__dirname, '../../icons');
const GENERATED_DIR = path.join(__dirname, '../../generated');

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });

router.get('/generated/:filename', (req, res) => {
  const file = path.join(GENERATED_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Image not found' });
  res.sendFile(file);
});

router.get('/icons/:filename', (req, res) => {
  const file = path.join(ICONS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Icon not found' });
  res.sendFile(file);
});

router.get('/icons', (req, res) => {
  const files = fs.readdirSync(ICONS_DIR).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
  res.json(files);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, or WEBP allowed'));
    }
    cb(null, true);
  },
});

router.post('/icons', upload.single('icon'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const rawName = req.body.name || path.parse(req.file.originalname).name;
  const safe = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32) + '.png';
  const out = path.join(ICONS_DIR, safe);

  try {
    await sharp(req.file.buffer).resize(256, 256, { fit: 'cover' }).png().toFile(out);
    res.status(201).json({ filename: safe });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/icons/:filename', (req, res) => {
  const file = path.join(ICONS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Icon not found' });
  fs.unlinkSync(file);
  res.status(204).end();
});

module.exports = router;
