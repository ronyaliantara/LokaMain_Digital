// Shared catalog & WhatsApp helper store for LokaMain Digital
// Persists in localStorage ('lokamain_store_v1') with full JSON import/export support.

(() => {
const STORAGE_KEY = 'lokamain_store_v1';

const DEFAULT_STORE = {
  settings: {
    storeName: 'LokaMain Digital',
    siteSubtitle: 'Pilih game pembelajaran digital, lalu klik tombol WhatsApp di bawahnya untuk memesan.',
    logoImage: 'assets/branding/banner-lokamain.png',
    footerText: 'Hak Cipta © 2026 LokaMain Digital. Pembelajaran Game Edukasi Interaktif.',
    footerNote: 'Semua game dapat dimainkan langsung di Smart TV, HP, Tablet, dan Komputer tanpa instalasi.',
    sellerName: 'Admin LokaMain',
    whatsappNumber: '6287881258019',
    qrisImage: 'assets/qris/qris-1793952371588.jpeg',
    qrisName: 'LokaMain_Store',
    qrisCity: '',
    qrisRawPayload: '00020101021126570011ID.DANA.WWW011893600915303673559102090367355910303UMI51440014ID.CO.QRIS.WWW0215ID10266330641950303UMI5204737253033605802ID5924LokaMain_Store, Komputer6006Gresik6105611556304DF5E',
    qrisDynamicEnabled: true,
    buyerTemplate:
      'Halo {sellerName}, saya ingin memesan game pembelajaran digital:\n\nJudul Game: {title}\nKode Tiket: {code}\nHarga: Rp {price}\n\nMohon info pembayaran untuk mendapatkan link gamenya. Terima kasih!',
    sellerTemplate:
      'Halo Kak {buyerName}, terima kasih sudah memesan di {storeName}!\n\nBerikut akses game pembelajaran digital pesanan Anda:\nJudul Game: {title} ({code})\nLink Akses Game: {gameUrl}\n\nCara Pakai:\n1. Klik link di atas melalui browser HP, tablet, atau laptop.\n2. Game langsung berjalan tanpa instalasi tambahan.\n3. Simpan link ini untuk digunakan kembali kapan saja.\n\nSelamat bermain dan belajar!'
  },
  games: [
  {
    "id": "LM-UT",
    "code": "SERI-UT",
    "title": "Ular Tangga Kinestetik - Bahasa Arab (As-Sa'ah)",
    "category": "Bahasa Arab & Kinestetik (AI Pose)",
    "grade": "SMP Kelas VIII",
    "duration": "20–30 menit",
    "device": "Smart TV, Laptop & Proyektor",
    "price": 35000,
    "image": "assets/games/game-1794134083691.gif",
    "coverImage": "assets/games/game-1793962874784.png",
    "shortDesc": "Game edukasi berbasis gerak tubuh (AI Pose) materi waktu & jam (As-Sa'ah) Bahasa Arab dengan papan ular tangga interaktif 2 pemain.",
    "howToPlay": [
      "Hubungkan laptop ke Smart TV atau proyektor kelas dan aktifkan kamera web.",
      "Pemain 1 dan Pemain 2 berdiri di depan kamera untuk melempar dadu dengan pose tubuh.",
      "Jawab soal jam dan waktu Bahasa Arab di setiap petak papan untuk memenangkan permainan."
    ],
    "learningGoals": [
      "Penguasaan kosakata bilangan jam (As-Sa'ah) Bahasa Arab tingkat SMP.",
      "Pembelajaran aktif kinestetik yang melatih motorik kasar dan fokus siswa.",
      "Meningkatkan partisipasi dan antusiasme belajar kelompok di ruang kelas."
    ],
    "gameUrl": "games/ular-tangga/",
    "sampleQuestion": "Apakah arti dari kalimat \"السَّاعَةُ الْوَاحِدَةُ\" (As-Sa'atul Wahidah)?",
    "sampleOptions": [
      "Jam satu tepat",
      "Jam dua tepat",
      "Jam tiga tepat"
    ],
    "sampleAnswer": 0
  },
  {
    "id": "LM-EK",
    "code": "SERI-EK",
    "title": "Ekspedisi Nusantara - Kapal Layar Hidung",
    "category": "IPS & Kinestetik (AI Kamera)",
    "grade": "SMP Kelas VII–IX",
    "duration": "20–30 menit",
    "device": "Smart TV, Laptop & Kamera Web",
    "price": 35000,
    "image": "assets/games/game-pulau.jpg",
    "shortDesc": "Game edukasi kuis IPS SMP interaktif dengan navigasi arah kapal menggunakan sensor gerakan hidung/wajah (AI Face Detection) di depan kamera.",
    "howToPlay": [
      "Nyalakan kamera web laptop atau hubungkan ke Smart TV kelas.",
      "Daftarkan nama 2–4 siswa pemain untuk saling berkompetisi secara bergantian.",
      "Gerakkan kepala dan hidung ke kiri/kanan untuk memilih jawaban A atau B yang benar."
    ],
    "learningGoals": [
      "Mendalami materi sejarah, kondisi geografis, dan keragaman budaya Nusantara tingkat SMP.",
      "Melatih motorik halus dan koordinasi fokus visual siswa secara aktif dan menyenangkan.",
      "Mempermudah guru mengelola kuis kelas berkat fitur Bank Soal yang fleksibel."
    ],
    "gameUrl": "games/ekspedisi-kapal/",
    "sampleQuestion": "Benua terbesar di dunia adalah...",
    "sampleOptions": [
      "Asia",
      "Afrika"
    ],
    "sampleAnswer": 0,
    "coverImage": "assets/games/game-1794142515963.png"
  }
],
  orders: []
};

function loadStore() {
  const diskData = window.LOKAMAIN_LIVE_DATA || null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw && !diskData) return structuredClone(DEFAULT_STORE);
    const localParsed = raw ? JSON.parse(raw) : null;

    // Pilih data terbaru antara file sinkronisasi (diskData) dan localStorage
    const diskTime = Number(diskData?.updatedAt || 0);
    const localTime = Number(localParsed?.updatedAt || 0);
    const diskCleaned = diskData && Array.isArray(diskData.games) && Array.isArray(localParsed?.games) && diskData.games.length < localParsed.games.length;
    const source = (diskTime >= localTime || diskCleaned) && diskData ? diskData : (localParsed || diskData || DEFAULT_STORE);

    return {
      updatedAt: Math.max(diskTime, localTime, 1),
      settings: { ...DEFAULT_STORE.settings, ...(source.settings || {}) },
      games: Array.isArray(source.games) && source.games.length ? source.games : structuredClone(DEFAULT_STORE.games),
      orders: Array.isArray(source.orders) ? source.orders : structuredClone(DEFAULT_STORE.orders)
    };
  } catch {
    if (diskData) {
      return {
        updatedAt: diskData.updatedAt || Date.now(),
        settings: { ...DEFAULT_STORE.settings, ...(diskData.settings || {}) },
        games: Array.isArray(diskData.games) ? diskData.games : structuredClone(DEFAULT_STORE.games),
        orders: structuredClone(DEFAULT_STORE.orders)
      };
    }
    return structuredClone(DEFAULT_STORE);
  }
}

function saveStore(store) {
  store.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.LOKAMAIN_LIVE_DATA = store;
  window.dispatchEvent(new CustomEvent('lokamain:updated', { detail: store }));
}

function resetStore() {
  localStorage.removeItem(STORAGE_KEY);
  const fresh = structuredClone(DEFAULT_STORE);
  window.dispatchEvent(new CustomEvent('lokamain:updated', { detail: fresh }));
  return fresh;
}

function formatIdr(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('id-ID');
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

function resolveFullGameUrl(gameUrl) {
  if (!gameUrl) return '';
  if (/^https?:\/\//i.test(gameUrl)) return gameUrl;
  try {
    return new URL(gameUrl, window.location.href).href;
  } catch {
    return gameUrl;
  }
}

function buildBuyerMessage(game, settings) {
  const tpl = settings?.buyerTemplate || DEFAULT_STORE.settings.buyerTemplate;
  return tpl
    .replace(/\{sellerName\}/g, settings?.sellerName || 'Admin')
    .replace(/\{storeName\}/g, settings?.storeName || 'LokaMain Digital')
    .replace(/\{title\}/g, game.title)
    .replace(/\{code\}/g, game.code || game.id)
    .replace(/\{price\}/g, formatIdr(game.price));
}

function buildBuyerWhatsAppUrl(game, settings) {
  const phone = normalizePhone(settings?.whatsappNumber || DEFAULT_STORE.settings.whatsappNumber);
  const text = encodeURIComponent(buildBuyerMessage(game, settings));
  return `https://wa.me/${phone}?text=${text}`;
}

function buildSellerReplyText(game, buyerName, settings) {
  const tpl = settings?.sellerTemplate || DEFAULT_STORE.settings.sellerTemplate;
  const fullLink = resolveFullGameUrl(game.gameUrl);
  return tpl
    .replace(/\{buyerName\}/g, (buyerName || 'Pembeli').trim() || 'Pembeli')
    .replace(/\{storeName\}/g, settings?.storeName || 'LokaMain Digital')
    .replace(/\{title\}/g, game.title)
    .replace(/\{code\}/g, game.code || game.id)
    .replace(/\{price\}/g, formatIdr(game.price))
    .replace(/\{gameUrl\}/g, fullLink);
}

function buildSellerWhatsAppUrl(game, buyerPhone, buyerName, settings) {
  const cleanPhone = normalizePhone(buyerPhone);
  const text = encodeURIComponent(buildSellerReplyText(game, buyerName, settings));
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

window.LokaStore = {
  DEFAULT_STORE,
  loadStore,
  saveStore,
  resetStore,
  formatIdr,
  normalizePhone,
  resolveFullGameUrl,
  buildBuyerMessage,
  buildBuyerWhatsAppUrl,
  buildSellerReplyText,
  buildSellerWhatsAppUrl
};
})();

