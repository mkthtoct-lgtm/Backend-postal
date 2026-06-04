const mongoose = require('mongoose');
const jobDescriptionService = require('../services/jobDescription.service');

class JobDescriptionController {
  /**
   * Lấy danh sách JD (Có phân trang, bộ lọc và tìm kiếm)
   */
  async getAllJDs(req, res) {
    try {
      let { page, limit, search, departmentId, status } = req.query;

      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
      search = search ? search.trim() : '';

      // Kiểm tra tính hợp lệ của departmentId nếu có
      if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã phòng ban (departmentId) không hợp lệ.',
        });
      }

      // Kiểm soát trạng thái lọc hợp lệ
      if (status && !['active', 'inactive', 'draft'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái lọc status không hợp lệ. Chấp nhận: active, inactive, draft.',
        });
      }

      const result = await jobDescriptionService.findAndCount({
        page,
        limit,
        search,
        departmentId: departmentId ? new mongoose.Types.ObjectId(departmentId) : null,
        status,
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách JD công việc thành công.',
        data: result,
      });
    } catch (error) {
      console.error('Error in getAllJDs:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách JD công việc.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết thông tin 1 JD
   */
  async getJDById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID JD công việc không hợp lệ.',
        });
      }

      const jd = await jobDescriptionService.findById(id);
      if (!jd) {
        return res.status(404).json({
          success: false,
          message: 'JD công việc không tồn tại hoặc đã bị xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết JD công việc thành công.',
        data: jd,
      });
    } catch (error) {
      console.error('Error in getJDById:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết JD công việc.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo JD mới
   */
  async createJD(req, res) {
    try {
      const { title, departmentId, description, requirements, benefits, salaryRange, workingType, location, status } = req.body;

      // Validation bắt buộc
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề JD không được để trống.',
        });
      }

      if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Mã phòng ban (departmentId) không hợp lệ hoặc để trống.',
        });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mô tả công việc không được để trống.',
        });
      }

      if (workingType && !['full-time', 'part-time', 'remote', 'hybrid', 'freelance'].includes(workingType)) {
        return res.status(400).json({
          success: false,
          message: 'Hình thức làm việc (workingType) không hợp lệ.',
        });
      }

      if (status && !['active', 'inactive', 'draft'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái status không hợp lệ.',
        });
      }

      // Tạo mới
      const newJd = await jobDescriptionService.create({
        title: title.trim(),
        departmentId: new mongoose.Types.ObjectId(departmentId),
        description: description.trim(),
        requirements,
        benefits,
        salaryRange,
        workingType,
        location,
        status,
        createdBy: req.user ? req.user.sub : null,
      });

      // Ghi lịch sử thao tác
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'jd.create',
        { type: 'job_description', id: newJd.id, name: newJd.title },
        { title: newJd.title, departmentId }
      );

      return res.status(201).json({
        success: true,
        message: 'Tạo JD công việc mới thành công.',
        data: newJd,
      });
    } catch (error) {
      console.error('Error in createJD:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo mới JD công việc.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin JD
   */
  async updateJD(req, res) {
    try {
      const { id } = req.params;
      const { title, departmentId, description, requirements, benefits, salaryRange, workingType, location, status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID JD công việc không hợp lệ.',
        });
      }

      const existingJd = await jobDescriptionService.findById(id);
      if (!existingJd) {
        return res.status(404).json({
          success: false,
          message: 'JD công việc không tồn tại.',
        });
      }

      // Validate dữ liệu cập nhật
      const updateData = {};
      if (title !== undefined) {
        if (!title.trim()) {
          return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống.' });
        }
        updateData.title = title;
      }

      if (departmentId !== undefined) {
        if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
          return res.status(400).json({ success: false, message: 'Mã phòng ban (departmentId) không hợp lệ.' });
        }
        updateData.departmentId = new mongoose.Types.ObjectId(departmentId);
      }

      if (description !== undefined) {
        if (!description.trim()) {
          return res.status(400).json({ success: false, message: 'Mô tả công việc không được để trống.' });
        }
        updateData.description = description;
      }

      if (requirements !== undefined) updateData.requirements = requirements;
      if (benefits !== undefined) updateData.benefits = benefits;
      if (salaryRange !== undefined) updateData.salaryRange = salaryRange;
      
      if (workingType !== undefined) {
        if (!['full-time', 'part-time', 'remote', 'hybrid', 'freelance'].includes(workingType)) {
          return res.status(400).json({ success: false, message: 'Hình thức làm việc không hợp lệ.' });
        }
        updateData.workingType = workingType;
      }

      if (location !== undefined) updateData.location = location;

      if (status !== undefined) {
        if (!['active', 'inactive', 'draft'].includes(status)) {
          return res.status(400).json({ success: false, message: 'Trạng thái status không hợp lệ.' });
        }
        updateData.status = status;
      }

      const updated = await jobDescriptionService.update(id, updateData);

      // Ghi lịch sử thao tác
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'jd.update',
        { type: 'job_description', id, name: updated.title },
        { updatedFields: Object.keys(updateData) }
      );

      return res.status(200).json({
        success: true,
        message: 'Cập nhật JD công việc thành công.',
        data: updated,
      });
    } catch (error) {
      console.error('Error in updateJD:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật JD công việc.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa vĩnh viễn JD công việc
   */
  async deleteJD(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID JD công việc không hợp lệ.',
        });
      }

      const existingJd = await jobDescriptionService.findById(id);
      if (!existingJd) {
        return res.status(404).json({
          success: false,
          message: 'JD công việc không tồn tại hoặc đã bị xóa.',
        });
      }

      await jobDescriptionService.delete(id);

      // Ghi lịch sử thao tác
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'jd.delete',
        { type: 'job_description', id, name: existingJd.title },
        { deleted: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Xóa JD công việc thành công.',
      });
    } catch (error) {
      console.error('Error in deleteJD:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa JD công việc.',
        error: error.message,
      });
    }
  }
}

module.exports = new JobDescriptionController();
