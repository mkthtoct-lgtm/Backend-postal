const SPREADSHEET_ID = '1iq_3AFmBgqGXiB3jVZWvcU_hATXeNwIe17TAT7-f7a8';
const DEFAULT_GID = '1174598013';

const PROGRAM_GIDS = {
  daihoc: '1174598013',    // Hệ Đại học
  thpt: '687334184'        // Hệ THPT
};

// In-memory cache object keyed by GID
const cache = {}; // { [gid]: { data, expiry } }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let tabCache = null;
let tabCacheExpiry = 0;

/**
 * Robust CSV parser handling quotes and newlines in cell values (RFC 4180 style)
 */
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
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

class SchoolService {
  /**
   * Parse sheet tabs and GIDs dynamically from the Google Sheets edit page
   */
  async getSpreadsheetTabs() {
    const now = Date.now();
    if (tabCache && now < tabCacheExpiry) {
      return tabCache;
    }

    try {
      console.log(`[SchoolService] Fetching Google Sheet tabs dynamically...`);
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
      if (!response.ok) {
        throw new Error(`Google Sheets edit page fetch failed: ${response.status}`);
      }
      const html = await response.text();
      const regex = /\[\d+,0,\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"([^\\"]+)\\"/g;
      let match;
      const tabs = [];
      while ((match = regex.exec(html)) !== null) {
        const gid = match[1];
        const name = match[2].trim();
        // Skip default sheet names (e.g. Sheet1, Sheet9) and templates
        if (/^Sheet\d+$/i.test(name) || name.toLowerCase().includes('template') || !name) {
          continue;
        }
        tabs.push({ id: gid, name });
      }

      // Fallback if no tabs parsed (ensure we always have at least Đại học and THPT)
      if (tabs.length === 0) {
        tabs.push(
          { id: '1174598013', name: 'ĐẠI HỌC' },
          { id: '687334184', name: 'THPT ' }
        );
      }

      tabCache = tabs;
      tabCacheExpiry = now + 15 * 60 * 1000; // 15 minutes cache
      console.log(`[SchoolService] Successfully parsed ${tabs.length} tabs dynamically.`);
      return tabs;
    } catch (error) {
      console.error('[SchoolService] Error fetching sheet tabs:', error);
      if (tabCache) return tabCache;
      return [
        { id: '1174598013', name: 'ĐẠI HỌC' },
        { id: '687334184', name: 'THPT ' }
      ];
    }
  }

  /**
   * Fetch and parse the Google Sheet tab. Utilizes in-memory caching.
   */
  async getSchoolDirectory(gid = DEFAULT_GID) {
    const now = Date.now();
    if (cache[gid] && now < cache[gid].expiry) {
      return cache[gid].data;
    }

    try {
      console.log(`[SchoolService] Fetching Google Sheet CSV from source for gid=${gid}...`);
      const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
      const response = await fetch(sheetCsvUrl);
      if (!response.ok) {
        throw new Error(`Google Sheets fetch failed with status: ${response.status}`);
      }

      const text = await response.text();
      const parsedLines = parseCSV(text);

      if (parsedLines.length === 0) {
        throw new Error('Parsed CSV data is empty.');
      }

      // First line is headers - trim them to clean key names
      const headers = parsedLines[0].map(h => h.trim()).filter(Boolean);
      const records = [];

      for (let i = 1; i < parsedLines.length; i++) {
        const row = parsedLines[i];
        // Skip empty rows or rows that do not have a school name
        if (row.length < 2 || !row[1] || !row[1].trim()) continue;

        const record = {};
        // Map all headers dynamically to their corresponding indices
        headers.forEach((header, index) => {
          record[header] = row[index] ? row[index].trim() : '';
        });
        records.push(record);
      }

      const result = { headers, records };
      cache[gid] = {
        data: result,
        expiry: now + CACHE_TTL_MS
      };
      console.log(`[SchoolService] Fetched and parsed ${records.length} schools successfully for gid=${gid}. Cache updated.`);
      return result;
    } catch (error) {
      console.error(`[SchoolService] Error fetching school directory for gid=${gid}:`, error);
      // If fetch fails but we have stale cache, return it as a fallback
      if (cache[gid]) {
        console.warn(`[SchoolService] Returning stale cached data as fallback for gid=${gid}.`);
        return cache[gid].data;
      }
      throw error;
    }
  }

  /**
   * Query schools with search filters and program mapping
   */
  async findSchools({ search = '', region = '', admissionSystem = '', program = '' } = {}) {
    const gid = PROGRAM_GIDS[program] || program || DEFAULT_GID;
    const directory = await this.getSchoolDirectory(gid);
    let filteredRecords = [...directory.records];

    // Filter by Region (Khu vực)
    if (region && region !== 'all') {
      const cleanRegion = region.toLowerCase().trim();
      filteredRecords = filteredRecords.filter(record => {
        const recordRegion = String(record['Khu vực'] || record['Khu vực '] || '').toLowerCase();
        return recordRegion.includes(cleanRegion);
      });
    }

    // Filter by Admission System (Hệ tuyển sinh)
    if (admissionSystem && admissionSystem !== 'all') {
      const cleanSystem = admissionSystem.toLowerCase().trim();
      filteredRecords = filteredRecords.filter(record => {
        const recordSystem = String(record['Hệ tuyển sinh'] || record['Hệ tuyển sinh '] || '').toLowerCase();
        return recordSystem.includes(cleanSystem);
      });
    }

    // Filter by Search text (searches name, majors, or requirements)
    if (search) {
      const cleanSearch = search.toLowerCase().trim();
      filteredRecords = filteredRecords.filter(record => {
        // Search across all fields dynamically in the record
        return Object.values(record).some(val => 
          String(val).toLowerCase().includes(cleanSearch)
        );
      });
    }

    return {
      headers: directory.headers,
      records: filteredRecords
    };
  }
}

module.exports = new SchoolService();
