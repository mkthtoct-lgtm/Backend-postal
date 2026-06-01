const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./env');

// Tùy chọn cấu hình OpenAPI/Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'HITO Postal API Documentation',
      version: '1.0.0',
      description: 'Tài liệu hướng dẫn và thử nghiệm trực tiếp các API của hệ thống bưu chính HITO Postal.',
      contact: {
        name: 'Đội ngũ phát triển HITO',
        email: 'support@hito.vn',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Máy chủ thử nghiệm (Local Development Server)',
      },
      {
        url: `https://api.hto.edu.vn/api/v1`,
        description: 'Máy chủ chính thức (Production VPS)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập mã Access Token định dạng JWT để xác thực các API bảo mật. Thêm "Bearer " ở đầu nếu tool không tự nhận diện.',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  // Đường dẫn đến các file chứa chú thích Swagger (JSDoc)
  apis: ['./src/routes/*.js', './src/routes/auth.routes.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = {
  swaggerUi,
  swaggerDocs,
};
