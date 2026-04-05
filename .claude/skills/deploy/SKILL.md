---
name: deploy
description: 一鍵部署 aibuild-bot + aibuild-web 到 Zeabur
user_invocable: true
---

# 一鍵部署

把 aibuild-bot（LINE Bot）和 aibuild-web（課程平台）部署到 Zeabur。

## 使用方式

`/deploy` — 開始部署流程

## 前置條件

確認以下帳號都已註冊：
- [ ] Zeabur 帳號（已綁信用卡）
- [ ] GitHub 帳號
- [ ] LINE Developers 帳號（已建 Messaging API Channel）
- [ ] TapPay Portal 帳號（已申請商家）

## 部署順序

**先 Bot → 再 Web → 最後串接**

---

## Step 1：Clone 模板

```bash
cd ~
git clone https://github.com/whitedragon080316/aibuild-bot.git
git clone https://github.com/whitedragon080316/aibuild-web.git
```

## Step 2：部署 aibuild-bot

```bash
cd ~/aibuild-bot
npx zeabur@latest deploy
```

選擇：
- 建立新專案 → 輸入專案名（如 `my-course`）
- 地區 → Tokyo 或 Singapore

部署完成後設定環境變數（Zeabur Dashboard → Variables）：

```
LINE_CHANNEL_TOKEN=你的 Channel Access Token
LINE_CHANNEL_SECRET=你的 Channel Secret
ADMIN_USER_ID=你的 LINE User ID
BRAND_NAME=你的品牌名
INSTRUCTOR_NAME=你的名字
SYSTEM_NAME=你的課程名稱
COURSE_NAME=你的課程名稱
COURSE_PRICE=49800
```

## Step 3：設定 LINE Webhook

1. LINE Developers Console → 你的 Channel → Messaging API
2. Webhook URL：`https://你的服務.zeabur.app/webhook`
3. 點 Verify → 成功
4. 開啟 Use webhook
5. **關閉** Auto-reply messages（LINE 官方帳號管理後台 → 回應設定）
6. **關閉** 加入好友的歡迎訊息（由 Bot 控制）

## Step 4：部署 aibuild-web

```bash
cd ~/aibuild-web
npx zeabur@latest deploy
```

選同一個專案（`my-course`），讓兩個 service 在同一個 project。

設定環境變數：

```
SITE_NAME=你的課程名稱
BRAND_NAME=你的品牌名
PUBLIC_BASE_URL=https://你的課程網域
MONGODB_URI=（Zeabur 自動注入，或手動填）
LINE_CHANNEL_TOKEN=同上
LINE_CHANNEL_SECRET=同上
TAPPAY_PARTNER_KEY=你的 TapPay Partner Key
TAPPAY_MERCHANT_ID=你的 TapPay Merchant ID
TAPPAY_APP_ID=你的 TapPay App ID
TAPPAY_APP_KEY=你的 TapPay App Key
TAPPAY_ENV=sandbox
META_PIXEL_ID=你的 Pixel ID
```

## Step 5：加 MongoDB

Zeabur Dashboard → 同一個專案 → Add Service → Marketplace → MongoDB

加完後 Zeabur 會自動注入 `MONGODB_URI` 環境變數。

## Step 6：綁定網域

Zeabur Dashboard → aibuild-web service → Networking → 綁定自訂網域或用 Zeabur 子網域。

## Step 7：驗證清單

```
Bot 驗證：
- [ ] LINE 加好友 → 收到歡迎訊息
- [ ] 選場次 → 報名成功
- [ ] 管理者收到通知

Web 驗證：
- [ ] LP 打開正常（桌面 + 手機）
- [ ] 結帳頁 v1/v2 方案切換正常
- [ ] 測試卡付款：4242 4242 4242 4242（到期日任意未來、CVV 任意 3 碼）
- [ ] 付款成功 → 跳轉課程頁
- [ ] 課程影片可播放
- [ ] Dashboard 有數據

串接驗證：
- [ ] LP 有 Meta Pixel（Chrome Pixel Helper 確認）
- [ ] /track 中間頁觸發 Lead 事件
```

## ⚠️ 常見問題

| 問題 | 解法 |
|------|------|
| Webhook Verify 失敗 | 確認 URL 是 HTTPS、Bot 有在跑、Channel Secret 正確 |
| 付款失敗 | 確認 TAPPAY_ENV=sandbox、測試卡號正確 |
| MongoDB 連不上 | 確認 MongoDB service 在同一個 project |
| LP 打不開 | 確認 PUBLIC_BASE_URL 正確（https 開頭） |
| 部署後 OOM | server 記憶體不夠，確認 Zeabur plan 至少 512MB |

## 上線前切換

測試完成後，改以下環境變數：
```
TAPPAY_ENV=production
META_PIXEL_ID=正式的 Pixel ID
PUBLIC_BASE_URL=正式網域
```
