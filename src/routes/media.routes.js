const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');

// Lấy danh sách Media (có phân trang & lọc)
router.get('/', mediaController.getAll);

// Lấy chi tiết Media
router.get('/:id', mediaController.getById);

// Thêm mới Media
router.post('/', mediaController.create);

// Cập nhật Media
router.put('/:id', mediaController.update);

// Xóa Media
router.delete('/:id', mediaController.delete);

module.exports = router;
