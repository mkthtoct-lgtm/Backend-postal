const express = require('express');
const leadController = require('../controllers/lead.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Leads Management
 *   description: Các API quản lý leads khách hàng và đồng bộ sang CRM (Bizfly CRM).
 */

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Cộng tác viên (CTV) gửi Lead thông tin khách hàng mới
 *     tags: [Leads Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - phone
 *             properties:
 *               customerName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *                 description: Họ và tên của khách hàng tiềm năng
 *               phone:
 *                 type: string
 *                 example: "0987654321"
 *                 description: Số điện thoại của khách hàng
 *               email:
 *                 type: string
 *                 example: vana@example.com
 *                 description: Địa chỉ email của khách hàng
 *               source:
 *                 type: string
 *                 example: Website
 *                 description: Nguồn tiếp cận khách hàng
 *               productInterest:
 *                 type: string
 *                 example: Du học Đức
 *                 description: Dịch vụ khách hàng quan tâm
 *               countryInterest:
 *                 type: string
 *                 example: Đức
 *                 description: Quốc gia khách hàng hướng tới
 *               budgetRange:
 *                 type: string
 *                 example: 200-300 triệu
 *                 description: Mức ngân sách ước tính
 *               urgency:
 *                 type: string
 *                 example: Trong 1-3 tháng
 *                 description: Mức độ cấp thiết của nhu cầu
 *               preferredContact:
 *                 type: string
 *                 example: Zalo/Điện thoại
 *                 description: Kênh liên hệ ưu tiên
 *               note:
 *                 type: string
 *                 example: Cần tư vấn lộ trình học chứng chỉ B1.
 *                 description: Ghi chú thêm
 *     responses:
 *       201:
 *         description: Gửi lead thành công, tự động lưu DB và đẩy sang BizFly CRM Webhook
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
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Thiếu thông tin bắt buộc hoặc dữ liệu sai định dạng
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/', authMiddleware, leadController.createLead);

/**
 * @swagger
 * /leads/my:
 *   get:
 *     summary: Lấy danh sách leads do chính Cộng tác viên đang đăng nhập gửi lên
 *     tags: [Leads Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo tên hoặc SĐT khách hàng
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [dang_tu_van, cho_chot_hop_dong, xu_ly_ho_so, lost]
 *         description: Lọc leads theo trạng thái
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
 *                     $ref: '#/components/schemas/Lead'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/my', authMiddleware, leadController.getMyLeads);

/**
 * @swagger
 * /leads:
 *   get:
 *     summary: Quản trị viên (Admin) xem danh sách toàn bộ Leads của hệ thống
 *     tags: [Leads Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo tên hoặc SĐT khách hàng
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [dang_tu_van, cho_chot_hop_dong, xu_ly_ho_so, lost]
 *         description: Lọc leads theo trạng thái
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
 *                     $ref: '#/components/schemas/Lead'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (Yêu cầu quyền users:read)
 */
router.get('/', authMiddleware, leadController.getAllLeads);

/**
 * @swagger
 * /leads/{id}/status:
 *   patch:
 *     summary: Admin thay đổi trạng thái của lead để ghi nhận deal (chuyển sang 'xu_ly_ho_so')
 *     tags: [Leads Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của Lead cần thay đổi trạng thái
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [dang_tu_van, cho_chot_hop_dong, xu_ly_ho_so, lost]
 *                 example: xu_ly_ho_so
 *                 description: Trạng thái mới của lead. Chuyển sang 'xu_ly_ho_so' sẽ tính thêm 1 deal thành công cho CTV.
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái lead thành công
 *       400:
 *         description: Trạng thái không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (Yêu cầu quyền users:write)
 *       404:
 *         description: Không tìm thấy lead
 */
router.patch('/:id/status', authMiddleware, checkPermission('users:write'), leadController.updateLeadStatus);

/**
 * @swagger
 * components:
 *   schemas:
 *     Lead:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 60c72b2f9b1d8b2bad000099
 *         collaboratorId:
 *           type: string
 *           description: ID của Cộng tác viên nộp lead
 *           example: 60c72b2f9b1d8b2bad000001
 *         customerName:
 *           type: string
 *           example: Nguyễn Văn A
 *         phone:
 *           type: string
 *           example: "0987654321"
 *         email:
 *           type: string
 *           example: vana@example.com
 *         source:
 *           type: string
 *           example: Website
 *         productInterest:
 *           type: string
 *           example: Du học Đức
 *         countryInterest:
 *           type: string
 *           example: Đức
 *         budgetRange:
 *           type: string
 *           example: 200-300 triệu
 *         urgency:
 *           type: string
 *           example: Trong 1-3 tháng
 *         preferredContact:
 *           type: string
 *           example: Zalo/Điện thoại
 *         note:
 *           type: string
 *           example: Cần tư vấn kỹ
 *         bizflyContactId:
 *           type: string
 *           nullable: true
 *           example: "20199488192"
 *         status:
 *           type: string
 *           enum: [dang_tu_van, cho_chot_hop_dong, xu_ly_ho_so, lost]
 *           example: dang_tu_van
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

module.exports = router;
