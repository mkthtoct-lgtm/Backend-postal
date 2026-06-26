const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const productCategoryService = require('../services/productCategory.service');

/**
 * Chuẩn hóa URL ảnh về dạng relative path (/uploads/...)
 * Tránh lưu full URL localhost hoặc domain nội bộ vào database
 */
function sanitizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';

  // Nếu đã là relative path → giữ nguyên
  if (url.startsWith('/uploads/')) return url;

  // Nếu là URL tuyệt đối chứa /uploads/ → cắt bỏ domain, giữ lại path
  const match = url.match(/(\/uploads\/.+)/);
  if (match) return match[1];

  // Nếu là URL ngoài thực sự (Unsplash, CDN, ...) → giữ nguyên
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  return url;
}

// Hàm xử lý base64 image
function saveBase64Image(base64Str) {
  try {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:')) {
      return null;
    }
    const matches = base64Str.match(/^data:image\/([A-Za-z+-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = Buffer.from(matches[2], 'base64');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-cover.${ext}`;
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), data);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null;
  }
}

class ProductCategoryController {
  /**
   * Lấy danh sách toàn bộ danh mục sản phẩm chưa bị xóa mềm
   */
  async getAllCategories(req, res) {
    try {
      const categories = await productCategoryService.findAll();
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách danh mục sản phẩm thành công.',
        data: categories,
      });
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách danh mục sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết danh mục sản phẩm theo ID
   */
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
      }
      const category = await productCategoryService.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy danh mục sản phẩm.',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết danh mục sản phẩm thành công.',
        data: category,
      });
    } catch (error) {
      console.error('Error in getCategoryById:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết danh mục sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo mới danh mục sản phẩm
   */
  async createCategory(req, res) {
    try {
      const { name, description, status, coverImageUrl } = req.body || {};
      let savedCoverImageUrl = '';

      // Xử lý ảnh từ base64 string
      if (coverImageUrl && coverImageUrl.startsWith('data:')) {
        const savedPath = saveBase64Image(coverImageUrl);
        if (savedPath) {
          savedCoverImageUrl = savedPath;
        }
      } else if (coverImageUrl && coverImageUrl.startsWith('/uploads/')) {
        savedCoverImageUrl = coverImageUrl;
      } else if (coverImageUrl && coverImageUrl.startsWith('http')) {
        savedCoverImageUrl = sanitizeImageUrl(coverImageUrl);
      }

      // Xử lý file upload từ multer
      if (req.files) {
        if (req.files['coverImage'] && req.files['coverImage'][0]) {
          savedCoverImageUrl = `/uploads/${req.files['coverImage'][0].filename}`;
        }
        if (req.files['image'] && req.files['image'][0] && !savedCoverImageUrl) {
          savedCoverImageUrl = `/uploads/${req.files['image'][0].filename}`;
        }
      }

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên danh mục sản phẩm không được để trống.',
        });
      }

      const existingCategory = await productCategoryService.findByName(name);
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Tên danh mục sản phẩm này đã tồn tại trong hệ thống.',
        });
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'coming_soon', 'hidden'];
      const finalStatus = status && validStatuses.includes(status) ? status : 'active';

      const newCategory = await productCategoryService.create({
        name,
        description,
        status: finalStatus,
        coverImageUrl: savedCoverImageUrl,
        image: savedCoverImageUrl
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo danh mục sản phẩm thành công.',
        data: newCategory,
      });
    } catch (error) {
      console.error('Error in createCategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo mới danh mục sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin chi tiết danh mục sản phẩm
   */
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description, status, coverImageUrl } = req.body || {};
      
      const updateData = { name, description };

      // Validate and set status
      const validStatuses = ['active', 'inactive', 'coming_soon', 'hidden'];
      if (status && validStatuses.includes(status)) {
        updateData.status = status;
      }

      // Xử lý ảnh từ base64 string
      if (coverImageUrl && coverImageUrl.startsWith('data:')) {
        const savedPath = saveBase64Image(coverImageUrl);
        if (savedPath) {
          updateData.coverImageUrl = savedPath;
          updateData.image = savedPath;
        }
      } else if (coverImageUrl && coverImageUrl.startsWith('/uploads/')) {
        updateData.coverImageUrl = coverImageUrl;
        updateData.image = coverImageUrl;
      } else if (coverImageUrl && coverImageUrl.startsWith('http')) {
        const sanitized = sanitizeImageUrl(coverImageUrl);
        updateData.coverImageUrl = sanitized;
        updateData.image = sanitized;
      }

      // Xử lý file upload từ multer
      if (req.files) {
        if (req.files['coverImage'] && req.files['coverImage'][0]) {
          updateData.coverImageUrl = `/uploads/${req.files['coverImage'][0].filename}`;
          updateData.image = `/uploads/${req.files['coverImage'][0].filename}`;
        }
        if (req.files['image'] && req.files['image'][0]) {
          updateData.image = `/uploads/${req.files['image'][0].filename}`;
          if (!updateData.coverImageUrl) {
            updateData.coverImageUrl = `/uploads/${req.files['image'][0].filename}`;
          }
        }
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
      }

      const category = await productCategoryService.findById(id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Danh mục không tồn tại.' });
      }

      if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
        const existingCategory = await productCategoryService.findByName(name);
        if (existingCategory && existingCategory._id.toString() !== id) {
          return res.status(400).json({
            success: false,
            message: 'Tên danh mục sản phẩm này đã tồn tại ở một danh mục khác.',
          });
        }
      }

      const updatedCategory = await productCategoryService.update(id, updateData);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật danh mục sản phẩm thành công.',
        data: updatedCategory,
      });
    } catch (error) {
      console.error('Error in updateCategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật danh mục sản phẩm.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm danh mục sản phẩm khỏi database (và ẩn toàn bộ sản phẩm thuộc danh mục đó)
   */
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID danh mục sản phẩm không hợp lệ.',
        });
      }

      const ProductCategory = require('../models/ProductCategory');
      const category = await ProductCategory.findOne({
        _id: id,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục sản phẩm không tồn tại hoặc đã bị xóa.',
        });
      }

      // Thực hiện xóa mềm danh mục
      await productCategoryService.softDelete(id);

      // Tự động ẩn và xóa mềm toàn bộ sản phẩm thuộc danh mục này
      const Product = require('../models/Product');
      const updateResult = await Product.updateMany(
        { categoryId: id, $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
        { $set: { isActive: false, deletedAt: new Date() } }
      );

      return res.status(200).json({
        success: true,
        message: 'Xóa danh mục sản phẩm và ẩn toàn bộ sản phẩm liên quan thành công.',
        data: {
          affectedProductsCount: updateResult.modifiedCount || updateResult.nModified || 0
        }
      });
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa danh mục sản phẩm.',
        error: error.message,
      });
    }
  }
}

module.exports = new ProductCategoryController();