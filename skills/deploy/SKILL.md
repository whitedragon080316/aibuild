---
name: deploy
description: 一鍵部署課程系統到 Zeabur + 安裝 Claude Code Skills
user_invocable: true
---

# 一鍵部署

學員說「幫我部署」或 `/deploy`，Claude Code 引導完成所有步驟。

## 流程

### Step 1：部署到 Zeabur

**問學員：** 你已經部署到 Zeabur 了嗎？

- 已經部署了 → 跳到 Step 3
- 還沒 → 幫他開部署頁面：

```bash
open "https://zeabur.com/templates/HOIJXC"
```

**告訴學員：**
> 我幫你打開了部署頁面。點「Deploy」→ 填你的課程名稱 → 選 Tokyo 地區 → 部署。
> 部署好了跟我說。

### Step 2：綁網域

**告訴學員：**
> 到 Zeabur Dashboard，幫 web 和 bot 各綁一個網域（點 service → Networking → Generate Domain）。
> 綁好後把兩個網址貼給我。

收到後，用 CLI 設定環境變數：
```bash
npx zeabur@latest variable create --id WEB_SERVICE_ID \
  --key "PUBLIC_BASE_URL=web網址" -y -i=false
npx zeabur@latest variable create --id BOT_SERVICE_ID \
  --key "WEB_URL=web網址" -y -i=false
```

### Step 3：下載課程系統

```bash
cd ~
git clone https://github.com/whitedragon080316/aibuild.git
```

這會下載完整系統：CLAUDE.md（AI 助手指南）+ Skills（能力擴充）+ 程式碼。之後的所有設定都由 Claude Code 自動引導。每次開 Claude Code 會自動 `git pull` 更新到最新版。

### Step 4：健康檢查

部署完成後，自動跑健康檢查（讀 CLAUDE.md 裡的流程），告訴學員哪些設定還沒做：

> 你的系統目前狀態：
> LINE Bot ❌ 還沒設定
> 品牌 ❌ 還沒設定
> 金流 ❌ 還沒設定
> 要從哪個開始？

然後按 CLAUDE.md 裡的設定流程逐一引導。

---

## 已有舊版的學員

學員如果之前已經部署過（舊版沒有 CLAUDE.md），執行更新：

```bash
cd ~/aibuild && git pull origin main
```

這會拉到最新的 CLAUDE.md，之後 Claude Code 會自動偵測缺的設定。

---

## 怎麼找 Service ID

```bash
npx zeabur@latest project list -i=false
npx zeabur@latest service list --project-id PROJECT_ID -i=false
```

bot service 通常叫 `bot`，web 通常叫 `web`。

---

## 常見問題

| 問題 | 處理 |
|------|------|
| Zeabur 部署失敗 | 檢查信用卡是否綁定、地區選 Tokyo |
| git clone 失敗 | 檢查是否安裝 git：`git --version`，沒有就 `xcode-select --install` |
| Service 一直 Deploying | 等 2-3 分鐘，還不行就 redeploy |
| MongoDB 連不上 | 確認 mongodb service 在同一個 project 裡 |
