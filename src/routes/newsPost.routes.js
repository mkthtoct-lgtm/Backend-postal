const express = require('express');
const newsPostController = require('../controllers/newsPost.controller');
const authMiddleware = require('../middlewares/auth');
const managerOnly = require('../middlewares/managerOnly');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: News & Events Management
 *   description: Các API quản lý tin tức và sự kiện hệ thống (News & Events CRUD)
 */

/**
 * @swagger
 * /news-posts:
 *   get:
 *     summary: Lấy danh sách tin tức & sự kiện có bộ lọc và tìm kiếm (Public)
 *     tags: [News & Events Management]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo tiêu đề, danh mục, tóm tắt hoặc địa điểm
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, news, event]
 *           default: all
 *         description: Phân loại bài viết
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
 *                   example: Lấy danh sách tin tức & sự kiện thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60c72b2f9b1d8b2bad000099
 *                       title:
 *                         type: string
 *                         example: Webinar Lộ trình du học nghề Đức 2026
 *                       type:
 *                         type: string
 *                         example: event
 *                       category:
 *                         type: string
 *                         example: Du học Đức
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-06-15T00:00:00.000Z"
 *                       location:
 *                         type: string
 *                         example: Online Meet
 *                       status:
 *                         type: string
 *                         example: Sắp diễn ra
 *                       summary:
 *                         type: string
 *                         example: Tóm tắt bài viết giới thiệu
 *                       content:
 *                         type: string
 *                         example: Nội dung đầy đủ chi tiết của sự kiện du học nghề
 *                       image:
 *                         type: string
 *                         example: /assets/images/banner-web-korean.jpg
 *                       author:
 *                         type: string
 *                         example: Phòng Đào tạo
 *                       featured:
 *                         type: boolean
 *                         example: true
 */
router.get('/', newsPostController.getAll);

/**
 * @swagger
 * /news-posts/{id}:
 *   get:
 *     summary: Lấy chi tiết bài viết tin tức hoặc sự kiện bằng ID (Public)
 *     tags: [News & Events Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của bài viết cần lấy chi tiết
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy bài viết
 */
router.get('/:id', newsPostController.getById);

/**
 * @swagger
 * /news-posts:
 *   post:
 *     summary: Tạo mới một bài viết tin tức hoặc sự kiện (Admin/BGĐ)
 *     tags: [News & Events Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - category
 *               - date
 *               - status
 *               - summary
 *               - content
 *               - author
 *             properties:
 *               title:
 *                 type: string
 *                 example: Lộ trình du học nghề Đức 2026
 *               type:
 *                 type: string
 *                 enum: [news, event]
 *                 example: event
 *               category:
 *                 type: string
 *                 example: Du học Đức
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-15"
 *               location:
 *                 type: string
 *                 example: Online Meet
 *               status:
 *                 type: string
 *                 example: Sắp diễn ra
 *               summary:
 *                 type: string
 *                 example: Tóm tắt bài viết giới thiệu
 *               content:
 *                 type: string
 *                 example: Nội dung đầy đủ chi tiết của sự kiện du học nghề
 *               image:
 *                 type: string
 *                 example: /assets/images/banner-web-korean.jpg
 *               author:
 *                 type: string
 *                 example: Phòng Đào tạo
 *               featured:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tạo bài viết thành công
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền (Chỉ Admin/BGĐ)
 */
router.post('/', authMiddleware, managerOnly, newsPostController.create);

/**
 * @swagger
 * /news-posts/{id}:
 *   patch:
 *     summary: Cập nhật thông tin bài viết tin tức hoặc sự kiện (Admin/BGĐ)
 *     tags: [News & Events Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của bài viết cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [news, event]
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *               summary:
 *                 type: string
 *               content:
 *                 type: string
 *               image:
 *                 type: string
 *               author:
 *                 type: string
 *               featured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy bài viết
 */
router.patch('/:id', authMiddleware, managerOnly, newsPostController.update);

/**
 * @swagger
 * /news-posts/{id}:
 *   delete:
 *     summary: Xóa bài viết tin tức hoặc sự kiện bằng ID (Admin/BGĐ)
 *     tags: [News & Events Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của bài viết cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy bài viết
 */
router.delete('/:id', authMiddleware, managerOnly, newsPostController.delete);

module.exports = router;
