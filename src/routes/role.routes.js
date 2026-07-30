const express = require('express');
const roleController = require('../controllers/role.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Các API quản lý vai trò và phân quyền (Roles & Permissions) - Yêu cầu xác thực Bearer JWT.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RoleResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 69fc5af582ef85451120772a
 *         name:
 *           type: string
 *           example: Trưởng phòng nghiệp vụ
 *         slug:
 *           type: string
 *           example: truong-phong-nghiep-vu
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["departments:read", "documents:read"]
 *         description:
 *           type: string
 *           example: Quản lý nghiệp vụ của phòng ban.
 *         userCount:
 *           type: integer
 *           example: 5
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Lấy danh sách toàn bộ vai trò kèm số lượng user đang thuộc vai trò đó
 *     tags: [Roles]
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
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách vai trò thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoleResponse'
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/', authMiddleware, checkPermission('roles:read'), roleController.getAllRoles);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết của một vai trò
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của vai trò
 *     responses:
 *       200:
 *         description: Lấy thông tin chi tiết vai trò thành công
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
 *                   example: Lấy chi tiết vai trò thành công.
 *                 data:
 *                   $ref: '#/components/schemas/RoleResponse'
 *       400:
 *         description: ID vai trò không hợp lệ
 *       404:
 *         description: Vai trò không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 */
router.get('/:id', authMiddleware, checkPermission('roles:read'), roleController.getRoleById);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Tạo mới một vai trò (chỉ Admin hoặc người có quyền)
 *     tags: [Roles]
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
 *                 example: Marketing Manager
 *               slug:
 *                 type: string
 *                 example: marketing-manager
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["documents:read", "notifications:write"]
 *               description:
 *                 type: string
 *                 example: Quản lý chiến dịch tiếp thị và đăng thông báo tin tức.
 *     responses:
 *       201:
 *         description: Tạo vai trò thành công
 *       400:
 *         description: Thiếu dữ liệu, tên hoặc slug trùng lặp
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền ghi
 */
router.post('/', authMiddleware, checkPermission('roles:write'), roleController.createRole);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Cập nhật thông tin một vai trò
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của vai trò cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Marketing Lead
 *               slug:
 *                 type: string
 *                 example: marketing-lead
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["documents:read", "notifications:write", "documents:write"]
 *               description:
 *                 type: string
 *                 example: Vai trò trưởng phòng tiếp thị.
 *     responses:
 *       200:
 *         description: Cập nhật vai trò thành công
 *       400:
 *         description: Tên/slug bị trùng lặp hoặc cố ý đổi slug của vai trò hệ thống
 *       404:
 *         description: Vai trò không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền ghi
 */
router.put('/:id', authMiddleware, checkPermission('roles:write'), roleController.updateRole);

/**
 * @swagger
 * /roles/{id}/toggle-visibility:
 *   patch:
 *     summary: Bật/Tắt ẩn vai trò (Đảo ngược trường isHidden - chỉ Admin)
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của vai trò cần thay đổi trạng thái ẩn/hiện
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái hiển thị thành công
 *       400:
 *         description: ID không hợp lệ hoặc cố ẩn vai trò hệ thống mặc định
 *       404:
 *         description: Vai trò không tồn tại
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền ghi
 */
router.patch('/:id/toggle-visibility', authMiddleware, checkPermission('roles:write'), roleController.toggleVisibility);

module.exports = router;
