const geminiService = require('../services/gemini.service');
const Role = require('../models/Role');
const User = require('../models/User');

class ChatController {
  /**
   * API gửi tin nhắn tới chatbot và nhận phản hồi từ Gemini AI
   */
  async sendMessage(req, res) {
    try {
      const { message } = req.body;

      if (!message || message.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp nội dung tin nhắn gửi tới chatbot.'
        });
      }

      // Lấy thông tin role và quyền hạn của user từ JWT token
      const userContext = {
        name: '',
        email: req.user.email || '',
        roleId: req.user.roleId || null,
        roleName: 'Nhân viên',
        roleSlug: null,
        permissions: []
      };

      // Lưu ý: middleware xác thực (auth.js) hiện KHÔNG đính kèm tên người
      // dùng vào req.user, nên cần truy vấn riêng để chatbot có thể xưng hô
      // đúng tên, giúp cuộc trò chuyện cá nhân hoá và giàu cảm xúc hơn.
      const [role, dbUser] = await Promise.all([
        userContext.roleId ? Role.findById(userContext.roleId).lean() : null,
        req.user.sub ? User.findById(req.user.sub).select('fullName').lean() : null,
      ]);

      if (role) {
        userContext.roleName = role.name;
        userContext.roleSlug = role.slug || null;
        userContext.permissions = role.permissions || [];
      }

      if (dbUser?.fullName) {
        userContext.name = dbUser.fullName;
      }

      // Gọi service với context phân quyền của user
      const reply = await geminiService.generateChatResponse(message, userContext);

      return res.status(200).json({
        success: true,
        message: 'Phản hồi từ AI thành công.',
        data: {
          reply: reply
        }
      });
    } catch (error) {
      console.error('[ChatController] Lỗi xử lý tin nhắn chatbot:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xử lý chatbot.',
        error: error.message
      });
    }
  }
}

module.exports = new ChatController();
