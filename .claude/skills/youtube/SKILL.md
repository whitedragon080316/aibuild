---
name: youtube
description: YouTube 影片管理、課程嵌入、播放速度控制
user_invocable: true
---

# YouTube 操作

Claude Code 自動處理影片嵌入、course.json 設定、播放器程式碼。學員只需要提供影片連結。

## 使用方式

`/youtube` — 根據學員需求，自動判斷該做什麼

---

## 執行流程（Claude Code 自動處理）

### 課程影片嵌入

**問學員：** 你要嵌入哪支影片？（貼 YouTube 連結）

Claude Code 自動做：
- 把任何格式的 YouTube URL 轉換成 embed 格式
- 更新 course.json 對應單元的 `videoUrl`
- 加上參數 `?rel=0&modestbranding=1`

URL 轉換邏輯（Claude Code 自動處理）：
```
https://youtu.be/VIDEO_ID → https://www.youtube.com/embed/VIDEO_ID
https://www.youtube.com/watch?v=VIDEO_ID → https://www.youtube.com/embed/VIDEO_ID
```

沒影片的單元 `videoUrl` 留空字串 `""`，前端會顯示「即將上線」。

### 批次設定影片

**問學員：** 你有幾支影片要設定？把影片連結和對應的課程單元列出來。

Claude Code 自動做：
- 批次更新 course.json 所有影片連結
- 驗證每支影片的 embed URL 格式正確

---

### 直播設定

**問學員（一次一個）：**
1. 你的 YouTube 串流金鑰？（從 YouTube Studio 複製）
2. 直播標題？

Claude Code 自動做：
- 設定 OBS 串流參數（如果學員用 OBS）
- 直播結束後，問學員影片 ID，自動設定 `REPLAY_URL` 環境變數

---

### 播放速度控制

當課程平台需要播放速度控制，Claude Code 自動在前端程式碼中加入：
- YouTube IFrame API 載入
- 速度按鈕（0.75x / 1x / 1.25x / 1.5x / 2x）
- 切換影片時自動 destroy 舊 player 再建新的

---

## 影片可見度建議

| 用途 | 可見度 | 原因 |
|------|--------|------|
| 課程影片 | 不公開 | 只有有連結的付費學員能看 |
| 直播 | 不公開 | 透過 Bot 發連結給報名的人 |
| 短影音 | 公開 | 免費內容，引流用 |
| 回放 | 不公開 | 追單時發連結 |

## 字幕

YouTube 自動字幕會自動產生，不需要在課程平台端處理。如果學員有 .srt 檔案要上傳，告訴學員到 YouTube Studio > 影片 > 字幕 > 新增語言 > 上傳 .srt。
