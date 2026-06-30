const mongoose = require('mongoose');

const sopSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'Chưa phân nhóm',
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    ownerName: {
      type: String,
      default: '',
      trim: true,
    },
    version: {
      type: String,
      default: 'v1.0',
      trim: true,
    },
    status: {
      type: String,
      enum: ['published', 'reviewing', 'draft', 'archived'],
      default: 'draft',
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    allowedRoles: {
      type: [String],
      default: ['all'],
    },
    tags: {
      type: [String],
      default: [],
    },
    conditions: {
      type: [String],
      default: [],
    },
    steps: {
      type: [String],
      default: [],
    },
    relatedDocs: {
      type: [
        {
          id: { type: String, trim: true },
          title: { type: String, trim: true },
          type: { type: String, trim: true },
          url: { type: String, trim: true },
        },
      ],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'sops',
    timestamps: true,
  }
);

sopSchema.index({ code: 1 });
sopSchema.index({ category: 1 });
sopSchema.index({ department: 1 });

module.exports = mongoose.model('Sop', sopSchema);
