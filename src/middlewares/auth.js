const { verifyToken } = require('../utils/jwt');

/**
 * Middleware xác thực người dùng bằng JWT Token
 * Lấy token từ header Authorization theo chuẩn 'Bearer <token>'
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực hoặc sai định dạng (Yêu cầu: Bearer <token>).',
      });
    }

    // Tách token ra khỏi chuỗi 'Bearer <token>'
    const token = authHeader.split(' ')[1];

    // Xác thực token và giải mã payload
    const decoded = verifyToken(token);

    // Gắn thông tin người dùng đã xác thực vào request để các service/controller phía sau sử dụng
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Xác thực tài khoản thất bại.',
    });
  }
};

module.exports = authMiddleware;
