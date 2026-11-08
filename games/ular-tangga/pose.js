/**
 * ==========================================================================
 * pose.js - MediaPipe Pose Kinesthetic Detection Engine (Dual-Screen Ready)
 * Dioptimalkan untuk 4 Pemain dengan Dua Layar Sensor (Layar Kiri & Layar Kanan),
 * Bebas Macet (Throttled Frame Pipeline ~18 FPS, 0% CPU saat Idle),
 * serta Deteksi Squat (Jongkok Berulang) untuk Hukuman Ular.
 * ==========================================================================
 */

class KinestheticPoseEngine {
  constructor(options = {}) {
    // Dual Camera Viewports (Layar Kiri: P1 & P3 | Layar Kanan: P2 & P4)
    this.videoElementLeft = options.videoElementLeft || document.getElementById('webcamVideoLeft') || document.getElementById('webcamVideoP1') || document.getElementById('webcamVideo');
    this.videoElementRight = options.videoElementRight || document.getElementById('webcamVideoRight') || document.getElementById('webcamVideoP2') || document.getElementById('webcamVideo');
    this.canvasElementLeft = options.canvasElementLeft || document.getElementById('poseCanvasLeft') || document.getElementById('poseCanvasP1') || document.getElementById('poseCanvas');
    this.canvasElementRight = options.canvasElementRight || document.getElementById('poseCanvasRight') || document.getElementById('poseCanvasP2') || document.getElementById('poseCanvas');

    // Default pointer ke elemen aktif
    this.videoElement = this.videoElementLeft;
    this.canvasElement = this.canvasElementLeft;

    // Pemain aktif (1, 2, 3, atau 4)
    this.activePlayer = 1;
    this.activeSide = 'LEFT'; // 'LEFT' (P1 & P3) atau 'RIGHT' (P2 & P4)

    // Mode Deteksi: 'IDLE', 'DICE_ROLL', 'QUIZ', 'SQUAT', 'CLIMB'
    this.currentMode = 'IDLE';

    // State Pelacakan MediaPipe
    this.pose = null;
    this.stream = null;
    this.isCameraRunning = false;
    this.isCameraEnabled = true;
    this.isProcessing = false; // Mencegah penumpukan frame WebAssembly
    this.lastFrameTime = 0;
    this.minFrameInterval = 55; // ~18 FPS (sangat responsif & hemat CPU/GPU hingga 75%)
    this.landmarks = null;

    // Callbacks ke game engine
    this.callbacks = {
      onArmsUp: null,
      onZoneHover: null,
      onZoneSelect: null,
      onSquatRep: null,
      onSquatSuccess: null,
      onClimbStep: null,
      onClimbComplete: null,
      onCameraStatus: null,
      onPoseUpdate: null
    };

    // Deteksi Kuis (Dwell Timer 1.3 detik)
    this.activeZone = null; // 'A' | 'B' | null
    this.dwellStartTime = 0;
    this.dwellDuration = 1300;
    this.dwellProgress = 0;
    this.quizLocked = false;

    // Deteksi Jongkok (Squat) Berulang untuk Hukuman Ular
    this.baselineHipY = null;
    this.baselineNoseY = null;
    this.squatThreshold = 0.07;
    this.squatState = 'UP'; // 'UP' -> 'DOWN' -> 'UP' (1 rep)
    this.squatReps = 0;
    this.targetSquatReps = 3;
    this.lastSquatTime = 0;

    // Deteksi Memanjat Tangga (Climb 4 reps)
    this.climbCount = 0;
    this.targetClimbReps = 4;
    this.lastClimbedArm = null;
    this.climbCooldown = 0;

    // Debounce
    this.lastActionTime = 0;

    // Binding
    this.onResults = this.onResults.bind(this);
    this.processLoop = this.processLoop.bind(this);
  }

  /**
   * Set pemain aktif yang sedang mengontrol (1, 2, 3, atau 4)
   * Otomatis menentukan sisi aktif:
   * P1 (Biru) & P3 (Hijau)  -> Sisi Kiri (LEFT)
   * P2 (Merah) & P4 (Ungu) -> Sisi Kanan (RIGHT)
   */
  setActivePlayer(playerNum) {
    this.activePlayer = playerNum;
    this.activeSide = (playerNum === 2 || playerNum === 4) ? 'RIGHT' : 'LEFT';
    this.videoElement = (this.activeSide === 'RIGHT') ? this.videoElementRight : this.videoElementLeft;
    this.canvasElement = (this.activeSide === 'RIGHT') ? this.canvasElementRight : this.canvasElementLeft;
    this.syncCanvasSize();
  }

  /**
   * Inisialisasi MediaPipe Pose Lite & Jalankan Kamera
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

      // Model Lite (Complexity 0) hemat daya & tidak membuat browser macet
      this.pose.setOptions({
        modelComplexity: 0,
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
      console.warn('Inisialisasi Kamera/Pose Gagal:', err);
      this.notifyStatus(`Kamera AI tidak aktif (Gunakan tombol klik/manual)`, 'warning');
      return false;
    }
  }

  /**
   * Mengaktifkan stream kamera webcam tunggal yang diproyeksikan ke kedua layar (Kiri & Kanan)
   */
  async startCamera() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia tidak didukung pada browser ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.stream = stream;

      // Hubungkan video stream ke Layar Sensor Kiri
      const vLeft = this.videoElementLeft || document.getElementById('webcamVideoLeft');
      if (vLeft) {
        vLeft.srcObject = stream;
        await vLeft.play().catch(() => {});
      }

      // Hubungkan video stream ke Layar Sensor Kanan
      const vRight = this.videoElementRight || document.getElementById('webcamVideoRight');
      if (vRight) {
        vRight.srcObject = stream;
        await vRight.play().catch(() => {});
      }

      // Fallback single webcam
      const vSingle = document.getElementById('webcamVideo');
      if (vSingle && vSingle !== vLeft && vSingle !== vRight) {
        vSingle.srcObject = stream;
        await vSingle.play().catch(() => {});
      }

      this.syncCanvasSize();
      window.addEventListener('resize', () => this.syncCanvasSize());

      this.isCameraRunning = true;
      this.isCameraEnabled = true;
      this.notifyStatus('AI Kamera Dual Sensor Aktif (~18 FPS)', 'success');

      // Mulai loop pemrosesan frame
      requestAnimationFrame(this.processLoop);
    } catch (error) {
      console.warn('Gagal mengakses kamera:', error);
      this.isCameraRunning = false;
      this.notifyStatus('Mode Manual / Tanpa Kamera', 'warning');
      throw error;
    }
  }

  /**
   * Matikan atau Nyalakan Kamera (Power Saving Switch)
   */
  toggleCamera(forceState) {
    const newState = forceState !== undefined ? forceState : !this.isCameraEnabled;
    this.isCameraEnabled = newState;

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.enabled = newState;
      });
    }

    if (newState) {
      this.notifyStatus('AI Kamera Aktif', 'success');
      if (!this.isCameraRunning) {
        this.isCameraRunning = true;
        requestAnimationFrame(this.processLoop);
      }
    } else {
      this.notifyStatus('Kamera Dimatikan (Mode Hemat Daya)', 'info');
      // Bersihkan canvas kiri dan kanan
      [this.canvasElementLeft, this.canvasElementRight].forEach(canvas => {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }

    return this.isCameraEnabled;
  }

  /**
   * Loop pemrosesan frame: Throttled & Non-Blocking
   */
  async processLoop() {
    if (!this.isCameraRunning) return;

    if (this.isCameraEnabled && this.pose) {
      const now = performance.now();
      if (!this.isProcessing && (now - this.lastFrameTime >= this.minFrameInterval)) {
        const activeVideo = (this.activeSide === 'RIGHT' && this.videoElementRight) 
          ? this.videoElementRight 
          : (this.videoElementLeft || this.videoElement);

        if (activeVideo && activeVideo.readyState >= 2 && this.currentMode !== 'IDLE') {
          this.isProcessing = true;
          this.lastFrameTime = now;
          try {
            await this.pose.send({ image: activeVideo });
          } catch (e) {
            // Drop frame jika terjadi switching
          } finally {
            this.isProcessing = false;
          }
        }
      }
    }

    requestAnimationFrame(this.processLoop);
  }

  /**
   * Sesuaikan resolusi canvas dengan video pada kedua sisi (Kiri & Kanan)
   */
  syncCanvasSize() {
    const pairs = [
      { video: this.videoElementLeft || document.getElementById('webcamVideoLeft'), canvas: this.canvasElementLeft || document.getElementById('poseCanvasLeft') },
      { video: this.videoElementRight || document.getElementById('webcamVideoRight'), canvas: this.canvasElementRight || document.getElementById('poseCanvasRight') }
    ];

    pairs.forEach(({ video, canvas }) => {
      if (video && canvas) {
        const w = video.videoWidth || video.clientWidth || 480;
        const h = video.videoHeight || video.clientHeight || 360;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
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

    const leftA = document.getElementById('leftTargetBoxA');
    const leftB = document.getElementById('leftTargetBoxB');
    const rightA = document.getElementById('rightTargetBoxA');
    const rightB = document.getElementById('rightTargetBoxB');

    // Hapus kelas aktif dari semua target box
    [leftA, leftB, rightA, rightB].forEach(b => b?.classList.remove('active-zone'));

    if (mode === 'QUIZ') {
      if (this.activeSide === 'LEFT') {
        leftA?.classList.remove('hidden');
        leftB?.classList.remove('hidden');
        rightA?.classList.add('hidden');
        rightB?.classList.add('hidden');
      } else {
        rightA?.classList.remove('hidden');
        rightB?.classList.remove('hidden');
        leftA?.classList.add('hidden');
        leftB?.classList.add('hidden');
      }
    } else {
      leftA?.classList.add('hidden');
      leftB?.classList.add('hidden');
      rightA?.classList.add('hidden');
      rightB?.classList.add('hidden');
    }

    if (mode === 'SQUAT') {
      this.squatReps = 0;
      this.targetSquatReps = options.targetReps || 3;
      this.squatState = 'UP';
      this.lastSquatTime = 0;

      if (this.landmarks && this.landmarks[23] && this.landmarks[24]) {
        this.baselineHipY = (this.landmarks[23].y + this.landmarks[24].y) / 2;
        this.baselineNoseY = this.landmarks[0] ? this.landmarks[0].y : 0.25;
      } else {
        this.baselineHipY = 0.55;
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
   * Callback hasil deteksi pose MediaPipe
   */
  onResults(results) {
    const cLeft = this.canvasElementLeft || document.getElementById('poseCanvasLeft');
    const cRight = this.canvasElementRight || document.getElementById('poseCanvasRight');

    // Bersihkan canvas kedua layar
    if (cLeft) {
      const ctxL = cLeft.getContext('2d');
      if (ctxL) ctxL.clearRect(0, 0, cLeft.width, cLeft.height);
    }
    if (cRight) {
      const ctxR = cRight.getContext('2d');
      if (ctxR) ctxR.clearRect(0, 0, cRight.width, cRight.height);
    }

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

    // Gambar skeleton hanya pada LAYAR SENSOR AKTIF
    const activeCanvas = (this.activeSide === 'RIGHT') ? cRight : cLeft;
    if (activeCanvas && this.currentMode !== 'IDLE') {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) {
        this.drawSkeleton(ctx, this.landmarks, activeCanvas.width, activeCanvas.height);

        // Gambar animasi dwell ring jika sedang memilih kuis
        if (this.currentMode === 'QUIZ' && this.activeZone && this.dwellProgress > 0) {
          this.drawDwellRing(ctx, this.activeZone, this.dwellProgress, activeCanvas.width, activeCanvas.height);
        }
      }
    }

    // Proses gestur kinestetik
    const now = Date.now();
    switch (this.currentMode) {
      case 'DICE_ROLL':
        this.processDiceRoll(now);
        break;
      case 'QUIZ':
        this.processQuizChoice(now);
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
   * Gerakan 1: Lempar Dadu (Angkat Kedua Tangan di atas Hidung)
   */
  processDiceRoll(now) {
    if (now - this.lastActionTime < 1400) return;

    const nose = this.landmarks[0];
    const leftWrist = this.landmarks[15];
    const rightWrist = this.landmarks[16];

    if (!nose || !leftWrist || !rightWrist) return;

    const visible = (leftWrist.visibility || 1) > 0.35 && (rightWrist.visibility || 1) > 0.35;
    if (!visible) return;

    // Y = 0 adalah puncak layar. Tangan di atas hidung = wrist.y < nose.y
    const isLeftArmUp = leftWrist.y < (nose.y + 0.05);
    const isRightArmUp = rightWrist.y < (nose.y + 0.05);

    if (isLeftArmUp && isRightArmUp) {
      this.lastActionTime = now;
      if (this.callbacks.onArmsUp) {
        this.callbacks.onArmsUp();
      }
    }
  }

  /**
   * Gerakan 2: Milih Jawaban Kuis (Tangan Kiri -> Kotak A, Tangan Kanan -> Kotak B)
   * Koordinat normalized (0..1) pada mirrored canvas disesuaikan dengan box visual
   */
  processQuizChoice(now) {
    if (this.quizLocked) return;

    const leftWrist = this.landmarks[15];
    const rightWrist = this.landmarks[16];

    // Elemen target box pada layar aktif
    const boxAEl = (this.activeSide === 'RIGHT') 
      ? document.getElementById('rightTargetBoxA') 
      : document.getElementById('leftTargetBoxA');
    const boxBEl = (this.activeSide === 'RIGHT') 
      ? document.getElementById('rightTargetBoxB') 
      : document.getElementById('leftTargetBoxB');

    // Area target sasaran (koordinat normalized 0..1 pada mirrored canvas)
    // Box A: Sisi Kiri Layar (0.02 - 0.38)
    // Box B: Sisi Kanan Layar (0.62 - 0.98)
    const boxA = { minX: 0.02, maxX: 0.38, minY: 0.18, maxY: 0.82 };
    const boxB = { minX: 0.62, maxX: 0.98, minY: 0.18, maxY: 0.82 };

    const candidates = [];
    if (leftWrist && (leftWrist.visibility || 1) > 0.30) {
      candidates.push({ x: 1 - leftWrist.x, y: leftWrist.y });
    }
    if (rightWrist && (rightWrist.visibility || 1) > 0.30) {
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
        this.activeZone = detectedZone;
        this.dwellStartTime = now;
        this.dwellProgress = 0;
        if (this.callbacks.onZoneHover) {
          this.callbacks.onZoneHover({ zone: detectedZone, progress: 0 });
        }
      } else {
        const elapsed = now - this.dwellStartTime;
        this.dwellProgress = Math.min(1.0, elapsed / this.dwellDuration);

        if (this.callbacks.onZoneHover) {
          this.callbacks.onZoneHover({ zone: detectedZone, progress: this.dwellProgress });
        }

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
   * Gerakan 3: Hukuman Ular (Jongkok Berulang / Squat Reps)
   */
  processSquat(now) {
    if (this.squatReps >= this.targetSquatReps) return;
    if (now - this.lastSquatTime < 600) return; // Cooldown antar rep

    const leftHip = this.landmarks[23];
    const rightHip = this.landmarks[24];
    const nose = this.landmarks[0];

    if (!leftHip && !nose) return;

    let currentY = 0;
    if (leftHip && rightHip) {
      currentY = (leftHip.y + rightHip.y) / 2;
    } else if (nose) {
      currentY = nose.y;
    }

    if (!this.baselineHipY) {
      this.baselineHipY = currentY;
      return;
    }

    const drop = currentY - this.baselineHipY;

    // FASE 1: Badan merendah (Jongkok)
    if (this.squatState === 'UP' && drop > this.squatThreshold) {
      this.squatState = 'DOWN';
    }
    // FASE 2: Badan kembali berdiri tegak -> Selesai 1 Repetisi!
    else if (this.squatState === 'DOWN' && drop < (this.squatThreshold * 0.45)) {
      this.squatState = 'UP';
      this.squatReps++;
      this.lastSquatTime = now;

      if (this.callbacks.onSquatRep) {
        this.callbacks.onSquatRep(this.squatReps, this.targetSquatReps);
      }

      if (this.squatReps >= this.targetSquatReps) {
        if (this.callbacks.onSquatSuccess) {
          this.callbacks.onSquatSuccess();
        }
      }
    }
  }

  /**
   * Gerakan 4: Panjat Tangga (Tangan Kiri & Kanan Bergantian Naik)
   */
  processClimb(now) {
    if (this.climbCount >= this.targetClimbReps) return;
    if (now - this.climbCooldown < 400) return;

    const leftWrist = this.landmarks[15];
    const rightWrist = this.landmarks[16];
    const leftShoulder = this.landmarks[11];
    const rightShoulder = this.landmarks[12];

    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;

    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const leftUp = leftWrist.y < shoulderY;
    const rightUp = rightWrist.y < shoulderY;

    if (leftUp && !rightUp && this.lastClimbedArm !== 'left') {
      this.lastClimbedArm = 'left';
      this.climbCount++;
      this.climbCooldown = now;
      if (this.callbacks.onClimbStep) {
        this.callbacks.onClimbStep(this.climbCount, this.targetClimbReps);
      }
    } else if (rightUp && !leftUp && this.lastClimbedArm !== 'right') {
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
   * Gambar Skeleton / Rangka Tubuh bercahaya neon ramah kinerja
   */
  drawSkeleton(ctx, landmarks, width, height) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    const connections = [
      [11, 12], [11, 13], [13, 15],
      [12, 14], [14, 16],
      [23, 24], [11, 23], [12, 24],
      [23, 25], [25, 27],
      [24, 26], [26, 28]
    ];

    // Warna tema skeleton sesuai pemain aktif
    const playerColors = {
      1: { stroke: 'rgba(59, 130, 246, 0.90)', glow: '#2563eb' }, // Biru
      2: { stroke: 'rgba(239, 68, 68, 0.90)',  glow: '#dc2626' }, // Merah
      3: { stroke: 'rgba(16, 185, 129, 0.90)', glow: '#059669' }, // Hijau
      4: { stroke: 'rgba(168, 85, 247, 0.90)', glow: '#7c3aed' }  // Ungu
    };
    const activeColor = playerColors[this.activePlayer] || playerColors[1];

    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = activeColor.stroke;
    ctx.shadowColor = activeColor.glow;
    ctx.shadowBlur = 8;

    connections.forEach(([p1, p2]) => {
      const pt1 = landmarks[p1];
      const pt2 = landmarks[p2];
      if (pt1 && pt2 && (pt1.visibility || 1) > 0.35 && (pt2.visibility || 1) > 0.35) {
        ctx.beginPath();
        ctx.moveTo(pt1.x * width, pt1.y * height);
        ctx.lineTo(pt2.x * width, pt2.y * height);
        ctx.stroke();
      }
    });

    // Gambar titik sendi penting (Tangan & Pinggul)
    const keyJoints = [15, 16, 23, 24, 0];
    keyJoints.forEach((idx) => {
      const pt = landmarks[idx];
      if (!pt || (pt.visibility || 1) < 0.35) return;
      const px = pt.x * width;
      const py = pt.y * height;

      ctx.beginPath();
      ctx.arc(px, py, idx === 15 || idx === 16 ? 9 : 5, 0, Math.PI * 2);
      ctx.fillStyle = idx === 15 || idx === 16 ? '#22c55e' : '#ffffff';
      ctx.shadowColor = idx === 15 || idx === 16 ? '#22c55e' : '#ffffff';
      ctx.shadowBlur = 6;
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Lingkaran timer Dwell Progress
   */
  drawDwellRing(ctx, zone, progress, width, height) {
    ctx.save();
    const centerX = zone === 'A' ? width * 0.18 : width * 0.82;
    const centerY = height * 0.50;
    const radius = 36;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * progress);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#10b981';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.font = 'bold 16px Fredoka, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(progress * 100)}%`, centerX, centerY);
    ctx.restore();
  }

  notifyStatus(message, type = 'info') {
    if (this.callbacks.onCameraStatus) {
      this.callbacks.onCameraStatus(message, type);
    }
  }
}

window.KinestheticPoseEngine = KinestheticPoseEngine;
