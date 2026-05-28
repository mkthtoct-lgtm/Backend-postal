const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users Management
 *   description: Các API quản lý thông tin tài khoản người dùng/nhân viên (CRUD Users) - Yêu cầu bảo mật Bearer JWT.
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách toàn bộ người dùng hoạt động (Có phân trang, tìm kiếm)
 *     tags: [Users Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại cần lấy
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng bản ghi trên một trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo họ tên hoặc email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Lọc người dùng theo trạng thái hoạt động
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
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
 *                   example: Lấy danh sách người dùng thành công.
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 */
router.get('/', authMiddleware, userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết một người dùng theo ID
 *     tags: [Users Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của người dùng cần lấy
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       400:
 *         description: Định dạng ID không hợp lệ
 *       404:
 *         description: Người dùng không tồn tại hoặc đã bị xóa mềm
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/:id', authMiddleware, userController.getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Cập nhật thông tin chi tiết tài khoản người dùng
 *     tags: [Users Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của người dùng cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Trần Văn B (Cập nhật)
 *               phone:
 *                 type: string
 *                 example: 0912345678
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tranvanb_new@example.com
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               roleId:
 *                 type: string
 *               departmentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Trùng lặp email với tài khoản khác hoặc ID sai định dạng
 *       404:
 *         description: Người dùng không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.put('/:id', authMiddleware, userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Xóa mềm tài khoản người dùng (chỉ ẩn, không xóa thật trong DB)
 *     tags: [Users Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của người dùng cần xóa mềm
 *     responses:
 *       200:
 *         description: Xóa mềm thành công
 *       400:
 *         description: ID sai định dạng
 *       404:
 *         description: Người dùng không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.delete('/:id', authMiddleware, userController.deleteUser);

module.exports = router;
