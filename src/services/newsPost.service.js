const NewsPost = require('../models/NewsPost');
const marketingAutomationService = require('./marketingAutomation.service');

class NewsPostService {
  /**
   * Lấy danh sách tin tức & sự kiện có bộ lọc và tìm kiếm
   */
  async findAll({ search = '', type = 'all' } = {}) {
    const filter = {};

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    // Sắp xếp theo ngày (date) giảm dần
    return await NewsPost.find(filter).sort({ date: -1 });
  }

  /**
   * Lấy chi tiết tin tức hoặc sự kiện bằng ID
   */
  async findById(id) {
    return await NewsPost.findById(id);
  }

  /**
   * Tạo tin tức hoặc sự kiện mới
   */
  async create(data) {
    // Nếu bài viết này được đặt nổi bật, gỡ nổi bật tất cả bài viết khác
    if (data.featured) {
      await NewsPost.updateMany({ featured: true }, { $set: { featured: false } });
    }

    const newArticle = new NewsPost(data);
    const savedArticle = await newArticle.save();

    // [MARKETING AUTOMATION] Gửi bản tin cho khách hàng đang hoạt động khi có
    // tin tức/sự kiện mới (chạy nền, tự kiểm tra công tắc bật/tắt bên trong
    // service - mặc định TẮT cho tới khi Admin chủ động bật).
    marketingAutomationService.broadcastNewsletter(savedArticle).catch((error) => {
      console.error('[NewsPostService] Lỗi khi gửi bản tin newsletter tự động:', error.message);
    });

    return savedArticle;
  }

  /**
   * Cập nhật thông tin tin tức hoặc sự kiện
   */
  async update(id, data) {
    // Nếu bài viết này được đặt nổi bật, gỡ nổi bật tất cả bài viết khác
    if (data.featured) {
      await NewsPost.updateMany({ _id: { $ne: id }, featured: true }, { $set: { featured: false } });
    }

    return await NewsPost.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Xóa bài viết tin tức hoặc sự kiện
   */
  async delete(id) {
    return await NewsPost.findByIdAndDelete(id);
  }
}

module.exports = new NewsPostService();
