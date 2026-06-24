const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const Role = require('../models/Role');

class DashboardService {
  /**
   * Lấy thông tin role bằng ID
   */
  async getRoleInfo(roleId) {
    try {
      return await Role.findById(roleId).lean();
    } catch (error) {
      console.error('Error fetching role:', error.message);
      return null;
    }
  }

  /**
   * Dashboard cho Ban Giám Đốc (BGĐ) - Tổng quan toàn hệ thống
   */
  async getBoardOfDirectorsDashboard() {
    try {
      // Tổng số statistics
      const [totalUsers, totalDepartments, totalDocuments, totalActiveDocuments] = await Promise.all([
        User.countDocuments({ deletedAt: null, status: 'active' }),
        Department.countDocuments({ isHidden: false }),
        Document.countDocuments({ deletedAt: null }),
        Document.countDocuments({ deletedAt: null, status: 'active' }),
      ]);

      // Top 5 phòng ban theo số nhân sự
      const topDepartments = await Department.aggregate([
        { $match: { isHidden: false } },
        {
          $lookup: {
            from: 'users',
            let: { deptId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$departmentId', '$$deptId'] },
                  deletedAt: null,
                  status: 'active',
                },
              },
            ],
            as: 'members',
          },
        },
        {
          $addFields: {
            memberCount: { $size: '$members' },
          },
        },
        { $sort: { memberCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 1,
            id: { $toString: '$_id' },
            name: 1,
            description: 1,
            memberCount: 1,
          },
        },
      ]);

      // Tài liệu gần đây (10 tài liệu mới nhất)
      const recentDocuments = await Document.find({ deletedAt: null, status: 'active' })
        .select('_id title status updatedAt')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();

      const formattedDocuments = recentDocuments.map((doc) => ({
        id: doc._id.toString(),
        title: doc.title,
        status: doc.status,
        updatedAt: doc.updatedAt,
      }));

      // Hoạt động gần đây (10 log mới nhất)
      const recentActivities = await AuditLog.find()
        .populate('userId', 'fullName email')
        .select('_id action target metadata createdAt userId')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const formattedActivities = recentActivities.map((log) => ({
        id: log._id.toString(),
        actor: log.userId ? {
          id: log.userId._id.toString(),
          fullName: log.userId.fullName,
          email: log.userId.email,
        } : { fullName: 'Hệ thống', email: 'system' },
        action: log.action,
        target: log.target,
        createdAt: log.createdAt,
      }));

      return {
        role: 'board_of_directors',
        roleName: 'Ban Giám Đốc',
        stats: {
          totalUsers,
          totalDepartments,
          totalDocuments,
          totalActiveDocuments,
        },
        topDepartments,
        recentDocuments: formattedDocuments,
        recentActivities: formattedActivities,
      };
    } catch (error) {
      console.error('Error in getBoardOfDirectorsDashboard:', error.message);
      throw error;
    }
  }

  /**
   * Dashboard cho Trưởng bộ phận - Thông tin bộ phận chuyên môn của họ
   */
  async getDepartmentHeadDashboard(departmentId) {
    try {
      // Thông tin phòng ban
      const department = await Department.findOne({ _id: departmentId, isHidden: false }).lean();
      if (!department) {
        throw new Error('Phòng ban không tồn tại hoặc đã bị ẩn.');
      }

      // Nhân sự của phòng ban
      const departmentMembers = await User.find({
        departmentId: new mongoose.Types.ObjectId(departmentId),
        deletedAt: null,
      })
        .select('_id fullName email status roleId')
        .lean();

      const memberStats = {
        total: departmentMembers.length,
        active: departmentMembers.filter((m) => m.status === 'active').length,
        inactive: departmentMembers.filter((m) => m.status === 'inactive').length,
        suspended: departmentMembers.filter((m) => m.status === 'suspended').length,
      };

      // Tài liệu của phòng ban
      const departmentDocuments = await Document.find({
        $or: [
          { departmentId: new mongoose.Types.ObjectId(departmentId) },
          { uploadedById: { $in: departmentMembers.map((m) => m._id) } },
        ],
        deletedAt: null,
      })
        .select('_id title status createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(15)
        .lean();

      const formattedDocuments = departmentDocuments.map((doc) => ({
        id: doc._id.toString(),
        title: doc.title,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      // Hoạt động của phòng ban (thao tác của nhân sự trong phòng)
      const departmentActivities = await AuditLog.find({
        userId: { $in: departmentMembers.map((m) => m._id) },
      })
        .populate('userId', 'fullName email')
        .select('_id action target metadata createdAt userId')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const formattedActivities = departmentActivities.map((log) => ({
        id: log._id.toString(),
        actor: log.userId ? {
          id: log.userId._id.toString(),
          fullName: log.userId.fullName,
          email: log.userId.email,
        } : { fullName: 'Hệ thống', email: 'system' },
        action: log.action,
        target: log.target,
        createdAt: log.createdAt,
      }));

      return {
        role: 'truongbophan',
        roleName: 'Trưởng bộ phận',
        department: {
          id: department._id.toString(),
          name: department.name,
          description: department.description,
          createdAt: department.createdAt,
        },
        memberStats,
        members: departmentMembers.map((m) => ({
          id: m._id.toString(),
          fullName: m.fullName,
          email: m.email,
          status: m.status,
        })),
        documentStats: {
          total: departmentDocuments.length,
          active: departmentDocuments.filter((d) => d.status === 'active').length,
          draft: departmentDocuments.filter((d) => d.status === 'draft').length,
          pending: departmentDocuments.filter((d) => d.status === 'pending').length,
          inactive: departmentDocuments.filter((d) => d.status === 'inactive').length,
        },
        recentDocuments: formattedDocuments,
        recentActivities: formattedActivities,
      };
    } catch (error) {
      console.error('Error in getDepartmentHeadDashboard:', error.message);
      throw error;
    }
  }

  /**
   * Dashboard cho Nhân sự (nhansu) - Dashboard cá nhân
   */
  async getEmployeeDashboard(userId) {
    try {
      // Thông tin cá nhân
      const user = await User.findById(userId)
        .populate('departmentId', 'name description')
        .populate('roleId', 'name slug')
        .select('-passwordHash -deletedAt')
        .lean();

      if (!user) {
        throw new Error('Người dùng không tồn tại.');
      }

      // Tài liệu được phân công cho người dùng (uploadedById)
      const userDocuments = await Document.find({
        uploadedById: new mongoose.Types.ObjectId(userId),
        deletedAt: null,
      })
        .select('_id title status createdAt updatedAt categoryId')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();

      const formattedDocuments = userDocuments.map((doc) => ({
        id: doc._id.toString(),
        title: doc.title,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      // Hoạt động cá nhân (log của người dùng này)
      const userActivities = await AuditLog.find({ userId: new mongoose.Types.ObjectId(userId) })
        .select('_id action target metadata createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const formattedActivities = userActivities.map((log) => ({
        id: log._id.toString(),
        action: log.action,
        target: log.target,
        metadata: log.metadata,
        createdAt: log.createdAt,
      }));

      return {
        role: 'nhansu',
        roleName: 'Nhân sự',
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          status: user.status,
          department: user.departmentId
            ? {
                id: user.departmentId._id.toString(),
                name: user.departmentId.name,
                description: user.departmentId.description,
              }
            : null,
          role: user.roleId
            ? {
                id: user.roleId._id.toString(),
                name: user.roleId.name,
                slug: user.roleId.slug,
              }
            : null,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        documentStats: {
          total: userDocuments.length,
          active: userDocuments.filter((d) => d.status === 'active').length,
          draft: userDocuments.filter((d) => d.status === 'draft').length,
          pending: userDocuments.filter((d) => d.status === 'pending').length,
        },
        recentDocuments: formattedDocuments,
        recentActivities: formattedActivities,
      };
    } catch (error) {
      console.error('Error in getEmployeeDashboard:', error.message);
      throw error;
    }
  }

  /**
   * Dashboard cho Cộng tác viên (congtacvien) - Thống kê hoa hồng và tiến độ cấp bậc
   */
  async getCollaboratorDashboard(userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId)
        .populate('roleId', 'name slug')
        .select('-passwordHash -deletedAt')
        .lean();

      if (!user) {
        throw new Error('Cộng tác viên không tồn tại.');
      }

      const commissionService = require('./commission.service');
      const currentDate = new Date();
      const stats = await commissionService.getCollaboratorStats(
        userId,
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );

      // Lấy danh sách hoa hồng gần đây (5 giao dịch gần nhất)
      const recentCommissions = await commissionService.getCommissions({
        collaboratorId: userId,
        limit: 5
      });

      // Tổng hợp doanh số hoa hồng của CTV
      const Commission = require('../models/Commission');
      const commissionSummary = await Commission.aggregate([
        { $match: { collaboratorId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$commissionAmount' }
          }
        }
      ]);

      const summaries = {
        pending: 0,
        approved: 0,
        paid: 0,
        cancelled: 0,
        total: 0
      };

      commissionSummary.forEach(item => {
        if (summaries.hasOwnProperty(item._id)) {
          summaries[item._id] = item.total;
        }
        if (item._id !== 'cancelled') {
          summaries.total += item.total;
        }
      });

      return {
        role: 'congtacvien',
        roleName: 'Cộng tác viên',
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          rank: user.rank || 'Bronze',
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        monthlyStats: stats,
        commissionSummaries: summaries,
        recentCommissions: recentCommissions.items
      };
    } catch (error) {
      console.error('Error in getCollaboratorDashboard:', error.message);
      throw error;
    }
  }

  /**
   * Lấy dashboard theo role của người dùng
   */
  async getDashboardByRole(user, options = {}) {
    try {
      const role = await this.getRoleInfo(user.roleId);
      if (!role) {
        throw new Error('Không thể xác định role của người dùng.');
      }

      const isAdmin = role.slug === 'admin' || role.slug === 'board_of_directors';
      const requestedType = (options.dashboardType || '').toString().trim().toLowerCase();

      if (isAdmin && requestedType) {
        if (['board-of-directors', 'board_of_directors', 'boardofdirectors'].includes(requestedType)) {
          return await this.getBoardOfDirectorsDashboard();
        }

        if (['department-head', 'department_head', 'departmenthead'].includes(requestedType)) {
          let departmentId = options.departmentId;
          if (!departmentId) {
            const firstDepartment = await Department.findOne({ isHidden: false }).lean();
            if (!firstDepartment) {
              throw new Error('Không có phòng ban nào trong hệ thống.');
            }
            departmentId = firstDepartment._id.toString();
          }
          return await this.getDepartmentHeadDashboard(departmentId);
        }

        if (['employee', 'nhansu'].includes(requestedType)) {
          let userId = options.userId || user.sub;
          if (!userId) {
            const firstUser = await User.findOne({ deletedAt: null, status: 'active' }).lean();
            if (!firstUser) {
              throw new Error('Không có người dùng nào trong hệ thống.');
            }
            userId = firstUser._id.toString();
          }
          return await this.getEmployeeDashboard(userId);
        }

        if (['collaborator', 'congtacvien'].includes(requestedType)) {
          let userId = options.userId || user.sub;
          return await this.getCollaboratorDashboard(userId);
        }

        throw new Error('Loại dashboard không hợp lệ. Hãy chọn board-of-directors, department-head hoặc employee.');
      }

      // BGĐ (board_of_directors) → Dashboard tổng quan
      if (role.slug === 'board_of_directors' || role.slug === 'admin') {
        return await this.getBoardOfDirectorsDashboard();
      }

      // Trưởng bộ phận (truongbophan) → Dashboard bộ phận
      if (role.slug === 'truongbophan') {
        if (!user.departmentId) {
          throw new Error('Trưởng bộ phận phải được gán vào một phòng ban.');
        }
        return await this.getDepartmentHeadDashboard(user.departmentId);
      }

      // Cộng tác viên (congtacvien) → Dashboard cộng tác viên
      if (role.slug === 'congtacvien') {
        return await this.getCollaboratorDashboard(user.sub);
      }

      // Nhân sự và các role khác → Dashboard cá nhân
      return await this.getEmployeeDashboard(user.sub);
    } catch (error) {
      console.error('Error in getDashboardByRole:', error.message);
      throw error;
    }
  }
}

module.exports = new DashboardService();
