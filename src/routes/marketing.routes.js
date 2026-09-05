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

/**
 * @swagger
 * /marketing/templates:
 *   get:
 *     summary: Lấy danh sách các loại email (CRM nội bộ + Marketing khách hàng) hỗ trợ xem trước/gửi thử
 *     tags: [Marketing Automation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/templates', authMiddleware, checkPermission('settings:manage'), marketingController.listTemplates);

/**
 * @swagger
 * /marketing/preview/{template}:
 *   get:
 *     summary: Xem trước giao diện HTML của 1 loại email bằng dữ liệu mẫu (không gửi email thật)
 *     tags: [Marketing Automation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: template
 *         required: true
 *         schema:
 *           type: string
 *         example: newsletter
 *     responses:
 *       200:
 *         description: Lấy bản xem trước thành công
 *       404:
 *         description: Không tìm thấy loại email mẫu tương ứng
 */
router.get('/preview/:template', authMiddleware, checkPermission('settings:manage'), marketingController.previewTemplate);

/**
 * @swagger
 * /marketing/send-test:
 *   post:
 *     summary: Gửi thật 1 email mẫu (dữ liệu giả lập) tới địa chỉ do Admin chỉ định để kiểm tra hiển thị
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
 *               template: { type: string, example: newsletter }
 *               email: { type: string, example: admin@hto.edu.vn, description: "Bỏ trống để gửi tới email của chính Admin đang đăng nhập" }
 *     responses:
 *       200:
 *         description: Gửi email thử thành công
 *       400:
 *         description: Thiếu email nhận hoặc gửi thất bại
 */
router.post('/send-test', authMiddleware, checkPermission('settings:manage'), marketingController.sendTestEmail);

module.exports = router;
