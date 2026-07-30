const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    collaboratorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      default: 'Website',
      trim: true,
    },
    productInterest: {
      type: String,
      default: 'Du học Đức',
      trim: true,
    },
    countryInterest: {
      type: String,
      default: 'Đức',
      trim: true,
    },
    budgetRange: {
      type: String,
      default: '',
      trim: true,
    },
    urgency: {
      type: String,
      default: 'Trong 1-3 tháng',
      trim: true,
    },
    preferredContact: {
      type: String,
      default: 'Zalo/Điện thoại',
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    bizflyContactId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['dang_tu_van', 'cho_chot_hop_dong', 'xu_ly_ho_so', 'lost'],
      default: 'dang_tu_van',
    },
    cccdFolderId: {
      type: String,
      default: null,
    },
    cccdFrontFileId: {
      type: String,
      default: null,
    },
    cccdFrontUrl: {
      type: String,
      default: null,
    },
    cccdBackFileId: {
      type: String,
      default: null,
    },
    cccdBackUrl: {
      type: String,
      default: null,
    },

    // ==== CRM AUTOMATION (rule-based, không dùng AI) ====
    // Nhân sự nội bộ được hệ thống tự động phân công theo dõi/chăm sóc lead này.
    // Tách biệt hoàn toàn với collaboratorId (CTV giới thiệu hưởng hoa hồng) để
    // không làm sai lệch dữ liệu tính hoa hồng.
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    autoAssigned: {
      type: Boolean,
      default: false,
    },
    // Đánh dấu lead này trùng với một lead đang hoạt động khác (cùng SĐT/email)
    // được hệ thống tự động phát hiện khi tạo mới.
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOfLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    // Mốc nhắc nhở tự động gần nhất đã gửi cho lead này, dùng để tránh gửi
    // trùng lặp nhiều lần cho cùng 1 mốc (vd: 'stale', 'auto_lost').
    lastReminderStage: {
      type: String,
      default: null,
    },
    lastReminderAt: {
      type: Date,
      default: null,
    },
    // Thời điểm hệ thống tự động chuyển trạng thái sang 'lost' do quá hạn
    // không tương tác (null nếu chưa từng bị tự động đóng).
    autoLostAt: {
      type: Date,
      default: null,
    },
    // Thời điểm đã gửi email xác nhận tiếp nhận thông tin cho khách hàng.
    confirmationSentAt: {
      type: Date,
      default: null,
    },

    // ==== MARKETING AUTOMATION (chăm sóc & giữ chân khách hàng) ====
    // Khách hàng chủ động từ chối nhận email marketing/bản tin (vẫn nhận được
    // các email giao dịch cần thiết như xác nhận lead, không bị ảnh hưởng).
    marketingOptOut: {
      type: Boolean,
      default: false,
    },
    marketingOptOutAt: {
      type: Date,
      default: null,
    },
    // Mốc chăm sóc (nurture) gần nhất đã gửi cho lead đang trong quá trình tư
    // vấn, vd: 'day2', 'day5' - tránh gửi trùng hoặc gửi sai thứ tự.
    nurtureStage: {
      type: String,
      default: null,
    },
    nurtureLastSentAt: {
      type: Date,
      default: null,
    },
    // Thời điểm đã gửi email cảm ơn khi deal chốt thành công (chỉ gửi 1 lần).
    thankYouSentAt: {
      type: Date,
      default: null,
    },
    // Thời điểm đã gửi email "tái kết nối" (win-back) sau khi lead bị đóng vì
    // thất bại, giúp khách hàng có cơ hội quay lại nếu thay đổi ý định.
    winBackSentAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'leads',
    timestamps: true,
  }
);

// Indexing for faster queries
leadSchema.index({ collaboratorId: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedStaffId: 1 });
leadSchema.index({ status: 1, updatedAt: 1 });
leadSchema.index({ isDuplicate: 1 });
leadSchema.index({ marketingOptOut: 1 });

module.exports = mongoose.model('Lead', leadSchema);
