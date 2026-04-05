# API 端點一覽

> 最後驗證：2026-03-26

## 公開端點

| 端點 | 方法 | 用途 |
|------|------|------|
| `/webhook` | POST | LINE Bot webhook |
| `/lp` | GET | Landing page |
| `/funnel` | GET | 漏斗數據（報名/完課/意願） |
| `/track` | GET | 廣告追蹤連結（?src=xxx） |
| `/track-replay` | GET | 回放追蹤連結 |
| `/track/stats` | GET | 追蹤統計 |
| `/wc-webhook` | POST | WooCommerce 訂單 webhook |

## 需要 token 的端點

需帶 `?token=ADMIN_API_TOKEN` 或 header `x-admin-token`。

| 端點 | 方法 | 用途 |
|------|------|------|
| `/remarketing/status` | GET | 每用戶每波的發送狀態 |
| `/remarketing/resend` | GET | 手動補發（需 confirm=true） |
| `/remarketing/mark-completed` | POST | 手動標記完課 |
| `/ads/report` | GET | 廣告成效報表 |
| `/ads/test` | GET | 測試 Meta API 連線 |
| `/ads/recent-users` | GET | 最近廣告來源用戶 |

用法：
```
curl "https://knownu-line-bot-2.zeabur.app/remarketing/status?token=knownu-admin-2026"
```
