---
name: tappay
description: TapPay 金流串接（3D Secure、付款、退款、查詢）
user_invocable: true
---

# TapPay 金流串接

串接 TapPay 付款系統。支援一次性付款、3D Secure 驗證、綁卡扣款、交易查詢、退款。

## 使用方式

`/tappay` — 顯示目前專案的 TapPay 串接狀態與可用操作

## 行為

1. 讀取 `references/tappay_skill.md` 取得完整 API 文件
2. 檢查目前專案的金流串接狀態（搜尋 server.js 或 index.js 中的 tappay 相關程式碼）
3. 根據使用者需求執行：
   - **新串接**：建立完整的 TapPay 付款流程（前端 SDK + 後端 API + 3D Secure）
   - **查詢交易**：用 Record API 查交易紀錄
   - **退款**：用 Refund API 執行全額或部分退款
   - **除錯**：根據錯誤碼對照表診斷問題

## 必要環境變數

```
TAPPAY_APP_ID=12348
TAPPAY_APP_KEY=app_xxx
TAPPAY_PARTNER_KEY=partner_xxx
TAPPAY_MERCHANT_ID=your_merchant_id
TAPPAY_ENV=sandbox
PUBLIC_BASE_URL=https://your-domain.com
```

## 3D Secure 重點

- `three_domain_secure: true` 時必須提供 `result_url`
- `frontend_redirect_url` + `backend_notify_url` 都要 https
- `backend_notify_url` 只支援 port 443
- 前端跳轉後要用 Record API 再次確認交易狀態

## 測試卡號（Sandbox）

- 卡號：`4242 4242 4242 4242`
- 到期日：任意未來日期
- CVV：`123`

## 注意事項

- Partner Key 放 header `x-api-key`，不要暴露在前端
- prime 有效期只有 90 秒
- 不要用 localhost，3D Secure 會失敗
- 收到前端 redirect 後一定要用 Record API 確認交易
