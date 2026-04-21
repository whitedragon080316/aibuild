---
name: course
description: 課程設定（course.json 編輯、影片嵌入、LP 客製化）
user_invocable: true
---

# 課程設定

學員說要改什麼，Claude Code 直接改好。學員不需要打開任何檔案、後台、網頁。

## 使用方式

`/course` — 讀取 course.json，顯示目前課程架構摘要

## 執行原則

- 學員只跟 Claude Code 對話，所有技術操作由 Claude Code 完成
- 一次只問學員一個問題，拿到答案就立刻執行
- NEVER 叫學員打開檔案、後台、Dashboard、瀏覽器
- 學員給值，Claude Code 立刻寫入、部署、生效

## 流程

### 1. 新增課程

問學員：「這堂課的標題是什麼？」

拿到標題後，Claude Code 自動：
- 判斷放在哪個 stage（不確定才問）
- 生成 id（格式 `s{階段}-{順序}`，自動避免重複）
- `videoUrl` 預設 `""`（前端顯示「即將上線」）
- `duration` 預設 `"0:00"`（有影片時再更新）
- 寫入 course.json

之後再問：「有 YouTube 連結嗎？沒有的話先跳過。」

如果有連結，Claude Code 自動轉換成 embed 格式寫入：
```
youtu.be/VIDEO_ID → https://www.youtube.com/embed/VIDEO_ID
youtube.com/watch?v=VIDEO_ID → https://www.youtube.com/embed/VIDEO_ID
```

### 2. 嵌入影片

問學員：「哪一堂課？把 YouTube 連結貼給我。」

Claude Code 自動：
- 轉換成 embed 格式
- 寫入對應 lesson 的 `videoUrl`
- 回報完成

### 3. 調整價格

問學員：「要改成多少？」

Claude Code 自動修改 course.json 的 `price` 和 `priceV2`。結帳頁自動讀取，不用另外改。

### 4. 調整順序

問學員：「要怎麼排？」

Claude Code 直接改 stages/lessons 陣列順序。id 不動，前端按陣列順序渲染。

### 5. LP 客製化

問學員：「要改哪個區塊？改成什麼內容？」

Claude Code 直接編輯 `views/lp.html`，可改的區塊：

| 區塊 | 搜尋關鍵字 |
|------|-----------|
| 標題 | `hero-title` |
| 副標題 | `hero-subtitle` |
| 痛點 | `pain-point` |
| 講師介紹 | `instructor` |
| FAQ | `faq` |
| CTA 按鈕 | `cta-button` |

品牌色也由 Claude Code 直接改 CSS：
- 主色：`#3B5BDB`（品牌藍）
- 強調：`#a855f7`（紫）
- CTA：`#d4922a`（金）

### 6. 結帳頁

問學員：「兩個方案的差異描述要寫什麼？」

Claude Code 直接編輯 `views/checkout.html` 的方案卡片區。價格從 course.json 自動讀取。

## course.json 結構（Claude Code 參考用）

```json
{
  "title": "課程名稱",
  "subtitle": "副標題",
  "instructor": "講師名",
  "price": 49800,
  "priceV2": 79800,
  "stages": [
    {
      "id": "s1",
      "title": "階段名稱",
      "description": "一行描述",
      "lessons": [
        {
          "id": "s1-1",
          "title": "課程標題",
          "videoUrl": "https://www.youtube.com/embed/VIDEO_ID",
          "duration": "15:00"
        }
      ]
    }
  ]
}
```

## 注意事項（Claude Code 自己處理，不用告訴學員）

- course.json 改完後需要重新部署或重啟 service 才生效
- 影片 URL 必須是 embed 格式，Claude Code 自動轉換
- LP 的 OG 圖片需要設定 `<meta property="og:image">`
- 不要刪 course.json 的 `id` 欄位，進度追蹤靠它
