const CourseLead = require('../models/courseLead.model');

const leadController = {
  createLead: async (req, res) => {
    try {
      const { customerName, phoneNumber, email, notes, courseId } = req.body;

      // 1. Validation căn bản
      if (!customerName || !phoneNumber || !courseId) {
        return res.status(400).json({
          success: false,
          message: 'Họ tên, số điện thoại và ID khóa học là bắt buộc.',
        });
      }

      // Chuẩn hóa Số điện thoại
      let normalizedPhone = phoneNumber.replace(/[\s\-\.]/g, ''); 
      const phoneRegex = /^(0|\+84)[35789][0-9]{8}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ.',
        });
      }
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+84' + normalizedPhone.slice(1);
      }

      // Tên khách hàng
      const nameRegex = /^[\p{L}\s]{2,50}$/u;
      if (!nameRegex.test(customerName.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Họ tên không hợp lệ. Họ tên phải chứa từ 2-50 ký tự và không bao gồm số hoặc ký tự đặc biệt.',
        });
      }

      // Email
      let validEmail = null;
      if (email && email.trim() !== '') {
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({
            success: false,
            message: 'Email không đúng định dạng.',
          });
        }
        validEmail = email.trim().toLowerCase();
      }

      // 2. Kiểm tra Spam Lock
      const CourseLeadSpam = require('../models/courseLeadSpam.model');
      let spamTracker = await CourseLeadSpam.findOne({ normalizedPhone });
      const NOW = Date.now();
      
      if (spamTracker && spamTracker.lockedUntil && spamTracker.lockedUntil > NOW) {
        const retryAfter = Math.ceil((spamTracker.lockedUntil - NOW) / 1000);
        return res.status(429).json({
          success: false,
          code: 'SPAM_LOCKED',
          message: 'Hệ thống phát hiện bạn đang gửi yêu cầu liên tục. Vui lòng thử lại sau.',
          retryAfter
        });
      }

      // 3. Lấy thông tin Khóa học
      const Product = require('../models/Product');
      const course = await Product.findById(courseId);
      if (!course) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy khóa học.' });
      }

      // 4. Kiểm tra Duplicate
      const CourseLead = require('../models/courseLead.model');
      const CourseLeadHistory = require('../models/courseLeadHistory.model');
      
      const duplicateLead = await CourseLead.findOne({
        normalizedPhone,
        courseId,
        status: { $in: ['NEW', 'ASSIGNED', 'PROCESSING'] }
      });

      // 5. Cập nhật Tracking Spam TRƯỚC KHI RETURN
      if (!spamTracker) {
        spamTracker = new CourseLeadSpam({
          normalizedPhone,
          attempts: 1,
          firstAttemptAt: NOW
        });
      } else {
        // Nếu đã qua 60 giây kể từ firstAttempt, reset
        if (NOW - spamTracker.firstAttemptAt > 60 * 1000) {
          spamTracker.attempts = 1;
          spamTracker.firstAttemptAt = NOW;
        } else {
          spamTracker.attempts += 1;
          if (spamTracker.attempts >= 4) {
            spamTracker.lockedUntil = NOW + 10 * 60 * 1000; // Khóa 10 phút
          }
        }
      }
      await spamTracker.save();

      // Nếu Spam vượt ngưỡng ngay lần này, chặn và trả 429 luôn
      if (spamTracker.lockedUntil && spamTracker.lockedUntil > NOW) {
        const retryAfter = Math.ceil((spamTracker.lockedUntil - NOW) / 1000);
        return res.status(429).json({
          success: false,
          code: 'SPAM_LOCKED',
          message: 'Hệ thống phát hiện bạn đang gửi yêu cầu liên tục. Vui lòng thử lại sau.',
          retryAfter
        });
      }

      // 6. Xử lý Trả về
      if (duplicateLead) {
        duplicateLead.submissionCount += 1;
        duplicateLead.lastSubmittedAt = NOW;
        await duplicateLead.save();
        
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_LEAD',
          message: 'Bạn đã gửi yêu cầu tư vấn khóa học này rồi. Đội ngũ tư vấn sẽ liên hệ với bạn sớm nhất.',
        });
      }

      // Tạo Lead mới
      const newLead = await CourseLead.create({
        courseId,
        courseNameSnapshot: course.name,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        normalizedPhone,
        email: validEmail,
        notes: notes ? notes.trim() : '',
        status: 'NEW',
        proofStatus: 'NOT_SUBMITTED',
        spamFlag: false
      });

      await CourseLeadHistory.create({
        leadId: newLead._id,
        fromStatus: null,
        toStatus: 'NEW',
        changedBy: null, // Hệ thống/Khách tự tạo
        reason: 'Khách hàng đăng ký tư vấn qua form website'
      });

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tư vấn thành công.',
        data: { id: newLead._id },
      });
    } catch (error) {
      console.error('Lỗi khi tạo Lead khóa học:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ. Vui lòng thử lại sau.',
        error: error.message,
      });
    }
  },

  // Danh sách Lead cho Đội Sale/Admin
  getLeads: async (req, res) => {
    try {
      const { status, courseId, assignedTo, dateFrom, dateTo, search, isArchived } = req.query;
      
      let query = {};
      
      // Mặc định ẩn dữ liệu đã Archive, trừ khi Client chủ động request
      if (isArchived === 'true') {
        query.isArchived = true;
      } else {
        query.isArchived = { $ne: true };
      }
      
      if (status) query.status = status;
      if (courseId) query.courseId = courseId;
      if (assignedTo) query.assignedTo = assignedTo;
      
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      if (search) {
        query.$or = [
          { customerName: { $regex: search, $options: 'i' } },
          { normalizedPhone: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ];
      }

      const leads = await require('../models/courseLead.model')
        .find(query)
        .populate('courseId', 'name image slug')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: leads,
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách Lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ.',
        error: error.message,
      });
    }
  },

  // Xem chi tiết Lead
  getLeadById: async (req, res) => {
    try {
      const lead = await require('../models/courseLead.model')
        .findById(req.params.id)
        .populate('courseId', 'name image slug price')
        .populate('assignedTo', 'name email');
        
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin Lead.'
        });
      }
      
      const history = await require('../models/courseLeadHistory.model')
        .find({ leadId: lead._id })
        .populate('changedBy', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: {
          ...lead.toObject(),
          history
        }
      });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết Lead:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  },

  // Nhận Lead (NEW -> ASSIGNED)
  assignLead: async (req, res) => {
    try {
      const leadId = req.params.id;
      // req.user chứa thông tin sale đang gọi API (từ middleware auth)
      const userId = req.user?.sub;
      
      if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(leadId);
      
      if (!lead) return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
      if (lead.status !== 'NEW') return res.status(400).json({ success: false, message: 'Chỉ có thể nhận Lead ở trạng thái NEW' });
      
      lead.status = 'ASSIGNED';
      lead.assignedTo = userId;
      lead.assignedAt = Date.now();
      await lead.save();
      
      await require('../models/courseLeadHistory.model').create({
        leadId,
        fromStatus: 'NEW',
        toStatus: 'ASSIGNED',
        changedBy: userId,
        reason: 'Sale nhận Lead'
      });
      
      return res.status(200).json({ success: true, message: 'Nhận Lead thành công', data: lead });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  },

  // Bắt đầu xử lý (ASSIGNED -> PROCESSING)
  processLead: async (req, res) => {
    try {
      const leadId = req.params.id;
      const userId = req.user?.sub;
      
      if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(leadId);
      
      if (!lead) return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
      if (lead.assignedTo?.toString() !== userId) return res.status(403).json({ success: false, message: 'Bạn không phụ trách Lead này' });
      if (lead.status !== 'ASSIGNED') return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      
      lead.status = 'PROCESSING';
      lead.processingAt = Date.now();
      if (!lead.firstContactAt) lead.firstContactAt = Date.now();
      await lead.save();
      
      await require('../models/courseLeadHistory.model').create({
        leadId,
        fromStatus: 'ASSIGNED',
        toStatus: 'PROCESSING',
        changedBy: userId,
        reason: 'Sale bắt đầu liên hệ khách hàng'
      });
      
      return res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công', data: lead });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  },

  // Gửi minh chứng (PROCESSING -> COMPLETED_PENDING_PROOF)
  submitProof: async (req, res) => {
    try {
      const leadId = req.params.id;
      const userId = req.user?.sub;
      const { proofFiles } = req.body;
      
      if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      if (!proofFiles || !Array.isArray(proofFiles) || proofFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ít nhất một minh chứng' });
      }

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(leadId);
      
      if (!lead) return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
      if (lead.assignedTo?.toString() !== userId) return res.status(403).json({ success: false, message: 'Bạn không phụ trách Lead này' });
      if (lead.status !== 'PROCESSING' && lead.status !== 'COMPLETED_PENDING_PROOF') {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ để gửi minh chứng' });
      }
      
      lead.status = 'COMPLETED_PENDING_PROOF';
      lead.proofStatus = 'PENDING';
      lead.proofFiles = proofFiles;
      await lead.save();
      
      await require('../models/courseLeadHistory.model').create({
        leadId,
        fromStatus: 'PROCESSING',
        toStatus: 'COMPLETED_PENDING_PROOF',
        changedBy: userId,
        reason: 'Sale gửi minh chứng'
      });
      
      return res.status(200).json({ success: true, message: 'Gửi minh chứng thành công', data: lead });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  },

  // Leader duyệt minh chứng (COMPLETED_PENDING_PROOF -> COMPLETED)
  approveProof: async (req, res) => {
    try {
      const leadId = req.params.id;
      const userId = req.user?.sub;
      const roleId = req.user?.roleId;
      
      if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      
      const leaderRoleIds = ['69fc5af582ef85451120772a', '69fc5af582ef85451120772b', '69fc5af582ef85451120772c'];
      if (!leaderRoleIds.includes(roleId)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền duyệt minh chứng' });
      }

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(leadId);
      
      if (!lead) return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
      if (lead.status !== 'COMPLETED_PENDING_PROOF') return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      
      lead.status = 'COMPLETED';
      lead.proofStatus = 'APPROVED';
      lead.completedAt = Date.now();
      lead.completedBy = userId;
      await lead.save();
      
      await require('../models/courseLeadHistory.model').create({
        leadId,
        fromStatus: 'COMPLETED_PENDING_PROOF',
        toStatus: 'COMPLETED',
        changedBy: userId,
        reason: 'Leader duyệt minh chứng'
      });
      
      return res.status(200).json({ success: true, message: 'Duyệt minh chứng thành công', data: lead });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  },

  // Leader từ chối minh chứng (COMPLETED_PENDING_PROOF -> PROCESSING)
  rejectProof: async (req, res) => {
    try {
      const leadId = req.params.id;
      const userId = req.user?.sub;
      const roleId = req.user?.roleId;
      const { reason } = req.body;
      
      if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      if (!reason) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối' });

      const leaderRoleIds = ['69fc5af582ef85451120772a', '69fc5af582ef85451120772b', '69fc5af582ef85451120772c'];
      if (!leaderRoleIds.includes(roleId)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền từ chối minh chứng' });
      }

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(leadId);
      
      if (!lead) return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
      if (lead.status !== 'COMPLETED_PENDING_PROOF') return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      
      lead.status = 'PROCESSING';
      lead.proofStatus = 'REJECTED';
      await lead.save();
      
      await require('../models/courseLeadHistory.model').create({
        leadId,
        fromStatus: 'COMPLETED_PENDING_PROOF',
        toStatus: 'PROCESSING',
        changedBy: userId,
        reason: `Từ chối minh chứng: ${reason}`
      });
      
      return res.status(200).json({ success: true, message: 'Từ chối minh chứng thành công', data: lead });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  },

  // Quản lý Dữ liệu rác / Archive
  archiveLead: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.sub;

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(id);
      if (!lead) return res.status(404).json({ success: false, message: 'Không tìm thấy Lead' });

      lead.isArchived = true;
      lead.archivedAt = new Date();
      lead.archivedBy = userId;
      lead.archiveReason = reason || '';
      await lead.save();

      await require('../models/courseLeadHistory.model').create({
        leadId: id,
        fromStatus: lead.status,
        toStatus: lead.status, // Status không đổi, chỉ thêm cờ archive
        changedBy: userId,
        reason: `Lưu trữ Lead (Archive). Lý do: ${reason || 'Không có'}`
      });

      return res.status(200).json({ success: true, message: 'Đã lưu trữ Lead' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

  restoreLead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.sub;

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(id);
      if (!lead) return res.status(404).json({ success: false, message: 'Không tìm thấy Lead' });

      lead.isArchived = false;
      lead.archivedAt = null;
      lead.archivedBy = null;
      lead.archiveReason = '';
      await lead.save();

      await require('../models/courseLeadHistory.model').create({
        leadId: id,
        fromStatus: lead.status,
        toStatus: lead.status,
        changedBy: userId,
        reason: 'Khôi phục Lead từ danh sách lưu trữ'
      });

      return res.status(200).json({ success: true, message: 'Khôi phục Lead thành công' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

  permanentDeleteLead: async (req, res) => {
    try {
      const { id } = req.params;
      const { force } = req.query;
      const userId = req.user?.sub;
      
      // Chỉ Admin mới được xoá
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền xóa vĩnh viễn dữ liệu' });
      }

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(id);
      if (!lead) return res.status(404).json({ success: false, message: 'Không tìm thấy Lead' });

      // KPI Lock
      if (lead.status === 'COMPLETED' && lead.proofStatus === 'APPROVED' && force !== 'true') {
        return res.status(400).json({ 
          success: false, 
          message: 'Lead này đã được tính KPI. Bạn không nên xóa vĩnh viễn để tránh sai lệch báo cáo. Vui lòng Archive hoặc truyền force=true nếu thực sự muốn xóa.',
          requireForce: true
        });
      }

      await CourseLead.findByIdAndDelete(id);

      // Lưu log vào hệ thống nếu cần, hoặc tạo History mồ côi
      await require('../models/courseLeadHistory.model').create({
        leadId: id,
        fromStatus: lead.status,
        toStatus: 'DELETED',
        changedBy: userId,
        reason: 'XÓA VĨNH VIỄN KHỎI HỆ THỐNG'
      });

      return res.status(200).json({ success: true, message: 'Đã xóa vĩnh viễn Lead' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

  bulkArchive: async (req, res) => {
    try {
      const { ids, reason } = req.body;
      const userId = req.user?.sub;
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });

      const CourseLead = require('../models/courseLead.model');
      await CourseLead.updateMany(
        { _id: { $in: ids } },
        { $set: { isArchived: true, archivedAt: new Date(), archivedBy: userId, archiveReason: reason || 'Lưu trữ hàng loạt' } }
      );

      // Thêm history cho từng lead
      const CourseLeadHistory = require('../models/courseLeadHistory.model');
      const historyDocs = ids.map(id => ({
        leadId: id,
        fromStatus: 'UNKNOWN',
        toStatus: 'UNKNOWN',
        changedBy: userId,
        reason: `Lưu trữ hàng loạt. Lý do: ${reason || 'Không có'}`
      }));
      await CourseLeadHistory.insertMany(historyDocs);

      return res.status(200).json({ success: true, message: `Đã lưu trữ ${ids.length} Lead` });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

  bulkPermanentDelete: async (req, res) => {
    try {
      const { ids, force } = req.body;
      const userId = req.user?.sub;
      
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền xóa vĩnh viễn dữ liệu' });
      }
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });

      const CourseLead = require('../models/courseLead.model');
      
      if (force !== true) {
        // Kiểm tra xem có KPI lock không
        const kpiLeads = await CourseLead.countDocuments({
          _id: { $in: ids },
          status: 'COMPLETED',
          proofStatus: 'APPROVED'
        });
        if (kpiLeads > 0) {
          return res.status(400).json({ 
            success: false, 
            message: `Có ${kpiLeads} Lead đã được duyệt KPI trong số đang chọn. Vui lòng Archive hoặc chọn Bỏ qua cảnh báo KPI (Force).`,
            requireForce: true
          });
        }
      }

      await CourseLead.deleteMany({ _id: { $in: ids } });

      const CourseLeadHistory = require('../models/courseLeadHistory.model');
      const historyDocs = ids.map(id => ({
        leadId: id,
        fromStatus: 'UNKNOWN',
        toStatus: 'DELETED',
        changedBy: userId,
        reason: 'XÓA VĨNH VIỄN HÀNG LOẠT'
      }));
      await CourseLeadHistory.insertMany(historyDocs);

      return res.status(200).json({ success: true, message: `Đã xóa vĩnh viễn ${ids.length} Lead` });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  }
};

module.exports = leadController;
