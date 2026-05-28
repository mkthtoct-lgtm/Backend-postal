const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
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

module.exports = mongoose.model('ProductCategory', productCategorySchema, 'product_categories');
