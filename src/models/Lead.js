const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    collaboratorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      default: 'Website',
      trim: true,
    },
    productInterest: {
      type: String,
      default: 'Du học Đức',
      trim: true,
    },
    countryInterest: {
      type: String,
      default: 'Đức',
      trim: true,
    },
    budgetRange: {
      type: String,
      default: '',
      trim: true,
    },
    urgency: {
      type: String,
      default: 'Trong 1-3 tháng',
      trim: true,
    },
    preferredContact: {
      type: String,
      default: 'Zalo/Điện thoại',
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    bizflyContactId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['dang_tu_van', 'cho_chot_hop_dong', 'xu_ly_ho_so', 'lost'],
      default: 'dang_tu_van',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'leads',
    timestamps: true,
  }
);

// Indexing for faster queries
leadSchema.index({ collaboratorId: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });

module.exports = mongoose.model('Lead', leadSchema);
