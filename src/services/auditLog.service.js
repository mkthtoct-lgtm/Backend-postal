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
      const isLoginAction = action === 'auth.login';
      let shouldLog = isLoginAction;

      // Nếu không phải hành động đăng nhập, kiểm tra xem người thực hiện có phải là Admin không
      if (!shouldLog && userId) {
        const User = require('../models/User');
        const user = await User.findById(userId).populate('roleId');
        if (user && user.roleId && user.roleId.slug === 'admin') {
          shouldLog = true;
        }
      }

      if (shouldLog) {
        // Thực hiện lưu log bất đồng bộ
        const logEntry = new AuditLog({
          userId,
          action,
          target,
          metadata,
        });
        await logEntry.save();
        console.log(`[AuditLog] Đã lưu log thành công: ${action} bởi user ${userId}`);
      } else {
        console.log(`[AuditLog Skip] Bỏ qua log hành động: ${action} bởi user ${userId} (Không phải Admin và không phải Đăng nhập)`);
      }
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

    // Đọc các giá trị phân trang (mặc định limit = 100)
    const limit = filters.limit ? parseInt(filters.limit, 10) : 100;
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const skip = (page - 1) * limit;

    // Đếm tổng số bản ghi và tính số lượng trang
    const totalLogs = await AuditLog.countDocuments(query);
    const totalPages = Math.ceil(totalLogs / limit);

    // Lấy danh sách logs theo phân trang, sắp xếp thời gian mới nhất lên đầu
    const logs = await AuditLog.find(query)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      logs,
      totalLogs,
      totalPages,
      currentPage: page,
      limit,
    };
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
