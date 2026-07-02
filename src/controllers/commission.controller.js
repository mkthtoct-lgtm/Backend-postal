const commissionService = require('../services/commission.service');
const Role = require('../models/Role');
const mongoose = require('mongoose');

class CommissionController {
  /**
   * Cộng tác viên lấy danh sách hoa hồng của chính mình
   */
  async getMyCommissions(req, res) {
    try {
      const collaboratorId = req.user.sub;
      const { status, search, page, limit } = req.query;

      const result = await commissionService.getCommissions({
        collaboratorId,
        status,
        search,
        page,
        limit
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách hoa hồng cá nhân thành công.',
        data: result
      });
    } catch (error) {
      console.error('[CommissionController] Lỗi getMyCommissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách hoa hồng.',
        error: error.message
      });
    }
  }

  /**
   * Cộng tác viên lấy thống kê tiến độ tháng của chính mình
   */
  async getMyStats(req, res) {
    try {
      const collaboratorId = req.user.sub;
      const { month, year } = req.query;

      const result = await commissionService.getCollaboratorStats(
        collaboratorId,
        month,
        year
      );

      return res.status(200).json({
        success: true,
        message: 'Lấy thống kê hoa hồng cá nhân thành công.',
        data: result
      });
    } catch (error) {
      console.error('[CommissionController] Lỗi getMyStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thống kê hoa hồng.',
        error: error.message
      });
    }
  }

  /**
   * Quản trị viên/BGĐ xem toàn bộ hoa hồng của hệ thống (đối soát)
   */
  async getAllCommissions(req, res) {
    try {
      const userRole = await Role.findById(req.user.roleId).lean();
      const userRoleSlug = userRole?.slug;

      if (userRoleSlug !== 'admin' && userRoleSlug !== 'board_of_directors' && userRoleSlug !== 'bangiamdoc') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập dữ liệu đối soát hoa hồng.'
        });
      }

      const { collaboratorId, status, search, page, limit } = req.query;

      const result = await commissionService.getCommissions({
        collaboratorId,
        status,
        search,
        page,
        limit
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy toàn bộ danh sách đối soát hoa hồng thành công.',
        data: result
      });
    } catch (error) {
      console.error('[CommissionController] Lỗi getAllCommissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách đối soát hoa hồng.',
        error: error.message
      });
    }
  }

  /**
   * Quản trị viên duyệt hoặc cập nhật trạng thái hoa hồng (đối soát hoàn tất/thanh toán)
   */
  async updateStatus(req, res) {
    try {
      const userRole = await Role.findById(req.user.roleId).lean();
      const userRoleSlug = userRole?.slug;

      if (userRoleSlug !== 'admin' && userRoleSlug !== 'board_of_directors' && userRoleSlug !== 'bangiamdoc') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền phê duyệt hoa hồng.'
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Mã giao dịch hoa hồng không đúng định dạng.'
        });
      }

      const updated = await commissionService.updateCommissionStatus(id, status);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái đối soát hoa hồng thành công.',
        data: updated
      });
    } catch (error) {
      console.error('[CommissionController] Lỗi updateStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái hoa hồng.',
        error: error.message
      });
    }
  }
}

module.exports = new CommissionController();
