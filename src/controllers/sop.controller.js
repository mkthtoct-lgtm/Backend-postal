const sopService = require('../services/sop.service');
//hellloooo
class SopController {
  /**
   * Lấy danh sách SOP có bộ lọc
   */
  async getSops(req, res) {
    try {
      const { search, category, department, status } = req.query;

      // Lấy roleName của user đăng nhập
      const Role = require('../models/Role');
      const userRole = await Role.findById(req.user.roleId).lean();
      const roleName = userRole?.slug || 'user';

      const sops = await sopService.findAll({ search, category, department, status, roleName });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách SOP thành công.',
        data: sops,
      });
    } catch (error) {
      console.error('[SopController] Lỗi getSops:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách SOP.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết một bản ghi SOP
   */
  async getSopDetail(req, res) {
    try {
      const { id } = req.params;
      const sop = await sopService.findById(id);

      if (!sop) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy SOP yêu cầu.',
        });
      }

      // Lấy roleName của user đăng nhập để kiểm tra quyền truy cập chi tiết
      const Role = require('../models/Role');
      const userRole = await Role.findById(req.user.roleId).lean();
      const roleName = userRole?.slug || 'user';

      if (
        roleName !== 'admin' &&
        roleName !== 'board_of_directors' &&
        roleName !== 'bangiamdoc' &&
        sop.allowedRoles &&
        !sop.allowedRoles.includes('all') &&
        !sop.allowedRoles.includes(roleName)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập tài liệu SOP này.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết SOP thành công.',
        data: sop,
      });
    } catch (error) {
      console.error('[SopController] Lỗi getSopDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết SOP.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo SOP mới (Chỉ dành cho Admin / Trưởng bộ phận)
   */
  async createSop(req, res) {
    try {
      const sop = await sopService.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Tạo SOP mới thành công.',
        data: sop,
      });
    } catch (error) {
      console.error('[SopController] Lỗi createSop:', error);
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo SOP. Vui lòng kiểm tra lại dữ liệu đầu vào.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin SOP
   */
  async updateSop(req, res) {
    try {
      const { id } = req.params;
      const updatedSop = await sopService.update(id, req.body);

      if (!updatedSop) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy SOP hoặc SOP đã bị xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật SOP thành công.',
        data: updatedSop,
      });
    } catch (error) {
      console.error('[SopController] Lỗi updateSop:', error);
      return res.status(400).json({
        success: false,
        message: 'Cập nhật SOP thất bại.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm SOP
   */
  async deleteSop(req, res) {
    try {
      const { id } = req.params;
      const deletedSop = await sopService.softDelete(id);

      if (!deletedSop) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy SOP cần xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Xóa SOP thành công.',
        data: deletedSop,
      });
    } catch (error) {
      console.error('[SopController] Lỗi deleteSop:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xóa SOP.',
        error: error.message,
      });
    }
  }
}

module.exports = new SopController();
