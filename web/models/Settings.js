const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Brand (S2)
  siteName: { type: String, default: '' },
  brandName: { type: String, default: '' },
  instructorName: { type: String, default: '' },

  // Payment (S3) — unified
  paymentProvider: { type: String, default: '', enum: ['', 'tappay', 'ecpay'] },

  // TapPay
  tappayPartnerKey: { type: String, default: '' },
  tappayMerchantId: { type: String, default: '' },
  tappayAppId: { type: String, default: '' },
  tappayAppKey: { type: String, default: '' },
  tappayEnv: { type: String, default: 'sandbox' },

  // ECPay 綠界
  ecpayMerchantId: { type: String, default: '' },
  ecpayHashKey: { type: String, default: '' },
  ecpayHashIV: { type: String, default: '' },
  ecpayEnv: { type: String, default: 'stage' },

  // LINE Bot (S4)
  lineChannelToken: { type: String, default: '' },
  lineChannelSecret: { type: String, default: '' },
  adminUserId: { type: String, default: '' },

  // Meta (S5)
  metaPixelId: { type: String, default: '' },

  // Advanced (S8)
  publicBaseUrl: { type: String, default: '' },

  // Admin
  adminPassword: { type: String, default: '' },
  setupCompleted: { type: Boolean, default: false },

  updatedAt: { type: Date, default: Date.now }
});

// Singleton — only one settings document
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
