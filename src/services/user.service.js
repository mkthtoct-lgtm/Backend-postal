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
    }).populate('referred_by_user_id', 'fullName email referral_code');
  }

  /**
   * Tìm kiếm người dùng bằng mã giới thiệu của họ (referral_code)
   * @param {string} referralCode - Mã giới thiệu cần tìm
   * @returns {Promise<Object|null>} Bản ghi User hoặc null
   */
  async findByReferralCode(referralCode) {
    if (!referralCode) return null;
    return await User.findOne({
      referral_code: referralCode.trim(),
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
   * Helper chuẩn hóa họ tên và sinh mã giới thiệu độc nhất dạng [viết_tắt][3_số_ngẫu_nhiên]
   * Ví dụ: "Nguyễn Khổng Đạt" -> "nkd123"
   * @param {string} fullName - Họ tên đầy đủ của người dùng
   * @returns {Promise<string>} Mã giới thiệu độc nhất
   */
  async generateUniqueReferralCode(fullName) {
    if (!fullName || typeof fullName !== 'string') {
      fullName = 'user';
    }

    // 1. Tách các từ trong họ tên và lấy chữ cái đầu của mỗi từ
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    let initials = words.map(word => word.charAt(0)).join('');

    // 2. Chuẩn hóa chữ cái đầu: chuyển tiếng Việt thành không dấu và loại bỏ ký tự đặc biệt
    let prefix = initials
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

    // Nếu tiền tố rỗng, sử dụng giá trị mặc định là 'ref'
    if (!prefix) {
      prefix = 'ref';
    }

    let isUnique = false;
    let referralCode = '';
    let attempts = 0;

    while (!isUnique && attempts < 50) {
      attempts++;
      let randomNumber;
      
      // Tùy theo số lần thử mà tăng không gian số ngẫu nhiên
      if (attempts < 10) {
        randomNumber = Math.floor(100 + Math.random() * 900); // 3 chữ số (100 - 999)
      } else if (attempts < 20) {
        randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 chữ số (1000 - 9999)
      } else {
        randomNumber = Math.floor(10000 + Math.random() * 90000); // 5 chữ số (10000 - 99999)
      }

      referralCode = `${prefix}${randomNumber}`;

      // Kiểm tra sự tồn tại trong DB (tìm kiếm bao gồm cả các user đã xóa mềm)
      const existingUser = await User.findOne({ referral_code: referralCode });
      if (!existingUser) {
        isUnique = true;
      }
    }

    // Nếu thử 50 lần vẫn trùng (rất hiếm khi xảy ra), sinh chuỗi ngẫu nhiên bằng crypto
    if (!isUnique) {
      const crypto = require('crypto');
      referralCode = `${prefix}${crypto.randomBytes(3).toString('hex')}`;
    }

    return referralCode;
  }

  /**
   * Tạo người dùng mới trong cơ sở dữ liệu
   * @param {Object} userData - Dữ liệu người dùng (fullName, email, passwordHash, roleId, departmentId, status)
   * @returns {Promise<Object>} Người dùng vừa được tạo
   */
  async create(userData) {
    // Tự động tạo mã giới thiệu duy nhất cho người dùng mới
    const referral_code = await this.generateUniqueReferralCode(userData.fullName);

    const newUser = new User({
      fullName: userData.fullName,
      email: userData.email,
      passwordHash: userData.passwordHash,
      roleId: userData.roleId,
      departmentId: userData.departmentId || null,
      status: userData.status || 'active',
      phone: userData.phone || null,
      avatarUrl: userData.avatarUrl || null,
      referral_code,
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
