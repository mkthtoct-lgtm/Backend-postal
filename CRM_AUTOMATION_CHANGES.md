# Tóm tắt thay đổi - CRM Automation, Marketing Automation & Chatbot AI

Tài liệu này tổng hợp TOÀN BỘ thay đổi đã thực hiện (2 đợt), giúp bạn/dev
review nhanh mà không cần dò từng file. Không dùng AI cho các automation
(rule-based, xác định trước) - chỉ riêng chatbot là dùng AI (Gemini) như hệ
thống đã có sẵn.

---

## PHẦN 1 - CRM AUTOMATION (đợt 1)

Tự động hoá vận hành nội bộ: phân công, phát hiện trùng lặp, nhắc nhở, đóng
lead quá hạn, nhắc đối soát hoa hồng, gợi ý thăng hạng CTV.

| # | Automation | Mô tả |
|---|---|---|
| 1 | Tự động phân công nhân sự | Lead không có CTV giới thiệu được gán round-robin cho nhân viên nội bộ (`assignedStaffId`, tách biệt hoàn toàn khỏi `collaboratorId` nên không ảnh hưởng cách tính hoa hồng). |
| 2 | Phát hiện Lead trùng lặp | Cảnh báo khi cùng SĐT/email gửi lead nhiều lần trong X ngày, tránh 2 CTV giẫm chân nhau. |
| 3 | Email xác nhận tự động | Gửi ngay khi khách gửi thông tin (giao dịch, không tính là email marketing). |
| 4 | Thông báo nội bộ Lead mới | In-app + email cho đúng người phụ trách + cấp quản lý. |
| 5 | Nhắc lead "im lặng" | Sau X giờ (mặc định 24h) chưa cập nhật trạng thái. |
| 6 | Tự động đóng lead quá hạn | Sau X ngày (mặc định 14 ngày) → "Thất bại", đồng bộ lại BizFly. |
| 7 | Nhắc đối soát hoa hồng | Khi hoa hồng "pending" quá X ngày (mặc định 7 ngày). |
| 8 | Gợi ý thăng hạng CTV | Hàng tháng, chỉ gợi ý - không tự đổi hạng (ảnh hưởng tài chính, cần người xác nhận). |

Cấu hình tại **Cài đặt hệ thống → tab "CRM Automation"**.

---

## PHẦN 2 - MARKETING AUTOMATION (đợt 2, mới)

Tự động hoá chăm sóc & giữ chân khách hàng, nâng cao trải nghiệm khách hàng
xuyên suốt hành trình - độc lập hoàn toàn với CRM Automation (2 công tắc
"enabled" riêng, tắt cái này không ảnh hưởng cái kia).

| # | Automation | Mô tả |
|---|---|---|
| 1 | Chăm sóc (Nurture) Lead đang tư vấn | 2 email động viên/thông tin hữu ích gửi vào ngày 2 và ngày 5 (cấu hình được) nếu lead vẫn ở trạng thái "Đang tư vấn", giúp khách không cảm thấy bị "bỏ rơi". |
| 2 | Email cảm ơn sau chuyển đổi | Gửi 1 lần duy nhất khi lead chuyển sang "Thành công" (hook ở cả 3 nơi có thể xảy ra: tạo lead trực tiếp, Admin cập nhật trạng thái, webhook BizFly). |
| 3 | Tái kết nối (Win-back) | Gửi 1 lần cho lead đã "Thất bại" sau X ngày (mặc định 45 ngày), nhẹ nhàng mở lại cơ hội, không gây áp lực. |
| 4 | Bản tin (Newsletter) tự động | Khi Admin đăng tin tức/sự kiện mới, tự gửi tóm tắt cho khách hàng đang hoạt động (mặc định **TẮT** - cần Admin chủ động bật vì đây là gửi hàng loạt). |
| 5 | Hủy nhận email (Unsubscribe) | Link public trong mọi email marketing, không cần đăng nhập - hủy áp dụng cho TẤT CẢ lead cùng email (không chỉ 1 lead), tuân thủ thông lệ email marketing. |

**Lưu ý quan trọng:** opt-out chỉ áp dụng cho email marketing (nurture,
win-back, newsletter). Các email giao dịch cần thiết (xác nhận lead, thông
báo nội bộ) không bị ảnh hưởng.

Cấu hình tại **Cài đặt hệ thống → tab "Marketing Automation"**.

### File mới
- `src/services/marketingAutomation.service.js` - engine chính
- `src/controllers/marketing.controller.js` - API + trang HTML unsubscribe
- `src/routes/marketing.routes.js` - route `/api/v1/marketing/*` (có 1 route public: `/unsubscribe/:leadId`)

### File đã sửa
- `src/models/Lead.js` - thêm `marketingOptOut`, `marketingOptOutAt`, `nurtureStage`, `nurtureLastSentAt`, `thankYouSentAt`, `winBackSentAt` (đều có default, không cần migrate)
- `src/services/mail.service.js` - thêm template email: nurture, thank-you, win-back, newsletter (kèm khung giao diện marketing riêng có link hủy nhận)
- `src/services/newsPost.service.js` - hook gửi bản tin khi tạo tin tức/sự kiện mới (chạy nền, tự kiểm tra cấu hình)
- `src/controllers/lead.controller.js` - hook gửi email cảm ơn ở CẢ 3 nơi lead có thể chuyển sang "Thành công"
- `src/jobs/scheduler.js` - **viết lại** để CRM Automation và Marketing Automation chạy độc lập (trước đó nếu tắt CRM sẽ vô tình chặn luôn Marketing - đã sửa)
- `src/services/auditLog.service.js` - cho phép ghi log hành động `marketing.*` (trước đó chỉ cho phép `automation.*`)
- `src/app.js` - mount route `/api/v1/marketing`

---

## PHẦN 3 - "TRAIN LẠI" CHATBOT AI (đợt 2, mới)

### Phát hiện quan trọng khi rà soát
Trước khi sửa, rà soát phát hiện **2 vấn đề khiến việc "train" chatbot trước
đây không có tác dụng thực tế**:

1. **Widget chat trên giao diện KHÔNG gọi API thật** - `AiChatPage.jsx` tự
   sinh câu trả lời giả lập cục bộ (`createAssistantReply`), có ghi chú sẵn
   trong code "Khi API AI được kết nối...". Đã sửa để gọi đúng
   `POST /api/v1/chat/send` (API Gemini thật).
2. **Nút "Lưu cấu hình Chatbot" ở trang Cài đặt chỉ lưu vào `localStorage`**
   của trình duyệt Admin, KHÔNG gọi API `/system-settings/chat` đã có sẵn ở
   backend - nghĩa là mọi chỉnh sửa system prompt trước đây không hề được
   lưu vào CSDL, chatbot vẫn luôn dùng cấu hình mặc định cứng trong code. Đã
   sửa để gọi đúng API và lưu thật.
3. (Phụ) `req.user.name` không tồn tại trong token xác thực → chatbot chưa
   bao giờ thực sự biết tên người đang trò chuyện. Đã sửa để truy vấn tên
   thật từ CSDL.

### Cải tiến "bộ não" của chatbot
- **Phân nhánh theo vai trò**: Nhân sự nội bộ (Admin/BGĐ/Trưởng bộ
  phận/Nhân sự/Nhân viên) tiếp tục nhận trợ lý vận hành theo đúng phân
  quyền như cũ. Khách hàng/Cộng tác viên/Đại lý (đa số người dùng thực tế
  của chatbot này, vì đây là chatbot trong portal - không phải bot công
  khai) giờ nhận được **giọng điệu chăm sóc khách hàng ấm áp, giàu cảm xúc
  hơn** hoàn toàn khác.
- **Kiến thức nền công ty**: bổ sung đầy đủ thông tin HT Ocean Group (tên
  pháp lý, mã số thuế, địa chỉ, hotline 1800 9078, hệ sinh thái Hallo Sài
  Gòn/HTO Edu/HTO Immi/HTO Travel, đối tác, quy trình tư vấn tổng quát) -
  biên soạn từ thông tin công khai trên htogroup.com.vn.
- **Quy tắc an toàn bắt buộc**: không bao giờ cam kết tỷ lệ đậu visa/học
  bổng, không tự bịa học phí/thời gian xử lý cụ thể - luôn khuyến nghị
  liên hệ chuyên viên con người khi không chắc chắn.
- Cả kiến thức nền công ty và giọng điệu chăm sóc khách hàng đều **chỉnh
  sửa được trực tiếp** tại Cài đặt hệ thống → tab "Chatbot AI" mà không cần
  deploy lại code.

### File đã sửa
- `src/services/gemini.service.js` - viết lại: phân nhánh prompt theo vai
  trò + kiến thức nền công ty mặc định + giọng điệu chăm sóc khách hàng mặc định
- `src/controllers/chat.controller.js` - truyền `roleSlug` + sửa bug tên người dùng
- `src/controllers/systemSetting.controller.js` - đồng bộ default + lưu đúng 2 field mới (`companyKnowledgeBase`, `customerCareSystemPrompt`), trước đó bị lược bỏ khi lưu
- `src/routes/systemSetting.routes.js` - cập nhật swagger docs
- `src/components/AiChatPage.jsx` (frontend) - nối vào API thật `/chat/send`, lấy đúng trạng thái bật/tắt + lời chào từ backend thay vì localStorage/hardcode
- `src/systemSettings/SystemSettingsPage.jsx` (frontend) - sửa bug lưu cấu hình chat (giờ gọi API thật), thêm 2 ô nhập "Giọng điệu Chăm sóc khách hàng" và "Kiến thức nền về công ty"

⚠️ **Về độ chính xác thông tin công ty**: nội dung kiến thức nền được biên
soạn từ thông tin công khai trên website công ty tại thời điểm thực hiện.
Vì các con số (số học viên, tỷ lệ...) và thông tin liên hệ có thể thay đổi
theo thời gian, khuyến nghị Admin/Marketing rà soát và cập nhật định kỳ
qua giao diện Cài đặt hệ thống.

---

## Lưu ý triển khai chung (áp dụng cho cả 2 đợt)

- **Không cần cài thêm package nào** - scheduler dùng `setInterval` thuần
  của Node.js, không dùng `node-cron`/`agenda`.
- **Không cần thêm biến môi trường mới** - toàn bộ cấu hình lưu trong
  collection `system_settings` có sẵn, chỉnh trực tiếp qua giao diện.
- Toàn bộ field mới trong model đều có giá trị mặc định (`default: ...`) -
  **không cần chạy migration**, không phá vỡ dữ liệu/API cũ.
- Do môi trường rà soát không có kết nối mạng, mọi file `.js` đã được kiểm
  tra cú pháp bằng `node --check` và file `.jsx` đã được kiểm tra bằng
  TypeScript compiler (chế độ parse-only), nhưng **chưa chạy được thử
  nghiệm end-to-end** (cần kết nối MongoDB thật + `npm install` + tài khoản
  Gemini API hợp lệ). Khuyến nghị test kỹ ở môi trường staging trước khi
  lên production - đặc biệt các luồng: tạo lead mới, chuyển trạng thái deal,
  gửi bản tin newsletter (do gửi hàng loạt), và hội thoại chatbot.
- Trong quá trình rà soát, phát hiện và dọn dẹp thêm 2 lỗi trùng lặp field
  nhỏ còn sót lại trong `Lead.js`/`User.js` từ một lần chỉnh sửa trước đó bị
  ngắt quãng (vô hại về chức năng nhưng đã dọn cho sạch code).

## Toàn bộ danh sách file đã thay đổi (cả 2 đợt)

### Backend
```
src/app.js
src/controllers/automation.controller.js       (mới)
src/controllers/chat.controller.js
src/controllers/lead.controller.js
src/controllers/marketing.controller.js        (mới)
src/controllers/systemSetting.controller.js
src/jobs/scheduler.js                          (mới)
src/models/Lead.js
src/models/Notification.js
src/models/User.js
src/routes/automation.routes.js                (mới)
src/routes/marketing.routes.js                 (mới)
src/routes/systemSetting.routes.js
src/server.js
src/services/auditLog.service.js
src/services/automation.service.js             (mới)
src/services/gemini.service.js
src/services/lead.service.js
src/services/mail.service.js
src/services/marketingAutomation.service.js    (mới)
src/services/newsPost.service.js
src/services/notification.service.js
```

### Frontend
```
src/components/AiChatPage.jsx
src/systemSettings/SystemSettingsPage.jsx
```
