/* Balon Huruf — PAUD
   MEKANIK: LETUSKAN BALON yang sedang TERBANG. Balon jawaban naik dari bawah,
   ketuk balon yang benar sebelum terbang menjauh (balon akan muncul lagi). */
(function () {
  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
  let shelf = null; let balloons = []; let raf = 0; let last = 0;
  function loop(api, t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    const H = api.scene.clientHeight;
    balloons.forEach((b) => {
      if (b.popped) return;
      b.y -= b.v * dt * H; b.ph += dt * b.w;
      if (b.y < -0.25 * H) { b.y = H * (1.05 + Math.random() * 0.15); b.x = b.home + (Math.random() - 0.5) * 6; b.v = b.base; }
      b.el.style.transform = `translate(${(b.x + Math.sin(b.ph) * 2.2).toFixed(2)}vw, ${b.y.toFixed(1)}px)`;
    });
    raf = requestAnimationFrame((tt) => loop(api, tt));
  }
  KidGame({
    gameId: 'paud-balon-huruf', level: 'paud', answerMode: 'custom', title: 'Balon Huruf', tag: 'Game PAUD • Mengenal huruf',
    emoji: '🎈', mascot: '🎈', tagline: 'Balon-balon terbang ke langit! Letuskan balon dengan jawaban yang benar.',
    howTo: [['👂', 'Dengarkan soal'], ['🎈', 'Cari balon yang benar'], ['💥', 'Ketuk untuk meletuskan']],
    defaultTarget: 8, winEmoji: '🎉', winTitle: 'PESTA BALON!', winText: 'Hebat! Kamu sudah pintar mengenal huruf.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        [[24, 0], [40, -18], [30, -34]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        api.el('<div class="city"></div>');
        api.el('<div class="kid">🧒</div>');
        api.el('<div class="kid k2">👧</div>');
        shelf = api.el('<div class="shelf"><span class="lbl">Huruf terkumpul:</span></div>');
      },
      present(api, q, order) {
        const H = api.scene.clientHeight; const n = order.length;
        balloons = order.map((k, i) => {
          const txt = q['option' + k]; const c = COLORS[(i + api.rand(0, 6)) % COLORS.length];
          const el = api.el(`<button class="balloon ${api.isEmojiOnly(txt) ? 'emo' : ''}" style="--c:${c}"><span></span></button>`);
          el.querySelector('span').textContent = txt; if ([...txt].length <= 2) el.classList.add('big');
          const home = 12 + i * (70 / Math.max(1, n - 1));
          const b = { el, k, home, x: home, y: H * (0.95 + i * 0.12), base: 0.085 + Math.random() * 0.02, v: 0, ph: Math.random() * 6, w: 1.4 + Math.random(), popped: false };
          b.v = b.base;
          el.onclick = async () => {
            if (b.popped || api.busy) return;
            const r = await api.answer(k, el);
            if (r && r.correct === false) { b.v = 0.6; el.classList.add('nope'); setTimeout(() => el.classList.remove('nope'), 600); }
          };
          return b;
        });
        last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame((t) => loop(api, t));
        api.hint('👆 Ketuk balon yang benar!');
      },
      async correct(api, { el }) {
        const b = balloons.find((x) => x.el === el); if (b) b.popped = true;
        api.sfx.pop(); el.classList.add('pop');
        api.fx.burstAt(el, { emojis: ['🎊', '✨', '⭐', '💥'], count: 18, spread: 180 });
        const txt = el.textContent.trim(); const chip = api.el(`<span class="chip" style="--c:${getComputedStyle(el).getPropertyValue('--c')}"></span>`, shelf); chip.textContent = txt.length <= 4 ? txt : txt.slice(0, 4);
        await api.sleep(650);
      },
      reveal(api, k) { balloons.forEach((b) => { if (b.k === k) { b.v = 0; b.el.classList.add('show'); } }); },
      clear() { cancelAnimationFrame(raf); balloons.forEach((b) => b.el.remove()); balloons = []; },
      async win(api) {
        for (let i = 0; i < 14; i++) api.el(`<div class="deco-balloon" style="left:${api.rand(2, 92)}%;--c:${api.pick(COLORS)};animation-delay:${i * 0.12}s"></div>`);
        api.scene.querySelectorAll('.kid').forEach((k) => api.anim(k, [{ transform: 'translateY(0)' }, { transform: 'translateY(-5vh)' }, { transform: 'translateY(0)' }], { duration: 450, iterations: 3 }));
        await api.sleep(1500);
      }
    }
  });
})();
