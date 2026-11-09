/* Bank soal bawaan — Kebun Buah Ceria (PAUD). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti semua soal lewat tombol ✏️ Guru (impor/ekspor Excel). Emoji boleh dipakai sebagai gambar. */
window.DEFAULT_QUESTIONS = [
  ['Buah', 'Mana buah PISANG?', ['🍌', '🍎', '🍇']],
  ['Buah', 'Mana buah APEL?', ['🍎', '🍐', '🍊']],
  ['Buah', 'Mana buah ANGGUR?', ['🍇', '🍒', '🍓']],
  ['Buah', 'Mana buah SEMANGKA?', ['🍉', '🍈', '🍍']],
  ['Buah', 'Mana buah STROBERI?', ['🍓', '🍒', '🍎']],
  ['Buah', 'Mana buah NANAS?', ['🍍', '🥥', '🍌']],
  ['Buah', 'Mana buah JERUK?', ['🍊', '🍋', '🍑']],
  ['Buah', 'Mana buah KELAPA?', ['🥥', '🥝', '🥭']],
  ['Buah', 'Mana buah ALPUKAT?', ['🥑', '🍐', '🥝']],
  ['Buah', 'Mana buah MANGGA?', ['🥭', '🍑', '🍋']],
  ['Buah', 'Mana buah PIR?', ['🍐', '🍏', '🍋']],
  ['Ciri Buah', 'Buah apa yang berwarna KUNING dan bentuknya panjang?', ['🍌', '🍇', '🍉']],
  ['Ciri Buah', 'Buah apa yang kecil, MERAH, dan ada tangkainya?', ['🍒', '🍌', '🍍']],
  ['Ciri Buah', 'Buah apa yang besar, kulitnya HIJAU, dalamnya MERAH?', ['🍉', '🍋', '🍇']],
  ['Ciri Buah', 'Buah apa yang rasanya ASAM dan berwarna kuning?', ['🍋', '🍉', '🍌']],
  ['Warna', 'Apa warna buah pisang 🍌?', ['Kuning', 'Biru', 'Hitam']],
  ['Warna', 'Apa warna buah stroberi 🍓?', ['Merah', 'Hijau', 'Ungu']],
  ['Warna', 'Apa warna buah anggur 🍇 ini?', ['Ungu', 'Kuning', 'Putih']],
  ['Warna', 'Apa warna buah jeruk 🍊?', ['Oranye', 'Biru', 'Merah muda']],
  ['Bukan Buah', 'Mana yang BUKAN buah?', ['🚗', '🍎', '🍌']],
  ['Bukan Buah', 'Mana yang BUKAN buah?', ['🐶', '🍐', '🍊']],
  ['Berhitung', 'Ada berapa apel? 🍎🍎', ['2', '3', '1']],
  ['Berhitung', 'Ada berapa jeruk? 🍊🍊🍊', ['3', '2', '5']],
  ['Berhitung', 'Ada berapa pisang? 🍌🍌🍌🍌', ['4', '3', '6']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
