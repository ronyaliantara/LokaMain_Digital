/* Akuarium Hewan — PAUD
   MEKANIK: MEMANCING. Jawaban dibawa ikan-ikan yang berenang. Ketuk ikan yang benar,
   perahu bergerak, kail turun, lalu ikan ditarik ke ember! */
(function () {
  const FISH = ['🐠', '🐟', '🐡', '🐬', '🐢', '🦈'];
  let boat = null; let line = null; let hook = null; let fishes = []; let raf = 0; let last = 0; let casting = false; let caught = 0; let bucket = null;
  function loop(api, t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    fishes.forEach((f) => {
      if (f.hooked) return;
      f.x += f.dir * f.v * dt; if (f.x > 88) { f.x = 88; f.dir = -1; } if (f.x < 8) { f.x = 8; f.dir = 1; }
      f.ph += dt * 2;
      f.el.style.left = f.x + '%'; f.el.style.top = `calc(${f.y}% + ${Math.sin(f.ph) * 1.2}vh)`;
      f.el.querySelector('.f').style.transform = `scaleX(${f.dir > 0 ? -1 : 1})`;
    });
    raf = requestAnimationFrame((tt) => loop(api, tt));
  }
  async function cast(api, f) {
    if (casting || api.busy) return; casting = true; f.slow = true; const v0 = f.v; f.v = 0;
    const sc = api.scene.getBoundingClientRect(); const fp = api.pos(f.el);
    boat.style.left = (fp.x / sc.width * 100) + '%';
    await api.sleep(450);
    const bp = api.pos(boat.querySelector('.tip'));
    line.style.left = bp.x + 'px'; line.style.top = bp.y + 'px'; hook.style.left = bp.x + 'px';
    const len = fp.y - bp.y - 10;
    await api.anim(line, [{ height: '0px' }, { height: len + 'px' }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
    hook.style.top = (bp.y + len) + 'px'; hook.hidden = false;
    const r = await api.answer(f.k, f.el.querySelector('.kg-token'));
    if (!r || !r.correct) {
      f.v = Math.max(v0, 14) * 2.2; f.dir = -f.dir; setTimeout(() => (f.v = v0), 1600);
      await api.anim(line, [{ height: len + 'px' }, { height: '0px' }], { duration: 400, fill: 'forwards' });
      hook.hidden = true;
    }
    casting = false;
  }
  KidGame({
    gameId: 'paud-akuarium', level: 'paud', answerMode: 'custom', title: 'Akuarium Hewan', tag: 'Game PAUD • Mengenal hewan',
    emoji: '🎣', mascot: '🎣', tagline: 'Ayo memancing! Ketuk ikan yang membawa jawaban benar, lalu tarik ke ember.',
    howTo: [['👂', 'Dengarkan soal'], ['🐟', 'Ketuk ikan yang benar'], ['🎣', 'Kail menangkap ikannya']],
    defaultTarget: 8, winEmoji: '🐳', winTitle: 'EMBER PENUH!', winText: 'Hebat! Kamu pemancing yang pintar.',
    hooks: {
      build(api) {
        caught = 0;
        api.el('<div class="air"></div>');
        api.el('<div class="water"><i class="wave"></i></div>');
        api.el('<div class="rays"></div>');
        api.el('<div class="sand"></div>');
        ['🌿', '🌱', '🌿', '🌾', '🌿'].forEach((w, i) => api.el(`<span class="weed" style="left:${3 + i * 23}%;animation-delay:${-i * 0.7}s">${w}</span>`));
        for (let i = 0; i < 12; i++) api.el(`<span class="bubble" style="left:${api.rand(2, 96)}%;animation-duration:${6 + (i % 5) * 1.4}s;animation-delay:${-i * 0.9}s"></span>`);
        ['🐚', '⭐', '🦀'].forEach((e, i) => api.el(`<span class="floor" style="left:${18 + i * 30}%">${e}</span>`));
        boat = api.el('<div class="boat"><div class="bob"><span class="kid">🧒</span><i class="hull"></i><i class="rod"><i class="tip"></i></i></div><b class="bucket">🐟 <em>0</em></b></div>');
        bucket = boat.querySelector('em');
        line = api.el('<i class="line"></i>'); hook = api.el('<i class="hook" hidden>⚓</i>');
      },
      present(api, q, order) {
        const lanes = [48, 62, 76, 88];
        fishes = order.map((k, i) => {
          const txt = q['option' + k];
          const el = api.el(`<button class="fish"><span class="f">${FISH[(i + caught) % FISH.length]}</span><span class="kg-token ${api.isEmojiOnly(txt) ? 'emo' : ''}" style="--c1:${api.OPT[i % 4][0]};--c2:${api.OPT[i % 4][1]}"></span></button>`);
          el.querySelector('.kg-token').textContent = txt;
          const f = { el, k, x: 15 + api.rand(0, 70), y: lanes[i % lanes.length] - 8, dir: i % 2 ? 1 : -1, v: 6 + Math.random() * 4, ph: Math.random() * 6, hooked: false };
          el.onclick = () => cast(api, f);
          return f;
        });
        last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame((t) => loop(api, t));
        api.hint('👆 Ketuk ikan yang membawa jawaban benar');
      },
      async correct(api, { el }) {
        const f = fishes.find((x) => x.el.contains(el)); if (!f) return; f.hooked = true;
        const bp = api.pos(boat.querySelector('.tip')); const fp = api.pos(f.el);
        api.sfx.whoosh();
        await Promise.all([
          api.anim(f.el, [{ transform: 'translate(0,0)' }, { transform: `translate(0, ${bp.y - fp.y + 20}px) rotate(-20deg)` }], { duration: 800, easing: 'ease-in', fill: 'forwards' }),
          api.anim(line, [{ height: line.style.height || getComputedStyle(line).height }, { height: '0px' }], { duration: 800, easing: 'ease-in', fill: 'forwards' })
        ]);
        hook.hidden = true; f.el.remove(); caught++; bucket.textContent = caught; api.sfx.coin();
        api.anim(boat, [{ rotate: '0deg' }, { rotate: '-6deg' }, { rotate: '4deg' }, { rotate: '0deg' }], { duration: 600 });
      },
      reveal(api, k) { fishes.forEach((f) => { if (f.k === k) { f.v = 0; f.el.querySelector('.kg-token').classList.add('show'); } }); },
      clear() { cancelAnimationFrame(raf); fishes.forEach((f) => f.el.remove()); fishes = []; if (line) { line.getAnimations().forEach((a) => a.cancel()); line.style.height = '0'; } if (hook) hook.hidden = true; casting = false; },
      async win(api) {
        for (let i = 0; i < 8; i++) { const w = api.el(`<span class="jump" style="left:${10 + i * 11}%;animation-delay:${i * 0.15}s">${FISH[i % FISH.length]}</span>`); setTimeout(() => w.remove(), 2600); }
        await api.sleep(1600);
      }
    }
  });
})();
