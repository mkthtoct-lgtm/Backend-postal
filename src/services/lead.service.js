const Lead = require('../models/Lead');

class LeadService {
  /**
   * Tạo mới một Lead
   * @param {Object} data - Dữ liệu Lead
   */
  async create(data) {
    const lead = new Lead(data);
    return await lead.save();
  }

  /**
   * Lấy chi tiết Lead theo ID
   * @param {string} id - Lead ID
   */
  async findById(id) {
    return await Lead.findOne({ _id: id, deletedAt: null })
      .populate('collaboratorId', 'fullName email phone')
      .populate('assignedStaffId', 'fullName email phone');
  }

  /**
   * Lấy danh sách Lead kèm theo bộ lọc (Tìm kiếm, theo CTV, theo Trạng thái)
   */
  async findAll({ search = '', status = '', collaboratorId } = {}) {
    const filter = { deletedAt: null };

    if (collaboratorId) {
      filter.collaboratorId = collaboratorId;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    return await Lead.find(filter)
      .populate('collaboratorId', 'fullName email phone')
      .populate('assignedStaffId', 'fullName email phone')
      .sort({ createdAt: -1 });
  }

  /**
   * Cập nhật trạng thái của Lead (Ví dụ sang 'xu_ly_ho_so')
   * Bất kỳ thay đổi trạng thái thủ công/CRM nào cũng được xem là một lượt
   * tương tác mới, nên đồng thời reset mốc nhắc nhở tự động (lastReminderStage)
   * để chu trình chăm sóc tự động được tính lại từ đầu cho trạng thái mới.
   * @param {string} id - Lead ID
   * @param {string} status - Trạng thái mới
   */
  async updateStatus(id, status) {
    return await Lead.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { status, lastReminderStage: null } },
      { returnDocument: 'after', runValidators: true }
    ).populate('collaboratorId', 'fullName email phone')
      .populate('assignedStaffId', 'fullName email phone');
  }

  /**
   * Đếm tổng số deal thành công (trạng thái 'xu_ly_ho_so') của CTV
   * @param {string} userId - ID của CTV/User
   */
  async countDealsByCollaborator(userId) {
    return await Lead.countDocuments({
      collaboratorId: userId,
      status: 'xu_ly_ho_so',
      deletedAt: null
    });
  }

  /**
   * [CRM AUTOMATION] Tìm lead đang hoạt động (chưa lost, chưa xoá) trùng SĐT
   * hoặc email trong một khoảng thời gian gần đây, để phát hiện trùng lặp khi
   * có lead mới được gửi lên (tránh nhiều CTV cùng chăm sóc 1 khách hàng).
   * @param {Object} params
   * @param {string} params.phone - SĐT đã chuẩn hoá của lead mới
   * @param {string} [params.email] - Email của lead mới
   * @param {string} [params.excludeId] - ID lead hiện tại cần loại trừ khỏi kết quả
   * @param {number} [params.windowDays=30] - Số ngày gần đây cần xét trùng lặp
   */
  async findActiveDuplicate({ phone, email, excludeId, windowDays = 30 } = {}) {
    if (!phone && !email) return null;

    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const orConditions = [];
    if (phone) orConditions.push({ phone });
    if (email) orConditions.push({ email });

    const filter = {
      deletedAt: null,
      status: { $ne: 'lost' },
      createdAt: { $gte: since },
      $or: orConditions,
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return await Lead.findOne(filter)
      .sort({ createdAt: -1 })
      .populate('collaboratorId', 'fullName email phone')
      .populate('assignedStaffId', 'fullName email phone');
  }

  /**
   * [CRM AUTOMATION] Gán nhân sự nội bộ phụ trách theo dõi/chăm sóc lead.
   * Độc lập với collaboratorId (không ảnh hưởng tính hoa hồng).
   * @param {string} id - Lead ID
   * @param {string} staffId - User ID của nhân sự được phân công
   */
  async assignStaff(id, staffId) {
    return await Lead.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { assignedStaffId: staffId } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new LeadService();
