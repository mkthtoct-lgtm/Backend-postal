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
      
      if (!stream) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy file trên Google Drive' });
      }

      // Google Drive API trả về GaxiosResponse stream.
      // Cần set headers cơ bản. MimeType có thể lấy từ DB hoặc Google Drive metadata.
      if (req.query.mimeType) {
        res.setHeader('Content-Type', req.query.mimeType);
      } else {
        // Fallback
        res.setHeader('Content-Type', 'image/jpeg');
      }
      
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      stream.on('error', (err) => {
        console.error('Lỗi khi stream file từ Google Drive:', err);
        if (!res.headersSent) {
          res.removeHeader('Content-Type');
          res.removeHeader('Content-Disposition');
          res.removeHeader('Cache-Control');
          res.status(500).json({ success: false, message: 'Lỗi khi stream file' });
        }
      });

      // Pipe dữ liệu từ Google Drive thẳng vào HTTP Response
      stream.pipe(res);
    } catch (error) {
      console.error('Lỗi API stream Google Drive:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
      }
    }
  }
}

module.exports = new DriveController();
