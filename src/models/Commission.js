const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    collaboratorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    productInterest: {
      type: String,
      required: true,
    },
    productPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    collaboratorRank: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Daimion', 'Master'],
      required: true,
      default: 'Bronze',
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 0.05,
    },
    commissionAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    collection: 'commissions',
  }
);

// Thêm các chỉ mục để tối ưu hóa truy vấn đối soát
commissionSchema.index({ collaboratorId: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ leadId: 1 }, { unique: true }); // Mỗi lead chỉ được tính hoa hồng 1 lần duy nhất

module.exports = mongoose.model('Commission', commissionSchema);
