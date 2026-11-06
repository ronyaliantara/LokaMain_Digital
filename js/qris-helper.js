// QRIS EMVCo Helper for Dynamic Amount Injection & Parsing
// Standards: Bank Indonesia QRIS & EMVCo QR Code Specification for Payment Systems

(() => {
  // Standard CRC-16/CCITT-FALSE (ISO/IEC 13239, poly 0x1021, init 0xFFFF)
  function crc16(str) {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
      crc ^= str.charCodeAt(c) << 8;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Parse EMVCo TLV string into array of { id, len, value }
  function parseTLV(raw) {
    if (!raw || typeof raw !== 'string') return [];
    const tags = [];
    let i = 0;
    const s = raw.trim();
    while (i < s.length) {
      if (i + 4 > s.length) break;
      const id = s.slice(i, i + 2);
      const len = parseInt(s.slice(i + 2, i + 4), 10);
      if (isNaN(len) || i + 4 + len > s.length) break;
      const value = s.slice(i + 4, i + 4 + len);
      tags.push({ id, len, value });
      i += 4 + len;
    }
    return tags;
  }

  // Verify and parse QRIS payload info
  function inspectQris(raw) {
    if (!raw || typeof raw !== 'string') return { isValid: false };
    const clean = raw.trim();
    if (!clean.startsWith('000201')) return { isValid: false };

    const tags = parseTLV(clean);
    const tagMap = {};
    for (const t of tags) tagMap[t.id] = t.value;

    // Check CRC
    const crcTag = tagMap['63'];
    const bodyWithoutCrc = clean.slice(0, clean.lastIndexOf('6304') + 4);
    const calculatedCrc = crc16(bodyWithoutCrc);
    const isCrcValid = crcTag && crcTag.toUpperCase() === calculatedCrc;

    return {
      isValid: tags.length > 3,
      isCrcValid,
      isStatic: tagMap['01'] === '11',
      isDynamic: tagMap['01'] === '12',
      merchantName: tagMap['59'] || '',
      merchantCity: tagMap['60'] || '',
      postalCode: tagMap['61'] || '',
      currency: tagMap['53'] || '360',
      existingAmount: tagMap['54'] || '',
      raw: clean
    };
  }

  // Convert static QRIS string into dynamic QRIS with exact amount
  function makeDynamicQris(raw, amount) {
    if (!raw || typeof raw !== 'string') return '';
    const clean = raw.trim();
    if (!clean.startsWith('000201')) return '';

    const tags = parseTLV(clean);
    if (!tags.length) return '';

    // 1. Remove Tag 63 (CRC)
    const list = tags.filter((t) => t.id !== '63');

    // 2. Change Point of Initiation (Tag 01) to '12' (Dynamic)
    const tag01 = list.find((t) => t.id === '01');
    if (tag01) {
      tag01.value = '12';
      tag01.len = 2;
    } else {
      list.unshift({ id: '01', len: 2, value: '12' });
    }

    // 3. Remove existing Tag 54 (Amount) if any
    const without54 = list.filter((t) => t.id !== '54');

    // 4. Create new Tag 54 with integer amount
    const amtNum = Math.round(Number(amount) || 0);
    if (amtNum <= 0) return clean; // invalid amount, return original
    const amtStr = String(amtNum);
    const tag54 = { id: '54', len: amtStr.length, value: amtStr };

    // 5. Insert Tag 54 right after Tag 53 (Currency) or before Tag 58 (Country)
    const tag53Idx = without54.findIndex((t) => t.id === '53');
    const tag58Idx = without54.findIndex((t) => t.id === '58');

    if (tag53Idx !== -1) {
      without54.splice(tag53Idx + 1, 0, tag54);
    } else if (tag58Idx !== -1) {
      without54.splice(tag58Idx, 0, tag54);
    } else {
      without54.push(tag54);
    }

    // 6. Build payload string
    let payload = '';
    for (const t of without54) {
      const lenStr = String(t.value.length).padStart(2, '0');
      payload += t.id + lenStr + t.value;
    }
    payload += '6304';

    // 7. Calculate and append CRC
    const check = crc16(payload);
    return payload + check;
  }

  // Scan QR code from an Image / Canvas using jsQR
  function decodeQrFromImage(imgElement) {
    if (!window.jsQR) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.naturalWidth || imgElement.width;
      canvas.height = imgElement.naturalHeight || imgElement.height;
      if (!canvas.width || !canvas.height) return null;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'attemptBoth'
      });
      return code ? code.data : null;
    } catch (err) {
      console.warn('Gagal membaca QR dari gambar:', err);
      return null;
    }
  }

  // Generate QR Code data URL using qrcode-generator
  function generateQrDataUrl(text, cellSize = 6, margin = 4) {
    if (!window.qrcode) return '';
    try {
      // Type 0 = auto-detect type number based on text length
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createDataURL(cellSize, margin);
    } catch (err) {
      console.warn('Gagal membuat QR Code:', err);
      return '';
    }
  }

  window.QrisHelper = {
    crc16,
    parseTLV,
    inspectQris,
    makeDynamicQris,
    decodeQrFromImage,
    generateQrDataUrl
  };
})();

