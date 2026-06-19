const leadService = require('../services/lead.service');
const crmService = require('../services/crm.service');
const auditLogService = require('../services/auditLog.service');
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

      // 1. Lưu trữ thông tin lead cục bộ dưới trạng thái mặc định "dang_tu_van" hoặc trạng thái gửi từ body
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
        note: note ? note.trim() : '',
        status: status || 'dang_tu_van'
      };

      const lead = await leadService.create(leadData);

      // 2. Gọi API BizFly CRM Webhook để đồng bộ thông tin khách hàng
      const crmResult = await crmService.forwardToBizFly(lead);
      if (crmResult.success && crmResult.bizflyContactId) {
        lead.bizflyContactId = crmResult.bizflyContactId.toString();
        await lead.save();
      }

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
      if (userRoleSlug === 'admin' || userRoleSlug === 'board_of_directors' || hasReadPermission) {
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

      if (userRoleSlug !== 'admin' && userRoleSlug !== 'board_of_directors') {
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
}

module.exports = new LeadController();
