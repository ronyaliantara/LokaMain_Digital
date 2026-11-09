(() => {
  const { loadStore, normalizePhone, buildBuyerWhatsAppUrl } = window.LokaStore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const safe = (s) => {
    const v = String(s || '').trim();
    return /^(javascript|vbscript):/i.test(v) || (/^data:/i.test(v) && !/^data:(image|video)\//i.test(v)) ? '' : v;
  };
  const isVideo = (s) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(s || '') || String(s || '').startsWith('data:video/');

  const BANKS = {
    'LM-UT': [
      { q: 'Apakah arti dari kalimat "اَلسَّاعَةُ الْوَاحِدَةُ" (As-Saa\'atul Waahidah)?', opts: ['Jam 01.00 tepat', 'Jam 02.00 tepat', 'Jam 03.00 tepat'], ans: 0 },
      { q: 'Bagaimana menyebut "Jam 06.30 (setengah tujuh)" dalam Bahasa Arab?', opts: ['اَلسَّاعَةُ السَّادِسَةُ وَالنِّصْفُ', 'اَلسَّاعَةُ السَّابِعَةُ وَالرُّبْعُ', 'اَلسَّاعَةُ الْخَامِسَةُ وَالثُّلُثُ'], ans: 0 },
      { q: 'Kata "وَالرُّبْعُ" (war-rub\'u) dalam penyebutan waktu bahasa Arab menunjukkan lebih berapa menit?', opts: ['Lebih 15 menit (seperempat jam)', 'Lebih 30 menit (setengah jam)', 'Lebih 20 menit (sepertiga jam)'], ans: 0 }
    ],
    'LM-EK': [
      { q: 'Benua terbesar di dunia adalah...', opts: ['Asia', 'Afrika', 'Eropa'], ans: 0 },
      { q: 'Samudra terluas di permukaan bumi adalah...', opts: ['Samudra Pasifik', 'Samudra Atlantik', 'Samudra Hindia'], ans: 0 },
      { q: 'Selat yang memisahkan Pulau Jawa dan Pulau Sumatra adalah...', opts: ['Selat Sunda', 'Selat Malaka', 'Selat Bali'], ans: 0 }
    ]
  };

  const store = loadStore();
  const settings = store.settings;
  const id = new URLSearchParams(location.search).get('id');
  const game = store.games.find((g) => g.id === id) || (id ? null : store.games[0]);

  // Footer & WA umum
  const phone = normalizePhone(settings.whatsappNumber);
  const hello = `Halo ${settings.sellerName || 'Admin'}, saya ingin bertanya tentang game edukasi di ${settings.storeName || 'LokaMain Digital'}.`;
  const askUrl = (phone ? `https://wa.me/${phone}` : 'https://wa.me/') + '?text=' + encodeURIComponent(hello);
  $('footer-wa').href = askUrl;
  if (phone) $('footer-wa-info').textContent = `Pesan & bantuan via WhatsApp: +${phone}`;
  const logo = safe(settings.logoImage);
  if (logo) $('site-logo-img').src = logo;

  if (!game) {
    $('play-root').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Game tidak ditemukan</h3><p>Game ini mungkin sudah tidak tersedia.</p><a class="btn btn-primary" href="index.html#katalog">Lihat semua game</a></div>`;
    document.title = 'Game tidak ditemukan – LokaMain Digital';
    return;
  }

  document.title = `${game.title} – LokaMain Digital`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && game.shortDesc) metaDesc.content = game.shortDesc.slice(0, 160);
  $('crumb-title').textContent = game.title;
  $('play-title').textContent = game.title;
  $('play-desc').textContent = game.shortDesc || '';

  const LV = { PAUD: 'PAUD / TK', SD: 'SD', SMP: 'SMP', SMA: 'SMA / SMK' };
  const lv = Array.isArray(game.levels) ? game.levels.filter((k) => LV[k]).map((k) => LV[k]).join(' • ') : '';
  const tags = [lv && `Jenjang: ${lv}`, game.category, game.grade, game.duration, game.device].filter(Boolean);
  $('play-tags').innerHTML = tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');

  const media = safe(game.image), cover = safe(game.coverImage);
  const box = $('play-media');
  if (cover) {
    // halaman detail: GAMBAR sampul resolusi tinggi (<nama>-hd.jpg, 1600px) — layar kecil otomatis pakai versi 960px.
    // Jika versi HD belum ada (mis. game baru dari admin), pakai gambar sampul biasa.
    const hd = /^assets\/games\/[^/?#]+\.jpe?g(\?.*)?$/i.test(cover) && !/-hd\.jpe?g/i.test(cover) ? cover.replace(/\.(jpe?g)(\?.*)?$/i, '-hd.$1$2') : '';
    box.innerHTML = `<img src="${esc(hd || cover)}"${hd ? ` srcset="${esc(cover)} 960w, ${esc(hd)} 1600w" sizes="(max-width: 980px) 100vw, 640px"` : ''} width="1600" height="1000" alt="${esc(game.title)}" fetchpriority="high" decoding="async">`;
    if (hd) { const im = box.querySelector('img'); im.addEventListener('error', () => { im.removeAttribute('srcset'); im.src = cover; }, { once: true }); }
  } else if (isVideo(media)) {
    box.innerHTML = `<video src="${esc(media)}" autoplay loop muted playsinline controls></video>`;
  } else if (media) {
    box.innerHTML = `<img src="${esc(cover || media)}" width="800" height="500" alt="${esc(game.title)}">`;
  } else {
    box.hidden = true;
  }

  $('play-ask-wa').href = buildBuyerWhatsAppUrl(game, settings);
  $('play-order').addEventListener('click', () => {
    location.href = `index.html?pesan=${encodeURIComponent(game.id)}#katalog`;
  });
  const direct = $('play-launch-direct');
  const gu = safe(game.gameUrl);
  if (gu && !gu.startsWith('play.html')) { direct.href = gu; direct.hidden = false; }

  // Kuis
  const questions = BANKS[game.id] || [{
    q: game.sampleQuestion || `Pertanyaan contoh untuk ${game.title}`,
    opts: game.sampleOptions || ['Pilihan A', 'Pilihan B', 'Pilihan C'],
    ans: Number(game.sampleAnswer || 0)
  }];
  let qi = 0, score = 0, answered = false;

  function render() {
    answered = false;
    const item = questions[qi];
    $('quiz-progress').textContent = `Soal ${qi + 1} dari ${questions.length}`;
    $('quiz-score').textContent = `Skor: ${score}`;
    $('quiz-question').textContent = item.q;
    $('quiz-feedback').textContent = 'Pilih salah satu jawaban.';
    const next = $('quiz-next-btn');
    next.disabled = true;
    next.textContent = qi < questions.length - 1 ? 'Berikutnya' : 'Lihat hasil';
    const wrap = $('quiz-options');
    wrap.innerHTML = item.opts.map((o, i) => `<button type="button" class="quiz-opt-btn" data-opt="${i}">${esc(o)}</button>`).join('');
    wrap.querySelectorAll('[data-opt]').forEach((btn) => btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const picked = Number(btn.dataset.opt);
      wrap.querySelectorAll('[data-opt]').forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.opt) === item.ans) b.classList.add('is-correct');
      });
      if (picked === item.ans) {
        score += 100;
        $('quiz-score').textContent = `Skor: ${score}`;
        $('quiz-feedback').textContent = 'Tepat sekali! +100 poin.';
      } else {
        btn.classList.add('is-wrong');
        $('quiz-feedback').textContent = 'Belum tepat. Jawaban benar ditandai hijau.';
      }
      next.disabled = false;
    }));
  }

  function done() {
    const max = questions.length * 100;
    const pct = Math.round((score / max) * 100);
    const msg = pct >= 80 ? 'Luar biasa!' : pct >= 50 ? 'Bagus, sedikit lagi sempurna!' : 'Terus semangat belajar!';
    $('quiz-panel').innerHTML = `
      <div class="quiz-done">
        <h3>Kuis selesai</h3>
        <p class="quiz-done-score">${score} / ${max} poin</p>
        <p>${msg} Benar ${score / 100} dari ${questions.length} soal.</p>
        <div class="quiz-done-actions">
          <button type="button" class="btn btn-ghost-detail" id="quiz-retry">Ulangi kuis</button>
          <button type="button" class="btn btn-primary" id="quiz-order">Pesan game ini</button>
        </div>
      </div>`;
    $('quiz-retry').onclick = () => location.reload();
    $('quiz-order').onclick = () => $('play-order').click();
  }

  $('quiz-next-btn').addEventListener('click', () => {
    if (!answered) return;
    if (qi >= questions.length - 1) done(); else { qi++; render(); }
  });
  render();
})();
