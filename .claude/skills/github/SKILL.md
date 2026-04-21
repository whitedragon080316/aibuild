---
name: github
description: GitHub 帳號設定、推專案、學員 clone 模板
user_invocable: true
---

# GitHub 操作

學員只需要回答問題，Claude Code 自動完成所有 Git/GitHub 設定和操作。

## 使用方式

`/github` — 根據學員狀態，自動判斷該做什麼

---

## 執行流程（Claude Code 自動處理）

### Step 1：檢查 Git 環境

Claude Code 自動執行：
```bash
git --version
git config --global user.name
git config --global user.email
```

- 如果沒有 Git → Claude Code 執行 `xcode-select --install` 安裝
- 如果沒有設定 name/email → 問學員一個問題：

**問學員：** 你的名字和 Email？（用在 Git commit 記錄上）

收到後 Claude Code 直接執行：
```bash
git config --global user.name "學員的名字"
git config --global user.email "學員的Email"
```

### Step 2：設定 SSH 金鑰

Claude Code 自動執行：
```bash
# 檢查是否已有金鑰
ls ~/.ssh/id_ed25519.pub
```

- 如果已有 → 跳過
- 如果沒有 → Claude Code 自動產生：
```bash
ssh-keygen -t ed25519 -C "學員Email" -f ~/.ssh/id_ed25519 -N ""
```

然後 Claude Code 讀取公鑰內容，直接顯示給學員：

**告訴學員：** 請把這串金鑰加到 GitHub。步驟：GitHub 右上角頭像 > Settings > SSH and GPG keys > New SSH key > 貼上。貼完跟我說。

學員確認後，Claude Code 自動測試：
```bash
ssh -T git@github.com
```

### Step 3：推專案到 GitHub

**問學員：** 你要推哪個專案？（給路徑）

Claude Code 自動執行：
```bash
cd ~/學員的專案
git init
git add .
git commit -m "Initial commit"
gh repo create repo名 --public --source=. --push
```

如果 `gh` 沒裝，Claude Code 自動 `brew install gh && gh auth login`。

### Step 4：學員 Clone 模板

**問學員：** 你的 GitHub 帳號名稱？

Claude Code 自動執行：
```bash
git clone https://github.com/帳號/aibuild-bot.git
cd aibuild-bot
npm install
cp .env.example .env
```

然後引導學員填 .env 值（一次問一個 key）。

---

## 安全規則（Claude Code 自動處理）

- `.gitignore` 必須包含 `.env` 和 `node_modules/`，Claude Code 自動檢查並補上
- 大檔案（mp4/pdf/pptx）不 commit，Claude Code 自動加入 `.gitignore`
- clone 模板後自動改 remote 到學員自己的 repo

## Zeabur 部署

學員不需要打開 Zeabur Dashboard。Claude Code 直接用 CLI 部署：
```bash
zeabur deploy --project 專案名
```
環境變數用 CLI 設定，domain 用 CLI 綁定。
