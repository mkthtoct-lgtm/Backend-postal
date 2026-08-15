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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

// Cấu hình upload cho Image (tối đa 50MB) - Global default
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Cấu hình upload cho Document (tối đa 50MB)
const uploadDocument = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Cấu hình upload cho Video (tối đa 1GB)
const uploadVideo = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 1024 }
});

module.exports = upload;
module.exports.uploadImage = upload;
module.exports.uploadDocument = uploadDocument;
module.exports.uploadVideo = uploadVideo;
