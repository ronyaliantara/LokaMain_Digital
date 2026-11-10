/* ==========================================================================
   TARIK TAMBANG JUARA — kuis adu tenaga 2 tim (atau 1 tim vs Tim Robot)
   Karakter, nama & desain orisinal. Semua grafis digambar dengan kode.
   Alur tiap ronde:
   1. SOAL: kedua tim menjawab SERENTAK di pad masing-masing (sekali, terkunci).
      Benar = TENAGA (makin cepat makin besar) + tali tersentak ke arah tim.
      Benar 3x beruntun = TENAGA SUPER. Salah = tim TERPELESET, tali bergeser ke lawan.
   2. ADU TENAGA: tekan TARIK berulang-ulang; tiap tarikan dikali tenaga.
      KUDA-KUDA SEREMPAK: tarikan yang pas dengan aba-aba "HEI-YA!" wasit = x1.5.
      SORAK PENONTON: meter semangat penuh -> penonton bersorak, tenaga +25%.
   3. Pita merah melewati garis menang -> lawan tercebur kolam lumpur!
      Soal habis -> tim yang talinya condong ke sisinya menang.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  const LETTERS = ['A', 'B', 'C', 'D'];
  const SHAPE = { A: '▲', B: '◆', C: '●', D: '■' };
  const OC = { A: '#8b5cf6', B: '#f59e0b', C: '#10b981', D: '#ec4899' };
  const TEAM = [
    { color: '#ef4444', dark: '#b91c1c', shorts: '#7f1d1d', side: -1, keys: ['1 · Q', '2 · W', '3 · E', '4 · R'], hint: '1 2 3 4 / Q W E R' },
    { color: '#3b82f6', dark: '#1d4ed8', shorts: '#1e3a8a', side: 1, keys: ['7 · U', '8 · I', '9 · O', '0 · P'], hint: '7 8 9 0 / U I O P' }
  ];
  const KEYMAP = { '1': [0, 0], '2': [0, 1], '3': [0, 2], '4': [0, 3], q: [0, 0], w: [0, 1], e: [0, 2], r: [0, 3],
    '7': [1, 0], '8': [1, 1], '9': [1, 2], '0': [1, 3], u: [1, 0], i: [1, 1], o: [1, 2], p: [1, 3] };
  const BOT = {
    easy: { acc: 0.55, t: [0.45, 0.85], rate: 4.3, beat: 0.25, name: 'mudah' },
    normal: { acc: 0.72, t: [0.28, 0.65], rate: 5.8, beat: 0.4, name: 'sedang' },
    hard: { acc: 0.88, t: [0.16, 0.42], rate: 7.3, beat: 0.6, name: 'sulit' }
  };
  const ROPE = { short: 3.5, medium: 5, long: 7 };
  const VMAX = 0.42; const DECAY = 3; const F_SOFT = 2.5;
  const BEAT = 0.6; const BEAT_WIN = 0.13; // aba-aba kuda-kuda "HEI-YA!"
  const SKINS = ['#f6cfa0', '#e0a872', '#c68652', '#a9693e', '#f3c08f'];
  const HAIRS = ['#2a1810', '#4b2a14', '#151526', '#6a3b1a', '#3a2a20'];
  const OUT = '#2a1a3a';
  const LOGO = `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#ffd23f" stroke="#23194a" stroke-width="4"/><path d="M5 37 C 20 31, 44 31, 59 37" stroke="#4a2a10" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M5 37 C 20 31, 44 31, 59 37" stroke="#d9a55a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M5 37 C 20 31, 44 31, 59 37" stroke="#8a5a26" stroke-width="6" fill="none" stroke-dasharray="2 4"/><path d="M32 34 l-10 -9 v16 z M32 34 l10 -9 v16 z" fill="#ef4444" stroke="#23194a" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 37 l-4 15 M34 37 l4 15" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="34" r="4" fill="#fff" stroke="#23194a" stroke-width="2.5"/></svg>`;
  const RULES = `<ul>
    <li><b>Tim Merah (kiri)</b> vs <b>Tim Biru (kanan)</b>. Main 1 tim? Lawan <b>Tim Robot 🤖</b>.</li>
    <li><b>SOAL</b>: kedua tim menjawab <b>bersamaan</b> di pad masing-masing (A–D). Hanya <b>1 kali</b> — langsung <b>terkunci</b>!</li>
    <li><b>Benar</b> = dapat <b>TENAGA</b> (makin cepat makin besar) dan tali tersentak ke arahmu. Benar 3× beruntun = <b>💥 TENAGA SUPER</b>.</li>
    <li><b>Salah</b> = tim <b>terpeleset</b>: tali bergeser ke lawan & tenaga jadi lemas.</li>
    <li><b>ADU TENAGA</b>: tekan tombol <b>TARIK</b> sebanyak-banyaknya. Tiap tarikan dikali tenagamu.</li>
    <li><b>Kuda-kuda serempak</b>: tarik pas aba-aba wasit <b>"HEI-YA!"</b> (lingkaran berdenyut di tombol) = tarikan <b>×1.5</b>. Kompak itu kuat!</li>
    <li><b>📣 Sorak penonton</b>: jawaban benar mengisi meter semangat. Saat penuh, penonton bersorak dan tenaga adu tarik <b>+25%</b>.</li>
    <li>Pita merah melewati <b>garis menang</b> di sisimu = <b>MENANG</b> — lawan tercebur kolam lumpur! Jika soal habis, tim yang talinya condong ke sisinya menang.</li>
    <li>Keyboard — Tim Merah: <kbd>1</kbd>–<kbd>4</kbd> / <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd>, Tim Biru: <kbd>7</kbd>–<kbd>0</kbd> / <kbd>U</kbd><kbd>I</kbd><kbd>O</kbd><kbd>P</kbd> (tombol yang sama untuk TARIK). <kbd>Spasi</kbd> = mulai / lanjut.</li></ul>`;

  QC.init({ gameId: 'tarik-tambang', title: 'Tarik Tambang Juara', avatars: ['🔥', '🌊', '🦁', '🦈', '🐯', '🐼', '🦊', '🐸', '⚡', '🌟'], colors: ['#ef4444', '#3b82f6', '#10b981', '#a855f7'] });

  /* ------------------------------ Audio sendiri (musik + sfx khas) ------------------------------ */
  const AU = (() => {
    let ac = null; let nb = null;
    function get() {
      if (QC.muted) return null;
      try {
        if (!ac) {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          const len = ac.sampleRate * 2; nb = ac.createBuffer(1, len, ac.sampleRate); const d = nb.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ac.state === 'suspended') ac.resume();
      } catch (e) { return null; }
      return ac;
    }
    function tone(f, d, type = 'sine', v = 0.1, delay = 0, f2 = null, dest = null) {
      const a = get(); if (!a) return; const t = a.currentTime + delay;
      const o = a.createOscillator(); const g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(dest || a.destination); o.start(t); o.stop(t + d + 0.03);
    }
    function noise(d, v, delay = 0, type = 'lowpass', freq = 900, q = 0.7, attack = 0, dest = null) {
      const a = get(); if (!a) return; const t = a.currentTime + delay;
      const s = a.createBufferSource(); s.buffer = nb; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = a.createGain();
      if (attack > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); } else g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f).connect(g).connect(dest || a.destination); s.start(t, Math.random() * 0.5, d + 0.05);
    }
    return { get, tone, noise, get ctx() { return ac; } };
  })();
  const SFX = {
    tap(i, serempak) { AU.tone(i ? 170 : 140, 0.08, 'triangle', 0.16, 0, 70); AU.noise(0.05, 0.06, 0, 'lowpass', 700); if (serempak) AU.tone(i ? 880 : 784, 0.07, 'square', 0.035); },
    beat(hi) { AU.tone(hi ? 520 : 390, 0.06, 'square', 0.03); },
    lock() { AU.tone(660, 0.06, 'square', 0.05); AU.tone(990, 0.09, 'square', 0.05, 0.05); },
    whistle(n = 1, len = 0.3) {
      const a = AU.get(); if (!a) return;
      for (let k = 0; k < n; k++) {
        const t = a.currentTime + k * (len + 0.09);
        const o = a.createOscillator(); const lfo = a.createOscillator(); const lg = a.createGain(); const g = a.createGain();
        o.type = 'sine'; o.frequency.value = 2350; lfo.frequency.value = 36; lg.gain.value = 120; lfo.connect(lg).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.02); g.gain.setValueAtTime(0.1, t + len - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g).connect(a.destination); o.start(t); lfo.start(t); o.stop(t + len + 0.03); lfo.stop(t + len + 0.03);
      }
    },
    cheer(v = 1) { AU.noise(1.5, 0.09 * v, 0, 'bandpass', 1250, 0.6, 0.28); AU.noise(1.3, 0.05 * v, 0.08, 'bandpass', 2500, 0.9, 0.25); AU.noise(1.1, 0.04 * v, 0.15, 'bandpass', 700, 0.8, 0.2); },
    slip() { AU.tone(980, 0.42, 'sine', 0.13, 0, 170); AU.noise(0.25, 0.12, 0.05, 'lowpass', 1200); },
    splash() { AU.noise(0.9, 0.38, 0, 'lowpass', 650); AU.tone(330, 0.5, 'sine', 0.22, 0, 50); AU.noise(0.55, 0.22, 0.14, 'bandpass', 480, 1.2); AU.noise(0.4, 0.12, 0.32, 'bandpass', 900, 2); },
    creak() { AU.tone(120, 0.3, 'sawtooth', 0.035, 0, 95); }
  };

  /* ------------------------------ Musik latar (bisa dimatikan) ------------------------------ */
  const Music = (() => {
    let master = null; let timer = null; let next = 0; let step = 0; let intense = false; const bpm = 132;
    let on = true; try { on = localStorage.getItem('lokamain_tt_music') !== 'off'; } catch (e) { /* abaikan */ }
    const MEL = [[67, 72, 76, 72, 79, 76, 72, 0], [69, 72, 77, 72, 81, 77, 72, 0], [71, 74, 79, 74, 77, 74, 71, 0], [72, 76, 79, 84, 79, 76, 72, 0]];
    const BASS = [[48, 55], [53, 60], [55, 50], [48, 55]];
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function note(ac, f, t, d, type, v) { const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02); }
    function tick() {
      const ac = AU.ctx; if (!ac) return; const spb = 60 / bpm / 2;
      while (next < ac.currentTime + 0.2) {
        const bar = Math.floor(step / 8) % 4; const s = step % 8; const m = MEL[bar][s];
        if (m) note(ac, hz(m), next, spb * 0.85, 'square', 0.03);
        if (s % 2 === 0) note(ac, hz(BASS[bar][(s / 2) % 2] - 12), next, spb * 1.5, 'triangle', 0.22);
        if (s % 2 === 1) { const src = ac.createBufferSource(); src.buffer = ac.createBuffer(1, 800, ac.sampleRate); const d = src.buffer.getChannelData(0); for (let i = 0; i < 800; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / 800); const g = ac.createGain(); g.gain.value = 0.05; src.connect(g).connect(master); src.start(next); }
        if (intense && s % 2 === 0) note(ac, 110, next, 0.12, 'sine', 0.35);
        next += spb; step++;
      }
    }
    return {
      get on() { return on; },
      start() { if (!on || QC.muted || timer) return; const ac = AU.get(); if (!ac) return; if (!master) { master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); } next = ac.currentTime + 0.06; timer = setInterval(tick, 60); },
      stop() { clearInterval(timer); timer = null; },
      intense(v) { intense = v; },
      toggle() { on = !on; try { localStorage.setItem('lokamain_tt_music', on ? 'on' : 'off'); } catch (e) { /* abaikan */ } if (on && live()) this.start(); else this.stop(); return on; }
    };
  })();
  function syncMusicBtn() { $('btnMusic').classList.toggle('off', !Music.on || QC.muted); }
  $('btnMusic').onclick = () => { Music.toggle(); syncMusicBtn(); QC.sfx.click(); };
  document.querySelector('[data-qc="sound"]').addEventListener('click', () => { if (QC.muted) Music.stop(); else if (live()) Music.start(); syncMusicBtn(); });
  syncMusicBtn();

  /* ------------------------------ Kanvas & tata letak ------------------------------ */
  const cv = $('cv'); const ctx = cv.getContext('2d');
  let W = 0; let H = 0; let DPR = 1; let G = null; let stillFrames = 0;
  function layout() {
    W = Math.max(300, innerWidth); H = Math.max(300, innerHeight);
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const portrait = W < H * 0.95;
    const pr = $('pads').getBoundingClientRect(); const padsTop = pr.height > 10 ? pr.top : H * 0.77;
    const U = portrait ? W / 860 : Math.min(W / 1280, H / 720);
    const gy = Math.round(Math.min(H * 0.72, padsTop - 34 * U));
    const D = portrait ? W * 0.21 : 175 * U;
    G = { U, portrait, cx: W / 2, gy, hy: gy - 175 * U, st: gy - 330 * U, D, ry: gy - 61 * U, n: portrait ? 3 : 4, sp: (portrait ? 62 : 74) * U, front: 50 * U, poolRx: D * 0.82, poolRy: 27 * U };
    bg.key = ''; stillFrames = 0;
    const hb = document.querySelector('.top').getBoundingClientRect().bottom; $('board').style.top = Math.round(hb + 8) + 'px';
  }

  /* ------------------------------ Status permainan ------------------------------ */
  let S = { rounds: 8, answerT: 15, pullT: 5, bot: 'normal', rope: 'medium' };
  let T = []; let solo = false;
  let phase = 'idle'; let phaseT = 0; let round = 0; let q = null; let keys = []; let timeLeft = 0; let bothT = 0; let lastSec = -1;
  let pos = 0; let posShow = 0; let vel = 0; let rvPx = 0; let L = 5; let shake = 0; const cheer = [0, 0];
  let winner = -1; let tie = false; let endWhy = ''; let pullLeft = 0; let pullStartPos = 0; let revealDur = 4; let winFrom = 0;
  let refPose = 'idle'; let gameT = 0; let beatT = 0; let beatN = 0; let lastCount = -1; let creakT = 0;
  const parts = []; const texts = [];
  const live = () => ['count', 'question', 'reveal', 'pullReady', 'pull', 'settle', 'win'].includes(phase);

  function look(i, j) { return { skin: SKINS[(i * 2 + j * 3) % SKINS.length], hair: HAIRS[(i + j * 2) % HAIRS.length], style: (i * 3 + j) % 4, sc: [1.04, 0.97, 1.01, 0.95][j % 4], ph: rnd(0, 6) }; }
  function mkTeam(p, i) {
    return { name: p.name, avatar: p.avatar, bot: !!p.bot, i, color: TEAM[i].color, dark: TEAM[i].dark, shorts: TEAM[i].shorts, side: TEAM[i].side,
      correct: 0, wrong: 0, combo: 0, best: 0, power: 1, ans: null, ansT: 0, locked: false, res: null, superOn: false, spirit: 0, boost: false,
      F: 0, roundTaps: 0, totalTaps: 0, sync: 0, strain: 0.3, slipT: 0, hopT: 0, stepPh: 0, sayT: 1, botAt: 0, botPick: null, botAcc: 0, botRate: 5, sndT: 0,
      kids: [0, 1, 2, 3].map((j) => look(i, j)), fallen: false };
  }

  /* ------------------------------ Efek: partikel & teks ------------------------------ */
  function addP(p) { if (parts.length < 450) parts.push(p); }
  function dust(x, y, n = 4, big = 1) { const U = G.U; for (let k = 0; k < n; k++) addP({ k: 'dust', x: x + rnd(-10, 10) * U, y: y - rnd(0, 4) * U, vx: rnd(-50, 50) * U, vy: rnd(-40, -8) * U, r: rnd(4, 8) * U * big, life: rnd(0.4, 0.8), max: 0.8 }); }
  function sweat(x, y, dir) { const U = G.U; addP({ k: 'sweat', x, y, vx: -dir * rnd(40, 100) * U, vy: rnd(-120, -60) * U, r: rnd(2.4, 3.4) * U, life: 0.9, max: 0.9 }); }
  function mudSplash(x, y, n, pw = 1) { const U = G.U; for (let k = 0; k < n; k++) addP({ k: 'mud', x: x + rnd(-14, 14) * U, y, vx: rnd(-1, 1) * 240 * U * pw, vy: -rnd(140, 460) * U * pw, r: rnd(3, 8) * U, life: rnd(0.9, 1.5), max: 1.5, floor: y + rnd(-8, 14) * U }); }
  function stars(x, y, n, col) { const U = G.U; for (let k = 0; k < n; k++) { const a = rnd(0, 6.28); const v = rnd(80, 260) * U; addP({ k: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80 * U, r: rnd(4, 8) * U, life: rnd(0.6, 1.1), max: 1.1, c: col || QC.pick(['#ffd23f', '#fff', '#fb923c']), rot: rnd(0, 6) }); } }
  function say(x, y, txt, col, size = 28, life = 1.4) { texts.push({ k: 'float', x, y, txt, col, size, life, max: life }); }
  function big(txt, col, life = 1.1, y = null, size = 96) { texts.push({ k: 'big', x: G.cx, y: y == null ? G.ry - 165 * G.U : y, txt, col, size, life, max: life }); }
  function bubble(x, y, txt, col) { texts.push({ k: 'bubble', x, y, txt, col, size: 18, life: 0.9, max: 0.9 }); }

  /* ------------------------------ Posisi karakter ------------------------------ */
  const offPx = () => (posShow / L) * G.D;
  function kidX(t, j, off = offPx()) { return G.cx + off + t.side * (G.D + G.front + j * G.sp); }
  function teamMidX(t) { return kidX(t, Math.min(1, G.n - 1)); }
  const headY = () => G.gy - 128 * G.U;

  /* ------------------------------ Masukan: keyboard & sentuh ------------------------------ */
  QC.onKey = (e) => {
    const k = (e.key || '').toLowerCase();
    if (k === ' ' || k === 'enter' || e.code === 'Space') {
      e.preventDefault(); if (e.repeat) return;
      if (phase === 'ready') begin(); else if (phase === 'reveal' && phaseT > 0.8) afterReveal();
      return;
    }
    const m = KEYMAP[k]; if (!m) return;
    e.preventDefault(); if (e.repeat) return;
    let ti = m[0]; if (solo) ti = 0;
    if (phase === 'question') answer(ti, LETTERS[m[1]], 'key'); else if (phase === 'pull') tap(ti, 'key');
  };
  [0, 1].forEach((i) => {
    $('pans' + i).addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.ab'); if (!b) return; e.preventDefault();
      b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 140);
      if (T[i] && !T[i].bot) answer(i, b.dataset.k, 'touch');
    });
    const pb = $('pull' + i);
    pb.addEventListener('pointerdown', (e) => { e.preventDefault(); if (T[i] && !T[i].bot) tap(i, 'touch'); });
    pb.addEventListener('contextmenu', (e) => e.preventDefault());
    $('pad' + i).addEventListener('contextmenu', (e) => e.preventDefault());
  });

  /* ------------------------------ Setup ------------------------------ */
  async function openSetup() {
    phase = 'idle'; Music.stop(); hideCard(); $('board').hidden = true; stillFrames = 0;
    const pr = QC.setup({
      logo: LOGO, subtitle: 'Adu otak, adu otot! Jawab serentak untuk dapat tenaga, lalu tarik tambang sekuat-kuatnya. Yang kalah tercebur lumpur!',
      min: 1, max: 2, defaultCount: 2, soloLabel: '1 Tim (vs Robot)', defaultNames: ['Tim Merah', 'Tim Biru'],
      settings: [
        { key: 'rounds', label: '🔢 Jumlah soal / ronde', value: 8, options: [[5, '5 soal'], [8, '8 soal'], [10, '10 soal'], [12, '12 soal'], [15, '15 soal']] },
        { key: 'answerT', label: '⏱️ Waktu menjawab', value: 15, options: [[10, '10 detik'], [15, '15 detik'], [20, '20 detik'], [30, '30 detik']] },
        { key: 'pullT', label: '💪 Durasi adu tenaga', value: 5, options: [[0, '0 = mati (hanya dari jawaban)'], [3, '3 detik'], [5, '5 detik'], [8, '8 detik']] },
        { key: 'rope', label: '📏 Panjang tali', value: 'medium', options: [['short', 'Pendek (cepat menang)'], ['medium', 'Sedang'], ['long', 'Panjang (sulit menang)']] },
        { key: 'bot', label: '🤖 Kekuatan Robot (1 tim)', value: 'normal', options: [['easy', 'Mudah'], ['normal', 'Sedang'], ['hard', 'Sulit']] }
      ],
      rulesHtml: RULES
    });
    patchSetup();
    const r = await pr;
    S = { ...S, ...r.settings }; L = ROPE[S.rope] || 5;
    solo = r.players.length === 1;
    const ps = r.players.slice(0, 2).map((p) => ({ name: p.name, avatar: p.avatar }));
    if (solo) ps.push({ name: 'Tim Robot', avatar: '🤖', bot: true });
    T = ps.map((p, i) => mkTeam(p, i));
    applyTeams(); bg.key = ''; newGame();
  }
  function patchSetup() {
    const o = document.querySelector('.qc-setup'); if (!o) return;
    const h3 = o.querySelector('.qc-panel h3'); if (h3) h3.textContent = '👥 Jumlah Tim';
    o.querySelectorAll('.qc-seg button').forEach((b) => { if (b.dataset.n === '2') b.textContent = '2 Tim (Merah vs Biru)'; });
    const sm = o.querySelector('.qc-panel .qc-muted.small'); if (sm) sm.textContent = 'Klik ikon untuk ganti maskot tim • Nama tim bisa diubah';
  }
  function applyTeams() {
    T.forEach((t, i) => {
      [$('tc' + i), $('pad' + i), $('bSt' + i)].forEach((el) => { el.style.setProperty('--tc', t.color); el.style.setProperty('--tcd', t.dark); });
      $('tav' + i).textContent = t.avatar; $('tnm' + i).textContent = t.name; $('pav' + i).textContent = t.avatar; $('pnm' + i).textContent = t.name;
      $('pkeys' + i).textContent = t.bot ? '🤖 OTOMATIS' : solo ? '1–4 · Q–R · 7–0 · U–P' : TEAM[i].hint;
      $('pull' + i).classList.toggle('bot', t.bot);
    });
    document.querySelector('.meter').style.background = `linear-gradient(90deg, ${T[0].color} 0 50%, ${T[1].color} 50% 100%)`;
  }

  /* ------------------------------ Kartu tengah ------------------------------ */
  function showCard(title, html, btn = 'MULAI', bare = false) {
    const m = $('msg'); m.hidden = false; m.classList.toggle('bare', bare);
    $('msgTitle').innerHTML = title; $('msgSub').innerHTML = html; $('msgSub').hidden = !html;
    const b = $('btnGo'); if (btn) { b.hidden = false; b.innerHTML = `${btn} <small>Spasi / Enter</small>`; } else b.hidden = true;
    const c = m.querySelector('.card'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  }
  const hideCard = () => { $('msg').hidden = true; };
  $('btnGo').onclick = () => { if (phase === 'ready') begin(); };

  /* ------------------------------ Alur permainan ------------------------------ */
  function newGame() {
    phase = 'ready'; phaseT = 0; round = 0; pos = 0; posShow = 0; vel = 0; winner = -1; tie = false; endWhy = '';
    parts.length = 0; texts.length = 0; refPose = 'idle'; cheer[0] = cheer[1] = 0;
    T.forEach((t, i) => Object.assign(t, { correct: 0, wrong: 0, combo: 0, best: 0, power: 1, ans: null, locked: false, res: null, superOn: false, spirit: 0, boost: false,
      F: 0, roundTaps: 0, totalTaps: 0, sync: 0, strain: 0.3, slipT: 0, hopT: 0, fallen: false, kids: [0, 1, 2, 3].map((j) => look(i, j)) }));
    $('board').hidden = true; Music.stop(); stillFrames = 0;
    T.forEach((t, i) => setPad(i, 'msg', 'idle', 'BERSIAP', 'Menunggu soal pertama…'));
    updHud();
    const pullTxt = S.pullT > 0 ? `Tekan <b>TARIK</b> berulang-ulang selama ${S.pullT} detik. Pas aba-aba <b>HEI-YA!</b> = ×1.5` : 'Adu tenaga <b>mati</b>: tali bergerak hanya dari jawaban.';
    showCard('SIAP ADU KUAT?',
      `<div class="vs"><span class="tm" style="--tc:${T[0].color}">${T[0].avatar} ${esc(T[0].name)}</span><span class="x">VS</span><span class="tm" style="--tc:${T[1].color}">${T[1].avatar} ${esc(T[1].name)}</span></div>` +
      `<div class="how"><div><strong>1 · JAWAB SERENTAK</strong>Pilih A–D di pad timmu. Sekali jawab, langsung terkunci!</div>` +
      `<div><strong>2 · TENAGA</strong>Benar & cepat = tenaga besar. Salah = tim terpeleset!</div>` +
      `<div><strong>3 · TARIK!!!</strong>${pullTxt}</div></div>`);
  }
  function begin() {
    if (phase !== 'ready' || QC.isBusy()) return;
    phase = 'count'; phaseT = 0; lastCount = -1; hideCard(); QC.sfx.click(); Music.start(); syncMusicBtn();
  }
  function nextRound() {
    if (round >= S.rounds) { finalDecision(); return; }
    q = QC.nextQuestion();
    if (!q) { QC.toast('⚠️ Bank soal kosong! Buka Mode Guru untuk menambah soal.', 'bad'); openSetup(); return; }
    round++; keys = QC.optionsOf(q); timeLeft = S.answerT; bothT = 0; lastSec = -1; phase = 'question'; phaseT = 0; refPose = 'idle';
    T.forEach((t) => {
      Object.assign(t, { ans: null, locked: false, ansT: 0, res: null, F: 0, roundTaps: 0, sync: 0, boost: false });
      if (t.bot) { const b = BOT[S.bot] || BOT.normal; t.botAt = S.answerT * rnd(b.t[0], b.t[1]); const wr = keys.filter((k) => k !== q.correct); t.botPick = Math.random() < b.acc || !wr.length ? q.correct : QC.pick(wr); }
    });
    renderBoard(); T.forEach((t, i) => setPad(i, 'ask')); updHud(); QC.sfx.pop();
  }
  function renderBoard() {
    const b = $('board'); b.hidden = false; b.className = 'board' + (q.question.length > 120 ? ' long' : '');
    void b.offsetWidth; b.classList.add('pop');
    $('bNo').textContent = `SOAL ${round}/${S.rounds}`;
    $('bQ').textContent = q.question;
    const long = keys.some((k) => String(q['option' + k]).length > 38);
    const o = $('bOpts'); o.className = `b-opts n${keys.length}${long ? ' long' : ''}`;
    o.innerHTML = keys.map((k, n) => `<div class="bo" style="--oc:${OC[k]};--i:${n}"><b>${k}</b><span>${esc(q['option' + k])}</span></div>`).join('');
    $('bRes').hidden = true; $('bPull').hidden = true;
    updStatus(); updTimer();
  }
  function updStatus() {
    T.forEach((t, i) => {
      const el = $('bSt' + i); el.className = 'b-st' + (i ? ' r' : '');
      if (phase === 'question') { if (t.locked) { el.classList.add('lock'); el.textContent = `${t.avatar} ${t.name} 🔒 terkunci`; } else el.textContent = `${t.avatar} ${t.name} ${t.bot ? '🤖 berpikir…' : '✍️ menjawab…'}`; }
      else if (t.res === 'good') { el.classList.add('good'); el.textContent = `${t.avatar} ✔ BENAR ×${t.power.toFixed(1)}`; }
      else if (t.res === 'bad') { el.classList.add('bad'); el.textContent = `${t.avatar} ✘ SALAH`; }
      else el.textContent = `${t.avatar} ⏰ tidak menjawab`;
    });
  }
  function updTimer() {
    const s = Math.max(0, Math.ceil(timeLeft)); const tm = $('bTime');
    if (tm.textContent !== String(s)) tm.textContent = s;
    const hurry = timeLeft <= 5; tm.classList.toggle('hurry', hurry); $('board').classList.toggle('hurry', hurry);
    $('bBar').style.transform = `scaleX(${clamp(timeLeft / S.answerT, 0, 1)})`;
    if (s !== lastSec) { lastSec = s; if (hurry && s > 0) QC.sfx.tick(); }
  }

  function answer(i, k, src) {
    if (phase !== 'question') return; const t = T[i]; if (!t || t.locked) return;
    if (t.bot && src !== 'bot') return; if (!keys.includes(k)) return;
    t.locked = true; t.ans = k; t.ansT = S.answerT - timeLeft;
    SFX.lock(); setPad(i, 'msg', 'lock', '🔒 TERKUNCI', t.bot ? 'Robot sudah menjawab' : `Dijawab dalam ${t.ansT.toFixed(1)} dtk • tunggu lawan…`);
    FX.ringAt($('pad' + i), '#ffffff', 260); updStatus();
    say(teamMidX(t), headY() - 30 * G.U, '🔒', '#fff', 30, 0.9);
  }

  function reveal() {
    phase = 'reveal'; phaseT = 0; refPose = 'point';
    let shift = 0; let anyGood = false; let anyBad = false;
    T.forEach((t, i) => {
      const mx = teamMidX(t); const hy = headY();
      if (t.ans === q.correct) {
        anyGood = true; t.correct++; t.combo++; t.best = Math.max(t.best, t.combo);
        const sp = clamp(1 - t.ansT / S.answerT, 0, 1);
        let pw = 1 + 0.8 * sp; let sh = 0.35 + 0.35 * sp;
        t.superOn = t.combo >= 3;
        if (t.superOn) { pw *= 1.3; sh += 0.25; } else if (t.combo === 2) pw += 0.15;
        t.power = Math.round(pw * 10) / 10; shift += t.side * sh; t.res = 'good'; t.hopT = 1.2; cheer[i] = 1.3;
        t.spirit = Math.min(100, t.spirit + (t.superOn ? 50 : 34));
        const tag = sp > 0.66 ? '⚡ KILAT!' : sp > 0.33 ? 'CEPAT!' : 'BENAR!';
        say(mx, hy - 30 * G.U, `${tag} ×${t.power.toFixed(1)}`, '#22c55e', 30);
        stars(mx, hy, 14);
        if (t.superOn) { big('💥 TENAGA SUPER!', t.color, 1.4, hy - 90 * G.U, 54); stars(mx, hy, 22, '#ffd23f'); QC.sfx.magic(); }
        setPad(i, 'msg', t.superOn ? 'super' : 'good', t.superOn ? '💥 TENAGA SUPER!' : '✅ BENAR!', `Tenaga ×${t.power.toFixed(1)} • combo ${t.combo}${t.combo >= 2 && !t.superOn ? ' (+bonus)' : ''}`);
        flashPad(i, 'flash-good'); FX.burstAt($('pad' + i), { emojis: ['💪', '⭐', '✨'], count: 12, spread: 130 });
      } else if (t.ans) {
        anyBad = true; t.wrong++; t.combo = 0; t.superOn = false; t.power = 0.5; shift -= t.side * 0.45; t.res = 'bad'; t.slipT = 1.3;
        t.spirit = Math.max(0, t.spirit - 10); shake = Math.max(shake, 0.55);
        say(mx, hy - 30 * G.U, 'TERPELESET!', '#ef4444', 30);
        for (let j = 0; j < G.n; j++) dust(kidX(t, j), G.gy, 5, 1.3);
        setPad(i, 'msg', 'bad', '❌ SALAH!', `Pilih ${t.ans} • tim terpeleset, tenaga lemas ×0.5`); flashPad(i, 'flash-bad');
      } else {
        t.combo = 0; t.superOn = false; t.power = 0.6; t.res = 'none';
        say(mx, hy - 30 * G.U, '⏰ TELAT!', '#f59e0b', 28);
        setPad(i, 'msg', 'idle', '⏰ TIDAK MENJAWAB', 'Tenaga lemas ×0.6');
      }
    });
    // tanpa adu tenaga: semangat penuh langsung jadi sentakan tambahan
    if (S.pullT <= 0) T.forEach((t, i) => { if (t.spirit >= 100) { t.spirit = 0; shift += t.side * 0.4; crowdBoost(i); } });
    pos += shift;
    if (anyGood) QC.sfx.correct(); if (anyBad) { setTimeout(() => SFX.slip(), 120); }
    if (anyGood) SFX.cheer(0.8);
    renderReveal(); updHud();
    revealDur = clamp(3.4 + (q.explanation || '').length / 50, 3.4, 7);
  }
  function renderReveal() {
    const b = $('board'); b.classList.add('res'); b.classList.remove('hurry');
    const c = q.correct;
    const pick = (t) => t.res === 'good' ? `<span class="pk good">${t.avatar} ${esc(t.name)}: ${t.ans} ✔</span>` : t.res === 'bad' ? `<span class="pk bad">${t.avatar} ${esc(t.name)}: ${t.ans} ✘</span>` : `<span class="pk none">${t.avatar} ${esc(t.name)}: —</span>`;
    $('bRes').innerHTML = `<div class="b-ans" style="--oc:${OC[c]}"><b>${c}</b><span>${esc(q['option' + c])}</span></div>` +
      (q.explanation ? `<div class="b-exp">💡 ${esc(q.explanation)}</div>` : '') +
      `<div class="b-foot">${pick(T[0])}<button class="b-next" id="bNext">Lanjut ▶ <small>Spasi</small></button>${pick(T[1])}</div>`;
    $('bRes').hidden = false; $('bNext').onclick = () => { if (phase === 'reveal') afterReveal(); };
    updStatus();
  }
  function afterReveal() {
    if (phase !== 'reveal') return;
    if (checkWin()) return;
    if (S.pullT > 0) startPull(); else endRoundOrNext();
  }
  function checkWin() { if (Math.abs(pos) >= L) { startWin(pos > 0 ? 1 : 0, 'line'); return true; } return false; }

  function crowdBoost(i) {
    const t = T[i]; cheer[i] = 2.2; SFX.cheer(1.4);
    FX.announce(`📣 SORAK PENONTON!`, { color: t.color, sub: `${esc(t.name)} makin semangat${S.pullT > 0 ? ' — tenaga +25%' : ' — tali tersentak!'}`, dur: 1500 });
    for (let k = 0; k < 6; k++) stars(rnd(0, 1) < 0.5 ? (i ? G.cx + rnd(0.1, 0.48) * W : rnd(0.02, 0.4) * W) : teamMidX(t), G.st + rnd(20, 90) * G.U, 3, t.color);
  }
  function startPull() {
    phase = 'pullReady'; phaseT = 0; pullStartPos = pos; refPose = 'ready';
    const b = $('board'); b.className = 'board pulling'; $('bPull').hidden = false;
    $('bPull').innerHTML = `💪 ADU TENAGA! <small>Bersiap… pegang tali erat-erat!</small>`;
    T.forEach((t, i) => {
      Object.assign(t, { F: 0, roundTaps: 0, sync: 0, botAcc: 0, boost: false });
      t.botRate = (BOT[S.bot] || BOT.normal).rate * rnd(0.85, 1.15);
      if (t.spirit >= 100) { t.spirit = 0; t.boost = true; crowdBoost(i); }
      setPad(i, 'pull', 'ready');
    });
    big('SIAP…', '#ffffff', 0.85); QC.sfx.tick(); updHud();
  }
  function goPull() {
    phase = 'pull'; phaseT = 0; pullLeft = S.pullT; beatT = 0; beatN = 0; refPose = 'pull';
    big('TARIK!!!', '#ffd23f', 1.1, null, 110); SFX.whistle(1, 0.45); shake = Math.max(shake, 0.35); cheer[0] = cheer[1] = 1; SFX.cheer(0.9);
    Music.intense(true); T.forEach((t, i) => setPad(i, 'pull', 'go'));
  }
  function tap(i, src) {
    if (phase !== 'pull') return; const t = T[i]; if (!t) return; if (t.bot && src !== 'bot') return;
    const d = Math.min(beatT, BEAT - beatT); const serempak = d <= BEAT_WIN;
    const pw = t.power * (t.boost ? 1.25 : 1) * (serempak ? 1.5 : 1);
    t.F += pw; t.roundTaps++; t.totalTaps++; if (serempak) t.sync++;
    const now = performance.now(); if (now - t.sndT > 45) { t.sndT = now; SFX.tap(i, serempak); }
    const pb = $('pull' + i); pb.animate([{ transform: 'scale(.95) translateY(3px)' }, { transform: 'none' }], { duration: 130 });
    $('psub' + i).textContent = `tenaga ×${(t.power * (t.boost ? 1.25 : 1)).toFixed(1)} • ${t.roundTaps} tarikan • ${t.sync} serempak`;
    if (serempak && t.sync % 3 === 1) say(teamMidX(t), headY() - 40 * G.U, 'SEREMPAK! ×1.5', '#ffd23f', 22, 0.8);
    const j = (Math.random() * G.n) | 0; if (Math.random() < 0.35) dust(kidX(t, j) - t.side * 16 * G.U, G.gy, 2);
  }
  function endPull() {
    phase = 'settle'; phaseT = 0; refPose = 'stop'; Music.intense(false);
    SFX.whistle(2, 0.18); big('STOP!', '#ffffff', 1.0, null, 90);
    const d = pos - pullStartPos;
    if (Math.abs(d) > 0.05) {
      const w = d > 0 ? 1 : 0; const t = T[w]; cheer[w] = 1.4; t.spirit = Math.min(100, t.spirit + 15);
      say(teamMidX(t), headY() - 40 * G.U, `+${Math.abs(d).toFixed(1)} m!`, t.color, 34);
      $('bPull').innerHTML = `✋ STOP! <small>${t.avatar} ${esc(t.name)} menang adu tenaga: +${Math.abs(d).toFixed(1)} m</small>`;
    } else $('bPull').innerHTML = `✋ STOP! <small>Sama kuat — tali tidak bergeser</small>`;
    T.forEach((t, i) => setPad(i, 'pull', 'stop'));
    updHud();
  }
  function endRoundOrNext() { if (round >= S.rounds) finalDecision(); else nextRound(); }
  function finalDecision() {
    if (Math.abs(pos) < 0.05) {
      if (T[0].correct !== T[1].correct) { startWin(T[0].correct > T[1].correct ? 0 : 1, 'count'); return; }
      tie = true; endGame(); return;
    }
    startWin(pos > 0 ? 1 : 0, 'rounds');
  }
  function startWin(w, why) {
    phase = 'win'; phaseT = 0; winner = w; endWhy = why; vel = 0; winFrom = pos; refPose = 'win';
    $('board').hidden = true; Music.intense(false);
    T[1 - w].kids.forEach((k) => { k.fx0 = null; k.splashed = false; });
    T.forEach((t, i) => setPad(i, 'msg', i === w ? 'win' : 'lose', i === w ? '🏆 MENANG!' : '💦 TERCEBUR!', i === w ? 'Tarikan juara!' : 'Masuk kolam lumpur…'));
    SFX.whistle(1, 0.7); shake = 0.5;
    big(why === 'line' ? 'GARIS MENANG!' : 'TARIKAN TERAKHIR!', '#ffd23f', 1.1, null, 64);
  }
  async function endGame() {
    phase = 'over'; Music.stop(); $('board').hidden = true; stillFrames = 0;
    const order = tie ? [0, 1] : [winner, 1 - winner];
    const ranking = order.map((i) => ({ player: { name: T[i].name, avatar: T[i].avatar, color: T[i].color }, value: `${T[i].correct}/${round} benar` }));
    const L2 = tie ? null : T[1 - winner];
    const title = tie ? '🤝 SERI!' : `${T[winner].avatar} ${esc(T[winner].name)} JUARA!`;
    const note = tie ? 'Tali tepat di tengah dan jumlah jawaban benar sama. Kalian sama kuat!'
      : endWhy === 'line' ? `Pita melewati garis menang — ${esc(L2.name)} tercebur ke kolam lumpur! 💦`
        : endWhy === 'count' ? `Tali tepat di tengah, pemenang ditentukan jumlah benar. ${esc(L2.name)} tercebur lumpur! 💦`
          : `Soal habis — tali condong ke sisi ${esc(T[winner].name)}. ${esc(L2.name)} tercebur lumpur! 💦`;
    const r = await QC.showWinner({ title, ranking, note });
    if (r === 'setup') openSetup(); else newGame();
  }

  /* ------------------------------ Pad & HUD ------------------------------ */
  function setPad(i, mode, cls = '', title = '', sub = '') {
    const t = T[i]; const pad = $('pad' + i); const ans = $('pans' + i); const pb = $('pull' + i); const msg = $('pmsg' + i);
    if (mode === 'ask') {
      ans.hidden = false; pb.hidden = true; ans.style.setProperty('--k', keys.length);
      ans.innerHTML = keys.map((k) => `<button class="ab" data-k="${k}" style="--oc:${OC[k]}"><i>${SHAPE[k]}</i><b>${k}</b><small>${t.bot ? '' : solo ? `${LETTERS.indexOf(k) + 1} · ${'QWER'[LETTERS.indexOf(k)]}` : TEAM[i].keys[LETTERS.indexOf(k)]}</small></button>`).join('');
      pad.classList.toggle('off', t.bot);
      if (t.bot) { msg.className = 'pad-msg idle'; msg.innerHTML = '<b>🤖 BERPIKIR…</b><small>Robot sedang menghitung jawaban</small>'; } else { msg.className = 'pad-msg'; msg.innerHTML = ''; }
      return;
    }
    if (mode === 'pull') {
      ans.hidden = true; pb.hidden = false; msg.className = 'pad-msg'; msg.innerHTML = ''; pad.classList.remove('off');
      pb.classList.toggle('off', cls !== 'go'); pb.classList.toggle('go', cls === 'go' && !t.bot);
      const pw = (t.power * (t.boost ? 1.25 : 1)).toFixed(1);
      $('pmain' + i).textContent = cls === 'ready' ? '✊ SIAP…' : cls === 'stop' ? '✋ STOP!' : t.bot ? '🤖 TARIK!' : '💪 TARIK!';
      $('psub' + i).textContent = cls === 'stop' ? `${t.roundTaps} tarikan • ${t.sync} serempak` : `tenaga ×${pw}${t.boost ? ' 📣' : ''} • ${t.roundTaps} tarikan`;
      return;
    }
    pb.hidden = true; ans.hidden = !ans.innerHTML;
    pad.classList.add('off');
    msg.className = 'pad-msg ' + cls; msg.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
  }
  function flashPad(i, cls) { const p = $('pad' + i); p.classList.remove(cls); void p.offsetWidth; p.classList.add(cls); }
  function updHud() {
    $('round').textContent = `SOAL ${round}/${S.rounds}`;
    T.forEach((t, i) => {
      $('tst' + i).textContent = `✔ ${t.correct} benar${t.combo >= 2 ? ` • 🔥 combo ${t.combo}` : ''}`;
      $('tpw' + i).textContent = `×${(t.power * (t.boost ? 1.25 : 1)).toFixed(1)}`;
      $('tc' + i).classList.toggle('super', t.superOn);
      $('tsp' + i).style.width = t.spirit + '%'; $('tsp' + i).parentElement.classList.toggle('full', t.spirit >= 100);
    });
  }
  let mkLast = null;
  function updMeter() {
    const v = clamp(posShow / L, -1, 1); const s = (50 + 50 * v).toFixed(1);
    if (s !== mkLast) { mkLast = s; $('mk').style.left = `calc(${s}% + ${(-v * 6).toFixed(1)}px)`; }
  }

  /* ------------------------------ Tombol header ------------------------------ */
  $('btnRules').onclick = () => QC.modal({ icon: '📜', title: 'Peraturan Tarik Tambang', html: RULES, cls: 'tt-rules', dismissable: true });
  $('btnSetup').onclick = async () => {
    if (phase === 'idle') return;
    if (phase === 'ready') { openSetup(); return; }
    const v = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Permainan yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }], dismissable: true });
    if (v) openSetup();
  };

  /* ------------------------------ Update per frame ------------------------------ */
  function tick(dt) {
    gameT += dt; phaseT += dt;
    const prev = posShow;
    posShow += (pos - posShow) * Math.min(1, dt * (phase === 'pull' || phase === 'win' ? 14 : 4));
    rvPx = dt > 0 ? ((posShow - prev) / dt) / L * G.D : 0;
    switch (phase) {
      case 'count': {
        const n = phaseT < 0.75 ? 3 : phaseT < 1.5 ? 2 : phaseT < 2.25 ? 1 : 0;
        if (n !== lastCount) { lastCount = n; if (n) { showCard(String(n), '', '', true); QC.sfx.tick(); } else { showCard('AYO!', '', '', true); QC.sfx.whoosh(); SFX.cheer(0.7); } }
        if (phaseT > 2.8) { hideCard(); nextRound(); }
        break;
      }
      case 'question': {
        timeLeft -= dt;
        T.forEach((t, i) => { if (t.bot && !t.locked && S.answerT - timeLeft >= t.botAt) answer(i, t.botPick, 'bot'); });
        updTimer();
        if (T.every((t) => t.locked)) { bothT += dt; if (bothT > 0.5) reveal(); } else if (timeLeft <= 0) reveal();
        break;
      }
      case 'reveal': if (phaseT >= revealDur) afterReveal(); break;
      case 'pullReady': if (phaseT >= 0.9) goPull(); break;
      case 'pull': {
        pullLeft -= dt; beatT += dt;
        if (beatT >= BEAT) { beatT -= BEAT; beatN++; SFX.beat(beatN % 2 === 0); refBeat(); }
        T.forEach((t, i) => {
          if (t.bot) {
            t.botAcc += t.botRate * dt * rnd(0.8, 1.2);
            const b = BOT[S.bot] || BOT.normal;
            if (t.botAcc >= 1) { // robot cenderung menarik pas aba-aba sesuai tingkat
              const near = Math.min(beatT, BEAT - beatT) <= BEAT_WIN;
              if (near || Math.random() > b.beat || t.botAcc > 1.6) { t.botAcc -= 1; tap(i, 'bot'); }
            }
          }
          t.F *= Math.exp(-DECAY * dt);
        });
        const F0 = T[0].F; const F1 = T[1].F;
        const vt = VMAX * (F1 - F0) / (F0 + F1 + F_SOFT);
        vel += (vt - vel) * Math.min(1, dt * 5); pos += vel * dt;
        $('bPull').innerHTML = `💪 TARIK!!! <em>${Math.max(0, pullLeft).toFixed(1)}</em> <small>Tarik pas aba-aba HEI-YA! = ×1.5</small>`;
        creakT -= dt; if (Math.abs(vel) > 0.12 && creakT <= 0) { creakT = 0.7; SFX.creak(); }
        if (checkWin()) { Music.intense(false); return; }
        if (pullLeft <= 0) endPull();
        break;
      }
      case 'settle': vel *= Math.exp(-6 * dt); if (phaseT >= 1.5) endRoundOrNext(); break;
      case 'win': tickWin(dt); break;
      default: break;
    }
    // tim: ketegangan, langkah, keringat, teriakan
    T.forEach((t, i) => {
      t.slipT = Math.max(0, t.slipT - dt); t.hopT = Math.max(0, t.hopT - dt);
      const target = phase === 'pull' ? 0.3 + 0.7 * t.F / (t.F + 2.5) : phase === 'pullReady' ? 0.6 : 0.32;
      t.strain += (target - t.strain) * Math.min(1, dt * 6);
      t.stepPh += Math.abs(rvPx) * dt * 0.12 / G.U;
      const gain = rvPx * t.side;
      if (phase !== 'win' && gain < -22 * G.U && Math.random() < dt * 16) dust(kidX(t, (Math.random() * G.n) | 0) + t.side * 18 * G.U, G.gy, 2);
      if (phase === 'pull') {
        if (t.strain > 0.55 && Math.random() < dt * 6 * t.strain) { const j = (Math.random() * G.n) | 0; sweat(kidX(t, j) - t.side * 14 * G.U, headY() + rnd(-4, 8) * G.U, -t.side); }
        t.sayT -= dt; if (t.sayT <= 0) { t.sayT = rnd(0.8, 1.4); const j = (Math.random() * G.n) | 0; bubble(kidX(t, j), headY() - 34 * G.U, QC.pick(['HEI-YA!', 'TARIK!', 'AYO!', 'KUAT!', 'UGHH!', 'SATU… DUA…']), t.color); }
      }
      cheer[i] = Math.max(0, cheer[i] - dt * 0.8);
    });
    shake = Math.max(0, shake - dt * 1.6);
    updParts(dt); updMeter();
  }
  function refBeat() {
    T.forEach((t, i) => { const el = $('pbeat' + i); el.animate([{ transform: 'translate(-50%,-50%) scale(.25)', opacity: 0.95 }, { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 0 }], { duration: 380, easing: 'ease-out' }); });
    texts.push({ k: 'ref', x: G.cx, y: G.gy - 128 * G.U, txt: beatN % 2 ? 'HEI!' : 'YA!', col: '#23194a', size: 22, life: 0.45, max: 0.45 });
  }
  function tickWin(dt) {
    const w = T[winner]; const l = T[1 - winner]; const s = w.side;
    pos = lerp(winFrom, s * L * 1.08, ease(phaseT / 0.6));
    l.kids.forEach((k, j) => {
      if (j >= G.n) return;
      const f = (phaseT - 0.45 - j * 0.16) / 0.5;
      if (f > 0 && k.fx0 == null) k.fx0 = kidX(l, j);
      if (f >= 1 && !k.splashed) {
        k.splashed = true; const x = G.cx + l.side * G.D * (-0.45 + 0.32 * j);
        mudSplash(x, G.gy + 2 * G.U, 26, 1); shake = Math.max(shake, 0.7); SFX.splash();
        if (j === 0) { big('BYURRR!', '#8b5a2b', 1.4, G.gy - 150 * G.U, 84); cheer[winner] = 2.5; SFX.cheer(1.5); }
      }
    });
    if (phaseT > 0.9 && phaseT - 0.9 < dt * 1.5) FX.announce(`${w.avatar} ${esc(w.name)} MENANG!`, { color: w.color, sub: `${esc(l.name)} tercebur ke kolam lumpur!`, dur: 1700 });
    w.hopT = 1;
    if (phaseT > 3.7) endGame();
  }
  function updParts(dt) {
    const U = G.U;
    for (const p of parts) {
      p.life -= dt;
      if (p.k === 'dust') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.r += 12 * U * dt; }
      else if (p.k === 'sweat') { p.vy += 620 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.k === 'mud') { p.vy += 900 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > p.floor && p.vy > 0) { p.k = 'splat'; p.y = p.floor; p.life = Math.min(p.life, 0.8); p.max = 0.8; } }
      else if (p.k === 'star') { p.vy += 260 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6; }
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    for (const t of texts) t.life -= dt;
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
  }

  /* ------------------------------ Latar statis (di-cache) ------------------------------ */
  const bg = { key: '' };
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR)); const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, x]; }
  function ell(x, cx, cy, rx, ry) { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 7); }
  function rrect(x, X, Y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function teamInfo(i) { return T[i] || { name: i ? 'Tim Biru' : 'Tim Merah', avatar: i ? '🌊' : '🔥', color: TEAM[i].color }; }
  function buildBg() {
    const key = [W, H, DPR, G.gy, teamInfo(0).avatar, teamInfo(0).name, teamInfo(1).avatar, teamInfo(1).name].join('|');
    if (bg.key === key) return; bg.key = key;
    const { U, cx, gy, hy, st, D } = G;
    const fy = hy - 24 * U; const rowH = (fy - st) / 4;

    /* --- A: langit, umbul-umbul tali, tribun --- */
    const [a, x] = mkCanvas(W, fy + 2);
    let g = x.createLinearGradient(0, 0, 0, st);
    g.addColorStop(0, '#38a6f2'); g.addColorStop(0.65, '#86d2ff'); g.addColorStop(1, '#d9f2ff');
    x.fillStyle = g; x.fillRect(0, 0, W, fy + 2);
    const sx = W * 0.9; const sy = Math.max(84 * U, st - 110 * U);
    g = x.createRadialGradient(sx, sy, 8 * U, sx, sy, 150 * U); g.addColorStop(0, 'rgba(255,246,190,.95)'); g.addColorStop(0.3, 'rgba(255,240,170,.35)'); g.addColorStop(1, 'rgba(255,240,170,0)');
    x.fillStyle = g; x.fillRect(sx - 150 * U, sy - 150 * U, 300 * U, 300 * U);
    x.fillStyle = '#fff3b0'; ell(x, sx, sy, 34 * U, 34 * U); x.fill(); x.fillStyle = '#ffd84d'; ell(x, sx, sy, 27 * U, 27 * U); x.fill();
    // bukit jauh
    x.fillStyle = '#9fd8a6'; x.beginPath(); x.moveTo(0, st);
    for (let X = 0; X <= W + 10; X += 10) x.lineTo(X, st - 36 * U - Math.sin(X / (120 * U)) * 22 * U - Math.sin(X / (47 * U) + 1) * 8 * U);
    x.lineTo(W, st); x.closePath(); x.fill();
    // tribun: dinding & anak tangga
    g = x.createLinearGradient(0, st, 0, fy); g.addColorStop(0, '#3d48a8'); g.addColorStop(1, '#2b3486');
    x.fillStyle = g; x.fillRect(0, st, W, fy - st + 2);
    for (let r = 0; r < 4; r++) { const y0 = st + (r + 1) * rowH - 7 * U; x.fillStyle = '#d7dcf6'; x.fillRect(0, y0, W, 7 * U); x.fillStyle = '#9aa3d6'; x.fillRect(0, y0 + 5 * U, W, 2 * U); }
    // tiang tribun
    x.fillStyle = '#25307a'; for (let X = 0; X <= W; X += W / 6) x.fillRect(X - 4 * U, st, 8 * U, fy - st);
    // atap bergaris (tenda) + rumbai
    const aw = 26 * U; const sw = 26 * U;
    x.fillStyle = '#1f2766'; x.fillRect(0, st - aw - 6 * U, W, 6 * U);
    for (let X = 0, k = 0; X < W; X += sw, k++) { x.fillStyle = k % 2 ? '#ffffff' : '#ef4444'; x.fillRect(X, st - aw, sw, aw); x.beginPath(); x.arc(X + sw / 2, st, sw / 2, 0, Math.PI); x.fill(); }
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2 * U; x.beginPath(); x.moveTo(0, st - aw); x.lineTo(W, st - aw); x.stroke();
    // tali bendera segitiga warna-warni
    const flagCols = ['#ef4444', '#ffffff', '#ffd23f', '#3b82f6', '#22c55e', '#ffffff'];
    for (let s2 = 0; s2 < 2; s2++) {
      const y0 = st - aw - 34 * U - s2 * 30 * U; const seg = W / 3;
      for (let k = 0; k < 3; k++) {
        const x0 = k * seg + (s2 ? seg / 2 : 0) - (s2 ? seg : 0) * 0; const x1 = x0 + seg; const sag = 22 * U;
        x.strokeStyle = '#5b4636'; x.lineWidth = 1.5 * U; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0); x.stroke();
        for (let f = 0.06; f < 0.97; f += 0.075) {
          const fx = x0 + (x1 - x0) * f; const fyy = y0 + sag * 2 * 2 * f * (1 - f) * 1;
          x.fillStyle = flagCols[Math.round(f * 40 + k + s2) % flagCols.length]; x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1;
          x.beginPath(); x.moveTo(fx - 7 * U, fyy); x.lineTo(fx + 7 * U, fyy); x.lineTo(fx, fyy + 15 * U); x.closePath(); x.fill(); x.stroke();
        }
      }
    }
    bg.a = a;

    /* --- Penonton kiri & kanan (dua kanvas, bisa melompat bergantian) --- */
    bg.crowd = [0, 1].map((side) => {
      const w = W / 2; const h = fy - st + 4 * U; const [c, y] = mkCanvas(w, h);
      const tc = teamInfo(side).color; const shirts = [tc, tc, '#ffffff', tc, '#ffd23f', '#22c55e', '#a855f7', '#f97316', tc, '#ffffff'];
      for (let r = 0; r < 4; r++) {
        const base = (r + 1) * rowH - 6 * U; const gap = 21 * U; const off = (r % 2) * gap / 2;
        for (let px = off + 8 * U; px < w - 4 * U; px += gap * rnd(0.88, 1.12)) {
          const s = rnd(0.9, 1.08) * U; const sk = QC.pick(SKINS); const sh = QC.pick(shirts); const rr = Math.random();
          if (rr < 0.2) { // membawa bendera tim
            y.strokeStyle = '#5b4636'; y.lineWidth = 1.6 * s; y.beginPath(); y.moveTo(px + 6 * s, base - 14 * s); y.lineTo(px + 8 * s, base - 50 * s); y.stroke();
            y.fillStyle = tc; y.strokeStyle = OUT; y.lineWidth = 1.2 * s; y.beginPath(); y.moveTo(px + 8 * s, base - 50 * s); y.lineTo(px + 26 * s, base - 45 * s); y.lineTo(px + 8 * s, base - 38 * s); y.closePath(); y.fill(); y.stroke();
          } else if (rr < 0.36) { // tangan diangkat
            y.strokeStyle = sk; y.lineWidth = 3.2 * s; y.lineCap = 'round'; y.beginPath(); y.moveTo(px - 6 * s, base - 14 * s); y.lineTo(px - 11 * s, base - 34 * s); y.moveTo(px + 6 * s, base - 14 * s); y.lineTo(px + 11 * s, base - 34 * s); y.stroke();
          }
          y.fillStyle = sh; y.strokeStyle = OUT; y.lineWidth = 1.4 * s; rrect(y, px - 8 * s, base - 18 * s, 16 * s, 20 * s, 5 * s); y.fill(); y.stroke();
          y.fillStyle = sk; ell(y, px, base - 24 * s, 7 * s, 7 * s); y.fill(); y.stroke();
          y.fillStyle = QC.pick(HAIRS); y.beginPath(); y.arc(px, base - 25 * s, 7 * s, Math.PI * 1.05, Math.PI * 1.95); y.closePath(); y.fill();
          y.fillStyle = OUT; ell(y, px - 2.4 * s, base - 24 * s, 0.9 * s, 1.2 * s); y.fill(); ell(y, px + 2.4 * s, base - 24 * s, 0.9 * s, 1.2 * s); y.fill();
          if (Math.random() < 0.5) { y.strokeStyle = OUT; y.lineWidth = 1 * s; y.beginPath(); y.arc(px, base - 22 * s, 2.4 * s, 0.2, Math.PI - 0.2); y.stroke(); }
        }
      }
      return c;
    });

    /* --- B: pagar, lapangan, lintasan, garis menang, kolam lumpur --- */
    const [b, z] = mkCanvas(W, H - fy);
    z.translate(0, -fy);
    // lapangan rumput
    g = z.createLinearGradient(0, hy, 0, H); g.addColorStop(0, '#86d65f'); g.addColorStop(1, '#4ea93a');
    z.fillStyle = g; z.fillRect(0, hy, W, H - hy);
    for (let y0 = hy, k = 0, hh = 9 * U; y0 < H; y0 += hh, hh *= 1.22, k++) if (k % 2) { z.fillStyle = 'rgba(255,255,255,.07)'; z.fillRect(0, y0, W, hh); }
    // pagar papan sorak
    const words = ['SEMANGAT!', 'AYO TARIK!', 'KOMPAK!', 'SPORTIF!', 'JUARA!', 'KUAT!'];
    const cols = ['#ffd23f', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#ec4899'];
    const pw = 150 * U;
    for (let X = 0, k = 0; X < W; X += pw, k++) {
      z.fillStyle = cols[k % cols.length]; z.fillRect(X, fy, pw, hy - fy);
      z.fillStyle = 'rgba(255,255,255,.18)'; z.fillRect(X, fy, pw, 5 * U);
      z.strokeStyle = OUT; z.lineWidth = 2 * U; z.strokeRect(X, fy, pw, hy - fy);
      z.fillStyle = '#fff'; z.font = `400 ${Math.round(15 * U)}px "Lilita One", sans-serif`; z.textAlign = 'center'; z.textBaseline = 'middle';
      z.lineWidth = 3 * U; z.strokeStyle = 'rgba(35,25,74,.55)'; z.strokeText(words[k % words.length], X + pw / 2, (fy + hy) / 2 + 1); z.fillText(words[k % words.length], X + pw / 2, (fy + hy) / 2 + 1);
    }
    // spanduk tim di pagar
    [0, 1].forEach((i) => {
      const tI = teamInfo(i); const bw = 210 * U; const X = i ? W * 0.79 - bw / 2 : W * 0.21 - bw / 2; const Y = fy - 8 * U; const hh2 = hy - fy + 12 * U;
      z.fillStyle = tI.color; z.strokeStyle = OUT; z.lineWidth = 3 * U; rrect(z, X, Y, bw, hh2, 8 * U); z.fill(); z.stroke();
      z.fillStyle = 'rgba(255,255,255,.2)'; z.fillRect(X + 4 * U, Y + 3 * U, bw - 8 * U, 5 * U);
      z.font = `400 ${Math.round(18 * U)}px "Lilita One", sans-serif`; z.textAlign = 'center'; z.textBaseline = 'middle'; z.fillStyle = '#fff';
      const label = `${tI.avatar} ${String(tI.name).toUpperCase()}`; z.lineWidth = 4 * U; z.strokeStyle = 'rgba(35,25,74,.6)';
      let fs = 18 * U; while (z.measureText(label).width > bw - 16 * U && fs > 9 * U) { fs -= 1; z.font = `400 ${Math.round(fs)}px "Lilita One", sans-serif`; }
      z.strokeText(label, X + bw / 2, Y + hh2 / 2 + 1); z.fillText(label, X + bw / 2, Y + hh2 / 2 + 1);
    });
    // bayangan pagar
    z.fillStyle = 'rgba(0,0,0,.12)'; z.fillRect(0, hy, W, 8 * U);
    // rumput & bunga kecil
    for (let k = 0; k < W / (26 * U); k++) {
      const X = rnd(0, W); const Y = rnd(hy + 14 * U, gy - 36 * U); const s = U * rnd(0.7, 1.1);
      z.strokeStyle = '#3f9a30'; z.lineWidth = 2 * s; z.beginPath(); z.moveTo(X - 4 * s, Y); z.lineTo(X - 6 * s, Y - 8 * s); z.moveTo(X, Y); z.lineTo(X, Y - 10 * s); z.moveTo(X + 4 * s, Y); z.lineTo(X + 6 * s, Y - 8 * s); z.stroke();
      if (Math.random() < 0.35) { z.fillStyle = QC.pick(['#fff', '#ffd23f', '#f472b6']); ell(z, X + 8 * s, Y - 6 * s, 3 * s, 3 * s); z.fill(); }
    }
    // lintasan pasir
    const lt = gy - 30 * U; const lb = gy + 36 * U;
    g = z.createLinearGradient(0, lt, 0, lb); g.addColorStop(0, '#f0d39a'); g.addColorStop(1, '#ddb373');
    z.fillStyle = g; z.fillRect(0, lt, W, lb - lt);
    z.fillStyle = '#c99a5a'; z.fillRect(0, lt, W, 3 * U); z.fillStyle = '#b8864a'; z.fillRect(0, lb - 3 * U, W, 3 * U);
    z.fillStyle = 'rgba(150,105,55,.25)'; for (let k = 0; k < W / (9 * U); k++) { ell(z, rnd(0, W), rnd(lt + 5 * U, lb - 5 * U), rnd(1, 2.6) * U, rnd(0.6, 1.4) * U); z.fill(); }
    // garis menang (kiri = Tim Merah, kanan = Tim Biru)
    [0, 1].forEach((i) => {
      const X = cx + TEAM[i].side * D; const c2 = teamInfo(i).color;
      z.fillStyle = '#ffffff'; z.beginPath(); z.moveTo(X - 3.5 * U, lt); z.lineTo(X + 3.5 * U, lt); z.lineTo(X + 6 * U, lb); z.lineTo(X - 6 * U, lb); z.closePath(); z.fill();
      z.fillStyle = c2; for (let yy = lt + 8 * U; yy < lb - 4 * U; yy += 16 * U) { z.fillRect(X - 3 * U, yy, 6 * U, 6 * U); }
      // tiang bendera garis
      z.strokeStyle = '#5b4636'; z.lineWidth = 3 * U; z.beginPath(); z.moveTo(X, lt + 2 * U); z.lineTo(X, lt - 46 * U); z.stroke();
      z.fillStyle = c2; z.strokeStyle = OUT; z.lineWidth = 2 * U; z.beginPath(); z.moveTo(X, lt - 46 * U); z.lineTo(X - TEAM[i].side * 28 * U, lt - 38 * U); z.lineTo(X, lt - 28 * U); z.closePath(); z.fill(); z.stroke();
      z.fillStyle = '#fff'; z.font = `400 ${Math.round(11 * U)}px "Lilita One", sans-serif`; z.textAlign = 'center'; z.textBaseline = 'top';
      z.lineWidth = 3 * U; z.strokeStyle = OUT; z.textBaseline = 'bottom'; z.strokeText('GARIS MENANG', X, lt - 49 * U); z.fillText('GARIS MENANG', X, lt - 49 * U);
    });
    // kolam lumpur
    const pyy = gy + 4 * U; const rx = G.poolRx; const ry = G.poolRy;
    z.fillStyle = 'rgba(110,70,35,.45)'; for (let k = 0; k < 26; k++) { const a2 = rnd(0, 6.28); ell(z, cx + Math.cos(a2) * rx * rnd(1.02, 1.25), pyy + Math.sin(a2) * ry * rnd(1.05, 1.4), rnd(2, 6) * U, rnd(1.5, 3) * U); z.fill(); }
    z.fillStyle = '#4a2a12'; ell(z, cx, pyy + 2 * U, rx + 7 * U, ry + 6 * U); z.fill();
    g = z.createRadialGradient(cx, pyy - ry * 0.3, 4 * U, cx, pyy, rx); g.addColorStop(0, '#9c6838'); g.addColorStop(0.7, '#7a4a26'); g.addColorStop(1, '#5e3519');
    z.fillStyle = g; ell(z, cx, pyy, rx, ry); z.fill();
    z.strokeStyle = 'rgba(60,30,10,.35)'; z.lineWidth = 2 * U; ell(z, cx, pyy + 3 * U, rx * 0.72, ry * 0.6); z.stroke(); ell(z, cx - rx * 0.1, pyy + 4 * U, rx * 0.42, ry * 0.32); z.stroke();
    z.fillStyle = 'rgba(255,240,215,.22)'; ell(z, cx - rx * 0.35, pyy - ry * 0.45, rx * 0.28, ry * 0.14); z.fill(); ell(z, cx + rx * 0.4, pyy - ry * 0.2, rx * 0.12, ry * 0.08); z.fill();
    // papan "KOLAM LUMPUR"
    const sX = cx + rx * 0.62; const sY = pyy + ry + 2 * U;
    z.strokeStyle = '#5b4636'; z.lineWidth = 3 * U; z.beginPath(); z.moveTo(sX, sY + 10 * U); z.lineTo(sX, sY - 4 * U); z.stroke();
    z.fillStyle = '#fef3c7'; z.strokeStyle = OUT; z.lineWidth = 2 * U; rrect(z, sX - 34 * U, sY - 18 * U, 68 * U, 16 * U, 4 * U); z.fill(); z.stroke();
    z.fillStyle = '#7a4a26'; z.font = `400 ${Math.round(10 * U)}px "Lilita One", sans-serif`; z.textAlign = 'center'; z.textBaseline = 'middle'; z.fillText('AWAS LUMPUR!', sX, sY - 10 * U);
    bg.b = b; bg.fy = fy;
  }

  /* ------------------------------ Gambar dinamis ------------------------------ */
  function drawClouds() {
    const U = G.U; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const span = W + 300 * U; const x = ((i * span * 0.29 + gameT * 9 * U * (1 + i * 0.3)) % span) - 150 * U;
      const y = Math.max(40 * U, G.st - 120 * U) - (i % 2) * 34 * U + 10 * U; const s = (0.8 + (i % 3) * 0.25) * U;
      ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.arc(x, y, 18 * s, 0, 7); ctx.arc(x + 24 * s, y - 9 * s, 24 * s, 0, 7); ctx.arc(x + 52 * s, y, 18 * s, 0, 7); ctx.rect(x, y, 52 * s, 16 * s); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawCrowd() {
    const U = G.U;
    for (let i = 0; i < 2; i++) {
      const c = cheer[i]; const dy = -Math.abs(Math.sin(gameT * 13 + i * 1.7)) * (1.2 + 3.6 * Math.min(1.5, c)) * U;
      ctx.drawImage(bg.crowd[i], i * W / 2, G.st + dy, W / 2, bg.fy - G.st + 4 * U);
    }
  }
  function drawPoles() {
    const U = G.U;
    [[W * 0.035, 0], [W * 0.965, 1], [W * 0.36, 0], [W * 0.64, 1]].forEach(([X, i], n) => {
      const base = G.hy + 6 * U; const top = G.st - (n < 2 ? 60 : 8) * U; const col = teamInfo(i).color; const dir = i ? -1 : 1;
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4 * U; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X, base); ctx.lineTo(X, top); ctx.stroke();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(X, top - 3 * U, 4 * U, 0, 7); ctx.fill();
      const fw = (n < 2 ? 54 : 40) * U; const fh = (n < 2 ? 34 : 26) * U; const amp = (3 + cheer[i] * 3) * U;
      ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6 * U; ctx.beginPath(); ctx.moveTo(X, top);
      for (let k = 0; k <= 6; k++) { const fx = X + dir * fw * k / 6; ctx.lineTo(fx, top + Math.sin(gameT * 6 + k * 0.9 + n) * amp * k / 6); }
      for (let k = 6; k >= 0; k--) { const fx = X + dir * fw * k / 6; ctx.lineTo(fx, top + fh + Math.sin(gameT * 6 + k * 0.9 + n) * amp * k / 6); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const fx = X + dir * fw * k / 6; ctx.lineTo(fx, top + fh * 0.42 + Math.sin(gameT * 6 + k * 0.9 + n) * amp * k / 6); }
      for (let k = 6; k >= 0; k--) { const fx = X + dir * fw * k / 6; ctx.lineTo(fx, top + fh * 0.6 + Math.sin(gameT * 6 + k * 0.9 + n) * amp * k / 6); }
      ctx.closePath(); ctx.fill();
    });
  }
  function drawMudFx() {
    const { cx, gy, U } = G; const py = gy + 4 * U; const rx = G.poolRx; const ry = G.poolRy;
    ctx.fillStyle = 'rgba(255,235,200,.13)'; ctx.beginPath(); ctx.ellipse(cx + Math.sin(gameT * 0.7) * rx * 0.3, py - ry * 0.35, rx * 0.32, ry * 0.15, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 1.6 * U;
    for (let i = 0; i < 6; i++) {
      const ph = (gameT * 0.5 + i * 0.41) % 1; const bx = cx + Math.sin(i * 12.9) * rx * 0.68; const by = py + Math.cos(i * 7.3) * ry * 0.5;
      if (ph < 0.8) { const r = (1.5 + ph * 5) * U; ctx.fillStyle = 'rgba(130,85,45,.9)'; ctx.strokeStyle = 'rgba(255,225,180,.55)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); ctx.stroke(); }
      else { const r = (6 + (ph - 0.8) * 60) * U; ctx.strokeStyle = `rgba(60,30,10,${(1 - ph) * 2.5})`; ctx.beginPath(); ctx.ellipse(bx, by, r, r * 0.35, 0, 0, 7); ctx.stroke(); }
    }
  }

  // Wasit (tampak depan) di tengah belakang kolam
  function drawRef() {
    const U = G.U; const k = U * 0.82; const x = G.cx; const y = G.gy - 31 * U; const c = ctx;
    c.save(); c.translate(x, y); c.scale(k, k);
    c.fillStyle = 'rgba(40,20,0,.2)'; c.beginPath(); c.ellipse(0, 0, 18, 4, 0, 0, 7); c.fill();
    c.lineCap = 'round'; c.lineJoin = 'round';
    const limb = (pts, w, col) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.strokeStyle = OUT; c.lineWidth = w + 4; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
    limb([[-6, -32], [-7, -3]], 7, '#e7b07c'); limb([[6, -32], [7, -3]], 7, '#e7b07c');
    c.fillStyle = '#1f2937'; c.strokeStyle = OUT; c.lineWidth = 2; [[-8, -2], [8, -2]].forEach(([fx, fy]) => { c.beginPath(); c.ellipse(fx, fy, 6, 3.5, 0, 0, 7); c.fill(); c.stroke(); });
    c.fillStyle = '#1f2937'; rrect(c, -12, -42, 24, 13, 4); c.fill(); c.stroke();
    // lengan sesuai pose
    let L1 = [[-13, -66], [-17, -54], [-17, -42]]; let R1 = [[13, -66], [17, -54], [17, -42]];
    const sw = Math.sin(gameT * 10) * 4;
    if (refPose === 'pull' || refPose === 'ready') { L1 = [[-13, -66], [-28, -68 + sw], [-42, -70 + sw]]; R1 = [[13, -66], [28, -68 - sw], [42, -70 - sw]]; }
    else if (refPose === 'stop') { L1 = [[-13, -66], [-14, -76], [-4, -80]]; R1 = [[13, -66], [20, -84], [22, -102]]; }
    else if (refPose === 'win' && winner >= 0) { const s = T[winner].side; L1 = [[-13, -66], [-17, -54], [-17, -42]]; R1 = [[13 * s, -66], [27 * s, -82], [40 * s, -98]]; if (s < 0) { const tmp = L1; L1 = R1; R1 = tmp.map(([a, b]) => [-a, b]); } }
    limb(L1, 6, '#e7b07c'); limb(R1, 6, '#e7b07c');
    c.save(); rrect(c, -14, -72, 28, 32, 8); c.clip(); c.fillStyle = '#fff'; c.fillRect(-14, -72, 28, 32); c.fillStyle = '#1f2937'; for (let s = -10; s <= 10; s += 7) c.fillRect(s - 1.8, -72, 3.6, 32); c.restore();
    c.strokeStyle = OUT; c.lineWidth = 3; rrect(c, -14, -72, 28, 32, 8); c.stroke();
    c.fillStyle = '#e7b07c'; c.beginPath(); c.arc(0, -84, 11, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#1f2937'; c.beginPath(); c.arc(0, -86, 11.5, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.fillRect(-14, -87, 28, 3.5);
    c.fillStyle = OUT; c.beginPath(); c.arc(-4, -83, 1.6, 0, 7); c.arc(4, -83, 1.6, 0, 7); c.fill();
    if (refPose === 'stop' || refPose === 'ready' || refPose === 'pull') { c.fillStyle = '#cbd5e1'; c.beginPath(); c.ellipse(1, -77, 4.5, 3, 0, 0, 7); c.fill(); c.stroke(); }
    else { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(0, -79, 3.5, 0.3, Math.PI - 0.3); c.stroke(); }
    c.restore();
  }

  // Anak penarik tali (tampak samping, menghadap ke tengah). dir=+1 menghadap kanan.
  function ik(ax, ay, bx, by, l1, l2, bend) {
    const dx = bx - ax; const dy = by - ay; const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const a = Math.atan2(dy, dx); const cs = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const ang = a + bend * Math.acos(clamp(cs, -1, 1)); return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
  }
  function drawKid(t, lk, ps, fists) {
    const c = ctx; const dir = -t.side; const k = G.U * 1.15 * lk.sc; const yb = ps.y - ps.lift;
    c.save(); c.translate(ps.x, yb); if (ps.rot) c.rotate(ps.rot * dir); c.scale(dir * k, k);
    const mud = ps.mud > 0.5;
    const SK = mud ? '#7a4a2a' : lk.skin; const SH = mud ? '#6b4022' : t.color; const PN = mud ? '#4f2e17' : t.shorts; const HR = mud ? '#3d2412' : lk.hair; const TC = mud ? '#6b4022' : t.color;
    const lean = ps.lean; const cr = ps.crouch; const st = ps.step; const sa = ps.stepAmp;
    const fF = [20 + Math.sin(st) * 7 * sa + ps.fwd, -Math.max(0, Math.sin(st)) * 6 * sa];
    const fB = [-16 + Math.sin(st + Math.PI) * 7 * sa + ps.fwd, -Math.max(0, Math.sin(st + Math.PI)) * 6 * sa];
    const hip = [-6 - Math.sin(lean) * 10 + ps.fwd, -46 + cr * 12];
    const sh = [hip[0] - Math.sin(lean) * 33, hip[1] - Math.cos(lean) * 33];
    const hd = [sh[0] - Math.sin(lean) * 14 + 3, sh[1] - Math.cos(lean) * 14 - 1];
    let hF; let hB;
    if (ps.hold) {
      const hy = (ps.ropeY - yb) / k; const dy = hy - sh[1]; const reach = Math.sqrt(Math.max(0, 35 * 35 - dy * dy));
      hF = [sh[0] + reach, hy]; hB = [hF[0] - 13, hy];
    } else if (ps.armsUp) { hF = [sh[0] + 10, sh[1] - 32]; hB = [sh[0] - 6, sh[1] - 30]; }
    else { hF = [sh[0] + 22, sh[1] - 4]; hB = [sh[0] - 16, sh[1] - 8]; }
    c.lineCap = 'round'; c.lineJoin = 'round';
    const limb = (pts, w, col) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.strokeStyle = OUT; c.lineWidth = w + 4.5; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
    const leg = (foot) => {
      const kn = ik(hip[0], hip[1], foot[0], foot[1], 26, 26, -1);
      limb([hip, kn, foot], 9.5, SK);
      c.strokeStyle = PN; c.lineWidth = 14; c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(lerp(hip[0], kn[0], 0.55), lerp(hip[1], kn[1], 0.55)); c.stroke();
      c.fillStyle = mud ? '#4f2e17' : '#1f2937'; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.ellipse(foot[0] + 4, foot[1] - 3.5, 8.5, 5, 0, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = mud ? '#8a6a4a' : '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(foot[0] - 3, foot[1] - 0.8); c.lineTo(foot[0] + 11, foot[1] - 0.8); c.stroke();
    };
    const arm = (hand) => { const el = ik(sh[0], sh[1], hand[0], hand[1], 18, 18, ps.armsUp ? -1 : 1); limb([sh, el, hand], 8, SK); c.strokeStyle = SH; c.lineWidth = 11; c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(lerp(sh[0], el[0], 0.5), lerp(sh[1], el[1], 0.5)); c.stroke(); };
    // bayangan
    leg(fB); arm(hB);
    // badan + celana
    limb([hip, sh], 18, SH);
    c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 6; c.beginPath(); c.moveTo(hip[0] - Math.cos(lean) * 6, hip[1] + Math.sin(lean) * 6 - 3); c.lineTo(sh[0] - Math.cos(lean) * 6, sh[1] + Math.sin(lean) * 6 + 3); c.stroke();
    c.strokeStyle = mud ? '#8a6a4a' : '#ffffff'; c.lineWidth = 3; c.beginPath(); c.moveTo(lerp(hip[0], sh[0], 0.25) + 5, lerp(hip[1], sh[1], 0.25)); c.lineTo(lerp(hip[0], sh[0], 0.85) + 5, lerp(hip[1], sh[1], 0.85)); c.stroke();
    c.fillStyle = PN; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.ellipse(hip[0], hip[1] + 1, 10.5, 8, -lean * 0.5, 0, 7); c.fill(); c.stroke();
    leg(fF);
    // kepala
    const r = 13.5; const [hx, hy] = hd;
    const w1 = Math.sin(gameT * 14 + lk.ph) * 3;
    c.strokeStyle = TC; c.lineWidth = 3.5; c.beginPath(); c.moveTo(hx - r * 0.9, hy - r * 0.35); c.quadraticCurveTo(hx - r * 1.5, hy - r * 0.55 + w1, hx - r * 2.1, hy - r * 0.15 + w1 * 1.6); c.moveTo(hx - r * 0.9, hy - r * 0.3); c.quadraticCurveTo(hx - r * 1.4, hy - r * 0.1 - w1, hx - r * 1.9, hy + r * 0.35 - w1); c.stroke();
    c.fillStyle = SK; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, r, 0, 7); c.fill(); c.stroke();
    c.fillStyle = HR; c.lineWidth = 2.5; c.beginPath();
    if (lk.style === 1) {
      c.moveTo(hx + r * 0.75, hy - r * 0.62); c.quadraticCurveTo(hx + r * 0.1, hy - r * 1.4, hx - r * 0.85, hy - r * 0.85);
      c.quadraticCurveTo(hx - r * 1.4, hy - r * 0.1, hx - r * 1.0, hy + r * 0.9); c.lineTo(hx - r * 0.35, hy + r * 0.72); c.quadraticCurveTo(hx - r * 0.5, hy - r * 0.1, hx + r * 0.75, hy - r * 0.62);
    } else {
      c.moveTo(hx + r * 0.88, hy - r * 0.48); c.quadraticCurveTo(hx + r * 0.3, hy - r * 1.4, hx - r * 0.7, hy - r * 0.98);
      c.quadraticCurveTo(hx - r * 1.18, hy - r * 0.5, hx - r * 0.95, hy + r * 0.28); c.quadraticCurveTo(hx - r * 0.3, hy - r * 0.35, hx + r * 0.88, hy - r * 0.48);
    }
    c.fill(); c.stroke();
    if (lk.style === 0) { c.beginPath(); c.moveTo(hx - r * 0.5, hy - r * 0.95); c.lineTo(hx - r * 0.35, hy - r * 1.45); c.lineTo(hx - r * 0.05, hy - r * 1.05); c.lineTo(hx + r * 0.15, hy - r * 1.42); c.lineTo(hx + r * 0.4, hy - r * 0.95); c.closePath(); c.fill(); c.stroke(); }
    if (lk.style === 2) { const bb = Math.sin(gameT * 9 + lk.ph) * 2; c.beginPath(); c.arc(hx - r * 1.15, hy - r * 0.3 + bb, 6, 0, 7); c.fill(); c.stroke(); c.fillStyle = TC; c.beginPath(); c.arc(hx - r * 0.85, hy - r * 0.38, 2.6, 0, 7); c.fill(); }
    if (lk.style === 3) { c.beginPath(); c.arc(hx - r * 0.5, hy - r * 0.95, 5, 0, 7); c.arc(hx, hy - r * 1.1, 5.5, 0, 7); c.arc(hx + r * 0.45, hy - r * 0.9, 4.5, 0, 7); c.fill(); }
    // ikat kepala
    c.strokeStyle = OUT; c.lineWidth = 6.5; c.beginPath(); c.moveTo(hx - r * 0.98, hy - r * 0.3); c.lineTo(hx + r * 0.94, hy - r * 0.52); c.stroke();
    c.strokeStyle = mud ? '#8a6a4a' : '#ffffff'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = TC; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx - r * 0.9, hy - r * 0.31); c.lineTo(hx + r * 0.9, hy - r * 0.52); c.stroke();
    c.fillStyle = SK; c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.arc(hx - r * 0.22, hy + r * 0.15, r * 0.27, 0, 7); c.fill(); c.stroke();
    // wajah
    const ex = hx + r * 0.45; const ey = hy - r * 0.05; const face = ps.face;
    c.fillStyle = 'rgba(255,110,110,.35)'; c.beginPath(); c.arc(hx + r * 0.25, hy + r * 0.42, 3.2, 0, 7); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2.2;
    if (face === 'happy') { c.beginPath(); c.arc(ex, ey + 2, 3.4, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    else if (face === 'strain') { c.lineWidth = 2.6; c.beginPath(); c.moveTo(ex - 3.5, ey - 1); c.lineTo(ex + 3, ey + 1.2); c.stroke(); }
    else { c.fillStyle = '#fff'; c.lineWidth = 1.8; c.beginPath(); c.ellipse(ex, ey, face === 'shock' ? 4.2 : 3.4, face === 'shock' ? 5 : 4.1, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = OUT; c.beginPath(); c.arc(ex + 1.3, ey + 0.4, face === 'shock' ? 1.5 : 2, 0, 7); c.fill(); }
    c.strokeStyle = HR; c.lineWidth = 2.8; c.beginPath();
    if (face === 'strain') { c.moveTo(ex - 4.5, ey - 7.5); c.lineTo(ex + 4.5, ey - 4); } else if (face === 'shock') { c.moveTo(ex - 4, ey - 9); c.lineTo(ex + 4, ey - 9.5); } else { c.moveTo(ex - 4, ey - 7); c.lineTo(ex + 4, ey - 7); }
    c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(hx + r * 0.98, hy + r * 0.12, 2.2, -1.2, 1.4); c.stroke();
    const mx = hx + r * 0.58; const my = hy + r * 0.5;
    if (face === 'strain') { c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 1.8; rrect(c, mx - 4.5, my - 2.6, 8.5, 5.2, 1.5); c.fill(); c.stroke(); c.beginPath(); c.moveTo(mx - 0.4, my - 2.6); c.lineTo(mx - 0.4, my + 2.6); c.moveTo(mx - 4.5, my); c.lineTo(mx + 4, my); c.stroke(); }
    else if (face === 'happy') { c.fillStyle = '#7a1f1f'; c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(mx - 5, my - 1.5); c.quadraticCurveTo(mx, my + 7, mx + 4.5, my - 2); c.closePath(); c.fill(); c.stroke(); }
    else if (face === 'shock') { c.fillStyle = '#7a1f1f'; c.beginPath(); c.ellipse(mx, my + 0.5, 2.6, 3.4, 0, 0, 7); c.fill(); c.stroke(); }
    else { c.beginPath(); c.moveTo(mx - 4, my); c.quadraticCurveTo(mx, my + 2, mx + 3.5, my - 0.8); c.stroke(); }
    arm(hF);
    c.restore();
    if (ps.hold) {
      [hF, hB].forEach((hh) => fists.push({ x: ps.x + dir * k * hh[0], y: yb + k * hh[1], r: 5.6 * k, col: SK }));
    } else if (ps.armsUp) {
      // kepalan tangan saat bersorak
      [hF, hB].forEach((hh) => fists.push({ x: ps.x + dir * k * hh[0], y: yb + k * hh[1], r: 5.6 * k, col: SK }));
    }
  }
  function kidPose(t, j, ropeY) {
    const U = G.U; const lk = t.kids[j];
    let x = kidX(t, j); let y = G.gy;
    let lean = 0.38 + t.strain * 0.42 + Math.sin(gameT * 2 + lk.ph) * 0.02;
    let crouch = t.strain * 0.35; let lift = 0; let fwd = 0; let rot = 0; let mud = 0; let hold = true; let armsUp = 0;
    let face = t.strain > 0.62 ? 'strain' : 'calm';
    const gain = rvPx * t.side;
    if (gain < -8 * U) { lean -= clamp(-gain / (90 * U), 0, 0.45); if (gain < -40 * U) face = 'shock'; }
    let stepAmp = clamp(Math.abs(rvPx) / (50 * U), 0, 1);
    if (t.slipT > 0) {
      const f = 1 - t.slipT / 1.3; const s = Math.sin(Math.PI * Math.min(1, f * 1.2));
      lean = lerp(lean, j === 0 ? -0.55 : -0.25, s); crouch = lerp(crouch, j === 0 ? 1.5 : 0.9, s); fwd = s * 10; face = 'shock'; x -= t.side * s * 10 * U; stepAmp = Math.max(stepAmp, s);
    }
    if (t.hopT > 0 && phase !== 'win') { lift = Math.abs(Math.sin(t.hopT * 9 + j)) * 9 * U * Math.min(1, t.hopT); face = 'happy'; }
    if (phase === 'win' || (phase === 'over' && winner >= 0)) {
      if (t.i === winner) { lift = Math.abs(Math.sin(gameT * 9 + j * 1.3)) * 12 * U; face = 'happy'; lean = 0.5; if (j === G.n - 1) { hold = false; armsUp = 1; } }
      else {
        const pt = phase === 'over' ? 9 : phaseT; const f = clamp((pt - 0.45 - j * 0.16) / 0.5, 0, 1);
        if (f <= 0) { lean = -0.3; face = 'shock'; stepAmp = 1; }
        else {
          const x0 = lk.fx0 == null ? x : lk.fx0; const tx = G.cx + t.side * G.D * (-0.45 + 0.32 * j);
          x = lerp(x0, tx, ease(f)); lift = Math.sin(Math.PI * Math.min(1, f)) * 34 * U; y = G.gy + 10 * U * ease(f);
          rot = ease(f) * 1.35 + (f >= 1 ? Math.sin(gameT * 9 + j) * 0.06 : 0); hold = false; face = 'shock'; lean = 0.1;
          if (f >= 1) mud = 1;
        }
      }
    }
    return { x, y, lean, crouch, lift, fwd, rot, mud, hold, armsUp, face, step: t.stepPh + lk.ph, stepAmp, ropeY: ropeY(x - t.side * 0) };
  }

  let ropeAmp = 0; let ropeXA = 0; let ropeXB = 1; let dropF = 0;
  function ropeY(x) {
    const u = clamp((x - ropeXA) / (ropeXB - ropeXA), 0, 1);
    let y = G.ry + ropeAmp * Math.sin(x * 0.045 / G.U + gameT * 38) * Math.sin(Math.PI * u);
    if (dropF > 0 && winner >= 0) { const w = T[winner]; const wf = kidX(w, 0); const d = (x - wf) * -w.side; if (d > 0) y += dropF * (G.gy - G.ry + 6 * G.U) * clamp(d / (70 * G.U), 0, 1); }
    return y;
  }
  function drawRope() {
    const U = G.U; const step = 12 * U; const c = ctx;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); for (let x = ropeXA; x <= ropeXB + 0.1; x += step) { const y = ropeY(x); if (x === ropeXA) c.moveTo(x, y); else c.lineTo(x, y); }
    c.strokeStyle = '#4a2a10'; c.lineWidth = 10.5 * U; c.stroke();
    c.strokeStyle = '#cf9a52'; c.lineWidth = 7 * U; c.stroke();
    c.strokeStyle = '#8a5a26'; c.lineWidth = 1.8 * U; c.beginPath();
    const gap = 8 * U; const ph = (((G.cx + offPx()) % gap) + gap) % gap;
    for (let x = ropeXA + ph; x < ropeXB; x += gap) { const y = ropeY(x); c.moveTo(x - 2.4 * U, y - 3 * U); c.lineTo(x + 2.4 * U, y + 3 * U); }
    c.stroke();
    c.strokeStyle = 'rgba(255,236,190,.6)'; c.lineWidth = 1.6 * U; c.beginPath();
    for (let x = ropeXA; x <= ropeXB + 0.1; x += step) { const y = ropeY(x) - 2.2 * U; if (x === ropeXA) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
    // rumbai ujung tali
    [ropeXA, ropeXB].forEach((x, i) => { const y = ropeY(x); const d = i ? 1 : -1; c.strokeStyle = '#cf9a52'; c.lineWidth = 2 * U; c.beginPath(); for (let k = -2; k <= 2; k++) { c.moveTo(x, y); c.lineTo(x + d * 10 * U, y + k * 3 * U + Math.sin(gameT * 5 + k) * 2 * U); } c.stroke(); });
  }
  function drawRibbon(x) {
    const U = G.U; const y = ropeY(x); const c = ctx; const wv = Math.sin(gameT * 8) * 3 * U;
    c.fillStyle = 'rgba(40,20,0,.25)'; c.beginPath(); c.ellipse(x, G.gy + 4 * U, 12 * U, 4 * U, 0, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2 * U; c.lineJoin = 'round';
    c.fillStyle = '#dc2626';
    c.beginPath(); c.moveTo(x - 2 * U, y + 2 * U); c.lineTo(x - 9 * U + wv, y + 30 * U); c.lineTo(x - 3 * U + wv, y + 27 * U); c.lineTo(x + 1 * U, y + 3 * U); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x + 2 * U, y + 2 * U); c.lineTo(x + 10 * U - wv, y + 28 * U); c.lineTo(x + 4 * U - wv, y + 26 * U); c.lineTo(x - 1 * U, y + 3 * U); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 15 * U, y - 11 * U); c.lineTo(x - 15 * U, y + 9 * U); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 15 * U, y - 11 * U); c.lineTo(x + 15 * U, y + 9 * U); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 1.6 * U; c.beginPath(); c.arc(x, y, 4.5 * U, 0, 7); c.fill(); c.stroke();
    // penanda segitiga di atas pita (mudah dilihat dari jauh)
    const ty = y - 22 * U - Math.abs(Math.sin(gameT * 4)) * 4 * U;
    c.fillStyle = '#ffd23f'; c.strokeStyle = OUT; c.lineWidth = 2 * U; c.beginPath(); c.moveTo(x - 7 * U, ty - 9 * U); c.lineTo(x + 7 * U, ty - 9 * U); c.lineTo(x, ty); c.closePath(); c.fill(); c.stroke();
  }
  function drawTeams() {
    const U = G.U; const fists = [];
    if (!T.length) return;
    const n = G.n; const off = offPx();
    ropeXA = kidX(T[0], n - 1, off) - 64 * U; ropeXB = kidX(T[1], n - 1, off) + 64 * U;
    const tension = clamp((T[0].strain + T[1].strain) / 2, 0, 1);
    ropeAmp = (phase === 'pull' ? 0.5 + tension * 1.8 : 0.25) * U;
    dropF = phase === 'win' ? clamp((phaseT - 0.45) / 0.4, 0, 1) : phase === 'over' && winner >= 0 ? 1 : 0;
    // bayangan
    ctx.fillStyle = 'rgba(40,20,0,.2)';
    T.forEach((t) => { for (let j = 0; j < n; j++) { const x = kidX(t, j, off); ctx.beginPath(); ctx.ellipse(x, G.gy + 2 * U, 27 * U, 5.5 * U, 0, 0, 7); ctx.fill(); } });
    const poses = T.map((t) => { const a = []; for (let j = n - 1; j >= 0; j--) a.push([j, kidPose(t, j, ropeY)]); return a; });
    // anak yang tercebur digambar di bawah tali, lalu permukaan lumpur menutup separuh badan
    T.forEach((t, i) => poses[i].forEach(([j, ps]) => drawKid(t, t.kids[j], ps, fists)));
    T.forEach((t, i) => poses[i].forEach(([j, ps]) => {
      if (ps.mud) { ctx.fillStyle = '#6e4122'; ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.ellipse(ps.x, G.gy + 9 * U, 27 * U, 8 * U, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,235,200,.25)'; ctx.beginPath(); ctx.ellipse(ps.x - 8 * U, G.gy + 5 * U, 12 * U, 3 * U, 0, 0, 7); ctx.fill(); }
      else if (Math.abs(ps.x - G.cx) < G.poolRx * 0.95 && ps.hold) { // kaki masuk lumpur saat terseret
        ctx.fillStyle = '#6e4122'; ctx.beginPath(); ctx.ellipse(ps.x, G.gy + 1 * U, 22 * U, 6 * U, 0, 0, 7); ctx.fill();
        if (Math.random() < 0.08) mudSplash(ps.x, G.gy, 2, 0.35);
      }
    }));
    drawRope();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.2 * U;
    for (const f of fists) { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); ctx.stroke(); }
    drawRibbon(G.cx + off);
  }
  function drawParts() {
    const c = ctx; const U = G.U;
    for (const p of parts) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.k === 'dust') { c.fillStyle = `rgba(222,190,140,${0.6 * a})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
      else if (p.k === 'sweat') { c.fillStyle = `rgba(150,215,255,${a})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.moveTo(p.x - p.r * 0.9, p.y - p.r * 0.3); c.lineTo(p.x, p.y - p.r * 2.6); c.lineTo(p.x + p.r * 0.9, p.y - p.r * 0.3); c.fill(); }
      else if (p.k === 'mud') { c.fillStyle = '#5b3519'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
      else if (p.k === 'splat') { c.fillStyle = `rgba(91,53,25,${a})`; c.beginPath(); c.ellipse(p.x, p.y, p.r * 1.6, p.r * 0.5, 0, 0, 7); c.fill(); }
      else if (p.k === 'star') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = a; c.fillStyle = p.c; c.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? p.r * 0.35 : p.r; const an = i * Math.PI / 4; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
        c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1;
      }
    }
    void U;
  }
  function drawTexts() {
    const c = ctx; const U = G.U; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const t of texts) {
      const age = t.max - t.life; const a = clamp(t.life / Math.min(0.35, t.max), 0, 1);
      c.globalAlpha = a;
      if (t.k === 'big') {
        const s = 1 + 0.7 * Math.max(0, 1 - age / 0.16); const fs = t.size * U * s;
        c.font = `400 ${Math.round(fs)}px "Lilita One", sans-serif`; c.lineWidth = fs * 0.16; c.strokeStyle = '#23194a';
        c.strokeText(t.txt, t.x, t.y); c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y);
      } else if (t.k === 'bubble' || t.k === 'ref') {
        const fs = t.size * U; c.font = `400 ${Math.round(fs)}px "Lilita One", sans-serif`; const w = c.measureText(t.txt).width + 14 * U; const y = t.y - age * 14 * U;
        c.fillStyle = t.k === 'ref' ? '#ffd23f' : '#fff'; c.strokeStyle = '#23194a'; c.lineWidth = 2.5 * U; rrect(c, t.x - w / 2, y - fs * 0.75, w, fs * 1.5, 8 * U); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(t.x - 5 * U, y + fs * 0.74); c.lineTo(t.x, y + fs * 1.2); c.lineTo(t.x + 5 * U, y + fs * 0.74); c.fill(); c.stroke();
        c.fillStyle = t.k === 'ref' ? '#23194a' : t.col; c.fillText(t.txt, t.x, y + 1);
      } else {
        const fs = t.size * U * (age < 0.15 ? 1 + (0.15 - age) * 3 : 1); const y = t.y - age * 40 * U;
        c.font = `400 ${Math.round(fs)}px "Lilita One", sans-serif`; c.lineWidth = fs * 0.2; c.strokeStyle = '#23194a';
        c.strokeText(t.txt, t.x, y); c.fillStyle = t.col; c.fillText(t.txt, t.x, y);
      }
    }
    c.globalAlpha = 1;
  }
  function drawPullBars() {
    if (phase !== 'pull' && phase !== 'settle') return;
    T.forEach((t, i) => { const v = clamp(t.F / (t.F + 3), 0, 1); const el = $('pfill' + i); const s = v.toFixed(2); if (el.dataset.v !== s) { el.dataset.v = s; el.style.transform = `scaleX(${s})`; } });
  }

  function draw() {
    buildBg();
    const U = G.U;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let sx = 0; let sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake * 16 * U; sy = (Math.random() - 0.5) * shake * 10 * U; }
    if (phase === 'pull') { const tn = (T[0].strain + T[1].strain) / 2; sx += Math.sin(gameT * 31) * tn * 1.4 * U; sy += Math.cos(gameT * 27) * tn * 0.8 * U; }
    ctx.fillStyle = '#4ea93a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(bg.a, 0, 0, W, bg.fy + 2);
    drawClouds();
    drawCrowd();
    ctx.drawImage(bg.b, 0, bg.fy, W, H - bg.fy);
    drawPoles();
    drawMudFx();
    drawRef();
    drawTeams();
    drawParts();
    drawTexts();
    ctx.restore();
    drawPullBars();
  }

  /* ------------------------------ Loop ------------------------------ */
  let last = performance.now();
  const perf = { ms: 0, sum: 0, n: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const busy = QC.isBusy();
    if (busy || phase === 'over') { if (stillFrames++ > 2) return; } else stillFrames = 0; // layar setup/pemenang/modal: berhenti menggambar
    try {
      const t0 = performance.now();
      if (!busy && G) tick(dt);
      if (G) draw();
      const el = performance.now() - t0; perf.ms += (el - perf.ms) * 0.05; perf.sum += el; perf.n++;
    } catch (err) { console.error(err); }
  }
  addEventListener('resize', () => { layout(); });
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); });
  setTimeout(() => { bg.key = ''; stillFrames = 0; }, 1500);
  requestAnimationFrame(frame);

  /* ------------------------------ Hook debug untuk pengujian ------------------------------ */
  window.__TT = {
    get phase() { return phase; }, get round() { return round; }, get pos() { return pos; }, get L() { return L; }, get q() { return q; }, get keys() { return keys.slice(); },
    get teams() { return T.map((t) => ({ name: t.name, correct: t.correct, wrong: t.wrong, combo: t.combo, power: t.power, taps: t.totalTaps, sync: t.sync, spirit: t.spirit, locked: t.locked, bot: t.bot })); },
    get ms() { return perf.ms; }, get avgMs() { return perf.n ? perf.sum / perf.n : 0; }, resetPerf() { perf.sum = 0; perf.n = 0; },
    get winner() { return winner; }, get S() { return { ...S }; }, get parts() { return parts.length; },
    start: () => begin(), answer: (i, k) => answer(i, k, 'test'), tap: (i) => tap(i, 'test'), next: () => afterReveal()
  };

  T = [mkTeam({ name: 'Tim Merah', avatar: '🔥' }, 0), mkTeam({ name: 'Tim Biru', avatar: '🌊' }, 1)];
  openSetup();
})();
