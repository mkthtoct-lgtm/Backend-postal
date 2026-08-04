const mediaService = require('../services/media.service');

class MediaController {
  // GET /api/v1/media
  async getAll(req, res) {
    try {
      const result = await mediaService.findMedias(req.query);
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách media thành công.',
        data: result.medias,
        pagination: result.pagination
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách media',
        error: error.message
      });
    }
  }

  // GET /api/v1/media/:id
  async getById(req, res) {
    try {
      const media = await mediaService.findById(req.params.id);
      if (!media) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy media' });
      }
      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin media thành công',
        data: media
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/v1/media
  async create(req, res) {
    try {
      const newMedia = await mediaService.createMedia(req.body);
      return res.status(201).json({
        success: true,
        message: 'Tạo media mới thành công',
        data: newMedia
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/v1/media/:id
  async update(req, res) {
    try {
      const updatedMedia = await mediaService.updateMedia(req.params.id, req.body);
      if (!updatedMedia) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy media để cập nhật' });
      }
      return res.status(200).json({
        success: true,
        message: 'Cập nhật media thành công',
        data: updatedMedia
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/v1/media/:id
  async delete(req, res) {
    try {
      const deleted = await mediaService.deleteMedia(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy media để xóa' });
      }
      return res.status(200).json({
        success: true,
        message: 'Xóa media thành công'
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new MediaController();
