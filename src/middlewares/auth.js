const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Middleware xác thực người dùng bằng JWT Token
 * Lấy token từ header Authorization theo chuẩn 'Bearer <token>'
 */
const authMiddleware = async (req, res, next) => {
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

    // Lấy thông tin mới nhất từ cơ sở dữ liệu để tránh dữ liệu phân quyền bị cũ (stale JWT payload)
    const dbUser = await User.findById(decoded.sub).lean();
    if (!dbUser || dbUser.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị khóa hoạt động.',
      });
    }

    // Gắn thông tin người dùng đã xác thực vào request để các service/controller phía sau sử dụng
    req.user = {
      sub: dbUser._id.toString(),
      roleId: dbUser.roleId ? dbUser.roleId.toString() : null,
      departmentId: dbUser.departmentId ? dbUser.departmentId.toString() : null,
      email: dbUser.email,
      grantedPermissions: Array.isArray(dbUser.grantedPermissions) ? dbUser.grantedPermissions : [],
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Xác thực tài khoản thất bại.',
    });
  }
};

module.exports = authMiddleware;
