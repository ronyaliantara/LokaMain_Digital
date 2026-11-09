/* Kembang Api Kata — SD
   MEKANIK: KETAPEL. Tarik ketapel ke bawah lalu lepaskan untuk menembakkan roket
   ke LAMPION jawaban yang benar (atau ketuk lampion untuk tembakan otomatis). */
(function () {
  const COLORS = ['#fde047', '#f472b6', '#60a5fa', '#34d399', '#fb923c', '#c084fc', '#f87171'];
  let wins = []; let lanterns = []; let sling = null; let band = null; let dots = []; let rocket = null; let flying = false; let raf = 0;
  function firework(api, x, y, color, big) {
    api.sfx.pop();
    const n = big ? 36 : 28; const R = big ? 26 : 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2; const r = R * (0.75 + Math.random() * 0.4);
      const p = api.el(`<i class="spark" style="left:${x}px;top:${y}px;--c:${i % 3 ? color : '#fff'};--dx:${(Math.cos(a) * r).toFixed(1)}vh;--dy:${(Math.sin(a) * r).toFixed(1)}vh"></i>`);
      setTimeout(() => p.remove(), 1500);
    }
    const f = api.el(`<i class="flash" style="left:${x}px;top:${y}px;--c:${color}"></i>`); setTimeout(() => f.remove(), 700);
  }
  function pouch(api) { const s = api.pos(sling); return { x: s.x, y: s.y - s.h * 0.25 }; }
  function drawBand(api, px, py) {
    const p = pouch(api); const sc = api.scene.getBoundingClientRect(); void sc;
    band.setAttribute('d', `M ${p.x - 40} ${p.y} L ${px} ${py} L ${p.x + 40} ${p.y}`);
    rocket.style.left = px + 'px'; rocket.style.top = py + 'px';
  }
  function resetRocket(api) { if (!sling || !sling.isConnected) return; const p = pouch(api); rocket.style.transform = ''; drawBand(api, p.x, p.y); rocket.style.opacity = 1; dots.forEach((d) => (d.style.opacity = 0)); }
  function shoot(api, vx, vy) {
    if (flying) return; flying = true; api.sfx.whoosh();
    let x = parseFloat(rocket.style.left); let y = parseFloat(rocket.style.top); const g = api.scene.clientHeight * 0.55; let last = 0;
    const p = pouch(api); drawBand(api, p.x, p.y); rocket.style.left = x + 'px'; rocket.style.top = y + 'px';
    const step = (t) => {
      const dt = Math.min(0.033, (t - (last || t)) / 1000); last = t;
      vy += g * dt; x += vx * dt; y += vy * dt;
      rocket.style.left = x + 'px'; rocket.style.top = y + 'px'; rocket.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(vy, vx) * 180 / Math.PI + 45}deg)`;
      const hit = lanterns.find((l) => { if (l.dataset.used) return false; const r = api.pos(l); return Math.abs(r.x - x) < r.w * 0.55 && Math.abs(r.y - y) < r.h * 0.55; });
      if (hit) { flying = false; rocket.style.opacity = 0; hitLantern(api, hit); return; }
      if (x < -50 || x > api.scene.clientWidth + 50 || y < -80 || y > api.scene.clientHeight + 50) { flying = false; api.praise('Meleset! Coba lagi', false); setTimeout(() => resetRocket(api), 300); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  async function hitLantern(api, l) {
    const r = await api.answer(l.dataset.k, l.querySelector('.kg-token'));
    if (r && r.correct === false) { l.classList.add('burnt'); const p = api.pos(l); const f = api.el(`<i class="fizz" style="left:${p.x}px;top:${p.y}px">💨</i>`); setTimeout(() => f.remove(), 900); setTimeout(() => resetRocket(api), 500); }
  }
  function aimAt(api, l) { // tembakan otomatis ke lampion
    if (flying || api.busy) return;
    const p = pouch(api); const t = api.pos(l); const T = 0.9; const g = api.scene.clientHeight * 0.55;
    const vx = (t.x - p.x) / T; const vy = (t.y - p.y - 0.5 * g * T * T) / T;
    shoot(api, vx, vy);
  }
  function enableSling(api) {
    let id = null; let sx = 0; let sy = 0;
    const zone = api.el('<div class="pullzone"></div>');
    zone.addEventListener('pointerdown', (e) => { if (flying || api.busy || !lanterns.length) return; id = e.pointerId; try { zone.setPointerCapture(id); } catch (x) { /* abaikan */ } const p = pouch(api); sx = p.x; sy = p.y; });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return; const sc = api.scene.getBoundingClientRect();
      let dx = e.clientX - sc.left - sx; let dy = e.clientY - sc.top - sy; const L = Math.hypot(dx, dy); const M = api.scene.clientHeight * 0.2;
      if (L > M) { dx = dx / L * M; dy = dy / L * M; }
      drawBand(api, sx + dx, sy + dy);
      rocket.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(-dy, -dx) * 180 / Math.PI + 45}deg)`;
      const k = 6.2; const g = api.scene.clientHeight * 0.55; let vx = -dx * k; let vy = -dy * k; let x = sx + dx; let y = sy + dy;
      dots.forEach((d, i) => { const t = (i + 1) * 0.07; d.style.left = (x + vx * t) + 'px'; d.style.top = (y + vy * t + 0.5 * g * t * t) + 'px'; d.style.opacity = 0.9 - i * 0.08; });
    });
    const up = (e) => {
      if (e.pointerId !== id) return; id = null;
      const x = parseFloat(rocket.style.left); const y = parseFloat(rocket.style.top); const dx = x - sx; const dy = y - sy;
      dots.forEach((d) => (d.style.opacity = 0));
      if (Math.hypot(dx, dy) < 25) { resetRocket(api); api.hint('🎯 Tarik ke bawah lalu lepas — atau ketuk lampionnya'); return; }
      shoot(api, -dx * 6.2, -dy * 6.2);
    };
    zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
  }
  KidGame({
    gameId: 'sd-kembang-api', level: 'sd', answerMode: 'custom', title: 'Kembang Api Kata', tag: 'Game SD • Kuis Interaktif',
    emoji: '🎆', mascot: '🎯', tagline: 'Tarik ketapel dan tembakkan roket kembang api ke lampion jawaban yang benar!',
    howTo: [['📖', 'Baca soalnya'], ['🎯', 'Tarik ketapel & bidik lampion'], ['🎆', 'Kena yang benar = kembang api!']],
    defaultTarget: 8, winEmoji: '🎇', winTitle: 'PESTA KEMBANG API!', winText: 'Hebat! Semua lampu kota sudah menyala.',
    hooks: {
      build(api) {
        flying = false; cancelAnimationFrame(raf);
        api.el('<div class="night"></div>');
        for (let i = 0; i < 60; i++) api.el(`<i class="star" style="left:${api.rand(1, 99)}%;top:${api.rand(2, 60)}%;animation-delay:${-i * 0.23}s;--s:${(i % 3) + 2}px"></i>`);
        api.el('<div class="moon">🌙</div>');
        const city = api.el('<div class="city"></div>');
        wins = [];
        [24, 34, 20, 40, 28, 18, 30, 22, 38, 26].forEach((h, i) => {
          const b = api.el(`<div class="bld" style="height:${h}vh;--w:${8 + (i % 3)}%"></div>`, city);
          for (let r = 0; r < Math.floor(h / 6); r++) for (let c = 0; c < 2; c++) wins.push(api.el('<i class="win"></i>', b));
        });
        wins.sort(() => Math.random() - 0.5);
        api.el('<div class="ground"></div>');
        sling = api.el('<div class="sling"><i class="fork l"></i><i class="fork r"></i><i class="stick"></i></div>');
        const svg = api.el('<svg class="bands"><path stroke-linecap="round" stroke-linejoin="round"/></svg>'); band = svg.querySelector('path');
        dots = Array.from({ length: 9 }, () => api.el('<i class="dot"></i>'));
        rocket = api.el('<span class="rocket">🚀</span>');
        enableSling(api);
        requestAnimationFrame(() => resetRocket(api));
      },
      present(api, q, order) {
        const n = order.length; resetRocket(api);
        lanterns = order.map((k, i) => {
          const txt = q['option' + k]; const x = 14 + i * (72 / Math.max(1, n - 1)); const y = 34 + (i % 2) * 12;
          const l = api.el(`<button class="lantern" data-k="${k}" style="left:${n === 1 ? 50 : x}%;top:${y}%;--c:${COLORS[i % COLORS.length]};animation-delay:${-i * 0.7}s"><i class="cap"></i><span class="kg-token" style="--c1:${COLORS[i % COLORS.length]};--c2:#7c2d12"></span><i class="tail"></i></button>`);
          l.querySelector('.kg-token').textContent = txt;
          l.onclick = () => aimAt(api, l);
          return l;
        });
        api.hint('🎯 Tarik ketapel ke bawah lalu lepas — atau ketuk lampion untuk menembak');
      },
      async correct(api, { el, progress }) {
        const l = el.closest('.lantern'); l.dataset.used = '1'; const p = api.pos(l);
        firework(api, p.x, p.y, COLORS[progress % COLORS.length]); l.classList.add('boom');
        const per = Math.ceil(wins.length / api.target);
        wins.slice((progress - 1) * per, progress * per).forEach((w, i) => setTimeout(() => w.classList.add('on'), 300 + i * 50));
        await api.sleep(1100);
      },
      reveal(api, k) { lanterns.forEach((l) => l.dataset.k === k && l.querySelector('.kg-token').classList.add('show')); },
      clear(api) { cancelAnimationFrame(raf); flying = false; lanterns.forEach((l) => l.remove()); lanterns = []; if (rocket && api) resetRocket(api); },
      async win(api) {
        wins.forEach((w) => w.classList.add('on'));
        const W = api.scene.clientWidth; const H = api.scene.clientHeight;
        for (let i = 0; i < 7; i++) { firework(api, W * (0.1 + i * 0.13), H * (0.2 + (i % 2) * 0.12), COLORS[i % COLORS.length], true); await api.sleep(260); }
        await api.sleep(900);
      }
    }
  });
})();
