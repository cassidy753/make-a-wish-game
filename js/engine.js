/* ===== Make a Wish — 遊戲引擎 ===== */
const HERO = (typeof CONFIG !== 'undefined' && CONFIG.heroStoryName) || 'Belle';
const SAVE_KEY = (typeof CONFIG !== 'undefined' && CONFIG.saveKey) || 'make_a_wish_save_v1';
const SKIP_RESUME_KEY = (typeof CONFIG !== 'undefined' && CONFIG.skipResumeKey) || 'make-a-wish-skip-resume';
const $ = s => document.querySelector(s);

let q = [], idx = 0, state = null, muted = false, shareShortcutMode = false;
let typing = false, typeTimer = null, fullText = '';
let dialogueHistory = [], dialogueHistoryPos = -1;

/* ---------- 音效（WebAudio 生成） ---------- */
let AC = null, audioUnlocked = false;
function beep(freq, dur, type='sine', vol=0.12, when=0){
  if (muted) return;
  try{
    if (!ensureAudio()) return;
    if (AC.state === 'suspended') AC.resume().catch(()=>{});
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + when + dur);
    o.connect(g).connect(AC.destination);
    o.start(AC.currentTime + when); o.stop(AC.currentTime + when + dur + 0.05);
  }catch(e){}
}
const sTap  = () => beep(760, .05, 'sine', .06);
const sOk   = () => { beep(660,.09); beep(990,.14,'sine',.12,.09); };
const sBad  = () => beep(180,.22,'sawtooth',.1);
const sFlip = () => beep(520,.08,'triangle',.1);
const sGift = () => { beep(523,.1); beep(659,.1,'sine',.12,.1); beep(784,.18,'sine',.12,.2); };

/* ---------- BGM（程序生成・按場景切換）---------- */
let musicBus = null, musicTimer = null, musicTheme = null, musicStep = 0, nextNoteTime = 0, curChord = [0,7,12];
const MUSIC_THEMES = {
  title:  {bpm:64, root:220.00, scale:[0,3,7,10,12,15], chords:[[0,7,12,15],[-2,5,10,14],[3,10,15,19],[0,7,12,17]], pad:'sine', lead:'triangle', arp:[0,2,1,3,2,1], leadProb:.3, vol:.10},
  cosmic: {bpm:56, root:196.00, scale:[0,3,7,10,12,15], chords:[[0,7,12],[-4,3,10],[5,12,17],[0,7,14]], pad:'sine', lead:'sine', arp:[0,1,2,1], leadProb:.2, vol:.09},
  castle: {bpm:66, root:233.08, scale:[0,2,4,5,7,9,11], chords:[[0,4,9],[-3,2,7],[5,9,12],[2,7,11]], pad:'triangle', lead:'sine', arp:[0,1,2,3,2,1], leadProb:.38, vol:.10},
  library:{bpm:70, root:220.00, scale:[0,2,3,7,9,12], chords:[[0,3,10],[-2,5,9],[3,7,14],[0,5,12]], pad:'triangle', lead:'triangle', arp:[0,2,1,3,0,2], leadProb:.42, vol:.10},
  ship:   {bpm:84, root:246.94, scale:[0,2,4,7,9,12], chords:[[0,4,7],[2,5,9],[-3,4,7],[5,9,12]], pad:'triangle', lead:'square', arp:[0,1,2,3,2,3], leadProb:.45, vol:.06},
  forest: {bpm:68, root:196.00, scale:[0,3,5,7,10,12], chords:[[0,7,12],[-2,5,10],[3,7,12],[0,5,10]], pad:'sine', lead:'triangle', arp:[0,2,1,2,3,1], leadProb:.38, vol:.10},
  tension:{bpm:60, root:185.00, scale:[0,2,3,7,8,11], chords:[[0,6,12],[-2,3,10],[1,8,13],[0,7,12]], pad:'sine', lead:'sine', arp:[0,1,2,1], leadProb:.18, vol:.07},
  boss:   {bpm:96, root:174.61, scale:[0,3,5,7,10,12], chords:[[0,6,12],[0,7,13],[-2,6,10],[3,7,12]], pad:'sawtooth', lead:'square', arp:[0,2,1,3,0,2,1,3], leadProb:.5, vol:.07}
};
const BG_MUSIC = {prologue:'cosmic', castle:'castle', library:'library', ship:'ship', forest:'forest', 'forest-fog':'forest', 'mirror-room':'tension', kitchen:'tension', mirror:'tension', midnight:'boss', gold:'castle'};

function ensureAudio(){
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  if (!AC) AC = new AudioContextClass();
  if (!musicBus){
    musicBus = AC.createGain(); musicBus.gain.value = 1;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    musicBus.connect(lp); lp.connect(AC.destination);
  }
  return true;
}
function armMusic(reset=false){
  if (!musicTheme || muted || !ensureAudio()) return;
  if (!musicTimer) musicTimer = setInterval(musicSchedule, 90);
  musicBus.gain.cancelScheduledValues(AC.currentTime);
  musicBus.gain.setValueAtTime(0.0001, AC.currentTime);
  musicBus.gain.linearRampToValueAtTime(1, AC.currentTime + 0.8);
  nextNoteTime = AC.currentTime + 0.1;
  if (reset) musicStep = 0;
}
function unlockAudio(){
  if (muted || !ensureAudio()) return;
  const needsRestart = !audioUnlocked || AC.state === 'suspended';
  const activate = ()=>{
    audioUnlocked = true;
    if (needsRestart) armMusic();
  };
  if (AC.state === 'suspended') AC.resume().then(activate).catch(()=>{});
  else activate();
}
function mNote(freq, t, dur, wave, vol){
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = wave; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(musicBus);
  o.start(t); o.stop(t + dur + 0.05);
}
function setMusic(name){
  const changed = musicTheme !== name;
  musicTheme = name;
  if (!name || muted || !window.AudioContext && !window.webkitAudioContext) return;
  if (!audioUnlocked){
    if (navigator.userActivation && navigator.userActivation.isActive) unlockAudio();
    return;
  }
  if (AC && AC.state === 'suspended'){ unlockAudio(); return; }
  if (changed) armMusic(true);
}
function musicSchedule(){
  if (!AC || !musicBus || AC.state !== 'running' || !musicTheme || muted){ nextNoteTime = AC ? AC.currentTime + 0.1 : 0; return; }
  const th = MUSIC_THEMES[musicTheme]; if (!th) return;
  const stepDur = (60 / th.bpm) / 2; /* 八分音 */
  if (nextNoteTime < AC.currentTime) nextNoteTime = AC.currentTime + 0.05;
  while (nextNoteTime < AC.currentTime + 0.35){
    const s = musicStep % 16;
    if (s % 8 === 0){
      curChord = th.chords[(musicStep / 8 | 0) % th.chords.length];
      curChord.forEach(semi => mNote(th.root * Math.pow(2, semi/12) / 2, nextNoteTime, stepDur * 7.5, th.pad, th.vol * 0.5));
    }
    const ni = th.arp[s % th.arp.length] % curChord.length;
    mNote(th.root * Math.pow(2, curChord[ni]/12), nextNoteTime, stepDur * 0.9, th.lead, th.vol * (th.arpVol == null ? 0.5 : th.arpVol));
    if (th.melody){
      const semi = th.melody[musicStep % th.melody.length];
      if (semi != null) mNote(th.root * Math.pow(2, semi/12), nextNoteTime, stepDur * 1.65, th.lead, th.vol * (th.melodyVol || 0.7));
    } else if (Math.random() < th.leadProb){
      const semi = th.scale[Math.floor(Math.random() * th.scale.length)] + 12;
      mNote(th.root * Math.pow(2, semi/12), nextNoteTime + stepDur/2, stepDur * 1.7, th.lead, th.vol * 0.45);
    }
    nextNoteTime += stepDur;
    musicStep++;
  }
}

/* ---------- 存檔 ---------- */
function newState(){ return {hp:100, clues:[], fate:null, keepsake:null, gifts:[], chapter:'', search:null, suspects:[], cards:[], fz:'m', auto:false, story:false, shareMessage:null, shareName:null}; }
function save(){ if (shareShortcutMode) return; try{ localStorage.setItem(SAVE_KEY, JSON.stringify({q, idx, state, muted})); }catch(e){} }
function loadSave(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){ return null; } }
function clearSave(){ localStorage.removeItem(SAVE_KEY); }
function vibrate(ms){ try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} }
let toastTimer = null;
function toast(msg){
  let t = $('#toast');
  if (!t){
    t = document.createElement('div');
    t.id = 'toast';
    $('#game-screen').appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
}
/* 全部背景圖預載（解決章節切換載入慢） */
function preloadAssets(){
  ['bg-castle','bg-library','bg-ship','bg-forest','bg-mirror','bg-kitchen','bg-cellar','bg-midnight','bg-sea','bg-trench','bg-desert','bg-palace','bg-camp','bg-summit','bg-street','bg-record','bg-willow','bg-core','bg-party'].forEach(n=>{
    const im = new Image(); im.src = 'assets/' + n + '.webp';
  });
  ['ch-ka','ch-snow','ch-hunter','ch-maid','ch-mirror','ch-phantom','ch-ariel','ch-flounder','ch-sebastian','ch-jelly','ch-jasmine','ch-genie','ch-darkgenie','ch-mulan','ch-mushu','ch-bear','ch-niki','ch-fakeniki','ch-blankgirl'].forEach(n=>{
    const im = new Image(); im.src = 'assets/' + n + '.webp';
  });
  ['belle-rose','belle-rose2','belle-rose3','belle-rose4'].forEach(n=>{
    const im = new Image(); im.src = 'assets/' + n + '.webp';
  });
}
let autoTimer = null;
function armAuto(){
  clearTimeout(autoTimer);
  if (!state || !state.auto) return;
  autoTimer = setTimeout(()=>{
    if (typing) return;
    const ov = $('#overlay');
    if (ov && !ov.classList.contains('hidden')) return;
    const d = $('#dialog'); d && d.click();
  }, 1700);
}
function hasGift(key){ return !!(state && state.gifts && state.gifts.some(g => g.iconKey === key)); }
function isStoryMode(){ return !!(state && state.story); }

/* ---------- 畫面切換 ---------- */
function showTitle(){
  $('#title-screen').classList.add('active');
  $('#game-screen').classList.remove('active');
  const sv = loadSave();
  $('#btn-continue').style.display = sv ? 'block' : 'none';
  try{ setMusic('title'); }catch(e){}
}
function showGame(){
  $('#title-screen').classList.remove('active');
  $('#game-screen').classList.add('active');
}

/* ---------- HUD ---------- */
function renderHUD(){
  $('#hud-chapter').textContent = state.chapter || '序章';
  let h = '';
  if (state.skill) h += `<span title="${state.skill.name}">${icon(state.skill.iconKey,22)}</span>`;
  state.gifts.forEach(g => h += `<span title="${g.name}">${icon(g.iconKey||'apple',22)}</span>`);
  $('#hud-items').innerHTML = h;
}

/* ---------- 主循環 ---------- */
function startNew(){
  shareShortcutMode = false; q = [...STORY]; idx = 0; state = newState(); dialogueHistory = []; dialogueHistoryPos = -1;
  showGame(); renderHUD(); applyFz(); next();
}
function continueGame(){
  shareShortcutMode = false;
  const sv = loadSave(); if (!sv) return startNew();
  q = sv.q; idx = sv.idx; state = sv.state; muted = !!sv.muted; dialogueHistory = []; dialogueHistoryPos = -1;
  if (!state.cards) state.cards = [];
  if (!state.gifts) state.gifts = [];
  showGame(); renderHUD(); applyFz(); next();
}

document.addEventListener('pointerdown', unlockAudio, {capture:true, passive:true});
document.addEventListener('keydown', unlockAudio, {capture:true});
document.addEventListener('visibilitychange', ()=>{ if (!document.hidden && audioUnlocked) unlockAudio(); });
window.addEventListener('pageshow', ()=>{ if (audioUnlocked) unlockAudio(); });
function next(){
  if (idx >= q.length) return;
  const node = q[idx]; idx++;
  save();
  render(node);
}

/* ---------- 角色立繪 ---------- */
const CHARS = {
  'Belle':'assets/belle-rose.webp',
  '卡先生':'assets/ch-ka.webp',
  '白雪':'assets/ch-snow.webp',
  '獵人':'assets/ch-hunter.webp',
  '侍女小蝶':'assets/ch-maid.webp',
  '魔鏡':'assets/ch-mirror.webp',
  '鏡像幻影':'assets/ch-phantom.webp'
};
if (typeof CONFIG !== 'undefined' && CONFIG.heroStoryName && CONFIG.heroStoryName !== 'Belle'){
  CHARS[CONFIG.heroStoryName] = CHARS.Belle;
  delete CHARS.Belle;
}
let portraitRequest = 0;

/* ---------- 對白 ---------- */
function say(node, fromHistory=false){
  const d = $('#dtext'), np = $('#nameplate');
  if (!fromHistory){
    dialogueHistory.push(node);
    dialogueHistoryPos = dialogueHistory.length - 1;
  }
  const prev = $('#btn-prev');
  const hasPrevious = dialogueHistoryPos > 0;
  prev.style.display = hasPrevious ? 'block' : 'none';
  $('#dialog').classList.toggle('has-prev', hasPrevious);
  prev.onclick = event=>{
    event.stopPropagation();
    if (dialogueHistoryPos <= 0) return;
    clearTimeout(autoTimer);
    dialogueHistoryPos--;
    say(dialogueHistory[dialogueHistoryPos], true);
  };
  let nodeCardIssued = false;
  const issueNodeCard = ()=>{
    if (!node.storyCard || nodeCardIssued) return;
    nodeCardIssued = true;
    maybeStoryCard(node.storyCard, ()=>{});
  };
  let cls = node.t === 'n' ? 'narr' : (node.t === 'sys' ? 'sys' : '');
  if (node.big) cls += ' big';
  d.className = cls;
  if (node.t === 's'){
    np.style.display = 'block';
    np.classList.toggle('narr', false);
    np.textContent = (state.heroName && (node.who === '空白魔女' || node.who === '空白女孩' || node.who === '???')) ? state.heroName : node.who;
    const img = CHARS[node.who];
    const pw = $('#portrait-wrap'), pi = $('#portrait');
    pi.onerror = ()=>{ pw.classList.remove('show','bounce'); };
    if (img){
      const target = img;
      if (pi.getAttribute('src') !== target){
        /* 新圖載好前收起角色框，避免閃出上一個角色。 */
        const request = ++portraitRequest;
        pw.classList.remove('show','bounce');
        pi.classList.add('morphing');
        const preload = new Image();
        preload.onload = ()=>{
          if (request !== portraitRequest) return;
          pi.src = target;
          $('#portrait-label').textContent = node.who;
          pw.classList.toggle('left', node.who !== HERO);
          pi.classList.remove('morphing');
          pw.classList.add('show','bounce');
        };
        preload.onerror = ()=>{ if (request === portraitRequest) pw.classList.remove('show','bounce'); };
        preload.src = target;
      } else {
        portraitRequest++;
        pi.src = target;
        $('#portrait-label').textContent = node.who;
        pw.classList.toggle('left', node.who !== HERO);
        pw.classList.add('show','bounce');
      }
    } else {
      portraitRequest++;
      pw.classList.remove('show','bounce');
    }
  } else {
    np.style.display = 'none';
    if (node.t === 'n') d.classList.add('narr');
    if (node.t === 'sys') d.classList.add('sys');
  }
  fullText = node.text;
  d.innerHTML = '<span id="tt"></span>';
  const tt = $('#tt');
  if (node.blank) tt.classList.add('blanked');
  typing = true; $('#dnext').classList.remove('show');
  let i = 0;
  clearInterval(typeTimer);
  typeTimer = setInterval(()=>{
    i++;
    tt.textContent = fullText.slice(0, i);
    if (i % 3 === 0) sTap();
    if (i >= fullText.length) finishType();
  }, 26);
  function finishType(){
    clearInterval(typeTimer); typing = false;
    tt.textContent = fullText;
    if (node.blank) tt.classList.add('blanked'); /* 空白化：墨字褪白 */
    $('#dnext').classList.add('show');
    if (!fromHistory) armAuto();
    if (!fromHistory) issueNodeCard();
  }
  $('#dialog').onclick = ()=>{
    if (typing){
      clearInterval(typeTimer); typing = false;
      tt.textContent = fullText;
      if (node.blank) tt.classList.add('blanked');
      $('#dnext').classList.add('show');
      if (!fromHistory) issueNodeCard();
    } else if (fromHistory && dialogueHistoryPos < dialogueHistory.length - 1) {
      sTap();
      dialogueHistoryPos++;
      say(dialogueHistory[dialogueHistoryPos], true);
    } else { sTap(); next(); }
  };
}

/* ---------- Overlay 工具 ---------- */
function openOv(html){ $('#overlay-box').innerHTML = html; $('#overlay').classList.remove('hidden'); }
function closeOv(){ $('#overlay').classList.add('hidden'); $('#overlay-box').classList.remove('battle'); $('#overlay-box').innerHTML = ''; }

/* ---------- 節點渲染 ---------- */
function render(node){
  if (typeof EXTRA !== 'undefined' && EXTRA[node.t]){ EXTRA[node.t](node); return; }
  switch(node.t){
    case 'ch': {
      state.chapter = node.title.replace('・',' · ');
      renderHUD();
      const cc = $('#chapter-card'), inner = $('#chapter-card-inner');
      inner.innerHTML = `<div class="ch-num">${node.num}</div><div class="ch-title">${node.title}</div><div class="ch-line"></div>`;
      cc.classList.remove('hidden');
      sGift();
      let entered = false;
      const go = ()=>{
        if (entered) return;
        entered = true;
        cc.classList.add('hidden'); cc.onclick=null;
        toast('💾 進度已儲存');
        if (node.deferCard) next();
        else maybeStoryCard(node.num, next);
      };
      cc.onclick = go; setTimeout(go, 2600);
      break;
    }
    case 'bg': $('#bg').className = node.cls; setMusic(BG_MUSIC[node.cls] || null); next(); break;
    case 'fog': $('#fog').classList.toggle('on', node.on); next(); break;
    case 'p': $('#portrait-wrap').classList.toggle('show', node.show); if(!node.show) $('#portrait-wrap').classList.remove('bounce'); next(); break;
    case 'fx': if (node.kind==='shake'){ $('#game-screen').classList.add('shake'); setTimeout(()=>$('#game-screen').classList.remove('shake'),600);} next(); break;
    case 'n': case 's': case 'sys': say(node); break;

    case 'epic': {
      sFlip();
      const ov = document.createElement('div');
      ov.className = 'epic-ov';
      ov.innerHTML = `<p>${node.text}</p>`;
      $('#game-screen').appendChild(ov);
      ov.onclick = ()=>{ sTap(); ov.remove(); next(); };
      break;
    }

    case 'role':
      sFlip();
      openOv(`
        <div class="letter-env" id="letter-env">
          <div class="env-body"></div>
          <div class="env-letter">入 境 憑 證</div>
          <div class="env-flap"></div>
          <div class="env-seal">✦</div>
        </div>
        <div class="env-hint" id="env-hint">✉ 一封邀請函飄到你面前——點一下拆開</div>
        <div id="role-content" style="display:none"></div>
      `);
      const env = $('#letter-env');
      env.onclick = ()=>{
        if (env.classList.contains('open')) return;
        env.classList.add('open');
        sFlip(); vibrate(40);
        $('#env-hint').textContent = '✉ 邀請函拆封……';
        setTimeout(()=>{
          /* 信件內容另起視窗 */
          openOv(`<div class="rolebook">${node.html}</div>
            <div style="text-align:center;margin-top:14px"><button class="btn btn-gold btn-mini" id="ov-go">✦ 收入行囊</button></div>`);
          $('#ov-go').onclick = ()=>{ sOk(); closeOv(); next(); };
        }, 1250);
      };
      break;

    case 'cards': pickCard(node); break;
    case 'keepsake': pickKeep(node); break;
    case 'search': searchUI(node); break;
    case 'suspects': suspectUI(node); break;
    case '_susback':
      if (state.suspects.length >= SUSPECTS.length){ $('#bg').className = 'forest'; next(); }
      else suspectUI({title:'審問階段', sub:'還有證人沒問。線索，就是你最好的武器。'});
      break;
    case 'vote': voteUI(VOTE); break;
    case 'boss': bossUI(); break;
    case 'frag': fragUI(node); break;
    case 'gift': giftUI(node); break;
    case 'end': endUI(); break;
    default: next();
  }
}

/* ---------- 命運卡（先見名，選後見功效）---------- */
function pickCard(node){
  openOv(`<div class="ov-title">🃏 ${node.title}</div><div class="ov-sub">${node.sub}<br><b style="color:#f5d67b">選擇之後，才會揭示卡的真正力量。</b></div>
    <div class="card-row" id="cards-row"></div>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-gold btn-mini" id="ov-go" style="visibility:hidden">✦ 帶着它出發</button></div>`);
  const row = $('#cards-row');
  let picked = false;
  CARDS.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'fcard';
    el.innerHTML = `<div class="fc-icon">${icon(c.iconKey,44)}</div><div class="fc-name">${c.name}</div><div class="fc-src">《${c.src}》</div><div class="fc-desc">${c.desc}</div>`;
    el.onclick = ()=>{
      if (picked) return;
      picked = true;
      sFlip();
      el.classList.add('flip');
      row.querySelectorAll('.fcard').forEach(x=>{ if(x!==el) x.style.opacity=.35; });
      state.skill = {name:c.name, iconKey:c.iconKey, fateName:c.name}; save(); renderHUD();
      setTimeout(()=>$('#ov-go').style.visibility='visible', 500);
    };
    row.appendChild(el);
  });
  $('#ov-go').onclick = ()=>{ sOk(); closeOv(); next(); };
}

/* ---------- 信物（先見名，選後見功效）---------- */
function pickKeep(node){
  openOv(`<div class="ov-title">🎁 ${node.title}</div><div class="ov-sub">${node.sub}<br><b style="color:#f5d67b">選擇之後，才會揭示信物的真正力量。</b></div>
    <div class="card-row" id="keep-row"></div>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-gold btn-mini" id="ov-go" style="visibility:hidden">✦ 選好了</button></div>`);
  const row = $('#keep-row');
  let picked = false;
  KEEPSAKES.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'fcard';
    el.innerHTML = `<div class="fc-icon">${icon(c.iconKey,44)}</div><div class="fc-name">${c.name}</div><div class="fc-src">《${c.src}》</div><div class="fc-desc">${c.desc}</div>`;
    el.onclick = ()=>{
      if (picked) return;
      picked = true;
      sFlip();
      el.classList.add('flip');
      row.querySelectorAll('.fcard').forEach(x=>{ if(x!==el) x.style.opacity=.35; });
      const fateName = state.skill && (state.skill.fateName || state.skill.name);
      state.skill = {
        name: fateName ? fateName + '・' + c.name : c.name,
        iconKey: c.iconKey,
        fateName: fateName || '',
        keepsakeName: c.name
      };
      save(); renderHUD();
      setTimeout(()=>$('#ov-go').style.visibility='visible', 500);
    };
    row.appendChild(el);
  });
  $('#ov-go').onclick = ()=>{ sOk(); closeOv(); next(); };
}

/* ---------- 搜證 ---------- */
function searchUI(node){
  if (!state.search) state.search = {room:0, found:[]};
  renderRoom(node);
  function renderRoom(node){
    const r = SEARCH_ROOMS[state.search.room];
    const foundHere = [];
    openOv(`<div class="ov-title">${node.title}</div>
      <div class="ov-sub">${node.sub}<br><b>${r.label}</b></div>
      <div class="clue-bar" id="clue-bar"></div>
      <div class="search-scene ${r.cls}" id="scene"></div>
      <div class="ov-sub" id="search-msg" style="min-height:20px"></div>
      <div style="text-align:center"><button class="btn btn-gold btn-mini" id="ov-go" style="visibility:hidden">✦ 收齊了，離開</button></div>`);
    renderChips();
    r.spots.forEach(sp=>{
      const el = document.createElement('div');
      el.className = 'hotspot';
      el.style.left = sp.x+'%'; el.style.top = sp.y+'%';
      if (sp.clue && state.search.found.includes(sp.clue.id)){ el.classList.add('done'); foundHere.push(sp.clue.id); }
      el.onclick = ()=>{
        if (sp.clue){
          if (state.search.found.includes(sp.clue.id)) return;
          sOk();
          state.search.found.push(sp.clue.id);
          el.classList.add('done');
          $('#search-msg').textContent = `獲得線索【${sp.clue.name}】：${sp.clue.desc}`;
          renderChips(); save();
          checkRoom();
        } else {
          sBad();
          $('#search-msg').textContent = sp.decoy;
        }
      };
      $('#scene').appendChild(el);
    });
    checkRoom();
    function checkRoom(){
      const need = r.spots.filter(s=>s.clue).length;
      const got = r.spots.filter(s=>s.clue && state.search.found.includes(s.clue.id)).length;
      if (got >= need){
        $('#ov-go').style.visibility = 'visible';
        $('#ov-go').onclick = ()=>{
          sOk();
          state.search.room++;
          if (state.search.room >= SEARCH_ROOMS.length){ state.search = null; closeOv(); next(); }
          else { save(); renderRoom(node); }
        };
      }
    }
    function renderChips(){
      const bar = $('#clue-bar'); if(!bar) return;
      bar.innerHTML = state.search.found.map(id=>{
        let c=null; SEARCH_ROOMS.forEach(rm=>rm.spots.forEach(s=>{ if(s.clue&&s.clue.id===id) c=s.clue; }));
        return `<span class="clue-chip">${c?c.name:''}</span>`;
      }).join('') || '<span class="clue-chip">尚未找到線索</span>';
    }
  }
}

/* ---------- 審問 ---------- */
function suspectUI(node){
  openOv(`<div class="ov-title">${node.title}</div><div class="ov-sub">${node.sub}</div>
    <div class="choice-list" id="sus-list"></div>`);
  const list = $('#sus-list');
  SUSPECTS.forEach((s,i)=>{
    const done = state.suspects.includes(i);
    const el = document.createElement('button');
    el.className = 'choice-btn' + (done ? ' locked' : '');
    el.textContent = `${s.name} ${done ? '✓' : ''}`;
    el.onclick = ()=>{
      if (done) return;
      sOk(); closeOv();
      if (s.bg) $('#bg').className = s.bg;
      state.suspects.push(i); save();
      q.splice(idx, 0, ...s.nodes, {t:'_susback'});
      next();
    };
    list.appendChild(el);
  });
}

/* ---------- 投票（按勻 3 個人物口供，「以上皆非」先會出現） ---------- */
function voteUI(node){
  openOv(`<div class="ov-title">🗳️ ${node.title}</div><div class="ov-sub" id="vote-msg">${node.sub}<br><span id="vote-count">先聽完 3 位嫌疑人的回應——</span></div>
    <div class="choice-list" id="vote-list"></div>`);
  const list = $('#vote-list');
  const heard = [];
  const suspects = node.options.filter(op=>!op.correct);
  const noneOp = node.options.find(op=>op.correct);
  suspects.forEach((op,i)=>{
    const el = document.createElement('button');
    el.className = 'choice-btn';
    el.textContent = op.label;
    el.onclick = ()=>{
      if (heard.includes(i)) return;
      heard.push(i);
      sOk();
      el.classList.add('locked');
      el.textContent = op.label + ' ✓';
      $('#vote-msg').innerHTML = '🗣 ' + op.wrong + `<br><span id="vote-count">${heard.length}/3 ——${heard.length >= 3 ? '「以上皆非」選項出現了！' : '再聽下一位。'}</span>`;
      if (heard.length >= 3){
        const none = document.createElement('button');
        none.className = 'choice-btn vote-none';
        none.textContent = noneOp.label;
        none.onclick = ()=>{
          sOk(); vibrate(60);
          none.classList.add('picked');
          setTimeout(()=>{ closeOv(); next(); }, 700);
        };
        list.appendChild(none);
      }
    };
    list.appendChild(el);
  });
}

/* ---------- Boss 戰：5 秒計時・剪刀石頭布 ---------- */
function bossUI(){
  const B = BOSS;
  const BEATS = {'✌️':'✋','✊':'✌️','✋':'✊'};   /* key 贏 value（標準規則） */
  let bossLives = B.bossLives, myLives = B.playerLives, round = 0, fails = 0, over = false, dragonUsed = false;
  let usedItems = [], doubleNext = false, doublePick = null, slipperArm = false, featherArm = false;
  let hintOn = false, timer = null, timeLeft = 0, lock = false, extraTime = 0;
  let logTail = B.intro;

  /* ⑥ 準備視窗：玩家確認先開打 */
  openOv(`<div class="boss-result prep">
    <div class="br-icon">⚔️</div>
    <div class="br-title">BOSS 戰：${B.name}</div>
    <div class="ov-sub">${B.intro}</div>
    <div class="ov-sub">規則：剪刀石頭布｜妳有 ${B.playerLives} 條命・對手有 ${B.bossLives} 條命｜每回合 ${B.turnSeconds} 秒<br>道具每場各用一次——失去最後一條命後會獲得提示協助。</div>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="boss-start">⚔️ 準備完成，開始！</button></div>
  </div>`);

  function myItems(){
    /* ② 統一技能：每場戰鬥一次失誤豁免 */
    return state.skill ? ['skill'] : [];
  }

  function livesHTML(n, max, cls){
    let h = '';
    for (let i=0;i<max;i++) h += `<span class="life-dot ${i<n?cls:''}"></span>`;
    return h;
  }

  function draw(){
    const nextMove = B.cycle[round % 3];
    $('#bw').innerHTML = `
      <div class="ov-title">⚔️ BOSS 戰：${B.name}（剪刀石頭布）</div>
      <div class="hp-label">幻影　${bossLives}/${B.bossLives}</div>
      <div class="lives-row">${livesHTML(bossLives, B.bossLives, 'on-red')}</div>
      <div class="hp-label">${HERO}　${myLives}/${B.playerLives}</div>
      <div class="lives-row">${livesHTML(myLives, B.playerLives, 'on-gold')}</div>
      ${hintOn ? `<div class="hint-bar">💡 ${B.hint}<br>Boss 下一手：<b>${B.cycleName[nextMove]} ${nextMove}</b></div>` : ''}
      <div class="battle-log" id="blog">${logTail}</div>
      <div class="timer-bar"><div id="tbar" style="width:100%"></div></div>
      <div class="rps-row">
        <button class="rps-btn" data-mv="✌️"><span class="ri">✌️</span>剪刀</button>
        <button class="rps-btn" data-mv="✊"><span class="ri">✊</span>石頭</button>
        <button class="rps-btn" data-mv="✋"><span class="ri">✋</span>布</button>
      </div>
      <div class="item-header">✦ 護身技能（每場戰鬥一次）</div>
      <div class="item-row">${myItems().map(k=>{
        const used = usedItems.includes('skill');
        return `<button class="item-btn" data-item="skill" ${used?'disabled':''} title="本回合即使落敗也不扣除生命值（限一次）">${icon(state.skill.iconKey,18)} ${state.skill.name}・失誤豁免${used?' ✓':''}</button>`;
      }).join('') || '<span class="clue-chip">序章選技能後會在這裡出現</span>'}</div>
      ${fails>=2?'<div style="margin-top:10px"><button class="btn btn-line btn-mini" id="story-mode">📖 劇情模式（直接過關）</button></div>':''}
      ${hasGift('dragon') && !dragonUsed ? '<div style="margin-top:10px"><button class="btn btn-line btn-mini" id="mushu-skip">🐉 木須亂入！（跳過最難一步）</button></div>' : ''}
    `;

    document.querySelectorAll('.rps-btn').forEach(b=>b.onclick=()=>pick(b.dataset.mv));
    document.querySelectorAll('.item-btn').forEach(b=>b.onclick=()=>useItem(b.dataset.item));
    const sm = $('#story-mode'); if (sm) sm.onclick = ()=>win(true);
    const ms = $('#mushu-skip'); if (ms) ms.onclick = ()=>{ dragonUsed = true; sGift(); vibrate(80); logTail = '🐉 木須：「英雄守護者·偉大的木須，登場——！」一團火焰攪亂了全場，幻影當場呆住！'; bossLives = 0; over = true; clearInterval(timer); logTail += '<br>💫 ' + B.finisher; draw(); setTimeout(showVictory, 1600); };
    startTimer();
  }
  function startTimer(){
    clearInterval(timer);
    timeLeft = B.turnSeconds + extraTime;
    extraTime = 0;
    const total = timeLeft;
    timer = setInterval(()=>{
      timeLeft -= 0.1;
      const bar = $('#tbar');
      if (bar) bar.style.width = Math.max(0, timeLeft/total*100)+'%';
      if (timeLeft <= 0){ clearInterval(timer); resolve(null); }
    }, 100);
  }

  function useItem(k){
    if (over || lock || usedItems.includes(k)) return;
    usedItems.push(k);
    if (k === 'skill'){
      sOk();
      featherArm = true;
      logTail = '✦ 護身技能發光：下一次輸了，不扣命！';
      draw();
      return;
    }
    const it = BATTLE_ITEMS[k];
    sOk();
    if (it.type === 'instant-hint'){ hintOn = true; logTail = '🦗 蟋蟀仔：「讓我看看……它的下一招就是這個！（提示已開）」'; }
    else if (it.type === 'instant-time'){ extraTime = 5; logTail = '🕰️ 白兔懷錶：「遲到了，遲到了——不如多給妳 5 秒？」'; }
    else if (it.type === 'instant-life'){ myLives = Math.min(B.playerLives, myLives+1); logTail = '🍯 甜味蔓延，傷口癒合。（+1 命）'; }
    else if (it.type === 'arm-double'){ doubleNext = true; logTail = '📡 巴斯光年：「無限宇宙，永不孤單——下回合妳可以一次出兩招！」'; }
    else if (it.type === 'arm-tie'){ slipperArm = true; logTail = '🥿 玻璃鞋發光：本回合平手也算妳獲勝！'; }
    else if (it.type === 'arm-loss'){ featherArm = true; logTail = '🪶 羽毛輕輕托住妳：下一次落敗，不扣命。'; }
    draw();
  }

  function pick(mv){
    if (over || lock) return;
    if (doubleNext){
      if (!doublePick){
        doublePick = mv;
        clearInterval(timer);
        logTail = `📡 雙重出招！第一招：${B.cycleName[mv]} ${mv}——再選第二招！`;
        draw();
        return;
      }
      const mv1 = doublePick, mv2 = mv;
      doublePick = null; doubleNext = false;
      const bossMove = B.cycle[round % 3];
      const w1 = BEATS[mv1] === bossMove, w2 = BEATS[mv2] === bossMove;
      const l1 = BEATS[bossMove] === mv1, l2 = BEATS[bossMove] === mv2;
      if (w1 || w2) finishRound('win', `📡 雙重出招 ${B.cycleName[mv1]}＋${B.cycleName[mv2]}——至少一招命中！幻影 -1！`);
      else if (l1 && l2) finishRound('lose', '📡 兩招都被壓制……（-1 命）');
      else finishRound('tie', '📡 其中一招戰平——幻影擋住了，但沒有失血。');
      return;
    }
    resolve(mv);
  }

  function resolve(mv){
    if (over) return;
    lock = true; clearInterval(timer);
    const bossMove = B.cycle[round % 3];
    if (mv === null){
      finishRound('lose', '⏰ 5 秒內未出招——被幻影偷襲了！（-1 命）');
      return;
    }
    if (BEATS[mv] === bossMove){
      finishRound('win', `妳出 ${B.cycleName[mv]} ${mv}，幻影出 ${B.cycleName[bossMove]} ${bossMove}——妳贏了！幻影 -1！`);
    } else if (BEATS[bossMove] === mv){
      if (featherArm){ featherArm = false; finishRound('tie2', `妳出 ${B.cycleName[mv]}，輸了——但 🪶 羽毛托住了妳，不扣命！`); }
      else finishRound('lose', `妳出 ${B.cycleName[mv]}，幻影出 ${B.cycleName[bossMove]}——輸了。（-1 命）`);
    } else {
      if (slipperArm){ slipperArm = false; finishRound('win', `平手——但 🥿 玻璃鞋判定：妳贏！幻影 -1！`); }
      else finishRound('tie', `雙方同時出 ${B.cycleName[mv]}——平手，再來一次！`);
    }
  }

  function finishRound(result, msg){
    logTail = msg;
    if (result === 'win') bossLives--;
    if (result === 'lose'){
      myLives--;
      sBad(); vibrate(120);
      $('#game-screen').classList.add('shake');
      setTimeout(()=>$('#game-screen').classList.remove('shake'),500);
    } else sOk();
    round++;
    if (bossLives <= 0){
      over = true; clearInterval(timer);
      logTail = '💫 ' + B.finisher; draw();
      sGift(); vibrate([80,60,120]);
      /* 勝利視窗 */
      setTimeout(()=>{
        openOv(`<div class="boss-result win">
          <div class="br-icon">🏆</div>
          <div class="br-title">戰勝 ${B.name}！</div>
          <div class="ov-sub">${B.finisher}</div>
          <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="br-go">✦ 繼續旅程</button></div>
        </div>`);
        $('#overlay-box').classList.remove('battle');
        $('#br-go').onclick = ()=>{ sOk(); closeOv(); next(); };
      }, 1600);
      return;
    }
    if (myLives <= 0){
      fails++; over = true; clearInterval(timer);
      sBad(); vibrate(200);
      /* 敗北視窗：重新再來 */
      setTimeout(()=>{
        openOv(`<div class="boss-result lose">
          <div class="br-icon">💤</div>
          <div class="br-title">被 ${B.name} 擊倒了……</div>
          <div class="ov-sub">卡先生：「休息一下再來！提示會幫你。」${fails >= 1 ? '<br>（提示已開啟，重試保留進度）' : ''}</div>
          <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="br-retry">↺ 再試一次</button></div>
        </div>`);
        $('#overlay-box').classList.remove('battle');
        $('#br-retry').onclick = ()=>{
          sOk();
          hintOn = true; /* 扣最後 1 條命後，提示長開；全滅重來都保留 */
          $('#overlay-box').classList.add('battle');
          $('#overlay-box').innerHTML = '<div id="bw"></div>';
          reset();
        };
      }, 1200);
      return;
    }
    lock = false;
    draw();
  }

  function reset(){
    over = false; bossLives = B.bossLives; myLives = B.playerLives; round = 0;
    usedItems = []; doubleNext = false; doublePick = null; slipperArm = false; featherArm = false;
    logTail = '🍯 妳重新握緊劍柄。幻影也重新聚成形——再來！';
    draw();
  }

  function win(story){
    clearInterval(timer);
    if (story){ logTail = '📖 劇情模式：幻影在妳的故事面前，緩緩消散。'; draw(); setTimeout(()=>{ closeOv(); next(); }, 1000); return; }
    showVictory();
  }
  function showVictory(){
    openOv(`<div class="boss-result win">
      <div class="br-icon">🏆</div>
      <div class="br-title">戰勝 ${B.name}！</div>
      <div class="ov-sub">${B.finisher}</div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="br-go">✦ 繼續旅程</button></div>
    </div>`);
    $('#overlay-box').classList.remove('battle');
    $('#br-go').onclick = ()=>{ sOk(); closeOv(); next(); };
  }
  $('#boss-start').onclick = ()=>{
    sOk(); vibrate(60);
    $('#overlay-box').classList.add('battle');
    $('#overlay-box').innerHTML = '<div id="bw"></div>';
    draw();
  };
}

/* ---------- 記憶碎片 ---------- */
function fragUI(node){
  const f = FRAGS[node.n];
  sGift(); vibrate([60,50,60]);
  openOv(`<div class="frag-wrap">
    <div class="fr-tag">✦ ${f.tag} ✦</div>
    <div class="fr-body">${f.body}</div>
    <button class="btn btn-gold btn-mini" id="ov-go">✦ 收下這片記憶</button>
  </div>`);
  $('#ov-go').onclick = ()=>{ sOk(); closeOv(); next(); };
}

/* ---------- 獲得信物 ---------- */
function giftUI(node){
  sGift();
  state.gifts.push({icon:node.icon, iconKey:node.iconKey, name:node.name}); save(); renderHUD();
  openOv(`<div class="gift-card">
    <div class="g-icon">${node.iconKey ? icon(node.iconKey, 52) : node.icon}</div>
    <div class="g-name">獲得信物：${node.name}</div>
    <div class="g-desc">《${node.src}》<br>${node.desc}</div>
    <div style="margin-top:14px"><button class="btn btn-gold btn-mini" id="ov-go">✦ 收入行囊</button></div>
  </div>`);
  $('#ov-go').onclick = ()=>{ sOk(); closeOv(); next(); };
}

/* ---------- Demo 結束 ---------- */
function endUI(){
  sGift();
  openOv(`<div class="gift-card">
    <div class="g-icon">🌹</div>
    <div class="g-name">Phase 1 Demo 完</div>
    <div class="g-desc">序章＋第一章試玩版到此為止。<br>前面還有四個世界、一位魔女，和一個約定。<br><br>${(typeof CONFIG!=='undefined'&&CONFIG.dedication)||'—— 獻給妳 ——'}</div>
    <div style="margin-top:14px;display:flex;gap:10px;justify-content:center">
      <button class="btn btn-line btn-mini" id="ov-home">回標題</button>
      <button class="btn btn-gold btn-mini" id="ov-restart">重新開始</button>
    </div>
  </div>`);
  $('#ov-home').onclick = ()=>{ closeOv(); showTitle();
preloadAssets(); };
  $('#ov-restart').onclick = ()=>{ clearSave(); closeOv(); startNew(); };
}

/* ---------- ③ 強制跳過（卡關自救） ---------- */
$('#btn-skip').onclick = ()=>{
  sTap();
  openOv(`<div class="ov-title">⏭ 強制跳過</div>
    <div class="ov-sub">卡關或者遇到 bug？跳過目前一段（戰鬥/小遊戲會直接判勝）。</div>
    <div style="text-align:center;display:flex;gap:10px;justify-content:center;margin-top:12px">
      <button class="btn btn-gold btn-mini" id="skip-yes">⏭ 確認跳過</button>
      <button class="btn btn-line btn-mini" id="skip-no">取消</button>
    </div>`);
  $('#skip-no').onclick = ()=>{ closeOv(); };
  $('#skip-yes').onclick = ()=>{
    sOk(); vibrate(50);
    save();
    sessionStorage.setItem(SKIP_RESUME_KEY, '1');
    location.reload();
  };
};

/* ---------- 選單 ---------- */
$('#btn-menu').onclick = ()=>{
  openOv(`<div class="ov-title">☰ 選單</div>
    <div class="menu-list">
      <button class="btn btn-gold" id="m-resume">▸ 繼續遊戲</button>
      <button class="btn btn-line" id="m-sound">音效：${muted?'關':'開'}</button>
      <button class="btn btn-line" id="m-fz">字體大小：${{s:'細',m:'正常',l:'大'}[state.fz]||'正常'}</button>
      <button class="btn btn-line" id="m-auto">對白自動播放：${state.auto?'開':'關'}</button>
      <button class="btn btn-line" id="m-story">劇情模式（簡單）：${state.story?'開':'關'}</button>
      <button class="btn btn-line" id="m-gallery">🖼 故事卡畫廊（${(state.cards||[]).length}/6）</button>
      <button class="btn btn-line" id="m-title">回標題（進度已自動保存）</button>
      <button class="btn btn-line" id="m-reset">重新開始（清除進度）</button>
    </div>`);
  $('#m-resume').onclick = ()=>{ closeOv(); };
  $('#m-sound').onclick = ()=>{
    muted = !muted; save();
    $('#m-sound').textContent = '音效：'+(muted?'關':'開');
    if (muted && musicBus) musicBus.gain.value = 0.0001;
    else { unlockAudio(); armMusic(); }
  };
  $('#m-fz').onclick = ()=>{ state.fz = state.fz === 's' ? 'm' : state.fz === 'm' ? 'l' : 's'; save(); applyFz(); $('#m-fz').textContent = '字體大小：'+({s:'細',m:'正常',l:'大'}[state.fz]); };
  $('#m-auto').onclick = ()=>{ state.auto = !state.auto; save(); $('#m-auto').textContent = '對白自動播放：'+(state.auto?'開':'關'); if (state.auto) armAuto(); };
  $('#m-story').onclick = ()=>{ state.story = !state.story; save(); $('#m-story').textContent = '劇情模式（簡單）：'+(state.story?'開':'關'); };
  $('#m-gallery').onclick = ()=>{ galleryUI(); };
  $('#m-title').onclick = ()=>{ save(); closeOv(); showTitle(); };
  $('#m-reset').onclick = ()=>{ clearSave(); closeOv(); startNew(); };
};
function applyFz(){
  document.body.classList.toggle('fz-s', state.fz === 's');
  document.body.classList.toggle('fz-l', state.fz === 'l');
}

/* ---------- 強制收集：故事卡 ---------- */
const STORY_CARDS = [
  {id:'pro', num:'PROLOGUE',      icon:'🌌', name:'星塵瓶',     desc:'卡先生釀了一千萬年的星塵，標籤寫着：「作為過來人，送給過來的人」。'},
  {id:'c1',  num:'CHAPTER 1',     icon:'🍎', name:'白雪的果園籤詩', desc:'蘋果樹上掛着小木牌：「今天恐懼，明天底氣。」'},
  {id:'c2',  num:'CHAPTER 2',     icon:'🎶', name:'無名搖籃曲譜', desc:'一片貝殼樂譜，音符之間寫着：「送給一位未出現的人。」'},
  {id:'c3',  num:'CHAPTER 3',     icon:'🧞', name:'半個願望',   desc:'一粒許願沙：「寧願少半個願望，也勝過許下一個錯誤的奢望。」'},
  {id:'c4',  num:'CHAPTER 4',     icon:'🐲', name:'木須的鱗片', desc:'木須說：「這片是幸運鱗片！帶著走上旅程吧！」'},
  {id:'c5',  num:'CHAPTER 5',     icon:'💿', name:'黑膠碎角',   desc:'唱片店的一角碎黑膠，播放到一半的歌名：《寫一個不存在的故事》。'}
];
function maybeStoryCard(num, done=()=>{}){
  hideStoryCard();
  const card = STORY_CARDS.find(c => c.num === num);
  if (!card){ done(); return; }
  if (!state.cards) state.cards = [];
  if (state.cards.includes(card.id)){ done(); return; }

  /* 卡面出現即視為派發成功，Skip／重載都不會漏卡。 */
  state.cards.push(card.id); save();
  sGift(); vibrate(40);
  openOv(`
    <div class="story-invite-card">
      <div class="sic-kicker">${num} · 故事卡</div>
      <div class="sic-icon">${card.icon}</div>
      <div class="sic-title">獲得故事卡</div>
      <div class="sic-name">【${card.name}】</div>
      <div class="sic-desc">${card.desc}</div>
      <div class="sic-sign">${(typeof CONFIG!=='undefined'&&CONFIG.seriesName)||'星際故事圖書館'} · 正式派發</div>
      <div class="sic-auto">3 秒後自動繼續</div>
    </div>
  `);
  setTimeout(()=>{
    closeOv();
    toast('✦ 已收到故事卡【' + card.name + '】（' + state.cards.length + '/6）');
    done();
  }, 3000);
}
function hideStoryCard(){ const e = $('#scard'); e && e.remove(); }
function galleryUI(){
  const items = STORY_CARDS.map(c=>{
    const got = state.cards && state.cards.includes(c.id);
    return `<div class="gal-card ${got?'':'locked'}"><div class="scard-icon">${got?c.icon:'❔'}</div><div class="scard-name">${got?c.name:'？？？'}</div><div class="scard-desc">${got?c.desc:'進入對應故事後自動派發'}</div></div>`;
  }).join('');
  openOv(`<div class="ov-title">🖼 故事卡畫廊</div>
    <div class="ov-sub">每個故事世界都會直接顯示並派發一張故事卡！（${(state.cards||[]).length}/6）</div>
    <div class="gal-grid">${items}</div>
    <div style="text-align:center;margin-top:12px"><button class="btn btn-gold btn-mini" id="gal-ok">關閉</button></div>`);
  $('#gal-ok').onclick = ()=>{ closeOv(); };
}

/* ---------- 標題 ---------- */
$('#btn-new').onclick = ()=>{ sOk(); clearSave(); startNew(); };
$('#btn-continue').onclick = ()=>{ sOk(); continueGame(); };
let devShareTaps = 0;
$('#gift-share-entry').onclick = event=>{
  event.stopPropagation();
  devShareTaps++;
  if (devShareTaps < ((typeof CONFIG !== 'undefined' && CONFIG.shortcutTaps) || 3)) return;
  devShareTaps = 0;
  shareShortcutMode = true;
  q = []; idx = 0; state = newState();
  state.firstLine = (typeof STORY_CONFIG !== 'undefined' && STORY_CONFIG.firstLine) || '在很久很久以前當一個女孩說…';
  state.heroName = (typeof CONFIG !== 'undefined' && CONFIG.defaultHeroName) || '晨曦';
  state.shareMessage = (typeof CONFIG !== 'undefined' && CONFIG.defaultMessage) || state.firstLine;
  state.shareName = state.heroName;
  dialogueHistory = []; dialogueHistoryPos = -1;
  showGame(); renderHUD(); applyFz();
  EXTRA.sharecard();
};

showTitle();
window.addEventListener('load', ()=>{
  if (sessionStorage.getItem(SKIP_RESUME_KEY) === '1' && loadSave()){
    sessionStorage.removeItem(SKIP_RESUME_KEY);
    continueGame();
  }
});
preloadAssets();
