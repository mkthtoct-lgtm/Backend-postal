const mongoose = require('mongoose');

const documentCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model('DocumentCategory', documentCategorySchema, 'document_categories');
