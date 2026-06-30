const Checklist = require('../models/Checklist');

class ChecklistService {
  /**
   * Lấy danh sách Checklist kèm theo bộ lọc phân quyền
   */
  async findAll({ search = '', status = '', category = '', priority = '', userId = null, roleName = '' } = {}) {
    const filter = { deletedAt: null };

    // Bộ lọc trạng thái, nhóm và độ ưu tiên
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // Tìm kiếm văn bản
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { ownerName: searchRegex }
      ];
    }

    // Nếu không phải admin/board_of_directors, thực hiện lọc theo phân quyền gán người dùng hoặc vai trò
    if (roleName && roleName !== 'admin' && roleName !== 'board_of_directors') {
      const authConditions = [
        { allowedRoles: { $in: ['all', roleName] } }
      ];
      if (userId) {
        authConditions.push({ assignedUserIds: userId });
      }
      
      if (filter.$or) {
        // Kết hợp điều kiện tìm kiếm hiện tại với điều kiện phân quyền
        filter.$and = [
          { $or: filter.$or },
          { $or: authConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = authConditions;
      }
    }

    return await Checklist.find(filter)
      .populate('assignedUserIds', 'fullName email phone')
      .sort({ dueDate: 1, createdAt: -1 });
  }

  /**
   * Tìm chi tiết Checklist bằng ID
   */
  async findById(id) {
    return await Checklist.findOne({ _id: id, deletedAt: null })
      .populate('assignedUserIds', 'fullName email phone');
  }

  /**
   * Tạo Checklist mới
   */
  async create(data) {
    const newChecklist = new Checklist(data);
    return await newChecklist.save();
  }

  /**
   * Cập nhật thông tin/tiến độ/trạng thái Checklist
   */
  async update(id, data) {
    const updateData = { ...data };

    // Tự động cập nhật hoàn thành dựa trên status hoặc progress
    if (updateData.status === 'completed') {
      updateData.progress = 100;
      updateData.completedAt = new Date();
    } else if (updateData.status && updateData.status !== 'completed') {
      updateData.completedAt = null;
      if (updateData.progress === 100) {
        updateData.progress = 80; // Giảm xuống 80% nếu chuyển về in_progress/todo
      }
    }

    return await Checklist.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    ).populate('assignedUserIds', 'fullName email phone');
  }

  /**
   * Xóa mềm Checklist
   */
  async softDelete(id) {
    return await Checklist.findOneAndUpdate(
      { _id: id },
      { $set: { deletedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new ChecklistService();
