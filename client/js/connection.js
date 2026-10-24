/**
 * CONNECTION.JS - Kết nối thời gian thực WebRTC P2P (PeerJS)
 * Học sinh truy cập trang web là nhận ngay hình ảnh Slide khi giáo viên bấm BẬT!
 */

class SlideConnection {
  constructor(options = {}) {
    this.teacherPeerId = 'hncanhlsts-class-live'; // ID phòng phát sóng của giáo viên
    this.peer = null;
    this.conn = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.studentName = 'Học sinh';

    // Callbacks
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onSlideUpdate = options.onSlideUpdate || (() => {});
    this.onQuizStart = options.onQuizStart || (() => {});
    this.onQuizEnd = options.onQuizEnd || (() => {});
  }

  connect(roomCode, studentName, isDemo = false) {
    this.studentName = studentName || 'Học sinh';
    this.isDemoMode = isDemo;

    if (this.isDemoMode) {
      this.initDemoMode();
      return;
    }

    this.onStatusChange('connecting', 'Đang kết nối tới bài giảng của Giáo viên...');

    try {
      // Khởi tạo Peer WebRTC cho học sinh
      this.peer = new Peer({ debug: 1 });

      this.peer.on('open', (id) => {
        console.log('Học sinh đã khởi tạo Peer ID:', id);
        this.connectToTeacher();
      });

      this.peer.on('error', (err) => {
        console.warn('Lỗi kết nối P2P:', err);
        if (err.type === 'peer-unavailable') {
          this.onStatusChange('waiting', '⏳ Thầy/Cô chưa bấm "Bật trình chiếu". Hãy chờ một chút nhé!');
          // Thử kết nối lại sau 4 giây
          setTimeout(() => this.connectToTeacher(), 4000);
        } else {
          this.onStatusChange('error', 'Đang thử kết nối lại...');
          setTimeout(() => this.connectToTeacher(), 4000);
        }
      });

    } catch (e) {
      console.error('Không thể tải PeerJS:', e);
      this.onStatusChange('error', 'Lỗi kết nối. Chuyển sang Demo.');
      this.initDemoMode();
    }
  }

  connectToTeacher() {
    if (!this.peer || this.peer.destroyed) return;

    console.log('Đang kết nối tới phòng phát sóng:', this.teacherPeerId);
    this.conn = this.peer.connect(this.teacherPeerId, { reliable: true });

    this.conn.on('open', () => {
      this.isConnected = true;
      this.onStatusChange('connected', '🟢 Đang xem trực tiếp từ Thầy/Cô');
      console.log('Đã kết nối thành công tới máy Giáo viên!');

      // Gửi thông tin định danh của học sinh
      this.conn.send({
        type: 'JOIN',
        name: this.studentName
      });
    });

    this.conn.on('data', (data) => {
      if (data.type === 'SLIDE_CHANGE') {
        this.onSlideUpdate({
          slideNumber: data.slideNumber || 1,
          totalSlides: data.totalSlides || 1,
          imageUrl: data.imageUrl
        });
      } else if (data.type === 'QUIZ_START') {
        this.onQuizStart(data);
      } else if (data.type === 'QUIZ_END') {
        this.onQuizEnd(data);
      }
    });

    this.conn.on('close', () => {
      this.isConnected = false;
      this.onStatusChange('disconnected', '⏳ Thầy/Cô đã tạm dừng hoặc chuyển bài giảng.');
      // Tự động kết nối lại
      setTimeout(() => this.connectToTeacher(), 3000);
    });

    this.conn.on('error', () => {
      this.isConnected = false;
      setTimeout(() => this.connectToTeacher(), 3000);
    });
  }

  // Gửi hành động giơ tay
  sendRaiseHand(isRaised) {
    if (this.conn && this.conn.open) {
      this.conn.send({
        type: 'RAISE_HAND',
        name: this.studentName,
        isRaised: isRaised
      });
    }
  }

  // Nộp câu trả lời trắc nghiệm
  submitQuizAnswer(quizId, answer) {
    if (this.conn && this.conn.open) {
      this.conn.send({
        type: 'QUIZ_ANSWER',
        quizId: quizId,
        answer: answer,
        name: this.studentName
      });
    }
  }

  // --- DEMO MODE CHO THỬ NGHIỆM TỨC THÌ ---
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
