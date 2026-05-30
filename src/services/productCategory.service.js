const ProductCategory = require('../models/ProductCategory');

class ProductCategoryService {
  /**
   * Lấy danh sách toàn bộ danh mục sản phẩm chưa bị xóa mềm
   * @returns {Promise<Array>} Danh sách ProductCategory
   */
  async findAll() {
    return await ProductCategory.find({ deletedAt: null }).sort({ createdAt: -1 });
  }

  /**
   * Tìm kiếm danh mục bằng ID
   * @param {string} id - Mongoose ID của danh mục sản phẩm
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await ProductCategory.findOne({ _id: id, deletedAt: null });
  }

  /**
   * Tìm kiếm danh mục sản phẩm bằng tên (dùng để kiểm duyệt trùng lặp)
   * @param {string} name - Tên danh mục cần tìm
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    return await ProductCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      deletedAt: null,
    });
  }

  /**
   * Tạo danh mục sản phẩm mới
   * @param {Object} data - Dữ liệu bao gồm name, description, status
   * @returns {Promise<Object>} Danh mục vừa tạo
   */
  async create(data) {
    const newCategory = new ProductCategory({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      status: data.status || 'active',
    });
    return await newCategory.save();
  }

  /**
   * Cập nhật thông tin danh mục sản phẩm
   * @param {string} id - ID danh mục cần cập nhật
   * @param {Object} data - Dữ liệu cập nhật
   * @returns {Promise<Object|null>} Danh mục sau khi cập nhật
   */
  async update(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.status !== undefined) updateData.status = data.status;

    return await ProductCategory.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { returnDocument: 'after' }
    );
  }

  /**
   * Xóa mềm danh mục sản phẩm
   * @param {string} id - ID danh mục cần xóa
   * @returns {Promise<Object|null>}
   */
  async softDelete(id) {
    return await ProductCategory.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          status: 'inactive',
        },
      },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new ProductCategoryService();
