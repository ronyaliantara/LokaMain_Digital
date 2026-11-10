(() => {
  const {
    loadStore,
    formatIdr,
    normalizePhone,
    buildBuyerWhatsAppUrl
  } = window.LokaStore;

  const POLL_MS = 60000;
  const SITE_URL = 'https://rnaltdigital.my.id/';
  // Teks lama bawaan; bila masih ini, pakai teks hero yang baru di index.html.
  const LEGACY_SUBTITLES = [
    'Pilih game pembelajaran digital, lalu klik tombol WhatsApp di bawahnya untuk memesan.'
  ];

  let lastRenderedTime = -1;
  let currentStore = null;
  let mediaObserver = null;
  const reducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (id) => document.getElementById(id);

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Hanya izinkan path relatif, http(s), dan gambar/video data. Selain itu dianggap kosong.
  function safeSrc(src) {
    const clean = String(src || '').trim();
    if (!clean) return '';
    if (/^(javascript|vbscript):/i.test(clean)) return '';
    if (/^data:/i.test(clean) && !/^data:(image|video)\//i.test(clean)) return '';
    return clean;
  }

  const isVideoSrc = (s) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(s || '') || String(s || '').startsWith('data:video/');
  const isGifSrc = (s) => /\.gif(\?.*)?$/i.test(s || '') || String(s || '').startsWith('data:image/gif');

  function shortPrice(price) {
    const n = Number(price) || 0;
    if (n >= 1000 && n % 1000 === 0) return `Rp ${n / 1000}rb`;
    return `Rp ${formatIdr(n)}`;
  }

  function icon(id) {
    return `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
  }

  function waLink(settings, text) {
    const phone = normalizePhone(settings.whatsappNumber);
    const msg = encodeURIComponent(text);
    return phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
  }

  // ---------------------------------------------------------------
  // Pesan WhatsApp setelah bayar QRIS
  // ---------------------------------------------------------------
  function buildPaidMessage(game, settings, method = 'other') {
    const methodNote = method === 'dana' ? ' (Aplikasi DANA)' : ' (Bank/E-Wallet - Nominal Otomatis)';
    return [
      `Halo ${settings.sellerName || 'Admin'}, saya sudah transfer via QRIS${methodNote} untuk game:`,
      '',
      `Judul Game: ${game.title}`,
      `Kode: ${game.code || game.id}`,
      `Nominal: Rp ${formatIdr(game.price)}`,
      '',
      'Bukti pembayaran sudah saya lampirkan di chat ini. Mohon dicek dan dikirimkan link gamenya ya. Terima kasih!'
    ].join('\n');
  }

  // ---------------------------------------------------------------
  // Jendela pesan
  // ---------------------------------------------------------------
  function openOrderDialog(gameId) {
    const store = currentStore || loadStore();
    const game = store.games.find((g) => g.id === gameId);
    if (!game) return;

    const settings = store.settings;
    const phone = normalizePhone(settings.whatsappNumber);
    const hasQris = Boolean(settings.qrisImage || settings.qrisRawPayload);

    $('order-title').textContent = game.title;
    $('order-price').textContent = `Rp ${formatIdr(game.price)}`;

    const qrisSection = $('order-qris-section');
    const noQrisSection = $('order-no-qris');
    const methodsSelector = $('qris-methods-selector');
    const danaBtn = $('method-dana-btn');
    const otherBtn = $('method-other-btn');
    const qrisImg = $('order-qris-img');
    const qrisBadge = $('order-qris-badge');
    const qrisDownload = $('order-qris-download');
    const qrisName = $('order-qris-name');
    const waBtn = $('order-wa-btn');
    const manualBox = $('order-qris-manual-box');
    const manualPrice = $('order-manual-price');
    const copyBtn = $('order-copy-price-btn');

    if (hasQris) {
      qrisSection.hidden = false;
      noQrisSection.hidden = true;

      const staticQrUrl = safeSrc(settings.qrisImage);

      let dynamicQrUrl = '';
      const canMakeDynamic = settings.qrisDynamicEnabled !== false && settings.qrisRawPayload && window.QrisHelper;
      if (canMakeDynamic) {
        try {
          const dynPayload = window.QrisHelper.makeDynamicQris(settings.qrisRawPayload, game.price);
          if (dynPayload) dynamicQrUrl = window.QrisHelper.generateQrDataUrl(dynPayload, 7, 4);
        } catch (_) { /* pakai QRIS statis saja */ }
      }

      const hasBothMethods = Boolean(staticQrUrl && dynamicQrUrl);
      methodsSelector.style.display = hasBothMethods ? 'grid' : 'none';

      let savedPref = 'other';
      try { savedPref = localStorage.getItem('lokamain_qris_pref') || 'other'; } catch (_) { /* abaikan */ }
      if (!dynamicQrUrl) savedPref = 'dana';
      if (!staticQrUrl) savedPref = 'other';

      const setMethod = (method) => {
        try { localStorage.setItem('lokamain_qris_pref', method); } catch (_) { /* abaikan */ }
        const isDana = method === 'dana';
        danaBtn.classList.toggle('active', isDana);
        otherBtn.classList.toggle('active', !isDana);
        danaBtn.setAttribute('aria-pressed', String(isDana));
        otherBtn.setAttribute('aria-pressed', String(!isDana));

        if (isDana) {
          const src = staticQrUrl || dynamicQrUrl;
          qrisImg.src = src;
          qrisDownload.href = src;
          qrisDownload.download = 'QRIS-DANA-rnalt.jpg';
          qrisBadge.style.display = 'none';
          manualBox.style.display = 'flex';
          manualPrice.textContent = `Rp ${formatIdr(game.price)}`;
        } else {
          const src = dynamicQrUrl || staticQrUrl;
          qrisImg.src = src;
          qrisDownload.href = src;
          qrisDownload.download = `QRIS-${String(game.title).replace(/[^\w]+/g, '-')}-Rp${game.price}.png`;
          if (dynamicQrUrl) {
            qrisBadge.style.display = 'inline-flex';
            qrisBadge.innerHTML = `Nominal otomatis terisi: <strong>&nbsp;Rp ${formatIdr(game.price)}</strong>`;
            manualBox.style.display = 'none';
          } else {
            qrisBadge.style.display = 'none';
            manualBox.style.display = 'flex';
            manualPrice.textContent = `Rp ${formatIdr(game.price)}`;
          }
        }

        waBtn.textContent = 'Sudah bayar, kirim bukti via WhatsApp';
        waBtn.href = waLink(settings, buildPaidMessage(game, settings, method));
      };

      setMethod(savedPref);
      danaBtn.onclick = () => setMethod('dana');
      otherBtn.onclick = () => setMethod('other');

      copyBtn.onclick = () => {
        const amount = String(game.price);
        const done = () => {
          copyBtn.textContent = 'Tersalin';
          setTimeout(() => { copyBtn.textContent = 'Salin'; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(amount).then(done).catch(() => {
            window.prompt('Salin nominal pembayaran:', amount);
          });
        } else {
          window.prompt('Salin nominal pembayaran:', amount);
        }
      };

      qrisName.textContent = settings.qrisName ? `a.n. ${settings.qrisName}` : '';
    } else {
      qrisSection.hidden = true;
      noQrisSection.hidden = false;
      qrisBadge.style.display = 'none';
      waBtn.textContent = 'Pesan via WhatsApp';
      waBtn.href = phone ? buildBuyerWhatsAppUrl(game, settings) : '#';
    }

    document.body.style.overflow = 'hidden';
    $('order-dialog').showModal();
  }

  // ---------------------------------------------------------------
  // Kartu produk
  // ---------------------------------------------------------------
  function mediaHtml(game, index) {
    const title = escapeHtml(game.title);
    const media = safeSrc(game.image);
    const cover = safeSrc(game.coverImage);
    const video = isVideoSrc(media);
    const animated = video || isGifSrc(media);
    const eager = index === 0 ? 'eager' : 'lazy';

    if (cover && animated && !reducedMotion) {
      const layer = video
        ? `<video class="game-thumb game-anim-layer" data-src="${escapeHtml(media)}" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`
        : `<img class="game-thumb game-anim-layer" data-src="${escapeHtml(media)}" alt="" aria-hidden="true" decoding="async">`;
      return `
        <div class="game-media-wrap" data-anim="${video ? 'video' : 'gif'}">
          <img class="game-thumb" src="${escapeHtml(cover)}" alt="${title}" width="800" height="500" loading="${eager}" decoding="async">
          ${layer}
        </div>`;
    }

    const still = cover || (video ? '' : media);
    if (still) {
      return `
        <div class="game-media-wrap">
          <img class="game-thumb" src="${escapeHtml(still)}" alt="${title}" width="800" height="500" loading="${eager}" decoding="async">
        </div>`;
    }
    if (video) {
      return `
        <div class="game-media-wrap" data-anim="video">
          <video class="game-thumb game-anim-layer" data-src="${escapeHtml(media)}" muted loop playsinline preload="metadata" aria-label="${title}"></video>
        </div>`;
    }
    return '<div class="game-media-wrap" aria-hidden="true"></div>';
  }

  // ---------------------------------------------------------------
  // Jenjang (PAUD / SD / SMP / SMA) — filter otomatis
  // ---------------------------------------------------------------
  const LEVELS = [
    { key: 'PAUD', label: 'PAUD / TK', icon: '🧒' },
    { key: 'SD', label: 'SD', icon: '🎒' },
    { key: 'SMP', label: 'SMP', icon: '🎓' },
    { key: 'SMA', label: 'SMA / SMK', icon: '🏫' }
  ];
  const LEVEL_KEYS = LEVELS.map((l) => l.key);
  let activeLevel = 'all';
  try {
    const h = (location.hash || '').replace('#', '').toUpperCase();
    if (LEVEL_KEYS.includes(h)) activeLevel = h;
    else activeLevel = sessionStorage.getItem('lokamain_level') || 'all';
  } catch (_) { /* abaikan */ }

  // Ambil dari kolom "levels" (diisi di aplikasi admin). Jika kosong, tebak otomatis dari teks.
  function levelsOf(game) {
    if (Array.isArray(game.levels) && game.levels.length) {
      return LEVEL_KEYS.filter((k) => game.levels.map((x) => String(x).toUpperCase()).includes(k));
    }
    const t = `${game.category || ''} ${game.grade || ''} ${game.title || ''} ${game.shortDesc || ''}`.toUpperCase();
    const out = [];
    if (/\b(PAUD|TK|RA)\b/.test(t)) out.push('PAUD');
    if (/\b(SD|MI)\b/.test(t)) out.push('SD');
    if (/\b(SMP|MTS)\b/.test(t)) out.push('SMP');
    if (/\b(SMA|SMK|MA)\b/.test(t)) out.push('SMA');
    return out;
  }
  // Urutan tampil: game SMP/SMA paling atas, lalu SD, lalu PAUD; yang belum diberi jenjang paling bawah.
  const levelRank = (g) => { const l = levelsOf(g); return l.length ? LEVEL_KEYS.length - LEVEL_KEYS.indexOf(l[0]) : 9; };

  function renderLevelTabs(store) {
    const bar = $('level-tabs');
    if (!bar) return;
    const counts = Object.fromEntries(LEVEL_KEYS.map((k) => [k, store.games.filter((g) => levelsOf(g).includes(k)).length]));
    if (!LEVEL_KEYS.some((k) => counts[k])) { bar.hidden = true; activeLevel = 'all'; return; }
    if (activeLevel !== 'all' && !counts[activeLevel]) activeLevel = 'all';
    const tab = (key, label, icon, n) => `<button type="button" role="tab" class="level-tab${activeLevel === key ? ' is-active' : ''}" data-level="${key}" aria-selected="${activeLevel === key}"${n === 0 ? ' disabled' : ''}>${icon ? `<span aria-hidden="true">${icon}</span>` : ''}${escapeHtml(label)}<b>${n}</b></button>`;
    bar.innerHTML = tab('all', 'Semua', '✨', store.games.length) + [...LEVELS].reverse().map((l) => tab(l.key, l.label, l.icon, counts[l.key])).join('');
    bar.hidden = false;
  }

  function levelPills(game) {
    const l = levelsOf(game);
    if (!l.length) return '';
    return `<p class="game-levels">${l.map((k) => `<span class="lv lv-${k.toLowerCase()}">${escapeHtml(LEVELS.find((x) => x.key === k).label)}</span>`).join('')}</p>`;
  }

  function visibleGames(store) {
    const list = activeLevel === 'all' ? [...store.games] : store.games.filter((g) => levelsOf(g).includes(activeLevel));
    // urutkan dari jenjang tertinggi (SMP/SMA di atas), urutan admin tetap dipertahankan di dalam jenjang
    return list.map((g, i) => ({ g, i })).sort((a, b) => levelRank(a.g) - levelRank(b.g) || a.i - b.i).map((x) => x.g);
  }

  function renderGrid(store) {
    const grid = $('game-grid');
    renderLevelTabs(store);
    const games = visibleGames(store);
    grid.innerHTML = games.length
      ? games.map(cardHtml).join('')
      : '<div class="empty-state"><h3>Belum ada game untuk jenjang ini</h3><p>Pilih jenjang lain atau tanyakan lewat WhatsApp.</p></div>';
    grid.setAttribute('aria-busy', 'false');
    setupMedia(grid);
  }

  function cardHtml(game, index) {
    const id = escapeHtml(game.id);
    const metaItems = [];
    if (game.duration) metaItems.push(`<li>${icon('i-clock')}<span>${escapeHtml(game.duration)}</span></li>`);
    if (game.device) metaItems.push(`<li>${icon('i-monitor')}<span>${escapeHtml(game.device)}</span></li>`);

    return `
      <article class="game-block">
        <div style="position:relative">
          ${mediaHtml(game, index)}
          ${game.grade ? `<span class="game-chip">${escapeHtml(game.grade)}</span>` : ''}
        </div>
        <div class="game-info">
          <div>
            ${levelPills(game)}
            ${game.category ? `<p class="game-category">${escapeHtml(game.category)}</p>` : ''}
            <h3 class="game-name">${escapeHtml(game.title)}</h3>
            <p class="game-desc">${escapeHtml(game.shortDesc || '')}</p>
          </div>
          ${metaItems.length ? `<ul class="game-meta">${metaItems.join('')}</ul>` : ''}
          <div class="game-buy">
            <p class="game-price"><small>Rp</small>${formatIdr(game.price)}</p>
            <div class="game-actions">
              <button type="button" class="btn btn-primary" data-order="${id}">Pesan</button>
              <a class="btn btn-ghost-detail" href="play.html?id=${encodeURIComponent(game.id)}" aria-label="Lihat detail ${escapeHtml(game.title)}">Detail</a>
            </div>
          </div>
        </div>
      </article>`;
  }

  // Animasi (video/GIF) hanya dimuat dan diputar saat kartu terlihat di layar.
  // Kartu katalog memakai video HD (tampilan depan detail); halaman detail game memakai versi kecil.
  // Di HP paling banyak 2 video berputar bersamaan, dan saat mode hemat data / jaringan lambat
  // video tidak diputar otomatis (cukup gambar sampul).
  const conn = navigator.connection || {};
  const saveData = Boolean(conn.saveData) || /(^|-)2g$/.test(conn.effectiveType || '');
  const maxPlaying = () => (window.matchMedia('(max-width: 760px)').matches ? 2 : 4);
  const playing = [];
  function setupMedia(grid) {
    if (mediaObserver) mediaObserver.disconnect();
    playing.length = 0;
    const wraps = grid.querySelectorAll('.game-media-wrap[data-anim]');
    if (!wraps.length || saveData) return;

    if (!('IntersectionObserver' in window)) {
      wraps.forEach(activateMedia);
      return;
    }
    mediaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const wrap = entry.target;
        const layer = wrap.querySelector('.game-anim-layer');
        if (!layer) return;
        if (entry.isIntersecting) {
          activateMedia(wrap);
        } else if (layer.tagName === 'VIDEO' && layer.src) {
          layer.pause();
          const i = playing.indexOf(wrap); if (i >= 0) playing.splice(i, 1);
        }
      });
    }, { rootMargin: '0px', threshold: 0.5 });
    wraps.forEach((w) => mediaObserver.observe(w));
  }

  function activateMedia(wrap) {
    const layer = wrap.querySelector('.game-anim-layer');
    if (!layer) return;
    const hasCover = Boolean(wrap.querySelector('img.game-thumb:not(.game-anim-layer)'));
    if (!layer.getAttribute('src') && layer.dataset.src) {
      // versi kecil belum ada (mis. game baru dari admin)? pakai video aslinya
      if (layer.dataset.full && layer.dataset.full !== layer.dataset.src) {
        layer.addEventListener('error', () => { layer.setAttribute('src', layer.dataset.full); if (playing.includes(wrap)) layer.play().catch(() => {}); }, { once: true });
      }
      layer.setAttribute('src', layer.dataset.src);
    }

    if (layer.tagName === 'VIDEO') {
      if (!playing.includes(wrap)) {
        playing.push(wrap);
        while (playing.length > maxPlaying()) { const old = playing.shift(); const v = old.querySelector('video.game-anim-layer'); if (v) v.pause(); }
      }
      layer.play().then(() => wrap.classList.add('is-playing')).catch(() => {});
    } else {
      layer.addEventListener('load', () => wrap.classList.add('is-playing'), { once: true });
    }
    if (!hasCover) wrap.classList.add('is-playing');
  }

  // ---------------------------------------------------------------
  // Hero & SEO
  // ---------------------------------------------------------------
  function renderHero(store) {
    const box = $('hero-visual');
    const badge = $('hero-badge-text');
    const games = store.games;
    if (badge) badge.textContent = games.length ? `${games.length} game siap pakai` : 'Game pembelajaran digital';
    if (!box) return;

    const featured = games.find((g) => safeSrc(g.coverImage) || (!isVideoSrc(g.image) && safeSrc(g.image)));
    if (!featured) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const src = safeSrc(featured.coverImage) || safeSrc(featured.image);
    const minPrice = Math.min(...games.map((g) => Number(g.price) || 0));
    box.hidden = false;
    box.innerHTML = `
      <a class="hero-card" href="play.html?id=${encodeURIComponent(featured.id)}" aria-label="Lihat ${escapeHtml(featured.title)}">
        <div class="hero-card-media">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(featured.title)}" width="800" height="550" fetchpriority="high" decoding="async">
        </div>
        <div class="hero-card-body">
          <span class="hero-card-title">${escapeHtml(featured.title)}</span>
          <span class="hero-card-price">Rp ${formatIdr(featured.price)}</span>
        </div>
      </a>
      <div class="hero-sticker" aria-hidden="true"><span>Mulai<b>${shortPrice(minPrice).replace('Rp ', '')}</b></span></div>`;
  }

  function renderStructuredData(store) {
    const old = $('ld-products');
    if (old) old.remove();
    if (!store.games.length) return;
    const abs = (p) => {
      const s = safeSrc(p);
      if (!s || /^data:/i.test(s)) return undefined;
      return /^https?:/i.test(s) ? s : SITE_URL + s.replace(/^\.?\//, '');
    };
    const data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: store.games.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: g.title,
          description: g.shortDesc || undefined,
          image: abs(g.coverImage) || (isVideoSrc(g.image) ? undefined : abs(g.image)),
          url: `${SITE_URL}play.html?id=${encodeURIComponent(g.id)}`,
          category: g.category || undefined,
          offers: {
            '@type': 'Offer',
            price: String(Number(g.price) || 0),
            priceCurrency: 'IDR',
            availability: 'https://schema.org/InStock'
          }
        }
      }))
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'ld-products';
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
  }

  // ---------------------------------------------------------------
  // Testimoni & hasil uji coba (video diunggah dari Aplikasi Admin)
  // Video baru dimuat saat ditekan Play (preload="none"), jadi halaman tetap ringan.
  // ---------------------------------------------------------------
  let lastTestiKey = '';
  function renderTestimonials(store) {
    const sec = $('testimoni'); const box = $('testi-grid'); const nav = $('nav-testimoni');
    if (!sec || !box) return;
    const items = (Array.isArray(store.testimonials) ? store.testimonials : []).filter((t) => t && t.visible !== false && safeSrc(t.video));
    const key = JSON.stringify(items) + '|' + store.games.map((g) => g.id + g.title).join();
    if (key === lastTestiKey) return; // tidak berubah: jangan ganggu video yang sedang diputar
    lastTestiKey = key;
    sec.hidden = !items.length; if (nav) nav.hidden = !items.length;
    if (!items.length) { box.innerHTML = ''; return; }
    box.innerHTML = items.map((t) => {
      const g = t.gameId ? store.games.find((x) => x.id === t.gameId) : null;
      const poster = safeSrc(t.poster);
      return `
        <article class="testi-card">
          <div class="testi-media">
            <video src="${escapeHtml(safeSrc(t.video))}"${poster ? ` poster="${escapeHtml(poster)}"` : ''} controls playsinline preload="none" aria-label="${escapeHtml(t.title || 'Video testimoni')}"></video>
          </div>
          <div class="testi-body">
            <div class="testi-tags">
              <span class="testi-kind${t.type === 'uji-coba' ? ' is-uji' : ''}">${t.type === 'uji-coba' ? 'Hasil Uji Coba' : 'Testimoni'}</span>
              ${g ? `<a class="testi-game" href="play.html?id=${encodeURIComponent(g.id)}">🎮 ${escapeHtml(g.title)}</a>` : ''}
            </div>
            ${t.title ? `<h3>${escapeHtml(t.title)}</h3>` : ''}
            ${t.caption ? `<p class="testi-quote">${escapeHtml(t.caption)}</p>` : ''}
            ${t.name ? `<p class="testi-name">— ${escapeHtml(t.name)}</p>` : ''}
          </div>
        </article>`;
    }).join('');
    // hanya satu video berputar dalam satu waktu
    const vids = box.querySelectorAll('video');
    vids.forEach((v) => v.addEventListener('play', () => vids.forEach((o) => { if (o !== v) o.pause(); })));
  }

  // ---------------------------------------------------------------
  // Render utama
  // ---------------------------------------------------------------
  function renderPublicCatalog() {
    const store = loadStore();
    currentStore = store;
    lastRenderedTime = Number(store.updatedAt || 0);
    const settings = store.settings;

    // Logo / judul
    const logo = $('site-logo-img');
    const title = $('display-store-name');
    const logoSrc = safeSrc(settings.logoImage);
    if (logo) {
      if (logoSrc) {
        logo.src = logoSrc;
        logo.alt = settings.storeName || 'rnalt_Digital';
        logo.hidden = false;
        if (title) title.hidden = true;
      } else {
        logo.hidden = true;
        if (title) {
          title.hidden = false;
          title.textContent = settings.storeName || 'rnalt_Digital';
        }
      }
    }

    // Subjudul hero (hanya bila admin menulis teks sendiri)
    const sub = $('display-site-subtitle');
    const customSub = typeof settings.siteSubtitle === 'string' ? settings.siteSubtitle.trim() : '';
    if (sub && customSub && !LEGACY_SUBTITLES.includes(customSub)) sub.textContent = customSub;

    const footerText = $('display-footer-text');
    const footerNote = $('display-footer-note');
    if (footerText) {
      footerText.textContent = settings.footerText
        || `Hak Cipta © 2026 ${settings.storeName || 'rnalt_Digital'}. Pembelajaran Game Edukasi Interaktif.`;
    }
    if (footerNote) {
      footerNote.textContent = settings.footerNote
        || 'Semua game dapat dimainkan langsung di HP, Tablet, dan Komputer tanpa instalasi.';
    }

    // Semua tautan WhatsApp mengikuti nomor di admin
    const phone = normalizePhone(settings.whatsappNumber);
    const hello = `Halo ${settings.sellerName || 'Admin'}, saya ingin bertanya tentang game edukasi di ${settings.storeName || 'rnalt_Digital'}.`;
    const askUrl = waLink(settings, hello);
    ['nav-wa', 'hero-wa', 'footer-wa', 'float-wa'].forEach((id) => {
      const el = $(id);
      if (el) el.href = askUrl;
    });
    const footerWa = $('footer-wa-info');
    if (footerWa) footerWa.textContent = phone ? `Pesan & bantuan via WhatsApp: +${phone}` : 'Pesan & bantuan via WhatsApp';

    renderHero(store);
    renderTestimonials(store);

    const grid = $('game-grid');
    if (!grid) return;

    if (store.isDefault && !window.LOKAMAIN_LIVE_DATA) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Katalog belum bisa dimuat</h3>
          <p>Periksa koneksi internet Anda lalu coba lagi.</p>
          <button type="button" class="btn btn-primary" data-reload>Coba lagi</button>
        </div>`;
      grid.setAttribute('aria-busy', 'false');
      return;
    }

    if (!store.games.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Game baru segera hadir</h3>
          <p>Katalog sedang diperbarui. Tanyakan game yang Anda butuhkan lewat WhatsApp.</p>
          <a class="btn btn-wa" href="${escapeHtml(askUrl)}" target="_blank" rel="noopener">Tanya via WhatsApp</a>
        </div>`;
      grid.setAttribute('aria-busy', 'false');
      renderStructuredData(store);
      return;
    }

    renderGrid(store);
    renderStructuredData(store);
  }

  // ---------------------------------------------------------------
  // Ambil data terbaru dari server (tanpa cache browser)
  // ---------------------------------------------------------------
  async function refreshFromServer(force = false) {
    if (document.hidden && !force) return;
    try {
      const res = await fetch(`data/games.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh = await res.json();
      if (fresh && Array.isArray(fresh.games)) {
        const freshTime = Number(fresh.updatedAt || 0);
        if (force || freshTime !== Number(window.LOKAMAIN_LIVE_DATA?.updatedAt || -1) || lastRenderedTime < 0) {
          window.LOKAMAIN_LIVE_DATA = fresh;
          renderPublicCatalog();
        }
      }
    } catch (_) {
      // Tetap tampilkan data yang sudah ada.
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderPublicCatalog();
    refreshFromServer(true);
    // Link langsung ke jenjang, mis. rnaltdigital.my.id/#sd
    if (LEVEL_KEYS.includes((location.hash || '').replace('#', '').toUpperCase())) {
      setTimeout(() => $('katalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }

    // Dari halaman detail: ?pesan=ID langsung membuka jendela pesan
    const wanted = new URLSearchParams(location.search).get('pesan');
    if (wanted && (currentStore || loadStore()).games.some((g) => g.id === wanted)) {
      setTimeout(() => openOrderDialog(wanted), 150);
    }

    setInterval(refreshFromServer, POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshFromServer();
    });

    // Menu mobile
    const toggle = $('hamburger-toggle');
    const menu = $('hamburger-menu');
    if (toggle && menu) {
      const setOpen = (open) => {
        menu.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
      };
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!menu.classList.contains('is-open'));
      });
      menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.site-header')) setOpen(false);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('is-open')) {
          setOpen(false);
          toggle.focus();
        }
      });
    }

    document.addEventListener('click', (e) => {
      const lvBtn = e.target.closest('[data-level]');
      if (lvBtn && !lvBtn.disabled) {
        activeLevel = lvBtn.getAttribute('data-level');
        try { sessionStorage.setItem('lokamain_level', activeLevel); } catch (_) { /* abaikan */ }
        try { history.replaceState(null, '', activeLevel === 'all' ? '#katalog' : `#${activeLevel.toLowerCase()}`); } catch (_) { /* abaikan */ }
        renderGrid(currentStore || loadStore());
        return;
      }
      const orderBtn = e.target.closest('[data-order]');
      if (orderBtn) {
        openOrderDialog(orderBtn.getAttribute('data-order'));
        return;
      }
      if (e.target.closest('[data-reload]')) refreshFromServer(true);
    });

    const dialog = $('order-dialog');
    if (dialog) {
      $('order-close')?.addEventListener('click', () => dialog.close());
      // tautan "Lihat tutorialnya" (ubah soal): tutup jendela pesan lalu gulir ke bagian tutorial
      $('order-soal-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        dialog.close();
        const t = $('ubah-soal');
        if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      });
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        document.body.style.overflow = '';
      });
    }
  });

  // Sinkron instan saat admin dibuka di browser yang sama
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key === 'lokamain_store_v1') renderPublicCatalog();
  });
  if ('BroadcastChannel' in window) {
    const bc = new BroadcastChannel('lokamain_sync');
    bc.onmessage = (ev) => {
      if (ev.data && Array.isArray(ev.data.games)) {
        window.LOKAMAIN_LIVE_DATA = ev.data;
        renderPublicCatalog();
      }
    };
  }
})();
