const aiConfigService = require('../services/aiConfig.service');

class AiConfigController {
  /**
   * Lấy cấu hình AI
   */
  async getAIConfig(req, res) {
    try {
      const config = await aiConfigService.getAIConfig();
      return res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('[AiConfigController] Lỗi getAIConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải cấu hình AI.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật cấu hình AI
   */
  async updateAIConfig(req, res) {
    try {
      const config = await aiConfigService.updateAIConfig(req.body);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình AI thành công.',
        data: config,
      });
    } catch (error) {
      console.error('[AiConfigController] Lỗi updateAIConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lưu cấu hình AI.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy các nhóm tài liệu huấn luyện AI
   */
  async getDocumentGroups(req, res) {
    try {
      const groups = await aiConfigService.getDocumentGroups();
      return res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      console.error('[AiConfigController] Lỗi getDocumentGroups:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải các nhóm tài liệu AI.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy danh sách các câu hỏi pending chờ xử lý
   */
  async getPendingQuestions(req, res) {
    try {
      const questions = await aiConfigService.getPendingQuestions();
      return res.status(200).json({
        success: true,
        data: questions,
      });
    } catch (error) {
      console.error('[AiConfigController] Lỗi getPendingQuestions:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách câu hỏi pending.',
        error: error.message,
      });
    }
  }

  /**
   * Trả lời câu hỏi pending
   */
  async resolveQuestion(req, res) {
    try {
      const { id } = req.params;
      const updatedQuestion = await aiConfigService.resolveQuestion(id, req.body);

      if (!updatedQuestion) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy câu hỏi pending.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã lưu phản hồi câu hỏi pending thành công.',
        data: updatedQuestion,
      });
    } catch (error) {
      console.error('[AiConfigController] Lỗi resolveQuestion:', error);
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi phản hồi câu hỏi pending.',
        error: error.message,
      });
    }
  }

  /**
   * Đánh dấu câu hỏi pending đang xem/reviewing
   */
  async markQuestionReviewing(req, res) {
    try {
      const { id } = req.params;
      const updatedQuestion = await aiConfigService.updateQuestionStatus(id, 'reviewing');

      if (!updatedQuestion) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy câu hỏi pending.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã đánh dấu câu hỏi đang xem.',
        data: updatedQuestion,
      });
    } catch (error) {
      console.error('[AiConfigController] Lỗi markQuestionReviewing:', error);
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật trạng thái câu hỏi.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy lịch sử hội thoại của AI
   */
  async getHistory(req, res) {
    try {
      // Tạm thời trả về mảng rỗng để không bị lỗi trên UI
      return res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      console.error('[AiConfigController] Lỗi getHistory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải lịch sử AI.',
        error: error.message,
      });
    }
  }
}

module.exports = new AiConfigController();
