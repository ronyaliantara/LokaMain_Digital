/* Bank soal bawaan — Kapal Selam IPA (SD). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). */
window.DEFAULT_QUESTIONS = [
  ['Makhluk Hidup', 'Hewan pemakan tumbuhan disebut …', ['Herbivora', 'Karnivora', 'Omnivora', 'Insektivora']],
  ['Makhluk Hidup', 'Hewan pemakan daging disebut …', ['Karnivora', 'Herbivora', 'Omnivora', 'Insektivora']],
  ['Makhluk Hidup', 'Tumbuhan membuat makanannya sendiri melalui proses …', ['Fotosintesis', 'Respirasi', 'Penguapan', 'Pengembunan']],
  ['Makhluk Hidup', 'Bagian tumbuhan yang menyerap air dari tanah adalah …', ['Akar', 'Daun', 'Bunga', 'Buah']],
  ['Makhluk Hidup', 'Alat pernapasan ikan adalah …', ['Insang', 'Paru-paru', 'Trakea', 'Kulit']],
  ['Makhluk Hidup', 'Urutan metamorfosis kupu-kupu: telur → ulat → … → kupu-kupu', ['Kepompong', 'Berudu', 'Nimfa', 'Anak ayam']],
  ['Makhluk Hidup', 'Hewan yang berkembang biak dengan bertelur disebut …', ['Ovipar', 'Vivipar', 'Mamalia', 'Herbivora']],
  ['Makhluk Hidup', 'Tumbuhan kaktus banyak hidup di daerah …', ['Gurun', 'Kutub', 'Rawa', 'Laut']],
  ['Tubuh Manusia', 'Alat pernapasan manusia adalah …', ['Paru-paru', 'Insang', 'Lambung', 'Usus']],
  ['Tubuh Manusia', 'Indra untuk melihat adalah …', ['Mata', 'Telinga', 'Hidung', 'Lidah']],
  ['Tubuh Manusia', 'Indra pengecap rasa adalah …', ['Lidah', 'Kulit', 'Mata', 'Telinga']],
  ['Tubuh Manusia', 'Jantung berfungsi untuk …', ['Memompa darah', 'Mencerna makanan', 'Menyaring udara', 'Berpikir']],
  ['Kesehatan', 'Penyakit sariawan disebabkan oleh kekurangan vitamin …', ['C', 'A', 'D', 'K']],
  ['Bumi & Antariksa', 'Planet tempat kita tinggal adalah …', ['Bumi', 'Mars', 'Venus', 'Jupiter']],
  ['Bumi & Antariksa', 'Pusat tata surya kita adalah …', ['Matahari', 'Bumi', 'Bulan', 'Bintang Kutub']],
  ['Bumi & Antariksa', 'Bulan bergerak mengelilingi …', ['Bumi', 'Matahari', 'Mars', 'Bintang']],
  ['Bumi & Antariksa', 'Lapisan bumi paling luar disebut …', ['Kerak bumi', 'Inti bumi', 'Mantel bumi', 'Magma']],
  ['Wujud Benda', 'Air yang dipanaskan terus akan berubah menjadi uap. Peristiwa ini disebut …', ['Menguap', 'Membeku', 'Mencair', 'Mengembun']],
  ['Wujud Benda', 'Es batu yang dibiarkan di udara terbuka akan …', ['Mencair', 'Membeku', 'Menyublim', 'Mengembun']],
  ['Wujud Benda', 'Perubahan wujud gas menjadi cair disebut …', ['Mengembun', 'Menguap', 'Membeku', 'Menyublim']],
  ['Energi & Gaya', 'Sumber energi terbesar bagi bumi adalah …', ['Matahari', 'Bulan', 'Angin', 'Listrik']],
  ['Energi & Gaya', 'Benda yang dapat ditarik magnet adalah …', ['Paku besi', 'Kayu', 'Plastik', 'Kertas']],
  ['Energi & Gaya', 'Gaya yang membuat benda jatuh ke bawah adalah gaya …', ['Gravitasi', 'Magnet', 'Gesek', 'Pegas']],
  ['Energi & Gaya', 'Bunyi merambat paling cepat melalui …', ['Benda padat', 'Udara', 'Benda cair', 'Ruang hampa']],
  ['Energi & Gaya', 'Contoh benda yang memiliki energi gerak adalah …', ['Kipas angin yang berputar', 'Batu yang diam', 'Buku di atas meja', 'Kursi di kelas']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
