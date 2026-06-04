const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Các API liên quan đến quản lý xác thực tài khoản (Register, Login, Refresh, Logout, Forgot/Reset Password)
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Đăng ký tài khoản người dùng mới
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenhuana@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: Matkhau123
 *     responses:
 *       201:
 *         description: Đăng ký tài khoản thành công
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
 *                   example: Đăng ký tài khoản thành công.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 60c72b2f9b1d8b2bad000002
 *                     fullName:
 *                       type: string
 *                       example: Nguyễn Văn A
 *                     email:
 *                       type: string
 *                       example: nguyenhuana@example.com
 *                     avatarUrl:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     roleId:
 *                       type: string
 *                       example: 60c72b2f9b1d8b2bad000001
 *                     departmentId:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     status:
 *                       type: string
 *                       example: active
 *       400:
 *         description: Thông tin đầu vào không hợp lệ hoặc email đã tồn tại
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/register-profile:
 *   post:
 *     summary: Cập nhật thông tin bổ sung sau khi đăng ký tài khoản thành công
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 60c72b2f9b1d8b2bad000002
 *               phone:
 *                 type: string
 *                 example: 0901234567
 *               socialLink:
 *                 type: string
 *                 example: https://facebook.com/username
 *               city:
 *                 type: string
 *                 example: TP. Hồ Chí Minh
 *               ward:
 *                 type: string
 *                 example: Phường Bến Thành
 *               addressDetail:
 *                 type: string
 *                 example: 123 Nguyễn Du
 *               referralCode:
 *                 type: string
 *                 example: GT1234
 *     responses:
 *       200:
 *         description: Bổ sung thông tin thành công
 *       400:
 *         description: Thông tin đầu vào không hợp lệ
 */
router.post('/register-profile', authController.registerProfile);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập vào hệ thống
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenhuana@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Matkhau123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về Access Token và Refresh Token
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
 *                   example: Đăng nhập hệ thống thành công.
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refresh_token:
 *                       type: string
 *                       example: d345b8cf896...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 60c72b2f9b1d8b2bad000002
 *                         fullName:
 *                           type: string
 *                           example: Nguyễn Văn A
 *                         email:
 *                           type: string
 *                           example: nguyenhuana@example.com
 *                         avatarUrl:
 *                           type: string
 *                           nullable: true
 *                         roleId:
 *                           type: string
 *                           example: 60c72b2f9b1d8b2bad000001
 *                         status:
 *                           type: string
 *                           example: active
 *       401:
 *         description: Sai email hoặc mật khẩu, hoặc tài khoản đã bị khóa
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Làm mới token truy cập (Access Token) bằng Refresh Token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: d345b8cf896...
 *     responses:
 *       200:
 *         description: Làm mới token thành công, trả về bộ token mới
 *       401:
 *         description: Refresh Token hết hạn hoặc không hợp lệ
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất khỏi hệ thống và vô hiệu hóa Refresh Token hiện tại
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: d345b8cf896...
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Yêu cầu khôi phục mật khẩu gửi mã qua email liên kết
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenhuana@example.com
 *     responses:
 *       200:
 *         description: Phản hồi luôn thành công vì lý do bảo mật để tránh rò rỉ email
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Thiết lập mật khẩu mới dựa trên mã liên kết đã gửi qua email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: 32_characters_random_hex_token
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: Matkhaumoi123
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công và thu hồi tất cả phiên đăng nhập khác
 *       400:
 *         description: Token hết hạn, không hợp lệ hoặc mật khẩu quá ngắn
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Lấy thông tin tài khoản của người dùng đang đăng nhập
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
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
 *                     sub:
 *                       type: string
 *                       example: 60c72b2f9b1d8b2bad000002
 *                     email:
 *                       type: string
 *                       example: nguyenhuana@example.com
 *                     roleId:
 *                       type: string
 *                       example: 60c72b2f9b1d8b2bad000001
 *                     departmentId:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Chưa đăng nhập, token hết hạn hoặc sai định dạng
 */
router.get('/me', authMiddleware, authController.me);

module.exports = router;
