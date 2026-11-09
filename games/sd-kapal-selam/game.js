/* Kapal Selam IPA — SD: setiap jawaban benar, kapal selam menyelam lebih dalam menuju harta di dasar laut */
(function () {
  const LIFE = ['🐠', '🐡', '🐙', '🦑', '🐢', '🐬', '🦈', '🐋', '🦀', '🦞', '🐟', '🐳', '🦐', '🐚', '🐊'];
  let world = null; let dark = null; let meter = null; let sub = null; const STEP = 30;
  KidGame({
    gameId: 'sd-kapal-selam', level: 'sd', title: 'Kapal Selam IPA', tag: 'Game SD • Ilmu Pengetahuan Alam',
    emoji: '🌊', mascot: '🐋', tagline: 'Jawab soal IPA agar kapal selam bisa menyelam ke dasar laut dan menemukan harta!',
    defaultTarget: 8, winEmoji: '💎', winTitle: 'HARTA DITEMUKAN!', winText: 'Hebat! Kapal selam sampai di dasar laut.',
    hooks: {
      build(api) {
        api.el('<div class="ocean"></div>');
        world = api.el(`<div class="world" style="height:${(api.target + 2) * STEP}vh"></div>`);
        api.el('<div class="surface"><i></i></div>', world);
        for (let i = 1; i <= api.target + 1; i++) {
          const y = i * STEP; const a = LIFE[(i - 1) % LIFE.length]; const b = LIFE[(i + 6) % LIFE.length];
          api.el(`<span class="life" style="top:${y - 6}vh;left:${8 + (i * 23) % 30}%;animation-delay:${-i}s">${a}</span>`, world);
          api.el(`<span class="life r" style="top:${y + 4}vh;left:${62 + (i * 17) % 28}%;animation-delay:${-i * 1.6}s">${b}</span>`, world);
          api.el(`<span class="depth-mark" style="top:${y}vh">${i * 10} m</span>`, world);
          if (i % 2) api.el(`<span class="weed" style="top:${y + 8}vh;left:${i % 4 ? 4 : 90}%">🌿</span>`, world);
        }
        api.el(`<div class="seabed" style="top:${(api.target + 1) * STEP + 6}vh"><span class="chest">🧰</span><span class="gem">💎</span></div>`, world);
        dark = api.el('<div class="dark"></div>');
        for (let i = 0; i < 10; i++) api.el(`<span class="bubble" style="left:${api.rand(3, 95)}%;animation-duration:${5 + (i % 4)}s;animation-delay:${-i * 0.8}s"></span>`);
        sub = api.el(`<div class="sub"><div class="tower"><i class="peri"></i></div><div class="hull"><b></b><b></b><b></b></div><div class="prop"></div><span class="trail"></span></div>`);
        meter = api.el('<div class="meter">Kedalaman: <b>0 m</b></div>');
        world.style.transform = 'translateY(0)';
      },
      async correct(api, { progress }) {
        api.sfx.whoosh();
        world.style.transform = `translateY(-${progress * STEP}vh)`;
        dark.style.opacity = Math.min(0.55, progress / api.target * 0.55);
        meter.querySelector('b').textContent = `${progress * 10} m`;
        await api.anim(sub, [{ transform: 'translate(0, 0) rotate(0)' }, { transform: 'translate(0, 2vh) rotate(8deg)' }, { transform: 'translate(0, 0) rotate(0)' }], { duration: 1100, easing: 'ease-in-out' });
      },
      wrong(api) { api.anim(sub, [{ transform: 'translateX(0)' }, { transform: 'translateX(-1vw)' }, { transform: 'translateX(1vw)' }, { transform: 'translateX(0)' }], { duration: 400 }); },
      async win(api) {
        const gem = world.querySelector('.gem');
        world.style.transform = `translateY(-${(api.target + 1) * STEP - 10}vh)`;
        await api.sleep(1200);
        gem.classList.add('shine'); api.sfx.coin();
        await api.sleep(800);
      }
    }
  });
})();
