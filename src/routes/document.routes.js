const express = require('express');
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documents Management
 *   description: Các API quản lý danh sách tài liệu, biểu mẫu và phân quyền truy cập (Documents CRUD)
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Lấy danh sách tài liệu có phân trang và bộ lọc theo danh mục
 *     tags: [Documents Management]
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
 *         description: Số lượng bản ghi tối đa trên một trang
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Mã Mongoose ID danh mục để lọc tài liệu (Hoặc 'all' để lấy tất cả)
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
 *                   example: Lấy danh sách tài liệu thành công.
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 664df123a1b2c3d4e5f60003
 *                           title:
 *                             type: string
 *                             example: Slide bài giảng Kỹ thuật Lập trình Python
 *                           fileUrl:
 *                             type: string
 *                             example: https://drive.google.com/uc?id=1a2b3c4d5e6f7g8h9i
 *                           fileType:
 *                             type: string
 *                             example: pptx
 *                           isAiTrainingSource:
 *                             type: boolean
 *                             example: true
 *                           status:
 *                             type: string
 *                             example: active
 *                           categoryId:
 *                             type: string
 *                             example: 664df001a1b2c3d4e5f60007
 *                           category:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 664df001a1b2c3d4e5f60007
 *                               name:
 *                                 type: string
 *                                 example: Slide & Bài giảng điện tử
 *                     total:
 *                       type: integer
 *                       example: 1
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     pages:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 */
router.get('/', authMiddleware, documentController.getDocuments);

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Lấy chi tiết tài liệu phục vụ chức năng preview/xem trước
 *     tags: [Documents Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của tài liệu cần lấy chi tiết
 *     responses:
 *       200:
 *         description: Lấy chi tiết tài liệu thành công
 *       400:
 *         description: ID tài liệu sai định dạng
 *       404:
 *         description: Không tìm thấy tài liệu
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/:id', authMiddleware, documentController.getDocumentDetail);

module.exports = router;
