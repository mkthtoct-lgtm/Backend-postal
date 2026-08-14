const Role = require('../models/Role');

const PERMISSION_ALIASES = {
  'documents:view': 'documents:read',
  'documents:upload': 'documents:write',
  'documents:edit': 'documents:write',
  'documents:delete': 'documents:write',
  'notifications:view': 'notifications:read',
  'notifications:create': 'notifications:write',
  'users:view': 'users:read',
  'users:edit': 'users:write',
  'users:lock': 'users:write',
  // Backward compatibility for products/leads
  'products:read': 'dao_tao.view',
  'products:write': ['dao_tao.create', 'dao_tao.update', 'dao_tao.delete', 'dao_tao.upload_image'],
  'leads:read': 'crm.course_leads.view',
  'leads:write': ['crm.course_leads.assign', 'crm.course_leads.process', 'crm.course_leads.release', 'crm.course_leads.submit_proof', 'crm.course_leads.archive', 'crm.course_leads.restore'],
};

const expandPermissions = (permissions = []) => {
  const expanded = new Set();
  permissions.filter(Boolean).forEach((permission) => {
    expanded.add(permission);
    const aliases = PERMISSION_ALIASES[permission];
    if (aliases) {
      if (Array.isArray(aliases)) {
        aliases.forEach(alias => expanded.add(alias));
      } else {
        expanded.add(aliases);
      }
    }
  });
  return Array.from(expanded);
};

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

      const effectivePermissions = expandPermissions([
        ...(Array.isArray(role.permissions) ? role.permissions : []),
        ...(Array.isArray(user.grantedPermissions) ? user.grantedPermissions : []),
      ]);

      // Admin có quyền wildcard '*' hoặc vai trò/user có chứa cụ thể quyền yêu cầu
      const hasWildcard = effectivePermissions.includes('*');
      const hasDirectPermission = effectivePermissions.includes(requiredPermission);

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
