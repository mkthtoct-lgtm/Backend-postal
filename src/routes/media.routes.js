const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const upload = require('../middlewares/upload');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

// --- PUBLIC ROUTES (No authMiddleware) ---
// Yêu cầu JWT xác thực riêng biệt qua req.query.token
router.get('/stream', mediaController.stream);

// Áp dụng authMiddleware cho tất cả các route bên dưới
router.use(authMiddleware);

// --- PROTECTED ROUTES ---
// Lấy Token truy cập ngắn hạn (Access URL)
router.get('/:id/access', checkPermission('media.read'), mediaController.getAccess);

// Lấy danh sách Media (có phân trang & lọc)
router.get('/', checkPermission('media.read'), mediaController.getAll);

// Lấy chi tiết Media
router.get('/:id', checkPermission('media.read'), mediaController.getById);

// --- CREATE ROUTES ---
// Image (Default)
router.post('/', checkPermission('media.create'), upload.uploadImage.single('thumbnail'), mediaController.create);
// Document
router.post('/document', checkPermission('media.create'), upload.uploadDocument.single('thumbnail'), mediaController.create);
// Video
router.post('/video', checkPermission('media.create'), upload.uploadVideo.single('thumbnail'), mediaController.create);

// --- UPDATE ROUTES ---
// Image (Default)
router.put('/:id', checkPermission('media.update'), upload.uploadImage.single('thumbnail'), mediaController.update);
// Document
router.put('/document/:id', checkPermission('media.update'), upload.uploadDocument.single('thumbnail'), mediaController.update);
// Video
router.put('/video/:id', checkPermission('media.update'), upload.uploadVideo.single('thumbnail'), mediaController.update);

// Xóa Media
router.delete('/:id', checkPermission('media.delete'), mediaController.delete);

module.exports = router;
