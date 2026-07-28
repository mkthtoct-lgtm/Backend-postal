const marketingAutomationService = require('../services/marketingAutomation.service');

/**
 * Khung HTML tối giản, tự chứa (không phụ thuộc file tĩnh) để hiển thị kết
 * quả cho các đường dẫn public mà khách hàng bấm từ email (không phải SPA).
 */
function renderHtmlPage({ title, message, isError = false }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} - HT Ocean Group</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f8fafc; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #fff; max-width: 480px; width: 90%; margin: 20px; padding: 32px 28px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; }
  h1 { font-size: 20px; color: ${isError ? '#b91c1c' : '#0e7490'}; margin-bottom: 12px; }
  p { color: #475569; font-size: 14px; line-height: 1.6; }
  .hotline { display: inline-block; margin-top: 16px; background: #0e7490; color: #fff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-size: 14px; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="hotline" href="tel:18009078">Gọi hotline 1800 9078</a>
  </div>
</body>
</html>`;
}

class MarketingController {
  /**
   * [PUBLIC] Hủy nhận email marketing/bản tin - được bấm trực tiếp từ email,
   * không yêu cầu đăng nhập (rủi ro thấp, chỉ ảnh hưởng tới việc nhận email
   * quảng bá, không phải hành động nhạy cảm).
   * GET /marketing/unsubscribe/:leadId
   */
  async unsubscribe(req, res) {
    try {
      const { leadId } = req.params;
      const result = await marketingAutomationService.unsubscribeByLeadId(leadId);

      if (!result.success) {
        return res.status(404).send(
          renderHtmlPage({
            title: 'Không tìm thấy yêu cầu',
            message: 'Đường dẫn hủy nhận email không hợp lệ hoặc đã hết hạn.',
            isError: true,
          })
        );
      }

      return res.status(200).send(
        renderHtmlPage({
          title: 'Đã hủy nhận email thành công',
          message: 'Bạn sẽ không nhận thêm email chăm sóc/bản tin từ HT Ocean Group nữa. Nếu cần hỗ trợ, đội ngũ của chúng tôi vẫn luôn sẵn sàng qua hotline bên dưới.',
        })
      );
    } catch (error) {
      console.error('[MarketingController] Lỗi khi hủy nhận email:', error);
      return res.status(500).send(
        renderHtmlPage({
          title: 'Có lỗi xảy ra',
          message: 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau hoặc liên hệ hotline để được hỗ trợ.',
          isError: true,
        })
      );
    }
  }

  /**
   * Lấy cấu hình hiện tại + số liệu tổng quan Marketing Automation
   * GET /marketing/overview
   */
  async getOverview(req, res) {
    try {
      const overview = await marketingAutomationService.getOverview();
      return res.status(200).json({
        success: true,
        message: 'Lấy tổng quan Marketing Automation thành công.',
        data: overview,
      });
    } catch (error) {
      console.error('[MarketingController] Lỗi khi lấy tổng quan:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy tổng quan Marketing Automation.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật cấu hình Marketing Automation
   * POST /marketing/config
   */
  async updateConfig(req, res) {
    try {
      const updated = await marketingAutomationService.updateConfig(req.body || {});
      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình Marketing Automation thành công.',
        data: updated,
      });
    } catch (error) {
      console.error('[MarketingController] Lỗi khi cập nhật cấu hình:', error);
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình Marketing Automation.',
        error: error.message,
      });
    }
  }

  /**
   * Chạy thủ công các tác vụ marketing automation định kỳ (chăm sóc + tái
   * kết nối) ngay lập tức, không cần chờ chu kỳ chạy nền.
   * POST /marketing/run-now
   */
  async runNow(req, res) {
    try {
      const result = await marketingAutomationService.runFullCheck();
      return res.status(200).json({
        success: true,
        message: 'Đã chạy kiểm tra Marketing Automation thủ công thành công.',
        data: result,
      });
    } catch (error) {
      console.error('[MarketingController] Lỗi khi chạy kiểm tra thủ công:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi chạy kiểm tra Marketing Automation.',
        error: error.message,
      });
    }
  }
}

module.exports = new MarketingController();
