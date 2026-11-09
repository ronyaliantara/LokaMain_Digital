/* ==========================================================================
   Pulau Harta Karun — KUIS REBUTAN SERENTAK
   - Satu soal untuk SEMUA kapten sekaligus; tiap pemain punya pad jawaban
     sendiri (layar sentuh) atau tombol keyboard sendiri.
   - Yang pertama menjawab benar langsung merebut ronde & MEMILIH satu petak
     harta di peta: koin 20–50, peti +100, beo (curi 30), peta rahasia (x2),
     bom −30, atau Kraken (tantangan belajar lalu +20).
   - Salah: langsung −10 koin & terkunci; soal langsung diganti untuk pemain lain.
     Yang salah mengerjakan TUGAS BELAJAR bersama di akhir ronde.
   - Main sendiri? Lawan Kapten Robot.
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
  const icon = (id, cls = '') => `<svg class="${cls}"><use href="#${id}" width="100%" height="100%"/></svg>`;
  const COIN = icon('i-coin');
  const SND_ON = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  const SND_OFF = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>';
  const BIG = (id) => `<svg class="big-ico"><use href="#${id}" width="100%" height="100%"/></svg>`;
  const LOGO = BIG('i-ship');

  const TYPES = {
    coin: { ico: 'i-bag', name: 'Kantong Koin', cls: 'good' },
    chest: { ico: 'i-chest', name: 'Peti Harta', cls: 'great' },
    parrot: { ico: 'i-parrot', name: 'Beo Pencuri', cls: 'good' },
    map: { ico: 'i-scroll', name: 'Peta Rahasia', cls: 'good' },
    bomb: { ico: 'i-bomb', name: 'Bom', cls: 'bad' },
    kraken: { ico: 'i-kraken', name: 'Kraken', cls: 'bad' }
  };

  /* ---------- Tugas belajar (pengganti hukuman fisik) ----------
     Setiap tugas berupa fungsi; sebagian memakai soal yang baru saja dijawab salah
     (need: 'q' / 'exp') agar murid belajar langsung dari kesalahannya. */
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const some = (arr, n) => QC.shuffle(arr).slice(0, n).map((w) => `<b>${w}</b>`).join(', ');
  const ansOf = (qq) => esc(qq['option' + qq.correct] || '');
  const shortQ = (qq) => { const s = String(qq.question || ''); return esc(s.length > 110 ? s.slice(0, 107) + '…' : s); };
  // Soal hitung ringan (penjumlahan/pengurangan/perkalian kecil)
  const mathTask = () => QC.pick([
    () => `${ri(2, 9)} + ${ri(2, 9)}`,
    () => `${ri(10, 20)} − ${ri(1, 9)}`,
    () => `${ri(2, 5)} × ${ri(2, 5)}`,
    () => `${ri(10, 30)} + ${ri(1, 9)}`
  ])();
  const ANTONIM = ['besar', 'panas', 'siang', 'tinggi', 'cepat', 'senang', 'baru', 'terang', 'pagi', 'banyak'];
  const SINONIM = ['pandai', 'indah', 'gembira', 'besar', 'cepat', 'hebat'];
  const INGGRIS = ['buku', 'meja', 'guru', 'kucing', 'rumah', 'pintu', 'teman', 'ikan', 'bola', 'air', 'merah', 'satu'];
  // Pantun & puisi pendek (karya sendiri) untuk dibacakan
  const PANTUN = [
    'Pergi ke pasar membeli roti,<br>roti dimakan bersama teman.<br>Belajar tekun sepenuh hati,<br>cita-cita pasti di tangan.',
    'Burung camar terbang tinggi,<br>hinggap sebentar di atas kapal.<br>Ayo belajar setiap hari,<br>supaya pelajaran mudah dihafal.',
    'Ikan hiu di laut biru,<br>berenang cepat ke sana kemari.<br>Hormati orang tua dan guru,<br>agar ilmu bermanfaat nanti.'
  ];
  /* Hukuman campuran: separuh BELAJAR (masuk akal & ringan), separuh SERU
     (bernyanyi, pantun, gaya lucu). tag dipakai untuk label kecil di kartu. */
  const PUNISH = [
    // --- belajar ---
    { tag: '📚', need: 'q', t: (qq) => `Ucapkan jawaban yang benar bersama-sama <b>3 kali</b>:<br><b style="font-size:1.25em">${ansOf(qq)}</b>` },
    { tag: '📚', need: 'exp', t: (qq) => `Bacakan pembahasan soal tadi dengan suara lantang:<br><i>${esc(qq.explanation)}</i>` },
    { tag: '📚', need: 'q', t: (qq) => `Buat <b>satu kalimat</b> yang memakai kata/jawaban <b>"${ansOf(qq)}"</b>.` },
    { tag: '📚', t: () => 'Sebutkan <b>1 hal baru</b> yang kalian pelajari hari ini.' },
    { tag: '📚', t: () => `Hitung bersama-sama:<br><b style="font-size:1.4em">${mathTask()} = ?</b>` },
    { tag: '📚', t: () => 'Sebutkan <b>cita-cita</b> kalian dan pelajaran apa yang paling dibutuhkan untuk meraihnya.' },
    { tag: '📚', t: () => 'Sebutkan <b>3 benda di kelas</b> dalam bahasa Inggris.' },
    { tag: '📚', t: () => 'Sebutkan <b>2 sikap baik</b> saat belajar di kelas.' },
    // --- seru ---
    { tag: '🎵', t: () => 'Nyanyikan <b>1 bait lagu nasional</b> bersama-sama, misalnya <i>Garuda Pancasila</i> atau <i>Hari Merdeka</i>!' },
    { tag: '🎵', t: () => 'Nyanyikan <b>1 bait lagu daerah</b>, misalnya <i>Ampar-Ampar Pisang</i> atau <i>Gundul-Gundul Pacul</i>!' },
    { tag: '🎵', t: () => 'Nyanyikan lagu <i>Balonku</i> tetapi <b>semua huruf vokal diganti "O"</b>!' },
    { tag: '🎤', t: () => `Bacakan pantun ini dengan <b>gaya penuh ekspresi</b>:<br><i>${QC.pick(PANTUN)}</i>` },
    { tag: '🎤', t: () => 'Ucapkan <b>"Aku pasti bisa!"</b> dengan 3 gaya: <b>berbisik</b>, <b>biasa</b>, lalu <b>berteriak semangat</b>!' },
    { tag: '😄', t: () => 'Tirukan <b>suara 3 hewan</b> yang berbeda, teman-teman menebak hewannya!' },
    { tag: '👏', t: () => 'Pimpin <b>tepuk semangat</b> (misalnya tepuk pramuka) untuk seluruh kelas!' },
    { tag: '💃', t: () => 'Joget <b>gaya bebas</b> selama 10 detik di depan kelas!', s: 10 }
  ];
  const KRAKEN = [
    { t: () => `Kraken menguji otakmu! Hitung:<br><b style="font-size:1.4em">${mathTask()} = ?</b>` },
    { need: 'cat', t: (qq) => `Sebutkan <b>3 kata</b> yang berhubungan dengan <b>${esc(qq.category)}</b>!`, s: 20 },
    { t: () => `Apa <b>persamaan kata</b> dari ${some(SINONIM, 1)}?` },
    { t: () => `Apa <b>bahasa Inggris</b>-nya ${some(INGGRIS, 2)}?` },
    { t: () => `Apa <b>lawan kata</b> dari ${some(ANTONIM, 2)}?` },
    { t: () => 'Sebutkan <b>3 nama pahlawan nasional</b> Indonesia!', s: 20 },
    { t: () => 'Sebutkan <b>3 nama provinsi</b> di Indonesia!', s: 20 }
  ];
  function pickTask(list, qq) {
    const ok = list.filter((x) => !x.need || (qq && (x.need === 'q' || (x.need === 'exp' && qq.explanation) || (x.need === 'cat' && qq.category))));
    const c = QC.pick(ok); return { t: c.t(qq), s: c.s || 0, tag: c.tag || '' };
  }

  let P = []; let S = {}; let round = 0; let phase = 'idle'; let gen = 0;
  let q = null; let keys = []; let qStart = 0; let timerIv = null; let cpuTimers = [];
  let answers = new Map(); let pending = []; let wrongs = []; let locked = new Set(); let missed = [];
  let tiles = []; let cols = 5; let rows = 4; let pickResolve = null; let picker = -1;

  QC.init({ gameId: 'harta-karun', title: 'Pulau Harta Karun', avatars: ['🏴‍☠️', '🦜', '🐙', '🦈', '🐢', '🦀', '🧜', '🐒'], colors: ['#2563eb', '#dc2626', '#16a34a', '#9333ea'] });

  /* ------------------------------ Suara ------------------------------ */
  function syncSound() { $('btnSound').innerHTML = QC.muted ? SND_OFF : SND_ON; }
  $('btnSound').onclick = () => { QC.muted = !QC.muted; try { localStorage.setItem('lokamain_muted', JSON.stringify(QC.muted)); } catch (e) { /* abaikan */ } syncSound(); QC.sfx.click(); };
  syncSound();

  /* ------------------------------ Legenda peta ------------------------------ */
  $('legend').innerHTML = [
    ['i-bag', 'Koin 20–50'], ['i-chest', 'Peti +100'], ['i-parrot', 'Beo: curi 30'],
    ['i-scroll', 'Peta: ronde x2'], ['i-bomb', 'Bom −30'], ['i-kraken', 'Kraken: tantangan belajar +20']
  ].map(([id, t]) => `<span>${icon(id)}${t}</span>`).join('') + '<span class="warn">Salah jawab −10</span>';

  /* ------------------------------ Setup ------------------------------ */
  async function openSetup() {
    stopRound(); gen++; phase = 'idle'; clearPick();
    const r = await QC.setup({
      logo: LOGO, subtitle: 'Kuis rebutan! Yang pertama menjawab benar berhak menggali satu petak harta karun!',
      min: 1, max: 4, defaultCount: 2, soloLabel: '1 vs Robot',
      defaultNames: ['Kapten Biru', 'Kapten Merah', 'Kapten Hijau', 'Kapten Ungu'],
      settings: [
        { key: 'size', label: 'Ukuran peta', value: 20, options: [[16, '16 petak (4×4)'], [20, '20 petak (5×4)'], [30, '30 petak (6×5)']] },
        { key: 'timer', label: 'Waktu menjawab', value: 20, options: [[10, '10 detik'], [15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [0, 'Tanpa batas']] },
        { key: 'rounds', label: 'Batas ronde', value: 0, options: [[8, '8 ronde'], [12, '12 ronde'], [15, '15 ronde'], [20, '20 ronde'], [0, 'Sampai peta habis']] },
        { key: 'start', label: 'Koin awal', value: 50, options: [[0, '0 koin'], [50, '50 koin'], [100, '100 koin']] },
        { key: 'punish', label: 'Hukuman (yang salah)', value: 'on', options: [['on', 'Aktif'], ['off', 'Nonaktif']] }
      ],
      rulesHtml: `<ul>
        <li>Satu soal muncul untuk <b>semua kapten sekaligus</b>. Jawab di pad warnamu (sentuh) atau tombol keyboard-mu.</li>
        <li>Keyboard: P1 <b>1 2 3 4</b> • P2 <b>7 8 9 0</b> • P3 <b>Z X C V</b> • P4 <b>N M , .</b></li>
        <li><b>Rebutan!</b> Yang pertama menjawab <b>benar</b> langsung merebut ronde dan <b>memilih satu petak</b> di peta.</li>
        <li>Isi petak: koin 20–50, <b>peti +100</b>, <b>beo</b> mencuri 30 koin dari kapten pilihanmu, <b>peta rahasia</b> (kemenangan ronde berikutnya bernilai ganda), <b>bom −30</b>, atau <b>Kraken</b> (jawab tantangan belajar, dapat +20).</li>
        <li>Salah = <b>langsung −10 koin</b> & terkunci sampai ronde berikutnya. <b>Soal langsung diganti soal baru</b>, jadi kapten lain tidak bisa menebak dari kesalahan lawan. Di akhir ronde, yang salah mendapat <b>hukuman</b> bersama: kadang <b>belajar</b> (mengulang jawaban benar, membaca pembahasan, hitung sederhana), kadang <b>seru</b> (bernyanyi, pantun, tirukan suara hewan, joget), atau yang salah <b>memilih PERTANYAAN atau TANTANGAN</b>, lalu kapten yang menjawab benar memberikannya.</li>
        <li>Selesai saat peta habis atau batas ronde tercapai. <b>Koin terbanyak = Raja Bajak Laut!</b> Main sendiri? Lawan <b>Kapten Robot</b>.</li></ul>`
    });
    P = r.players.map((p) => ({ ...p, cpu: false }));
    if (P.length === 1) P.push({ id: 1, name: 'Kapten Robot', avatar: '🤖', color: '#94a3b8', cpu: true });
    S = r.settings;
    newGame();
  }

  function makeTiles(n) {
    const c = (f) => Math.max(1, Math.round(n * f));
    const list = [];
    for (let i = 0; i < c(0.08); i++) list.push({ type: 'chest', val: 100 });
    for (let i = 0; i < c(0.12); i++) list.push({ type: 'bomb', val: -30 });
    for (let i = 0; i < c(0.08); i++) list.push({ type: 'kraken', val: 20 });
    for (let i = 0; i < c(0.1); i++) list.push({ type: 'parrot', val: 30 });
    for (let i = 0; i < c(0.07); i++) list.push({ type: 'map', val: 0 });
    while (list.length < n) list.push({ type: 'coin', val: QC.pick([20, 20, 30, 30, 40, 50]) });
    return QC.shuffle(list).map((t) => ({ ...t, open: false, by: null }));
  }

  function newGame() {
    stopRound(); gen++; clearPick();
    P.forEach((p) => Object.assign(p, { coins: S.start, double: false, found: 0, correct: 0, wrong: 0, totalTime: 0 }));
    round = 0; phase = 'ready'; pending = []; wrongs = []; locked = new Set();
    tiles = makeTiles(S.size);
    buildMap(); buildScores(); buildPads(); render();
    idleCard('Kapal berlabuh', 'Tekan <b>MULAI</b>. Rebutan! Yang pertama menjawab benar langsung <b>memilih petak harta</b>. Salah? Langsung <b>−10 koin</b> dan soal diganti baru!', 'MULAI');
    document.querySelectorAll('.tile').forEach((t, i) => t.animate([{ transform: 'scale(0) rotate(-25deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: 200 + i * 28, easing: 'cubic-bezier(.2,.9,.3,1.4)', fill: 'backwards' }));
    document.querySelectorAll('.score').forEach((c, i) => c.animate([{ transform: 'translateY(-30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: i * 120, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'backwards' }));
    FX.announce('ANGKAT JANGKAR!', { color: '#b45309', sub: `${P.length} kapten • ${tiles.length} petak harta tersembunyi`, dur: 1500 });
  }

  /* ------------------------------ Bangun tampilan ------------------------------ */
  function buildMap() {
    // Peta memanjang (2–3 baris) di bawah soal; layar sempit memakai peta kotak
    const wide = innerWidth > 900;
    cols = wide ? (S.size === 16 ? 8 : 10) : (S.size === 16 ? 4 : S.size === 20 ? 5 : 6);
    rows = Math.ceil(tiles.length / cols);
    const g = $('grid'); g.style.setProperty('--cols', cols); g.style.setProperty('--rows', rows);
    const L = 'ABCDEFGHIJ';
    g.innerHTML = tiles.map((t, i) => `<button class="tile" id="t${i}" data-i="${i}">
      <span class="in"><span class="face front"><svg class="xmark" viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18"/></svg><span class="co">${L[i % cols]}${Math.floor(i / cols) + 1}</span></span>
      <span class="face back"></span></span></button>`).join('');
    g.querySelectorAll('.tile').forEach((b) => (b.onclick = () => humanPick(+b.dataset.i)));
  }
  function buildScores() {
    const sc = $('scores'); sc.style.setProperty('--n', P.length);
    sc.innerHTML = P.map((p, i) => `<div class="score" id="sc${i}" style="--pc:${p.color}">
      <span class="crown">${icon('i-crown')}</span>
      <span class="av">${p.avatar}</span>
      <span class="nm"><b>${esc(p.name)}</b><small id="sf${i}"></small></span>
      <span class="dbl" id="sd${i}" title="Peta rahasia: kemenangan berikutnya bernilai ganda">${icon('i-scroll')}x2</span>
      <span class="purse" id="sp${i}">${COIN}<b id="sn${i}">${p.coins}</b></span></div>`).join('');
  }
  function buildPads() {
    const pads = $('pads'); pads.style.setProperty('--n', P.length);
    pads.innerHTML = P.map((p, i) => `<div class="pad ${p.cpu ? 'cpu' : ''}" id="pad${i}" style="--pc:${p.color}">
      <div class="pad-head"><span class="av">${p.avatar}</span><b>${esc(p.name)}</b><span class="keys">${p.cpu ? 'OTOMATIS' : KEYS[i].map((k) => k.toUpperCase()).join(' ')}</span></div>
      <div class="pad-btns" id="pbs${i}">${padButtons(i, ['A', 'B', 'C', 'D'], true)}</div>
      <div class="pad-state on idle" id="ps${i}"><b>SIAP</b><small>Menunggu soal</small></div></div>`).join('');
  }
  function padButtons(i, ks, disabled) {
    return ks.map((k, n) => `<button class="pb" data-k="${k}" style="--oc:${OC[k]}" ${disabled ? 'disabled' : ''}>${shape(k)}<span>${P[i].cpu ? k : KEYS[i][n].toUpperCase()}</span></button>`).join('');
  }
  function render() {
    $('roundNo').textContent = round;
    $('roundMax').textContent = S.rounds ? ` / ${S.rounds}` : '';
    $('tilesLeft').textContent = tiles.filter((t) => !t.open).length;
    const max = Math.max(...P.map((p) => p.coins));
    P.forEach((p, i) => {
      const c = $('sc' + i); if (!c) return;
      c.classList.toggle('lead', P.length > 1 && p.coins === max && max > 0 && P.filter((x) => x.coins === max).length === 1);
      c.classList.toggle('double', !!p.double);
      $('sf' + i).textContent = `${p.found} petak • ${p.correct} menang`;
    });
  }
  function padState(i, cls, title = '', sub = '') {
    const s = $('ps' + i); if (!s) return;
    if (!cls) { s.className = 'pad-state'; return; }
    s.className = `pad-state on ${cls}`; s.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
  }
  function setNext(label) { const b = $('btnNext'); b.innerHTML = `${label} <small>Spasi / Enter</small>`; b.hidden = false; }
  function idleCard(cat, text, btn) {
    $('qCat').textContent = cat; $('qStatus').textContent = ''; $('qText').innerHTML = text; $('qOpts').innerHTML = ''; $('qExp').innerHTML = '';
    $('tNum').textContent = '–'; $('tRing').style.strokeDashoffset = 0; $('qTimer').classList.remove('hurry'); setNext(btn);
  }
  function retrigger(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ------------------------------ Animasi (dengan cadangan waktu) ------------------------------ */
  // Browser menghentikan animasi saat tab tersembunyi; setiap animasi yang
  // ditunggu selalu dibatasi waktu agar alur game tidak pernah macet.
  function play(el, frames, opts) {
    const a = el.animate(frames, opts);
    return Promise.race([a.finished.catch(() => {}), QC.sleep((opts.duration || 0) + (opts.delay || 0) + 200)]);
  }
  const announce = (html, o) => Promise.race([FX.announce(html, o), QC.sleep((o.dur || 1350) + 200)]);

  // Koin vektor terbang ke papan skor (memakai QC.fx.fly, partikelnya diganti SVG koin)
  function flyCoins(fromEl, toEl, n = 6, dur = 800) {
    const pr = FX.fly(fromEl, toEl, '¤', n, dur);
    document.querySelectorAll('.qc-fx .qc-p').forEach((s) => { if (s.textContent === '¤') { s.textContent = ''; s.innerHTML = COIN; s.classList.add('fly-coin'); } });
    for (let k = 0; k < n; k += 2) setTimeout(() => QC.sfx.coin(), dur * 0.85 + k * 70);
    return Promise.race([pr, QC.sleep(dur + n * 70 + 250)]).then(() => { const t = toEl && toEl.closest('.score'); if (t) retrigger(t, 'gain'); });
  }
  // Koin berjatuhan dari kantong pemain (kehilangan koin)
  function coinDrop(el, n = 5) {
    if (!el) return; const c = FX.center(el);
    for (let k = 0; k < n; k++) {
      const s = document.createElement('div'); s.className = 'drop-coin'; s.innerHTML = COIN; document.body.appendChild(s);
      const dx = (Math.random() - 0.5) * 140; const up = 30 + Math.random() * 40; const fall = 120 + Math.random() * 90;
      play(s, [
        { transform: `translate(${c.x}px, ${c.y}px) scale(.6) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${c.x + dx * 0.5}px, ${c.y - up}px) scale(1) rotate(${dx * 2}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${c.x + dx}px, ${c.y + fall}px) scale(.7) rotate(${dx * 5}deg)`, opacity: 0 }
      ], { duration: 900 + Math.random() * 300, delay: k * 60, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' }).then(() => s.remove());
    }
  }
  // Ubah koin + animasi angka berjalan
  function addCoins(i, delta) {
    const p = P[i]; const old = p.coins; p.coins = Math.max(0, old + delta); const real = p.coins - old;
    const card = $('sc' + i); const num = $('sn' + i);
    FX.countUp(num, old, p.coins, 850);
    if (card) {
      retrigger(card, real >= 0 ? 'gain' : 'loss');
      if (real) FX.floatTextAt($('sp' + i), `${real > 0 ? '+' : '−'}${Math.abs(real)}`, real > 0 ? '#facc15' : '#f87171', 30);
    }
    render();
    return real;
  }
  // Salah jawab: −10 koin langsung
  async function penalty(i) {
    const card = $('sc' + i); const g = gen;
    QC.sfx.hit(); FX.shake(card, 9, 450);
    coinDrop($('sp' + i), 4);
    addCoins(i, -10);
    await QC.sleep(950);
    return g;
  }

  /* ------------------------------ Alur ronde ------------------------------ */
  function stopRound() { clearInterval(timerIv); cpuTimers.forEach(clearTimeout); cpuTimers = []; }

  async function startRound() {
    if (phase !== 'ready' && phase !== 'reveal') return;
    q = QC.nextQuestion();
    if (!q) { QC.toast('Bank soal kosong — tambahkan soal di Mode Guru.', 'bad'); return; }
    const g = gen;
    phase = 'countdown'; $('btnNext').hidden = true;
    round++; render(); keys = QC.optionsOf(q); answers = new Map(); pending = []; wrongs = []; locked = new Set(); missed = [];
    P.forEach((p, i) => { padState(i, 'idle', 'BERSIAP', 'Soal segera muncul'); $('pad' + i).classList.remove('picked'); });
    $('qCat').textContent = q.category || 'Soal'; $('qStatus').textContent = `Ronde ${round}`; $('qText').textContent = ''; $('qOpts').innerHTML = ''; $('qExp').innerHTML = '';
    await countdown();
    if (g !== gen) return;
    showQuestion();
  }

  async function countdown() {
    const c = $('countdown'); c.classList.add('on');
    for (const t of ['3', '2', '1', 'GALI!']) {
      c.innerHTML = `<span>${t}</span>`;
      if (t === 'GALI!') QC.sfx.whoosh(); else QC.sfx.tick();
      await QC.sleep(t === 'GALI!' ? 550 : 700);
    }
    c.classList.remove('on');
  }

  function showQuestion(swapped = false) {
    phase = 'question';
    const qt = $('qText'); qt.textContent = q.question; retrigger(qt, 'in');
    $('qOpts').innerHTML = keys.map((k, n) => `<div class="opt" id="opt${k}" style="--oc:${OC[k]};--i:${n}"><span class="shape">${shape(k)}</span><span class="ot">${esc(q['option' + k])}</span><span class="who"></span></div>`).join('');
    P.forEach((p, i) => {
      const box = $('pbs' + i); box.style.setProperty('--k', keys.length);
      box.innerHTML = padButtons(i, keys, p.cpu || locked.has(i));
      if (locked.has(i)) return; // yang sudah salah tetap terkunci sampai ronde berikutnya
      $('pad' + i).classList.remove('picked');
      box.querySelectorAll('.pb').forEach((b) => (b.onclick = () => lock(i, b.dataset.k)));
      padState(i, p.cpu ? 'idle' : null, 'MENGHITUNG…', 'Robot sedang berpikir');
      if (p.cpu) {
        const span = S.timer ? S.timer * 1000 * 0.75 : 8000;
        const k = Math.random() < 0.62 ? q.correct : QC.pick(keys.filter((x) => x !== q.correct));
        cpuTimers.push(setTimeout(() => lock(i, k), 3000 + Math.random() * span));
      }
    });
    qStart = performance.now(); startTimer();
    $('qStatus').textContent = swapped ? `Ronde ${round} • SOAL BARU! ${P.length - locked.size} kapten masih bisa merebut` : `Ronde ${round} • rebutan dimulai!`;
  }

  /* Ada yang salah → soal langsung diganti soal baru (waktu diulang), agar kapten
     lain tidak bisa menebak jawaban dari kesalahan lawan. */
  async function swapQuestion(p) {
    phase = 'swap'; stopRound(); const g = gen; $('qTimer').classList.remove('hurry');
    $('qStatus').textContent = `Ronde ${round} • ${p.name} salah! Soal diganti…`;
    P.forEach((x, i) => { if (!locked.has(i)) $('pad' + i).querySelectorAll('.pb').forEach((b) => (b.disabled = true)); });
    await QC.sleep(350); if (g !== gen || phase !== 'swap') return;
    const body = $('qBody'); retrigger(body, 'swap'); QC.sfx.whoosh();
    FX.floatTextAt(body, 'SOAL DIGANTI!', '#b45309', 34);
    await QC.sleep(260); if (g !== gen || phase !== 'swap') return;
    const nq = QC.nextQuestion(); if (nq) q = nq;
    keys = QC.optionsOf(q); answers = new Map();
    $('qCat').textContent = q.category || 'Soal'; $('qExp').innerHTML = '';
    showQuestion(true);
  }

  function startTimer() {
    const T = S.timer; const ring = $('tRing'); const num = $('tNum'); const box = $('qTimer');
    box.classList.remove('hurry'); ring.style.strokeDashoffset = 0;
    if (!T) { num.textContent = '∞'; return; }
    let last = T; num.textContent = T;
    timerIv = setInterval(() => {
      const left = Math.max(0, T - (performance.now() - qStart) / 1000);
      ring.style.strokeDashoffset = 119.4 * (1 - left / T);
      const s = Math.ceil(left);
      if (s !== last) { last = s; num.textContent = s; if (s <= 5 && s > 0) { QC.sfx.tick(); box.classList.add('hurry'); } }
      if (left <= 0) endQuestion(null);
    }, 100);
  }

  /* Rebutan: jawaban langsung dinilai.
     - Benar pertama → ronde berakhir, pemain itu memilih petak harta.
     - Salah        → langsung −10 koin & terkunci sampai ronde berikutnya;
                      soal LANGSUNG DIGANTI soal baru untuk kapten lain.
     - Semua salah / waktu habis → ronde berakhir tanpa pemenang. */
  function lock(i, k) {
    if (phase !== 'question' || answers.has(i) || locked.has(i) || !keys.includes(k)) return;
    const t = (performance.now() - qStart) / 1000; answers.set(i, { k, t });
    const pad = $('pad' + i); pad.classList.add('picked');
    pad.querySelectorAll('.pb').forEach((b) => { b.disabled = true; if (b.dataset.k === k && k === q.correct) b.classList.add('mine'); });
    if (k === q.correct) { endQuestion(i); return; }
    const p = P[i]; p.wrong++; wrongs.push(i); locked.add(i); if (!p.cpu && !missed.includes(q)) missed.push(q);
    padState(i, 'bad', '−10 KOIN', 'Salah • tunggu ronde berikutnya');
    retrigger(pad, 'flash-bad'); QC.sfx.wrong();
    pending.push(penalty(i));
    if (locked.size >= P.length) { $('qStatus').textContent = `Ronde ${round} • semua salah`; setTimeout(() => endQuestion(null), 300); return; }
    swapQuestion(p);
  }

  async function endQuestion(winner = null) {
    if (phase !== 'question') return;
    phase = 'resolving'; stopRound(); const g = gen; $('qTimer').classList.remove('hurry');

    // 1) Buka jawaban
    keys.forEach((k) => $('opt' + k).classList.add(k === q.correct ? 'correct' : 'dim'));
    answers.forEach((a, i) => $('opt' + a.k).querySelector('.who').insertAdjacentHTML('beforeend', `<i style="--pc:${P[i].color}">${P[i].avatar}</i>`));
    FX.ringAt($('opt' + q.correct), '#1fb36b', 280);
    if (q.explanation) $('qExp').innerHTML = `<b>Pembahasan:</b> ${esc(q.explanation)}`;
    P.forEach((p, i) => { if (!answers.has(i) && !locked.has(i)) { padState(i, 'idle', winner == null ? '—' : 'KALAH CEPAT', winner == null ? 'Tidak menjawab' : 'Sudah direbut lawan'); $('pad' + i).querySelectorAll('.pb').forEach((b) => (b.disabled = true)); } });

    // 2) Pemenang ronde memilih petak
    if (winner != null) {
      const p = P[winner]; const a = answers.get(winner);
      p.correct++; p.totalTime += a.t; render();
      padState(winner, 'best', 'MENANG!', `Benar dalam ${a.t.toFixed(1)} dtk • pilih petak`);
      retrigger($('pad' + winner), 'flash-good'); QC.sfx.correct();
      FX.burstAt($('pad' + winner), { emojis: ['★', '✦', '●'], color: ['#fde047', '#fbbf24', '#ffffff', p.color], count: 20, spread: 150, size: 18 });
      FX.ringAt($('sc' + winner), p.color, 220);
      $('qStatus').textContent = `Ronde ${round} • ${p.name} merebut ronde dalam ${a.t.toFixed(1)} detik!`;
      await announce(`${esc(p.name)} MEREBUT RONDE!`, { color: p.color, sub: p.double ? 'Peta rahasia aktif — hadiah petak ini GANDA!' : 'Pilih satu petak harta di peta', dur: 1200 });
      if (g !== gen) return;
      await Promise.all(pending); pending = [];
      if (g !== gen) return;
      const ti = await choosePick(winner);
      if (g !== gen || ti == null) return;
      await openTile(ti, winner);
      if (g !== gen) return;
    } else {
      QC.sfx.magic();
      $('qStatus').textContent = `Ronde ${round} • tidak ada yang benar — tidak ada petak yang digali`;
    }
    await Promise.all(pending); pending = [];
    if (g !== gen) return;
    render();

    // 3) Satu kartu untuk semua pemain (manusia) yang salah:
    //    kadang TUGAS BELAJAR, kadang JUARA ronde yang memberi pertanyaan/tantangan.
    const losers = wrongs.filter((i) => !P[i].cpu).map((i) => P[i]); wrongs = [];
    if (S.punish === 'on' && losers.length) {
      await QC.sleep(450); if (g !== gen) return;
      const mq = missed.length ? QC.pick(missed) : null;
      const champ = winner != null && !P[winner].cpu ? P[winner] : null;
      if (champ && Math.random() < 0.5) {
        // Yang salah memilih: PERTANYAAN atau TANTANGAN; lalu juara memberikannya.
        const who = losers.map(QC.chip).join(' ');
        const pick = await QC.modal({
          cls: 'qc-punish', icon: BIG('i-crown'), title: 'PERTANYAAN ATAU TANTANGAN?',
          html: `<p class="qc-punish-sub">${who}<br>Kalian yang salah, <b>pilih salah satu</b>:</p>`,
          buttons: [{ label: '❓ Pertanyaan', value: 'q', primary: true }, { label: '⚡ Tantangan', value: 't', primary: true }]
        });
        if (g !== gen) return;
        const isQ = pick !== 't';
        await QC.modal({
          cls: 'qc-punish', icon: BIG('i-crown'), title: isQ ? '❓ PERTANYAAN' : '⚡ TANTANGAN',
          html: `${QC.chip(champ)}<p class="qc-punish-sub">${who} memilih <b>${isQ ? 'PERTANYAAN' : 'TANTANGAN'}</b>.</p>` +
            `<div class="qc-punish-box"><b>${esc(champ.name)}</b> (yang menjawab benar), berikan <b>1 ${isQ ? 'pertanyaan' : 'tantangan'}</b> kepada yang salah.</div>`,
          buttons: [{ label: '✅ Selesai', value: true, primary: true }]
        });
      } else {
        const c = pickTask(PUNISH, mq);
        const fun = c.tag && c.tag !== '📚';
        await QC.punish({ icon: BIG(fun ? 'i-skull' : 'i-scroll'), title: fun ? `${c.tag} HUKUMAN SERU` : '📚 HUKUMAN BELAJAR', sub: `${losers.map(QC.chip).join(' ')}<br>Yang salah, kerjakan bersama-sama:`, text: c.t, seconds: c.s });
      }
      if (g !== gen) return;
    }

    // 4) Selesai?
    if (tiles.every((t) => t.open)) { finish('Semua petak harta sudah tergali!'); return; }
    if (S.rounds && round >= S.rounds) { finish(`Batas ${S.rounds} ronde tercapai!`); return; }
    phase = 'reveal'; render(); setNext('RONDE BERIKUTNYA');
  }

  /* ------------------------------ Pilih petak ------------------------------ */
  function clearPick() {
    pickResolve = null; picker = -1;
    const m = $('map'); if (m) m.classList.remove('picking');
    const b = $('pickBanner'); if (b) b.classList.remove('on');
    document.querySelectorAll('.tile.scan').forEach((t) => t.classList.remove('scan'));
  }
  function choosePick(i) {
    return new Promise((res) => {
      const p = P[i]; const m = $('map');
      if (!tiles.some((t) => !t.open)) { res(null); return; }
      picker = i; phase = 'pick';
      m.style.setProperty('--pc', p.color); m.classList.add('picking');
      const b = $('pickBanner'); b.style.setProperty('--pc', p.color);
      b.innerHTML = `<span class="av">${p.avatar}</span><span><b>${esc(p.name)}</b>${p.cpu ? 'sedang memilih petak…' : ', pilih satu petak!'}</span>`;
      retrigger(b, 'on');
      $('qStatus').textContent = `Ronde ${round} • ${p.name} memilih petak harta…`;
      QC.sfx.magic();
      pickResolve = (t) => { clearPick(); phase = 'resolving'; res(t); };
      if (p.cpu) cpuPick();
    });
  }
  const closedTiles = () => tiles.map((t, k) => k).filter((k) => !tiles[k].open);
  function humanPick(t) {
    if (phase !== 'pick' || !pickResolve || picker < 0 || P[picker].cpu || t == null || tiles[t].open) return;
    QC.sfx.pop(); pickResolve(t);
  }
  function cpuPick() {
    const list = closedTiles(); const hops = Math.min(6, list.length + 2);
    let prev = null;
    for (let h = 0; h < hops; h++) {
      cpuTimers.push(setTimeout(() => {
        if (prev) prev.classList.remove('scan');
        const el = $('t' + QC.pick(list)); el.classList.add('scan'); prev = el; QC.sfx.spin();
      }, 300 + h * 230));
    }
    cpuTimers.push(setTimeout(() => { if (prev) prev.classList.remove('scan'); if (pickResolve) { QC.sfx.pop(); pickResolve(QC.pick(list)); } }, 300 + hops * 230 + 250));
  }

  /* ------------------------------ Buka petak ------------------------------ */
  function fillBack(ti) {
    const t = tiles[ti]; const el = $('t' + ti); const T = TYPES[t.type];
    const label = { coin: `+${t.val}`, chest: '+100', parrot: 'CURI 30', map: 'x2', bomb: '−30', kraken: 'KRAKEN' }[t.type];
    const back = el.querySelector('.back'); back.className = `face back ${T.cls}`;
    back.innerHTML = `${icon(T.ico, 'ti')}<span class="val">${label}</span>${t.by != null ? `<span class="by" style="--pc:${P[t.by].color}">${P[t.by].avatar}</span>` : ''}`;
  }

  async function openTile(ti, pi) {
    const g = gen; const t = tiles[ti]; const p = P[pi]; const el = $('t' + ti); const purse = $('sp' + pi);
    t.open = true; t.by = pi; p.found++;
    const mult = p.double ? 2 : 1; p.double = false;
    // Menggali → membalik petak
    el.classList.add('dig'); QC.sfx.hit();
    FX.burstAt(el, { emojis: ['●', '•'], color: ['#e9cf91', '#c9a35f', '#a0703f'], count: 14, spread: 70, size: 12, gravity: 60, dur: 700 });
    await QC.sleep(450); if (g !== gen) return;
    fillBack(ti); el.classList.remove('dig'); el.classList.add('open'); render();
    await QC.sleep(650); if (g !== gen) return;
    const bad = TYPES[t.type].cls === 'bad';
    FX.ringAt(el, bad ? '#ef4444' : '#facc15', 220);
    const dbl = mult > 1 ? ' (GANDA!)' : '';

    if (t.type === 'coin') {
      const amt = t.val * mult;
      QC.sfx.coin(); FX.burstAt(el, { emojis: ['●', '✦'], color: ['#fde047', '#fbbf24', '#ffffff'], count: 16, spread: 120, size: 16 });
      FX.floatTextAt(el, `+${amt}`, '#fde047', 32);
      if (mult > 1) FX.announce('HADIAH GANDA!', { color: '#0e7490', sub: `${esc(p.name)} +${amt} koin`, dur: 1100 });
      $('qStatus').textContent = `Ronde ${round} • ${p.name} menemukan kantong koin: +${amt}${dbl}`;
      await flyCoins(el, purse, 6); if (g !== gen) return;
      addCoins(pi, amt);
    } else if (t.type === 'chest') {
      const amt = 100 * mult;
      QC.sfx.win(); FX.flash('rgba(250,204,21,.45)', 650); el.classList.add('shine');
      FX.burstAt(el, { emojis: ['★', '✦', '●', '◆'], color: ['#fde047', '#fbbf24', '#ffffff', '#f59e0b'], count: 30, spread: 220, size: 20 });
      FX.ringAt(el, '#fde047', 360);
      announce('PETI HARTA KARUN!', { color: '#b45309', sub: `${esc(p.name)} +${amt} koin${dbl}`, dur: 1500 });
      $('qStatus').textContent = `Ronde ${round} • PETI HARTA! ${p.name} +${amt}${dbl}`;
      await flyCoins(el, purse, 12, 950); if (g !== gen) return;
      addCoins(pi, amt); FX.burstAt(purse, { emojis: ['✦', '●'], color: ['#fde047', '#ffffff'], count: 14, spread: 90, size: 14 });
      await QC.sleep(500);
    } else if (t.type === 'map') {
      p.double = true; render();
      QC.sfx.magic(); FX.flash('rgba(56,189,248,.3)', 500);
      FX.burstAt(el, { emojis: ['✦', '★', '●'], color: ['#7dd3fc', '#fde047', '#ffffff'], count: 20, spread: 150, size: 16 });
      await flyIcon('i-scroll', el, $('sd' + pi), 800); if (g !== gen) return;
      retrigger($('sc' + pi), 'gain');
      $('qStatus').textContent = `Ronde ${round} • ${p.name} menemukan PETA RAHASIA: kemenangan berikutnya bernilai ganda!`;
      await announce('PETA RAHASIA!', { color: '#0e7490', sub: `Petak berikutnya milik ${esc(p.name)} bernilai GANDA`, dur: 1400 });
    } else if (t.type === 'bomb') {
      QC.sfx.boom(); FX.flash('rgba(239,68,68,.5)', 600); FX.shake($('map'), 16, 650); FX.shake(document.querySelector('.game'), 6, 500);
      el.classList.add('blast');
      FX.burstAt(el, { emojis: ['●', '◆', '▲', '•'], color: ['#f97316', '#fbbf24', '#ef4444', '#57534e', '#1c1917'], count: 30, spread: 200, size: 18 });
      FX.ringAt(el, '#f97316', 300); setTimeout(() => FX.ringAt(el, '#ef4444', 200), 160);
      FX.floatTextAt(el, 'DUAR!', '#f87171', 36);
      $('qStatus').textContent = `Ronde ${round} • DUAR! ${p.name} menggali bom: −30 koin`;
      announce('BOM MELEDAK!', { color: '#b91c1c', sub: `${esc(p.name)} −30 koin`, dur: 1200 });
      await QC.sleep(500); if (g !== gen) return;
      coinDrop(purse, 6); FX.shake($('sc' + pi), 10, 450); addCoins(pi, -30);
      await QC.sleep(900);
    } else if (t.type === 'parrot') {
      await parrot(ti, pi, mult); if (g !== gen) return;
    } else if (t.type === 'kraken') {
      QC.sfx.wrong();
      $('qStatus').textContent = `Ronde ${round} • ${p.name} membangunkan KRAKEN!`;
      await krakenRise(); if (g !== gen) return;
      if (!p.cpu) {
        const c = pickTask(KRAKEN, q);
        await QC.punish({ icon: BIG('i-kraken'), title: 'KRAKEN BANGUN!', player: p, sub: `Jawab tantangan belajar ini untuk merebut <b>+${20 * mult} koin</b> dari Kraken:`, text: c.t, seconds: c.s });
        if (g !== gen) return;
      } else { await announce('KRAKEN DIKALAHKAN!', { color: '#6d28d9', sub: `${esc(p.name)} lolos dari Kraken`, dur: 1100 }); if (g !== gen) return; }
      const amt = 20 * mult;
      await flyCoins(el, purse, 5); if (g !== gen) return;
      addCoins(pi, amt);
      $('qStatus').textContent = `Ronde ${round} • ${p.name} lolos dari Kraken: +${amt}${dbl}`;
    }
    render();
  }

  // Ikon SVG terbang dari satu elemen ke elemen lain (beo, gulungan peta)
  async function flyIcon(id, fromEl, toEl, dur = 800) {
    if (!fromEl || !toEl) return;
    const a = FX.center(fromEl); const b = FX.center(toEl);
    const s = document.createElement('div'); s.className = 'fly-icon'; s.innerHTML = icon(id); document.body.appendChild(s);
    const mx = (a.x + b.x) / 2; const my = Math.min(a.y, b.y) - 90;
    await play(s, [
      { transform: `translate(${a.x}px, ${a.y}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${mx}px, ${my}px) scale(1.3) rotate(${b.x > a.x ? 10 : -10}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${b.x}px, ${b.y}px) scale(.7)`, opacity: 1 }
    ], { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    s.remove();
  }

  async function parrot(ti, pi, mult) {
    const g = gen; const p = P[pi]; const el = $('t' + ti); const amt0 = 30 * mult;
    QC.sfx.magic();
    FX.burstAt(el, { emojis: ['●', '✦'], color: ['#ef4444', '#facc15', '#2563eb', '#22c55e'], count: 16, spread: 120, size: 14 });
    const others = P.filter((x, k) => k !== pi && x.coins > 0);
    if (!others.length) {
      $('qStatus').textContent = `Ronde ${round} • Tak ada yang bisa dicuri — beo membawa ${amt0} koin untuk ${p.name}`;
      await announce('BEO DERMAWAN!', { color: '#16a34a', sub: `Beo membawa ${amt0} koin untuk ${esc(p.name)}`, dur: 1200 }); if (g !== gen) return;
      await flyCoins(el, $('sp' + pi), 5); if (g !== gen) return;
      addCoins(pi, amt0); return;
    }
    await announce('BEO PENCURI!', { color: '#dc2626', sub: `${esc(p.name)} boleh mencuri ${amt0} koin`, dur: 1100 }); if (g !== gen) return;
    let victim;
    if (p.cpu) victim = [...others].sort((a, b) => b.coins - a.coins)[0];
    else victim = await QC.choosePlayer({ icon: BIG('i-parrot'), title: 'Beo Pencuri!', sub: `${esc(p.name)}, pilih kapten yang koinnya dicuri (${amt0} koin):`, players: others });
    if (g !== gen || !victim) return;
    const vi = P.indexOf(victim);
    $('qStatus').textContent = `Ronde ${round} • Beo ${p.name} terbang ke ${victim.name}…`;
    QC.sfx.whoosh();
    await flyIcon('i-parrot', el, $('sp' + vi), 850); if (g !== gen) return;
    QC.sfx.hit(); FX.shake($('sc' + vi), 10, 450); coinDrop($('sp' + vi), 3);
    const taken = -addCoins(vi, -amt0);
    await QC.sleep(350); if (g !== gen) return;
    await flyCoins($('sp' + vi), $('sp' + pi), 6); if (g !== gen) return;
    addCoins(pi, taken);
    $('qStatus').textContent = `Ronde ${round} • Beo ${p.name} mencuri ${taken} koin dari ${victim.name}!`;
  }

  async function krakenRise() {
    const m = $('map'); const k = document.createElement('div'); k.className = 'kraken-fx';
    k.innerHTML = icon('i-kraken'); m.appendChild(k);
    FX.flash('rgba(76,29,149,.45)', 700); FX.shake(m, 12, 900); QC.sfx.boom();
    await play(k, [
      { transform: 'translate(-50%, 110%) rotate(0deg)' },
      { transform: 'translate(-50%, -8%) rotate(-10deg) scale(1.05)', offset: 0.4 },
      { transform: 'translate(-50%, 0%) rotate(9deg)', offset: 0.6 },
      { transform: 'translate(-50%, -4%) rotate(-6deg)', offset: 0.75 },
      { transform: 'translate(-50%, 115%) rotate(0deg)' }
    ], { duration: 1900, easing: 'ease-in-out', fill: 'forwards' });
    k.remove();
  }

  /* ------------------------------ Juara ------------------------------ */
  async function finish(reason) {
    phase = 'over'; render(); const g = gen;
    tiles.forEach((t, i) => { if (!t.open) { fillBack(i); $('t' + i).classList.add('open', 'peek'); } });
    const ranking = [...P].sort((a, b) => b.coins - a.coins || b.found - a.found || b.correct - a.correct || a.totalTime - b.totalTime);
    const w = ranking[0]; const wc = $('sc' + P.indexOf(w));
    retrigger(wc, 'gain');
    FX.burstAt(wc, { emojis: ['★', '✦', '●'], color: ['#fde047', '#f59e0b', '#ffffff', w.color], count: 30, spread: 200, size: 20 });
    FX.ringAt(wc, '#facc15', 320);
    await announce(`${esc(w.name)} RAJA BAJAK LAUT!`, { color: w.color, sub: reason, dur: 1700 });
    if (g !== gen) return;
    const r = await QC.showWinner({
      title: `${w.avatar} ${esc(w.name)} JUARA!`, note: `${reason} Permainan selesai dalam ${round} ronde.`,
      ranking: ranking.map((p) => ({ player: p, value: `${p.coins} koin · ${p.found} petak` }))
    });
    if (g !== gen) return;
    if (r === 'setup') openSetup(); else newGame();
  }

  /* ------------------------------ Kontrol ------------------------------ */
  $('btnNext').onclick = () => startRound();

  // Menu peraturan singkat
  $('btnRules').onclick = () => {
    if (document.querySelector('.qc-rules-modal')) return;
    const items = [['i-bag', 'Koin 20–50'], ['i-chest', 'Peti +100'], ['i-parrot', 'Beo: curi 30'], ['i-scroll', 'Peta: hadiah x2'], ['i-bomb', 'Bom −30'], ['i-kraken', 'Kraken: tantangan +20']]
      .map(([id, t]) => `<span>${icon(id)}${t}</span>`).join('');
    const rules = [
      'Soal muncul untuk <b>semua kapten</b>. Jawab di <b>pad warnamu</b> (sentuh) atau tombol keyboard.',
      'Yang <b>pertama benar</b> boleh <b>memilih 1 petak harta</b> di peta.',
      `Isi petak:<div class="rules-items">${items}</div>`,
      'Jawaban <b>salah = −10 koin</b>, tidak bisa menjawab lagi di ronde itu, dan <b>soal langsung diganti</b> untuk kapten lain.',
      'Yang salah mendapat <b>hukuman</b> di akhir ronde, atau <b>pertanyaan/tantangan</b> dari kapten yang benar.',
      'Permainan selesai saat peta habis / ronde habis. <b>Koin terbanyak = juara!</b>'
    ];
    QC.modal({
      cls: 'qc-rules-modal', icon: BIG('i-scroll'), title: 'Peraturan Game', dismissable: true,
      html: `<ol class="rules-list">${rules.map((r, i) => `<li><span class="no">${i + 1}</span><span>${r}</span></li>`).join('')}</ol>`,
      buttons: [{ label: 'Mengerti!', value: true, primary: true }]
    });
  };
  QC.onKey = (e) => {
    if (phase === 'question') {
      const key = e.key.toLowerCase();
      P.forEach((p, i) => { if (p.cpu || !KEYS[i]) return; const idx = KEYS[i].indexOf(key); if (idx >= 0 && idx < keys.length) { e.preventDefault(); lock(i, keys[idx]); } });
    } else if ((e.code === 'Space' || e.key === 'Enter') && (phase === 'ready' || phase === 'reveal')) { e.preventDefault(); startRound(); }
  };
  $('btnRestart').onclick = async () => {
    if (QC.isBusy() || phase === 'countdown' || phase === 'resolving' || phase === 'idle') return;
    const v = await QC.modal({ icon: BIG('i-ship'), title: 'Ulangi petualangan?', html: '<p class="qc-muted">Peta baru dibuat dan semua koin kembali ke awal.</p>', buttons: [{ label: 'Batal', value: null }, { label: 'Ubah Pemain', value: 'setup' }, { label: 'Ulang', value: 'again', primary: true }] });
    if (v === 'again') newGame(); else if (v === 'setup') openSetup();
  };

  openSetup();
})();
