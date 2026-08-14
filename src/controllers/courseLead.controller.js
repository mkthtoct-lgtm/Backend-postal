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
        .populate('assignedTo', 'fullName email phone')
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
        .populate('assignedTo', 'fullName email phone');
        
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin Lead.'
        });
      }
      
      const history = await require('../models/courseLeadHistory.model')
        .find({ leadId: lead._id })
        .populate('changedBy', 'fullName email')
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
  // Lấy danh sách Sale có quyền nhận Lead
  getEligibleSales: async (req, res) => {
    try {
      const User = require('../models/User');
      const users = await User.find({ status: 'active' }).populate('roleId');
      
      const eligibleUsers = users.filter(u => {
        const rolePermissions = u.roleId && Array.isArray(u.roleId.permissions) ? u.roleId.permissions : [];
        const grantedPermissions = Array.isArray(u.grantedPermissions) ? u.grantedPermissions : [];
        const permissions = [...rolePermissions, ...grantedPermissions];
        
        return permissions.includes('*') || 
               permissions.includes('leads:write') || 
               permissions.includes('crm.course_leads.assign');
      }).map(u => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        departmentId: u.departmentId
      }));

      return res.status(200).json({
        success: true,
        data: eligibleUsers
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách Sale:', error);
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
      
      if (!lead) return res.status(404).json({ success: false, message: 'Không tìm thấy Lead' });
      
      if (lead.isArchived) {
        return res.status(409).json({
          success: false,
          code: 'LEAD_ARCHIVED',
          message: 'Lead đã được lưu trữ và không thể nhận xử lý.'
        });
      }

      if (lead.status !== 'NEW') {
        return res.status(409).json({ 
          success: false, 
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Chỉ có thể nhận Lead ở trạng thái NEW' 
        });
      }
      
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
      await lead.populate('assignedTo', 'fullName email phone');
      
      return res.status(200).json({ success: true, message: 'Nhận Lead thành công', data: lead });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  },
  // Trả / Chuyển Lead (ASSIGNED -> NEW hoặc đổi ASSIGNED)
  reassignLead: async (req, res) => {
    try {
      const leadId = req.params.id;
      const userId = req.user?.sub;
      const { actionType, targetUserId, reason } = req.body;
      
      if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(leadId);
      
      if (!lead) return res.status(404).json({ success: false, message: 'Không tìm thấy Lead' });
      
      const User = require('../models/User');
      const currentUserObj = await User.findById(userId).populate('roleId');
      let hasAdminOverride = false;
      if (currentUserObj) {
        const roleKey = String(currentUserObj.roleId?.name || "").trim().toLowerCase();
        const perms = [...(currentUserObj.roleId?.permissions || []), ...(currentUserObj.grantedPermissions || [])];
        hasAdminOverride = roleKey === 'admin' || currentUserObj.roleId?._id?.toString() === "69fc5af582ef85451120772a" || perms.includes('*');
      }

      if (lead.assignedTo?.toString() !== userId && !hasAdminOverride) {
        return res.status(403).json({ success: false, message: 'Bạn không phụ trách Lead này và không có quyền điều phối' });
      }
      
      if (lead.status !== 'ASSIGNED' && lead.status !== 'PROCESSING') {
        return res.status(409).json({ 
          success: false, 
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Chỉ có thể Trả / Chuyển Lead ở trạng thái đã nhận hoặc đang tư vấn' 
        });
      }
      
      const previousStatus = lead.status;
      
      if (actionType === 'RELEASE') {
        lead.status = 'NEW';
        lead.assignedTo = null;
        lead.assignedAt = null;
        await lead.save();
        
        await require('../models/courseLeadHistory.model').create({
          leadId,
          fromStatus: previousStatus,
          toStatus: 'NEW',
          changedBy: userId,
          reason: reason || 'Sale trả Lead về hàng chờ.'
        });
      } else if (actionType === 'REASSIGN') {
        if (!targetUserId) {
          return res.status(400).json({ success: false, message: 'Vui lòng chọn Sale nhận bàn giao.' });
        }
        
        const targetUser = await User.findById(targetUserId).select('fullName email');
        
        lead.status = 'ASSIGNED';
        lead.assignedTo = targetUserId;
        lead.assignedAt = Date.now();
        await lead.save();
        
        await require('../models/courseLeadHistory.model').create({
          leadId,
          fromStatus: previousStatus,
          toStatus: 'ASSIGNED',
          changedBy: userId,
          reason: reason || 'Chuyển Lead cho Sale khác phụ trách.',
          note: `Chuyển giao từ ${currentUserObj ? currentUserObj.fullName : 'Sale cũ'} sang ${targetUser ? targetUser.fullName : 'Sale mới'}.`
        });
        
        await lead.populate('assignedTo', 'fullName email phone');
      } else {
        return res.status(400).json({ success: false, message: 'actionType không hợp lệ (RELEASE hoặc REASSIGN)' });
      }
      
      return res.status(200).json({ success: true, message: 'Thao tác thành công', data: lead });
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
      
      const User = require('../models/User');
      const currentUserObj = await User.findById(userId).populate('roleId');
      let hasAdminOverride = false;
      if (currentUserObj) {
        const roleKey = String(currentUserObj.roleId?.name || "").trim().toLowerCase();
        const perms = [...(currentUserObj.roleId?.permissions || []), ...(currentUserObj.grantedPermissions || [])];
        hasAdminOverride = roleKey === 'admin' || currentUserObj.roleId?._id?.toString() === "69fc5af582ef85451120772a" || perms.includes('*');
      }

      if (lead.assignedTo?.toString() !== userId && !hasAdminOverride) {
        return res.status(403).json({ success: false, message: 'Bạn không phụ trách Lead này' });
      }
      
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
      await lead.populate('assignedTo', 'fullName email phone');
      
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
      const note = req.body.note || '';
      
      if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

      let finalProofFiles = [];

      // Xử lý upload file lên Google Drive nếu có
      if (req.file) {
        const GoogleDriveService = require('../services/googleDrive.service');
        const driveService = new GoogleDriveService();
        const uploadResult = await driveService.uploadFile(req.file);
        // Lưu mảng chứa webViewLink hoặc ID của file
        finalProofFiles = [uploadResult.webViewLink || uploadResult.id];
      } else if (req.body.proofFiles) {
        // Fallback: nếu gọi bằng API cũ (danh sách link text)
        let parsed = req.body.proofFiles;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch(e) { parsed = [parsed]; }
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          finalProofFiles = parsed;
        }
      }

      if (finalProofFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ít nhất một minh chứng' });
      }

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(leadId);
      
      if (!lead) return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
      
      const User = require('../models/User');
      const currentUserObj = await User.findById(userId).populate('roleId');
      let hasAdminOverride = false;
      if (currentUserObj) {
        const roleKey = String(currentUserObj.roleId?.name || "").trim().toLowerCase();
        const perms = [...(currentUserObj.roleId?.permissions || []), ...(currentUserObj.grantedPermissions || [])];
        hasAdminOverride = roleKey === 'admin' || currentUserObj.roleId?._id?.toString() === "69fc5af582ef85451120772a" || perms.includes('*');
      }

      if (lead.assignedTo?.toString() !== userId && !hasAdminOverride) {
        return res.status(403).json({ success: false, message: 'Bạn không phụ trách Lead này' });
      }
      
      if (lead.status !== 'PROCESSING' && lead.status !== 'COMPLETED_PENDING_PROOF') {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ để gửi minh chứng' });
      }
      
      lead.status = 'COMPLETED_PENDING_PROOF';
      lead.proofStatus = 'PENDING';
      lead.proofFiles = finalProofFiles;
      await lead.save();
      
      await require('../models/courseLeadHistory.model').create({
        leadId,
        fromStatus: 'PROCESSING',
        toStatus: 'COMPLETED_PENDING_PROOF',
        changedBy: userId,
        reason: `Sale gửi minh chứng. Ghi chú: ${note}`
      });
      
      return res.status(200).json({ success: true, message: 'Gửi minh chứng thành công', data: lead });
    } catch (error) {
      console.error('Lỗi khi gửi minh chứng:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
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
      const userId = req.user?.sub;

      console.log('=== DEBUG DELETE SINGLE ===');
      console.log('req.params.id:', id);
      console.log('req.user.id:', userId);
      console.log('req.user.role:', req.user?.roleId);

      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid ID');
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      }

      const CourseLead = require('../models/courseLead.model');
      const lead = await CourseLead.findById(id);
      console.log('MongoDB find result:', lead ? 'Found' : 'Not Found');
      if (!lead) return res.status(404).json({ success: false, message: 'Không tìm thấy Lead' });

      console.log('KPI status:', lead.status);
      console.log('proofStatus:', lead.proofStatus);

      // KPI Lock - Không cho phép xoá vĩnh viễn dù có force hay không (theo yêu cầu mới)
      if (lead.status === 'COMPLETED' && lead.proofStatus === 'APPROVED') {
        console.log('KPI Blocked');
        return res.status(409).json({ 
          success: false, 
          code: 'KPI_PROTECTED',
          message: 'Lead đã được duyệt KPI và không thể xóa vĩnh viễn. Vui lòng sử dụng Archive.'
        });
      }

      const deleteRes = await CourseLead.findByIdAndDelete(id);
      console.log('Delete result:', deleteRes ? 'Success' : 'Failed');

      const CourseLeadAudit = require('../models/courseLeadAudit.model');
      try {
        const auditDoc = await CourseLeadAudit.create({
          leadId: id,
          customerName: lead.fullName,
          phoneNumber: lead.phone,
          courseId: lead.courseId,
          previousStatus: lead.status,
          previousProofStatus: lead.proofStatus,
          deletedBy: userId,
          reason: 'Xóa vĩnh viễn'
        });
        console.log('Audit insert result:', auditDoc ? 'Success' : 'Failed');
      } catch (auditErr) {
        console.error('Audit insert error:', auditErr);
      }

      return res.status(200).json({ success: true, message: 'Đã xóa vĩnh viễn Lead' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

  bulkArchive: async (req, res) => {
    try {
      const { ids, reason } = req.body || {};
      const userId = req.user?.sub;
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });

      const mongoose = require('mongoose');
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

      if (validIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có ID nào hợp lệ' });
      }

      const CourseLead = require('../models/courseLead.model');
      await CourseLead.updateMany(
        { _id: { $in: validIds } },
        { $set: { isArchived: true, archivedAt: new Date(), archivedBy: userId, archiveReason: reason || 'Lưu trữ hàng loạt' } }
      );

      // Thêm history cho từng lead
      const CourseLeadHistory = require('../models/courseLeadHistory.model');
      const historyDocs = validIds.map(id => ({
        leadId: id,
        fromStatus: 'UNKNOWN',
        toStatus: 'UNKNOWN',
        changedBy: userId,
        reason: `Lưu trữ hàng loạt. Lý do: ${reason || 'Không có'}`
      }));
      await CourseLeadHistory.insertMany(historyDocs);

      return res.status(200).json({ success: true, message: `Đã lưu trữ ${validIds.length} Lead` });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

  bulkRestore: async (req, res) => {
    try {
      const { ids } = req.body || {};
      const userId = req.user?.sub;
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });

      const mongoose = require('mongoose');
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

      if (validIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có ID nào hợp lệ' });
      }

      const CourseLead = require('../models/courseLead.model');
      await CourseLead.updateMany(
        { _id: { $in: validIds } },
        { $set: { isArchived: false, archivedAt: null, archivedBy: null, archiveReason: '' } }
      );

      const CourseLeadHistory = require('../models/courseLeadHistory.model');
      const historyDocs = validIds.map(id => ({
        leadId: id,
        fromStatus: 'UNKNOWN',
        toStatus: 'UNKNOWN',
        changedBy: userId,
        reason: 'Khôi phục hàng loạt từ danh sách lưu trữ'
      }));
      await CourseLeadHistory.insertMany(historyDocs);

      return res.status(200).json({ success: true, message: `Đã khôi phục ${validIds.length} Lead` });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

  bulkPermanentDelete: async (req, res) => {
    try {
      const { ids } = req.body || {};
      const userId = req.user?.sub;
      
      console.log('=== DEBUG DELETE BULK ===');
      console.log('req.body:', req.body);
      console.log('leadIds:', ids);
      
      if (!ids || !Array.isArray(ids)) return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });

      const mongoose = require('mongoose');
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
      
      console.log('validIds:', validIds);
      console.log('invalidIds:', invalidIds);

      const CourseLead = require('../models/courseLead.model');
      const CourseLeadAudit = require('../models/courseLeadAudit.model');
      
      const leads = await CourseLead.find({ _id: { $in: validIds } });
      const foundIds = leads.map(l => l._id.toString());
      
      const notFoundIds = validIds.filter(id => !foundIds.includes(id));
      
      console.log('foundIds:', foundIds);
      console.log('notFoundIds:', notFoundIds);
      
      const results = [];
      const idsToDelete = [];
      const auditDocs = [];
      
      let deletedCount = 0;
      let failedCount = 0;

      // Xử lý invalid ids
      invalidIds.forEach(id => {
        failedCount++;
        results.push({ leadId: id, success: false, action: 'ERROR', message: 'ID không hợp lệ' });
      });

      // Xử lý not found ids
      notFoundIds.forEach(id => {
        failedCount++;
        results.push({ leadId: id, success: false, action: 'NOT_FOUND', message: 'Không tìm thấy Lead' });
      });

      // Xử lý leads tìm thấy
      const kpiBlockedIds = [];
      leads.forEach(lead => {
        if (lead.status === 'COMPLETED' && lead.proofStatus === 'APPROVED') {
          kpiBlockedIds.push(lead._id.toString());
          failedCount++;
          results.push({
            leadId: lead._id.toString(),
            success: false,
            action: 'BLOCKED',
            code: 'KPI_PROTECTED',
            message: 'Lead đã được duyệt KPI.'
          });
        } else {
          deletedCount++;
          idsToDelete.push(lead._id);
          results.push({
            leadId: lead._id.toString(),
            success: true,
            action: 'DELETED'
          });
          
          auditDocs.push({
            leadId: lead._id,
            customerName: lead.fullName,
            phoneNumber: lead.phone,
            courseId: lead.courseId,
            previousStatus: lead.status,
            previousProofStatus: lead.proofStatus,
            deletedBy: userId,
            reason: 'Xóa vĩnh viễn hàng loạt'
          });
        }
      });

      console.log('KPI blocked IDs:', kpiBlockedIds);
      console.log('IDs eligible for delete:', idsToDelete);

      if (idsToDelete.length > 0) {
        const delRes = await CourseLead.deleteMany({ _id: { $in: idsToDelete } });
        console.log('delete result:', delRes);
        try {
          const auditRes = await CourseLeadAudit.insertMany(auditDocs);
          console.log('Audit insert result: Success', auditRes.length);
        } catch (err) {
          console.log('Audit insert result: Failed', err);
        }
      }

      return res.status(200).json({
        success: failedCount === 0,
        deletedCount,
        failedCount,
        results
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
    }
  },

};

module.exports = leadController;
