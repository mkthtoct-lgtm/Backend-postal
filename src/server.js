const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDatabase = require('./configs/database');
const env = require('./configs/env');
const automationScheduler = require('./jobs/scheduler');

const PORT = env.PORT;

connectDatabase()
  .then(() => {
    // Khởi động CRM Automation Scheduler (tự động phân công, nhắc lead im
    // lặng, tự động đóng lead quá hạn, nhắc đối soát hoa hồng...) chỉ sau
    // khi kết nối CSDL đã sẵn sàng.
    automationScheduler.start();
  })
  .catch((error) => {
    // connectDatabase() đã tự xử lý (log + thoát tiến trình) khi lỗi kết nối
    // nghiêm trọng, nhánh catch này chỉ là lớp bảo vệ bổ sung.
    console.error('[Server] Không thể khởi động CRM Automation Scheduler:', error.message);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});