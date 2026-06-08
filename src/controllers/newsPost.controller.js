const newsPostService = require('../services/newsPost.service');

class NewsPostController {
  /**
   * Lấy toàn bộ danh sách tin tức & sự kiện (có tìm kiếm, lọc)
   */
  async getAll(req, res) {
    try {
      const { search, type } = req.query;
      const articles = await newsPostService.findAll({ search, type });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách tin tức & sự kiện thành công.',
        data: articles,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách tin tức & sự kiện.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết bài viết tin tức hoặc sự kiện bằng ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const article = await newsPostService.findById(id);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết tin tức hoặc sự kiện.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết tin tức & sự kiện thành công.',
        data: article,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết tin tức & sự kiện.',
        error: error.message,
      });
    }
  }

  /**
   * Tạo bài viết tin tức hoặc sự kiện mới (Chỉ dành cho Admin/BGĐ)
   */
  async create(req, res) {
    try {
      const article = await newsPostService.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Tạo tin tức & sự kiện thành công.',
        data: article,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo tin tức & sự kiện.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật bài viết tin tức hoặc sự kiện bằng ID (Chỉ dành cho Admin/BGĐ)
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const article = await newsPostService.update(id, req.body);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết tin tức hoặc sự kiện để cập nhật.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật tin tức & sự kiện thành công.',
        data: article,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật tin tức & sự kiện.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa bài viết tin tức hoặc sự kiện bằng ID (Chỉ dành cho Admin/BGĐ)
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const article = await newsPostService.delete(id);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết tin tức hoặc sự kiện để xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Xóa tin tức & sự kiện thành công.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa tin tức & sự kiện.',
        error: error.message,
      });
    }
  }
}

module.exports = new NewsPostController();
