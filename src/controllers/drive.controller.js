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

      const result = await googleDriveService.getFileStream(fileId);
      const stream = (result && result.stream) ? result.stream : result;
      
      if (!stream) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy file trên Google Drive' });
      }

      const getHeader = (headers, key) => {
        if (!headers) return undefined;
        if (typeof headers.get === 'function') return headers.get(key);
        return headers[key] || headers[key.toLowerCase()];
      };

      // Set Content-Type
      if (req.query.mimeType) {
        res.setHeader('Content-Type', req.query.mimeType);
      } else if (result && result.headers) {
        const ct = getHeader(result.headers, 'content-type');
        res.setHeader('Content-Type', ct || 'image/jpeg');
      } else {
        res.setHeader('Content-Type', 'image/jpeg');
      }

      // Set Content-Length if available
      if (result && result.headers) {
        const cl = getHeader(result.headers, 'content-length');
        if (cl) res.setHeader('Content-Length', cl);
      }
      
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      if (typeof stream.on === 'function') {
        stream.on('error', (err) => {
          console.error('Lỗi khi stream file từ Google Drive:', err);
          if (!res.headersSent) {
            res.removeHeader('Content-Type');
            res.removeHeader('Content-Disposition');
            res.removeHeader('Cache-Control');
            res.status(500).json({ success: false, message: 'Lỗi khi stream file' });
          }
        });
      }

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
