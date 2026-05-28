const express = require('express');
const productCategoryController = require('../controllers/productCategory.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Middleware kiểm tra quyền Admin
const adminOnlyMiddleware = (req, res, next) => {
  const ADMIN_ROLE_ID = '69fc5af582ef85451120772a';
  if (req.user && req.user.roleId === ADMIN_ROLE_ID) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Từ chối truy cập: Bạn không có quyền quản lý danh mục sản phẩm.',
    });
  }
};

/**
 * @swagger
 * tags:
 *   name: Product Categories
 *   description: Các API quản lý danh mục sản phẩm (CRUD Product Categories)
 */

/**
 * @swagger
 * /product-categories:
 *   get:
 *     summary: Lấy danh sách toàn bộ danh mục sản phẩm chưa bị xóa mềm
 *     tags: [Product Categories]
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
 *                   example: Lấy danh sách danh mục sản phẩm thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 664df001a1b2c3d4e5f60009
 *                       name:
 *                         type: string
 *                         example: Visa Du học
 *                       description:
 *                         type: string
 *                         example: Các chương trình du học các nước
 *                       status:
 *                         type: string
 *                         example: active
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 */
router.get('/', authMiddleware, productCategoryController.getAllCategories);

/**
 * @swagger
 * /product-categories:
 *   post:
 *     summary: Tạo mới danh mục sản phẩm (Chỉ Admin)
 *     tags: [Product Categories]
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
 *                 example: Định cư & Đầu tư
 *               description:
 *                 type: string
 *                 example: Các chương trình định cư nước ngoài diện đầu tư
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 default: active
 *     responses:
 *       201:
 *         description: Tạo mới danh mục sản phẩm thành công
 *       400:
 *         description: Tên danh mục bị trống hoặc trùng lặp tên
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (Không phải Admin)
 */
router.post('/', authMiddleware, adminOnlyMiddleware, productCategoryController.createCategory);

/**
 * @swagger
 * /product-categories/{id}:
 *   patch:
 *     summary: Cập nhật thông tin danh mục sản phẩm (Chỉ Admin)
 *     tags: [Product Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của danh mục sản phẩm cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Định cư & Đầu tư (Cập nhật)
 *               description:
 *                 type: string
 *                 example: Mô tả mới chi tiết hơn
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: Cập nhật danh mục thành công
 *       400:
 *         description: ID không hợp lệ hoặc trùng tên với danh mục khác
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy danh mục sản phẩm
 */
router.patch('/:id', authMiddleware, adminOnlyMiddleware, productCategoryController.updateCategory);

/**
 * @swagger
 * /product-categories/{id}:
 *   delete:
 *     summary: Xóa mềm danh mục sản phẩm khỏi hệ thống (Chỉ Admin)
 *     tags: [Product Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của danh mục sản phẩm cần xóa mềm
 *     responses:
 *       200:
 *         description: Xóa danh mục sản phẩm thành công
 *       400:
 *         description: ID không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy danh mục sản phẩm
 */
router.delete('/:id', authMiddleware, adminOnlyMiddleware, productCategoryController.deleteCategory);

module.exports = router;
