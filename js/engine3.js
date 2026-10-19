/* ===== 終盤玩法引擎：Ch4 指令戰鬥／拼名／大剪影・Ch5 真假辨認／重寫願望／真心話・終章 ===== */
const CFG = (typeof CONFIG !== 'undefined') ? CONFIG : {};

/* ---------- Ch4：指令節奏戰鬥 ---------- */
/* ===== Ch4 玩法：指令戰鬥（總限時・不重複・固定波速） ===== */
EXTRA.cmdbattle = function(){
  const CMDS = ['斬','擋','閃'], ICON = {'斬':'⚔','擋':'🛡','閃':'💨'};
  let wave = 0, fails = 0;
  function render(){
    const W = CMD_WAVES[wave];
    let seq = [];
    let last = -1;
    for (let k = 0; k < W.len; k++){
      let c;
      do { c = Math.floor(Math.random()*3); } while (c === last);
      seq.push(c); last = c;
    }
    let i = 0, misses = 0, combo = 0, maxCombo = 0, busy = false, shellUsed = false;
    const roundTime = W.time + Math.min(fails, 2) * 3;
    let tLeft = roundTime, tick = null, done = false;
    openOv(`
      <div class="ov-title">⚔ 指令節奏戰鬥</div>
      <div class="ov-sub">${W.name}（第 ${wave+1}/${CMD_WAVES.length} 波）　｜　失誤 <span id="cb-miss">0</span>/3<br>依照木蘭的指令按下對應按鍵——每波固定速度，失敗重試時會稍微放慢。</div>
      <div class="hp-label">⏱ <span id="cb-time">${tLeft}</span>s（限時內完成全部 ${W.len} 個指令）</div>
      <div class="hpbar hp-me"><div id="cb-tbar" style="width:100%"></div></div>
      <div class="cmd-stage">
        <div class="cmd-call" id="cb-call">準備……</div>
        <div class="cmd-big" id="cb-big">—</div>
      </div>
      <div class="cmd-btns" id="cb-btns"></div>
      <div class="battle-log" id="cb-log">剪影兵軍團推進！</div>
    `);
    const btns = $('#cb-btns');
    CMDS.forEach((c,ci)=>{
      const b = document.createElement('button');
      b.className = 'btn cmd-btn cmd-' + ['red','yellow','blue'][ci];
      b.innerHTML = `${ICON[c]}<br>${c}`;
      b.onclick = ()=>{ if (!busy && !done) judge(ci); };
      btns.appendChild(b);
    });
    /* 總限時 */
    tick = setInterval(()=>{
      if (done){ clearInterval(tick); return; }
      tLeft -= 0.1;
      const t = $('#cb-time'), bar = $('#cb-tbar');
      t && (t.textContent = Math.max(0, tLeft).toFixed(1));
      bar && (bar.style.width = Math.max(0, tLeft/roundTime*100)+'%');
      if (tLeft <= 0){ clearInterval(tick); waveFail('⏱ 時間用盡'); }
    }, 100);
    let timer = null;
    function show(){
      if (done) return;
      if (i >= seq.length){ finish(); return; }
      if (!$('#cb-big')){ clearTimeout(timer); clearInterval(tick); return; }
      busy = false;
      const c = seq[i];
      /* 每一波使用固定速度；重試只會稍為放慢，不會越輸越快。 */
      const stay = W.speed + Math.min(fails, 2) * 180;
      $('#cb-call').textContent = '木蘭：「' + CMD_CALL[CMDS[c]] + '」';
      const big = $('#cb-big');
      big.textContent = ICON[CMDS[c]];
      big.className = 'cmd-big';
      void big.offsetWidth;
      big.classList.add('pop');
      clearTimeout(timer);
      timer = setTimeout(()=>{ if (!busy){ busy = true; judge(-1); } }, stay);
    }
    function judge(c){
      if (done) return;
      busy = true;
      clearTimeout(timer);
      const want = seq[i]; i++;
      if (c === want){
        combo++; maxCombo = Math.max(maxCombo, combo);
        sOk();
        $('#cb-log').textContent = `✓ ${CMDS[want]}！連擊 ×${combo}（${i}/${seq.length}）`;
        if (misses >= 3){ waveFail('❌ 失誤 3 次'); return; }
        timer = setTimeout(show, 200);
      } else {
        if (hasGift('shell') && !shellUsed){
          shellUsed = true;
          sTap();
          $('#cb-log').textContent = `✗ 按錯了——但 🐚 Ariel 唱了一段歌及時補救，這次不計失誤！`;
          i--;
          busy = false;
          return;
        }
        combo = 0; misses++;
        i--; /* 錯誤後重試同一個指令 */
        sBad(); vibrate(90);
        $('#cb-miss').textContent = misses;
        $('#game-screen').classList.add('shake');
        setTimeout(()=>$('#game-screen').classList.remove('shake'),400);
        $('#cb-log').textContent = c === -1 ? `⏱ 太慢！正確是「${CMDS[want]}」` : `✗ 按了「${CMDS[c]}」，應該是「${CMDS[want]}」`;
        if (misses >= 3){ waveFail('❌ 失誤 3 次'); return; }
        tLeft = Math.max(0.5, tLeft - 2); /* 按錯扣 2 秒 */
        timer = setTimeout(show, 450);
      }
    }
    function waveFail(reason){
      if (done) return;
      done = true; clearInterval(tick); clearTimeout(timer);
      fails++;
      sBad(); vibrate(150);
      openOv(`<div class="boss-result lose">
        <div class="br-icon">💤</div>
        <div class="br-title">${reason}——該波失守！</div>
        <div class="ov-sub">從這一波重新開始。${fails >= 2 ? '（木蘭放慢了指令速度）' : ''}</div>
        <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="cb-retry">↺ 重新挑戰</button></div>
      `);
      $('#cb-retry').onclick = ()=>{ sOk(); render(); };
    }
    function finish(){
      done = true; clearInterval(tick); clearTimeout(timer);
      sGift();
      $('#cb-call').textContent = '';
      $('#cb-big').textContent = '✦';
      $('#cb-log').textContent = `✦ 第 ${wave+1} 波擊退！（最高連擊 ×${maxCombo}）`;
      setTimeout(()=>{
        wave++;
        fails = 0;
        if (wave >= CMD_WAVES.length){ closeOv(); next(); } else render();
      }, 1400);
    }
    setTimeout(show, 700);
  }
  render();
};

/* ===== Ch4：拼名保衛戰（花木蘭×2 順序・10 秒） ===== */
EXTRA.namepuzzle = function(){
  const SEQ = ['花','木','蘭','花','木','蘭'];
  const POOL = ['花','木','蘭','草','卡','卜','籣'];
  const LIMIT = 10;
  let tries = 0;
  function render(){
    let got = 0, tLeft = LIMIT, spawner = null, tick = null, done = false, ms0 = 0;
    openOv(`
      <div class="ov-title">🏮 拼名保衛戰</div>
      <div class="ov-sub">限時 ${LIMIT} 秒——按次序點齊：<b id="pz-seq"></b></div>
      <div class="puzzle-slots">${SEQ.map((c,i)=>`<span class="pz-slot" id="pz-${i}">${c}</span>`).join('')}</div>
      <div class="soldier-row" id="pz-soldiers">${'<span>👤</span>'.repeat(8)}</div>
      <div class="hp-label">⏱ <span id="pz-time">${LIMIT}</span>s</div>
      <div class="hpbar hp-me"><div id="pz-bar" style="width:100%"></div></div>
      <div class="char-rain fast" id="pz-rain"></div>
      <div class="ov-sub" id="pz-msg" style="min-height:18px">正確次序：${SEQ.join('→')}！</div>
    `);
    const seqEl = $('#pz-seq');
    if (seqEl) seqEl.textContent = SEQ.join(' → ');
    function spawn(){
      if (done) return;
      const rain = $('#pz-rain'); if (!rain) return;
      /* 需要的字出現率較高，等 10 秒內可能完成 */
      const ch = Math.random() < 0.45 ? SEQ[got] : POOL[Math.floor(Math.random()*POOL.length)];
      const el = document.createElement('button');
      el.className = 'cz';
      el.textContent = ch;
      el.style.left = (5 + Math.random()*86)+'%';
      el.style.animationDuration = (0.9 + Math.random()*0.7)+'s';
      el.onclick = ()=>{
        if (done) return;
        if (ch === SEQ[got]){
          sOk();
          el.remove();
          $('#pz-'+got).classList.add('lit');
          got++;
          $('#pz-msg').textContent = got < SEQ.length ? `✓ ${got}/${SEQ.length}——繼續！` : '';
          if (got >= SEQ.length) win();
        } else {
          sTap();
          el.classList.add('wrong');
          setTimeout(()=>el.remove(), 250);
        }
      };
      rain.appendChild(el);
      setTimeout(()=>el.remove(), 1700);
      spawner = setTimeout(spawn, 260 + Math.random()*140);
    }
    tick = setInterval(()=>{
      if (done) return;
      tLeft -= 0.1;
      const t = $('#pz-time'), b = $('#pz-bar');
      t && (t.textContent = Math.max(0, tLeft).toFixed(1));
      b && (b.style.width = Math.max(0, tLeft/LIMIT*100)+'%');
      const soldiers = $('#pz-soldiers');
      if (soldiers && Math.floor(tLeft*10) % 25 === 0){
        const alive = soldiers.querySelectorAll('span:not(.gone)');
        if (alive.length > 1) alive[0].classList.add('gone');
      }
      if (tLeft <= 0){ clearInterval(tick); fail(); }
    }, 100);
    function stopAll(){ done = true; clearTimeout(spawner); clearInterval(tick); }
    function win(){
      stopAll();
      sGift(); vibrate([60,50,90]);
      $('#pz-msg').innerHTML = '<b>「花」「木」「蘭」——完整度 100%！全營記憶恢復！</b>';
      setTimeout(()=>{ closeOv(); next(); }, 1500);
    }
    function fail(){
      if (done) return;
      stopAll();
      tries++;
      sBad(); vibrate(150);
      openOv(`<div class="boss-result lose">
        <div class="br-icon">⏱</div>
        <div class="br-title">時間到——又多一人忘記了木蘭……</div>
        <div class="ov-sub">直接重拼，士兵復原！${tries >= 2 ? '（目標字出現率提升了）' : ''}</div>
        <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="pz-retry">↺ 重新挑戰</button></div>
      `);
      $('#pz-retry').onclick = ()=>{ sOk(); render(); };
    }
    ms0 = performance.now();
    spawn();
  }
  render();
};

/* ===== Ch4：大剪影 Boss——記憶遊戲（5/7/8 字） ===== */
EXTRA.silboss = function(){
  const CMDS = ['擊','擋','閃'], ICON = {'擊':'⚔','擋':'🛡','閃':'💨'};
  const ROUNDS = [
    {len:5,  show:2000, input:5000},
    {len:7,  show:2000, input:5000},
    {len:8, show:2000, input:5000}
  ];
  let r = 0, fails = 0, mushuUsed = false;
  function render(){
    const R = ROUNDS[r];
    let seq = [];
    let last = -1;
    for (let k = 0; k < R.len; k++){
      let c;
      do { c = Math.floor(Math.random()*3); } while (c === last);
      seq.push(c); last = c;
    }
    let pos = 0, tLeft = R.input/1000, tick = null, phase = 'show';
    openOv(`
      <div class="ov-title">👤 Boss 戰：大剪影（記憶對決）</div>
      <div class="ov-sub">第 ${r+1}/${ROUNDS.length} 回合——大剪影出一套 ${R.len} 連擊，記住它，再原樣反擊！</div>
      <div class="mem-stage" id="mem-stage"><div class="mem-seq" id="mem-seq"></div></div>
      <div class="hp-label" id="mem-timer"></div>
      <div class="cmd-btns" id="mem-btns"></div>
      <div class="battle-log" id="mem-log">看清楚……</div>
      ${hasGift('dragon') && !mushuUsed ? '<div style="text-align:center;margin-top:8px"><button class="btn btn-line btn-mini" id="mem-mushu">🐉 木須亂入！（跳過這一回合）</button></div>' : ''}
    `);
    const btns = $('#mem-btns');
    CMDS.forEach((c,ci)=>{
      const bt = document.createElement('button');
      bt.className = 'btn cmd-btn cmd-' + ['red','yellow','blue'][ci];
      bt.innerHTML = `${ICON[c]}<br>${c}`;
      bt.onclick = ()=>{ if (phase === 'input') judge(ci); };
      btns.appendChild(bt);
    });
    const mushu = $('#mem-mushu');
    if (mushu) mushu.onclick = ()=>{
      mushuUsed = true;
      sGift(); vibrate(80);
      $('#mem-log').textContent = '🐉 木須以一團火焰攪亂全場——大剪影陣腳大亂，當作通過！';
      mushu.remove();
      setTimeout(()=>{ r++; if (r >= ROUNDS.length){ winAll(); } else render(); }, 1500);
    };
    /* 顯示階段：2 秒記住 */
    const seqEl = $('#mem-seq');
    seqEl.innerHTML = seq.map(c=>`<span class="mem-ch">${ICON[CMDS[c]]}</span>`).join('');
    $('#mem-timer').textContent = '👀 記住這個順序……';
    $('#mem-log').textContent = '大剪影揮出連擊！';
    setTimeout(()=>{
      if (!$('#mem-seq')) return;
      seqEl.innerHTML = '<span class="mem-ch q">？</span>'.repeat(R.len);
      phase = 'input';
      pos = 0;
      $('#mem-timer').textContent = `⌨ 輸入順序（剩餘 <span id="mem-in">${tLeft}</span>s）`;
      const ti = $('#mem-in');
      tick = setInterval(()=>{
        tLeft -= 0.1;
        if (ti) ti.textContent = Math.max(0, tLeft).toFixed(1);
        if (tLeft <= 0){ clearInterval(tick); fail('⏱ 時間用盡'); }
      }, 100);
    }, R.show + 400);
    function judge(c){
      if (phase !== 'input') return;
      if (c === seq[pos]){
        const slots = document.querySelectorAll('#mem-seq .mem-ch');
        slots[pos].textContent = ICON[CMDS[c]];
        slots[pos].classList.add('ok');
        sOk();
        pos++;
        if (pos >= seq.length){
          clearInterval(tick);
          phase = 'done';
          sGift(); vibrate([60,50,90]);
          $('#mem-log').textContent = '✦ 完美模仿！大剪影的動作亂了一拍——破綻出現！';
          setTimeout(()=>{ r++; if (r >= ROUNDS.length){ winAll(); } else { fails = 0; render(); } }, 1600);
        }
      } else {
        clearInterval(tick);
        fail('✗ 第 ' + (pos+1) + ' 步錯了——應該是「' + CMDS[seq[pos]] + '」');
      }
    }
    function fail(reason){
      if (phase === 'done') return;
      phase = 'done';
      fails++;
      sBad(); vibrate(150);
      openOv(`<div class="boss-result lose">
        <div class="br-icon">💢</div>
        <div class="br-title">大剪影的反擊！</div>
        <div class="ov-sub">${reason}——重新挑戰本回合！</div>
        <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="mem-retry">↺ 重新挑戰</button></div>
      `);
      $('#mem-retry').onclick = ()=>{ sOk(); render(); };
    }
  }
  /* ⑥ 準備視窗 */
  openOv(`<div class="boss-result prep">
    <div class="br-icon">👤</div>
    <div class="br-title">BOSS 戰：大剪影</div>
    <div class="ov-sub">十米高的白色巨人，胸口掛着破鑼。<br>它會出一套套「擊・擋・閃」連擊——記住順序，原樣反擊！</div>
    <div class="ov-sub">三回合：5 字 → 7 字 → 8 字｜顯示 2 秒・輸入 5 秒</div>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="mem-start">⚔️ 準備完成，開始！</button></div>
  </div>`);
  $('#mem-start').onclick = ()=>{ sOk(); vibrate(60); render(); };
  function winAll(){
    sGift(); vibrate([80,60,120]);
    openOv(`<div class="boss-result win">
      <div class="br-icon">🏆</div>
      <div class="br-title">戰勝大剪影！</div>
      <div class="ov-sub">「——你們的名字是『曾經保家衛國的將士』！你們不是殘影，你們是英雄的餘暉！」<br><br>巨人動作停止，緩緩跪下，碎成漫天雪花般的紙屑：「……有人……叫我們的名字……」</div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="br-go">✦ 繼續旅程</button></div>
    </div>`);
    $('#br-go').onclick = ()=>{ sOk(); closeOv(); next(); };
  }
};

EXTRA.rewrite = function(){
  let seg = 0;
  function restartCh5(){
    openOv(`<div class="boss-result lose">
      <div class="br-icon">💀</div>
      <div class="br-title">柳枝枯萎了……</div>
      <div class="ov-sub">詛咒反噬——第五章從頭再來。</div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="rw-restart">↺ 重新開始第五章</button></div>
    </div>`);
    $('#rw-restart').onclick = ()=>{ sOk(); idx = q.findIndex(n=>n.num==='CHAPTER 5'); next(); };
  }
  function render(){
    const LIMIT = 50;
    const S = REWRITE_SEGS[seg];
    const noise = S.noise;
    let tLeft = LIMIT, pos = 0, tick = null, done = false;
    const blocks = [...S.answer.map((w,i)=>({w, ok:true, i})), ...noise.map(w=>({w, ok:false}))];
    for (let i = blocks.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [blocks[i],blocks[j]] = [blocks[j],blocks[i]]; }
    openOv(`
      <div class="ov-title">🌿 重寫願望（第 ${seg+1}/${REWRITE_SEGS.length} 段）</div>
      <div class="ov-sub">詛咒原文：<s>${S.curse}</s></div>
      <div class="rw-strip" id="rw-strip"></div>
      <div class="rw-pool" id="rw-pool"></div>
      <div class="hp-label">⏱ <span id="rw-time">${LIMIT}</span>s（拼錯 -5 秒）</div>
      <div class="ov-sub" id="rw-msg" style="min-height:18px"></div>
    `);
    const pool = $('#rw-pool'), strip = $('#rw-strip');
    blocks.forEach(bl=>{
      const b = document.createElement('button');
      b.className = 'rw-block';
      b.textContent = bl.w;
      b.dataset.used = '';
      b.onclick = ()=>{
        if (done || b.dataset.used) return;
        if (bl.ok && bl.i === pos){
          b.dataset.used = '1'; b.classList.add('used');
          sOk();
          const chip = document.createElement('span');
          chip.className = 'rw-chip';
          chip.textContent = bl.w;
          strip.appendChild(chip);
          pos++;
          if (pos >= S.answer.length) win();
        } else {
          sBad();
          tLeft = Math.max(1, tLeft - 5);
          $('#game-screen').classList.add('shake');
          setTimeout(()=>$('#game-screen').classList.remove('shake'),400);
          $('#rw-msg').textContent = '✗ 這塊的次序不對——(-5s)';
          b.classList.add('nope');
          setTimeout(()=>b.classList.remove('nope'), 350);
        }
      };
      pool.appendChild(b);
    });
    tick = setInterval(()=>{
      if (done){ clearInterval(tick); return; }
      tLeft--;
      const t = $('#rw-time'); t && (t.textContent = Math.max(0, tLeft));
      if (tLeft <= 0){
        clearInterval(tick);
        fail();
      }
    }, 1000);
    function win(){
      done = true; clearInterval(tick);
      sGift();
      $('#rw-msg').innerHTML = '✦ ' + S.ok;
      setTimeout(()=>{
        seg++;
        if (seg >= REWRITE_SEGS.length){ closeOv(); next(); } else render();
      }, 1800);
    }
    function fail(){
      if (done) return;
      done = true;
      sBad(); vibrate(200);
      restartCh5();
    }
  }
  render();
};

/* ---------- Ch5：真心話對決 ---------- */
EXTRA.truthbattle = function(){
  const MAXHP = 100;
  let r = 0, hp = MAXHP;
  function restartCh5(){
    openOv(`<div class="boss-result lose">
      <div class="br-icon">💔</div>
      <div class="br-title">妳的決心崩潰了……</div>
      <div class="ov-sub">幻影的笑聲包圍妳——第五章從頭再來。</div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold" id="tb-restart">↺ 重新開始第五章</button></div>
    </div>`);
    $('#tb-restart').onclick = ()=>{ sOk(); idx = q.findIndex(n=>n.num==='CHAPTER 5'); next(); };
  }
  function render(){
    const R = TRUTH_ROUNDS[r];
    openOv(`
      <div class="ov-title">💬 真心話對決</div>
      <div class="hpbar hp-me"><div id="tb-bar" style="width:${hp/MAXHP}%"></div></div>
      <div class="hp-label">妳的決心 HP <span id="tb-hp">${hp}</span>/${MAXHP}</div>
      <div class="battle-log">${R.phantom}</div>
      <div class="ov-sub">從三個回應中，選出「真心話」——沒有提示，選錯扣 25 HP！</div>
      <div class="choice-col" id="tb-opts"></div>
    `);
    const box = $('#tb-opts');
    R.opts.forEach((o,i)=>{
      const b = document.createElement('button');
      b.className = 'choice-btn';
      b.textContent = o;
      b.onclick = ()=>{
        if (i === R.ans){
          sOk();
          box.innerHTML = '';
          const lines = [
            '幻影怔住。白霧的形體出現裂痕——那句話刺中了它。',
            '「……妳憑什麼這樣說我。」幻影的聲音第一次動搖了。',
            '幻影垂下眼睛。借來的名字逐筆褪去，終於不再假裝成別人。'
          ];
          $('#overlay-box').querySelector('.battle-log').insertAdjacentHTML('afterend', `<div class="battle-log">✦ ${lines[r]}</div>`);
          setTimeout(()=>{
            r++;
            if (r >= TRUTH_ROUNDS.length) finalScene();
            else render();
          }, 1900);
        } else {
          hp -= 25;
          sBad(); vibrate(110);
          $('#game-screen').classList.add('shake');
          setTimeout(()=>$('#game-screen').classList.remove('shake'),400);
          const bar = $('#tb-bar'), hn = $('#tb-hp');
          bar && (bar.style.width = Math.max(0,hp/MAXHP)+'%');
          hn && (hn.textContent = Math.max(0,hp));
          if (hp <= 0){
            restartCh5();
          }
        }
      };
      box.appendChild(b);
    });
  }
  function finalScene(){
    openOv(`
      <div class="ov-title">💬 最終回應</div>
      <div class="battle-log">幻影：（聲音突然變細，像個小孩）「……如果我放手，就真的、真的誰都不記得我了。」</div>
      <div style="margin:12px 0;padding:12px;border-left:3px solid #f5d67b;background:rgba(245,214,123,.08);border-radius:8px;line-height:1.7">
        Bear：（走上前，聲音抖但清晰）<br><br><b>「對不起。我喜歡妳。但我更希望妳自由。——即使那個自由裏，沒有我。」</b>
      </div>
      <div class="ov-sub">幻影安靜下來，化作白霧散去。霧裏有一瞬間，像一個終於鬆了口氣的女孩。</div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold btn-mini" id="tb-go">✦ 白霧散去</button></div>
    `);
    sGift();
    $('#tb-go').onclick = ()=>{ sTap(); closeOv(); next(); };
  }
  render();
};

/* ===== Ch5：古董店鑑證（3 輪・憑描述認出真柳枝・排除法永不卡關） ===== */
EXTRA.antique = function(){
  let r = 0;
  function render(){
    const R = ANTIQUE_ROUNDS[r];
    openOv(`
      <div class="ov-title">📦 古董店鑑證</div>
      <div class="ov-sub"><b>${R.q}</b><br>${R.sub}</div>
      <div class="antiq-grid" id="aq-grid"></div>
      <div class="ov-sub" id="aq-msg" style="min-height:20px">憑 Bear 的記憶——選出真正的「一願柳枝」！</div>
    `);
    const grid = $('#aq-grid');
    let solved = false;
    R.items.forEach((it,i)=>{
      const c = document.createElement('button');
      c.className = 'antiq-card';
      c.innerHTML = `<span class="aq-icon">${it.icon}</span><span class="aq-name">${it.name}</span><span class="aq-detail">${it.detail}</span>`;
      c.onclick = ()=>{
        if (solved || c.classList.contains('excluded')) return;
        if (it.ok){
          solved = true;
          c.classList.add('done');
          sOk(); vibrate(60);
          $('#aq-msg').innerHTML = '✦ Bear：（聲音發抖）「就是這件……就是這件！」';
          setTimeout(()=>{ r++; if (r >= ANTIQUE_ROUNDS.length){ closeOv(); next(); } else render(); }, 1900);
        } else {
          c.classList.add('excluded');
          sTap();
          $('#aq-msg').innerHTML = '🐻 Bear：「不是這件……' + it.why + '」';
        }
      };
      grid.appendChild(c);
    });
  }
  render();
};

/* ---------- 終章：圓桌對質（排除法・永不卡關） ---------- */
EXTRA.evidence = function(){
  let layer = 0, wrongTotal = 0, score = 100;
  function render(){
    const L = WALL_LAYERS[layer];
    const lamps = WALL_LAYERS.map((_,i)=>`<span class="lamp ${i < layer ? 'lit' : ''}">💡</span>`).join('');
    if (L.witch){
      openOv(`
        <div class="ov-title">⚖️ 圓桌對質・最終投票</div>
        <div class="lamp-row">${lamps}<span class="lamp lit">🕯</span></div>
        <div class="ov-sub">${L.q}</div>
        <div class="choice-col" id="ev-opts"></div>
        <div class="ov-sub" style="min-height:18px">推理評分：<span id="ev-score">${score}</span></div>
        <div class="ov-sub" id="ev-msg" style="min-height:20px"></div>
      `);
      const b = document.createElement('button');
      b.className = 'choice-btn';
      b.textContent = '空白魔女';
      b.onclick = ()=>{
        sOk(); vibrate(60);
        $('#ev-msg').innerHTML = '✦ 全員一致指向「空白魔女」。<br><br>Belle：「她選擇了偷竊，但這個答案仍然不完整。讓事情發展到今天這一步的選擇，不只一個。」';
        b.remove();
        setTimeout(()=>{
          layer++;
          state.score = score; save(); closeOv(); next();
        }, 2600);
      };
      $('#ev-opts').appendChild(b);
      return;
    }
    let found = 0, wrongHere = 0;
    openOv(`
      <div class="ov-title">⚖️ 圓桌對質</div>
      <div class="lamp-row">${lamps}</div>
      <div class="ov-sub">${L.q}<br><span id="ev-count">找出相關的證物（${L.need} 件）——按錯也不用害怕，排除即可！</span></div>
      <div class="ev-grid" id="ev-grid"></div>
      <div class="ov-sub" style="min-height:18px">推理評分：<span id="ev-score">${score}</span></div>
      <div class="ov-sub" id="ev-msg" style="min-height:20px"></div>
    `);
    const grid = $('#ev-grid');
    EVIDENCE.forEach((e,i)=>{
      const isPick = L.picks.includes(i);
      const c = document.createElement('button');
      c.className = 'ev-card';
      c.innerHTML = `<span class="ev-tag">${e.tag}</span>${e.txt}`;
      c.onclick = ()=>{
        if (c.classList.contains('excluded') || c.classList.contains('done')) return;
        if (isPick){
          c.classList.add('done');
          sOk(); vibrate(50);
          found++;
          if (found < L.picks.length){
            $('#ev-count').textContent = '✓ 找到第 ' + found + ' 件！還有 ' + (L.picks.length - found) + ' 件……';
          } else {
            score = Math.min(100, score);
            $('#ev-score').textContent = score;
            $('#ev-msg').innerHTML = '✦ Belle：「' + L.reveal + '」';
            grid.querySelectorAll('.ev-card:not(.done)').forEach(el=>el.classList.add('excluded'));
            setTimeout(()=>{ layer++; if (layer >= WALL_LAYERS.length){ state.score = score; save(); closeOv(); next(); } else render(); }, 2800);
          }
        } else {
          c.classList.add('excluded');
          wrongTotal++; wrongHere++;
          score = Math.max(60, score - 5);
          sTap();
          $('#ev-score').textContent = score;
          $('#ev-msg').textContent = wrongHere >= 2
            ? '💡 卡先生咳了一聲——留意正在發光的證物！'
            : '🔍 卡先生：「這件證物與這一層無關——排除。」（-5 評分）';
          if (wrongHere >= 2){
            L.picks.forEach(pi=>{ const el = grid.children[pi]; if (!el.classList.contains('done')) el.classList.add('glow'); });
          }
        }
      };
      grid.appendChild(c);
    });
  }
  render();
};
/* ---------- 終章：寫第一句 ---------- */
EXTRA.writefirst = function(){
  openOv(`
    <div class="ov-title">🖋 為她寫下第一句</div>
    <div class="ov-sub">空白的書頁面前——落筆吧。</div>
    <div class="choice-col" id="wf-opts"></div>
    <div class="wf-custom">
      <input type="text" id="wf-input" maxlength="60" placeholder="或者，寫下妳自己的第一句……">
      <button class="btn btn-gold btn-mini" id="wf-go">落筆</button>
    </div>
  `);
  const box = $('#wf-opts');
  WRITE_OPTIONS.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.textContent = o;
    b.onclick = ()=>pick(o);
    box.appendChild(b);
  });
  function pick(text){
    state.firstLine = text;
    save();
    sGift();
    openOv(`
      <div class="ov-title">🖋 第一句</div>
      <div class="wf-paper"><span>${text}</span></div>
      <div class="ov-sub">白紙上，墨跡亮起。</div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold btn-mini" id="wf-next">✦ 繼續</button></div>
    `);
    $('#wf-next').onclick = ()=>{ sTap(); closeOv(); next(); };
  }
  $('#wf-go').onclick = ()=>{
    const v = ($('#wf-input').value || '').trim();
    if (!v){ sBad(); $('#wf-input').focus(); return; }
    pick(v);
  };
};

/* ---------- 終章：女孩寫下自己的名字 ---------- */
EXTRA.naming = function(){
  openOv(`
    <div class="ov-title">🏷 她寫下自己的名字</div>
    <div class="ov-sub">把筆交給她。這一次，由她決定下一個詞。</div>
    <div class="choice-col" id="nm-opts"></div>
    <div class="wf-custom">
      <input type="text" id="nm-input" maxlength="12" placeholder="或者，寫下她為自己選的名字……">
      <button class="btn btn-gold btn-mini" id="nm-go">寫下</button>
    </div>
  `);
  const box = $('#nm-opts');
  NAME_OPTIONS.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.textContent = o;
    b.onclick = ()=>pick(o);
    box.appendChild(b);
  });
  function pick(name){
    state.heroName = name;
    save();
    sGift();
    openOv(`
      <div class="ov-title">🏷 她選擇的名字</div>
      <div class="wf-paper big-word"><span>${name}</span></div>
      <div class="ov-sub">她親手寫下：「我選擇叫 ${name}。」<br>「原來有名字，肩膀會這麼重，又這麼暖。」<br><span style="opacity:.7">木蘭：（微笑）「這句話的版權費記在帳上。」</span></div>
      <div style="text-align:center;margin-top:14px"><button class="btn btn-gold btn-mini" id="nm-next">✦ 繼續</button></div>
    `);
    $('#nm-next').onclick = ()=>{ sTap(); closeOv(); next(); };
  }
  $('#nm-go').onclick = ()=>{
    const v = ($('#nm-input').value || '').trim();
    if (!v){ sBad(); $('#nm-input').focus(); return; }
    pick(v);
  };
};

/* ---------- 終章：分享卡前完整故事線 ---------- */
EXTRA.storylinecard = function(node){
  const SC = (typeof STORY_CONFIG !== 'undefined') ? STORY_CONFIG : {};
  openOv(`
    <div class="storyline-card">
      <div class="storyline-kicker">${SC.storylineKicker || 'THE WHOLE STORY'}</div>
      <div class="ov-title">${SC.storylineTitle || '✦ 我們走過的完整故事'}</div>
      <div class="ov-sub">${SC.storylineSub || '在製作生日分享卡之前，重看這段故事真正如何開始，又如何重新開始。'}</div>
      <div class="storyline-list" id="storyline-list"></div>
      <div class="storyline-ending" id="storyline-ending"></div>
      <div style="text-align:center;margin-top:16px"><button class="btn btn-gold btn-mini" id="storyline-next">${SC.storylineButton || '🎂 製作生日分享卡'}</button></div>
    </div>
  `);
  const list = $('#storyline-list');
  (node.items || []).forEach((item, index)=>{
    const row = document.createElement('div');
    row.className = 'storyline-item';
    const mark = document.createElement('div');
    mark.className = 'storyline-mark';
    mark.textContent = item.icon;
    const body = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'storyline-title';
    title.textContent = `${index + 1}. ${item.title}`;
    const text = document.createElement('div');
    text.className = 'storyline-text';
    text.textContent = item.text;
    body.append(title, text);
    row.append(mark, body);
    list.appendChild(row);
  });
  const ending = $('#storyline-ending');
  const chosenName = state.heroName || '空白女孩';
  const firstLine = state.firstLine || '她終於擁有一個可以自己繼續的開始。';
  ending.textContent = `${chosenName} 的第一句：「${firstLine}」`;
  $('#storyline-next').onclick = ()=>{ sGift(); closeOv(); next(); };
};

/* ---------- 終章：結局分享卡 ---------- */
let shareBackgroundImage = null, shareBackgroundUrl = null;
let shareBackgroundZoom = 1, shareBackgroundOffsetX = 0, shareBackgroundOffsetY = 0;
let heicLoader = null;
function loadHeicConverter(){
  if (window.heic2any) return Promise.resolve(window.heic2any);
  if (heicLoader) return heicLoader;
  heicLoader = new Promise((resolve, reject)=>{
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    script.onload = ()=>window.heic2any ? resolve(window.heic2any) : reject(new Error('HEIC 轉換器未能啟動'));
    script.onerror = ()=>reject(new Error('未能載入 HEIC 轉換器'));
    document.head.appendChild(script);
  });
  return heicLoader;
}
function loadShareBackground(blob){
  return new Promise((resolve, reject)=>{
    if (shareBackgroundUrl) URL.revokeObjectURL(shareBackgroundUrl);
    shareBackgroundUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = ()=>{ shareBackgroundImage = image; resolve(image); };
    image.onerror = ()=>reject(new Error('無法讀取這張圖片'));
    image.src = shareBackgroundUrl;
  });
}
EXTRA.sharecard = function(){
  setMusic('birthday');
  if (state.shareMessage == null) state.shareMessage = state.firstLine || CFG.defaultMessage;
  if (state.shareName == null) state.shareName = state.heroName || CFG.defaultHeroName;
  openOv(`
    <div class="ov-title">${CFG.cardTitle}</div>
    <div class="ov-sub">編輯故事內容與名字，預覽會即時更新；標題、生日祝福及日期固定保留。</div>
    <div class="share-shortcut-note">首頁點擊 ${CFG.shortcutTaps} 次「${CFG.shortcutLabel}」可直接進入生日卡</div>
    <div class="share-wrap"><canvas id="sc-canvas" width="600" height="960"></canvas></div>
    <div class="share-bg-tools">
      <label class="btn btn-line btn-mini" for="sc-bg-file">🖼 選擇背景圖片</label>
      <input type="file" id="sc-bg-file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif">
      <label class="zoom-label">縮放 <input type="range" id="sc-bg-zoom" min="1" max="3" step="0.05" value="1"></label>
      <button class="btn btn-line btn-mini" id="sc-bg-reset">恢復預設背景</button>
      <div id="sc-bg-status">支援 JPEG、PNG、WebP、HEIC 及 HEIF；自訂背景可在卡面拖動位置。</div>
    </div>
    <div class="share-edit">
      <label>故事／祝福內容<textarea id="sc-message" maxlength="1200" placeholder="在這裡寫下想分享的內容……">${escapeAttr(state.shareMessage || '')}</textarea></label>
      <label>女孩名字<input type="text" id="sc-name" maxlength="24" value="${escapeAttr(state.shareName || '')}"></label>
    </div>
    <div style="text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-gold btn-mini" id="sc-save">📸 儲存分享卡</button>
      <button class="btn btn-mini" id="sc-replay">↺ 再玩一次</button>
    </div>
  `);
  sGift();
  drawCard($('#sc-canvas'));
  const canvas = $('#sc-canvas'), status = $('#sc-bg-status'), zoom = $('#sc-bg-zoom');
  $('#sc-bg-file').onchange = async event=>{
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 20*1024*1024){ status.textContent = '圖片不可超過 20 MB。'; sBad(); return; }
    status.textContent = '正在處理圖片……';
    try{
      const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      let blob = file;
      if (isHeic){
        const convert = await loadHeicConverter();
        const result = await convert({blob:file, toType:'image/jpeg', quality:.9});
        blob = Array.isArray(result) ? result[0] : result;
      }
      await loadShareBackground(blob);
      shareBackgroundZoom = 1; shareBackgroundOffsetX = 0; shareBackgroundOffsetY = 0;
      zoom.value = '1'; canvas.classList.add('custom-bg');
      status.textContent = isHeic ? 'HEIC／HEIF 已轉換，可拖動圖片及調整縮放。' : '背景已載入，可拖動圖片及調整縮放。';
      drawCard(canvas); sOk();
    }catch(error){
      status.textContent = error.message || '圖片處理失敗，請嘗試其他圖片。';
      sBad();
    }
  };
  zoom.oninput = event=>{
    shareBackgroundZoom = Number(event.target.value) || 1;
    if (shareBackgroundImage) drawCard(canvas);
  };
  $('#sc-bg-reset').onclick = ()=>{
    if (shareBackgroundUrl) URL.revokeObjectURL(shareBackgroundUrl);
    shareBackgroundUrl = null; shareBackgroundImage = null;
    shareBackgroundZoom = 1; shareBackgroundOffsetX = 0; shareBackgroundOffsetY = 0;
    zoom.value = '1'; $('#sc-bg-file').value = ''; canvas.classList.remove('custom-bg','dragging');
    status.textContent = '已恢復預設背景。'; drawCard(canvas); sOk();
  };
  let dragPointer = null, dragX = 0, dragY = 0;
  canvas.onpointerdown = event=>{
    if (!shareBackgroundImage) return;
    dragPointer = event.pointerId; dragX = event.clientX; dragY = event.clientY;
    canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  };
  canvas.onpointermove = event=>{
    if (dragPointer !== event.pointerId || !shareBackgroundImage) return;
    const rect = canvas.getBoundingClientRect();
    shareBackgroundOffsetX += (event.clientX-dragX)*canvas.width/rect.width;
    shareBackgroundOffsetY += (event.clientY-dragY)*canvas.height/rect.height;
    dragX = event.clientX; dragY = event.clientY; drawCard(canvas);
  };
  const stopDrag = event=>{
    if (dragPointer !== event.pointerId) return;
    dragPointer = null; canvas.classList.remove('dragging');
  };
  canvas.onpointerup = stopDrag;
  canvas.onpointercancel = stopDrag;
  $('#sc-message').oninput = event=>{
    state.shareMessage = event.target.value;
    save();
    drawCard($('#sc-canvas'));
  };
  $('#sc-name').oninput = event=>{
    state.shareName = event.target.value;
    save();
    drawCard($('#sc-canvas'));
  };
  $('#sc-save').onclick = ()=>{
    const a = document.createElement('a');
    a.download = CFG.fileName || 'make-a-wish-card.png';
    a.href = $('#sc-canvas').toDataURL('image/png');
    a.click();
    sOk();
  };
  $('#sc-replay').onclick = ()=>{ if (!shareShortcutMode) clearSave(); location.reload(); };
};
function escapeAttr(text){
  return String(text).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function wrapText(ctx, text, maxW){
  const lines = [];
  String(text).split('\n').forEach(paragraph=>{
    if (!paragraph){ lines.push(''); return; }
    let line = '';
    for (const ch of paragraph){
      if (line && ctx.measureText(line + ch).width > maxW){ lines.push(line); line = ch; }
      else line += ch;
    }
    lines.push(line);
  });
  return lines;
}
let shareDrawVersion = 0;
function drawCard(cv){
  const version = ++shareDrawVersion;
  const W = 600;
  const text = state.shareMessage || '';
  const name = state.shareName || '';
  const fontSize = text.length > 600 ? 20 : text.length > 300 ? 23 : 27;
  let ctx = cv.getContext('2d');
  ctx.font = `${fontSize}px "Noto Sans TC", sans-serif`;
  const lines = wrapText(ctx, text, W-120);
  const lineHeight = Math.round(fontSize * 1.6);
  const H = Math.max(960, Math.min(2600, lines.length * lineHeight + 650));
  cv.width = W;
  cv.height = H;
  ctx = cv.getContext('2d');
  const bg = shareBackgroundImage || new Image();
  if (shareBackgroundImage) paint(bg);
  else {
    paint(null);
    bg.onload = ()=>paint(bg);
    bg.onerror = ()=>paint(null);
    bg.src = CFG.defaultBg || 'assets/belle-rose.webp';
  }
  function paint(image){
    if (version !== shareDrawVersion) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#120d29'; ctx.fillRect(0, 0, W, H);
    if (image && image.naturalWidth){
      const scale = Math.max(W/image.naturalWidth, H/image.naturalHeight);
      const drawW = image.naturalWidth*scale*shareBackgroundZoom, drawH = image.naturalHeight*scale*shareBackgroundZoom;
      const maxX = Math.max(0, (drawW-W)/2), maxY = Math.max(0, (drawH-H)/2);
      shareBackgroundOffsetX = Math.max(-maxX, Math.min(maxX, shareBackgroundOffsetX));
      shareBackgroundOffsetY = Math.max(-maxY, Math.min(maxY, shareBackgroundOffsetY));
      ctx.drawImage(image, (W-drawW)/2+shareBackgroundOffsetX, (H-drawH)/2+shareBackgroundOffsetY, drawW, drawH);
    }
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(10,6,30,.62)'); g.addColorStop(.5,'rgba(10,6,30,.72)'); g.addColorStop(1,'rgba(10,6,30,.86)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = '#f5d67b'; ctx.lineWidth = 3;
    ctx.strokeRect(24,24,W-48,H-48);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '600 22px "Noto Serif TC", serif';
    ctx.fillText(CFG.cardBrand || '童 話 救 援 計 劃', W/2, 105);
    ctx.fillStyle = '#ffd66e';
    ctx.font = 'italic 900 38px Georgia, serif';
    ctx.fillText(CFG.subBrand || '- Make a Wish -', W/2, 165);
    ctx.strokeStyle = 'rgba(245,214,123,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W/2-90, 198); ctx.lineTo(W/2+90, 198); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `${fontSize}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = lines.length <= 3 ? 'center' : 'left';
    const x = lines.length <= 3 ? W/2 : 60;
    const bodyHeight = lines.length * lineHeight;
    const bodyTop = 235, bodyBottom = H-380;
    let y = bodyTop + Math.max(0, (bodyBottom-bodyTop-bodyHeight)/2) + fontSize;
    lines.forEach(line=>{ ctx.fillText(line, x, y); y += lineHeight; });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd66e';
    ctx.font = '24px "Noto Sans TC", sans-serif';
    ctx.fillText(CFG.nameLabelPrefix || '空白女孩有了名字：', W/2, H-300);
    ctx.font = `900 ${name.length > 8 ? 40 : 56}px "Noto Serif TC", serif`;
    ctx.fillText(name, W/2, H-235);
    ctx.fillStyle = '#fff';
    ctx.font = '700 24px "Noto Sans TC", sans-serif';
    ctx.fillText(CFG.cardBlessing || '— 生日快樂 —', W/2, H-140);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(CFG.fixedDate || '', W/2, H-88);
  }
}
