---
name: meta-ads
description: Meta 廣告（Pixel、CAPI、廣告 API、報表）— Claude Code 全自動設定
user_invocable: true
---

# Meta 廣告操作

學員說 `/meta-ads`，Claude Code 自動完成 Pixel 安裝、CAPI 串接、廣告報表拉取、廣告啟停。學員不需要打開任何網頁或後台。

## 使用方式

`/meta-ads` — 進入 Meta 廣告設定流程

## 執行原則

- 學員不打開任何網頁、後台、Dashboard
- 一次只問一個問題，拿到答案立刻執行
- Claude Code 直接改 code、寫設定、打 API、部署

---

## 需要學員提供的資訊

依序一次問一個，不要一次全問：

1. **Pixel ID** — 在 Meta 企業管理平台 → 事件管理工具 → 資料來源裡的那串數字
2. **Access Token** — 企業管理平台 → 系統用戶 → 產生權杖（需含 ads_management + ads_read）
3. **廣告帳號 ID** — act_ 開頭的數字（企業管理平台 → 帳號 → 廣告帳號）
4. **LINE 加好友連結** — lin.ee/xxxxx 格式
5. **LP 網址** — 已部署的 Landing Page URL

學員可能已經有部分資訊存在 `.env`，先檢查再問。

---

## Claude Code 自動執行流程

### Step 1：寫入環境變數

拿到 Pixel ID、Access Token、廣告帳號 ID 後，直接寫入專案的 `.env`：

```
META_PIXEL_ID=學員提供的值
META_ACCESS_TOKEN=學員提供的值
META_AD_ACCOUNT_ID=學員提供的值
```

### Step 2：在 LP 安裝 Pixel

找到學員的 LP 專案，在 `<head>` 中自動插入 Pixel code：

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID_FROM_ENV');
fbq('track', 'PageView');
</script>
```

用 `.env` 裡的 `META_PIXEL_ID` 替換 `PIXEL_ID_FROM_ENV`。

### Step 3：建立 /track 中間頁

CTA 不直接連 LINE，經過中間頁觸發 Lead 事件：

```
LP（PageView）→ /track（Lead 事件）→ 自動跳轉 LINE
```

Claude Code 自動建立 `/track` 路由或頁面：

```html
<script>
fbq('track', 'Lead');
setTimeout(() => {
  window.location.href = 'LINE_URL_FROM_ENV';
}, 500);
</script>
```

同時把 LP 上的 CTA 按鈕連結改為指向 `/track`。

### Step 4：串接 Conversion API (CAPI)

在 server 端自動加入 CAPI 函式，server-side 回傳事件給 Meta（不怕 ad blocker）：

```javascript
const https = require('https');

function sendCAPI(eventName, userData, eventSourceUrl) {
  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: eventSourceUrl,
      user_data: {
        client_user_agent: userData.userAgent,
        fbc: userData.fbc,
        fbp: userData.fbp
      }
    }]
  };

  const url = `https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_ACCESS_TOKEN}`;

  const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  req.write(JSON.stringify(payload));
  req.end();
}
```

在 `/track` 路由中自動呼叫 `sendCAPI('Lead', ...)`，並處理 fbclid → fbc 轉換：

```javascript
const fbclid = req.query.fbclid;
const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
```

### Step 5：驗證安裝

Claude Code 用 API 自動驗證：

```bash
# 測試 CAPI 是否通
curl -X POST "https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"data":[{"event_name":"Lead","event_time":'$(date +%s)',"action_source":"website","event_source_url":"LP_URL","user_data":{}}],"test_event_code":"TEST_CODE"}'
```

回報結果給學員：成功收到幾個事件、有沒有錯誤。

### Step 6：部署

所有設定完成後，自動部署到 Zeabur。

---

## 廣告報表（Claude Code 直接拉）

學員說「看報表」或「廣告跑得怎樣」，Claude Code 直接打 API：

```bash
curl -G "https://graph.facebook.com/v19.0/${META_AD_ACCOUNT_ID}/insights" \
  -d "access_token=${META_ACCESS_TOKEN}" \
  -d "date_preset=last_7d" \
  -d "fields=campaign_name,spend,impressions,clicks,actions" \
  -d "level=ad" \
  -d "filtering=[{\"field\":\"ad.effective_status\",\"operator\":\"IN\",\"value\":[\"ACTIVE\"]}]"
```

自動整理成表格回報：

| 廣告名稱 | 花費 | 曝光 | 點擊 | Lead 數 | CPL |
|----------|------|------|------|---------|-----|

CPL 計算：

```javascript
const leads = actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_lead');
const cpl = spend / (leads?.value || 1);
```

CPL > $100 主動提醒學員考慮換素材或暫停。

---

## 廣告啟停（Claude Code 直接操作）

學員說「暫停那個廣告」，Claude Code 直接打 API：

```bash
# 暫停
curl -X POST "https://graph.facebook.com/v19.0/${AD_ID}" \
  -d "access_token=${META_ACCESS_TOKEN}" \
  -d "status=PAUSED"

# 啟動
curl -X POST "https://graph.facebook.com/v19.0/${AD_ID}" \
  -d "access_token=${META_ACCESS_TOKEN}" \
  -d "status=ACTIVE"
```

---

## 廣告架構參考

```
Campaign（目標：轉換/流量/觸及）
  └── Adset（受眾 + 預算 + 版位）
       └── Ad（素材 + 文案 + CTA）
```

### 受眾策略

| 類型 | 適用 | 說明 |
|------|------|------|
| 興趣 | 初期測試 | 手動選興趣標籤 |
| 類似受眾 | 有數據後 | 從 LINE 名單建立 |
| Advantage+ | 預算夠 | 讓 Meta AI 自動找 |

### 預算建議

- 測試期：$300-500/天/adset
- 至少跑 3 天再看數據
- CPL > $100 → 換素材或暫停

---

## 重要規則（Claude Code 內部遵守）

1. **NEVER 用 trackCustom** — Meta 不認自訂事件做轉換優化，必須用標準事件（Lead, Purchase 等）
2. **CAPI 必須送 fbc** — 沒有 fbc 的話 Meta 無法歸因，CAPI 等於白串
3. **用 System User Token** — User Token 60 天過期，System User Token 不過期
4. **Token 要有 ads_management 權限** — 否則無法用 API 操作廣告啟停
5. **一次只問學員一個問題** — 拿到答案立刻設好，再問下一個
6. **先檢查 .env** — 學員可能已經設過，不要重複問
