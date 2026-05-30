/**
 * Cấu hình biến môi trường tập trung của hệ thống.
 * Tránh truy cập trực tiếp process.env trong các Service hay Controller.
 */
const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI,
  JWT: {
    SECRET: process.env.JWT_SECRET || 'fallback_default_jwt_secret_key',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  },
  MAIL: {
    HOST: process.env.MAIL_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.MAIL_PORT) || 587,
    USER: process.env.MAIL_USER,
    PASS: process.env.MAIL_PASS,
    FROM_NAME: process.env.MAIL_FROM_NAME || 'HITO CRM',
  },
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://hubportal-eight.vercel.app',
};

module.exports = env;
