const productService = require('../services/product.service');
const googleDriveService = require('../services/googleDrive.service');
const fs = require('fs');

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

      // Upload ảnh lên Google Drive qua Service
      if (req.file) {
        try {
          const driveResult = await googleDriveService.uploadFile(req.file);
          if (driveResult && driveResult.webViewLink) {
            data.image = driveResult.webViewLink;
            data.imageFileId = driveResult.fileId;
            data.imageMimeType = req.file.mimetype;
          }
        } catch (uploadError) {
          console.error("Lỗi đẩy ảnh sản phẩm lên Drive:", uploadError);
          return res.status(500).json({
            success: false,
            message: 'Lỗi tải ảnh lên Google Drive.',
            error: uploadError.message
          });
        } finally {
          // Xóa file rác local
          try {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          } catch (e) {
            console.error("Lỗi xóa file local:", e);
          }
        }
      }

      // Trực quan hóa và chuẩn hóa các giá trị đầu vào mới
      if (data.shortCode) data.shortCode = data.shortCode.trim();
      if (data.visaCode) data.visaCode = data.visaCode.trim();
      if (data.purpose) data.purpose = data.purpose.trim();
      if (data.name) data.name = data.name.trim();

      // Tự động nối tên sản phẩm và mã visa theo quy chuẩn: Tên - VisaCode (Trừ Đào tạo)
      if (data.name && data.visaCode && data.purpose !== 'dao_tao') {
        data.name = `${data.name} - ${data.visaCode}`;
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
      if (typeof data.requiredDocuments === 'string') {
        try { data.requiredDocuments = JSON.parse(data.requiredDocuments); } catch { data.requiredDocuments = {}; }
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

      // Lấy thông tin sản phẩm cũ trước để xử lý xóa ảnh cũ và lấy thông tin cơ bản
      const existingProduct = await productService.findById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm để cập nhật.',
        });
      }

      // Upload ảnh lên Google Drive qua Service
      if (req.file) {
        try {
          const driveResult = await googleDriveService.uploadFile(req.file);
          if (driveResult && driveResult.webViewLink) {
            data.image = driveResult.webViewLink;
            data.imageFileId = driveResult.fileId;
            data.imageMimeType = req.file.mimetype;
            
            // Xóa ảnh cũ trên Drive nếu có
            if (existingProduct.imageFileId) {
              await googleDriveService.deleteFile(existingProduct.imageFileId);
            }
          }
        } catch (uploadError) {
          console.error("Lỗi đẩy ảnh sản phẩm lên Drive khi cập nhật:", uploadError);
          return res.status(500).json({
            success: false,
            message: 'Lỗi tải ảnh lên Google Drive.',
            error: uploadError.message
          });
        } finally {
          // Xóa file rác local
          try {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          } catch (e) {
            console.error("Lỗi xóa file local:", e);
          }
        }
      }

      // Xác định baseName cũ (loại bỏ phần visaCode nếu có định dạng "Tên - VisaCode")
      const oldName = existingProduct.name || '';
      let oldBaseName = oldName;
      if (existingProduct.visaCode && oldName.includes(existingProduct.visaCode)) {
        oldBaseName = oldName.split(` - ${existingProduct.visaCode}`)[0] || oldName;
      } else if (oldName.includes(' - ')) {
        oldBaseName = oldName.split(' - ')[0] || oldName;
      }

      const baseName = data.name !== undefined ? data.name.trim() : oldBaseName.trim();
      const visaCode = data.visaCode !== undefined ? data.visaCode.trim() : (existingProduct.visaCode || '').trim();

      if (data.shortCode !== undefined) data.shortCode = data.shortCode.trim();
      if (data.visaCode !== undefined) data.visaCode = visaCode;
      if (data.purpose !== undefined) data.purpose = data.purpose.trim();

      const purpose = data.purpose !== undefined ? data.purpose.trim() : (existingProduct.purpose || '').trim();
      
      // Cập nhật tên hoàn chỉnh (Trừ sản phẩm Đào tạo)
      if (baseName && visaCode && purpose !== 'dao_tao') {
        data.name = `${baseName} - ${visaCode}`;
      } else if (baseName) {
        data.name = baseName;
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
      if (typeof data.requiredDocuments === 'string') {
        try { data.requiredDocuments = JSON.parse(data.requiredDocuments); } catch { data.requiredDocuments = {}; }
      }

      const product = await productService.update(id, data);

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