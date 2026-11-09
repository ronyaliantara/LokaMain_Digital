/* Bank soal bawaan — Basket Juara (SD IPS & Pengetahuan Umum). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). */
window.DEFAULT_QUESTIONS = [
  ['Provinsi', 'Ibu kota provinsi Jawa Barat adalah …', ['Bandung', 'Semarang', 'Surabaya', 'Serang']],
  ['Provinsi', 'Ibu kota provinsi Jawa Timur adalah …', ['Surabaya', 'Malang', 'Semarang', 'Bandung']],
  ['Provinsi', 'Ibu kota provinsi Sumatera Utara adalah …', ['Medan', 'Padang', 'Palembang', 'Pekanbaru']],
  ['Provinsi', 'Ibu kota provinsi Bali adalah …', ['Denpasar', 'Mataram', 'Kupang', 'Singaraja']],
  ['Budaya', 'Rumah adat Gadang berasal dari …', ['Sumatera Barat', 'Jawa Tengah', 'Bali', 'Papua']],
  ['Budaya', 'Tari Kecak berasal dari …', ['Bali', 'Aceh', 'Jawa Barat', 'Maluku']],
  ['Budaya', 'Alat musik angklung berasal dari …', ['Jawa Barat', 'Papua', 'Sumatera Utara', 'Bali']],
  ['Budaya', 'Candi Borobudur terletak di provinsi …', ['Jawa Tengah', 'Jawa Timur', 'Bali', 'Banten']],
  ['Geografi', 'Danau terbesar di Indonesia adalah …', ['Danau Toba', 'Danau Maninjau', 'Danau Poso', 'Danau Singkarak']],
  ['Geografi', 'Gunung tertinggi di Pulau Jawa adalah …', ['Gunung Semeru', 'Gunung Merapi', 'Gunung Bromo', 'Gunung Gede']],
  ['Geografi', 'Indonesia terletak di antara dua benua, yaitu …', ['Asia dan Australia', 'Asia dan Afrika', 'Eropa dan Asia', 'Amerika dan Australia']],
  ['Geografi', 'Indonesia terletak di antara dua samudra, yaitu …', ['Hindia dan Pasifik', 'Atlantik dan Pasifik', 'Hindia dan Atlantik', 'Arktik dan Pasifik']],
  ['Peta', 'Arah mata angin yang berlawanan dengan utara adalah …', ['Selatan', 'Timur', 'Barat', 'Tenggara']],
  ['Peta', 'Peta adalah gambaran permukaan bumi pada bidang …', ['Datar', 'Bulat', 'Miring', 'Cekung']],
  ['Sejarah', 'Proklamator kemerdekaan Indonesia adalah …', ['Soekarno dan Mohammad Hatta', 'Soekarno dan Soeharto', 'Hatta dan Sjahrir', 'Kartini dan Dewi Sartika']],
  ['Sejarah', 'Presiden pertama Republik Indonesia adalah …', ['Ir. Soekarno', 'Soeharto', 'B.J. Habibie', 'Abdurrahman Wahid']],
  ['Pahlawan', 'Pahlawan wanita dari Aceh adalah …', ['Cut Nyak Dhien', 'R.A. Kartini', 'Dewi Sartika', 'Martha Christina Tiahahu']],
  ['Pahlawan', 'R.A. Kartini berjuang untuk …', ['Pendidikan kaum perempuan', 'Membangun jalan raya', 'Melawan penjajah di laut', 'Membuat lagu kebangsaan']],
  ['Hari Besar', 'Hari Pahlawan diperingati setiap tanggal …', ['10 November', '17 Agustus', '1 Juni', '28 Oktober']],
  ['Ekonomi', 'Mata uang negara Indonesia adalah …', ['Rupiah', 'Ringgit', 'Dolar', 'Peso']],
  ['Ekonomi', 'Kegiatan jual beli secara langsung biasanya terjadi di …', ['Pasar', 'Sekolah', 'Rumah sakit', 'Kantor polisi']],
  ['Ekonomi', 'Orang yang membuat atau menghasilkan barang disebut …', ['Produsen', 'Konsumen', 'Pembeli', 'Penonton']],
  ['Ekonomi', 'Orang yang memakai atau menggunakan barang disebut …', ['Konsumen', 'Produsen', 'Distributor', 'Pedagang']],
  ['Sumber Daya Alam', 'Contoh sumber daya alam yang TIDAK dapat diperbarui adalah …', ['Minyak bumi', 'Air', 'Tumbuhan', 'Hewan']],
  ['ASEAN', 'Organisasi kerja sama negara-negara Asia Tenggara disebut …', ['ASEAN', 'PBB', 'UNICEF', 'FIFA']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
