const mongoose = require('mongoose');
const documentService = require('../services/document.service');
const Role = require('../models/Role');

const PERMISSION_ALIASES = {
  'documents:view': 'documents:read',
  'documents:upload': 'documents:write',
  'documents:edit': 'documents:write',
  'documents:delete': 'documents:write',
};

const expandPermissions = (permissions = []) => {
  const expanded = new Set();
  permissions.filter(Boolean).forEach((permission) => {
    expanded.add(permission);
    if (PERMISSION_ALIASES[permission]) expanded.add(PERMISSION_ALIASES[permission]);
  });
  return Array.from(expanded);
};

/**
 * Phân nhóm người dùng dựa trên vai trò để kiểm duyệt quyền tài liệu (quy chuẩn tương thích Frontend)
 */
const getUserGroupIds = (roleSlug) => {
  const groups = ['all'];
  const normRole = roleSlug === 'board_of_directors' ? 'bangiamdoc' : roleSlug;

  if (['admin', 'bangiamdoc', 'board_of_directors', 'truongbophan', 'nhansu', 'user', 'staff'].includes(normRole)) {
    groups.push('internal');
  }

  if (['daily', 'congtacvien'].includes(normRole)) {
    groups.push('partner');
  }

  if (['admin', 'bangiamdoc', 'board_of_directors', 'truongbophan'].includes(normRole)) {
    groups.push('manager');
  }

  return groups;
};

const canUseDocumentAction = ({ roleSlug, rolePermissions = [], departmentId, document, action }) => {
  if (roleSlug === 'admin') return true;
  if (Array.isArray(rolePermissions) && (rolePermissions.includes('*') || rolePermissions.includes('documents:write'))) {
    return true;
  }

  const rule = document.permissions?.[action] || { groups: [], roles: [], departments: [] };
  const userGroups = getUserGroupIds(roleSlug);

  return (
    (Array.isArray(rule.groups) && rule.groups.some(group => userGroups.includes(group))) ||
    (Array.isArray(rule.roles) && rule.roles.includes(roleSlug)) ||
    Boolean(departmentId && Array.isArray(rule.departments) && rule.departments.includes(departmentId.toString()))
  );
};

class DocumentController {
  /**
   * Lấy danh sách tài liệu có phân trang và bộ lọc theo danh mục
   */
  async getDocuments(req, res) {
    try {
      let { page, limit, categoryId, departmentId } = req.query;

      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;

      // Kiểm định tính hợp lệ của categoryId nếu được cung cấp
      if (categoryId && categoryId !== 'all' && !mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã danh mục (categoryId) không hợp lệ.',
        });
      }

      if (departmentId && departmentId !== 'all' && !mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã phòng ban (departmentId) không hợp lệ.',
        });
      }

      // Lấy vai trò và phòng ban của user đang đăng nhập
      let roleSlug = '';
      let userDepartmentId = null;
      let rolePermissions = [];
      if (req.user) {
        userDepartmentId = req.user.departmentId;
        if (req.user.roleId) {
          const role = await Role.findById(req.user.roleId);
          if (role) {
            roleSlug = role.slug;
            rolePermissions = expandPermissions([
              ...(Array.isArray(role.permissions) ? role.permissions : []),
              ...(Array.isArray(req.user.grantedPermissions) ? req.user.grantedPermissions : []),
            ]);
          }
        }
      }

      const result = await documentService.findAndCount({ 
        page, 
        limit, 
        categoryId, 
        roleSlug, 
        rolePermissions,
        departmentId: userDepartmentId,
        filterDepartmentId: departmentId,
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách tài liệu thành công.',
        data: result,
      });
    } catch (error) {
      console.error('Error in getDocuments:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết thông tin 1 tài liệu theo ID
   */
  async getDocumentDetail(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID tài liệu không hợp lệ.',
        });
      }

      const document = await documentService.findById(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Tài liệu không tồn tại hoặc đã bị xóa mềm.',
        });
      }

      let detailRoleSlug = '';
      let detailRolePermissions = [];

      // Kiểm tra quyền xem tài liệu của user đăng nhập
      if (req.user) {
        let roleSlug = '';
        let role = null;
        if (req.user.roleId) {
          role = await Role.findById(req.user.roleId);
          if (role) {
            roleSlug = role.slug;
          }
        }
        detailRoleSlug = roleSlug;
        detailRolePermissions = expandPermissions([
          ...(Array.isArray(role?.permissions) ? role.permissions : []),
          ...(Array.isArray(req.user.grantedPermissions) ? req.user.grantedPermissions : []),
        ]);

        if (roleSlug !== 'admin') {
          const userGroups = getUserGroupIds(roleSlug);
          const permissions = document.permissions || {};
          const viewRule = permissions.view || { groups: ['all'], roles: [], departments: [] };
          const rolePermissions = detailRolePermissions;

          const hasGroup = viewRule.groups && viewRule.groups.some(g => userGroups.includes(g));
          const hasRole = viewRule.roles && viewRule.roles.includes(roleSlug);
          const hasDept = req.user.departmentId && viewRule.departments && viewRule.departments.includes(req.user.departmentId.toString());
          const hasRoleReadPermission = rolePermissions.includes('*') || rolePermissions.includes('documents:read');

          if (!hasRoleReadPermission && !hasGroup && !hasRole && !hasDept) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền xem chi tiết tài liệu này.',
            });
          }
        }
      }

      const canEdit = canUseDocumentAction({
        roleSlug: detailRoleSlug,
        rolePermissions: detailRolePermissions,
        departmentId: req.user?.departmentId,
        document,
        action: 'edit',
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết tài liệu thành công.',
        data: {
          ...document,
          capabilities: {
            canEdit,
            canDelete: canEdit,
            canUpload: detailRoleSlug === 'admin' ||
              (Array.isArray(detailRolePermissions) &&
                (detailRolePermissions.includes('*') || detailRolePermissions.includes('documents:write'))),
          },
          canEdit,
          canDelete: canEdit,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo tài liệu mới
   */
  async createDocument(req, res) {
    try {
      const { title, categoryId, departmentId, schoolId, productId, fileUrl, fileType, isAiTrainingSource, status, permissions } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề tài liệu không được để trống.',
        });
      }

      if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã danh mục (categoryId) không hợp lệ.',
        });
      }

      const cleanDeptId = (departmentId && mongoose.Types.ObjectId.isValid(departmentId))
        ? new mongoose.Types.ObjectId(departmentId)
        : null;

      let cleanStatus = status || 'draft';
      if (cleanStatus === 'Nháp') cleanStatus = 'draft';
      else if (cleanStatus === 'Chờ duyệt') cleanStatus = 'pending';
      else if (cleanStatus === 'Đang dùng' || cleanStatus === 'Cần cập nhật') cleanStatus = 'active';
      else if (cleanStatus === 'Ngừng dùng') cleanStatus = 'inactive';

      const newDoc = await documentService.create({
        title,
        categoryId: new mongoose.Types.ObjectId(categoryId),
        departmentId: cleanDeptId,
        schoolId,
        productId,
        fileUrl,
        fileType,
        isAiTrainingSource,
        uploadedById: req.user ? req.user.sub : null,
        status: cleanStatus,
        permissions,
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo tài liệu mới thành công.',
        data: newDoc,
      });
    } catch (error) {
      console.error('Error in createDocument:', error);
      console.error('Request Body:', req.body);
      console.error('Request User:', req.user);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin, trạng thái, hoặc phân quyền tài liệu
   */
  async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const { title, categoryId, departmentId, fileUrl, fileType, isAiTrainingSource, status, permissions } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID tài liệu không hợp lệ.',
        });
      }

      const existingDoc = await documentService.findById(id);
      if (!existingDoc) {
        return res.status(404).json({
          success: false,
          message: 'Tài liệu không tồn tại hoặc đã bị xóa.',
        });
      }

      // Kiểm tra quyền chỉnh sửa tài liệu
      if (req.user) {
        let roleSlug = '';
        let role = null;
        if (req.user.roleId) {
          role = await Role.findById(req.user.roleId);
          if (role) {
            roleSlug = role.slug;
          }
        }

        const rolePermissions = expandPermissions([
          ...(Array.isArray(role?.permissions) ? role.permissions : []),
          ...(Array.isArray(req.user.grantedPermissions) ? req.user.grantedPermissions : []),
        ]);
        const hasWritePermission = rolePermissions.includes('*') || rolePermissions.includes('documents:write');

        if (roleSlug !== 'admin' && !hasWritePermission) {
          const userGroups = getUserGroupIds(roleSlug);
          const docPermissions = existingDoc.permissions || {};
          const editRule = docPermissions.edit || { groups: ['manager'], roles: ['admin', 'truongbophan'], departments: [] };

          const hasGroup = editRule.groups && editRule.groups.some(g => userGroups.includes(g));
          const hasRole = editRule.roles && editRule.roles.includes(roleSlug);
          const hasDept = req.user.departmentId && editRule.departments && editRule.departments.includes(req.user.departmentId.toString());

          if (!hasGroup && !hasRole && !hasDept) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền chỉnh sửa tài liệu này.',
            });
          }
        }
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (fileUrl !== undefined) updateData.fileUrl = fileUrl.trim();
      if (fileType !== undefined) updateData.fileType = fileType.trim();
      if (isAiTrainingSource !== undefined) updateData.isAiTrainingSource = isAiTrainingSource;
      
      if (status !== undefined) {
        let cleanStatus = status;
        if (cleanStatus === 'Nháp') cleanStatus = 'draft';
        else if (cleanStatus === 'Chờ duyệt') cleanStatus = 'pending';
        else if (cleanStatus === 'Đang dùng' || cleanStatus === 'Cần cập nhật') cleanStatus = 'active';
        else if (cleanStatus === 'Ngừng dùng') cleanStatus = 'inactive';
        updateData.status = cleanStatus;
      }
      
      if (permissions !== undefined) updateData.permissions = permissions;

      if (categoryId !== undefined) {
        if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
          return res.status(400).json({
            success: false,
            message: 'Mã danh mục (categoryId) không hợp lệ.',
          });
        }
        updateData.categoryId = new mongoose.Types.ObjectId(categoryId);
      }

      if (departmentId !== undefined) {
        updateData.departmentId = (departmentId && mongoose.Types.ObjectId.isValid(departmentId))
          ? new mongoose.Types.ObjectId(departmentId)
          : null;
      }

      const updatedDoc = await documentService.update(id, updateData);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật tài liệu thành công.',
        data: updatedDoc,
      });
    } catch (error) {
      console.error('Error in updateDocument:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm tài liệu
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID tài liệu không hợp lệ.',
        });
      }

      const existingDoc = await documentService.findById(id);
      if (!existingDoc) {
        return res.status(404).json({
          success: false,
          message: 'Tài liệu không tồn tại hoặc đã bị xóa trước đó.',
        });
      }

      // Kiểm tra quyền xóa tài liệu
      if (req.user) {
        let roleSlug = '';
        let role = null;
        if (req.user.roleId) {
          role = await Role.findById(req.user.roleId);
          if (role) {
            roleSlug = role.slug;
          }
        }

        const rolePermissions = expandPermissions([
          ...(Array.isArray(role?.permissions) ? role.permissions : []),
          ...(Array.isArray(req.user.grantedPermissions) ? req.user.grantedPermissions : []),
        ]);
        const hasWritePermission = rolePermissions.includes('*') || rolePermissions.includes('documents:write');

        if (roleSlug !== 'admin' && !hasWritePermission) {
          const userGroups = getUserGroupIds(roleSlug);
          const docPermissions = existingDoc.permissions || {};
          const editRule = docPermissions.edit || { groups: ['manager'], roles: ['admin', 'truongbophan'], departments: [] };

          const hasGroup = editRule.groups && editRule.groups.some(g => userGroups.includes(g));
          const hasRole = editRule.roles && editRule.roles.includes(roleSlug);
          const hasDept = req.user.departmentId && editRule.departments && editRule.departments.includes(req.user.departmentId.toString());

          if (!hasGroup && !hasRole && !hasDept) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền xóa tài liệu này.',
            });
          }
        }
      }

      await documentService.softDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Xóa tài liệu thành công.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa tài liệu.',
        error: error.message,
      });
    }
  }
}

module.exports = new DocumentController();
