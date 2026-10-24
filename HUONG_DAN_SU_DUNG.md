# 📖 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG "TRÌNH CHIẾU KHÔNG CẦN MÁY CHIẾU"
*(Giải pháp thay thế ClassPoint tiết kiệm và dễ triển khai nhất)*

---

## 🎯 Mục đích
Giúp giáo viên trình chiếu bài giảng PowerPoint trực tiếp đến từng màn hình điện thoại/máy tính bảng của học sinh trong lớp học **mà không cần máy chiếu hoặc TV lớn**.

---

## 🚀 Cách giáo viên sử dụng khi lên lớp (Chỉ 1 thao tác)

1. Nhấp đúp chuột vào file: **`BatDauLopHoc.bat`**
2. Màn hình tự động mở **Bảng điều khiển Giáo viên** có sẵn:
   * **Mã lớp học (4 số)**
   * **Mã QR to rõ**
3. Thầy cô chiếu mã QR hoặc bảo học sinh quét mã QR trên bàn/bảng phụ để vào lớp.
4. Mở file bài giảng PowerPoint và nhấn **F5** để bắt đầu giảng bài như bình thường!
   * Mỗi khi thầy cô bấm chuyển slide (bằng chuột, bàn phím hoặc bút chiếu), slide trên máy của toàn bộ 40 học sinh sẽ tự động đổi theo tức thì!

---

## 👥 Thao tác của học sinh
* Dùng điện thoại mở **Camera** hoặc **Zalo** quét mã QR $\rightarrow$ Nhập họ tên $\rightarrow$ Bấm **"Vào Lớp Ngay"**.
* Học sinh có thể dùng 2 ngón tay phóng to/thu nhỏ (pinch-to-zoom) để đọc chữ nhỏ hoặc công thức.
* Bấm nút **✋ Giơ tay** khi muốn phát biểu hoặc **👍 Phản hồi** mức độ hiểu bài.
* Khi thầy cô bật câu hỏi trắc nghiệm, các nút **A, B, C, D** sẽ hiện lên để học sinh chọn đáp án.

---

## ⚙️ Các thành phần trong thư mục

* **`BatDauLopHoc.bat`**: File chạy chính dành cho giáo viên (nhấp 1 lần là chạy toàn bộ).
* **`client/`**: Giao diện web dành cho học sinh (có thể đẩy lên **GitHub Pages** miễn phí vĩnh viễn).
* **`server/`**:
  * `server.js`: Máy chủ WebSocket & API siêu tốc (viết bằng Node.js chuẩn, không cần cài đặt thêm thư viện).
  * `teacher.html`: Bảng điều khiển trực quan cho giáo viên (xem slide, quản lý học sinh, bật trắc nghiệm).
  * `sync_powerpoint.ps1`: Tự động bắt sự kiện bấm slide từ Microsoft PowerPoint.
  * `ClassLive_AddIn.bas`: Macro VBA cho thầy cô muốn tích hợp thẳng vào menu PowerPoint.
