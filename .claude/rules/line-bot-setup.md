# LINE Bot 設定流程

**觸發條件**：學員說「幫我設定 LINE」或健康檢查發現 `CHANNEL_ACCESS_TOKEN` 沒設。

## 步驟

### 1. 確認 LINE 官方帳號
問：「你有 LINE 官方帳號了嗎？」
- 沒有 → 幫他開 `open "https://manager.line.biz/"` → 說「建好帳號後跟我說」
- 有了 → 下一步

### 2. 確認 Channel 類型
問：「打開 LINE Developers，告訴我上面頁籤有沒有 Messaging API？」
- 幫他開 `open "https://developers.line.biz/console/"`
- 沒有 / 看到 LINE Login → 「你建的類型不對，在同一個 Provider 下重新建一個，選 Messaging API」
- 有 → 下一步

### 3. 拿 Channel Secret
問：「Basic settings 頁面，把 Channel secret 複製貼給我」

拿到 → 立刻設定：
```bash
npx zeabur@latest variable create --id BOT_SERVICE_ID \
  --key "CHANNEL_SECRET=拿到的值" -y -i=false
```
回覆「✅ 設好了，下一個」

### 4. 拿 Channel Access Token
問：「Messaging API 頁面，拉到最下面，按 Issue 產生 Token，複製貼給我」

拿到 → 立刻設定：
```bash
npx zeabur@latest variable create --id BOT_SERVICE_ID \
  --key "CHANNEL_ACCESS_TOKEN=拿到的值" -y -i=false
```

### 5. 自動設定 Webhook
```bash
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "https://BOT網域/callback"}'
```

### 6. 叫學員關自動回覆（沒 API）
- 幫他開 `open "https://manager.line.biz/"`
- 說「設定 → 回應設定 → 關掉自動回應訊息 → 關掉加入好友的歡迎訊息 → 好了跟我說」

### 7. 測試
叫學員用手機傳訊息給 Bot：
- 有回應 → ✅ 完成
- 沒回應 → 檢查 Zeabur bot service 是否 Running

<!-- 歷史脈絡：2026-04 前主檔和 web/line-bot.js 用 LINE_CHANNEL_TOKEN / LINE_CHANNEL_SECRET，bot/index.js 用 CHANNEL_ACCESS_TOKEN / CHANNEL_SECRET。為了符合 LINE SDK 慣例統一成後者，web/lib/line-bot.js 保留 fallback 讀舊名避免舊部署爆炸。 -->
