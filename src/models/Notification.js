const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'important', 'urgent'],
      default: 'normal',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      default: 'Hệ thống',
    },
    target: {
      groups: {
        type: [String], // ['all', 'internal', 'partner', 'manager']
        default: ['all'],
      },
      roles: {
        type: [String], // ['admin', 'board_of_directors', 'truongbophan', 'nhansu', 'daily', 'congtacvien', 'user', 'staff']
        default: [],
      },
      departments: {
        type: [String], // ['dept-hanh-chinh', 'dept-nhan-su', 'dept-ke-toan', 'dept-ho-so', 'dept-tuyen-sinh']
        default: [],
      },
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Tránh lỗi trùng lặp tên index nếu chạy nhiều lần
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
