/**
 * LokaMain Digital - Engine Pengaman Lisensi & Anti-Pembajakan Otomatis
 * Pasang di game apa pun dengan menambahkan 1 baris sebelum </body>:
 * <script src="../lokamain-license.js"></script>
 */
(function initLokaMainLicenseEngine() {
  'use strict';

  const SECRET = 'LOKAMAIN_SECURE_AUTH_KEY_2026_V1';
  const WA_NUMBER = '6287881258019';

  function detectDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast|viera|webos|tizen|android tv/i.test(ua)) {
      return 'Smart TV';
    }
    if (/mobile|android|iphone|ipod/i.test(ua)) return 'Smartphone';
    if (/ipad|tablet/i.test(ua)) return 'Tablet';
    return 'Komputer / Laptop';
  }

  const LOKAMAIN_SECURITY = {
    fromBase64Url(b64) {
      try {
        let str = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return decodeURIComponent(Array.prototype.map.call(atob(str), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      } catch (e) {
        let str = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return atob(str);
      }
    },

    xorCipher(text, key) {
      let res = '';
      for (let i = 0; i < text.length; i++) {
        res += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return res;
    },

    computeHash(text) {
      let h1 = 5381, h2 = 2166136261;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        h1 = ((h1 << 5) + h1) ^ code;
        h2 = (h2 ^ code) * 16777619;
      }
      return Math.abs(h1).toString(36) + Math.abs(h2).toString(36);
    },

    verifyAndDecodeToken(token) {
      try {
        if (!token || typeof token !== 'string') return null;
        const decrypted = this.xorCipher(this.fromBase64Url(token.trim()), SECRET);
        const parsed = JSON.parse(decrypted);
        if (!parsed || !parsed.l || !parsed.s) return null;
        const expectedSig = this.computeHash(`${parsed.l}|${parsed.n || ''}|${SECRET}`);
        if (parsed.s !== expectedSig) return null;
        return { licenseId: parsed.l, buyerName: parsed.n || 'Pembeli Resmi', timestamp: parsed.t };
      } catch (e) {
        return null;
      }
    }
  };

  let licenseKey = '';
  let buyerName = '';
  let currentSessionId = 'SES_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  let sessionStartTime = Date.now();
  let isSessionKicked = false;
  let sseConnection = null;
  let pollingInterval = null;

  // Injeksi UI Gerbang Kunci & Badge Lisensi
  function injectSecurityUI() {
    if (document.getElementById('lokamain-gate-modal')) return;

    const style = document.createElement('style');
    style.id = 'lokamain-license-styles';
    style.textContent = `
      #lokamain-license-badge {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 99980;
        background: #e0e7ff;
        border: 1.5px solid #4338ca;
        color: #3730a3;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 99px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: auto;
      }
      #lokamain-license-badge.is-verified {
        background: #dcfce7;
        border-color: #15803d;
        color: #166534;
      }
      #lokamain-gate-modal, #lokamain-kicked-modal {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
        font-family: system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
      }
      .lokamain-card {
        background: #ffffff;
        color: #0f172a;
        max-width: 440px;
        width: 100%;
        border-radius: 18px;
        padding: 24px;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        box-sizing: border-box;
      }
      .lokamain-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        text-decoration: none;
        transition: transform 0.1s, background-color 0.15s;
        box-sizing: border-box;
      }
      .lokamain-btn:active { transform: scale(0.98); }
      .lokamain-btn-green { background: #16a34a; color: #ffffff; }
      .lokamain-btn-green:hover { background: #15803d; }
      .lokamain-btn-wa { background: #0b535c; color: #ffffff; width: 100%; padding: 12px; font-size: 14px; }
      .lokamain-btn-wa:hover { background: #083e45; }
    `;
    document.head.appendChild(style);

    const badge = document.createElement('div');
    badge.id = 'lokamain-license-badge';
    badge.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:currentColor;"></span><span id="lokamain-badge-text">Lisensi: Memverifikasi…</span>';
    document.body.appendChild(badge);

    const gate = document.createElement('div');
    gate.id = 'lokamain-gate-modal';
    gate.innerHTML = `
      <div class="lokamain-card">
        <div style="font-size: 44px; margin-bottom: 6px;">🔒</div>
        <h2 style="margin: 0 0 4px; font-size: 21px; font-weight: 800;">Akses Game Terkunci</h2>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">Game Edukasi Berlisensi Resmi LokaMain Digital</p>
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 12px; text-align: left; margin-bottom: 16px; font-size: 12px; line-height: 1.5; color: #334155;">
          <p style="margin: 0 0 4px; font-weight: 800; color: #0f172a;">🛡️ Lisensi Pembeli Resmi</p>
          <p style="margin: 0;">Game ini hanya dapat dimainkan melalui <strong>Link Khusus Pembeli</strong> yang dikirimkan Admin ke nomor WhatsApp Anda.</p>
        </div>
        <div style="text-align: left; margin-bottom: 16px;">
          <label style="display: block; font-size: 11.5px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Punya Token atau Kode Lisensi?</label>
          <div style="display: flex; gap: 8px;">
            <input id="lokamain-gate-input" type="text" placeholder="Tempel token atau kode lisensi..." style="flex: 1; padding: 8px 10px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 12.5px; font-family: monospace;">
            <button id="lokamain-gate-btn" type="button" class="lokamain-btn lokamain-btn-green">🔓 Buka</button>
          </div>
          <div id="lokamain-gate-err" style="display: none; color: #dc2626; font-size: 12px; font-weight: 700; margin-top: 6px;">
            ⚠️ Kode Lisensi / Token tidak valid atau salah!
          </div>
        </div>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 14px;">
          <a href="https://wa.me/${WA_NUMBER}?text=Halo%20Admin%20LokaMain,%20saya%20ingin%20memesan%20lisensi%20resmi%20game%20ini" target="_blank" class="lokamain-btn lokamain-btn-wa">
            💬 Pesan Lisensi Resmi via WhatsApp
          </a>
        </div>
        <p style="font-size: 11px; color: #94a3b8; margin: 12px 0 0;">LokaMain Digital © 2026 • Hak Cipta Dilindungi</p>
      </div>
    `;
    document.body.appendChild(gate);

    const kicked = document.createElement('div');
    kicked.id = 'lokamain-kicked-modal';
    kicked.style.display = 'none';
    kicked.innerHTML = `
      <div class="lokamain-card">
        <div style="font-size: 44px; margin-bottom: 6px;">⚠️</div>
        <h2 style="margin: 0 0 4px; font-size: 20px; font-weight: 800;">Akses Dialihkan ke Layar Lain</h2>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 14px;">Game dengan lisensi Anda baru saja dibuka di <strong id="lokamain-kicked-device" style="color: #ea580c;">perangkat lain</strong>.</p>
        <div style="background: #fef2f2; border: 1.5px solid #f87171; border-radius: 10px; padding: 10px; text-align: left; font-size: 12px; margin-bottom: 14px; color: #991b1b;">
          Demi keamanan lisensi resmi Anda, game tidak dapat dimainkan secara bersamaan di 2 layar sekaligus.
        </div>
        <button id="lokamain-reclaim-btn" type="button" class="lokamain-btn lokamain-btn-wa">🔄 Gunakan Kembali di Layar Ini</button>
      </div>
    `;
    document.body.appendChild(kicked);
  }

  function updateBadge(name, key) {
    const badge = document.getElementById('lokamain-license-badge');
    const txt = document.getElementById('lokamain-badge-text');
    if (!badge || !txt) return;
    const display = name || key || 'Resmi';
    txt.textContent = `Lisensi: ${display}`;
    badge.classList.add('is-verified');
    badge.title = `Lisensi Resmi Terverifikasi\nPembeli: ${name || '-'}\nID: ${key || '-'}\nStatus: Sesi Aktif`;
  }

  function claimActiveSession() {
    if (!licenseKey) return;
    const cleanTopic = 'lokamain_' + LOKAMAIN_SECURITY.computeHash(licenseKey.toUpperCase().trim());
    const payload = JSON.stringify({
      session: currentSessionId,
      device: detectDeviceType(),
      buyer: buyerName || 'Pembeli Resmi',
      time: Date.now()
    });

    try {
      sessionStorage.setItem('lokamain_active_key', licenseKey);
      sessionStorage.setItem('lokamain_active_buyer', buyerName);
    } catch (_) {}

    fetch(`https://ntfy.sh/${cleanTopic}`, {
      method: 'POST',
      body: payload,
      headers: { 'Title': 'ActiveClaim' }
    }).catch(() => {});
  }

  function handleIncomingClaim(dataStr) {
    try {
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      let msg = null;
      if (data.message) {
        try {
          msg = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
        } catch (_) {
          msg = { session: data.message };
        }
      }
      if (!msg || !msg.session) return;
      if (msg.session === currentSessionId) return;
      if (msg.time && msg.time < sessionStartTime - 3000) return;

      onKicked(msg.device || 'Perangkat Lain');
    } catch (_) {}
  }

  function listenRemoteSessions() {
    if (!licenseKey) return;
    const cleanTopic = 'lokamain_' + LOKAMAIN_SECURITY.computeHash(licenseKey.toUpperCase().trim());
    if (sseConnection) {
      try { sseConnection.close(); } catch (_) {}
    }
    try {
      sseConnection = new EventSource(`https://ntfy.sh/${cleanTopic}/sse`);
      sseConnection.onmessage = (event) => handleIncomingClaim(event.data);
      sseConnection.addEventListener('message', (event) => handleIncomingClaim(event.data));
    } catch (_) {}

    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      if (isSessionKicked || !licenseKey) return;
      fetch(`https://ntfy.sh/${cleanTopic}/json?poll=1`)
        .then(res => res.text())
        .then(text => {
          if (!text) return;
          const lines = text.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) handleIncomingClaim(line);
          }
        })
        .catch(() => {});
    }, 3000);
  }

  function onKicked(device) {
    isSessionKicked = true;
    const devEl = document.getElementById('lokamain-kicked-device');
    const kickModal = document.getElementById('lokamain-kicked-modal');
    if (devEl) devEl.textContent = device;
    if (kickModal) kickModal.style.display = 'flex';
  }

  function resumeSession() {
    isSessionKicked = false;
    currentSessionId = 'SES_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    sessionStartTime = Date.now();
    const kickModal = document.getElementById('lokamain-kicked-modal');
    if (kickModal) kickModal.style.display = 'none';
    claimActiveSession();
  }

  function grantAccess(key, name) {
    licenseKey = (key || '').toUpperCase().trim();
    buyerName = name || 'Pembeli Resmi';

    const gate = document.getElementById('lokamain-gate-modal');
    if (gate) gate.style.display = 'none';

    updateBadge(buyerName, licenseKey);
    claimActiveSession();
    listenRemoteSessions();
  }

  function startEvaluation() {
    injectSecurityUI();

    document.getElementById('lokamain-reclaim-btn')?.addEventListener('click', resumeSession);

    const params = new URLSearchParams(window.location.search);
    const rawToken = params.get('token') || params.get('auth');
    const directLic = (params.get('lisensi') || params.get('license') || params.get('pin') || '').trim();

    if (rawToken) {
      const verified = LOKAMAIN_SECURITY.verifyAndDecodeToken(rawToken);
      if (verified) {
        try {
          sessionStorage.setItem('lokamain_verified_token', rawToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
        grantAccess(verified.licenseId, verified.buyerName);
        return;
      }
    } else if (directLic) {
      const dName = (params.get('nama') || 'Pembeli Resmi').trim();
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (_) {}
      grantAccess(directLic, dName);
      return;
    } else {
      const cachedToken = sessionStorage.getItem('lokamain_verified_token');
      if (cachedToken) {
        const verified = LOKAMAIN_SECURITY.verifyAndDecodeToken(cachedToken);
        if (verified) {
          grantAccess(verified.licenseId, verified.buyerName);
          return;
        }
      }
      const cachedKey = sessionStorage.getItem('lokamain_active_key');
      const cachedBuyer = sessionStorage.getItem('lokamain_active_buyer');
      if (cachedKey) {
        grantAccess(cachedKey, cachedBuyer);
        return;
      }
    }

    // Gerbang kunci tetap aktif
    const input = document.getElementById('lokamain-gate-input');
    const btn = document.getElementById('lokamain-gate-btn');
    const err = document.getElementById('lokamain-gate-err');

    const tryUnlock = () => {
      let val = (input?.value || '').trim();
      if (!val) {
        if (err) { err.textContent = '⚠️ Masukkan kode lisensi atau tempel link Anda!'; err.style.display = 'block'; }
        return;
      }
      if (val.includes('token=')) {
        const m = val.match(/token=([a-zA-Z0-9_-]+)/);
        if (m && m[1]) val = m[1];
      }
      const verified = LOKAMAIN_SECURITY.verifyAndDecodeToken(val);
      if (verified) {
        try { sessionStorage.setItem('lokamain_verified_token', val); } catch (_) {}
        grantAccess(verified.licenseId, verified.buyerName);
        return;
      }
      if (val.length >= 3) {
        grantAccess(val, 'Pembeli Resmi');
        return;
      }
      if (err) {
        err.textContent = '⚠️ Kode lisensi / token tidak valid!';
        err.style.display = 'block';
      }
    };

    btn?.addEventListener('click', tryUnlock);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEvaluation);
  } else {
    startEvaluation();
  }
})();
