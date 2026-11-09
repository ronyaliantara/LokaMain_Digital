/* Kereta Warna & Bentuk — PAUD: setiap jawaban benar menambah gerbong berisi penumpang hewan */
(function () {
  const WAG = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
  const RIDERS = ['🐻', '🐰', '🐼', '🐯', '🐸', '🐵', '🐨', '🦊', '🐷', '🐶', '🐱', '🦁', '🐮', '🐹', '🐔'];
  let train = null;
  KidGame({
    gameId: 'paud-kereta-warna', level: 'paud', title: 'Kereta Warna', tag: 'Game PAUD • Mengenal warna & bentuk',
    emoji: '🚂', mascot: '🚂', tagline: 'Jawab dengan benar untuk menambah gerbong kereta. Tut tut tut!',
    defaultTarget: 8, winEmoji: '🚂', winTitle: 'KERETA BERANGKAT!', winText: 'Hebat! Semua penumpang sudah naik kereta.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        api.el('<div class="sun">🌞</div>');
        [[10, 0], [26, -24]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        api.el('<div class="mount m1"></div>'); api.el('<div class="mount m2"></div>');
        api.el('<div class="meadow"></div>');
        ['🌳', '🌲', '🌳', '🌲', '🌳'].forEach((t, i) => api.el(`<span class="tree" style="left:${6 + i * 22}%">${t}</span>`));
        api.el('<div class="rail"></div>');
        const w = Math.min(15, 70 / api.target);
        train = api.el(`<div class="train" style="--w:${w}vw"><div class="loco"><span class="smoke s1">💨</span><span class="smoke s2">💨</span><span class="body">🚂</span></div></div>`);
      },
      async correct(api, { progress }) {
        const c = WAG[(progress - 1) % WAG.length]; const r = RIDERS[(progress - 1) % RIDERS.length];
        const wag = api.el(`<div class="wagon" style="--c:${c}"><span class="rider">${r}</span><div class="box"></div><i></i><i></i></div>`, train);
        api.sfx.pop();
        await api.anim(wag, [{ transform: 'translateY(-30vh) scale(.6)', opacity: 0 }, { transform: 'translateY(2vh) scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'translateY(0) scale(1)' }], { duration: 750, easing: 'ease-out' });
        await api.anim(train, [{ transform: 'translateX(0)' }, { transform: 'translateX(1.5vw)' }, { transform: 'translateX(0)' }], { duration: 500 });
      },
      wrong(api) { api.anim(train, [{ transform: 'translateX(0)' }, { transform: 'translateX(-1vw)' }, { transform: 'translateX(1vw)' }, { transform: 'translateX(0)' }], { duration: 400 }); },
      async win(api) {
        api.speak('Tut tut tut! Kereta berangkat!');
        await api.anim(train, [{ transform: 'translateX(0)' }, { transform: 'translateX(-160vw)' }], { duration: 3200, easing: 'ease-in', fill: 'forwards' });
      }
    }
  });
})();
