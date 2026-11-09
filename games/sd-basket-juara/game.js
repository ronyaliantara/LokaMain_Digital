/* Basket Juara — SD IPS
   MEKANIK: JAWAB lalu TEMBAK DENGAN TIMING. Jawaban benar membuka kesempatan menembak:
   tekan TEMBAK saat penanda di zona hijau = 3 poin (swish!), kuning = 2 poin, merah = 1 poin. */
(function () {
  let hoop = null; let board = null; let shooters = []; let scores = [0, 0]; let meter = null; let raf = 0; let shootResolve = null;
  function shotMeter(api) {
    return new Promise((resolve) => {
      meter = api.el('<div class="meter"><div class="bar"><i class="z r"></i><i class="z y"></i><i class="z g"></i><i class="z y"></i><i class="z r"></i><b class="mk"></b></div><button class="shoot">🏀 TEMBAK!</button><small>atau tekan Spasi</small></div>');
      const mk = meter.querySelector('.mk'); let t0 = 0; let pos = 0;
      const step = (t) => { if (!t0) t0 = t; pos = 0.5 + 0.5 * Math.sin((t - t0) / 1000 * 3.6 - Math.PI / 2); mk.style.bottom = `calc(${(pos * 100).toFixed(1)}% - 1vh)`; raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
      const done = () => { if (!shootResolve) return; shootResolve = null; cancelAnimationFrame(raf); clearTimeout(auto); const d = Math.abs(pos - 0.5); const pts = d < 0.1 ? 3 : d < 0.28 ? 2 : 1; meter.classList.add('locked'); setTimeout(() => { meter && meter.remove(); meter = null; }, 500); resolve(pts); };
      shootResolve = done;
      meter.querySelector('.shoot').onclick = done;
      const auto = setTimeout(done, 7000);
      api.speak('Tekan tembak saat penanda di zona hijau!');
    });
  }
  async function throwBall(api, team, pts) {
    const s = shooters[api.teams === 2 ? team : 0];
    const sr = s.getBoundingClientRect(); const hr = hoop.querySelector('.rim').getBoundingClientRect(); const sc = api.scene.getBoundingClientRect();
    const from = { x: sr.left + sr.width / 2 - sc.left, y: sr.top - sc.top }; const to = { x: hr.left + hr.width / 2 - sc.left, y: hr.top - sc.top };
    const ball = api.el('<span class="ball">🏀</span>'); const H = sc.height;
    const arc = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - H * 0.22 };
    const frames = pts === 3
      ? [{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: `translate(${arc.x}px, ${arc.y}px) rotate(300deg)`, offset: 0.5 }, { transform: `translate(${to.x}px, ${to.y - 10}px) rotate(560deg)`, offset: 0.85 }, { transform: `translate(${to.x}px, ${to.y + H * 0.12}px) rotate(640deg)` }]
      : pts === 2
        ? [{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: `translate(${arc.x}px, ${arc.y}px) rotate(300deg)`, offset: 0.45 }, { transform: `translate(${to.x + 30}px, ${to.y - H * 0.12}px) rotate(500deg)`, offset: 0.7 }, { transform: `translate(${to.x}px, ${to.y - 8}px) rotate(560deg)`, offset: 0.85 }, { transform: `translate(${to.x}px, ${to.y + H * 0.12}px) rotate(640deg)` }]
        : [{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: `translate(${arc.x}px, ${arc.y}px) rotate(300deg)`, offset: 0.4 }, { transform: `translate(${to.x - 40}px, ${to.y - 6}px) rotate(500deg)`, offset: 0.62 }, { transform: `translate(${to.x + 40}px, ${to.y - 30}px) rotate(560deg)`, offset: 0.76 }, { transform: `translate(${to.x}px, ${to.y - 6}px) rotate(600deg)`, offset: 0.88 }, { transform: `translate(${to.x}px, ${to.y + H * 0.12}px) rotate(640deg)` }];
    await api.anim(ball, frames, { duration: pts === 3 ? 1000 : 1300, easing: 'ease-in-out', fill: 'forwards' });
    hoop.classList.remove('swish'); void hoop.offsetWidth; hoop.classList.add('swish'); ball.remove();
  }
  KidGame({
    gameId: 'sd-basket-juara', level: 'sd', answerMode: 'buttons', title: 'Basket Juara', tag: 'Game SD • IPS & Pengetahuan Umum',
    emoji: '🏀', mascot: '🏀', tagline: 'Jawab soal IPS, lalu tembak bola dengan timing yang tepat untuk skor 3 poin!',
    howTo: [['✅', 'Jawab soal dengan benar'], ['🎯', 'Tembak saat penanda di hijau'], ['🏆', 'Hijau 3 • Kuning 2 • Merah 1']],
    targetLabel: 'Skor untuk menang', defaultTarget: 15, teamsOption: true, winEmoji: '🏆', winTitle: 'JUARA BASKET!', winText: 'Hebat! Tembakanmu jitu sekali.',
    hooks: {
      build(api) {
        scores = [0, 0];
        api.el('<div class="wall"></div>'); api.el('<div class="crowd"></div>'); api.el('<div class="lights"><i></i><i></i><i></i><i></i></div>');
        api.el('<div class="floor"><i class="line"></i><i class="circle"></i></div>');
        hoop = api.el('<div class="hoop"><div class="board"><i></i></div><div class="rim"></div><div class="net"></div></div>');
        const two = api.teams === 2;
        board = api.el(`<div class="score">${two ? `<span style="--tc:${api.TEAMS[0].color}">0</span><em>:</em><span style="--tc:${api.TEAMS[1].color}">0</span>` : '<small>SKOR</small><span style="--tc:#f97316">0</span>'}</div>`);
        shooters = (two ? [[16, 0], [78, 1]] : [[22, 0]]).map(([x, i]) => api.el(`<div class="player" style="left:${x}%;--tc:${two ? api.TEAMS[i].color : '#f97316'}"><span>⛹️</span><b>${two ? api.TEAMS[i].name : 'Ayo!'}</b></div>`));
      },
      question(api, q, t) { shooters.forEach((s, i) => s.classList.toggle('now', api.teams === 2 && i === t)); },
      turn(api, t) { shooters.forEach((s, i) => s.classList.toggle('now', api.teams === 2 && i === t)); },
      key(api, e) { if (e.code === 'Space' && shootResolve) { shootResolve(); return true; } return false; },
      async correct(api, { team }) {
        const pts = await shotMeter(api);
        api.praise(pts === 3 ? '🔥 SWISH! 3 POIN' : pts === 2 ? '👍 MASUK! 2 POIN' : '😅 Mantul… 1 POIN', pts > 1);
        await throwBall(api, team, pts);
        api.sfx.coin();
        const ti = api.teams === 2 ? team : 0; scores[ti] += pts;
        const el = board.querySelectorAll('span')[ti]; el.textContent = scores[ti]; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        if (pts === 3) api.fx.burstAt(hoop.querySelector('.rim'), { emojis: ['🔥', '✨', '⭐'], count: 16, spread: 160 });
        await api.sleep(300);
        return { points: pts };
      },
      wrong(api) { api.anim(hoop, [{ rotate: '0deg' }, { rotate: '-3deg' }, { rotate: '3deg' }, { rotate: '0deg' }], { duration: 400 }); },
      clear() { cancelAnimationFrame(raf); if (meter) meter.remove(); meter = null; shootResolve = null; },
      async win(api, w) {
        const s = shooters[Math.max(0, w)];
        api.anim(s, [{ transform: 'translateY(0)' }, { transform: 'translateY(-6vh)' }, { transform: 'translateY(0)' }], { duration: 450, iterations: 3 });
        await api.sleep(1300);
      }
    }
  });
})();
