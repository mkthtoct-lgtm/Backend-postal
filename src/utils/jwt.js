const jwt = require('jsonwebtoken');
const env = require('../configs/env');

/**
 * Tạo mã token JWT (Sign Token)
 * @param {Object} payload - Dữ liệu cần mã hóa vào token (ví dụ: userId, role)
 * @param {Object} [options] - Các tùy chọn ghi đè cấu hình mặc định (ví dụ: expiresIn)
 * @returns {string} Chuỗi token JWT đã được ký
 */
const signToken = (payload, options = {}) => {
  const jwtOptions = {
    expiresIn: env.JWT.EXPIRES_IN,
    ...options,
  };
  return jwt.sign(payload, env.JWT.SECRET, jwtOptions);
};

/**
 * Xác thực và giải mã token JWT (Verify Token)
 * @param {string} token - Chuỗi token JWT cần kiểm tra
 * @returns {Object} Payload đã được giải mã từ token nếu hợp lệ
 * @throws {Error} Quăng lỗi nếu token hết hạn hoặc không hợp lệ
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT.SECRET);
  } catch (error) {
    // Trả về lỗi rõ ràng hơn để các middleware/controller xử lý
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token đã hết hạn sử dụng.');
    }
    throw new Error('Token không hợp lệ.');
  }
};

module.exports = {
  signToken,
  verifyToken,
};
