const auditLogService = require('../services/auditLog.service');

// Hàm helper định dạng log bản ghi thành cấu trúc Frontend mong đợi
const formatAuditLog = (log) => {
  const actor = log.userId
    ? {
        id: log.userId._id.toString(),
        fullName: log.userId.fullName,
        email: log.userId.email,
      }
    : {
        id: 'system',
        fullName: 'Hệ thống',
        email: 'system@hto.vn',
      };

  return {
    id: log._id.toString(),
    actor,
    action: log.action,
    target: {
      type: log.target.type,
      id: log.target.id,
      name: log.target.name,
    },
    metadata: log.metadata || {},
    createdAt: log.createdAt.toISOString(),
  };
};

class AuditLogController {
  /**
   * API: Lấy danh sách lịch sử thao tác kèm các bộ lọc
   */
  async getAllLogs(req, res) {
    try {
      const { userId, action, from, to, page, limit } = req.query;

      const {
        logs,
        totalLogs,
        totalPages,
        currentPage,
        limit: appliedLimit,
      } = await auditLogService.findAll({
        userId,
        action,
        from,
        to,
        page,
        limit,
      });

      const formattedLogs = logs.map(formatAuditLog);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách lịch sử thao tác thành công.',
        data: {
          logs: formattedLogs,
          pagination: {
            totalLogs,
            totalPages,
            currentPage,
            limit: appliedLimit,
          },
        },
      });
    } catch (error) {
      console.error('Error in getAllLogs:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi truy vấn lịch sử thao tác.',
        error: error.message,
      });
    }
  }

  /**
   * API: Lấy danh sách những người dùng đã thực hiện thao tác
   */
  async getAllActors(req, res) {
    try {
      const actors = await auditLogService.findActors();

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách người thao tác thành công.',
        data: actors,
      });
    } catch (error) {
      console.error('Error in getAllActors:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách người thao tác.',
        error: error.message,
      });
    }
  }
}

module.exports = new AuditLogController();
  