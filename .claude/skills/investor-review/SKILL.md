---
name: investor-review
description: 用「最強廣告投手」視角 review LP / 直播頁 / 廣告素材，找出會殺轉換率的致命問題
user_invocable: true
---

# 投手視角 Review — LP / 直播頁 / 廣告素材

戴「做過百萬預算操盤」的廣告投手帽子 review 內容，找出 3 秒內會讓冷流量滑走的致命問題，給 actionable 修法。

## 使用時機

- 改完 LP / 直播頁 / 廣告文案，deploy 前最後一審
- 決定哪個 hook / CTA / pricing 版本 A/B test
- 付費流量進來前做 QA（避免燒錢白花）

## 核心原則

- **3 秒 rule**：冷流量滑進來 3 秒內沒 resonate → 滑走。Hook 必須在第一屏有痛點 + benefit
- **Single goal**：一頁一個行動。同頁擺 3 個不同 CTA = 訊號雜 = 轉換率掉
- **CTA 主動動詞**：「看今天的現場」(被動) vs 「免費 AI 診斷你該怎麼開始」(主動 + benefit)
- **Meta 政策**：不能承諾收入（「月收百萬」違規）、不能有醫療宣稱
- **Mobile first**：80% 冷流量來自手機，LCP < 2.5s

## Checklist（逐項 review）

### Hook / Hero（第一屏）
- [ ] 痛點 qualifier：第一屏 3 秒內有讓目標 TA 說「這是我」的句子？
- [ ] Benefit clear：讀者能秒懂「我能得到什麼」？
- [ ] 避免收入承諾（「月收百萬」「保證賺錢」等違反廣告政策）
- [ ] 數字具體（「8 天」「60 分鐘」「剩 37 位」）比抽象形容詞有力 10 倍

### CTA
- [ ] CTA 文字是主動動詞 + benefit（不是「了解更多」「立即報名」）
- [ ] 有 sticky CTA 或中段 CTA（避免滑到中間想點要滑回頂）
- [ ] CTA 連到 Pixel Lead event
- [ ] CTA 下方有「降低阻力」註（「免費」「不用填表」「加 LINE 即可」）

### Social Proof / 信任
- [ ] 有過往成果數字（不承諾未來）：「先前 2 場 7 人成交」vs「能讓你賺錢」
- [ ] 有講者 bio（為什麼聽這個人）
- [ ] 有學員見證 / 案例（或老實寫「第一期招募中」不要編）

### Urgency
- [ ] 時間感（直播時間日期 / 限額 X 位 / 截止倒數）
- [ ] Urgency 是真的（假倒數會被抓包）

### Tracking
- [ ] UTM parameters 接得起來（utm_source / utm_campaign / ad_id）
- [ ] Meta Pixel PageView + Lead event 都埋
- [ ] 登陸頁 domain 跟 Pixel ID 對得上（避免 cross-domain 失效）

### Form / 報名阻力
- [ ] 欄位越少越好（Email 或 LINE 擇一）
- [ ] 沒有「同意條款」等小字阻力
- [ ] 成功頁 / Thank you page 有明確下一步

### Mobile / Performance
- [ ] Hero 在手機第一屏看得完（不用 scroll）
- [ ] CTA 按鈕夠大（手指點得到）
- [ ] LCP < 2.5s（避免行動網路慢載不出來）

## Output 格式（review 完後輸出）

```
🔴 致命問題（廣告政策 / 3 秒殺 / CPA 必爆）：
  1. [問題] → [修法]
  2. ...

🟡 建議改進（影響轉換率）：
  1. ...

🟢 做得好的（保留）：
  1. ...

📊 投手預估：
  - 當前版本預估 CTR: X%
  - 修完預估 CTR: Y%
  - CPA 降幅估計: Z%
```

## 用法範例

```
/investor-review live.html
```

或在對話中直接說：
> 「用投手視角 review 這個 LP」

AI 讀頁面內容 → 按 checklist 過一遍 → 輸出上述格式。

## 相關 skills

- `funnel-check` — 漏斗健康檢查（跑數據，不是 review 內容）
- `meta-ads` — 廣告帳戶稽核（看 adset / 創意 performance）
- `ad-copy-engine` — 寫廣告文案（先寫再 review）
