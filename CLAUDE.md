# AI 造局術 — 一鍵部署指南

這是 AI 造局術的完整模板包。學員只需要填設定，AI 幫你部署。

## 結構

```
web/              — 課程平台（LP + 結帳 + TapPay + 課程觀看）
bot/              — LINE Bot（報名 + 提醒 + 追單 + AI 回覆）
.claude/skills/   — Claude Code Skills（11 個串接工具）
prompts/          — AI 文案 Prompt（課綱、講綱、追單）
.env.example      — 所有需要填的設定
```

## 部署流程

當學員說「幫我部署」時，按這個順序：

### 1. 確認設定
- 問學員要 .env.example 裡的每一項
- 一次問一項，學員從「我的設定」筆記複製貼上
- 全部收齊再開始部署

### 2. 部署課程平台（web/）
```bash
cd web && npx zeabur@latest deploy
```
- 部署完 → 設定環境變數 → 加 MongoDB（Marketplace）

### 3. 部署 LINE Bot（bot/）
```bash
cd ../bot && npx zeabur@latest deploy
```
- 部署到同一個 Zeabur 專案 → 設定環境變數

### 4. 驗證
- LP 打開正常
- LINE 加好友有回應
- 測試卡付款通過（4242 4242 4242 4242）

## 可用的 Skills

| 指令 | 功能 |
|------|------|
| /deploy | 一鍵部署 SOP |
| /course | 課程設定（course.json） |
| /tappay | 金流串接 |
| /line-bot | LINE Bot 設定 |
| /notion | Notion 操作 |
| /meta-ads | 廣告追蹤 |
| /youtube | 直播 + 影片 |
| /github | GitHub 操作 |
| /ai-writer | AI 文案生成 |
| /funnel-check | 漏斗健康檢查 |

## 注意事項

- 部署前確認 Zeabur 有綁信用卡
- LINE Webhook 設定完要關閉自動回覆
- TapPay 測試階段用 sandbox，上線改 production
- META_PIXEL_ID 填完要重新部署才生效
