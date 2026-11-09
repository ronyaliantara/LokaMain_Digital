/* Akuarium Hewan — PAUD: mengenal hewan; setiap jawaban benar, hewan laut baru masuk akuarium */
(function () {
  const SEA = ['🐠', '🐟', '🐡', '🐙', '🦀', '🐢', '🐬', '🐳', '🦑', '🦞', '🐋', '🦈', '🐚', '🦐', '🐸'];
  let tank = null;
  function swimmer(api, emoji, i, enter) {
    const top = 14 + ((i * 37) % 40); const dur = 12 + ((i * 7) % 8); const dir = i % 2 ? 'reverse' : 'normal';
    // mulai di tengah perjalanan agar hewan baru langsung terlihat di layar
    const delay = -(dur * (0.15 + ((i * 0.29) % 0.3)));
    const s = api.el(`<div class="swim" style="top:${top}%;animation-duration:${dur}s;animation-direction:${dir};animation-delay:${delay.toFixed(2)}s"><span style="animation-delay:${-i * 0.4}s">${emoji}</span></div>`, tank);
    void enter;
    return s;
  }
  KidGame({
    gameId: 'paud-akuarium', level: 'paud', title: 'Akuarium Hewan', tag: 'Game PAUD • Mengenal hewan',
    emoji: '🐠', mascot: '🐙', tagline: 'Kenali hewan-hewan lucu! Setiap jawaban benar, teman baru masuk akuarium.',
    defaultTarget: 8, winEmoji: '🐳', winTitle: 'AKUARIUM PENUH!', winText: 'Hebat! Kamu sudah kenal banyak hewan.',
    hooks: {
      build(api) {
        api.el('<div class="water"></div>');
        api.el('<div class="rays"></div>');
        api.el('<div class="sand"></div>');
        ['🌿', '🌱', '🌿', '🌾', '🌿', '🌱'].forEach((w, i) => api.el(`<span class="weed" style="left:${3 + i * 17}%;animation-delay:${-i * 0.7}s">${w}</span>`));
        api.el('<span class="shell">🐚</span>');
        for (let i = 0; i < 14; i++) api.el(`<span class="bubble" style="left:${api.rand(2, 96)}%;animation-duration:${6 + (i % 5) * 1.4}s;animation-delay:${-i * 0.9}s;width:${1 + (i % 3)}vh;height:${1 + (i % 3)}vh"></span>`);
        tank = api.el('<div class="tank"></div>');
        ['🐠', '🐟', '🐡'].forEach((f, i) => swimmer(api, f, i + 20, false));
      },
      async correct(api, { progress }) {
        const e = SEA[(progress - 1) % SEA.length];
        const s = swimmer(api, e, progress, true);
        api.sfx.pop();
        await api.anim(s, [{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 600 });
        api.fx.burstAt(s.firstElementChild, { emojis: ['🫧', '✨'], count: 10, spread: 110 });
        await api.sleep(400);
      },
      wrong(api) { api.scene.querySelectorAll('.swim span').forEach((s) => api.anim(s, [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }, { transform: 'scale(1)' }], { duration: 400 })); },
      async win(api) {
        for (let i = 0; i < 20; i++) api.el(`<span class="bubble big" style="left:${api.rand(5, 95)}%;animation-delay:${i * 0.07}s"></span>`);
        await api.sleep(1400);
      }
    }
  });
})();
