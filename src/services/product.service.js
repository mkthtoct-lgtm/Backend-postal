const Product = require('../models/Product');

class ProductService {
  /**
   * Lấy danh sách sản phẩm chưa bị xóa mềm
   * Hỗ trợ tìm kiếm theo tên/mô tả và lọc theo loại, trạng thái
   */
  async findAll({ search = '', type = '', status = '' } = {}) {
    // Chỉ lấy sản phẩm chưa bị xóa mềm
    const filter = { deletedAt: null };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sắp xếp theo ngày tạo mới nhất
    return await Product.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Lấy chi tiết sản phẩm theo ID (chưa bị xóa mềm)
   */
  async findById(id) {
    return await Product.findOne({ _id: id, deletedAt: null });
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
      { _id: id, deletedAt: null },
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Xóa mềm sản phẩm (ghi lại deletedAt, không xóa khỏi DB)
   */
  async delete(id) {
    return await Product.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new ProductService();
