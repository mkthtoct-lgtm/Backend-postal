const mongoose = require('mongoose');

const servicePriceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Gắn vào bảng Product đóng vai trò là Service
      required: true,
    },
    priceBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriceBook',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'VND',
      trim: true,
    },
    tax: {
      type: Number,
      default: 0, // Phần trăm hoặc số tiền cố định
    },
    note: {
      type: String,
      default: '',
      trim: true,
    }
  },
  {
    collection: 'service_prices',
    timestamps: true,
  }
);

// Một dịch vụ chỉ xuất hiện 1 lần trong 1 bảng giá
servicePriceSchema.index({ serviceId: 1, priceBookId: 1 }, { unique: true });

module.exports = mongoose.model('ServicePrice', servicePriceSchema);
