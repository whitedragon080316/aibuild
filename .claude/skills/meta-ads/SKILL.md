---
name: meta-ads
description: Meta 廣告（Pixel、CAPI、廣告 API、報表）
user_invocable: true
---

# Meta 廣告操作

Meta Pixel 安裝、Conversion API (CAPI) 串接、廣告 API 操作、報表拉取。

## 使用方式

`/meta-ads` — 顯示可用操作

## 必要環境變數

```
META_PIXEL_ID=你的 Pixel ID
META_ACCESS_TOKEN=你的 Access Token（需 ads_management + ads_read 權限）
META_AD_ACCOUNT_ID=act_你的廣告帳號ID
```

## Step 1：企業管理平台 (Business Manager)

1. 前往 https://business.facebook.com/
2. 點「建立帳號」
3. 填寫商家名稱、你的名字、Email
4. 完成驗證

## Step 2：廣告帳號建立

1. 企業管理平台 → 設定 → 帳號 → 廣告帳號
2. 點「新增」→「建立新的廣告帳號」
3. 填寫名稱、時區（GMT+8）、幣別（TWD）
4. 綁定信用卡

## Step 3：Pixel 建立

1. 企業管理平台 → 事件管理工具
2. 「連結資料來源」→ 選「網站」
3. 選「僅使用 Meta Pixel」
4. 命名 → 輸入網站 URL → 建立

## Step 4：Pixel 安裝（前端）

在 LP 的 `<head>` 中加入：

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
fbq('init', '你的PIXEL_ID');
fbq('track', 'PageView');
</script>
```

### 追蹤事件

```javascript
// LP 頁面載入（自動）
fbq('track', 'PageView');

// CTA 按鈕點擊 — 用 Lead 事件（標準事件，Meta 能自動優化）
fbq('track', 'Lead');

// ❌ 不要用 trackCustom — Meta 不認，不會自動優化投放
// fbq('trackCustom', 'click');  ← 這個沒用
```

## Step 5：/track 中間頁

LP 的 CTA 不要直接連到 LINE，經過中間頁觸發 Lead 事件：

```
LP（PageView）→ /track（Lead 事件）→ 自動跳轉 LINE
```

```html
<!-- /track 頁面 -->
<script>
fbq('track', 'Lead');
setTimeout(() => {
  window.location.href = 'https://lin.ee/你的LINE連結';
}, 500);
</script>
```

## Step 6：Conversion API (CAPI)

Server-side 回傳事件給 Meta，比 Pixel 更準確（不怕 ad blocker）。

```javascript
const https = require('https');

function sendCAPI(eventName, userData, eventSourceUrl) {
  const payload = {
    data: [{
      event_name: eventName,  // 'Lead'
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: eventSourceUrl,
      user_data: {
        client_user_agent: userData.userAgent,
        fbc: userData.fbc,  // fbclid → fbc 格式：fb.1.timestamp.fbclid
        fbp: userData.fbp
      }
    }]
  };

  const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  req.write(JSON.stringify(payload));
  req.end();
}
```

### fbclid → fbc 轉換

```javascript
// 從 URL query 拿 fbclid，轉成 fbc 格式
const fbclid = req.query.fbclid;
const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
```

### 驗證 CAPI

1. 事件管理工具 → 你的 Pixel → 「測試事件」tab
2. 輸入網站 URL → 開始測試
3. 從 LP 走一次流程，看有沒有收到 server 事件

## Step 7：Chrome Pixel Helper

1. Chrome 商店搜尋「Meta Pixel Helper」
2. 安裝擴充功能
3. 打開 LP → 點擊 Pixel Helper 圖示
4. 確認有顯示 PageView 和 Lead 事件

## 廣告架構

```
Campaign（目標：轉換/流量/觸及）
  └── Adset（受眾 + 預算 + 版位）
       └── Ad（素材 + 文案 + CTA）
```

### 受眾策略

| 類型 | 適用 | 設定 |
|------|------|------|
| 興趣 | 初期測試 | 手動選興趣標籤 |
| 類似受眾 | 有數據後 | 從 LINE 名單建立 |
| Advantage+ | 預算夠 | 讓 Meta AI 自動找 |

### 預算建議

- 測試期：$300-500/天/adset
- 至少跑 3 天再看數據
- CPL（每次 Lead 成本）> $100 → 換素材或暫停

## 廣告 API 操作

### 拉 7 天報表

```bash
curl -G "https://graph.facebook.com/v19.0/act_帳號ID/insights" \
  -d "access_token=TOKEN" \
  -d "date_preset=last_7d" \
  -d "fields=campaign_name,spend,impressions,clicks,actions" \
  -d "level=ad" \
  -d "filtering=[{\"field\":\"ad.effective_status\",\"operator\":\"IN\",\"value\":[\"ACTIVE\"]}]"
```

### 暫停廣告

```bash
curl -X POST "https://graph.facebook.com/v19.0/AD_ID" \
  -d "access_token=TOKEN" \
  -d "status=PAUSED"
```

### CPL 計算

```javascript
// 從 insights 的 actions 中找 lead 事件
const leads = actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_lead');
const cpl = spend / (leads?.value || 1);
```

## ⚠️ 常見踩坑

1. **Token 過期**：User Token 60 天過期。用 System User Token（企業管理平台→系統用戶）可以不過期
2. **Pixel 事件用 trackCustom**：Meta 不認自訂事件做轉換優化，必須用標準事件（Lead, Purchase 等）
3. **CAPI 沒送 fbc**：沒有 fbc 的話 Meta 無法歸因，CAPI 等於白串
4. **ads_management 權限**：要能用 API 操作廣告（暫停/啟動），Token 需要有 ads_management 權限
