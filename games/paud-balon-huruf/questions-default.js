/* Bank soal bawaan — Balon Huruf (PAUD). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). Emoji boleh dipakai sebagai gambar. */
window.DEFAULT_QUESTIONS = [
  ['Huruf Awal', 'Huruf awal dari KUCING 🐱 adalah…', ['K', 'M', 'B']],
  ['Huruf Awal', 'APEL 🍎 dimulai dengan huruf…', ['A', 'E', 'P']],
  ['Huruf Awal', 'IKAN 🐟 dimulai dengan huruf…', ['I', 'K', 'A']],
  ['Huruf Awal', 'BEBEK 🦆 dimulai dengan huruf…', ['B', 'D', 'P']],
  ['Huruf Awal', 'GAJAH 🐘 dimulai dengan huruf…', ['G', 'J', 'H']],
  ['Huruf Awal', 'ULAR 🐍 dimulai dengan huruf…', ['U', 'L', 'R']],
  ['Huruf Awal', 'BULAN 🌙 dimulai dengan huruf…', ['B', 'N', 'L']],
  ['Huruf Awal', 'RUMAH 🏠 dimulai dengan huruf…', ['R', 'M', 'H']],
  ['Huruf Awal', 'MOBIL 🚗 dimulai dengan huruf…', ['M', 'B', 'L']],
  ['Huruf Awal', 'PISANG 🍌 dimulai dengan huruf…', ['P', 'S', 'B']],
  ['Huruf Awal', 'SAPI 🐄 dimulai dengan huruf…', ['S', 'P', 'I']],
  ['Huruf Awal', 'TOMAT 🍅 dimulai dengan huruf…', ['T', 'M', 'O']],
  ['Kenal Huruf', 'Mana huruf A?', ['A', 'H', 'V']],
  ['Kenal Huruf', 'Mana huruf B?', ['B', 'D', 'P']],
  ['Kenal Huruf', 'Mana huruf M?', ['M', 'N', 'W']],
  ['Kenal Huruf', 'Mana huruf S?', ['S', 'Z', 'C']],
  ['Kenal Huruf', 'Mana huruf O?', ['O', 'Q', 'C']],
  ['Kenal Huruf', 'Mana yang huruf VOKAL?', ['A', 'K', 'T']],
  ['Urutan Huruf', 'Huruf sesudah A adalah…', ['B', 'C', 'D']],
  ['Urutan Huruf', 'Huruf sebelum D adalah…', ['C', 'B', 'E']],
  ['Membaca', 'Mana tulisan BOLA? ⚽', ['BOLA', 'BOLU', 'BALA']],
  ['Membaca', 'Gambar apa ini? 🦁', ['SINGA', 'SAPI', 'SEMUT']],
  ['Membaca', 'Gambar apa ini? 🐸', ['KATAK', 'KUDA', 'KUCING']],
  ['Membaca', 'Gambar apa ini? ☀️', ['MATAHARI', 'BULAN', 'BINTANG']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
