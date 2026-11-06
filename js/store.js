// Shared catalog & WhatsApp helper store for LokaMain Digital
// Persists in localStorage ('lokamain_store_v1') with full JSON import/export support.

(() => {
const STORAGE_KEY = 'lokamain_store_v1';

const DEFAULT_STORE = {
  settings: {
    storeName: 'LokaMain Digital',
    siteSubtitle: '',
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
      id: 'LM-A',
      code: 'SERI-A',
      title: 'Hitung Cepat Pasar',
      category: 'Matematika & Logika',
      grade: 'SD Kelas 1–4',
      duration: '20 menit',
      device: 'HP, Laptop & Proyektor',
      price: 29000,
      image: 'assets/games/game-pasar.jpg',
      shortDesc:
        'Latihan berhitung uang rupiah, kombinasi koin, dan kembalian belanja lewat simulasi kios mainan pasar malam.',
      howToPlay: [
        'Siswa melihat harga mainan tradisional yang tampil pada layar kios pasar malam.',
        'Pilih kombinasi pecahan uang dan koin yang jumlahnya tepat sesuai target harga.',
        'Kumpulkan tiket bintang dari setiap transaksi yang tepat sebelum waktu habis.'
      ],
      learningGoals: [
        'Penjumlahan dan pengurangan bilangan bulat dalam konteks nilai mata uang rupiah.',
        'Pengenalan kombinasi pecahan uang kertas dan logam sehari-hari.',
        'Ketelitian berhitung cepat untuk aktivitas literasi finansial dasar.'
      ],
      gameUrl: 'play.html?id=LM-A',
      sampleQuestion:
        'Harga Gasing Kayu Rp 12.000 dan Layangan Rp 5.500. Berapa total uang pas yang harus dibayar?',
      sampleOptions: ['Rp 16.500', 'Rp 17.500', 'Rp 18.000'],
      sampleAnswer: 1
    },
    {
      id: 'LM-B',
      code: 'SERI-B',
      title: 'Susun Kata Nusantara',
      category: 'Bahasa & Budaya',
      grade: 'TK B & SD Kelas 1–3',
      duration: '15 menit',
      device: 'Layar Sentuh & Laptop',
      price: 25000,
      image: 'assets/games/game-kata.jpg',
      shortDesc:
        'Permainan merangkai suku kata bahasa Indonesia dan melengkapi kalimat cerita pendek bertema keseharian.',
      howToPlay: [
        'Baca kalimat cerita rumpang beserta ilustrasi petunjuk di bagian atas layar.',
        'Ketuk kepingan suku kata secara berurutan hingga membentuk kosakata yang utuh.',
        'Buka halaman cerita berikutnya setelah tiga kalimat berhasil dilengkapi.'
      ],
      learningGoals: [
        'Pemenggalan suku kata dan kelancaran membaca permulaan.',
        'Pengayaan kosakata benda, tempat, dan aktivitas di Indonesia.',
        'Pemahaman kalimat sederhana dalam bacaan pendek.'
      ],
      gameUrl: 'play.html?id=LM-B',
      sampleQuestion:
        'Susun suku kata berikut agar menjadi tempat kapal bersandar: BU - PE - HAN - LA',
      sampleOptions: ['PE - LA - BU - HAN', 'LA - BU - PE - HAN', 'PE - BU - LA - HAN'],
      sampleAnswer: 0
    },
    {
      id: 'LM-C',
      code: 'SERI-C',
      title: 'Rantai Makanan Rimba',
      category: 'Sains & Alam',
      grade: 'SD Kelas 4–6',
      duration: '25 menit',
      device: 'Laptop, Tablet & IFP Kelas',
      price: 35000,
      image: 'assets/games/game-rimba.jpg',
      shortDesc:
        'Simulasi interaktif menyusun peran produsen, konsumen, dan pengurai pada ekosistem sawah, sungai, dan hutan.',
      howToPlay: [
        'Pilih satu dari tiga habitat belajar: ekosistem sawah, hutan hujan, atau pesisir laut.',
        'Pasangkan makhluk hidup ke posisi produsen, konsumen tingkat pertama, hingga puncak.',
        'Uji keseimbangan ekosistem dan amati apa yang terjadi bila satu populasi berkurang.'
      ],
      learningGoals: [
        'Memahami alur perpindahan energi dalam rantai dan jaring-jaring makanan.',
        'Membedakan peran organisme produsen, herbivora, karnivora, dan dekomposer.',
        'Melatih penalaran sebab-akibat pada keseimbangan lingkungan.'
      ],
      gameUrl: 'play.html?id=LM-C',
      sampleQuestion:
        'Pada ekosistem sawah (Padi -> Belalang -> Katak -> Ular), makhluk hidup manakah yang berperan sebagai Konsumen Tingkat I?',
      sampleOptions: ['Padi', 'Belalang', 'Katak'],
      sampleAnswer: 1
    },
    {
      id: 'LM-D',
      code: 'SERI-D',
      title: 'Labirin Logika Robot',
      category: 'Matematika & Logika',
      grade: 'SD Kelas 3–6 & SMP',
      duration: '25 menit',
      device: 'HP, Tablet & Laptop',
      price: 39000,
      image: 'assets/games/game-robot.jpg',
      shortDesc:
        'Pengenalan berpikir komputasional dan algoritma dasar dengan menyusun blok langkah arah untuk mengantar robot.',
      howToPlay: [
        'Amati peta kotak labirin dan posisi awal robot menuju titik baterai di ujung lintasan.',
        'Susun urutan kartu instruksi Maju, Belok Kanan, Belok Kiri, dan Ulangi pada panel perintah.',
        'Tekan tombol Jalankan untuk melihat robot bergerak mengikuti algoritma yang disusun.'
      ],
      learningGoals: [
        'Dasar berpikir komputasional (urutan instruksi, pola, dan koreksi langkah).',
        'Orientasi ruang, arah mata angin, dan koordinat petak sederhana.',
        'Pemecahan masalah bertahap dengan jumlah langkah paling efisien.'
      ],
      gameUrl: 'play.html?id=LM-D',
      sampleQuestion:
        'Robot menghadap ke Timur. Jika diberi perintah: Maju 2 petak, lalu Belok Kanan, ke arah manakah robot menghadap sekarang?',
      sampleOptions: ['Utara', 'Selatan', 'Barat'],
      sampleAnswer: 1
    },
    {
      id: 'LM-E',
      code: 'SERI-E',
      title: 'Peta Pulau Indonesia',
      category: 'Bahasa & Budaya',
      grade: 'SD Kelas 3–6 & SMP',
      duration: '20 menit',
      device: 'Proyektor Kelas & HP',
      price: 32000,
      image: 'assets/games/game-pulau.jpg',
      shortDesc:
        'Eksplorasi peta kepulauan Nusantara untuk menebak provinsi, rumah adat, alat musik, dan satwa endemik.',
      howToPlay: [
        'Kartu tantangan menampilkan petunjuk budaya, rumah adat, atau satwa khas daerah.',
        'Ketuk pulau dan wilayah provinsi yang tepat pada peta interaktif Indonesia.',
        'Mainkan mode beregu di depan kelas untuk adu cepat antar kelompok belajar.'
      ],
      learningGoals: [
        'Mengenal letak geografis pulau-pulau besar dan provinsi di Indonesia.',
        'Menghafal keragaman rumah adat, pakaian tradisional, dan flora-fauna Nusantara.',
        'Meningkatkan kolaborasi siswa melalui kuis peta interaktif di kelas.'
      ],
      gameUrl: 'play.html?id=LM-E',
      sampleQuestion:
        'Rumah adat Betang dan satwa Orangutan berasal dari pulau manakah pada peta Indonesia?',
      sampleOptions: ['Pulau Kalimantan', 'Pulau Sulawesi', 'Pulau Sumatera'],
      sampleAnswer: 0
    },
    {
      id: 'LM-F',
      code: 'SERI-F',
      title: 'Kosakata Ruang Kelas',
      category: 'Bahasa & Budaya',
      grade: 'TK & SD Kelas 1–4',
      duration: '15 menit',
      device: 'HP, Tablet & Laptop',
      price: 25000,
      image: 'assets/games/game-kelas.jpg',
      shortDesc:
        'Permainan kartu memori dan pencocokan gambar benda di sekolah dalam Bahasa Inggris dan Bahasa Indonesia.',
      howToPlay: [
        'Buka dua kartu tertutup pada papan kelas untuk mencari pasangan kata Inggris dan gambarnya.',
        'Dengarkan pelafalan kosakata dan pilih arti Bahasa Indonesia yang sesuai.',
        'Selesaikan seluruh papan kartu dengan jumlah langkah paling sedikit.'
      ],
      learningGoals: [
        'Menguasai 40 kosakata Bahasa Inggris dasar bertema sekolah dan ruang kelas.',
        'Melatih daya ingat visual serta asosiasi kata dengan benda nyata.',
        'Membangun kepercayaan diri anak menyebutkan benda sekitar dalam Bahasa Inggris.'
      ],
      gameUrl: 'play.html?id=LM-F',
      sampleQuestion:
        'Benda di depan kelas yang digunakan guru untuk menulis disebut apa dalam Bahasa Inggris?',
      sampleOptions: ['Bookshelf', 'Blackboard', 'Schoolbag'],
      sampleAnswer: 1
    }
  ],
  orders: [
    {
      id: 'ORD-104',
      date: '2026-11-05 19:40',
      buyerName: 'Ibu Ratna (SDN 3 Sleman)',
      buyerPhone: '6281398765432',
      gameId: 'LM-A',
      gameTitle: 'Hitung Cepat Pasar',
      amount: 29000,
      status: 'Menunggu Link'
    },
    {
      id: 'ORD-103',
      date: '2026-11-05 18:15',
      buyerName: 'Pak Hendra (Guru Kelas 5)',
      buyerPhone: '6285711223344',
      gameId: 'LM-C',
      gameTitle: 'Rantai Makanan Rimba',
      amount: 35000,
      status: 'Link Terkirim'
    },
    {
      id: 'ORD-102',
      date: '2026-11-05 15:20',
      buyerName: 'Kak Dinda (Wali Murid)',
      buyerPhone: '6281233445566',
      gameId: 'LM-B',
      gameTitle: 'Susun Kata Nusantara',
      amount: 25000,
      status: 'Link Terkirim'
    },
    {
      id: 'ORD-101',
      date: '2026-11-05 11:05',
      buyerName: 'Ibu Sari (SD Tunas Harapan)',
      buyerPhone: '6282199887766',
      gameId: 'LM-E',
      gameTitle: 'Peta Pulau Indonesia',
      amount: 32000,
      status: 'Link Terkirim'
    }
  ]
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
    const source = diskTime >= localTime && diskData ? diskData : (localParsed || diskData || DEFAULT_STORE);

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

