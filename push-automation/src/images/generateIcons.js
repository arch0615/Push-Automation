const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const iconSpecs = require('./iconSpecs');

const ICONS_DIR = path.join(__dirname, '../../icons');
const SIZE = 256;

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

function buildSvg({ bg, letter, color }) {
  const fontSize = letter.length > 1 ? 110 : 150;
  return `
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SIZE}" height="${SIZE}" rx="48" fill="${bg}"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="bold"
            font-size="${fontSize}" fill="${color}">${letter}</text>
    </svg>
  `;
}

async function generateAllIcons() {
  for (const [filename, spec] of Object.entries(iconSpecs)) {
    const out = path.join(ICONS_DIR, filename);
    await sharp(Buffer.from(buildSvg(spec)))
      .png()
      .toFile(out);
    console.log(`Created ${filename}`);
  }
}

if (require.main === module) {
  generateAllIcons().catch(console.error);
}

module.exports = { generateAllIcons };
