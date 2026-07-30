const Lead = require('../models/Lead');
const User = require('../models/User');
const Role = require('../models/Role');
const Commission = require('../models/Commission');
const Notification = require('../models/Notification');
const leadService = require('./lead.service');
const mailService = require('./mail.service');
const auditLogService = require('./auditLog.service');
const systemSettingService = require('./systemSetting.service');

const AUTOMATION_SETTING_KEY = 'automation_config';

// Vai trò nội bộ đủ điều kiện được tự động phân công (round-robin) chăm sóc
// các lead "tự nhiên" (không có Cộng tác viên giới thiệu, ví dụ khách tự điền
// form trên website). Chỉ dùng vai trò "Nhân viên" (staff) - vai trò nhân sự
// (nhansu) là bộ phận HR nội bộ, không phù hợp để giao tiếp/chăm sóc khách
// hàng. Việc phân công này KHÔNG ảnh hưởng tới collaboratorId (người hưởng
// hoa hồng) để tránh làm sai lệch dữ liệu tài chính.
const AUTO_ASSIGN_ROLE_SLUGS = ['staff'];

// Các vai trò quản lý luôn được thông báo về những sự kiện automation quan trọng.
const MANAGEMENT_ROLE_SLUGS = ['admin', 'bangiamdoc', 'truongbophan'];

// ID vai trò Admin mặc định (dùng làm actor dự phòng cuối cùng nếu không tìm
// được tài khoản Admin thực tế nào trong hệ thống). Giữ đồng bộ với quy ước
// đã sử dụng sẵn ở lead.controller.js (webhook Bizfly).
const FALLBACK_SYSTEM_ACTOR_ID = '69fc5af582ef85451120772a';

const DEFAULT_AUTOMATION_CONFIG = {
  // Công tắc tổng: tắt sẽ dừng toàn bộ automation (kể cả job nền định kỳ)
  enabled: true,
  // Tự động phân công nhân sự nội bộ cho lead không có CTV giới thiệu
  autoAssignEnabled: true,
  // Phát hiện lead trùng lặp (cùng SĐT/email) đang được xử lý
  duplicateDetectionEnabled: true,
  duplicateWindowDays: 30,
  // Gửi email xác nhận tự động cho khách hàng ngay khi gửi lead
  welcomeEmailEnabled: true,
  // Gửi thông báo/email nội bộ khi có lead mới
  internalAlertEnabled: true,
  // Nhắc nhở khi lead "im lặng" quá lâu ở trạng thái đang tư vấn
  staleReminderEnabled: true,
  staleReminderHours: 24,
  // Tự động chuyển lead sang "Thất bại" nếu quá hạn không có tương tác
  autoLostEnabled: true,
  autoLostDays: 14,
  // Nhắc đối soát các khoản hoa hồng đang chờ (pending) quá lâu
  commissionReminderEnabled: true,
  commissionPendingReminderDays: 7,
  // Gợi ý thăng hạng cho CTV đạt đủ chỉ tiêu tháng (không tự động thay đổi
  // cấp bậc - luôn cần Admin/BGĐ xác nhận thủ công vì ảnh hưởng tới hoa hồng)
  rankUpSuggestionEnabled: true,
};

class AutomationService {
  constructor() {
    this._systemActorId = null;
  }

  // ==========================================================
  // CẤU HÌNH
  // ==========================================================

  /**
   * Lấy cấu hình CRM Automation hiện tại (merge với giá trị mặc định để luôn
   * đầy đủ trường, kể cả khi DB mới chỉ lưu một phần cấu hình).
   */
  async getConfig() {
    const stored = await systemSettingService.getSetting(AUTOMATION_SETTING_KEY, DEFAULT_AUTOMATION_CONFIG);
    return { ...DEFAULT_AUTOMATION_CONFIG, ...(stored || {}) };
  }

  /**
   * Cập nhật (một phần hoặc toàn bộ) cấu hình CRM Automation.
   * @param {Object} partial - Các trường muốn thay đổi
   */
  async updateConfig(partial = {}) {
    const current = await this.getConfig();

    const toBool = (value, fallback) => (value !== undefined ? !!value : fallback);
    const toPositiveNumber = (value, fallback) => {
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : fallback;
    };

    const merged = {
      enabled: toBool(partial.enabled, current.enabled),
      autoAssignEnabled: toBool(partial.autoAssignEnabled, current.autoAssignEnabled),
      duplicateDetectionEnabled: toBool(partial.duplicateDetectionEnabled, current.duplicateDetectionEnabled),
      duplicateWindowDays: toPositiveNumber(partial.duplicateWindowDays, current.duplicateWindowDays),
      welcomeEmailEnabled: toBool(partial.welcomeEmailEnabled, current.welcomeEmailEnabled),
      internalAlertEnabled: toBool(partial.internalAlertEnabled, current.internalAlertEnabled),
      staleReminderEnabled: toBool(partial.staleReminderEnabled, current.staleReminderEnabled),
      staleReminderHours: toPositiveNumber(partial.staleReminderHours, current.staleReminderHours),
      autoLostEnabled: toBool(partial.autoLostEnabled, current.autoLostEnabled),
      autoLostDays: toPositiveNumber(partial.autoLostDays, current.autoLostDays),
      commissionReminderEnabled: toBool(partial.commissionReminderEnabled, current.commissionReminderEnabled),
      commissionPendingReminderDays: toPositiveNumber(partial.commissionPendingReminderDays, current.commissionPendingReminderDays),
      rankUpSuggestionEnabled: toBool(partial.rankUpSuggestionEnabled, current.rankUpSuggestionEnabled),
    };

    await systemSettingService.updateSetting(AUTOMATION_SETTING_KEY, merged);
    return merged;
  }

  // ==========================================================
  // TIỆN ÍCH DÙNG CHUNG
  // ==========================================================

  /**
   * Lấy (và cache trong bộ nhớ) ID của một tài khoản Admin thực tế trong hệ
   * thống để dùng làm "actor" cho các thông báo/nhật ký do hệ thống tự tạo.
   */
  async getSystemActorId() {
    if (this._systemActorId) return this._systemActorId;

    try {
      const adminRole = await Role.findOne({ slug: 'admin' }).lean();
      if (adminRole) {
        const adminUser = await User.findOne({ roleId: adminRole._id, deletedAt: null })
          .sort({ createdAt: 1 })
          .lean();
        if (adminUser) {
          this._systemActorId = adminUser._id.toString();
          return this._systemActorId;
        }
      }
    } catch (error) {
      console.error('[AutomationService] Lỗi khi xác định actor hệ thống:', error.message);
    }

    this._systemActorId = FALLBACK_SYSTEM_ACTOR_ID;
    return this._systemActorId;
  }

  /**
   * Tạo thông báo nội bộ nhắm tới các Vai trò cụ thể (ví dụ Admin, BGĐ).
   */
  async notifyRoles(roleSlugs, { title, content, priority = 'normal' }) {
    try {
      const actorId = await this.getSystemActorId();
      await Notification.create({
        title,
        content,
        priority,
        createdBy: actorId,
        createdByName: 'Hệ thống CRM Automation',
        target: { groups: [], roles: roleSlugs, departments: [] },
      });
    } catch (error) {
      console.error('[AutomationService] Lỗi khi tạo thông báo theo vai trò:', error.message);
    }
  }

  /**
   * Tạo thông báo nội bộ nhắm trực tiếp tới một hoặc nhiều User cụ thể
   * (ví dụ: đúng nhân sự/CTV đang phụ trách lead).
   */
  async notifyUsers(userIds, { title, content, priority = 'normal' }) {
    const cleanIds = (userIds || []).filter(Boolean).map((id) => id.toString());
    if (!cleanIds.length) return;

    try {
      const actorId = await this.getSystemActorId();
      await Notification.create({
        title,
        content,
        priority,
        createdBy: actorId,
        createdByName: 'Hệ thống CRM Automation',
        target: { groups: [], roles: [], departments: [], userIds: cleanIds },
      });
    } catch (error) {
      console.error('[AutomationService] Lỗi khi tạo thông báo theo người dùng:', error.message);
    }
  }

  /**
   * Chuẩn hoá 1 giá trị có thể là ObjectId thô hoặc đã populate thành Object
   * người dùng đầy đủ, trả về thông tin cơ bản { _id, fullName, email }.
   */
  async _resolveUserDetails(idOrPopulatedDoc) {
    if (!idOrPopulatedDoc) return null;
    if (typeof idOrPopulatedDoc === 'object' && idOrPopulatedDoc.fullName) {
      return idOrPopulatedDoc;
    }
    try {
      return await User.findById(idOrPopulatedDoc).select('fullName email phone').lean();
    } catch (error) {
      return null;
    }
  }

  /**
   * Xác định "chủ sở hữu" hiện tại của một lead để gửi nhắc nhở/thông báo:
   * ưu tiên nhân sự được tự động phân công (assignedStaffId), sau đó tới
   * Cộng tác viên giới thiệu (collaboratorId).
   */
  async resolveLeadOwner(lead) {
    return (
      (await this._resolveUserDetails(lead.assignedStaffId)) ||
      (await this._resolveUserDetails(lead.collaboratorId))
    );
  }

  /**
   * Lấy danh sách nhân sự nội bộ đủ điều kiện nhận phân công tự động,
   * sắp xếp theo "lâu chưa được giao việc nhất" để đảm bảo công bằng
   * (round-robin đơn giản dựa trên lastAssignedAt).
   */
  async getEligibleInternalStaff() {
    const roles = await Role.find({ slug: { $in: AUTO_ASSIGN_ROLE_SLUGS } }).lean();
    const roleIds = roles.map((r) => r._id);
    if (!roleIds.length) return [];

    return await User.find({ roleId: { $in: roleIds }, status: 'active', deletedAt: null })
      .sort({ lastAssignedAt: 1, createdAt: 1 })
      .select('fullName email phone lastAssignedAt')
      .lean();
  }

  // ==========================================================
  // 1. XỬ LÝ LEAD MỚI (chạy ngay khi CTV/khách hàng gửi lead)
  // ==========================================================

  /**
   * Chạy toàn bộ automation cho một lead vừa được tạo:
   *  - Phát hiện trùng lặp
   *  - Tự động phân công nhân sự nội bộ (nếu lead không có CTV giới thiệu)
   *  - Gửi email xác nhận cho khách hàng
   *  - Gửi thông báo/email nội bộ cho người phụ trách + cấp quản lý
   * Hàm này được thiết kế để chạy nền (không chặn phản hồi API tạo lead).
   * @param {import('mongoose').Document} lead - Bản ghi Lead vừa được lưu
   */
  async processNewLead(lead) {
    const config = await this.getConfig();
    if (!config.enabled) return;

    try {
      // ---- 1. Phát hiện trùng lặp ----
      let duplicateLead = null;
      if (config.duplicateDetectionEnabled) {
        duplicateLead = await leadService.findActiveDuplicate({
          phone: lead.phone,
          email: lead.email,
          excludeId: lead._id,
          windowDays: config.duplicateWindowDays,
        });

        if (duplicateLead) {
          await Lead.findByIdAndUpdate(lead._id, {
            $set: { isDuplicate: true, duplicateOfLeadId: duplicateLead._id },
          });

          const existingOwner =
            (await this._resolveUserDetails(duplicateLead.assignedStaffId)) ||
            (await this._resolveUserDetails(duplicateLead.collaboratorId));

          await this.notifyRoles(MANAGEMENT_ROLE_SLUGS, {
            title: 'Phát hiện Lead trùng lặp',
            content: `Khách hàng "${lead.customerName}" (${lead.phone}) vừa gửi thông tin nhưng đã có 1 lead đang xử lý${existingOwner ? ` bởi ${existingOwner.fullName}` : ''} trong ${config.duplicateWindowDays} ngày gần đây. Vui lòng kiểm tra để tránh trùng chăm sóc.`,
            priority: 'important',
          });

          await auditLogService.log(
            await this.getSystemActorId(),
            'automation.lead.duplicate_detected',
            { type: 'lead', id: lead._id.toString(), name: lead.customerName },
            { duplicateOfLeadId: duplicateLead._id.toString() }
          );
        }
      }

      // ---- 2. Tự động phân công nhân sự nội bộ (chỉ khi lead "tự nhiên", không có CTV giới thiệu) ----
      let assignedStaff = null;
      if (config.autoAssignEnabled && !lead.collaboratorId && !duplicateLead) {
        const staffList = await this.getEligibleInternalStaff();
        if (staffList.length) {
          const chosen = staffList[0];
          await User.findByIdAndUpdate(chosen._id, { $set: { lastAssignedAt: new Date() } });
          await leadService.assignStaff(lead._id, chosen._id);
          assignedStaff = chosen;

          await auditLogService.log(
            await this.getSystemActorId(),
            'automation.lead.auto_assigned',
            { type: 'lead', id: lead._id.toString(), name: lead.customerName },
            { assignedStaffId: chosen._id.toString(), assignedStaffName: chosen.fullName }
          );
        }
      }

      // ---- 3. Email xác nhận cho khách hàng ----
      if (config.welcomeEmailEnabled && lead.email && !duplicateLead) {
        mailService.sendLeadConfirmationEmail(lead.email, lead.customerName, lead.productInterest).catch(() => {});
        Lead.findByIdAndUpdate(lead._id, { $set: { confirmationSentAt: new Date() } }).catch(() => {});
      }

      // ---- 4. Thông báo/email nội bộ ----
      if (config.internalAlertEnabled && !duplicateLead) {
        const owner = assignedStaff || (await this._resolveUserDetails(lead.collaboratorId));

        await this.notifyRoles(MANAGEMENT_ROLE_SLUGS, {
          title: 'Lead mới',
          content: `Lead mới: "${lead.customerName}" (${lead.phone}) - ${lead.productInterest || 'Chưa rõ dịch vụ'}. ${
            assignedStaff
              ? `Đã tự động phân công cho ${assignedStaff.fullName}.`
              : lead.collaboratorId
              ? 'Được giới thiệu bởi Cộng tác viên.'
              : 'Chưa có người phụ trách - vui lòng phân công thủ công.'
          }`,
          priority: assignedStaff || lead.collaboratorId ? 'normal' : 'important',
        });

        if (owner) {
          await this.notifyUsers([owner._id], {
            title: 'Bạn có Lead mới cần xử lý',
            content: `Lead "${lead.customerName}" (${lead.phone}) vừa được ghi nhận và giao cho bạn phụ trách. Vui lòng liên hệ khách hàng sớm nhất có thể.`,
            priority: 'important',
          });

          if (owner.email) {
            mailService.sendNewLeadAlertEmail(owner.email, owner.fullName, lead).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error('[AutomationService] Lỗi khi xử lý CRM Automation cho lead mới:', error.message);
    }
  }

  // ==========================================================
  // 2. NHẮC NHỞ LEAD "IM LẶNG" QUÁ LÂU
  // ==========================================================

  async runStaleLeadCheck() {
    const config = await this.getConfig();
    if (!config.enabled || !config.staleReminderEnabled) {
      return { checked: 0, reminded: 0 };
    }

    const thresholdDate = new Date(Date.now() - config.staleReminderHours * 60 * 60 * 1000);
    const staleLeads = await Lead.find({
      deletedAt: null,
      status: 'dang_tu_van',
      updatedAt: { $lte: thresholdDate },
      lastReminderStage: { $ne: 'stale' },
    })
      .populate('collaboratorId', 'fullName email')
      .populate('assignedStaffId', 'fullName email')
      .limit(200);

    let reminded = 0;
    for (const lead of staleLeads) {
      try {
        const owner = lead.assignedStaffId || lead.collaboratorId;
        const hoursSince = Math.round((Date.now() - new Date(lead.updatedAt).getTime()) / (60 * 60 * 1000));

        if (owner) {
          await this.notifyUsers([owner._id], {
            title: 'Nhắc nhở: Lead chưa được chăm sóc',
            content: `Lead "${lead.customerName}" (${lead.phone}) đã ${hoursSince} giờ chưa được cập nhật trạng thái. Vui lòng liên hệ lại khách hàng.`,
            priority: 'important',
          });
          if (owner.email) {
            mailService.sendStaleLeadReminderEmail(owner.email, owner.fullName, lead, hoursSince).catch(() => {});
          }
        }

        await this.notifyRoles(MANAGEMENT_ROLE_SLUGS, {
          title: 'Lead chưa được chăm sóc kịp thời',
          content: `Lead "${lead.customerName}" (${lead.phone}) đã ${hoursSince} giờ chưa cập nhật trạng thái.${
            owner ? ` Phụ trách: ${owner.fullName}.` : ' Hiện chưa có người phụ trách.'
          }`,
          priority: 'normal',
        });

        await Lead.findByIdAndUpdate(lead._id, {
          $set: { lastReminderStage: 'stale', lastReminderAt: new Date() },
        });
        reminded += 1;
      } catch (error) {
        console.error(`[AutomationService] Lỗi khi nhắc nhở lead ${lead._id}:`, error.message);
      }
    }

    if (reminded > 0) {
      await auditLogService.log(
        await this.getSystemActorId(),
        'automation.lead.stale_reminder',
        { type: 'lead_batch', id: 'batch', name: `${reminded} lead(s)` },
        { count: reminded, staleReminderHours: config.staleReminderHours }
      );
    }

    return { checked: staleLeads.length, reminded };
  }

  // ==========================================================
  // 3. TỰ ĐỘNG ĐÓNG LEAD QUÁ HẠN KHÔNG TƯƠNG TÁC
  // ==========================================================

  async runAutoLostSweep() {
    const config = await this.getConfig();
    if (!config.enabled || !config.autoLostEnabled) {
      return { closed: 0 };
    }

    const thresholdDate = new Date(Date.now() - config.autoLostDays * 24 * 60 * 60 * 1000);
    const overdueLeads = await Lead.find({
      deletedAt: null,
      status: 'dang_tu_van',
      updatedAt: { $lte: thresholdDate },
    })
      .populate('collaboratorId', 'fullName email')
      .populate('assignedStaffId', 'fullName email')
      .limit(200);

    let closed = 0;
    const crmService = require('./crm.service');

    for (const lead of overdueLeads) {
      try {
        const oldStatus = lead.status;
        lead.status = 'lost';
        lead.lostReason = `Tự động: Không có tương tác/cập nhật sau ${config.autoLostDays} ngày.`;
        lead.autoLostAt = new Date();
        lead.lastReminderStage = 'auto_lost';
        lead.lastReminderAt = new Date();
        await lead.save();

        const owner = lead.assignedStaffId || lead.collaboratorId;
        if (owner) {
          await this.notifyUsers([owner._id], {
            title: 'Một Lead đã tự động chuyển sang "Thất bại"',
            content: `Lead "${lead.customerName}" (${lead.phone}) đã tự động chuyển sang "Thất bại" do không có cập nhật sau ${config.autoLostDays} ngày. Bạn có thể mở lại nếu đây là nhầm lẫn.`,
            priority: 'normal',
          });
          if (owner.email) {
            mailService.sendAutoLostNoticeEmail(owner.email, owner.fullName, lead, config.autoLostDays).catch(() => {});
          }
        }

        await this.notifyRoles(MANAGEMENT_ROLE_SLUGS, {
          title: 'Lead tự động chuyển sang Thất bại',
          content: `Lead "${lead.customerName}" (${lead.phone}) đã tự động chuyển sang "Thất bại" do quá ${config.autoLostDays} ngày không có cập nhật.`,
          priority: 'normal',
        });

        // Đồng bộ trạng thái mới lên Bizfly CRM (chạy nền, không chặn vòng lặp)
        crmService.forwardToBizFly(lead).catch(() => {});

        await auditLogService.log(
          await this.getSystemActorId(),
          'automation.lead.auto_lost',
          { type: 'lead', id: lead._id.toString(), name: lead.customerName },
          { oldStatus, newStatus: 'lost', autoLostDays: config.autoLostDays }
        );

        closed += 1;
      } catch (error) {
        console.error(`[AutomationService] Lỗi khi tự động đóng lead ${lead._id}:`, error.message);
      }
    }

    return { closed };
  }

  // ==========================================================
  // 4. NHẮC ĐỐI SOÁT HOA HỒNG ĐANG CHỜ QUÁ LÂU
  // ==========================================================

  async runCommissionPendingReminder() {
    const config = await this.getConfig();
    if (!config.enabled || !config.commissionReminderEnabled) {
      return { count: 0 };
    }

    const thresholdDate = new Date(Date.now() - config.commissionPendingReminderDays * 24 * 60 * 60 * 1000);
    const pendingCommissions = await Commission.find({
      status: 'pending',
      createdAt: { $lte: thresholdDate },
    }).lean();

    if (!pendingCommissions.length) {
      return { count: 0 };
    }

    const totalAmount = pendingCommissions.reduce((sum, item) => sum + (item.commissionAmount || 0), 0);

    const managementRoles = await Role.find({ slug: { $in: ['admin', 'bangiamdoc'] } }).lean();
    const managementUsers = await User.find({
      roleId: { $in: managementRoles.map((r) => r._id) },
      status: 'active',
      deletedAt: null,
    }).lean();

    for (const user of managementUsers) {
      if (user.email) {
        mailService
          .sendCommissionPendingReminderEmail(user.email, user.fullName, pendingCommissions.length, totalAmount)
          .catch(() => {});
      }
    }

    await this.notifyRoles(['admin', 'bangiamdoc'], {
      title: 'Nhắc đối soát hoa hồng Cộng tác viên',
      content: `Hiện có ${pendingCommissions.length} khoản hoa hồng đang chờ đối soát quá ${config.commissionPendingReminderDays} ngày, tổng giá trị khoảng ${totalAmount.toLocaleString('vi-VN')} VND.`,
      priority: 'important',
    });

    await auditLogService.log(
      await this.getSystemActorId(),
      'automation.commission.pending_reminder',
      { type: 'commission_batch', id: 'batch', name: `${pendingCommissions.length} commission(s)` },
      { count: pendingCommissions.length, totalAmount }
    );

    return { count: pendingCommissions.length, totalAmount };
  }

  // ==========================================================
  // 5. GỢI Ý THĂNG HẠNG CTV (chỉ gợi ý - không tự thay đổi cấp bậc)
  // ==========================================================

  async runRankUpSuggestions() {
    const config = await this.getConfig();
    if (!config.enabled || !config.rankUpSuggestionEnabled) {
      return { suggested: 0 };
    }

    const commissionService = require('./commission.service');
    const roles = await Role.find({ slug: { $in: ['congtacvien', 'daily'] } }).lean();
    const collaborators = await User.find({
      roleId: { $in: roles.map((r) => r._id) },
      status: 'active',
      deletedAt: null,
    }).lean();

    // Đánh giá theo tháng liền trước (đã có đủ dữ liệu trọn tháng)
    const now = new Date();
    let month = now.getMonth(); // getMonth() trả về 0-11 -> đây đã tương đương "tháng trước" ở dạng 1-12
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    const rankOrder = ['Loyal', 'Bronze', 'Silver', 'Gold', 'Daimion', 'Master'];
    let suggested = 0;

    for (const collaborator of collaborators) {
      try {
        const stats = await commissionService.getCollaboratorStats(collaborator._id.toString(), month, year);
        const currentRankIndex = rankOrder.indexOf(collaborator.rank || 'Bronze');
        const reachedIndexes = (stats.ranksProgress || [])
          .filter((r) => r.isReached)
          .map((r) => rankOrder.indexOf(r.rank));
        const highestReachedIndex = reachedIndexes.length ? Math.max(...reachedIndexes) : -1;

        if (highestReachedIndex > currentRankIndex) {
          const suggestedRankInfo = stats.ranksProgress.find(
            (r) => rankOrder.indexOf(r.rank) === highestReachedIndex
          );

          await this.notifyRoles(['admin', 'bangiamdoc'], {
            title: 'Gợi ý thăng hạng Cộng tác viên',
            content: `CTV "${collaborator.fullName}" đã đạt đủ chỉ tiêu tháng ${month}/${year} để thăng hạng "${
              suggestedRankInfo ? suggestedRankInfo.name : ''
            }". Vui lòng xem xét và cập nhật cấp bậc nếu phù hợp.`,
            priority: 'normal',
          });

          suggested += 1;
        }
      } catch (error) {
        console.error(`[AutomationService] Lỗi khi tính gợi ý thăng hạng cho CTV ${collaborator._id}:`, error.message);
      }
    }

    if (suggested > 0) {
      await auditLogService.log(
        await this.getSystemActorId(),
        'automation.collaborator.rank_up_suggested',
        { type: 'collaborator_batch', id: 'batch', name: `${suggested} CTV` },
        { month, year, suggested }
      );
    }

    return { suggested };
  }

  // ==========================================================
  // TỔNG QUAN & CHẠY THỦ CÔNG
  // ==========================================================

  async getOverview() {
    const config = await this.getConfig();
    const staleThreshold = new Date(Date.now() - config.staleReminderHours * 60 * 60 * 1000);
    const autoLostThreshold = new Date(Date.now() - config.autoLostDays * 24 * 60 * 60 * 1000);
    const commissionThreshold = new Date(Date.now() - config.commissionPendingReminderDays * 24 * 60 * 60 * 1000);
    const recentSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [unassignedLeads, staleLeads, dueForAutoLost, recentDuplicates, overduePendingCommissions] =
      await Promise.all([
        Lead.countDocuments({
          deletedAt: null,
          status: { $ne: 'lost' },
          collaboratorId: null,
          assignedStaffId: null,
        }),
        Lead.countDocuments({ deletedAt: null, status: 'dang_tu_van', updatedAt: { $lte: staleThreshold } }),
        Lead.countDocuments({ deletedAt: null, status: 'dang_tu_van', updatedAt: { $lte: autoLostThreshold } }),
        Lead.countDocuments({ deletedAt: null, isDuplicate: true, createdAt: { $gte: recentSince } }),
        Commission.countDocuments({ status: 'pending', createdAt: { $lte: commissionThreshold } }),
      ]);

    return {
      config,
      stats: {
        unassignedLeads,
        staleLeads,
        dueForAutoLost,
        recentDuplicates,
        overduePendingCommissions,
      },
    };
  }

  /**
   * Chạy toàn bộ các tác vụ automation ngay lập tức (dùng cho nút "Chạy kiểm
   * tra ngay" của Admin, hoặc job nền định kỳ). Chạy tuần tự (không song
   * song) để tránh trường hợp một lead vừa quá hạn tự động đóng lại vừa bị
   * nhắc "im lặng" trong cùng 1 chu kỳ.
   */
  async runFullCheck() {
    const autoLostResult = await this.runAutoLostSweep();
    const staleResult = await this.runStaleLeadCheck();
    const commissionResult = await this.runCommissionPendingReminder();
    const rankUpResult = await this.runRankUpSuggestions();

    return { autoLostResult, staleResult, commissionResult, rankUpResult };
  }
}

module.exports = new AutomationService();
