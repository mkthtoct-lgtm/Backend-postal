const nodemailer = require('nodemailer');
const env = require('../configs/env');

// Địa chỉ công ty dùng chung cho mọi email - giữ đồng bộ 1 nguồn duy nhất
// (trước đây bị lặp lại thủ công ở nhiều nơi, dễ gây sai lệch khi công ty đổi
// địa chỉ/hotline trong tương lai).
const COMPANY_NAME = 'HT Ocean Group';
const COMPANY_TAGLINE = 'Du học • Định cư • Đào tạo ngoại ngữ';
const COMPANY_ADDRESS = 'Tầng 1, Tòa nhà Gold Star 12, số 284/41/2 Lý Thường Kiệt, P.14, Q.10, TP.HCM';
const COMPANY_HOTLINE = '1800 9078';
const COMPANY_HOTLINE_TEL = 'tel:18009078';

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

  // ==========================================================
  // TIỆN ÍCH DÙNG CHUNG CHO GIAO DIỆN EMAIL
  // ==========================================================

  /**
   * Escape các chuỗi có thể chứa dữ liệu người dùng nhập (tên khách hàng, ghi
   * chú...) trước khi chèn vào HTML email, tránh lỗi hiển thị hoặc chèn mã
   * HTML ngoài ý muốn từ dữ liệu Lead công khai (form không đăng nhập).
   */
  _esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Làm tối 1 màu hex theo tỉ lệ (0-1) để tạo hiệu ứng gradient nhẹ cho dải
   * header, giữ email vẫn nhẹ (không dùng ảnh nền) nhưng trông có chiều sâu.
   */
  _darken(hex, amount = 0.22) {
    const clean = String(hex || '#0e7490').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return '#0b5a70';
    const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - amount)));
    const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - amount)));
    const b = Math.max(0, Math.floor((num & 255) * (1 - amount)));
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * URL tuyệt đối tới linh vật thương hiệu (mascot) HT Ocean - dùng chung
   * logic build domain gốc với getUnsubscribeUrl() bên marketingAutomation.
   */
  _getMascotUrl() {
    const base = (env.BACKEND_URL && env.BACKEND_URL.trim()) || 'https://api.hto.edu.vn';
    return `${base.replace(/\/+$/, '')}/assets/brand/mascot-hto.png`;
  }

  /**
   * Khung giao diện email dùng chung cho các thông báo CRM tự động (gửi cho
   * NHÂN SỰ NỘI BỘ) - tối giản, gọn nhẹ, ưu tiên tốc độ đọc hơn là trang trí,
   * nhưng vẫn đồng bộ nhận diện thương hiệu (dải màu + wordmark) với email
   * gửi khách hàng.
   * @param {Object} params
   * @param {string} params.heading - Tiêu đề chính hiển thị trong email
   * @param {string} params.bodyHtml - Nội dung HTML phần thân email
   * @param {string} [params.accentColor='#0e7490'] - Màu nhấn
   * @param {string} [params.tag='THÔNG BÁO HỆ THỐNG'] - Nhãn nhỏ trên header
   */
  /**
   * Khung giao diện email dùng chung cho các thông báo CRM tự động (gửi cho NHÂN SỰ NỘI BỘ)
   * Thiết kế dạng Thẻ (Floating Card) nổi trên nền Gradient Slate Năng động.
   * @param {Object} params
   * @param {string} params.heading - Tiêu đề chính hiển thị trong email
   * @param {string} params.bodyHtml - Nội dung HTML phần thân email
   * @param {string} [params.accentColor='#0f2c59'] - Màu nhấn
   * @param {string} [params.tag='THÔNG BÁO HỆ THỐNG'] - Nhãn nhỏ trên header
   */
  _renderCrmTemplate({ heading, bodyHtml, accentColor = '#0f2c59', tag = 'THÔNG BÁO HỆ THỐNG' }) {
    const dark = this._darken(accentColor, 0.28);
    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${this._esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ebf3f7;background-image:linear-gradient(180deg, #e2eef7 0%, #f4f8fb 50%, #e8f1f7 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:transparent;padding:30px 10px;">
<tr><td align="center">
<!-- Floating Card Container -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d0e1f9;box-shadow:0 16px 36px -8px rgba(15,44,89,0.12), 0 2px 6px rgba(0,0,0,0.04);">
  <!-- Dải viền Metallic Gold Cấp Cao -->
  <tr>
    <td style="height:4px;background:linear-gradient(90deg, #d4af37 0%, #fef08a 50%, #c5a059 100%);"></td>
  </tr>
  <tr>
    <td style="background-color:${accentColor};background:linear-gradient(135deg, ${accentColor} 0%, #1e40af 100%);padding:20px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="color:#ffffff;font-size:15px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">${COMPANY_NAME}</span>
            <span style="display:block;color:rgba(255,255,255,0.78);font-size:11px;margin-top:2px;letter-spacing:0.3px;">CỔNG THÔNG TIN QUẢN TRỊ CRM</span>
          </td>
          <td align="right" valign="middle">
            <span style="background-color:rgba(255,255,255,0.16);color:#ffffff;font-size:10.5px;font-weight:700;letter-spacing:0.6px;padding:4px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.3);">${this._esc(tag).toUpperCase()}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 32px 6px;">
      <h2 style="margin:0;font-size:19px;font-weight:800;color:#0f172a;line-height:1.4;">${heading}</h2>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 32px 12px;font-size:14px;line-height:1.75;color:#334155;">
      ${bodyHtml}
    </td>
  </tr>
  <tr><td style="padding:12px 32px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>
  <tr>
    <td style="padding:0 32px 26px;">
      <p style="color:#94a3b8;font-size:11.5px;line-height:1.6;margin:0;">
        📌 Email tự động gửi từ hệ thống CRM nội bộ <strong>${COMPANY_NAME}</strong>. Vui lòng truy cập Portal Quản trị để cập nhật trạng thái chi tiết.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  /**
   * Khung giao diện email dùng chung cho các email MARKETING/CRM gửi tới KHÁCH HÀNG
   * Thiết kế dạng Thẻ Nổi (Executive Floating Card): Nền Gradient Đại Dương mượt mà,
   * Card container bo 20px, Đổ bóng 3D sâu, Header Navy & Gold Accent và Các thẻ con sinh động.
   * @param {Object} params
   * @param {string} params.heading
   * @param {string} params.bodyHtml
   * @param {string} [params.preheader] - Đoạn preview ẩn hiển thị ở hộp thư đến
   * @param {string} [params.badge] - Nhãn nhỏ phía trên tiêu đề (vd: "MỚI", "ĐÃ TIẾP NHẬN")
   * @param {string} [params.accentColor='#0f2c59']
   * @param {{text:string, href:string}} [params.cta] - Nút kêu gọi hành động chính
   * @param {string} [params.unsubscribeUrl] - Link hủy nhận bản tin
   */
  _renderMarketingTemplate({
    heading,
    bodyHtml,
    preheader = '',
    badge = '',
    accentColor = '#0f2c59',
    cta = null,
    unsubscribeUrl = '',
  }) {
    const dark = this._darken(accentColor, 0.24);
    const mascotUrl = this._getMascotUrl();

    const badgeBlock = badge
      ? `<span style="display:inline-block;background-color:#e0f2fe;color:#0284c7;border:1px solid #bae6fd;font-size:11px;font-weight:800;letter-spacing:0.8px;padding:5px 14px;border-radius:999px;margin-bottom:14px;text-transform:uppercase;box-shadow:0 2px 6px rgba(2,132,199,0.12);">${this._esc(badge)}</span><br/>`
      : '';

    const ctaBlock = cta && cta.text && cta.href
      ? `
      <tr>
        <td style="padding:12px 38px 14px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius:12px;background:linear-gradient(135deg, #0f2c59 0%, #0072ce 100%);box-shadow:0 6px 18px rgba(0,114,206,0.32);">
                      <a href="${cta.href}" style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:0.4px;">${this._esc(cta.text)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>` : '';

    const unsubscribeBlock = unsubscribeUrl
      ? `<p style="margin:8px 0 0;font-size:11.5px;color:#94a3b8;line-height:1.6;">Bạn muốn điều chỉnh tần suất hoặc hủy nhận thông tin? <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Nhấn vào đây để hủy nhận</a>.</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${this._esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ebf3f7;background-image:linear-gradient(180deg, #dbecf7 0%, #f4f8fb 40%, #e2eff7 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ebf3f7;opacity:0;">${this._esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:transparent;padding:36px 12px;">
<tr><td align="center">

<!-- THẺ CONTAINER CHÍNH NỔI 3D (FLOATING MAIN CARD) -->
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d0e1f9;box-shadow:0 20px 45px -10px rgba(15,44,89,0.14), 0 2px 6px rgba(0,0,0,0.04);">
  
  <!-- Dải Viền Vàng Kim Metallic Gold Top Bar -->
  <tr>
    <td style="height:5px;background:linear-gradient(90deg, #d4af37 0%, #fef08a 50%, #c5a059 100%);"></td>
  </tr>

  <!-- Corporate Header Card Banner -->
  <tr>
    <td style="background-color:#0b2545;background:linear-gradient(135deg, #0b2545 0%, #134074 50%, #0072ce 100%);padding:28px 38px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="middle">
            <span style="color:#ffffff;font-size:21px;font-weight:800;letter-spacing:1px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">${COMPANY_NAME.toUpperCase()}</span><br/>
            <span style="color:rgba(255,255,255,0.88);font-size:12.5px;letter-spacing:0.4px;">${COMPANY_TAGLINE}</span>
          </td>
          <td valign="middle" align="right" width="62">
            <img src="${mascotUrl}" width="56" height="56" alt="Linh vật HT Ocean" style="display:block;border-radius:50%;background-color:#ffffff;box-shadow:0 0 0 3px rgba(212,175,55,0.7), 0 4px 10px rgba(0,0,0,0.18);" />
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Main Body Content Section -->
  <tr>
    <td style="padding:34px 38px 6px;">
      ${badgeBlock}
      <h1 style="margin:0;font-size:23px;line-height:1.35;font-weight:800;color:#0f172a;letter-spacing:-0.2px;">${heading}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 38px 18px;font-size:14.5px;line-height:1.75;color:#334155;">
      ${bodyHtml}
    </td>
  </tr>

  ${ctaBlock}

  <!-- THẺ CAM KẾT CHẤT LƯỢNG THƯƠNG HIỆU (BRAND COMMITMENT CARD) -->
  <tr>
    <td style="padding:18px 38px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f9fd;border:1px solid #dbeafe;border-radius:14px;padding:18px 22px;box-shadow:inset 0 1px 3px rgba(255,255,255,0.8);">
        <tr>
          <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;" colspan="3">
            <span style="font-size:11px;font-weight:800;color:#0f2c59;letter-spacing:0.9px;text-transform:uppercase;">💎 CAM KẾT VÀNG TỪ HT OCEAN GROUP</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top:14px;font-size:12px;color:#475569;line-height:1.55;" valign="top" width="33%">
            <strong style="color:#0f172a;display:block;margin-bottom:3px;font-size:12.5px;">🛡️ Bảo Mật Tuyệt Đối</strong> Thông tin &amp; CCCD mã hóa chuẩn ISO.
          </td>
          <td style="padding-top:14px;font-size:12px;color:#475569;line-height:1.55;padding-left:12px;" valign="top" width="33%">
            <strong style="color:#0f172a;display:block;margin-bottom:3px;font-size:12.5px;">🎓 Minh Bạch 100%</strong> Tư vấn đúng nhu cầu, không chi phí ẩn.
          </td>
          <td style="padding-top:14px;font-size:12px;color:#475569;line-height:1.55;padding-left:12px;" valign="top" width="33%">
            <strong style="color:#0f172a;display:block;margin-bottom:3px;font-size:12.5px;">🏛️ Đối Tác Trực Tiếp</strong> 50+ Trường &amp; Viện lớn tại CHLB Đức.
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr><td style="padding:10px 38px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

  <!-- Corporate Footer Section -->
  <tr>
    <td style="padding:16px 38px 34px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top" width="44" style="padding-top:2px;">
            <img src="${mascotUrl}" width="36" height="36" alt="" style="display:block;border-radius:50%;border:1px solid #cbd5e1;box-shadow:0 2px 5px rgba(0,0,0,0.08);" />
          </td>
          <td valign="top" style="padding-left:8px;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;line-height:1.6;">
              <strong style="color:#0f172a;font-size:12.5px;">${COMPANY_NAME}</strong> — ${COMPANY_ADDRESS}.<br/>
              Tổng đài tư vấn: <a href="${COMPANY_HOTLINE_TEL}" style="color:#0072ce;text-decoration:none;font-weight:800;">${COMPANY_HOTLINE}</a> | Website: <a href="https://hto.edu.vn" style="color:#0072ce;text-decoration:none;font-weight:700;">www.hto.edu.vn</a>
            </p>
            ${unsubscribeBlock}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Outro Footer -->
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
  <tr>
    <td style="padding:18px 20px;text-align:center;font-size:11.5px;color:#94a3b8;letter-spacing:0.2px;">
      © ${new Date().getFullYear()} ${COMPANY_NAME}. Bản quyền thuộc về Tập đoàn HT Ocean. Tất cả các quyền được bảo hộ.
    </td>
  </tr>
</table>

</td></tr>
</table>
</body>
</html>`;
  }

  // ==========================================================
  // NỘI DUNG TỪNG LOẠI EMAIL (tách riêng khỏi hành động "gửi") - cho phép tái
  // sử dụng y hệt giữa gửi thật và xem trước/gửi thử trong trang Cấu hình,
  // đảm bảo Admin xem trước đúng 100% những gì khách hàng/nhân sự sẽ nhận.
  // ==========================================================

  _buildLeadConfirmationContent(customerName, productInterest) {
    const name = this._esc(customerName || 'Quý khách');
    const serviceName = this._esc(productInterest || 'Du học nghề Đức / Định cư & Việc làm');

    return {
      subject: `[HT OCEAN GROUP] Xác nhận Tiếp nhận Yêu cầu Tư vấn - ${customerName || 'Quý khách'}`,
      preheader: `Cảm ơn ${name} đã đăng ký tư vấn tại HT Ocean Group. Thông tin đã được chuyển trực tiếp tới Chuyên viên phụ trách.`,
      badge: '✓ ĐÃ TIẾP NHẬN HỒ SƠ',
      heading: `XÁC NHẬN YÊU CẦU TƯ VẤN LỘ TRÌNH`,
      bodyHtml: `
        <p style="margin:0 0 16px 0;font-size:15px;color:#0f172a;">Kính gửi <strong>${name}</strong>,</p>

        <p style="margin:0 0 20px 0;">Chân thành cảm ơn Anh/Chị đã tin tưởng và gửi yêu cầu tư vấn đến <strong>${COMPANY_NAME}</strong>. Yêu cầu của Anh/Chị đã được hệ thống ghi nhận thành công và chuyển trực tiếp đến <strong>Bộ phận Tư vấn Chuyên sâu</strong>.</p>

        <!-- PHIẾU TIẾP NHẬN TƯ VẤN (CONSULTATION TICKET CARD) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-left:4px solid #0072ce;border-radius:10px;border:1px solid #e2e8f0;border-left-width:4px;margin:22px 0;overflow:hidden;">
          <tr>
            <td style="padding:20px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;" colspan="2">
                    <span style="font-size:11px;font-weight:800;color:#0f2c59;letter-spacing:0.8px;text-transform:uppercase;">📌 PHIẾU ĐĂNG KÝ TƯ VẤN TRỰC TUYẾN</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0 6px 0;font-size:13.5px;color:#64748b;width:150px;" valign="top">Dịch vụ đăng ký:</td>
                  <td style="padding:12px 0 6px 0;font-size:14.5px;font-weight:700;color:#0f172a;" valign="top">${serviceName}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 6px 0;font-size:13.5px;color:#64748b;" valign="top">Họ và tên:</td>
                  <td style="padding:4px 0 6px 0;font-size:14px;font-weight:600;color:#1e293b;" valign="top">${name}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 6px 0;font-size:13.5px;color:#64748b;" valign="top">Thời gian phản hồi:</td>
                  <td style="padding:4px 0 6px 0;font-size:13.5px;font-weight:700;color:#059669;" valign="top">⏱️ Trong vòng 2 - 4 giờ làm việc</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 4px 0;font-size:13.5px;color:#64748b;" valign="top">Trạng thái tiếp nhận:</td>
                  <td style="padding:4px 0 4px 0;" valign="top">
                    <span style="display:inline-block;background-color:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:3px 10px;border-radius:6px;font-weight:700;font-size:11.5px;">✓ ĐÃ CHUYỂN CHUYÊN VIÊN PHỤ TRÁCH</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- QUY TRÌNH HỖ TRỢ 3 BƯỚC (3-STEP ROADMAP) -->
        <h3 style="margin:24px 0 14px 0;font-size:15px;color:#0f172a;font-weight:800;">Lộ trình làm việc tiếp theo cùng Anh/Chị:</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding:14px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="38" valign="top">
                    <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg, #0f2c59, #1e40af);color:#ffffff;font-weight:800;font-size:13px;line-height:30px;text-align:center;">1</div>
                  </td>
                  <td valign="top" style="font-size:13.5px;color:#334155;line-height:1.6;">
                    <strong style="color:#0f172a;display:block;margin-bottom:2px;">Tiếp nhận &amp; Phân tích tiêu chí hồ sơ:</strong> Chuyên viên đánh giá tổng quan nhu cầu, nguyện vọng học tập/làm việc và khả năng ngoại ngữ.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td height="10"></td></tr>
          <tr>
            <td style="padding:14px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="38" valign="top">
                    <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg, #0072ce, #0284c7);color:#ffffff;font-weight:800;font-size:13px;line-height:30px;text-align:center;">2</div>
                  </td>
                  <td valign="top" style="font-size:13.5px;color:#334155;line-height:1.6;">
                    <strong style="color:#0f172a;display:block;margin-bottom:2px;">Liên hệ tư vấn chuyên sâu 1-1:</strong> Chuyên viên HTO trực tiếp gọi điện / nhắn Zalo để trao đổi chi tiết lộ trình cá nhân hóa.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td height="10"></td></tr>
          <tr>
            <td style="padding:14px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="38" valign="top">
                    <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg, #059669, #10b981);color:#ffffff;font-weight:800;font-size:13px;line-height:30px;text-align:center;">3</div>
                  </td>
                  <td valign="top" style="font-size:13.5px;color:#334155;line-height:1.6;">
                    <strong style="color:#0f172a;display:block;margin-bottom:2px;">Gửi kế hoạch lộ trình &amp; Ưu đãi:</strong> Nhận bộ tài liệu hướng dẫn hoàn chỉnh kèm bộ quà tặng / gói học bổng ưu đãi độc quyền.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- KHUNG HỖ TRỢ KHẨN CẤP (DIRECT SUPPORT CTA) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #0f2c59 0%, #1e3a8a 100%);border-radius:12px;margin:24px 0;color:#ffffff;box-shadow:0 6px 18px rgba(15,44,89,0.2);">
          <tr>
            <td style="padding:22px 26px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12.5px;color:#93c5fd;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">CẦN HỖ TRỢ TƯ VẤN KHẨN CẤP?</p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#ffffff;line-height:1.5;">Nếu Anh/Chị cần trao đổi ngay, đừng ngần ngại gọi tổng đài miễn cước để gặp Chuyên viên trực ban:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center" style="border-radius:8px;background:linear-gradient(90deg, #d4af37 0%, #fef08a 50%, #c5a059 100%);padding:2px;">
                    <a href="${COMPANY_HOTLINE_TEL}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:800;color:#0f2c59;text-decoration:none;border-radius:6px;background-color:#ffffff;">📞 GỌI HOTLINE MP ${COMPANY_HOTLINE}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin-top:22px;font-size:14px;color:#334155;line-height:1.7;">
          Trân trọng,<br/>
          <strong style="color:#0f172a;font-size:14.5px;">Ban Tư Vấn &amp; Chăm Sóc Khách Hàng</strong><br/>
          <strong style="color:#0072ce;">${COMPANY_NAME}</strong>
        </p>
      `,
      cta: { text: `Gọi ngay Hotline ${COMPANY_HOTLINE}`, href: COMPANY_HOTLINE_TEL },
    };
  }

  _buildNurtureContent(stage, customerName) {
    const name = this._esc(customerName || 'bạn');
    if (stage === 'day5') {
      return {
        subject: 'Vài điều bạn nên biết trước khi bắt đầu hành trình du học/định cư',
        preheader: 'HTO Edu, HTO Immi và Hallo Sài Gòn luôn sẵn sàng đồng hành cùng bạn.',
        badge: 'Đồng hành cùng bạn',
        heading: `${COMPANY_NAME} vẫn luôn đồng hành cùng bạn`,
        bodyHtml: `
          <p>Xin chào <strong>${name}</strong>,</p>
          <p>${COMPANY_NAME} vẫn luôn đồng hành cùng bạn trong quá trình cân nhắc lựa chọn phù hợp nhất cho hành trình sắp tới.</p>
          <p>Đội ngũ của chúng tôi gồm <strong>HTO Edu</strong> (tư vấn du học), <strong>HTO Immi</strong> (tư vấn định cư) và <strong>Hallo Sài Gòn</strong> (đào tạo ngoại ngữ nền tảng) luôn sẵn sàng hỗ trợ bạn ở bất kỳ giai đoạn nào - từ chọn trường, chuẩn bị hồ sơ, đến sau khi bạn đã đặt chân tới đất nước mới.</p>
          <p>Nếu bạn còn băn khoăn điều gì (chi phí, hồ sơ, khả năng đậu visa...), đừng ngần ngại chia sẻ - chuyên viên của chúng tôi rất sẵn lòng lắng nghe và giải đáp miễn phí.</p>
        `,
        cta: { text: 'Nhận tư vấn miễn phí', href: COMPANY_HOTLINE_TEL },
      };
    }
    return {
      subject: `${COMPANY_NAME} vẫn luôn đồng hành cùng bạn`,
      preheader: 'Có bất kỳ câu hỏi nào, đội ngũ chuyên viên của chúng tôi luôn sẵn sàng lắng nghe.',
      badge: 'Đồng hành cùng bạn',
      heading: `${COMPANY_NAME} vẫn luôn đồng hành cùng bạn`,
      bodyHtml: `
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Cảm ơn bạn đã quan tâm đến dịch vụ của ${COMPANY_NAME}. Chúng tôi hiểu rằng quyết định du học hay định cư là một hành trình quan trọng, cần thời gian cân nhắc kỹ lưỡng.</p>
        <p>Nếu bạn có bất kỳ câu hỏi nào - dù nhỏ nhất - đội ngũ chuyên viên của chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ, hoàn toàn miễn phí.</p>
      `,
      cta: { text: 'Nhận tư vấn miễn phí', href: COMPANY_HOTLINE_TEL },
    };
  }

  _buildThankYouContent(customerName) {
    const name = this._esc(customerName || 'bạn');
    return {
      subject: `Cảm ơn bạn đã tin tưởng ${COMPANY_NAME}!`,
      preheader: 'Chúng tôi rất vui khi được đồng hành cùng bạn đến bước quan trọng này.',
      badge: 'Cảm ơn bạn',
      heading: `Cảm ơn bạn đã tin tưởng ${COMPANY_NAME}! 🎉`,
      accentColor: '#15803d',
      bodyHtml: `
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Chúng tôi rất vui khi được đồng hành cùng bạn đến bước quan trọng này trong hành trình du học/định cư. Cảm ơn bạn đã tin tưởng lựa chọn ${COMPANY_NAME}!</p>
        <p>Chuyên viên phụ trách sẽ tiếp tục hỗ trợ bạn ở các bước tiếp theo. Nếu có bất kỳ thắc mắc nào trong quá trình chuẩn bị, đừng ngần ngại liên hệ với chúng tôi.</p>
        <p>Nếu có người thân/bạn bè cũng đang quan tâm đến du học hay định cư, chúng tôi luôn sẵn sàng hỗ trợ họ như đã hỗ trợ bạn.</p>
        <p style="margin-top:16px;">Chúc bạn có một hành trình thật nhiều trải nghiệm đáng nhớ phía trước! 🌊</p>
      `,
    };
  }

  _buildWinBackContent(customerName) {
    const name = this._esc(customerName || 'bạn');
    return {
      subject: `${COMPANY_NAME} vẫn ở đây nếu bạn cần hỗ trợ`,
      preheader: 'Không áp lực, không ràng buộc - chỉ cần một cuộc trò chuyện.',
      badge: 'Chúng tôi vẫn ở đây',
      heading: `${COMPANY_NAME} vẫn ở đây nếu bạn cần`,
      bodyHtml: `
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Đã một thời gian kể từ lần trao đổi gần nhất của chúng ta. Nếu kế hoạch du học hay định cư của bạn vẫn còn dang dở, hoặc dự định đã thay đổi và bạn muốn tìm hiểu lại, ${COMPANY_NAME} luôn sẵn sàng đồng hành cùng bạn bất cứ lúc nào.</p>
        <p>Không có áp lực, không ràng buộc - chỉ cần một cuộc trò chuyện để chúng tôi hiểu bạn đang cần gì.</p>
      `,
      cta: { text: 'Trò chuyện lại với chúng tôi', href: COMPANY_HOTLINE_TEL },
    };
  }

  _buildNewsletterContent(customerName, newsPost) {
    const name = this._esc(customerName || 'bạn');
    const label = newsPost?.type === 'event' ? 'Sự kiện mới' : 'Tin tức mới';
    const title = this._esc(newsPost?.title || '');
    const summary = this._esc(newsPost?.summary || '');
    return {
      subject: `[${COMPANY_NAME}] ${newsPost?.title || label}`,
      preheader: summary || `${label} vừa được cập nhật từ ${COMPANY_NAME}.`,
      badge: label,
      heading: `${label} từ ${COMPANY_NAME}`,
      bodyHtml: `
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>${COMPANY_NAME} vừa cập nhật thông tin mới có thể bạn quan tâm:</p>
        <div style="background-color:#f4f9fa;border:1px solid #e4eef0;padding:16px 18px;border-radius:12px;margin:14px 0;">
          <h3 style="margin:0 0 8px;color:#0e7490;font-size:16px;">${title}</h3>
          <p style="margin:0;color:#475569;">${summary}</p>
        </div>
      `,
      cta: { text: 'Tìm hiểu thêm', href: COMPANY_HOTLINE_TEL },
    };
  }

  // ==========================================================
  // EMAIL: ĐẶT LẠI MẬT KHẨU (giữ nguyên - không thuộc CRM/Marketing Automation)
  // ==========================================================

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

  // ==========================================================
  // CRM AUTOMATION - EMAIL GỬI KHÁCH HÀNG
  // ==========================================================

  /**
   * [CRM AUTOMATION] Gửi email xác nhận đã tiếp nhận thông tin cho khách hàng
   * ngay khi lead được tạo, để khách không cảm thấy bị "im lặng". Dùng giao
   * diện thương hiệu đầy đủ (có linh vật) vì đây là email đầu tiên khách hàng
   * nhận được từ công ty - ấn tượng ban đầu rất quan trọng.
   * @param {string} toEmail - Email khách hàng
   * @param {string} customerName - Tên khách hàng
   * @param {string} productInterest - Dịch vụ khách hàng quan tâm
   */
  async sendLeadConfirmationEmail(toEmail, customerName, productInterest) {
    if (!toEmail) return;
    try {
      const content = this._buildLeadConfirmationContent(customerName, productInterest);
      const html = this._renderMarketingTemplate(content);

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: content.subject,
        html,
      });
      console.log(`[MailService] Đã gửi email xác nhận lead cho khách hàng: ${toEmail}`);
    } catch (error) {
      // Không chặn tiến trình tạo lead nếu gửi mail thất bại
      console.error('[MailService] Lỗi khi gửi email xác nhận lead cho khách hàng:', error.message);
    }
  }

  // ==========================================================
  // CRM AUTOMATION - EMAIL NỘI BỘ (NHÂN SỰ / QUẢN LÝ)
  // ==========================================================

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
        heading: '⚡ PHÂN CÔNG THÔNG TIN KHÁCH HÀNG MỚI',
        tag: 'HOT LEAD - TRANG CHỦ',
        accentColor: '#0f2c59',
        bodyHtml: `
          <p style="margin:0 0 14px 0;">Xin chào <strong>${this._esc(staffName)}</strong>,</p>
          <p style="margin:0 0 16px 0;">Hệ thống vừa ghi nhận một <strong>Lead khách hàng mới</strong> từ Trang chủ Website và tự động phân công cho bạn phụ trách chăm sóc:</p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #cbd5e1;border-left:4px solid #0072ce;border-radius:10px;margin:16px 0;overflow:hidden;">
            <tr>
              <td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;line-height:1.7;">
                  <tr>
                    <td style="width:140px;color:#64748b;" valign="top">Khách hàng:</td>
                    <td style="font-weight:700;color:#0f172a;" valign="top">${this._esc(lead.customerName)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;" valign="top">Điện thoại:</td>
                    <td style="font-weight:700;color:#0284c7;" valign="top"><a href="tel:${this._esc(lead.phone)}" style="color:#0284c7;text-decoration:none;font-weight:700;">📞 ${this._esc(lead.phone)}</a></td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;" valign="top">Email:</td>
                    <td style="color:#334155;" valign="top">${this._esc(lead.email || 'Chưa cung cấp')}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;" valign="top">Dịch vụ quan tâm:</td>
                    <td style="font-weight:700;color:#0f2c59;" valign="top">${this._esc(lead.productInterest) || 'Du học / Định cư'}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;" valign="top">Nguồn tiếp cận:</td>
                    <td style="color:#334155;" valign="top">${this._esc(lead.source) || 'Website Trang chủ'}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;" valign="top">Kênh ưu tiên:</td>
                    <td style="color:#334155;" valign="top">${this._esc(lead.preferredContact) || 'Điện thoại / Zalo'}</td>
                  </tr>
                  ${lead.note ? `<tr><td style="color:#64748b;" valign="top">Ghi chú:</td><td style="color:#475569;font-style:italic;" valign="top">${this._esc(lead.note)}</td></tr>` : ''}
                </table>
              </td>
            </tr>
          </table>

          <p style="margin:16px 0 0 0;color:#b91c1c;font-weight:700;font-size:13px;">
            ⚠️ Vui lòng liên hệ lại khách hàng sớm nhất có thể (cam kết &lt; 2 giờ) và đăng nhập CRM Portal để cập nhật trạng thái tư vấn.
          </p>
        `,
      });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: `[Lead mới] ${lead.customerName} - ${lead.productInterest || 'Trang chủ'}`,
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
        tag: 'CẦN XỬ LÝ',
        accentColor: '#b45309',
        bodyHtml: `
          <p>Xin chào <strong>${this._esc(staffName)}</strong>,</p>
          <p>Lead dưới đây đã <strong>${hoursSinceUpdate} giờ</strong> chưa được cập nhật trạng thái mới:</p>
          <ul style="background-color: #fffbeb; padding: 15px 15px 15px 30px; border-radius: 8px;">
            <li>Khách hàng: <strong>${this._esc(lead.customerName)}</strong></li>
            <li>Điện thoại: <strong>${this._esc(lead.phone)}</strong></li>
            <li>Trạng thái hiện tại: ${this._esc(lead.status)}</li>
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
        tag: 'TỰ ĐỘNG ĐÓNG LEAD',
        accentColor: '#b91c1c',
        bodyHtml: `
          <p>Xin chào <strong>${this._esc(staffName)}</strong>,</p>
          <p>Lead dưới đây đã không có cập nhật nào trong <strong>${days} ngày</strong>, hệ thống đã tự động chuyển trạng thái sang <strong>"Thất bại (Lost)"</strong> theo quy tắc chăm sóc khách hàng:</p>
          <ul style="background-color: #fef2f2; padding: 15px 15px 15px 30px; border-radius: 8px;">
            <li>Khách hàng: <strong>${this._esc(lead.customerName)}</strong></li>
            <li>Điện thoại: <strong>${this._esc(lead.phone)}</strong></li>
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
        tag: 'ĐỐI SOÁT HOA HỒNG',
        bodyHtml: `
          <p>Xin chào <strong>${this._esc(staffName)}</strong>,</p>
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

  // ==========================================================
  // MARKETING AUTOMATION - EMAIL GỬI KHÁCH HÀNG
  // ==========================================================

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
      const content = this._buildNurtureContent(stage, customerName);
      const html = this._renderMarketingTemplate({ ...content, unsubscribeUrl });

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
      const content = this._buildThankYouContent(customerName);
      const html = this._renderMarketingTemplate({ ...content, unsubscribeUrl });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: content.subject,
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
      const content = this._buildWinBackContent(customerName);
      const html = this._renderMarketingTemplate({ ...content, unsubscribeUrl });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: content.subject,
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
      const content = this._buildNewsletterContent(customerName, newsPost);
      const html = this._renderMarketingTemplate({ ...content, unsubscribeUrl });

      await this.transporter.sendMail({
        from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
        to: toEmail,
        subject: content.subject,
        html,
      });
      console.log(`[MailService] Đã gửi bản tin "${newsPost.title}" cho: ${toEmail}`);
    } catch (error) {
      console.error('[MailService] Lỗi khi gửi bản tin newsletter:', error.message);
    }
  }

  // ==========================================================
  // XEM TRƯỚC & GỬI THỬ EMAIL MẪU (dùng cho trang Cấu hình hệ thống, giúp
  // Admin xác nhận giao diện email trước khi để hệ thống tự động gửi thật)
  // ==========================================================

  /**
   * Danh sách các loại email hỗ trợ xem trước/gửi thử, nhóm theo CRM (nội bộ)
   * và Marketing (khách hàng) để hiển thị trên UI.
   */
  getPreviewableTemplates() {
    return [
      { key: 'lead-confirmation', label: 'Xác nhận đã tiếp nhận (khách hàng)', group: 'marketing' },
      { key: 'nurture-day2', label: 'Chăm sóc Lead - Mốc 1', group: 'marketing' },
      { key: 'nurture-day5', label: 'Chăm sóc Lead - Mốc 2', group: 'marketing' },
      { key: 'thank-you', label: 'Cảm ơn sau chuyển đổi', group: 'marketing' },
      { key: 'win-back', label: 'Tái kết nối (Win-back)', group: 'marketing' },
      { key: 'newsletter', label: 'Bản tin (Newsletter)', group: 'marketing' },
      { key: 'new-lead-alert', label: 'Cảnh báo Lead mới (nội bộ)', group: 'crm' },
      { key: 'stale-reminder', label: 'Nhắc Lead im lặng (nội bộ)', group: 'crm' },
      { key: 'auto-lost', label: 'Thông báo tự động đóng Lead (nội bộ)', group: 'crm' },
      { key: 'commission-reminder', label: 'Nhắc đối soát hoa hồng (nội bộ)', group: 'crm' },
    ];
  }

  /**
   * Dựng { subject, html } cho 1 loại email bằng dữ liệu mẫu, dùng chung cho
   * cả xem trước (không gửi) và gửi thử (gửi thật tới 1 địa chỉ do Admin nhập).
   * @param {string} templateKey
   */
  _renderSample(templateKey) {
    const sampleLead = {
      customerName: 'Nguyễn Văn An',
      phone: '0901 234 567',
      productInterest: 'Du học Đức - Điều dưỡng',
      source: 'Website',
      preferredContact: 'Zalo/Điện thoại',
      status: 'Đang tư vấn',
    };
    const sampleNewsPost = {
      title: 'HTO khai giảng khóa tiếng Đức B1 tháng 9',
      summary: 'Ưu đãi 15% học phí cho học viên đăng ký trước ngày 05/09. Lịch học linh hoạt sáng/tối.',
      type: 'event',
    };

    switch (templateKey) {
      case 'lead-confirmation': {
        const content = this._buildLeadConfirmationContent(sampleLead.customerName, sampleLead.productInterest);
        return { subject: content.subject, html: this._renderMarketingTemplate(content) };
      }
      case 'nurture-day2':
      case 'nurture-day5': {
        const stage = templateKey === 'nurture-day5' ? 'day5' : 'day2';
        const content = this._buildNurtureContent(stage, sampleLead.customerName);
        return { subject: content.subject, html: this._renderMarketingTemplate({ ...content, unsubscribeUrl: '#' }) };
      }
      case 'thank-you': {
        const content = this._buildThankYouContent(sampleLead.customerName);
        return { subject: content.subject, html: this._renderMarketingTemplate({ ...content, unsubscribeUrl: '#' }) };
      }
      case 'win-back': {
        const content = this._buildWinBackContent(sampleLead.customerName);
        return { subject: content.subject, html: this._renderMarketingTemplate({ ...content, unsubscribeUrl: '#' }) };
      }
      case 'newsletter': {
        const content = this._buildNewsletterContent(sampleLead.customerName, sampleNewsPost);
        return { subject: content.subject, html: this._renderMarketingTemplate({ ...content, unsubscribeUrl: '#' }) };
      }
      case 'new-lead-alert': {
        const subject = `[Lead mới] ${sampleLead.customerName} - ${sampleLead.productInterest}`;
        const html = this._renderCrmTemplate({
          heading: 'Bạn có một Lead mới cần xử lý',
          tag: 'LEAD MỚI',
          bodyHtml: `
            <p>Xin chào <strong>Trần Thị Bình</strong>,</p>
            <p>Hệ thống vừa ghi nhận một lead mới được phân công cho bạn:</p>
            <ul style="background-color: #f9f9f9; padding: 15px 15px 15px 30px; border-radius: 8px;">
              <li>Khách hàng: <strong>${sampleLead.customerName}</strong></li>
              <li>Điện thoại: <strong>${sampleLead.phone}</strong></li>
              <li>Dịch vụ quan tâm: ${sampleLead.productInterest}</li>
              <li>Nguồn: ${sampleLead.source}</li>
              <li>Kênh liên hệ ưu tiên: ${sampleLead.preferredContact}</li>
            </ul>
            <p>Vui lòng liên hệ khách hàng sớm nhất có thể để đảm bảo trải nghiệm tư vấn tốt nhất.</p>
          `,
        });
        return { subject, html };
      }
      case 'stale-reminder': {
        const subject = `[Nhắc nhở] Lead "${sampleLead.customerName}" chưa được chăm sóc`;
        const html = this._renderCrmTemplate({
          heading: 'Nhắc nhở: Lead chưa được chăm sóc',
          tag: 'CẦN XỬ LÝ',
          accentColor: '#b45309',
          bodyHtml: `
            <p>Xin chào <strong>Trần Thị Bình</strong>,</p>
            <p>Lead dưới đây đã <strong>24 giờ</strong> chưa được cập nhật trạng thái mới:</p>
            <ul style="background-color: #fffbeb; padding: 15px 15px 15px 30px; border-radius: 8px;">
              <li>Khách hàng: <strong>${sampleLead.customerName}</strong></li>
              <li>Điện thoại: <strong>${sampleLead.phone}</strong></li>
              <li>Trạng thái hiện tại: ${sampleLead.status}</li>
            </ul>
            <p>Vui lòng liên hệ lại khách hàng và cập nhật trạng thái sớm để không bỏ lỡ cơ hội.</p>
          `,
        });
        return { subject, html };
      }
      case 'auto-lost': {
        const subject = `[Tự động đóng] Lead "${sampleLead.customerName}" đã chuyển sang Thất bại`;
        const html = this._renderCrmTemplate({
          heading: 'Một Lead đã tự động chuyển sang "Thất bại"',
          tag: 'TỰ ĐỘNG ĐÓNG LEAD',
          accentColor: '#b91c1c',
          bodyHtml: `
            <p>Xin chào <strong>Trần Thị Bình</strong>,</p>
            <p>Lead dưới đây đã không có cập nhật nào trong <strong>14 ngày</strong>, hệ thống đã tự động chuyển trạng thái sang <strong>"Thất bại (Lost)"</strong> theo quy tắc chăm sóc khách hàng:</p>
            <ul style="background-color: #fef2f2; padding: 15px 15px 15px 30px; border-radius: 8px;">
              <li>Khách hàng: <strong>${sampleLead.customerName}</strong></li>
              <li>Điện thoại: <strong>${sampleLead.phone}</strong></li>
            </ul>
            <p>Nếu đây là nhầm lẫn, bạn có thể vào hệ thống để mở lại và cập nhật trạng thái phù hợp.</p>
          `,
        });
        return { subject, html };
      }
      case 'commission-reminder': {
        const subject = '[Nhắc đối soát] 5 khoản hoa hồng đang chờ xử lý';
        const html = this._renderCrmTemplate({
          heading: 'Nhắc đối soát hoa hồng Cộng tác viên',
          tag: 'ĐỐI SOÁT HOA HỒNG',
          bodyHtml: `
            <p>Xin chào <strong>Admin</strong>,</p>
            <p>Hiện có <strong>5</strong> giao dịch hoa hồng đang chờ đối soát quá thời hạn cấu hình, tổng giá trị khoảng <strong>${(15000000).toLocaleString('vi-VN')} VND</strong>.</p>
            <p>Vui lòng vào hệ thống để kiểm tra và phê duyệt/đối soát kịp thời cho Cộng tác viên.</p>
          `,
        });
        return { subject, html };
      }
      default:
        return null;
    }
  }

  /**
   * [Cấu hình hệ thống] Trả về { subject, html } để hiển thị xem trước trên
   * UI (iframe) - KHÔNG gửi email thật.
   */
  getTemplatePreview(templateKey) {
    return this._renderSample(templateKey);
  }

  /**
   * [Cấu hình hệ thống] Gửi thật 1 email mẫu tới địa chỉ do Admin chỉ định,
   * dùng để kiểm tra hiển thị trên hộp thư thật (Gmail/Outlook...) trước khi
   * tin tưởng để hệ thống tự động gửi hàng loạt.
   * @param {string} templateKey
   * @param {string} toEmail
   */
  async sendTestEmail(templateKey, toEmail) {
    const rendered = this._renderSample(templateKey);
    if (!rendered) {
      throw new Error('Loại email mẫu không hợp lệ.');
    }
    await this.transporter.sendMail({
      from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.USER}>`,
      to: toEmail,
      subject: `[BẢN XEM THỬ] ${rendered.subject}`,
      html: rendered.html,
    });
    console.log(`[MailService] Đã gửi email thử (${templateKey}) tới: ${toEmail}`);
    return true;
  }
}

// Export duy nhất một instance của MailService
module.exports = new MailService();
