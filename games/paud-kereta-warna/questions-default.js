/* Bank soal bawaan — Kereta Warna & Bentuk (PAUD). Jawaban benar = pilihan A (tampilan diacak otomatis).
   Guru bisa mengganti soal lewat tombol ✏️ Guru (impor/ekspor Excel). Emoji boleh dipakai sebagai gambar. */
window.DEFAULT_QUESTIONS = [
  ['Warna', 'Mana yang berwarna MERAH?', ['🔴', '🔵', '🟢']],
  ['Warna', 'Mana yang berwarna BIRU?', ['🔵', '🟡', '🔴']],
  ['Warna', 'Mana yang berwarna HIJAU?', ['🟢', '🟣', '🟠']],
  ['Warna', 'Mana yang berwarna KUNING?', ['🟡', '🟤', '🔵']],
  ['Warna', 'Mana yang berwarna UNGU?', ['🟣', '🟢', '🔴']],
  ['Warna', 'Mana yang berwarna ORANYE?', ['🟠', '🔵', '⚫']],
  ['Warna', 'Mana yang berwarna HITAM?', ['⚫', '⚪', '🟡']],
  ['Warna', 'Mana yang berwarna PUTIH?', ['⚪', '⚫', '🟤']],
  ['Warna Benda', 'Apa warna daun 🍃?', ['Hijau', 'Merah', 'Biru']],
  ['Warna Benda', 'Apa warna langit saat cerah?', ['Biru', 'Hitam', 'Cokelat']],
  ['Warna Benda', 'Apa warna buah tomat 🍅?', ['Merah', 'Ungu', 'Biru']],
  ['Warna Benda', 'Mana yang warnanya SAMA dengan apel 🍎?', ['🔴', '🟢', '🔵']],
  ['Bentuk', 'Mana bentuk LINGKARAN?', ['⚪', '🔺', '🟥']],
  ['Bentuk', 'Mana bentuk SEGITIGA?', ['🔺', '🟦', '⚫']],
  ['Bentuk', 'Mana bentuk PERSEGI (kotak)?', ['🟥', '🔺', '🔵']],
  ['Bentuk', 'Mana bentuk BINTANG?', ['⭐', '❤️', '🔷']],
  ['Bentuk', 'Mana bentuk HATI?', ['❤️', '⭐', '🔶']],
  ['Bentuk Benda', 'Bola ⚽ bentuknya…', ['Bulat', 'Segitiga', 'Kotak']],
  ['Bentuk Benda', 'Sepotong pizza 🍕 bentuknya…', ['Segitiga', 'Lingkaran', 'Bintang']],
  ['Bentuk Benda', 'Kotak hadiah 🎁 bentuknya…', ['Kotak', 'Bulat', 'Hati']],
  ['Bentuk Benda', 'Mana yang bentuknya SAMA dengan bulan purnama 🌕?', ['⚪', '🔺', '🟥']]
].map((r, i) => ({ id: i + 1, category: r[0], question: r[1], optionA: r[2][0], optionB: r[2][1], optionC: r[2][2] || '', optionD: r[2][3] || '', correct: 'A', explanation: r[3] || '' }));
