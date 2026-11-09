/* Mode Guru sederhana + impor/ekspor Excel */
class GuruMixin {
  bindTeacher() {
    // ---- Mode Guru ----
    $('teacherBtn').onclick = () => { $('pinInput').value = ''; $('pinError').classList.add('hidden'); $('pinModal').classList.remove('hidden'); $('pinInput').focus(); };
    $('pinCancel').onclick = () => $('pinModal').classList.add('hidden');
    $('pinOk').onclick = () => {
      if ($('pinInput').value.trim() === PIN) { $('pinModal').classList.add('hidden'); this.openTeacher(); }
      else $('pinError').classList.remove('hidden');
    };
    $('pinInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('pinOk').click(); });
    $('teacherClose').onclick = () => { $('teacherModal').classList.add('hidden'); this.restart(); };
    $('addBtn').onclick = () => { this.questions.push(mk('', '', '', 'A')); saveQuestions(); this.renderTable(true); };
    $('defBtn').onclick = () => {
      if (confirm('Kembalikan ke soal bawaan? Soal Anda akan terhapus.')) {
        this.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)); saveQuestions(); this.renderTable();
      }
    };
    $('tplBtn').onclick = () => this.downloadExcel('template_soal.xlsx', [
      mk('Contoh: Ibu kota Indonesia adalah...', 'Jakarta', 'Surabaya', 'A'),
      mk('Contoh: 17 Agustus 1945 adalah hari...', 'Sumpah Pemuda', 'Proklamasi Kemerdekaan', 'B', 'Pada tanggal itu Soekarno-Hatta membacakan proklamasi.')
    ]);
    $('expBtn').onclick = () => this.downloadExcel('bank_soal.xlsx', this.questions.filter(isValid));
    $('impBtn').onclick = () => $('impFile').click();
    $('impFile').onchange = (e) => this.importExcel(e);
  }

  openTeacher() { this.loadXLSX(); this.pause(); $('teacherModal').classList.remove('hidden'); this.renderTable(); }

  renderTable(scrollEnd) {
    const body = $('qBody');
    body.innerHTML = '';
    $('countInfo').textContent = `${this.questions.filter(isValid).length} soal siap pakai (${this.questions.length} baris)`;
    this.questions.forEach((q, i) => {
      const tr = document.createElement('tr');
      tr.className = 'trow';
      const num = document.createElement('td'); num.className = 'cn'; num.textContent = i + 1; tr.appendChild(num);
      [['question', 'w-q'], ['optionA', 'w-o'], ['optionB', 'w-o']].forEach(([f, w]) => {
        const td = document.createElement('td'); td.className = 'c1';
        const inp = document.createElement('input');
        inp.value = q[f]; inp.className = `inp ${w}`;
        inp.onchange = () => { q[f] = inp.value.trim(); saveQuestions(); $('countInfo').textContent = `${this.questions.filter(isValid).length} soal siap pakai (${this.questions.length} baris)`; };
        td.appendChild(inp); tr.appendChild(td);
      });
      const tdK = document.createElement('td'); tdK.className = 'c1';
      const sel = document.createElement('select'); sel.className = 'inp bold';
      sel.innerHTML = '<option>A</option><option>B</option>'; sel.value = q.correct;
      sel.onchange = () => { q.correct = sel.value; saveQuestions(); };
      tdK.appendChild(sel); tr.appendChild(tdK);
      const tdE = document.createElement('td'); tdE.className = 'c1';
      const ex = document.createElement('input');
      ex.value = q.explanation || ''; ex.placeholder = 'Kosong = otomatis'; ex.className = 'inp w-e';
      ex.onchange = () => { q.explanation = ex.value.trim(); saveQuestions(); };
      tdE.appendChild(ex); tr.appendChild(tdE);
      const tdD = document.createElement('td'); tdD.className = 'c1';
      const del = document.createElement('button'); del.textContent = '🗑️'; del.className = 'delbtn';
      del.onclick = () => { if (confirm('Hapus soal ini?')) { this.questions.splice(i, 1); saveQuestions(); this.renderTable(); } };
      tdD.appendChild(del); tr.appendChild(tdD);
      body.appendChild(tr);
    });
    if (scrollEnd) body.lastElementChild?.scrollIntoView();
  }

  loadXLSX() {
    if (typeof XLSX !== 'undefined' || this.xl) return; this.xl = true;
    const el = document.createElement('script'); el.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; document.head.appendChild(el);
  }

  // ---------- Excel ----------
  needXLSX() {
    if (typeof XLSX === 'undefined') { alert('Pustaka Excel belum termuat. Sambungkan internet lalu muat ulang halaman.'); return false; }
    return true;
  }

  downloadExcel(filename, list) {
    if (!this.needXLSX()) return;
    const rows = [['No', 'Pertanyaan', 'Pilihan A', 'Pilihan B', 'Kunci (A/B)', 'Penjelasan'],
      ...list.map((q, i) => [i + 1, q.question, q.optionA, q.optionB, q.correct, q.explanation || ''])];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 55 }, { wch: 35 }, { wch: 35 }, { wch: 12 }, { wch: 50 }];
    const guide = XLSX.utils.aoa_to_sheet([
      ['PETUNJUK'], ['1. Isi sheet "Soal", satu soal per baris. Jangan ubah judul kolom.'],
      ['2. Pertanyaan, Pilihan A, Pilihan B, dan Kunci wajib diisi. Kunci: A atau B.'],
      ['3. Penjelasan boleh kosong (dibuat otomatis).'], ['4. Simpan sebagai .xlsx, lalu klik "Impor Excel" di Mode Guru.']
    ]);
    guide['!cols'] = [{ wch: 90 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Soal');
    XLSX.utils.book_append_sheet(wb, guide, 'Petunjuk');
    XLSX.writeFile(wb, filename);
  }

  parseRows(rows) {
    const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cell = (v) => String(v ?? '').trim();
    const alias = {
      question: ['pertanyaan', 'soal'], optionA: ['pilihana', 'opsia', 'jawabana'], optionB: ['pilihanb', 'opsib', 'jawabanb'],
      correct: ['kunci', 'jawabanbenar', 'jawaban', 'benar'], explanation: ['penjelasan', 'keterangan', 'pembahasan']
    };
    let h = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) if ((rows[i] || []).some((c) => alias.question.includes(norm(c)))) { h = i; break; }
    if (h < 0) return { list: [], errors: ['Judul kolom tidak ditemukan. Pakai "Template Excel".'] };
    const heads = rows[h].map(norm), col = {}, used = new Set();
    for (const k of ['question', 'optionA', 'optionB', 'correct', 'explanation']) {
      const idx = heads.findIndex((x, i) => !used.has(i) && x && alias[k].some((a) => x === a || (a.length >= 5 && x.startsWith(a))));
      if (idx >= 0) { col[k] = idx; used.add(idx); }
    }
    const miss = [['question', 'Pertanyaan'], ['optionA', 'Pilihan A'], ['optionB', 'Pilihan B'], ['correct', 'Kunci']].filter(([k]) => col[k] === undefined);
    if (miss.length) return { list: [], errors: ['Kolom wajib tidak ditemukan: ' + miss.map((m) => m[1]).join(', ')] };

    const list = [], errors = [];
    for (let r = h + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const q = cell(row[col.question]), a = cell(row[col.optionA]), b = cell(row[col.optionB]);
      const kRaw = cell(row[col.correct]), ex = col.explanation !== undefined ? cell(row[col.explanation]) : '';
      if (!q && !a && !b && !kRaw && !ex) continue;
      if (!q) { errors.push(`Baris ${r + 1}: pertanyaan kosong.`); continue; }
      if (!a || !b) { errors.push(`Baris ${r + 1}: Pilihan A dan B harus diisi.`); continue; }
      const k = kRaw.toUpperCase().replace(/^(PILIHAN|OPSI)\s*/, '').trim();
      const c = ['A', '1', 'KIRI'].includes(k) ? 'A' : ['B', '2', 'KANAN'].includes(k) ? 'B' : kRaw === a ? 'A' : kRaw === b ? 'B' : null;
      if (!c) { errors.push(`Baris ${r + 1}: kunci "${kRaw}" tidak valid (isi A atau B).`); continue; }
      list.push(mk(q, a, b, c, ex));
    }
    return { list, errors };
  }

  importExcel(e) {
    const input = e.target, file = input.files[0];
    if (!file || !this.needXLSX()) { input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        const name = wb.SheetNames.find((n) => n.toLowerCase() === 'soal') || wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false });
        const { list, errors } = this.parseRows(rows);
        if (!list.length) { alert('Tidak ada soal yang bisa diimpor.\n\n' + errors.slice(0, 8).join('\n')); return; }
        const append = $('impMode').value === 'append';
        if (!append && !confirm(`Ganti semua soal yang ada dengan ${list.length} soal dari file ini?`)) return;
        this.questions = append ? [...this.questions, ...list] : list;
        saveQuestions(); this.renderTable();
        alert(`Berhasil mengimpor ${list.length} soal.` + (errors.length ? `\n\n${errors.length} baris dilewati:\n` + errors.slice(0, 8).join('\n') : ''));
      } catch (err) { alert('Gagal membaca file: ' + err.message); }
      finally { input.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  }
}
for (const k of Object.getOwnPropertyNames(GuruMixin.prototype)) {
  if (k !== 'constructor') Object.defineProperty(Game.prototype, k, Object.getOwnPropertyDescriptor(GuruMixin.prototype, k));
}
