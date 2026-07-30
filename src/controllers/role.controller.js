const mongoose = require('mongoose');
const roleService = require('../services/role.service');
const auditLogService = require('../services/auditLog.service');

// Định dạng lại đối tượng vai trò trả về cho phía FE (sử dụng id thay vì _id)
const formatRole = (role) => {
  const obj = role.toObject ? role.toObject() : role;
  return {
    ...obj,
    id: obj._id ? obj._id.toString() : obj.id,
  };
};

class RoleController {
  /**
   * Lấy danh sách toàn bộ vai trò kèm số lượng người dùng đang gán vai trò đó
   */
  async getAllRoles(req, res) {
    try {
      let includeHidden = false;
      if (req.query.includeHidden === 'true' && req.user) {
        const RoleModel = require('../models/Role');
        const userRole = await RoleModel.findById(req.user.roleId);
        if (userRole && (userRole.slug === 'admin' || userRole.slug === 'board_of_directors' || userRole.slug === 'bangiamdoc')) {
          includeHidden = true;
        }
      }

      const roles = await roleService.findAll(includeHidden);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách vai trò thành công.',
        data: roles,
      });
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách vai trò.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết vai trò theo ID
   */
  async getRoleById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID vai trò không hợp lệ.',
        });
      }

      const role = await roleService.findById(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Vai trò không tồn tại.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết vai trò thành công.',
        data: formatRole(role),
      });
    } catch (error) {
      console.error('Error in getRoleById:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thông tin vai trò.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo vai trò mới
   */
  async createRole(req, res) {
    try {
      const { name, slug, permissions, description } = req.body;

      // 1. Kiểm tra trường dữ liệu bắt buộc
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên vai trò không được để trống.',
        });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Tên vai trò phải có ít nhất 2 ký tự.',
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Tên vai trò không được vượt quá 100 ký tự.',
        });
      }

      if (permissions !== undefined && !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Quyền hạn (permissions) phải là một mảng chuỗi.',
        });
      }

      // 2. Kiểm duyệt trùng lặp tên vai trò
      const existingName = await roleService.findByName(name);
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: 'Tên vai trò này đã tồn tại trong hệ thống.',
        });
      }

      // 3. Kiểm duyệt trùng lặp slug vai trò
      const finalSlug = slug ? roleService.slugify(slug) : roleService.slugify(name);
      const existingSlug = await roleService.findBySlug(finalSlug);
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: 'Slug vai trò này đã tồn tại (hoặc được sinh ra từ tên bị trùng lặp).',
        });
      }

      // 4. Tạo mới vai trò
      const newRole = await roleService.create({ name, slug: finalSlug, permissions, description });

      // 5. Ghi nhận nhật ký hoạt động (Audit log)
      if (req.user && req.user.sub) {
        auditLogService.log(
          req.user.sub,
          'role.create',
          { type: 'role', id: newRole._id.toString(), name: newRole.name },
          { name: newRole.name, slug: newRole.slug, permissions: newRole.permissions }
        );
      }

      return res.status(201).json({
        success: true,
        message: 'Tạo vai trò thành công.',
        data: formatRole(newRole),
      });
    } catch (error) {
      console.error('Error in createRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo vai trò.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin vai trò
   */
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, slug, permissions, description } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID vai trò không hợp lệ.',
        });
      }

      // 1. Kiểm tra vai trò có tồn tại không
      const role = await roleService.findById(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Vai trò không tồn tại trong hệ thống.',
        });
      }

      // 2. Kiểm duyệt trùng tên
      if (name && name.trim().toLowerCase() !== role.name.toLowerCase()) {
        const existingName = await roleService.findByName(name, id);
        if (existingName) {
          return res.status(400).json({
            success: false,
            message: 'Tên vai trò này đã trùng lặp với một vai trò khác.',
          });
        }
      }

      // 3. Kiểm duyệt trùng slug
      if (slug) {
        const newSlug = roleService.slugify(slug);
        if (newSlug !== role.slug) {
          const existingSlug = await roleService.findBySlug(newSlug, id);
          if (existingSlug) {
            return res.status(400).json({
              success: false,
              message: 'Slug vai trò này đã tồn tại ở một vai trò khác.',
            });
          }
        }
      }

      if (permissions !== undefined && !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Quyền hạn (permissions) phải là một mảng chuỗi.',
        });
      }

      // 4. Cập nhật thông tin qua service (nơi có cơ chế chặn đổi slug vai trò hệ thống)
      let updatedRole;
      try {
        updatedRole = await roleService.update(id, { name, slug, permissions, description });
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      // 5. Ghi nhận nhật ký hoạt động (Audit log)
      if (req.user && req.user.sub && updatedRole) {
        auditLogService.log(
          req.user.sub,
          'role.update',
          { type: 'role', id: updatedRole._id.toString(), name: updatedRole.name },
          { name, slug, permissions, description }
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật vai trò thành công.',
        data: formatRole(updatedRole),
      });
    } catch (error) {
      console.error('Error in updateRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật vai trò.',
        error: error.message,
      });
    }
  }

  /**
   * Thay đổi trạng thái hiển thị (Bật/Tắt ẩn) của vai trò
   */
  async toggleVisibility(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID vai trò không hợp lệ.',
        });
      }

      const updated = await roleService.toggleVisibility(id);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Vai trò không tồn tại.',
        });
      }

      // Ghi lịch sử hoạt động (Audit log)
      if (req.user && req.user.sub) {
        auditLogService.log(
          req.user.sub,
          'role.update',
          { type: 'role', id: updated._id.toString(), name: updated.name },
          { isHidden: updated.isHidden }
        );
      }

      return res.status(200).json({
        success: true,
        message: updated.isHidden
          ? 'Đã ẩn vai trò thành công.'
          : 'Đã hiển thị vai trò thành công.',
        data: formatRole(updated),
      });
    } catch (error) {
      console.error('Error in toggleVisibility:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi thay đổi trạng thái ẩn/hiện vai trò.',
        error: error.message,
      });
    }
  }
}

module.exports = new RoleController();
