const School = require('../models/School');
const SchoolSource = require('../models/SchoolSource');

// ──── CSV PARSER (RFC 4180) ─────────────────────────────────────────────────
function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

// ──── HEADER → MODEL FIELD MAPPING ──────────────────────────────────────────
const HEADER_FIELD_MAP = {
  'STT': 'stt',
  'Tên trường': 'name',
  'Khu vực': 'region',
  'Địa chỉ': 'address',
  'Chuyên ngành': 'majors',
  'Website': 'website',
  'Hệ tuyển sinh': 'admissionSystem',
  'Hạn báo danh': 'deadlineRegister',
  'Hạn nộp hồ sơ': 'deadlineDocument',
  'Điều kiện tuyển sinh': 'requirements',
  'Học phí học tiếng (1+4) TWD': 'tuitionLanguage',
  'Học phí chuyên ngành (TWD)': 'tuitionMajor',
  'Ký túc xá (đài tệ)': 'dormitory',
  'Học bổng': 'scholarship',
  'File ảnh thông báo': 'imageUrl',
};

function mapHeaderToField(header) {
  const trimmed = header.trim();
  // Exact match first
  if (HEADER_FIELD_MAP[trimmed]) return HEADER_FIELD_MAP[trimmed];
  // Case-insensitive / partial match
  const lower = trimmed.toLowerCase();
  if (lower.includes('tên trường') || lower.includes('ten truong')) return 'name';
  if (lower.includes('khu vực') || lower.includes('khu vuc')) return 'region';
  if (lower.includes('địa chỉ') || lower.includes('dia chi')) return 'address';
  if (lower.includes('chuyên ngành') || lower.includes('chuyen nganh')) return 'majors';
  if (lower.includes('website')) return 'website';
  if (lower.includes('hệ tuyển') || lower.includes('he tuyen')) return 'admissionSystem';
  if (lower.includes('hạn báo') || lower.includes('han bao')) return 'deadlineRegister';
  if (lower.includes('hạn nộp') || lower.includes('han nop')) return 'deadlineDocument';
  if (lower.includes('điều kiện') || lower.includes('dieu kien')) return 'requirements';
  if (lower.includes('học phí') && lower.includes('tiếng')) return 'tuitionLanguage';
  if (lower.includes('học phí') && lower.includes('chuyên')) return 'tuitionMajor';
  if (lower.includes('ký túc') || lower.includes('ky tuc')) return 'dormitory';
  if (lower.includes('học bổng') || lower.includes('hoc bong')) return 'scholarship';
  if (lower.includes('ảnh') || lower.includes('image') || lower.includes('file')) return 'imageUrl';
  if (lower === 'stt' || lower === 'no' || lower === '#') return 'stt';
  return null; // unmapped → goes to extraFields
}


class SchoolService {
  // ──── SOURCES CRUD ──────────────────────────────────────────────────────────
  async findAllSources() {
    return SchoolSource.find().sort({ country: 1, program: 1 }).lean();
  }

  async createSource(data) {
    const source = new SchoolSource({
      name: data.name,
      country: data.country,
      program: data.program,
      spreadsheetId: data.spreadsheetId,
      gid: data.gid,
      isActive: data.isActive !== false,
    });
    return source.save();
  }

  async updateSource(id, data) {
    return SchoolSource.findByIdAndUpdate(id, { $set: data }, { new: true, lean: true });
  }

  async deleteSource(id) {
    // Also remove all schools synced from this source
    await School.deleteMany({ sourceId: id });
    return SchoolSource.findByIdAndDelete(id);
  }

  // ──── SYNC FROM GOOGLE SHEET ──────────────────────────────────────────────
  async syncFromSheet(sourceId) {
    const source = await SchoolSource.findById(sourceId);
    if (!source) throw new Error('Không tìm thấy nguồn đồng bộ.');

    let spreadsheetId = String(source.spreadsheetId || '').trim();
    let gid = source.gid ? String(source.gid).trim() : '0';

    if (spreadsheetId.includes('/d/')) {
      const matchId = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (matchId) spreadsheetId = matchId[1];
    }
    if (source.spreadsheetId && source.spreadsheetId.includes('gid=')) {
      const matchGid = source.spreadsheetId.match(/gid=([0-9]+)/);
      if (matchGid) gid = matchGid[1];
    }

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/csv,*/*;q=0.8'
    };

    const primaryUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const fallbackUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

    console.log(`[SchoolService] Syncing from Sheet: ${primaryUrl}`);

    let response = await fetch(primaryUrl, { headers: browserHeaders });
    let text = response.ok ? await response.text() : '';

    if (!response.ok || text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
      console.log(`[SchoolService] Primary export failed, trying fallback gviz endpoint: ${fallbackUrl}`);
      const fallbackResponse = await fetch(fallbackUrl, { headers: browserHeaders });
      if (fallbackResponse.ok) {
        const fallbackText = await fallbackResponse.text();
        if (!fallbackText.trim().startsWith('<!DOCTYPE html') && !fallbackText.trim().startsWith('<html')) {
          response = fallbackResponse;
          text = fallbackText;
        }
      }
    }

    if (!response.ok || text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
      const error = new Error('Google Sheet chưa cấp quyền xem. Hãy mở Google Sheet -> bấm Chia sẻ -> Đặt quyền "Bất kỳ ai có đường liên kết - Người xem" rồi bấm Xong để hoàn tất.');
      error.statusCode = 400;
      throw error;
    }

    const parsedLines = parseCSV(text);
    if (parsedLines.length === 0) throw new Error('CSV data is empty.');

    const headers = parsedLines[0].map(h => h.trim()).filter(Boolean);
    const headerMapping = headers.map(h => ({ original: h, field: mapHeaderToField(h) }));

    const schools = [];
    for (let i = 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      if (row.length < 2 || !row[1] || !row[1].trim()) continue;

      const doc = {
        country: source.country,
        program: source.program,
        sourceId: source._id,
        extraFields: {},
      };

      headerMapping.forEach((mapping, idx) => {
        const val = row[idx] ? row[idx].trim() : '';
        if (mapping.field) {
          if (mapping.field === 'stt') {
            doc.stt = parseInt(val) || 0;
          } else {
            doc[mapping.field] = val;
          }
        } else if (mapping.original) {
          doc.extraFields[mapping.original] = val;
        }
      });

      // Must have a name
      if (!doc.name) continue;
      schools.push(doc);
    }

    // Remove old records from this source, then bulk insert new
    await School.deleteMany({ sourceId: source._id });
    if (schools.length > 0) {
      await School.insertMany(schools);
    }

    // Update source metadata
    source.lastSyncedAt = new Date();
    source.lastSyncCount = schools.length;
    await source.save();

    console.log(`[SchoolService] Synced ${schools.length} schools from source ${source.name}`);
    return { count: schools.length, headers };
  }

  // ──── SCHOOLS CRUD ────────────────────────────────────────────────────────
  async findSchools({ search, region, admissionSystem, country, program, page = 1, limit = 100 } = {}) {
    const query = { isActive: true };

    if (country && country !== 'all') query.country = country;
    if (program && program !== 'all') query.program = program;

    if (region && region !== 'all') {
      query.region = { $regex: region, $options: 'i' };
    }
    if (admissionSystem && admissionSystem !== 'all') {
      query.admissionSystem = { $regex: admissionSystem, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { majors: { $regex: search, $options: 'i' } },
        { requirements: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await School.countDocuments(query);
    const records = await School.find(query)
      .sort({ stt: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Build dynamic headers from all non-empty fields
    const DISPLAY_HEADERS = [
      'STT', 'Tên trường', 'Khu vực', 'Địa chỉ', 'Chuyên ngành', 'Website',
      'Hệ tuyển sinh', 'Hạn báo danh', 'Hạn nộp hồ sơ', 'Điều kiện tuyển sinh',
      'Học phí học tiếng (1+4) TWD', 'Học phí chuyên ngành (TWD)', 'Ký túc xá (đài tệ)',
      'Học bổng', 'File ảnh thông báo',
    ];

    // Convert DB records to row objects matching the old header-based format
    const FIELD_HEADER_MAP = {};
    for (const [header, field] of Object.entries(HEADER_FIELD_MAP)) {
      FIELD_HEADER_MAP[field] = header;
    }

    const rowRecords = records.map(r => {
      const row = {};
      DISPLAY_HEADERS.forEach(h => {
        const field = HEADER_FIELD_MAP[h];
        if (field && r[field] !== undefined) {
          row[h] = field === 'stt' ? String(r[field]) : r[field];
        }
      });
      // Merge extra fields
      if (r.extraFields) {
        Object.entries(r.extraFields).forEach(([k, v]) => {
          if (v) row[k] = v;
        });
      }
      // Attach _id for edit/delete operations
      row._id = r._id;
      return row;
    });

    // Collect all unique headers present across all records
    const extraHeaderSet = new Set();
    records.forEach(r => {
      if (r.extraFields) Object.keys(r.extraFields).forEach(k => extraHeaderSet.add(k));
    });
    const headers = [...DISPLAY_HEADERS, ...Array.from(extraHeaderSet)];

    return { headers, records: rowRecords, total };
  }

  async createSchool(data) {
    const school = new School(data);
    return school.save();
  }

  async updateSchool(id, data) {
    return School.findByIdAndUpdate(id, { $set: data }, { new: true, lean: true });
  }

  async deleteSchool(id) {
    return School.findByIdAndDelete(id);
  }

  // ──── FILTER OPTIONS (dynamic) ────────────────────────────────────────────
  async getCountries() {
    return School.distinct('country', { isActive: true });
  }

  async getPrograms(country) {
    const query = { isActive: true };
    if (country && country !== 'all') query.country = country;
    return School.distinct('program', query);
  }

  async getRegions(country, program) {
    const query = { isActive: true };
    if (country && country !== 'all') query.country = country;
    if (program && program !== 'all') query.program = program;
    const regions = await School.distinct('region', query);
    return regions.filter(Boolean).sort();
  }

  async getSystems(country, program) {
    const query = { isActive: true };
    if (country && country !== 'all') query.country = country;
    if (program && program !== 'all') query.program = program;
    const systems = await School.distinct('admissionSystem', query);
    return systems.filter(Boolean).sort();
  }

  // ──── LEGACY: Backward compatible with old Google Sheet direct fetch ──────
  // Keep getSpreadsheetTabs for backward compatibility during transition
  async getSpreadsheetTabs() {
    // Return sources as "tabs"
    const sources = await SchoolSource.find({ isActive: true }).lean();
    if (sources.length > 0) {
      return sources.map(s => ({ id: s._id.toString(), name: `${s.country} - ${s.program}` }));
    }
    // Fallback to hardcoded
    return [
      { id: '1174598013', name: 'ĐẠI HỌC' },
      { id: '687334184', name: 'THPT' },
    ];
  }
}

module.exports = new SchoolService();
