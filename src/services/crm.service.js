const env = require('../configs/env');

class CrmService {
  /**
   * Đồng bộ thông tin Lead sang BizFly CRM qua Public Webhook
   * @param {Object} lead - Bản ghi Lead từ MongoDB
   * @returns {Promise<Object>} Trạng thái đồng bộ và thông tin phản hồi từ CRM
   */
  async forwardToBizFly(lead) {
    try {
      const webhookUrl = env.BIZFLY_WEBHOOK_URL;

      // Trích xuất thông tin Cộng tác viên / Người giới thiệu từ database
      let collaborator = null;
      if (lead.collaboratorId) {
        try {
          const User = require('../models/User');
          collaborator = await User.findById(lead.collaboratorId).lean();
        } catch (dbErr) {
          console.error('[CrmService] Lỗi khi truy vấn thông tin CTV từ db:', dbErr.message);
        }
      }

      const collaboratorName = collaborator && collaborator.fullName 
        ? collaborator.fullName 
        : 'Khách đăng ký trực tiếp';
      
      const collaboratorInfo = collaborator && collaborator.fullName
        ? `${collaborator.fullName} (Email: ${collaborator.email || 'N/A'}, SĐT: ${collaborator.phone || 'N/A'})`
        : 'Khách đăng ký trực tiếp';

      const payload = {
        name: lead.customerName,
        fullname: lead.customerName,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        note: lead.note,
        description: `Dịch vụ quan tâm: ${lead.productInterest}. Quốc gia: ${lead.countryInterest}. Ngân sách: ${lead.budgetRange}. Mức độ cấp thiết: ${lead.urgency}. Kênh liên hệ: ${lead.preferredContact}. Ghi chú CTV: ${lead.note}. Người giới thiệu: ${collaboratorInfo}`,

        // Định dạng snake_case
        product_interest: lead.productInterest,
        country_interest: lead.countryInterest,
        budget_range: lead.budgetRange,
        urgency: lead.urgency,
        preferred_contact: lead.preferredContact,
        collaborator_name: collaboratorName,

        // Định dạng camelCase (tương thích với mô tả hướng dẫn ở Frontend và cấu hình mapping CRM cũ)
        customerName: lead.customerName,
        productInterest: lead.productInterest,
        countryInterest: lead.countryInterest,
        budgetRange: lead.budgetRange,
        preferredContact: lead.preferredContact,
        collaboratorName: collaboratorName
      };

      console.log(`[Bizfly CRM] Bắt đầu đẩy lead lên BizFly...`, payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log(`[Bizfly CRM] Phản hồi từ CRM - Status: ${response.status}, Body:`, responseText);

      // Cố gắng giải mã JSON để trích xuất Contact ID từ BizFly nếu có
      try {
        const json = JSON.parse(responseText);
        return {
          success: response.ok,
          bizflyContactId: json.contact_id || json.id || json.data?.id || null,
          rawResponse: json
        };
      } catch {
        return {
          success: response.ok,
          bizflyContactId: null,
          rawResponse: responseText
        };
      }
    } catch (error) {
      console.error('[Bizfly CRM] Lỗi kết nối BizFly CRM Webhook:', error.message);
      return {
        success: false,
        bizflyContactId: null,
        error: error.message
      };
    }
  }
}

module.exports = new CrmService();
