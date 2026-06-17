const productService = require('../services/product.service');

class ProductController {
  /**
   * Lấy toàn bộ danh sách sản phẩm (có tìm kiếm và lọc)
   * GET /products?search=&categoryId=&isActive=
   */
  async getAll(req, res) {
    try {
      const { search, categoryId, isActive } = req.query;

      // Chuyển đổi isActive từ string sang boolean nếu có
      let isActiveParsed;
      if (isActive === 'true') isActiveParsed = true;
      else if (isActive === 'false') isActiveParsed = false;

      const products = await productService.findAll({ search, categoryId, isActive: isActiveParsed });

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

      // User thường không được xem sản phẩm đã ẩn
      if (req.query._restrictHidden === 'true' && product.isActive === false) {
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
   * Hỗ trợ upload ảnh (multipart, field "image") hoặc gửi sẵn URL ảnh trong body.image
   */
  async create(req, res) {
    try {
      const data = { ...req.body };

      // Nếu có file upload, ưu tiên dùng đường dẫn file vừa lưu
      if (req.file) {
        data.image = `/uploads/${req.file.filename}`;
      }

      // Chuyển đổi kiểu dữ liệu cho các field array/object nếu gửi dạng JSON string
      if (typeof data.requirements === 'string') {
        try { data.requirements = JSON.parse(data.requirements); } catch { data.requirements = []; }
      }
      if (typeof data.costs === 'string') {
        try { data.costs = JSON.parse(data.costs); } catch { data.costs = []; }
      }
      if (typeof data.steps === 'string') {
        try { data.steps = JSON.parse(data.steps); } catch { data.steps = []; }
      }

      const product = await productService.create(data);

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
      const data = { ...req.body };

      if (req.file) {
        data.image = `/uploads/${req.file.filename}`;
      }

      // Chuyển đổi kiểu dữ liệu cho các field array/object nếu gửi dạng JSON string
      if (typeof data.requirements === 'string') {
        try { data.requirements = JSON.parse(data.requirements); } catch { data.requirements = []; }
      }
      if (typeof data.costs === 'string') {
        try { data.costs = JSON.parse(data.costs); } catch { data.costs = []; }
      }
      if (typeof data.steps === 'string') {
        try { data.steps = JSON.parse(data.steps); } catch { data.steps = []; }
      }

      const product = await productService.update(id, data);

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