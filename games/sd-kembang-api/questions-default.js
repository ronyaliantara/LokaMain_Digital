/* Bank soal bawaan — Kembang Api Kata (SD Bahasa Indonesia). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). */
window.DEFAULT_QUESTIONS = [
  ['Sinonim', 'Persamaan kata (sinonim) "pandai" adalah …', ['Pintar', 'Bodoh', 'Malas', 'Lambat']],
  ['Sinonim', 'Sinonim kata "gembira" adalah …', ['Senang', 'Sedih', 'Marah', 'Takut']],
  ['Sinonim', 'Sinonim kata "cantik" adalah …', ['Elok', 'Jelek', 'Kotor', 'Kusam']],
  ['Antonim', 'Lawan kata (antonim) "tinggi" adalah …', ['Rendah', 'Besar', 'Panjang', 'Jauh']],
  ['Antonim', 'Antonim kata "rajin" adalah …', ['Malas', 'Pandai', 'Giat', 'Tekun']],
  ['Antonim', 'Antonim kata "siang" adalah …', ['Malam', 'Pagi', 'Sore', 'Terang']],
  ['Antonim', 'Antonim kata "besar" adalah …', ['Kecil', 'Luas', 'Panjang', 'Tinggi']],
  ['Kata Baku', 'Penulisan kata baku yang benar adalah …', ['Apotek', 'Apotik', 'Apotiq', 'Afotek']],
  ['Kata Baku', 'Penulisan kata baku yang benar adalah …', ['Nasihat', 'Nasehat', 'Naseat', 'Nasiat']],
  ['Kata Baku', 'Penulisan kata baku yang benar adalah …', ['Karier', 'Karir', 'Kariir', 'Kariar']],
  ['Ejaan', 'Huruf kapital digunakan pada …', ['Awal kalimat', 'Tengah kata', 'Akhir kalimat', 'Setiap huruf']],
  ['Tanda Baca', 'Tanda baca di akhir kalimat tanya adalah …', ['Tanda tanya (?)', 'Titik (.)', 'Koma (,)', 'Tanda seru (!)']],
  ['Tanda Baca', 'Tanda baca di akhir kalimat perintah adalah …', ['Tanda seru (!)', 'Tanda tanya (?)', 'Koma (,)', 'Titik dua (:)']],
  ['Kalimat', '"Ibu memasak di dapur." Subjek kalimat tersebut adalah …', ['Ibu', 'Memasak', 'Di dapur', 'Dapur']],
  ['Kalimat', '"Adik bermain bola." Predikat kalimat tersebut adalah …', ['Bermain', 'Adik', 'Bola', 'Adik bermain']],
  ['Kalimat', 'Kalimat ajakan biasanya menggunakan kata …', ['Ayo', 'Jangan', 'Mengapa', 'Siapa']],
  ['Imbuhan', 'Kata "berlari" mendapat imbuhan …', ['ber-', 'me-', 'di-', 'ter-']],
  ['Imbuhan', 'Kata "dimakan" mendapat imbuhan …', ['di-', 'ber-', 'ke-', '-an']],
  ['Kata Ulang', 'Kata ulang dari "anak" adalah …', ['Anak-anak', 'Anakan', 'Beranak', 'Keanakan']],
  ['Peribahasa', 'Arti peribahasa "Rajin pangkal pandai" adalah …', ['Orang yang rajin akan menjadi pandai', 'Orang pandai pasti malas', 'Rajin itu melelahkan', 'Pandai tidak perlu belajar']],
  ['Peribahasa', 'Arti peribahasa "Seperti padi, makin berisi makin merunduk" adalah …', ['Makin berilmu makin rendah hati', 'Makin kaya makin sombong', 'Padi yang rusak', 'Orang yang malas bekerja']],
  ['Cerita', 'Cerita tentang hewan yang berperilaku seperti manusia disebut …', ['Fabel', 'Legenda', 'Mite', 'Biografi']],
  ['Paragraf', 'Gagasan utama sebuah paragraf disebut …', ['Ide pokok', 'Judul', 'Kesimpulan', 'Kalimat penjelas']],
  ['Puisi', 'Puisi tersusun atas …', ['Bait dan baris', 'Paragraf', 'Bab', 'Dialog']],
  ['Bahasa', 'Bahasa resmi negara Indonesia adalah …', ['Bahasa Indonesia', 'Bahasa Jawa', 'Bahasa Inggris', 'Bahasa Sunda']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
