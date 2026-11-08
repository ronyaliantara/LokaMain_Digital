/* Ekspedisi Nusantara - Kapal Hidung (ringan): kapal digerakkan hidung lewat kamera */
'use strict';
const STORE_KEY = 'ips_ekspedisi_soal_v2';
const PIN = '1234';
const W = 900, H = 560, SHIP_Y = H - 95, SPEED = 140, CARD_H = 120;
const PLAYER_DEF = [
  { icon: '🦅', color: '#f87171' }, { icon: '🐅', color: '#60a5fa' },
  { icon: '🐘', color: '#4ade80' }, { icon: '🦎', color: '#c084fc' }
];
const GOAL = 5, MAXR = 10;
const FACE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const mk = (question, optionA, optionB, correct, explanation = '') => ({ question, optionA, optionB, correct, explanation });
const DEFAULT_QUESTIONS = [
  mk('Benua terbesar di dunia adalah...', 'Asia', 'Afrika', 'A'),
  mk('Garis khayal yang membagi bumi menjadi belahan utara dan selatan adalah...', 'Meridian', 'Ekuator (khatulistiwa)', 'B'),
  mk('Proklamasi Kemerdekaan Indonesia dibacakan pada...', '17 Agustus 1945', '17 Agustus 1946', 'A'),
  mk('Sumpah Pemuda diikrarkan pada tahun...', '1945', '1928', 'B'),
  mk('Sungai terpanjang di Indonesia adalah Sungai...', 'Kapuas', 'Bengawan Solo', 'A'),
  mk('Kegiatan menukar barang dengan barang disebut...', 'Jual beli', 'Barter', 'B'),
  mk('Kebutuhan pokok manusia adalah sandang, pangan, dan...', 'Papan', 'Hiburan', 'A'),
  mk('Organisasi pergerakan nasional yang berdiri pada tahun 1908 adalah...', 'Sarekat Islam', 'Budi Utomo', 'B'),
  mk('Tokoh yang dijuluki Bapak Pendidikan Nasional adalah...', 'Ki Hajar Dewantara', 'R.A. Kartini', 'A'),
  mk('Hubungan timbal balik antarindividu atau kelompok disebut...', 'Mobilitas sosial', 'Interaksi sosial', 'B'),
  mk('Perpindahan posisi seseorang dalam lapisan masyarakat disebut...', 'Mobilitas sosial', 'Interaksi sosial', 'A'),
  mk('Lapisan atmosfer tempat terjadinya cuaca adalah...', 'Stratosfer', 'Troposfer', 'B'),
  mk('Ibu kota Provinsi Jawa Timur adalah...', 'Surabaya', 'Malang', 'A'),
  mk('Selain alat tukar, uang berfungsi sebagai satuan hitung dan...', 'Penyimpan nilai', 'Penghasil barang', 'A'),
  mk('Candi Buddha terbesar di dunia yang berada di Magelang adalah...', 'Prambanan', 'Borobudur', 'B'),
  mk('Kerajaan Hindu tertua di Indonesia adalah...', 'Kutai', 'Majapahit', 'A'),
  mk('Indonesia memiliki iklim...', 'Subtropis', 'Tropis', 'B'),
  mk('Menurut hukum permintaan, jika harga naik maka jumlah barang yang diminta cenderung...', 'Turun', 'Naik', 'A'),
  mk('Peristiwa Bandung Lautan Api terjadi pada tahun...', '1950', '1946', 'B'),
  mk('ASEAN didirikan di Bangkok pada tahun...', '1967', '1975', 'A'),
  mk('Ibu kota negara Malaysia adalah...', 'Kuala Lumpur', 'Bangkok', 'A'),
  mk('Mata uang resmi Jepang adalah...', 'Won', 'Yen', 'B'),
  mk('Puncak tertinggi di Indonesia adalah...', 'Puncak Jaya', 'Gunung Semeru', 'A'),
  mk('Danau vulkanik terbesar di Indonesia, terletak di Sumatra Utara, adalah Danau...', 'Toba', 'Singkarak', 'A'),
  mk('Presiden pertama Republik Indonesia adalah...', 'Soeharto', 'Soekarno', 'B'),
  mk('Bendera Pusaka Merah Putih dijahit oleh...', 'Fatmawati', 'Sayuti Melik', 'A'),
  mk('Perang Jawa (1825-1830) dipimpin oleh...', 'Imam Bonjol', 'Pangeran Diponegoro', 'B'),
  mk('Sistem Tanam Paksa (Cultuurstelsel) diterapkan oleh Gubernur Jenderal...', 'Van den Bosch', 'Daendels', 'A'),
  mk('Jalan Raya Pos Anyer-Panarukan dibangun pada masa...', 'Daendels', 'Raffles', 'A'),
  mk('Pusat Kerajaan Sriwijaya berada di sekitar...', 'Palembang', 'Yogyakarta', 'A'),
  mk('Sumpah Palapa diucapkan oleh Mahapatih...', 'Hayam Wuruk', 'Gajah Mada', 'B'),
  mk('Ilmu yang mempelajari cara manusia memenuhi kebutuhan dengan sumber daya terbatas adalah...', 'Ekonomi', 'Geologi', 'A'),
  mk('Jenis hutan yang paling banyak di Indonesia adalah hutan...', 'Hujan tropis', 'Gugur', 'A'),
  mk('Pergantian siang dan malam disebabkan oleh...', 'Rotasi bumi', 'Revolusi bumi', 'A'),
  mk('Pergantian musim terjadi akibat...', 'Rotasi bumi', 'Revolusi bumi', 'B'),
  mk('Indonesia rawan gempa karena berada di pertemuan lempeng...', 'Indo-Australia, Eurasia, dan Pasifik', 'Afrika, Amerika, dan Antartika', 'A'),
  mk('Pasar dengan satu penjual dan banyak pembeli disebut...', 'Persaingan sempurna', 'Monopoli', 'B'),
  mk('Uang kertas dan uang logam termasuk uang...', 'Kartal', 'Giral', 'A'),
  mk('Lembaga yang berwenang menerbitkan uang rupiah adalah...', 'Bank Indonesia', 'OJK', 'A'),
  mk('Tokoh yang dijuluki Bapak Koperasi Indonesia adalah...', 'Mohammad Hatta', 'Ki Hajar Dewantara', 'A'),
  mk('Sila ke-3 Pancasila berbunyi...', 'Persatuan Indonesia', 'Kemanusiaan yang adil dan beradab', 'A'),
  mk('Semboyan Bhinneka Tunggal Ika berarti...', 'Bersatu kita teguh', 'Berbeda-beda tetapi tetap satu', 'B'),
  mk('Percampuran budaya asing dan lokal tanpa menghilangkan ciri asli budaya lokal disebut...', 'Akulturasi', 'Segregasi', 'A'),
  mk('Indonesia terletak di antara dua benua, yaitu...', 'Asia dan Australia', 'Afrika dan Eropa', 'A'),
  mk('Samudra yang berbatasan dengan Indonesia di sebelah selatan adalah Samudra...', 'Atlantik', 'Hindia', 'B'),
  mk('Kota Jakarta termasuk wilayah waktu...', 'WIB', 'WITA', 'A'),
  mk('Selat yang memisahkan Pulau Jawa dan Pulau Sumatra adalah Selat...', 'Sunda', 'Bali', 'A'),
  mk('Hari Kebangkitan Nasional diperingati setiap tanggal...', '28 Oktober', '20 Mei', 'B'),
  mk('UUD 1945 disahkan oleh PPKI pada tanggal...', '18 Agustus 1945', '17 Agustus 1945', 'A'),
  mk('Negara dengan wilayah terluas di dunia adalah...', 'Rusia', 'Kanada', 'A')
];

const $ = (id) => document.getElementById(id);
const show = (el, on) => el.classList.toggle('hidden', !on);
const stdExplain = (c, a, b) => `Jawaban yang benar adalah ${c}: ${c === 'A' ? a : b}.`;
const isValid = (q) => q && q.question && q.optionA && q.optionB && (q.correct === 'A' || q.correct === 'B');

function loadQuestions() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (Array.isArray(s) && s.length) return s; } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
}
function saveQuestions() { try { localStorage.setItem(STORE_KEY, JSON.stringify(game.questions)); } catch (e) {} }
function beep(freqs) {
  try {
    const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; g.gain.value = 0.07; o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.13); o.stop(ctx.currentTime + i * 0.13 + 0.12);
    });
  } catch (e) {}
}
function sprite(ch, size) {
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * 1.4);
  const x = c.getContext('2d'); x.font = `${size}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(ch, c.width / 2, c.height / 2); return c;
}
function wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line); return lines;
}

// 4 HUKUMAN (jika salah menjawab)
const PUNISH = [
  { icon: '🌊', name: 'Ombak Besar', kind: 'auto', desc: 'Kapalmu terseret ombak!', fx: (g, p) => { g.addScore(p, -5); return 'Skor berkurang 5.'; } },
  { icon: '🌀', name: 'Pusaran Air', kind: 'auto', desc: 'Kapalmu terjebak pusaran!', fx: (g, p) => { g.rev[p] = true; return 'Soal berikutnya: kemudi TERBALIK (kiri jadi kanan)!'; } },
  { icon: '🏴‍☠️', name: 'Bajak Laut', kind: 'auto', desc: 'Bajak laut menebar rintangan di jalurmu!', fx: (g, p) => { g.extra[p] = true; return 'Soal berikutnya: rintangan lebih banyak!'; } },
  { icon: '🤸', name: 'Hukuman Jongkok', kind: 'squat', desc: 'Berdiri tegak di depan kamera, lalu JONGKOK sekali saat aba-aba. Gagal = skor -3.' }
];
const OBST = [{ ch: '🪨', size: 52, r: 24 }, { ch: '🐋', size: 74, r: 33 }, { ch: '🌀', size: 56, r: 26 }];

class Game {
  constructor() {
    this.questions = loadQuestions();
    this.players = []; this.score = []; this.skip = []; this.rev = []; this.extra = []; this.round = 1; this.goalHit = false; this.right = []; this.ans = [];
    this.cur = 0; this.state = 'IDLE'; this.tos = new Set();
    this.shipX = W / 2; this.ptrX = W / 2; this.lastPtr = 0; this.keyDir = 0;
    this.face = { x: 0.5, y: 0.5, h: 0.2, t: 0 }; this.cx = 0.5; this.samples = [];
    this.deck = []; this.qi = 0; this.total = 50;
    this.objs = []; this.cards = null; this.hitUntil = 0; this.shake = 0;
    this.fd = null; this.busy = false; this.fdReady = false; this.camOn = false;
    this.cvs = $('cv'); this.ctx = this.cvs.getContext('2d');
    this.spr = { rock: sprite('🪨', 52), whale: sprite('🐋', 74), whirl: sprite('🌀', 56), isle: sprite('🏝️', 48) };
    this.shipSpr = {};
    this.dashes = Array.from({ length: 36 }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 16 }));
    this.isles = [{ x: 40, y: 120 }, { x: W - 80, y: 380 }];
    this.t = 0; this.last = performance.now();
    this.buildStart(); this.bindUI(); this.bindTeacher();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---------- Persiapan ----------
  buildStart() {
    $('nameInputs').innerHTML = '';
    PLAYER_DEF.forEach((d, i) => {
      const inp = document.createElement('input');
      inp.value = `Pemain ${i + 1}`; inp.maxLength = 14; inp.id = 'nm' + i; inp.style.background = d.color;
      $('nameInputs').appendChild(inp);
    });
  }
  bindUI() {
    $('startBtn').onclick = () => { this.begin(); };
    $('resetBtn').onclick = () => this.restart();
    $('playAgainBtn').onclick = () => { show($('winModal'), false); this.restart(); };
    $('readyBtn').onclick = () => this.ready();
    $('okBtn').onclick = () => this.manual(true);
    $('noBtn').onclick = () => this.manual(false);
    const rect = (e) => { const r = this.cvs.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
    this.cvs.addEventListener('pointermove', (e) => { this.ptrX = clamp(rect(e), 0, W); this.lastPtr = performance.now(); });
    this.cvs.addEventListener('pointerdown', (e) => { this.ptrX = clamp(rect(e), 0, W); this.lastPtr = performance.now(); });
    addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && this.state === 'WAIT') { e.preventDefault(); this.ready(); }
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keyDir = -1; if (e.key === 'ArrowRight' || e.key === 'd') this.keyDir = 1; });
    addEventListener('keyup', (e) => { if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) this.keyDir = 0; });
  }
  begin() {
    const list = [];
    PLAYER_DEF.forEach((d, i) => { const n = $('nm' + i).value.trim(); if (n) list.push({ ...d, name: n }); });
    if (list.length < 2) { show($('startErr'), true); return; }
    this.players = list; this.total = 50;
    show($('startModal'), false);
    beep([440]);
    if (!this.camOn) this.initCamera();
    this.restart();
  }
  restart() {
    this.clear();
    if (!this.players.length) { show($('startModal'), true); return; }
    this.score = this.players.map(() => 0); this.skip = this.players.map(() => 0); this.rev = this.players.map(() => false); this.extra = this.players.map(() => false);
    this.round = 1; this.goalHit = false;
    this.right = this.players.map(() => 0); this.ans = this.players.map(() => 0);
    const valid = this.questions.filter(isValid);
    this.deck = shuffle(valid).slice(0, this.total); this.qi = 0; this.cur = 0; this.hits = 0;
    show($('winModal'), false);
    this.renderPlayers();
    this.startTurn();
  }
  later(fn, ms) { const h = setTimeout(() => { this.tos.delete(h); fn(); }, ms); this.tos.add(h); }
  clear() {
    this.tos.forEach(clearTimeout); this.tos.clear();
    show($('panel'), false); show($('banner'), false); show($('hud'), false);
    this.objs = []; this.cards = null; this.state = 'IDLE';
  }
  pause() { this.clear(); this.state = 'PAUSED'; }
  banner(t, bg) { const b = $('banner'); b.textContent = t; b.style.background = bg || '#fde047'; show(b, !!t); }

  // ---------- Kamera + deteksi hidung ----------
  async initCamera() {
    const st = (m) => { $('camStatus').textContent = m; };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
      this.video = $('cam'); this.video.srcObject = stream; await this.video.play();
      this.camOn = true; $('camHint').textContent = 'Kamera aktif, mencari wajah…';
    } catch (e) { st('Tanpa kamera: pakai mouse / ← →'); $('camHint').textContent = 'Kamera tidak tersedia'; return; }
    st('Memuat deteksi wajah…');
    try {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = FACE_CDN + 'face_detection.js'; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      this.fd = new FaceDetection({ locateFile: (f) => FACE_CDN + f });
      this.fd.setOptions({ model: 'short', minDetectionConfidence: 0.5 });
      this.fd.onResults((r) => this.onFace(r));
      await this.fd.initialize();
      this.fdReady = true; st('Kamera aktif ✓'); $('camHint').textContent = 'Titik merah = hidungmu';
      this.detectLoop();
    } catch (e) { st('Deteksi gagal (perlu internet): pakai mouse / ← →'); }
  }
  needFace() { return ['READY', 'SAIL', 'SQUAT'].includes(this.state); }
  async detectLoop() {
    if (this.fdReady && this.needFace() && !this.busy && !document.hidden && this.video.readyState >= 2) {
      this.busy = true;
      try { await this.fd.send({ image: this.video }); } catch (e) {}
      this.busy = false;
    }
    setTimeout(() => this.detectLoop(), 50);
  }
  onFace(r) {
    const d = r.detections && r.detections[0]; if (!d) return;
    const lm = d.landmarks || d.keypoints, n = lm && lm[2]; if (!n) return;
    const bb = d.boundingBox, h = bb && bb.height ? bb.height : 0.2;
    this.face = { x: n.x, y: n.y, h, t: performance.now() };
    const dot = $('noseDot'); dot.style.left = (1 - n.x) * 100 + '%'; dot.style.top = n.y * 100 + '%';
  }
  faceActive() { return performance.now() - this.face.t < 400; }

  // ---------- Tampilan ----------
  renderPlayers() {
    const box = $('players'); box.innerHTML = '';
    this.players.forEach((p, k) => {
      const d = document.createElement('div');
      d.className = 'pchip' + (k === this.cur && this.state !== 'DONE' ? ' turn' : '');
      d.style.background = p.color;
      d.innerHTML = `<span>${p.icon}</span><div><b></b><small>Skor ${this.score[k]}${this.skip[k] ? ' • ⏭️' : ''}</small></div>`;
      d.querySelector('b').textContent = p.name; box.appendChild(d);
    });
    this.renderMap();
  }
  renderMap() {
    const m = $('map'); if (!m) return; m.innerHTML = '';
    const lead = Math.max(0, ...this.right);
    this.players.forEach((p, k) => {
      const r = this.right[k] || 0, row = document.createElement('div');
      row.className = 'mrow' + (r === lead && lead > 0 ? ' lead' : ''); row.style.background = p.color;
      const gap = lead - r;
      row.innerHTML = '<b><span></span><span></span></b><div class="track"></div><small></small>';
      const sp = row.querySelectorAll('b span'); sp[0].textContent = `${p.icon} ${p.name}`; sp[1].textContent = `${r}/${GOAL}`;
      const tr = row.querySelector('.track');
      for (let i = 0; i <= GOAL; i++) {
        const c = document.createElement('div'); c.className = 'cell' + (i < r ? ' done' : '') + (i === GOAL ? ' fin' : '') + (i === r ? ' here' : '');
        c.textContent = i === r ? p.icon : i === GOAL ? '🏁' : ''; tr.appendChild(c);
      }
      row.querySelector('small').textContent = `Dijawab ${this.ans[k] || 0} • ` + (gap === 0 ? (lead > 0 ? 'memimpin 🥇' : 'sama kuat') : `tertinggal ${gap} benar`);
      m.appendChild(row);
    });
  }
  addScore(p, d) { this.score[p] = Math.max(0, this.score[p] + d); this.renderPlayers(); }
  swapWithLast(p) {
    const others = this.players.map((_, i) => i).filter((i) => i !== p);
    const last = others.reduce((a, b) => (this.score[b] < this.score[a] ? b : a));
    if (this.score[last] >= this.score[p]) return 'Kamu sudah paling belakang, aman!';
    [this.score[p], this.score[last]] = [this.score[last], this.score[p]]; this.renderPlayers();
    return `Skor bertukar dengan ${this.players[last].name}.`;
  }
  panel(o) {
    $('pTag').textContent = o.tag || ''; $('pTag').style.background = o.bg || '#fde047';
    $('pIcon').textContent = o.icon || ''; $('pTitle').textContent = o.title || '';
    $('pText').textContent = o.text || ''; $('pTimer').textContent = o.timer ?? '';
    $('pExtra').textContent = o.extra || ''; show($('pBtns'), !!o.btns); show($('readyBtn'), !!o.ready); show($('panel'), true);
  }

  // ---------- Giliran ----------
  nextTurn() {
    const nxt = (this.cur + 1) % this.players.length;
    if (nxt === 0) { if (this.goalHit || this.round >= MAXR) return this.finish(); this.round++; }
    this.cur = nxt; this.startTurn();
  }
  startTurn() {
    this.clear();
    if (this.qi >= this.deck.length) return this.finish();
    const p = this.players[this.cur];
    this.renderPlayers();
    this.q = this.deck[this.qi++];
    this.leftKey = Math.random() < 0.5 ? 'A' : 'B';
    this.state = 'WAIT'; this.samples = [];
    this.panel({ tag: `${p.icon} Giliran ${p.name}`, bg: p.color, icon: p.icon, title: `${p.name}, siap?`, text: 'Hadap kamera, lalu klik SIAP. Hitungan mundur baru mulai setelah itu.', extra: (this.rev[this.cur] ? '🌀 Kemudi TERBALIK di soal ini! ' : '') + (this.extra[this.cur] ? '🏴‍☠️ Rintangan lebih banyak! ' : '') + `Ronde ${this.round}/${MAXR}`, ready: true });
  }
  ready() {
    if (this.state !== 'WAIT') return;
    const p = this.players[this.cur];
    show($('panel'), false); beep([520]);
    this.state = 'READY'; this.samples = []; this.readyAt = performance.now(); this.hits = 0;
    this.curRev = this.rev[this.cur]; this.curExtra = this.extra[this.cur]; this.rev[this.cur] = false; this.extra[this.cur] = false;
    $('hudTag').textContent = `Ronde ${this.round}/${MAXR} • ${p.icon} ${p.name}`;
    $('qText').textContent = this.q.question; show($('hud'), true);
  }
  beginSail() {
    if (this.samples.length >= 3) this.cx = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const mkCard = (key, color) => {
      const c = document.createElement('canvas'); c.width = 430; c.height = CARD_H; const x = c.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(8, 8, 418, CARD_H - 8);
      x.fillStyle = color; x.strokeStyle = '#0f172a'; x.lineWidth = 5; x.fillRect(3, 3, 414, CARD_H - 14); x.strokeRect(3, 3, 414, CARD_H - 14);
      x.fillStyle = '#0f172a'; x.beginPath(); x.arc(40, 52, 24, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.font = '800 28px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(key, 40, 53);
      x.fillStyle = '#0f172a'; x.textAlign = 'left'; x.font = '800 24px sans-serif';
      const txt = key === 'A' ? this.q.optionA : this.q.optionB;
      let lines = wrapText(x, txt, 320); if (lines.length > 3) { x.font = '800 19px sans-serif'; lines = wrapText(x, txt, 320); }
      const lh = lines.length > 2 ? 26 : 30, y0 = 52 - (lines.length - 1) * lh / 2;
      lines.forEach((l, i) => x.fillText(l, 78, y0 + i * lh));
      return c;
    };
    const rk = this.leftKey === 'A' ? 'B' : 'A';
    this.cards = { y: -250, L: { key: this.leftKey, c: mkCard(this.leftKey, this.leftKey === 'A' ? '#bae6fd' : '#fbcfe8') }, R: { key: rk, c: mkCard(rk, rk === 'A' ? '#bae6fd' : '#fbcfe8') } };
    this.objs = [];
    const n = 2 + Math.floor(Math.random() * 2) + (this.curExtra ? 2 : 0), gap = 90 / (n - 1);
    for (let i = 0; i < n; i++) {
      const o = pick(OBST), spr = o.ch === '🪨' ? this.spr.rock : o.ch === '🐋' ? this.spr.whale : this.spr.whirl;
      this.objs.push({ x: 60 + Math.random() * (W - 120), y: -10 - i * gap - Math.random() * 8, r: o.r, spr, rot: Math.random() * 6 });
    }
    this.state = 'SAIL'; this.banner('', null);
  }

  // ---------- Loop utama ----------
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    if (this.state !== 'PAUSED') { this.update(dt, now); this.draw(now); }
    requestAnimationFrame((t) => this.frame(t));
  }
  steer(dt, now) {
    let tx = this.shipX;
    if (this.keyDir) { this.ptrX = clamp(this.ptrX + this.keyDir * 650 * dt, 0, W); this.lastPtr = now; }
    if (this.faceActive()) { tx = clamp(((1 - this.face.x) - this.cx) * 2.4 + 0.5, 0, 1) * W; }
    else if (now - this.lastPtr < 3000 || !this.camOn) tx = this.ptrX;
    if (this.curRev && this.state !== 'READY' ) tx = W - tx;
    this.shipX += (tx - this.shipX) * Math.min(1, dt * 12);
  }
  update(dt, now) {
    for (const d of this.dashes) { d.y += SPEED * dt; if (d.y > H) { d.y = -20; d.x = Math.random() * W; } }
    for (const s of this.isles) { s.y += SPEED * dt; if (s.y > H + 60) { s.y = -80; s.x = Math.random() < 0.5 ? 20 + Math.random() * 60 : W - 90 - Math.random() * 40; } }
    this.shake = Math.max(0, this.shake - dt);
    if (this.state === 'READY') {
      this.steer(dt, now);
      if (this.faceActive()) this.samples.push(1 - this.face.x), this.samples.length > 20 && this.samples.shift();
      const left = 2 - (now - this.readyAt) / 1000;
      const p = this.players[this.cur];
      this.banner(left > 0 ? `${p.icon} ${p.name}, siap! Lihat ke tengah… ${Math.ceil(left)}` : '', p.color);
      if (left <= 0) this.beginSail();
    } else if (this.state === 'SAIL') {
      this.steer(dt, now);
      for (const o of this.objs) {
        o.y += SPEED * dt;
        if (now > this.hitUntil && Math.hypot(o.x - this.shipX, o.y - SHIP_Y) < o.r + 22) {
          this.hitUntil = now + 1300; this.shake = 0.5; this.addScore(this.cur, -2); this.hits++; beep([180]);
          this.flash = '💥 -2';  this.flashT = 1;
        }
      }
      this.objs = this.objs.filter((o) => o.y < H + 80);
      this.cards.y += SPEED * dt;
      if (this.cards.y + CARD_H >= SHIP_Y - 24) this.resolve(this.shipX < W / 2 ? 'L' : 'R');
    } else if (this.state === 'SQUAT') this.updateSquat(now);
    if (this.flashT > 0) this.flashT -= dt;
  }

  // ---------- Hasil jawaban ----------
  resolve(side) {
    const choice = side === 'L' ? this.cards.L.key : this.cards.R.key, ok = choice === this.q.correct, k = this.cur;
    this.state = 'RESULT'; this.objs = []; this.chosen = side; this.ok = ok;
    const ex = this.q.explanation || stdExplain(this.q.correct, this.q.optionA, this.q.optionB);
    if (ok) {
      const bonus = this.hits === 0 ? 5 : 0;
      this.ans[k]++; this.right[k]++; this.addScore(k, 10 + bonus); beep([660, 880]);
      this.panel({ tag: '🌟 BENAR!', bg: '#86efac', icon: '🎉', title: `${this.players[k].name} +${10 + bonus} poin`, text: (bonus ? 'Bonus +5: tidak menabrak rintangan! ' : '') + ex });
      this.later(() => { if (this.right[k] >= GOAL) this.goalHit = true; this.nextTurn(); }, 1700);
    } else {
      this.ans[k]++; this.renderPlayers(); beep([220]); this.shake = 0.6;
      this.panel({ tag: '😵 KURANG TEPAT', bg: '#fca5a5', icon: '❌', title: 'Kena hukuman!', text: ex });
      this.later(() => this.runPunish(k, pick(PUNISH)), 1900);
    }
  }
  runPunish(p, task) {
    const pl = this.players[p];
    this.task = task; const tag = `💥 HUKUMAN ${pl.name}`;
    if (task.kind === 'auto') {
      this.state = 'TASK'; beep([300, 200]);
      this.panel({ tag, bg: '#fca5a5', icon: task.icon, title: task.name, text: task.desc, extra: task.fx(this, p) });
      this.later(() => this.nextTurn(), 2200); return;
    }
    this.state = 'SQUAT'; this.sqStage = 'ready'; this.sqAt = performance.now(); this.base = [];
    this.panel({ tag, bg: '#fca5a5', icon: task.icon, title: task.name, text: task.desc, timer: 2, extra: 'Berdiri tegak di depan kamera…', btns: true });
  }
  updateSquat(now) {
    const el = (now - this.sqAt) / 1000;
    if (this.sqStage === 'ready') {
      if (this.faceActive()) { this.base.push(this.face.y); if (this.base.length > 15) this.base.shift(); }
      $('pTimer').textContent = Math.max(0, Math.ceil(2 - el));
      if (el >= 2) {
        this.baseY = this.base.length ? this.base.reduce((a, b) => a + b, 0) / this.base.length : null;
        this.baseH = this.face.h; this.sqStage = 'go'; this.sqAt = now; beep([880]);
        $('pTitle').textContent = 'JONGKOK SEKARANG!'; $('pExtra').textContent = this.baseY === null ? 'Kamera tidak melihat wajah: teman menilai ✅/❌' : '';
      }
    } else if (this.sqStage === 'go') {
      $('pTimer').textContent = Math.max(0, Math.ceil(4 - el));
      if (this.baseY !== null) {
        const drop = this.face.y - this.baseY, th = Math.max(0.07, this.baseH * 0.6);
        const lost = !this.faceActive() && el > 0.5 && (this.face.y - this.baseY) > 0.04;
        if (this.faceActive() && drop > th || lost) return this.manual(true);
      }
      if (el >= 4 && this.baseY !== null) this.manual(false);
      else if (el >= 8) this.manual(false);
    }
  }
  manual(ok) {
    if (this.state !== 'SQUAT') return;
    this.state = 'TASK'; show($('pBtns'), false); $('pTimer').textContent = ''; $('pTitle').textContent = this.task.name;
    if (ok) { beep([660, 880]); $('pExtra').textContent = '👏 Berhasil, hukuman selesai!'; }
    else { this.addScore(this.cur, -3); beep([200]); $('pExtra').textContent = 'Gagal: skor -3.'; }
    this.later(() => this.nextTurn(), 1500);
  }
  finish() {
    this.clear(); this.state = 'DONE'; this.renderPlayers();
    const all = this.players.map((p, i) => ({ p, s: this.score[i], r: this.right[i], n: this.ans[i] }));
    const first = all.slice().sort((a, b) => b.r - a.r || b.s - a.s)[0];
    const order = all.sort((a, b) => b.s - a.s || b.r - a.r);
    $('winTitle').textContent = `🏁 ${first.p.name} juara ekspedisi! (${first.r} benar)`;
    $('bestLine').textContent = `🥇 Siswa terbaik (skor tertinggi): ${order[0].p.name} — ${order[0].s} poin`;
    $('winRank').innerHTML = '';
    order.forEach((o, i) => { const li = document.createElement('li'); if (i === 0) li.className = 'top'; li.textContent = `${o.p.icon} ${o.p.name} — ${o.s} poin (${o.r} benar dari ${o.n} soal)`; $('winRank').appendChild(li); });
    beep([523, 659, 784, 1046]); show($('winModal'), true);
  }

  // ---------- Gambar ----------
  shipSprite(p) {
    if (!this.shipSpr[p]) {
      const c = document.createElement('canvas'); c.width = 110; c.height = 110; const x = c.getContext('2d');
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '84px serif'; x.fillText('⛵', 55, 58);
      x.font = '28px serif'; x.fillText(this.players[p].icon, 55, 98);
      this.shipSpr[p] = c;
    }
    return this.shipSpr[p];
  }
  draw(now) {
    const c = this.ctx, t = this.t;
    c.save();
    if (this.shake > 0) c.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 10 * this.shake);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#22d3ee'); g.addColorStop(1, '#0369a1');
    c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 3; c.beginPath();
    for (const d of this.dashes) { c.moveTo(d.x, d.y); c.lineTo(d.x + 14, d.y + d.l * 0.2); }
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 4;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      for (let x = 0; x <= W; x += 30) { const y = H - 20 - k * 16 + Math.sin(x / 55 + t * 2.2 + k) * 6; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    for (const s of this.isles) c.drawImage(this.spr.isle, s.x, s.y);
    for (const o of this.objs) {
      const w = o.spr.width; c.save(); c.translate(o.x, o.y); c.rotate(o.spr === this.spr.whirl ? t * 3 : Math.sin(t * 2 + o.rot) * 0.12);
      c.drawImage(o.spr, -w / 2, -w / 2); c.restore();
    }
    if (this.cards && (this.state === 'SAIL' || this.state === 'RESULT')) {
      c.drawImage(this.cards.L.c, 10, this.cards.y); c.drawImage(this.cards.R.c, 460, this.cards.y);
    }
    if (this.players.length && ['READY', 'SAIL', 'RESULT', 'SQUAT', 'TASK'].includes(this.state)) {
      const sp = this.shipSprite(this.cur), blink = now < this.hitUntil && Math.floor(now / 90) % 2;
      if (!blink) {
        c.save(); c.translate(this.shipX, SHIP_Y + Math.sin(t * 4) * 3); c.rotate(clamp((this.shipX - (this.lastX ?? this.shipX)) * 0.02, -0.3, 0.3) + Math.sin(t * 3) * 0.05);
        c.drawImage(sp, -55, -62); c.restore();
      }
      this.lastX = this.shipX;
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(this.shipX, SHIP_Y + 44, 36, 7, 0, 0, 7); c.fill();
    }
    if (this.flashT > 0) { c.font = '800 34px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fde047'; c.strokeStyle = '#0f172a'; c.lineWidth = 5; c.strokeText(this.flash, this.shipX, SHIP_Y - 70 - (1 - this.flashT) * 30); c.fillText(this.flash, this.shipX, SHIP_Y - 70 - (1 - this.flashT) * 30); }
    c.restore();
  }
}
let game;
addEventListener("DOMContentLoaded", () => { game = new Game(); });
