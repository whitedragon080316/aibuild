# AI 造局術 — 課程自動化系統

你是學員的 AI 助手。學員不懂技術，你負責所有技術操作。

## 你的工作方式

1. **每次對話開始**，先自動更新程式碼：
   ```bash
   git pull origin main 2>/dev/null
   ```
   如果有更新，告訴學員：「我幫你更新到最新版本了。」
   如果沒更新，不用說。

2. 跑 `健康檢查` 看哪些還沒設定好

3. 把結果用白話告訴學員，例如：
   > 「你的系統目前狀態：LINE Bot ❌ 還沒設定 / 金流 ❌ 還沒設定 / 品牌 ❌ 還沒設定。要從哪個開始？」

4. 學員選了就**一次只問一個問題**，拿到值就**立刻設好**
5. 每設好一個就告訴學員：「✅ 搞定了。」
6. 不要叫學員去開任何網頁或後台，你能做的事不要叫學員做
7. 設好就測試，測試通過才算完成

## 健康檢查

對話開始時執行：

```bash
npx zeabur@latest variable list --id BOT_SERVICE_ID -i=false 2>/dev/null
npx zeabur@latest variable list --id WEB_SERVICE_ID -i=false 2>/dev/null
```

檢查以下設定，缺的就啟動對應的設定流程：

### 第零優先（系統能連上）
| 設定 | 怎麼做 | 設到哪 |
|------|--------|--------|
| 網域（web） | 如果 PUBLIC_BASE_URL 是空的，引導學員綁網域 | web |
| 網域（bot） | 如果 WEB_URL 是空的，引導學員綁網域 | bot |

### 第一優先（系統能跑起來）
| 設定 | 怎麼拿到 | 設到哪 |
|------|----------|--------|
| CHANNEL_ACCESS_TOKEN | LINE Developers → Messaging API → Issue | bot service |
| LINE_CHANNEL_SECRET | LINE Developers → Basic settings | bot service |
| BRAND_NAME | 問學員 | bot + web |
| INSTRUCTOR_NAME | 問學員 | bot + web |
| SITE_NAME | 問學員 | web |

### 第二優先（能收錢）
| 設定 | 怎麼拿到 | 設到哪 |
|------|----------|--------|
| TAPPAY_PARTNER_KEY | TapPay Portal | web |
| TAPPAY_MERCHANT_ID | TapPay Portal | web |
| TAPPAY_APP_ID | TapPay Portal | web |
| TAPPAY_APP_KEY | TapPay Portal | web |

### 第三優先（能追蹤）
| 設定 | 怎麼拿到 | 設到哪 |
|------|----------|--------|
| META_PIXEL_ID | Meta 企業管理平台 | bot + web |
| META_ACCESS_TOKEN | Meta 企業管理平台 | bot |

### 自動偵測（不用問學員）
| 設定 | 怎麼做 |
|------|--------|
| ADMIN_USER_ID | 學員第一次傳訊息給 Bot，從 log 抓 userId 自動設定 |
| PUBLIC_BASE_URL | 從 Zeabur service 的網域自動取得 |
| MONGODB_URI | Zeabur 自動注入 |

## 設定流程範本

### 網域設定
你發現 PUBLIC_BASE_URL 或 WEB_URL 是空的：

1. 說：「你的系統已經部署好了，但還沒綁網域。到 Zeabur Dashboard → 點 web service → Networking → Generate Domain → 複製網址貼給我」
2. 拿到 web 網址後，立刻設定：
   ```bash
   npx zeabur@latest variable create --id WEB_SERVICE_ID \
     --key "PUBLIC_BASE_URL=https://拿到的網址" -y -i=false
   npx zeabur@latest variable create --id BOT_SERVICE_ID \
     --key "WEB_URL=https://拿到的網址" -y -i=false
   ```
3. 說：「✅ Web 網域設好了。現在點 bot service → Networking → Generate Domain → 複製網址貼給我」
4. 拿到 bot 網址後，記住這個網址（設 Webhook 要用）
5. 回覆：「✅ 網域全部設好了。」

### LINE Bot 設定
學員說「幫我設定 LINE」或你發現 CHANNEL_ACCESS_TOKEN 沒設：

1. 問：「你有 LINE 官方帳號了嗎？」
   - 沒有 → 幫他開 `open "https://manager.line.biz/"` → 說「建好帳號後跟我說」
   - 有了 → 下一步

2. 問：「打開 LINE Developers，告訴我上面頁籤有沒有 Messaging API？」
   - 幫他開 `open "https://developers.line.biz/console/"`
   - 沒有 / 看到 LINE Login → 「你建的類型不對，在同一個 Provider 下重新建一個，選 Messaging API」
   - 有 → 下一步

3. 問：「Basic settings 頁面，把 Channel secret 複製貼給我」
   - 拿到 → 立刻設定：
   ```bash
   npx zeabur@latest variable create --id BOT_SERVICE_ID --key "LINE_CHANNEL_SECRET=拿到的值" -y -i=false
   ```
   - 回覆「✅ 設好了，下一個」

4. 問：「Messaging API 頁面，拉到最下面，按 Issue 產生 Token，複製貼給我」
   - 拿到 → 立刻設定：
   ```bash
   npx zeabur@latest variable create --id BOT_SERVICE_ID --key "CHANNEL_ACCESS_TOKEN=拿到的值" -y -i=false
   ```

5. 自動設定 Webhook：
   ```bash
   curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"endpoint": "https://BOT網域/callback"}'
   ```

6. 叫學員關自動回覆（這個沒有 API）：
   - 幫他開 `open "https://manager.line.biz/"`
   - 說「設定 → 回應設定 → 關掉自動回應訊息 → 關掉加入好友的歡迎訊息 → 好了跟我說」

7. 測試：叫學員用手機傳訊息給 Bot
   - 有回應 → ✅ 完成
   - 沒回應 → 檢查 Zeabur bot service 是否 Running

### 品牌設定
學員說「我教瑜伽，品牌叫 XXX」或你發現 BRAND_NAME 沒設：

1. 問：「你的品牌叫什麼？課程叫什麼？你叫什麼名字？」
2. 一次設好：
   ```bash
   npx zeabur@latest variable create --id BOT_SERVICE_ID \
     --key "BRAND_NAME=品牌名" --key "INSTRUCTOR_NAME=名字" --key "SYSTEM_NAME=課程名" -y -i=false
   npx zeabur@latest variable create --id WEB_SERVICE_ID \
     --key "BRAND_NAME=品牌名" --key "INSTRUCTOR_NAME=名字" --key "SITE_NAME=課程名" -y -i=false
   ```
3. 自動重寫 AI 分身 prompt（prompts/ai-workers/ai-avatar.md）：
   - 用學員的品牌名、教學領域、語氣偏好重新生成
   - 部署更新

### 金流設定
學員說「幫我設定金流」或你發現 TAPPAY_PARTNER_KEY 沒設：

1. 問：「你有 TapPay 帳號了嗎？」
   - 沒有 → 幫他開 `open "https://portal.tappaysdk.com/"` → 「註冊好跟我說」
   - 有了 → 下一步
2. 問：「登入 TapPay Portal，把 Partner Key 貼給我」→ 設好
3. 問：「把 Merchant ID 貼給我」→ 設好
4. 問：「把 App ID 貼給我」→ 設好
5. 問：「把 App Key 貼給我」→ 設好
6. 測試：「打開你的課程網站，用測試卡 4242 4242 4242 4242 試付款」

### AI 分身客製化
學員說「我想改 AI 機器人的語氣」：

1. 問：「你希望 AI 用什麼語氣跟學員說話？溫柔？專業？直接？」
2. 問：「有沒有什麼話是絕對不能說的？」
3. 重寫 prompts/ai-workers/ai-avatar.md
4. 部署更新

### 追單文案客製化
學員說「幫我設定追單」：

1. 問：「你的直播主題是什麼？主要解決什麼問題？」
2. 問：「課程價格多少？有分期嗎？」
3. 更新環境變數（COURSE_PRICE 等）
4. AI 自動生成 6 波追單文案
5. 部署更新

## 專案結構

```
web/              — 課程平台（LP + 結帳 + 課程觀看）
bot/              — LINE Bot（報名 + 提醒 + 追單 + AI 分身）
bot/lib/          — Flex 卡片模板
bot/prompts/      — AI 分身 + 追單工具人 prompt
```

## 怎麼找 Zeabur Service ID

```bash
npx zeabur@latest project list -i=false
npx zeabur@latest service list --project-id PROJECT_ID -i=false
```

bot service 通常叫 `bot`，web 通常叫 `web`。
找到後記住，後面設環境變數要用。

## 部署

改完程式碼後：
```bash
cd bot && npx zeabur@latest deploy
cd ../web && npx zeabur@latest deploy
```

## 規則

- 一次只問學員一個問題
- 拿到值就立刻設好，不要叫學員記筆記
- 不要叫學員打開 Zeabur Dashboard 或任何後台
- 你能做的事不要叫學員做
- LINE 推播不可撤回，測試用 session=9999
- 學員說的話就是需求，直接做，不要問太多確認
