/* Basket Juara — SD IPS: setiap jawaban benar, bola masuk ring (1 kelas / 2 tim) */
(function () {
  let hoop = null; let board = null; let shooters = [];
  KidGame({
    gameId: 'sd-basket-juara', level: 'sd', title: 'Basket Juara', tag: 'Game SD • IPS & Pengetahuan Umum',
    emoji: '🏀', mascot: '🏀', tagline: 'Jawab soal IPS dengan benar dan cetak skor sebanyak-banyaknya!',
    defaultTarget: 8, teamsOption: true, winEmoji: '🏆', winTitle: 'JUARA BASKET!', winText: 'Hebat! Semua tembakan masuk ring.',
    hooks: {
      build(api) {
        api.el('<div class="wall"></div>');
        api.el('<div class="crowd"></div>');
        api.el('<div class="lights"><i></i><i></i><i></i><i></i></div>');
        api.el('<div class="floor"><i class="line"></i><i class="circle"></i></div>');
        hoop = api.el('<div class="hoop"><div class="board"><i></i></div><div class="rim"></div><div class="net"></div></div>');
        const two = api.teams === 2;
        board = api.el(`<div class="score">${two ? `<span style="--tc:${api.TEAMS[0].color}">0</span><em>:</em><span style="--tc:${api.TEAMS[1].color}">0</span>` : '<small>SKOR</small><span style="--tc:#f97316">0</span>'}</div>`);
        shooters = (two ? [[16, 0], [84, 1]] : [[20, 0]]).map(([x, i]) => api.el(`<div class="player" style="left:${x}%;--tc:${two ? api.TEAMS[i].color : '#f97316'}"><span>⛹️</span><b>${two ? api.TEAMS[i].name : 'Ayo!'}</b></div>`));
      },
      question(api, q, t) { shooters.forEach((s, i) => s.classList.toggle('now', api.teams === 2 && i === t)); },
      turn(api, t) { shooters.forEach((s, i) => s.classList.toggle('now', api.teams === 2 && i === t)); },
      async correct(api, { team, progress }) {
        const s = shooters[api.teams === 2 ? team : 0];
        const sr = s.getBoundingClientRect(); const hr = hoop.querySelector('.rim').getBoundingClientRect(); const sc = api.scene.getBoundingClientRect();
        const from = { x: sr.left + sr.width / 2 - sc.left, y: sr.top - sc.top };
        const to = { x: hr.left + hr.width / 2 - sc.left, y: hr.top - sc.top };
        const ball = api.el('<span class="ball">🏀</span>');
        await api.anim(ball, [
          { transform: `translate(${from.x}px, ${from.y}px) rotate(0)` },
          { transform: `translate(${(from.x + to.x) / 2}px, ${Math.min(from.y, to.y) - sc.height * 0.22}px) rotate(300deg)`, offset: 0.5 },
          { transform: `translate(${to.x}px, ${to.y - 10}px) rotate(560deg)`, offset: 0.85 },
          { transform: `translate(${to.x}px, ${to.y + sc.height * 0.12}px) rotate(640deg)` }
        ], { duration: 1100, easing: 'ease-in-out', fill: 'forwards' });
        hoop.classList.remove('swish'); void hoop.offsetWidth; hoop.classList.add('swish');
        api.sfx.coin(); ball.remove();
        const spans = board.querySelectorAll('span'); const el = spans[api.teams === 2 ? team : 0];
        el.textContent = progress * 2; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        api.fx.burstAt(hoop.querySelector('.rim'), { emojis: ['✨', '⭐', '🔥'], count: 12, spread: 140 });
        await api.sleep(300);
      },
      wrong(api) { api.anim(hoop, [{ transform: 'translateX(-50%) rotate(0)' }, { transform: 'translateX(-50%) rotate(-3deg)' }, { transform: 'translateX(-50%) rotate(3deg)' }, { transform: 'translateX(-50%) rotate(0)' }], { duration: 400 }); },
      async win(api, w) {
        const s = shooters[Math.max(0, w)];
        api.anim(s, [{ transform: 'translateX(-50%) translateY(0)' }, { transform: 'translateX(-50%) translateY(-6vh)' }, { transform: 'translateX(-50%) translateY(0)' }], { duration: 450, iterations: 3 });
        await api.sleep(1300);
      }
    }
  });
})();
