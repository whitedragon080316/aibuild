# 再行銷漏斗

> 最後驗證：2026-03-25

## 漏斗流程

```
廣告 → 加LINE → 報名直播 → 看直播 → 回777完課 → 再行銷銷售 → 報名正式課程 → 付款
```

## 三種分群

| 分群 | 判斷條件 | 再行銷策略 | function |
|------|---------|-----------|----------|
| 已完課 | `completions[userId]` 有值（回了 777） | 銷售腳本：異議處理→見證→早鳥→截止 | `buildWaveMessage()` |
| 看過回放 | `replayClicks[userId]` 有值 | 催完課 + 輕銷售 | `buildCatchUpMessage()` |
| 未到課 | 以上都沒有 | 催看回放 → 催完課 | `buildCatchUpMessage()` |

**重點：回 777 的完課者是主力銷售對象。已到課版才是銷售核心。**

## AI 工具人優先

每波發送時優先取 `buildAIWaveMessage(waveKey, segment)`，沒有才 fallback 到寫死版本。
AI 工具人產出存在 `appData.aiChaseMessages`（PostgreSQL `app_data` 表 key=`aiChaseMessages`）。

## 6 波時間軸

以直播開始時間為基準（`sessionTime`）。

| 波次 | offset | 已完課版 | 未到課版 |
|------|--------|---------|---------|
| wave1 | +2h | 痛點診斷（5種卡點）+ 777領檢查表 | 催看回放（48h下架） |
| wave2 | +24h (D+1) | 異議處理（3大常見問題） | 倒數24h催回放 |
| wave3 | +48h (D+2) | 深度學員故事（阿凱：零基礎→月入15萬） | 回放已下架+張力思維概念 |
| wave4 | +72h (D+3) | 早鳥截止（原價$88,800→$43,800） | 早鳥截止（未到課版） |
| wave5 | +96h (D+4) | 資深老師見證（花百萬還是空虛→找到拼圖） | 資深老師見證 |
| wave6 | +120h (D+5) | 最後通知 | 最後通知（導向下場直播） |

## 轉換節點

| 觸發 | 動作 | 影響 |
|------|------|------|
| 回 `777` | 標記 `completions[userId]`，發完整檢查表 | 後續波次走已完課版 |
| 回「該如何報名正式課程」 | 標記 `courseInterest`，24h後確認 | 追蹤報名意願 |
| 回「我已完成報名」 | 標記 `converted=true` | 停止所有再行銷 |
| WooCommerce webhook | 標記 `converted=true` | 停止所有再行銷 |

## 重啟恢復

服務重啟時 `restoreReminders()` 會從 PostgreSQL 載入資料，重新排程所有未發的波次。
時間已過的波次會自動補發（每波間隔 3 秒），已標記 `waves[key]=true` 的不會重發。
