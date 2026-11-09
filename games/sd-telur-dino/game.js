/* Telur Dino — SD Pancasila/PPKn: setiap jawaban benar meretakkan telur; telur menetas jadi bayi dino */
(function () {
  const DINOS = ['🦕', '🦖', '🐲', '🦎', '🐢', '🐊'];
  const EGGS = ['#fef3c7', '#dcfce7', '#e0f2fe', '#fce7f3', '#ede9fe', '#ffedd5'];
  let egg = null; let crack = 0; let per = 2; let hatched = 0; let herd = null;
  function newEgg(api) {
    const c = EGGS[hatched % EGGS.length];
    egg = api.el(`<div class="egg" style="--c:${c}"><svg viewBox="0 0 100 130" preserveAspectRatio="none"><path class="k k1" d="M50 20 L42 38 L56 50 L44 66"/><path class="k k2" d="M44 66 L30 74 M56 50 L72 58 L64 72"/><path class="k k3" d="M20 70 L34 60 L44 66 L58 80 L74 70 L86 78"/></svg></div>`, api.scene.querySelector('.nest'));
    crack = 0; egg.dataset.c = 0;
  }
  KidGame({
    gameId: 'sd-telur-dino', level: 'sd', title: 'Telur Dino', tag: 'Game SD • Pancasila & PPKn',
    emoji: '🦕', mascot: '🥚', tagline: 'Jawab soal Pancasila untuk meretakkan telur. Lihat bayi dino menetas!',
    defaultTarget: 8, winEmoji: '🦖', winTitle: 'SEMUA TELUR MENETAS!', winText: 'Hebat! Kamu menjaga keluarga dino dengan baik.',
    hooks: {
      build(api) {
        hatched = 0; per = api.target <= 10 ? 2 : 3;
        api.el('<div class="sky"></div>');
        api.el('<div class="sun"></div>');
        api.el('<div class="volcano"><div class="cone"><i class="lava"></i></div><span class="smoke s1"></span><span class="smoke s2"></span><span class="smoke s3"></span></div>');
        api.el('<div class="hill"></div>');
        api.el('<div class="ground"></div>');
        ['🌴', '🌿', '🌴', '🌿', '🌴'].forEach((p, i) => api.el(`<span class="plant" style="left:${i * 24}%;animation-delay:${-i * 0.6}s">${p}</span>`));
        api.el('<span class="ptero">🦅</span>');
        herd = api.el('<div class="herd"></div>');
        api.el('<div class="nest"><div class="twigs"></div></div>');
        newEgg(api);
      },
      async correct(api) {
        crack++; egg.dataset.c = crack; api.sfx.hit && api.sfx.hit();
        await api.anim(egg, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }], { duration: 700 });
        if (crack >= per) {
          egg.classList.add('open'); api.sfx.magic();
          const d = DINOS[hatched % DINOS.length]; hatched++;
          const baby = api.el(`<span class="baby">${d}</span>`, api.scene.querySelector('.nest'));
          await api.anim(baby, [{ transform: 'translate(-50%, 4vh) scale(.2)', opacity: 0 }, { transform: 'translate(-50%, -10vh) scale(1.2)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%, -4vh) scale(1)' }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
          api.fx.burstAt(baby, { emojis: ['✨', '⭐', '💚'], count: 14, spread: 150 });
          await api.sleep(500);
          baby.remove(); egg.remove();
          const h = api.el(`<span class="walker" style="animation-delay:${-hatched * 1.3}s">${d}</span>`, herd);
          api.anim(h, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
          newEgg(api);
          await api.anim(egg, [{ transform: 'scale(0)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 500 });
        }
      },
      wrong(api) { const p = api.scene.querySelector('.ptero'); api.anim(p, [{ transform: 'translateY(0)' }, { transform: 'translateY(-4vh)' }, { transform: 'translateY(0)' }], { duration: 500 }); },
      async win(api) {
        herd.querySelectorAll('.walker').forEach((w, i) => api.anim(w, [{ transform: 'translateY(0)' }, { transform: 'translateY(-5vh)' }, { transform: 'translateY(0)' }], { duration: 450, delay: i * 90, iterations: 3 }));
        await api.sleep(1500);
      }
    }
  });
})();
