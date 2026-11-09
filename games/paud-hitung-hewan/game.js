/* Hitung Hewan — PAUD: berhitung 1–10 di peternakan, hewan baru datang setiap jawaban benar */
(function () {
  const ANIMALS = ['🐔', '🐄', '🐑', '🐖', '🐐', '🦆', '🐎', '🐇', '🐕', '🐈', '🐤', '🦃', '🐓', '🐏', '🦢'];
  let yard = null;
  KidGame({
    gameId: 'paud-hitung-hewan', level: 'paud', title: 'Hitung Hewan', tag: 'Game PAUD • Berhitung 1–10',
    emoji: '🐔', mascot: '🐮', tagline: 'Ayo berhitung! Setiap jawaban benar, satu hewan datang ke peternakan.',
    defaultTarget: 8, winEmoji: '🐮', winTitle: 'PETERNAKAN RAMAI!', winText: 'Hebat! Semua hewan sudah datang ke peternakan.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        api.el('<div class="sun">🌤️</div>');
        [[10, 0], [24, -20]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        api.el('<div class="hills"></div>');
        api.el('<div class="barn"><div class="roof"></div><div class="wall"><div class="door"></div><div class="win"></div></div></div>');
        api.el('<div class="silo"></div>');
        api.el('<div class="field"></div>');
        api.el('<div class="fence"></div>');
        api.el('<div class="tractor">🚜</div>');
        yard = api.el('<div class="yard"></div>');
        ['🌾', '🌻', '🌾', '🌼', '🌾'].forEach((f, i) => api.el(`<span class="plant" style="left:${4 + i * 23}%;animation-delay:${-i * 0.5}s">${f}</span>`));
      },
      async correct(api, { progress }) {
        const a = ANIMALS[(progress - 1) % ANIMALS.length];
        const n = yard.children.length; const cols = Math.max(5, Math.ceil(api.target / 2));
        const x = 6 + (n % cols) * (88 / cols); const y = n < cols ? 0 : 1;
        const el = api.el(`<div class="pet" style="left:${x}%;bottom:${y ? 0 : 11}vh;z-index:${2 - y}"><span class="a">${a}</span><b>${progress}</b></div>`, yard);
        api.sfx.pop();
        await api.anim(el, [{ transform: 'translateX(60vw) scaleX(-1)', opacity: 0 }, { transform: 'translateX(20vw) scaleX(-1) translateY(-3vh)', opacity: 1, offset: 0.5 }, { transform: 'translateX(0) scaleX(-1)' }], { duration: 1100, easing: 'ease-out' });
        el.classList.add('home');
      },
      wrong(api) { api.anim(api.scene.querySelector('.barn'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'rotate(1.5deg)' }, { transform: 'rotate(0)' }], { duration: 400 }); },
      async win(api) {
        yard.querySelectorAll('.pet').forEach((p, i) => api.anim(p, [{ transform: 'translateY(0)' }, { transform: 'translateY(-5vh)' }, { transform: 'translateY(0)' }], { duration: 500, delay: i * 80, iterations: 2 }));
        await api.sleep(1300);
      }
    }
  });
})();
