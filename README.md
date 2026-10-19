# Make a Wish・生日故事遊戲模板

一套**純靜態**的手機網頁遊戲模板：完整童話故事 + 五章小遊戲，最後自動生成可下載、可自訂背景的**生日分享卡**。任何人都可以免費拿去改，為重要的人做一個專屬生日遊戲。

> 系列主打：極簡使用流程——朋友掃 QR Code → 玩故事 → 在卡面上寫下自己的名字 → 分享。

---

## ✦ 遊戲內容

- **序章〜第五章**完整童話故事劇本（繁體中文書面語）
- 小遊戲玩法：線索搜證、審問投票、剪刀石頭布 BOSS 戰、指令節奏戰、音波節奏、拼名、真假辨認、重寫願望、真心話……
- **生日分享卡**：Canvas 繪製 → 支援 JPEG／PNG／WebP／**HEIC・HEIF** 背景上傳 → 可拖動、1–3 倍縮放 → 下載 PNG
- 程序生成 BGM（Web Audio，8 個場景主題＋生日歌旋律）＋ 音效，**無任何音訊檔、無版權問題**
- 全部技術採用原生 HTML／CSS／JavaScript，**零構建、零依賴、零後端**

## ✦ 快速開始

```bash
# 1. 下載 / clone 本 repo
git clone https://github.com/YOU/make-a-wish-game.git
cd make-a-wish-game

# 2. 本地預覽（必須以網站方式執行，雙擊 index.html 不支援匯出卡）
npx serve .        # 或 python -m http.server
```

將 `game` 部署成靜態站即可（見下方部署）。

## ✦ 客製化（改一個檔案就好）

### 1. `js/config.js` — 全部品牌／生日卡設定

| 設定 | 作用 | 建議 |
|---|---|---|
| `brandName` / `cardBrand` | 首頁大標題、卡面燙金文字 | 卡面建議手動加空格（例：`生 日 快 樂`） |
| `subBrand` | 副標題（英文我最愛） | 例：`— Happy Birthday —` |
| `seriesName` | 邀請函、故事卡署名的系列名 | |
| `dedication` | 結尾畫面獻詞 | |
| `cardTitle` / `cardBlessing` / `fixedDate` | 卡面頂部標題、生日祝福、**固定日期（YYYY.MM.DD）** | |
| `nameLabelPrefix` | 卡面名字欄上方那一句 | 例：`這個女孩的名字：` |
| `defaultBg` / `defaultMessage` / `defaultHeroName` | 預設背景圖、預設留言、預設名字 | |
| `fileName` | 分享卡下載檔名 | |
| `heroName` | 對白名牌代名（空白女孩／??? 顯示成這個） | |
| `heroStoryName` | **故事主角名**，同時決定立繪 key | 改後記得同步做下面第 2 步 |
| `shortcutLabel` / `shortcutTaps` | 首頁祕密入口文字／點擊次數 | |
| `rhythmTarget` | 水底音波節奏小遊戲通關點數（越低越易） | 難度調整在這裡 |
| `saveKey` / `skipResumeKey` | localStorage／sessionStorage key | 多人共用才需要改 |

### 2. 故事主角改名（全域搜尋取代）

內附一份完整示例故事（主角叫 Belle）。想改成對方名字：

```
搜尋取代（全部 js/ 檔案）：
  'Belle'  →  你的主角名
  '貝小姐'  →  入境代號（第三、四章角色冊）
```

也可以直接改寫 `js/story.js / story2.js / story3.js`，劇情結構自由發揮。

### 3. 圖片替換（`assets/`）

| 檔案 | 用途 |
|---|---|
| `bg-*.webp`（19 張） | 場景背景，`js/engine.js` 內 `BG_MUSIC` 會按場景挑 BGM |
| `ch-*.webp`（19 張） | 角色立繪，`js/engine.js` 內 `CHARS` 對應名字 |
| `belle-rose*.webp`（4 張） | 主角立繪（另作預設卡面背景） |

全部都可以換上你自己的圖片（建議維持檔名或同步改 JS 內對應路徑）。分享卡自訂背景由使用者手機上傳，不經伺服器。

### 4. 音樂微調（進階）

BGM 全部由 Web Audio 程序生成，設定在 `js/engine.js` 的 `MUSIC_THEMES`（BPM、和弦、音色、音量）。生日卡旋律在 `js/story3.js` 尾部 `birthday:` 主題，想改成自家歌就改這裡的 `melody` 音高分佈。

## ✦ 部署（全部免費）

### Vercel
```bash
npm i -g vercel
vercel --prod
```

### Surge
```bash
npm i -g surge
surge . 你的網址.surge.sh
```

### GitHub Pages
repo Settings → Pages → 分支 `main` / 目錄 `/ (root)` → Save。

## ✦ 做 QR Code

部署完成後，用任何 QR 工具（例如 `qrcode` npm 套件、qr-code-generator.com）把你的正式網址製成 QR。
建議：容錯等級 **H**、靜區 6、≥ 1200px，列印直接用 SVG。

## ✦ 已知限制與注意

- **必須以 http(s) 部署** —— `file://` 直接打開時，瀏覽器安全限制會令分享卡匯出與背景圖處理失敗。
- **iOS Safari 的自動播放限制** 已在引擎內透過首次觸控解鎖 `AudioContext` 處理；如用微信／IG 內建瀏覽器打開，建議提示使用者「點右上角用 Safari 開」以取得最佳音量。
- HEIC／HEIF 轉換使用 CDN 載入 `heic2any`（`js/engine3.js`）；離線環境可自行 vendor 該檔案。
- 序章故事卡、章節流程等故事內容是示例，歡迎改寫。請保留 LICENSE。

## ✦ Credits

示例故事、美術與音樂由本 repo 原作者製作；模板化改動歡迎任何人貢獻 PR。

## ✦ License

[MIT](LICENSE) — 免費商用／非商用皆可，唯請保留版權宣告。示例美術允許同一授權下重用。
