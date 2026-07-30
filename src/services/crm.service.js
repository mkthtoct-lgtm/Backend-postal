const env = require('../configs/env');
// test 123

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
        if (typeof lead.collaboratorId === 'object' && lead.collaboratorId.fullName) {
          collaborator = lead.collaboratorId;
        } else {
          try {
            const User = require('../models/User');
            collaborator = await User.findById(lead.collaboratorId).lean();
          } catch (dbErr) {
            console.error('[CrmService] Lỗi khi truy vấn thông tin CTV từ db:', dbErr.message);
          }
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

      // 2. Tìm thông tin hoa hồng/đơn hàng nếu có (truy vấn không phân biệt trạng thái để hỗ trợ đồng bộ đối soát)
      let orderInfoText = '';
      let commissionDetails = null;
      try {
        const Commission = require('../models/Commission');
        commissionDetails = await Commission.findOne({ leadId: lead._id }).lean();
        if (commissionDetails) {
          const commStatusMapping = {
            pending: 'Chờ đối soát',
            approved: 'Đã đối soát',
            paid: 'Đã thanh toán',
            cancelled: 'Hủy bỏ'
          };
          const commStatusText = commStatusMapping[commissionDetails.status] || 'Chờ đối soát';
          orderInfoText = `. Giá trị đơn hàng: ${commissionDetails.productPrice.toLocaleString('vi-VN')} VND. Hoa hồng CTV: ${commissionDetails.commissionAmount.toLocaleString('vi-VN')} VND (Tỷ lệ: ${(commissionDetails.commissionRate * 100).toFixed(0)}%). Trạng thái đối soát: ${commStatusText}`;
        }
      } catch (dbErr) {
        console.error('[CrmService] Lỗi khi truy vấn thông tin hoa hồng từ db:', dbErr.message);
      }

      const description = `Trạng thái: ${statusText}${orderInfoText}. Dịch vụ quan tâm: ${lead.productInterest}. Quốc gia: ${lead.countryInterest}. Ngân sách: ${lead.budgetRange}. Mức độ cấp thiết: ${lead.urgency}. Kênh liên hệ: ${lead.preferredContact}. Ghi chú CTV: ${lead.note}. Người giới thiệu: ${collaboratorInfo}`;

      let syncPhone = String(lead.phone || '').trim().replace(/[^0-9+]/g, '');
      if (syncPhone.startsWith('+84')) {
        syncPhone = '0' + syncPhone.slice(3);
      } else if (syncPhone.startsWith('84') && syncPhone.length > 9) {
        syncPhone = '0' + syncPhone.slice(2);
      } else if (/^[1-9][0-9]{8}$/.test(syncPhone)) {
        syncPhone = '0' + syncPhone;
      }

      const payload = {
        name: lead.customerName,
        fullname: lead.customerName,
        phone: syncPhone,
        email: lead.email,
        source: lead.source,
        note: lead.note,
        description,

        // Định dạng snake_case
        status: statusText,
        status_key: lead.status,
        description: `Dịch vụ quan tâm: ${lead.productInterest}. Quốc gia: ${lead.countryInterest}. Ngân sách: ${lead.budgetRange}. Mức độ cấp thiết: ${lead.urgency}. Kênh liên hệ: ${lead.preferredContact}. Ghi chú CTV: ${lead.note}. Người giới thiệu: ${collaboratorInfo}`,

        // Định dạng snake_case
        product_interest: lead.productInterest,
        country_interest: lead.countryInterest,
        budget_range: lead.budgetRange,
        urgency: lead.urgency,
        preferred_contact: lead.preferredContact,
        collaborator_name: collaboratorName,
        product_price: commissionDetails ? commissionDetails.productPrice : 0,
        commission_amount: commissionDetails ? commissionDetails.commissionAmount : 0,
        commission_rate: commissionDetails ? commissionDetails.commissionRate : 0,
        commission_status: commissionDetails ? commissionDetails.status : null,

        // Định dạng camelCase (tương thích với mô tả hướng dẫn ở Frontend và cấu hình mapping CRM cũ)
        customerName: lead.customerName,
        productInterest: lead.productInterest,
        countryInterest: lead.countryInterest,
        budgetRange: lead.budgetRange,
        preferredContact: lead.preferredContact,
        collaboratorName: collaboratorName,
        statusKey: lead.status,
        productPrice: commissionDetails ? commissionDetails.productPrice : 0,
        commissionAmount: commissionDetails ? commissionDetails.commissionAmount : 0,
        commissionStatus: commissionDetails ? commissionDetails.status : null
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
