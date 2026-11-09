/* Ekspedisi Nusantara - Kapal Hidung (ringan): kapal digerakkan hidung lewat kamera */
'use strict';
const STORE_KEY = 'ips_ekspedisi_soal_v2';
const PIN = '1234';
const W = 900, H = 560, SHIP_Y = H - 95, SPEED = 125, CARD_H = 120;
const CARD_Y0 = -900;                       // kartu jawaban mulai SANGAT jauh di atas -> waktu baca lebih lama
const TRIGGER_Y = SHIP_Y - 24 - CARD_H;     // posisi kartu saat garis jawaban mencapai kapal
let READY_SEC = 5;                           // jeda sebelum berlayar (soal + pilihan jawaban sudah tampil) — dari pengaturan
const SWAP_SEC = 2.6;                        // mode jebakan: papan bertukar saat garis jawaban tinggal 2,6 detik
const PLAYER_DEF = [
  { icon: '🦅', color: '#f87171' }, { icon: '🐅', color: '#60a5fa' },
  { icon: '🐘', color: '#4ade80' }, { icon: '🦎', color: '#c084fc' }
];
let GOAL = 5, MAXR = 10;

// ---------- Pengaturan permainan (disimpan di perangkat) ----------
const SET_KEY = 'ips_ekspedisi_setting_v1';
const SETTINGS_DEF = [
  { key: 'speed', label: '⛵ Kecepatan kapal', value: 125, options: [[70, 'Sangat pelan'], [95, 'Pelan'], [125, 'Sedang'], [160, 'Cepat']] },
  { key: 'read', label: '📖 Waktu baca sebelum berlayar', value: 5, options: [[3, '3 detik'], [5, '5 detik'], [8, '8 detik'], [12, '12 detik']] },
  { key: 'trap', label: '🔀 Posisi jawaban A / B', value: 'trap', options: [['fixed', 'Tetap (A kiri, B kanan)'], ['random', 'Acak (diberi tahu arahnya)'], ['trap', 'Jebakan (acak + bisa tukar)']] },
  { key: 'opts', label: '📝 Pilihan di kotak soal', value: 'show', options: [['show', 'Tampilkan'], ['hide', 'Sembunyikan (lebih sulit)']] },
  { key: 'goal', label: '🏁 Finis setelah benar', value: 5, options: [[3, '3 kali'], [5, '5 kali'], [7, '7 kali'], [10, '10 kali']] },
  { key: 'rounds', label: '🔁 Maksimal ronde', value: 10, options: [[5, '5 ronde'], [10, '10 ronde'], [15, '15 ronde'], [20, '20 ronde']] },
  { key: 'obst', label: '🪨 Rintangan di laut', value: 'normal', options: [['none', 'Tidak ada'], ['few', 'Sedikit'], ['normal', 'Normal'], ['many', 'Banyak']] },
  { key: 'punish', label: '💥 Hukuman jika salah', value: 'all', options: [['all', 'Semua (termasuk jongkok)'], ['nosquat', 'Tanpa jongkok'], ['off', 'Tanpa hukuman']] },
  { key: 'sound', label: '🔊 Suara', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] }
];
function loadSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(SET_KEY)) || {}; } catch (e) {}
  const out = {};
  SETTINGS_DEF.forEach((d) => { const v = s[d.key]; out[d.key] = d.options.some((o) => String(o[0]) === String(v)) ? (typeof d.value === 'number' ? Number(v) : v) : d.value; });
  return out;
}
let CFG = loadSettings();
function applySettings() {
  GOAL = CFG.goal; MAXR = CFG.rounds; READY_SEC = CFG.read;
  const g = document.getElementById('goalTxt'); if (g) g.textContent = `(finis: ${GOAL} benar)`;
}
const SEEN_KEY = 'ips_ekspedisi_seen_v1';
const FACE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/';
const rnd = () => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
const keyOf = (q) => q.question + '|' + q.optionA + '|' + q.optionB;
const isValid = (q) => q && q.question && q.optionA && q.optionB && (q.correct === 'A' || q.correct === 'B');

function loadQuestions() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (Array.isArray(s) && s.length) return s; } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
}
function saveQuestions() { try { localStorage.setItem(STORE_KEY, JSON.stringify(game.questions)); } catch (e) {} }
function beep(freqs) {
  if (CFG.sound === 'off') return;
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

function makeIsland(v) {
  const c = document.createElement('canvas'); c.width = 150; c.height = 120; const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,60,90,.25)'; x.beginPath(); x.ellipse(78, 98, 60, 15, 0, 0, 7); x.fill();
  x.fillStyle = '#fde8a6'; x.beginPath(); x.ellipse(75, 88, 58, 20, 0, 0, 7); x.fill();
  x.fillStyle = '#f5c870'; x.beginPath(); x.ellipse(75, 94, 52, 12, 0, 0, 7); x.fill();
  x.fillStyle = '#4ade80'; x.beginPath(); x.ellipse(75, 80, 38, 16, 0, 0, 7); x.fill();
  x.fillStyle = '#22c55e'; x.beginPath(); x.ellipse(66, 76, 20, 11, 0, 0, 7); x.fill();
  const palm = (px, py, h, lean) => {
    x.strokeStyle = '#7c4a1e'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + lean * 0.3, py - h * 0.6, px + lean, py - h); x.stroke();
    const tx = px + lean, ty = py - h;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.62; x.save(); x.translate(tx, ty); x.rotate(a + Math.PI / 2);
      x.fillStyle = i % 2 ? '#16a34a' : '#15803d'; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(10, -6, 4, 28); x.quadraticCurveTo(-8, 10, 0, 0); x.fill(); x.restore();
    }
    x.fillStyle = '#92400e'; x.beginPath(); x.arc(tx - 3, ty + 4, 3.5, 0, 7); x.arc(tx + 4, ty + 5, 3.5, 0, 7); x.fill();
  };
  if (v === 0) { palm(88, 82, 62, 14); palm(60, 84, 44, -12); }
  else if (v === 1) { palm(76, 84, 70, -10); x.fillStyle = '#ef4444'; x.beginPath(); x.moveTo(104, 84); x.lineTo(104, 54); x.lineTo(122, 62); x.lineTo(104, 68); x.fill(); x.fillStyle = '#7c4a1e'; x.fillRect(102, 54, 3, 34); }
  else { palm(92, 82, 50, 10); x.fillStyle = '#94a3b8'; x.beginPath(); x.ellipse(52, 84, 14, 9, 0, Math.PI, 0); x.fill(); x.fillStyle = '#64748b'; x.beginPath(); x.ellipse(60, 85, 9, 6, 0, Math.PI, 0); x.fill(); }
  return c;
}

// 4 HUKUMAN (jika salah menjawab)
const PUNISH = [
  { icon: '🌊', name: 'Ombak Besar', kind: 'auto', desc: 'Kapalmu terseret ombak!', fx: (g, p) => { g.addScore(p, -5); return 'Skor berkurang 5.'; } },
  { icon: '🌀', name: 'Pusaran Air', kind: 'auto', desc: 'Kapalmu terjebak pusaran!', fx: (g, p) => { g.rev[p] = true; return 'Soal berikutnya: kemudi TERBALIK (kiri jadi kanan)!'; } },
  { icon: '🏴‍☠️', name: 'Bajak Laut', kind: 'auto', desc: 'Bajak laut menebar rintangan di jalurmu!', fx: (g, p) => { g.extra[p] = true; return 'Soal berikutnya: rintangan lebih banyak!'; } },
  { icon: '🤸', name: 'Hukuman Jongkok', kind: 'squat', desc: 'Berdiri tegak di depan kamera, lalu JONGKOK sekali saat aba-aba. Gagal = skor -3.' }
];
const OBST = [
  { id: 'rock', ch: '🪨', size: 52, r: 24 }, { id: 'whale', ch: '🐋', size: 74, r: 33 }, { id: 'whirl', ch: '🌀', size: 56, r: 26 },
  { id: 'ice', ch: '🧊', size: 56, r: 25 }, { id: 'octo', ch: '🐙', size: 60, r: 27 }, { id: 'puff', ch: '🐡', size: 46, r: 21 },
  { id: 'shark', ch: '🦈', size: 62, r: 28, move: true }
];

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
    this.spr = {}; OBST.forEach((o) => { this.spr[o.id] = sprite(o.ch, o.size); });
    this.isleSpr = [makeIsland(0), makeIsland(1), makeIsland(2)];
    this.wake = []; this.spark = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, ph: Math.random() * 6.28, s: 2 + Math.random() * 3 }));
    this.clouds = Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * W, y: i * 160 - 40, w: 160 + Math.random() * 120, vy: 0.5 + Math.random() * 0.4 }));
    this.gulls = Array.from({ length: 3 }, (_, i) => ({ x: Math.random() * W, y: 60 + i * 70 + Math.random() * 30, v: 30 + Math.random() * 25, ph: Math.random() * 6 }));
    this.bubbles = Array.from({ length: 18 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 4, v: 14 + Math.random() * 20 }));
    this.scroll = 0; this.sides = [];
    this.dashes = Array.from({ length: 36 }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 16 }));
    this.isles = [{ x: 10, y: 80, v: 0 }, { x: W - 150, y: 330, v: 1 }, { x: 20, y: -220, v: 2 }];
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
    const grid = $('setGrid'); grid.innerHTML = '';
    SETTINGS_DEF.forEach((d) => {
      const lab = document.createElement('label'); lab.className = 'set';
      const sp = document.createElement('span'); sp.textContent = d.label;
      const sel = document.createElement('select'); sel.id = 'set_' + d.key;
      d.options.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; if (String(v) === String(CFG[d.key])) o.selected = true; sel.appendChild(o); });
      lab.append(sp, sel); grid.appendChild(lab);
    });
    applySettings();
  }
  readSettings() {
    SETTINGS_DEF.forEach((d) => { const v = $('set_' + d.key).value; CFG[d.key] = typeof d.value === 'number' ? Number(v) : v; });
    try { localStorage.setItem(SET_KEY, JSON.stringify(CFG)); } catch (e) {}
    applySettings();
  }
  openSettings() { this.pause(); show($('winModal'), false); show($('startModal'), true); }
  bindUI() {
    $('startBtn').onclick = () => { this.begin(); };
    $('setBtn').onclick = () => this.openSettings();
    this.bindFullscreen();
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
  // ---------- Layar penuh ----------
  bindFullscreen() {
    const root = document.documentElement, btn = $('fsBtn');
    const req = root.requestFullscreen || root.webkitRequestFullscreen, ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (!req) { btn.classList.add('hidden'); return; }   // mis. iPhone Safari: tidak didukung
    const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const toggle = () => {
      if (isFs()) { ex.call(document); return; }
      const r = req.call(root); if (r && r.catch) r.catch(() => {});
      try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
    };
    const sync = () => { const on = isFs(); btn.textContent = on ? '🗗 Keluar Layar Penuh' : '⛶ Layar Penuh'; document.body.classList.toggle('fs', on); };
    btn.onclick = toggle;
    document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
    addEventListener('keydown', (e) => { if ((e.key === 'f' || e.key === 'F') && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) toggle(); });
  }
  begin() {
    const list = [];
    PLAYER_DEF.forEach((d, i) => { const n = $('nm' + i).value.trim(); if (n) list.push({ ...d, name: n }); });
    if (list.length < 2) { show($('startErr'), true); return; }
    show($('startErr'), false); this.readSettings();
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
    this.deck = this.buildDeck(); this.qi = 0; this.cur = 0; this.hits = 0; this.sides = [];
    show($('winModal'), false);
    this.renderPlayers();
    this.startTurn();
  }
  // Kocok soal dengan acak kriptografis. Soal yang belum pernah keluar didahulukan (lintas permainan),
  // jadi semua soal dari bank ikut terpakai dan tidak itu-itu saja.
  loadSeen() { try { const a = JSON.parse(localStorage.getItem(SEEN_KEY)); if (Array.isArray(a)) return new Set(a); } catch (e) {} return new Set(); }
  saveSeen() { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...this.seen])); } catch (e) {} }
  buildDeck() {
    const valid = this.questions.filter(isValid); this.seen = this.loadSeen();
    const fresh = valid.filter((q) => !this.seen.has(keyOf(q))), old = valid.filter((q) => this.seen.has(keyOf(q)));
    let deck = shuffle(fresh).concat(shuffle(old));
    if (old.length && deck.length > 1 && this.lastFirst && keyOf(deck[0]) === this.lastFirst) { const j = 1 + Math.floor(rnd() * (deck.length - 1)); [deck[0], deck[j]] = [deck[j], deck[0]]; }
    this.lastFirst = deck[0] ? keyOf(deck[0]) : null; return deck;
  }
  markSeen(q) {
    const total = this.questions.filter(isValid).length;
    if (this.seen.size >= total) this.seen.clear();
    this.seen.add(keyOf(q)); this.saveSeen();
  }
  // posisi jawaban benar kiri/kanan: acak, tapi tidak lebih dari 2x berturut-turut di sisi yang sama
  pickSide() {
    if (CFG.trap === 'fixed') return 'A';
    const s = this.sides, n = s.length; let side = rnd() < 0.5 ? 'A' : 'B';
    if (n >= 2 && s[n - 1] === s[n - 2] && s[n - 1] === side) side = side === 'A' ? 'B' : 'A';
    s.push(side); return side;
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
      const tr = row.querySelector('.track'); tr.style.gridTemplateColumns = `repeat(${GOAL + 1},1fr)`;
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
    this.q = this.deck[this.qi++]; this.markSeen(this.q);
    this.leftKey = this.pickSide();
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
    $('qText').textContent = this.q.question; this.renderOpts(); show($('hud'), true);
  }
  // Pilihan jawaban langsung tampil di bawah soal (posisi kiri/kanan sama dengan papan di laut)
  // Mode jebakan: hanya A & B tanpa panah — posisi kiri/kanan harus dilihat dari papan di laut.
  renderOpts() {
    const box = $('qOpts'); box.textContent = ''; show(box, CFG.opts !== 'hide');
    const trap = CFG.trap === 'trap';
    const lk = this.cards ? this.cards.L.key : this.leftKey, rk = lk === 'A' ? 'B' : 'A';
    const list = trap ? [['A', ''], ['B', '']] : [[lk, 'L'], [rk, 'R']];
    list.forEach(([k, side]) => {
      const el = document.createElement('div'); el.className = `q-opt q-${k.toLowerCase()}` + (side ? ` q-${side.toLowerCase()}` : '');
      const b = document.createElement('b'); b.textContent = k;
      const t = document.createElement('span'); t.textContent = k === 'A' ? this.q.optionA : this.q.optionB;
      if (!side) el.append(b, t);
      else { const arrow = document.createElement('i'); arrow.textContent = side === 'L' ? '⬅️' : '➡️'; if (side === 'L') el.append(arrow, b, t); else el.append(b, t, arrow); }
      box.appendChild(el);
    });
    if (trap) { const n = document.createElement('div'); n.className = 'q-trap'; n.textContent = '🔀 Jebakan! A/B bisa di kiri atau kanan — lihat papan di laut'; box.appendChild(n); }
  }
  beginSail() {
    if (this.samples.length >= 3) this.cx = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const mkCard = (key, color) => {
      const c = document.createElement('canvas'); c.width = 430; c.height = CARD_H; const x = c.getContext('2d');
      x.fillStyle = 'rgba(0,40,80,.35)'; x.beginPath(); x.roundRect(9, 11, 414, CARD_H - 14, 16); x.fill();
      // papan kayu
      const wg = x.createLinearGradient(0, 0, 0, CARD_H); wg.addColorStop(0, '#d9a066'); wg.addColorStop(1, '#a8672f');
      x.fillStyle = wg; x.strokeStyle = '#0f172a'; x.lineWidth = 5; x.beginPath(); x.roundRect(3, 3, 414, CARD_H - 14, 16); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(90,50,15,.35)'; x.lineWidth = 2; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(10, 3 + i * (CARD_H - 14) / 4); x.lineTo(410, 3 + i * (CARD_H - 14) / 4); x.stroke(); }
      // papan jawaban berwarna
      x.fillStyle = color; x.strokeStyle = '#0f172a'; x.lineWidth = 3.5; x.beginPath(); x.roundRect(14, 13, 388, CARD_H - 34, 11); x.fill(); x.stroke();
      // paku
      x.fillStyle = '#475569'; [[10, 10], [408, 10], [10, CARD_H - 22], [408, CARD_H - 22]].forEach(([a1, b1]) => { x.beginPath(); x.arc(a1, b1, 3, 0, 7); x.fill(); });
      // lencana huruf
      x.fillStyle = '#0f172a'; x.beginPath(); x.arc(46, 49, 24, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.font = '800 28px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(key, 46, 50);
      x.fillStyle = '#0f172a'; x.textAlign = 'left'; x.font = '800 24px sans-serif';
      const txt = key === 'A' ? this.q.optionA : this.q.optionB;
      let lines = wrapText(x, txt, 300); if (lines.length > 3) { x.font = '800 19px sans-serif'; lines = wrapText(x, txt, 300); }
      const lh = lines.length > 2 ? 26 : 30, y0 = 49 - (lines.length - 1) * lh / 2;
      lines.forEach((l, i) => x.fillText(l, 84, y0 + i * lh));
      return c;
    };
    const rk = this.leftKey === 'A' ? 'B' : 'A';
    this.cards = { y: CARD_Y0, L: { key: this.leftKey, c: mkCard(this.leftKey, this.leftKey === 'A' ? '#bae6fd' : '#fbcfe8') }, R: { key: rk, c: mkCard(rk, rk === 'A' ? '#bae6fd' : '#fbcfe8') },
      willSwap: CFG.trap === 'trap' && rnd() < 0.45, swapped: false, anim: 0 };
    this.objs = this.buildObstacles(!!this.curExtra);
    this.state = 'SAIL'; this.sailAt = performance.now(); this.banner('📖 Baca soalnya, hindari rintangan!', '#fde047');
  }

  // Rintangan disusun per "gelombang" di 6 jalur; tiap gelombang paling banyak 3 jalur terisi,
  // jadi selalu ada celah. Zona dekat kartu jawaban dikosongkan supaya pemain bisa memilih sisi dengan tenang.
  buildObstacles(extra) {
    const lanes = 6, laneW = W / lanes, out = []; let sharks = 0;
    const topLimit = CARD_Y0 + CARD_H + 140, lvl = CFG.obst;
    if (lvl === 'none' && !extra) return out;
    for (let y = -70; y > topLimit; y -= 92) {
      let n = lvl === 'none' ? 0 : lvl === 'few' ? (rnd() < 0.55 ? 1 : 0) : lvl === 'many' ? 2 + (rnd() < 0.5 ? 1 : 0) : 1 + (rnd() < 0.7 ? 1 : 0);
      n = Math.min(3, n + (extra ? 1 : 0));
      const free = shuffle([0, 1, 2, 3, 4, 5]).slice(0, n);
      for (const ln of free) {
        let def = pick(OBST); if (def.id === 'shark' && sharks >= 2) def = OBST[0]; if (def.id === 'shark') sharks++;
        out.push({ id: def.id, spr: this.spr[def.id], r: def.r, x: clamp(ln * laneW + laneW / 2 + (rnd() - 0.5) * 60, 40, W - 40), y: y - rnd() * 24,
          vx: def.move ? (rnd() < 0.5 ? -1 : 1) * (45 + rnd() * 30) : 0, rot: rnd() * 6, spin: def.id === 'whirl' });
      }
    }
    return out;
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
    const SPEED = CFG.speed;   // kecepatan kapal dari pengaturan
    for (const d of this.dashes) { d.y += SPEED * dt; if (d.y > H) { d.y = -20; d.x = Math.random() * W; } }
    this.scroll += SPEED * dt;
    for (const s of this.isles) { s.y += SPEED * dt * 0.9; if (s.y > H + 40) { s.y = -140 - Math.random() * 260; s.v = Math.floor(Math.random() * 3); s.x = Math.random() < 0.5 ? 5 + Math.random() * 50 : W - 155 - Math.random() * 40; } }
    for (const k of this.clouds) { k.y += SPEED * dt * k.vy * 0.5; if (k.y > H + 120) { k.y = -140; k.x = Math.random() * W; } }
    for (const g of this.gulls) { g.x += g.v * dt; if (g.x > W + 40) { g.x = -40; g.y = 50 + Math.random() * 200; } }
    for (const b of this.bubbles) { b.y += (SPEED * 0.6 + b.v) * dt; if (b.y > H + 10) { b.y = -10; b.x = Math.random() * W; } }
    for (const w of this.wake) { w.y += SPEED * dt; w.x += w.vx * dt; w.life -= dt; w.r += dt * 9; }
    this.wake = this.wake.filter((w) => w.life > 0);
    if (['READY', 'SAIL', 'RESULT'].includes(this.state) && this.players.length && Math.random() < 0.9) {
      const sx = this.shipX; this.wake.push({ x: sx - 22, y: SHIP_Y + 30, vx: -26 - Math.random() * 14, r: 3, life: 0.9 }, { x: sx + 22, y: SHIP_Y + 30, vx: 26 + Math.random() * 14, r: 3, life: 0.9 });
    }
    this.shake = Math.max(0, this.shake - dt);
    if (this.state === 'READY') {
      this.steer(dt, now);
      if (this.faceActive()) this.samples.push(1 - this.face.x), this.samples.length > 20 && this.samples.shift();
      const left = READY_SEC - (now - this.readyAt) / 1000;
      const p = this.players[this.cur];
      $('distBar').style.width = '0%'; $('distTxt').textContent = '📖 Baca soalnya…';
      this.banner(left > 0 ? `${p.icon} ${p.name}, baca soalnya dulu… ${Math.ceil(left)}` : '', p.color);
      if (left <= 0) this.beginSail();
    } else if (this.state === 'SAIL') {
      this.steer(dt, now);
      for (const o of this.objs) {
        o.y += SPEED * dt;
        if (o.vx) { o.x += o.vx * dt; if (o.x < 40 || o.x > W - 40) o.vx = -o.vx; }
        if (now > this.hitUntil && Math.hypot(o.x - this.shipX, o.y - SHIP_Y) < o.r + 22) {
          this.hitUntil = now + 1300; this.shake = 0.5; this.addScore(this.cur, -2); this.hits++; beep([180]);
          this.flash = '💥 -2';  this.flashT = 1;
        }
      }
      this.objs = this.objs.filter((o) => o.y < H + 80);
      this.cards.y += SPEED * dt;
      const ck = this.cards;
      if (ck.willSwap && !ck.swapped && (TRIGGER_Y - ck.y) / SPEED <= SWAP_SEC) {
        ck.swapped = true; [ck.L, ck.R] = [ck.R, ck.L]; ck.anim = 1; beep([760, 520, 760]);
        this.banner('🔀 JEBAKAN! Papan bertukar tempat!', '#f9a8d4');
        this.later(() => { if (this.state === 'SAIL' && $('banner').textContent.startsWith('🔀')) this.banner('', null); }, 1500);
      }
      if (ck.anim > 0) ck.anim = Math.max(0, ck.anim - dt / 0.45);
      const prog = clamp((this.cards.y - CARD_Y0) / (TRIGGER_Y - CARD_Y0), 0, 1);
      $('distBar').style.width = (prog * 100).toFixed(1) + '%'; $('distBar').style.background = prog > 0.82 ? '#ef4444' : prog > 0.6 ? '#f59e0b' : '#22c55e';
      const secLeft = Math.max(0, (TRIGGER_Y - this.cards.y) / SPEED); $('distTxt').textContent = secLeft > 0.4 ? `⛵ Garis jawaban ${Math.ceil(secLeft)} dtk lagi` : '🚩 PILIH SEKARANG!';
      if (now - this.sailAt > 2200 && $('banner').textContent.startsWith('📖')) this.banner('', null);
      if (this.cards.y >= TRIGGER_Y) this.resolve(this.shipX < W / 2 ? 'L' : 'R');
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
      const pool = CFG.punish === 'nosquat' ? PUNISH.filter((t) => t.kind !== 'squat') : PUNISH;
      if (CFG.punish === 'off') {
        this.panel({ tag: '😵 KURANG TEPAT', bg: '#fca5a5', icon: '❌', title: 'Belum tepat!', text: ex });
        this.later(() => this.nextTurn(), 2600);
      } else {
        this.panel({ tag: '😵 KURANG TEPAT', bg: '#fca5a5', icon: '❌', title: 'Kena hukuman!', text: ex });
        this.later(() => this.runPunish(k, pick(pool)), 1900);
      }
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
  drawShip(c, x, y, p, t, lean, blink) {
    if (blink) return;
    c.save(); c.translate(x, y + Math.sin(t * 3.4) * 3); c.rotate(lean + Math.sin(t * 2.6) * 0.04);
    // bayangan di air
    c.fillStyle = 'rgba(0,40,80,.28)'; c.beginPath(); c.ellipse(4, 40, 52, 9, 0, 0, 7); c.fill();
    // layar belakang (jib)
    c.fillStyle = '#fff7e6'; c.strokeStyle = '#0f172a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-9, -8); c.lineTo(-9, -72); c.quadraticCurveTo(-36, -38 + Math.sin(t * 3) * 2, -48, -8); c.closePath(); c.fill(); c.stroke();
    // layar utama (warna pemain)
    c.beginPath(); c.moveTo(-3, -8); c.lineTo(-3, -92); c.quadraticCurveTo(46 + Math.sin(t * 2.4) * 3, -56, 50, -8); c.closePath();
    c.fillStyle = '#ffffff'; c.fill(); c.save(); c.clip();
    c.fillStyle = p.color; c.fillRect(-10, -40, 70, 14); c.fillRect(-10, -72, 70, 8);
    c.restore(); c.beginPath(); c.moveTo(-3, -8); c.lineTo(-3, -92); c.quadraticCurveTo(46 + Math.sin(t * 2.4) * 3, -56, 50, -8); c.closePath(); c.stroke();
    // lencana emoji pemain
    c.fillStyle = '#fff'; c.beginPath(); c.arc(20, -48, 13, 0, 7); c.fill(); c.lineWidth = 2.5; c.stroke();
    c.font = '17px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.icon, 20, -47);
    // tiang + bendera
    c.strokeStyle = '#5b3a1a'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, 6); c.lineTo(-6, -100); c.stroke();
    c.fillStyle = '#facc15'; c.strokeStyle = '#0f172a'; c.lineWidth = 2.5;
    const fw = Math.sin(t * 7) * 3; c.beginPath(); c.moveTo(-6, -100); c.lineTo(16 + fw, -106); c.lineTo(-6 + 4, -112 - 0); c.lineTo(-6, -112); c.closePath();
    c.beginPath(); c.moveTo(-5, -112); c.quadraticCurveTo(10, -118 + fw, 22, -108 + fw); c.quadraticCurveTo(10, -104, -5, -102); c.closePath(); c.fill(); c.stroke();
    // lambung kapal
    c.lineWidth = 3.5; c.strokeStyle = '#0f172a';
    const hg = c.createLinearGradient(0, 0, 0, 34); hg.addColorStop(0, '#b45f1e'); hg.addColorStop(1, '#6b3410');
    c.fillStyle = hg; c.beginPath(); c.moveTo(-54, -2); c.quadraticCurveTo(-48, 30, -22, 34); c.lineTo(30, 34); c.quadraticCurveTo(54, 28, 64, -8); c.quadraticCurveTo(5, 6, -54, -2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = p.color; c.beginPath(); c.moveTo(-52, 4); c.quadraticCurveTo(0, 14, 61, 0); c.lineTo(58, 9); c.quadraticCurveTo(0, 22, -49, 12); c.closePath(); c.fill();
    c.fillStyle = '#fde68a'; c.strokeStyle = '#0f172a'; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-24 + i * 24, 20, 5, 0, 7); c.fill(); c.stroke(); }
    // haluan: percikan busa
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(60 + Math.sin(t * 8 + i) * 3 + i * 3, 12 + i * 5, 5 - i * 0.8, 0, 7); c.fill(); }
    // garis air berombak di depan lambung
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.beginPath();
    for (let xx = -62; xx <= 70; xx += 8) { const yy = 32 + Math.sin(xx / 9 + t * 5) * 2.5; xx === -62 ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
    c.stroke();
    c.restore();
  }
  drawCards(c, now) {
    const ck = this.cards, y = ck.y;
    const one = (card, x) => {
      c.drawImage(card.c, x, y);
      if (this.state === 'RESULT') {
        const picked = (card === ck.L) === (this.chosen === 'L'), good = card.key === this.q.correct;
        if (picked || good) { c.save(); c.lineWidth = 7; c.strokeStyle = good ? '#16a34a' : '#dc2626'; c.strokeRect(x + 1, y + 1, 418, CARD_H - 10); c.restore(); }
      }
    };
    const a = ck.anim ? ck.anim * ck.anim * (3 - 2 * ck.anim) : 0;   // animasi papan bertukar
    one(ck.L, 10 + 450 * a); one(ck.R, 460 - 450 * a);
    // garis jawaban: tali berpelampung + pita kotak-kotak, dan pembatas tengah
    const ly = y + CARD_H - 2;
    c.save();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.setLineDash([14, 10]); c.beginPath(); c.moveTo(W / 2, y - 6); c.lineTo(W / 2, ly + 6); c.stroke(); c.setLineDash([]);
    const sq = 12; for (let i = 0; i * sq < W; i++) { c.fillStyle = (i % 2) ? '#0f172a' : '#fff'; c.fillRect(i * sq, ly, sq, 7); c.fillStyle = (i % 2) ? '#fff' : '#0f172a'; c.fillRect(i * sq, ly + 7, sq, 7); }
    for (let i = 0; i <= 9; i++) { const bx = i * (W / 9), by = ly + 20 + Math.sin(now / 300 + i) * 2; c.fillStyle = i % 2 ? '#ef4444' : '#fff'; c.strokeStyle = '#0f172a'; c.lineWidth = 2.5; c.beginPath(); c.arc(bx, by, 8, 0, 7); c.fill(); c.stroke(); }
    c.restore();
  }
  draw(now) {
    const c = this.ctx, t = this.t;
    c.save();
    if (this.shake > 0) c.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 10 * this.shake);
    // --- laut: gradasi kedalaman ---
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5eead4'); g.addColorStop(0.28, '#22b8e0'); g.addColorStop(0.7, '#0e7fc0'); g.addColorStop(1, '#0a4a86');
    c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    // cahaya matahari menyorot
    const rg = c.createRadialGradient(W * 0.28, 40, 10, W * 0.28, 40, 420); rg.addColorStop(0, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(0, 0, W, H);
    // pita gelombang bergulir (parallax)
    for (let k = 0; k < 9; k++) {
      const spd = 0.5 + k * 0.07, base = ((k * 71 + this.scroll * spd) % (H + 60)) - 30, amp = 5 + k * 0.5;
      c.strokeStyle = `rgba(255,255,255,${0.07 + (k % 3) * 0.05})`; c.lineWidth = 3 + (k % 3); c.beginPath();
      for (let x = 0; x <= W; x += 24) { const y = base + Math.sin(x / (50 + k * 6) + t * (1.6 + k * 0.1) + k) * amp; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    // bayangan awan
    c.fillStyle = 'rgba(0,50,90,.07)';
    for (const k of this.clouds) { c.beginPath(); c.ellipse(k.x, k.y, k.w, k.w * 0.32, 0, 0, 7); c.ellipse(k.x + k.w * 0.5, k.y + 10, k.w * 0.6, k.w * 0.24, 0, 0, 7); c.fill(); }
    // kilau cahaya di permukaan
    for (const s of this.spark) {
      const a = 0.5 + 0.5 * Math.sin(t * 2.2 + s.ph); if (a < 0.55) continue;
      c.fillStyle = `rgba(255,255,255,${(a - 0.5) * 1.1})`; c.save(); c.translate(s.x, (s.y + this.scroll * 0.35) % H); c.rotate(0.785);
      c.fillRect(-s.s / 2, -s.s / 2, s.s, s.s); c.restore();
    }
    // goresan buih
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
    for (const d of this.dashes) { c.moveTo(d.x, d.y); c.lineTo(d.x + 16, d.y + d.l * 0.2); }
    c.stroke();
    // gelembung
    c.fillStyle = 'rgba(255,255,255,.22)'; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.5;
    for (const b of this.bubbles) { c.beginPath(); c.arc(b.x + Math.sin(t * 2 + b.y / 30) * 5, b.y, b.r, 0, 7); c.fill(); c.stroke(); }
    // pulau + cincin buih
    for (const s of this.isles) {
      const cx = s.x + 75, cy = s.y + 92, pr = 1 + Math.sin(t * 2 + s.x) * 0.04;
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 5; c.beginPath(); c.ellipse(cx, cy, 78 * pr, 26 * pr, 0, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy, 92 * pr, 32 * pr, 0, 0, 7); c.stroke();
      c.drawImage(this.isleSpr[s.v], s.x, s.y);
    }
    // jejak ombak kapal
    for (const w of this.wake) { c.fillStyle = `rgba(255,255,255,${clamp(w.life / 0.9, 0, 1) * 0.55})`; c.beginPath(); c.arc(w.x, w.y, w.r, 0, 7); c.fill(); }
    // rintangan: riak + bayangan + sprite
    for (const o of this.objs) {
      const w = o.spr.width, pr = 1 + Math.sin(t * 3 + o.rot) * 0.08;
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.beginPath(); c.ellipse(o.x, o.y + 6, (o.r + 12) * pr, (o.r + 6) * pr * 0.75, 0, 0, 7); c.stroke();
      c.fillStyle = 'rgba(0,40,80,.28)'; c.beginPath(); c.ellipse(o.x + 4, o.y + o.r * 0.7, o.r * 0.95, o.r * 0.38, 0, 0, 7); c.fill();
      c.save(); c.translate(o.x, o.y);
      if (o.id === 'shark') c.scale(o.vx < 0 ? -1 : 1, 1);
      c.rotate(o.spin ? t * 3 : Math.sin(t * 2 + o.rot) * 0.12); c.drawImage(o.spr, -w / 2, -w / 2); c.restore();
    }
    // kartu jawaban + garis jawaban
    if (this.cards && (this.state === 'SAIL' || this.state === 'RESULT')) this.drawCards(c, now);
    // kapal
    if (this.players.length && ['READY', 'SAIL', 'RESULT', 'SQUAT', 'TASK'].includes(this.state)) {
      const blink = now < this.hitUntil && Math.floor(now / 90) % 2;
      this.drawShip(c, this.shipX, SHIP_Y, this.players[this.cur], t, clamp((this.shipX - (this.lastX ?? this.shipX)) * 0.02, -0.3, 0.3), blink);
      this.lastX = this.shipX;
    }
    // burung camar
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5; c.lineCap = 'round';
    for (const gl of this.gulls) { const f = Math.sin(t * 6 + gl.ph) * 5; c.beginPath(); c.moveTo(gl.x - 12, gl.y + f); c.quadraticCurveTo(gl.x - 5, gl.y - 6 - f, gl.x, gl.y); c.quadraticCurveTo(gl.x + 5, gl.y - 6 - f, gl.x + 12, gl.y + f); c.stroke(); }
    // suasana waktu (makin sore tiap ronde)
    const tint = ['', '', '', 'rgba(255,190,70,.09)', 'rgba(255,190,70,.12)', 'rgba(255,190,70,.15)', 'rgba(255,110,120,.15)', 'rgba(255,100,120,.19)', 'rgba(70,50,140,.22)', 'rgba(50,40,120,.28)'][clamp((this.round || 1) - 1, 0, 9)];
    if (tint) { c.fillStyle = tint; c.fillRect(-10, -10, W + 20, H + 20); }
    // vignette
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,20,50,0)'); vg.addColorStop(1, 'rgba(0,20,50,.32)');
    c.fillStyle = vg; c.fillRect(-10, -10, W + 20, H + 20);
    if (this.flashT > 0) { c.font = '800 34px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fde047'; c.strokeStyle = '#0f172a'; c.lineWidth = 5; c.strokeText(this.flash, this.shipX, SHIP_Y - 120 - (1 - this.flashT) * 30); c.fillText(this.flash, this.shipX, SHIP_Y - 120 - (1 - this.flashT) * 30); }
    c.restore();
  }
}
let game;
addEventListener("DOMContentLoaded", () => { game = new Game(); });
