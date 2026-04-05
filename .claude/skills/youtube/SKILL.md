---
name: youtube
description: YouTube 直播設定、不公開影片、IFrame 嵌入、播放速度控制
user_invocable: true
---

# YouTube 操作

直播設定、不公開影片管理、課程影片嵌入、播放速度控制。

## 使用方式

`/youtube` — 顯示可用操作

## 直播設定 SOP

### Step 1：建立直播

1. YouTube Studio → 建立 → 進行直播
2. 串流金鑰 → 複製（給 OBS 用）
3. 可見度 → 選「不公開」（只有連結的人能看）
4. 標題 + 說明填好

### Step 2：OBS 串接

1. 下載 OBS Studio：https://obsproject.com/
2. 設定 → 串流 → 服務選 YouTube → 貼上串流金鑰
3. 加入來源：螢幕擷取 / 視訊擷取 / 簡報視窗
4. 開始串流

### Step 3：直播後處理

1. 直播結束後 → YouTube Studio → 內容
2. 找到直播影片 → 可見度改「不公開」
3. 複製影片連結 → 當作回放連結
4. 設定環境變數：`REPLAY_URL=https://youtube.com/watch?v=影片ID`

## 課程影片嵌入

### URL 格式

```
# 一般影片
https://www.youtube.com/embed/VIDEO_ID

# 從分享連結轉換
https://youtu.be/VIDEO_ID → https://www.youtube.com/embed/VIDEO_ID

# 帶參數
https://www.youtube.com/embed/VIDEO_ID?rel=0&modestbranding=1
```

### course.json 設定

```json
{
  "id": "s1-1",
  "title": "課程標題",
  "videoUrl": "https://www.youtube.com/embed/VIDEO_ID",
  "duration": "15:00"
}
```

沒影片的單元 `videoUrl` 留空字串 `""`，前端會顯示「即將上線」。

## 播放速度控制（YouTube IFrame API）

### HTML

```html
<div id="player"></div>
<div id="speed-controls">
  <button onclick="setSpeed(0.75)">0.75x</button>
  <button onclick="setSpeed(1)" class="active">1x</button>
  <button onclick="setSpeed(1.25)">1.25x</button>
  <button onclick="setSpeed(1.5)">1.5x</button>
  <button onclick="setSpeed(2)">2x</button>
</div>
```

### JavaScript

```javascript
// 載入 YouTube IFrame API
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

var player;
var currentSpeed = 1;

// API 載入完成後自動呼叫
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: 'VIDEO_ID',
    playerVars: {
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: function(e) { e.target.setPlaybackRate(currentSpeed); }
    }
  });
}

function setSpeed(rate) {
  currentSpeed = rate;
  if (player && player.setPlaybackRate) {
    player.setPlaybackRate(rate);
  }
  // 更新按鈕 active 狀態
  document.querySelectorAll('#speed-controls button').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.textContent) === rate);
  });
}
```

### ⚠️ 注意

- YouTube IFrame API 需要用 `YT.Player` 建立播放器，不能用普通 `<iframe>`
- `onYouTubeIframeAPIReady` 是全域函數，API 載入後自動呼叫
- 切換影片時要 destroy 舊 player 再建新的：
  ```javascript
  if (player) player.destroy();
  player = new YT.Player('player', { videoId: newId, ... });
  ```

## 字幕

YouTube 自動字幕：
1. YouTube Studio → 影片 → 字幕
2. YouTube 會自動產生字幕（需等待處理）
3. 可手動修正自動字幕

手動上傳 SRT：
1. YouTube Studio → 影片 → 字幕 → 新增語言
2. 上傳 .srt 檔案

**課程嵌入影片的字幕由 YouTube 控制，不需要在平台端處理。**

## 影片可見度建議

| 用途 | 可見度 | 原因 |
|------|--------|------|
| 課程影片 | 不公開 | 只有有連結的付費學員能看 |
| 直播 | 不公開 | 透過 Bot 發連結給報名的人 |
| 短影音 | 公開 | 免費內容，引流用 |
| 回放 | 不公開 | 追單時發連結 |
