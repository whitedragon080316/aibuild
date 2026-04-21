---
name: admin-commands
description: 寫 Bot 管理者指令的 4 鐵律（無條件 saveData / 必回 success-failure / 429 retry / 歧義明示）— 避免 silent failure 累積成災難
user_invocable: true
---

# 管理者指令 4 鐵律

## 為什麼寫這個 skill

2026-04-20，我們的老師（知脊整聊學院的營運者）花了**整整一個月**在 debug 一個怪 bug：明明 admin 下了「把 XX 標為已完單」的指令，Bot 也回覆了「✅ 完成」，但資料庫裡那個用戶的 `courseInterest.confirmed` 欄位永遠是 `false`，結果再行銷排程繼續把他當「未完單」每天推播 — 對已經付錢的客戶。

追到最後，bug 只有一行：

```js
if (found > 0) {
  saveData();  // found 指「完單集合有匹配」，但 courseInterest 是另一個集合，它的更新沒被 save 到
}
```

**那是一個月的痛。這個 skill 把那一個月濃縮成 4 條規則，你照著寫，直接省你 4 週。**

Admin 指令特別危險的原因：
- 它改的是生產數據
- 它沒有用戶界面可以驗證
- 它的錯誤不會立刻被發現（通常是幾天後用戶問「為什麼還在推」才炸開）
- Admin 自己最忙、最不會去確認結果

所以這 4 條規則是**硬性**的，沒有「看情況」。

---

## 鐵律 1：任何狀態變更必 `saveData()`，無條件

**Bad:**
```js
// 指令：把 userA 標為已完課
function markCompleted(userId) {
  let found = 0;
  for (const session of appData.sessions) {
    if (session.userId === userId) {
      session.completed = true;
      found++;
    }
  }
  // 順便更新 courseInterest
  if (appData.courseInterest[userId]) {
    appData.courseInterest[userId].confirmed = true;
  }

  if (found > 0) {
    saveData();  // ❌ 用「sessions 有沒有匹配」當 save 條件
  }
}
```

問題：`courseInterest[userId].confirmed = true` 這一行執行了，但當 sessions 沒匹配時 `found = 0`，`saveData()` 不會跑 — `courseInterest` 的變更**漂在記憶體裡**，重啟後消失。

**Good:**
```js
function markCompleted(userId) {
  let mutated = false;

  for (const session of appData.sessions) {
    if (session.userId === userId) {
      session.completed = true;
      mutated = true;
    }
  }

  if (appData.courseInterest[userId]) {
    appData.courseInterest[userId].confirmed = true;
    mutated = true;
  }

  if (mutated) saveData();  // ✅ 只要任何集合有變更就 save
}
```

**Why：** 指令常常同時動到多個集合（sessions、courseInterest、completions…）。用「主要目標有匹配」當 save 條件，次要集合的變更會漂掉。`mutated` 旗標一視同仁，只要有任何欄位被動過就必存。

---

## 鐵律 2：Admin 指令 MUST 必回 success / failure

**Bad:**
```js
async function handleAdminCmd(userId, text) {
  const [cmd, target] = text.split(' ');
  if (cmd === '/mark-done') {
    const found = markCompleted(target);
    if (found > 0) {
      await pushMessage(ADMIN, `✅ 完成 ${found} 筆`);
    }
    // ❌ else 沒有任何訊息 → admin 永遠不知道失敗
  }
}
```

Admin 打了 `/mark-done ABC123`，Bot 沉默 — admin 會以為成功，繼續做下一件事。bug 就這樣埋下。

**Good:**
```js
async function handleAdminCmd(userId, text) {
  const [cmd, target] = text.split(' ');
  if (cmd === '/mark-done') {
    const found = markCompleted(target);
    if (found > 0) {
      await pushMessage(ADMIN, `✅ 完成 ${found} 筆（target=${target}）`);
    } else {
      await pushMessage(ADMIN, `❌ 失敗：找不到 target=${target}，檢查是不是 ID 打錯`);
    }
  }
}
```

**Why：** Silent failure（沉默失敗）是最難 debug 的 bug — 沒有 log、沒有訊息、沒有異常，累積很久才會被發現。Admin 指令必須**每一條分支都有 feedback**，寧可 noisy 也不要 silent。

---

## 鐵律 3：外部 API 錯誤要分類，不能一把吞

**Bad:**
```js
async function enrichUserName(userId) {
  try {
    const profile = await lineClient.getProfile(userId);
    return profile.displayName;
  } catch (e) {
    return '(已封鎖)';  // ❌ 所有錯誤都當封鎖
  }
}
```

問題：LINE API 有 rate limit（429），一次撈太多 user 會暫時被擋。上面的 code 會把「rate limit」也標成「已封鎖」，結果有效用戶被當封鎖用戶從名單刪掉。

**Good:**
```js
async function enrichUserName(userId, retries = 1) {
  try {
    const profile = await lineClient.getProfile(userId);
    return profile.displayName;
  } catch (e) {
    // 分類
    if (e.statusCode === 429 || /rate limit/i.test(e.message || '')) {
      if (retries > 0) {
        await sleep(5000);
        return enrichUserName(userId, retries - 1);  // 退避重試
      }
      return null;  // 重試後仍失敗 → 回 null，不要標「已封鎖」
    }
    if (e.statusCode === 404 || e.statusCode === 403) {
      return '(已封鎖)';  // ✅ 真的封鎖才標
    }
    throw e;  // 其他錯誤讓上層知道
  }
}
```

**Why：** 429（暫時）跟 4xx（永久）性質完全不同。一把吞會造成「靜默漏抓」— 資料好像都處理完了，其實漏了一大堆。分類後重試，永久錯誤才吞。

---

## 鐵律 4：多目標匹配要明示歧義

**Bad:**
```js
function findUser(shortId) {
  const matched = Object.keys(appData.users).filter(id => id.endsWith(shortId));
  return matched[0];  // ❌ 2 個命中時自動用第一個
}
```

Admin 打 `/mark-done abc`，結果有 `Uxxxxabc` 跟 `Uyyyyabc` 兩個用戶，Bot 默默改了第一個 — 改錯人。

**Good:**
```js
function findUser(shortId) {
  const matched = Object.keys(appData.users).filter(id => id.endsWith(shortId));
  if (matched.length === 0) return { error: '找不到' };
  if (matched.length > 1) {
    return {
      error: '找到多個，請用完整 ID 指定：\n' + matched.map(id => `  • ${id}`).join('\n')
    };
  }
  return { userId: matched[0] };
}
```

**Why：** Admin 指令直接動生產數據，寧可多問一次也不要標錯人。自動選第一個 = 賭運氣。

---

## 寫指令前的 Checklist

每寫一條新 admin 指令，照這 5 個問題過一遍：

- [ ] 所有狀態變更路徑都走到 `saveData()`？（用 `mutated` 旗標，不要條件式 save）
- [ ] 所有 branch（found / not found / matched / not matched）都有 admin feedback？
- [ ] 外部 API 錯誤有分類（429 retry / 4xx 吞 / 其他 throw）？
- [ ] 多目標命中有歧義處理？
- [ ] 動錢 / 動用戶看得到的內容 — 有 dry-run / preview 模式嗎？

過不了任何一項就不要部署。這些規則是用一個月的痛換來的，別又自己踩一次。

---

## 快速模板

把這段貼到你的 admin 指令 handler 當骨架：

```js
async function handleAdminCmd(userId, text) {
  if (userId !== process.env.ADMIN_USER_ID) return;  // 權限檢查

  const [cmd, ...args] = text.trim().split(/\s+/);

  try {
    let mutated = false;
    let summary = [];

    // --- 指令邏輯開始 ---
    if (cmd === '/your-cmd') {
      // 歧義檢查
      const result = findUser(args[0]);
      if (result.error) {
        return pushMessage(ADMIN, `❌ ${result.error}`);
      }

      // 狀態變更
      appData.users[result.userId].flag = true;
      mutated = true;
      summary.push(`user=${result.userId} flag=true`);
    }
    // --- 指令邏輯結束 ---

    if (mutated) saveData();

    // 必回 feedback
    if (summary.length > 0) {
      await pushMessage(ADMIN, `✅ 完成\n${summary.join('\n')}`);
    } else {
      await pushMessage(ADMIN, `❌ 無變更：${text}`);
    }
  } catch (e) {
    await pushMessage(ADMIN, `❌ 指令爆炸：${e.message}`);
    console.error('admin cmd error', e);
  }
}
```

---

## 相關 skill

- `/line-bot` — 看「常見 silent failure 案例」章節，這 3 條規則就是從那些案例提煉的
- `/deploy` — 看 push-and-deploy wrapper，確保你改的指令有真的上到 production
