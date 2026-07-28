# Marketing Automation + Nâng cấp Chatbot - Tóm tắt thay đổi

Tài liệu này tiếp nối `CRM_AUTOMATION_CHANGES.md` (đợt trước), tóm tắt 2 mảng vừa
bổ sung: **Marketing Automation** (chăm sóc & giữ chân khách hàng) và **nâng cấp
Chatbot AI** (kiến thức công ty + API Key quản lý qua Settings).

## 1. Marketing Automation (rule-based, không dùng AI)

Mục tiêu: nâng cao trải nghiệm khách hàng xuyên suốt hành trình, không chỉ dừng ở
việc nội bộ xử lý lead (đó là phạm vi của CRM Automation ở đợt trước).

| # | Automation | Mô tả |
|---|---|---|
| 1 | **Chăm sóc (nurture) lead đang tư vấn** | Gửi 2 email động viên/thông tin hữu ích theo mốc ngày (mặc định ngày 2 và ngày 5) cho khách hàng vẫn đang cân nhắc, giúp khách không cảm thấy bị "bỏ rơi" trong lúc chờ quyết định. |
| 2 | **Email cảm ơn sau khi chốt thành công** | Gửi đúng 1 lần khi lead chuyển sang trạng thái "Xử lý hồ sơ" (deal thành công), tạo cảm giác được trân trọng, mở đường cho việc giới thiệu khách mới về sau. |
| 3 | **Tái kết nối (Win-back) lead đã Thất bại** | Sau X ngày (mặc định 45 ngày) kể từ khi lead đóng "Thất bại", gửi 1 email nhẹ nhàng mời khách quay lại nếu vẫn còn nhu cầu - không tạo áp lực, không lặp lại nếu khách phớt lờ. |
| 4 | **Bản tin (Newsletter) tự động** | Khi Admin/BGĐ đăng tin tức/sự kiện mới, tự động gửi email tóm tắt cho khách hàng đang hoạt động (đã loại trùng theo email). **Mặc định TẮT** vì đây là gửi hàng loạt - Admin cần chủ động bật sau khi hiểu rõ, kèm giới hạn an toàn số người nhận mỗi lần gửi. |
| 5 | **Hủy nhận email (Unsubscribe) tự phục vụ** | Mỗi email marketing đều có link hủy nhận, khách hàng bấm là hủy ngay, không cần đăng nhập - tuân thủ thông lệ email marketing, tránh bị đánh dấu spam. |

Đặc điểm chung:
- **Độc lập hoàn toàn với CRM Automation** (2 công tắc "enabled" riêng, lỗi ở hệ
  thống này không ảnh hưởng hệ thống kia).
- Cấu hình tại **Cài đặt hệ thống → tab "Marketing Automation"**: bật/tắt từng
  automation, chỉnh ngưỡng ngày, xem số liệu tổng quan (đang chờ gửi, đã gửi, đã
  hủy nhận...), nút "Chạy kiểm tra ngay".
- Chạy nền 1 lần/ngày qua scheduler chung với CRM Automation (không cần thêm
  package/cron job riêng).
- Ghi Audit Log với tiền tố `marketing.*`.

### File liên quan (Backend)
**Mới:** `src/services/marketingAutomation.service.js`,
`src/controllers/marketing.controller.js`, `src/routes/marketing.routes.js`

**Sửa:** `src/models/Lead.js` (thêm `marketingOptOut`, `marketingOptOutAt`,
`nurtureStage`, `nurtureLastSentAt`, `thankYouSentAt`, `winBackSentAt`),
`src/services/mail.service.js` (4 email template mới: nurture, thank-you,
win-back, newsletter), `src/services/newsPost.service.js` (hook gửi bản tin khi
đăng tin mới), `src/controllers/lead.controller.js` (hook gửi email cảm ơn ở cả
3 nơi lead có thể chuyển trạng thái: tạo mới, cập nhật thủ công, webhook
BizFly), `src/jobs/scheduler.js` (chạy song song CRM + Marketing, cursor riêng
biệt: `lastCrmDailyRun` / `lastMarketingDailyRun`), `src/app.js` (mount route).

### File liên quan (Frontend)
`src/systemSettings/SystemSettingsPage.jsx` - thêm tab "Marketing Automation".

## 2. Nâng cấp Chatbot AI

### 2.1. Kiến thức nền về công ty + giọng điệu chăm sóc khách hàng

Chatbot giờ tự động chia làm **2 chế độ** dựa theo vai trò người đang trò chuyện
(`src/services/gemini.service.js`):

- **Nhân sự nội bộ** (Admin, BGĐ, Trưởng bộ phận, Nhân sự, Nhân viên): giữ nguyên
  logic trợ lý vận hành theo phân quyền hiện có, bổ sung thêm kiến thức nền công
  ty để tra cứu nhanh khi cần tư vấn khách hàng.
- **Khách hàng / CTV / Đại lý**: chuyển sang giọng điệu **ấm áp, giàu cảm xúc,
  kiên nhẫn** - xưng hô gần gũi, gọi đúng tên khách hàng nếu đã biết, thể hiện sự
  đồng cảm trước khi đưa thông tin, không thúc ép để lại thông tin liên hệ, luôn
  trung thực khi không chắc chắn (không bịa học phí/tỷ lệ đậu visa/thời gian xử
  lý hồ sơ).

Kiến thức nền công ty (địa chỉ, mã số thuế, hotline, các đơn vị thành viên: Hallo
Sài Gòn/HTO Edu/HTO Immi/HTO Travel, quy trình 6 bước, đối tác...) được soạn sẵn
làm mặc định, đồng thời **Admin chỉnh sửa trực tiếp được** tại Cài đặt hệ thống →
tab Chatbot AI (2 ô: "Giọng điệu Chăm sóc khách hàng" và "Kiến thức nền về công
ty") mà không cần sửa code/deploy lại - nên cập nhật định kỳ để luôn chính xác.

Chatbot cũng đã được nối vào **API thật** (`POST /chat/send`) ở
`src/components/AiChatPage.jsx` thay vì mô phỏng cục bộ, và biết xưng hô đúng
tên người dùng nhờ `src/controllers/chat.controller.js` truy vấn tên thật từ
CSDL thay vì chỉ dựa vào token.

### 2.2. API Key quản lý qua Settings (bảo mật, tự động nhập/xoá theo yêu cầu)

**Vấn đề trước khi sửa:** giao diện Cài đặt hệ thống đã có sẵn ô nhập API Key,
nhưng backend **cố tình bỏ qua** giá trị này và luôn dùng biến môi trường
`GEMINI_API_KEY` cứng trên máy chủ - đúng như bạn phát hiện, ô nhập chưa có tác
dụng thật.

**Đã sửa lại theo đúng yêu cầu của bạn:**

1. Khi bạn dán API Key vào ô "API Key (Gemini)" ở tab Chatbot AI và bấm **"Lưu
   cấu hình Chatbot"** → API Key được lưu vào CSDL (collection `system_settings`,
   key `chat_config`) → `gemini.service.js` đọc key này **ngay lập tức** ở lần
   chat tiếp theo, **không cần sửa code hay deploy lại**.
2. Khi bạn bấm nút **"Xoá API Key"** (chỉ hiện khi đã có key, có hộp thoại xác
   nhận) → API Key bị xoá hẳn khỏi CSDL → Chatbot sẽ báo lỗi "chưa được cấu hình
   API Key" ở lần chat tiếp theo, không còn dữ liệu key nào lưu lại trong hệ
   thống ứng dụng để tránh lộ dữ liệu.
3. **An toàn khi lưu các trường khác:** vì lý do bảo mật, server không bao giờ
   trả API Key thô về trình duyệt (ô luôn hiển thị trống), nên nếu bạn chỉ sửa
   lời chào/prompt rồi bấm Lưu mà không đụng tới ô API Key, hệ thống **tự động
   giữ nguyên** key đã lưu trước đó - không bị xoá nhầm. Muốn xoá phải bấm đúng
   nút "Xoá API Key".
4. Giao diện hiển thị rõ trạng thái: badge **"Đã cấu hình"** (xanh) hoặc
   **"Chưa cấu hình"** (vàng) cạnh ô nhập.
5. Vẫn tương thích ngược: nếu bạn thích cấu hình qua biến môi trường
   `GEMINI_API_KEY` trên máy chủ (không qua giao diện), hệ thống vẫn dùng được -
   API Key nhập qua Settings được **ưu tiên trước**, biến môi trường chỉ là
   phương án dự phòng.
6. Đã bỏ 2 lựa chọn "GPT-4o"/"GPT-4o Mini" khỏi danh sách Model (gây nhầm lẫn vì
   hệ thống hiện chỉ tích hợp Google Gemini, chưa có OpenAI).

### File liên quan (Backend)
`src/controllers/systemSetting.controller.js` (sửa `getSettings`/
`updateChatSettings`, thêm `clearChatApiKey`), `src/routes/systemSetting.routes.js`
(thêm `DELETE /system-settings/chat/api-key`), `src/services/gemini.service.js`
(đọc API Key từ CSDL trước, env var sau).

### File liên quan (Frontend)
`src/systemSettings/SystemSettingsPage.jsx` (badge trạng thái, nút "Xoá API
Key", bỏ option GPT-4o).

## 3. Lưu ý khi triển khai

- **Không cần cài thêm package nào** và **không cần thêm biến môi trường mới**
  (API Key giờ nhập qua giao diện, không qua file `.env` nữa - nếu bạn vẫn muốn
  giữ `GEMINI_API_KEY` trong `.env` làm dự phòng thì vẫn hoạt động bình thường).
- Do sandbox review không có kết nối mạng, các file `.js` đã được kiểm tra cú
  pháp bằng `node --check` và file `.jsx` bằng TypeScript compiler (chế độ
  parse-only), nhưng **chưa chạy được thử nghiệm end-to-end** (cần MongoDB thật +
  `npm install` + API Key Gemini thật). Khuyến nghị test kỹ ở staging trước khi
  lên production - đặc biệt: (1) luồng lưu/xoá API Key, (2) chatbot trả lời đúng
  giọng điệu theo từng vai trò, (3) email marketing gửi đúng nội dung/link hủy
  nhận.
- Bản tin (Newsletter) mặc định **TẮT** - hãy tự kiểm tra kỹ nội dung email mẫu
  trước khi bật, vì đây là tính năng gửi hàng loạt.
