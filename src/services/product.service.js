const Product = require('../models/Product');
const mongoose = require('mongoose');

class ProductService {
  /**
   * Lấy danh sách sản phẩm còn hoạt động
   * Hỗ trợ tìm kiếm theo tên/mô tả và lọc theo categoryId, trạng thái
   */
  async findAll({ search = '', categoryId = '', isActive } = {}) {
    // Chỉ lấy sản phẩm chưa bị xóa mềm (deletedAt = null) VÀ isActive = true
    // Các record cũ trong DB không có deletedAt → dùng $or để bắt cả 2 trường hợp
    const filter = {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    // Lọc theo isActive nếu được truyền vào
    if (isActive !== undefined) {
      filter.isActive = isActive;
    } else {
      // Mặc định chỉ lấy sản phẩm đang hoạt động
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ isActive: true }, { isActive: { $exists: false } }],
      });
    }

    if (categoryId) {
      try {
        filter.categoryId = new mongoose.Types.ObjectId(categoryId);
      } catch {
        filter.categoryId = categoryId;
      }
    }

    if (search) {
      const searchCondition = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };
      filter.$and = filter.$and || [];
      filter.$and.push(searchCondition);
    }

    return await Product.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Lấy chi tiết sản phẩm theo ID (chưa bị xóa mềm)
   */
  async findById(id) {
    return await Product.findOne({
      _id: id,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });
  }

  /**
   * Tạo sản phẩm mới
   */
  async create(data) {
    const product = new Product(data);
    return await product.save();
  }

  /**
   * Cập nhật thông tin sản phẩm theo ID
   */
  async update(id, data) {
    return await Product.findOneAndUpdate(
      {
        _id: id,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      },
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Xóa mềm sản phẩm (ghi lại deletedAt + tắt isActive)
   */
  async delete(id) {
    return await Product.findOneAndUpdate(
      {
        _id: id,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      },
      { $set: { deletedAt: new Date(), isActive: false } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new ProductService();