/**
 * APP.JS - Điều khiển luồng ứng dụng chính của học sinh
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const joinScreen = document.getElementById('join-screen');
  const viewerScreen = document.getElementById('viewer-screen');
  const joinForm = document.getElementById('join-form');
  const classCodeInput = document.getElementById('class-code');
  const studentNameInput = document.getElementById('student-name');
  const btnDemo = document.getElementById('btn-demo');

  // Viewer DOM
  const classBadge = document.getElementById('class-badge');
  const slideCounter = document.getElementById('slide-counter');
  const syncStatusText = document.getElementById('sync-status-text');
  const slideViewport = document.getElementById('slide-viewport');
  const slideCanvasWrapper = document.getElementById('slide-canvas-wrapper');
  const currentSlideImg = document.getElementById('current-slide-img');
  const zoomHint = document.getElementById('zoom-hint');

  // Zoom controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  // Interactive buttons
  const btnRaiseHand = document.getElementById('btn-raise-hand');
  const btnReaction = document.getElementById('btn-reaction');
  const btnDownloadSlide = document.getElementById('btn-download-slide');

  // Quiz overlay
  const quizOverlay = document.getElementById('quiz-overlay');
  const quizTimer = document.getElementById('quiz-timer');
  const quizOptionsContainer = document.getElementById('quiz-options-container');
  const quizSubmittedMsg = document.getElementById('quiz-submitted-msg');

  // Toast
  const toastEl = document.getElementById('toast');

  let currentQuiz = null;
  let isHandRaised = false;

  // --- Khởi tạo SlideViewer (Pinch-to-zoom & Pan) ---
  const viewer = new SlideViewer(slideViewport, slideCanvasWrapper);

  // --- Tự động điền Mã lớp nếu học sinh quét mã QR có link kèm `?code=...` ---
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get('code') || urlParams.get('room');
  if (codeFromUrl) {
    classCodeInput.value = codeFromUrl.toUpperCase();
    studentNameInput.focus();
  }

  // Khôi phục tên học sinh nếu đã từng nhập
  const savedName = localStorage.getItem('classpoint_student_name');
  if (savedName) {
    studentNameInput.value = savedName;
  }

  // --- Khởi tạo bộ kết nối thời gian thực ---
  const connection = new SlideConnection({
    onStatusChange: (status, message) => {
      syncStatusText.textContent = message;
    },
    onSlideUpdate: (slideData) => {
      // Cập nhật ảnh slide
      currentSlideImg.src = slideData.imageUrl;
      slideCounter.textContent = `${slideData.slideNumber}/${slideData.totalSlides}`;
      
      // Tự động thu về tỉ lệ vừa màn hình khi giáo viên chuyển trang
      viewer.resetZoom();
      
      // Ẩn hướng dẫn zoom sau vài giây
      if (zoomHint) {
        setTimeout(() => { zoomHint.style.opacity = '0'; }, 3500);
      }
    },
    onQuizStart: (quizData) => {
      showQuiz(quizData);
    },
    onQuizEnd: () => {
      hideQuiz();
    }
  });

  // --- Xử lý Đăng nhập vào lớp ---
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomCode = classCodeInput.value.trim().toUpperCase() || 'LOPHOC';
    const name = studentNameInput.value.trim() || 'Học sinh';

    localStorage.setItem('classpoint_student_name', name);
    enterClassroom(roomCode, name, false);
  });

  // Nút xem thử nghiệm ngay
  btnDemo.addEventListener('click', () => {
    const name = studentNameInput.value.trim() || 'Học sinh mẫu';
    enterClassroom('DEMO88', name, true);
  });

  function enterClassroom(roomCode, name, isDemo) {
    classBadge.textContent = roomCode;
    joinScreen.classList.add('hidden');
    viewerScreen.classList.remove('hidden');

    connection.connect(roomCode, name, isDemo);
    showToast(`👋 Chào mừng ${name} vào lớp ${roomCode}!`);
  }

  // --- Điều khiển Phóng to / Thu nhỏ ---
  btnZoomIn.addEventListener('click', () => viewer.zoomIn());
  btnZoomOut.addEventListener('click', () => viewer.zoomOut());
  btnZoomReset.addEventListener('click', () => viewer.resetZoom());

  // Toàn màn hình
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      btnFullscreen.innerHTML = '⛶';
    } else {
      document.exitFullscreen().catch(() => {});
      btnFullscreen.innerHTML = '⛶';
    }
  });

  // --- Tương tác: Giơ tay phát biểu ---
  btnRaiseHand.addEventListener('click', () => {
    isHandRaised = !isHandRaised;
    btnRaiseHand.classList.toggle('active', isHandRaised);
    connection.sendRaiseHand(isHandRaised);

    if (isHandRaised) {
      showToast('✋ Đã giơ tay! Thầy/Cô sẽ nhận được tín hiệu.');
    } else {
      showToast('Đã hạ tay xuống.');
    }
  });

  // --- Tương tác: Thả phản hồi nhanh ---
  const reactions = ['👍 Hiểu bài', '🤔 Chưa hiểu lắm', '💡 Thú vị', '⏩ Thầy cô giảng nhanh quá'];
  let reactionIndex = 0;
  btnReaction.addEventListener('click', () => {
    const react = reactions[reactionIndex % reactions.length];
    reactionIndex++;
    connection.sendReaction(react);
    showToast(`Đã gửi: ${react}`);
  });

  // --- Tải slide hiện tại về điện thoại ---
  btnDownloadSlide.addEventListener('click', () => {
    const imgSrc = currentSlideImg.src;
    if (!imgSrc || imgSrc.length < 50) {
      showToast('Chưa có hình ảnh slide để tải!');
      return;
    }
    const a = document.createElement('a');
    a.href = imgSrc;
    a.download = `Slide_${slideCounter.textContent.replace('/', '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📥 Đang tải ảnh slide về thiết bị...');
  });

  // --- Xử lý Câu hỏi Trắc nghiệm (Quiz Modal) ---
  function showQuiz(quizData) {
    currentQuiz = quizData;
    quizOptionsContainer.innerHTML = '';
    quizSubmittedMsg.style.display = 'none';
    quizOptionsContainer.style.display = 'grid';

    const options = quizData.options || ['A', 'B', 'C', 'D'];
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.textContent = `Đáp án ${opt}`;
      btn.addEventListener('click', () => {
        // Highlight lựa chọn
        document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Nộp bài
        connection.submitQuizAnswer(quizData.quizId, opt);
        setTimeout(() => {
          quizOptionsContainer.style.display = 'none';
          quizSubmittedMsg.style.display = 'block';
          quizSubmittedMsg.innerHTML = `✅ Đã chọn <b>Đáp án ${opt}</b>!<br>Đang chờ giáo viên công bố kết quả.`;
        }, 300);
      });
      quizOptionsContainer.appendChild(btn);
    });

    quizOverlay.classList.add('open');
    showToast('📝 Thầy cô vừa kích hoạt câu hỏi trắc nghiệm!');
  }

  function hideQuiz() {
    quizOverlay.classList.remove('open');
    currentQuiz = null;
  }

  // --- Tiện ích Toast thông báo ---
  window.showToast = function(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2800);
  };
});
