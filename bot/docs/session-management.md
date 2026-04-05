# 直播場次管理

> 最後驗證：2026-03-25

## 環境變數格式

```
SESSION_1=0324_20:00_https://youtube.com/live/xxx
SESSION_2=0331_20:00_https://youtube.com/live/yyy
```

格式：`MMDD_HH:MM_直播連結`

用 Zeabur 環境變數設定，最多 20 場（SESSION_1 ~ SESSION_20）。

## 時間解析

`getSessionTimestamp(s)` 把 month/day/time 轉成 timestamp。
直播開始後，該場次從報名列表自動隱藏（`parseSessions()` 過濾已過時間的場次）。

## 回放連結問題

目前 `buildCatchUpMessage` 的 YouTube 回放連結是 **hardcoded**（寫死在程式碼裡）。
每場直播的回放連結不同，但程式碼裡只有一個固定 URL。

**待改進：** 回放連結應從環境變數或場次設定中讀取，而非寫死。
