const express = require('express');
const departmentController = require('../controllers/department.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Các API quản lý phòng ban - Yêu cầu xác thực Bearer JWT.
 */

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: Lấy danh sách tất cả phòng ban đang hoạt động (kèm số lượng nhân sự)
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       memberCount:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 */
router.get('/', authMiddleware, checkPermission('departments:read'), departmentController.getAllDepartments);

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Tạo mới phòng ban (chỉ Admin)
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tuyển Sinh
 *               description:
 *                 type: string
 *                 example: Tư vấn, tiếp nhận và chăm sóc hồ sơ đầu vào.
 *     responses:
 *       201:
 *         description: Tạo phòng ban thành công
 *       400:
 *         description: Thiếu tên hoặc tên đã tồn tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/', authMiddleware, checkPermission('departments:write'), departmentController.createDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   patch:
 *     summary: Cập nhật thông tin phòng ban (chỉ Admin)
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của phòng ban cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tuyển Sinh (Đã cập nhật)
 *               description:
 *                 type: string
 *                 example: Mô tả mới cho phòng ban.
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: ID không hợp lệ hoặc tên trùng lặp
 *       404:
 *         description: Phòng ban không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.patch('/:id', authMiddleware, checkPermission('departments:write'), departmentController.updateDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Ẩn phòng ban và gỡ nhân sự khỏi phòng ban (chỉ Admin)
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của phòng ban cần ẩn
 *     responses:
 *       200:
 *         description: Ẩn phòng ban thành công
 *       400:
 *         description: ID không hợp lệ
 *       404:
 *         description: Phòng ban không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.delete('/:id', authMiddleware, checkPermission('departments:write'), departmentController.deleteDepartment);

/**
 * @swagger
 * /departments/{id}/toggle-visibility:
 *   patch:
 *     summary: Bật/Tắt ẩn phòng ban (Đảo ngược trường isHidden - chỉ Admin)
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của phòng ban cần thay đổi trạng thái ẩn/hiện
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái hiển thị thành công
 *       400:
 *         description: ID không hợp lệ
 *       404:
 *         description: Phòng ban không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.patch('/:id/toggle-visibility', authMiddleware, checkPermission('departments:write'), departmentController.toggleVisibility);

module.exports = router;
