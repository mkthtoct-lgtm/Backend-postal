const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../configs/env');
const systemSettingService = require('./systemSetting.service');

// Vai trò được coi là "nhân sự nội bộ" -> dùng chế độ trợ lý vận hành (SOP,
// phân quyền, nghiệp vụ hệ thống). Mọi vai trò còn lại (khách hàng - 'user',
// Cộng tác viên - 'congtacvien', Đại lý - 'daily', hoặc chưa xác định vai trò)
// sẽ dùng chế độ "chăm sóc khách hàng" ấm áp, giàu cảm xúc hơn.
const INTERNAL_STAFF_ROLE_SLUGS = ['admin', 'bangiamdoc', 'truongbophan', 'nhansu', 'staff'];

// ==========================================================================
// KIẾN THỨC NỀN VỀ CÔNG TY (mặc định) - Admin có thể chỉnh sửa trực tiếp tại
// Cài đặt hệ thống > Chatbot AI > "Kiến thức nền về công ty" mà không cần
// deploy lại code. Nội dung dưới đây được biên soạn từ thông tin công khai
// của HT Ocean Group (htogroup.com.vn) tại thời điểm biên soạn - Admin nên
// cập nhật định kỳ để đảm bảo luôn chính xác, mới nhất.
// ==========================================================================
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

// ==========================================================================
// GIỌNG ĐIỆU CHĂM SÓC KHÁCH HÀNG (mặc định) - áp dụng khi người trò chuyện
// là khách hàng / CTV / đại lý (không phải nhân sự nội bộ vận hành hệ thống).
// ==========================================================================
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
  // System prompt dành cho NHÂN SỰ NỘI BỘ (trợ lý vận hành/SOP)
  systemPrompt: 'Bạn là trợ lý AI nội bộ thông minh của Công ty Cổ phần Tư vấn Giáo dục & Định cư HT Đại Dương (HT Ocean Group). Nhiệm vụ của bạn là hỗ trợ nhân viên tra cứu quy trình nội bộ (SOP), tài liệu và trả lời nhanh các câu hỏi vận hành. Khi nhân viên cần thông tin để tư vấn khách hàng, hãy trả lời chính xác, ấm áp và chuyên nghiệp để giúp nhân viên chăm sóc khách hàng tốt hơn.',
  welcomeMessage: 'Xin chào! Em là trợ lý ảo của HT Ocean Group. Em có thể giúp gì cho anh/chị hôm nay ạ?',
  // Kiến thức nền về công ty - dùng chung cho cả 2 chế độ (nhân sự & khách hàng)
  companyKnowledgeBase: DEFAULT_COMPANY_KNOWLEDGE_BASE,
  // Giọng điệu/persona dành riêng cho khách hàng, CTV, đại lý
  customerCareSystemPrompt: DEFAULT_CUSTOMER_CARE_PROMPT,
};

class GeminiService {
  /**
   * Xây dựng system prompt dành cho NHÂN SỰ NỘI BỘ: giữ nguyên logic phân
   * quyền hiện có (chỉ hướng dẫn đúng chức năng họ được phép truy cập),
   * đồng thời bổ sung kiến thức nền công ty để nhân viên tra cứu nhanh khi
   * cần tư vấn/chăm sóc khách hàng.
   */
  _buildInternalStaffPrompt(chatConfig, userContext) {
    const basePrompt = chatConfig.systemPrompt || DEFAULT_CHAT_CONFIG.systemPrompt;
    const hasAllPermissions = userContext.permissions.includes('*');

    // Phân loại quyền thành các nhóm chức năng để AI hiểu được
    const permissionGroups = {
      'Quản lý nhân sự': ['users:read', 'users:write', 'users:delete'],
      'Quản lý phòng ban': ['departments:read', 'departments:write'],
      'Quản lý vai trò': ['roles:read', 'roles:write'],
      'Quản lý sản phẩm & danh mục': ['products:read', 'products:write', 'product_categories:read', 'product_categories:write'],
      'Quản lý tiêm năng / Leads': ['leads:read', 'leads:write', 'leads:delete'],
      'Quản lý giao dịch': ['deals:read', 'deals:write', 'deals:delete', 'deals:approve'],
      'Họp đồng & Tài liệu': ['contracts:read', 'contracts:write'],
      'Hoa hồng & Doanh số': ['commissions:read', 'commissions:write'],
      'Cấu hình hệ thống': ['settings:manage'],
      'Thông báo': ['notifications:read', 'notifications:write']
    };

    let accessibleFeatures = [];
    if (hasAllPermissions) {
      accessibleFeatures = Object.keys(permissionGroups);
    } else {
      for (const [feature, perms] of Object.entries(permissionGroups)) {
        const hasAccess = perms.some(p => userContext.permissions.includes(p));
        if (hasAccess) accessibleFeatures.push(feature);
      }
    }

    const roleContext = `

--- THÔNG TIN NGƯỜI DÙNG HIỆN TẠI ---
Tên: ${userContext.name || 'Nhân viên'}
Vai trò: ${userContext.roleName}${hasAllPermissions ? ' (Toàn quyền)' : ''}
Các chức năng bạn có quyền truy cập: ${accessibleFeatures.length > 0 ? accessibleFeatures.join(', ') : 'Không có quyền đặc biệt'}

Quy tắc quan trọng:
- CHỈ hướng dẫn về các chức năng này mà người dùng có quyền truy cập.
- Nếu người dùng hỏi về chức năng họ KHÔNG có quyền, hãy thông báo lịch sự rằng họ chưa có quyền truy cập và yêu cầu liên hệ Quản trị viên.
- Không tiết lộ thông tin nội bộ nhạy cảm nếu người dùng không có quyền liên quan.
--- KẾT THÚC THÔNG TIN NGƯỜI DÙNG ---`;

    const knowledgeBase = chatConfig.companyKnowledgeBase
      ? `\n\n${chatConfig.companyKnowledgeBase}\n\n(Phần kiến thức nền công ty ở trên giúp bạn trả lời nhanh khi đồng nghiệp cần thông tin để tư vấn khách hàng.)`
      : '';

    return basePrompt + roleContext + knowledgeBase;
  }

  /**
   * Xây dựng system prompt dành cho KHÁCH HÀNG / CỘNG TÁC VIÊN / ĐẠI LÝ:
   * giọng điệu ấm áp, giàu cảm xúc, tập trung vào kiến thức công ty và chăm
   * sóc khách hàng thay vì logic phân quyền nội bộ.
   */
  _buildCustomerCarePrompt(chatConfig, userContext) {
    const tonePrompt = chatConfig.customerCareSystemPrompt || DEFAULT_CUSTOMER_CARE_PROMPT;
    const knowledgeBase = chatConfig.companyKnowledgeBase || DEFAULT_COMPANY_KNOWLEDGE_BASE;

    const userNote = userContext.name
      ? `\n\n--- THÔNG TIN NGƯỜI ĐANG TRÒ CHUYỆN ---\nTên: ${userContext.name}\nHãy xưng hô đúng tên này khi phù hợp để cuộc trò chuyện gần gũi, cá nhân hoá hơn.\n--- KẾT THÚC ---`
      : '';

    return `${tonePrompt}\n\n${knowledgeBase}${userNote}`;
  }

  /**
   * Xây dựng system prompt dựa trên cấu hình và vai trò của người dùng.
   * Tự động phân nhánh: Nhân sự nội bộ -> trợ lý vận hành theo phân quyền;
   * Khách hàng/CTV/Đại lý -> trợ lý chăm sóc khách hàng ấm áp, giàu cảm xúc.
   * @param {object} chatConfig - Cấu hình chatbot từ database
   * @param {object} userContext - Thông tin và quyền hạn của user
   * @returns {string} System prompt đầy đủ
   */
  buildSystemPrompt(chatConfig, userContext) {
    const isInternalStaff = INTERNAL_STAFF_ROLE_SLUGS.includes(userContext.roleSlug);

    if (isInternalStaff) {
      return this._buildInternalStaffPrompt(chatConfig, userContext);
    }

    return this._buildCustomerCarePrompt(chatConfig, userContext);
  }

  /**
   * Tạo câu trả lời từ chatbot sử dụng mô hình được cấu hình trong hệ thống
   * @param {string} message - Tin nhắn từ người dùng
   * @param {object} userContext - Thông tin và quyền hạn của user
   * @returns {Promise<string>} Phản hồi dạng văn bản từ AI
   */
  async generateChatResponse(message, userContext = {}) {
    try {
      // Đọc cấu hình chatbot từ database
      const chatConfig = await systemSettingService.getSetting('chat_config', DEFAULT_CHAT_CONFIG);

      if (!chatConfig.enabled) {
        throw new Error('Dịch vụ Chatbot AI hiện đã bị tắt bởi Quản trị viên.');
      }

      // [BẢO MẬT / CẤU HÌNH ĐỘNG] Ưu tiên dùng API Key được Admin nhập trực
      // tiếp qua Cài đặt hệ thống > Chatbot AI (lưu trong CSDL, KHÔNG trong
      // code) - có hiệu lực ngay lập tức, không cần deploy lại. Nếu Admin
      // chưa cấu hình qua giao diện, dùng biến môi trường GEMINI_API_KEY của
      // máy chủ làm phương án dự phòng (tương thích ngược). Khi Admin xoá key
      // khỏi Cài đặt hệ thống, key sẽ không còn được dùng nữa (trừ khi máy
      // chủ vẫn còn biến môi trường dự phòng).
      const apiKey = (chatConfig.apiKey && String(chatConfig.apiKey).trim()) || env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error('Chatbot AI chưa được cấu hình API Key. Vui lòng vào Cài đặt hệ thống > Chatbot AI để nhập API Key.');
      }

      // Khởi tạo đối tượng GoogleGenerativeAI với API Key vừa xác định
      const genAI = new GoogleGenerativeAI(apiKey);

      // Sử dụng mô hình từ cấu hình hệ thống
      const modelName = chatConfig.model || 'gemini-2.5-flash';

      // Xây dựng system prompt có đưa vào thông tin quyền hạn/vai trò của user
      const systemPrompt = this.buildSystemPrompt(chatConfig, userContext);

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt
      });

      const result = await model.generateContent(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('[GeminiService] Lỗi khi tạo câu trả lời từ AI:', error.message);
      throw new Error(`Lỗi kết nối Gemini API: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();
