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
 *               apiKey:
 *                 type: string
 *                 description: API Key của Gemini/OpenAI. Chỉ gửi khi muốn THIẾT LẬP/THAY ĐỔI key - để trống hoặc bỏ qua trường này để giữ nguyên key đã lưu. Dùng route DELETE /system-settings/chat/api-key để xoá hẳn key.
 *               model:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               welcomeMessage:
 *                 type: string
 *               companyKnowledgeBase:
 *                 type: string
 *                 description: Kiến thức nền về công ty (dùng cho cả 2 chế độ trò chuyện)
 *               customerCareSystemPrompt:
 *                 type: string
 *                 description: Giọng điệu/persona dành cho khách hàng, CTV, Đại lý
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post('/chat', authMiddleware, checkPermission('settings:manage'), systemSettingController.updateChatSettings);

/**
 * @swagger
 * /system-settings/chat/api-key:
 *   delete:
 *     summary: Xoá API Key của Chatbot AI khỏi hệ thống (để tránh lộ dữ liệu, Chatbot sẽ ngừng hoạt động cho tới khi nhập lại key mới)
 *     tags: [System Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Đã xoá API Key thành công
 */
router.delete('/chat/api-key', authMiddleware, checkPermission('settings:manage'), systemSettingController.clearChatApiKey);

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
