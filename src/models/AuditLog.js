const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    target: {
      type: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
  }
);

// Thiết lập index TTL: Tự động xóa các bản ghi log cũ hơn 30 ngày để tránh làm nặng database
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
