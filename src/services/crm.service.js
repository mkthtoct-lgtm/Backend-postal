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

      // 1. Phân dịch Trạng thái đơn hàng sang tiếng Việt
      const statusMapping = {
        dang_tu_van: 'Đang tư vấn',
        cho_chot_hop_dong: 'Chờ chốt hợp đồng',
        xu_ly_ho_so: 'Xử lý hồ sơ (Chốt thành công)',
        lost: 'Thất bại (Lost)'
      };
      const statusText = statusMapping[lead.status] || 'Đang tư vấn';

      // 2. Tìm thông tin hoa hồng/đơn hàng nếu có
      let orderInfoText = '';
      let commissionDetails = null;
      if (lead.status === 'xu_ly_ho_so') {
        try {
          const Commission = require('../models/Commission');
          commissionDetails = await Commission.findOne({ leadId: lead._id }).lean();
          if (commissionDetails) {
            orderInfoText = `. Giá trị đơn hàng: ${commissionDetails.productPrice.toLocaleString('vi-VN')} VND. Hoa hồng CTV: ${commissionDetails.commissionAmount.toLocaleString('vi-VN')} VND (Tỷ lệ: ${(commissionDetails.commissionRate * 100).toFixed(0)}%)`;
          }
        } catch (dbErr) {
          console.error('[CrmService] Lỗi khi truy vấn thông tin hoa hồng từ db:', dbErr.message);
        }
      }

      const description = `Trạng thái: ${statusText}${orderInfoText}. Dịch vụ quan tâm: ${lead.productInterest}. Quốc gia: ${lead.countryInterest}. Ngân sách: ${lead.budgetRange}. Mức độ cấp thiết: ${lead.urgency}. Kênh liên hệ: ${lead.preferredContact}. Ghi chú CTV: ${lead.note}. Người giới thiệu: ${collaboratorInfo}`;

      const payload = {
        name: lead.customerName,
        fullname: lead.customerName,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        note: lead.note,
        description,

        // Định dạng snake_case
        status: statusText,
        status_key: lead.status,
        product_interest: lead.productInterest,
        country_interest: lead.countryInterest,
        budget_range: lead.budgetRange,
        urgency: lead.urgency,
        preferred_contact: lead.preferredContact,
        collaborator_name: collaboratorName,
        product_price: commissionDetails ? commissionDetails.productPrice : 0,
        commission_amount: commissionDetails ? commissionDetails.commissionAmount : 0,
        commission_rate: commissionDetails ? commissionDetails.commissionRate : 0,

        // Định dạng camelCase (tương thích với mô tả hướng dẫn ở Frontend và cấu hình mapping CRM cũ)
        customerName: lead.customerName,
        productInterest: lead.productInterest,
        countryInterest: lead.countryInterest,
        budgetRange: lead.budgetRange,
        preferredContact: lead.preferredContact,
        collaboratorName: collaboratorName,
        statusKey: lead.status,
        productPrice: commissionDetails ? commissionDetails.productPrice : 0,
        commissionAmount: commissionDetails ? commissionDetails.commissionAmount : 0
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
