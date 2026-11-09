/* Hitung Hewan — PAUD
   MEKANIK: KETUK SETIAP HEWAN untuk menghitung (angka muncul & dibacakan),
   lalu pilih PAPAN ANGKA yang benar di pagar. */
(function () {
  const WORDS = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'dua belas'];
  const SKIP = new Set(['➕', '➖', '❓', '❗', '✖️', '✖']);
  let animals = []; let signs = []; let counted = 0; let barn = null; let total = 0;
  const emojisIn = (s) => (String(s).match(/\p{Extended_Pictographic}️?/gu) || []).filter((e) => !SKIP.has(e)).slice(0, 12);

  KidGame({
    gameId: 'paud-hitung-hewan', level: 'paud', answerMode: 'custom', title: 'Hitung Hewan', tag: 'Game PAUD • Berhitung 1–10',
    emoji: '🐔', mascot: '🐮', tagline: 'Ketuk hewan satu per satu untuk menghitung, lalu pilih papan angka yang benar!',
    howTo: [['👆', 'Ketuk hewan untuk menghitung'], ['🔢', 'Dengarkan angkanya'], ['🪧', 'Pilih papan yang benar']],
    defaultTarget: 8, winEmoji: '🐮', winTitle: 'PETERNAKAN RAMAI!', winText: 'Hebat! Kamu sudah pintar berhitung.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        api.el('<div class="sun">🌤️</div>');
        [[24, 0], [34, -20]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        api.el('<div class="hills"></div>');
        barn = api.el('<div class="barn"><div class="roof"></div><div class="wall"><div class="door"></div><div class="win"></div></div><b class="tally">0</b></div>');
        api.el('<div class="silo"></div>');
        api.el('<div class="field"></div>');
        api.el('<div class="fence"></div>');
        api.el('<div class="tractor">🚜</div>');
        ['🌾', '🌻', '🌾', '🌼'].forEach((f, i) => api.el(`<span class="plant" style="left:${3 + i * 22}%;animation-delay:${-i * 0.5}s">${f}</span>`));
      },
      present(api, q, order) {
        counted = 0; const list = emojisIn(q.question); total = list.length;
        animals = list.map((e, i) => {
          const cols = Math.min(6, list.length); const row = Math.floor(i / cols); const col = i % cols;
          const x = 10 + (col + (row % 2) * 0.5) * (58 / cols); const y = 55 + row * 15;
          const a = api.el(`<button class="pet" style="left:${x}%;top:${y}%;animation-delay:${-i * 0.3}s"><span class="a">${e}</span><b></b></button>`);
          api.anim(a, [{ transform: 'translate(40vw, 0) scale(.6)', opacity: 0 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 650, delay: i * 90, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'backwards' });
          a.onclick = () => {
            if (a.classList.contains('done') || api.busy) return;
            counted++; a.classList.add('done'); a.querySelector('b').textContent = counted; api.sfx.pop();
            api.speak(WORDS[counted] || String(counted));
            api.anim(a, [{ transform: 'translateY(0)' }, { transform: 'translateY(-4vh) scale(1.15)' }, { transform: 'translateY(0)' }], { duration: 420 });
            if (counted === total) api.hint('👏 Sudah dihitung semua! Sekarang pilih papan jawabannya.');
          };
          return a;
        });
        signs = order.map((k, i) => {
          const txt = q['option' + k];
          const s = api.el(`<div class="sign" style="left:${18 + i * (64 / Math.max(1, order.length - 1 || 1))}%;--d:${i * 100}ms"><button class="kg-token ${api.isEmojiOnly(txt) ? 'emo small' : ''}" style="--c1:#92400e;--c2:#5b3a1a"></button><i></i></div>`);
          if (order.length === 1) s.style.left = '50%';
          const b = s.querySelector('button'); b.textContent = txt; b.onclick = () => api.answer(k, b);
          return s;
        });
        if (order.length === 2) { signs[0].style.left = '34%'; signs[1].style.left = '66%'; }
        if (order.length === 3) signs.forEach((s, i) => (s.style.left = `${24 + i * 26}%`));
        api.hint(total ? '👆 Ketuk hewannya satu per satu untuk menghitung' : '👆 Pilih papan jawaban yang benar');
      },
      async correct(api, { progress }) {
        const door = api.pos(barn);
        await Promise.all(animals.map((a, i) => { const p = api.pos(a); return api.anim(a, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${door.x - p.x}px, ${door.y - p.y + 40}px) scale(.3)`, opacity: 0.2 }], { duration: 800, delay: i * 70, easing: 'ease-in', fill: 'forwards' }); }));
        barn.querySelector('.tally').textContent = progress; api.sfx.coin();
        api.anim(barn, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 400 });
      },
      wrong(api) { api.anim(barn, [{ transform: 'rotate(0)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'rotate(1.5deg)' }, { transform: 'rotate(0)' }], { duration: 400 }); },
      reveal(api, k) { signs.forEach((s) => { const b = s.querySelector('button'); if (b.textContent === api.opt(k)) b.classList.add('show'); }); },
      clear() { animals.forEach((a) => a.remove()); signs.forEach((s) => s.remove()); animals = []; signs = []; },
      async win(api) {
        for (let i = 0; i < 10; i++) { const a = api.el(`<span class="parade" style="animation-delay:${i * 0.25}s">${['🐔', '🐄', '🐑', '🐷', '🐐', '🦆', '🐎', '🐇', '🐕', '🐈'][i]}</span>`); setTimeout(() => a.remove(), 5200); }
        await api.sleep(1600);
      }
    }
  });
})();
