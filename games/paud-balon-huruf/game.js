/* Balon Huruf — PAUD: mengenal huruf; balon jawaban terbang & meletus, huruf terkumpul di langit */
(function () {
  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
  const LETTERS = 'ABCDEGHIKLMNOPRSTU';
  let shelf = null;
  KidGame({
    gameId: 'paud-balon-huruf', level: 'paud', title: 'Balon Huruf', tag: 'Game PAUD • Mengenal huruf',
    emoji: '🎈', mascot: '🎈', tagline: 'Pilih balon huruf yang benar, lalu lihat balonnya terbang tinggi!',
    defaultTarget: 8, winEmoji: '🎉', winTitle: 'BALON TERBANG SEMUA!', winText: 'Hebat! Kamu sudah pintar mengenal huruf.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        [[14, 0], [34, -18], [22, -34]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        for (let i = 0; i < 9; i++) {
          const c = COLORS[i % COLORS.length]; const L = LETTERS[(i * 5) % LETTERS.length];
          api.el(`<div class="deco-balloon" style="left:${4 + i * 10.8}%;--c:${c};animation-duration:${11 + (i % 4) * 2.5}s;animation-delay:${-i * 2.1}s"><span>${L}</span></div>`);
        }
        api.el('<div class="city"></div>');
        api.el('<div class="kid">🧒</div>');
        shelf = api.el('<div class="shelf"></div>');
      },
      async correct(api, { el, progress }) {
        const txt = (el.textContent || '').trim();
        const label = txt.length <= 3 ? txt : txt.charAt(0);
        const c = COLORS[progress % COLORS.length];
        const b = api.el(`<div class="win-balloon" style="--c:${c}"><span></span></div>`);
        b.querySelector('span').textContent = label;
        await api.anim(b, [{ transform: 'translate(-50%, 0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -32vh) scale(1) rotate(-6deg)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%, -44vh) scale(1.05) rotate(4deg)', opacity: 1 }], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
        api.fx.burstAt(b, { emojis: ['🎊', '✨', '⭐'], count: 14, spread: 160 });
        api.sfx.pop(); b.remove();
        const chip = api.el(`<span class="chip" style="--c:${c}"></span>`, shelf); chip.textContent = label;
      },
      wrong(api) { const k = api.scene.querySelector('.kid'); api.anim(k, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(0)' }], { duration: 500 }); },
      async win(api) {
        for (let i = 0; i < 12; i++) api.el(`<div class="deco-balloon fast" style="left:${api.rand(2, 92)}%;--c:${api.pick(COLORS)};animation-delay:${i * 0.12}s"><span>★</span></div>`);
        await api.sleep(1200);
      }
    }
  });
})();
