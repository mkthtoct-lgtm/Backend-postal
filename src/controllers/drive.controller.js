const googleDriveService = require('../services/googleDrive.service');

class DriveController {
  /**
   * GET /api/v1/drive/:fileId
   * Lấy luồng dữ liệu (stream) ảnh từ Google Drive và trả về trực tiếp cho Browser
   */
  async streamFile(req, res) {
    try {
      const { fileId } = req.params;
      if (!fileId) {
        return res.status(400).json({ success: false, message: 'Thiếu fileId' });
      }

      const stream = await googleDriveService.getFileStream(fileId);
      
      // Google Drive API trả về GaxiosResponse stream.
      // Cần set headers cơ bản. MimeType có thể lấy từ DB hoặc Google Drive metadata,
      // nhưng để stream nhanh, ta phó thác cho Browser đoán hoặc set chung chung
      // Hoặc ta cache MIME Type nếu truyền qua query (vd: ?mimeType=image/png)
      if (req.query.mimeType) {
        res.setHeader('Content-Type', req.query.mimeType);
      } else {
        // Fallback
        res.setHeader('Content-Type', 'image/jpeg');
      }
      
      // Cache dài hạn trên trình duyệt
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      // Pipe dữ liệu từ Google Drive thẳng vào HTTP Response
      stream.pipe(res);

      stream.on('error', (err) => {
        console.error('Lỗi khi stream file từ Google Drive:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Lỗi khi stream file' });
        }
      });
    } catch (error) {
      console.error('Lỗi API stream Google Drive:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
      }
    }
  }
}

module.exports = new DriveController();
