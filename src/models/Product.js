const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Danh mục sản phẩm (ObjectId tham chiếu ProductCategory)
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      default: null,
    },
    // Quốc gia (mã ISO hoặc "ALL")
    country: {
      type: String,
      default: '',
      trim: true,
    },
    // Trạng thái hiển thị — dùng isActive thay vì deletedAt để khớp DB thực tế
    isActive: {
      type: Boolean,
      default: true,
    },
    // Mô tả tổng quan sản phẩm
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Danh sách điều kiện / yêu cầu tham gia
    requirements: {
      type: [
        {
          criteriaType: { type: String, trim: true },
          criteriaValue: { type: String, trim: true },
          displayOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    // Danh sách hạng mục chi phí
    costs: {
      type: [
        {
          itemName: { type: String, trim: true },
          amount: { type: Number, default: 0 },
          currency: { type: String, default: 'VND', trim: true },
          note: { type: String, default: '', trim: true },
          displayOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    // Danh sách các bước quy trình xử lý hồ sơ
    steps: {
      type: [
        {
          stepOrder: { type: Number, default: 0 },
          stepName: { type: String, trim: true },
          description: { type: String, default: '', trim: true },
          estimatedDuration: { type: String, default: '', trim: true },
        },
      ],
      default: [],
    },
    // Chi phí dịch vụ (số tiền đơn giản, giữ lại để tương thích)
    serviceFee: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'VND',
      trim: true,
    },
    // Ảnh đại diện sản phẩm
    image: {
      type: String,
      default: '',
      trim: true,
    },
    // Xóa mềm: giữ lại để tương thích với code mới, null = chưa xóa
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'products',
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);