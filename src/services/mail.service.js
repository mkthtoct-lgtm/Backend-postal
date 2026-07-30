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

  /**
   * Khung giao diện email dùng chung cho các thông báo CRM tự động, đồng bộ
   * phong cách với email đặt lại mật khẩu hiện có.
   * @param {Object} params
   * @param {string} params.heading - Tiêu đề chính hiển thị trong email
   * @param {string} params.bodyHtml - Nội dung HTML phần thân email
   * @param {string} [params.accentColor='#0e7490'] - Màu nhấn (mặc định cyan-900 để đồng bộ giao diện hệ thống)
   */
  _renderCrmTemplate({ heading, bodyHtml, accentColor = '#0e7490' }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${accentColor}; text-align: center;">${heading}</h2>
        ${bodyHtml}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
        <p style="color: #999; font-size: 12px; text-align: center;">
          Đây là email tự động từ hệ thống CRM HT Ocean Group. Vui lòng không trả lời trực tiếp email này.
        </p>
      </div>
    `;
  }

  /**
   * [CRM AUTOMATION] Gửi email xác nhận đã tiếp nhận thông tin cho khách hàng
   * ngay khi lead được tạo, để khách không cảm thấy bị "im lặng".
   * @param {string} toEmail - Email khách hàng
   * @param {string} customerName - Tên khách hàng
   * @param {string} productInterest - Dịch vụ khách hàng quan tâm
   */
  async sendLeadConfirmationEmail(toEmail, customerName, productInterest) {
    if (!toEmail) return;
    try {
      const html = this._renderCrmTemplate({
        heading: 'Cảm ơn bạn đã liên hệ HT Ocean Group',
        bodyHtml: `
          <p>Xin chào <strong>${customerName}</strong>,</p>
          <p>Chúng tôi đã nhận được thông tin đăng ký tư vấn của bạn về dịch vụ <strong>${productInterest || 'du học/định cư'}</strong>.</p>
          <p>Đội ngũ chuyên viên tư vấn của HT Ocean Group sẽ liên hệ với bạn trong thời gian sớm nhất (thường trong vòng 24 giờ làm việc).</p>
          <p>Nếu cần hỗ trợ gấp, vui lòng gọi hotline <strong>1800 9078</strong>.</p>
        `,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: 'HT Ocean Group đã nhận được thông tin của bạn',
        html,
      });
      console.log(`[MailService] Đã gửi email xác nhận lead cho khách hàng: ${toEmail}`);
    } catch (error) {
      // Không chặn tiến trình tạo lead nếu gửi mail thất bại
      console.error('[MailService] Lỗi khi gửi email xác nhận lead cho khách hàng:', error.message);
    }
  }

  /**
   * [CRM AUTOMATION] Gửi email cảnh báo nội bộ khi có lead mới cần xử lý
   * (gửi cho CTV giới thiệu hoặc nhân sự được tự động phân công).
   * @param {string} toEmail - Email người phụ trách
   * @param {string} staffName - Tên người phụ trách
   * @param {Object} lead - Thông tin lead
   */
  async sendNewLeadAlertEmail(toEmail, staffName, lead) {
    if (!toEmail) return;
    try {
      const html = this._renderCrmTemplate({
        heading: 'Bạn có một Lead mới cần xử lý',
        bodyHtml: `
          <p>Xin chào <strong>${staffName || ''}</strong>,</p>
          <p>Hệ thống vừa ghi nhận một lead mới được phân công cho bạn:</p>
          <ul style="background-color: #f9f9f9; padding: 15px 15px 15px 30px; border-radius: 4px;">
            <li>Khách hàng: <strong>${lead.customerName}</strong></li>
            <li>Điện thoại: <strong>${lead.phone}</strong></li>
            <li>Dịch vụ quan tâm: ${lead.productInterest || 'N/A'}</li>
            <li>Nguồn: ${lead.source || 'N/A'}</li>
            <li>Kênh liên hệ ưu tiên: ${lead.preferredContact || 'N/A'}</li>
          </ul>
          <p>Vui lòng liên hệ khách hàng sớm nhất có thể để đảm bảo trải nghiệm tư vấn tốt nhất.</p>
        `,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: `[Lead mới] ${lead.customerName} - ${lead.productInterest || ''}`,
        html,
      });
      console.log(`[MailService] Đã gửi email cảnh báo lead mới cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi email cảnh báo lead mới:', error.message);
    }
  }

  /**
   * [CRM AUTOMATION] Nhắc nhở người phụ trách khi lead chưa được cập nhật
   * trạng thái sau một khoảng thời gian cấu hình (tránh bỏ sót chăm sóc khách).
   * @param {string} toEmail
   * @param {string} staffName
   * @param {Object} lead
   * @param {number} hoursSinceUpdate
   */
  async sendStaleLeadReminderEmail(toEmail, staffName, lead, hoursSinceUpdate) {
    if (!toEmail) return;
    try {
      const html = this._renderCrmTemplate({
        heading: 'Nhắc nhở: Lead chưa được chăm sóc',
        accentColor: '#b45309',
        bodyHtml: `
          <p>Xin chào <strong>${staffName || ''}</strong>,</p>
          <p>Lead dưới đây đã <strong>${hoursSinceUpdate} giờ</strong> chưa được cập nhật trạng thái mới:</p>
          <ul style="background-color: #fffbeb; padding: 15px 15px 15px 30px; border-radius: 4px;">
            <li>Khách hàng: <strong>${lead.customerName}</strong></li>
            <li>Điện thoại: <strong>${lead.phone}</strong></li>
            <li>Trạng thái hiện tại: ${lead.status}</li>
          </ul>
          <p>Vui lòng liên hệ lại khách hàng và cập nhật trạng thái sớm để không bỏ lỡ cơ hội.</p>
        `,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: `[Nhắc nhở] Lead "${lead.customerName}" chưa được chăm sóc`,
        html,
      });
      console.log(`[MailService] Đã gửi email nhắc nhở lead trễ hạn cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi email nhắc nhở lead trễ hạn:', error.message);
    }
  }

  /**
   * [CRM AUTOMATION] Thông báo khi hệ thống tự động đóng một lead (chuyển
   * sang 'lost') do quá hạn không có tương tác/cập nhật.
   */
  async sendAutoLostNoticeEmail(toEmail, staffName, lead, days) {
    if (!toEmail) return;
    try {
      const html = this._renderCrmTemplate({
        heading: 'Một Lead đã tự động chuyển sang "Thất bại"',
        accentColor: '#b91c1c',
        bodyHtml: `
          <p>Xin chào <strong>${staffName || ''}</strong>,</p>
          <p>Lead dưới đây đã không có cập nhật nào trong <strong>${days} ngày</strong>, hệ thống đã tự động chuyển trạng thái sang <strong>"Thất bại (Lost)"</strong> theo quy tắc chăm sóc khách hàng:</p>
          <ul style="background-color: #fef2f2; padding: 15px 15px 15px 30px; border-radius: 4px;">
            <li>Khách hàng: <strong>${lead.customerName}</strong></li>
            <li>Điện thoại: <strong>${lead.phone}</strong></li>
          </ul>
          <p>Nếu đây là nhầm lẫn, bạn có thể vào hệ thống để mở lại và cập nhật trạng thái phù hợp.</p>
        `,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: `[Tự động đóng] Lead "${lead.customerName}" đã chuyển sang Thất bại`,
        html,
      });
      console.log(`[MailService] Đã gửi email thông báo tự động đóng lead cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi email thông báo tự động đóng lead:', error.message);
    }
  }

  /**
   * [CRM AUTOMATION] Nhắc bộ phận kế toán/quản trị đối soát các khoản hoa
   * hồng đang ở trạng thái "pending" quá lâu.
   */
  async sendCommissionPendingReminderEmail(toEmail, staffName, count, totalAmount) {
    if (!toEmail) return;
    try {
      const formattedAmount = Number(totalAmount || 0).toLocaleString('vi-VN');
      const html = this._renderCrmTemplate({
        heading: 'Nhắc đối soát hoa hồng Cộng tác viên',
        bodyHtml: `
          <p>Xin chào <strong>${staffName || ''}</strong>,</p>
          <p>Hiện có <strong>${count}</strong> giao dịch hoa hồng đang chờ đối soát quá thời hạn cấu hình, tổng giá trị khoảng <strong>${formattedAmount} VND</strong>.</p>
          <p>Vui lòng vào hệ thống để kiểm tra và phê duyệt/đối soát kịp thời cho Cộng tác viên.</p>
        `,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: `[Nhắc đối soát] ${count} khoản hoa hồng đang chờ xử lý`,
        html,
      });
      console.log(`[MailService] Đã gửi email nhắc đối soát hoa hồng cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi email nhắc đối soát hoa hồng:', error.message);
    }
  }

  /**
   * Khung giao diện email dùng chung cho các email MARKETING gửi tới khách
   * hàng (khác với _renderCrmTemplate dành cho email nội bộ) - có kèm chân
   * trang giới thiệu thương hiệu + đường dẫn hủy nhận bản tin (tuân thủ thông
   * lệ email marketing, tránh bị đánh dấu spam).
   * @param {Object} params
   * @param {string} params.heading
   * @param {string} params.bodyHtml
   * @param {string} [params.accentColor='#0e7490']
   * @param {string} [params.unsubscribeUrl] - Nếu có, hiển thị link hủy nhận bản tin
   */
  _renderMarketingTemplate({ heading, bodyHtml, accentColor = '#0e7490', unsubscribeUrl = '' }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${accentColor}; text-align: center;">${heading}</h2>
        ${bodyHtml}
        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="tel:18009078" style="background-color: ${accentColor}; color: white; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block;">Gọi hotline 1800 9078</a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
        <p style="color: #999; font-size: 12px; text-align: center;">
          HT Ocean Group - Tầng 1, Tòa nhà Gold Star 12, số 284/41/2 Lý Thường Kiệt, P.14, Q.10, TP.HCM.
          ${unsubscribeUrl ? `<br/>Bạn không muốn nhận email này nữa? <a href="${unsubscribeUrl}" style="color: #999;">Hủy nhận bản tin</a>.` : ''}
        </p>
      </div>
    `;
  }

  /**
   * [MARKETING AUTOMATION] Email chăm sóc (nurture) gửi cho khách hàng vẫn
   * đang trong quá trình tư vấn, giúp khách cảm thấy được đồng hành thay vì
   * bị "bỏ rơi" trong lúc chờ quyết định.
   * @param {string} toEmail
   * @param {string} customerName
   * @param {'day2'|'day5'} stage
   * @param {string} [unsubscribeUrl]
   */
  async sendNurtureEmail(toEmail, customerName, stage, unsubscribeUrl = '') {
    if (!toEmail) return;
    try {
      const content = stage === 'day5'
        ? {
          subject: 'Vài điều bạn nên biết trước khi bắt đầu hành trình du học/định cư',
          bodyHtml: `
            <p>Xin chào <strong>${customerName}</strong>,</p>
            <p>HT Ocean Group vẫn luôn đồng hành cùng bạn trong quá trình cân nhắc lựa chọn phù hợp nhất cho hành trình sắp tới.</p>
            <p>Đội ngũ của chúng tôi gồm HTO Edu (tư vấn du học), HTO Immi (tư vấn định cư) và Hallo Sài Gòn (đào tạo ngoại ngữ nền tảng) luôn sẵn sàng hỗ trợ bạn ở bất kỳ giai đoạn nào - từ chọn trường, chuẩn bị hồ sơ, đến sau khi bạn đã đặt chân tới đất nước mới.</p>
            <p>Nếu bạn còn băn khoăn điều gì (chi phí, hồ sơ, khả năng đậu visa...), đừng ngần ngại chia sẻ - chuyên viên của chúng tôi rất sẵn lòng lắng nghe và giải đáp miễn phí.</p>
          `,
        }
        : {
          subject: 'HT Ocean Group vẫn luôn đồng hành cùng bạn',
          bodyHtml: `
            <p>Xin chào <strong>${customerName}</strong>,</p>
            <p>Cảm ơn bạn đã quan tâm đến dịch vụ của HT Ocean Group. Chúng tôi hiểu rằng quyết định du học hay định cư là một hành trình quan trọng, cần thời gian cân nhắc kỹ lưỡng.</p>
            <p>Nếu bạn có bất kỳ câu hỏi nào - dù nhỏ nhất - đội ngũ chuyên viên của chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ, hoàn toàn miễn phí.</p>
          `,
        };

      const html = this._renderMarketingTemplate({
        heading: 'HT Ocean Group luôn đồng hành cùng bạn',
        bodyHtml: content.bodyHtml,
        unsubscribeUrl,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: content.subject,
        html,
      });
      console.log(`[MailService] Đã gửi email chăm sóc (${stage}) cho khách hàng: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi email chăm sóc khách hàng:', error.message);
    }
  }

  /**
   * [MARKETING AUTOMATION] Email cảm ơn khách hàng khi deal chốt thành công -
   * tạo cảm giác được trân trọng và mở đường cho việc xin đánh giá/giới thiệu
   * về sau.
   * @param {string} toEmail
   * @param {string} customerName
   * @param {string} [unsubscribeUrl]
   */
  async sendThankYouEmail(toEmail, customerName, unsubscribeUrl = '') {
    if (!toEmail) return;
    try {
      const html = this._renderMarketingTemplate({
        heading: 'Cảm ơn bạn đã tin tưởng HT Ocean Group! 🎉',
        accentColor: '#15803d',
        bodyHtml: `
          <p>Xin chào <strong>${customerName}</strong>,</p>
          <p>Chúng tôi rất vui khi được đồng hành cùng bạn đến bước quan trọng này trong hành trình du học/định cư. Cảm ơn bạn đã tin tưởng lựa chọn HT Ocean Group!</p>
          <p>Chuyên viên phụ trách sẽ tiếp tục hỗ trợ bạn ở các bước tiếp theo. Nếu có bất kỳ thắc mắc nào trong quá trình chuẩn bị, đừng ngần ngại liên hệ với chúng tôi qua hotline <strong>1800 9078</strong>.</p>
          <p>Nếu có người thân/bạn bè cũng đang quan tâm đến du học hay định cư, chúng tôi luôn sẵn sàng hỗ trợ họ như đã hỗ trợ bạn.</p>
          <p style="margin-top: 20px;">Chúc bạn có một hành trình thật nhiều trải nghiệm đáng nhớ phía trước!</p>
        `,
        unsubscribeUrl,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: 'Cảm ơn bạn đã tin tưởng HT Ocean Group!',
        html,
      });
      console.log(`[MailService] Đã gửi email cảm ơn sau chuyển đổi cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi email cảm ơn sau chuyển đổi:', error.message);
    }
  }

  /**
   * [MARKETING AUTOMATION] Email "tái kết nối" (win-back) gửi 1 lần duy nhất
   * cho khách hàng có lead đã đóng ở trạng thái "Thất bại" sau một thời gian,
   * nhẹ nhàng mở lại cơ hội mà không gây áp lực.
   * @param {string} toEmail
   * @param {string} customerName
   * @param {string} [unsubscribeUrl]
   */
  async sendWinBackEmail(toEmail, customerName, unsubscribeUrl = '') {
    if (!toEmail) return;
    try {
      const html = this._renderMarketingTemplate({
        heading: 'HT Ocean Group vẫn ở đây nếu bạn cần',
        bodyHtml: `
          <p>Xin chào <strong>${customerName}</strong>,</p>
          <p>Đã một thời gian kể từ lần trao đổi gần nhất của chúng ta. Nếu kế hoạch du học hay định cư của bạn vẫn còn dang dở, hoặc dự định đã thay đổi và bạn muốn tìm hiểu lại, HT Ocean Group luôn sẵn sàng đồng hành cùng bạn bất cứ lúc nào.</p>
          <p>Không có áp lực, không ràng buộc - chỉ cần một cuộc trò chuyện để chúng tôi hiểu bạn đang cần gì.</p>
        `,
        unsubscribeUrl,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: 'HT Ocean Group vẫn ở đây nếu bạn cần hỗ trợ',
        html,
      });
      console.log(`[MailService] Đã gửi email tái kết nối (win-back) cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi email tái kết nối:', error.message);
    }
  }

  /**
   * [MARKETING AUTOMATION] Gửi bản tin (newsletter) khi có tin tức/sự kiện
   * mới được đăng, giữ khách hàng luôn cập nhật thông tin từ HTO.
   * @param {string} toEmail
   * @param {string} customerName
   * @param {Object} newsPost - { title, summary, type }
   * @param {string} [unsubscribeUrl]
   */
  async sendNewsletterEmail(toEmail, customerName, newsPost, unsubscribeUrl = '') {
    if (!toEmail) return;
    try {
      const label = newsPost.type === 'event' ? 'Sự kiện mới' : 'Tin tức mới';
      const html = this._renderMarketingTemplate({
        heading: `${label} từ HT Ocean Group`,
        bodyHtml: `
          <p>Xin chào <strong>${customerName || 'bạn'}</strong>,</p>
          <p>HT Ocean Group vừa cập nhật thông tin mới có thể bạn quan tâm:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px; color: #0e7490;">${newsPost.title}</h3>
            <p style="margin: 0; color: #444;">${newsPost.summary || ''}</p>
          </div>
          <p>Liên hệ hotline <strong>1800 9078</strong> nếu bạn muốn tìm hiểu thêm chi tiết.</p>
        `,
        unsubscribeUrl,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: `[HT Ocean Group] ${newsPost.title}`,
        html,
      });
      console.log(`[MailService] Đã gửi bản tin "${newsPost.title}" cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi bản tin newsletter:', error.message);
    }
  }
}

// Export duy nhất một instance của MailService
module.exports = new MailService();
