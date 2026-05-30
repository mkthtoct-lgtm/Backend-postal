const mongoose = require('mongoose');
const productCategoryService = require('../services/productCategory.service');

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
   * Tạo mới danh mục sản phẩm
   */
  async createCategory(req, res) {
    try {
      const { name, description, status } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên danh mục sản phẩm không được để trống.',
        });
      }

      // Kiểm duyệt trùng lặp tên
      const existingCategory = await productCategoryService.findByName(name);
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Tên danh mục sản phẩm này đã tồn tại trong hệ thống.',
        });
      }

      const newCategory = await productCategoryService.create({ name, description, status });

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
      const { name, description, status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID danh mục sản phẩm không hợp lệ.',
        });
      }

      // Kiểm tra danh mục có tồn tại hay không
      const category = await productCategoryService.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục sản phẩm không tồn tại.',
        });
      }

      // Kiểm duyệt trùng tên với danh mục khác khi thực hiện đổi tên
      if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
        const existingCategory = await productCategoryService.findByName(name);
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Tên danh mục sản phẩm này đã tồn tại ở một danh mục khác.',
          });
        }
      }

      const updatedCategory = await productCategoryService.update(id, { name, description, status });

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
   * Xóa mềm danh mục sản phẩm
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

      const category = await productCategoryService.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục sản phẩm không tồn tại hoặc đã được xóa trước đó.',
        });
      }

      await productCategoryService.softDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Xóa danh mục sản phẩm thành công.',
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
