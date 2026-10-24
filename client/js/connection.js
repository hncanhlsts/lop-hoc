/**
 * CONNECTION.JS - Kết nối thời gian thực siêu tốc qua MQTT WebSocket (EMQX Cloud)
 * Hoàn toàn miễn phí, độ trễ < 50ms, không phụ thuộc vào NAT hay STUN/TURN, chạy mượt trên mọi mạng 4G/Wi-Fi!
 */

const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';

class SlideConnection {
  constructor(options = {}) {
    this.client = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.studentName = 'Học sinh';
    this.studentId = 'hs_' + Math.random().toString(36).substring(2, 9);
    this.roomCode = '';
    this.pingInterval = null;

    // Callbacks
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onSlideUpdate = options.onSlideUpdate || (() => {});
    this.onStreamUpdate = options.onStreamUpdate || (() => {});
    this.onQuizStart = options.onQuizStart || (() => {});
    this.onQuizEnd = options.onQuizEnd || (() => {});
    this.onQuizReveal = options.onQuizReveal || (() => {});
    this.onStarAward = options.onStarAward || (() => {});
  }

  connect(roomCode, studentName, isDemo = false) {
    this.studentName = studentName || 'Học sinh';
    this.roomCode = (roomCode || '1234').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    this.isDemoMode = isDemo;

    if (this.isDemoMode) {
      this.initDemoMode();
      return;
    }

    this.onStatusChange('connecting', `Đang kết nối tới lớp [${this.roomCode.toUpperCase()}]...`);

    try {
      if (this.client) {
        this.client.end(true);
      }

      const clientId = `classlive_std_${this.studentId}_${Date.now()}`;
      this.client = mqtt.connect(MQTT_BROKER, {
        clientId: clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 2500
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.onStatusChange('connected', `🟢 Đã vào lớp [${this.roomCode.toUpperCase()}] • Đang đồng bộ`);
        console.log('[Học sinh] Đã kết nối thành công tới MQTT Broker!');

        // Đăng ký các kênh nhận dữ liệu của phòng này
        const baseTopic = `classlive/hncanhlsts/${this.roomCode}`;
        this.client.subscribe([
          `${baseTopic}/slide`,
          `${baseTopic}/quiz`,
          `${baseTopic}/quiz_reveal`,
          `${baseTopic}/star/${this.studentId}`
        ], { qos: 0 });

        // Gửi thông tin điểm danh tới giáo viên
        this.sendPresence();

        // Gửi nhịp tim định kỳ mỗi 8s để duy trì trạng thái có mặt
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => this.sendPresence(), 8000);
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          this.handleMessage(topic, payload);
        } catch (e) {
          console.error('Lỗi phân tích gói tin:', e);
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        this.onStatusChange('disconnected', 'Mất kết nối mạng. Đang tự động kết nối lại...');
      });

      this.client.on('error', (err) => {
        console.warn('Lỗi MQTT:', err);
      });

    } catch (e) {
      console.error('Không thể khởi tạo MQTT client:', e);
      this.onStatusChange('error', 'Lỗi mạng.');
    }
  }

  handleMessage(topic, data) {
    const subTopic = topic.split('/').pop();

    if (topic.endsWith('/slide')) {
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
      }
    } else if (topic.endsWith('/quiz_reveal')) {
      this.onQuizReveal(data);
    } else if (topic.includes('/star/')) {
      this.onStarAward(data);
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
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = accentColor;
    ctx.fillRect(60, 60, 8, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.fillText(title, 85, 98);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '26px monospace, sans-serif';
    const lines = content.split('\n');
    let y = 190;
    for (const line of lines) {
      ctx.fillText(line, 80, y);
      y += 42;
    }
    return canvas.toDataURL('image/png');
  }
}
