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
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS 
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(item => item.trim()) 
    : ['https://hubportal-eight.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
  GOOGLE_DRIVE: {
    CLIENT_ID: process.env.GOOGLE_DRIVE_CLIENT_ID ? process.env.GOOGLE_DRIVE_CLIENT_ID.trim() : undefined,
    CLIENT_SECRET: process.env.GOOGLE_DRIVE_CLIENT_SECRET ? process.env.GOOGLE_DRIVE_CLIENT_SECRET.trim() : undefined,
    REFRESH_TOKEN: process.env.GOOGLE_DRIVE_REFRESH_TOKEN ? process.env.GOOGLE_DRIVE_REFRESH_TOKEN.trim() : undefined,
    FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID ? process.env.GOOGLE_DRIVE_FOLDER_ID.trim() : undefined,
  },
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  BIZFLY_WEBHOOK_URL: process.env.BIZFLY_WEBHOOK_URL || '',
  BIZFLY_WEBHOOK_URL: process.env.BIZFLY_WEBHOOK_URL || 'https://crm.bizfly.vn/public-api/public/webhook?id=6a2b72434cee0da9cf07775e&crm_token=c6a5a2b4af9dcb0806470a2ae859234006f2d050&project_id=695b85c8320583313135ddfa',
};

module.exports = env;
