# 品牌設定流程

**觸發條件**：學員說「我教 XXX，品牌叫 XXX」或健康檢查發現 `BRAND_NAME` 沒設。

## 步驟

1. 問：「你的品牌叫什麼？課程叫什麼？你叫什麼名字？」

2. 一次設好：
   ```bash
   npx zeabur@latest variable create --id BOT_SERVICE_ID \
     --key "BRAND_NAME=品牌名" \
     --key "INSTRUCTOR_NAME=名字" \
     --key "SYSTEM_NAME=課程名" \
     -y -i=false

   npx zeabur@latest variable create --id WEB_SERVICE_ID \
     --key "BRAND_NAME=品牌名" \
     --key "INSTRUCTOR_NAME=名字" \
     --key "SITE_NAME=課程名" \
     -y -i=false
   ```

3. 自動重寫 AI 分身 prompt（`prompts/ai-workers/ai-avatar.md`）：
   - 用學員的品牌名、教學領域、語氣偏好重新生成
   - 部署更新（見 `@.claude/rules/deploy-flow.md`）
