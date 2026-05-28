const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const documentCategoryRoutes = require('./routes/documentCategory.routes');
const documentRoutes = require('./routes/document.routes');
const productCategoryRoutes = require('./routes/productCategory.routes');
const { swaggerUi, swaggerDocs } = require('./configs/swagger');

const app = express();

app.use(cors());
app.use(express.json());

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