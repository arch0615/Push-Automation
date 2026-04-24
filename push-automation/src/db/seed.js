require('dotenv').config();
const db = require('./database');

const sites = [
  {
    name: process.env.IZOOTO_SITE1_NAME || 'site1',
    domain: 'universodoscartoes.com',
    app_id: process.env.IZOOTO_SITE1_KEY,
  },
  {
    name: process.env.IZOOTO_SITE2_NAME || 'site2',
    domain: 'site2.com.br',
    app_id: process.env.IZOOTO_SITE2_KEY,
  },
  {
    name: process.env.IZOOTO_SITE3_NAME || 'site3',
    domain: 'site3.com.br',
    app_id: process.env.IZOOTO_SITE3_KEY,
  },
];

const insert = db.prepare(`
  INSERT INTO sites (name, domain, app_id)
  VALUES (?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET domain = excluded.domain, app_id = excluded.app_id
`);

for (const s of sites) {
  if (s.app_id) insert.run(s.name, s.domain, s.app_id);
}

console.log('Sites seeded:');
console.log(db.prepare('SELECT id, name, domain FROM sites').all());
