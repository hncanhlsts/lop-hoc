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
  const liveStreamFrame = document.getElementById('live-stream-frame');
  const currentSlideImg = document.getElementById('current-slide-img');
  const waitingCard = document.getElementById('waiting-card');
  const waitingTitle = document.getElementById('waiting-title');
  const waitingDesc = document.getElementById('waiting-desc');
  const waitingSpinner = document.getElementById('waiting-spinner');
  const waitingStatusIcon = document.getElementById('waiting-status-icon');
  
  // Controls
  const btnFullscreen = document.getElementById('btn-fullscreen');

  // Interactive buttons
  const btnRaiseHand = document.getElementById('btn-raise-hand');
  const btnReaction = document.getElementById('btn-reaction');
  const btnDownloadSlide = document.getElementById('btn-download-slide');

  // Quiz overlay elements
  const quizOverlay = document.getElementById('quiz-overlay');
  const quizIdleCard = document.getElementById('quiz-idle-card');
  const quizBadgeTitle = document.getElementById('quiz-badge-title');
  const btnCloseQuiz = document.getElementById('btn-close-quiz');
  const quizContentArea = document.getElementById('quiz-content-area');
  const quizOptionsContainer = document.getElementById('quiz-options-container');
  const quizShortContainer = document.getElementById('quiz-short-container');
  const quizShortInput = document.getElementById('quiz-short-input');
  // ClassPoint Interactive DOM
  const quizWordcloudContainer = document.getElementById('quiz-wordcloud-container');
  const quizWordcloudInput = document.getElementById('quiz-wordcloud-input');
  const btnSubmitWordcloud = document.getElementById('btn-submit-wordcloud');

  const quizFillblankContainer = document.getElementById('quiz-fillblank-container');
  const quizFillblankInput = document.getElementById('quiz-fillblank-input');
  const btnSubmitFillblank = document.getElementById('btn-submit-fillblank');

  const quizDrawingContainer = document.getElementById('quiz-drawing-container');
  const drawingCanvas = document.getElementById('drawing-canvas');
  const btnClearDrawing = document.getElementById('btn-clear-drawing');
  const btnSubmitDrawing = document.getElementById('btn-submit-drawing');

  const quizImageContainer = document.getElementById('quiz-image-container');
  const quizPhotoInput = document.getElementById('quiz-photo-input');
  const quizPhotoPreview = document.getElementById('quiz-photo-preview');
  const quizPhotoPreviewBox = document.getElementById('quiz-photo-preview-box');
  const quizPhotoPlaceholder = document.getElementById('quiz-photo-placeholder');
  const btnSubmitPhoto = document.getElementById('btn-submit-photo');

  const btnSubmitShort = document.getElementById('btn-submit-short');
  const quizSubmittedMsg = document.getElementById('quiz-submitted-msg');
  const quizResultBanner = document.getElementById('quiz-result-banner');

  // Toast
  const toastEl = document.getElementById('toast');
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.innerHTML = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  }
  window.showToast = showToast;

  // --- HÀM XÓA SẠCH TOÀN BỘ COOKIES, LOCALSTORAGE, SESSION VÀ CACHE ---
  function clearAllCookiesAndStorage() {
    try {
      // 1. Xóa mọi cookie hiện hành
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const c = cookies[i];
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
        if (name) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        }
      }
      // 2. Xóa sạch localStorage & sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      // 3. Xóa cache Service Worker nếu có
      if (typeof caches !== 'undefined') {
        caches.keys().then(keys => {
          keys.forEach(k => caches.delete(k));
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Lỗi khi xóa cookies & cache:', e);
    }
  }
  window.clearAllCookiesAndStorage = clearAllCookiesAndStorage;


  let currentRoomCode = "";
  let currentStudentName = "";
  let currentSessionMode = null;
  let currentQuiz = null;
  let isHandRaised = false;
  let accumulatedStars = 0;
  let jitsiApi = null;

  function initLiveStreamFrame(roomCode, studentName) {
    const container = document.getElementById('live-stream-frame');
    if (!container) return;
    container.innerHTML = '';

    const cleanRoom = 'ClassLive-hncanhlsts-' + roomCode.toLowerCase().replace(/[^a-z0-9]/g, '');

    const domain = "meet.jit.si";
    const options = {
      roomName: cleanRoom,
      width: "100%",
      height: "100%",
      parentNode: container,
      userInfo: {
        displayName: studentName
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        readOnlyName: true,
        defaultRemoteDisplayName: 'Thầy/Cô Giáo'
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ['fullscreen', 'tileview', 'videoquality'],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
      }
    };

    try {
      if (typeof JitsiMeetExternalAPI !== 'undefined') {
        jitsiApi = new JitsiMeetExternalAPI(domain, options);
      } else {
        container.innerHTML = `<iframe src="https://meet.jit.si/${cleanRoom}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true" style="width:100%;height:100%;border:none;" allow="camera; microphone; fullscreen; display-capture"></iframe>`;
      }
    } catch (e) {
      container.innerHTML = `<iframe src="https://meet.jit.si/${cleanRoom}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true" style="width:100%;height:100%;border:none;" allow="camera; microphone; fullscreen; display-capture"></iframe>`;
    }
  }

  function destroyLiveStreamFrame() {
    if (jitsiApi) {
      try { jitsiApi.dispose(); } catch (e) {}
      jitsiApi = null;
    }
    const container = document.getElementById('live-stream-frame');
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }
  }

  function closeAndResetQuiz() {
    if (quizIdleCard) quizIdleCard.style.display = 'flex';
    currentQuiz = null;
    if (quizOverlay) {
      quizOverlay.classList.remove('open');
      quizOverlay.style.display = 'none';
    }
    if (quizSubmittedMsg) quizSubmittedMsg.style.display = 'none';
    if (quizResultBanner) quizResultBanner.style.display = 'none';
    if (quizContentArea) quizContentArea.style.display = 'block';
  }

  function handleSessionMode(sessionData) {
    currentSessionMode = sessionData;
    console.log('[Học sinh] Nhận trạng thái phát sóng từ GV:', sessionData);

    if (sessionData && sessionData.mode === 'ended') {
      // Giáo viên đã kết thúc buổi học!
      destroyLiveStreamFrame();
      closeAndResetQuiz();
      if (currentSlideImg) currentSlideImg.style.display = 'none';
      if (waitingCard) {
        if (waitingTitle) waitingTitle.textContent = '👋 Buổi học đã kết thúc';
        if (waitingDesc) waitingDesc.textContent = sessionData.message || 'Thầy/Cô đã đóng phòng học. Chúc các em học tập tốt!';
        if (waitingSpinner) waitingSpinner.style.display = 'none';
        if (waitingStatusIcon) {
          waitingStatusIcon.style.display = 'block';
          waitingStatusIcon.textContent = '🎓';
        }
        if (btnRetryConn) btnRetryConn.style.display = 'none';
        waitingCard.style.display = 'flex';
      }
      if (syncStatusText) syncStatusText.textContent = '🏁 Buổi học đã kết thúc';
      showToast('👋 Thầy/Cô đã kết thúc buổi học!');
      return;
    }

    if (sessionData && sessionData.active) {
      if (sessionData.mode === 'smart') {
        // Chế độ Slide Siêu Nét: tắt Jitsi, chỉ hiện ảnh slide
        destroyLiveStreamFrame();
        if (currentSlideImg && currentSlideImg.complete && currentSlideImg.naturalWidth > 0) {
          currentSlideImg.style.display = 'block';
          if (waitingCard) waitingCard.style.display = 'none';
        } else {
          // Chưa có ảnh hoặc đang tải: giữ màn hình chờ rõ ràng và yêu cầu lấy slide
          if (waitingCard) {
            if (waitingTitle) waitingTitle.textContent = '⚡ Thầy/Cô đang phát Slide Siêu Nét';
            if (waitingDesc) waitingDesc.textContent = 'Đang nhận hình ảnh bài giảng mới nhất...';
            waitingCard.style.display = 'flex';
          }
          if (connection) connection.requestCurrentSlide();
        }
        if (syncStatusText) syncStatusText.textContent = '⚡ Xem Slide Siêu Nét';
      } else if (sessionData.mode === 'live') {
        // Chế độ Live Stream: khởi tạo Jitsi
        if (currentSlideImg) currentSlideImg.style.display = 'none';
        if (waitingCard) waitingCard.style.display = 'none';
        const liveFrame = document.getElementById('live-stream-frame');
        if (liveFrame) {
          liveFrame.style.display = 'flex';
          initLiveStreamFrame(currentRoomCode || '1234', currentStudentName || 'Học sinh');
        }
        if (syncStatusText) syncStatusText.textContent = '📽️ Xem Live Stream Trực Tiếp';
      }
    } else {
      // Giáo viên dừng hoặc chưa phát
      destroyLiveStreamFrame();
      if (currentSlideImg) {
        currentSlideImg.style.display = 'none';
        currentSlideImg.removeAttribute('src');
      }
      if (waitingCard) {
        if (waitingTitle) waitingTitle.textContent = `🟢 Đã vào phòng học [${currentRoomCode || '1234'}]`;
        if (waitingDesc) waitingDesc.textContent = 'Thầy/Cô đang chuẩn bị bài giảng hoặc chưa bắt đầu trình chiếu.';
        waitingCard.style.display = 'flex';
      }
      if (syncStatusText) syncStatusText.textContent = 'Chờ Thầy/Cô phát bài';
    }
  }

  // --- Tự động điền Mã lớp nếu học sinh quét mã QR có link kèm `?code=...` ---
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get('code') || urlParams.get('room');
  if (codeFromUrl) {
    classCodeInput.value = codeFromUrl.toUpperCase();
    studentNameInput.focus();
  }

  
  // --- Giữ màn hình điện thoại học sinh luôn sáng trong giờ học (Screen Wake Lock) ---
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.log('WakeLock error:', err);
    }
  }

  document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
      await requestWakeLock();
    }
  });

  // --- Nút Thu nhỏ / Mở rộng hộp câu hỏi để học sinh không bị che khuất slide ---
  const btnToggleQuizSize = document.getElementById('btn-toggle-quiz-size');
  let isQuizMinimized = false;

  if (btnToggleQuizSize) {
    btnToggleQuizSize.addEventListener('click', (e) => {
      e.stopPropagation();
      isQuizMinimized = !isQuizMinimized;
      quizOverlay.classList.toggle('minimized', isQuizMinimized);
      btnToggleQuizSize.textContent = isQuizMinimized ? '▲ Mở rộng để trả lời' : '▼ Thu nhỏ xem đề';
    });
  }

  quizOverlay.addEventListener('click', (e) => {
    if (isQuizMinimized && e.target !== btnCloseQuiz) {
      isQuizMinimized = false;
      quizOverlay.classList.remove('minimized');
      if (btnToggleQuizSize) btnToggleQuizSize.textContent = '▼ Thu nhỏ xem đề';
    }
  });

  // Khôi phục tên học sinh nếu đã từng nhập
  const savedName = localStorage.getItem('classpoint_student_name');
  if (savedName) {
    studentNameInput.value = savedName;
  }

  // --- Khởi tạo bộ kết nối thời gian thực ---
  const connection = new SlideConnection({
    onStatusChange: (status, message) => {
      if (syncStatusText) syncStatusText.textContent = message;

      if (status === 'connected') {
        if (waitingTitle) waitingTitle.textContent = `🟢 Đã vào phòng học [${(currentRoomCode || '1234').toUpperCase()}]`;
        if (waitingDesc) waitingDesc.textContent = 'Kết nối mạng ổn định. Đang chờ Thầy/Cô phát Slide hoặc mở câu hỏi...';
        if (waitingSpinner) waitingSpinner.style.display = 'none';
        if (waitingStatusIcon) {
          waitingStatusIcon.style.display = 'block';
          waitingStatusIcon.textContent = '🟢';
        }
        if (btnRetryConn) btnRetryConn.style.display = 'none';
      } else if (status === 'connecting') {
        if (waitingTitle) waitingTitle.textContent = message || `Đang kết nối tới lớp [${(currentRoomCode || '1234').toUpperCase()}]...`;
        if (waitingDesc) waitingDesc.textContent = 'Đang thiết lập kết nối an toàn tới phòng học...';
        if (waitingSpinner) waitingSpinner.style.display = 'block';
        if (waitingStatusIcon) waitingStatusIcon.style.display = 'none';
        if (btnRetryConn) btnRetryConn.style.display = 'none';
      } else if (status === 'disconnected' || status === 'error') {
        if (waitingTitle) waitingTitle.textContent = `⚠️ ${message || 'Mất kết nối tới lớp học'}`;
        if (waitingDesc) waitingDesc.textContent = 'Đang tự động kết nối lại, hoặc bấm nút bên dưới:';
        if (waitingSpinner) waitingSpinner.style.display = 'none';
        if (waitingStatusIcon) {
          waitingStatusIcon.style.display = 'block';
          waitingStatusIcon.textContent = '⚠️';
        }
        if (btnRetryConn) btnRetryConn.style.display = 'inline-block';
      }
    },
    onSessionModeChange: (sessionData) => {
      handleSessionMode(sessionData);
    },
    onStreamUpdate: (stream) => {
      if (waitingCard) waitingCard.style.display = 'none';
      showToast('🟢 Đang xem Live Stream bài giảng từ Thầy/Cô!');
    },
    onLaserMove: (laserData) => {
      const laserDot = document.getElementById('student-laser-dot');
      if (!laserDot || !currentSlideImg) return;
      if (!laserData || !laserData.active) {
        laserDot.style.display = 'none';
        return;
      }
      const imgRect = currentSlideImg.getBoundingClientRect();
      const parentRect = currentSlideImg.parentElement.getBoundingClientRect();
      if (imgRect.width > 0 && imgRect.height > 0) {
        laserDot.style.display = 'block';
        const left = (imgRect.left - parentRect.left) + laserData.x * imgRect.width;
        const top = (imgRect.top - parentRect.top) + laserData.y * imgRect.height;
        laserDot.style.left = left + 'px';
        laserDot.style.top = top + 'px';
      }
    },
    onSlideUpdate: (slideData) => {
      if (!slideData) return;
      if (slideData.stopped || !slideData.imageUrl) {
        if (currentSlideImg) currentSlideImg.style.display = 'none';
        if (waitingCard) {
          if (waitingTitle) waitingTitle.textContent = `🟢 Đã vào phòng học [${currentRoomCode || '1234'}]`;
          if (waitingDesc) waitingDesc.textContent = 'Thầy/Cô đang tạm dừng chia sẻ màn hình.';
          waitingCard.style.display = 'flex';
        }
        return;
      }
      if (currentSlideImg) {
        currentSlideImg.onload = () => {
          currentSlideImg.style.display = 'block';
          if (waitingCard) waitingCard.style.display = 'none';
        };
        currentSlideImg.src = slideData.imageUrl;
      if (currentSlideImg.complete && currentSlideImg.naturalWidth > 0) {
        currentSlideImg.style.display = 'block';
        if (waitingCard) waitingCard.style.display = 'none';
      }
      }
      destroyLiveStreamFrame();
      if (slideCounter) {
        slideCounter.textContent = `${slideData.slideNumber || 1}/${slideData.totalSlides || 1}`;
      }
      if (syncStatusText) syncStatusText.textContent = '⚡ Đang xem Slide';
    },
    onQuizStart: (quizData) => {
      showQuiz(quizData);
    },
    onQuizEnd: () => {
      if (quizOverlay && quizOverlay.classList.contains('open') && quizSubmittedMsg && quizSubmittedMsg.style.display === 'none') {
        quizSubmittedMsg.style.display = 'block';
        quizSubmittedMsg.innerHTML = '⏹️ Thầy/Cô đã dừng nhận câu trả lời.';
        if (quizContentArea) quizContentArea.style.display = 'none';
      }
    },
    onQuizDismiss: () => {
      closeAndResetQuiz();
      showToast('Thầy/Cô đã đóng câu hỏi.');
    },
    onQuizReveal: (resultData) => {
      showQuizResult(resultData);
    },
    onStarAward: (starData) => {
      accumulatedStars = starData.stars;
      if (myStars) myStars.textContent = `⭐ ${accumulatedStars}`;
      playAudioTone('star');
      showToast(starData.message || '🌟 Thầy/Cô vừa tặng bạn 1 Ngôi Sao!');
    },
    onAnnouncement: (annData) => {
      handleAnnouncement(annData);
    },
    onLowerHand: () => {
      isHandRaised = false;
      if (btnRaiseHand) btnRaiseHand.classList.remove('active');
      showToast('✋ Thầy/Cô đã mời em hoặc hạ tay phát biểu.');
    },
    onKick: (kickData) => {
      alert(kickData && kickData.reason ? kickData.reason : 'Bạn đã bị mời ra khỏi phòng học.');
      window.location.reload();
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
    currentRoomCode = roomCode;
    currentStudentName = name;
    classBadge.textContent = roomCode;
    joinScreen.classList.add('hidden');
    viewerScreen.classList.remove('hidden');

    // Không tự động kết nối Jitsi! Đợi tín hiệu từ Giáo viên
    destroyLiveStreamFrame();
    if (currentSlideImg) currentSlideImg.style.display = 'none';
    if (waitingCard) {
      if (waitingTitle) waitingTitle.textContent = `🟢 Đã vào phòng học [${roomCode}]`;
      if (waitingDesc) waitingDesc.textContent = 'Đang chờ Thầy/Cô bắt đầu phát sóng bài giảng...';
      waitingCard.style.display = 'flex';
    }
    closeAndResetQuiz();

    if (isDemo && waitingCard) {
      waitingCard.style.display = 'none';
    }

    connection.connect(roomCode, name, isDemo);
    requestWakeLock();
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

  // --- Âm thanh thông báo Web Audio sinh động ---
  function playAudioTone(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'quiz') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'star' || type === 'correct') {
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.46);
      } else if (type === 'announcement') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.14);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.41);
      }
    } catch (e) {}
  }

  // --- Xử lý Thông Báo Khẩn Từ Giáo Viên ---
  const announcementBanner = document.getElementById('announcement-banner');
  const announcementText = document.getElementById('announcement-text');
  const btnCloseAnnouncement = document.getElementById('btn-close-announcement');
  if (btnCloseAnnouncement && announcementBanner) {
    btnCloseAnnouncement.onclick = () => { announcementBanner.style.display = 'none'; };
  }
  function handleAnnouncement(data) {
    const text = data.text || data.message || '';
    if (!text || !announcementBanner) return;
    if (announcementText) announcementText.textContent = text;
    announcementBanner.style.display = 'flex';
    playAudioTone('announcement');
    showToast(`📢 Thầy/Cô nhắn: "${text.length > 40 ? text.substring(0, 40) + '...' : text}"`);
    clearTimeout(announcementBanner._timer);
    announcementBanner._timer = setTimeout(() => {
      announcementBanner.style.display = 'none';
    }, 12000);
  }

  // --- Tương tác: Bảng chọn phản hồi cảm xúc trực tiếp (Popover) ---
  const reactionPopover = document.getElementById('reaction-popover');
  if (btnReaction && reactionPopover) {
    btnReaction.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = reactionPopover.style.display === 'block';
      reactionPopover.style.display = isVisible ? 'none' : 'block';
    });

    document.querySelectorAll('.reaction-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const react = btn.getAttribute('data-reaction') || '👍';
        connection.sendReaction(react);
        showToast(`Đã gửi cảm xúc: <b>${react}</b>`);
        reactionPopover.style.display = 'none';
      });
    });

    document.addEventListener('click', (e) => {
      if (reactionPopover && !reactionPopover.contains(e.target) && e.target !== btnReaction) {
        reactionPopover.style.display = 'none';
      }
    });
  }

  // --- Lịch sử bài làm & Điểm số của học sinh ---
  const studentQuizHistory = [];
  const btnQuizHistory = document.getElementById('btn-quiz-history');
  const quizHistoryModal = document.getElementById('quiz-history-modal');
  const btnCloseHistory = document.getElementById('btn-close-history');
  const histTotalCount = document.getElementById('hist-total-count');
  const histCorrectCount = document.getElementById('hist-correct-count');
  const histWrongCount = document.getElementById('hist-wrong-count');
  const histStarCount = document.getElementById('hist-star-count');
  const historyItemsList = document.getElementById('history-items-list');

  if (btnQuizHistory && quizHistoryModal) {
    btnQuizHistory.addEventListener('click', () => {
      renderQuizHistoryUI();
      quizHistoryModal.style.display = 'flex';
    });
  }
  if (btnCloseHistory && quizHistoryModal) {
    btnCloseHistory.addEventListener('click', () => {
      quizHistoryModal.style.display = 'none';
    });
  }

  function renderQuizHistoryUI() {
    if (!historyItemsList) return;
    const total = studentQuizHistory.length;
    const correct = studentQuizHistory.filter(h => h.isCorrect).length;
    const wrong = total - correct;

    if (histTotalCount) histTotalCount.textContent = total;
    if (histCorrectCount) histCorrectCount.textContent = correct;
    if (histWrongCount) histWrongCount.textContent = wrong;
    if (histStarCount) histStarCount.textContent = accumulatedStars;

    if (total === 0) {
      historyItemsList.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 24px 0; font-size: 13px;">Em chưa tham gia câu hỏi nào trong buổi học này.</div>`;
      return;
    }

    let html = '';
    studentQuizHistory.forEach((item, idx) => {
      html += `
        <div class="quiz-hist-item ${item.isCorrect ? 'correct' : 'wrong'}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <b style="color: #38bdf8;">Câu ${idx + 1} (${item.setName || 'Bộ ôn'})</b>
            <span style="font-weight:700; color: ${item.isCorrect ? '#34d399' : '#f87171'};">
              ${item.isCorrect ? '✅ Đúng (+1⭐)' : '❌ Sai'}
            </span>
          </div>
          <div style="font-weight:600; color:#f1f5f9; margin-bottom:4px;">${item.questionText}</div>
          <div style="font-size:12px; color:#cbd5e1;">
            Em chọn: <b>${item.yourAnswer}</b> | Đáp án đúng: <b style="color:#34d399;">${item.correctAnswer}</b>
          </div>
          ${item.explanation ? `<div style="font-size:11.5px; color:#a5b4fc; margin-top:4px;">💡 ${item.explanation}</div>` : ''}
        </div>
      `;
    });
    historyItemsList.innerHTML = html;
  }

  // --- Chụp / Lưu bài giảng ---
  btnDownloadSlide.addEventListener('click', () => {
    if (currentSlideImg && currentSlideImg.src && currentSlideImg.style.display !== 'none') {
      const a = document.createElement('a');
      a.href = currentSlideImg.src;
      a.download = `Slide_${currentRoomCode || 'LopHoc'}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('📥 Đã tải hình ảnh bài giảng về máy!');
    } else {
      showToast('📸 Chưa có hình ảnh slide để tải về!');
    }
  });

  
  // --- Khởi tạo Bảng Vẽ Cảm Ứng (Slide Drawing Canvas) ---
  let drawCtx = null;
  let isDrawing = false;
  let drawColor = '#ef4444';
  let lastX = 0;
  let lastY = 0;

  function initDrawingPad() {
    if (!drawingCanvas) return;
    drawingCanvas.width = 460;
    drawingCanvas.height = 240;
    drawCtx = drawingCanvas.getContext('2d');
    drawCtx.fillStyle = '#ffffff';
    drawCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.lineWidth = 3.5;
    drawCtx.strokeStyle = drawColor;

    function getPos(e) {
      const rect = drawingCanvas.getBoundingClientRect();
      const scaleX = drawingCanvas.width / rect.width;
      const scaleY = drawingCanvas.height / rect.height;
      let clientX = e.clientX;
      let clientY = e.clientY;
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function startDraw(e) {
      e.preventDefault();
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    }

    function moveDraw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      drawCtx.beginPath();
      drawCtx.moveTo(lastX, lastY);
      drawCtx.lineTo(pos.x, pos.y);
      drawCtx.stroke();
      lastX = pos.x;
      lastY = pos.y;
    }

    function endDraw(e) {
      isDrawing = false;
    }

    drawingCanvas.onmousedown = startDraw;
    drawingCanvas.onmousemove = moveDraw;
    window.addEventListener('mouseup', endDraw);

    drawingCanvas.ontouchstart = startDraw;
    drawingCanvas.ontouchmove = moveDraw;
    drawingCanvas.ontouchend = endDraw;

    // Chọn màu vẽ
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.onclick = () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        drawColor = dot.getAttribute('data-color');
        if (drawCtx) drawCtx.strokeStyle = drawColor;
      };
    });

    if (btnClearDrawing) {
      btnClearDrawing.onclick = () => {
        if (drawCtx) {
          drawCtx.fillStyle = '#ffffff';
          drawCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        }
      };
    }
  }

  // --- Chụp / Tải ảnh bài vở (Image Upload & Compression) ---
  let compressedPhotoBase64 = null;
  if (quizPhotoPreviewBox && quizPhotoInput) {
    quizPhotoPreviewBox.onclick = () => quizPhotoInput.click();
    quizPhotoInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Nén ảnh xuống tối đa 800px chất lượng 65% để gửi tức thì qua mạng
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const cx = c.getContext('2d');
          cx.drawImage(img, 0, 0, w, h);
          compressedPhotoBase64 = c.toDataURL('image/jpeg', 0.65);
          if (quizPhotoPreview) {
            quizPhotoPreview.src = compressedPhotoBase64;
            quizPhotoPreview.style.display = 'block';
          }
          if (quizPhotoPlaceholder) quizPhotoPlaceholder.style.display = 'none';
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };
  }

  // ==========================================
  // XỬ LÝ CÂU HỎI TƯƠNG TÁC (QUIZ / SHORT / POLL)
  // ==========================================
  function showQuiz(quizData) {
    if (quizIdleCard) quizIdleCard.style.display = 'none';
    if (!quizData || quizData.action !== 'start') return;
    currentQuiz = quizData;
    currentQuiz.submittedAnswer = null;
    playAudioTone('quiz');
    quizResultBanner.style.display = 'none';
    quizSubmittedMsg.style.display = 'none';
    quizContentArea.style.display = 'block';
    isQuizMinimized = false;
    quizOverlay.classList.remove('minimized');
    if (btnToggleQuizSize) btnToggleQuizSize.textContent = '▼ Thu nhỏ xem đề';

    // Hiển thị khung đề bài & thông tin bộ ôn
    const quizPromptCard = document.getElementById('quiz-prompt-card');
    const quizDeckBadge = document.getElementById('quiz-deck-badge');
    const quizNumBadge = document.getElementById('quiz-num-badge');
    const quizQuestionTitle = document.getElementById('quiz-question-title');
    const quizQuestionImage = document.getElementById('quiz-question-image');

    if (quizData.questionText && quizPromptCard) {
      quizPromptCard.style.display = 'block';
      if (quizQuestionTitle) quizQuestionTitle.textContent = quizData.questionText;
      if (quizDeckBadge) quizDeckBadge.textContent = quizData.setName || 'Bộ Ôn Tập';
      if (quizNumBadge) {
        if (quizData.questionIndex) {
          quizNumBadge.style.display = 'inline-block';
          quizNumBadge.textContent = `Câu ${quizData.questionIndex}/${quizData.totalQuestions || '?'}`;
        } else {
          quizNumBadge.style.display = 'none';
        }
      }
      if (quizData.questionImage && quizQuestionImage) {
        quizQuestionImage.src = quizData.questionImage;
        quizQuestionImage.style.display = 'block';
        quizQuestionImage.onclick = () => {
          quizQuestionImage.style.maxHeight = (quizQuestionImage.style.maxHeight === '200px') ? '450px' : '200px';
        };
      } else if (quizQuestionImage) {
        quizQuestionImage.style.display = 'none';
        quizQuestionImage.src = '';
      }
    } else if (quizPromptCard) {
      quizPromptCard.style.display = 'none';
    }

    // Ẩn tất cả các form nhập liệu trước
    if (quizOptionsContainer) quizOptionsContainer.style.display = 'none';
    if (quizShortContainer) quizShortContainer.style.display = 'none';
    if (quizWordcloudContainer) quizWordcloudContainer.style.display = 'none';
    if (quizFillblankContainer) quizFillblankContainer.style.display = 'none';
    if (quizDrawingContainer) quizDrawingContainer.style.display = 'none';
    if (quizImageContainer) quizImageContainer.style.display = 'none';

    const type = quizData.quizType || 'mcq';

    if (type === 'short') {
      // 1. Tự luận ngắn
      quizBadgeTitle.textContent = '✍️ CÂU HỎI TỰ LUẬN';
      quizShortContainer.style.display = 'block';
      quizShortInput.value = '';
      quizShortInput.focus();
      btnSubmitShort.onclick = () => {
        const text = quizShortInput.value.trim();
        if (!text) return showToast('⚠️ Vui lòng nhập câu trả lời!');
        submitStudentAnswer(text, 'Đã gửi câu trả lời của em!');
      };

    } else if (type === 'wordcloud') {
      // 2. Đám mây từ khóa
      quizBadgeTitle.textContent = '☁️ ĐÁM MÂY TỪ KHÓA';
      if (quizWordcloudContainer) {
        quizWordcloudContainer.style.display = 'block';
        if (quizWordcloudInput) { quizWordcloudInput.value = ''; quizWordcloudInput.focus(); }
        if (btnSubmitWordcloud) {
          btnSubmitWordcloud.onclick = () => {
            const word = quizWordcloudInput.value.trim();
            if (!word) return showToast('⚠️ Vui lòng nhập từ khóa!');
            submitStudentAnswer(word, `Đã gửi từ khóa: <b>${word}</b>!`);
          };
        }
      }

    } else if (type === 'fillblank') {
      // 3. Điền vào chỗ trống
      quizBadgeTitle.textContent = '✏️ ĐIỀN VÀO CHỖ TRỐNG';
      if (quizFillblankContainer) {
        quizFillblankContainer.style.display = 'block';
        if (quizFillblankInput) { quizFillblankInput.value = ''; quizFillblankInput.focus(); }
        if (btnSubmitFillblank) {
          btnSubmitFillblank.onclick = () => {
            const ans = quizFillblankInput.value.trim();
            if (!ans) return showToast('⚠️ Vui lòng nhập đáp án!');
            submitStudentAnswer(ans, `Đã gửi đáp án: <b>${ans}</b>!`);
          };
        }
      }

    } else if (type === 'drawing') {
      // 4. Vẽ trực tiếp trên Slide
      quizBadgeTitle.textContent = '🎨 BẢNG VẼ TRẢ LỜI';
      if (quizDrawingContainer) {
        quizDrawingContainer.style.display = 'block';
        initDrawingPad();
        if (btnSubmitDrawing) {
          btnSubmitDrawing.onclick = () => {
            if (!drawingCanvas) return;
            const dataUrl = drawingCanvas.toDataURL('image/jpeg', 0.65);
            submitStudentAnswer(dataUrl, 'Đã gửi bài vẽ của em!');
          };
        }
      }

    } else if (type === 'image') {
      // 5. Chụp ảnh vở nộp bài
      quizBadgeTitle.textContent = '📸 CHỤP ẢNH BÀI VỞ';
      if (quizImageContainer) {
        quizImageContainer.style.display = 'block';
        compressedPhotoBase64 = null;
        if (quizPhotoPreview) quizPhotoPreview.style.display = 'none';
        if (quizPhotoPlaceholder) quizPhotoPlaceholder.style.display = 'block';
        if (btnSubmitPhoto) {
          btnSubmitPhoto.onclick = () => {
            if (!compressedPhotoBase64) return showToast('⚠️ Em chưa chọn ảnh để tải lên!');
            submitStudentAnswer(compressedPhotoBase64, 'Đã gửi ảnh bài làm của em!');
          };
        }
      }

    } else {
      // 6. Trắc nghiệm A,B,C,D / Đúng Sai / Khảo sát
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
        let keyVal = '';
        if (typeof opt === 'object' && opt !== null) {
          keyVal = opt.key || 'A';
          btn.innerHTML = `<span class="opt-badge">${keyVal}</span> <span class="opt-text">${opt.text || ''}</span>`;
        } else {
          keyVal = String(opt);
          if (type === 'mcq' && keyVal.length === 1) {
            btn.innerHTML = `<span class="opt-badge">${keyVal}</span> <span class="opt-text">Đáp án ${keyVal}</span>`;
          } else {
            btn.innerHTML = `<span class="opt-text">${keyVal}</span>`;
          }
        }
        btn.addEventListener('click', () => {
          document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          submitStudentAnswer(keyVal, `Đã chọn: <b>${keyVal}</b>!`);
        });
        quizOptionsContainer.appendChild(btn);
      });
    }

    quizOverlay.style.display = 'block';
    setTimeout(() => {
      quizOverlay.classList.add('open');
      renderMathSafely(quizOverlay);
    }, 20);
    showToast('🎯 Thầy cô vừa giao câu hỏi mới!');
  }

  function renderMathSafely(container) {
    if (!container) return;
    if (typeof renderMathInElement !== 'undefined') {
      try {
        renderMathInElement(container, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  function submitStudentAnswer(answer, textFeedback) {
    if (currentQuiz) currentQuiz.submittedAnswer = answer;
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

    const yourAns = resultData.yourAnswer || (currentQuiz ? currentQuiz.submittedAnswer : 'Chưa nộp');
    const isCorrect = !!resultData.isCorrect;
    const explanationHtml = resultData.explanation 
      ? `<div style="margin-top: 10px; background: rgba(0,0,0,0.3); border-left: 3px solid #6366f1; padding: 8px 12px; border-radius: 6px; font-size: 13px; text-align: left; color: #e2e8f0;">
          <b>💡 Lời giải thích:</b> ${resultData.explanation}
         </div>`
      : '';

    // Ghi nhận vào Lịch sử Ôn tập
    studentQuizHistory.push({
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      questionText: currentQuiz && currentQuiz.questionText ? currentQuiz.questionText : `Câu hỏi ${studentQuizHistory.length + 1}`,
      setName: currentQuiz && currentQuiz.setName ? currentQuiz.setName : 'Ôn tập trực tiếp',
      yourAnswer: yourAns,
      correctAnswer: resultData.correctAnswer || '---',
      isCorrect: isCorrect,
      explanation: resultData.explanation || ''
    });
    renderQuizHistoryUI();

    // Nếu không có đáp án đúng (tự luận / khảo sát)
    if (!resultData.correctAnswer) {
      quizResultBanner.innerHTML = `
        <div class="result-banner correct">
          <div class="result-icon">👍 🌟</div>
          <div class="result-title">CẢM ƠN EM ĐÃ THAM GIA!</div>
          <div class="result-desc">Thầy/Cô đã ghi nhận câu trả lời của em!</div>
          ${explanationHtml}
        </div>
      `;
      playAudioTone('star');
      return;
    }

    // Nếu làm ĐÚNG
    if (isCorrect) {
      playAudioTone('correct');
      quizResultBanner.innerHTML = `
        <div class="result-banner correct">
          <div class="result-icon">🎉 ⭐ 🌟</div>
          <div class="result-title">XUẤT SẮC! CHÍNH XÁC!</div>
          <div class="result-desc">
            Đáp án <b>${yourAns}</b> là hoàn toàn chính xác!<br>
            Em được Thầy/Cô thưởng <b>+1 Ngôi Sao ⭐</b>!
          </div>
          ${explanationHtml}
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
            Em đã chọn: <b>${yourAns || 'Chưa kịp nộp'}</b>.<br>
            Đừng nản lòng nhé! Hãy chú ý đọc kỹ lời giải thích và làm tốt ở câu tiếp theo!
          </div>
          ${explanationHtml}
        </div>
      `;
      showToast('💪 Đừng buồn nhé, lần sau cố gắng hơn!');
    }
    setTimeout(() => renderMathSafely(quizResultBanner), 25);
  }

  btnCloseQuiz.addEventListener('click', () => {
    quizOverlay.classList.remove('open');
    setTimeout(() => {
      quizOverlay.style.display = 'none';
    }, 350);
  });

  
  // --- NÚT THOÁT LỚP / RỜI LỚP (XOÁ SẠCH COOKIES & CACHE) ---
  const btnLeaveRoom = document.getElementById('btn-leave-room');
  if (btnLeaveRoom) {
    btnLeaveRoom.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn rời lớp học và xóa sạch cookies/dữ liệu phiên làm việc này không?')) {
        leaveClassroomAndClean();
      }
    });
  }

  const btnClearStudentCache = document.getElementById('btn-clear-student-cache');
  if (btnClearStudentCache) {
    btnClearStudentCache.addEventListener('click', () => {
      clearAllCookiesAndStorage();
      if (classCodeInput) classCodeInput.value = '';
      if (studentNameInput) studentNameInput.value = '';
      showToast('🧹 Đã xóa sạch toàn bộ cookies và bộ nhớ tạm trình duyệt!');
    });
  }

  function leaveClassroomAndClean() {
    // 1. Ngắt kết nối MQTT
    if (connection) connection.disconnect();

    // 2. Xóa sạch cookies, localStorage, cache
    clearAllCookiesAndStorage();

    // 3. Đặt lại form và UI
    destroyLiveStreamFrame();
    closeAndResetQuiz();
    if (currentSlideImg) {
      currentSlideImg.src = '';
      currentSlideImg.style.display = 'none';
    }
    if (slideCounter) slideCounter.textContent = '1/1';
    if (syncStatusText) syncStatusText.textContent = '⚡ Đang chờ bài giảng...';
    if (studentNameInput) studentNameInput.value = '';
    currentRoomCode = '';
    currentStudentName = '';

    // 4. Quay về màn hình đăng nhập
    viewerScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
    showToast('🚪 Đã rời lớp và xóa sạch cookies!');
  }

  // Tự động dọn sạch khi học sinh đóng tab hoặc thoát trang
  window.addEventListener('beforeunload', () => {
    if (connection) connection.disconnect();
    clearAllCookiesAndStorage();
  });
  window.addEventListener('pagehide', () => {
    if (connection) connection.disconnect();
    clearAllCookiesAndStorage();
  });

  
  // --- ĐIỀU KHIỂN PHÓNG TO / THU NHỎ SLIDE TÙY CHỌN ---
  let slideZoomScale = 1;
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');

  function updateSlideZoom() {
    if (!currentSlideImg) return;
    currentSlideImg.style.transform = `scale(${slideZoomScale})`;
    if (btnZoomReset) btnZoomReset.textContent = `${Math.round(slideZoomScale * 100)}%`;
  }

  if (btnZoomIn) {
    btnZoomIn.onclick = (e) => {
      e.stopPropagation();
      slideZoomScale = Math.min(3.5, slideZoomScale + 0.25);
      updateSlideZoom();
    };
  }
  if (btnZoomOut) {
    btnZoomOut.onclick = (e) => {
      e.stopPropagation();
      slideZoomScale = Math.max(1, slideZoomScale - 0.25);
      updateSlideZoom();
    };
  }
  if (btnZoomReset) {
    btnZoomReset.onclick = (e) => {
      e.stopPropagation();
      slideZoomScale = 1;
      updateSlideZoom();
    };
  }

  // Nhấp đúp (Double-tap) trên slide để phóng to 200% hoặc trở về chuẩn
  if (slideViewport) {
    let lastTap = 0;
    slideViewport.addEventListener('click', (e) => {
      // Bỏ qua nếu bấm vào nút zoom hoặc waiting-card
      if (e.target.closest('.slide-zoom-controls') || e.target.closest('.waiting-card')) return;
      const now = Date.now();
      if (now - lastTap < 350) {
        slideZoomScale = slideZoomScale === 1 ? 2.0 : 1;
        updateSlideZoom();
      }
      lastTap = now;
    });
  }

  // --- Tiện ích Toast thông báo đã chuyển lên trên ---
});

// Tự động xóa sạch cookies và bộ nhớ tạm khi học sinh đóng trình duyệt
window.addEventListener('beforeunload', () => {
  try {
    if (typeof clearAllCookiesAndStorage === 'function') clearAllCookiesAndStorage();
  } catch (e) {}
});
