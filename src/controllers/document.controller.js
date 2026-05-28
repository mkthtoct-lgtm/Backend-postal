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
      console.error('Error in getDocuments:', error);
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

  /**
   * Tạo tài liệu mới
   */
  async createDocument(req, res) {
    try {
      const { title, categoryId, departmentId, schoolId, productId, fileUrl, fileType, isAiTrainingSource, status, permissions } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề tài liệu không được để trống.',
        });
      }

      if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã danh mục (categoryId) không hợp lệ.',
        });
      }

      const cleanDeptId = (departmentId && mongoose.Types.ObjectId.isValid(departmentId))
        ? new mongoose.Types.ObjectId(departmentId)
        : null;

      let cleanStatus = status || 'draft';
      if (cleanStatus === 'Nháp') cleanStatus = 'draft';
      else if (cleanStatus === 'Chờ duyệt') cleanStatus = 'pending';
      else if (cleanStatus === 'Đang dùng' || cleanStatus === 'Cần cập nhật') cleanStatus = 'active';
      else if (cleanStatus === 'Ngừng dùng') cleanStatus = 'inactive';

      const newDoc = await documentService.create({
        title,
        categoryId: new mongoose.Types.ObjectId(categoryId),
        departmentId: cleanDeptId,
        schoolId,
        productId,
        fileUrl,
        fileType,
        isAiTrainingSource,
        uploadedById: req.user ? req.user.sub : null,
        status: cleanStatus,
        permissions,
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo tài liệu mới thành công.',
        data: newDoc,
      });
    } catch (error) {
      console.error('Error in createDocument:', error);
      console.error('Request Body:', req.body);
      console.error('Request User:', req.user);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin, trạng thái, hoặc phân quyền tài liệu
   */
  async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const { title, categoryId, departmentId, fileUrl, fileType, isAiTrainingSource, status, permissions } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID tài liệu không hợp lệ.',
        });
      }

      const existingDoc = await documentService.findById(id);
      if (!existingDoc) {
        return res.status(404).json({
          success: false,
          message: 'Tài liệu không tồn tại hoặc đã bị xóa.',
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (fileUrl !== undefined) updateData.fileUrl = fileUrl.trim();
      if (fileType !== undefined) updateData.fileType = fileType.trim();
      if (isAiTrainingSource !== undefined) updateData.isAiTrainingSource = isAiTrainingSource;
      
      if (status !== undefined) {
        let cleanStatus = status;
        if (cleanStatus === 'Nháp') cleanStatus = 'draft';
        else if (cleanStatus === 'Chờ duyệt') cleanStatus = 'pending';
        else if (cleanStatus === 'Đang dùng' || cleanStatus === 'Cần cập nhật') cleanStatus = 'active';
        else if (cleanStatus === 'Ngừng dùng') cleanStatus = 'inactive';
        updateData.status = cleanStatus;
      }
      
      if (permissions !== undefined) updateData.permissions = permissions;

      if (categoryId !== undefined) {
        if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
          return res.status(400).json({
            success: false,
            message: 'Mã danh mục (categoryId) không hợp lệ.',
          });
        }
        updateData.categoryId = new mongoose.Types.ObjectId(categoryId);
      }

      if (departmentId !== undefined) {
        updateData.departmentId = (departmentId && mongoose.Types.ObjectId.isValid(departmentId))
          ? new mongoose.Types.ObjectId(departmentId)
          : null;
      }

      const updatedDoc = await documentService.update(id, updateData);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật tài liệu thành công.',
        data: updatedDoc,
      });
    } catch (error) {
      console.error('Error in updateDocument:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật tài liệu.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm tài liệu
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID tài liệu không hợp lệ.',
        });
      }

      const existingDoc = await documentService.findById(id);
      if (!existingDoc) {
        return res.status(404).json({
          success: false,
          message: 'Tài liệu không tồn tại hoặc đã bị xóa trước đó.',
        });
      }

      await documentService.softDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Xóa tài liệu thành công.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa tài liệu.',
        error: error.message,
      });
    }
  }
}

module.exports = new DocumentController();
