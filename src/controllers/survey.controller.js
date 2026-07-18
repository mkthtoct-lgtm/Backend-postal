const surveyService = require('../services/survey.service');

class SurveyController {
  /** GET /api/surveys */
  async getAll(req, res) {
    try {
      const { status } = req.query;
      const surveys = await surveyService.findAll({ status });
      return res.json({ success: true, data: surveys });
    } catch (error) {
      console.error('Error in getAll surveys:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải danh sách khảo sát.' });
    }
  }

  /** GET /api/surveys/:id */
  async getById(req, res) {
    try {
      const survey = await surveyService.findById(req.params.id);
      if (!survey) return res.status(404).json({ success: false, message: 'Không tìm thấy khảo sát.' });
      return res.json({ success: true, data: survey });
    } catch (error) {
      console.error('Error in getById survey:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async getPublicById(req, res) {
    try {
      const survey = await surveyService.findById(req.params.id);
      if (!survey || survey.status !== 'active') return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại hoặc đã tạm dừng.' });
      return res.json({ success: true, data: survey });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  /** POST /api/surveys */
  async create(req, res) {
    try {
      const { title, kind, baseUrl, description, questions, googleSheetWebhookUrl, status } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khảo sát.' });
      }
      if (kind === 'external' && (!baseUrl || !/^https?:\/\//i.test(baseUrl))) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập link khảo sát bên ngoài hợp lệ.' });
      }
      const survey = await surveyService.create({ title, kind, baseUrl, description, questions, googleSheetWebhookUrl, status });
      return res.status(201).json({ success: true, data: survey });
    } catch (error) {
      console.error('Error creating survey:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo khảo sát.' });
    }
  }

  /** PUT /api/surveys/:id */
  async update(req, res) {
    try {
      const updated = await surveyService.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy khảo sát.' });
      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating survey:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật khảo sát.' });
    }
  }

  /** DELETE /api/surveys/:id */
  async delete(req, res) {
    try {
      const deleted = await surveyService.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy khảo sát.' });
      return res.json({ success: true, message: 'Đã xóa khảo sát.' });
    } catch (error) {
      console.error('Error deleting survey:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa khảo sát.' });
    }
  }

  /** POST /api/surveys/submit — Public endpoint nhận phản hồi khảo sát */
  async submitResponse(req, res) {
    try {
      const { surveyId, surveyTitle, customerName, phone, email, ctvCode, answers } = req.body;
      if (!customerName || !phone) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên và số điện thoại.' });
      }
      const response = await surveyService.submitResponse({
        surveyId, surveyTitle, customerName, phone, email, ctvCode, answers,
      });
      return res.status(201).json({ success: true, data: response });
    } catch (error) {
      console.error('Error submitting survey response:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi phản hồi khảo sát.' });
    }
  }

  /** GET /api/surveys/responses */
  async getResponses(req, res) {
    try {
      const { surveyId, page, limit } = req.query;
      const data = await surveyService.findResponses({
        surveyId,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      });
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting survey responses:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải phản hồi khảo sát.' });
    }
  }
}

module.exports = new SurveyController();
