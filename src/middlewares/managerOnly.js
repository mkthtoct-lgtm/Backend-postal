/**
 * Middleware kiểm tra quyền quản lý (Admin hoặc Ban Giám Đốc).
 * Phải dùng sau authMiddleware để req.user đã được gán.
 *
 * Các roleId được phép:
 *   - Admin:         69fc5af582ef85451120772a
 *   - Ban Giám Đốc:  69fc5af582ef85451120772b
 */

const ALLOWED_ROLE_IDS = [
  '69fc5af582ef85451120772a', // Admin
  '69fc5af582ef85451120772b', // Ban Giám Đốc
];

const managerOnly = (req, res, next) => {
  const userRoleId = req.user?.roleId;

  if (!userRoleId || !ALLOWED_ROLE_IDS.includes(userRoleId.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác này. Chỉ Admin hoặc Ban Giám Đốc mới được phép.',
    });
  }

  next();
};

module.exports = managerOnly;
