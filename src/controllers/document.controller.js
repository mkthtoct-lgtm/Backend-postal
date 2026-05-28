const mongoose = require('mongoose');
const documentService = require('../services/document.service');

class DocumentController {
  /**
   * Lấy danh sách tài liệu có phân trang và bộ lọc theo danh mục
   */
  async getDocuments(req, res) {
    try {
      let { page, limit, categoryId } = req.query;

      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;

      // Kiểm định tính hợp lệ của categoryId nếu được cung cấp
      if (categoryId && categoryId !== 'all' && !mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã danh mục (categoryId) không hợp lệ.',
        });
      }

      const result = await documentService.findAndCount({ page, limit, categoryId });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách tài liệu thành công.',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết thông tin 1 tài liệu theo ID
   */
  async getDocumentDetail(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID tài liệu không hợp lệ.',
        });
      }

      const document = await documentService.findById(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Tài liệu không tồn tại hoặc đã bị xóa mềm.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết tài liệu thành công.',
        data: document,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết tài liệu.',
        error: error.message,
      });
    }
  }
}

module.exports = new DocumentController();
