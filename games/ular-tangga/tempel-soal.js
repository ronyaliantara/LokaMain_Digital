/* ==========================================================================
   TempelSoal — cara termudah guru memasukkan soal (dipakai SEMUA game)
   - Guru menyalin soal dari Word / Google Docs / WhatsApp / ChatGPT / Gemini
     lalu MENEMPEL di satu kotak. Soal dibaca otomatis (nomor, A–E, Jawaban).
   - Tombol "Buat soal dengan AI": menyalin perintah siap pakai untuk AI gratis
     (ChatGPT / Gemini / Claude); hasilnya tinggal ditempel kembali. Rp0.
   - Pratinjau kartu soal + pesan perbaikan yang mudah dipahami.
   API: TempelSoal.parse(text, {maxOpt, minOpt, category})
        TempelSoal.prompt({topic, level, count, nOpt, diff})
        TempelSoal.open({maxOpt, minOpt, current, onSave(list, mode)})
   Hasil soal: {category, question, options:[...], correct:index, explanation}
   ========================================================================== */
(function () {
  'use strict';
  if (window.TempelSoal) return;
  const L = ['A', 'B', 'C', 'D', 'E'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').trim();

  /* ------------------------------ Pembaca soal ------------------------------ */
  const RE_Q = /^(?:(?:soal|no|nomor|pertanyaan)\s*\.?\s*)?(\d{1,3})\s*[.)\]:]\s*(.*)$/i;
  const RE_QLABEL = /^(?:soal|no|nomor|pertanyaan)\s*\.?\s*(\d{1,3})\s*[.):]?\s*$/i;
  const RE_OPT = /^[(\[]?([A-Ea-e])\s*[.)\]:]\s*(.+)$/;
  const RE_ANS = /^(?:kunci\s+jawaban|jawaban\s+yang\s+benar|jawaban\s+benar|jawabannya|jawaban|jawab|jwb|kunci|answer\s+key|answer)(?![a-z])\s*([:=\-–])?\s*(.*)$/i;
  const RE_EXP = /^(?:pembahasan|penjelasan|alasan|keterangan|explanation)\s*[:=\-–]\s*(.*)$/i;
  const RE_CAT = /^(?:kategori|materi|topik)\s*[:\-–]\s*(.+)$/i;
  const RE_LET = /^\(?([A-Ea-e])\)?(?:[.):]|\s|$)/;
  const lead = (s) => s.replace(/^[^\p{L}\p{N}(\[]+/u, ''); // buang emoji/simbol di depan "✅ Jawaban: B"
  const RE_PAIR = /(\d{1,3})\s*[.)=:\-]?\s*\(?([A-Ea-e])\b/g;
  const MARK = /\s*(?:\*|✓|✔|✅|\((?:benar|jawaban|kunci)\))\s*$/i;

  function cleanLine(line) {
    let s = String(line).replace(/ /g, ' ').replace(/\t/g, ' ');
    s = s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/`/g, '');
    s = s.replace(/^\s*(?:[-•▪●◦·>]|#{1,6})\s+/, '');
    return s.replace(/\s+/g, ' ').trim();
  }
  const pairsOf = (s) => { const out = []; let m; RE_PAIR.lastIndex = 0; while ((m = RE_PAIR.exec(s))) out.push([+m[1], m[2].toUpperCase()]); return out; };
  function splitOpts(s) { // "A. x B. y C. z" dalam satu baris
    const parts = s.split(/\s+(?=[(\[]?[A-Ea-e]\s*[.)\]]\s)/);
    if (parts.length < 2) return null;
    const ms = parts.map((p) => p.match(RE_OPT));
    if (ms.some((m) => !m)) return null;
    const ls = ms.map((m) => m[1].toUpperCase());
    for (let i = 1; i < ls.length; i++) if (L.indexOf(ls[i]) !== L.indexOf(ls[i - 1]) + 1) return null;
    return ms;
  }

  function parse(text, opt = {}) {
    const maxOpt = opt.maxOpt || 4; const minOpt = opt.minOpt || 2; let category = opt.category || '';
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(cleanLine);
    const qs = []; const ignored = []; const keyMap = {};
    let cur = null; let keyMode = false; let wantAns = false; let auto = 0;
    const newQ = (no, txt) => { cur = { no: no || null, text: txt || '', opts: [], ans: null, ansText: '', exp: '', expMode: false, cat: category }; qs.push(cur); };
    const nextNonEmpty = (i) => { for (let j = i + 1; j < lines.length; j++) if (lines[j] && !/^```/.test(lines[j])) return lines[j]; return ''; };
    const isOpt = (s) => RE_OPT.test(s) || !!splitOpts(s);
    const addOpt = (letter, t) => {
      let mark = false; let txt = t.trim();
      if (MARK.test(txt)) { mark = true; txt = txt.replace(MARK, '').trim(); }
      cur.opts.push({ letter: letter.toUpperCase(), text: txt, mark }); cur.expMode = false;
    };
    for (let i = 0; i < lines.length; i++) {
      let s = lines[i];
      if (!s || /^```/.test(s) || /^[-=_*]{3,}$/.test(s)) continue;
      // bagian kunci jawaban di akhir dokumen: "1. A  2. C ..." atau "1-A, 2-C"
      if (keyMode) { const p = pairsOf(s); if (p.length) { p.forEach(([n, l]) => (keyMap[n] = l)); continue; } keyMode = false; }
      if (wantAns) { wantAns = false; const p = pairsOf(s); if (p.length && /^\d/.test(s)) { keyMode = true; p.forEach(([n, l]) => (keyMap[n] = l)); continue; } const m1 = s.match(RE_LET); if (cur && m1) { cur.ans = m1[1].toUpperCase(); continue; } if (cur && !RE_Q.test(s)) { cur.ansText = s; continue; } }
      let m; const sl = lead(s);
      if ((m = sl.match(RE_CAT)) && !(cur && cur.opts.length && !cur.ans && !cur.ansText)) { category = m[1].trim(); if (cur && !cur.opts.length) cur.cat = category; continue; }
      if ((m = sl.match(RE_EXP))) { if (cur) { cur.exp = m[1].trim(); cur.expMode = true; } continue; }
      if ((m = sl.match(RE_ANS))) {
        const sep = !!m[1]; const rest = m[2].trim(); const pr = pairsOf(rest);
        const looksKey = !rest || pr.length >= 2 || RE_LET.test(rest);
        if (sep || looksKey) {
          if (!rest) { wantAns = true; continue; }
          if (pr.length >= 2 || (pr.length === 1 && /^\d/.test(rest) && (!cur || !cur.opts.length || cur.ans))) { keyMode = true; pr.forEach(([n, l]) => (keyMap[n] = l)); continue; }
          if (cur) {
            const ml = rest.match(RE_LET);
            if (ml) { cur.ans = ml[1].toUpperCase(); const after = rest.slice(ml[0].length).replace(/^[.)\s]+/, '').trim(); if (after && !cur.ansText) cur.ansText = after; }
            else cur.ansText = rest;
            cur.expMode = false;
          }
          continue;
        }
      }
      if ((m = s.match(RE_QLABEL))) { newQ(+m[1], ''); continue; }
      if (cur && cur.opts.length === 0 && cur.text === '' && !RE_OPT.test(s)) { cur.text = s; continue; }
      // pilihan jawaban (bisa beberapa dalam satu baris)
      if (cur && !cur.expMode && (cur.text || cur.opts.length) && !(cur.ans || cur.ansText) && isOpt(s)) {
        const many = splitOpts(s);
        if (many) many.forEach((mm) => addOpt(mm[1], mm[2])); else { m = s.match(RE_OPT); addOpt(m[1], m[2]); }
        continue;
      }
      // tanda * di depan pilihan:  "*B. Jupiter"
      if (cur && /^\*\s*[A-Ea-e]\s*[.)]/.test(s) && !(cur.ans || cur.ansText)) { m = s.replace(/^\*\s*/, '').match(RE_OPT); if (m) { addOpt(m[1], m[2] + ' *'); continue; } }
      if ((m = s.match(RE_Q)) && m[2] && !/^\D{0,12}\d{1,3}[.,:]\d/.test(s)) { newQ(+m[1], m[2].trim()); continue; }
      // baris biasa
      if (cur && cur.opts.length === 0) { cur.text += (cur.text ? ' ' : '') + s; continue; }
      if (isOpt(nextNonEmpty(i)) && (!cur || cur.opts.length >= 2)) { newQ(null, s); continue; } // soal tanpa nomor
      if (cur && cur.expMode) { cur.exp += (cur.exp ? ' ' : '') + s; continue; }
      if (cur && cur.opts.length && !(cur.ans || cur.ansText) && !/[?:]$/.test(s) && s.length < 160) { cur.opts[cur.opts.length - 1].text += ' ' + s; continue; }
      ignored.push(s);
    }
    // susun hasil
    const items = qs.map((c, idx) => {
      const no = c.no || idx + 1; const warn = []; let err = '';
      const seen = new Set(); let opts = c.opts.filter((o) => (seen.has(o.letter) ? false : (seen.add(o.letter), true)));
      let ci = -1;
      const keyL = c.ans || keyMap[no] || null;
      if (keyL) ci = opts.findIndex((o) => o.letter === keyL);
      if (ci < 0 && c.ansText) { const t = norm(c.ansText); ci = opts.findIndex((o) => norm(o.text) === t); if (ci < 0) ci = opts.findIndex((o) => t && (norm(o.text).startsWith(t) || t.startsWith(norm(o.text)))); }
      if (ci < 0) ci = opts.findIndex((o) => o.mark);
      const text = c.text.replace(/^[:.\-\s]+/, '').trim();
      if (!text) err = 'Pertanyaannya kosong.';
      else if (opts.length < minOpt) err = opts.length ? `Pilihan jawaban baru ${opts.length}. Minimal ${minOpt} pilihan (A dan B).` : 'Pilihan jawaban tidak ditemukan. Tulis tiap pilihan di baris sendiri, diawali A. B. C. D.';
      else if (opts.some((o) => !o.text)) err = 'Ada pilihan jawaban yang kosong.';
      else if (ci < 0 && keyL) err = `Jawaban "${keyL}" tidak ada di pilihan soal ini.`;
      else if (ci < 0) err = 'Kunci jawaban belum ada. Tambahkan baris  Jawaban: A  di bawah pilihan.';
      if (!err && opts.length > maxOpt) {
        const keep = [opts[ci]].concat(opts.filter((_, k) => k !== ci).slice(0, maxOpt - 1));
        const dropped = opts.filter((o) => !keep.includes(o)).map((o) => o.letter);
        opts = opts.filter((o) => keep.includes(o)); ci = opts.indexOf(keep[0]);
        warn.push(`Game ini memakai maksimal ${maxOpt} pilihan, jadi pilihan ${dropped.join(', ')} (jawaban salah) tidak dipakai.`);
      }
      if (!err) {
        const dup = new Set(); opts.forEach((o) => { const k = norm(o.text); if (dup.has(k)) warn.push(`Ada pilihan yang sama: "${o.text}".`); dup.add(k); });
        if (text.length > 260) warn.push('Pertanyaan cukup panjang; di layar kecil mungkin perlu digulir.');
      }
      return { no, err, warn, q: err ? null : { category: c.cat || category || 'Umum', question: text, options: opts.map((o) => o.text), correct: ci, explanation: c.exp.trim() }, raw: { text, opts: c.opts.map((o) => o.letter + '. ' + o.text) } };
    });
    return { items, ok: items.filter((x) => x.q).map((x) => x.q), bad: items.filter((x) => !x.q), ignored };
  }

  /* --------------------------- Perintah untuk AI --------------------------- */
  function prompt({ topic = '', level = 'SMP kelas 7', count = 10, nOpt = 4, diff = 'campuran (mudah, sedang, sulit)' } = {}) {
    const ls = L.slice(0, nOpt); const kid = /PAUD|TK|SD kelas [123]\b/i.test(level);
    return [
      `Buatkan ${count} soal pilihan ganda tentang "${topic || '(tulis materi di sini)'}" untuk siswa ${level}, tingkat kesulitan ${diff}.`,
      `Setiap soal punya ${nOpt} pilihan jawaban (${ls.join(', ')}) dan hanya SATU jawaban yang benar. Sebarkan posisi jawaban benar secara acak (jangan selalu A).`,
      kid ? 'Gunakan kalimat yang sangat pendek dan mudah dipahami anak; boleh memakai emoji sebagai gambar.' : 'Gunakan bahasa Indonesia yang baku, jelas, dan sesuai kurikulum.',
      'Tulis PERSIS dengan format di bawah ini. Jangan pakai tabel, jangan pakai huruf tebal, jangan tulis kalimat pembuka atau penutup:',
      '',
      '1. (pertanyaan)',
      ...ls.map((l) => `${l}. (pilihan jawaban)`),
      'Jawaban: (huruf jawaban yang benar)',
      'Pembahasan: (penjelasan singkat 1 kalimat)',
      '',
      `2. (pertanyaan berikutnya, dan seterusnya sampai nomor ${count})`,
      '',
      `Tulis lengkap semua ${count} soal sampai selesai, jangan disingkat dan jangan ada soal yang sama.`
    ].join('\n');
  }

  /* --------------------------------- Tampilan --------------------------------- */
  const CSS = `
.ts-ov{position:fixed;inset:0;z-index:3000;background:rgba(8,12,28,.72);display:flex;align-items:center;justify-content:center;padding:12px;font-family:Nunito,'Segoe UI',system-ui,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%}
.ts-box{background:#f8fafc;width:min(1180px,100%);max-height:calc(100vh - 24px);display:flex;flex-direction:column;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden;animation:tsIn .22s ease}
@keyframes tsIn{from{transform:translateY(14px) scale(.97);opacity:0}to{transform:none;opacity:1}}
.ts-head{display:flex;align-items:center;gap:10px;padding:14px 18px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff}
.ts-head h2{margin:0;font-size:1.3rem;font-weight:900;flex:1;line-height:1.2}.ts-head h2 small{display:block;font-size:.8rem;font-weight:600;opacity:.9}
.ts-x{background:rgba(255,255,255,.18);border:0;color:#fff;font-family:inherit;font-weight:800;font-size:1rem;border-radius:12px;padding:9px 14px;cursor:pointer}
.ts-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:14px 18px;overflow:auto;flex:1;min-height:0}
.ts-col{display:flex;flex-direction:column;gap:10px;min-width:0;min-height:0}
.ts-steps{display:flex;gap:8px;flex-wrap:wrap}
.ts-b{border:2px solid #cbd5e1;background:#fff;color:#0f172a;font-family:inherit;font-weight:800;font-size:.95rem;border-radius:12px;padding:10px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;min-height:44px}
.ts-b:hover{border-color:#2563eb}.ts-b.pri{background:linear-gradient(135deg,#16a34a,#059669);color:#fff;border-color:transparent;box-shadow:0 6px 16px rgba(5,150,105,.35)}
.ts-b.ai{background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;border-color:transparent}.ts-b:disabled{opacity:.45;cursor:not-allowed}
.ts-help{background:#e0f2fe;border:1px solid #bae6fd;border-radius:12px;padding:10px 12px;font-size:.88rem;line-height:1.45}
.ts-help pre{margin:6px 0 0;background:#fff;border-radius:8px;padding:8px 10px;font:600 .82rem/1.45 Consolas,monospace;white-space:pre-wrap;color:#334155}
.ts-ta{width:100%;flex:1;min-height:240px;resize:vertical;border:2px solid #cbd5e1;border-radius:14px;padding:12px;font:600 .95rem/1.5 Consolas,'Courier New',monospace;color:#0f172a;background:#fff;box-sizing:border-box}
.ts-ta:focus,.ts-in:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.ts-in{width:100%;box-sizing:border-box;border:2px solid #cbd5e1;border-radius:12px;padding:9px 11px;font-family:inherit;font-weight:700;font-size:.95rem;background:#fff;color:#0f172a;min-height:42px}
.ts-lbl{display:grid;gap:4px;font-weight:800;font-size:.85rem;color:#334155}
.ts-sum{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-weight:900}
.ts-pill{border-radius:99px;padding:6px 12px;font-size:.9rem}.ts-ok{background:#dcfce7;color:#166534}.ts-bad{background:#fee2e2;color:#991b1b}.ts-warn{background:#fef3c7;color:#92400e}.ts-gray{background:#e2e8f0;color:#334155}
.ts-list{overflow:auto;display:grid;gap:8px;align-content:start;min-height:120px;padding-right:2px}
.ts-card{background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:10px 12px;font-size:.9rem}
.ts-card.e{border-color:#fca5a5;background:#fff7f7}.ts-card .n{font-weight:900;color:#2563eb;margin-right:4px}.ts-card.e .n{color:#dc2626}
.ts-card .q{font-weight:800;line-height:1.35}.ts-card .o{margin:6px 0 0;display:grid;gap:3px}
.ts-card .o div{padding:3px 8px;border-radius:8px;background:#f1f5f9}.ts-card .o .k{background:#dcfce7;color:#166534;font-weight:900}
.ts-card .m{margin-top:6px;font-size:.84rem;font-weight:800;color:#b91c1c}.ts-card .w{margin-top:6px;font-size:.82rem;font-weight:700;color:#92400e}.ts-card .x{margin-top:6px;font-size:.8rem;color:#475569}
.ts-empty{text-align:center;color:#64748b;padding:30px 10px;font-weight:700;line-height:1.6}
.ts-foot{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;padding:12px 18px;background:#fff;border-top:1px solid #e2e8f0}
.ts-foot label{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:.9rem;cursor:pointer}
.ts-foot input[type=radio]{width:20px;height:20px;accent-color:#2563eb}.ts-sp{flex:1}
.ts-ai{display:grid;gap:10px;background:#faf5ff;border:2px solid #e9d5ff;border-radius:14px;padding:12px}
.ts-ai h3{margin:0;font-size:1rem;font-weight:900;color:#6b21a8}.ts-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ts-step{display:flex;gap:8px;align-items:flex-start;font-size:.9rem;line-height:1.45}.ts-step b.num{flex:none;width:26px;height:26px;border-radius:50%;background:#7c3aed;color:#fff;display:grid;place-items:center;font-size:.85rem}
.ts-links{display:flex;flex-wrap:wrap;gap:6px}.ts-links a{text-decoration:none}
.ts-prompt{width:100%;box-sizing:border-box;min-height:120px;border:2px dashed #c4b5fd;border-radius:10px;padding:8px;font:600 .78rem/1.45 Consolas,monospace;background:#fff;color:#334155;resize:vertical}
.ts-confirm{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:12px 18px;background:#fef3c7;border-top:2px solid #f59e0b;font-weight:700;font-size:.92rem;line-height:1.5;color:#78350f}
.ts-confirm[hidden]{display:none}.ts-confirm>div:first-child{flex:1;min-width:220px}.ts-cbtns{display:flex;gap:8px}
.ts-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:3100;background:#166534;color:#fff;font:800 1rem Nunito,'Segoe UI',system-ui,sans-serif;padding:12px 20px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.35);transition:opacity .35s,transform .35s;max-width:92vw;text-align:center}
.ts-toast.out{opacity:0;transform:translate(-50%,-10px)}
.ts-ign{font-size:.8rem;color:#64748b}.ts-ign summary{cursor:pointer;font-weight:800}
@media (max-width:820px){.ts-body{display:block}.ts-col{min-height:auto;margin-bottom:14px}.ts-ta{flex:none;height:230px;min-height:160px}.ts-list{overflow:visible;max-height:none}.ts-grid{grid-template-columns:1fr}.ts-head h2{font-size:1.1rem}.ts-foot{gap:8px}.ts-foot .ts-b{flex:1;justify-content:center}}
@media (max-height:560px){.ts-ta{min-height:140px}}
`;
  function injectCss() { if (document.getElementById('ts-css')) return; const st = document.createElement('style'); st.id = 'ts-css'; st.textContent = CSS; document.head.appendChild(st); }

  const EXAMPLE = `1. Planet terbesar di tata surya adalah...
A. Saturnus
B. Jupiter
C. Bumi
D. Mars
Jawaban: B
Pembahasan: Jupiter adalah planet terbesar di tata surya.

2. Hasil dari 7 x 8 adalah...
A. 54
B. 56
C. 64
D. 48
Jawaban: B`;

  const LEVELS = ['PAUD / TK', 'SD kelas 1', 'SD kelas 2', 'SD kelas 3', 'SD kelas 4', 'SD kelas 5', 'SD kelas 6', 'SMP kelas 7', 'SMP kelas 8', 'SMP kelas 9', 'SMA/SMK kelas 10', 'SMA/SMK kelas 11', 'SMA/SMK kelas 12'];

  function toast(msg) {
    injectCss(); const el = document.createElement('div'); el.className = 'ts-toast'; el.textContent = msg; document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2800); setTimeout(() => el.remove(), 3200);
  }
  async function copyText(t, ta) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* cadangan */ }
    try { ta.focus(); ta.select(); return document.execCommand('copy'); } catch (e) { return false; }
  }

  function open({ maxOpt = 4, minOpt = 2, current = 0, title = 'Tempel Soal', ai = false, onSave } = {}) {
    injectCss();
    return new Promise((resolve) => {
      const ov = document.createElement('div'); ov.className = 'ts-ov';
      const optN = Array.from({ length: maxOpt - minOpt + 1 }, (_, i) => minOpt + i);
      ov.innerHTML = `<div class="ts-box" role="dialog" aria-label="${esc(title)}">
        <div class="ts-head"><h2>📋 ${esc(title)}<small>Salin soal dari Word, WhatsApp, atau AI, lalu tempel di kotak ini. Soal terbaca otomatis.</small></h2><button class="ts-x" data-x>✕ Tutup</button></div>
        <div class="ts-body">
          <div class="ts-col">
            <div class="ts-steps">
              <button class="ts-b ai" data-ai>🤖 Buat soal dengan AI</button>
              <button class="ts-b" data-clip>📥 Tempel dari clipboard</button>
              <button class="ts-b" data-ex>📝 Contoh</button>
              <button class="ts-b" data-clear>🗑️ Kosongkan</button>
            </div>
            <div class="ts-ai" data-aibox hidden>
              <h3>🤖 Buat soal dengan AI gratis (ChatGPT / Gemini / Claude)</h3>
              <div class="ts-grid">
                <label class="ts-lbl">Materi / topik<input class="ts-in" data-topic placeholder="Contoh: Fotosintesis"></label>
                <label class="ts-lbl">Kelas / jenjang<select class="ts-in" data-level>${LEVELS.map((l) => `<option${l === 'SMP kelas 7' ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
                <label class="ts-lbl">Jumlah soal<select class="ts-in" data-count>${[5, 10, 15, 20, 25, 30, 40, 50].map((n) => `<option${n === 10 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
                <label class="ts-lbl">Jumlah pilihan jawaban<select class="ts-in" data-nopt>${optN.map((n) => `<option value="${n}"${n === maxOpt ? ' selected' : ''}>${n} pilihan (${L.slice(0, n).join('–').replace(/–.*–/, '–')})</option>`).join('')}</select></label>
                <label class="ts-lbl">Tingkat kesulitan<select class="ts-in" data-diff><option value="campuran (mudah, sedang, sulit)">Campuran</option><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit (HOTS)">Sulit (HOTS)</option></select></label>
              </div>
              <div class="ts-step"><b class="num">1</b><div><button class="ts-b ai" data-copyp>📋 Salin perintah untuk AI</button> <span data-copied></span></div></div>
              <div class="ts-step"><b class="num">2</b><div>Buka salah satu AI gratis, <b>tempel</b> perintahnya, lalu kirim:<div class="ts-links"><a class="ts-b" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT</a><a class="ts-b" href="https://gemini.google.com/" target="_blank" rel="noopener">Gemini</a><a class="ts-b" href="https://claude.ai/" target="_blank" rel="noopener">Claude</a></div></div></div>
              <div class="ts-step"><b class="num">3</b><div><b>Salin semua soal</b> dari jawaban AI, kembali ke sini, lalu klik <b>📥 Tempel dari clipboard</b> (atau tempel di kotak di bawah). Baca ulang soalnya ya — AI kadang keliru.</div></div>
              <div class="ts-help" data-manytip hidden>💡 <b>40–50 soal:</b> AI gratis kadang berhenti di tengah. Kalau soalnya belum sampai nomor terakhir, ketik <b>lanjutkan</b> di AI, lalu tempel bagian berikutnya dengan pilihan <b>"Tambahkan ke soal yang sudah ada"</b>.</div>
              <details><summary class="ts-ign" style="cursor:pointer;font-weight:800">Lihat isi perintah</summary><textarea class="ts-prompt" data-ptext readonly></textarea></details>
            </div>
            <div class="ts-help">Tiap soal: <b>nomor + pertanyaan</b>, lalu <b>pilihan A. B. C. D.</b> masing-masing satu baris, lalu <b>Jawaban: huruf</b>. Pembahasan boleh ditambahkan.<pre>1. Ibu kota Indonesia adalah...
A. Jakarta
B. Bandung
Jawaban: A</pre></div>
            <textarea class="ts-ta" data-ta placeholder="Tempel soal di sini... (Ctrl+V / tekan lama lalu Tempel)"></textarea>
            <label class="ts-lbl">Materi / kategori (opsional, untuk semua soal yang ditempel)<input class="ts-in" data-cat placeholder="Contoh: IPA Bab 2"></label>
          </div>
          <div class="ts-col">
            <div class="ts-sum" data-sum></div>
            <div class="ts-list" data-list></div>
          </div>
        </div>
        <div class="ts-confirm" data-confirm hidden><div data-cmsg></div><div class="ts-cbtns"><button class="ts-b" data-cno>✕ Batal</button><button class="ts-b pri" data-cyes>✅ Ya, simpan</button></div></div>
        <div class="ts-foot">
          <label><input type="radio" name="ts-mode" value="replace" checked> Ganti semua soal lama${current ? ` (${current} soal)` : ''}</label>
          <label><input type="radio" name="ts-mode" value="append"> Tambahkan ke soal yang sudah ada</label>
          <span class="ts-sp"></span>
          <button class="ts-b" data-x>Batal</button>
          <button class="ts-b pri" data-save disabled>💾 Simpan soal</button>
        </div></div>`;
      document.body.appendChild(ov);
      const $ = (s) => ov.querySelector(s);
      const ta = $('[data-ta]'); const cat = $('[data-cat]'); const list = $('[data-list]'); const sum = $('[data-sum]'); const save = $('[data-save]');
      let res = { ok: [], bad: [], items: [], ignored: [] };
      const render = () => {
        res = parse(ta.value, { maxOpt, minOpt, category: cat.value.trim() });
        const nw = res.items.reduce((a, x) => a + (x.q ? x.warn.length : 0), 0);
        if (!ta.value.trim()) {
          sum.innerHTML = '<span class="ts-pill ts-gray">Belum ada soal</span>';
          list.innerHTML = '<div class="ts-empty">👈 Tempel soal di kotak sebelah kiri.<br>Pratinjau soal akan muncul di sini.<br><br>Belum punya soal? Klik <b>🤖 Buat soal dengan AI</b>.</div>';
        } else {
          sum.innerHTML = `<span class="ts-pill ts-ok">✅ ${res.ok.length} soal siap</span>` + (res.bad.length ? `<span class="ts-pill ts-bad">❌ ${res.bad.length} perlu diperbaiki</span>` : '') + (nw ? `<span class="ts-pill ts-warn">⚠️ ${nw} catatan</span>` : '');
          const cards = res.items.filter((x) => !x.q).concat(res.items.filter((x) => x.q)).map((x) => x.q
            ? `<div class="ts-card"><div class="q"><span class="n">${x.no}.</span>${esc(x.q.question)}</div><div class="o">${x.q.options.map((t, k) => `<div class="${k === x.q.correct ? 'k' : ''}">${L[k]}. ${esc(t)}${k === x.q.correct ? ' ✔' : ''}</div>`).join('')}</div>${x.q.explanation ? `<div class="x">💡 ${esc(x.q.explanation)}</div>` : ''}${x.warn.map((w) => `<div class="w">⚠️ ${esc(w)}</div>`).join('')}</div>`
            : `<div class="ts-card e"><div class="q"><span class="n">Soal ${x.no}:</span>${esc(x.raw.text || '(tanpa pertanyaan)')}</div>${x.raw.opts.length ? `<div class="o">${x.raw.opts.map((t) => `<div>${esc(t)}</div>`).join('')}</div>` : ''}<div class="m">❌ ${esc(x.err)}</div></div>`).join('');
          const ign = res.ignored.length ? `<details class="ts-ign"><summary>${res.ignored.length} baris tidak dikenali & diabaikan</summary>${res.ignored.slice(0, 12).map((t) => `<div>• ${esc(t.slice(0, 120))}</div>`).join('')}</details>` : '';
          list.innerHTML = (cards || '<div class="ts-empty">Belum ada soal yang terbaca.<br>Pastikan tiap soal diawali nomor (1. 2. 3.) dan pilihan diawali A. B. C.</div>') + ign;
        }
        save.disabled = !res.ok.length;
        save.textContent = res.ok.length ? `💾 Simpan ${res.ok.length} soal` : '💾 Simpan soal';
      };
      let t = 0; const later = () => { clearTimeout(t); t = setTimeout(render, 220); };
      ta.addEventListener('input', later); cat.addEventListener('input', later);
      const close = (v) => { window.removeEventListener('keydown', onKey, true); ov.remove(); resolve(v); };
      const onKey = (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); close(false); } };
      window.addEventListener('keydown', onKey, true);
      ov.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => close(false)));
      $('[data-ex]').onclick = () => { ta.value = EXAMPLE; render(); };
      $('[data-clear]').onclick = () => { ta.value = ''; render(); ta.focus(); };
      $('[data-clip]').onclick = async () => {
        try { const s = await navigator.clipboard.readText(); if (s && s.trim()) { ta.value = s; render(); return; } } catch (e) { /* izin ditolak */ }
        ta.focus(); ta.placeholder = '👉 Browser tidak mengizinkan membaca clipboard otomatis.\nKlik di sini lalu tekan Ctrl+V (laptop), atau tekan lama → Tempel (HP / layar sentuh).';
        toast('📋 Klik kotak soal, lalu tekan Ctrl+V atau tekan lama → Tempel');
      };
      const aibox = $('[data-aibox]'); const ptext = $('[data-ptext]');
      const buildPrompt = () => ($('[data-manytip]').hidden = +$('[data-count]').value < 40, ptext.value = prompt({ topic: $('[data-topic]').value.trim(), level: $('[data-level]').value, count: +$('[data-count]').value, nOpt: +$('[data-nopt]').value, diff: $('[data-diff]').value }));
      ['[data-topic]', '[data-level]', '[data-count]', '[data-nopt]', '[data-diff]'].forEach((s) => $(s).addEventListener('input', buildPrompt));
      $('[data-ai]').onclick = () => { aibox.hidden = !aibox.hidden; buildPrompt(); if (!aibox.hidden) $('[data-topic]').focus(); };
      $('[data-copyp]').onclick = async () => {
        if (!$('[data-topic]').value.trim()) { $('[data-topic]').focus(); $('[data-copied]').textContent = '✏️ Isi materinya dulu ya.'; return; }
        buildPrompt(); const ok = await copyText(ptext.value, ptext);
        $('[data-copied]').innerHTML = ok ? '<b style="color:#166534">✅ Tersalin! Lanjut ke langkah 2.</b>' : '<b style="color:#b91c1c">Gagal menyalin — buka "Lihat isi perintah", pilih semua teksnya lalu salin.</b>';
      };
      // konfirmasi di dalam panel (tidak memakai confirm() bawaan browser yang bisa diblokir)
      const cbox = $('[data-confirm]');
      const ask = (html) => new Promise((ok) => {
        $('[data-cmsg]').innerHTML = html; cbox.hidden = false; save.disabled = true;
        const done = (v) => { cbox.hidden = true; save.disabled = !res.ok.length; ok(v); };
        $('[data-cyes]').onclick = () => done(true); $('[data-cno]').onclick = () => done(false);
        setTimeout(() => $('[data-cyes]').focus(), 30);
      });
      save.onclick = async () => {
        if (!res.ok.length) return;
        const mode = ov.querySelector('input[name="ts-mode"]:checked').value;
        const notes = [];
        if (res.bad.length) notes.push(`⚠️ <b>${res.bad.length} soal</b> masih bermasalah (kartu merah) dan <b>tidak akan disimpan</b>.`);
        if (mode === 'replace' && current) notes.push(`🔄 Semua <b>${current} soal lama</b> akan <b>diganti</b> dengan <b>${res.ok.length} soal baru</b>.`);
        if (notes.length && !(await ask(notes.join('<br>') + `<br>Simpan ${res.ok.length} soal sekarang?`))) return;
        const r = onSave ? onSave(res.ok, mode) : true;
        if (r !== false) { toast(`✅ ${res.ok.length} soal tersimpan${mode === 'append' ? ' (ditambahkan)' : ''}. Siap dimainkan!`); close({ saved: res.ok.length, mode }); }
      };
      render();
      if (ai) { aibox.hidden = false; buildPrompt(); setTimeout(() => $('[data-topic]').focus(), 60); } else setTimeout(() => ta.focus(), 60);
    });
  }

  window.TempelSoal = { parse, prompt, open, version: 1 };
})();
