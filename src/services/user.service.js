const bcrypt = require('bcryptjs');
const User = require('../models/User');

class UserService {
  /**
   * Tìm kiếm người dùng bằng Email (loại trừ các bản ghi đã bị xóa mềm)
   * @param {string} email - Email cần tìm
   * @returns {Promise<Object|null>} Bản ghi User hoặc null nếu không tìm thấy
   */
  async findByEmail(email) {
    return await User.findOne({
      email: email.toLowerCase().trim(),
      deletedAt: null,
    });
  }

  /**
   * Tìm kiếm người dùng bằng ID (loại trừ các bản ghi đã bị xóa mềm)
   * @param {string} id - Mongoose User ID
   * @returns {Promise<Object|null>} Bản ghi User hoặc null
   */
  async findById(id) {
    return await User.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
   * Lấy danh sách người dùng có phân trang và tìm kiếm (loại trừ các bản ghi xóa mềm)
   */
  async findAll({ search = '', status, departmentId } = {}) {
    const filter = { deletedAt: null };

    // Bộ lọc tìm kiếm theo từ khóa (tên hoặc email)
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Bộ lọc lọc theo trạng thái hoạt động
    if (status) {
      filter.status = status;
    }

    // Bộ lọc theo phòng ban
    if (departmentId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(departmentId)) {
        filter.departmentId = new mongoose.Types.ObjectId(departmentId);
      } else {
        // departmentId=null ⇒ lấy user chưa thuộc phòng ban nào
        filter.departmentId = null;
      }
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return {
      users,
      total: users.length,
    };
  }

  /**
   * Tạo người dùng mới trong cơ sở dữ liệu
   * @param {Object} userData - Dữ liệu người dùng (fullName, email, passwordHash, roleId, departmentId, status)
   * @returns {Promise<Object>} Người dùng vừa được tạo
   */
  async create(userData) {
    const newUser = new User({
      fullName: userData.fullName,
      email: userData.email,
      passwordHash: userData.passwordHash,
      roleId: userData.roleId,
      departmentId: userData.departmentId || null,
      status: userData.status || 'active',
      phone: userData.phone || null,
      avatarUrl: userData.avatarUrl || null,
    });

    return await newUser.save();
  }

  async update(userId, updateData) {
    const dataToUpdate = { ...updateData };

    return await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    ).select('-passwordHash');
  }

  /**
   * Xóa mềm người dùng (chỉ ẩn bằng cách thiết lập deletedAt và đổi status thành inactive)
   */
  async softDelete(userId) {
    return await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          status: 'inactive',
        },
      },
      { returnDocument: 'after' }
    ).select('-passwordHash');
  }

  /**
   * Cập nhật mật khẩu mới của người dùng
   * @param {string} userId - Mongoose User ID
   * @param {string} passwordHash - Chuỗi mật khẩu đã được hash
   * @returns {Promise<Object>} Kết quả cập nhật
   */
  async updatePassword(userId, passwordHash) {
    return await User.updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash,
          lastLoginAt: new Date(), // Reset hoặc cập nhật thông tin đăng nhập
        },
      }
    );
  }
}

module.exports = new UserService();
