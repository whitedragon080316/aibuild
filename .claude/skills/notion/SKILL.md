---
name: notion
description: 讓 AI 幫你自動管理 Notion（建看板、寫內容、更新進度）
user_invocable: true
---

# 讓 AI 操作你的 Notion

學員只要說「幫我建一個課程管理看板」，Claude Code 就會透過 Notion API 自動建好。學員不需要打開 Notion 後台操作任何東西。

## 這能做什麼

- 「幫我建一個課程管理看板」→ Claude Code 自動建 database + 所有卡片
- 「把這份課綱寫進 Notion」→ Claude Code 自動建頁面 + 填入步驟
- 「更新第三堂課的狀態為已完成」→ Claude Code 自動改
- 「幫我列出還沒錄的課」→ Claude Code 自動查

---

## 首次設定（一次搞定）

### Step 1：取得 Notion Token

**問學員：** 你有 Notion Token 嗎？（`ntn_` 開頭的那串）

- 如果有 → 收下，進入 Step 2
- 如果沒有 → 告訴學員：

**告訴學員：** 請到 notion.so/my-integrations，點「新增 Integration」，名稱取「AI 助手」，點提交，然後把那串 `ntn_` 開頭的 Token 貼給我。

收到 Token 後，Claude Code 自動存到環境變數。

### Step 2：連線授權

**告訴學員：** 打開你要讓我操作的 Notion 頁面，右上角 `...` > 連線 > 找到「AI 助手」> 加入。加好跟我說。

收到確認後，Claude Code 自動測試 API 連線是否正常。

### 完成。之後所有 Notion 操作都由 Claude Code 執行。

---

## 可以叫 Claude Code 做的事

### 建課程管理看板
學員說：「幫我建一個課程管理看板」
Claude Code 自動：建 database（Board 格式），欄位包含課程名稱、階段、類型（策略/建置）、時長、完成狀態，然後建入所有課程卡片。

### 寫課程步驟
學員說：「把課綱寫進 Notion」
Claude Code 自動：讀取 course.json，把每堂課的操作步驟寫進對應的 Notion 卡片，每個步驟用待辦清單格式。

### 追蹤錄課進度
學員說：「哪些課還沒錄？」
Claude Code 自動：查 Notion database，列出狀態不是「已完成」的課程。

### 從直播產出內容
學員說：「這是直播逐字稿，幫我整理成 Notion 頁面」
Claude Code 自動：建頁面，寫入重點摘要 + 金句 + 待辦事項。

---

## 常見問題處理（Claude Code 自動排查）

| 症狀 | Claude Code 怎麼處理 |
|------|------|
| API 回「找不到頁面」 | 提醒學員去那個頁面加 Integration 連線 |
| Token 無效 | 提醒學員重新建 Integration，給新 Token |
| 卡片建到錯的地方 | 重新確認正確的頁面 ID |

---

## 內部操作規則（Claude Code 讀的）

### Token 驗證（每次操作前必做）
批量操作前先驗證 token 是否有效，避免做到一半才發現 401：
```bash
curl -s -w "\n%{http_code}" "https://api.notion.com/v1/users/me" \
  -H "Authorization: Bearer TOKEN" \
  -H "Notion-Version: 2022-06-28"
```
- 200 → 正常，繼續操作
- 401 → Token 無效或過期，告訴學員：「你的 Notion Token 過期了，請到 notion.so/my-integrations 重新複製 Token 貼給我」
- 不要在 token 無效的情況下繼續嘗試任何 API 操作

### 清空頁面 blocks 必須用 Python
shell 的 curl + python3 -c 組合處理 Notion JSON 會遇到控制字元問題。一律用 Python script：
```python
import json, urllib.request
# 用 urllib.request，不要用 shell curl
```

### 寫入流程三步一體
1. 清空所有 blocks（Python 刪除）
2. 寫入新 blocks（Python PATCH）
3. 驗證：重新 GET children 確認數量正確

### Database 建立
- 一律 `is_inline: false`
- 建完提醒學員加 Integration 連線
- 階段名稱統一格式：「S1 大局觀」不是「Stage 1 大局觀」

### 批次操作
- 一次最多 100 個 blocks
- 超過的分批處理
- 每次 API call 後 sleep 0.3 秒避免 rate limit

## 小提醒

- Notion 免費版就夠用，不用付費
- 一個 Integration 可以操作多個頁面（只要都加了連線）
- Board view（看板模式）需要學員手動切，API 沒辦法設定 view
