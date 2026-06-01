const Role = require('../models/Role');

/**
 * Middleware kiểm tra quyền hạn động của người dùng (Permission-Based Authorization)
 * @param {string} requiredPermission - Mã quyền hạn yêu cầu (e.g. 'departments:write', 'audit:read')
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const user = req.user; // req.user đã được gán bởi authMiddleware trước đó
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Không tìm thấy thông tin đăng nhập hoặc phiên đăng nhập đã hết hạn.',
        });
      }

      const roleId = user.roleId;
      if (!roleId) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn chưa được gán bất kỳ vai trò nào trong hệ thống.',
        });
      }

      // Truy vấn vai trò của người dùng từ MongoDB
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(403).json({
          success: false,
          message: 'Vai trò người dùng của bạn không tồn tại hoặc đã bị gỡ khỏi hệ thống.',
        });
      }

      // Admin có quyền wildcard '*' hoặc vai trò có chứa cụ thể quyền yêu cầu
      const hasWildcard = role.permissions.includes('*');
      const hasDirectPermission = role.permissions.includes(requiredPermission);

      if (hasWildcard || hasDirectPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền: [${requiredPermission}].`,
      });
    } catch (error) {
      console.error('[CheckPermission Error] Lỗi khi kiểm duyệt phân quyền:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi kiểm soát phân quyền hệ thống.',
        error: error.message,
      });
    }
  };
};

module.exports = checkPermission;
