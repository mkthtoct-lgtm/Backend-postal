const express = require('express');
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

const Role = require('../models/Role');

// Middleware đánh dấu có phải manager không (kiểm tra động qua quyền products:write hoặc wildcard *)
const markManagerMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.roleId) {
      req.isManager = false;
      return next();
    }
    const role = await Role.findById(req.user.roleId);
    req.isManager = !!(role && (role.permissions.includes('*') || role.permissions.includes('products:write')));
    next();
  } catch (error) {
    req.isManager = false;
    next();
  }
};

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Các API quản lý sản phẩm dịch vụ (CRUD Products)
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Lấy danh sách sản phẩm (có tìm kiếm và lọc)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc mô tả sản phẩm
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [duhocduc, dinhcu, visa, daotaongonngu, nophosoonline]
 *         description: Lọc theo loại sản phẩm
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Đang mở, Tạm dừng, Đã đóng]
 *         description: Lọc theo trạng thái sản phẩm
 *     responses:
 *       200:
 *         description: Lấy danh sách sản phẩm thành công
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
 *                   example: Lấy danh sách sản phẩm thành công.
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 */
router.get('/', authMiddleware, markManagerMiddleware, (req, res, next) => {
  // Manager thấy tất cả sản phẩm kể cả đã ẩn
  // User thường chỉ thấy sản phẩm đang active
  if (!req.isManager && req.query.isActive === undefined) {
    req.query.isActive = 'true';
  }
  next();
}, productController.getAll);

router.get('/:id', authMiddleware, markManagerMiddleware, (req, res, next) => {
  if (!req.isManager) {
    req.query._restrictHidden = 'true';
  }
  next();
}, productController.getById);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Tạo sản phẩm mới (Chỉ Admin)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/ProductInput'
 *               - type: object
 *                 properties:
 *                   image:
 *                     type: string
 *                     format: binary
 *                     description: File ảnh sản phẩm (tùy chọn). Có thể bỏ qua nếu dùng field "image" dạng URL string.
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Tạo sản phẩm thành công
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
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (Không phải Admin)
 */
router.post('/', authMiddleware, checkPermission('products:write'), upload.single('image'), productController.create);

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Cập nhật thông tin sản phẩm (Chỉ Admin)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID của sản phẩm cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/ProductInput'
 *               - type: object
 *                 properties:
 *                   image:
 *                     type: string
 *                     format: binary
 *                     description: File ảnh mới (tùy chọn). Nếu không gửi, ảnh cũ được giữ nguyên.
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Cập nhật sản phẩm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.patch('/:id', authMiddleware, checkPermission('products:write'), upload.single('image'), productController.update);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Xóa mềm sản phẩm khỏi hệ thống (Chỉ Admin)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID của sản phẩm cần xóa
 *     responses:
 *       200:
 *         description: Xóa sản phẩm thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.delete('/:id', authMiddleware, checkPermission('products:write'), productController.delete);

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 664df001a1b2c3d4e5f60099
 *         name:
 *           type: string
 *           example: Du học nghề Đức
 *         shortCode:
 *           type: string
 *           example: VIS-CA-01
 *           description: Mã ngắn sản phẩm
 *         visaCode:
 *           type: string
 *           example: CA-TRV-TOUR-SGL
 *           description: Mã visa
 *         purpose:
 *           type: string
 *           example: Du lịch/Thăm thân
 *           description: Mục đích phân loại visa
 *         type:
 *           type: string
 *           enum: [duhocduc, dinhcu, visa, daotaongonngu, nophosoonline]
 *           example: duhocduc
 *         status:
 *           type: string
 *           enum: [Đang mở, Tạm dừng, Đã đóng]
 *           example: Đang mở
 *         description:
 *           type: string
 *           example: Chương trình tư vấn, chuẩn bị hồ sơ và lộ trình học nghề tại Đức.
 *         image:
 *           type: string
 *           example: /uploads/1781224970009-abc123-product.png
 *           description: Đường dẫn ảnh đại diện sản phẩm (truy cập qua /uploads/...)
 *         conditions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Tốt nghiệp THPT", "Chứng chỉ tiếng Đức B1"]
 *         costs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Phí dịch vụ HTO
 *               amount:
 *                 type: string
 *                 example: 5.000.000 VNĐ
 *         process:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Tư vấn ngành", "Ký hợp đồng", "Nộp hồ sơ"]
 *         requiredDocuments:
 *           $ref: '#/components/schemas/RequiredDocuments'
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
 *     ProductInput:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           example: Du học nghề Đức
 *         shortCode:
 *           type: string
 *           example: VIS-CA-01
 *           description: Mã ngắn sản phẩm (ví dụ VIS-CA-01)
 *         visaCode:
 *           type: string
 *           example: CA-TRV-TOUR-SGL
 *           description: Mã visa (ví dụ CA-TRV-TOUR-SGL)
 *         purpose:
 *           type: string
 *           example: Du lịch/Thăm thân
 *           description: Mục đích phân loại visa (ví dụ Du lịch/Thăm thân)
 *         type:
 *           type: string
 *           enum: [duhocduc, dinhcu, visa, daotaongonngu, nophosoonline]
 *           example: duhocduc
 *         status:
 *           type: string
 *           enum: [Đang mở, Tạm dừng, Đã đóng]
 *           default: Đang mở
 *         description:
 *           type: string
 *           example: Mô tả chi tiết sản phẩm
 *         image:
 *           type: string
 *           example: /uploads/1781224970009-abc123-product.png
 *           description: Đường dẫn / URL ảnh đại diện sản phẩm (dạng string). Bỏ qua nếu upload file qua field "image" (binary).
 *         conditions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Tốt nghiệp THPT", "Chứng chỉ tiếng Đức B1"]
 *         costs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               amount:
 *                 type: string
 *           example: [{"name": "Phí dịch vụ HTO", "amount": "5.000.000 VNĐ"}]
 *         process:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Tư vấn ngành", "Ký hợp đồng", "Nộp hồ sơ"]
 *         requiredDocuments:
 *           $ref: '#/components/schemas/RequiredDocuments'
 *     RequiredDocuments:
 *       type: object
 *       properties:
 *         personal:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DocumentItem'
 *         work:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DocumentItem'
 *         financial:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DocumentItem'
 *         administrative:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DocumentItem'
 *         trip:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DocumentItem'
 *         specialNotes:
 *           type: string
 *           example: "Lưu ý đặc thù của quốc gia này..."
 *     DocumentItem:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Hộ chiếu bản gốc"
 *         note:
 *           type: string
 *           example: "Còn hạn trên 6 tháng"
 *         isRequired:
 *           type: boolean
 *           example: true
 */

module.exports = router;