/* Panjat Kelapa — SD Matematika
   MEKANIK: BALAPAN CEPAT. Mode 2 tim = REBUTAN serentak (tiap tim punya tombol sendiri,
   yang pertama benar memanjat). Jawab < 5 detik = BONUS naik 2. Mode 1 kelas = lawan waktu. */
(function () {
  const FAST = 5; const LIMIT = 15;
  let monkeys = []; let pads = []; let t0 = 0; let timer = 0; let bar = null;
  function placeMonkey(api, i, p) { const m = monkeys[i]; if (m) m.style.bottom = `${Math.min(1, p / api.target) * 78}%`; }
  function pad(api, q, order, team, x) {
    const two = team >= 0; const col = two ? api.TEAMS[team].color : '#16a34a';
    const p = api.el(`<div class="pad ${two ? 'two' : 'one'}" style="left:${x}%;--tc:${col}"><b class="who">${two ? api.TEAMS[team].name + (team ? ' • tombol 7 8 9 0' : ' • tombol 1 2 3 4') : 'Jawab secepatnya!'}</b><div class="btns"></div></div>`);
    const box = p.querySelector('.btns');
    order.forEach((k, i) => {
      const b = api.el(`<button class="kg-opt" data-k="${k}" style="--c1:${api.OPT[i % 4][0]};--c2:${api.OPT[i % 4][1]}"><span></span></button>`, box);
      b.querySelector('span').textContent = q['option' + k];
      b.onclick = async () => {
        const r = await api.answer(k, b, two ? team : 0);
        if (r && r.correct === false) { if (two) p.classList.add('locked'); else b.disabled = true; }
      };
    });
    return p;
  }
  KidGame({
    gameId: 'sd-panjat-kelapa', level: 'sd', answerMode: 'rebutan', title: 'Panjat Kelapa', tag: 'Game SD • Matematika',
    emoji: '🐒', mascot: '🐒', tagline: 'Balapan memanjat pohon kelapa! Jawab paling cepat — kurang dari 5 detik dapat BONUS naik 2.',
    howTo: [['⚡', 'Rebutan: tim tercepat memanjat'], ['⏱️', '< 5 detik = bonus naik 2'], ['🥥', 'Sampai puncak = menang']],
    defaultTarget: 8, teamsOption: true, winEmoji: '🥥', winTitle: 'SAMPAI DI PUNCAK!', winText: 'Hebat! Monyet berhasil memetik kelapa.',
    hooks: {
      build(api) {
        api.el('<div class="sky"></div>');
        api.el('<div class="sun">☀️</div>');
        [[24, 0], [32, -26]].forEach(([t, d]) => api.el(`<div class="cloud" style="top:${t}%;animation-delay:${d}s">☁️</div>`));
        api.el('<div class="sea"><i></i></div>');
        api.el('<div class="sand"></div>');
        api.el('<div class="boat">⛵</div>');
        const two = api.teams === 2; const xs = two ? [30, 70] : [50];
        monkeys = xs.map((x, i) => {
          const c = two ? api.TEAMS[i].color : '#f59e0b';
          const t = api.el(`<div class="palm" style="left:${x}%"><div class="trunk"><div class="track"><div class="monkey" style="--tc:${c}"><span>🐒</span><b>${two ? api.TEAMS[i].name : 'Ayo!'}</b></div></div></div><div class="crown">${'<i></i>'.repeat(7)}</div><div class="nuts">🥥🥥🥥</div><div class="flag" style="--tc:${c}"></div></div>`);
          return t.querySelector('.monkey');
        });
        monkeys.forEach((_, i) => placeMonkey(api, i, 0));
        api.el('<div class="crab">🦀</div>');
      },
      present(api, q, order, { rebutan }) {
        t0 = performance.now();
        pads = rebutan ? [pad(api, q, order, 0, 24), pad(api, q, order, 1, 76)] : [pad(api, q, order, -1, 50)];
        bar = api.el(`<div class="timer"><i></i><b>${LIMIT}</b></div>`);
        const fill = bar.querySelector('i'); const num = bar.querySelector('b');
        clearInterval(timer);
        timer = setInterval(() => {
          const s = (performance.now() - t0) / 1000; const left = Math.max(0, LIMIT - s);
          fill.style.width = (left / LIMIT * 100) + '%'; fill.classList.toggle('fast', s < FAST); num.textContent = Math.ceil(left);
          if (left <= 0) { clearInterval(timer); api.timeout(); }
        }, 100);
        api.hint(rebutan ? '⚡ Rebutan! Kedua tim menjawab bersamaan' : '⏱️ Jawab sebelum waktu habis');
      },
      key(api, e) {
        const map = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [0, 3], 7: [1, 0], 8: [1, 1], 9: [1, 2], 0: [1, 3] };
        const m = map[e.key]; if (!m) return false;
        const p = pads[api.teams === 2 ? m[0] : 0]; const b = p && p.querySelectorAll('.kg-opt')[m[1]]; if (b) b.click(); return true;
      },
      async correct(api, { team, prev }) {
        clearInterval(timer);
        const fast = (performance.now() - t0) / 1000 < FAST; const pts = fast ? 2 : 1;
        if (fast) api.praise('⚡ CEPAT! Naik 2!', true);
        const m = monkeys[api.teams === 2 ? team : 0];
        m.classList.add('climb'); api.sfx.pop(); placeMonkey(api, api.teams === 2 ? team : 0, prev + pts);
        await api.sleep(900); m.classList.remove('climb');
        return { points: pts };
      },
      wrong(api, { team }) { const m = monkeys[api.teams === 2 ? team : 0]; if (m) api.anim(m.querySelector('span'), [{ rotate: '0deg' }, { rotate: '-15deg' }, { rotate: '15deg' }, { rotate: '0deg' }], { duration: 450 }); },
      reveal(api, k) { clearInterval(timer); pads.forEach((p) => p.querySelectorAll('.kg-opt').forEach((b) => { b.disabled = true; if (b.dataset.k === k) b.classList.add('show'); })); },
      clear() { clearInterval(timer); pads.forEach((p) => p.remove()); pads = []; if (bar) bar.remove(); bar = null; },
      async win(api, winner) {
        const palm = monkeys[Math.max(0, winner)].closest('.palm'); const nuts = palm.querySelector('.nuts');
        api.anim(monkeys[Math.max(0, winner)].querySelector('span'), [{ scale: 1 }, { scale: 1.3 }, { scale: 1 }], { duration: 500, iterations: 3 });
        await api.anim(nuts, [{ transform: 'translate(-50%, 0)' }, { transform: 'translate(-50%, 40vh) rotate(260deg)' }], { duration: 1000, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards' });
        api.sfx.coin(); await api.sleep(400);
      }
    }
  });
})();
