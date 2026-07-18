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
const chatRoutes = require('./routes/chat.routes');
const commissionRoutes = require('./routes/commission.routes');
const systemSettingRoutes = require('./routes/systemSetting.routes');
const sopRoutes = require('./routes/sop.routes');
const checklistRoutes = require('./routes/checklist.routes');
const aiConfigRoutes = require('./routes/aiConfig.routes');
const roleRoutes = require('./routes/role.routes');
const schoolRoutes = require('./routes/school.routes');
const surveyRoutes = require('./routes/survey.routes');
const { swaggerUi, swaggerDocs } = require('./configs/swagger');
const env = require('./configs/env');
const responseNormalizer = require('./middlewares/responseNormalizer');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Cho phép các request không có origin (như Postman, Mobile apps)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = env.CORS_ALLOWED_ORIGINS || [];
    const isAllowed = allowedOrigins.includes(origin) ||
                      origin.startsWith('http://localhost') ||
                      origin.endsWith('.vercel.app') ||
                      origin.includes('hto.edu.vn');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());
app.use(responseNormalizer);

// Cấu hình phục vụ file tĩnh vật lý từ thư mục /uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Khai báo giao diện tài liệu API (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Khai báo định tuyến cho hệ thống xác thực (Auth)
app.use('/api/v1/auth', authRoutes);

// Khai báo định tuyến cho hệ thống quản lý Người dùng (Users)
app.use('/api/v1/users', userRoutes);

// Khai báo định tuyến cho hệ thống Danh mục Tài liệu (Document Categories)
app.use('/api/v1/document-categories', documentCategoryRoutes);

// Khai báo định tuyến cho hệ thống Tài liệu & Biểu mẫu (Documents)
app.use('/api/v1/documents', documentRoutes);

// Khai báo định tuyến cho hệ thống Danh mục Sản phẩm (Product Categories)
app.use('/api/v1/product-categories', productCategoryRoutes);

// Khai báo định tuyến cho hệ thống Phòng ban (Departments)
app.use('/api/v1/departments', departmentRoutes);

// Khai báo định tuyến cho hệ thống Lịch sử thao tác (Audit Logs)
app.use('/api/v1/audit-logs', auditLogRoutes);

// Khai báo định tuyến cho hệ thống Thông báo nội bộ (Notifications)
app.use('/api/v1/notifications', notificationRoutes);

// Khai báo định tuyến cho Dashboard (theo role)
app.use('/api/v1/dashboard', dashboardRoutes);
// Khai báo định tuyến cho hệ thống JD công việc (Job Descriptions)
app.use('/api/v1/job-descriptions', jobDescriptionRoutes);
// Khai báo định tuyến cho hệ thống Tin tức & Sự kiện (News & Events)
app.use('/api/v1/news-posts', newsPostRoutes);
// Khai báo định tuyến cho hệ thống Sản phẩm dịch vụ (Products)
app.use('/api/v1/products', productRoutes);
// Khai báo định tuyến cho hệ thống Leads & CRM (Leads)
app.use('/api/v1/leads', leadRoutes);
// Khai báo định tuyến cho hệ thống đối soát hoa hồng (Commissions)
app.use('/api/v1/commissions', commissionRoutes);
// Khai báo định tuyến cho hệ thống Chatbot với Google Gemini AI
app.use('/api/v1/chat', chatRoutes);
// Khai báo định tuyến cho hệ thống Cấu hình hệ thống (System Settings)
app.use('/api/v1/system-settings', systemSettingRoutes);
// Khai báo định tuyến cho SOP, Checklist và AI
app.use('/api/v1/sops', sopRoutes);
app.use('/api/v1/checklists', checklistRoutes);
app.use('/api/v1/ai', aiConfigRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/schools', schoolRoutes);
// Khai báo định tuyến cho hệ thống Khảo sát (Surveys)
app.use('/api/v1/surveys', surveyRoutes);

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
