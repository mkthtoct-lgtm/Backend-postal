const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../configs/env');
const userService = require('./user.service');
const mailService = require('./mail.service');
const { signToken } = require('../utils/jwt');
const RefreshToken = require('../models/RefreshToken');
const PasswordResetToken = require('../models/PasswordResetToken');

// Định cấu hình hằng số
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 phút
const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

const PASSWORD_RESET_RESPONSE = {
  message: 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.',
};

class AuthService {
  /**
   * Đăng ký tài khoản người dùng mới
   */
  async register(registerData) {
    const { email, password, fullName } = registerData;

    // Kiểm tra xem email đã được sử dụng chưa
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      throw new Error('Email đã được sử dụng trong hệ thống.');
    }

    // Mã hóa mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo mới tài khoản
    const newUser = await userService.create({
      fullName,
      email,
      passwordHash,
    });

    return this.toAuthenticatedUser(newUser);
  }

  /**
   * Cập nhật thông tin bổ sung cho tài khoản mới đăng ký
   */
  async registerProfile(profileData) {
    const { userId, phone, socialLink, city, ward, addressDetail, referralCode } = profileData;

    const user = await userService.findById(userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    let referred_by_user_id = null;
    if (referralCode && referralCode.trim() !== '') {
      const referrer = await userService.findByReferralCode(referralCode);
      if (!referrer) {
        throw new Error('Mã giới thiệu không tồn tại trong hệ thống.');
      }
      referred_by_user_id = referrer._id;
    }

    // Ghép địa chỉ đầy đủ
    const address = [addressDetail, ward, city].filter(Boolean).join(', ');

    const updatedUser = await userService.update(userId, {
      phone: phone || null,
      socialLink: socialLink || null,
      city: city || null,
      ward: ward || null,
      addressDetail: addressDetail || null,
      address: address || null,
      referral_code_user: referralCode || null,
      referred_by_user_id: referred_by_user_id || null,
      status: 'active', // Kích hoạt tài khoản sau khi hoàn tất thông tin hồ sơ
    });

    return this.toAuthenticatedUser(updatedUser);
  }

  /**
   * Xác thực thông tin đăng nhập (Email & Mật khẩu)
   */
  async validateUser(loginData) {
    const { email, password } = loginData;

    const user = await userService.findByEmail(email);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    // So sánh mật khẩu hash
    const isPasswordMatching = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatching) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status !== 'active') {
      if (user.status === 'pending') {
        // Trả về lỗi có cấu trúc để Frontend biết redirect về trang register-profile
        const err = new Error('Tài khoản chưa hoàn tất đăng ký. Vui lòng bổ sung thông tin hồ sơ.');
        err.code = 'ACCOUNT_PENDING';
        err.userId = user._id.toString();
        throw err;
      }
      throw new Error('Tài khoản đã bị khóa hoặc ngừng kích hoạt.');
    }

    return this.toAuthenticatedUser(user);
  }

  /**
   * Thực hiện đăng nhập và cấp phát bộ token (access & refresh token)
   */
  async login(user) {
    return await this.issueTokens(user);
  }

  /**
   * Cấp lại Access Token mới bằng Refresh Token hợp lệ
   */
  async refresh(refreshTokenDto) {
    const tokenHash = this.hashToken(refreshTokenDto.refreshToken);

    // Tìm kiếm refresh token hoạt động
    const storedToken = await RefreshToken.findOne({
      tokenHash,
      revokedAt: null,
    });

    if (!storedToken) {
      throw new Error('Refresh token không hợp lệ.');
    }

    // Kiểm tra xem token đã hết hạn chưa
    if (new Date() > storedToken.expiresAt) {
      storedToken.revokedAt = new Date();
      await storedToken.save();
      throw new Error('Refresh token đã hết hạn sử dụng.');
    }

    // Kiểm tra tính hợp lệ của User
    const user = await userService.findById(storedToken.userId.toString());
    if (!user || user.status !== 'active') {
      storedToken.revokedAt = new Date();
      await storedToken.save();
      throw new Error('Người dùng không hợp lệ hoặc đã bị vô hiệu hóa.');
    }

    // Thu hồi refresh token cũ (Revoke)
    storedToken.revokedAt = new Date();
    await storedToken.save();

    // Cấp phát bộ token mới
    return await this.issueTokens(this.toAuthenticatedUser(user));
  }

  /**
   * Đăng xuất hệ thống (Thu hồi Refresh Token)
   */
  async logout(refreshTokenDto) {
    const tokenHash = this.hashToken(refreshTokenDto.refreshToken);
    
    await RefreshToken.updateOne(
      { tokenHash },
      { $set: { revokedAt: new Date() } }
    );

    return { message: 'Đăng xuất tài khoản thành công.' };
  }

  /**
   * Xử lý yêu cầu Quên mật khẩu (Forgot Password)
   */
  async forgotPassword(forgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await userService.findByEmail(email);

    // Không báo lỗi lộ diện email tồn tại hay không vì lý do bảo mật (Security best practice)
    if (!user) {
      return PASSWORD_RESET_RESPONSE;
    }

    // Tạo token ngẫu nhiên dạng Hex
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Xóa tất cả token khôi phục mật khẩu cũ của email này trước khi tạo mới
    await PasswordResetToken.deleteMany({ email: email.toLowerCase().trim() });

    // Lưu token hash mới vào DB
    const resetTokenDoc = new PasswordResetToken({
      userId: user._id,
      email: email.toLowerCase().trim(),
      tokenHash,
      expiresAt,
    });
    await resetTokenDoc.save();

    // Gửi email khôi phục kèm đường link
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await mailService.sendPasswordResetEmail(user.email, resetLink);

    return PASSWORD_RESET_RESPONSE;
  }

  /**
   * Đặt lại mật khẩu mới (Reset Password)
   */
  async resetPassword(resetPasswordDto) {
    const { token, password } = resetPasswordDto;
    const tokenHash = this.hashToken(token);

    // Tìm kiếm token khôi phục trong DB
    const tokenDoc = await PasswordResetToken.findOne({ tokenHash });
    if (!tokenDoc) {
      throw new Error('Mã liên kết không hợp lệ hoặc đã được sử dụng.');
    }

    // Kiểm tra hết hạn của liên kết
    if (new Date() > tokenDoc.expiresAt) {
      await PasswordResetToken.deleteOne({ tokenHash });
      throw new Error('Liên kết đặt lại mật khẩu đã hết hạn.');
    }

    // Hash mật khẩu mới và cập nhật cho user
    const passwordHash = await bcrypt.hash(password, 10);
    const updateResult = await userService.updatePassword(
      tokenDoc.userId.toString(),
      passwordHash
    );

    // Xóa liên kết khôi phục đã sử dụng
    await PasswordResetToken.deleteOne({ tokenHash });

    // Đồng thời đăng xuất cưỡng chế toàn bộ các phiên đăng nhập khác của user này (Revoke all refresh tokens)
    await RefreshToken.updateMany(
      {
        userId: tokenDoc.userId,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error('Người dùng không tồn tại hoặc không hợp lệ.');
    }

    return { message: 'Mật khẩu đã được đặt lại thành công.' };
  }

  /**
   * Helper phát hành bộ token cho người dùng
   */
  async issueTokens(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      departmentId: user.departmentId,
    };

    // Tạo refresh token ngẫu nhiên
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    // Lưu refresh token hash vào DB
    const newRefreshToken = new RefreshToken({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });
    await newRefreshToken.save();

    // Ký JWT access token
    const accessToken = signToken(payload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  /**
   * Helper chuyển đổi kiểu dữ liệu User Document thành AuthenticatedUser Format
   */
  toAuthenticatedUser(user) {
    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl || null,
      roleId: user.roleId ? user.roleId.toString() : null,
      departmentId: user.departmentId ? user.departmentId.toString() : null,
      status: user.status,
      referral_code: user.referral_code || null,
    };
  }

  /**
   * Helper tính toán TTL của refresh token bằng miliseconds
   */
  getRefreshTokenTtlMs() {
    const value = env.JWT.EXPIRES_IN; // ví dụ: "1d" hoặc "7d"
    const match = value.trim().match(/^(\d+)([smhd])?$/i);
    if (!match) return DEFAULT_REFRESH_TOKEN_TTL_MS;

    const amount = Number(match[1]);
    const unit = match[2]?.toLowerCase() ?? 'd';
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] || multipliers.d);
  }

  /**
   * Helper băm (hash) token thô trước khi lưu vào DB bằng thuật toán SHA256
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = new AuthService();
