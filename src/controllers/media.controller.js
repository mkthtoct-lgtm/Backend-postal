const mediaService = require('../services/media.service');
const googleDriveService = require('../services/googleDrive.service');
const youtubeService = require('../services/youtube.service');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const env = require('../configs/env');

const ALLOWED_EXTENSIONS = {
  visa_result: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  video_library: ['mp4', 'avi', 'mov', 'wmv', 'webm', 'flv', '3gp', 'mkv'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
};

function getExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

class MediaController {
  // Lấy danh sách Media (có phân trang & lọc)
  async getAll(req, res) {
    try {
      const canWrite = req.user?.effectivePermissions?.includes('media.write') || req.user?.effectivePermissions?.includes('*');
      const result = await mediaService.findMedias(req.query, canWrite);
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách media thành công.',
        data: result,
        pagination: result.pagination
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách media', error: error.message });
    }
  }

  // Lấy chi tiết Media
  async getById(req, res) {
    try {
      const canWrite = req.user?.effectivePermissions?.includes('media.write') || req.user?.effectivePermissions?.includes('*');
      const media = await mediaService.findById(req.params.id, canWrite);
      if (!media) return res.status(404).json({ success: false, message: 'Không tìm thấy media' });
      return res.status(200).json({ success: true, message: 'Lấy thông tin media thành công', data: media });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Cấp Token truy cập ngắn hạn (15 phút)
  async getAccess(req, res) {
    try {
      const { action = 'preview' } = req.query; // preview hoặc download
      const canWrite = req.user?.effectivePermissions?.includes('media.write') || req.user?.effectivePermissions?.includes('*');
      const media = await mediaService.findById(req.params.id, canWrite);
      
      if (!media) return res.status(404).json({ success: false, message: 'Không tìm thấy media' });
      if (media.storageProvider === 'YOUTUBE' || media.youtubeVideoId) {
        return res.status(400).json({ success: false, message: 'Không hỗ trợ cấp token cho video YouTube.' });
      }

      const fileId = media.storageFileId || media.imageFileId;
      if (!fileId) return res.status(404).json({ success: false, message: 'Media không có file đính kèm' });

      // Sinh JWT JWT Secret lấy từ env
      const secret = env.JWT?.SECRET;
      if (!secret) throw new Error('Cấu hình hệ thống thiếu JWT.SECRET. Vui lòng liên hệ quản trị viên.');

      if (!req.user || (!req.user.sub && !req.user._id)) {
        return res.status(401).json({ success: false, message: 'Không xác định được thông tin người dùng (User ID) để cấp quyền truy cập.' });
      }

      const userId = req.user.sub || req.user._id.toString();
      const mediaId = media._id ? media._id.toString() : media.id;

      const token = jwt.sign(
        { 
          mediaId: mediaId, 
          userId: userId,
          action: action
        }, 
        secret, 
        { expiresIn: '5m' } // Đổi sang 5 phút theo yêu cầu bảo mật
      );

      return res.status(200).json({
        success: true,
        message: 'Lấy token truy cập thành công',
        access_token: token,
        url: `/api/v1/media/stream?token=${token}`
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // API Stream/Download (Public endpoint, tự verify token)
  async stream(req, res) {
    try {
      const { token } = req.query;
      if (!token) return res.status(401).json({ success: false, message: 'Yêu cầu token xác thực' });

      const secret = env.JWT?.SECRET;
      if (!secret) return res.status(500).json({ success: false, message: 'Lỗi cấu hình hệ thống: Thiếu JWT.SECRET.' });
      
      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch (err) {
        return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
      }

      // Xác minh DB tồn tại
      const media = await mediaService.findById(decoded.mediaId, true); // true để lấy full metadata
      if (!media) return res.status(404).json({ success: false, message: 'Không tìm thấy media' });
      
      const fileId = media.storageFileId || media.imageFileId;
      if (!fileId) return res.status(404).json({ success: false, message: 'Media không có file đính kèm hợp lệ' });

      // Xác định tên file và disposition
      const filename = media.fileName || 'download';
      const ext = getExtension(filename);
      let disposition = 'attachment';
      
      // Inline cho Ảnh và PDF nếu action = preview
      if (decoded.action === 'preview' && (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || (media.mimeType && media.mimeType.includes('image/')))) {
        disposition = 'inline';
      } else if (decoded.action === 'download') {
        disposition = 'attachment';
      } else if (decoded.action === 'preview' && ['mp4', 'avi', 'mov', 'wmv', 'webm', 'flv', '3gp', 'mkv'].includes(ext)) {
        // Video preview
        disposition = 'inline';
      }

      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (media.mimeType || media.imageMimeType) {
        res.setHeader('Content-Type', media.mimeType || media.imageMimeType);
      }
      
      // Hàm hỗ trợ lấy header an toàn (Axios 1.x dùng headers.get(), các bản cũ dùng bracket)
      const getHeader = (headers, key) => {
        if (!headers) return undefined;
        if (typeof headers.get === 'function') return headers.get(key);
        return headers[key] || headers[key.toLowerCase()];
      };

      // Xử lý Range nếu có
      const range = req.headers.range;
      if (range) {
        const streamData = await googleDriveService.getFileStreamWithRange(fileId, range);
        
        // Cần truyền lại các headers quan trọng từ Google Drive
        if (streamData.status === 206) {
          res.status(206);
          const contentRange = getHeader(streamData.headers, 'content-range');
          const acceptRanges = getHeader(streamData.headers, 'accept-ranges') || 'bytes';
          const contentLength = getHeader(streamData.headers, 'content-length');

          if (contentRange) res.setHeader('Content-Range', contentRange);
          res.setHeader('Accept-Ranges', acceptRanges);
          if (contentLength) res.setHeader('Content-Length', contentLength);
        }
        
        streamData.stream.pipe(res);
      } else {
        // Fallback: Lấy stream không có range (cũng nên trả về headers nếu có thể)
        const streamData = await googleDriveService.getFileStream(fileId);
        
        // Nếu getFileStream trả về object có chứa headers (đã fix ở googleDriveService)
        if (streamData.headers) {
          const contentLength = getHeader(streamData.headers, 'content-length');
          if (contentLength) res.setHeader('Content-Length', contentLength);
          res.setHeader('Accept-Ranges', 'bytes'); // Luôn hỗ trợ Range để trình duyệt biết
          streamData.stream.pipe(res);
        } else {
          // Fallback nếu getFileStream vẫn trả về luồng trực tiếp (backward compatible)
          res.setHeader('Accept-Ranges', 'bytes');
          streamData.pipe(res);
        }
      }
    } catch (error) {
      console.error('[MEDIA_STREAM][ERROR]', error.message);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: 'Lỗi tải tệp: ' + error.message });
      }
    }
  }

  // Thêm mới Media
  async create(req, res) {
    let driveFileId = null;
    let ytbVideoId = null;
    try {
      const data = { ...req.body };
      const category = data.category || 'visa_result';

      // Default sourceType and storageOwnership
      data.sourceType = data.sourceType || 'UPLOAD';
      data.storageOwnership = data.sourceType === 'EXTERNAL_LINK' ? 'EXTERNAL' : 'MANAGED';

      if (data.sourceType === 'EXTERNAL_LINK') {
        if (data.storageProvider === 'YOUTUBE') {
          if (!data.youtubeVideoId) return res.status(400).json({ success: false, message: 'Thiếu YouTube Video ID.' });
        } else if (data.storageProvider === 'GOOGLE_DRIVE') {
          if (!data.storageFileId) return res.status(400).json({ success: false, message: 'Thiếu Google Drive File ID.' });
        }
      } else {
        if (req.file) {
          const ext = getExtension(req.file.originalname);
          const allowedExts = ALLOWED_EXTENSIONS[category] || [];
          if (!allowedExts.includes(ext)) {
            return res.status(400).json({ success: false, message: `Định dạng file .${ext} không được phép cho danh mục ${category}` });
          }

          data.fileName = req.file.originalname;
          data.fileSize = fs.statSync(req.file.path).size;
          data.mimeType = req.file.mimetype;

          if (category === 'video_library' && data.storageProvider === 'YOUTUBE') {
            const ytbResult = await youtubeService.uploadVideo(req.file, {
              title: data.title,
              description: data.notes,
              privacyStatus: data.privacyStatus || 'unlisted'
            });
            ytbVideoId = ytbResult.youtubeVideoId;
            data.youtubeVideoId = ytbVideoId;
            data.uploadStatus = ytbResult.uploadStatus;
          } else {
            const driveResponse = await googleDriveService.uploadFile(req.file);
            driveFileId = driveResponse.fileId;
            
            if (category === 'visa_result') {
              data.imageFileId = driveFileId;
              data.imageMimeType = req.file.mimetype;
              data.thumbnail_url = `/api/v1/drive/${driveFileId}?mimeType=${encodeURIComponent(req.file.mimetype)}`;
            } else {
              data.storageFileId = driveFileId;
              data.storageProvider = 'GOOGLE_DRIVE';
              data.thumbnail_url = driveResponse.thumbnailLink || data.thumbnail_url;
            }
          }
        }
      }

      const newMedia = await mediaService.createMedia(data);
      return res.status(201).json({ success: true, message: 'Tạo media mới thành công', data: newMedia });
    } catch (error) {
      // Rollback Provider
      if (driveFileId) {
        try { await googleDriveService.deleteFile(driveFileId); } catch (e) {}
      }
      if (ytbVideoId) {
        try { await youtubeService.deleteVideo(ytbVideoId); } catch (e) {}
      }
      
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ success: false, message: error.message, code: error.code });
    } finally {
      // Cleanup local file
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
    }
  }

  // Cập nhật Media
  async update(req, res) {
    let newDriveFileId = null;
    let newYtbVideoId = null;
    try {
      const data = { ...req.body };
      const oldMedia = await mediaService.findById(req.params.id);
      if (!oldMedia) return res.status(404).json({ success: false, message: 'Không tìm thấy media để cập nhật' });

      const category = data.category || oldMedia.category;
      
      // Update sourceType and storageOwnership if explicitly provided
      if (data.sourceType) {
        data.storageOwnership = data.sourceType === 'EXTERNAL_LINK' ? 'EXTERNAL' : 'MANAGED';
      }

      if (data.sourceType === 'EXTERNAL_LINK') {
        if (data.storageProvider === 'YOUTUBE') {
          if (!data.youtubeVideoId) return res.status(400).json({ success: false, message: 'Thiếu YouTube Video ID.' });
          data.storageFileId = '';
        } else if (data.storageProvider === 'GOOGLE_DRIVE') {
          if (!data.storageFileId) return res.status(400).json({ success: false, message: 'Thiếu Google Drive File ID.' });
          data.youtubeVideoId = '';
        }
      } else {
        if (req.file) {
          const ext = getExtension(req.file.originalname);
          const allowedExts = ALLOWED_EXTENSIONS[category] || [];
          if (!allowedExts.includes(ext)) {
            return res.status(400).json({ success: false, message: `Định dạng file .${ext} không được phép cho danh mục ${category}` });
          }

          data.fileName = req.file.originalname;
          data.fileSize = fs.statSync(req.file.path).size;
          data.mimeType = req.file.mimetype;

          if (category === 'video_library' && data.storageProvider === 'YOUTUBE') {
            const ytbResult = await youtubeService.uploadVideo(req.file, {
              title: data.title || oldMedia.title,
              description: data.notes || oldMedia.notes,
              privacyStatus: data.privacyStatus || 'unlisted'
            });
            newYtbVideoId = ytbResult.youtubeVideoId;
            data.youtubeVideoId = newYtbVideoId;
            data.storageFileId = ''; // Xóa ID cũ nếu chuyển sang YT
            data.uploadStatus = ytbResult.uploadStatus;
          } else {
            const driveResponse = await googleDriveService.uploadFile(req.file);
            newDriveFileId = driveResponse.fileId;
            
            if (category === 'visa_result') {
              data.imageFileId = newDriveFileId;
              data.imageMimeType = req.file.mimetype;
              data.thumbnail_url = `/api/v1/drive/${newDriveFileId}?mimeType=${encodeURIComponent(req.file.mimetype)}`;
            } else {
              data.storageFileId = newDriveFileId;
              data.storageProvider = 'GOOGLE_DRIVE';
              data.youtubeVideoId = ''; // Xóa ID cũ nếu chuyển sang Drive
              data.thumbnail_url = driveResponse.thumbnailLink || data.thumbnail_url;
            }
          }
        }
      }

      const updatedMedia = await mediaService.updateMedia(req.params.id, data);
      
      // Delete old file from Provider ONLY if DB update success and there's a new file (or if switched to external)
      if (req.file || data.sourceType === 'EXTERNAL_LINK') {
        if (oldMedia.storageOwnership === 'MANAGED') {
          if (oldMedia.storageProvider === 'YOUTUBE' && oldMedia.youtubeVideoId && oldMedia.youtubeVideoId !== data.youtubeVideoId) {
            try { await youtubeService.deleteVideo(oldMedia.youtubeVideoId); } catch (e) { console.error('Failed to cleanup old YT video', e.message); }
          } else if (oldMedia.storageFileId && oldMedia.storageFileId !== data.storageFileId) {
            try { await googleDriveService.deleteFile(oldMedia.storageFileId); } catch (e) { console.error('Failed to cleanup old Drive file', e.message); }
          } else if (oldMedia.imageFileId && oldMedia.imageFileId !== data.imageFileId) {
            try { await googleDriveService.deleteFile(oldMedia.imageFileId); } catch (e) { console.error('Failed to cleanup old Drive image', e.message); }
          }
        }
      }

      return res.status(200).json({ success: true, message: 'Cập nhật media thành công', data: updatedMedia });
    } catch (error) {
      if (newDriveFileId) {
        try { await googleDriveService.deleteFile(newDriveFileId); } catch (e) {}
      }
      if (newYtbVideoId) {
        try { await youtubeService.deleteVideo(newYtbVideoId); } catch (e) {}
      }
      
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ success: false, message: error.message, code: error.code });
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
    }
  }

  // DELETE /api/v1/media/:id
  async delete(req, res) {
    let providerSuccess = false;
    try {
      const media = await mediaService.findById(req.params.id);
      if (!media) return res.status(404).json({ success: false, message: 'Không tìm thấy media để xóa' });

      // 1. Thực hiện xóa Provider trước nếu là MANAGED
      if (media.storageOwnership === 'MANAGED') {
        if (media.category === 'video_library' && media.storageProvider === 'YOUTUBE' && media.youtubeVideoId) {
          await youtubeService.deleteVideo(media.youtubeVideoId);
        } else {
          const fileId = media.storageFileId || media.imageFileId;
          if (fileId) {
            await googleDriveService.deleteFile(fileId);
          }
        }
      }
      providerSuccess = true; // Đến đây nghĩa là provider không throw error
      
      // 2. Chỉ khi provider xóa thành công, mới xóa DB
      await mediaService.deleteMedia(req.params.id);
      return res.status(200).json({ success: true, message: 'Xóa media thành công.' });
    } catch (error) {
      if (providerSuccess) {
        // Đã xóa Provider nhưng MongoDB lỗi
        console.error('[MEDIA_DELETE][CONSISTENCY_FAILURE] MongoDB delete failed after Provider cleanup for mediaId:', req.params.id, error.message);
        return res.status(500).json({ success: false, message: 'Lỗi đồng bộ: Đã xóa file nhưng không thể cập nhật CSDL. ' + error.message });
      }
      // Chưa xóa Provider hoặc Provider báo lỗi -> Không xóa DB
      console.error('[MEDIA_DELETE][PROVIDER_FAILURE]', error.message);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ success: false, message: 'Không thể xóa tệp gốc trên nền tảng lưu trữ: ' + error.message });
    }
  }
}

module.exports = new MediaController();
