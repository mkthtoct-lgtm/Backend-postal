const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    permissions: {
      type: [String],
      default: [], // Mảng chứa các quyền dạng: ['departments:read', 'users:write'] hoặc ['*'] cho Admin
    },
    description: {
      type: String,
      default: null,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
  }
);

module.exports = mongoose.model('Role', roleSchema);
