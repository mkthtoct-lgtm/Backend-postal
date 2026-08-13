const mongoose = require('mongoose');

const courseLeadSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Tên khách hàng là bắt buộc'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Vui lòng cung cấp email hợp lệ',
      ],
    },
    notes: {
      type: String,
      trim: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Liên kết tới Model khóa học thực tế
      required: [true, 'ID Khóa học là bắt buộc'],
    },
    status: {
      type: String,
      enum: ['new', 'processing', 'completed'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CourseLead', courseLeadSchema);
