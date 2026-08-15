const { google } = require('googleapis');
const fs = require('fs');
const env = require('../configs/env');

// We use specific YouTube variables if available, otherwise fallback
// But the user rule: "Không mặc định dùng GOOGLE_DRIVE_CLIENT_ID/SECRET. Nếu thiếu YOUTUBE_CLIENT_ID... không fake upload".
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

let oauth2Client;
let youtube;
let isConfigured = false;

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

    youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    isConfigured = true;
  }
} catch (error) {
  console.error('Lỗi khởi tạo YouTube OAuth2 Client:', error.message);
}

class YouTubeService {
  checkConfiguration() {
    if (!isConfigured) {
      const err = new Error('Thiếu cấu hình YouTube OAuth2 (YOUTUBE_CLIENT_ID, SECRET, REFRESH_TOKEN)');
      err.code = 'YOUTUBE_NOT_CONFIGURED';
      err.statusCode = 503;
      throw err;
    }
  }

  async uploadVideo(file, metadata) {
    this.checkConfiguration();

    try {
      const fileSize = fs.statSync(file.path).size;
      const res = await youtube.videos.insert({
        part: 'snippet,status',
        requestBody: {
          snippet: {
            title: metadata.title || 'Untitled Video',
            description: metadata.description || '',
          },
          status: {
            privacyStatus: metadata.privacyStatus || 'unlisted',
          },
        },
        media: {
          body: fs.createReadStream(file.path),
        },
      });

      return {
        youtubeVideoId: res.data.id,
        uploadStatus: 'completed'
      };
    } catch (error) {
      console.error('[YouTubeService] Upload failed:', error.message);
      const err = new Error('Lỗi khi tải video lên YouTube: ' + error.message);
      err.statusCode = 500;
      throw err;
    }
  }

  async deleteVideo(videoId) {
    this.checkConfiguration();
    
    if (!videoId) {
      throw new Error('Thiếu youtubeVideoId để xóa video');
    }

    try {
      await youtube.videos.delete({
        id: videoId
      });
      return true;
    } catch (error) {
      console.error('[YouTubeService] Delete failed:', error.message);
      // Nếu video đã bị xóa trên youtube hoặc không tìm thấy (404), ta vẫn coi như dọn dẹp thành công
      if (error.code === 404) {
        return true;
      }
      throw new Error('Lỗi khi xóa video YouTube: ' + error.message);
    }
  }
}

module.exports = new YouTubeService();
