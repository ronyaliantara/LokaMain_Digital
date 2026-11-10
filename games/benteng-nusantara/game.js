/* ==========================================================================
   Benteng Nusantara — TOWER DEFENSE KUIS KELAS (1–4 tim, kooperatif)
   - Satu kelas mempertahankan SATU benteng bersama. Emas didapat dengan
     menjawab soal di panel samping (benar = emas + bonus cepat + combo;
     salah = 0 emas dan Kabut Lupa memperlambat menara sebentar).
   - Tim bergiliran menjawab; jawaban benar tiap tim dicatat untuk MVP.
   - Ketuk petak batu -> bangun menara (Pemanah, Meriam, Penyihir Es, Petir),
     tingkatkan sampai level 3, atur mode bidik, atau jual.
   - Gelombang musuh orisinal (Kabut Lupa, Kalong Raksasa, Golem Batu,
     Jamur Kantuk yang pecah jadi spora) + bos Raja Kabut tiap 5 gelombang.
   - Gong Semangat: terisi dari jawaban benar, pukul untuk memacu menara.
   Grafis 100% kode (Canvas 2D). Peta & menara di-cache ke kanvas cadangan.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const TAU = Math.PI * 2;

  QC.init({ gameId: 'benteng-nusantara', title: 'Benteng Nusantara', avatars: ['🦅', '🐯', '🦎', '🦜', '🐘', '🦏', '🐒', '🐢'], colors: ['#e5484d', '#3b82f6', '#16a34a', '#f59e0b'] });

  /* ============================== DATA ============================== */
  const WW = 1200; const WH = 860; // ukuran dunia (logis)
  const ROUTE = [[-80, 190], [210, 190], [210, 560], [450, 560], [450, 300], [720, 300], [720, 690], [960, 690], [960, 420], [1072, 420]];
  const SLOTS = [[124, 100], [110, 330], [330, 268], [330, 452], [138, 626], [330, 672], [510, 192], [792, 226], [840, 388], [840, 572], [985, 316], [1078, 636], [840, 792], [690, 792]].map(([x, y], i) => ({ i, x, y }));
  const RIVER = [[648, 96], [628, 160], [604, 228], [588, 300], [596, 430], [578, 560], [564, 680], [588, 800], [622, 900]];
  const SLOT_R = 34; const HIT_R = 50; const ROAD_W = 62;

  const TW = {
    archer: { name: 'Menara Pemanah', short: 'Pemanah', icon: '🏹', desc: 'Cepat & murah', cost: [60, 50, 80], dmg: [11, 17, 26], rate: [0.62, 0.52, 0.42], range: [150, 165, 185] },
    cannon: { name: 'Meriam Lela', short: 'Meriam', icon: '💣', desc: 'Ledakan area • tak kena terbang', cost: [100, 80, 130], dmg: [26, 42, 66], splash: [56, 66, 80], rate: [1.75, 1.6, 1.45], range: [165, 178, 196] },
    ice: { name: 'Penyihir Es', short: 'Penyihir Es', icon: '❄️', desc: 'Memperlambat musuh', cost: [80, 60, 100], dmg: [5, 8, 12], slow: [0.42, 0.52, 0.62], slowDur: [1.6, 2.0, 2.5], area: [0, 42, 62], rate: [1.0, 0.9, 0.78], range: [140, 155, 172] },
    bolt: { name: 'Menara Petir', short: 'Petir', icon: '⚡', desc: 'Merambat • tembus zirah', cost: [150, 110, 170], dmg: [28, 40, 58], chain: [3, 4, 6], rate: [1.5, 1.35, 1.2], range: [160, 175, 195] }
  };
  const TW_ORDER = ['archer', 'cannon', 'ice', 'bolt'];
  const EN = {
    kabut: { name: 'Kabut Lupa', hp: 34, spd: 52, armor: 0, gold: 2, dmg: 1, r: 19, box: 64, col: '#a78bfa' },
    kalong: { name: 'Kalong Raksasa', hp: 24, spd: 86, armor: 0, gold: 2, dmg: 1, r: 17, box: 84, fly: true, col: '#7c5a9c' },
    golem: { name: 'Golem Batu', hp: 120, spd: 33, armor: 3, gold: 5, dmg: 2, r: 25, box: 76, col: '#a8a29e' },
    jamur: { name: 'Jamur Kantuk', hp: 58, spd: 44, armor: 0, gold: 3, dmg: 1, r: 20, box: 64, split: 2, col: '#ef4444' },
    spora: { name: 'Spora', hp: 14, spd: 68, armor: 0, gold: 1, dmg: 1, r: 11, box: 36, col: '#bef264' },
    boss: { name: 'Raja Kabut', hp: 720, spd: 27, armor: 4, gold: 60, dmg: 6, r: 42, box: 132, boss: true, col: '#7e22ce' }
  };
  const DIFF = { mudah: { hp: 0.78, n: 0.85, fort: 25 }, sedang: { hp: 1, n: 1, fort: 20 }, sulit: { hp: 1.3, n: 1.15, fort: 15 } };
  const RULES = `<ul>
    <li>🏰 Satu kelas mempertahankan <b>satu benteng</b> bersama. Musuh berjalan di jalan tanah menuju benteng; tiap musuh yang lolos mengurangi nyawa benteng.</li>
    <li>📜 Jawab soal di <b>panel kanan</b> kapan saja untuk mendapat <b>emas</b>: benar = <b>30 emas</b> + bonus cepat + bonus <b>combo</b> 🔥. Salah = 0 emas & <b>Kabut Lupa</b> ☁️ membuat semua menara menembak 30% lebih lambat selama 6 detik.</li>
    <li>👥 Tim <b>bergiliran</b> menjawab (lihat “Giliran menjawab”). Emas dipakai <b>bersama</b>. Jawaban benar terbanyak = <b>MVP</b>.</li>
    <li>🔨 Ketuk <b>petak batu</b> di tepi jalan untuk membangun: 🏹 <b>Pemanah</b> (cepat, murah) • 💣 <b>Meriam</b> (ledakan area, tak bisa kena musuh terbang) • ❄️ <b>Penyihir Es</b> (memperlambat) • ⚡ <b>Petir</b> (merambat, tembus zirah). Ketuk menara untuk <b>naik level</b> (maks 3), ganti <b>mode bidik</b>, atau <b>jual</b>.</li>
    <li>🔔 <b>Gong Semangat</b> terisi dari jawaban benar. Saat penuh, pukul (tombol / <kbd>G</kbd>) → semua menara menembak jauh lebih cepat 8 detik & kabut hilang.</li>
    <li>🌊 Tekan <b>MULAI GELOMBANG</b> bila siap. Tiap 5 gelombang datang bos <b>Raja Kabut</b> 👑. Bertahan sampai gelombang terakhir = <b>MENANG!</b></li>
    <li>⌨️ <kbd>1</kbd>–<kbd>4</kbd> / <kbd>A</kbd>–<kbd>D</kbd> jawab • <kbd>Enter</kbd> soal berikutnya • <kbd>Spasi</kbd> mulai gelombang • <kbd>X</kbd> kecepatan 1×/2× • <kbd>P</kbd> jeda • <kbd>G</kbd> gong • <kbd>Esc</kbd> tutup menu.</li></ul>`;

  /* ============================== AUDIO ============================== */
  let AC = null;
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f, d, type, v, f2, delay = 0) {
    if (QC.muted) return; const a = audio(); if (!a) return;
    const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  }
  const SND = {
    twang: () => { tone(880, 0.07, 'triangle', 0.035, 420); },
    thump: () => { tone(140, 0.22, 'sine', 0.16, 50); tone(70, 0.3, 'square', 0.03, 40); },
    chime: () => { tone(1568, 0.16, 'sine', 0.05, 2093); tone(2349, 0.12, 'sine', 0.025, null, 0.03); },
    zap: () => { tone(1200, 0.12, 'sawtooth', 0.04, 160); tone(600, 0.1, 'square', 0.025, 2400, 0.02); },
    build: () => { tone(220, 0.08, 'square', 0.06, 160); tone(330, 0.08, 'square', 0.05, 240, 0.08); tone(784, 0.18, 'triangle', 0.08, null, 0.16); },
    gong: () => { tone(98, 2.2, 'sine', 0.3, 92); tone(196, 1.4, 'sine', 0.1, 190); tone(272, 1.0, 'sine', 0.05); },
    horn: () => { tone(110, 0.9, 'sawtooth', 0.06, 98); tone(146, 0.9, 'sawtooth', 0.04, 130, 0.05); }
  };
  const sfxLast = {};
  function sfx(name, gap = 0.07) {
    const t = performance.now(); if (t - (sfxLast[name] || 0) < gap * 1000) return; sfxLast[name] = t;
    if (SND[name]) SND[name](); else if (QC.sfx[name]) QC.sfx[name]();
  }

  /* Musik latar ringan bergaya gamelan (tangga nada slendro) */
  const Music = (() => {
    let master = null; let timer = null; let next = 0; let step = 0;
    let on = true; try { on = localStorage.getItem('lokamain_bn_music') !== 'off'; } catch (e) { /* abaikan */ }
    const SL = [1, 1.1487, 1.3195, 1.5157, 1.7411, 2];
    const base = 293.66;
    const MEL = [[0, -1, 2, 1, 2, -1, 3, 2, 4, -1, 3, 2, 1, -1, 0, -1], [2, -1, 3, 4, 5, -1, 4, 3, 2, -1, 1, 2, 0, -1, -1, -1]];
    function bell(f, t, d, v) {
      const o1 = AC.createOscillator(); const o2 = AC.createOscillator(); const g = AC.createGain(); const g2 = AC.createGain();
      o1.type = 'sine'; o1.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.76; g2.gain.value = 0.22;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o1.connect(g); o2.connect(g2).connect(g); g.connect(master); o1.start(t); o2.start(t); o1.stop(t + d + 0.05); o2.stop(t + d + 0.05);
    }
    function tick() {
      const spb = 0.21;
      while (next < AC.currentTime + 0.3) {
        const bar = Math.floor(step / 16) % 4; const s = step % 16; const mel = MEL[bar % 2];
        if (mel[s] >= 0) bell(base * SL[mel[s]], next, 0.55, 0.2);
        if (s % 4 === 0) bell(base / 2 * SL[[0, 3, 1, 4][s / 4]], next, 1.0, 0.14);
        if (s === 0 && bar % 2 === 0) bell(73.4, next, 2.6, 0.32);
        next += spb; step++;
      }
    }
    return {
      get on() { return on; },
      start() {
        if (!on || QC.muted || timer) return; const a = audio(); if (!a) return;
        if (!master) { master = a.createGain(); master.gain.value = 0.05; master.connect(a.destination); }
        next = a.currentTime + 0.08; timer = setInterval(tick, 80);
      },
      stop() { clearInterval(timer); timer = null; },
      toggle() { on = !on; try { localStorage.setItem('lokamain_bn_music', on ? 'on' : 'off'); } catch (e) { /* abaikan */ } if (on && (phase === 'build' || phase === 'wave')) this.start(); else this.stop(); return on; }
    };
  })();
  function syncMusicBtn() { $('btnMusic').classList.toggle('off', !Music.on || QC.muted); }
  $('btnMusic').onclick = () => { Music.toggle(); syncMusicBtn(); QC.sfx.click(); };
  document.querySelector('[data-qc="sound"]').addEventListener('click', () => { if (QC.muted) Music.stop(); else if (phase === 'build' || phase === 'wave') Music.start(); syncMusicBtn(); });
  syncMusicBtn();

  /* ============================== JALUR & SUNGAI ============================== */
  const PATH = []; let LEN = 0;
  (function buildPath() {
    const pts = [{ x: ROUTE[0][0], y: ROUTE[0][1] }]; const R0 = 58;
    for (let i = 1; i < ROUTE.length - 1; i++) {
      const [ax, ay] = ROUTE[i - 1]; const [bx, by] = ROUTE[i]; const [cx, cy] = ROUTE[i + 1];
      const l1 = Math.hypot(bx - ax, by - ay); const l2 = Math.hypot(cx - bx, cy - by); const r = Math.min(R0, l1 / 2, l2 / 2);
      const p1 = { x: bx - ((bx - ax) / l1) * r, y: by - ((by - ay) / l1) * r }; const p2 = { x: bx + ((cx - bx) / l2) * r, y: by + ((cy - by) / l2) * r };
      for (let k = 0; k <= 10; k++) { const t = k / 10; const u = 1 - t; pts.push({ x: u * u * p1.x + 2 * u * t * bx + t * t * p2.x, y: u * u * p1.y + 2 * u * t * by + t * t * p2.y }); }
    }
    const L = ROUTE[ROUTE.length - 1]; pts.push({ x: L[0], y: L[1] });
    let d = 0; pts.forEach((p, i) => { if (i) d += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y); p.d = d; PATH.push(p); });
    LEN = d;
  })();
  const RPTS = (function () { // sungai: Catmull-Rom halus
    const out = []; const P = RIVER;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)]; const p1 = P[i]; const p2 = P[i + 1]; const p3 = P[Math.min(P.length - 1, i + 2)];
      for (let k = 0; k < 12; k++) {
        const t = k / 12; const t2 = t * t; const t3 = t2 * t;
        const f = (a, b, c, d2) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d2) * t2 + (-a + 3 * b - 3 * c + d2) * t3);
        out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
      }
    }
    out.push({ x: P[P.length - 1][0], y: P[P.length - 1][1] });
    return out;
  })();
  function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax; const dy = by - ay; const l = dx * dx + dy * dy || 1; const t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
  function polyDist(pts, x, y) { let m = 1e9; for (let i = 1; i < pts.length; i++) m = Math.min(m, segDist(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y)); return m; }
  const pathDist = (x, y) => polyDist(PATH, x, y);
  const riverDist = (x, y) => polyDist(RPTS, x, y);
  function posAt(d) { // posisi pada jalur untuk jarak d (dipakai prediksi meriam)
    d = clamp(d, 0, LEN); let lo = 0; let hi = PATH.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PATH[m].d <= d) lo = m; else hi = m; }
    const a = PATH[lo]; const b = PATH[hi]; const t = (d - a.d) / ((b.d - a.d) || 1);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }
  function free(x, y, m) { // tempat kosong untuk dekorasi
    if (x < -10 || x > WW + 10 || y < -10 || y > WH + 10) return false;
    if (pathDist(x, y) < ROAD_W / 2 + m) return false;
    if (riverDist(x, y) < 44 + m) return false;
    for (const s of SLOTS) if (Math.hypot(s.x - x, s.y - y) < SLOT_R + 6 + m) return false;
    if (x > 1030 - m && y > 230 - m && y < 565 + m) return false; // benteng
    return true;
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ============================== HELPER GAMBAR ============================== */
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); }
  function rrect(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function polyline(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); }
  const FONT = '"Baloo 2", Nunito, system-ui, sans-serif';

  /* ============================== PETA (statis, di-cache) ============================== */
  function paintMap(g) {
    const R = rng(20261110);
    g.save(); rrect(g, 0, 0, WW, WH, 28); g.clip();
    // rumput dasar
    let gr = g.createLinearGradient(0, 0, 0, WH); gr.addColorStop(0, '#8ccf62'); gr.addColorStop(1, '#5fae4a'); g.fillStyle = gr; g.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 30; i++) {
      const x = R() * WW; const y = R() * WH; const r = 60 + R() * 150; const rg = g.createRadialGradient(x, y, 0, x, y, r); const light = R() < 0.5;
      rg.addColorStop(0, light ? 'rgba(214,245,150,.25)' : 'rgba(36,104,48,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    paintMountains(g, R);
    paintSawah(g, R);
    paintKebun(g, R);
    paintRiver(g, R);
    paintTufts(g, R);
    paintRoad(g, R);
    paintBridge(g);
    paintDecor(g, R);
    paintCave(g, R);
    paintFort(g);
    paintSigns(g);
    const vg = g.createRadialGradient(WW / 2, WH / 2, WH * 0.42, WW / 2, WH / 2, WW * 0.74); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(18,34,8,.38)'); g.fillStyle = vg; g.fillRect(0, 0, WW, WH);
    g.restore();
    // bingkai kayu + garis emas
    rrect(g, 3, 3, WW - 6, WH - 6, 26); g.lineWidth = 7; g.strokeStyle = '#5a3416'; g.stroke();
    rrect(g, 9, 9, WW - 18, WH - 18, 21); g.lineWidth = 2.2; g.strokeStyle = 'rgba(247,197,72,.85)'; g.stroke();
  }

  function paintMountains(g, R) {
    // gunung jauh (kebiruan) + gunung api berasap
    const far = [[230, 120, 150, 95], [470, 118, 170, 112], [720, 120, 190, 150], [960, 116, 170, 110], [1150, 122, 150, 96]];
    for (const [x, by, w, h] of far) {
      const grd = g.createLinearGradient(0, by - h, 0, by); grd.addColorStop(0, '#7fa7bd'); grd.addColorStop(1, '#a9cbbf');
      g.fillStyle = grd; g.beginPath(); g.moveTo(x - w, by + 4);
      if (x === 720) { g.lineTo(x - 26, by - h); g.quadraticCurveTo(x, by - h - 8, x + 26, by - h); }
      else g.quadraticCurveTo(x - w * 0.3, by - h * 0.6, x, by - h);
      g.quadraticCurveTo(x + w * 0.35, by - h * 0.55, x + w, by + 4); g.closePath(); g.fill();
      g.fillStyle = 'rgba(40,70,90,.16)'; g.beginPath(); g.moveTo(x, by - h); g.quadraticCurveTo(x + w * 0.35, by - h * 0.55, x + w, by + 4); g.lineTo(x + w * 0.2, by + 4); g.closePath(); g.fill();
    }
    // kawah + asap gunung api
    g.fillStyle = '#5b6f78'; ell(g, 720, 120 - 150 + 2, 26, 6); g.fill();
    g.fillStyle = 'rgba(255,120,40,.55)'; ell(g, 720, 120 - 148 + 2, 14, 3); g.fill();
    [[724, -40, 16], [736, -58, 20], [752, -78, 24]].forEach(([x, y, r]) => { g.fillStyle = 'rgba(235,235,240,.7)'; circ(g, x, y + 30, r); g.fill(); });
    // bukit hijau di depan
    const hills = [[300, 236, 170, 92], [520, 238, 160, 104], [820, 238, 200, 98], [1060, 236, 190, 112]];
    for (const [x, by, w, h] of hills) {
      g.fillStyle = 'rgba(30,70,20,.25)'; ell(g, x + 14, by + 4, w * 0.95, 12); g.fill();
      const grd = g.createLinearGradient(x - w, by - h, x + w, by); grd.addColorStop(0, '#a8dc7a'); grd.addColorStop(0.55, '#77b956'); grd.addColorStop(1, '#4f9a3d');
      g.fillStyle = grd; g.beginPath(); g.moveTo(x - w, by); g.bezierCurveTo(x - w * 0.6, by - h * 1.05, x + w * 0.5, by - h * 1.1, x + w, by); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w * 0.62, by - h * 0.42); g.quadraticCurveTo(x - w * 0.15, by - h * 0.86, x + w * 0.25, by - h * 0.78); g.stroke();
      // terasering bukit (garis kontur)
      g.strokeStyle = 'rgba(40,90,30,.22)'; g.lineWidth = 1.5;
      for (let k = 1; k <= 2; k++) { g.beginPath(); g.moveTo(x - w * (1 - k * 0.18), by - 2); g.bezierCurveTo(x - w * 0.5, by - h * (0.95 - k * 0.3), x + w * 0.45, by - h * (1 - k * 0.3), x + w * (1 - k * 0.18), by - 2); g.stroke(); }
    }
  }

  function paintSawah(g, R) {
    // sawah berundak kiri-bawah + petak kecil di kiri
    const areas = [{ x0: 0, x1: 520, y0: 606, y1: 870, rows: 7 }, { x0: 0, x1: 172, y0: 236, y1: 300, rows: 2 }];
    for (const A of areas) {
      g.save(); g.beginPath(); g.rect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0); g.clip();
      const rh = (A.y1 - A.y0) / A.rows;
      for (let i = 0; i < A.rows; i++) {
        const y = A.y0 + i * rh; const kind = (i + (A.rows > 3 ? 0 : 1)) % 3;
        const col = kind === 0 ? '#a6d66c' : kind === 1 ? '#c7e27a' : '#8ccdb8';
        g.fillStyle = col; g.beginPath(); g.moveTo(A.x0 - 10, y + 4);
        for (let x = A.x0 - 10; x <= A.x1 + 10; x += 20) g.lineTo(x, y + 4 + Math.sin(x / 60 + i) * 4);
        g.lineTo(A.x1 + 10, y + rh + 6); g.lineTo(A.x0 - 10, y + rh + 6); g.closePath(); g.fill();
        if (kind === 2) { g.fillStyle = 'rgba(255,255,255,.22)'; for (let k = 0; k < 6; k++) { const xx = A.x0 + R() * (A.x1 - A.x0); g.fillRect(xx, y + 10 + R() * (rh - 18), 18 + R() * 20, 2); } }
        // rumpun padi
        g.strokeStyle = kind === 1 ? 'rgba(122,150,40,.75)' : 'rgba(64,124,48,.6)'; g.lineWidth = 1.6;
        for (let yy = y + 11; yy < y + rh - 3; yy += 9) for (let x = A.x0 + ((yy / 9) % 2) * 6; x < A.x1; x += 12) {
          if (kind === 2 && R() < 0.6) continue;
          g.beginPath(); g.moveTo(x, yy + 3); g.lineTo(x - 2, yy - 3); g.moveTo(x, yy + 3); g.lineTo(x + 2, yy - 3); g.stroke();
        }
        // pematang
        g.strokeStyle = '#6f9a36'; g.lineWidth = 4; g.beginPath(); for (let x = A.x0 - 10; x <= A.x1 + 10; x += 20) { const yy = y + 4 + Math.sin(x / 60 + i) * 4; x === A.x0 - 10 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke();
        g.strokeStyle = 'rgba(230,240,170,.55)'; g.lineWidth = 1.3; g.stroke();
      }
      g.restore();
    }
  }

  function paintKebun(g, R) {
    // kebun teh rapi di bawah tengah
    g.save(); g.beginPath(); g.rect(640, 738, 380, 130); g.clip();
    g.fillStyle = '#7fbf55'; g.fillRect(640, 738, 380, 130);
    for (let y = 748; y < 870; y += 20) for (let x = 640 + ((y / 20) % 2) * 9; x < 1020; x += 18) {
      if (!free(x, y, 2)) continue;
      g.fillStyle = 'rgba(30,80,30,.3)'; ell(g, x + 2, y + 5, 10, 4); g.fill();
      g.fillStyle = '#3f8f3a'; circ(g, x, y, 8.5); g.fill(); g.fillStyle = '#5cae4b'; circ(g, x - 2, y - 2, 5.5); g.fill();
    }
    g.restore();
  }

  function paintRiver(g, R) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    polyline(g, RPTS); g.strokeStyle = '#d9c48a'; g.lineWidth = 92; g.stroke();
    g.strokeStyle = '#c2a96a'; g.lineWidth = 80; g.stroke();
    g.strokeStyle = '#2f7fbf'; g.lineWidth = 66; g.stroke();
    g.strokeStyle = '#3d97d6'; g.lineWidth = 48; g.stroke();
    g.strokeStyle = '#58b2ea'; g.lineWidth = 22; g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1;
    // air terjun dari gunung
    g.fillStyle = '#d6efff'; for (let k = 0; k < 5; k++) { g.fillRect(636 + k * 6, 70, 3, 30); }
    g.fillStyle = 'rgba(255,255,255,.8)'; ell(g, 650, 100, 26, 8); g.fill();
    // batu tepi sungai
    for (let i = 0; i < 26; i++) {
      const p = RPTS[Math.floor(R() * RPTS.length)]; const side = R() < 0.5 ? -1 : 1; const x = p.x + side * (38 + R() * 8); const y = p.y + R() * 10;
      if (pathDist(x, y) < 40) continue;
      g.fillStyle = '#8b8a80'; ell(g, x, y, 5 + R() * 5, 3.5 + R() * 3); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; ell(g, x - 2, y - 1.5, 2.5, 1.4); g.fill();
    }
    // teratai
    for (let i = 0; i < 9; i++) {
      const p = RPTS[8 + Math.floor(R() * (RPTS.length - 16))]; const x = p.x + (R() - 0.5) * 28; const y = p.y + (R() - 0.5) * 12;
      if (pathDist(x, y) < 50) continue;
      g.fillStyle = '#3f9b52'; g.beginPath(); g.arc(x, y, 6, 0.4, TAU - 0.2); g.lineTo(x, y); g.closePath(); g.fill();
      if (i % 3 === 0) { g.fillStyle = '#f9a8d4'; circ(g, x + 1, y - 1, 2.6); g.fill(); }
    }
  }

  function paintTufts(g, R) {
    for (let i = 0; i < 950; i++) {
      const x = R() * WW; const y = 150 + R() * (WH - 150); if (!free(x, y, 0)) continue;
      if (x < 520 && y > 606) continue; if (x > 640 && x < 1020 && y > 738) continue;
      g.strokeStyle = R() < 0.5 ? 'rgba(52,120,44,.55)' : 'rgba(190,235,130,.5)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 6); g.moveTo(x, y); g.lineTo(x + 1, y - 7); g.moveTo(x, y); g.lineTo(x + 4, y - 5); g.stroke();
    }
    const fl = ['#fde047', '#ffffff', '#f9a8d4', '#fb923c', '#c4b5fd'];
    for (let i = 0; i < 190; i++) {
      const x = R() * WW; const y = 160 + R() * (WH - 160); if (!free(x, y, 2)) continue; if (x < 520 && y > 606) continue; if (x > 640 && x < 1020 && y > 738) continue;
      const c = fl[Math.floor(R() * fl.length)];
      for (let k = 0; k < 3; k++) { g.fillStyle = c; circ(g, x + (R() - 0.5) * 12, y + (R() - 0.5) * 8, 2.1); g.fill(); }
      g.fillStyle = '#facc15'; circ(g, x, y, 1); g.fill();
    }
  }

  function paintRoad(g, R) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.save(); g.translate(3, 5); polyline(g, PATH); g.strokeStyle = 'rgba(40,40,10,.22)'; g.lineWidth = ROAD_W + 8; g.stroke(); g.restore();
    polyline(g, PATH); g.strokeStyle = '#a77a43'; g.lineWidth = ROAD_W + 8; g.stroke();
    g.strokeStyle = '#d9b77a'; g.lineWidth = ROAD_W; g.stroke();
    g.strokeStyle = 'rgba(240,214,160,.65)'; g.lineWidth = ROAD_W * 0.48; g.stroke();
    // bekas roda pedati
    g.setLineDash([14, 10]); g.strokeStyle = 'rgba(150,108,58,.35)'; g.lineWidth = 2.5;
    [-13, 13].forEach((o) => {
      g.beginPath(); PATH.forEach((p, i) => { const q = PATH[Math.min(PATH.length - 1, i + 1)]; const pr = PATH[Math.max(0, i - 1)]; const dx = q.x - pr.x; const dy = q.y - pr.y; const l = Math.hypot(dx, dy) || 1; const x = p.x - (dy / l) * o; const y = p.y + (dx / l) * o; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    });
    g.setLineDash([]);
    for (let i = 0; i < 240; i++) {
      const d = R() * LEN; const p = posAt(d); const x = p.x + (R() - 0.5) * 48; const y = p.y + (R() - 0.5) * 48; if (pathDist(x, y) > 26) continue;
      g.fillStyle = R() < 0.5 ? 'rgba(140,100,55,.45)' : 'rgba(255,240,210,.5)'; ell(g, x, y, 1.5 + R() * 2.2, 1.2 + R() * 1.4); g.fill();
    }
  }

  function paintBridge(g) {
    // jembatan kayu di atas sungai (y=300)
    const y = 300; const x0 = 536; const x1 = 642;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x0 + 2, y - 36, x1 - x0, 80);
    g.fillStyle = '#8a5a2b'; g.fillRect(x0, y - 38, x1 - x0, 76);
    for (let x = x0; x < x1; x += 10) { g.fillStyle = (x / 10) % 2 ? '#b07a42' : '#c08a52'; g.fillRect(x + 1, y - 34, 8, 68); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 1, y - 34, 8, 3); }
    [y - 40, y + 34].forEach((ry) => { g.fillStyle = '#6b3f1d'; g.fillRect(x0 - 4, ry, x1 - x0 + 8, 7); g.fillStyle = '#9a6633'; g.fillRect(x0 - 4, ry, x1 - x0 + 8, 3); for (let x = x0; x <= x1; x += 26) { g.fillStyle = '#5a3416'; g.fillRect(x - 3, ry - 6, 7, 14); } });
  }

  function tree(g, x, y, r, pal) {
    g.fillStyle = 'rgba(20,50,10,.28)'; ell(g, x + r * 0.35, y + r * 0.12, r * 1.05, r * 0.42); g.fill();
    g.fillStyle = '#6b4423'; g.fillRect(x - r * 0.13, y - r * 0.5, r * 0.26, r * 0.6);
    g.fillStyle = pal[0]; circ(g, x, y - r * 0.85, r); g.fill();
    g.fillStyle = pal[1]; circ(g, x - r * 0.28, y - r * 1.05, r * 0.66); g.fill();
    g.fillStyle = pal[2]; circ(g, x - r * 0.42, y - r * 1.25, r * 0.3); g.fill();
  }
  function palm(g, x, y, s) {
    g.fillStyle = 'rgba(20,50,10,.25)'; ell(g, x + 16 * s, y + 2, 22 * s, 7 * s); g.fill();
    g.strokeStyle = '#8b5a2b'; g.lineWidth = 5 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 4 * s, y - 26 * s, x + 6 * s, y - 50 * s); g.stroke();
    g.strokeStyle = 'rgba(60,30,10,.4)'; g.lineWidth = 1; for (let k = 1; k < 7; k++) { const t = k / 7; const px = lerp(x, x + 6 * s, t) - Math.sin(t * Math.PI) * 3 * s; const py = y - 50 * s * t; g.beginPath(); g.moveTo(px - 2.5 * s, py); g.lineTo(px + 2.5 * s, py); g.stroke(); }
    const tx = x + 6 * s; const ty = y - 50 * s;
    [[-1, -0.3], [1, -0.2], [-0.8, 0.5], [0.9, 0.55], [0.1, -1], [-0.3, 0.9]].forEach(([dx, dy], i) => {
      g.fillStyle = i % 2 ? '#2f8f3a' : '#3fa34a'; g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + dx * 18 * s - dy * 8 * s, ty + dy * 18 * s - 10 * s, tx + dx * 30 * s, ty + dy * 22 * s + 6 * s);
      g.quadraticCurveTo(tx + dx * 14 * s, ty + dy * 10 * s + 2 * s, tx, ty); g.fill();
    });
    g.fillStyle = '#6b4423'; circ(g, tx - 3 * s, ty + 3 * s, 3 * s); g.fill(); circ(g, tx + 3 * s, ty + 4 * s, 3 * s); g.fill();
  }
  function house(g, x, y, s, roof) { // rumah panggung
    g.fillStyle = 'rgba(20,50,10,.25)'; ell(g, x + 6, y + 2, 28 * s, 7 * s); g.fill();
    g.fillStyle = '#5a3416'; [-16, -6, 6, 16].forEach((o) => g.fillRect(x + o * s - 1.5 * s, y - 14 * s, 3 * s, 14 * s));
    g.fillStyle = '#c08a52'; g.fillRect(x - 20 * s, y - 32 * s, 40 * s, 18 * s);
    g.fillStyle = '#8a5a2b'; for (let k = -18; k < 20; k += 5) g.fillRect(x + k * s, y - 32 * s, 1.2 * s, 18 * s);
    g.fillStyle = '#3b2612'; g.fillRect(x - 5 * s, y - 28 * s, 9 * s, 14 * s); g.fillStyle = '#f9d77e'; g.fillRect(x + 9 * s, y - 28 * s, 7 * s, 6 * s);
    g.fillStyle = roof; g.beginPath(); g.moveTo(x - 30 * s, y - 28 * s); g.quadraticCurveTo(x - 22 * s, y - 36 * s, x - 14 * s, y - 50 * s); g.lineTo(x + 14 * s, y - 50 * s); g.quadraticCurveTo(x + 22 * s, y - 36 * s, x + 30 * s, y - 28 * s); g.quadraticCurveTo(x, y - 33 * s, x - 30 * s, y - 28 * s); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.2; for (let k = -12; k <= 12; k += 6) { g.beginPath(); g.moveTo(x + k * s, y - 50 * s); g.lineTo(x + k * 1.8 * s, y - 31 * s); g.stroke(); }
    g.strokeStyle = '#3b2612'; g.lineWidth = 2.5 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 18 * s, y - 50 * s); g.quadraticCurveTo(x - 22 * s, y - 56 * s, x - 26 * s, y - 60 * s); g.moveTo(x + 18 * s, y - 50 * s); g.quadraticCurveTo(x + 22 * s, y - 56 * s, x + 26 * s, y - 60 * s); g.moveTo(x - 14 * s, y - 50 * s); g.lineTo(x + 14 * s, y - 50 * s); g.stroke();
  }
  function rock(g, x, y, r) { g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 3, y + r * 0.5, r * 1.1, r * 0.45); g.fill(); g.fillStyle = '#8f8a7e'; g.beginPath(); g.moveTo(x - r, y + r * 0.4); g.lineTo(x - r * 0.7, y - r * 0.5); g.lineTo(x + r * 0.1, y - r * 0.8); g.lineTo(x + r, y - r * 0.2); g.lineTo(x + r * 0.9, y + r * 0.45); g.closePath(); g.fill(); g.fillStyle = '#b5b0a3'; g.beginPath(); g.moveTo(x - r * 0.7, y - r * 0.5); g.lineTo(x + r * 0.1, y - r * 0.8); g.lineTo(x + r * 0.2, y - r * 0.1); g.lineTo(x - r * 0.5, y); g.closePath(); g.fill(); }
  function candi(g, x, y) {
    g.fillStyle = 'rgba(30,60,20,.3)'; ell(g, x + 8, y + 3, 52, 10); g.fill();
    const lv = [[48, 12], [40, 12], [32, 11], [24, 10]]; let yy = y;
    lv.forEach(([w, h], i) => { g.fillStyle = i % 2 ? '#a89f8c' : '#968c78'; g.fillRect(x - w, yy - h, w * 2, h); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - w, yy - h, w * 2, 2.5); g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = -w + 8; k < w; k += 12) g.fillRect(x + k, yy - h + 3, 2, h - 4); yy -= h; });
    [-30, 30, -16, 16].forEach((o, i) => { const by = y - (i < 2 ? 24 : 35); g.fillStyle = '#b3aa96'; g.beginPath(); g.moveTo(x + o - 5, by); g.quadraticCurveTo(x + o - 5, by - 10, x + o, by - 13); g.quadraticCurveTo(x + o + 5, by - 10, x + o + 5, by); g.fill(); });
    g.fillStyle = '#bdb4a0'; g.beginPath(); g.moveTo(x - 16, yy); g.quadraticCurveTo(x - 16, yy - 22, x, yy - 26); g.quadraticCurveTo(x + 16, yy - 22, x + 16, yy); g.fill();
    g.fillStyle = '#8f8673'; g.fillRect(x - 2, yy - 38, 4, 13);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 6, y - 18, 12, 18);
  }
  function paintDecor(g, R) {
    const items = [];
    const add = (y, fn) => items.push({ y, fn });
    const PF = [['#1f5a40', '#2e7552', '#4f9a74'], ['#2d6b3a', '#3f8a4a', '#68b35e'], ['#2a7a3a', '#3e9a4a', '#7cc36a'], ['#356b2a', '#4c8a33', '#86bd57']];
    const DARK = [['#1f5236', '#2f7347', '#5aa36a'], ['#24583b', '#367b4c', '#67ad72']];
    // Hutan Kabut (kiri atas)
    for (let i = 0; i < 46; i++) { const x = R() * 230; const y = 24 + R() * 126; const r = 13 + R() * 9; if (free(x, y, r * 0.7) && !(x < 90 && y > 110)) add(y, () => tree(g, x, y, r, DARK[i % 2])); }
    // hutan kanan atas & tepi kanan bawah
    for (let i = 0; i < 70; i++) { const x = 880 + R() * 330; const y = 190 + R() * 60; const r = 12 + R() * 9; if (free(x, y, r * 0.6)) add(y, () => tree(g, x, y, r, PF[i % 4])); }
    for (let i = 0; i < 40; i++) { const x = 990 + R() * 220; const y = 600 + R() * 270; const r = 12 + R() * 8; if (free(x, y, r * 0.6) && Math.hypot(x - 1118, y - 768) > 70) add(y, () => tree(g, x, y, r, PF[(i + 1) % 4])); }
    // pohon di bukit
    for (let i = 0; i < 26; i++) { const x = 250 + R() * 900; const y = 160 + R() * 70; const r = 9 + R() * 6; if (free(x, y, r)) add(y, () => tree(g, x, y, r, PF[(i + 2) % 4])); }
    // beringin besar di tengah huruf U
    add(372, () => {
      const x = 330; const y = 372;
      g.fillStyle = 'rgba(20,50,10,.3)'; ell(g, x + 14, y + 4, 54, 16); g.fill();
      g.strokeStyle = '#6b4423'; g.lineWidth = 2; for (let k = -30; k <= 30; k += 7) { g.beginPath(); g.moveTo(x + k, y - 34); g.lineTo(x + k * 1.05, y - 2); g.stroke(); }
      g.fillStyle = '#5a3a1e'; g.fillRect(x - 8, y - 36, 16, 36);
      [[0, -52, 44, '#2f7a3a'], [-24, -60, 28, '#3a8f45'], [22, -62, 30, '#3a8f45'], [-6, -74, 26, '#4ea656'], [-20, -78, 13, '#7cc36a'], [14, -80, 11, '#7cc36a']].forEach(([dx, dy, r, c]) => { g.fillStyle = c; circ(g, x + dx, y + dy, r); g.fill(); });
    });
    // desa kecil kiri
    add(450, () => house(g, 62, 450, 1, '#9a3412'));
    add(540, () => house(g, 118, 540, 0.85, '#7c2d12'));
    add(860, () => house(g, 1120, 860, 0.9, '#9a3412'));
    // candi di bukit
    add(150, () => candi(g, 905, 150));
    // kelapa
    [[1150, 610, 1], [1185, 700, 0.9], [985, 610, 0.85], [455, 845, 0.9], [205, 852, 0.8], [660, 450, 0.85], [512, 640, 0.75], [690, 175, 0.8]].forEach(([x, y, s]) => { if (free(x, y, 0)) add(y, () => palm(g, x, y, s)); });
    // batu
    for (let i = 0; i < 22; i++) { const x = R() * WW; const y = 260 + R() * 600; const r = 6 + R() * 9; if (free(x, y, r) && !(x < 520 && y > 606) && !(x > 640 && y > 738 && x < 1020)) add(y, () => rock(g, x, y, r)); }
    // kolam teratai kanan bawah
    add(768, () => {
      const x = 1118; const y = 768;
      g.fillStyle = '#c2a96a'; ell(g, x, y, 62, 34); g.fill(); g.fillStyle = '#2f7fbf'; ell(g, x, y, 54, 28); g.fill(); g.fillStyle = '#4aa5df'; ell(g, x - 6, y - 4, 38, 17); g.fill();
      [[-24, 4], [10, -10], [26, 8], [-6, 12]].forEach(([dx, dy], i) => { g.fillStyle = '#3f9b52'; g.beginPath(); g.arc(x + dx, y + dy, 7, 0.5, TAU - 0.1); g.lineTo(x + dx, y + dy); g.fill(); if (i % 2 === 0) { g.fillStyle = '#f9a8d4'; circ(g, x + dx + 1, y + dy - 2, 3); g.fill(); } });
    });
    // kabut ungu di hutan
    items.sort((a, b) => a.y - b.y).forEach((it) => it.fn());
    for (let i = 0; i < 9; i++) { const x = 20 + R() * 220; const y = 30 + R() * 200; const rg = g.createRadialGradient(x, y, 0, x, y, 60); rg.addColorStop(0, 'rgba(196,181,253,.22)'); rg.addColorStop(1, 'rgba(196,181,253,0)'); g.fillStyle = rg; g.fillRect(x - 60, y - 60, 120, 120); }
  }
  function paintCave(g) {
    // Gua Kabut di tepi kiri (asal musuh)
    const x = 18; const y = 190;
    g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x + 18, y + 48, 74, 18); g.fill();
    const rocksP = [[-10, -46, 40], [30, -50, 34], [56, -22, 26], [52, 30, 26], [-6, 44, 34], [24, 50, 26]];
    rocksP.forEach(([dx, dy, r]) => { g.fillStyle = '#5b5560'; circ(g, x + dx, y + dy, r); g.fill(); g.fillStyle = '#7b7480'; circ(g, x + dx - r * 0.25, y + dy - r * 0.3, r * 0.6); g.fill(); });
    const rg = g.createRadialGradient(x + 6, y, 4, x + 6, y, 52); rg.addColorStop(0, '#0d0618'); rg.addColorStop(0.6, '#2e1065'); rg.addColorStop(1, 'rgba(124,58,237,0)');
    g.fillStyle = rg; ell(g, x + 8, y + 2, 40, 44); g.fill();
    g.fillStyle = '#120a20'; ell(g, x + 2, y + 4, 28, 34); g.fill();
    g.fillStyle = 'rgba(196,181,253,.9)'; circ(g, x - 4, y - 6, 3); g.fill(); circ(g, x + 8, y - 6, 3); g.fill();
    g.fillStyle = 'rgba(167,139,250,.35)'; [[30, 20, 22], [54, 4, 18], [70, 24, 16]].forEach(([dx, dy, r]) => { circ(g, x + dx, y + dy, r); g.fill(); });
  }
  function paintFort(g) {
    // Benteng: tembok batu, menara sudut beratap gonjong, pendopo, gerbang, bendera merah putih
    const X0 = 1046; const X1 = 1182; const Y0 = 296; const Y1 = 548;
    g.fillStyle = 'rgba(20,40,10,.35)'; g.fillRect(X0 + 8, Y0 + 10, X1 - X0, Y1 - Y0);
    // halaman
    g.fillStyle = '#d8caa6'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    g.strokeStyle = 'rgba(120,100,60,.25)'; g.lineWidth = 1; for (let y = Y0; y < Y1; y += 16) { g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); }
    // dinding (sisi atas sebagai muka, sisi lain sebagai bagian atas tembok)
    const wall = (x, y, w, h, face) => {
      g.fillStyle = '#b9ab8c'; g.fillRect(x, y, w, h); g.fillStyle = '#d6cbb0'; g.fillRect(x, y, w, Math.min(h, 7));
      g.strokeStyle = 'rgba(80,60,30,.35)'; g.lineWidth = 1;
      for (let yy = y + 7; yy < y + h; yy += 8) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); for (let xx = x + ((yy / 8) % 2) * 7; xx < x + w; xx += 14) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 8); g.stroke(); } }
      if (face) { g.fillStyle = '#c9bc9c'; for (let xx = x + 2; xx < x + w - 6; xx += 12) g.fillRect(xx, y - 7, 8, 8); }
    };
    wall(X0, Y0 - 14, X1 - X0, 26, true); // belakang
    wall(X0, Y0, 22, Y1 - Y0, false); // kiri
    wall(X1 - 18, Y0, 18, Y1 - Y0, false); // kanan
    wall(X0, Y1 - 24, X1 - X0, 30, true); // depan
    // gerbang di dinding kiri (y 420)
    g.fillStyle = '#3b2612'; rrect(g, X0 - 6, 392, 30, 58, 6); g.fill();
    g.fillStyle = '#7a4a24'; g.fillRect(X0 - 2, 396, 11, 50); g.fillRect(X0 + 11, 396, 11, 50);
    g.fillStyle = '#f7c548'; [404, 438].forEach((yy) => { g.fillRect(X0 - 2, yy, 24, 3); }); circ(g, X0 + 10, 421, 2); g.fill();
    // pendopo (atap joglo)
    const cx = 1124; const cy = 438;
    g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, cx + 6, cy + 22, 50, 10); g.fill();
    g.fillStyle = '#8a5a2b'; g.fillRect(cx - 34, cy - 4, 68, 24); g.fillStyle = '#5a3416'; [-30, -10, 10, 28].forEach((o) => g.fillRect(cx + o, cy - 4, 4, 24));
    g.fillStyle = '#b4532a'; g.beginPath(); g.moveTo(cx - 52, cy); g.lineTo(cx - 30, cy - 22); g.lineTo(cx + 30, cy - 22); g.lineTo(cx + 52, cy); g.closePath(); g.fill();
    g.fillStyle = '#c96a37'; g.beginPath(); g.moveTo(cx - 30, cy - 22); g.lineTo(cx - 12, cy - 54); g.lineTo(cx + 12, cy - 54); g.lineTo(cx + 30, cy - 22); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,20,0,.35)'; g.lineWidth = 1.2; for (let k = -44; k <= 44; k += 8) { g.beginPath(); g.moveTo(cx + k, cy); g.lineTo(cx + k * 0.6, cy - 22); g.stroke(); }
    g.fillStyle = '#f7c548'; g.fillRect(cx - 13, cy - 57, 26, 4);
    // tiang bendera merah putih
    g.fillStyle = '#e5e7eb'; g.fillRect(cx - 1.5, cy - 104, 3, 52); g.fillStyle = '#f7c548'; circ(g, cx, cy - 106, 3); g.fill();
    g.fillStyle = '#dc2626'; g.beginPath(); g.moveTo(cx + 1.5, cy - 102); g.quadraticCurveTo(cx + 18, cy - 108, cx + 34, cy - 100); g.lineTo(cx + 34, cy - 91); g.quadraticCurveTo(cx + 18, cy - 99, cx + 1.5, cy - 93); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx + 1.5, cy - 93); g.quadraticCurveTo(cx + 18, cy - 99, cx + 34, cy - 91); g.lineTo(cx + 34, cy - 82); g.quadraticCurveTo(cx + 18, cy - 90, cx + 1.5, cy - 84); g.fill();
    // menara sudut beratap gonjong
    const tower = (x, y, r) => {
      g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x + 5, y + 6, r + 4, r * 0.45); g.fill();
      g.fillStyle = '#a99b7c'; g.fillRect(x - r, y - 34, 2 * r, 34); ell(g, x, y, r, r * 0.42); g.fill();
      g.fillStyle = '#c9bc9c'; ell(g, x, y - 34, r, r * 0.42); g.fill();
      g.strokeStyle = 'rgba(80,60,30,.35)'; g.lineWidth = 1; for (let yy = y - 28; yy < y; yy += 8) { g.beginPath(); g.moveTo(x - r, yy); g.lineTo(x + r, yy); g.stroke(); }
      g.fillStyle = '#2b1a0c'; g.fillRect(x - 3, y - 24, 6, 10);
      g.fillStyle = '#9a2e1c'; g.beginPath(); g.moveTo(x - r - 8, y - 36); g.quadraticCurveTo(x - r * 0.4, y - 44, x - r * 0.75, y - 66); g.quadraticCurveTo(x, y - 52, x + r * 0.75, y - 66); g.quadraticCurveTo(x + r * 0.4, y - 44, x + r + 8, y - 36); g.quadraticCurveTo(x, y - 30, x - r - 8, y - 36); g.fill();
      g.fillStyle = '#c2412c'; g.beginPath(); g.moveTo(x - r * 0.5, y - 40); g.quadraticCurveTo(x, y - 50, x + r * 0.5, y - 40); g.quadraticCurveTo(x, y - 36, x - r * 0.5, y - 40); g.fill();
      g.fillStyle = '#f7c548'; circ(g, x - r * 0.75, y - 67, 2.5); g.fill(); circ(g, x + r * 0.75, y - 67, 2.5); g.fill();
    };
    tower(X0 + 6, Y0 + 2, 20); tower(X1 - 8, Y0 + 2, 17); tower(X0 + 6, Y1 + 2, 20); tower(X1 - 8, Y1 + 2, 17);
    // umbul-umbul
    [X0 + 50, X0 + 90, X0 + 130].forEach((x) => { g.fillStyle = '#5a3416'; g.fillRect(x, Y1 - 46, 2, 26); g.fillStyle = '#dc2626'; g.fillRect(x + 2, Y1 - 46, 9, 5); g.fillStyle = '#fff'; g.fillRect(x + 2, Y1 - 41, 9, 5); });
  }
  function paintSigns(g) {
    const sign = (x, y, txt) => {
      g.font = `800 15px ${FONT}`; const w = g.measureText(txt).width + 18;
      g.fillStyle = '#5a3416'; g.fillRect(x - 2, y, 4, 18);
      g.fillStyle = 'rgba(0,0,0,.25)'; rrect(g, x - w / 2 + 2, y - 20, w, 22, 6); g.fill();
      g.fillStyle = '#c99152'; rrect(g, x - w / 2, y - 22, w, 22, 6); g.fill(); g.strokeStyle = '#6b3f1d'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#3b2612'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y - 10);
    };
    sign(110, 268, 'Hutan Kabut'); sign(250, 770, 'Sawah'); sign(668, 560, 'Sungai'); sign(1120, 606, 'Benteng');
  }

  /* ============================== MENARA (gambar) ============================== */
  const LVS = [1, 1.08, 1.17];
  function drawSlot(g, x, y) {
    g.fillStyle = 'rgba(20,40,10,.3)'; ell(g, x + 3, y + 8, SLOT_R + 2, SLOT_R * 0.78); g.fill();
    g.fillStyle = '#7d6a4c'; ell(g, x, y + 5, SLOT_R, SLOT_R * 0.78); g.fill();
    g.fillStyle = '#cdb88d'; ell(g, x, y, SLOT_R, SLOT_R * 0.78); g.fill();
    g.strokeStyle = 'rgba(110,86,50,.55)'; g.lineWidth = 1.5;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 11); g.lineTo(x + Math.cos(a) * SLOT_R, y + Math.sin(a) * SLOT_R * 0.78); g.stroke(); }
    ell(g, x, y, 14, 11); g.stroke(); g.fillStyle = '#d9c69c'; g.fill();
    g.setLineDash([5, 5]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; ell(g, x, y, SLOT_R - 5, (SLOT_R - 5) * 0.78); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(90,60,25,.65)'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 5); g.lineTo(x, y + 5); g.stroke();
  }
  function pips(g, x, y, L) {
    for (let k = 0; k < L; k++) {
      const px = x + (k - (L - 1) / 2) * 11; const py = y + 24;
      g.fillStyle = '#7a3e0e'; starPath(g, px, py + 1, 5.5); g.fill(); g.fillStyle = '#fde047'; starPath(g, px, py, 5); g.fill();
    }
  }
  function starPath(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
  function plinth(g, r, h, c1, c2) {
    g.fillStyle = c2; g.fillRect(-r, -h, 2 * r, h); ell(g, 0, 0, r, r * 0.42); g.fill();
    g.fillStyle = c1; ell(g, 0, -h, r, r * 0.42); g.fill();
    g.strokeStyle = 'rgba(60,45,20,.3)'; g.lineWidth = 1; for (let yy = -h + 7; yy < 0; yy += 7) { g.beginPath(); g.moveTo(-r, yy); g.lineTo(r, yy); g.stroke(); }
  }
  function drawTowerBody(g, type, L, x, y) {
    const s = LVS[L - 1];
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(20,40,10,.32)'; ell(g, 8, 4, 30, 11); g.fill();
    g.scale(s, s);
    if (type === 'archer') {
      if (L >= 2) plinth(g, 22, 8, '#c4bba8', '#8f877a');
      const by = L >= 2 ? -8 : 0;
      g.strokeStyle = '#4a2a10'; g.lineWidth = 4; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(-9, by - 4); g.lineTo(-9, by - 30); g.moveTo(9, by - 4); g.lineTo(9, by - 30); g.stroke();
      g.strokeStyle = '#6b3f1d'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(-16, by + 2); g.lineTo(-14, by - 30); g.moveTo(16, by + 2); g.lineTo(14, by - 30); g.stroke();
      g.lineWidth = 2; g.strokeStyle = '#8a5a2b'; g.beginPath(); g.moveTo(-15, by - 4); g.lineTo(15, by - 22); g.moveTo(15, by - 4); g.lineTo(-15, by - 22); g.stroke();
      g.fillStyle = '#7a4a24'; g.fillRect(-21, by - 34, 42, 7); g.fillStyle = '#a06a36'; g.fillRect(-21, by - 34, 42, 2.5);
      g.fillStyle = L >= 3 ? '#e9c27a' : '#c08a52'; g.fillRect(-17, by - 50, 34, 16);
      g.fillStyle = 'rgba(80,40,10,.4)'; for (let k = -15; k < 17; k += 5) g.fillRect(k, by - 50, 1.2, 16);
      g.fillStyle = '#2b1a0c'; g.fillRect(-8, by - 48, 16, 11);
      const roof = L === 1 ? ['#c9954d', '#a8743a'] : L === 2 ? ['#c2410c', '#9a3412'] : ['#b91c1c', '#7f1d1d'];
      g.fillStyle = roof[1]; g.beginPath(); g.moveTo(-29, by - 46); g.quadraticCurveTo(-18, by - 52, -11, by - 70); g.lineTo(0, by - 82); g.lineTo(11, by - 70); g.quadraticCurveTo(18, by - 52, 29, by - 46); g.quadraticCurveTo(0, by - 42, -29, by - 46); g.fill();
      g.fillStyle = roof[0]; g.beginPath(); g.moveTo(-22, by - 50); g.quadraticCurveTo(-14, by - 56, -8, by - 70); g.lineTo(0, by - 79); g.lineTo(6, by - 70); g.quadraticCurveTo(0, by - 58, -4, by - 48); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,25,5,.35)'; g.lineWidth = 1; for (let k = -24; k <= 24; k += 6) { g.beginPath(); g.moveTo(0, by - 80); g.lineTo(k, by - 46); g.stroke(); }
      if (L >= 2) { g.strokeStyle = L === 3 ? '#f7c548' : '#3b2612'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-26, by - 47); g.quadraticCurveTo(-31, by - 52, -32, by - 58); g.moveTo(26, by - 47); g.quadraticCurveTo(31, by - 52, 32, by - 58); g.stroke(); }
      g.fillStyle = '#e5e7eb'; g.fillRect(-1, by - 98, 2, 18);
      if (L < 3) { g.fillStyle = '#dc2626'; g.fillRect(1, by - 98, 12, 4); g.fillStyle = '#fff'; g.fillRect(1, by - 94, 12, 4); }
      else { g.fillStyle = '#f7c548'; starPath(g, 0, by - 100, 6); g.fill(); g.fillStyle = '#7c3aed'; g.beginPath(); g.moveTo(1, by - 94); g.lineTo(16, by - 90); g.lineTo(1, by - 86); g.fill(); }
    } else if (type === 'cannon') {
      const r = 25; const h = L === 1 ? 20 : L === 2 ? 26 : 30;
      const sg = g.createLinearGradient(-r, 0, r, 0); sg.addColorStop(0, '#7d766a'); sg.addColorStop(0.45, '#cfc6b4'); sg.addColorStop(1, '#6a6458');
      g.fillStyle = sg; g.fillRect(-r, -h, 2 * r, h); ell(g, 0, 0, r, r * 0.42); g.fill();
      g.strokeStyle = 'rgba(50,40,20,.35)'; g.lineWidth = 1; for (let yy = -h + 7; yy < 0; yy += 7) { g.beginPath(); g.moveTo(-r, yy); g.lineTo(r, yy); g.stroke(); for (let xx = -r + ((yy / 7) % 2 ? 6 : 0); xx < r; xx += 12) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 7); g.stroke(); } }
      if (L >= 2) { g.fillStyle = L === 3 ? '#facc15' : '#b8862b'; g.fillRect(-r, -h + 8, 2 * r, 3.5); }
      if (L === 3) { g.fillStyle = '#b91c1c'; g.beginPath(); g.moveTo(-8, -h + 12); g.lineTo(8, -h + 12); g.lineTo(8, -4); g.lineTo(0, 1); g.lineTo(-8, -4); g.fill(); g.fillStyle = '#fde047'; starPath(g, 0, -h + 20, 4); g.fill(); }
      g.fillStyle = '#b9b09e'; ell(g, 0, -h, r, r * 0.42); g.fill();
      g.fillStyle = '#7d7466'; ell(g, 0, -h, r - 6, (r - 6) * 0.42); g.fill();
      g.fillStyle = '#c9c0ad'; for (let k = 0; k < 8; k++) { const a = Math.PI * (0.05 + k * 0.128); const mx = Math.cos(a) * (r - 3); const my = -h + Math.sin(a) * (r - 3) * 0.42; g.fillRect(mx - 4, my - 8, 8, 8); }
      g.fillStyle = '#3f3a33'; ell(g, 0, -h - 1, 10, 6); g.fill();
    } else if (type === 'ice') {
      const ph = [12, 22, 32][L - 1];
      plinth(g, 18, ph, '#e2e8f0', '#94a3b8');
      g.fillStyle = 'rgba(186,230,253,.9)'; for (let k = -16; k <= 16; k += 8) { g.beginPath(); g.moveTo(k - 3, -ph + 2); g.lineTo(k, -ph + 9 + (k % 16 === 0 ? 4 : 0)); g.lineTo(k + 3, -ph + 2); g.fill(); }
      if (L >= 2) { g.fillStyle = '#7dd3fc'; [[-14, -ph * 0.5], [13, -ph * 0.4]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(dx, dy - 9); g.lineTo(dx + 4, dy); g.lineTo(dx, dy + 5); g.lineTo(dx - 4, dy); g.fill(); }); }
      const y0 = -ph - 4; const robe = L === 1 ? '#2563eb' : L === 2 ? '#1d4ed8' : '#4338ca'; const trim = L === 3 ? '#facc15' : '#e0f2fe';
      g.fillStyle = robe; g.beginPath(); g.moveTo(-12, y0 + 2); g.quadraticCurveTo(-8, y0 - 14, -5, y0 - 21); g.lineTo(5, y0 - 21); g.quadraticCurveTo(8, y0 - 14, 12, y0 + 2); g.closePath(); g.fill();
      g.fillStyle = trim; g.fillRect(-12, y0, 24, 3);
      g.fillStyle = '#f2c49b'; circ(g, 0, y0 - 25, 6); g.fill();
      g.fillStyle = '#f8fafc'; g.beginPath(); g.moveTo(-6, y0 - 23); g.quadraticCurveTo(0, y0 - 6, 6, y0 - 23); g.fill();
      g.fillStyle = '#1e293b'; circ(g, -2.2, y0 - 26, 1); g.fill(); circ(g, 2.2, y0 - 26, 1); g.fill();
      g.fillStyle = L === 3 ? '#4338ca' : '#3b82f6'; g.beginPath(); g.moveTo(-11, y0 - 28); g.quadraticCurveTo(0, y0 - 33, 11, y0 - 28); g.quadraticCurveTo(4, y0 - 38, 6, y0 - 54); g.quadraticCurveTo(-3, y0 - 42, -11, y0 - 28); g.fill();
      g.fillStyle = trim; g.fillRect(-9, y0 - 31, 18, 3); g.fillStyle = '#e0f2fe'; starPath(g, 1, y0 - 40, 3); g.fill();
      g.strokeStyle = '#7a4a24'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(9, y0 + 1); g.lineTo(13, y0 - 38); g.stroke();
    } else if (type === 'bolt') {
      const top = [58, 64, 70][L - 1];
      g.fillStyle = '#475569'; g.beginPath(); g.moveTo(-22, 0); g.lineTo(0, 9); g.lineTo(22, 0); g.lineTo(0, -9); g.closePath(); g.fill();
      g.fillStyle = '#64748b'; g.beginPath(); g.moveTo(-22, 0); g.lineTo(-22, -8); g.lineTo(0, -17); g.lineTo(22, -8); g.lineTo(22, 0); g.lineTo(0, -9); g.closePath(); g.fill();
      const sg = g.createLinearGradient(-12, 0, 12, 0); sg.addColorStop(0, '#1e293b'); sg.addColorStop(0.45, '#64748b'); sg.addColorStop(1, '#0f172a');
      g.fillStyle = sg; g.beginPath(); g.moveTo(-12, -10); g.lineTo(-6, -top + 8); g.lineTo(6, -top + 8); g.lineTo(12, -10); g.closePath(); g.fill();
      const nr = L + 2; for (let k = 0; k < nr; k++) { const yy = -14 - k * ((top - 26) / nr); const w = lerp(12, 7, (k + 0.5) / nr); g.strokeStyle = '#d97706'; g.lineWidth = 3; ell(g, 0, yy, w + 2, 3); g.stroke(); g.strokeStyle = '#fbbf24'; g.lineWidth = 1; ell(g, 0, yy - 1, w + 2, 3); g.stroke(); }
      g.strokeStyle = L === 3 ? '#facc15' : '#94a3b8'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-6, -top + 8); g.lineTo(-11, -top - 4); g.moveTo(6, -top + 8); g.lineTo(11, -top - 4); g.moveTo(0, -top + 8); g.lineTo(0, -top - 12); g.stroke();
      if (L >= 2) { g.fillStyle = '#a855f7'; [-12, 12].forEach((dx) => { circ(g, dx, -top - 4, 2.6); g.fill(); }); }
    }
    g.restore();
    pips(g, x, y, L);
  }
  function towerTopLocal(type, L) { // titik asal tembakan (relatif ke petak)
    const s = LVS[L - 1];
    if (type === 'archer') return { x: 0, y: -((L >= 2 ? 8 : 0) + 43) * s };
    if (type === 'cannon') return { x: 0, y: -([20, 26, 30][L - 1] + 1) * s };
    if (type === 'ice') return { x: 13 * s, y: -([12, 22, 32][L - 1] + 4 + 46) * s };
    return { x: 0, y: -[58, 64, 70][L - 1] * s - 2 };
  }
  function drawTowerTop(g, type, L, x, y, ang, tm, recoil, charge) {
    const s = LVS[L - 1]; const o = towerTopLocal(type, L); const tx = x + o.x; const ty = y + o.y;
    if (type === 'archer') {
      g.save(); g.translate(tx, ty); g.rotate(ang); g.scale(s, s);
      g.fillStyle = '#f2c49b'; circ(g, -3, 0, 4.5); g.fill(); g.fillStyle = '#b91c1c'; g.fillRect(-7.5, -4.5, 9, 2.5);
      g.strokeStyle = '#7a4a24'; g.lineWidth = 2.4; g.beginPath(); g.arc(3, 0, 8, -1.2, 1.2); g.stroke();
      g.strokeStyle = '#f8fafc'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(3 + Math.cos(-1.2) * 8, Math.sin(-1.2) * 8); g.lineTo(3 - recoil * 3, 0); g.lineTo(3 + Math.cos(1.2) * 8, Math.sin(1.2) * 8); g.stroke();
      if (recoil < 0.5) { g.strokeStyle = '#4a2a10'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-2, 0); g.lineTo(13, 0); g.stroke(); }
      g.restore();
    } else if (type === 'cannon') {
      g.save(); g.translate(tx, ty); g.rotate(ang); g.scale(s, s); g.translate(-recoil * 6, 0);
      const bg = g.createLinearGradient(0, -6, 0, 6); bg.addColorStop(0, L === 3 ? '#fde68a' : '#e0b45a'); bg.addColorStop(0.5, L === 3 ? '#eab308' : '#a16207'); bg.addColorStop(1, '#5a3a0a');
      g.fillStyle = bg; rrect(g, -4, -5.5, 28, 11, 4); g.fill();
      g.fillStyle = '#3f2a06'; g.fillRect(19, -6.5, 5, 13); g.fillStyle = '#1c1206'; circ(g, 24, 0, 3); g.fill();
      if (L >= 2) { g.fillStyle = '#fde68a'; g.fillRect(6, -5.5, 2.5, 11); }
      g.fillStyle = '#2d2a26'; circ(g, 0, 0, 7); g.fill(); g.fillStyle = '#57534e'; circ(g, -1.5, -1.5, 3); g.fill();
      g.restore();
      if (recoil > 0.6) { g.globalAlpha = (recoil - 0.6) * 2.4; g.drawImage(GLOW.orange, tx + Math.cos(ang) * 26 * s - 14, ty + Math.sin(ang) * 26 * s - 14, 28, 28); g.globalAlpha = 1; }
    } else if (type === 'ice') {
      const b = Math.sin(tm * 2.6 + x) * 2.5; const a = 0.55 + 0.25 * Math.sin(tm * 4 + y);
      g.globalAlpha = a; g.drawImage(GLOW.cyan, tx - 16, ty - 16 + b, 32, 32); g.globalAlpha = 1;
      g.save(); g.translate(tx, ty + b); g.rotate(Math.sin(tm * 1.5) * 0.3); g.scale(s, s);
      g.fillStyle = '#7dd3fc'; g.beginPath(); g.moveTo(0, -10); g.lineTo(6, -1); g.lineTo(0, 8); g.lineTo(-6, -1); g.closePath(); g.fill();
      g.fillStyle = '#e0f2fe'; g.beginPath(); g.moveTo(0, -10); g.lineTo(6, -1); g.lineTo(0, 0); g.closePath(); g.fill();
      g.strokeStyle = '#0369a1'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -10); g.lineTo(6, -1); g.lineTo(0, 8); g.lineTo(-6, -1); g.closePath(); g.stroke();
      g.restore();
    } else {
      const pulse = 0.55 + 0.3 * Math.sin(tm * 6 + x) + charge * 0.3;
      g.globalAlpha = clamp(pulse, 0, 1); g.drawImage(GLOW.violet, tx - 20, ty - 20, 40, 40); g.globalAlpha = 1;
      g.fillStyle = '#ede9fe'; circ(g, tx, ty, 6.5 * s); g.fill(); g.fillStyle = '#a78bfa'; circ(g, tx + 1.5, ty + 1.5, 3.5 * s); g.fill();
      if (charge > 0.7 && Math.random() < 0.35) {
        g.strokeStyle = 'rgba(237,233,254,.9)'; g.lineWidth = 1.2; g.beginPath(); let px = tx; let py = ty; g.moveTo(px, py);
        const a0 = Math.random() * TAU; for (let k = 0; k < 3; k++) { px += Math.cos(a0) * 5 + rnd(-3, 3); py += Math.sin(a0) * 5 + rnd(-3, 3); g.lineTo(px, py); } g.stroke();
      }
    }
  }
  const thumbs = {};
  function thumb(type, L) {
    const k = type + L; if (thumbs[k]) return thumbs[k];
    const c2 = mk(104, 116); const g2 = c2.getContext('2d'); g2.scale(2 * 0.62, 2 * 0.62);
    drawTowerBody(g2, type, L, 42, 82); drawTowerTop(g2, type, L, 42, 82, -0.6, 0.5, 0, 0.5);
    return (thumbs[k] = c2.toDataURL());
  }

  /* ============================== SPRITE MUSUH ============================== */
  const SPR = 2;
  const GLOW = {};
  function glow(c1) { const c = mk(64, 64); const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, c1); rg.addColorStop(0.35, c1.replace(/[\d.]+\)$/, '0.45)')); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return c; }
  GLOW.cyan = glow('rgba(125,211,252,1)'); GLOW.violet = glow('rgba(167,139,250,1)'); GLOW.orange = glow('rgba(253,186,116,1)'); GLOW.gold = glow('rgba(253,224,71,1)'); GLOW.purple = glow('rgba(168,85,247,1)'); GLOW.white = glow('rgba(255,255,255,1)');
  const FOG = (() => { const c = mk(256, 160); const g = c.getContext('2d'); for (let i = 0; i < 7; i++) { const x = 50 + Math.random() * 156; const y = 50 + Math.random() * 60; const r = 40 + Math.random() * 30; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(167,139,250,.55)'); rg.addColorStop(1, 'rgba(167,139,250,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 160); } return c; })();

  function eyes(g, x1, y1, r1, x2, y2, r2, look = 0.6) {
    [[x1, y1, r1], [x2, y2, r2]].forEach(([x, y, r]) => { g.fillStyle = '#fff'; ell(g, x, y, r, r * 1.15); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.stroke(); g.fillStyle = '#1e1b4b'; circ(g, x + look, y + 0.8, r * 0.5); g.fill(); g.fillStyle = '#fff'; circ(g, x + look - r * 0.2, y - r * 0.15, r * 0.18); g.fill(); });
  }
  function blob(g, r, drips) {
    g.beginPath(); g.moveTo(-r * 0.95, r * 0.3);
    g.bezierCurveTo(-r * 1.15, -r * 0.55, -r * 0.62, -r * 1.15, 0, -r * 1.15);
    g.bezierCurveTo(r * 0.62, -r * 1.15, r * 1.15, -r * 0.55, r * 0.95, r * 0.3);
    const n = drips; const w = (r * 1.9) / n;
    for (let i = 0; i < n; i++) { const x0 = r * 0.95 - i * w; const x1 = x0 - w; const dy = i % 2 ? r * 0.85 : r * 0.62; g.bezierCurveTo(x0, r * 0.75, (x0 + x1) / 2 + w * 0.3, dy, (x0 + x1) / 2, dy); g.bezierCurveTo((x0 + x1) / 2 - w * 0.3, dy, x1, r * 0.75, x1, r * 0.3); }
    g.closePath();
  }
  const DRAW = {
    kabut(g) {
      const r = 19; blob(g, r, 4);
      const rg = g.createRadialGradient(-6, -10, 2, 0, 0, r * 1.3); rg.addColorStop(0, '#e9d5ff'); rg.addColorStop(0.45, '#9f67fa'); rg.addColorStop(1, '#5b21b6');
      g.fillStyle = rg; g.fill(); g.strokeStyle = '#3b0764'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.45)'; ell(g, -7, -14, 6, 3.2); g.fill();
      eyes(g, -6.5, -4, 5, 6.5, -3, 4.1);
      g.strokeStyle = '#3b0764'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(-11, -12); g.lineTo(-3, -10); g.moveTo(10, -11); g.lineTo(3, -9.5); g.stroke();
      g.beginPath(); g.moveTo(-5, 6); g.quadraticCurveTo(-2.5, 4, 0, 6); g.quadraticCurveTo(2.5, 8, 5, 6); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(1, 6.3); g.lineTo(2.4, 9.5); g.lineTo(3.6, 6.8); g.fill();
      g.font = `900 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#3b0764'; g.strokeText('?', 15, -19); g.fillStyle = '#f5f3ff'; g.fillText('?', 15, -19);
    },
    kalong(g, f) {
      const up = f === 0;
      [-1, 1].forEach((sd) => {
        g.beginPath(); g.moveTo(sd * 5, -3);
        if (up) { g.quadraticCurveTo(sd * 18, -26, sd * 38, -20); g.quadraticCurveTo(sd * 31, -12, sd * 30, -6); g.quadraticCurveTo(sd * 24, -8, sd * 20, -1); g.quadraticCurveTo(sd * 14, -4, sd * 11, 4); g.quadraticCurveTo(sd * 8, 1, sd * 5, 5); }
        else { g.quadraticCurveTo(sd * 20, 2, sd * 38, 14); g.quadraticCurveTo(sd * 30, 14, sd * 28, 20); g.quadraticCurveTo(sd * 22, 14, sd * 17, 19); g.quadraticCurveTo(sd * 13, 12, sd * 9, 14); g.quadraticCurveTo(sd * 8, 8, sd * 5, 5); }
        g.closePath(); g.fillStyle = '#6d4a8f'; g.fill(); g.strokeStyle = '#2a1638'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = 'rgba(220,190,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sd * 6, 0); g.lineTo(sd * 30, up ? -10 : 13); g.moveTo(sd * 6, 1); g.lineTo(sd * 19, up ? 0 : 16); g.stroke();
      });
      const rg = g.createRadialGradient(-2, -4, 1, 0, 0, 14); rg.addColorStop(0, '#7e5ba3'); rg.addColorStop(1, '#2e1a45');
      g.fillStyle = rg; ell(g, 0, 0, 10, 12); g.fill(); g.strokeStyle = '#1a0e26'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = '#3f2a55'; g.beginPath(); g.moveTo(-8, -7); g.lineTo(-7, -17); g.lineTo(-2, -10); g.fill(); g.beginPath(); g.moveTo(8, -7); g.lineTo(7, -17); g.lineTo(2, -10); g.fill();
      g.fillStyle = '#fdba74'; ell(g, -3.8, -3, 3, 2.6); g.fill(); ell(g, 3.8, -3, 3, 2.6); g.fill();
      g.fillStyle = '#7c2d12'; g.fillRect(-4.3, -5, 1.2, 4); g.fillRect(3.3, -5, 1.2, 4);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-3, 4); g.lineTo(-2, 8); g.lineTo(-1, 4); g.moveTo(1, 4); g.lineTo(2, 8); g.lineTo(3, 4); g.fill();
    },
    golem(g, f) {
      const step = f === 0 ? 1 : -1;
      g.fillStyle = '#57534e'; ell(g, -9, 20 + step, 7, 5); g.fill(); ell(g, 9, 20 - step, 7, 5); g.fill();
      g.fillStyle = '#78716c'; circ(g, -24, 2 - step, 8); g.fill(); circ(g, 24, 2 + step, 8); g.fill();
      const pts = [[-20, 12], [-24, -4], [-16, -20], [-2, -26], [14, -22], [23, -8], [21, 10], [8, 19], [-10, 19]];
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      const rg = g.createRadialGradient(-8, -12, 2, 0, 0, 30); rg.addColorStop(0, '#d6d3d1'); rg.addColorStop(0.5, '#a8a29e'); rg.addColorStop(1, '#57534e');
      g.fillStyle = rg; g.fill(); g.strokeStyle = '#292524'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#65a30d'; ell(g, -6, -22, 10, 4.5); g.fill(); g.fillStyle = '#84cc16'; ell(g, -8, -23.5, 5, 2); g.fill(); ell(g, 13, -18, 5, 3); g.fillStyle = '#65a30d'; g.fill();
      g.strokeStyle = '#44403c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-14, 6); g.lineTo(-8, 10); g.lineTo(-10, 15); g.moveTo(15, -4); g.lineTo(10, 2); g.stroke();
      g.fillStyle = '#7c2d12'; g.fillRect(-12, -9, 9, 6); g.fillRect(3, -9, 9, 6);
      g.fillStyle = '#fb923c'; g.fillRect(-11, -8, 7, 3.6); g.fillRect(4, -8, 7, 3.6); g.fillStyle = '#fde68a'; g.fillRect(-9, -7.4, 3, 2); g.fillRect(6, -7.4, 3, 2);
      g.strokeStyle = '#fb923c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, 5); g.lineTo(-3, 3); g.lineTo(1, 6); g.lineTo(6, 3); g.stroke();
    },
    jamur(g, f) {
      const st = f === 0 ? 1.2 : -1.2;
      g.fillStyle = '#d6c3a0'; ell(g, -6, 17 + st, 5, 3); g.fill(); ell(g, 6, 17 - st, 5, 3); g.fill();
      const sg = g.createLinearGradient(-9, 0, 9, 0); sg.addColorStop(0, '#e9d5b0'); sg.addColorStop(0.5, '#fffaf0'); sg.addColorStop(1, '#d6c3a0');
      g.fillStyle = sg; rrect(g, -9.5, -3, 19, 20, 7); g.fill(); g.strokeStyle = '#7c5a2b'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = '#3b2612'; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath(); g.arc(-4, 4, 2.4, 0.2, Math.PI - 0.2); g.moveTo(6.4, 4.4); g.arc(4, 4, 2.4, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = '#f9a8d4'; ell(g, -6.5, 8, 2, 1.2); g.fill(); ell(g, 6.5, 8, 2, 1.2); g.fill();
      g.fillStyle = '#3b2612'; ell(g, 0, 10.5, 1.7, 2.2); g.fill();
      g.beginPath(); g.moveTo(-23, 1); g.bezierCurveTo(-24, -14, -12, -23, 0, -23); g.bezierCurveTo(12, -23, 24, -14, 23, 1); g.quadraticCurveTo(0, -5, -23, 1); g.closePath();
      const cg = g.createRadialGradient(-7, -15, 2, 0, -8, 26); cg.addColorStop(0, '#fca5a5'); cg.addColorStop(0.5, '#ef4444'); cg.addColorStop(1, '#991b1b');
      g.fillStyle = cg; g.fill(); g.strokeStyle = '#7f1d1d'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff7ed'; [[-12, -10, 3.6], [0, -17, 3.2], [11, -10, 3.4], [-3, -7, 2.3], [17, -3, 2]].forEach(([x, y, r]) => { circ(g, x, y, r); g.fill(); });
      g.font = `900 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#e0f2fe'; g.strokeStyle = '#1e3a8a'; g.lineWidth = 2.5; g.strokeText('z', 20, -20); g.fillText('z', 20, -20); g.font = `900 7px ${FONT}`; g.strokeText('z', 25, -26); g.fillText('z', 25, -26);
    },
    spora(g) {
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; g.strokeStyle = '#65a30d'; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); g.lineTo(Math.cos(a) * 12.5, Math.sin(a) * 12.5); g.stroke(); }
      const rg = g.createRadialGradient(-3, -3, 1, 0, 0, 11); rg.addColorStop(0, '#f7fee7'); rg.addColorStop(0.5, '#bef264'); rg.addColorStop(1, '#4d7c0f');
      g.fillStyle = rg; circ(g, 0, 0, 10); g.fill(); g.strokeStyle = '#365314'; g.lineWidth = 1.4; g.stroke();
      eyes(g, -3.3, -1, 2.6, 3.3, -1, 2.6, 0.4);
    },
    boss(g) {
      for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(167,139,250,.25)'; circ(g, -36 + k * 18, 34, 14); g.fill(); }
      g.strokeStyle = '#3b0764'; g.lineWidth = 3; g.lineCap = 'round';
      [[-1], [1]].forEach(([sd]) => { g.fillStyle = '#f5e6c8'; g.beginPath(); g.moveTo(sd * 22, -30); g.quadraticCurveTo(sd * 44, -44, sd * 40, -64); g.quadraticCurveTo(sd * 34, -48, sd * 14, -38); g.closePath(); g.fill(); g.lineWidth = 2; g.stroke(); });
      blob(g, 42, 6);
      const rg = g.createRadialGradient(-14, -22, 4, 0, 0, 56); rg.addColorStop(0, '#c084fc'); rg.addColorStop(0.45, '#7e22ce'); rg.addColorStop(1, '#2e1065');
      g.fillStyle = rg; g.fill(); g.lineWidth = 3; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, -16, -32, 13, 6); g.fill();
      // mahkota
      g.beginPath(); g.moveTo(-24, -40); g.lineTo(-28, -64); g.lineTo(-14, -52); g.lineTo(0, -70); g.lineTo(14, -52); g.lineTo(28, -64); g.lineTo(24, -40); g.closePath();
      const cg = g.createLinearGradient(0, -70, 0, -40); cg.addColorStop(0, '#fef08a'); cg.addColorStop(1, '#ca8a04'); g.fillStyle = cg; g.fill(); g.strokeStyle = '#713f12'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#dc2626'; circ(g, 0, -50, 4); g.fill(); g.fillStyle = '#22d3ee'; circ(g, -15, -46, 3); g.fill(); circ(g, 15, -46, 3); g.fill();
      // mata marah menyala
      [[-15, -10], [15, -10]].forEach(([x, y]) => { g.fillStyle = '#fde047'; ell(g, x, y, 9, 7); g.fill(); g.fillStyle = '#7c2d12'; ell(g, x + 1, y + 1, 3.5, 5); g.fill(); });
      g.strokeStyle = '#1e0538'; g.lineWidth = 4; g.beginPath(); g.moveTo(-27, -22); g.lineTo(-6, -15); g.moveTo(27, -22); g.lineTo(6, -15); g.stroke();
      g.fillStyle = '#1e0538'; g.beginPath(); g.moveTo(-18, 8); g.quadraticCurveTo(0, 26, 18, 8); g.quadraticCurveTo(0, 14, -18, 8); g.fill();
      g.fillStyle = '#fff'; for (let k = -12; k <= 12; k += 6) { g.beginPath(); g.moveTo(k - 2.5, 10); g.lineTo(k, 16); g.lineTo(k + 2.5, 10); g.fill(); }
    }
  };
  const FRAMES = { kabut: 1, kalong: 2, golem: 2, jamur: 2, spora: 1, boss: 1 };
  const SPRITES = {}; const SPR_URL = {};
  function tint(src, color) { const c = mk(src.width, src.height); const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); return c; }
  function buildSprites() {
    Object.keys(EN).forEach((k) => {
      const box = EN[k].box; SPRITES[k] = [];
      for (let f = 0; f < FRAMES[k]; f++) {
        const c = mk(box * SPR, box * SPR); const g = c.getContext('2d'); g.scale(SPR, SPR); g.translate(box / 2, box / 2); g.lineJoin = 'round';
        DRAW[k](g, f); SPRITES[k].push({ c, white: tint(c, '#ffffff'), blue: tint(c, 'rgba(125,211,252,1)') });
      }
      SPR_URL[k] = SPRITES[k][0].c.toDataURL();
    });
  }
  buildSprites();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildSprites(); baseCache = null; Object.keys(thumbs).forEach((k) => delete thumbs[k]); });

  /* ============================== STATUS GAME ============================== */
  let S = { waves: 10, diff: 'sedang', gold: 200, pauseQ: 'off', time: 0 };
  let teams = [];
  let phase = 'idle'; // idle | build | wave | over
  let wave = 0; let gold = 0; let hp = 20; let maxHp = 20;
  let enemies = []; let towers = []; let shots = []; let parts = []; let texts = []; let bolts = []; let rings = [];
  let spawnQ = []; let spawnT = 0; let waveTotal = 0; let waveDone = 0; let nextList = null;
  let speed = 1; let manualPause = false; let fogT = 0; let gongT = 0; let gongV = 0; let time = 0; let shakeT = 0; let fortFlash = 0; let overT = 0;
  let selSlot = -1; let hoverSlot = -1; let previewType = null;
  let stats = { kills: 0, goldQ: 0, built: 0, leaked: 0, qTotal: 0, qRight: 0 };
  let q = null; let qState = 'idle'; let qT = 0; let turn = 0; let combo = 0; let bestCombo = 0; let fbT = 0; let fbDur = 0; let lastTick = -1;
  const towerAt = (i) => towers.find((t) => t.slot === i);

  /* ============================== KANVAS & UKURAN ============================== */
  const wrap = $('mapwrap'); const cv = $('cv'); const ctx = cv.getContext('2d');
  let CW = 0; let CH = 0; let DPR = 1; let SC = 1; let OX = 0; let OY = 0;
  let baseCache = null; let towerCache = null; let towerDirty = true;
  function resize() {
    const r = wrap.getBoundingClientRect(); CW = Math.max(120, r.width); CH = Math.max(90, r.height);
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
    SC = Math.min(CW / WW, CH / WH); OX = (CW - WW * SC) / 2; OY = (CH - WH * SC) / 2;
    baseCache = null; towerDirty = true; placeMenu(); fitQ();
  }
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(wrap); else addEventListener('resize', resize);
  function buildBase() {
    const k = SC * DPR; const c = mk(WW * k, WH * k); const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
    paintMap(g); baseCache = c; towerDirty = true;
  }
  function buildTowerLayer() {
    if (!baseCache) buildBase();
    if (!towerCache || towerCache.width !== baseCache.width || towerCache.height !== baseCache.height) towerCache = mk(baseCache.width, baseCache.height);
    const g = towerCache.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, towerCache.width, towerCache.height); g.drawImage(baseCache, 0, 0);
    const k = SC * DPR; g.setTransform(k, 0, 0, k, 0, 0);
    SLOTS.forEach((s) => drawSlot(g, s.x, s.y));
    towers.slice().sort((a, b) => a.y - b.y).forEach((t) => drawTowerBody(g, t.type, t.lvl, t.x, t.y));
    towerDirty = false;
  }

  /* ============================== GELOMBANG ============================== */
  function buildWave(w) {
    const d = DIFF[S.diff] || DIFF.sedang;
    const hpMul = (1 + 0.24 * (w - 1) + 0.016 * (w - 1) * (w - 1)) * d.hp;
    const n = Math.round((5 + w * 2.1) * d.n);
    const pool = [['kabut', 5]]; if (w >= 2) pool.push(['kalong', 3]); if (w >= 3) pool.push(['golem', w >= 6 ? 3 : 2]); if (w >= 4) pool.push(['jamur', 3]);
    const tot = pool.reduce((a, p) => a + p[1], 0);
    const pick = () => { let r = Math.random() * tot; for (const [k, wt] of pool) { r -= wt; if (r <= 0) return k; } return 'kabut'; };
    const gapMul = Math.max(0.62, 1 - w * 0.03);
    const list = []; let left = n;
    while (left > 0) {
      const type = pick(); const size = Math.min(left, type === 'golem' ? rint(1, 2) : rint(2, 4));
      for (let i = 0; i < size; i++) list.push({ type, gap: (type === 'kalong' ? 0.42 : type === 'golem' ? 1.25 : 0.82) * gapMul });
      list[list.length - 1].gap += 0.9; left -= size;
    }
    if (w % 5 === 0) list.splice(Math.max(1, list.length - 3), 0, { type: 'boss', gap: 2.2 });
    list.hpMul = hpMul; list.boss = w % 5 === 0;
    return list;
  }
  function waveCount(list) { return list.reduce((a, e) => a + 1 + (EN[e.type].split || 0), 0); }
  function startWave() {
    if (phase !== 'build' || QC.isBusy()) return;
    wave++; phase = 'wave'; const src = nextList || buildWave(wave); spawnQ = src.slice(); spawnQ.hpMul = src.hpMul; spawnQ.boss = src.boss; nextList = null;
    spawnT = 0.6; waveTotal = waveCount(spawnQ); waveDone = 0; closeMenu();
    sfx('whoosh'); if (spawnQ.boss) { setTimeout(() => sfx('horn'), 300); }
    FX.announce(spawnQ.boss ? `👑 GELOMBANG ${wave}` : `GELOMBANG ${wave}`, { color: spawnQ.boss ? '#6d28d9' : '#b45309', sub: spawnQ.boss ? 'Awas! RAJA KABUT ikut menyerbu!' : `${spawnQ.length} musuh keluar dari Gua Kabut`, dur: 1500 });
    updWaveUI(); updTip();
  }
  function spawn(type, d0 = 0, hpMul = 1) {
    const def = EN[type]; const hpv = Math.round(def.hp * hpMul);
    const e = { type, def, hp: hpv, max: hpv, d: d0, seg: 0, x: PATH[0].x, y: PATH[0].y, face: 1, slowA: 0, slowU: 0, flash: 0, ph: Math.random() * TAU, dead: false };
    while (e.seg < PATH.length - 2 && PATH[e.seg + 1].d <= e.d) e.seg++;
    enemies.push(e); return e;
  }
  function waveCleared() {
    const bonus = 15 + wave * 5;
    addGold(bonus); FX.floatTextAt($('goldBox'), `+${bonus}`, '#fde047', 30); sfx('coin');
    if (wave >= S.waves) { endGame(true); return; }
    phase = 'build'; nextList = buildWave(wave + 1);
    FX.announce(`GELOMBANG ${wave} BERES! ✨`, { color: '#15803d', sub: `Bonus +${bonus} emas • Siapkan menara untuk gelombang ${wave + 1}`, dur: 1600 });
    updWaveUI(); updTip();
  }

  /* ============================== EKONOMI ============================== */
  let goldShown = 0;
  function addGold(v, anim = true) {
    const from = gold; gold = Math.max(0, gold + v);
    const el = $('goldTxt');
    if (anim && v > 0) { FX.countUp(el, from, gold, 650); const b = $('goldBox'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    else el.textContent = gold;
    goldShown = gold; refreshMenuAfford();
  }
  function poorFx() { const b = $('goldBox'); b.classList.remove('poor'); void b.offsetWidth; b.classList.add('poor'); QC.sfx.wrong(); QC.toast('🪙 Emas kurang! Jawab soal dulu untuk menambah emas 😉', 'bad'); }

  /* ============================== MENARA: bangun/upgrade/jual ============================== */
  function build(slot, type) {
    const c = TW[type].cost[0]; if (gold < c) { poorFx(); return; }
    const s = SLOTS[slot]; addGold(-c, false);
    const t = { slot, type, lvl: 1, x: s.x, y: s.y, cd: 0.2, ang: -Math.PI / 2, recoil: 0, tgt: null, re: 0, aim: 'first', invested: c, kills: 0 };
    towers.push(t); towerDirty = true; stats.built++;
    sfx('build'); burst(s.x, s.y - 10, '#e9c27a', 14, 120); ring(s.x, s.y, '#fde68a', 60); txt(s.x, s.y - 70, `-${c}`, '#fde047', 20);
    closeMenu(); updTip();
  }
  function upgrade(t) {
    if (t.lvl >= 3) return; const c = TW[t.type].cost[t.lvl]; if (gold < c) { poorFx(); return; }
    addGold(-c, false); t.lvl++; t.invested += c; towerDirty = true;
    QC.sfx.magic(); ring(t.x, t.y - 20, '#fde047', 80); burst(t.x, t.y - 30, '#fde047', 18, 150); txt(t.x, t.y - 90, `LEVEL ${t.lvl}!`, '#fde047', 24);
    openMenu(t.slot);
  }
  const sellValue = (t) => Math.floor(t.invested * 0.7);
  function sell(t) {
    const v = sellValue(t); towers = towers.filter((x) => x !== t); towerDirty = true; addGold(v);
    sfx('coin'); burst(t.x, t.y - 20, '#fde047', 12, 120); txt(t.x, t.y - 60, `+${v}`, '#fde047', 22); closeMenu();
  }

  /* ============================== MENU MENARA (HTML) ============================== */
  const menu = $('tmenu');
  function statLine(type, L) {
    const d = TW[type]; const i = L - 1; const nx = L < 3 ? i + 1 : -1;
    const up = (arr, f = (v) => v) => (nx >= 0 ? ` <em>→ ${f(arr[nx])}</em>` : '');
    const rows = [[`💥 Kerusakan`, `<b>${d.dmg[i]}</b>${up(d.dmg)}`], [`🎯 Jangkauan`, `<b>${d.range[i]}</b>${up(d.range)}`], [`⏱️ Tembakan/dtk`, `<b>${(1 / d.rate[i]).toFixed(1)}</b>${up(d.rate, (v) => (1 / v).toFixed(1))}`]];
    if (type === 'cannon') rows.push(['💣 Ledakan', `<b>${d.splash[i]}</b>${up(d.splash)}`]);
    if (type === 'ice') rows.push(['❄️ Lambat', `<b>${Math.round(d.slow[i] * 100)}%</b>${up(d.slow, (v) => Math.round(v * 100) + '%')}`]);
    if (type === 'bolt') rows.push(['⚡ Rambatan', `<b>${d.chain[i]}</b>${up(d.chain)}`]);
    return rows.map(([a, b]) => `<div>${a}<br>${b}</div>`).join('');
  }
  function openMenu(i) {
    selSlot = i; previewType = null; const t = towerAt(i); menu.hidden = false;
    if (!t) {
      menu.className = 'tmenu build';
      menu.innerHTML = `<div class="tm-head"><b>🔨 Bangun Menara</b><button class="tm-x" data-x title="Tutup (Esc)">✕</button></div><div class="tm-grid">${TW_ORDER.map((k) => { const d = TW[k]; return `<button class="tm-opt" data-b="${k}" data-c="${d.cost[0]}"><img src="${thumb(k, 1)}" alt=""><span class="tm-name">${d.icon} ${d.short}</span><span class="tm-desc">${d.desc}</span><span class="tm-cost">🪙 ${d.cost[0]}</span></button>`; }).join('')}</div>`;
      menu.querySelectorAll('[data-b]').forEach((b) => {
        b.onclick = () => build(i, b.dataset.b);
        b.onpointerenter = () => { previewType = b.dataset.b; }; b.onpointerleave = () => { previewType = null; };
      });
    } else {
      const d = TW[t.type]; const max = t.lvl >= 3; const uc = max ? 0 : d.cost[t.lvl];
      menu.className = 'tmenu info';
      menu.innerHTML = `<div class="tm-head"><img src="${thumb(t.type, t.lvl)}" alt=""><div><b>${d.icon} ${d.name}</b><small>Level ${t.lvl} ${'⭐'.repeat(t.lvl)} • ${t.kills} musuh</small></div><button class="tm-x" data-x title="Tutup (Esc)">✕</button></div>
        <div class="tm-stats">${statLine(t.type, t.lvl)}</div>
        <div class="tm-aim">🎯 Bidik: <button data-aim="first" class="${t.aim === 'first' ? 'on' : ''}">Terdepan</button><button data-aim="strong" class="${t.aim === 'strong' ? 'on' : ''}">Terkuat</button></div>
        <div class="tm-acts"><button class="tm-up" data-up data-c="${uc}" ${max ? 'disabled' : ''}>${max ? '⭐ Level Maks' : `⬆️ Naik Level <b>🪙 ${uc}</b>`}</button><button class="tm-sell" data-sell>💰 Jual <b>+${sellValue(t)}</b></button></div>`;
      menu.querySelector('[data-up]').onclick = () => upgrade(t);
      menu.querySelector('[data-sell]').onclick = () => sell(t);
      menu.querySelectorAll('[data-aim]').forEach((b) => (b.onclick = () => { t.aim = b.dataset.aim; t.tgt = null; QC.sfx.click(); openMenu(i); }));
    }
    menu.querySelector('[data-x]').onclick = () => closeMenu();
    refreshMenuAfford(); placeMenu();
  }
  function refreshMenuAfford() {
    if (menu.hidden) return;
    menu.querySelectorAll('[data-c]').forEach((b) => { const c = +b.dataset.c; b.classList.toggle('poor', c > 0 && gold < c); });
  }
  function closeMenu() { selSlot = -1; previewType = null; menu.hidden = true; }
  function placeMenu() {
    if (menu.hidden || selSlot < 0) return;
    const s = SLOTS[selSlot]; const sx = OX + s.x * SC; const sy = OY + s.y * SC; const mw = menu.offsetWidth; const mh = menu.offsetHeight; const gap = (SLOT_R + 12) * SC;
    let x = sx + gap; if (x + mw > CW - 6) x = sx - gap - mw; if (x < 6) x = clamp(sx - mw / 2, 6, CW - mw - 6);
    let y = clamp(sy - mh / 2, 6, CH - mh - 6);
    if (x < sx && x + mw > sx && y < sy + gap && y + mh > sy - gap) y = sy + gap + mh < CH ? sy + gap : Math.max(6, sy - gap - mh);
    menu.style.left = Math.round(x) + 'px'; menu.style.top = Math.round(y) + 'px';
  }

  /* ============================== MASUKAN PETA ============================== */
  function toWorld(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - OX) / SC, y: (e.clientY - r.top - OY) / SC }; }
  function slotHit(p) { let best = -1; let bd = HIT_R; SLOTS.forEach((s) => { const t = towerAt(s.i); const cy = t ? s.y - 22 : s.y; const dd = Math.min(Math.hypot(p.x - s.x, p.y - s.y), t ? Math.hypot(p.x - s.x, p.y - cy) : 1e9); if (dd < bd) { bd = dd; best = s.i; } }); return best; }
  cv.addEventListener('pointerdown', (e) => {
    if (phase !== 'build' && phase !== 'wave') return;
    const i = slotHit(toWorld(e));
    if (i >= 0) { QC.sfx.click(); if (selSlot === i) closeMenu(); else openMenu(i); }
    else closeMenu();
  });
  cv.addEventListener('pointermove', (e) => { hoverSlot = slotHit(toWorld(e)); cv.style.cursor = hoverSlot >= 0 ? 'pointer' : 'default'; });
  cv.addEventListener('pointerleave', () => { hoverSlot = -1; });

  /* ============================== EFEK ============================== */
  const MAXP = 240;
  function burst(x, y, c, n, sp, kind = 'dot') { for (let i = 0; i < n && parts.length < MAXP; i++) { const a = Math.random() * TAU; const v = sp * (0.35 + Math.random() * 0.75); parts.push({ k: kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: 0.5 + Math.random() * 0.4, max: 0.9, s: 2 + Math.random() * 3, c }); } }
  function smoke(x, y, n) { for (let i = 0; i < n && parts.length < MAXP; i++) parts.push({ k: 'smoke', x: x + rnd(-10, 10), y: y + rnd(-6, 6), vx: rnd(-15, 15), vy: rnd(-40, -15), life: 0.9, max: 0.9, s: 8 + Math.random() * 8, c: 'rgba(80,70,70,' }); }
  function ring(x, y, c, size, w = 4) { if (rings.length < 30) rings.push({ x, y, c, size, w, life: 0.45, max: 0.45 }); }
  function txt(x, y, s, c, size = 16, big = false) { if (texts.length > 46) texts.shift(); texts.push({ x, y, s, c, size, life: big ? 1.4 : 0.85, max: big ? 1.4 : 0.85, vy: big ? -26 : -44 }); }

  /* ============================== SIMULASI ============================== */
  function hurt(e, dmg, src) {
    if (e.dead) return 0;
    const real = src === 'bolt' ? dmg : Math.max(1, dmg - e.def.armor);
    e.hp -= real; e.flash = 0.09;
    txt(e.x + rnd(-8, 8), e.y - e.def.r * 1.6 - (e.def.fly ? 14 : 0), String(Math.round(real)), src === 'bolt' ? '#ddd6fe' : src === 'ice' ? '#bae6fd' : '#ffffff', e.def.boss ? 20 : 15);
    if (e.hp <= 0) kill(e, src);
    return real;
  }
  function kill(e, src) {
    e.dead = true; stats.kills++; waveDone++; addGold(e.def.gold, false);
    const y = e.y - e.def.r * 0.6 - (e.def.fly ? 14 : 0);
    burst(e.x, y, e.def.col, e.def.boss ? 40 : 10, e.def.boss ? 260 : 130); ring(e.x, y, e.def.col, e.def.boss ? 160 : 50);
    txt(e.x, y - 18, `+${e.def.gold}🪙`, '#fde047', e.def.boss ? 26 : 15, e.def.boss);
    sfx('pop', 0.06);
    if (e.def.split) { for (let k = 0; k < e.def.split; k++) { const s = spawn('spora', Math.max(0, e.d - k * 16), (spawnQ.hpMul || 1)); s.face = e.face; } }
    if (e.def.boss) { QC.sfx.boom(); shakeT = 0.6; FX.announce('👑 RAJA KABUT KALAH!', { color: '#7e22ce', sub: `+${e.def.gold} emas • Hebat, kelas kompak!`, dur: 1700 }); smoke(e.x, y, 10); }
    if (src && src.kills != null) src.kills++;
  }
  function inRange(t, e, r) { const dx = e.x - t.x; const dy = e.y - t.y; return dx * dx + dy * dy <= r * r; }
  function pickTarget(t, r) {
    let best = null; let bv = -1e9; const ice = t.type === 'ice';
    for (const e of enemies) {
      if (e.dead || (t.type === 'cannon' && e.def.fly) || !inRange(t, e, r)) continue;
      let v = t.aim === 'strong' ? e.hp * 10 + e.d * 0.01 : e.d;
      if (ice && time < e.slowU) v -= 1e6; // utamakan musuh yang belum lambat
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }
  function fire(t) {
    const d = TW[t.type]; const i = t.lvl - 1; const o = towerTopLocal(t.type, t.lvl); const ox = t.x + o.x; const oy = t.y + o.y; const e = t.tgt;
    t.recoil = 1;
    if (t.type === 'archer') { shots.push({ k: 'arrow', x: ox, y: oy, tg: e, tx: e.x, ty: e.y, spd: 640, dmg: d.dmg[i], src: t }); sfx('twang', 0.09); }
    else if (t.type === 'ice') { shots.push({ k: 'ice', x: ox, y: oy, tg: e, tx: e.x, ty: e.y, spd: 430, dmg: d.dmg[i], slow: d.slow[i], dur: d.slowDur[i], area: d.area[i], src: t, rot: 0 }); sfx('chime', 0.12); }
    else if (t.type === 'cannon') {
      const mx = ox + Math.cos(t.ang) * 26 * LVS[i]; const my = oy + Math.sin(t.ang) * 26 * LVS[i];
      const dist = Math.hypot(e.x - mx, e.y - my); const dur = clamp(dist / 360, 0.42, 0.85);
      const sp = e.def.spd * (time < e.slowU ? 1 - e.slowA : 1); const p = posAt(e.d + sp * dur);
      shots.push({ k: 'ball', sx: mx, sy: my, gx: t.x, gy: t.y, tx: p.x, ty: p.y, t: 0, dur, h: 60 + dist * 0.25, dmg: d.dmg[i], splash: d.splash[i], src: t, lvl: t.lvl });
      sfx('thump', 0.12); smoke(mx, my, 2);
    } else {
      const hit = [e]; let last = e; let dmg = d.dmg[i];
      for (let k = 1; k < d.chain[i]; k++) {
        let nb = null; let nd = 115 * 115;
        for (const x of enemies) { if (x.dead || hit.includes(x)) continue; const dd = (x.x - last.x) ** 2 + (x.y - last.y) ** 2; if (dd < nd) { nd = dd; nb = x; } }
        if (!nb) break; hit.push(nb); last = nb;
      }
      const pts = [{ x: ox, y: oy }].concat(hit.map((h) => ({ x: h.x, y: h.y - h.def.r * 0.6 - (h.def.fly ? 14 : 0) })));
      const zig = []; for (let k = 1; k < pts.length; k++) { const a = pts[k - 1]; const b = pts[k]; const n = 6; for (let j = 0; j <= n; j++) { const tt = j / n; const off = j === 0 || j === n ? 0 : rnd(-9, 9); const dx = b.x - a.x; const dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; zig.push({ x: a.x + dx * tt - (dy / l) * off, y: a.y + dy * tt + (dx / l) * off }); } }
      bolts.push({ pts: zig, life: 0.22, max: 0.22, lvl: t.lvl });
      hit.forEach((h, k) => { const p = pts[k + 1]; burst(p.x, p.y, '#ddd6fe', 5, 110); hurt(h, dmg, 'bolt'); if (h.dead) t.kills++; dmg *= 0.82; });
      sfx('zap', 0.1);
    }
  }
  function update(dt) {
    time += dt;
    if (fogT > 0) fogT = Math.max(0, fogT - dt);
    if (gongT > 0) gongT = Math.max(0, gongT - dt);
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
    if (fortFlash > 0) fortFlash = Math.max(0, fortFlash - dt);
    // munculkan musuh
    if (phase === 'wave' && spawnQ.length) {
      spawnT -= dt;
      while (spawnT <= 0 && spawnQ.length) {
        const it = spawnQ.shift(); const e = spawn(it.type, 0, spawnQ.hpMul || 1);
        if (e.def.boss) { shakeT = 0.5; QC.sfx.boom(); txt(90, 150, 'RAJA KABUT!', '#e9d5ff', 26, true); }
        spawnT += it.gap;
      }
    }
    // gerak musuh
    for (const e of enemies) {
      if (e.dead) continue;
      const slow = time < e.slowU ? 1 - e.slowA : 1;
      e.d += e.def.spd * slow * dt; e.flash = Math.max(0, e.flash - dt);
      if (e.d >= LEN - 6) { leak(e); continue; }
      while (e.seg < PATH.length - 2 && PATH[e.seg + 1].d <= e.d) e.seg++;
      const a = PATH[e.seg]; const b = PATH[e.seg + 1]; const tt = (e.d - a.d) / ((b.d - a.d) || 1);
      const nx = lerp(a.x, b.x, tt); if (Math.abs(nx - e.x) > 0.01) e.face = nx >= e.x ? 1 : -1;
      e.x = nx; e.y = lerp(a.y, b.y, tt);
    }
    // menara
    const rateMul = (gongT > 0 ? 1.7 : 1) * (fogT > 0 && gongT <= 0 ? 0.7 : 1);
    for (const t of towers) {
      const d = TW[t.type]; const r = d.range[t.lvl - 1];
      t.recoil = Math.max(0, t.recoil - dt * 3.2); t.cd -= dt * rateMul; t.re -= dt;
      if (t.re <= 0 || !t.tgt || t.tgt.dead || !inRange(t, t.tgt, r)) { t.tgt = pickTarget(t, r); t.re = 0.15; }
      if (t.tgt && (t.type === 'archer' || t.type === 'cannon')) {
        const o = towerTopLocal(t.type, t.lvl); const want = Math.atan2(t.tgt.y - (t.y + o.y) - 10, t.tgt.x - (t.x + o.x));
        let da = want - t.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; t.ang += da * Math.min(1, dt * 12);
      }
      if (t.cd <= 0) { if (t.tgt) { fire(t); t.cd = d.rate[t.lvl - 1]; } else t.cd = 0; }
    }
    // proyektil
    for (const s of shots) {
      if (s.k === 'ball') {
        s.t += dt / s.dur;
        if (s.t >= 1) { s.done = true; explode(s); }
        continue;
      }
      if (s.tg && !s.tg.dead) { s.tx = s.tg.x; s.ty = s.tg.y - s.tg.def.r * 0.6 - (s.tg.def.fly ? 14 : 0); }
      const dx = s.tx - s.x; const dy = s.ty - s.y; const l = Math.hypot(dx, dy); const st = s.spd * dt;
      s.ang = Math.atan2(dy, dx); if (s.k === 'ice') { s.rot += dt * 10; if (parts.length < MAXP && Math.random() < 0.5) parts.push({ k: 'dot', x: s.x, y: s.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.3, max: 0.3, s: 2, c: '#e0f2fe' }); }
      if (l <= st + 4) {
        s.done = true;
        if (s.tg && !s.tg.dead) {
          if (s.k === 'arrow') { hurt(s.tg, s.dmg, 'arrow'); if (s.tg.dead) s.src.kills++; burst(s.tx, s.ty, '#fde68a', 3, 70); }
          else {
            const hitList = s.area ? enemies.filter((e) => !e.dead && Math.hypot(e.x - s.tg.x, e.y - s.tg.y) <= s.area) : [s.tg];
            hitList.forEach((e) => { e.slowA = Math.max(time < e.slowU ? e.slowA : 0, s.slow * (e.def.boss ? 0.5 : 1)); e.slowU = Math.max(e.slowU, time + s.dur); hurt(e, s.dmg, 'ice'); if (e.dead) s.src.kills++; });
            burst(s.tx, s.ty, '#bae6fd', 8, 90); if (s.area) ring(s.tx, s.ty, '#bae6fd', s.area * 2, 3);
          }
        }
      } else { s.x += (dx / l) * st; s.y += (dy / l) * st; }
    }
    shots = shots.filter((s) => !s.done);
    if (enemies.some((e) => e.dead)) enemies = enemies.filter((e) => !e.dead);
    // efek
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'dot') { p.vy += 260 * dt; p.vx *= 0.97; } else { p.vx *= 0.95; p.vy *= 0.95; } }
    parts = parts.filter((p) => p.life > 0);
    for (const r of rings) r.life -= dt; rings = rings.filter((r) => r.life > 0);
    for (const b of bolts) b.life -= dt; bolts = bolts.filter((b) => b.life > 0);
    for (const t of texts) { t.life -= dt; t.y += t.vy * dt; } texts = texts.filter((t) => t.life > 0);
    if (hp > 0 && hp / maxHp < 0.5 && Math.random() < dt * 3) smoke(1080 + rnd(0, 90), 340 + rnd(0, 150), 1);
    if (phase === 'wave' && !spawnQ.length && !enemies.length) waveCleared();
  }
  function explode(s) {
    const L = s.lvl; const R = s.splash;
    burst(s.tx, s.ty, '#fb923c', 12, 170); burst(s.tx, s.ty, '#fde047', 6, 120); smoke(s.tx, s.ty, 4); ring(s.tx, s.ty, '#fed7aa', R * 2, 5);
    rings.push({ x: s.tx, y: s.ty, c: 'glow', size: R * 1.6, life: 0.3, max: 0.3 });
    for (const e of enemies) {
      if (e.dead || e.def.fly) continue; const dd = Math.hypot(e.x - s.tx, e.y - s.ty);
      if (dd <= R) { hurt(e, s.dmg * (1 - 0.45 * (dd / R)), 'cannon'); if (e.dead) s.src.kills++; }
    }
    sfx('hit', 0.1); if (L === 3) shakeT = Math.max(shakeT, 0.12);
  }
  function leak(e) {
    e.dead = true; waveDone++; stats.leaked++;
    hp = Math.max(0, hp - e.def.dmg); fortFlash = 0.5; shakeT = Math.max(shakeT, e.def.boss ? 0.7 : 0.25);
    burst(1070, 420, '#ef4444', 10, 150); txt(1100, 360, `-${e.def.dmg} ❤️`, '#fca5a5', 22, true); sfx('hit', 0.1);
    const hb = $('hpBox'); hb.classList.remove('hit'); void hb.offsetWidth; hb.classList.add('hit');
    updHp();
    if (hp <= 0 && phase !== 'over') endGame(false);
  }

  /* ============================== GAMBAR PER FRAME ============================== */
  function draw() {
    if (!baseCache || towerDirty) { buildTowerLayer(); rebuilt = true; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    let sx = 0; let sy = 0; if (shakeT > 0) { sx = rnd(-1, 1) * shakeT * 12; sy = rnd(-1, 1) * shakeT * 9; }
    ctx.drawImage(towerCache, Math.round((OX + sx) * DPR), Math.round((OY + sy) * DPR));
    const k = DPR * SC; ctx.setTransform(k, 0, 0, k, (OX + sx) * DPR, (OY + sy) * DPR);
    ctx.save(); rrect(ctx, 0, 0, WW, WH, 28); ctx.clip();
    // kilau sungai
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 9; i++) { const u = ((time * 0.035 + i / 9) % 1) * (RPTS.length - 2); const j = Math.floor(u); const a = RPTS[j]; const b = RPTS[j + 1]; const o = Math.sin(i * 2.3) * 14; ctx.moveTo(a.x + o, a.y); ctx.lineTo(lerp(a.x, b.x, 0.8) + o, lerp(a.y, b.y, 0.8)); }
    ctx.stroke();
    // sorotan petak & jangkauan
    if (hoverSlot >= 0 && hoverSlot !== selSlot && (phase === 'build' || phase === 'wave')) { const s = SLOTS[hoverSlot]; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ell(ctx, s.x, s.y, SLOT_R + 3, (SLOT_R + 3) * 0.78); ctx.stroke(); }
    if (phase === 'build' && !towers.length) { const a = 0.4 + 0.4 * Math.sin(time * 5); ctx.strokeStyle = `rgba(253,224,71,${a})`; ctx.lineWidth = 3; SLOTS.forEach((s) => { if (selSlot !== s.i) { ell(ctx, s.x, s.y, SLOT_R + 4, (SLOT_R + 4) * 0.78); ctx.stroke(); } }); }
    if (selSlot >= 0) {
      const s = SLOTS[selSlot]; const t = towerAt(selSlot); const type = t ? t.type : previewType; const L = t ? t.lvl : 1;
      if (type) { const r = TW[type].range[L - 1]; ctx.fillStyle = 'rgba(255,255,255,.13)'; circ(ctx, s.x, s.y, r); ctx.fill(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -time * 30; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4; ell(ctx, s.x, s.y, SLOT_R + 4 + Math.sin(time * 6) * 2, (SLOT_R + 4) * 0.78); ctx.stroke();
    }
    // bagian menara yang bergerak
    for (const t of towers) {
      if (gongT > 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 10 + t.x); ctx.drawImage(GLOW.gold, t.x - 40, t.y - 70, 80, 80); ctx.globalAlpha = 1; }
      drawTowerTop(ctx, t.type, t.lvl, t.x, t.y, t.ang, time, t.recoil, 1 - clamp(t.cd / TW[t.type].rate[t.lvl - 1], 0, 1));
    }
    drawEnemies();
    drawShots();
    // petir
    if (bolts.length) {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const b of bolts) { const a = b.life / b.max; polyline(ctx, b.pts); ctx.strokeStyle = `rgba(167,139,250,${0.45 * a})`; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2.6; ctx.stroke(); }
    }
    // partikel
    for (const p of parts) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.k === 'smoke') { ctx.fillStyle = p.c + (a * 0.4).toFixed(2) + ')'; circ(ctx, p.x, p.y, p.s * (1.8 - a)); ctx.fill(); }
      else { ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    }
    ctx.globalAlpha = 1;
    for (const r of rings) {
      const a = r.life / r.max;
      if (r.c === 'glow') { ctx.globalAlpha = a; ctx.drawImage(GLOW.orange, r.x - r.size / 2, r.y - r.size / 2, r.size, r.size); ctx.globalAlpha = 1; }
      else { ctx.strokeStyle = r.c; ctx.globalAlpha = a; ctx.lineWidth = r.w * a + 1; circ(ctx, r.x, r.y, (r.size / 2) * (1 - a * 0.85)); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // benteng terkena serangan
    if (fortFlash > 0) { ctx.globalAlpha = fortFlash; ctx.fillStyle = 'rgba(239,68,68,.55)'; ctx.fillRect(1040, 250, 160, 305); ctx.globalAlpha = 1; }
    drawFortBar();
    // kabut lupa (jawaban salah)
    if (fogT > 0 && gongT <= 0) {
      const a = Math.min(1, fogT / 1.5) * 0.85;
      ctx.globalAlpha = a;
      for (let i = 0; i < 6; i++) { const x = ((time * 22 + i * 260) % (WW + 300)) - 220; const y = 60 + ((i * 157) % 700); ctx.drawImage(FOG, x, y, 320, 200); }
      ctx.globalAlpha = 1;
    }
    // teks melayang
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const t of texts) {
      const a = clamp(t.life / t.max * 2, 0, 1); ctx.globalAlpha = a; ctx.font = `800 ${t.size}px ${FONT}`;
      ctx.lineWidth = t.size * 0.22; ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawEnemies() {
    if (!enemies.length) return;
    enemies.sort((a, b) => a.y - b.y);
    for (const e of enemies) {
      const def = e.def; const fly = def.fly ? 16 : 0;
      ctx.fillStyle = fly ? 'rgba(0,0,0,.16)' : 'rgba(20,20,10,.28)'; ell(ctx, e.x, e.y + 3, def.r * (fly ? 0.7 : 0.95), def.r * 0.32); ctx.fill();
    }
    for (const e of enemies) {
      const def = e.def; const fr = SPRITES[e.type]; const tm = time * (def.fly ? 9 : def.boss ? 2.2 : 4) + e.ph;
      const f = fr.length > 1 ? (Math.floor(tm / 1.2) % 2 === 0 ? 0 : 1) : 0; const sp = fr[f]; const box = def.box;
      const fly = def.fly ? 16 + Math.sin(tm) * 3 : 0; const bob = def.fly ? 0 : Math.abs(Math.sin(tm)) * -2.5;
      const sq = def.fly ? 1 : 1 + Math.sin(tm * 2) * 0.05; const fade = clamp(e.d / 40, 0, 1);
      ctx.save(); ctx.translate(e.x, e.y - def.r * 0.62 - fly + bob); ctx.scale(e.face * (2 - sq), sq);
      ctx.globalAlpha = fade; ctx.drawImage(sp.c, -box / 2, -box / 2, box, box);
      if (time < e.slowU) { ctx.globalAlpha = 0.42 * fade; ctx.drawImage(sp.blue, -box / 2, -box / 2, box, box); }
      if (e.flash > 0) { ctx.globalAlpha = Math.min(1, e.flash / 0.09) * 0.85; ctx.drawImage(sp.white, -box / 2, -box / 2, box, box); }
      ctx.restore();
      if (time < e.slowU) { ctx.strokeStyle = 'rgba(186,230,253,.9)'; ctx.lineWidth = 2; ell(ctx, e.x, e.y + 3, def.r * 0.9, def.r * 0.32); ctx.stroke(); }
      if (e.hp < e.max || def.boss) {
        const w = def.boss ? 84 : Math.max(26, def.r * 1.7); const y = e.y - def.r * 1.62 - fly - (def.boss ? 32 : 0); const r = clamp(e.hp / e.max, 0, 1);
        ctx.fillStyle = 'rgba(20,10,20,.8)'; ctx.fillRect(e.x - w / 2 - 1.5, y - 1.5, w + 3, def.boss ? 9 : 6.5);
        ctx.fillStyle = r > 0.55 ? '#4ade80' : r > 0.28 ? '#facc15' : '#ef4444'; ctx.fillRect(e.x - w / 2, y, w * r, def.boss ? 6 : 3.5);
        if (def.boss) { ctx.font = `800 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeStyle = '#1e0538'; ctx.strokeText('👑 RAJA KABUT', e.x, y - 3); ctx.fillStyle = '#f5d0fe'; ctx.fillText('👑 RAJA KABUT', e.x, y - 3); }
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawShots() {
    for (const s of shots) {
      if (s.k === 'arrow') {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang || 0);
        ctx.strokeStyle = '#6b3f1d'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -3.5); ctx.lineTo(4, 3.5); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-18, -4); ctx.lineTo(-10, 0); ctx.lineTo(-18, 4); ctx.fill();
        ctx.restore();
      } else if (s.k === 'ice') {
        ctx.globalAlpha = 0.7; ctx.drawImage(GLOW.cyan, s.x - 14, s.y - 14, 28, 28); ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4.5, 0); ctx.lineTo(0, 7); ctx.lineTo(-4.5, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      } else if (s.k === 'ball') {
        const t = clamp(s.t, 0, 1); const gx = lerp(s.gx, s.tx, t); const gy = lerp(s.gy, s.ty, t);
        const x = lerp(s.sx, s.tx, t); const y = lerp(s.sy, s.ty, t) - s.h * 4 * t * (1 - t);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ell(ctx, gx, gy + 2, 7 - 3 * Math.sin(t * Math.PI), 3); ctx.fill();
        const r = s.lvl === 3 ? 7.5 : 6.5; ctx.fillStyle = '#1f1d1a'; circ(ctx, x, y, r); ctx.fill(); ctx.fillStyle = '#6b6560'; circ(ctx, x - 2, y - 2, r * 0.4); ctx.fill();
        if (Math.random() < 0.5 && parts.length < MAXP) parts.push({ k: 'smoke', x, y, vx: 0, vy: -8, life: 0.35, max: 0.6, s: 4, c: 'rgba(120,110,100,' });
      }
    }
  }
  function drawFortBar() {
    const x = 1121; const y = 262; const w = 118; const r = clamp(hp / maxHp, 0, 1);
    ctx.fillStyle = 'rgba(20,10,10,.75)'; rrect(ctx, x - w / 2 - 3, y - 3, w + 6, 16, 8); ctx.fill();
    ctx.fillStyle = r > 0.55 ? '#22c55e' : r > 0.28 ? '#f59e0b' : '#ef4444'; rrect(ctx, x - w / 2, y, Math.max(0.1, w * r), 10, 5); ctx.fill();
    ctx.font = `800 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#1c0a0a'; ctx.strokeText(`🏰 ${hp}/${maxHp}`, x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(`🏰 ${hp}/${maxHp}`, x, y - 12);
  }

  /* ============================== HUD ============================== */
  const hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function updHp() {
    const r = hp / maxHp; const f = $('hpFill'); f.style.width = (r * 100).toFixed(1) + '%'; f.className = r <= 0.28 ? 'low' : r <= 0.55 ? 'mid' : '';
    setText('hpTxt', `${hp}/${maxHp}`);
  }
  function updWaveUI() {
    setText('waveNo', String(wave)); setText('waveMax', String(S.waves));
    const b = $('btnWave');
    if (phase === 'build') {
      b.className = 'wbtn ready'; setText('wbLbl', `▶ MULAI GELOMBANG ${wave + 1}`); setText('wbSub', 'Spasi • siap kapan saja');
      const list = nextList || []; const cnt = {}; list.forEach((e) => (cnt[e.type] = (cnt[e.type] || 0) + 1));
      $('wNext').innerHTML = `<span>Berikutnya:</span>` + Object.keys(cnt).map((k) => `<span class="en ${k === 'boss' ? 'boss' : ''}" title="${EN[k].name}"><img src="${SPR_URL[k]}" alt="">×${cnt[k]}</span>`).join('');
    } else if (phase === 'wave') {
      b.className = 'wbtn run' + (spawnQ.boss ? ' boss' : ''); const cnt = {}; spawnQ.forEach((e) => (cnt[e.type] = (cnt[e.type] || 0) + 1)); $('wNext').innerHTML = `<span>Datang:</span>` + Object.keys(cnt).map((k) => `<span class="en ${k === 'boss' ? 'boss' : ''}" title="${EN[k].name}"><img src="${SPR_URL[k]}" alt="">×${cnt[k]}</span>`).join('');
    } else { b.className = 'wbtn run'; setText('wbLbl', phase === 'over' ? '🏁 Permainan selesai' : '⏳ Bersiap…'); setText('wbSub', ''); $('wNext').innerHTML = ''; }
  }
  function updWaveRun() {
    if (phase !== 'wave') return;
    const left = Math.max(0, waveTotal - waveDone); setText('wbLbl', `🌊 ${left} musuh tersisa`); setText('wbSub', `Gelombang ${wave}/${S.waves}`);
    $('wProg').style.width = (clamp(waveDone / (waveTotal || 1), 0, 1) * 100).toFixed(1) + '%';
  }
  function updFog() {
    const on = fogT > 0 && gongT <= 0; $('fogBox').hidden = !on; if (on) setText('fogTxt', String(Math.ceil(fogT)));
    const gb = $('btnGong'); const full = gongV >= 100;
    gb.classList.toggle('full', full && gongT <= 0); gb.classList.toggle('act', gongT > 0);
    $('gongMeter').style.width = Math.min(100, gongV) + '%';
    setText('gongLbl', gongT > 0 ? `Semangat ${Math.ceil(gongT)}s` : full ? 'PUKUL GONG!' : `Gong ${Math.floor(gongV)}%`);
  }
  let tipKey = '';
  function updTip() {
    let k = ''; let html = ''; let cls = 'maptip';
    if (phase === 'build' && !towers.length) { k = 'start'; html = '💡 Jawab soal → dapat <b>emas</b> → ketuk <b>petak batu</b> untuk membangun menara!'; }
    else if (phase === 'build' && wave === 0) { k = 'go'; html = '🌊 Siap? Tekan <b>MULAI GELOMBANG</b> (Spasi). Soal tetap bisa dijawab kapan saja!'; }
    else if (phase === 'wave' && S.pauseQ === 'on' && qState === 'ask') { k = 'pq'; html = '⏸ Waktu berhenti — jawab soal dulu, lalu permainan lanjut'; cls = 'maptip pq'; }
    if (k === tipKey) return; tipKey = k; const el = $('mapTip');
    if (!k) { el.hidden = true; return; } el.className = cls; el.innerHTML = html; el.hidden = false;
  }
  function renderTeams() {
    const el = $('teams'); el.style.setProperty('--n', teams.length);
    el.innerHTML = teams.map((t, i) => `<div class="team ${i === turn && qState !== 'idle' ? 'on' : ''}" id="tm${i}" style="--pc:${t.color}"><span class="tav">${t.avatar}</span><span class="tnm">${esc(teams.length >= 3 ? t.name.replace(/^Tim\s+/i, '') : t.name)}</span><b>${teams.length >= 3 ? '' : '✅ '}${t.correct}</b></div>`).join('');
  }

  /* ============================== SOAL ============================== */
  const OC = { A: 'var(--oA)', B: 'var(--oB)', C: 'var(--oC)', D: 'var(--oD)' };
  function setTurnChip(lbl) {
    const t = teams[turn]; if (!t) return;
    $('qTurnLbl').textContent = lbl; const c = $('qChip'); c.innerHTML = `<i>${t.avatar}</i>${esc(t.name)}`; c.style.background = t.color;
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); $('qcard').style.setProperty('--pc', t.color);
  }
  function showQuestion() {
    q = QC.nextQuestion(); qT = 0; lastTick = -1;
    if (!q) { qState = 'idle'; $('qText').textContent = ''; $('qOpts').innerHTML = '<div class="qempty">⚠️ Bank soal kosong. Buka 🔐 Mode Guru untuk menambah soal.</div>'; $('qFb').hidden = true; return; }
    qState = 'ask'; stats.qTotal++;
    const keys = QC.optionsOf(q);
    const tx = $('qText'); tx.textContent = q.question; tx.classList.remove('in'); void tx.offsetWidth; tx.classList.add('in');
    $('qOpts').innerHTML = keys.map((k, i) => `<button class="opt" data-k="${k}" style="--i:${i};--oc:${OC[k]}"><b>${k}</b><span>${esc(q['option' + k])}</span></button>`).join('');
    $('qOpts').querySelectorAll('.opt').forEach((b) => (b.onclick = () => { b.blur(); answer(b.dataset.k); }));
    $('qFb').hidden = true; $('qFb').innerHTML = '';
    $('qTimer').hidden = !S.time; $('qTimer').classList.remove('hurry'); if (S.time) { $('qSec').textContent = S.time; $('qRing').style.strokeDashoffset = 0; }
    setTurnChip('Giliran menjawab'); renderTeams(); updTip(); fitQ();
  }
  function answer(k) {
    if (qState !== 'ask' || !q) return;
    qState = 'fb'; const ok = k === q.correct; const team = teams[turn];
    const btns = [...$('qOpts').querySelectorAll('.opt')]; let rightBtn = null;
    btns.forEach((b) => { b.disabled = true; if (b.dataset.k === q.correct) { b.classList.add('right'); rightBtn = b; } else if (b.dataset.k === k) b.classList.add('wrong'); else b.classList.add('gone'); });
    $('qTimer').hidden = true;
    const fb = $('qFb'); let html = '';
    if (ok) {
      combo++; bestCombo = Math.max(bestCombo, combo); stats.qRight++;
      const lim = S.time || 20; const fast = Math.round(15 * clamp(1 - qT / lim, 0, 1)); const cb = 5 * Math.min(combo - 1, 5); const base = 30; const tot = base + fast + cb;
      team.correct++; team.gold += tot; stats.goldQ += tot;
      gongV = Math.min(100, gongV + 16 + Math.min(combo - 1, 3) * 3);
      QC.sfx.correct(); FX.burstAt(rightBtn, { emojis: ['🪙', '✨', '⭐', '🎉'], count: 14, spread: 150 });
      addGold(tot); FX.fly(rightBtn, $('goldBox'), '🪙', 6, 800); setTimeout(() => { sfx('coin', 0); FX.floatTextAt($('goldBox'), `+${tot}`, '#fde047', 28); }, 760);
      html = `<div class="ft">🎉 BENAR! +${tot} emas</div><div class="chips"><span>Dasar +${base}</span>${fast ? `<span>⚡ Cepat +${fast}</span>` : ''}${cb ? `<span>🔥 Combo ×${combo} +${cb}</span>` : ''}</div>`;
      fb.className = 'qfb ok';
      const tm = $('tm' + turn); if (tm) { tm.classList.remove('gain'); void tm.offsetWidth; tm.classList.add('gain'); }
    } else {
      combo = 0; team.wrong++; fogT = Math.min(12, fogT + 6);
      QC.sfx.wrong(); FX.flash('rgba(124,58,237,.28)', 500); FX.shake($('qcard'), 8, 400);
      html = `<div class="ft">${k ? '❌ Kurang tepat' : '⏰ Waktu habis!'}</div><div class="chips"><span class="f">☁️ Kabut Lupa: menara −30% • 6 dtk</span></div><div class="key">Jawaban benar: ${q.correct}. ${esc(q['option' + q.correct])}</div>`;
      fb.className = 'qfb bad';
    }
    if (q.explanation) html += `<div class="exp">💡 ${esc(q.explanation)}</div>`;
    turn = (turn + 1) % teams.length;
    const auto = S.pauseQ !== 'on';
    const words = String(q.explanation || '').split(/\s+/).length + String(q.question).split(/\s+/).length * 0.3;
    fbDur = auto ? clamp(4 + words / 3.2, 6, 14) : 0; fbT = 0;
    html += `<button class="qnext" id="btnNextQ">Soal berikutnya ➜ <small>Enter${teams.length > 1 ? ` • giliran ${esc(teams[turn].name)}` : ''}</small>${auto ? '<i id="qAuto"></i>' : ''}</button>`;
    fb.innerHTML = html; fb.hidden = false;
    $('btnNextQ').onclick = (e) => { e.currentTarget.blur(); nextQ(); };
    $('qCombo').hidden = combo < 2; if (combo >= 2) $('qCombo').textContent = `🔥 Combo ×${combo}`;
    renderTeams(); updTip(); updFog(); fitQ();
  }
  function nextQ() { if (qState !== 'fb') return; QC.sfx.click(); showQuestion(); }
  function tickQuestion(dt) {
    if (qState === 'ask' && q) {
      qT += dt;
      if (S.time) {
        const left = Math.max(0, S.time - qT); $('qRing').style.strokeDashoffset = (119.4 * (1 - left / S.time)).toFixed(1);
        const s = Math.ceil(left); if (s !== lastTick) { lastTick = s; $('qSec').textContent = s; if (s <= 5 && s > 0) { QC.sfx.tick(); $('qTimer').classList.add('hurry'); } }
        if (left <= 0) answer(null);
      }
    } else if (qState === 'fb' && fbDur > 0) {
      fbT += dt; const a = $('qAuto'); if (a) a.style.transform = `scaleX(${clamp(1 - fbT / fbDur, 0, 1)})`;
      if (fbT >= fbDur) nextQ();
    }
  }
  function fitQ() {
    const card = $('qcard'); const body = $('qBody'); if (!card || !card.clientHeight) return;
    let fs = clamp(card.clientHeight * 0.06, 16, 38);
    for (let i = 0; i < 14; i++) { card.style.setProperty('--qf', fs.toFixed(1) + 'px'); if (body.scrollHeight <= body.clientHeight + 1 || fs <= 12) break; fs *= 0.92; }
  }

  /* ============================== GONG SEMANGAT ============================== */
  function hitGong() {
    if (gongV < 100 || gongT > 0) { if (gongT <= 0) QC.toast('🔔 Gong belum penuh — jawab soal dengan benar untuk mengisinya!'); return; }
    if (phase !== 'wave') { QC.toast('🔔 Pukul gong saat gelombang sedang berjalan!'); return; }
    gongV = 0; gongT = 8; fogT = 0;
    sfx('gong', 0); QC.sfx.magic(); FX.flash('rgba(253,224,71,.35)', 600);
    FX.announce('🔔 GONG SEMANGAT!', { color: '#ca8a04', sub: 'Semua menara menembak lebih cepat • kabut hilang', dur: 1400 });
    towers.forEach((t) => ring(t.x, t.y - 30, '#fde047', 90)); ring(1120, 420, '#fde047', 300, 6);
    updFog();
  }
  $('btnGong').onclick = (e) => { e.currentTarget.blur(); hitGong(); };

  /* ============================== KONTROL ============================== */
  function toggleSpeed() { speed = speed === 1 ? 2 : 1; const b = $('btnSpeed'); b.textContent = speed + '×'; b.classList.toggle('on', speed === 2); QC.sfx.click(); }
  function togglePause() { if (phase !== 'build' && phase !== 'wave') return; manualPause = !manualPause; const b = $('btnPause'); b.textContent = manualPause ? '▶' : '⏸'; b.classList.toggle('pz', manualPause); $('veil').hidden = !manualPause; QC.sfx.click(); }
  $('btnWave').onclick = (e) => { e.currentTarget.blur(); if (phase === 'build') { QC.sfx.click(); startWave(); } };
  $('btnSpeed').onclick = (e) => { e.currentTarget.blur(); toggleSpeed(); };
  $('btnPause').onclick = (e) => { e.currentTarget.blur(); togglePause(); };
  $('btnRules').onclick = () => QC.modal({ icon: '📜', title: 'Peraturan Benteng Nusantara', html: `<div style="text-align:left">${RULES}</div>`, cls: 'bn-rules' });
  $('btnSetup').onclick = async () => {
    if (phase === 'wave' || (phase === 'build' && wave > 0)) {
      const y = await QC.modal({ icon: '⚙️', title: 'Ubah pengaturan?', html: '<p class="qc-muted">Permainan sekarang akan diulang dari awal.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke pengaturan', value: true, primary: true }] });
      if (!y) return;
    }
    openSetup();
  };
  QC.onKey = (e) => {
    const k = e.key;
    if (qState === 'ask' && q) { const map = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }; const kk = map[k] || k.toUpperCase(); if (QC.optionsOf(q).includes(kk)) { e.preventDefault(); answer(kk); return; } }
    if (k === 'Enter' && qState === 'fb') { e.preventDefault(); nextQ(); return; }
    if (k === ' ' || e.code === 'Space') { e.preventDefault(); if (phase === 'build') { QC.sfx.click(); startWave(); } return; }
    if (k === 'x' || k === 'X') toggleSpeed();
    else if (k === 'p' || k === 'P') togglePause();
    else if (k === 'g' || k === 'G') hitGong();
    else if (k === 'Escape') closeMenu();
  };

  /* ============================== ALUR PERMAINAN ============================== */
  function resetWorld() {
    enemies = []; shots = []; parts = []; texts = []; bolts = []; rings = []; towers = []; spawnQ = []; towerDirty = true;
    wave = 0; time = 0; fogT = 0; gongT = 0; gongV = 0; shakeT = 0; fortFlash = 0; overT = 0; combo = 0; bestCombo = 0;
    manualPause = false; $('veil').hidden = true; $('btnPause').textContent = '⏸'; $('btnPause').classList.remove('pz');
    stats = { kills: 0, goldQ: 0, built: 0, leaked: 0, qTotal: 0, qRight: 0 }; closeMenu();
  }
  function newGame() {
    resetWorld();
    const d = DIFF[S.diff] || DIFF.sedang; maxHp = d.fort; hp = maxHp;
    teams.forEach((t) => Object.assign(t, { correct: 0, wrong: 0, gold: 0 }));
    turn = 0; gold = 0; addGold(S.gold, false); updHp();
    phase = 'build'; nextList = buildWave(1); updWaveUI(); $('wProg').style.width = '0%';
    $('qCombo').hidden = true; tipKey = ''; updTip(); updFog(); renderTeams();
    showQuestion(); Music.start(); syncMusicBtn();
    FX.announce('PERTAHANKAN BENTENG!', { color: '#b45309', sub: `${teams.length} tim • ${S.waves} gelombang • jawab soal untuk emas`, dur: 1700 });
  }
  async function endGame(won) {
    if (phase === 'over') return;
    phase = 'over'; overT = 0; closeMenu(); Music.stop(); qState = 'over'; updWaveUI(); updTip();
    if (!won) { QC.sfx.boom(); shakeT = 1; FX.flash('rgba(239,68,68,.45)', 700); for (let i = 0; i < 4; i++) { burst(1080 + i * 25, 380 + i * 20, '#fb923c', 16, 220); smoke(1100 + i * 20, 400, 6); } }
    await QC.sleep(won ? 900 : 1700);
    const ranking = teams.map((t) => ({ player: t, value: t.correct, t })).sort((a, b) => b.value - a.value || b.t.gold - a.t.gold);
    const answered = stats.qRight + teams.reduce((a, t) => a + t.wrong, 0); const acc = answered ? Math.round((stats.qRight / answered) * 100) : 0;
    const mvp = ranking[0];
    const note = `<div class="bn-stats"><span>🌊 Gelombang ${wave}/${S.waves}</span><span>👾 ${stats.kills} musuh</span><span>🏰 Nyawa ${hp}/${maxHp}</span><span>✅ ${stats.qRight} benar (${acc}%)</span><span>🪙 ${stats.goldQ} emas dari soal</span><span>🔥 Combo terbaik ×${bestCombo}</span></div>` +
      (teams.length > 1 && mvp && mvp.value > 0 ? `<div class="bn-mvp">⭐ MVP: ${esc(mvp.player.name)} — ${mvp.value} jawaban benar, +${mvp.t.gold} emas</div>` : '');
    let r;
    if (won) r = await QC.showWinner({ title: '🏰 BENTENG SELAMAT!', ranking, unit: 'benar', note });
    else {
      QC.sfx.wrong();
      const medals = ['🥇', '🥈', '🥉', '🎖️'];
      r = await QC.modal({
        cls: 'qc-winner bn-lose', icon: '💔', title: 'BENTENG RUNTUH!',
        html: `<p class="qc-muted">Pasukan Kabut Lupa menjebol benteng di gelombang ${wave}. Ayo coba lagi — jawab lebih banyak soal untuk emas!</p>${note}<ol class="qc-rank">${ranking.map((x, i) => `<li style="--pc:${x.player.color};--i:${ranking.length - 1 - i}"><span class="qc-medal">${medals[i] || '⭐'}</span><span class="qc-rank-av">${x.player.avatar}</span><span class="qc-rank-name">${esc(x.player.name)}</span><b>${x.value} benar</b></li>`).join('')}</ol>`,
        buttons: [{ label: '⚙️ Ubah Pengaturan', value: 'setup' }, { label: '🔁 Coba Lagi', value: 'again', primary: true }]
      });
    }
    if (r === 'setup') openSetup(); else newGame();
  }
  async function openSetup() {
    phase = 'idle'; qState = 'idle'; Music.stop(); resetWorld(); updWaveUI(); tipKey = ''; updTip();
    const p = QC.setup({
      logo: `<img src="${LOGO}" alt="">`, subtitle: 'Satu kelas, satu benteng! Jawab soal untuk emas, bangun menara, dan tahan serbuan gelombang musuh.',
      min: 1, max: 4, defaultCount: 2, soloLabel: '1 Tim (sekelas)', defaultNames: ['Tim Garuda', 'Tim Harimau', 'Tim Komodo', 'Tim Cendrawasih'],
      settings: [
        { key: 'waves', label: '🌊 Jumlah gelombang', value: 10, options: [[5, '5 gelombang (singkat)'], [8, '8 gelombang'], [10, '10 gelombang'], [15, '15 gelombang (panjang)']] },
        { key: 'diff', label: '💪 Tingkat kesulitan', value: 'sedang', options: [['mudah', 'Mudah'], ['sedang', 'Sedang'], ['sulit', 'Sulit']] },
        { key: 'gold', label: '🪙 Emas awal', value: 200, options: [[100, '100 emas'], [200, '200 emas'], [300, '300 emas'], [500, '500 emas']] },
        { key: 'pauseQ', label: '⏸️ Jeda saat soal tampil', value: 'off', options: [['off', 'Tidak (tetap jalan)'], ['on', 'Ya (waktu berhenti)']] },
        { key: 'time', label: '⏱️ Waktu menjawab', value: 0, options: [[0, 'Tanpa batas'], [15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik']] }
      ],
      rulesHtml: RULES
    });
    // label "Pemain" -> "Tim"
    const ov = document.querySelector('.qc-setup');
    if (ov) { ov.querySelectorAll('.qc-seg button').forEach((b) => { if (b.dataset.n !== '1') b.textContent = b.dataset.n + ' Tim'; }); const h3 = ov.querySelector('.qc-panel h3'); if (h3) h3.textContent = '👥 Jumlah Tim'; }
    const r = await p;
    S = { ...S, ...r.settings }; if (!DIFF[S.diff]) S.diff = 'sedang';
    teams = r.players.map((pl) => ({ ...pl, correct: 0, wrong: 0, gold: 0 }));
    newGame();
  }

  /* ============================== LOGO ============================== */
  const LOGO = (() => {
    const c = mk(124, 228); const g = c.getContext('2d'); g.translate(6, 0); g.scale(0.66, 0.66); g.translate(-1012, -222); paintFort(g); return c.toDataURL();
  })();
  $('logo').src = LOGO;

  /* ============================== LOOP ============================== */
  const perf = { ms: 0, peak: 0, heavySum: 0, heavyN: 0, frames: 0, rebuilds: 0, rebuildMax: 0, over6: 0 }; let rebuilt = false;
  let last = performance.now(); let hudT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden) return;
    if (phase === 'over' && ++overT > 90) return; // layar hasil tampil: berhenti menggambar (hemat)
    const t0 = performance.now();
    try {
      const busy = QC.isBusy();
      if (!busy && !manualPause && phase !== 'idle' && phase !== 'over') tickQuestion(dt);
      const paused = busy || manualPause || (S.pauseQ === 'on' && qState === 'ask' && phase === 'wave');
      if (!paused && phase !== 'idle') { for (let i = 0; i < speed; i++) update(dt); }
      draw();
      hudT -= dt; if (hudT <= 0) { hudT = 0.12; updWaveRun(); updFog(); updTip(); if (goldShown !== gold) { goldShown = gold; $('goldTxt').textContent = gold; refreshMenuAfford(); } }
    } catch (err) { console.error(err); }
    const ms = performance.now() - t0; perf.frames++;
    if (rebuilt) { rebuilt = false; perf.rebuilds++; perf.rebuildMax = Math.max(perf.rebuildMax, ms); return; } // gambar ulang cache (hanya saat menara berubah) dicatat terpisah
    if (ms > 6) perf.over6++;
    perf.ms += (ms - perf.ms) * 0.05; perf.peak = Math.max(perf.peak, perf.ms);
    if (enemies.length >= 15) { perf.heavySum += ms; perf.heavyN++; }
  }
  resize(); requestAnimationFrame(loop);

  /* Hook kecil untuk pengujian otomatis */
  window.__BN = {
    get state() { return { phase, wave, waves: S.waves, gold, hp, maxHp, enemies: enemies.length, towers: towers.map((t) => ({ slot: t.slot, type: t.type, lvl: t.lvl })), qState, turn, speed, fog: fogT, gong: gongV, gongT, combo, kills: stats.kills, teams: teams.map((t) => ({ n: t.name, c: t.correct, w: t.wrong })), menu: !menu.hidden }; },
    get perf() { return { ms: +perf.ms.toFixed(2), peak: +perf.peak.toFixed(2), heavy: perf.heavyN ? +(perf.heavySum / perf.heavyN).toFixed(2) : null, heavyN: perf.heavyN, frames: perf.frames, rebuilds: perf.rebuilds, rebuildMax: +perf.rebuildMax.toFixed(1), over6: perf.over6 }; },
    resetPerf() { Object.assign(perf, { ms: 0, peak: 0, heavySum: 0, heavyN: 0, frames: 0, rebuilds: 0, rebuildMax: 0, over6: 0 }); },
    slotXY(i) { const r = cv.getBoundingClientRect(); const s = SLOTS[i]; return { x: Math.round(r.left + OX + s.x * SC), y: Math.round(r.top + OY + s.y * SC) }; },
    elXY(sel) { const el = document.querySelector(sel); if (!el || el.offsetParent === null) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; },
    get correct() { return q && q.correct; },
    get keys() { return q ? QC.optionsOf(q) : []; },
    slots: SLOTS.length,
    skipTo(w) { if (phase !== 'build') return false; wave = w - 1; nextList = buildWave(w); updWaveUI(); return true; },
    get bossX() { const e = enemies.find((x) => x.def.boss); return e ? Math.round(e.d) : -1; },
    check() { return SLOTS.map((s) => ({ i: s.i, path: Math.round(pathDist(s.x, s.y)), river: Math.round(riverDist(s.x, s.y)) })); }
  };
  openSetup();
})();
