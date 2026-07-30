const Lead = require('../models/Lead');
const mailService = require('./mail.service');
const auditLogService = require('./auditLog.service');
const systemSettingService = require('./systemSetting.service');
const automationService = require('./automation.service');
const env = require('../configs/env');

const MARKETING_SETTING_KEY = 'marketing_automation_config';

const DEFAULT_MARKETING_CONFIG = {
  // Công tắc tổng: tắt sẽ dừng toàn bộ marketing automation bên dưới
  enabled: true,
  // Chăm sóc (nurture) khách hàng đang trong quá trình tư vấn bằng 2 email
  // động viên/thông tin hữu ích, giúp khách không cảm thấy bị "bỏ rơi"
  nurtureEnabled: true,
  nurtureFirstDays: 2,
  nurtureSecondDays: 5,
  // Gửi email cảm ơn khi deal chốt thành công (chỉ gửi 1 lần/lead)
  thankYouEnabled: true,
  // Gửi email "tái kết nối" 1 lần cho lead đã đóng thất bại sau X ngày
  winBackEnabled: true,
  winBackDays: 45,
  // Gửi bản tin (newsletter) tự động khi có tin tức/sự kiện mới - mặc định
  // TẮT vì đây là gửi hàng loạt, cần Admin chủ động bật sau khi hiểu rõ.
  newsletterBroadcastEnabled: false,
  // Giới hạn an toàn số người nhận mỗi lần gửi bản tin (tránh gửi ồ ạt ngoài ý muốn)
  newsletterMaxRecipients: 500,
};

class MarketingAutomationService {
  // ==========================================================
  // CẤU HÌNH
  // ==========================================================

  async getConfig() {
    const stored = await systemSettingService.getSetting(MARKETING_SETTING_KEY, DEFAULT_MARKETING_CONFIG);
    return { ...DEFAULT_MARKETING_CONFIG, ...(stored || {}) };
  }

  async updateConfig(partial = {}) {
    const current = await this.getConfig();

    const toBool = (value, fallback) => (value !== undefined ? !!value : fallback);
    const toPositiveNumber = (value, fallback) => {
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : fallback;
    };

    const merged = {
      enabled: toBool(partial.enabled, current.enabled),
      nurtureEnabled: toBool(partial.nurtureEnabled, current.nurtureEnabled),
      nurtureFirstDays: toPositiveNumber(partial.nurtureFirstDays, current.nurtureFirstDays),
      nurtureSecondDays: toPositiveNumber(partial.nurtureSecondDays, current.nurtureSecondDays),
      thankYouEnabled: toBool(partial.thankYouEnabled, current.thankYouEnabled),
      winBackEnabled: toBool(partial.winBackEnabled, current.winBackEnabled),
      winBackDays: toPositiveNumber(partial.winBackDays, current.winBackDays),
      newsletterBroadcastEnabled: toBool(partial.newsletterBroadcastEnabled, current.newsletterBroadcastEnabled),
      newsletterMaxRecipients: toPositiveNumber(partial.newsletterMaxRecipients, current.newsletterMaxRecipients),
    };

    // Đảm bảo mốc "day5" luôn diễn ra sau mốc "day2" để tránh cấu hình sai
    if (merged.nurtureSecondDays <= merged.nurtureFirstDays) {
      merged.nurtureSecondDays = merged.nurtureFirstDays + 1;
    }

    await systemSettingService.updateSetting(MARKETING_SETTING_KEY, merged);
    return merged;
  }

  // ==========================================================
  // TIỆN ÍCH
  // ==========================================================

  /**
   * Xây dựng đường dẫn hủy nhận email marketing cho 1 lead cụ thể (public,
   * không cần đăng nhập vì đây là hành động tự phục vụ tiêu chuẩn của email
   * marketing, rủi ro thấp - chỉ ảnh hưởng tới việc nhận email quảng bá).
   */
  getUnsubscribeUrl(leadId) {
    const base = (env.BACKEND_URL && env.BACKEND_URL.trim()) || 'https://api.hto.edu.vn';
    return `${base.replace(/\/+$/, '')}/api/v1/marketing/unsubscribe/${leadId}`;
  }

  // ==========================================================
  // 1. CHĂM SÓC (NURTURE) LEAD ĐANG TƯ VẤN
  // ==========================================================

  async runNurtureDrip() {
    const config = await this.getConfig();
    if (!config.enabled || !config.nurtureEnabled) {
      return { day2Sent: 0, day5Sent: 0 };
    }

    const now = Date.now();
    const day2Threshold = new Date(now - config.nurtureFirstDays * 24 * 60 * 60 * 1000);
    const day5Threshold = new Date(now - config.nurtureSecondDays * 24 * 60 * 60 * 1000);

    let day2Sent = 0;
    let day5Sent = 0;

    // ---- Mốc thứ nhất (mặc định: ngày 2) ----
    const day2Leads = await Lead.find({
      deletedAt: null,
      status: 'dang_tu_van',
      marketingOptOut: false,
      email: { $nin: [null, ''] },
      nurtureStage: null,
      createdAt: { $lte: day2Threshold },
    }).limit(300);

    for (const lead of day2Leads) {
      try {
        const unsubscribeUrl = this.getUnsubscribeUrl(lead._id);
        await mailService.sendNurtureEmail(lead.email, lead.customerName, 'day2', unsubscribeUrl);
        await Lead.findByIdAndUpdate(lead._id, {
          $set: { nurtureStage: 'day2', nurtureLastSentAt: new Date() },
        });
        day2Sent += 1;
      } catch (error) {
        console.error(`[MarketingAutomationService] Lỗi khi gửi email chăm sóc ngày 2 cho lead ${lead._id}:`, error.message);
      }
    }

    // ---- Mốc thứ hai (mặc định: ngày 5) ----
    const day5Leads = await Lead.find({
      deletedAt: null,
      status: 'dang_tu_van',
      marketingOptOut: false,
      email: { $nin: [null, ''] },
      nurtureStage: 'day2',
      createdAt: { $lte: day5Threshold },
    }).limit(300);

    for (const lead of day5Leads) {
      try {
        const unsubscribeUrl = this.getUnsubscribeUrl(lead._id);
        await mailService.sendNurtureEmail(lead.email, lead.customerName, 'day5', unsubscribeUrl);
        await Lead.findByIdAndUpdate(lead._id, {
          $set: { nurtureStage: 'day5', nurtureLastSentAt: new Date() },
        });
        day5Sent += 1;
      } catch (error) {
        console.error(`[MarketingAutomationService] Lỗi khi gửi email chăm sóc ngày 5 cho lead ${lead._id}:`, error.message);
      }
    }

    if (day2Sent > 0 || day5Sent > 0) {
      await auditLogService.log(
        await automationService.getSystemActorId(),
        'marketing.nurture.sent',
        { type: 'lead_batch', id: 'batch', name: `${day2Sent + day5Sent} lead(s)` },
        { day2Sent, day5Sent }
      );
    }

    return { day2Sent, day5Sent };
  }

  // ==========================================================
  // 2. CẢM ƠN KHI DEAL CHỐT THÀNH CÔNG
  // ==========================================================

  /**
   * Gọi khi 1 lead chuyển sang trạng thái 'xu_ly_ho_so' (deal thành công).
   * Gửi email cảm ơn đúng 1 lần duy nhất cho mỗi lead.
   * @param {import('mongoose').Document} lead
   */
  async sendThankYouOnConversion(lead) {
    const config = await this.getConfig();
    if (!config.enabled || !config.thankYouEnabled) return;
    if (!lead || !lead.email || lead.thankYouSentAt) return;
    if (lead.marketingOptOut) return;

    try {
      const unsubscribeUrl = this.getUnsubscribeUrl(lead._id);
      await mailService.sendThankYouEmail(lead.email, lead.customerName, unsubscribeUrl);
      await Lead.findByIdAndUpdate(lead._id, { $set: { thankYouSentAt: new Date() } });

      await auditLogService.log(
        await automationService.getSystemActorId(),
        'marketing.thankyou.sent',
        { type: 'lead', id: lead._id.toString(), name: lead.customerName },
        {}
      );
    } catch (error) {
      console.error(`[MarketingAutomationService] Lỗi khi gửi email cảm ơn cho lead ${lead._id}:`, error.message);
    }
  }

  // ==========================================================
  // 3. TÁI KẾT NỐI (WIN-BACK) LEAD ĐÃ THẤT BẠI
  // ==========================================================

  async runWinBackSweep() {
    const config = await this.getConfig();
    if (!config.enabled || !config.winBackEnabled) {
      return { sent: 0 };
    }

    const threshold = new Date(Date.now() - config.winBackDays * 24 * 60 * 60 * 1000);
    const eligibleLeads = await Lead.find({
      deletedAt: null,
      status: 'lost',
      marketingOptOut: false,
      email: { $nin: [null, ''] },
      winBackSentAt: null,
      updatedAt: { $lte: threshold },
    }).limit(300);

    let sent = 0;
    for (const lead of eligibleLeads) {
      try {
        const unsubscribeUrl = this.getUnsubscribeUrl(lead._id);
        await mailService.sendWinBackEmail(lead.email, lead.customerName, unsubscribeUrl);
        await Lead.findByIdAndUpdate(lead._id, { $set: { winBackSentAt: new Date() } });
        sent += 1;
      } catch (error) {
        console.error(`[MarketingAutomationService] Lỗi khi gửi email tái kết nối cho lead ${lead._id}:`, error.message);
      }
    }

    if (sent > 0) {
      await auditLogService.log(
        await automationService.getSystemActorId(),
        'marketing.winback.sent',
        { type: 'lead_batch', id: 'batch', name: `${sent} lead(s)` },
        { sent, winBackDays: config.winBackDays }
      );
    }

    return { sent };
  }

  // ==========================================================
  // 4. BẢN TIN (NEWSLETTER) TỰ ĐỘNG KHI CÓ TIN TỨC/SỰ KIỆN MỚI
  // ==========================================================

  /**
   * Gọi khi Admin/BGĐ tạo một tin tức hoặc sự kiện mới. Gửi email tóm tắt
   * cho danh sách khách hàng đang hoạt động (có email, chưa hủy nhận bản
   * tin). Tự động loại trùng theo email vì 1 khách có thể có nhiều lead.
   * @param {Object} newsPost - { _id, title, summary, type }
   */
  async broadcastNewsletter(newsPost) {
    const config = await this.getConfig();
    if (!config.enabled || !config.newsletterBroadcastEnabled) {
      return { sent: 0 };
    }
    if (!newsPost || !newsPost.title) return { sent: 0 };

    try {
      const recipients = await Lead.aggregate([
        {
          $match: {
            deletedAt: null,
            marketingOptOut: false,
            email: { $nin: [null, ''] },
          },
        },
        {
          $group: {
            _id: '$email',
            leadId: { $first: '$_id' },
            customerName: { $first: '$customerName' },
          },
        },
        { $limit: config.newsletterMaxRecipients },
      ]);

      let sent = 0;
      for (const recipient of recipients) {
        const unsubscribeUrl = this.getUnsubscribeUrl(recipient.leadId);
        mailService
          .sendNewsletterEmail(recipient._id, recipient.customerName, newsPost, unsubscribeUrl)
          .catch(() => {});
        sent += 1;
      }

      await auditLogService.log(
        await automationService.getSystemActorId(),
        'marketing.newsletter.broadcast',
        { type: 'news_post', id: newsPost._id ? newsPost._id.toString() : 'unknown', name: newsPost.title },
        { recipientCount: sent }
      );

      return { sent };
    } catch (error) {
      console.error('[MarketingAutomationService] Lỗi khi gửi bản tin newsletter:', error.message);
      return { sent: 0 };
    }
  }

  // ==========================================================
  // HỦY NHẬN EMAIL MARKETING (public, tự phục vụ)
  // ==========================================================

  /**
   * Đánh dấu KHÔNG gửi email marketing nữa cho toàn bộ lead có cùng email
   * với lead được click hủy (vì 1 khách có thể có nhiều lead theo thời gian).
   * @param {string} leadId
   * @returns {Promise<{success: boolean, email?: string}>}
   */
  async unsubscribeByLeadId(leadId) {
    const lead = await Lead.findById(leadId).lean();
    if (!lead) {
      return { success: false };
    }

    if (lead.email) {
      await Lead.updateMany(
        { email: lead.email },
        { $set: { marketingOptOut: true, marketingOptOutAt: new Date() } }
      );
    } else {
      await Lead.findByIdAndUpdate(leadId, {
        $set: { marketingOptOut: true, marketingOptOutAt: new Date() },
      });
    }

    return { success: true, email: lead.email };
  }

  // ==========================================================
  // TỔNG QUAN & CHẠY THỦ CÔNG
  // ==========================================================

  async getOverview() {
    const config = await this.getConfig();
    const day2Threshold = new Date(Date.now() - config.nurtureFirstDays * 24 * 60 * 60 * 1000);
    const day5Threshold = new Date(Date.now() - config.nurtureSecondDays * 24 * 60 * 60 * 1000);
    const winBackThreshold = new Date(Date.now() - config.winBackDays * 24 * 60 * 60 * 1000);

    const [pendingDay2, pendingDay5, pendingWinBack, optedOutTotal, thankYouSentTotal] = await Promise.all([
      Lead.countDocuments({
        deletedAt: null,
        status: 'dang_tu_van',
        marketingOptOut: false,
        email: { $nin: [null, ''] },
        nurtureStage: null,
        createdAt: { $lte: day2Threshold },
      }),
      Lead.countDocuments({
        deletedAt: null,
        status: 'dang_tu_van',
        marketingOptOut: false,
        email: { $nin: [null, ''] },
        nurtureStage: 'day2',
        createdAt: { $lte: day5Threshold },
      }),
      Lead.countDocuments({
        deletedAt: null,
        status: 'lost',
        marketingOptOut: false,
        email: { $nin: [null, ''] },
        winBackSentAt: null,
        updatedAt: { $lte: winBackThreshold },
      }),
      Lead.countDocuments({ marketingOptOut: true }),
      Lead.countDocuments({ thankYouSentAt: { $ne: null } }),
    ]);

    return {
      config,
      stats: {
        pendingNurtureDay2: pendingDay2,
        pendingNurtureDay5: pendingDay5,
        pendingWinBack,
        optedOutTotal,
        thankYouSentTotal,
      },
    };
  }

  /**
   * Chạy toàn bộ tác vụ marketing automation ngay lập tức (dùng cho nút
   * "Chạy kiểm tra ngay" của Admin, hoặc job nền định kỳ). Không bao gồm
   * broadcastNewsletter vì đó là hành động gắn với 1 bài viết cụ thể, không
   * phải một lượt quét định kỳ.
   */
  async runFullCheck() {
    const nurtureResult = await this.runNurtureDrip();
    const winBackResult = await this.runWinBackSweep();

    return { nurtureResult, winBackResult };
  }
}

module.exports = new MarketingAutomationService();
