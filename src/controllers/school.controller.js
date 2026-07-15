const schoolService = require('../services/school.service');

class SchoolController {
  /**
   * API: Lấy danh sách các trường học du học (kèm bộ lọc tìm kiếm)
   */
  async getAllSchools(req, res) {
    try {
      const { search, region, admissionSystem, program } = req.query;

      const data = await schoolService.findSchools({
        search,
        region,
        admissionSystem,
        program
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách trường du học thành công.',
        data: {
          headers: data.headers,
          records: data.records,
          total: data.records.length
        }
      });
    } catch (error) {
      console.error('Error in getAllSchools:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách trường du học.',
        error: error.message
      });
    }
  }

  /**
   * API: Lấy danh sách các trang con (tabs) đang hoạt động từ Google Sheets
   */
  async getSpreadsheetTabs(req, res) {
    try {
      const tabs = await schoolService.getSpreadsheetTabs();
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách các trang con Google Sheet thành công.',
        data: tabs
      });
    } catch (error) {
      console.error('Error in getSpreadsheetTabs:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách các trang con Google Sheet.',
        error: error.message
      });
    }
  }
}

module.exports = new SchoolController();
