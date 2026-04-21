---
name: tappay
description: TapPay 金流串接（自動完成所有技術操作，學員只需提供值）
user_invocable: true
---

# TapPay 金流串接

`/tappay` — Claude Code 自動幫你串好 TapPay 付款系統。你只需要回答問題、給值，不用打開任何網頁或後台。

## 這個 Skill 做什麼

Claude Code 會自動完成：
- 在你的專案中建立完整的 TapPay 付款頁面（前端 SDK + 後端 API）
- 設定 3D Secure 驗證流程
- 設定環境變數並部署到 Zeabur
- 處理交易查詢、退款等操作
- 診斷並修復金流相關錯誤

## 執行流程

### 第一次串接

Claude Code 會一次問你一個問題，依序收集以下資訊：

1. **你的 TapPay App ID 是什麼？**
   （到 TapPay Portal > Developer > Application 頁面可以看到，長得像 `12348`）

2. **你的 TapPay App Key 是什麼？**
   （同一個頁面，長得像 `app_xxxxx...`）

3. **你的 TapPay Partner Key 是什麼？**
   （Portal > Information 頁面，長得像 `partner_xxxxx...`）

4. **你的 Merchant ID 是什麼？**
   （Portal > Developer > Merchant 頁面，Sandbox 用預設的就好）

5. **現在是測試還是正式環境？**
   （sandbox / production，沒說就預設 sandbox）

收齊後 Claude Code 自動執行，不再問問題：

1. 在專案中建立 `.env`，寫入所有 TapPay 環境變數
2. 建立後端 API 路由：`/api/config`、`/api/pay`、`/api/notify`、`/api/refund`
3. 建立前端付款頁面，載入 TapPay Web SDK，含卡號輸入、3D Secure 完整流程
4. `PUBLIC_BASE_URL` 自動用專案的 Zeabur domain（https）
5. 部署到 Zeabur，同步設定環境變數
6. 用 Sandbox 測試卡驗證付款流程是否正常

### 查詢交易

學員說「查交易」或「查 TapPay 紀錄」，Claude Code 自動：
1. 讀取專案的 Partner Key
2. 呼叫 Record API 查詢交易紀錄
3. 整理成表格顯示結果

### 退款

學員說「退款」，Claude Code 問一個問題：
- **要退哪筆交易？（給我交易 ID 或訂單編號）**

收到後自動呼叫 Refund API 執行退款並回報結果。

### 除錯

學員說「付款失敗」或貼錯誤訊息，Claude Code 自動：
1. 對照 TapPay 錯誤碼表診斷問題
2. 直接修改程式碼修復
3. 重新部署

## Claude Code 內部執行規則

### 環境變數

```
TAPPAY_APP_ID=12348
TAPPAY_APP_KEY=app_xxx
TAPPAY_PARTNER_KEY=partner_xxx
TAPPAY_MERCHANT_ID=your_merchant_id
TAPPAY_ENV=sandbox
PUBLIC_BASE_URL=https://your-domain.zeabur.app
```

- `PUBLIC_BASE_URL` 必須是 https，不能用 localhost
- 所有變數寫入 `.env` 並同步到 Zeabur 環境變數

### Web SDK 載入

- 路徑必須含 `/sdk/tpdirect/`：`https://js.tappaysdk.com/sdk/tpdirect/v5`
- 錯誤路徑會導致 `TPDirect is not defined`
- 只在 `window.onload` 後初始化，用旗標防止重複初始化

### 3D Secure 重點

- `three_domain_secure: true` 時必須提供 `result_url`
- `result_url` 內含 `frontend_redirect_url` + `backend_notify_url`，都要 https
- `backend_notify_url` 只支援 port 443
- 前端跳轉後要用 Record API 再次確認交易狀態
- 缺少任一 URL 欄位會回傳錯誤碼 629/630/631

### 後端 API header

- 所有 TapPay API 請求的 header 必須帶 `x-api-key: {PartnerKey}` 和 `Content-Type: application/json`
- Partner Key 只放後端，永遠不暴露在前端

### Sandbox 測試卡號

- 卡號：`4242 4242 4242 4242`
- 到期日：任意未來日期
- CVV：`123`

### 常見錯誤速查

| 錯誤碼 | 原因 | 自動修復方式 |
|--------|------|-------------|
| 629/630/631 | result_url 缺少或格式錯誤 | 檢查並補齊 frontend_redirect_url 和 backend_notify_url |
| 80/81/84 | Partner Key 無效 | 請學員重新確認 Partner Key |
| 91/121 | prime 過期或無效 | 檢查前端 getPrime 流程，prime 有效期只有 90 秒 |
| TPDirect is not defined | SDK 載入路徑錯誤 | 修正 script src 為正確的 `/sdk/tpdirect/` 路徑 |
| appId=0 | 環境變數未載入 | 檢查 .env 和 dotenv 設定 |

## 參考文件

完整 API 規格見 `references/tappay_skill.md`，包含：
- Pay by Prime / Bind Card / Pay by Token 的完整 request/response 格式
- Record API 查詢參數與分頁機制
- Refund API 全額與部分退款
- 前端 redirect 與後端 notify 的回傳欄位
- 完整錯誤碼對照表（前端 SDK + 後端 API）
