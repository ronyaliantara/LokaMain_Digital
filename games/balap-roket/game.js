/* ==========================================================================
   Balap Roket Antariksa — DUEL REBUTAN SATU PETA (maks. 2 pemain)
   - Kedua roket terbang di SATU peta antariksa yang sama, terus-menerus
     (tidak kembali ke posisi awal).
   - Soal muncul di papan atas -> dunia jadi SLOW-MOTION (default 10 detik)
     untuk membaca soal & pilihan.
   - Lalu 3 kotak jawaban muncul acak (1 benar). Rebutan: siapa lebih dulu
     menabrak kotak yang BENAR mendapat poin.
   - Roket saling bertabrakan -> keduanya pingsan. Tabrak jawaban salah -> pingsan.
   - Item langsung aktif saat diambil: rudal pelacak meluncur otomatis mengejar
     musuh (masih bisa dihindari), sinar beku, kemudi terbalik, hujan meteor,
     perisai, turbo.
   - Kontrol: keyboard, gamepad, ANALOG DI LAYAR (Smart TV / IFP layar sentuh),
     remote TV (tombol panah). 1 pemain = lawan Robot.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  QC.init({ gameId: 'balap-roket', title: 'Balap Roket Antariksa', avatars: ['🧑‍🚀', '👩‍🚀', '👽', '🦊', '🐼', '🐯', '🐧', '🐸'], colors: ['#38bdf8', '#f43f5e', '#22c55e', '#a855f7'] });

  const PC = ['#38bdf8', '#f43f5e'];
  const LABELS = ['A', 'B', 'C'];
  const LC = { A: '#ef4444', B: '#3b82f6', C: '#f59e0b' };
  const START = [{ x: 0.42, y: 0.86 }, { x: 0.58, y: 0.86 }];
  const ITEMS = {
    missile: { icon: '🚀', name: 'Rudal Pelacak', color: '#fb923c', w: 3 },
    freeze: { icon: '❄️', name: 'Sinar Beku', color: '#67e8f9', w: 2 },
    reverse: { icon: '🌀', name: 'Kemudi Terbalik', color: '#c084fc', w: 2 },
    rain: { icon: '☄️', name: 'Hujan Meteor', color: '#f97316', w: 2 },
    shield: { icon: '🛡️', name: 'Perisai', color: '#22d3ee', w: 2 },
    turbo: { icon: '⚡', name: 'Turbo', color: '#facc15', w: 2 }
  };
  const ITEM_BAG = Object.keys(ITEMS).flatMap((k) => Array(ITEMS[k].w).fill(k));
  const BOT = { easy: { react: [3.6, 5.6], acc: 0.6 }, normal: { react: [2.3, 3.8], acc: 0.75 }, hard: { react: [1.3, 2.3], acc: 0.9 } };
  const RULES = `<ul>
    <li>Kedua roket terbang di <b>satu peta</b>. Main sendiri? Lawan <b>Robot ARX</b>.</li>
    <li>Soal muncul di <b>papan atas</b> → permainan jadi <b>🐢 SLOW-MOTION</b> (default 10 detik) untuk membaca soal & 3 pilihan jawaban.</li>
    <li>Lalu <b>3 kotak jawaban muncul acak</b> — hanya 1 yang benar. <b>Rebutan:</b> siapa lebih dulu menabrak jawaban BENAR = +1 poin. Kotak selalu muncul <b>jauh dari roket</b>. Setelah ronde, papan soal hilang dan ada <b>jeda beberapa detik</b> sebelum soal berikutnya — permainan <b>terus berlanjut</b> dari posisi terakhir.</li>
    <li>Tabrak jawaban salah → <b>pingsan 2 detik</b>. Roket <b>saling bertabrakan</b> → keduanya pingsan. Tabrak meteor → pingsan sebentar.</li>
    <li>Item 🎁 <b>langsung aktif</b> saat diambil: 🚀 rudal pelacak otomatis mengejar musuh (bisa dihindari — terus bergerak!), ❄️ sinar beku, 🌀 kemudi terbalik, ☄️ hujan meteor ke musuh, 🛡️ perisai, ⚡ turbo.</li>
    <li><b>Kontrol:</b> 🕹️ <b>Analog di layar</b> (kiri bawah = Pemain 1, kanan bawah = Pemain 2) untuk Smart TV / IFP • P1 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> • P2 tombol panah / remote TV • Gamepad (2 stik).</li>
    <li><kbd>Spasi</kbd> / <kbd>OK</kbd> = mulai / lewati slow-motion. Pertama mencapai <b>target poin</b> menang!</li></ul>`;
  const SLOW = 0.2; // kecepatan dunia saat slow-motion baca soal

  /* ------------------------------ Kanvas & ukuran ------------------------------ */
  const cv = $('cv'); const ctx = cv.getContext('2d');
  let W = 0; let H = 0; let DPR = 1; let U = 0; let R = 20;
  function resize() {
    const r = $('arena').getBoundingClientRect(); W = Math.max(240, r.width); H = Math.max(200, r.height);
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    U = Math.min(W * 0.62, H); R = U * 0.055; boxCacheKey = '';
  }
  addEventListener('resize', resize);
  const px = (x) => x * W; const py = (y) => y * H;

  /* ------------------------------ Status ------------------------------ */
  let S = { target: 5, slow: 10, gap: 4, answer: 20, speed: 1, meteor: 'normal', items: 'on', wrong: 'stun', bot: 'normal', pad: 'on' };
  let P = []; let solo = false;
  let phase = 'idle'; // idle | ready | count | read (slow-motion) | fly | result | over
  let q = null; let opts = []; let qNo = 0; let readLeft = 0; let ansLeft = 0; let phaseT = 0; let countLeft = 0; let lastCount = -1;
  let time = 0; let meteorT = 0; let itemT = 0; let ts = 1; let topY = 0.2;
  let boxes = []; let meteors = []; let items = []; let projectiles = []; let particles = []; let texts = [];
  let boxCacheKey = ''; let bigText = null; let flip = false; let warnBeep = 0;
  const live = () => phase === 'read' || phase === 'fly' || phase === 'result' || phase === 'gap';
  const RESULT_T = 2.6; let gapLeft = 0;
  const mkShip = (i) => ({ i, x: START[i].x, y: START[i].y, vx: 0, vy: 0, ang: 0,
    fx: { stun: 0, freeze: 0, rev: 0, shield: 0, turbo: 0, inv: 0, spin: 0, bump: 0 }, score: 0, shake: 0,
    input: { x: 0, y: 0 }, touch: null, bot: null, bad: new Set() });
  let ships = [mkShip(0), mkShip(1)];
  const isBot = (i) => !!(P[i] && P[i].bot) || (i === 0 && window.__demo);
  const correctBox = () => boxes.find((b) => b.key === q.correct);

  /* ------------------------------ Sprite meteor ------------------------------ */
  const METEOR_SPR = [0, 1, 2].map((v) => {
    const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
    x.translate(48, 48); const pts = 11; x.beginPath();
    for (let i = 0; i < pts; i++) { const a = (i / pts) * Math.PI * 2; const r = 40 * (0.78 + Math.random() * 0.22); i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath();
    const g = x.createRadialGradient(-12, -14, 4, 0, 0, 44); g.addColorStop(0, ['#a8a29e', '#b45309', '#94a3b8'][v]); g.addColorStop(1, ['#44403c', '#451a03', '#334155'][v]);
    x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = '#1c1917'; x.stroke();
    x.fillStyle = 'rgba(0,0,0,.28)'; [[-12, -6, 9], [14, 10, 7], [8, -16, 5], [-14, 16, 6]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
    x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(-16, -18, 7, 0, 7); x.fill();
    return c;
  });
  const stars = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, tw: Math.random() * 6 }));

  /* ------------------------------ Masukan ------------------------------ */
  const keysDown = {}; const padPrev = [{}, {}];
  addEventListener('keydown', (e) => {
    if (QC.isBusy() || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keysDown[e.code] = true;
    if (!e.repeat && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) startKey();
  }, true);
  addEventListener('keyup', (e) => { keysDown[e.code] = false; });
  addEventListener('blur', () => { for (const k in keysDown) keysDown[k] = false; });

  /* Analog di layar (Smart TV / IFP layar sentuh) — multi-sentuh, 1 analog per pemain */
  const joy = [0, 1].map((i) => {
    const el = $('joy' + i); const base = el.querySelector('.joy-base'); const knob = el.querySelector('.joy-knob');
    const j = { x: 0, y: 0, id: null, el };
    const arrows = { u: el.querySelector('.u'), d: el.querySelector('.d'), l: el.querySelector('.l'), r: el.querySelector('.r') };
    const show = (dx, dy, rad) => {
      knob.style.transform = `translate(${dx * rad}px, ${dy * rad}px)`;
      arrows.u.classList.toggle('on', dy < -0.35); arrows.d.classList.toggle('on', dy > 0.35); arrows.l.classList.toggle('on', dx < -0.35); arrows.r.classList.toggle('on', dx > 0.35);
    };
    const upd = (e) => {
      const r = base.getBoundingClientRect(); const rad = r.width * 0.32;
      let dx = (e.clientX - (r.left + r.width / 2)) / rad; let dy = (e.clientY - (r.top + r.height / 2)) / rad;
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      if (m < 0.12) { j.x = 0; j.y = 0; } else { j.x = dx; j.y = dy; }
      show(dx, dy, rad);
    };
    const end = (e) => { if (j.id !== e.pointerId) return; j.id = null; j.x = 0; j.y = 0; el.classList.remove('on'); show(0, 0, 0); };
    base.addEventListener('pointerdown', (e) => { e.preventDefault(); if (j.id !== null) return; j.id = e.pointerId; try { base.setPointerCapture(e.pointerId); } catch (_) {} el.classList.add('on'); upd(e); });
    base.addEventListener('pointermove', (e) => { if (j.id === e.pointerId) upd(e); });
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end); base.addEventListener('lostpointercapture', end);
    base.addEventListener('contextmenu', (e) => e.preventDefault());
    return j;
  });
  function updJoyVis() {
    const on = S.pad !== 'off' && P.length > 0;
    $('joy0').hidden = !on; $('joy1').hidden = !on || solo;
  }

  const pointers = new Map();
  const setTouch = (s, cx, cy) => { ships[s].touch = { x: clamp(cx / W, 0, 1), y: clamp(cy / H, 0, 1) }; };
  cv.addEventListener('pointerdown', (e) => {
    if (S.pad !== 'off') return; // analog tampil -> sentuhan di peta tidak menggerakkan roket (aman disentuh tak sengaja)
    const r = cv.getBoundingClientRect(); const x = e.clientX - r.left; const y = e.clientY - r.top;
    let s = x < W / 2 ? 0 : 1; if (solo) s = 0; if (isBot(s)) return;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    pointers.set(e.pointerId, s); setTouch(s, x, y);
  });
  cv.addEventListener('pointermove', (e) => { if (!pointers.has(e.pointerId)) return; const r = cv.getBoundingClientRect(); setTouch(pointers.get(e.pointerId), e.clientX - r.left, e.clientY - r.top); });
  const endPtr = (e) => { if (!pointers.has(e.pointerId)) return; ships[pointers.get(e.pointerId)].touch = null; pointers.delete(e.pointerId); };
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);

  function gatherInput() {
    for (const s of ships) { s.input.x = 0; s.input.y = 0; }
    const k = keysDown; const add = (inp, l, r, u, d) => { if (l) inp.x -= 1; if (r) inp.x += 1; if (u) inp.y -= 1; if (d) inp.y += 1; };
    if (!isBot(0)) add(ships[0].input, k.KeyA, k.KeyD, k.KeyW, k.KeyS);
    const as = solo ? 0 : 1; if (!isBot(as)) add(ships[as].input, k.ArrowLeft, k.ArrowRight, k.ArrowUp, k.ArrowDown);
    let pads = []; try { pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); } catch (_) {}
    pads.slice(0, 2).forEach((g, gi) => {
      const i = solo ? 0 : gi; const b = (n) => !!(g.buttons[n] && g.buttons[n].pressed);
      if (!isBot(i)) {
        const inp = ships[i].input; let ax = g.axes[0] || 0; let ay = g.axes[1] || 0; if (Math.hypot(ax, ay) < 0.2) { ax = 0; ay = 0; }
        if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1; inp.x += ax; inp.y += ay;
      }
      const btn = [0, 1, 2, 3, 9].some(b); if (btn && !padPrev[gi].btn) startKey(); padPrev[gi] = { btn };
    });
    joy.forEach((j, ji) => { const i = solo ? 0 : ji; if (!isBot(i) && (j.x || j.y)) { ships[i].input.x += j.x; ships[i].input.y += j.y; } });
    ships.forEach((s) => {
      if (!s.touch || isBot(s.i)) return;
      const dx = (s.touch.x - s.x) * W; const dy = (s.touch.y - s.y) * H; const d = Math.hypot(dx, dy);
      if (d > R * 0.3) { s.input.x += dx / Math.max(d, R * 2.2); s.input.y += dy / Math.max(d, R * 2.2); }
    });
    for (const s of ships) { const m = Math.hypot(s.input.x, s.input.y); if (m > 1) { s.input.x /= m; s.input.y /= m; } }
  }

  /* ------------------------------ Robot ------------------------------ */
  function botReset(i) { const c = BOT[S.bot] || BOT.normal; ships[i].bot = { reactAt: time + rnd(...c.react), target: null }; ships[i].bad = new Set(); }
  function botThink(i) {
    const s = ships[i]; const c = BOT[S.bot] || BOT.normal; const bt = s.bot || (s.bot = { reactAt: time + 2, target: null });
    if (!bt.home || time > bt.homeT) { bt.home = { x: rnd(0.15, 0.85), y: rnd(0.55, 0.85) }; bt.homeT = time + rnd(2, 4); }
    let tx = bt.home.x; let ty = bt.home.y;
    if (phase === 'fly' && !bt.target && time >= bt.reactAt) {
      const cand = boxes.filter((b) => !s.bad.has(b.label)); const right = cand.find((b) => b.key === q.correct);
      const wrongs = cand.filter((b) => b !== right);
      bt.target = (Math.random() < c.acc || !wrongs.length) ? right : wrongs[(Math.random() * wrongs.length) | 0];
    }
    if (phase === 'fly' && bt.target) { tx = bt.target.x; ty = bt.target.y + 0.02; }
    else if (items.length) { const it = items.reduce((a, b) => (Math.hypot(a.x - s.x, a.y - s.y) < Math.hypot(b.x - s.x, b.y - s.y) ? a : b)); if (it.y > topY) { tx = it.x; ty = it.y; } }
    let dx = (tx - s.x) * W; let dy = (ty - s.y) * H;
    for (const m of meteors) { const mx = (m.x - s.x) * W; const my = (m.y - s.y) * H; if (my < R && my > -U * 0.45 && Math.abs(mx) < R * 2 + m.r * U) dx += (mx > 0 ? -1 : 1) * U * 0.7; }
    for (const p of projectiles) { if (p.to !== i) continue; const pxl = p.x - px(s.x); const pyl = p.y - py(s.y); const d = Math.hypot(pxl, pyl); if (d < U * 0.35) { dx += (-pyl / d) * U * 0.9; dy += (pxl / d) * U * 0.9; } } // menghindar rudal
    const d = Math.hypot(dx, dy); s.input.x = d > 3 ? dx / Math.max(d, R * 2) : 0; s.input.y = d > 3 ? dy / Math.max(d, R * 2) : 0;
    const m = Math.hypot(s.input.x, s.input.y); if (m > 1) { s.input.x /= m; s.input.y /= m; }
  }

  /* ------------------------------ Efek ------------------------------ */
  function spark(x, y, color, n = 18, speed = 1, size = 1) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; const v = U * rnd(0.3, 1.1) * speed; particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 0.9), max: 0.9, c: color, s: U * 0.012 * size * rnd(0.6, 1.4), t: 'spark' }); } }
  function ring(x, y, color, size = 1) { particles.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, c: color, s: U * 0.25 * size, t: 'ring' }); }
  function explode(x, y, size = 1, color = '#fb923c') {
    ring(x, y, '#fff7cc', size); spark(x, y, color, 22, 1.1 * size, 1.2); spark(x, y, '#fde047', 12, 0.8 * size);
    for (let i = 0; i < 8; i++) particles.push({ x: x + rnd(-1, 1) * R, y: y + rnd(-1, 1) * R, vx: rnd(-1, 1) * U * 0.15, vy: rnd(-1, 0.2) * U * 0.15, life: rnd(0.6, 1.1), max: 1.1, c: 'rgba(148,163,184,', s: U * rnd(0.03, 0.06) * size, t: 'smoke' });
  }
  function say(i, text, color = '#fff') { const s = ships[i]; texts.push({ x: px(s.x), y: py(s.y) - R * 1.8, text, color, life: 1.3, max: 1.3 }); }
  function sayBig(text, color = '#fff', y = 0.6) { texts.push({ x: W / 2, y: H * y, text, color, life: 1.8, max: 1.8, big: true }); }

  /* ------------------------------ Item (langsung aktif) ------------------------------ */
  function pickItem(i, it) {
    const me = ships[i]; const op = ships[1 - i]; const info = ITEMS[it]; const sx = px(me.x); const sy = py(me.y);
    QC.sfx.coin(); spark(sx, sy, info.color, 16);
    if (it === 'shield') { me.fx.shield = time + 9; QC.sfx.magic(); say(i, '🛡️ PERISAI AKTIF!', info.color); ring(sx, sy, info.color, 0.7); return; }
    if (it === 'turbo') { me.fx.turbo = time + 4.5; QC.sfx.whoosh(); say(i, '⚡ TURBO!', info.color); return; }
    if (it === 'rain') {
      for (let k = 0; k < 7; k++) op.rain = (op.rain || []).concat(time + 0.4 + k * 0.3);
      QC.sfx.boom(); say(i, '☄️ Hujan meteor dikirim!', info.color); say(1 - i, '☄️ AWAS HUJAN METEOR!', info.color); return;
    }
    const tx = px(op.x); const ty = py(op.y);
    if (it === 'missile') {
      const a = -Math.PI / 2 + (tx > sx ? 0.5 : -0.5); const sp = U * 0.95 * (S.speed || 1);
      projectiles.push({ type: it, from: i, to: 1 - i, x: sx, y: sy - R, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sp, life: 4.5, age: 0 });
      QC.sfx.whoosh(); say(i, '🚀 RUDAL DILUNCURKAN!', info.color); say(1 - i, '⚠️ RUDAL MENGEJAR — HINDARI!', '#fca5a5');
      return;
    }
    const a = Math.atan2(ty - sy, tx - sx); const sp = U * 1.05;
    projectiles.push({ type: it, from: i, to: 1 - i, x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sp, life: 2.6, age: 0 });
    QC.sfx.whoosh(); say(i, `${info.icon} ${info.name}!`, info.color);
  }
  function applyHit(j, type) {
    const s = ships[j]; const f = s.fx; const x = px(s.x); const y = py(s.y);
    if (time < f.shield) { f.shield = 0; ring(x, y, '#22d3ee', 0.9); spark(x, y, '#a5f3fc', 24); say(j, '🛡️ Serangan ditahan!', '#22d3ee'); QC.sfx.pop(); f.inv = time + 0.8; return; }
    if (type === 'missile' || type === 'meteor') {
      const dur = type === 'missile' ? 1.9 : 1.1;
      f.stun = Math.max(f.stun, time + dur); f.inv = time + dur + 0.6; s.vy = U * 1.3; s.vx = rnd(-1, 1) * U * 0.6; s.shake = 0.5;
      explode(x, y, type === 'missile' ? 1.4 : 0.9); QC.sfx[type === 'missile' ? 'boom' : 'hit']();
      say(j, type === 'missile' ? '💥 KENA RUDAL!' : '💥 Tertabrak meteor!', '#fdba74');
      if (s.bot) s.bot.target = null, s.bot.reactAt = Math.max(s.bot.reactAt, time + dur);
    } else if (type === 'freeze') { f.freeze = time + 2.6; f.inv = time + 2.8; spark(x, y, '#a5f3fc', 30, 0.9); ring(x, y, '#67e8f9', 0.8); QC.sfx.hit(); say(j, '❄️ MEMBEKU!', '#67e8f9'); }
    else if (type === 'reverse') { f.rev = time + 5; spark(x, y, '#c084fc', 24); ring(x, y, '#c084fc', 0.8); QC.sfx.magic(); say(j, '🌀 KEMUDI TERBALIK!', '#d8b4fe'); }
  }

  /* ------------------------------ Soal & ronde ------------------------------ */
  function pickOptions() {
    const keys = QC.optionsOf(q); const wrong = QC.shuffle(keys.filter((k) => k !== q.correct)).slice(0, 2);
    return QC.shuffle([q.correct, ...wrong]).map((key, i) => ({ label: LABELS[i], key, text: q['option' + key] }));
  }
  // batas atas peta = tepat di bawah papan soal (roket & kotak tidak tertutup papan)
  function measureTop() {
    if (!H) return; const st = $('qstrip');
    if (st.hidden) { topY = (R * 1.3) / H; return; }
    const ar = $('arena').getBoundingClientRect(); const r = st.getBoundingClientRect();
    topY = clamp((r.bottom - ar.top + R * 1.3) / H, 0.06, 0.4);
  }
  // kotak muncul acak, JAUH dari kedua roket, dan jarak ke jawaban BENAR dibuat seimbang untuk kedua roket
  function layoutBoxes() {
    measureTop();
    const n = opts.length; const { w, h } = boxSize(); const ci = opts.findIndex((o) => o.key === q.correct);
    // kotak jawaban hanya di SETENGAH LAYAR ATAS (di bawah papan soal)
    const yMin = topY + (h / 2) / H + 0.015; const yMax = Math.max(yMin + 0.02, 0.5 - (h / 2) / H);
    const far = Math.min(W, H) * 0.42; // jarak minimal tepi kotak ke roket (dibuat jauh)
    const edgeDist = (p, s) => { const dx = Math.max(0, Math.abs(p.x - s.x) * W - w / 2); const dy = Math.max(0, Math.abs(p.y - s.y) * H - h / 2); return Math.hypot(dx, dy); };
    let best = null; let bestScore = Infinity;
    const xMin = (w / 2 + 8) / W; const xMax = 1 - xMin;
    for (let t = 0; t < 400; t++) {
      // posisi bebas di seluruh peta, kotak tidak saling menumpuk
      const pos = [];
      for (let k = 0; k < n; k++) {
        for (let a = 0; a < 20; a++) {
          const x = rnd(xMin, xMax);
          // kotak di sisi kiri/kanan tidak turun sampai menutupi analog di pojok bawah
          const ym = S.pad !== 'off' && Math.abs(x - 0.5) > 0.2 ? Math.max(yMin + 0.03, Math.min(yMax, 0.6)) : yMax;
          const p = { x, y: rnd(yMin, ym) };
          if (pos.every((o) => Math.abs(o.x - p.x) * W > w + 14 || Math.abs(o.y - p.y) * H > h + 14)) { pos.push(p); break; }
        }
      }
      if (pos.length < n) continue;
      pos.sort((a, b) => a.x - b.x); // A-B-C urut dari kiri
      let md = Infinity; for (const p of pos) for (const s of ships) md = Math.min(md, edgeDist(p, s));
      const c = pos[ci]; const d = ships.map((s) => Math.hypot((c.x - s.x) * W, (c.y - s.y) * H));
      // utamakan: semua kotak jauh dari roket; lalu adil (selisih jarak ke jawaban benar kecil)
      const score = (md < far ? (far - md) * 1000 : 0) + Math.abs(d[0] - d[1]);
      if (score < bestScore) { bestScore = score; best = pos; }
    }
    if (!best) best = (n === 2 ? [0.3, 0.7] : [0.2, 0.5, 0.8]).map((x) => ({ x, y: yMin + 0.05 }));
    boxes = opts.map((o, i) => ({ ...o, x: best[i].x, y: best[i].y, ph: Math.random() * 6, born: time, flash: 0 }));
    boxCacheKey = '';
  }
  function startQuestion() {
    q = QC.nextQuestion();
    if (!q) { QC.toast('⚠️ Bank soal kosong — tambahkan soal di Mode Guru.', 'bad'); phase = 'ready'; showReady(); return; }
    opts = pickOptions(); qNo++; phase = 'read'; readLeft = S.slow || 0; phaseT = 0; boxes = [];
    const st = $('qstrip'); st.hidden = false; st.className = 'qstrip slow';
    $('qsCat').textContent = q.category || `Soal ${qNo}`; $('qsText').textContent = q.question; $('qsAns').hidden = true;
    $('qsOpts').innerHTML = opts.map((o) => `<div class="qs-opt" style="--oc:${LC[o.label]}"><b>${o.label}</b><span>${esc(o.text)}</span></div>`).join('');
    $('qsSlow').hidden = false; $('qsGo').hidden = false; $('msg').hidden = true;
    st.style.animation = 'none'; void st.offsetWidth; st.style.animation = '';
    measureTop(); updRead(); updHud(); QC.sfx.pop();
    bigText = { text: '🐢 SLOW-MOTION • BACA SOAL', t: 1.6, max: 1.6, y: 0.6, c: '#a5f3fc' };
  }
  function updRead() {
    const tot = S.slow || 1; const left = S.slow ? Math.max(0, readLeft) : tot;
    $('qsSlowN').textContent = S.slow ? Math.ceil(left) : '∞';
    $('tbar').style.transform = `scaleX(${clamp(left / tot, 0, 1)})`;
    $('timer').textContent = S.slow ? '🐢 ' + Math.ceil(left) : '🐢'; $('timer').classList.remove('low');
  }
  function beginFly() {
    if (phase !== 'read') return;
    $('qsSlow').hidden = true; $('qsGo').hidden = true; $('qstrip').className = 'qstrip';
    layoutBoxes();
    phase = 'fly'; ansLeft = S.answer; phaseT = 0;
    ships.forEach((s) => { if (isBot(s.i)) botReset(s.i); s.bad = new Set(); });
    QC.sfx.whoosh(); bigText = { text: 'REBUTAN! TABRAK JAWABAN BENAR!', t: 1.5, max: 1.5 };
  }
  function hitBox(i, b) {
    const s = ships[i];
    if (b.key === q.correct) { resolveRound(i); return; }
    b.flash = 0.7; s.bad.add(b.label); explode(b.px, b.py, 0.8, LC[b.label]);
    s.fx.stun = Math.max(s.fx.stun, time + 2); s.fx.inv = time + 2.3; s.vy = U * 1.2; s.vx = (s.x - b.x) * U * 4; s.shake = 0.5;
    QC.sfx.wrong(); say(i, '❌ SALAH! Pingsan 2 detik', '#fca5a5');
    if (S.wrong === 'stunminus' && s.score > 0) { s.score--; updHud(); say(i, '−1 poin', '#f87171'); }
    if (s.bot) { s.bot.target = null; s.bot.reactAt = time + 2.1; }
  }
  function resolveRound(i) {
    if (phase !== 'fly') return;
    phase = 'result'; phaseT = 0; const s = ships[i]; s.score++;
    const b = correctBox(); QC.sfx.correct(); setTimeout(() => QC.sfx.coin(), 200);
    if (b) { explode(b.px, b.py, 1.3, '#22c55e'); spark(b.px, b.py, '#facc15', 30, 1.2, 1.3); ring(b.px, b.py, '#4ade80', 1.3); }
    sayBig(`✅ ${P[i].name} BENAR! +1`, PC[i]);
    const pc = $('pcard' + i); pc.classList.remove('win'); void pc.offsetWidth; pc.classList.add('win');
    const ps = $('pscore' + i); ps.classList.remove('bump'); void ps.offsetWidth; ps.classList.add('bump');
    endRound(true, i);
  }
  function timeoutRound() { if (phase !== 'fly') return; phase = 'result'; phaseT = 0; QC.sfx.wrong(); sayBig('⏰ Waktu habis!', '#fde68a'); endRound(false, -1); }
  function endRound(ok, i) {
    const st = $('qstrip'); st.className = 'qstrip res ' + (ok ? 'ok' : 'to'); // papan mengecil: hanya kunci jawaban
    const c = opts.find((o) => o.key === q.correct); const a = $('qsAns'); a.hidden = false;
    a.innerHTML = `✅ Jawaban: <b>${c.label}. ${esc(c.text)}</b>`; // soal hilang, hanya jawaban yang tampil
    $('timer').textContent = '✔'; $('timer').classList.remove('low'); updHud(); measureTop();
  }
  // setelah ronde: papan soal & kotak hilang, peta bersih, jeda beberapa detik lalu soal berikutnya
  function nextOrEnd() {
    if (ships.some((s) => s.score >= S.target)) { gameOver(); return; }
    phase = 'gap'; gapLeft = S.gap || 4; boxes = []; $('qstrip').hidden = true; measureTop(); updGap();
  }
  function updGap() { $('timer').textContent = '⏳ ' + Math.max(1, Math.ceil(gapLeft)); $('timer').classList.remove('low'); }
  async function gameOver() {
    phase = 'over'; $('qstrip').hidden = true;
    const ranking = ships.map((s) => ({ player: P[s.i], value: s.score })).sort((a, b) => b.value - a.value);
    const tie = ranking[0].value === ranking[1].value;
    const r = await QC.showWinner({ title: tie ? 'SERI!' : `${ranking[0].player.name} JUARA!`, ranking, unit: 'poin', note: `Target ${S.target} poin • ${qNo} soal dimainkan` });
    if (r === 'setup') openSetup(); else resetGame();
  }

  /* ------------------------------ Alur permainan ------------------------------ */
  function showMsg(title, sub, btn, cls = '') {
    const m = $('msg'); m.hidden = false; m.className = 'msg ' + cls; $('msgTitle').textContent = title; $('msgSub').innerHTML = sub || ''; $('msgSub').hidden = !sub; $('msgBtn').hidden = !btn;
    const h = $('msgTitle'); h.style.animation = 'none'; void h.offsetWidth; h.style.animation = '';
  }
  function showReady() {
    const k2 = solo ? '🤖 dikendalikan Robot' : (S.pad !== 'off' ? '🕹️ analog kanan bawah / ' : '') + 'tombol Panah';
    const k1 = (S.pad !== 'off' ? '🕹️ analog kiri bawah / ' : '') + '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>' + (solo ? ' / Panah' : '');
    showMsg('SIAP TERBANG?', `<b style="color:${PC[0]}">${esc(P[0].name)}</b>: ${k1} &nbsp;•&nbsp; <b style="color:${PC[1]}">${esc(P[1].name)}</b>: ${k2}<br>Gamepad & remote TV juga bisa. Item langsung aktif saat diambil!`, true);
  }
  function startKey() { if (QC.isBusy()) return; if (phase === 'ready') beginCount(); else if (phase === 'read') beginFly(); }
  function beginCount() { phase = 'count'; countLeft = 3.8; lastCount = -1; $('msg').hidden = true; QC.sfx.click(); }
  function resetGame() {
    ships = [mkShip(0), mkShip(1)]; boxes = []; meteors = []; items = []; projectiles = []; particles = []; texts = [];
    qNo = 0; time = 0; ts = 1; phase = 'ready'; meteorT = 2; itemT = rnd(3, 5);
    $('qstrip').hidden = true; $('targetNo').textContent = S.target; $('timer').textContent = '––';
    updJoyVis(); updHud(); showReady();
  }
  async function openSetup() {
    phase = 'idle'; $('qstrip').hidden = true; $('msg').hidden = true; $('joy0').hidden = true; $('joy1').hidden = true;
    const r = await QC.setup({
      logo: '🚀', subtitle: 'Duel kuis antariksa di satu peta! Rebut jawaban yang benar lebih dulu, hindari meteor & rudal lawan.',
      min: 1, max: 2, defaultCount: 2, soloLabel: '1 Pemain (vs Robot)', defaultNames: ['Pilot Biru', 'Pilot Merah'],
      settings: [
        { key: 'target', label: '🏁 Target menang', value: 5, options: [[3, '3 poin'], [5, '5 poin'], [7, '7 poin'], [10, '10 poin']] },
        { key: 'slow', label: '🐢 Slow-motion baca soal', value: 10, options: [[5, '5 detik'], [8, '8 detik'], [10, '10 detik'], [15, '15 detik'], [20, '20 detik'], [0, 'Sampai guru tekan Spasi']] },
        { key: 'gap', label: '⏳ Jeda sebelum soal berikutnya', value: 4, options: [[2, '2 detik'], [4, '4 detik'], [6, '6 detik'], [8, '8 detik']] },
        { key: 'answer', label: '⏱️ Waktu menjawab', value: 20, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik']] },
        { key: 'speed', label: '🚀 Kecepatan roket', value: 1, options: [[0.75, 'Pelan'], [1, 'Sedang'], [1.3, 'Cepat']] },
        { key: 'meteor', label: '☄️ Meteor', value: 'normal', options: [['none', 'Tidak ada'], ['few', 'Sedikit'], ['normal', 'Normal'], ['many', 'Banyak']] },
        { key: 'items', label: '🎁 Item', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'wrong', label: '❌ Tabrak jawaban salah', value: 'stun', options: [['stun', 'Pingsan 2 detik'], ['stunminus', 'Pingsan 2 detik + poin −1']] },
        { key: 'bot', label: '🤖 Kemampuan Robot (1 pemain)', value: 'normal', options: [['easy', 'Mudah'], ['normal', 'Sedang'], ['hard', 'Sulit']] },
        { key: 'pad', label: '🕹️ Analog di layar (Smart TV / IFP)', value: 'on', options: [['on', 'Tampil'], ['off', 'Sembunyi (sentuh peta untuk gerak)']] }
      ],
      rulesHtml: RULES
    });
    S = { ...S, ...r.settings };
    P = r.players.slice(0, 2).map((p, i) => ({ ...p, color: PC[i] }));
    solo = P.length === 1;
    if (solo) P.push({ id: 1, name: 'Robot ARX', avatar: '🤖', color: PC[1], bot: true });
    [0, 1].forEach((i) => { $('pname' + i).textContent = P[i].name; $('pav' + i).textContent = P[i].avatar; });
    const pad = S.pad !== 'off' ? '🕹️ / ' : '';
    $('pkeys0').textContent = pad + (solo ? 'WASD / Panah / stik' : 'W A S D / stik 1');
    $('pkeys1').textContent = solo ? '🤖 Robot ' + ({ easy: 'mudah', normal: 'sedang', hard: 'sulit' }[S.bot] || '') : pad + 'Panah / stik 2';
    resetGame();
  }
  $('msgBtn').onclick = () => startKey();
  $('qsGo').onclick = () => beginFly();
  $('btnSetup').onclick = () => openSetup();
  $('btnRules').onclick = () => QC.modal({ icon: '📜', title: 'Peraturan Game', html: `<div style="text-align:left">${RULES}</div>` });

  function updHud() {
    ships.forEach((s, i) => {
      $('pscore' + i).textContent = s.score;
      let h = ''; for (let k = 0; k < S.target; k++) h += `<i class="${k < s.score ? 'on' : ''}"></i>`; $('pips' + i).innerHTML = h;
      const st = $('pitem' + i); const f = s.fx; const act = [];
      if (time < f.shield) act.push('🛡️'); if (time < f.turbo) act.push('⚡'); if (time < f.rev) act.push('🌀'); if (time < f.freeze) act.push('❄️'); if (time < f.stun) act.push('💫');
      const txt = act.join('') || '—'; if (st.dataset.v !== txt) { st.dataset.v = txt; st.innerHTML = `<span>${txt}</span>`; st.classList.toggle('full', act.length > 0); st.title = 'Efek aktif'; }
    });
    $('qNo').textContent = qNo; $('targetNo').textContent = S.target;
  }

  /* ------------------------------ Simulasi ------------------------------ */
  function updShip(s, dt) {
    const f = s.fx; let ix = s.input.x; let iy = s.input.y;
    const can = time > f.stun && time > f.freeze && phase !== 'over';
    if (time < f.rev) { ix = -ix; iy = -iy; }
    const vmax = U * 0.85 * (S.speed || 1) * (time < f.turbo ? 1.7 : 1);
    const k = Math.min(1, dt * (can ? 9 : 2.5));
    s.vx += ((can ? ix * vmax : 0) - s.vx) * k; s.vy += ((can ? iy * vmax : 0) - s.vy) * k;
    s.x = clamp(s.x + (s.vx * dt) / W, R / W, 1 - R / W); s.y = clamp(s.y + (s.vy * dt) / H, Math.min(topY, (R * 1.3) / H), 0.95);
    if (s.y < topY) s.y += (topY - s.y) * Math.min(1, (dt / Math.max(ts, 0.05)) * 6); // papan soal muncul -> roket terdorong halus ke bawah papan
    s.ang += ((s.vx / vmax) * 0.4 - s.ang) * Math.min(1, dt * 7);
    if (time < f.stun) f.spin += dt * 13; else f.spin *= Math.max(0, 1 - dt * 8);
    s.shake = Math.max(0, s.shake - dt);
    if (Math.random() < 0.9) { const boost = time < f.turbo ? 1.8 : 1; particles.push({ x: px(s.x) + rnd(-0.25, 0.25) * R, y: py(s.y) + R * 1.1, vx: rnd(-0.1, 0.1) * U, vy: U * rnd(0.35, 0.6) * boost, life: 0.35, max: 0.35, c: time < f.turbo ? '#fde047' : '#fb923c', s: R * 0.22 * boost, t: 'fire' }); }
  }
  function shipCollision() {
    const a = ships[0]; const b = ships[1]; if (phase === 'over' || phase === 'count') return;
    const dx = (b.x - a.x) * W; const dy = (b.y - a.y) * H; const d = Math.hypot(dx, dy) || 1;
    if (d >= R * 1.55) return;
    const nx = dx / d; const ny = dy / d; const push = (R * 1.55 - d) / 2;
    a.x -= (nx * push) / W; a.y -= (ny * push) / H; b.x += (nx * push) / W; b.y += (ny * push) / H;
    if (time < a.fx.bump || time < b.fx.bump) return;
    a.fx.bump = b.fx.bump = time + 1.6;
    const mx = (px(a.x) + px(b.x)) / 2; const my = (py(a.y) + py(b.y)) / 2;
    explode(mx, my, 0.8, '#e2e8f0'); spark(mx, my, '#facc15', 18); QC.sfx.hit();
    [[a, -1], [b, 1]].forEach(([s, sg]) => {
      if (time < s.fx.shield) { s.fx.shield = 0; ring(px(s.x), py(s.y), '#22d3ee', 0.8); say(s.i, '🛡️ Perisai melindungi!', '#22d3ee'); }
      else { s.fx.stun = Math.max(s.fx.stun, time + 1.3); s.shake = 0.4; if (s.bot) { s.bot.target = null; s.bot.reactAt = Math.max(s.bot.reactAt, time + 1.3); } }
      s.vx = sg * nx * U * 1.3; s.vy = sg * ny * U * 1.3;
    });
    sayBig('💥 TABRAKAN! Pingsan!', '#fde68a', 0.66);
  }
  function step(rdt) {
    if (phase === 'idle') return;
    // rdt = waktu nyata; dt = waktu dunia (diperlambat saat slow-motion baca soal)
    ts += ((phase === 'read' ? SLOW : 1) - ts) * Math.min(1, rdt * 5);
    const dt = rdt * ts;
    if (phase === 'read' && S.slow) { readLeft -= rdt; updRead(); if (readLeft <= 0) beginFly(); }
    time += dt;
    if (phase === 'count') {
      countLeft -= rdt; const n = Math.ceil(countLeft - 0.8);
      if (n !== lastCount) { lastCount = n; if (n > 0) { showMsg(String(n), '', false, 'count'); QC.sfx.tick(); } else if (n === 0) { showMsg('TERBANG!', '', false, 'count'); QC.sfx.magic(); } }
      if (countLeft <= 0) { $('msg').hidden = true; startQuestion(); return; }
    }
    ships.forEach((s) => { if (isBot(s.i)) botThink(s.i); updShip(s, dt); });
    shipCollision();

    if (phase === 'fly') {
      ansLeft -= rdt; const t = $('timer'); t.textContent = Math.max(0, Math.ceil(ansLeft)); t.classList.toggle('low', ansLeft <= 5);
      $('tbar').style.transform = `scaleX(${clamp(ansLeft / S.answer, 0, 1)})`;
      if (ansLeft <= 0) timeoutRound();
    }
    if (live()) { // meteor & item terus muncul (permainan tidak berhenti)
      if (S.meteor !== 'none') {
        meteorT -= dt;
        if (meteorT <= 0) { meteorT = ({ few: 2.2, normal: 1.15, many: 0.65 }[S.meteor] || 1.2) * rnd(0.7, 1.3); meteors.push({ x: rnd(0.04, 0.96), y: -0.08, vx: rnd(-0.04, 0.04), vy: rnd(0.15, 0.27), r: rnd(0.035, 0.065), rot: Math.random() * 6, vr: rnd(-2.5, 2.5), spr: (Math.random() * 3) | 0 }); }
      }
      if (S.items === 'on') {
        itemT -= dt;
        if (itemT <= 0) { // item muncul berpasangan & simetris (adil untuk kedua pemain)
          itemT = rnd(4.5, 7);
          const type = ITEM_BAG[(Math.random() * ITEM_BAG.length) | 0]; const x = rnd(0.08, 0.4); const ph = Math.random() * 6;
          items.push({ type, x, y: -0.05, vy: 0.08, ph }, { type, x: 1 - x, y: -0.05, vy: 0.08, ph: ph + Math.PI });
        }
      }
    }
    if (phase === 'result') { phaseT += rdt; if (phaseT > RESULT_T) nextOrEnd(); }
    else if (phase === 'gap') { gapLeft -= rdt; updGap(); if (gapLeft <= 0) startQuestion(); }

    // hujan meteor kiriman lawan
    ships.forEach((s) => { if (!s.rain) return; s.rain = s.rain.filter((t) => { if (live() && time >= t) { meteors.push({ x: clamp(s.x + rnd(-0.12, 0.12), 0.04, 0.96), y: -0.08, vx: rnd(-0.03, 0.03), vy: rnd(0.34, 0.46), r: rnd(0.04, 0.06), rot: 0, vr: rnd(-3, 3), spr: 1, hot: true }); return false; } return live(); }); });

    for (const m of meteors) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.vr * dt; const mx = px(m.x); const my = py(m.y); const mr = m.r * U;
      if (live()) for (const s of ships) { if (!m.dead && time > s.fx.inv && Math.hypot(mx - px(s.x), my - py(s.y)) < R * 0.75 + mr * 0.85) { m.dead = true; explode(mx, my, 0.7, '#f97316'); applyHit(s.i, 'meteor'); } }
    }
    meteors = meteors.filter((m) => !m.dead && m.y < 1.15);
    for (const it of items) {
      it.y += it.vy * dt; const ix = px(it.x + Math.sin(time * 1.6 + it.ph) * 0.02); const iy = py(it.y);
      if (live()) for (const s of (flip ? [ships[1], ships[0]] : ships)) { if (!it.dead && time > s.fx.stun && Math.hypot(ix - px(s.x), iy - py(s.y)) < R + U * 0.05) { it.dead = true; pickItem(s.i, it.type); } }
    }
    items = items.filter((it) => !it.dead && it.y < 1.1);

    flip = !flip;
    if (phase === 'fly') {
      const { w, h } = boxSize();
      for (const s of (flip ? [ships[1], ships[0]] : ships)) {
        if (time < s.fx.stun || time < s.fx.freeze) continue;
        const sx = px(s.x); const sy = py(s.y);
        for (const b of boxes) {
          if (b.px === undefined || time - b.born < 0.35 || b.flash > 0) continue;
          const nx = clamp(sx, b.px - w / 2, b.px + w / 2); const ny = clamp(sy, b.py - h / 2, b.py + h / 2);
          if (Math.hypot(nx - sx, ny - sy) < R * 0.85) { hitBox(s.i, b); break; }
        }
        if (phase !== 'fly') break;
      }
    }
    for (const b of boxes) b.flash = Math.max(0, b.flash - dt);

    // proyektil: rudal pelacak (belok terbatas -> bisa dihindari) & bola energi lurus
    warnBeep -= rdt;
    for (const p of projectiles) {
      p.life -= dt; p.age += dt; const tg = ships[p.to]; const tx = px(tg.x); const ty = py(tg.y);
      if (p.type === 'missile') {
        if (p.age > 0.35) {
          const want = Math.atan2(ty - p.y, tx - p.x); let cur = Math.atan2(p.vy, p.vx); let d = want - cur;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          cur += clamp(d, -2.3 * dt, 2.3 * dt); p.vx = Math.cos(cur) * p.sp; p.vy = Math.sin(cur) * p.sp;
        }
        particles.push({ x: p.x, y: p.y, vx: rnd(-0.05, 0.05) * U, vy: rnd(-0.05, 0.05) * U, life: 0.5, max: 0.5, c: 'rgba(203,213,225,', s: U * 0.02, t: 'smoke' });
        if (warnBeep <= 0) { warnBeep = 0.45; QC.sfx.tick(); }
        for (const m of meteors) { if (!m.dead && Math.hypot(px(m.x) - p.x, py(m.y) - p.y) < m.r * U + U * 0.02) { m.dead = true; p.dead = true; explode(p.x, p.y, 0.8); QC.sfx.hit(); } }
      } else particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, max: 0.3, c: ITEMS[p.type].color, s: U * 0.018, t: 'spark' });
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.dead && Math.hypot(p.x - tx, p.y - ty) < R * 1.05) { p.dead = true; if (time > tg.fx.inv || p.type === 'reverse') applyHit(p.to, p.type); else spark(p.x, p.y, '#fff', 10); }
      if (!p.dead && (p.life <= 0 || p.y < -80 || p.y > H + 80 || p.x < -80 || p.x > W + 80)) { p.dead = true; spark(p.x, p.y, ITEMS[p.type].color, 12, 0.6); if (p.type === 'missile') { ring(p.x, p.y, '#fb923c', 0.5); say(p.to, '😎 Rudal berhasil dihindari!', '#86efac'); } }
    }
    projectiles = projectiles.filter((p) => !p.dead);
    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t === 'spark') { p.vx *= 0.95; p.vy *= 0.95; } }
    particles = particles.filter((p) => p.life > 0); if (particles.length > 900) particles.splice(0, particles.length - 900);
    for (const t of texts) { t.life -= rdt; t.y -= (t.big ? 18 : 40) * rdt; }
    texts = texts.filter((t) => t.life > 0);
    if (bigText) { bigText.t -= rdt; if (bigText.t <= 0) bigText = null; }
    hudT -= rdt; if (hudT <= 0) { hudT = 0.2; updHud(); measureTop(); }
  }
  let hudT = 0;

  /* ------------------------------ Gambar ------------------------------ */
  function rr(x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function boxSize() { const f = clamp(U * 0.033, 11, 20); return { w: clamp(W * 0.18, 120, 260), h: Math.max(f * 2.6, H * 0.075), f }; }
  function wrap(text, maxW) { const words = String(text).split(/\s+/); const lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
  let boxText = {};
  function boxLines(b, w, h, f) {
    const key = `${qNo}|${W}|${H}`; if (boxCacheKey !== key) { boxCacheKey = key; boxText = {}; }
    if (!boxText[b.label]) {
      let fs = f; let lines; const maxW = w - h * 0.62 - 18;
      for (let i = 0; i < 6; i++) { ctx.font = `800 ${fs}px "Plus Jakarta Sans", sans-serif`; lines = wrap(b.text, maxW); if (lines.length * fs * 1.15 <= h - 10) break; fs *= 0.86; }
      boxText[b.label] = { lines, fs };
    }
    return boxText[b.label];
  }
  function drawBox(b) {
    const { w, h, f } = boxSize();
    const bx = px(b.x + Math.sin(time * 0.9 + b.ph) * 0.008); const by = py(b.y + Math.cos(time * 1.2 + b.ph) * 0.01); b.px = bx; b.py = by;
    const age = time - b.born; const sc = age < 0.35 ? 0.4 + 0.6 * (1 - Math.pow(1 - age / 0.35, 3)) : 1;
    const res = phase === 'result' || phase === 'over'; const correct = b.key === q.correct;
    if (res && !correct) return; // jawaban salah langsung hilang, tinggal jawaban benar
    const fade = phase === 'result' ? clamp((RESULT_T - phaseT) / 0.8, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = (res && !correct ? 0.25 : 1) * fade; ctx.translate(bx + (b.flash > 0 ? rnd(-1, 1) * 6 : 0), by); ctx.scale(sc, sc);
    const col = res && correct ? '#22c55e' : b.flash > 0 ? '#ef4444' : LC[b.label];
    ctx.shadowColor = col; ctx.shadowBlur = (res && correct ? 34 : 16) * (0.75 + 0.25 * Math.sin(time * 4 + b.ph));
    rr(-w / 2, -h / 2, w, h, 14); ctx.fillStyle = b.flash > 0 ? 'rgba(80,10,20,.95)' : 'rgba(9,14,44,.94)'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = res && correct ? 5 : 3; ctx.strokeStyle = col; ctx.stroke();
    rr(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.34, 10); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
    const br = Math.min(h * 0.3, f * 1.15); const bxl = -w / 2 + br + 10;
    ctx.beginPath(); ctx.arc(bxl, 0, br, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${br * 1.05}px Orbitron, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.label, bxl, br * 0.06);
    const t = boxLines(b, w, h, f); ctx.font = `800 ${t.fs}px "Plus Jakarta Sans", sans-serif`; ctx.fillStyle = '#f8fafc'; ctx.textAlign = 'left';
    const lh = t.fs * 1.15; const y0 = -((t.lines.length - 1) * lh) / 2; t.lines.forEach((ln, i) => ctx.fillText(ln, bxl + br + 10, y0 + i * lh));
    if (b.flash > 0) { ctx.font = `${h * 0.5}px serif`; ctx.textAlign = 'center'; ctx.fillText('❌', w / 2 - h * 0.1, -h / 2); }
    if (res && correct) { ctx.font = `${h * 0.42}px serif`; ctx.textAlign = 'center'; ctx.fillText('✅', w / 2 - h * 0.05, -h / 2); }
    ctx.restore();
  }
  function drawRocket(x, y, r, color, ang, flame) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const s = r / 26; ctx.scale(s, s);
    const fl = 14 + flame * 16 + Math.random() * 7;
    let g = ctx.createLinearGradient(0, 16, 0, 16 + fl); g.addColorStop(0, '#fff7cc'); g.addColorStop(0.35, '#fbbf24'); g.addColorStop(0.75, '#f97316'); g.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, 16); ctx.quadraticCurveTo(0, 16 + fl * 1.25, 9, 16); ctx.closePath(); ctx.fill();
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.2; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-23, 20); ctx.lineTo(-9, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(23, 20); ctx.lineTo(9, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
    const body = () => { ctx.beginPath(); ctx.moveTo(0, -32); ctx.bezierCurveTo(15, -18, 14, 4, 10, 18); ctx.lineTo(-10, 18); ctx.bezierCurveTo(-14, 4, -15, -18, 0, -32); ctx.closePath(); };
    g = ctx.createLinearGradient(-13, 0, 13, 0); g.addColorStop(0, '#94a3b8'); g.addColorStop(0.42, '#ffffff'); g.addColorStop(1, '#64748b');
    body(); ctx.fillStyle = g; ctx.fill(); ctx.save(); body(); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(-16, -34, 32, 13); ctx.fillRect(-16, 11, 32, 8); ctx.restore(); body(); ctx.stroke();
    g = ctx.createRadialGradient(-2, -7, 1, 0, -5, 7); g.addColorStop(0, '#e0f2fe'); g.addColorStop(0.5, '#0ea5e9'); g.addColorStop(1, '#0c1d3d');
    ctx.beginPath(); ctx.arc(0, -5, 6.5, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function drawShip(s) {
    const f = s.fx; const x = px(s.x) + (s.shake > 0 ? rnd(-1, 1) * s.shake * 10 : 0); const y = py(s.y); const col = PC[s.i];
    const blink = time < f.inv && time > f.stun && time > f.freeze && Math.floor(time * 12) % 2 === 0;
    // cincin warna pemain di bawah roket (biar mudah dikenali di peta bersama)
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + R * 0.95, R * 0.9, R * 0.28, 0, 0, 7); ctx.stroke(); ctx.restore();
    if (time < f.shield) {
      const a = 0.35 + 0.15 * Math.sin(time * 6); const rad = R * 1.65;
      const g = ctx.createRadialGradient(x, y, rad * 0.6, x, y, rad); g.addColorStop(0, 'rgba(34,211,238,0)'); g.addColorStop(1, `rgba(34,211,238,${a + 0.25})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(165,243,252,${a + 0.3})`; ctx.lineWidth = 2; ctx.stroke();
    }
    if (time < f.turbo) { ctx.strokeStyle = 'rgba(250,204,21,.6)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const lx = x + (k - 1.5) * R * 0.5; const ly = y + R * (1.4 + Math.random() * 0.6); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + R * 1.5); ctx.stroke(); } }
    if (!blink) drawRocket(x, y, R, col, s.ang + (time < f.stun ? Math.sin(f.spin) * 0.9 + f.spin * 0.15 : 0), time < f.turbo ? 1.6 : 0.6 + Math.hypot(s.vx, s.vy) / (U * 1.4));
    if (time < f.freeze) {
      ctx.save(); ctx.globalAlpha = 0.55 + 0.1 * Math.sin(time * 8); rr(x - R * 1.15, y - R * 1.5, R * 2.3, R * 2.6, R * 0.35); ctx.fillStyle = '#a5f3fc'; ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ecfeff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - R * 0.7, y - R * 1.2); ctx.lineTo(x - R * 0.2, y - R * 0.5); ctx.moveTo(x + R * 0.4, y - R * 1.1); ctx.lineTo(x + R * 0.8, y - R * 0.6); ctx.stroke(); ctx.restore();
    }
    if (time < f.stun) { ctx.font = `${R * 0.6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let k = 0; k < 3; k++) { const a = time * 5 + (k * Math.PI * 2) / 3; ctx.fillText('⭐', x + Math.cos(a) * R * 0.9, y - R * 1.5 + Math.sin(a) * R * 0.3); } }
    if (time < f.rev) { ctx.save(); ctx.translate(x, y); ctx.rotate(-time * 4); ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3; ctx.setLineDash([R * 0.4, R * 0.25]); ctx.beginPath(); ctx.arc(0, 0, R * 1.4, 0, 7); ctx.stroke(); ctx.restore(); ctx.font = `${R * 0.6}px serif`; ctx.textAlign = 'center'; ctx.fillText('🔄', x + R * 1.3, y - R * 1.2); }
    // tanda bahaya rudal
    if (projectiles.some((p) => p.type === 'missile' && p.to === s.i)) {
      ctx.save(); ctx.strokeStyle = `rgba(239,68,68,${0.5 + 0.5 * Math.sin(time * 16)})`; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(x, y, R * 1.9, 0, 7); ctx.stroke(); ctx.restore();
      ctx.font = `${R * 0.7}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚠️', x - R * 1.5, y - R * 1.3);
    }
  }
  function drawName(s) {
    if (!P[s.i]) return; const x = px(s.x); const y = py(s.y) - R * 2.15; const fs = clamp(R * 0.42, 10, 15);
    ctx.font = `800 ${fs}px "Plus Jakarta Sans", sans-serif`; const tw = ctx.measureText(P[s.i].name).width + 14;
    ctx.globalAlpha = 0.85; rr(x - tw / 2, y - fs * 0.75, tw, fs * 1.5, fs * 0.75); ctx.fillStyle = 'rgba(2,6,23,.75)'; ctx.fill(); ctx.strokeStyle = PC[s.i]; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = PC[s.i]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(P[s.i].name, x, y + 1);
  }
  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#070b2a'); g.addColorStop(0.6, '#0d1440'); g.addColorStop(1, '#060a20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const n1 = ctx.createRadialGradient(W * 0.18, H * 0.35, 0, W * 0.18, H * 0.35, W * 0.45); n1.addColorStop(0, 'rgba(56,189,248,.16)'); n1.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = n1; ctx.fillRect(0, 0, W, H);
    const n2 = ctx.createRadialGradient(W * 0.82, H * 0.3, 0, W * 0.82, H * 0.3, W * 0.45); n2.addColorStop(0, 'rgba(244,63,94,.16)'); n2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = n2; ctx.fillRect(0, 0, W, H);
    const n3 = ctx.createRadialGradient(W * 0.5, H * 0.1, 0, W * 0.5, H * 0.1, W * 0.35); n3.addColorStop(0, 'rgba(168,85,247,.12)'); n3.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = n3; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      const yy = ((s.y + time * 0.08 * s.z) % 1) * H; const a = 0.35 + 0.5 * Math.abs(Math.sin(s.tw + time * 1.5)) * s.z;
      ctx.fillStyle = `rgba(255,255,255,${a})`; const sz = s.z * 2.1; ctx.fillRect(s.x * W, yy, sz, sz * (1 + s.z * 2.5 * ts));
    }
  }
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    drawBackground();
    for (const it of items) {
      const ix = px(it.x + Math.sin(time * 1.6 + it.ph) * 0.02); const iy = py(it.y); const ir = U * 0.05; const info = ITEMS[it.type];
      ctx.save(); ctx.shadowColor = info.color; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 7);
      const ig = ctx.createRadialGradient(ix - ir * 0.3, iy - ir * 0.3, 1, ix, iy, ir); ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.35, info.color); ig.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = ig; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.font = `${ir * 1.05}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(info.icon, ix, iy + 1);
      ctx.strokeStyle = info.color; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 5 + it.ph); ctx.beginPath(); ctx.arc(ix, iy, ir * 1.35, 0, 7); ctx.stroke(); ctx.restore();
    }
    for (const m of meteors) {
      const mx = px(m.x); const my = py(m.y); const mr = m.r * U;
      const tg = ctx.createLinearGradient(mx, my, mx - m.vx * W * 0.9, my - m.vy * H * 0.9); tg.addColorStop(0, m.hot ? 'rgba(251,146,60,.75)' : 'rgba(251,191,36,.45)'); tg.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.strokeStyle = tg; ctx.lineWidth = mr * 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - m.vx * W * 0.9, my - m.vy * H * 0.9); ctx.stroke();
      ctx.save(); ctx.translate(mx, my); ctx.rotate(m.rot); ctx.drawImage(METEOR_SPR[m.spr], -mr * 1.2, -mr * 1.2, mr * 2.4, mr * 2.4); ctx.restore();
    }
    if (q && (phase === 'fly' || phase === 'result')) boxes.forEach(drawBox);
    if (P.length) ships.forEach(drawShip);
    for (const p of projectiles) {
      const info = ITEMS[p.type];
      if (p.type === 'missile') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); const s = U * 0.05;
        ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(-s * 1.1, -s * 0.3); ctx.lineTo(-s * 1.9 - Math.random() * s * 0.6, 0); ctx.lineTo(-s * 1.1, s * 0.3); ctx.fill();
        ctx.fillStyle = '#e2e8f0'; rr(-s * 1.1, -s * 0.32, s * 1.7, s * 0.64, s * 0.2); ctx.fill(); ctx.fillStyle = PC[p.from]; ctx.fillRect(-s * 0.6, -s * 0.32, s * 0.25, s * 0.64);
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.32); ctx.quadraticCurveTo(s * 1.3, 0, s * 0.6, s * 0.32); ctx.fill(); ctx.restore();
      } else {
        const r = U * 0.035 * (1 + 0.15 * Math.sin(time * 20)); ctx.save(); ctx.shadowColor = info.color; ctx.shadowBlur = 24;
        const og = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r); og.addColorStop(0, '#fff'); og.addColorStop(0.5, info.color); og.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = og; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.5, 0, 7); ctx.fill(); ctx.font = `${r * 1.2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(info.icon, p.x, p.y + 1); ctx.restore();
      }
    }
    for (const p of particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.t === 'ring') { ctx.strokeStyle = p.c; ctx.globalAlpha = a; ctx.lineWidth = 4 * a + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - a) + 4, 0, 7); ctx.stroke(); }
      else if (p.t === 'smoke') { ctx.fillStyle = p.c + (a * 0.45) + ')'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.6 - a), 0, 7); ctx.fill(); }
      else { ctx.fillStyle = p.c; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.s * (p.t === 'fire' ? a : 1)), 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (P.length) ships.forEach(drawName);
    for (const t of texts) {
      const a = clamp((t.life / t.max) * 2, 0, 1); const fs = t.big ? clamp(U * 0.075, 18, 44) : clamp(U * 0.045, 12, 24);
      ctx.globalAlpha = a; ctx.font = `900 ${fs}px "Plus Jakarta Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = fs * 0.18; ctx.strokeStyle = 'rgba(2,6,23,.9)'; ctx.strokeText(t.text, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    if (bigText) {
      const a = clamp((bigText.t / bigText.max) * 2, 0, 1); const fs = clamp(U * 0.08, 20, 54) * (1 + (1 - bigText.t / bigText.max) * 0.15);
      ctx.globalAlpha = a; ctx.font = `900 ${fs}px Orbitron, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const by = H * (bigText.y || 0.67);
      ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#0f172a'; ctx.strokeText(bigText.text, W / 2, by); ctx.fillStyle = bigText.c || '#facc15'; ctx.fillText(bigText.text, W / 2, by); ctx.globalAlpha = 1;
    }
    // efek slow-motion: tepi layar kebiruan
    const sm = clamp((1 - ts) / (1 - SLOW), 0, 1);
    if (sm > 0.02) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(56,189,248,0)'); vg.addColorStop(1, `rgba(56,189,248,${0.28 * sm})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  /* ------------------------------ Loop ------------------------------ */
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden) return;
    try { if (!QC.isBusy() && P.length) { gatherInput(); step(dt); } draw(); } catch (err) { console.error(err); }
  }
  resize(); requestAnimationFrame(loop);
  window.__BR = { get phase() { return phase; }, get q() { return q; }, get ships() { return ships; }, get time() { return time; }, get proj() { return projectiles.length; }, get ts() { return ts; }, get boxes() { return boxes; }, get topY() { return topY; }, start: startKey };
  openSetup();
})();
