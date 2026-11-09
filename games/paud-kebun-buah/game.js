/* Kebun Buah Ceria — PAUD
   MEKANIK: SERET (drag) jawaban yang tergantung di pohon ke dalam keranjang. */
(function () {
  const FRUITS = ['🍎', '🍊', '🍐', '🍑', '🍋', '🍒', '🥭', '🍏'];
  const SLOTS = [[14, 40], [27, 30], [40, 42], [24, 56]];
  let basket = null; let pile = null; let cnt = null; let answers = []; let shownHand = false;
  const overBasket = (x, y) => { const r = basket.getBoundingClientRect(); const pad = r.width * 0.35; return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad; };

  function enableDrag(api, t) {
    let sx = 0; let sy = 0; let id = null; let moved = false;
    const tok = t.querySelector('.kg-token');
    t.addEventListener('pointerdown', (e) => {
      if (api.busy || id !== null) return; id = e.pointerId; try { t.setPointerCapture(id); } catch (x) { /* abaikan */ }
      sx = e.clientX; sy = e.clientY; moved = false; t.classList.add('drag'); api.sfx.click();
    });
    t.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx; const dy = e.clientY - sy; if (Math.hypot(dx, dy) > 10) moved = true;
      t.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.12)`;
      basket.classList.toggle('hot', overBasket(e.clientX, e.clientY));
    });
    const up = async (e) => {
      if (e.pointerId !== id) return; id = null; t.classList.remove('drag'); basket.classList.remove('hot');
      if (!moved) { t.style.transform = ''; api.hint('👉 Seret buahnya ke keranjang, ya!'); api.speak('Seret buahnya ke keranjang'); hand(api, t); return; }
      if (overBasket(e.clientX, e.clientY)) { const r = await api.answer(t.dataset.k, tok); if (r && r.correct) return; }
      const from = t.style.transform; t.style.transform = '';
      t.animate([{ transform: from }, { transform: 'translate(-50%, -50%)' }], { duration: 420, easing: 'cubic-bezier(.3,1.5,.5,1)' });
    };
    t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
  }
  function hand(api, t) {
    const a = api.pos(t); const b = api.pos(basket);
    const h = api.el('<span class="hand">👆</span>');
    api.anim(h, [{ transform: `translate(${a.x}px, ${a.y}px)`, opacity: 0 }, { transform: `translate(${a.x}px, ${a.y}px)`, opacity: 1, offset: 0.15 }, { transform: `translate(${b.x}px, ${b.y}px)`, opacity: 1, offset: 0.85 }, { transform: `translate(${b.x}px, ${b.y}px)`, opacity: 0 }], { duration: 1700, easing: 'ease-in-out' }).then(() => h.remove());
  }

  KidGame({
    gameId: 'paud-kebun-buah', level: 'paud', answerMode: 'custom', title: 'Kebun Buah Ceria', tag: 'Game PAUD • Mengenal buah & warna',
    emoji: '🍎', mascot: '🧺', tagline: 'Seret buah jawaban yang benar dari pohon ke dalam keranjang!',
    howTo: [['👂', 'Dengarkan soal'], ['👆', 'Seret buah yang benar'], ['🧺', 'Isi keranjang sampai penuh']],
    defaultTarget: 8, winEmoji: '🧺', winTitle: 'KERANJANG PENUH!', winText: 'Hebat! Semua buah sudah dipetik.',
    hooks: {
      build(api) {
        shownHand = false;
        api.el('<div class="sky"></div>');
        api.el('<div class="sun"><span>☀️</span></div>');
        [[10, 0], [26, -14], [44, -7]].forEach(([top, delay]) => api.el(`<div class="cloud" style="top:${top}%;animation-delay:${delay}s">☁️</div>`));
        api.el('<div class="hill a"></div>'); api.el('<div class="hill b"></div>'); api.el('<div class="ground"></div>');
        const t = api.el('<div class="tree"><div class="trunk"></div><div class="crown"><i></i><i></i><i></i><i></i><i></i></div></div>');
        [[12, 70], [80, 64], [64, 82], [30, 84], [88, 40]].forEach(([x, y], i) => api.el(`<span class="fruit" style="left:${x}%;top:${y}%;animation-delay:${-i * 0.4}s">${FRUITS[i]}</span>`, t.querySelector('.crown')));
        basket = api.el('<div class="basket"><div class="pile"></div><span class="bk">🧺</span><b class="cnt">0</b><em>Taruh di sini</em></div>');
        pile = basket.querySelector('.pile'); cnt = basket.querySelector('.cnt');
        api.el('<div class="fly bee">🐝</div>'); api.el('<div class="fly butterfly">🦋</div>');
        ['🌼', '🌷', '🌻', '🌸', '🌼', '🌷'].forEach((f, i) => api.el(`<span class="flower" style="left:${4 + i * 17}%;animation-delay:${-i * 0.6}s">${f}</span>`));
      },
      present(api, q, order) {
        answers = order.map((k, i) => {
          const [x, y] = SLOTS[i % SLOTS.length]; const txt = q['option' + k];
          const t = api.el(`<div class="ans" data-k="${k}" style="left:${x}%;top:${y}%"><i class="stem"></i><div class="kg-token ${api.isEmojiOnly(txt) ? 'emo' : ''}" style="--c1:${api.OPT[i % 4][0]};--c2:${api.OPT[i % 4][1]}"></div></div>`);
          t.querySelector('.kg-token').textContent = txt;
          api.anim(t, [{ opacity: 0, marginTop: '-6vh' }, { opacity: 1, marginTop: '0' }], { duration: 500, delay: i * 120, easing: 'cubic-bezier(.2,.9,.3,1.4)', fill: 'backwards' });
          enableDrag(api, t); return t;
        });
        api.hint('👆 Seret jawaban yang benar ke keranjang 🧺');
        if (!shownHand) { shownHand = true; setTimeout(() => answers[0] && answers[0].isConnected && hand(api, answers[0]), 900); }
      },
      async correct(api, { el, progress }) {
        const t = el.closest('.ans'); const a = api.pos(t); const b = api.pos(basket);
        t.style.transform = ''; t.style.left = a.x + 'px'; t.style.top = a.y + 'px';
        await api.anim(t, [{ transform: 'translate(-50%, -50%) scale(1.1)' }, { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y - 20}px)) scale(.4)`, opacity: 0.2 }], { duration: 600, easing: 'ease-in', fill: 'forwards' });
        t.remove();
        const txt = (el.textContent || '').trim(); api.el(`<span>${api.isEmojiOnly(txt) && [...txt].length <= 3 ? txt : FRUITS[progress % FRUITS.length]}</span>`, pile);
        cnt.textContent = progress; api.sfx.pop();
        api.anim(basket, [{ transform: 'scale(1)' }, { transform: 'scale(1.18, .88)' }, { transform: 'scale(1)' }], { duration: 420 });
        await api.sleep(250);
      },
      wrong(api, { el }) { const tr = api.scene.querySelector('.tree'); api.anim(tr, [{ transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], { duration: 450 }); void el; },
      reveal(api, k) { answers.forEach((t) => t.dataset.k === k && t.querySelector('.kg-token').classList.add('show')); },
      clear() { answers.forEach((t) => t.remove()); answers = []; },
      async win(api) {
        for (let i = 0; i < 14; i++) { const s = api.el(`<span class="rain" style="left:${api.rand(5, 92)}%;animation-delay:${i * 0.08}s">${api.pick(FRUITS)}</span>`); setTimeout(() => s.remove(), 2600); }
        await api.anim(basket, [{ transform: 'translateY(0)' }, { transform: 'translateY(-40px)' }, { transform: 'translateY(0)' }], { duration: 600, iterations: 2 });
      }
    }
  });
})();
