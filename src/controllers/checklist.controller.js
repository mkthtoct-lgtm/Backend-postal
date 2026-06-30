const checklistService = require('../services/checklist.service');
const Role = require('../models/Role');

class ChecklistController {
  /**
   * Lấy danh sách Checklist dựa trên quyền hạn tài khoản đăng nhập
   */
  async getChecklists(req, res) {
    try {
      const { search, status, category, priority } = req.query;

      // Truy vấn vai trò để lấy slug kiểm tra quyền gán việc
      const userRole = await Role.findById(req.user.roleId).lean();
      const roleName = userRole?.slug || 'user';

      const checklists = await checklistService.findAll({
        search,
        status,
        category,
        priority,
        userId: req.user.sub,
        roleName
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách checklist thành công.',
        data: checklists,
      });
    } catch (error) {
      console.error('[ChecklistController] Lỗi getChecklists:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách checklist.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết Checklist
   */
  async getChecklistDetail(req, res) {
    try {
      const { id } = req.params;
      const checklist = await checklistService.findById(id);

      if (!checklist) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy checklist yêu cầu.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết checklist thành công.',
        data: checklist,
      });
    } catch (error) {
      console.error('[ChecklistController] Lỗi getChecklistDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết checklist.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo Checklist mới (Chỉ dành cho Admin / Trưởng bộ phận)
   */
  async createChecklist(req, res) {
    try {
      const checklistData = {
        ...req.body,
        ownerName: req.body.ownerName || 'Hệ thống',
      };
      
      const checklist = await checklistService.create(checklistData);

      return res.status(201).json({
        success: true,
        message: 'Tạo checklist mới thành công.',
        data: checklist,
      });
    } catch (error) {
      console.error('[ChecklistController] Lỗi createChecklist:', error);
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo checklist.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin/tiến độ/trạng thái Checklist
   */
  async updateChecklist(req, res) {
    try {
      const { id } = req.params;
      const updatedChecklist = await checklistService.update(id, req.body);

      if (!updatedChecklist) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy checklist hoặc đã bị xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật checklist thành công.',
        data: updatedChecklist,
      });
    } catch (error) {
      console.error('[ChecklistController] Lỗi updateChecklist:', error);
      return res.status(400).json({
        success: false,
        message: 'Cập nhật checklist thất bại.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm Checklist
   */
  async deleteChecklist(req, res) {
    try {
      const { id } = req.params;
      const deletedChecklist = await checklistService.softDelete(id);

      if (!deletedChecklist) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy checklist cần xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Xóa checklist thành công.',
        data: deletedChecklist,
      });
    } catch (error) {
      console.error('[ChecklistController] Lỗi deleteChecklist:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xóa checklist.',
        error: error.message,
      });
    }
  }
}

module.exports = new ChecklistController();
