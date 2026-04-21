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

---

## 廣告健康度自檢 — paid-media-auditor 框架

### 為什麼要做

廣告跑起來之後最常見的兩種浪費：
1. **花錢給已經是客戶的人看** — 受眾沒排除，現有客戶一直被打擾，預算被內耗
2. **追蹤設錯但還在燒錢** — Pixel 沒 fire、Conversion 連錯事件、系統優化目標給了 Messenger 卻沒接 LINE

這些問題 Meta Dashboard 不會自動提醒你。下面是精簡版自檢清單 — 每週跑一次，10 分鐘搞定。

學員說「幫我檢查廣告健康度」或 `/meta-ads audit`，Claude Code 就照下面這 5 個面向逐一檢查。

### 受眾（Audience）

- [ ] **有排除「已加 LINE」名單嗎？** 現有 LINE 好友不該再被廣告打 → 在 Ad Set 受眾設定裡把 LINE 好友自訂受眾設為「排除」
- [ ] **有排除「已購買」名單嗎？** 把 TapPay / CRM 的已付款名單做成 Custom Audience，設為「排除」— 已成交的客戶再看到「限時優惠」會覺得被當韭菜
- [ ] **類似受眾有基於正確種子名單嗎？** 種子用「已購買」（高品質）> 種子用「加 LINE」（中）> 種子用「PageView」（低）。不要偷懶用 PageView 種子

### 素材（Creative）

- [ ] **CTR < 1% 且花費 > $500 → 暫停或換素材**（$500 是安全觀察門檻，低於這數字樣本不夠判斷）
- [ ] **同個 Ad Set 裡 3 支素材 CTR 差 3 倍以上** → 停掉差的，把預算集中到好的
- [ ] **素材跑超過 14 天沒換** → 目標受眾已看膩（疲勞），CTR 會自然下滑；定期輪替 3-5 支

### 轉換追蹤（Tracking）

- [ ] **Pixel 在 LP 有 fire？** 用 Meta Pixel Helper 瀏覽器外掛開 LP 驗證，看到綠色 `PageView` 才算對
- [ ] **`/track` 中間頁有 fire Lead 事件？** 同樣用 Pixel Helper 手動點一次按鈕，要看到 `Lead` event
- [ ] **CAPI 有送 fbc？** fbclid → fbc 轉換有沒有做，server log 檢查最近一筆 CAPI payload 有沒有帶 `fbc` 欄位
- [ ] **Custom Conversion 連對事件？** 如果設了 Custom Conversion（例如「LINE 加好友」），去事件管理工具確認它是基於 `Lead` 而不是 `PageView`

### 優化目標：Messenger vs Pixel（最容易踩的坑）

Meta 廣告版位有「Messenger」（直接用 LINE / FB Messenger 對話當轉換）跟「網站 + Pixel」兩種邏輯，很多人不知道兩者差異：

- **Messenger 優化** — Meta 會把「會點開對話框的人」當轉換，但這群人**品質很低**（一堆試用、問完就跑、甚至殭屍帳號）。我們實測 Messenger 優化的 lead 成交率低到個位數。
- **Pixel 優化（LP → /track → LINE）** — 必須經過 LP + Pixel 事件，Meta 學到的是「會在網站上採取行動的人」，這群人意圖比較明確、成交率高 3-5 倍。

**建議：** 新手一律用「網站 + Pixel」漏斗（LP → /track → LINE），**不要**開「Click to Messenger」廣告版位，除非你已經有足夠轉換數據去做 A/B 測試。

- [ ] 檢查你的 Campaign Objective 是 **Conversions / Sales**（以 Pixel Lead 當目標），不是 **Engagement / Messages**

### 保守調整原則（最重要的心法）

廣告的「學習期」Meta 需要 50 轉換才穩定。你每改一次東西，學習期就重置一次。所以：

- **一次只改一個變數** — 想換素材就只換素材、想改預算就只改預算，不要一次換素材 + 改受眾 + 調預算
- **改完至少跑 3 天才評估** — 前 3 天是學習期，CPA 會飄，不要前 6 小時看 CPA 高就關掉
- **預算調整幅度一次不超過 20%** — 從 $500 直接跳到 $2000 會觸發重新學習，從 $500 → $600 → $720 分 3 天推進
- **不要半夜亂動** — 半夜數據少、波動大，你看到的「突然變差」很可能只是樣本不足

每一條都是用燒掉的錢換來的教訓。Meta 廣告是**一場耐心遊戲**，不是即時戰略。

### 自檢頻率

| 頻率 | 做什麼 |
|------|--------|
| 每天 | 看 CPL、有沒有素材爆炸（CPL 突然 > 平均 2 倍） |
| 每週 | 跑一次完整 5 面向健康度自檢 |
| 每月 | 更新排除名單（最新的已加 LINE / 已購買）、輪替素材 |

### 給 Claude Code：執行 audit 時的輸出格式

當學員說「檢查廣告健康度」時，Claude Code 自動拉 API 資料 + 逐項對照，最後產出這樣的報告：

```
## 廣告健康度檢查（last_7d）

### 受眾
- ✅ 已排除 LINE 好友名單（xxxx 人）
- ❌ 未排除已購買名單 — 建議匯入 TapPay 成交名單，設為排除

### 素材
- ⚠️ Ad "XXXX" CTR = 0.6%, spend = $820 → 建議暫停
- ✅ 其他 2 支素材 CTR 正常

### 追蹤
- ✅ Pixel 運作正常
- ❌ CAPI 最近 3 天沒收到事件 — 檢查 server 是否還在呼叫 sendCAPI()

### 行動建議（優先序）
1. [高] 排除已購買名單（省內耗）
2. [中] 暫停 CTR 低的素材
3. [中] 修 CAPI 問題
```

有具體問題 + 具體行動，不只是數據 dump。
