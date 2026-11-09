/* Telur Dino — SD Pancasila & PPKn
   MEKANIK: PILIH JALAN. Ada beberapa jalan bercabang, tiap jalan berakhir di papan jawaban.
   Ketuk papan, dino berjalan ke sana: jawaban benar = menemukan telur yang menetas,
   jawaban salah = jalan buntu, dino kembali. */
(function () {
  const BABY = ['🦕', '🦖', '🐲', '🦎', '🐢', '🐊'];
  const SPOTS = { 1: [[55, 46]], 2: [[38, 46], [76, 48]], 3: [[30, 48], [56, 40], [84, 50]], 4: [[26, 50], [46, 40], [68, 42], [88, 54]] };
  const S = [9, 82];
  let dino = null; let svg = null; let signs = []; let paths = []; let walking = false; let herd = null; let hatched = 0;
  const bez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  const ctrlOf = (p) => [S[0] * 0.3 + p[0] * 0.7, S[1] - 2];
  function walk(api, p, back) {
    return new Promise((res) => {
      const c = ctrlOf(p); const dur = 1500; let t0 = 0;
      const step = (now) => {
        if (!t0) t0 = now; let t = Math.min(1, (now - t0) / dur); if (back) t = 1 - t;
        const [x, y] = bez(S, c, p, t); dino.style.left = x + '%'; dino.style.top = y + '%';
        dino.style.setProperty('--s', 0.75 + 0.35 * (1 - (y - 40) / 45));
        dino.firstElementChild.style.transform = `scaleX(${back ? 1 : -1})`;
        if ((now - t0) / dur < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }
  KidGame({
    gameId: 'sd-telur-dino', level: 'sd', answerMode: 'custom', title: 'Telur Dino', tag: 'Game SD • Pancasila & PPKn',
    emoji: '🦕', mascot: '🥚', tagline: 'Bantu Dino memilih jalan yang benar untuk menemukan telur-telur dinosaurus!',
    howTo: [['📖', 'Baca soalnya'], ['🪧', 'Pilih papan jawaban'], ['🥚', 'Jalan benar = telur menetas']],
    defaultTarget: 8, winEmoji: '🦖', winTitle: 'SEMUA TELUR MENETAS!', winText: 'Hebat! Keluarga dino sudah lengkap.',
    hooks: {
      build(api) {
        hatched = 0; walking = false;
        api.el('<div class="sky"></div>');
        api.el('<div class="sun"></div>');
        api.el('<div class="volcano"><div class="cone"><i class="lava"></i></div><span class="smoke s1"></span><span class="smoke s2"></span><span class="smoke s3"></span></div>');
        api.el('<div class="hill"></div>');
        api.el('<div class="ground"></div>');
        ['🌴', '🌿', '🌴', '🌿', '🌴', '🌿'].forEach((p, i) => api.el(`<span class="plant" style="left:${i * 19}%;animation-delay:${-i * 0.6}s">${p}</span>`));
        api.el('<span class="ptero">🦅</span>');
        svg = api.el('<svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>');
        api.el(`<div class="start" style="left:${S[0]}%;top:${S[1]}%">🏁</div>`);
        herd = api.el('<div class="herd"><b>Bayi dino:</b></div>');
        dino = api.el(`<div class="dino" style="left:${S[0]}%;top:${S[1]}%"><span>🦖</span></div>`);
      },
      present(api, q, order) {
        const spots = SPOTS[Math.min(4, order.length)] || SPOTS[4];
        dino.style.left = S[0] + '%'; dino.style.top = S[1] + '%'; dino.style.opacity = 1;
        paths = order.map((k, i) => {
          const p = spots[i]; const c = ctrlOf(p);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${S[0]} ${S[1]} Q ${c[0]} ${c[1]} ${p[0]} ${p[1]}`); svg.appendChild(path); return path;
        });
        signs = order.map((k, i) => {
          const p = spots[i]; const txt = q['option' + k];
          const s = api.el(`<div class="sign" data-k="${k}" style="left:${p[0]}%;top:${p[1]}%;--d:${i * 120}ms"><button class="kg-token" style="--c1:${api.OPT[i % 4][0]};--c2:${api.OPT[i % 4][1]}"></button><i></i></div>`);
          const b = s.querySelector('button'); b.textContent = txt;
          b.onclick = async () => {
            if (walking || api.busy) return; walking = true; api.sfx.click();
            await walk(api, p, false);
            const r = await api.answer(k, b);
            if (r && r.correct === false) {
              const block = api.el(`<span class="block" style="left:${p[0]}%;top:${p[1]}%">🚧</span>`);
              api.praise('Jalan buntu!', false);
              await api.sleep(700); s.classList.add('dead'); paths[i].classList.add('dead');
              await walk(api, p, true); block.remove();
            }
            walking = false;
          };
          return s;
        });
        api.hint('👆 Ketuk papan jawaban — Dino akan berjalan ke sana');
      },
      async correct(api, { el }) {
        const s = el.closest('.sign'); const p = api.pos(s);
        const egg = api.el(`<div class="egg" style="left:${p.x}px;top:${p.y + 30}px"><i class="k"></i></div>`);
        await api.anim(egg, [{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1.15)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 450 });
        await api.anim(egg, [{ rotate: '0deg' }, { rotate: '-14deg' }, { rotate: '12deg' }, { rotate: '-8deg' }, { rotate: '0deg' }], { duration: 650 });
        egg.classList.add('open'); api.sfx.magic();
        const d = BABY[hatched % BABY.length]; hatched++;
        const baby = api.el(`<span class="baby" style="left:${p.x}px;top:${p.y + 20}px">${d}</span>`);
        await api.anim(baby, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-120%) scale(1.2)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%,-90%) scale(1)' }], { duration: 800, fill: 'forwards' });
        api.fx.burstAt(baby, { emojis: ['✨', '⭐', '💚'], count: 14, spread: 150 });
        await api.sleep(450); egg.remove(); baby.remove();
        api.el(`<span class="hb">${d}</span>`, herd);
        dino.style.opacity = 0;
      },
      reveal(api, k) { signs.forEach((s) => s.dataset.k === k && s.querySelector('.kg-token').classList.add('show')); },
      clear() { signs.forEach((s) => s.remove()); paths.forEach((p) => p.remove()); signs = []; paths = []; walking = false; },
      async win(api) {
        dino.style.opacity = 1; dino.style.left = '50%'; dino.style.top = '70%';
        herd.querySelectorAll('.hb').forEach((h, i) => api.anim(h, [{ transform: 'translateY(0)' }, { transform: 'translateY(-3vh)' }, { transform: 'translateY(0)' }], { duration: 450, delay: i * 80, iterations: 3 }));
        await api.sleep(1500);
      }
    }
  });
})();
