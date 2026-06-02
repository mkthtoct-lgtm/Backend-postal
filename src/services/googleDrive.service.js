const { google } = require('googleapis');
const { Readable } = require('stream');

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID ? process.env.GOOGLE_DRIVE_CLIENT_ID.trim() : undefined;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET ? process.env.GOOGLE_DRIVE_CLIENT_SECRET.trim() : undefined;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN ? process.env.GOOGLE_DRIVE_REFRESH_TOKEN.trim() : undefined;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ? process.env.GOOGLE_DRIVE_FOLDER_ID.trim() : undefined;

// Khởi tạo đối tượng xác thực OAuth2 Client cho người dùng cá nhân
let oauth2Client;
let drive;

try {
  if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
    oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      'https://developers.google.com/oauthplayground' // Redirect URI tương thích dùng lúc Playground
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
   * @returns {Promise<Object>} Trả về thông tin fileId và webViewLink
   */
  async uploadFile(file) {
    try {
      if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !FOLDER_ID) {
        throw new Error('Thiếu thông tin cấu hình Google Drive OAuth2 trong file .env (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID)');
      }

      if (!drive) {
        throw new Error('Google Drive API client chưa được khởi tạo thành công.');
      }

      // Tạo tên file độc nhất bằng cách ghép dấu thời gian
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const uniqueName = `${Date.now()}-${safeName}`;

      // Chuyển đổi file buffer thành stream để đẩy lên Google Drive API
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      // 1. Thực hiện tạo file trên Google Drive
      const fileMetadata = {
        name: uniqueName,
        parents: [FOLDER_ID]
      };

      const media = {
        mimeType: file.mimetype,
        body: bufferStream
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });

      const fileId = response.data.id;

      // 2. Thiết lập quyền "Đọc công khai cho bất cứ ai có link"
      // Điều này giúp tất cả nhân viên trong công ty click vào link đều xem/tải được ngay lập tức
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        fileId: fileId,
        webViewLink: response.data.webViewLink
      };
    } catch (error) {
      console.error('Lỗi hệ thống khi tải file lên Google Drive:', error);
      throw new Error(`Google Drive API Error: ${error.message}`);
    }
  }
}

module.exports = new GoogleDriveService();
