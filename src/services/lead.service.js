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
      .populate('collaboratorId', 'fullName email phone');
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
      .sort({ createdAt: -1 });
  }

  /**
   * Cập nhật trạng thái của Lead (Ví dụ sang 'xu_ly_ho_so')
   * @param {string} id - Lead ID
   * @param {string} status - Trạng thái mới
   */
  async updateStatus(id, status) {
    return await Lead.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { status } },
      { returnDocument: 'after', runValidators: true }
    ).populate('collaboratorId', 'fullName email phone');
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
}

module.exports = new LeadService();
