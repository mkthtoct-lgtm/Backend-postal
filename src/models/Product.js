const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Loại sản phẩm: tương ứng với PRODUCT_TYPES ở FE
    type: {
      type: String,
      enum: ['duhocduc', 'dinhcu', 'visa', 'daotaongonngu', 'nophosoonline'],
      required: true,
      default: 'duhocduc',
    },
    // Trạng thái hiển thị
    status: {
      type: String,
      enum: ['Đang mở', 'Tạm dừng', 'Đã đóng'],
      default: 'Đang mở',
    },
    // Mô tả tổng quan sản phẩm
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Danh sách điều kiện tham gia (mảng string)
    conditions: {
      type: [String],
      default: [],
    },
    // Danh sách hạng mục chi phí [{name, amount}]
    costs: {
      type: [
        {
          name: { type: String, trim: true },
          amount: { type: String, trim: true },
        },
      ],
      default: [],
    },
    // Danh sách các bước quy trình (mảng string)
    process: {
      type: [String],
      default: [],
    },
    // Xóa mềm: ghi lại thời điểm xóa, null nghĩa là chưa xóa
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'products',
    timestamps: true, // Tự động quản lý createdAt và updatedAt
  }
);

module.exports = mongoose.model('Product', productSchema);
