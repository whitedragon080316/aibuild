# TapPay 金流設定流程

**觸發條件**：學員說「幫我設定金流」或健康檢查發現 `TAPPAY_PARTNER_KEY` 沒設。

## 步驟

1. 問：「你有 TapPay 帳號了嗎？」
   - 沒有 → 幫他開 `open "https://portal.tappaysdk.com/"` → 「註冊好跟我說」
   - 有了 → 下一步

2. 問：「登入 TapPay Portal，把 Partner Key 貼給我」→ 立刻設定：
   ```bash
   npx zeabur@latest variable create --id WEB_SERVICE_ID \
     --key "TAPPAY_PARTNER_KEY=拿到的值" -y -i=false
   ```

3. 問：「把 Merchant ID 貼給我」→ 設好
4. 問：「把 App ID 貼給我」→ 設好
5. 問：「把 App Key 貼給我」→ 設好

6. 測試：「打開你的課程網站，用測試卡 `4242 4242 4242 4242` 試付款（到期日任意、CVV 123）」

## 上線切換

學員說「我要上線」時：
```bash
npx zeabur@latest variable create --id WEB_SERVICE_ID \
  --key "TAPPAY_ENV=production" -y -i=false
```

<!-- 歷史脈絡：TAPPAY_APP_ID=12348 + TAPPAY_APP_KEY=app_pa1pQwXUzaRoMd7svcJawNKgWOBIlBBsIfiPlTZy7ZOiPgCaRKkRGeYRAV1Y 是 TapPay 官方 sandbox 公開測試值，不是任何人的 prod key。 -->
