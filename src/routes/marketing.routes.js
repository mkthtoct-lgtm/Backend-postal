const express = require('express');
const marketingController = require('../controllers/marketing.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Marketing Automation
 *   description: Tự động hoá chăm sóc & giữ chân khách hàng (rule-based, không dùng AI) - chăm sóc lead đang tư vấn, cảm ơn sau chuyển đổi, tái kết nối lead đã đóng, bản tin tự động, hủy nhận email.
 */

/**
 * @swagger
 * /marketing/unsubscribe/{leadId}:
 *   get:
 *     summary: "[Public] Hủy nhận email marketing/bản tin - dùng trong link email, không cần đăng nhập"
 *     tags: [Marketing Automation]
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trang xác nhận đã hủy nhận (HTML)
 *       404:
 *         description: Không tìm thấy lead tương ứng (HTML)
 */
router.get('/unsubscribe/:leadId', marketingController.unsubscribe);

/**
 * @swagger
 * /marketing/overview:
 *   get:
 *     summary: Lấy cấu hình hiện tại và số liệu tổng quan của Marketing Automation
 *     tags: [Marketing Automation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy tổng quan thành công
 */
router.get('/overview', authMiddleware, checkPermission('settings:manage'), marketingController.getOverview);

/**
 * @swagger
 * /marketing/config:
 *   post:
 *     summary: Cập nhật cấu hình Marketing Automation
 *     tags: [Marketing Automation]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled: { type: boolean }
 *               nurtureEnabled: { type: boolean }
 *               nurtureFirstDays: { type: number, example: 2 }
 *               nurtureSecondDays: { type: number, example: 5 }
 *               thankYouEnabled: { type: boolean }
 *               winBackEnabled: { type: boolean }
 *               winBackDays: { type: number, example: 45 }
 *               newsletterBroadcastEnabled: { type: boolean }
 *               newsletterMaxRecipients: { type: number, example: 500 }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post('/config', authMiddleware, checkPermission('settings:manage'), marketingController.updateConfig);

/**
 * @swagger
 * /marketing/run-now:
 *   post:
 *     summary: Chạy thủ công ngay lập tức các tác vụ Marketing Automation định kỳ (chăm sóc + tái kết nối)
 *     tags: [Marketing Automation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Đã chạy kiểm tra thành công
 */
router.post('/run-now', authMiddleware, checkPermission('settings:manage'), marketingController.runNow);

module.exports = router;
