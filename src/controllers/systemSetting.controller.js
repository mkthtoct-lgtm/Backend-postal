const systemSettingService = require('../services/systemSetting.service');

const DEFAULT_CHAT_CONFIG = {
  enabled: true,
  model: 'gemini-2.5-flash',
  systemPrompt: 'Bạn là trợ lý AI thông minh của HT Ocean Group. Hãy giải đáp thắc mắc của nhân viên dựa trên SOP và tài liệu nội bộ.',
  welcomeMessage: 'Xin chào! Tôi là trợ lý AI của HT Ocean. Tôi có thể giúp gì cho bạn?'
};

const DEFAULT_COMMISSION_CONFIG = {
  khachHangThanThiet: 5,
  daiSuGieoMamDong: 5,
  daiSuKetNoiBac: 6,
  daiSuTruCotVang: 7,
  daiSuTinhAnhKimCuong: 8,
  daiSuTanTamMaster: 10
};

const normalizePercentage = (value, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
};

class SystemSettingController {
  /**
   * Lấy cấu hình công khai của Chatbot AI (dành cho mọi người dùng đã đăng nhập)
   * GET /system-settings/public-chat
   */
  async getPublicChatConfig(req, res) {
    try {
      const chatConfig = await systemSettingService.getSetting('chat_config', DEFAULT_CHAT_CONFIG);
      
      return res.status(200).json({
        success: true,
        message: 'Lấy cấu hình công khai Chatbot AI thành công.',
        data: {
          enabled: chatConfig.enabled !== undefined ? !!chatConfig.enabled : DEFAULT_CHAT_CONFIG.enabled,
          welcomeMessage: chatConfig.welcomeMessage || DEFAULT_CHAT_CONFIG.welcomeMessage,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy cấu hình công khai Chatbot AI.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy toàn bộ cấu hình hệ thống (Chatbot AI và Chính sách Hoa hồng)
   * GET /system-settings
   */
  async getSettings(req, res) {
    try {
      const chatConfig = await systemSettingService.getSetting('chat_config', DEFAULT_CHAT_CONFIG);
      const commissionConfig = await systemSettingService.getSetting('commission_config', DEFAULT_COMMISSION_CONFIG);

      // Đảm bảo không trả về API Key thô của chatbot ra client (vì lý do bảo mật)
      if (chatConfig) {
        delete chatConfig.apiKey;
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy cấu hình hệ thống thành công.',
        data: {
          chatConfig,
          commissionConfig,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy cấu hình hệ thống.',
        error: error.message,
      });
    }
  }

  /**
   * Lưu cấu hình Chatbot AI
   * POST /system-settings/chat
   */
  async updateChatSettings(req, res) {
    try {
      const { enabled, model, systemPrompt, welcomeMessage } = req.body;

      // Không lưu apiKey gửi từ client lên DB (Key sẽ lấy từ env của Backend)
      const cleanChatConfig = {
        enabled: enabled !== undefined ? !!enabled : DEFAULT_CHAT_CONFIG.enabled,
        model: model || DEFAULT_CHAT_CONFIG.model,
        systemPrompt: systemPrompt || DEFAULT_CHAT_CONFIG.systemPrompt,
        welcomeMessage: welcomeMessage || DEFAULT_CHAT_CONFIG.welcomeMessage,
      };

      const updated = await systemSettingService.updateSetting('chat_config', cleanChatConfig);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình Chatbot AI thành công.',
        data: updated.value,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình Chatbot AI.',
        error: error.message,
      });
    }
  }

  /**
   * Lưu cấu hình chính sách hoa hồng
   * POST /system-settings/commission
   */
  async updateCommissionSettings(req, res) {
    try {
      const {
        khachHangThanThiet,
        daiSuGieoMamDong,
        daiSuKetNoiBac,
        daiSuTruCotVang,
        daiSuTinhAnhKimCuong,
        daiSuTanTamMaster
      } = req.body;

      const cleanCommissionConfig = {
        khachHangThanThiet: normalizePercentage(khachHangThanThiet, DEFAULT_COMMISSION_CONFIG.khachHangThanThiet),
        daiSuGieoMamDong: normalizePercentage(daiSuGieoMamDong, DEFAULT_COMMISSION_CONFIG.daiSuGieoMamDong),
        daiSuKetNoiBac: normalizePercentage(daiSuKetNoiBac, DEFAULT_COMMISSION_CONFIG.daiSuKetNoiBac),
        daiSuTruCotVang: normalizePercentage(daiSuTruCotVang, DEFAULT_COMMISSION_CONFIG.daiSuTruCotVang),
        daiSuTinhAnhKimCuong: normalizePercentage(daiSuTinhAnhKimCuong, DEFAULT_COMMISSION_CONFIG.daiSuTinhAnhKimCuong),
        daiSuTanTamMaster: normalizePercentage(daiSuTanTamMaster, DEFAULT_COMMISSION_CONFIG.daiSuTanTamMaster),
      };

      const updated = await systemSettingService.updateSetting('commission_config', cleanCommissionConfig);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình hoa hồng thành công.',
        data: updated.value,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình hoa hồng.',
        error: error.message,
      });
    }
  }
}

module.exports = new SystemSettingController();
