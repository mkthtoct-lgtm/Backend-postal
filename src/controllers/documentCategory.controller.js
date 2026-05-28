const mongoose = require('mongoose');
const documentCategoryService = require('../services/documentCategory.service');

class DocumentCategoryController {
  /**
   * Lấy danh sách toàn bộ danh mục tài liệu chưa bị xóa mềm
   */
  async getAllCategories(req, res) {
    try {
      const categories = await documentCategoryService.findAll();
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách danh mục tài liệu thành công.',
        data: categories,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách danh mục tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo mới danh mục tài liệu
   */
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên danh mục không được để trống.',
        });
      }

      // Kiểm tra danh mục trùng tên trong DB
      const existingCategory = await documentCategoryService.findByName(name);
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Tên danh mục này đã tồn tại trong hệ thống.',
        });
      }

      const newCategory = await documentCategoryService.create({ name, description });

      return res.status(201).json({
        success: true,
        message: 'Tạo danh mục tài liệu thành công.',
        data: newCategory,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo mới danh mục tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin chi tiết của danh mục tài liệu
   */
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID danh mục không hợp lệ.',
        });
      }

      // Kiểm tra danh mục có tồn tại hay không
      const category = await documentCategoryService.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục tài liệu không tồn tại.',
        });
      }

      // Kiểm tra trùng tên với danh mục khác khi đổi tên
      if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
        const existingCategory = await documentCategoryService.findByName(name);
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Tên danh mục này đã tồn tại ở một danh mục khác.',
          });
        }
      }

      const updatedCategory = await documentCategoryService.update(id, { name, description });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật danh mục tài liệu thành công.',
        data: updatedCategory,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật danh mục tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Thay đổi trạng thái hiển thị (Bật/Tắt ẩn) của danh mục tài liệu
   */
  async toggleVisibility(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID danh mục không hợp lệ.',
        });
      }

      const updatedCategory = await documentCategoryService.toggleVisibility(id);
      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục tài liệu không tồn tại.',
        });
      }

      return res.status(200).json({
        success: true,
        message: updatedCategory.isHidden
          ? 'Đã ẩn danh mục tài liệu thành công.'
          : 'Đã hiển thị danh mục tài liệu thành công.',
        data: updatedCategory,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái hiển thị danh mục.',
        error: error.message,
      });
    }
  }
}

module.exports = new DocumentCategoryController();
