/**
 * APP.JS - Điều khiển luồng ứng dụng chính của học sinh
 * Tích hợp Trắc nghiệm (A,B,C,D), Đúng/Sai, Tự luận ngắn, Khảo sát & Khen thưởng sao
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
  const myStars = document.getElementById('my-stars');
  const slideCounter = document.getElementById('slide-counter');
  const syncStatusText = document.getElementById('sync-status-text');
  const slideViewport = document.getElementById('slide-viewport');
  const slideCanvasWrapper = document.getElementById('slide-canvas-wrapper');
  const currentSlideImg = document.getElementById('current-slide-img');
  const slideVideo = document.getElementById('slide-video');
  const waitingCard = document.getElementById('waiting-card');
  const waitingTitle = document.getElementById('waiting-title');
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

  // Quiz overlay elements
  const quizOverlay = document.getElementById('quiz-overlay');
  const quizBadgeTitle = document.getElementById('quiz-badge-title');
  const btnCloseQuiz = document.getElementById('btn-close-quiz');
  const quizContentArea = document.getElementById('quiz-content-area');
  const quizOptionsContainer = document.getElementById('quiz-options-container');
  const quizShortContainer = document.getElementById('quiz-short-container');
  const quizShortInput = document.getElementById('quiz-short-input');
  const btnSubmitShort = document.getElementById('btn-submit-short');
  const quizSubmittedMsg = document.getElementById('quiz-submitted-msg');
  const quizResultBanner = document.getElementById('quiz-result-banner');

  // Toast
  const toastEl = document.getElementById('toast');

  let currentQuiz = null;
  let isHandRaised = false;
  let accumulatedStars = 0;

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
      if (waitingTitle && (status === 'connecting' || status === 'waiting' || status === 'disconnected' || status === 'error')) {
        waitingTitle.textContent = message;
      }
    },
    onStreamUpdate: (stream) => {
      if (slideVideo) {
        slideVideo.srcObject = stream;
        slideVideo.style.display = 'block';
        slideVideo.play().catch(() => {});
      }
      if (currentSlideImg) currentSlideImg.style.display = 'none';
      if (waitingCard) waitingCard.style.display = 'none';
      viewer.resetZoom();
      showToast('🟢 Đã nhận bài giảng trực tiếp từ Thầy/Cô!');
    },
    onSlideUpdate: (slideData) => {
      if (slideData.imageUrl) {
        currentSlideImg.src = slideData.imageUrl;
        currentSlideImg.style.display = 'block';
        if (slideVideo) slideVideo.style.display = 'none';
        if (waitingCard) waitingCard.style.display = 'none';
      }
      slideCounter.textContent = `${slideData.slideNumber}/${slideData.totalSlides}`;
      viewer.resetZoom();
      if (zoomHint) {
        setTimeout(() => { zoomHint.style.opacity = '0'; }, 3500);
      }
    },
    onQuizStart: (quizData) => {
      showQuiz(quizData);
    },
    onQuizEnd: () => {
      if (quizOverlay.classList.contains('open') && quizSubmittedMsg.style.display === 'none') {
        quizSubmittedMsg.style.display = 'block';
        quizSubmittedMsg.innerHTML = '⏹️ Thầy/Cô đã dừng nhận câu trả lời.';
        quizContentArea.style.display = 'none';
      }
    },
    onQuizReveal: (resultData) => {
      showQuizResult(resultData);
    },
    onStarAward: (starData) => {
      accumulatedStars = starData.stars;
      if (myStars) myStars.textContent = `⭐ ${accumulatedStars}`;
      showToast(starData.message || '🌟 Thầy/Cô vừa tặng bạn 1 Ngôi Sao!');
    }
  });

  // --- Xử lý Đăng nhập vào lớp ---
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomCode = classCodeInput.value.trim().toUpperCase() || '1234';
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

    if (isDemo && waitingCard) {
      waitingCard.style.display = 'none';
    }

    connection.connect(roomCode, name, isDemo);
    showToast(`👋 Chào mừng ${name} vào lớp ${roomCode}!`);
  }

  // --- Điều khiển Phóng to / Thu nhỏ ---
  const btnRetryConn = document.getElementById('btn-retry-conn');
  if (btnRetryConn) {
    btnRetryConn.addEventListener('click', () => {
      showToast('🔄 Đang thử lại kết nối...');
      connection.retry();
    });
  }

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

  // ==========================================
  // XỬ LÝ CÂU HỎI TƯƠNG TÁC (QUIZ / SHORT / POLL)
  // ==========================================
  function showQuiz(quizData) {
    currentQuiz = quizData;
    quizResultBanner.style.display = 'none';
    quizSubmittedMsg.style.display = 'none';
    quizContentArea.style.display = 'block';

    const type = quizData.quizType || 'mcq';

    if (type === 'short') {
      // Dạng tự luận ngắn
      quizBadgeTitle.textContent = '✍️ CÂU HỎI TỰ LUẬN';
      quizOptionsContainer.style.display = 'none';
      quizShortContainer.style.display = 'block';
      quizShortInput.value = '';
      quizShortInput.focus();

      btnSubmitShort.onclick = () => {
        const text = quizShortInput.value.trim();
        if (!text) {
          showToast('⚠️ Vui lòng nhập câu trả lời!');
          return;
        }
        submitStudentAnswer(text, 'Đã gửi câu trả lời của em!');
      };

    } else {
      // Dạng lựa chọn (Trắc nghiệm A,B,C,D / Đúng Sai / Bình chọn)
      quizShortContainer.style.display = 'none';
      quizOptionsContainer.style.display = 'grid';
      quizOptionsContainer.innerHTML = '';

      if (type === 'tf') {
        quizBadgeTitle.textContent = '⚖️ CÂU HỎI ĐÚNG / SAI';
      } else if (type === 'poll') {
        quizBadgeTitle.textContent = '📊 KHẢO SÁT HIỂU BÀI';
      } else {
        quizBadgeTitle.textContent = '📝 CÂU HỎI TRẮC NGHIỆM';
      }

      const options = quizData.options || ['A', 'B', 'C', 'D'];
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.textContent = type === 'mcq' ? `Đáp án ${opt}` : opt;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          submitStudentAnswer(opt, `Đã chọn: <b>${opt}</b>!`);
        });
        quizOptionsContainer.appendChild(btn);
      });
    }

    quizOverlay.classList.add('open');
    showToast('🎯 Thầy cô vừa giao câu hỏi mới!');
  }

  function submitStudentAnswer(answer, textFeedback) {
    connection.submitAnswer(answer);
    setTimeout(() => {
      quizContentArea.style.display = 'none';
      quizSubmittedMsg.style.display = 'block';
      quizSubmittedMsg.innerHTML = `✅ ${textFeedback}<br>Đang chờ Thầy/Cô công bố kết quả.`;
    }, 250);
  }

  // ==========================================
  // CÔNG BỐ KẾT QUẢ & VINH DANH / ĐỘNG VIÊN
  // ==========================================
  function showQuizResult(resultData) {
    quizContentArea.style.display = 'none';
    quizSubmittedMsg.style.display = 'none';
    quizResultBanner.style.display = 'block';

    if (resultData.stars !== undefined) {
      accumulatedStars = resultData.stars;
      if (myStars) myStars.textContent = `⭐ ${accumulatedStars}`;
    }

    // Nếu không có đáp án đúng (tự luận / khảo sát)
    if (!resultData.correctAnswer) {
      quizResultBanner.innerHTML = `
        <div class="result-banner correct">
          <div class="result-icon">👍 🌟</div>
          <div class="result-title">CẢM ƠN EM ĐÃ THAM GIA!</div>
          <div class="result-desc">Thầy/Cô đã ghi nhận câu trả lời của em!</div>
        </div>
      `;
      return;
    }

    // Nếu làm ĐÚNG
    if (resultData.isCorrect) {
      quizResultBanner.innerHTML = `
        <div class="result-banner correct">
          <div class="result-icon">🎉 ⭐ 🌟</div>
          <div class="result-title">XUẤT SẮC! CHÍNH XÁC!</div>
          <div class="result-desc">
            Đáp án <b>${resultData.yourAnswer}</b> là hoàn toàn chính xác!<br>
            Em được Thầy/Cô thưởng <b>+1 Ngôi Sao ⭐</b>!
          </div>
        </div>
      `;
      showToast('🎉 Chúc mừng! Bạn đã trả lời đúng (+1⭐)');
    } else {
      // Nếu làm SAI -> ĐỘNG VIÊN TÍCH CỰC
      quizResultBanner.innerHTML = `
        <div class="result-banner wrong">
          <div class="result-icon">💪 💡</div>
          <div class="result-title">CỐ GẮNG LÊN NHÉ EM!</div>
          <div class="result-desc">
            Đáp án đúng là: <b style="color: #6ee7b7; font-size: 16px;">${resultData.correctAnswer}</b>.<br>
            Em đã chọn: <b>${resultData.yourAnswer || 'Chưa kịp nộp'}</b>.<br>
            Đừng nản lòng nhé! Hãy chú ý nghe Thầy/Cô giải thích và làm tốt ở câu tiếp theo!
          </div>
        </div>
      `;
      showToast('💪 Đừng buồn nhé, lần sau cố gắng hơn!');
    }
  }

  btnCloseQuiz.addEventListener('click', () => {
    quizOverlay.classList.remove('open');
  });

  // --- Tiện ích Toast thông báo ---
  window.showToast = function(msg) {
    if (!toastEl) return;
    toastEl.innerHTML = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  };
});
