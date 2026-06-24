const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../configs/env');

class GeminiService {
  /**
   * Tạo câu trả lời từ chatbot sử dụng mô hình Gemini 1.5 Flash
   * @param {string} message - Tin nhắn từ người dùng
   * @returns {Promise<string>} Phản hồi dạng văn bản từ AI
   */
  async generateChatResponse(message) {
    try {
      if (!env.GEMINI_API_KEY) {
        throw new Error('Chưa cấu hình GEMINI_API_KEY trong file cấu hình env');
      }

      // Khởi tạo đối tượng GoogleGenerativeAI với API Key từ config tập trung
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      
      // Sử dụng mô hình gemini-1.5-flash để đảm bảo phản hồi nhanh chóng
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
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
