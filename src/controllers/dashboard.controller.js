const dashboardService = require('../services/dashboard.service');

class DashboardController {
  /**
   * Lấy dashboard tùy theo role của người dùng hiện tại (Dynamic Router)
   */
  async getDashboard(req, res) {
    try {
      // req.user được set bởi authMiddleware
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng chưa được xác thực.',
        });
      }

      const dashboardType = req.query.type || req.query.dashboardType;
      const departmentId = req.query.departmentId || req.query.departmentid || req.query.department_id;
      const userId = req.query.userId || req.query.userid || req.query.user_id;

      const dashboardData = await dashboardService.getDashboardByRole(req.user, {
        dashboardType,
        departmentId,
        userId,
      });

      return res.status(200).json({
        success: true,
        message: `Dashboard ${dashboardData.roleName || 'người dùng'} được lấy thành công.`,
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error in getDashboard:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dashboard.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy dashboard cho Ban Giám Đốc (chỉ admin/board_of_directors)
   */
  async getBoardOfDirectorsDashboard(req, res) {
    try {
      const dashboardData = await dashboardService.getBoardOfDirectorsDashboard();

      return res.status(200).json({
        success: true,
        message: 'Dashboard Ban Giám Đốc được lấy thành công.',
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error in getBoardOfDirectorsDashboard:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dashboard Ban Giám Đốc.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy dashboard cho Trưởng bộ phận
   * - Admin: có thể xem dashboard của bất kỳ phòng ban nào (truyền ?departmentId=xxx)
   * - User bình thường: chỉ xem dashboard phòng ban của chính mình
   */
  async getDepartmentHeadDashboard(req, res) {
    try {
      const userRole = req.user.roleId;
      const Role = require('../models/Role');
      const Department = require('../models/Department');
      const userRoleData = await Role.findById(userRole).lean();
      const userRoleSlug = userRoleData?.slug;
      const isAdmin = userRoleSlug === 'admin' || userRoleSlug === 'board_of_directors';

      let departmentId = req.params.departmentId || req.query.departmentId || req.query.departmentid || req.query.department_id || req.user.departmentId;

      if (isAdmin && !departmentId) {
        const firstDepartment = await Department.findOne({ isHidden: false }).lean();
        if (!firstDepartment) {
          return res.status(404).json({
            success: false,
            message: 'Không có phòng ban nào trong hệ thống.',
          });
        }
        departmentId = firstDepartment._id.toString();
      }

      if (!isAdmin && !departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thuộc phòng ban nào.',
        });
      }

      if (!isAdmin && departmentId && departmentId !== req.user.departmentId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem dashboard phòng ban khác.',
        });
      }

      const dashboardData = await dashboardService.getDepartmentHeadDashboard(departmentId);

      return res.status(200).json({
        success: true,
        message: 'Dashboard Trưởng bộ phận được lấy thành công.',
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error in getDepartmentHeadDashboard:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dashboard Trưởng bộ phận.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy dashboard cá nhân cho Nhân sự (nhansu)
   * - Admin: có thể xem dashboard của bất kỳ người dùng nào (truyền ?userId=xxx)
   * - User bình thường: chỉ xem dashboard của chính mình
   */
  async getEmployeeDashboard(req, res) {
    try {
      const userRole = req.user.roleId;
      const Role = require('../models/Role');
      const User = require('../models/User');
      const userRoleData = await Role.findById(userRole).lean();
      const userRoleSlug = userRoleData?.slug;
      const isAdmin = userRoleSlug === 'admin' || userRoleSlug === 'board_of_directors';

      let userId = req.query.userId || req.user.sub || req.user.id;

      if (isAdmin && !req.query.userId) {
        const firstUser = await User.findOne({ deletedAt: null, status: 'active' }).lean();
        if (!firstUser) {
          return res.status(404).json({
            success: false,
            message: 'Không có người dùng nào trong hệ thống.',
          });
        }
        userId = firstUser._id.toString();
      }

      if (!isAdmin && userId && userId !== (req.user.sub || req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem dashboard người dùng khác.',
        });
      }

      const dashboardData = await dashboardService.getEmployeeDashboard(userId);

      return res.status(200).json({
        success: true,
        message: 'Dashboard cá nhân được lấy thành công.',
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error in getEmployeeDashboard:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dashboard cá nhân.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy dashboard cho Đại lý (daily)
   */
  async getAgentDashboard(req, res) {
    try {
      const userRole = req.user.roleId;
      const Role = require('../models/Role');
      const userRoleData = await Role.findById(userRole).lean();
      const userRoleSlug = userRoleData?.slug;
      const isAdmin = userRoleSlug === 'admin' || userRoleSlug === 'board_of_directors';

      let userId = req.query.userId || req.user.sub || req.user.id;

      if (!isAdmin && userId && userId !== (req.user.sub || req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem dashboard Đại lý khác.',
        });
      }

      // Gọi service lấy data đại lý (hoặc dùng chung employee service nếu cấu trúc giống nhau)
      const dashboardData = typeof dashboardService.getAgentDashboard === 'function'
        ? await dashboardService.getAgentDashboard(userId)
        : await dashboardService.getEmployeeDashboard(userId); // Fallback

      return res.status(200).json({
        success: true,
        message: 'Dashboard Đại lý được lấy thành công.',
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error in getAgentDashboard:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dashboard Đại lý.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy dashboard cho Cộng tác viên (congtacvien)
   */
  async getCollaboratorDashboard(req, res) {
    try {
      const userRole = req.user.roleId;
      const Role = require('../models/Role');
      const userRoleData = await Role.findById(userRole).lean();
      const userRoleSlug = userRoleData?.slug;
      const isAdmin = userRoleSlug === 'admin' || userRoleSlug === 'board_of_directors';

      let userId = req.query.userId || req.user.sub || req.user.id;

      if (!isAdmin && userId && userId !== (req.user.sub || req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem dashboard Cộng tác viên khác.',
        });
      }

      // Gọi service lấy data cộng tác viên (hoặc dùng chung employee service)
      const dashboardData = typeof dashboardService.getCollaboratorDashboard === 'function'
        ? await dashboardService.getCollaboratorDashboard(userId)
        : await dashboardService.getEmployeeDashboard(userId); // Fallback

      return res.status(200).json({
        success: true,
        message: 'Dashboard Cộng tác viên được lấy thành công.',
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error in getCollaboratorDashboard:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dashboard Cộng tác viên.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy dashboard cho Khách hàng (user)
   */
  async getUserDashboard(req, res) {
    try {
      const userRole = req.user.roleId;
      const Role = require('../models/Role');
      const userRoleData = await Role.findById(userRole).lean();
      const userRoleSlug = userRoleData?.slug;
      const isAdmin = userRoleSlug === 'admin' || userRoleSlug === 'board_of_directors';

      let userId = req.query.userId || req.user.sub || req.user.id;

      if (!isAdmin && userId && userId !== (req.user.sub || req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem dashboard người dùng khác.',
        });
      }

      // Gọi service lấy data khách hàng (hoặc dùng chung employee service)
      const dashboardData = typeof dashboardService.getUserDashboard === 'function'
        ? await dashboardService.getUserDashboard(userId)
        : await dashboardService.getEmployeeDashboard(userId); // Fallback

      return res.status(200).json({
        success: true,
        message: 'Dashboard cá nhân được lấy thành công.',
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error in getUserDashboard:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dashboard cá nhân.',
        error: error.message,
      });
    }
  }
}

module.exports = new DashboardController();
