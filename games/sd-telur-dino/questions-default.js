/* Bank soal bawaan — Telur Dino (SD Pancasila & PPKn). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). */
window.DEFAULT_QUESTIONS = [
  ['Lambang Pancasila', 'Lambang sila pertama Pancasila adalah …', ['Bintang', 'Rantai', 'Pohon beringin', 'Kepala banteng']],
  ['Lambang Pancasila', 'Lambang sila kedua Pancasila adalah …', ['Rantai', 'Bintang', 'Padi dan kapas', 'Pohon beringin']],
  ['Lambang Pancasila', 'Lambang sila ketiga Pancasila adalah …', ['Pohon beringin', 'Kepala banteng', 'Rantai', 'Bintang']],
  ['Lambang Pancasila', 'Lambang sila keempat Pancasila adalah …', ['Kepala banteng', 'Padi dan kapas', 'Bintang', 'Rantai']],
  ['Lambang Pancasila', 'Lambang sila kelima Pancasila adalah …', ['Padi dan kapas', 'Pohon beringin', 'Kepala banteng', 'Bintang']],
  ['Pancasila', 'Bunyi sila pertama Pancasila adalah …', ['Ketuhanan Yang Maha Esa', 'Persatuan Indonesia', 'Kemanusiaan yang adil dan beradab', 'Keadilan sosial bagi seluruh rakyat Indonesia']],
  ['Pancasila', 'Jumlah sila dalam Pancasila ada …', ['5', '4', '6', '3']],
  ['Pancasila', 'Hari Lahir Pancasila diperingati setiap tanggal …', ['1 Juni', '17 Agustus', '2 Mei', '21 April']],
  ['Pengamalan', 'Menghormati teman yang berbeda agama adalah pengamalan sila ke …', ['Pertama', 'Kedua', 'Ketiga', 'Kelima']],
  ['Pengamalan', 'Membantu teman yang terkena musibah adalah pengamalan sila ke …', ['Kedua', 'Pertama', 'Keempat', 'Kelima']],
  ['Pengamalan', 'Bangga memakai produk dalam negeri adalah pengamalan sila ke …', ['Ketiga', 'Pertama', 'Kedua', 'Keempat']],
  ['Pengamalan', 'Musyawarah untuk mencapai mufakat adalah pengamalan sila ke …', ['Keempat', 'Kedua', 'Ketiga', 'Kelima']],
  ['Pengamalan', 'Contoh sikap gotong royong adalah …', ['Kerja bakti membersihkan kampung', 'Bermain sendirian', 'Mengejek teman', 'Datang terlambat']],
  ['Persatuan', 'Semboyan bangsa Indonesia adalah …', ['Bhinneka Tunggal Ika', 'Tut Wuri Handayani', 'Gotong royong', 'Merdeka atau mati']],
  ['Persatuan', 'Arti Bhinneka Tunggal Ika adalah …', ['Berbeda-beda tetapi tetap satu', 'Bersatu kita teguh', 'Kita semua sama', 'Maju terus pantang mundur']],
  ['Persatuan', 'Indonesia memiliki banyak suku dan budaya. Sikap yang tepat adalah …', ['Saling menghargai', 'Mengejek budaya lain', 'Memaksakan budaya sendiri', 'Tidak peduli']],
  ['Simbol Negara', 'Lambang negara Indonesia adalah …', ['Garuda Pancasila', 'Bendera Merah Putih', 'Monas', 'Pohon beringin']],
  ['Simbol Negara', 'Lagu kebangsaan Indonesia adalah …', ['Indonesia Raya', 'Garuda Pancasila', 'Halo-Halo Bandung', 'Tanah Airku']],
  ['Simbol Negara', 'Pencipta lagu Indonesia Raya adalah …', ['W.R. Supratman', 'Ibu Sud', 'C. Simanjuntak', 'Ismail Marzuki']],
  ['Simbol Negara', 'Bendera negara Indonesia berwarna …', ['Merah putih', 'Merah biru', 'Putih hijau', 'Kuning merah']],
  ['Simbol Negara', 'Pita yang dicengkeram Garuda Pancasila bertuliskan …', ['Bhinneka Tunggal Ika', 'Indonesia Raya', 'Merdeka', 'Pancasila Sakti']],
  ['Hari Besar', 'Hari Kemerdekaan Indonesia diperingati setiap tanggal …', ['17 Agustus', '1 Juni', '28 Oktober', '10 November']],
  ['Hak & Kewajiban', 'Hak anak di sekolah adalah …', ['Mendapat pendidikan', 'Bekerja di pabrik', 'Membayar pajak', 'Menyapu jalan raya']],
  ['Hak & Kewajiban', 'Kewajiban siswa di sekolah adalah …', ['Belajar dengan tekun', 'Bermain sepanjang hari', 'Datang terlambat', 'Membolos']],
  ['Aturan', 'Aturan di rumah biasanya dibuat oleh …', ['Orang tua', 'Polisi', 'Presiden', 'Tetangga']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
