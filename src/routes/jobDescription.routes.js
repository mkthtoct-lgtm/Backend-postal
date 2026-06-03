const express = require('express');
const jobDescriptionController = require('../controllers/jobDescription.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Job Descriptions
 *   description: Các API quản lý mô tả công việc (Job Descriptions CRUD) - Yêu cầu xác thực Bearer JWT.
 */

/**
 * @swagger
 * /job-descriptions:
 *   get:
 *     summary: Lấy danh sách JD công việc có phân trang và bộ lọc
 *     tags: [Job Descriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo tiêu đề hoặc mô tả
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         description: Lọc theo phòng ban
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/', authMiddleware, checkPermission('job_descriptions:read'), jobDescriptionController.getAllJDs);

/**
 * @swagger
 * /job-descriptions/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết của 1 JD công việc
 *     tags: [Job Descriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của JD công việc
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy JD
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/:id', authMiddleware, checkPermission('job_descriptions:read'), jobDescriptionController.getJDById);

/**
 * @swagger
 * /job-descriptions:
 *   post:
 *     summary: Tạo mới một JD công việc (Chỉ Admin/Ban giám đốc/Trưởng bộ phận/Nhân sự)
 *     tags: [Job Descriptions]
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
 *               - departmentId
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 example: Lập trình viên Node.js
 *               departmentId:
 *                 type: string
 *                 example: 60c72b2f9b1d8b2bad000005
 *               description:
 *                 type: string
 *                 example: Phát triển API backend và tối ưu cơ sở dữ liệu MongoDB
 *               requirements:
 *                 type: string
 *               benefits:
 *                 type: string
 *               salaryRange:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *                   currency:
 *                     type: string
 *               workingType:
 *                 type: string
 *                 enum: [full-time, part-time, remote, hybrid, freelance]
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *     responses:
 *       201:
 *         description: Tạo mới thành công
 *       400:
 *         description: Đầu vào không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 */
router.post('/', authMiddleware, checkPermission('job_descriptions:write'), jobDescriptionController.createJD);

/**
 * @swagger
 * /job-descriptions/{id}:
 *   patch:
 *     summary: Cập nhật thông tin JD công việc
 *     tags: [Job Descriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               departmentId:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: string
 *               benefits:
 *                 type: string
 *               salaryRange:
 *                 type: object
 *               workingType:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy JD
 */
router.patch('/:id', authMiddleware, checkPermission('job_descriptions:write'), jobDescriptionController.updateJD);

/**
 * @swagger
 * /job-descriptions/{id}:
 *   delete:
 *     summary: Xóa mềm một JD công việc
 *     tags: [Job Descriptions]
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
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy JD
 */
router.delete('/:id', authMiddleware, checkPermission('job_descriptions:write'), jobDescriptionController.deleteJD);

module.exports = router;
