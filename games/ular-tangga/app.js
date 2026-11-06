/**
 * ==========================================================================
 * app.js - Engine Permainan Ular Tangga Kinestetik & Dashboard Guru
 * Mengatur state permainan, canvas rendering, audio synthesizer,
 * dan integrasi MediaPipe Pose.
 * ==========================================================================
 */

/**
 * Helper identitas ruang kelas / pembeli dari parameter URL
 * Contoh: ?sekolah=SMPN%201%20Malang atau ?kelas=smp1
 * Setiap pembeli memiliki ruang kelas terhubung sendiri sehingga tidak bercampur.
 */
function getRoomInfo() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('nama') || params.get('sekolah') || params.get('kelas') || params.get('guru') || params.get('pembeli') || params.get('ruang') || params.get('id') || localStorage.getItem('lokamain_buyer_name');
  if (raw) {
    const cleanName = decodeURIComponent(raw).trim();
    const cleanId = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return {
      id: cleanId || 'default',
      name: cleanName
    };
  }
  return { id: 'default', name: 'Umum' };
}

// Bank Soal Bawaan (Default Questions: 25 Soal Bahasa Arab SMP - Materi As-Sa'ah / الساعة)
const DEFAULT_QUESTIONS = [
  {
    id: 1,
    category: "Bilangan Jam (الساعة)",
    question: "Apakah bahasa Arab dari \"Jam 01.00 tepat\"?",
    optionA: "اَلسَّاعَةُ الْوَاحِدَةُ تَمَامًا (As-Saa'atul Waahidah tamaaman)",
    optionB: "اَلسَّاعَةُ الثَّانِيَةُ تَمَامًا (As-Saa'atus Saaniyah tamaaman)",
    correct: "A",
    explanation: "Jam 01.00 tepat adalah اَلسَّاعَةُ الْوَاحِدَةُ تَمَامًا (As-Saa'atul Waahidah tamaaman)."
  },
  {
    id: 2,
    category: "Bilangan Jam (الساعة)",
    question: "Bahasa Arab untuk menunjukkan \"Jam 02.00\" adalah...",
    optionA: "اَلسَّاعَةُ الْوَاحِدَةُ (As-Saa'atul Waahidah)",
    optionB: "اَلسَّاعَةُ الثَّانِيَةُ (As-Saa'atus Saaniyah)",
    correct: "B",
    explanation: "Jam 02.00 dalam bahasa Arab adalah اَلسَّاعَةُ الثَّانِيَةُ (As-Saa'atus Saaniyah)."
  },
  {
    id: 3,
    category: "Bilangan Jam (الساعة)",
    question: "Apa arti dari kalimat \"اَلسَّاعَةُ الثَّالِثَةُ\" (As-Saa'atus Saalitsah)?",
    optionA: "Jam 03.00",
    optionB: "Jam 04.00",
    correct: "A",
    explanation: "اَلسَّاعَةُ الثَّالِثَةُ artinya adalah Jam 03.00."
  },
  {
    id: 4,
    category: "Bilangan Jam (الساعة)",
    question: "Bahasa Arab untuk menunjukkan \"Jam 04.00\" adalah...",
    optionA: "اَلسَّاعَةُ الْخَامِسَةُ (As-Saa'atul Khaamisah)",
    optionB: "اَلسَّاعَةُ الرَّابِعَةُ (As-Saa'atur Raabi'ah)",
    correct: "B",
    explanation: "Jam 04.00 dalam bahasa Arab adalah اَلسَّاعَةُ الرَّابِعَةُ (As-Saa'atur Raabi'ah)."
  },
  {
    id: 5,
    category: "Bilangan Jam (الساعة)",
    question: "\"اَلسَّاعَةُ الْخَامِسَةُ\" (As-Saa'atul Khaamisah) menunjukkan pukul...",
    optionA: "Jam 05.00",
    optionB: "Jam 06.00",
    correct: "A",
    explanation: "اَلسَّاعَةُ الْخَامِسَةُ artinya adalah Jam 05.00."
  },
  {
    id: 6,
    category: "Bilangan Jam (الساعة)",
    question: "Bahasa Arab dari \"Jam 06.00\" adalah...",
    optionA: "اَلسَّاعَةُ السَّابِعَةُ (As-Saa'atus Saabi'ah)",
    optionB: "اَلسَّاعَةُ السَّادِسَةُ (As-Saa'atus Saadisah)",
    correct: "B",
    explanation: "Jam 06.00 dalam bahasa Arab adalah اَلسَّاعَةُ السَّادِسَةُ (As-Saa'atus Saadisah)."
  },
  {
    id: 7,
    category: "Bilangan Jam (الساعة)",
    question: "Apa arti dari \"اَلسَّاعَةُ السَّابِعَةُ\" (As-Saa'atus Saabi'ah)?",
    optionA: "Jam 07.00",
    optionB: "Jam 08.00",
    correct: "A",
    explanation: "اَلسَّاعَةُ السَّابِعَةُ artinya adalah Jam 07.00."
  },
  {
    id: 8,
    category: "Bilangan Jam (الساعة)",
    question: "Bahasa Arab untuk menunjukkan \"Jam 08.00\" adalah...",
    optionA: "اَلسَّاعَةُ التَّاسِعَةُ (As-Saa'atut Taasi'ah)",
    optionB: "اَلسَّاعَةُ الثَّامِنَةُ (As-Saa'atus Tsaaminah)",
    correct: "B",
    explanation: "Jam 08.00 dalam bahasa Arab adalah اَلسَّاعَةُ الثَّامِنَةُ (As-Saa'atus Tsaaminah)."
  },
  {
    id: 9,
    category: "Bilangan Jam (الساعة)",
    question: "\"اَلسَّاعَةُ التَّاسِعَةُ\" (As-Saa'atut Taasi'ah) artinya adalah...",
    optionA: "Jam 09.00",
    optionB: "Jam 10.00",
    correct: "A",
    explanation: "اَلسَّاعَةُ التَّاسِعَةُ artinya adalah Jam 09.00."
  },
  {
    id: 10,
    category: "Bilangan Jam (الساعة)",
    question: "Bahasa Arab dari \"Jam 10.00\" adalah...",
    optionA: "اَلسَّاعَةُ التَّاسِعَةُ (As-Saa'atut Taasi'ah)",
    optionB: "اَلسَّاعَةُ الْعَاشِرَةُ (As-Saa'atul 'Aasyirah)",
    correct: "B",
    explanation: "Jam 10.00 dalam bahasa Arab adalah اَلسَّاعَةُ الْعَاشِرَةُ (As-Saa'atul 'Aasyirah)."
  },
  {
    id: 11,
    category: "Bilangan Jam (الساعة)",
    question: "Apa arti dari \"اَلسَّاعَةُ الْحَادِيَةَ عَشْرَةَ\" (As-Saa'atul Haadiyata 'asyrah)?",
    optionA: "Jam 11.00",
    optionB: "Jam 12.00",
    correct: "A",
    explanation: "اَلسَّاعَةُ الْحَادِيَةَ عَشْرَةَ artinya adalah Jam 11.00."
  },
  {
    id: 12,
    category: "Bilangan Jam (الساعة)",
    question: "Bahasa Arab dari \"Jam 12.00\" adalah...",
    optionA: "اَلسَّاعَةُ الْعَاشِرَةُ (As-Saa'atul 'Aasyirah)",
    optionB: "اَلسَّاعَةُ الثَّانِيَةَ عَشْرَةَ (As-Saa'atus Saaniyata 'asyrah)",
    correct: "B",
    explanation: "Jam 12.00 dalam bahasa Arab adalah اَلسَّاعَةُ الثَّانِيَةَ عَشْرَةَ (As-Saa'atus Saaniyata 'asyrah)."
  },
  {
    id: 13,
    category: "Menit & Pecahan Waktu",
    question: "Dalam membaca jam, huruf sambung \"وَ\" (wa) mempunyai arti...",
    optionA: "Lewat / Lebih",
    optionB: "Kurang",
    correct: "A",
    explanation: "Huruf \"وَ\" (wa) digunakan untuk menunjukkan waktu lewat/lebih."
  },
  {
    id: 14,
    category: "Menit & Pecahan Waktu",
    question: "Dalam membaca jam, kata \"إِلَّا\" (illa) mempunyai arti...",
    optionA: "Tepat",
    optionB: "Kurang",
    correct: "B",
    explanation: "Kata \"إِلَّا\" (illa) digunakan untuk menunjukkan waktu kurang."
  },
  {
    id: 15,
    category: "Menit & Pecahan Waktu",
    question: "Istilah \"النِّصْفُ\" (an-nishfu) dalam materi jam berarti...",
    optionA: "Setengah jam (30 menit)",
    optionB: "Seperempat jam (15 menit)",
    correct: "A",
    explanation: "النِّصْفُ (an-nishfu) artinya adalah setengah jam atau 30 menit."
  },
  {
    id: 16,
    category: "Menit & Pecahan Waktu",
    question: "Istilah \"الرُّبْعُ\" (ar-rub'u) dalam materi jam berarti...",
    optionA: "10 menit",
    optionB: "Seperempat jam (15 menit)",
    correct: "B",
    explanation: "الرُّبْعُ (ar-rub'u) artinya adalah seperempat jam atau 15 menit."
  },
  {
    id: 17,
    category: "Membaca Waktu",
    question: "Apa arti dari \"اَلسَّاعَةُ السَّابِعَةُ وَالنِّصْفُ\" (As-Saa'atus Saabi'ah wan nishfu)?",
    optionA: "Jam 07.30 (Tujuh lewat tiga puluh menit)",
    optionB: "Jam 07.15 (Tujuh lewat lima belas menit)",
    correct: "A",
    explanation: "اَلسَّاعَةُ السَّابِعَةُ وَالنِّصْفُ artinya jam 07.30 (tujuh lewat setengah jam)."
  },
  {
    id: 18,
    category: "Membaca Waktu",
    question: "Bahasa Arab dari \"Jam 06.15 (Enam lewat seperempat)\" adalah...",
    optionA: "اَلسَّاعَةُ السَّادِسَةُ وَالنِّصْفُ",
    optionB: "اَلسَّاعَةُ السَّادِسَةُ وَالرُّبْعُ",
    correct: "B",
    explanation: "Jam 06.15 adalah اَلسَّاعَةُ السَّادِسَةُ وَالرُّبْعُ (enam lewat seperempat)."
  },
  {
    id: 19,
    category: "Membaca Waktu",
    question: "\"اَلسَّاعَةُ التَّاسِعَةُ إِلَّا الرُّبْعَ\" (As-Saa'atut Taasi'ah illar rub'a) artinya adalah...",
    optionA: "Jam 09.00 kurang 15 menit (08.45)",
    optionB: "Jam 09.00 lewat 15 menit (09.15)",
    correct: "A",
    explanation: "إِلَّا الرُّبْعَ artinya kurang seperempat (15 menit), sehingga menunjukkan pukul 08.45."
  },
  {
    id: 20,
    category: "Percakapan Jam",
    question: "Kalimat tanya untuk menanyakan \"Jam berapa sekarang?\" adalah...",
    optionA: "كَمْ رَقْمُ بَيْتِكَ؟ (Kam raqmu baitika?)",
    optionB: "كَمِ السَّاعَةُ الْآنَ؟ (Kamis saa'atul aan?)",
    correct: "B",
    explanation: "كَمِ السَّاعَةُ الْآنَ؟ artinya \"Jam berapa sekarang?\"."
  },
  {
    id: 21,
    category: "Keterangan Waktu",
    question: "Keterangan waktu \"صَبَاحًا\" (Shabaahan) memiliki arti...",
    optionA: "Pagi hari",
    optionB: "Malam hari",
    correct: "A",
    explanation: "صَبَاحًا (Shabaahan) artinya adalah pada waktu pagi hari."
  },
  {
    id: 22,
    category: "Keterangan Waktu",
    question: "Keterangan waktu \"نَهَارًا\" (Nahaaran) memiliki arti...",
    optionA: "Sore hari",
    optionB: "Siang hari",
    correct: "B",
    explanation: "نَهَارًا (Nahaaran) artinya adalah pada waktu siang hari."
  },
  {
    id: 23,
    category: "Keterangan Waktu",
    question: "Keterangan waktu \"مَسَاءً\" (Masaa-an) memiliki arti...",
    optionA: "Sore hari",
    optionB: "Pagi hari",
    correct: "A",
    explanation: "مَسَاءً (Masaa-an) artinya adalah pada waktu sore hari."
  },
  {
    id: 24,
    category: "Keterangan Waktu",
    question: "Keterangan waktu \"لَيْلًا\" (Lailan) memiliki arti...",
    optionA: "Siang hari",
    optionB: "Malam hari",
    correct: "B",
    explanation: "لَيْلًا (Lailan) artinya adalah pada waktu malam hari."
  },
  {
    id: 25,
    category: "Percakapan & Aktivitas",
    question: "Apa arti dari kalimat tanya \"فِي أَيِّ سَاعَةٍ تَذْهَبُ إِلَى الْمَدْرَسَةِ؟\"?",
    optionA: "Pada jam berapa kamu pergi ke sekolah?",
    optionB: "Di mana letak bangunan sekolahmu?",
    correct: "A",
    explanation: "\"فِي أَيِّ سَاعَةٍ\" artinya \"Pada jam berapa\", تَذْهَبُ إِلَى الْمَدْرَسَةِ artinya \"kamu pergi ke sekolah\"."
  }
];

// Konfigurasi Tangga & Ular
const LADDERS = [
  { start: 3, end: 11, color: '#f59e0b' },
  { start: 9, end: 18, color: '#10b981' },
  { start: 14, end: 22, color: '#8b5cf6' }
];

const SNAKES = [
  { start: 12, end: 4, color: '#ef4444' },
  { start: 19, end: 8, color: '#ec4899' },
  { start: 24, end: 16, color: '#f97316' }
];

/**
 * ==========================================================================
 * Web Audio API Synthesizer (Zero-Dependency Sound Effects)
 * ==========================================================================
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('kinesthetic_sound_muted') === 'true';
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playDiceRoll() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220 + Math.random() * 200, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      }, i * 110);
    }
  }

  playHop() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.2);
  }

  playCorrect() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const now = this.ctx.currentTime + (idx * 0.1);
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  playWrong() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playSnakeAlert() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Desis ular & nada waspada
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.4);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playShield() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Efek perisai logam berdenting
    const freqs = [880, 1320, 1760];
    freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  playClimbStep() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(440 + Math.random() * 80, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playLadderAscent() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [392, 440, 493.88, 523.25, 587.33, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const now = this.ctx.currentTime + (idx * 0.08);
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playVictory() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const fanfare = [
      { f: 523.25, t: 0.0 },
      { f: 523.25, t: 0.15 },
      { f: 523.25, t: 0.3 },
      { f: 659.25, t: 0.45 },
      { f: 783.99, t: 0.65 },
      { f: 1046.50, t: 0.95 }
    ];
    fanfare.forEach(item => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const now = this.ctx.currentTime + item.t;
      osc.frequency.setValueAtTime(item.f, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }
}

/**
 * ==========================================================================
 * Particle System (Bintang & Konfeti)
 * ==========================================================================
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, count = 25, type = 'star') {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#eab308'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        type
      });
    }
  }

  updateAndDraw(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'star') {
        this.drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * ==========================================================================
 * Game Engine Utama (Ular Tangga Kinestetik - Mode 2 Pemain)
 * ==========================================================================
 */
class SnakeAndLaddersGame {
  constructor() {
    // Canvas & Render
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.particleSystem = new ParticleSystem();
    this.sounds = new SoundEngine();

    // State Mode 2 Pemain
    this.currentPlayer = 1; // 1 = Pemain 1 (Biru), 2 = Pemain 2 (Oranye)
    this.turnsCount = 0;
    this.isMoving = false;
    this.gameState = 'IDLE'; // 'IDLE', 'ROLLING', 'MOVING', 'QUIZ', 'SQUAT_CHALLENGE', 'CLIMB_CHALLENGE', 'VICTORY'

    // Data Kedua Pemain
    this.players = {
      1: {
        id: 1,
        name: 'Pemain 1',
        label: 'P1',
        themeColor: '#2563eb', // Biru
        colorLight: '#60a5fa',
        colorDark: '#1d4ed8',
        tile: 1,
        x: 0,
        y: 0,
        shieldActive: false,
        correctAnswers: 0,
        totalAnswered: 0
      },
      2: {
        id: 2,
        name: 'Pemain 2',
        label: 'P2',
        themeColor: '#ea580c', // Oranye
        colorLight: '#fb923c',
        colorDark: '#c2410c',
        tile: 1,
        x: 0,
        y: 0,
        shieldActive: false,
        correctAnswers: 0,
        totalAnswered: 0
      }
    };

    // Bank Soal & Riwayat Soal (Dipastikan Tidak Menyamai antara P1 dan P2)
    this.questions = this.loadQuestions();
    this.activeQuestion = null;
    this.usedQuestionIds = new Set();
    this.usedQuestionsP1 = new Set();
    this.usedQuestionsP2 = new Set();

    // Tantangan Aktif
    this.squatTimer = null;
    this.squatSecondsRemaining = 3;
    this.climbProgress = 0;
    this.activeSnake = null;
    this.activeLadder = null;

    // Pose Engine
    this.poseEngine = null;

    // Inisialisasi
    this.init();
  }

  getActivePlayer() {
    return this.players[this.currentPlayer];
  }

  getInactivePlayer() {
    return this.players[this.currentPlayer === 1 ? 2 : 1];
  }

  async init() {
    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Update posisi kedua avatar ke petak 1
    const p1Pos = this.getTilePosition(1);
    this.players[1].x = p1Pos.x;
    this.players[1].y = p1Pos.y;
    this.players[2].x = p1Pos.x;
    this.players[2].y = p1Pos.y;

    this.updateHUD();

    // Update Identitas Ruang Kelas / Pembeli di Header
    const room = getRoomInfo();
    const roomBadgeText = document.getElementById('roomBadgeText');
    if (roomBadgeText) {
      roomBadgeText.textContent = room.name === 'Umum' ? 'Lisensi: Resmi' : `Lisensi: ${room.name}`;
    }

    // Inisialisasi Pose Engine dengan Dukungan 2 Layar (P1 Kiri & P2 Kanan)
    this.poseEngine = new KinestheticPoseEngine({
      videoElementP1: document.getElementById('webcamVideoP1'),
      videoElementP2: document.getElementById('webcamVideoP2'),
      canvasElementP1: document.getElementById('poseCanvasP1'),
      canvasElementP2: document.getElementById('poseCanvasP2')
    });

    this.bindPoseCallbacks();
    await this.poseEngine.init();

    // Mulai giliran Pemain 1
    this.startPlayerTurn();

    // Start Game Loop Animation
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Muat soal dari localStorage atau gunakan default (Tersimpan khusus per ruang/pembeli)
   */
  loadQuestions() {
    const room = getRoomInfo();
    const STORAGE_KEY = `kinesthetic_snakes_questions_${room.id}`;
    const VERSION_KEY = `kinesthetic_questions_version_${room.id}`;
    const CURRENT_VERSION = 'v2_assaah_25';

    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const stored = localStorage.getItem(STORAGE_KEY);

      // Migrasi otomatis ke materi 25 soal As-Sa'ah Bahasa Arab jika versi belum sesuai
      if (storedVersion !== CURRENT_VERSION || !stored) {
        this.saveQuestions(DEFAULT_QUESTIONS);
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        return JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error membaca bank soal localStorage:', e);
    }
    this.saveQuestions(DEFAULT_QUESTIONS);
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    return JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
  }

  saveQuestions(qList) {
    try {
      const room = getRoomInfo();
      const STORAGE_KEY = `kinesthetic_snakes_questions_${room.id}`;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(qList));
      this.questions = qList;
    } catch (e) {
      console.error('Error menyimpan soal ke localStorage:', e);
    }
  }

  /**
   * Hubungkan callback gerakan dari pose.js ke alur game
   */
  bindPoseCallbacks() {
    this.poseEngine.callbacks.onCameraStatus = (msg, type) => {
      this.setCameraStatus(msg, type);
    };

    // 1. Kocok Dadu (Angkat Kedua Tangan)
    this.poseEngine.callbacks.onArmsUp = () => {
      if (this.gameState === 'IDLE' && !this.isMoving) {
        this.rollDice();
      }
    };

    // 2. Kuis: Hover Zona Pilihan A atau B
    this.poseEngine.callbacks.onZoneHover = ({ zone, progress }) => {
      if (this.gameState === 'QUIZ') {
        this.updateQuizHoverUI(zone, progress);
      }
    };

    // 2. Kuis: Pilihan Terkunci setelah 1.5s
    this.poseEngine.callbacks.onZoneSelect = (selectedZone) => {
      if (this.gameState === 'QUIZ') {
        this.handleQuizAnswer(selectedZone);
      }
    };

    // 3. Tantangan Ular: Berhasil Jongkok Tepat Waktu
    this.poseEngine.callbacks.onSquatSuccess = () => {
      if (this.gameState === 'SQUAT_CHALLENGE') {
        this.handleSquatSuccess();
      }
    };

    // 4. Tantangan Tangga: Repetisi Memanjat
    this.poseEngine.callbacks.onClimbStep = (count, total) => {
      if (this.gameState === 'CLIMB_CHALLENGE') {
        this.handleClimbStep(count, total);
      }
    };

    this.poseEngine.callbacks.onClimbComplete = () => {
      if (this.gameState === 'CLIMB_CHALLENGE') {
        this.handleClimbSuccess();
      }
    };
  }

  /**
   * Responsive High-DPI Canvas Sizing (Pas untuk Layar Laptop & Smart TV)
   */
  resizeCanvas() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const availW = container.clientWidth || 360;
    const availH = container.clientHeight || 360;
    // Ukuran dinamis berbasis batas terkecil dengan bantalan 12px
    const size = Math.floor(Math.min(availW, availH) - 12);
    const finalSize = Math.max(220, size);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = finalSize * dpr;
    this.canvas.height = finalSize * dpr;
    this.canvas.style.width = `${finalSize}px`;
    this.canvas.style.height = `${finalSize}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.boardSize = finalSize;
    this.tileSize = (finalSize - 40) / 5;
    this.margin = 20;

    // Perbarui posisi kedua pemain ke petak masing-masing
    const p1Pos = this.getTilePosition(this.players[1].tile);
    this.players[1].x = p1Pos.x;
    this.players[1].y = p1Pos.y;

    const p2Pos = this.getTilePosition(this.players[2].tile);
    this.players[2].x = p2Pos.x;
    this.players[2].y = p2Pos.y;
  }

  /**
   * Konversi nomor petak 1-25 ke koordinat X, Y (Pola Zigzag Klasik 5x5)
   * Nomor 1 di kiri bawah, nomor 25 di kiri atas sesuai spesifikasi
   */
  getTilePosition(tileNum) {
    const n = Math.max(1, Math.min(25, tileNum));
    const rowIndex = Math.floor((n - 1) / 5); // 0 (bawah) sampai 4 (atas)
    const yIndex = 4 - rowIndex; // 4 (bawah) sampai 0 (atas di canvas)

    let colIndex;
    if (rowIndex === 4) {
      // Baris 4 (Paling Atas): nomor 25 di kiri atas (col 0) hingga 21 di kanan atas (col 4)
      colIndex = 4 - ((n - 1) % 5);
    } else if (rowIndex % 2 === 0) {
      // Baris genap (0, 2): Bergerak dari kiri ke kanan (0 -> 4)
      colIndex = (n - 1) % 5;
    } else {
      // Baris ganjil (1, 3): Bergerak dari kanan ke kiri (4 -> 0)
      colIndex = 4 - ((n - 1) % 5);
    }

    const x = this.margin + (colIndex * this.tileSize) + (this.tileSize / 2);
    const y = this.margin + (yIndex * this.tileSize) + (this.tileSize / 2);

    return { x, y, colIndex, yIndex, rowIndex };
  }

  /**
   * Alur Giliran Pemain Baru (Mode 2 Pemain)
   */
  startPlayerTurn(isBonusRoll = false) {
    const player = this.getActivePlayer();
    if (player.tile >= 25) {
      this.triggerVictory(player);
      return;
    }

    this.gameState = 'IDLE';
    this.poseEngine.setActivePlayer(this.currentPlayer);
    this.poseEngine.setMode('DICE_ROLL');

    const colorName = player.id === 1 ? 'Biru' : 'Oranye';
    const bannerColor = player.id === 1 ? 'blue' : 'orange';

    if (isBonusRoll) {
      this.showInstruction(
        `🎲 BONUS! ${player.name}: Jawaban Benar! Angkat Tangan untuk Dadu Lagi!`,
        bannerColor
      );
    } else {
      this.showInstruction(
        `🙌 ${player.name}: Angkat Kedua Tangan untuk Melempar Dadu!`,
        bannerColor
      );
    }
    this.updateHUD();
    this.hideAllModals();
  }

  /**
   * Mengganti Giliran ke Pemain Lainnya (P1 <-> P2)
   */
  switchTurn() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    const nextPlayer = this.getActivePlayer();
    const colorName = nextPlayer.id === 1 ? 'Biru' : 'Oranye';
    const bannerColor = nextPlayer.id === 1 ? 'blue' : 'orange';

    this.updateHUD();
    this.showInstruction(
      `🔄 Giliran Berganti ke ${nextPlayer.name} (${colorName})!`,
      bannerColor
    );

    setTimeout(() => {
      this.startPlayerTurn();
    }, 1300);
  }

  /**
   * Mengocok Dadu 3D untuk Pemain yang Sedang Aktif
   */
  rollDice() {
    if (this.gameState !== 'IDLE' || this.isMoving) return;

    this.gameState = 'ROLLING';
    this.sounds.playDiceRoll();
    this.turnsCount++;
    this.updateHUD();

    const player = this.getActivePlayer();
    const bannerColor = player.id === 1 ? 'blue' : 'orange';
    this.showInstruction(`🎲 ${player.name} sedang melempar dadu...`, bannerColor);

    const diceCube = document.getElementById('diceCube');
    diceCube.classList.remove('show-1', 'show-2', 'show-3', 'show-4', 'show-5', 'show-6');
    diceCube.classList.add('dice-rolling');

    // Angka dadu acak 1-6
    const rollResult = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      diceCube.classList.remove('dice-rolling');
      diceCube.classList.add(`show-${rollResult}`);

      this.showInstruction(
        `🎉 ${player.name} Mendapat Angka ${rollResult}! Maju ${rollResult} Petak!`,
        'green'
      );

      setTimeout(() => {
        this.moveAvatarSteps(rollResult);
      }, 700);
    }, 1100);
  }

  /**
   * Animasi Bidak Pemain Aktif Melompat Halus per Petak
   */
  async moveAvatarSteps(steps) {
    this.gameState = 'MOVING';
    this.isMoving = true;

    const player = this.getActivePlayer();
    let targetTile = player.tile + steps;
    if (targetTile > 25) targetTile = 25; // Sampai di finish

    while (player.tile < targetTile) {
      player.tile++;
      const nextPos = this.getTilePosition(player.tile);
      this.sounds.playHop();

      // Animasi lompatan parabolik halus
      await this.animateHop(player, nextPos.x, nextPos.y);
      this.updateHUD();
      await new Promise(r => setTimeout(r, 90));
    }

    this.isMoving = false;

    // Evaluasi Petak Pendaratan
    setTimeout(() => {
      this.evaluateLandingTile();
    }, 350);
  }

  /**
   * Animasi Parabolik Hop untuk Bidak Pemain
   */
  animateHop(player, targetX, targetY) {
    return new Promise(resolve => {
      const startX = player.x;
      const startY = player.y;
      const duration = 280;
      const startTime = performance.now();

      const hopFrame = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);

        // Interpolasi posisi X dan Y
        player.x = startX + (targetX - startX) * progress;
        // Parabola lompatan ke atas
        const arc = Math.sin(progress * Math.PI) * 28;
        player.y = (startY + (targetY - startY) * progress) - arc;

        if (progress < 1.0) {
          requestAnimationFrame(hopFrame);
        } else {
          player.x = targetX;
          player.y = targetY;
          this.particleSystem.burst(targetX, targetY, 8, 'star');
          resolve();
        }
      };

      requestAnimationFrame(hopFrame);
    });
  }

  /**
   * Evaluasi Petak Pendaratan (Ular, Tangga, Finish, atau Kuis)
   */
  evaluateLandingTile() {
    const player = this.getActivePlayer();

    if (player.tile === 25) {
      this.triggerVictory(player);
      return;
    }

    // 1. Cek Petak Kepala Ular (Tantangan Refleks Jongkok)
    const snake = SNAKES.find(s => s.start === player.tile);
    if (snake) {
      this.startSnakeChallenge(snake);
      return;
    }

    // 2. Cek Petak Kaki Tangga (Tantangan Memanjat)
    const ladder = LADDERS.find(l => l.start === player.tile);
    if (ladder) {
      this.startLadderChallenge(ladder);
      return;
    }

    // 3. Petak Biasa: Kuis Interaktif
    this.startQuizChallenge();
  }

  /**
   * Logika Tantangan Ular (Squat / Jongkok 3 Detik)
   */
  startSnakeChallenge(snake) {
    this.gameState = 'SQUAT_CHALLENGE';
    this.activeSnake = snake;
    this.squatSecondsRemaining = 3.0;
    this.sounds.playSnakeAlert();

    this.poseEngine.setMode('SQUAT');

    const player = this.getActivePlayer();
    const p1Alert = document.getElementById('p1SnakeAlert');
    const p2Alert = document.getElementById('p2SnakeAlert');
    const overlay = player.id === 1 ? p1Alert : p2Alert;
    const timerBar = player.id === 1 ? document.getElementById('p1SnakeTimerBar') : document.getElementById('p2SnakeTimerBar');
    const timerText = player.id === 1 ? document.getElementById('p1SnakeTimerText') : document.getElementById('p2SnakeTimerText');
    overlay?.classList.remove('hidden');

    this.showInstruction(`🐍 AWAS ULAR! ${player.name}, Jongkok Sekarang untuk Menghindar!`, 'red');

    const startTime = performance.now();
    const totalDuration = 3000;

    const tick = () => {
      if (this.gameState !== 'SQUAT_CHALLENGE') return;

      const elapsed = performance.now() - startTime;
      const remainingMs = Math.max(0, totalDuration - elapsed);
      const remainingSec = (remainingMs / 1000).toFixed(1);

      if (timerText) timerText.innerText = `${remainingSec}s`;
      if (timerBar) {
        const pct = (remainingMs / totalDuration) * 100;
        timerBar.style.width = `${pct}%`;
      }

      if (remainingMs <= 0) {
        // Gagal jongkok tepat waktu
        this.handleSquatFailed();
      } else {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  handleSquatSuccess() {
    this.gameState = 'IDLE';
    const player = this.getActivePlayer();
    this.sounds.playShield();
    player.shieldActive = true;
    this.particleSystem.burst(player.x, player.y, 25, 'star');

    document.getElementById('p1SnakeAlert')?.classList.add('hidden');
    document.getElementById('p2SnakeAlert')?.classList.add('hidden');

    this.showInstruction(`🛡️ LUAR BIASA! ${player.name} Berhasil Menghindar dari Ular!`, 'green');

    setTimeout(() => {
      player.shieldActive = false;
      // Posisi aman, lanjut giliran pemain berikutnya
      this.switchTurn();
    }, 1800);
  }

  async handleSquatFailed() {
    this.gameState = 'MOVING';
    const player = this.getActivePlayer();
    document.getElementById('p1SnakeAlert')?.classList.add('hidden');
    document.getElementById('p2SnakeAlert')?.classList.add('hidden');

    this.sounds.playWrong();
    this.showInstruction(`😱 ${player.name} Terkena Patukan Ular! Meluncur turun...`, 'red');

    const snake = this.activeSnake;
    const destPos = this.getTilePosition(snake.end);

    // Animasi meluncur turun perlahan ke ekor ular
    await this.animateSlide(player, destPos.x, destPos.y);
    player.tile = snake.end;
    this.updateHUD();

    setTimeout(() => {
      // Tetap berganti giliran ke pemain berikutnya
      this.switchTurn();
    }, 1200);
  }

  /**
   * Logika Tantangan Tangga (Memanjat 4 Kali)
   */
  startLadderChallenge(ladder) {
    this.gameState = 'CLIMB_CHALLENGE';
    this.activeLadder = ladder;
    this.climbProgress = 0;

    this.poseEngine.setMode('CLIMB', { targetReps: 4 });

    const player = this.getActivePlayer();
    const p1Alert = document.getElementById('p1LadderAlert');
    const p2Alert = document.getElementById('p2LadderAlert');
    const overlay = player.id === 1 ? p1Alert : p2Alert;
    const counterText = player.id === 1 ? document.getElementById('p1LadderCounterText') : document.getElementById('p2LadderCounterText');
    const progressBar = player.id === 1 ? document.getElementById('p1LadderProgressBar') : document.getElementById('p2LadderProgressBar');
    overlay?.classList.remove('hidden');

    if (counterText) counterText.innerText = '0 / 4';
    if (progressBar) progressBar.style.width = '0%';

    this.showInstruction(`🧗 TANTANGAN TANGGA! ${player.name}, Angkat Tangan Bergantian 4 Kali!`, 'purple');
  }

  handleClimbStep(count, total) {
    this.sounds.playClimbStep();
    const player = this.getActivePlayer();
    const counterText = player.id === 1 ? document.getElementById('p1LadderCounterText') : document.getElementById('p2LadderCounterText');
    const progressBar = player.id === 1 ? document.getElementById('p1LadderProgressBar') : document.getElementById('p2LadderProgressBar');

    if (counterText) counterText.innerText = `${count} / ${total}`;
    if (progressBar) progressBar.style.width = `${(count / total) * 100}%`;
    this.particleSystem.burst(player.x, player.y, 8, 'star');
  }

  async handleClimbSuccess() {
    this.gameState = 'MOVING';
    const player = this.getActivePlayer();
    document.getElementById('p1LadderAlert')?.classList.add('hidden');
    document.getElementById('p2LadderAlert')?.classList.add('hidden');

    this.sounds.playLadderAscent();
    this.showInstruction(`🎉 HORE! ${player.name} Berhasil Memanjat Tangga ke Puncak!`, 'green');

    const ladder = this.activeLadder;
    const destPos = this.getTilePosition(ladder.end);

    await this.animateSlide(player, destPos.x, destPos.y, 900);
    player.tile = ladder.end;
    this.updateHUD();
    this.particleSystem.burst(destPos.x, destPos.y, 30, 'star');

    setTimeout(() => {
      // Lanjut giliran pemain berikutnya setelah naik tangga
      this.switchTurn();
    }, 1200);
  }

  /**
   * Animasi Meluncur (Slide) untuk Ular & Tangga
   */
  animateSlide(player, targetX, targetY, duration = 800) {
    return new Promise(resolve => {
      const startX = player.x;
      const startY = player.y;
      const startTime = performance.now();

      const frame = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);
        // Easing cubic
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        player.x = startX + (targetX - startX) * ease;
        player.y = startY + (targetY - startY) * ease;

        if (progress < 1.0) {
          requestAnimationFrame(frame);
        } else {
          player.x = targetX;
          player.y = targetY;
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });
  }

  /**
   * Logika Kuis Interaktif (Pose Memilih Jawaban A atau B)
   * Menggunakan pengacakan ketat sehingga P1 dan P2 tidak akan mendapatkan soal yang sama
   */
  startQuizChallenge() {
    this.gameState = 'QUIZ';
    this.poseEngine.setMode('QUIZ');

    const player = this.getActivePlayer();

    // Saring soal yang BELUM PERNAH didapatkan oleh P1 maupun P2
    let available = this.questions.filter(q => !this.usedQuestionIds.has(q.id));

    // Jika seluruh 25 soal sudah habis pernah keluar dalam pertandingan, reset riwayat bersama
    if (available.length === 0) {
      this.usedQuestionIds.clear();
      available = [...this.questions];
    }

    // Ambil secara acak satu soal dari sisa soal yang belum pernah keluar
    const randomIndex = Math.floor(Math.random() * available.length);
    this.activeQuestion = available[randomIndex];

    // Catat ID soal agar tidak pernah bisa menyamai soal yang diterima P1 dan P2
    this.usedQuestionIds.add(this.activeQuestion.id);
    if (player.id === 1) {
      this.usedQuestionsP1.add(this.activeQuestion.id);
    } else {
      this.usedQuestionsP2.add(this.activeQuestion.id);
    }

    // Tampilkan Kartu Soal
    const quizCard = document.getElementById('quizCardOverlay');
    const catBadge = document.getElementById('quizCategoryBadge');
    const qText = document.getElementById('quizQuestionText');
    const optAText = document.getElementById('quizOptionAText');
    const optBText = document.getElementById('quizOptionBText');
    const expBox = document.getElementById('quizExplanationBox');

    catBadge.innerText = `${player.name} • ${this.activeQuestion.category || 'As-Sa\'ah'}`;
    qText.innerText = this.activeQuestion.question;
    optAText.innerText = this.activeQuestion.optionA;
    optBText.innerText = this.activeQuestion.optionB;
    expBox.classList.add('hidden');

    this.resetOptionCardStyles();
    quizCard.classList.remove('hidden');

    const colorName = player.id === 1 ? 'Biru' : 'Oranye';
    const bannerColor = player.id === 1 ? 'blue' : 'orange';
    this.showInstruction(`👈 ${player.name} (${colorName}): Rentangkan Tangan Kiri (A) atau Kanan (B)!`, bannerColor);
  }

  updateQuizHoverUI(zone, progress) {
    const cardA = document.getElementById('optionCardA');
    const cardB = document.getElementById('optionCardB');
    const barA = document.getElementById('dwellBarA');
    const barB = document.getElementById('dwellBarB');

    if (zone === 'A') {
      cardA?.classList.add('active-target', 'border-emerald-500');
      cardB?.classList.remove('active-target', 'border-emerald-500');
      if (barA) barA.style.width = `${progress * 100}%`;
      if (barB) barB.style.width = '0%';
    } else if (zone === 'B') {
      cardB?.classList.add('active-target', 'border-emerald-500');
      cardA?.classList.remove('active-target', 'border-emerald-500');
      if (barB) barB.style.width = `${progress * 100}%`;
      if (barA) barA.style.width = '0%';
    } else {
      cardA?.classList.remove('active-target', 'border-emerald-500');
      cardB?.classList.remove('active-target', 'border-emerald-500');
      if (barA) barA.style.width = '0%';
      if (barB) barB.style.width = '0%';
    }
  }

  resetOptionCardStyles() {
    const cardA = document.getElementById('optionCardA');
    const cardB = document.getElementById('optionCardB');
    const barA = document.getElementById('dwellBarA');
    const barB = document.getElementById('dwellBarB');

    cardA?.classList.remove('active-target', 'border-emerald-500', 'bg-emerald-50', 'bg-emerald-100', 'bg-red-50', 'bg-red-100', 'border-red-500', 'border-emerald-600', 'border-red-600', 'ring-4', 'ring-emerald-400', 'ring-red-400');
    cardB?.classList.remove('active-target', 'border-emerald-500', 'bg-emerald-50', 'bg-emerald-100', 'bg-red-50', 'bg-red-100', 'border-red-500', 'border-emerald-600', 'border-red-600', 'ring-4', 'ring-emerald-400', 'ring-red-400');
    if (barA) barA.style.width = '0%';
    if (barB) barB.style.width = '0%';
  }

  async handleQuizAnswer(selectedOption) {
    if (this.gameState !== 'QUIZ' || !this.activeQuestion) return;
    this.gameState = 'IDLE';

    const player = this.getActivePlayer();
    player.totalAnswered++;
    const isCorrect = selectedOption === this.activeQuestion.correct;

    const cardA = document.getElementById('optionCardA');
    const cardB = document.getElementById('optionCardB');
    const expBox = document.getElementById('quizExplanationBox');
    const expText = document.getElementById('quizExplanationText');

    if (isCorrect) {
      player.correctAnswers++;
      this.sounds.playCorrect();
      this.particleSystem.burst(player.x, player.y, 35, 'star');

      const selectedCard = selectedOption === 'A' ? cardA : cardB;
      selectedCard?.classList.add('bg-emerald-100', 'border-emerald-600');

      this.showInstruction(`🌟 JAWABAN BENAR! 🎉 ${player.name} Berhak Melempar Dadu Lagi!`, 'green');

      setTimeout(() => {
        document.getElementById('quizCardOverlay').classList.add('hidden');
        this.updateHUD();

        // Pemain yang benar mendapat giliran melempar dadu lagi!
        this.startPlayerTurn(true);
      }, 1500);

    } else {
      this.sounds.playWrong();
      const selectedCard = selectedOption === 'A' ? cardA : cardB;
      selectedCard?.classList.add('bg-red-100', 'border-red-600');

      this.showInstruction(`❌ JAWABAN ${player.name} KURANG TEPAT! Bidak Tetap di Tempat.`, 'red');

      // Tampilkan penjelasan edukatif selama 3 detik
      if (expBox && expText) {
        expText.innerText = this.activeQuestion.explanation || 'Tetap semangat belajar!';
        expBox.classList.remove('hidden');
      }

      setTimeout(() => {
        document.getElementById('quizCardOverlay').classList.add('hidden');
        this.updateHUD();
        // Salah jawab: giliran berganti ke pemain berikutnya!
        this.switchTurn();
      }, 3200);
    }
  }

  /**
   * Kemenangan (Finish di Petak 25) - Mode 2 Pemain
   */
  triggerVictory(winnerPlayer) {
    this.gameState = 'VICTORY';
    this.sounds.playVictory();
    this.particleSystem.burst(winnerPlayer.x, winnerPlayer.y, 60, 'star');

    const modal = document.getElementById('victoryModal');
    const titleEl = document.getElementById('victoryWinnerTitle');
    const subTitleEl = document.getElementById('victorySubtitle');
    const turnsEl = document.getElementById('victoryTurns');

    const p1TileEl = document.getElementById('vicP1Tile');
    const p1ScoreEl = document.getElementById('vicP1Score');
    const p2TileEl = document.getElementById('vicP2Tile');
    const p2ScoreEl = document.getElementById('vicP2Score');

    if (titleEl) {
      titleEl.innerText = `🏆 HORE, ${winnerPlayer.name.toUpperCase()} MENANG!`;
      titleEl.className = winnerPlayer.id === 1
        ? 'text-2xl font-bold font-fun text-blue-400 mb-1'
        : 'text-2xl font-bold font-fun text-orange-400 mb-1';
    }

    if (subTitleEl) {
      subTitleEl.innerText = `${winnerPlayer.name} berhasil mencapai Puncak Petak 25 lebih dulu!`;
    }

    if (turnsEl) turnsEl.innerText = this.turnsCount;

    // Stat P1
    const p1 = this.players[1];
    const p1Acc = p1.totalAnswered > 0 ? Math.round((p1.correctAnswers / p1.totalAnswered) * 100) : 100;
    if (p1TileEl) p1TileEl.innerText = `${p1.tile}/25`;
    if (p1ScoreEl) p1ScoreEl.innerText = `${p1Acc}% (${p1.correctAnswers}/${p1.totalAnswered})`;

    // Stat P2
    const p2 = this.players[2];
    const p2Acc = p2.totalAnswered > 0 ? Math.round((p2.correctAnswers / p2.totalAnswered) * 100) : 100;
    if (p2TileEl) p2TileEl.innerText = `${p2.tile}/25`;
    if (p2ScoreEl) p2ScoreEl.innerText = `${p2Acc}% (${p2.correctAnswers}/${p2.totalAnswered})`;

    modal?.classList.remove('hidden');
    this.showInstruction(`🏆 PERMAINAN SELESAI! Selamat kepada ${winnerPlayer.name}!`, 'green');
  }

  restartGame() {
    this.currentPlayer = 1;
    this.turnsCount = 0;
    this.gameState = 'IDLE';

    // Bersihkan riwayat soal acak agar pertandingan baru teracak segar dan unik untuk kedua pemain
    this.usedQuestionIds.clear();
    this.usedQuestionsP1.clear();
    this.usedQuestionsP2.clear();

    // Reset P1 & P2
    for (let i = 1; i <= 2; i++) {
      const p = this.players[i];
      p.tile = 1;
      p.shieldActive = false;
      p.correctAnswers = 0;
      p.totalAnswered = 0;
      const pos = this.getTilePosition(1);
      p.x = pos.x;
      p.y = pos.y;
    }

    this.hideAllModals();
    this.updateHUD();
    this.startPlayerTurn();
  }

  hideAllModals() {
    document.getElementById('quizCardOverlay')?.classList.add('hidden');
    document.getElementById('p1TargetBoxA')?.classList.add('hidden');
    document.getElementById('p1TargetBoxB')?.classList.add('hidden');
    document.getElementById('p2TargetBoxA')?.classList.add('hidden');
    document.getElementById('p2TargetBoxB')?.classList.add('hidden');
    document.getElementById('p1SnakeAlert')?.classList.add('hidden');
    document.getElementById('p2SnakeAlert')?.classList.add('hidden');
    document.getElementById('p1LadderAlert')?.classList.add('hidden');
    document.getElementById('p2LadderAlert')?.classList.add('hidden');
    document.getElementById('victoryModal')?.classList.add('hidden');
  }

  /**
   * Perbarui Indikator HUD untuk 2 Layar Pemain (Layar 1: P1 & Layar 2: P2)
   */
  updateHUD() {
    const activeP = this.getActivePlayer();

    // 1. Banner Giliran Pusat di Tengah
    const banner = document.getElementById('activePlayerBanner');
    const bannerText = document.getElementById('activePlayerText');
    const bannerIcon = document.getElementById('activePlayerIcon');
    const turnsBadge = document.getElementById('hudTurns');

    if (banner && bannerText && bannerIcon) {
      if (activeP.id === 1) {
        banner.className = 'flex items-center gap-2';
        bannerIcon.innerText = '1';
        bannerIcon.className = 'w-5 h-5 rounded-full bg-blue-600 text-white font-fun font-bold text-xs flex items-center justify-center shadow-sm';
        bannerText.innerText = 'Giliran: Pemain 1 (Biru)';
        bannerText.className = 'text-xs sm:text-sm font-fun font-bold text-blue-400';
      } else {
        banner.className = 'flex items-center gap-2';
        bannerIcon.innerText = '2';
        bannerIcon.className = 'w-5 h-5 rounded-full bg-orange-600 text-white font-fun font-bold text-xs flex items-center justify-center shadow-sm';
        bannerText.innerText = 'Giliran: Pemain 2 (Oranye)';
        bannerText.className = 'text-xs sm:text-sm font-fun font-bold text-orange-400';
      }
    }

    if (turnsBadge) turnsBadge.innerText = `Putaran: ${this.turnsCount}`;

    // 2. Status Pemain 1 (Layar 1 Kiri)
    const p1 = this.players[1];
    const p1TileBadge = document.getElementById('p1TileBadge');
    const p1ScoreBadge = document.getElementById('p1ScoreBadge');
    const p1TurnStatus = document.getElementById('p1TurnStatus');
    const p1PlayerSec = document.getElementById('p1PlayerSection');
    const p1ScreenCard = document.getElementById('p1ScreenCard');
    const p1Standby = document.getElementById('p1StandbyOverlay');

    if (p1TileBadge) p1TileBadge.innerText = `Petak ${p1.tile}/25`;
    const p1Acc = p1.totalAnswered > 0 ? Math.round((p1.correctAnswers / p1.totalAnswered) * 100) : 100;
    if (p1ScoreBadge) p1ScoreBadge.innerText = `${p1Acc}%`;

    // 3. Status Pemain 2 (Layar 2 Kanan)
    const p2 = this.players[2];
    const p2TileBadge = document.getElementById('p2TileBadge');
    const p2ScoreBadge = document.getElementById('p2ScoreBadge');
    const p2TurnStatus = document.getElementById('p2TurnStatus');
    const p2PlayerSec = document.getElementById('p2PlayerSection');
    const p2ScreenCard = document.getElementById('p2ScreenCard');
    const p2Standby = document.getElementById('p2StandbyOverlay');

    if (p2TileBadge) p2TileBadge.innerText = `Petak ${p2.tile}/25`;
    const p2Acc = p2.totalAnswered > 0 ? Math.round((p2.correctAnswers / p2.totalAnswered) * 100) : 100;
    if (p2ScoreBadge) p2ScoreBadge.innerText = `${p2Acc}%`;

    // Visual Switch Antara Layar 1 (P1) dan Layar 2 (P2)
    if (activeP.id === 1) {
      // P1 Aktif (Terang & Bersinar Biru)
      p1PlayerSec?.classList.remove('opacity-70', 'border-slate-700');
      p1PlayerSec?.classList.add('opacity-100', 'border-blue-500', 'shadow-blue-500/30');
      p1ScreenCard?.classList.add('border-blue-500', 'glow-pulse-blue');
      p1ScreenCard?.classList.remove('border-slate-700');
      p1Standby?.classList.add('hidden');
      if (p1TurnStatus) {
        p1TurnStatus.innerText = '🔥 GILIRAN ANDA';
        p1TurnStatus.className = 'text-[9px] font-bold text-blue-300 mt-0.5';
      }

      // P2 Standby (Redup Menunggu P1)
      p2PlayerSec?.classList.add('opacity-70', 'border-slate-700');
      p2PlayerSec?.classList.remove('opacity-100', 'border-orange-500', 'shadow-orange-500/30');
      p2ScreenCard?.classList.remove('border-orange-500', 'glow-pulse-orange');
      p2ScreenCard?.classList.add('border-slate-700');
      p2Standby?.classList.remove('hidden');
      if (p2TurnStatus) {
        p2TurnStatus.innerText = '⏳ MENUNGGU P1';
        p2TurnStatus.className = 'text-[9px] font-bold text-slate-400 mt-0.5';
      }
    } else {
      // P2 Aktif (Terang & Bersinar Oranye)
      p2PlayerSec?.classList.remove('opacity-70', 'border-slate-700');
      p2PlayerSec?.classList.add('opacity-100', 'border-orange-500', 'shadow-orange-500/30');
      p2ScreenCard?.classList.add('border-orange-500', 'glow-pulse-orange');
      p2ScreenCard?.classList.remove('border-slate-700');
      p2Standby?.classList.add('hidden');
      if (p2TurnStatus) {
        p2TurnStatus.innerText = '🔥 GILIRAN ANDA';
        p2TurnStatus.className = 'text-[9px] font-bold text-orange-400 mt-0.5';
      }

      // P1 Standby (Redup Menunggu P2)
      p1PlayerSec?.classList.add('opacity-70', 'border-slate-700');
      p1PlayerSec?.classList.remove('opacity-100', 'border-blue-500', 'shadow-blue-500/30');
      p1ScreenCard?.classList.remove('border-blue-500', 'glow-pulse-blue');
      p1ScreenCard?.classList.add('border-slate-700');
      p1Standby?.classList.remove('hidden');
      if (p1TurnStatus) {
        p1TurnStatus.innerText = '⏳ MENUNGGU P2';
        p1TurnStatus.className = 'text-[9px] font-bold text-slate-400 mt-0.5';
      }
    }
  }

  showInstruction(text, color = 'blue') {
    const p1Banner = document.getElementById('p1InstructionBanner');
    const p2Banner = document.getElementById('p2InstructionBanner');
    const activeP = this.getActivePlayer();

    if (activeP.id === 1) {
      if (p1Banner) {
        p1Banner.innerText = text;
        p1Banner.className = 'px-2.5 py-1.5 rounded-xl font-bold text-center text-[11px] sm:text-xs shadow transition-all shrink-0 bg-blue-600 text-white glow-pulse-blue';
      }
      if (p2Banner) {
        p2Banner.innerText = '⏳ Bersiap untuk Giliran Pemain 2...';
        p2Banner.className = 'px-2.5 py-1.5 rounded-xl font-bold text-center text-[11px] sm:text-xs shadow transition-all shrink-0 bg-slate-800 text-slate-400';
      }
    } else {
      if (p2Banner) {
        p2Banner.innerText = text;
        p2Banner.className = 'px-2.5 py-1.5 rounded-xl font-bold text-center text-[11px] sm:text-xs shadow transition-all shrink-0 bg-orange-600 text-white glow-pulse-orange';
      }
      if (p1Banner) {
        p1Banner.innerText = '⏳ Bersiap untuk Giliran Pemain 1...';
        p1Banner.className = 'px-2.5 py-1.5 rounded-xl font-bold text-center text-[11px] sm:text-xs shadow transition-all shrink-0 bg-slate-800 text-slate-400';
      }
    }
  }

  setCameraStatus(msg, type) {
    const badge = document.getElementById('cameraStatusBadge');
    if (!badge) return;
    badge.innerText = msg;
    if (type === 'success') {
      badge.className = 'keypoint-badge bg-emerald-100 text-emerald-700 border border-emerald-300';
    } else if (type === 'error' || type === 'warning') {
      badge.className = 'keypoint-badge bg-amber-100 text-amber-700 border border-amber-300';
    } else {
      badge.className = 'keypoint-badge bg-blue-100 text-blue-700 border border-blue-300';
    }
  }

  /**
   * ==========================================================================
   * Game Canvas Rendering Loop
   * ==========================================================================
   */
  gameLoop(timestamp) {
    this.ctx.clearRect(0, 0, this.boardSize, this.boardSize);

    // 1. Gambar Background & Grid Papan 5x5
    this.drawBoard();

    // Gambar jalur langkah tipis (1 -> 25)
    this.drawPathTrail();

    // 2. Gambar Tangga (3 Tangga)
    this.drawLadders();

    // 3. Gambar Ular (3 Ular)
    this.drawSnakes(timestamp);

    // 4. Gambar Bidak Kedua Pemain (P1 & P2)
    this.drawAvatars(timestamp);

    // 5. Update & Gambar Partikel Bintang/Konfeti
    this.particleSystem.updateAndDraw(this.ctx);

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  drawBoard() {
    const ctx = this.ctx;
    const tileColors = [
      ['#fee2e2', '#fecaca'], // Red/Rose pastel
      ['#fef3c7', '#fde68a'], // Amber pastel
      ['#dcfce7', '#bbf7d0'], // Emerald pastel
      ['#e0f2fe', '#bae6fd'], // Sky pastel
      ['#f3e8ff', '#e9d5ff']  // Purple pastel
    ];

    for (let i = 1; i <= 25; i++) {
      const pos = this.getTilePosition(i);
      const half = this.tileSize / 2;
      const x = pos.x - half;
      const y = pos.y - half;
      const pad = 3;

      // Warna petak selang-seling ceria
      const colorPair = tileColors[(pos.rowIndex + pos.colIndex) % tileColors.length];
      const grad = ctx.createLinearGradient(x, y, x + this.tileSize, y + this.tileSize);
      grad.addColorStop(0, colorPair[0]);
      grad.addColorStop(1, colorPair[1]);

      // Kotak Petak Membulat
      ctx.save();
      this.roundRect(ctx, x + pad, y + pad, this.tileSize - pad * 2, this.tileSize - pad * 2, 12);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.stroke();

      // Bayangan halus dalam
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fill();

      // Penanda Petak Khusus
      if (i === 1) {
        // Petak START
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(this.tileSize * 0.18)}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏁 START', pos.x, pos.y + half - 8);
      } else if (i === 25) {
        // Petak FINISH
        ctx.fillStyle = '#f59e0b';
        ctx.font = `bold ${Math.round(this.tileSize * 0.20)}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏆 FINISH', pos.x, pos.y + half - 8);
      } else {
        // Ikon Ular / Tangga / Kuis
        const isLadder = LADDERS.some(l => l.start === i);
        const isSnake = SNAKES.some(s => s.start === i);

        ctx.font = `${Math.round(this.tileSize * 0.22)}px sans-serif`;
        ctx.textAlign = 'center';
        if (isLadder) {
          ctx.fillText('🪜', pos.x, pos.y + half - 8);
        } else if (isSnake) {
          ctx.fillText('🐍', pos.x, pos.y + half - 8);
        } else {
          ctx.fillText('❓', pos.x, pos.y + half - 8);
        }
      }

      // Nomor Petak
      ctx.fillStyle = '#334155';
      ctx.font = `bold ${Math.round(this.tileSize * 0.26)}px Fredoka, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${i}`, x + pad + 6, y + pad + 4);

      ctx.restore();
    }
  }

  /**
   * Gambar Garis Jalur Titik-Titik Halus Menghubungkan Petak 1 s/d 25
   */
  drawPathTrail() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 8]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let p = 1; p <= 25; p++) {
      const pt = this.getTilePosition(p);
      if (p === 1) {
        ctx.moveTo(pt.x, pt.y);
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Gambar 3 Tangga Menghubungkan Petak
   */
  drawLadders() {
    const ctx = this.ctx;

    LADDERS.forEach(ladder => {
      const p1 = this.getTilePosition(ladder.start);
      const p2 = this.getTilePosition(ladder.end);

      ctx.save();
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      const railOffset = 14;
      const perpX = -Math.sin(angle) * railOffset;
      const perpY = Math.cos(angle) * railOffset;

      // Bayangan Tangga
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(p1.x + perpX + 3, p1.y + perpY + 3);
      ctx.lineTo(p2.x + perpX + 3, p2.y + perpY + 3);
      ctx.moveTo(p1.x - perpX + 3, p1.y - perpY + 3);
      ctx.lineTo(p2.x - perpX + 3, p2.y - perpY + 3);
      ctx.stroke();

      // Batang Rel Kiri & Kanan Tangga (Kayu Ceria)
      ctx.strokeStyle = '#d97706'; // Amber Wood
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(p1.x + perpX, p1.y + perpY);
      ctx.lineTo(p2.x + perpX, p2.y + perpY);
      ctx.moveTo(p1.x - perpX, p1.y - perpY);
      ctx.lineTo(p2.x - perpX, p2.y - perpY);
      ctx.stroke();

      // Anak Tangga (Rungs)
      const numRungs = Math.floor(dist / 22);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let r = 1; r < numRungs; r++) {
        const t = r / numRungs;
        const rx = p1.x + dx * t;
        const ry = p1.y + dy * t;
        ctx.moveTo(rx + perpX, ry + perpY);
        ctx.lineTo(rx - perpX, ry - perpY);
      }
      ctx.stroke();

      ctx.restore();
    });
  }

  /**
   * Gambar 3 Ular Visual dengan Lengkungan & Mata Kartun
   */
  drawSnakes(time) {
    const ctx = this.ctx;

    SNAKES.forEach((snake, idx) => {
      const head = this.getTilePosition(snake.start);
      const tail = this.getTilePosition(snake.end);

      ctx.save();

      // Titik kontrol kurva Bézier yang melengkung indah
      const midX = (head.x + tail.x) / 2;
      const midY = (head.y + tail.y) / 2;
      const curveSign = idx % 2 === 0 ? 1 : -1;
      const cpX = midX + curveSign * 35;
      const cpY = midY - 25;

      // 1. Gambar Badan Ular (Gradien Tebal ke Tipis)
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.quadraticCurveTo(cpX, cpY, head.x, head.y);
      ctx.lineCap = 'round';
      ctx.lineWidth = 16;
      ctx.strokeStyle = snake.color;
      ctx.stroke();

      // Pola belang/totol tubuh ular
      ctx.lineWidth = 10;
      ctx.setLineDash([8, 12]);
      ctx.strokeStyle = '#fef08a'; // Kuning motif
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Gambar Ekor Ular
      ctx.beginPath();
      ctx.arc(tail.x, tail.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = snake.color;
      ctx.fill();

      // 3. Gambar Kepala Ular Kartun Lucu di Petak Asal
      ctx.beginPath();
      ctx.arc(head.x, head.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = snake.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Mata Ular
      const eyeOffset = 5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(head.x - eyeOffset, head.y - 4, 4, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffset, head.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pupil Mata
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(head.x - eyeOffset, head.y - 4, 2, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffset, head.y - 4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Lidah Bercabang Merah
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(head.x, head.y + 12);
      ctx.lineTo(head.x, head.y + 18);
      ctx.lineTo(head.x - 3, head.y + 21);
      ctx.moveTo(head.x, head.y + 18);
      ctx.lineTo(head.x + 3, head.y + 21);
      ctx.stroke();

      ctx.restore();
    });
  }

  /**
   * Gambar Avatar Karakter Kedua Pemain (P1 Biru & P2 Oranye)
   */
  drawAvatars(time) {
    const ctx = this.ctx;
    const sameTile = this.players[1].tile === this.players[2].tile;

    // Gambar Pemain 1 lalu Pemain 2 (Pemain yang aktif digambar terakhir agar di atas)
    const drawOrder = this.currentPlayer === 1 ? [2, 1] : [1, 2];

    drawOrder.forEach(pId => {
      const p = this.players[pId];
      // Jika berada di petak yang sama, beri offset kiri/kanan agar tidak bertumpuk
      const offsetX = sameTile ? (pId === 1 ? -12 : 12) : 0;
      const idleBob = (this.isMoving && this.currentPlayer === pId) ? 0 : Math.sin((time + pId * 100) / 200) * 3;

      ctx.save();
      ctx.translate(p.x + offsetX, p.y + idleBob);

      // 1. Cincin Penanda Giliran Aktif (Pulsing Glow Ring)
      if (this.currentPlayer === pId) {
        ctx.beginPath();
        const pulseR = 21 + Math.sin(time / 140) * 2.5;
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = pId === 1 ? 'rgba(59, 130, 246, 0.9)' : 'rgba(234, 88, 12, 0.9)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Bayangan Bawah Avatar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 17 - idleBob, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Efek Perisai Pelindung (Jika berhasil jongkok dari ular)
      if (p.shieldActive) {
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fillStyle = pId === 1 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(251, 146, 60, 0.35)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = pId === 1 ? '#38bdf8' : '#fb923c';
        ctx.stroke();
      }

      // 4. Badan Avatar Bulat
      const bodyGrad = ctx.createRadialGradient(-3, -5, 2, 0, 0, 16);
      bodyGrad.addColorStop(0, p.colorLight);
      bodyGrad.addColorStop(1, p.colorDark);

      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 5. Mata Karakter
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-4.5, -2, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(4.5, -2, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil Mata
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-4.5, -1, 2, 0, Math.PI * 2);
      ctx.arc(4.5, -1, 2, 0, Math.PI * 2);
      ctx.fill();

      // Kilau Mata
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-5.5, -2.5, 1, 0, Math.PI * 2);
      ctx.arc(3.5, -2.5, 1, 0, Math.PI * 2);
      ctx.fill();

      // 6. Senyuman Ceria
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 3.5, 4.5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // 7. Pipi Merona
      ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
      ctx.beginPath();
      ctx.arc(-8.5, 3.5, 2.5, 0, Math.PI * 2);
      ctx.arc(8.5, 3.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 8. Badge Label "P1" atau "P2" di Atas Kepala
      ctx.beginPath();
      ctx.arc(0, -18, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = p.themeColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, 0, -17.5);

      ctx.restore();
    });
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Mengaktifkan atau Keluar dari Mode Layar Penuh (Fullscreen)
   */
  toggleFullscreen() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

    if (!isFs) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(err => console.warn('Layar penuh diblokir browser:', err));
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn('Gagal keluar layar penuh:', err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  /**
   * Event Listeners & Kontrol UI
   */
  setupEventListeners() {
    // Tombol Dadu (Bisa diklik untuk cadangan / testing)
    document.getElementById('diceCubeContainer')?.addEventListener('click', () => {
      this.rollDice();
    });

    // Klik langsung pada kartu opsi jawaban A / B
    document.getElementById('optionCardA')?.addEventListener('click', () => {
      if (this.gameState === 'QUIZ') this.handleQuizAnswer('A');
    });
    document.getElementById('optionCardB')?.addEventListener('click', () => {
      if (this.gameState === 'QUIZ') this.handleQuizAnswer('B');
    });

    // Mute Audio Toggle
    const muteBtn = document.getElementById('soundToggleBtn');
    muteBtn?.addEventListener('click', () => {
      this.sounds.isMuted = !this.sounds.isMuted;
      localStorage.setItem('kinesthetic_sound_muted', this.sounds.isMuted);
      muteBtn.innerText = this.sounds.isMuted ? '🔇 Bisu' : '🔊 Suara';
    });
    if (this.sounds.isMuted && muteBtn) {
      muteBtn.innerText = '🔇 Bisu';
    }

    // Tombol Restart Game
    document.getElementById('resetGameBtn')?.addEventListener('click', () => {
      if (confirm('Ulangi permainan dari awal (Petak 1)?')) {
        this.restartGame();
      }
    });

    // Tombol Main Lagi di Victory Modal
    document.getElementById('playAgainBtn')?.addEventListener('click', () => {
      this.restartGame();
    });

    // Toggle Mode Layar Penuh (Fullscreen)
    const fsBtn = document.getElementById('fullscreenToggleBtn');
    fsBtn?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Sinkronisasi Ikon & Teks Layar Penuh
    const updateFsState = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (fsBtn) {
        fsBtn.innerHTML = isFs ? '🗗 Keluar Penuh' : '⛶ Layar Penuh';
        if (isFs) {
          fsBtn.classList.add('bg-indigo-600', 'text-white');
          fsBtn.classList.remove('bg-slate-800', 'text-slate-200');
        } else {
          fsBtn.classList.remove('bg-indigo-600', 'text-white');
          fsBtn.classList.add('bg-slate-800', 'text-slate-200');
        }
      }
      setTimeout(() => {
        this.resizeCanvas();
        this.poseEngine?.syncCanvasSize();
      }, 150);
    };

    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);
    document.addEventListener('mozfullscreenchange', updateFsState);
    document.addEventListener('MSFullscreenChange', updateFsState);

    // Tombol Shortcut 'F' untuk Layar Penuh
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      }
    });

    // Setup Panel Mode Guru
    this.setupTeacherMode();

    // Setup Tombol Simulasi Gerak (Dev/Testing Toolbar)
    this.setupSimulationControls();
  }

  /**
   * Kontrol Toolbar Simulasi Pengujian (Sangat berguna untuk demo tanpa webcam)
   */
  setupSimulationControls() {
    document.getElementById('simArmsUpBtn')?.addEventListener('click', () => {
      if (this.gameState === 'IDLE') this.rollDice();
    });

    document.getElementById('simChoiceABtn')?.addEventListener('click', () => {
      if (this.gameState === 'QUIZ') this.handleQuizAnswer('A');
    });

    document.getElementById('simChoiceBBtn')?.addEventListener('click', () => {
      if (this.gameState === 'QUIZ') this.handleQuizAnswer('B');
    });

    document.getElementById('simSquatBtn')?.addEventListener('click', () => {
      if (this.gameState === 'SQUAT_CHALLENGE') this.handleSquatSuccess();
    });

    document.getElementById('simClimbBtn')?.addEventListener('click', () => {
      if (this.gameState === 'CLIMB_CHALLENGE') {
        this.climbProgress = (this.climbProgress || 0) + 1;
        this.handleClimbStep(this.climbProgress, 4);
        if (this.climbProgress >= 4) {
          this.handleClimbSuccess();
        }
      }
    });
  }

  /**
   * ==========================================================================
   * Mode Guru (Teacher Mode Dashboard & CRUD Soal)
   * ==========================================================================
   */
  setupTeacherMode() {
    const teacherBtn = document.getElementById('teacherModeBtn');
    const pinModal = document.getElementById('teacherPinModal');
    const pinInput = document.getElementById('teacherPinInput');
    const pinSubmitBtn = document.getElementById('teacherPinSubmitBtn');
    const pinCancelBtn = document.getElementById('teacherPinCancelBtn');
    const pinError = document.getElementById('teacherPinError');

    const teacherDashboard = document.getElementById('teacherDashboardModal');
    const closeDashboardBtn = document.getElementById('closeTeacherDashboardBtn');

    // Buka Modal PIN
    teacherBtn?.addEventListener('click', () => {
      if (pinInput) pinInput.value = '';
      if (pinError) pinError.classList.add('hidden');
      pinModal?.classList.remove('hidden');
      pinInput?.focus();
    });

    pinCancelBtn?.addEventListener('click', () => {
      pinModal?.classList.add('hidden');
    });

    // Verifikasi PIN (Default: 1234)
    pinSubmitBtn?.addEventListener('click', () => {
      const pin = pinInput?.value.trim();
      if (pin === '1234') {
        pinModal?.classList.add('hidden');
        this.openTeacherDashboard();
      } else {
        pinError?.classList.remove('hidden');
      }
    });

    pinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') pinSubmitBtn?.click();
    });

    closeDashboardBtn?.addEventListener('click', () => {
      teacherDashboard?.classList.add('hidden');
    });

    // CRUD Tombol di Dashboard
    document.getElementById('addQuestionBtn')?.addEventListener('click', () => {
      this.openQuestionEditor();
    });

    document.getElementById('exportQuestionsBtn')?.addEventListener('click', () => {
      this.exportQuestionsToJSON();
    });

    const fileImportInput = document.getElementById('importQuestionsInput');
    document.getElementById('importQuestionsBtn')?.addEventListener('click', () => {
      fileImportInput?.click();
    });

    fileImportInput?.addEventListener('change', (e) => {
      this.importQuestionsFromJSON(e);
    });

    document.getElementById('resetDefaultQuestionsBtn')?.addEventListener('click', () => {
      if (confirm('Kembalikan bank soal ke 25 soal bawaan Bahasa Arab (As-Sa\'ah) SMP?')) {
        this.saveQuestions(JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)));
        localStorage.setItem('kinesthetic_questions_version', 'v2_assaah_25');
        this.renderQuestionsTable();
        alert('Bank soal berhasil di-reset ke 25 soal As-Sa\'ah Bahasa Arab SMP!');
      }
    });

    // Tombol Pilihan Cepat Kategori Pelajaran
    document.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const cat = e.currentTarget.dataset.cat;
        const catInput = document.getElementById('qEditCategory');
        if (catInput) {
          catInput.value = cat;
          catInput.focus();
        }
      });
    });

    // Otomasi Samakan Keterangan saat Salah (Realtime Sync & Preview)
    const updateAutoExp = () => this.refreshExplanationPreview();
    document.getElementById('qEditOptionA')?.addEventListener('input', updateAutoExp);
    document.getElementById('qEditOptionB')?.addEventListener('input', updateAutoExp);
    document.getElementById('qEditCorrectA')?.addEventListener('change', updateAutoExp);
    document.getElementById('qEditCorrectB')?.addEventListener('change', updateAutoExp);

    document.getElementById('qAutoExplanationCheckbox')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        updateAutoExp();
      }
    });

    document.getElementById('autoFillExplanationBtn')?.addEventListener('click', () => {
      const autoCheck = document.getElementById('qAutoExplanationCheckbox');
      if (autoCheck) autoCheck.checked = true;
      updateAutoExp();
    });

    // Form Editor Simpan & Batal
    document.getElementById('cancelEditQuestionBtn')?.addEventListener('click', () => {
      document.getElementById('questionEditorModal')?.classList.add('hidden');
    });

    document.getElementById('questionForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveQuestionForm();
    });

    // Modal Buat Link Khusus Pembeli (Ruang Kelas Terhubung)
    const openShareBtn = document.getElementById('openShareRoomBtn');
    const closeShareBtn = document.getElementById('closeShareRoomBtn');
    const shareModal = document.getElementById('shareRoomModal');

    openShareBtn?.addEventListener('click', () => {
      shareModal?.classList.remove('hidden');
      shareModal?.classList.add('flex');
    });

    closeShareBtn?.addEventListener('click', () => {
      shareModal?.classList.add('hidden');
      shareModal?.classList.remove('flex');
    });

    const btnGenShare = document.getElementById('btnGenerateShareLink');
    const shareInput = document.getElementById('shareBuyerInput');
    const shareResult = document.getElementById('shareResultBox');
    const shareUrl = document.getElementById('shareUrlOutput');
    const shareWa = document.getElementById('shareWaTextOutput');

    btnGenShare?.addEventListener('click', () => {
      const buyer = (shareInput?.value || '').trim() || 'SMP Negeri 1';
      const cleanParam = encodeURIComponent(buyer);
      const url = `${window.location.origin}${window.location.pathname}?sekolah=${cleanParam}`;

      if (shareUrl) shareUrl.value = url;
      if (shareWa) {
        shareWa.value = 
`Halo Bapak/Ibu Guru di ${buyer},
Berikut tautan resmi Media Edukasi Ular Tangga Kinestetik (Bahasa Arab: As-Sa'ah) untuk kelas Anda:

👉 ${url}

Panduan Penggunaan:
1. Buka tautan di atas melalui browser Google Chrome atau Edge (bisa di Laptop, HP, atau Smart TV).
2. Game langsung siap dimainkan tanpa perlu login atau password.
3. Semua pengaturan dan bank soal terhubung khusus untuk ruang kelas sekolah Anda. Selamat belajar & bermain!`;
      }
      shareResult?.classList.remove('hidden');
    });

    document.getElementById('btnCopyShareUrl')?.addEventListener('click', () => {
      if (shareUrl) {
        navigator.clipboard.writeText(shareUrl.value).then(() => {
          alert('Link berhasil disalin!');
        });
      }
    });

    document.getElementById('btnCopyShareWa')?.addEventListener('click', () => {
      if (shareWa) {
        navigator.clipboard.writeText(shareWa.value).then(() => {
          alert('Pesan WhatsApp siap kirim berhasil disalin!');
        });
      }
    });
  }

  generateStandardExplanation(correct, optionA, optionB) {
    const chosenText = correct === 'A' ? (optionA || 'Pilihan A') : (optionB || 'Pilihan B');
    return `Jawaban yang tepat adalah Pilihan ${correct} ("${chosenText}"). Tetap semangat dan pelajari lagi ya!`;
  }

  refreshExplanationPreview() {
    const correct = document.querySelector('input[name="qCorrect"]:checked')?.value || 'A';
    const optA = document.getElementById('qEditOptionA')?.value.trim() || 'Pilihan A';
    const optB = document.getElementById('qEditOptionB')?.value.trim() || 'Pilihan B';
    const autoCheck = document.getElementById('qAutoExplanationCheckbox');
    const expInput = document.getElementById('qEditExplanation');
    const previewEl = document.getElementById('autoExplanationPreview');

    const stdText = this.generateStandardExplanation(correct, optA, optB);
    if (previewEl) {
      previewEl.innerText = `Pratinjau: "${stdText}"`;
    }
    if (autoCheck && autoCheck.checked && expInput) {
      expInput.value = stdText;
    }
  }

  openTeacherDashboard() {
    const dashboard = document.getElementById('teacherDashboardModal');
    dashboard?.classList.remove('hidden');
    this.renderQuestionsTable();
  }

  renderQuestionsTable() {
    const tbody = document.getElementById('questionsTableBody');
    const totalCountEl = document.getElementById('teacherTotalQuestions');
    if (!tbody) return;

    if (totalCountEl) totalCountEl.innerText = `${this.questions.length} Soal Tersedia`;

    tbody.innerHTML = '';

    this.questions.forEach((q, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50 transition-colors text-sm';
      tr.innerHTML = `
        <td class="p-3 font-semibold text-slate-500">${idx + 1}</td>
        <td class="p-3"><span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">${q.category}</span></td>
        <td class="p-3 font-medium text-slate-800 max-w-xs truncate">${q.question}</td>
        <td class="p-3 text-slate-900 font-semibold">A: ${q.optionA}<br>B: ${q.optionB}</td>
        <td class="p-3"><span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-md">${q.correct}</span></td>
        <td class="p-3 text-xs text-slate-500 max-w-xs truncate">${q.explanation || '-'}</td>
        <td class="p-3 whitespace-nowrap">
          <button class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs mr-1 edit-q-btn cursor-pointer" data-id="${q.id}">✏️ Edit</button>
          <button class="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs del-q-btn cursor-pointer" data-id="${q.id}">🗑️ Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind Edit & Delete
    tbody.querySelectorAll('.edit-q-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const q = this.questions.find(item => item.id === id);
        if (q) this.openQuestionEditor(q);
      });
    });

    tbody.querySelectorAll('.del-q-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        if (confirm('Hapus soal ini dari bank soal?')) {
          const filtered = this.questions.filter(item => item.id !== id);
          this.saveQuestions(filtered);
          this.renderQuestionsTable();
        }
      });
    });
  }

  openQuestionEditor(questionData = null) {
    const modal = document.getElementById('questionEditorModal');
    const title = document.getElementById('questionEditorTitle');
    const form = document.getElementById('questionForm');
    const autoCheck = document.getElementById('qAutoExplanationCheckbox');

    form.reset();

    if (questionData) {
      title.innerText = '✏️ Edit Soal Kuis';
      document.getElementById('qEditId').value = questionData.id;
      document.getElementById('qEditCategory').value = questionData.category;
      document.getElementById('qEditQuestion').value = questionData.question;
      document.getElementById('qEditOptionA').value = questionData.optionA;
      document.getElementById('qEditOptionB').value = questionData.optionB;
      document.getElementById('qEditExplanation').value = questionData.explanation || '';

      if (questionData.correct === 'A') {
        document.getElementById('qEditCorrectA').checked = true;
      } else {
        document.getElementById('qEditCorrectB').checked = true;
      }

      if (autoCheck) {
        autoCheck.checked = !questionData.explanation || questionData.explanation.includes('Jawaban yang tepat adalah Pilihan');
      }
    } else {
      title.innerText = '➕ Tambah Soal Baru';
      document.getElementById('qEditId').value = '';
      document.getElementById('qEditCorrectA').checked = true;
      if (autoCheck) autoCheck.checked = true;
    }

    this.refreshExplanationPreview();
    modal?.classList.remove('hidden');
  }

  saveQuestionForm() {
    const idVal = document.getElementById('qEditId').value;
    const category = document.getElementById('qEditCategory').value.trim() || 'Pengetahuan Umum';
    const question = document.getElementById('qEditQuestion').value.trim();
    const optionA = document.getElementById('qEditOptionA').value.trim();
    const optionB = document.getElementById('qEditOptionB').value.trim();
    const correct = document.querySelector('input[name="qCorrect"]:checked')?.value || 'A';
    let explanation = document.getElementById('qEditExplanation').value.trim();
    const autoCheck = document.getElementById('qAutoExplanationCheckbox');

    if (!question || !optionA || !optionB) {
      alert('Mohon isi pertanyaan dan kedua pilihan jawaban!');
      return;
    }

    // Jika fitur samakan keterangan aktif ATAU kolom keterangan dikosongkan, otomatis gunakan format standar
    if (autoCheck?.checked || !explanation) {
      explanation = this.generateStandardExplanation(correct, optionA, optionB);
    }

    const qList = [...this.questions];

    if (idVal) {
      // Edit
      const id = Number(idVal);
      const idx = qList.findIndex(item => item.id === id);
      if (idx !== -1) {
        qList[idx] = { id, category, question, optionA, optionB, correct, explanation };
      }
    } else {
      // Tambah Baru
      const newId = Date.now();
      qList.push({ id: newId, category, question, optionA, optionB, correct, explanation });
    }

    this.saveQuestions(qList);
    document.getElementById('questionEditorModal')?.classList.add('hidden');
    this.renderQuestionsTable();
  }

  exportQuestionsToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "bank_soal_ular_tangga.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importQuestionsFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported) && imported.length > 0) {
          this.saveQuestions(imported);
          this.renderQuestionsTable();
          alert(`Sukses mengimpor ${imported.length} soal!`);
        } else {
          alert('Format JSON tidak valid atau kosong.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
}

// Inisialisasi Game saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
  window.snakeGame = new SnakeAndLaddersGame();
});
