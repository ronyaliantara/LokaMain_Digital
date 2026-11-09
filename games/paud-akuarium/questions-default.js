/* Bank soal bawaan — Akuarium Hewan (PAUD). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). Emoji boleh dipakai sebagai gambar. */
window.DEFAULT_QUESTIONS = [
  ['Suara Hewan', 'Hewan apa yang bersuara "MOO"?', ['🐄', '🐔', '🐶']],
  ['Suara Hewan', '"KUKURUYUK!" Itu suara hewan apa?', ['🐓', '🐱', '🐸']],
  ['Suara Hewan', '"MEONG MEONG" Itu suara hewan apa?', ['🐱', '🐶', '🐮']],
  ['Suara Hewan', '"GUK GUK" Itu suara hewan apa?', ['🐶', '🐱', '🐷']],
  ['Suara Hewan', '"KWEK KWEK" Itu suara hewan apa?', ['🦆', '🐔', '🐟']],
  ['Suara Hewan', '"EMBEK" Itu suara hewan apa?', ['🐐', '🐄', '🐦']],
  ['Tempat Hidup', 'Hewan apa yang hidup di AIR?', ['🐟', '🐄', '🐔']],
  ['Tempat Hidup', 'Hewan apa yang tinggal di LAUT dan sangat BESAR?', ['🐳', '🐜', '🐞']],
  ['Ciri Hewan', 'Hewan apa yang bisa TERBANG?', ['🐦', '🐟', '🐢']],
  ['Ciri Hewan', 'Hewan apa yang punya BELALAI panjang?', ['🐘', '🦒', '🐻']],
  ['Ciri Hewan', 'Hewan apa yang LEHERNYA panjang?', ['🦒', '🐘', '🐷']],
  ['Ciri Hewan', 'Hewan apa yang jalannya LAMBAT dan punya cangkang?', ['🐢', '🐇', '🐎']],
  ['Ciri Hewan', 'Hewan apa yang punya 8 tentakel?', ['🐙', '🐟', '🐬']],
  ['Makanan Hewan', 'Hewan apa yang suka makan WORTEL?', ['🐰', '🦁', '🐟']],
  ['Makanan Hewan', 'Hewan apa yang suka makan PISANG?', ['🐒', '🐔', '🐟']],
  ['Manfaat Hewan', 'Hewan apa yang menghasilkan SUSU?', ['🐄', '🐔', '🐟']],
  ['Manfaat Hewan', 'Hewan apa yang bertelur?', ['🐔', '🐄', '🐶']],
  ['Kenal Hewan', 'Mana anak ayam?', ['🐤', '🐶', '🐟']],
  ['Kenal Hewan', 'Siapa yang disebut RAJA HUTAN?', ['🦁', '🐭', '🐸']],
  ['Kenal Hewan', 'Mana yang BUKAN hewan?', ['🌳', '🐕', '🐈']],
  ['Kenal Hewan', 'Gambar apa ini? 🐧', ['Penguin', 'Ayam', 'Bebek']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
