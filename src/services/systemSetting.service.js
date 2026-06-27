const SystemSetting = require('../models/SystemSetting');

class SystemSettingService {
  /**
   * Lấy cấu hình hệ thống theo Key.
   * Nếu chưa tồn tại trong DB, trả về giá trị mặc định (defaultValue).
   * @param {string} key - Từ khóa cấu hình (ví dụ: 'chat_config')
   * @param {any} [defaultValue={}] - Giá trị mặc định nếu cấu hình chưa được tạo
   * @returns {Promise<any>} Giá trị của cấu hình
   */
  async getSetting(key, defaultValue = {}) {
    try {
      const setting = await SystemSetting.findOne({ key });
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error(`[SystemSettingService] Lỗi khi lấy cấu hình cho key "${key}":`, error.message);
      return defaultValue;
    }
  }

  /**
   * Cập nhật hoặc thêm mới (Upsert) cấu hình hệ thống
   * @param {string} key - Từ khóa cấu hình
   * @param {any} value - Giá trị cấu hình cần lưu
   * @returns {Promise<Object>} Tài liệu cấu hình đã cập nhật
   */
  async updateSetting(key, value) {
    return await SystemSetting.findOneAndUpdate(
      { key },
      { $set: { value } },
      { upsert: true, new: true, runValidators: true }
    );
  }
}

module.exports = new SystemSettingService();
