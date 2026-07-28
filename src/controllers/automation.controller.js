const automationService = require('../services/automation.service');

class AutomationController {
  /**
   * Lấy cấu hình hiện tại + số liệu tổng quan của CRM Automation
   * GET /automation/overview
   */
  async getOverview(req, res) {
    try {
      const overview = await automationService.getOverview();
      return res.status(200).json({
        success: true,
        message: 'Lấy tổng quan CRM Automation thành công.',
        data: overview,
      });
    } catch (error) {
      console.error('[AutomationController] Lỗi khi lấy tổng quan:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy tổng quan CRM Automation.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật cấu hình CRM Automation
   * POST /automation/config
   */
  async updateConfig(req, res) {
    try {
      const updated = await automationService.updateConfig(req.body || {});
      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình CRM Automation thành công.',
        data: updated,
      });
    } catch (error) {
      console.error('[AutomationController] Lỗi khi cập nhật cấu hình:', error);
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình CRM Automation.',
        error: error.message,
      });
    }
  }

  /**
   * Chạy thủ công toàn bộ tác vụ CRM Automation ngay lập tức, không cần chờ
   * chu kỳ chạy nền (hữu ích để Admin kiểm tra/xem kết quả tức thì).
   * POST /automation/run-now
   */
  async runNow(req, res) {
    try {
      const result = await automationService.runFullCheck();
      return res.status(200).json({
        success: true,
        message: 'Đã chạy kiểm tra CRM Automation thủ công thành công.',
        data: result,
      });
    } catch (error) {
      console.error('[AutomationController] Lỗi khi chạy kiểm tra thủ công:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi chạy kiểm tra CRM Automation.',
        error: error.message,
      });
    }
  }
}

module.exports = new AutomationController();
