const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userService = require('../services/user.service');

// Hàm helper kiểm tra định dạng email hợp lệ
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Hàm helper kiểm tra độ phức tạp của mật khẩu
const validatePasswordComplexity = (password) => {
  if (password.length <= 6) {
    return {
      isValid: false,
      message: 'Mật khẩu phải dài hơn 6 ký tự.',
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]{};':"\\|\\`~]/.test(password);

  if (!hasUppercase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt.',
    };
  }

  return { isValid: true };
};

class UserController {
  /**
   * Lấy danh sách toàn bộ người dùng (Có phân trang, tìm kiếm)
   */
  async getAllUsers(req, res) {
    try {
      let { page, limit, search, status } = req.query;

      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
      search = search ? search.trim() : '';

      // Kiểm soát giá trị lọc status hợp lệ
      if (status && !['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái lọc status không hợp lệ. Chỉ chấp nhận: active, inactive, suspended.',
        });
      }

      const result = await userService.findAll({ page, limit, search, status });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách người dùng thành công.',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách người dùng.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết một người dùng bằng ID
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra định dạng ObjectId của MongoDB
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ.',
        });
      }

      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa khỏi hệ thống.',
        });
      }

      // Ẩn mật khẩu trước khi phản hồi
      const userObj = user.toObject();
      delete userObj.passwordHash;

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết người dùng thành công.',
        data: userObj,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết người dùng.',
        error: error.message,
      });
    }
  }



  /**
   * Cập nhật thông tin người dùng
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, fullName, phone, status, roleId, departmentId } = req.body;

      // Kiểm tra định dạng ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ.',
        });
      }

      // Kiểm tra user có tồn tại không
      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa khỏi hệ thống.',
        });
      }

      const updateData = {};

      if (fullName) updateData.fullName = fullName;
      if (phone) updateData.phone = phone;
      if (roleId) updateData.roleId = roleId;
      if (departmentId) updateData.departmentId = departmentId;
      if (status) {
        if (!['active', 'inactive', 'suspended'].includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'Trạng thái status không hợp lệ.',
          });
        }
        updateData.status = status;
      }

      // Xử lý cập nhật Email
      if (email && email.toLowerCase().trim() !== user.email) {
        if (!validateEmailFormat(email)) {
          return res.status(400).json({
            success: false,
            message: 'Định dạng Email mới không hợp lệ.',
          });
        }

        const emailInUse = await userService.findByEmail(email);
        if (emailInUse) {
          return res.status(400).json({
            success: false,
            message: 'Email mới này đã được sử dụng bởi một tài khoản khác.',
          });
        }
        updateData.email = email;
      }

      const updatedUser = await userService.update(id, updateData);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin người dùng thành công.',
        data: updatedUser,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật thông tin người dùng.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm tài khoản người dùng (Soft Delete - ẩn khỏi danh sách)
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra định dạng ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ.',
        });
      }

      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa trước đó.',
        });
      }

      // Thực thi xóa mềm
      await userService.softDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Xóa tài khoản người dùng thành công (ẩn danh sách).',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa người dùng.',
        error: error.message,
      });
    }
  }
}

module.exports = new UserController();
