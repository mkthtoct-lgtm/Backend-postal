const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentCategory',
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    schoolId: {
      type: String,
      default: null,
    },
    productId: {
      type: String,
      default: null,
    },
    fileUrl: {
      type: String,
      default: '',
      trim: true,
    },
    fileType: {
      type: String,
      default: '',
      trim: true,
    },
    isAiTrainingSource: {
      type: Boolean,
      default: false,
    },
    uploadedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'inactive'],
      default: 'active',
    },
    permissions: {
      view: {
        groups: { type: [String], default: ['all'] },
        roles: { type: [String], default: [] },
        departments: { type: [String], default: [] },
      },
      download: {
        groups: { type: [String], default: ['all'] },
        roles: { type: [String], default: [] },
        departments: { type: [String], default: [] },
      },
      edit: {
        groups: { type: [String], default: ['manager'] },
        roles: { type: [String], default: ['admin', 'truongbophan'] },
        departments: { type: [String], default: [] },
      },
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Tự động tạo và cập nhật các trường createdAt và updatedAt
  }
);

module.exports = mongoose.model('Document', documentSchema, 'documents');
