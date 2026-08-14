const mongoose = require('mongoose');

const courseLeadAuditSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    previousStatus: {
      type: String,
      default: '',
    },
    previousProofStatus: {
      type: String,
      default: '',
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  {
    collection: 'courseleadaudits',
    timestamps: true, // Tự động tạo createdAt (deletedAt)
  }
);

module.exports = mongoose.model('CourseLeadAudit', courseLeadAuditSchema);
