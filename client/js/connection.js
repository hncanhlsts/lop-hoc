/**
 * CONNECTION.JS - Bộ kết nối ổn định cao qua MQTT WebSocket
 * Tự động chuyển đổi giữa các Cloud Broker uy tín (HiveMQ / EMQX)
 * Tiết kiệm băng thông, không bị nghẽn mạng hay khóa kết nối.
 */

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

class SlideConnection {
  constructor(options = {}) {
    this.client = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.studentName = 'Học sinh';
    this.studentId = 'hs_' + Math.random().toString(36).substring(2, 9);
    this.roomCode = '';
    this.brokerIndex = 0;
    this.pingTimer = null;

    // Callbacks
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onSlideUpdate = options.onSlideUpdate || (() => {});
    this.onStreamUpdate = options.onStreamUpdate || (() => {});
    this.onSessionModeChange = options.onSessionModeChange || (() => {});
    this.onQuizStart = options.onQuizStart || (() => {});
    this.onQuizEnd = options.onQuizEnd || (() => {});
    this.onQuizDismiss = options.onQuizDismiss || (() => {});
    this.onQuizReveal = options.onQuizReveal || (() => {});
    this.onStarAward = options.onStarAward || (() => {});
    this.onKick = options.onKick || (() => {});
    this.onLaserMove = options.onLaserMove || (() => {});
  }

  connect(roomCode, studentName, isDemo = false) {
    this.studentName = studentName || 'Học sinh';
    this.roomCode = (roomCode || '1234').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    this.isDemoMode = isDemo;

    if (this.isDemoMode) {
      this.initDemoMode();
      return;
    }

    this.connectToBroker(0);
  }

  connectToBroker(index) {
    this.brokerIndex = index % BROKERS.length;
    const currentBroker = BROKERS[this.brokerIndex];

    this.onStatusChange('connecting', `Đang kết nối tới lớp [${this.roomCode.toUpperCase()}]...`);

    try {
      if (this.client) {
        this.client.end(true);
        this.client = null;
      }

      const clientId = `std_${this.studentId}_${Math.floor(Math.random() * 10000)}`;
      this.client = mqtt.connect(currentBroker, {
        clientId: clientId,
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 3000
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.onStatusChange('connected', `🟢 Đã vào lớp [${this.roomCode.toUpperCase()}] • Chờ Thầy/Cô phát bài`);
        console.log('[Học sinh] Đã kết nối Broker:', currentBroker);

        const baseTopic = `classlive/hncanhlsts/${this.roomCode}`;
        this.client.subscribe([
          `${baseTopic}/slide`,
          `${baseTopic}/session_mode`,
          `${baseTopic}/quiz`,
          `${baseTopic}/quiz_reveal`,
          `${baseTopic}/laser`,
          `${baseTopic}/star/${this.studentId}`,
          `${baseTopic}/kick/${this.studentId}`
        ], { qos: 0 });

        // Gửi thông tin điểm danh & yêu cầu lấy slide hiện tại
        this.sendPresence();
        this.requestCurrentSlide();
        setTimeout(() => this.requestCurrentSlide(), 1000);
        setTimeout(() => this.requestCurrentSlide(), 2500);

        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => this.sendPresence(), 10000);
      });

      this.client.on('message', (topic, message) => {
        try {
          const text = (typeof TextDecoder !== 'undefined') 
            ? new TextDecoder('utf-8').decode(message) 
            : message.toString();
          const payload = JSON.parse(text);
          this.handleIncoming(topic, payload);
        } catch (e) {
          console.error('Lỗi đọc dữ liệu:', e);
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        this.onStatusChange('disconnected', 'Mạng đang chậm. Đang kết nối lại...');
      });

      this.client.on('error', (err) => {
        console.warn('Lỗi kết nối Broker:', err);
        // Thử chuyển sang broker dự phòng sau 3 giây
        setTimeout(() => {
          if (!this.isConnected && !this.isDemoMode) {
            this.connectToBroker(this.brokerIndex + 1);
          }
        }, 3000);
      });

    } catch (e) {
      console.error('Lỗi khởi tạo MQTT:', e);
      this.onStatusChange('error', 'Lỗi mạng.');
    }
  }

  handleIncoming(topic, data) {
    if (topic.endsWith('/session_mode')) {
      this.onSessionModeChange(data);
    } else if (topic.endsWith('/slide')) {
      if (data.imageUrl) {
        this.onSlideUpdate({
          slideNumber: data.slideNumber || 1,
          totalSlides: data.totalSlides || 1,
          imageUrl: data.imageUrl
        });
      }
    } else if (topic.endsWith('/quiz')) {
      if (data.action === 'start') {
        this.onQuizStart(data);
      } else if (data.action === 'stop') {
        this.onQuizEnd(data);
      } else if (data.action === 'dismiss') {
        this.onQuizDismiss(data);
      }
    } else if (topic.endsWith('/laser')) {
      this.onLaserMove(data);
    } else if (topic.endsWith('/quiz_reveal')) {
      this.onQuizReveal(data);
    } else if (topic.includes('/star/')) {
      this.onStarAward(data);
    } else if (topic.includes('/kick/')) {
      this.onKick(data);
    }
  }

  sendPresence(isHandRaised = false) {
    if (!this.client || !this.isConnected) return;
    const topic = `classlive/hncanhlsts/${this.roomCode}/student/${this.studentId}`;
    this.client.publish(topic, JSON.stringify({
      id: this.studentId,
      name: this.studentName,
      isHandRaised: isHandRaised,
      time: Date.now()
    }), { qos: 0 });
  }

  requestCurrentSlide() {
    if (!this.client || !this.isConnected) return;
    const topic = `classlive/hncanhlsts/${this.roomCode}/request_slide`;
    this.client.publish(topic, JSON.stringify({
      from: this.studentId,
      time: Date.now()
    }), { qos: 0 });
  }

  sendReaction(reaction) {
    if (!this.client || !this.isConnected) return;
    const topic = `classlive/hncanhlsts/${this.roomCode}/reaction`;
    this.client.publish(topic, JSON.stringify({
      id: this.studentId,
      name: this.studentName,
      reaction: reaction,
      time: Date.now()
    }), { qos: 0 });
  }

  sendRaiseHand(isRaised) {
    this.sendPresence(isRaised);
  }

  submitAnswer(answer) {
    if (!this.client || !this.isConnected) return;
    const topic = `classlive/hncanhlsts/${this.roomCode}/answer/${this.studentId}`;
    this.client.publish(topic, JSON.stringify({
      id: this.studentId,
      name: this.studentName,
      answer: answer,
      time: Date.now()
    }), { qos: 0 });
  }

  retry() {
    this.connectToBroker(this.brokerIndex + 1);
  }

  disconnect() {
    this.isConnected = false;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
    if (this.client) {
      try {
        this.client.end(true);
      } catch (e) {}
      this.client = null;
    }
  }

  initDemoMode() {
    this.isDemoMode = true;
    this.onStatusChange('connected', 'Chế độ Trải nghiệm mẫu (Demo)');

    this.demoSlides = [
      this.createDemoSlide(1, 4, "CHỦ ĐỀ: PHƯƠNG TRÌNH BẬC HAI", "ax² + bx + c = 0 (a ≠ 0)\n\nCông thức Delta (Δ):\nΔ = b² - 4ac\n\n• Δ > 0: Có 2 nghiệm phân biệt\n  x₁,₂ = (-b ± √Δ) / 2a\n• Δ = 0: Có nghiệm kép\n  x₁ = x₂ = -b / 2a\n• Δ < 0: Vô nghiệm", "#1e1b4b", "#6366f1"),
      this.createDemoSlide(2, 4, "VÍ DỤ ÁP DỤNG", "Giải: 2x² - 5x + 2 = 0\n\na = 2, b = -5, c = 2\nΔ = (-5)² - 4(2)(2) = 25 - 16 = 9 > 0\n√Δ = 3\n\nNghiệm:\nx₁ = (5 + 3) / 4 = 2\nx₂ = (5 - 3) / 4 = 1/2", "#064e3b", "#10b981"),
      this.createDemoSlide(3, 4, "CÂU HỎI TRẮC NGHIỆM", "Phương trình nào sau đây có nghiệm kép?\n\nA. x² - 4x + 4 = 0\nB. x² - 3x + 2 = 0\nC. 2x² + x + 1 = 0\nD. x² - 5x = 0", "#701a75", "#d946ef"),
      this.createDemoSlide(4, 4, "TỔNG KẾT BÀI HỌC", "1. Ghi nhớ công thức Delta\n2. Bài tập về nhà: Bài 1, 2 trang 45 SGK\n\nChúc các em học tốt!", "#1e293b", "#38bdf8")
    ];

    this.currentDemoIndex = 0;
    this.broadcastCurrentDemoSlide();

    this.demoInterval = setInterval(() => {
      this.currentDemoIndex = (this.currentDemoIndex + 1) % this.demoSlides.length;
      this.broadcastCurrentDemoSlide();
    }, 10000);
  }

  broadcastCurrentDemoSlide() {
    const slide = this.demoSlides[this.currentDemoIndex];
    this.onSlideUpdate({
      slideNumber: this.currentDemoIndex + 1,
      totalSlides: this.demoSlides.length,
      imageUrl: slide
    });
  }

  createDemoSlide(index, total, title, content, bgColor, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 1024, 576);
    ctx.fillStyle = accentColor;
    ctx.fillRect(50, 50, 6, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px -apple-system, sans-serif';
    ctx.fillText(title, 70, 80);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px monospace, sans-serif';
    const lines = content.split('\n');
    let y = 150;
    for (const line of lines) {
      ctx.fillText(line, 60, y);
      y += 36;
    }
    return canvas.toDataURL('image/jpeg', 0.7);
  }
}

if (typeof window !== 'undefined') {
  window.SlideConnection = SlideConnection;
}
