/* Kapal Selam IPA — SD
   MEKANIK: KEMUDIKAN KAPAL SELAM. Gerbang-gerbang jawaban datang dari kanan;
   gerakkan kapal ▲▼ (atau sentuh jalurnya) agar masuk ke gerbang jawaban yang benar. */
(function () {
  const LIFE = ['🐠', '🐡', '🐙', '🦑', '🐢', '🐬', '🦈', '🐋', '🦀', '🐟', '🐳'];
  let sub = null; let dark = null; let meter = null; let gates = []; let lanesY = []; let lane = 0; let gx = 105; let raf = 0; let last = 0; let speed = 9; let checking = false; let ctrl = null; let laneMarks = [];
  function setLane(api, i) {
    lane = Math.max(0, Math.min(lanesY.length - 1, i));
    sub.style.top = lanesY[lane] + '%'; laneMarks.forEach((m, j) => m.classList.toggle('on', j === lane)); api.sfx.click();
  }
  function loop(api, t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    if (!checking) {
      gx -= speed * dt; gates.forEach((g) => (g.style.left = gx + '%'));
      if (gx <= 24) {
        checking = true;
        const g = gates[lane];
        api.answer(g.dataset.k, g.querySelector('.kg-token')).then((r) => {
          if (r && r.correct === false) {
            api.anim(sub, [{ translate: '0 -50%' }, { translate: '-4vw -50%' }, { translate: '0 -50%' }], { duration: 500 });
            gates[lane].classList.add('nope');
            setTimeout(() => { gx = 105; speed = 12; checking = false; gates.forEach((x) => x.classList.remove('nope')); }, 900);
          }
        });
      }
    }
    raf = requestAnimationFrame((tt) => loop(api, tt));
  }
  KidGame({
    gameId: 'sd-kapal-selam', level: 'sd', answerMode: 'custom', title: 'Kapal Selam IPA', tag: 'Game SD • Ilmu Pengetahuan Alam',
    emoji: '🌊', mascot: '🐋', tagline: 'Kemudikan kapal selam ke gerbang jawaban yang benar dan menyelam sampai dasar laut!',
    howTo: [['📖', 'Baca soalnya'], ['🔼🔽', 'Gerakkan kapal ke jalur jawaban'], ['🚪', 'Masuk gerbang yang benar']],
    defaultTarget: 8, winEmoji: '💎', winTitle: 'HARTA DITEMUKAN!', winText: 'Hebat! Kapal selam sampai di dasar laut.',
    hooks: {
      build(api) {
        api.el('<div class="ocean"></div>');
        for (let i = 0; i < 7; i++) api.el(`<span class="life" style="top:${30 + (i * 11) % 60}%;animation-duration:${18 + i * 3}s;animation-delay:${-i * 4}s">${LIFE[i % LIFE.length]}</span>`);
        ['🌿', '🌱', '🌿', '🌿'].forEach((w, i) => api.el(`<span class="weed" style="left:${8 + i * 26}%;animation-delay:${-i}s">${w}</span>`));
        dark = api.el('<div class="dark"></div>');
        for (let i = 0; i < 12; i++) api.el(`<span class="bubble" style="left:${api.rand(3, 95)}%;animation-duration:${5 + (i % 4)}s;animation-delay:${-i * 0.7}s"></span>`);
        sub = api.el('<div class="sub"><div class="tower"><i class="peri"></i></div><div class="hull"><b></b><b></b><b></b></div><div class="prop"></div><span class="trail"></span></div>');
        meter = api.el('<div class="meter">Kedalaman: <b>0 m</b></div>');
        ctrl = api.el('<div class="ctrl"><button class="up">▲</button><button class="dn">▼</button></div>');
        ctrl.querySelector('.up').onclick = () => setLane(api, lane - 1);
        ctrl.querySelector('.dn').onclick = () => setLane(api, lane + 1);
        sub.style.top = '58%';
      },
      present(api, q, order) {
        const n = order.length; lanesY = order.map((_, i) => (n === 1 ? 60 : 36 + i * (50 / (n - 1))));
        laneMarks = lanesY.map((y) => api.el(`<div class="lane" style="top:${y}%"></div>`));
        laneMarks.forEach((m, i) => (m.onpointerdown = () => setLane(api, i)));
        gates = order.map((k, i) => {
          const txt = q['option' + k];
          const g = api.el(`<div class="gate" data-k="${k}" style="top:${lanesY[i]}%;left:105%"><i class="ring" style="--c:${api.OPT[i % 4][0]}"></i><span class="kg-token" style="--c1:${api.OPT[i % 4][0]};--c2:${api.OPT[i % 4][1]}"></span></div>`);
          g.querySelector('.kg-token').textContent = txt; return g;
        });
        setLane(api, Math.floor((n - 1) / 2));
        gx = 105; speed = 6.5; checking = false; last = 0;
        cancelAnimationFrame(raf); raf = requestAnimationFrame((t) => loop(api, t));
        api.hint('🔼🔽 Gerakkan kapal ke jalur jawaban yang benar sebelum gerbang tiba');
      },
      key(api, e) { if (e.key === 'ArrowUp') { setLane(api, lane - 1); return true; } if (e.key === 'ArrowDown') { setLane(api, lane + 1); return true; } return false; },
      async correct(api, { progress }) {
        cancelAnimationFrame(raf);
        gates.forEach((g, i) => { if (i !== lane) g.style.opacity = '0.2'; });
        api.sfx.whoosh();
        await api.anim(sub, [{ translate: '0 -50%' }, { translate: '70vw -50%' }], { duration: 900, easing: 'ease-in' });
        dark.style.opacity = Math.min(0.6, progress / api.target * 0.6);
        meter.querySelector('b').textContent = `${progress * 10} m`;
        api.anim(sub, [{ translate: '-30vw -50%' }, { translate: '0 -50%' }], { duration: 700, easing: 'ease-out' });
        api.anim(api.scene.querySelector('.ocean'), [{ backgroundPositionY: '0' }, { backgroundPositionY: '-40vh' }], { duration: 900 });
        await api.sleep(500);
      },
      reveal(api, k) { gates.forEach((g) => g.dataset.k === k && g.classList.add('show')); },
      clear() { cancelAnimationFrame(raf); gates.forEach((g) => g.remove()); laneMarks.forEach((m) => m.remove()); gates = []; laneMarks = []; },
      async win(api) {
        const chest = api.el('<div class="treasure"><span class="chest">🧰</span><span class="gem">💎</span></div>');
        await api.anim(chest, [{ transform: 'translateY(40vh)' }, { transform: 'translateY(0)' }], { duration: 900, easing: 'ease-out' });
        api.sfx.coin(); await api.sleep(900);
      }
    }
  });
})();
