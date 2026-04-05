'use strict';

/**
 * Flex 卡片建構函式
 * 從 index.js 抽出的純函式，不依賴 appData、aiClient 等外部狀態。
 * 需要 COURSE_URL 的函式透過模組頂部的 init() 接收。
 */

// === 品牌配置（從環境變數讀取） ===
const BRAND_NAME = process.env.BRAND_NAME || '你的品牌';
const INSTRUCTOR_NAME = process.env.INSTRUCTOR_NAME || '老師';
const SYSTEM_NAME = process.env.SYSTEM_NAME || '你的課程';
const BOT_DOMAIN = process.env.BOT_DOMAIN || 'localhost:3000';
const COURSE_PRICE = parseInt(process.env.COURSE_PRICE || '49800');
const COURSE_ORIGINAL_PRICE = parseInt(process.env.COURSE_ORIGINAL_PRICE || '88800');
const INSTALLMENT_AMOUNT = parseInt(process.env.INSTALLMENT_AMOUNT || '3650');
const INSTALLMENT_MONTHS = parseInt(process.env.INSTALLMENT_MONTHS || '12');
const HERO_IMAGE_URL = process.env.HERO_IMAGE_URL || `https://${process.env.BOT_DOMAIN || 'localhost:3000'}/sop/hero.jpg`;
const COURSE_NAME = process.env.COURSE_NAME || '線上課程';
const COURSE_MODULES = process.env.COURSE_MODULES || '8大階段';
const COURSE_HOURS = process.env.COURSE_HOURS || '80+堂課程';
const BONUS_TEXT = process.env.BONUS_TEXT || '完課即送完整版檢查表';
const BONUS_VALUE = process.env.BONUS_VALUE || '3800';
const LINE_ADD_FRIEND_URL = process.env.LINE_ADD_FRIEND_URL || '';
const FULL_CHECKLIST_URL = process.env.FULL_CHECKLIST_URL || '';
const CHECKLIST_PREVIEW_URL = process.env.CHECKLIST_PREVIEW_URL || '';

function formatPrice(n) { return '$' + n.toLocaleString(); }

let COURSE_URL = '';

function init(courseUrl) {
  COURSE_URL = courseUrl;
}

const chineseMonths = { 1:'一',2:'二',3:'三',4:'四',5:'五',6:'六',7:'七',8:'八',9:'九',10:'十',11:'十一',12:'十二' };

// 把訊息裡的 COURSE_URL 替換成帶 userId 的版本
function injectUserId(msg, userId) {
  const str = JSON.stringify(msg);
  const replaced = str.replace(new RegExp(COURSE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `${COURSE_URL}?ref_line=${userId}`);
  return JSON.parse(replaced);
}

// 把 AI 產出的純文字轉成 LINE Flex 卡片
function textToFlex(text, waveKey, segment) {
  const colors = {
    wave1: '#284B8B', wave2: '#7B61AD', wave3: '#E8590C',
    wave4: '#C92A2A', wave5: '#7B61AD', wave6: '#1a1a1a',
  };
  const color = colors[waveKey] || '#284B8B';

  // 分割文字：第一行當標題，其餘當內文
  const lines = text.split('\n').filter(l => l.trim());
  const title = lines[0] || '追蹤訊息';
  const body = lines.slice(1).join('\n') || text;

  const bodyContents = [
    { type: 'text', text: body, size: 'sm', color: '#333333', wrap: true },
  ];

  // wave4-6 加上價格資訊
  if (['wave4', 'wave5', 'wave6'].includes(waveKey) && segment === 'attended') {
    bodyContents.push(
      { type: 'separator', margin: 'lg' },
      { type: 'text', text: `原價 ${formatPrice(COURSE_ORIGINAL_PRICE)}`, size: 'sm', color: '#999999', margin: 'lg', decoration: 'line-through' },
      { type: 'text', text: `早鳥價 ${formatPrice(COURSE_PRICE)}`, size: 'md', color: '#C92A2A', weight: 'bold', margin: 'sm' },
    );
  }

  const footerButtons = [];
  if (segment === 'attended' || segment === 'replay') {
    footerButtons.push({ type: 'button', action: { type: 'uri', label: '查看培訓方案', uri: COURSE_URL }, style: 'primary', color, height: 'sm' });
  }
  if (segment === 'absent') {
    footerButtons.push({ type: 'button', action: { type: 'message', label: '報名下一場直播', text: '報名' }, style: 'primary', color, height: 'sm' });
  }
  footerButtons.push({ type: 'button', action: { type: 'message', label: '我有問題想問', text: '我有問題想問' }, style: 'secondary', height: 'sm', margin: 'sm' });

  return {
    type: 'flex', altText: title.substring(0, 60),
    contents: {
      type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: color, paddingAll: '18px',
        contents: [{ type: 'text', text: title, color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: bodyContents },
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: footerButtons },
    },
  };
}

// === 提醒 Flex 卡片 ===
function buildReminderCard(countdown, s) {
  const mm = String(s.month).padStart(2, '0');
  const dd = String(s.day).padStart(2, '0');

  // 每個時間點不同內容
  const configs = {
    '24小時': {
      color: '#2B5797',
      title: '📅 明天就是直播課了！',
      body: [
        { type: 'text', text: `你報名的${SYSTEM_NAME}直播課明天就開始了`, weight: 'bold', size: 'md', color: '#1a1a1a', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `📅 ${mm}/${dd} ${s.time}`, size: 'sm', color: '#333333', margin: 'lg' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '💡 先想一個問題：', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'lg' },
        { type: 'text', text: '同樣的專業底子，為什麼有人收入普通，有人收入翻倍？', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '明天直播會告訴你答案 👇', size: 'sm', color: '#2B5797', weight: 'bold', margin: 'md', wrap: true },
      ],
    },
    '6小時': {
      color: '#E8590C',
      title: '⏰ 今天下午的直播別忘了！',
      body: [
        { type: 'text', text: '再過幾個小時就開始了', weight: 'bold', size: 'md', color: '#1a1a1a', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `📅 ${mm}/${dd} ${s.time}`, size: 'sm', color: '#333333', margin: 'lg' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '📋 今天你會學到：', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'lg' },
        { type: 'text', text: '• 為什麼同樣專業，有人收入普通有人翻倍', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '• 你的領域裡被忽略的真相', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '• 一套能串起所有技能的底層系統', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '80 分鐘，可能改變你接下來的職業方向。', size: 'sm', color: '#E8590C', weight: 'bold', margin: 'md', wrap: true },
      ],
    },
    '2小時': {
      color: '#C92A2A',
      title: '🔥 倒數 2 小時！',
      body: [
        { type: 'text', text: '直播課快要開始了，先把連結存好', weight: 'bold', size: 'md', color: '#1a1a1a', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `📅 ${mm}/${dd} ${s.time}`, size: 'sm', color: '#333333', margin: 'lg' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '✅ 準備好紙筆，邊聽邊記效果最好', size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '✅ 找個安靜的地方，全程專注 80 分鐘', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: `✅ ${BONUS_TEXT}（${formatPrice(parseInt(BONUS_VALUE))}）`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
      ],
    },
    '10分鐘': {
      color: '#C92A2A',
      title: '🚨 10 分鐘後開始！',
      body: [
        { type: 'text', text: '點下面按鈕直接進入直播 👇', weight: 'bold', size: 'lg', color: '#C92A2A', wrap: true },
        { type: 'text', text: `📅 ${mm}/${dd} ${s.time}`, size: 'sm', color: '#333333', margin: 'lg' },
      ],
    },
  };

  const cfg = configs[countdown] || configs['10分鐘'];

  return {
    type: 'flex', altText: cfg.title,
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: cfg.color, paddingAll: '18px',
        contents: [{ type: 'text', text: cfg.title, color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: cfg.body },
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'uri', label: '🔗 開啟直播連結', uri: s.link }, style: 'primary', color: '#FF0000', height: 'sm' },
      ]},
    },
  };
}

// === 報名確認卡片（24小時後推送）===
function buildEnrollCheckCard() {
  return { type: 'flex', altText: '你完成報名了嗎？',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '18px',
        contents: [{ type: 'text', text: '👋 嗨，想確認一下', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: `你昨天說想加入${SYSTEM_NAME}系統`, size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '完成報名了嗎？', size: 'md', color: '#1a1a1a', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `⏰ 提醒你：直播限定價 ${formatPrice(COURSE_PRICE)} 即將截止`, size: 'sm', color: '#C92A2A', weight: 'bold', margin: 'lg', wrap: true },
        { type: 'text', text: `截止後恢復原價 ${formatPrice(COURSE_ORIGINAL_PRICE)}，差了將近 ${Math.round((COURSE_ORIGINAL_PRICE - COURSE_PRICE) / 10000)} 萬`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '✅ 我已完成報名', text: '我已完成報名' }, style: 'primary', color: '#27ACB2', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '😅 報名遇到問題', text: '報名遇到問題' }, style: 'secondary', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '🤔 我再想想', text: '我再想想' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

// === 未完課補課提醒 ===
function buildCatchUpMessage(waveKey, s) {
  const mm = String(s.month).padStart(2, '0');
  const dd = String(s.day).padStart(2, '0');

  if (waveKey === 'wave1') {
    // +2h：回放連結 + 48 小時限時
    return { type: 'flex', altText: '📺 直播錄影已上線，48小時內觀看',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#E8590C', paddingAll: '18px',
          contents: [{ type: 'text', text: '📺 直播錄影已上線！', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '你報名的直播課已經結束了', size: 'sm', color: '#333333', wrap: true },
          { type: 'text', text: '錄影只開放 48 小時，把握時間觀看 👇', size: 'sm', color: '#E8590C', weight: 'bold', margin: 'md', wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '這場 80 分鐘你會學到：', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'lg' },
          { type: 'text', text: '• 同樣專業，收入普通和翻倍差在哪', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'text', text: '• 你的領域裡被忽略的真相', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'text', text: '• 一套串起所有技能的底層系統', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: `🎁 ${BONUS_TEXT}（${formatPrice(parseInt(BONUS_VALUE))}）`, size: 'sm', color: '#27ACB2', weight: 'bold', margin: 'lg', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '▶️ 立即觀看（48小時後下架）', uri: s.link }, style: 'primary', color: '#E8590C', height: 'sm' },
        ]},
      },
    };
  }

  if (waveKey === 'wave2') {
    // D+1（未到課）：直播 takeaway + 報名下一場
    return { type: 'flex', altText: '📋 上次直播，大家學到了什麼？',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#1A6B63', paddingAll: '18px',
          contents: [{ type: 'text', text: '📋 上次直播，大家學到了什麼？', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '參加的學員說收穫最大的 3 件事：', size: 'sm', color: '#333333', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '①「原來表面的問題不是真正的源頭」', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
          { type: 'text', text: '一直處理表面症狀還是反覆發生？因為問題可能在別的地方。學會判斷源頭，一次就讓客戶感受到差別。', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '②「框架不同，收入差 5 倍」', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
          { type: 'text', text: '收入高低的差別不是技術，是有沒有一套系統讓客戶看懂你的價值。', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '③「分開學要 10-18 萬，這裡一次整合」', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
          { type: 'text', text: `外面分開學六門課，${SYSTEM_NAME}一套搞定。`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'message', label: '📅 報名下一場直播', text: '報名' }, style: 'primary', color: '#1A6B63', height: 'sm' },
          { type: 'button', action: { type: 'uri', label: '▶️ 看回放錄影', uri: s.link }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }

  if (waveKey === 'wave3') {
    // D+2（未到課）：痛點提醒 + 引導補看直播或報名下一場
    return { type: 'flex', altText: '💭 你當初為什麼會想來聽直播？',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#2B5797', paddingAll: '18px',
          contents: [{ type: 'text', text: '💭 你當初為什麼想來聽直播？', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '一定是有某個痛點還沒解決：', size: 'sm', color: '#333333', wrap: true },
          { type: 'text', text: '• 專業不差，但收入卡在那裡\n• 學了很多課，還是不會判斷問題\n• 想獨立發展，但不知道從哪開始\n• 做到累死，客戶還是覺得差不多', size: 'sm', color: '#555555', margin: 'md', wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '直播課就是要告訴你，這些痛點可以怎麼被解決。', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'lg', wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '先來聽一次直播，80 分鐘就能知道你卡在哪、該怎麼走。', size: 'sm', color: '#333333', margin: 'lg', wrap: true },
          { type: 'text', text: '這是最後一次提醒，之後不會再打擾了 🙏', size: 'sm', color: '#999999', margin: 'lg', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '▶️ 補看直播錄影', uri: s.link }, style: 'primary', color: '#2B5797', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '📅 報名下一場直播', text: '報名' }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }

  // 未到課版只發 wave1、wave3、wave5，其他返回 null
  return null;

}

// === 再行銷 Flex 卡片 ===
function buildWaveMessage(waveKey, s) {
  const mm = String(s.month).padStart(2, '0');
  const dd = String(s.day).padStart(2, '0');

  if (waveKey === 'wave1') {
    // 第一波：痛點診斷切入，不是問「喜歡什麼」而是問「你卡在哪」
    return { type: 'flex', altText: '🎉 感謝參加直播！你目前最大的卡點是？',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '18px',
          contents: [{ type: 'text', text: '🎉 感謝你今天參加直播！', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: `直播裡${INSTRUCTOR_NAME}提到，大部分學員都卡在某個關鍵點上。`, size: 'sm', color: '#333333', wrap: true },
          { type: 'text', text: '你目前最大的卡點是什麼？', weight: 'bold', size: 'md', color: '#1a1a1a', margin: 'md', wrap: true },
          { type: 'text', text: '選一個最符合你現況的，我告訴你怎麼突破 👇', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'message', label: '👁️ 看不懂客戶問題在哪', text: '看不懂客戶問題在哪' }, style: 'primary', color: '#284B8B', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '😩 會放鬆但效果不持久', text: '會放鬆但效果不持久' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
          { type: 'button', action: { type: 'message', label: '💰 有技術但收入上不去', text: '有技術但收入上不去' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
          { type: 'button', action: { type: 'message', label: '➕ 想增加服務項目', text: '想增加服務項目' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
          { type: 'button', action: { type: 'message', label: '🚀 想單飛但不知怎麼開始', text: '想單飛不知怎麼開始' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          { type: 'button', action: { type: 'message', label: '✅ 完成上課，領取完整檢查表', text: '777' }, style: 'primary', color: '#27ACB2', height: 'sm', margin: 'sm' },
          { type: 'button', action: { type: 'message', label: '📞 預約一對一諮詢', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }

  if (waveKey === 'wave2') {
    // 第二波：你現在學這些要花多少？（中立對比）
    return { type: 'flex', altText: '📊 一個數據讓你自己判斷',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#2B5797', paddingAll: '18px',
          contents: [{ type: 'text', text: '📊 學這些技術，外面要花多少？', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: `${SYSTEM_NAME}整合了 6 大領域：`, size: 'sm', color: '#333333', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '• 領域一 → 外面學 $30,000~60,000', size: 'sm', color: '#555555', margin: 'md', wrap: true },
          { type: 'text', text: '• 領域二 → 外面學 $20,000~40,000', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'text', text: '• 領域三 → 外面學 $30,000~50,000', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'text', text: '• 領域四 → 外面學 $15,000~30,000', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'text', text: '• 服務流程設計 → 外面幾乎沒人教', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'text', text: '• 品牌與定價策略 → 外面幾乎沒人教', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '分開學：$100,000 ~ $180,000+', size: 'sm', color: '#999999', margin: 'md', wrap: true },
          { type: 'text', text: `${SYSTEM_NAME}系統：一次整合，還包含線下實作`, size: 'sm', color: '#2B5797', weight: 'bold', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '不是便宜，是省掉你繞路的時間和學費。', size: 'sm', color: '#333333', margin: 'md', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'message', label: '了解完整課程內容', text: '課程內容有哪些' }, style: 'primary', color: '#2B5797', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '我有問題想問', text: '我有問題想問' }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }

  if (waveKey === 'wave3') {
    // 第三波：不同起點的學員，同樣的突破
    return { type: 'flex', altText: '📋 3 個不同背景的學員，同一套系統',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#1A6B63', paddingAll: '18px',
          contents: [{ type: 'text', text: '📋 3 個真實案例，讓數字說話', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '案例 ① 零基礎入門', weight: 'bold', size: 'sm', color: '#1a1a1a' },
          { type: 'text', text: '完全沒有相關背景。3 個月後獨立接案，月收入大幅成長。', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '案例 ② 現職從業者', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
          { type: 'text', text: '整合新技能進服務流程，單價大幅提升。獨立開工作室，客戶穩定成長。', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '案例 ③ 資深從業者', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
          { type: 'text', text: `花了大量學費學各種技術，還是在別人的店上班。學完${SYSTEM_NAME}後，3 個月開了自己的工作室。`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '背景不同，但都用同一套系統突破。\n差別不是天賦，是方法。', size: 'sm', color: '#1A6B63', weight: 'bold', margin: 'md', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '了解培訓方案', uri: COURSE_URL }, style: 'primary', color: '#1A6B63', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '📞 想先跟老師聊聊', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }

  if (waveKey === 'wave4') {
    // 第四波：算一筆帳（投資回報中立分析）
    return { type: 'flex', altText: '🧮 幫你算一筆帳',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#2B5797', paddingAll: '18px',
          contents: [{ type: 'text', text: '🧮 幫你算一筆帳', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '假設你現在時薪 $600：', size: 'sm', color: '#333333', wrap: true },
          { type: 'text', text: '月收 10 萬 = 每月做 167 小時', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '學完後時薪提升到 $2,000：', size: 'sm', color: '#333333', margin: 'md', wrap: true },
          { type: 'text', text: '月收 10 萬 = 每月只做 50 小時', size: 'sm', color: '#2B5797', weight: 'bold', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '省下 117 小時/月，多出來的時間可以：', size: 'sm', color: '#333333', margin: 'md', wrap: true },
          { type: 'text', text: '• 接更多客戶提高收入\n• 陪家人、休息、進修\n• 不再為了營業額犧牲身體', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `課程費用 ${formatPrice(COURSE_PRICE)}，分 ${INSTALLMENT_MONTHS} 期每月 ${formatPrice(INSTALLMENT_AMOUNT)}。\n學完多接 2 位客戶就回本了。`, size: 'sm', color: '#333333', margin: 'md', wrap: true },
          { type: 'text', text: '這不是花錢，是把學費轉換成收入。', size: 'sm', color: '#2B5797', weight: 'bold', margin: 'sm', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '查看培訓方案', uri: COURSE_URL }, style: 'primary', color: '#2B5797', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '我還有疑問', text: '我有問題想問' }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }

  if (waveKey === 'wave5') {
    // 第五波：為什麼一套系統比十堂課有效
    return { type: 'flex', altText: '🔍 為什麼一套系統比十堂課有效',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#1A6B63', paddingAll: '18px',
          contents: [{ type: 'text', text: '🔍 為什麼學了很多課，還是卡住？', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '很多學員的學習路徑是這樣的：', size: 'sm', color: '#333333', wrap: true },
          { type: 'text', text: '課程A → 課程B → 課程C → 課程D → 行銷課...', size: 'sm', color: '#999999', margin: 'sm', wrap: true },
          { type: 'text', text: '每一堂都學到東西，但串不起來。', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '問題不是你學得不夠多，\n是沒有一套底層邏輯把它們整合。', size: 'sm', color: '#1A6B63', weight: 'bold', margin: 'md', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: `${SYSTEM_NAME}不是「另一堂技術課」。`, size: 'sm', color: '#333333', margin: 'md', wrap: true },
          { type: 'text', text: '它是一套作業系統 —— 讓你過去學的所有東西都能整合運作。', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '從判斷問題 → 處理問題 → 讓客戶理解你的價值 → 願意持續回來。', size: 'sm', color: '#333333', margin: 'md', wrap: true },
          { type: 'text', text: '這整條路，一次打通。', size: 'sm', color: '#1A6B63', weight: 'bold', margin: 'sm', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '了解完整系統', uri: COURSE_URL }, style: 'primary', color: '#1A6B63', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '📞 跟老師聊聊我的狀況', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }

  if (waveKey === 'wave6') {
    // 第六波：你不一定要報名，但值得想清楚一件事
    return { type: 'flex', altText: '💭 最後想跟你分享一件事',
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#333333', paddingAll: '18px',
          contents: [{ type: 'text', text: '💭 最後跟你分享一件事', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '你不一定要報名這個課程。', size: 'sm', color: '#333333', wrap: true },
          { type: 'text', text: '但有一件事值得想清楚：', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '一年後的你，\n會因為今天做了什麼決定而不同？', size: 'md', color: '#1a1a1a', weight: 'bold', margin: 'md', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '繼續一堂一堂分開學，花 10 萬+ 和好幾年摸索。', size: 'sm', color: '#999999', margin: 'md', wrap: true },
          { type: 'text', text: '或者用一套已經驗證過的系統，直接走最短的路。', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '這是最後一次提醒，之後不會再打擾了。\n祝你不管選擇什麼，都越來越好 🙏', size: 'sm', color: '#999999', margin: 'md', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'uri', label: '查看培訓方案', uri: COURSE_URL }, style: 'primary', color: '#2B5797', height: 'sm' },
          { type: 'button', action: { type: 'message', label: '📞 先跟老師聊聊', text: '預約一對一諮詢' }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    };
  }
}

// === 再行銷分支回覆 ===
function buildBranchA() {
  return [
    { type: 'image', originalContentUrl: HERO_IMAGE_URL, previewImageUrl: HERO_IMAGE_URL },
    { type: 'flex', altText: `${SYSTEM_NAME}：核心概念`,
      contents: { type: 'bubble',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#1A6B63', paddingAll: '18px',
          contents: [{ type: 'text', text: '🧠 核心概念', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
        body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
          { type: 'text', text: '你以為問題在表面？', size: 'sm', color: '#333333', wrap: true },
          { type: 'text', text: '其實根源在更深的地方。', size: 'md', color: '#1A6B63', weight: 'bold', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '傳統認知', size: 'sm', color: '#8B7355', weight: 'bold', margin: 'lg' },
          { type: 'text', text: '頭痛醫頭、腳痛醫腳，處理完很快又復發。', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: `${SYSTEM_NAME}`, size: 'sm', color: '#1A6B63', weight: 'bold', margin: 'lg' },
          { type: 'text', text: '找到真正的源頭，從根本解決，效果持久。', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: '這就是為什麼有些學員做一次，客戶就覺得「跟外面完全不一樣」。', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'lg', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
          { type: 'button', action: { type: 'message', label: '📅 報名免費直播課', text: '報名' }, style: 'primary', color: '#1A6B63', height: 'sm' },
          { type: 'button', action: { type: 'message', label: `📋 我想了解${COURSE_NAME}`, text: `了解${SYSTEM_NAME}系統` }, style: 'secondary', height: 'sm', margin: 'sm' },
        ]},
      },
    },
  ];
}

function buildBranchB() {
  return { type: 'flex', altText: '真實學員改變見證',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '18px',
        contents: [{ type: 'text', text: '🔥 真實的改變見證', color: '#FFFFFF', size: 'md', weight: 'bold' }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '🔥 案例一：現職從業者', weight: 'bold', size: 'sm', color: '#1a1a1a' },
        { type: 'text', text: '→ 整合新技能後，單價大幅提升，收入翻倍', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'md' },
        { type: 'text', text: '🔥 案例二：零基礎轉職', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
        { type: 'text', text: '→ 3個月獲取近20位陌生客，獨立接案', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'md' },
        { type: 'text', text: '🔥 案例三：跨領域轉職', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
        { type: 'text', text: '→ 起步即高單價，月收入大幅成長', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'md' },
        { type: 'text', text: '🔥 案例四：資深從業者', weight: 'bold', size: 'sm', color: '#1a1a1a', margin: 'md' },
        { type: 'text', text: '→ 上課3個月後開了自己的工作室', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '他們跟你一樣，都是從「想改變」這一步開始的。', size: 'sm', color: '#333333', margin: 'lg', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '我也想開始改變', text: '我想了解課程怎麼報名' }, style: 'primary', color: '#284B8B', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '我的情況不太一樣', text: '我需要再想想' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

// buildCourseIntroCard 已整合進 buildCourseModules
function buildCourseIntroCard() { return buildCourseModules(); }

function buildBranchC() {
  return { type: 'flex', altText: `${SYSTEM_NAME}系統${COURSE_NAME}`,
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
        contents: [{ type: 'text', text: `📋 ${SYSTEM_NAME}系統${COURSE_NAME}`, color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: `✅ ${COURSE_HOURS}線上課程無限看`, size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '✅ 線上+線下實作培訓', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
        { type: 'text', text: '✅ 整合多種核心技術', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
        { type: 'text', text: '✅ 一對一個別諮詢', size: 'sm', color: '#333333', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `原價 ${formatPrice(COURSE_ORIGINAL_PRICE)}`, size: 'sm', color: '#999999', margin: 'lg', decoration: 'line-through' },
        { type: 'text', text: `🔥 限時直播價 ${formatPrice(COURSE_PRICE)}`, size: 'lg', color: '#C92A2A', weight: 'bold', margin: 'sm' },
        { type: 'text', text: `📌 可分3/6/${INSTALLMENT_MONTHS}期零利率（每月最低${formatPrice(INSTALLMENT_AMOUNT)}）`, size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '接1位客戶就回本！', size: 'sm', color: '#E8590C', weight: 'bold', margin: 'sm' },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'uri', label: `🔥 立即報名 ${formatPrice(COURSE_PRICE)}`, uri: COURSE_URL }, style: 'primary', color: '#C92A2A', height: 'sm' },
        { type: 'button', action: { type: 'uri', label: `💳 分${INSTALLMENT_MONTHS}期零利率（${formatPrice(INSTALLMENT_AMOUNT)}/月）`, uri: COURSE_URL }, style: 'primary', color: '#E8590C', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '💬 我還有問題想問', text: '我有問題想問' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

function buildBranchD() {
  return { type: 'flex', altText: '完全理解，讓我問你一個問題',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#7B61AD', paddingAll: '18px',
        contents: [{ type: 'text', text: '🤔 完全理解，這是重要的決定', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '不過讓我問你一個問題：', size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '如果半年後你的收入、工時、客戶狀況都跟現在一樣，你能接受嗎？', size: 'md', color: '#1a1a1a', weight: 'bold', margin: 'lg', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '很多學員告訴我，他們最後悔的不是報名，而是太晚開始。', size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '你現在最大的猶豫是什麼？', size: 'sm', color: '#333333', margin: 'md', weight: 'bold', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '💰 價格考量', text: '價格考量' }, style: 'primary', color: '#7B61AD', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '😟 怕線上學不會', text: '怕線上學不會' }, style: 'primary', color: '#7B61AD', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '🤷 不確定適不適合', text: '不確定適不適合我' }, style: 'primary', color: '#7B61AD', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '⏰ 時間不夠', text: '時間不夠' }, style: 'primary', color: '#7B61AD', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

function buildCourseModules() {
  return { type: 'flex', altText: `${SYSTEM_NAME}系統 — ${COURSE_NAME}完整路徑`,
    contents: { type: 'bubble',
      hero: { type: 'image', url: HERO_IMAGE_URL, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: `${SYSTEM_NAME}系統`, size: 'lg', color: '#1a1a1a', weight: 'bold' },
        { type: 'text', text: `${SYSTEM_NAME}的核心理念，帶你建立完整的解決方案。`, size: 'sm', color: '#284B8B', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `${COURSE_NAME} · ${COURSE_MODULES}：`, size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'lg' },
        { type: 'text', text: '看懂問題 → 找到根源 → 基礎處理 → 進階調整 → 建立彈性 → 抓住核心 → 整合應用 → 服務變現', size: 'sm', color: '#284B8B', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '你目前最大的卡點是什麼？👇', size: 'sm', color: '#333333', weight: 'bold', margin: 'lg', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '👁️ 看不懂客戶問題在哪', text: '看不懂客戶問題在哪' }, style: 'primary', color: '#284B8B', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '😩 會放鬆但效果不持久', text: '會放鬆但效果不持久' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '💰 有技術但收入上不去', text: '有技術但收入上不去' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '➕ 想增加服務項目', text: '想增加服務項目' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '🚀 想單飛但不知怎麼開始', text: '想單飛不知怎麼開始' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'separator', margin: 'lg' },
        { type: 'button', action: { type: 'message', label: '📺 先看免費直播', text: '我想報名直播' }, style: 'primary', color: '#C92A2A', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

// 痛點診斷回覆
const DIAGNOSIS_REPLIES = {
  '看不懂客戶問題在哪': {
    type: 'flex', altText: '你需要的是「看懂問題」的能力',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '18px',
        contents: [{ type: 'text', text: '👁️ 你缺的不是技術，是「看懂問題」的能力', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '很多學員做了好幾年，還是靠「客戶說哪裡有問題就處理哪裡」。', size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '但真正的高手，是客戶還沒開口，你就知道問題在哪。', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '在課程的前兩個階段，我們會帶你：', size: 'sm', color: '#1a1a1a', margin: 'lg', weight: 'bold' },
        { type: 'text', text: '📌「看得懂問題」— 建立你的判斷邏輯與分析能力', size: 'sm', color: '#555555', margin: 'md', wrap: true },
        { type: 'text', text: '📌「找得到根源」— 學會從表象找出真正的問題來源', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `而這只是${COURSE_MODULES}的起點，後面還有處理、進階、整合、實戰應用...一步步帶你從「看懂」走到「做到」。`, size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '當你能看懂問題，客戶會說：「你跟別人完全不一樣。」', size: 'sm', color: '#E8590C', margin: 'md', weight: 'bold', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '📺 先看免費直播', text: '我想報名直播' }, style: 'primary', color: '#284B8B', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '我還有其他卡點', text: '課程內容有哪些' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  },
  '會放鬆但效果不持久': {
    type: 'flex', altText: '效果不持久的真正原因',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
        contents: [{ type: 'text', text: '😩 效果不持久？因為你只做了一半', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '處理完，客戶當下覺得有效，但隔天又回來了。因為你只「處理」了，卻沒有「建」回來。', size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '課程中間四個階段，就是在解決這件事：', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '📌「基礎處理」— 被動式處理技術', size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '📌「進階調整」— 進階處理技術', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '📌「建立彈性」— 動作訓練與彈性恢復', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '📌「抓住核心」— 壓力釋放與核心整合', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `這四步缺一不可。而課程前面還有「判斷」的基礎，後面還有「實戰整合」跟「服務變現」，一共${COURSE_MODULES}幫你建立完整的能力。`, size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '學會完整流程，客戶效果持久、主動回頭、幫你轉介紹。', size: 'sm', color: '#E8590C', margin: 'md', weight: 'bold', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '📺 先看免費直播', text: '我想報名直播' }, style: 'primary', color: '#27ACB2', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '我還有其他卡點', text: '課程內容有哪些' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  },
  '有技術但收入上不去': {
    type: 'flex', altText: '有技術但收入卡住的原因',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#E8590C', paddingAll: '18px',
        contents: [{ type: 'text', text: '💰 技術很好但收入卡住？', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: `${INSTRUCTOR_NAME}的一位學員，$3,000的技術只收$600，預約爆滿但工時12小時，完全沒生活品質。`, size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '技術好 ≠ 收入好。差別在於你有沒有「變現」的能力。', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '課程最後兩個階段專門解決這個問題：', size: 'sm', color: '#1a1a1a', margin: 'lg', weight: 'bold' },
        { type: 'text', text: '📌「進階應用」— 學會整合流程與服務延伸，讓客戶主動回訪和轉介紹', size: 'sm', color: '#555555', margin: 'md', wrap: true },
        { type: 'text', text: '📌「服務變現」— 定價策略、品牌定位、從副業到開工作室的完整路徑', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '當然，變現的前提是你的技術真的能讓客戶感受到差異。所以前面6個階段會先幫你打好「看得懂、處理得了、調整得動、建立得起」的底子。', size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '學員實證：從業者學完後單價大幅提升，收入翻倍', size: 'sm', color: '#E8590C', margin: 'md', weight: 'bold', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '📺 先看免費直播', text: '我想報名直播' }, style: 'primary', color: '#E8590C', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '我還有其他卡點', text: '課程內容有哪些' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  },
  '想增加服務項目': {
    type: 'flex', altText: '想增加服務項目？整合才是關鍵',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#27ACB2', paddingAll: '18px',
        contents: [{ type: 'text', text: '➕ 想增加服務項目？關鍵在「整合」', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '很多學員想增加項目，第一念頭是「再去學一個新技術」。但學了十幾種，服務還是一樣的模式。', size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: '真正的升級，不是學更多技法，是學會把現有的能力「整合」成新服務。', size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `課程${COURSE_MODULES}涵蓋了多種不同技術。重點不是一個個學完，而是在「進階應用」階段學會怎麼整合它們，變成你獨有的服務：`, size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '🧒 針對不同族群的專屬服務方案', size: 'sm', color: '#555555', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '別人在紅海裡拼價格，你在藍海提供「更好的解決方案」。', size: 'sm', color: '#27ACB2', margin: 'lg', weight: 'bold', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '📺 先看免費直播', text: '我想報名直播' }, style: 'primary', color: '#27ACB2', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '我還有其他卡點', text: '課程內容有哪些' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  },
  '想單飛不知怎麼開始': {
    type: 'flex', altText: '想單飛創業？你需要完整的路徑',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#7B61AD', paddingAll: '18px',
        contents: [{ type: 'text', text: '🚀 想單飛？你需要的不只是技術', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '技術到位了，但一想到自己出來開業就卡住：客戶哪裡來？怎麼定價？如何經營？', size: 'sm', color: '#333333', wrap: true },
        { type: 'text', text: `${SYSTEM_NAME}系統${COURSE_MODULES}，前面教你技術，後面教你怎麼把技術變成事業。`, size: 'sm', color: '#1a1a1a', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '最後一個階段「整合應用與服務變現」會帶你走過：', size: 'sm', color: '#1a1a1a', margin: 'lg', weight: 'bold' },
        { type: 'text', text: '📌 客戶從哪裡來 — 口碑循環與陌生開發', size: 'sm', color: '#555555', margin: 'md', wrap: true },
        { type: 'text', text: '📌 怎麼定價 — 定價策略與服務分層設計', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '📌 如何被看見 — 品牌形象與自媒體定位', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'text', text: '📌 怎麼開始 — 從副業到工作室的創業路徑', size: 'sm', color: '#555555', margin: 'sm', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '當然，前面的階段打好的技術底子，才是你單飛的底氣。', size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '學員實證：資深從業者 → 3個月後開了自己的工作室', size: 'sm', color: '#7B61AD', margin: 'md', weight: 'bold', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '📺 先看免費直播', text: '我想報名直播' }, style: 'primary', color: '#7B61AD', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '我還有其他卡點', text: '課程內容有哪些' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  },
};

function buildQACard() {
  return { type: 'flex', altText: '常見問題',
    contents: { type: 'bubble',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#284B8B', paddingAll: '18px',
        contents: [{ type: 'text', text: '❓ 請問你想了解哪方面？', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true }] },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: '選擇你最想知道的，我來為你解答：', size: 'sm', color: '#333333', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '💰 價格 / 付款方式', text: '價格考量' }, style: 'primary', color: '#284B8B', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '📱 線上學得會嗎？', text: '怕線上學不會' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '🤔 適不適合我？', text: '不確定適不適合我' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '⏰ 時間安排', text: '時間不夠' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '📋 課程內容 / 報名方式', text: '我想了解課程怎麼報名' }, style: 'primary', color: '#284B8B', height: 'sm', margin: 'sm' },
        { type: 'button', action: { type: 'message', label: '💬 其他問題（請直接留言）', text: '其他問題' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

// 身體問題通用回覆卡片（含圖片）
function buildBodyIssueCard(bodyPart) {
  return { type: 'flex', altText: `身體問題？${SYSTEM_NAME}帶你找源頭`,
    contents: { type: 'bubble',
      hero: { type: 'image', url: HERO_IMAGE_URL, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: `${bodyPart ? bodyPart + '不舒服' : '身體痠痛'}？問題可能不在你以為的地方`, size: 'md', color: '#1a1a1a', weight: 'bold', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '表面的問題通常不是源頭。一直處理症狀，當然反覆。', size: 'sm', color: '#555555', margin: 'lg', wrap: true },
        { type: 'text', text: '找到真正的源頭才能根本解決。', size: 'sm', color: '#1A6B63', weight: 'bold', margin: 'md', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '📅 免費直播講完整邏輯', text: '報名' }, style: 'primary', color: '#1A6B63', height: 'sm' },
        { type: 'button', action: { type: 'message', label: `🧠 先了解${SYSTEM_NAME}`, text: `了解${SYSTEM_NAME}系統` }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

// 「你們是做什麼的」通用介紹卡片
function buildIntroCard() {
  return { type: 'flex', altText: `${BRAND_NAME} — ${SYSTEM_NAME}系統`,
    contents: { type: 'bubble',
      hero: { type: 'image', url: HERO_IMAGE_URL, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
      body: { type: 'box', layout: 'vertical', paddingAll: '18px', contents: [
        { type: 'text', text: BRAND_NAME, size: 'lg', color: '#1a1a1a', weight: 'bold' },
        { type: 'text', text: '不是教技術，是教你看懂問題的作業系統', size: 'sm', color: '#284B8B', weight: 'bold', margin: 'md', wrap: true },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: `${INSTRUCTOR_NAME}多年跨領域經驗提煉出「${SYSTEM_NAME}」，${COURSE_NAME} ${COURSE_MODULES}，從看懂問題走到服務變現。`, size: 'sm', color: '#555555', margin: 'lg', wrap: true },
      ]},
      footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
        { type: 'button', action: { type: 'message', label: '📅 報名免費直播課', text: '報名' }, style: 'primary', color: '#284B8B', height: 'sm' },
        { type: 'button', action: { type: 'message', label: '📋 課程內容有哪些', text: '課程內容有哪些' }, style: 'secondary', height: 'sm', margin: 'sm' },
      ]},
    },
  };
}

// 異議處理回覆
const OBJECTION_REPLIES = {
  '價格考量': `完全理解！讓我幫你算一筆帳：\n\n課程分${INSTALLMENT_MONTHS}期，每月只要 ${formatPrice(INSTALLMENT_AMOUNT)}\n你只要每月多接1位客戶就完全回本\n\n而學員平均客單價提升到 $1,300-$2,000\n等於接2-3位客戶就超過月付金額了\n\n這不是花錢，是投資自己的賺錢能力 💪`,
  '怕線上學不會': `${SYSTEM_NAME}系統不只是線上影片：\n\n✅ ${COURSE_HOURS}線上課程可無限回看\n✅ 線下實體培訓手把手教\n✅ 一對一個別諮詢\n✅ 遇到問題隨時問\n\n很多學員是零基礎開始的，3個月就能獨立接案。學習方式不是問題，行動力才是 🔥`,
  '不確定適不適合我': `${SYSTEM_NAME}適合：\n\n✅ 從業者想增加收入\n✅ 專業人士想增加服務項目\n✅ 想學一技之長轉職就業\n✅ 想開工作室找不到方向\n✅ 客戶量上不去、留不住\n\n不適合的是：不想努力、不想動腦的人。\n\n你願意為改變付出90天的努力嗎？如果答案是「願意」，那你就適合 💪`,
  '時間不夠': `線上課程可以隨時看，不限時間不限次數\n實體培訓會安排在週末，不影響工作\n\n而且學會之後，你的工時反而會減少——\n${INSTRUCTOR_NAME}現在每天只工作2小時\n\n投資90天，換來的是未來的時間自由 ⏰\n\n現在覺得沒時間，是因為你還在用舊方式工作。`,
};

// === Flex 卡片 ===
function buildSessionCarousel(sessions) {
  const bubbles = sessions.map(s => {
    const mm = String(s.month).padStart(2,'0'), dd = String(s.day).padStart(2,'0');
    return { type:'bubble', size:'kilo',
      header: { type:'box', layout:'vertical', backgroundColor:'#284B8B', paddingAll:'15px',
        contents:[{ type:'text', text:'📺 直播場次', color:'#FFFFFF', size:'sm', weight:'bold' }] },
      body: { type:'box', layout:'vertical', paddingAll:'15px', contents:[
        { type:'text', text:`${mm}/${dd}（${chineseMonths[s.month]}月${s.day}日）`, weight:'bold', size:'lg', color:'#1a1a1a' },
        { type:'box', layout:'horizontal', margin:'lg', contents:[
          { type:'text', text:'⏰', size:'sm', flex:0 }, { type:'text', text:s.time, size:'sm', color:'#555555', margin:'sm' }]},
        { type:'box', layout:'horizontal', margin:'md', contents:[
          { type:'text', text:'📍', size:'sm', flex:0 }, { type:'text', text:'YouTube 直播', size:'sm', color:'#555555', margin:'sm' }]},
      ]},
      footer: { type:'box', layout:'vertical', paddingAll:'15px', contents:[
        { type:'button', action:{ type:'message', label:'我要報名此場次', text:`${mm}${dd}` }, style:'primary', color:'#284B8B', height:'sm' }] },
    };
  });
  // 最後加一張「都不行」卡片
  bubbles.push({ type: 'bubble', size: 'kilo',
    header: { type: 'box', layout: 'vertical', backgroundColor: '#7B61AD', paddingAll: '15px',
      contents: [{ type: 'text', text: '😕 以上時間都不行？', color: '#FFFFFF', size: 'sm', weight: 'bold' }] },
    body: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
      { type: 'text', text: '沒關係！', weight: 'bold', size: 'lg', color: '#1a1a1a' },
      { type: 'text', text: '點擊下方按鈕，我們提供其他選擇給你', size: 'sm', color: '#555555', margin: 'md', wrap: true },
    ]},
    footer: { type: 'box', layout: 'vertical', paddingAll: '15px', contents: [
      { type: 'button', action: { type: 'message', label: '時間都不行', text: '時間都不行' }, style: 'primary', color: '#7B61AD', height: 'sm' },
    ]},
  });
  return { type:'flex', altText:'請選擇直播場次報名', contents:{ type:'carousel', contents:bubbles } };
}

function buildConfirmCard(s) {
  const checklistUrl = CHECKLIST_PREVIEW_URL || `https://${BOT_DOMAIN}/sop/preview.html`;
  const mm = String(s.month).padStart(2,'0'), dd = String(s.day).padStart(2,'0');
  return { type:'flex', altText:`${SYSTEM_NAME}直播課 ${mm}/${dd} 報名成功！`,
    contents: { type:'bubble',
      header: { type:'box', layout:'vertical', backgroundColor:'#27ACB2', paddingAll:'18px',
        contents:[{ type:'text', text:'✅ 報名成功', color:'#FFFFFF', size:'lg', weight:'bold' }] },
      body: { type:'box', layout:'vertical', paddingAll:'18px', contents:[
        { type:'text', text:`${SYSTEM_NAME}直播課`, size:'md', color:'#555555', weight:'bold' },
        { type:'text', text:`${mm}/${dd} ${s.time}`, weight:'bold', size:'xl', color:'#1a1a1a', margin:'sm' },
        { type:'separator', margin:'lg' },
        { type:'text', text:'📌 請將時間記錄到行事曆提醒自己', size:'sm', color:'#333333', margin:'lg', wrap:true },
        { type:'text', text:'✅ 若臨時有事無法參加，請提前告知，我們會協助您調整至其他場次。', size:'sm', color:'#555555', margin:'md', wrap:true },
        { type:'separator', margin:'lg' },
        { type:'text', text:'🎁 報名禮物', weight:'bold', size:'sm', color:'#E8590C', margin:'lg' },
        { type:'text', text:'送你一份評估 SOP 檢查表，直播前先看過，上課效果加倍！', size:'sm', color:'#333333', margin:'sm', wrap:true },
      ]},
      footer: { type:'box', layout:'vertical', paddingAll:'15px', contents:[
        { type:'button', action:{ type:'uri', label:'📋 下載評估SOP檢查表', uri:checklistUrl }, style:'primary', color:'#27ACB2', height:'sm' },
        { type:'button', action:{ type:'uri', label:'🔗 開啟直播連結', uri:s.link }, style:'primary', color:'#FF0000', height:'sm', margin:'sm' },
        { type:'button', action:{ type:'message', label:'收到', text:'收到' }, style:'secondary', height:'sm', margin:'sm' },
      ]},
    },
  };
}

function buildAlternativeCard() {
  return { type:'flex', altText:'沒關係！您還有其他選擇',
    contents: { type:'bubble',
      header: { type:'box', layout:'vertical', backgroundColor:'#27ACB2', paddingAll:'18px',
        contents:[{ type:'text', text:'😊 沒關係！你還有其他選擇', color:'#FFFFFF', size:'md', weight:'bold', wrap:true }] },
      body: { type:'box', layout:'vertical', paddingAll:'18px', contents:[
        { type:'text', text:'選一個你有興趣的 👇', size:'sm', color:'#333333', wrap:true },
      ]},
      footer: { type:'box', layout:'vertical', paddingAll:'15px', contents:[
        { type:'button', action:{ type:'uri', label:'🎬 觀看直播錄影', uri:'https://youtube.com/live/BVUaXFi-_dQ?feature=share' }, style:'primary', color:'#27ACB2', height:'sm' },
        { type:'button', action:{ type:'message', label:`🧠 ${SYSTEM_NAME}系統是什麼`, text:`${SYSTEM_NAME}概念讓我大開眼界` }, style:'primary', color:'#284B8B', height:'sm', margin:'sm' },
        { type:'button', action:{ type:'message', label:'📅 報名其他時段', text:'選擇方便時段' }, style:'primary', color:'#7B61AD', height:'sm', margin:'sm' },
      ]},
    },
  };
}

module.exports = {
  init,
  chineseMonths,
  injectUserId,
  textToFlex,
  buildReminderCard,
  buildEnrollCheckCard,
  buildCatchUpMessage,
  buildWaveMessage,
  buildBranchA,
  buildBranchB,
  buildCourseIntroCard,
  buildBranchC,
  buildBranchD,
  buildCourseModules,
  DIAGNOSIS_REPLIES,
  buildBodyIssueCard,
  buildIntroCard,
  buildQACard,
  OBJECTION_REPLIES,
  buildSessionCarousel,
  buildConfirmCard,
  buildAlternativeCard,
};
