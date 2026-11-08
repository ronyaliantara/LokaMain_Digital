/**
 * ==========================================================================
 * pose.js - MediaPipe Pose Kinesthetic Detection Engine
 * Versi Lite (@mediapipe/pose) untuk performa ringan & responsif (30-60 FPS)
 * ==========================================================================
 */

class KinestheticPoseEngine {
  constructor(options = {}) {
    // Dual-Player Screen Elements (Layar 1: P1 & Layar 2: P2)
    this.videoElementP1 = options.videoElementP1 || document.getElementById('webcamVideoP1');
    this.videoElementP2 = options.videoElementP2 || document.getElementById('webcamVideoP2');
    this.canvasElementP1 = options.canvasElementP1 || document.getElementById('poseCanvasP1');
    this.canvasElementP2 = options.canvasElementP2 || document.getElementById('poseCanvasP2');

    this.videoElement = options.videoElement || this.videoElementP1;
    this.canvasElement = options.canvasElement || this.canvasElementP1;

    // Pemain yang sedang aktif mengontrol gerakan (1 atau 2)
    this.activePlayer = 1;

    // Mode Deteksi: 'IDLE', 'DICE_ROLL', 'QUIZ', 'SQUAT', 'CLIMB'
    this.currentMode = 'IDLE';

    // State Pelacakan
    this.pose = null;
    this.camera = null;
    this.isCameraRunning = false;
    this.landmarks = null;

    // Callbacks dari game engine
    this.callbacks = {
      onArmsUp: null,
      onZoneHover: null,
      onZoneSelect: null,
      onSquatSuccess: null,
      onClimbStep: null,
      onClimbComplete: null,
      onCameraStatus: null,
      onPoseUpdate: null
    };

    // Variabel Deteksi Kuis (Dwell Timer 1.5s)
    this.activeZone = null; // 'A' | 'B' | null
    this.dwellStartTime = 0;
    this.dwellDuration = 1500; // 1.5 detik
    this.dwellProgress = 0; // 0.0 sampai 1.0
    this.quizLocked = false;

    // Variabel Deteksi Jongkok (Squat)
    this.baselineHipY = null;
    this.baselineNoseY = null;
    this.squatThreshold = 0.08; // penurunan vertikal (turun = nilai y membesar)
    this.squatTriggered = false;

    // Variabel Deteksi Memanjat (Climb 4 reps)
    this.climbCount = 0;
    this.targetClimbReps = 4;
    this.lastClimbedArm = null; // 'left' | 'right'
    this.climbCooldown = 0;

    // Debounce timer
    this.lastActionTime = 0;

    // Binding
    this.onResults = this.onResults.bind(this);
  }

  /**
   * Menetapkan pemain mana yang sedang aktif mengontrol gerakan (1 atau 2)
   */
  setActivePlayer(playerNum) {
    this.activePlayer = playerNum;
    this.syncCanvasSize();
  }

  /**
   * Inisialisasi MediaPipe Pose & Kamera
   */
  async init() {
    try {
      this.notifyStatus('Menghubungkan ke MediaPipe Pose...', 'info');

      if (typeof Pose === 'undefined') {
        throw new Error('Pustaka MediaPipe Pose belum termuat dari CDN.');
      }

      this.pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      // Konfigurasi model Lite untuk performa 30-60 FPS
      this.pose.setOptions({
        modelComplexity: 0, // 0 = Lite (sangat cepat & hemat CPU/GPU)
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.pose.onResults(this.onResults);

      await this.startCamera();
      return true;
    } catch (err) {
      console.error('Inisialisasi MediaPipe Pose Gagal:', err);
      this.notifyStatus(`Kamera/Pose Error: ${err.message}`, 'error');
      return false;
    }
  }

  /**
   * Menjalankan stream kamera webcam untuk kedua layar (P1 & P2)
   */
  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.stream = stream;

      // Pasang stream kamera ke Layar Pemain 1
      if (this.videoElementP1) {
        this.videoElementP1.srcObject = stream;
        this.videoElementP1.play().catch(() => {});
      }

      // Pasang stream kamera ke Layar Pemain 2
      if (this.videoElementP2) {
        this.videoElementP2.srcObject = stream;
        this.videoElementP2.play().catch(() => {});
      }

      // Fallback jika single video
      if (this.videoElement && this.videoElement !== this.videoElementP1) {
        this.videoElement.srcObject = stream;
        this.videoElement.play().catch(() => {});
      }

      const primaryVideo = this.videoElementP1 || this.videoElement;
      await new Promise((resolve) => {
        if (primaryVideo.readyState >= 1) {
          resolve();
        } else {
          primaryVideo.onloadedmetadata = () => resolve();
        }
      });

      this.syncCanvasSize();
      window.addEventListener('resize', () => this.syncCanvasSize());

      // Loop pengiriman frame ke MediaPipe
      this.isCameraRunning = true;
      this.notifyStatus('Kamera Siap (Layar P1 & P2 Aktif)!', 'success');

      const processFrame = async () => {
        if (!this.isCameraRunning) return;
        const currentVideo = (this.activePlayer === 2 && this.videoElementP2) ? this.videoElementP2 : primaryVideo;
        if (currentVideo && currentVideo.readyState >= 2) {
          try {
            await this.pose.send({ image: currentVideo });
          } catch (e) {
            // tangani frame drop wajar saat switching
          }
        }
        requestAnimationFrame(processFrame);
      };

      requestAnimationFrame(processFrame);
    } catch (error) {
      console.warn('Gagal mengakses webcam secara langsung:', error);
      this.notifyStatus('Izin kamera ditolak atau kamera tidak tersedia.', 'warning');
      throw error;
    }
  }

  /**
   * Sesuaikan ukuran canvas dengan viewport video kedua layar
   */
  syncCanvasSize() {
    const pairs = [
      { video: this.videoElementP1, canvas: this.canvasElementP1 },
      { video: this.videoElementP2, canvas: this.canvasElementP2 },
      { video: this.videoElement, canvas: this.canvasElement }
    ];

    pairs.forEach(pair => {
      if (pair.video && pair.canvas) {
        const rect = pair.video.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          pair.canvas.width = rect.width;
          pair.canvas.height = rect.height;
        }
      }
    });
  }

  /**
   * Ubah Mode Gerakan Aktif
   * @param {string} mode - 'IDLE' | 'DICE_ROLL' | 'QUIZ' | 'SQUAT' | 'CLIMB'
   */
  setMode(mode, options = {}) {
    this.currentMode = mode;
    this.activeZone = null;
    this.dwellStartTime = 0;
    this.dwellProgress = 0;
    this.quizLocked = false;
    this.squatTriggered = false;

    const p1A = document.getElementById('p1TargetBoxA');
    const p1B = document.getElementById('p1TargetBoxB');
    const p2A = document.getElementById('p2TargetBoxA');
    const p2B = document.getElementById('p2TargetBoxB');

    // Sembunyikan semua target box terlebih dahulu
    [p1A, p1B, p2A, p2B].forEach(b => b?.classList.add('hidden', 'active-zone'));

    if (mode === 'QUIZ') {
      const activeA = this.activePlayer === 1 ? p1A : p2A;
      const activeB = this.activePlayer === 1 ? p1B : p2B;
      activeA?.classList.remove('hidden', 'active-zone');
      activeB?.classList.remove('hidden', 'active-zone');
    }

    if (mode === 'SQUAT') {
      // Kalibrasi baseline pinggul saat awal tantangan
      if (this.landmarks && this.landmarks[23] && this.landmarks[24]) {
        this.baselineHipY = (this.landmarks[23].y + this.landmarks[24].y) / 2;
        this.baselineNoseY = this.landmarks[0] ? this.landmarks[0].y : null;
      } else {
        this.baselineHipY = 0.55; // estimasi fallback
        this.baselineNoseY = 0.25;
      }
    }

    if (mode === 'CLIMB') {
      this.climbCount = 0;
      this.lastClimbedArm = null;
      this.climbCooldown = 0;
      this.targetClimbReps = options.targetReps || 4;
    }
  }

  /**
   * Tangani hasil deteksi landmark dari MediaPipe
   */
  onResults(results) {
    // Tentukan canvas pemain aktif dan non-aktif
    const activeCanvas = this.activePlayer === 1 ? (this.canvasElementP1 || this.canvasElement) : (this.canvasElementP2 || this.canvasElement);
    const inactiveCanvas = this.activePlayer === 1 ? this.canvasElementP2 : this.canvasElementP1;

    // Bersihkan canvas pemain yang sedang standby
    if (inactiveCanvas && inactiveCanvas !== activeCanvas) {
      const inCtx = inactiveCanvas.getContext('2d');
      if (inCtx) inCtx.clearRect(0, 0, inactiveCanvas.width, inactiveCanvas.height);
    }

    if (!activeCanvas) return;
    const ctx = activeCanvas.getContext('2d');
    if (!ctx) return;

    const width = activeCanvas.width;
    const height = activeCanvas.height;

    // Bersihkan canvas overlay pemain aktif
    ctx.clearRect(0, 0, width, height);

    if (!results || !results.poseLandmarks) {
      this.landmarks = null;
      if (this.callbacks.onPoseUpdate) {
        this.callbacks.onPoseUpdate({ detected: false });
      }
      return;
    }

    this.landmarks = results.poseLandmarks;

    if (this.callbacks.onPoseUpdate) {
      this.callbacks.onPoseUpdate({ detected: true, landmarks: this.landmarks });
    }

    // Gambar kerangka (skeleton) pada layar pemain yang sedang aktif
    this.drawSkeleton(ctx, this.landmarks, width, height);

    // Jika sedang dalam kuis dan ada zone aktif, gambar dwell ring
    if (this.currentMode === 'QUIZ' && this.activeZone && this.dwellProgress > 0) {
      this.drawDwellRing(ctx, this.activeZone, this.dwellProgress, width, height);
    }

    // Proses logika gestur sesuai mode aktif
    const now = Date.now();
    switch (this.currentMode) {
      case 'DICE_ROLL':
        this.processDiceRoll(now);
        break;
      case 'QUIZ':
        this.processQuizChoice(now, width, height);
        break;
      case 'SQUAT':
        this.processSquat(now);
        break;
      case 'CLIMB':
        this.processClimb(now);
        break;
      default:
        break;
    }
  }

  /**
   * Logika 1: Kocok Dadu (Arms Up / Angkat Tangan di atas Hidung)
   * Kedua pergelangan tangan (wrist) berada lebih tinggi dari hidung (nose.y)
   */
  processDiceRoll(now) {
    if (now - this.lastActionTime < 1500) return; // cooldown

    const nose = this.landmarks[0];
    const leftWrist = this.landmarks[15];
    const rightWrist = this.landmarks[16];

    if (!nose || !leftWrist || !rightWrist) return;

    // Validasi visibility
    const visible = (leftWrist.visibility || 1) > 0.4 && (rightWrist.visibility || 1) > 0.4;
    if (!visible) return;

    // Nilai Y: 0 adalah paling atas layar, 1 paling bawah layar.
    // Tangan di atas hidung berarti wrist.y < nose.y
    const isLeftArmUp = leftWrist.y < nose.y;
    const isRightArmUp = rightWrist.y < nose.y;

    if (isLeftArmUp && isRightArmUp) {
      this.lastActionTime = now;
      if (this.callbacks.onArmsUp) {
        this.callbacks.onArmsUp();
      }
    }
  }

  /**
   * Logika 2: Milih Jawaban Kuis (Pose Memilih Jawaban A atau B)
   * Menggunakan KOTAK TARGET SASARAN (Box Target) terbatas dan HANYA tangan (wrist)
   * agar kepala, hidung, atau gerakan tubuh lain tidak memicu salah pilih.
   */
  processQuizChoice(now, width, height) {
    if (this.quizLocked) return;

    const leftWrist = this.landmarks[15];
    const rightWrist = this.landmarks[16];

    const p1A = document.getElementById('p1TargetBoxA');
    const p1B = document.getElementById('p1TargetBoxB');
    const p2A = document.getElementById('p2TargetBoxA');
    const p2B = document.getElementById('p2TargetBoxB');

    const boxAEl = this.activePlayer === 1 ? p1A : p2A;
    const boxBEl = this.activePlayer === 1 ? p1B : p2B;

    // Koordinat Kotak Sasaran A (Sisi Kiri layar) dan B (Sisi Kanan layar)
    // Dibatasi area vertikal dada/tangan (Y: 0.22 s.d. 0.68) dan X di pinggir
    const boxA = { minX: 0.03, maxX: 0.28, minY: 0.22, maxY: 0.68 };
    const boxB = { minX: 0.72, maxX: 0.97, minY: 0.22, maxY: 0.68 };

    // HANYA pergelangan tangan (wrist) yang dihitung (menghindari salah deteksi kepala/badan)
    const candidates = [];
    if (leftWrist && (leftWrist.visibility || 1) > 0.4) {
      candidates.push({ x: 1 - leftWrist.x, y: leftWrist.y });
    }
    if (rightWrist && (rightWrist.visibility || 1) > 0.4) {
      candidates.push({ x: 1 - rightWrist.x, y: rightWrist.y });
    }

    let detectedZone = null;
    for (const c of candidates) {
      if (c.x >= boxA.minX && c.x <= boxA.maxX && c.y >= boxA.minY && c.y <= boxA.maxY) {
        detectedZone = 'A';
        break;
      } else if (c.x >= boxB.minX && c.x <= boxB.maxX && c.y >= boxB.minY && c.y <= boxB.maxY) {
        detectedZone = 'B';
        break;
      }
    }

    if (detectedZone) {
      if (detectedZone === 'A') {
        boxAEl?.classList.add('active-zone');
        boxBEl?.classList.remove('active-zone');
      } else {
        boxBEl?.classList.add('active-zone');
        boxAEl?.classList.remove('active-zone');
      }

      if (this.activeZone !== detectedZone) {
        // Ganti zona yang dipilih, reset timer dwell
        this.activeZone = detectedZone;
        this.dwellStartTime = now;
        this.dwellProgress = 0;
        if (this.callbacks.onZoneHover) {
          this.callbacks.onZoneHover({
            zone: detectedZone,
            progress: 0
          });
        }
      } else {
        // Melanjutkan dwell
        const elapsed = now - this.dwellStartTime;
        this.dwellProgress = Math.min(1.0, elapsed / this.dwellDuration);

        // Gambar animasi lingkaran dwell di layar webcam pemain aktif
        const activeCanvas = this.activePlayer === 1 ? (this.canvasElementP1 || this.canvasElement) : (this.canvasElementP2 || this.canvasElement);
        const activeCtx = activeCanvas ? activeCanvas.getContext('2d') : this.ctx;
        if (activeCtx) {
          this.drawDwellRing(activeCtx, detectedZone, this.dwellProgress, width, height);
        }

        if (this.callbacks.onZoneHover) {
          this.callbacks.onZoneHover({
            zone: detectedZone,
            progress: this.dwellProgress
          });
        }

        // Kunci pilihan jika dwell selesai 1.5 detik
        if (this.dwellProgress >= 1.0) {
          this.quizLocked = true;
          boxAEl?.classList.remove('active-zone');
          boxBEl?.classList.remove('active-zone');
          if (this.callbacks.onZoneSelect) {
            this.callbacks.onZoneSelect(detectedZone);
          }
        }
      }
    } else {
      // Netral di tengah
      boxAEl?.classList.remove('active-zone');
      boxBEl?.classList.remove('active-zone');
      this.activeZone = null;
      this.dwellStartTime = 0;
      this.dwellProgress = 0;
      if (this.callbacks.onZoneHover) {
        this.callbacks.onZoneHover({ zone: null, progress: 0 });
      }
    }
  }

  /**
   * Logika 3: Tantangan Ular (Refleks Jongkok / Squat)
   * Deteksi penurunan koordinat vertikal pinggul (hip landmark 23, 24)
   */
  processSquat(now) {
    if (this.squatTriggered) return;

    const leftHip = this.landmarks[23];
    const rightHip = this.landmarks[24];
    const nose = this.landmarks[0];

    if (!leftHip || !rightHip) return;

    const currentHipY = (leftHip.y + rightHip.y) / 2;
    const currentNoseY = nose ? nose.y : null;

    // Nilai Y bertambah saat posisi tubuh merendah / jongkok
    const hipDrop = currentHipY - this.baselineHipY;
    const noseDrop = (currentNoseY && this.baselineNoseY) ? (currentNoseY - this.baselineNoseY) : 0;

    // Ambang batas penurunan pinggul atau kepala
    if (hipDrop > this.squatThreshold || noseDrop > 0.12) {
      this.squatTriggered = true;
      if (this.callbacks.onSquatSuccess) {
        this.callbacks.onSquatSuccess();
      }
    }
  }

  /**
   * Logika 4: Tantangan Tangga (Gerakan Memanjat 4 Kali)
   * Tangan kiri dan kanan bergantian naik ke atas bahu lalu turun
   */
  processClimb(now) {
    if (this.climbCount >= this.targetClimbReps) return;
    if (now - this.climbCooldown < 400) return; // cegah hitungan ganda cepat

    const leftWrist = this.landmarks[15];
    const rightWrist = this.landmarks[16];
    const leftShoulder = this.landmarks[11];
    const rightShoulder = this.landmarks[12];
    const nose = this.landmarks[0];

    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;

    // Ketinggian referensi bahu/hidung
    const shoulderRefY = (leftShoulder.y + rightShoulder.y) / 2;

    const leftHandHigh = leftWrist.y < shoulderRefY;
    const rightHandHigh = rightWrist.y < shoulderRefY;

    // Gerakan bergantian tangan kiri & kanan
    if (leftHandHigh && !rightHandHigh && this.lastClimbedArm !== 'left') {
      this.lastClimbedArm = 'left';
      this.climbCount++;
      this.climbCooldown = now;
      if (this.callbacks.onClimbStep) {
        this.callbacks.onClimbStep(this.climbCount, this.targetClimbReps);
      }
    } else if (rightHandHigh && !leftHandHigh && this.lastClimbedArm !== 'right') {
      this.lastClimbedArm = 'right';
      this.climbCount++;
      this.climbCooldown = now;
      if (this.callbacks.onClimbStep) {
        this.callbacks.onClimbStep(this.climbCount, this.targetClimbReps);
      }
    }

    if (this.climbCount >= this.targetClimbReps) {
      if (this.callbacks.onClimbComplete) {
        this.callbacks.onClimbComplete();
      }
    }
  }

  /**
   * Gambar skeleton/rangka tubuh transparan bercahaya (Neon Glow)
   */
  drawSkeleton(ctx, landmarks, width, height) {
    ctx.save();

    // Sesuaikan transform dengan video yang di-mirror horizontal
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    // Pasangan koneksi tulang tubuh MediaPipe
    const connections = [
      // Bahu & Dada
      [11, 12],
      // Lengan Kiri
      [11, 13], [13, 15],
      // Lengan Kanan
      [12, 14], [14, 16],
      // Pinggul
      [23, 24],
      // Tubuh/Torso
      [11, 23], [12, 24],
      // Kaki Kiri
      [23, 25], [25, 27],
      // Kaki Kanan
      [24, 26], [26, 28]
    ];

    // Gambar Garis Sambungan Tulang
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)'; // Electric Cyan
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 8;

    connections.forEach(([p1, p2]) => {
      const pt1 = landmarks[p1];
      const pt2 = landmarks[p2];
      if (pt1 && pt2 && (pt1.visibility || 1) > 0.4 && (pt2.visibility || 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(pt1.x * width, pt1.y * height);
        ctx.lineTo(pt2.x * width, pt2.y * height);
        ctx.stroke();
      }
    });

    // Gambar Sendi (Joints)
    landmarks.forEach((pt, index) => {
      if (!pt || (pt.visibility || 1) < 0.4) return;

      const px = pt.x * width;
      const py = pt.y * height;

      // Beri warna khusus pada pergelangan tangan (wrists 15, 16)
      if (index === 15 || index === 16) {
        const isUp = pt.y < (landmarks[0] ? landmarks[0].y : 0.3);
        ctx.fillStyle = isUp ? '#22c55e' : '#f59e0b';
        ctx.shadowColor = isUp ? '#15803d' : '#d97706';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else if (index === 23 || index === 24) {
        // Pinggul (Hips)
        ctx.fillStyle = '#ec4899'; // Pink
        ctx.shadowColor = '#be185d';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (index <= 10) {
        // Wajah / Hidung
        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sendi biasa
        ctx.fillStyle = '#38bdf8';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  /**
   * Gambar Lingkaran Dwell Progress di Zona Pilihan (A / B)
   */
  drawDwellRing(ctx, zone, progress, width, height) {
    ctx.save();

    // Posisi target pada layar mirrored
    // Zona A = Sisi Kiri layar (15% lebar)
    // Zona B = Sisi Kanan layar (85% lebar)
    const centerX = zone === 'A' ? width * 0.16 : width * 0.84;
    const centerY = height * 0.45;
    const radius = 38;

    // Background lingkaran
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    // Busur progress lingkaran
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * progress);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#10b981'; // Emerald
    ctx.shadowColor = '#059669';
    ctx.shadowBlur = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Teks di tengah
    ctx.font = 'bold 20px Fredoka, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(`${Math.round(progress * 100)}%`, centerX, centerY);

    ctx.restore();
  }

  notifyStatus(message, type = 'info') {
    if (this.callbacks.onCameraStatus) {
      this.callbacks.onCameraStatus(message, type);
    }
  }
}

// Ekspor ke window global
window.KinestheticPoseEngine = KinestheticPoseEngine;

