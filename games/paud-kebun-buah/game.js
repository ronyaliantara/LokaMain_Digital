/* Kebun Buah Ceria — PAUD: petik buah yang benar, kumpulkan di keranjang */
(function () {
  const FRUITS = ['🍎', '🍊', '🍐', '🍑', '🍋', '🍒', '🥭', '🍏', '🍎', '🍊'];
  let tree = []; let basket = null; let pile = null; let cnt = null;
  KidGame({
    gameId: 'paud-kebun-buah', level: 'paud', title: 'Kebun Buah Ceria', tag: 'Game PAUD • Mengenal buah & warna',
    emoji: '🍎', mascot: '🧺', tagline: 'Pilih jawaban yang benar, petik buahnya, dan isi keranjang sampai penuh!',
    defaultTarget: 8, winEmoji: '🧺', winTitle: 'KERANJANG PENUH!', winText: 'Hebat! Semua buah sudah dipetik.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        api.el('<div class="sun"><span>☀️</span></div>');
        [[12, 0], [30, -14], [52, -7]].forEach(([top, delay]) => api.el(`<div class="cloud" style="top:${top}%;animation-delay:${delay}s">☁️</div>`));
        api.el('<div class="hill a"></div>'); api.el('<div class="hill b"></div>'); api.el('<div class="ground"></div>');
        const t = api.el('<div class="tree"><div class="trunk"></div><div class="crown"><i></i><i></i><i></i><i></i></div></div>');
        const crown = t.querySelector('.crown');
        const spots = [[18, 30], [38, 18], [60, 26], [78, 40], [30, 52], [52, 48], [70, 62], [14, 60], [44, 72], [86, 22]];
        tree = spots.map(([x, y], i) => api.el(`<span class="fruit" style="left:${x}%;top:${y}%;animation-delay:${-i * 0.37}s">${FRUITS[i % FRUITS.length]}</span>`, crown));
        basket = api.el('<div class="basket"><div class="pile"></div><span class="bk">🧺</span><b class="cnt">0</b></div>');
        pile = basket.querySelector('.pile'); cnt = basket.querySelector('.cnt');
        api.el('<div class="fly bee">🐝</div>'); api.el('<div class="fly butterfly">🦋</div>');
        ['🌼', '🌷', '🌻', '🌸', '🌼'].forEach((f, i) => api.el(`<span class="flower" style="left:${8 + i * 21}%;animation-delay:${-i * 0.6}s">${f}</span>`));
      },
      async correct(api, { progress }) {
        const f = tree.find((x) => x.isConnected && !x.dataset.gone) || null;
        const scene = api.scene.getBoundingClientRect();
        let emoji = FRUITS[progress % FRUITS.length]; let from = { x: scene.width * 0.3, y: scene.height * 0.2 };
        if (f) { const r = f.getBoundingClientRect(); from = { x: r.left + r.width / 2 - scene.left, y: r.top + r.height / 2 - scene.top }; emoji = f.textContent; f.dataset.gone = '1'; f.style.visibility = 'hidden'; }
        const br = basket.getBoundingClientRect(); const to = { x: br.left + br.width / 2 - scene.left, y: br.top + br.height * 0.3 - scene.top };
        const fly = api.el(`<span class="flying">${emoji}</span>`);
        await api.anim(fly, [
          { transform: `translate(${from.x}px, ${from.y}px) scale(1) rotate(0)` },
          { transform: `translate(${(from.x + to.x) / 2}px, ${Math.min(from.y, to.y) - 90}px) scale(1.4) rotate(200deg)`, offset: 0.45 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(.9) rotate(360deg)` }
        ], { duration: 900, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'forwards' });
        fly.remove();
        api.el(`<span>${emoji}</span>`, pile);
        cnt.textContent = progress; api.sfx.pop();
        api.anim(basket, [{ transform: 'translateX(-50%) scale(1)' }, { transform: 'translateX(-50%) scale(1.15, .9)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 400 });
        await api.sleep(250);
      },
      wrong(api) { const t = api.scene.querySelector('.tree'); api.anim(t, [{ transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], { duration: 450 }); },
      async win(api) {
        for (let i = 0; i < 14; i++) {
          const s = api.el(`<span class="rain" style="left:${api.rand(5, 92)}%;animation-delay:${i * 0.08}s">${api.pick(FRUITS)}</span>`);
          setTimeout(() => s.remove(), 2600);
        }
        await api.anim(basket, [{ transform: 'translateX(-50%) translateY(0)' }, { transform: 'translateX(-50%) translateY(-40px)' }, { transform: 'translateX(-50%) translateY(0)' }], { duration: 600, iterations: 2 });
      }
    }
  });
})();
