const express = require('express');
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chatbot Management
 *   description: Các API giao tiếp với Chatbot sử dụng Google Gemini AI.
 */

/**
 * @swagger
 * /chat/send:
 *   post:
 *     summary: Gửi tin nhắn tới Chatbot và nhận câu trả lời từ Gemini
 *     tags: [Chatbot Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Hãy giới thiệu về bản thân bạn
 *                 description: Nội dung tin nhắn gửi tới AI chatbot
 *     responses:
 *       200:
 *         description: Phản hồi từ AI thành công
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
 *                   example: Phản hồi từ AI thành công.
 *                 data:
 *                   type: object
 *                   properties:
 *                     reply:
 *                       type: string
 *                       example: Xin chào! Tôi là một trợ lý AI...
 *       400:
 *         description: Thiếu nội dung tin nhắn
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/send', authMiddleware, chatController.sendMessage);

module.exports = router;
