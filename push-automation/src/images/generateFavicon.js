const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DASHBOARD_DIR = path.join(__dirname, '../../dashboard');

const svg = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#4338ca"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <path fill="#ffffff" d="M32 12c-1.7 0-3 1.3-3 3v1.4c-6.3 1.4-11 7-11 13.6v6l-3 4v3h34v-3l-3-4v-6c0-6.6-4.7-12.2-11-13.6V15c0-1.7-1.3-3-3-3zm-4 37c0 2.2 1.8 4 4 4s4-1.8 4-4h-8z"/>
</svg>
`;

async function generate() {
  const targets = [
    { size: 32, file: 'favicon-32x32.png' },
    { size: 16, file: 'favicon-16x16.png' },
    { size: 180, file: 'apple-touch-icon.png' },
    { size: 64, file: 'favicon.png' },
  ];

  for (const t of targets) {
    const out = path.join(DASHBOARD_DIR, t.file);
    await sharp(Buffer.from(svg(t.size)))
      .resize(t.size, t.size)
      .png()
      .toFile(out);
    console.log(`Created ${t.file} (${t.size}×${t.size})`);
  }

  fs.writeFileSync(path.join(DASHBOARD_DIR, 'favicon.svg'), svg(64).trim());
  console.log('Created favicon.svg');
}

if (require.main === module) generate().catch(console.error);

module.exports = { generate };
