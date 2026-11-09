/* ==========================================================================
   PILOT CERDAS — kuis terbang 1 pemain dengan sensor tubuh (kamera)
   - Pandangan ke depan dari belakang pesawat, menembus awan.
   - Soal tampil di atas; gerbang cincin A–D datang dari kejauhan.
     Terbangkan pesawat melewati gerbang jawaban yang BENAR.
   - Sensor: HIDUNG = naik/turun (merunduk = menukik, tegak = naik),
     TANGAN direntangkan seperti SAYAP = belok (miring kanan = belok kanan).
   - Rintangan (awan badai, burung) & jawaban salah MENGURANGI SKOR.
   - Tanpa kamera: panah/WASD, mouse, atau sentuh.
   ========================================================================== */
(function () {
  const QC = window.QuizCore; const FX = QC.fx;
  const $ = (id) => document.getElementById(id);
  const esc = QC.esc;

  /* ------------------------------ Konstanta dunia ------------------------------ */
  const ZF = 40;        // jarak muncul objek
  const ZP = 2.2;       // jarak pesawat dari kamera
  const FOCAL = 2.0;
  const XMAX = 1.0; const YMAX = 0.45;
  const CAM_LIFT = 0.2; // kamera sedikit di atas pesawat → pesawat tampil lebih rendah, gerbang di kejauhan tidak tertutup
  const SPEED = { 0: 3.6, 1: 7, 2: 9, 3: 11.5 };
  const GATE_DELAY = 3.4; // detik setelah soal muncul sebelum gerbang datang
  const gateDelay = () => (S.speed === 0 ? 6 : GATE_DELAY); // mode Sangat Pelan: waktu baca soal lebih lama
  const COL = { A: '#ef4444', B: '#3b82f6', C: '#f59e0b', D: '#10b981' };
  const HS_KEY = 'lokamain_pilot_hiscore';
  const PLANE_COLOR = '#ef4444';

  const cv = $('cv'); const ctx = cv.getContext('2d');
  const mini = $('mini'); const mctx = mini.getContext('2d');
  let W = 0; let H = 0; let DPR = 1;
  function resize() {
    DPR = Math.min(1.25, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize(); addEventListener('resize', resize);

  /* ------------------------------ Status ------------------------------ */
  let S = {}; let player = null; let phase = 'idle';
  let q = null; let keys = []; let asked = 0; let correct = 0; let combo = 0; let bestCombo = 0; let score = 0;
  let segT = 0; let gatesSpawned = false; let schedule = []; let speed = 9; let travel = 0; let timers = [];
  let objs = []; let parts = []; let whiteout = 0; let shakeT = 0; let redFlash = 0;
  const plane = { x: 0, y: 0, bank: 0, bankT: 0, yT: 0 };
  const camv = { x: 0, y: 0 };
  const input = { keys: {}, ptr: null, ptrT: 0 };
  const cam = { want: false, ready: false, loading: false, stream: null, pose: null, busy: false, last: 0, lm: null, lmT: 0, x0: 0.5, y0: 0.4, sw: 0.2, hold: 0 };

  QC.init({ gameId: 'pilot-cerdas', title: 'Pilot Cerdas', avatars: ['🧑‍✈️', '👩‍✈️', '🦅', '🐧', '🦊', '🐼', '🐯', '🐸'], colors: [PLANE_COLOR, '#3b82f6', '#10b981', '#a855f7'] });

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ------------------------------ Sprite awan (digambar sekali) ------------------------------ */
  function makeCloud(dark) {
    const c = document.createElement('canvas'); c.width = 320; c.height = 160; const g = c.getContext('2d');
    const puffs = [[160, 98, 60], [100, 104, 46], [220, 104, 48], [130, 74, 44], [196, 70, 50], [60, 116, 30], [262, 118, 30], [160, 60, 38]];
    puffs.forEach(([x, y, r]) => {
      const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
      if (dark) { gr.addColorStop(0, '#9aa6b8'); gr.addColorStop(0.6, '#5b6577'); gr.addColorStop(1, 'rgba(60,66,82,0)'); }
      else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.65, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
    if (!dark) { g.globalCompositeOperation = 'source-atop'; const sh = g.createLinearGradient(0, 60, 0, 160); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(150,180,215,.45)'); g.fillStyle = sh; g.fillRect(0, 0, 320, 160); }
    return c;
  }
  const CLOUD = [makeCloud(false), makeCloud(false), makeCloud(false)];
  const STORM = makeCloud(true);
  const mountains = Array.from({ length: 34 }, (_, i) => ({ x: i / 33, h: 0.03 + Math.random() * 0.07 }));

  /* ------------------------------ Suara mesin ------------------------------ */
  const Engine = (() => {
    let ac = null; let osc = null; let osc2 = null; let gain = null; let filt = null;
    return {
      start() {
        if (QC.muted) return;
        try {
          if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
          if (ac.state === 'suspended') ac.resume();
          if (osc) return;
          osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 58;
          osc2 = ac.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 29;
          filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 380;
          gain = ac.createGain(); gain.gain.value = 0;
          osc.connect(filt); osc2.connect(filt); filt.connect(gain).connect(ac.destination);
          osc.start(); osc2.start(); gain.gain.linearRampToValueAtTime(0.03, ac.currentTime + 0.8);
        } catch (e) { /* abaikan */ }
      },
      pitch(k) { if (osc) { osc.frequency.setTargetAtTime(52 + k * 22, ac.currentTime, 0.2); osc2.frequency.setTargetAtTime(26 + k * 11, ac.currentTime, 0.2); } },
      stop() { if (!osc) return; try { gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4); const a = osc; const b = osc2; setTimeout(() => { a.stop(); b.stop(); }, 450); } catch (e) { /* abaikan */ } osc = null; osc2 = null; }
    };
  })();

  /* ------------------------------ Tombol atas ------------------------------ */
  function syncButtons() { $('btnSound').classList.toggle('off', QC.muted); $('btnCam').classList.toggle('off', !cam.want); }
  $('btnSound').onclick = () => { QC.muted = !QC.muted; try { localStorage.setItem('lokamain_muted', JSON.stringify(QC.muted)); } catch (e) { /* abaikan */ } if (QC.muted) Engine.stop(); else if (phase === 'fly' || phase === 'result') Engine.start(); syncButtons(); QC.sfx.click(); };
  $('btnCam').onclick = () => { if (cam.want) stopCamera(); else startCamera(); };
  syncButtons();

  /* ------------------------------ Kamera + MediaPipe Pose ------------------------------ */
  const camState = (t, tip) => { $('camState').textContent = t; if (tip) $('camTip').textContent = tip; };
  function loadScript(src) {
    return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) { res(); return; } const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(new Error('gagal memuat')); document.head.appendChild(s); });
  }
  async function startCamera() {
    cam.want = true; syncButtons();
    if (cam.ready || cam.loading) return;
    cam.loading = true; camState('Menyalakan kamera…');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no cam');
      cam.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' }, audio: false });
      const v = $('cam'); v.srcObject = cam.stream; await v.play().catch(() => {});
      camState('Memuat sensor gerak…');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js');
      cam.pose = new window.Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${f}` });
      cam.pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      cam.pose.onResults(onPose);
      cam.ready = true; camState('Kamera aktif ✓', 'Hidung: naik/turun • Tangan: belok');
      if (phase === 'wait') $('poseGuide').hidden = false;
      if (!cam.want) stopCamera();
    } catch (e) {
      cam.want = false; cam.ready = false;
      if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
      camState('Kamera tidak tersedia', 'Pakai panah / WASD, mouse, atau sentuh');
      QC.toast('Kamera tidak bisa dipakai — kendalikan dengan panah / mouse / sentuh.', 'bad');
    }
    cam.loading = false; syncButtons();
  }
  function stopCamera() {
    cam.want = false; cam.ready = false; cam.lm = null;
    if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
    cam.stream = null; $('poseGuide').hidden = true;
    camState('Kamera mati', 'Pakai panah / WASD, mouse, atau sentuh'); syncButtons();
  }
  const vis = (p) => p && (p.visibility == null || p.visibility > 0.45);
  // Tinggi badan 100–200 cm → faktor kepekaan sensor (pendek = lebih peka, tinggi = kurang peka)
  const TB_OPTIONS = Array.from({ length: 11 }, (_, i) => [100 + i * 10, `${100 + i * 10} cm`]);
  const tbFactor = () => 0.65 + 0.45 * (clamp(Number(S.tb) || 150, 100, 200) - 100) / 100;
  function onPose(r) {
    const lm = r && r.poseLandmarks; if (!lm) { cam.lm = null; return; }
    cam.lm = lm; cam.lmT = performance.now();
    const ls = lm[11]; const rs = lm[12]; const lw = lm[15]; const rw = lm[16]; const nose = lm[0];
    if (phase === 'wait' && vis(ls) && vis(rs) && vis(lw) && vis(rw) && vis(nose)) {
      const sw = Math.abs(ls.x - rs.x);
      const spread = Math.abs(lw.x - rw.x) > sw * 2.1;
      const level = Math.abs(lw.y - ls.y) < 0.16 && Math.abs(rw.y - rs.y) < 0.16;
      if (spread && level) {
        if (!cam.hold) cam.hold = performance.now();
        const k = Math.min(1, (performance.now() - cam.hold) / 900); $('holdBar').style.width = k * 100 + '%';
        if (k >= 1) { cam.hold = 0; takeoff(); }
      } else { cam.hold = 0; $('holdBar').style.width = '0%'; }
    }
  }
  function calibrate() {
    const lm = cam.lm; if (!lm) return;
    const ls = lm[11]; const rs = lm[12]; const nose = lm[0];
    if (vis(ls) && vis(rs)) cam.sw = Math.max(0.08, Math.abs(ls.x - rs.x));
    if (vis(nose)) { cam.x0 = nose.x; cam.y0 = nose.y; }
  }
  function poseControl() {
    const lm = cam.lm; if (!lm || performance.now() - cam.lmT > 600) return false;
    const lw = lm[15]; const rw = lm[16]; const nose = lm[0]; const sw = cam.sw;
    let bank = 0;
    const k = tbFactor(); // tinggi badan: pemain pendek → sensor lebih peka
    if (vis(lw) && vis(rw)) bank += (rw.y - lw.y) / sw * 1.15 / k;      // sayap: tangan kanan lebih rendah = belok kanan
    if (vis(nose)) bank += -(nose.x - cam.x0) / sw * 0.7 / k;            // condong badan
    if (Math.abs(bank) < 0.08) bank = 0;
    plane.bankT = clamp(bank, -1, 1);
    if (vis(nose)) plane.yT = clamp(-(nose.y - cam.y0) / sw * 1.7 / k, -1, 1) * YMAX; // hidung: merunduk = turun
    return true;
  }

  /* ------------------------------ Setup & alur ------------------------------ */
  async function openSetup() {
    clearTimers(); phase = 'idle'; Engine.stop(); objs = []; $('qcard').hidden = true;
    showCard('PILOT CERDAS', 'Kuis terbang dengan sensor tubuh', false);
    const r = await QC.setup({
      logo: document.querySelector('.logo').outerHTML, subtitle: 'Terbangkan pesawat melewati gerbang jawaban yang benar — kendalikan dengan tubuhmu!',
      min: 1, max: 1, defaultCount: 1,
      settings: [
        { key: 'count', label: 'Jumlah soal', value: 8, options: [[5, '5 soal'], [8, '8 soal'], [10, '10 soal'], [15, '15 soal']] },
        { key: 'speed', label: 'Kecepatan terbang', value: 2, options: [[0, 'Sangat pelan'], [1, 'Santai'], [2, 'Sedang'], [3, 'Cepat']] },
        { key: 'obst', label: 'Rintangan', value: 'on', options: [['on', 'Awan badai & burung'], ['off', 'Tanpa rintangan']] },
        { key: 'tb', label: 'Tinggi badan pemain', value: 150, options: TB_OPTIONS },
        { key: 'control', label: 'Kontrol', value: 'cam', options: [['cam', 'Kamera (tubuh)'], ['manual', 'Panah / mouse / sentuh']] }
      ],
      rulesHtml: `<ul>
        <li>Soal muncul di atas. <b>Gerbang cincin A–D</b> datang dari kejauhan — terbanglah <b>melewati gerbang jawaban yang benar</b>.</li>
        <li><b>Hidung</b> mengatur naik-turun: berdiri tegak = naik, <b>merunduk</b> = menukik.</li>
        <li><b>Rentangkan tangan seperti sayap</b>: turunkan tangan kanan = belok kanan, turunkan tangan kiri = belok kiri.</li>
        <li>Benar +100 (+bonus combo & tepat di tengah). Salah −50, terlewat −30.</li>
        <li><b>Rintangan mengurangi skor</b>: awan badai −40, burung −20. Kumpulkan koin bintang +10.</li>
        <li>Tanpa kamera: tombol panah / WASD, gerakkan mouse, atau sentuh layar.</li></ul>`
    });
    player = r.players[0]; S = r.settings;
    if (S.control === 'cam') startCamera(); else if (cam.want) stopCamera();
    toWait();
  }

  function showCard(title, sub, btn = 'LEPAS LANDAS', bare = false) {
    const m = $('msg'); m.hidden = false; m.classList.toggle('bare', bare);
    $('msgTitle').innerHTML = title; $('msgSub').innerHTML = sub;
    const b = $('btnGo'); if (btn) { b.hidden = false; b.innerHTML = `${btn} <small>Spasi / Enter</small>`; } else b.hidden = true;
    const card = m.querySelector('.m-card'); card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  }
  const hideCard = () => { $('msg').hidden = true; $('poseGuide').hidden = true; };

  function toWait() {
    clearTimers(); phase = 'wait'; objs = objs.filter((o) => o.type === 'cloud'); $('qcard').hidden = true; $('combo').innerHTML = '';
    score = 0; asked = 0; correct = 0; combo = 0; bestCombo = 0; speed = SPEED[S.speed]; updateHud();
    Object.assign(plane, { x: 0, y: 0, bank: 0, bankT: 0, yT: 0 });
    showCard('SIAP TERBANG?', S.control === 'cam'
      ? `Halo <b>${esc(player.name)}</b>! Berdiri di depan kamera,<br>lalu <b>rentangkan kedua tangan</b> seperti sayap untuk lepas landas.`
      : `Halo <b>${esc(player.name)}</b>! Kendalikan dengan <b>panah / WASD</b>, mouse, atau sentuh layar.`);
    $('poseGuide').hidden = !(S.control === 'cam' && cam.ready); $('holdBar').style.width = '0%';
  }

  function takeoff() {
    if (phase !== 'wait') return;
    calibrate(); phase = 'takeoff'; hideCard(); Engine.start(); QC.sfx.whoosh();
    showCard('3', '', '', true);
    later(() => showCard('2', '', '', true), 650);
    later(() => showCard('1', '', '', true), 1300);
    later(() => { showCard('TERBANG!', 'Lewati gerbang jawaban yang benar', '', true); QC.sfx.magic(); }, 1950);
    later(() => { hideCard(); nextQuestion(); }, 3000);
  }

  function nextQuestion() {
    if (asked >= S.count) { land(); return; }
    q = QC.nextQuestion(); if (!q) { QC.toast('Bank soal kosong — tambahkan soal di Mode Guru.', 'bad'); land(); return; }
    keys = QC.optionsOf(q); asked++; segT = 0; gatesSpawned = false; phase = 'fly';
    speed = SPEED[S.speed] * (S.speed === 0 ? 1 : 1 + (asked - 1) * 0.025); // Sangat pelan: tidak bertambah cepat
    const qc = $('qcard'); qc.hidden = false; qc.className = 'qcard'; qc.style.animation = 'none'; void qc.offsetWidth; qc.style.animation = '';
    $('qNum').textContent = `SOAL ${asked}/${S.count}`; $('qCat').textContent = q.category || ''; $('qHint').textContent = 'Gerbang jawaban segera datang…';
    $('qText').textContent = q.question;
    $('qOpts').innerHTML = keys.map((k) => `<span style="--oc:${COL[k]}"><b>${k}</b>${esc(q['option' + k])}</span>`).join('');
    // jadwal rintangan & koin untuk segmen ini
    schedule = [];
    if (S.obst === 'on') {
      const n = 2 + Math.min(3, Math.floor(asked / 3));
      for (let i = 0; i < n; i++) schedule.push({ t: rnd(0.3, gateDelay() + 0.6), kind: Math.random() < 0.55 ? 'storm' : 'birds' });
    }
    schedule.push({ t: rnd(0.2, 1.4), kind: 'coins' });
    if (Math.random() < 0.6) schedule.push({ t: rnd(1.6, gateDelay()), kind: 'coins' });
    schedule.sort((a, b) => a.t - b.t);
    updateHud(); Engine.pitch(1 + (asked / S.count) * 0.6);
  }

  function spawnGates() {
    gatesSpawned = true; $('qHint').textContent = 'Terbang lewat gerbang jawaban yang benar!';
    const n = keys.length;
    // Lingkaran gerbang diperbesar agar mudah dilihat & dilewati
    const pos = n === 2 ? [[-0.58, 0.02], [0.58, 0.02]] : n === 3 ? [[-0.76, 0.02], [0, 0.02], [0.76, 0.02]] : [[-0.55, 0.28], [0.55, 0.28], [-0.55, -0.3], [0.55, -0.3]];
    const R = n === 2 ? 0.48 : n === 3 ? 0.36 : 0.3;
    const order = QC.shuffle(keys);
    order.forEach((k, i) => objs.push({ type: 'gate', key: k, x: pos[i][0], y: pos[i][1], z: ZF, pz: ZF, r: R, label: q['option' + k] }));
    QC.sfx.pop();
  }

  function spawnFrom(kind) {
    if (kind === 'storm') objs.push({ type: 'storm', x: rnd(-0.8, 0.8), y: rnd(-0.3, 0.35), z: ZF, pz: ZF, r: 0.3, w: 1.1, flick: Math.random() * 10 });
    else if (kind === 'birds') { const bx = rnd(-0.7, 0.7); const by = rnd(-0.25, 0.35); for (let i = 0; i < 3; i++) objs.push({ type: 'bird', x: bx + (i - 1) * 0.16, y: by + (i === 1 ? 0.06 : 0), z: ZF + i * 0.6, pz: ZF, r: 0.11, ph: Math.random() * 6 }); }
    else if (kind === 'coins') { const cx = rnd(-0.6, 0.6); const cy = rnd(-0.25, 0.3); const dx = rnd(-0.08, 0.08); for (let i = 0; i < 5; i++) objs.push({ type: 'coin', x: clamp(cx + dx * i, -0.9, 0.9), y: cy, z: ZF + i * 1.2, pz: ZF, r: 0.11, spin: i }); }
  }

  /* ------------------------------ Skor & efek ------------------------------ */
  function addScore(d, txt, color, at) {
    const old = score; score = Math.max(0, score + d); updateHud(d >= 0 ? 'up' : 'down');
    const p = at || planeScreen();
    parts.push({ kind: 'text', x: p.x, y: p.y - 40, txt: txt || `${d > 0 ? '+' : ''}${score - old || d}`, c: color || (d >= 0 ? '#16a34a' : '#dc2626'), life: 1.3 });
  }
  function updateHud(anim) {
    const s = $('score'); s.textContent = score;
    if (anim) { s.classList.remove('up', 'down'); void s.offsetWidth; s.classList.add(anim); }
    $('qProg').textContent = `${asked}/${S.count || 0}`;
    $('best').textContent = Math.max(score, hiScores()[0]?.score || 0);
    const c = $('combo');
    if (combo >= 2) { c.innerHTML = `<small>COMBO</small>x${combo}`; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } else c.innerHTML = '';
  }
  function hiScores() { try { return JSON.parse(localStorage.getItem(HS_KEY)) || []; } catch (e) { return []; } }
  function saveHi() {
    const list = hiScores(); const entry = { name: player.name, score, t: Date.now() }; list.push(entry); list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, 5); try { localStorage.setItem(HS_KEY, JSON.stringify(top)); } catch (e) { /* abaikan */ }
    return { top, rank: top.indexOf(entry) };
  }

  function resolveGates(gates) {
    if (phase !== 'fly') return;
    phase = 'result';
    let hitGate = null; let best = 1e9;
    gates.forEach((g) => { const d = Math.hypot(g.x - plane.x, g.y - plane.y); if (d < g.r * 1.05 && d < best) { best = d; hitGate = g; } });
    const qc = $('qcard');
    const correctTxt = `<span class="q-res">${q.correct}. ${esc(q['option' + q.correct])}</span>`;
    if (hitGate && hitGate.key === q.correct) {
      combo++; bestCombo = Math.max(bestCombo, combo); correct++;
      const center = best < hitGate.r * 0.4;
      const pts = 100 + Math.min(5, combo - 1) * 20 + (center ? 25 : 0);
      addScore(pts, `+${pts}${center ? ' TEPAT!' : ''}`, '#16a34a');
      QC.sfx.correct(); FX.flash('rgba(16,185,129,.25)', 400);
      const p = planeScreen(); burst(p.x, p.y, ['#fde047', '#ffffff', COL[hitGate.key]], 34, 260);
      FX.announce(center ? 'TEPAT SASARAN!' : 'BENAR!', { color: '#059669', sub: combo >= 2 ? `Combo x${combo}!` : 'Pilot hebat!', dur: 1100 });
      qc.classList.add('good'); $('qText').innerHTML = `Benar! ${correctTxt}`;
    } else if (hitGate) {
      combo = 0; addScore(-50, '−50 SALAH', '#dc2626'); QC.sfx.wrong(); shakeT = 0.45; redFlash = 0.35;
      qc.classList.add('bad'); $('qText').innerHTML = `Kurang tepat. Jawaban benar: ${correctTxt}`;
    } else {
      combo = 0; addScore(-30, '−30 TERLEWAT', '#dc2626'); QC.sfx.wrong(); redFlash = 0.25;
      qc.classList.add('bad'); $('qText').innerHTML = `Gerbang terlewat! Jawaban benar: ${correctTxt}`;
    }
    $('qHint').textContent = q.explanation ? '' : 'Bersiap untuk soal berikutnya…';
    $('qOpts').innerHTML = q.explanation ? `<span>💡 ${esc(q.explanation)}</span>` : '';
    updateHud();
    later(nextQuestion, q.explanation ? 3200 : 2200);
  }

  function hitObstacle(o) {
    o.hit = true; const p = planeScreen();
    if (o.type === 'storm') { addScore(-40, '−40 BADAI!', '#dc2626'); QC.sfx.boom(); shakeT = 0.6; redFlash = 0.3; whiteout = 0.25; burst(p.x, p.y, ['#64748b', '#fde047', '#94a3b8'], 26, 220); }
    else if (o.type === 'bird') { addScore(-20, '−20 BURUNG!', '#dc2626'); QC.sfx.hit(); shakeT = 0.3; burst(p.x, p.y, ['#ffffff', '#cbd5e1', '#475569'], 16, 160); }
    else if (o.type === 'coin') { addScore(10, '+10', '#ca8a04'); QC.sfx.coin(); burst(p.x, p.y - 10, ['#fde047', '#fbbf24', '#ffffff'], 10, 140); }
  }

  function land() {
    clearTimers(); phase = 'landing'; $('qcard').hidden = true; $('combo').innerHTML = '';
    showCard('MENDARAT!', 'Penerbangan selesai', '', true); QC.sfx.win(); FX.fireworks(5, 240);
    later(() => {
      Engine.stop(); phase = 'end';
      const { top, rank } = saveHi(); updateHud();
      const list = top.map((t, i) => `${i + 1}. ${esc(t.name)} — <b>${t.score}</b>`).join('<br>');
      showCard(rank === 0 && score > 0 ? 'REKOR BARU!' : 'PENERBANGAN SELESAI',
        `<div class="res-grid"><div><small>SKOR</small><b>${score}</b></div><div><small>BENAR</small><b>${correct}/${asked}</b></div><div><small>COMBO</small><b>${bestCombo}</b></div></div>` +
        (rank >= 0 ? `<span class="badge-new">Masuk papan rekor #${rank + 1}</span>` : '') +
        `<p style="margin-top:12px;font-size:.9rem">${list}</p><p style="font-size:.8rem">Tekan ↺ di atas untuk mengubah pengaturan.</p>`, 'TERBANG LAGI');
      if (rank === 0 && score > 0) QC.confetti();
    }, 1900);
  }

  function onGo() {
    QC.sfx.click();
    if (phase === 'wait') takeoff();
    else if (phase === 'end') toWait();
  }
  $('btnGo').onclick = onGo;
  $('btnRestart').onclick = async () => {
    if (QC.isBusy()) return;
    const v = await QC.modal({ icon: '↺', title: 'Ulangi penerbangan?', html: '<p class="qc-muted">Skor kembali ke nol.</p>', buttons: [{ label: 'Batal', value: null }, { label: 'Pengaturan', value: 'setup' }, { label: 'Ulang', value: 'again', primary: true }] });
    if (v === 'again') { Engine.stop(); toWait(); } else if (v === 'setup') openSetup();
  };

  /* ------------------------------ Masukan manual ------------------------------ */
  QC.onKey = (e) => {
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!$('btnGo').hidden) onGo(); return; }
    const k = e.key.toLowerCase(); if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { e.preventDefault(); input.keys[k] = true; }
  };
  addEventListener('keyup', (e) => { input.keys[e.key.toLowerCase()] = false; });
  // Mouse/sentuh: pesawat mengejar posisi kursor DI LAYAR (arahkan kursor ke gerbang)
  cv.addEventListener('pointermove', (e) => { input.ptr = { x: e.clientX, y: e.clientY }; input.ptrT = performance.now(); });
  cv.addEventListener('pointerdown', (e) => { input.ptr = { x: e.clientX, y: e.clientY }; input.ptrT = performance.now(); });

  function steer(dt) {
    if (cam.ready && poseControl()) return;
    const K = input.keys; let used = false;
    const l = K.arrowleft || K.a; const r = K.arrowright || K.d; const u = K.arrowup || K.w; const d = K.arrowdown || K.s;
    if (l || r) { plane.bankT = (r ? 1 : 0) - (l ? 1 : 0); used = true; } else plane.bankT *= 0.85;
    if (u) { plane.yT = clamp(plane.yT + dt * 1.2, -YMAX, YMAX); used = true; }
    if (d) { plane.yT = clamp(plane.yT - dt * 1.2, -YMAX, YMAX); used = true; }
    if (!used && input.ptr && performance.now() - input.ptrT < 4000) {
      const p = planeScreen(); const s = FOCAL / ZP;
      plane.bankT = clamp((input.ptr.x - p.x) / (W * 0.06), -1, 1);
      plane.yT = clamp(((cy - input.ptr.y) / (s * unit) + CAM_LIFT) / 0.4, -YMAX, YMAX);
    }
  }

  /* ------------------------------ Partikel ------------------------------ */
  function burst(x, y, colors, n, sp) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; const v = sp * (0.3 + Math.random() * 0.7); parts.push({ kind: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.5, c: QC.pick(colors), s: 2 + Math.random() * 4 }); }
  }

  /* ------------------------------ Proyeksi ------------------------------ */
  let cx = 0; let cy = 0; let unit = 1;
  function proj(x, y, z) { const s = FOCAL / Math.max(0.05, z); return { x: cx + (x - camv.x) * s * unit, y: cy - (y - camv.y) * s * unit, s }; }
  function planeScreen() { return proj(plane.x, plane.y, ZP); }

  /* ------------------------------ Update ------------------------------ */
  let cloudT = 0;
  function update(dt) {
    const flying = phase === 'fly' || phase === 'result' || phase === 'takeoff' || phase === 'landing';
    const v = flying ? speed : 2.5;
    travel += v * dt;
    if (flying) steer(dt); else { plane.bankT = Math.sin(performance.now() / 1400) * 0.25; plane.yT = Math.sin(performance.now() / 1900) * 0.1; }
    plane.bank += (plane.bankT - plane.bank) * Math.min(1, dt * 5);
    plane.x = clamp(plane.x + plane.bank * 1.3 * dt, -XMAX, XMAX);
    if (!flying) plane.x *= 0.98;
    plane.y += (plane.yT - plane.y) * Math.min(1, dt * 3);
    camv.x += (plane.x * 0.7 - camv.x) * Math.min(1, dt * 4);
    camv.y += (plane.y * 0.6 + CAM_LIFT - camv.y) * Math.min(1, dt * 4);

    // awan dekorasi
    cloudT -= dt;
    if (cloudT <= 0) {
      cloudT = rnd(0.12, 0.3) * (9 / Math.max(3, v));
      let x = rnd(-5, 5); let y = rnd(-1.4, 2.6);
      if (Math.abs(x) < 1.3 && Math.abs(y) < 0.7 && Math.random() < 0.75) x += x < 0 ? -1.6 : 1.6;
      objs.push({ type: 'cloud', x, y, z: ZF + rnd(0, 6), pz: ZF + 6, w: rnd(1.8, 3.6), img: QC.pick(CLOUD) });
    }

    if (phase === 'fly') {
      segT += dt;
      while (schedule.length && schedule[0].t <= segT) spawnFrom(schedule.shift().kind);
      if (!gatesSpawned && segT >= gateDelay()) spawnGates();
    }

    const crossed = [];
    for (const o of objs) {
      o.pz = o.z; o.z -= v * dt;
      if (o.pz > ZP && o.z <= ZP) crossed.push(o);
    }
    // tabrakan saat melintasi bidang pesawat
    const gates = crossed.filter((o) => o.type === 'gate');
    if (gates.length) resolveGates(gates);
    for (const o of crossed) {
      if (o.type === 'cloud') { if (Math.abs(o.x - plane.x) < o.w * 0.35 && Math.abs(o.y - plane.y) < 0.35) whiteout = 0.35; continue; }
      if (o.type === 'gate' || o.hit) continue;
      if (flying && Math.hypot(o.x - plane.x, o.y - plane.y) < o.r + 0.1) hitObstacle(o);
    }
    objs = objs.filter((o) => o.z > 0.25);

    // jejak asap dari ujung sayap
    if (flying) {
      const p = planeScreen(); const span = 0.62 * p.s * unit * 0.5; const a = plane.bank * 0.5;
      [-1, 1].forEach((sd) => { const tx = p.x + Math.cos(a) * span * sd; const ty = p.y + Math.sin(a) * span * sd; parts.push({ kind: 'trail', x: tx, y: ty, vx: sd * 12, vy: 30, life: 0.55, s: 3 }); });
    }
    for (const pt of parts) { pt.life -= dt; if (pt.kind !== 'text') { pt.x += pt.vx * dt; pt.y += pt.vy * dt; if (pt.kind === 'dot') pt.vy += 300 * dt; else pt.s += dt * 14; } }
    parts = parts.filter((pt) => pt.life > 0);
    if (whiteout > 0) whiteout -= dt; if (shakeT > 0) shakeT -= dt; if (redFlash > 0) redFlash -= dt;
  }

  /* ------------------------------ Gambar ------------------------------ */
  function drawWorld(now) {
    const ext = Math.max(W, H) * 1.5;
    // langit
    const sky = ctx.createLinearGradient(0, cy - H * 0.9, 0, cy);
    sky.addColorStop(0, '#2f80d8'); sky.addColorStop(0.55, '#7cc4f5'); sky.addColorStop(1, '#e4f5ff');
    ctx.fillStyle = sky; ctx.fillRect(cx - ext, cy - ext, ext * 2, ext);
    // matahari
    const sx = cx + W * 0.28 - camv.x * 30; const sy = cy - H * 0.3 + camv.y * 20;
    const sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, H * 0.22);
    sg.addColorStop(0, 'rgba(255,255,240,1)'); sg.addColorStop(0.15, 'rgba(255,244,200,.95)'); sg.addColorStop(0.4, 'rgba(255,236,170,.35)'); sg.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, H * 0.22, 0, Math.PI * 2); ctx.fill();
    // gunung di cakrawala
    ctx.fillStyle = 'rgba(110,160,190,.75)'; ctx.beginPath();
    const mw = W * 3; const mo = -W - camv.x * 90;
    ctx.moveTo(mo, cy + 1);
    mountains.forEach((m) => ctx.lineTo(mo + m.x * mw, cy - m.h * H));
    ctx.lineTo(mo + mw, cy + 1); ctx.closePath(); ctx.fill();
    // daratan dengan pita sawah bergerak
    const G = -2.6;
    const ground = ctx.createLinearGradient(0, cy, 0, cy + H * 0.6);
    ground.addColorStop(0, '#b7dfa0'); ground.addColorStop(0.3, '#7cc46a'); ground.addColorStop(1, '#3f9a4a');
    ctx.fillStyle = ground; ctx.fillRect(cx - ext, cy, ext * 2, ext);
    const step = 1.8; const off = travel % (step * 2);
    for (let k = 0; k < 26; k++) {
      const z1 = 0.6 + k * step * 2 - off; const z2 = z1 + step;
      if (z2 < 0.6) continue;
      const y1 = proj(0, G, Math.max(0.6, z1)).y; const y2 = proj(0, G, z2).y;
      ctx.fillStyle = k % 3 === 0 ? 'rgba(255,240,170,.18)' : 'rgba(30,110,50,.14)';
      ctx.fillRect(cx - ext, Math.min(y1, y2), ext * 2, Math.abs(y1 - y2));
    }
    // kabut cakrawala
    const haze = ctx.createLinearGradient(0, cy - 30, 0, cy + 40);
    haze.addColorStop(0, 'rgba(235,248,255,0)'); haze.addColorStop(0.5, 'rgba(235,248,255,.75)'); haze.addColorStop(1, 'rgba(235,248,255,0)');
    ctx.fillStyle = haze; ctx.fillRect(cx - ext, cy - 30, ext * 2, 70);
  }

  function alphaFor(z) { let a = Math.min(1, (ZF + 6 - z) / 8); if (z < 1.4) a *= Math.max(0, (z - 0.25) / 1.15); return a; }

  function drawObj(o, now) {
    const p = proj(o.x, o.y, o.z); const a = alphaFor(o.z); if (a <= 0) return;
    ctx.globalAlpha = a;
    if (o.type === 'cloud') {
      const w = o.w * p.s * unit; ctx.drawImage(o.img, p.x - w / 2, p.y - w / 4, w, w / 2);
    } else if (o.type === 'storm') {
      const w = o.w * p.s * unit; ctx.drawImage(STORM, p.x - w / 2, p.y - w / 4, w, w / 2);
      if (Math.floor(now / 90 + o.flick) % 9 === 0) {
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = Math.max(2, w * 0.02); ctx.beginPath();
        ctx.moveTo(p.x, p.y + w * 0.08); ctx.lineTo(p.x - w * 0.05, p.y + w * 0.2); ctx.lineTo(p.x + w * 0.02, p.y + w * 0.2); ctx.lineTo(p.x - w * 0.04, p.y + w * 0.34); ctx.stroke();
      }
    } else if (o.type === 'bird') {
      const s = 0.13 * p.s * unit; const f = Math.sin(now / 90 + o.ph) * 0.6;
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = Math.max(1.5, s * 0.16); ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - s * f); ctx.quadraticCurveTo(p.x - s * 0.4, p.y - s * 0.5, p.x, p.y); ctx.quadraticCurveTo(p.x + s * 0.4, p.y - s * 0.5, p.x + s, p.y - s * f); ctx.stroke();
    } else if (o.type === 'coin') {
      if (o.hit) { ctx.globalAlpha = 1; return; }
      const r = o.r * p.s * unit * 0.8; const sq = Math.abs(Math.cos(now / 250 + o.spin));
      ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(p.x + 1, p.y + 1, r * Math.max(0.2, sq), r, 0, 0, Math.PI * 2); ctx.fill();
      const cg = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
      cg.addColorStop(0, '#fff7c2'); cg.addColorStop(0.5, '#fbbf24'); cg.addColorStop(1, '#d97706');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * Math.max(0.2, sq), r, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === 'gate') drawGate(o, p);
    ctx.globalAlpha = 1;
  }

  function drawGate(o, p) {
    const r = o.r * p.s * unit; const c = COL[o.key];
    ctx.fillStyle = c + '1f'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(3, r * 0.17); ctx.strokeStyle = 'rgba(15,39,66,.35)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.04); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.93, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    // lencana huruf
    const br = Math.max(9, r * 0.27);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y - r, br + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y - r, br, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(br * 1.15)}px "Baloo 2", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.key, p.x, p.y - r + br * 0.08);
    // label jawaban
    if (r > 22) {
      const fs = clamp(r * 0.2, 11, 26); ctx.font = `700 ${Math.round(fs)}px "Plus Jakarta Sans", sans-serif`;
      let t = String(o.label); if (t.length > 32) t = t.slice(0, 31) + '…';
      const tw = ctx.measureText(t).width + fs; const ty = p.y + r + fs * 1.1;
      ctx.fillStyle = 'rgba(255,255,255,.92)'; roundRect(p.x - tw / 2, ty - fs * 0.8, tw, fs * 1.6, fs * 0.8); ctx.fill();
      ctx.fillStyle = '#0f2742'; ctx.fillText(t, p.x, ty);
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawPlane(now) {
    const p = planeScreen(); const u = 0.62 * p.s * unit * 0.5; // setengah bentang sayap (px)
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(plane.bank * 0.5);
    // baling-baling (di depan, terlihat di belakang badan)
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(0, -u * 0.02, u * 0.34, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 0.55;
    const ang = now / 25; ctx.strokeStyle = '#334155'; ctx.lineWidth = Math.max(2, u * 0.035);
    for (let i = 0; i < 2; i++) { const a = ang + i * Math.PI; ctx.beginPath(); ctx.moveTo(0, -u * 0.02); ctx.lineTo(Math.cos(a) * u * 0.33, -u * 0.02 + Math.sin(a) * u * 0.33); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // sayap utama
    const wg = ctx.createLinearGradient(0, -u * 0.12, 0, u * 0.1); wg.addColorStop(0, '#ffffff'); wg.addColorStop(1, '#b8c6d8');
    ctx.fillStyle = wg; ctx.strokeStyle = '#0f2742'; ctx.lineWidth = Math.max(1.2, u * 0.018);
    ctx.beginPath(); ctx.moveTo(-u, -u * 0.01); ctx.quadraticCurveTo(-u * 0.5, -u * 0.11, -u * 0.16, -u * 0.12); ctx.lineTo(u * 0.16, -u * 0.12); ctx.quadraticCurveTo(u * 0.5, -u * 0.11, u, -u * 0.01); ctx.lineTo(u * 0.98, u * 0.06); ctx.lineTo(u * 0.16, u * 0.07); ctx.lineTo(-u * 0.16, u * 0.07); ctx.lineTo(-u * 0.98, u * 0.06); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PLANE_COLOR; [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.moveTo(sd * u * 0.78, -u * 0.04); ctx.lineTo(sd * u, -u * 0.01); ctx.lineTo(sd * u * 0.98, u * 0.06); ctx.lineTo(sd * u * 0.78, u * 0.065); ctx.closePath(); ctx.fill(); });
    // lampu ujung sayap
    const blink = Math.floor(now / 500) % 2 === 0;
    ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d'; ctx.beginPath(); ctx.arc(-u * 0.99, u * 0.02, Math.max(2, u * 0.03), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blink ? '#22c55e' : '#14532d'; ctx.beginPath(); ctx.arc(u * 0.99, u * 0.02, Math.max(2, u * 0.03), 0, Math.PI * 2); ctx.fill();
    // badan pesawat
    const fg = ctx.createRadialGradient(-u * 0.06, -u * 0.08, u * 0.02, 0, 0, u * 0.2); fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, '#9fb0c6');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, u * 0.19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PLANE_COLOR; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.arc(0, 0, u * 0.14, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    // kaca kokpit (terlihat dari belakang)
    ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.ellipse(0, -u * 0.12, u * 0.1, u * 0.06, 0, Math.PI, 0); ctx.fill();
    // ekor horizontal & sirip tegak
    ctx.fillStyle = PLANE_COLOR; ctx.strokeStyle = '#0f2742'; ctx.lineWidth = Math.max(1.2, u * 0.018);
    ctx.beginPath(); ctx.moveTo(-u * 0.4, u * 0.0); ctx.lineTo(u * 0.4, u * 0.0); ctx.lineTo(u * 0.36, u * 0.06); ctx.lineTo(-u * 0.36, u * 0.06); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-u * 0.04, -u * 0.1); ctx.lineTo(-u * 0.02, -u * 0.48); ctx.lineTo(u * 0.05, -u * 0.46); ctx.lineTo(u * 0.04, -u * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawParts() {
    for (const pt of parts) {
      if (pt.kind === 'trail') { ctx.globalAlpha = Math.max(0, pt.life) * 0.55; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s, 0, Math.PI * 2); ctx.fill(); }
      else if (pt.kind === 'dot') { ctx.globalAlpha = Math.min(1, pt.life * 2); ctx.fillStyle = pt.c; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawTexts() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const pt of parts) {
      if (pt.kind !== 'text') continue;
      const k = 1 - pt.life / 1.3; ctx.globalAlpha = Math.min(1, pt.life * 1.5);
      ctx.font = '800 30px "Baloo 2", sans-serif'; const y = pt.y - k * 50;
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(pt.txt, pt.x, y); ctx.fillStyle = pt.c; ctx.fillText(pt.txt, pt.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawMini() {
    mctx.fillStyle = '#0b1d36'; mctx.fillRect(0, 0, 192, 108);
    const v = $('cam');
    if (!cam.ready || v.readyState < 2) { mctx.fillStyle = '#5b7aa6'; mctx.font = '700 12px "Plus Jakarta Sans"'; mctx.textAlign = 'center'; mctx.fillText(cam.loading ? 'memuat…' : 'kamera mati', 96, 58); return; }
    const vw = v.videoWidth || 640; const vh = v.videoHeight || 360; const s = Math.max(192 / vw, 108 / vh); const dw = vw * s; const dh = vh * s; const ox = (192 - dw) / 2; const oy = (108 - dh) / 2;
    mctx.save(); mctx.translate(192, 0); mctx.scale(-1, 1); mctx.drawImage(v, ox, oy, dw, dh); mctx.restore();
    mctx.fillStyle = 'rgba(11,29,54,.35)'; mctx.fillRect(0, 0, 192, 108);
    const lm = cam.lm; if (!lm) return;
    const P2 = (pt) => ({ x: 192 - (ox + pt.x * dw), y: oy + pt.y * dh });
    const lw = lm[15]; const rw = lm[16]; const nose = lm[0];
    if (vis(lw) && vis(rw)) { const a = P2(lw); const b = P2(rw); mctx.strokeStyle = Math.abs(plane.bankT) > 0.3 ? '#fbbf24' : '#38bdf8'; mctx.lineWidth = 3; mctx.beginPath(); mctx.moveTo(a.x, a.y); mctx.lineTo(b.x, b.y); mctx.stroke(); [a, b].forEach((c) => { mctx.fillStyle = '#38bdf8'; mctx.beginPath(); mctx.arc(c.x, c.y, 4, 0, Math.PI * 2); mctx.fill(); }); }
    if (vis(nose)) { const n = P2(nose); mctx.fillStyle = '#fbbf24'; mctx.beginPath(); mctx.arc(n.x, n.y, 4.5, 0, Math.PI * 2); mctx.fill(); if (phase !== 'wait') { const y0 = oy + cam.y0 * dh; mctx.setLineDash([4, 3]); mctx.strokeStyle = 'rgba(255,255,255,.6)'; mctx.lineWidth = 1; mctx.beginPath(); mctx.moveTo(0, y0); mctx.lineTo(192, y0); mctx.stroke(); mctx.setLineDash([]); } }
  }

  function draw(now) {
    cx = W / 2; cy = H * 0.52; unit = W * 0.5;
    ctx.save();
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * 14 * shakeT, (Math.random() - 0.5) * 10 * shakeT);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-plane.bank * 0.22); ctx.translate(-cx, -cy);
    drawWorld(now);
    const sorted = objs.slice().sort((a, b) => b.z - a.z);
    let planeDrawn = false;
    for (const o of sorted) {
      if (!planeDrawn && o.z < ZP) { ctx.restore(); drawParts(); drawPlane(now); planeDrawn = true; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-plane.bank * 0.22); ctx.translate(-cx, -cy); }
      drawObj(o, now);
    }
    ctx.restore();
    if (!planeDrawn) { drawParts(); drawPlane(now); }
    drawTexts();
    if (whiteout > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.75, whiteout * 2.4)})`; ctx.fillRect(0, 0, W, H); }
    if (redFlash > 0) { ctx.fillStyle = `rgba(239,68,68,${Math.min(0.35, redFlash)})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    drawMini();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw(now);
    if (cam.ready && cam.pose && !cam.busy && now - cam.last > 70 && $('cam').readyState >= 2) {
      cam.busy = true; cam.last = now;
      cam.pose.send({ image: $('cam') }).catch(() => {}).finally(() => { cam.busy = false; });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  openSetup();
})();
