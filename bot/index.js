try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const line = require('@line/bot-sdk');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const OpenAI = require('openai');

// === 品牌配置 ===
const BRAND_NAME = process.env.BRAND_NAME || '你的品牌';
const INSTRUCTOR_NAME = process.env.INSTRUCTOR_NAME || '老師';
const SYSTEM_NAME = process.env.SYSTEM_NAME || '你的課程';
const BOT_DOMAIN = process.env.BOT_DOMAIN || 'localhost:3000';
const COURSE_URL = process.env.COURSE_URL || '';
const COURSE_PRICE = parseInt(process.env.COURSE_PRICE || '49800');
const COURSE_ORIGINAL_PRICE = parseInt(process.env.COURSE_ORIGINAL_PRICE || '88800');
const INSTALLMENT_AMOUNT = parseInt(process.env.INSTALLMENT_AMOUNT || '3650');
const INSTALLMENT_MONTHS = parseInt(process.env.INSTALLMENT_MONTHS || '12');
const LINE_ADD_FRIEND_URL = process.env.LINE_ADD_FRIEND_URL || '';
const REPLAY_URL = process.env.REPLAY_URL || '';
const HERO_IMAGE_URL = process.env.HERO_IMAGE_URL || '';
const NOTION_COURSE_URL = process.env.NOTION_COURSE_URL || '';
const STUDENT_GROUP_URL = process.env.STUDENT_GROUP_URL || '';
const COMMUNITY_GROUP_URL = process.env.COMMUNITY_GROUP_URL || '';
const FULL_CHECKLIST_URL = process.env.FULL_CHECKLIST_URL || '';
const DEFAULT_LIVESTREAM_TOPIC = process.env.DEFAULT_LIVESTREAM_TOPIC || '免費直播課';
const SHORTS_SERVICE_HOST = process.env.SHORTS_SERVICE_HOST || '';
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || '';

// Meta Conversion API
const META_PIXEL_ID = process.env.META_PIXEL_ID || '';
const META_CAPI_TOKEN = process.env.META_ACCESS_TOKEN || '';

function sendMetaConversionEvent(eventName, userData, eventSourceUrl) {
  if (!META_CAPI_TOKEN) return;
  try {
    const https = require('https');
    const postData = JSON.stringify({
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: eventSourceUrl || `https://${BOT_DOMAIN}/track`,
        user_data: userData,
      }],
      access_token: META_CAPI_TOKEN,
    });
    const req = https.request({
      hostname: 'graph.facebook.com',
      path: `/v21.0/${META_PIXEL_ID}/events`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => console.log(`Meta CAPI ${eventName}:`, body));
    });
    req.on('error', e => console.error('Meta CAPI error:', e.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('Meta CAPI error:', err.message);
  }
}

const app = express();

const flexCards = require('./lib/flex-cards');
flexCards.init(COURSE_URL);
const {
  chineseMonths, injectUserId, textToFlex,
  buildReminderCard, buildEnrollCheckCard,
  buildCatchUpMessage, buildWaveMessage,
  buildBranchA, buildBranchB, buildCourseIntroCard,
  buildBranchC, buildBranchD, buildCourseModules,
  DIAGNOSIS_REPLIES, buildBodyIssueCard, buildIntroCard,
  buildQACard, OBJECTION_REPLIES,
  buildSessionCarousel, buildConfirmCard, buildAlternativeCard,
} = flexCards;

// === AI 追單工具人 (Zeabur AI Hub) ===
const aiClient = process.env.AI_API_KEY ? new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: AI_API_BASE_URL ? `https://${AI_API_BASE_URL}` : 'https://hnd1.aihub.zeabur.ai/v1',
}) : null;

// === AI 分身 System Prompt ===
let AVATAR_PROMPT = null;
try {
  AVATAR_PROMPT = fs.readFileSync(path.join(__dirname, 'prompts', 'ai-workers', 'ai-avatar.md'), 'utf-8');
} catch (e) {
  console.log('AI 分身 prompt 未找到，fallback 停用');
}

// AI 分身對話記憶（每個用戶最近 6 輪）
const chatHistory = new Map();
const CHAT_HISTORY_MAX = 6;
function getChatHistory(userId) { return chatHistory.get(userId) || []; }
function addChatHistory(userId, role, content) {
  if (!chatHistory.has(userId)) chatHistory.set(userId, []);
  const h = chatHistory.get(userId);
  h.push({ role, content });
  if (h.length > CHAT_HISTORY_MAX * 2) h.splice(0, 2); // 保留最近 N 輪（每輪 = user + assistant）
}

const CHASE_SYSTEM_PROMPT = `你是 ${INSTRUCTOR_NAME} 老師的追單文案手。你要寫的是 LINE 私訊，不是行銷文案。

## 你的語氣
你是一個整復師在跟同行聊天。口氣直接、不客氣、會反問對方。像朋友在 LINE 上講話，不是官方帳號發公告。

## 格式規則
- 每則訊息只有純文字，不要用 markdown、不要用標題格式
- 第一行就是重點，不要寒暄、不要「嗨你好」
- 總字數 80-150 字（LINE 私訊不會寫太長）
- 用短句，每句一行，中間空行分段
- 不要用 emoji 開頭，最多在結尾放一個
- 不要用「！」超過 2 次
- 結尾一句話告訴他做什麼（回覆關鍵字/點連結/報名）

## 絕對禁止
- 「讓我們一起」「你值得更好的」「改變從現在開始」
- 「親愛的」「朋友」「夥伴」
- 「感謝您參加」「希望您收穫滿滿」
- 任何看起來像群發的語氣
- 條列式（❶❷❸ 或 1. 2. 3.）— 這不是 email

## 好的範例
「昨天直播有人問：學了十幾套手法，為什麼客戶還是不回頭？

因為你解決的是症狀，不是結構。

${SYSTEM_NAME}不是另一套手法，是讓你看懂身體的作業系統。看懂之後，你現有的手法全部升級。

回放連結 48 小時後關閉，還沒看的把握一下。」

「一個足底按摩師，學完${SYSTEM_NAME} 3 個月。

時薪從 600 變 2600。

不是因為她學了什麼厲害的手法，是因為她終於能跟客戶解釋「你的問題不在腳底」。

客戶聽懂了，就願意付更高的價格。

你現在的技術已經夠了，缺的是讓客戶看見價值的方法。」

## 壞的範例（不要這樣寫）
「🎉 感謝您參加昨天的直播！希望您收穫滿滿。如果您對${SYSTEM_NAME}有興趣，歡迎把握限時優惠，讓我們一起踏上改變的旅程！」

## 見證（可以用也可以改寫，但數字要正確）
- 阿凱：職業軍人，零基礎，3 個月月入 15 萬+
- 足底按摩師：時薪從 $600 → $2,600，客戶主動回流
- 資深老師：花上百萬學各種手法，覺得很空虛，學${SYSTEM_NAME}後開了自己的工作室

## 課程資訊（需要時才帶入，不要每則都提）
- ${SYSTEM_NAME}系統 90 天線上培訓
- 早鳥價 $${COURSE_PRICE.toLocaleString()}（原價 $${COURSE_ORIGINAL_PRICE.toLocaleString()}）
- 分 ${INSTALLMENT_MONTHS} 期每月 $${INSTALLMENT_AMOUNT.toLocaleString()}
- 600+ 分鐘影片 + 線下實作 + 一對一諮詢`;

// 為一場直播生成追單訊息（wave 2,3,5 × 3分眾 = 9則）
// wave 1,4,6 用 Flex 卡片（寫死版），不需要 AI 生成
async function generateChaseMessages(livestreamTopic) {
  if (!aiClient) { console.log('AI 工具人未啟用（無 AI_API_KEY）'); return null; }

  const prompt = `這場直播主題：${livestreamTopic || DEFAULT_LIVESTREAM_TOPIC}

請產出 3 波追單訊息 × 3 個受眾版本，共 9 則。
（wave 1、4、6 用 Flex 卡片，不用你生成）

## 你要生成的 3 波（核心策略：給一半，留一半）
- wave2（D+1）：從直播裡最多人有共鳴的問題切入，給一個頓悟觀點，但不給完整解法。收住引導課程。
- wave3（D+2）：一個真實學員案例，強調「他跟你一樣的處境，學完後怎麼改變」。不是承諾，是證據。
- wave5（D+4）：異議處理（價格/時間/學不會），用案例和數字回應，不用雞湯。

## 3 種受眾
- attended：有到課未購買 → 從直播實際內容切入，強化「你已經感受到了，差的只是行動」
- absent：未到課 → 製造錯過感，用直播中最震撼的觀點勾他
- replay：看了回放未購買 → 語氣跟到課版一樣正常，不要裝熟。他看了代表有興趣，直接講重點

## 每則訊息規則
- 150 字以內，像 LINE 私訊
- 第一句就要有力量
- 不用 emoji 開頭
- 結尾帶一個行動或問題

請用以下 JSON 格式回覆（不要加 markdown code block）：
{"attended":{"wave2":"...","wave3":"...","wave5":"..."},"absent":{"wave2":"...","wave3":"...","wave5":"..."},"replay":{"wave2":"...","wave3":"...","wave5":"..."}}`;

  try {
    const res = await aiClient.chat.completions.create({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      messages: [
        { role: 'system', content: CHASE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });
    const text = res.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.error('AI 追單工具人：無法解析 JSON'); return null; }
    const parsed = JSON.parse(jsonMatch[0]);
    // 驗證結構（只需要 wave2, wave3, wave5）
    for (const seg of ['attended', 'absent', 'replay']) {
      if (!parsed[seg]) { console.error(`AI 追單工具人：缺少 ${seg} 分眾`); return null; }
      for (const w of ['wave2', 'wave3', 'wave5']) {
        if (!parsed[seg][w]) { console.error(`AI 追單工具人：缺少 ${seg}.${w}`); return null; }
      }
    }
    console.log('AI 追單工具人：成功產出 9 則訊息（wave2,3,5 × 3分眾）');
    return parsed;
  } catch (e) {
    console.error('AI 追單工具人失敗:', e.message);
    return null;
  }
}

// 從 DB 讀取 AI 產出的追單訊息，建成 Flex 卡片
function buildAIWaveMessage(waveKey, segment) {
  const aiMessages = appData.aiChaseMessages;
  if (!aiMessages || !aiMessages[segment] || !aiMessages[segment][waveKey]) return null;
  return textToFlex(aiMessages[segment][waveKey], waveKey, segment);
}

// FULL_CHECKLIST_URL is defined in the config block above

// === PostgreSQL 持久化 ===
const pool = new Pool({ connectionString: process.env.POSTGRES_CONNECTION_STRING });

async function initDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'
  )`);
  // 初始化預設 key
  for (const k of ['registrations', 'remarketing', 'bookings', 'userSources', 'userProfiles', 'attendance', 'replayClicks', 'aiChaseMessages', 'aiChaseMessagesDraft', 'completions', 'courseInterest', 'waitlist']) {
    await pool.query(`INSERT INTO app_data (key, value) VALUES ($1, '{}') ON CONFLICT (key) DO NOTHING`, [k]);
  }
  await pool.query(`INSERT INTO app_data (key, value) VALUES ('trackClicks', '[]') ON CONFLICT (key) DO NOTHING`);
}

async function loadData() {
  const { rows } = await pool.query('SELECT key, value FROM app_data');
  const data = { registrations: {}, remarketing: {}, bookings: {}, trackClicks: [], userSources: {}, userProfiles: {}, attendance: {}, replayClicks: {}, aiChaseMessages: null, aiChaseMessagesDraft: null, completions: {}, courseInterest: {}, waitlist: {} };
  for (const row of rows) data[row.key] = row.value;
  return data;
}

async function saveData() {
  try {
    const keys = ['registrations', 'remarketing', 'bookings', 'trackClicks', 'userSources', 'userProfiles', 'attendance', 'replayClicks', 'aiChaseMessages', 'aiChaseMessagesDraft', 'completions', 'courseInterest', 'waitlist'];
    for (const k of keys) {
      await pool.query('INSERT INTO app_data (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [k, JSON.stringify(appData[k])]);
    }
  } catch (e) { console.error('儲存資料失敗:', e.message); }
}

let appData = { registrations: {}, remarketing: {}, bookings: {}, trackClicks: [], userSources: {}, userProfiles: {}, attendance: {}, replayClicks: {}, aiChaseMessages: null, aiChaseMessagesDraft: null, completions: {}, courseInterest: {}, waitlist: {} };
const activeTimers = new Map();

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '';

// 預約流程步驟
const BOOKING_STEPS = {
  name: { prompt: '請問您的大名是？', next: 'topic' },
  topic: { prompt: '您想諮詢什麼問題？（簡單描述即可）', next: 'time' },
  time: { prompt: '您希望哪個時段方便？（例如：平日晚上、週末下午）', next: 'done' },
};

function getClient() {
  return new line.messagingApi.MessagingApiClient({ channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN });
}

// === 時間工具 ===
function parseTime(timeStr) {
  const match = timeStr.match(/(凌晨|上午|早上|中午|下午|晚上)(\d+)(?:點|:)?(\d+)?/);
  if (!match) return null;
  const period = match[1];
  let hour = parseInt(match[2], 10);
  const minute = match[3] ? parseInt(match[3], 10) : 0;
  if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
  if ((period === '上午' || period === '凌晨' || period === '早上') && hour === 12) hour = 0;
  if (period === '中午') hour = 12;
  return { hour, minute };
}

function getSessionTimestamp(s) {
  const t = parseTime(s.time);
  if (!t) return null;
  const now = new Date();
  return Date.UTC(now.getFullYear(), s.month - 1, s.day, t.hour - 8, t.minute, 0);
}

// === 直播前提醒排程 ===
const PRE_REMINDERS = [
  { key: '24h', offset: 24 * 3600000, label: '24小時' },
  { key: '6h', offset: 6 * 3600000, label: '6小時' },
  { key: '2h', offset: 2 * 3600000, label: '2小時' },
  { key: '10m', offset: 10 * 60000, label: '10分鐘' },
];

// 直播後再行銷排程 (以直播開始時間為基準)
const POST_WAVES = [
  { key: 'wave1', offset: 2 * 3600000, label: '第一波' },           // +2h 感謝+回放（直播80分鐘+緩衝）
  { key: 'wave2', offset: 24 * 3600000, label: '第二波' },          // D+1 異議處理
  { key: 'wave3', offset: 2 * 24 * 3600000, label: '第三波' },      // D+2 深度學員故事
  { key: 'wave4', offset: 3 * 24 * 3600000, label: '第四波' },      // D+3 早鳥截止
  { key: 'wave5', offset: 4 * 24 * 3600000, label: '第五波' },      // D+4 最後見證
  { key: 'wave6', offset: 5 * 24 * 3600000, label: '第六波' },      // D+5 最後通知
];

function scheduleReminders(userId, s) {
  const sessionTime = getSessionTimestamp(s);
  if (!sessionTime) return;

  const mm = String(s.month).padStart(2, '0');
  const dd = String(s.day).padStart(2, '0');
  const regKey = `${userId}:${mm}${dd}`;

  if (activeTimers.has(regKey)) activeTimers.get(regKey).forEach(t => clearTimeout(t));

  appData.registrations[regKey] = {
    userId, month: s.month, day: s.day, time: s.time, link: s.link, sessionTime,
    reminders: { '24h': false, '4h': false, '2h': false, '10m': false },
  };

  // 再行銷資料
  if (!appData.remarketing[regKey]) {
    appData.remarketing[regKey] = {
      userId, sessionTime, month: s.month, day: s.day, time: s.time, link: s.link,
      waves: { wave1: false, wave2: false, wave3: false, wave4: false, wave5: false, wave6: false },
      converted: false,
    };
  }

  saveData();
  scheduleTimersForReg(regKey);
}

function scheduleTimersForReg(regKey) {
  const reg = appData.registrations[regKey];
  const rmk = appData.remarketing[regKey];
  if (!reg) return;

  const now = Date.now();
  const timers = [];
  const s = { month: reg.month, day: reg.day, time: reg.time, link: reg.link };

  // 直播前提醒
  for (const r of PRE_REMINDERS) {
    if (reg.reminders[r.key]) continue;
    const delay = (reg.sessionTime - r.offset) - now;
    if (delay <= 0) { reg.reminders[r.key] = true; continue; }

    timers.push(setTimeout(() => {
      getClient().pushMessage({ to: reg.userId, messages: [buildReminderCard(r.label, s)] })
        .then(() => { reg.reminders[r.key] = true; saveData(); console.log(`提醒已發送: ${reg.userId} → ${r.label}`); })
        .catch(err => console.error(`提醒失敗 (${r.label}):`, err.message));
    }, delay));
    console.log(`排程: ${reg.userId} → 倒數${r.label} (${Math.round(delay / 60000)}分後)`);
  }

  // 直播後再行銷 → 改由 cronRemarketing() 每 60 秒掃描處理，不再用 setTimeout
  // 直播後再行銷 → 改由 cronRemarketing() 每 60 秒掃描處理

  saveData();
  activeTimers.set(regKey, timers);
}

// === Cron 式再行銷：每 60 秒掃描，發該發的 wave ===
// 不靠 setTimeout，重啟不影響
function sendOneWave(rmk, regKey, waveConfig, s) {
  const hasCompleted = appData.completions && appData.completions[rmk.userId];
  const attended = appData.attendance && appData.attendance[regKey];
  const watchedReplay = appData.replayClicks && appData.replayClicks[rmk.userId];
  let segLabel, segment;
  if (hasCompleted || attended) {
    segLabel = hasCompleted ? '已完課' : '到課未完課';
    segment = 'attended';
  } else if (watchedReplay) {
    segLabel = '看過回放';
    segment = 'replay';
  } else {
    segLabel = '未到課';
    segment = 'absent';
  }

  const flexWaves = ['wave1', 'wave4', 'wave6'];
  let msg;
  if (flexWaves.includes(waveConfig.key)) {
    msg = (segment === 'attended') ? buildWaveMessage(waveConfig.key, s) : buildCatchUpMessage(waveConfig.key, s);
  } else {
    const aiMsg = buildAIWaveMessage(waveConfig.key, segment);
    msg = aiMsg || ((segment === 'attended') ? buildWaveMessage(waveConfig.key, s) : buildCatchUpMessage(waveConfig.key, s));
  }
  if (!msg) return;

  msg = injectUserId(msg, rmk.userId);
  const sendWithRetry = (attempt = 1) => {
    getClient().pushMessage({ to: rmk.userId, messages: [msg] })
      .then(() => {
        rmk.waves[waveConfig.key] = true;
        saveData();
        console.log(`再行銷${waveConfig.label}已發送: ${rmk.userId} (${segLabel})`);
      })
      .catch(err => {
        console.error(`再行銷${waveConfig.label}失敗 (嘗試${attempt}): ${rmk.userId}`, err.message);
        if (attempt < 3) {
          setTimeout(() => sendWithRetry(attempt + 1), 30000 * attempt);
        } else {
          getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
            { type: 'text', text: `⚠️ 再行銷發送失敗\n${waveConfig.label} → ${rmk.userId}\n錯誤: ${err.message}\n已重試3次` },
          ]}).catch(() => {});
        }
      });
  };
  sendWithRetry();
}

function cronRemarketing() {
  const now = Date.now();
  let sent = 0;
  for (const [regKey, rmk] of Object.entries(appData.remarketing || {})) {
    if (rmk.converted) continue;
    const reg = appData.registrations[regKey];
    if (!reg || !reg.sessionTime) continue;
    // 超過 7 天的不管
    if (reg.sessionTime + 7 * 24 * 3600000 < now) continue;

    const s = { month: reg.month, day: reg.day, time: reg.time, link: reg.link };

    for (const w of POST_WAVES) {
      if (rmk.waves[w.key]) continue; // 已發過
      const shouldSendAt = reg.sessionTime + w.offset;
      if (now < shouldSendAt) continue; // 還沒到時間

      // 到時間了且沒發過 → 發！
      sendOneWave(rmk, regKey, w, s);
      sent++;
      // 每輪只發一波給每個人（避免同時發多波）
      break;
    }
  }
  if (sent > 0) console.log(`cronRemarketing: 本輪發送 ${sent} 則`);
}

// 每 60 秒掃描一次
setInterval(cronRemarketing, 60 * 1000);

function restoreReminders() {
  // 只恢復直播前提醒（setTimeout），再行銷由 cronRemarketing 處理
  const keys = Object.keys(appData.registrations || {});
  if (keys.length === 0) { console.log('restoreReminders: 無排程需恢復'); return; }
  let restored = 0, skipped = 0;
  for (const regKey of keys) {
    const reg = appData.registrations[regKey];
    if (!reg || !reg.sessionTime) { skipped++; continue; }
    // 只恢復未來的直播提醒
    if (reg.sessionTime < Date.now()) { skipped++; continue; }
    scheduleTimersForReg(regKey);
    restored++;
  }
  // 計算再行銷待發波數
  let pendingWaves = 0;
  for (const rmk of Object.values(appData.remarketing || {})) {
    if (rmk.converted) continue;
    for (const v of Object.values(rmk.waves || {})) {
      if (!v) pendingWaves++;
    }
  }
  console.log(`restoreReminders: 恢復 ${restored} 筆直播提醒, 跳過 ${skipped} 筆, 再行銷待發 ${pendingWaves} 波（由 cron 處理）`);
  // 靜默恢復，不通知管理者（Bot 經常重啟，避免洗通知）
}

// === 養成推送（加好友後 Day1 / Day2）===
function buildNurtureDay1() {
  const sessions = parseSessions();
  const hasSessions = sessions.length > 0;
  const footer = [
    ...(hasSessions ? [{ type: 'button', action: { type: 'message', label: '📅 報名免費直播課', text: '報名' }, style: 'primary', color: '#284B8B', height: 'sm' }] : []),
  ];
  return { type: 'flex', altText: '🧑‍🏫 我花了上百萬學費，才發現問題不在技術',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '18px',
        contents: [{ type: 'text', text: '🧑‍🏫 我花了上百萬學費', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true },
          { type: 'text', text: '才發現問題不在技術', color: '#FFFFFF', size: 'sm', margin: 'sm', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: `我叫 ${INSTRUCTOR_NAME}，做身體工作超過 12 年。`, size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '整復、按摩、健身、瑜珈⋯能學的我都學了，花了上百萬學費。', size: 'sm', color: '#333333', margin: 'md', wrap: true },
        { type: 'text', text: '因為我自己身體出了問題，我想弄好它，也想把這整件事搞清楚。', size: 'sm', color: '#555555', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '結果學了一圈，身體問題解決了，\n但我也發現一件事：', size: 'sm', color: '#333333', margin: 'lg', wrap: true },
        { type: 'text', text: '大部分人卡住，不是技術不夠，\n是看不懂問題在哪。', size: 'md', color: '#284B8B', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '這個領悟讓我的學員：', size: 'sm', color: '#333333', margin: 'lg', wrap: true },
        { type: 'text', text: '• 時薪從 $300 做到 $2,600', size: 'sm', color: '#E8590C', weight: 'bold', margin: 'sm', wrap: true },
        { type: 'text', text: '• 零基礎 3 個月獨立接案', size: 'sm', color: '#E8590C', weight: 'bold', margin: 'sm', wrap: true },
        { type: 'text', text: '直播裡我會完整說明是怎麼做到的。', size: 'sm', color: '#333333', margin: 'lg', wrap: true },
      ]},
      ...(footer.length > 0 ? { footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: footer } } : {}),
    },
  };
}

function buildNurtureDay2() {
  const sessions = parseSessions();
  const hasSessions = sessions.length > 0;
  const footer = [
    ...(hasSessions ? [{ type: 'button', action: { type: 'message', label: '📅 報名免費直播課', text: '報名' }, style: 'primary', color: '#E8590C', height: 'sm' }] : []),
  ];
  return { type: 'flex', altText: '🔥 她做了 6 年足底按摩，時薪翻了 3 倍',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#E8590C', paddingAll: '18px',
        contents: [{ type: 'text', text: '🔥 時薪翻了 3 倍', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true },
          { type: 'text', text: '一位足底按摩師的真實故事', color: '#FFFFFF', size: 'sm', margin: 'sm', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '小如在連鎖店做了 6 年足底按摩。', size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '手指變形了，月收還是 3 萬多。', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
        { type: 'text', text: '她以為問題是技術不夠，又去考了兩張證照。\n結果？收入一樣。', size: 'sm', color: '#555555', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `接觸${SYSTEM_NAME}後，她學的不是新手法，而是一套整合所有技術的思維方式。`, size: 'sm', color: '#333333', margin: 'lg', wrap: true },
        { type: 'text', text: '現在她 30 分鐘收 $1,300，\n時薪翻了 3 倍，\n客戶還主動幫她介紹。', size: 'sm', color: '#E8590C', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '她說：「早知道第一年就該學這個。」', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'lg', wrap: true },
      ]},
      ...(footer.length > 0 ? { footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: footer } } : {}),
    },
  };
}

// === LP 頁面 ===
app.get('/lp', (req, res) => {
  res.sendFile(path.join(__dirname, 'lp.html'));
});

// 下一場直播 API（LP 動態讀取）
app.get('/api/next-session', (req, res) => {
  const sessions = parseSessions();
  if (sessions.length === 0) return res.json({ hasSession: false });
  const s = sessions[0];
  const weekdays = ['日','一','二','三','四','五','六'];
  const ts = getSessionTimestamp(s);
  const d = ts ? new Date(ts + 8 * 3600000) : null;
  const weekday = d ? weekdays[d.getUTCDay()] : '';
  res.json({
    hasSession: true,
    month: s.month,
    day: s.day,
    time: s.time,
    weekday,
    label: `${s.month}/${s.day}（${weekday}）`,
    iso: d ? d.toISOString().replace('Z', '+08:00') : null,
  });
});

app.get('/fascia-chains', (req, res) => {
  res.sendFile(path.join(__dirname, 'fascia-chains.html'));
});

// === SOP 檢查表（從 knownu-sop-rant 整合） ===
app.use('/sop', express.static(path.join(__dirname, 'sop')));

app.get('/favicon.ico', (req, res) => { res.sendFile(path.join(__dirname, 'favicon.ico')); });
app.get('/favicon-32.png', (req, res) => { res.sendFile(path.join(__dirname, 'favicon-32.png')); });
app.get('/favicon-16.png', (req, res) => { res.sendFile(path.join(__dirname, 'favicon-16.png')); });
app.get('/apple-touch-icon.png', (req, res) => { res.sendFile(path.join(__dirname, 'apple-touch-icon.png')); });

// === Keep Alive（防止服務休眠）===
setInterval(() => {
  const https = require('https');
  https.get(`https://${BOT_DOMAIN}/lp`, () => {}).on('error', () => {});
}, 4 * 60 * 1000); // 每 4 分鐘 ping 一次

// === Meta 廣告自動監控 ===
const META_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID || '';
const META_API_VERSION = 'v21.0';

async function metaAdMonitor() {
  if (!META_TOKEN) { console.log('META_ACCESS_TOKEN not set, skipping ad monitor'); return; }
  const https = require('https');

  function metaGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });
  }

  try {
    // Pull last 7 days ad-level insights
    const insightsUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_AD_ACCOUNT}/insights?fields=ad_id,ad_name,adset_name,spend,impressions,clicks,cpc,ctr,actions&level=ad&date_preset=last_7d&limit=50&access_token=${META_TOKEN}`;
    const insights = await metaGet(insightsUrl);

    if (insights.error) {
      console.error('Meta API error:', insights.error.message);
      if (insights.error.code === 190) {
        getClient().pushMessage({ to: ADMIN_USER_ID, messages: [{ type: 'text', text: '⚠️ Meta 廣告 Token 已過期！\n請到 Business Settings → System Users → ads-bott → 重新產生 Token，然後更新 Zeabur 環境變數 META_ACCESS_TOKEN' }] });
      }
      return;
    }

    if (!insights.data || insights.data.length === 0) return;

    let totalSpend = 0, totalLeads = 0, totalLP = 0;
    const adResults = [];
    const toPause = [];
    const topAds = [];

    for (const ad of insights.data) {
      let leads = 0, lp = 0;
      for (const a of (ad.actions || [])) {
        if (a.action_type === 'lead') leads = parseInt(a.value);
        if (a.action_type === 'landing_page_view') lp = parseInt(a.value);
      }
      const spend = parseFloat(ad.spend);
      const cpl = leads > 0 ? Math.round(spend / leads) : null;
      totalSpend += spend; totalLeads += leads; totalLP += lp;

      adResults.push({ id: ad.ad_id, name: ad.ad_name, adset: ad.adset_name, spend, leads, lp, cpl });

      // Auto-pause: spent > $500 and 0 leads
      if (spend > 500 && leads === 0) toPause.push(ad);

      // Flag good ads: CPL < $400
      if (cpl && cpl < 400) topAds.push({ name: ad.ad_name, spend, leads, cpl });
    }

    // Auto-pause bad ads
    for (const ad of toPause) {
      try {
        const pauseUrl = `https://graph.facebook.com/${META_API_VERSION}/${ad.ad_id}?status=PAUSED&access_token=${META_TOKEN}`;
        await new Promise((resolve, reject) => {
          const req = https.request(pauseUrl, { method: 'POST' }, res => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
          });
          req.on('error', reject);
          req.end();
        });
        console.log(`Auto-paused ad: ${ad.ad_name} (spent $${ad.spend}, 0 leads)`);
      } catch (e) {
        console.error(`Failed to pause ad ${ad.ad_name}:`, e.message);
      }
    }

    // Build daily report
    const totalCPL = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : '∞';
    let report = `📊 Meta 廣告日報（7日）\n\n`;
    report += `💰 總花費：$${Math.round(totalSpend).toLocaleString()}\n`;
    report += `👀 LP 瀏覽：${totalLP}\n`;
    report += `📱 加 LINE：${totalLeads}\n`;
    report += `📈 CPL：$${totalCPL}\n\n`;

    // Top 3 ads by spend
    adResults.sort((a, b) => b.spend - a.spend);
    report += `── 各廣告表現 ──\n`;
    for (const ad of adResults.slice(0, 7)) {
      const cplStr = ad.cpl ? `$${ad.cpl}` : '∞';
      report += `${ad.name.slice(0, 12)}｜$${Math.round(ad.spend)}｜${ad.leads}L｜${cplStr}\n`;
    }

    // Paused notifications
    if (toPause.length > 0) {
      report += `\n🚫 已自動暫停（花 >$500 且 0 Lead）：\n`;
      for (const ad of toPause) {
        report += `  ✕ ${ad.ad_name}（$${Math.round(parseFloat(ad.spend))}）\n`;
      }
    }

    // Good ads suggestions
    if (topAds.length > 0) {
      report += `\n🔥 表現好的廣告（CPL<$400）：\n`;
      for (const ad of topAds) {
        report += `  ★ ${ad.name}（CPL $${ad.cpl}）→ 考慮加預算？\n`;
      }
    }

    // Push to admin LINE
    await getClient().pushMessage({ to: ADMIN_USER_ID, messages: [{ type: 'text', text: report }] });
    console.log('Daily ad report sent to admin');

  } catch (e) {
    console.error('Meta ad monitor error:', e.message);
  }
}

// Schedule: run every day at 9:00 AM Taiwan time (UTC+8 = 1:00 UTC)
function scheduleDaily() {
  const now = new Date();
  const next9am = new Date();
  next9am.setHours(9, 0, 0, 0);
  if (now >= next9am) next9am.setDate(next9am.getDate() + 1);
  const delay = next9am - now;
  setTimeout(() => {
    metaAdMonitor();
    setInterval(metaAdMonitor, 24 * 60 * 60 * 1000); // then every 24h
  }, delay);
  console.log(`Ad monitor scheduled: next run in ${Math.round(delay / 60000)} min`);
}
scheduleDaily();

// Also expose manual trigger
app.get('/ads/report', async (req, res) => {
  try {
    await metaAdMonitor();
    res.json({ status: 'report sent' });
  } catch (e) {
    res.json({ status: 'error', message: e.message });
  }
});

// Test push to admin
app.get('/ads/test', async (req, res) => {
  const targetId = req.query.uid || ADMIN_USER_ID;
  try {
    await getClient().pushMessage({ to: targetId, messages: [{ type: 'text', text: '測試：廣告監控系統連線正常' }] });
    res.json({ status: 'test sent', targetId });
  } catch (e) {
    res.json({ status: 'push failed', error: e.message, targetId });
  }
});

// Show recent message senders (for finding user ID by message content)
const recentSenders = [];
app.get('/ads/recent-users', requireToken, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (q) {
    res.json(recentSenders.filter(s => s.text.toLowerCase().includes(q) || s.id.endsWith(q)));
  } else {
    res.json(recentSenders);
  }
});

// === 廣告追蹤 ===
// LINE_ADD_FRIEND_URL is defined in the config block above

// 追蹤連結：網站上用 /track?src=fb_campaign_name
app.get('/track', (req, res) => {
  const src = req.query.src || 'unknown';
  const fbclid = req.query.fbclid || '';
  const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : '';
  const fbp = req.cookies?.['_fbp'] || '';
  appData.trackClicks.push({ src, time: Date.now(), ip: req.ip, fbc, fbp });
  if (appData.trackClicks.length > 500) appData.trackClicks = appData.trackClicks.slice(-500);
  saveData();
  console.log(`追蹤點擊: src=${src}`);
  // 中間頁：先觸發 Pixel Lead，再跳 LINE
  res.send(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1499905730691279');
fbq('track','Lead');
</script>
<meta http-equiv="refresh" content="1;url=${LINE_ADD_FRIEND_URL}">
</head><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f0faf8;">
<div style="text-align:center;">
<p style="font-size:18px;color:#1a9e8f;">正在跳轉到 LINE...</p>
<p style="font-size:14px;color:#888;">如果沒有自動跳轉，<a href="${LINE_ADD_FRIEND_URL}">點這裡</a></p>
</div></body></html>`);
});

// 檢查表下載追蹤：點擊 = 完課標記
app.get('/track-checklist', (req, res) => {
  const userId = req.query.uid || '';
  if (userId) {
    if (!appData.completions) appData.completions = {};
    if (!appData.completions[userId]) {
      appData.completions[userId] = { time: Date.now(), source: 'checklist_download' };
      saveData();
      console.log(`檢查表下載完課標記: ${userId}`);
      getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
        { type: 'text', text: `✅ 完課通知（下載檢查表）\n用戶: ${userId}\n時間: ${new Date().toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'})}` },
      ]}).catch(() => {});
    }
  }
  res.redirect(FULL_CHECKLIST_URL);
});

// 回放追蹤：記錄誰點了回放連結
app.get('/track-replay', (req, res) => {
  const userId = req.query.uid || '';
  const url = req.query.url || REPLAY_URL;
  if (userId) {
    if (!appData.replayClicks) appData.replayClicks = {};
    appData.replayClicks[userId] = { time: Date.now() };
    saveData();
    console.log(`回放點擊: ${userId}`);
  }
  res.redirect(url);
});

// 追蹤統計 API（管理者查看）
app.get('/track/stats', (req, res) => {
  const stats = {};
  for (const click of appData.trackClicks) {
    stats[click.src] = (stats[click.src] || 0) + 1;
  }
  const userSources = {};
  for (const [userId, data] of Object.entries(appData.userSources)) {
    userSources[data.source] = (userSources[data.source] || 0) + 1;
  }
  res.json({ clickStats: stats, userSourceStats: userSources, totalUsers: Object.keys(appData.userSources).length });
});

// === 漏斗數據總覽 ===
// === WooCommerce 付款完成 webhook ===
// NOTION_COURSE_URL and STUDENT_GROUP_URL are defined in the config block above

app.post('/wc-webhook', express.json(), (req, res) => {
  try {
    const order = req.body;
    // WooCommerce webhook 會先發一個 ping，回 200 就好
    if (!order || !order.id) return res.sendStatus(200);

    const lineUserId = order.meta_data?.find(m => m.key === '_ref_line')?.value;
    const status = order.status;

    console.log(`WC webhook: order #${order.id}, status=${status}, lineUser=${lineUserId || 'none'}`);

    if (status === 'completed' && lineUserId) {
      // 標記為已確認付款
      if (!appData.courseInterest) appData.courseInterest = {};
      if (appData.courseInterest[lineUserId]) {
        appData.courseInterest[lineUserId].confirmed = true;
        appData.courseInterest[lineUserId].orderId = order.id;
      } else {
        appData.courseInterest[lineUserId] = { time: Date.now(), trigger: 'wc_payment', confirmed: true, orderId: order.id };
      }
      // 停止再行銷
      for (const key of Object.keys(appData.remarketing)) {
        if (key.startsWith(lineUserId + ':')) appData.remarketing[key].converted = true;
      }
      saveData();

      // 自動發送課程連結 + 學員社群
      getClient().pushMessage({ to: lineUserId, messages: [
        { type: 'flex', altText: `🎉 付款成功！歡迎加入${SYSTEM_NAME}`,
          contents: { type: 'bubble',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
              contents: [{ type: 'text', text: '🎉 付款成功！歡迎加入！', color: '#FFFFFF', size: 'lg', weight: 'bold', wrap: true }] },
            body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
              { type: 'text', text: `恭喜你正式成為${SYSTEM_NAME}的學員！`, size: 'sm', color: '#333333', wrap: true },
              { type: 'text', text: '你的課程已經準備好了 👇', size: 'sm', color: '#333333', weight: 'bold', margin: 'md', wrap: true },
              { type: 'separator', margin: 'lg' },
              { type: 'text', text: `📚 ${SYSTEM_NAME}課程`, weight: 'bold', size: 'md', color: '#1a1a1a', margin: 'lg' },
              { type: 'text', text: '8 大階段、80+ 堂課程，從觀察到服務一步步帶你', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
              { type: 'separator', margin: 'lg' },
              { type: 'text', text: '👥 加入正式學員社群', weight: 'bold', size: 'md', color: '#1a1a1a', margin: 'lg' },
              { type: 'text', text: '跟其他學員交流、老師親自解答、實體課通知', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
            ]},
            footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
              { type: 'button', action: { type: 'uri', label: '📚 進入課程', uri: NOTION_COURSE_URL }, style: 'primary', color: '#27ACB2', height: 'sm' },
              { type: 'button', action: { type: 'uri', label: '👥 加入正式學員社群', uri: STUDENT_GROUP_URL }, style: 'secondary', height: 'sm', margin: 'sm' },
            ]},
          },
        },
      ]}).then(() => console.log(`付款成功通知已發送: ${lineUserId}, order #${order.id}`))
        .catch(err => console.error(`付款成功通知失敗:`, err.message));
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('WC webhook error:', err.message);
    res.sendStatus(200);
  }
});

app.get('/avatar/status', (req, res) => {
  res.json({
    aiClient: !!aiClient,
    promptLoaded: !!AVATAR_PROMPT,
    promptLength: AVATAR_PROMPT ? AVATAR_PROMPT.length : 0,
  });
});

// 管理端點 token 驗證
function requireToken(req, res, next) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return next(); // 未設定 token 則不擋（向下相容）
  if (req.query.token === token || req.headers['x-admin-token'] === token) return next();
  return res.status(403).json({ error: '驗證失敗' });
}

app.get('/remarketing/status', requireToken, (req, res) => {
  const result = {};
  for (const [key, rmk] of Object.entries(appData.remarketing || {})) {
    result[key] = {
      userId: rmk.userId?.slice(-6),
      sessionTime: new Date(rmk.sessionTime).toLocaleString('zh-TW'),
      converted: rmk.converted,
      waves: rmk.waves,
    };
  }
  res.json(result);
});

// 手動標記完課（補救系統建置前的用戶）
app.get('/remarketing/mark-completed', requireToken, (req, res) => {
  const { session, confirm } = req.query;
  if (!session) return res.status(400).json({ error: 'need ?session=0324&confirm=true' });

  // 找出該場次所有 remarketing 記錄的 userId
  const targets = [];
  for (const [key, rmk] of Object.entries(appData.remarketing || {})) {
    if (key.endsWith(':' + session)) {
      targets.push({ key, userId: rmk.userId });
    }
  }

  if (targets.length === 0) return res.json({ error: `session ${session} 沒有找到任何人` });

  if (confirm !== 'true') {
    return res.json({
      preview: true,
      session,
      message: `將標記 ${targets.length} 人為已完課（已到課版追單）`,
      users: targets.map(t => t.userId.slice(-6)),
      hint: '確認後加 &confirm=true',
    });
  }

  if (!appData.completions) appData.completions = {};
  if (!appData.attendance) appData.attendance = {};
  let count = 0;
  for (const t of targets) {
    if (!appData.completions[t.userId]) {
      appData.completions[t.userId] = { time: Date.now(), manual: true };
      count++;
    }
    if (!appData.attendance[t.key]) {
      appData.attendance[t.key] = { time: Date.now(), manual: true };
    }
  }
  saveData();
  return res.json({ success: true, session, markedCompleted: count, total: targets.length });
});

app.get('/remarketing/resend', requireToken, async (req, res) => {
  const { session, wave, segment, uid } = req.query; // uid: 可選，指定單一用戶 ID（只發給這個人）
  if (!session || !wave) return res.status(400).json({ error: 'need ?session=0324&wave=wave2&segment=attended&uid=Uxxx&confirm=true' });
  let targets = Object.entries(appData.remarketing || {}).filter(([k, rmk]) => k.endsWith(':' + session) && !rmk.converted);
  if (uid) targets = targets.filter(([k, rmk]) => rmk.userId === uid || k.startsWith(uid));
  if (req.query.confirm !== 'true') {
    return res.json({ preview: true, session, wave, segment: segment || 'auto', count: targets.length, message: 'Add &confirm=true to actually send' });
  }
  const results = [];
  for (const [key, rmk] of targets) {
    const reg = appData.registrations[key];
    if (!reg) continue;
    const s = { month: reg.month, day: reg.day, time: reg.time, link: reg.link };
    let msg;
    if (segment === 'attended') {
      msg = buildAIWaveMessage(wave, 'attended') || buildWaveMessage(wave, s);
    } else if (segment === 'absent') {
      msg = buildAIWaveMessage(wave, 'absent') || buildCatchUpMessage(wave, s);
    } else if (segment === 'replay') {
      msg = buildAIWaveMessage(wave, 'replay') || buildCatchUpMessage(wave, s);
    } else {
      const hasCompleted = appData.completions && appData.completions[rmk.userId];
      const attended = appData.attendance && appData.attendance[key];
      const watchedReplay = appData.replayClicks && appData.replayClicks[rmk.userId];
      if (hasCompleted || attended) {
        msg = buildAIWaveMessage(wave, 'attended') || buildWaveMessage(wave, s);
      } else if (watchedReplay) {
        msg = buildAIWaveMessage(wave, 'replay') || buildCatchUpMessage(wave, s);
      } else {
        msg = buildAIWaveMessage(wave, 'absent') || buildCatchUpMessage(wave, s);
      }
    }
    if (!msg) { results.push({ userId: rmk.userId.slice(-6), status: 'no_message' }); continue; }
    msg = injectUserId(msg, rmk.userId);
    try {
      await getClient().pushMessage({ to: rmk.userId, messages: [msg] });
      rmk.waves[wave] = true;
      results.push({ userId: rmk.userId.slice(-6), status: 'sent' });
    } catch (e) {
      results.push({ userId: rmk.userId.slice(-6), status: 'failed', error: e.message });
    }
  }
  saveData();
  res.json({ session, wave, segment: segment || 'auto', total: targets.length, results });
});

// 上傳追單文案（草稿）
app.post('/remarketing/upload-chase', requireToken, express.json(), async (req, res) => {
  const data = req.body;
  if (!data || !data.attended || !data.absent || !data.replay) {
    return res.status(400).json({ error: '需要 {attended:{wave2,wave3,wave5}, absent:{...}, replay:{...}}' });
  }
  for (const seg of ['attended', 'absent', 'replay']) {
    for (const w of ['wave2', 'wave3', 'wave5']) {
      if (!data[seg][w]) return res.status(400).json({ error: `缺少 ${seg}.${w}` });
    }
  }
  appData.aiChaseMessagesDraft = data;
  await saveData();
  res.json({ success: true, message: '草稿已上傳。去 LINE Bot 發「預覽追單」確認，再發「啟用追單」上線。' });
});

app.get('/funnel', (req, res) => {
  const regCount = Object.keys(appData.registrations).length;
  const completionCount = appData.completions ? Object.keys(appData.completions).length : 0;
  const interestCount = appData.courseInterest ? Object.keys(appData.courseInterest).length : 0;

  // 各場次報名人數
  const sessionBreakdown = {};
  for (const [key, reg] of Object.entries(appData.registrations)) {
    const session = `${reg.month}/${reg.day}`;
    sessionBreakdown[session] = (sessionBreakdown[session] || 0) + 1;
  }

  // 最近表達報名意願的用戶
  const recentInterest = appData.courseInterest
    ? Object.entries(appData.courseInterest)
        .sort((a, b) => b[1].time - a[1].time)
        .slice(0, 20)
        .map(([uid, d]) => ({ userId: uid.slice(-6), time: new Date(d.time).toLocaleString('zh-TW'), trigger: d.trigger }))
    : [];

  res.json({
    summary: {
      '報名直播': regCount,
      '完成上課(777)': completionCount,
      '表達報名意願': interestCount,
      '轉換率(上課→意願)': completionCount > 0 ? Math.round(interestCount / completionCount * 100) + '%' : 'N/A',
    },
    sessionBreakdown,
    recentInterest,
  });
});

// === Webhook ===
app.post('/webhook', express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }), (req, res) => {
  const channelSecret = process.env.CHANNEL_SECRET;
  const signature = req.headers['x-line-signature'];
  const hash = crypto.createHmac('SHA256', channelSecret).update(req.rawBody).digest('base64');
  if (hash !== signature) return res.status(403).send('Invalid signature');

  const client = getClient();
  Promise.all(req.body.events.map(event => handleEvent(event, client)))
    .then(() => res.json({ success: true }))
    .catch((err) => { console.error(err); res.status(500).end(); });
});

// === 場次解析 ===
function parseSessions() {
  const sessions = [];
  const now = Date.now();
  for (let i = 1; i <= 20; i++) {
    const raw = process.env[`SESSION_${i}`];
    if (!raw) continue;
    const idx1 = raw.indexOf('_');
    const idx2 = raw.indexOf('_', idx1 + 1);
    if (idx1 === -1 || idx2 === -1) continue;
    const date = raw.slice(0, idx1);
    const time = raw.slice(idx1 + 1, idx2);
    const link = raw.slice(idx2 + 1);
    const s = { month: parseInt(date.slice(0, 2), 10), day: parseInt(date.slice(2, 4), 10), time, link };
    // 直播開始後自動隱藏該場次
    const ts = getSessionTimestamp(s);
    if (ts && now > ts) continue;
    sessions.push(s);
  }
  return sessions;
}

// === 事件處理 ===
async function handleEvent(event, client) {
  // 新加入好友 → 比對追蹤來源 + 歡迎訊息
  if (event.type === 'follow') {
    const userId = event.source.userId;
    const now = Date.now();

    // 比對最近 5 分鐘內的追蹤點擊
    const recentClick = appData.trackClicks
      .filter(c => now - c.time < 5 * 60 * 1000)
      .sort((a, b) => b.time - a.time)[0];

    if (recentClick) {
      appData.userSources[userId] = { source: recentClick.src, time: now };
      console.log(`用戶來源比對: ${userId} → ${recentClick.src}`);
      // Meta Conversion API: 從 FB 廣告來的，回傳 Lead 事件
      if (recentClick.src.startsWith('fb_')) {
        const hashedIp = recentClick.ip ? crypto.createHash('sha256').update(recentClick.ip).digest('hex') : undefined;
        const userData = {};
        if (hashedIp) userData.client_ip_address = recentClick.ip;
        if (recentClick.fbc) userData.fbc = recentClick.fbc;
        if (recentClick.fbp) userData.fbp = recentClick.fbp;
        sendMetaConversionEvent('Lead', userData, `https://${BOT_DOMAIN}/track?src=${recentClick.src}`);
      }
    } else {
      appData.userSources[userId] = { source: 'fb_direct', time: now };
    }
    saveData();

    const sessions = parseSessions();
    const messages = [];

    if (sessions.length > 0) {
      messages.push(
        { type: 'text', text: `你好，我是 ${INSTRUCTOR_NAME} 老師 👋\n\n你現在最卡的那件事，可能不是技術問題。\n\n免費直播課裡告訴你答案 👇` },
        buildSessionCarousel(sessions),
      );
    } else {
      messages.push(
        { type: 'text', text: `你好，我是 ${INSTRUCTOR_NAME} 老師 👋\n\n你現在最卡的那件事，可能不是技術問題。\n\n直播場次籌備中，有新場次第一時間通知你！` },
      );
    }

    // Day 1（+24h）養成推送：老師故事
    setTimeout(() => {
      // 已報名的就不推了，避免干擾
      if (Object.keys(appData.registrations).some(k => k.startsWith(userId + ':'))) return;
      getClient().pushMessage({ to: userId, messages: [buildNurtureDay1()] })
        .then(() => console.log(`養成 Day1 已發送: ${userId}`))
        .catch(err => console.error(`養成 Day1 失敗:`, err.message));
    }, 24 * 3600000);

    // Day 2（+48h）養成推送：學員故事
    setTimeout(() => {
      if (Object.keys(appData.registrations).some(k => k.startsWith(userId + ':'))) return;
      getClient().pushMessage({ to: userId, messages: [buildNurtureDay2()] })
        .then(() => console.log(`養成 Day2 已發送: ${userId}`))
        .catch(err => console.error(`養成 Day2 失敗:`, err.message));
    }, 48 * 3600000);

    // +5 分鐘後發分眾問題
    if (!appData.userProfiles[userId]) {
      setTimeout(() => {
        getClient().pushMessage({ to: userId, messages: [
          { type: 'flex', altText: '你目前是哪一種身體工作者？',
            contents: { type: 'bubble', size: 'kilo',
              header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '15px',
                contents: [{ type: 'text', text: '🙋 想更了解你', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
              body: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
                { type: 'text', text: '你目前的狀況是？', size: 'sm', color: '#333333', weight: 'bold', wrap: true },
                { type: 'text', text: '讓我推薦最適合你的內容 👇', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
              ]},
              footer: { type: 'box', layout: 'vertical', paddingAll: '15px', spacing: 'sm', contents: [
                { type: 'button', action: { type: 'message', label: '💆 我是整復師／按摩師', text: '我是整復按摩師' }, style: 'primary', color: '#284B8B', height: 'sm' },
                { type: 'button', action: { type: 'message', label: '🏋️ 我是健身／瑜珈教練', text: '我是教練' }, style: 'primary', color: '#284B8B', height: 'sm' },
                { type: 'button', action: { type: 'message', label: '🌱 我想學一技之長', text: '我想學一技之長' }, style: 'primary', color: '#7B61AD', height: 'sm' },
                { type: 'button', action: { type: 'message', label: '🤔 純粹好奇來看看', text: '我純粹好奇' }, style: 'primary', color: '#555555', height: 'sm' },
              ]},
            },
          },
        ]}).then(() => console.log(`分眾問題已發送: ${userId}`))
          .catch(err => console.error(`分眾問題發送失敗:`, err.message));
      }, 5 * 60 * 1000);
    }

    return client.replyMessage({ replyToken: event.replyToken, messages });
  }

  // 貼圖 → 回覆場次引導
  if (event.type === 'message' && event.message.type === 'sticker') {
    const sessions = parseSessions();
    if (sessions.length > 0) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: `😊 感謝你的貼圖！\n\n我們有免費的「${SYSTEM_NAME}」直播課\n報名成功立即送你📋「身體評估 SOP 檢查表」\n\n選一個場次報名吧 👇` },
        buildSessionCarousel(sessions),
      ]});
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: '😊 感謝你的貼圖！目前暫無直播場次，有新場次會第一時間通知你！' },
    ]});
  }

  if (event.type !== 'message' || event.message.type !== 'text') return Promise.resolve(null);

  const userMessage = event.message.text.trim();
  const userId = event.source.userId;
  console.log(`收到訊息: userId=${userId}, text=${userMessage}`);

  // 暫停模式：只擋 AI 分身自動回覆，不擋按鈕/報名/場次等功能性回覆
  // （BOT_PAUSE 檢查移到 AI 分身 fallback 前面）
  // Track recent senders for admin ID lookup
  recentSenders.unshift({ id: userId, text: userMessage, time: new Date().toISOString() });
  if (recentSenders.length > 200) recentSenders.length = 200;
  const sessions = parseSessions();

  // 自動到課判定：直播期間（sessionTime ~ +2h）有發訊息就標記 attended
  if (!appData.attendance) appData.attendance = {};
  const now = Date.now();
  for (const regKey of Object.keys(appData.registrations)) {
    if (!regKey.startsWith(userId + ':')) continue;
    const reg = appData.registrations[regKey];
    if (reg.sessionTime && now >= reg.sessionTime && now <= reg.sessionTime + 2 * 3600000) {
      if (!appData.attendance[regKey]) {
        appData.attendance[regKey] = { time: now };
        saveData();
        console.log(`到課標記: ${userId} (${regKey})`);
      }
    }
  }

  // === 管理者：YouTube 連結 → 自動剪短影音（先確認再執行） ===
  if (userId === ADMIN_USER_ID) {
    // 確認後存入佇列
    if (userMessage.startsWith('剪片確認 ')) {
      const ytUrl = userMessage.replace('剪片確認 ', '').trim();
      const https = require('https');
      const postData = JSON.stringify({ url: ytUrl });
      const req = https.request({
        hostname: SHORTS_SERVICE_HOST || 'localhost', path: '/api/queue', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => console.log('Queue result:', body));
      });
      req.on('error', e => console.error('Queue error:', e.message));
      req.write(postData);
      req.end();
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: `已加入處理佇列！\n\n連結：${ytUrl}\n\nMac 會自動開始剪片，完成後通知你。` },
      ]});
    }

    if (userMessage === '取消剪片') {
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: '已取消。' },
      ]});
    }

    // YouTube URL 偵測 → 確認按鈕
    const ytMatch = userMessage.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:live\/|watch\?v=)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      const ytUrl = userMessage.match(/https?:\/\/[^\s]+/)?.[0] || userMessage;
      return client.replyMessage({ replyToken: event.replyToken, messages: [{
        type: 'flex', altText: '確認自動剪短影音',
        contents: {
          type: 'bubble',
          body: {
            type: 'box', layout: 'vertical', spacing: 'md',
            contents: [
              { type: 'text', text: '自動剪短影音', weight: 'bold', size: 'lg' },
              { type: 'text', text: ytUrl, size: 'xs', color: '#888888', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '確認後 Mac 會自動下載、剪片、後製、排程', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
            ],
          },
          footer: {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'button', style: 'primary', color: '#5B9BD5', action: { type: 'message', label: '開始剪片', text: `剪片確認 ${ytUrl}` } },
              { type: 'button', style: 'secondary', action: { type: 'message', label: '取消', text: '取消剪片' } },
            ],
          },
        },
      }]});
    }
  }

  // === 管理者 AI 意圖辨識（自然語言 → 指令） ===
  if (userId === ADMIN_USER_ID && aiClient && !['報名','777','我有問題想問','預約一對一諮詢','我已完成報名'].includes(userMessage)) {
    // 先檢查是否已經是精確指令，是的話跳過 AI 辨識
    const exactCmds = ['生成追單','預覽追單','測試追單','啟用追單','停用追單'];
    const isExactCmd = exactCmds.some(c => userMessage.startsWith(c));

    if (!isExactCmd) {
      try {
        const intentRes = await aiClient.chat.completions.create({
          model: 'claude-haiku-4-5',
          max_tokens: 150,
          messages: [
            { role: 'system', content: `你是 LINE Bot 的指令路由器。管理者會用自然語言下指令，你要判斷意圖並回傳對應指令。

可用指令：
- "廣告報告" → 觸發 Meta 廣告數據報告
- "生成追單 [主題]" → AI 產出追單文案草稿
- "預覽追單" → 預覽追單文案
- "測試追單 [分眾] [波次]" → 測試特定追單卡片（分眾：到課/未到課/回放，波次：1-6）
- "啟用追單" → 追單文案上線
- "停用追單" → 追單文案下線
- "完單 [用戶ID後6碼]" → 標記某用戶已完成付款，停止追單
- "無法辨識" → 不屬於以上任何功能

只回傳指令本身，不要解釋。如果無法判斷，回傳「無法辨識」。` },
            { role: 'user', content: userMessage },
          ],
        });
        const intent = intentRes.choices[0].message.content.trim();
        console.log(`AI 意圖辨識: "${userMessage}" → "${intent}"`);

        if (intent === '廣告報告') {
          client.replyMessage({ replyToken: event.replyToken, messages: [
            { type: 'text', text: '拉取廣告數據中...' },
          ]});
          metaAdMonitor();
          return;
        }

        // 如果辨識出其他指令，改寫 userMessage 讓後續邏輯處理
        if (intent !== '無法辨識' && intent !== userMessage) {
          // 把辨識結果當作新的 userMessage 繼續往下跑
          Object.defineProperty(event.message, 'text', { value: intent, writable: true });
          // 不 return，讓它繼續往下 match 精確指令
        }
      } catch (e) {
        console.error('AI 意圖辨識失敗:', e.message);
        // 辨識失敗就繼續用原本的 message 往下跑
      }
    }
  }

  // 重新取得 userMessage（可能被 AI 改寫過）
  const adminMsg = event.message.text.trim();

  // === 管理者指令：AI 追單工具人 ===
  if (userId === ADMIN_USER_ID && adminMsg.startsWith('生成追單')) {
    const topic = adminMsg.replace('生成追單', '').trim() || DEFAULT_LIVESTREAM_TOPIC;
    client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: `AI 追單工具人啟動中...\n主題：${topic}\n產出 6波 × 3分眾 = 18 則訊息\n\n完成後會通知你預覽，確認 OK 再發「啟用追單」上線` },
    ]});
    generateChaseMessages(topic).then(async (result) => {
      if (result) {
        appData.aiChaseMessagesDraft = result;
        await saveData();
        const preview = `AI 追單工具人完成（草稿）\n混合模式：wave 1,4,6 用 Flex 卡片，wave 2,3,5 用 AI 文字\n\n【到課版 wave2】\n${result.attended.wave2.substring(0, 200)}\n\n【未到課版 wave2】\n${result.absent.wave2.substring(0, 200)}\n\n【回放版 wave2】\n${result.replay.wave2.substring(0, 200)}\n\n---\n指令：\n「預覽追單」看全部 9 則 AI 文字\n「測試追單 到課 2」收第2波到課版\n「啟用追單」確認上線`;
        getClient().pushMessage({ to: ADMIN_USER_ID, messages: [{ type: 'text', text: preview }] });
      } else {
        getClient().pushMessage({ to: ADMIN_USER_ID, messages: [{ type: 'text', text: 'AI 追單工具人失敗。請檢查 AI_API_KEY。' }] });
      }
    });
    return;
  }

  if (userId === ADMIN_USER_ID && adminMsg.startsWith('預覽追單')) {
    const msgs = appData.aiChaseMessagesDraft || appData.aiChaseMessages;
    if (!msgs) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: '尚未生成 AI 追單訊息。\n請發送「生成追單 [直播主題]」' },
      ]});
    }
    const isDraft = !!appData.aiChaseMessagesDraft;
    const arg = adminMsg.replace('預覽追單', '').trim();
    const segMap = { '到課': 'attended', '未到課': 'absent', '回放': 'replay', '看回放': 'replay' };

    // 沒指定分眾 → 顯示選單
    if (!arg || !segMap[arg]) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [{
        type: 'flex', altText: '選擇預覽分眾',
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#1a1a2e', paddingAll: '18px',
            contents: [
              { type: 'text', text: isDraft ? '追單草稿預覽' : '追單已上線版本', color: '#FFFFFF', size: 'md', weight: 'bold' },
              { type: 'text', text: '選擇受眾版本，查看 6 波字卡', color: '#888888', size: 'xs', margin: 'sm' },
            ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
            { type: 'button', action: { type: 'message', label: '到課版（有看直播）', text: '預覽追單 到課' }, style: 'primary', color: '#3fb950', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '未到課版（沒來）', text: '預覽追單 未到課' }, style: 'primary', color: '#ff8c00', height: 'sm', margin: 'sm' },
            { type: 'button', action: { type: 'message', label: '回放版（看了錄影）', text: '預覽追單 回放' }, style: 'primary', color: '#58a6ff', height: 'sm', margin: 'sm' },
          ]},
        },
      }]});
    }

    // 指定分眾 → 6 波字卡 carousel
    const segment = segMap[arg];
    const waveColors = { wave1: '#284B8B', wave2: '#7B61AD', wave3: '#E8590C', wave4: '#C92A2A', wave5: '#7B61AD', wave6: '#1a1a1a' };
    const waveLabels = { wave1: '+2h 感謝', wave2: 'D+1 異議', wave3: 'D+2 見證', wave4: 'D+3 截止', wave5: 'D+4 見證', wave6: 'D+5 最後' };
    const bubbles = [];
    for (let i = 1; i <= 6; i++) {
      const wk = `wave${i}`;
      const raw = msgs[segment][wk];
      const lines = raw.split('\n').filter(l => l.trim());
      const title = lines[0] || `第${i}波`;
      const body = lines.slice(1).join('\n') || raw;
      bubbles.push({
        type: 'bubble', size: 'kilo',
        header: { type: 'box', layout: 'vertical', backgroundColor: waveColors[wk], paddingAll: '14px',
          contents: [
            { type: 'text', text: `第${i}波 ${waveLabels[wk]}`, color: '#FFFFFF99', size: 'xxs' },
            { type: 'text', text: title.substring(0, 60), color: '#FFFFFF', size: 'sm', weight: 'bold', wrap: true, margin: 'xs' },
          ]},
        body: { type: 'box', layout: 'vertical', paddingAll: '14px',
          contents: [
            { type: 'text', text: body.substring(0, 500), size: 'xs', color: '#555555', wrap: true },
          ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '10px',
          contents: [
            { type: 'button', action: { type: 'message', label: '看學員收到的版本', text: `測試追單 ${arg} ${i}` }, style: 'secondary', height: 'sm' },
          ]},
      });
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: [{
      type: 'flex', altText: `追單預覽：${arg}版 6 波`,
      contents: { type: 'carousel', contents: bubbles },
    }]});
  }

  // 測試追單：發送真實 Flex 卡片給管理者自己看效果
  if (userId === ADMIN_USER_ID && adminMsg.startsWith('測試追單')) {
    const msgs = appData.aiChaseMessagesDraft || appData.aiChaseMessages;
    if (!msgs) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: '尚未生成。請先「生成追單 [主題]」' },
      ]});
    }
    const parts = adminMsg.replace('測試追單', '').trim().split(/\s+/);
    const segMap = { '到課': 'attended', '未到課': 'absent', '回放': 'replay', '看回放': 'replay' };
    const segment = segMap[parts[0]] || 'attended';
    const waveNum = parseInt(parts[1]) || 1;
    const waveKey = `wave${Math.min(Math.max(waveNum, 1), 6)}`;
    const segLabel = parts[0] || '到課';

    const flexMsg = textToFlex(msgs[segment][waveKey], waveKey, segment);
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: `測試：${segLabel} 第${waveNum}波\n（這是學員會收到的 Flex 卡片）` },
      flexMsg,
    ]});
  }

  // 啟用追單：草稿上線
  if (userId === ADMIN_USER_ID && adminMsg === '啟用追單') {
    if (!appData.aiChaseMessagesDraft) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: '沒有草稿可啟用。請先「生成追單 [主題]」' },
      ]});
    }
    appData.aiChaseMessages = appData.aiChaseMessagesDraft;
    appData.aiChaseMessagesDraft = null;
    saveData();
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: 'AI 追單已上線！\n學員的追單訊息現在會使用 AI 版本。\n\n如需回到預設版本，發送「停用追單」' },
    ]});
  }

  // 完單：管理者手動標記用戶已付款，停止追單
  // 支援：「完單 呂宜真」（用名稱搜尋）或「完單 33d0bc」（用 ID 後 6 碼）
  if (userId === ADMIN_USER_ID && adminMsg.startsWith('完單')) {
    const query = adminMsg.replace('完單', '').trim();
    if (!query) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: '用法：完單 [LINE 顯示名稱 或 用戶ID後6碼]\n\n例：完單 呂宜真\n例：完單 33d0bc' },
      ]});
    }

    // 收集所有 remarketing 中的 unique userId
    const allUserIds = [...new Set(Object.values(appData.remarketing || {}).map(r => r.userId).filter(Boolean))];

    // 先試 ID 後綴匹配（快）
    let matchedIds = allUserIds.filter(uid => uid.endsWith(query));

    if (matchedIds.length === 0) {
      // 用 LINE API 查名稱匹配（慢但準）
      client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: `搜尋「${query}」中...` },
      ]});

      const matches = [];
      for (const uid of allUserIds) {
        try {
          const profile = await getClient().getProfile(uid);
          if (profile.displayName && profile.displayName.includes(query)) {
            matches.push({ userId: uid, name: profile.displayName });
          }
        } catch (e) { /* 用戶可能已封鎖 */ }
      }

      if (matches.length === 0) {
        getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
          { type: 'text', text: `找不到名稱含「${query}」的用戶。` },
        ]});
        return;
      }
      if (matches.length > 1) {
        const list = matches.map(m => `${m.name}（...${m.userId.slice(-6)}）`).join('\n');
        getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
          { type: 'text', text: `找到 ${matches.length} 位：\n${list}\n\n請用 ID 後 6 碼指定：完單 xxxxxx` },
        ]});
        return;
      }
      matchedIds = [matches[0].userId];
      // 通知找到了誰
      getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
        { type: 'text', text: `✅ 找到：${matches[0].name}（...${matches[0].userId.slice(-6)}）\n標記完單中...` },
      ]});
    }

    // 標記 converted
    let found = 0;
    for (const [key, rmk] of Object.entries(appData.remarketing || {})) {
      if (matchedIds.includes(rmk.userId)) {
        rmk.converted = true;
        found++;
      }
    }
    for (const [uid, ci] of Object.entries(appData.courseInterest || {})) {
      if (matchedIds.includes(uid)) {
        ci.confirmed = true;
      }
    }
    if (found > 0) {
      saveData();
      getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
        { type: 'text', text: `✅ 完單標記完成（${found} 筆再行銷已停止）` },
      ]});
    }
    return;
  }

  // 停用追單：回到寫死版本
  if (userId === ADMIN_USER_ID && adminMsg === '停用追單') {
    appData.aiChaseMessages = null;
    saveData();
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: 'AI 追單已停用，回到預設版本。' },
    ]});
  }

  // 預約一對一諮詢：開始流程
  if (userMessage === '預約一對一諮詢') {
    appData.bookings[userId] = { step: 'name', data: {} };
    saveData();
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: '太好了！讓我幫你安排一對一諮詢 🙌' },
      { type: 'text', text: BOOKING_STEPS.name.prompt },
    ]});
  }

  // 預約流程中：收集資料
  const booking = appData.bookings[userId];
  if (booking && booking.step && BOOKING_STEPS[booking.step]) {
    const currentStep = booking.step;
    booking.data[currentStep] = userMessage;

    const nextStep = BOOKING_STEPS[currentStep].next;
    if (nextStep === 'done') {
      // 收集完成 → 通知管理者 + 回覆用戶
      delete appData.bookings[userId];
      saveData();

      const d = booking.data;
      const summary = `📋 一對一諮詢預約\n\n👤 姓名：${d.name}\n💬 諮詢問題：${d.topic}\n⏰ 希望時段：${d.time}`;

      // 推送通知給管理者
      client.pushMessage({ to: ADMIN_USER_ID, messages: [
        { type: 'flex', altText: '新的一對一諮詢預約', contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
            contents: [{ type: 'text', text: '🔔 新的諮詢預約！', color: '#FFFFFF', size: 'lg', weight: 'bold' }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: `👤 ${d.name}`, size: 'md', color: '#1a1a1a', weight: 'bold' },
            { type: 'separator', margin: 'md' },
            { type: 'text', text: `💬 ${d.topic}`, size: 'sm', color: '#333333', margin: 'lg', wrap: true },
            { type: 'text', text: `⏰ 希望時段：${d.time}`, size: 'sm', color: '#333333', margin: 'md', wrap: true },
          ]},
        }},
      ]}).catch(err => console.error('通知管理者失敗:', err.message));

      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'flex', altText: '預約成功！', contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
            contents: [{ type: 'text', text: '✅ 預約成功！', color: '#FFFFFF', size: 'lg', weight: 'bold' }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: '我們已收到您的諮詢預約，老師會盡快與您確認時間！', size: 'sm', color: '#333333', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: `👤 ${d.name}`, size: 'sm', color: '#555555', margin: 'lg' },
            { type: 'text', text: `💬 ${d.topic}`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
            { type: 'text', text: `⏰ ${d.time}`, size: 'sm', color: '#555555', margin: 'sm' },
          ]},
        }},
      ]});
    }

    // 還有下一步
    booking.step = nextStep;
    saveData();
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: BOOKING_STEPS[nextStep].prompt },
    ]});
  }

  // 觀看直播錄影
  if (userMessage === '我想看直播錄影') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '直播錄影', contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#FF0000', paddingAll: '18px',
          contents: [{ type: 'text', text: '🎬 直播錄影回放', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: `${SYSTEM_NAME} — 免費直播課`, weight: 'bold', size: 'md', color: '#1a1a1a', wrap: true },
          { type: 'text', text: '點擊下方按鈕觀看完整直播錄影，看完後歡迎回來告訴我們你的想法！', size: 'sm', color: '#555555', margin: 'md', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '▶️ 觀看直播錄影', uri: REPLAY_URL }, style: 'primary', color: '#FF0000', height: 'sm' },
        ]},
      }},
    ]});
  }

  // 完成上課 → 領取完整檢查表 + 加入社群
  const normalized777 = userMessage.replace(/７/g, '7').replace(/\s/g, '');
  if (normalized777 === '777') {
    console.log(`=== 777 觸發 === userId=${userId}, raw="${event.message.text}", normalized="${normalized777}"`);
    // 追蹤：標記此用戶已完成上課
    if (!appData.completions) appData.completions = {};
    appData.completions[userId] = { time: Date.now() };

    // 如果此用戶沒有報名過任何場次，自動補建再行銷記錄（綁定最近的已結束場次）
    const hasReg = Object.keys(appData.registrations).some(k => k.startsWith(userId + ':'));
    if (!hasReg) {
      const allSessions = [];
      for (let i = 1; i <= 20; i++) {
        const raw = process.env[`SESSION_${i}`];
        if (!raw) continue;
        const idx1 = raw.indexOf('_');
        const idx2 = raw.indexOf('_', idx1 + 1);
        if (idx1 === -1 || idx2 === -1) continue;
        const date = raw.slice(0, idx1);
        const time = raw.slice(idx1 + 1, idx2);
        const link = raw.slice(idx2 + 1);
        const s = { month: parseInt(date.slice(0, 2), 10), day: parseInt(date.slice(2, 4), 10), time, link };
        const ts = getSessionTimestamp(s);
        if (ts) allSessions.push({ ...s, sessionTime: ts, date });
      }
      // 找最近一場已開始的直播（sessionTime <= now，取最接近的）
      const now = Date.now();
      const pastSessions = allSessions.filter(s => s.sessionTime <= now).sort((a, b) => b.sessionTime - a.sessionTime);
      if (pastSessions.length > 0) {
        const latest = pastSessions[0];
        const mm = String(latest.month).padStart(2, '0');
        const dd = String(latest.day).padStart(2, '0');
        const regKey = `${userId}:${mm}${dd}`;
        appData.registrations[regKey] = {
          userId, month: latest.month, day: latest.day, time: latest.time, link: latest.link, sessionTime: latest.sessionTime,
          reminders: { '24h': true, '4h': true, '2h': true, '10m': true },
        };
        appData.remarketing[regKey] = {
          userId, sessionTime: latest.sessionTime, month: latest.month, day: latest.day, time: latest.time, link: latest.link,
          waves: { wave1: false, wave2: false, wave3: false, wave4: false, wave5: false, wave6: false },
          converted: false,
        };
        if (!appData.attendance) appData.attendance = {};
        appData.attendance[regKey] = { time: Date.now() };
        console.log(`777 補建再行銷: ${userId} → ${regKey}`);
        scheduleTimersForReg(regKey);
      }
    }

    saveData();
    console.log(`完成上課: ${userId}`);
    // 通知管理者有人完課
    getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
      { type: 'text', text: `✅ 完課通知\n用戶: ${userId}\n時間: ${new Date().toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'})}` },
    ]}).catch(e => console.error('完課通知失敗:', e.message));
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '🎉 完成上課！領取完整身體評估SOP檢查表',
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
            contents: [{ type: 'text', text: '🎉 恭喜你完成上課！', color: '#FFFFFF', size: 'lg', weight: 'bold' }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: '感謝你認真參與直播課程！', size: 'sm', color: '#333333', wrap: true },
            { type: 'text', text: '這是你的專屬獎勵 👇', size: 'sm', color: '#333333', margin: 'md', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: '📋 完整版「身體評估SOP檢查表」', weight: 'bold', size: 'md', color: '#1a1a1a', margin: 'lg' },
            { type: 'text', text: '包含完整評估流程，幫助你每一次服務都展現專業！', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', spacing: 'sm', contents: [
            { type: 'button', action: { type: 'uri', label: '📋 下載完整身體評估SOP檢查表', uri: `https://${BOT_DOMAIN}/track-checklist?uid=${userId}` }, style: 'primary', color: '#27ACB2', height: 'sm' },
            { type: 'button', action: { type: 'uri', label: '👥 加入社群', uri: COMMUNITY_GROUP_URL }, style: 'secondary', height: 'sm' },
            { type: 'box', layout: 'vertical', contents: [
              { type: 'text', text: '實體課・活動優先通知', size: 'xs', color: '#999999', align: 'center' },
            ]},
          ]},
        },
      },
    ]});
  }

  // 分眾回覆
  const profileMap = { '我是整復按摩師': '整復按摩師', '我是教練': '教練', '我想學一技之長': '想學一技之長', '我純粹好奇': '純粹好奇' };
  if (profileMap[userMessage]) {
    const profile = profileMap[userMessage];
    if (!appData.userProfiles) appData.userProfiles = {};
    appData.userProfiles[userId] = { type: profile, time: Date.now() };
    saveData();
    console.log(`用戶分眾: ${userId} → ${profile}`);
    const replyMap = {
      '整復按摩師': '收到！直播裡會分享怎麼用一套思維整合你現有的技術，讓客戶第一次就感受到差異 💪',
      '教練': `收到！直播會講到怎麼把${SYSTEM_NAME}融入訓練，幫客戶解決教練通常處理不了的問題 💪`,
      '想學一技之長': '很高興你想踏入這個領域！直播會讓你看到，學對方法比學多少手法更重要 🙌',
      '純粹好奇': '歡迎！直播內容很實用，就算不是從業者也能了解身體運作的底層邏輯 🙌',
    };
    const sessions = parseSessions();
    const msgs = [{ type: 'text', text: replyMap[profile] }];
    if (sessions.length > 0 && !Object.keys(appData.registrations).some(k => k.startsWith(userId + ':'))) {
      msgs.push({ type: 'text', text: '選一個方便的場次報名吧 👇' });
      msgs.push(buildSessionCarousel(sessions));
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: msgs });
  }

  // 舊版分眾相容（已點過舊按鈕的用戶）
  if (/^我是(整復師|按摩師|健身教練|其他老師)|^我還沒入行$/.test(userMessage)) {
    const oldMap = { '我是整復師': '整復按摩師', '我是按摩師': '整復按摩師', '我是健身教練': '教練', '我還沒入行': '想學一技之長' };
    if (userMessage === '我是其他老師') {
      if (!appData.userProfiles) appData.userProfiles = {};
      appData.userProfiles[userId] = { type: '待填寫', time: Date.now(), pending: true };
      saveData();
      return client.replyMessage({ replyToken: event.replyToken, messages: [
        { type: 'text', text: '請告訴我你的背景，例如：物理治療師、瑜珈老師、家庭主婦...' },
      ]});
    }
    const profile = oldMap[userMessage] || '其他';
    if (!appData.userProfiles) appData.userProfiles = {};
    appData.userProfiles[userId] = { type: profile, time: Date.now() };
    saveData();
    const sessions = parseSessions();
    const msgs = [{ type: 'text', text: '收到！很高興認識你 👋\n\n直播課裡會分享一套讓所有技術都能整合的思維框架，不管你的背景是什麼都適用。' }];
    if (sessions.length > 0 && !Object.keys(appData.registrations).some(k => k.startsWith(userId + ':'))) {
      msgs.push({ type: 'text', text: '選一個方便的場次報名吧 👇' });
      msgs.push(buildSessionCarousel(sessions));
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: msgs });
  }

  // 手動輸入職業/背景
  if (appData.userProfiles?.[userId]?.pending) {
    appData.userProfiles[userId] = { type: userMessage, time: Date.now() };
    saveData();
    console.log(`用戶分眾: ${userId} → ${userMessage}`);
    const sessions = parseSessions();
    const msgs = [{ type: 'text', text: `收到！很高興認識你 👋\n\n不管什麼背景，直播裡的內容都會讓你對身體有全新的理解。` }];
    if (sessions.length > 0 && !Object.keys(appData.registrations).some(k => k.startsWith(userId + ':'))) {
      msgs.push({ type: 'text', text: '選一個方便的場次報名吧 👇' });
      msgs.push(buildSessionCarousel(sessions));
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: msgs });
  }

  // 再行銷分支回覆
  if (userMessage === '張力思維概念讓我大開眼界') {
    return client.replyMessage({ replyToken: event.replyToken, messages: buildBranchA() });
  }
  if (userMessage === '學員見證讓我很心動') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildBranchB()] });
  }
  if (userMessage === '我想了解課程怎麼報名' || userMessage === '課程內容有哪些') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildCourseModules()] });
  }
  if (userMessage === '了解張力思維系統') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildCourseIntroCard()] });
  }
  if (userMessage === '該如何報名正式課程' || userMessage === '我要加入' || userMessage === '我想學') {
    // 追蹤：標記此用戶表達報名意願（不停止再行銷，等確認付款才停）
    if (!appData.courseInterest) appData.courseInterest = {};
    appData.courseInterest[userId] = { time: Date.now(), trigger: userMessage, confirmed: false };
    saveData();
    console.log(`報名意願: ${userId} → ${userMessage}`);

    // C: 通知管理者 — 高意願用戶
    const hasCompleted = appData.completions && appData.completions[userId];
    getClient().getProfile(userId).then(profile => {
      const displayName = profile.displayName || userId;
      return getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
        { type: 'text', text: `🔥 高意願用戶！\n👤 ${displayName}\n📊 狀態：${hasCompleted ? '已完課 + ' : ''}表達報名意願\n💬 觸發：「${userMessage}」\n⏰ ${new Date().toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'})}\n\n建議立刻私訊跟進` },
      ]});
    }).catch(() => {});

    // B: 3步成交序列
    // Step 1（立即）：發課程方案卡片
    client.replyMessage({ replyToken: event.replyToken, messages: [injectUserId(buildBranchC(), userId)] });

    // Step 2（30 分鐘後）：社會認同 + 邀請提問
    setTimeout(() => {
      const interest = appData.courseInterest?.[userId];
      if (interest && !interest.confirmed) {
        const interestCount = Object.keys(appData.courseInterest || {}).filter(k => !appData.courseInterest[k].confirmed).length;
        getClient().pushMessage({ to: userId, messages: [
          { type: 'text', text: `剛剛有 9 位同學跟你一樣對課程有興趣 💪\n\n有什麼問題想問嗎？不管是課程內容、學習方式、還是費用，都可以直接問我。` },
        ]}).then(() => console.log(`成交序列 Step2: ${userId}`))
          .catch(err => console.error(`成交序列 Step2 失敗:`, err.message));
      }
    }, 30 * 60000);

    // Step 3（24 小時後）：異議處理
    setTimeout(() => {
      const interest = appData.courseInterest?.[userId];
      if (interest && !interest.confirmed) {
        getClient().pushMessage({ to: userId, messages: [
          { type: 'flex', altText: '你是不是還在猶豫？', contents: { type: 'bubble',
            header: { type: 'box', layout: 'vertical', backgroundColor: '#2B5797', paddingAll: '18px',
              contents: [{ type: 'text', text: '💭 還在考慮嗎？', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
            body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
              { type: 'text', text: '很多人在這一步會猶豫，最常見的三個問題：', size: 'sm', color: '#333333', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '❶ 線上課真的學得會嗎？', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
              { type: 'text', text: '600+ 分鐘影片 + 線下實作 + 一對一諮詢，有人帶著你練到會。', size: 'sm', color: '#555', margin: 'sm', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '❷ 我的基礎夠嗎？', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
              { type: 'text', text: '有學員零基礎入門，3 個月後獨立接案。這套系統從底層教起。', size: 'sm', color: '#555', margin: 'sm', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: `❸ 每月 $${INSTALLMENT_AMOUNT.toLocaleString()} 值得嗎？`, weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
              { type: 'text', text: '學完多接 2 位客戶就回本。外面分開學這些要 10-18 萬。', size: 'sm', color: '#555', margin: 'sm', wrap: true },
            ]},
            footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
              { type: 'button', action: { type: 'uri', label: '🔥 把握最後機會報名', uri: COURSE_URL }, style: 'primary', color: '#C92A2A', height: 'sm' },
              { type: 'button', action: { type: 'uri', label: `💳 分${INSTALLMENT_MONTHS}期 $${INSTALLMENT_AMOUNT.toLocaleString()}/月`, uri: COURSE_URL }, style: 'primary', color: '#E8590C', height: 'sm', margin: 'sm' },
              { type: 'button', action: { type: 'message', label: '📞 先跟老師聊聊', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm', margin: 'sm' },
            ]},
          }},
        ]}).then(() => console.log(`成交序列 Step3: ${userId}`))
          .catch(err => console.error(`成交序列 Step3 失敗:`, err.message));
      }
    }, 24 * 3600000);

    return;
  }

  // 報名確認回覆
  if (userMessage === '我已完成報名') {
    if (appData.courseInterest?.[userId]) appData.courseInterest[userId].confirmed = true;
    // 確認付款完成，停止再行銷推播
    for (const key of Object.keys(appData.remarketing)) {
      if (key.startsWith(userId + ':')) appData.remarketing[key].converted = true;
    }
    saveData();
    console.log(`確認報名完成: ${userId}`);
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: `🎉 歡迎加入${SYSTEM_NAME}！`,
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
            contents: [{ type: 'text', text: `🎉 歡迎加入${SYSTEM_NAME}！`, color: '#FFFFFF', size: 'lg', weight: 'bold', wrap: true }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: '恭喜你做了最正確的決定！', size: 'sm', color: '#333333', wrap: true },
            { type: 'text', text: '你的課程已經準備好了 👇', size: 'sm', color: '#333333', weight: 'bold', margin: 'md', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: `📚 ${SYSTEM_NAME}課程`, weight: 'bold', size: 'md', color: '#1a1a1a', margin: 'lg' },
            { type: 'text', text: '點擊下方連結進入課程頁面，開始學習！', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
            { type: 'button', action: { type: 'uri', label: '📚 進入課程', uri: NOTION_COURSE_URL }, style: 'primary', color: '#27ACB2', height: 'sm' },
            { type: 'button', action: { type: 'uri', label: '👥 加入正式學員社群', uri: STUDENT_GROUP_URL }, style: 'secondary', height: 'sm', margin: 'sm' },
          ]},
        },
      },
    ]});
  }

  if (userMessage === '報名遇到問題') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '報名遇到問題？讓我幫你',
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '18px',
            contents: [{ type: 'text', text: '🤝 你遇到什麼問題？', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
            { type: 'text', text: '選一個最符合你狀況的 👇', size: 'sm', color: '#333333', wrap: true },
          ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', spacing: 'sm', contents: [
            { type: 'button', action: { type: 'message', label: '❓ 不知道怎麼報名', text: '不知道怎麼報名' }, style: 'primary', color: '#284B8B', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '💳 刷卡失敗/卡刷不過', text: '刷卡失敗' }, style: 'primary', color: '#284B8B', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '💰 想用匯款/其他方式付', text: '想用其他方式付款' }, style: 'primary', color: '#284B8B', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '📞 直接跟老師聊', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm' },
          ]},
        },
      },
    ]});
  }

  if (userMessage === '不知道怎麼報名') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '📋 報名步驟說明',
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
            contents: [{ type: 'text', text: '📋 報名只要 3 步', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: '① 點下方按鈕進入報名頁', size: 'sm', color: '#333333', weight: 'bold', wrap: true },
            { type: 'text', text: '② 填寫姓名、電話、Email', size: 'sm', color: '#333333', weight: 'bold', margin: 'md', wrap: true },
            { type: 'text', text: '③ 選擇付款方式（信用卡/匯款）', size: 'sm', color: '#333333', weight: 'bold', margin: 'md', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: '💳 信用卡可分 3/6/12 期零利率', size: 'sm', color: '#555555', margin: 'lg', wrap: true },
            { type: 'text', text: `每月最低 $${INSTALLMENT_AMOUNT.toLocaleString()}，接1位客戶就回本`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: '完成後回來跟我說「我已完成報名」就可以了！', size: 'sm', color: '#27ACB2', weight: 'bold', margin: 'lg', wrap: true },
          ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', spacing: 'sm', contents: [
            { type: 'button', action: { type: 'uri', label: '🔗 前往報名頁', uri: COURSE_URL }, style: 'primary', color: '#C92A2A', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '✅ 我已完成報名', text: '我已完成報名' }, style: 'primary', color: '#27ACB2', height: 'sm' },
          ]},
        },
      },
    ]});
  }

  if (userMessage === '刷卡失敗') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '💳 刷卡問題排解',
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#E8590C', paddingAll: '18px',
            contents: [{ type: 'text', text: '💳 刷卡問題？試試這些方法', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: '常見原因與解決方式：', size: 'sm', color: '#333333', weight: 'bold', wrap: true },
            { type: 'separator', margin: 'md' },
            { type: 'text', text: '1️⃣ 額度不足', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'lg' },
            { type: 'text', text: '→ 選分期付款（3/6/12期零利率），降低單次扣款金額', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
            { type: 'text', text: '2️⃣ 銀行擋海外交易', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'lg' },
            { type: 'text', text: '→ 打客服開啟海外線上交易，或換一張卡試試', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
            { type: 'text', text: '3️⃣ 還是不行', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'lg' },
            { type: 'text', text: '→ 可以改用銀行匯款！直接跟老師說就好', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', spacing: 'sm', contents: [
            { type: 'button', action: { type: 'uri', label: '🔗 重新嘗試報名', uri: COURSE_URL }, style: 'primary', color: '#C92A2A', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '💰 我想改用匯款', text: '想用其他方式付款' }, style: 'secondary', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '📞 直接跟老師聊', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm' },
          ]},
        },
      },
    ]});
  }

  if (userMessage === '想用其他方式付款') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '匯款/分期都在報名頁',
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
            contents: [{ type: 'text', text: '💰 匯款、分期都可以！', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: '報名頁面上就有所有付款方式：', size: 'sm', color: '#333333', wrap: true },
            { type: 'text', text: '✅ 信用卡（可分 3/6/12 期零利率）', size: 'sm', color: '#555555', margin: 'md', wrap: true },
            { type: 'text', text: '✅ 銀行匯款（帳號在頁面上）', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: '完成後回來跟我說「我已完成報名」就可以了！', size: 'sm', color: '#27ACB2', weight: 'bold', margin: 'lg', wrap: true },
          ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', spacing: 'sm', contents: [
            { type: 'button', action: { type: 'uri', label: '🔗 前往報名頁', uri: COURSE_URL }, style: 'primary', color: '#C92A2A', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '✅ 我已完成報名', text: '我已完成報名' }, style: 'primary', color: '#27ACB2', height: 'sm' },
          ]},
        },
      },
    ]});
  }

  if (userMessage === '我再想想') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '完全理解，但優惠快截止了',
        contents: { type: 'bubble',
          header: { type: 'box', layout: 'vertical', backgroundColor: '#E8590C', paddingAll: '18px',
            contents: [{ type: 'text', text: '🤔 完全理解', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
          body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
            { type: 'text', text: '這是一個重要的決定，想清楚再行動完全合理。', size: 'sm', color: '#333333', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: '但我想提醒你一件事：', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'lg', wrap: true },
            { type: 'text', text: '你當初會來看直播、會留言「我想學」，代表你心裡知道現狀需要改變。', size: 'sm', color: '#333333', margin: 'md', wrap: true },
            { type: 'text', text: '這個需要不會因為「再想想」就消失。', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: `⏰ 直播限定價 $${COURSE_PRICE.toLocaleString()} 名額有限`, size: 'sm', color: '#C92A2A', weight: 'bold', margin: 'lg', wrap: true },
            { type: 'text', text: `分${INSTALLMENT_MONTHS}期 = 每月 $${INSTALLMENT_AMOUNT.toLocaleString()}，接1位客戶就回本`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
            { type: 'text', text: `截止後恢復原價 $${COURSE_ORIGINAL_PRICE.toLocaleString()}`, size: 'sm', color: '#999999', margin: 'sm', wrap: true },
          ]},
          footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
            { type: 'button', action: { type: 'uri', label: '🔗 把握優惠報名', uri: COURSE_URL }, style: 'primary', color: '#C92A2A', height: 'sm' },
            { type: 'button', action: { type: 'message', label: '📞 先跟老師聊聊再決定', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm', margin: 'sm' },
          ]},
        },
      },
    ]});
  }
  if (userMessage === '我需要再想想') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildBranchD()] });
  }

  // 痛點診斷回覆
  const diagnosis = DIAGNOSIS_REPLIES[userMessage];
  if (diagnosis) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [diagnosis] });
  }

  // 有問題想問 → 常見 QA 引導
  if (/我有問題想問|我還有一個問題|還有問題|想問/.test(userMessage)) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildQACard()] });
  }

  // 異議處理
  const objection = OBJECTION_REPLIES[userMessage];
  if (objection) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: objection },
      { type: 'flex', altText: '查看課程', contents: { type: 'bubble',
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '🔗 查看課程 / 我要報名', uri: COURSE_URL }, style: 'primary', color: '#C92A2A', height: 'sm' },
        ]},
      }},
    ]});
  }

  // 匹配日期 → 報名成功 + 排程提醒 + 排程再行銷
  for (const s of sessions) {
    const mm = String(s.month).padStart(2,'0'), dd = String(s.day).padStart(2,'0');
    const cn = chineseMonths[s.month];
    const pattern = new RegExp(`(?:0?${s.month}[\\/\\-月]${s.day}|${mm}${dd}|${cn}月${s.day})`);
    if (pattern.test(userMessage)) {
      scheduleReminders(userId, s);
      return client.replyMessage({ replyToken: event.replyToken, messages: [buildConfirmCard(s)] });
    }
  }

  // 選擇方便時段
  if (userMessage === '選擇方便時段') {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'flex', altText: '選擇你方便的時段', contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#7B61AD', paddingAll: '18px',
          contents: [{ type: 'text', text: '📅 你通常什麼時間方便？', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '選一個最方便的時段，有符合的場次我會第一時間通知你！', size: 'sm', color: '#333333', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'message', label: '☀️ 平日白天', text: '方便時段：平日白天' }, style: 'primary', color: '#7B61AD', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '🌙 平日晚上', text: '方便時段：平日晚上' }, style: 'primary', color: '#7B61AD', height: 'sm', margin: 'sm' },
          { type: 'button', action: { type: 'message', label: '☀️ 假日白天', text: '方便時段：假日白天' }, style: 'primary', color: '#7B61AD', height: 'sm', margin: 'sm' },
          { type: 'button', action: { type: 'message', label: '🌙 假日晚上', text: '方便時段：假日晚上' }, style: 'primary', color: '#7B61AD', height: 'sm', margin: 'sm' },
        ]},
      }},
    ]});
  }

  if (/^方便時段：/.test(userMessage)) {
    const slot = userMessage.replace('方便時段：', '');
    if (!appData.waitlist) appData.waitlist = {};
    appData.waitlist[userId] = { time: Date.now(), preferredSlot: slot };
    saveData();
    console.log(`時段偏好: ${userId} → ${slot}`);
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: `收到！你偏好「${slot}」📝\n\n有符合的直播場次我會第一時間通知你！\n\n在等待的同時，也可以先看之前的直播錄影 👇` },
      { type: 'flex', altText: '先看直播錄影', contents: { type: 'bubble',
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '🎁 看到最後可以領取完整版「身體評估SOP檢查表」', size: 'sm', color: '#27ACB2', weight: 'bold', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: [
          { type: 'button', action: { type: 'uri', label: '▶️ 觀看直播錄影', uri: REPLAY_URL }, style: 'primary', color: '#27ACB2', height: 'sm' },
        ]},
      }},
    ]});
  }

  // 有新場次通知我
  if (userMessage === '有新場次通知我') {
    if (!appData.waitlist) appData.waitlist = {};
    appData.waitlist[userId] = { time: Date.now() };
    saveData();
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: '收到！有新的直播場次我會第一時間通知你 👍\n\n在等待的同時，你也可以先看之前的直播錄影 👇' },
      { type: 'flex', altText: '先看直播錄影', contents: { type: 'bubble',
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '🎁 看到最後可以領取完整版「身體評估SOP檢查表」', size: 'sm', color: '#27ACB2', weight: 'bold', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: [
          { type: 'button', action: { type: 'uri', label: '▶️ 觀看直播錄影', uri: REPLAY_URL }, style: 'primary', color: '#27ACB2', height: 'sm' },
        ]},
      }},
    ]});
  }

  // 時間不行
  if (/不行|沒辦法|無法|沒空|其他.*時段|其他.*時間|都不行|不方便/.test(userMessage)) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildAlternativeCard()] });
  }

  // 查詢直播 — 只匹配短訊息（明確想報名）或精確句型，長句交給 AI 分身
  if (
    (userMessage.length <= 6 && /直播|報名|預約|參加|上課|課程|講座/.test(userMessage)) ||
    /^(我要報名|我想報名|怎麼報名|想報名直播|有直播嗎|下一場直播|還有場次嗎)$/.test(userMessage)
  ) {
    if (sessions.length === 0) {
      return client.replyMessage({ replyToken: event.replyToken, messages: [{ type:'text', text:'目前尚無開放報名的直播場次，請稍後再試。' }] });
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildSessionCarousel(sessions)] });
  }

  // 身體問題 → Flex 卡片（給一半留一半，引導直播）
  if (/痠|痛|緊|僵|麻|不舒服|受傷|扭到|閃到/.test(userMessage)) {
    const bodyParts = { '腰': '腰', '背': '背', '肩': '肩頸', '頸': '肩頸', '脖': '肩頸', '膝': '膝蓋', '腳': '腳', '手': '手', '頭': '頭', '髖': '髖關節', '臀': '臀部' };
    let part = '';
    for (const [key, val] of Object.entries(bodyParts)) {
      if (userMessage.includes(key)) { part = val; break; }
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildBodyIssueCard(part)] });
  }

  // 通用介紹（你們是做什麼的、在哪裡、是什麼）
  if (/你們是|做什麼|是什麼|在哪|介紹一下|什麼學院|什麼課/.test(userMessage)) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildIntroCard()] });
  }

  // 檢查表/講義/資料相關 → 引導直播
  if (/檢查表|講義|資料|SOP|工具|表單|下載/.test(userMessage)) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: `這份檢查表是直播課的配套工具 📋\n\n上完直播就能領取完整版！\n先來直播聽 ${INSTRUCTOR_NAME} 老師講怎麼用，拿到才有用 👇` },
      ...(sessions.length > 0 ? [buildSessionCarousel(sessions)] : []),
    ]});
  }

  // 收費/價格/多少錢 → 引導直播
  if (/多少錢|收費|費用|價[格錢]|怎麼收/.test(userMessage)) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [
      { type: 'text', text: '有參加直播課的學員會有專屬優惠價格。\n\n我們的課程不是教你一招半式，是直接教你整個賽道怎麼打。先來直播感受一下，你就知道值不值得了 👇' },
      ...(sessions.length > 0 ? [buildSessionCarousel(sessions)] : [{ type: 'text', text: '目前沒有開放的直播場次，有新場次我會通知你！' }]),
    ]});
  }

  // 學不會/適不適合/零基礎 → 痛點卡片
  if (/學不會|學得會|適合|零基礎|沒經驗|沒基礎|怕|擔心/.test(userMessage)) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [buildCourseModules()] });
  }

  // 回頭率/客人不回來/客戶留不住 → 痛點卡片
  if (/回頭|不回來|留不住|不回訪|客人少|沒客人|客戶少/.test(userMessage)) {
    return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: OBJECTION_REPLIES['不確定適不適合我'] || '選一個你目前最大的卡點 👇' }, buildCourseModules()] });
  }

  // 定價/收入/賺錢 → 收入卡點
  if (/定價|收入|賺錢|時薪|客單價|怎麼收費|提高收入/.test(userMessage)) {
    const diagnosis = DIAGNOSIS_REPLIES['有技術但收入上不去'];
    if (diagnosis) return client.replyMessage({ replyToken: event.replyToken, messages: [diagnosis] });
  }

  // === AI 分身 Fallback：所有指令都沒匹配到時，用 AI 回覆 ===
  // 暫停模式：只擋 AI 分身，報名/按鈕/場次等功能正常運作
  if (process.env.BOT_PAUSE === 'true' && userId !== ADMIN_USER_ID) {
    console.log(`BOT_PAUSE: 擋住 AI 分身 ${userId}`);
    return Promise.resolve(null);
  }

  // 過濾不需要回覆的短句（確認語、招呼語、單字回應）
  const skipPatterns = /^(收到|好的?|OK|ok|嗯|喔|謝謝|感謝|了解|知道了|明白|沒問題|對|是的|好喔|好哦|好啊|哈哈|哈|👍|🙏|😊|😄|讚|棒|太好了|感恩|辛苦了|晚安|早安|午安|掰掰|bye|再見)$/i;
  if (skipPatterns.test(userMessage.trim())) {
    console.log(`跳過確認語: ${userMessage}`);
    return Promise.resolve(null);
  }
  if (aiClient && AVATAR_PROMPT) {
    try {
      // 判斷用戶身份：有完成上課或有報名意願 → 學員，否則 → 潛在客戶
      const isStudent = !!(appData.completions?.[userId] || appData.courseInterest?.[userId]?.confirmed);
      const modeHint = isStudent
        ? '\n\n【內部指令，絕對不要在回覆中提到：此用戶是學員，用溫暖引導的方式回覆，像師父帶徒弟。不要提「教練模式」「招募模式」這些詞。】'
        : '\n\n【內部指令，絕對不要在回覆中提到：此用戶是新朋友，用口語聊天方式回覆，像朋友在LINE聊天。不要提「教練模式」「招募模式」「系統提示」這些詞。】';

      const history = getChatHistory(userId);
      const res = await aiClient.chat.completions.create({
        model: 'claude-haiku-4-5',
        messages: [
          { role: 'system', content: AVATAR_PROMPT + modeHint },
          ...history,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 150,
      });
      const reply = res.choices?.[0]?.message?.content?.trim();
      if (reply) {
        addChatHistory(userId, 'user', userMessage);
        addChatHistory(userId, 'assistant', reply);
        console.log(`AI 分身回覆: ${userId} (${isStudent ? '學員' : '潛在客戶'}, 歷史${history.length}則)`);
        // 如果 AI 回覆包含「幫你問老師本人」，通知管理者
        if (/幫你問|老師本人|稍等一下/.test(reply)) {
          getClient().getProfile(userId).then(profile => {
            const displayName = profile.displayName || userId;
            return getClient().pushMessage({ to: ADMIN_USER_ID, messages: [
              { type: 'text', text: `🔔 AI 分身轉接真人\n用戶: ${displayName}\n訊息: ${userMessage}\n\nAI 回覆了「幫你問老師」，請手動跟進。` },
            ]});
          }).catch(e => console.error('轉接通知失敗:', e.message));
        }
        return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: reply }] });
      }
    } catch (e) {
      console.error('AI 分身失敗:', e.message);
    }
  }

  return Promise.resolve(null);
}

// === 啟動 ===
const BOOT_TIME = new Date().toISOString();
app.get('/health', (req, res) => {
  const uptime = Math.round(process.uptime());
  const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
  res.json({ status: 'ok', bootTime: BOOT_TIME, uptimeSeconds: uptime, memoryMB: mem });
});

const port = process.env.PORT || 3000;

(async () => {
  await initDB();
  appData = await loadData();
  if (!appData.registrations) appData.registrations = {};
  if (!appData.remarketing) appData.remarketing = {};
  if (!appData.bookings) appData.bookings = {};
  if (!appData.trackClicks) appData.trackClicks = [];
  if (!appData.userSources) appData.userSources = {};
  console.log('PostgreSQL 資料載入完成');

  app.listen(port, () => {
    console.log(`LINE Bot is running on port ${port}`);
    // 啟動時資料完整性檢查
    const compCount = Object.keys(appData.completions || {}).length;
    const regCount = Object.keys(appData.registrations || {}).length;
    const rmkCount = Object.keys(appData.remarketing || {}).length;
    console.log(`資料檢查: completions=${compCount}, registrations=${regCount}, remarketing=${rmkCount}`);
    restoreReminders();
  });
})();
