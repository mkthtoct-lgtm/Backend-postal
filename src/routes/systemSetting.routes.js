const express = require('express');
const systemSettingController = require('../controllers/systemSetting.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: System Settings
 *   description: Các API quản lý cấu hình hệ thống (Chatbot, Hoa hồng). Chỉ Admin và Ban Giám Đốc được phép truy cập.
 */

/**
 * @swagger
 * /system-settings:
 *   get:
 *     summary: Lấy toàn bộ cấu hình hệ thống hiện tại
 *     tags: [System Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy cấu hình thành công
 */
router.get('/public-chat', authMiddleware, systemSettingController.getPublicChatConfig);
router.get('/', authMiddleware, checkPermission('settings:manage'), systemSettingController.getSettings);

/**
 * @swagger
 * /system-settings/chat:
 *   post:
 *     summary: Cập nhật cấu hình Chatbot AI
 *     tags: [System Settings]
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
 *               model:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               welcomeMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post('/chat', authMiddleware, checkPermission('settings:manage'), systemSettingController.updateChatSettings);

/**
 * @swagger
 * /system-settings/commission:
 *   post:
 *     summary: Cập nhật chính sách hoa hồng deal
 *     tags: [System Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               khachHangThanThiet:
 *                 type: number
 *               daiSuGieoMamDong:
 *                 type: number
 *               daiSuKetNoiBac:
 *                 type: number
 *               daiSuTruCotVang:
 *                 type: number
 *               daiSuTinhAnhKimCuong:
 *                 type: number
 *               daiSuTanTamMaster:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post('/commission', authMiddleware, checkPermission('settings:manage'), systemSettingController.updateCommissionSettings);

module.exports = router;
