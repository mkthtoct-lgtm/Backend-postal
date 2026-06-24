const ProductCategory = require('../models/ProductCategory');

class ProductCategoryService {
  /**
   * Lấy danh sách toàn bộ danh mục sản phẩm chưa bị xóa mềm
   * SỬA: Bỏ filter status để lấy cả inactive
   */
  async findAll() {
    return await ProductCategory.find({ 
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
      // BỎ: status: 'active' để lấy tất cả
    }).sort({ createdAt: -1 });
  }

  /**
   * Tìm kiếm danh mục bằng ID
   */
  async findById(id) {
    return await ProductCategory.findOne({ 
      _id: id, 
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    });
  }

  /**
   * Tìm kiếm danh mục sản phẩm bằng tên
   */
  async findByName(name) {
    return await ProductCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    });
  }

  /**
   * Tạo danh mục sản phẩm mới
   */
  async create(data) {
    const newCategory = new ProductCategory({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : '',
      status: data.status || 'active',
      coverImageUrl: data.coverImageUrl ? data.coverImageUrl.trim() : '',
      image: data.image ? data.image.trim() : '',
    });
    return await newCategory.save();
  }

  /**
   * Cập nhật thông tin danh mục sản phẩm
   */
  async update(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl.trim();
    if (data.image !== undefined) updateData.image = data.image.trim();

    return await ProductCategory.findOneAndUpdate(
      { _id: id, $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Xóa cứng danh mục sản phẩm
   */
  async hardDelete(id) {
    return await ProductCategory.findByIdAndDelete(id);
  }
}

module.exports = new ProductCategoryService();