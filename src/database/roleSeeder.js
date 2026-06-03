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
      'notifications:read',
      'notifications:write',
      'job_descriptions:read',
      'job_descriptions:write',
    ],
    description: 'Ban giám đốc, có quyền quản trị nghiệp vụ, xem nhật ký thao tác và đăng thông báo.',
  },
  {
    _id: new mongoose.Types.ObjectId('69fc5af582ef85451120772c'),
    name: 'Trưởng bộ phận',
    slug: 'truongbophan',
    permissions: [
      'departments:read',
      'users:read',
      'documents:read',
      'documents:write',
      'notifications:read',
      'notifications:write',
      'job_descriptions:read',
      'job_descriptions:write',
    ],
    description: 'Trưởng bộ phận quản lý phòng ban chuyên môn và đăng thông báo.',
  },
  {
    _id: new mongoose.Types.ObjectId('69fc5af582ef85451120772d'),
    name: 'Nhân sự',
    slug: 'nhansu',
    permissions: [
      'departments:read',
      'users:read',
      'documents:read',
      'notifications:read',
      'job_descriptions:read',
      'job_descriptions:write',
    ],
    description: 'Bộ phận Nhân sự hỗ trợ vận hành và nhận thông báo.',
  },
  {
    _id: new mongoose.Types.ObjectId('69fc5af582ef85451120772e'),
    name: 'Đại lý',
    slug: 'daily',
    permissions: [
      'documents:read',
      'notifications:read',
      'job_descriptions:read',
    ],
    description: 'Hệ thống đại lý phân phối, được nhận thông báo.',
  },
  {
    _id: new mongoose.Types.ObjectId('69fc5af682ef85451120772f'),
    name: 'Cộng tác viên',
    slug: 'congtacvien',
    permissions: [
      'documents:read',
      'notifications:read',
      'job_descriptions:read',
    ],
    description: 'Cộng tác viên tự do, được nhận thông báo.',
  },
  {
    _id: new mongoose.Types.ObjectId('69fc5af782ef854511207730'),
    name: 'Người dùng',
    slug: 'user',
    permissions: [
      'documents:read',
      'notifications:read',
      'job_descriptions:read',
    ],
    description: 'Người dùng/Khách hàng thông thường.',
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
      'notifications:read',
      'job_descriptions:read',
    ],
    description: 'Nhân viên thông thường, chỉ được phép xem thông tin, tải tài liệu và nhận thông báo.',
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
    
    console.log('[RoleSeeder] Đồng bộ thành công toàn bộ vai trò mặc định.');
  } catch (error) {
    console.error('[RoleSeeder Error] Lỗi khi đồng bộ vai trò:', error.message);
  }
};

module.exports = seedRoles;
