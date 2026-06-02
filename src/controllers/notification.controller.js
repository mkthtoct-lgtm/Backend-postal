const mongoose = require('mongoose');
const notificationService = require('../services/notification.service');

class NotificationController {
  async getAllNotifications(req, res) {
    try {
      const userId = req.user.sub;
      const roleId = req.user.roleId;
      const departmentId = req.user.departmentId;

      const notifications = await notificationService.findAllForUser(userId, roleId, departmentId);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách thông báo thành công.',
        data: notifications,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách thông báo.',
        error: error.message,
      });
    }
  }

  async createNotification(req, res) {
    try {
      const { title, content, priority, target } = req.body;
      const createdBy = req.user.sub;
      const createdByName = req.user.fullName || req.user.name || req.user.email || 'Người tạo';

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề thông báo không được để trống.',
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung thông báo không được để trống.',
        });
      }

      const cleanTarget = {
        groups: target && Array.isArray(target.groups) ? target.groups : ['all'],
        roles: target && Array.isArray(target.roles) ? target.roles : [],
        departments: target && Array.isArray(target.departments) ? target.departments : [],
      };

      const newNotification = await notificationService.create({
        title: title.trim(),
        content: content.trim(),
        priority: priority || 'normal',
        createdBy,
        createdByName,
        target: cleanTarget,
      });

      // Ghi audit log
      try {
        const auditLogService = require('../services/auditLog.service');
        auditLogService.log(
          createdBy,
          'notification.create',
          { type: 'notification', id: newNotification._id.toString(), name: newNotification.title },
          { title: newNotification.title, priority: newNotification.priority }
        );
      } catch (logError) {
        console.error('Không thể ghi audit log cho notification:', logError.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Tạo thông báo mới thành công.',
        data: newNotification,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo thông báo.',
        error: error.message,
      });
    }
  }

  async markRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID thông báo không hợp lệ.',
        });
      }

      const updated = await notificationService.markAsRead(id, userId);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Thông báo không tồn tại.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đánh dấu đã đọc thành công.',
        data: updated,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái đã đọc.',
        error: error.message,
      });
    }
  }

  async markUnread(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID thông báo không hợp lệ.',
        });
      }

      const updated = await notificationService.markAsUnread(id, userId);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Thông báo không tồn tại.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đánh dấu chưa đọc thành công.',
        data: updated,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái chưa đọc.',
        error: error.message,
      });
    }
  }

  async markAllRead(req, res) {
    try {
      const userId = req.user.sub;
      const roleId = req.user.roleId;
      const departmentId = req.user.departmentId;

      const result = await notificationService.markAllAsRead(userId, roleId, departmentId);

      return res.status(200).json({
        success: true,
        message: `Đã đánh dấu ${result.count} thông báo là đã đọc.`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi đánh dấu tất cả đã đọc.',
        error: error.message,
      });
    }
  }
}

module.exports = new NotificationController();
