/* Bank soal bawaan — Hitung Hewan (PAUD). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). Emoji boleh dipakai sebagai gambar. */
window.DEFAULT_QUESTIONS = [
  ['Berhitung', 'Ada berapa ayam? 🐔🐔🐔', ['3', '2', '4']],
  ['Berhitung', 'Ada berapa sapi? 🐄🐄', ['2', '1', '3']],
  ['Berhitung', 'Ada berapa bebek? 🦆🦆🦆🦆', ['4', '3', '5']],
  ['Berhitung', 'Ada berapa domba? 🐑', ['1', '2', '3']],
  ['Berhitung', 'Ada berapa kelinci? 🐇🐇🐇🐇🐇', ['5', '4', '6']],
  ['Berhitung', 'Ada berapa babi? 🐖🐖🐖🐖🐖🐖', ['6', '5', '7']],
  ['Berhitung', 'Ada berapa kuda? 🐎🐎🐎🐎🐎🐎🐎', ['7', '6', '8']],
  ['Berhitung', 'Ada berapa anak ayam? 🐤🐤🐤🐤🐤🐤🐤🐤', ['8', '7', '9']],
  ['Berhitung', 'Ada berapa kucing? 🐈🐈🐈🐈🐈🐈🐈🐈🐈', ['9', '8', '10']],
  ['Berhitung', 'Ada berapa ikan? 🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟', ['10', '9', '8']],
  ['Jumlah', 'Mana yang jumlahnya TIGA?', ['🐔🐔🐔', '🐔🐔', '🐔']],
  ['Jumlah', 'Mana yang jumlahnya LIMA?', ['🐄🐄🐄🐄🐄', '🐄🐄🐄', '🐄🐄🐄🐄']],
  ['Jumlah', 'Mana yang jumlahnya DUA?', ['🐑🐑', '🐑🐑🐑', '🐑']],
  ['Banyak Sedikit', 'Mana yang LEBIH BANYAK?', ['🐇🐇🐇🐇', '🐇🐇']],
  ['Banyak Sedikit', 'Mana yang PALING SEDIKIT?', ['🦆', '🦆🦆🦆', '🦆🦆']],
  ['Penjumlahan', 'Dua ayam ditambah satu ayam, jadi berapa? 🐔🐔 ➕ 🐔', ['3', '2', '4']],
  ['Penjumlahan', 'Tiga bebek ditambah dua bebek, jadi berapa? 🦆🦆🦆 ➕ 🦆🦆', ['5', '4', '6']],
  ['Urutan Angka', 'Angka sesudah 4 adalah…', ['5', '3', '6']],
  ['Urutan Angka', 'Angka sebelum 3 adalah…', ['2', '4', '1']],
  ['Urutan Angka', 'Angka sesudah 7 adalah…', ['8', '6', '9']],
  ['Hewan', 'Hewan apa yang paling banyak? 🐔🐔🐔🐄', ['🐔', '🐄']],
  ['Hewan', 'Ayam 🐔 punya berapa kaki?', ['2', '4', '3']],
  ['Hewan', 'Kucing 🐈 punya berapa kaki?', ['4', '2', '6']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
