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

// Import middleware xác thực và phân quyền
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

// Định tuyến API cho Course Leads
// Khách hàng tạo Lead (có rate limit) - API này dành cho public, không cần auth/permission
router.post('/', createLeadLimiter, courseLeadController.createLead);

// API cho Sale / Admin (yêu cầu đăng nhập và có quyền)
router.get('/', authMiddleware, checkPermission('crm.course_leads.view'), courseLeadController.getLeads);

// Lấy danh sách Sale có quyền nhận Lead
router.get('/eligible-sales', authMiddleware, checkPermission('crm.course_leads.assign'), courseLeadController.getEligibleSales);

// Các thao tác Bulk (phải đặt trước các route /:id)
router.patch('/bulk/archive', authMiddleware, checkPermission('crm.course_leads.archive'), courseLeadController.bulkArchive);
router.patch('/bulk/restore', authMiddleware, checkPermission('crm.course_leads.restore'), courseLeadController.bulkRestore);
router.delete('/bulk/permanent', authMiddleware, checkPermission('crm.course_leads.permanent_delete'), courseLeadController.bulkPermanentDelete);

router.get('/:id', authMiddleware, checkPermission('crm.course_leads.view_detail'), courseLeadController.getLeadById);
router.patch('/:id/assign', authMiddleware, checkPermission('crm.course_leads.assign'), courseLeadController.assignLead);
router.patch('/:id/reassign', authMiddleware, checkPermission('crm.course_leads.release'), courseLeadController.reassignLead);
router.patch('/:id/process', authMiddleware, checkPermission('crm.course_leads.process'), courseLeadController.processLead);

const multer = require('multer');
const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

router.post('/:id/submit-proof', authMiddleware, checkPermission('crm.course_leads.submit_proof'), uploadMem.single('proofFile'), courseLeadController.submitProof);
router.patch('/:id/approve', authMiddleware, checkPermission('crm.course_leads.review_proof'), courseLeadController.approveProof);
router.patch('/:id/reject', authMiddleware, checkPermission('crm.course_leads.review_proof'), courseLeadController.rejectProof);

// Các thao tác Archive / Xóa vĩnh viễn (đơn lẻ)
router.patch('/:id/archive', authMiddleware, checkPermission('crm.course_leads.archive'), courseLeadController.archiveLead);
router.patch('/:id/restore', authMiddleware, checkPermission('crm.course_leads.restore'), courseLeadController.restoreLead);
router.delete('/:id/permanent', authMiddleware, checkPermission('crm.course_leads.permanent_delete'), courseLeadController.permanentDeleteLead);

module.exports = router;
