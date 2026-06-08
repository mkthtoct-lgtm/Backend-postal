const mongoose = require('mongoose');
const env = require('./env');

const connectDatabase = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('MongoDB connected successfully');
    
    // Tự động nạp danh sách vai trò & quyền hạn động khi DB kết nối thành công
    const seedRoles = require('../database/roleSeeder');
    await seedRoles();

    // Tự động nạp dữ liệu tin tức & sự kiện mẫu vào bảng news_posts
    const seedNewsPosts = require('../database/newsPostSeeder');
    await seedNewsPosts();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;