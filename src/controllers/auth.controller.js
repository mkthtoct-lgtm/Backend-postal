const authService = require('../services/auth.service');

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

class AuthController {
  /**
   * Đăng ký tài khoản mới (Register)
   */
  async register(req, res) {
    try {
      const { email, password, fullName } = req.body;

      // Validation đầu vào cơ bản
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ các thông tin: Họ tên, Email và Mật khẩu.',
        });
      }

      if (!validateEmailFormat(email)) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng Email không hợp lệ (Ví dụ: user@example.com).',
        });
      }

      const passwordValidation = validatePasswordComplexity(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
        });
      }

      const result = await authService.register({ email, password, fullName });

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công.',
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi xảy ra trong quá trình đăng ký.',
      });
    }
  }

  /**
   * Cập nhật thông tin bổ sung sau khi đăng ký thành công (Register Profile)
   */
  async registerProfile(req, res) {
    try {
      const { userId, phone, socialLink, city, ward, addressDetail, referralCode } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu userId người dùng cần cập nhật thông tin.',
        });
      }

      const updatedUser = await authService.registerProfile({
        userId,
        phone,
        socialLink,
        city,
        ward,
        addressDetail,
        referralCode,
      });

      return res.status(200).json({
        success: true,
        message: 'Bổ sung thông tin tài khoản thành công.',
        data: updatedUser,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi xảy ra trong quá trình bổ sung thông tin.',
      });
    }
  }

  /**
   * Đăng nhập người dùng (Login)
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp cả Email và Mật khẩu.',
        });
      }

      // Xác thực user
      const authenticatedUser = await authService.validateUser({ email, password });

      // Phát hành bộ token
      const result = await authService.login(authenticatedUser);

      // Ghi lịch sử thao tác đăng nhập
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        authenticatedUser.id,
        'auth.login',
        { type: 'user', id: authenticatedUser.id, name: authenticatedUser.fullName },
        { ip: req.ip || req.connection?.remoteAddress || 'Unknown', device: req.headers['user-agent'] || 'Unknown' }
      );

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập hệ thống thành công.',
        data: result,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Email hoặc mật khẩu không chính xác.',
      });
    }
  }

  /**
   * Làm mới Access Token (Refresh Token)
   */
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy refreshToken trong request body.',
        });
      }

      const result = await authService.refresh({ refreshToken });

      return res.status(200).json({
        success: true,
        message: 'Làm mới token thành công.',
        data: result,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Làm mới token thất bại.',
      });
    }
  }

  /**
   * Đăng xuất tài khoản (Logout)
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy refreshToken trong request body.',
        });
      }

      const result = await authService.logout({ refreshToken });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Đăng xuất thất bại.',
      });
    }
  }

  /**
   * Yêu cầu khôi phục mật khẩu khi quên (Forgot Password)
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email tài khoản cần khôi phục mật khẩu.',
        });
      }

      if (!validateEmailFormat(email)) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng Email không hợp lệ (Ví dụ: user@example.com).',
        });
      }

      const result = await authService.forgotPassword({ email });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Yêu cầu khôi phục mật khẩu thất bại.',
      });
    }
  }

  /**
   * Thiết lập mật khẩu mới (Reset Password)
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu liên kết token xác thực hoặc mật khẩu mới.',
        });
      }

      const passwordValidation = validatePasswordComplexity(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
        });
      }

      const result = await authService.resetPassword({ token, password });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Đặt lại mật khẩu thất bại.',
      });
    }
  }

  /**
   * Xem thông tin người dùng đang đăng nhập (Profile)
   */
  async me(req, res) {
    // req.user được lấy từ authMiddleware trước đó
    return res.status(200).json({
      success: true,
      data: req.user,
    });
  }

  /**
   * Lấy mã giới thiệu và link giới thiệu của người dùng đang đăng nhập
   */
  async getReferralInfo(req, res) {
    try {
      const userService = require('../services/user.service');
      const userId = req.user.sub;
      const user = await userService.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng.',
        });
      }

      const env = require('../configs/env');
      const referralCode = user.referral_code || '';
      const referralUrl = `${env.FRONTEND_URL}/register?ref=${referralCode}`;

      return res.status(200).json({
        success: true,
        data: {
          referralCode,
          referralUrl,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thông tin giới thiệu.',
        error: error.message,
      });
    }
  }
}

module.exports = new AuthController();
