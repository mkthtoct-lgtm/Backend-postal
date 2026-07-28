/**
 * Automation Scheduler (CRM + Marketing)
 * ---------------------------------------
 * Chạy các tác vụ tự động hoá theo chu kỳ, sử dụng setInterval thuần của
 * Node.js (không phụ thuộc thêm package ngoài như node-cron/agenda) để giữ
 * hệ thống gọn nhẹ và dễ triển khai.
 *
 * CRM Automation và Marketing Automation là 2 hệ thống cấu hình ĐỘC LẬP
 * (2 công tắc "enabled" riêng) - tắt cái này không ảnh hưởng tới cái kia.
 *
 * - Mỗi CHECK_INTERVAL_MS: kiểm tra lead "im lặng" quá lâu (CRM, idempotent
 *   nhờ trường lastReminderStage nên chạy thường xuyên không gây trùng lặp).
 * - Mỗi ngày (1 lần/ngày, dựa trên "con trỏ" lastDailyRun lưu tại
 *   SystemSetting): CRM - tự động đóng lead quá hạn + nhắc đối soát hoa hồng;
 *   Marketing - chăm sóc (nurture) lead đang tư vấn + tái kết nối lead đã mất.
 * - Mỗi tháng (1 lần/tháng, dựa trên "con trỏ" lastMonthlyRun): CRM - gợi ý
 *   thăng hạng Cộng tác viên.
 */

const automationService = require('../services/automation.service');
const marketingAutomationService = require('../services/marketingAutomation.service');
const systemSettingService = require('../services/systemSetting.service');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 phút/lần
const STARTUP_DELAY_MS = 15 * 1000; // Chờ CSDL/ứng dụng ổn định trước khi chạy lần đầu
const CURSOR_SETTING_KEY = 'automation_cursor';

let intervalHandle = null;
let isRunning = false;

const pad2 = (n) => String(n).padStart(2, '0');
const getTodayKey = (date = new Date()) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const getMonthKey = (date = new Date()) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

/**
 * Chạy các tác vụ CRM Automation trong 1 chu kỳ. Tự kiểm tra công tắc
 * "enabled" riêng của CRM Automation - không phụ thuộc Marketing Automation.
 */
const runCrmAutomationTasks = async (cursor) => {
  const config = await automationService.getConfig();
  if (!config.enabled) {
    console.log('[AutomationScheduler] CRM Automation đang tắt (enabled=false), bỏ qua các tác vụ CRM.');
    return false;
  }

  let cursorChanged = false;
  const todayKey = getTodayKey();
  const monthKey = getMonthKey();

  // 1. Tác vụ hàng ngày: chạy trước để "chốt" các lead đã quá hạn tự động
  //    đóng, tránh việc bị nhắc "im lặng" một lần rồi mới đóng ngay sau đó.
  if (cursor.lastCrmDailyRun !== todayKey) {
    const autoLostResult = await automationService.runAutoLostSweep();
    const commissionResult = await automationService.runCommissionPendingReminder();
    console.log(
      `[AutomationScheduler] [CRM] Tác vụ hàng ngày hoàn tất: đóng ${autoLostResult.closed} lead quá hạn, nhắc ${commissionResult.count || 0} khoản hoa hồng chờ đối soát.`
    );
    cursor.lastCrmDailyRun = todayKey;
    cursorChanged = true;
  }

  // 2. Tác vụ tần suất cao: nhắc lead im lặng (idempotent nhờ lastReminderStage)
  const staleResult = await automationService.runStaleLeadCheck();
  if (staleResult.reminded > 0) {
    console.log(`[AutomationScheduler] [CRM] Đã nhắc nhở ${staleResult.reminded} lead im lặng quá hạn.`);
  }

  // 3. Tác vụ hàng tháng: gợi ý thăng hạng CTV
  if (cursor.lastMonthlyRun !== monthKey) {
    const rankUpResult = await automationService.runRankUpSuggestions();
    console.log(`[AutomationScheduler] [CRM] Tác vụ hàng tháng hoàn tất: gợi ý thăng hạng cho ${rankUpResult.suggested} CTV.`);
    cursor.lastMonthlyRun = monthKey;
    cursorChanged = true;
  }

  return cursorChanged;
};

/**
 * Chạy các tác vụ Marketing Automation trong 1 chu kỳ. Tự kiểm tra công tắc
 * "enabled" riêng của Marketing Automation - không phụ thuộc CRM Automation.
 */
const runMarketingAutomationTasks = async (cursor) => {
  const config = await marketingAutomationService.getConfig();
  if (!config.enabled) {
    console.log('[AutomationScheduler] Marketing Automation đang tắt (enabled=false), bỏ qua các tác vụ Marketing.');
    return false;
  }

  let cursorChanged = false;
  const todayKey = getTodayKey();

  // Chăm sóc (nurture) + tái kết nối (win-back): chạy 1 lần/ngày là đủ vì đây
  // là email chăm sóc theo mốc ngày, không cần tần suất cao như nhắc nội bộ.
  if (cursor.lastMarketingDailyRun !== todayKey) {
    const nurtureResult = await marketingAutomationService.runNurtureDrip();
    const winBackResult = await marketingAutomationService.runWinBackSweep();
    console.log(
      `[AutomationScheduler] [Marketing] Tác vụ hàng ngày hoàn tất: chăm sóc ${nurtureResult.day2Sent + nurtureResult.day5Sent} lead, tái kết nối ${winBackResult.sent} lead.`
    );
    cursor.lastMarketingDailyRun = todayKey;
    cursorChanged = true;
  }

  return cursorChanged;
};

/**
 * Thực thi 1 chu kỳ kiểm tra automation. Được export riêng để có thể gọi
 * thủ công (vd. từ script/test) ngoài chu kỳ setInterval.
 */
const runCycle = async () => {
  // Tránh 2 chu kỳ chạy chồng lên nhau nếu 1 lần chạy trước đó bị kéo dài
  // (ví dụ do CSDL chậm) hơn CHECK_INTERVAL_MS.
  if (isRunning) {
    console.log('[AutomationScheduler] Bỏ qua chu kỳ mới vì chu kỳ trước vẫn đang chạy.');
    return;
  }
  isRunning = true;

  try {
    const cursor = await systemSettingService.getSetting(CURSOR_SETTING_KEY, {});

    // 2 hệ thống automation độc lập - lỗi ở 1 bên không được làm hỏng bên kia.
    let cursorChanged = false;
    try {
      const changed = await runCrmAutomationTasks(cursor);
      cursorChanged = cursorChanged || changed;
    } catch (error) {
      console.error('[AutomationScheduler] Lỗi khi chạy tác vụ CRM Automation:', error.message);
    }

    try {
      const changed = await runMarketingAutomationTasks(cursor);
      cursorChanged = cursorChanged || changed;
    } catch (error) {
      console.error('[AutomationScheduler] Lỗi khi chạy tác vụ Marketing Automation:', error.message);
    }

    if (cursorChanged) {
      await systemSettingService.updateSetting(CURSOR_SETTING_KEY, cursor);
    }
  } catch (error) {
    console.error('[AutomationScheduler] Lỗi trong chu kỳ chạy automation:', error.message);
  } finally {
    isRunning = false;
  }
};

/**
 * Khởi động scheduler. An toàn khi gọi nhiều lần (chỉ khởi động 1 lần duy nhất).
 */
const start = () => {
  if (intervalHandle) {
    console.log('[AutomationScheduler] Scheduler đã được khởi động trước đó, bỏ qua.');
    return;
  }

  console.log(
    `[AutomationScheduler] Khởi động Automation Scheduler - CRM + Marketing (chu kỳ mỗi ${CHECK_INTERVAL_MS / 60000} phút).`
  );

  // Chạy lần đầu sau một khoảng trễ ngắn để đảm bảo kết nối CSDL đã ổn định.
  setTimeout(() => {
    runCycle();
  }, STARTUP_DELAY_MS);

  intervalHandle = setInterval(runCycle, CHECK_INTERVAL_MS);

  // Không giữ tiến trình Node sống chỉ vì timer này (không ảnh hưởng gì khi
  // chạy như một server thông thường vì app.listen() đã giữ tiến trình sống).
  if (typeof intervalHandle.unref === 'function') {
    intervalHandle.unref();
  }
};

/**
 * Dừng scheduler (chủ yếu phục vụ việc test hoặc graceful shutdown).
 */
const stop = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};

module.exports = { start, stop, runCycle };
