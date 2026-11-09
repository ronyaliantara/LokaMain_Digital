/* ==========================================================================
   KidGame — mesin bersama game anak PAUD & SD (LokaMain)
   Dibangun di atas QuizCore (bank soal, Mode Guru, impor/ekspor Excel).
   - Tombol jawaban besar & berwarna, cocok untuk layar sentuh / Smart TV / IFP.
   - Pembaca suara (Bahasa Indonesia) membacakan soal untuk anak.
   - Salah boleh mencoba lagi (mode 1 kelas) / kesempatan lempar ke tim lawan (mode 2 tim).
   - Setiap game cukup menyediakan adegan animasi lewat "hooks".
   ========================================================================== */
(function () {
  const QC = window.QuizCore;
  const esc = QC.esc;
  const EMO = /(?:\p{Extended_Pictographic}|️|‍|[\u{1F3FB}-\u{1F3FF}]|[\u{1F1E6}-\u{1F1FF}])+/gu;
  const isEmojiOnly = (s) => { const t = String(s).replace(/\s/g, ''); return !!t && t.replace(EMO, '') === '' && [...t].length <= 18; };
  const stripEmoji = (s) => String(s).replace(EMO, ' ').replace(/\s+/g, ' ').trim();
  const PRAISE = ['Hebat!', 'Pintar sekali!', 'Keren!', 'Luar biasa!', 'Mantap!', 'Benar sekali!', 'Bagus!'];
  const RETRY = ['Coba lagi, ya!', 'Hampir benar!', 'Ayo coba lagi!', 'Tidak apa-apa, coba lagi!'];
  const TEAMS = [{ name: 'Tim Merah', color: '#ef4444', icon: '🔴' }, { name: 'Tim Biru', color: '#3b82f6', icon: '🔵' }];
  const OPT = [['#ef4444', '#b91c1c'], ['#3b82f6', '#1d4ed8'], ['#f59e0b', '#b45309'], ['#22c55e', '#15803d']];

  window.KidGame = function (cfg) {
    const level = cfg.level || 'paud';
    const KEY = `lokamain_${cfg.gameId}_kid`;
    let S = { target: cfg.defaultTarget || 8, voice: level === 'paud', teams: 1 };
    try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* abaikan */ }
    if (!cfg.teamsOption) S.teams = 1;

    /* ------------------------------ DOM ------------------------------ */
    document.body.classList.add('kg-body', 'kg-' + level);
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="kg-app">
        <header class="kg-top">
          <div class="kg-brand"><span class="kg-logo">${cfg.emoji}</span><div><b>${esc(cfg.title)}</b><small>${esc(cfg.tag || '')}</small></div></div>
          <div class="kg-mid" id="kgMid"></div>
          <nav class="kg-tools">
            <button class="kg-ib" id="kgSpeak" title="Bacakan soal">📢<span> Baca</span></button>
            <button class="kg-ib" data-qc="sound" title="Suara"></button>
            <button class="kg-ib" data-qc="fullscreen" title="Layar penuh">⛶</button>
            <button class="kg-ib" id="kgHome" title="Menu awal">🏠</button>
            <button class="kg-ib kg-guru" data-qc="teacher" title="Mode Guru: ubah soal">✏️<span> Guru</span></button>
          </nav>
        </header>
        <main class="kg-scene" id="kgScene"></main>
        <section class="kg-panel" id="kgPanel" hidden>
          <div class="kg-turn" id="kgTurn" hidden></div>
          <div class="kg-q" id="kgQ"></div>
          <div class="kg-opts" id="kgOpts"></div>
        </section>
        <div class="kg-praise" id="kgPraise"></div>
        <div class="kg-over" id="kgStart">
          <div class="kg-card">
            <div class="kg-mascot">${cfg.mascot || cfg.emoji}</div>
            <h1>${esc(cfg.title)}</h1>
            <p class="kg-tagline">${esc(cfg.tagline || '')}</p>
            <div class="kg-opt-group" data-k="target"><span>Jumlah ${cfg.teamsOption ? 'poin menang' : 'soal'}</span>${[5, 8, 10, 15].map((n) => `<button data-v="${n}">${n}</button>`).join('')}</div>
            ${cfg.teamsOption ? '<div class="kg-opt-group" data-k="teams"><span>Pemain</span><button data-v="1">👨‍👩‍👧 1 Kelas</button><button data-v="2">🔴 vs 🔵 2 Tim</button></div>' : ''}
            <div class="kg-opt-group" data-k="voice"><span>Suara pembaca soal</span><button data-v="1">📢 Nyala</button><button data-v="0">Mati</button></div>
            <button class="kg-go" id="kgGo">▶ MAIN</button>
            <p class="kg-note">Guru bisa mengganti soal lewat tombol <b>✏️ Guru</b> (impor/ekspor Excel). PIN bawaan: 1234</p>
          </div>
        </div>
        <div class="kg-over" id="kgEnd" hidden><div class="kg-card" id="kgEndCard"></div></div>
      </div>`);
    const $ = (id) => document.getElementById(id);
    const scene = $('kgScene');
    QC.init({ gameId: cfg.gameId, title: cfg.title, avatars: ['🙂'], colors: ['#ef4444'] });

    // pilihan di layar awal
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } };
    function syncOpts() {
      document.querySelectorAll('.kg-opt-group').forEach((g) => {
        const k = g.dataset.k; const val = k === 'voice' ? (S.voice ? '1' : '0') : String(S[k]);
        g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === val));
      });
    }
    document.querySelectorAll('.kg-opt-group button').forEach((b) => (b.onclick = () => {
      const k = b.parentElement.dataset.k; S[k] = k === 'voice' ? b.dataset.v === '1' : +b.dataset.v; save(); syncOpts(); QC.sfx.click();
    }));
    syncOpts();

    /* ------------------------------ Suara ------------------------------ */
    let voiceId = null;
    function pickVoice() { try { const vs = speechSynthesis.getVoices(); voiceId = vs.find((v) => /^id(-|_)/i.test(v.lang)) || vs.find((v) => /indones/i.test(v.name)) || null; } catch (e) { voiceId = null; } }
    if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
    function speak(text, force) {
      if ((!S.voice && !force) || QC.muted || !('speechSynthesis' in window)) return;
      const t = stripEmoji(text); if (!t) return;
      try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'id-ID'; u.rate = level === 'paud' ? 0.85 : 0.95; u.pitch = 1.15; if (voiceId) u.voice = voiceId; speechSynthesis.speak(u); } catch (e) { /* abaikan */ }
    }
    function questionSpeech(q, order) {
      const opts = order.map((k) => q['option' + k]).filter((o) => !isEmojiOnly(o)).map(stripEmoji).filter(Boolean);
      return stripEmoji(q.question) + (opts.length ? '. ' + opts.join(', ') : '');
    }

    /* ------------------------------ Status ------------------------------ */
    let prog = [0, 0]; let turn = 0; let current = null; let busy = false; let winner = -1; let running = false; let gen = 0;
    const api = {
      scene, cfg, S, level, TEAMS,
      get prog() { return prog; }, get turn() { return turn; }, get teams() { return S.teams; }, get target() { return S.target; },
      sleep: QC.sleep, sfx: QC.sfx, fx: QC.fx, confetti: QC.confetti, speak: (t) => speak(t, true), pick: QC.pick, rand: QC.rand,
      el(html, parent = scene) { const t = document.createElement('template'); t.innerHTML = html.trim(); const n = t.content.firstElementChild; parent.appendChild(n); return n; },
      anim(el, frames, opts) { if (!el) return Promise.resolve(); const a = el.animate(frames, opts); return Promise.race([a.finished.catch(() => {}), QC.sleep((opts.duration || 0) + (opts.delay || 0) + 150)]); },
      center(el) { const r = el.getBoundingClientRect(); const s = scene.getBoundingClientRect(); return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top }; }
    };
    const hook = (name, ...a) => { try { return cfg.hooks && cfg.hooks[name] ? cfg.hooks[name](api, ...a) : null; } catch (e) { console.error(e); return null; } };

    function renderMid() {
      const mid = $('kgMid');
      if (S.teams === 2) {
        mid.innerHTML = TEAMS.map((t, i) => `<div class="kg-team ${turn === i && running ? 'now' : ''}" style="--tc:${t.color}"><b>${t.name}</b><span>${prog[i]} / ${S.target}</span></div>`).join('<i class="kg-vs">VS</i>');
      } else {
        mid.innerHTML = `<div class="kg-stars">${Array.from({ length: S.target }, (_, i) => `<span class="${i < prog[0] ? 'on' : ''}">★</span>`).join('')}</div>`;
      }
    }
    function praise(txt, good) {
      const p = $('kgPraise'); p.textContent = txt; p.className = 'kg-praise ' + (good ? 'good' : 'bad');
      void p.offsetWidth; p.classList.add('show');
    }

    /* ------------------------------ Alur ------------------------------ */
    async function start() {
      gen++; const g = gen;
      $('kgStart').hidden = true; $('kgEnd').hidden = true;
      prog = [0, 0]; turn = 0; winner = -1; running = true; busy = false;
      scene.innerHTML = ''; hook('build'); renderMid();
      QC.sfx.whoosh();
      await QC.sleep(500);
      while (g === gen && winner < 0) {
        const q = QC.nextQuestion();
        if (!q) { QC.toast('Bank soal kosong — tambahkan soal lewat tombol ✏️ Guru.', 'bad'); break; }
        await ask(q, g);
        if (g !== gen) return;
        if (S.teams === 2 && winner < 0) { turn = 1 - turn; renderMid(); hook('turn', turn); }
      }
      if (g !== gen) return;
      running = false; renderMid();
      await finish(g);
    }

    function ask(q, g) {
      return new Promise((resolve) => {
        const keys = QC.optionsOf(q); const order = QC.shuffle(keys); const tried = new Set();
        current = { q, order };
        const panel = $('kgPanel'); panel.hidden = false; panel.classList.remove('in'); void panel.offsetWidth; panel.classList.add('in');
        const tEl = $('kgTurn');
        const setTurn = () => { if (S.teams === 2) { tEl.hidden = false; tEl.style.setProperty('--tc', TEAMS[turn].color); tEl.textContent = `Giliran ${TEAMS[turn].name}`; } else tEl.hidden = true; };
        setTurn(); hook('question', q, turn);
        const qEl = $('kgQ'); const big = isEmojiOnly(q.question.replace(/[^\p{Extended_Pictographic}️‍]/gu, '')) && /\p{Extended_Pictographic}/u.test(q.question);
        qEl.innerHTML = formatQ(q.question); qEl.classList.toggle('has-emo', big);
        const box = $('kgOpts'); box.style.setProperty('--n', order.length);
        box.innerHTML = order.map((k, i) => {
          const txt = q['option' + k]; const emo = isEmojiOnly(txt);
          return `<button class="kg-opt ${emo ? 'emo' : ''}" data-k="${k}" style="--c1:${OPT[i % 4][0]};--c2:${OPT[i % 4][1]};--d:${i * 90}ms"><span>${esc(txt)}</span></button>`;
        }).join('');
        speak(questionSpeech(q, order));
        box.querySelectorAll('.kg-opt').forEach((b) => (b.onclick = async () => {
          if (busy || g !== gen || b.disabled) return;
          const k = b.dataset.k;
          if (k === q.correct) {
            busy = true; box.querySelectorAll('.kg-opt').forEach((x) => (x.disabled = true));
            b.classList.add('good'); QC.sfx.correct(); const w = QC.pick(PRAISE); praise(w, true); speak(w);
            QC.fx.burstAt(b, { emojis: ['⭐', '✨', '🌟', '🎉'], count: 18, spread: 170 });
            const team = S.teams === 2 ? turn : 0; prog[team]++; renderMid();
            await (hook('correct', { team, q, choice: k, el: b, progress: prog[team] }) || QC.sleep(900));
            if (g !== gen) return;
            if (prog[team] >= S.target) winner = team;
            await QC.sleep(250); busy = false; panel.hidden = true; resolve();
          } else {
            b.disabled = true; b.classList.add('bad'); QC.sfx.wrong(); tried.add(turn);
            const r = QC.pick(RETRY);
            hook('wrong', { team: turn, q, choice: k, el: b });
            if (S.teams === 2) {
              if (tried.size < 2) {
                turn = 1 - turn; setTurn(); renderMid(); hook('turn', turn);
                praise(`Kesempatan ${TEAMS[turn].name}!`, false); speak(`Kesempatan ${TEAMS[turn].name}`);
              } else {
                busy = true; box.querySelectorAll('.kg-opt').forEach((x) => { x.disabled = true; if (x.dataset.k === q.correct) x.classList.add('show'); });
                praise('Jawaban yang benar…', false); speak('Jawaban yang benar adalah ' + stripEmoji(q['option' + q.correct]));
                await QC.sleep(2200); if (g !== gen) return; busy = false; panel.hidden = true; resolve();
              }
            } else { praise(r, false); speak(r); }
          }
        }));
      });
    }
    function formatQ(text) {
      // emoji dibuat lebih besar di dalam teks soal
      return esc(text).replace(EMO, (m) => `<span class="kg-emo">${m}</span>`);
    }

    async function finish(g) {
      $('kgPanel').hidden = true;
      await (hook('win', winner) || QC.sleep(600));
      if (g !== gen) return;
      QC.sfx.win(); QC.confetti(220);
      const card = $('kgEndCard');
      const title = S.teams === 2 ? `${TEAMS[winner].icon} ${TEAMS[winner].name} MENANG!` : (cfg.winTitle || 'HEBAT SEKALI!');
      const msg = S.teams === 2 ? `Skor ${prog[0]} – ${prog[1]}. Semua tim sudah berusaha dengan baik!` : (cfg.winText || 'Kalian berhasil menjawab semua soal!');
      card.innerHTML = `<div class="kg-mascot win">${cfg.winEmoji || '🏆'}</div><h1>${esc(title)}</h1><p class="kg-tagline">${esc(msg)}</p>
        <div class="kg-bigstars">${'★'.repeat(3).split('').map((s, i) => `<span style="--d:${i * 200}ms">★</span>`).join('')}</div>
        <div class="kg-end-btns"><button class="kg-go" id="kgAgain">🔁 MAIN LAGI</button><button class="kg-go alt" id="kgMenu">🏠 MENU</button></div>`;
      $('kgEnd').hidden = false; speak(title + '. ' + msg);
      $('kgAgain').onclick = () => { QC.sfx.click(); start(); };
      $('kgMenu').onclick = () => { QC.sfx.click(); home(); };
    }
    function home() {
      gen++; running = false; busy = false; try { speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
      $('kgPanel').hidden = true; $('kgEnd').hidden = true; $('kgStart').hidden = false;
      scene.innerHTML = ''; hook('build'); prog = [0, 0]; renderMid();
    }

    $('kgGo').onclick = () => { QC.sfx.click(); start(); };
    $('kgHome').onclick = () => { if (QC.isBusy()) return; QC.sfx.click(); home(); };
    $('kgSpeak').onclick = () => { if (current && !$('kgPanel').hidden) speak(questionSpeech(current.q, current.order), true); };
    QC.onKey = (e) => {
      if (e.key === 'Enter' && !$('kgStart').hidden) { e.preventDefault(); $('kgGo').click(); return; }
      if ($('kgPanel').hidden) return;
      const n = '1234'.indexOf(e.key); const btns = document.querySelectorAll('.kg-opt');
      if (n >= 0 && btns[n]) { e.preventDefault(); btns[n].click(); }
    };
    home();
    return api;
  };
})();
