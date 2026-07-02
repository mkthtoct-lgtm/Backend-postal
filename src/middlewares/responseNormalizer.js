const { normalizeUploadUrl } = require('../utils/url');

/**
 * Middleware tự động chuẩn hóa toàn bộ URL có chứa '/uploads/' trong body phản hồi JSON của Express
 */
const responseNormalizer = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    const deepNormalize = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string') {
        // Chỉ xử lý chuỗi trông như URL tĩnh, tránh xử lý base64 hoặc văn bản thông thường
        if (
          obj.startsWith('http') ||
          obj.startsWith('/uploads/') ||
          obj.includes('drive.google.com')
        ) {
          return normalizeUploadUrl(obj, req);
        }
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(deepNormalize);
      }
      if (typeof obj === 'object') {
        // Tránh xử lý sâu các class đặc biệt để ngăn tràn bộ nhớ hoặc lỗi Mongoose
        if (
          obj instanceof Date ||
          obj instanceof RegExp ||
          Buffer.isBuffer(obj) ||
          (obj.constructor && obj.constructor.name === 'ObjectId')
        ) {
          return obj;
        }

        // Chuyển đổi Mongoose Document thành plain object nếu có
        let plainObj = obj;
        if (typeof obj.toObject === 'function') {
          plainObj = obj.toObject();
        } else if (typeof obj.toJSON === 'function') {
          plainObj = obj.toJSON();
        }

        const newObj = {};
        for (const key in plainObj) {
          if (Object.prototype.hasOwnProperty.call(plainObj, key)) {
            newObj[key] = deepNormalize(plainObj[key]);
          }
        }
        return newObj;
      }
      return obj;
    };

    if (body && typeof body === 'object') {
      body = deepNormalize(body);
    }

    return originalJson.call(this, body);
  };

  next();
};

module.exports = responseNormalizer;
