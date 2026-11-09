/* ==========================================================================
   LARI PINTAR — balapan kuis 2 pemain, satu layar, LARI KE DEPAN (tanpa kamera)
   Karakter & desain orisinal.
   - Layar terbelah: kiri Pemain 1, kanan Pemain 2. Pandangan dari belakang
     karakter, jalan 3 jalur menjauh ke cakrawala.
   - Lari OTOMATIS. ◀ ▶ pindah jalur, ⬆ lompat, ⬇ bungkuk, item = pakai.
   - Tiap soal: 3 jawaban (1 benar) di jalur ACAK: KIRI / TENGAH / KANAN.
     Masuk ke jalur jawaban yang benar sebelum melewati gerbang.
   - Rintangan: batu (pindah jalur/lompat), kayu melintang (lompat),
     palang daun (bungkuk).
   - Item: 🍌 pisang (dilempar ke jalur lawan → terpeleset), ⚡ turbo, 🛡️ perisai.
   ========================================================================== */
(function () {
  const QC = window.QuizCore; const FX = QC.fx;
  const $ = (id) => document.getElementById(id);
  const esc = QC.esc;

  /* ------------------------------ Konstanta dunia 3D semu ------------------------------ */
  const ZP = 2.6;          // jarak karakter dari kamera
  const CAM_H = 2.2;       // tinggi kamera
  const LANE_W = 1.25;     // lebar jalur
  const VIEW = 70;         // jarak pandang
  const JV = 7.6; const GRV = 22;
  const CTRL_H = 200;
  const LANES = ['L', 'C', 'R'];
  const LANE_NAME = { L: '◀ KIRI', C: '▲ TENGAH', R: 'KANAN ▶' };
  const LANE_COL = { L: '#8e44ad', C: '#2a9d8f', R: '#ff7f11' };
  const ITEMS = { banana: '🍌', turbo: '⚡', shield: '🛡️' };
  const SLIP_T = 1.9;      // lama terpeleset & jatuh (detik)
  const DIZZY_T = 3;       // lama pusing/stun jika jawaban salah (detik)
  const easeOut = (t) => 1 - (1 - t) * (1 - t);

  const cv = $('cv'); const ctx = cv.getContext('2d');
  let W = 0; let H = 0; let DPR = 1;
  function resize() { DPR = Math.min(1.25, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
  resize(); addEventListener('resize', resize);

  /* ------------------------------ Status ------------------------------ */
  let S = {}; let phase = 'idle'; let timers = []; let P = []; let level = null; let finishOrder = []; let gameT = 0;
  QC.init({ gameId: 'lari-pintar', title: 'Lari Pintar', avatars: ['🧒', '👧', '🦊', '🐼', '🐯', '🐸', '🐧', '🐵'], colors: ['#e63946', '#3a86ff', '#2a9d8f', '#ff9f1c'] });
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ------------------------------ Musik ------------------------------ */
  const Music = (() => {
    let ac = null; let master = null; let nb = null; let timer = null; let next = 0; let step = 0; const bpm = 126;
    let on = true; try { on = localStorage.getItem('lokamain_lari_music') !== 'off'; } catch (e) { /* abaikan */ }
    const prog = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]];
    const mel = [2, 1, 0, 1, 2, 2, 2, -1, 1, 1, 1, -1, 2, 2, 2, -1];
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const tone = (f, t, d, type, v) => { const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02); };
    const hat = (t, v) => { const s = ac.createBufferSource(); s.buffer = nb; const g = ac.createGain(); g.gain.value = v; s.connect(g).connect(master); s.start(t); };
    function tick() { const spb = 60 / bpm / 4; while (next < ac.currentTime + 0.18) { const bar = Math.floor(step / 16) % 4; const s = step % 16; const ch = prog[bar]; if (s % 2 === 0 && mel[s] >= 0) tone(hz(ch[mel[s]] + 12), next, spb * 1.7, 'square', 0.04); if (s % 4 === 0) tone(hz(ch[0] - 12), next, spb * 2.5, 'triangle', 0.4); if (s % 4 === 2) tone(hz(ch[2] - 12), next, spb * 1.5, 'triangle', 0.25); if (s % 2 === 1) hat(next, 0.07); next += spb; step++; } }
    return {
      get on() { return on; },
      start() { if (!on || QC.muted) return; try { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.06; master.connect(ac.destination); const len = Math.floor(ac.sampleRate * 0.03); nb = ac.createBuffer(1, len, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); } if (ac.state === 'suspended') ac.resume(); } catch (e) { return; } if (timer) return; next = ac.currentTime + 0.05; timer = setInterval(tick, 60); },
      stop() { clearInterval(timer); timer = null; },
      toggle() { on = !on; try { localStorage.setItem('lokamain_lari_music', on ? 'on' : 'off'); } catch (e) { /* abaikan */ } if (on && phase === 'race') this.start(); else this.stop(); return on; }
    };
  })();
  function syncButtons() { $('btnSound').classList.toggle('off', QC.muted); $('btnMusic').classList.toggle('off', !Music.on); }
  $('btnSound').onclick = () => { QC.muted = !QC.muted; try { localStorage.setItem('lokamain_muted', JSON.stringify(QC.muted)); } catch (e) { /* abaikan */ } if (QC.muted) Music.stop(); else if (phase === 'race') Music.start(); syncButtons(); };
  $('btnMusic').onclick = () => { Music.toggle(); syncButtons(); };
  syncButtons();

  /* ------------------------------ Masukan ------------------------------ */
  const KEYMAP = {
    w: [0, 'jump'], s: [0, 'duck'], a: [0, 'left'], d: [0, 'right'], e: [0, 'item'], q: [0, 'item'],
    arrowup: [1, 'jump'], arrowdown: [1, 'duck'], arrowleft: [1, 'left'], arrowright: [1, 'right'], enter: [1, 'item'], '/': [1, 'item'], shift: [1, 'item']
  };
  function press(pi, a, down) {
    const p = P[pi]; if (!p || p.finished) return;
    if (a === 'duck') { p.in.duck = down; return; }
    if (!down) return;
    if (p.phase === 'read' && a === 'jump') { endReading(p); return; }
    const free = p.slipT <= 0 && p.dizzyT <= 0;
    if (a === 'jump') p.in.jump = true;
    else if (a === 'item') useItem(p);
    else if (a === 'left') { if (p.lane > 0 && free) { p.lane--; QC.sfx.click(); } }
    else if (a === 'right') { if (p.lane < 2 && free) { p.lane++; QC.sfx.click(); } }
  }
  QC.onKey = (e) => {
    const k = e.key.toLowerCase();
    if (e.code === 'Space' && !$('msg').hidden && !$('btnGo').hidden) { e.preventDefault(); onGo(); return; }
    const m = KEYMAP[k]; if (!m || phase !== 'race') return;
    e.preventDefault(); if (e.repeat) return; press(m[0], m[1], true);
  };
  addEventListener('keyup', (e) => { const m = KEYMAP[e.key.toLowerCase()]; if (m && m[1] === 'duck') press(m[0], 'duck', false); });
  document.querySelectorAll('.b[data-a]').forEach((b) => {
    const pi = +b.dataset.p; const a = b.dataset.a;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* abaikan */ } b.classList.add('held'); if (phase === 'race') press(pi, a, true); });
    const up = () => { b.classList.remove('held'); if (phase === 'race' && a === 'duck') press(pi, 'duck', false); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  /* ------------------------------ Setup ------------------------------ */
  async function openSetup() {
    clearTimers(); phase = 'idle'; Music.stop(); hideCard(); [0, 1].forEach((i) => ($('q' + i).hidden = true));
    const r = await QC.setup({
      logo: document.querySelector('.logo').outerHTML, subtitle: 'Balapan kuis 2 pemain — jawab cepat & benar, lari paling dulu sampai finis!',
      min: 2, max: 2, defaultCount: 2, defaultNames: ['Pemain Merah', 'Pemain Biru'],
      settings: [
        { key: 'count', label: 'Jumlah soal', value: 6, options: [[4, '4 soal'], [6, '6 soal'], [8, '8 soal'], [10, '10 soal']] },
        { key: 'spd', label: 'Kecepatan lari', value: 10, options: [[8, 'Santai'], [10, 'Sedang'], [12.5, 'Cepat']] },
        { key: 'readT', label: 'Waktu membaca soal', value: 8, options: [[5, '5 detik'], [8, '8 detik'], [12, '12 detik'], [20, '20 detik']] },
        { key: 'obst', label: 'Rintangan', value: 3, options: [[2, 'Sedikit'], [3, 'Sedang'], [5, 'Banyak']] },
        { key: 'items', label: 'Item (pisang dll.)', value: 'on', options: [['on', 'Aktif'], ['off', 'Nonaktif']] }
      ],
      rulesHtml: `<ul>
        <li>Layar terbelah: <b>kiri Pemain 1</b>, <b>kanan Pemain 2</b>. Karakter <b>lari otomatis ke depan</b> di jalan 3 jalur.</li>
        <li>Tombol: <b>◀ ▶ pindah jalur</b> • ⬆ lompat • ⬇ bungkuk • 🍌 pakai item. Keyboard P1: A/D, W, S, E — P2: panah, Enter.</li>
        <li>Saat soal muncul, karakter berhenti. Ada <b>3 jawaban</b> (KIRI / TENGAH / KANAN, acak), hanya <b>1 benar</b>.</li>
        <li>Pilih jawaban dengan ◀ ▶ lalu tekan ⬆ <b>JAWAB</b> — atau <b>sentuh langsung</b> jawabannya. Jika waktu habis, jalur saat itu menjadi jawaban.</li>
        <li><b>BENAR</b> = langsung lari lagi dengan ⚡ turbo. Makin cepat menjawab, makin lama turbonya → makin cepat finis!</li>
        <li><b>SALAH</b> = 😵 pusing, tidak bisa bergerak 3 detik.</li>
        <li>Rintangan: <b>batu</b> (hindari jalurnya atau lompat), <b>kayu melintang</b> (lompat), <b>palang daun</b> (bungkuk).</li>
        <li><b>Kotak hadiah</b> memberi item: 🍌 pisang dilempar ke jalur lawan, ⚡ turbo, 🛡️ perisai.</li>
        <li>Benar +100, salah −50, koin +10, pisang kena lawan +30, finis pertama +150.</li></ul>`
    });
    S = r.settings; P = r.players.map((pl, i) => ({ ...pl, idx: i }));
    toReady();
  }
  function showCard(title, html, btn = 'MULAI', bare = false) {
    const m = $('msg'); m.hidden = false; m.classList.toggle('bare', bare);
    $('msgTitle').innerHTML = title; $('msgSub').innerHTML = html;
    const b = $('btnGo'); if (btn) { b.hidden = false; b.innerHTML = `${btn} <small>Spasi</small>`; } else b.hidden = true;
    const c = m.querySelector('.card'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  }
  const hideCard = () => ($('msg').hidden = true);

  /* ------------------------------ Level (sama untuk kedua pemain) ------------------------------ */
  function buildLevel() {
    const ents = []; const cps = []; const deco = [];
    let D = 14;
    for (let i = 0; i < S.count; i++) {
      for (let k = 0; k < S.obst; k++) {
        const type = QC.pick(['rock', 'log', 'bar', 'rock', 'rock2']);
        if (type === 'rock') ents.push({ t: 'rock', D, lane: (Math.random() * 3) | 0 });
        else if (type === 'rock2') { const free = (Math.random() * 3) | 0; [0, 1, 2].filter((l) => l !== free).forEach((l) => ents.push({ t: 'rock', D, lane: l })); }
        else ents.push({ t: type, D });
        if (Math.random() < 0.6) { const ln = (Math.random() * 3) | 0; for (let c = 0; c < 5; c++) ents.push({ t: 'coin', D: D - 7 + c * 1.1, lane: ln, h: type === 'log' && c >= 3 ? 1.1 : 0.45 }); }
        if (S.items === 'on' && k === 1) ents.push({ t: 'box', D: D + 7, lane: (Math.random() * 3) | 0 });
        D += rnd(15, 21);
      }
      cps.push({ D: D + 6 });
      D += 6 + 18;
    }
    for (let d = 0; d < D + 40; d += 5.5) { deco.push({ D: d + rnd(0, 2), side: -1, k: QC.pick(['tree', 'tree', 'bush', 'flower']) }); deco.push({ D: d + rnd(0, 2) + 2.7, side: 1, k: QC.pick(['tree', 'tree', 'bush', 'flower']) }); }
    return { ents, cps, deco, finishD: D + 10 };
  }

  /* Soal dengan TEPAT 3 jawaban (1 benar). Jika soal hanya 2 pilihan, tambah 1 pengecoh dari soal lain. */
  function makeTriple(q) {
    const keys = QC.optionsOf(q); const right = q['option' + q.correct];
    let wrongs = QC.shuffle(keys.filter((k) => k !== q.correct).map((k) => q['option' + k])).slice(0, 2);
    let guard = 0;
    while (wrongs.length < 2 && guard++ < 40) { const o = QC.pick(QC.questions); const t = o['option' + QC.pick(QC.optionsOf(o))]; if (t && t !== right && !wrongs.includes(t)) wrongs.push(t); }
    const answers = QC.shuffle([{ text: right, ok: true }, ...wrongs.map((t) => ({ text: t, ok: false }))]);
    return answers.map((a, i) => ({ ...a, lane: i, key: LANES[i] }));
  }

  function toReady() {
    clearTimers(); phase = 'ready'; finishOrder = []; level = buildLevel();
    P.forEach((p) => Object.assign(p, {
      dist: 0, lane: 1, lx: 0, y: 0, vy: 0, v: 0, duck: false, anim: 0, camX: 0,
      stunT: 0, dizzyT: 0, slipT: 0, slipDir: 1, shake: 0, turboT: 0, shield: false, item: null, cheer: 0, flash: 0, warn: 0,
      score: 0, coins: 0, correct: 0, combo: 0, best: 0, asked: 0,
      phase: 'run', cp: 0, readLeft: 0, cur: null, finished: false, lastAir: -9, lastDuck: -9,
      in: { duck: false, jump: false },
      ents: level.ents.map((e) => ({ ...e })), peels: [], parts: [], texts: []
    }));
    P.forEach((p, i) => { $('av' + i).textContent = p.avatar; $('nm' + i).textContent = p.name; $('side' + i).style.setProperty('--pc', p.color); $('q' + i).hidden = true; });
    hudAll();
    showCard('SIAP BALAPAN?',
      `<b>${esc(P[0].name)}</b> (kiri) vs <b>${esc(P[1].name)}</b> (kanan)` +
      '<div class="how"><div><strong>◀ ▶ ⬆</strong>Pilih & jawab soal (atau sentuh jawaban)</div><div><strong>⬆</strong>Lompati batu & kayu</div><div><strong>⬇</strong>Bungkuk di bawah palang</div></div>' +
      '<p style="margin:10px 0 0;font-size:.9rem">Ambil kotak hadiah 🎁 → lempar 🍌 pisang ke lawan!</p>');
  }
  function begin() {
    if (phase !== 'ready') return;
    phase = 'count'; hideCard(); QC.sfx.click();
    showCard('3', '', '', true); QC.sfx.tick();
    later(() => { showCard('2', '', '', true); QC.sfx.tick(); }, 700);
    later(() => { showCard('1', '', '', true); QC.sfx.tick(); }, 1400);
    later(() => { showCard('LARI!', '', '', true); QC.sfx.whoosh(); phase = 'race'; Music.start(); }, 2100);
    later(hideCard, 2800);
  }
  function onGo() { if (phase === 'ready') begin(); }
  $('btnGo').onclick = onGo;
  $('btnRestart').onclick = async () => {
    if (QC.isBusy()) return;
    const v = await QC.modal({ icon: '↺', title: 'Ulangi balapan?', html: '<p class="qc-muted">Kedua pemain kembali ke garis start.</p>', buttons: [{ label: 'Batal', value: null }, { label: 'Pengaturan', value: 'setup' }, { label: 'Ulang', value: 'again', primary: true }] });
    if (v === 'again') { Music.stop(); toReady(); } else if (v === 'setup') openSetup();
  };

  /* ------------------------------ HUD & soal ------------------------------ */
  function hud(p, anim) {
    const i = p.idx; const sc = $('sc' + i); sc.textContent = p.score;
    if (anim) { sc.classList.remove('up', 'down'); void sc.offsetWidth; sc.classList.add(anim); }
    $('prog' + i).textContent = `Soal ${p.asked}/${S.count} • 🪙${p.coins}`;
    const it = $('item' + i); it.textContent = p.item ? ITEMS[p.item] : ''; it.classList.toggle('has', !!p.item);
    const use = document.querySelector(`.b.use[data-p="${i}"]`); use.firstChild.textContent = p.item ? ITEMS[p.item] : '🍌'; use.classList.toggle('empty', !p.item);
  }
  const hudAll = () => P.forEach((p) => hud(p));
  function say(p, txt, c, lift = 0) { p.texts.push({ txt, c, t: 0, lift }); }
  function addScore(p, d, txt, color) { p.score = Math.max(0, p.score + d); hud(p, d >= 0 ? 'up' : 'down'); if (txt) say(p, txt, color); }

  function startReading(p) {
    const q = QC.nextQuestion(); if (!q) { p.cp++; return; }
    p.asked++; p.phase = 'read'; p.readLeft = Number(S.readT) || 8; p.in.jump = false;
    p.cur = { q, triple: makeTriple(q), done: false, thinkT: null };
    renderQ(p); hud(p); QC.sfx.pop();
  }
  function renderQ(p) {
    const box = $('q' + p.idx); box.hidden = false; box.className = 'qbox';
    box.innerHTML = `<p class="qt"><span class="qn">SOAL ${p.asked}/${S.count}</span>${esc(p.cur.q.question)}</p>` +
      `<div class="opts lanes">${p.cur.triple.map((a) => `<div class="opt"><i class="${a.key}">${LANE_NAME[a.key]}</i>${esc(a.text)}</div>`).join('')}</div>` +
      `<div class="cnt" id="cnt${p.idx}"></div>`;
    // sentuh jawaban langsung = pilih & jawab
    box.querySelectorAll('.opt').forEach((o, i) => o.addEventListener('pointerdown', (e) => { e.preventDefault(); if (phase === 'race' && p.phase === 'read') { p.lane = i; endReading(p); } }));
    p.shownLane = -1; updCount(p); markLane(p);
  }
  function markLane(p) {
    if (p.shownLane === p.lane) return; p.shownLane = p.lane;
    $('q' + p.idx).querySelectorAll('.opt').forEach((o, i) => o.classList.toggle('sel', i === p.lane));
  }
  function updCount(p) { const c = $('cnt' + p.idx); if (!c) return; const T = Number(S.readT) || 8; c.innerHTML = `Pilih ◀ ▶ lalu ⬆ JAWAB (atau sentuh jawabannya) • makin cepat = turbo makin lama ⚡ <b>${Math.ceil(p.readLeft)}</b><s style="width:${(p.readLeft / T) * 100}%"></s>`; }
  // Jawaban dikunci saat ⬆ ditekan / jawaban disentuh / waktu habis (jalur saat itu = jawaban)
  function endReading(p) {
    if (p.phase !== 'read') return; p.phase = 'run';
    const T = Number(S.readT) || 8; p.cur.thinkT = Math.min(T, T - Math.max(0, p.readLeft));
    markLane(p); answer(p);
  }

  function answer(p) {
    const cur = p.cur; if (!cur || cur.done) return; cur.done = true;
    const pick = cur.triple[p.lane]; const right = cur.triple.find((a) => a.ok);
    const box = $('q' + p.idx);
    if (pick.ok) {
      p.correct++; p.combo++; p.best = Math.max(p.best, p.combo);
      const T = Number(S.readT) || 8; const frac = Math.max(0, Math.min(1, 1 - (cur.thinkT == null ? T : cur.thinkT) / T));
      const pts = 100 + Math.min(4, p.combo - 1) * 20 + Math.round(frac * 50); addScore(p, pts, `BENAR! +${pts}`, '#1f6f66');
      p.turboT = Math.max(p.turboT, 1.2 + 3.3 * frac);
      say(p, frac > 0.6 ? '⚡⚡ SUPER CEPAT!' : frac > 0.3 ? '⚡ CEPAT!' : '⚡ TURBO', '#3a86ff', 36);
      QC.sfx.correct(); QC.sfx.whoosh(); burst(p, ['#ffd23f', '#fff', '#2a9d8f'], 30); p.cheer = 0.9;
      p.v = Math.max(p.v, (Number(S.spd) || 10) * 0.8); // langsung lari lagi
      box.className = 'qbox mini done good'; box.querySelector('.qt').innerHTML = `Benar! <span class="res">${esc(right.text)}</span>`;
    } else {
      p.combo = 0; addScore(p, -50, 'SALAH! −50', '#c1121f'); QC.sfx.wrong(); later(() => QC.sfx.hit(), 150);
      p.dizzyT = DIZZY_T; p.v = 0; p.turboT = 0; p.flash = 0.35; p.shake = 0.3; burst(p, ['#555', '#e63946', '#fff'], 18);
      say(p, '😵 PUSING!', '#7c3aed', 36);
      box.className = 'qbox mini done bad'; box.querySelector('.qt').innerHTML = `Salah. Jawaban benar: <span class="res">${esc(right.text)}</span>`;
    }
    later(() => { if (p.cur === cur) box.hidden = true; }, pick.ok ? 2200 : DIZZY_T * 1000 + 300);
    p.cp++;
  }

  /* ------------------------------ Item ------------------------------ */
  function giveItem(p) { const r = Math.random(); p.item = r < 0.55 ? 'banana' : r < 0.8 ? 'turbo' : 'shield'; QC.sfx.magic(); say(p, `${ITEMS[p.item]} DAPAT!`, '#a16207'); hud(p); }
  function useItem(p) {
    if (!p.item || p.finished) return;
    const it = p.item; p.item = null; hud(p);
    if (it === 'banana') {
      const o = P[1 - p.idx];
      if (o.finished) { say(p, 'Lawan sudah finis', '#8a6a3a'); return; }
      o.peels.push({ D: o.dist + (o.phase === 'read' ? 10 : 16), lane: o.lane, by: p.idx, hit: false, t: 0 });
      QC.sfx.whoosh(); say(p, '🍌 DILEMPAR!', '#a16207'); say(o, 'AWAS PISANG! ◀ ▶ / ⬆', '#c1121f', 40); o.warn = 1.3;
    } else if (it === 'turbo') { p.turboT = 3; QC.sfx.magic(); say(p, '⚡ TURBO!', '#3a86ff'); }
    else if (it === 'shield') { p.shield = true; QC.sfx.pop(); say(p, '🛡️ PERISAI!', '#2a9d8f'); }
  }
  function hurt(p, kind) {
    if (p.shield) { p.shield = false; QC.sfx.pop(); say(p, '🛡️ AMAN!', '#2a9d8f'); return false; }
    if (kind === 'slip') {
      p.slipT = SLIP_T; p.slipDir = Math.random() < 0.5 ? -1 : 1; p.v *= 0.75; p.y = 0; p.vy = 0; p.turboT = 0; p.shake = 0.4;
      slideSfx(); later(() => QC.sfx.hit(), 300);
      burst(p, ['#ffd23f', '#fff3c4', '#c9a46a'], 16); say(p, 'TERPELESET! ADUH!', '#a16207');
    }
    else { p.stunT = 0.8; p.v *= 0.3; QC.sfx.hit(); addScore(p, -10, 'AWAS! −10', '#c1121f'); }
    p.flash = 0.3; return true;
  }
  let sac = null;
  function slideSfx() { // bunyi "siuuut" terpeleset
    if (QC.muted) return;
    try {
      sac = sac || new (window.AudioContext || window.webkitAudioContext)(); if (sac.state === 'suspended') sac.resume();
      const t = sac.currentTime; const o = sac.createOscillator(); const g = sac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.45);
      g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(sac.destination); o.start(t); o.stop(t + 0.52);
    } catch (e) { /* abaikan */ }
  }
  function burst(p, colors, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; const v = rnd(80, 300); p.parts.push({ x: 0, y: -60, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, life: rnd(0.5, 1), c: QC.pick(colors), s: rnd(3, 7) }); } }

  /* ------------------------------ Update per pemain ------------------------------ */
  function updatePlayer(p, dt) {
    const racing = phase === 'race' && !p.finished;
    const wasDizzy = p.dizzyT > 0;
    ['cheer', 'flash', 'warn', 'stunT', 'dizzyT', 'slipT', 'turboT', 'shake'].forEach((k) => { if (p[k] > 0) p[k] -= dt; });
    if (wasDizzy && p.dizzyT <= 0 && racing) { say(p, 'AYO LARI LAGI!', '#2a9d8f'); QC.sfx.pop(); }
    if (racing && p.phase === 'run' && level.cps[p.cp] && p.dist >= level.cps[p.cp].D && (!p.cur || p.cur.done)) startReading(p);
    if (p.phase === 'read') { p.readLeft -= dt; updCount(p); if (p.readLeft <= 0) endReading(p); }
    let target = racing && p.phase === 'run' ? Number(S.spd) || 10 : 0;
    if (p.turboT > 0) target *= 1.5;
    if (p.slipT > 0 || p.dizzyT > 0) target = 0; else if (p.stunT > 0) target *= 0.35;
    p.v += (target - p.v) * Math.min(1, dt * (p.dizzyT > 0 ? 12 : 3.5));
    // lompat & bungkuk
    if (p.in.jump && racing && p.phase === 'run' && p.y <= 0.001 && p.slipT <= 0 && p.dizzyT <= 0) { p.vy = JV; QC.sfx.pop(); }
    p.in.jump = false;
    if (p.y > 0 || p.vy > 0) { p.vy -= GRV * dt * (p.in.duck ? 1.7 : 1); p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; } }
    p.duck = racing && p.in.duck && p.y <= 0.001 && p.phase === 'run' && p.slipT <= 0 && p.dizzyT <= 0;
    if (p.y > 0.2) p.lastAir = gameT; if (p.duck) p.lastDuck = gameT;
    if (p.cur && !p.cur.done) markLane(p);
    p.lx += (p.lane - 1 - p.lx) * Math.min(1, dt * 12);
    p.camX += (p.lx * LANE_W * 0.55 - p.camX) * Math.min(1, dt * 6);
    const prev = p.dist; p.dist += p.v * dt; p.anim += dt * (1 + p.v * 0.9);
    if (!racing) return;
    const air = p.y > 0.2 || gameT - p.lastAir < 0.15; const duck = p.duck || gameT - p.lastDuck < 0.2;
    // benda yang dilewati
    for (const e of p.ents) {
      if (e.hit || e.D <= prev || e.D > p.dist) continue;
      if (e.t === 'rock') { if (e.lane === p.lane && !air) { e.hit = true; hurt(p, 'obst'); } }
      else if (e.t === 'log') { if (!air) { e.hit = true; hurt(p, 'obst'); } }
      else if (e.t === 'bar') { if (!duck) { e.hit = true; hurt(p, 'obst'); } }
      else if (e.t === 'coin') { if (e.lane === p.lane && ((e.h > 0.8) === (p.y > 0.5))) { e.hit = true; p.coins++; addScore(p, 10); QC.sfx.coin(); } }
      else if (e.t === 'box') { if (e.lane === p.lane) { e.hit = true; burst(p, ['#ff6b9d', '#ffd23f', '#3a86ff', '#fff'], 16); if (!p.item) giveItem(p); else { p.coins += 2; addScore(p, 20, '+20', '#a16207'); } } }
    }
    for (const pe of p.peels) {
      if (pe.hit || pe.D <= prev || pe.D > p.dist) continue;
      pe.hit = true;
      if (pe.lane === p.lane && !air) { if (hurt(p, 'slip')) addScore(P[pe.by], 30, '🍌 KENA! +30', '#a16207'); }
      else say(p, 'LOLOS!', '#2a9d8f');
    }
    if (p.dist >= level.finishD && !p.finished) finish(p);
  }
  function finish(p) {
    p.finished = true; finishOrder.push(p.idx); $('q' + p.idx).hidden = true;
    if (finishOrder.length === 1) { addScore(p, 150, 'FINIS PERTAMA! +150', '#a16207'); QC.sfx.win(); FX.announce(`${esc(p.name)} FINIS PERTAMA!`, { color: p.color, sub: '+150 poin', dur: 1400 }); }
    else { addScore(p, 50, 'FINIS! +50', '#a16207'); QC.sfx.coin(); }
    if (finishOrder.length === 2) later(endGame, 1600);
    else later(() => { const o = P[1 - p.idx]; if (!o.finished) { o.finished = true; finishOrder.push(o.idx); $('q' + o.idx).hidden = true; endGame(); } }, 25000);
  }
  async function endGame() {
    if (phase === 'over') return; clearTimers(); phase = 'over'; Music.stop();
    const ranking = [...P].sort((a, b) => b.score - a.score || b.correct - a.correct).map((p) => ({ player: p, value: `${p.score} poin • ${p.correct}/${p.asked} benar` }));
    const w = ranking[0].player; const tie = ranking[0].player.score === ranking[1].player.score;
    const r = await QC.showWinner({ title: tie ? 'SERI!' : `${w.avatar} ${esc(w.name)} MENANG!`, ranking, note: `Finis pertama: ${esc(P[finishOrder[0]].name)}` });
    if (r === 'setup') openSetup(); else toReady();
  }

  /* ------------------------------ Gambar: proyeksi 3D semu ------------------------------ */
  let V = null; // parameter tampilan per separuh layar
  function proj(lx, h, z) { const k = V.f / Math.max(0.3, z); return { x: V.cx + (lx - V.camX) * k, y: V.hy + (CAM_H - h) * k, k }; }
  function rr(x, y, w, h, r) { if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; } r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function quad(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); }

  function drawWorld(p, now) {
    const { hw, hy } = V;
    // langit
    const g = ctx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, p.idx ? '#6cc3ff' : '#5ec2ff'); g.addColorStop(1, '#dff5ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, hw, hy + 2);
    // matahari & awan
    ctx.fillStyle = 'rgba(255,240,170,.5)'; ctx.beginPath(); ctx.arc(hw * 0.8, hy * 0.45, 46, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe36e'; ctx.beginPath(); ctx.arc(hw * 0.8, hy * 0.45, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) { const x = ((i * 220 - now * 0.01 - p.camX * 20) % (hw + 260) + hw + 260) % (hw + 260) - 130; const y = hy * (0.28 + (i % 2) * 0.2); ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.arc(x + 24, y - 10, 26, 0, 7); ctx.arc(x + 50, y, 20, 0, 7); ctx.fill(); ctx.fillRect(x, y - 2, 50, 20); }
    // bukit di cakrawala
    ctx.fillStyle = '#9fdc94'; ctx.beginPath(); ctx.moveTo(0, hy);
    for (let x = 0; x <= hw; x += 16) ctx.lineTo(x, hy - 18 - Math.abs(Math.sin((x + p.camX * 40) / 90)) * 26); ctx.lineTo(hw, hy); ctx.closePath(); ctx.fill();
    // rumput dengan pita bergerak
    ctx.fillStyle = '#74c95a'; ctx.fillRect(0, hy, hw, V.h - hy);
    const band = 4; const off = p.dist % (band * 2);
    for (let z = ZP + 0.3 - off; z < VIEW; z += band * 2) {
      const z1 = Math.max(0.4, z); const z2 = z + band; const y1 = proj(0, 0, z1).y; const y2 = proj(0, 0, z2).y;
      ctx.fillStyle = '#69bd50'; ctx.fillRect(0, y2, hw, y1 - y2);
    }
    // jalan 3 jalur
    const edge = LANE_W * 1.5;
    const nl = proj(-edge - 0.15, 0, 0.6); const nr = proj(edge + 0.15, 0, 0.6); const fl = proj(-edge - 0.15, 0, VIEW); const fr = proj(edge + 0.15, 0, VIEW);
    ctx.fillStyle = '#e8d3a2'; quad(nl, fl, fr, nr);
    const a1 = proj(-edge, 0, 0.6); const a2 = proj(edge, 0, 0.6); const b1 = proj(-edge, 0, VIEW); const b2 = proj(edge, 0, VIEW);
    ctx.fillStyle = '#d4a373'; quad(a1, b1, b2, a2);
    // pita jalan (kesan bergerak)
    for (let z = ZP + 0.3 - off; z < VIEW; z += band * 2) {
      const z1 = Math.max(0.6, z); const z2 = z + band;
      ctx.fillStyle = 'rgba(255,255,255,.07)'; quad(proj(-edge, 0, z1), proj(-edge, 0, z2), proj(edge, 0, z2), proj(edge, 0, z1));
    }
    // garis pembatas jalur (putus-putus)
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (const lxd of [-LANE_W / 2, LANE_W / 2]) {
      for (let z = ZP + 0.3 - (p.dist % 3); z < VIEW; z += 3) { const z1 = Math.max(0.6, z); const z2 = z + 1.4; quad(proj(lxd - 0.04, 0, z1), proj(lxd - 0.04, 0, z2), proj(lxd + 0.04, 0, z2), proj(lxd + 0.04, 0, z1)); }
    }
    // warna jalur jawaban saat memilih (kiri ungu, tengah hijau, kanan oranye)
    if (p.cur && !p.cur.done && p.phase === 'read') {
      const relG = 16;
      p.cur.triple.forEach((a) => { const lx = (a.lane - 1) * LANE_W; ctx.fillStyle = LANE_COL[a.key] + '33'; quad(proj(lx - LANE_W / 2 + 0.05, 0, 0.8), proj(lx - LANE_W / 2 + 0.05, 0, relG), proj(lx + LANE_W / 2 - 0.05, 0, relG), proj(lx + LANE_W / 2 - 0.05, 0, 0.8)); });
    }
  }

  function drawDeco(d, z) {
    const lx = d.side * (LANE_W * 1.5 + 1.3); const b = proj(lx, 0, z); const k = b.k; if (b.y < V.hy - 2) return;
    if (d.k === 'tree') {
      ctx.fillStyle = '#8d5a2b'; ctx.fillRect(b.x - 0.12 * k, b.y - 1.4 * k, 0.24 * k, 1.4 * k);
      ctx.fillStyle = '#3f9a3a'; ctx.beginPath(); ctx.arc(b.x, b.y - 1.8 * k, 0.75 * k, 0, 7); ctx.arc(b.x - 0.5 * k, b.y - 1.35 * k, 0.5 * k, 0, 7); ctx.arc(b.x + 0.5 * k, b.y - 1.35 * k, 0.5 * k, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(b.x - 0.25 * k, b.y - 2.05 * k, 0.25 * k, 0, 7); ctx.fill();
    } else if (d.k === 'bush') { ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(b.x - 0.3 * k, b.y - 0.2 * k, 0.35 * k, 0, 7); ctx.arc(b.x + 0.15 * k, b.y - 0.32 * k, 0.42 * k, 0, 7); ctx.arc(b.x + 0.55 * k, b.y - 0.18 * k, 0.3 * k, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = ['#ff6b9d', '#ffd23f', '#ffffff'][Math.floor(d.D) % 3]; ctx.beginPath(); ctx.arc(b.x, b.y - 0.25 * k, 0.12 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#3d8b2f'; ctx.fillRect(b.x - 0.02 * k, b.y - 0.2 * k, 0.04 * k, 0.2 * k); }
  }

  function drawEnt(e, z, now) {
    ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 2.5;
    if (e.t === 'rock') {
      const b = proj((e.lane - 1) * LANE_W, 0, z); const k = b.k; const w = 0.85 * k; const h = 0.6 * k;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, w * 0.55, w * 0.12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a7f8a'; ctx.beginPath(); ctx.moveTo(b.x - w / 2, b.y); ctx.quadraticCurveTo(b.x - w / 2, b.y - h, b.x - w * 0.05, b.y - h); ctx.quadraticCurveTo(b.x + w / 2, b.y - h * 0.9, b.x + w / 2, b.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a1a7b3'; ctx.beginPath(); ctx.ellipse(b.x - w * 0.15, b.y - h * 0.7, w * 0.14, h * 0.1, -0.3, 0, 7); ctx.fill();
    } else if (e.t === 'log') {
      const l = proj(-LANE_W * 1.5, 0, z); const r = proj(LANE_W * 1.5, 0, z); const k = l.k; const h = 0.42 * k;
      ctx.fillStyle = '#8d5a2b'; rr(l.x, l.y - h, r.x - l.x, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(59,34,0,.35)'; ctx.lineWidth = 1.5; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(l.x + (r.x - l.x) * i / 6, l.y - h + 2); ctx.lineTo(l.x + (r.x - l.x) * i / 6, l.y - 2); ctx.stroke(); }
      if (k > 30) { ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(h * 0.7)}px Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⬆ LOMPAT', (l.x + r.x) / 2, l.y - h / 2); }
    } else if (e.t === 'bar') {
      const l = proj(-LANE_W * 1.5 - 0.1, 0, z); const r = proj(LANE_W * 1.5 + 0.1, 0, z); const k = l.k;
      const top = proj(0, 2.1, z).y; const bot = proj(0, 0.72, z).y;
      ctx.fillStyle = '#8d5a2b'; ctx.fillRect(l.x - 0.1 * k, top, 0.12 * k, l.y - top); ctx.fillRect(r.x - 0.02 * k, top, 0.12 * k, r.y - top);
      ctx.fillStyle = '#5a9e3c'; rr(l.x, top, r.x - l.x, bot - top, 0.12 * k); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7cc45a'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(l.x + (r.x - l.x) * (i + 0.5) / 9, bot, 0.08 * k, 0.14 * k, 0, 0, 7); ctx.fill(); }
      if (k > 30) { ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round((bot - top) * 0.32)}px Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⬇ BUNGKUK', (l.x + r.x) / 2, (top + bot) / 2); }
    } else if (e.t === 'coin' && !e.hit) {
      const b = proj((e.lane - 1) * LANE_W, e.h, z); const r = 0.16 * b.k; const sq = Math.abs(Math.cos(now / 220 + e.D));
      ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#a66b00'; ctx.lineWidth = Math.max(1, r * 0.2); ctx.beginPath(); ctx.ellipse(b.x, b.y, r * Math.max(0.25, sq), r, 0, 0, 7); ctx.fill(); ctx.stroke();
    } else if (e.t === 'box' && !e.hit) {
      const b = proj((e.lane - 1) * LANE_W, 0.55 + Math.sin(now / 260) * 0.08, z); const s = 0.5 * b.k; const hue = (now / 8) % 360;
      ctx.fillStyle = `hsl(${hue},85%,62%)`; rr(b.x - s / 2, b.y - s / 2, s, s, s * 0.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(b.x - s * 0.09, b.y - s / 2, s * 0.18, s); ctx.fillRect(b.x - s / 2, b.y - s * 0.09, s, s * 0.18);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(b.x - s * 0.15, b.y - s * 0.6, s * 0.15, 0, 7); ctx.arc(b.x + s * 0.15, b.y - s * 0.6, s * 0.15, 0, 7); ctx.fill(); ctx.stroke();
    }
  }
  function drawPeel(pe, z, now) {
    if (pe.hit) return; const b = proj((pe.lane - 1) * LANE_W, 0, z); const k = b.k;
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(b.x + i * 0.14 * k, b.y - 0.04 * k, 0.13 * k, 0.06 * k, i * 0.5, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#c1121f'; ctx.font = `900 ${Math.max(10, Math.round(0.35 * k))}px "Lilita One"`; ctx.textAlign = 'center'; ctx.fillText('!', b.x, b.y - 0.4 * k - Math.abs(Math.sin(now / 150)) * 0.1 * k);
  }
  function drawFinish(z) {
    const l = proj(-LANE_W * 1.5 - 0.2, 0, z); const r = proj(LANE_W * 1.5 + 0.2, 0, z); const k = l.k; const top = proj(0, 2.9, z).y; const hb = 0.45 * k;
    ctx.fillStyle = '#fff'; ctx.fillRect(l.x - 0.08 * k, top, 0.12 * k, l.y - top); ctx.fillRect(r.x - 0.04 * k, top, 0.12 * k, r.y - top);
    const n = 16; const cw = (r.x - l.x) / n; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#3b2200'; ctx.fillRect(l.x + i * cw, top + j * hb / 2, cw + 0.5, hb / 2 + 0.5); }
    if (k > 12) { ctx.fillStyle = '#e63946'; ctx.font = `400 ${Math.round(0.4 * k)}px "Lilita One"`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('FINIS', (l.x + r.x) / 2, top - 2); }
  }

  // Karakter dilihat dari belakang
  function drawRunner(p) {
    const b = proj(p.lx * LANE_W, 0, ZP); const k = b.k; const c = p.color;
    const lift = p.y * k * 0.7; const x = b.x; const yg = b.y;
    // terpeleset: kaki terangkat, jatuh menyamping, pusing berbintang, lalu bangun
    const falling = p.slipT > 0; let rot = 0; let hop = 0; let ft = 0; const dir = p.slipDir || 1;
    if (falling) {
      ft = 1 - p.slipT / SLIP_T; const R = 1.5 * dir;
      rot = ft < 0.2 ? R * easeOut(ft / 0.2) : ft < 0.78 ? R + Math.sin(ft * 30) * 0.03 : R * (1 - easeOut((ft - 0.78) / 0.22));
      hop = ft < 0.2 ? Math.sin((ft / 0.2) * Math.PI) * 0.4 * k : 0;
    }
    const lying = falling && ft > 0.15 && ft < 0.85;
    const dizzy = p.dizzyT > 0 && !falling; if (dizzy) rot = Math.sin(gameT * 7) * 0.16; // goyang pusing
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath();
    ctx.ellipse(x + (lying ? dir * 0.45 * k : 0), yg, (lying ? 0.62 : 0.32) * k * (1 - Math.min(0.5, p.y * 0.3)), 0.07 * k, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, yg - lift - hop); if (rot) ctx.rotate(rot);
    const s = k / 100; ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 3;
    if (p.shield) { ctx.strokeStyle = 'rgba(56,189,248,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, -50, 46, 62, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 3; }
    if (p.turboT > 0) { ctx.fillStyle = 'rgba(58,134,255,.45)'; for (let i = 0; i < 4; i++) ctx.fillRect(-40 + i * 24, 4 + (i % 2) * 6, 6, 18); }
    if (p.duck) {
      ctx.fillStyle = '#2b2d42'; rr(-22, -18, 44, 18, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; rr(-26, -48, 52, 34, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd23f'; rr(-18, -50, 36, 24, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -56, 16, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.restore(); return;
    }
    const run = p.v > 0.5 && p.y <= 0.001 && !falling; const ph = Math.sin(p.anim * 2.2); const air = p.y > 0.001;
    // kaki (dari belakang: naik-turun bergantian)
    const kick = falling ? 12 + Math.sin(ft * 50) * 6 : 0;
    const lUp = falling ? kick : run ? Math.max(0, ph) * 16 : air ? 10 : 0; const rUp = falling ? 18 - kick : run ? Math.max(0, -ph) * 16 : air ? 4 : 0;
    ctx.fillStyle = '#2b2d42';
    rr(-17, -40, 14, 40 - lUp, 6); ctx.fill(); ctx.stroke(); rr(3, -40, 14, 40 - rUp, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; rr(-19, -8 - lUp, 18, 10, 5); ctx.fill(); ctx.stroke(); rr(1, -8 - rUp, 18, 10, 5); ctx.fill(); ctx.stroke();
    // badan & lengan
    const sw = run ? ph * 10 : air ? -14 : 0; const cheer = p.cheer > 0;
    const flail = falling ? Math.sin(ft * 45) * 10 : 0; const armUp = cheer || falling;
    ctx.strokeStyle = '#ffd6a5'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-18, -70); ctx.lineTo(falling ? -40 : -30, armUp ? -104 + flail : -46 - sw); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, -70); ctx.lineTo(falling ? 40 : 30, armUp ? -104 - flail : -46 + sw); ctx.stroke();
    ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 3;
    ctx.fillStyle = c; rr(-20, -82, 40, 46, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; rr(-15, -78, 30, 30, 7); ctx.fill(); ctx.stroke(); // tas punggung
    ctx.fillStyle = '#3b2200'; ctx.font = '900 18px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(p.idx + 1), 0, -62);
    // kepala dari belakang + topi
    ctx.fillStyle = '#ffd6a5'; ctx.beginPath(); ctx.arc(0, -98, 16, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5b3a1a'; ctx.beginPath(); ctx.arc(0, -98, 16, Math.PI * 0.95, Math.PI * 0.05, false); ctx.lineTo(16, -92); ctx.quadraticCurveTo(0, -86, -16, -92); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -102, 16, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (falling) {
      const s2 = k / 100;
      // kulit pisang terlempar ke udara sambil berputar
      if (ft < 0.7) {
        const px = x - dir * 110 * s2 * ft; const py = yg - (620 * ft - 885 * ft * ft) * s2;
        ctx.save(); ctx.translate(px, py); ctx.rotate(ft * 16); ctx.scale(s2, s2);
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 2.5;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * 9, 4 + Math.abs(i) * 3, 7, 15, i * 0.7, 0, 7); ctx.fill(); ctx.stroke(); }
        ctx.restore();
      }
      // bintang pusing di atas kepala
      if (lying) {
        const hx = x + Math.sin(rot) * 98 * s2; const hy2 = yg - hop - Math.cos(rot) * 98 * s2 - 28 * s2;
        for (let i = 0; i < 3; i++) { const a = ft * 16 + i * 2.094; star(hx + Math.cos(a) * 30 * s2, hy2 + Math.sin(a) * 10 * s2, 9 * s2); }
      }
    }
    if (dizzy) { // bintang & burung kecil berputar di atas kepala
      const s2 = k / 100; const hx = x + Math.sin(rot) * 98 * s2; const hy2 = yg - lift - Math.cos(rot) * 98 * s2 - 30 * s2;
      for (let i = 0; i < 4; i++) { const a = gameT * 5 + i * (Math.PI / 2); const sx = hx + Math.cos(a) * 34 * s2; const sy = hy2 + Math.sin(a) * 11 * s2; if (i % 2) star(sx, sy, 10 * s2); else { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 6 * s2, 0, 7); ctx.fill(); ctx.stroke(); } }
    }
  }
  function star(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = '#3b2200'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawHalf(p, ox, hw, now) {
    const h = H; const hy = Math.round(H * 0.4); const feetY = Math.max(H - CTRL_H + 20, hy + H * 0.3);
    V = { cx: hw / 2, hy, h, hw, f: (feetY - hy) * ZP / CAM_H, camX: p.camX };
    ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, hw, H); ctx.clip(); ctx.translate(ox, 0);
    if (p.shake > 0) { const m = p.shake / 0.4; ctx.translate((Math.random() - 0.5) * 16 * m, (Math.random() - 0.5) * 10 * m); }
    drawWorld(p, now);
    // kumpulkan benda dalam jangkauan pandang, gambar dari jauh ke dekat
    const list = [];
    for (const d of level.deco) { const z = d.D - p.dist + ZP; if (z > 0.5 && z < VIEW) list.push({ z, f: () => drawDeco(d, z) }); }
    for (const e of p.ents) { const z = e.D - p.dist + ZP; if (z > 0.5 && z < VIEW) list.push({ z, f: () => drawEnt(e, z, now) }); }
    for (const pe of p.peels) { const z = pe.D - p.dist + ZP; if (z > 0.5 && z < VIEW) list.push({ z, f: () => drawPeel(pe, z, now) }); }
    { const z = level.finishD - p.dist + ZP; if (z > 0.5 && z < VIEW) list.push({ z, f: () => drawFinish(z) }); }
    list.push({ z: ZP, f: () => drawRunner(p), runner: true });
    list.sort((a, b) => b.z - a.z || (a.runner ? 1 : -1));
    for (const it of list) it.f();
    // partikel & teks di atas karakter
    const rb = proj(p.lx * LANE_W, 0, ZP);
    for (const pt of p.parts) { ctx.globalAlpha = Math.min(1, pt.life * 2); ctx.fillStyle = pt.c; ctx.beginPath(); ctx.arc(rb.x + pt.x, rb.y - rb.k * 0.9 + pt.y, pt.s, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    p.texts.forEach((t, i) => { const kk = t.t / 1.5; ctx.globalAlpha = 1 - kk * kk; ctx.font = '400 28px "Lilita One"'; const y = rb.y - rb.k * 1.35 - t.lift - kk * 50 - i * 6; ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText(t.txt, hw / 2, y); ctx.fillStyle = t.c || '#3b2200'; ctx.fillText(t.txt, hw / 2, y); });
    ctx.globalAlpha = 1;
    if (p.dizzyT > 0) { // pusing karena salah: layar sedikit gelap + hitung mundur
      ctx.fillStyle = 'rgba(80,40,120,.12)'; ctx.fillRect(0, 0, hw, H);
      const ty = rb.y + 26; const t = `😵 PUSING ${Math.ceil(p.dizzyT)}`;
      ctx.font = '400 26px "Lilita One"'; ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText(t, rb.x, ty); ctx.fillStyle = '#7c3aed'; ctx.fillText(t, rb.x, ty);
    }
    if (p.flash > 0) { ctx.fillStyle = `rgba(230,57,70,${Math.min(0.3, p.flash)})`; ctx.fillRect(0, 0, hw, H); }
    if (p.warn > 0 && Math.floor(now / 150) % 2 === 0) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, hw - 12, H - 12); }
    if (p.finished) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, hw, H); ctx.font = '400 48px "Lilita One"'; ctx.lineWidth = 8; ctx.strokeStyle = '#3b2200'; const t = `FINIS #${finishOrder.indexOf(p.idx) + 1}`; ctx.strokeText(t, hw / 2, H * 0.45); ctx.fillStyle = '#ffd23f'; ctx.fillText(t, hw / 2, H * 0.45); }
    ctx.restore();
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#3b2200'; ctx.fillRect(0, 0, W, H);
    if (!level || !P.length) return;
    const hw = Math.floor(W / 2) - 3;
    drawHalf(P[0], 0, hw, now); drawHalf(P[1], W - hw, hw, now);
    const g = ctx.createLinearGradient(W / 2 - 3, 0, W / 2 + 3, 0); g.addColorStop(0, P[0].color); g.addColorStop(1, P[1].color);
    ctx.fillStyle = g; ctx.fillRect(W / 2 - 3, 0, 6, H);
  }

  let last = performance.now();
  function frame(now) { requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; try { tick(dt); draw(now); } catch (err) { console.error(err); } }
  function tick(dt) {
    gameT += dt;
    if (!level || !P.length) return;
    for (const p of P) {
      updatePlayer(p, dt);
      for (const pt of p.parts) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 900 * dt; }
      p.parts = p.parts.filter((pt) => pt.life > 0);
      for (const t of p.texts) t.t += dt; p.texts = p.texts.filter((t) => t.t < 1.5);
    }
  }
  requestAnimationFrame(frame);
  openSetup();
})();
