const express = require('express');
const documentCategoryController = require('../controllers/documentCategory.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Middleware kiểm tra quyền Admin hoặc Ban Giám Đốc
const adminOnlyMiddleware = (req, res, next) => {
  const ADMIN_ROLE_ID = '69fc5af582ef85451120772a';
  const BOARD_OF_DIRECTORS_ROLE_ID = '69fc5af582ef85451120772b';

  if (req.user && (req.user.roleId === ADMIN_ROLE_ID || req.user.roleId === BOARD_OF_DIRECTORS_ROLE_ID)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Từ chối truy cập: Bạn không có quyền quản lý danh mục tài liệu.',
    });
  }
};

/**
 * @swagger
 * tags:
 *   name: Document Categories
 *   description: Các API quản lý danh mục tài liệu và biểu mẫu (CRUD Document Categories)
 */

/**
 * @swagger
 * /document-categories:
 *   get:
 *     summary: Lấy danh sách toàn bộ danh mục tài liệu
 *     tags: [Document Categories]
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
 *                   example: Lấy danh sách danh mục tài liệu thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 69fc6442da9357571068af14
 *                       name:
 *                         type: string
 *                         example: Pháp lý
 *                       description:
 *                         type: string
 *                         example: Tài liệu pháp lý của công ty
 *                       isHidden:
 *                         type: boolean
 *                         example: false
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', authMiddleware, documentCategoryController.getAllCategories);

/**
 * @swagger
 * /document-categories:
 *   post:
 *     summary: Tạo mới danh mục tài liệu
 *     tags: [Document Categories]
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
 *                 example: Pháp lý
 *               description:
 *                 type: string
 *                 example: Danh mục chứa các văn bản, thông tư pháp lý
 *     responses:
 *       201:
 *         description: Tạo mới thành công
 *       400:
 *         description: Thiếu tên danh mục hoặc trùng tên danh mục
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/', authMiddleware, adminOnlyMiddleware, documentCategoryController.createCategory);

/**
 * @swagger
 * /document-categories/{id}:
 *   patch:
 *     summary: Cập nhật thông tin danh mục tài liệu
 *     tags: [Document Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của danh mục cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pháp lý (Cập nhật)
 *               description:
 *                 type: string
 *                 example: Mô tả mới cho danh mục
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: ID sai định dạng hoặc trùng tên danh mục
 *       404:
 *         description: Không tìm thấy danh mục tài liệu
 *       401:
 *         description: Chưa đăng nhập
 */
router.patch('/:id', authMiddleware, adminOnlyMiddleware, documentCategoryController.updateCategory);

/**
 * @swagger
 * /document-categories/{id}/toggle-visibility:
 *   patch:
 *     summary: Bật/Tắt ẩn danh mục tài liệu (Đảo ngược trường isHidden)
 *     tags: [Document Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của danh mục cần thay đổi trạng thái ẩn/hiện
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái hiển thị thành công
 *       400:
 *         description: ID sai định dạng
 *       404:
 *         description: Không tìm thấy danh mục tài liệu
 *       401:
 *         description: Chưa đăng nhập
 */
router.patch('/:id/toggle-visibility', authMiddleware, adminOnlyMiddleware, documentCategoryController.toggleVisibility);

module.exports = router;
