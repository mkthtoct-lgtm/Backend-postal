const { google } = require('googleapis');
const { Readable } = require('stream');
const fs = require('fs');
const env = require('../configs/env');

const CLIENT_ID = env.GOOGLE_DRIVE.CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_DRIVE.CLIENT_SECRET;
const REFRESH_TOKEN = env.GOOGLE_DRIVE.REFRESH_TOKEN;
const FOLDER_ID = env.GOOGLE_DRIVE.FOLDER_ID;

// Cảnh báo sớm nếu thiếu cấu hình
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !FOLDER_ID) {
  console.warn('⚠️ [GoogleDriveService]: Thiếu thông tin cấu hình Google Drive trong file .env! Các chức năng tải lên tài liệu và CCCD sẽ thất bại.');
}

// Hàm chuẩn hóa loại bỏ dấu tiếng Việt để giữ tên file sạch và dễ đọc
function removeVietnameseTones(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Khởi tạo đối tượng xác thực OAuth2 Client cho người dùng cá nhân
let oauth2Client;
let drive;

try {
  if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
    oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    drive = google.drive({ version: 'v3', auth: oauth2Client });
  }
} catch (error) {
  console.error('Lỗi khởi tạo Google Drive OAuth2 Client:', error.message);
}

class GoogleDriveService {
  /**
   * Tải tệp tin nhị phân lên thư mục chỉ định trên Google Drive
   * @param {Object} file - Đối tượng tệp tin từ Multer (dạng in-memory buffer)
   * @param {string} [parentFolderId] - ID thư mục cha (mặc định là FOLDER_ID nếu không truyền)
   * @returns {Promise<Object>} Trả về thông tin fileId và webViewLink
   */
  async uploadFile(file, parentFolderId = null) {
    try {
      if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !FOLDER_ID) {
        throw new Error('Thiếu thông tin cấu hình Google Drive OAuth2 trong file .env');
      }

      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }

      // Loại bỏ dấu tiếng Việt trước rồi mới làm sạch tên file
      const normalizedName = removeVietnameseTones(file.originalname);
      const safeName = normalizedName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const uniqueName = `${Date.now()}-${safeName}`;

      let bodyStream;
      if (file.buffer) {
        bodyStream = new Readable();
        bodyStream.push(file.buffer);
        bodyStream.push(null);
      } else if (file.path) {
        // Kiểm tra xem file vật lý có thực sự tồn tại không
        if (!fs.existsSync(file.path)) {
          throw new Error(`Không tìm thấy tệp vật lý tại đường dẫn: ${file.path}`);
        }
        bodyStream = fs.createReadStream(file.path);
      } else {
        throw new Error('Dữ liệu file không hợp lệ (không có buffer hoặc path)');
      }

      // 1. Thực hiện tạo file trên Google Drive
      const targetParent = parentFolderId || FOLDER_ID;
      const fileMetadata = {
        name: uniqueName,
        parents: [targetParent]
      };

      const media = {
        mimeType: file.mimetype,
        body: bodyStream
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, thumbnailLink, mimeType, size'
      });

      const fileId = response.data.id;

      // 2. Thiết lập quyền "Đọc công khai cho bất cứ ai có link"
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        fileId: fileId,
        webViewLink: response.data.webViewLink || `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        thumbnailLink: response.data.thumbnailLink || null,
        mimeType: response.data.mimeType,
        size: response.data.size ? parseInt(response.data.size, 10) : file.size
      };
    } catch (error) {
      console.error('Lỗi hệ thống khi tải file lên Google Drive:', error);
      throw new Error(`Google Drive API Error: ${error.message}`);
    }
  }

  /**
   * Tạo thư mục mới trên Google Drive dưới thư mục gốc chỉ định
   */
  async createFolder(folderName, parentFolderId = null) {
    try {
      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }

      const targetParent = parentFolderId || FOLDER_ID;
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [targetParent]
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id'
      });

      const newFolderId = response.data.id;

      // Thiết lập quyền đọc công khai cho thư mục để các file bên trong cũng kế thừa quyền
      try {
        await drive.permissions.create({
          fileId: newFolderId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      } catch (permissionError) {
        console.warn('Cảnh báo: Không thể phân quyền công khai cho thư mục mới tạo:', permissionError.message);
      }

      return newFolderId;
    } catch (error) {
      console.error('Lỗi hệ thống khi tạo thư mục trên Google Drive:', error);
      throw new Error(`Google Drive Create Folder Error: ${error.message}`);
    }
  }

  /**
   * Tìm thư mục theo tên và thư mục cha trên Google Drive
   * @param {string} name - Tên thư mục cần tìm
   * @param {string} [parentFolderId] - ID thư mục cha
   * @returns {Promise<string|null>} Trả về folderId nếu tìm thấy, ngược lại trả về null
   */
  async findFolder(name, parentFolderId = null) {
    try {
      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }

      const targetParent = parentFolderId || FOLDER_ID;
      // Tránh lỗi cú pháp query bằng cách escape dấu nháy đơn
      const escapedName = name.replace(/'/g, "\\'");

      const response = await drive.files.list({
        q: `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${targetParent}' in parents and trashed = false`,
        fields: 'files(id)',
        spaces: 'drive',
        pageSize: 1
      });

      const files = response.data.files || [];
      return files.length > 0 ? files[0].id : null;
    } catch (error) {
      console.error(`Lỗi hệ thống khi tìm thư mục '${name}' trên Google Drive:`, error);
      return null;
    }
  }

  /**
   * Lấy thư mục theo tên hoặc tạo mới nếu chưa tồn tại
   */
  async getOrCreateFolder(folderName, parentFolderId = null) {
    const existingId = await this.findFolder(folderName, parentFolderId);
    if (existingId) {
      return existingId;
    }
    return await this.createFolder(folderName, parentFolderId);
  }

  /**
   * Đổi tên thư mục trên Google Drive
   */
  async renameFolder(folderId, newFolderName) {
    try {
      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }

      await drive.files.update({
        fileId: folderId,
        requestBody: {
          name: newFolderName
        }
      });
    } catch (error) {
      console.error(`Lỗi hệ thống khi đổi tên thư mục (${folderId}) trên Google Drive:`, error);
    }
  }

  /**
   * Xóa file trên Google Drive theo ID
   */
  async deleteFile(fileId) {
    try {
      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }
      if (!fileId) return;

      await drive.files.delete({ fileId });
      console.log(`[GoogleDriveService] Đã xóa file cũ trên Drive: ${fileId}`);
    } catch (error) {
      console.error(`Lỗi hệ thống khi xóa file (${fileId}) trên Google Drive:`, error.message);
    }
  }

  /**
   * Lấy stream file nhị phân từ Google Drive
   * @param {string} fileId - ID của file trên Google Drive
   * @returns {Promise<ReadableStream>} - Stream nhị phân
   */
  async getFileStream(fileId) {
    try {
      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      return {
        stream: response.data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      console.error(`Lỗi hệ thống khi lấy luồng file (${fileId}) trên Google Drive:`, error.message);
      throw error;
    }
  }

  /**
   * Lấy stream file nhị phân từ Google Drive có hỗ trợ Range header
   * @param {string} fileId - ID của file trên Google Drive
   * @param {string} rangeHeader - Header Range (vd: bytes=0-1024)
   */
  async getFileStreamWithRange(fileId, rangeHeader) {
    try {
      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }
      const options = { fileId, alt: 'media' };
      const config = { responseType: 'stream' };
      if (rangeHeader) {
        config.headers = { Range: rangeHeader };
      }
      
      const response = await drive.files.get(options, config);
      return {
        stream: response.data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      console.error(`Lỗi hệ thống khi lấy luồng file (${fileId}) có Range trên Google Drive:`, error.message);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
