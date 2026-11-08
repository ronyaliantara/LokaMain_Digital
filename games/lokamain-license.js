/**
 * LokaMain Digital - Gerbang Lisensi Game (versi 2, tanda tangan digital)
 *
 * Pasang di game apa pun dengan 1 baris sebelum </body>:
 *   <script src="../lokamain-license.js"></script>
 *
 * Cara kerja:
 *  - Admin membuat link pembeli berisi token yang DITANDATANGANI dengan kunci privat (hanya ada di laptop admin).
 *  - Halaman ini hanya memegang kunci PUBLIK (games/lisensi-publik.json), jadi token tidak bisa dipalsukan.
 *  - Kode lisensi polos (tanpa tanda tangan) tidak membuka game.
 *  - Tidak ada layanan pihak ketiga dan tidak ada data pembeli yang dikirim ke luar.
 *
 * Batas yang jujur: situs ini statis, jadi gerbang ini tidak bisa mencegah orang teknis
 * yang sengaja membongkar kode halaman. Fungsinya menghalangi akses tanpa link resmi,
 * dan nama pembeli pada lencana membuat link yang disebar mudah dilacak.
 */
(function initLokaMainLicenseGate() {
  'use strict';

  var SCRIPT_URL = (document.currentScript && document.currentScript.src) || location.href;
  var DEFAULT_WA = '6287881258019';
  var STORE_KEY = 'lokamain_token_v2';
  var waNumber = DEFAULT_WA;

  function url(rel) { return new URL(rel, SCRIPT_URL).href; }

  // ---------- util ----------
  function b64urlToBytes(str) {
    var s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var publicKeyPromise = null;
  function getPublicKey() {
    if (!publicKeyPromise) {
      publicKeyPromise = fetch(url('lisensi-publik.json'), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('NO_KEY'); return r.json(); })
        .then(function (jwk) {
          return crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true },
            { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        });
    }
    return publicKeyPromise;
  }

  // Mengembalikan {licenseId, buyerName} jika tanda tangan sah, selain itu melempar error.
  async function verifyToken(token) {
    if (!(window.crypto && crypto.subtle)) throw new Error('NO_CRYPTO');
    var parts = String(token || '').trim().split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('BAD_TOKEN');
    var key = await getPublicKey();
    var ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key,
      b64urlToBytes(parts[1]), new TextEncoder().encode(parts[0]));
    if (!ok) throw new Error('BAD_TOKEN');
    var payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    if (!payload || !payload.l) throw new Error('BAD_TOKEN');
    return { licenseId: String(payload.l), buyerName: String(payload.n || 'Pembeli Resmi') };
  }

  function extractToken(text) {
    var v = String(text || '').trim();
    var m = v.match(/[?&](?:token|auth)=([A-Za-z0-9_.-]+)/);
    return m ? m[1] : v;
  }

  // ---------- tampilan ----------
  function injectUI() {
    if (document.getElementById('lokamain-gate-modal')) return;
    var style = document.createElement('style');
    style.textContent =
      '#lokamain-license-badge{position:fixed;top:12px;right:12px;z-index:99980;background:#e0e7ff;border:1.5px solid #4338ca;color:#3730a3;font:700 11px system-ui,-apple-system,sans-serif;padding:5px 10px;border-radius:99px;box-shadow:0 2px 6px rgba(0,0,0,.12);display:none;align-items:center;gap:6px;max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#lokamain-license-badge.is-verified{display:flex;background:#dcfce7;border-color:#15803d;color:#166534}' +
      '#lokamain-gate-modal{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.96);display:flex;align-items:center;justify-content:center;padding:14px;font-family:system-ui,-apple-system,sans-serif;box-sizing:border-box}' +
      '.lokamain-card{background:#fff;color:#0f172a;max-width:440px;width:100%;border-radius:18px;padding:24px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,.3);box-sizing:border-box}' +
      '.lokamain-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:10px;font:700 13px system-ui,sans-serif;cursor:pointer;border:none;text-decoration:none;box-sizing:border-box}' +
      '.lokamain-btn:focus-visible,#lokamain-gate-input:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}' +
      '.lokamain-btn-green{background:#15803d;color:#fff}.lokamain-btn-green:hover{background:#166534}' +
      '.lokamain-btn-wa{background:#0b535c;color:#fff;width:100%;font-size:14px}.lokamain-btn-wa:hover{background:#083e45}';
    document.head.appendChild(style);

    var badge = document.createElement('div');
    badge.id = 'lokamain-license-badge';
    badge.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:currentColor;flex:none"></span><span id="lokamain-badge-text"></span>';
    document.body.appendChild(badge);

    var gate = document.createElement('div');
    gate.id = 'lokamain-gate-modal';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'lokamain-gate-title');
    gate.innerHTML =
      '<div class="lokamain-card">' +
      '<h2 id="lokamain-gate-title" style="margin:0 0 4px;font-size:21px;font-weight:800">Game ini berlisensi</h2>' +
      '<p style="font-size:13px;color:#475569;margin:0 0 16px">Game Edukasi LokaMain Digital</p>' +
      '<div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:12px;text-align:left;margin-bottom:16px;font-size:12.5px;line-height:1.5;color:#334155">' +
      'Game ini hanya bisa dibuka lewat <strong>link khusus pembeli</strong> yang dikirim admin ke WhatsApp Anda. Buka link itu langsung, atau tempel di bawah.</div>' +
      '<div style="text-align:left;margin-bottom:16px"><label for="lokamain-gate-input" style="display:block;font-size:12px;font-weight:800;margin-bottom:6px">Tempel link atau token dari admin</label>' +
      '<div style="display:flex;gap:8px"><input id="lokamain-gate-input" type="text" autocomplete="off" placeholder="https://… atau token" style="flex:1;min-width:0;padding:8px 10px;border:2px solid #94a3b8;border-radius:8px;font:12.5px monospace">' +
      '<button id="lokamain-gate-btn" type="button" class="lokamain-btn lokamain-btn-green">Buka</button></div>' +
      '<div id="lokamain-gate-err" role="alert" style="display:none;color:#b91c1c;font-size:12.5px;font-weight:700;margin-top:6px"></div></div>' +
      '<div style="border-top:1px dashed #cbd5e1;padding-top:14px"><a id="lokamain-wa-link" href="#" target="_blank" rel="noopener" class="lokamain-btn lokamain-btn-wa">Pesan lisensi via WhatsApp</a></div>' +
      '<p style="font-size:11px;color:#64748b;margin:12px 0 0">LokaMain Digital © 2026</p></div>';
    document.body.appendChild(gate);
    setWaLink();
  }

  function setWaLink() {
    var a = document.getElementById('lokamain-wa-link');
    if (a) a.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent('Halo Admin LokaMain, saya ingin memesan lisensi resmi game ini');
  }

  function showError(msg) {
    var err = document.getElementById('lokamain-gate-err');
    if (err) { err.textContent = msg; err.style.display = 'block'; }
  }

  function explain(e) {
    var m = e && e.message;
    if (m === 'NO_CRYPTO') return 'Browser ini belum mengizinkan verifikasi. Buka lewat alamat https:// (bukan http://) atau perbarui browser.';
    if (m === 'NO_KEY') return 'Kunci verifikasi belum tersedia di web. Hubungi admin.';
    return 'Link atau token tidak valid. Pastikan Anda menempel link lengkap dari admin.';
  }

  function grant(info, token) {
    try { localStorage.setItem(STORE_KEY, token); } catch (_) {}
    var gate = document.getElementById('lokamain-gate-modal');
    if (gate) gate.remove();
    var badge = document.getElementById('lokamain-license-badge');
    var txt = document.getElementById('lokamain-badge-text');
    if (txt) txt.textContent = 'Lisensi: ' + info.buyerName;
    if (badge) {
      badge.classList.add('is-verified');
      badge.title = 'Lisensi resmi\nPembeli: ' + info.buyerName + '\nID: ' + info.licenseId;
    }
  }

  async function tryToken(raw, quiet) {
    try {
      var token = extractToken(raw);
      var info = await verifyToken(token);
      grant(info, token);
      return true;
    } catch (e) {
      if (!quiet) showError(explain(e));
      return false;
    }
  }

  async function start() {
    injectUI();
    fetch(url('../data/games.json'), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var n = d && d.settings && String(d.settings.whatsappNumber || '').replace(/\D/g, '');
        if (n) { waNumber = n.replace(/^0/, '62'); setWaLink(); }
      }).catch(function () {});

    var input = document.getElementById('lokamain-gate-input');
    var btn = document.getElementById('lokamain-gate-btn');
    var submit = function () {
      var v = (input.value || '').trim();
      if (!v) { showError('Tempel link atau token dari admin dulu.'); return; }
      tryToken(v, false);
    };
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

    // 1) token di link  2) token tersimpan dari kunjungan sebelumnya
    var params = new URLSearchParams(location.search);
    var fromUrl = params.get('token') || params.get('auth');
    if (fromUrl) {
      var ok = await tryToken(fromUrl, false);
      if (ok) { try { history.replaceState({}, document.title, location.pathname); } catch (_) {} }
      return;
    }
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (_) {}
    if (saved) {
      var good = await tryToken(saved, true);
      if (!good) { try { localStorage.removeItem(STORE_KEY); } catch (_) {} }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
