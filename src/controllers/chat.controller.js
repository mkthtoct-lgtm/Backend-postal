const geminiService = require('../services/gemini.service');

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

      // Gọi service để lấy câu trả lời của AI
      const reply = await geminiService.generateChatResponse(message);

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
