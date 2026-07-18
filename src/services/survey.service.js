const Survey = require('../models/Survey');
const SurveyResponse = require('../models/SurveyResponse');

class SurveyService {
  /**
   * Lấy danh sách khảo sát (chưa xóa mềm)
   */
  async findAll({ status } = {}) {
    const query = { deletedAt: null };
    if (status && status !== 'all') {
      query.status = status;
    }
    return Survey.find(query).sort({ createdAt: -1 }).lean();
  }

  /**
   * Lấy một khảo sát theo ID
   */
  async findById(id) {
    return Survey.findOne({ _id: id, deletedAt: null }).lean();
  }

  /**
   * Tạo khảo sát mới
   */
  async create(data) {
    const survey = new Survey({
      title: data.title,
      baseUrl: data.baseUrl,
      googleSheetWebhookUrl: data.googleSheetWebhookUrl || '',
      status: data.status || 'active',
    });
    return survey.save();
  }

  /**
   * Cập nhật khảo sát
   */
  async update(id, data) {
    const update = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.baseUrl !== undefined) update.baseUrl = data.baseUrl;
    if (data.googleSheetWebhookUrl !== undefined) update.googleSheetWebhookUrl = data.googleSheetWebhookUrl;
    if (data.status !== undefined) update.status = data.status;

    return Survey.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: update },
      { new: true, lean: true }
    );
  }

  /**
   * Xóa mềm khảo sát
   */
  async delete(id) {
    return Survey.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true, lean: true }
    );
  }

  /**
   * Ghi nhận phản hồi khảo sát và đẩy lên Google Sheet
   */
  async submitResponse(data) {
    // Tìm khảo sát tương ứng (nếu có surveyId)
    let survey = null;
    if (data.surveyId) {
      survey = await Survey.findById(data.surveyId).lean();
    }

    // Lưu vào MongoDB
    const response = new SurveyResponse({
      surveyId: data.surveyId || null,
      surveyTitle: data.surveyTitle || survey?.title || '',
      customerName: data.customerName,
      phone: data.phone,
      email: data.email || '',
      ctvCode: data.ctvCode || '',
      answers: data.answers || {},
      submittedAt: data.submittedAt || new Date(),
    });
    await response.save();

    // Đẩy lên Google Sheet nếu có cấu hình webhook
    const webhookUrl = data.googleSheetWebhookUrl || survey?.googleSheetWebhookUrl;
    if (webhookUrl) {
      try {
        const payload = {
          surveyTitle: response.surveyTitle,
          customerName: response.customerName,
          phone: response.phone,
          email: response.email,
          ctvCode: response.ctvCode,
          answers: response.answers,
          submittedAt: response.submittedAt.toISOString(),
        };

        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          response.sheetSynced = true;
          await response.save();
        } else {
          console.error('[SurveyService] Google Sheet webhook returned non-OK status:', res.status);
        }
      } catch (err) {
        console.error('[SurveyService] Error sending to Google Sheet webhook:', err.message);
      }
    }

    return response.toObject();
  }

  /**
   * Lấy danh sách phản hồi khảo sát (cho Admin)
   */
  async findResponses({ surveyId, page = 1, limit = 20 } = {}) {
    const query = {};
    if (surveyId) query.surveyId = surveyId;

    const total = await SurveyResponse.countDocuments(query);
    const responses = await SurveyResponse.find(query)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { responses, total, pages: Math.ceil(total / limit) };
  }
}

module.exports = new SurveyService();
