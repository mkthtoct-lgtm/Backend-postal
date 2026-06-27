const Commission = require('../models/Commission');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Product = require('../models/Product');
const NewsPost = require('../models/NewsPost');
const systemSettingService = require('./systemSetting.service');

const DEFAULT_COMMISSION_CONFIG = {
  khachHangThanThiet: 5,
  daiSuGieoMamDong: 5,
  daiSuKetNoiBac: 6,
  daiSuTruCotVang: 7,
  daiSuTinhAnhKimCuong: 8,
  daiSuTanTamMaster: 10
};

// Bảng cấu hình tỷ lệ hoa hồng và các chỉ tiêu của từng cấp bậc
const COMMISSION_RANKS = {
  Bronze: {
    rate: 0.05,
    name: 'Đại sứ Gieo Mầm',
    targets: { posts: 5, referrals: 5, qualified: 1, sales: 45000000 }
  },
  Silver: {
    rate: 0.06,
    name: 'Đại sứ Kết Nối',
    targets: { posts: 20, referrals: 10, qualified: 2, sales: 90000000 }
  },
  Gold: {
    rate: 0.07,
    name: 'Đại sứ Trụ Cột',
    targets: { posts: 30, referrals: 15, qualified: 3, sales: 150000000 }
  },
  Daimion: {
    rate: 0.08,
    name: 'Đại sứ Tinh Anh',
    targets: { posts: 35, referrals: 20, qualified: 5, sales: 250000000 }
  },
  Master: {
    rate: 0.10,
    name: 'Đại sứ Tận Tâm',
    targets: { posts: 50, referrals: 35, qualified: 7, sales: 350000000 }
  }
};

// Bảng giá bán sản phẩm dự phòng để đối chiếu nếu trong database bị trống/bằng 0
const PRODUCT_PRICES = {
  'd41': 85000000,
  'd22': 85000000,
  'd26': 150000000,
  'vhvl + 1 + 4': 45000000,
  'intense': 45000000,
  'intership (6 tháng)': 40500000,
  'intership (1 năm)': 45900000,
  'du học nghề': 220000000,
  'dhn học tiếng': 360000000
};

class CommissionService {
  /**
   * Tính toán và ghi nhận hoa hồng khi một Lead được cập nhật thành công (trạng thái 'xu_ly_ho_so')
   * @param {string} leadId - ID của Lead
   */
  async calculateCommission(leadId) {
    // 1. Tìm thông tin chi tiết về Lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Không tìm thấy thông tin Lead.');
    }

    // Chỉ tính hoa hồng cho các lead được giới thiệu bởi Cộng tác viên
    if (!lead.collaboratorId) {
      console.log(`[CommissionService] Lead ${leadId} không có collaboratorId. Bỏ qua tính hoa hồng.`);
      return null;
    }

    // Kiểm tra xem lead này đã được tính hoa hồng trước đó chưa
    const existingCommission = await Commission.findOne({ leadId });
    if (existingCommission) {
      console.log(`[CommissionService] Lead ${leadId} đã được tính hoa hồng trước đó. Bỏ qua.`);
      return existingCommission;
    }

    // 2. Tìm thông tin Cộng tác viên để lấy cấp bậc (rank)
    const collaborator = await User.findById(lead.collaboratorId);
    if (!collaborator) {
      throw new Error('Không tìm thấy thông tin Cộng tác viên.');
    }

    const rank = collaborator.rank || 'Bronze';
    
    // Đọc cấu hình tỷ lệ hoa hồng động từ DB
    const commissionConfig = await systemSettingService.getSetting('commission_config', DEFAULT_COMMISSION_CONFIG);
    const rankMapping = {
      Bronze: 'daiSuGieoMamDong',
      Silver: 'daiSuKetNoiBac',
      Gold: 'daiSuTruCotVang',
      Daimion: 'daiSuTinhAnhKimCuong',
      Master: 'daiSuTanTamMaster'
    };
    const configKey = rankMapping[rank] || 'daiSuGieoMamDong';
    const dynamicRatePercentage = commissionConfig[configKey] !== undefined 
      ? commissionConfig[configKey] 
      : (DEFAULT_COMMISSION_CONFIG[configKey] || 5);
    const dynamicRate = dynamicRatePercentage / 100;

    // 3. Tìm sản phẩm trong DB để lấy giá bán (serviceFee)
    let productPrice = 0;
    let productInterestName = lead.productInterest || '';

    let product = await Product.findOne({ name: productInterestName, deletedAt: null });
    if (!product) {
      // Tìm kiếm dự phòng không phân biệt hoa thường
      product = await Product.findOne({
        name: { $regex: new RegExp('^' + productInterestName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
        deletedAt: null
      });
    }

    if (product && product.serviceFee > 0) {
      productPrice = product.serviceFee;
    } else {
      // Dùng bảng giá dự phòng nếu DB không có hoặc giá bằng 0
      const cleanName = productInterestName.trim().toLowerCase();
      productPrice = PRODUCT_PRICES[cleanName] || 0;
    }

    // Nếu vẫn không xác định được giá, mặc định lấy một mức giá trung bình của các gói để tránh tính ra 0
    if (productPrice === 0) {
      console.warn(`[CommissionService] Không tìm thấy giá bán cho sản phẩm "${productInterestName}". Mặc định giá 45,000,000 VND.`);
      productPrice = 45000000;
    }

    // 4. Tính toán số tiền hoa hồng
    const commissionAmount = productPrice * dynamicRate;

    // 5. Lưu vào bảng Commissions để đối soát
    const commission = new Commission({
      leadId: lead._id,
      collaboratorId: lead.collaboratorId,
      customerName: lead.customerName,
      productInterest: productInterestName,
      productPrice,
      collaboratorRank: rank,
      commissionRate: dynamicRate,
      commissionAmount,
      status: 'pending' // Chờ đối soát và phê duyệt từ Admin
    });

    await commission.save();
    console.log(`[CommissionService] Ghi nhận hoa hồng thành công cho CTV ${collaborator.fullName}: ${commissionAmount} VND (Cấp: ${rank}, Tỷ lệ: ${dynamicRate * 100}%)`);
    return commission;
  }

  /**
   * Tính toán các chỉ số thực hiện trong tháng của Cộng tác viên
   * @param {string} userId - ID của Cộng tác viên
   * @param {number} month - Tháng (1-12)
   * @param {number} year - Năm
   */
  async getCollaboratorStats(userId, month, year) {
    const collaborator = await User.findById(userId);
    if (!collaborator) {
      throw new Error('Không tìm thấy thông tin Cộng tác viên.');
    }

    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // 1. Chỉ số Bài viết (Bài đăng tin tức)
    // Đếm số bài viết mà tác giả ghi tên CTV (fullName hoặc email)
    const postsCount = await NewsPost.countDocuments({
      $or: [
        { author: collaborator.fullName },
        { author: collaborator.email }
      ],
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 2. Chỉ số Hồ sơ phát sinh (Số lead giới thiệu)
    const referralsCount = await Lead.countDocuments({
      collaboratorId: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      deletedAt: null
    });

    // 3. Chỉ số Tỷ lệ data đủ điều kiện (Số lead có tương tác thực tế - khác trạng thái mới 'dang_tu_van' hoặc 'lost')
    const qualifiedCount = await Lead.countDocuments({
      collaboratorId: userId,
      status: { $in: ['cho_chot_hop_dong', 'xu_ly_ho_so'] },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      deletedAt: null
    });

    // 4. Chỉ số Doanh số và Hoa hồng của tháng
    const monthlyCommissions = await Commission.find({
      collaboratorId: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const salesTotal = monthlyCommissions.reduce((sum, item) => sum + item.productPrice, 0);
    const commissionEarned = monthlyCommissions.reduce((sum, item) => sum + item.commissionAmount, 0);

    // Lấy cấp bậc hiện tại của CTV
    const currentRank = collaborator.rank || 'Bronze';

    // Đọc cấu hình tỷ lệ hoa hồng động từ DB
    const commissionConfig = await systemSettingService.getSetting('commission_config', DEFAULT_COMMISSION_CONFIG);
    const rankMapping = {
      Bronze: 'daiSuGieoMamDong',
      Silver: 'daiSuKetNoiBac',
      Gold: 'daiSuTruCotVang',
      Daimion: 'daiSuTinhAnhKimCuong',
      Master: 'daiSuTanTamMaster'
    };

    // Tổng hợp tiến độ so với các mốc cấp bậc
    const ranksProgress = Object.entries(COMMISSION_RANKS).map(([rankKey, rankInfo]) => {
      const configKey = rankMapping[rankKey] || 'daiSuGieoMamDong';
      const dynamicRatePercentage = commissionConfig[configKey] !== undefined 
        ? commissionConfig[configKey] 
        : (DEFAULT_COMMISSION_CONFIG[configKey] || 5);
      const dynamicRate = dynamicRatePercentage / 100;

      const isReached = 
        postsCount >= rankInfo.targets.posts &&
        referralsCount >= rankInfo.targets.referrals &&
        qualifiedCount >= rankInfo.targets.qualified &&
        salesTotal >= rankInfo.targets.sales;

      return {
        rank: rankKey,
        name: rankInfo.name,
        rate: dynamicRate,
        targets: rankInfo.targets,
        isReached,
        progress: {
          posts: Math.min(100, Math.round((postsCount / rankInfo.targets.posts) * 100)),
          referrals: Math.min(100, Math.round((referralsCount / rankInfo.targets.referrals) * 100)),
          qualified: Math.min(100, Math.round((qualifiedCount / rankInfo.targets.qualified) * 100)),
          sales: Math.min(100, Math.round((salesTotal / rankInfo.targets.sales) * 100))
        }
      };
    });

    return {
      month: currentMonth,
      year: currentYear,
      collaborator: {
        id: collaborator._id.toString(),
        fullName: collaborator.fullName,
        rank: currentRank,
        rankName: COMMISSION_RANKS[currentRank]?.name || 'Đại sứ Gieo Mầm'
      },
      stats: {
        posts: postsCount,
        referrals: referralsCount,
        qualified: qualifiedCount,
        sales: salesTotal,
        commissionEarned
      },
      ranksProgress
    };
  }

  /**
   * Lấy danh sách giao dịch hoa hồng (hỗ trợ phân trang và bộ lọc)
   * @param {Object} query - Các tham số lọc
   */
  async getCommissions({ collaboratorId, status, search, page = 1, limit = 10 } = {}) {
    const filter = {};

    if (collaboratorId) {
      filter.collaboratorId = collaboratorId;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { productInterest: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const items = await Commission.find(filter)
      .populate('collaboratorId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const total = await Commission.countDocuments(filter);

    return {
      items: items.map(item => ({
        id: item._id.toString(),
        leadId: item.leadId.toString(),
        collaborator: item.collaboratorId ? {
          id: item.collaboratorId._id.toString(),
          fullName: item.collaboratorId.fullName,
          email: item.collaboratorId.email,
          phone: item.collaboratorId.phone
        } : null,
        customerName: item.customerName,
        productInterest: item.productInterest,
        productPrice: item.productPrice,
        collaboratorRank: item.collaboratorRank,
        commissionRate: item.commissionRate,
        commissionAmount: item.commissionAmount,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    };
  }

  /**
   * Phê duyệt hoặc cập nhật trạng thái của một giao dịch hoa hồng (Admin đối soát)
   * @param {string} id - Commission ID
   * @param {string} status - Trạng thái mới ('approved', 'paid', 'cancelled')
   */
  async updateCommissionStatus(id, status) {
    const validStatuses = ['pending', 'approved', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Trạng thái cập nhật không hợp lệ.');
    }

    const commission = await Commission.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, returnDocument: 'after' }
    ).populate('collaboratorId', 'fullName email phone');

    if (!commission) {
      throw new Error('Không tìm thấy giao dịch hoa hồng.');
    }

    return commission;
  }
}

module.exports = new CommissionService();
