/* ==========================================================================
   Rebut Wilayah — kuis PEREBUTAN PULAU bergiliran (2–4 regu, atau 1 regu
   melawan Pasukan Kabut).
   - Peta kepulauan fiktif dari petak heksagon (3–5 pulau, ±30–45 petak)
     dibangkitkan acak tiap permainan; jembatan & jalur laut menghubungkan pulau.
   - Tiap regu mulai dari IBU KOTA di sudut peta. Giliran: ketuk petak yang
     BERSEBELAHAN dengan wilayahmu.
       • Petak netral  -> 1 soal (gunung 2 soal). Benar = petak direbut.
       • Petak lawan   -> SERANGAN: penyerang menjawab (berbenteng: 2× benar),
                          lalu regu bertahan dapat soal TANGKIS!
                          Benar = BERTAHAN, salah = wilayah direbut.
       • Bangun Benteng (B) -> 1 soal benar = petak sendiri diperkuat.
   - Petak spesial: Tambang Emas (+poin tiap ronde), Mercusuar (giliran ekstra),
     Gunung (benteng alami), Pulau Harta (poin ganda), Ibu Kota (bonus besar).
   - Mode Damai: tanpa serangan (hanya petak netral).
   Grafis 100% kode (Canvas 2D). Lapisan statis di-cache ke kanvas cadangan;
   loop animasi hanya berjalan saat permainan aktif (diperlambat saat diam).
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const backOut = (t) => { t = clamp(t, 0, 1) - 1; return 1 + 2.70158 * t * t * t + 1.70158 * t * t; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const SQ3 = Math.sqrt(3); const TAU = Math.PI * 2;
  function seeded(seed) { let s = Math.abs(seed | 0) % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; }
  function shade(h, f) { let [r, g, b] = hexRGB(h); if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }

  QC.init({ gameId: 'rebut-wilayah', title: 'Rebut Wilayah', avatars: ['🦁', '🦅', '🐯', '🐬', '🐘', '🦊', '🐉', '🦉'], colors: ['#ef4444', '#3b82f6', '#f59e0b', '#a855f7'] });

  /* ------------------------------ Konstanta ------------------------------ */
  const KABUT = { name: 'Pasukan Kabut', avatar: '☁️', color: '#8792a8', ai: true };
  const TT = {
    biasa: { name: 'Petak', icon: '⬢', val: 10 },
    ibukota: { name: 'Ibu Kota', icon: '🏰', val: 30 },
    tambang: { name: 'Tambang Emas', icon: '⛏️', val: 15 },
    mercu: { name: 'Mercusuar', icon: '🗼', val: 15 },
    gunung: { name: 'Gunung', icon: '⛰️', val: 20 },
    harta: { name: 'Pulau Harta', icon: '⭐', val: 20 }
  };
  const CAP_HOLD = 50; const CAP_TAKE = 100; const MINE_BONUS = 10; const MAX_FORT = 3; const KABUT_RATE = 0.6; const KABUT_DEF = 0.35;
  const SIZES = {
    kecil: { name: 'Kecil', cols: 11, rows: 7, islands: 3, land: 30, spec: { tambang: 2, mercu: 1, gunung: 2, harta: 1 } },
    sedang: { name: 'Sedang', cols: 13, rows: 8, islands: 4, land: 38, spec: { tambang: 2, mercu: 2, gunung: 2, harta: 1 } },
    besar: { name: 'Besar', cols: 15, rows: 9, islands: 5, land: 45, spec: { tambang: 3, mercu: 2, gunung: 3, harta: 2 } }
  };
  // posisi pusat pulau (pecahan kolom/baris), bagian petak, peregangan vertikal (<1 = lebih tinggi)
  const ISL = {
    3: [[0.15, 0.5, 0.42, 0.55], [0.83, 0.17, 0.29, 1], [0.83, 0.83, 0.29, 1]],
    4: [[0.14, 0.2, 0.25, 1], [0.86, 0.2, 0.25, 1], [0.14, 0.8, 0.25, 1], [0.86, 0.8, 0.25, 1]],
    5: [[0.12, 0.2, 0.21, 1], [0.88, 0.2, 0.21, 1], [0.12, 0.8, 0.21, 1], [0.88, 0.8, 0.21, 1], [0.5, 0.5, 0.16, 1]]
  };
  const ROLE = { rebut: 'rebut', serang: 'serang', tangkis: 'tangkis', bangun: 'bangun' };

  const RULES = `<ul>
    <li>🗺️ <b>2–4 regu</b> berebut pulau-pulau di peta kepulauan. Setiap regu mulai dari <b>Ibu Kota 🏰</b> di sudut peta. Main <b>1 regu</b> = melawan <b>Pasukan Kabut ☁️</b>, regu komputer yang merebut petak netral sendiri.</li>
    <li>👆 Pada giliranmu, <b>ketuk 1 petak yang bersebelahan</b> dengan wilayahmu (petak yang berkilau). <b>Jembatan</b> dan <b>jalur laut ⛵</b> ikut menghubungkan pulau. Bila wilayahmu habis/terkepung, kamu boleh <b>mendarat</b> di petak netral mana pun.</li>
    <li>🚩 <b>Petak netral</b>: jawab 1 soal dengan benar → petak jadi milikmu. Salah → giliran lewat. ⛰️ Gunung netral butuh <b>2 jawaban benar</b> berturut-turut.</li>
    <li>⚔️ <b>Petak lawan = SERANGAN</b>: penyerang menjawab lebih dulu. Salah → serangan gagal. Benar → regu bertahan mendapat soal <b>TANGKIS!</b>: benar = <b>BERTAHAN</b>, salah = <b>wilayah direbut</b>. Petak berbenteng 🛡️ / gunung ⛰️: penyerang harus benar <b>2× berturut-turut</b> sebelum lawan menangkis.</li>
    <li>🧱 <b>Bangun Benteng</b> (tombol <b>B</b>): ganti seranganmu dengan memperkuat 1 petakmu sendiri (1 soal benar). Maks. 1 benteng per petak dan <b>3 benteng</b> per regu. Benteng hancur bila petaknya direbut.</li>
    <li>✨ Petak spesial: <b>⛏️ Tambang Emas</b> +${MINE_BONUS} poin tiap ronde • <b>🗼 Mercusuar</b>: saat direbut dapat 1 giliran ekstra • <b>⛰️ Gunung</b>: benteng alami • <b>⭐ Pulau Harta</b>: poin ganda saat direbut.</li>
    <li>👑 Selama memegang Ibu Kota sendiri: <b>+${CAP_HOLD} poin</b>. Merebut Ibu Kota lawan: <b>bonus +${CAP_TAKE}</b>! Regu yang kehilangan ibu kota tetap bermain dan boleh merebutnya kembali.</li>
    <li>🧮 Poin = nilai semua petak (biasa 10, spesial 15–30) + bonus. Permainan selesai setelah ronde habis, semua petak dikuasai, atau satu regu memegang semua Ibu Kota. <b>Poin terbanyak menang!</b></li>
    <li>🕊️ <b>Mode Damai</b>: tidak ada serangan — hanya merebut petak netral (cocok untuk kelas awal).</li>
    <li>⌨️ Panah = pindah kursor petak • Enter = pilih • <b>B</b> = bangun benteng • Spasi = lanjut • <b>M</b> = musik. Jawab soal dengan A/B/C/D atau 1–4.</li></ul>`;
  const RULES_SHORT = `<ul>
    <li>Ketuk petak yang <b>bersebelahan</b> dengan wilayahmu lalu jawab soal. Benar = petak direbut!</li>
    <li>Petak lawan = <b>SERANGAN</b>: kamu jawab dulu, lalu lawan dapat soal <b>TANGKIS</b>. Lawan salah = wilayahnya jadi milikmu.</li>
    <li><b>Bangun Benteng</b> untuk bertahan. Petak spesial: ⛏️ ⛰️ 🗼 ⭐ 🏰. Lengkapnya di tombol 📜.</li></ul>`;

  /* ------------------------------ Status ------------------------------ */
  let S = { rounds: 8, time: 30, size: 'sedang', attack: 'on' };
  let T = []; let M = null;
  let phase = 'idle'; // idle | brief | select | aim | ask | resolve | result | ai | between | over
  let round = 1; let turn = 0; let buildMode = false; let landing = false; let extraTurn = false;
  let valid = new Set(); let cursor = -1; let hover = -1; let target = -1;
  let gameSeq = 0; let curQ = null; let actLog = []; let resultInfo = null; let canNextAt = 0; let lastEnd = '';
  let time = 0; let mapDirty = true;
  const caps = []; const fortAnims = []; const parts = []; let shields = []; let proj = null; let aim = null;
  let flashA = 0; let flashC = '255,255,255'; let shakeT = 0; let shakeP = 0;
  const cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 };
  const peace = () => S.attack === 'off';
  const isAI = (i) => !!(T[i] && T[i].ai);

  /* ------------------------------ Suara (WebAudio) ------------------------------ */
  const SND = (() => {
    let a = null; let nbuf = null;
    function ac() {
      if (!a) { try { a = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (a.state === 'suspended') a.resume().catch(() => {});
      return a;
    }
    function nb() { if (!nbuf) { const len = a.sampleRate * 2; nbuf = a.createBuffer(1, len, a.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; } return nbuf; }
    function tone(f, d, type = 'square', v = 0.05, delay = 0, f2 = null) {
      if (QC.muted) return; const c = ac(); if (!c) return;
      const t = c.currentTime + Math.max(0, delay); const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
    }
    function noise(d, v, delay = 0, ft = 'lowpass', f = 1000, f2 = null, qv = 0.7) {
      if (QC.muted) return; const c = ac(); if (!c) return;
      const t = c.currentTime + Math.max(0, delay); const s = c.createBufferSource(); s.buffer = nb();
      const fl = c.createBiquadFilter(); fl.type = ft; fl.Q.value = qv; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
      const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(fl).connect(g).connect(c.destination); s.start(t, Math.random() * 0.3, d + 0.05);
    }
    return {
      ac, tone, noise,
      select() { tone(660, 0.07, 'triangle', 0.07); tone(990, 0.09, 'triangle', 0.06, 0.05); },
      cursor() { tone(880, 0.03, 'square', 0.025); },
      invalid() { tone(230, 0.14, 'square', 0.045); tone(180, 0.16, 'square', 0.04, 0.09); },
      plant() { noise(0.14, 0.3, 0, 'lowpass', 700); tone(150, 0.2, 'sine', 0.28, 0, 60); [784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, 0.12 + i * 0.07)); },
      horn() { tone(196, 0.32, 'sawtooth', 0.06); tone(262, 0.5, 'sawtooth', 0.065, 0.28); tone(392, 0.45, 'triangle', 0.05, 0.3); noise(0.12, 0.25, 0, 'lowpass', 400); noise(0.12, 0.25, 0.28, 'lowpass', 400); },
      launch() { noise(0.4, 0.28, 0, 'bandpass', 300, 2400, 1); tone(95, 0.3, 'sine', 0.3, 0, 40); },
      impact() { noise(0.7, 0.45, 0, 'lowpass', 1400, 80); tone(75, 0.55, 'sine', 0.42, 0, 30); },
      shield() { tone(1568, 0.55, 'triangle', 0.07, 0, 1180); tone(2093, 0.45, 'sine', 0.045, 0.06); noise(0.3, 0.1, 0, 'highpass', 5200); tone(523, 0.4, 'sine', 0.06, 0.02); },
      fail() { tone(392, 0.2, 'triangle', 0.08, 0, 300); tone(311, 0.32, 'triangle', 0.07, 0.17, 200); },
      build() { for (let i = 0; i < 3; i++) { noise(0.06, 0.4, i * 0.17, 'bandpass', 900, null, 3); tone(320, 0.06, 'square', 0.05, i * 0.17); } [659, 880, 1175].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, 0.55 + i * 0.07)); },
      capital() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.24, 'triangle', 0.1, i * 0.11)); noise(0.9, 0.35, 0, 'lowpass', 1200, 90); tone(65, 0.8, 'sine', 0.35, 0, 30); },
      mist() { noise(1.1, 0.14, 0, 'bandpass', 300, 1000, 0.8); tone(110, 1, 'sine', 0.05, 0, 80); tone(165, 0.9, 'sine', 0.03, 0.1, 120); },
      round() { tone(880, 0.7, 'sine', 0.08); tone(1320, 0.7, 'sine', 0.04, 0.02); tone(660, 0.9, 'sine', 0.05, 0.25); }
    };
  })();

  /* Musik petualangan ringan (opsional) */
  const MUS = { on: store('lokamain_rebut-wilayah_musik') === true, next: 0, step: 0 };
  const MEL = [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 76, 79, 77, 76, 74, 67];
  const BAS = [48, 48, 55, 55, 45, 45, 52, 52, 41, 41, 48, 48, 43, 43, 50, 43];
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function musicPump() {
    if (!MUS.on || QC.muted || phase === 'idle' || phase === 'over' || document.hidden) { MUS.next = 0; return; }
    const c = SND.ac(); if (!c || c.state !== 'running') return;
    const spb = 60 / 104 / 2;
    if (MUS.next < c.currentTime) MUS.next = c.currentTime + 0.05;
    while (MUS.next < c.currentTime + 0.3) {
      const st = MUS.step++; const dl = MUS.next - c.currentTime;
      if (st % 2 === 0) SND.tone(mf(BAS[(st >> 1) % 16]), 0.32, 'triangle', 0.05, dl);
      if (st % 4 !== 3) SND.tone(mf(MEL[(st >> 1) % 16] + (st % 64 >= 32 ? 2 : 0)), 0.2, 'sine', 0.026, dl);
      if (st % 4 === 2) SND.noise(0.03, 0.02, dl, 'highpass', 7000);
      MUS.next += spb;
    }
  }
  setInterval(musicPump, 90);
  function syncMusicBtn() { const b = $('btnMusic'); b.classList.toggle('on', MUS.on); b.classList.toggle('off', !MUS.on); b.title = MUS.on ? 'Musik: NYALA (M)' : 'Musik: MATI (M)'; }
  function toggleMusic() { MUS.on = !MUS.on; store('lokamain_rebut-wilayah_musik', MUS.on); SND.ac(); syncMusicBtn(); QC.toast(MUS.on ? '🎵 Musik dinyalakan' : '🎵 Musik dimatikan'); }
  $('btnMusic').onclick = (e) => { e.currentTarget.blur(); toggleMusic(); };
  syncMusicBtn();

  /* ------------------------------ Pembangkit peta ------------------------------ */
  const NB_E = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
  const NB_O = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];
  const axy = (c, r) => [SQ3 * (c + 0.5 * (r & 1)), 1.5 * r];
  function cube(c, r) { const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; }
  function hd(a, b) { const p = cube(a.c, a.r); const q = cube(b.c, b.r); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); }

  function tryGen(cfg, seed, nSides) {
    const R = seeded(seed); const { cols, rows } = cfg;
    const K = (c, r) => c * 100 + r;
    const inG = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows;
    const nbr = (c, r) => (r & 1 ? NB_O : NB_E).map(([dc, dr]) => [c + dc, r + dr]).filter(([a, b]) => inG(a, b));
    const own = new Map();
    const isl = ISL[cfg.islands].map(([fx, fy, share, st], i) => {
      const c = clamp(Math.round(fx * (cols - 1) + (R() - 0.5) * 1.2), 0, cols - 1);
      const r = clamp(Math.round(fy * (rows - 1) + (R() - 0.5) * 1.2), 0, rows - 1);
      const [cx, cy] = axy(c, r);
      return { i, cells: [[c, r]], target: Math.round(cfg.land * share), cx, cy, st };
    });
    for (const I of isl) { const k = K(I.cells[0][0], I.cells[0][1]); if (own.has(k)) return null; own.set(k, I.i); }
    let total = isl.length; let stall = 0;
    while (total < cfg.land && stall < 3) {
      let grew = false;
      for (const I of isl) {
        if (I.cells.length >= I.target || total >= cfg.land) continue;
        let best = null; let bs = 1e9;
        for (const [c, r] of I.cells) for (const [c2, r2] of nbr(c, r)) {
          if (own.has(K(c2, r2))) continue;
          if (nbr(c2, r2).some(([c3, r3]) => { const o = own.get(K(c3, r3)); return o !== undefined && o !== I.i; })) continue;
          const [x, y] = axy(c2, r2); const s = Math.hypot(x - I.cx, (y - I.cy) * I.st) + R() * 1.7;
          if (s < bs) { bs = s; best = [c2, r2]; }
        }
        if (best) { I.cells.push(best); own.set(K(best[0], best[1]), I.i); total++; grew = true; }
      }
      if (!grew) { stall++; isl.forEach((I) => (I.target += 3)); } else stall = 0;
    }
    if (total < cfg.land - 2 || isl.some((I) => I.cells.length < 4)) return null;
    const tiles = []; const idOf = new Map();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = K(c, r); if (!own.has(k)) continue; const [ax, ay] = axy(c, r);
      idOf.set(k, tiles.length);
      tiles.push({ id: tiles.length, c, r, ax, ay, x: ax, y: ay, isl: own.get(k), type: 'biasa', owner: -1, fort: false, capOf: -1, nb: [], land6: 0, lane: false, coast: false, seed: R() });
    }
    for (const t of tiles) { for (const [c, r] of nbr(t.c, t.r)) { const j = idOf.get(K(c, r)); if (j !== undefined) t.nb.push(j); } t.land6 = t.nb.length; }
    // jembatan / jalur laut: pohon rentang minimum antar pulau + 1–2 jalur tambahan
    const nI = isl.length; const pairs = [];
    for (let i = 0; i < nI; i++) for (let j = i + 1; j < nI; j++) {
      let best = null;
      for (const a of tiles) if (a.isl === i) for (const b of tiles) if (b.isl === j) {
        const d = hd(a, b); const pd = Math.hypot(a.ax - b.ax, a.ay - b.ay);
        if (!best || d < best.d || (d === best.d && pd < best.pd)) best = { i, j, a: a.id, b: b.id, d, pd };
      }
      if (best) pairs.push(best);
    }
    pairs.sort((x, y) => x.d - y.d || x.pd - y.pd);
    const par = isl.map((_, i) => i); const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
    const lanes = []; const extra = [];
    for (const p of pairs) { const a = find(p.i); const b = find(p.j); if (a !== b) { par[a] = b; lanes.push(p); } else extra.push(p); }
    if (lanes.length !== nI - 1 || lanes.some((p) => p.d > 4)) return null;
    const used = new Set(lanes.flatMap((p) => [p.a, p.b]));
    extra.filter((p) => p.d <= 3 && !used.has(p.a) && !used.has(p.b)).slice(0, nI >= 5 ? 2 : nI >= 4 ? 1 : 0).forEach((p) => lanes.push(p));
    for (const p of lanes) { tiles[p.a].nb.push(p.b); tiles[p.b].nb.push(p.a); tiles[p.a].lane = tiles[p.b].lane = true; p.kind = p.d <= 2 ? 'bridge' : 'sea'; }
    // ibu kota di sudut-sudut berbeda
    const corners = [[0, 0], [cols - 1, rows - 1], [cols - 1, 0], [0, rows - 1]].map(([c, r]) => axy(c, r));
    const capT = [];
    for (let s = 0; s < nSides; s++) {
      const [px, py] = corners[s]; let best = null; let bd = 1e9;
      for (const t of tiles) {
        if (t.capOf >= 0 || capT.some((c) => hd(c, t) < 3)) continue;
        const d = Math.hypot(t.ax - px, t.ay - py) - t.land6 * 0.15; if (d < bd) { bd = d; best = t; }
      }
      if (!best) return null;
      best.type = 'ibukota'; best.capOf = s; best.owner = s; capT.push(best);
    }
    // petak spesial
    const minCap = (t) => Math.min(...capT.map((c) => hd(c, t)));
    const specs = [];
    const okSpot = (t, gap) => t.type === 'biasa' && minCap(t) >= 2 && specs.every((s) => hd(s, t) >= gap);
    const place = (type, n, score) => {
      for (let k = 0; k < n; k++) for (const gap of [2, 1]) {
        const c = tiles.filter((t) => okSpot(t, gap)); if (!c.length) continue;
        c.sort((a, b) => score(b) - score(a)); c[0].type = type; specs.push(c[0]); break;
      }
    };
    const sp = cfg.spec;
    place('harta', sp.harta, (t) => minCap(t) + R() * 1.5);
    place('gunung', sp.gunung, (t) => (t.land6 >= 5 ? 3 : 0) + R() * 2);
    place('mercu', sp.mercu, (t) => (t.land6 <= 4 ? 2 : 0) + (t.lane ? 1.5 : 0) + R() * 2);
    place('tambang', sp.tambang, (t) => R() * 3 + minCap(t) * 0.3);
    return { tiles, lanes, cols, rows, land: tiles.length, seed, nI, vert: null, size: cfg.name };
  }
  function genMap(sizeKey, nSides) {
    const cfg = SIZES[sizeKey] || SIZES.sedang;
    for (let i = 0; i < 120; i++) { const m = tryGen(cfg, ((Math.random() * 2e9) | 0) + 1, nSides); if (m) return m; }
    for (let s = 1; s < 500; s++) { const m = tryGen(cfg, s * 7919, nSides); if (m) return m; }
    return null;
  }

  /* Orientasi: peta lanskap (heksagon runcing-atas) atau potret (dicerminkan diagonal
     -> heksagon datar-atas) agar petak tetap besar di layar ponsel tegak. */
  function hexPath(x, y, s) { const p = new Path2D(); M.corner.forEach(([cx, cy], k) => (k ? p.lineTo(x + cx * s, y + cy * s) : p.moveTo(x + cx * s, y + cy * s))); p.closePath(); return p; }
  function applyOrient(vert) {
    M.vert = vert; const base = vert ? 0 : Math.PI / 6;
    M.corner = Array.from({ length: 6 }, (_, k) => [Math.cos(base + (k * Math.PI) / 3), Math.sin(base + (k * Math.PI) / 3)]);
    let x0 = 1e9; let y0 = 1e9; let x1 = -1e9; let y1 = -1e9;
    const at = new Map(); const kk = (x, y) => Math.round(x * 4) + ':' + Math.round(y * 4);
    for (const t of M.tiles) { t.x = vert ? t.ay : t.ax; t.y = vert ? t.ax : t.ay; at.set(kk(t.x, t.y), t.id); x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y); }
    for (const t of M.tiles) {
      t.edgeN = []; t.coast = false;
      for (let k = 0; k < 6; k++) { const a = base + (k * Math.PI) / 3 + Math.PI / 6; const j = at.get(kk(t.x + Math.cos(a) * SQ3, t.y + Math.sin(a) * SQ3)); t.edgeN.push(j === undefined ? -1 : j); if (j === undefined) t.coast = true; }
      t.path = hexPath(t.x, t.y, 1); t.pathIn = hexPath(t.x, t.y, 0.86);
      t.flag = [t.x, t.y - 0.7]; t.lamp = [t.x, t.y - 0.5];
    }
    M.bx0 = x0 - 1; M.by0 = y0 - 1; M.bw = x1 - x0 + 2; M.bh = y1 - y0 + 2; M.mx = (x0 + x1) / 2; M.my = (y0 + y1) / 2;
    M.cx0 = M.bx0 - 1.6; M.cy0 = M.by0 - 1.6; M.cw = M.bw + 3.2; M.ch = M.bh + 3.2;
    const cp = new Path2D();
    for (const t of M.tiles) for (let k = 0; k < 6; k++) if (t.edgeN[k] < 0) { const [ax, ay] = M.corner[k]; const [bx, by] = M.corner[(k + 1) % 6]; cp.moveTo(t.x + ax, t.y + ay); cp.lineTo(t.x + bx, t.y + by); }
    M.coast = cp;
    // titik ombak di laut (jauh dari daratan)
    const R = seeded(M.seed + 99); M.waves = [];
    for (let y = M.cy0 + 0.6; y < M.cy0 + M.ch; y += 1.25) for (let x = M.cx0 + 0.6; x < M.cx0 + M.cw; x += 1.7) {
      const px = x + (R() - 0.5) * 1.1; const py = y + (R() - 0.5) * 0.8;
      if (M.tiles.some((t) => Math.hypot(t.x - px, t.y - py) < 1.75)) continue;
      M.waves.push({ x: px, y: py, ph: R() * TAU, w: 0.16 + R() * 0.16 });
    }
    cacheKey = ''; mapDirty = true;
  }

  /* ------------------------------ Kanvas & tata letak ------------------------------ */
  const stage = $('stage'); const cv = $('cv'); const ctx = cv.getContext('2d'); const rcard = $('rcard');
  let W = 0; let H = 0; let DPR = 1; let fs = 40; let cs = 40; const view = { x: 0, y: 0, w: 1, h: 1, cx: 0, cy: 0 };
  let seaC = null; let terrC = null; let mapC = null; let cloudC = null; let cloudSh = null; let shineC = null; let cacheKey = '';
  const clouds = [];
  function mkC(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function layout() {
    const w = stage.clientWidth; const h = stage.clientHeight; const d = Math.min(1.5, window.devicePixelRatio || 1);
    if (w !== W || h !== H || d !== DPR) { W = w; H = h; DPR = d; cv.width = Math.max(1, Math.round(W * DPR)); cv.height = Math.max(1, Math.round(H * DPR)); }
    const hud = $('hud'); const dock = $('dock');
    const top = hud.offsetTop + hud.offsetHeight + 4; const bot = (dock.offsetHeight ? dock.offsetTop : H) - 4;
    view.x = 6; view.y = top; view.w = Math.max(60, W - 12); view.h = Math.max(60, bot - top);
    view.cx = view.x + view.w / 2; view.cy = view.y + view.h / 2;
    if (!M) return;
    const vert = view.w < view.h * 0.95;
    if (M.vert !== vert) applyOrient(vert);
    fs = Math.max(4, Math.min(view.w / (M.bw + 0.5), view.h / (M.bh + 0.5)));
    if (!['aim', 'ask', 'resolve', 'result', 'ai'].includes(phase)) resetCam(true);
  }
  function resetCam(snap) { if (!M) return; cam.tx = M.mx; cam.ty = M.my; cam.tz = 1; if (snap) { cam.x = cam.tx; cam.y = cam.ty; cam.z = 1; } }
  function focus(t, z = 1.25) { cam.tx = M.mx + (t.x - M.mx) * 0.7; cam.ty = M.my + (t.y - M.my) * 0.7; cam.tz = z; wake(); }
  function toWorld(sx, sy) { const k = fs * cam.z; return [(sx - view.cx) / k + cam.x, (sy - view.cy) / k + cam.y]; }
  function toScreen(wx, wy) { const k = fs * cam.z; return [view.cx + (wx - cam.x) * k, view.cy + (wy - cam.y) * k]; }
  function clientOf(t) { const r = cv.getBoundingClientRect(); const [x, y] = toScreen(t.x, t.y); return { x: r.left + x, y: r.top + y }; }
  function tileAt(sx, sy) { if (!M) return null; const [wx, wy] = toWorld(sx, sy); let best = null; let bd = 0.97; for (const t of M.tiles) { const d = Math.hypot(t.x - wx, t.y - wy); if (d < bd) { bd = d; best = t; } } return best; }

  /* ------------------------------ Cache grafis ------------------------------ */
  const wT = (g) => g.setTransform(cs, 0, 0, cs, -M.cx0 * cs, -M.cy0 * cs);
  function ensureCaches() {
    const t0 = performance.now(); let built = false;
    const k = [W, H, DPR, fs.toFixed(3), M ? M.seed : 0, M ? M.vert : 0].join('|');
    if (k !== cacheKey || !seaC) {
      cacheKey = k; seaC = buildSea(); if (!cloudC) buildClouds();
      if (M) { cs = Math.min(fs * DPR * 1.2, 4000 / M.cw, 4000 / M.ch); terrC = buildTerrain(); mapC = null; mapDirty = true; }
      built = true;
    }
    if (M && (mapDirty || !mapC)) { buildMap(); mapDirty = false; built = true; }
    if (built) { perf.builds++; perf.buildMax = Math.max(perf.buildMax, performance.now() - t0); }
    return built;
  }
  function buildSea() {
    const c = mkC(W * DPR, H * DPR); const g = c.getContext('2d'); g.scale(DPR, DPR);
    let gr = g.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    gr.addColorStop(0, '#1a86b5'); gr.addColorStop(0.55, '#11689a'); gr.addColorStop(1, '#0a3d63');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // tekstur laut halus (bercak gelap/terang)
    const R = seeded(4242);
    for (let i = 0; i < 70; i++) { const x = R() * W; const y = R() * H; const r = 30 + R() * 90; gr = g.createRadialGradient(x, y, 0, x, y, r); const lt = R() < 0.5; gr.addColorStop(0, lt ? 'rgba(120,210,240,.07)' : 'rgba(0,30,60,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    // garis lintang/bujur ala peta kuno
    g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1; const step = clamp(Math.min(W, H) / 6, 60, 160);
    for (let x = (W / 2) % step; x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = (H / 2) % step; y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // mawar angin di pojok kanan bawah
    const cr = clamp(Math.min(W, H) * 0.07, 26, 70); const cx = W - cr - 14; const cy = H - cr - Math.min(90, H * 0.12);
    g.save(); g.translate(cx, cy); g.globalAlpha = 0.32;
    g.strokeStyle = '#fef3c7'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, cr * 0.8, 0, TAU); g.stroke();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; const l = i % 2 ? cr * 0.55 : cr * 1.05; g.fillStyle = i % 2 ? '#93c5fd' : '#fef3c7'; g.beginPath(); g.moveTo(Math.cos(a) * l, Math.sin(a) * l); g.lineTo(Math.cos(a + 0.35) * cr * 0.16, Math.sin(a + 0.35) * cr * 0.16); g.lineTo(Math.cos(a - 0.35) * cr * 0.16, Math.sin(a - 0.35) * cr * 0.16); g.closePath(); g.fill(); }
    g.font = `800 ${Math.round(cr * 0.36)}px "Baloo 2", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fef3c7'; g.fillText('U', 0, -cr * 1.32);
    g.restore();
    // vinyet
    gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(2,14,28,.55)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }
  function buildClouds() {
    const mk = (col) => { const c = mkC(240, 120); const g = c.getContext('2d'); const R = seeded(77);
      for (let i = 0; i < 9; i++) { const x = 50 + R() * 140; const y = 52 + (R() - 0.5) * 34; const r = 24 + R() * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col(1)); gr.addColorStop(0.6, col(0.85)); gr.addColorStop(1, col(0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      return c; };
    cloudC = mk((a) => `rgba(255,255,255,${a})`); cloudSh = mk((a) => `rgba(0,25,45,${a})`);
    shineC = mkC(64, 4); const g = shineC.getContext('2d'); const gr = g.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, 'rgba(255,250,220,0)'); gr.addColorStop(0.5, 'rgba(255,250,220,.07)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random(), y: 0.1 + Math.random() * 0.75, s: 0.7 + Math.random() * 0.6, v: 0.006 + Math.random() * 0.008 });
  }

  /* --- bagian-bagian gambar (unit dunia: 1 = jari-jari heksagon) --- */
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function poly(g, pts, fill) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); }
  function drawTree(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + 0.04 * s, y + 0.1 * s, 0.17 * s, 0.06 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#6b4423'; g.fillRect(x - 0.025 * s, y - 0.04 * s, 0.05 * s, 0.14 * s);
    g.fillStyle = '#2e7d32'; circ(g, x, y - 0.13 * s, 0.17 * s); g.fillStyle = '#43a047'; circ(g, x - 0.05 * s, y - 0.18 * s, 0.11 * s); g.fillStyle = 'rgba(255,255,255,.22)'; circ(g, x - 0.08 * s, y - 0.22 * s, 0.04 * s);
  }
  function drawPalm(g, x, y, s, R) {
    g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x + 0.05 * s, y + 0.1 * s, 0.18 * s, 0.05 * s, 0, 0, TAU); g.fill();
    const tx = x + (R() - 0.5) * 0.16 * s; const ty = y - 0.36 * s;
    g.strokeStyle = '#8d6236'; g.lineWidth = 0.05 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + 0.08 * s); g.quadraticCurveTo(x + 0.08 * s, y - 0.12 * s, tx, ty); g.stroke();
    g.strokeStyle = '#2f9e44'; g.lineWidth = 0.07 * s;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.75; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * 0.16 * s, ty + Math.sin(a) * 0.16 * s - 0.05 * s, tx + Math.cos(a) * 0.26 * s, ty + Math.sin(a) * 0.2 * s + 0.08 * s); g.stroke(); }
    g.fillStyle = '#7c4a1e'; circ(g, tx + 0.02 * s, ty + 0.04 * s, 0.035 * s);
  }
  function drawHut(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 0.15 * s, y + 0.06 * s, 0.34 * s, 0.05 * s);
    g.fillStyle = '#f3e3c3'; g.fillRect(x - 0.14 * s, y - 0.1 * s, 0.28 * s, 0.18 * s);
    poly(g, [[x - 0.2 * s, y - 0.08 * s], [x, y - 0.28 * s], [x + 0.2 * s, y - 0.08 * s]], '#b45309');
    g.fillStyle = '#5b3a1a'; g.fillRect(x - 0.035 * s, y - 0.02 * s, 0.07 * s, 0.1 * s);
  }
  function drawMountain(g, x, y) {
    poly(g, [[x - 0.66, y + 0.4], [x - 0.3, y - 0.3], [x + 0.08, y + 0.4]], '#6f655c');
    poly(g, [[x - 0.42, y + 0.44], [x + 0.08, y - 0.62], [x + 0.62, y + 0.44]], '#8b8075');
    poly(g, [[x + 0.08, y - 0.62], [x + 0.62, y + 0.44], [x + 0.2, y + 0.44]], '#655a50');
    poly(g, [[x - 0.07, y - 0.34], [x + 0.08, y - 0.62], [x + 0.23, y - 0.32], [x + 0.14, y - 0.37], [x + 0.07, y - 0.29], [x, y - 0.37]], '#f8fafc');
    poly(g, [[x - 0.36, y - 0.18], [x - 0.3, y - 0.3], [x - 0.22, y - 0.16]], '#e2e8f0');
  }
  function drawLighthouse(g, x, y) {
    g.fillStyle = '#64748b'; g.beginPath(); g.ellipse(x, y + 0.42, 0.3, 0.1, 0, 0, TAU); g.fill();
    const body = new Path2D(); body.moveTo(x - 0.15, y + 0.42); body.lineTo(x + 0.15, y + 0.42); body.lineTo(x + 0.09, y - 0.36); body.lineTo(x - 0.09, y - 0.36); body.closePath();
    g.fillStyle = '#f8fafc'; g.fill(body);
    g.save(); g.clip(body); g.fillStyle = '#dc2626'; g.fillRect(x - 0.2, y + 0.14, 0.4, 0.13); g.fillRect(x - 0.2, y - 0.14, 0.4, 0.12); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x + 0.03, y - 0.4, 0.2, 0.9); g.restore();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.025; g.stroke(body);
    g.fillStyle = '#1f2937'; g.fillRect(x - 0.15, y - 0.41, 0.3, 0.06);
    g.fillStyle = '#fde68a'; g.fillRect(x - 0.075, y - 0.56, 0.15, 0.15);
    poly(g, [[x - 0.11, y - 0.56], [x, y - 0.7], [x + 0.11, y - 0.56]], '#b91c1c');
  }
  function drawMine(g, x, y) {
    g.fillStyle = '#8b6b4a'; g.beginPath(); g.arc(x, y + 0.34, 0.48, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = '#a3825f'; g.beginPath(); g.arc(x - 0.08, y + 0.34, 0.36, Math.PI, Math.PI * 1.6); g.lineTo(x - 0.08, y + 0.34); g.closePath(); g.fill();
    g.fillStyle = '#1c130d'; g.beginPath(); g.arc(x, y + 0.36, 0.2, Math.PI, 0); g.closePath(); g.fill();
    g.strokeStyle = '#d29a5c'; g.lineWidth = 0.05; g.beginPath(); g.moveTo(x - 0.22, y + 0.37); g.lineTo(x - 0.22, y + 0.12); g.lineTo(x + 0.22, y + 0.12); g.lineTo(x + 0.22, y + 0.37); g.stroke();
    for (const [dx, dy, r] of [[0.32, 0.33, 0.075], [0.42, 0.24, 0.06], [0.25, 0.4, 0.055]]) { g.fillStyle = '#f59e0b'; circ(g, x + dx, y + dy, r); g.fillStyle = '#fde68a'; circ(g, x + dx - r * 0.3, y + dy - r * 0.3, r * 0.4); }
    g.strokeStyle = '#7c4a1e'; g.lineWidth = 0.045; g.beginPath(); g.moveTo(x - 0.44, y + 0.4); g.lineTo(x - 0.2, y - 0.08); g.stroke();
    g.strokeStyle = '#9ca3af'; g.lineWidth = 0.05; g.beginPath(); g.arc(x - 0.18, y + 0.12, 0.2, -2.3, -0.9); g.stroke();
  }
  function drawChest(g, x, y) {
    let gr = g.createRadialGradient(x, y, 0, x, y, 0.75); gr.addColorStop(0, 'rgba(253,224,71,.5)'); gr.addColorStop(1, 'rgba(253,224,71,0)'); g.fillStyle = gr; circ(g, x, y, 0.75);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - 0.27, y + 0.27, 0.6, 0.06);
    g.fillStyle = '#8b5a2b'; g.fillRect(x - 0.28, y, 0.56, 0.3);
    gr = g.createLinearGradient(0, y - 0.2, 0, y); gr.addColorStop(0, '#b7713a'); gr.addColorStop(1, '#8b4f23'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 0.28, y); g.lineTo(x - 0.28, y - 0.08); g.quadraticCurveTo(x, y - 0.3, x + 0.28, y - 0.08); g.lineTo(x + 0.28, y); g.closePath(); g.fill();
    g.fillStyle = '#fbbf24'; g.fillRect(x - 0.2, y - 0.17, 0.06, 0.47); g.fillRect(x + 0.14, y - 0.17, 0.06, 0.47); g.fillRect(x - 0.05, y - 0.04, 0.1, 0.12);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.025; g.strokeRect(x - 0.28, y, 0.56, 0.3);
    for (const [dx, dy] of [[-0.38, 0.28], [0.37, 0.26], [0.42, 0.18]]) { g.fillStyle = '#facc15'; circ(g, x + dx, y + dy, 0.06); }
  }
  function drawCastle(g, t, col) {
    const x = t.x; const y = t.y + 0.05;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + 0.04, y + 0.42, 0.58, 0.1, 0, 0, TAU); g.fill();
    const stone = '#e7e2da'; const dark = 'rgba(0,0,0,.35)';
    g.fillStyle = '#d6d0c6'; g.fillRect(x - 0.42, y - 0.08, 0.84, 0.48);
    for (let i = 0; i < 5; i++) g.fillRect(x - 0.42 + i * 0.19, y - 0.16, 0.1, 0.09);
    for (const sx of [-1, 1]) {
      const tx = x + sx * 0.4; g.fillStyle = stone; g.fillRect(tx - 0.12, y - 0.34, 0.24, 0.76);
      poly(g, [[tx - 0.16, y - 0.34], [tx, y - 0.64], [tx + 0.16, y - 0.34]], col);
      g.fillStyle = '#334155'; g.fillRect(tx - 0.03, y - 0.18, 0.06, 0.1);
      g.strokeStyle = dark; g.lineWidth = 0.022; g.strokeRect(tx - 0.12, y - 0.34, 0.24, 0.76);
    }
    g.fillStyle = '#f5f1ea'; g.fillRect(x - 0.15, y - 0.44, 0.3, 0.42);
    poly(g, [[x - 0.19, y - 0.44], [x, y - 0.74], [x + 0.19, y - 0.44]], shade(col, -0.15));
    g.fillStyle = '#334155'; g.fillRect(x - 0.035, y - 0.34, 0.07, 0.11);
    g.fillStyle = '#3f2e22'; g.beginPath(); g.moveTo(x - 0.11, y + 0.4); g.lineTo(x - 0.11, y + 0.22); g.arc(x, y + 0.22, 0.11, Math.PI, 0); g.lineTo(x + 0.11, y + 0.4); g.closePath(); g.fill();
    g.strokeStyle = dark; g.lineWidth = 0.022; g.strokeRect(x - 0.42, y - 0.08, 0.84, 0.48); g.strokeRect(x - 0.15, y - 0.44, 0.3, 0.42);
    t.flag = [x, y - 0.74];
  }
  function drawFort(g, x, y, col, s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0.02, 0.13, 0.27, 0.06, 0, 0, TAU); g.fill();
    g.fillStyle = '#9aa3ae'; g.fillRect(-0.24, -0.08, 0.48, 0.21);
    for (let i = 0; i < 3; i++) g.fillRect(-0.24 + i * 0.19, -0.16, 0.1, 0.09);
    g.fillStyle = '#7b8490'; g.fillRect(0.06, -0.08, 0.18, 0.21);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.022; g.strokeRect(-0.24, -0.08, 0.48, 0.21);
    g.fillStyle = '#2b2118'; g.beginPath(); g.arc(0, 0.13, 0.065, Math.PI, 0); g.fill();
    g.strokeStyle = '#3f3f46'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(-0.19, -0.16); g.lineTo(-0.19, -0.36); g.stroke();
    poly(g, [[-0.19, -0.36], [0.03, -0.31], [-0.19, -0.25]], col);
    g.restore();
  }
  function drawLane(g, L) {
    const a = M.tiles[L.a]; const b = M.tiles[L.b]; const dx = b.x - a.x; const dy = b.y - a.y; const len = Math.hypot(dx, dy); const ang = Math.atan2(dy, dx);
    g.save(); g.translate(a.x, a.y); g.rotate(ang);
    if (L.kind === 'bridge') {
      g.fillStyle = 'rgba(0,20,40,.25)'; g.fillRect(0.4, -0.18, len - 0.8, 0.46);
      for (let s = 0.45; s < len - 0.45; s += 0.15) { g.fillStyle = (s * 7) % 2 > 1 ? '#b98048' : '#a86f3b'; g.fillRect(s, -0.21, 0.11, 0.42); }
      g.strokeStyle = '#5b3a1a'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(0.4, -0.23); g.lineTo(len - 0.4, -0.23); g.moveTo(0.4, 0.23); g.lineTo(len - 0.4, 0.23); g.stroke();
      g.fillStyle = '#5b3a1a'; for (const s of [0.55, len / 2, len - 0.55]) { circ(g, s, -0.23, 0.05); circ(g, s, 0.23, 0.05); }
    } else {
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.08; g.setLineDash([0.22, 0.17]); g.lineCap = 'round';
      g.beginPath(); g.moveTo(0.5, 0); g.lineTo(len - 0.5, 0); g.stroke(); g.setLineDash([]);
      g.restore(); g.save();
      const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2; g.translate(mx, my - 0.15);
      g.fillStyle = 'rgba(0,20,40,.3)'; g.beginPath(); g.ellipse(0.03, 0.2, 0.3, 0.07, 0, 0, TAU); g.fill();
      g.fillStyle = '#7c4a1e'; g.beginPath(); g.moveTo(-0.3, 0.06); g.lineTo(0.3, 0.06); g.lineTo(0.2, 0.2); g.lineTo(-0.2, 0.2); g.closePath(); g.fill();
      g.strokeStyle = '#3f2e22'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(0, 0.06); g.lineTo(0, -0.34); g.stroke();
      poly(g, [[0.02, -0.32], [0.24, 0.02], [0.02, 0.02]], '#f8fafc'); poly(g, [[-0.02, -0.26], [-0.18, 0.02], [-0.02, 0.02]], '#e2e8f0');
    }
    g.restore();
  }
  const GR = [['#86d062', '#4f9e3c'], ['#7cc85a', '#4a9638'], ['#90d76a', '#55a540'], ['#77c157', '#468f35']];
  function buildTerrain() {
    const c = mkC(M.cw * cs, M.ch * cs); const g = c.getContext('2d'); wT(g);
    // perairan dangkal (halo pulau) — digambar penuh lalu ditempel transparan agar rata
    const h = mkC(c.width, c.height); const hg = h.getContext('2d');
    for (const [r, col, a] of [[2.1, '#2aa3c8', 0.38], [1.45, '#8be0e6', 0.5]]) {
      hg.setTransform(1, 0, 0, 1, 0, 0); hg.clearRect(0, 0, h.width, h.height); wT(hg); hg.fillStyle = col; hg.beginPath();
      for (const t of M.tiles) { hg.moveTo(t.x + r, t.y); hg.arc(t.x, t.y, r, 0, TAU); }
      hg.fill(); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(h, 0, 0); g.restore();
    }
    // pantai: buih basah + pasir (separuh luar garis pantai)
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 0.5; g.stroke(M.coast);
    g.strokeStyle = '#ecd8a0'; g.lineWidth = 0.37; g.stroke(M.coast);
    for (const L of M.lanes) drawLane(g, L);
    // rumput
    for (const t of M.tiles) {
      const base = t.type === 'gunung' ? ['#a5b071', '#7d8a50'] : t.type === 'harta' ? ['#f2df9c', '#d6bc6a'] : GR[(t.seed * 4) | 0];
      const gr = g.createLinearGradient(t.x - 0.7, t.y - 0.85, t.x + 0.7, t.y + 0.85); gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]);
      g.fillStyle = gr; g.fill(t.path);
    }
    // rumpun rumput kecil
    g.fillStyle = 'rgba(30,90,30,.25)';
    for (const t of M.tiles) { const R = seeded((t.seed * 1e6) | 0); for (let i = 0; i < 6; i++) { const a = R() * TAU; const d = R() * 0.7; g.fillRect(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 0.05, 0.025); } }
    g.strokeStyle = 'rgba(30,70,25,.3)'; g.lineWidth = 0.04; for (const t of M.tiles) g.stroke(t.path);
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 0.035; for (const t of M.tiles) g.stroke(t.pathIn);
    return c;
  }
  const pendingCap = (id) => caps.some((c) => c.id === id && !c.baked);
  const pendingFort = (id) => fortAnims.some((f) => f.id === id && !f.baked);
  function buildMap() {
    if (!mapC || mapC.width !== terrC.width || mapC.height !== terrC.height) mapC = mkC(terrC.width, terrC.height);
    const g = mapC.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, mapC.width, mapC.height); g.drawImage(terrC, 0, 0); wT(g);
    // warna wilayah
    const ownerOf = (id) => (id < 0 || pendingCap(id) ? -2 : M.tiles[id].owner);
    for (const t of M.tiles) {
      const o = ownerOf(t.id); if (o < 0 || !T[o]) continue;
      g.fillStyle = 'rgba(255,250,235,.3)'; g.fill(t.path); // pucatkan rumput agar warna regu lebih murni
      g.fillStyle = rgba(T[o].color, T[o].ai ? 0.58 : 0.52); g.fill(t.path);
      if (T[o].ai) { g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 0.05; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(t.x - 0.3 + i * 0.3, t.y - 0.25 + i * 0.25, 0.22, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
    }
    // perbatasan wilayah (tepi dengan petak milik pihak lain)
    g.lineCap = 'round';
    T.forEach((tm, o) => {
      const p = new Path2D(); const q = new Path2D(); let any = false;
      for (const t of M.tiles) {
        if (ownerOf(t.id) !== o) continue; any = true;
        for (let k = 0; k < 6; k++) {
          if (ownerOf(t.edgeN[k]) === o) continue;
          const [ax, ay] = M.corner[k]; const [bx, by] = M.corner[(k + 1) % 6];
          p.moveTo(t.x + ax * 0.9, t.y + ay * 0.9); p.lineTo(t.x + bx * 0.9, t.y + by * 0.9);
          q.moveTo(t.x + ax * 0.99, t.y + ay * 0.99); q.lineTo(t.x + bx * 0.99, t.y + by * 0.99);
        }
      }
      if (!any) return;
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.05; g.stroke(q);
      g.strokeStyle = shade(tm.color, -0.2); g.lineWidth = 0.13; g.stroke(p);
    });
    // hiasan & ikon petak (diurutkan dari atas ke bawah)
    for (const t of M.tiles) {
      const R = seeded(((t.seed * 1e6) | 0) + 7);
      if (t.type === 'gunung') drawMountain(g, t.x, t.y);
      else if (t.type === 'mercu') drawLighthouse(g, t.x, t.y);
      else if (t.type === 'tambang') drawMine(g, t.x, t.y - 0.12);
      else if (t.type === 'harta') drawChest(g, t.x, t.y - 0.05);
      else if (t.type === 'biasa') {
        const n = 1 + ((R() * 3) | 0); const kind = t.coast && R() < 0.6 ? 'palm' : 'tree'; const hut = R() < 0.3;
        const items = [];
        for (let i = 0; i < n; i++) { const a = R() * TAU; const d = 0.18 + R() * 0.38; items.push([t.x + Math.cos(a) * d, t.y + Math.sin(a) * d * 0.85, i === 0 && hut ? 'hut' : kind]); }
        items.sort((p1, p2) => p1[1] - p2[1]).forEach(([x, y, k]) => (k === 'hut' ? drawHut(g, x, y, 1) : k === 'palm' ? drawPalm(g, x, y, 1, R) : drawTree(g, x, y, 0.95)));
      }
    }
    // ibu kota + lencana avatar pemilik
    for (const t of M.tiles) {
      if (t.capOf < 0) continue; const o = ownerOf(t.id); const tm = T[o] || T[t.owner];
      const col = tm ? tm.color : '#94a3b8'; drawCastle(g, t, col);
      if (tm) {
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const px = (t.x + 0.5 - M.cx0) * cs; const py = (t.y + 0.42 - M.cy0) * cs; const r = 0.22 * cs;
        g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); g.lineWidth = Math.max(1, 0.04 * cs); g.strokeStyle = '#fff'; g.stroke();
        g.font = `${Math.round(r * 1.25)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tm.avatar, px, py + r * 0.08);
        g.restore();
      }
    }
    // benteng (digambar paling atas agar tidak tertutup ikon petak)
    for (const t of M.tiles) if (t.fort && !pendingFort(t.id) && t.owner >= 0 && T[t.owner]) { const p = fortPos(t); drawFort(g, p[0], p[1], T[t.owner].color, p[2]); }
  }
  function fortPos(t) { return t.type === 'biasa' ? [t.x, t.y + 0.12, 1.25] : t.capOf >= 0 ? [t.x - 0.42, t.y + 0.44, 0.95] : [t.x + 0.38, t.y + 0.44, 0.95]; }

  /* ------------------------------ Partikel ------------------------------ */
  function addP(p) { if (parts.length < 500) parts.push(p); }
  function sparks(x, y, n, sp, cols) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU; const v = rnd(0.3, 1) * sp; addP({ t: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: rnd(0.3, 0.75), max: 0.75, c: QC.pick(cols), w: rnd(0.03, 0.06) }); } }
  function smoke(x, y, n, rgb = '200,200,210', sp = 0.6, size = 1) { for (let i = 0; i < n; i++) addP({ t: 'k', x: x + rnd(-0.3, 0.3), y: y + rnd(-0.2, 0.2), vx: rnd(-1, 1) * sp, vy: -rnd(0.2, 1) * sp, r: rnd(0.12, 0.25) * size, gr: rnd(0.3, 0.6) * size, life: rnd(0.8, 1.6), max: 1.6, c: rgb }); }
  function ringP(x, y, r1, c, life = 0.6, w = 0.12) { addP({ t: 'r', x, y, r1, c, life, max: life, w }); }
  function confettiP(x, y, n, cols) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rnd(-1.2, 1.2); const v = rnd(2, 6); addP({ t: 'c', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: rnd(-10, 10), life: rnd(1.2, 2.2), max: 2.2, c: QC.pick(cols), s: rnd(0.08, 0.14) }); } }
  function updParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      if (p.t === 's') { p.vy += 7 * dt; p.vx *= 0.97; p.vy *= 0.97; } else if (p.t === 'k') { p.vx *= 0.96; p.vy *= 0.96; p.r += p.gr * dt; } else if (p.t === 'c') { p.vy += 6 * dt; p.vx *= 0.97; p.vy = Math.min(p.vy, 2.5); p.rot += p.vr * dt; }
      if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; }
    }
  }
  function drawParts() {
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.t === 'k') { ctx.fillStyle = `rgba(${p.c},${Math.min(0.5, k * 0.6)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
      else if (p.t === 'c') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
      else if (p.t === 'r') { ctx.globalAlpha = k; ctx.strokeStyle = p.c; ctx.lineWidth = p.w * k + 0.02; ctx.beginPath(); ctx.arc(p.x, p.y, 0.1 + p.r1 * easeOut(1 - k), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const p of parts) if (p.t === 's') { ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6); ctx.strokeStyle = p.c; ctx.lineWidth = p.w; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------ Gambar per frame ------------------------------ */
  function drawSea() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.26)'; ctx.lineWidth = 0.055; ctx.beginPath();
    for (const p of M.waves) {
      const a = Math.sin(time * 1.2 + p.ph); if (a < 0.05) continue;
      const x = p.x + Math.sin(time * 0.35 + p.ph) * 0.25; const y = p.y + a * 0.05;
      ctx.moveTo(x - p.w * a, y); ctx.quadraticCurveTo(x, y - 0.16 * a, x + p.w * a, y);
    }
    ctx.stroke();
    const f1 = Math.sin(time * 1.6); const f2 = Math.sin(time * 1.6 + 1.7);
    ctx.strokeStyle = `rgba(255,255,255,${0.16 + 0.08 * f1})`; ctx.lineWidth = 0.66 + 0.1 * f1; ctx.stroke(M.coast);
    ctx.strokeStyle = `rgba(210,245,255,${0.09 + 0.05 * f2})`; ctx.lineWidth = 1.05 + 0.15 * f2; ctx.stroke(M.coast);
  }
  function flagAt(x, y, col, s = 1, a = 1) {
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 0.045 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 0.55 * s); ctx.stroke();
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(x, y - 0.56 * s, 0.04 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); const top = y - 0.52 * s; const n = 6; const L = 0.42 * s; const hh = 0.27 * s;
    for (let i = 0; i <= n; i++) { const u = i / n; const w = Math.sin(time * 6 - u * 4) * 0.05 * s * u; i ? ctx.lineTo(x + u * L, top + w) : ctx.moveTo(x, top); }
    for (let i = n; i >= 0; i--) { const u = i / n; const w = Math.sin(time * 6 - u * 4) * 0.05 * s * u; ctx.lineTo(x + u * L, top + hh + w); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.02 * s; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function bez(a, b, u) { const mx = (a[0] + b[0]) / 2; const my = Math.min(a[1], b[1]) - Math.max(0.8, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.45); const m = 1 - u; return [m * m * a[0] + 2 * m * u * mx + u * u * b[0], m * m * a[1] + 2 * m * u * my + u * u * b[1]]; }
  function drawLive() {
    const tiles = M.tiles;
    // mercusuar & harta berkilau
    ctx.globalCompositeOperation = 'lighter';
    for (const t of tiles) {
      if (t.type === 'mercu') {
        const [lx, ly] = t.lamp; const a = time * 1.3 + t.id; ctx.fillStyle = 'rgba(255,244,190,.12)';
        for (const d of [0, Math.PI]) { ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(a + d - 0.16) * 2.6, ly + Math.sin(a + d - 0.16) * 1.6); ctx.lineTo(lx + Math.cos(a + d + 0.16) * 2.6, ly + Math.sin(a + d + 0.16) * 1.6); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,240,150,.5)'; ctx.beginPath(); ctx.arc(lx, ly, 0.1 + 0.03 * Math.sin(time * 5), 0, TAU); ctx.fill();
      } else if (t.type === 'harta' || t.type === 'tambang') {
        const k = Math.max(0, Math.sin(time * 2.4 + t.id * 1.7)); if (k < 0.05) continue;
        const sx = t.x + (t.type === 'harta' ? 0.22 : 0.4); const sy = t.y - (t.type === 'harta' ? 0.32 : 0.0); const r = 0.16 * k;
        ctx.fillStyle = `rgba(255,250,200,${0.85 * k})`; ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.25, sy - r * 0.25); ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * 0.25, sy + r * 0.25); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.25, sy + r * 0.25); ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.25, sy - r * 0.25); ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // animasi warna menyebar saat petak direbut
    for (const c of caps) {
      const t = tiles[c.id]; const a = time - c.t0;
      if (!c.baked) { ctx.save(); ctx.clip(t.path); ctx.fillStyle = rgba(c.col, 0.5); ctx.beginPath(); ctx.arc(t.x, t.y + 0.15, 1.15 * easeOut(a / 0.9), 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(c.col, 0.9); ctx.lineWidth = 0.08; ctx.stroke(); ctx.restore(); }
      const drop = backOut(a / 0.45); const fade = a > 1.5 ? clamp(1 - (a - 1.5) / 0.6, 0, 1) : 1;
      if (t.capOf < 0) flagAt(t.x - 0.05, t.y + 0.3 - (1 - drop) * 1.6, c.col, 1.1, fade);
    }
    // benteng baru muncul
    for (const f of fortAnims) { const t = tiles[f.id]; const s = backOut((time - f.t0) / 0.6); const p = fortPos(t); drawFort(ctx, p[0], p[1], f.col, Math.max(0.01, s) * p[2]); }
    // sasaran yang sah
    if (phase === 'select' && valid.size && !isAI(turn)) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 4);
      for (const id of valid) {
        const t = tiles[id]; const enemy = t.owner >= 0 && t.owner !== turn && !buildMode;
        ctx.fillStyle = buildMode ? `rgba(103,232,249,${0.1 + 0.12 * pulse})` : enemy ? `rgba(255,120,120,${0.1 + 0.14 * pulse})` : `rgba(255,248,200,${0.12 + 0.16 * pulse})`;
        ctx.fill(t.pathIn);
        ctx.strokeStyle = buildMode ? '#67e8f9' : enemy ? `rgba(248,113,113,${0.7 + 0.3 * pulse})` : `rgba(253,224,71,${0.7 + 0.3 * pulse})`; ctx.lineWidth = 0.09; ctx.stroke(t.pathIn);
      }
      const hv = tiles[hover];
      if (hv && valid.has(hover)) { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill(hv.pathIn); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.12; ctx.stroke(hv.pathIn); }
    }
    const cu = tiles[cursor];
    if (cu && phase === 'select' && kbUsed) { ctx.setLineDash([0.22, 0.14]); ctx.lineDashOffset = -time * 1.2; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.13; ctx.stroke(cu.pathIn); ctx.setLineDash([]); }
    const tg = tiles[target];
    if (tg && ['aim', 'ask', 'resolve', 'ai'].includes(phase)) { const p = 0.5 + 0.5 * Math.sin(time * 6); ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * p})`; ctx.lineWidth = 0.12; ctx.stroke(tg.pathIn); }
    // bendera ibu kota berkibar
    for (const t of tiles) if (t.capOf >= 0 && T[t.owner] && !pendingCap(t.id)) flagAt(t.flag[0], t.flag[1], T[t.owner].color, 0.95);
    // garis bidik serangan
    if (aim && tiles[aim.a] && tiles[aim.b]) {
      const a = [tiles[aim.a].x, tiles[aim.a].y]; const b = [tiles[aim.b].x, tiles[aim.b].y];
      ctx.setLineDash([0.2, 0.15]); ctx.lineDashOffset = -time * 1.6; ctx.strokeStyle = aim.atk ? 'rgba(255,90,90,.9)' : rgba(aim.col, 0.9); ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 1; i <= 16; i++) { const p = bez(a, b, i / 16); ctx.lineTo(p[0], p[1]); } ctx.stroke(); ctx.setLineDash([]);
      const p1 = bez(a, b, 0.94); const ang = Math.atan2(b[1] - p1[1], b[0] - p1[0]); ctx.fillStyle = ctx.strokeStyle; ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0.05, 0); ctx.lineTo(-0.25, -0.15); ctx.lineTo(-0.25, 0.15); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // peluru meriam
    if (proj) {
      const u = clamp((time - proj.t0) / proj.dur, 0, 1);
      for (let k = 6; k >= 1; k--) { const p = bez(proj.a, proj.b, Math.max(0, u - k * 0.025)); ctx.fillStyle = `rgba(255,${180 - k * 15},80,${0.5 - k * 0.07})`; ctx.beginPath(); ctx.arc(p[0], p[1], 0.13 - k * 0.012, 0, TAU); ctx.fill(); }
      const p = bez(proj.a, proj.b, u); ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(p[0], p[1], 0.15, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(p[0] - 0.05, p[1] - 0.05, 0.045, 0, TAU); ctx.fill();
    }
    // perisai tangkisan
    for (const s of shields) {
      const t = tiles[s.id]; const p = clamp((time - s.t0) / 1.1, 0, 1);
      ctx.save(); ctx.translate(t.x, t.y); const sc = 0.9 + 0.5 * easeOut(p); ctx.scale(sc, sc); ctx.translate(-t.x, -t.y);
      ctx.fillStyle = `rgba(191,219,254,${0.45 * (1 - p)})`; ctx.fill(t.path); ctx.strokeStyle = rgba(s.col, 1 - p); ctx.lineWidth = 0.16 * (1 - p) + 0.02; ctx.stroke(t.path);
      ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 0.05; ctx.stroke(t.pathIn); ctx.restore();
    }
    drawParts();
  }
  function drawSky() {
    const cw = clamp(W * 0.2, 140, 320);
    for (const c of clouds) {
      const x = c.x * (W + cw * 2) - cw; const y = c.y * H; const w = cw * c.s; const h = w * 0.5;
      ctx.globalAlpha = 0.09; ctx.drawImage(cloudSh, x + w * 0.25, y + h * 0.6, w, h);
      ctx.globalAlpha = 0.3; ctx.drawImage(cloudC, x, y, w, h);
    }
    ctx.globalAlpha = 1;
    const sp = ((time * 0.05) % 1.8) - 0.4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(sp * W, H / 2); ctx.rotate(0.35); ctx.drawImage(shineC, -W * 0.13, -H, W * 0.26, H * 2); ctx.restore();
    if (flashA > 0.01) { ctx.fillStyle = `rgba(${flashC},${flashA})`; ctx.fillRect(0, 0, W, H); }
  }
  function draw() {
    if (!W || !H) return false;
    const built = ensureCaches();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(seaC, 0, 0, W, H);
    if (M && mapC) {
      let sx = 0; let sy = 0; if (shakeT > 0) { const k = shakeT / 0.45; sx = rnd(-1, 1) * shakeP * k; sy = rnd(-1, 1) * shakeP * k; }
      const k = fs * cam.z;
      ctx.setTransform(DPR * k, 0, 0, DPR * k, DPR * (view.cx - cam.x * k + sx), DPR * (view.cy - cam.y * k + sy));
      drawSea(); ctx.drawImage(mapC, M.cx0, M.cy0, M.cw, M.ch); drawLive();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    drawSky();
    return built;
  }

  /* ------------------------------ Loop (hanya saat perlu) ------------------------------ */
  let raf = 0; let last = 0; let acc = 0;
  // ms = rata-rata bergerak waktu update+gambar per frame (tanpa frame pembangunan cache)
  const perf = { ms: 0, max: 0, n: 0, sum: 0, builds: 0, buildMax: 0, slow: [], reset() { this.ms = 0; this.max = 0; this.n = 0; this.sum = 0; this.builds = 0; this.buildMax = 0; this.slow = []; } };
  const camMoving = () => Math.abs(cam.tx - cam.x) + Math.abs(cam.ty - cam.y) + Math.abs(cam.tz - cam.z) * 10 > 0.004;
  const busyAnim = () => caps.length || fortAnims.length || proj || shields.length || parts.length || flashA > 0.01 || shakeT > 0 || camMoving();
  const loopOn = () => phase !== 'idle' && phase !== 'over' && !document.hidden && W > 0;
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; acc += dt;
    const live = busyAnim() || phase === 'aim' || phase === 'resolve' || phase === 'ai';
    const iv = live ? 0 : QC.isBusy() ? 1 / 12 : 1 / 30; // diam = 30 fps, kuis terbuka = 12 fps
    if (acc >= iv - 0.002) {
      const t0 = performance.now(); let built = false;
      try { update(Math.min(acc, 1 / 15)); built = draw(); } catch (err) { console.error(err); }
      acc = 0; const el = performance.now() - t0;
      if (!built) { perf.ms = perf.ms ? perf.ms * 0.95 + el * 0.05 : el; perf.n++; perf.sum += el; perf.max = Math.max(perf.max, el); if (el > 8 && perf.slow.length < 20) perf.slow.push(`${el.toFixed(1)}ms ${phase} p${parts.length}`); }
    }
    if (loopOn()) raf = requestAnimationFrame(frame);
  }
  function redraw() { if (!raf) { try { draw(); } catch (e) { console.error(e); } } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && loopOn()) wake(); });
  function update(dt) {
    time += dt;
    const e = 1 - Math.exp(-dt * 3.4);
    cam.x += (cam.tx - cam.x) * e; cam.y += (cam.ty - cam.y) * e; cam.z += (cam.tz - cam.z) * e;
    for (let i = caps.length - 1; i >= 0; i--) { const c = caps[i]; const a = time - c.t0; if (!c.baked && a >= 0.9) { c.baked = true; mapDirty = true; } if (a > 2.2) caps.splice(i, 1); }
    for (let i = fortAnims.length - 1; i >= 0; i--) { const f = fortAnims[i]; if (time - f.t0 >= 0.65) { fortAnims.splice(i, 1); mapDirty = true; } }
    if (proj && time - proj.t0 >= proj.dur) { const b = proj.b; proj = null; impactAt(b[0], b[1]); }
    if (shields.length) shields = shields.filter((s) => time - s.t0 < 1.1);
    updParts(dt);
    for (const c of clouds) { c.x += c.v * dt; if (c.x > 1.05) { c.x = -0.05; c.y = 0.08 + Math.random() * 0.8; } }
    flashA = Math.max(0, flashA - dt * 2.5); shakeT = Math.max(0, shakeT - dt);
  }

  /* ------------------------------ Efek ------------------------------ */
  function impactAt(x, y) { sparks(x, y, 26, 4.5, ['#fff7cc', '#fde047', '#fb923c']); smoke(x, y, 12, '90,90,100', 0.9, 1.1); ringP(x, y, 1.4, 'rgba(255,230,180,1)', 0.5, 0.14); SND.impact(); shakeT = 0.45; shakeP = 7; flashA = 0.18; flashC = '255,230,190'; }
  function launch(src, tile) { const a = src ? [src.x, src.y - 0.3] : [tile.x - 3, tile.y - 4]; proj = { a, b: [tile.x, tile.y], t0: time, dur: 0.85 }; SND.launch(); if (src) smoke(a[0], a[1], 6, '230,230,235', 0.5, 0.8); wake(); }
  function floatAt(t, text, color, size = 34) { const c = clientOf(t); FX.floatText(c.x, c.y - 10, text, color, size); }
  function plantFx(t, col) { sparks(t.x, t.y, 18, 3.2, ['#ffffff', col, '#fde047']); ringP(t.x, t.y, 1.2, col, 0.6, 0.12); confettiP(t.x, t.y - 0.2, 14, [col, '#ffffff', '#fde047']); }
  function capitalFx(t, col) { confettiP(t.x, t.y, 60, [col, '#fde047', '#ffffff', '#f472b6', '#38bdf8']); ringP(t.x, t.y, 2.6, 'rgba(253,224,71,1)', 0.9, 0.2); QC.confetti(150); FX.fireworks(6, 240); SND.capital(); flashA = 0.35; flashC = '255,236,170'; }

  /* ------------------------------ Aturan & skor ------------------------------ */
  const tilesOf = (i) => M.tiles.filter((t) => t.owner === i);
  const fortCount = (i) => M.tiles.filter((t) => t.owner === i && t.fort).length;
  function scoreOf(i) { let s = T[i].bonus || 0; for (const t of M.tiles) if (t.owner === i) s += TT[t.type].val; const cap = M.tiles[T[i].cap]; if (cap && cap.owner === i) s += CAP_HOLD; return s; }
  function tileLabel(t) { if (t.capOf >= 0) return `Ibu Kota ${T[t.capOf] ? T[t.capOf].name : ''}`; if (t.type === 'biasa') return 'petak'; return `${TT[t.type].icon} ${TT[t.type].name}`; }
  function computeValid() {
    valid = new Set(); landing = false; if (!M || !T[turn]) return; const ti = turn;
    if (buildMode) { if (fortCount(ti) < MAX_FORT) for (const t of M.tiles) if (t.owner === ti && !t.fort && t.type !== 'gunung') valid.add(t.id); return; }
    for (const t of M.tiles) if (t.owner === ti) for (const n of t.nb) { const o = M.tiles[n].owner; if (o === ti || (peace() && o >= 0)) continue; valid.add(n); }
    if (!valid.size) { landing = true; for (const t of M.tiles) if (t.owner < 0) valid.add(t.id); }
  }
  function srcFor(ti, tile) {
    let best = null; let bd = 1e9;
    for (const t of M.tiles) if (t.owner === ti) { const d = Math.hypot(t.x - tile.x, t.y - tile.y) - (tile.nb.includes(t.id) ? 100 : 0); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  function invalidWhy(t) {
    const ti = turn;
    if (buildMode) { if (t.owner !== ti) return 'Mode Bangun Benteng: ketuk petakmu sendiri'; if (t.type === 'gunung') return 'Gunung sudah berbenteng alami'; if (t.fort) return 'Petak ini sudah punya benteng'; return `Benteng regumu sudah ${MAX_FORT} (maksimal)`; }
    if (t.owner === ti) return peace() ? 'Itu wilayahmu sendiri' : 'Itu wilayahmu. Mau memperkuat? Tekan 🏰 Bangun Benteng (B)';
    if (t.owner >= 0 && peace()) return 'Mode Damai: hanya petak netral yang bisa direbut';
    return 'Terlalu jauh! Pilih petak yang bersebelahan dengan wilayahmu';
  }
  function capture(tile, ti) {
    const prev = tile.owner; const tm = T[ti]; const info = { notes: [], capital: false, recap: false };
    const before = scoreOf(ti);
    tile.owner = ti;
    if (tile.fort && prev >= 0 && prev !== ti) { tile.fort = false; info.notes.push('🧱 Benteng lawan hancur'); }
    if (tile.type === 'harta') { tm.bonus += TT.harta.val; info.notes.push('⭐ Pulau Harta: poin ganda!'); }
    if (tile.type === 'mercu') { extraTurn = true; info.notes.push('🗼 Mercusuar: giliran ekstra!'); }
    if (tile.type === 'tambang') info.notes.push(`⛏️ Tambang: +${MINE_BONUS} poin tiap ronde`);
    if (tile.capOf >= 0) { if (tile.capOf !== ti) { tm.bonus += CAP_TAKE; info.capital = true; info.notes.push(`👑 Bonus Ibu Kota +${CAP_TAKE}`); if (T[tile.capOf]) info.notes.push(`${esc(T[tile.capOf].name)} kehilangan bonus ibu kota`); } else { info.recap = true; info.notes.push('👑 Ibu Kota kembali direbut!'); } }
    info.pts = scoreOf(ti) - before; info.prev = prev;
    caps.push({ id: tile.id, t0: time, col: tm.color, baked: false }); mapDirty = true;
    plantFx(tile, tm.color); SND.plant(); wake();
    return info;
  }

  /* ------------------------------ HUD ------------------------------ */
  let teamSig = ''; let kbUsed = false;
  function setText(el, v) { v = String(v); if (el && el.textContent !== v) el.textContent = v; }
  function setHTML(el, v) { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } }
  function renderInfo() {
    setText($('roundNo'), Math.min(round, S.rounds)); setText($('roundMax'), '/' + S.rounds);
    setText($('freeNo'), M ? M.tiles.filter((t) => t.owner < 0).length : 0);
    setText($('modeLbl'), peace() ? '🕊️ DAMAI' : '⚔️ SERBU');
  }
  function renderTeams(force) {
    const el = $('teams'); if (!M) return;
    const sig = [T.length, ...T.map((t) => t.name + t.avatar + t.color)].join('|');
    if (force || sig !== teamSig || el.children.length !== T.length) {
      teamSig = sig;
      el.style.setProperty('--n', T.length);
      el.innerHTML = T.map((t, i) => `<div class="team${t.ai ? ' ai' : ''}" style="--tc:${t.color}" id="team${i}"><span class="t-badge">▶ GILIRAN</span><div class="t-av">${t.avatar}</div>
        <div class="t-mid"><div class="t-name"><span>${esc(t.name)}</span>${t.ai ? '<em class="t-tag">KOMPUTER</em>' : ''}<span class="t-cap" title="Ibu Kota">👑</span></div>
        <div class="t-bar" title="Luas wilayah"><i></i><span class="t-pct">0%</span></div>
        <div class="t-row"><span class="st-tiles" title="Jumlah petak">⬢ 0</span><span class="st-fort" title="Benteng">🛡️ 0/${MAX_FORT}</span><span class="st-mine" title="Tambang emas">⛏️ 0</span></div></div>
        <div class="t-score"><b id="score${i}">0</b><small>POIN</small></div></div>`).join('');
      T.forEach((t, i) => { t.shown = scoreOf(i); setText($('score' + i), t.shown); });
    }
    const land = M.land;
    T.forEach((t, i) => {
      const c = $('team' + i); if (!c) return;
      const inPlay = !['idle', 'brief', 'over'].includes(phase);
      c.classList.toggle('active', inPlay && i === turn);
      const n = tilesOf(i).length; const pct = Math.round((n / land) * 100);
      c.querySelector('.t-bar i').style.width = pct + '%'; setText(c.querySelector('.t-pct'), pct + '%');
      setText(c.querySelector('.st-tiles'), '⬢ ' + n); setText(c.querySelector('.st-fort'), `🛡️ ${fortCount(i)}/${MAX_FORT}`);
      setText(c.querySelector('.st-mine'), '⛏️ ' + M.tiles.filter((x) => x.owner === i && x.type === 'tambang').length);
      const hasCap = M.tiles[t.cap] && M.tiles[t.cap].owner === i; const capEl = c.querySelector('.t-cap'); setText(capEl, hasCap ? '👑' : '💔'); capEl.title = hasCap ? `Memegang Ibu Kota (+${CAP_HOLD})` : 'Ibu Kota direbut lawan';
      const s = scoreOf(i);
      if (s !== t.shown) {
        const from = t.shown; t.shown = s; const sEl = $('score' + i);
        setTimeout(() => { FX.countUp(sEl, from, s); FX.floatTextAt(sEl, (s > from ? '+' : '') + (s - from), s > from ? '#4ade80' : '#f87171', 32); }, 40);
        c.classList.remove('gain', 'hit'); void c.offsetWidth; c.classList.add(s > from ? 'gain' : 'hit');
      }
    });
  }
  const HINT = {
    select: () => buildMode ? `🏰 <b>Mode Bangun Benteng</b>: ketuk petakmu sendiri yang ingin diperkuat <span class="k">(B = batal)</span>`
      : landing ? '🪂 Wilayahmu tak punya tetangga bebas — ketuk <b>petak netral mana pun</b> untuk mendarat'
        : peace() ? '👆 Ketuk petak <b class="y">netral</b> yang bersebelahan dengan wilayahmu (yang berkilau)'
          : '👆 Ketuk petak yang bersebelahan dengan wilayahmu • <b class="y">kuning</b> = netral • <b class="r">merah</b> = SERANG lawan',
    aim: () => '🎯 Bersiap…', ask: () => '❓ Jawab soalnya!', resolve: () => '⏳ Menentukan hasil…',
    result: () => '➜ Tekan <b>LANJUT</b> atau Spasi', ai: () => '☁️ Pasukan Kabut sedang bergerak…', between: () => '…',
    brief: () => 'Baca briefing, lalu tekan <b>MULAI</b>', over: () => '🏁 Permainan selesai', idle: () => ''
  };
  let hintTimer = 0;
  function renderHud() {
    const t = T[turn]; const showChip = t && !['idle', 'brief', 'over'].includes(phase);
    setHTML($('turnChip'), showChip ? `<span class="turn-chip" style="--tc:${t.color}"><i>${t.avatar}</i><span><small>GILIRAN</small><b>${esc(t.name)}</b></span></span>` : '');
    if (!hintTimer) { const h = $('hint'); const txt = (HINT[phase] || (() => ''))(); setHTML(h, txt ? `<span>${txt}</span>` : ''); h.classList.remove('bad'); h.classList.toggle('empty', !txt); }
    const dock = $('dock'); const canBuild = showChip && !t.ai && !peace();
    const nF = M && t ? fortCount(turn) : 0; const on = phase === 'select';
    const legend = `<div class="legend"><span>🏰 Ibu Kota</span><span>⛏️ +${MINE_BONUS}/ronde</span><span>🗼 Giliran ekstra</span><span>⛰️ Benteng alami</span><span>⭐ Poin ×2</span>${peace() ? '' : '<span>🛡️ Benteng: 2 soal</span>'}</div>`;
    setHTML(dock, (canBuild ? `<button class="dk-btn${buildMode ? ' on' : ''}" id="btnBuild" ${on && (buildMode || nF < MAX_FORT) ? '' : 'disabled'}><span class="ic">${buildMode ? '✖' : '🏰'}</span><span class="lb">${buildMode ? 'BATAL BANGUN' : 'BANGUN BENTENG'}</span><b>${nF}/${MAX_FORT}</b><kbd>B</kbd></button>` : '') + legend);
    const bb = $('btnBuild'); if (bb) bb.onclick = (e) => { e.currentTarget.blur(); toggleBuild(); };
    stage.classList.toggle('build', buildMode && on); stage.classList.toggle('resulting', phase === 'result');
  }
  function hintBad(t, msg) {
    const h = $('hint'); h._h = null; h.innerHTML = '✖ ' + esc(msg); h.classList.add('bad'); h.classList.remove('empty');
    h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake');
    clearTimeout(hintTimer); hintTimer = setTimeout(() => { hintTimer = 0; renderHud(); }, 2200);
    if (t) floatAt(t, '✖', '#fca5a5', 40); SND.invalid();
  }

  /* ------------------------------ Alur permainan ------------------------------ */
  async function openSetup() {
    gameSeq++; phase = 'idle'; buildMode = false; hideResult(); $('brief').hidden = true; resetFx();
    const p = QC.setup({
      logo: '🗺️', subtitle: 'Kuasai pulau-pulau dengan menjawab soal! Rebut petak netral, serang wilayah lawan, dan pertahankan Ibu Kotamu.',
      min: 1, max: 4, defaultCount: 2, soloLabel: '1 Regu vs Kabut', defaultNames: ['Regu Merah', 'Regu Biru', 'Regu Jingga', 'Regu Ungu'],
      settings: [
        { key: 'rounds', label: '🔁 Jumlah ronde', value: 8, options: [[5, '5 ronde'], [8, '8 ronde'], [10, '10 ronde'], [15, '15 ronde']] },
        { key: 'time', label: '⏱️ Waktu menjawab', value: 30, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik']] },
        { key: 'size', label: '🗺️ Ukuran peta', value: 'sedang', options: [['kecil', '🏝️ Kecil (±30 petak, 3 pulau)'], ['sedang', '🗺️ Sedang (±38 petak, 4 pulau)'], ['besar', '🌏 Besar (±45 petak, 5 pulau)']] },
        { key: 'attack', label: '⚔️ Serangan', value: 'on', options: [['on', '⚔️ Aktif (boleh menyerang lawan)'], ['off', '🕊️ Mode Damai (hanya petak netral)']] }
      ],
      rulesHtml: RULES_SHORT
    });
    const o = [...document.querySelectorAll('.qc-setup')].pop();
    if (o) {
      const h3 = o.querySelector('.qc-panel h3'); if (h3) h3.textContent = '👥 Jumlah Regu';
      o.querySelectorAll('.qc-seg button').forEach((b) => { if (+b.dataset.n > 1) b.textContent = b.dataset.n + ' Regu'; });
      const dt = o.querySelector('details.qc-rules'); if (dt) { const sm = dt.querySelector('summary'); if (sm) sm.textContent = '📜 Cara Main Singkat'; }
    }
    renderHud(); redraw();
    const r = await p;
    S = { ...S, ...r.settings }; if (!SIZES[S.size]) S.size = 'sedang';
    T = r.players.map((pl) => ({ ...pl, ai: false }));
    if (T.length === 1) T.push({ ...KABUT, id: 1 });
    newGame();
  }
  function resetFx() { caps.length = 0; fortAnims.length = 0; parts.length = 0; shields = []; proj = null; aim = null; target = -1; flashA = 0; shakeT = 0; }
  function newGame() {
    gameSeq++;
    T.forEach((t, i) => Object.assign(t, { id: i, bonus: 0, shown: 0 }));
    M = genMap(S.size, T.length); M.vert = null;
    T.forEach((t, i) => { const c = M.tiles.find((x) => x.capOf === i); t.cap = c ? c.id : -1; });
    round = 1; turn = 0; buildMode = false; extraTurn = false; landing = false; actLog = []; cursor = -1; hover = -1; lastEnd = '';
    resetFx(); cacheKey = ''; mapDirty = true; phase = 'brief';
    hideResult(); layout(); resetCam(true);
    renderTeams(true); renderInfo(); renderHud(); showBrief(); wake();
  }
  function showBrief() {
    const solo = T.some((t) => t.ai);
    $('brief').innerHTML = `<div class="brief-card"><span class="stampx">PETA PERANG KEPULAUAN</span><h2>REBUT WILAYAH!</h2>
      <p class="brief-sub">${solo ? 'Regumu melawan <b>Pasukan Kabut</b> yang perlahan menyelimuti pulau. Kuasai lebih banyak wilayah!' : 'Setiap regu mulai dari <b>Ibu Kota 🏰</b> di sudut peta. Kuasai pulau sebanyak-banyaknya!'}</p>
      <div class="brief-teams">${T.map((t) => `<span class="brief-team" style="--tc:${t.color}">${t.avatar} ${esc(t.name)}</span>`).join('<b class="vs">VS</b>')}</div>
      <ul class="brief-list">
        <li>👆 Ketuk petak yang <b>bersebelahan</b> dengan wilayahmu (berkilau). Jembatan & jalur laut ⛵ menghubungkan pulau.</li>
        <li>🚩 Petak <b>netral</b>: 1 soal benar = petak jadi milikmu (⛰️ gunung: 2 soal).</li>
        ${peace() ? '<li>🕊️ <b>Mode Damai</b>: tidak ada serangan — rebut petak netral sebanyak-banyaknya!</li>'
    : `<li>⚔️ Petak <b>lawan</b> = SERANGAN: kamu jawab dulu, lalu lawan dapat soal <b>TANGKIS</b>. Lawan salah = wilayah direbut!</li>
        <li>🏰 <b>Bangun Benteng</b> (B): perkuat petakmu — penyerang harus benar 2× berturut-turut.</li>`}
        <li>⛏️ +${MINE_BONUS}/ronde • 🗼 giliran ekstra • ⭐ poin ×2${peace() ? '' : ` • 👑 rebut Ibu Kota lawan +${CAP_TAKE}!`}</li>
        <li>🏁 <b>${S.rounds} ronde</b> • peta ${SIZES[S.size].name.toLowerCase()} (${M.land} petak) • ${S.time} detik per soal. Poin terbanyak menang!</li>
      </ul><button class="go-btn" id="btnGo">▶ MULAI<small>SPASI</small></button></div>`;
    $('brief').hidden = false;
    $('btnGo').onclick = (e) => { e.currentTarget.blur(); startMatch(); };
  }
  function startMatch() { if (phase !== 'brief') return; SND.ac(); QC.sfx.click(); $('brief').hidden = true; startTurn(); }
  function startTurn() {
    const t = T[turn]; buildMode = false; actLog = []; target = -1; aim = null; resetCam();
    renderTeams(); renderInfo();
    if (t.ai) { aiTurn(gameSeq); return; }
    phase = 'select'; computeValid();
    if (!valid.has(cursor)) cursor = [...valid][0] != null ? [...valid][0] : t.cap;
    renderHud();
    FX.announce(`GILIRAN: ${t.avatar} ${esc(t.name)}`, { color: t.color, sub: landing ? 'Mendarat di petak netral mana pun!' : `RONDE ${round}/${S.rounds} • pilih petak sasaran`, dur: 1250 });
    QC.sfx.whoosh(); wake();
  }
  function selectTile(id) {
    if (phase !== 'select' || QC.isBusy() || !M || isAI(turn)) return { ok: false, reason: 'busy' };
    const t = M.tiles[id]; if (!t) return { ok: false, reason: 'none' };
    cursor = id;
    if (!valid.has(id)) { const why = invalidWhy(t); hintBad(t, why); return { ok: false, reason: why }; }
    const gid = gameSeq; QC.sfx.click();
    if (buildMode) doBuild(t, gid); else if (t.owner < 0) doNeutral(t, gid); else doAttack(t, gid);
    return { ok: true, kind: buildMode ? 'bangun' : t.owner < 0 ? 'netral' : 'serang' };
  }
  async function askQ(team, badge, role) {
    const q = QC.nextQuestion(); curQ = q; phase = 'ask'; renderHud();
    const r = await QC.ask(q, { player: team, time: S.time, badge });
    actLog.push({ q, team, role, ok: !!r.correct, timedOut: !!r.timedOut }); curQ = null;
    return !!r.correct;
  }
  async function doNeutral(tile, gid) {
    const ti = turn; const tm = T[ti]; target = tile.id; actLog = [];
    phase = 'aim'; renderHud(); focus(tile); SND.select();
    const src = srcFor(ti, tile); if (src && !landing) aim = { a: src.id, b: tile.id, col: tm.color, atk: false };
    await sleep(700); if (gid !== gameSeq) return;
    const need = tile.type === 'gunung' ? 2 : 1; let ok = true;
    for (let i = 0; i < need && ok; i++) { ok = await askQ(tm, need > 1 ? `⛰️ Mendaki gunung ${i + 1}/${need}` : `🚩 Rebut ${tileLabel(tile)}`, 'rebut'); if (gid !== gameSeq) return; }
    aim = null; phase = 'resolve'; renderHud(); wake();
    if (ok) {
      const info = capture(tile, ti);
      FX.announce('🚩 WILAYAH DIREBUT!', { color: tm.color, sub: `${tm.avatar} ${esc(tm.name)} menguasai ${esc(tileLabel(tile))}`, dur: 1250 });
      await sleep(1000); if (gid !== gameSeq) return;
      showResult({ cls: 'ok', title: '🚩 WILAYAH DIREBUT!', pts: info.pts, sub: `${tm.name} menguasai ${tileLabel(tile)}.`, notes: info.notes });
    } else {
      SND.fail(); floatAt(tile, 'GAGAL', '#fca5a5', 36); smoke(tile.x, tile.y, 8, '220,220,230', 0.5);
      await sleep(600); if (gid !== gameSeq) return;
      showResult({ cls: 'bad', title: '✖ GAGAL MEREBUT', sub: need > 1 ? 'Pendakian gagal — gunung tetap netral. Giliran berpindah.' : 'Jawaban belum tepat — petak tetap netral. Giliran berpindah.' });
    }
  }
  async function doAttack(tile, gid) {
    const ti = turn; const att = T[ti]; const di = tile.owner; const def = T[di]; target = tile.id; actLog = [];
    phase = 'aim'; renderHud(); focus(tile, 1.2);
    const src = srcFor(ti, tile); aim = { a: src ? src.id : -1, b: tile.id, col: att.color, atk: true };
    SND.horn(); FX.announce('⚔️ SERANGAN!', { color: '#ef4444', sub: `${att.avatar} ${esc(att.name)} ➜ ${def.avatar} ${esc(def.name)}`, dur: 1300 });
    await sleep(380); if (gid !== gameSeq) return;
    launch(src, tile);
    await sleep(1150); if (gid !== gameSeq) return;
    const fortified = tile.fort || tile.type === 'gunung'; const need = fortified ? 2 : 1; let ok = true;
    for (let i = 0; i < need && ok; i++) { ok = await askQ(att, fortified ? `⚔️ Serangan ${i + 1}/2 • 🛡️ ${tile.fort ? 'berbenteng' : 'gunung'}` : '⚔️ Serangan', 'serang'); if (gid !== gameSeq) return; }
    phase = 'resolve'; renderHud(); wake();
    if (!ok) {
      aim = null; shields.push({ id: tile.id, t0: time, col: def.color }); SND.fail();
      await sleep(700); if (gid !== gameSeq) return;
      showResult({ cls: 'bad', title: '✖ SERANGAN GAGAL', sub: `${def.name} tetap menguasai ${tileLabel(tile)}.`, notes: fortified ? [tile.fort ? '🛡️ Benteng kokoh!' : '⛰️ Gunung sulit didaki'] : [] });
      return;
    }
    await FX.announce('🛡️ TANGKIS!', { color: def.color, sub: def.ai ? 'Pasukan Kabut mencoba menangkis…' : `${def.avatar} ${esc(def.name)} menjawab soal tangkisan`, dur: 1150 });
    if (gid !== gameSeq) return;
    let held;
    if (def.ai) { smoke(tile.x, tile.y, 14, '200,205,220', 0.7, 1.2); SND.mist(); await sleep(1000); if (gid !== gameSeq) return; held = Math.random() < KABUT_DEF; actLog.push({ ai: true, team: def, role: 'tangkis', ok: held }); }
    else { held = await askQ(def, '🛡️ TANGKIS! Pertahankan wilayahmu', 'tangkis'); if (gid !== gameSeq) return; }
    aim = null; phase = 'resolve'; renderHud(); wake();
    if (held) {
      shields.push({ id: tile.id, t0: time, col: def.color }); ringP(tile.x, tile.y, 1.8, rgba(def.color, 1), 0.7, 0.16); sparks(tile.x, tile.y, 18, 3, ['#bfdbfe', '#ffffff', def.color]);
      SND.shield(); FX.flash('rgba(147,197,253,.35)', 450);
      FX.announce('🛡️ BERTAHAN!', { color: def.color, sub: `${def.avatar} ${esc(def.name)} menangkis serangan`, dur: 1300 });
      await sleep(1000); if (gid !== gameSeq) return;
      showResult({ cls: 'hold', title: '🛡️ BERTAHAN!', sub: `${def.name} berhasil menangkis serangan ${att.name}. Wilayah tetap aman.` });
    } else {
      impactAt(tile.x, tile.y); const info = capture(tile, ti);
      if (info.capital) { capitalFx(tile, att.color); FX.announce('👑 IBU KOTA JATUH!', { color: '#f59e0b', sub: `${att.avatar} ${esc(att.name)} merebut Ibu Kota ${esc(def.name)}! +${CAP_TAKE}`, dur: 1800 }); }
      else FX.announce('⚔️ WILAYAH DIREBUT!', { color: att.color, sub: `${att.avatar} ${esc(att.name)} merebut ${esc(tileLabel(tile))} dari ${esc(def.name)}`, dur: 1300 });
      await sleep(info.capital ? 1500 : 1000); if (gid !== gameSeq) return;
      showResult({ cls: 'ok', title: info.capital ? '👑 IBU KOTA JATUH!' : '⚔️ WILAYAH DIREBUT!', pts: info.pts, sub: `${att.name} merebut ${tileLabel(tile)} dari ${def.name}.`, notes: info.notes });
    }
  }
  async function doBuild(tile, gid) {
    const ti = turn; const tm = T[ti]; target = tile.id; actLog = [];
    phase = 'aim'; renderHud(); focus(tile, 1.3); SND.select();
    await sleep(600); if (gid !== gameSeq) return;
    const ok = await askQ(tm, '🏰 Bangun Benteng', 'bangun'); if (gid !== gameSeq) return;
    buildMode = false; phase = 'resolve'; renderHud(); wake();
    if (ok) {
      tile.fort = true; fortAnims.push({ id: tile.id, t0: time, col: tm.color }); mapDirty = true;
      SND.build(); smoke(tile.x, tile.y + 0.2, 12, '170,150,120', 0.6, 0.9); sparks(tile.x, tile.y, 12, 2.5, ['#fde68a', '#ffffff']);
      FX.announce('🏰 BENTENG BERDIRI!', { color: tm.color, sub: 'Penyerang kini harus benar 2× berturut-turut', dur: 1250 });
      await sleep(1000); if (gid !== gameSeq) return;
      showResult({ cls: 'ok', title: '🏰 BENTENG BERDIRI!', sub: `${tm.name} memperkuat ${tileLabel(tile)} (${fortCount(ti)}/${MAX_FORT} benteng).`, notes: ['🛡️ Penyerang harus benar 2× berturut-turut'] });
    } else {
      SND.fail(); smoke(tile.x, tile.y, 8, '200,190,170', 0.5); await sleep(500); if (gid !== gameSeq) return;
      showResult({ cls: 'bad', title: '🧱 PEMBANGUNAN GAGAL', sub: 'Jawaban belum tepat — benteng batal dibangun.' });
    }
  }
  async function aiTurn(gid) {
    const ai = T[turn]; phase = 'ai'; renderHud(); renderTeams(); wake();
    FX.announce(`GILIRAN: ${ai.avatar} ${esc(ai.name)}`, { color: ai.color, sub: 'Kabut merayap ke petak netral…', dur: 1200 });
    await sleep(1100); if (gid !== gameSeq) return;
    const ti = turn; let cand = [];
    for (const t of M.tiles) if (t.owner === ti) for (const n of t.nb) if (M.tiles[n].owner < 0 && !cand.includes(n)) cand.push(n);
    if (!cand.length) cand = M.tiles.filter((t) => t.owner < 0).map((t) => t.id);
    if (!cand.length) { await sleep(300); if (gid === gameSeq) next(true); return; }
    const pickFrom = cand.flatMap((id) => (M.tiles[id].type !== 'biasa' ? [id, id] : [id]));
    const tile = M.tiles[QC.pick(pickFrom)]; target = tile.id; focus(tile, 1.15);
    const src = srcFor(ti, tile); if (src) aim = { a: src.id, b: tile.id, col: ai.color, atk: false };
    smoke(tile.x, tile.y, 16, '210,215,230', 0.8, 1.3); SND.mist();
    await sleep(1100); if (gid !== gameSeq) return;
    aim = null;
    if (Math.random() < KABUT_RATE) {
      const info = capture(tile, ti); floatAt(tile, '☁️ +' + info.pts, '#e2e8f0', 34);
      if (info.capital) FX.announce('👑 IBU KOTA DISELIMUTI KABUT!', { color: ai.color, dur: 1500 });
    } else { floatAt(tile, '☁️ gagal', '#cbd5e1', 30); SND.fail(); }
    renderTeams(); renderInfo();
    await sleep(1200); if (gid !== gameSeq) return;
    next(true);
  }
  function showResult(r) {
    resultInfo = r; phase = 'result'; canNextAt = performance.now() + 350;
    const lastQ = [...actLog].reverse().find((l) => l.q);
    const logHtml = actLog.map((l) => `<span class="lg ${l.ok ? 'ok' : 'no'}" style="--tc:${l.team.color}">${l.team.avatar} ${ROLE[l.role] || ''} ${l.ok ? '✔' : l.timedOut ? '⏰' : '✘'}</span>`).join('<i>›</i>');
    const q = lastQ && lastQ.q;
    rcard.innerHTML = `<div class="rc-head"><span class="rc-title">${r.title}</span>${r.pts ? `<span class="rc-pts">+${r.pts} poin</span>` : ''}</div>
      <div class="rc-sub">${esc(r.sub)}</div>${r.notes && r.notes.length ? `<div class="rc-notes">${r.notes.map((n) => `<span>${n}</span>`).join('')}</div>` : ''}
      ${logHtml ? `<div class="rc-log">${logHtml}</div>` : ''}
      ${q ? `<div class="rc-ans">Jawaban benar${actLog.filter((l) => l.q).length > 1 ? ' (soal terakhir)' : ''}: <span class="kc">${q.correct}</span><b>${esc(q['option' + q.correct])}</b></div>${q.explanation ? `<div class="rc-exp">💡 ${esc(q.explanation)}</div>` : ''}` : ''}
      <div class="rc-act"><button class="next-btn" id="btnNext">LANJUT ➜<small>SPASI</small></button></div>`;
    rcard.className = 'rcard ' + r.cls; rcard.hidden = false;
    $('btnNext').onclick = (e) => { e.currentTarget.blur(); next(); };
    renderHud(); renderTeams(); renderInfo(); wake();
    // geser kamera agar petak sasaran tetap terlihat di atas kartu hasil
    const t = M.tiles[target];
    if (t) { const k = fs * cam.tz; const cardTop = rcard.offsetTop; const sy = view.cy + (t.y - cam.ty) * k; if (sy > cardTop - 50) { const want = Math.max(view.y + 40, (view.y + cardTop) / 2); cam.ty = t.y - (want - view.cy) / k; } }
  }
  function hideResult() { rcard.hidden = true; rcard.innerHTML = ''; }
  function checkEnd() {
    if (!M.tiles.some((t) => t.owner < 0)) return 'penuh';
    const capsT = M.tiles.filter((t) => t.capOf >= 0);
    if (capsT.length >= 2 && capsT.every((t) => t.owner === capsT[0].owner)) return 'ibukota';
    return null;
  }
  async function next(auto) {
    if (!auto && (phase !== 'result' || performance.now() < canNextAt || QC.isBusy())) return;
    const gid = gameSeq; if (!auto) QC.sfx.click();
    hideResult(); resetCam(); phase = 'between'; target = -1; renderHud(); wake();
    const end = checkEnd(); if (end) { endGame(end); return; }
    if (extraTurn) {
      extraTurn = false; SND.round(); await FX.announce('🗼 GILIRAN EKSTRA!', { color: '#fde047', sub: `${T[turn].avatar} ${esc(T[turn].name)} jalan lagi`, dur: 1300 });
      if (gid !== gameSeq) return; startTurn(); return;
    }
    turn++;
    if (turn >= T.length) {
      turn = 0; round++;
      if (round > S.rounds) { endGame('ronde'); return; }
      renderInfo(); renderTeams(); SND.round();
      const mines = M.tiles.filter((t) => t.type === 'tambang' && t.owner >= 0);
      await FX.announce(`RONDE ${round}`, { color: '#0ea5e9', sub: round === S.rounds ? 'RONDE TERAKHIR!' : `${S.rounds - round + 1} ronde lagi${mines.length ? ' • ⛏️ tambang menghasilkan emas' : ''}`, dur: 1300 });
      if (gid !== gameSeq) return;
      if (mines.length) { mines.forEach((t, i) => { T[t.owner].bonus += MINE_BONUS; setTimeout(() => { if (gid === gameSeq) { floatAt(t, `+${MINE_BONUS} ⛏️`, '#fde047', 30); sparks(t.x, t.y, 8, 2, ['#fde047', '#fff']); wake(); } }, i * 160); }); QC.sfx.coin(); renderTeams(); }
    }
    startTurn();
  }
  function endGame(reason) {
    phase = 'over'; buildMode = false; lastEnd = reason; hideResult(); resetCam(true); aim = null; target = -1;
    renderHud(); renderTeams(); renderInfo(); redraw();
    const ranking = T.map((t, i) => ({ player: t, value: scoreOf(i), n: tilesOf(i).length })).sort((a, b) => b.value - a.value || b.n - a.n);
    const tie = ranking.length > 1 && ranking[0].value === ranking[1].value && ranking[0].n === ranking[1].n;
    const solo = T.some((t) => t.ai);
    const title = tie ? 'SERI!' : solo && ranking[0].player.ai ? '☁️ KABUT MENANG…' : `${esc(ranking[0].player.name)} JUARA!`;
    const why = { ronde: `${S.rounds} ronde selesai`, penuh: 'Semua petak sudah dikuasai', ibukota: 'Satu regu menguasai semua Ibu Kota' }[reason] || '';
    const note = `${why} • ${esc(ranking[0].player.name)} menguasai ${ranking[0].n}/${M.land} petak (${Math.round((ranking[0].n / M.land) * 100)}%)`;
    QC.showWinner({ title, ranking: ranking.map((r) => ({ player: r.player, value: r.value })), unit: 'poin', note }).then((v) => (v === 'setup' ? openSetup() : newGame()));
  }
  function toggleBuild() {
    if (phase !== 'select' || isAI(turn) || peace() || QC.isBusy()) return;
    if (!buildMode && fortCount(turn) >= MAX_FORT) { hintBad(null, `Benteng regumu sudah ${MAX_FORT} (maksimal)`); return; }
    buildMode = !buildMode; computeValid();
    if (buildMode && !valid.size) { buildMode = false; computeValid(); hintBad(null, 'Tidak ada petakmu yang bisa diberi benteng'); return; }
    if (!valid.has(cursor)) cursor = [...valid][0];
    SND.select(); renderHud(); wake();
  }

  /* ------------------------------ Masukan ------------------------------ */
  function stagePt(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  let down = null;
  cv.addEventListener('pointerdown', (e) => { SND.ac(); down = { id: e.pointerId, ...stagePt(e) }; });
  cv.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return; const p = stagePt(e); const d = down; down = null;
    if (Math.hypot(p.x - d.x, p.y - d.y) > 18 || phase !== 'select') return;
    const t = tileAt(p.x, p.y); if (!t) return; kbUsed = false; selectTile(t.id);
  });
  cv.addEventListener('pointercancel', () => { down = null; });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || phase !== 'select') { if (hover >= 0) hover = -1; return; }
    const p = stagePt(e); const t = tileAt(p.x, p.y); const id = t ? t.id : -1;
    if (id !== hover) { hover = id; cv.classList.toggle('hot', id >= 0 && valid.has(id)); }
  });
  cv.addEventListener('pointerleave', () => { hover = -1; cv.classList.remove('hot'); });
  function moveCursor(dx, dy) {
    if (!M) return; const cur = M.tiles[cursor] || M.tiles[T[turn].cap] || M.tiles[0]; let best = null; let bs = 1e9;
    for (const t of M.tiles) {
      if (t === cur) continue; const vx = t.x - cur.x; const vy = t.y - cur.y; const d = Math.hypot(vx, vy); const dot = (vx * dx + vy * dy) / d;
      if (dot < 0.45) continue; let s = d * (2.2 - dot); if (valid.has(t.id)) s *= 0.8; if (s < bs) { bs = s; best = t; }
    }
    if (best) { cursor = best.id; kbUsed = true; SND.cursor(); wake(); }
  }
  QC.onKey = (e) => {
    const key = e.key; const up = key.length === 1 ? key.toUpperCase() : key;
    if (up === 'M') { toggleMusic(); return; }
    if (key === ' ' || key === 'Enter') {
      e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (phase === 'brief') startMatch(); else if (phase === 'result') next();
      else if (phase === 'select' && key === 'Enter') { if (cursor >= 0) { kbUsed = true; selectTile(cursor); } }
      return;
    }
    if (phase !== 'select') return;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
    if (dir) { e.preventDefault(); if (!kbUsed && M.tiles[cursor]) { kbUsed = true; wake(); } else moveCursor(dir[0], dir[1]); return; }
    if (up === 'B') toggleBuild();
    else if (key === 'Escape' && buildMode) toggleBuild();
  };
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); QC.modal({ icon: '📜', title: 'Peraturan Rebut Wilayah', html: `<div class="rules-pop">${RULES}</div>`, cls: 'rw-rules' }); };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur();
    if (!['idle', 'over'].includes(phase)) {
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Permainan yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) return;
    }
    openSetup();
  };

  /* ------------------------------ Ukuran layar ------------------------------ */
  let relayoutQ = false;
  function relayout() { relayoutQ = false; layout(); redraw(); if (loopOn()) wake(); }
  function queueRelayout() { if (!relayoutQ) { relayoutQ = true; requestAnimationFrame(relayout); } }
  addEventListener('resize', queueRelayout);
  if (window.ResizeObserver) { const ro = new ResizeObserver(queueRelayout); [stage, $('hud'), $('dock')].forEach((el) => ro.observe(el)); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cacheKey = ''; queueRelayout(); });

  /* ------------------------------ Kait pengujian ------------------------------ */
  window.__RW = {
    perf,
    get phase() { return phase; },
    state: () => ({
      phase, round, maxRounds: S.rounds, turn, mode: peace() ? 'damai' : 'serang', size: S.size, buildMode, landing, extraTurn, lastEnd,
      teams: T.map((t, i) => ({ name: t.name, ai: !!t.ai, color: t.color, score: M ? scoreOf(i) : 0, bonus: t.bonus, tiles: M ? tilesOf(i).length : 0, forts: M ? fortCount(i) : 0, cap: t.cap, hasCap: !!(M && M.tiles[t.cap] && M.tiles[t.cap].owner === i) })),
      owners: M ? M.tiles.map((t) => t.owner) : [], tiles: M ? M.tiles.map((t) => ({ id: t.id, type: t.type, owner: t.owner, fort: t.fort, capOf: t.capOf, nb: [...t.nb] })) : [],
      valid: [...valid], land: M ? M.land : 0, islands: M ? M.nI : 0, lanes: M ? M.lanes.map((l) => [l.a, l.b, l.kind]) : [], vert: M ? M.vert : null,
      parts: parts.length, running: !!raf, W, H, fs: +fs.toFixed(1), hexPx: +(fs * 2).toFixed(1), resultShown: !rcard.hidden, question: curQ ? curQ.question : null
    }),
    tilePoint(id) { const t = M && M.tiles[id]; return t ? clientOf(t) : null; },
    select: (id) => selectTile(id),
    build: () => { toggleBuild(); return buildMode; },
    async answer(correct) {
      let o = null;
      for (let i = 0; i < 120; i++) { o = [...document.querySelectorAll('.qc-overlay.qc-ask.show')].find((x) => x.querySelector('.qc-opt:not(:disabled)')); if (o && curQ) break; await sleep(50); }
      if (!o || !curQ) return false;
      const keys = QC.optionsOf(curQ); const k = correct ? curQ.correct : keys.find((x) => x !== curQ.correct);
      o.querySelector(`.qc-opt[data-k="${k}"]`).click(); await sleep(80);
      const nb = o.querySelector('[data-next]'); if (nb) nb.click(); await sleep(60);
      return true;
    },
    async waitPhase(p, ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if ((Array.isArray(p) ? p : [p]).includes(phase)) return true; await sleep(40); } return false; },
    next: () => next(), start: () => startMatch(), key: (k) => QC.onKey({ key: k, preventDefault() {} }),
    give(id, team) { const t = M.tiles[id]; if (!t) return false; t.owner = team; mapDirty = true; if (phase === 'select') computeValid(); renderTeams(); renderInfo(); wake(); return true; },
    setTurn(i) { turn = i; if (phase === 'select') { buildMode = false; computeValid(); renderHud(); renderTeams(); } return turn; },
    setRound(n) { round = n; renderInfo(); return round; },
    fps: () => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); })(); })
  };

  // peta pratinjau di belakang layar pengaturan
  M = genMap('sedang', 2); layout(); redraw();
  openSetup();
})();
