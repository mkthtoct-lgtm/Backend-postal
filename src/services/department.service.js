const mongoose = require('mongoose');
const Department = require('../models/Department');
const User = require('../models/User');

class DepartmentService {
  /**
   * Lấy danh sách tất cả phòng ban chưa bị ẩn, kèm số lượng nhân sự
   * @returns {Promise<Array>} Danh sách Department có field memberCount
   */
  async findAll(includeHidden = false) {
    // Dùng aggregate để đếm memberCount từ collection users
    const matchCondition = includeHidden ? {} : { isHidden: false };
    const departments = await Department.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'users',
          let: { deptId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$departmentId', '$$deptId'] },
                deletedAt: null,
              },
            },
          ],
          as: 'members',
        },
      },
      {
        $addFields: {
          memberCount: { $size: '$members' },
          // Chuẩn hóa id cho FE (FE dùng `id`, không phải `_id`)
          id: { $toString: '$_id' },
        },
      },
      {
        $project: {
          members: 0, // Không trả về mảng members thô, chỉ trả memberCount
          __v: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return departments;
  }

  /**
   * Tìm kiếm phòng ban bằng ID (loại trừ các phòng ban đã bị ẩn)
   * @param {string} id - Mongoose ID của phòng ban
   * @returns {Promise<Object|null>}
   */
  async findById(id, includeHidden = false) {
    const filter = includeHidden ? { _id: id } : { _id: id, isHidden: false };
    return await Department.findOne(filter);
  }

  /**
   * Tìm kiếm phòng ban bằng tên (dùng để kiểm duyệt trùng lặp)
   * @param {string} name - Tên phòng ban cần tìm
   * @param {string|null} excludeId - ID phòng ban cần loại trừ khi kiểm tra (dùng khi update)
   * @returns {Promise<Object|null>}
   */
  async findByName(name, excludeId = null) {
    const filter = {
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isHidden: false,
    };

    // Loại trừ chính phòng ban đang được cập nhật khi kiểm tra trùng tên
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return await Department.findOne(filter);
  }

  /**
   * Tạo phòng ban mới
   * @param {Object} data - Dữ liệu bao gồm name, description
   * @returns {Promise<Object>} Phòng ban vừa tạo
   */
  async create(data) {
    const newDepartment = new Department({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      isHidden: false,
    });

    return await newDepartment.save();
  }

  /**
   * Cập nhật thông tin phòng ban
   * @param {string} id - ID phòng ban cần cập nhật
   * @param {Object} data - Dữ liệu cập nhật (name, description)
   * @returns {Promise<Object|null>} Phòng ban sau khi cập nhật
   */
  async update(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();

    return await Department.findOneAndUpdate(
      { _id: id, isHidden: false },
      { $set: updateData },
      { returnDocument: 'after' }
    );
  }

  /**
   * Ẩn phòng ban (soft delete) và reset departmentId của tất cả User thuộc phòng ban về null
   * @param {string} id - ID phòng ban cần ẩn
   * @returns {Promise<Object|null>} Phòng ban đã ẩn
   */
  async hideDepartment(id) {
    // Ẩn phòng ban
    const hidden = await Department.findOneAndUpdate(
      { _id: id, isHidden: false },
      { $set: { isHidden: true } },
      { returnDocument: 'after' }
    );

    return hidden;
  }

  /**
   * Đảo ngược trạng thái hiển thị của phòng ban (Bật/Tắt ẩn)
   * Nếu chuyển sang trạng thái ẩn (true), gỡ toàn bộ nhân viên ra khỏi phòng ban
   * @param {string} id - ID phòng ban
   * @returns {Promise<Object|null>} Phòng ban sau khi cập nhật
   */
  async toggleVisibility(id) {
    const department = await Department.findById(id);
    if (!department) return null;

    department.isHidden = !department.isHidden;
    const saved = await department.save();

    return saved;
  }
}

module.exports = new DepartmentService();
