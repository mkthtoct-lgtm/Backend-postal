const mongoose = require('mongoose');

const priceBookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      default: null, // null có nghĩa là vô thời hạn cho đến khi có sổ giá mới
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    collection: 'pricebooks',
    timestamps: true,
  }
);

module.exports = mongoose.model('PriceBook', priceBookSchema);
