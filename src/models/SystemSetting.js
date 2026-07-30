const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    // Khoá cấu hình (ví dụ: 'chat_config', 'commission_config')
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Giá trị cấu hình (Lưu trữ hỗn hợp: object, array, string, number)
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema, 'system_settings');
