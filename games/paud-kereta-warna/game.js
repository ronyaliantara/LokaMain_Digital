/* Kereta Warna — PAUD
   MEKANIK: MEWARNAI. Jawaban ada di KALENG CAT. Ketuk kaleng yang benar,
   kuas terbang dan mewarnai satu gerbong kereta. Semua gerbong berwarna = kereta berangkat! */
(function () {
  const PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
  const EMO_COL = { '🔴': '#ef4444', '🟠': '#f97316', '🟡': '#facc15', '🟢': '#22c55e', '🔵': '#3b82f6', '🟣': '#a855f7', '🟤': '#92400e', '⚫': '#1f2937', '⚪': '#f1f5f9', '🟥': '#ef4444', '🟦': '#3b82f6', '🟩': '#22c55e', '🟨': '#facc15', '🟧': '#f97316', '🟪': '#a855f7', '🔺': '#ef4444', '🔷': '#3b82f6', '🔶': '#f97316', '❤️': '#ef4444', '⭐': '#facc15' };
  const WORD_COL = { merah: '#ef4444', biru: '#3b82f6', hijau: '#22c55e', kuning: '#facc15', ungu: '#a855f7', oranye: '#f97316', jingga: '#f97316', hitam: '#1f2937', putih: '#f1f5f9', cokelat: '#92400e', coklat: '#92400e', 'merah muda': '#f472b6' };
  const RIDERS = ['🐻', '🐰', '🐼', '🐯', '🐸', '🐵', '🐨', '🦊', '🐷', '🐶', '🐱', '🦁', '🐮', '🐹', '🐔'];
  let wagons = []; let pots = []; let train = null; let painted = 0;
  const colorOf = (txt, i) => EMO_COL[String(txt).trim()] || WORD_COL[String(txt).trim().toLowerCase()] || PALETTE[i % PALETTE.length];

  KidGame({
    gameId: 'paud-kereta-warna', level: 'paud', answerMode: 'custom', title: 'Kereta Warna', tag: 'Game PAUD • Mengenal warna & bentuk',
    emoji: '🚂', mascot: '🎨', tagline: 'Ayo mewarnai kereta! Pilih kaleng cat yang benar untuk mewarnai gerbong.',
    howTo: [['👂', 'Dengarkan soal'], ['🪣', 'Ketuk kaleng cat yang benar'], ['🖌️', 'Gerbong jadi berwarna']],
    defaultTarget: 8, winEmoji: '🚂', winTitle: 'KERETA BERANGKAT!', winText: 'Hebat! Semua gerbong sudah berwarna.',
    hooks: {
      build(api) {
        painted = 0;
        api.el('<div class="sky"></div>');
        api.el('<div class="sun">🌞</div>');
        [[24, 0], [34, -24]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        api.el('<div class="mount m1"></div>'); api.el('<div class="mount m2"></div>');
        api.el('<div class="meadow"></div>');
        api.el('<div class="rail"></div>');
        const n = api.target; const w = Math.min(14, 76 / n);
        train = api.el(`<div class="train" style="--w:${w}vw"><div class="loco"><span class="smoke s1">💨</span><span class="smoke s2">💨</span><span class="body">🚂</span></div></div>`);
        wagons = Array.from({ length: n }, (_, i) => api.el(`<div class="wagon"><span class="rider">${RIDERS[i % RIDERS.length]}</span><div class="box"><b>${i + 1}</b></div><i></i><i></i></div>`, train));
      },
      present(api, q, order) {
        pots = order.map((k, i) => {
          const txt = q['option' + k]; const col = colorOf(txt, i + painted);
          const p = api.el(`<div class="pot" style="--pc:${col};--d:${i * 110}ms;left:${50 + (i - (order.length - 1) / 2) * 22}%"><button class="can"><span class="paint"></span><span class="lbl ${api.isEmojiOnly(txt) ? 'emo' : ''}"></span></button></div>`);
          p.querySelector('.lbl').textContent = txt; p.dataset.k = k; p.dataset.c = col;
          p.querySelector('.can').onclick = async () => {
            if (api.busy) return;
            const r = await api.answer(k, p.querySelector('.can'));
            if (r && r.correct === false) {
              const sp = api.el(`<span class="splat" style="left:${p.style.left};--pc:${col}"></span>`); setTimeout(() => sp.remove(), 1600);
              api.anim(p, [{ rotate: '0deg' }, { rotate: '-14deg' }, { rotate: '10deg' }, { rotate: '0deg' }], { duration: 500 });
            }
          };
          return p;
        });
        api.hint('👆 Ketuk kaleng cat yang benar untuk mewarnai gerbong');
      },
      async correct(api, { el }) {
        const p = el.closest('.pot'); const col = p.dataset.c; const w = wagons[painted]; if (!w) return;
        const a = api.pos(el); const b = api.pos(w);
        const brush = api.el('<span class="brush">🖌️</span>');
        await api.anim(brush, [{ transform: `translate(${a.x}px, ${a.y}px) rotate(0)` }, { transform: `translate(${(a.x + b.x) / 2}px, ${Math.min(a.y, b.y) - 120}px) rotate(-40deg)`, offset: 0.5 }, { transform: `translate(${b.x}px, ${b.y}px) rotate(20deg)` }], { duration: 700, easing: 'ease-in-out', fill: 'forwards' });
        await api.anim(brush, [{ transform: `translate(${b.x - 40}px, ${b.y}px) rotate(20deg)` }, { transform: `translate(${b.x + 40}px, ${b.y}px) rotate(-10deg)` }, { transform: `translate(${b.x - 20}px, ${b.y}px) rotate(20deg)` }], { duration: 450, fill: 'forwards' });
        brush.remove();
        w.style.setProperty('--wc', col); w.classList.add('painted'); painted++; api.sfx.pop();
        for (let i = 0; i < 8; i++) { const d = api.el(`<span class="drop" style="left:${b.x}px;top:${b.y}px;--pc:${col};--dx:${api.rand(-60, 60)}px;--dy:${api.rand(-70, -20)}px"></span>`); setTimeout(() => d.remove(), 800); }
        await api.anim(train, [{ transform: 'translateX(0)' }, { transform: 'translateX(1vw)' }, { transform: 'translateX(0)' }], { duration: 400 });
      },
      reveal(api, k) { pots.forEach((p) => p.dataset.k === k && p.classList.add('show')); },
      clear() { pots.forEach((p) => p.remove()); pots = []; },
      async win(api) {
        api.speak('Tut tut tut! Kereta berangkat!');
        await api.anim(train, [{ transform: 'translateX(0)' }, { transform: 'translateX(-160vw)' }], { duration: 3200, easing: 'ease-in', fill: 'forwards' });
      }
    }
  });
})();
