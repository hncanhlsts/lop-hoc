/**
 * CONNECTION.JS - Quản lý kết nối thời gian thực (WebSocket & Demo Mode)
 * Tự động kết nối lại khi mất mạng, nhận ảnh slide từ PowerPoint và gửi phản hồi.
 */

class SlideConnection {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || this.getDefaultServerUrl();
    this.ws = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.reconnectTimer = null;
    this.roomCode = null;
    this.studentName = null;

    // Event callbacks
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onSlideUpdate = options.onSlideUpdate || (() => {});
    this.onQuizStart = options.onQuizStart || (() => {});
    this.onQuizEnd = options.onQuizEnd || (() => {});
  }

  getDefaultServerUrl() {
    // Nếu chạy trên máy cục bộ, kết nối ws://localhost:3000
    // Nếu chạy trên GitHub Pages, kết nối tới WebSocket Cloud URL được cấu hình
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `ws://${window.location.hostname}:3000`;
    }
    // Mặc định URL Cloud WebSocket (có thể thay đổi linh hoạt)
    return `wss://classpoint-live.onrender.com`;
  }

  connect(roomCode, studentName, isDemo = false) {
    this.roomCode = roomCode;
    this.studentName = studentName;
    this.isDemoMode = isDemo;

    if (this.isDemoMode) {
      this.initDemoMode();
      return;
    }

    try {
      this.onStatusChange('connecting', 'Đang kết nối tới lớp học...');
      this.ws = new WebSocket(`${this.serverUrl}?room=${roomCode}&name=${encodeURIComponent(studentName)}`);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.onStatusChange('connected', 'Đang đồng bộ trực tiếp');
        // Gửi gói tin gia nhập
        this.send({
          type: 'JOIN_CLASS',
          roomCode: this.roomCode,
          name: this.studentName
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (e) {
          console.error('Lỗi phân tích gói tin server:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onStatusChange('disconnected', 'Mất kết nối. Đang thử lại...');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket gặp lỗi, tự động chuyển chế độ thử nghiệm nếu cần:', err);
      };

    } catch (e) {
      console.warn('Không thể tạo kết nối WebSocket:', e);
      this.onStatusChange('disconnected', 'Không tìm thấy server. Chuyển sang Demo.');
      this.initDemoMode();
    }
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case 'SLIDE_CHANGE':
        // Cập nhật slide mới: { slideNumber, totalSlides, imageUrl }
        this.onSlideUpdate({
          slideNumber: msg.slideNumber,
          totalSlides: msg.totalSlides || 1,
          imageUrl: msg.imageUrl
        });
        break;

      case 'QUIZ_START':
        // Giáo viên kích hoạt câu hỏi: { quizId, question, options, timeLimit }
        this.onQuizStart(msg);
        break;

      case 'QUIZ_END':
        this.onQuizEnd(msg);
        break;

      case 'NOTIFICATION':
        if (window.showToast) window.showToast(msg.text);
        break;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else if (this.isDemoMode) {
      console.log('[Demo Mode] Đã gửi dữ liệu giả lập:', data);
    }
  }

  // Gửi hành động giơ tay
  sendRaiseHand(isRaised) {
    this.send({
      type: 'RAISE_HAND',
      roomCode: this.roomCode,
      name: this.studentName,
      isRaised: isRaised
    });
  }

  // Gửi phản hồi cảm xúc (Hiểu bài, Nhanh quá,...)
  sendReaction(reactionType) {
    this.send({
      type: 'REACTION',
      roomCode: this.roomCode,
      name: this.studentName,
      reaction: reactionType
    });
  }

  // Nộp câu trả lời trắc nghiệm
  submitQuizAnswer(quizId, answer) {
    this.send({
      type: 'QUIZ_ANSWER',
      quizId: quizId,
      answer: answer,
      roomCode: this.roomCode,
      name: this.studentName
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected && !this.isDemoMode) {
        this.connect(this.roomCode, this.studentName);
      }
    }, 3000);
  }

  // ==========================================
  // CHẾ ĐỘ THỬ NGHIỆM TỨC THÌ (DEMO MODE)
  // Cho phép kiểm tra ngay trên GitHub mà chưa cần bật PowerPoint
  // ==========================================
  initDemoMode() {
    this.isDemoMode = true;
    this.onStatusChange('connected', 'Chế độ Trải nghiệm mẫu (Demo)');

    // Tạo các slide mẫu bằng Canvas SVG cực đẹp
    this.demoSlides = [
      this.createDemoSlide(1, 4, "CHỦ ĐỀ 1: PHƯƠNG TRÌNH BẬC HAI", "ax² + bx + c = 0 (a ≠ 0)\n\nCông thức nghiệm biệt thức Delta (Δ):\nΔ = b² - 4ac\n\n• Δ > 0: Phương trình có 2 nghiệm phân biệt\n  x₁,₂ = (-b ± √Δ) / 2a\n• Δ = 0: Phương trình có nghiệm kép\n  x₁ = x₂ = -b / 2a\n• Δ < 0: Phương trình vô nghiệm", "#1e1b4b", "#6366f1"),
      this.createDemoSlide(2, 4, "VÍ DỤ ÁP DỤNG", "Giải phương trình:\n2x² - 5x + 2 = 0\n\nBước 1: Xác định hệ số:\na = 2, b = -5, c = 2\n\nBước 2: Tính Δ:\nΔ = (-5)² - 4(2)(2) = 25 - 16 = 9 > 0\n√Δ = 3\n\nBước 3: Kết luận nghiệm:\nx₁ = (5 + 3) / 4 = 2\nx₂ = (5 - 3) / 4 = 1/2", "#064e3b", "#10b981"),
      this.createDemoSlide(3, 4, "CÂU HỎI TRẮC NGHIỆM NHANH", "Phương trình nào sau đây có nghiệm kép?\n\nA. x² - 4x + 4 = 0\nB. x² - 3x + 2 = 0\nC. 2x² + x + 1 = 0\nD. x² - 5x = 0\n\n(Hãy chọn đáp án A, B, C hoặc D bên dưới màn hình!)", "#701a75", "#d946ef"),
      this.createDemoSlide(4, 4, "TỔNG KẾT BÀI HỌC", "1. Ghi nhớ công thức tính Delta\n2. Cẩn thận dấu trừ của hệ số b khi thế vào công thức\n3. Bài tập về nhà: Bài 1, 2, 3 trang 45 SGK\n\nCảm ơn các em đã theo dõi bài giảng!", "#1e293b", "#38bdf8")
    ];

    this.currentDemoIndex = 0;
    this.broadcastCurrentDemoSlide();

    // Giả lập tự động chuyển slide mỗi 12 giây để thầy cô/học sinh thấy hiệu ứng mượt mà
    this.demoInterval = setInterval(() => {
      this.currentDemoIndex = (this.currentDemoIndex + 1) % this.demoSlides.length;
      this.broadcastCurrentDemoSlide();

      // Nếu tới slide 3 thì bật Quiz demo
      if (this.currentDemoIndex === 2) {
        setTimeout(() => {
          this.onQuizStart({
            quizId: 'demo-q1',
            title: 'Câu hỏi trắc nghiệm',
            question: 'Phương trình nào sau đây có nghiệm kép?',
            options: ['A', 'B', 'C', 'D'],
            timeLimit: 30
          });
        }, 800);
      }
    }, 12000);
  }

  broadcastCurrentDemoSlide() {
    const slide = this.demoSlides[this.currentDemoIndex];
    this.onSlideUpdate({
      slideNumber: this.currentDemoIndex + 1,
      totalSlides: this.demoSlides.length,
      imageUrl: slide
    });
  }

  nextDemoSlide() {
    if (!this.isDemoMode) return;
    this.currentDemoIndex = (this.currentDemoIndex + 1) % this.demoSlides.length;
    this.broadcastCurrentDemoSlide();
  }

  prevDemoSlide() {
    if (!this.isDemoMode) return;
    this.currentDemoIndex = (this.currentDemoIndex - 1 + this.demoSlides.length) % this.demoSlides.length;
    this.broadcastCurrentDemoSlide();
  }

  createDemoSlide(index, total, title, content, bgColor, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Nền
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 1280, 720);

    // Họa tiết góc
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(1200, 80, 140, 0, Math.PI * 2);
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Header bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(60, 60, 8, 50);

    // Tiêu đề
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.fillText(title, 85, 98);

    // Dải phân cách
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 135);
    ctx.lineTo(1220, 135);
    ctx.stroke();

    // Nội dung bài giảng
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '26px -apple-system, monospace, sans-serif';
    const lines = content.split('\n');
    let y = 190;
    for (const line of lines) {
      if (line.startsWith('•') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
        ctx.fillStyle = '#fef08a';
      } else if (line.startsWith('A.') || line.startsWith('B.') || line.startsWith('C.') || line.startsWith('D.')) {
        ctx.fillStyle = '#a5b4fc';
        ctx.font = 'bold 28px -apple-system, sans-serif';
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '26px -apple-system, monospace, sans-serif';
      }
      ctx.fillText(line, 80, y);
      y += 42;
    }

    // Footer chân trang
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText(`Lớp học trực tuyến • Không cần máy chiếu • Trang ${index}/${total}`, 80, 680);

    return canvas.toDataURL('image/png');
  }
}
