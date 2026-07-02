const mongoose = require('mongoose');
const departmentService = require('../services/department.service');
const Role = require('../models/Role');

// Hàm helper chuẩn hóa department document thành response FE mong đợi
const formatDepartment = (dept) => {
  const obj = dept.toObject ? dept.toObject() : dept;
  return {
    ...obj,
    id: obj._id ? obj._id.toString() : obj.id,
  };
};

class DepartmentController {
  /**
   * Lấy danh sách tất cả phòng ban đang hoạt động (chưa bị ẩn)
   */
  async getAllDepartments(req, res) {
    try {
      let includeHidden = false;
      if (req.query.includeHidden === 'true' && req.user) {
        const role = await Role.findById(req.user.roleId);
        if (role && (role.slug === 'admin' || role.slug === 'board_of_directors' || role.slug === 'bangiamdoc')) {
          includeHidden = true;
        }
      }

      const departments = await departmentService.findAll(includeHidden);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách phòng ban thành công.',
        data: departments,
      });
    } catch (error) {
      console.error('Error in getAllDepartments:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách phòng ban.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo mới phòng ban (chỉ Admin)
   */
  async createDepartment(req, res) {
    try {
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên phòng ban không được để trống.',
        });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Tên phòng ban phải có ít nhất 2 ký tự.',
        });
      }

      if (name.trim().length > 120) {
        return res.status(400).json({
          success: false,
          message: 'Tên phòng ban không được vượt quá 120 ký tự.',
        });
      }

      // Kiểm duyệt trùng lặp tên phòng ban
      const existing = await departmentService.findByName(name);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Tên phòng ban này đã tồn tại trong hệ thống.',
        });
      }

      const newDepartment = await departmentService.create({ name, description });

      // Ghi lịch sử thao tác tạo phòng ban
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'department.create',
        { type: 'department', id: newDepartment._id.toString(), name: newDepartment.name },
        { name: newDepartment.name, description: newDepartment.description || '' }
      );

      return res.status(201).json({
        success: true,
        message: 'Tạo phòng ban thành công.',
        data: formatDepartment(newDepartment),
      });
    } catch (error) {
      console.error('Error in createDepartment:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo phòng ban.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin phòng ban (chỉ Admin)
   */
  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID phòng ban không hợp lệ.',
        });
      }

      // Kiểm tra phòng ban có tồn tại không
      const department = await departmentService.findById(id);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Phòng ban không tồn tại.',
        });
      }

      // Kiểm duyệt trùng tên với phòng ban khác khi đổi tên
      if (name && name.trim().toLowerCase() !== department.name.toLowerCase()) {
        const existing = await departmentService.findByName(name, id);
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Tên phòng ban đã tồn tại ở một phòng ban khác.',
          });
        }
      }

      const updated = await departmentService.update(id, { name, description });

      // Ghi lịch sử thao tác cập nhật phòng ban
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'department.update',
        { type: 'department', id: updated._id.toString(), name: updated.name },
        { name, description }
      );

      return res.status(200).json({
        success: true,
        message: 'Cập nhật phòng ban thành công.',
        data: formatDepartment(updated),
      });
    } catch (error) {
      console.error('Error in updateDepartment:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật phòng ban.',
        error: error.message,
      });
    }
  }



  /**
   * Đảo ngược trạng thái hiển thị (Bật/Tắt ẩn) của phòng ban (chỉ Admin)
   */
  async toggleVisibility(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID phòng ban không hợp lệ.',
        });
      }

      const updated = await departmentService.toggleVisibility(id);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Phòng ban không tồn tại.',
        });
      }

      // Ghi lịch sử thao tác
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'department.update',
        { type: 'department', id: updated._id.toString(), name: updated.name },
        { isHidden: updated.isHidden }
      );

      return res.status(200).json({
        success: true,
        message: updated.isHidden
          ? 'Đã ẩn phòng ban thành công.'
          : 'Đã hiển thị phòng ban thành công.',
        data: formatDepartment(updated),
      });
    } catch (error) {
      console.error('Error in toggleVisibility:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái hiển thị phòng ban.',
        error: error.message,
      });
    }
  }
}

module.exports = new DepartmentController();
