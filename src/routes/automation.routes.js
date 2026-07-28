const express = require('express');
const automationController = require('../controllers/automation.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CRM Automation
 *   description: Cấu hình và giám sát các quy trình CRM tự động hoá theo luật (rule-based, không dùng AI) - tự động phân công nhân sự, phát hiện lead trùng lặp, gửi email xác nhận, nhắc nhở lead im lặng, tự động đóng lead quá hạn, nhắc đối soát hoa hồng và gợi ý thăng hạng Cộng tác viên.
 */

/**
 * @swagger
 * /automation/overview:
 *   get:
 *     summary: Lấy cấu hình hiện tại và số liệu tổng quan của CRM Automation
 *     tags: [CRM Automation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy tổng quan thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     config:
 *                       type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         unassignedLeads:
 *                           type: number
 *                         staleLeads:
 *                           type: number
 *                         dueForAutoLost:
 *                           type: number
 *                         recentDuplicates:
 *                           type: number
 *                         overduePendingCommissions:
 *                           type: number
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (Yêu cầu quyền settings:manage)
 */
router.get('/overview', authMiddleware, checkPermission('settings:manage'), automationController.getOverview);

/**
 * @swagger
 * /automation/config:
 *   post:
 *     summary: Cập nhật cấu hình CRM Automation (bật/tắt từng automation và các ngưỡng thời gian)
 *     tags: [CRM Automation]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Công tắc tổng của toàn bộ CRM Automation
 *               autoAssignEnabled:
 *                 type: boolean
 *                 description: Tự động phân công nhân sự nội bộ cho lead không có CTV giới thiệu
 *               duplicateDetectionEnabled:
 *                 type: boolean
 *               duplicateWindowDays:
 *                 type: number
 *                 example: 30
 *               welcomeEmailEnabled:
 *                 type: boolean
 *               internalAlertEnabled:
 *                 type: boolean
 *               staleReminderEnabled:
 *                 type: boolean
 *               staleReminderHours:
 *                 type: number
 *                 example: 24
 *               autoLostEnabled:
 *                 type: boolean
 *               autoLostDays:
 *                 type: number
 *                 example: 14
 *               commissionReminderEnabled:
 *                 type: boolean
 *               commissionPendingReminderDays:
 *                 type: number
 *                 example: 7
 *               rankUpSuggestionEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu cấu hình không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (Yêu cầu quyền settings:manage)
 */
router.post('/config', authMiddleware, checkPermission('settings:manage'), automationController.updateConfig);

/**
 * @swagger
 * /automation/run-now:
 *   post:
 *     summary: Chạy thủ công toàn bộ tác vụ CRM Automation ngay lập tức (không cần chờ chu kỳ chạy nền)
 *     tags: [CRM Automation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Đã chạy kiểm tra thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (Yêu cầu quyền settings:manage)
 */
router.post('/run-now', authMiddleware, checkPermission('settings:manage'), automationController.runNow);

module.exports = router;
