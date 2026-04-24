require('dotenv').config();
const axios = require('axios');

const sites = [
  { name: process.env.IZOOTO_SITE1_NAME, key: process.env.IZOOTO_SITE1_KEY },
  { name: process.env.IZOOTO_SITE2_NAME, key: process.env.IZOOTO_SITE2_KEY },
  { name: process.env.IZOOTO_SITE3_NAME, key: process.env.IZOOTO_SITE3_KEY },
];

async function testKey(site) {
  try {
    const res = await axios.get('https://apis.izooto.com/v1/audience', {
      headers: {
        'Authentication-Token': site.key,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ ${site.name}: Connected — HTTP ${res.status}`);
    console.log(`   Data:`, JSON.stringify(res.data).slice(0, 300));
  } catch (e) {
    const status = e.response?.status;
    const body = JSON.stringify(e.response?.data || e.message).slice(0, 300);
    console.log(`❌ ${site.name}: Failed — HTTP ${status} — ${body}`);
  }
}

(async () => {
  console.log('Testing iZooto API connections...\n');
  for (const site of sites) await testKey(site);
})();
