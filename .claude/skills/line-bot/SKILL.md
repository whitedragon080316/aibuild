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
  --key "CHANNEL_SECRET=學員給的值" \
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
- [ ] CHANNEL_SECRET
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

---

## 常見 silent failure 案例（從實戰血淚收集）

Bot 最可怕的 bug 不是「噴錯」— 噴錯你會看到。最可怕的是 **silent failure**：沒人噴錯、沒人報警、但東西就是沒照預期跑，累積幾週才被發現。

下面 3 個案例都是我們在真實生產環境花過數週 debug 的教訓。寫 Bot 之前先看過，可以省你好幾輪踩坑。

### 案例 A：管理指令改了 DB 狀態但 save 漏了

**症狀：** Admin 在對話框打指令「把 userA 標為已完單」，Bot 回「✅ 完成」，但幾天後發現再行銷排程還是把這個用戶當未完單在推。

**根因：** 指令 handler 裡寫了 `if (found > 0) saveData()`。`found` 是指「某個主集合有匹配」，但指令還動到**另一個集合** `courseInterest.confirmed`；當 found = 0 時 saveData 不跑，`courseInterest` 的變更只在記憶體裡，重啟就掉。

**教訓：** 條件式 saveData 是地雷。用 `mutated` 旗標，只要任何欄位被改就必存。

詳細規則、Bad/Good code、快速模板都在 `/admin-commands` skill，**寫 admin 指令前先去讀那個 skill**。

### 案例 B：getProfile 429 被當封鎖吞掉

**症狀：** 某天批次撈 user 名字，發現名單裡一堆人被標「(已封鎖)」— 但去 LINE 後台看這些人根本還在好友列表。

**根因：**

```js
try {
  const profile = await lineClient.getProfile(userId);
  return profile.displayName;
} catch (e) {
  return '(已封鎖)';  // 把所有錯誤都當封鎖
}
```

LINE API 一次撈太多會噴 429 rate limit。上面的 code 把 429 跟真的 403/404 封鎖一起吞 → 有效用戶被錯標 → 從再行銷名單被刪掉 → 少推了一批有效流量。

**教訓：** 外部 API 錯誤必須分類：

```js
if (e.statusCode === 429) {
  await sleep(5000);
  // retry 一次
} else if (e.statusCode === 403 || e.statusCode === 404) {
  return '(已封鎖)';  // 真的封鎖
} else {
  throw e;  // 其他錯誤讓上層知道
}
```

**批次撈 profile 一定要加 rate limit 控制**：每次 getProfile 之間 sleep 100-200ms，或分批（每批 50 個，批間 sleep 2s）。

### 案例 C：cronRemarketing 只檢查 session 層級 converted，沒檢查 user 層級

**症狀：** 有用戶已經付費買課了，隔天還收到「限時優惠最後一天」追單訊息 — 對已成交客戶發促銷，非常尷尬。

**根因：** 再行銷的 cron job 寫成這樣：

```js
for (const session of appData.sessions) {
  if (!session.converted) {
    sendRemarketing(session.userId);  // 漏了 user 層級檢查
  }
}
```

`session.converted` 是**每場直播**的狀態（這場沒下單 = false）。但那個用戶在**上一場**就成交買課了，課程報名資訊存在 `appData.users[uid].courseInterest.confirmed`，跟 session 是不同集合。只檢查 session，會把「上次成交但這次沒參加直播」的用戶當新 lead 繼續推。

**教訓：** 成交狀態是**用戶層級**的、跨所有 session / 活動。再行銷發送前必須檢查：

```js
for (const session of appData.sessions) {
  const user = appData.users[session.userId];
  if (session.converted) continue;              // 本場已成交
  if (user?.courseInterest?.confirmed) continue; // ✅ 用戶已付費（跨集合）
  if (user?.optedOut) continue;                  // ✅ 用戶手動退訂
  sendRemarketing(session.userId);
}
```

---

### 出現怪 bug 先問三個問題

看完上面 3 個案例，Bot 的 silent failure 幾乎都可以拆成這 3 個問題。下次你遇到「code 看起來對、但行為就是不對」的時候，照順序問自己：

1. **saveData 走到了嗎？** — 有沒有哪條分支變更了狀態但沒存到
2. **API 錯誤分類了嗎？** — 是不是把暫時錯誤（429/timeout）當永久錯誤吞掉
3. **狀態檢查有跨集合嗎？** — 是不是只檢查了本集合，忽略了 user 層級或其他全域旗標

90% 的 Bot 怪 bug 答案都在這 3 個問題裡。
