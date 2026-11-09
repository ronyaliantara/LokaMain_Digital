/* Kembang Api Kata — SD Bahasa Indonesia: setiap jawaban benar meluncurkan kembang api & menyalakan lampu kota */
(function () {
  const COLORS = ['#fde047', '#f472b6', '#60a5fa', '#34d399', '#fb923c', '#c084fc', '#f87171'];
  let wins = [];
  function firework(api, x, y, color, big) {
    const scene = api.scene;
    const rocket = api.el(`<i class="rocket" style="left:${x}%;--c:${color}"></i>`);
    return api.anim(rocket, [{ top: '72%', opacity: 1 }, { top: `${y}%`, opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).then(() => {
      rocket.remove(); api.sfx.pop();
      const n = big ? 36 : 26; const R = big ? 26 : 19;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2; const r = R * (0.75 + Math.random() * 0.4);
        const p = api.el(`<i class="spark" style="left:${x}%;top:${y}%;--c:${i % 3 ? color : '#fff'};--dx:${(Math.cos(a) * r).toFixed(1)}vh;--dy:${(Math.sin(a) * r).toFixed(1)}vh"></i>`);
        setTimeout(() => p.remove(), 1500);
      }
      const flash = api.el(`<i class="flash" style="left:${x}%;top:${y}%;--c:${color}"></i>`); setTimeout(() => flash.remove(), 700);
      void scene;
    });
  }
  KidGame({
    gameId: 'sd-kembang-api', level: 'sd', title: 'Kembang Api Kata', tag: 'Game SD • Bahasa Indonesia',
    emoji: '🎆', mascot: '🎆', tagline: 'Jawab soal Bahasa Indonesia untuk meluncurkan kembang api dan menyalakan lampu kota!',
    defaultTarget: 8, winEmoji: '🎇', winTitle: 'PESTA KEMBANG API!', winText: 'Hebat! Semua lampu kota sudah menyala.',
    hooks: {
      build(api) {
        api.el('<div class="night"></div>');
        for (let i = 0; i < 60; i++) api.el(`<i class="star" style="left:${api.rand(1, 99)}%;top:${api.rand(2, 55)}%;animation-delay:${-i * 0.23}s;--s:${(i % 3) + 2}px"></i>`);
        api.el('<div class="moon">🌙</div>');
        api.el('<div class="shoot"></div>');
        const city = api.el('<div class="city"></div>');
        const H = [26, 38, 22, 46, 30, 34, 24, 42, 28, 36];
        wins = [];
        H.forEach((h, i) => {
          const b = api.el(`<div class="bld" style="height:${h}vh;--w:${8 + (i % 3)}%"></div>`, city);
          const rows = Math.floor(h / 6);
          for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) wins.push(api.el('<i class="win"></i>', b));
        });
        wins = wins.sort(() => Math.random() - 0.5);
        api.el('<div class="ground"></div>');
      },
      async correct(api, { progress }) {
        const per = Math.ceil(wins.length / api.target);
        wins.slice((progress - 1) * per, progress * per).forEach((w, i) => setTimeout(() => w.classList.add('on'), 600 + i * 60));
        await firework(api, api.rand(15, 85), api.rand(14, 32), COLORS[progress % COLORS.length]);
        await api.sleep(500);
      },
      wrong(api) { const m = api.scene.querySelector('.moon'); api.anim(m, [{ transform: 'rotate(0)' }, { transform: 'rotate(-20deg)' }, { transform: 'rotate(0)' }], { duration: 500 }); },
      async win(api) {
        wins.forEach((w) => w.classList.add('on'));
        for (let i = 0; i < 7; i++) { firework(api, 10 + i * 13, api.rand(12, 30), COLORS[i % COLORS.length], true); await api.sleep(260); }
        await api.sleep(900);
      }
    }
  });
})();
