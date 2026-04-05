# TapPay 金流串接 Skill

這份 Skill 文件根據 TapPay 官方文件整理，供 AI coding 和 Vibe Coding 平台在整合 TapPay 金流時參考。結構按照串接所需的各種應用場景與 API 說明分類，方便模型依照需求選用合適的步驟。引用內容均來自 TapPay 官方開發者文件。

## 環境設定

要開始串接 TapPay，開發者需先到 **TapPay Portal** 建立應用程式並取得必要憑證。主要步驟如下：

- **應用程式註冊 – App Registration**：登入 Portal，進入 Developer → Application，點選「Edit App」，填入應用程式名稱與網域後，可在此頁看到您的 **App ID、App Key** 等資訊【550440929391449†L51-L74】。App ID 與 App Key 用於前端 SDK 初始化。
- **商家註冊 – Merchant Registration**：在 Developer → Create Merchant 建立商家；Sandbox 環境不可新增商家，只能使用預設商家。建立時需設定收單銀行帳號等資料【550440929391449†L78-L100】。建立後會取得 **Merchant ID**。
- **IP 綁定 – IP Registration**：在 Developer → System Settings 綁定您的伺服器 IP。Sandbox 與 Production 環境的允許 IP 不共用；輸入對應的 IP 或子網域後即可完成綁定【550440929391449†L104-L134】。
- **取得 Partner Key**：Partner Key 也在 Portal 中取得，是呼叫後端 API 時的身份驗證金鑰。

完成上述步驟後，即可進入各支付場景的整合。前端 SDK 需使用 App ID/Key，後端 API 需使用 Partner Key、Merchant ID 等。

## 支付場景

本節列出 TapPay 支付流程常見的應用場景。所有信用卡交易都可選擇啟用 **3D 驗證 (three_domain_secure)**。當您開啟 3D 驗證時，必須在 request body 中提供驗證完成後的導回網址與通知網址；大多數 Direct Pay API（例如 Pay by Prime、Bind Card）使用 `result_url` 物件，其下有 `frontend_redirect_url` 與 `backend_notify_url` 兩個子欄位【53207851533674†L241-L252】。Pay by Card Token API 則是在頂層提供這兩個欄位。這些網址都必須以 https 開頭且 `backend_notify_url` 僅支援 443 port。

### 信用卡交易

#### 綁訂卡片（Bind Card） / 3D 驗證

*用途*：讓用戶綁定信用卡以便日後快速付款。呼叫 **Bind Card API** 可把前端取得的一次性 `prime` 換成永久的 `card_key` 與 `card_token`，並於綁定時執行預授權。

- **一次性 prime 換成 card token**：Bind Card API 可立即用一次性 `prime` 換得永久 `card_key` 和 `card_token`【768072990513475†L116-L133】。成功後可用於後續的 Pay by Card Token API。
- **1 元預授權並立即退刷**：執行綁卡時會進行 1 元的預授權再立即退款，以驗證卡片有效性；若綁定 Easy Wallet 則不會扣款【768072990513475†L118-L123】。
 - **支援 3D 驗證**：`three_domain_secure` 設定為 true 時會啟用 3D 驗證。此時請在 request body 中加入 `result_url` 物件，並於其內提供 `frontend_redirect_url`（前端導向）與 `backend_notify_url`（後端通知）供 TapPay 回傳驗證結果【768072990513475†L151-L164】。缺少任一子欄位或使用非 https 網址將導致 API 回傳錯誤碼 629/630/631【54858304092704†L439-L443】。
- **商家自訂返回頁**：若 3D 驗證流程出現錯誤，TapPay 會顯示錯誤頁，商家可透過 `go_back_url` 指定返回網址【768072990513475†L166-L173】。

綁卡成功後請妥善保存 `card_key`、`card_token`，以便後續使用卡片扣款。

#### 綁卡扣款交易（Recurring Payment） / 3D 驗證

*用途*：綁定卡片後，定期或不定期利用 `card_key` 與 `card_token` 扣款。

 - **Pay by Card Token API**：此 API 使用永久的 `card_key` 與 `card_token` 進行付款，省去再次取得 prime 的流程【615069830403162†L424-L451】。若要啟用 3D 驗證，可在 request 中設定 `three_domain_secure = true` 並在頂層填入 `frontend_redirect_url` 與 `backend_notify_url`【615069830403162†L431-L435】。這兩個網址必須以 https 開頭，`backend_notify_url` 只能使用 443 port；缺漏或拼錯名稱將導致錯誤碼 629/630/631【54858304092704†L439-L443】。
- **使用綁卡資訊**：綁卡時若已勾選 `remember`，Pay by Prime API 回應會包含 `card_key` 與 `card_token`，可直接用於 Pay by Card Token API【615069830403162†L448-L453】。
- **結果確認**：在使用卡 Token 付款並收到前端 redirect 後，建議立即呼叫 Record API，以避免因後端通知失敗造成交易狀態不一致【615069830403162†L438-L443】。

#### 一次性交易（One‑Time Payment） / 3D 驗證

*用途*：用戶僅使用一次性 prime 進行付款而不保存卡片。

- **Pay by Prime API**：使用前端 SDK 取得的 `prime`（有效期限 90 秒）和後端 `partner_key`、`merchant_id`、`amount`、`order_number` 等資訊進行交易【615069830403162†L101-L104】【615069830403162†L118-L133】。
 - **3D 驗證選擇**：若設定 `three_domain_secure = true`，必須在 `result_url` 物件中提供 `frontend_redirect_url` 及 `backend_notify_url`。交易將啟用 3D 驗證；完成驗證後 TapPay 會以 redirect 和後端通知回傳結果【53207851533674†L90-L93】【53207851533674†L761-L796】。缺少任何一個欄位會回傳 629/630/631 錯誤【54858304092704†L439-L443】。
- **保存卡片**：若 request 中 `remember` 為 true，Pay by Prime API 回應會附帶 `card_key` 與 `card_token`，可用於後續綁卡扣款【53207851533674†L106-L113】。

### 其他支付方式

TapPay 也支援 LINE Pay、JKOPay、Easy Wallet、Apple Pay、Google Pay 等電子支付與行動錢包。這些方式的前端流程各異，此文件聚焦於信用卡交易。如需其他支付方式，可參考官方文件《e‑payments support list》。

## 交易操作

### 交易查詢 – Record API

Record API 用於查詢交易紀錄。主要特點：

- 透過 `partner_key` 驗證身份，並可指定每頁筆數 (`records_per_page`)、頁碼 (`page`) 以及多種篩選條件（時間區間、金額範圍、卡號持有人、Merchant ID、交易狀態等）【615069830403162†L832-L849】。
- 每個查詢結果包含 `status`、`total_page_count`、`number_of_transactions`、`trade_records` 等欄位【615069830403162†L893-L904】。`status = 2` 表示沒有更多資料【615069830403162†L896-L899】。
- Request 格式（JSON）：以 POST 方式呼叫 `/tpc/transaction/query`，header 包含 `Content‑Type: application/json` 和 `x‑api‑key`【615069830403162†L855-L861】。

### 交易退款 – Refund API

Refund API 用於全額或部分退款。

- **用途**：可撤銷整筆交易（取消授權與請款）或執行部分退款【615069830403162†L753-L758】。部分退款僅適用於非分期（Instalment）或 T2P 交易，請在 `amount` 內填寫退刷金額【615069830403162†L781-L785】。
- **執行時間**：請勿於收單銀行日結（capping）時間內呼叫退款；TapPay 建議等待銀行處理完成後再執行【615069830403162†L762-L772】。
- **Request 格式**：
  
  ```json
  {
    "partner_key": "YourPartnerKey",  // 必填
    "rec_trade_id": "Transaction ID",  // 必填
    "amount": 100  // 可選，表示部分退刷金額
  }
  ```
  
  POST 至 `/tpc/transaction/refund`，header 需帶 `x‑api‑key`【615069830403162†L791-L801】。
- **回應**：包含 `status`（0 表示成功）、`refund_amount`、`refund_info` 等欄位【615069830403162†L805-L823】。

## API 說明

### 前端應用

TapPay 提供 Web、iOS、Android SDK 取得一次性 prime，前端無需直接處理信用卡號。以下摘要三種平台的整合要點。

#### Web 串接

- **建立輸入欄位**：在 HTML 中建立三個容器作為 TapPay Fields（卡號、到期日、CCV）【965994102722053†L16-L38】。
- **SDK 初始化**：在 HTML `<head>` 中引入 TapPay 的 Web SDK，網址必須包含 `/sdk/tpdirect/`，例如 `https://js.tappaysdk.com/sdk/tpdirect/vX.Y.Z`。注意不要省略 `/sdk/`，否則 `TPDirect` 物件會是未定義 (TPDirect is not defined)【35515038774184†L26-L29】。引入腳本後呼叫 `TPDirect.setupSDK(APP_ID, APP_KEY, serverType)`；serverType 使用 `sandbox` 進行測試【965994102722053†L39-L44】。
- **版本選擇**：TapPay Web SDK 維護著多個版本，建議在 script 標籤中指定明確的版本號（例如 `v5.19.2`）或使用 `v5` 來取得最新穩定版，以避免不相容的更新。您可參考官方 GitHub releases 來確認最新版本。
- **建立卡片輸入表單**：使用 `TPDirect.card.setup()` 指定欄位與樣式【965994102722053†L46-L128】。可透過 `onUpdate` 回呼監聽輸入狀態，只有當 `update.canGetPrime` 為 true 時才能呼叫 getPrime【965994102722053†L130-L175】。
- **取得 prime**：在提交表單時調用 `TPDirect.card.getPrime()`，成功回傳的結果含 `prime`，將其送往後端呼叫 Pay by Prime API【965994102722053†L186-L190】。

##### HTTPS 與 localhost 限制

TapPay Web SDK（TPDirect）及 3D 驗證的 webhook 通知必須在 **HTTPS** 網域下運作，官方明確表示 *不得使用 `localhost`* 或非加密連線。使用 Payment Request API（包含綁卡與取得 prime）時，官方要求「在正式與 sandbox 環境將應用程式透過 HTTPS 服務」，並建議開發環境可以利用 **ngrok** 搭建安全通道【275751431424365†L66-L69】。

此外，當啟用 3D 驗證（`three_domain_secure = true`）並傳送 Pay by Prime / Bind Card / Pay by Token 等請求時，需要於 `result_url.frontend_redirect_url` 指定導回頁並於 `result_url.backend_notify_url` 指定後端通知網址；這兩個網址都必須以 **https** 開頭，其中 `backend_notify_url` **僅支援 443 port**，不得使用其他 port 或 `localhost`【53207851533674†L244-L251】。TapPay 開發者文件再次強調 `backend_notify_url` 必須使用 https 且僅支援 443 port【359485000499620†L560-L568】。

建議做法：

1. 在本地開發時透過 **ngrok**、**Serveo** 或類似工具建立公開的 HTTPS 域名並映射到本機服務，避免因 `localhost` 導致 3D 驗證失敗。
2. 在 TapPay Portal 中預先將您的測試域名加入 IP/URL 白名單，確保 webhook 可達。
3. 切勿將後端通知網址設為 HTTP 或 `localhost`，否則 TapPay 會拒絕呼叫，導致交易流程卡住或驗證失敗。

##### Web SDK 防呆與診斷

TapPay Web SDK 整合常見錯誤多源於載入路徑或環境設定錯誤。請留意下列事項：

1. **正確載入 SDK**：從 v5.14.0 起，Web SDK 必須使用 `/sdk/tpdirect/` 路徑；舊的 `/tpdirect/` 路徑已不支援。正確範例：
   - ✅ `<script src="https://js.tappaysdk.com/sdk/tpdirect/v5.17.0"></script>`
   - ❌ `<script src="https://js.tappaysdk.com/tpdirect/v5.17.0"></script>`
   如果載入失敗，瀏覽器 console 會顯示 `TPDirect is not defined`。

2. **環境變數配置必須完整**：您的後端應提供 `/api/config` 端點供前端取得 `appId`、`appKey`、`merchantId`、`publicBaseUrl` 與 `env`。這些值通常從 `.env` 檔讀取：
   - `TAPPAY_APP_ID` – 由 Portal 取得的 App ID。
   - `TAPPAY_APP_KEY` – 由 Portal 取得的 App Key。
   - `TAPPAY_MERCHANT_ID` – 您的商家代號。
   - `PUBLIC_BASE_URL` – 您公開的網域（必須為 https，且不可使用 `localhost`），3D Secure 會導回此域名。
   - `TAPPAY_ENV` – `sandbox` 或 `production`。

   使用 [dotenv](https://github.com/motdotla/dotenv) 在 Node server 中載入 `.env`：

   ```javascript
   // ESM 範例
   import dotenv from 'dotenv';
   dotenv.config();

   function required(name) {
     const v = process.env[name];
     if (!v) throw new Error(`[ENV_MISSING] ${name} is required`);
     return v;
   }

   export const config = {
     appId: Number(required('TAPPAY_APP_ID')),
     appKey: required('TAPPAY_APP_KEY'),
     merchantId: required('TAPPAY_MERCHANT_ID'),
     publicBaseUrl: required('PUBLIC_BASE_URL'),
     env: process.env.TAPPAY_ENV || 'sandbox'
   };
   ```

   並實作 `/api/config` 路由回傳這些值：

   ```javascript
   app.get('/api/config', (req, res) => {
     res.json(config);
   });
   ```

   若任一環境變數為空（例如 appId = 0 或 appKey 為空字串），應在 server 啟動時即報錯或結束程式；不要讓系統跑到前端才失敗。

3. **前端初始化順序與防重複**：僅在 `window.onload` 事件後呼叫 `TPDirect.setupSDK` 和 `TPDirect.card.setup`。為避免重複初始化造成競態，可設置全域旗標：

   ```html
   <script>
     window.addEventListener('load', function () {
       if (window.__TPDIRECT_INITED__) return;
       window.__TPDIRECT_INITED__ = true;
       TPDirect.setupSDK(config.appId, config.appKey, config.env);
       TPDirect.card.setup({
         fields: {
           number: { element: '#card-number' },
           expirationDate: { element: '#card-expiration-date' },
           ccv: { element: '#card-ccv' }
         },
         styles: { /* 自訂樣式 */ }
       });
       TPDirect.card.onUpdate(function (update) {
         document.querySelector('#submit').disabled = !update.canGetPrime;
       });
     });
   </script>
   ```

4. **快速診斷檢查**：當前端出現錯誤時，請依下列順序排查：
   - 是否顯示 `TPDirect is not defined`？→ 檢查 script 路徑是否含有 `sdk/tpdirect/` 並確認資源可成功下載（HTTP 200）。
   - 是否顯示 `TPDirect.setupSDK error, appId=0` 或 `appKey=`？→ 檢查 `/api/config` 回傳的 appId、appKey 是否正確。確認 `.env` 存在並且已由 dotenv 載入；重啟 Node server 使環境變數生效。
   - 是否顯示 `Cannot read properties of null (reading 'contentWindow')`？→ 通常是 SDK 初始化失敗後的連鎖結果。先排除上述兩項，再確認是否重複呼叫 `setupSDK` 或 `card.setup`，也可檢查瀏覽器 CSP/廣告攔截或公司網路是否阻擋 TapPay 的 iframe。

5. **3D Secure URL 條件**：如前所述，`frontend_redirect_url` 與 `backend_notify_url` 必須使用 https 且可由外網存取，不得使用 `localhost`。開發環境可使用 ngrok、Cloudflare Tunnel 等服務建立對外可訪問的 URL。


#### iOS 串接

- **導入 SDK**：將 `TPDirect.framework` 加入專案並在 Bridging‑Header 導入 `#import <TPDirect/TPDirect.h>`【579034451417585†L25-L29】。
- **環境初始化**：在 `application:didFinishLaunchingWithOptions:` 中呼叫 `TPDSetup.setWithAppId(APP_ID, withAppKey: APP_KEY, with: TPDServerType.ServerType)` 設定 APP ID、APP Key 與環境【579034451417585†L31-L38】。
- **建立輸入表單**：於 storyboard 放置 `TPDForm`，使用 `TPDForm.setup(withContainer:)` 初始化表單並設定顏色等樣式【579034451417585†L40-L48】；
- **監聽輸入狀態**：呼叫 `tpdForm.onFormUpdated` 檢查是否可以取得 prime【579034451417585†L50-L58】；
- **取得 prime**：建立 `TPDCard` 物件，呼叫 `getPrime()` 取得 prime，成功回傳會提供 prime、cardInfo 與 cardIdentifier【579034451417585†L68-L76】。

#### Android 串接

- **導入 SDK**：將 `tpdirect.aar` 加入專案；在程式啟動時使用 `TPDSetup.initInstance(getApplicationContext(), APP_ID, APP_KEY, TPDServerType.Sandbox)` 初始化 SDK【300807536856367†L360-L367】。
- **建立表單**：在 layout 放置 `TPDForm` 元件【300807536856367†L368-L375】。如需使用卡片持有人資訊，可開啟名稱、電子郵件、電話欄位等【300807536856367†L376-L389】。
- **建立 Card 物件並取得 prime**：使用 `TPDCard.setup(TPDForm)` 建立卡片，設定成功與失敗回呼並呼叫 `getPrime()`【300807536856367†L390-L406】。
- **其他支付方式**：若整合 Google Pay、Line Pay、Samsung Pay 等，需根據官方範例在 AndroidManifest 中加入必要權限及 intent-filter，並依序初始化 TPDMerchant、TPDConsumer 或對應類別，然後呼叫 `getPrime()` 取得 token【300807536856367†L418-L533】。

### 後端應用
#### 認證與 HTTP header

TapPay 的後端 API 需要在 HTTP 請求標頭加入 `x-api-key`，其值為您的 Partner Key。官方文件指出，Partner Key 是每個合作夥伴的驗證金鑰，呼叫任何 TapPay Server API 時必須將它放在 header 的 `x-api-key`【101114005462120†L1627-L1630】【101114005462120†L2714-L2718】。您可在 TapPay Portal → Information 取得此 key。若缺少此 header，請求將返回 401 Unauthorized。建議同時在 header 指定 `Content-Type: application/json`。

#### 環境變數與 /api/config 配置

為了讓前端 Web SDK 正確初始化，後端必須將 TapPay 憑證與環境設定儲存在環境變數，並透過一個 API 端點回傳給前端。請在專案根目錄建立 `.env`，至少包含：

* `TAPPAY_APP_ID` – Portal 顯示的 App ID。
* `TAPPAY_APP_KEY` – Portal 顯示的 App Key。
* `TAPPAY_MERCHANT_ID` – 商家代碼。
* `PUBLIC_BASE_URL` – 您部署的公開網域 (https；勿使用 localhost)。3D Secure 會跳轉至這個域名。
* `TAPPAY_ENV` – `sandbox` 或 `production`。

在 Node server 中使用 dotenv 載入 `.env`，建議建立一個 `config` 物件並導出：

```javascript
import dotenv from 'dotenv';
dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[ENV_MISSING] ${name} is required`);
  return v;
}

export const config = {
  appId: Number(required('TAPPAY_APP_ID')),
  appKey: required('TAPPAY_APP_KEY'),
  merchantId: required('TAPPAY_MERCHANT_ID'),
  publicBaseUrl: required('PUBLIC_BASE_URL'),
  env: process.env.TAPPAY_ENV || 'sandbox'
};
```

然後實作 `/api/config`，將上述資料回傳給前端：

```javascript
app.get('/api/config', (req, res) => {
  res.json(config);
});
```

請檢查這些環境變數皆有值 (`appId` 不等於 0、`appKey` 不為空)。若值缺失，建議在 server 啟動時即拋出錯誤並終止程式，避免進入錯誤狀態。


#### pay‑by‑prime

使用一次性 `prime` 進行付款。請組成以下 JSON 並使用 POST 呼叫 `/tpc/payment/pay-by-prime`：

```json
{
  "prime": "Prime from frontend",  // 必填，90 秒內有效【615069830403162†L101-L121】
  "partner_key": "YourPartnerKey",  // 必填【615069830403162†L118-L123】
  "merchant_id": "YourMerchantID",  // 必填【615069830403162†L125-L129】
  "amount": 100,  // 必填，交易金額【615069830403162†L131-L133】
  "currency": "TWD",  // 交易幣別【615069830403162†L139-L140】
  "order_number": "YourOrderNo",  // 商家自訂交易編號【615069830403162†L142-L143】
  "details": "Item description",  // 商品描述【615069830403162†L149-L151】
  "cardholder": { /* cardholder info for fraud & 3D verification */ },
  "three_domain_secure": true,  // 若需 3D 驗證，需搭配 result_url
  "result_url": {
    "frontend_redirect_url": "https://your.frontend/return",
    "backend_notify_url": "https://your.backend/notify"
  }
}
```

注意：

- 您的 HTTP request header 必須帶上 `x‑api‑key: {PartnerKey}` 以及 `Content‑Type: application/json`，這是 TapPay 後端 API 的身份驗證要求【101114005462120†L1627-L1630】【101114005462120†L2714-L2718】。
- `three_domain_secure` 為 true 時，必須在 `result_url` 物件中同時設定 `frontend_redirect_url` 與 `backend_notify_url`（不可放在頂層）；兩者皆須以 https 開頭，且 `backend_notify_url` 僅支援 443  port。若缺少 `result_url` 或其內的任何欄位，TapPay 將回傳錯誤碼 629/630/631【54858304092704†L439-L443】。收到前端 redirect 後，建議再次呼叫 Record API 以確認交易狀態，避免 notify 漏接造成不一致【53207851533674†L94-L99】。
- 如果 `remember = true`，回傳 JSON 會包含 `card_key` 與 `card_token`，可保存並用於下次 Pay by Card Token API【53207851533674†L106-L113】。

#### bind‑card

用於用戶綁定卡片並取得可重複使用的 `card_key` 與 `card_token`。請發送 POST 至 `/tpc/payment/bind-card`：

```json
{
  "prime": "Prime from frontend",  // 一次性 token【768072990513475†L116-L139】
  "partner_key": "YourPartnerKey",  // 必填【768072990513475†L141-L143】
  "merchant_id": "YourMerchantID",  // 必填【768072990513475†L141-L143】
  "currency": "TWD",  // 必填，幣別【768072990513475†L148-L150】
  "three_domain_secure": true,  // 是否啟用 3D 驗證【768072990513475†L151-L153】
  "result_url": {
    "frontend_redirect_url": "https://your.frontend/return",
    "backend_notify_url": "https://your.backend/notify"
  },
  "cardholder": { /* cardholder info */ }
}
```

注意：

- 呼叫 `/tpc/payment/bind-card` 時，請在 HTTP request header 加上 `x‑api‑key: {PartnerKey}` 和 `Content‑Type: application/json`；這是 TapPay 驗證您的 API 請求所必需【101114005462120†L1627-L1630】【101114005462120†L2714-L2718】。
- 回應中包含 `card_key`、`card_token`，可用於後續扣款【768072990513475†L130-L133】。
- 若 `three_domain_secure` 為 true，必須在 `result_url` 物件中提供 `frontend_redirect_url` 與 `backend_notify_url`，且這兩個 URL 需以 https 開頭（`backend_notify_url` 僅支援 443 port）；缺失任一欄位會導致 TapPay 回傳錯誤碼 629/630/631【54858304092704†L439-L443】【53207851533674†L241-L252】。
- `cardholder` 欄位：建議填入持卡人資訊（例如 `phone_number`、`name`、`email` 等），這些資訊會用於 TapPay 風控與 3D Secure 驗證。部分收單行可能要求特定欄位，未填或格式不正確可能導致授權失敗。

#### pay‑by‑token

使用已綁定卡片（card_key / card_token）進行扣款。發送 POST 至 `/tpc/payment/pay-by-token`：

```json
{
  "card_key": "YourCardKey",  // 必填【615069830403162†L455-L458】
  "card_token": "YourCardToken",  // 必填【615069830403162†L455-L458】
  "partner_key": "YourPartnerKey",  // 必填【615069830403162†L458-L459】
  "merchant_id": "YourMerchantID",  // 必填【615069830403162†L459-L463】
  "amount": 100,
  "currency": "TWD",
  "order_number": "OrderNo",
  "three_domain_secure": false,  // 若需 3D 驗證改為 true【615069830403162†L431-L435】
  "frontend_redirect_url": "...",  // three_domain_secure 為 true 時必填
  "backend_notify_url": "..."
  ,
  "cardholder": { /* cardholder info for fraud & 3D verification */ }
}
```

注意：

- 呼叫 `/tpc/payment/pay-by-token` 時，請在 HTTP request header 加上 `x‑api‑key: {PartnerKey}` 和 `Content‑Type: application/json`，這是 TapPay 驗證您的 API 請求所必需【101114005462120†L1627-L1630】【101114005462120†L2714-L2718】。
- 若設定 `three_domain_secure = true`，必須在頂層提供 `frontend_redirect_url` 與 `backend_notify_url` 兩個欄位，且這兩個 URL 必須以 https 開頭，`backend_notify_url` 僅支援 443 port；缺少任一欄位會導致 TapPay 回傳 629/630/631 錯誤代碼【54858304092704†L439-L443】【53207851533674†L244-L251】。
 - 若設定 `three_domain_secure = true`，必須在頂層提供 `frontend_redirect_url` 與 `backend_notify_url` 兩個欄位，且這兩個 URL 必須以 https 開頭，`backend_notify_url` 僅支援 443 port；缺少任一欄位會導致 TapPay 回傳 629/630/631 錯誤代碼【54858304092704†L439-L443】【53207851533674†L244-L251】。
 - `cardholder` 欄位：為必填（欄位內各屬性可根據需求留空），請提供持卡人資訊（如 `phone_number`、`name`、`email` 等）以供 TapPay 風控與 3D Secure 驗證使用。部分收單行要求特定欄位，未填寫或格式錯誤可能導致授權失敗。

#### record‑api

詳見「交易查詢」段落。本 API 為取得交易紀錄所用，支援分頁與多重篩選【615069830403162†L832-L849】。

#### refund

詳見「交易退款」段落。呼叫 `/tpc/transaction/refund` 執行退刷，需提供 `partner_key` 與 `rec_trade_id`【615069830403162†L775-L780】；若是部分退款，需再填入 `amount`【615069830403162†L781-L785】。

#### frontend‑redirect

當用戶完成 e-payment 或 3D Secure 交易後，TapPay 會以 GET 方式導回 `frontend_redirect_url`，並在 Query String 中帶以下參數【53207851533674†L761-L789】：

| 參數              | 說明                                                                                                                                       |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `rec_trade_id`    | TapPay 交易識別碼【53207851533674†L783-L784】                                                                                               |
| `order_number`    | 商家自訂訂單編號【53207851533674†L785-L786】                                                                                               |
| `bank_transaction_id` | 銀行交易識別碼【53207851533674†L787-L789】                                                                                             |
| `status`          | 回應代碼，0 表示成功【53207851533674†L793-L794】                                                                                           |

前端 redirect 容易被偽造，因此 TapPay 建議仍以後端通知或 Record API 來確認交易結果【53207851533674†L795-L796】。

#### backend‑notify

完成 e‑payment 或 3D Secure 交易後，TapPay 會自動 POST JSON 至 `backend_notify_url`【53207851533674†L798-L803】。內容包含：

- `rec_trade_id` – 交易識別碼【53207851533674†L823-L825】
- `auth_code` – 授權碼（僅限信用卡及 Token Pay）【53207851533674†L826-L827】
- `bank_transaction_id` / `bank_order_number` – 銀行交易/訂單編號【53207851533674†L829-L832】
- `order_number` – 商家自訂訂單編號【53207851533674†L833-L834】
- `amount` – 交易金額【53207851533674†L835-L836】
- `status` / `msg` – TapPay 回應代碼與訊息【53207851533674†L836-L838】
- `transaction_time_millis`、`transaction_complete_millis` – 銀行處理時間與交易完成時間【53207851533674†L838-L841】
- `pay_info` – 電子支付相關資訊（僅適用於 e‑payment）【53207851533674†L841-L843】

後端應收到 HTTP 200 後才會停止重送；若重送五次仍未成功，TapPay 會寄信通知技術聯絡人【53207851533674†L803-L807】。

#### trade‑history‑api

Trade History API 用於查詢特定交易的完整歷史紀錄（授權、請款、退款）。

- Request Body 需包含 `partner_key` 與 `rec_trade_id`【768072990513475†L380-L395】。
- 呼叫 `/tpc/transaction/trade-history` 時，請在 HTTP header 加上 `x‑api‑key` 和 `Content‑Type: application/json`，這與其他後端 API 相同。TapPay 回傳 `trade_history` 陣列，包含每次交易的時間、授權碼、金額、貨幣等資訊【768072990513475†L399-L409】。

## 錯誤代碼與處理

整合 TapPay 時，您必須根據回應中的 `status`（前端 SDK）或 `status` 欄位（後端 API）判斷結果。以下根據官方錯誤表整理常見狀況及處理建議：

### 前端 SDK 錯誤碼（Web/iOS/Android）

TapPay Web、iOS 與 Android SDK 在取得 `prime` 或使用支付元件時會回傳 `status` 與 `msg`。您需要依據下列類別處理：

| Status | 類別 | 簡要說明 |
|------|------|------|
| 0 | 成功 | 操作成功（取得 prime）【224081706654781†L326-L333】 |
| -1/‑5/‑3/‑4 | SDK 錯誤 | SDK 載入失敗或未知錯誤；檢查 script 路徑、網路與環境設定 |
| 5/11/12/16/41 | 輸入錯誤 | JSON 格式或輸入參數無效，如 App ID/Key 不正確、卡號格式錯誤 |
| 80/81/84 | 認證錯誤 | `x‑api-key` 或 app key 無效、Partner 不存在或未授權【224081706654781†L347-L350】 |
| 122 | 卡片加解密 | 卡片加密錯誤；建議重新送出或聯繫 TapPay 支援【224081706654781†L356-L358】 |
| 401–404 | 請求問題 | 請求被取消、無法取得支付資料或 SDK 專用錯誤，詳見 `msg` |
| 421/422 | 逾時 | Gateway Timeout 或 Authorization Timeout【224081706654781†L368-L370】；可實作重試 |
| 530–599 | 參數遺漏 | 大多為缺少必填或格式不符的參數；請檢查傳入值【224081706654781†L371-L399】 |
| 915 | 系統錯誤 | TapPay 內部錯誤；應記錄並聯繫 TapPay 客服【224081706654781†L306-L314】 |
| 2000–2013 | 卡片內容錯誤 | 卡號、有效月年為空或 CVV 格式錯誤、卡片過期等【224081706654781†L329-L344】 |

**處理建議**：

- **成功 (0)**：取得 prime 後即可送往後端調用 Pay by Prime 或 Bind Card。
- **用戶輸入錯誤**：提示用戶重新輸入正確卡片資訊。
- **認證錯誤 (80/81/84)**：檢查 Partner Key 是否正確且已加到 `x‑api-key` header，確認 IP 已註冊在 Portal。
- **逾時 (421/422)**：實作重試邏輯；重複失敗時記錄並通知技術人員。
- **系統或未知錯誤 (915)**：紀錄錯誤並聯絡 TapPay 支援。

### 後端 API 錯誤碼

後端 API（Pay by Prime、Bind Card、Pay by Token、Record、Refund、Trade‑History 等）回傳 JSON 結構含 `status`。一般 `status = 0` 表示成功，其餘為各種錯誤狀況：

| Status | 類別 | 簡要說明 |
|------|------|------|
| 0 | 成功 | API 呼叫成功【224081706654781†L326-L333】 |
| 2 | 無資料 | Record API 用於表示列表結束【224081706654781†L326-L333】 |
| 4/5 | 設定錯誤 | IP 不符合或 JSON 格式錯誤【224081706654781†L326-L333】 |
| 41 | 卡片錯誤 | 卡號格式錯誤【224081706654781†L326-L335】 |
| 61/66–75 | 商家／功能不支援 | 商家不存在、支付方式不支援、無法取消退款、3D Secure 設定不支援等【224081706654781†L326-L345】 |
| 80/81/84 | 認證錯誤 | `x‑api-key` 或 app key 無效、Partner 不存在或未授權【224081706654781†L347-L350】 |
| 89 | 幣別不支援 | 商家不支援此幣別【224081706654781†L350-L351】 |
| 91/121 | prime 錯誤 | prime 已過期或無效【224081706654781†L352-L357】 |
| 126–132 | 條碼／會員錯誤 | Barcode 或會員不存在、已使用或過期【224081706654781†L359-L365】 |
| 141 | 不支援 pending | Partner 不支援 amount pending【224081706654781†L366-L367】 |
| 421/422 | 逾時 | Gateway Timeout 或 Authorization Timeout【224081706654781†L368-L370】 |
| 501–527 | 缺少必填欄位 | 缺少 cardholder、merchant_id、prime、currency、details、partner_key 等【224081706654781†L371-L399】 |
| 510–529 | 無效或超出範圍 | 金額、分期、延遲請款天數、幣別、訂單號或交易 ID 等無效或超出範圍【224081706654781†L380-L399】 |
| 535–551, 559–566 | 查詢條件錯誤 | Record API 篩選條件錯誤（時間區間、金額上下限、排序欄位等）【224081706654781†L401-L416】 |
| 627–633 | result_url 錯誤 | `frontend_redirect_url` / `backend_notify_url` 缺少或格式錯誤，或收單行不支援 3D Secure【224081706654781†L439-L445】 |
| 643–699 | 其他參數錯誤 | 包含 `additional_data`、`line_pay_product_image_url`、barcode 參數等無效【224081706654781†L449-L462】 |
| 691 | 不支援 non‑3DS | 收單行不支援非 3D Secure【224081706654781†L453-L454】 |
| 713 | 分店不支援 | Partner 不支援 sub_merchant【224081706654781†L464-L466】 |
| 815–829 | Easy Wallet FTPS 錯誤 | FTPS 帳號或密碼錯誤、路徑不存在或連線失敗【224081706654781†L485-L492】 |

**處理建議**：

- **成功 (0)**：依回傳資料進行業務流程。
- **prime 相關錯誤 (91/121)**：prime 已過期或無效，提示用戶重新取得 prime。
- **缺少或無效參數 (501–566)**：檢查 request body 所有必填欄位並確認值符合規定。
- **認證錯誤 (80/81/84)**：確認 `Partner Key` 正確、API 是否啟用，IP 是否在白名單。
- **功能不支援 (61, 66–75, 89, 141, 691)**：商家或收單行未啟用對應支付方式、3D Secure 或幣別；應終止交易並與 TapPay 聯繫。
- **逾時 (421/422)**：可實作重試機制，若多次失敗則記錄錯誤並聯繫 TapPay。
- **系統錯誤 (915 或 1000 以上代碼)**：TapPay 或銀行內部錯誤，應記錄並通知支援。

## 使用建議

1. **Sandbox 測試**：在正式上線前，先於 sandbox 環境測試串接流程。不同環境的 App ID、App Key、Merchant ID 彼此獨立。
2. **3D 驗證與安全性**：對於風險較高或收單銀行要求必須啟用 3D 驗證的商家，請在 API request 中加入 `three_domain_secure = true` 並妥善處理 `frontend_redirect_url` 與 `backend_notify_url`【53207851533674†L90-L93】。
3. **交易結果確認**：即使前端收到成功 redirect，也應透過 Backend Notify 或 Record API 進一步確認交易狀態，避免因網路延遲或錯誤導致資料不一致【53207851533674†L94-L99】。
4. **儲存重要憑證**：Partner Key、App Key、Merchant ID、Card Token 等屬敏感資訊，應妥善保存並避免在前端程式碼中暴露。

以上內容組成了 TapPay 串接的基本 Skill，模型可依照各自的應用場景選用相應的 API 與流程。
