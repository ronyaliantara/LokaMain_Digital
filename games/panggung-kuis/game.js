/* ==========================================================================
   Panggung Kuis Juara — KUIS KURSI PANAS BERGILIRAN (1–4 tim)
   - Tiap tim punya TANGGA BINTANG sendiri (8/12/15 tingkat) dengan 2 TITIK AMAN.
   - Giliran: satu tim naik ke kursi panas, menjawab 1 soal di tingkat berikutnya.
     Pilih jawaban → "Jawaban terakhir?" (KUNCI / GANTI) → jeda tegang → hasil.
     Benar = naik 1 tingkat. Salah / waktu habis = turun ke titik aman terakhir.
   - AMANKAN POIN: kunci poin sekarang & keluar dari permainan.
   - Bantuan sekali pakai per tim: 50:50, Tanya Kelas (polling guru), Ganti Soal.
   - Fitur khas: Bintang Kilat (jawab benar sangat cepat), Meteran Sorak
     (penonton makin heboh saat tim beruntun benar → PANGGUNG MEMBARA),
     Soal Puncak (tingkat terakhir dengan suasana khusus).
   - Pemenang: pertama mencapai puncak, atau poin tertinggi setelah semua putaran.
   - 1 tim = Tantangan Solo (salah = tantangan selesai), rekor di localStorage.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmt = (n) => Number(n).toLocaleString('id-ID');
  const GAME_ID = 'panggung-kuis';
  const LOGO = '<svg class="big-logo"><use href="#i-logo"/></svg>';

  QC.init({ gameId: GAME_ID, title: 'Panggung Kuis Juara', avatars: ['🦅', '🐯', '🐬', '🦉', '🦁', '🐺', '🦊', '🐼'], colors: ['#22d3ee', '#f472b6', '#4ade80', '#a78bfa'] });

  const LADDERS = {
    8: { v: [100, 300, 500, 1000, 2000, 3500, 6000, 10000], safe: [3, 6] },
    12: { v: [100, 200, 300, 500, 1000, 1500, 2000, 3000, 4000, 5500, 7500, 10000], safe: [4, 8] },
    15: { v: [100, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3500, 4500, 5500, 7000, 8500, 10000], safe: [5, 10] }
  };
  const TIERS = [
    { name: 'Pemanasan', c: '#2dd4bf' }, { name: 'Menantang', c: '#a78bfa' },
    { name: 'Panas', c: '#fb7185' }, { name: 'Soal Puncak', c: '#fbbf24' }
  ];
  const tierOf = (lvl) => { const N = L.v.length; if (lvl >= N) return TIERS[3]; const f = lvl / N; return f <= 0.34 ? TIERS[0] : f <= 0.67 ? TIERS[1] : TIERS[2]; };
  const LL = {
    fifty: { ico: '50:50', name: '50:50', key: '5' },
    poll: { ico: '👥', name: 'Tanya Kelas', key: 'T' },
    swap: { ico: '🔄', name: 'Ganti Soal', key: 'G' }
  };
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

  /* ============================== SUARA (WebAudio) ============================== */
  const AU = (() => {
    let C = null; let out = null; let nbuf = null; let clap = null;
    function ac() {
      if (QC.muted) return null;
      if (!C) { try { C = new (window.AudioContext || window.webkitAudioContext)(); out = C.createGain(); out.gain.value = 0.85; out.connect(C.destination); } catch (e) { return null; } }
      if (C.state === 'suspended') C.resume();
      return C;
    }
    function noiseBuf() {
      if (!nbuf) { const len = (C.sampleRate * 2) | 0; nbuf = C.createBuffer(1, len, C.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
      return nbuf;
    }
    function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur)); }
    function nz(t, dur, vol, type = 'bandpass', f = 1500, Q = 1, a = 0.002) {
      const s = C.createBufferSource(); s.buffer = noiseBuf(); const fl = C.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q;
      const g = C.createGain(); env(g, t, a, vol, dur); s.connect(fl).connect(g).connect(out);
      s.start(t, Math.random() * Math.max(0, 1.9 - dur), dur + 0.05);
    }
    function os(t, f, dur, vol, type = 'sine', f2 = null, a = 0.006) {
      const o = C.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = C.createGain(); env(g, t, a, vol, dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
    }
    const run = (fn) => { const c = ac(); if (!c) return; try { fn(c.currentTime + 0.01); } catch (e) { /* abaikan */ } };
    const A = {
      // "dum… dum" ketegangan
      dumdum: () => run((t) => { os(t, 92, 0.6, 0.55, 'sine', 40); nz(t, 0.25, 0.22, 'lowpass', 280); os(t + 0.45, 84, 0.8, 0.6, 'sine', 34); nz(t + 0.45, 0.3, 0.25, 'lowpass', 240); }),
      // drum roll snare makin keras
      roll: (dur = 1.6) => run((t) => { for (let x = 0; x < dur; x += 0.04) { const k = x / dur; nz(t + x, 0.06, 0.03 + 0.2 * k * k, 'bandpass', 1800 + 400 * Math.random(), 0.8); if (((x / 0.04) | 0) % 4 === 0) os(t + x, 120, 0.08, 0.05 + 0.1 * k, 'sine', 70); } }),
      crash: () => run((t) => { nz(t, 1.7, 0.3, 'highpass', 4200, 0.6); nz(t, 0.5, 0.25, 'bandpass', 2500, 0.5); os(t, 120, 0.45, 0.45, 'sine', 45); }),
      cheer: (dur = 2.6) => run((t) => {
        nz(t, dur, 0.2, 'bandpass', 1050, 0.55, 0.22); nz(t + 0.05, dur * 0.9, 0.12, 'bandpass', 2300, 0.7, 0.3); nz(t, dur * 0.8, 0.1, 'bandpass', 600, 0.8, 0.2);
        for (let i = 0; i < 4; i++) { const s = t + 0.2 + Math.random() * dur * 0.6; os(s, 1500 + Math.random() * 600, 0.32, 0.035, 'sine', 2600 + Math.random() * 500, 0.03); }
      }),
      applause: (dur = 2.6, vol = 0.5) => run((t) => {
        if (!clap) { // buffer tepuk tangan: ratusan tepukan pendek acak
          const len = (C.sampleRate * 3) | 0; clap = C.createBuffer(1, len, C.sampleRate); const d = clap.getChannelData(0); const cl = (C.sampleRate * 0.014) | 0;
          for (let n = 0; n < 1100; n++) { const p = (Math.pow(Math.random(), 1.4) * (len - cl)) | 0; const amp = 0.25 + Math.random() * 0.6; for (let i = 0; i < cl; i++) d[p + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (cl * 0.22)); }
        }
        const s = C.createBufferSource(); s.buffer = clap; const fl = C.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1700; fl.Q.value = 0.5;
        const g = C.createGain(); env(g, t, 0.12, vol, dur); s.connect(fl).connect(g).connect(out); s.start(t, 0, Math.min(3, dur + 0.1));
      }),
      // "ooooh" penonton kecewa: beberapa suara bergeser turun, difilter seperti vokal "o"
      ooh: () => run((t) => {
        for (let i = 0; i < 7; i++) {
          const f0 = 170 + Math.random() * 110; const o = C.createOscillator(); o.type = 'sawtooth';
          o.frequency.setValueAtTime(f0 * 1.06, t); o.frequency.linearRampToValueAtTime(f0, t + 0.3); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + 1.6);
          const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480 + Math.random() * 80; bp.Q.value = 3.2;
          const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000;
          const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055, t + 0.28); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
          o.connect(bp).connect(lp).connect(g).connect(out); o.start(t + Math.random() * 0.06); o.stop(t + 1.8);
        }
      }),
      heart: () => run((t) => { os(t, 62, 0.16, 0.5, 'sine', 40); os(t + 0.19, 56, 0.2, 0.42, 'sine', 36); }),
      ping: (i) => run((t) => { os(t, 440 * Math.pow(1.25, i), 0.22, 0.09, 'triangle'); os(t, 880 * Math.pow(1.25, i), 0.12, 0.03, 'sine'); }),
      stinger: () => run((t) => { [220, 261.6, 311.1].forEach((f, i) => os(t + i * 0.05, f, 1.1, 0.07, 'sawtooth', f * 0.98, 0.02)); os(t, 55, 1.2, 0.35, 'sine', 40); }),
      rise: () => run((t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => os(t + i * 0.07, f, 0.25, 0.08, 'triangle')); }),
      fall: () => run((t) => { os(t, 520, 0.7, 0.1, 'sawtooth', 110); os(t + 0.1, 390, 0.7, 0.07, 'square', 90); }),
      safe: () => run((t) => { [784, 988, 1175, 1568, 1976].forEach((f, i) => os(t + i * 0.06, f, 0.5, 0.07, 'sine')); os(t, 196, 0.8, 0.12, 'triangle'); }),
      fanfare: () => run((t) => { [[392, 0], [523, 0.16], [659, 0.32], [784, 0.48], [659, 0.72], [784, 0.86], [1047, 1.0]].forEach(([f, d]) => { os(t + d, f, 0.42, 0.1, 'sawtooth', null, 0.01); os(t + d, f / 2, 0.42, 0.08, 'triangle'); }); })
    };
    /* Musik latar tegang ringan (ostinato bas + hi-hat + pad), hanya saat soal tampil */
    const BASS = [110, 0, 110, 0, 116.5, 0, 110, 0, 110, 0, 110, 0, 130.8, 0, 123.5, 0];
    const M = { on: store(`lokamain_${GAME_ID}_musik`) !== false, iv: null, next: 0, step: 0, fast: false };
    M.start = () => {
      if (M.iv || !M.on || QC.muted) return; const c = ac(); if (!c) return;
      M.next = c.currentTime + 0.08; M.step = 0;
      M.iv = setInterval(() => {
        if (QC.muted || !M.on || !C) { M.stop(); return; }
        const spb = 60 / (M.fast ? 138 : 104) / 2;
        while (M.next < C.currentTime + 0.22) {
          const t = M.next; const s = M.step; const f = BASS[s % 16];
          try {
            if (f) { os(t, f, 0.2, 0.11, 'triangle'); os(t, f * 2, 0.08, 0.02, 'square'); }
            if (s % 2 === 1) nz(t, 0.03, 0.025, 'highpass', 7000, 0.7);
            if (s % 16 === 0) [220, 261.6, 329.6].forEach((pf) => os(t, pf * (s % 32 === 0 ? 1 : 0.944), 3.4, 0.022, 'sine', null, 0.6));
            if (M.fast && s % 4 === 0) os(t, 1760, 0.04, 0.02, 'square');
          } catch (e) { /* abaikan */ }
          M.next += spb; M.step++;
        }
      }, 50);
    };
    M.stop = () => { clearInterval(M.iv); M.iv = null; M.fast = false; };
    A.music = M;
    A.unlock = () => ac();
    return A;
  })();
  document.addEventListener('pointerdown', () => AU.unlock(), { once: true });

  /* ============================== STATUS ============================== */
  let S = { levels: 12, rounds: 10, timer: 30, secure: 'on', help: 'on' };
  let L = LADDERS[12];
  let T = []; let solo = false; let round = 1; let turn = -1; let phase = 'idle'; let gen = 0; let asked = 0;
  let q = null; let keys = []; let sel = null; let removed = []; let pollRes = null;
  let tTotal = 0; let tLeft = 0; let timerIv = null; let lastSec = -1; let tPrev = 0; let usedT = 0;
  let energy = 0.12; let pendingFinish = '';

  const pts = (t) => (t.level ? L.v[t.level - 1] : 0);
  const safeOf = (lvl) => L.safe.filter((s) => s <= lvl).reduce((a, b) => Math.max(a, b), 0);
  const isActive = (t) => !t.secured && !t.top && !t.out;
  const cur = () => T[turn];

  /* ============================== TAMPILAN DOM ============================== */
  function setTier(lvl) {
    const tr = tierOf(lvl); document.documentElement.style.setProperty('--tier', tr.c);
    if (V.tier !== tr.c) { V.tier = tr.c; V.tierRGB = hex(tr.c); bgDirty = true; }
    return tr;
  }
  function led(main, sub = '') {
    const l = $('led'); $('ledMain').innerHTML = main; $('ledSub').innerHTML = sub;
    l.classList.remove('flash'); void l.offsetWidth; l.classList.add('flash');
  }
  function retrigger(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  function buildTeams() {
    const box = $('teams'); box.style.setProperty('--n', T.length);
    box.innerHTML = T.map((t, i) => `<div class="team" id="tm${i}" style="--pc:${t.color}">
      <span class="tag" id="tg${i}">KURSI PANAS</span>
      <span class="av">${t.avatar}</span>
      <span class="nm">${esc(t.name)}</span>
      <span class="pts"><b id="tp${i}">0</b><small>⭐ BINTANG</small></span>
      <span class="sub" id="ts${i}"></span></div>`).join('');
  }
  function updateTeams() {
    T.forEach((t, i) => {
      const c = $('tm' + i); if (!c) return;
      c.classList.toggle('active', i === turn && phase !== 'over' && isActive(t));
      c.classList.toggle('out', !isActive(t) && !t.top);
      c.classList.toggle('top', t.top);
      $('tg' + i).textContent = t.top ? 'PUNCAK 👑' : t.secured ? 'AMAN 🔒' : t.out ? 'SELESAI' : 'KURSI PANAS';
      const ll = S.help === 'on' ? Object.keys(LL).map((k) => `<i class="${t.ll[k] ? '' : 'used'}">${k === 'fifty' ? '½' : LL[k].ico}</i>`).join('') : '';
      $('ts' + i).innerHTML = `<span>Tk ${t.level}/${L.v.length}</span>${ll ? '<span>·</span>' + ll : ''}${t.kilat ? `<span>· ⚡${t.kilat}</span>` : ''}`;
    });
  }
  function setPoints(i, from, to) { FX.countUp($('tp' + i), from, to, 900, fmt); }

  function renderLadder(moved = -1) {
    const N = L.v.length; const old = moved >= 0 && $('mk' + moved) ? $('mk' + moved).getBoundingClientRect() : null;
    const rows = [];
    for (let lv = N; lv >= 0; lv--) {
      const safe = L.safe.includes(lv); const tr = tierOf(lv);
      const here = T.map((t, i) => ({ t, i })).filter((o) => o.t.level === lv);
      const now = phase !== 'over' && turn >= 0 && cur() && isActive(cur()) && cur().level + 1 === lv;
      rows.push(`<li class="ld-row ${lv === 0 ? 'start' : ''} ${safe ? 'safe' : ''} ${lv === N ? 'top' : ''} ${now ? 'now' : ''}" style="--tc:${tr.c};${now ? `--pc:${cur().color}` : ''}">
        <span class="n">${lv || '●'}</span><span class="v">${lv ? '⭐ ' + fmt(L.v[lv - 1]) : 'MULAI'}</span>
        <span class="mk">${here.map((o) => `<span class="mkr ${o.t.secured ? 'lockd' : ''}" id="mk${o.i}" style="--pc:${o.t.color}" title="${esc(o.t.name)}">${o.t.avatar}</span>`).join('')}</span></li>`);
    }
    $('ldRows').innerHTML = rows.join('');
    $('ldInfo').textContent = `${N} tingkat • titik aman: ${L.safe.join(' & ')}`;
    if (old && $('mk' + moved)) {
      const el = $('mk' + moved); const nw = el.getBoundingClientRect();
      el.style.setProperty('--dy', `${old.top - nw.top}px`); retrigger(el, 'move');
    }
  }

  function renderLifelines() {
    const box = $('lifelines');
    if (S.help !== 'on') { box.innerHTML = ''; return; }
    box.innerHTML = Object.keys(LL).map((k) => `<button class="ll" data-ll="${k}" title="${LL[k].name} (tombol ${LL[k].key})">${k === 'fifty' ? '50:50' : `<span class="ico">${LL[k].ico}</span>`}<small>${k === 'fifty' ? 'Hapus' : LL[k].name}</small></button>`).join('');
    box.querySelectorAll('[data-ll]').forEach((b) => (b.onclick = () => useLL(b.dataset.ll)));
    updateLL();
  }
  function updateLL() {
    const t = cur();
    document.querySelectorAll('.ll').forEach((b) => {
      const k = b.dataset.ll; const has = !!(t && t.ll[k]);
      const can = k !== 'fifty' || keys.filter((x) => !removed.includes(x)).length > 2; // soal 2 pilihan: 50:50 tidak berlaku
      b.classList.toggle('used', !!t && !has);
      b.disabled = !(phase === 'question' && has && can);
    });
    const sb = $('btnSecure');
    sb.hidden = S.secure !== 'on' || !t;
    if (t) { $('secVal').textContent = `⭐ ${fmt(pts(t))}`; sb.disabled = !(phase === 'question' && t.level > 0); }
  }
  function hintHTML() {
    const h = S.help === 'on' ? ` • Bantuan: <b>5</b> 50:50 · <b>T</b> Tanya Kelas · <b>G</b> Ganti Soal` : '';
    const s = S.secure === 'on' ? ' · <b>S</b> Amankan' : '';
    return `<span class="hint">Sentuh jawaban atau tekan <b>${keys.join(' ')}</b> / <b>1–${keys.length}</b>${h}${s}</span>`;
  }
  function setMid(html) { $('actMid').innerHTML = html; }
  function updRound() {
    $('roundNo').textContent = solo ? `Soal ${asked || 1}` : `${Math.min(round, S.rounds)} / ${S.rounds}`;
    $('turnName').textContent = turn >= 0 && cur() ? `${cur().avatar} ${cur().name}` : '–';
  }

  /* ------------------------------ Jam lingkaran ------------------------------ */
  function setClock(left, total) {
    const c = $('clock'); const num = $('cNum'); const ring = $('cRing');
    if (!total) { num.textContent = '∞'; ring.style.strokeDashoffset = 0; c.classList.remove('mid', 'hurry'); return; }
    const f = clamp(left / total, 0, 1); ring.style.strokeDashoffset = 326.7 * (1 - f);
    num.textContent = Math.max(0, Math.ceil(left));
    c.classList.toggle('mid', f <= 0.5 && left > 5); c.classList.toggle('hurry', left <= 5 && left > 0 && phase === 'question');
  }
  function startTimer(total) {
    stopTimer(); tTotal = total; tLeft = total; lastSec = -1; tPrev = performance.now(); usedT = 0;
    setClock(tLeft, tTotal);
    timerIv = setInterval(() => {
      const now = performance.now(); const dt = (now - tPrev) / 1000; tPrev = now;
      const paused = phase !== 'question' || QC.isBusy();
      $('clock').classList.toggle('paused', paused && phase === 'question');
      if (paused) return;
      usedT += dt;
      if (!tTotal) return;
      tLeft -= dt; setClock(tLeft, tTotal);
      const s = Math.ceil(tLeft);
      if (s !== lastSec) {
        lastSec = s;
        if (s <= 10 && s > 0) AU.music.fast = true;
        if (s <= 5 && s > 0) { QC.sfx.tick(); AU.heart(); }
      }
      if (tLeft <= 0) timeUp();
    }, 100);
  }
  function stopTimer() { clearInterval(timerIv); timerIv = null; $('clock').classList.remove('hurry', 'paused'); }

  /* ============================== ALUR PERMAINAN ============================== */
  const RULES_SHORT = `<ul>
    <li>Tim bergiliran naik ke <b>KURSI PANAS</b> dan menjawab 1 soal di <b>tingkat berikutnya</b> pada tangga bintangnya sendiri.</li>
    <li>Pilih jawaban → <b>"Jawaban terakhir?"</b> → <b>KUNCI</b> atau <b>GANTI</b>. Benar = <b>naik 1 tingkat</b>. Salah / waktu habis = <b>turun ke titik aman</b> (emas).</li>
    <li>Bantuan sekali pakai: <b>50:50</b>, <b>Tanya Kelas</b> (polling), <b>Ganti Soal</b>. <b>AMANKAN POIN</b> = kunci poin & berhenti.</li>
    <li>Juara: pertama sampai <b>PUNCAK</b>, atau poin tertinggi setelah semua putaran. 1 tim = <b>Tantangan Solo</b> (salah = selesai, kejar rekor!).</li></ul>`;

  async function openSetup() {
    gen++; phase = 'idle'; stopTimer(); AU.music.stop(); drawOn = true;
    const pr = QC.setup({
      logo: LOGO, subtitle: 'Naik ke kursi panas, kunci jawabanmu, dan daki tangga bintang sampai puncak!',
      min: 1, max: 4, defaultCount: 3, soloLabel: '1 Tim (Solo)',
      defaultNames: ['Tim Elang', 'Tim Harimau', 'Tim Lumba', 'Tim Hantu'],
      settings: [
        { key: 'levels', label: '🪜 Tingkat tangga', value: 12, options: [[8, '8 tingkat (singkat)'], [12, '12 tingkat'], [15, '15 tingkat (panjang)']] },
        { key: 'rounds', label: '🔁 Putaran (mode tim)', value: 10, options: [[3, '3 putaran'], [5, '5 putaran'], [8, '8 putaran'], [10, '10 putaran'], [12, '12 putaran'], [15, '15 putaran']] },
        { key: 'timer', label: '⏱️ Waktu per soal', value: 30, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik'], [60, '60 detik'], [0, 'Tanpa batas']] },
        { key: 'secure', label: '🔒 Amankan Poin', value: 'on', options: [['on', 'Aktif'], ['off', 'Nonaktif']] },
        { key: 'help', label: '🛟 Bantuan 50:50 • Kelas • Ganti', value: 'on', options: [['on', 'Aktif'], ['off', 'Nonaktif']] }
      ],
      rulesHtml: RULES_SHORT
    });
    const r = await pr;
    S = { ...S, ...r.settings };
    L = LADDERS[S.levels] || LADDERS[12];
    T = r.players.map((p) => ({ ...p }));
    solo = T.length === 1;
    newGame();
  }

  async function newGame() {
    gen++; const g = gen; stopTimer(); AU.music.stop(); drawOn = true; pendingFinish = '';
    T.forEach((t) => Object.assign(t, { level: 0, secured: false, top: false, out: false, ll: { fifty: true, poll: true, swap: true }, correct: 0, wrong: 0, streak: 0, kilat: 0, time: 0 }));
    round = 1; turn = -1; asked = 0; q = null; keys = []; sel = null; energy = 0.12; phase = 'intro';
    setTier(1); buildTeams(); updateTeams(); renderLadder(); renderLifelines(); updRound(); setMeter();
    $('answers').innerHTML = placeholders(); $('qText').classList.remove('rev'); $('qText').innerHTML = '<span class="big">SELAMAT DATANG!</span><span class="small">Lampu panggung menyala… para tim bersiap.</span>';
    setMeta(1); setMid(''); setClock(S.timer, S.timer);
    const rec = store(`lokamain_${GAME_ID}_rekor`);
    led('PANGGUNG KUIS JUARA', solo ? `Tantangan Solo • Rekor: ⭐ ${fmt(rec ? rec.pts : 0)}${rec ? ' (' + esc(rec.name) + ')' : ''}` : `${T.length} tim siap tampil • ${L.v.length} tingkat • ${S.rounds} putaran`);
    V.mode = 'sweep'; V.seat = null; AU.stinger(); setTimeout(() => AU.applause(2.2, 0.35), 300);
    document.querySelectorAll('.team').forEach((c, i) => c.animate([{ transform: 'translateY(-40px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: 300 + i * 160, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'backwards' }));
    T.forEach((t, i) => setTimeout(() => { if (g === gen) QC.sfx.pop(); }, 300 + i * 160));
    await Promise.race([FX.announce('PANGGUNG KUIS JUARA', { color: '#e11d74', sub: solo ? 'Tantangan Solo — kejar rekor bintang!' : 'Siapa yang sampai ke puncak tangga bintang?', dur: 1700 }), QC.sleep(1900)]);
    if (g !== gen) return;
    nextTurn();
  }
  function placeholders(n = 4) { return Array.from({ length: n }, (_, i) => `<button class="ans" disabled style="--i:${i}"><span class="k">${'ABCD'[i]}</span><span class="t" style="opacity:.35">? ? ?</span></button>`).join(''); }
  function setMeta(lvl) {
    const tr = setTier(lvl); const N = L.v.length;
    $('qLvl').textContent = `TINGKAT ${Math.min(lvl, N)}/${N}`; $('qTier').textContent = tr.name; $('qWorth').textContent = `⭐ ${fmt(L.v[Math.min(lvl, N) - 1])}`;
    return tr;
  }

  function nextTurn() {
    if (phase === 'over') return;
    if (pendingFinish) { finish(pendingFinish); return; }
    const act = T.map((t, i) => i).filter((i) => isActive(T[i]));
    if (!act.length) { finish(solo ? 'Tantangan solo selesai.' : 'Semua tim sudah mengamankan poin.'); return; }
    let nxt = act.find((i) => i > turn);
    if (nxt === undefined) { nxt = act[0]; round++; if (!solo && round > S.rounds) { finish(`Semua ${S.rounds} putaran selesai!`); return; } }
    turn = nxt; startTurn();
  }

  function startTurn() {
    const t = cur(); const g = gen; const lvl = t.level + 1; const N = L.v.length;
    phase = 'ready'; sel = null; removed = []; pollRes = null; q = null; keys = [];
    const tr = setMeta(lvl);
    updateTeams(); renderLadder(); updRound(); updateLL(); setClock(S.timer, S.timer);
    V.mode = 'focus'; V.seat = t; V.cheer = 0;
    $('answers').className = 'answers'; $('answers').innerHTML = placeholders();
    const qt = $('qText'); qt.classList.remove('rev'); qt.innerHTML = `<span class="big">${t.avatar} ${esc(t.name)}</span><span class="small">silakan duduk di KURSI PANAS — soal tingkat ${lvl} bernilai ⭐ ${fmt(L.v[lvl - 1])}</span>`; retrigger(qt, 'in');
    setMid(`<button class="big-btn go" id="btnShow">▶ TAMPILKAN SOAL<small>Spasi / Enter</small></button>`);
    $('btnShow').onclick = () => showQuestion();
    if (lvl === N) {
      led('SOAL PUNCAK!', `${t.avatar} ${esc(t.name)} • satu langkah lagi menuju ⭐ ${fmt(L.v[N - 1])}`);
      AU.heart(); setTimeout(() => g === gen && AU.heart(), 700); AU.dumdum();
      FX.announce('SOAL PUNCAK!', { color: '#d97706', sub: `${esc(t.name)} bisa menjadi juara!`, dur: 1500 });
    } else {
      led(`PERTANYAAN UNTUK ${esc(t.name.toUpperCase())}!`, `Tingkat ${lvl} • ⭐ ${fmt(L.v[lvl - 1])} • ${tr.name}${L.safe.includes(lvl) ? ' • TITIK AMAN' : ''}`);
      AU.stinger();
    }
  }

  function showQuestion() {
    if (phase !== 'ready') return;
    q = QC.nextQuestion();
    if (!q) { QC.toast('⚠️ Bank soal kosong — tambahkan soal di Mode Guru.', 'bad'); return; }
    asked++; updRound();
    phase = 'showing'; const g = gen; QC.sfx.whoosh();
    renderQuestion(false);
    const n = keys.length;
    keys.forEach((k, i) => setTimeout(() => { if (g === gen) AU.ping(i); }, 100 + i * 260));
    setTimeout(() => {
      if (g !== gen || phase !== 'showing') return;
      phase = 'question'; setMid(hintHTML()); updateLL(); startTimer(S.timer); AU.music.start();
    }, 100 + n * 260 + 250);
  }
  function renderQuestion(swapped) {
    keys = QC.optionsOf(q); sel = null; removed = []; pollRes = null;
    const qt = $('qText'); qt.classList.remove('rev'); qt.textContent = q.question; retrigger(qt, 'in');
    const a = $('answers'); a.className = `answers n${keys.length}`;
    a.innerHTML = keys.map((k, n) => `<button class="ans" data-k="${k}" style="--i:${swapped ? 0 : n}"><span class="k">${k}</span><span class="t">${esc(q['option' + k])}</span></button>`).join('');
    a.querySelectorAll('.ans').forEach((b) => (b.onclick = () => select(b.dataset.k)));
    const t = cur(); led(`${esc(t.name.toUpperCase())} DI KURSI PANAS`, `Tingkat ${t.level + 1} • ⭐ ${fmt(L.v[t.level])} • jawab dengan tenang…`);
  }

  function ansEl(k) { return document.querySelector(`.ans[data-k="${k}"]`); }
  function select(k) {
    if (phase !== 'question' || !keys.includes(k) || removed.includes(k) || QC.isBusy()) return;
    sel = k; QC.sfx.click(); AU.ping(keys.indexOf(k) + 1);
    document.querySelectorAll('.ans[data-k]').forEach((b) => b.classList.toggle('sel', b.dataset.k === k));
    setMid(`<div class="confirm"><span class="q">JAWABAN TERAKHIR?</span>
      <button class="big-btn lock" id="btnLock">🔒 KUNCI<small>Enter</small></button>
      <button class="big-btn change" id="btnChange">↺ GANTI<small>Esc</small></button></div>`);
    $('btnLock').onclick = () => lockAnswer(); $('btnChange').onclick = () => cancelSel();
    led(`JAWABAN ${k}?`, `${esc(cur().name)}, yakin dengan jawaban ini?`);
  }
  function cancelSel() {
    if (phase !== 'question' || !sel) return;
    sel = null; QC.sfx.pop(); document.querySelectorAll('.ans.sel').forEach((b) => b.classList.remove('sel'));
    setMid(hintHTML()); led(`${esc(cur().name.toUpperCase())} DI KURSI PANAS`, 'Silakan pilih lagi…');
  }

  async function lockAnswer() {
    if (phase !== 'question' || !sel || QC.isBusy()) return;
    phase = 'locked'; const g = gen; const k = sel; const t = cur();
    const used = usedT; stopTimer(); AU.music.stop(); updateLL();
    t.time += used;
    const el = ansEl(k); el.classList.add('locked');
    document.querySelectorAll('.ans').forEach((b) => (b.disabled = true));
    setMid(`<div class="confirm"><span class="q">🔒 JAWABAN ${k} DIKUNCI…</span></div>`);
    led('JAWABAN DIKUNCI', 'Lampu meredup… penonton menahan napas');
    $('stage').classList.add('dim'); V.dimT = 0.72; V.mode = 'tension';
    AU.dumdum(); setTimeout(() => g === gen && AU.roll(1.45), 550);
    await QC.sleep(2050); if (g !== gen) return;
    reveal(k, used);
  }
  async function timeUp() {
    if (phase !== 'question') return;
    phase = 'locked'; const g = gen; stopTimer(); AU.music.stop(); updateLL(); cur().time += usedT;
    document.querySelectorAll('.ans').forEach((b) => (b.disabled = true)); setClock(0, tTotal || 1);
    setMid(`<div class="confirm"><span class="q">⏰ WAKTU HABIS!</span></div>`); led('WAKTU HABIS!', 'Jam panggung berhenti…');
    QC.sfx.wrong(); $('stage').classList.add('dim'); V.dimT = 0.6; AU.dumdum();
    await QC.sleep(1100); if (g !== gen) return;
    reveal(null, usedT);
  }

  function reveal(k, used) {
    phase = 'reveal'; const t = cur(); const i = turn; const correct = k === q.correct;
    $('stage').classList.remove('dim'); V.dimT = 0; AU.crash();
    const right = ansEl(q.correct);
    document.querySelectorAll('.ans[data-k]').forEach((b) => { b.classList.remove('sel', 'locked'); b.disabled = true; if (b.dataset.k === q.correct) b.classList.add('right'); else if (b.dataset.k === k) b.classList.add('wrong'); else b.classList.add('dim'); });
    const from = t.level; const fromPts = pts(t); const N = L.v.length;
    const ansTxt = `<b>${q.correct}. ${esc(q['option' + q.correct])}</b>`;
    showExplanation();
    let head = '';
    if (correct) {
      t.level++; t.correct++; t.streak++;
      const fast = S.timer && used <= tTotal / 3;
      if (fast) t.kilat++;
      energy = clamp(energy + 0.24 + (fast ? 0.1 : 0), 0, 1);
      QC.sfx.correct(); AU.cheer(2.6); AU.applause(2.8, 0.55); setTimeout(() => AU.rise(), 250);
      V.mode = 'gold'; V.cheer = 3.2; V.flash = 1; V.flashC = '34,197,94'; burst(70, ['#fde68a', '#fbbf24', '#22c55e', '#ffffff', t.color]);
      FX.ringAt(right, '#22c55e', 300); FX.burstAt(right, { emojis: ['⭐', '✨', '🌟'], count: 16, spread: 170 });
      retrigger($('tm' + i), 'gain'); setPoints(i, fromPts, pts(t));
      stageFloat(`+⭐ ${fmt(pts(t) - fromPts)}`, '#fde68a', 36, 0);
      if (fast) setTimeout(() => stageFloat('⚡ BINTANG KILAT!', '#fde047', 34, 40), 500);
      const reachedSafe = L.safe.includes(t.level);
      if (t.level >= N) {
        t.top = true; pendingFinish = `${t.name} mencapai PUNCAK tangga bintang!`;
        head = `<b class="ok">👑 PUNCAK! ${esc(t.name)} meraih ⭐ ${fmt(pts(t))}!</b>`;
        led('PUNCAK TERCAPAI!', `${t.avatar} ${esc(t.name)} • ⭐ ${fmt(pts(t))}`);
        setTimeout(() => { AU.fanfare(); FX.fireworks(6, 220); }, 500);
      } else {
        head = `<b class="ok">✅ BENAR!</b> Naik ke tingkat ${t.level} (⭐ ${fmt(pts(t))})${fast ? ' • ⚡ Bintang Kilat!' : ''}`;
        led(t.streak >= 3 ? 'PANGGUNG MEMBARA! 🔥' : 'BENAR!', `${esc(t.name)} naik ke ⭐ ${fmt(pts(t))}${reachedSafe ? ' • TITIK AMAN TERCAPAI!' : ''}`);
        if (reachedSafe) setTimeout(() => { AU.safe(); FX.announce('TITIK AMAN!', { color: '#d97706', sub: `⭐ ${fmt(pts(t))} milik ${esc(t.name)} terkunci`, dur: 1300 }); }, 700);
      }
    } else {
      const to = safeOf(t.level); t.level = to; t.wrong++; t.streak = 0;
      energy = clamp(energy - 0.3, 0.05, 1);
      QC.sfx.wrong(); AU.ooh(); setTimeout(() => AU.applause(1.6, 0.22), 1300); if (to < from) setTimeout(() => AU.fall(), 300);
      V.mode = 'red'; V.cheer = 0; V.flash = 1; V.flashC = '239,68,68';
      FX.flash('rgba(239,68,68,.28)', 500); FX.shake($('answers'), 8, 420);
      retrigger($('tm' + i), 'loss'); setPoints(i, fromPts, pts(t));
      if (pts(t) < fromPts) stageFloat(`−⭐ ${fmt(fromPts - pts(t))}`, '#fca5a5', 34, 0);
      const drop = to < from ? `Turun ke ${to ? 'titik aman tingkat ' + to + ' (⭐ ' + fmt(pts(t)) + ')' : 'MULAI (⭐ 0)'}.` : to ? `Tetap di titik aman tingkat ${to} (⭐ ${fmt(pts(t))}).` : 'Masih di MULAI.';
      head = `<b class="bad">${k ? '❌ KURANG TEPAT!' : '⏰ WAKTU HABIS!'}</b> Jawaban benar: ${ansTxt}. ${drop}`;
      led(k ? 'OOOH… KURANG TEPAT' : 'WAKTU HABIS!', `Jawaban benar: ${q.correct} • ${esc(t.name)} ${to < from ? 'turun ke ⭐ ' + fmt(pts(t)) : 'tetap di ⭐ ' + fmt(pts(t))}`);
      if (solo) { t.out = true; pendingFinish = `Tantangan solo berakhir di ⭐ ${fmt(pts(t))}.`; }
    }
    renderLadder(i); updateTeams(); updateLL(); setMeter();
    showResult(head);
  }
  // Pembahasan tampil di kotak soal (di bawah pertanyaan) agar terbaca utuh
  function showExplanation() {
    const qt = $('qText'); qt.classList.add('rev');
    qt.innerHTML = `<span class="qq">${esc(q.question)}</span>${q.explanation ? `<span class="qexp">💡 <b>Pembahasan:</b> ${esc(q.explanation)}</span>` : ''}`;
  }
  // Teks melayang dari kursi panas (tengah panggung), tidak menimpa header
  function stageFloat(text, color, size, dy) {
    const r = $('led').getBoundingClientRect(); const s = $('scene').getBoundingClientRect();
    FX.floatText(r.left + r.width / 2, Math.min(s.bottom - 20, r.bottom + 50) + dy, text, color, size);
  }
  function showResult(html) {
    const last = !!pendingFinish || (!solo && isLastTurnOfGame());
    setMid(`<div class="result">${html}</div><button class="big-btn go" id="btnNext">${last ? '🏆 LIHAT JUARA' : 'LANJUT ▶'}<small>Spasi / Enter</small></button>`);
    $('btnNext').onclick = () => goNext();
  }
  function isLastTurnOfGame() {
    const act = T.map((t, i) => i).filter((i) => isActive(T[i]));
    if (!act.length) return true;
    return round >= S.rounds && act.every((i) => i <= turn);
  }
  function goNext() { if (phase !== 'reveal' || QC.isBusy()) return; QC.sfx.click(); nextTurn(); }

  /* ------------------------------ Amankan poin ------------------------------ */
  async function securePoints() {
    const t = cur();
    if (phase !== 'question' || S.secure !== 'on' || !t || !t.level || QC.isBusy()) return;
    const ok = await QC.modal({
      icon: '🔒', title: 'AMANKAN POIN?',
      html: `${QC.chip(t)}<p class="qc-muted" style="margin-top:10px">${esc(t.name)} berhenti sekarang dan mengunci <b style="color:#fde68a">⭐ ${fmt(pts(t))}</b>.<br>Tim ini tidak bermain lagi di putaran berikutnya.</p>`,
      buttons: [{ label: 'Batal, lanjut menjawab', value: false }, { label: '🔒 Amankan', value: true, primary: true }]
    });
    if (!ok || phase !== 'question') return;
    phase = 'reveal'; stopTimer(); AU.music.stop(); t.secured = true; t.time += usedT;
    document.querySelectorAll('.ans[data-k]').forEach((b) => { b.disabled = true; b.classList.remove('sel'); b.classList.add(b.dataset.k === q.correct ? 'right' : 'dim'); });
    QC.sfx.coin(); AU.safe(); AU.applause(2.6, 0.5); V.mode = 'gold'; V.cheer = 1.6; burst(40, ['#fde68a', '#fbbf24', '#ffffff']);
    FX.burstAt($('tm' + turn), { emojis: ['⭐', '🔒', '✨'], count: 14, spread: 140 });
    led(`${esc(t.name.toUpperCase())} MENGAMANKAN POIN!`, `⭐ ${fmt(pts(t))} terkunci aman`);
    if (solo) pendingFinish = `Tantangan solo diamankan di ⭐ ${fmt(pts(t))}.`;
    renderLadder(); updateTeams(); updateLL();
    showExplanation();
    showResult(`<b class="ok">🔒 ⭐ ${fmt(pts(t))} DIAMANKAN!</b> Jawaban yang benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>.`);
  }

  /* ------------------------------ Bantuan ------------------------------ */
  function useLL(name) {
    const t = cur();
    if (phase !== 'question' || S.help !== 'on' || !t || !t.ll[name] || QC.isBusy()) return;
    if (name === 'fifty') fifty(); else if (name === 'poll') openPoll(); else if (name === 'swap') swapQ();
  }
  function fifty() {
    const t = cur(); const left = keys.filter((k) => !removed.includes(k));
    if (left.length <= 2) { QC.toast('ℹ️ Soal ini hanya punya 2 pilihan — 50:50 tidak bisa dipakai.', 'bad'); return; }
    t.ll.fifty = false; const n = left.length >= 4 ? 2 : 1;
    const wrongs = QC.shuffle(left.filter((k) => k !== q.correct)).slice(0, n);
    removed.push(...wrongs); if (wrongs.includes(sel)) cancelSel();
    QC.sfx.magic(); QC.sfx.whoosh();
    wrongs.forEach((k, j) => setTimeout(() => { const b = ansEl(k); if (b) { b.classList.add('gone'); b.disabled = true; FX.burstAt(b, { emojis: ['✖', '💨'], count: 8, spread: 80 }); } }, j * 220));
    led('BANTUAN 50:50!', `${n} jawaban salah dihapus`); updateLL(); updateTeams();
  }
  function swapQ() {
    const t = cur(); const nq = QC.nextQuestion(); if (!nq) return;
    t.ll.swap = false; QC.sfx.whoosh(); retrigger($('qbox'), 'swap'); FX.floatTextAt($('qbox'), 'SOAL DIGANTI!', '#c4b5fd', 34);
    updateLL(); updateTeams();
    setTimeout(() => { if (phase !== 'question') return; q = nq; renderQuestion(true); setMid(hintHTML()); startTimer(S.timer); led('GANTI SOAL!', `Soal baru untuk ${esc(t.name)} • waktu diulang`); }, 300);
  }
  function openPoll() {
    const t = cur(); t.ll.poll = false; updateLL(); updateTeams();
    QC.sfx.magic(); led('TANYA KELAS!', 'Seluruh kelas ikut membantu');
    const avail = keys.filter((k) => !removed.includes(k)); const cnt = {}; avail.forEach((k) => (cnt[k] = 0));
    let shown = false;
    QC.modal({
      cls: 'pk-poll', icon: '📊', title: 'TANYA KELAS',
      html: `<p class="poll-q">${esc(q.question)}</p>
        <p class="qc-muted small">Guru: tanyakan ke seluruh kelas, lalu ketuk <b>+</b> / <b>−</b> (atau ketuk kolom / tekan <b>${avail.join(' ')}</b>) sesuai jumlah siswa yang memilih. Waktu dijeda.</p>
        <div class="poll-grid" style="--k:${avail.length}">${avail.map((k) => `<div class="pcol" data-k="${k}"><div class="pbar" data-bar="${k}"><b>0</b><i></i><em>0%</em></div>
          <div class="plabel"><span class="k">${k}</span><span>${esc(q['option' + k])}</span></div>
          <div class="pbtns"><button data-m="${k}" aria-label="Kurangi ${k}">−</button><button class="plus" data-p="${k}" aria-label="Tambah ${k}">+</button></div></div>`).join('')}</div>
        <div class="poll-total">Total suara: <b data-total>0</b></div>
        <div class="qc-actions"><button class="qc-btn primary big" data-show>📊 TAMPILKAN HASIL <small>Enter</small></button></div>`,
      buttons: [],
      onOpen(o, done) {
        const tot = () => avail.reduce((s, k) => s + cnt[k], 0);
        const upd = () => {
          const all = tot(); const mx = Math.max(1, ...avail.map((k) => cnt[k]));
          avail.forEach((k) => {
            const col = o.querySelector(`.pcol[data-k="${k}"]`); const pct = all ? Math.round((cnt[k] * 100) / all) : 0;
            col.querySelector('b').textContent = shown ? pct + '%' : cnt[k]; col.querySelector('em').textContent = `${cnt[k]} suara`;
            col.querySelector('i').style.height = `calc((100% - 50px) * ${shown ? pct / 100 : (cnt[k] / mx) * 0.8})`;
          });
          o.querySelector('[data-total]').textContent = all;
        };
        const add = (k, d) => { if (shown || !(k in cnt)) return; cnt[k] = Math.max(0, cnt[k] + d); if (d > 0) QC.sfx.pop(); else QC.sfx.click(); upd(); };
        o.__add = add;
        o.querySelectorAll('[data-p]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); add(b.dataset.p, 1); }));
        o.querySelectorAll('[data-m]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); add(b.dataset.m, -1); }));
        o.querySelectorAll('[data-bar]').forEach((b) => (b.onclick = () => add(b.dataset.bar, 1)));
        const btn = o.querySelector('[data-show]');
        const act = () => {
          if (!shown) {
            const all = tot(); if (!all) { QC.toast('⚠️ Masukkan jumlah suara dulu.', 'bad'); return; }
            shown = true; o.classList.add('done'); AU.roll(0.7); setTimeout(() => { QC.sfx.magic(); AU.applause(1.4, 0.3); }, 700);
            const mx = Math.max(...avail.map((k) => cnt[k])); avail.forEach((k) => o.querySelector(`.pcol[data-k="${k}"]`).classList.toggle('best', cnt[k] === mx));
            upd(); btn.innerHTML = '✔ KEMBALI KE SOAL <small>Enter</small>';
          } else {
            const all = tot(); const res = {}; avail.forEach((k) => (res[k] = Math.round((cnt[k] * 100) / all))); done(res);
          }
        };
        btn.onclick = act;
        o._onKey = (e) => {
          const m = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }; const k = m[e.key] || e.key.toUpperCase();
          if (k in cnt) { e.preventDefault(); add(k, e.shiftKey ? -1 : 1); } else if (e.key === 'Enter') { e.preventDefault(); act(); }
        };
        upd();
      }
    }).then((res) => {
      pollRes = res || null; if (!pollRes) return;
      Object.keys(pollRes).forEach((k) => { const b = ansEl(k); if (b && !b.querySelector('.poll')) b.insertAdjacentHTML('beforeend', `<span class="poll">👥 ${pollRes[k]}%</span>`); });
      led('HASIL TANYA KELAS', Object.keys(pollRes).map((k) => `${k}: ${pollRes[k]}%`).join(' • '));
    });
  }

  /* ------------------------------ Meteran sorak ------------------------------ */
  function setMeter() {
    $('mFill').style.height = `${8 + energy * 92}%`;
    const hot = T.some((t) => t.streak >= 3) || energy > 0.85;
    $('meter').classList.toggle('hot', hot); $('mLabel').innerHTML = hot ? 'MEMBARA<br>🔥' : 'SORAK';
    V.hot = hot;
  }

  /* ------------------------------ Juara ------------------------------ */
  async function finish(reason) {
    if (phase === 'over') return;
    phase = 'over'; stopTimer(); AU.music.stop(); const g = gen; pendingFinish = '';
    const ranking = [...T].sort((a, b) => pts(b) - pts(a) || b.level - a.level || b.correct - a.correct || b.kilat - a.kilat || a.time - b.time);
    const w = ranking[0]; const wi = T.indexOf(w);
    turn = wi; updateTeams(); renderLadder(); updRound();
    $('btnSecure').hidden = true; document.querySelectorAll('.ll').forEach((b) => (b.disabled = true));
    V.seat = w; V.mode = 'tension'; V.dimT = 0.5; setMid(''); led('DAN JUARANYA ADALAH…', 'drum roll…');
    $('qText').classList.remove('rev'); $('qText').innerHTML = '<span class="big">PENGUMUMAN JUARA</span><span class="small">' + esc(reason) + '</span>';
    AU.roll(1.7);
    await QC.sleep(1900); if (g !== gen) return;
    V.dimT = 0; V.mode = 'gold'; V.cheer = 6; V.rain = 4; AU.crash(); AU.fanfare(); AU.cheer(3); AU.applause(3, 0.6);
    burst(120, ['#fde68a', '#fbbf24', '#f472b6', '#22d3ee', '#ffffff', w.color]);
    led(`${w.avatar} ${esc(w.name.toUpperCase())}`, solo ? 'Tantangan solo selesai!' : 'JUARA PANGGUNG KUIS!');
    retrigger($('tm' + wi), 'gain');
    let note = `${reason} `;
    if (solo) {
      const key = `lokamain_${GAME_ID}_rekor`; const rec = store(key);
      if (!rec || pts(w) > rec.pts) { store(key, { pts: pts(w), name: w.name, lvl: w.level, date: Date.now() }); note += pts(w) > 0 ? '🎉 REKOR BARU! ' : ''; }
      else note += `Rekor: ⭐ ${fmt(rec.pts)} (${rec.name}). `;
    }
    note += `${asked} soal dimainkan.`;
    await Promise.race([FX.announce(`${esc(w.name)} JUARA!`, { color: w.color, sub: `⭐ ${fmt(pts(w))}`, dur: 1600 }), QC.sleep(1800)]);
    if (g !== gen) return;
    drawOn = false; // hemat: berhenti menggambar panggung saat layar juara
    const r = await QC.showWinner({
      title: solo ? (w.top ? '👑 TANTANGAN TUNTAS!' : `${w.avatar} ${esc(w.name)}`) : `${w.avatar} ${esc(w.name)} JUARA!`, note,
      ranking: ranking.map((t) => ({ player: t, value: `⭐ ${fmt(pts(t))}${t.kilat ? ' · ⚡' + t.kilat : ''}` }))
    });
    drawOn = true;
    if (g !== gen) return;
    if (r === 'setup') openSetup(); else newGame();
  }

  /* ============================== PANGGUNG (Canvas 2D) ============================== */
  const stage = $('stage'); const cv = $('cv'); const ctx = cv.getContext('2d');
  let W = 0; let H = 0; let DPR = 1; const G = {}; let bgCan = null; let seatCan = null; let crowd = []; let avCache = {}; let bgDirty = true; let needResize = true;
  let drawOn = true; let parts = []; let lastNow = performance.now(); let msAvg = 0; let frames = 0;
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const V = { tier: '#2dd4bf', tierRGB: [45, 212, 191], mode: 'sweep', dim: 0, dimT: 0, flash: 0, flashC: '255,255,255', cheer: 0, rain: 0, seat: null, hot: false, t: 0 };
  const LAMPS = [0.1, 0.3, 0.7, 0.9];
  const spots = LAMPS.map((x, i) => ({ x0: x, tx: 0.5, c: [255, 255, 255], ph: i * 1.7 }));

  function mkCan(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR)); const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, x]; }
  function resize() {
    needResize = false;
    const r = stage.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(200, r.height);
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const sr = $('scene').getBoundingClientRect(); const lr = $('led').getBoundingClientRect();
    G.top = sr.top - r.top; G.bot = sr.bottom - r.top; G.ledB = lr.bottom - r.top; G.cx = W / 2;
    G.gap = Math.max(46, G.bot - G.ledB);
    G.seatH = clamp(G.gap * 0.92, 44, 280); G.seatW = G.seatH * 0.72;
    G.floorY = G.bot - Math.min(14, G.gap * 0.08); G.floorRx = W * 0.47; G.floorRy = clamp(G.gap * 0.36, 18, 120);
    G.crowdH = clamp(G.gap * 0.42, 26, 120);
    bgDirty = true; buildSeat(); buildCrowd(); avCache = {};
  }
  function buildBg() {
    bgDirty = false; const [c, x] = mkCan(W, H); bgCan = c; const [r, g, b] = V.tierRGB;
    let gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#07031a'); gr.addColorStop(0.5, '#160838'); gr.addColorStop(1, '#0a0420');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    gr = x.createRadialGradient(G.cx, G.ledB, 0, G.cx, G.ledB, W * 0.6); gr.addColorStop(0, `rgba(${r},${g},${b},.22)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    // panel dinding belakang
    for (let i = 0; i < 16; i++) { const px = (i + 0.5) * (W / 16); const pg = x.createLinearGradient(0, 0, 0, G.floorY); pg.addColorStop(0, 'rgba(255,255,255,.035)'); pg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = pg; x.fillRect(px - W / 40, 0, W / 20, G.floorY); }
    // tirai kiri-kanan
    [[0, 1], [W, -1]].forEach(([ex, s]) => {
      const cw = W * 0.075;
      for (let k = 0; k < 4; k++) {
        const x0 = ex + s * k * cw * 0.25; const cg = x.createLinearGradient(x0, 0, x0 + s * cw * 0.3, 0);
        cg.addColorStop(0, '#5b0b3a'); cg.addColorStop(0.5, '#a3135f'); cg.addColorStop(1, '#3d0626');
        x.fillStyle = cg; x.beginPath(); x.moveTo(x0, 0); x.lineTo(x0 + s * cw * 0.3, 0);
        x.quadraticCurveTo(x0 + s * cw * (0.55 - k * 0.08), G.floorY * 0.6, x0 + s * cw * (0.22 + k * 0.05), G.floorY); x.lineTo(x0, G.floorY); x.closePath(); x.fill();
      }
    });
    // rangka lampu (truss) atas & samping
    x.strokeStyle = '#3b2a6b'; x.lineWidth = 2;
    const tr = (x1, y1, x2, y2, n, w) => { x.beginPath(); const dx = (x2 - x1) / n; const dy = (y2 - y1) / n; const nx = y2 - y1 ? w : 0; const ny = x2 - x1 ? w : 0; x.moveTo(x1, y1); x.lineTo(x2, y2); x.moveTo(x1 + nx, y1 + ny); x.lineTo(x2 + nx, y2 + ny); for (let i = 0; i < n; i++) { x.moveTo(x1 + dx * i, y1 + dy * i); x.lineTo(x1 + dx * (i + 1) + nx, y1 + dy * (i + 1) + ny); } x.stroke(); };
    tr(W * 0.06, 8, W * 0.94, 8, 40, 10);
    tr(W * 0.085, 18, W * 0.085, G.floorY, 18, 10); tr(W * 0.905, 18, W * 0.905, G.floorY, 18, 10);
    LAMPS.forEach((lx) => { x.fillStyle = '#1e1442'; x.beginPath(); x.roundRect ? x.roundRect(lx * W - 11, 10, 22, 16, 4) : x.rect(lx * W - 11, 10, 22, 16); x.fill(); x.strokeStyle = '#5b4a9b'; x.lineWidth = 1.5; x.stroke(); });
    // lantai panggung mengilap
    const fy = G.floorY - G.floorRy;
    gr = x.createLinearGradient(0, fy, 0, H); gr.addColorStop(0, '#1d0d48'); gr.addColorStop(0.3, '#120632'); gr.addColorStop(1, '#07031a');
    x.fillStyle = gr; x.fillRect(0, fy, W, H - fy);
    x.strokeStyle = 'rgba(196,181,253,.07)'; x.lineWidth = 1;
    for (let i = 1; i < 7; i++) { const yy = fy + i * i * 5; if (yy > H) break; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
    // pantulan layar LED di lantai
    gr = x.createLinearGradient(0, fy, 0, fy + G.floorRy * 2.4); gr.addColorStop(0, `rgba(${r},${g},${b},.16)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(G.cx - W * 0.28, fy, W * 0.56, G.floorRy * 2.4);
    // panggung bundar
    gr = x.createRadialGradient(G.cx, G.floorY, 0, G.cx, G.floorY, G.floorRx); gr.addColorStop(0, '#3a1f7a'); gr.addColorStop(0.55, '#21104f'); gr.addColorStop(1, 'rgba(18,8,46,0)');
    x.fillStyle = gr; x.beginPath(); x.ellipse(G.cx, G.floorY, G.floorRx, G.floorRy, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.ellipse(G.cx - G.floorRx * 0.15, G.floorY - G.floorRy * 0.35, G.floorRx * 0.5, G.floorRy * 0.18, 0, 0, Math.PI * 2); x.fill();
  }
  function buildSeat() {
    const w = G.seatW; const h = G.seatH; const [c, x] = mkCan(w, h); seatCan = c;
    const cx = w / 2;
    // kaki & alas
    let gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#6b7280'); gr.addColorStop(0.5, '#f1f5f9'); gr.addColorStop(1, '#4b5563');
    x.fillStyle = gr; x.beginPath(); x.ellipse(cx, h - h * 0.05, w * 0.36, h * 0.045, 0, 0, Math.PI * 2); x.fill();
    x.fillRect(cx - w * 0.04, h * 0.58, w * 0.08, h * 0.38);
    // dudukan
    gr = x.createLinearGradient(0, h * 0.5, 0, h * 0.62); gr.addColorStop(0, '#f0abfc'); gr.addColorStop(1, '#86198f');
    x.fillStyle = gr; x.beginPath(); x.ellipse(cx, h * 0.56, w * 0.44, h * 0.065, 0, 0, Math.PI * 2); x.fill();
    // sandaran tinggi melengkung
    gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#4c1d95'); gr.addColorStop(0.45, '#8b5cf6'); gr.addColorStop(1, '#3b0764');
    x.fillStyle = gr; x.beginPath(); x.moveTo(cx - w * 0.38, h * 0.54); x.quadraticCurveTo(cx - w * 0.46, h * 0.1, cx, h * 0.03); x.quadraticCurveTo(cx + w * 0.46, h * 0.1, cx + w * 0.38, h * 0.54); x.closePath(); x.fill();
    x.strokeStyle = '#fbbf24'; x.lineWidth = Math.max(1.5, w * 0.025); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = Math.max(1, w * 0.02); x.beginPath(); x.moveTo(cx - w * 0.26, h * 0.45); x.quadraticCurveTo(cx - w * 0.3, h * 0.16, cx - w * 0.05, h * 0.1); x.stroke();
  }
  function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function buildCrowd() {
    crowd = []; const aisle = G.seatW * 0.85; const h = G.crowdH * 1.6;
    const sides = [[0, G.cx - aisle], [G.cx + aisle, W]];
    let seed = 7;
    sides.forEach(([a, b]) => {
      const segs = 3; const sw = (b - a) / segs;
      for (let s = 0; s < segs; s++) {
        const rand = seeded(seed++ * 9973); const people = [];
        const hr = G.crowdH * 0.24;
        for (let row = 0; row < 2; row++) {
          const rr = hr * (row ? 1 : 0.82); let px = rand() * rr;
          while (px < sw) { people.push({ x: px, r: rr * (0.85 + rand() * 0.3), row, arm: rand() < 0.6, stick: rand() < 0.35 ? ['#f472b6', '#22d3ee', '#fde047', '#4ade80'][(rand() * 4) | 0] : null }); px += rr * (2.3 + rand() * 0.8); }
        }
        const mk = (cheer) => {
          const [c, x] = mkCan(sw, h);
          people.sort((p, q2) => p.row - q2.row).forEach((p) => {
            const base = h - (p.row ? 0 : G.crowdH * 0.32); const hy = base - p.r * 2.6;
            x.fillStyle = p.row ? '#06020f' : '#150b32';
            if (cheer && p.arm) {
              x.strokeStyle = x.fillStyle; x.lineCap = 'round'; x.lineWidth = p.r * 0.55;
              x.beginPath(); x.moveTo(p.x - p.r, hy + p.r * 1.6); x.lineTo(p.x - p.r * 1.5, hy - p.r * 1.3); x.moveTo(p.x + p.r, hy + p.r * 1.6); x.lineTo(p.x + p.r * 1.5, hy - p.r * 1.3); x.stroke();
              if (p.stick) { x.strokeStyle = p.stick; x.lineWidth = Math.max(2, p.r * 0.3); x.beginPath(); x.moveTo(p.x + p.r * 1.5, hy - p.r * 1.3); x.lineTo(p.x + p.r * 1.9, hy - p.r * 2.4); x.stroke(); }
            }
            x.fillStyle = p.row ? '#06020f' : '#150b32';
            x.beginPath(); x.ellipse(p.x, base, p.r * 1.35, p.r * 1.25, 0, Math.PI, 0); x.fill();
            x.fillRect(p.x - p.r * 1.35, base - 0.5, p.r * 2.7, h - base + 1);
            x.beginPath(); x.arc(p.x, hy + p.r * 0.2, p.r, 0, Math.PI * 2); x.fill();
            x.strokeStyle = 'rgba(196,181,253,.38)'; x.lineWidth = 1.4; x.beginPath(); x.arc(p.x, hy + p.r * 0.2, p.r, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
          });
          return c;
        };
        crowd.push({ x: a + s * sw, w: sw, h, n: mk(false), c: mk(true), ph: rand() * 6 });
      }
    });
  }
  function avatarCan(t) {
    const key = t.avatar; if (avCache[key]) return avCache[key];
    const s = Math.round(G.seatH * 0.4); const [c, x] = mkCan(s, s); x.font = `${s * 0.8}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t.avatar, s / 2, s / 2 + s * 0.05);
    avCache[key] = c; return c;
  }
  function burst(n, cols) {
    const x0 = G.cx; const y0 = G.floorY - G.seatH * 0.6;
    for (let i = 0; i < n; i++) { const a = rnd(-Math.PI, 0); const v = rnd(150, 520); parts.push({ x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: rnd(-8, 8), s: rnd(4, 9), c: cols[(Math.random() * cols.length) | 0], life: rnd(1.6, 2.6), g: 420 }); }
    if (parts.length > 360) parts.splice(0, parts.length - 360);
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  function update(dt) {
    V.t += dt; const t = V.t;
    V.dim = lerp(V.dim, V.dimT, Math.min(1, dt * 4)); V.flash = Math.max(0, V.flash - dt * 1.6); V.cheer = Math.max(0, V.cheer - dt);
    if (V.rain > 0) { V.rain -= dt; if (Math.random() < 0.7) parts.push({ x: rnd(0, W), y: -10, vx: rnd(-30, 30), vy: rnd(60, 140), r: Math.random() * 6, vr: rnd(-6, 6), s: rnd(4, 8), c: ['#fde68a', '#fbbf24', '#f472b6', '#22d3ee', '#ffffff'][(Math.random() * 5) | 0], life: 3.5, g: 40 }); }
    const gold = V.mode === 'gold'; const red = V.mode === 'red';
    spots.forEach((s, i) => {
      let tx; let col;
      if (V.mode === 'sweep') { tx = 0.5 + Math.sin(t * 0.55 + s.ph) * 0.4; col = [[232, 121, 249], [34, 211, 238], [251, 191, 36], [167, 139, 250]][i]; }
      else if (gold) { tx = 0.5 + Math.sin(t * 2.4 + s.ph) * 0.3; col = [253, 230, 138]; }
      else if (red) { tx = 0.5 + Math.sin(t * 0.8 + s.ph) * 0.12; col = [248, 113, 113]; }
      else if (V.mode === 'tension') { tx = 0.5 + Math.sin(t * 0.4 + s.ph) * 0.04; col = [255, 255, 255]; }
      else { tx = 0.5 + Math.sin(t * 0.7 + s.ph) * 0.1; col = V.hot ? [253, 186, 116] : V.tierRGB.map((v) => (v + 255) / 2); }
      const k = Math.min(1, dt * (gold ? 6 : 2.5)); s.tx = lerp(s.tx, tx, k); s.c = s.c.map((v, j) => lerp(v, col[j], Math.min(1, dt * 3)));
    });
    for (const p of parts) { p.life -= dt; p.vy += p.g * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; }
    parts = parts.filter((p) => p.life > 0 && p.y < H + 20);
  }
  function draw() {
    if (bgDirty || !bgCan) buildBg();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgCan, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const t = V.t; const [tr, tg, tb] = V.tierRGB;
    // lampu bohlam berkejaran di rangka
    const chase = Math.floor(t * 7);
    for (let i = 0; i < 14; i++) {
      const on = (i + chase) % 3 === 0; const y = 30 + i * ((G.floorY - 40) / 14);
      ctx.fillStyle = on ? (V.hot ? '#fdba74' : '#fde68a') : 'rgba(253,230,138,.18)';
      ctx.fillRect(W * 0.085 + 2, y, 6, 4); ctx.fillRect(W * 0.905 + 2, y, 6, 4);
    }
    // lampu sorot menyapu (aditif)
    ctx.globalCompositeOperation = 'lighter';
    const spotA = (V.mode === 'tension' ? 0.1 : 0.2) * (1 - V.dim * 0.8);
    spots.forEach((s) => {
      const x0 = s.x0 * W; const y0 = 26; const tx = s.tx * W; const ty = G.floorY; const w = W * (V.mode === 'sweep' ? 0.055 : 0.045);
      const c = `${s.c[0] | 0},${s.c[1] | 0},${s.c[2] | 0}`;
      const gr = ctx.createLinearGradient(x0, y0, tx, ty); gr.addColorStop(0, `rgba(${c},${spotA * 1.6})`); gr.addColorStop(1, `rgba(${c},${spotA * 0.35})`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 - 4, y0); ctx.lineTo(x0 + 4, y0); ctx.lineTo(tx + w, ty); ctx.lineTo(tx - w, ty); ctx.closePath(); ctx.fill();
      const pg = ctx.createRadialGradient(tx, ty, 0, tx, ty, w * 1.6); pg.addColorStop(0, `rgba(${c},${spotA * 1.4})`); pg.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(tx, ty, w * 1.6, Math.min(G.floorRy, w * 0.5), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${c},.9)`; ctx.beginPath(); ctx.arc(x0, y0 - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    // cincin cahaya panggung
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(${tr},${tg},${tb},${(0.12 + 0.18 * pulse) * (1 - i * 0.28)})`; ctx.beginPath(); ctx.ellipse(G.cx, G.floorY, G.floorRx * (0.32 + i * 0.22), G.floorRy * (0.32 + i * 0.22), 0, 0, Math.PI * 2); ctx.stroke(); }
    // lampu meredup (jeda tegang)
    if (V.dim > 0.01) { ctx.fillStyle = `rgba(3,1,10,${V.dim})`; ctx.fillRect(0, 0, W, H); }
    // kursi panas + tim
    const sx = G.cx - G.seatW / 2; const sy = G.floorY - G.seatH;
    const seatC = V.seat ? hex(V.seat.color) : [167, 139, 250];
    const gl = ctx.createRadialGradient(G.cx, G.floorY, 0, G.cx, G.floorY, G.seatW * 1.3); gl.addColorStop(0, `rgba(${seatC.join(',')},${0.45 + 0.2 * pulse})`); gl.addColorStop(1, `rgba(${seatC.join(',')},0)`);
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(G.cx, G.floorY, G.seatW * 1.3, G.floorRy * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    if (V.mode === 'tension' || V.dim > 0.2) {
      ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createLinearGradient(G.cx, 0, G.cx, G.floorY); cg.addColorStop(0, 'rgba(255,255,255,.02)'); cg.addColorStop(1, `rgba(255,250,235,${0.22 * Math.min(1, V.dim + 0.3)})`);
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(G.cx - 6, 0); ctx.lineTo(G.cx + 6, 0); ctx.lineTo(G.cx + G.seatW * 0.8, G.floorY); ctx.lineTo(G.cx - G.seatW * 0.8, G.floorY); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(seatCan, sx, sy, G.seatW, G.seatH);
    if (V.seat) {
      const a = avatarCan(V.seat); const s = G.seatH * 0.4; const bob = Math.sin(t * 2.2) * 2 - (V.cheer > 0 ? Math.abs(Math.sin(t * 9)) * 6 : 0);
      ctx.drawImage(a, G.cx - s / 2, sy + G.seatH * 0.12 + bob, s, s);
    }
    // penonton siluet
    const ch = V.cheer > 0; const amp = ch ? 4 + Math.min(1, V.cheer) * 6 : 1.4;
    for (const c of crowd) { const bob = -Math.abs(Math.sin(t * (ch ? 8 : 1.6) + c.ph)) * amp; ctx.drawImage(ch ? c.c : c.n, c.x, G.bot - c.h + 6 + bob, c.w, c.h); }
    // konfeti & kilau
    for (const p of parts) {
      ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.c;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (V.flash > 0.01) { ctx.fillStyle = `rgba(${V.flashC},${V.flash * 0.22})`; ctx.fillRect(0, 0, W, H); }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
    if (!drawOn || document.hidden) return;
    if (QC.isBusy() && frames > 0 && !needResize) return; // pop-up terbuka (latar di-blur): panggung dibekukan, hemat GPU
    const t0 = performance.now();
    try { if (needResize) resize(); update(dt); draw(); } catch (e) { console.error(e); }
    const ms = performance.now() - t0; msAvg = frames ? msAvg * 0.95 + ms * 0.05 : ms; frames++;
  }
  try { const ro = new ResizeObserver(() => { needResize = true; }); ro.observe(stage); ro.observe($('scene')); } catch (e) { addEventListener('resize', () => { needResize = true; }); }
  requestAnimationFrame(loop);

  /* ============================== KONTROL ============================== */
  const syncMusic = () => $('btnMusic').classList.toggle('off', !AU.music.on);
  $('btnMusic').onclick = () => {
    AU.music.on = !AU.music.on; store(`lokamain_${GAME_ID}_musik`, AU.music.on); syncMusic(); QC.sfx.click();
    if (AU.music.on && phase === 'question') AU.music.start(); else AU.music.stop();
    QC.toast(AU.music.on ? '🎵 Musik latar tegang: NYALA' : '🎵 Musik latar: MATI');
  };
  syncMusic();
  $('btnRules').onclick = () => {
    if (QC.isBusy()) return;
    const N = L.v.length;
    const rules = [
      'Tim bergiliran duduk di <b>KURSI PANAS</b>. Tiap tim punya posisi sendiri di <b>Tangga Bintang</b> (kanan).',
      'Soal giliranmu ada di <b>tingkat berikutnya</b>. Makin tinggi, makin besar bintangnya (sampai <b>⭐ 10.000</b>).',
      'Sentuh jawaban (atau <b>A–D / 1–4</b>) → muncul <b>"Jawaban terakhir?"</b> → <b>KUNCI</b> (Enter) atau <b>GANTI</b> (Esc). Setelah dikunci: lampu meredup, drum berbunyi… lalu hasil!',
      `<b>BENAR</b> = naik 1 tingkat. <b>SALAH / waktu habis</b> = turun ke <b>titik aman</b> emas terakhir (tingkat ${L.safe.join(' & ')}).`,
      'Bantuan sekali pakai: <b>50:50</b> (hapus jawaban salah), <b>Tanya Kelas</b> (guru mengisi polling suara kelas), <b>Ganti Soal</b>. Bantuan terpakai dicoret.',
      '<b>AMANKAN POIN</b>: kunci bintang sekarang & berhenti bermain. <b>⚡ Bintang Kilat</b>: jawab benar dalam sepertiga waktu pertama (penentu bila seri).',
      `Juara: tim pertama mencapai <b>PUNCAK (tingkat ${N})</b>, atau bintang terbanyak setelah semua putaran. <b>1 tim</b> = Tantangan Solo: salah sekali = selesai, kejar rekor!`
    ];
    QC.modal({ cls: 'qc-rules-modal', icon: '📜', title: 'Peraturan Panggung', dismissable: true, html: `<ol class="rules-list">${rules.map((r, i) => `<li><span class="no">${i + 1}</span><span>${r}</span></li>`).join('')}</ol>`, buttons: [{ label: 'Siap tampil!', value: true, primary: true }] });
  };
  $('btnSetup').onclick = async () => {
    if (QC.isBusy() || phase === 'idle') return;
    const v = await QC.modal({ icon: '⚙️', title: 'Pengaturan', html: '<p class="qc-muted">Ubah tim, jumlah tingkat, putaran, waktu & bantuan? Permainan yang sedang berjalan akan diulang.</p>', buttons: [{ label: 'Batal', value: null }, { label: '🔁 Ulang Permainan', value: 'again' }, { label: '⚙️ Buka Pengaturan', value: 'setup', primary: true }] });
    if (v === 'setup') openSetup(); else if (v === 'again') newGame();
  };
  QC.onKey = (e) => {
    if (e.repeat) return;
    const key = e.key; const up = key.length === 1 ? key.toUpperCase() : key;
    if (phase === 'ready') { if (key === 'Enter' || key === ' ') { e.preventDefault(); showQuestion(); } return; }
    if (phase === 'question') {
      const m = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }; const k = m[key] || up;
      if (keys.includes(k)) { e.preventDefault(); select(k); return; }
      if (key === 'Enter') { e.preventDefault(); lockAnswer(); return; }
      if (key === 'Escape' || key === 'Backspace') { e.preventDefault(); cancelSel(); return; }
      if (key === '5') useLL('fifty'); else if (up === 'T') useLL('poll'); else if (up === 'G') useLL('swap'); else if (up === 'S') securePoints();
      return;
    }
    if (phase === 'reveal' && (key === 'Enter' || key === ' ')) { e.preventDefault(); goNext(); }
  };
  $('btnSecure').onclick = () => securePoints();

  /* ------------------------------ Hook uji ------------------------------ */
  window.__PK = {
    get phase() { return phase; }, get turn() { return turn; }, get round() { return round; }, get q() { return q; }, get keys() { return keys; }, get removed() { return removed; }, get sel() { return sel; }, get pollRes() { return pollRes; },
    get ms() { return msAvg; }, get frames() { return frames; }, get drawOn() { return drawOn; }, get tLeft() { return tLeft; },
    teams: () => T.map((t) => ({ name: t.name, level: t.level, pts: pts(t), secured: t.secured, top: t.top, out: t.out, ll: { ...t.ll }, kilat: t.kilat })),
    correct: () => q && q.correct, show: () => showQuestion(), select, lock: () => lockAnswer(), cancel: () => cancelSel(), next: () => goNext(),
    use: useLL, secure: securePoints, setTime: (s) => { tLeft = s; }, pollAdd: (k, n = 1) => { const o = document.querySelector('.pk-poll'); if (o && o.__add) for (let i = 0; i < n; i++) o.__add(k, 1); }
  };
  openSetup();
})();
