const mongoose = require('mongoose');
const Role = require('../models/Role');

const rolesToSeed = [
  {
    _id: new mongoose.Types.ObjectId('69fc5af582ef85451120772a'),
    name: 'Quản trị viên',
    slug: 'admin',
    permissions: ['*'], // Wildcard - Toàn bộ quyền hạn
    description: 'Quyền lực cao nhất, quản trị toàn bộ hệ thống.',
  },
  {
    _id: new mongoose.Types.ObjectId('69fc5af582ef85451120772b'),
    name: 'Ban Giám Đốc',
    slug: 'board_of_directors',
    permissions: [
      'departments:read',
      'departments:write',
      'users:read',
      'users:write',
      'documents:read',
      'documents:write',
      'audit:read',
    ],
    description: 'Ban giám đốc, có quyền quản trị nghiệp vụ và xem nhật ký thao tác.',
  },
  {
    _id: new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad000001'),
    name: 'Nhân viên',
    slug: 'staff',
    permissions: [
      'departments:read',
      'users:read',
      'documents:read',
      'documents:download',
    ],
    description: 'Nhân viên thông thường, chỉ được phép xem thông tin và tải tài liệu.',
  },
];

/**
 * Script tự động nạp vai trò và quyền hạn (Seeder)
 */
const seedRoles = async () => {
  try {
    console.log('[RoleSeeder] Bắt đầu đồng bộ danh sách vai trò và quyền hạn...');
    
    for (const roleData of rolesToSeed) {
      // Thực thi upsert (nếu chưa có thì tạo mới, có rồi thì cập nhật lại quyền hạn mới nhất)
      await Role.findByIdAndUpdate(
        roleData._id,
        {
          name: roleData.name,
          slug: roleData.slug,
          permissions: roleData.permissions,
          description: roleData.description,
        },
        { upsert: true, new: true }
      );
    }
    
    console.log('[RoleSeeder] Đồng bộ thành công 3 vai trò mặc định (Admin, Ban Giám Đốc, Nhân Viên).');
  } catch (error) {
    console.error('[RoleSeeder Error] Lỗi khi đồng bộ vai trò:', error.message);
  }
};

module.exports = seedRoles;
