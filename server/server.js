/**
 * SERVER.JS - Máy chủ Điều phối Trình chiếu (Presenter Hub)
 * Hoàn toàn chạy bằng Node.js chuẩn (KHÔNG CẦN CÀI ĐẶT THÊM THƯ VIỆN BÊN NGOÀI)
 * Giáo viên chỉ cần bật lên là chạy ngay 100% Offline hoặc qua Wi-Fi / Hotspot!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

// Trạng thái lớp học hiện tại
const state = {
  classCode: Math.floor(1000 + Math.random() * 9000).toString(), // Mã lớp 4 số ngẫu nhiên
  currentSlide: 1,
  totalSlides: 1,
  slideImage: null,
  activeQuiz: null,
  quizAnswers: {}, // { studentName: 'A' }
  students: new Map(), // ws -> { name, roomCode, isHandRaised }
  reactions: []
};

// ==========================================
// 1. TÌM ĐỊA CHỈ IP MẠNG CỦA MÁY GIÁO VIÊN
// ==========================================
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ iface: name, ip: iface.address });
      }
    }
  }
  return addresses;
}

// ==========================================
// 2. TẠO MÃ QR SVG ĐƠN GIẢN (KHÔNG CẦN THƯ VIỆN)
// Sử dụng API hoặc thuật toán SVG ma trận
// ==========================================
function getQrCodeUrl(url) {
  // Trả về URL của dịch vụ QR hoặc nhúng API
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
}

// ==========================================
// 3. HTTP SERVER - PHỤC VỤ FILE & REST API
// ==========================================
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // --- API: CẬP NHẬT SLIDE TỪ POWERPOINT ---
  if (pathname === '/api/slide' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        state.currentSlide = data.slideNumber || state.currentSlide;
        state.totalSlides = data.totalSlides || state.totalSlides;
        if (data.imageBase64) {
          state.slideImage = data.imageBase64.startsWith('data:') 
            ? data.imageBase64 
            : `data:image/png;base64,${data.imageBase64}`;
        } else if (data.imageUrl) {
          state.slideImage = data.imageUrl;
        }

        // Tự động đóng câu hỏi trắc nghiệm khi qua slide mới
        state.activeQuiz = null;
        state.quizAnswers = {};

        // Phát sóng slide mới tới toàn bộ học sinh
        broadcast({
          type: 'SLIDE_CHANGE',
          slideNumber: state.currentSlide,
          totalSlides: state.totalSlides,
          imageUrl: state.slideImage
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, slide: state.currentSlide }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // --- API: KÍCH HOẠT CÂU HỎI TRẮC NGHIỆM (QUIZ) ---
  if (pathname === '/api/quiz/start' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        state.activeQuiz = {
          quizId: 'quiz_' + Date.now(),
          options: data.options || ['A', 'B', 'C', 'D'],
          title: data.title || 'Câu hỏi trắc nghiệm',
          timeLimit: data.timeLimit || 60
        };
        state.quizAnswers = {};

        broadcast({
          type: 'QUIZ_START',
          ...state.activeQuiz
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, quiz: state.activeQuiz }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // --- API: KẾT THÚC CÂU HỎI TRẮC NGHIỆM ---
  if (pathname === '/api/quiz/stop' && req.method === 'POST') {
    state.activeQuiz = null;
    broadcast({ type: 'QUIZ_END' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // --- API: LẤY TRẠNG THÁI HIỆN TẠI (DÀNH CHO BẢNG ĐIỀU KHIỂN CỦA GV) ---
  if (pathname === '/api/status' && req.method === 'GET') {
    const studentList = Array.from(state.students.values()).map(s => ({
      name: s.name,
      isHandRaised: s.isHandRaised,
      answer: state.quizAnswers[s.name] || null
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      classCode: state.classCode,
      currentSlide: state.currentSlide,
      totalSlides: state.totalSlides,
      slideImage: state.slideImage,
      activeQuiz: state.activeQuiz,
      answers: state.quizAnswers,
      students: studentList,
      ips: getLocalIpAddresses()
    }));
    return;
  }

  // --- PHỤC VỤ TRANG BẢNG ĐIỀU KHIỂN GIÁO VIÊN ---
  if (pathname === '/teacher' || pathname === '/teacher/') {
    const teacherHtmlPath = path.join(__dirname, 'teacher.html');
    if (fs.existsSync(teacherHtmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(teacherHtmlPath).pipe(res);
      return;
    }
  }

  // --- PHỤC VỤ FILE TĨNH GIAO DIỆN HỌC SINH (CLIENT) ---
  let filePath = path.join(CLIENT_DIR, pathname === '/' ? 'index.html' : pathname);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found - Trang không tồn tại');
  }
});

// ==========================================
// 4. WEBSOCKET SERVER THUẦN (RFC 6455)
// Tự xử lý Handshake & Framing (Không cần cài ws)
// ==========================================
server.on('upgrade', (req, socket, head) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  // SHA1 Handshake response
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');

  // Ghi nhận học sinh mới
  const studentInfo = {
    name: decodeURIComponent(parsedUrl.searchParams.get('name') || 'Học sinh'),
    roomCode: parsedUrl.searchParams.get('room') || state.classCode,
    isHandRaised: false
  };
  state.students.set(socket, studentInfo);
  console.log(`[+] Học sinh tham gia: ${studentInfo.name} (Tổng: ${state.students.size})`);

  // Gửi ngay trạng thái slide hiện tại cho học sinh vừa vào
  if (state.slideImage) {
    sendWsMessage(socket, {
      type: 'SLIDE_CHANGE',
      slideNumber: state.currentSlide,
      totalSlides: state.totalSlides,
      imageUrl: state.slideImage
    });
  }

  // Nếu đang có Quiz thì gửi luôn
  if (state.activeQuiz) {
    sendWsMessage(socket, {
      type: 'QUIZ_START',
      ...state.activeQuiz
    });
  }

  // Xử lý gói tin từ Client gửi lên
  socket.on('data', (buffer) => {
    handleWebSocketFrame(socket, buffer);
  });

  socket.on('close', () => {
    state.students.delete(socket);
    console.log(`[-] Học sinh rời phòng: ${studentInfo.name} (Còn lại: ${state.students.size})`);
  });

  socket.on('error', () => {
    state.students.delete(socket);
  });
});

// Phân giải WebSocket Frame đơn giản
function handleWebSocketFrame(socket, buffer) {
  if (buffer.length < 2) return;
  const isMasked = (buffer[1] & 0x80) === 0x80;
  let payloadLength = buffer[1] & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    // Không dùng gói quá lớn
    offset = 10;
  }

  let maskingKey = null;
  if (isMasked) {
    maskingKey = buffer.slice(offset, offset + 4);
    offset += 4;
  }

  const payload = buffer.slice(offset, offset + payloadLength);
  if (isMasked && maskingKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskingKey[i % 4];
    }
  }

  try {
    const text = payload.toString('utf8');
    const msg = JSON.parse(text);
    handleClientAction(socket, msg);
  } catch (e) {
    // Không phải JSON hoặc frame đóng
  }
}

// Xử lý hành động từ học sinh (Giơ tay, chọn đáp án, phản hồi)
function handleClientAction(socket, msg) {
  const student = state.students.get(socket);
  if (!student) return;

  switch (msg.type) {
    case 'RAISE_HAND':
      student.isHandRaised = !!msg.isRaised;
      console.log(`[✋] ${student.name} ${student.isHandRaised ? 'đã giơ tay' : 'hạ tay'}`);
      break;

    case 'QUIZ_ANSWER':
      if (state.activeQuiz) {
        state.quizAnswers[student.name] = msg.answer;
        console.log(`[📝] ${student.name} chọn đáp án: ${msg.answer}`);
      }
      break;

    case 'REACTION':
      console.log(`[💡] Phản hồi từ ${student.name}: ${msg.reaction}`);
      break;
  }
}

// Gửi tin nhắn qua WebSocket socket
function sendWsMessage(socket, data) {
  try {
    const payload = Buffer.from(JSON.stringify(data), 'utf8');
    const length = payload.length;
    let header;

    if (length < 126) {
      header = Buffer.from([0x81, length]);
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    socket.write(Buffer.concat([header, payload]));
  } catch (e) {
    // Lỗi socket ngắt kết nối
  }
}

// Phát sóng tin nhắn cho tất cả học sinh
function broadcast(data) {
  for (const [socket] of state.students) {
    sendWsMessage(socket, data);
  }
}

// ==========================================
// 5. KHỞI CHẠY MÁY CHỦ
// ==========================================
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n======================================================');
  console.log('   📡 CLASSPOINT LIVE SERVER - KHỞI ĐỘNG THÀNH CÔNG');
  console.log('======================================================');
  console.log(`🔑 Mã Lớp Học Hiện Tại: [ ${state.classCode} ]\n`);
  console.log('👉 Đường dẫn dành cho GIÁO VIÊN:');
  console.log(`   http://localhost:${PORT}/teacher\n`);
  console.log('👉 Đường dẫn dành cho HỌC SINH trong cùng mạng Wi-Fi:');
  ips.forEach(item => {
    console.log(`   • [${item.iface}]: http://${item.ip}:${PORT}/?code=${state.classCode}`);
  });
  console.log('======================================================\n');
});
