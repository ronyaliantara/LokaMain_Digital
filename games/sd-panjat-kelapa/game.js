/* Panjat Kelapa — SD Matematika: monyet memanjat pohon kelapa setiap jawaban benar (1 kelas / 2 tim) */
(function () {
  let monkeys = [];
  function placeMonkey(api, i, p) {
    const m = monkeys[i]; if (!m) return;
    m.style.bottom = `${(p / api.target) * 78}%`;
  }
  KidGame({
    gameId: 'sd-panjat-kelapa', level: 'sd', title: 'Panjat Kelapa', tag: 'Game SD • Matematika',
    emoji: '🐒', mascot: '🐒', tagline: 'Jawab soal matematika dan bantu monyet memanjat pohon kelapa sampai puncak!',
    defaultTarget: 8, teamsOption: true, winEmoji: '🥥', winTitle: 'SAMPAI DI PUNCAK!', winText: 'Hebat! Monyet berhasil memetik kelapa.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        api.el('<div class="sun">☀️</div>');
        [[12, 0], [28, -26]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        api.el('<div class="sea"><i></i></div>');
        api.el('<div class="sand"></div>');
        api.el('<div class="boat">⛵</div>');
        const two = api.teams === 2;
        const xs = two ? [28, 72] : [50];
        monkeys = xs.map((x, i) => {
          const t = api.el(`<div class="palm" style="left:${x}%"><div class="trunk"><div class="track"><div class="monkey" style="--tc:${two ? api.TEAMS[i].color : '#f59e0b'}"><span>🐒</span><b>${two ? api.TEAMS[i].name : 'Ayo!'}</b></div></div></div>
            <div class="crown">${'<i></i>'.repeat(7)}</div><div class="nuts">🥥🥥🥥</div><div class="flag" style="--tc:${two ? api.TEAMS[i].color : '#f59e0b'}"></div></div>`);
          return t.querySelector('.monkey');
        });
        monkeys.forEach((_, i) => placeMonkey(api, i, 0));
        api.el('<div class="crab">🦀</div>');
      },
      turn(api, t) { monkeys.forEach((m, i) => m.classList.toggle('now', i === t)); },
      question(api, q, t) { if (api.teams === 2) monkeys.forEach((m, i) => m.classList.toggle('now', i === t)); },
      async correct(api, { team, progress }) {
        const m = monkeys[api.teams === 2 ? team : 0];
        m.classList.add('climb'); api.sfx.pop(); placeMonkey(api, api.teams === 2 ? team : 0, progress);
        await api.sleep(850); m.classList.remove('climb');
      },
      wrong(api, { team }) { const m = monkeys[api.teams === 2 ? team : 0]; if (m) api.anim(m, [{ transform: 'translateX(-50%) rotate(0)' }, { transform: 'translateX(-50%) rotate(-15deg)' }, { transform: 'translateX(-50%) rotate(15deg)' }, { transform: 'translateX(-50%) rotate(0)' }], { duration: 450 }); },
      async win(api, winner) {
        const palm = monkeys[Math.max(0, winner)].closest('.palm');
        const nuts = palm.querySelector('.nuts');
        api.anim(monkeys[Math.max(0, winner)], [{ transform: 'translateX(-50%) scale(1)' }, { transform: 'translateX(-50%) scale(1.3)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 500, iterations: 3 });
        await api.anim(nuts, [{ transform: 'translate(-50%, 0)' }, { transform: 'translate(-50%, 46vh) rotate(260deg)' }], { duration: 1000, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards' });
        api.sfx.coin();
        await api.sleep(400);
      }
    }
  });
})();
