const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

class AuditLogService {
  /**
   * Ghi nhận một thao tác mới của người dùng (bất đồng bộ)
   * @param {string} userId - ID người thực hiện hành động
   * @param {string} action - Tên hành động (e.g. 'auth.login', 'department.create')
   * @param {object} target - Đối tượng chịu tác động { type, id, name }
   * @param {object} metadata - Các dữ liệu bổ sung kèm theo (IP, Device...)
   */
  async log(userId, action, target, metadata = {}) {
    try {
      // Thực hiện lưu log bất đồng bộ
      const logEntry = new AuditLog({
        userId,
        action,
        target,
        metadata,
      });
      await logEntry.save();
      console.log(`[AuditLog] Đã lưu log thành công: ${action} bởi user ${userId}`);
    } catch (error) {
      console.error('[AuditLog Error] Lỗi khi ghi nhận lịch sử thao tác:', error.message);
    }
  }

  /**
   * Lấy danh sách lịch sử thao tác kèm theo bộ lọc
   * @param {object} filters - Các điều kiện lọc { userId, action, from, to }
   */
  async findAll(filters = {}) {
    const query = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        query.createdAt.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.createdAt.$lte = new Date(filters.to);
      }
    }

    // Lấy toàn bộ danh sách, sắp xếp thời gian mới nhất lên đầu
    return await AuditLog.find(query)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
  }

  /**
   * Lấy danh sách tất cả những người dùng đã từng thực hiện thao tác trong hệ thống
   */
  async findActors() {
    // Tìm các ID user duy nhất đã xuất hiện trong bảng log
    const userIds = await AuditLog.distinct('userId');

    // Lấy thông tin chi tiết các user đó
    const users = await User.find(
      { _id: { $in: userIds } },
      'fullName email'
    );

    // Chuẩn hóa định dạng và sắp xếp theo bảng chữ cái tiếng Việt
    return users
      .map((user) => ({
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }
}

module.exports = new AuditLogService();
