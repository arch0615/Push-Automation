const axios = require('axios');

const BASE_URL = 'https://apis.izooto.com/v1';

function headers(apiKey) {
  return {
    'Authentication-Token': apiKey,
    'Content-Type': 'application/json',
  };
}

async function sendCampaign(apiKey, { name, title, message, iconUrl, bannerUrl, landingUrl, ttl = 3600 }) {
  if (!apiKey) {
    return {
      mock: true,
      izooto_campaign_id: `mock_${Date.now()}`,
      status: 'sent',
    };
  }

  const body = {
    campaign_name: name,
    title,
    message,
    icon_url: iconUrl,
    landing_url: landingUrl,
    target: { type: 'all' },
    ttl,
  };
  if (bannerUrl) body.banner_url = bannerUrl;

  const res = await axios.post(`${BASE_URL}/notifications`, body, { headers: headers(apiKey) });
  return {
    izooto_campaign_id: res.data?.id || res.data?.notification_id || null,
    raw: res.data,
    status: 'sent',
  };
}

async function getCampaignStats(apiKey, campaignId) {
  if (!apiKey || !campaignId || String(campaignId).startsWith('mock_')) {
    return {
      mock: true,
      impressions: Math.floor(Math.random() * 1000),
      clicks: Math.floor(Math.random() * 50),
    };
  }
  const res = await axios.get(`${BASE_URL}/notifications/${campaignId}`, { headers: headers(apiKey) });
  const d = res.data || {};
  return {
    impressions: d.impressions ?? d.delivered ?? 0,
    clicks: d.clicks ?? 0,
    raw: d,
  };
}

async function getAudience(apiKey) {
  if (!apiKey) return { mock: true, reach: 0 };
  const res = await axios.get(`${BASE_URL}/audience`, { headers: headers(apiKey) });
  return res.data;
}

module.exports = { sendCampaign, getCampaignStats, getAudience };
