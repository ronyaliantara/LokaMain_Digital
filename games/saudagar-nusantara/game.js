/* ==========================================================================
   Saudagar Nusantara — permainan papan DAGANG KELILING NUSANTARA untuk kelas.
   2–4 TIM (atau perorangan), boleh ditambah Saudagar Komputer.
   Lempar dadu, keliling 32 petak, beli kota, bangun Warung → Toko → Ruko →
   Mal Megah, tarik sewa. Soal kuis ada di setiap keputusan penting:
     • Kota/transportasi kosong -> Soal Diskon: benar = beli dengan diskon 20%.
     • Properti lawan -> Soal Tawar: benar = sewa hanya 50%.
     • Bangun -> wajib benar (salah = batal, koin tidak terpakai).
     • Kartu Ilmu -> benar = hadiah koin (+bonus beruntun).
     • Kartu Kejutan ⚡ TANTANGAN -> benar untung, salah rugi.
     • Pulau Karantina -> jawab benar untuk bebas.
   Mode Tim: setiap soal dijawab bergiliran oleh anggota tim ("Penjawab").
   Dek 24 Kartu Kejutan (🍀 UNTUNG / ⚠️ RUGI / ⚡ TANTANGAN) dengan animasi balik.
   Alur cepat: giliran berakhir sendiri bila tidak ada lagi yang bisa dilakukan.
   Grafis 100% kode (Canvas 2D + dadu CSS 3D). Lapisan statis di-cache; loop
   animasi melambat saat diam dan berhenti saat pop-up terbuka.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const TAU = Math.PI * 2;
  let TS = 1; // skala waktu animasi (dipakai uji otomatis)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * TS));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  function seeded(seed) { let s = Math.abs(seed | 0) % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; }
  function shade(h, f) { let [r, g, b] = hexRGB(h); if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }
  const fmt = (n) => Math.round(n).toLocaleString('id-ID');
  const r5 = (x) => Math.max(5, Math.round(x / 5) * 5);
  const r10 = (x) => Math.max(10, Math.round(x / 10) * 10);
  const coin = (n) => `🪙 ${fmt(n)}`;

  /* ------------------------------ Bidak & warna ------------------------------ */
  const KINDS = ['pinisi', 'becak', 'bajaj', 'layang'];
  const KIND_EMO = ['⛵', '🚲', '🛺', '🪁'];
  const KIND_NAME = { pinisi: 'Kapal Pinisi', becak: 'Becak', bajaj: 'Bajaj', layang: 'Layang-layang Garuda' };
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f97316'];
  const BOTS = ['Juragan Robo', 'Daeng Digi', 'Uda Bit'];
  const TEAM_NAMES = ['Tim Merah', 'Tim Biru', 'Tim Hijau', 'Tim Jingga'];
  const SOLO_NAMES = ['Andi', 'Sari', 'Budi', 'Rina'];
  QC.init({ gameId: 'saudagar-nusantara', title: 'Saudagar Nusantara', avatars: KIND_EMO, colors: COLORS });

  /* ------------------------------ Papan (32 petak) ------------------------------ */
  const REG = {
    sum: { name: 'Sumatra', color: '#c2410c' },
    jbr: { name: 'Jawa Barat', color: '#0d9488' },
    jtg: { name: 'Jawa Tengah & DIY', color: '#7c3aed' },
    jtb: { name: 'Jawa Timur & Bali', color: '#db2777' },
    kal: { name: 'Kalimantan', color: '#15803d' },
    sul: { name: 'Sulawesi', color: '#0284c7' },
    nt: { name: 'Nusa Tenggara', color: '#ca8a04' },
    mp: { name: 'Maluku & Papua', color: '#4338ca' }
  };
  const LV = ['Tanah kosong', 'Warung', 'Toko', 'Ruko', 'Mal Megah'];
  const LV_EMO = ['🌱', '🛖', '🏪', '🏢', '🏬'];
  const TR_PRICE = 600; const TR_RENT = [0, 420, 840, 1400, 2100];
  const RENT_F = [0.7, 1.4, 2.2, 3.2, 4.2]; // sewa = harga × faktor (tanah, Warung, Toko, Ruko, Mal Megah) — disetel dengan simulasi
  const JAIL_FEE = 200; const ILMU_BASE = 200; const DISC = 0.2; const AI_ACC = 0.68;
  const P_ = (name, reg, price, icon, sub, fact) => ({ type: 'prop', name, reg, price, icon, sub, fact });
  const T_ = (name, icon, sub, fact) => ({ type: 'trans', name, icon, sub, fact, price: TR_PRICE });
  const KJ = () => ({ type: 'kejut', name: 'Kartu Kejutan', icon: '🎴', sub: 'Untung atau rugi?' });
  const BOARD = [
    { type: 'start', name: 'Pelabuhan Awal', icon: '🚢', sub: 'Lewat = terima gaji' },
    P_('Medan', 'sum', 200, '🕌', 'Masjid Raya Al-Mashun', 'Medan adalah kota terbesar di Pulau Sumatra.'),
    { type: 'ilmu', name: 'Kartu Ilmu', icon: '📜', sub: 'Jawab benar = koin' },
    P_('Padang', 'sum', 240, '🛖', 'Rumah Gadang', 'Atap Rumah Gadang yang melengkung disebut gonjong.'),
    P_('Palembang', 'sum', 280, '🌉', 'Jembatan Ampera', 'Jembatan Ampera membentang di atas Sungai Musi.'),
    T_('Pelabuhan Feri', '⛴️', 'Penyeberangan antarpulau', 'Kapal feri menghubungkan pulau-pulau di Nusantara.'),
    P_('Bogor', 'jbr', 340, '🌿', 'Kebun Raya Bogor', 'Bogor dijuluki Kota Hujan karena curah hujannya tinggi.'),
    P_('Bandung', 'jbr', 380, '🏛️', 'Gedung Sate', 'Bandung dijuluki Kota Kembang dan Paris van Java.'),
    { type: 'jail', name: 'Pulau Karantina', icon: '🏝️', sub: 'Mampir saja = aman' },
    P_('Semarang', 'jtg', 480, '🚪', 'Lawang Sewu', 'Lawang Sewu berarti "seribu pintu" dalam bahasa Jawa.'),
    KJ(),
    P_('Solo', 'jtg', 520, '🎭', 'Wayang & Batik', 'Solo (Surakarta) terkenal dengan batik dan keratonnya.'),
    P_('Yogyakarta', 'jtg', 560, '🛕', 'Candi Prambanan', 'Prambanan adalah kompleks candi Hindu terbesar di Indonesia.'),
    T_('Stasiun Kereta', '🚄', 'Kereta antarkota', 'Kereta cepat pertama di Asia Tenggara melintas di Pulau Jawa.'),
    P_('Surabaya', 'jtb', 660, '🦈', 'Patung Sura & Baya', 'Surabaya dijuluki Kota Pahlawan (pertempuran 10 November 1945).'),
    P_('Denpasar', 'jtb', 700, '🌺', 'Pura & Tari Bali', 'Denpasar adalah ibu kota Provinsi Bali.'),
    { type: 'park', name: 'Taman Istirahat', icon: '🌳', sub: 'Bebas bersantai' },
    P_('Pontianak', 'kal', 760, '🧭', 'Tugu Khatulistiwa', 'Garis khatulistiwa melintasi Kota Pontianak.'),
    KJ(),
    P_('Banjarmasin', 'kal', 800, '🛶', 'Pasar Terapung', 'Pedagang pasar terapung berjualan dari atas perahu.'),
    P_('Balikpapan', 'kal', 840, '🛢️', 'Kota Minyak', 'Balikpapan dikenal sebagai pusat industri minyak dan gas.'),
    T_('Bandara', '✈️', 'Penerbangan Nusantara', 'Pesawat membuat perjalanan antarpulau jauh lebih cepat.'),
    P_('Makassar', 'sul', 940, '🌅', 'Pantai Losari', 'Makassar adalah kota terbesar di Pulau Sulawesi.'),
    P_('Manado', 'sul', 980, '🐠', 'Taman Laut Bunaken', 'Bunaken terkenal dengan terumbu karang yang indah.'),
    { type: 'storm', name: 'Badai!', icon: '🌪️', sub: 'Terseret ke Karantina' },
    P_('Mataram', 'nt', 1080, '🏖️', 'Pantai Lombok', 'Mataram adalah ibu kota Provinsi Nusa Tenggara Barat.'),
    P_('Labuan Bajo', 'nt', 1120, '🦎', 'Pulau Komodo', 'Komodo adalah kadal terbesar di dunia.'),
    T_('Terminal Bus', '🚌', 'Bus antarprovinsi', 'Bus antarkota antarprovinsi (AKAP) melayani rute jarak jauh.'),
    KJ(),
    P_('Ambon', 'mp', 1220, '🎸', 'Kota Musik Dunia', 'UNESCO menetapkan Ambon sebagai Kota Musik Dunia.'),
    P_('Sorong', 'mp', 1300, '🐚', 'Gerbang Raja Ampat', 'Sorong adalah pintu masuk wisata bahari Raja Ampat.'),
    P_('Jayapura', 'mp', 1400, '🦜', 'Burung Cendrawasih', 'Jayapura adalah ibu kota Provinsi Papua.')
  ];
  const GROUPS = {};
  BOARD.forEach((t, i) => {
    t.id = i; t.owner = -1; t.level = 0; t.mort = false;
    if (t.type === 'prop') {
      t.rent = RENT_F.map((f) => r10(t.price * f));
      t.build = r10(t.price * 0.5); (GROUPS[t.reg] = GROUPS[t.reg] || []).push(i);
    }
    if (t.price) { t.mortV = t.price / 2; t.redeem = r10(t.price / 2 * 1.1); }
  });
  const TRANS = BOARD.filter((t) => t.type === 'trans').map((t) => t.id);
  const KEJUT = BOARD.filter((t) => t.type === 'kejut').map((t) => t.id);
  const JAIL = 8; const STORM = 24;

  /* ------------------------------ Dek Kartu Kejutan (24 kartu) ------------------------------ */
  const CK = {
    untung: { label: '🍀 UNTUNG', color: '#16a34a', dark: '#065f46' },
    rugi: { label: '⚠️ RUGI', color: '#dc2626', dark: '#7f1d1d' },
    tantangan: { label: '⚡ TANTANGAN', color: '#f59e0b', dark: '#92400e' }
  };
  const DECK = [
    { id: 'panen', k: 'untung', ic: '🌾', t: 'Panen Raya!', d: 'Sawah dan kebunmu panen melimpah ruah. Terima 🪙 300.', fx: ['gain', 300] },
    { id: 'investasi', k: 'untung', ic: '📈', t: 'Investasi Sukses', d: 'Tabunganmu di koperasi berbuah manis. Terima 🪙 300.', fx: ['gain', 300] },
    { id: 'festival', k: 'untung', ic: '🎎', t: 'Festival Budaya', d: 'Penampilan tarimu memukau! Setiap tim lain memberimu 🪙 50.', fx: ['collect', 50] },
    { id: 'pajakbalik', k: 'untung', ic: '🧾', t: 'Pajak Dikembalikan', d: 'Kelebihan bayar pajak dikembalikan ke kasmu. Terima 🪙 150.', fx: ['gain', 150] },
    { id: 'angin', k: 'untung', ic: '⛵', t: 'Angin Baik', d: 'Layar terkembang penuh! Maju 3 petak.', fx: ['move', 3] },
    { id: 'tiket', k: 'untung', ic: '🎟️', t: 'Tiket Kapal Gratis', d: 'Berlayar langsung ke Pelabuhan Awal dan terima gaji.', fx: ['goto', 0] },
    { id: 'perisai', k: 'untung', ic: '🛡️', t: 'Perisai Sewa', d: 'SIMPAN kartu ini: bebas 1× membayar sewa ke lawan. Dipakai otomatis.', fx: ['keep', 'shield'] },
    { id: 'kunci', k: 'untung', ic: '🗝️', t: 'Bebas Karantina', d: 'SIMPAN kartu ini: keluar dari Pulau Karantina 1× tanpa syarat. Dipakai otomatis.', fx: ['keep', 'key'] },
    { id: 'kontraktor', k: 'untung', ic: '🏗️', t: 'Kontraktor Kilat', d: 'SIMPAN kartu ini: 1× bangun tanpa soal dengan biaya 50%. Dipakai otomatis saat membangun.', fx: ['keep', 'builder'] },
    { id: 'promo', k: 'untung', ic: '📸', t: 'Promo Wisata', d: 'Kotamu viral di media sosial! Semua sewamu ×2 selama 1 ronde.', fx: ['promo'] },
    { id: 'beasiswa', k: 'untung', ic: '🎓', t: 'Beasiswa Prestasi', d: 'Rajin belajar berbuah manis! Terima 🪙 200.', fx: ['gain', 200] },
    { id: 'pajak', k: 'rugi', ic: '💸', t: 'Pajak Daerah', d: 'Bayar pajak 20% dari uangmu (minimal 🪙 200).', fx: ['tax'] },
    { id: 'jalan', k: 'rugi', ic: '🛣️', t: 'Perbaikan Jalan', d: 'Bayar 🪙 80 per tingkat bangunan (minimal 🪙 200).', fx: ['road'] },
    { id: 'banjir', k: 'rugi', ic: '🌊', t: 'Banjir!', d: 'Bangunan tertinggimu turun 1 tingkat. Belum punya bangunan? Bayar 🪙 200 untuk bersih-bersih.', fx: ['flood'] },
    { id: 'copet', k: 'rugi', ic: '👛', t: 'Pencopet di Pasar', d: 'Dompetmu dicopet saat berbelanja. Hilang 🪙 300.', fx: ['pay', 300] },
    { id: 'badailaut', k: 'rugi', ic: '🌀', t: 'Badai Laut', d: 'Ombak tinggi menghadang! Mundur 3 petak.', fx: ['move', -3] },
    { id: 'mogok', k: 'rugi', ic: '🚤', t: 'Kapal Mogok', d: 'Mesin mati, kapalmu terseret ke Pulau Karantina!', fx: ['jail'] },
    { id: 'inflasi', k: 'rugi', ic: '📉', t: 'Inflasi', d: 'Harga-harga naik! Bayar 🪙 100 ke setiap tim lain.', fx: ['payeach', 100] },
    { id: 'sedekah', k: 'rugi', ic: '🤲', t: 'Sedekah Wajib', d: 'Bantu sesama: bayar 🪙 200 ke tim yang paling sedikit uangnya.', fx: ['poorest', 200] },
    { id: 'tersesat', k: 'rugi', ic: '🧭', t: 'Tersesat!', d: 'Pindah ke kota lawan terdekat di depanmu dan bayar sewanya (Soal Tawar tetap berlaku).', fx: ['lost'] },
    { id: 'servis', k: 'rugi', ic: '🔧', t: 'Servis Kendaraan', d: 'Gerobak dagangmu harus masuk bengkel. Bayar 🪙 240.', fx: ['pay', 240] },
    { id: 'hama', k: 'rugi', ic: '🐛', t: 'Gagal Panen', d: 'Hama menyerang kebunmu. Rugi 🪙 400.', fx: ['pay', 400] },
    { id: 'kilat', k: 'tantangan', ic: '⚡', t: 'Tantangan Kilat', d: 'Jawab 1 soal! Benar = terima 🪙 400. Salah = bayar 🪙 300.', fx: ['quiz', 400, 300] },
    { id: 'ekspor', k: 'tantangan', ic: '🚢', t: 'Peluang Ekspor', d: 'Jawab 1 soal! Benar = setiap tim lain membeli daganganmu 🪙 100. Salah = rugi ongkos kirim 🪙 300.', fx: ['export', 100, 300] }
  ];
  const CARD_BY = Object.fromEntries(DECK.map((c) => [c.id, c]));
  const KEEP = { shield: { ic: '🛡️', t: 'Perisai Sewa' }, key: { ic: '🗝️', t: 'Bebas Karantina' }, builder: { ic: '🏗️', t: 'Kontraktor Kilat' } };

  /* ------------------------------ Peraturan ------------------------------ */
  // Mode ELIMINASI: "Krisis" — mulai ronde 2 sewa naik ×2/×3/×4 (maks), mulai ronde 2 juga ada biaya hidup per giliran (200, naik 200/ronde)
  // (🪙100 lalu naik 🪙100 tiap ronde). Disetel dengan simulasi 3.000 permainan: tersingkir pertama ±ronde 6, selesai ±ronde 10.
  const KRISIS = { from: 2, step: 1, max: 4, livingFrom: 2, living: 200 };
  const WIN_RULE = 'Pemenang = tim terakhir yang bertahan. Jika waktu/ronde habis, pemenang = tim bertahan dengan uang terbanyak.';
  const REBUT_GAIN = 150;
  const durText = () => (/^r\d+$/.test(S.dur) ? `${elimMode() ? 'maks. ' : ''}<b>${S.dur.slice(1)} ronde</b>` : `${elimMode() ? 'maks. ' : ''}<b>${S.dur.slice(1)} menit</b>`);
  const RULES = () => `
    <h4>🏆 Cara menang</h4><ul>${elimMode()
      ? `<li>🔥 <b>ELIMINASI</b>: tim yang tidak sanggup membayar (setelah bangunan dijual & properti digadai) <b>TERSINGKIR</b>. <b>${WIN_RULE}</b> Batas aman: ${durText()}.</li>
      <li>📉 <b>Krisis</b> mulai ronde ${KRISIS.from}: semua sewa naik ×2, ×3, lalu ×${KRISIS.max}. Mulai ronde ${KRISIS.livingFrom} setiap tim membayar <b>biaya hidup</b> di awal gilirannya (${coin(KRISIS.living)}, naik ${coin(KRISIS.living)} tiap ronde).</li>`
      : `<li>🏛️ <b>KLASIK</b>: pemenang = <b>total kekayaan</b> terbesar (uang + nilai properti + bangunan; properti digadai dihitung setengah) setelah ${durText()} — atau tim terakhir yang tidak bangkrut.</li>`}</ul>
    <h4>👥 Mode Tim</h4><ul>
      <li>Kelas dibagi 2–4 tim (boleh ditambah 🤖 tim komputer). Isi nama anggota tiap tim di layar pengaturan.</li>
      <li>Setiap soal untuk tim ditampilkan dengan <b>🙋 Penjawab</b> — anggota menjawab <b>bergiliran</b> sehingga semua murid kebagian. ${S.diskusi === 'off' ? 'Diskusi tim <b>tidak boleh</b>: penjawab menjawab sendiri.' : 'Diskusi tim <b>boleh</b>, tetapi penjawablah yang memilih jawaban.'}</li>
      <li>⚡ <b>Soal Rebutan</b>${S.rebut === 'off' ? ' (sedang mati)' : ''}: bila tim yang sedang jalan menjawab salah, tim lain <b>berlomba mengklik tombol timnya</b> di layar. Tim tercepat menjawab soal yang sama; benar = <b>+${REBUT_GAIN} koin</b> (tim bertahan) atau <b>⭐ Bintang Penyelamat</b> (tim yang sudah tersingkir).</li></ul>
    <h4>🎲 Giliran</h4><ul>
      <li>Lempar 2 dadu (Spasi / Enter), bidak melompat searah jarum jam. <b>Dadu kembar</b> = lempar lagi; kembar <b>3× berturut-turut</b> = langsung ke 🏝️ Pulau Karantina.</li>
      <li>Melewati / berhenti di 🚢 <b>Pelabuhan Awal</b> = terima <b>gaji ${coin(S.gaji)}</b>.</li>
      <li>⚡ <b>Alur cepat</b>: bila tim tidak bisa membangun atau menebus apa pun, giliran berakhir sendiri setelah hitung mundur 2 detik (tekan ✋ Tunggu untuk menahan).</li></ul>
    <h4>❓ Soal di setiap keputusan</h4><ul>
      <li>🏷️ <b>Kota/transportasi kosong</b>: jawab <b>Soal Diskon</b>. Benar = boleh beli dengan <b>diskon 20%</b>. Salah = boleh beli harga penuh atau lewati${S.hard === 'on' ? ' — <b>mode Wajib Benar aktif: salah = tidak bisa membeli</b>' : ''}. Harga kota mahal: <b>diskusikan dulu</b> — sisa uang yang tipis membuat tim rawan tersingkir!</li>
      <li>💬 <b>Properti lawan</b>: jawab <b>Soal Tawar</b>. Benar = <b>bayar sewa 50%</b> ("Berhasil menawar!"). Salah = sewa penuh. Inilah kunci bertahan hidup!</li>
      <li>🏗️ <b>Bangun</b> (tombol B): kuasai <b>semua kota satu warna</b>, lalu bangun 🛖 Warung → 🏪 Toko → 🏢 Ruko → 🏬 Mal Megah. Setiap tingkat wajib <b>jawaban benar</b>; salah = batal, uang tidak terpakai.</li>
      <li>📜 <b>Kartu Ilmu</b>: benar = <b>${coin(ILMU_BASE)}</b>. Benar beruntun = bonus hingga +200 🔥.</li></ul>
    <h4>🎴 Kartu Kejutan (3 petak)</h4><ul>
      <li>Dek 24 kartu dikocok: <b style="color:#4ade80">🍀 UNTUNG</b> (panen raya, investasi, festival budaya, angin baik, promo wisata…), <b style="color:#f87171">⚠️ RUGI</b> (pajak 20%, pencopet, banjir, inflasi, gagal panen, tersesat…), dan <b style="color:#fbbf24">⚡ TANTANGAN</b> (jawab soal: benar untung besar, salah rugi). Dek dikocok ulang bila habis.</li>
      <li>Kartu SIMPAN — 🛡️ Perisai Sewa, 🗝️ Bebas Karantina, 🏗️ Kontraktor Kilat — tampil sebagai lencana di panel tim dan <b>dipakai otomatis</b>.</li></ul>
    <h4>🗺️ Petak lain</h4><ul>
      <li>🚆 <b>Transportasi</b> (⛴️ ✈️ 🚄 🚌): sewa naik sesuai jumlah yang dimiliki: ${TR_RENT.slice(1).map((v) => coin(v)).join(' / ')}.</li>
      <li>🌳 <b>Taman Istirahat</b>: bebas bersantai. 🌪️ <b>Badai!</b>: terseret ke 🏝️ <b>Pulau Karantina</b>. Untuk keluar: jawab soal dengan benar, bayar ${coin(JAIL_FEE)}, pakai 🗝️, atau tunggu 2 giliran.</li>
      <li>🎁 <b>Kota awal</b>: setiap tim bisa mulai dengan 1–2 kota acak (nilai dibuat seimbang).</li></ul>
    <h4>💰 Uang & tersingkir</h4><ul>
      <li>🏗️ Punya <b>2 kota satu grup warna</b> = boleh membangun (warung → toko → ruko → mal). Grup lengkap tanpa bangunan = sewa tanah ×2. Properti <b>digadai</b> tidak menarik sewa; tebus kembali dengan harga gadai +10% (klik kartu tim → 💼 Aset).</li>
      <li>Uang kurang? Bangunan dijual otomatis setengah harga, lalu properti digadai. Masih kurang = <b>${elimMode() ? 'TERSINGKIR' : 'BANGKRUT'}</b> dan semua propertinya kembali ke bank. Panel berkedip merah "⚠️ Uang menipis!" saat uang tinggal sedikit.</li></ul>
    <h4>⌨️ Tombol</h4><ul><li>Spasi/Enter = lempar dadu / lanjut • <b>B</b> = menu bangun • <b>M</b> = musik • klik petak = lihat kartu properti • jawab soal dengan A/B/C/D atau 1–4 • saat Rebutan: tombol 1–4 = pilih tim.</li></ul>`;
  const RULES_SHORT = `<ul>
    <li>🔥 <b>Eliminasi</b>: ${WIN_RULE}</li>
    <li>👥 Anggota tim menjawab <b>bergiliran</b> (🙋 Penjawab). Salah? Tim lain boleh <b>⚡ merebut</b> soalnya.</li>
    <li>🏷️ Soal Diskon: benar = beli <b>−20%</b> • 💬 Soal Tawar: benar = sewa <b>−50%</b>. Kota mahal — diskusikan sebelum membeli!</li>
    <li>📉 Krisis mulai ronde ${KRISIS.from}: sewa naik & ada biaya hidup. 🎴 Kartu Kejutan: 🍀 UNTUNG, ⚠️ RUGI, ⚡ TANTANGAN.</li></ul>`;

  /* ------------------------------ Status ------------------------------ */
  let S = { mode: 'tim', win: 'elim', bots: 0, cash: 2500, dur: 'r6', time: 20, gaji: 200, hard: 'off', fast: 'on', start: 1, diskusi: 'on', rebut: 'on' };
  let P = []; let phase = 'idle'; let turn = 0; let round = 1; let gameSeq = 0;
  let extraRoll = false; let doublesN = 0; let buildLocked = false; let forced = null; let dice = [3, 4];
  let tStart = 0; let timeWarned = false; let lastEnd = ''; let decide = null; let curQ = null; let outSeq = 0;
  let focusTile = -1; let focusT0 = 0; let hoverTile = -1; let deck = []; let logList = []; let prevPhase = null; let cpopSkip = null;
  let forcedCard = null; let deckCycles = 0; let autoEnd = null; let curAnswerer = null;
  let elimLog = []; let duelShown = false; let rebDecide = null; let rebutLog = []; let lastKrisisStage = 0;
  const maxRounds = () => (/^r\d+$/.test(S.dur) ? +S.dur.slice(1) : Infinity);
  const timeLimit = () => (/^t\d+$/.test(S.dur) ? +S.dur.slice(1) * 60000 : 0);
  const alive = () => P.filter((p) => !p.out);
  const cur = () => P[turn];
  const teamMode = () => S.mode === 'tim';
  const elimMode = () => S.win !== 'klasik';
  const unit = () => (teamMode() ? 'tim' : 'saudagar');

  /* ------------------------------ Suara (WebAudio) ------------------------------ */
  const SND = (() => {
    let a = null; let nbuf = null;
    function ac() {
      if (!a) { try { a = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (a.state === 'suspended') a.resume().catch(() => {});
      return a;
    }
    function nb() { if (!nbuf) { const len = a.sampleRate * 2; nbuf = a.createBuffer(1, len, a.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; } return nbuf; }
    function tone(f, d, type = 'square', v = 0.05, delay = 0, f2 = null) {
      if (QC.muted) return; const c = ac(); if (!c) return;
      const t = c.currentTime + Math.max(0, delay); const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
    }
    function noise(d, v, delay = 0, ft = 'lowpass', f = 1000, f2 = null, qv = 0.7) {
      if (QC.muted) return; const c = ac(); if (!c) return;
      const t = c.currentTime + Math.max(0, delay); const s = c.createBufferSource(); s.buffer = nb();
      const fl = c.createBiquadFilter(); fl.type = ft; fl.Q.value = qv; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
      const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(fl).connect(g).connect(c.destination); s.start(t, Math.random() * 0.3, d + 0.05);
    }
    const bell = (f, d, v, dl) => { tone(f, d, 'sine', v, dl); tone(f * 2.76, d * 0.5, 'sine', v * 0.25, dl); };
    return {
      ac, tone, noise, bell,
      shake() { for (let i = 0; i < 7; i++) noise(0.05, 0.22, i * 0.075, 'bandpass', 1800 + Math.random() * 1500, null, 2.5); },
      land(n = 0) { noise(0.08, 0.35, n, 'lowpass', 900); tone(140, 0.12, 'sine', 0.2, n, 70); },
      step(i) { tone(520 + (i % 5) * 70, 0.06, 'triangle', 0.07); noise(0.04, 0.12, 0.01, 'bandpass', 2200, null, 3); },
      hop() { tone(300, 0.16, 'sine', 0.08, 0, 700); },
      coin() { tone(1319, 0.07, 'square', 0.04); tone(1976, 0.18, 'square', 0.04, 0.06); },
      pay() { tone(660, 0.08, 'triangle', 0.06); tone(440, 0.16, 'triangle', 0.06, 0.07); },
      buy() { noise(0.05, 0.3, 0, 'bandpass', 3000, null, 2); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.14, 'square', 0.035, 0.05 + i * 0.06)); },
      build() { for (let i = 0; i < 3; i++) { noise(0.06, 0.4, i * 0.15, 'bandpass', 900, null, 3); tone(300, 0.06, 'square', 0.05, i * 0.15); } [659, 880, 1175].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, 0.5 + i * 0.07)); },
      mal() { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.24, 'triangle', 0.09, i * 0.1)); bell(98, 1.6, 0.25, 0); },
      storm() { noise(1.4, 0.32, 0, 'bandpass', 300, 1600, 0.8); noise(1.2, 0.22, 0.3, 'bandpass', 1400, 250, 0.8); tone(70, 1, 'sine', 0.25, 0.1, 40); },
      jail() { tone(196, 0.3, 'square', 0.06); tone(147, 0.5, 'square', 0.06, 0.18); noise(0.15, 0.3, 0.18, 'highpass', 2500); },
      card() { noise(0.25, 0.18, 0, 'bandpass', 900, 4000, 1.2); tone(880, 0.12, 'triangle', 0.05, 0.18); tone(1175, 0.18, 'triangle', 0.05, 0.26); },
      gaji() { tone(196, 0.45, 'sawtooth', 0.045); tone(247, 0.6, 'sawtooth', 0.04, 0.28); [1319, 1568, 1976].forEach((f, i) => tone(f, 0.12, 'square', 0.03, 0.5 + i * 0.07)); },
      bankrupt() { [392, 330, 262, 196, 131].forEach((f, i) => tone(f, 0.32, 'sawtooth', 0.06, i * 0.16)); noise(0.6, 0.3, 0.75, 'lowpass', 600, 80); },
      gong() { bell(110, 1.8, 0.22, 0); bell(220, 1.2, 0.06, 0.02); },
      think() { [0, 0.18, 0.36].forEach((d) => tone(1200, 0.04, 'sine', 0.035, d)); },
      fail() { tone(392, 0.2, 'triangle', 0.08, 0, 300); tone(311, 0.32, 'triangle', 0.07, 0.17, 200); },
      group() { [523, 659, 784, 1047].forEach((f, i) => bell(f, 0.5, 0.08, i * 0.09)); },
      chime() { [784, 988, 1175, 1568, 1976].forEach((f, i) => bell(f, 0.6, 0.07, i * 0.07)); tone(2637, 0.3, 'sine', 0.025, 0.36); },
      thud() { noise(0.35, 0.42, 0, 'lowpass', 520, 60); tone(110, 0.45, 'sine', 0.32, 0, 45); tone(233, 0.32, 'triangle', 0.06, 0.12, 160); tone(185, 0.45, 'triangle', 0.06, 0.3, 120); },
      suspense() { [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, 'square', 0.03, i * 0.08)); noise(0.5, 0.12, 0, 'bandpass', 600, 3000, 2); },
      flip() { noise(0.2, 0.25, 0, 'bandpass', 1200, 5200, 1.2); tone(520, 0.08, 'triangle', 0.05, 0.12, 900); },
      shield() { tone(1568, 0.5, 'triangle', 0.06, 0, 1180); tone(2093, 0.4, 'sine', 0.045, 0.06); noise(0.25, 0.1, 0, 'highpass', 5200); tone(523, 0.35, 'sine', 0.06, 0.02); },
      rebut() { [880, 1175, 880, 1175].forEach((f, i) => tone(f, 0.08, 'square', 0.04, i * 0.09)); noise(0.2, 0.15, 0, 'bandpass', 2500, null, 3); },
      eliminated() { noise(0.6, 0.45, 0, 'lowpass', 900, 70); tone(98, 0.9, 'sawtooth', 0.07, 0, 40); [523, 415, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, 0.15 + i * 0.14)); bell(73, 2, 0.22, 0.9); },
      duel() { for (let i = 0; i < 10; i++) noise(0.05, 0.25, i * 0.06, 'bandpass', 300, null, 2); tone(196, 0.5, 'sawtooth', 0.06, 0.62); tone(294, 0.7, 'sawtooth', 0.06, 0.9); tone(392, 0.9, 'triangle', 0.06, 1.15); },
      krisis() { [440, 415, 392, 370].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.045, i * 0.2)); noise(0.8, 0.12, 0, 'lowpass', 400, 120); }
    };
  })();

  /* Musik gamelan ringan (opsional): bonang + saron pentatonik, gong tiap frasa */
  const MUS = { on: store('lokamain_saudagar-nusantara_musik') === true, next: 0, step: 0 };
  const MEL = [76, 79, 81, 79, 76, 74, 72, 74, 76, 81, 83, 81, 79, 76, 74, 72];
  const BAL = [64, 64, 67, 67, 69, 69, 67, 67, 64, 64, 62, 62, 60, 60, 62, 64];
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function musicPump() {
    if (!MUS.on || QC.muted || phase === 'idle' || phase === 'over' || document.hidden) { MUS.next = 0; return; }
    const c = SND.ac(); if (!c || c.state !== 'running') return;
    const spb = 60 / 92 / 2;
    if (MUS.next < c.currentTime) MUS.next = c.currentTime + 0.05;
    while (MUS.next < c.currentTime + 0.3) {
      const st = MUS.step++; const dl = MUS.next - c.currentTime;
      if (st % 2 === 0) SND.bell(mf(BAL[(st >> 1) % 16]), 0.5, 0.045, dl);
      if (st % 4 !== 3) SND.bell(mf(MEL[st % 16]), 0.22, 0.022, dl);
      if (st % 32 === 0) SND.bell(mf(40), 2.2, 0.09, dl);
      if (st % 8 === 4) SND.bell(mf(52), 0.9, 0.035, dl);
      MUS.next += spb;
    }
  }
  setInterval(musicPump, 90);
  function syncMusicBtn() { const b = $('btnMusic'); b.classList.toggle('on', MUS.on); b.classList.toggle('off', !MUS.on); b.title = MUS.on ? 'Musik: NYALA (M)' : 'Musik: MATI (M)'; }
  function toggleMusic() { MUS.on = !MUS.on; store('lokamain_saudagar-nusantara_musik', MUS.on); SND.ac(); syncMusicBtn(); QC.toast(MUS.on ? '🎵 Musik gamelan dinyalakan' : '🎵 Musik dimatikan'); }
  $('btnMusic').onclick = (e) => { e.currentTarget.blur(); toggleMusic(); };
  syncMusicBtn();

  /* ------------------------------ Kanvas & tata letak ------------------------------ */
  const stage = $('stage'); const cv = $('cv'); const ctx = cv.getContext('2d');
  // Mode ringan otomatis untuk perangkat lemah (IFP/Android TV/laptop lama). Paksa: ?ringan=1 / ?ringan=0
  const LITE = /[?&]ringan=1/.test(location.search) || (!/[?&]ringan=0/.test(location.search) && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4));
  if (LITE) document.documentElement.classList.add('sn-lite');
  const PN = (n) => (LITE ? Math.ceil(n * 0.5) : n); // jumlah partikel
  let W = 0; let H = 0; let DPR = 1; const BD = { x: 0, y: 0, s: 0, f: 0, c: 0, w: 0, in: 0 };
  let seaC = null; let boardC = null; let ownC = null; let cloudC = null; let cloudSh = null; let cacheKey = ''; let ownDirty = true;
  const rects = []; let glints = []; const clouds = [];
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  function mkC(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function layout() {
    const w = stage.clientWidth; const h = stage.clientHeight; const d = Math.min(LITE ? 1.25 : 1.5, window.devicePixelRatio || 1);
    if (w !== W || h !== H || d !== DPR) { W = w; H = h; DPR = d; cv.width = Math.max(1, Math.round(W * DPR)); cv.height = Math.max(1, Math.round(H * DPR)); }
    const pad = W < 560 ? 4 : clamp(Math.min(W, H) * 0.014, 6, 18);
    const s = Math.max(160, Math.floor(Math.min(W, H) - pad * 2));
    BD.s = s; BD.x = Math.round((W - s) / 2); BD.y = Math.round((H - s) / 2); BD.f = Math.max(3, Math.round(s * 0.012));
    const ring = s - 2 * BD.f; BD.c = Math.round(ring * 0.14); BD.w = (ring - 2 * BD.c) / 7; BD.in = ring - 2 * BD.c;
    for (let i = 0; i < 32; i++) rects[i] = tileRect(i);
    const st = stage.style;
    st.setProperty('--bx', BD.x + 'px'); st.setProperty('--by', BD.y + 'px'); st.setProperty('--bs', s + 'px');
    st.setProperty('--bc', (BD.f + BD.c) + 'px'); st.setProperty('--in', BD.in + 'px');
  }
  // petak berurutan searah jarum jam mulai pojok kiri atas
  function tileRect(i) {
    const f = BD.f; const c = BD.c; const w = BD.w; const e = BD.s - f; let r;
    if (i === 0) r = { x: f, y: f, w: c, h: c, corner: 'tl' };
    else if (i < 8) r = { x: f + c + (i - 1) * w, y: f, w, h: c, side: 'top' };
    else if (i === 8) r = { x: e - c, y: f, w: c, h: c, corner: 'tr' };
    else if (i < 16) r = { x: e - c, y: f + c + (i - 9) * w, w: c, h: w, side: 'right' };
    else if (i === 16) r = { x: e - c, y: e - c, w: c, h: c, corner: 'br' };
    else if (i < 24) r = { x: e - c - (i - 16) * w, y: e - c, w, h: c, side: 'bottom' };
    else if (i === 24) r = { x: f, y: e - c, w: c, h: c, corner: 'bl' };
    else r = { x: f, y: e - c - (i - 24) * w, w: c, h: w, side: 'left' };
    r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2;
    if (!r.corner) {
      const gap = Math.max(1, BD.s * 0.002); const x = r.x + gap; const y = r.y + gap; const ww = r.w - gap * 2; const hh = r.h - gap * 2;
      const vert = r.side === 'top' || r.side === 'bottom'; const bt = (vert ? hh : ww) * 0.2;
      const band = r.side === 'top' ? [x, y, ww, bt] : r.side === 'bottom' ? [x, y + hh - bt, ww, bt] : r.side === 'left' ? [x, y, bt, hh] : [x + ww - bt, y, bt, hh];
      const box = r.side === 'top' ? [x, y + bt, ww, hh - bt] : r.side === 'bottom' ? [x, y, ww, hh - bt] : r.side === 'left' ? [x + bt, y, ww - bt, hh] : [x, y, ww - bt, hh];
      const [bx, by, bw, bh] = box; const inv = r.side === 'bottom'; // ikon selalu dekat pita warna
      const icon = Math.min(bw * 0.52, bh * 0.4); const fs = Math.min(bw * 0.165, bh * 0.15);
      const yI = by + bh * (inv ? 0.66 : 0.31); const yN = by + bh * (inv ? 0.36 : 0.63); const yC = by + bh * (inv ? 0.13 : 0.86);
      r.L = { x, y, w: ww, h: hh, band, box, icon, fs, yI, yN, yC, cxB: bx + bw / 2, bw, bt };
    }
    return r;
  }
  const boardPt = (i) => { const r = rects[i]; return [BD.x + r.cx, BD.y + r.cy]; };
  function tileClient(i) { const b = cv.getBoundingClientRect(); const [x, y] = boardPt(i); return { x: b.left + x, y: b.top + y }; }
  function anchorAt(i) { const a = $('anchor'); const p = typeof i === 'number' ? tileClient(i) : i; a.style.transform = `translate(${p.x}px, ${p.y}px)`; return a; }
  function tileAt(sx, sy) { const x = sx - BD.x; const y = sy - BD.y; for (let i = 0; i < 32; i++) { const r = rects[i]; if (r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return -1; }

  /* ------------------------------ Cache grafis ------------------------------ */
  function ensureCaches() {
    const t0 = performance.now(); let built = false;
    const k = [W, H, DPR, BD.s, S.gaji].join('|');
    if (k !== cacheKey || !seaC) { cacheKey = k; seaC = buildSea(); boardC = buildBoard(); if (!cloudC) buildClouds(); P.forEach((p) => (p.sprite = null)); ownDirty = true; built = true; }
    if (ownDirty || !ownC) { ownC = buildOwn(); ownDirty = false; built = true; }
    if (built) { perf.builds++; perf.buildMax = Math.max(perf.buildMax, performance.now() - t0); }
    return built;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function emo(g, ch, x, y, size) { g.font = `${Math.round(size)}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y + size * 0.04); }
  function fitText(g, txt, x, y, maxW, size, weight = 800, fam = '"Baloo 2", sans-serif') {
    let s = size; g.font = `${weight} ${s}px ${fam}`; while (s > 6 && g.measureText(txt).width > maxW) { s -= 0.5; g.font = `${weight} ${s}px ${fam}`; }
    g.fillText(txt, x, y); return s;
  }
  function outlined(g, txt, x, y, size, fill, stroke, lw, fam = '"Titan One", "Baloo 2", sans-serif', maxW = 1e9) {
    let s = size; g.font = `400 ${s}px ${fam}`; while (s > 6 && g.measureText(txt).width > maxW) { s -= 0.5; g.font = `400 ${s}px ${fam}`; }
    g.lineJoin = 'round'; g.lineWidth = lw * (s / size); g.strokeStyle = stroke; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
  }
  function buildSea() {
    const c = mkC(W * DPR, H * DPR); const g = c.getContext('2d'); g.scale(DPR, DPR);
    let gr = g.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    gr.addColorStop(0, '#1b9bb6'); gr.addColorStop(0.55, '#0f6f8f'); gr.addColorStop(1, '#07405a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const R = seeded(1717);
    for (let i = 0; i < 60; i++) { const x = R() * W; const y = R() * H; const r = 30 + R() * 90; gr = g.createRadialGradient(x, y, 0, x, y, r); const lt = R() < 0.5; gr.addColorStop(0, lt ? 'rgba(140,230,245,.08)' : 'rgba(0,30,50,.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    // ombak statis "~"
    g.strokeStyle = 'rgba(220,250,255,.13)'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = 0; i < 90; i++) { const x = R() * W; const y = R() * H; if (x > BD.x - 10 && x < BD.x + BD.s + 10 && y > BD.y - 10 && y < BD.y + BD.s + 10) continue; const s = 6 + R() * 8; g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s / 2, y - s * 0.5, x, y); g.quadraticCurveTo(x + s / 2, y + s * 0.5, x + s, y); g.stroke(); }
    // bayangan papan (sekali saat cache dibuat)
    g.save(); g.shadowColor = 'rgba(0,10,20,.6)'; g.shadowBlur = BD.s * 0.05; g.shadowOffsetY = BD.s * 0.018; g.fillStyle = '#3a1d06'; rr(g, BD.x, BD.y, BD.s, BD.s, BD.s * 0.02); g.fill(); g.restore();
    gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(1,14,24,.5)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // titik kilau ombak (dianimasikan)
    glints = []; const Rg = seeded(99);
    const inC = (x, y) => x > BD.x + BD.f + BD.c + 8 && x < BD.x + BD.s - BD.f - BD.c - 8 && y > BD.y + BD.f + BD.c + 8 && y < BD.y + BD.s - BD.f - BD.c - 8;
    const onB = (x, y) => x > BD.x - 6 && x < BD.x + BD.s + 6 && y > BD.y - 6 && y < BD.y + BD.s + 6;
    for (let i = 0; i < 260 && glints.length < 70; i++) { const x = Rg() * W; const y = Rg() * H; if (onB(x, y) && !inC(x, y)) continue; glints.push({ x, y, ph: Rg() * TAU, s: 4 + Rg() * 7, v: 0.6 + Rg() * 0.9 }); }
    return c;
  }
  function buildClouds() {
    const mk = (col) => { const c = mkC(240, 120); const g = c.getContext('2d'); const R = seeded(77);
      for (let i = 0; i < 9; i++) { const x = 50 + R() * 140; const y = 52 + (R() - 0.5) * 34; const r = 24 + R() * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col(1)); gr.addColorStop(0.6, col(0.85)); gr.addColorStop(1, col(0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      return c; };
    cloudC = mk((a) => `rgba(255,255,255,${a})`); cloudSh = mk((a) => `rgba(0,25,40,${a})`);
    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.8, s: 0.6 + Math.random() * 0.6, v: 0.005 + Math.random() * 0.007 });
  }

  /* --- peta kepulauan di tengah papan (koordinat 0..1 bidang dalam) --- */
  const ISLES = [
    { reg: 'sum', pin: [0.2, 0.42], pts: [[0.04, 0.2], [0.1, 0.19], [0.17, 0.28], [0.25, 0.4], [0.31, 0.52], [0.33, 0.58], [0.28, 0.6], [0.2, 0.52], [0.12, 0.4], [0.06, 0.3]] },
    { reg: 'jbr', pin: [0.37, 0.675], pts: [[0.33, 0.66], [0.42, 0.64], [0.52, 0.66], [0.6, 0.68], [0.6, 0.71], [0.5, 0.72], [0.4, 0.71], [0.33, 0.69]] },
    { pin: [0.47, 0.68] }, { pin: [0.565, 0.695] },
    { pts: [[0.62, 0.69], [0.645, 0.688], [0.648, 0.712], [0.62, 0.714]] },
    { reg: 'nt', pin: [0.75, 0.715], pts: [[0.66, 0.7], [0.69, 0.698], [0.692, 0.722], [0.66, 0.724], [0.66, 0.7]] },
    { pts: [[0.71, 0.702], [0.8, 0.708], [0.802, 0.73], [0.71, 0.726]] },
    { pts: [[0.8, 0.765], [0.88, 0.742], [0.892, 0.762], [0.82, 0.785]] },
    { reg: 'kal', pin: [0.44, 0.32], pts: [[0.36, 0.22], [0.44, 0.16], [0.52, 0.18], [0.55, 0.28], [0.52, 0.4], [0.46, 0.48], [0.38, 0.47], [0.33, 0.38], [0.33, 0.28]] },
    { reg: 'sul', pin: [0.615, 0.34], pts: [[0.6, 0.24], [0.68, 0.22], [0.7, 0.25], [0.63, 0.27], [0.62, 0.33], [0.68, 0.36], [0.66, 0.39], [0.62, 0.38], [0.64, 0.47], [0.61, 0.5], [0.58, 0.42], [0.57, 0.32]] },
    { pts: [[0.74, 0.33], [0.76, 0.31], [0.77, 0.36], [0.75, 0.38]] },
    { pts: [[0.74, 0.46], [0.8, 0.45], [0.81, 0.47], [0.75, 0.48]] },
    { reg: 'mp', pin: [0.9, 0.46], pts: [[0.82, 0.36], [0.86, 0.32], [0.9, 0.35], [0.96, 0.4], [0.98, 0.5], [0.97, 0.62], [0.92, 0.6], [0.88, 0.52], [0.84, 0.47], [0.86, 0.42], [0.82, 0.41]] }
  ];
  const PINREG = ['sum', 'jbr', 'jtg', 'jtb', 'nt', 'kal', 'sul', 'mp'];
  const PINS = { sum: [0.2, 0.42], jbr: [0.37, 0.675], jtg: [0.47, 0.68], jtb: [0.575, 0.695], nt: [0.75, 0.715], kal: [0.44, 0.32], sul: [0.615, 0.34], mp: [0.9, 0.46] };
  function blob(g, pts, ox, oy, k) {
    g.beginPath(); const n = pts.length;
    for (let i = 0; i <= n; i++) { const a = pts[i % n]; const b = pts[(i + 1) % n]; const mx = (a[0] + b[0]) / 2; const my = (a[1] + b[1]) / 2; if (i === 0) g.moveTo(ox + mx * k, oy + my * k); else g.quadraticCurveTo(ox + a[0] * k, oy + a[1] * k, ox + mx * k, oy + my * k); }
    g.closePath();
  }
  function drawCenter(g) {
    const o = BD.f + BD.c; const k = BD.in;
    let gr = g.createRadialGradient(o + k * 0.5, o + k * 0.55, k * 0.1, o + k * 0.5, o + k * 0.5, k * 0.75);
    gr.addColorStop(0, '#3cc3d6'); gr.addColorStop(0.6, '#1993b0'); gr.addColorStop(1, '#0c6a8a');
    g.fillStyle = gr; g.fillRect(o, o, k, k);
    g.save(); g.beginPath(); g.rect(o, o, k, k); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let i = 1; i < 8; i++) { const p = o + (k * i) / 8; g.beginPath(); g.moveTo(p, o); g.lineTo(p, o + k); g.stroke(); g.beginPath(); g.moveTo(o, p); g.lineTo(o + k, p); g.stroke(); }
    // jalur kapal putus-putus
    g.setLineDash([k * 0.012, k * 0.014]); g.strokeStyle = 'rgba(255,248,225,.45)'; g.lineWidth = Math.max(1, k * 0.0035);
    g.beginPath(); PINREG.forEach((r, i) => { const [x, y] = PINS[r]; const X = o + x * k; const Y = o + y * k; if (!i) g.moveTo(X, Y); else g.lineTo(X, Y); }); g.stroke(); g.setLineDash([]);
    // pulau: pasir lalu hijau
    for (const I of ISLES) { if (!I.pts) continue; blob(g, I.pts, o, o, k); g.fillStyle = '#f7e2a8'; g.strokeStyle = 'rgba(255,250,230,.75)'; g.lineWidth = k * 0.012; g.lineJoin = 'round'; g.stroke(); g.fill(); }
    for (const I of ISLES) { if (!I.pts) continue; g.save(); g.translate(o + k * 0.003, o - k * 0.004); blob(g, I.pts, 0, 0, k * 0.994); gr = g.createLinearGradient(0, 0, k, k); gr.addColorStop(0, '#5fbf5a'); gr.addColorStop(1, '#2f8f46'); g.fillStyle = gr; g.fill(); g.restore(); }
    // bukit kecil
    const R = seeded(31);
    for (const I of ISLES) { if (!I.pts || I.pts.length < 8) continue; for (let j = 0; j < 3; j++) { const a = I.pts[(R() * I.pts.length) | 0]; const b = I.pin || a; const x = o + ((a[0] + b[0]) / 2) * k; const y = o + ((a[1] + b[1]) / 2) * k; g.fillStyle = 'rgba(20,83,45,.35)'; g.beginPath(); g.moveTo(x - k * 0.018, y + k * 0.008); g.lineTo(x, y - k * 0.02); g.lineTo(x + k * 0.018, y + k * 0.008); g.closePath(); g.fill(); } }
    // pin wilayah
    for (const r of PINREG) { const [x, y] = PINS[r]; const X = o + x * k; const Y = o + y * k; const pr = Math.max(3, k * 0.017);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X, Y + pr * 0.9, pr * 0.9, pr * 0.35, 0, 0, TAU); g.fill();
      g.fillStyle = REG[r].color; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.2, pr * 0.32); g.beginPath(); g.arc(X, Y - pr * 0.6, pr, 0, TAU); g.fill(); g.stroke(); }
    // mawar angin
    const cx = o + k * 0.88; const cy = o + k * 0.86; const cr = k * 0.07; g.save(); g.translate(cx, cy); g.globalAlpha = 0.75;
    g.strokeStyle = '#fff7e0'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.stroke();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2; const l = i % 2 ? cr * 0.55 : cr * 1.12; g.fillStyle = i % 2 ? '#bae6fd' : (i === 0 ? '#f5b942' : '#fff7e0'); g.beginPath(); g.moveTo(Math.cos(a) * l, Math.sin(a) * l); g.lineTo(Math.cos(a + 0.4) * cr * 0.17, Math.sin(a + 0.4) * cr * 0.17); g.lineTo(Math.cos(a - 0.4) * cr * 0.17, Math.sin(a - 0.4) * cr * 0.17); g.closePath(); g.fill(); }
    g.font = `400 ${Math.round(cr * 0.42)}px "Titan One", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f5b942'; g.fillText('U', 0, -cr * 1.42); g.restore();
    // logo
    g.textAlign = 'center'; g.textBaseline = 'middle'; const ly = o + k * 0.075;
    if (k >= 330) { // di layar kecil logo cukup di bilah atas
      outlined(g, 'SAUDAGAR', o + k / 2, ly, k * 0.078, '#fde68a', '#5a2a0a', k * 0.016, undefined, k * 0.8);
      outlined(g, 'NUSANTARA', o + k / 2, ly + k * 0.07, k * 0.05, '#ffffff', '#0c4a6e', k * 0.012, undefined, k * 0.8);
    }
    g.restore();
    // bingkai dalam bertali
    g.strokeStyle = '#7a3d10'; g.lineWidth = Math.max(2, k * 0.008); g.strokeRect(o, o, k, k);
    g.setLineDash([k * 0.016, k * 0.01]); g.strokeStyle = '#f5b942'; g.lineWidth = Math.max(1, k * 0.004); g.strokeRect(o + k * 0.008, o + k * 0.008, k - k * 0.016, k - k * 0.016); g.setLineDash([]);
  }

  /* --- petak --- */
  const TYPE_LOOK = {
    prop: { bg: '#fdf5e4', band: null }, trans: { bg: '#eaf4fa', band: '#0f3b57' }, ilmu: { bg: '#f3edff', band: '#6d28d9' },
    kejut: { bg: '#fff1dc', band: '#ea580c' }, pajak: { bg: '#fdecec', band: '#b91c1c' }
  };
  function bandPattern(g, x, y, w, h, col) {
    g.fillStyle = col; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const u = Math.max(4, Math.min(w, h) * 0.42); g.fillStyle = 'rgba(255,255,255,.22)';
    for (let yy = y + u / 2, row = 0; yy < y + h + u; yy += u * 0.8, row++) for (let xx = x + (row % 2 ? u / 2 : 0); xx < x + w + u; xx += u) { g.beginPath(); g.ellipse(xx, yy, u * 0.26, u * 0.14, Math.PI / 4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(xx, yy, u * 0.26, u * 0.14, -Math.PI / 4, 0, TAU); g.fill(); }
    const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.restore();
  }
  const SHORT = { 'Pelabuhan Feri': 'Feri', 'Stasiun Kereta': 'Kereta', 'Terminal Bus': 'Bus', 'Kartu Kejutan': 'Kejutan', 'Kartu Ilmu': 'Ilmu', 'Pajak Daerah': 'Pajak', 'Labuan Bajo': 'L. Bajo', 'Banjarmasin': 'Banjar', 'Yogyakarta': 'Yogya', 'Balikpapan': 'Balikpapan' };
  function chipShape(g, cx, cy, w, h, fill, stroke) { rr(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(1, h * 0.08); g.stroke(); } }
  function chipLabel(t) { return t.type === 'prop' || t.type === 'trans' ? `🪙${t.price}` : t.type === 'ilmu' ? `+🪙${ILMU_BASE}` : t.type === 'kejut' ? '🍀 / ⚠️' : ''; }
  function drawTile(g, i) {
    const t = BOARD[i]; const r = rects[i];
    if (r.corner) { drawCorner(g, t, r); return; }
    const L = r.L; const look = TYPE_LOOK[t.type]; const rad = Math.min(L.w, L.h) * 0.08;
    rr(g, L.x, L.y, L.w, L.h, rad); g.fillStyle = look.bg; g.fill();
    g.save(); rr(g, L.x, L.y, L.w, L.h, rad); g.clip();
    bandPattern(g, ...L.band, t.type === 'prop' ? REG[t.reg].color : look.band);
    g.restore();
    g.strokeStyle = 'rgba(90,50,10,.35)'; g.lineWidth = 1; rr(g, L.x + 0.5, L.y + 0.5, L.w - 1, L.h - 1, rad); g.stroke();
    // ikon
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(L.cxB, L.yI + L.icon * 0.46, L.icon * 0.36, L.icon * 0.09, 0, 0, TAU); g.fill();
    g.fillStyle = '#000'; emo(g, t.icon, L.cxB, L.yI, L.icon);
    // nama
    g.fillStyle = '#2b1a07'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 7px "Baloo 2", sans-serif'; const nm2 = g.measureText(t.name).width > L.bw * 0.94 ? (SHORT[t.name] || t.name) : t.name;
    fitText(g, nm2, L.cxB, L.yN, L.bw * 0.94, L.fs, 800);
    // chip harga
    const ch = L.fs * 1.25; const cw = Math.min(L.bw * 0.9, L.fs * 4.4);
    chipShape(g, L.cxB, L.yC, cw, ch, t.type === 'prop' ? '#fff' : 'rgba(255,255,255,.75)', 'rgba(90,50,10,.35)');
    g.fillStyle = t.type === 'pajak' ? '#b91c1c' : '#5a2a0a'; fitText(g, chipLabel(t), L.cxB, L.yC + ch * 0.04, cw * 0.88, L.fs * 0.86, 800);
  }
  function drawCorner(g, t, r) {
    const gap = Math.max(1, BD.s * 0.002); const x = r.x + gap; const y = r.y + gap; const w = r.w - gap * 2; const h = r.h - gap * 2; const rad = w * 0.08;
    const col = { start: ['#5cc8f0', '#0b6aa2'], jail: ['#fde9a8', '#e9a83a'], park: ['#9be38c', '#2f8a3c'], storm: ['#64748b', '#111827'] }[t.type];
    g.save(); rr(g, x, y, w, h, rad); g.clip();
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; g.fillRect(x, y, w, h);
    const R = seeded(t.id + 5);
    if (t.type === 'start' || t.type === 'jail') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, w * 0.012); for (let i = 0; i < 7; i++) { const yy = y + h * (0.15 + R() * 0.75); const xx = x + w * R(); const s = w * 0.06; g.beginPath(); g.moveTo(xx - s, yy); g.quadraticCurveTo(xx - s / 2, yy - s * 0.5, xx, yy); g.quadraticCurveTo(xx + s / 2, yy + s * 0.5, xx + s, yy); g.stroke(); } }
    if (t.type === 'jail') { g.fillStyle = 'rgba(14,116,144,.55)'; g.beginPath(); g.moveTo(x, y + h * 0.72); g.quadraticCurveTo(x + w * 0.5, y + h * 0.62, x + w, y + h * 0.78); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.fill();
      g.strokeStyle = 'rgba(90,50,10,.7)'; g.lineWidth = Math.max(1.5, w * 0.018); for (let i = 0; i < 6; i++) { const xx = x + w * (0.12 + i * 0.15); g.beginPath(); g.moveTo(xx, y + h * 0.5); g.lineTo(xx, y + h * 0.66); g.stroke(); } g.beginPath(); g.moveTo(x + w * 0.08, y + h * 0.54); g.lineTo(x + w * 0.9, y + h * 0.54); g.stroke(); }
    if (t.type === 'park') { for (let i = 0; i < 26; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(20,83,45,.25)'; circ(g, x + w * R(), y + h * R(), w * (0.01 + R() * 0.015)); } }
    if (t.type === 'storm') { g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = Math.max(1, w * 0.02); for (let i = 1; i < 6; i++) { g.beginPath(); g.arc(x + w * 0.5, y + h * 0.42, w * 0.09 * i, i, i + 3.6); g.stroke(); }
      g.fillStyle = '#fde047'; g.beginPath(); const lx = x + w * 0.78; const ly = y + h * 0.12; g.moveTo(lx, ly); g.lineTo(lx - w * 0.07, ly + h * 0.15); g.lineTo(lx - w * 0.02, ly + h * 0.15); g.lineTo(lx - w * 0.08, ly + h * 0.3); g.lineTo(lx + w * 0.04, ly + h * 0.11); g.lineTo(lx - w * 0.01, ly + h * 0.11); g.closePath(); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(60,30,5,.5)'; g.lineWidth = 1.5; rr(g, x + 0.75, y + 0.75, w - 1.5, h - 1.5, rad); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.56, w * 0.22, w * 0.05, 0, 0, TAU); g.fill();
    g.fillStyle = '#000'; emo(g, t.icon, x + w / 2, y + h * 0.38, w * 0.38);
    const dark = t.type === 'jail' ? '#5a2a0a' : '#0b2233';
    const words = t.name.toUpperCase().split(' ');
    const ty = y + h * 0.73; const ts = w * 0.12;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (words.length > 1) { outlined(g, words[0], x + w / 2, ty, ts, '#fff', dark, ts * 0.32, undefined, w * 0.9); outlined(g, words.slice(1).join(' '), x + w / 2, ty + ts * 1.02, ts, '#fff', dark, ts * 0.32, undefined, w * 0.9); }
    else outlined(g, words[0], x + w / 2, ty + ts * 0.5, ts * 1.25, '#fde047', '#7f1d1d', ts * 0.4, undefined, w * 0.9);
    const sub = t.type === 'start' ? `+🪙${S.gaji} GAJI` : t.type === 'jail' ? 'mampir = aman' : t.type === 'park' ? 'bebas santai' : 'ke Karantina';
    g.fillStyle = 'rgba(255,255,255,.92)'; chipShape(g, x + w / 2, y + h * 0.12, w * 0.7, w * 0.13, t.type === 'storm' ? 'rgba(254,226,226,.95)' : 'rgba(255,255,255,.9)', 'rgba(60,30,5,.3)');
    g.fillStyle = t.type === 'storm' ? '#991b1b' : '#3b2508'; fitText(g, sub, x + w / 2, y + h * 0.125, w * 0.62, w * 0.085, 800);
    if (t.type === 'start') { // panah arah jalan
      g.fillStyle = '#fde047'; g.strokeStyle = '#7a3d10'; g.lineWidth = Math.max(1, w * 0.015); const ax = x + w * 0.8; const ay = y + h * 0.36; const s = w * 0.11;
      g.beginPath(); g.moveTo(ax - s, ay - s * 0.35); g.lineTo(ax, ay - s * 0.35); g.lineTo(ax, ay - s * 0.8); g.lineTo(ax + s * 0.9, ay); g.lineTo(ax, ay + s * 0.8); g.lineTo(ax, ay + s * 0.35); g.lineTo(ax - s, ay + s * 0.35); g.closePath(); g.fill(); g.stroke();
    }
  }
  function buildBoard() {
    const s = BD.s; const c = mkC(s * DPR, s * DPR); const g = c.getContext('2d'); g.scale(DPR, DPR);
    // bingkai kayu jati
    let gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#8a4a16'); gr.addColorStop(0.5, '#6b3510'); gr.addColorStop(1, '#4a2306');
    rr(g, 0, 0, s, s, s * 0.02); g.fillStyle = gr; g.fill();
    g.save(); rr(g, 0, 0, s, s, s * 0.02); g.clip(); g.strokeStyle = 'rgba(255,220,170,.08)'; g.lineWidth = 1; const R = seeded(5);
    for (let i = 0; i < 60; i++) { const y = R() * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + (R() - 0.5) * 20, s * 0.6, y + (R() - 0.5) * 20, s, y + (R() - 0.5) * 10); g.stroke(); } g.restore();
    g.strokeStyle = '#f5b942'; g.lineWidth = Math.max(1.5, s * 0.003); rr(g, BD.f * 0.45, BD.f * 0.45, s - BD.f * 0.9, s - BD.f * 0.9, s * 0.016); g.stroke();
    // titik emas pada bingkai
    g.fillStyle = 'rgba(245,185,66,.75)'; const step = BD.s / 40; for (let i = 0; i < 40; i++) { const p = step * (i + 0.5); [[p, BD.f * 0.45], [p, s - BD.f * 0.45], [BD.f * 0.45, p], [s - BD.f * 0.45, p]].forEach(([x, y]) => circ(g, x, y, Math.max(0.8, BD.f * 0.12))); }
    g.fillStyle = '#3a1d06'; g.fillRect(BD.f, BD.f, s - BD.f * 2, s - BD.f * 2);
    drawCenter(g);
    for (let i = 0; i < 32; i++) drawTile(g, i);
    return c;
  }

  /* --- bangunan mini (Warung, Toko, Ruko, Mal Megah) --- */
  function drawBuilding(g, lvl, cx, base, u) {
    g.save(); g.translate(cx, base); g.lineJoin = 'round';
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 0, u * 0.62, u * 0.1, 0, 0, TAU); g.fill();
    const ln = Math.max(0.8, u * 0.035); g.strokeStyle = 'rgba(40,20,5,.55)'; g.lineWidth = ln;
    if (lvl === 1) { // warung kayu beratap seng
      g.fillStyle = '#c47a35'; g.fillRect(-u * 0.42, -u * 0.48, u * 0.84, u * 0.48); g.strokeRect(-u * 0.42, -u * 0.48, u * 0.84, u * 0.48);
      g.fillStyle = '#7c2d12'; g.fillRect(-u * 0.3, -u * 0.36, u * 0.6, u * 0.18);
      g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(-u * 0.55, -u * 0.46); g.lineTo(0, -u * 0.8); g.lineTo(u * 0.55, -u * 0.46); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fde68a'; g.fillRect(-u * 0.12, -u * 0.62, u * 0.24, u * 0.09);
    } else if (lvl === 2) { // toko berkanopi garis
      g.fillStyle = '#fef3c7'; g.fillRect(-u * 0.5, -u * 0.72, u, u * 0.72); g.strokeRect(-u * 0.5, -u * 0.72, u, u * 0.72);
      g.fillStyle = '#1d4ed8'; g.fillRect(-u * 0.5, -u * 0.86, u, u * 0.16); g.strokeRect(-u * 0.5, -u * 0.86, u, u * 0.16);
      for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#fff' : '#ef4444'; g.beginPath(); g.moveTo(-u * 0.55 + i * u * 0.22, -u * 0.7); g.lineTo(-u * 0.55 + (i + 1) * u * 0.22, -u * 0.7); g.lineTo(-u * 0.55 + (i + 1) * u * 0.22, -u * 0.56); g.arc(-u * 0.55 + (i + 0.5) * u * 0.22, -u * 0.56, u * 0.11, 0, Math.PI); g.closePath(); g.fill(); }
      g.fillStyle = '#7dd3fc'; g.fillRect(-u * 0.4, -u * 0.4, u * 0.36, u * 0.26); g.fillStyle = '#92400e'; g.fillRect(u * 0.08, -u * 0.42, u * 0.26, u * 0.42);
    } else if (lvl === 3) { // ruko dua lantai
      g.fillStyle = '#e2e8f0'; g.fillRect(-u * 0.6, -u * 1.0, u * 1.2, u); g.strokeRect(-u * 0.6, -u * 1.0, u * 1.2, u);
      g.fillStyle = '#f97316'; g.fillRect(-u * 0.66, -u * 1.08, u * 1.32, u * 0.12);
      g.fillStyle = '#38bdf8'; for (let i = 0; i < 3; i++) { g.fillRect(-u * 0.5 + i * u * 0.36, -u * 0.86, u * 0.26, u * 0.24); }
      g.fillStyle = '#64748b'; g.fillRect(-u * 0.6, -u * 0.52, u * 1.2, u * 0.06);
      g.fillStyle = '#475569'; for (let i = 0; i < 3; i++) g.fillRect(-u * 0.52 + i * u * 0.36, -u * 0.42, u * 0.3, u * 0.42);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) g.fillRect(-u * 0.52 + i * u * 0.36, -u * 0.4 + j * u * 0.1, u * 0.3, u * 0.03);
    } else if (lvl === 4) { // mal megah berkubah
      g.fillStyle = '#cbd5e1'; g.fillRect(-u * 0.72, -u * 0.62, u * 1.44, u * 0.62); g.strokeRect(-u * 0.72, -u * 0.62, u * 1.44, u * 0.62);
      const gr = g.createLinearGradient(-u * 0.3, 0, u * 0.3, 0); gr.addColorStop(0, '#38bdf8'); gr.addColorStop(1, '#1e3a8a');
      g.fillStyle = gr; g.fillRect(-u * 0.32, -u * 1.42, u * 0.64, u * 1.42); g.strokeRect(-u * 0.32, -u * 1.42, u * 0.64, u * 1.42);
      g.strokeStyle = 'rgba(255,255,255,.45)'; for (let j = 1; j < 9; j++) { g.beginPath(); g.moveTo(-u * 0.3, -u * 0.16 * j); g.lineTo(u * 0.3, -u * 0.16 * j); g.stroke(); }
      g.fillStyle = '#f5b942'; g.beginPath(); g.arc(0, -u * 1.42, u * 0.3, Math.PI, 0); g.fill(); g.fillRect(-u * 0.02, -u * 1.95, u * 0.04, u * 0.25);
      g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(u * 0.02, -u * 1.95); g.lineTo(u * 0.22, -u * 1.88); g.lineTo(u * 0.02, -u * 1.81); g.fill();
      g.fillStyle = '#7dd3fc'; for (let i = 0; i < 2; i++) { g.fillRect(-u * 0.66 + i * u * 1.04, -u * 0.5, u * 0.28, u * 0.22); }
      g.fillStyle = '#f5b942'; g.fillRect(-u * 0.72, -u * 0.66, u * 1.44, u * 0.06);
    }
    g.restore();
  }
  function buildOwn() {
    const s = BD.s; const c = mkC(s * DPR, s * DPR); const g = c.getContext('2d'); g.scale(DPR, DPR);
    for (const t of BOARD) {
      if (t.owner < 0 || !P[t.owner]) continue; const r = rects[t.id]; const L = r.L; if (!L) continue; const col = P[t.owner].color;
      const lw = Math.max(2, s * 0.0045); g.strokeStyle = col; g.lineWidth = lw; rr(g, L.x + lw / 2, L.y + lw / 2, L.w - lw, L.h - lw, Math.min(L.w, L.h) * 0.08); g.stroke();
      if (t.level > 0) { // bangunan menggantikan ikon, ikon jadi kecil di pojok
        const iz = L.icon * 1.12; g.fillStyle = TYPE_LOOK.prop.bg; g.fillRect(L.cxB - L.bw * 0.48, L.yI - iz * 0.62, L.bw * 0.96, iz * 1.18);
        const u = L.icon * (t.level === 4 ? 0.58 : t.level === 3 ? 0.8 : 0.92); drawBuilding(g, t.level, L.cxB, L.yI + iz * 0.5, u);
        g.fillStyle = '#000'; emo(g, t.icon, L.cxB + L.bw * 0.34, L.yI - iz * 0.38, L.icon * 0.38);
        const pr = Math.max(1.6, L.fs * 0.17); for (let k = 0; k < 4; k++) { g.fillStyle = k < t.level ? '#f59e0b' : 'rgba(0,0,0,.18)'; circ(g, L.cxB - L.bw * 0.38, L.yI - iz * 0.42 + k * pr * 2.6, pr); }
      }
      // chip sewa berwarna pemilik
      const ch = L.fs * 1.25; const cw = Math.min(L.bw * 0.92, L.fs * 4.6);
      chipShape(g, L.cxB, L.yC, cw, ch, t.mort ? '#64748b' : col, '#fff');
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, t.mort ? 'DIGADAI' : `Sewa ${fmt(rentOf(t))}`, L.cxB, L.yC + ch * 0.04, cw * 0.88, L.fs * 0.82, 800);
      if (t.mort) { g.save(); rr(g, L.x, L.y, L.w, L.h, Math.min(L.w, L.h) * 0.08); g.clip(); g.fillStyle = 'rgba(71,85,105,.35)'; g.fillRect(L.x, L.y, L.w, L.h);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, L.fs * 0.2); for (let k = -L.h; k < L.w + L.h; k += L.fs * 1.1) { g.beginPath(); g.moveTo(L.x + k, L.y); g.lineTo(L.x + k - L.h, L.y + L.h); g.stroke(); } g.restore(); }
      // panji pemilik
      const [bx, by, bw, bh] = L.band; const fx = r.side === 'left' || r.side === 'right' ? bx + bw / 2 : bx + bw * 0.86; const fy = r.side === 'left' || r.side === 'right' ? by + bh * 0.86 : by + bh / 2;
      const fr = Math.max(3, Math.min(bw, bh) * 0.36); g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, fr * 0.3); g.beginPath(); g.arc(fx, fy, fr, 0, TAU); g.fill(); g.stroke();
    }
    // bendera pemilik grup di peta tengah
    const o = BD.f + BD.c; const k = BD.in;
    for (const reg of PINREG) { const ow = groupOwner(reg); if (ow < 0) continue; const [x, y] = PINS[reg]; const X = o + x * k; const Y = o + y * k - k * 0.02;
      g.strokeStyle = '#3b2508'; g.lineWidth = Math.max(1, k * 0.004); g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - k * 0.06); g.stroke();
      g.fillStyle = P[ow].color; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, k * 0.003); g.beginPath(); g.moveTo(X, Y - k * 0.06); g.lineTo(X + k * 0.045, Y - k * 0.048); g.lineTo(X, Y - k * 0.034); g.closePath(); g.fill(); g.stroke(); }
    return c;
  }

  /* --- bidak: Kapal Pinisi, Becak, Bajaj, Layang-layang Garuda --- */
  function drawPawn(g, kind, col, u) {
    g.lineJoin = 'round'; g.lineCap = 'round'; const ink = 'rgba(30,15,5,.7)'; g.strokeStyle = ink; g.lineWidth = Math.max(1, u * 0.035);
    const dk = shade(col, -0.35); const lt = shade(col, 0.35);
    if (kind === 'pinisi') {
      g.beginPath(); g.moveTo(-0.5 * u, -0.26 * u); g.quadraticCurveTo(-0.44 * u, 0, -0.22 * u, 0); g.lineTo(0.28 * u, 0); g.quadraticCurveTo(0.48 * u, -0.06 * u, 0.58 * u, -0.34 * u); g.lineTo(0.2 * u, -0.22 * u); g.closePath();
      let gr = g.createLinearGradient(0, -0.3 * u, 0, 0); gr.addColorStop(0, '#a0522d'); gr.addColorStop(1, '#5a2a0a'); g.fillStyle = gr; g.fill(); g.stroke();
      g.strokeStyle = col; g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(-0.46 * u, -0.17 * u); g.lineTo(0.48 * u, -0.19 * u); g.stroke();
      g.strokeStyle = '#3b2508'; g.lineWidth = u * 0.04; g.beginPath(); g.moveTo(-0.1 * u, -0.22 * u); g.lineTo(-0.1 * u, -1.0 * u); g.moveTo(0.16 * u, -0.22 * u); g.lineTo(0.16 * u, -0.9 * u); g.stroke();
      g.strokeStyle = ink; g.lineWidth = Math.max(1, u * 0.03);
      const sail = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u))); g.closePath(); gr = g.createLinearGradient(-0.4 * u, -0.9 * u, 0.4 * u, -0.3 * u); gr.addColorStop(0, '#fffdf5'); gr.addColorStop(1, '#f3e3bf'); g.fillStyle = gr; g.fill(); g.stroke(); };
      sail([[-0.12, -0.95], [-0.44, -0.32], [-0.12, -0.3]]); sail([[0.14, -0.86], [0.14, -0.32], [0.42, -0.34]]); sail([[0.2, -0.82], [0.6, -0.36], [0.44, -0.33]]);
      g.fillStyle = col; g.beginPath(); g.moveTo(-0.13 * u, -0.6 * u); g.lineTo(-0.3 * u, -0.6 * u); g.lineTo(-0.36 * u, -0.48 * u); g.lineTo(-0.13 * u, -0.48 * u); g.fill(); g.fillRect(0.15 * u, -0.62 * u, 0.2 * u, 0.1 * u);
      g.beginPath(); g.moveTo(-0.1 * u, -1.0 * u); g.lineTo(0.12 * u, -0.95 * u); g.lineTo(-0.1 * u, -0.9 * u); g.closePath(); g.fill();
    } else if (kind === 'becak') {
      const wheel = (x, r) => { g.fillStyle = '#1f2937'; g.beginPath(); g.arc(x * u, -r * u, r * u, 0, TAU); g.fill(); g.fillStyle = '#e5e7eb'; g.beginPath(); g.arc(x * u, -r * u, r * 0.45 * u, 0, TAU); g.fill(); g.strokeStyle = '#9ca3af'; g.lineWidth = u * 0.02; for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 4; g.beginPath(); g.moveTo(x * u + Math.cos(a) * r * u, -r * u + Math.sin(a) * r * u); g.lineTo(x * u - Math.cos(a) * r * u, -r * u - Math.sin(a) * r * u); g.stroke(); } g.strokeStyle = ink; };
      g.strokeStyle = '#374151'; g.lineWidth = u * 0.05; g.beginPath(); g.moveTo(-0.36 * u, -0.17 * u); g.lineTo(-0.12 * u, -0.48 * u); g.lineTo(0.1 * u, -0.25 * u); g.moveTo(-0.12 * u, -0.48 * u); g.lineTo(-0.22 * u, -0.58 * u); g.stroke();
      g.fillStyle = '#7c2d12'; g.fillRect(-0.3 * u, -0.6 * u, 0.16 * u, 0.05 * u);
      g.fillStyle = '#fcd9b6'; circ(g, -0.24 * u, -0.86 * u, 0.09 * u); g.fillStyle = '#d97706'; g.beginPath(); g.moveTo(-0.38 * u, -0.88 * u); g.lineTo(-0.24 * u, -1.02 * u); g.lineTo(-0.1 * u, -0.88 * u); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.fillRect(-0.3 * u, -0.77 * u, 0.12 * u, 0.18 * u);
      g.beginPath(); g.moveTo(0.02 * u, -0.2 * u); g.lineTo(0.56 * u, -0.2 * u); g.lineTo(0.6 * u, -0.52 * u); g.lineTo(0.06 * u, -0.56 * u); g.closePath(); g.fillStyle = col; g.fill(); g.stroke();
      g.fillStyle = lt; g.fillRect(0.12 * u, -0.46 * u, 0.36 * u, 0.1 * u);
      g.beginPath(); g.moveTo(0.04 * u, -0.56 * u); g.quadraticCurveTo(0.12 * u, -1.0 * u, 0.62 * u, -0.92 * u); g.lineTo(0.62 * u, -0.52 * u); g.lineTo(0.56 * u, -0.52 * u); g.quadraticCurveTo(0.52 * u, -0.82 * u, 0.12 * u, -0.6 * u); g.closePath(); g.fillStyle = dk; g.fill(); g.stroke();
      g.fillStyle = '#fde047'; for (let k = 0; k < 4; k++) circ(g, (0.22 + k * 0.12) * u, -0.9 * u + k * 0.01 * u, 0.025 * u);
      wheel(-0.36, 0.17); wheel(0.42, 0.17);
    } else if (kind === 'bajaj') {
      g.beginPath(); g.moveTo(-0.46 * u, -0.16 * u); g.lineTo(-0.46 * u, -0.62 * u); g.quadraticCurveTo(-0.44 * u, -0.86 * u, -0.1 * u, -0.86 * u); g.lineTo(0.18 * u, -0.86 * u); g.quadraticCurveTo(0.5 * u, -0.8 * u, 0.52 * u, -0.4 * u); g.lineTo(0.5 * u, -0.16 * u); g.closePath();
      const gr = g.createLinearGradient(0, -0.86 * u, 0, -0.16 * u); gr.addColorStop(0, lt); gr.addColorStop(0.5, col); gr.addColorStop(1, dk); g.fillStyle = gr; g.fill(); g.stroke();
      g.fillStyle = '#1f2937'; g.beginPath(); g.moveTo(-0.38 * u, -0.3 * u); g.lineTo(-0.38 * u, -0.66 * u); g.quadraticCurveTo(-0.36 * u, -0.76 * u, -0.18 * u, -0.76 * u); g.lineTo(-0.02 * u, -0.76 * u); g.lineTo(-0.02 * u, -0.3 * u); g.closePath(); g.fill();
      g.fillStyle = '#bae6fd'; g.beginPath(); g.moveTo(0.06 * u, -0.76 * u); g.lineTo(0.2 * u, -0.76 * u); g.quadraticCurveTo(0.4 * u, -0.7 * u, 0.42 * u, -0.48 * u); g.lineTo(0.06 * u, -0.48 * u); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fde047'; circ(g, 0.47 * u, -0.3 * u, 0.05 * u);
      g.fillStyle = '#fff'; g.fillRect(-0.46 * u, -0.5 * u, 0.98 * u, 0.04 * u);
      const wheel = (x) => { g.fillStyle = '#111827'; circ(g, x * u, -0.13 * u, 0.13 * u); g.fillStyle = '#cbd5e1'; circ(g, x * u, -0.13 * u, 0.055 * u); };
      wheel(-0.3); wheel(0.34);
    } else { // layang-layang garuda
      g.strokeStyle = 'rgba(60,40,20,.55)'; g.lineWidth = Math.max(1, u * 0.015); g.beginPath(); g.moveTo(0.02 * u, -0.25 * u); g.quadraticCurveTo(0.2 * u, -0.1 * u, 0.06 * u, 0); g.stroke();
      g.strokeStyle = col; g.lineWidth = u * 0.045; g.beginPath(); g.moveTo(0, -0.3 * u); g.bezierCurveTo(-0.16 * u, -0.2 * u, 0.14 * u, -0.12 * u, -0.06 * u, -0.02 * u); g.stroke();
      [[-0.1, -0.2], [0.04, -0.12]].forEach(([x, y]) => { g.fillStyle = '#fde047'; g.beginPath(); g.moveTo(x * u, y * u); g.lineTo((x - 0.06) * u, (y + 0.03) * u); g.lineTo((x - 0.06) * u, (y - 0.03) * u); g.closePath(); g.fill(); });
      g.beginPath(); g.moveTo(0, -1.04 * u); g.lineTo(0.46 * u, -0.66 * u); g.lineTo(0, -0.28 * u); g.lineTo(-0.46 * u, -0.66 * u); g.closePath();
      const gr = g.createLinearGradient(-0.46 * u, -1 * u, 0.46 * u, -0.3 * u); gr.addColorStop(0, lt); gr.addColorStop(1, dk); g.fillStyle = gr; g.fill(); g.strokeStyle = ink; g.lineWidth = Math.max(1, u * 0.035); g.stroke();
      g.fillStyle = '#f5b942'; g.strokeStyle = '#92400e'; g.lineWidth = Math.max(0.8, u * 0.02);
      for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(0, -0.66 * u); g.quadraticCurveTo(sg * 0.2 * u, -0.86 * u, sg * 0.38 * u, -0.7 * u); g.lineTo(sg * 0.3 * u, -0.64 * u); g.lineTo(sg * 0.32 * u, -0.58 * u); g.lineTo(sg * 0.22 * u, -0.56 * u); g.quadraticCurveTo(sg * 0.1 * u, -0.58 * u, 0, -0.56 * u); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = '#fde68a'; circ(g, 0, -0.78 * u, 0.07 * u); g.fillStyle = '#b45309'; g.beginPath(); g.moveTo(0.05 * u, -0.79 * u); g.lineTo(0.12 * u, -0.76 * u); g.lineTo(0.05 * u, -0.74 * u); g.fill(); g.fillStyle = '#111'; circ(g, 0.02 * u, -0.8 * u, 0.015 * u);
      g.beginPath(); g.moveTo(-0.06 * u, -0.5 * u); g.lineTo(0, -0.38 * u); g.lineTo(0.06 * u, -0.5 * u); g.closePath(); g.fillStyle = '#f5b942'; g.fill();
    }
  }
  function pawnSprite(p, px) {
    const key = p.kind + p.color + Math.round(px);
    if (p.sprite && p.spriteKey === key) return p.sprite;
    const S2 = Math.ceil(px * 1.5 * DPR); const c = mkC(S2, S2); const g = c.getContext('2d'); g.scale(DPR, DPR);
    g.translate(px * 0.75, px * 1.2); drawPawn(g, p.kind, p.color, px);
    p.sprite = c; p.spriteKey = key; return c;
  }
  function pawnImg(p) {
    if (p.img) return p.img; const c = mkC(96, 96); const g = c.getContext('2d');
    g.translate(48, 82); drawPawn(g, p.kind, p.color, 64); p.img = c.toDataURL(); return p.img;
  }

  /* ------------------------------ Partikel (koordinat papan) ------------------------------ */
  const parts = []; let flashA = 0; let flashC = '255,255,255'; let shakeT = 0; let shakeP = 0; let time = 0;
  function addP(p) { if (parts.length < 320) parts.push(p); }
  function sparks(x, y, n, sp, cols) { n = PN(n); for (let i = 0; i < n; i++) { const a = Math.random() * TAU; const v = rnd(0.3, 1) * sp; addP({ t: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: rnd(0.35, 0.8), max: 0.8, c: QC.pick(cols), w: rnd(1.5, 3.2) }); } }
  function coinsP(x, y, n, sp) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rnd(-1.1, 1.1); const v = rnd(0.5, 1) * sp; addP({ t: 'c', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.8, 1.2), max: 1.2, w: rnd(4, 7), rot: Math.random() * 6 }); } }
  function dust(x, y, n, sz) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU; addP({ t: 'k', x: x + Math.cos(a) * sz * 0.3, y: y + Math.sin(a) * sz * 0.1, vx: Math.cos(a) * sz * 1.2, vy: -rnd(0.2, 0.6) * sz, r: sz * rnd(0.12, 0.22), gr: sz * 0.5, life: rnd(0.4, 0.7), max: 0.7, c: '235,225,205' }); } }
  function ringP(x, y, r1, c, life = 0.6, w = 4) { addP({ t: 'r', x, y, r1, c, life, max: life, w }); }
  function confettiP(x, y, n, cols) { n = PN(n); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rnd(-1.3, 1.3); const v = rnd(120, 340); addP({ t: 'f', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: rnd(-10, 10), life: rnd(1.2, 2), max: 2, c: QC.pick(cols), w: rnd(4, 8) }); } }
  function swirl(x, y, n, rad) { for (let i = 0; i < n; i++) addP({ t: 'w', x, y, a: Math.random() * TAU, rr: rad * rnd(0.3, 1), va: rnd(5, 9), life: rnd(0.9, 1.5), max: 1.5, c: QC.pick(['226,232,240', '148,163,184', '203,213,225']) }); }
  function updParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.t === 's' || p.t === 'k') { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.vy += (p.t === 's' ? 0.12 : -0.02) * dt * 60; p.vx *= 0.96; }
      else if (p.t === 'c') { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.vy += 0.35 * dt * 60; p.rot += dt * 8; }
      else if (p.t === 'f') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vx *= 0.985; p.rot += p.vr * dt; }
      else if (p.t === 'w') { p.a += p.va * dt; p.rr *= 1 + dt * 0.4; }
    }
  }
  function drawParts(g) {
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.t === 's') { g.globalAlpha = Math.min(1, k * 1.6); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.w * (0.5 + k * 0.5), 0, TAU); g.fill(); }
      else if (p.t === 'c') { g.globalAlpha = Math.min(1, k * 2); const sx = Math.abs(Math.cos(p.rot)); g.fillStyle = '#f59e0b'; g.beginPath(); g.ellipse(p.x, p.y, p.w * Math.max(0.2, sx), p.w, 0, 0, TAU); g.fill(); g.fillStyle = '#fde68a'; g.beginPath(); g.ellipse(p.x, p.y, p.w * 0.6 * Math.max(0.2, sx), p.w * 0.6, 0, 0, TAU); g.fill(); }
      else if (p.t === 'k') { g.globalAlpha = k * 0.55; g.fillStyle = `rgb(${p.c})`; g.beginPath(); g.arc(p.x, p.y, p.r + (1 - k) * p.gr, 0, TAU); g.fill(); }
      else if (p.t === 'r') { g.globalAlpha = k; g.strokeStyle = p.c; g.lineWidth = p.w * k + 0.5; g.beginPath(); g.arc(p.x, p.y, p.r1 * (1 - k * k), 0, TAU); g.stroke(); }
      else if (p.t === 'f') { g.globalAlpha = Math.min(1, k * 2); g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); g.restore(); }
      else if (p.t === 'w') { g.globalAlpha = Math.min(1, k * 1.5) * 0.8; g.fillStyle = `rgb(${p.c})`; g.beginPath(); g.arc(p.x + Math.cos(p.a) * p.rr, p.y + Math.sin(p.a) * p.rr * 0.7, 2 + p.rr * 0.06, 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
  }

  /* ------------------------------ Gambar tiap frame ------------------------------ */
  function pawnSize() { return clamp(BD.w * 0.52, 14, 66); }
  function slotOf(p) {
    const i = p.pos; const r = rects[i]; if (!r) return [0, 0];
    const here = P.filter((q) => !q.out && q.pos === i && (i !== JAIL || q.jail === p.jail)); const n = here.length; const k = here.indexOf(p);
    // alas bidak diletakkan di area ikon agar nama kota & harga tetap terbaca
    let cx = r.cx; let base = r.y + r.h * 0.6; let d = Math.min(r.w, r.h);
    if (r.L) { cx = r.L.cxB; base = r.L.yI + r.L.icon * 0.55; d = Math.min(r.L.bw, r.L.box[3]); }
    if (i === JAIL) { cx = r.x + r.w * (p.jail ? 0.6 : 0.24); base = r.y + r.h * (p.jail ? 0.52 : 0.64); d = r.w * 0.7; }
    if (n <= 1) return [cx, base];
    const off = [[-0.22, -0.06], [0.22, -0.06], [-0.22, 0.12], [0.22, 0.12]][k] || [0, 0];
    return [cx + off[0] * d, base + off[1] * d];
  }
  function pawnPos(p, now) {
    const a = p.anim; if (!a) return [...slotOf(p), 0];
    const k = clamp((now - a.t0) / a.dur, 0, 1); const e = a.ease ? easeOut(k) : k;
    return [a.a[0] + (a.b[0] - a.a[0]) * e, a.a[1] + (a.b[1] - a.a[1]) * e, Math.sin(Math.PI * k) * a.h];
  }
  function drawPawns(g, now) {
    const px = pawnSize(); const list = P.filter((p) => !p.out).map((p) => ({ p, pos: pawnPos(p, now) })).sort((a, b) => a.pos[1] - b.pos[1]);
    for (const { p, pos } of list) {
      const [x, y, hop] = pos; const kite = p.kind === 'layang'; const bob = kite ? px * (0.16 + Math.sin(time * 2.2 + p.id) * 0.05) : 0;
      const active = p.id === turn && !['idle', 'brief', 'over'].includes(phase);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, px * (0.36 - hop / px * 0.08), px * 0.1, 0, 0, TAU); g.fill();
      if (active) { const pu = 0.5 + 0.5 * Math.sin(time * 5); g.strokeStyle = rgba(p.color, 0.5 + pu * 0.5); g.lineWidth = 2 + pu * 1.5; g.beginPath(); g.ellipse(x, y, px * 0.48, px * 0.15, 0, 0, TAU); g.stroke(); }
      const spr = pawnSprite(p, px); const w = spr.width / DPR; const h = spr.height / DPR;
      const sq = p.anim && p.anim.land ? 1 : 1;
      g.drawImage(spr, x - w / 2, y - h * 0.8 - hop - bob, w, h * sq);
    }
  }
  function drawLive(now) {
    const g = ctx; const s = BD.s; const o = BD.f + BD.c; const k = BD.in;
    // kilau ombak tengah papan
    g.lineCap = 'round'; g.lineWidth = 1.4;
    for (let i = 0; i < 10; i++) { const x = o + k * (0.08 + ((i * 0.37 + time * 0.004) % 0.84)); const y = o + k * (0.56 + (i % 5) * 0.08); const a = 0.5 + 0.5 * Math.sin(time * 1.6 + i * 1.7); g.strokeStyle = `rgba(255,255,255,${0.08 + a * 0.18})`; const w = k * 0.012; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - w * 0.6, x + w, y); g.stroke(); }
    // perahu kecil berlayar
    const bt = (time * 0.018) % 2; const bx = o + k * (0.08 + 0.64 * (bt < 1 ? bt : 2 - bt)); const by = o + k * (0.88 + Math.sin(time * 1.3) * 0.006); const bu = k * 0.04; const dir = bt < 1 ? 1 : -1;
    g.save(); g.translate(bx, by); g.scale(dir, 1); g.fillStyle = '#7c3a12'; g.beginPath(); g.moveTo(-bu, -bu * 0.2); g.lineTo(bu, -bu * 0.2); g.lineTo(bu * 0.7, bu * 0.15); g.lineTo(-bu * 0.75, bu * 0.15); g.closePath(); g.fill();
    g.fillStyle = '#fff8e7'; g.beginPath(); g.moveTo(-bu * 0.05, -bu * 1.25); g.lineTo(bu * 0.75, -bu * 0.3); g.lineTo(-bu * 0.05, -bu * 0.3); g.closePath(); g.fill(); g.fillStyle = '#f5b942'; g.beginPath(); g.moveTo(-bu * 0.15, -bu * 1.1); g.lineTo(-bu * 0.7, -bu * 0.3); g.lineTo(-bu * 0.15, -bu * 0.3); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-bu * 1.1, bu * 0.25); g.lineTo(-bu * 2.2, bu * 0.3); g.stroke(); g.restore();
    // petak sorotan (petak tempat mendarat)
    if (focusTile >= 0 && rects[focusTile]) {
      const r = rects[focusTile]; const a = clamp((now - focusT0) / 350, 0, 1);
      g.fillStyle = `rgba(2,16,26,${0.3 * a})`; g.beginPath(); g.rect(0, 0, s, s); g.rect(r.x + r.w, r.y, -r.w, r.h); g.fill('evenodd');
      const pu = 0.5 + 0.5 * Math.sin(time * 6); g.strokeStyle = `rgba(253,224,71,${0.55 + 0.45 * pu})`; g.lineWidth = 3 + pu * 2.5; rr(g, r.x - 2, r.y - 2, r.w + 4, r.h + 4, Math.min(r.w, r.h) * 0.1); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${0.25 * pu})`; g.lineWidth = 8 + pu * 6; g.stroke();
    }
    if (hoverTile >= 0 && hoverTile !== focusTile && rects[hoverTile]) { const r = rects[hoverTile]; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; rr(g, r.x + 1, r.y + 1, r.w - 2, r.h - 2, Math.min(r.w, r.h) * 0.08); g.stroke(); }
    drawPawns(g, now); drawParts(g);
  }
  function drawSky() {
    const g = ctx;
    g.lineCap = 'round'; g.lineWidth = 1.6;
    for (const p of glints) { const a = Math.sin(time * p.v + p.ph); if (a < 0.2) continue; g.strokeStyle = `rgba(230,252,255,${(a - 0.2) * 0.45})`; g.beginPath(); g.moveTo(p.x - p.s, p.y); g.quadraticCurveTo(p.x - p.s / 2, p.y - p.s * 0.45, p.x, p.y); g.quadraticCurveTo(p.x + p.s / 2, p.y + p.s * 0.45, p.x + p.s, p.y); g.stroke(); }
    if (cloudC) for (const c of clouds) { const cw = 240 * c.s * clamp(W / 1400, 0.5, 1.3); const ch = cw / 2; const x = c.x * (W + cw) - cw; const y = c.y * H;
      g.globalAlpha = 0.28; g.drawImage(cloudSh, x + cw * 0.12, y + ch * 0.5, cw, ch); g.globalAlpha = 0.85; g.drawImage(cloudC, x, y, cw, ch); g.globalAlpha = 1; }
  }
  function draw(now) {
    if (!W || !H) return false;
    const built = ensureCaches();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(seaC, 0, 0, W, H); drawSky();
    let sx = 0; let sy = 0; if (shakeT > 0) { const k = shakeT / 0.45; sx = rnd(-1, 1) * shakeP * k; sy = rnd(-1, 1) * shakeP * k; }
    ctx.setTransform(DPR, 0, 0, DPR, DPR * (BD.x + sx), DPR * (BD.y + sy));
    ctx.drawImage(boardC, 0, 0, BD.s, BD.s); ctx.drawImage(ownC, 0, 0, BD.s, BD.s);
    drawLive(now);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (flashA > 0.01) { ctx.fillStyle = `rgba(${flashC},${flashA})`; ctx.fillRect(0, 0, W, H); }
    return built;
  }

  /* ------------------------------ Loop (hanya saat perlu) ------------------------------ */
  let raf = 0; let last = 0; let acc = 0;
  const perf = { ms: 0, max: 0, n: 0, sum: 0, builds: 0, buildMax: 0, slow: [], reset() { this.ms = 0; this.max = 0; this.n = 0; this.sum = 0; this.builds = 0; this.buildMax = 0; this.slow = []; } };
  const liveAnim = () => P.some((p) => p.anim) || parts.length > 0 || flashA > 0.01 || shakeT > 0;
  const loopOn = () => phase !== 'idle' && phase !== 'over' && !document.hidden && W > 0;
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; acc += dt;
    const live = liveAnim();
    const iv = live ? (LITE ? 1 / 30 : 0) : QC.isBusy() ? 1 : LITE ? 1 / 12 : 1 / 20; // bergerak = penuh (ringan 30), diam = 20 fps (ringan 12), pop-up = 1 fps
    if (acc >= iv - 0.002) {
      const t0 = performance.now(); let built = false;
      try { update(Math.min(acc, 1 / 15)); built = draw(now); } catch (err) { console.error(err); }
      acc = 0; const el = performance.now() - t0;
      if (!built) { perf.ms = perf.ms ? perf.ms * 0.95 + el * 0.05 : el; perf.n++; perf.sum += el; perf.max = Math.max(perf.max, el); if (el > 8 && perf.slow.length < 20) perf.slow.push(`${el.toFixed(1)}ms ${phase} p${parts.length}`); }
    }
    if (loopOn() || liveAnim()) raf = requestAnimationFrame(frame);
  }
  function redraw() { if (!raf) { try { draw(performance.now()); } catch (e) { console.error(e); } } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && loopOn()) wake(); });
  function update(dt) {
    time += dt; updParts(dt);
    for (const c of clouds) { c.x += c.v * dt; if (c.x > 1.02) { c.x = -0.02; c.y = 0.06 + Math.random() * 0.82; } }
    flashA = Math.max(0, flashA - dt * 2.2); shakeT = Math.max(0, shakeT - dt);
  }
  function flash(c, a) { flashC = c; flashA = a; wake(); }
  function shake(p = 6, t = 0.4) { shakeP = p; shakeT = t; wake(); }

  /* ------------------------------ Dadu CSS 3D ------------------------------ */
  const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  const FACE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
  const dieRot = [[0, 0], [0, 0]];
  function faceHTML(n) { return `<div class="face f${n}${n === 1 || n === 4 ? ' red' : ''}">${PIPS[n].map((k) => `<i style="grid-area:${Math.ceil(k / 3)}/${((k - 1) % 3) + 1}"></i>`).join('')}</div>`; }
  function buildDice() { $('dice').innerHTML = [0, 1].map((i) => `<div class="die" id="die${i}"><div class="cube">${[1, 2, 3, 4, 5, 6].map(faceHTML).join('')}</div></div>`).join(''); setDie(0, dice[0], 0); setDie(1, dice[1], 0); }
  function setDie(i, n, dur, spin = 0) {
    const [fx, fy] = FACE_ROT[n]; const [ox, oy] = dieRot[i];
    const nx = spin ? fx + 360 * Math.ceil((ox - fx) / 360 + spin) : fx; const ny = spin ? fy + 360 * Math.ceil((oy - fy) / 360 + spin + (i ? 0.5 : 0)) : fy;
    dieRot[i] = [nx, ny];
    const cube = document.querySelector(`#die${i} .cube`); if (!cube) return;
    cube.style.transition = dur ? `transform ${dur}s cubic-bezier(.18,.7,.25,1)` : 'none';
    cube.style.transform = `rotateX(-18deg) rotateY(${i ? -22 : 24}deg) rotateX(${nx}deg) rotateY(${ny}deg)`;
  }
  async function animateDice(a, b, quick) {
    const box = $('dice'); box.classList.remove('dbl'); box.removeAttribute('data-sum'); SND.shake();
    const dur = (quick ? 0.5 : 0.75) * TS; // ≤ 0,8 detik
    [0, 1].forEach((i) => { const d = $('die' + i); if (!d) return; d.style.setProperty('--dur', dur + 's'); d.style.setProperty('--dx', (i ? 1 : -1) * rnd(6, 22) + 'px'); d.classList.remove('toss'); void d.offsetWidth; d.classList.add('toss'); });
    setDie(0, a, dur, 2 + Math.random()); setDie(1, b, dur * 1.04, 2 + Math.random());
    await wait(dur * 1000 * 0.62); SND.land(0); await wait(dur * 1000 * 0.44);
    if (a === b) box.classList.add('dbl');
    box.setAttribute('data-sum', a === b ? `${a + b} • KEMBAR!` : `= ${a + b}`); box.setAttribute('data-sum-s', `= ${a + b}`); // jumlah dadu tampil di samping dadu (tidak menutupi pop-up soal)
  }

  /* ------------------------------ Keuangan: sewa, krisis, aset ------------------------------ */
  const owned = (pid) => BOARD.filter((t) => t.owner === pid);
  const transCount = (pid) => TRANS.filter((id) => BOARD[id].owner === pid).length;
  function groupOwner(reg) { const ids = GROUPS[reg]; const o = BOARD[ids[0]].owner; return o >= 0 && ids.every((id) => BOARD[id].owner === o) ? o : -1; }
  // boleh membangun bila memiliki minimal 2 kota di grup itu (grup 2 kota = harus lengkap)
  const BUILD_NEED = 2;
  const ownInReg = (reg, pid) => GROUPS[reg].filter((id) => BOARD[id].owner === pid).length;
  const canBuildReg = (reg, pid) => pid >= 0 && ownInReg(reg, pid) >= Math.min(BUILD_NEED, GROUPS[reg].length);
  const groupBuilt = (reg) => GROUPS[reg].some((id) => BOARD[id].level > 0);
  const groupMort = (reg) => GROUPS[reg].some((id) => BOARD[id].mort);
  // Krisis (mode Eliminasi): tahap 1 = sewa ×2, tahap 2 = ×3, tahap 3+ = ×4; biaya hidup per giliran naik tiap ronde
  const krisisStage = (r = round) => (elimMode() && r >= KRISIS.from ? r - KRISIS.from + 1 : 0);
  const multAt = (r) => { const s = krisisStage(r); return s ? Math.min(KRISIS.max, 1 + KRISIS.step * s) : 1; };
  const rentMult = () => multAt(round);
  const livingCost = (r = round) => (elimMode() && r >= KRISIS.livingFrom ? KRISIS.living * (r - KRISIS.livingFrom + 1) : 0);
  const lowLine = () => Math.max(400, Math.round((S.cash * 0.25) / 50) * 50);
  const riskLine = () => Math.round((S.cash * 0.3) / 50) * 50;
  function baseRent(t) {
    if (t.type === 'trans') return TR_RENT[transCount(t.owner)] || 0;
    if (t.level > 0) return t.rent[t.level];
    return t.rent[0] * (groupOwner(t.reg) === t.owner && !groupMort(t.reg) ? 2 : 1);
  }
  function rentOf(t) { const o = P[t.owner]; return baseRent(t) * rentMult() * (o && o.promo ? 2 : 1); }
  function worth(p) { let props = 0; let bld = 0; for (const t of BOARD) if (t.owner === p.id) { props += t.mort ? t.price / 2 : t.price; bld += t.level * (t.build || 0); } return { cash: p.cash, props, bld, total: p.cash + props + bld }; }
  const buildCost = (p, t) => (p.keep && p.keep.builder ? Math.round(t.build / 2) : t.build);
  function buildWhy(p, t) {
    if (!t || t.type !== 'prop') return 'Hanya kota yang bisa dibangun';
    if (t.owner !== p.id) return 'Kota ini bukan milikmu';
    if (!canBuildReg(t.reg, p.id)) return `Kuasai minimal ${Math.min(BUILD_NEED, GROUPS[t.reg].length)} kota ${REG[t.reg].name} dulu`;
    if (groupMort(t.reg)) return 'Tebus dulu kota yang digadai di grup ini';
    if (t.level >= 4) return 'Sudah Mal Megah (tingkat tertinggi)';
    if (buildLocked && p.id === turn && !(p.keep && p.keep.builder)) return 'Pembangunan gagal giliran ini — coba lagi giliran berikutnya';
    if (p.cash < buildCost(p, t)) return `Koin kurang (butuh ${coin(buildCost(p, t))})`;
    return '';
  }
  const buildable = (p) => owned(p.id).filter((t) => t.type === 'prop' && canBuildReg(t.reg, p.id));
  const canBuildNow = (p) => buildable(p).some((t) => !buildWhy(p, t));
  const canRedeem = (p) => owned(p.id).some((t) => t.mort && p.cash >= t.redeem);
  const canAct = () => { const p = cur(); return p && !p.ai && ['roll', 'end'].includes(phase) && !QC.isBusy(); };

  /* ------------------------------ Tim & anggota ------------------------------ */
  function parseMembers(txt) {
    const s = String(txt || '').trim(); if (!s) return [];
    if (/^\d{1,2}$/.test(s)) { const n = clamp(+s, 1, 12); return Array.from({ length: n }, (_, i) => `Anggota ${i + 1}`); }
    return s.split(/[,;\n]+/).map((x) => x.trim().slice(0, 18)).filter(Boolean).slice(0, 12);
  }
  const peekAnswerer = (p) => (p && p.members && p.members.length ? p.members[p.mi % p.members.length] : null);
  function takeAnswerer(p) { const m = peekAnswerer(p); if (m) p.mi = (p.mi + 1) % p.members.length; return m; }
  const keepBadges = (p) => Object.keys(KEEP).filter((k) => p.keep && p.keep[k] > 0).map((k) => `<span class="bdg" title="${KEEP[k].t}${p.keep[k] > 1 ? ' ×' + p.keep[k] : ''}">${KEEP[k].ic}${p.keep[k] > 1 ? '<i>' + p.keep[k] + '</i>' : ''}</span>`).join('');

  /* ------------------------------ HUD ------------------------------ */
  function setText(el, v) { v = String(v); if (el && el.textContent !== v) el.textContent = v; }
  function setHTML(el, v) { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } }
  const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function renderInfo() {
    const cap = maxRounds();
    setText($('roundNo'), cap === Infinity ? round : Math.min(round, cap)); setText($('roundMax'), cap === Infinity ? '' : '/' + cap);
    const lim = timeLimit(); const el = tStart && phase !== 'idle' ? Date.now() - tStart : 0;
    setText($('clockLbl'), lim ? 'SISA WAKTU' : 'WAKTU'); setText($('clockNo'), lim ? clock(lim - el) : clock(el));
    $('clockNo').parentElement.classList.toggle('warn', !!lim && lim - el < 60000 && phase !== 'idle');
    const duel = elimMode() && P.length > 2 && alive().length === 2 && phase !== 'idle'; $('aliveNo').parentElement.classList.toggle('duel', duel);
    setText($('aliveLbl'), duel ? '⚔️ DUEL FINAL' : elimMode() ? (teamMode() ? 'TIM BERTAHAN' : 'BERTAHAN') : teamMode() ? 'TIM' : 'SAUDAGAR');
    setText($('aliveNo'), P.length ? `${alive().length}/${P.length}` : '0');
    const kb = $('krBox'); const st = P.length && !['idle'].includes(phase) ? krisisStage() : 0; if (kb) { kb.hidden = !elimMode(); kb.classList.toggle('on', st > 0); setText($('krNo'), st ? `×${rentMult()}${livingCost() ? ' • −' + fmt(livingCost()) : ''}` : `R${KRISIS.from}`); kb.title = st ? `Krisis: sewa ×${rentMult()}${livingCost() ? `, biaya hidup ${coin(livingCost())} per giliran` : ''}` : `Krisis mulai ronde ${KRISIS.from}`; }
  }
  let plSig = '';
  function renderPlayers(force) {
    const el = $('players'); const sig = P.map((p) => p.name + p.color + p.kind + (p.members ? p.members.length : 0)).join('|') + S.mode + S.win;
    if (force || sig !== plSig || el.children.length !== P.length) {
      plSig = sig;
      el.innerHTML = P.map((p, i) => `<div class="pl" id="pl${i}" style="--pc:${p.color}" title="Klik untuk melihat aset"><span class="pl-badge">▶ GILIRAN</span>
        <img class="pl-av" src="${pawnImg(p)}" alt="${esc(KIND_NAME[p.kind])}">
        <div class="pl-name"><span>${esc(p.name)}</span>${p.ai ? '<em class="pl-tag">🤖</em>' : ''}<span class="pl-flags"></span></div>
        <div class="pl-cash">🪙 <b id="cash${i}">${fmt(p.cash)}</b><small>KOIN</small></div>
        <div class="pl-row"><span title="Total kekayaan">💎 <b class="nw">0</b></span><span title="Jumlah properti">🏠 <b class="np">0</b></span>${teamMode() && p.members && p.members.length ? `<span class="pl-mem" title="Anggota tim">👥 ${p.members.length}</span>` : ''}<span class="pl-ans"></span><span class="pl-groups" title="Grup warna">${PINREG.map((r) => `<i style="--rc:${REG[r].color}" data-r="${r}"></i>`).join('')}</span></div>
        <span class="pl-stamp">${elimMode() ? 'TERSINGKIR' : 'BANGKRUT'}</span><span class="pl-place"></span><span class="pl-low">⚠️ Uang menipis!</span></div>`).join('');
      P.forEach((p, i) => { p.shown = p.cash; $('pl' + i).onclick = () => { if (!QC.isBusy() && phase !== 'idle') { holdAuto(); openAssets(i); } }; });
    }
    const inPlay = !['idle', 'brief', 'over'].includes(phase);
    P.forEach((p, i) => {
      const c = $('pl' + i); if (!c) return;
      const act = inPlay && i === turn && !p.out;
      c.classList.toggle('active', act); c.classList.toggle('out', !!p.out);
      const low = inPlay && !p.out && p.cash < lowLine(); c.classList.toggle('danger', low);
      const ord = elimLog.find((e) => e.id === i); setText(c.querySelector('.pl-place'), p.out && ord ? `💀 #${ord.place}` : '');
      const w = worth(p); setText(c.querySelector('.nw'), fmt(w.total)); setText(c.querySelector('.np'), owned(i).length);
      setHTML(c.querySelector('.pl-flags'), (p.jail ? '<span class="bdg" title="Di Pulau Karantina">🏝️</span>' : '') + keepBadges(p) + (p.promo ? '<span class="bdg hot" title="Promo Wisata: sewa ×2">📸</span>' : '') + (p.streak >= 2 ? `<span class="bdg" title="Jawaban benar beruntun">🔥${p.streak}</span>` : '') + (p.stars ? `<span class="bdg star" title="Bintang Penyelamat dari Soal Rebutan">⭐${p.stars > 1 ? p.stars : ''}</span>` : ''));
      const ans = act && !p.ai ? (curAnswerer || (peekAnswerer(p) && peekAnswerer(p).name)) : null;
      const a = c.querySelector('.pl-ans'); setText(a, ans ? `🙋 ${ans}` : ''); a.classList.toggle('on', !!ans);
      c.querySelectorAll('.pl-groups i').forEach((d) => { const ids = GROUPS[d.dataset.r]; const n = ids.filter((id) => BOARD[id].owner === i).length; d.className = n === ids.length ? 'full' : n ? 'half' : ''; });
      if (p.cash !== p.shown) {
        const from = p.shown; p.shown = p.cash; const cEl = $('cash' + i);
        FX.countUp(cEl, from, p.cash, 750, fmt); FX.floatTextAt(cEl, (p.cash > from ? '+' : '−') + fmt(Math.abs(p.cash - from)), p.cash > from ? '#4ade80' : '#f87171', 30);
        c.classList.remove('gain', 'hit'); void c.offsetWidth; c.classList.add(p.cash > from ? 'gain' : 'hit');
      }
    });
  }
  function addLog(p, html, delta = 0) {
    logList.unshift({ p, html, delta }); if (logList.length > 80) logList.pop();
    const ol = $('log'); const li = document.createElement('li'); if (p) li.style.setProperty('--pc', p.color);
    li.innerHTML = `<span>${html}</span>${delta ? `<span class="m ${delta > 0 ? 'p' : 'n'}">${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))}</span>` : ''}`;
    ol.insertBefore(li, ol.firstChild); while (ol.children.length > 60) ol.lastChild.remove();
  }
  const nm = (p) => `<b>${esc(p.name)}</b>`;
  function hintText() {
    const p = cur(); if (!p) return '';
    if (p.out && !['brief', 'over', 'idle'].includes(phase)) return `💀 ${nm(p)} ${elimMode() ? 'tersingkir' : 'bangkrut'} — giliran pindah ke tim berikutnya…`;
    if (p.ai && !['brief', 'over', 'idle', 'between'].includes(phase)) return `🤖 <b>${esc(p.name)}</b> sedang berdagang… tunggu sebentar`;
    const who = teamMode() && peekAnswerer(p) ? ` • 🙋 penjawab: <b>${esc(peekAnswerer(p).name)}</b>` : '';
    switch (phase) {
      case 'brief': return 'Baca briefing, lalu tekan <b>BERLAYAR!</b>';
      case 'roll': return `🎲 ${nm(p)}, klik <b>Lempar Dadu</b> atau tekan <b>Spasi</b>${who}`;
      case 'jail': return p.jailTurns >= 1 ? `🏝️ Masih di Karantina (${p.jailTurns}/2). Jawab soal, bayar ${coin(JAIL_FEE)}, atau tunggu` : `🏝️ ${nm(p)} di Pulau Karantina! Jawab soal untuk bebas, atau bayar ${coin(JAIL_FEE)}`;
      case 'end':
        if (autoEnd) return `⏩ Tidak ada lagi yang bisa dilakukan — giliran berakhir dalam <b class="cd" id="cdNum">${Math.max(1, Math.ceil((autoEnd.dur - (performance.now() - autoEnd.t0)) / 1000 / TS))}</b>…`;
        return extraRoll ? '🎲 <b>Dadu kembar!</b> Lempar sekali lagi (Spasi)' : canBuildNow(p) ? '🏗️ Bisa membangun! Tekan <b>Bangun (B)</b> — atau <b>Akhiri Giliran</b> (Spasi)' : '✅ Selesai? Klik <b>Akhiri Giliran</b> atau tekan <b>Spasi</b>';
      case 'rolling': return '🎲 Dadu bergulir…';
      case 'moving': return '⛵ Bidak berlayar…';
      case 'resolve': case 'build': return '❓ Selesaikan kejadian di petak ini…';
      case 'over': return '🏁 Permainan selesai';
      default: return '';
    }
  }
  let hintTimer = 0;
  function hintBad(msg) { const h = $('hint'); h._h = null; h.innerHTML = '✖ ' + esc(msg); h.classList.remove('bad'); void h.offsetWidth; h.classList.add('bad'); clearTimeout(hintTimer); hintTimer = setTimeout(() => { hintTimer = 0; h.classList.remove('bad'); renderHud(); }, 2300); SND.fail(); }
  const B_ = (act, cls, ic, label, key, dis) => `<button class="cbtn ${cls}" data-act="${act}" ${dis ? 'disabled' : ''}><span class="ic">${ic}</span><span>${label}</span>${key ? `<small>${key}</small>` : ''}</button>`;
  function renderHud() {
    const p = cur(); const show = p && !p.out && !['idle', 'brief', 'over'].includes(phase);
    setHTML($('turnChip'), show ? `<span class="turn-chip" style="--pc:${p.color}"><img src="${pawnImg(p)}" alt=""><span><small>GILIRAN ${p.ai ? 'KOMPUTER' : teamMode() ? 'TIM' : 'SAUDAGAR'}</small><b>${esc(p.name)}</b></span></span>` : '');
    if (!hintTimer) setHTML($('hint'), hintText());
    let h = '';
    if (show && !p.ai) {
      const sec = B_('build', canBuildNow(p) ? 'green' : '', '🏗️', 'Bangun', 'B', !buildable(p).length) + B_('aset', '', '💼', 'Aset', '', false);
      if (phase === 'roll') h = B_('roll', 'main', '🎲', 'LEMPAR DADU', 'SPASI') + sec;
      else if (phase === 'end' && autoEnd) h = `<span class="cd-wrap">${B_('end', 'main', '⏩', 'AKHIRI SEKARANG', 'SPASI')}<span class="cd-bar" style="--cd:${(autoEnd.dur / 1000).toFixed(2)}s"><i></i></span></span>` + B_('hold', 'hold', '✋', 'Tunggu', '');
      else if (phase === 'end') h = (extraRoll ? B_('roll', 'main', '🎲', 'LEMPAR LAGI', 'SPASI') : B_('end', 'main', '✅', 'AKHIRI GILIRAN', 'SPASI')) + sec;
      else if (phase === 'jail') h = B_('jq', 'main', '📜', 'JAWAB SOAL', 'SPASI') + B_('jp', 'red', '🪙', `BAYAR ${fmt(JAIL_FEE)}`, '', p.cash < JAIL_FEE);
    }
    setHTML($('acts'), h);
    renderInfo();
  }
  $('acts').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; b.blur(); SND.ac();
    const a = b.dataset.act;
    if (a === 'roll') doRoll(); else if (a === 'end') { clearAuto(); endTurn(); } else if (a === 'hold') holdAuto(true);
    else if (a === 'build') { holdAuto(); openBuildMenu(); } else if (a === 'aset') { holdAuto(); openAssets(turn); }
    else if (a === 'jq') jailAction('answer'); else if (a === 'jp') jailAction('pay');
  });

  /* ------------------------------ Alur cepat: akhiri giliran otomatis ------------------------------ */
  let autoHeld = false;
  function clearAuto() { if (autoEnd) { clearInterval(autoEnd.iv); autoEnd = null; } }
  function holdAuto(user) {
    if (!autoEnd) return false; clearAuto(); autoHeld = true;
    if (user) { QC.sfx.click(); QC.toast('✋ Giliran ditahan — klik ✅ Akhiri Giliran bila sudah selesai'); }
    renderHud(); return true;
  }
  function maybeAutoEnd() {
    clearAuto();
    const p = cur(); if (!p || p.ai || p.out || phase !== 'end' || extraRoll || S.fast !== 'on' || autoHeld) return false;
    if (canBuildNow(p) || canRedeem(p)) return false;
    const dur = Math.max(150, 2000 * TS); const gid = gameSeq;
    autoEnd = { t0: performance.now(), dur, gid, iv: setInterval(() => {
      if (!autoEnd) return;
      if (QC.isBusy()) { autoEnd.t0 += 100; return; } // jeda saat pop-up terbuka
      const left = autoEnd.dur - (performance.now() - autoEnd.t0);
      const n = $('cdNum'); if (n) n.textContent = Math.max(1, Math.ceil(left / 1000 / TS));
      if (left <= 0) { clearAuto(); if (gid === gameSeq && phase === 'end') endTurn(); }
    }, 100) };
    renderHud(); return true;
  }

  /* ------------------------------ Kartu properti ------------------------------ */
  function compactCard(t) {
    const prop = t.type === 'prop'; const col = prop ? REG[t.reg].color : '#0f3b57';
    const cells = prop ? [['🌱 Tanah', t.rent[0]], ['🌱 Grup ×2', t.rent[0] * 2], ...[1, 2, 3, 4].map((l) => [`${LV_EMO[l]} ${LV[l].replace(' Megah', '')}`, t.rent[l]])] : [1, 2, 3, 4].map((n) => [`${n} transportasi`, TR_RENT[n]]);
    const grp = prop ? GROUPS[t.reg].map((id) => { const o = BOARD[id].owner; return `<span style="${o >= 0 ? `box-shadow: inset 0 -3px 0 ${P[o].color}` : ''}">${BOARD[id].icon} ${esc(BOARD[id].name)}</span>`; }).join('') : '';
    return `<div class="pcard compact" style="--rc:${col}"><div class="pc-head"><span class="pc-ic">${t.icon}</span><div><span class="pc-reg">${prop ? REG[t.reg].name.toUpperCase() : 'TRANSPORTASI'}</span><h3>${esc(t.name)}</h3><small>${esc(t.sub)}</small></div></div>
      <div class="pc-body"><div class="pc-rgrid">${cells.map((c) => `<span><small>${c[0]}</small><b>${coin(c[1])}</b></span>`).join('')}</div>${grp ? `<div class="pc-meta">${grp}${prop ? `<span>🏗️ ${coin(t.build)}/tingkat</span>` : ''}</div>` : ''}</div></div>`;
  }
  function cardHTML(t) {
    if (t.type === 'prop' || t.type === 'trans') {
      const prop = t.type === 'prop'; const col = prop ? REG[t.reg].color : '#0f3b57'; const own = t.owner >= 0 ? P[t.owner] : null;
      let rows; let curRow = -1;
      if (prop) {
        rows = [['🌱 Tanah', t.rent[0]], ['🌱 Tanah, grup lengkap ×2', t.rent[0] * 2], ...[1, 2, 3, 4].map((l) => [`${LV_EMO[l]} ${LV[l]}`, t.rent[l]])];
        if (own) curRow = t.level > 0 ? t.level + 1 : groupOwner(t.reg) === t.owner ? 1 : 0;
      } else { rows = [1, 2, 3, 4].map((n) => [`${n} transportasi dimiliki`, TR_RENT[n]]); if (own) curRow = transCount(t.owner) - 1; }
      const grp = prop ? GROUPS[t.reg].map((id) => { const o = BOARD[id].owner; return `<span style="${o >= 0 ? `box-shadow: inset 0 -3px 0 ${P[o].color}` : ''}">${BOARD[id].icon} ${esc(BOARD[id].name)}</span>`; }).join('')
        : TRANS.map((id) => { const o = BOARD[id].owner; return `<span style="${o >= 0 ? `box-shadow: inset 0 -3px 0 ${P[o].color}` : ''}">${BOARD[id].icon}</span>`; }).join('');
      const mult = own ? rentMult() * (own.promo ? 2 : 1) : 1;
      return `<div class="pcard" style="--rc:${col}"><div class="pc-head"><span class="pc-reg">${prop ? REG[t.reg].name.toUpperCase() : 'TRANSPORTASI'}</span><span class="pc-ic">${t.icon}</span><h3>${esc(t.name)}</h3><small>${esc(t.sub)}</small></div>
        <div class="pc-body"><div class="pc-price"><span>Harga beli</span><b>${coin(t.price)}</b></div>
        <table class="pc-rent">${rows.map((r, i) => `<tr class="${i === curRow ? 'cur' : ''}"><td>${r[0]}</td><td>${coin(r[1])}</td></tr>`).join('')}</table>
        ${mult > 1 ? `<div class="pc-mult">⚡ Sewa saat ini ×${mult}${own.promo ? ' (📸 Promo Wisata)' : ''}${rentMult() > 1 ? ' (📉 Krisis)' : ''} = <b>${coin(rentOf(t))}</b></div>` : ''}
        <div class="pc-meta">${prop ? `<span>🏗️ Bangun ${coin(t.build)}/tingkat</span>` : ''}<span>🏦 Gadai ${coin(t.mortV)}</span><span>🔓 Tebus ${coin(t.redeem)}</span></div>
        <div class="pc-meta" style="margin-top:6px">${grp}</div>
        <div class="pc-owner">Pemilik: ${own ? QC.chip(own) : '🏦 Bank (belum dimiliki)'}${own && prop && t.level ? ` • ${LV_EMO[t.level]} ${LV[t.level]}` : ''}${t.mort ? ' • <span class="pc-mort">DIGADAI</span>' : ''}</div>
        <p class="pc-fact">💡 ${esc(t.fact)}</p></div></div>`;
    }
    const D = {
      start: `Setiap <b>melewati atau berhenti</b> di sini, terima gaji <b>${coin(S.gaji)}</b>. Di sinilah semua ${unit()} memulai pelayaran.`,
      jail: `Hanya mampir = aman. Yang terseret badai harus <b>menjawab soal dengan benar</b>, membayar <b>${coin(JAIL_FEE)}</b>, memakai 🗝️ Bebas Karantina, atau menunggu 2 giliran.`,
      park: 'Tempat istirahat yang teduh. Tidak terjadi apa-apa — nikmati angin sepoi-sepoi! 🌴',
      storm: 'Badai besar menghadang! Bidak langsung terseret ke 🏝️ <b>Pulau Karantina</b> (tanpa gaji).',
      ilmu: `Jawab 1 soal: benar = <b>${coin(ILMU_BASE)}</b>. Jawaban benar beruntun memberi bonus hingga <b>+200</b> 🔥.`,
      kejut: `Ambil 1 kartu dari dek ${DECK.length} kartu: <b style="color:#16a34a">🍀 UNTUNG</b>, <b style="color:#dc2626">⚠️ RUGI</b>, atau <b style="color:#b45309">⚡ TANTANGAN</b>. Sisa di dek: <b>${deck.length}</b> kartu.`
    };
    const col = { start: '#0b6aa2', jail: '#d97706', park: '#2f8a3c', storm: '#334155', ilmu: '#6d28d9', kejut: '#ea580c' }[t.type];
    return `<div class="pcard" style="--rc:${col}"><div class="pc-head"><span class="pc-reg">PETAK KHUSUS</span><span class="pc-ic">${t.icon}</span><h3>${esc(t.name)}</h3><small>${esc(t.sub)}</small></div><div class="pc-body"><p class="pc-desc">${D[t.type]}</p></div></div>`;
  }
  async function openCard(i) {
    const t = BOARD[i]; if (!t || QC.isBusy()) return; SND.card(); holdAuto();
    const p = cur(); const mine = canAct() && t.owner === turn;
    const btns = [];
    if (mine && t.type === 'prop' && canBuildReg(t.reg, turn)) { const why = buildWhy(p, t); if (!why) btns.push({ label: `🏗️ Bangun ${LV[t.level + 1]} (${coin(buildCost(p, t))})`, value: 'build', cls: 'success' }); }
    if (mine && !t.mort && t.level === 0 && !(t.type === 'prop' && groupBuilt(t.reg))) btns.push({ label: `🏦 Gadai +${fmt(t.mortV)}`, value: 'mort' });
    if (mine && t.mort && p.cash >= t.redeem) btns.push({ label: `🔓 Tebus −${fmt(t.redeem)}`, value: 'red' });
    btns.push({ label: 'Tutup', value: null, primary: true });
    const v = await QC.modal({ cls: 'sn-card', html: cardHTML(t), buttons: btns, dismissable: true });
    if (v === 'build') startBuild(i); else if (v === 'mort') doMortgage(p, t); else if (v === 'red') doRedeem(p, t);
  }
  function doMortgage(p, t) {
    if (t.owner !== p.id || t.mort || t.level > 0) return false;
    t.mort = true; p.cash += t.mortV; ownDirty = true; SND.coin(); addLog(p, `${nm(p)} menggadaikan ${esc(t.name)}`, t.mortV);
    renderPlayers(); renderHud(); wake(); return true;
  }
  function doRedeem(p, t) {
    if (t.owner !== p.id || !t.mort || p.cash < t.redeem) return false;
    t.mort = false; p.cash -= t.redeem; ownDirty = true; SND.pay(); addLog(p, `${nm(p)} menebus ${esc(t.name)}`, -t.redeem);
    renderPlayers(); renderHud(); wake(); return true;
  }
  function asetHTML(p, mine) {
    const list = owned(p.id); const w = worth(p);
    const keeps = Object.keys(KEEP).filter((k) => p.keep && p.keep[k] > 0).map((k) => `<span>${KEEP[k].ic} ${KEEP[k].t}${p.keep[k] > 1 ? ' ×' + p.keep[k] : ''}</span>`).join('');
    const mem = teamMode() && p.members && p.members.length ? `<div class="aset-mem">👥 ${p.members.map((m) => `<span>${esc(m.name)} <b>✔${m.correct}</b></span>`).join('')}</div>` : '';
    const sum = `<div class="aset-sum"><span>🪙 Koin ${fmt(w.cash)}</span><span>🏠 Properti ${fmt(w.props)}</span><span>🏗️ Bangunan ${fmt(w.bld)}</span><span>💎 Total ${fmt(w.total)}</span>${keeps}${p.promo ? '<span>📸 Promo Wisata aktif</span>' : ''}</div>${mem}`;
    if (!list.length) return sum + '<div class="aset-empty">Belum punya properti. Berhenti di kota kosong lalu jawab Soal Diskon untuk membeli! 🏷️</div>';
    return sum + `<div class="aset-list">${list.map((t) => {
      const prop = t.type === 'prop'; const col = prop ? REG[t.reg].color : '#0f3b57'; let bt = '';
      if (mine) {
        if (prop && canBuildReg(t.reg, p.id) && t.level < 4) { const why = buildWhy(p, t); bt += `<button class="qc-btn small success" data-a="build:${t.id}" ${why ? `disabled title="${esc(why)}"` : ''}>🏗️ ${LV[t.level + 1]} −${fmt(buildCost(p, t))}</button>`; }
        if (!t.mort && t.level === 0 && !(prop && groupBuilt(t.reg))) bt += `<button class="qc-btn small" data-a="mort:${t.id}">🏦 Gadai +${fmt(t.mortV)}</button>`;
        if (t.mort) bt += `<button class="qc-btn small" data-a="red:${t.id}" ${p.cash < t.redeem ? 'disabled' : ''}>🔓 Tebus −${fmt(t.redeem)}</button>`;
      }
      return `<div class="aset-row ${t.mort ? 'mort' : ''}" style="--rc:${col}"><span class="ic">${prop && t.level ? LV_EMO[t.level] : t.icon}</span>
        <div class="nm">${esc(t.name)}<small>${prop ? REG[t.reg].name : 'Transportasi'} • ${prop ? LV[t.level] : `${transCount(p.id)} transportasi`} • ${t.mort ? 'DIGADAI (tanpa sewa)' : `sewa ${coin(rentOf(t))}`}</small></div><div class="bt">${bt}</div></div>`;
    }).join('')}</div>`;
  }
  async function openAssets(pid) {
    const p = P[pid]; if (!p || QC.isBusy()) return;
    const mine = pid === turn && !p.ai && ['roll', 'end', 'jail'].includes(phase); let act = null;
    await QC.modal({
      cls: 'sn-aset', icon: '💼', title: `Aset ${esc(p.name)}`, html: `${mine ? '<p class="qc-muted">Bangun, gadaikan, atau tebus propertimu di sini.</p>' : ''}<div class="aset-wrap"></div>`,
      buttons: [{ label: 'Tutup', value: null, primary: true }], dismissable: true,
      onOpen(o, done) {
        const wrap = o.querySelector('.aset-wrap');
        const render = () => {
          wrap.innerHTML = asetHTML(p, mine);
          wrap.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
            const [k, id] = b.dataset.a.split(':'); QC.sfx.click();
            if (k === 'build') { act = +id; done(null); return; }
            if (k === 'mort') doMortgage(p, BOARD[+id]); else doRedeem(p, BOARD[+id]); render();
          }));
        };
        render();
      }
    });
    if (act != null) startBuild(act);
  }
  async function openBuildMenu() {
    const p = cur(); if (!canAct()) return;
    const list = buildable(p).filter((t) => t.level < 4);
    if (!list.length) { hintBad('Kuasai minimal 2 kota dalam satu grup warna untuk mulai membangun'); return; }
    let pick = null;
    await QC.modal({
      cls: 'sn-aset', icon: '🏗️', title: 'Bangun Usaha', dismissable: true, buttons: [{ label: 'Tutup', value: null, primary: true }],
      html: `<p class="qc-muted">${p.keep.builder ? '🏗️ <b>Kontraktor Kilat</b> siap: bangunan berikutnya <b>tanpa soal & biaya 50%</b>!' : 'Setiap tingkat: jawab 1 soal dengan <b>benar</b>. Salah = batal (koin aman), coba giliran berikutnya.'}</p><div class="aset-list">${list.map((t) => { const why = buildWhy(p, t);
        return `<div class="aset-row" style="--rc:${REG[t.reg].color}"><span class="ic">${t.level ? LV_EMO[t.level] : t.icon}</span><div class="nm">${esc(t.name)}<small>${LV[t.level]} → ${LV_EMO[t.level + 1]} ${LV[t.level + 1]} • sewa jadi ${coin(t.rent[t.level + 1])}</small></div>
        <div class="bt"><button class="qc-btn small success" data-b="${t.id}" ${why ? `disabled title="${esc(why)}"` : ''}>${why ? esc(why.length > 26 ? '🔒 Belum bisa' : why) : `🏗️ Bangun −${fmt(buildCost(p, t))}`}</button>${why ? '' : `<small class="bsisa ${p.cash - buildCost(p, t) < riskLine() ? 'risk' : ''}">sisa ${coin(p.cash - buildCost(p, t))}${p.cash - buildCost(p, t) < riskLine() ? ' ⚠️ rawan!' : ''}</small>`}</div></div>`; }).join('')}</div>`,
      onOpen(o, done) { o.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => { pick = +b.dataset.b; done(null); })); }
    });
    if (pick != null) startBuild(pick);
  }

  /* ------------------------------ Soal (manusia & komputer) ------------------------------ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastBuy = null; let lastRent = null; let lastBuild = null; let lastIlmu = null; let lastCard = null; let lastTax = 0; const askLog = [];
  const rebutCands = (p) => (S.rebut === 'on' ? P.filter((o) => o !== p && !o.ai) : []);
  function decorateAsk(p, m, rebutable) {
    const o = [...document.querySelectorAll('.qc-overlay.qc-ask')].pop(); if (!o) return;
    if (rebutable) o.classList.add('sn-rebutable'); // jawaban benar dirahasiakan bila salah (untuk Soal Rebutan)
    if (!teamMode()) return;
    const head = o.querySelector('.qc-ask-head'); if (!head) return;
    const el = document.createElement('div'); el.className = 'sn-answerer'; el.style.setProperty('--pc', p.color);
    el.innerHTML = m ? `<span class="who">🙋 Penjawab: <b>${esc(m.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Jawab sendiri — tanpa diskusi' : '💬 Boleh diskusi dulu dengan tim'}</span>`
      : `<span class="who">👥 Dijawab bersama <b>${esc(p.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Tanpa diskusi' : '💬 Boleh berdiskusi'}</span>`;
    head.insertAdjacentElement('afterend', el);
  }
  async function quiz(p, badge, gid) {
    if (p.ai) return aiQuiz(p, badge, gid);
    const q = QC.nextQuestion(); curQ = q;
    const m = teamMode() ? takeAnswerer(p) : null; curAnswerer = m ? m.name : null; renderPlayers();
    const pr = QC.ask(q, { player: { name: p.name, avatar: p.avatar, color: p.color }, time: S.time, badge });
    decorateAsk(p, m, rebutCands(p).length > 0);
    const r = await pr;
    curQ = null; curAnswerer = null; const ok = !!r.correct;
    p.asked++; if (ok) p.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ team: p.id, member: m ? m.name : null, ok }); if (askLog.length > 400) askLog.shift();
    p.streak = ok ? p.streak + 1 : 0; renderPlayers();
    if (!ok && gid === gameSeq) await rebutan(p, q, gid);
    return ok;
  }
  async function aiQuiz(p, badge, gid) {
    const q = QC.nextQuestion(); const pop = $('cpop'); const reb = rebutCands(p).length > 0;
    pop.innerHTML = `<div class="think" style="--pc:${p.color}"><div class="who"><img src="${pawnImg(p)}" alt="">${esc(p.name)} sedang berpikir</div><div><span class="badge">${esc(badge)}</span></div><div class="q">${q ? esc(q.question) : ''}</div><div class="dots"><span>•</span><span>•</span><span>•</span></div></div>`;
    pop.hidden = false; SND.think();
    await sleep(500); if (gid !== gameSeq) { pop.hidden = true; return false; }
    const ok = Math.random() < AI_ACC; const d = pop.querySelector('.dots');
    if (d) d.outerHTML = `<div class="res ${ok ? 'ok' : 'no'}">${ok ? '✔ BENAR!' : '✘ SALAH'}</div>${q ? (ok || !reb ? `<div class="q">Jawaban: <b>${q.correct}. ${esc(q['option' + q.correct])}</b></div>` : '<div class="q">⚡ Jawaban dirahasiakan — <b>REBUTAN</b> untuk tim lain!</div>') : ''}`;
    ok ? SND.coin() : SND.fail();
    await sleep(450); pop.hidden = true; p.asked++; if (ok) p.correct++; p.streak = ok ? p.streak + 1 : 0; askLog.push({ team: p.id, member: null, ok }); renderPlayers();
    if (!ok && gid === gameSeq) await rebutan(p, q, gid);
    return ok;
  }

  /* ------------------------------ Soal Rebutan ------------------------------ */
  // Jawaban salah -> tim lain (termasuk yang sudah tersingkir) boleh merebut soal yang sama.
  async function rebutan(active, q, gid) {
    const cands = rebutCands(active); if (!q || !cands.length || phase === 'over') return null;
    SND.rebut(); const auto = S.fast === 'on'; const waitMs = Math.max(150, 6000 * TS);
    const pick = await QC.modal({
      cls: 'sn-rebut', icon: '⚡', title: 'REBUTAN! Siapa paling cepat?',
      html: `<p class="qc-muted">${esc(active.name)} belum tepat. Tim lain: <b>cepat klik tombol tim kalian!</b> Tim yang paling dulu mengklik berhak menjawab.<br><small>Keyboard: tekan nomor tim.</small></p>
        <div class="rb-q">❓ ${esc(q.question)}</div>
        <div class="rb-grid">${cands.map((o, i) => `<button class="rb-btn ${o.out ? 'out' : ''}" data-t="${o.id}" style="--pc:${o.color}"><kbd>${o.id + 1}</kbd><img src="${pawnImg(o)}" alt=""><b>${esc(o.name)}</b><small>${o.out ? '⭐ Bintang Penyelamat' : `benar = 🪙 +${REBUT_GAIN}`}</small></button>`).join('')}</div>
        ${auto ? `<div class="rb-bar" style="--rbt:${(waitMs / 1000).toFixed(2)}s"><i></i></div>` : ''}`,
      buttons: [{ label: '⏭️ Lewati', value: null }],
      onOpen(o, done) {
        rebDecide = (v) => done(v);
        o.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { QC.sfx.click(); done(+b.dataset.t); }));
        o._onKey = (e) => { const n = parseInt(e.key, 10); const hit = cands.find((c) => c.id === n - 1); if (hit) done(hit.id); else if (e.key === 'Escape') done(null); };
        if (auto) { const tm = setTimeout(() => done(null), waitMs); o._cleanup = () => clearTimeout(tm); }
      }
    });
    rebDecide = null;
    if (gid !== gameSeq) return null;
    if (pick == null || !P[pick]) {
      rebutLog.push({ by: null, ok: null, round });
      QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); addLog(null, '⚡ Rebutan dilewati');
      return null;
    }
    const o = P[pick]; const m = teamMode() ? takeAnswerer(o) : null; curAnswerer = m ? m.name : null; curQ = q; renderPlayers();
    const pr = QC.ask(q, { player: { name: o.name, avatar: o.avatar, color: o.color }, time: S.time, badge: `⚡ Soal Rebutan • ${o.out ? '⭐ Bintang Penyelamat' : `🪙 +${REBUT_GAIN}`}` });
    decorateAsk(o, m, false);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    o.asked++; if (ok) o.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ team: o.id, member: m ? m.name : null, ok, rebut: true }); rebutLog.push({ by: o.id, out: !!o.out, ok, round });
    if (gid !== gameSeq) return ok;
    if (ok && o.out) {
      o.stars = (o.stars || 0) + 1; SND.chime(); FX.burstAt($('pl' + o.id), { emojis: ['⭐', '🌟', '✨'], count: 16, spread: 150 });
      FX.announce('⭐ BINTANG PENYELAMAT!', { color: '#ca8a04', sub: `${esc(o.name)} merebut soal — tetap tersingkir, tapi dapat bintang!`, dur: 1300 });
      addLog(o, `⭐ ${nm(o)} merebut soal — Bintang Penyelamat!`);
    } else if (ok) {
      FX.announce('⚡ REBUTAN BERHASIL!', { color: o.color, sub: `${esc(o.name)} merebut soal: +${coin(REBUT_GAIN)}`, dur: 1200 });
      gain(o, REBUT_GAIN, 'merebut soal ⚡ Rebutan', o.pos);
    } else addLog(o, `${nm(o)} gagal merebut soal`);
    renderPlayers(); await sleep(350);
    return ok;
  }

  /* ------------------------------ Koin ------------------------------ */
  function floatTile(i, txt, col, size = 30) { const c = tileClient(i); FX.floatText(c.x, c.y - 10, txt, col, size); }
  function gain(p, n, why, from) {
    p.cash += n; addLog(p, `${nm(p)} ${why}`, n);
    FX.fly(anchorAt(from != null ? from : p.pos), $('cash' + p.id), '🪙', Math.min(8, 3 + ((n / 120) | 0)), 700);
    const r = rects[from != null ? from : p.pos]; coinsP(r.cx, r.cy, 10, 3); SND.coin(); renderPlayers(); wake();
  }
  async function pay(p, n, to, why, gid) {
    n = Math.round(n); if (n <= 0 || p.out) return true;
    if (p.cash < n) await raiseFunds(p, n, gid);
    if (p.cash < n) {
      const rest = p.cash; if (to) to.cash += rest; p.cash = 0;
      addLog(p, `${nm(p)} tidak mampu ${why}${to ? ' ke ' + nm(to) : ''}`, -rest);
      renderPlayers(); await goBankrupt(p, to, gid); return false;
    }
    p.cash -= n; if (to) to.cash += n;
    addLog(p, `${nm(p)} ${why}${to ? ' → ' + nm(to) : ''}`, -n);
    FX.fly($('cash' + p.id), to ? $('cash' + to.id) : anchorAt(p.pos), '🪙', Math.min(8, 3 + ((n / 160) | 0)), 700);
    SND.pay(); if (to) setTimeout(() => SND.coin(), 550);
    renderPlayers(); wake(); return true;
  }
  async function raiseFunds(p, need, gid) {
    const notes = [];
    while (p.cash < need) {
      const t = owned(p.id).filter((x) => x.level > 0).sort((a, b) => b.level - a.level || b.build - a.build)[0]; if (!t) break;
      const v = t.build / 2; notes.push(`${LV[t.level]} ${t.name} +${fmt(v)}`); t.level--; p.cash += v;
      addLog(p, `${nm(p)} menjual ${LV[t.level + 1]} di ${esc(t.name)} (½ harga)`, v); sparks(rects[t.id].cx, rects[t.id].cy, 10, 2.5, ['#fca5a5', '#fff']);
    }
    while (p.cash < need) {
      const t = owned(p.id).filter((x) => !x.mort && x.level === 0).sort((a, b) => a.price - b.price)[0]; if (!t) break;
      t.mort = true; p.cash += t.mortV; notes.push(`gadai ${t.name} +${fmt(t.mortV)}`); addLog(p, `${nm(p)} menggadaikan ${esc(t.name)} (otomatis)`, t.mortV);
    }
    if (notes.length) {
      ownDirty = true; renderPlayers(); wake(); SND.fail(); shake(4, 0.3);
      FX.announce('⚠️ KOIN KURANG!', { color: '#b91c1c', sub: `${esc(p.name)}: aset dijual otomatis — ${notes.slice(0, 3).map(esc).join(' • ')}${notes.length > 3 ? ' …' : ''}`, dur: 1800 });
      await sleep(1300);
    }
    return notes;
  }
  async function goBankrupt(p, to, gid) {
    if (p.out) return;
    p.out = true; p.jail = false; p.promo = false; p.outOrder = ++outSeq;
    const place = P.length - elimLog.length; elimLog.push({ id: p.id, name: p.name, round, place, by: to ? to.id : null });
    owned(p.id).forEach((t) => { t.owner = -1; t.level = 0; t.mort = false; });
    ownDirty = true; wake();
    const el = elimMode(); const st = $('stamp');
    st.innerHTML = `<div class="st ${el ? 'elim' : ''}">${el ? 'TERSINGKIR!' : 'BANGKRUT!'}</div><div class="sub"><b>${esc(p.name)}</b> ${el ? `tersingkir di ronde ${round} • peringkat <b>#${place}</b>` : 'keluar dari permainan'}${to ? ` (tak sanggup membayar ${esc(to.name)})` : ''}.<br>Semua propertinya kembali ke bank.${el && alive().length > 1 ? `<br>🔥 Tim bertahan: ${alive().length}/${P.length}` : ''}</div>`;
    st.hidden = false;
    (el ? SND.eliminated : SND.bankrupt)(); shake(12, 0.6); flash('120,0,0', 0.32);
    FX.burstAt($('pl' + p.id), { emojis: ['💀', '💸', '💥'], count: 14, spread: 150 });
    addLog(p, `💀 ${nm(p)} <b>${el ? 'TERSINGKIR' : 'BANGKRUT'}</b> di ronde ${round}${el ? ` (#${place})` : ''}! Propertinya kembali ke bank`);
    renderPlayers(); renderHud();
    await sleep(2300); st.hidden = true;
    if (gid !== gameSeq) return;
    if (el && alive().length === 2 && P.length > 2 && !duelShown) {
      duelShown = true; const [a, b] = alive(); SND.duel(); flash('255,70,70', 0.25);
      FX.announce('⚔️ DUEL FINAL!', { color: '#b91c1c', sub: `${esc(a.name)} vs ${esc(b.name)} — siapa yang bertahan sampai akhir?`, dur: 2400 });
      addLog(null, `⚔️ <b>DUEL FINAL</b>: ${nm(a)} vs ${nm(b)}`); renderInfo();
      await sleep(1700);
    }
  }
  async function payLiving(p, gid) {
    const c = livingCost(); if (!c || p.out) return true;
    floatTile(p.pos, `📉 Biaya hidup −${fmt(c)}`, '#fca5a5', 28);
    const ok = await pay(p, c, null, 'membayar biaya hidup krisis', gid);
    return ok && !p.out;
  }

  /* ------------------------------ Gerak bidak ------------------------------ */
  async function stepTo(p, to, dur, h, ease) { const a = slotOf(p).slice(); p.pos = to; const b = slotOf(p); p.anim = { a, b, t0: performance.now(), dur, h, ease }; wake(); await wait(dur); }
  function landFx(p) { const [x, y] = slotOf(p); dust(x, y, 8, pawnSize() * 0.5); ringP(x, y, pawnSize() * 0.6, 'rgba(255,255,255,.8)', 0.45, 3); SND.land(); wake(); }
  async function moveSteps(p, n, gid) {
    phase = 'moving'; focusTile = -1; renderHud();
    const dir = n < 0 ? -1 : 1; const h = pawnSize() * 0.5; const hop = Math.max(20, (p.ai ? 85 : 125) * TS);
    for (let k = 0; k < Math.abs(n); k++) {
      const to = (p.pos + dir + 32) % 32; await stepTo(p, to, hop, h); if (gid !== gameSeq) return;
      SND.step(k); if (dir > 0 && to === 0) passStart(p);
    }
    p.anim = null; landFx(p);
  }
  async function flyTo(p, to) { const dur = Math.max(40, 800 * TS); SND.hop(); await stepTo(p, to, dur, BD.s * 0.22, true); p.anim = null; landFx(p); }
  async function advanceTo(p, target, gid) { await moveSteps(p, (target - p.pos + 32) % 32 || 32, gid); }
  function passStart(p) {
    gain(p, S.gaji, 'menerima gaji Pelabuhan Awal 🚢', 0); SND.gaji();
    floatTile(0, `+${coin(S.gaji)} GAJI`, '#fde047', 34); const r = rects[0]; ringP(r.cx, r.cy, r.w, 'rgba(253,224,71,1)', 0.7, 6);
  }

  /* ------------------------------ Kejadian di petak ------------------------------ */
  async function land(p, gid) {
    const t = BOARD[p.pos]; focusTile = p.pos; focusT0 = performance.now(); phase = 'resolve'; renderHud(); wake();
    await sleep(p.ai ? 120 : 200); if (gid !== gameSeq) return;
    if (t.type === 'prop' || t.type === 'trans') await landProperty(p, t, gid);
    else if (t.type === 'ilmu') await landIlmu(p, gid);
    else if (t.type === 'kejut') await landKejutan(p, gid);
    else if (t.type === 'storm') await landStorm(p, gid);
    else if (t.type === 'jail') { floatTile(p.pos, '👋 Mampir saja', '#fde68a'); addLog(p, `${nm(p)} mampir di Pulau Karantina`); }
    else if (t.type === 'park') { floatTile(p.pos, '🌳 Istirahat sejenak…', '#bbf7d0'); addLog(p, `${nm(p)} bersantai di Taman Istirahat`); SND.bell(784, 0.6, 0.06, 0); SND.bell(988, 0.6, 0.05, 0.15); }
  }
  async function landProperty(p, t, gid) {
    if (t.owner < 0) { await offerBuy(p, t, gid); return; }
    if (t.owner === p.id) { floatTile(t.id, '🏠 Milik sendiri', '#bbf7d0', 28); return; }
    const ow = P[t.owner];
    if (t.mort) { floatTile(t.id, '🏦 Digadai — bebas sewa', '#e2e8f0', 26); addLog(p, `${nm(p)} singgah di ${esc(t.name)} (digadai, bebas sewa)`); return; }
    const full = rentOf(t);
    if (p.keep.shield > 0) {
      p.keep.shield--; lastRent = { tile: t.id, full, paid: 0, ok: null, shield: true, payer: p.id, owner: ow.id };
      SND.shield(); FX.announce('🛡️ PERISAI SEWA!', { color: '#0284c7', sub: `${esc(p.name)} bebas membayar sewa ${esc(t.name)} (${coin(full)})`, dur: 1500 });
      const r = rects[t.id]; ringP(r.cx, r.cy, Math.max(r.w, r.h), 'rgba(125,211,252,1)', 0.7, 6); sparks(r.cx, r.cy, 16, 3, ['#bae6fd', '#ffffff', '#38bdf8']);
      addLog(p, `🛡️ ${nm(p)} memakai Perisai Sewa — bebas sewa ${esc(t.name)}`); renderPlayers(); wake();
      await sleep(900); return;
    }
    FX.announce('💬 SOAL TAWAR!', { color: ow.color, sub: `Sewa ${esc(t.name)} ${coin(full)} ke ${esc(ow.name)} — jawab benar = bayar 50%!`, dur: 1250 });
    await sleep(p.ai ? 250 : 900); if (gid !== gameSeq) return;
    const ok = await quiz(p, `💬 Soal Tawar • sewa ${coin(full)}`, gid); if (gid !== gameSeq) return;
    const amt = ok ? Math.ceil(full / 2) : full;
    lastRent = { tile: t.id, full, paid: amt, ok, payer: p.id, owner: ow.id };
    if (ok) FX.announce('🤝 BERHASIL MENAWAR!', { color: '#16a34a', sub: `Sewa dipotong 50%: bayar ${coin(amt)} saja`, dur: 1200 });
    else floatTile(t.id, `💸 Sewa penuh ${coin(full)}`, '#fca5a5', 28);
    await sleep(350); if (gid !== gameSeq) return;
    await pay(p, amt, ow, `membayar sewa ${esc(t.name)}${ok ? ' (ditawar 50%)' : ''}`, gid);
  }
  function aiWantsBuy(p, t, cost) {
    if (p.cash < cost) return false;
    const completes = t.type === 'prop' && GROUPS[t.reg].every((id) => id === t.id || BOARD[id].owner === p.id);
    return p.cash - cost >= S.cash * (completes ? 0.15 : 0.3); // simpan cadangan uang (risiko tersingkir)
  }
  async function offerBuy(p, t, gid) {
    const ok = await quiz(p, `🏷️ Soal Diskon 20% • ${t.name} (${coin(t.price)})`, gid); if (gid !== gameSeq) return;
    const cost = ok ? Math.round(t.price * (1 - DISC)) : t.price;
    if (!ok && S.hard === 'on') {
      lastBuy = { tile: t.id, cost, disc: false, choice: 'locked' };
      FX.announce('🔒 WAJIB BENAR', { color: '#475569', sub: `${esc(t.name)} belum bisa dibeli — jawabannya salah`, dur: 1300 });
      addLog(p, `${nm(p)} gagal membeli ${esc(t.name)} (wajib benar)`); await sleep(800); return;
    }
    let choice;
    if (p.ai) { choice = aiWantsBuy(p, t, cost) ? 'buy' : 'skip'; await sleep(200); } else choice = await buyModal(p, t, ok, cost);
    if (gid !== gameSeq) return;
    lastBuy = { tile: t.id, cost, disc: ok, choice };
    if (choice === 'buy' && p.cash >= cost) buyTile(p, t, cost, ok);
    else { addLog(p, `${nm(p)} melewati ${esc(t.name)}`); floatTile(t.id, '✋ Dilewati', '#e2e8f0', 26); }
    await sleep(t.type === 'prop' && groupOwner(t.reg) === p.id ? 1300 : p.ai ? 150 : 300);
  }
  let curOffer = null;
  function buyModal(p, t, ok, cost) {
    const can = p.cash >= cost; curOffer = { tile: t.id, cost, disc: ok, left: p.cash - cost, risky: p.cash - cost < riskLine() };
    return QC.modal({
      cls: 'sn-buy', html: compactCard(t) + `<div class="buybox"><div class="lbl">${ok ? '🎉 JAWABAN BENAR — HARGA SPESIAL' : '🙂 HARGA NORMAL'}</div>
        <div class="pr">${ok ? `<s>${coin(t.price)}</s>` : ''}${coin(cost)} ${ok ? '<span class="disc">−20% DISKON</span>' : ''}</div>
        ${can ? `<div class="sisa ${p.cash - cost < riskLine() ? 'risk' : ''}">Sisa uang setelah beli: <b>${coin(p.cash - cost)}</b><small>dari ${coin(p.cash)}</small></div>${p.cash - cost < riskLine() ? '<div class="riskhint">⚠️ Sisa uang tipis — rawan tersingkir! Diskusikan dulu</div>' : '<div class="note">💬 Diskusikan dulu dengan tim sebelum memutuskan.</div>'}` : `<div class="note bad">Uangmu hanya ${coin(p.cash)} — belum cukup untuk membeli.</div>`}</div>`,
      buttons: [{ label: '✋ Lewati', value: 'skip', primary: !can }, { label: `🛒 Beli ${coin(cost)}`, value: 'buy', primary: can }],
      onOpen(o, done) { decide = (v) => { decide = null; done(v); }; if (!can) o.querySelectorAll('.qc-actions button')[1].disabled = true; }
    }).then((v) => { decide = null; curOffer = null; return v; });
  }
  function buyTile(p, t, cost, disc) {
    p.cash -= cost; t.owner = p.id; ownDirty = true;
    addLog(p, `${nm(p)} membeli ${esc(t.name)}${disc ? ' (diskon 20%)' : ''}`, -cost);
    FX.fly($('cash' + p.id), anchorAt(t.id), '🪙', 5, 650);
    SND.buy(); const r = rects[t.id]; sparks(r.cx, r.cy, 18, 3, ['#fde047', '#fff', p.color]); ringP(r.cx, r.cy, Math.max(r.w, r.h) * 0.8, p.color, 0.6, 5);
    floatTile(t.id, '🛒 TERBELI!', '#fde68a', 32);
    if (t.type === 'prop' && groupOwner(t.reg) === p.id) {
      setTimeout(() => { SND.group(); QC.confetti(PN(150)); FX.fireworks(PN(6), 220); confettiP(r.cx, r.cy, 40, [REG[t.reg].color, '#fde047', '#fff']); wake(); }, 300);
      FX.announce('🎉 GRUP LENGKAP!', { color: REG[t.reg].color, sub: `${esc(p.name)} menguasai seluruh ${REG[t.reg].name} — sewa tanah ×2!`, dur: 1800 });
      addLog(p, `🎉 ${nm(p)} menguasai seluruh <b>${REG[t.reg].name}</b>!`);
    } else if (t.type === 'prop' && ownInReg(t.reg, p.id) === BUILD_NEED) {
      FX.announce('🏗️ BOLEH MEMBANGUN!', { color: REG[t.reg].color, sub: `${esc(p.name)} punya 2 kota ${REG[t.reg].name} — bangun warung, toko, sampai mal!`, dur: 1600 });
      addLog(p, `🏗️ ${nm(p)} punya 2 kota <b>${REG[t.reg].name}</b> — boleh membangun`);
    }
    renderPlayers(); renderHud(); wake();
  }
  async function landIlmu(p, gid) {
    FX.announce('📜 KARTU ILMU', { color: '#6d28d9', sub: `Jawab benar = ${coin(ILMU_BASE)}${p.streak >= 1 ? ' • 🔥 pertahankan jawaban beruntunmu!' : ''}`, dur: 1100 });
    await sleep(p.ai ? 400 : 800); if (gid !== gameSeq) return;
    const ok = await quiz(p, `📜 Kartu Ilmu • hadiah ${coin(ILMU_BASE)}+`, gid); if (gid !== gameSeq) return;
    if (ok) {
      const bonus = p.streak >= 2 ? Math.min(200, 50 * (p.streak - 1)) : 0; lastIlmu = { ok, amt: ILMU_BASE + bonus, bonus };
      gain(p, ILMU_BASE + bonus, `menjawab Kartu Ilmu${bonus ? ` (🔥 beruntun ${p.streak}× +${bonus})` : ''}`, p.pos); floatTile(p.pos, `+${coin(ILMU_BASE + bonus)}${bonus ? ' 🔥' : ''}`, '#fde047', 34);
    } else { lastIlmu = { ok, amt: 0, bonus: 0 }; floatTile(p.pos, '📜 Belum beruntung', '#e9d5ff', 26); addLog(p, `${nm(p)} belum berhasil menjawab Kartu Ilmu`); }
    await sleep(400);
  }

  /* ------------------------------ Kartu Kejutan: kocok, balik, terapkan ------------------------------ */
  function drawCardId() {
    if (forcedCard && CARD_BY[forcedCard]) { const id = forcedCard; forcedCard = null; return id; }
    if (!deck.length) { deck = QC.shuffle(DECK.map((c) => c.id)); deckCycles++; }
    return deck.pop();
  }
  function showCard(p, c) {
    return new Promise((res) => {
      const ov = $('cardOv'); const L = CK[c.k]; const keep = c.fx[0] === 'keep';
      const auto = p.ai ? 1200 : S.fast === 'on' ? 2500 : 0; const flipMs = 900;
      ov.innerHTML = `<div class="kc ${c.k}" style="--kc:${L.color};--kd:${L.dark}"><div class="kc-inner">
        <div class="kc-face kc-back"><div class="kc-back-art"><span class="kb-ic">🎴</span><b>KARTU<br>KEJUTAN</b><small>SAUDAGAR NUSANTARA</small></div></div>
        <div class="kc-face kc-front"><div class="kc-head">${L.label}</div>
          <div class="kc-art"><span class="kc-rays"></span><span class="kc-ic">${c.ic}</span></div>
          <div class="kc-body"><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p>${keep ? '<span class="kc-keep">📌 KARTU SIMPAN</span>' : ''}
            <div class="kc-foot"><span class="kc-who" style="--pc:${p.color}">untuk <b>${esc(p.name)}</b></span><button class="kc-ok" data-ok>${c.k === 'tantangan' ? 'JAWAB ➜' : keep ? 'SIMPAN ✓' : 'OK ✓'}<small>SPASI</small></button></div>
            ${auto ? `<span class="kc-bar" style="--auto:${((auto * TS + flipMs * Math.max(0.4, TS)) / 1000).toFixed(2)}s"><i></i></span>` : ''}</div></div>
      </div></div>`;
      ov.hidden = false; SND.flip(); wake();
      let closed = false; let tm = 0;
      const t1 = setTimeout(() => {
        if (closed) return; (c.k === 'untung' ? SND.chime : c.k === 'rugi' ? SND.thud : SND.suspense)();
        const art = ov.querySelector('.kc-art');
        if (art) FX.burstAt(art, c.k === 'untung' ? { emojis: ['🪙', '✨', '⭐', '💰'], count: 16, spread: 170 } : c.k === 'rugi' ? { emojis: ['💢', '💸', '😱'], count: 10, spread: 120 } : { emojis: ['⚡', '❓', '✨'], count: 12, spread: 140 });
        if (c.k === 'rugi') FX.shake(ov.querySelector('.kc'), 8, 420);
      }, 760 * Math.max(0.4, TS));
      const close = () => {
        if (closed) return; closed = true; clearTimeout(t1); clearTimeout(tm); cpopSkip = null;
        const k = ov.querySelector('.kc'); if (k) k.classList.add('out');
        setTimeout(() => { ov.hidden = true; ov.innerHTML = ''; res(); }, 230 * Math.max(0.3, TS));
      };
      ov.querySelector('[data-ok]').onclick = (e) => { e.stopPropagation(); QC.sfx.click(); close(); };
      cpopSkip = close;
      if (auto) tm = setTimeout(close, auto * TS + flipMs * Math.max(0.4, TS));
    });
  }
  async function landKejutan(p, gid) {
    const c = CARD_BY[drawCardId()]; lastCard = { id: c.id, kind: c.k, t: c.t };
    addLog(p, `🎴 ${nm(p)} membuka kartu ${CK[c.k].label}: <b>${esc(c.t)}</b>`);
    await showCard(p, c); if (gid !== gameSeq) return;
    await applyCard(p, c, gid);
  }
  async function applyCard(p, c, gid) {
    const [k, a, b] = c.fx; const r = rects[p.pos];
    switch (k) {
      case 'gain': gain(p, a, `menerima ${esc(c.t)}`, p.pos); floatTile(p.pos, `+${coin(a)}`, '#fde047', 34); break;
      case 'collect': for (const o of alive()) if (o !== p) { await pay(o, a, p, `memberi ${esc(c.t)}`, gid); if (gid !== gameSeq) return; } break;
      case 'move': await moveSteps(p, a, gid); if (gid === gameSeq) await land(p, gid); break;
      case 'goto': await advanceTo(p, a, gid); if (gid === gameSeq && a !== 0) await land(p, gid); break;
      case 'keep': p.keep[a]++; SND.coin(); floatTile(p.pos, `${KEEP[a].ic} ${KEEP[a].t} disimpan!`, '#bbf7d0', 28); addLog(p, `${nm(p)} menyimpan kartu ${KEEP[a].ic} <b>${KEEP[a].t}</b>`); renderPlayers(); break;
      case 'promo': p.promo = true; ownDirty = true; SND.group(); floatTile(p.pos, '📸 SEWA ×2 SATU RONDE!', '#fde68a', 30); confettiP(r.cx, r.cy, 24, [p.color, '#fde047', '#fff']); addLog(p, `📸 ${nm(p)}: Promo Wisata — semua sewa ×2 sampai giliran berikutnya`); renderPlayers(); wake(); break;
      case 'tax': { const amt = Math.max(200, r10(p.cash * 0.2)); lastTax = amt; await pay(p, amt, null, 'membayar Pajak Daerah', gid); break; }
      case 'road': { const lv = owned(p.id).reduce((s, t) => s + t.level, 0); await pay(p, Math.max(200, lv * 80), null, `membayar perbaikan jalan${lv ? ` (${lv} tingkat bangunan)` : ''}`, gid); break; }
      case 'flood': {
        const t = owned(p.id).filter((x) => x.level > 0).sort((x, y) => y.level - x.level || y.build - x.build)[0];
        if (t) { t.level--; ownDirty = true; const rt = rects[t.id]; sparks(rt.cx, rt.cy, 18, 3, ['#93c5fd', '#bfdbfe', '#fff']); dust(rt.cx, rt.cy, 8, BD.w * 0.4); SND.thud(); floatTile(t.id, `🌊 ${LV[t.level + 1]} → ${LV[t.level]}`, '#93c5fd', 26); addLog(p, `🌊 Banjir: ${LV[t.level + 1]} ${nm(p)} di ${esc(t.name)} turun 1 tingkat`); lastCard.flood = t.id; renderPlayers(); wake(); }
        else await pay(p, 200, null, 'membersihkan gudang setelah banjir', gid);
        break;
      }
      case 'pay': await pay(p, a, null, `membayar ${esc(c.t)}`, gid); break;
      case 'jail': await sendToJail(p, gid, 'kapal mogok'); break;
      case 'payeach': for (const o of alive()) if (o !== p && !p.out) { await pay(p, a, o, `membayar ${esc(c.t)}`, gid); if (gid !== gameSeq) return; } break;
      case 'poorest': {
        const o = alive().filter((x) => x !== p).sort((x, y) => x.cash - y.cash)[0];
        if (o) { lastCard.to = o.id; await pay(p, a, o, 'bersedekah', gid); } break;
      }
      case 'lost': {
        let n = 0; let tgt = null;
        for (let s = 1; s < 32; s++) { const t = BOARD[(p.pos + s) % 32]; if (t.type === 'prop' && t.owner >= 0 && t.owner !== p.id && !t.mort) { n = s; tgt = t; break; } }
        if (!tgt) { floatTile(p.pos, '🧭 Belum ada kota lawan — aman!', '#bbf7d0', 26); addLog(p, `${nm(p)} tersesat, tetapi belum ada kota lawan — aman`); break; }
        lastCard.to = tgt.id; await moveSteps(p, n, gid); if (gid === gameSeq) await land(p, gid); break;
      }
      case 'quiz': case 'export': {
        await sleep(200); if (gid !== gameSeq) return;
        const ok = await quiz(p, k === 'quiz' ? `⚡ Tantangan Kilat • benar +${fmt(a)} / salah −${fmt(b)}` : `🚢 Peluang Ekspor • benar: tiap tim lain bayar ${fmt(a)}`, gid); if (gid !== gameSeq) return;
        lastCard.ok = ok;
        if (ok) { FX.announce('⚡ TANTANGAN BERHASIL!', { color: '#d97706', sub: `${esc(p.name)} menang tantangan!`, dur: 1100 }); if (k === 'quiz') { gain(p, a, `menang ${esc(c.t)}`, p.pos); floatTile(p.pos, `+${coin(a)}`, '#fde047', 34); } else for (const o of alive()) if (o !== p) { await pay(o, a, p, 'membeli dagangan ekspor', gid); if (gid !== gameSeq) return; } }
        else { floatTile(p.pos, '⚡ Tantangan gagal', '#fca5a5', 28); await pay(p, b, null, `kalah ${esc(c.t)}`, gid); }
        break;
      }
    }
  }
  async function landStorm(p, gid) {
    const r = rects[STORM]; SND.storm(); swirl(r.cx, r.cy, 70, r.w * 0.8); flash('30,41,59', 0.35); shake(8, 0.6);
    FX.announce('🌪️ BADAI!', { color: '#334155', sub: `${esc(p.name)} terseret ke Pulau Karantina!`, dur: 1300 });
    await sleep(850); if (gid !== gameSeq) return;
    await sendToJail(p, gid, 'terseret badai');
  }
  async function sendToJail(p, gid, why) {
    p.jail = true; p.jailTurns = 0; extraRoll = false; doublesN = 0; SND.jail();
    await flyTo(p, JAIL); if (gid !== gameSeq) return;
    focusTile = JAIL; focusT0 = performance.now();
    floatTile(JAIL, '🏝️ KARANTINA', '#fde68a', 32); addLog(p, `${nm(p)} masuk Pulau Karantina (${why})`);
    renderPlayers(); renderHud(); await sleep(400);
  }
  function release(p, how) {
    p.jail = false; p.jailTurns = 0; addLog(p, `${nm(p)} bebas dari Karantina (${how})`); floatTile(JAIL, '🎉 BEBAS!', '#4ade80', 34); SND.coin();
    const r = rects[JAIL]; confettiP(r.cx, r.cy, 22, [p.color, '#fde047', '#fff']);
    if (!p.ai) phase = 'roll'; renderPlayers(); renderHud(); wake();
  }
  async function jailAction(kind) {
    const p = cur(); if (phase !== 'jail' || !p || p.ai || QC.isBusy()) return false;
    const gid = gameSeq;
    if (kind === 'pay') { if (p.cash < JAIL_FEE) { hintBad('Koin tidak cukup'); return false; } phase = 'resolve'; renderHud(); await pay(p, JAIL_FEE, null, 'membayar biaya keluar Karantina', gid); if (gid === gameSeq) release(p, 'membayar'); return true; }
    phase = 'resolve'; renderHud();
    const ok = await quiz(p, '🏝️ Soal Bebas Karantina', gid); if (gid !== gameSeq) return true;
    if (ok) release(p, 'menjawab soal dengan benar');
    else { p.jailTurns++; addLog(p, `${nm(p)} belum bebas dari Karantina (${p.jailTurns}/2)`); floatTile(JAIL, '🔒 Belum bebas', '#fca5a5', 28); SND.fail(); phase = 'end'; extraRoll = false; renderPlayers(); renderHud(); maybeAutoEnd(); }
    return true;
  }

  /* ------------------------------ Bangun ------------------------------ */
  function startBuild(id) {
    const p = cur(); const t = BOARD[id];
    if (!canAct()) return { ok: false, reason: 'busy' };
    const why = buildWhy(p, t); if (why) { hintBad(why); return { ok: false, reason: why }; }
    clearAuto(); tryBuild(p, t, gameSeq); return { ok: true };
  }
  async function tryBuild(p, t, gid) {
    prevPhase = phase; phase = 'build'; focusTile = t.id; focusT0 = performance.now(); renderHud(); wake();
    const free = p.keep.builder > 0; const cost = buildCost(p, t); let ok;
    if (free) {
      p.keep.builder--; ok = true; renderPlayers();
      FX.announce('🏗️ KONTRAKTOR KILAT!', { color: '#0f766e', sub: `Bangun tanpa soal, biaya 50%: ${coin(cost)}`, dur: 1200 });
      addLog(p, `🏗️ ${nm(p)} memakai Kontraktor Kilat (tanpa soal, biaya 50%)`); await sleep(700); if (gid !== gameSeq) return false;
    } else { ok = await quiz(p, `🏗️ Bangun ${LV[t.level + 1]} di ${t.name} (${coin(cost)})`, gid); if (gid !== gameSeq) return false; }
    const r = rects[t.id];
    if (ok) {
      p.cash -= cost; t.level++; ownDirty = true; lastBuild = { tile: t.id, ok: true, level: t.level, cost, free };
      addLog(p, `${nm(p)} membangun ${LV_EMO[t.level]} ${LV[t.level]} di ${esc(t.name)}`, -cost);
      FX.fly($('cash' + p.id), anchorAt(t.id), '🪙', 4, 600);
      SND.build(); dust(r.cx, r.cy, 12, BD.w * 0.5); sparks(r.cx, r.cy, 16, 3, ['#fde68a', '#fff', '#f59e0b']); shake(3, 0.25);
      floatTile(t.id, `${LV_EMO[t.level]} ${LV[t.level].toUpperCase()}!`, '#fde68a', 32);
      if (t.level === 4) {
        setTimeout(() => { SND.mal(); QC.confetti(PN(170)); FX.fireworks(PN(10), 200); confettiP(r.cx, r.cy, 50, ['#fde047', '#38bdf8', '#fff', p.color]); flash('255,236,170', 0.3); }, 350);
        FX.announce('🏬 MAL MEGAH BERDIRI!', { color: '#0284c7', sub: `${esc(p.name)} membangun mal di ${esc(t.name)} — sewa ${coin(t.rent[4])}!`, dur: 1900 });
      } else FX.announce(`${LV_EMO[t.level]} ${LV[t.level].toUpperCase()} BERDIRI!`, { color: REG[t.reg].color, sub: `Sewa ${esc(t.name)} kini ${coin(t.rent[t.level])}`, dur: 1100 });
    } else {
      buildLocked = true; lastBuild = { tile: t.id, ok: false, level: t.level, cost: 0 };
      SND.fail(); dust(r.cx, r.cy, 8, BD.w * 0.4);
      FX.announce('🧱 BANGUN GAGAL', { color: '#64748b', sub: 'Koin tidak terpakai. Coba lagi giliran berikutnya!', dur: 1200 });
      addLog(p, `${nm(p)} gagal membangun di ${esc(t.name)} (koin aman)`);
    }
    renderPlayers(); wake(); await sleep(ok && t.level === 4 ? 1000 : 400); if (gid !== gameSeq) return ok;
    phase = prevPhase || 'end'; prevPhase = null; focusTile = -1; renderHud();
    if (phase === 'end') maybeAutoEnd();
    return ok;
  }

  /* ------------------------------ Alur giliran ------------------------------ */
  const timeUp = () => !!timeLimit() && tStart > 0 && Date.now() - tStart >= timeLimit();
  async function startTurn() {
    const gid = gameSeq; const p = cur(); doublesN = 0; extraRoll = false; buildLocked = false; focusTile = -1; autoHeld = false; clearAuto();
    if (p.promo) { p.promo = false; ownDirty = true; addLog(p, `📸 Promo Wisata ${nm(p)} berakhir`); wake(); }
    renderPlayers(); renderInfo();
    const cap = maxRounds();
    const nxt = teamMode() && !p.ai && peekAnswerer(p) ? ` • 🙋 ${esc(peekAnswerer(p).name)}` : '';
    FX.announce(`GILIRAN: ${esc(p.name)}`, { color: p.color, sub: `${cap === Infinity ? `RONDE ${round}` : `RONDE ${round}/${cap}`}${p.ai ? ' • 🤖 Komputer' : p.jail ? ' • 🏝️ masih di Karantina' : ' • lempar dadumu!'}${nxt}`, dur: p.ai ? 850 : 1100 });
    QC.sfx.whoosh(); wake();
    if (livingCost() > 0) { // Krisis: biaya hidup dibayar di awal giliran
      phase = 'resolve'; renderHud();
      await sleep(p.ai ? 300 : 600); if (gid !== gameSeq) return;
      const okL = await payLiving(p, gid); if (gid !== gameSeq) return;
      if (!okL) { if (alive().length <= 1) endGame('last'); else endTurn(); return; }
    }
    if (p.ai) { aiTurn(gid); return; }
    if (p.jail) {
      if (p.keep.key > 0) { p.keep.key--; FX.announce('🗝️ BEBAS KARANTINA!', { color: '#0d9488', sub: `${esc(p.name)} memakai kartu simpanan`, dur: 1200 }); release(p, 'memakai 🗝️ Bebas Karantina'); return; }
      if (p.jailTurns >= 2) { release(p, 'masa karantina 2 giliran selesai'); return; }
      phase = 'jail'; renderHud(); return;
    }
    phase = 'roll'; renderHud();
  }
  async function rollCore(p, gid) {
    let a; let b; if (forced) { [a, b] = forced; forced = null; } else { a = 1 + ((Math.random() * 6) | 0); b = 1 + ((Math.random() * 6) | 0); }
    extraRoll = false; focusTile = -1; phase = 'rolling'; renderHud();
    await animateDice(a, b, p.ai); if (gid !== gameSeq) return null;
    dice = [a, b]; const dbl = a === b;
    addLog(p, `${nm(p)} melempar 🎲 ${a} + ${b} = <b>${a + b}</b>${dbl ? ' — kembar!' : ''}`);
    if (dbl) {
      doublesN++;
      if (doublesN >= 3) { FX.announce('🌀 KEMBAR 3×!', { color: '#7c3aed', sub: 'Terlalu ngebut — langsung ke Pulau Karantina!', dur: 1300 }); await sleep(800); if (gid !== gameSeq) return null; await sendToJail(p, gid, 'dadu kembar 3×'); return { dbl: false, jailed: true }; }
    }
    await moveSteps(p, a + b, gid); if (gid !== gameSeq) return null;
    await land(p, gid); if (gid !== gameSeq) return null;
    return { dbl: dbl && !p.jail && !p.out };
  }
  async function doRoll() {
    const p = cur(); if (!p || p.ai || QC.isBusy()) return false;
    if (!(phase === 'roll' || (phase === 'end' && extraRoll))) return false;
    clearAuto();
    const gid = gameSeq; const r = await rollCore(p, gid); if (gid !== gameSeq || r == null) return true;
    if (alive().length <= 1) { endGame('last'); return true; }
    if (p.out) { endTurn(); return true; }
    extraRoll = !!r.dbl; phase = 'end'; renderHud(); renderPlayers();
    if (extraRoll) FX.announce('🎲 DADU KEMBAR!', { color: '#ca8a04', sub: `${esc(p.name)} boleh melempar sekali lagi`, dur: 1000 });
    else maybeAutoEnd();
    return true;
  }
  async function endTurn() {
    if (phase === 'over' || phase === 'idle' || phase === 'brief') return false;
    const p = cur(); if (!p.ai && !p.out && !(phase === 'end' && !extraRoll)) return false;
    if (!p.ai && !p.out && QC.isBusy()) return false;
    clearAuto();
    const gid = gameSeq; phase = 'between'; focusTile = -1; renderHud();
    if (alive().length <= 1) { endGame('last'); return true; }
    if (timeUp()) { endGame('waktu'); return true; }
    let n = turn; let wrapped = false; do { n = (n + 1) % P.length; if (n === 0) wrapped = true; } while (P[n].out);
    turn = n;
    if (wrapped) {
      round++;
      if (round > maxRounds()) { round = maxRounds(); endGame('ronde'); return true; }
      renderInfo(); SND.gong();
      const naik = multAt(round) > multAt(round - 1); const live = livingCost(); const liveUp = live > livingCost(round - 1); const mr = maxRounds();
      if (naik || liveUp) { ownDirty = true; wake(); addLog(null, `📉 <b>Krisis!</b> Sewa ×${rentMult()}${live ? ` • biaya hidup ${coin(live)} per giliran` : ''}`, 0); }
      if (krisisStage() === 1) { SND.krisis(); flash('220,38,38', 0.18); }
      const lastR = round === mr;
      const sub = (naik || liveUp) ? `📉 KRISIS${krisisStage() === 1 ? ' DIMULAI' : ''} — sewa ×${rentMult()}${live ? ` • biaya hidup ${coin(live)}/giliran` : ''}` : lastR ? (elimMode() ? 'RONDE TERAKHIR — bertahanlah dengan uang terbanyak!' : 'RONDE TERAKHIR — maksimalkan kekayaanmu!') : mr === Infinity ? 'Pelayaran berlanjut…' : `${mr - round + 1} ronde lagi${elimMode() ? ` • 🔥 tim bertahan ${alive().length}/${P.length}` : ''}`;
      FX.announce(`🌅 RONDE ${round}`, { color: naik || liveUp ? '#b91c1c' : '#0e7490', sub, dur: naik || liveUp ? 1700 : 1100 });
      await sleep(naik || liveUp ? 1100 : 750); if (gid !== gameSeq) return true;
    }
    startTurn(); return true;
  }

  /* ------------------------------ Saudagar Komputer ------------------------------ */
  // Komputer menyimpan cadangan uang (± 30% modal) supaya tidak mudah tersingkir.
  async function aiManage(p, gid) {
    for (const t of owned(p.id)) if (t.mort && p.cash - t.redeem >= S.cash * 0.6) doRedeem(p, t);
    let tries = 0;
    while (tries < 2 && !buildLocked && !p.out) {
      const c = buildable(p).filter((t) => !buildWhy(p, t) && p.cash - buildCost(p, t) >= S.cash * 0.35).sort((a, b) => a.level - b.level || b.price - a.price)[0];
      if (!c) break; tries++;
      await tryBuild(p, c, gid); if (gid !== gameSeq) return;
    }
  }
  async function aiTurn(gid) {
    const p = cur(); phase = 'ai'; renderHud(); renderPlayers(); wake();
    await sleep(150); if (gid !== gameSeq) return;
    if (p.jail) {
      if (p.keep.key > 0) { p.keep.key--; release(p, 'memakai 🗝️ Bebas Karantina'); }
      else if (p.jailTurns >= 2) release(p, 'masa karantina 2 giliran selesai');
      else if (p.jailTurns >= 1 && p.cash >= JAIL_FEE + S.cash * 0.4) { await pay(p, JAIL_FEE, null, 'membayar biaya keluar Karantina', gid); if (gid !== gameSeq) return; release(p, 'membayar'); }
      else {
        phase = 'resolve'; renderHud();
        const ok = await quiz(p, '🏝️ Soal Bebas Karantina', gid); if (gid !== gameSeq) return;
        if (ok) release(p, 'menjawab soal dengan benar');
        else { p.jailTurns++; addLog(p, `${nm(p)} belum bebas dari Karantina (${p.jailTurns}/2)`); floatTile(JAIL, '🔒 Belum bebas', '#fca5a5', 28); renderPlayers(); await sleep(450); if (gid === gameSeq) endTurn(); return; }
      }
      await sleep(250); if (gid !== gameSeq) return;
    }
    let again = true; let guard = 0;
    while (again && guard++ < 4) {
      const r = await rollCore(p, gid); if (gid !== gameSeq || r == null) return;
      if (alive().length <= 1) { endGame('last'); return; }
      if (p.out) break;
      phase = 'ai'; renderHud();
      await aiManage(p, gid); if (gid !== gameSeq) return;
      again = !!r.dbl && !p.jail;
      phase = 'ai'; renderHud();
      if (again) { FX.announce('🎲 DADU KEMBAR!', { color: '#ca8a04', sub: `${esc(p.name)} melempar lagi`, dur: 900 }); await sleep(500); if (gid !== gameSeq) return; }
    }
    await sleep(150); if (gid !== gameSeq) return;
    endTurn();
  }

  /* ------------------------------ Akhir permainan ------------------------------ */
  function memberDetail(rows) {
    return `<h4>${teamMode() ? '🙋 Jawaban benar tiap anggota' : '🙋 Jawaban benar'}</h4>` + rows.map((p) => `<div class="wd" style="--pc:${p.color}"><b>${esc(p.name)}${p.stars ? ` <span class="wstar">⭐${p.stars}</span>` : ''}</b><span>${p.members && p.members.length
      ? p.members.map((m) => `<i>${esc(m.name)} <em>✔${m.correct}</em><small>/${m.asked}</small></i>`).join('') : `<i>✔ ${p.correct} dari ${p.asked} soal</i>`}</span></div>`).join('');
  }
  function endGame(reason) {
    if (phase === 'over') return; phase = 'over'; lastEnd = reason; focusTile = -1; decide = null; clearAuto();
    $('cpop').hidden = true; $('cardOv').hidden = true; renderHud(); renderPlayers(); redraw();
    let title; let ranking; let note; let order; let winner;
    if (elimMode()) {
      const surv = alive().sort((a, b) => b.cash - a.cash || worth(b).props - worth(a).props);
      const outs = [...elimLog].sort((a, b) => a.place - b.place).map((e) => P[e.id]);
      order = [...surv, ...outs]; winner = surv[0];
      const tie = surv.length > 1 && surv[1].cash === winner.cash && worth(surv[1]).props === worth(winner).props;
      const why = reason === 'last' ? `Tinggal <b>${esc(winner.name)}</b> yang bertahan` : reason === 'ronde' ? `Batas ${maxRounds()} ronde tercapai — ${surv.length} tim bertahan` : `Waktu ${timeLimit() / 60000} menit habis — ${surv.length} tim bertahan`;
      title = tie ? 'SERI!' : `SANG PENYINTAS: ${esc(winner.name)}`; // ikon 🏆 besar sudah dari layar juara
      ranking = order.map((p) => { const e = elimLog.find((x) => x.id === p.id); return {
        player: { name: p.name, avatar: p.ai ? '🤖' : p.avatar, color: p.color },
        value: p.out ? `💀 Tersingkir R${e ? e.round : '?'}<small>#${e ? e.place : '?'} • ✔ ${p.correct}/${p.asked}${p.stars ? ` • ⭐${p.stars}` : ''}</small>`
          : `🪙 ${fmt(p.cash)}<small>bertahan • 🏠 ${fmt(worth(p).props)} • ✔ ${p.correct}/${p.asked}${p.stars ? ` • ⭐${p.stars}` : ''}</small>` }; });
      note = `${why}. ${WIN_RULE}`;
    } else {
      const rows = P.map((p) => ({ p, w: worth(p) })).sort((a, b) => (a.p.out ? 1 : 0) - (b.p.out ? 1 : 0) || (a.p.out ? b.p.outOrder - a.p.outOrder : b.w.total - a.w.total || b.w.cash - a.w.cash));
      order = rows.map((r) => r.p); winner = order[0];
      const tie = rows.length > 1 && !rows[1].p.out && rows[1].w.total === rows[0].w.total && rows[1].w.cash === rows[0].w.cash;
      const why = { ronde: `${maxRounds()} ronde selesai`, last: `Tinggal satu ${unit()} yang bertahan`, waktu: `Waktu ${timeLimit() / 60000} menit habis` }[reason] || 'Permainan dihentikan';
      title = tie ? 'SERI!' : `${esc(winner.name)} — SAUDAGAR TERKAYA!`;
      ranking = rows.map((r) => ({
        player: { name: r.p.name, avatar: r.p.ai ? '🤖' : r.p.avatar, color: r.p.color },
        value: r.p.out ? `💀 BANGKRUT<small>✔ ${r.p.correct}/${r.p.asked} soal benar</small>`
          : `💎 ${fmt(r.w.total)}<small>💰 ${fmt(r.w.cash)} + 🏠 ${fmt(r.w.props)} + 🏗️ ${fmt(r.w.bld)} • ✔ ${r.p.correct}/${r.p.asked}</small>`
      }));
      note = `${why} • Total kekayaan = 💰 uang + 🏠 properti (digadai dihitung ½) + 🏗️ bangunan`;
    }
    addLog(null, `🏁 Permainan selesai. Juara: <b>${esc(winner.name)}</b>`);
    QC.showWinner({ title, ranking, unit: '', note }).then((v) => (v === 'setup' ? openSetup() : newGame()));
    const ov = [...document.querySelectorAll('.qc-winner')].pop(); const body = ov && ov.querySelector('.qc-modal-body');
    if (ov) ov.classList.toggle('sn-elim-win', elimMode());
    if (body) {
      const d = document.createElement('div'); d.className = 'win-detail';
      const el = elimMode() && elimLog.length ? `<h4>💀 Urutan tersingkir</h4><div class="win-elim">${[...elimLog].sort((a, b) => a.round - b.round || b.place - a.place).map((e) => `<span style="--pc:${P[e.id].color}"><b>${esc(e.name)}</b> tersingkir di ronde ${e.round} <em>#${e.place}</em></span>`).join('')}</div>` : '';
      d.innerHTML = el + memberDetail(order);
      body.appendChild(d);
    }
    if (ov && teamMode()) { const b = [...ov.querySelectorAll('.qc-actions button')].find((x) => /Ubah/.test(x.textContent)); if (b) b.textContent = '⚙️ Ubah Tim'; }
  }

  /* ------------------------------ Pengaturan, kota awal & mulai ------------------------------ */
  const KEY_TIM = 'lokamain_saudagar-nusantara_tim';
  const DUR_ELIM = [['r6', 'Maks. 6 ronde (±15 menit)'], ['r8', 'Maks. 8 ronde (±20 menit)'], ['r10', 'Maks. 10 ronde'], ['t15', '⏰ Maks. 15 menit'], ['t20', '⏰ Maks. 20 menit'], ['t25', '⏰ Maks. 25 menit']];
  const DUR_KLASIK = [['r6', '6 ronde'], ['r8', '8 ronde (±20 menit)'], ['r10', '10 ronde'], ['r12', '12 ronde'], ['t15', '⏰ 15 menit'], ['t20', '⏰ 20 menit'], ['t30', '⏰ 30 menit']];
  const durList = (win) => (win === 'klasik' ? DUR_KLASIK : DUR_ELIM);
  function customizeSetup(o, st) {
    o.classList.add('sn-setup');
    const panel = o.querySelector('.qc-panel'); const h3 = panel && panel.querySelector('h3'); if (!h3) return;
    const tog = document.createElement('div'); tog.className = 'sn-mode';
    tog.innerHTML = '<button type="button" data-mode="tim"><b>👥 Mode Tim</b><small>kelas dibagi 2–4 tim</small></button><button type="button" data-mode="orang"><b>👤 Perorangan</b><small>1 bidak per murid</small></button>';
    h3.insertAdjacentElement('afterend', tog);
    const tip = o.querySelector('.qc-players + .qc-muted');
    const swapNames = () => o.querySelectorAll('.qc-prow input[data-name]').forEach((inp) => {
      const i = +inp.dataset.name; const v = inp.value.trim(); let nv = null;
      if (st.mode === 'tim' && (!v || SOLO_NAMES.includes(v) || /^Pemain \d$/.test(v))) nv = TEAM_NAMES[i];
      if (st.mode !== 'tim' && (!v || TEAM_NAMES.includes(v))) nv = SOLO_NAMES[i];
      if (nv != null && nv !== v) { inp.value = nv; inp.dispatchEvent(new Event('input')); }
    });
    // cara menang: pilihan batas/durasi berganti sesuai mode
    const win = o.querySelector('[data-set="menang"]'); const dur = o.querySelector('[data-set="batasE6"]');
    const rule = document.createElement('p'); rule.className = 'sn-winrule'; const setBox = o.querySelector('.qc-settings');
    if (setBox) {
      const adv = document.createElement('details'); adv.className = 'sn-adv';
      adv.innerHTML = '<summary>⚙️ Pengaturan lanjutan <small>(opsional — bawaan sudah pas, langsung klik Mulai saja)</small></summary>';
      setBox.insertAdjacentElement('beforebegin', adv); adv.appendChild(setBox); adv.insertAdjacentElement('beforebegin', rule);
      const ok = document.createElement('p'); ok.className = 'sn-ready'; ok.innerHTML = '✅ Pengaturan bawaan sudah pas (±15 menit untuk 4 tim). Isi nama tim, lalu langsung klik <b>▶ MULAI MAIN</b>.';
      adv.insertAdjacentElement('beforebegin', ok);
    }
    const syncWin = (fromUser) => {
      if (!win || !dur) return; const w = win.value === 'klasik' ? 'klasik' : 'elim'; const list = durList(w);
      const keep = fromUser ? (w === 'klasik' ? st.durK : st.durE) : dur.value;
      const val = list.some(([v]) => v === keep) ? keep : w === 'klasik' ? 'r8' : 'r6';
      dur.innerHTML = list.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${l}</option>`).join(''); dur.value = val; dur.dispatchEvent(new Event('change'));
      const lbl = dur.closest('.qc-set') && dur.closest('.qc-set').querySelector('span'); if (lbl) lbl.textContent = w === 'klasik' ? '🏁 Durasi permainan' : '🛑 Batas aman';
      rule.innerHTML = w === 'klasik' ? '🏛️ <b>Klasik</b> — kekayaan terbanyak: pemenang = total kekayaan terbesar setelah ronde/waktu habis.' : `🔥 <b>Eliminasi</b> — bertahan sampai akhir: ${WIN_RULE}`;
      const rb = o.querySelector('[data-set="rebut"]'); if (rb) rb.closest('.qc-set').classList.toggle('sn-hl', w !== 'klasik');
    };
    if (win && dur) {
      win.addEventListener('change', () => syncWin(true));
      dur.addEventListener('change', () => { if (win.value === 'klasik') st.durK = dur.value; else st.durE = dur.value; });
      syncWin(true);
    }
    const deco = () => {
      const tim = st.mode === 'tim';
      o.classList.toggle('team', tim);
      tog.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === st.mode));
      h3.textContent = tim ? '👥 Jumlah Tim' : '👥 Jumlah Pemain';
      o.querySelectorAll('.qc-seg button').forEach((b) => (b.textContent = `${b.dataset.n} ${tim ? 'Tim' : 'Pemain'}`));
      o.querySelectorAll('.qc-prow').forEach((row) => {
        const ni = row.querySelector('[data-name]'); if (!ni) return; const i = +ni.dataset.name; let m = row.querySelector('.sn-mem');
        if (tim && !m) {
          m = document.createElement('textarea'); m.className = 'qc-input sn-mem'; m.rows = 1; m.maxLength = 300; m.placeholder = '👤 Anggota: Andi, Sari, Budi… (koma/baris baru, atau jumlah mis. 5)';
          m.value = st.members[i] || ''; const fit = () => { m.style.height = 'auto'; m.style.height = Math.min(110, m.scrollHeight + 2) + 'px'; }; m.oninput = () => { st.members[i] = m.value; fit(); }; requestAnimationFrame(fit); m.onkeydown = (e) => e.stopPropagation(); row.appendChild(m);
        }
        if (!tim && m) m.remove();
      });
      if (tip) tip.textContent = tim ? 'Klik ikon untuk ganti bidak • Tulis nama anggota supaya semua murid bergiliran menjawab • 1 tim = melawan komputer' : 'Klik ikon untuk ganti bidak: ⛵ Pinisi • 🚲 Becak • 🛺 Bajaj • 🪁 Layang Garuda • 1 pemain = melawan komputer';
      const dis = o.querySelector('[data-set="diskusi"]'); if (dis) dis.closest('.qc-set').style.display = tim ? '' : 'none';
    };
    tog.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { st.mode = b.dataset.mode; QC.sfx.click(); swapNames(); deco(); }));
    // baris baru (jumlah tim ditambah) juga ikut nama sesuai mode — mis. "Budi" dari sesi Perorangan jadi "Tim Hijau"
    const pl = o.querySelector('.qc-players'); if (pl && window.MutationObserver) new MutationObserver(() => { swapNames(); deco(); }).observe(pl, { childList: true });
    swapNames(); deco();
  }
  async function openSetup() {
    gameSeq++; phase = 'idle'; decide = null; clearAuto(); $('brief').hidden = true; $('cpop').hidden = true; $('cardOv').hidden = true; $('stamp').hidden = true; focusTile = -1;
    const saved = store(KEY_TIM) || {};
    const st = { mode: saved.mode === 'orang' ? 'orang' : 'tim', members: Array.isArray(saved.members) ? saved.members.slice(0, 4) : [], durE: saved.durE3 || 'r6', durK: saved.durK || 'r8' };
    const pr = QC.setup({
      logo: '🚢', subtitle: 'Keliling Nusantara, beli kota, tarik sewa — dan BERTAHANLAH! Tim yang kehabisan uang tersingkir. Setiap keputusan dagang diuji dengan soal kuis.',
      min: 1, max: 4, defaultCount: 4, defaultNames: st.mode === 'tim' ? TEAM_NAMES : SOLO_NAMES,
      settings: [
        { key: 'menang', label: '🏆 Cara menang', value: 'elim', options: [['elim', '🔥 Eliminasi'], ['klasik', '🏛️ Klasik']] },
        { key: 'batasE6', label: '🛑 Batas aman', value: 'r6', options: [...DUR_ELIM, ...DUR_KLASIK.filter(([v]) => !DUR_ELIM.some(([w]) => w === v))] },
        { key: 'rebut', label: '⚡ Soal Rebutan', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'lawan', label: '🤖 Tim komputer', value: 0, options: [[0, 'Tidak ada'], [1, '+1 komputer'], [2, '+2 komputer'], [3, '+3 komputer']] },
        { key: 'waktu', label: '⏱️ Waktu menjawab', value: 20, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik']] },
        { key: 'alur', label: '⚡ Alur cepat', value: 'on', options: [['on', 'Nyala (disarankan)'], ['off', 'Mati']] },
        { key: 'kota', label: '🎁 Kota awal', value: 1, options: [[0, 'Tidak ada'], [1, '1 kota per tim'], [2, '2 kota per tim']] },
        { key: 'diskusi', label: '💬 Diskusi tim', value: 'on', options: [['on', 'Boleh'], ['off', 'Tidak boleh']] },
        { key: 'modal', label: '🪙 Modal awal', value: 2500, options: [[2000, '🪙 2.000'], [2500, '🪙 2.500'], [3000, '🪙 3.000']] },
        { key: 'gaji3', label: '🚢 Gaji Pelabuhan Awal', value: 200, options: [[100, '🪙 100'], [200, '🪙 200'], [300, '🪙 300']] },
        { key: 'hard', label: '🔒 Wajib benar untuk membeli', value: 'off', options: [['off', 'Tidak'], ['on', 'Ya (sulit)']] }
      ],
      rulesHtml: RULES_SHORT
    });
    const o = [...document.querySelectorAll('.qc-setup')].pop();
    if (o) { const sm = o.querySelector('details.qc-rules'); if (sm) { sm.removeAttribute('open'); const s2 = sm.querySelector('summary'); if (s2) s2.textContent = '📜 Cara Main Singkat'; } customizeSetup(o, st); }
    renderHud(); redraw();
    const r = await pr; const set = r.settings;
    S.mode = st.mode; S.win = set.menang === 'klasik' ? 'klasik' : 'elim';
    const list = durList(S.win); S.dur = list.some(([v]) => v === String(set.batasE6)) ? String(set.batasE6) : S.win === 'klasik' ? 'r8' : 'r6';
    if (S.win === 'klasik') st.durK = S.dur; else st.durE = S.dur;
    store(KEY_TIM, { mode: st.mode, members: st.members, durE3: st.durE, durK: st.durK });
    S.rebut = set.rebut === 'off' ? 'off' : 'on'; S.bots = +set.lawan || 0; S.time = +set.waktu || 20; S.fast = set.alur === 'off' ? 'off' : 'on';
    S.start = set.kota === undefined ? 1 : clamp(+set.kota || 0, 0, 2); S.diskusi = set.diskusi === 'off' ? 'off' : 'on';
    S.cash = +set.modal || 2500; S.gaji = +set.gaji3 || 200; S.hard = set.hard === 'on' ? 'on' : 'off';
    const humans = r.players.length; let bots = clamp(S.bots, 0, 4 - humans);
    if (humans === 1 && bots === 0) { bots = 1; QC.toast(`🤖 Main sendiri: 1 ${teamMode() ? 'tim' : 'saudagar'} komputer ikut berdagang`, 'good'); }
    P = r.players.map((pl, i) => ({ id: i, name: pl.name, avatar: pl.avatar, color: pl.color || COLORS[i], kind: KINDS[Math.max(0, KIND_EMO.indexOf(pl.avatar))], ai: false,
      members: teamMode() ? parseMembers(st.members[i]).map((n) => ({ name: n, asked: 0, correct: 0 })) : [] }));
    const used = new Set(P.map((p) => p.kind));
    for (let b = 0; b < bots; b++) { const i = P.length; const kind = KINDS.find((k) => !used.has(k)) || KINDS[i % 4]; used.add(kind); P.push({ id: i, name: BOTS[b], avatar: '🤖', color: COLORS[i], kind, ai: true, members: [] }); }
    newGame();
  }
  function dealStartCities() {
    const n = clamp(+S.start || 0, 0, 2); const T = P.length; if (!n || !T) return [];
    const props = BOARD.filter((t) => t.type === 'prop').sort((a, b) => a.price - b.price);
    const band = (lo, hi) => { const s = lo + Math.floor(Math.random() * (Math.max(lo, hi - T) - lo + 1)); return { s, list: props.slice(s, s + T) }; };
    const A = band(0, n === 1 ? 14 : 9); const picks = P.map(() => []);
    QC.shuffle(A.list).forEach((t, i) => picks[i].push(t));
    if (n === 2) {
      const B = band(A.s + T, 16); let best = null;
      for (let k = 0; k < 80 && !best; k++) { const sh = QC.shuffle(B.list); if (sh.every((t, i) => t.reg !== picks[i][0].reg)) best = sh; }
      (best || B.list).forEach((t, i) => picks[i].push(t));
    }
    const vals = picks.map((l) => l.reduce((s, t) => s + t.price, 0)); const topV = Math.max(...vals);
    picks.forEach((l, i) => { l.forEach((t) => (t.owner = i)); P[i].cash += topV - vals[i]; P[i].shown = P[i].cash; });
    ownDirty = true;
    return picks.map((l, i) => ({ p: P[i], cities: l, bonus: topV - vals[i] }));
  }
  let lastDeals = [];
  function newGame() {
    gameSeq++; clearAuto(); autoHeld = false;
    BOARD.forEach((t) => { t.owner = -1; t.level = 0; t.mort = false; });
    P.forEach((p, i) => Object.assign(p, { id: i, cash: S.cash, pos: 0, jail: false, jailTurns: 0, out: false, outOrder: 0, streak: 0, keep: { shield: 0, key: 0, builder: 0 }, promo: false, shown: S.cash, anim: null, sprite: null, img: null, asked: 0, correct: 0, mi: 0, stars: 0 }));
    P.forEach((p) => (p.members || []).forEach((m) => { m.asked = 0; m.correct = 0; }));
    round = 1; turn = 0; extraRoll = false; doublesN = 0; buildLocked = false; forced = null; forcedCard = null; logList = []; $('log').innerHTML = ''; askLog.length = 0;
    deck = QC.shuffle(DECK.map((c) => c.id)); deckCycles = 1; elimLog = []; duelShown = false; rebDecide = null; rebutLog = []; lastKrisisStage = 0;
    lastEnd = ''; outSeq = 0; timeWarned = false; tStart = 0; decide = null; lastBuy = lastRent = lastBuild = lastIlmu = null; lastCard = null; lastTax = 0; curAnswerer = null;
    parts.length = 0; focusTile = -1; ownDirty = true; phase = 'brief';
    $('cpop').hidden = true; $('cardOv').hidden = true; $('stamp').hidden = true;
    lastDeals = dealStartCities();
    layout(); renderPlayers(true); renderHud(); showBrief(); wake();
    addLog(null, `🚢 Pelayaran dimulai! Setiap ${unit()} membawa modal ${coin(S.cash)}.`);
    lastDeals.forEach((d) => addLog(d.p, `🎁 ${nm(d.p)} mendapat kota awal: <b>${d.cities.map((t) => esc(t.name)).join(' & ')}</b>${d.bonus ? ` (+${fmt(d.bonus)} penyeimbang)` : ''}`, 0));
  }
  function showBrief() {
    const solo = P.some((p) => p.ai); const tim = teamMode(); const el = elimMode();
    const deals = lastDeals.length ? `<li>🎁 <b>Kota awal</b>: ${lastDeals.map((d) => `${esc(d.p.name)} → ${d.cities.map((t) => `${t.icon} ${esc(t.name)}`).join(' & ')}`).join(' • ')} <span class="mini">(nilai diseimbangkan dengan uang)</span></li>` : '';
    $('brief').innerHTML = `<div class="brief-card"><span class="stampx">${el ? '🔥 MODE ELIMINASI' : '🏛️ MODE KLASIK'}</span><h2>SAUDAGAR NUSANTARA</h2>
      <p class="brief-sub">${el ? `<b>${WIN_RULE}</b>` : solo ? `Bersainglah dengan <b>${tim ? 'tim komputer' : 'Saudagar Komputer'}</b> 🤖 untuk menjadi pedagang terkaya se-Nusantara!` : 'Kuasai kota-kota dan jadilah <b>tim saudagar terkaya</b>!'}</p>
      <div class="brief-teams">${P.map((p, i) => `<span class="bt-g">${i ? '<b class="vs">VS</b>' : ''}<span class="brief-team" style="--pc:${p.color}"><img src="${pawnImg(p)}" alt="">${esc(p.name)}${tim && p.members && p.members.length ? `<small>👥 ${p.members.length}</small>` : ''}</span></span>`).join('')}</div>
      <div class="bf-steps">
        <div class="bf-st" style="--d:0s"><i>🎲</i><b>1. Lempar dadu</b><span>Bidak timmu maju keliling Nusantara</span></div>
        <div class="bf-st" style="--d:.12s"><i>❓</i><b>2. Jawab soal</b><span>Benar = beli kota <em>diskon 20%</em> / bayar sewa <em>cuma 50%</em></span></div>
        <div class="bf-st" style="--d:.24s"><i>🏙️</i><b>3. Beli kota</b><span>Lawan yang mampir wajib bayar sewa ke timmu</span></div>
        <div class="bf-st" style="--d:.36s"><i>💰</i><b>4. Jaga uangmu!</b><span>${el ? 'Uang habis = <em>tersingkir</em>. Tim terakhir yang bertahan menang' : 'Kekayaan terbesar di akhir permainan menang'}</span></div>
        ${S.rebut === 'on' ? '<div class="bf-st hot" style="--d:.48s"><i>⚡</i><b>Rebutan!</b><span>Tim lain salah? <em>Cepat klik tombol timmu</em> untuk merebut soal</span></div>' : ''}
      </div>
      <details class="bf-more"><summary>📜 Aturan lengkap</summary>
      <ul class="brief-list">
        ${el ? `<li>💀 Uang habis? Bangunan dijual, properti digadai — masih kurang = <b>TERSINGKIR</b>. 📉 <b>Krisis</b> mulai ronde ${KRISIS.from}: sewa naik ×2→×${KRISIS.max}, mulai ronde ${KRISIS.livingFrom} ada <b>biaya hidup</b> tiap giliran.</li>` : ''}
        ${tim ? `<li>🙋 Soal dijawab <b>bergiliran</b> oleh anggota tim. ${S.diskusi === 'off' ? 'Tanpa diskusi — penjawab menjawab sendiri.' : 'Boleh diskusi, penjawab yang memilih.'}${S.rebut === 'on' ? ' Salah? Tim lain boleh <b>⚡ merebut</b> soal (+' + fmt(REBUT_GAIN) + ' / ⭐).' : ''}</li>` : ''}
        <li>🏷️ Kota mahal (${coin(BOARD[1].price)}–${coin(BOARD[31].price)})! <b>Soal Diskon</b>: benar = beli <b>−20%</b>${S.hard === 'on' ? ', salah = tidak bisa membeli' : ''}. Diskusikan sisa uang sebelum membeli.</li>
        <li>💬 Kota lawan: <b>Soal Tawar</b> (benar = sewa hanya <b>50%</b>) — kunci bertahan hidup! Lewat 🚢 Pelabuhan Awal = gaji <b>${coin(S.gaji)}</b>.</li>
        <li>🎴 3 petak <b>Kartu Kejutan</b>: <b style="color:#15803d">🍀 UNTUNG</b>, <b style="color:#b91c1c">⚠️ RUGI</b>, atau <b style="color:#b45309">⚡ TANTANGAN</b>. 🏗️ Punya 2 kota satu warna → boleh membangun.</li>
      </ul></details>
      <ul class="brief-list bf-keep">
        ${deals}
        <li>🏁 ${el ? 'Batas aman' : 'Durasi'}: ${durText()} • modal ${coin(S.cash)} • ${S.time} detik per soal${S.fast === 'on' ? ' • ⚡ alur cepat' : ''}.${el ? '' : ' Kekayaan terbesar menang!'}</li>
      </ul><button class="go-btn" id="btnGo">⛵ BERLAYAR!<small>SPASI</small></button></div>`;
    $('brief').hidden = false; $('btnGo').onclick = (e) => { e.currentTarget.blur(); startMatch(); };
  }
  function startMatch() { if (phase !== 'brief') return false; SND.ac(); QC.sfx.click(); SND.gaji(); $('brief').hidden = true; tStart = Date.now(); startTurn(); return true; }
  setInterval(() => {
    if (['idle', 'over', 'brief'].includes(phase)) return; renderInfo();
    if (!timeWarned && timeUp()) { timeWarned = true; QC.toast('⏰ Waktu habis! Permainan berakhir setelah giliran ini.', 'bad'); }
  }, 1000);

  /* ------------------------------ Masukan ------------------------------ */
  function stagePt(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  let down = null;
  cv.addEventListener('pointerdown', (e) => { SND.ac(); down = { id: e.pointerId, ...stagePt(e) }; });
  cv.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return; const p = stagePt(e); const d = down; down = null;
    if (Math.hypot(p.x - d.x, p.y - d.y) > 18 || ['idle', 'rolling', 'moving'].includes(phase) || QC.isBusy() || !$('cardOv').hidden) return;
    const i = tileAt(p.x, p.y); if (i >= 0) { const had = !!autoEnd; clearAuto(); openCard(i).then(() => { if (had) maybeAutoEnd(); }); }
  });
  cv.addEventListener('pointercancel', () => { down = null; });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return; const p = stagePt(e); const i = tileAt(p.x, p.y);
    if (i !== hoverTile) { hoverTile = i; cv.classList.toggle('hot', i >= 0); if (loopOn()) wake(); else redraw(); }
  });
  cv.addEventListener('pointerleave', () => { if (hoverTile < 0) return; hoverTile = -1; cv.classList.remove('hot'); if (loopOn()) wake(); else redraw(); });
  QC.onKey = (e) => {
    const key = e.key; const up = key.length === 1 ? key.toUpperCase() : key;
    if (up === 'M') { toggleMusic(); return; }
    if (key === ' ' || key === 'Enter') {
      e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (cpopSkip) { cpopSkip(); return; }
      if (phase === 'brief') startMatch();
      else if (phase === 'roll') doRoll();
      else if (phase === 'end') { if (extraRoll) doRoll(); else endTurn(); }
      else if (phase === 'jail') jailAction('answer');
      return;
    }
    if (up === 'B') { clearAuto(); openBuildMenu(); }
  };
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); const had = !!autoEnd; clearAuto(); QC.modal({ icon: '📜', title: 'Peraturan Saudagar Nusantara', html: `<div class="rules-pop">${RULES()}</div>`, cls: 'sn-rules', dismissable: true }).then(() => { if (had) maybeAutoEnd(); }); };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur();
    if (document.querySelector('.qc-setup.show')) return; // layar pengaturan sudah terbuka
    if (!['idle', 'over'].includes(phase)) {
      const had = !!autoEnd; clearAuto();
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Permainan yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) { if (had) maybeAutoEnd(); return; }
    }
    openSetup();
  };

  /* ------------------------------ Ukuran layar ------------------------------ */
  let relayoutQ = false;
  function relayout() { relayoutQ = false; layout(); redraw(); if (loopOn()) wake(); }
  function queueRelayout() { if (!relayoutQ) { relayoutQ = true; requestAnimationFrame(relayout); } }
  addEventListener('resize', queueRelayout);
  if (window.ResizeObserver) new ResizeObserver(queueRelayout).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cacheKey = ''; queueRelayout(); });

  /* ------------------------------ Kait pengujian ------------------------------ */
  window.__SN = {
    perf,
    get phase() { return phase; },
    state: () => ({
      phase, turn, round, maxRounds: maxRounds() === Infinity ? null : maxRounds(), dur: S.dur, mode: S.mode, win: S.win, settings: { ...S },
      alive: alive().length, elimLog: elimLog.map((e) => ({ ...e })), duelShown, rebutOpen: !!rebDecide, rebutLog: rebutLog.slice(-30), krisis: { stage: krisisStage(), mult: rentMult(), living: livingCost() }, lowLine: lowLine(), riskLine: riskLine(), extraRoll, doublesN, buildLocked, dice: [...dice], lastEnd, hard: S.hard, gaji: S.gaji, time: S.time, rentMult: rentMult(),
      players: P.map((p) => { const w = worth(p); return { name: p.name, ai: !!p.ai, kind: p.kind, color: p.color, cash: p.cash, networth: w.total, worth: w, position: p.pos, properties: owned(p.id).map((t) => t.id), jail: !!p.jail, jailTurns: p.jailTurns, out: !!p.out, streak: p.streak, asked: p.asked, correct: p.correct, keep: { ...p.keep }, promo: !!p.promo, stars: p.stars || 0, danger: !p.out && p.cash < lowLine(), members: (p.members || []).map((m) => ({ ...m })), nextAnswerer: peekAnswerer(p) ? peekAnswerer(p).name : null }; }),
      teams: P.map((p) => ({ name: p.name, ai: !!p.ai, members: (p.members || []).map((m) => m.name), mi: p.mi })),
      answerer: curAnswerer, askLog: askLog.slice(-60),
      tiles: BOARD.map((t) => ({ id: t.id, name: t.name, type: t.type, reg: t.reg || null, price: t.price || 0, owner: t.owner, level: t.level, mort: t.mort, rent: t.owner >= 0 && t.price ? rentOf(t) : 0 })),
      deckLeft: deck.length, deckCycles, deckSize: DECK.length, cardIds: DECK.map((c) => c.id), cardKinds: DECK.map((c) => c.k),
      last: { buy: lastBuy, rent: lastRent, build: lastBuild, ilmu: lastIlmu, card: lastCard, tax: lastTax },
      autoEnd: autoEnd ? { left: Math.max(0, autoEnd.dur - (performance.now() - autoEnd.t0)) } : null, autoHeld,
      decision: !!decide, offer: curOffer, question: curQ ? curQ.question : null, popup: !$('cpop').hidden, cardOpen: !$('cardOv').hidden, W, H, board: { ...BD }, running: !!raf, parts: parts.length,
      log: logList.slice(0, 12).map((l) => l.html.replace(/<[^>]+>/g, '') + (l.delta ? ` ${l.delta > 0 ? '+' : '−'}${Math.abs(l.delta)}` : ''))
    }),
    roll(a, b) { forced = a && b ? [a, b] : null; const p = cur(); if (p && !p.ai && !QC.isBusy() && (phase === 'roll' || (phase === 'end' && extraRoll))) { doRoll(); return true; } return false; },
    async answer(correct) {
      let o = null;
      for (let i = 0; i < 160; i++) { o = [...document.querySelectorAll('.qc-overlay.qc-ask.show')].find((x) => x.querySelector('.qc-opt:not(:disabled)')); if (o && curQ) break; await wait(50); }
      if (!o || !curQ) return false;
      const keys = QC.optionsOf(curQ); const k = correct ? curQ.correct : keys.find((x) => x !== curQ.correct);
      o.querySelector(`.qc-opt[data-k="${k}"]`).click(); await wait(80);
      const nb = o.querySelector('[data-next]'); if (nb) nb.click(); await wait(60);
      return true;
    },
    async waitDecision(ms = 6000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (decide) return true; await wait(40); } return false; },
    buy() { if (decide) { decide('buy'); return true; } return false; },
    skip() { if (decide) { decide('skip'); return true; } return false; },
    build: (id) => startBuild(id),
    next: () => { if (phase === 'end' && !extraRoll && !QC.isBusy()) { clearAuto(); endTurn(); return true; } return false; },
    hold: () => holdAuto(true),
    rebut: (i) => { if (!rebDecide) return false; rebDecide(i == null || i === 'skip' ? null : +i); return true; },
    closeCard: () => { if (cpopSkip) { cpopSkip(); return true; } return false; },
    jail: (k) => { if (phase !== 'jail') return false; jailAction(k); return true; },
    start: () => startMatch(),
    key: (k) => QC.onKey({ key: k, preventDefault() {} }),
    async waitPhase(ph, ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if ((Array.isArray(ph) ? ph : [ph]).includes(phase) && !QC.isBusy()) return true; await wait(40); } return false; },
    fast(on) { TS = on ? 0.12 : 1; return TS; },
    setFast(on) { TS = on ? 0.12 : 1; return TS; },
    setCash(i, n) { P[i].cash = n; renderPlayers(); renderHud(); return n; },
    give(id, pi, level = 0, mort = false) { const t = BOARD[id]; t.owner = pi; t.level = level; t.mort = mort; ownDirty = true; renderPlayers(); renderHud(); wake(); return true; },
    clearBoard() { BOARD.forEach((t) => { t.owner = -1; t.level = 0; t.mort = false; }); ownDirty = true; renderPlayers(); renderHud(); wake(); return true; },
    setPos(i, pos) { P[i].pos = pos; P[i].anim = null; wake(); return pos; },
    setTurn(i) { clearAuto(); turn = i; if (['roll', 'end', 'jail'].includes(phase)) { phase = P[i].jail ? 'jail' : 'roll'; extraRoll = false; buildLocked = false; doublesN = 0; autoHeld = false; } renderHud(); renderPlayers(); return turn; },
    setRound(n) { round = n; ownDirty = true; renderInfo(); wake(); return round; },
    setStreak(i, n) { P[i].streak = n; return n; },
    setKeep(i, k, n) { P[i].keep[k] = n; renderPlayers(); return n; },
    setJail(i, on) { P[i].jail = !!on; P[i].jailTurns = 0; if (on) P[i].pos = JAIL; renderPlayers(); wake(); return on; },
    setPromo(i, on) { P[i].promo = !!on; ownDirty = true; renderPlayers(); wake(); return on; },
    setMembers(i, list) { P[i].members = parseMembers(list).map((n) => ({ name: n, asked: 0, correct: 0 })); P[i].mi = 0; renderPlayers(true); return P[i].members.length; },
    warp(ms) { tStart -= ms; renderInfo(); return Date.now() - tStart; },
    drawCard(id) { if (!CARD_BY[id]) return false; forcedCard = id; return CARD_BY[id].t; },
    card(i) { forcedCard = DECK[i] ? DECK[i].id : null; return DECK[i] && DECK[i].t; },
    peekDraw: () => drawCardId(),
    cards: () => DECK.map((c) => ({ id: c.id, kind: c.k, title: c.t, fx: c.fx })),
    openCard: (i) => { openCard(i); return true; }, assets: (i) => { openAssets(i); return true; }, buildMenu: () => { openBuildMenu(); return true; },
    tilePoint: (i) => tileClient(i),
    lite: () => LITE,
    fps: () => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); })(); })
  };

  // papan pratinjau di belakang layar pengaturan
  buildDice(); layout(); redraw();
  openSetup();
})();