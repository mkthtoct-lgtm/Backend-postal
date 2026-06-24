const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const documentCategoryRoutes = require('./routes/documentCategory.routes');
const documentRoutes = require('./routes/document.routes');
const productCategoryRoutes = require('./routes/productCategory.routes');
const departmentRoutes = require('./routes/department.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const jobDescriptionRoutes = require('./routes/jobDescription.routes');
const newsPostRoutes = require('./routes/newsPost.routes');
const productRoutes = require('./routes/product.routes');
const leadRoutes = require('./routes/lead.routes');
const { swaggerUi, swaggerDocs } = require('./configs/swagger');

const app = express();

// CORS Configuration - SỬA LẠI
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://hubportal-eight.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://api.hto.edu.vn'
    ];
    // Cho phép requests không có origin (như mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Tạm thời cho phép tất cả trong dev
      // callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// THÊM: Xử lý preflight requests
app.options('*', cors());

app.use(express.json());

// Cấu hình phục vụ file tĩnh vật lý từ thư mục /uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Khai báo giao diện tài liệu API (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Khai báo định tuyến cho hệ thống xác thực (Auth)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/document-categories', documentCategoryRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/product-categories', productCategoryRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/job-descriptions', jobDescriptionRoutes);
app.use('/api/v1/news-posts', newsPostRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/leads', leadRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Backend Postal API is running',
  });
});

const mongoose = require('mongoose');

app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isDbConnected ? 'ok' : 'error',
    service: 'backend-postal',
    database: isDbConnected ? 'connected' : 'disconnected',
  });
});

module.exports = app;