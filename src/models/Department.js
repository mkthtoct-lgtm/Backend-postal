const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
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
    // Ẩn phòng ban thay vì xóa cứng để giữ lịch sử liên kết
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Tự động tạo và cập nhật createdAt, updatedAt
  }
);

module.exports = mongoose.model('Department', departmentSchema, 'departments');
