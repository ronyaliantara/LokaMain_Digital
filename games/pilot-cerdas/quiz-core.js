/**
 * ==========================================================================
 * quiz-core.js — Mesin bersama LokaMain Game Kuis
 * - Bank soal (localStorage per game) + soal bawaan
 * - Mode Guru (PIN), tambah/edit/hapus soal
 * - Impor & Ekspor Excel (.xlsx) / CSV / JSON + Template
 * - Layar pengaturan pemain (1–4 pemain), pop-up soal ber-timer,
 *   kartu hukuman, efek suara (tanpa file audio), konfeti
 * Ringan: tanpa framework, hanya SheetJS untuk Excel.
 * ==========================================================================
 */
(function () {
  'use strict';

  const QC = (window.QuizCore = {});
  const LETTERS = ['A', 'B', 'C', 'D'];

  QC.cfg = {
    gameId: 'game',
    title: 'Game Kuis',
    pin: '1234',
    avatars: ['🦊', '🐼', '🐯', '🐸', '🦁', '🐵', '🐧', '🐙'],
    colors: ['#3b82f6', '#ef4444', '#10b981', '#a855f7']
  };

  /* ----------------------------- Utilitas ----------------------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  QC.esc = esc;
  QC.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  QC.shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  QC.pick = (a) => a[(Math.random() * a.length) | 0];
  QC.rand = (min, max) => min + ((Math.random() * (max - min + 1)) | 0);

  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k));
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  const chip = (p) => p ? `<span class="qc-chip" style="--pc:${p.color}">${p.avatar} ${esc(p.name)}</span>` : '';
  QC.chip = chip;

  /* ----------------------- Overlay & keyboard stack ----------------------- */
  const stack = [];
  function overlay(cls, inner) {
    const o = h(`<div class="qc-overlay ${cls || ''}"><div class="qc-card">${inner}</div></div>`);
    document.body.appendChild(o);
    stack.push(o);
    requestAnimationFrame(() => o.classList.add('show'));
    return o;
  }
  function closeOverlay(o) {
    const i = stack.indexOf(o);
    if (i >= 0) stack.splice(i, 1);
    o.classList.remove('show');
    setTimeout(() => o.remove(), 220);
  }
  QC.isBusy = () => stack.length > 0;
  document.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1];
    if (top) { if (top._onKey) top._onKey(e); return; }
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (typeof QC.onKey === 'function') QC.onKey(e);
  });

  /* ------------------------------- Suara ------------------------------- */
  let actx = null;
  QC.muted = store('lokamain_muted') === true;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(f, d = 0.12, type = 'sine', v = 0.12, delay = 0, f2 = null) {
    if (QC.muted) return; const a = ac(); if (!a) return;
    const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d = 0.4, v = 0.2, delay = 0) {
    if (QC.muted) return; const a = ac(); if (!a) return;
    const len = Math.floor(a.sampleRate * d); const buf = a.createBuffer(1, len, a.sampleRate); const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(); s.buffer = buf; const g = a.createGain(); const f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = v;
    s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + delay);
  }
  QC.sfx = {
    click: () => tone(720, 0.05, 'square', 0.04),
    correct: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.08)),
    wrong: () => { tone(300, 0.22, 'sawtooth', 0.08, 0, 150); tone(200, 0.3, 'sawtooth', 0.07, 0.18, 90); },
    tick: () => tone(1400, 0.03, 'square', 0.03),
    win: () => [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.24, 'triangle', 0.14, i * 0.13)),
    coin: () => { tone(988, 0.07, 'square', 0.06); tone(1319, 0.2, 'square', 0.06, 0.07); },
    boom: () => { noise(0.7, 0.4); tone(120, 0.5, 'sine', 0.25, 0, 40); },
    whoosh: () => tone(180, 0.55, 'sawtooth', 0.05, 0, 1300),
    pop: () => tone(480, 0.09, 'sine', 0.13, 0, 950),
    hit: () => { noise(0.15, 0.3); tone(180, 0.15, 'square', 0.1, 0, 60); },
    spin: () => tone(1000, 0.02, 'square', 0.025),
    magic: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, i * 0.06))
  };

  /* ------------------------------ Konfeti ------------------------------ */
  QC.confetti = function (n = 170) {
    const c = document.createElement('canvas'); c.className = 'qc-confetti'; document.body.appendChild(c);
    const ctx = c.getContext('2d'); const W = (c.width = innerWidth); const H = (c.height = innerHeight);
    const cols = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#facc15', '#ffffff'];
    const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.4, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, s: Math.random() * 8 + 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: QC.pick(cols) }));
    let t = 0;
    (function f() {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => { p.vy += 0.33; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (++t < 210) requestAnimationFrame(f); else c.remove();
    })();
  };

  /* --------------------------- Efek animasi (FX) --------------------------- */
  // Partikel emoji, gelombang kejut, kilatan layar, guncangan, teks melayang,
  // banner giliran, kembang api. Semua memakai Web Animations API (ringan, tanpa pustaka).
  const FX = (QC.fx = {});
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function fxLayer() { let l = document.querySelector('.qc-fx'); if (!l) { l = h('<div class="qc-fx"></div>'); document.body.appendChild(l); } return l; }
  FX.center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  FX.burst = function (x, y, { emojis = ['✨', '⭐', '💫'], count = 14, spread = 150, size = 26, dur = 950, gravity = 120, color = null } = {}) {
    if (reduced()) return; const L = fxLayer();
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span'); s.className = 'qc-p'; s.textContent = QC.pick(emojis);
      if (color) s.style.color = Array.isArray(color) ? QC.pick(color) : color;
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.fontSize = size * (0.6 + Math.random() * 0.7) + 'px';
      L.appendChild(s);
      const a = Math.random() * Math.PI * 2; const d = spread * (0.4 + Math.random() * 0.8);
      const dx = Math.cos(a) * d; const dy = Math.sin(a) * d;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${(Math.random() - 0.5) * 360}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + gravity}px)) scale(.6) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 0 }
      ], { duration: dur * (0.8 + Math.random() * 0.4), easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
    }
  };
  FX.burstAt = (el, o) => { if (!el) return; const c = FX.center(el); FX.burst(c.x, c.y, o); };
  FX.ring = function (x, y, color = '#ffffff', size = 220) {
    if (reduced()) return; const r = document.createElement('span'); r.className = 'qc-ring';
    r.style.left = x + 'px'; r.style.top = y + 'px'; r.style.borderColor = color; fxLayer().appendChild(r);
    r.animate([{ width: '0px', height: '0px', opacity: 1, borderWidth: '12px' }, { width: size + 'px', height: size + 'px', opacity: 0, borderWidth: '1px' }], { duration: 650, easing: 'ease-out' }).onfinish = () => r.remove();
  };
  FX.ringAt = (el, color, size) => { if (!el) return; const c = FX.center(el); FX.ring(c.x, c.y, color, size); };
  FX.flash = function (color = 'rgba(255,255,255,.65)', dur = 380) {
    if (reduced()) return; const f = document.createElement('div'); f.className = 'qc-flash'; f.style.background = color; fxLayer().appendChild(f);
    f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-out' }).onfinish = () => f.remove();
  };
  FX.shake = function (el = document.body, power = 10, dur = 500) {
    if (reduced() || !el) return;
    const frames = []; for (let i = 0; i < 7; i++) frames.push({ transform: i === 6 ? 'translate(0,0)' : `translate(${(Math.random() - 0.5) * power * 2}px, ${(Math.random() - 0.5) * power}px) rotate(${(Math.random() - 0.5) * power / 6}deg)` });
    el.animate(frames, { duration: dur });
  };
  FX.floatText = function (x, y, text, color = '#ffffff', size = 34) {
    const t = document.createElement('span'); t.className = 'qc-ftext'; t.textContent = text;
    t.style.left = x + 'px'; t.style.top = y + 'px'; t.style.color = color; t.style.fontSize = size + 'px'; fxLayer().appendChild(t);
    t.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 }], { duration: 1400, easing: 'ease-out' }).onfinish = () => t.remove();
  };
  FX.floatTextAt = (el, text, color, size) => { if (!el) return; const c = FX.center(el); FX.floatText(c.x, c.y, text, color, size); };
  FX.countUp = function (el, from, to, dur = 750, fmt = (v) => v) {
    if (!el) return; if (reduced() || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    (function step(now) { const k = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); })(t0);
  };
  /** Terbangkan emoji dari satu elemen ke elemen lain (koin, poin, dll.) */
  FX.fly = function (fromEl, toEl, emoji = '🪙', count = 5, dur = 750) {
    return new Promise((res) => {
      if (!fromEl || !toEl || reduced()) { res(); return; }
      const a = FX.center(fromEl); const b = FX.center(toEl); const L = fxLayer();
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span'); s.className = 'qc-p'; s.textContent = emoji; s.style.left = a.x + 'px'; s.style.top = a.y + 'px'; s.style.fontSize = '28px'; L.appendChild(s);
        const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 160; const my = Math.min(a.y, b.y) - 80 - Math.random() * 80;
        s.animate([
          { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
          { transform: `translate(calc(-50% + ${mx - a.x}px), calc(-50% + ${my - a.y}px)) scale(1.2)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(.6)`, opacity: 0.9 }
        ], { duration: dur, delay: i * 70, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' }).onfinish = () => { s.remove(); if (i === count - 1) res(); };
      }
    });
  };
  /** Banner besar melintas layar (giliran, kejadian penting). Tidak memblokir klik. */
  FX.announce = function (html, { color = 'var(--qc-accent)', sub = '', dur = 1350 } = {}) {
    return new Promise((res) => {
      const b = h(`<div class="qc-announce" style="--ac:${color}"><div class="qc-ann-band"><div class="qc-ann-main">${html}</div>${sub ? `<div class="qc-ann-sub">${sub}</div>` : ''}</div></div>`);
      fxLayer().appendChild(b);
      if (reduced()) { setTimeout(() => { b.remove(); res(); }, 700); return; }
      b.firstElementChild.animate([
        { transform: 'translateX(-130vw) skewX(-12deg)' }, { transform: 'translateX(3vw) skewX(-12deg)', offset: 0.18 },
        { transform: 'translateX(0) skewX(-12deg)', offset: 0.26 }, { transform: 'translateX(-1vw) skewX(-12deg)', offset: 0.78 },
        { transform: 'translateX(130vw) skewX(-12deg)' }
      ], { duration: dur, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => { b.remove(); res(); };
    });
  };
  FX.fireworks = function (n = 8, gap = 260) {
    for (let i = 0; i < n; i++) setTimeout(() => {
      const x = innerWidth * (0.12 + Math.random() * 0.76); const y = innerHeight * (0.12 + Math.random() * 0.45);
      FX.ring(x, y, QC.pick(['#facc15', '#f472b6', '#38bdf8', '#4ade80', '#fb923c']), 260);
      FX.burst(x, y, { emojis: ['✨', '🎉', '⭐', '🎊', '💥', '🌟'], count: 16, spread: 170 });
      if (i % 2 === 0) QC.sfx.pop();
    }, i * gap);
  };

  /* ------------------------------- Toast ------------------------------- */
  QC.toast = function (msg, type = '') {
    let box = document.querySelector('.qc-toasts');
    if (!box) { box = h('<div class="qc-toasts"></div>'); document.body.appendChild(box); }
    const t = h(`<div class="qc-toast ${type}">${msg}</div>`); box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
  };

  /* ------------------------------- Modal ------------------------------- */
  QC.modal = function ({ icon = '', title = '', html = '', buttons = [{ label: 'OK', value: true, primary: true }], cls = '', onOpen = null, dismissable = false } = {}) {
    return new Promise((res) => {
      const o = overlay('qc-modal ' + cls,
        `${icon ? `<div class="qc-modal-icon">${icon}</div>` : ''}${title ? `<h2 class="qc-title">${title}</h2>` : ''}<div class="qc-modal-body">${html}</div>` +
        (buttons.length ? `<div class="qc-actions">${buttons.map((b, i) => `<button class="qc-btn ${b.primary ? 'primary' : ''} ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>` : ''));
      let closed = false;
      const done = (v) => { if (closed) return; closed = true; if (o._cleanup) o._cleanup(); closeOverlay(o); res(v); };
      o.querySelectorAll('.qc-actions [data-i]').forEach((btn) => (btn.onclick = () => { QC.sfx.click(); done(buttons[+btn.dataset.i].value); }));
      o._onKey = (e) => {
        if (e.key === 'Enter') { const p = buttons.findIndex((b) => b.primary); if (p >= 0) { e.preventDefault(); done(buttons[p].value); } }
        else if (e.key === 'Escape' && dismissable) done(null);
      };
      if (onOpen) onOpen(o, done);
    });
  };

  /* ---------------------- Kartu Hukuman / Tantangan ---------------------- */
  QC.punish = function ({ icon = '⚡', title = 'HUKUMAN!', player = null, sub = '', text = '', seconds = 0, cls = '' } = {}) {
    return QC.modal({
      cls: 'qc-punish ' + cls, icon, title,
      html: `${chip(player)}${sub ? `<p class="qc-punish-sub">${sub}</p>` : ''}<div class="qc-punish-box">${text}</div>` +
        (seconds ? `<div class="qc-countdown"><span class="qc-cd-num">${seconds}</span><button class="qc-btn small" data-cd>▶ Mulai hitung ${seconds} detik</button></div>` : ''),
      buttons: [{ label: '✅ Tantangan Selesai', value: true, primary: true }],
      onOpen(o) {
        const btn = o.querySelector('[data-cd]'); if (!btn) return;
        let iv = null;
        o._cleanup = () => clearInterval(iv);
        btn.onclick = () => {
          btn.disabled = true; let left = seconds; const num = o.querySelector('.qc-cd-num');
          iv = setInterval(() => { left--; num.textContent = Math.max(0, left); QC.sfx.tick(); if (left <= 0) { clearInterval(iv); num.textContent = '🎉'; QC.sfx.correct(); btn.textContent = 'Waktu habis!'; } }, 1000);
        };
      }
    });
  };

  /* ------------------------------ Bank Soal ------------------------------ */
  const KEY = () => `lokamain_${QC.cfg.gameId}_soal_v1`;
  function normalize(q, i) {
    const o = {
      id: q.id || i + 1,
      category: String(q.category || 'Umum'),
      question: String(q.question || ''),
      optionA: String(q.optionA || ''), optionB: String(q.optionB || ''),
      optionC: String(q.optionC || ''), optionD: String(q.optionD || ''),
      correct: String(q.correct || 'A').trim().toUpperCase().charAt(0),
      explanation: String(q.explanation || '')
    };
    if (!LETTERS.includes(o.correct) || !o['option' + o.correct]) o.correct = 'A';
    return o;
  }
  function loadQuestions() {
    const s = store(KEY());
    QC.questions = (Array.isArray(s) && s.length ? s : (window.DEFAULT_QUESTIONS || [])).map(normalize);
  }
  function saveQuestions() { store(KEY(), QC.questions); deck = []; }
  let deck = [];
  QC.nextQuestion = function () {
    if (!QC.questions.length) return null;
    if (!deck.length) deck = QC.shuffle(QC.questions.map((_, i) => i));
    return QC.questions[deck.pop()];
  };
  QC.optionsOf = (q) => LETTERS.filter((k) => q['option' + k] && String(q['option' + k]).trim());

  /* --------------------------- Pop-up Soal Kuis --------------------------- */
  /**
   * Menampilkan soal. Hasil: {correct, choice, timedOut, timeUsed, speed(0..1)}
   */
  QC.ask = function (q, { player = null, time = 0, badge = '' } = {}) {
    return new Promise((res) => {
      if (!q) { QC.toast('⚠️ Bank soal kosong! Buka Mode Guru untuk menambah soal.', 'bad'); res({ correct: false, choice: null, timedOut: false, timeUsed: 0, speed: 0 }); return; }
      const keys = QC.optionsOf(q);
      const o = overlay('qc-ask', `
        <div class="qc-ask-head">${chip(player)}<span class="qc-cat">📚 ${esc(q.category)}</span>${badge ? `<span class="qc-badge">${badge}</span>` : ''}${time ? `<span class="qc-time">⏱ <b>${time}</b></span>` : ''}</div>
        ${time ? '<div class="qc-timebar"><i></i></div>' : ''}
        <div class="qc-question">${esc(q.question)}</div>
        <div class="qc-options n${keys.length}">${keys.map((k, n) => `<button class="qc-opt" style="--i:${n}" data-k="${k}"><b>${k}</b><span>${esc(q['option' + k])}</span></button>`).join('')}</div>
        <div class="qc-feedback" hidden></div>
        <p class="qc-hint">Klik jawaban atau tekan tombol <b>${keys.join(' / ')}</b> (atau 1–${keys.length}) di keyboard</p>`);
      const t0 = performance.now(); let answered = false; let timer = null;
      const bar = o.querySelector('.qc-timebar i'); const num = o.querySelector('.qc-time b');
      if (time) {
        let last = time;
        timer = setInterval(() => {
          const left = Math.max(0, time - (performance.now() - t0) / 1000);
          bar.style.width = (left / time) * 100 + '%';
          const s = Math.ceil(left);
          if (s !== last) { last = s; num.textContent = s; if (s <= 5 && s > 0) { QC.sfx.tick(); o.classList.add('hurry'); } }
          if (left <= 0) answer(null);
        }, 100);
      }
      function answer(k) {
        if (answered) return; answered = true; clearInterval(timer);
        const used = (performance.now() - t0) / 1000; const correct = k === q.correct;
        o.querySelectorAll('.qc-opt').forEach((b) => { b.disabled = true; if (b.dataset.k === q.correct) b.classList.add('right'); else if (b.dataset.k === k) b.classList.add('wrong'); else b.classList.add('dim'); });
        correct ? QC.sfx.correct() : QC.sfx.wrong();
        const card = o.querySelector('.qc-card');
        card.classList.add(correct ? 'is-correct' : 'is-wrong');
        const rightBtn = o.querySelector(`.qc-opt[data-k="${q.correct}"]`);
        if (correct) {
          FX.burstAt(rightBtn, { emojis: ['🎉', '✨', '⭐', '💯', '🌟'], count: 20, spread: 190 });
          FX.ringAt(rightBtn, '#22c55e', 280);
        } else {
          FX.flash('rgba(239,68,68,.35)', 500); FX.shake(card, 12, 450);
          const wb = k && o.querySelector(`.qc-opt[data-k="${k}"]`);
          if (wb) FX.burstAt(wb, { emojis: ['💢', '❌', '💨'], count: 9, spread: 100 });
        }
        const fb = o.querySelector('.qc-feedback'); fb.hidden = false;
        fb.innerHTML = `<div class="qc-fb-title">${correct ? '🎉 BENAR!' : k ? '❌ Kurang Tepat' : '⏰ Waktu Habis!'}</div>` +
          (!correct ? `<div class="qc-fb-key">Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b></div>` : '') +
          (q.explanation ? `<div class="qc-fb-exp">💡 ${esc(q.explanation)}</div>` : '') +
          `<button class="qc-btn primary" data-next>Lanjut ➜</button>`;
        o.querySelector('.qc-hint').hidden = true;
        let fin = false;
        const finish = () => { if (fin) return; fin = true; closeOverlay(o); res({ correct, choice: k, timedOut: !k, timeUsed: used, speed: time ? Math.max(0, 1 - used / time) : 0.5 }); };
        fb.querySelector('[data-next]').onclick = finish;
        o._onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } };
      }
      o.querySelectorAll('.qc-opt').forEach((b) => (b.onclick = () => answer(b.dataset.k)));
      o._onKey = (e) => {
        const map = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }; const k = map[e.key] || e.key.toUpperCase();
        if (keys.includes(k)) { e.preventDefault(); answer(k); }
      };
    });
  };

  /* -------------------------- Pilih target pemain -------------------------- */
  QC.choosePlayer = function ({ title = 'Pilih pemain', icon = '🎯', players = [], sub = '' } = {}) {
    if (players.length === 1) return Promise.resolve(players[0]);
    return QC.modal({
      icon, title, cls: 'qc-choose',
      html: `${sub ? `<p class="qc-muted">${sub}</p>` : ''}<div class="qc-choose-grid">${players.map((p, i) => `<button class="qc-choose-btn" data-p="${i}" style="--pc:${p.color}"><span>${p.avatar}</span>${esc(p.name)}</button>`).join('')}</div>`,
      buttons: [],
      onOpen(o, done) {
        o.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { QC.sfx.click(); done(players[+b.dataset.p]); }));
        o._onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= players.length) done(players[n - 1]); };
      }
    });
  };

  /* ---------------------------- Layar Juara ---------------------------- */
  QC.showWinner = function ({ title = 'JUARA!', ranking = [], unit = '', note = '' } = {}) {
    QC.sfx.win(); QC.confetti(); setTimeout(() => QC.confetti(120), 700); FX.fireworks(10, 300);
    const medals = ['🥇', '🥈', '🥉', '🎖️'];
    return QC.modal({
      cls: 'qc-winner', icon: '🏆', title,
      html: `${note ? `<p class="qc-muted">${note}</p>` : ''}<ol class="qc-rank">${ranking.map((r, i) => `<li style="--pc:${r.player.color};--i:${ranking.length - 1 - i}"><span class="qc-medal">${medals[i] || '⭐'}</span><span class="qc-rank-av">${r.player.avatar}</span><span class="qc-rank-name">${esc(r.player.name)}</span><b>${r.value}${unit ? ' ' + unit : ''}</b></li>`).join('')}</ol>`,
      buttons: [{ label: '⚙️ Ubah Pemain', value: 'setup' }, { label: '🔁 Main Lagi', value: 'again', primary: true }]
    });
  };

  /* --------------------------- Layar Pengaturan --------------------------- */
  /**
   * opt: {logo, subtitle, min, max, defaultCount, avatars, colors, settings:[{key,label,value,options:[[v,label],..]}], rulesHtml}
   * -> Promise<{players, settings}>
   */
  QC.setup = function (opt = {}) {
    return new Promise((res) => {
      const min = opt.min ?? 1; const max = opt.max ?? 4;
      const avatars = opt.avatars || QC.cfg.avatars; const colors = opt.colors || QC.cfg.colors;
      const saved = store(`lokamain_${QC.cfg.gameId}_setup`) || {};
      let count = Math.min(max, Math.max(min, saved.count || opt.defaultCount || 2));
      const players = [0, 1, 2, 3].map((i) => ({
        name: (saved.names && saved.names[i]) || (opt.defaultNames && opt.defaultNames[i]) || `Pemain ${i + 1}`,
        avatar: (saved.av && avatars.includes(saved.av[i]) && saved.av[i]) || avatars[i % avatars.length],
        color: colors[i]
      }));
      const settings = {};
      (opt.settings || []).forEach((s) => { const sv = saved.settings && saved.settings[s.key]; settings[s.key] = sv != null && s.options.some((x) => String(x[0]) === String(sv)) ? sv : s.value; });

      const counts = []; for (let n = min; n <= max; n++) counts.push(n);
      const o = overlay('qc-setup', `
        <div class="qc-setup-logo">${opt.logo || '🎮'}</div>
        <h1 class="qc-setup-title">${esc(QC.cfg.title)}</h1>
        <p class="qc-setup-sub">${opt.subtitle || ''}</p>
        <div class="qc-setup-grid">
          <section class="qc-panel">
            <h3>👥 Jumlah Pemain</h3>
            <div class="qc-seg">${counts.map((n) => `<button data-n="${n}">${n === 1 && opt.soloLabel ? opt.soloLabel : n + ' Pemain'}</button>`).join('')}</div>
            <div class="qc-players"></div>
            <p class="qc-muted small">Klik ikon untuk mengganti avatar • Nama bisa diubah</p>
          </section>
          <section class="qc-panel">
            <h3>⚙️ Atur Permainan</h3>
            <div class="qc-settings">${(opt.settings || []).map((s) => `<label class="qc-set"><span>${s.label}</span><select class="qc-input" data-set="${s.key}">${s.options.map(([v, l]) => `<option value="${v}" ${String(v) === String(settings[s.key]) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`).join('')}</div>
            <details class="qc-rules" open><summary>📜 Cara Main & Hukuman</summary><div>${opt.rulesHtml || ''}</div></details>
          </section>
        </div>
        <div class="qc-actions">
          <button class="qc-btn" data-teacher>🔐 Mode Guru (Kelola Soal)</button>
          <button class="qc-btn primary big" data-start>▶ MULAI MAIN</button>
        </div>
        <p class="qc-muted small qc-bank-info"></p>`);
      const floatPool = [opt.logo || '🎮', ...avatars, '✨', '⭐'];
      o.insertAdjacentHTML('afterbegin', `<div class="qc-floaters">${Array.from({ length: 16 }, (_, i) => `<span style="left:${(i * 6.3 + Math.random() * 4).toFixed(1)}%;animation-duration:${(9 + Math.random() * 9).toFixed(1)}s;animation-delay:-${(Math.random() * 15).toFixed(1)}s;font-size:${(1.4 + Math.random() * 1.6).toFixed(2)}rem">${floatPool[i % floatPool.length]}</span>`).join('')}</div>`);
      const bankInfo = () => { o.querySelector('.qc-bank-info').textContent = `📚 Bank soal aktif: ${QC.questions.length} soal • Tekan Enter untuk mulai`; };
      bankInfo();
      const renderPlayers = () => {
        o.querySelectorAll('.qc-seg button').forEach((b) => b.classList.toggle('on', +b.dataset.n === count));
        o.querySelector('.qc-players').innerHTML = players.slice(0, count).map((p, i) => `
          <div class="qc-prow" style="--pc:${p.color}"><button class="qc-av" data-av="${i}" title="Ganti avatar">${p.avatar}</button>
          <input class="qc-input" data-name="${i}" maxlength="16" value="${esc(p.name)}"><span class="qc-pnum">P${i + 1}</span></div>`).join('');
        o.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => { const p = players[+b.dataset.av]; p.avatar = avatars[(avatars.indexOf(p.avatar) + 1) % avatars.length]; b.textContent = p.avatar; QC.sfx.pop(); }));
        o.querySelectorAll('[data-name]').forEach((inp) => (inp.oninput = () => { players[+inp.dataset.name].name = inp.value; }));
      };
      renderPlayers();
      o.querySelectorAll('.qc-seg button').forEach((b) => (b.onclick = () => { count = +b.dataset.n; QC.sfx.click(); renderPlayers(); }));
      o.querySelectorAll('[data-set]').forEach((s) => (s.onchange = () => { settings[s.dataset.set] = s.value; }));
      o.querySelector('[data-teacher]').onclick = async () => { await QC.openTeacher(); bankInfo(); };
      const start = () => {
        if (!QC.questions.length) { QC.toast('⚠️ Bank soal kosong. Tambahkan soal di Mode Guru.', 'bad'); return; }
        ac();
        const out = {};
        Object.keys(settings).forEach((k) => { const v = settings[k]; out[k] = v !== '' && !isNaN(v) ? Number(v) : v; });
        store(`lokamain_${QC.cfg.gameId}_setup`, { count, names: players.map((p) => p.name), av: players.map((p) => p.avatar), settings: out });
        closeOverlay(o);
        res({ players: players.slice(0, count).map((p, i) => ({ ...p, id: i, name: (p.name || '').trim() || `Pemain ${i + 1}` })), settings: out });
      };
      o.querySelector('[data-start]').onclick = () => { QC.sfx.click(); start(); };
      o._onKey = (e) => { if (e.key === 'Enter' && !/SELECT/.test(e.target.tagName)) { e.preventDefault(); start(); } };
    });
  };

  /* ============================== MODE GURU ============================== */
  function pinPrompt() {
    return QC.modal({
      cls: 'qc-pin', icon: '🔐', title: 'Akses Mode Guru',
      html: `<p class="qc-muted">Masukkan PIN guru untuk mengelola soal (bawaan: <b>${esc(QC.cfg.pin)}</b>)</p><input type="password" class="qc-input qc-pin-input" maxlength="8" inputmode="numeric" placeholder="PIN"><p class="qc-err" hidden>❌ PIN salah, coba lagi.</p>`,
      buttons: [{ label: 'Batal', value: false }, { label: 'Buka 🔓', value: 'check', primary: true }],
      onOpen(o, done) {
        const inp = o.querySelector('input'); setTimeout(() => inp.focus(), 80);
        const btn = o.querySelector('.qc-actions .primary');
        const check = () => { if (inp.value === String(QC.cfg.pin)) done(true); else { o.querySelector('.qc-err').hidden = false; inp.value = ''; inp.focus(); QC.sfx.wrong(); } };
        btn.onclick = check;
        o._onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } else if (e.key === 'Escape') done(false); };
      }
    });
  }

  QC.openTeacher = async function () {
    const ok = await pinPrompt();
    if (ok !== true) return;
    await dashboard();
  };

  function optText(q) {
    return QC.optionsOf(q).map((k) => `<div class="${k === q.correct ? 'ok' : ''}"><b>${k}.</b> ${esc(q['option' + k])}</div>`).join('');
  }

  function dashboard() {
    return new Promise((res) => {
      const o = overlay('qc-teacher', `
        <div class="qc-t-head"><div><h2 class="qc-title">⚙️ Mode Guru • Bank Soal</h2><p class="qc-muted" data-total></p></div><button class="qc-btn" data-close>✕ Tutup</button></div>
        <div class="qc-t-tools">
          <button class="qc-btn primary" data-add>➕ Tambah Soal</button>
          <button class="qc-btn" data-template>📄 Template Excel</button>
          <button class="qc-btn" data-export>📤 Ekspor Excel</button>
          <select class="qc-input" data-mode><option value="replace">Impor: Ganti semua</option><option value="append">Impor: Tambahkan</option></select>
          <button class="qc-btn success" data-import>📥 Impor Excel</button>
          <button class="qc-btn danger" data-reset>🔄 Soal Bawaan</button>
          <input type="file" hidden accept=".xlsx,.xls,.csv,.json" data-file>
        </div>
        <input class="qc-input qc-t-search" data-search placeholder="🔍 Cari soal atau kategori...">
        <div class="qc-t-table"><table><thead><tr><th>No</th><th>Kategori</th><th>Pertanyaan</th><th>Pilihan Jawaban</th><th>Kunci</th><th>Aksi</th></tr></thead><tbody></tbody></table></div>
        <p class="qc-muted small">Format Excel: <b>No | Kategori | Pertanyaan | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Kunci Jawaban (A/B/C/D) | Penjelasan</b> — Pilihan C & D boleh dikosongkan (soal 2 pilihan).</p>`);
      const tbody = o.querySelector('tbody'); const search = o.querySelector('[data-search]');
      const render = () => {
        const term = search.value.trim().toLowerCase();
        o.querySelector('[data-total]').textContent = `Total: ${QC.questions.length} soal • Soal tersimpan otomatis di browser ini`;
        const rows = QC.questions.map((q, i) => ({ q, i })).filter(({ q }) => !term || (q.question + ' ' + q.category).toLowerCase().includes(term));
        tbody.innerHTML = rows.length ? rows.map(({ q, i }) => `<tr><td class="c">${i + 1}</td><td><span class="qc-tag">${esc(q.category)}</span></td><td>${esc(q.question)}</td><td class="qc-t-opts">${optText(q)}</td><td class="c"><b class="qc-key">${q.correct}</b></td><td class="c nowrap"><button class="qc-btn small" data-edit="${i}">✏️</button> <button class="qc-btn small danger" data-del="${i}">🗑️</button></td></tr>`).join('')
          : `<tr><td colspan="6" class="c qc-muted">Tidak ada soal.</td></tr>`;
        tbody.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = async () => { await editForm(+b.dataset.edit); render(); }));
        tbody.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
          const i = +b.dataset.del;
          const yes = await QC.modal({ icon: '🗑️', title: 'Hapus soal ini?', html: `<p class="qc-muted">${esc(QC.questions[i].question)}</p>`, buttons: [{ label: 'Batal', value: false }, { label: 'Hapus', value: true, primary: true, cls: 'danger' }] });
          if (yes) { QC.questions.splice(i, 1); saveQuestions(); render(); QC.toast('🗑️ Soal dihapus'); }
        }));
      };
      search.oninput = render;
      render();
      const close = () => { closeOverlay(o); res(); };
      o.querySelector('[data-close]').onclick = close;
      o._onKey = (e) => { if (e.key === 'Escape') close(); };
      o.querySelector('[data-add]').onclick = async () => { await editForm(-1); render(); };
      o.querySelector('[data-template]').onclick = () => downloadTemplate();
      o.querySelector('[data-export]').onclick = () => { writeBook(toRows(QC.questions), `Bank_Soal_${QC.cfg.gameId}`, 'Bank_Soal'); QC.toast('📤 File bank soal diunduh', 'good'); };
      const file = o.querySelector('[data-file]');
      o.querySelector('[data-import]').onclick = () => file.click();
      file.onchange = async () => {
        const f = file.files[0]; file.value = ''; if (!f) return;
        try {
          const rows = await readFile(f);
          const list = rows.map(rowToQ).filter(Boolean);
          if (!list.length) throw new Error('Tidak ada soal valid. Pastikan ada kolom Pertanyaan, Pilihan A, Pilihan B.');
          const mode = o.querySelector('[data-mode]').value;
          QC.questions = (mode === 'append' ? QC.questions.concat(list) : list).map((q, i) => normalize({ ...q, id: i + 1 }, i));
          saveQuestions(); render();
          QC.toast(`✅ ${list.length} soal berhasil diimpor (${mode === 'append' ? 'ditambahkan' : 'mengganti semua'})`, 'good');
        } catch (err) { QC.modal({ icon: '⚠️', title: 'Impor gagal', html: `<p class="qc-muted">${esc(err.message || err)}</p>` }); }
      };
      o.querySelector('[data-reset]').onclick = async () => {
        const yes = await QC.modal({ icon: '🔄', title: 'Kembalikan soal bawaan?', html: `<p class="qc-muted">Semua soal saat ini akan diganti dengan ${(window.DEFAULT_QUESTIONS || []).length} soal bawaan. Ekspor dulu jika ingin menyimpan.</p>`, buttons: [{ label: 'Batal', value: false }, { label: 'Ya, Reset', value: true, primary: true, cls: 'danger' }] });
        if (yes) { QC.questions = (window.DEFAULT_QUESTIONS || []).map(normalize); saveQuestions(); render(); QC.toast('🔄 Soal bawaan dipulihkan'); }
      };
    });
  }

  function editForm(index) {
    const q = index >= 0 ? QC.questions[index] : { category: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: 'A', explanation: '' };
    return QC.modal({
      cls: 'qc-edit', title: index >= 0 ? `✏️ Edit Soal No. ${index + 1}` : '➕ Tambah Soal Baru',
      html: `<form class="qc-form" onsubmit="return false">
        <label>Kategori / Materi<input class="qc-input" name="category" value="${esc(q.category)}" placeholder="Contoh: Geografi Indonesia"></label>
        <label>Pertanyaan<textarea class="qc-input" name="question" rows="3" placeholder="Tulis pertanyaan...">${esc(q.question)}</textarea></label>
        <div class="qc-form-grid">${LETTERS.map((k) => `<label>Pilihan ${k}${k > 'B' ? ' <i>(opsional)</i>' : ''}<input class="qc-input" name="option${k}" value="${esc(q['option' + k])}"></label>`).join('')}</div>
        <div class="qc-form-key"><span>Kunci jawaban:</span>${LETTERS.map((k) => `<label class="qc-radio"><input type="radio" name="correct" value="${k}" ${q.correct === k ? 'checked' : ''}> ${k}</label>`).join('')}</div>
        <label>Penjelasan (ditampilkan setelah menjawab)<textarea class="qc-input" name="explanation" rows="2">${esc(q.explanation)}</textarea></label>
        <p class="qc-err" hidden></p></form>`,
      buttons: [{ label: 'Batal', value: false }, { label: '💾 Simpan Soal', value: 'save', primary: true }],
      onOpen(o, done) {
        const form = o.querySelector('form'); const err = o.querySelector('.qc-err');
        const save = () => {
          const d = Object.fromEntries(new FormData(form).entries());
          ['category', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'].forEach((k) => (d[k] = (d[k] || '').trim()));
          if (!d.question || !d.optionA || !d.optionB) { err.textContent = 'Pertanyaan, Pilihan A dan Pilihan B wajib diisi.'; err.hidden = false; return; }
          if (!d['option' + d.correct]) { err.textContent = `Pilihan ${d.correct} masih kosong, tidak bisa jadi kunci jawaban.`; err.hidden = false; return; }
          if (d.optionD && !d.optionC) { d.optionC = d.optionD; d.optionD = ''; if (d.correct === 'D') d.correct = 'C'; }
          d.category = d.category || 'Umum';
          if (index >= 0) QC.questions[index] = normalize({ ...d, id: q.id }, index);
          else QC.questions.push(normalize({ ...d, id: QC.questions.length + 1 }, QC.questions.length));
          saveQuestions(); QC.toast('💾 Soal tersimpan', 'good'); done(true);
        };
        o.querySelector('.qc-actions .primary').onclick = save;
        o._onKey = (e) => { if (e.key === 'Escape') done(false); };
      }
    });
  }

  /* ------------------------- Excel / CSV / JSON ------------------------- */
  const HEAD = ['No', 'Kategori', 'Pertanyaan', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Kunci Jawaban (A/B/C/D)', 'Penjelasan'];
  function toRows(list) {
    return list.map((q, i) => ({ 'No': i + 1, 'Kategori': q.category, 'Pertanyaan': q.question, 'Pilihan A': q.optionA, 'Pilihan B': q.optionB, 'Pilihan C': q.optionC || '', 'Pilihan D': q.optionD || '', 'Kunci Jawaban (A/B/C/D)': q.correct, 'Penjelasan': q.explanation || '' }));
  }
  function writeBook(rows, filename, sheetName) {
    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(rows, { header: HEAD });
      ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 60 }, { wch: 30 }, { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 12 }, { wch: 55 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheetName); XLSX.writeFile(wb, filename + '.xlsx');
    } else {
      const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const csv = [HEAD.map(cell).join(';')].concat(rows.map((r) => HEAD.map((k) => cell(r[k])).join(';'))).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = filename + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      QC.toast('ℹ️ Pustaka Excel tidak termuat (offline) — disimpan sebagai CSV, bisa dibuka di Excel.');
    }
  }
  function downloadTemplate() {
    writeBook([
      { 'No': 1, 'Kategori': 'Geografi Indonesia', 'Pertanyaan': 'Indonesia beriklim tropis karena dilalui oleh garis...', 'Pilihan A': 'Khatulistiwa (Ekuator)', 'Pilihan B': 'Bujur Nol Derajat', 'Pilihan C': '', 'Pilihan D': '', 'Kunci Jawaban (A/B/C/D)': 'A', 'Penjelasan': 'Garis khatulistiwa melintasi Indonesia sehingga beriklim tropis.' },
      { 'No': 2, 'Kategori': 'Sejarah', 'Pertanyaan': 'Teks proklamasi kemerdekaan Indonesia dibacakan pada tanggal...', 'Pilihan A': '28 Oktober 1928', 'Pilihan B': '17 Agustus 1945', 'Pilihan C': '20 Mei 1908', 'Pilihan D': '1 Juni 1945', 'Kunci Jawaban (A/B/C/D)': 'B', 'Penjelasan': 'Proklamasi dibacakan 17 Agustus 1945 di Jl. Pegangsaan Timur 56.' },
      { 'No': 3, 'Kategori': 'Ekonomi', 'Pertanyaan': 'Kebutuhan pokok seperti makan, pakaian, dan rumah disebut kebutuhan...', 'Pilihan A': 'Tersier', 'Pilihan B': 'Sekunder', 'Pilihan C': 'Primer', 'Pilihan D': '', 'Kunci Jawaban (A/B/C/D)': 'C', 'Penjelasan': 'Kebutuhan primer adalah kebutuhan dasar untuk bertahan hidup.' }
    ], 'Template_Soal_LokaMain', 'Template_Soal');
    QC.toast('📄 Template diunduh. Isi lalu impor kembali.', 'good');
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = []; let cur = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const head = rows.shift() || [];
    return rows.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] || ''])));
  }
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const name = file.name.toLowerCase(); const r = new FileReader();
      r.onerror = () => reject(new Error('File tidak bisa dibaca.'));
      if (name.endsWith('.json')) {
        r.onload = () => { try { const d = JSON.parse(r.result); resolve(Array.isArray(d) ? d : d.questions || []); } catch (e) { reject(new Error('Format JSON tidak valid.')); } };
        r.readAsText(file);
      } else if (name.endsWith('.csv') && !window.XLSX) {
        r.onload = () => resolve(parseCSV(r.result)); r.readAsText(file);
      } else if (window.XLSX) {
        r.onload = () => { try { const wb = XLSX.read(new Uint8Array(r.result), { type: 'array' }); resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })); } catch (e) { reject(new Error('File Excel tidak terbaca.')); } };
        r.readAsArrayBuffer(file);
      } else reject(new Error('Pustaka Excel belum termuat (butuh internet). Gunakan file .csv atau .json, atau sambungkan internet.'));
    });
  }
  function rowToQ(row) {
    const m = {}; Object.keys(row).forEach((k) => (m[k.toLowerCase().replace(/[^a-z]/g, '')] = row[k]));
    const g = (...ks) => { for (const k of ks) { const v = m[k]; if (v != null && String(v).trim() !== '') return String(v).trim(); } return ''; };
    const kunciKey = Object.keys(m).find((k) => k.startsWith('kunci'));
    const q = {
      category: g('kategori', 'category', 'materi') || 'Umum',
      question: g('pertanyaan', 'question', 'soal', 'pertanyaansoal'),
      optionA: g('pilihana', 'optiona', 'jawabana', 'opsia', 'a'),
      optionB: g('pilihanb', 'optionb', 'jawabanb', 'opsib', 'b'),
      optionC: g('pilihanc', 'optionc', 'jawabanc', 'opsic', 'c'),
      optionD: g('pilihand', 'optiond', 'jawaband', 'opsid', 'd'),
      correct: String((kunciKey && m[kunciKey]) || g('correct', 'jawabanbenar') || 'A').trim().toUpperCase().charAt(0),
      explanation: g('penjelasan', 'explanation', 'pembahasan')
    };
    if (!q.question || !q.optionA || !q.optionB) return null;
    if (q.optionD && !q.optionC) { q.optionC = q.optionD; q.optionD = ''; if (q.correct === 'D') q.correct = 'C'; }
    if (!LETTERS.includes(q.correct) || !q['option' + q.correct]) q.correct = 'A';
    return q;
  }

  /* ------------------------------ Inisialisasi ------------------------------ */
  QC.init = function (cfg = {}) {
    Object.assign(QC.cfg, cfg);
    loadQuestions();
    document.querySelectorAll('[data-qc="sound"]').forEach((b) => {
      const upd = () => (b.innerHTML = QC.muted ? '🔇<span> Suara</span>' : '🔊<span> Suara</span>');
      upd(); b.onclick = () => { QC.muted = !QC.muted; store('lokamain_muted', QC.muted); upd(); QC.sfx.click(); };
    });
    document.querySelectorAll('[data-qc="fullscreen"]').forEach((b) => (b.onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen && document.exitFullscreen();
    }));
    document.querySelectorAll('[data-qc="teacher"]').forEach((b) => (b.onclick = () => QC.openTeacher()));
  };
})();
