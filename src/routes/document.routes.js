const express = require('express');
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');
const upload = require('../middlewares/upload');
const multer = require('multer');
const googleDriveService = require('../services/googleDrive.service');
const mongoose = require('mongoose');
const documentCategoryService = require('../services/documentCategory.service');

// Cấu hình lưu trữ bộ nhớ RAM tạm thời phục vụ tải lên Google Drive
const storage = multer.memoryStorage();
const uploadMem = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

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
router.get('/', authMiddleware, checkPermission('documents:read'), documentController.getDocuments);

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
router.get('/:id', authMiddleware, checkPermission('documents:read'), documentController.getDocumentDetail);

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Tạo tài liệu mới (Upload tài liệu từ Frontend)
 *     tags: [Documents Management]
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
 *               - categoryId
 *             properties:
 *               title:
 *                 type: string
 *                 example: Hướng dẫn đăng ký nghỉ phép năm
 *               categoryId:
 *                 type: string
 *                 example: 664df001a1b2c3d4e5f60005
 *               departmentId:
 *                 type: string
 *                 example: 60c72b2f9b1d8b2bad000005
 *               schoolId:
 *                 type: string
 *               productId:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               fileType:
 *                 type: string
 *               isAiTrainingSource:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, pending, active, inactive]
 *                 default: active
 *               permissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Tạo tài liệu thành công
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/', authMiddleware, checkPermission('documents:write'), documentController.createDocument);

/**
 * @swagger
 * /documents/{id}:
 *   patch:
 *     summary: Cập nhật thông tin, trạng thái, hoặc phân quyền tài liệu
 *     tags: [Documents Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của tài liệu cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               departmentId:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               fileType:
 *                 type: string
 *               isAiTrainingSource:
 *                 type: boolean
 *               status:
 *                 type: string
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: ID sai định dạng hoặc dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy tài liệu
 *       401:
 *         description: Chưa đăng nhập
 */
router.patch('/:id', authMiddleware, checkPermission('documents:write'), documentController.updateDocument);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Xóa mềm tài liệu khỏi hệ thống
 *     tags: [Documents Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongoose ID của tài liệu cần xóa
 *     responses:
 *       200:
 *         description: Xóa tài liệu thành công
 *       400:
 *         description: ID sai định dạng
 *       404:
 *         description: Không tìm thấy tài liệu
 *       401:
 *         description: Chưa đăng nhập
 */
router.delete('/:id', authMiddleware, checkPermission('documents:write'), documentController.deleteDocument);

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Tải file lên Google Drive
 *     tags: [Documents Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Tệp tin cần tải lên (PDF, Word, Excel, Slide, Image, v.v...)
 *     responses:
 *       200:
 *         description: Tải file lên máy chủ thành công
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
 *                   example: Tải file lên máy chủ thành công.
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileUrl:
 *                       type: string
 *                       example: /uploads/17154238-file.pdf
 *                     fileType:
 *                       type: string
 *                       example: pdf
 *                     fileName:
 *                       type: string
 *                       example: file.pdf
 *       400:
 *         description: Vui lòng cung cấp file cần tải lên
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       500:
 *         description: Lỗi máy chủ khi tải file
 */
router.post('/upload', authMiddleware, checkPermission('documents:write'), uploadMem.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp file cần tải lên.' });
    }

    const { categoryId } = req.body;
    let parentFolderId = null;

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      const category = await documentCategoryService.findById(categoryId);
      if (category) {
        if (category.googleDriveFolderId) {
          parentFolderId = category.googleDriveFolderId;
        } else {
          // Tạo thư mục mới trên Google Drive
          try {
            parentFolderId = await googleDriveService.createFolder(category.name);
            // Cập nhật lại vào DocumentCategory
            await documentCategoryService.update(categoryId, { googleDriveFolderId: parentFolderId });
          } catch (folderError) {
            console.error('Lỗi tự động tạo thư mục danh mục trên Google Drive:', folderError);
            // Fallback về thư mục gốc nếu tạo lỗi
            parentFolderId = null;
          }
        }
      }
    }

    // Tải file trực tiếp lên Google Drive
    const uploadResult = await googleDriveService.uploadFile(req.file, parentFolderId);

    return res.status(200).json({
      success: true,
      message: 'Tải file lên Google Drive thành công.',
      data: {
        fileUrl: uploadResult.webViewLink,
        fileType: req.file.originalname.split('.').pop().toLowerCase(),
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ khi tải file lên Google Drive.', 
      error: error.message 
    });
  }
});

module.exports = router;
