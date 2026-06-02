const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications Management
 *   description: Các API liên quan đến quản lý thông báo nội bộ và phân quyền đối tượng nhận. Yêu cầu Bearer JWT.
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Lấy danh sách toàn bộ thông báo hiển thị cho người dùng hiện tại (Lọc theo Target & tự động gắn trạng thái isRead)
 *     tags: [Notifications Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách thông báo thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       priority:
 *                         type: string
 *                         enum: [normal, important, urgent]
 *                       createdByName:
 *                         type: string
 *                       isRead:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 */
router.get('/', authMiddleware, checkPermission('notifications:read'), notificationController.getAllNotifications);

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Tạo thông báo mới và phân quyền nhận (Yêu cầu quyền notifications:write)
 *     tags: [Notifications Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: Thông báo nghỉ lễ 2/9
 *               content:
 *                 type: string
 *                 example: Toàn bộ cán bộ nhân viên được nghỉ lễ vào ngày 2/9/2026.
 *               priority:
 *                 type: string
 *                 enum: [normal, important, urgent]
 *                 default: normal
 *               target:
 *                 type: object
 *                 properties:
 *                   groups:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["internal"]
 *                   roles:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["truongbophan", "nhansu"]
 *                   departments:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["dept-nhan-su"]
 *     responses:
 *       201:
 *         description: Tạo thông báo mới thành công
 *       400:
 *         description: Thiếu dữ liệu tiêu đề hoặc nội dung
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền thao tác
 */
router.post('/', authMiddleware, checkPermission('notifications:write'), notificationController.createNotification);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu một thông báo cụ thể là đã đọc
 *     tags: [Notifications Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID của thông báo cần đánh dấu
 *     responses:
 *       200:
 *         description: Đánh dấu đã đọc thành công
 *       400:
 *         description: ID thông báo không hợp lệ
 *       404:
 *         description: Thông báo không tồn tại
 */
router.patch('/:id/read', authMiddleware, checkPermission('notifications:read'), notificationController.markRead);

/**
 * @swagger
 * /notifications/{id}/unread:
 *   patch:
 *     summary: Đánh dấu một thông báo cụ thể là chưa đọc
 *     tags: [Notifications Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID của thông báo cần đánh dấu chưa đọc
 *     responses:
 *       200:
 *         description: Đánh dấu chưa đọc thành công
 *       400:
 *         description: ID thông báo không hợp lệ
 *       404:
 *         description: Thông báo không tồn tại
 */
router.patch('/:id/unread', authMiddleware, checkPermission('notifications:read'), notificationController.markUnread);

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: Đánh dấu tất cả thông báo hiển thị là đã đọc cho người dùng hiện tại
 *     tags: [Notifications Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Đánh dấu tất cả đã đọc thành công
 */
router.post('/read-all', authMiddleware, checkPermission('notifications:read'), notificationController.markAllRead);

module.exports = router;
