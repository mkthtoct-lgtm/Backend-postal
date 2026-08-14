const express = require('express');
const router = express.Router();
const driveController = require('../controllers/drive.controller');

// GET /api/v1/drive/:fileId
// Lấy luồng dữ liệu (stream) ảnh từ Google Drive
router.get('/:fileId', driveController.streamFile);

module.exports = router;
