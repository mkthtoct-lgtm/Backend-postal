const env = require('../configs/env');

/**
 * Chuẩn hóa URL ảnh/tài liệu để phục vụ client, giải quyết Mixed Content và localhost URL trong DB
 * @param {string} url - URL cần chuẩn hóa
 * @param {Object} req - Request object của Express
 * @returns {string} URL đã được chuẩn hóa tuyệt đối với protocol/host hiện tại
 */
const normalizeUploadUrl = (url, req) => {
  if (!url || typeof url !== 'string') return url;

  // Nếu là ảnh base64 (data URI), bỏ qua không xử lý
  if (url.startsWith('data:')) {
    return url;
  }

  // Nếu url chứa đường dẫn uploads
  if (url.includes('/uploads/')) {
    // Cắt lấy phần path bắt đầu từ /uploads/
    const match = url.match(/(\/uploads\/.+)/);
    if (match) {
      const uploadPath = match[1];

      // Nếu có cấu hình BACKEND_URL trong env, sử dụng nó làm domain gốc tuyệt đối
      if (env.BACKEND_URL) {
        const cleanBaseUrl = env.BACKEND_URL.replace(/\/+$/, '');
        return `${cleanBaseUrl}${uploadPath}`;
      }

      // Hỗ trợ check x-forwarded-proto để lấy giao thức HTTPS thực tế trên môi trường VPS chạy qua proxy
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      return `${protocol}://${host}${uploadPath}`;
    }
  }

  return url;
};

module.exports = {
  normalizeUploadUrl
};
