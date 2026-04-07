---
name: line-bot
description: LINE Bot 設定與管理 — 學員跟 Claude Code 說就能完成所有設定
user_invocable: true
---

# LINE Bot 設定

學員只需要跟你（Claude Code）對話，你幫他完成所有技術操作。

## 使用方式

- `/line-bot setup` — 從零開始設定 LINE Bot（引導式）
- `/line-bot status` — 檢查目前設定狀態
- `/line-bot webhook` — 設定或更新 Webhook URL
- `/line-bot` — 顯示可用操作

---

## setup：引導式設定（最重要）

一步一步引導學員完成 LINE Bot 設定。每次只問一個問題，拿到值就馬上設好。

### 流程

**Step 1：確認學員有 Messaging API Channel**

先問：「你有 LINE 官方帳號了嗎？有的話，打開 LINE Developers Console，告訴我你看到什麼頁籤（上面那排）」

- 如果看到「Messaging API」→ 繼續
- 如果看到「LINE Login」→ 告訴他建錯了，要重新建一個：
  > 你建的是 LINE Login，Bot 需要的是 Messaging API。
  > 在同一個 Provider 下，點「Create a new channel」→ 選「Messaging API」。
  > 建好後跟我說。
- 如果還沒有 → 幫他開瀏覽器：
  ```bash
  open "https://developers.line.biz/console/"
  ```
  然後說：
  > 登入後，建一個 Provider（填你的品牌名），然後點「Create a new channel」→ 選「Messaging API」→ 填完建立。建好後跟我說。

**Step 2：拿 Channel Secret**

說：「現在點開你的 Channel → Basic settings 頁面 → 找到 Channel secret → 複製貼給我」

拿到後立刻設定：
```bash
npx zeabur@latest variable create \
  --id SERVICE_ID \
  --key "LINE_CHANNEL_SECRET=學員給的值" \
  -y -i=false
```

回覆：「✅ Channel Secret 設好了。」

**Step 3：拿 Channel Access Token**

說：「同一個 Channel → 點上面的 Messaging API 頁籤 → 拉到最下面 → 點 Issue 按鈕 → 複製產生的 Token 貼給我」

拿到後立刻設定：
```bash
npx zeabur@latest variable create \
  --id SERVICE_ID \
  --key "CHANNEL_ACCESS_TOKEN=學員給的值" \
  -y -i=false
```

回覆：「✅ Token 設好了。」

**Step 4：設定 Webhook**

用學員的 Bot 網址自動設定（先查 Zeabur service 的網域）：
```bash
npx zeabur@latest service list --project-id PROJECT_ID -i=false
```

找到 bot service 的網域後，用 LINE API 設定 Webhook：
```bash
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer 學員的TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "https://BOT網域/callback"}'
```

驗證：
```bash
curl -s -X POST "https://api.line.me/v2/bot/channel/webhook/test" \
  -H "Authorization: Bearer 學員的TOKEN"
```

回覆：「✅ Webhook 設好了，LINE 已經連上你的 Bot。」

**Step 5：關閉自動回覆**

LINE Official Account Manager 的自動回覆無法透過 API 關閉，必須學員自己操作。
幫他開瀏覽器：
```bash
open "https://manager.line.biz/"
```

說：
> 我幫你打開了 LINE 後台。
> 點你的帳號 → 左邊「設定」→「回應設定」→ 把「自動回應訊息」關掉 → 把「加入好友的歡迎訊息」也關掉。
> 關好後跟我說。

**Step 6：自動偵測管理者 ID**

不需要學員去找 User ID。告訴他：
> 用你的手機傳任何訊息給 Bot。

然後看 Zeabur logs 或等 Bot 程式自動偵測第一個訊息的 userId，設定為 ADMIN_USER_ID：
```bash
npx zeabur@latest variable create \
  --id SERVICE_ID \
  --key "ADMIN_USER_ID=偵測到的值" \
  -y -i=false
```

回覆：「✅ 全部設定完成！你的 LINE Bot 已經上線了。」

---

### 怎麼找 Service ID 和 Project ID

```bash
# 列出所有專案
npx zeabur@latest project list -i=false

# 列出專案下的服務
npx zeabur@latest service list --project-id PROJECT_ID -i=false
```

Bot 的 service name 通常是 `bot`。

---

## status：檢查設定

```bash
# 檢查環境變數是否設好
npx zeabur@latest variable list --id SERVICE_ID -i=false
```

列出哪些已設定、哪些還缺：
- [ ] LINE_CHANNEL_SECRET
- [ ] CHANNEL_ACCESS_TOKEN
- [ ] ADMIN_USER_ID

缺的就跑 setup 對應步驟。

---

## webhook：更新 Webhook URL

當學員換了網域或重新部署時用：
```bash
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "https://新網域/callback"}'
```

---

## ⚠️ 常見踩坑

### Channel 類型選錯
選到「LINE Login」→ 沒有 Messaging API 頁籤 → Bot 不會動。
解法：在同一個 Provider 下重新建一個，選「Messaging API」。

### 在 Official Account Manager 找不到 Messaging API
還沒啟用 → 設定 → Messaging API → 點「啟用」→ 建立服務提供者。

### Webhook 驗證失敗
- Bot 還沒跑起來（Zeabur 顯示 Running 了嗎？）
- URL 結尾要有 /callback
- 必須是 HTTPS

### 推播限制
- 免費：200 則/月
- 中用量：3,000 則/月（$798）
- 推播不可撤回

---

## Flex 卡片模板

### 基本結構
```javascript
{
  type: 'flex',
  altText: '替代文字',
  contents: {
    type: 'bubble',
    body: {
      type: 'box', layout: 'vertical',
      contents: [
        { type: 'text', text: '標題', weight: 'bold', size: 'lg' },
        { type: 'text', text: '內容', wrap: true, color: '#666666' }
      ]
    },
    footer: {
      type: 'box', layout: 'vertical',
      contents: [{
        type: 'button',
        action: { type: 'uri', label: '按鈕', uri: 'https://...' },
        style: 'primary', color: '#3B5BDB'
      }]
    }
  }
}
```

### Reply vs Push
```javascript
// Reply：回覆訊息（免費）
client.replyMessage(replyToken, message);

// Push：主動推送（佔額度）
client.pushMessage(userId, message);
```
