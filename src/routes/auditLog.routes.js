const express = require('express');
const auditLogController = require('../controllers/auditLog.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: Các API truy vấn lịch sử thao tác - Yêu cầu quyền quản lý.
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Lấy danh sách lịch sử thao tác hệ thống (chỉ Admin/Ban Giám Đốc)
 *     tags: [AuditLogs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Lọc theo ID của người dùng thực hiện thao tác
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Lọc theo tên hành động (e.g. auth.login, department.create)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lọc từ thời điểm nào
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lọc đến thời điểm nào
 *     responses:
 *       200:
 *         description: Lấy danh sách log thành công
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
 *                   example: Lấy danh sách lịch sử thao tác thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       actor:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           email:
 *                             type: string
 *                       action:
 *                         type: string
 *                       target:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       metadata:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *       403:
 *         description: Không có quyền truy cập (Chỉ Admin hoặc Ban Giám Đốc)
 */
router.get('/', authMiddleware, checkPermission('audit:read'), auditLogController.getAllLogs);

/**
 * @swagger
 * /audit-logs/actors:
 *   get:
 *     summary: Lấy danh sách người dùng đã từng thực hiện thao tác (chỉ Admin/Ban Giám Đốc)
 *     tags: [AuditLogs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách actor thành công
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
 *                   example: Lấy danh sách người thao tác thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/actors', authMiddleware, checkPermission('audit:read'), auditLogController.getAllActors);

module.exports = router;
