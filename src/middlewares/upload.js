const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đường dẫn lưu trữ thư mục vật lý /uploads ở thư mục gốc của dự án
const uploadDir = path.join(__dirname, '../../uploads');

// Tự động kiểm tra và tạo thư mục /uploads nếu chưa tồn tại
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file duy nhất: [Timestamp]-[Random 9 chữ số]-[Tên gốc đã lọc ký tự đặc biệt]
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Chuẩn hóa tên file để tránh các lỗi encode tiếng Việt hoặc ký tự lạ trên hệ điều hành
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

// Cấu hình giới hạn kích thước file (tối đa 50MB) và lọc định dạng
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 Megabytes
  }
});

module.exports = upload;
