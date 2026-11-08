/* ==========================================================================
   Balap Roket Antariksa — KUIS REBUTAN SERENTAK
   - Satu soal untuk SEMUA pemain sekaligus, tiap pemain punya pad jawaban
     sendiri (layar sentuh) atau tombol keyboard sendiri.
   - Benar & tercepat: +3, tercepat kedua: +2, benar lainnya: +1.
   - Salah: dihantam meteor (mundur). Tidak menjawab: diam di tempat.
   - 3x benar beruntun: HYPERDRIVE +2. Bintang +2, Lubang hitam −2.
   - Pemain yang salah melakukan latihan astronot bersama.
   - Main sendiri? Lawan Robot ARX.
   ========================================================================== */
(function () {
  const QC = window.QuizCore; const FX = QC.fx;
  const $ = (id) => document.getElementById(id);
  const esc = QC.esc;

  const SHAPES = {
    A: '<path d="M12 3 L22 20 H2 Z"/>',
    B: '<path d="M12 2 L22 12 L12 22 L2 12 Z"/>',
    C: '<circle cx="12" cy="12" r="9.5"/>',
    D: '<rect x="3" y="3" width="18" height="18" rx="2.5"/>'
  };
  const shape = (k) => `<svg viewBox="0 0 24 24">${SHAPES[k]}</svg>`;
  const OC = { A: 'var(--oA)', B: 'var(--oB)', C: 'var(--oC)', D: 'var(--oD)' };
  const KEYS = [['1', '2', '3', '4'], ['7', '8', '9', '0'], ['z', 'x', 'c', 'v'], ['n', 'm', ',', '.']];
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#fde047" stroke="#f59e0b" stroke-width="1"/></svg>';
  const HOLE = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1e1b4b" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="3 2.5"/><circle cx="12" cy="12" r="6.5" fill="#000" stroke="#c084fc" stroke-width="1.2"/></svg>';
  const METEOR = '<svg viewBox="0 0 96 48"><path d="M16 14 L94 2 L94 46 L16 34 Z" fill="url(#gTail)"/><circle cx="16" cy="24" r="13" fill="#57534e" stroke="#1c1917" stroke-width="2"/><circle cx="12" cy="19" r="3.4" fill="#3f3a36"/><circle cx="21" cy="28" r="2.6" fill="#3f3a36"/><circle cx="11" cy="29" r="1.8" fill="#3f3a36"/></svg>';
  const LOCK = '<svg class="lock-icon" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const SND_ON = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  const SND_OFF = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>';
  const LOGO = '<svg viewBox="0 0 130 52"><use href="#rocket" style="--pc:#22d3ee"/></svg>';

  // Hukuman sederhana & mudah dipahami
  const PUNISH = [
    { t: '<b>Lompat 10 kali</b> di tempat!' },
    { t: '<b>Push-up 5 kali</b>!' },
    { t: '<b>Lari di tempat</b> selama 10 detik!', s: 10 },
    { t: '<b>Bernyanyi</b> satu lagu anak-anak (1 bait) bersama-sama!' },
    { t: '<b>Squat (jongkok-berdiri) 10 kali</b>!' },
    { t: '<b>Jumping jack 10 kali</b> (lompat sambil buka-tutup tangan & kaki)!' },
    { t: '<b>Berdiri satu kaki</b> selama 10 detik tanpa jatuh!', s: 10 },
    { t: '<b>Tepuk tangan 20 kali</b> sambil menghitung keras-keras!' },
    { t: '<b>Bernyanyi "Balonku"</b> sambil bertepuk tangan!' },
    { t: '<b>Sit-up 5 kali</b>!' },
    { t: '<b>Menari / berjoget</b> selama 10 detik!', s: 10 },
    { t: '<b>Lompat kodok 5 kali</b>!' }
  ];

  let P = []; let S = {}; let round = 0; let phase = 'idle';
  let q = null; let keys = []; let qStart = 0; let timerIv = null; let cpuTimers = [];
  let answers = new Map(); let events = {};
  let mod = null; let finalShown = false; let leader = null;
  const SHIELD = '<svg viewBox="0 0 24 24"><path d="M12 2 L20 5 V11 Q20 18 12 22 Q4 18 4 11 V5 Z" fill="#0ea5e9" stroke="#e0f2fe" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 6 V18 M8 10 H16" stroke="#e0f2fe" stroke-width="1.4" opacity=".75"/></svg>';
  // Ronde spesial (muncul tiap 3 ronde)
  const MODS = {
    double: { name: 'RONDE GANDA', sub: 'Pemenang ronde melesat +6 langkah!', win: 6, color: '#a16207', flash: 'rgba(250,204,21,.35)' },
    storm: { name: 'BADAI METEOR', sub: 'Menang +4, tapi yang salah mundur 2!', win: 4, wrong: 2, color: '#c2410c', flash: 'rgba(249,115,22,.35)' },
    flash: { name: 'SOAL KILAT', sub: 'Waktu tinggal setengah — menang +4!', win: 4, tf: 0.5, color: '#6d28d9', flash: 'rgba(139,92,246,.35)' }
  };

  QC.init({ gameId: 'balap-roket', title: 'Balap Roket Antariksa', avatars: ['🧑‍🚀', '👩‍🚀', '👽', '🤖', '🦊', '🐼', '🐯', '🐧'], colors: ['#3b82f6', '#ef4444', '#22c55e', '#a855f7'] });

  /* ------------------------------ Langit bintang ------------------------------ */
  const sky = { warp: 0 };
  (function starfield() {
    const cv = $('sky'); const ctx = cv.getContext('2d'); let W = 0; let H = 0; let stars = []; let shoot = null; let last = performance.now();
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((W * H) / 9000) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1, tw: Math.random() * 6 }));
    };
    resize(); addEventListener('resize', resize);
    const planets = [
      { x: W * 0.62, y: H * 0.16, r: 34, v: 0.004, c: ['#93c5fd', '#1e3a8a'], ring: false },
      { x: W * 0.18, y: H * 0.78, r: 22, v: 0.007, c: ['#f9a8d4', '#831843'], ring: true }
    ];
    (function frame(now) {
      const dt = Math.min(50, now - last); last = now;
      if (!document.hidden) {
        const g = ctx.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, W * 0.7);
        g.addColorStop(0, '#1b1446'); g.addColorStop(0.5, '#0a0d2a'); g.addColorStop(1, '#050816');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Planet jauh (paralaks lambat)
        for (const pl of planets) {
          pl.x -= dt * pl.v * (1 + sky.warp * 8); if (pl.x < -pl.r * 3) pl.x = W + pl.r * 3;
          const pg = ctx.createRadialGradient(pl.x - pl.r * 0.35, pl.y - pl.r * 0.35, pl.r * 0.1, pl.x, pl.y, pl.r);
          pg.addColorStop(0, pl.c[0]); pg.addColorStop(1, pl.c[1]);
          ctx.globalAlpha = 0.55; ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2); ctx.fill();
          if (pl.ring) { ctx.strokeStyle = 'rgba(253,230,138,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(pl.x, pl.y, pl.r * 1.8, pl.r * 0.4, -0.3, 0, Math.PI * 2); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
        const speed = 0.02 + sky.warp * 1.2;
        for (const s of stars) {
          s.x -= s.z * speed * dt; s.tw += dt * 0.004;
          if (s.x < -20) { s.x = W + 10; s.y = Math.random() * H; }
          const a = 0.35 + 0.65 * s.z * (0.75 + 0.25 * Math.sin(s.tw));
          if (sky.warp > 0.05) {
            ctx.strokeStyle = `rgba(186,230,253,${a})`; ctx.lineWidth = s.z * 1.6;
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.z * sky.warp * 60, s.y); ctx.stroke();
          } else { ctx.fillStyle = `rgba(226,232,255,${a})`; ctx.fillRect(s.x, s.y, s.z * 2, s.z * 2); }
        }
        if (!shoot && Math.random() < 0.002) shoot = { x: Math.random() * W * 0.6 + W * 0.4, y: Math.random() * H * 0.4, life: 1 };
        if (shoot) {
          const gr = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x + 120, shoot.y - 50);
          gr.addColorStop(0, `rgba(255,255,255,${shoot.life})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x + 120, shoot.y - 50); ctx.stroke();
          shoot.x -= dt * 0.9; shoot.y += dt * 0.38; shoot.life -= dt * 0.0012; if (shoot.life <= 0) shoot = null;
        }
      }
      requestAnimationFrame(frame);
    })(last);
  })();
  function warp(on) {
    const target = on ? 1 : 0; const from = sky.warp; const t0 = performance.now();
    (function step(n) { const k = Math.min(1, (n - t0) / 500); sky.warp = from + (target - from) * k; if (k < 1) requestAnimationFrame(step); })(t0);
  }

  /* ------------------------------ Suara ------------------------------ */
  function syncSound() { $('btnSound').innerHTML = QC.muted ? SND_OFF : SND_ON; }
  $('btnSound').onclick = () => { QC.muted = !QC.muted; try { localStorage.setItem('lokamain_muted', JSON.stringify(QC.muted)); } catch (e) { /* abaikan */ } syncSound(); QC.sfx.click(); };
  syncSound();

  /* ------------------------------ Setup ------------------------------ */
  async function openSetup() {
    stopRound();
    const r = await QC.setup({
      logo: LOGO, subtitle: 'Kuis rebutan! Siapa pertama menjawab benar, dia yang melesat!',
      min: 1, max: 4, defaultCount: 2, soloLabel: '1 vs Robot',
      settings: [
        { key: 'target', label: 'Jarak ke planet', value: 15, options: [[10, '10 langkah (cepat)'], [15, '15 langkah'], [20, '20 langkah'], [25, '25 langkah (panjang)']] },
        { key: 'timer', label: 'Waktu menjawab', value: 15, options: [[10, '10 detik'], [15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [0, 'Tanpa batas']] },
        { key: 'meteor', label: 'Mundur jika salah', value: 1, options: [[0, 'Tidak mundur'], [1, '1 langkah'], [2, '2 langkah']] },
        { key: 'events', label: 'Bintang & lubang hitam', value: 'on', options: [['on', 'Aktif'], ['off', 'Nonaktif']] },
        { key: 'punish', label: 'Hukuman (gerak & nyanyi)', value: 'on', options: [['on', 'Aktif'], ['off', 'Nonaktif']] }
      ],
      rulesHtml: `<ul>
        <li>Satu soal muncul untuk <b>semua pemain sekaligus</b>. Jawab di pad warnamu (sentuh) atau tombol keyboard-mu.</li>
        <li>Keyboard: P1 <b>1 2 3 4</b> • P2 <b>7 8 9 0</b> • P3 <b>Z X C V</b> • P4 <b>N M , .</b></li>
        <li><b>Rebutan!</b> Yang pertama menjawab <b>benar</b> langsung merebut ronde: <b>+3 langkah</b>. Tidak perlu menunggu yang lain.</li>
        <li>Salah = <b>langsung</b> dihantam meteor & tidak bisa menjawab lagi di ronde itu — pemain lain masih bisa merebut. 3x menang ronde beruntun = <b>HYPERDRIVE +2</b>.</li>
        <li>Di lintasan: <b>bintang +2</b>, <b>lubang hitam −2</b>, <b>perisai</b> (menahan 1 meteor).</li>
        <li>Roket paling belakang yang menang ronde dapat bonus <b>KEJAR +1</b>.</li>
        <li>Tiap 3 ronde ada <b>ronde spesial</b>: Ronde Ganda (+6), Badai Meteor (+4, salah −2), Soal Kilat (waktu setengah, +4).</li>
        <li>Yang salah menjalani <b>hukuman</b> bersama: lompat, push-up, lari di tempat, bernyanyi, dll.</li>
        <li>Main sendiri? Kamu akan melawan <b>Robot ARX</b>.</li></ul>`
    });
    P = r.players.map((p) => ({ ...p, cpu: false }));
    if (P.length === 1) P.push({ id: 1, name: 'Robot ARX', avatar: '🤖', color: '#94a3b8', cpu: true });
    S = r.settings;
    newGame();
  }

  function newGame() {
    stopRound();
    P.forEach((p) => Object.assign(p, { pos: 0, streak: 0, correct: 0, fastest: 0, totalTime: 0 }));
    round = 0; phase = 'ready'; events = {};
    if (S.events === 'on') {
      const n = Math.max(2, Math.round(S.target / 4));
      const slots = QC.shuffle(Array.from({ length: S.target - 4 }, (_, i) => i + 3)).slice(0, n);
      const types = ['star', 'hole', 'shield'];
      slots.forEach((s, i) => (events[s] = types[i % 3]));
    }
    mod = null; finalShown = false; leader = null; document.body.classList.remove('final');
    P.forEach((p) => (p.shield = false));
    $('targetNo').textContent = S.target;
    buildTrack(); buildPads(); render();
    idleCard('Semua roket siap di landasan', 'Tekan <b>MULAI RONDE</b>. Rebutan! Yang pertama menjawab benar langsung merebut ronde. Salah? Langsung kena meteor!', 'MULAI RONDE');
    document.querySelectorAll('.rocket').forEach((r, i) => r.animate([{ transform: 'translateX(-140px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: i * 140, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'backwards' }));
    FX.announce('BALAPAN DIMULAI', { color: '#0e7490', sub: `${P.length} roket • target ${S.target} langkah`, dur: 1500 });
  }

  /* ------------------------------ Bangun tampilan ------------------------------ */
  const xAt = (s) => `calc(${s / S.target} * (100% - 96px) + 48px)`;
  function buildTrack() {
    $('lanes').innerHTML = P.map((p, i) => {
      let marks = '';
      for (let s = 1; s < S.target; s++) marks += `<div class="mark" style="left:${xAt(s)}">${s % 5 === 0 ? `<b>${s}</b>` : ''}</div>`;
      const evs = Object.keys(events).map((s) => `<div class="ev ${events[s]}" style="left:${xAt(+s)}">${{ star: STAR, hole: HOLE, shield: SHIELD }[events[s]]}</div>`).join('');
      return `<div class="lane" id="lane${i}" style="--pc:${p.color}">
        <div class="lane-tag"><span class="rank" id="lr${i}">1</span><span class="dot">${p.avatar}</span><span class="nm"><b>${esc(p.name)}</b><small id="lp${i}"></small></span><span class="streak" id="ls${i}"><i></i><i></i><i></i></span></div>
        <div class="lane-run" id="run${i}">${marks}${evs}
          <div class="rocket" id="rk${i}"><svg viewBox="0 0 130 52"><use href="#rocket"/></svg></div>
          <div class="lock-badge" id="lb${i}">SIAP</div>
        </div></div>`;
    }).join('');
  }
  function buildPads() {
    const pads = $('pads'); pads.style.setProperty('--n', P.length);
    pads.innerHTML = P.map((p, i) => `<div class="pad ${p.cpu ? 'cpu' : ''}" id="pad${i}" style="--pc:${p.color}">
      <div class="pad-head"><span class="av">${p.avatar}</span><b>${esc(p.name)}</b><span class="keys">${p.cpu ? 'OTOMATIS' : KEYS[i].map((k) => k.toUpperCase()).join(' ')}</span></div>
      <div class="pad-btns" id="pbs${i}"></div>
      <div class="pad-state on idle" id="ps${i}"><b>SIAP</b><small>Menunggu soal</small></div></div>`).join('');
  }
  function rankOf(i) { return 1 + P.filter((x) => x.pos > P[i].pos).length; }
  function render() {
    P.forEach((p, i) => {
      const v = Math.min(1, p.pos / S.target);
      $('rk' + i).style.setProperty('--p', v); $('lb' + i).style.setProperty('--p', v);
      $('rk' + i).classList.toggle('shielded', !!p.shield);
      $('lp' + i).textContent = `${p.pos} / ${S.target}`;
      [...$('ls' + i).children].forEach((x, k) => x.classList.toggle('on', k < p.streak));
      const r = rankOf(i); const rb = $('lr' + i);
      rb.textContent = r; rb.className = `rank r${r}${p.pos > 0 && r === 1 && P.filter((x) => x.pos === p.pos).length === 1 ? ' lead' : ''}`;
    });
    $('roundNo').textContent = round;
  }
  function padState(i, cls, title = '', sub = '', icon = '') {
    const s = $('ps' + i);
    if (!cls) { s.className = 'pad-state'; return; }
    s.className = `pad-state on ${cls}`; s.innerHTML = `${icon}<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
  }
  function setNext(label) { const b = $('btnNext'); b.innerHTML = `${label} <small>Spasi / Enter</small>`; b.hidden = false; }
  function idleCard(cat, text, btn) {
    $('qCat').textContent = cat; $('qStatus').textContent = ''; $('qText').innerHTML = text; $('qOpts').innerHTML = ''; $('qExp').innerHTML = '';
    $('tNum').textContent = '–'; $('tRing').style.strokeDashoffset = 0; setNext(btn);
  }
  function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ------------------------------ Alur ronde ------------------------------ */
  function stopRound() { clearInterval(timerIv); cpuTimers.forEach(clearTimeout); cpuTimers = []; }

  async function startRound() {
    if (phase !== 'ready' && phase !== 'reveal') return;
    q = QC.nextQuestion();
    if (!q) { QC.toast('Bank soal kosong — tambahkan soal di Mode Guru.', 'bad'); return; }
    phase = 'countdown'; $('btnNext').hidden = true;
    round++; render(); keys = QC.optionsOf(q); answers = new Map(); pending = []; wrongs = [];
    P.forEach((p, i) => { padState(i, 'idle', 'BERSIAP', 'Soal segera muncul'); $('lb' + i).classList.remove('on'); $('pad' + i).classList.remove('picked'); });
    // Ronde spesial setiap 3 ronde
    mod = round >= 3 && round % 3 === 0 ? MODS[QC.pick(Object.keys(MODS))] : null;
    const qc = $('qcard'); qc.classList.toggle('special', !!mod); qc.style.setProperty('--mc', mod ? mod.color : 'transparent');
    $('qCat').textContent = q.category; $('qStatus').innerHTML = mod ? `<span class="mod-tag">${mod.name}</span> ${mod.sub}` : `Ronde ${round}`;
    $('qText').textContent = ''; $('qOpts').innerHTML = ''; $('qExp').innerHTML = '';
    if (mod) { QC.sfx.magic(); FX.flash(mod.flash, 450); await withTimeout(FX.announce(mod.name, { color: mod.color, sub: mod.sub, dur: 1500 }), 1800); }
    await countdown();
    showQuestion();
  }

  const withTimeout = (p, ms) => Promise.race([p, QC.sleep(ms)]);

  async function countdown() {
    const c = $('countdown'); c.classList.add('on'); document.body.classList.add('revving');
    for (const t of ['3', '2', '1', 'GO!']) {
      c.innerHTML = `<span>${t}</span>`;
      if (t === 'GO!') QC.sfx.whoosh(); else QC.sfx.tick();
      await QC.sleep(t === 'GO!' ? 550 : 700);
    }
    c.classList.remove('on'); document.body.classList.remove('revving');
  }

  function showQuestion() {
    phase = 'question';
    const qt = $('qText'); qt.textContent = q.question; retrigger(qt, 'in');
    $('qOpts').innerHTML = keys.map((k, n) => `<div class="opt" id="opt${k}" style="--oc:${OC[k]};--i:${n}"><span class="shape">${shape(k)}</span><span>${esc(q['option' + k])}</span><span class="who"></span></div>`).join('');
    P.forEach((p, i) => {
      const box = $('pbs' + i); box.style.setProperty('--k', keys.length);
      box.innerHTML = keys.map((k) => `<button class="pb" data-k="${k}" style="--oc:${OC[k]}" ${p.cpu ? 'disabled' : ''}>${shape(k)}<span>${k}</span></button>`).join('');
      box.querySelectorAll('.pb').forEach((b) => (b.onclick = () => lock(i, b.dataset.k)));
      padState(i, p.cpu ? 'idle' : null, 'MENGHITUNG…', 'Robot sedang berpikir');
      if (p.cpu) {
        const span = S.timer ? S.timer * 1000 * 0.75 : 8000;
        const k = Math.random() < 0.62 ? q.correct : QC.pick(keys.filter((x) => x !== q.correct));
        cpuTimers.push(setTimeout(() => lock(i, k), 3000 + Math.random() * span));
      }
    });
    qStart = performance.now(); startTimer();
    if (!mod) $('qStatus').textContent = `Ronde ${round} • siapa tercepat?`;
  }

  function startTimer() {
    const T = S.timer ? Math.max(5, Math.round(S.timer * (mod && mod.tf ? mod.tf : 1))) : 0; const ring = $('tRing'); const num = $('tNum'); const box = $('qTimer');
    box.classList.remove('hurry'); ring.style.strokeDashoffset = 0;
    if (!T) { num.textContent = '∞'; return; }
    let last = T; num.textContent = T;
    timerIv = setInterval(() => {
      const left = Math.max(0, T - (performance.now() - qStart) / 1000);
      ring.style.strokeDashoffset = 119.4 * (1 - left / T);
      const s = Math.ceil(left);
      if (s !== last) { last = s; num.textContent = s; if (s <= 5 && s > 0) { QC.sfx.tick(); box.classList.add('hurry'); } }
      if (left <= 0) endQuestion();
    }, 100);
  }

  /* Rebutan: jawaban langsung dinilai saat itu juga.
     - Benar pertama  → ronde langsung berakhir, pemain itu melesat.
     - Salah          → langsung kena meteor & tidak bisa menjawab lagi; pemain lain tetap boleh merebut.
     - Semua salah / waktu habis → ronde berakhir tanpa pemenang. */
  let pending = []; let wrongs = [];
  function lock(i, k) {
    if (phase !== 'question' || answers.has(i) || !keys.includes(k)) return;
    const t = (performance.now() - qStart) / 1000; answers.set(i, { k, t });
    const pad = $('pad' + i); pad.classList.add('picked');
    pad.querySelectorAll('.pb').forEach((b) => { b.disabled = true; if (b.dataset.k === k) b.classList.add('mine'); });
    if (k === q.correct) { endQuestion(i); return; }
    // Salah: hukuman instan
    const p = P[i]; p.streak = 0; wrongs.push(i);
    const pen = mod && mod.wrong != null ? mod.wrong : S.meteor;
    const blocked = !!p.shield && pen > 0;
    padState(i, 'bad', blocked ? 'PERISAI!' : pen ? `−${pen}` : 'SALAH', blocked ? 'Salah, tapi perisai menahan meteor' : `Jawaban salah • ${t.toFixed(1)} dtk`);
    retrigger(pad, 'flash-bad'); QC.sfx.wrong();
    pending.push(move(i, { delta: blocked ? 0 : -pen, cls: 'bad', blocked }));
    const left = P.length - answers.size;
    $('qStatus').textContent = left ? `Ronde ${round} • ${p.name} salah! ${left} pemain masih bisa merebut` : `Ronde ${round} • semua salah`;
    if (!left) setTimeout(() => endQuestion(null), 300);
  }

  async function endQuestion(winner = null) {
    if (phase !== 'question') return;
    phase = 'resolving'; stopRound(); $('qTimer').classList.remove('hurry');
    P.forEach((p, i) => $('lb' + i).classList.remove('on'));

    // 1) Buka jawaban
    keys.forEach((k) => $('opt' + k).classList.add(k === q.correct ? 'correct' : 'dim'));
    answers.forEach((a, i) => $('opt' + a.k).querySelector('.who').insertAdjacentHTML('beforeend', `<i style="--pc:${P[i].color}">${P[i].avatar}</i>`));
    FX.ringAt($('opt' + q.correct), '#1fb36b', 280);
    if (q.explanation) $('qExp').innerHTML = `<b>Pembahasan:</b> ${esc(q.explanation)}`;
    P.forEach((p, i) => { if (!answers.has(i)) { padState(i, 'idle', winner == null ? '—' : 'KALAH CEPAT', winner == null ? 'Tidak menjawab' : 'Sudah direbut lawan'); $('pad' + i).querySelectorAll('.pb').forEach((b) => (b.disabled = true)); } });

    // 2) Pemenang ronde
    let res = null;
    if (winner != null) {
      const p = P[winner]; const a = answers.get(winner);
      p.correct++; p.fastest++; p.totalTime += a.t; p.streak++;
      let d = mod && mod.win ? mod.win : 3; let hyper = false; const tags = [];
      if (p.streak >= 3) { d += 2; p.streak = 0; hyper = true; tags.push('HYPERDRIVE'); }
      const last = P.length > 1 && P.every((x, j) => j === winner || x.pos > p.pos);
      if (last) { d += 1; tags.push('KEJAR +1'); }
      res = { delta: d, hyper, cls: 'best' };
      padState(winner, 'best', `+${d}`, `${tags.length ? tags.join(' • ') : 'TERCEPAT!'} • ${a.t.toFixed(1)} dtk`);
      retrigger($('pad' + winner), 'flash-good'); QC.sfx.correct();
      FX.burstAt($('pad' + winner), { emojis: ['★', '✦', '●'], color: ['#fde047', '#ffffff', p.color], count: 20, spread: 150, size: 18 });
      $('qStatus').textContent = `Ronde ${round} • ${p.name} merebut poin dalam ${a.t.toFixed(1)} detik!`;
      if (hyper) { warp(true); FX.flash('rgba(34,211,238,.35)', 500); FX.announce('HYPERDRIVE', { color: '#0891b2', sub: `${esc(p.name)} melesat secepat cahaya!`, dur: 1300 }); }
      else FX.announce(`${esc(p.name)} TERCEPAT!`, { color: p.color, sub: last ? `Dari posisi buncit — bonus KEJAR +1!` : `Benar dalam ${a.t.toFixed(1)} detik`, dur: 1100 });
    } else {
      QC.sfx.magic();
      $('qStatus').textContent = `Ronde ${round} • tidak ada yang benar`;
    }

    // 3) Gerakan roket (pemenang + meteor yang masih berjalan)
    if (res) pending.push(move(winner, res));
    await Promise.all(pending); pending = [];
    if (res && res.hyper) warp(false);

    // 4) Kejadian di lintasan
    for (let i = 0; i < P.length; i++) await checkEvent(i);
    render();

    // 5) Juara?
    if (P.some((p) => p.pos >= S.target)) { finish(); return; }

    // 5b) Pemimpin baru & putaran terakhir
    const top = Math.max(...P.map((p) => p.pos));
    const leaders = P.filter((p) => p.pos === top);
    if (top > 0 && leaders.length === 1 && leaders[0] !== leader && P.length > 1) {
      const L = leaders[0]; const prev = leader; leader = L;
      QC.sfx.magic(); FX.ringAt($('rk' + P.indexOf(L)), '#facc15', 200);
      await withTimeout(FX.announce(`${esc(L.name)} MEMIMPIN!`, { color: L.color, sub: prev ? `Menyalip ${esc(prev.name)}!` : 'Roket terdepan saat ini', dur: 1200 }), 1500);
    }
    if (!finalShown && top >= S.target - 3) {
      finalShown = true; document.body.classList.add('final');
      FX.flash('rgba(250,204,21,.3)', 500);
      await withTimeout(FX.announce('PUTARAN TERAKHIR!', { color: '#b45309', sub: `Tinggal ${S.target - top} langkah lagi menuju planet!`, dur: 1400 }), 1700);
    }

    // 6) Latihan astronot untuk yang salah
    const losers = wrongs.filter((i) => !P[i].cpu).map((i) => P[i]); wrongs = [];
    if (S.punish === 'on' && losers.length) {
      await QC.sleep(500);
      const c = QC.pick(PUNISH);
      await QC.punish({ icon: '☄️', title: 'HUKUMAN!', sub: `${losers.map(QC.chip).join(' ')}<br>Jawaban kalian salah. Lakukan bersama-sama:`, text: c.t, seconds: c.s || 0 });
    }
    phase = 'reveal'; setNext('RONDE BERIKUTNYA');
  }

  async function move(i, r) {
    const p = P[i]; const rk = $('rk' + i);
    if (!r.delta && r.cls !== 'bad') return;
    if (r.delta > 0) {
      rk.classList.add('boost'); QC.sfx.whoosh();
      const trail = setInterval(() => { const b = rk.getBoundingClientRect(); FX.burst(b.left + 10, b.top + b.height / 2, { emojis: ['●', '•'], color: ['#fde047', '#fb923c', '#ffffff', p.color], count: 2, spread: 22, size: 12, gravity: 10, dur: 600 }); }, 55);
      p.pos = Math.min(S.target, p.pos + r.delta); render();
      FX.floatTextAt(rk, `+${r.delta}`, '#4ade80', 26);
      await QC.sleep(1150); clearInterval(trail); rk.classList.remove('boost');
    } else {
      await meteor(i, r.blocked);
      if (r.blocked) {
        p.shield = false; render(); FX.floatTextAt(rk, 'PERISAI!', '#7dd3fc', 24);
        FX.burstAt(rk, { emojis: ['◆', '●'], color: ['#7dd3fc', '#e0f2fe', '#38bdf8'], count: 18, spread: 110, size: 14 });
        await QC.sleep(600);
      } else if (r.delta) { p.pos = Math.max(0, p.pos + r.delta); render(); FX.floatTextAt(rk, `${r.delta}`, '#f87171', 26); await QC.sleep(1150); }
    }
  }

  async function meteor(i, blocked = false) {
    const rk = $('rk' + i); const c = FX.center(rk);
    const m = document.createElement('div'); m.className = 'meteor'; m.innerHTML = METEOR; document.body.appendChild(m);
    await withTimeout(m.animate([{ transform: `translate(${c.x + 360}px, ${c.y - 280}px) rotate(-38deg)` }, { transform: `translate(${c.x}px, ${c.y}px) rotate(-38deg)` }], { duration: 620 + Math.random() * 200, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}), 1100);
    m.remove();
    if (blocked) { QC.sfx.pop(); FX.ring(c.x, c.y, '#38bdf8', 190); return; }
    QC.sfx.boom(); rk.classList.add('hit');
    FX.burst(c.x, c.y, { emojis: ['●', '◆', '•'], color: ['#f97316', '#fbbf24', '#78716c', '#ef4444'], count: 22, spread: 110, size: 15 });
    FX.ring(c.x, c.y, '#f97316', 170); FX.shake($('track'), 8, 450);
    setTimeout(() => rk.classList.remove('hit'), 700);
  }

  async function checkEvent(i) {
    const p = P[i]; const ev = events[p.pos]; const rk = $('rk' + i);
    if (!ev || p.pos >= S.target) return;
    if (ev === 'star') {
      QC.sfx.magic(); FX.burstAt(rk, { emojis: ['★', '✦'], color: ['#fde047', '#ffffff'], count: 16, spread: 120, size: 20 });
      FX.floatTextAt(rk, 'BINTANG TURBO +2', '#fde047', 20);
      p.pos = Math.min(S.target, p.pos + 2); rk.classList.add('boost'); render(); await QC.sleep(1150); rk.classList.remove('boost');
    } else if (ev === 'shield') {
      if (p.shield) return;
      QC.sfx.magic(); p.shield = true; render();
      FX.ringAt(rk, '#38bdf8', 170); FX.floatTextAt(rk, 'PERISAI DIDAPAT!', '#7dd3fc', 20);
      await QC.sleep(700);
    } else {
      QC.sfx.wrong(); FX.flash('rgba(76,29,149,.35)', 600); rk.classList.add('suck');
      FX.floatTextAt(rk, 'LUBANG HITAM −2', '#c084fc', 20);
      await QC.sleep(1000); rk.classList.remove('suck');
      p.pos = Math.max(0, p.pos - 2); render(); await QC.sleep(1100);
    }
  }

  async function finish() {
    phase = 'over'; render();
    const ranking = [...P].sort((a, b) => b.pos - a.pos || b.fastest - a.fastest || b.correct - a.correct || a.totalTime - b.totalTime);
    const w = ranking[0];
    FX.burstAt(document.querySelector('.finish .planet'), { emojis: ['★', '✦', '●'], color: ['#fde047', '#f59e0b', '#ffffff', w.color], count: 30, spread: 200, size: 20 });
    FX.ringAt(document.querySelector('.finish .planet'), '#facc15', 320);
    await FX.announce(`${esc(w.name)} MENDARAT!`, { color: w.color, sub: 'Roket pertama yang mencapai planet tujuan', dur: 1600 });
    const r = await QC.showWinner({
      title: `${w.avatar} ${esc(w.name)} JUARA!`, note: `Balapan selesai dalam ${round} ronde`,
      ranking: ranking.map((p) => ({ player: p, value: `${Math.min(p.pos, S.target)}/${S.target} · ${p.correct}✓ · ${p.fastest}⚡` }))
    });
    if (r === 'setup') openSetup(); else newGame();
  }

  /* ------------------------------ Kontrol ------------------------------ */
  $('btnNext').onclick = () => startRound();
  QC.onKey = (e) => {
    if (phase === 'question') {
      const key = e.key.toLowerCase();
      P.forEach((p, i) => { if (p.cpu || !KEYS[i]) return; const idx = KEYS[i].indexOf(key); if (idx >= 0 && idx < keys.length) { e.preventDefault(); lock(i, keys[idx]); } });
    } else if ((e.code === 'Space' || e.key === 'Enter') && (phase === 'ready' || phase === 'reveal')) { e.preventDefault(); startRound(); }
  };
  $('btnRestart').onclick = async () => {
    if (QC.isBusy() || phase === 'countdown' || phase === 'resolving') return;
    const paused = phase === 'question';
    const v = await QC.modal({ icon: '🔄', title: 'Ulangi balapan?', html: '<p class="qc-muted">Semua roket kembali ke landasan.</p>', buttons: [{ label: 'Batal', value: null }, { label: 'Ubah Pemain', value: 'setup' }, { label: 'Ulang', value: 'again', primary: true }] });
    if (v === 'again') newGame(); else if (v === 'setup') openSetup(); else if (paused && phase === 'question') { /* lanjut */ }
  };

  openSetup();
})();
