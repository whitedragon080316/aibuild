# 已知問題與踩坑紀錄

## 2026-03-25：wave2 誤發事件

**事故：**
1. 把「已到課版」wave2 發給 11 位未到課用戶（不可撤回）
2. 測試 resend confirm 保護時用真實 wave3，意外發送（提早一天）

**根因：**
- `completions` 為 0（沒人回 777），所有人被判為未到課
- 手動 resend 時沒有 confirm 保護機制
- 測試用真實場次和波次，而非假資料

**修復：**
- `/remarketing/resend` 加了 `confirm=true` 參數保護
- deploy hook regex 收窄，不再匹配 log/restart/exec 指令
- memory 補齊再行銷商業邏輯

**防範：**
- resend 一律先 preview
- 測試用 session=9999
- 推播操作前確認分群和對象

---

## 2026-03-26：completions / courseInterest 沒有持久化（嚴重）

**事故：**
`completions`（777 完課紀錄）和 `courseInterest`（報名意願）從未被加入 saveData() 的 key 列表，導致每次服務重啟資料歸零。

**影響：**
- 所有回 777 的完課用戶在重啟後被當作未完課
- 再行銷分群全部錯誤：銷售腳本（已到課版）從未發給正確的人
- 廣告費轉換率受嚴重影響（37 人報名 → 0 人被識別為完課）

**根因：**
initDB()、loadData()、saveData()、appData 初始值四個地方的 key 列表都沒有包含 `completions` 和 `courseInterest`。Bot 回覆 777 時寫入記憶體的 appData.completions，但 saveData() 不會存到 PostgreSQL。

**修復：**
四個地方都加入 `completions` 和 `courseInterest`。

**教訓：**
新增 appData 欄位時，必須同步更新 initDB / loadData / saveData / appData 初始值，缺一不可。

---

## 持續性問題：回放連結 hardcoded

**問題：** `buildCatchUpMessage` 裡的 YouTube 回放 URL 寫死，每場直播不同但程式碼只有一個。
**狀態：** 待修復
**影響：** 未到課用戶可能收到錯誤的回放連結
