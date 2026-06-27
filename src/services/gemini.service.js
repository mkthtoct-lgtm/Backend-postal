const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../configs/env');
const systemSettingService = require('./systemSetting.service');

const DEFAULT_CHAT_CONFIG = {
  enabled: true,
  model: 'gemini-1.5-flash',
  systemPrompt: 'Bạn là trợ lý AI thông minh của HT Ocean Group. Hãy giải đáp thắc mắc của nhân viên dựa trên SOP và tài liệu nội bộ.',
  welcomeMessage: 'Xin chào! Tôi là trợ lý AI của HT Ocean. Tôi có thể giúp gì cho bạn?'
};

class GeminiService {
  /**
   * Xây dựng system prompt dựa trên cấu hình và quyền hạn của user
   * @param {object} chatConfig - Cấu hình chatbot từ database
   * @param {object} userContext - Thông tin và quyền hạn của user
   * @returns {string} System prompt đầy đủ
   */
  buildSystemPrompt(chatConfig, userContext) {
    const basePrompt = chatConfig.systemPrompt;
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
Tên: ${userContext.name}
Vai trò: ${userContext.roleName}${hasAllPermissions ? ' (Toàn quyền)' : ''}
Các chức năng bạn có quyền truy cập: ${accessibleFeatures.length > 0 ? accessibleFeatures.join(', ') : 'Không có quyền đặc biệt'}

Quy tắc quan trọng:
- CHỈ hướng dẫn về các chức năng này mà người dùng có quyền truy cập.
- Nếu người dùng hỏi về chức năng họ KHÔNG có quyền, hãy thông báo lịch sự rằng họ chưa có quyền truy cập và yêu cầu liên hệ Quản trị viên.
- Không tiết lộ thông tin nội bộ nhạy cảm nếu người dùng không có quyền liên quan.
--- KẾT THÚC THÔNG TIN NGƯỜI DÙNG ---`;

    return basePrompt + roleContext;
  }

  /**
   * Tạo câu trả lời từ chatbot sử dụng mô hình được cấu hình trong hệ thống
   * @param {string} message - Tin nhắn từ người dùng
   * @param {object} userContext - Thông tin và quyền hạn của user
   * @returns {Promise<string>} Phản hồi dạng văn bản từ AI
   */
  async generateChatResponse(message, userContext = {}) {
    try {
      if (!env.GEMINI_API_KEY) {
        throw new Error('Chưa cấu hình GEMINI_API_KEY trong file cấu hình env');
      }

      // Đọc cấu hình chatbot từ database
      const chatConfig = await systemSettingService.getSetting('chat_config', DEFAULT_CHAT_CONFIG);

      if (!chatConfig.enabled) {
        throw new Error('Dịch vụ Chatbot AI hiện đã bị tắt bởi Quản trị viên.');
      }

      // Khởi tạo đối tượng GoogleGenerativeAI với API Key từ config tập trung
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      
      // Sử dụng mô hình từ cấu hình hệ thống
      const modelName = chatConfig.model || 'gemini-1.5-flash';
      
      // Xây dựng system prompt có đưa vào thông tin quyền hạn của user
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
