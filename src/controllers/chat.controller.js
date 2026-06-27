const geminiService = require('../services/gemini.service');
const Role = require('../models/Role');

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
        name: req.user.name || 'Nhân viên',
        email: req.user.email || '',
        roleId: req.user.roleId || null,
        roleName: 'Nhân viên',
        permissions: []
      };

      if (userContext.roleId) {
        const role = await Role.findById(userContext.roleId).lean();
        if (role) {
          userContext.roleName = role.name;
          userContext.permissions = role.permissions || [];
        }
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
