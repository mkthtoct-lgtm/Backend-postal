const mongoose = require('mongoose');

const courseLeadHistorySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseLead',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Có thể null nếu hệ thống tự tạo (khách hàng tạo mới)
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      default: '',
    }
  },
  {
    timestamps: true, // Tự động tạo createdAt
  }
);

module.exports = mongoose.model('CourseLeadHistory', courseLeadHistorySchema);
