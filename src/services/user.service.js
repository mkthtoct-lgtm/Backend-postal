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
