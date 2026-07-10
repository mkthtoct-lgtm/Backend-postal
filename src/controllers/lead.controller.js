const leadService = require('../services/lead.service');
const crmService = require('../services/crm.service');
const auditLogService = require('../services/auditLog.service');
const googleDriveService = require('../services/googleDrive.service');
const mongoose = require('mongoose');

class LeadController {
  /**
   * CTV gửi lead khách hàng quan tâm
   */
  async createLead(req, res) {
    try {
      const {
        customerName,
        phone,
        email,
        source,
        sourceChannel, // Bổ sung để hỗ trợ tên trường từ Frontend
        productInterest,
        productName, // Bổ sung để hỗ trợ tên trường từ Frontend
        countryInterest,
        country, // Bổ sung để hỗ trợ tên trường từ Frontend
        budgetRange,
        urgency,
        preferredContact,
        note,
        status,
        productId // Bổ sung để hỗ trợ định danh sản phẩm chi tiết
      } = req.body;

      if (!customerName || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin: Họ tên và Số điện thoại khách hàng.'
        });
      }

      // Ảnh CCCD mặt trước và mặt sau là bắt buộc phải có
      const frontFile = req.files?.cccdFront?.[0];
      const backFile = req.files?.cccdBack?.[0];
      if (!frontFile || !backFile) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng tải lên cả hai mặt trước và sau của CCCD khách hàng (bắt buộc).'
        });
      }

      // Trích xuất collaboratorId nếu có token trong header Authorization
      let collaboratorId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const { verifyToken } = require('../utils/jwt');
          const decoded = verifyToken(token);
          if (decoded && decoded.sub) {
            collaboratorId = new mongoose.Types.ObjectId(decoded.sub);
          }
        } catch (err) {
          console.warn('[LeadController] Token không hợp lệ hoặc đã hết hạn:', err.message);
        }
      }

      // Xác định tên sản phẩm và quốc gia quan tâm dựa trên thông tin gửi lên hoặc truy vấn DB
      let finalProductInterest = productInterest || productName || 'Du học Đức';
      let finalCountryInterest = countryInterest || country || 'Đức';

      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        try {
          const Product = require('../models/Product');
          const product = await Product.findOne({ _id: productId, deletedAt: null }).lean();
          if (product) {
            finalProductInterest = product.name;
            finalCountryInterest = product.country || finalCountryInterest;
          }
        } catch (dbErr) {
          console.error('[LeadController] Lỗi khi tìm kiếm thông tin sản phẩm bằng productId:', dbErr.message);
        }
      }

      // Tạo thư mục và tải file ảnh CCCD lên Google Drive
      let cccdFolderId = null;
      let cccdFrontFileId = null;
      let cccdFrontUrl = null;
      let cccdBackFileId = null;
      let cccdBackUrl = null;
      let finalNote = note ? note.trim() : '';

      try {
        // Lấy hoặc tạo thư mục mẹ "CCCD Khách hàng" trong thư mục gốc Google Drive
        const parentCccdFolderId = await googleDriveService.getOrCreateFolder('CCCD Khách hàng');

        const folderName = `${customerName.trim()} - ${phone.trim()}`;
        // Tạo thư mục mang tên khách hàng bên trong thư mục "CCCD Khách hàng"
        cccdFolderId = await googleDriveService.createFolder(folderName, parentCccdFolderId);
        
        // Tải file ảnh CCCD mặt trước vào thư mục vừa tạo
        const frontUpload = {
          ...frontFile,
          originalname: `Mat_truoc_${frontFile.originalname}`
        };
        const uploadFrontResult = await googleDriveService.uploadFile(frontUpload, cccdFolderId);
        cccdFrontFileId = uploadFrontResult.fileId;
        cccdFrontUrl = uploadFrontResult.webViewLink;

        // Tải file ảnh CCCD mặt sau vào thư mục vừa tạo
        const backUpload = {
          ...backFile,
          originalname: `Mat_sau_${backFile.originalname}`
        };
        const uploadBackResult = await googleDriveService.uploadFile(backUpload, cccdFolderId);
        cccdBackFileId = uploadBackResult.fileId;
        cccdBackUrl = uploadBackResult.webViewLink;
      } catch (driveErr) {
        console.warn('[LeadController] Lỗi xử lý Google Drive cho CCCD (được bỏ qua để không chặn tiến trình):', driveErr.message);
        // Lưu lại cảnh báo lỗi vào phần ghi chú của lead
        const driveWarning = `[Cảnh báo: Tải CCCD lên Drive thất bại: ${driveErr.message}]`;
        finalNote = finalNote ? `${finalNote}\n${driveWarning}` : driveWarning;
      }

      // 1. Lưu trữ thông tin lead cục bộ dưới trạng thái mặc định "dang_tu_van" hoặc trạng thái gửi từ body
      let existingBizflyContactId = null;
      try {
        const Lead = require('../models/Lead');
        let searchPhone = phone.trim().replace(/[^0-9+]/g, '');
        if (searchPhone.startsWith('+84')) {
          searchPhone = '0' + searchPhone.slice(3);
        } else if (searchPhone.startsWith('84') && searchPhone.length > 9) {
          searchPhone = '0' + searchPhone.slice(2);
        }

        let searchPhoneNoZero = searchPhone;
        if (searchPhone.startsWith('0')) {
          searchPhoneNoZero = searchPhone.slice(1);
        }

        let existingLead = await Lead.findOne({
          $or: [
            { phone: phone.trim() },
            { phone: searchPhone },
            { phone: searchPhoneNoZero }
          ],
          bizflyContactId: { $ne: null },
          deletedAt: null
        }).sort({ createdAt: -1 }).lean();

        if (!existingLead && email) {
          existingLead = await Lead.findOne({
            email: email.trim().toLowerCase(),
            bizflyContactId: { $ne: null },
            deletedAt: null
          }).sort({ createdAt: -1 }).lean();
        }

        if (existingLead) {
          existingBizflyContactId = existingLead.bizflyContactId;
        }
      } catch (dbErr) {
        console.error('[LeadController] Lỗi khi tìm lead trùng để lấy bizflyContactId:', dbErr.message);
      }

      const leadData = {
        collaboratorId,
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : '',
        source: source || sourceChannel || 'Website',
        productInterest: finalProductInterest,
        countryInterest: finalCountryInterest,
        budgetRange: budgetRange ? budgetRange.trim() : '',
        urgency: urgency || 'Trong 1-3 tháng',
        preferredContact: preferredContact || 'Zalo/Điện thoại',
        note: finalNote,
        status: status || 'dang_tu_van',
        cccdFolderId,
        cccdFrontFileId,
        cccdFrontUrl,
        cccdBackFileId,
        cccdBackUrl,
        bizflyContactId: existingBizflyContactId
      };

      const lead = await leadService.create(leadData);

      // Nếu trạng thái của lead khi tạo mới trực tiếp là 'xu_ly_ho_so' (deal thành công), tự động tính hoa hồng
      if (lead.status === 'xu_ly_ho_so') {
        try {
          const commissionService = require('../services/commission.service');
          await commissionService.calculateCommission(lead._id);
        } catch (commErr) {
          console.error('[LeadController] Lỗi khi tự động tính hoa hồng đơn hàng lúc tạo mới:', commErr.message);
        }
      }

      // 2. Gọi API BizFly CRM Webhook để đồng bộ thông tin khách hàng (Chạy nền không chặn để phản hồi nhanh)
      crmService.forwardToBizFly(lead)
        .then(async (crmResult) => {
          if (crmResult.success && crmResult.bizflyContactId) {
            lead.bizflyContactId = crmResult.bizflyContactId.toString();
            await lead.save();
          }
        })
        .catch((crmErr) => {
          console.error('[CrmService] Lỗi đồng bộ nền BizFly CRM:', crmErr.message);
        });

      // 3. Ghi lịch sử thao tác (chỉ ghi nếu có collaborator thực hiện)
      if (collaboratorId) {
        auditLogService.log(
          collaboratorId,
          'lead.create',
          { type: 'lead', id: lead._id.toString(), name: lead.customerName },
          { customerName: lead.customerName, phone: lead.phone, status: lead.status }
        );
      }

      return res.status(201).json({
        success: true,
        message: 'Gửi lead thông tin khách hàng thành công và đồng bộ sang CRM.',
        code: lead._id.toString(),
        data: {
          ...lead.toObject(),
          code: lead._id.toString()
        }
      });
    } catch (error) {
      console.error('[LeadController] Lỗi khi tạo Lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lưu hoặc đồng bộ thông tin lead.',
        error: error.message
      });
    }
  }

  /**
   * Cộng tác viên lấy danh sách lead của riêng mình
   */
  async getMyLeads(req, res) {
    try {
      const collaboratorId = new mongoose.Types.ObjectId(req.user.sub);
      const { search, status } = req.query;

      const leads = await leadService.findAll({ search, status, collaboratorId });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách lead cá nhân thành công.',
        data: leads
      });
    } catch (error) {
      console.error('[LeadController] Lỗi khi lấy lead của CTV:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách lead cá nhân.',
        error: error.message
      });
    }
  }

  /**
   * Lấy danh sách lead trong hệ thống (Tự động lọc theo quyền)
   */
  async getAllLeads(req, res) {
    try {
      const { search, status } = req.query;

      // Kiểm tra quyền truy cập động
      const Role = require('../models/Role');
      const userRole = await Role.findById(req.user.roleId).lean();
      const userRoleSlug = userRole?.slug;
      const hasReadPermission = userRole && (userRole.permissions.includes('*') || userRole.permissions.includes('users:read'));

      let leads;
      if (userRoleSlug === 'admin' || userRoleSlug === 'board_of_directors' || userRoleSlug === 'bangiamdoc' || hasReadPermission) {
        // Quản trị viên/Ban Giám Đốc/Người có quyền: Lấy tất cả lead
        leads = await leadService.findAll({ search, status });
      } else if (userRoleSlug === 'congtacvien') {
        // Cộng tác viên: Chỉ lấy lead của chính mình
        const collaboratorId = new mongoose.Types.ObjectId(req.user.sub);
        leads = await leadService.findAll({ search, status, collaboratorId });
      } else {
        // Các tài khoản khác không được phép xem
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập danh sách lead.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách lead thành công.',
        data: leads
      });
    } catch (error) {
      console.error('[LeadController] Lỗi khi quản trị viên lấy toàn bộ lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải toàn bộ danh sách lead.',
        error: error.message
      });
    }
  }

  /**
   * Admin cập nhật trạng thái của lead (chuyển sang 'xu_ly_ho_so' để ghi nhận 1 deal thành công)
   */
  async updateLeadStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Kiểm tra quyền theo vai trò (Role-based authorization)
      const Role = require('../models/Role');
      const userRole = await Role.findById(req.user.roleId).lean();
      const userRoleSlug = userRole?.slug;

      if (userRoleSlug !== 'admin' && userRoleSlug !== 'board_of_directors' && userRoleSlug !== 'bangiamdoc') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật trạng thái đơn hàng. Chỉ Admin và Ban Giám Đốc mới được phép thực hiện.'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Mã lead không đúng định dạng.'
        });
      }

      const validStatuses = ['dang_tu_van', 'cho_chot_hop_dong', 'xu_ly_ho_so', 'lost'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái thay đổi không hợp lệ.'
        });
      }

      const lead = await leadService.findById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin lead yêu cầu.'
        });
      }

      const oldStatus = lead.status;
      const updatedLead = await leadService.updateStatus(id, status);

      // Nếu trạng thái chuyển sang 'xu_ly_ho_so' (deal thành công), tự động tính toán hoa hồng cho CTV giới thiệu
      if (status === 'xu_ly_ho_so' && oldStatus !== 'xu_ly_ho_so') {
        try {
          const commissionService = require('../services/commission.service');
          await commissionService.calculateCommission(id);
        } catch (commErr) {
          console.error('[LeadController] Lỗi khi tự động tính hoa hồng đơn hàng:', commErr.message);
        }
      }

      // ĐỒNG BỘ CRM: Đẩy thông tin trạng thái mới và đơn hàng/hoa hồng lên BizFly CRM
      try {
        await crmService.forwardToBizFly(updatedLead);
      } catch (crmErr) {
        console.error('[LeadController] Lỗi khi đồng bộ cập nhật đơn hàng lên BizFly CRM:', crmErr.message);
      }

      // Ghi lịch sử cập nhật trạng thái
      auditLogService.log(
        req.user.sub,
        'lead.update',
        { type: 'lead', id: id, name: updatedLead.customerName },
        { oldStatus, newStatus: status }
      );

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái lead thành công.',
        data: updatedLead
      });
    } catch (error) {
      console.error('[LeadController] Lỗi khi cập nhật trạng thái lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái lead.',
        error: error.message
      });
    }
  }

  /**
   * Webhook tiếp nhận tín hiệu cập nhật từ Bizfly CRM gửi về (Đồng bộ 2 chiều)
   */
  async handleCrmWebhook(req, res) {
    try {
      console.log('[Bizfly Webhook] Nhận payload từ CRM:', req.body);
      const payload = req.body || {};

      // 1. Trích xuất thông tin định danh (Số điện thoại hoặc Email)
      let phone = payload.phone || payload.customer_phone || payload.phone_number || payload.customerPhone;
      let email = payload.email || payload.customer_email || payload.customerEmail;
      
      // Nếu có đối tượng contact lồng nhau
      if (payload.contact) {
        phone = phone || payload.contact.phone || payload.contact.customer_phone;
        email = email || payload.contact.email;
      }

      if (!phone && !email) {
        return res.status(200).json({
          success: false,
          message: 'Không tìm thấy số điện thoại hoặc email trong payload để định danh khách hàng.'
        });
      }

      // Chuẩn hóa số điện thoại (bỏ khoảng trắng, ký tự đặc biệt)
      let cleanPhone = '';
      if (phone) {
        cleanPhone = String(phone).trim().replace(/[^0-9+]/g, '');
        // Hỗ trợ chuyển đầu +84 thành đầu 0 để khớp DB
        if (cleanPhone.startsWith('+84')) {
          cleanPhone = '0' + cleanPhone.slice(3);
        } else if (cleanPhone.startsWith('84') && cleanPhone.length > 9) {
          cleanPhone = '0' + cleanPhone.slice(2);
        }
      }

      // 2. Trích xuất trạng thái mới từ CRM
      // Bizfly thường truyền trạng thái qua các trường: status, process, status_key, statusKey, v.v.
      const rawStatus = payload.status || payload.process || payload.status_key || payload.statusKey || payload.tien_trinh;
      if (!rawStatus) {
        return res.status(200).json({
          success: false,
          message: 'Không tìm thấy trường trạng thái (status/process/tiến trình) trong payload.'
        });
      }

      // 3. Phân loại và chuyển đổi trạng thái Bizfly sang trạng thái hệ thống
      const normalizeStatus = (txt) => {
        const s = String(txt).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (s.includes('ky hop dong') || s.includes('thanh cong') || s.includes('ho so') || s.includes('xu_ly_ho_so') || s.includes('hop dong')) {
          return 'xu_ly_ho_so';
        }
        if (s.includes('cho chot') || s.includes('cho_chot_hop_dong')) {
          return 'cho_chot_hop_dong';
        }
        if (s.includes('that bai') || s.includes('lost') || s.includes('huy')) {
          return 'lost';
        }
        if (s.includes('tu van') || s.includes('dang_tu_van') || s.includes('moi')) {
          return 'dang_tu_van';
        }
        return null;
      };

      const newStatus = normalizeStatus(rawStatus);
      if (!newStatus) {
        return res.status(200).json({
          success: false,
          message: `Trạng thái nhận được từ CRM "${rawStatus}" chưa được cấu hình map sang hệ thống.`
        });
      }

      // 4. Tìm kiếm khách hàng (Lead) trong DB
      const Lead = require('../models/Lead');
      let lead = null;
      if (cleanPhone) {
        lead = await Lead.findOne({ phone: cleanPhone, deletedAt: null });
      }
      if (!lead && email) {
        lead = await Lead.findOne({ email: String(email).trim().toLowerCase(), deletedAt: null });
      }

      if (!lead) {
        return res.status(200).json({
          success: false,
          message: 'Không tìm thấy khách hàng tương ứng trong cơ sở dữ liệu Website.'
        });
      }

      // Lưu lại bizflyContactId từ CRM gửi về nếu chưa có hoặc khác biệt
      const bizflyContactId = payload.ma_khach_hang || payload.contact_id || payload.id || (payload.contact && (payload.contact.id || payload.contact.contact_id || payload.contact.ma_khach_hang));
      if (bizflyContactId && lead.bizflyContactId !== String(bizflyContactId)) {
        lead.bizflyContactId = String(bizflyContactId);
        await lead.save();
        console.log(`[Bizfly Webhook] Đã cập nhật và lưu bizflyContactId = ${bizflyContactId} cho lead: ${lead._id}`);
      }

      // 5. Cập nhật trạng thái nếu có thay đổi
      const oldStatus = lead.status;
      if (oldStatus !== newStatus) {
        await leadService.updateStatus(lead._id, newStatus);

        // Nếu chuyển sang 'xu_ly_ho_so', tự động tính hoa hồng
        if (newStatus === 'xu_ly_ho_so' && oldStatus !== 'xu_ly_ho_so') {
          try {
            const commissionService = require('../services/commission.service');
            await commissionService.calculateCommission(lead._id);
          } catch (commErr) {
            console.error('[Bizfly Webhook] Lỗi khi tự động tính hoa hồng đơn hàng:', commErr.message);
          }
        }

        // Ghi lịch sử cập nhật trạng thái (Actor là System/Bizfly CRM)
        const SYSTEM_ACTOR_ID = '69fc5af582ef85451120772a'; // Mặc định ID admin
        auditLogService.log(
          SYSTEM_ACTOR_ID,
          'lead.update',
          { type: 'lead', id: lead._id.toString(), name: lead.customerName },
          { oldStatus, newStatus: newStatus }
        );

        return res.status(200).json({
          success: true,
          message: `Đồng bộ trạng thái từ CRM thành công: "${oldStatus}" -> "${newStatus}"`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Trạng thái trên Website đã đồng bộ khớp với CRM, không cần cập nhật.'
      });

    } catch (error) {
      console.error('[Bizfly Webhook] Lỗi xử lý webhook:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xử lý webhook đồng bộ CRM.',
        error: error.message
      });
    }
  }
}

module.exports = new LeadController();
