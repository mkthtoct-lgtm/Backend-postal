class CrmService {
  /**
   * Đồng bộ thông tin Lead sang BizFly CRM qua Public Webhook
   * @param {Object} lead - Bản ghi Lead từ MongoDB
   * @returns {Promise<Object>} Trạng thái đồng bộ và thông tin phản hồi từ CRM
   */
  async forwardToBizFly(lead) {
    try {
      const webhookUrl = process.env.BIZFLY_WEBHOOK_URL || 'https://crm.bizfly.vn/public-api/public/webhook?id=6a2b72434cee0da9cf07775e&crm_token=c6a5a2b4af9dcb0806470a2ae859234006f2d050&project_id=695b85c8320583313135ddfa';

      const payload = {
        name: lead.customerName,
        fullname: lead.customerName,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        product_interest: lead.productInterest,
        country_interest: lead.countryInterest,
        budget_range: lead.budgetRange,
        urgency: lead.urgency,
        preferred_contact: lead.preferredContact,
        note: lead.note,
        description: `Dịch vụ quan tâm: ${lead.productInterest}. Quốc gia: ${lead.countryInterest}. Ngân sách: ${lead.budgetRange}. Mức độ cấp thiết: ${lead.urgency}. Kênh liên hệ: ${lead.preferredContact}. Ghi chú CTV: ${lead.note}`
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
