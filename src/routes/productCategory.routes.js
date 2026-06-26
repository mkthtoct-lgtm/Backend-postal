const express = require('express');
const productCategoryController = require('../controllers/productCategory.controller');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();



// Multer upload
const cpUpload = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

/**
 * @swagger
 * tags:
 *   - name: Product Categories
 *     description: Các API quản lý danh mục sản phẩm (CRUD Product Categories)
 */

/**
 * @swagger
 * /product-categories:
 *   get:
 *     summary: Lấy danh sách toàn bộ danh mục sản phẩm
 *     tags:
 *       - Product Categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/',
  authMiddleware,
  productCategoryController.getAllCategories
);

/**
 * @swagger
 * /product-categories:
 *   post:
 *     summary: Tạo mới danh mục sản phẩm (Chỉ Admin)
 *     tags:
 *       - Product Categories
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *                 enum:
 *                   - active
 *                   - inactive
 *                   - suspended
 *                 default: active
 *               coverImage:
 *                 type: string
 *                 format: binary
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Tạo mới danh mục sản phẩm thành công
 *       400:
 *         description: Lỗi dữ liệu đầu vào hoặc trùng tên
 */
router.post(
  '/',
  authMiddleware,
  checkPermission('products:write'),
  cpUpload,
  productCategoryController.createCategory
);

/**
 * @swagger
 * /product-categories/{id}:
 *   patch:
 *     summary: Cập nhật thông tin danh mục sản phẩm (Chỉ Admin)
 *     tags:
 *       - Product Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Mongoose ID của danh mục sản phẩm cần cập nhật
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *                 enum:
 *                   - active
 *                   - inactive
 *                   - suspended
 *               coverImage:
 *                 type: string
 *                 format: binary
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật danh mục thành công
 *       400:
 *         description: ID hoặc dữ liệu không hợp lệ
 */
router.patch(
  '/:id',
  authMiddleware,
  checkPermission('products:write'),
  cpUpload,
  productCategoryController.updateCategory
);

/**
 * @swagger
 * /product-categories/{id}:
 *   delete:
 *     summary: Xóa mềm danh mục sản phẩm khỏi hệ thống (Chỉ Admin)
 *     tags:
 *       - Product Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa danh mục sản phẩm thành công
 */
router.delete(
  '/:id',
  authMiddleware,
  checkPermission('products:write'),
  productCategoryController.deleteCategory
);

module.exports = router;