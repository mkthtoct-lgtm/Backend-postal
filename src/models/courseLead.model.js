const mongoose = require('mongoose');

const courseLeadSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'ID Khóa học là bắt buộc'],
    },
    courseNameSnapshot: {
      type: String,
      required: [true, 'Tên khóa học (snapshot) là bắt buộc'],
    },
    customerName: {
      type: String,
      required: [true, 'Tên khách hàng là bắt buộc'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    normalizedPhone: {
      type: String,
      required: [true, 'Số điện thoại chuẩn hóa là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'NEW',
        'ASSIGNED',
        'PROCESSING',
        'COMPLETED_PENDING_PROOF',
        'COMPLETED',
        'REJECTED',
        'SPAM',
        'CANCELLED',
        'NO_RESPONSE'
      ],
      default: 'NEW',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: { type: Date, default: null },
    firstContactAt: { type: Date, default: null },
    processingAt: { type: Date, default: null },
    
    proofStatus: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NOT_SUBMITTED',
    },
    proofFiles: [{
      type: String, // Có thể lưu URL hoặc File ID
    }],
    
    completedAt: { type: Date, default: null },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    
    source: { type: String, default: 'website' },
    
    spamFlag: { type: Boolean, default: false },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseLead',
      default: null,
    },
    
    submissionCount: { type: Number, default: 1 },
    lastSubmittedAt: { type: Date, default: Date.now },
    
    // Quản lý rác / Lưu trữ
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    archiveReason: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Indexes để query nhanh cho màn hình Sale/Admin
courseLeadSchema.index({ status: 1 });
courseLeadSchema.index({ assignedTo: 1 });
courseLeadSchema.index({ normalizedPhone: 1, courseId: 1 });
courseLeadSchema.index({ createdAt: -1 });
courseLeadSchema.index({ isArchived: 1 });

module.exports = mongoose.model('CourseLead', courseLeadSchema);
