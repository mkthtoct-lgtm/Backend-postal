const express = require('express');
const schoolController = require('../controllers/school.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Schools
 *   description: Các API tra cứu thông tin trường học du học (đồng bộ từ Google Sheets)
 */

/**
 * @swagger
 * /schools:
 *   get:
 *     summary: Lấy danh sách trường học du học đồng bộ trực tiếp từ Google Sheet
 *     tags: [Schools]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm nhanh theo tên trường, chuyên ngành, điều kiện...
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Lọc theo Khu vực (Đài Bắc, Đài Trung, Đài Nam, Cao Hùng...)
 *       - in: query
 *         name: admissionSystem
 *         schema:
 *           type: string
 *         description: Lọc theo Hệ tuyển sinh (1+4, VHVL...)
 *     responses:
 *       200:
 *         description: Lấy danh sách trường học thành công
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
 *                   example: Lấy danh sách trường du học thành công.
 *                 data:
 *                   type: object
 *                   properties:
 *                     headers:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "Tên trường"
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                       example: 54
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/tabs', authMiddleware, schoolController.getSpreadsheetTabs);
router.get('/', authMiddleware, schoolController.getAllSchools);

module.exports = router;
