const Settings = require('../models/Settings');

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

const DEFAULTS = {
  siteName: 'My Course',
  brandName: '',
  instructorName: '',
  tappayPartnerKey: '',
  tappayMerchantId: '',
  tappayAppId: '12348',
  tappayAppKey: 'app_pa1pQwXUzaRoMd7svcJawNKgWOBIlBBsIfiPlTZy7ZOiPgCaRKkRGeYRAV1Y',
  tappayEnv: 'sandbox',
  lineChannelToken: '',
  lineChannelSecret: '',
  adminUserId: '',
  metaPixelId: '',
  publicBaseUrl: '',
  adminPassword: '',
  setupCompleted: false,
};

async function getSettings() {
  const now = Date.now();
  if (_cache && (now - _cacheTime) < CACHE_TTL) {
    return _cache;
  }

  try {
    const doc = await Settings.getSingleton();
    _cache = doc.toObject();
    _cacheTime = now;
    return _cache;
  } catch (e) {
    // DB not ready yet — return defaults
    if (_cache) return _cache;
    return { ...DEFAULTS };
  }
}

async function updateSettings(data) {
  const doc = await Settings.getSingleton();
  for (const [key, val] of Object.entries(data)) {
    if (key === '_id' || key === '__v') continue;
    doc[key] = val;
  }
  doc.updatedAt = new Date();
  await doc.save();
  _cache = doc.toObject();
  _cacheTime = Date.now();
  return _cache;
}

function clearCache() {
  _cache = null;
  _cacheTime = 0;
}

module.exports = { getSettings, updateSettings, clearCache, DEFAULTS };
