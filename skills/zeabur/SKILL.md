---
name: zeabur
description: Zeabur 部署與管理（建專案、部署、環境變數、Domain、重啟）
user_invocable: true
---

# Zeabur 部署與管理

學員不需要打開 Zeabur Dashboard。所有操作由 Claude Code 透過 Zeabur CLI 完成。

## 使用方式

`/zeabur` — 根據學員需求，自動判斷該做什麼

---

## 執行流程（Claude Code 自動處理）

### 首次設定

Claude Code 自動檢查 Zeabur CLI 是否安裝：
```bash
zeabur --version
```

- 沒裝 → Claude Code 自動安裝：`npm i -g zeabur`
- 沒登入 → Claude Code 執行 `zeabur auth login`，告訴學員照畫面指示完成登入

### 部署專案

**問學員：** 你要部署哪個專案？（給路徑）

Claude Code 自動執行：
1. 檢查專案目錄是否有 Dockerfile 或 package.json
2. 建立 Zeabur 專案（如果還沒有）
3. 部署程式碼
4. 設定環境變數
5. 綁定 Domain
6. 驗證服務是否正常運作

```bash
cd ~/學員的專案
zeabur deploy
```

### 設定環境變數

**問學員（一次一個）：** 你的 LINE_CHANNEL_SECRET 是什麼？

收到後 Claude Code 直接設定：
```bash
zeabur variable set LINE_CHANNEL_SECRET=xxx --service 服務名
```

重要：Zeabur variable env 是覆蓋模式，要放全部 env vars。Claude Code 會先讀取現有變數再更新。

### 綁定 Domain

Claude Code 自動處理：
```bash
zeabur domain add --domain 學員的domain --service 服務名
```

如果學員沒有自己的 domain，用 Zeabur 提供的免費 domain。

### 重啟服務

```bash
zeabur restart --service 服務名
```

### 查看 Logs

```bash
zeabur logs --service 服務名
```

學員說「部署有問題」→ Claude Code 自動查 logs，找出錯誤，直接修。

---

## 常見問題處理（Claude Code 自動排查）

| 症狀 | Claude Code 怎麼處理 |
|------|------|
| 部署失敗 | 查 build logs，找錯誤，修 code，重新部署 |
| 服務沒回應 | 檢查 port 設定、環境變數、Domain 綁定 |
| OOM 斷線 | redeploy（不是 restart），檢查記憶體用量 |
| 環境變數不見 | 用 CLI 重新設定全部變數（覆蓋模式） |
| dial tcp timeout | 檢查 port 是否跟 proxy 設定一致 |
| SSL 憑證被 LINE 拒絕 | 用自訂 domain |

---

## 部署前 Checklist（Claude Code 自動確認）

1. 確認正確的 Service ID（NEVER 部署到錯的 service）
2. 確認所有環境變數都設好
3. 確認 .env 沒有被 commit
4. 檢查 server 記憶體，避免 OOM
5. 部署完成後自動測試端點是否正常回應
6. 如果是 Bot，用管理者帳號測試對話功能

## 遷移服務

NEVER 先刪後救。正確流程：
1. 建新的 service
2. 設定環境變數
3. 部署程式碼
4. 測試通過
5. 切換 Domain
6. 確認新的正常運作
7. 才刪舊的
