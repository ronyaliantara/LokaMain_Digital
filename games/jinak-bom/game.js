/* ==========================================================================
   Misi Jinak Bom — kuis giliran 1–4 regu penjinak bom
   - Bom besar di tengah (kanvas): casing logam, papan sirkuit, layar LED
     7-segmen, lampu status, antena; KABEL berwarna = pilihan jawaban.
   - ATURAN TERBALIK: regu harus memutus SEMUA kabel berisi jawaban SALAH
     dan menyisakan kabel jawaban BENAR. Kabel diputus dengan MENYAYAT
     (sentuh & geser melintasi kabel, ada jejak pisau cahaya) atau mengetuk
     kabelnya (tang pemotong). Pelat jawaban hanya untuk dibaca.
   - Semua kabel salah putus = bom AMAN (+poin + bonus sisa waktu).
     Memutus kabel jawaban benar / waktu habis = DUARR! nyawa −1.
     Waktu tetap berjalan saat memotong.
   - Ketegangan: detak tik-tok makin cepat < 5 detik, layar berkedip merah,
     level naik tiap beberapa ronde (waktu berkurang), tipe bom Kilat & Emas.
   - Alat bantu: 🔍 Pemindai (memutus otomatis 1 kabel salah) & ⏱️ +10 detik.
   - Mode: Kumpulkan Poin / Bertahan. 1 regu = tantangan solo + rekor.
   Grafis 100% kode (Canvas 2D + CSS). Tanpa aset luar selain Google Fonts.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const bounce = (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
  const pad = (n) => String(Math.max(0, n | 0)).padStart(2, '0').slice(-2);
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

  QC.init({ gameId: 'jinak-bom', title: 'Misi Jinak Bom', avatars: ['🕵️', '🦅', '🐺', '🦂', '🐍', '🦈', '🤖', '🦉'], colors: ['#22d3ee', '#e879f9', '#fb923c', '#a3e635'] });

  const WIRE = {
    A: { c: '#ef4444', dk: '#5c1515', glow: 'rgba(239,68,68,.38)', name: 'MERAH' },
    B: { c: '#3b82f6', dk: '#162a52', glow: 'rgba(59,130,246,.42)', name: 'BIRU' },
    C: { c: '#facc15', dk: '#5a4a0a', glow: 'rgba(250,204,21,.38)', name: 'KUNING' },
    D: { c: '#22c55e', dk: '#0f3d20', glow: 'rgba(34,197,94,.38)', name: 'HIJAU' }
  };
  const BTYPE = {
    standar: { name: 'STANDAR', mult: 1, rate: 1 },
    kilat: { name: '⚡ BOM KILAT', mult: 1.5, rate: 1.5 },
    emas: { name: '💰 BOM EMAS', mult: 2, rate: 1 }
  };
  // warna casing per level (bom makin "berbahaya") + tipe khusus
  const PAL = [
    ['#5d6676', '#3a4252', '#20262f'], ['#5b6a49', '#3b4a2d', '#212b18'], ['#41557b', '#2a3a5e', '#172139'],
    ['#7a4450', '#512833', '#2b1219'], ['#3c3c40', '#242428', '#101013']
  ];
  const PAL_T = { kilat: ['#2f5f8f', '#1c3d66', '#0d1f38'], emas: ['#d8b25a', '#a77b26', '#5e420f'] };
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21.2S3.4 15.9 2.3 10.3C1.5 6.4 4 3.3 7.4 3.3c2 0 3.6 1.1 4.6 2.7 1-1.6 2.6-2.7 4.6-2.7 3.4 0 5.9 3.1 5.1 7-1.1 5.6-9.7 10.9-9.7 10.9z"/></svg>';
  const NPT = 22; // titik sampel per kabel

  const RULES = `<ul>
    <li>🕵️ <b>1–4 regu</b> bergiliran menjinakkan bom. Giliran tampil jelas di atas: <b>GILIRAN: REGU …</b></li>
    <li>✂️ Tiap kabel berwarna (<b style="color:#ef4444">Merah</b>, <b style="color:#3b82f6">Biru</b>, <b style="color:#facc15">Kuning</b>, <b style="color:#22c55e">Hijau</b>) = satu pilihan jawaban. Misinya <b>TERBALIK</b>: <b>putuskan SEMUA kabel yang jawabannya SALAH</b> dan <b>sisakan kabel jawaban yang BENAR</b>. Cara memutus: <b>sayat kabelnya</b> (sentuh layar lalu geser melintasi kabel) atau <b>ketuk kabelnya</b>. Pelat jawaban hanya untuk dibaca, tidak bisa ditekan. Satu sayatan = satu kabel.</li>
    <li>✅ Semua kabel salah sudah putus → bom <b>AMAN</b>: 100 poin (+25 tiap level) + <b>bonus sisa waktu</b> 5 poin/detik.</li>
    <li>💥 Memutus <b>kabel jawaban BENAR</b> / waktu habis → <b>DUARR!</b> regu kehilangan <b>1 nyawa</b>. Waktu tetap berjalan saat memotong — cepat tapi teliti! Di bawah 5 detik detak makin cepat & layar berkedip merah.</li>
    <li>🧰 Alat bantu tiap regu: <b>🔍 Pemindai</b> (tombol <b>S</b>) memutus otomatis 1 kabel salah (perlu minimal 2 kabel salah tersisa), <b>⏱️ +10 detik</b> (tombol <b>T</b>). Masing-masing 1× di awal, maksimal 1× per bom. <b>3 bom aman beruntun</b> = bonus alat.</li>
    <li>📈 <b>Level</b> naik tiap beberapa ronde: waktu per bom makin singkat, poin makin besar. Mulai level 2 muncul <b>⚡ Bom Kilat</b> (timer 1,5× lebih cepat, poin ×1,5) dan <b>💰 Bom Emas</b> (poin ×2).</li>
    <li>🏆 <b>Kumpulkan Poin</b>: setelah semua ronde, poin terbanyak menang (nyawa habis → tim medis memulihkan nyawa, tetapi −100 poin). 🛡️ <b>Bertahan</b>: nyawa habis = <b>gugur</b>; regu terakhir yang bertahan menang.</li>
    <li>🎯 Main <b>1 regu</b> = tantangan solo; skor & <b>rekor</b> tersimpan di perangkat ini. Tombol <b>M</b> = musik tegang, <b>Spasi</b> = lanjut.</li></ul>`;
  const RULES_SHORT = `<ul>
    <li>Aturan terbalik: regu bergiliran <b>memutus SEMUA kabel jawaban SALAH</b> sebelum waktu habis — <b>kabel jawaban benar jangan dipotong!</b> Sayat (sentuh & geser) atau ketuk kabelnya.</li>
    <li>Semua kabel salah putus = bom <b>AMAN</b> + poin & bonus waktu. Memutus kabel jawaban benar / waktu habis = <b>DUARR!</b> nyawa −1.</li>
    <li>Alat bantu: 🔍 Pemindai & ⏱️ +10 detik. Lengkapnya di tombol 📜.</li></ul>`;

  /* ------------------------------ Status ------------------------------ */
  let S = { mode: 'poin', rounds: 5, time: 30, lives: 3, levelEvery: 2 };
  let T = []; let phase = 'idle'; // idle | brief | between | intro | play | cutting | alarm | boom | defused | result | over
  let round = 1; let turn = 0; let level = 1; let bombNo = 0; let elimCount = 0;
  let q = null; let keys = []; let removed = new Set(); let snipped = new Set(); let chosen = null; let btype = 'standar';
  // kabel jawaban SALAH yang masih tersambung (harus diputus semua agar bom aman)
  const wrongLeft = () => (q ? keys.filter((k) => k !== q.correct && !removed.has(k) && !snipped.has(k)) : []);
  let timeTotal = 30; let timeLeft = 30; let phaseT = 0; let tickAcc = 0; let tickFlip = false; let usedScan = false; let usedTime = false;
  let resultInfo = null; let resultShown = false; let canNextAt = 0; let alarmDur = 0.9; let alarmBeep = 0; let alarmFrom = 0; let alarmVal = 0; let ledShown = 0;
  let time = 0; let hotK = null; let danger = false;
  const bomb = { present: false, gone: false, safe: false, drop: 1, landed: true, booted: true, ox: 0, oy: 0 };
  let cutter = null; let ghosts = []; const trail = []; let scanFx = null; let flashA = 0; let flashC = '255,255,255'; let shakeT = 0; let shakeD = 1; let shakeP = 0;
  let redPulse = 0; let ledFlash = 0; let beamT = 0; let tipSpark = 0;
  const parts = []; let wires = [];

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
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
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
      tick(left) { // tik-tok; di bawah 5 detik makin tinggi & cepat
        if (left <= 5) tone(1500 + (5 - left) * 170, 0.04, 'square', 0.06);
        else { tickFlip = !tickFlip; tone(tickFlip ? 1250 : 930, 0.03, 'square', 0.035); }
      },
      snip() { noise(0.08, 0.32, 0, 'highpass', 3200); tone(2900, 0.035, 'square', 0.05); tone(700, 0.05, 'triangle', 0.06, 0.01); },
      clank() { tone(150, 0.3, 'triangle', 0.2, 0, 50); noise(0.14, 0.25, 0, 'lowpass', 700); tone(560, 0.16, 'square', 0.03, 0.01, 260); },
      plug() { tone(820, 0.05, 'square', 0.04); tone(1240, 0.04, 'square', 0.03, 0.045); },
      boot() { [0, 1, 2, 3].forEach((i) => tone(520 + i * 260, 0.06, 'square', 0.035, i * 0.07)); },
      arm() { tone(988, 0.12, 'sine', 0.07); tone(1480, 0.2, 'sine', 0.07, 0.11); },
      powerDown() { tone(980, 0.75, 'sawtooth', 0.045, 0, 70); noise(0.3, 0.06, 0.05, 'bandpass', 2000, 300, 2); },
      alarm(i) { tone(i % 2 ? 990 : 1480, 0.08, 'square', 0.07); },
      longBeep() { tone(1760, 0.42, 'square', 0.06); },
      boom() { noise(1.7, 0.6, 0, 'lowpass', 1600, 70); tone(95, 1.1, 'sine', 0.5, 0, 26); tone(60, 1.4, 'triangle', 0.3, 0.04, 22); noise(0.5, 0.22, 0.25, 'bandpass', 500, 120, 1); },
      scan() { tone(320, 0.65, 'sine', 0.06, 0, 1900); tone(2400, 0.05, 'square', 0.035, 0.66); tone(1800, 0.05, 'square', 0.035, 0.74); },
      timeUp() { [880, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.06)); },
      heart() { tone(560, 0.22, 'sine', 0.08, 0, 240); tone(300, 0.25, 'sine', 0.06, 0.18, 160); }
    };
  })();

  /* Musik tegang ringan (sekuensial WebAudio, opsional) */
  const MUS = { on: store('lokamain_jinak-bom_musik') === true, next: 0, step: 0 };
  const BASS = [45, 45, 57, 45, 48, 45, 57, 44, 45, 45, 57, 45, 43, 43, 55, 44];
  function musicPump() {
    if (!MUS.on || QC.muted || phase === 'idle' || phase === 'over' || document.hidden) { MUS.next = 0; return; }
    const c = SND.ac(); if (!c || c.state !== 'running') return;
    const hot = phase === 'play' && timeLeft <= 5;
    const spb = 60 / (hot ? 156 : 116) / 2;
    if (MUS.next < c.currentTime) MUS.next = c.currentTime + 0.05;
    while (MUS.next < c.currentTime + 0.25) {
      const st = MUS.step++; const m = BASS[st % 16]; const f = 440 * Math.pow(2, (m - 69) / 12); const dl = MUS.next - c.currentTime;
      SND.tone(f, 0.22, 'triangle', 0.06, dl);
      if (st % 4 === 2) SND.noise(0.04, 0.03, dl, 'highpass', 6500);
      if (st % 8 === 0) SND.tone(f * 4, 0.55, 'sine', 0.02, dl);
      if (hot && st % 2 === 0) SND.tone(f * 8, 0.07, 'square', 0.014, dl);
      MUS.next += spb;
    }
  }
  setInterval(musicPump, 80);
  function syncMusicBtn() { const b = $('btnMusic'); b.classList.toggle('on', MUS.on); b.classList.toggle('off', !MUS.on); b.title = MUS.on ? 'Musik tegang: NYALA (M)' : 'Musik tegang: MATI (M)'; }
  function toggleMusic() { MUS.on = !MUS.on; store('lokamain_jinak-bom_musik', MUS.on); SND.ac(); syncMusicBtn(); QC.toast(MUS.on ? '🎵 Musik tegang dinyalakan' : '🎵 Musik dimatikan'); }
  $('btnMusic').onclick = (e) => { e.currentTarget.blur(); toggleMusic(); };
  syncMusicBtn();

  /* ------------------------------ Kanvas & tata letak ------------------------------ */
  const stage = $('stage'); const cv = $('cv'); const ctx = cv.getContext('2d');
  let W = 0; let H = 0; let DPR = 1; let narrow = false;
  const B = { x: 0, y: 0, u: 3, floor: 0 };
  let bgC = null; let bombC = null; let sweepC = null; let nutC = null; let cacheKey = '';
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR)); return c; }
  function offs(el) { let x = 0; let y = 0; while (el && el !== stage) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x, y }; }
  const wireW = () => clamp(B.u * 2.5, 5, 15);

  function layout() {
    const w = stage.clientWidth; const h = stage.clientHeight; const d = Math.min(1.5, window.devicePixelRatio || 1);
    if (w !== W || h !== H || d !== DPR) { W = w; H = h; DPR = d; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
    const sp = $('bombSpot'); const o = offs(sp); const sw = sp.offsetWidth; const sh = sp.offsetHeight;
    B.u = clamp(Math.min((sw * 0.94) / 112, (sh * 0.95) / 106), 1.3, 6.2);
    B.x = o.x + sw / 2; B.y = o.y + sh / 2 + 6 * B.u; B.floor = B.y + 44 * B.u;
    measurePorts();
  }
  function measurePorts() {
    const u = B.u; const groups = { left: [], right: [], bottom: [] };
    for (const w of wires) {
      if (!w.el || !w.el.isConnected) w.el = stage.querySelector(`.plate[data-k="${w.k}"]`);
      const el = w.el; if (!el) continue;
      const o = offs(el); const ww = el.offsetWidth; const hh = el.offsetHeight;
      if (o.x + ww < B.x - 46 * u) { w.side = 'left'; w.port = { x: o.x + ww + 1, y: o.y + hh / 2, dx: 1, dy: 0 }; }
      else if (o.x > B.x + 46 * u) { w.side = 'right'; w.port = { x: o.x - 1, y: o.y + hh / 2, dx: -1, dy: 0 }; }
      else { w.side = 'bottom'; w.port = { x: o.x + ww / 2, y: o.y - 1, dx: 0, dy: -1 }; }
      groups[w.side].push(w);
    }
    const ys = (n) => (n === 1 ? [8] : n === 2 ? [-6, 20] : n === 3 ? [-10, 6, 22] : [-14, -2, 10, 22]);
    groups.left.sort((a, b) => a.port.y - b.port.y).forEach((w, i, a) => { w.sock = { x: B.x - 51 * u, y: B.y + ys(a.length)[i] * u, dx: -1, dy: 0 }; });
    groups.right.sort((a, b) => a.port.y - b.port.y).forEach((w, i, a) => { w.sock = { x: B.x + 51 * u, y: B.y + ys(a.length)[i] * u, dx: 1, dy: 0 }; });
    groups.bottom.sort((a, b) => a.port.x - b.port.x).forEach((w, i, a) => { const n = a.length; w.sock = { x: B.x + (n === 1 ? 0 : -33 + (66 * i) / (n - 1)) * u, y: B.y + 45 * u, dx: 0, dy: 1 }; });
  }

  /* ------------------------------ Cache grafis ------------------------------ */
  function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function palette() { return PAL_T[btype] || PAL[clamp(level, 1, 5) - 1]; }
  let bombKey = '';
  function ensureCaches() { // latar dibangun ulang hanya bila ukuran berubah; bom bila warna/tipe berubah
    const t0 = performance.now(); let built = false;
    const k1 = [W, H, DPR, B.u.toFixed(3), Math.round(B.x), Math.round(B.y)].join('|');
    if (k1 !== cacheKey || !bgC) { cacheKey = k1; bgC = buildBg(); sweepC = buildSweep(); nutC = buildNut(); bombKey = ''; built = true; }
    const k2 = palette().join() + btype;
    if (k2 !== bombKey || !bombC) { bombKey = k2; bombC = buildBomb(); built = true; }
    if (built) { perf.builds++; perf.buildMax = Math.max(perf.buildMax, performance.now() - t0); }
    return built;
  }
  function glowLine(g, pts, col, w) { // garis neon tanpa shadowBlur (3 lapis)
    for (const [lw, a] of [[w * 6, 0.07], [w * 3, 0.16], [w, 0.8]]) { g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = lw; g.beginPath(); pts.forEach(([x0, y0, x1, y1]) => { g.moveTo(x0, y0); g.lineTo(x1, y1); }); g.stroke(); }
  }

  function buildBg() {
    const c = mkCanvas(W, H); const g = c.getContext('2d'); g.scale(DPR, DPR);
    let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1426'); gr.addColorStop(0.6, '#08101e'); gr.addColorStop(1, '#03060b');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const fy = Math.min(H - 6, B.floor + 2);
    // panel dinding logam + paku keling
    const pw = clamp(W / 8, 110, 230); const ph = clamp(fy / 3.3, 64, 170); let row = 0;
    for (let y = fy - ph * Math.ceil(fy / ph); y < fy; y += ph, row++) {
      let col = 0;
      for (let x = ((W / 2) % pw) - pw; x < W; x += pw, col++) {
        g.fillStyle = (row + col) % 2 ? 'rgba(40,62,100,.16)' : 'rgba(40,62,100,.09)'; g.fillRect(x + 2, y + 2, pw - 4, ph - 4);
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, pw - 2, ph - 2);
        g.strokeStyle = 'rgba(130,180,240,.05)'; g.lineWidth = 1; g.strokeRect(x + 4.5, y + 4.5, pw - 9, ph - 9);
        for (const [rx, ry] of [[x + 9, y + 9], [x + pw - 9, y + 9], [x + 9, y + ph - 9], [x + pw - 9, y + ph - 9]]) {
          g.fillStyle = '#1a2840'; g.beginPath(); g.arc(rx, ry, 2.2, 0, 7); g.fill(); g.fillStyle = 'rgba(160,200,255,.25)'; g.beginPath(); g.arc(rx - 0.6, ry - 0.6, 0.9, 0, 7); g.fill();
        }
        if ((row * 3 + col) % 5 === 1 && y + ph < fy - 10) { // celah ventilasi
          g.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 5; k++) rr(g, x + pw * 0.25, y + ph * 0.3 + k * 6, pw * 0.5, 2.5, 1.2), g.fill();
        }
      }
    }
    // lambang target (pembidik) di belakang bom
    g.save(); g.translate(B.x, B.y - 6 * B.u); const R = 72 * B.u;
    g.strokeStyle = 'rgba(34,211,238,.11)'; g.lineWidth = 2;
    for (const k of [1, 0.74, 0.48]) { g.beginPath(); g.arc(0, 0, R * k, 0, 7); g.stroke(); }
    g.lineWidth = 1; g.setLineDash([4, 8]); g.beginPath(); g.moveTo(-R * 1.15, 0); g.lineTo(R * 1.15, 0); g.moveTo(0, -R * 1.15); g.lineTo(0, R * 1.15); g.stroke(); g.setLineDash([]);
    for (let a = 0; a < 72; a++) { const an = (a / 72) * Math.PI * 2; const l = a % 6 === 0 ? 10 : 4; g.beginPath(); g.moveTo(Math.cos(an) * R, Math.sin(an) * R); g.lineTo(Math.cos(an) * (R + l), Math.sin(an) * (R + l)); g.stroke(); }
    g.restore();
    // tulisan stensil dinding
    g.font = `400 ${clamp(W * 0.02, 12, 30)}px "Black Ops One", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,45,85,.09)'; g.fillText('ZONA MERAH', W * 0.12, fy - ph * 0.5); g.fillText('AREA STERIL', W * 0.88, fy - ph * 0.5);
    // lantai berperspektif
    gr = g.createLinearGradient(0, fy, 0, H); gr.addColorStop(0, '#0e1829'); gr.addColorStop(1, '#03060b'); g.fillStyle = gr; g.fillRect(0, fy, W, H - fy);
    g.strokeStyle = 'rgba(34,211,238,.07)'; g.lineWidth = 1;
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(B.x + i * W * 0.025, fy); g.lineTo(B.x + i * W * 0.16, H); g.stroke(); }
    for (let k = 1; k < 8; k++) { const y = fy + (H - fy) * Math.pow(k / 8, 1.6); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // sorot lampu dari atas ke bom
    g.save(); g.globalCompositeOperation = 'lighter';
    gr = g.createLinearGradient(0, 0, 0, fy); gr.addColorStop(0, 'rgba(120,200,255,.0)'); gr.addColorStop(0.5, 'rgba(120,200,255,.035)'); gr.addColorStop(1, 'rgba(120,200,255,.07)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(B.x - 14 * B.u, 0); g.lineTo(B.x + 14 * B.u, 0); g.lineTo(B.x + 78 * B.u, fy); g.lineTo(B.x - 78 * B.u, fy); g.closePath(); g.fill();
    gr = g.createRadialGradient(B.x, fy, 0, B.x, fy, 90 * B.u); gr.addColorStop(0, 'rgba(34,211,238,.16)'); gr.addColorStop(1, 'rgba(34,211,238,0)');
    g.fillStyle = gr; g.save(); g.translate(B.x, fy); g.scale(1, 0.16); g.translate(-B.x, -fy); g.beginPath(); g.arc(B.x, fy, 90 * B.u, 0, 7); g.fill(); g.restore();
    g.restore();
    // garis tepi lantai: strip bahaya + neon
    g.save(); g.beginPath(); g.rect(0, fy, W, 7); g.clip(); g.fillStyle = 'rgba(250,204,21,.45)'; g.fillRect(0, fy, W, 7); g.fillStyle = 'rgba(0,0,0,.75)';
    for (let x = -20; x < W + 20; x += 18) { g.beginPath(); g.moveTo(x, fy); g.lineTo(x + 9, fy); g.lineTo(x + 2, fy + 7); g.lineTo(x - 7, fy + 7); g.closePath(); g.fill(); } g.restore();
    glowLine(g, [[0, fy, W, fy]], '34,211,238', 2);
    // bayangan bom di lantai
    gr = g.createRadialGradient(B.x, B.floor, 0, B.x, B.floor, 58 * B.u); gr.addColorStop(0, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(B.x, B.floor); g.scale(1, 0.13); g.translate(-B.x, -B.floor); g.fillStyle = gr; g.beginPath(); g.arc(B.x, B.floor, 58 * B.u, 0, 7); g.fill(); g.restore();
    // tabung neon vertikal di tepi
    glowLine(g, [[5, H * 0.08, 5, fy - 12], [W - 5, H * 0.08, W - 5, fy - 12]], '34,211,238', 2.5);
    // vinyet
    gr = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }

  /* --- Segmen LED 7-segmen (unit bom) --- */
  const DIG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
  const LED = (() => {
    const X = [-23, -11.5, 11.5, 23]; const cy = -12.5; const w = 9; const h = 14; const t = 2.1; const gp = 0.45;
    const sk = (x, y) => x - 0.12 * (y - cy);
    function poly(pts) { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(sk(x, y), y) : p.moveTo(sk(x, y), y))); p.closePath(); return p; }
    const Hs = (xa, xb, y) => poly([[xa, y], [xa + t / 2, y - t / 2], [xb - t / 2, y - t / 2], [xb, y], [xb - t / 2, y + t / 2], [xa + t / 2, y + t / 2]]);
    const Vs = (x, ya, yb) => poly([[x, ya], [x + t / 2, ya + t / 2], [x + t / 2, yb - t / 2], [x, yb], [x - t / 2, yb - t / 2], [x - t / 2, ya + t / 2]]);
    const digits = X.map((cx) => {
      const x0 = cx - w / 2; const x1 = cx + w / 2; const y0 = cy - h / 2; const y1 = cy + h / 2;
      return { a: Hs(x0 + gp, x1 - gp, y0), g: Hs(x0 + gp, x1 - gp, cy), d: Hs(x0 + gp, x1 - gp, y1), f: Vs(x0, y0 + gp, cy - gp), b: Vs(x1, y0 + gp, cy - gp), e: Vs(x0, cy + gp, y1 - gp), c: Vs(x1, cy + gp, y1 - gp) };
    });
    const dotAt = (x, y) => { const p = new Path2D(); p.rect(sk(x, y) - 1, y - 1, 2, 2); return p; };
    return { digits, colon: [dotAt(0, cy - 3.6), dotAt(0, cy + 3.6)], dot: dotAt(0, cy + h / 2 - 0.4) };
  })();

  function buildBomb() {
    const u = B.u; const c = mkCanvas(124 * u, 118 * u); const g = c.getContext('2d');
    g.scale(DPR, DPR); g.translate(62 * u, 64 * u); g.scale(u, u);
    const [p0, p1, p2] = palette(); const gold = btype === 'emas';
    // antena (di belakang casing)
    g.strokeStyle = '#94a3b8'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(41, -34); g.lineTo(46, -57); g.stroke();
    g.fillStyle = '#334155'; rr(g, 37, -39, 8, 6, 1.5); g.fill();
    // tiga tabung peledak
    for (const cx of [-28, 0, 28]) {
      let gr = g.createLinearGradient(cx - 11, 0, cx + 11, 0);
      gr.addColorStop(0, '#4a0909'); gr.addColorStop(0.35, '#d42a2a'); gr.addColorStop(0.55, '#f87171'); gr.addColorStop(1, '#3d0707');
      g.fillStyle = gr; rr(g, cx - 10.5, -45, 21, 30, 3); g.fill(); g.lineWidth = 0.7; g.strokeStyle = '#1a0505'; g.stroke();
      gr = g.createLinearGradient(cx - 12, 0, cx + 12, 0); gr.addColorStop(0, '#374151'); gr.addColorStop(0.45, '#d1d5db'); gr.addColorStop(1, '#374151');
      g.fillStyle = gr; rr(g, cx - 11.5, -48, 23, 5, 1.6); g.fill(); g.stroke();
      g.fillStyle = '#111827'; g.fillRect(cx - 10.5, -40, 21, 2.6);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - 5, -44, 1.2, 9);
    }
    // casing logam
    let gr = g.createLinearGradient(0, -34, 0, 44); gr.addColorStop(0, p0); gr.addColorStop(0.45, p1); gr.addColorStop(1, p2);
    rr(g, -50, -34, 100, 78, 8); g.fillStyle = gr; g.fill();
    g.save(); rr(g, -50, -34, 100, 78, 8); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 0.4; for (let y = -33; y < 44; y += 1.3) { g.beginPath(); g.moveTo(-50, y); g.lineTo(50, y); g.stroke(); }
    gr = g.createLinearGradient(-50, -34, 30, 44); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-50, -34, 100, 78);
    // strip bahaya bawah
    g.fillStyle = gold ? '#1c1405' : '#facc15'; g.fillRect(-50, 34.5, 100, 10); g.fillStyle = gold ? '#e3b341' : '#111';
    for (let x = -64; x < 60; x += 8) { g.beginPath(); g.moveTo(x, 34.5); g.lineTo(x + 4, 34.5); g.lineTo(x - 6, 44.5); g.lineTo(x - 10, 44.5); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(-50, 33.6, 100, 1);
    // batang konektor di sisi
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-50, -18, 4.5, 46); g.fillRect(45.5, -18, 4.5, 46);
    g.restore();
    rr(g, -50, -34, 100, 78, 8); g.lineWidth = 1.4; g.strokeStyle = '#06080d'; g.stroke();
    rr(g, -48.6, -32.6, 97.2, 75.2, 7); g.lineWidth = 0.7; g.strokeStyle = gold ? 'rgba(255,240,190,.45)' : 'rgba(255,255,255,.16)'; g.stroke();
    // baut
    for (const [bx, by] of [[-44.5, -28.5], [44.5, -28.5], [-44.5, 29], [44.5, 29]]) {
      const bg = g.createRadialGradient(bx - 0.8, by - 0.8, 0.2, bx, by, 2.6); bg.addColorStop(0, '#f1f5f9'); bg.addColorStop(1, '#4b5563');
      g.fillStyle = bg; g.beginPath(); g.arc(bx, by, 2.5, 0, 7); g.fill(); g.strokeStyle = '#111827'; g.lineWidth = 0.5; g.stroke();
      g.beginPath(); g.moveTo(bx - 1.5, by - 0.6); g.lineTo(bx + 1.5, by + 0.6); g.lineWidth = 0.6; g.stroke();
    }
    // papan sirkuit
    rr(g, -41, -28, 82, 60, 4); gr = g.createLinearGradient(0, -28, 0, 32); gr.addColorStop(0, '#0b6a43'); gr.addColorStop(1, '#053a24'); g.fillStyle = gr; g.fill();
    g.lineWidth = 1.6; g.strokeStyle = '#04080c'; g.stroke();
    g.save(); rr(g, -41, -28, 82, 60, 4); g.clip();
    const R = seeded(77); g.strokeStyle = 'rgba(214,170,40,.6)'; g.lineWidth = 0.6; g.lineJoin = 'round';
    for (let i = 0; i < 34; i++) {
      let x = -40 + Math.round(R() * 20) * 4; let y = -27 + Math.round(R() * 15) * 4; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 3; s++) { const dir = (R() * 4) | 0; const len = 4 + ((R() * 4) | 0) * 3; if (dir === 0) x += len; else if (dir === 1) x -= len; else if (dir === 2) { x += len * 0.7; y += len * 0.7; } else y += len; g.lineTo(x, y); }
      g.stroke(); g.fillStyle = '#d6a92a'; g.beginPath(); g.arc(x, y, 0.85, 0, 7); g.fill(); g.fillStyle = '#053a24'; g.beginPath(); g.arc(x, y, 0.35, 0, 7); g.fill();
    }
    g.restore();
    // chip, kapasitor, resistor
    const chip = (x, y, w, h, label) => {
      g.fillStyle = '#9ca3af'; for (let px = x + 1.5; px < x + w - 1; px += 2.3) { g.fillRect(px, y - 1.2, 0.9, 1.2); g.fillRect(px, y + h, 0.9, 1.2); }
      rr(g, x, y, w, h, 1); g.fillStyle = '#0d0f12'; g.fill(); g.strokeStyle = '#2b3038'; g.lineWidth = 0.4; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 2.6px Orbitron, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x + w / 2, y + h / 2);
      g.beginPath(); g.arc(x + 1.6, y + 1.6, 0.5, 0, 7); g.fill();
    };
    chip(-37, 15.5, 19, 11, 'JB-07'); chip(19, 16, 18, 10, 'DET-X');
    for (const [x, col] of [[-10, '#1d4ed8'], [-3.5, '#7c3aed']]) {
      const cg = g.createLinearGradient(x - 2.4, 0, x + 2.4, 0); cg.addColorStop(0, '#0b1022'); cg.addColorStop(0.45, col); cg.addColorStop(1, '#0b1022');
      g.fillStyle = cg; rr(g, x - 2.4, 15, 4.8, 9, 1.2); g.fill(); g.fillStyle = '#cbd5e1'; g.fillRect(x - 2.4, 15, 4.8, 1.4);
    }
    g.fillStyle = '#e7d3a7'; rr(g, 3, 19, 12, 3.2, 1.4); g.fill(); ['#7c2d12', '#111', '#dc2626', '#ca8a04'].forEach((cc, i) => { g.fillStyle = cc; g.fillRect(5 + i * 2.2, 19, 1, 3.2); });
    g.fillStyle = '#9ca3af'; g.fillRect(1, 20.2, 2, 0.8); g.fillRect(15, 20.2, 2, 0.8);
    // modul LED
    rr(g, -34.5, -25, 69, 24.5, 3); g.fillStyle = '#07090c'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = gold ? '#e3b341' : '#4b5563'; g.stroke();
    rr(g, -32, -22.6, 64, 19.8, 2); g.fillStyle = '#160406'; g.fill();
    g.globalAlpha = 0.085; g.fillStyle = '#ff4a4a';
    LED.digits.forEach((d) => Object.values(d).forEach((p) => g.fill(p))); LED.colon.forEach((p) => g.fill(p)); g.fill(LED.dot);
    g.globalAlpha = 1;
    gr = g.createLinearGradient(0, -22.6, 0, -12); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; rr(g, -32, -22.6, 64, 9, 2); g.fill();
    // panel status & cincin lampu
    rr(g, -38, 3, 45, 9.5, 2); g.fillStyle = '#05080b'; g.fill(); g.strokeStyle = '#334155'; g.lineWidth = 0.5; g.stroke();
    for (const lx of [16, 24, 32]) { g.beginPath(); g.arc(lx, 7.8, 3.1, 0, 7); g.fillStyle = '#0a0a0a'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#9ca3af'; g.stroke(); }
    return c;
  }
  function buildSweep() {
    const R = 72 * B.u; const c = mkCanvas(R * 2, R * 2); const g = c.getContext('2d'); g.scale(DPR, DPR);
    if (!g.createConicGradient) return null;
    const gr = g.createConicGradient(0, R, R); gr.addColorStop(0, 'rgba(34,211,238,.20)'); gr.addColorStop(0.1, 'rgba(34,211,238,0)'); gr.addColorStop(1, 'rgba(34,211,238,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill(); return c;
  }
  function buildNut() {
    const s = 13 * B.u; const c = mkCanvas(s, s); const g = c.getContext('2d'); g.scale(DPR, DPR); g.translate(s / 2, s / 2); g.scale(B.u, B.u);
    const gr = g.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5.5); gr.addColorStop(0, '#fde68a'); gr.addColorStop(0.6, '#b8862b'); gr.addColorStop(1, '#5c3d0c');
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 5.2, Math.sin(a) * 5.2); } g.closePath();
    g.fillStyle = gr; g.fill(); g.lineWidth = 0.6; g.strokeStyle = '#2b1d05'; g.stroke();
    g.beginPath(); g.arc(0, 0, 2.3, 0, 7); g.fillStyle = '#120c03'; g.fill(); return c;
  }

  /* ------------------------------ Kabel & tali (verlet) ------------------------------ */
  function computePts(w) {
    const s = w.sock; const p = w.port; if (!s || !p) return;
    const dx = p.x - s.x; const dy = p.y - s.y; const d = Math.hypot(dx, dy);
    const k = clamp(d * 0.42, 14, 280);
    const sway = Math.sin(time * 1.5 + w.ph) * (phase === 'play' ? 3.2 : 1.2);
    const sag = (s.dy ? 0 : clamp(Math.abs(dx) * 0.16, 8, 80)) + sway;
    const c1x = s.x + s.dx * k; const c1y = s.y + s.dy * k + sag; const c2x = p.x + p.dx * k; const c2y = p.y + p.dy * k + sag;
    for (let i = 0; i < NPT; i++) {
      const t = i / (NPT - 1); const m = 1 - t;
      const a = m * m * m; const b = 3 * m * m * t; const c = 3 * m * t * t; const e = t * t * t;
      w.pts[i].x = a * s.x + b * c1x + c * c2x + e * p.x; w.pts[i].y = a * s.y + b * c1y + c * c2y + e * p.y;
    }
  }
  function mkRope(w, from, to, pa, pb) {
    const p = []; for (let i = from; i <= to; i++) { const s = w.pts[i]; p.push({ x: s.x, y: s.y, ox: s.x, oy: s.y }); }
    const L = []; for (let i = 0; i < p.length - 1; i++) L.push(Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y) * 1.03);
    return { w, p, L, pa, pb, e: 1, age: 0, sleep: false };
  }
  function cutWire(w, ci) {
    w.cutAt = ci; const r0 = mkRope(w, 0, ci, true, false); const r1 = mkRope(w, ci + 1, NPT - 1, false, true);
    const a = r0.p[r0.p.length - 1]; const b = r1.p[0]; const dx = b.x - a.x; const dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const k = 5 * B.u / 3;
    a.ox = a.x + (dx / d) * k; a.oy = a.y + (dy / d) * k; b.ox = b.x - (dx / d) * k; b.oy = b.y - (dy / d) * k;
    w.ropes = [r0, r1];
  }
  function unplug(w, blast) {
    if (w.ropes) w.ropes.forEach((r) => { r.pa = false; r.sleep = false; r.age = 0; });
    else w.ropes = [mkRope(w, 0, NPT - 1, false, true)];
    w.unplugged = true;
    if (blast) {
      for (const r of w.ropes) for (const p of r.p) {
        const dx = p.x - B.x; const dy = p.y - B.y; const d = Math.hypot(dx, dy) || 1; const imp = 22 * (B.u / 3) * (1 - Math.min(1, d / (W * 0.6)));
        p.ox = p.x - (dx / d) * imp; p.oy = p.y - (dy / d) * imp + imp * 0.4;
      }
    }
  }
  function rebuildRopes(w) {
    if (!w.ropes) return; computePts(w);
    if (w.cutAt != null) { cutWire(w, w.cutAt); if (w.unplugged) w.ropes[0].pa = false; }
    else if (w.unplugged) w.ropes = [mkRope(w, 0, NPT - 1, false, true)];
  }
  function stepRope(r, dt) {
    if (r.sleep) return;
    const g = 1500 * (B.u / 3); const damp = 0.982; const n = r.p.length; const dt2 = dt * dt; let e = 0;
    for (let i = 0; i < n; i++) {
      if ((i === 0 && r.pa) || (i === n - 1 && r.pb)) continue;
      const p = r.p[i]; const vx = (p.x - p.ox) * damp; const vy = (p.y - p.oy) * damp; p.ox = p.x; p.oy = p.y; p.x += vx; p.y += vy + g * dt2; e += Math.abs(vx) + Math.abs(vy);
    }
    const A = r.w.sock; const Bp = r.w.port;
    for (let it = 0; it < 7; it++) {
      if (r.pa) { r.p[0].x = A.x; r.p[0].y = A.y; }
      if (r.pb) { r.p[n - 1].x = Bp.x; r.p[n - 1].y = Bp.y; }
      for (let i = 0; i < n - 1; i++) {
        const p1 = r.p[i]; const p2 = r.p[i + 1]; const dx = p2.x - p1.x; const dy = p2.y - p1.y; const d = Math.hypot(dx, dy) || 0.001; const df = (d - r.L[i]) / d;
        const f1 = i === 0 && r.pa; const f2 = i + 1 === n - 1 && r.pb;
        if (f1 && f2) continue;
        if (f1) { p2.x -= dx * df; p2.y -= dy * df; } else if (f2) { p1.x += dx * df; p1.y += dy * df; } else { p1.x += dx * df * 0.5; p1.y += dy * df * 0.5; p2.x -= dx * df * 0.5; p2.y -= dy * df * 0.5; }
      }
    }
    const fl = H - 6; for (const p of r.p) if (p.y > fl) { p.y = fl; p.ox = p.x - (p.x - p.ox) * 0.5; }
    r.e = r.e * 0.85 + (e / n) * 0.15; r.age += dt; if (r.age > 1.2 && r.e < 0.03) r.sleep = true;
  }
  function relink() {
    for (const w of wires) w.el = stage.querySelector(`.plate[data-k="${w.k}"]`);
    measurePorts(); for (const w of wires) { computePts(w); rebuildRopes(w); }
  }
  function buildWires() {
    wires = keys.map((k, i) => ({ k, i, el: null, ph: Math.random() * 6, plug: 0, ropes: null, cutAt: null, unplugged: false, burnt: false, pts: Array.from({ length: NPT }, () => ({ x: 0, y: 0 })) }));
    relink();
  }
  const wireOf = (k) => wires.find((w) => w.k === k);
  function segDist(px, py, a, b) { const dx = b.x - a.x; const dy = b.y - a.y; const l = dx * dx + dy * dy || 1; const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / l, 0, 1); return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t)); }
  function wireAt(x, y) {
    let best = null; let bd = Math.max(18, wireW() * 2);
    for (const w of wires) {
      if (w.ropes || removed.has(w.k)) continue;
      for (let i = 1; i < NPT - 2; i++) { const d = segDist(x, y, w.pts[i], w.pts[i + 1]); if (d < bd) { bd = d; best = { w, i }; } }
    }
    return best;
  }

  /* ------------------------------ Partikel ------------------------------ */
  const SC = () => B.u / 3;
  function addP(p) { if (parts.length < 650) parts.push(p); }
  function sparks(x, y, n, sp, cols) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; const v = rnd(0.25, 1) * sp * SC(); addP({ t: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.25 * SC(), life: rnd(0.25, 0.7), max: 0.7, c: QC.pick(cols || ['#fff7cc', '#fde047', '#fb923c']), w: rnd(1.2, 2.6) }); } }
  function ring(x, y, r1, c, life = 0.6, w = 6) { addP({ t: 'r', x, y, r0: 4, r1, c, life, max: life, w }); }
  function smoke(x, y, n, opt = {}) { for (let i = 0; i < n; i++) addP({ t: 'k', x: x + rnd(-1, 1) * (opt.spread || 20) * SC(), y: y + rnd(-1, 1) * (opt.spread || 20) * SC() * 0.5, vx: rnd(-1, 1) * (opt.v || 40) * SC(), vy: -rnd(0.3, 1) * (opt.rise || 50) * SC(), r: rnd(8, 18) * SC() * (opt.size || 1), gr: rnd(20, 45) * SC() * (opt.size || 1), life: rnd(1.4, 2.8) * (opt.lt || 1), max: 2.8 * (opt.lt || 1), s: (rnd(28, 70)) | 0 }); }
  function boomFx(x, y) {
    const sc = SC();
    ring(x, y, 170 * sc * 3, 'rgba(255,240,200,1)', 0.55, 10); ring(x, y, 110 * sc * 3, 'rgba(255,140,40,1)', 0.8, 7);
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2; const v = rnd(30, 260) * sc; addP({ t: 'f', x: x + rnd(-12, 12) * sc, y: y + rnd(-12, 12) * sc, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * sc, r: rnd(14, 34) * sc, gr: rnd(30, 90) * sc, life: rnd(0.45, 0.95), max: 0.95 }); }
    const shards = ['#4b5563', '#6b7280', '#374151', '#9ca3af', '#0b6a43', '#facc15', '#dc2626'];
    for (let i = 0; i < 34; i++) {
      const a = -Math.PI / 2 + rnd(-1.5, 1.5); const v = rnd(260, 820) * sc; const sz = rnd(4, 11) * sc; const nv = 3 + ((Math.random() * 3) | 0);
      const shape = Array.from({ length: nv }, (_, k) => { const an = (k / nv) * Math.PI * 2 + rnd(-0.4, 0.4); const rr2 = sz * rnd(0.55, 1.1); return [Math.cos(an) * rr2, Math.sin(an) * rr2]; });
      addP({ t: 'd', x: x + rnd(-20, 20) * sc, y: y + rnd(-20, 20) * sc, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: rnd(-12, 12), shape, c: QC.pick(shards), life: rnd(2, 3.2), max: 3.2 });
    }
    sparks(x, y, 80, 900, ['#ffffff', '#fff7cc', '#fde047', '#fb923c', '#f97316']);
    smoke(x, y, 26, { spread: 30, v: 70, rise: 70, size: 1.6, lt: 1.2 });
    for (let i = 0; i < 22; i++) addP({ t: 'e', x: x + rnd(-1, 1) * 60 * sc, y: y + rnd(-30, 10) * sc, vx: rnd(-1, 1) * 260 * sc, vy: -rnd(100, 420) * sc, life: rnd(1.8, 3.4), max: 3.4, r: rnd(1.2, 2.6) });
  }
  function safeFx(x, y) {
    ring(x, y, 150 * SC() * 3, 'rgba(74,222,128,1)', 0.8, 8); ring(x, y, 90 * SC() * 3, 'rgba(167,243,208,1)', 0.6, 5);
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2; const v = rnd(80, 420) * SC(); addP({ t: 'g', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * SC(), life: rnd(0.8, 1.5), max: 1.5, r: rnd(2, 4.5) * SC(), c: QC.pick(['#4ade80', '#a7f3d0', '#ffffff', '#67e8f9']) }); }
  }
  function updParts(dt) {
    const fl = H - 6; const g = 1400 * SC();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      if (p.t === 's') { p.vy += g * 0.6 * dt; p.vx *= 0.97; p.vy *= 0.97; }
      else if (p.t === 'f') { p.vx *= 0.9; p.vy *= 0.9; p.vy -= 40 * dt; p.r += p.gr * dt; }
      else if (p.t === 'k') { p.vx *= 0.97; p.vy -= 6 * dt; p.r += p.gr * dt; }
      else if (p.t === 'd' || p.t === 'e') {
        p.vy += g * dt; if (p.t === 'd') p.rot += p.vr * dt;
        if (p.y > fl && p.vy > 0) { p.y = fl; p.vy *= -0.32; p.vx *= 0.6; if (p.vr) p.vr *= 0.5; }
      } else if (p.t === 'g') { p.vy += g * 0.35 * dt; p.vx *= 0.98; }
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
    }
  }
  function drawParts() {
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.t === 'k') { ctx.fillStyle = `rgba(${p.s},${p.s},${p.s + 8},${Math.min(0.55, k * 0.7)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else if (p.t === 'd') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = p.c; ctx.beginPath(); p.shape.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.t === 's') { ctx.strokeStyle = p.c; ctx.globalAlpha = Math.min(1, k * 1.6); ctx.lineWidth = p.w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); }
      else if (p.t === 'f') { ctx.globalAlpha = Math.min(1, k * 1.3); ctx.fillStyle = k > 0.75 ? '#fff4c2' : k > 0.5 ? '#fdba74' : k > 0.28 ? '#f97316' : '#8a1c0e'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else if (p.t === 'e') { ctx.globalAlpha = Math.min(1, k * 1.5) * (0.6 + 0.4 * Math.sin(time * 20 + p.x)); ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else if (p.t === 'g') { ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(time * 4 + p.x); const r = p.r; ctx.beginPath(); ctx.moveTo(0, -r * 1.6); ctx.lineTo(r * 0.45, -r * 0.45); ctx.lineTo(r * 1.6, 0); ctx.lineTo(r * 0.45, r * 0.45); ctx.lineTo(0, r * 1.6); ctx.lineTo(-r * 0.45, r * 0.45); ctx.lineTo(-r * 1.6, 0); ctx.lineTo(-r * 0.45, -r * 0.45); ctx.closePath(); ctx.fill(); ctx.restore(); }
      else if (p.t === 'r') { ctx.globalAlpha = k; ctx.strokeStyle = p.c; ctx.lineWidth = p.w * k + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * easeOut(1 - k), 0, 7); ctx.stroke(); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------ Gambar ------------------------------ */
  function trace(pts, n, ox, oy) {
    ctx.beginPath(); ctx.moveTo(pts[0].x + ox, pts[0].y + oy);
    for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(pts[i].x + ox, pts[i].y + oy, (pts[i].x + pts[i + 1].x) / 2 + ox, (pts[i].y + pts[i + 1].y) / 2 + oy);
    ctx.lineTo(pts[n - 1].x + ox, pts[n - 1].y + oy);
  }
  function strokeWire(pts, n, wd, ww, hot, burnt) {
    if (n < 2) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    trace(pts, n, 3, 7); ctx.strokeStyle = 'rgba(0,0,0,.32)'; ctx.lineWidth = ww + 2; ctx.stroke();
    trace(pts, n, 0, 0);
    if (hot) { ctx.strokeStyle = wd.glow; ctx.lineWidth = ww + 14 + Math.sin(time * 9) * 4; ctx.stroke(); }
    ctx.strokeStyle = 'rgba(4,6,12,.92)'; ctx.lineWidth = ww + 3.5; ctx.stroke();
    ctx.strokeStyle = burnt ? wd.dk : wd.c; ctx.lineWidth = ww; ctx.stroke();
    trace(pts, n, 0, -ww * 0.22); ctx.strokeStyle = burnt ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.42)'; ctx.lineWidth = Math.max(1, ww * 0.24); ctx.stroke();
  }
  function copperTip(a, b, ww) { const dx = a.x - b.x; const dy = a.y - b.y; const d = Math.hypot(dx, dy) || 1; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = ww * 0.42; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (dx / d) * ww * 0.9, a.y + (dy / d) * ww * 0.9); ctx.stroke(); ctx.lineCap = 'round'; }
  const tmpPts = Array.from({ length: NPT }, () => ({ x: 0, y: 0 }));
  function drawWires() {
    const ww = wireW();
    for (const w of wires) {
      if (!w.port || !w.sock) continue;
      const wd = WIRE[w.k];
      if (w.ropes) {
        for (const r of w.ropes) {
          strokeWire(r.p, r.p.length, wd, ww, false, w.burnt);
          if (!r.pa) copperTip(r.p[0], r.p[1], ww);
          if (!r.pb) copperTip(r.p[r.p.length - 1], r.p[r.p.length - 2], ww);
        }
      } else if (w.plug > 0) {
        let n = NPT;
        if (w.plug < 1) {
          const f = w.plug * (NPT - 1); const m = Math.floor(f); const fr = f - m;
          for (let i = 0; i <= m; i++) { tmpPts[i].x = w.pts[i].x; tmpPts[i].y = w.pts[i].y; }
          const a = w.pts[m]; const b = w.pts[Math.min(NPT - 1, m + 1)]; tmpPts[m + 1].x = lerp(a.x, b.x, fr); tmpPts[m + 1].y = lerp(a.y, b.y, fr); n = m + 2;
          strokeWire(tmpPts, n, wd, ww, false, false);
          if (Math.random() < 0.5) sparks(tmpPts[n - 1].x, tmpPts[n - 1].y, 1, 160, ['#fde047', '#ffffff']);
          continue;
        }
        strokeWire(w.pts, n, wd, ww, hotK === w.k && phase === 'play', w.burnt);
      }
      // selongsong colokan di pelat
      if (w.plug >= 1 || w.ropes) {
        const p = w.port; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.dy, p.dx)); const L = 6 * B.u; const hw = ww * 0.95;
        ctx.fillStyle = '#1f2937'; ctx.fillRect(0, -hw, L, hw * 2); ctx.fillStyle = '#9ca3af'; ctx.fillRect(1, -hw + 1.5, L - 2, hw * 0.55); ctx.fillStyle = WIRE[w.k].c; ctx.fillRect(L - 2, -hw, 2, hw * 2); ctx.restore();
      }
    }
  }
  function drawSockets() {
    if (!bomb.present || bomb.gone) return; const s = 13 * B.u;
    for (const w of wires) if (w.sock) ctx.drawImage(nutC, w.sock.x - s / 2 + bomb.ox, w.sock.y - s / 2 + bomb.oy, s, s);
  }
  function ledState() {
    if (phase === 'idle' || phase === 'brief' || phase === 'between') return { txt: '----', sep: '', col: 'c' };
    if (phase === 'intro') {
      if (!bomb.landed) return null;
      if (phaseT < 1.1) return Math.random() < 0.15 ? { txt: '8888', sep: ':', col: 'r' } : null;
      if (phaseT < 1.4) return Math.random() < 0.6 ? { txt: '8888', sep: ':', col: 'r' } : null;
      return fmt(timeLeft, 'r', true);
    }
    if (bomb.safe) return fmt(ledShown, 'g', true);
    if (phase === 'alarm') return fmt(alarmVal, 'r', true);
    return fmt(timeLeft, ledFlash > 0 ? 'c' : 'r');
  }
  function fmt(v, col, steady) {
    if (v >= 10) { const s = Math.ceil(v); return { txt: pad(Math.floor(s / 60)) + pad(s % 60), sep: steady || (time % 1) < 0.6 ? ':' : '', col }; }
    const s = Math.floor(v); return { txt: pad(s) + pad(Math.floor((v - s) * 100)), sep: '.', col };
  }
  const LEDC = { r: ['#ff4545', 'rgba(255,40,40,.35)'], g: ['#4ade80', 'rgba(74,222,128,.32)'], c: ['#67e8f9', 'rgba(34,211,238,.32)'] };
  function drawBomb() {
    if (!bomb.present || bomb.gone) return;
    const u = B.u; let ox = 0; let oy = 0;
    if (phase === 'intro') oy = -(1 - bounce(clamp(bomb.drop, 0, 1))) * (B.y + 80 * u);
    if (phase === 'play' && timeLeft < 5) { const k = (5 - timeLeft) / 5; ox = rnd(-1, 1) * 2 * k; oy = rnd(-1, 1) * 1.4 * k; }
    if (phase === 'alarm') { ox = rnd(-1, 1) * 2.6; oy = rnd(-1, 1) * 2; }
    bomb.ox = ox; bomb.oy = oy; const bx = B.x + ox; const by = B.y + oy;
    ctx.drawImage(bombC, bx - 62 * u, by - 64 * u, 124 * u, 118 * u);
    ctx.save(); ctx.translate(bx, by); ctx.scale(u, u);
    const st = ledState();
    if (st) {
      const [core, glow] = LEDC[st.col]; ctx.globalCompositeOperation = 'lighter';
      for (const pass of [0, 1]) {
        ctx.fillStyle = pass ? core : glow; ctx.strokeStyle = glow; ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) { const segs = DIG[st.txt[i]] || ''; for (const s of segs) { const p = LED.digits[i][s]; if (!pass) ctx.stroke(p); ctx.fill(p); } }
        if (st.sep === ':') LED.colon.forEach((p) => ctx.fill(p)); else if (st.sep === '.') ctx.fill(LED.dot);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // lampu status
    const blink = (rate) => (time * rate) % 1 < 0.5;
    let red = false; let amb = false; let grn = false;
    if (bomb.safe) grn = true;
    else if (phase === 'play') { red = blink(timeLeft > 5 ? 1.2 : 5); amb = timeLeft < 10 && blink(2.4); }
    else if (phase === 'alarm' || phase === 'cutting') { red = blink(10); amb = !red; }
    else if (phase === 'intro' && bomb.landed) { const c = ((time * 7) | 0) % 3; red = c === 0; amb = c === 1; grn = c === 2; }
    const lamp = (x, on, col, glow) => { if (!on) return; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, 7.8, 6, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, 7.8, 2.3, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; };
    lamp(16, red, '#ff5a5a', 'rgba(255,40,40,.35)'); lamp(24, amb, '#fbbf24', 'rgba(251,191,36,.32)'); lamp(32, grn, '#4ade80', 'rgba(74,222,128,.35)');
    // teks status
    let txt = 'SIAGA'; let col = '#67e8f9';
    if (bomb.safe) { txt = '✔ AMAN'; col = '#4ade80'; }
    else if (phase === 'alarm') { txt = blink(8) ? 'BAHAYA!!' : ''; col = '#ff5a5a'; }
    else if (phase === 'play' || phase === 'cutting') { if (timeLeft <= 5) { txt = blink(4) ? '!! KRITIS' : ''; col = '#ff5a5a'; } else if (btype === 'standar' || blink(0.6)) { txt = 'SISA ' + wrongLeft().length; col = '#ff6b6b'; } else { txt = btype === 'kilat' ? '⚡ KILAT' : '★ EMAS'; col = btype === 'emas' ? '#fbbf24' : '#fde047'; } }
    else if (phase === 'intro') { txt = bomb.landed ? 'MEMUAT…' : ''; col = '#fbbf24'; }
    if (txt) { ctx.font = '800 4.6px Orbitron, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(txt, -35.5, 8); }
    // ujung antena
    const on = bomb.safe || blink(phase === 'play' && timeLeft <= 5 ? 6 : 1.5);
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = bomb.safe ? 'rgba(74,222,128,.4)' : 'rgba(255,50,50,.4)'; ctx.beginPath(); ctx.arc(46, -57.5, 4.5, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = on ? (bomb.safe ? '#86efac' : '#ff6b6b') : '#4b1111'; ctx.beginPath(); ctx.arc(46, -57.5, 1.8, 0, 7); ctx.fill();
    ctx.restore();
  }
  function drawScorch() {
    if (!bomb.gone) return; const u = B.u;
    const g = ctx.createRadialGradient(B.x, B.floor, 0, B.x, B.floor, 70 * u); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(0.5, 'rgba(30,12,4,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(B.x, B.floor); ctx.scale(1, 0.2); ctx.translate(-B.x, -B.floor); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(B.x, B.floor, 70 * u, 0, 7); ctx.fill(); ctx.restore();
  }
  function drawTrail() { // jejak sayatan (pisau cahaya) yang memudar
    if (trail.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1]; const b = trail[i]; const k = clamp(1 - (time - b.t) / 0.28, 0, 1) * (i / trail.length);
      if (k <= 0) continue;
      ctx.strokeStyle = `rgba(103,232,249,${0.35 * k})`; ctx.lineWidth = 14 * k + 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`; ctx.lineWidth = 4 * k + 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawCutter(c) {
    if (!c || c.slash) return;
    const sc = B.u / 2.6; const t = c.t; const reach = 27 * sc;
    const ang = Math.atan2(c.ty - c.sy, c.tx - c.sx); const px = c.tx - Math.cos(ang) * reach; const py = c.ty - Math.sin(ang) * reach;
    let x; let y; let open; let a = 1;
    if (t < 0.35) { const k = easeOut(t / 0.35); x = lerp(c.sx, px, k); y = lerp(c.sy, py, k); open = 1; }
    else if (t < 0.45) { x = px; y = py; open = 1 - (t - 0.35) / 0.1; }
    else { const k = clamp((t - 0.45) / 0.35, 0, 1); x = lerp(px, c.sx, k * k * 0.6); y = lerp(py, c.sy, k * k * 0.6); open = 0.35 * k; a = 1 - k; }
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * open * 0.34);
      ctx.beginPath(); ctx.moveTo(-3, -s * 1.2); ctx.quadraticCurveTo(-26, -s * 9, -58, -s * 11.5); ctx.strokeStyle = '#2a0606'; ctx.lineWidth = 9.5; ctx.stroke(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 7; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-20, -s * 6.2); ctx.quadraticCurveTo(-34, -s * 9.6, -52, -s * 11); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, s * 0.4); ctx.lineTo(28, s * 0.2); ctx.quadraticCurveTo(31, s * 2, 25, s * 4.5); ctx.quadraticCurveTo(12, s * 7.5, -3, s * 5); ctx.closePath();
      ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fillStyle = '#94a3b8'; ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, 7); ctx.fillStyle = '#1e293b'; ctx.fill();
    ctx.restore();
  }
  function drawOverlays() {
    // pemindai: sinar menyapu
    if (scanFx) {
      const k = clamp(scanFx.t / 0.7, 0, 1); const y0 = B.y - 70 * B.u; const y1 = H; const y = lerp(y0, y1, k);
      if (k < 1) { const g = ctx.createLinearGradient(0, y - 40, 0, y + 6); g.addColorStop(0, 'rgba(34,211,238,0)'); g.addColorStop(1, 'rgba(34,211,238,.35)'); ctx.fillStyle = g; ctx.fillRect(0, y - 40, W, 46); ctx.fillStyle = 'rgba(165,243,252,.9)'; ctx.fillRect(0, y, W, 2); }
      const w = wireOf(scanFx.k);
      if (w && scanFx.t > 0.25 && scanFx.t < 1.1) { const p = w.ropes ? w.ropes[0].p[(w.ropes[0].p.length / 2) | 0] : w.pts[(NPT / 2) | 0]; const s = 22 * SC() * (1 + 0.15 * Math.sin(time * 20)); ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 3; const L = s * 0.5;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(p.x + sx * s, p.y + sy * s - sy * L); ctx.lineTo(p.x + sx * s, p.y + sy * s); ctx.lineTo(p.x + sx * s - sx * L, p.y + sy * s); ctx.stroke(); } }
    }
    // lampu alarm berputar (bahaya / ledakan)
    const beam = danger ? 1 : clamp(beamT, 0, 1);
    if (beam > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,30,60,${0.13 * beam})`;
      for (const [cx, dir] of [[0, 1], [W, -1]]) { const a = time * 5 * dir; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.arc(cx, 0, Math.max(W, H) * 0.9, a - 0.16, a + 0.16); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, 0); ctx.arc(cx, 0, Math.max(W, H) * 0.9, a + Math.PI - 0.16, a + Math.PI + 0.16); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    if (redPulse > 0.01) { ctx.fillStyle = `rgba(255,20,50,${redPulse * 0.13})`; ctx.fillRect(0, 0, W, H); }
    if (flashA > 0.01) { ctx.fillStyle = `rgba(${flashC},${flashA})`; ctx.fillRect(0, 0, W, H); }
  }
  function draw() {
    if (!W || !H) return false;
    const built = ensureCaches();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.drawImage(bgC, 0, 0, W, H);
    const live = ['intro', 'play', 'cutting', 'alarm'].includes(phase);
    if (live && sweepC) { const R = 72 * B.u; ctx.save(); ctx.translate(B.x, B.y - 6 * B.u); ctx.rotate(time * 1.3); ctx.drawImage(sweepC, -R, -R, R * 2, R * 2); ctx.restore(); }
    if (live) { const y = ((time * 70) % (H + 40)) - 20; ctx.fillStyle = 'rgba(120,220,255,.035)'; ctx.fillRect(0, y, W, 3); }
    let sx = 0; let sy = 0; if (shakeT > 0) { const k = shakeT / shakeD; sx = rnd(-1, 1) * shakeP * k; sy = rnd(-1, 1) * shakeP * k; }
    ctx.translate(sx, sy);
    drawScorch(); drawBomb(); drawWires(); drawSockets(); drawParts(); for (const g of ghosts) drawCutter(g); drawCutter(cutter); drawTrail();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawOverlays();
    return built;
  }

  /* ------------------------------ Loop (hanya saat perlu) ------------------------------ */
  let raf = 0; let last = 0;
  // ms = rata-rata bergerak waktu update+gambar per frame; max = frame terberat (tanpa frame pembangunan cache)
  const perf = { ms: 0, max: 0, n: 0, sum: 0, builds: 0, buildMax: 0, slow: [], reset() { this.ms = 0; this.max = 0; this.n = 0; this.sum = 0; this.builds = 0; this.buildMax = 0; this.slow = []; } };
  function needsAnim() {
    if (phase === 'over' || phase === 'idle') return false;
    if (['intro', 'play', 'cutting', 'alarm', 'boom', 'defused'].includes(phase)) return true;
    if (parts.length || flashA > 0.01 || shakeT > 0 || scanFx || cutter || ghosts.length || trail.length || beamT > 0 || redPulse > 0.01) return true;
    for (const w of wires) if (w.ropes) for (const r of w.ropes) if (!r.sleep) return true;
    return false;
  }
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000)); last = now;
    const t0 = performance.now();
    let built = false; const ph0 = phase; let t1 = t0;
    try { update(dt); t1 = performance.now(); built = draw(); } catch (err) { console.error(err); }
    const el = performance.now() - t0;
    if (!built) {
      perf.ms = perf.ms ? perf.ms * 0.95 + el * 0.05 : el; perf.n++; perf.sum += el; perf.max = Math.max(perf.max, el);
      if (el > 6 && perf.slow.length < 30) perf.slow.push(`${el.toFixed(1)}ms(upd ${(t1 - t0).toFixed(1)}) ${ph0}>${phase}`);
    }
    if (needsAnim()) raf = requestAnimationFrame(frame);
  }
  function redraw() { if (!raf) { try { draw(); } catch (e) { console.error(e); } } }

  function update(dt) {
    time += dt; phaseT += dt;
    if (phase === 'intro') {
      bomb.drop = clamp(phaseT / 0.55, 0, 1);
      if (!bomb.landed && phaseT >= 0.55) { bomb.landed = true; SND.clank(); smoke(B.x, B.floor, 12, { spread: 50, v: 120, rise: 20, size: 0.8, lt: 0.4 }); shakeP = 7; shakeT = shakeD = 0.25; }
      wires.forEach((w, i) => { const p = clamp((phaseT - (0.62 + i * 0.13)) / 0.3, 0, 1); if (p >= 1 && w.plug < 1) { SND.plug(); sparks(w.port.x, w.port.y, 8, 260, ['#fde047', '#fff']); } w.plug = p; });
      if (phaseT >= 1.1 && !bomb.booted) { bomb.booted = true; SND.boot(); }
      if (phaseT >= 1.6) beginPlay();
    } else if (phase === 'play') {
      if (runTimer(dt) && timeLeft <= 0) onTimeout();
    } else if (phase === 'cutting' && cutter) {
      runTimer(dt); // waktu tetap berjalan saat memotong
      const c = cutter; c.t += dt; const w = wireOf(c.k);
      if (!c.snapped) { const p = w.pts[c.ci]; c.tx = p.x; c.ty = p.y; }
      if (!c.snapped && c.t >= 0.42) { c.snapped = true; cutWire(w, c.ci); sparks(c.tx, c.ty, 26, 520); ring(c.tx, c.ty, 40 * SC(), 'rgba(255,240,180,1)', 0.35, 4); SND.snip(); flashA = 0.12; flashC = '255,245,200'; }
      if (c.t >= 0.62) { cutter = null; ghosts.push(c); afterCut(c.k); }
    } else if (phase === 'alarm') {
      const p = clamp(phaseT / alarmDur, 0, 1); alarmVal = alarmFrom * (1 - p);
      if (phaseT >= alarmBeep) { alarmBeep += 0.1; SND.alarm((alarmBeep * 10) | 0); redPulse = 1; }
      if (p >= 1) explode();
    } else if (phase === 'boom') { if (phaseT > 1.05 && !resultShown) showResult(); }
    else if (phase === 'defused') { if (phaseT > 0.95 && !resultShown) showResult(); }

    for (const w of wires) { if (!w.ropes) computePts(w); else for (const r of w.ropes) stepRope(r, dt); }
    // percikan kecil dari ujung kabel yang baru dipotong
    tipSpark -= dt;
    if (tipSpark <= 0) { tipSpark = 0.09; for (const w of wires) if (w.ropes && w.cutAt != null && w.ropes[0].age < 1.4 && !w.burnt) { const r = w.ropes[0]; const e = r.p[r.p.length - 1]; sparks(e.x, e.y, 2, 220, ['#fde047', '#fb923c']); } }
    while (trail.length && time - trail[0].t > 0.3) trail.shift();
    if (ghosts.length) { for (const g of ghosts) g.t += dt; ghosts = ghosts.filter((g) => g.t < 0.8); }
    if (scanFx) { scanFx.t += dt; if (!scanFx.done && scanFx.t >= 0.7) scanHit(); if (scanFx.t > 1.2) scanFx = null; }
    updParts(dt);
    flashA = Math.max(0, flashA - dt * 2.6); redPulse = Math.max(0, redPulse - dt * 3.5); ledFlash = Math.max(0, ledFlash - dt); beamT = Math.max(0, beamT - dt);
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  }
  function setDanger(on) { if (danger === on) return; danger = on; stage.classList.toggle('danger', on); }
  function runTimer(dt) {
    if (QC.isBusy() || document.hidden) return false;
    timeLeft = Math.max(0, timeLeft - dt * BTYPE[btype].rate);
    tickAcc -= dt;
    if (tickAcc <= 0 && timeLeft > 0) { const iv = timeLeft > 5 ? 1 / BTYPE[btype].rate : 0.12 + 0.36 * (timeLeft / 5); tickAcc += iv; SND.tick(timeLeft); if (timeLeft <= 5) redPulse = 1; }
    setDanger(timeLeft <= 5);
    const bar = $('qBar'); if (bar) bar.style.transform = `scaleX(${clamp(timeLeft / timeTotal, 0, 1)})`;
    return true;
  }

  /* ------------------------------ HUD ------------------------------ */
  const maxRounds = () => (S.mode === 'poin' ? S.rounds || 10 : S.rounds);
  const calcLevel = () => (S.levelEvery ? Math.min(5, 1 + Math.floor((round - 1) / S.levelEvery)) : 1);
  const bombTime = () => Math.max(8, Math.round(S.time * (1 - 0.12 * (level - 1))));
  const recKey = () => `lokamain_jinak-bom_rekor_${S.mode}`;
  const inGame = () => !['idle', 'brief', 'over'].includes(phase);
  function renderInfo() {
    $('modeLbl').textContent = S.mode === 'poin' ? 'POIN' : 'BERTAHAN';
    $('lvlNo').textContent = level; $('roundNo').textContent = Math.max(1, round);
    const mr = maxRounds(); $('roundMax').textContent = mr ? '/' + mr : '/∞'; $('bombNo').textContent = bombNo;
  }
  /* Kartu regu: struktur dibangun sekali per permainan, lalu diperbarui di tempat
     (tanpa innerHTML ulang -> tidak memicu tata letak ulang emoji/SVG yang mahal). */
  let teamSig = '';
  function setText(el, v) { v = String(v); if (el.textContent !== v) el.textContent = v; }
  function restartCls(el, cls) { el.classList.remove(cls); requestAnimationFrame(() => el.classList.add(cls)); }
  function renderTeams(fx = {}) {
    const el = $('teams'); const solo = T.length === 1;
    const sig = [T.length, S.lives, S.mode, ...T.map((t) => t.name + t.avatar + t.color)].join('|');
    if (sig !== teamSig || el.children.length !== T.length + (solo ? 1 : 0)) {
      teamSig = sig;
      let html = T.map((t, i) => `<div class="team" style="--tc:${t.color}" id="team${i}"><span class="t-badge">▶ GILIRAN</span><div class="t-av">${t.avatar}</div>
        <div class="t-mid"><div class="t-name"><span>${esc(t.name)}</span><span class="t-streak" hidden></span></div>
        <div class="t-row"><span class="t-lives" title="Nyawa">${Array.from({ length: S.lives }, () => `<span class="h on">${HEART}</span>`).join('')}</span><span class="t-pw"><span class="pw-s" title="Pemindai"></span><span class="pw-t" title="+10 detik"></span></span></div></div>
        <div class="t-score"><b id="score${i}">0</b><small>POIN</small></div></div>`).join('');
      if (solo) html += `<div class="team record"><div class="t-av">🏅</div><div class="t-mid"><div class="t-name"><span>REKOR SOLO</span></div><div class="t-row"><span class="t-pw"><span>${S.mode === 'poin' ? '🏆 Kumpulkan Poin' : '🛡️ Bertahan'}</span></span></div></div><div class="t-score"><b id="recScore">0</b><small>POIN</small></div></div>`;
      el.style.setProperty('--n', T.length + (solo ? 1 : 0)); el.innerHTML = html;
    }
    T.forEach((t, i) => {
      const c = $('team' + i); if (!c) return;
      c.classList.toggle('active', inGame() && i === turn); c.classList.toggle('out', !t.alive);
      if (fx.hit === i) restartCls(c, 'hit'); if (fx.win === i) restartCls(c, 'gain');
      const st = c.querySelector('.t-streak'); st.hidden = t.streak < 2; if (t.streak >= 2) setText(st, '🔥' + t.streak);
      c.querySelectorAll('.t-lives .h').forEach((h, k) => {
        h.classList.toggle('on', k < t.lives); h.classList.toggle('off', k >= t.lives);
        if (fx.lose === i && k === t.lives) restartCls(h, 'lose'); if (fx.gain === i) restartCls(h, 'gain');
      });
      const ps = c.querySelector('.pw-s'); const pt = c.querySelector('.pw-t');
      setText(ps, '🔍' + t.scan); setText(pt, '⏱️' + t.time); ps.classList.toggle('zero', !t.scan); pt.classList.toggle('zero', !t.time);
      if (fx.gift === i) restartCls(fx.gk === 'scan' ? ps : pt, 'gift');
      if (fx.win !== i) setText($('score' + i), t.score);
    });
    if (solo && $('recScore')) setText($('recScore'), store(recKey()) || 0);
  }
  function renderQuestion() {
    const t = T[turn]; const qc = $('qcard'); qc.style.setProperty('--tc', t.color); const bt = BTYPE[btype];
    qc.innerHTML = `<div class="q-top"><span class="turn-chip" style="--tc:${t.color}"><i>${t.avatar}</i><small>GILIRAN:</small> <b>${esc(t.name.toUpperCase())}</b></span>
      <span class="q-meta"><span>BOM #${bombNo}</span>${btype !== 'standar' ? `<span class="bt-${btype}">${bt.name} ×${bt.mult}</span>` : ''}<span class="q-prog" id="qProg"></span><span>⏱️ ${timeTotal} DTK</span></span></div>
      <div class="q-text${q.question.length > 120 ? ' long' : ''}">${esc(q.question)}</div><div class="q-bar"><i id="qBar"></i></div>`;
    updateProg();
  }
  function updateProg() { // "✂ 1/3" = kabel salah yang sudah diputus / yang harus diputus
    const el = $('qProg'); if (!el || !q) return;
    const total = keys.filter((k) => k !== q.correct).length; const done = total - wrongLeft().length;
    el.textContent = `✂ PUTUS ${done}/${total}`; el.classList.toggle('full', done >= total);
  }
  function plateHTML(k) {
    const i = keys.indexOf(k); const wd = WIRE[k];
    return `<button class="plate" tabindex="-1" data-k="${k}" style="--wc:${wd.c};--i:${i}" aria-label="Kabel ${wd.name} ${k}: ${esc(q['option' + k])}">
      <span class="pl-tag">KABEL ${wd.name}</span><span class="pl-key">${k}<small>${i + 1}</small></span><span class="pl-text">${esc(q['option' + k])}</span><span class="pl-mark"></span></button>`;
  }
  function renderPlates(noAnim) {
    let L; let R;
    if (narrow) { L = keys; R = []; }
    else if (keys.length <= 2) { L = keys.slice(0, 1); R = keys.slice(1); }
    else { L = keys.slice(0, 2); R = keys.slice(2); }
    const long = keys.some((k) => String(q['option' + k]).length > 46);
    $('platesL').innerHTML = L.map(plateHTML).join(''); $('platesR').innerHTML = R.map(plateHTML).join('');
    $('platesL').classList.toggle('long', long); $('platesR').classList.toggle('long', long);
    stage.classList.toggle('noanim', !!noAnim);
    // pelat jawaban hanya untuk dibaca — yang bisa dipotong hanya KABELNYA
    applyPlates();
  }
  function applyPlates() {
    const res = phase === 'result' || phase === 'boom' || phase === 'defused';
    stage.querySelectorAll('.plate').forEach((b) => {
      const k = b.dataset.k;
      b.disabled = phase !== 'play' || removed.has(k) || snipped.has(k);
      b.classList.toggle('scanned', removed.has(k) && !(scanFx && scanFx.k === k && !scanFx.done));
      b.classList.toggle('snipped', snipped.has(k));
      b.classList.toggle('chosen', phase === 'cutting' && chosen === k);
      b.classList.toggle('right-ans', res && k === q.correct);
      // saat hasil: kabel salah yang belum sempat diputus ditandai ✖
      b.classList.toggle('wrong-ans', res && k !== q.correct && !removed.has(k) && !snipped.has(k));
      b.classList.toggle('hot', phase === 'play' && hotK === k);
    });
  }
  function renderDock() {
    const d = $('dock');
    if (phase === 'result') {
      d.innerHTML = `<button class="next-btn${resultInfo && resultInfo.ok ? ' ok' : ''}" id="btnNext">LANJUT ➜<small>SPASI</small></button>`;
      $('btnNext').onclick = (e) => { e.currentTarget.blur(); next(); }; return;
    }
    if (['intro', 'play', 'cutting', 'alarm', 'boom', 'defused'].includes(phase) && T[turn]) {
      const t = T[turn]; const can = phase === 'play';
      const scanOk = can && !usedScan && t.scan > 0 && wrongLeft().length >= 2;
      const timeOk = can && !usedTime && t.time > 0;
      const last = keys[keys.length - 1]; const n = wrongLeft().length;
      d.innerHTML = `<button class="pw${scanOk ? ' ready' : ''}" id="pwScan" ${scanOk ? '' : 'disabled'} title="Putus otomatis 1 kabel salah (S)"><span class="ic">🔍</span>PEMINDAI <b>${t.scan}</b><kbd>S</kbd></button>
        <span class="dock-hint">✂️ Putuskan <b class="hl-bad">semua kabel SALAH</b>${n ? ` (sisa <b>${n}</b>)` : ''} — <b class="hl-ok">jangan potong jawaban benar!</b><br>🗡️ Sayat kabelnya: sentuh & geser melintasi kabel (atau ketuk kabelnya)</span>
        <button class="pw${timeOk ? ' ready' : ''}" id="pwTime" ${timeOk ? '' : 'disabled'} title="Tambah 10 detik (T)"><span class="ic">⏱️</span>+10 DETIK <b>${t.time}</b><kbd>T</kbd></button>`;
      $('pwScan').onclick = (e) => { e.currentTarget.blur(); useScan(); };
      $('pwTime').onclick = (e) => { e.currentTarget.blur(); useTime(); };
      return;
    }
    d.innerHTML = '';
  }
  function bigText(text, cls, x, y) {
    const el = document.createElement('div'); el.className = 'fx-big ' + cls; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px';
    stage.appendChild(el); setTimeout(() => el.remove(), 1600);
  }
  function toClient(x, y) { const r = stage.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; }

  /* ------------------------------ Alur permainan ------------------------------ */
  async function openSetup() {
    phase = 'idle'; setDanger(false); $('brief').hidden = true; cutter = null; scanFx = null; parts.length = 0;
    const p = QC.setup({
      logo: '💣', subtitle: 'Regu penjinak bom, merapat! Putuskan SEMUA kabel jawaban yang SALAH — sisakan kabel jawaban yang benar!',
      min: 1, max: 4, defaultCount: 3, soloLabel: '1 Regu (Solo)', defaultNames: ['Regu Alfa', 'Regu Bravo', 'Regu Cakra', 'Regu Delta'],
      settings: [
        { key: 'mode', label: '🎯 Mode permainan', value: 'poin', options: [['poin', '🏆 Kumpulkan Poin'], ['bertahan', '🛡️ Bertahan (nyawa habis = gugur)']] },
        { key: 'rounds', label: '🔁 Jumlah ronde', value: 5, options: [[3, '3 ronde'], [5, '5 ronde'], [8, '8 ronde'], [10, '10 ronde'], [15, '15 ronde'], [0, '♾️ Tanpa batas (Bertahan)']] },
        { key: 'time', label: '⏱️ Waktu per bom', value: 30, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik'], [60, '60 detik']] },
        { key: 'lives', label: '❤️ Nyawa per regu', value: 3, options: [[1, '1 nyawa'], [2, '2 nyawa'], [3, '3 nyawa'], [5, '5 nyawa']] },
        { key: 'levelEvery', label: '📈 Naik level tiap', value: 2, options: [[1, '1 ronde'], [2, '2 ronde'], [3, '3 ronde'], [0, 'Tidak naik level']] }
      ],
      rulesHtml: RULES_SHORT
    });
    // sesuaikan istilah "Pemain" -> "Regu" di layar pengaturan
    const o = [...document.querySelectorAll('.qc-setup')].pop();
    if (o) {
      const h3 = o.querySelector('.qc-panel h3'); if (h3) h3.textContent = '👥 Jumlah Regu';
      o.querySelectorAll('.qc-seg button').forEach((b) => { if (+b.dataset.n > 1) b.textContent = b.dataset.n + ' Regu'; });
      const dt = o.querySelector('details.qc-rules'); if (dt) { dt.removeAttribute('open'); const sm = dt.querySelector('summary'); if (sm) sm.textContent = '📜 Cara Main Singkat'; }
    }
    redraw();
    const r = await p;
    S = { ...S, ...r.settings };
    T = r.players.map((pl) => ({ ...pl }));
    newGame();
  }
  function newGame() {
    T.forEach((t) => Object.assign(t, { score: 0, lives: S.lives, alive: true, streak: 0, scan: 1, time: 1, defused: 0, boomed: 0, outAt: 0 }));
    round = 1; turn = 0; level = 1; bombNo = 0; elimCount = 0; q = null; keys = []; wires = []; parts.length = 0; cutter = null; ghosts = []; scanFx = null; removed = new Set(); snipped = new Set(); chosen = null;
    Object.assign(bomb, { present: true, gone: false, safe: false, drop: 1, landed: true, booted: true }); btype = 'standar';
    phase = 'brief'; setDanger(false);
    $('platesL').innerHTML = ''; $('platesR').innerHTML = ''; $('dock').innerHTML = '';
    const qc = $('qcard'); qc.style.removeProperty('--tc'); qc.innerHTML = '<div class="q-wait">🔒 BRIEFING MISI…</div>';
    renderTeams(); renderInfo(); showBrief(); redraw();
  }
  function showBrief() {
    const solo = T.length === 1; const rec = store(recKey()) || 0; const mr = maxRounds();
    const modeLine = S.mode === 'poin'
      ? `🏆 <b>Kumpulkan Poin</b>: ${mr} ronde${solo ? ' (1 bom per ronde)' : ' — tiap regu 1 bom per ronde'}. Poin terbanyak menang!`
      : `🛡️ <b>Bertahan</b>: nyawa habis = <b>gugur</b>. ${solo ? 'Bertahan selama mungkin!' : 'Regu terakhir yang bertahan menang!'}${mr ? ` (maks. ${mr} ronde)` : ''}`;
    $('brief').innerHTML = `<div class="brief-card"><span class="stampx">RAHASIA • SIAGA MERAH</span><h2>BRIEFING MISI</h2>
      <p class="brief-sub">Bom aktif ditemukan di markas! ${solo ? 'Regumu' : 'Setiap regu'} bergiliran menjinakkannya.</p>
      <div class="brief-teams">${T.map((t) => `<span class="brief-team" style="--tc:${t.color}">${t.avatar} ${esc(t.name)}</span>`).join('')}</div>
      <ul class="brief-list">
        <li>⚠️ <b>ATURAN TERBALIK!</b> ✂️ Putuskan <b>SEMUA kabel yang jawabannya SALAH</b>, sisakan <b>kabel jawaban BENAR</b>. <b>Sayat kabelnya</b>: sentuh layar & geser melintasi kabel (atau ketuk kabelnya).</li>
        <li>✅ Semua kabel salah putus: bom <b>AMAN</b> + poin + bonus sisa waktu. 💥 Kabel jawaban benar terputus / waktu habis: <b>DUARR!</b> nyawa −1 (❤️×${S.lives}).</li>
        <li>🔍 <b>Pemindai</b> <kbd>S</kbd> memutus otomatis 1 kabel salah • ⏱️ <b>+10 detik</b> <kbd>T</kbd>. 3 bom aman beruntun = bonus alat!</li>
        <li>${modeLine}</li>
      </ul>${solo ? `<div class="brief-rec">🏅 REKOR ${S.mode === 'poin' ? 'KUMPULKAN POIN' : 'BERTAHAN'}: ${rec} POIN</div>` : ''}
      <button class="go-btn" id="btnGo">▶ MULAI MISI<small>SPASI</small></button></div>`;
    $('brief').hidden = false;
    $('btnGo').onclick = (e) => { e.currentTarget.blur(); startMission(); };
  }
  function startMission() {
    if (phase !== 'brief') return;
    SND.ac(); QC.sfx.click(); $('brief').hidden = true; phase = 'between'; startTurn();
  }
  function pickType() { if (level < 2) return 'standar'; const r = Math.random(); return r < 0.2 ? 'kilat' : r < 0.34 ? 'emas' : 'standar'; }
  function startTurn() {
    const t = T[turn];
    q = QC.nextQuestion();
    if (!q) { QC.toast('⚠️ Bank soal kosong! Tambahkan soal di Mode Guru.', 'bad'); openSetup(); return; }
    keys = QC.optionsOf(q); bombNo++; removed = new Set(); snipped = new Set(); ghosts = []; chosen = null; resultInfo = null; resultShown = false; usedScan = false; usedTime = false; hotK = null;
    btype = pickType(); timeTotal = bombTime(); timeLeft = timeTotal; tickAcc = 0; cutter = null; scanFx = null; parts.length = 0;
    Object.assign(bomb, { present: true, gone: false, safe: false, drop: 0, landed: false, booted: false });
    phase = 'intro'; phaseT = 0;
    renderQuestion(); renderPlates(); renderTeams(); renderInfo(); renderDock(); buildWires();
    const bt = BTYPE[btype];
    FX.announce(`GILIRAN: ${t.avatar} ${esc(t.name)}`, { color: t.color, sub: `BOM #${bombNo} • ${timeTotal} DETIK${btype !== 'standar' ? ' • ' + bt.name + ' ×' + bt.mult : ''}`, dur: 1400 });
    QC.sfx.whoosh(); wake();
  }
  function beginPlay() {
    phase = 'play'; phaseT = 0; tickAcc = 0.25; stage.classList.add('noanim');
    wires.forEach((w) => { w.plug = 1; }); applyPlates(); renderDock(); SND.arm(); wake();
  }
  function cut(k, idx, slash) {
    if (phase !== 'play' || QC.isBusy() || !keys.includes(k) || removed.has(k) || snipped.has(k)) return false;
    const w = wireOf(k); if (!w || w.ropes) return false;
    chosen = k; phase = 'cutting'; phaseT = 0; hotK = null; setDanger(false);
    const ci = idx != null ? clamp(idx, 3, NPT - 5) : Math.floor(NPT * 0.45);
    const p = w.pts[ci];
    // sayatan: kabel langsung putus (tanpa animasi tang); ketukan: tang pemotong datang
    cutter = { k, ci, t: slash ? 0.42 : 0, slash: !!slash, snapped: false, tx: p.x, ty: p.y, sx: lerp(p.x, B.x, 0.35), sy: H + 90 };
    if (slash) SND.noise(0.14, 0.22, 0, 'bandpass', 1800, 7000, 1.2); else QC.sfx.click();
    applyPlates(); renderDock(); cv.classList.remove('hot'); wake();
    return true;
  }
  // setelah tang memutus kabel: kabel jawaban BENAR = alarm; kabel salah = maju, bila semua salah putus = AMAN
  function afterCut(k) {
    if (k === q.correct) { startAlarm(); return; }
    snipped.add(k); chosen = null;
    const left = wrongLeft().length;
    if (!left) { defuse(); return; }
    phase = 'play'; phaseT = 0;
    if (timeLeft <= 0) { onTimeout(); return; }
    SND.tone(880, 0.08, 'sine', 0.06); SND.tone(1320, 0.12, 'sine', 0.06, 0.07);
    applyPlates(); renderDock(); updateProg();
    const el = stage.querySelector(`.plate[data-k="${k}"]`);
    if (el) setTimeout(() => { FX.ringAt(el, '#4ade80', 200); FX.floatTextAt(el, `✂ AMAN! ${left} LAGI`, '#4ade80', 30); }, 0);
  }
  function onTimeout() {
    phase = 'alarm'; phaseT = 0; alarmDur = 0.5; alarmFrom = 0; alarmBeep = 99; chosen = null; setDanger(false); beamT = 2;
    SND.longBeep(); applyPlates(); renderDock();
  }
  function startAlarm() {
    phase = 'alarm'; phaseT = 0; alarmDur = 0.95; alarmFrom = timeLeft; alarmBeep = 0; beamT = 2.2; QC.sfx.wrong(); applyPlates();
  }
  function explode() {
    const t = T[turn]; phase = 'boom'; phaseT = 0; resultShown = false; bomb.gone = true; setDanger(false);
    const cx = B.x; const cy = B.y - 6 * B.u;
    boomFx(cx, cy); flashA = 1; flashC = '255,250,235'; shakeP = 16 * SC(); shakeT = shakeD = 0.85; beamT = 1.8;
    wires.forEach((w) => { unplug(w, true); w.burnt = true; });
    SND.boom(); QC.sfx.boom();
    FX.flash('rgba(255,255,255,.85)', 420); setTimeout(() => FX.flash('rgba(255,90,20,.38)', 700), 130);
    FX.shake($('app'), 14, 650);
    bigText('DUARR!', 'boom', cx, cy - 10 * B.u);
    stage.classList.add('shake-plates'); setTimeout(() => stage.classList.remove('shake-plates'), 560);
    t.lives = Math.max(0, t.lives - 1); t.streak = 0; t.boomed++;
    const info = { ok: false, reason: chosen ? 'salah' : 'waktu' }; let fxo = { lose: turn, hit: turn };
    if (t.lives <= 0) {
      if (S.mode === 'bertahan') { t.alive = false; t.outAt = ++elimCount; info.out = true; }
      else { const pen = Math.min(100, t.score); t.score -= pen; t.lives = S.lives; info.medic = pen; fxo = { hit: turn, gain: turn }; }
    }
    resultInfo = info; applyPlates();
    setTimeout(() => { if (phase === 'idle') return; renderTeams(fxo); SND.heart(); }, 380);
    wake();
  }
  function defuse() {
    const t = T[turn]; phase = 'defused'; phaseT = 0; resultShown = false; bomb.safe = true; ledShown = timeLeft; setDanger(false);
    const bt = BTYPE[btype]; const base = Math.round((100 + 25 * (level - 1)) * bt.mult); const bonus = Math.round(Math.ceil(timeLeft) * 5 * bt.mult); const pts = base + bonus;
    const old = t.score; t.score += pts; t.streak++; t.defused++;
    let gift = null;
    if (t.streak % 3 === 0) { gift = t.scan <= t.time ? 'scan' : 'time'; if (t[gift] >= 3) gift = gift === 'scan' ? 'time' : 'scan'; if (t[gift] < 3) t[gift]++; else gift = null; }
    resultInfo = { ok: true, pts, base, bonus, gift };
    safeFx(B.x, B.y - 10 * B.u); flashA = 0.3; flashC = '74,222,128';
    SND.powerDown(); QC.sfx.correct();
    bigText('AMAN!', 'safe', B.x, B.y - 30 * B.u);
    // (partikel bintang & cincin kanvas menggantikan ledakan emoji — jauh lebih ringan)
    applyPlates(); renderTeams({ win: turn, gift: gift ? turn : -1, gk: gift });
    // efek skor dijalankan di luar frame animasi (hindari tata letak sinkron di dalam frame)
    const ti = turn; setTimeout(() => { const sEl = $('score' + ti); if (!sEl) return; FX.countUp(sEl, old, t.score); FX.floatTextAt(sEl, '+' + pts, '#4ade80', 36); }, 60);
    if (gift) setTimeout(() => QC.toast(`🎁 3 bom aman beruntun!${esc(t.name)} dapat bonus ${gift === 'scan' ? '🔍 Pemindai' : '⏱️ +10 detik'}`, 'good'), 700);
    wake();
  }
  function showResult() {
    resultShown = true; phase = 'result'; canNextAt = performance.now() + 300;
    const r = resultInfo; const t = T[turn]; const k = q.correct; const wd = WIRE[k];
    const title = r.ok ? '✅ BOM DIJINAKKAN!' : r.reason === 'waktu' ? '⏰ WAKTU HABIS — DUARR!' : '💥 KABEL JAWABAN BENAR TERPUTUS — DUARR!';
    const pts = r.ok ? `+${r.pts} <small>(jinak ${r.base} + bonus waktu ${r.bonus})</small>` : '−1 ❤️';
    const total = keys.filter((x) => x !== k).length; const done = total - wrongLeft().length;
    let extra = '';
    if (r.gift) extra = `🎁 Bonus ${r.gift === 'scan' ? '🔍 Pemindai' : '⏱️ +10 detik'}!`;
    else if (r.ok && t.streak >= 2) extra = `🔥 ${t.streak} bom aman beruntun`;
    else if (!r.ok) extra = `✂ ${done}/${total} kabel salah sempat diputus`;
    if (r.out) extra = `☠️ ${esc(t.name)} GUGUR!`;
    if (r.medic != null) extra = `🚑 Nyawa habis: dipulihkan, −${r.medic} poin`;
    const qc = $('qcard');
    qc.innerHTML = `<div class="q-res ${r.ok ? 'res-ok' : 'res-bad'}"><div class="res-head"><span class="res-title">${title}</span><span class="res-pts">${pts}</span>${extra ? `<span class="res-extra">${extra}</span>` : ''}</div>
      <div class="res-q">❓ ${esc(q.question)}</div>
      <div class="res-ans">Jawaban benar: <span class="kc${k === 'C' ? ' dark' : ''}" style="--wc:${wd.c}">${k}</span><b class="ans">${esc(q['option' + k])}</b> <small style="color:var(--muted)">(kabel ${wd.name.toLowerCase()} — yang harus disisakan)</small></div>
      ${q.explanation ? `<div class="res-exp">💡 ${esc(q.explanation)}</div>` : ''}</div>`;
    applyPlates(); renderDock(); renderInfo(); wake();
  }
  const aliveN = () => T.filter((t) => t.alive).length;
  function advanceTurn() { const n = T.length; let j = turn; let guard = 0; do { j++; if (j >= n) { j = 0; round++; } } while (!T[j].alive && ++guard < 20); turn = j; }
  async function next() {
    if (phase !== 'result' || performance.now() < canNextAt || QC.isBusy()) return;
    QC.sfx.click(); phase = 'between'; renderDock(); setDanger(false);
    if (S.mode === 'bertahan' && (aliveN() === 0 || (T.length > 1 && aliveN() <= 1))) { endGame(); return; }
    advanceTurn();
    const mr = maxRounds(); if (mr && round > mr) { endGame(); return; }
    renderInfo(); renderTeams();
    const nl = calcLevel();
    if (nl > level) {
      level = nl; renderInfo(); const lb = $('lvlBox'); lb.classList.remove('up'); void lb.offsetWidth; lb.classList.add('up');
      QC.sfx.magic(); beamT = 1.4; wake();
      await FX.announce(`⚠ LEVEL ${level}`, { color: '#f59e0b', sub: `Waktu per bom jadi ${bombTime()} detik • poin jinak +${25 * (level - 1)}${level === 2 ? ' • awas Bom Kilat & Bom Emas!' : ''}`, dur: 1700 });
      if (phase !== 'between') return;
    }
    startTurn();
  }
  function endGame() {
    phase = 'over'; setDanger(false); renderTeams(); renderDock();
    const solo = T.length === 1; let title; let note; let ranking;
    if (solo) {
      const t = T[0]; const old = store(recKey()) || 0; const isRec = t.score > old; if (isRec) store(recKey(), t.score);
      title = isRec ? '🏅 REKOR BARU!' : 'MISI SELESAI!';
      note = `${S.mode === 'poin' ? 'Kumpulkan Poin' : 'Bertahan'} • Bom dijinakkan: <b>${t.defused}</b> dari ${bombNo} • Rekor: <b>${Math.max(old, t.score)}</b> poin`;
      ranking = [{ player: t, value: t.score }];
    } else if (S.mode === 'poin') {
      ranking = T.map((t) => ({ player: t, value: t.score, l: t.lives })).sort((a, b) => b.value - a.value || b.l - a.l);
      const tie = ranking[0].value === ranking[1].value && ranking[0].l === ranking[1].l;
      title = tie ? 'SERI!' : `${esc(ranking[0].player.name)} JUARA!`;
      note = `Kumpulkan Poin • ${maxRounds()} ronde • ${bombNo} bom`;
    } else {
      const sorted = [...T].sort((a, b) => (b.alive - a.alive) || (a.alive && b.alive ? b.lives - a.lives : b.outAt - a.outAt) || (b.score - a.score));
      ranking = sorted.map((t) => ({ player: t, value: t.score }));
      title = `${esc(sorted[0].name)} BERTAHAN & JUARA!`;
      note = `Mode Bertahan • ${bombNo} bom • urutan berdasarkan regu yang paling lama bertahan`;
    }
    QC.showWinner({ title, ranking, unit: 'poin', note }).then((r) => (r === 'setup' ? openSetup() : newGame()));
  }
  function useScan() {
    if (phase !== 'play' || QC.isBusy()) return;
    const t = T[turn];
    if (usedScan) { QC.toast('🔍 Pemindai sudah dipakai untuk bom ini'); return; }
    if (t.scan <= 0) { QC.toast('🔍 Pemindai habis! Jinakkan 3 bom beruntun untuk bonus.', 'bad'); return; }
    const wrong = wrongLeft();
    if (wrong.length < 2) { QC.toast('🔍 Pemindai butuh minimal 2 kabel salah yang belum diputus', 'bad'); return; }
    t.scan--; usedScan = true; const k = QC.pick(wrong); removed.add(k); if (hotK === k) hotK = null;
    scanFx = { t: 0, k, done: false }; SND.scan(); QC.sfx.magic();
    renderTeams(); renderDock(); applyPlates(); wake();
  }
  function scanHit() {
    scanFx.done = true; const w = wireOf(scanFx.k); if (!w) return;
    const p = w.pts[(NPT / 2) | 0]; unplug(w, false); sparks(w.sock.x, w.sock.y, 16, 400, ['#67e8f9', '#ffffff']); sparks(p.x, p.y, 10, 260, ['#67e8f9']);
    QC.sfx.pop(); applyPlates(); updateProg();
    const el = stage.querySelector(`.plate[data-k="${scanFx.k}"]`); if (el) FX.ringAt(el, '#22d3ee', 220);
    if (phase === 'play' && !wrongLeft().length) defuse();
  }
  function useTime() {
    if (phase !== 'play' || QC.isBusy()) return;
    const t = T[turn];
    if (usedTime) { QC.toast('⏱️ Tambahan waktu sudah dipakai untuk bom ini'); return; }
    if (t.time <= 0) { QC.toast('⏱️ Tambahan waktu habis!', 'bad'); return; }
    t.time--; usedTime = true; timeLeft += 10; timeTotal = Math.max(timeTotal, timeLeft); ledFlash = 0.8; setDanger(false);
    SND.timeUp(); ring(B.x, B.y - 13 * B.u, 120 * SC(), 'rgba(103,232,249,1)', 0.6, 6);
    const c = toClient(B.x, B.y - 30 * B.u); FX.floatText(c.x, c.y, '+10 DETIK', '#67e8f9', 38);
    renderTeams(); renderDock(); wake();
  }

  /* ------------------------------ Masukan ------------------------------ */
  function stagePt(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  /* Memotong kabel: SAYAT (sentuh & geser melintasi kabel) atau KETUK kabelnya.
     Satu sayatan hanya memutus satu kabel (kabel berikutnya perlu sayatan baru). */
  let swipe = null;
  function segCross(ax, ay, bx, by, c, d) { // apakah ruas a-b memotong ruas c-d
    const r1x = bx - ax; const r1y = by - ay; const r2x = d.x - c.x; const r2y = d.y - c.y; const den = r1x * r2y - r1y * r2x;
    if (Math.abs(den) < 1e-6) return false;
    const t = ((c.x - ax) * r2y - (c.y - ay) * r2x) / den; const u = ((c.x - ax) * r1y - (c.y - ay) * r1x) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }
  function wireCross(ax, ay, bx, by) {
    for (const w of wires) {
      if (w.ropes || removed.has(w.k) || snipped.has(w.k)) continue;
      for (let i = 1; i < NPT - 2; i++) if (segCross(ax, ay, bx, by, w.pts[i], w.pts[i + 1])) return { w, i };
    }
    const h = wireAt(bx, by); return h && segDist(bx, by, h.w.pts[h.i], h.w.pts[h.i + 1]) < wireW() * 0.9 ? h : null;
  }
  function addTrail(x, y) { trail.push({ x, y, t: time }); if (trail.length > 40) trail.shift(); wake(); }
  cv.addEventListener('pointerdown', (e) => {
    SND.ac();
    if (phase !== 'play') return;
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const p = stagePt(e); swipe = { id: e.pointerId, x: p.x, y: p.y, moved: 0, done: false };
    addTrail(p.x, p.y);
  });
  cv.addEventListener('pointermove', (e) => {
    const p = stagePt(e);
    if (swipe && e.pointerId === swipe.id) {
      const dx = p.x - swipe.x; const dy = p.y - swipe.y; const dd = Math.hypot(dx, dy); if (dd < 1.5) return;
      swipe.moved += dd; addTrail(p.x, p.y);
      if (!swipe.done && phase === 'play' && swipe.moved > 10) {
        const hit = wireCross(swipe.x, swipe.y, p.x, p.y);
        if (hit) { swipe.done = true; cut(hit.w.k, hit.i, true); }
      }
      swipe.x = p.x; swipe.y = p.y; return;
    }
    if (phase !== 'play') { if (cv.classList.contains('hot')) cv.classList.remove('hot'); return; }
    const hit = wireAt(p.x, p.y); const k = hit ? hit.w.k : null;
    cv.classList.toggle('hot', !!hit);
    if (k !== hotK && (k || e.pointerType !== 'touch')) { hotK = k; applyPlates(); }
  });
  function endSwipe(e, tap) {
    if (!swipe || e.pointerId !== swipe.id) return;
    const s = swipe; swipe = null;
    if (tap && !s.done && s.moved < 12 && phase === 'play') { const p = stagePt(e); const hit = wireAt(p.x, p.y); if (hit) cut(hit.w.k, hit.i); }
  }
  cv.addEventListener('pointerup', (e) => endSwipe(e, true));
  cv.addEventListener('pointercancel', (e) => endSwipe(e, false));
  cv.addEventListener('pointerleave', (e) => { if (!swipe && hotK) { hotK = null; applyPlates(); } if (!swipe) cv.classList.remove('hot'); });
  QC.onKey = (e) => {
    const key = e.key; const up = key.length === 1 ? key.toUpperCase() : key;
    if (up === 'M') { toggleMusic(); return; }
    if (key === ' ' || key === 'Enter') { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); if (phase === 'brief') startMission(); else if (phase === 'result') next(); return; }
    if (phase !== 'play') return;
    // kabel hanya bisa diputus dengan menyayat / mengetuk kabelnya (tidak lewat tombol jawaban)
    if (up === 'S') useScan();
    else if (up === 'T') useTime();
  };
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); QC.modal({ icon: '📜', title: 'Peraturan Misi', html: `<div class="rules-pop">${RULES}</div>`, cls: 'jb-rules' }); };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur();
    if (inGame()) {
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Misi yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) return;
    }
    openSetup();
  };

  /* ------------------------------ Ukuran layar ------------------------------ */
  let relayoutQ = false;
  function relayout() {
    relayoutQ = false;
    const nw = window.matchMedia('(max-width: 760px)').matches;
    if (nw !== narrow) { narrow = nw; if (q && keys.length && inGame()) { renderPlates(true); } }
    layout();
    if (wires.length) relink();
    for (const w of wires) if (w.ropes) w.ropes.forEach((r) => { r.sleep = false; r.age = 0; });
    redraw(); if (needsAnim()) wake();
  }
  function queueRelayout() { if (!relayoutQ) { relayoutQ = true; requestAnimationFrame(relayout); } }
  addEventListener('resize', queueRelayout);
  if (window.ResizeObserver) { const ro = new ResizeObserver(queueRelayout); [stage, $('platesL'), $('platesR'), $('bombSpot')].forEach((el) => ro.observe(el)); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cacheKey = ''; queueRelayout(); });

  /* ------------------------------ Debug untuk pengujian ------------------------------ */
  window.__JB = {
    perf,
    get phase() { return phase; },
    state: () => ({ phase, round, turn, level, bombNo, btype, mode: S.mode, timeLeft: +timeLeft.toFixed(2), timeTotal, keys: [...keys], correct: q && q.correct, removed: [...removed], snipped: [...snipped], wrongLeft: wrongLeft(),
      teams: T.map((t) => ({ name: t.name, score: t.score, lives: t.lives, alive: t.alive, scan: t.scan, time: t.time, streak: t.streak })), parts: parts.length, running: !!raf, narrow, W, H, u: +B.u.toFixed(2) }),
    wirePoint(k) { const w = wireOf(k); if (!w || w.ropes) return null; const r = cv.getBoundingClientRect(); const p = w.pts[(NPT * 0.5) | 0]; return { x: r.left + p.x, y: r.top + p.y }; },
    cut: (k) => cut(k), scan: () => useScan(), addTime: () => useTime(), next: () => next(), start: () => startMission(),
    setTime(s) { timeLeft = s; }, setType(t) { btype = t; cacheKey = ''; }
  };

  narrow = window.matchMedia('(max-width: 760px)').matches;
  layout(); redraw();
  openSetup();
})();
