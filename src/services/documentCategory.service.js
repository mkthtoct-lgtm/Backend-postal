const DocumentCategory = require('../models/DocumentCategory');

class DocumentCategoryService {
  /**
   * Lấy danh sách toàn bộ danh mục tài liệu chưa bị xóa mềm
   * @returns {Promise<Array>} Danh sách DocumentCategory
   */
  async findAll() {
    return await DocumentCategory.find({ deletedAt: null }).sort({ createdAt: -1 });
  }

  /**
   * Tìm kiếm danh mục bằng ID
   * @param {string} id - Mongoose ID của danh mục
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await DocumentCategory.findOne({ _id: id, deletedAt: null });
  }

  /**
   * Tìm kiếm danh mục bằng tên (dùng để kiểm duyệt trùng lặp)
   * @param {string} name - Tên danh mục cần tìm
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    return await DocumentCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      deletedAt: null,
    });
  }

  /**
   * Tạo danh mục tài liệu mới
   * @param {Object} data - Dữ liệu bao gồm name, description
   * @returns {Promise<Object>} Danh mục vừa tạo
   */
  async create(data) {
    const newCategory = new DocumentCategory({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      isHidden: false,
    });
    return await newCategory.save();
  }

  /**
   * Cập nhật thông tin danh mục
   * @param {string} id - ID danh mục cần cập nhật
   * @param {Object} data - Dữ liệu cập nhật
   * @returns {Promise<Object|null>} Danh mục sau khi cập nhật
   */
  async update(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.isHidden !== undefined) updateData.isHidden = data.isHidden;

    return await DocumentCategory.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { returnDocument: 'after' }
    );
  }

  /**
   * Đảo ngược trạng thái ẩn/hiện của danh mục
   * @param {string} id - ID danh mục
   * @returns {Promise<Object|null>} Danh mục đã cập nhật trạng thái hiển thị
   */
  async toggleVisibility(id) {
    const category = await this.findById(id);
    if (!category) return null;

    category.isHidden = !category.isHidden;
    return await category.save();
  }
}

module.exports = new DocumentCategoryService();
