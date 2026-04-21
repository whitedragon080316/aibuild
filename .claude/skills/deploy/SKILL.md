---
name: deploy
description: 一鍵部署 aibuild-bot + aibuild-web 到 Zeabur
user_invocable: true
---

# 一鍵部署

學員說 `/deploy`，Claude Code 全自動完成部署。學員不需要打開任何網頁或後台。

## 流程總覽

1. Clone 模板到本機
2. 部署 Bot 到 Zeabur
3. 設定 Bot 環境變數
4. 部署 Web 到同一專案
5. 設定 Web 環境變數
6. 加 MongoDB
7. 綁定網域
8. 設定 LINE Webhook
9. 驗證全部服務

---

## 執行規則

- 一次只問學員一個問題
- 學員給值，Claude Code 立刻用 CLI 設好，不叫學員去任何後台
- 所有 Zeabur 操作用 `npx zeabur@latest` CLI 完成
- 所有 LINE 設定用 LINE Messaging API 完成
- 能自動判斷的就不要問

---

## Step 1：Clone 模板

直接執行，不需要問學員：

```bash
cd ~
git clone https://github.com/whitedragon080316/aibuild-bot.git
git clone https://github.com/whitedragon080316/aibuild-web.git
```

---

## Step 2：收集資訊（一次問一個）

依序問學員以下資訊，每次只問一個，拿到答案再問下一個：

1. 「你的品牌名是什麼？（例如：知脊整聊學院）」
2. 「你的名字？（講師名，會顯示在課程裡）」
3. 「課程名稱？（例如：AI 造局術）」
4. 「課程售價？（數字就好，例如 49800）」
5. 「你的 LINE Channel Access Token？（到 LINE Developers Console > 你的 Channel > Messaging API > Channel access token 複製）」
6. 「你的 LINE Channel Secret？（同頁面上方 Basic settings > Channel secret）」
7. 「你的 LINE User ID？（同頁面 Basic settings > Your user ID）」
8. 「你的 TapPay Partner Key？」
9. 「你的 TapPay Merchant ID？」
10. 「你的 TapPay App ID？」
11. 「你的 TapPay App Key？」
12. 「你的 Meta Pixel ID？（沒有的話先跳過）」

收到每個值後，先存起來，全部收完再一次設定。

---

## Step 3：部署 Bot

```bash
cd ~/aibuild-bot
npx zeabur@latest deploy
```

Claude Code 操作：
- 建立新專案，名稱用品牌名轉 kebab-case
- 地區選 Tokyo

部署完成後，用 Zeabur CLI 設定所有環境變數：

```
LINE_CHANNEL_TOKEN=（學員給的值）
LINE_CHANNEL_SECRET=（學員給的值）
ADMIN_USER_ID=（學員給的值）
BRAND_NAME=（學員給的值）
INSTRUCTOR_NAME=（學員給的值）
SYSTEM_NAME=（學員給的值）
COURSE_NAME=（學員給的值）
COURSE_PRICE=（學員給的值）
```

---

## Step 4：部署 Web

```bash
cd ~/aibuild-web
npx zeabur@latest deploy
```

選同一個專案，讓兩個 service 在同一個 project。

部署完成後設定環境變數：

```
SITE_NAME=（課程名稱）
BRAND_NAME=（品牌名）
PUBLIC_BASE_URL=（部署後取得的 URL）
LINE_CHANNEL_TOKEN=（同上）
LINE_CHANNEL_SECRET=（同上）
TAPPAY_PARTNER_KEY=（學員給的值）
TAPPAY_MERCHANT_ID=（學員給的值）
TAPPAY_APP_ID=（學員給的值）
TAPPAY_APP_KEY=（學員給的值）
TAPPAY_ENV=sandbox
META_PIXEL_ID=（學員給的值，沒有就不設）
```

---

## Step 5：加 MongoDB

用 Zeabur CLI 在同一個專案加 MongoDB service。MONGODB_URI 會自動注入。

---

## Step 6：綁定網域

用 Zeabur CLI 幫 aibuild-web 綁定 Zeabur 子網域。取得 URL 後回填 PUBLIC_BASE_URL。

---

## Step 7：設定 LINE Webhook

用 LINE Messaging API 自動設定：
- Webhook URL 設為 `https://bot服務網域/webhook`
- 開啟 Use webhook
- 關閉 Auto-reply messages
- 關閉加入好友的歡迎訊息

告訴學員：「Webhook 已設定完成。」

---

## Step 8：自動驗證

Claude Code 自動跑以下檢查，逐項報告結果：

**Bot 驗證：**
- [ ] Webhook URL verify 成功
- [ ] Bot service 狀態正常（無 OOM、無 crash）

**Web 驗證：**
- [ ] LP 頁面可正常開啟（curl 回 200）
- [ ] PUBLIC_BASE_URL 正確

**MongoDB 驗證：**
- [ ] MONGODB_URI 已注入
- [ ] MongoDB service 狀態正常

全部通過後告訴學員：「部署完成！用手機加你的 LINE Bot 好友測試看看。」

---

## 常見問題自動修復

| 症狀 | Claude Code 自動做 |
|------|-------------------|
| Webhook Verify 失敗 | 檢查 Bot service 狀態、Channel Secret 是否正確，自動修正 |
| MongoDB 連不上 | 確認在同一個 project，重新注入 MONGODB_URI |
| LP 打不開 | 檢查 PUBLIC_BASE_URL、重新綁定網域 |
| 部署後 OOM | 檢查 Zeabur plan，提醒學員升級到至少 512MB |

---

## 上線切換

學員說「我要上線」時，Claude Code 自動改：

```
TAPPAY_ENV=production
```

然後問學員：
- 「正式的 Meta Pixel ID？（如果之前用測試的）」
- 「正式網域？（如果要換自訂網域）」

拿到值後立刻用 CLI 更新，不需要學員去任何後台。

---

## 部署卡關怎麼辦 — push-and-deploy wrapper 模式

### 為什麼需要這個

寫 Bot 一段時間後你會遇到這個情境：

1. 改好 code，`git push` 到 GitHub
2. Zeabur 應該會自動拉新 commit 重新部署
3. 你在對話框打一句測試 — 還是舊行為
4. 再試一次 — 還是舊
5. 打開 Zeabur Dashboard 看 — 明明顯示「Deployed」
6. 一直 refresh，不知道是自己快取舊版、還是 Zeabur 真的沒部到

這個情境會讓你浪費 30 分鐘在「它到底有沒有上線？」。**Zeabur 的 git auto-deploy 並不 100% 穩定** — 有時候會漏觸發、有時候會卡在舊 commit、有時候 deploy 顯示成功但 container 沒切版。

### 解法：CODE_MARKER + 自動驗證 + fallback direct deploy

核心想法：
1. 在 `index.js` 寫一個 **CODE_MARKER** 常數（每次部署改字串），並開一個 `/debug/version` endpoint 回傳它
2. 部署腳本 `git push` 完之後，**打 endpoint 比對 marker**，對上才算真部署成功
3. 如果 git auto-deploy 3 分鐘內沒切版 → 自動 fallback 用 `npx zeabur@latest deploy` direct deploy
4. 還不行就再 direct deploy 一次（實測直接部署偶爾第一次不生效）

這樣你就不用肉眼猜了，腳本跑完要嘛回報成功（marker live），要嘛回報 exit code 2（真的壞了去查 dashboard）。

### Step 1：在 index.js 加 CODE_MARKER + endpoint

```js
// index.js 頂部
const CODE_MARKER = 'v2026-04-20-001';  // 每次改 code 都換一個字串（日期+序號最直覺）

// ... 其他 code ...

// 開個驗證 endpoint（不需要 auth，因為只回傳版本）
app.get('/debug/version', (req, res) => {
  res.json({
    codeMarker: CODE_MARKER,
    uptime: process.uptime(),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString()
  });
});
```

部署後用 `curl https://你的網域/debug/version` 就能看到現在 live 的是哪個 marker。

### Step 2：複製 wrapper 腳本

把這個存成 `tools/push-and-deploy.sh`（記得 `chmod +x`）：

```bash
#!/usr/bin/env bash
# push-and-deploy.sh — 一條龍部署：git push → 驗 marker → 沒過 fallback direct deploy → 再驗
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

# === 下面 4 行改成你自己的 ===
PROJECT_ID="{{YOUR_PROJECT_ID}}"
SERVICE_ID="{{YOUR_SERVICE_ID}}"
BRANCH="main"
BASE_URL="https://{{YOUR_BOT_DOMAIN}}"
# ===========================

# 從 index.js 讀 marker（或用參數指定）
if [[ -n "${1:-}" ]]; then
  MARKER="$1"
else
  MARKER=$(grep -oE "const CODE_MARKER = '[^']+'" index.js | head -1 | sed -E "s/.*'([^']+)'/\\1/")
fi

[[ -z "$MARKER" ]] && { echo "讀不到 CODE_MARKER"; exit 1; }

echo "push-and-deploy: marker='$MARKER' branch='$BRANCH'"

# 檢查 working tree clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "有未 commit 的改動，先 commit 再跑"
  git status --short
  exit 1
fi

# 有 unpushed commit 就 push
if ! git diff --quiet "origin/$BRANCH..HEAD" 2>/dev/null; then
  git push origin "$BRANCH" || { echo "push 失敗"; exit 1; }
else
  echo "遠端已最新，跳過 push"
fi

# 驗證函式：打 /debug/version 比對 marker
verify_marker() {
  local tries=$1
  local interval=${2:-60}
  for i in $(seq 1 "$tries"); do
    local resp
    resp=$(curl -s --max-time 10 "$BASE_URL/debug/version" || echo '{}')
    if echo "$resp" | grep -q "\"codeMarker\":\"$MARKER\""; then
      echo "marker live"
      return 0
    fi
    [[ $i -lt $tries ]] && { echo "第 $i/$tries 次還是舊版，${interval}s 後重試..."; sleep "$interval"; }
  done
  return 1
}

# Round 1：等 git auto-deploy（最多 3 分鐘）
echo "Round 1: 等 Zeabur git auto-deploy"
verify_marker 3 60 && { echo "git auto-deploy 成功"; exit 0; }

# Round 2：git 沒觸發 → direct deploy
echo "git auto-deploy 沒觸發，fallback direct deploy..."
npx zeabur@latest deploy --project-id "$PROJECT_ID" --service-id "$SERVICE_ID" --json -i=false | tail -5

echo "Round 2: 等 direct deploy 切 container"
verify_marker 3 60 && { echo "direct deploy 成功"; exit 0; }

# Round 3：再試一次（direct deploy 偶爾第一次不生效）
echo "direct deploy 第一次沒生效，再試一次..."
npx zeabur@latest deploy --project-id "$PROJECT_ID" --service-id "$SERVICE_ID" --json -i=false | tail -5

echo "Round 3: 最後驗證"
verify_marker 3 60 && { echo "第二次 direct deploy 成功"; exit 0; }

echo "2 次 direct deploy 後仍沒切版，請查 Zeabur dashboard"
exit 2
```

### Step 3：怎麼拿 PROJECT_ID / SERVICE_ID

```bash
# 列所有專案
npx zeabur@latest project list -i=false

# 列專案下的服務（拿到 bot service 的 id）
npx zeabur@latest service list --project-id YOUR_PROJECT_ID -i=false
```

BASE_URL 用你 bot 綁的網域（Zeabur 子網域或自訂網域都可以）。

### 日常使用

```bash
# 1. 改 code
vim index.js

# 2. 更新 CODE_MARKER（在 index.js 把版本字串換掉）
#    例如 v2026-04-20-001 → v2026-04-20-002

# 3. commit
git add -A && git commit -m "fix xxx"

# 4. 一條龍部署 + 驗證
./tools/push-and-deploy.sh
```

腳本會自己處理 push、等待、驗證、fallback。你只需要看最後一行是 `成功` 還是 `exit 2`。

### 為什麼不是 Zeabur 的鍋 — 是多層快取

你可能會想「為什麼不直接用 Zeabur dashboard 的 redeploy 按鈕？」可以，但你仍然需要**驗證 marker**。Dashboard 顯示 Deployed 只代表 build 成功，不代表 container 真的切到新版（有時候 container 會被 route 到舊 pod）。有 marker 就有事實，沒 marker 就是猜。

**這個 wrapper 基本上是把「肉眼猜 30 分鐘」變成「腳本跑 5 分鐘」。寫一次用一輩子。**
