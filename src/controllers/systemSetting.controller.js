const systemSettingService = require('../services/systemSetting.service');

const DEFAULT_COMPANY_KNOWLEDGE_BASE = `=== THÔNG TIN CÔNG TY HT OCEAN GROUP ===
- Tên đầy đủ: Công ty Cổ phần Tư vấn Giáo dục & Định cư HT Đại Dương (thương hiệu: HT Ocean Group / HTO Group).
- Mã số thuế: 0316888871 (cấp lần đầu 02/06/2021, Sở Kế hoạch & Đầu tư TP.HCM).
- Trụ sở chính: Tầng 1, Tòa nhà Gold Star 12, số 284/41/2 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh.
- Hotline chăm sóc khách hàng: 1800 9078.
- Website: htogroup.com.vn.

HỆ SINH THÁI CÁC ĐƠN VỊ THÀNH VIÊN:
- Hallo Sài Gòn: trung tâm ngoại ngữ, đào tạo nền tảng ngôn ngữ (Anh, Đức...) trước khi du học.
- HTO Edu: tư vấn du học - định hướng chọn trường, học bổng, chuẩn bị hồ sơ nhập học.
- HTO Immi: tư vấn định cư nước ngoài (diện tay nghề, đầu tư, đoàn tụ gia đình...).
- HTO Travel: hỗ trợ du lịch quốc tế, thăm thân.

GIỚI THIỆU (thông tin công ty tự công bố, KHÔNG phải cam kết cho từng hồ sơ cụ thể):
- Hơn 5 năm kinh nghiệm trong lĩnh vực tư vấn giáo dục & định cư.
- Đã đồng hành cùng hơn 10.000 học viên trong hành trình học tập/việc làm.
- Hơn 3.000 trường hợp định cư thành công tại các thị trường như Canada, Úc, Đức...

ĐỐI TÁC: IELTS IDP, ApplyBoard, Đại học FPT, upGrad, SI-UK (SI Global), cùng các hiệp hội doanh nghiệp VCCI, BNI.

QUY TRÌNH TỔNG QUÁT KHI ĐỒNG HÀNH CÙNG KHÁCH HÀNG:
1. Tư vấn & đánh giá hồ sơ ban đầu (miễn phí).
2. Định hướng trường/chương trình/diện định cư phù hợp với năng lực & ngân sách.
3. Chuẩn bị hồ sơ, thư mời nhập học hoặc hồ sơ định cư.
4. Hỗ trợ nộp hồ sơ xin visa.
5. Chuẩn bị hành trang trước khi lên đường.
6. Đồng hành, hỗ trợ khách hàng ngay cả sau khi đã ở nước ngoài.

QUY TẮC BẮT BUỘC KHI TRẢ LỜI (áp dụng cho mọi cuộc trò chuyện):
- KHÔNG bao giờ cam kết/đảm bảo tỷ lệ đậu visa, học bổng, hay thời gian xử lý hồ sơ cụ thể cho một trường hợp cá nhân - mỗi hồ sơ có tính chất khác nhau.
- KHÔNG tự bịa ra con số học phí, chi phí dịch vụ, hoặc mốc thời gian cụ thể nếu không chắc chắn 100%. Trong trường hợp đó, hãy khuyến nghị liên hệ hotline 1800 9078 hoặc để lại thông tin để chuyên viên xác nhận chính xác.
- Nếu câu hỏi nằm ngoài phạm vi hiểu biết, hoặc cần tư vấn pháp lý/tài chính chuyên sâu, hãy thành thật thừa nhận và đề nghị kết nối với chuyên viên con người thay vì suy đoán.`;

const DEFAULT_CUSTOMER_CARE_PROMPT = `Bạn là trợ lý ảo chăm sóc khách hàng của HT Ocean Group - một người đồng hành ấm áp, kiên nhẫn và am hiểu trên hành trình du học/định cư của khách hàng, KHÔNG phải một chatbot tra cứu khô khan.

CÁCH BẠN GIAO TIẾP:
- Xưng hô lịch sự, gần gũi (có thể xưng "mình"/"em"), gọi khách hàng bằng tên nếu đã biết. Giọng văn như một chuyên viên tư vấn tận tâm, KHÔNG máy móc, KHÔNG rập khuôn theo mẫu câu lặp lại.
- Luôn thấu hiểu rằng hành trình du học/định cư có thể khiến khách hàng lo lắng (chi phí, hồ sơ, khả năng đậu visa, xa gia đình...). Hãy lắng nghe và thể hiện sự đồng cảm trước khi đưa thông tin, thay vì trả lời khô khan ngay lập tức.
- Trả lời ngắn gọn, dễ hiểu, tránh thuật ngữ phức tạp; nếu cần giải thích quy trình nhiều bước, hãy chia nhỏ rõ ràng, dễ theo dõi.
- Chỉ hỏi lại tối đa 1 câu hỏi mỗi lượt trả lời (không hỏi dồn dập nhiều câu cùng lúc).
- Nếu khách hàng thể hiện sự quan tâm nghiêm túc, hãy nhẹ nhàng mời họ để lại thông tin liên hệ hoặc gọi hotline 1800 9078 để được chuyên viên hỗ trợ chi tiết hơn - KHÔNG thúc ép, KHÔNG lặp lại lời mời nếu khách đã từ chối hoặc phớt lờ.
- Luôn trung thực: nếu không chắc chắn về một thông tin cụ thể (học phí, thời gian xử lý, tỷ lệ đậu visa...), hãy thẳng thắn nói rằng cần chuyên viên xác nhận thay vì đoán hoặc bịa thông tin.
- Không bao giờ tỏ ra khó chịu, kể cả khi khách hàng hỏi lại nhiều lần hoặc tỏ ra nghi ngờ - luôn kiên nhẫn và tôn trọng.`;

const DEFAULT_CHAT_CONFIG = {
  enabled: true,
  model: 'gemini-2.5-flash',
  systemPrompt: 'Bạn là trợ lý AI nội bộ thông minh của Công ty Cổ phần Tư vấn Giáo dục & Định cư HT Đại Dương (HT Ocean Group). Nhiệm vụ của bạn là hỗ trợ nhân viên tra cứu quy trình nội bộ (SOP), tài liệu và trả lời nhanh các câu hỏi vận hành. Khi nhân viên cần thông tin để tư vấn khách hàng, hãy trả lời chính xác, ấm áp và chuyên nghiệp để giúp nhân viên chăm sóc khách hàng tốt hơn.',
  welcomeMessage: 'Xin chào! Em là trợ lý ảo của HT Ocean Group. Em có thể giúp gì cho anh/chị hôm nay ạ?',
  companyKnowledgeBase: DEFAULT_COMPANY_KNOWLEDGE_BASE,
  customerCareSystemPrompt: DEFAULT_CUSTOMER_CARE_PROMPT,
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

      // [BẢO MẬT] Không bao giờ trả API Key thô về client. Chỉ trả cờ
      // hasApiKey để giao diện biết đã cấu hình hay chưa (hiện badge trạng
      // thái), tránh lộ dữ liệu nhạy cảm qua network/devtools.
      const { apiKey, ...safeChatConfig } = chatConfig || {};

      return res.status(200).json({
        success: true,
        message: 'Lấy cấu hình hệ thống thành công.',
        data: {
          chatConfig: {
            ...safeChatConfig,
            hasApiKey: Boolean(apiKey && String(apiKey).trim()),
          },
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
      const { enabled, model, systemPrompt, welcomeMessage, companyKnowledgeBase, customerCareSystemPrompt, apiKey } = req.body;

      // Lấy cấu hình hiện tại để biết API Key đã lưu trước đó (nếu có), vì
      // client không bao giờ nhận lại API Key thô nên không thể tự gửi lại.
      const currentConfig = await systemSettingService.getSetting('chat_config', DEFAULT_CHAT_CONFIG);

      const cleanChatConfig = {
        enabled: enabled !== undefined ? !!enabled : DEFAULT_CHAT_CONFIG.enabled,
        model: model || DEFAULT_CHAT_CONFIG.model,
        systemPrompt: systemPrompt || DEFAULT_CHAT_CONFIG.systemPrompt,
        welcomeMessage: welcomeMessage || DEFAULT_CHAT_CONFIG.welcomeMessage,
        // [CHATBOT] Kiến thức nền công ty + giọng điệu chăm sóc khách hàng,
        // dùng cho chế độ trò chuyện với khách hàng/CTV/Đại lý (không phải
        // nhân sự nội bộ) - xem gemini.service.js để biết cách áp dụng.
        companyKnowledgeBase: companyKnowledgeBase !== undefined ? String(companyKnowledgeBase) : DEFAULT_CHAT_CONFIG.companyKnowledgeBase,
        customerCareSystemPrompt: customerCareSystemPrompt !== undefined ? String(customerCareSystemPrompt) : DEFAULT_CHAT_CONFIG.customerCareSystemPrompt,
      };

      // [BẢO MẬT] Chỉ CẬP NHẬT API Key khi client thực sự gửi lên một giá trị
      // mới, không rỗng (Admin vừa nhập/dán key vào ô rồi bấm Lưu). Nếu
      // request không gửi trường này hoặc gửi rỗng, GIỮ NGUYÊN key đã lưu
      // trước đó - tránh vô tình xoá key chỉ vì Admin lưu các trường khác
      // (ví dụ sửa lời chào) trong khi ô API Key luôn hiển thị rỗng vì lý do
      // bảo mật. Muốn XOÁ hẳn key, dùng route riêng:
      // DELETE /system-settings/chat/api-key (rõ ràng, không mập mờ).
      if (typeof apiKey === 'string' && apiKey.trim() !== '') {
        cleanChatConfig.apiKey = apiKey.trim();
      } else if (currentConfig && currentConfig.apiKey) {
        cleanChatConfig.apiKey = currentConfig.apiKey;
      }

      const updated = await systemSettingService.updateSetting('chat_config', cleanChatConfig);

      const { apiKey: _omit, ...safeValue } = updated.value || {};

      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình Chatbot AI thành công.',
        data: {
          ...safeValue,
          hasApiKey: Boolean(updated.value && updated.value.apiKey),
        },
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
   * [BẢO MẬT] Xoá hẳn API Key của Chatbot AI khỏi hệ thống (khỏi CSDL) -
   * Chatbot sẽ ngay lập tức ngừng hoạt động (trừ khi máy chủ có cấu hình
   * GEMINI_API_KEY dự phòng qua biến môi trường) cho tới khi Admin nhập lại
   * key mới, đảm bảo không còn dữ liệu key cũ lưu trữ ở bất kỳ đâu trong hệ
   * thống ứng dụng.
   * DELETE /system-settings/chat/api-key
   */
  async clearChatApiKey(req, res) {
    try {
      const currentConfig = await systemSettingService.getSetting('chat_config', DEFAULT_CHAT_CONFIG);
      const { apiKey, ...rest } = currentConfig || {};

      const updated = await systemSettingService.updateSetting('chat_config', rest);
      const { apiKey: _omit, ...safeValue } = updated.value || {};

      return res.status(200).json({
        success: true,
        message: 'Đã xoá API Key của Chatbot AI khỏi hệ thống thành công.',
        data: { ...safeValue, hasApiKey: false },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xoá API Key của Chatbot AI.',
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
