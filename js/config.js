/* ============================================================
   Make a Wish — 遊戲設定檔 ★ 只需改這個檔案 ★
   將成個遊戲變成你哋自己嘅生日遊戲：
   1. 改下面 CONFIG 同 STORY_CONFIG 的字
   2. 想改故事主角名，請用編輯器「全部取代」：
        js/story*.js 同 js/engine3.js 內嘅 'Belle' → 你嘅名字
        '貝小姐' → 你嘅入境代號
   3. 圖片放 assets/，背景檔名 bg-*.webp、角色 ch-*.webp
   ============================================================ */

const CONFIG = {
  /* ---------- 品牌文字 ---------- */
  brandName: '童話救援計劃',          /* 首頁大標題 */
  subBrand: '— Make a Wish —',       /* 首頁副標題、分享卡英文字 */
  seriesName: '星際故事圖書館',        /* 邀請函、故事卡署名 */
  disclaimer: '非商業用途',           /* 首頁底部 */
  dedication: '—— 獻給 妳 ——',       /* 結尾畫面 */

  /* ---------- 分享卡（生日卡） ---------- */
  cardBrand: '童 話 救 援 計 劃',     /* 卡面燙金字（建議手動加空格） */
  cardTitle: '🎂 HAPPY BIRTHDAY',
  cardBlessing: '— 生日快樂 —',
  fixedDate: '2026.09.10',           /* 卡面日期 YYYY.MM.DD */
  nameLabelPrefix: '空白女孩有了名字：',
  fileName: 'make-a-wish-card.png',
  defaultBg: 'assets/belle-rose.webp',
  defaultMessage: '有一個女孩等了很久很久，久到宇宙都替她着急。',
  defaultHeroName: '晨曦',

  /* ---------- 主角 ---------- */
  heroName: '妳',                    /* 名牌代名（空白女孩→代名） */
  heroStoryName: 'Belle',            /* 故事主角名（對應 js/story*.js） */
  defaultBg_note: 'defaultBg 係預設卡面背景，可以揀 assets 任何圖片',

  /* ---------- 捷徑與玩法微調 ---------- */
  shortcutLabel: '私人贈禮',          /* 首頁三擊入口文字 */
  shortcutTaps: 3,
  rhythmTarget: 12,                  /* 水底音波節奏小遊戲通關點數 */
};

const STORY_CONFIG = {
  firstLine: '在很久很久以前當一個女孩說…',
  storylineKicker: 'THE WHOLE STORY',
  storylineTitle: '✦ 我們走過的完整故事',
  storylineSub: '在製作生日分享卡之前，重看這段故事真正如何開始，又如何重新開始。',
  storylineButton: '🎂 製作生日分享卡'
};

/* ===== 以下勿動：把設定交給引擎 ===== */
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.STORY_CONFIG = STORY_CONFIG;
  document.addEventListener('DOMContentLoaded', () => {
    document.title = CONFIG.brandName + '｜Make a Wish';
    const map = {
      'title-eyebrow': CONFIG.seriesName + '系列',
      'title-main': CONFIG.brandName,
      'title-sub': CONFIG.subBrand,
      'gift-share-entry': CONFIG.shortcutLabel,
      'disclaimer': CONFIG.disclaimer,
      'portrait-label': CONFIG.heroStoryName
    };
    Object.entries(map).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
    const portrait = document.getElementById('portrait');
    if (portrait && CONFIG.defaultBg) portrait.src = CONFIG.defaultBg;
  });
}
