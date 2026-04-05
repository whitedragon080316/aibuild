---
name: notion
description: 讓 AI 幫你自動管理 Notion（建看板、寫內容、更新進度）
user_invocable: true
---

# 讓 AI 操作你的 Notion

你只要跟 Claude Code 說「幫我在 Notion 建一個課程管理看板」，AI 就會自動幫你建好。

## 這能做什麼

- 「幫我建一個課程管理看板」→ AI 自動建 database + 所有卡片
- 「把這份課綱寫進 Notion」→ AI 自動建頁面 + 填入步驟
- 「更新第三堂課的狀態為已完成」→ AI 自動改
- 「幫我列出還沒錄的課」→ AI 自動查

## 怎麼串起來（一次設定，永久使用）

### Step 1：建立 Notion Integration

1. 打開 https://www.notion.so/my-integrations
2. 點「新增 Integration」
3. 名稱隨便取（如「AI 助手」）
4. 點「提交」
5. 複製那串 Token（`ntn_` 開頭的）

### Step 2：告訴 Claude Code 你的 Token

跟 Claude Code 說：
```
我的 Notion Token 是 ntn_xxxxx
```

或存到環境變數：
```
NOTION_TOKEN=ntn_xxxxx
```

### Step 3：讓 Notion 允許 AI 存取

這一步很多人忘記，會導致 AI 說「找不到你的頁面」：

1. 打開你要讓 AI 操作的 Notion 頁面
2. 右上角 `···` → 「連線」→ 找到你剛建的 Integration → 加入
3. **每個新的 database 都要做這一步**

### 完成！

現在你可以對 Claude Code 說：
- 「在這個頁面下建一個課程管理看板」
- 「幫我加 10 堂課的卡片進去」
- 「每張卡片寫上錄影時要做的步驟」

## 你可以叫 AI 幫你做的事

### 建課程管理看板

```
幫我在 Notion 建一個課程管理看板，用 Board view，
按階段分組，每張卡片有：課程名稱、階段、類型（策略/建置）、
時長、完成狀態
```

### 寫課程步驟

```
讀取 course.json，把每堂課的操作步驟寫進對應的 Notion 卡片，
每個步驟用待辦清單格式，學員可以邊看邊打勾
```

### 追蹤錄課進度

```
幫我看一下 Notion 看板，哪些課還沒錄？列出來
```

### 從直播產出內容

```
這是直播逐字稿，幫我整理成 Notion 頁面：
重點摘要 + 金句 + 待辦事項
```

## ⚠️ 常見問題

| 問題 | 原因 | 解法 |
|------|------|------|
| AI 說「找不到頁面」 | 沒加 Integration 連線 | 回 Step 3，在那個頁面加連線 |
| 看板沒有分組 | Notion API 不能設 view | 手動：看板右上角 → Group by → 選「階段」 |
| 卡片建到錯的地方 | 給錯頁面連結 | 複製正確的 Notion 頁面連結給 AI |
| Token 過期 | Integration 被刪了 | 回 Step 1 重新建一個 |

## 小提醒

- Notion 免費版就夠用，不用付費
- 一個 Integration 可以操作多個頁面（只要都加了連線）
- AI 建的看板跟你手動建的一模一樣，你隨時可以手動改
- Board view（看板模式）需要你手動切，AI 沒辦法幫你切
