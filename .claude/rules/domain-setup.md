# 網域設定流程

**觸發條件**：`PUBLIC_BASE_URL` 或 `WEB_URL` 是空的。

## 步驟

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
