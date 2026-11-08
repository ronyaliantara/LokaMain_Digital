/* ==========================================================================
   Arena Duel Pintar — KUIS REBUTAN SERENTAK (pertarungan)
   - Satu soal untuk SEMUA petarung sekaligus. Tiap petarung punya pad jawaban
     sendiri (layar sentuh) dan tombol keyboard sendiri.
   - Rebutan: yang pertama menjawab BENAR langsung menyerang (ronde selesai).
     Serangan −1 HP, jawab dalam 1/3 waktu pertama = CRITICAL (−2).
     2x menang beruntun = PERISAI (menahan 1 serangan), 3x = ULTIMATE (semua lawan).
   - Salah: langsung kena serangan balik −1 HP & terkunci di ronde itu;
     petarung lain masih bisa merebut.
   - HP habis = K.O. Petarung terakhir yang bertahan = JUARA.
   - Main sendiri? Lawan BOSS Raja Lupa (menjawab otomatis).
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
  const SND_ON = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  const SND_OFF = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>';
  const LOGO = '<svg viewBox="0 0 64 64"><use href="#ico-swords"/></svg>';
  const BOLT = '<svg viewBox="0 0 40 120" preserveAspectRatio="none"><path d="M24 0 L8 52 H20 L10 120 L34 44 H22 L32 0 Z" fill="#fde68a" stroke="#f43f5e" stroke-width="3" stroke-linejoin="round"/></svg>';

  const PUNISH = [
    { t: 'Lakukan <b>10x pukulan tinju</b> ke udara sambil berteriak "HIYAA!"' },
    { t: '<b>Tendangan karate</b> 5x ke kanan dan 5x ke kiri!' },
    { t: '<b>Lari di tempat</b> secepat mungkin!', s: 10 },
    { t: 'Tahan posisi <b>plank</b> (papan) seperti petarung sejati!', s: 10 },
    { t: 'Lakukan <b>5x squat jump</b>!' },
    { t: 'Berpose <b>"kalah" paling dramatis</b>, lalu bangkit sambil berkata "Aku belum menyerah!"' },
    { t: 'Peragakan <b>jurus naga</b> lengkap dengan suara efeknya!' },
    { t: 'Tahan <b>kuda-kuda silat</b> dengan tangan siap menangkis!', s: 10 }
  ];

  let F = []; let S = {}; let solo = false; let round = 0; let phase = 'idle'; let token = 0;
  let q = null; let keys = []; let qStart = 0; let timerIv = null; let cpuTimers = [];
  let answers = new Map(); let pending = []; let wrongs = []; let koQueue = [];

  QC.init({ gameId: 'arena-duel', title: 'Arena Duel Pintar', avatars: ['🥷', '🧙', '🦸', '🤖', '🐲', '🦖', '🧛', '🐺'], colors: ['#38bdf8', '#f43f5e', '#4ade80', '#c084fc'] });

  /* ------------------------------ Suara ------------------------------ */
  function syncSound() { $('btnSound').innerHTML = QC.muted ? SND_OFF : SND_ON; }
  $('btnSound').onclick = () => { QC.muted = !QC.muted; try { localStorage.setItem('lokamain_muted', JSON.stringify(QC.muted)); } catch (e) { /* abaikan */ } syncSound(); QC.sfx.click(); };
  syncSound();

  /* ------------------------------ Setup ------------------------------ */
  async function openSetup() {
    stopRound(); phase = 'idle';
    const r = await QC.setup({
      logo: LOGO, subtitle: 'Duel kuis rebutan! Siapa pertama menjawab benar, dia yang menyerang!',
      min: 1, max: 4, defaultCount: 2, soloLabel: '1 vs BOSS',
      defaultNames: ['Ninja Biru', 'Pendekar Merah', 'Ksatria Hijau', 'Penyihir Ungu'],
      settings: [
        { key: 'hp', label: 'HP tiap petarung', value: 5, options: [[3, '3 HP (kilat)'], [5, '5 HP'], [7, '7 HP'], [10, '10 HP (panjang)']] },
        { key: 'timer', label: 'Waktu menjawab', value: 15, options: [[10, '10 detik'], [15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [0, 'Tanpa batas']] },
        { key: 'boss', label: 'HP BOSS (main sendiri)', value: 10, options: [[6, '6 HP (mudah)'], [10, '10 HP (sedang)'], [15, '15 HP (sulit)']] },
        { key: 'bosslvl', label: 'Kecerdasan BOSS', value: 0.6, options: [[0.45, 'Ceroboh (±45% benar)'], [0.6, 'Normal (±60% benar)'], [0.75, 'Jenius (±75% benar)']] },
        { key: 'punish', label: 'Latihan petarung', value: 'on', options: [['on', 'Aktif'], ['off', 'Nonaktif']] }
      ],
      rulesHtml: `<ul>
        <li>Satu soal muncul untuk <b>semua petarung sekaligus</b>. Jawab di pad warnamu (sentuh) atau tombol keyboard-mu.</li>
        <li>Keyboard: P1 <b>1 2 3 4</b> • P2 <b>7 8 9 0</b> • P3 <b>Z X C V</b> • P4 <b>N M , .</b></li>
        <li><b>Rebutan!</b> Yang pertama menjawab <b>benar</b> langsung <b>menyerang</b> (−1 HP). Jawab dalam sepertiga waktu pertama = <b>CRITICAL</b> (−2 HP).</li>
        <li>Menang ronde <b>2x beruntun</b> = <b>PERISAI</b> penahan 1 serangan. <b>3x beruntun</b> = <b>ULTIMATE</b> menyerang semua lawan!</li>
        <li><b>Salah</b> = langsung kena <b>serangan balik −1 HP</b> & terkunci di ronde itu — petarung lain masih bisa merebut. Yang salah melakukan <b>latihan petarung</b> bersama.</li>
        <li>HP habis = <b>K.O.</b> Petarung terakhir yang bertahan = <b>JUARA</b>. Main sendiri? Kalahkan <b>BOSS Raja Lupa</b>!</li></ul>`
    });
    S = r.settings; solo = r.players.length === 1;
    F = r.players.map((p) => ({ ...p, cpu: false }));
    if (solo) F.push({ id: 1, name: 'BOSS Raja Lupa', avatar: '👾', color: '#a855f7', cpu: true, boss: true });
    newGame();
  }

  function newGame() {
    stopRound(); token++;
    F.forEach((f) => Object.assign(f, { max: f.boss ? S.boss : S.hp, hp: f.boss ? S.boss : S.hp, shield: false, streak: 0, correct: 0, wins: 0, ko: false, koAt: 0 }));
    round = 0; phase = 'ready'; koQueue = []; wrongs = []; pending = [];
    buildArena(); buildPads(); render(true);
    idleCard(solo ? 'BOSS menantang!' : 'Petarung siap di arena', 'Tekan <b>MULAI RONDE</b>. Rebutan! Yang pertama menjawab benar langsung menyerang. Salah? Langsung kena serangan balik!', 'MULAI RONDE');
    document.querySelectorAll('.fig').forEach((el, k) => {
      const right = el.closest('.col').classList.contains('right');
      el.animate([{ transform: `translateX(${right ? 160 : -160}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, delay: k * 140, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'backwards' });
    });
    if (solo) FX.announce('BOSS BATTLE', { color: '#7c3aed', sub: 'BOSS Raja Lupa memasuki arena!', dur: 1600 });
    else FX.announce('ARENA DUEL', { color: '#be123c', sub: `${F.length} petarung • ${S.hp} HP masing-masing`, dur: 1500 });
  }

  /* ------------------------------ Bangun tampilan ------------------------------ */
  function buildArena() {
    const n = F.length; const box = $('fighters'); box.style.setProperty('--n', n);
    $('arena').classList.toggle('duo', n === 2);
    box.innerHTML = F.map((f, i) => {
      const right = i >= Math.ceil(n / 2);
      return `<div class="col ${right ? 'right' : ''} ${f.boss ? 'is-boss' : ''}" id="col${i}" style="--pc:${f.color}">
        <div class="hud">
          <div class="hud-top"><span class="av">${f.avatar}</span><b class="nm">${esc(f.name)}</b><span class="tag">${f.boss ? 'BOSS' : 'P' + (i + 1)}</span></div>
          <div class="hp" style="--max:${f.max}"><i class="ghost" id="hg${i}"></i><i class="fill" id="hf${i}"></i><span class="ticks"></span></div>
          <div class="hud-bot"><span class="hpn" id="hn${i}"></span><span class="shield-ico" id="sh${i}" title="Perisai"><svg viewBox="0 0 24 24"><use href="#ico-shield"/></svg></span><span class="streak" id="st${i}" title="Kemenangan beruntun"><i></i><i></i><i></i></span></div>
        </div>
        <div class="fig" id="fg${i}">
          <div class="aura"></div>
          <div class="body" id="bd${i}"><div class="flip"><svg class="sprite" viewBox="${f.boss ? '0 0 160 170' : '0 0 120 150'}"><use href="#${f.boss ? 'boss' : 'fighter'}"/></svg></div></div>
          <div class="ko-tag">K.O.</div>
        </div>
      </div>`;
    }).join('');
  }
  function buildPads() {
    const pads = $('pads'); pads.style.setProperty('--n', F.length);
    pads.innerHTML = F.map((f, i) => `<div class="pad ${f.cpu ? 'cpu' : ''}" id="pad${i}" style="--pc:${f.color}">
      <div class="pad-head"><span class="av">${f.avatar}</span><b>${esc(f.name)}</b><span class="keys">${f.cpu ? 'OTOMATIS' : KEYS[i].map((k) => k.toUpperCase()).join(' ')}</span></div>
      <div class="pad-btns" id="pbs${i}"></div>
      <div class="pad-state on idle" id="ps${i}"><b>SIAP</b><small>Menunggu soal</small></div></div>`).join('');
  }
  function render(instant = false) {
    F.forEach((f, i) => {
      const pct = Math.max(0, (f.hp / f.max) * 100) + '%';
      const fill = $('hf' + i); const ghost = $('hg' + i);
      if (instant) { fill.classList.add('instant'); ghost.classList.add('instant'); }
      fill.style.width = pct; ghost.style.width = pct;
      if (instant) { void fill.offsetWidth; fill.classList.remove('instant'); ghost.classList.remove('instant'); }
      const col = $('col' + i);
      col.classList.toggle('low', !f.ko && f.hp / f.max <= 0.34);
      col.classList.toggle('ko', f.ko);
      col.classList.toggle('shielded', f.shield);
      $('hn' + i).textContent = `HP ${f.hp}/${f.max}`;
      [...$('st' + i).children].forEach((x, k) => x.classList.toggle('on', k < f.streak));
    });
    $('roundNo').textContent = round;
    $('aliveNo').textContent = F.filter((f) => !f.ko).length;
  }
  function padState(i, cls, title = '', sub = '') {
    const s = $('ps' + i);
    if (!cls) { s.className = 'pad-state'; return; }
    s.className = `pad-state on ${cls}`; s.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
  }
  function setNext(label) { const b = $('btnNext'); b.innerHTML = `${label} <small>Spasi / Enter</small>`; b.hidden = false; }
  function idleCard(cat, text, btn) {
    $('qCat').textContent = cat; $('qStatus').textContent = ''; $('qText').innerHTML = text; $('qOpts').innerHTML = ''; $('qExp').innerHTML = '';
    $('tNum').textContent = '–'; $('tRing').style.strokeDashoffset = 0; $('qTimer').classList.remove('hurry'); setNext(btn);
    F.forEach((f, i) => { if (f.ko) padState(i, 'ko', 'K.O.', 'Tidak bisa menjawab'); else padState(i, 'idle', 'SIAP', 'Menunggu soal'); });
  }
  function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  const critTime = () => (S.timer ? S.timer / 3 : 5);
  const canAnswer = () => F.filter((f, i) => !f.ko && !answers.has(i));
  const gameDecided = () => (solo ? F.some((f) => f.ko) : F.filter((f) => !f.ko).length <= 1);

  /* ------------------------------ Alur ronde ------------------------------ */
  function stopRound() { clearInterval(timerIv); cpuTimers.forEach(clearTimeout); cpuTimers = []; }

  async function startRound() {
    if (phase !== 'ready' && phase !== 'reveal') return;
    q = QC.nextQuestion();
    if (!q) { QC.toast('Bank soal kosong — tambahkan soal di Mode Guru.', 'bad'); return; }
    const tok = token;
    phase = 'countdown'; $('btnNext').hidden = true;
    round++; render(); keys = QC.optionsOf(q); answers = new Map(); pending = []; wrongs = []; koQueue = [];
    F.forEach((f, i) => { $('pad' + i).classList.remove('picked'); padState(i, f.ko ? 'ko' : 'idle', f.ko ? 'K.O.' : 'BERSIAP', f.ko ? 'Tidak bisa menjawab' : 'Soal segera muncul'); });
    $('qCat').textContent = q.category; $('qStatus').textContent = `Ronde ${round}`; $('qText').textContent = ''; $('qOpts').innerHTML = ''; $('qExp').innerHTML = '';
    FX.announce(`ROUND ${round}`, { color: '#7c3aed', sub: 'BERSIAP… FIGHT!', dur: 1300 });
    await countdown();
    if (tok !== token || phase !== 'countdown') return;
    showQuestion();
  }

  async function countdown() {
    const c = $('countdown'); c.classList.add('on');
    for (const t of ['3', '2', '1', 'FIGHT!']) {
      c.innerHTML = `<span class="${t.length > 1 ? 'word' : ''}">${t}</span>`;
      if (t.length > 1) { QC.sfx.hit(); FX.flash('rgba(255,255,255,.25)', 250); } else QC.sfx.tick();
      await QC.sleep(t.length > 1 ? 550 : 700);
    }
    c.classList.remove('on');
  }

  function showQuestion() {
    phase = 'question';
    const qt = $('qText'); qt.textContent = q.question; retrigger(qt, 'in');
    $('qOpts').innerHTML = keys.map((k, n) => `<div class="opt" id="opt${k}" style="--oc:${OC[k]};--i:${n}"><span class="shape">${shape(k)}</span><span>${esc(q['option' + k])}</span><span class="who"></span></div>`).join('');
    F.forEach((f, i) => {
      const box = $('pbs' + i); box.style.setProperty('--k', keys.length);
      box.innerHTML = keys.map((k) => `<button class="pb" data-k="${k}" style="--oc:${OC[k]}" ${f.cpu || f.ko ? 'disabled' : ''}>${shape(k)}<span>${f.cpu ? k : KEYS[i][keys.indexOf(k)].toUpperCase()}</span></button>`).join('');
      box.querySelectorAll('.pb').forEach((b) => (b.onclick = () => lock(i, b.dataset.k)));
      if (f.ko) padState(i, 'ko', 'K.O.', 'Tidak bisa menjawab');
      else if (f.cpu) padState(i, 'idle', 'MENGHITUNG…', 'BOSS sedang berpikir');
      else padState(i, null);
      if (f.cpu && !f.ko) {
        const span = S.timer ? S.timer * 1000 * 0.75 : 8000;
        const k = Math.random() < (S.bosslvl || 0.6) ? q.correct : QC.pick(keys.filter((x) => x !== q.correct));
        cpuTimers.push(setTimeout(() => lock(i, k), 2500 + Math.random() * span));
      }
    });
    qStart = performance.now(); startTimer();
    $('qStatus').textContent = `Ronde ${round} • rebutan! Jawab secepatnya`;
  }

  function startTimer() {
    const T = S.timer; const ring = $('tRing'); const num = $('tNum'); const box = $('qTimer');
    box.classList.remove('hurry'); ring.style.strokeDashoffset = 0;
    if (!T) { num.textContent = '∞'; return; }
    let last = T; num.textContent = T;
    timerIv = setInterval(() => {
      const left = Math.max(0, T - (performance.now() - qStart) / 1000);
      ring.style.strokeDashoffset = 119.4 * (1 - left / T);
      box.classList.toggle('crit', T - left <= critTime());
      const s = Math.ceil(left);
      if (s !== last) { last = s; num.textContent = s; if (s <= 5 && s > 0) { QC.sfx.tick(); box.classList.add('hurry'); } }
      if (left <= 0) endQuestion(null);
    }, 100);
  }

  /* Rebutan: jawaban langsung dinilai saat itu juga.
     - Benar pertama  → ronde langsung berakhir, petarung itu menyerang.
     - Salah          → langsung kena serangan balik −1 HP & terkunci; petarung lain tetap boleh merebut.
     - Semua salah / waktu habis → ronde berakhir tanpa pemenang. */
  function lock(i, k) {
    if (phase !== 'question' || answers.has(i) || F[i].ko || !keys.includes(k)) return;
    const t = (performance.now() - qStart) / 1000; answers.set(i, { k, t });
    const pad = $('pad' + i); pad.classList.add('picked');
    pad.querySelectorAll('.pb').forEach((b) => { b.disabled = true; if (b.dataset.k === k) b.classList.add('mine'); });
    if (k === q.correct) { endQuestion(i); return; }
    // Salah: serangan balik instan
    const f = F[i]; f.streak = 0; wrongs.push(i);
    padState(i, 'bad', 'SALAH!', `Serangan balik −1 HP • ${t.toFixed(1)} dtk`);
    retrigger(pad, 'flash-bad'); QC.sfx.wrong();
    const tok = token;
    const pr = counterHit(i).then(() => { if (tok === token && phase === 'question' && gameDecided()) endQuestion(null); });
    pending.push(pr);
    const left = canAnswer().length;
    $('qStatus').textContent = left ? `Ronde ${round} • ${f.name} salah! ${left} petarung masih bisa merebut` : `Ronde ${round} • semua salah`;
    if (!left) setTimeout(() => endQuestion(null), 300);
  }

  async function endQuestion(winner = null) {
    if (phase !== 'question') return;
    phase = 'resolving'; stopRound(); $('qTimer').classList.remove('hurry', 'crit');
    const tok = token;

    // 1) Buka jawaban
    keys.forEach((k) => $('opt' + k).classList.add(k === q.correct ? 'correct' : 'dim'));
    answers.forEach((a, i) => $('opt' + a.k).querySelector('.who').insertAdjacentHTML('beforeend', `<i style="--pc:${F[i].color}" title="${esc(F[i].name)}">${F[i].avatar}</i>`));
    FX.ringAt($('opt' + q.correct), '#1fb36b', 280);
    if (q.explanation) $('qExp').innerHTML = `<b>Pembahasan:</b> ${esc(q.explanation)}`;
    F.forEach((f, i) => {
      $('pad' + i).querySelectorAll('.pb').forEach((b) => (b.disabled = true));
      if (answers.has(i)) return;
      if (f.ko) padState(i, 'ko', 'K.O.', 'Tidak bisa menjawab');
      else padState(i, 'idle', winner == null ? '—' : 'KALAH CEPAT', winner == null ? 'Tidak menjawab' : 'Sudah direbut lawan');
    });

    // 2) Tunggu serangan balik yang masih berjalan
    await Promise.all(pending); pending = [];
    if (tok !== token) return;

    // 3) Pemenang ronde menyerang
    if (winner != null && !F[winner].ko && !gameDecided()) await attackFrom(winner);
    else if (winner == null) {
      $('qStatus').textContent = `Ronde ${round} • tidak ada yang menjawab benar`;
      if (!koQueue.length) { QC.sfx.magic(); await FX.announce('TIDAK ADA SERANGAN', { color: '#475569', sub: 'Tidak ada yang menjawab benar', dur: 1100 }); }
    }
    if (tok !== token) return;
    render();

    // 4) K.O.!
    if (koQueue.length) {
      const names = koQueue.map((f) => esc(f.name)).join(' & '); koQueue = [];
      QC.sfx.boom(); FX.flash('rgba(244,63,94,.4)', 600);
      await FX.announce('K.O.!', { color: '#be123c', sub: `${names} tumbang!`, dur: 1400 });
      if (tok !== token) return;
    }

    // 5) Selesai?
    if (checkEnd()) return;

    // 6) Latihan petarung untuk yang salah
    const losers = wrongs.filter((i) => !F[i].cpu).map((i) => F[i]); wrongs = [];
    if (S.punish === 'on' && losers.length) {
      await QC.sleep(450);
      const c = QC.pick(PUNISH);
      await QC.punish({ icon: '🥊', title: 'LATIHAN PETARUNG', sub: `${losers.map(QC.chip).join(' ')}<br>Jawaban meleset! Perkuat diri kalian bersama-sama:`, text: c.t, seconds: c.s || 0 });
      if (tok !== token) return;
    }
    phase = 'reveal'; setNext('RONDE BERIKUTNYA');
  }

  /* ------------------------------ Serangan ------------------------------ */
  async function attackFrom(w) {
    const me = F[w]; const a = answers.get(w); const tok = token;
    me.correct++; me.wins++; me.streak++;
    F.forEach((f, j) => { if (j !== w) f.streak = 0; });
    const crit = a.t <= critTime(); const dmg = crit ? 2 : 1;
    let gotShield = false;
    if (me.streak === 2 && !me.shield) { me.shield = true; gotShield = true; }
    const ult = me.streak >= 3;
    const foes = F.filter((f, j) => j !== w && !f.ko);
    padState(w, 'best', crit ? 'CRITICAL!' : 'SERANG!', `Benar • ${a.t.toFixed(1)} dtk`);
    retrigger($('pad' + w), 'flash-good'); QC.sfx.correct();
    FX.burstAt($('pad' + w), { emojis: ['★', '✦', '●'], color: ['#fde047', '#ffffff', me.color], count: 18, spread: 140, size: 18 });
    $('qStatus').textContent = `Ronde ${round} • ${me.name} merebut serangan dalam ${a.t.toFixed(1)} detik!`;
    render();
    if (gotShield) { FX.ringAt($('fg' + w), '#38bdf8', 260); FX.floatTextAt($('fg' + w), 'PERISAI!', '#7dd3fc', 24); QC.sfx.magic(); }

    if (ult) {
      me.streak = 0; render();
      FX.flash('rgba(253,224,71,.5)', 600); QC.sfx.magic();
      await FX.announce('ULTIMATE!', { color: '#ca8a04', sub: `${esc(me.name)} menyerang semua lawan${crit ? ' • CRITICAL' : ''}!`, dur: 1300 });
      if (tok !== token) return;
      lunge(w, F.indexOf(foes[0]));
      await QC.sleep(200);
      await Promise.all(foes.map((f, n) => QC.sleep(n * 120).then(() => projectile(w, F.indexOf(f), 'ult')).then(() => damage(F.indexOf(f), dmg, crit ? 'CRITICAL' : ''))));
      return;
    }

    const title = crit ? 'CRITICAL!' : `${esc(me.name)} MENYERANG!`;
    const sub = `Benar dalam ${a.t.toFixed(1)} detik${gotShield ? ' • dapat PERISAI' : ''}${crit ? ' • serangan −2 HP' : ''}`;
    await FX.announce(title, { color: crit ? '#f59e0b' : me.color, sub, dur: 1050 });
    if (tok !== token) return;
    let target;
    if (foes.length === 1 || me.cpu) target = foes.length === 1 ? foes[0] : QC.pick(foes);
    else target = await QC.choosePlayer({ icon: '🎯', title: 'Pilih lawan yang diserang', sub: `${QC.chip(me)} menyerang −${dmg} HP${crit ? ' (CRITICAL)' : ''} • tekan angka 1–${foes.length}`, players: foes });
    if (tok !== token) return;
    const ti = F.indexOf(target);
    lunge(w, ti); await QC.sleep(200);
    await projectile(w, ti, crit ? 'crit' : me.boss ? 'boss' : 'normal');
    await damage(ti, dmg, crit ? 'CRITICAL' : '');
  }

  function lunge(a, b) {
    const A = FX.center($('fg' + a)); const B = FX.center($('fg' + b));
    const dx = Math.max(-120, Math.min(120, (B.x - A.x) * 0.25));
    QC.sfx.whoosh();
    return $('bd' + a).animate([
      { transform: 'none' }, { transform: `translateX(${-dx * 0.25}px) scale(.96)`, offset: 0.3 },
      { transform: `translateX(${dx}px) scale(1.07)`, offset: 0.6 }, { transform: 'none' }
    ], { duration: 520, easing: 'ease-out' }).finished.catch(() => {});
  }

  function projectile(a, b, kind) {
    const ra = $('bd' + a).getBoundingClientRect(); const rb = $('bd' + b).getBoundingClientRect();
    const right = $('col' + a).classList.contains('right');
    const x0 = ra.left + ra.width * (right ? 0.15 : 0.85); const y0 = ra.top + ra.height * 0.38;
    const x1 = rb.left + rb.width / 2; const y1 = rb.top + rb.height * 0.45;
    const p = document.createElement('div'); p.className = `proj ${kind}`; p.style.setProperty('--pc', F[a].color);
    p.style.left = x0 + 'px'; p.style.top = y0 + 'px'; document.body.appendChild(p);
    const col = kind === 'ult' ? ['#fde047', '#fbbf24', '#ffffff'] : kind === 'crit' ? ['#fde047', '#ffffff', F[a].color] : [F[a].color, '#ffffff'];
    const trail = setInterval(() => { const r = p.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, { emojis: ['●', '•', '✦'], color: col, count: 2, spread: 22, size: 12, gravity: 8, dur: 450 }); }, 40);
    const dx = x1 - x0; const dy = y1 - y0; const arc = kind === 'ult' ? -90 : -40;
    return p.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.6 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 + arc}px)) scale(1.25)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1 }
    ], { duration: kind === 'ult' ? 620 : 480, easing: 'cubic-bezier(.5,0,.8,.6)' }).finished.catch(() => {}).then(() => { clearInterval(trail); p.remove(); });
  }

  /* Serangan balik (jawaban salah): petir menyambar petarung itu sendiri. */
  async function counterHit(i) {
    const fig = $('fg' + i); const r = $('bd' + i).getBoundingClientRect();
    const b = document.createElement('div'); b.className = 'bolt'; b.innerHTML = BOLT;
    b.style.left = r.left + r.width / 2 + 'px'; b.style.top = r.top + r.height * 0.5 + 'px'; b.style.height = Math.max(120, r.top + r.height * 0.5) + 'px';
    document.body.appendChild(b);
    await b.animate([{ transform: 'translate(-50%,-100%) scaleY(0)', opacity: 1 }, { transform: 'translate(-50%,-100%) scaleY(1)', opacity: 1, offset: 0.45 }, { transform: 'translate(-50%,-100%) scaleY(1)', opacity: 0 }], { duration: 380, easing: 'ease-in' }).finished.catch(() => {});
    b.remove();
    FX.floatTextAt(fig, 'SERANGAN BALIK', '#fda4af', 18);
    await damage(i, 1, '');
  }

  async function damage(i, amount, label) {
    const f = F[i]; const fig = $('fg' + i);
    if (f.ko) return;
    if (f.shield && amount > 0) {
      f.shield = false; amount--; QC.sfx.pop();
      FX.ringAt(fig, '#38bdf8', 260); FX.floatTextAt(fig, 'PERISAI MENAHAN!', '#7dd3fc', 22);
      FX.burstAt(fig, { emojis: ['◆', '✦'], color: ['#38bdf8', '#e0f2fe'], count: 14, spread: 110, size: 16 });
      render();
      if (amount <= 0) { await QC.sleep(600); return; }
      await QC.sleep(250);
    }
    f.hp = Math.max(0, f.hp - amount); render();
    retrigger(fig, 'hit'); QC.sfx.hit();
    FX.flash('rgba(255,255,255,.35)', 200); FX.shake($('arena'), 8 + amount * 4, 420);
    FX.burstAt(fig, { emojis: ['✦', '●', '◆'], color: ['#fde047', '#fb923c', '#ffffff', f.color], count: 12 + amount * 6, spread: 110 + amount * 30, size: 16 });
    FX.ringAt(fig, label ? '#fde047' : '#f43f5e', 200 + amount * 40);
    FX.floatTextAt(fig, `−${amount}${label ? ' ' + label : ''}`, label ? '#fde047' : '#f87171', label ? 30 : 28);
    await QC.sleep(560);
    if (f.hp <= 0 && !f.ko) {
      f.ko = true; f.koAt = performance.now(); f.shield = false; f.streak = 0; koQueue.push(f);
      QC.sfx.boom(); FX.burstAt(fig, { emojis: ['✦', '●', '★'], color: ['#f43f5e', '#fde047', '#ffffff'], count: 26, spread: 190, size: 18 });
      FX.ringAt(fig, '#f43f5e', 300); render();
      padState(i, 'ko', 'K.O.', 'HP habis — tidak bisa menjawab');
      $('pad' + i).querySelectorAll('.pb').forEach((x) => (x.disabled = true));
      await QC.sleep(450);
    }
  }

  /* ------------------------------ Akhir permainan ------------------------------ */
  function checkEnd() {
    if (solo) {
      const me = F[0]; const boss = F[1];
      if (me.ko) { finish(null, boss.ko ? 'DOUBLE K.O.! Kamu dan BOSS tumbang bersamaan… coba lagi!' : 'Kamu dikalahkan BOSS Raja Lupa… coba lagi!'); return true; }
      if (boss.ko) { finish(me, 'BOSS Raja Lupa berhasil dikalahkan!'); return true; }
      return false;
    }
    const living = F.filter((f) => !f.ko);
    if (living.length <= 1) { finish(living[0] || null, living.length ? 'Petarung terakhir yang bertahan di arena!' : 'DOUBLE K.O.! Semua petarung tumbang bersamaan.'); return true; }
    return false;
  }

  async function finish(winner, note) {
    phase = 'over'; render(); const tok = token;
    const ranking = [...F].sort((a, b) => (a.ko - b.ko) || (b.hp - a.hp) || ((b.koAt || 0) - (a.koAt || 0)) || (b.wins - a.wins) || (b.correct - a.correct));
    const rows = ranking.map((f) => ({ player: f, value: `${f.ko ? 'K.O.' : `HP ${f.hp}/${f.max}`} · ${f.wins} serangan` }));
    $('qStatus').textContent = 'Pertarungan selesai';
    let r;
    if (solo && !winner) {
      QC.sfx.wrong();
      await FX.announce('GAME OVER', { color: '#7c3aed', sub: 'BOSS Raja Lupa menang kali ini', dur: 1500 });
      if (tok !== token) return;
      r = await QC.modal({ icon: '👾', title: 'GAME OVER', html: `<p class="qc-muted">${note}</p>`, buttons: [{ label: 'Ubah Pemain', value: 'setup' }, { label: 'Coba Lagi', value: 'again', primary: true }] });
    } else {
      const w = winner || ranking[0];
      const fig = $('fg' + F.indexOf(w));
      FX.burstAt(fig, { emojis: ['★', '✦', '●'], color: ['#fde047', '#f59e0b', '#ffffff', w.color], count: 30, spread: 200, size: 20 });
      FX.ringAt(fig, '#facc15', 320); $('col' + F.indexOf(w)).classList.add('champ');
      await FX.announce(winner ? `${esc(w.name)} MENANG!` : 'DOUBLE K.O.!', { color: w.color, sub: note, dur: 1600 });
      if (tok !== token) return;
      r = await QC.showWinner({ title: winner ? `${w.avatar} ${esc(w.name)} JUARA ARENA!` : 'DOUBLE K.O.!', note: `${note} • ${round} ronde`, ranking: rows });
    }
    if (tok !== token) return;
    if (r === 'setup') openSetup(); else newGame();
  }

  /* ------------------------------ Kontrol ------------------------------ */
  $('btnNext').onclick = () => startRound();
  QC.onKey = (e) => {
    if (phase === 'question') {
      const key = e.key.toLowerCase();
      F.forEach((f, i) => { if (f.cpu || f.ko || !KEYS[i]) return; const idx = KEYS[i].indexOf(key); if (idx >= 0 && idx < keys.length) { e.preventDefault(); lock(i, keys[idx]); } });
    } else if ((e.code === 'Space' || e.key === 'Enter') && (phase === 'ready' || phase === 'reveal')) { e.preventDefault(); startRound(); }
  };
  $('btnRestart').onclick = async () => {
    if (QC.isBusy() || phase === 'countdown' || phase === 'resolving' || phase === 'over') return;
    const v = await QC.modal({ icon: '🔄', title: 'Ulangi duel?', html: '<p class="qc-muted">Semua HP dipulihkan dan pertarungan dimulai dari awal.</p>', buttons: [{ label: 'Batal', value: null }, { label: 'Ubah Pemain', value: 'setup' }, { label: 'Ulang', value: 'again', primary: true }] });
    if (v === 'again') newGame(); else if (v === 'setup') openSetup();
  };

  openSetup();
})();
