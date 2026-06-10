const productService = require('../services/product.service');

class ProductController {
  /**
   * Lấy toàn bộ danh sách sản phẩm (có tìm kiếm và lọc)
   * GET /products?search=&type=&status=
   */
  async getAll(req, res) {
    try {
      const { search, type, status } = req.query;
      const products = await productService.findAll({ search, type, status });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách sản phẩm thành công.',
        data: products,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết sản phẩm theo ID
   * GET /products/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết sản phẩm thành công.',
        data: product,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo sản phẩm mới (Chỉ Admin)
   * POST /products
   */
  async create(req, res) {
    try {
      const product = await productService.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công.',
        data: product,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin sản phẩm (Chỉ Admin)
   * PATCH /products/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.update(id, req.body);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm để cập nhật.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công.',
        data: product,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm sản phẩm (Chỉ Admin)
   * DELETE /products/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.delete(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm để xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Xóa sản phẩm thành công.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa sản phẩm.',
        error: error.message,
      });
    }
  }
}

module.exports = new ProductController();
