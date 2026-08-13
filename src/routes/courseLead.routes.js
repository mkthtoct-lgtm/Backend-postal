const express = require('express');
const router = express.Router();
const courseLeadController = require('../controllers/courseLead.controller');
const rateLimit = require('express-rate-limit');

// Rate Limit: 20 requests / 10 phút / IP
const createLeadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 20,
  message: {
    success: false,
    message: 'Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau 10 phút.',
  }
});

// Import middleware xác thực
const authMiddleware = require('../middlewares/auth');

// Định tuyến API cho Course Leads
// Khách hàng tạo Lead (có rate limit)
router.post('/', createLeadLimiter, courseLeadController.createLead);

// API cho Sale / Admin (yêu cầu đăng nhập)
router.get('/', authMiddleware, courseLeadController.getLeads);
// Các thao tác Bulk (phải đặt trước các route /:id)
router.patch('/bulk/archive', authMiddleware, courseLeadController.bulkArchive);
router.delete('/bulk/permanent', authMiddleware, courseLeadController.bulkPermanentDelete);

router.get('/:id', authMiddleware, courseLeadController.getLeadById);
router.patch('/:id/assign', authMiddleware, courseLeadController.assignLead);
router.patch('/:id/process', authMiddleware, courseLeadController.processLead);
router.post('/:id/submit-proof', authMiddleware, courseLeadController.submitProof);
router.patch('/:id/approve', authMiddleware, courseLeadController.approveProof);
router.patch('/:id/reject', authMiddleware, courseLeadController.rejectProof);

// Các thao tác Archive / Xóa vĩnh viễn (đơn lẻ)
router.patch('/:id/archive', authMiddleware, courseLeadController.archiveLead);
router.patch('/:id/restore', authMiddleware, courseLeadController.restoreLead);
router.delete('/:id/permanent', authMiddleware, courseLeadController.permanentDeleteLead);

module.exports = router;
