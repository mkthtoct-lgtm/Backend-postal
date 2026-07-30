const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');

// Danh sách các slug vai trò hệ thống cần bảo vệ, tránh bị xóa hoặc thay đổi slug
const PROTECTED_SLUGS = [
  'admin',
  'bangiamdoc',
  'board_of_directors',
  'truongbophan',
  'nhansu',
  'daily',
  'congtacvien',
  'user',
  'staff'
];

/**
 * Hàm chuẩn hóa tên/chuỗi thành slug tiếng Việt không dấu
 * @param {string} text - Chuỗi cần tạo slug
 * @returns {string}
 */
const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Tách dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
    .replace(/[đĐ]/g, 'd')
    .replace(/([^a-z0-9\s-]|_)+/g, '') // Loại bỏ ký tự đặc biệt khác ngoài dấu gạch ngang
    .trim()
    .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-'); // Tránh lặp lại dấu gạch ngang
};

class RoleService {
  /**
   * Lấy danh sách toàn bộ vai trò, đếm số lượng user đang thuộc vai trò đó
   * @returns {Promise<Array>} Danh sách vai trò kèm userCount
   */
  async findAll(includeHidden = false) {
    const matchCondition = includeHidden ? {} : { isHidden: { $ne: true } };
    const roles = await Role.aggregate([
      {
        $match: matchCondition,
      },
      {
        $lookup: {
          from: 'users',
          let: { roleId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$roleId', '$$roleId'] },
                deletedAt: null, // Chỉ đếm những user chưa bị xóa mềm
              },
            },
          ],
          as: 'members',
        },
      },
      {
        $addFields: {
          userCount: { $size: '$members' },
          id: { $toString: '$_id' },
        },
      },
      {
        $project: {
          members: 0, // Ẩn danh sách thô của user, chỉ trả về userCount
          __v: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return roles;
  }

  /**
   * Tìm vai trò theo ID
   * @param {string} id - ID của vai trò
   * @returns {Promise<Object|null>}
   */
  async findById(id, includeHidden = false) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const filter = includeHidden ? { _id: id } : { _id: id, isHidden: { $ne: true } };
    return await Role.findOne(filter);
  }

  /**
   * Tìm kiếm vai trò theo tên (không phân biệt hoa thường)
   * @param {string} name - Tên vai trò
   * @param {string|null} excludeId - ID vai trò loại trừ
   * @returns {Promise<Object|null>}
   */
  async findByName(name, excludeId = null) {
    if (!name) return null;
    const filter = {
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isHidden: { $ne: true },
    };

    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: excludeId };
    }

    return await Role.findOne(filter);
  }

  /**
   * Tìm kiếm vai trò theo slug
   * @param {string} slug - Slug vai trò
   * @param {string|null} excludeId - ID vai trò loại trừ
   * @returns {Promise<Object|null>}
   */
  async findBySlug(slug, excludeId = null) {
    if (!slug) return null;
    const filter = {
      slug: slugify(slug),
      isHidden: { $ne: true },
    };

    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: excludeId };
    }

    return await Role.findOne(filter);
  }

  /**
   * Tạo vai trò mới
   * @param {Object} data - Dữ liệu vai trò mới (name, slug, permissions, description)
   * @returns {Promise<Object>}
   */
  async create(data) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);
    
    const newRole = new Role({
      name: data.name.trim(),
      slug,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      description: data.description ? data.description.trim() : '',
      isHidden: false,
    });

    return await newRole.save();
  }

  /**
   * Cập nhật thông tin vai trò
   * @param {string} id - ID vai trò cần cập nhật
   * @param {Object} data - Dữ liệu cập nhật
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const role = await Role.findOne({ _id: id, isHidden: { $ne: true } });
    if (!role) return null;

    const isProtected = PROTECTED_SLUGS.includes(role.slug);
    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.permissions !== undefined) updateData.permissions = Array.isArray(data.permissions) ? data.permissions : [];

    if (data.slug !== undefined) {
      const newSlug = slugify(data.slug);
      // Nếu là vai trò hệ thống, cấm đổi slug để tránh ảnh hưởng checkPermission middleware
      if (isProtected && newSlug !== role.slug) {
        throw new Error('Không được phép thay đổi slug của vai trò mặc định của hệ thống.');
      }
      updateData.slug = newSlug;
    }

    return await Role.findOneAndUpdate(
      { _id: id, isHidden: { $ne: true } },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Xóa vai trò (chỉ thực hiện khi không phải vai trò hệ thống và chưa gán cho ai)
   * @param {string} id - ID vai trò cần xóa
   * @returns {Promise<{success: boolean, status?: number, message: string}>}
   */
  async toggleVisibility(id) {
    const role = await Role.findById(id);
    if (!role) return null;

    // Chặn ẩn vai trò mặc định của hệ thống
    if (PROTECTED_SLUGS.includes(role.slug) && !role.isHidden) {
      throw new Error('Không được phép ẩn vai trò mặc định của hệ thống.');
    }

    role.isHidden = !role.isHidden;
    const saved = await role.save();
    return saved;
  }

  /**
   * Helper cung cấp danh sách slug hệ thống được bảo vệ
   * @returns {Array<string>}
   */
  getProtectedSlugs() {
    return PROTECTED_SLUGS;
  }

  /**
   * Helper chuyển tên thành slug phục vụ FE
   * @param {string} text - Tên cần chuyển
   * @returns {string}
   */
  slugify(text) {
    return slugify(text);
  }
}

module.exports = new RoleService();
