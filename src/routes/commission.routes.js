const express = require('express');
const commissionController = require('../controllers/commission.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Commissions Management
 *   description: Các API đối soát hoa hồng của Cộng tác viên (CTV) và quản trị viên (Admin).
 */

/**
 * @swagger
 * /commissions/my:
 *   get:
 *     summary: Lấy danh sách giao dịch hoa hồng của CTV hiện tại
 *     tags: [Commissions Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, paid, cancelled]
 *         description: Lọc theo trạng thái hoa hồng
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên khách hàng hoặc sản phẩm
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/my', authMiddleware, commissionController.getMyCommissions);

/**
 * @swagger
 * /commissions/stats:
 *   get:
 *     summary: Lấy thống kê hiệu suất tháng của CTV hiện tại
 *     tags: [Commissions Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Tháng cần thống kê (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Năm cần thống kê
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
 */
router.get('/stats', authMiddleware, commissionController.getMyStats);

/**
 * @swagger
 * /commissions/admin:
 *   get:
 *     summary: Admin lấy danh sách đối soát hoa hồng toàn hệ thống
 *     tags: [Commissions Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: collaboratorId
 *         schema:
 *           type: string
 *         description: Lọc theo cộng tác viên cụ thể
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, paid, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lấy danh sách đối soát thành công
 */
router.get('/admin', authMiddleware, commissionController.getAllCommissions);

/**
 * @swagger
 * /commissions/admin/{id}/status:
 *   patch:
 *     summary: Admin phê duyệt/thanh toán hoặc hủy giao dịch hoa hồng
 *     tags: [Commissions Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID giao dịch hoa hồng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, paid, cancelled]
 *                 example: approved
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/admin/:id/status', authMiddleware, commissionController.updateStatus);

module.exports = router;
