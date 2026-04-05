# 再行銷操作 SOP

> 最後驗證：2026-03-25

## 查詢狀態

```
GET /remarketing/status
```
回傳每個用戶每一波的發送狀態（waves）、是否已轉換（converted）。

```
GET /funnel
```
回傳報名人數、完課人數（777）、報名意願人數、各場次人數。

## 手動補發

```
# Step 1: Preview（不會實際發送）
GET /remarketing/resend?session=0324&wave=wave2&segment=attended

# Step 2: 確認無誤後才發送
GET /remarketing/resend?session=0324&wave=wave2&segment=attended&confirm=true
```

### 參數說明

| 參數 | 必填 | 說明 |
|------|------|------|
| session | Y | 場次日期，如 `0324` |
| wave | Y | 波次，如 `wave1`~`wave6` |
| segment | N | 強制分群：`attended`/`absent`/`replay`。不帶則自動判斷 |
| confirm | N | 設為 `true` 才會實際發送，否則只 preview |

## 安全規範

1. **永遠先 preview** — 不帶 `confirm=true` 先看人數和分群
2. **確認 segment** — 不要讓自動判斷決定，手動指定最安全
3. **測試用假場次** — `session=9999` 測試端點行為，不要用真場次
4. **LINE push 不可撤回** — 發出去就收不回來，三思而後行
5. **檢查 completions** — 先看 `/funnel` 的完課人數，0 的話所有人都會被判為未到課
