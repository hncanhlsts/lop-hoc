/**
 * VIEWER.JS - Bộ xử lý phóng to / thu nhỏ (Pinch-to-zoom) & kéo rê Slide
 * Tối ưu đặc biệt cho học sinh khi không có máy chiếu trong lớp học.
 */

class SlideViewer {
  constructor(viewportEl, contentEl) {
    this.viewport = viewportEl;
    this.content = contentEl;

    // Trạng thái biến đổi (Transform state)
    this.scale = 1;
    this.minScale = 0.8;
    this.maxScale = 5.0;
    this.posX = 0;
    this.posY = 0;

    // Cử chỉ cảm ứng (Touch gesture state)
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialPinchDistance = 0;
    this.initialScale = 1;

    // Double tap
    this.lastTapTime = 0;

    this.initEvents();
  }

  initEvents() {
    // 1. Cảm ứng chạm trên điện thoại (Touch Events)
    this.viewport.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.viewport.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.viewport.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    this.viewport.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));

    // 2. Chuột trên máy tính bảng / PC (Mouse Events)
    this.viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());
    this.viewport.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }

  // --- TOUCH HANDLERS ---
  handleTouchStart(e) {
    if (e.touches.length === 1) {
      // 1 ngón: Kéo rê (Pan) hoặc Double tap
      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        // Double tap: Phóng to hoặc trở về bình thường
        this.toggleZoom(e.touches[0].clientX, e.touches[0].clientY);
        this.lastTapTime = 0;
        e.preventDefault();
        return;
      }
      this.lastTapTime = now;

      if (this.scale > 1) {
        this.isDragging = true;
        this.startX = e.touches[0].clientX - this.posX;
        this.startY = e.touches[0].clientY - this.posY;
      }
    } else if (e.touches.length === 2) {
      // 2 ngón: Pinch-to-zoom
      e.preventDefault();
      this.isDragging = false;
      this.initialPinchDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.initialScale = this.scale;
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging && this.scale > 1) {
      e.preventDefault();
      this.posX = e.touches[0].clientX - this.startX;
      this.posY = e.touches[0].clientY - this.startY;
      this.applyTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      if (this.initialPinchDistance > 0) {
        const factor = currentDistance / this.initialPinchDistance;
        let newScale = this.initialScale * factor;
        this.scale = Math.min(Math.max(newScale, this.minScale), this.maxScale);
        this.applyTransform();
      }
    }
  }

  handleTouchEnd(e) {
    if (e.touches.length === 0) {
      this.isDragging = false;
      this.initialPinchDistance = 0;
      this.clampPosition();
    }
  }

  // --- MOUSE HANDLERS (PC / Laptop) ---
  handleMouseDown(e) {
    if (this.scale > 1) {
      this.isDragging = true;
      this.startX = e.clientX - this.posX;
      this.startY = e.clientY - this.posY;
      this.viewport.style.cursor = 'grabbing';
    }
  }

  handleMouseMove(e) {
    if (this.isDragging) {
      this.posX = e.clientX - this.startX;
      this.posY = e.clientY - this.startY;
      this.applyTransform();
    }
  }

  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.viewport.style.cursor = this.scale > 1 ? 'grab' : 'default';
      this.clampPosition();
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    this.zoom(zoomFactor);
  }

  // --- TIỆN ÍCH ZOOM ---
  zoom(factor) {
    const newScale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);
    this.scale = newScale;
    this.clampPosition();
    this.applyTransform();
  }

  zoomIn() {
    this.zoom(1.25);
  }

  zoomOut() {
    this.zoom(0.8);
  }

  resetZoom() {
    this.scale = 1;
    this.posX = 0;
    this.posY = 0;
    this.applyTransform();
    this.viewport.style.cursor = 'default';
  }

  toggleZoom(originX, originY) {
    if (this.scale > 1.2) {
      this.resetZoom();
    } else {
      this.scale = 2.2;
      this.applyTransform();
    }
  }

  clampPosition() {
    if (this.scale <= 1) {
      this.posX = 0;
      this.posY = 0;
      this.applyTransform();
      return;
    }
    // Giới hạn không cho kéo slide ra ngoài màn hình quá xa
    const bounds = this.viewport.getBoundingClientRect();
    const maxDragX = (bounds.width * (this.scale - 1)) / 1.5;
    const maxDragY = (bounds.height * (this.scale - 1)) / 1.5;

    this.posX = Math.min(Math.max(this.posX, -maxDragX), maxDragX);
    this.posY = Math.min(Math.max(this.posY, -maxDragY), maxDragY);
    this.applyTransform();
  }

  applyTransform() {
    this.content.style.transform = `translate(${this.posX}px, ${this.posY}px) scale(${this.scale})`;
  }

  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
