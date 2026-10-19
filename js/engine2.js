/* ===== Phase 2 玩法引擎：Ch2 聲音配對／節奏拍打・Ch3 潛行／許願牌局 ===== */
const EXTRA = {};

function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- Ch2：聲音記憶配對（泡泡只顯示 1/3 波形碎片＋時限） ---------- */
/* ---------- Ch2：聲音記憶配對（真聲拆三節・錯的上下反轉/左右掉亂・限時） ---------- */
EXTRA.soundmatch = function(){
  let r = 0;
  const SEGS = [[0, 1/3], [1/3, 2/3], [2/3, 1]];
  function wavePts(seed, opt){
    const rnd = mulberry(seed);
    const pts = [];
    for (let i=0;i<=48;i++){
      let a = Math.sin(i*0.8 + (seed%7))*0.5 + rnd()*1.1;
      if (opt && opt.mirror) a = -a;
      if (opt && opt.noise && rnd()>0.72) a += (rnd()-0.5)*1.8;
      pts.push([i*(200/48), 30 - a*20]);
    }
    return pts;
  }
  function segSVG(pts, frag, tf){
    /* frag=[起,迄]；tf: null=原樣, 'v'=上下反轉, 'h'=左右掉亂 */
    const s = Math.floor(48*frag[0]), e = Math.floor(48*frag[1]);
    let seg = pts.slice(s, e+1).map(p=>[p[0], p[1]]);
    if (tf === 'v') seg = seg.map(p=>[p[0], 60 - p[1]]);
    if (tf === 'h'){
      const reversedY = seg.map(p=>p[1]).reverse();
      seg = seg.map((p,i)=>[p[0], reversedY[i]]);
    }
    /* 完整波形做淡色底（方便比較方向） */
    const ghost = pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
    const real = seg.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
    return `<svg viewBox="0 0 200 60" preserveAspectRatio="none">
      <polyline points="${ghost}" fill="none" stroke="rgba(143,224,255,.14)" stroke-width="1.5"/>
      <line x1="${(frag[0]*200).toFixed(1)}" y1="0" x2="${(frag[0]*200).toFixed(1)}" y2="60" stroke="rgba(143,224,255,.2)" stroke-dasharray="3 3"/>
      <line x1="${(frag[1]*200).toFixed(1)}" y1="0" x2="${(frag[1]*200).toFixed(1)}" y2="60" stroke="rgba(143,224,255,.2)" stroke-dasharray="3 3"/>
      <polyline points="${real}" fill="none" stroke="#8fe0ff" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`;
  }
  function render(){
    const R = SOUND_ROUNDS[r];
    const correctSeed = 100 + r*17;
    const pts = wavePts(correctSeed);
    const correctIdx = Math.floor(Math.random()*R.n);
    const correctSeg = SEGS[Math.floor(Math.random()*3)];
    let trapIdx = -1;
    if (R.mirror){ do { trapIdx = Math.floor(Math.random()*R.n); } while (trapIdx===correctIdx); }
    let tLeft = R.time, tick = null, solved = false;
    openOv(`
      <div class="ov-title">🎵 聲音記憶配對</div>
      <div class="ov-sub">${R.sub}</div>
      <div class="target-panel"><div class="tp-label">Ariel 真聲（完整）</div><svg viewBox="0 0 200 60" preserveAspectRatio="none"><polyline points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="none" stroke="#8fe0ff" stroke-width="2.5"/></svg></div>
      <div class="hp-label">⏱ <span id="sm-time">${tLeft}</span>s</div>
      <div class="hpbar hp-me"><div id="sm-bar" style="width:100%"></div></div>
      <div class="bubble-grid" id="bub-grid"></div>
      <div class="ov-sub" id="bub-msg" style="min-height:20px">只有一個泡泡沒有被改動方向——淡色線是完整波形，用來對比！</div>
    `);
    const grid = $('#bub-grid');
    for (let i=0;i<R.n;i++){
      const isCorrect = i===correctIdx;
      const frag = isCorrect ? correctSeg : SEGS[i % 3];
      let tf = null;
      if (!isCorrect) tf = (i % 2 === 0) ? 'v' : 'h';   /* 錯的：上下反轉或左右掉亂 */
      const b = document.createElement('div');
      b.className = 'bubble';
      b.innerHTML = segSVG(pts, frag, tf);
      b.onclick = ()=>{
        if (solved || b.classList.contains('pop')) return;
        if (isCorrect){
          solved = true; clearInterval(tick);
          sOk(); b.classList.add('good');
          $('#bub-msg').textContent = '✓ 找到了！這段真聲沒有被改動！';
          setTimeout(()=>{ r++; if (r>=SOUND_ROUNDS.length){ closeOv(); next(); } else render(); }, 800);
        } else {
          sBad(); b.classList.add('pop');
          setTimeout(()=>b.remove(), 380);
          $('#bub-msg').textContent = '✗ 泡泡爆開——這段是被翻轉/打亂過的！';
        }
      };
      grid.appendChild(b);
    }
    tick = setInterval(()=>{
      if (solved){ clearInterval(tick); return; }
      tLeft--;
      const t = $('#sm-time'), bar = $('#sm-bar');
      t && (t.textContent = Math.max(0, tLeft));
      bar && (bar.style.width = Math.max(0, tLeft/R.time*100)+'%');
      if (tLeft <= 0){
        clearInterval(tick);
        sBad(); vibrate(90);
        $('#bub-msg').textContent = '⏱ 時間到——聲音散了，再試一次！';
        setTimeout(render, 1100);
      }
    }, 1000);
  }
  render();
};

/* ---------- Ch2：節奏拍打 Boss（槽位距離拉遠＋圈圈縮細，杜絕重疊） ---------- */
EXTRA.rhythm = function(){
  const CFG2 = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const TOTAL = 24, NEED = CFG2.rhythmTarget || 12;
  /* 6 個槽位：水平垂直都隔至少 20%，輪流用 */
  const SLOTS = [[18,20],[62,20],[40,44],[18,68],[62,68],[40,88]];
  let slotBag = [];
  const nextSlot = ()=>{
    if (!slotBag.length){ slotBag = [...SLOTS.keys()]; for (let i=slotBag.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [slotBag[i],slotBag[j]]=[slotBag[j],slotBag[i]]; } }
    return SLOTS[slotBag.pop()];
  };
  let idx = 0, reso = 0, over = false;
  openOv(`
    <div class="ov-title">🎵 節奏拍打：靜音水母怪</div>
    <div class="ov-sub">圓圈縮至貼近音符時按下！集滿共鳴值！</div>
    <div class="hp-label">共鳴值 <span id="rv-num">0</span>/${TOTAL*2}（需要 ${NEED}）</div>
    <div class="hpbar hp-me"><div id="rv-bar" style="width:0%"></div></div>
    <div class="rhythm-stage" id="rstage"><div class="rhint">準備……</div></div>
    <div class="battle-log" id="rlog">靜音水母怪：「安靜！都給我安靜！！」</div>
  `);
  schedule();
  function schedule(){ if (idx >= TOTAL) return; setTimeout(spawn, 950); }
  function spawn(){
    if (over) return;
    const stage = $('#rstage'); if (!stage) return;
    stage.querySelector('.rhint') && (stage.querySelector('.rhint').style.display='none');
    const [sx, sy] = nextSlot();
    const el = document.createElement('div');
    el.className = 'rnote';
    el.style.left = sx+'%';
    el.style.top = sy+'%';
    el.innerHTML = '<span>🎵</span>';
    const hitAt = performance.now() + 1400;
    el.dataset.hit = hitAt;
    el.onclick = ()=>{
      if (el.dataset.done) return;
      el.dataset.done = 1;
      const diff = Math.abs(performance.now() - hitAt);
      if (diff <= 190) hit('perfect', el);
      else if (diff <= 420) hit('good', el);
      else hit('miss', el);
    };
    stage.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('shrink'));
    setTimeout(()=>{ if (!el.dataset.done && !over){ el.dataset.done = 1; el.remove(); hit('miss', null); } }, 1900);
    idx++;
    if (idx === 8){ const l = $('#rlog'); l && (l.textContent = '水母怪釋放「寂靜波」——不要理會它，繼續拍！'); }
    if (idx === 16){ const l = $('#rlog'); l && (l.textContent = 'Ariel 的歌聲變得更有力量——就快成功了！'); }
    if (idx < TOTAL) schedule(); else setTimeout(finish, 2100);
  }
  function hit(kind, el){
    if (over) return;
    if (kind === 'perfect'){ reso += 2; sOk(); el && el.classList.add('perfect'); }
    else if (kind === 'good'){ reso += 1; sTap(); el && el.classList.add('good'); }
    else { sBad(); $('#game-screen').classList.add('shake'); setTimeout(()=>$('#game-screen').classList.remove('shake'),400); }
    el && setTimeout(()=>el.remove(), 260);
    const n = $('#rv-num'), b = $('#rv-bar');
    n && (n.textContent = reso);
    b && (b.style.width = Math.min(100, reso/(TOTAL*2)*100)+'%');
  }
  function finish(){
    if (over) return;
    over = true;
    if (reso >= NEED){
      sGift(); vibrate([70,50,100]);
      setTimeout(()=>{
        openOv(`<div class="boss-result win">
          <div class="br-icon">🏆</div>
          <div class="br-title">戰勝靜音水母怪！</div>
          <div class="ov-sub">水母的傘蓋炸開成千萬光點。一枚發光的音符，緩緩飄向 Ariel——歌聲勝過沉默！</div>
          <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="br-go">✦ 繼續旅程</button></div>
        </div>`);
        $('#br-go').onclick = ()=>{ sOk(); closeOv(); next(); };
      }, 600);
    } else {
      openOv(`<div class="boss-result lose">
        <div class="br-icon">💤</div>
        <div class="br-title">共鳴不足……</div>
        <div class="ov-sub">水母怪縮回深溝。Ariel：「再來一次！我信妳！」</div>
        <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="br-retry">↺ 重新挑戰</button></div>
      </div>`);
      $('#br-retry').onclick = ()=>{
        sOk();
        closeOv();
        EXTRA.rhythm();
      };
    }
  }
};

/* ---------- Ch3：潛行（視線不重疊・內縮邊界・必須拖動角色） ---------- */
EXTRA.stealth = function(){
  let seg = 0;
  const FOV = 65; /* 130 度視野＝±65 度 */
  const OUTER_EDGE = 8, INNER_EDGE = 14, MAX_MOVE = 7;
  function render(){
    const S = STEALTH_SEGS[seg];
    openOv(`
      <div class="ov-title">🕵️ 潛行</div>
      <div class="ov-sub">${S.sub}</div>
      <div class="stealth-scene" id="st-scene">
        <div class="st-label start" style="left:${S.start.x}%;top:${S.start.y}%">起點</div>
        <div class="st-label end" style="left:${S.exit.x}%;top:${S.exit.y}%">終點</div>
        <div class="safe-zone" style="left:${S.start.x}%;top:${S.start.y}%"></div>
        <div class="player-dot" id="st-me"></div>
      </div>
      <div class="ov-sub" id="st-msg" style="min-height:20px">觀察守衛的朝向與巡邏方向，避開紅色視線並抵達終點。</div>
    `);
    const scene = $('#st-scene'), me = $('#st-me');
    let px = S.start.x, py = S.start.y, caught = false, done = false, dragging = false, activePointer = null, raf;
    function setMe(){ me.style.left = px+'%'; me.style.top = py+'%'; }
    setMe();
    function point(e){
      const rc = scene.getBoundingClientRect();
      return {x:((e.clientX - rc.left) / rc.width) * 100, y:((e.clientY - rc.top) / rc.height) * 100, rc};
    }
    function onDown(e){
      if (caught || done) return;
      const p = point(e);
      const grabDist = Math.hypot((p.x-px)*p.rc.width/100, (p.y-py)*p.rc.height/100);
      if (grabDist > 34){ $('#st-msg').textContent = '按住金色角色再拖動，不能直接點擊遠處瞬移。'; return; }
      dragging = true; activePointer = e.pointerId;
      scene.setPointerCapture && scene.setPointerCapture(e.pointerId);
    }
    function onMove(e){
      if (caught || done || !dragging || e.pointerId !== activePointer) return;
      const p = point(e);
      let tx = Math.max(OUTER_EDGE, Math.min(100-OUTER_EDGE, p.x));
      let ty = Math.max(OUTER_EDGE, Math.min(100-OUTER_EDGE, p.y));
      const nearStart = Math.hypot(tx-S.start.x, ty-S.start.y) < S.safe;
      const nearExit = Math.hypot(tx-S.exit.x, ty-S.exit.y) < 11;
      if (!nearStart && !nearExit){
        tx = Math.max(INNER_EDGE, Math.min(100-INNER_EDGE, tx));
        ty = Math.max(INNER_EDGE, Math.min(100-INNER_EDGE, ty));
      }
      /* 限制單次拖動距離，快速掃到終點亦不能穿過整個場地。 */
      const dx = tx-px, dy = ty-py, dist = Math.hypot(dx,dy);
      const k = dist > MAX_MOVE ? MAX_MOVE/dist : 1;
      px += dx*k; py += dy*k;
      setMe();
    }
    function onUp(e){ if (e.pointerId === activePointer){ dragging = false; activePointer = null; } }
    scene.addEventListener('pointerdown', onDown);
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerup', onUp);
    scene.addEventListener('pointercancel', onUp);
    /* 守衛：來回走動＋130° 視線錐（朝行進方向） */
    const gEls = S.guards.map(g=>{
      const cone = document.createElement('div');
      cone.className = 'cone';
      scene.appendChild(cone);
      const d = document.createElement('div');
      d.className = 'guard';
      scene.appendChild(d);
      return {g, cone, d, lastAng: 0};
    });
    const t0 = performance.now();
    function guardPos(g, t){
      const cyc = (t / g.T + (g.ph||0)) % 1;
      const forward = cyc < 0.5;
      const k = forward ? cyc*2 : 2 - cyc*2;   /* 0→1→0 來回 */
      return [g.x1 + (g.x2-g.x1)*k, g.y1 + (g.y2-g.y1)*k, forward];
    }
    function loop(now){
      if (done) return;
      if (!scene.isConnected){ cancelAnimationFrame(raf); return; }
      const t = (now - t0)/1000;
      const w = scene.clientWidth, h = scene.clientHeight;
      const states = gEls.map(o=>{
        const [gx, gy, forward] = guardPos(o.g, t);
        return {o, gx, gy, forward, x:gx*w/100, y:gy*h/100};
      });
      states.forEach((st, i)=>{
        const {o, gx, gy, forward} = st;
        o.d.style.left = gx+'%'; o.d.style.top = gy+'%';
        /* 面向行進方向：dx,dy 為當前移動向量 */
        const dx = o.g.x2 - o.g.x1, dy = o.g.y2 - o.g.y1;
        let ang = Math.atan2(dy*h, dx*w) * 180/Math.PI;   /* 弧度→螢幕角度 */
        if (!forward) ang += 180;                            /* 回程轉 180° */
        /* 錐形：以 guard 為圓心、朝 ang 方向 130° */
        let range = o.g.r * 1.3 * w / 100;
        /* 每個視線圈限制在守衛間距一半以內，紅色監察區不會互相重疊。 */
        states.forEach((other, j)=>{
          if (i === j) return;
          const gap = Math.hypot(st.x-other.x, st.y-other.y);
          range = Math.min(range, Math.max(0, gap/2-w*0.012));
        });
        o.cone.style.left = gx+'%'; o.cone.style.top = gy+'%';
        o.cone.style.width = (range*2)+'px'; o.cone.style.height = (range*2)+'px';
        o.cone.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;
        o.lastAng = ang;
        if (!caught && !done){
          const ddx = (px - gx)*w/100, ddy = (py - gy)*h/100;
          const dist = Math.hypot(ddx, ddy);
          const inSafeZone = Math.hypot((px-S.start.x)*w/100, (py-S.start.y)*h/100) < w*0.075;
          if (!inSafeZone && dist < range){
            const pa = Math.atan2(ddy, ddx)*180/Math.PI;
            const diff = Math.abs(((pa - ang)%360+540)%360 - 180);
            if (diff < FOV){
              caught = true;
              sBad(); vibrate(100);
              $('#st-msg').textContent = '❌ 被守衛的視線照到！返回起點保護區……';
              $('#game-screen').classList.add('shake');
              setTimeout(()=>$('#game-screen').classList.remove('shake'),500);
              setTimeout(()=>{ caught = false; px = S.start.x; py = S.start.y; setMe(); $('#st-msg').textContent = '從保護區重新出發！'; }, 850);
            }
          }
        }
      });
      if (!caught && Math.hypot((px-S.exit.x)*w/100, (py-S.exit.y)*h/100) < w*0.05){
        done = true;
        sOk(); vibrate(60);
        $('#st-msg').textContent = '✓ 到達終點！';
        cancelAnimationFrame(raf);
        setTimeout(()=>{ seg++; if (seg >= STEALTH_SEGS.length){ closeOv(); next(); } else render(); }, 750);
        return;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }
  render();
};

/* ---------- Ch3：許願牌局（30 張配對：15 對・20 次失敗機會） ---------- */
EXTRA.wishcards = function(){
  const PAIRS = [
    ['🌹','玫瑰承諾'], ['🕯','真心願望'], ['🌊','自由之海'], ['🔑','打開鳥籠'], ['⏳','歸還時間'],
    ['🌙','月下誓言'], ['🎵','無聲之歌'], ['📜','空白書頁'], ['🦋','蛻變勇氣'], ['💫','許願星塵'],
    ['🕊','和平信鴿'], ['🔮','透徹真心'], ['🌿','一願柳枝'], ['👑','放下王冠'], ['✨','明日希望']
  ];
  const MAX_MISS = 20;
  function rules(){
    openOv(`
      <div class="ov-title">🃏 許願牌局・規則</div>
      <div class="ov-sub" style="text-align:left;line-height:1.9;padding:0 4px">
        30 張牌全部背面朝上——裡面有 <b>15 對</b>相同的牌。<br><br>
        每次翻開 <b>2 張</b>：<br>
        ✦ 一樣 → 配對成功，繼續翻！<br>
        ✗ 不同 → 翻回去，扣一次機會。<br><br>
        妳有 <b>20 次失敗機會</b>。配齊 15 對即可獲勝！
      </div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold btn-mini" id="wc-rules-go">✦ 明白，發牌！</button></div>
    `);
    $('#wc-rules-go').onclick = ()=>{ sTap(); render(); };
  }
  function render(){
    /* 30 張 = 15 對，洗牌 */
    let deck = [];
    PAIRS.forEach((pr, i)=>{ deck.push({i, icon:pr[0], name:pr[1]}); deck.push({i, icon:pr[0], name:pr[1]}); });
    for (let k = deck.length - 1; k > 0; k--){ const j = Math.floor(Math.random()*(k+1)); [deck[k],deck[j]] = [deck[j],deck[k]]; }
    let open = [], matched = 0, misses = MAX_MISS, lock = true, done = false;
    openOv(`
      <div class="ov-title">🃏 許願牌局</div>
      <div class="ov-sub">配對 15 對許願牌　｜　失敗機會 <span id="wc-miss">${misses}</span>/${MAX_MISS}　｜　配對 <span id="wc-found">0</span>/15</div>
      <div class="match-grid" id="wc-grid"></div>
      <div class="ov-sub" id="wc-msg" style="min-height:20px">記住所有牌的位置——3 秒後會蓋牌！</div>
    `);
    const grid = $('#wc-grid');
    deck.forEach((card, idx)=>{
      const el = document.createElement('button');
      el.className = 'match-card open preview';
      el.innerHTML = '<span class="mc-back">✦</span><span class="mc-front">' + card.icon + '</span>';
      el.dataset.pair = card.i;
      el.onclick = ()=>{
        if (done || lock || el.classList.contains('open') || el.classList.contains('matched')) return;
        sTap();
        el.classList.add('open');
        open.push({el, card});
        if (open.length < 2) return;
        lock = true;
        const [a, b] = open;
        setTimeout(()=>{
          if (a.card.i === b.card.i){
            a.el.classList.add('matched'); b.el.classList.add('matched');
            matched++;
            sOk(); vibrate(40);
            const f = $('#wc-found'); f && (f.textContent = matched);
            $('#wc-msg').textContent = '✦ 配對成功：【' + a.card.name + '】！';
            if (matched >= 15){
              done = true;
              sGift(); vibrate([70,50,110]);
              $('#wc-msg').innerHTML = '✦ 15 對全部配齊！精靈鼓掌：「好記性！這個願望我幫妳實現——」';
              setTimeout(()=>{ closeOv(); next(); }, 2000);
            }
          } else {
            a.el.classList.remove('open'); b.el.classList.remove('open');
            misses--;
            sBad();
            const m = $('#wc-miss'); m && (m.textContent = misses);
            $('#wc-msg').textContent = misses > 0 ? '✗ 不是一對——剩下 ' + misses + ' 次機會！' : '';
            if (misses <= 0 && !done){
              done = true;
              sBad(); vibrate(150);
              $('#wc-msg').innerHTML = '機會用盡——精靈把牌收回重新洗過。';
              setTimeout(()=>{ render(); }, 1600);
            }
          }
          open = [];
          lock = false;
        }, 650);
      };
      grid.appendChild(el);
    });
    let previewLeft = 3;
    const previewTick = setInterval(()=>{
      previewLeft--;
      const msg = $('#wc-msg');
      if (previewLeft > 0){ msg && (msg.textContent = `記住所有牌的位置——${previewLeft} 秒後會蓋牌！`); return; }
      clearInterval(previewTick);
      grid.querySelectorAll('.match-card').forEach(el=>el.classList.remove('open','preview'));
      lock = false;
      msg && (msg.textContent = '開始！翻開兩張一樣的牌！');
    }, 1000);
  }
  rules();
};
