const nodemailer = require('nodemailer');
const env = require('../configs/env');

class MailService {
  constructor() {
    // Khởi tạo Transporter cho Nodemailer từ cấu hình hệ thống
    this.transporter = nodemailer.createTransport({
      host: env.MAIL.HOST,
      port: env.MAIL.PORT,
      secure: env.MAIL.PORT === 465, // True nếu dùng port 465, ngược lại dùng TLS port 587
      auth: {
        user: env.MAIL.USER,
        pass: env.MAIL.PASS,
      },
    });
  }

  /**
   * Gửi email đặt lại mật khẩu cho người dùng
   * @param {string} email - Địa chỉ nhận email
   * @param {string} resetLink - Đường dẫn khôi phục mật khẩu gửi kèm
   */
  async sendPasswordResetEmail(email, resetLink) {
    try {
      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: email,
        subject: 'Đặt lại mật khẩu tài khoản HITO Postal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #4CAF50; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
            <p>Xin chào,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản bưu chính của bạn liên kết với email này.</p>
            <p>Click vào nút bên dưới để tiến hành đặt lại mật khẩu. Liên kết này sẽ hết hạn sau <strong>15 phút</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}"
                 style="background-color: #4CAF50; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 4px; font-size: 16px; display: inline-block;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p>Hoặc sao chép đường dẫn sau dán trực tiếp vào thanh địa chỉ trình duyệt:</p>
            <p style="word-break: break-all; color: #666; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
            <p style="color: #999; font-size: 12px; text-align: center;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
            </p>
          </div>
        `,
      });
      console.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      console.error('Lỗi khi gửi email đặt lại mật khẩu:', error.message);
      // Không crash ứng dụng, chỉ log lỗi để tiếp tục xử lý
      throw new Error('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
    }
  }
}

// Export duy nhất một instance của MailService
module.exports = new MailService();
