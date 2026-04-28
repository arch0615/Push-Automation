const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { getTemplate } = require('../ai/templates');

const ICONS_DIR = path.join(__dirname, '../../icons');
const OUTPUT_DIR = path.join(__dirname, '../../generated');
const SIZE = 256;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function compose({ iconFile, title }) {
  const iconPath = path.join(ICONS_DIR, iconFile);
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Icon not found: ${iconFile}`);
  }

  const iconBuffer = await sharp(iconPath).resize(SIZE, SIZE).png().toBuffer();

  const hash = crypto.createHash('sha1')
    .update(`${iconFile}|${title}|${Date.now()}`)
    .digest('hex').slice(0, 12);
  const outName = `push_${hash}.png`;
  const outPath = path.join(OUTPUT_DIR, outName);

  await sharp(iconBuffer).png().toFile(outPath);

  return { filename: outName, path: outPath };
}

function pickIconForTemplate(template) {
  const candidates = template.icons || (template.icon ? [template.icon] : []);
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(ICONS_DIR, candidate))) return candidate;
  }
  return candidates[0] || null;
}

async function composeForCopy(copy) {
  const template = getTemplate(copy.template);
  if (!template) throw new Error(`Unknown template: ${copy.template}`);
  const iconFile = pickIconForTemplate(template);
  if (!iconFile) throw new Error(`No icon defined for template: ${copy.template}`);
  return compose({
    iconFile,
    title: copy.title,
  });
}

module.exports = { compose, composeForCopy, OUTPUT_DIR };
