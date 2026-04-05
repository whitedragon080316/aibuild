---
name: line-bot
description: LINE Bot 設定（官方帳號、Messaging API、Webhook、Flex 卡片）
user_invocable: true
---

# LINE Bot 設定

LINE 官方帳號申請、Messaging API 開通、Webhook 設定、Flex 卡片設計。

## 使用方式

`/line-bot` — 顯示可用操作

## 必要環境變數

```
LINE_CHANNEL_SECRET=你的 Channel Secret
LINE_CHANNEL_ACCESS_TOKEN=你的 Channel Access Token
ADMIN_USER_ID=管理者的 LINE User ID
```

## Step 1：LINE 官方帳號申請

1. 前往 https://manager.line.biz/
2. 用個人 LINE 帳號登入
3. 點「建立帳號」→ 填寫帳號名稱
4. 完成後進入管理後台

## Step 2：Messaging API 開通

1. LINE 官方帳號管理後台 → 設定 → Messaging API
2. 點「啟用 Messaging API」
3. 選擇或建立 LINE Developers Provider
4. 完成後會產生 Channel ID 和 Channel Secret

## Step 3：取得 Channel Access Token

1. 前往 https://developers.line.biz/console/
2. 選你的 Provider → 選你的 Channel
3. Messaging API tab → 最下面「Channel access token」
4. 點 Issue → 複製 Token

## Step 4：Webhook 設定

1. LINE Developers Console → Messaging API tab
2. Webhook URL 填入：`https://你的網域/webhook` 或 `/callback`
3. 點 Verify 確認連線成功
4. 開啟 Use webhook

**⚠️ 同時要關掉：**
- LINE 官方帳號管理後台 → 回應設定 → 自動回應訊息 → **關閉**
- 加入好友的歡迎訊息 → **關閉**（由 Bot 程式控制）

## Step 5：取得管理者 User ID

在 Bot 程式碼中加入：
```javascript
// 暫時加這行，用管理者帳號傳任何訊息給 Bot
console.log('User ID:', event.source.userId);
```
拿到 `Uxxxx...` 後填入 `ADMIN_USER_ID`，然後刪掉這行。

## ⚠️ 常見踩坑

### 1. Channel Secret 搞錯
LINE Developers Console 有多個 Channel。確認你拿的是 **Messaging API Channel** 的 Secret，不是 LINE Login Channel。

### 2. Webhook 驗證失敗
- 確認 URL 是 HTTPS（HTTP 不行）
- 確認 SSL 憑證有效（自簽不行，Let's Encrypt 可以）
- Zeabur 免費子網域的 SSL 憑證鏈，LINE 有時不認 → **用自訂 domain 更可靠**
- 確認 Bot 程式有在跑且 port 正確

### 3. 自動回應沒關
如果 LINE 官方帳號的「自動回應」沒關，使用者會同時收到自動回應 + Bot 回覆，很混亂。

### 4. 推播限制
- 免費：200 則/月
- 中用量：3,000 則/月（$798）
- 高用量：依量計費
- 推播**不可撤回**，發出去就收不回來

### 5. Flex Message 限制
- JSON 最大 50KB
- 最多 12 個 bubble（carousel）
- 圖片 URL 必須 HTTPS
- 文字最長因元件而異（通常 2000 字元）

## Flex 卡片模板

### 基本卡片結構
```javascript
{
  type: 'flex',
  altText: '替代文字（推播通知會顯示這個）',
  contents: {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '標題', weight: 'bold', size: 'lg' },
        { type: 'text', text: '內容', wrap: true, color: '#666666' }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: { type: 'uri', label: '按鈕文字', uri: 'https://...' },
          style: 'primary',
          color: '#3B5BDB'
        }
      ]
    }
  }
}
```

### Postback Action（觸發 Bot 邏輯）
```javascript
{
  type: 'button',
  action: {
    type: 'postback',
    label: '報名',
    data: 'action=register&session=0415'
  }
}
```

## Reply vs Push

```javascript
// Reply：回覆使用者的訊息（免費，不佔推播額度）
client.replyMessage(replyToken, message);

// Push：主動推送（佔推播額度）
client.pushMessage(userId, message);

// Multicast：推送給多人（佔推播額度 × 人數）
client.multicast([userId1, userId2], message);
```

## 管理者通知

```javascript
// 有人報名時通知管理者
await client.pushMessage(process.env.ADMIN_USER_ID, {
  type: 'text',
  text: `新報名！\n${displayName}\n場次：${session}`
});
```

## Rich Menu（圖文選單）

LINE 官方帳號管理後台 → 圖文選單 → 建立。
建議分區：
- 課程介紹 → URI action
- 報名直播 → Postback action
- 聯繫客服 → URI action（或 postback 觸發 AI）
