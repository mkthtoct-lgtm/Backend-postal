const schoolService = require('../services/school.service');

class SchoolController {
  // ──── SCHOOLS ─────────────────────────────────────────────────────────────
  async getAllSchools(req, res) {
    try {
      const { search, region, admissionSystem, program, country, page, limit } = req.query;
      const data = await schoolService.findSchools({
        search, region, admissionSystem, program, country,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 200,
      });
      return res.json({
        success: true,
        message: 'Lấy danh sách trường du học thành công.',
        data: { headers: data.headers, records: data.records, total: data.total },
      });
    } catch (error) {
      console.error('Error in getAllSchools:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách trường du học.', error: error.message });
    }
  }

  async createSchool(req, res) {
    try {
      const school = await schoolService.createSchool(req.body);
      return res.status(201).json({ success: true, data: school });
    } catch (error) {
      console.error('Error creating school:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm trường.', error: error.message });
    }
  }

  async updateSchool(req, res) {
    try {
      const updated = await schoolService.updateSchool(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy trường.' });
      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating school:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật trường.', error: error.message });
    }
  }

  async deleteSchool(req, res) {
    try {
      const deleted = await schoolService.deleteSchool(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy trường.' });
      return res.json({ success: true, message: 'Đã xóa trường thành công.' });
    } catch (error) {
      console.error('Error deleting school:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa trường.', error: error.message });
    }
  }

  // ──── SOURCES ─────────────────────────────────────────────────────────────
  async getSources(req, res) {
    try {
      const sources = await schoolService.findAllSources();
      return res.json({ success: true, data: sources });
    } catch (error) {
      console.error('Error getting sources:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async createSource(req, res) {
    try {
      const { name, country, program, spreadsheetId, gid } = req.body;
      if (!name || !country || !program || !spreadsheetId || !gid) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin nguồn.' });
      }
      const source = await schoolService.createSource(req.body);
      return res.status(201).json({ success: true, data: source });
    } catch (error) {
      console.error('Error creating source:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo nguồn.', error: error.message });
    }
  }

  async updateSource(req, res) {
    try {
      const updated = await schoolService.updateSource(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy nguồn.' });
      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating source:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật nguồn.', error: error.message });
    }
  }

  async deleteSource(req, res) {
    try {
      await schoolService.deleteSource(req.params.id);
      return res.json({ success: true, message: 'Đã xóa nguồn và tất cả trường liên quan.' });
    } catch (error) {
      console.error('Error deleting source:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa nguồn.', error: error.message });
    }
  }

  async syncSource(req, res) {
    try {
      const result = await schoolService.syncFromSheet(req.params.id);
      return res.json({ success: true, message: `Đã đồng bộ ${result.count} trường thành công.`, data: result });
    } catch (error) {
      console.error('Error syncing source:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi máy chủ khi đồng bộ.',
      });
    }
  }

  // ──── FILTER OPTIONS ──────────────────────────────────────────────────────
  async getCountries(req, res) {
    try {
      const countries = await schoolService.getCountries();
      return res.json({ success: true, data: countries });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async getPrograms(req, res) {
    try {
      const programs = await schoolService.getPrograms(req.query.country);
      return res.json({ success: true, data: programs });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async getRegions(req, res) {
    try {
      const regions = await schoolService.getRegions(req.query.country, req.query.program);
      return res.json({ success: true, data: regions });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  async getSystems(req, res) {
    try {
      const systems = await schoolService.getSystems(req.query.country, req.query.program);
      return res.json({ success: true, data: systems });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
  }

  // ──── TABS (backward compatible) ──────────────────────────────────────────
  async getSpreadsheetTabs(req, res) {
    try {
      const tabs = await schoolService.getSpreadsheetTabs();
      return res.json({ success: true, message: 'Lấy danh sách các trang con thành công.', data: tabs });
    } catch (error) {
      console.error('Error in getSpreadsheetTabs:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', error: error.message });
    }
  }
}

module.exports = new SchoolController();
