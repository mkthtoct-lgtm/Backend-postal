const Sop = require('../models/Sop');

class SopService {
  /**
   * Lấy danh sách SOP có bộ lọc
   */
  async findAll({ search = '', category = '', department = '', status = '', roleName = '' } = {}) {
    const filter = { deletedAt: null };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { code: searchRegex },
        { title: searchRegex },
        { summary: searchRegex },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Phân quyền theo vai trò (allowedRoles)
    // Nếu không phải admin hoặc ban giám đốc thì chỉ lấy các SOP mà allowedRoles chứa roleName hoặc 'all'
    if (roleName && roleName !== 'admin' && roleName !== 'board_of_directors' && roleName !== 'bangiamdoc') {
      const roleFilter = { allowedRoles: { $in: ['all', roleName] } };
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          roleFilter
        ];
        delete filter.$or;
      } else {
        filter.allowedRoles = { $in: ['all', roleName] };
      }
    }

    return await Sop.find(filter).sort({ code: 1, createdAt: -1 });
  }

  /**
   * Lấy chi tiết SOP theo ID hoặc Code
   */
  async findById(id) {
    return await Sop.findOne({ _id: id, deletedAt: null });
  }

  /**
   * Lấy chi tiết SOP theo mã Code
   */
  async findByCode(code) {
    return await Sop.findOne({ code, deletedAt: null });
  }

  /**
   * Tạo mới một SOP
   */
  async create(data) {
    const newSop = new Sop(data);
    return await newSop.save();
  }

  /**
   * Cập nhật thông tin SOP
   */
  async update(id, data) {
    return await Sop.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Xóa mềm SOP
   */
  async softDelete(id) {
    return await Sop.findOneAndUpdate(
      { _id: id },
      { $set: { deletedAt: new Date(), status: 'archived' } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new SopService();
