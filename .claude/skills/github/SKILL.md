---
name: github
description: GitHub 帳號設定、推專案、學員 clone 模板
user_invocable: true
---

# GitHub 操作

帳號設定、SSH 金鑰、推專案、學員 clone 模板部署。

## 使用方式

`/github` — 顯示可用操作

## Step 1：GitHub 帳號註冊

1. 前往 https://github.com/
2. Sign up → 填 Email、密碼、Username
3. 完成 Email 驗證

## Step 2：安裝 Git

```bash
# macOS（通常已內建）
git --version

# 如果沒有，安裝 Xcode Command Line Tools
xcode-select --install

# Windows
# 下載 https://git-scm.com/download/win
```

## Step 3：設定 Git

```bash
git config --global user.name "你的名字"
git config --global user.email "你的Email"
```

## Step 4：SSH 金鑰（推薦）

```bash
# 產生金鑰
ssh-keygen -t ed25519 -C "你的Email"
# 按 Enter 三次（預設路徑 + 不設密碼）

# 複製公鑰
cat ~/.ssh/id_ed25519.pub | pbcopy  # macOS
# Windows: cat ~/.ssh/id_ed25519.pub | clip

# 到 GitHub → Settings → SSH and GPG keys → New SSH key → 貼上

# 測試連線
ssh -T git@github.com
# 應該看到：Hi username! You've been authenticated
```

## 推專案到 GitHub

### 新專案

```bash
cd ~/你的專案
git init
git add .
git commit -m "Initial commit"

# 在 GitHub 建立新 repo（不要勾 README）
# 然後：
git remote add origin git@github.com:你的帳號/repo名.git
git branch -M main
git push -u origin main
```

### 用 gh CLI（更快）

```bash
# 安裝 gh
brew install gh  # macOS

# 登入
gh auth login

# 建 repo + 推上去
cd ~/你的專案
git init && git add . && git commit -m "Initial commit"
gh repo create repo名 --public --source=. --push
```

## 學員 Clone 模板

```bash
# Clone
git clone https://github.com/帳號/aibuild-bot.git
cd aibuild-bot

# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入你的 KEY

# 本地測試
node index.js
```

## ⚠️ 常見踩坑

### 1. .env 不要推上去
確認 `.gitignore` 有：
```
.env
node_modules/
```

### 2. 大檔案
GitHub 單檔限制 100MB。影片、PDF 不要 commit。
```
# .gitignore 加入
*.mp4
*.pdf
*.pptx
```

### 3. clone 後改 remote
學員 clone 模板後，要改成自己的 repo：
```bash
git remote set-url origin git@github.com:學員帳號/我的專案.git
git push -u origin main
```

### 4. Token 認證（如果不用 SSH）
GitHub 已停用密碼認證。如果不用 SSH，需要 Personal Access Token：
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token → 勾 repo 權限
3. 推 code 時密碼欄貼 Token

## Zeabur 從 GitHub 部署

1. Zeabur Dashboard → 新增 Service → Git
2. 選 GitHub repo
3. Zeabur 自動偵測 Dockerfile 或 Node.js
4. 設定環境變數
5. 部署完成 → 綁 domain
