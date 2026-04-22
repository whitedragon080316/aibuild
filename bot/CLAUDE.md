# 線上課程 LINE Bot 模板

操作此專案前，先讀 `docs/INDEX.md` 了解系統架構。

## 系統架構速覽

```
index.js (主程式) — webhook 處理、報名、提醒、追單、AI 分身
lib/flex-cards.js — 所有 Flex 卡片建構函式
prompts/ai-workers/
  ai-avatar.md             — AI 分身 system prompt（雙模式：教練/招募）
  chase-copywriter.md      — 追單文案工具人 prompt
  content-factory.md       — 內容工廠 prompt
  post-livestream-pipeline.md — 直播後主控流程
```

## 訊息處理流程（由上到下，先匹配先回）

```
1. 加好友 → 歡迎+分眾選單
2. 貼圖 → 引導報名
3. 直播期間發訊息 → 自動標記到課
4. 管理者 → AI 意圖辨識 → 管理指令
5. 777 → 領講義+補建再行銷
6. 分眾按鈕 → 對應回覆
7. 再行銷分支按鈕 → Flex 卡片
8. 報名意願/報名問題/猶豫 → 對應 Flex 卡片
9. 痛點診斷按鈕 → Flex 卡片
10. 異議處理按鈕 → 文字回覆
11. 日期匹配 → 報名+排程提醒+再行銷
12. AI 分身 fallback → Claude API 回覆（有對話記憶）
    → 答不了 → 轉接真人通知管理者
```

## 再行銷（混合模式）

```
Wave 1 (+2h)  → Flex 卡片：感謝+痛點按鈕+777
Wave 2 (D+1)  → AI 文字 or Flex fallback
Wave 3 (D+2)  → AI 文字 or Flex fallback
Wave 4 (D+3)  → Flex 卡片：早鳥截止+價格
Wave 5 (D+4)  → AI 文字 or Flex fallback
Wave 6 (D+5)  → Flex 卡片：最後通知+報名按鈕
```

AI 版只需生成 wave 2,3,5 × 3 分眾 = 9 則。

## 規則

- NEVER 直接 pushMessage — 必須先 preview 確認對象和內容（推播不可撤回）
- NEVER 把已到課版追單發給未到課的人 — 回 777 = 完課 = 主力銷售對象
- NEVER 用真實場次測試 — MUST 用 session=9999
- MUST 先不帶 confirm 看 preview，確認後才加 confirm=true
- MUST 優先用 Flex 卡片回覆，AI 分身只補位
- MUST 修改 appData 結構時同步 initDB/loadData/saveData/初始值四處

## 環境變數

學員必須設定的（參考 .env.example）：

```
# 必填
CHANNEL_ACCESS_TOKEN=     ← LINE Developers 取得
CHANNEL_SECRET=           ← LINE Developers 取得
ADMIN_USER_ID=            ← 你的 LINE User ID
BRAND_NAME=               ← 你的品牌名
INSTRUCTOR_NAME=          ← 你的名字
SYSTEM_NAME=              ← 你的課程名稱

# 金流
TAPPAY_PARTNER_KEY=       ← TapPay Portal 取得
TAPPAY_MERCHANT_ID=       ← TapPay Portal 取得

# 廣告追蹤
META_PIXEL_ID=            ← Meta 企業管理平台取得
```

## 部署

```bash
npx zeabur@latest deploy
```

## 客製化

- 改品牌名/價格/文案 → 改 .env 環境變數
- 改 Flex 卡片樣式 → 改 lib/flex-cards.js
- 改 AI 分身個性 → 改 prompts/ai-workers/ai-avatar.md
- 改追單文案風格 → 改 prompts/ai-workers/chase-copywriter.md
- 改 LP 內容 → 改 lp.html 的 {{模板變數}}

## 踩坑紀錄

見 `docs/pitfalls.md` — 操作前必讀，避免重複犯錯。
