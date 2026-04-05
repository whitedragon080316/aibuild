# 直播後自動化主控流程

## 觸發方式
直播結束後，給我 YouTube 連結，說「跑直播後流程」。

## 完整流程（一次觸發，全部跑完）

### Step 1：下載 + 逐字稿
執行 auto_shorts.sh 取得逐字稿：
```
{{CONTENT_DIR}}/auto_shorts.sh <YouTube連結> content_MMDD
```
產出：
- {{CONTENT_DIR}}/content_MMDD/audio.txt（逐字稿）
- {{CONTENT_DIR}}/content_MMDD/audio.srt（帶時間戳）
- {{CONTENT_DIR}}/content_MMDD/clips.txt（AI 挑的精華片段）

### Step 2：短影片剪輯
clips.txt 產出後，review 確認沒問題，再跑一次 auto_shorts.sh 同樣連結剪出影片。
產出：{{CONTENT_DIR}}/content_MMDD/shorts/ 裡的直式短影片

### Step 3：內容工廠
讀取逐字稿（audio.txt），按 ai-workers/content-factory.md 的規則產出：
- 5 支短影片腳本（搭配 Step 2 的影片或額外剪輯點）
- 10 則金句圖文案
- 4 則 LINE 推播素材

所有內容產出到：{{CONTENT_DIR}}/content_MMDD/content-factory/
- shorts-scripts.md
- golden-quotes.md
- line-push-content.md

### Step 3.5：擴充內容銀行
從新的逐字稿萃取金句和教學要點，追加到 `{{CONTENT_BANK_PATH}}`：
- 10 則金句（有衝擊力、反直覺、不超過 30 字）
- 5 個教學主題（每個含 topic + 3 個 points，給一半留一半）
- 分類：{{CONTENT_CATEGORIES}}
- 不重複已有的金句和主題
- 不用「治療」，用「調整」「處理」「恢復」

追加方式：讀取現有 content_bank.json → 加入新素材 → 存回。
追加完後部署到 Zeabur：
```
cd {{SHORTS_WEB_DIR}} && npx zeabur@latest deploy --project-id {{ZEABUR_PROJECT_ID}} --service-id {{ZEABUR_SHORTS_SERVICE_ID}} --json
```
這樣輪播圖排程系統就會自動用新素材生成圖片。

### Step 4：追單文案
讀取逐字稿，按 ai-workers/chase-copywriter.md 的規則產出：
- 3 波 x 3 版本 = 9 則追單訊息（wave 2,3,5，混合模式）

產出到：{{CONTENT_DIR}}/content_MMDD/chase-sequences/
- version-a-attended.md（到課未購買）
- version-b-absent.md（未到課）
- version-c-replay.md（看回放未購買）

### Step 5：整理摘要
產出一份總覽給你 review：
{{CONTENT_DIR}}/content_MMDD/SUMMARY.md

內容：
- 本次直播主題摘要（3 句話）
- 短影片 5 支標題 + 對應時間戳
- 金句 10 則（一行一句）
- 追單 6 波主題一覽
- 需要你決定的事項（如果有）

## 資料夾結構
```
{{CONTENT_DIR}}/content_MMDD/
  livestream.mp4          <- 原始影片
  audio.wav               <- 音訊
  audio.txt               <- 逐字稿
  audio.srt               <- 帶時間戳逐字稿
  clips.txt               <- 剪輯點
  shorts/                 <- 短影片檔案
  content-factory/        <- 內容工廠產出
    shorts-scripts.md
    golden-quotes.md
    line-push-content.md
  chase-sequences/        <- 追單文案
    version-a-attended.md
    version-b-absent.md
    version-c-replay.md
  SUMMARY.md              <- 總覽（你只看這個）
```

## 你的介入點
1. Step 1 完成後：看 clips.txt，調整剪輯點（1 分鐘）
2. Step 5 完成後：看 SUMMARY.md，決定要不要改（5 分鐘）
3. 確認 OK → 追單訊息貼進 Bot 環境變數 → 完成
