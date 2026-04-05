---
name: course
description: 課程設定（course.json 編輯、影片嵌入、LP 客製化）
user_invocable: true
---

# 課程設定

編輯 course.json、嵌入影片、客製化 LP 和結帳頁。

## 使用方式

`/course` — 顯示目前課程設定狀態

## 行為

1. 讀取 `course.json` 顯示目前課程架構
2. 根據需求執行修改

## course.json 結構

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

## 常用操作

### 新增一堂課

在對應 stage 的 lessons 陣列加入：
```json
{ "id": "s1-5", "title": "新課程標題", "videoUrl": "", "duration": "10:00" }
```

- `id` 格式：`s{階段}-{順序}`，不能重複
- `videoUrl` 留空 `""` → 前端顯示「即將上線」
- `duration` 格式：`MM:SS`

### 嵌入 YouTube 影片

```
# YouTube 分享連結 → 嵌入格式
https://youtu.be/VIDEO_ID
→ https://www.youtube.com/embed/VIDEO_ID

# YouTube 一般連結 → 嵌入格式
https://www.youtube.com/watch?v=VIDEO_ID
→ https://www.youtube.com/embed/VIDEO_ID
```

影片必須設為「不公開」（只有連結的人能看）。

### 調整價格

修改 course.json 的 `price` 和 `priceV2`：
```json
{
  "price": 49800,
  "priceV2": 79800
}
```

結帳頁會自動讀取這兩個價格。

### 調整階段順序

直接改 stages 陣列順序，id 不用動。前端按陣列順序渲染。

## LP 客製化

LP 在 `views/lp.html`，可改的地方：

| 區塊 | 搜尋關鍵字 | 改什麼 |
|------|-----------|--------|
| 標題 | `hero-title` | 課程大標題 |
| 副標題 | `hero-subtitle` | 一句話描述 |
| 痛點 | `pain-point` | 目標受眾的痛點 |
| 課綱 | 自動從 course.json 讀 | 不用改 LP |
| 講師 | `instructor` | 講師介紹 |
| FAQ | `faq` | 常見問題 |
| CTA | `cta-button` | 按鈕文字和連結 |

### 改品牌色

搜尋 CSS 變數或 TailwindCSS class，主要顏色：
- 主色：`#3B5BDB`（品牌藍）
- 強調：`#a855f7`（紫）
- CTA：`#d4922a`（金）

## 結帳頁

`views/checkout.html`，v1/v2 雙方案自動從 course.json 讀價格。

v1 和 v2 的差異描述在 checkout.html 的方案卡片區，需要手動編輯。

## ⚠️ 注意

- course.json 改完後需要**重新部署**或**重啟 service** 才生效
- 影片 URL 必須是 embed 格式，不是一般連結
- LP 的 OG 圖片（社群分享預覽）需要另外設定 `<meta property="og:image">`
- 不要刪 course.json 的 `id` 欄位，進度追蹤靠它
