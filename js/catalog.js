(() => {
  const {
    loadStore,
    formatIdr,
    normalizePhone,
    buildBuyerWhatsAppUrl
  } = window.LokaStore;

  let lastRenderedTime = 0;
  let currentStore = null;

  // Pesan WA dari pembeli setelah bayar QRIS (bukti bayar dilampirkan manual di chat)
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

  function openOrderDialog(gameId) {
    const store = currentStore || loadStore();
    const game = store.games.find((g) => g.id === gameId);
    if (!game) return;

    const settings = store.settings;
    const phone = normalizePhone(settings.whatsappNumber);
    const hasQris = Boolean(settings.qrisImage || settings.qrisRawPayload);

    document.getElementById('order-title').textContent = game.title;
    document.getElementById('order-price').textContent = `Rp ${formatIdr(game.price)}`;

    const qrisSection = document.getElementById('order-qris-section');
    const noQrisSection = document.getElementById('order-no-qris');
    const methodsSelector = document.getElementById('qris-methods-selector');
    const danaBtn = document.getElementById('method-dana-btn');
    const otherBtn = document.getElementById('method-other-btn');
    const qrisImg = document.getElementById('order-qris-img');
    const qrisBadge = document.getElementById('order-qris-badge');
    const qrisDownload = document.getElementById('order-qris-download');
    const qrisName = document.getElementById('order-qris-name');
    const waBtn = document.getElementById('order-wa-btn');
    const manualBox = document.getElementById('order-qris-manual-box');
    const manualPrice = document.getElementById('order-manual-price');
    const copyBtn = document.getElementById('order-copy-price-btn');

    if (hasQris) {
      qrisSection.hidden = false;
      noQrisSection.hidden = true;

      // 1. Siapkan QRIS Statis Asli (khusus DANA)
      const staticQrUrl = settings.qrisImage || '';

      // 2. Siapkan QRIS Dinamis Otomatis (khusus Bank & E-Wallet Lain)
      let dynamicQrUrl = '';
      const canMakeDynamic = settings.qrisDynamicEnabled !== false && settings.qrisRawPayload && window.QrisHelper;
      if (canMakeDynamic) {
        const dynPayload = window.QrisHelper.makeDynamicQris(settings.qrisRawPayload, game.price);
        if (dynPayload) {
          dynamicQrUrl = window.QrisHelper.generateQrDataUrl(dynPayload, 7, 4);
        }
      }

      // Tampilkan selektor jika kedua metode tersedia
      const hasBothMethods = Boolean(staticQrUrl && dynamicQrUrl);
      if (methodsSelector) {
        methodsSelector.style.display = hasBothMethods ? 'grid' : 'none';
      }

      // Tentukan metode awal: jika pembeli sebelumnya pernah pilih DANA atau Bank Lain, ingat pilihannya
      let savedPref = localStorage.getItem('lokamain_qris_pref') || 'other';
      if (!dynamicQrUrl) savedPref = 'dana';
      if (!staticQrUrl) savedPref = 'other';

      let currentMethod = savedPref;

      function setMethod(method) {
        currentMethod = method;
        try {
          localStorage.setItem('lokamain_qris_pref', method);
        } catch (_) {}

        if (method === 'dana') {
          // METODE 1: Aplikasi DANA (QRIS Biasa / Statis Asli)
          if (danaBtn) {
            danaBtn.classList.add('active', 'is-dana');
          }
          if (otherBtn) {
            otherBtn.classList.remove('active', 'is-other');
          }

          const srcToShow = staticQrUrl || dynamicQrUrl;
          qrisImg.src = srcToShow;
          qrisDownload.href = srcToShow;
          qrisDownload.download = `QRIS-DANA-LokaMain.jpg`;

          if (qrisBadge) {
            qrisBadge.style.display = 'none';
          }
          if (manualBox) {
            manualBox.style.display = 'flex';
            if (manualPrice) manualPrice.textContent = `Rp ${formatIdr(game.price)}`;
          }
        } else {
          // METODE 2: Bank / E-Wallet Lain (QRIS Nominal Otomatis)
          if (otherBtn) {
            otherBtn.classList.add('active', 'is-other');
          }
          if (danaBtn) {
            danaBtn.classList.remove('active', 'is-dana');
          }

          const srcToShow = dynamicQrUrl || staticQrUrl;
          qrisImg.src = srcToShow;
          qrisDownload.href = srcToShow;
          qrisDownload.download = `QRIS-${game.title.replace(/\s+/g, '-')}-Rp${game.price}.png`;

          if (dynamicQrUrl) {
            if (qrisBadge) {
              qrisBadge.style.display = 'inline-flex';
              qrisBadge.innerHTML = `✓ Nominal Otomatis Terisi: <strong>Rp ${formatIdr(game.price)}</strong>`;
            }
            if (manualBox) manualBox.style.display = 'none';
          } else {
            // Fallback jika tidak ada payload dinamis
            if (qrisBadge) qrisBadge.style.display = 'none';
            if (manualBox) {
              manualBox.style.display = 'flex';
              if (manualPrice) manualPrice.textContent = `Rp ${formatIdr(game.price)}`;
            }
          }
        }

        waBtn.textContent = 'Sudah Bayar, Kirim Bukti via WhatsApp';
        waBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(buildPaidMessage(game, settings, method))}`;
      }

      setMethod(currentMethod);

      if (danaBtn) {
        danaBtn.onclick = () => setMethod('dana');
      }
      if (otherBtn) {
        otherBtn.onclick = () => setMethod('other');
      }

      if (copyBtn) {
        copyBtn.onclick = () => {
          const amtToCopy = String(game.price);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(amtToCopy).then(() => {
              copyBtn.textContent = '✓ Tersalin!';
              setTimeout(() => { copyBtn.textContent = '📋 Salin'; }, 2000);
            }).catch(() => {
              prompt('Salin nominal pembayaran:', amtToCopy);
            });
          } else {
            prompt('Salin nominal pembayaran:', amtToCopy);
          }
        };
      }

      qrisName.textContent = settings.qrisName ? `a.n. ${settings.qrisName}` : '';
    } else {
      qrisSection.hidden = true;
      noQrisSection.hidden = false;
      if (qrisBadge) qrisBadge.style.display = 'none';
      waBtn.textContent = 'Pesan via WhatsApp';
      waBtn.href = buildBuyerWhatsAppUrl(game, settings);
    }

    document.getElementById('order-dialog').showModal();
  }

  function renderPublicCatalog() {
    const store = loadStore();
    currentStore = store;
    lastRenderedTime = Number(store.updatedAt || 0);

    const grid = document.getElementById('game-grid');
    const storeTitle = document.getElementById('display-store-name');
    const siteSubtitle = document.getElementById('display-site-subtitle');
    const siteLogo = document.getElementById('site-logo-img');
    const footerText = document.getElementById('display-footer-text');
    const footerNote = document.getElementById('display-footer-note');
    const footerWa = document.getElementById('footer-wa-info');

    const bannerPath = store.settings.logoImage || store.settings.bannerImage;
    if (siteLogo) {
      if (bannerPath) {
        siteLogo.src = bannerPath;
        siteLogo.style.display = 'block';
        if (storeTitle) storeTitle.style.display = 'none';
      } else {
        siteLogo.style.display = 'none';
        if (storeTitle) {
          storeTitle.style.display = 'block';
          storeTitle.textContent = store.settings.storeName || 'LokaMain Digital';
        }
      }
    } else if (storeTitle) {
      storeTitle.style.display = 'block';
      storeTitle.textContent = store.settings.storeName || 'LokaMain Digital';
    }

    if (siteSubtitle) {
      const sub = typeof store.settings.siteSubtitle === 'string'
        ? store.settings.siteSubtitle.trim()
        : '';
      if (sub) {
        siteSubtitle.textContent = sub;
        siteSubtitle.style.display = 'block';
      } else {
        siteSubtitle.textContent = '';
        siteSubtitle.style.display = 'none';
      }
    }

    if (footerText) {
      footerText.textContent = store.settings.footerText || `Hak Cipta © 2026 ${store.settings.storeName || 'LokaMain Digital'}. Pembelajaran Game Edukasi Interaktif.`;
    }

    if (footerNote) {
      footerNote.textContent = store.settings.footerNote || 'Semua game dapat dimainkan langsung di HP, Tablet, dan Komputer tanpa instalasi.';
    }

    if (footerWa) {
      footerWa.textContent = `Pemesanan & Bantuan via WhatsApp: +${normalizePhone(store.settings.whatsappNumber)}`;
    }

    if (!grid) return;

    grid.innerHTML = store.games
      .map((game) => {
        return `
          <article class="game-block">
            <img
              src="${game.image}"
              alt="${game.title}"
              class="game-thumb"
              loading="lazy"
            >
            <div class="game-info">
              <div>
                <h2 class="game-name">${game.title}</h2>
                <p class="game-price">Rp ${formatIdr(game.price)}</p>
                <p class="game-desc">${game.shortDesc || ''}</p>
              </div>

              <button type="button" class="btn-wa" data-order="${game.id}">
                Pesan Sekarang
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // Cek pembaruan otomatis dari file data/katalog-sync.js (berfungsi di file:// maupun localhost)
  function pollDiskSyncFile() {
    const oldScript = document.getElementById('live-sync-probe');
    if (oldScript) oldScript.remove();

    const s = document.createElement('script');
    s.id = 'live-sync-probe';
    s.src = `data/katalog-sync.js?t=${Date.now()}`;
    s.onload = () => {
      const diskTime = Number(window.LOKAMAIN_LIVE_DATA?.updatedAt || 0);
      if (diskTime > lastRenderedTime) {
        renderPublicCatalog();
      }
    };
    document.body.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderPublicCatalog();
    setInterval(pollDiskSyncFile, 2000);

    // Navigasi & Menu Garis 3
    const hamburgerBtn = document.getElementById('hamburger-toggle');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    if (hamburgerBtn && hamburgerMenu) {
      hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = hamburgerMenu.classList.toggle('is-open');
        hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      });

      hamburgerMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          hamburgerMenu.classList.remove('is-open');
          hamburgerBtn.setAttribute('aria-expanded', 'false');
        });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.hamburger-wrap')) {
          hamburgerMenu.classList.remove('is-open');
          hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    document.addEventListener('click', (e) => {
      const orderBtn = e.target.closest('[data-order]');
      if (orderBtn) openOrderDialog(orderBtn.getAttribute('data-order'));
    });

    const dialog = document.getElementById('order-dialog');
    document.getElementById('order-close')?.addEventListener('click', () => dialog.close());
    // Tutup saat klik area gelap di luar jendela
    dialog?.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  // Sinkronisasi instan via localStorage & BroadcastChannel
  window.addEventListener('storage', renderPublicCatalog);
  if ('BroadcastChannel' in window) {
    const bc = new BroadcastChannel('lokamain_sync');
    bc.onmessage = (ev) => {
      if (ev.data && ev.data.games) {
        window.LOKAMAIN_LIVE_DATA = ev.data;
        renderPublicCatalog();
      }
    };
  }
})();
