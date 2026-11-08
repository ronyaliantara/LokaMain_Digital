/**
 * ==========================================================================
 * app.js - Engine Ular Tangga Kinestetik IPS SMP (50 Kotak - 4 Pemain)
 * Super Ringan, Performa Halus (Cached Board Rendering ~60 FPS),
 * Hukuman Ular Interaktif (Jongkok + Hukuman Seru), dan Dashboard Guru Tanpa Link Pembeli.
 * ==========================================================================
 */

// Helper HTML escaping untuk tabel guru
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Bank Soal Bawaan: 50 Soal IPS SMP (Kurikulum Merdeka / SMP Kelas 7, 8, 9)
const DEFAULT_QUESTIONS = [
  {
    "id": 1,
    "category": "Geografi Indonesia",
    "question": "Berdasarkan letak astronomisnya, wilayah Indonesia terletak di antara...",
    "optionA": "6° LU - 11° LS dan 95° BT - 141° BT",
    "optionB": "11° LU - 6° LS dan 90° BT - 135° BT",
    "correct": "A",
    "explanation": "Letak astronomis Indonesia adalah 6° Lintang Utara - 11° Lintang Selatan dan 95° Bujur Timur - 141° Bujur Timur."
  },
  {
    "id": 2,
    "category": "Geografi Indonesia",
    "question": "Secara geografis, kepulauan Indonesia berada di antara dua benua, yaitu...",
    "optionA": "Benua Eropa dan Benua Afrika",
    "optionB": "Benua Asia dan Benua Australia",
    "correct": "B",
    "explanation": "Indonesia terletak di posisi silang strategis antara Benua Asia di sebelah utara dan Benua Australia di sebelah selatan."
  },
  {
    "id": 3,
    "category": "Geografi Indonesia",
    "question": "Indonesia beriklim tropis karena dilalui garis khatulistiwa. Dua musim di Indonesia adalah musim...",
    "optionA": "Kemarau dan Penghujan",
    "optionB": "Panas dan Musim Dingin Berbatu",
    "correct": "A",
    "explanation": "Iklim tropis Indonesia memiliki dua musim bergantian setiap enam bulan sekali: musim hujan dan musim kemarau."
  },
  {
    "id": 4,
    "category": "Geografi Indonesia",
    "question": "Garis khayal yang memisahkan persebaran fauna Asiatis (barat) dengan fauna Peralihan (tengah) adalah...",
    "optionA": "Garis Weber",
    "optionB": "Garis Wallace",
    "correct": "B",
    "explanation": "Garis Wallace membatasi fauna barat (Asiatis seperti gajah, harimau) dengan fauna kepulauan tengah (Peralihan)."
  },
  {
    "id": 5,
    "category": "Geografi Indonesia",
    "question": "Garis khayal yang memisahkan daerah fauna tipe Peralihan dengan tipe Australis (Papua & Maluku) adalah...",
    "optionA": "Garis Weber",
    "optionB": "Garis Khatulistiwa",
    "correct": "A",
    "explanation": "Garis Weber memisahkan fauna wilayah Peralihan (Sulawesi, Nusa Tenggara) dengan fauna Australis (Papua)."
  },
  {
    "id": 6,
    "category": "Geografi Indonesia",
    "question": "Hewan reptil purba endemik Indonesia yang hanya hidup di kawasan Kepulauan Nusa Tenggara adalah...",
    "optionA": "Bekantan",
    "optionB": "Komodo",
    "correct": "B",
    "explanation": "Komodo (Varanus komodoensis) adalah kadal raksasa endemik tipe fauna Peralihan yang dilindungi di Pulau Komodo NTT."
  },
  {
    "id": 7,
    "category": "Geografi Dunia",
    "question": "Benua terluas di dunia yang juga memiliki jumlah penduduk terbanyak adalah Benua...",
    "optionA": "Benua Asia",
    "optionB": "Benua Amerika",
    "correct": "A",
    "explanation": "Benua Asia adalah benua terbesar di bumi dengan luas sekitar 44,58 juta km² dan dihuni lebih dari separuh populasi dunia."
  },
  {
    "id": 8,
    "category": "Geografi Dunia",
    "question": "Samudera terluas di permukaan bumi yang menutupi sepertiga luas dunia adalah Samudera...",
    "optionA": "Samudera Atlantik",
    "optionB": "Samudera Pasifik",
    "correct": "B",
    "explanation": "Samudera Pasifik membentang luas dari Asia/Australia hingga benua Amerika dan merupakan samudera terbesar di bumi."
  },
  {
    "id": 9,
    "category": "Geografi Indonesia",
    "question": "Daratan sempit yang menjorok masuk ke arah laut disebut...",
    "optionA": "Tanjung",
    "optionB": "Teluk",
    "correct": "A",
    "explanation": "Tanjung adalah daratan yang menjorok ke laut, sedangkan perairan laut yang menjorok masuk ke daratan disebut teluk."
  },
  {
    "id": 10,
    "category": "Peta & Pemetaan",
    "question": "Keterangan pada peta yang membandingkan jarak di gambar peta dengan jarak sebenarnya adalah...",
    "optionA": "Simbol Peta",
    "optionB": "Skala Peta",
    "correct": "B",
    "explanation": "Skala peta menunjukkan rasio perbandingan jarak pada peta terhadap jarak nyata di permukaan bumi (misal 1:100.000)."
  },
  {
    "id": 11,
    "category": "Kawasan ASEAN",
    "question": "Organisasi geopolitik negara-negara Asia Tenggara (ASEAN) didirikan pada 8 Agustus 1967 melalui...",
    "optionA": "Deklarasi Bangkok",
    "optionB": "Perjanjian Renville",
    "correct": "A",
    "explanation": "Deklarasi Bangkok ditandatangani di Thailand oleh lima menteri luar negeri negara pendiri ASEAN."
  },
  {
    "id": 12,
    "category": "Kawasan ASEAN",
    "question": "Tokoh menteri luar negeri Indonesia yang menjadi penandatangan Deklarasi Bangkok adalah...",
    "optionA": "Mohammad Natsir",
    "optionB": "Adam Malik",
    "correct": "B",
    "explanation": "H. Adam Malik adalah Menteri Luar Negeri Republik Indonesia yang mewakili Indonesia saat berdirinya ASEAN tahun 1967."
  },
  {
    "id": 13,
    "category": "Kawasan ASEAN",
    "question": "Negara anggota ASEAN yang tidak pernah dijajah oleh bangsa Barat manapun adalah...",
    "optionA": "Thailand",
    "optionB": "Vietnam",
    "correct": "A",
    "explanation": "Thailand berhasil menjaga kemerdekaannya melalui jalur diplomasi modern dan berfungsi sebagai daerah penyangga kolonial."
  },
  {
    "id": 14,
    "category": "Kawasan ASEAN",
    "question": "Satu-satunya negara di Asia Tenggara yang tidak memiliki batas garis pantai (landlocked) adalah...",
    "optionA": "Myanmar",
    "optionB": "Laos",
    "correct": "B",
    "explanation": "Laos adalah satu-satunya negara di Asia Tenggara yang daratannya sepenuhnya terkepung oleh negara tetangga."
  },
  {
    "id": 15,
    "category": "Kawasan ASEAN",
    "question": "Selat di Asia Tenggara yang menjadi salah satu jalur pelayaran internasional terpadat di dunia adalah...",
    "optionA": "Selat Malaka",
    "optionB": "Selat Karimata",
    "correct": "A",
    "explanation": "Selat Malaka menghubungkan perniagaan antara Samudera Hindia dan Laut Cina Selatan menuju Samudera Pasifik."
  },
  {
    "id": 16,
    "category": "Sejarah Indonesia",
    "question": "Zaman kehidupan manusia sebelum mengenal tulisan dan aksara dinamakan zaman...",
    "optionA": "Megalitikum Modern",
    "optionB": "Praaksara",
    "correct": "B",
    "explanation": "Masa praaksara adalah masa di mana kehidupan manusia belum mengenal bentuk tulisan apapun untuk berkomunikasi."
  },
  {
    "id": 17,
    "category": "Sejarah Hindu-Buddha",
    "question": "Kerajaan Hindu tertua di Indonesia yang dibuktikan dengan adanya tujuh prasasti Yupa adalah...",
    "optionA": "Kerajaan Kutai Martadipura",
    "optionB": "Kerajaan Majapahit",
    "correct": "A",
    "explanation": "Kerajaan Kutai di Kalimantan Timur berdiri sekitar abad ke-4 M dengan raja terkenalnya bernama Mulawarman."
  },
  {
    "id": 18,
    "category": "Sejarah Hindu-Buddha",
    "question": "Kerajaan maritim bercorak Buddha yang menjadi pusat pembelajaran agama Buddha internasional adalah...",
    "optionA": "Kerajaan Singasari",
    "optionB": "Kerajaan Sriwijaya",
    "correct": "B",
    "explanation": "Sriwijaya berpusat di Palembang dan tersohor ke Tiongkok serta India sebagai pusat kajian ajaran Buddha dan armada laut terkuat."
  },
  {
    "id": 19,
    "category": "Sejarah Hindu-Buddha",
    "question": "Kemegahan Candi Borobudur dibangun pada abad ke-8 Masehi oleh Kerajaan Mataram Kuno di bawah Dinasti...",
    "optionA": "Dinasti Syailendra",
    "optionB": "Dinasti Sanjaya",
    "correct": "A",
    "explanation": "Dinasti Syailendra yang bercorak Buddha Mahayana membangun Candi Borobudur yang menjadi mahakarya warisan dunia UNESCO."
  },
  {
    "id": 20,
    "category": "Sejarah Hindu-Buddha",
    "question": "Sumpah sakral yang diucapkan Patih Gajah Mada untuk mempersatukan wilayah Nusantara bernama...",
    "optionA": "Piagam Jakarta",
    "optionB": "Sumpah Palapa",
    "correct": "B",
    "explanation": "Gajah Mada bersumpah Palapa di hadapan Ratu Tribhuwana Tunggadewi untuk mempersatukan segenap kepulauan Nusantara."
  },
  {
    "id": 21,
    "category": "Sejarah Islam",
    "question": "Kerajaan bercorak Islam pertama di Indonesia yang berada di wilayah pesisir timur Aceh adalah...",
    "optionA": "Samudera Pasai",
    "optionB": "Kesultanan Banten",
    "correct": "A",
    "explanation": "Kerajaan Samudera Pasai didirikan oleh Sultan Malik As-Saleh pada akhir abad ke-13 dan menjadi pusat penyebaran Islam."
  },
  {
    "id": 22,
    "category": "Sejarah Kolonial",
    "question": "Bangsa Barat pertama yang berhasil menaklukkan Malaka pada tahun 1511 demi rempah-rempah adalah...",
    "optionA": "Bangsa Inggris",
    "optionB": "Bangsa Portugis",
    "correct": "B",
    "explanation": "Armada Portugis di bawah pimpinan Afonso de Albuquerque menguasai bandar niaga Malaka pada tahun 1511."
  },
  {
    "id": 23,
    "category": "Pergerakan Nasional",
    "question": "Hari Kebangkitan Nasional diperingati setiap 20 Mei untuk mengenang berdirinya organisasi...",
    "optionA": "Budi Utomo",
    "optionB": "Indische Partij",
    "correct": "A",
    "explanation": "Budi Utomo berdiri pada 20 Mei 1908 dan menjadi pelopor gerakan modern kaum intelektual memperjuangkan kemerdekaan."
  },
  {
    "id": 24,
    "category": "Pergerakan Nasional",
    "question": "Ikrar persatuan pemuda 'Satu Nusa, Satu Bangsa, dan Satu Bahasa' dideklarasikan pada...",
    "optionA": "17 Agustus 1945",
    "optionB": "28 Oktober 1928",
    "correct": "B",
    "explanation": "Kongres Pemuda II pada 28 Oktober 1928 melahirkan ikrar Sumpah Pemuda yang menjadi pemersatu bangsa Indonesia."
  },
  {
    "id": 25,
    "category": "Kemerdekaan RI",
    "question": "Tokoh pemuda yang mengetik naskah resmi teks Proklamasi Kemerdekaan Indonesia adalah...",
    "optionA": "Sayuti Melik",
    "optionB": "Chairul Saleh",
    "correct": "A",
    "explanation": "Sayuti Melik menyempurnakan dan mengetik naskah proklamasi yang disusun oleh Soekarno, Hatta, dan Achmad Soebardjo."
  },
  {
    "id": 26,
    "category": "Kemerdekaan RI",
    "question": "Proklamasi Kemerdekaan 17 Agustus 1945 dibacakan langsung oleh Ir. Soekarno di jalan...",
    "optionA": "Kramat Raya No. 106",
    "optionB": "Pegangsaan Timur No. 56",
    "correct": "B",
    "explanation": "Pembacaan proklamasi berlangsung di halaman rumah Bung Karno di Jalan Pegangsaan Timur No. 56 Jakarta pukul 10 pagi."
  },
  {
    "id": 27,
    "category": "Kemerdekaan RI",
    "question": "Peristiwa membawa Bung Karno dan Hatta ke Rengasdengklok bertujuan untuk...",
    "optionA": "Menjauhkan dari pengaruh Jepang agar segera merdeka",
    "optionB": "Menyerahkan kekuasaan kepada pihak sekutu",
    "correct": "A",
    "explanation": "Para pemuda ingin memastikan proklamasi lahir murni dari perjuangan bangsa Indonesia tanpa janji kemerdekaan dari Jepang."
  },
  {
    "id": 28,
    "category": "Kemerdekaan RI",
    "question": "Sosok pahlawan wanita yang menjahit Bendera Pusaka Sang Saka Merah Putih pertama kali adalah...",
    "optionA": "Cut Nyak Dien",
    "optionB": "Ibu Fatmawati",
    "correct": "B",
    "explanation": "Ibu Fatmawati menjahit kain merah dan putih yang dikibarkan saat proklamasi 17 Agustus 1945 oleh Latief Hendraningrat."
  },
  {
    "id": 29,
    "category": "Perjuangan Kemerdekaan",
    "question": "Pertempuran sengit mempertahankan kemerdekaan di Surabaya pada 10 November 1945 diperingati sebagai...",
    "optionA": "Hari Pahlawan",
    "optionB": "Hari Kesaktian Pancasila",
    "correct": "A",
    "explanation": "Tanggal 10 November diperingati sebagai Hari Pahlawan untuk menghormati pengorbanan pejuang rakyat Surabaya di bawah Bung Tomo."
  },
  {
    "id": 30,
    "category": "Pahlawan Nasional",
    "question": "Pemimpin perjuangan rakyat Maluku melawan penjajah Belanda yang bernama asli Thomas Matulessy adalah...",
    "optionA": "Sultan Hasanuddin",
    "optionB": "Kapitan Pattimura",
    "correct": "B",
    "explanation": "Kapitan Pattimura memimpin perlawanan bersenjata merebut Benteng Duurstede di Saparua Maluku pada tahun 1817."
  },
  {
    "id": 31,
    "category": "Sosiologi SMP",
    "question": "Hubungan timbal balik yang dinamis antara individu dengan individu, atau kelompok masyarakat disebut...",
    "optionA": "Interaksi Sosial",
    "optionB": "Pengendalian Sosial",
    "correct": "A",
    "explanation": "Interaksi sosial merupakan syarat utama terjadinya aktivitas sosial dalam kehidupan bermasyarakat."
  },
  {
    "id": 32,
    "category": "Sosiologi SMP",
    "question": "Interaksi sosial yang bersifat mempererat hubungan, persatuan, dan kebersamaan dinamakan proses...",
    "optionA": "Disosiatif",
    "optionB": "Asosiatif",
    "correct": "B",
    "explanation": "Bentuk asosiatif mencakup kerja sama (kooperasi), akomodasi (penyelesaian konflik), dan asimilasi budaya."
  },
  {
    "id": 33,
    "category": "Sosiologi SMP",
    "question": "Proses interaksi sosial yang mengarah pada pertentangan, perselisihan, atau perpecahan disebut proses...",
    "optionA": "Disosiatif",
    "optionB": "Integratif",
    "correct": "A",
    "explanation": "Bentuk disosiatif menimbulkan kerenggangan seperti persaingan tidak sehat, kontravensi, dan pertikaian (konflik)."
  },
  {
    "id": 34,
    "category": "Sosiologi SMP",
    "question": "Aturan bertindak yang bersumber dari bisikan hati nurani manusia mengenai hal terpuji dan tercela adalah norma...",
    "optionA": "Kesopanan",
    "optionB": "Kesusilaan",
    "correct": "B",
    "explanation": "Norma kesusilaan berpijak pada suara hati moral manusia; pelanggarannya membuahkan rasa malu dan penyesalan mendalam."
  },
  {
    "id": 35,
    "category": "Sosiologi SMP",
    "question": "Norma dalam masyarakat yang memiliki sanksi paling tegas, mengikat, dan dipaksakan oleh penegak hukum adalah...",
    "optionA": "Norma Hukum",
    "optionB": "Norma Adat Istiadat",
    "correct": "A",
    "explanation": "Norma hukum dibuat oleh negara melalui perundang-undangan dengan sanksi pidana atau denda yang pasti."
  },
  {
    "id": 36,
    "category": "Sosiologi SMP",
    "question": "Lembaga sosial pertama dan utama yang menjalankan sosialisasi primer dalam membentuk akhlak anak adalah...",
    "optionA": "Lembaga Ekonomi",
    "optionB": "Lembaga Keluarga",
    "correct": "B",
    "explanation": "Keluarga merupakan lingkungan pertama tempat anak belajar bahasa, norma, kasih sayang, dan budi pekerti luhur."
  },
  {
    "id": 37,
    "category": "Sosiologi SMP",
    "question": "Perpindahan kedudukan sosial seseorang ke lapisan sosial yang lebih tinggi dalam masyarakat disebut mobilitas...",
    "optionA": "Vertikal Naik (Social Climbing)",
    "optionB": "Horizontal Sejajar",
    "correct": "A",
    "explanation": "Mobilitas vertikal naik terjadi saat seseorang berhasil menaikkan status ekonominya, misalnya melalui pendidikan atau prestasi kerja."
  },
  {
    "id": 38,
    "category": "Keragaman Budaya",
    "question": "Rumah adat khas Minangkabau yang beratap runcing menyerupai tanduk kerbau dinamakan...",
    "optionA": "Rumah Joglo",
    "optionB": "Rumah Gadang",
    "correct": "B",
    "explanation": "Rumah Gadang dari Sumatera Barat memiliki atap melengkung runcing ke atas (gonjong) yang sarat makna falsafah Minang."
  },
  {
    "id": 39,
    "category": "Keragaman Budaya",
    "question": "Upacara adat pembakaran jenazah sakral umat Hindu di Bali untuk menyucikan roh leluhur dinamakan...",
    "optionA": "Upacara Ngaben",
    "optionB": "Upacara Rambu Solo",
    "correct": "A",
    "explanation": "Ngaben adalah upacara pembakaran jenazah di Bali untuk mengembalikan raga manusia ke asal unsur alam (Panca Maha Bhuta)."
  },
  {
    "id": 40,
    "category": "Sosiologi SMP",
    "question": "Sikap saling menghormati dan menghargai keragaman suku, agama, dan adat di Indonesia mencerminkan sikap...",
    "optionA": "Primordialisme Negatif",
    "optionB": "Toleransi",
    "correct": "B",
    "explanation": "Toleransi adalah kunci keharmonisan bangsa majemuk Indonesia sesuai semboyan luhur Bhinneka Tunggal Ika."
  },
  {
    "id": 41,
    "category": "Ekonomi SMP",
    "question": "Kebutuhan manusia yang mutlak harus dipenuhi agar dapat bertahan hidup (makanan, pakaian, rumah) disebut...",
    "optionA": "Kebutuhan Primer",
    "optionB": "Kebutuhan Tersier",
    "correct": "A",
    "explanation": "Kebutuhan primer merupakan kebutuhan dasar biologis yang tidak dapat diabaikan keberadaannya."
  },
  {
    "id": 42,
    "category": "Ekonomi SMP",
    "question": "Kondisi di mana kebutuhan manusia tak terbatas namun barang dan jasa yang tersedia jumlahnya terbatas disebut...",
    "optionA": "Kemakmuran Berlebih",
    "optionB": "Kelangkaan (Scarcity)",
    "correct": "B",
    "explanation": "Kelangkaan adalah inti masalah ekonomi yang mendorong manusia melakukan pilihan terbaik dalam mengelola sumber daya."
  },
  {
    "id": 43,
    "category": "Ekonomi SMP",
    "question": "Dorongan atau alasan dalam diri seseorang untuk melakukan tindakan ekonomi tertentu disebut...",
    "optionA": "Motif Ekonomi",
    "optionB": "Politik Fiskal",
    "correct": "A",
    "explanation": "Motif ekonomi bisa berupa keinginan bertahan hidup, mencari keuntungan, memperoleh penghargaan, atau menolong sesama."
  },
  {
    "id": 44,
    "category": "Ekonomi SMP",
    "question": "Pedoman bertindak secara rasional untuk mendapatkan hasil maksimal dengan pengorbanan tertentu dinamakan...",
    "optionA": "Biaya Peluang Semu",
    "optionB": "Prinsip Ekonomi",
    "correct": "B",
    "explanation": "Prinsip ekonomi mengajarkan pemanfaatan sumber daya secara hemat dan efisien untuk hasil yang optimal."
  },
  {
    "id": 45,
    "category": "Ekonomi SMP",
    "question": "Jumlah barang atau jasa yang ingin dibeli oleh konsumen pada berbagai tingkat harga tertentu disebut...",
    "optionA": "Permintaan (Demand)",
    "optionB": "Penawaran (Supply)",
    "correct": "A",
    "explanation": "Permintaan mencerminkan daya beli dan keinginan konsumen untuk memperoleh komoditas pada tingkat harga di pasar."
  },
  {
    "id": 46,
    "category": "Ekonomi SMP",
    "question": "Sesuai hukum permintaan, jika harga suatu barang mengalami lonjakan kenaikan, maka jumlah permintaan akan...",
    "optionA": "Meningkat Drastis",
    "optionB": "Menurun / Berkurang",
    "correct": "B",
    "explanation": "Hukum permintaan: jika harga naik, jumlah barang yang diminta turun; jika harga turun, jumlah yang diminta naik."
  },
  {
    "id": 47,
    "category": "Ekonomi SMP",
    "question": "Sesuai hukum penawaran, apabila harga jual suatu barang naik, maka jumlah barang yang ditawarkan pedagang akan...",
    "optionA": "Meningkat / Bertambah",
    "optionB": "Menurun Menjadi Nol",
    "correct": "A",
    "explanation": "Pedagang bersemangat menjual lebih banyak barang ketika harga tinggi guna mendulang laba yang lebih besar."
  },
  {
    "id": 48,
    "category": "Ekonomi SMP",
    "question": "Kegiatan menjual komoditas atau produk olahan dari dalam negeri ke pasar mancanegara disebut kegiatan...",
    "optionA": "Impor",
    "optionB": "Ekspor",
    "correct": "B",
    "explanation": "Ekspor menghasilkan devisa bagi kas negara melalui penjualan produk lokal ke konsumen di luar negeri."
  },
  {
    "id": 49,
    "category": "Ekonomi SMP",
    "question": "Pelaku ekonomi yang bertugas mengonsumsi produk sekaligus menyewakan faktor produksi (tenaga kerja, tanah) adalah...",
    "optionA": "Rumah Tangga Konsumen (RTK)",
    "optionB": "Rumah Tangga Produsen (RTP)",
    "correct": "A",
    "explanation": "RTK menyumbangkan faktor produksi kepada perusahaan dan menggunakan balas jasanya (gaji, sewa) untuk belanja kebutuhan."
  },
  {
    "id": 50,
    "category": "Ekonomi SMP",
    "question": "Uang tunai fisik berupa uang kertas dan uang logam resmi yang diterbitkan Bank Indonesia disebut...",
    "optionA": "Uang Giral",
    "optionB": "Uang Kartal",
    "correct": "B",
    "explanation": "Uang kartal adalah alat pembayaran tunai yang wajib diterima, sedangkan uang giral tersimpan berupa rekening koran atau cek."
  }
];

// Konfigurasi 5 Tangga (Naik) pada Papan 50 Kotak (10 Kolom x 5 Baris)
const LADDERS = [
  { start: 4,  end: 14, color: '#f59e0b', name: 'Tangga Emas' },
  { start: 9,  end: 28, color: '#10b981', name: 'Tangga Kilat' },
  { start: 18, end: 37, color: '#06b6d4', name: 'Tangga Harapan' },
  { start: 25, end: 35, color: '#8b5cf6', name: 'Tangga Ungu' },
  { start: 33, end: 48, color: '#ec4899', name: 'Tangga Juara' }
];

// Konfigurasi 5 Ular (Turun) pada Papan 50 Kotak
const SNAKES = [
  { start: 16, end: 6,  color: '#f97316', name: 'Kobra Oranye' },
  { start: 26, end: 12, color: '#10b981', name: 'Viper Zamrud' },
  { start: 38, end: 19, color: '#a855f7', name: 'Piton Ungu' },
  { start: 44, end: 23, color: '#eab308', name: 'Boa Gurun' },
  { start: 49, end: 30, color: '#ef4444', name: 'Naga Api Trap' }
];

// Daftar 10 Hukuman Seru & Edukatif IPS saat terkena ular (Jongkok + Tantangan Seru)
const FUN_PUNISHMENTS = [
  {
    title: 'Desisan Sang Ular 🐍',
    instruction: 'Lakukan jongkok 3 kali sambil menirukan desisan ular: "Sssss... ampun raja ular!"'
  },
  {
    title: 'Sebutkan 3 Provinsi 🗺️',
    instruction: 'Sambil jongkok 3 kali, sebutkan 3 nama provinsi di Indonesia dengan lantang!'
  },
  {
    title: 'Negara Sahabat ASEAN 🌏',
    instruction: 'Lakukan jongkok 3 kali sambil menyebutkan 3 negara anggota ASEAN selain Indonesia!'
  },
  {
    title: 'Lagu Nasional Semangat 🎵',
    instruction: 'Lakukan jongkok 3 kali sambil menyanyikan bait lagu "Garuda Pancasila" atau lagu daerah!'
  },
  {
    title: 'Sebutkan 3 Pahlawan 🎖️',
    instruction: 'Sambil jongkok 3 kali, sebutkan 3 nama pahlawan nasional kemerdekaan Indonesia!'
  },
  {
    title: 'Yel-Yel Semangat IPS 📣',
    instruction: 'Lakukan jongkok 3 kali lalu teriakkan: "IPS Itu Seru, Kami Generasi Cerdas!"'
  },
  {
    title: 'Gaya Pose Patung Lucu 🗿',
    instruction: 'Lakukan jongkok 3 kali, lalu pasang pose patung paling kocak ke arah teman-teman selama 3 detik!'
  },
  {
    title: 'Kenampakan Alam Bumi 🏞️',
    instruction: 'Sambil jongkok 3 kali, sebutkan 3 kenampakan alam (misal: gunung, danau, tanjung, teluk)!'
  },
  {
    title: 'Samudera Megah Dunia 🌊',
    instruction: 'Lakukan jongkok 3 kali sambil menyebutkan 3 nama samudera besar di permukaan bumi!'
  },
  {
    title: 'Semboyan Persatuan 🇮🇩',
    instruction: 'Lakukan jongkok 3 kali lalu ucapkan semboyan negara kita: "Bhinneka Tunggal Ika!"'
  }
];

/**
 * ==========================================================================
 * Web Audio API Synthesizer (Hemat Memori, Zero-Lag)
 * ==========================================================================
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('ips_snakes_sound_muted') === 'true';
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playDiceRoll() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(220 + Math.random() * 180, 'triangle', 0.06, 0.12);
      }, i * 90);
    }
  }

  playStep() {
    this.playTone(420, 'sine', 0.08, 0.14);
  }

  playLadderAscent() {
    if (this.isMuted) return;
    const notes = [330, 415, 493, 554, 659];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.14, 0.15), idx * 80);
    });
  }

  playClimbStep() {
    this.playTone(480, 'triangle', 0.1, 0.15);
  }

  playSnakeAlert() {
    if (this.isMuted) return;
    this.playTone(180, 'sawtooth', 0.35, 0.2);
  }

  playSnakeSlide() {
    if (this.isMuted) return;
    const notes = [520, 460, 400, 340, 280, 220, 160];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.1, 0.15), idx * 80);
    });
  }

  playSquatDing() {
    this.playTone(880, 'sine', 0.2, 0.2);
  }

  playCorrect() {
    if (this.isMuted) return;
    this.playTone(523.25, 'triangle', 0.12, 0.15);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.15), 100);
    setTimeout(() => this.playTone(783.99, 'triangle', 0.25, 0.18), 200);
  }

  playWrong() {
    if (this.isMuted) return;
    this.playTone(240, 'sawtooth', 0.2, 0.18);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.3, 0.2), 150);
  }

  playVictory() {
    if (this.isMuted) return;
    const melody = [523, 659, 784, 1046];
    melody.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.25, 0.2), i * 150);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('ips_snakes_sound_muted', this.isMuted);
    return this.isMuted;
  }
}

/**
 * ==========================================================================
 * Particle System Ringan (Konfeti & Sparkle)
 * ==========================================================================
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, count = 20, type = 'star') {
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#fbbf24'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
        alpha: 1,
        life: 0.95 + Math.random() * 0.04,
        type
      });
    }
  }

  updateAndDraw(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravitasi
      p.alpha *= p.life;

      if (p.alpha < 0.05) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * ==========================================================================
 * Game Engine Utama (50 Kotak - 4 Pemain - Desain Premium & Anti-Macet)
 * ==========================================================================
 */
class SnakeAndLaddersGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.particleSystem = new ParticleSystem();
    this.sounds = new SoundEngine();

    // Offscreen Canvas untuk Pre-rendering Papan (Performa 60-120 FPS tanpa lag)
    this.boardCacheCanvas = document.createElement('canvas');
    this.boardCacheCtx = this.boardCacheCanvas.getContext('2d');
    this.boardCacheDirty = true;

    // Konfigurasi 4 Pemain
    this.totalPlayers = 4; // Default 4 Pemain
    this.currentPlayer = 1; // 1 s/d 4
    this.turnsCount = 0;
    this.isMoving = false;
    this.gameState = 'IDLE'; // 'IDLE', 'ROLLING', 'MOVING', 'QUIZ', 'SQUAT_PUNISHMENT', 'CLIMB_CHALLENGE', 'VICTORY'

    // Data Lengkap 4 Pemain
    this.players = {
      1: {
        id: 1,
        name: 'Pemain 1',
        label: 'P1',
        colorName: 'Biru',
        themeColor: '#2563eb', // Azure Sapphire
        colorLight: '#60a5fa',
        colorDark: '#1d4ed8',
        emblem: '👑',
        tile: 1,
        x: 0,
        y: 0,
        correctAnswers: 0,
        totalAnswered: 0,
        squatsDone: 0
      },
      2: {
        id: 2,
        name: 'Pemain 2',
        label: 'P2',
        colorName: 'Merah',
        themeColor: '#dc2626', // Ruby Crimson
        colorLight: '#f87171',
        colorDark: '#b91c1c',
        emblem: '⚡',
        tile: 1,
        x: 0,
        y: 0,
        correctAnswers: 0,
        totalAnswered: 0,
        squatsDone: 0
      },
      3: {
        id: 3,
        name: 'Pemain 3',
        label: 'P3',
        colorName: 'Hijau',
        themeColor: '#059669', // Emerald Jade
        colorLight: '#34d399',
        colorDark: '#047857',
        emblem: '🍀',
        tile: 1,
        x: 0,
        y: 0,
        correctAnswers: 0,
        totalAnswered: 0,
        squatsDone: 0
      },
      4: {
        id: 4,
        name: 'Pemain 4',
        label: 'P4',
        colorName: 'Ungu',
        themeColor: '#7c3aed', // Royal Violet
        colorLight: '#c084fc',
        colorDark: '#6d28d9',
        emblem: '⭐',
        tile: 1,
        x: 0,
        y: 0,
        correctAnswers: 0,
        totalAnswered: 0,
        squatsDone: 0
      }
    };

    // Bank Soal IPS SMP (50 Soal)
    this.questions = this.loadQuestions();
    this.activeQuestion = null;
    this.usedQuestionIds = new Set();

    // Hukuman Ular Aktif
    this.activeSnake = null;
    this.activePunishment = null;
    this.squatRepsRemaining = 3;

    // Tantangan Tangga Aktif
    this.activeLadder = null;
    this.climbProgress = 0;

    // Pose Engine
    this.poseEngine = null;

    // Inisialisasi
    this.init();
  }

  getActivePlayer() {
    return this.players[this.currentPlayer];
  }

  async init() {
    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Auto-resize observer untuk container papan ular tangga agar selalu 100% pas
    const container = document.getElementById('boardCanvasContainer');
    if (container && window.ResizeObserver) {
      const ro = new ResizeObserver(() => this.resizeCanvas());
      ro.observe(container);
    }

    // Posisikan semua 4 avatar di petak 1
    this.updateAllAvatarPositions();
    this.updateHUD();

    // Inisialisasi Pose Engine dengan Dual Viewport Kamera (Layar Kiri & Layar Kanan)
    this.poseEngine = new KinestheticPoseEngine({
      videoElementLeft: document.getElementById('webcamVideoLeft'),
      videoElementRight: document.getElementById('webcamVideoRight'),
      canvasElementLeft: document.getElementById('poseCanvasLeft'),
      canvasElementRight: document.getElementById('poseCanvasRight')
    });

    this.bindPoseCallbacks();
    await this.poseEngine.init();

    // Mulai giliran Pemain 1
    this.startPlayerTurn();

    // Jalankan Game Rendering Loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Muat 50 Soal IPS SMP (Otomatis migrasi dari versi sebelumnya)
   */
  loadQuestions() {
    const STORAGE_KEY = 'ips_smp_questions_50_v3';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          return parsed;
        }
      }
    } catch (e) {}

    // Simpan default 50 Soal IPS SMP
    this.saveQuestions(DEFAULT_QUESTIONS);
    return JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
  }

  saveQuestions(qList) {
    try {
      localStorage.setItem('ips_smp_questions_50_v3', JSON.stringify(qList));
      this.questions = qList;
    } catch (e) {}
  }

  /**
   * Resize Canvas Papan 50 Kotak (10 Kolom x 5 Baris)
   * Mengisi wadah (container) secara proporsional dan menjamin petak 1 s/d 50
   * 100% tampak utuh, tajam, dan tidak pernah terpotong di layar manapun!
   */
  resizeCanvas() {
    const container = document.getElementById('boardCanvasContainer');
    if (!container) return;

    // Ambil dimensi riil container
    const rect = container.getBoundingClientRect();
    const cWidth = container.clientWidth || rect.width || 500;
    const cHeight = container.clientHeight || rect.height || 260;

    // Margin aman di sekeliling canvas agar tidak mepet batas wadah
    const marginSafe = 6;
    const availW = Math.max(160, cWidth - marginSafe * 2);
    const availH = Math.max(100, cHeight - marginSafe * 2);

    // Padding internal papan
    const padW = 10;
    const padH = 10;
    const maxTileW = (availW - padW) / 10;
    const maxTileH = (availH - padH) / 5;

    // Otomatis tentukan tileSize agar pas mengisi wadah (10 kolom x 5 baris)
    // Sesuai permintaan: panjang full kotak yang di-screenshot gpp yang penting kelihatan 1-50!
    let tileSize = Math.floor(Math.min(maxTileW, maxTileH));
    tileSize = Math.max(16, Math.min(tileSize, 70));

    const finalW = Math.floor(tileSize * 10 + padW);
    const finalH = Math.floor(tileSize * 5 + padH);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = finalW * dpr;
    this.canvas.height = finalH * dpr;
    this.canvas.style.width = `${finalW}px`;
    this.canvas.style.height = `${finalH}px`;

    // Gunakan setTransform agar tidak terjadi akumulasi scale dan bebas bug DPR
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Update offscreen cache canvas dengan ukuran dan DPR yang sama persis
    this.boardCacheCanvas.width = finalW * dpr;
    this.boardCacheCanvas.height = finalH * dpr;
    this.boardCacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.boardWidth = finalW;
    this.boardHeight = finalH;
    this.tileSize = tileSize;
    this.marginX = (finalW - (tileSize * 10)) / 2;
    this.marginY = (finalH - (tileSize * 5)) / 2;

    this.boardCacheDirty = true;
    this.updateAllAvatarPositions();
  }

  updateAllAvatarPositions() {
    for (let pId = 1; pId <= this.totalPlayers; pId++) {
      const pos = this.getTilePosition(this.players[pId].tile);
      this.players[pId].x = pos.x;
      this.players[pId].y = pos.y;
    }
  }

  /**
   * Hitung Posisi Petak 1-50 pada Grid 10 Kolom x 5 Baris
   * Pola Zigzag:
   * Baris 0 (bawah): 1 -> 10 (kiri ke kanan)
   * Baris 1:        20 <- 11 (kanan ke kiri)
   * Baris 2:        21 -> 30 (kiri ke kanan)
   * Baris 3:        40 <- 31 (kanan ke kiri)
   * Baris 4 (atas): 41 -> 50 (kiri ke kanan, 50 di kanan atas)
   */
  getTilePosition(tileNum) {
    const n = Math.max(1, Math.min(50, tileNum));
    const rowIndex = Math.floor((n - 1) / 10); // 0 (bawah) s/d 4 (atas)
    const yIndex = 4 - rowIndex; // 4 (bawah di canvas) s/d 0 (atas di canvas)

    let colIndex;
    if (rowIndex % 2 === 0) {
      // Baris genap (0, 2, 4): kiri ke kanan (0 -> 9)
      colIndex = (n - 1) % 10;
    } else {
      // Baris ganjil (1, 3): kanan ke kiri (9 -> 0)
      colIndex = 9 - ((n - 1) % 10);
    }

    const x = this.marginX + (colIndex * this.tileSize) + (this.tileSize / 2);
    const y = this.marginY + (yIndex * this.tileSize) + (this.tileSize / 2);

    return { x, y, colIndex, yIndex, rowIndex };
  }

  /**
   * Alur Giliran Pemain
   */
  startPlayerTurn(isBonusRoll = false) {
    const player = this.getActivePlayer();
    if (player.tile >= 50) {
      this.triggerVictory(player);
      return;
    }

    this.gameState = 'IDLE';
    this.poseEngine.setActivePlayer(this.currentPlayer);
    this.poseEngine.setMode('DICE_ROLL');

    this.updateHUD();

    if (isBonusRoll) {
      this.showInstruction(
        `🎲 BONUS! ${player.name}: Jawaban Benar! Angkat Tangan atau Klik Dadu!`,
        player.colorName.toLowerCase()
      );
    } else {
      this.showInstruction(
        `🙌 ${player.name} (${player.colorName}): Angkat Kedua Tangan / Klik Dadu untuk Melangkah!`,
        player.colorName.toLowerCase()
      );
    }
  }

  switchTurn() {
    this.turnsCount++;
    // Rotasi giliran: 1 -> 2 -> 3 -> 4 -> 1
    this.currentPlayer = (this.currentPlayer % this.totalPlayers) + 1;
    this.startPlayerTurn();
  }

  /**
   * Lempar Dadu (1-6)
   */
  async rollDice() {
    if (this.isMoving || this.gameState !== 'IDLE') return;

    this.gameState = 'ROLLING';
    this.poseEngine.setMode('IDLE');
    this.sounds.playDiceRoll();

    const diceCube = document.getElementById('diceCube');
    diceCube?.classList.add('dice-rolling');

    const rollValue = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      diceCube?.classList.remove('dice-rolling');
      diceCube?.setAttribute('class', `dice-cube show-${rollValue}`);

      const player = this.getActivePlayer();
      this.showInstruction(`🎲 ${player.name} melempar angka ${rollValue}! Bergerak ${rollValue} langkah...`, 'blue');

      setTimeout(() => {
        this.movePlayerSteps(player, rollValue);
      }, 600);
    }, 800);
  }

  /**
   * Animasi Langkah Bidak Petak demi Petak
   */
  async movePlayerSteps(player, steps) {
    this.isMoving = true;
    this.gameState = 'MOVING';

    for (let s = 1; s <= steps; s++) {
      if (player.tile >= 50) break;
      player.tile++;
      const pos = this.getTilePosition(player.tile);

      this.sounds.playStep();
      this.particleSystem.burst(pos.x, pos.y, 6, 'star');

      await this.animateHop(player, pos.x, pos.y, 220);
      this.updateHUD();
    }

    this.isMoving = false;

    // Cek Kemenangan di Petak 50
    if (player.tile >= 50) {
      this.triggerVictory(player);
      return;
    }

    // Evaluasi Petak Pendaratan: Ular -> Tangga -> Soal Kuis
    this.evaluateTileLanding(player);
  }

  animateHop(player, targetX, targetY, duration) {
    return new Promise((resolve) => {
      const startX = player.x;
      const startY = player.y;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

        player.x = startX + (targetX - startX) * ease;
        // Efek lompatan parabola
        const bounce = Math.sin(progress * Math.PI) * 16;
        player.y = (startY + (targetY - startY) * ease) - bounce;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          player.x = targetX;
          player.y = targetY;
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  animateSlide(player, targetX, targetY, duration) {
    return new Promise((resolve) => {
      const startX = player.x;
      const startY = player.y;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress * progress * (3 - 2 * progress); // smoothstep

        player.x = startX + (targetX - startX) * ease;
        player.y = startY + (targetY - startY) * ease;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          player.x = targetX;
          player.y = targetY;
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  /**
   * Evaluasi Petak Pendaratan
   */
  evaluateTileLanding(player) {
    // 1. Cek Petak Ular (Harus Meluncur Turun + HUKUMAN JONGKOK & Hukuman Seru!)
    const snake = SNAKES.find(s => s.start === player.tile);
    if (snake) {
      this.handleSnakeBite(snake);
      return;
    }

    // 2. Cek Petak Kaki Tangga (Tantangan Memanjat Naik)
    const ladder = LADDERS.find(l => l.start === player.tile);
    if (ladder) {
      this.startLadderChallenge(ladder);
      return;
    }

    // 3. Petak Biasa: Kuis Soal IPS SMP
    this.startQuizChallenge();
  }

  /**
   * ==========================================================================
   * HUKUMAN ULAR (Wajib Jongkok + Hukuman Seru & Edukatif IPS)
   * ==========================================================================
   */
  async handleSnakeBite(snake) {
    const player = this.getActivePlayer();
    this.activeSnake = snake;
    this.gameState = 'SQUAT_PUNISHMENT';
    this.sounds.playSnakeAlert();

    this.showInstruction(`🐍 AWAS! ${player.name} Terkena Gigitan ${snake.name} di Petak ${snake.start}!`, 'red');

    // Meluncur turun ke ekor ular
    this.sounds.playSnakeSlide();
    const destPos = this.getTilePosition(snake.end);
    await this.animateSlide(player, destPos.x, destPos.y, 850);
    player.tile = snake.end;
    this.updateHUD();

    // Munculkan Modal Hukuman Ular
    this.openSnakePunishmentModal(snake);
  }

  openSnakePunishmentModal(snake) {
    const player = this.getActivePlayer();
    const modal = document.getElementById('snakePunishmentModal');
    if (!modal) return;

    // Pilih 1 hukuman seru acak dari FUN_PUNISHMENTS
    const randomPunishment = FUN_PUNISHMENTS[Math.floor(Math.random() * FUN_PUNISHMENTS.length)];
    this.activePunishment = randomPunishment;
    this.squatRepsRemaining = 3;

    // Set Teks Modal
    const titleEl = document.getElementById('punishPlayerTitle');
    const descEl = document.getElementById('punishDescText');
    const funTitleEl = document.getElementById('punishFunTitle');
    const funInstEl = document.getElementById('punishFunInstruction');
    const counterEl = document.getElementById('squatCounterBadge');

    if (titleEl) titleEl.innerText = `🐍 HUKUMAN ULAR: ${player.name.toUpperCase()}!`;
    if (descEl) descEl.innerText = `${player.name} meluncur turun dari petak ${snake.start} ke petak ${snake.end}. Selesaikan hukuman jongkok & tantangan seru ini!`;
    if (funTitleEl) funTitleEl.innerText = randomPunishment.title;
    if (funInstEl) funInstEl.innerText = randomPunishment.instruction;
    if (counterEl) counterEl.innerText = `0 / 3 Jongkok`;

    // Aktifkan mode pose SQUAT di kamera
    this.poseEngine.setMode('SQUAT', { targetReps: 3 });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  handleSquatRepDone(current, target) {
    this.sounds.playSquatDing();
    const counterEl = document.getElementById('squatCounterBadge');
    if (counterEl) counterEl.innerText = `${current} / ${target} Jongkok Selesai!`;

    const player = this.getActivePlayer();
    player.squatsDone++;
    this.particleSystem.burst(player.x, player.y, 10, 'star');

    if (current >= target) {
      this.showInstruction(`👏 Hebat! ${player.name} telah menyelesaikan 3x Jongkok! Tekan tombol selesai.`, 'green');
    }
  }

  finishSnakePunishment() {
    const modal = document.getElementById('snakePunishmentModal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');

    const player = this.getActivePlayer();
    this.particleSystem.burst(player.x, player.y, 30, 'star');
    this.sounds.playCorrect();

    this.showInstruction(`✅ Hukuman Selesai! ${player.name} siap melanjutkan permainan.`, 'green');
    this.poseEngine.setMode('IDLE');

    setTimeout(() => {
      this.switchTurn();
    }, 1200);
  }

  /**
   * ==========================================================================
   * TANTANGAN TANGGA (Memanjat 4 Kali)
   * ==========================================================================
   */
  startLadderChallenge(ladder) {
    this.gameState = 'CLIMB_CHALLENGE';
    this.activeLadder = ladder;
    this.climbProgress = 0;

    this.poseEngine.setMode('CLIMB', { targetReps: 4 });

    const player = this.getActivePlayer();
    const overlay = document.getElementById('ladderAlertOverlay');
    const counterText = document.getElementById('ladderCounterText');
    const progressBar = document.getElementById('ladderProgressBar');

    overlay?.classList.remove('hidden');
    if (counterText) counterText.innerText = '0 / 4';
    if (progressBar) progressBar.style.width = '0%';

    this.showInstruction(`🪜 TANTANGAN TANGGA! ${player.name}, Angkat Tangan Kiri-Kanan Bergantian 4 Kali!`, 'purple');
  }

  handleClimbStep(count, total) {
    this.sounds.playClimbStep();
    const player = this.getActivePlayer();
    const counterText = document.getElementById('ladderCounterText');
    const progressBar = document.getElementById('ladderProgressBar');

    if (counterText) counterText.innerText = `${count} / ${total}`;
    if (progressBar) progressBar.style.width = `${(count / total) * 100}%`;
    this.particleSystem.burst(player.x, player.y, 8, 'star');
  }

  async handleClimbSuccess() {
    this.gameState = 'MOVING';
    const player = this.getActivePlayer();
    document.getElementById('ladderAlertOverlay')?.classList.add('hidden');

    this.sounds.playLadderAscent();
    this.showInstruction(`🎉 HORE! ${player.name} Berhasil Memanjat Tangga ke Puncak!`, 'green');

    const ladder = this.activeLadder;
    const destPos = this.getTilePosition(ladder.end);

    await this.animateSlide(player, destPos.x, destPos.y, 900);
    player.tile = ladder.end;
    this.updateHUD();
    this.particleSystem.burst(destPos.x, destPos.y, 30, 'star');

    setTimeout(() => {
      this.switchTurn();
    }, 1200);
  }

  /**
   * ==========================================================================
   * TANTANGAN KUIS SOAL IPS SMP (50 Soal)
   * ==========================================================================
   */
  startQuizChallenge() {
    this.gameState = 'QUIZ';
    const player = this.getActivePlayer();

    // Pilih soal yang belum pernah keluar
    let available = this.questions.filter(q => !this.usedQuestionIds.has(q.id));
    if (available.length === 0) {
      this.usedQuestionIds.clear();
      available = this.questions;
    }

    const q = available[Math.floor(Math.random() * available.length)];
    this.activeQuestion = q;
    this.usedQuestionIds.add(q.id);

    // Tampilkan Kartu Soal
    const quizOverlay = document.getElementById('quizCardOverlay');
    const catBadge = document.getElementById('quizCategoryBadge');
    const qText = document.getElementById('quizQuestionText');
    const optAText = document.getElementById('quizOptionAText');
    const optBText = document.getElementById('quizOptionBText');
    const expBox = document.getElementById('quizExplanationBox');
    const dwellBarA = document.getElementById('dwellBarA');
    const dwellBarB = document.getElementById('dwellBarB');

    if (catBadge) catBadge.innerText = `📚 ${player.name} (${player.colorName}) • ${q.category || 'IPS SMP'}`;
    if (qText) qText.innerText = q.question;
    if (optAText) optAText.innerText = q.optionA;
    if (optBText) optBText.innerText = q.optionB;

    // Tampilkan cuplikan opsi jawaban di dalam sensor kotak kamera layar kiri & kanan
    const lBoxA = document.getElementById('leftTargetOptionAText');
    const lBoxB = document.getElementById('leftTargetOptionBText');
    const rBoxA = document.getElementById('rightTargetOptionAText');
    const rBoxB = document.getElementById('rightTargetOptionBText');

    if (lBoxA) lBoxA.innerText = q.optionA;
    if (lBoxB) lBoxB.innerText = q.optionB;
    if (rBoxA) rBoxA.innerText = q.optionA;
    if (rBoxB) rBoxB.innerText = q.optionB;

    if (dwellBarA) dwellBarA.style.width = '0%';
    if (dwellBarB) dwellBarB.style.width = '0%';
    expBox?.classList.add('hidden');

    quizOverlay?.classList.remove('hidden');

    // Aktifkan mode pose QUIZ
    this.poseEngine.setMode('QUIZ');
    this.showInstruction(`🤔 ${player.name}: Arahkan tangan ke Kotak A (Kiri) atau B (Kanan)!`, 'blue');
  }

  handleQuizHover(data) {
    const { zone, progress } = data;
    const barA = document.getElementById('dwellBarA');
    const barB = document.getElementById('dwellBarB');
    const cardA = document.getElementById('optionCardA');
    const cardB = document.getElementById('optionCardB');

    if (zone === 'A') {
      if (barA) barA.style.width = `${progress * 100}%`;
      if (barB) barB.style.width = '0%';
      cardA?.classList.add('active-target', 'ring-2', 'ring-blue-500');
      cardB?.classList.remove('active-target', 'ring-2', 'ring-purple-500');
    } else if (zone === 'B') {
      if (barB) barB.style.width = `${progress * 100}%`;
      if (barA) barA.style.width = '0%';
      cardB?.classList.add('active-target', 'ring-2', 'ring-purple-500');
      cardA?.classList.remove('active-target', 'ring-2', 'ring-blue-500');
    } else {
      if (barA) barA.style.width = '0%';
      if (barB) barB.style.width = '0%';
      cardA?.classList.remove('active-target', 'ring-2', 'ring-blue-500');
      cardB?.classList.remove('active-target', 'ring-2', 'ring-purple-500');
    }
  }

  handleQuizAnswer(chosenZone) {
    if (!this.activeQuestion || this.gameState !== 'QUIZ') return;
    this.gameState = 'IDLE';
    this.poseEngine.setMode('IDLE');

    const player = this.getActivePlayer();
    player.totalAnswered++;

    const isCorrect = chosenZone === this.activeQuestion.correct;
    const cardA = document.getElementById('optionCardA');
    const cardB = document.getElementById('optionCardB');

    if (isCorrect) {
      player.correctAnswers++;
      this.sounds.playCorrect();
      this.particleSystem.burst(player.x, player.y, 25, 'star');

      if (chosenZone === 'A') cardA?.classList.add('bg-emerald-100', 'border-emerald-500');
      if (chosenZone === 'B') cardB?.classList.add('bg-emerald-100', 'border-emerald-500');

      this.showInstruction(`🎉 BENAR! Jawaban ${player.name} Tepat! Dapatkan Bonus Lemparan Dadu!`, 'green');

      setTimeout(() => {
        this.closeQuizOverlay();
        // Bonus roll jika jawaban benar!
        this.startPlayerTurn(true);
      }, 1600);
    } else {
      this.sounds.playWrong();
      if (chosenZone === 'A') cardA?.classList.add('bg-rose-100', 'border-rose-500');
      if (chosenZone === 'B') cardB?.classList.add('bg-rose-100', 'border-rose-500');

      // Tampilkan penjelasan edukatif
      const expBox = document.getElementById('quizExplanationBox');
      const expText = document.getElementById('quizExplanationText');
      if (expBox && expText) {
        expText.innerText = this.activeQuestion.explanation || `Jawaban yang benar adalah Pilihan ${this.activeQuestion.correct}.`;
        expBox.classList.remove('hidden');
      }

      this.showInstruction(`❌ Kurang Tepat! Jawaban yang benar adalah Pilihan ${this.activeQuestion.correct}. Giliran berpindah!`, 'red');

      setTimeout(() => {
        this.closeQuizOverlay();
        this.switchTurn();
      }, 3500);
    }

    this.updateHUD();
  }

  closeQuizOverlay() {
    const quizOverlay = document.getElementById('quizCardOverlay');
    quizOverlay?.classList.add('hidden');

    const cardA = document.getElementById('optionCardA');
    const cardB = document.getElementById('optionCardB');
    cardA?.classList.remove('active-target', 'ring-2', 'ring-blue-500', 'bg-emerald-100', 'border-emerald-500', 'bg-rose-100', 'border-rose-500');
    cardB?.classList.remove('active-target', 'ring-2', 'ring-purple-500', 'bg-emerald-100', 'border-emerald-500', 'bg-rose-100', 'border-rose-500');

    const barA = document.getElementById('dwellBarA');
    const barB = document.getElementById('dwellBarB');
    if (barA) barA.style.width = '0%';
    if (barB) barB.style.width = '0%';
  }

  /**
   * Kemenangan Petak 50
   */
  triggerVictory(winner) {
    this.gameState = 'VICTORY';
    this.poseEngine.setMode('IDLE');
    this.sounds.playVictory();

    this.particleSystem.burst(winner.x, winner.y, 60, 'star');

    const vicModal = document.getElementById('victoryModal');
    const vicTitle = document.getElementById('victoryWinnerTitle');
    const vicSub = document.getElementById('victorySubtitle');
    const vicTurns = document.getElementById('victoryTurns');

    if (vicTitle) vicTitle.innerText = `🏆 HORE! ${winner.name.toUpperCase()} JUARA 1!`;
    if (vicSub) vicSub.innerText = `Selamat kepada ${winner.name} (${winner.colorName}) yang berhasil mencapai Puncak Petak 50!`;
    if (vicTurns) vicTurns.innerText = this.turnsCount;

    // Tampilkan rekap skor 4 pemain
    const vicGrid = document.getElementById('victoryPlayerSummaryGrid');
    if (vicGrid) {
      vicGrid.innerHTML = '';
      for (let pId = 1; pId <= this.totalPlayers; pId++) {
        const p = this.players[pId];
        const acc = p.totalAnswered > 0 ? Math.round((p.correctAnswers / p.totalAnswered) * 100) : 100;
        const card = document.createElement('div');
        card.className = `p-2.5 rounded-xl border border-white/10 bg-slate-800/80`;
        card.innerHTML = `
          <p class="font-bold text-xs" style="color: ${p.themeColor}">${p.emblem} ${p.name}</p>
          <p class="text-slate-300 text-[11px]">Petak: <strong class="text-white">${p.tile}</strong></p>
          <p class="text-slate-300 text-[11px]">Akurasi: <strong class="text-emerald-400">${acc}%</strong></p>
          <p class="text-slate-400 text-[10px]">Jongkok: ${p.squatsDone}x</p>
        `;
        vicGrid.appendChild(card);
      }
    }

    vicModal?.classList.remove('hidden');
    vicModal?.classList.add('flex');
  }

  resetGame() {
    this.turnsCount = 0;
    this.currentPlayer = 1;
    this.gameState = 'IDLE';

    for (let pId = 1; pId <= 4; pId++) {
      this.players[pId].tile = 1;
      this.players[pId].correctAnswers = 0;
      this.players[pId].totalAnswered = 0;
      this.players[pId].squatsDone = 0;
    }

    this.updateAllAvatarPositions();
    this.updateHUD();

    const vicModal = document.getElementById('victoryModal');
    vicModal?.classList.add('hidden');
    vicModal?.classList.remove('flex');

    const snakeModal = document.getElementById('snakePunishmentModal');
    snakeModal?.classList.add('hidden');
    snakeModal?.classList.remove('flex');

    document.getElementById('ladderAlertOverlay')?.classList.add('hidden');
    this.closeQuizOverlay();

    this.startPlayerTurn();
  }

  setPlayerCount(count) {
    this.totalPlayers = Math.max(2, Math.min(4, count));
    if (this.currentPlayer > this.totalPlayers) {
      this.currentPlayer = 1;
    }
    this.updateHUD();
    this.startPlayerTurn();
  }

  /**
   * Update Status Tampilan HUD (Dual Sensor Screen Kiri & Kanan, Top Strip 4 Pemain)
   */
  updateHUD() {
    const active = this.getActivePlayer();

    // 1. Banner Giliran di Header Papan
    const bannerText = document.getElementById('activePlayerText');
    const bannerIcon = document.getElementById('activePlayerIcon');
    if (bannerText) bannerText.innerText = `Giliran: ${active.name} (${active.colorName})`;
    if (bannerIcon) {
      bannerIcon.innerText = active.id;
      bannerIcon.style.backgroundColor = active.themeColor;
    }

    const hudTurns = document.getElementById('hudTurns');
    if (hudTurns) hudTurns.innerText = `Putaran: ${this.turnsCount}`;

    // 2. Top Strip 4 Pemain (di Atas Papan Ular Tangga)
    for (let pId = 1; pId <= 4; pId++) {
      const p = this.players[pId];
      const topCard = document.getElementById(`p${pId}TopCard`);
      const topTile = document.getElementById(`p${pId}TopTile`);
      const topBadge = document.getElementById(`p${pId}TopBadge`);

      if (!topCard) continue;

      if (pId > this.totalPlayers) {
        topCard.classList.add('hidden');
        continue;
      } else {
        topCard.classList.remove('hidden');
      }

      if (topTile) topTile.innerText = p.tile;

      if (pId === this.currentPlayer) {
        topCard.classList.add('ring-2', 'ring-offset-2', 'ring-offset-slate-950');
        topCard.style.borderColor = p.themeColor;
        topCard.style.boxShadow = `0 0 16px ${p.themeColor}50`;
        if (topBadge) {
          topBadge.innerText = 'GILIRAN';
          topBadge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-fun';
        }
      } else {
        topCard.classList.remove('ring-2', 'ring-offset-2', 'ring-offset-slate-950');
        topCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        topCard.style.boxShadow = 'none';
        if (topBadge) {
          topBadge.innerText = 'TUNGGU';
          topBadge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-fun';
        }
      }
    }

    // 3. Mini Cards P1, P2, P3, P4
    for (let pId = 1; pId <= 4; pId++) {
      const p = this.players[pId];
      const card = document.getElementById(`playerCardP${pId}`);
      const tileBadge = document.getElementById(`p${pId}TileBadge`);
      const scoreBadge = document.getElementById(`p${pId}ScoreBadge`);

      if (!card) continue;

      if (pId > this.totalPlayers) {
        card.classList.add('hidden');
      } else {
        card.classList.remove('hidden');
      }

      if (tileBadge) tileBadge.innerText = `Petak ${p.tile}`;
      const acc = p.totalAnswered > 0 ? Math.round((p.correctAnswers / p.totalAnswered) * 100) : 100;
      if (scoreBadge) scoreBadge.innerText = `${acc}%`;

      if (pId === this.currentPlayer) {
        card.style.borderColor = p.themeColor;
      } else {
        card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }
    }

    // 4. Update Status Layar Sensor Kiri (P1 Biru & P3 Hijau)
    const leftSec = document.getElementById('leftSensorSection');
    const leftHeader = document.getElementById('leftCamStageHeader');
    const leftDot = document.getElementById('leftPlayerIndicatorDot');
    const leftTurn = document.getElementById('leftTurnBadge');
    const leftStandby = document.getElementById('leftStandbyOverlay');
    const leftStandbySub = document.getElementById('leftStandbySubText');

    const isLeftTurn = (this.currentPlayer === 1 || this.currentPlayer === 3);

    if (leftSec) {
      if (isLeftTurn) {
        leftSec.style.borderColor = active.themeColor;
        leftSec.className = `lg:col-span-3 flex flex-col justify-between gap-1.5 h-full rounded-2xl bg-slate-900/80 p-2 sm:p-2.5 border-2 shadow-xl transition-all overflow-hidden relative min-h-[300px] lg:min-h-0 ${active.id === 1 ? 'glow-pulse-blue' : 'glow-pulse-green'}`;
        if (leftHeader) leftHeader.innerText = `${active.name} (${active.colorName})`;
        if (leftDot) leftDot.className = `w-2.5 h-2.5 rounded-full animate-ping ${active.id === 1 ? 'bg-blue-400' : 'bg-emerald-400'}`;
        if (leftTurn) {
          leftTurn.innerText = '🔥 GILIRAN ANDA';
          leftTurn.className = `text-[10px] font-bold px-2 py-0.5 rounded-full border ${active.id === 1 ? 'bg-blue-600/30 text-blue-300 border-blue-400/30' : 'bg-emerald-600/30 text-emerald-300 border-emerald-400/30'}`;
        }
        leftStandby?.classList.add('hidden');
      } else {
        leftSec.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        leftSec.className = 'lg:col-span-3 flex flex-col justify-between gap-1.5 h-full rounded-2xl bg-slate-900/80 p-2 sm:p-2.5 border border-white/10 shadow-xl transition-all overflow-hidden relative min-h-[300px] lg:min-h-0 opacity-75';
        if (leftHeader) leftHeader.innerText = 'Sisi Kiri (P1 & P3)';
        if (leftDot) leftDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
        if (leftTurn) {
          leftTurn.innerText = '⏳ MENUNGGU';
          leftTurn.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10';
        }
        leftStandby?.classList.remove('hidden');
        if (leftStandbySub) leftStandbySub.innerText = `${active.name} (${active.colorName}) sedang bersiap melangkah`;
      }
    }

    // 5. Update Status Layar Sensor Kanan (P2 Merah & P4 Ungu)
    const rightSec = document.getElementById('rightSensorSection');
    const rightHeader = document.getElementById('rightCamStageHeader');
    const rightDot = document.getElementById('rightPlayerIndicatorDot');
    const rightTurn = document.getElementById('rightTurnBadge');
    const rightStandby = document.getElementById('rightStandbyOverlay');
    const rightStandbySub = document.getElementById('rightStandbySubText');

    const isRightTurn = (this.currentPlayer === 2 || this.currentPlayer === 4);

    if (rightSec) {
      if (isRightTurn) {
        rightSec.style.borderColor = active.themeColor;
        rightSec.className = `lg:col-span-3 flex flex-col justify-between gap-1.5 h-full rounded-2xl bg-slate-900/80 p-2 sm:p-2.5 border-2 shadow-xl transition-all overflow-hidden relative min-h-[300px] lg:min-h-0 ${active.id === 2 ? 'glow-pulse-red' : 'glow-pulse-purple'}`;
        if (rightHeader) rightHeader.innerText = `${active.name} (${active.colorName})`;
        if (rightDot) rightDot.className = `w-2.5 h-2.5 rounded-full animate-ping ${active.id === 2 ? 'bg-red-400' : 'bg-purple-400'}`;
        if (rightTurn) {
          rightTurn.innerText = '🔥 GILIRAN ANDA';
          rightTurn.className = `text-[10px] font-bold px-2 py-0.5 rounded-full border ${active.id === 2 ? 'bg-red-600/30 text-red-300 border-red-400/30' : 'bg-purple-600/30 text-purple-300 border-purple-400/30'}`;
        }
        rightStandby?.classList.add('hidden');
      } else {
        rightSec.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        rightSec.className = 'lg:col-span-3 flex flex-col justify-between gap-1.5 h-full rounded-2xl bg-slate-900/80 p-2 sm:p-2.5 border border-white/10 shadow-xl transition-all overflow-hidden relative min-h-[300px] lg:min-h-0 opacity-75';
        if (rightHeader) rightHeader.innerText = 'Sisi Kanan (P2 & P4)';
        if (rightDot) rightDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
        if (rightTurn) {
          rightTurn.innerText = '⏳ MENUNGGU';
          rightTurn.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10';
        }
        rightStandby?.classList.remove('hidden');
        if (rightStandbySub) rightStandbySub.innerText = `${active.name} (${active.colorName}) sedang bersiap melangkah`;
      }
    }
  }

  showInstruction(msg, color = 'blue') {
    const banner = document.getElementById('gameInstructionBanner');
    if (!banner) return;
    banner.innerText = msg;
    banner.className = `px-3 py-2 rounded-xl font-bold text-center text-xs sm:text-sm shadow-md transition-all `;
    if (color === 'red') banner.classList.add('bg-rose-950/90', 'text-rose-200', 'border', 'border-rose-500/50');
    else if (color === 'green') banner.classList.add('bg-emerald-950/90', 'text-emerald-200', 'border', 'border-emerald-500/50');
    else if (color === 'purple') banner.classList.add('bg-purple-950/90', 'text-purple-200', 'border', 'border-purple-500/50');
    else if (color === 'orange') banner.classList.add('bg-orange-950/90', 'text-orange-200', 'border', 'border-orange-500/50');
    else banner.classList.add('bg-blue-950/90', 'text-blue-200', 'border', 'border-blue-500/50');
  }

  /**
   * ==========================================================================
   * RENDERING ENGINE: PALING PENTING DESAIN ULAR TANGGANYA LEBIH BAGUSIN!
   * Menggunakan Cached Offscreen Canvas untuk 60-120 FPS Buttery Smooth
   * ==========================================================================
   */
  gameLoop(timestamp) {
    this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);

    // 1. Gambar Board Statis dari Cache (Hemat CPU >90%)
    if (this.boardCacheDirty) {
      this.renderBoardToCache();
      this.boardCacheDirty = false;
    }
    // PENTING: Gunakan this.boardWidth dan this.boardHeight agar source dipetakan tepat ke sistem koordinat logical (DPR-safe)
    this.ctx.drawImage(this.boardCacheCanvas, 0, 0, this.boardWidth, this.boardHeight);

    // 2. Gambar 4 Avatar Pemain (Bergerak / Floating Bob)
    this.drawAvatars(timestamp);

    // 3. Update & Gambar Partikel Bintang/Konfeti
    this.particleSystem.updateAndDraw(this.ctx);

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Pre-render Papan 50 Kotak, Tangga 3D & Ular Realistis ke Offscreen Canvas
   */
  renderBoardToCache() {
    const ctx = this.boardCacheCtx;
    ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);

    // A. Frame Luar Papan Modern Bertema Petualangan (Wood / Slate Finish)
    this.drawBoardFrame(ctx);

    // B. Garis Jejak Jalur Berkelok (Trail 1 -> 50)
    this.drawPathTrail(ctx);

    // C. 50 Petak Ceria dengan Efek 3D
    this.drawTiles(ctx);

    // D. 5 Tangga Kayu / Emas 3D
    this.drawLadders(ctx);

    // E. 5 Ular Artistik dengan Sisik & Kepala 3D Menggemaskan
    this.drawSnakes(ctx);
  }

  drawBoardFrame(ctx) {
    const pad = 4;
    const w = this.boardWidth - pad * 2;
    const h = this.boardHeight - pad * 2;

    // Bingkai Luar
    ctx.save();
    this.roundRect(ctx, pad, pad, w, h, 16);
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Border Emas Lembut
    this.roundRect(ctx, pad + 3, pad + 3, w - 6, h - 6, 14);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.stroke();
    ctx.restore();
  }

  drawPathTrail(ctx) {
    ctx.save();
    ctx.beginPath();
    for (let i = 1; i <= 50; i++) {
      const pos = this.getTilePosition(i);
      if (i === 1) ctx.moveTo(pos.x, pos.y);
      else ctx.lineTo(pos.x, pos.y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 8]);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  drawTiles(ctx) {
    // 5 Pasang Palet Warna Pastel Modern & Ceria
    const tileThemes = [
      ['#fee2e2', '#fecaca', '#f87171'], // Peach Coral
      ['#fef3c7', '#fde68a', '#fbbf24'], // Golden Honey
      ['#dcfce7', '#bbf7d0', '#34d399'], // Mint Emerald
      ['#e0f2fe', '#bae6fd', '#38bdf8'], // Sky Cyan
      ['#f3e8ff', '#e9d5ff', '#c084fc']  // Lavender Lilac
    ];

    for (let i = 1; i <= 50; i++) {
      const pos = this.getTilePosition(i);
      const half = this.tileSize / 2;
      const x = pos.x - half;
      const y = pos.y - half;
      const pad = 1.5;
      const tSize = this.tileSize - pad * 2;

      ctx.save();

      // Warna Petak Selang-seling
      const theme = tileThemes[(pos.rowIndex + pos.colIndex) % tileThemes.length];
      const grad = ctx.createLinearGradient(x, y, x + tSize, y + tSize);

      if (i === 1) {
        // Petak START (Emerald Hijau Bercahaya)
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, '#059669');
      } else if (i === 50) {
        // Petak FINISH (Golden Crown Juara)
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#d97706');
      } else {
        grad.addColorStop(0, theme[0]);
        grad.addColorStop(1, theme[1]);
      }

      // Bentuk Kotak Petak Membulat yang Rapi
      const cornerRadius = Math.max(3, Math.round(this.tileSize * 0.14));
      this.roundRect(ctx, x + pad, y + pad, tSize, tSize, cornerRadius);
      ctx.fillStyle = grad;
      ctx.fill();

      // Border halus
      ctx.lineWidth = 1;
      ctx.strokeStyle = i === 1 || i === 50 ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();

      // Inner Highlight 3D (atas-kiri)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + pad + 3, y + pad + tSize - 2);
      ctx.lineTo(x + pad + 3, y + pad + 3);
      ctx.lineTo(x + pad + tSize - 2, y + pad + 3);
      ctx.stroke();

      // Badge Nomor Petak: TEBAL, JELAS, & TERBACA SEMPURNA 1 - 50
      const numFontSize = Math.max(10, Math.round(this.tileSize * 0.28));
      const numPadW = Math.max(15, this.tileSize * 0.38);
      const numPadH = Math.max(11, this.tileSize * 0.30);
      
      this.roundRect(ctx, x + pad + 2, y + pad + 2, numPadW, numPadH, 3);
      ctx.fillStyle = i === 1 || i === 50 ? 'rgba(0, 0, 0, 0.32)' : 'rgba(255, 255, 255, 0.92)';
      ctx.fill();

      ctx.fillStyle = i === 1 || i === 50 ? '#ffffff' : '#0f172a';
      ctx.font = `bold ${numFontSize}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i}`, x + pad + 2 + numPadW / 2, y + pad + 2 + numPadH / 2);

      // Icon & Penanda Petak Khusus (START, FINISH, TANGGA, ULAR)
      if (i === 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(7, Math.round(this.tileSize * 0.17))}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('START', pos.x, y + tSize - 1.5);
      } else if (i === 50) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(7, Math.round(this.tileSize * 0.17))}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('FINISH', pos.x, y + tSize - 1.5);
      } else {
        const isLadder = LADDERS.find(l => l.start === i);
        const isSnake = SNAKES.find(s => s.start === i);

        if (isLadder) {
          ctx.fillStyle = '#065f46';
          ctx.font = `bold ${Math.max(8, Math.round(this.tileSize * 0.20))}px Fredoka, sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`↗${isLadder.end}`, x + tSize - 1.5, y + tSize - 1.5);
        } else if (isSnake) {
          ctx.fillStyle = '#991b1b';
          ctx.font = `bold ${Math.max(8, Math.round(this.tileSize * 0.20))}px Fredoka, sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`↘${isSnake.end}`, x + tSize - 1.5, y + tSize - 1.5);
        }
      }

      ctx.restore();
    }
  }

  drawLadders(ctx) {
    LADDERS.forEach(ladder => {
      const p1 = this.getTilePosition(ladder.start);
      const p2 = this.getTilePosition(ladder.end);

      ctx.save();
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      const railOffset = Math.max(5, this.tileSize * 0.16);
      const perpX = -Math.sin(angle) * railOffset;
      const perpY = Math.cos(angle) * railOffset;

      const railWidth = Math.max(2.2, this.tileSize * 0.07);
      const rungWidth = Math.max(1.8, this.tileSize * 0.05);

      // 1. Bayangan 3D Tangga di Lantai
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.lineWidth = railWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x + perpX + 2, p1.y + perpY + 3);
      ctx.lineTo(p2.x + perpX + 2, p2.y + perpY + 3);
      ctx.moveTo(p1.x - perpX + 2, p1.y - perpY + 3);
      ctx.lineTo(p2.x - perpX + 2, p2.y - perpY + 3);
      ctx.stroke();

      // 2. Rel Samping Tangga Kayu Jati Emas
      ctx.strokeStyle = '#b45309'; // Kayu Jati gelap
      ctx.lineWidth = railWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x + perpX, p1.y + perpY);
      ctx.lineTo(p2.x + perpX, p2.y + perpY);
      ctx.moveTo(p1.x - perpX, p1.y - perpY);
      ctx.lineTo(p2.x - perpX, p2.y - perpY);
      ctx.stroke();

      // Highlight rel atas
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = Math.max(0.8, railWidth * 0.4);
      ctx.beginPath();
      ctx.moveTo(p1.x + perpX - 0.5, p1.y + perpY - 0.5);
      ctx.lineTo(p2.x + perpX - 0.5, p2.y + perpY - 0.5);
      ctx.stroke();

      // 3. Anak Tangga (Rungs Emas Mengkilap)
      const numRungs = Math.max(2, Math.floor(dist / (this.tileSize * 0.48)));
      for (let r = 1; r < numRungs; r++) {
        const t = r / numRungs;
        const rx = p1.x + dx * t;
        const ry = p1.y + dy * t;

        // Batang anak tangga emas
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = rungWidth;
        ctx.beginPath();
        ctx.moveTo(rx + perpX, ry + perpY);
        ctx.lineTo(rx - perpX, ry - perpY);
        ctx.stroke();

        // Specular highlight putih anak tangga
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(rx + perpX * 0.7, ry + perpY * 0.7 - 0.5);
        ctx.lineTo(rx - perpX * 0.7, ry - perpY * 0.7 - 0.5);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  drawSnakes(ctx) {
    SNAKES.forEach((snake, idx) => {
      const head = this.getTilePosition(snake.start);
      const tail = this.getTilePosition(snake.end);

      ctx.save();

      // Kontrol kurva S-Wave yang meliuk indah
      const midX = (head.x + tail.x) / 2;
      const midY = (head.y + tail.y) / 2;
      const sign = idx % 2 === 0 ? 1 : -1;
      const cp1X = midX + sign * (this.tileSize * 0.50);
      const cp1Y = midY - (this.tileSize * 0.28);

      const bodyWidth = Math.max(5, this.tileSize * 0.16);

      // 1. Bayangan Badan Ular
      ctx.beginPath();
      ctx.moveTo(tail.x + 2, tail.y + 3);
      ctx.quadraticCurveTo(cp1X + 2, cp1Y + 3, head.x + 2, head.y + 3);
      ctx.lineCap = 'round';
      ctx.lineWidth = bodyWidth;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.stroke();

      // 2. Badan Ular Utama
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.quadraticCurveTo(cp1X, cp1Y, head.x, head.y);
      ctx.lineCap = 'round';
      ctx.lineWidth = bodyWidth;
      ctx.strokeStyle = snake.color;
      ctx.stroke();

      // 3. Motif Sisik / Pola Garis Tubuh Ular
      ctx.lineWidth = Math.max(1.8, bodyWidth * 0.35);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = '#fef08a'; // Kuning sisik
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Ekor Ular Runcing / Cincin
      ctx.beginPath();
      ctx.arc(tail.x, tail.y, Math.max(2, bodyWidth * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = snake.color;
      ctx.fill();

      // 5. Kepala Ular 3D Ekspresif
      const headR = Math.max(6, this.tileSize * 0.18);
      ctx.beginPath();
      ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
      ctx.fillStyle = snake.color;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Mata Ular
      const eyeOffset = headR * 0.38;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(head.x - eyeOffset, head.y - 1.8, 2, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffset, head.y - 1.8, 2, 0, Math.PI * 2);
      ctx.fill();

      // Pupil Hitam
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(head.x - eyeOffset, head.y - 1.8, 1.1, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffset, head.y - 1.8, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Kilap Putih di Pupil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(head.x - eyeOffset - 0.6, head.y - 3.8, 0.7, 0, Math.PI * 2);
      ctx.arc(head.x + eyeOffset - 0.6, head.y - 3.8, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Lidah Ular Merah Bercabang
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(head.x, head.y + headR * 0.8);
      ctx.lineTo(head.x, head.y + headR + 6);
      ctx.lineTo(head.x - 2.5, head.y + headR + 9);
      ctx.moveTo(head.x, head.y + headR + 6);
      ctx.lineTo(head.x + 2.5, head.y + headR + 9);
      ctx.stroke();

      ctx.restore();
    });
  }

  /**
   * Gambar Avatar 4 Pemain (Bidak 3D dengan Halo Bercahaya)
   */
  drawAvatars(time) {
    const ctx = this.ctx;

    // Kelompokkan pemain yang berada di petak yang sama agar posisinya teratur rapi
    const tileGroups = {};
    for (let pId = 1; pId <= this.totalPlayers; pId++) {
      const tile = this.players[pId].tile;
      if (!tileGroups[tile]) tileGroups[tile] = [];
      tileGroups[tile].push(pId);
    }

    // Gambar non-aktif terlebih dahulu, lalu aktif paling atas
    const drawOrder = [];
    for (let pId = 1; pId <= this.totalPlayers; pId++) {
      if (pId !== this.currentPlayer) drawOrder.push(pId);
    }
    drawOrder.push(this.currentPlayer);

    drawOrder.forEach(pId => {
      const p = this.players[pId];
      const group = tileGroups[p.tile] || [pId];
      const indexInGroup = group.indexOf(pId);

      // Hitung offset agar 4 avatar di petak yang sama tidak saling menutupi
      let offX = 0;
      let offY = 0;
      const span = Math.max(5, Math.round(this.tileSize * 0.16));

      if (group.length === 2) {
        offX = indexInGroup === 0 ? -span : span;
      } else if (group.length === 3) {
        if (indexInGroup === 0) { offX = -span; offY = -span * 0.7; }
        else if (indexInGroup === 1) { offX = span; offY = -span * 0.7; }
        else { offX = 0; offY = span * 0.8; }
      } else if (group.length >= 4) {
        if (indexInGroup === 0) { offX = -span; offY = -span * 0.75; }
        else if (indexInGroup === 1) { offX = span; offY = -span * 0.75; }
        else if (indexInGroup === 2) { offX = -span; offY = span * 0.75; }
        else { offX = span; offY = span * 0.75; }
      }

      // Efek idle melayang (bobbing)
      const idleBob = (this.isMoving && this.currentPlayer === pId) ? 0 : Math.sin((time + pId * 150) / 180) * 1.8;

      ctx.save();
      ctx.translate(p.x + offX, p.y + offY + idleBob);

      const r = Math.max(7, Math.round(this.tileSize * 0.20));

      // 1. Cincin Penanda Giliran Aktif (Pulsing Neon Glow)
      if (this.currentPlayer === pId) {
        ctx.beginPath();
        const pulseR = r + 3 + Math.sin(time / 130) * 1.5;
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = p.colorLight;
        ctx.shadowColor = p.themeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 2. Bayangan Bawah Avatar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, r + 1.5 - idleBob, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Badan Avatar 3D
      const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.35, r * 0.1, 0, 0, r);
      grad.addColorStop(0, p.colorLight);
      grad.addColorStop(1, p.colorDark);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 4. Emblem Huruf / Nomor Pemain
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(7, Math.round(r * 1.05))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(`${p.id}`, 0, 0.5);
      ctx.shadowBlur = 0;

      ctx.restore();
    });
  }

  roundRect(ctx, x, y, width, height, radius = 8) {
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
   * ==========================================================================
   * Event Listeners & Kontrol Game
   * ==========================================================================
   */
  setupEventListeners() {
    // Lempar Dadu via Klik
    document.getElementById('diceCubeContainer')?.addEventListener('click', () => {
      if (this.gameState === 'IDLE') this.rollDice();
    });

    // Klik Pilihan Kuis A dan B
    document.getElementById('optionCardA')?.addEventListener('click', () => {
      if (this.gameState === 'QUIZ') this.handleQuizAnswer('A');
    });
    document.getElementById('optionCardB')?.addEventListener('click', () => {
      if (this.gameState === 'QUIZ') this.handleQuizAnswer('B');
    });

    // Tombol Hukuman Ular: Selesai Jongkok
    document.getElementById('btnFinishSquatPunishment')?.addEventListener('click', () => {
      this.finishSnakePunishment();
    });

    // Tombol Manual Tambah Hitungan Jongkok (+1)
    document.getElementById('btnManualSquatStep')?.addEventListener('click', () => {
      const current = (this.poseEngine?.squatReps || 0) + 1;
      if (this.poseEngine) this.poseEngine.squatReps = current;
      this.handleSquatRepDone(current, 3);
      if (current >= 3) {
        setTimeout(() => this.finishSnakePunishment(), 500);
      }
    });

    // Tombol Manual Tambah Panjat Tangga (+1)
    document.getElementById('btnManualClimbStep')?.addEventListener('click', () => {
      const current = (this.poseEngine?.climbCount || 0) + 1;
      if (this.poseEngine) this.poseEngine.climbCount = current;
      this.handleClimbStep(current, 4);
      if (current >= 4) {
        this.handleClimbSuccess();
      }
    });

    // Pilihan Jumlah Pemain (2, 3, atau 4 Pemain)
    const selectPlayers = document.getElementById('playerCountSelect');
    selectPlayers?.addEventListener('change', (e) => {
      this.setPlayerCount(parseInt(e.target.value, 10));
    });

    // Toggle Suara
    document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
      const isMuted = this.sounds.toggleMute();
      const btn = document.getElementById('soundToggleBtn');
      if (btn) btn.innerHTML = isMuted ? '🔇 <span class="hidden sm:inline">Bisu</span>' : '🔊 <span class="hidden sm:inline">Suara</span>';
    });

    // Reset Game
    document.getElementById('resetGameBtn')?.addEventListener('click', () => {
      if (confirm('Ulangi permainan dari awal? Semua posisi pemain akan kembali ke Petak 1.')) {
        this.resetGame();
      }
    });

    // Tombol Main Lagi di Modal Kemenangan
    document.getElementById('playAgainBtn')?.addEventListener('click', () => {
      this.resetGame();
    });

    // Tombol Layar Penuh
    document.getElementById('fullscreenToggleBtn')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    // Toggle Kamera ON/OFF (Hemat Daya / Manual)
    document.getElementById('cameraToggleBtn')?.addEventListener('click', () => {
      if (this.poseEngine) {
        const isEnabled = this.poseEngine.toggleCamera();
        const btn = document.getElementById('cameraToggleBtn');
        if (btn) {
          btn.innerHTML = isEnabled ? '📹 <span class="hidden sm:inline">Kamera Aktif</span>' : '🚫 <span class="hidden sm:inline">Kamera Mati</span>';
          btn.className = isEnabled
            ? 'px-2.5 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-semibold border border-emerald-400/30 flex items-center gap-1.5 cursor-pointer'
            : 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer';
        }
      }
    });

    // Toolbar Uji Simulasi Cepat
    document.getElementById('simArmsUpBtn')?.addEventListener('click', () => this.rollDice());
    document.getElementById('simChoiceABtn')?.addEventListener('click', () => this.handleQuizAnswer('A'));
    document.getElementById('simChoiceBBtn')?.addEventListener('click', () => this.handleQuizAnswer('B'));
    document.getElementById('simSquatBtn')?.addEventListener('click', () => {
      if (this.gameState === 'SQUAT_PUNISHMENT') {
        this.handleSquatRepDone(3, 3);
        this.finishSnakePunishment();
      }
    });
    document.getElementById('simClimbBtn')?.addEventListener('click', () => {
      if (this.gameState === 'CLIMB_CHALLENGE') {
        this.handleClimbStep(4, 4);
        this.handleClimbSuccess();
      }
    });

    // Keyboard Shortcuts (Space = Roll, A = Option A, B = Option B)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.gameState === 'IDLE') this.rollDice();
      } else if (e.code === 'KeyA') {
        if (this.gameState === 'QUIZ') this.handleQuizAnswer('A');
      } else if (e.code === 'KeyB') {
        if (this.gameState === 'QUIZ') this.handleQuizAnswer('B');
      }
    });

    // Setup Dashboard Mode Guru (PIN: 1234, CRUD Soal, Impor/Ekspor Excel, TANPA Link Pembeli)
    this.setupTeacherMode();
  }

  bindPoseCallbacks() {
    this.poseEngine.callbacks.onArmsUp = () => {
      if (this.gameState === 'IDLE') this.rollDice();
    };

    this.poseEngine.callbacks.onZoneHover = (data) => {
      if (this.gameState === 'QUIZ') this.handleQuizHover(data);
    };

    this.poseEngine.callbacks.onZoneSelect = (zone) => {
      if (this.gameState === 'QUIZ') this.handleQuizAnswer(zone);
    };

    this.poseEngine.callbacks.onSquatRep = (current, target) => {
      if (this.gameState === 'SQUAT_PUNISHMENT') this.handleSquatRepDone(current, target);
    };

    this.poseEngine.callbacks.onSquatSuccess = () => {
      if (this.gameState === 'SQUAT_PUNISHMENT') this.finishSnakePunishment();
    };

    this.poseEngine.callbacks.onClimbStep = (count, target) => {
      if (this.gameState === 'CLIMB_CHALLENGE') this.handleClimbStep(count, target);
    };

    this.poseEngine.callbacks.onClimbComplete = () => {
      if (this.gameState === 'CLIMB_CHALLENGE') this.handleClimbSuccess();
    };

    this.poseEngine.callbacks.onCameraStatus = (msg, type) => {
      const badge = document.getElementById('cameraStatusBadge');
      if (badge) {
        badge.innerText = msg;
        badge.className = type === 'success'
          ? 'keypoint-badge bg-emerald-100 text-emerald-700 border border-emerald-300'
          : type === 'warning'
            ? 'keypoint-badge bg-amber-100 text-amber-700 border border-amber-300'
            : 'keypoint-badge bg-blue-100 text-blue-700 border border-blue-300';
      }
    };
  }

  /**
   * ==========================================================================
   * Dashboard Mode Guru (CRUD Soal & Excel, TANPA Link Pembeli)
   * ==========================================================================
   */
  setupTeacherMode() {
    const teacherBtn = document.getElementById('teacherModeBtn');
    const pinModal = document.getElementById('teacherPinModal');
    const pinInput = document.getElementById('teacherPinInput');
    const pinSubmit = document.getElementById('teacherPinSubmitBtn');
    const pinCancel = document.getElementById('teacherPinCancelBtn');
    const pinError = document.getElementById('teacherPinError');

    const dashModal = document.getElementById('teacherDashboardModal');
    const closeDash = document.getElementById('closeTeacherDashboardBtn');

    teacherBtn?.addEventListener('click', () => {
      pinModal?.classList.remove('hidden');
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
      pinError?.classList.add('hidden');
    });

    pinCancel?.addEventListener('click', () => pinModal?.classList.add('hidden'));

    const verifyPin = () => {
      const pin = (pinInput?.value || '').trim();
      if (pin === '1234') {
        pinModal?.classList.add('hidden');
        this.openTeacherDashboard();
      } else {
        pinError?.classList.remove('hidden');
      }
    };

    pinSubmit?.addEventListener('click', verifyPin);
    pinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verifyPin();
    });

    closeDash?.addEventListener('click', () => dashModal?.classList.add('hidden'));

    // Tombol Tambah Soal
    document.getElementById('addQuestionBtn')?.addEventListener('click', () => {
      this.openQuestionEditor();
    });

    // Form Simpan Soal
    document.getElementById('questionForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveQuestionForm();
    });

    document.getElementById('cancelEditQuestionBtn')?.addEventListener('click', () => {
      document.getElementById('questionEditModal')?.classList.add('hidden');
    });

    // Ekspor Excel
    document.getElementById('exportQuestionsBtn')?.addEventListener('click', () => {
      this.exportQuestionsToExcel();
    });

    // Unduh Template Excel
    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
      this.downloadExcelTemplate();
    });

    // Impor Excel
    const importInput = document.getElementById('importQuestionsInput');
    document.getElementById('importQuestionsBtn')?.addEventListener('click', () => {
      importInput?.click();
    });

    importInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.importQuestionsFromExcel(file);
      e.target.value = '';
    });

    // Reset ke 50 Soal Default IPS SMP
    document.getElementById('resetDefaultQuestionsBtn')?.addEventListener('click', () => {
      if (confirm('Kembalikan semua bank soal ke 50 Soal Bawaan IPS SMP? Perubahan soal kustom Anda akan diganti.')) {
        this.saveQuestions(DEFAULT_QUESTIONS);
        this.renderQuestionsTable();
        alert('Berhasil! Bank soal kembali ke 50 Soal IPS SMP Bawaan.');
      }
    });

    // Pencarian Soal di Tabel Guru
    document.getElementById('teacherSearchInput')?.addEventListener('input', (e) => {
      this.renderQuestionsTable(e.target.value);
    });
  }

  openTeacherDashboard() {
    const dashModal = document.getElementById('teacherDashboardModal');
    dashModal?.classList.remove('hidden');
    this.renderQuestionsTable();
  }

  renderQuestionsTable(searchQuery = '') {
    const tbody = document.getElementById('teacherQuestionsTableBody');
    const totalEl = document.getElementById('teacherTotalQuestions');
    if (!tbody) return;

    tbody.innerHTML = '';
    const q = (searchQuery || '').toLowerCase();
    const filtered = this.questions.filter(item =>
      (item.question || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );

    if (totalEl) totalEl.innerText = `Total Soal: ${this.questions.length} Soal IPS SMP (${filtered.length} ditampilkan)`;

    filtered.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-white/5 hover:bg-slate-800/40 text-xs';
      tr.innerHTML = `
        <td class="p-2 text-slate-400 font-mono text-center">${idx + 1}</td>
        <td class="p-2">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            ${escapeHtml(item.category || 'IPS SMP')}
          </span>
        </td>
        <td class="p-2 font-medium text-slate-200 max-w-xs break-words">${escapeHtml(item.question)}</td>
        <td class="p-2 text-blue-300">${escapeHtml(item.optionA)}</td>
        <td class="p-2 text-purple-300">${escapeHtml(item.optionB)}</td>
        <td class="p-2 text-center font-bold text-emerald-400">${item.correct}</td>
        <td class="p-2 text-center space-x-1 whitespace-nowrap">
          <button data-id="${item.id}" class="btn-edit-q px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-bold cursor-pointer">✏️ Edit</button>
          <button data-id="${item.id}" class="btn-del-q px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold cursor-pointer">🗑️ Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit-q').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
        const item = this.questions.find(x => x.id === id);
        if (item) this.openQuestionEditor(item);
      });
    });

    tbody.querySelectorAll('.btn-del-q').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
        if (confirm('Hapus soal ini dari bank soal?')) {
          const updated = this.questions.filter(x => x.id !== id);
          this.saveQuestions(updated);
          this.renderQuestionsTable(searchQuery);
        }
      });
    });
  }

  openQuestionEditor(item = null) {
    const modal = document.getElementById('questionEditModal');
    const idInput = document.getElementById('qEditId');
    const qInput = document.getElementById('qEditQuestion');
    const aInput = document.getElementById('qEditOptionA');
    const bInput = document.getElementById('qEditOptionB');
    const expInput = document.getElementById('qEditExplanation');

    if (item) {
      if (idInput) idInput.value = item.id;
      if (qInput) qInput.value = item.question || '';
      if (aInput) aInput.value = item.optionA || '';
      if (bInput) bInput.value = item.optionB || '';
      if (expInput) expInput.value = item.explanation || '';
      const rBtn = document.querySelector(`input[name="qCorrect"][value="${item.correct}"]`);
      if (rBtn) rBtn.checked = true;
    } else {
      if (idInput) idInput.value = '';
      if (qInput) qInput.value = '';
      if (aInput) aInput.value = '';
      if (bInput) bInput.value = '';
      if (expInput) expInput.value = '';
      const rA = document.querySelector('input[name="qCorrect"][value="A"]');
      if (rA) rA.checked = true;
    }

    modal?.classList.remove('hidden');
  }

  saveQuestionForm() {
    const idInput = document.getElementById('qEditId');
    const qInput = document.getElementById('qEditQuestion');
    const aInput = document.getElementById('qEditOptionA');
    const bInput = document.getElementById('qEditOptionB');
    const expInput = document.getElementById('qEditExplanation');
    const correctVal = document.querySelector('input[name="qCorrect"]:checked')?.value || 'A';

    const qText = (qInput?.value || '').trim();
    const optA = (aInput?.value || '').trim();
    const optB = (bInput?.value || '').trim();
    const exp = (expInput?.value || '').trim() || `Jawaban yang tepat adalah Pilihan ${correctVal}.`;

    if (!qText || !optA || !optB) {
      alert('Mohon isi teks pertanyaan dan kedua pilihan jawaban!');
      return;
    }

    const editId = idInput?.value ? parseInt(idInput.value, 10) : null;
    let list = [...this.questions];

    if (editId) {
      const idx = list.findIndex(x => x.id === editId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          question: qText,
          optionA: optA,
          optionB: optB,
          correct: correctVal,
          explanation: exp
        };
      }
    } else {
      const newId = list.length > 0 ? Math.max(...list.map(x => x.id)) + 1 : 1;
      list.push({
        id: newId,
        category: 'IPS SMP Kustom',
        question: qText,
        optionA: optA,
        optionB: optB,
        correct: correctVal,
        explanation: exp
      });
    }

    this.saveQuestions(list);
    document.getElementById('questionEditModal')?.classList.add('hidden');
    this.renderQuestionsTable();
    alert('Soal berhasil disimpan!');
  }

  exportQuestionsToExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Pustaka SheetJS Excel belum siap.');
      return;
    }

    const rows = this.questions.map((q, i) => ({
      'No': i + 1,
      'Kategori': q.category || 'IPS SMP',
      'Pertanyaan': q.question,
      'Pilihan A': q.optionA,
      'Pilihan B': q.optionB,
      'Kunci Jawaban (A/B)': q.correct,
      'Penjelasan': q.explanation || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Soal_IPS_SMP');
    XLSX.writeFile(wb, 'Bank_Soal_Ular_Tangga_IPS_SMP.xlsx');
  }

  downloadExcelTemplate() {
    if (typeof XLSX === 'undefined') return;
    const templateRows = [
      {
        'No': 1,
        'Kategori': 'Geografi Indonesia',
        'Pertanyaan': 'Indonesia beriklim tropis karena dilalui oleh garis...',
        'Pilihan A': 'Khatulistiwa (Ekuator)',
        'Pilihan B': 'Bujur Nol Derajat',
        'Kunci Jawaban (A/B)': 'A',
        'Penjelasan': 'Garis khatulistiwa membelah Indonesia sehingga beriklim tropis.'
      },
      {
        'No': 2,
        'Kategori': 'Sejarah Kemerdekaan',
        'Pertanyaan': 'Teks proklamasi kemerdekaan Indonesia dibacakan pada tanggal...',
        'Pilihan A': '28 Oktober 1928',
        'Pilihan B': '17 Agustus 1945',
        'Kunci Jawaban (A/B)': 'B',
        'Penjelasan': 'Hari Proklamasi Kemerdekaan RI diperingati setiap 17 Agustus.'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Soal');
    XLSX.writeFile(wb, 'Template_Soal_Ular_Tangga_IPS.xlsx');
  }

  importQuestionsFromExcel(file) {
    if (typeof XLSX === 'undefined') return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (!json || json.length === 0) {
          alert('File Excel kosong atau tidak terbaca.');
          return;
        }

        const importedQuestions = [];
        let curId = this.questions.length > 0 ? Math.max(...this.questions.map(x => x.id)) + 1 : 1;

        json.forEach((row) => {
          const qText = row['Pertanyaan'] || row['question'] || row['Soal'];
          const optA = row['Pilihan A'] || row['optionA'] || row['Jawaban A'];
          const optB = row['Pilihan B'] || row['optionB'] || row['Jawaban B'];
          let correct = (row['Kunci Jawaban (A/B)'] || row['correct'] || row['Kunci'] || 'A').toString().trim().toUpperCase();
          if (correct !== 'A' && correct !== 'B') correct = 'A';
          const exp = row['Penjelasan'] || row['explanation'] || `Jawaban yang tepat adalah Pilihan ${correct}.`;
          const cat = row['Kategori'] || row['category'] || 'IPS SMP';

          if (qText && optA && optB) {
            importedQuestions.push({
              id: curId++,
              category: cat,
              question: qText.toString().trim(),
              optionA: optA.toString().trim(),
              optionB: optB.toString().trim(),
              correct: correct,
              explanation: exp.toString().trim()
            });
          }
        });

        if (importedQuestions.length === 0) {
          alert('Tidak ada soal yang valid ditemukan dalam Excel.');
          return;
        }

        const mode = document.getElementById('importModeSelect')?.value || 'append';
        let finalList;
        if (mode === 'replace') {
          finalList = importedQuestions;
        } else {
          finalList = [...this.questions, ...importedQuestions];
        }

        this.saveQuestions(finalList);
        this.renderQuestionsTable();
        alert(`Berhasil mengimpor ${importedQuestions.length} soal dari Excel!`);
      } catch (err) {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

// Jalankan Game saat DOM siap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new SnakeAndLaddersGame();
});
