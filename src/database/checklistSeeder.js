const Checklist = require('../models/Checklist');

const seedChecklists = async () => {
  try {
    const count = await Checklist.countDocuments();
    if (count === 0) {
      console.log('Seeding default Checklists into "checklists"...');
      const defaultChecklists = [
        {
          title: "Kiểm tra hồ sơ onboarding nhân sự mới",
          description: "Đối chiếu thông tin cá nhân, email công ty, vai trò và phòng ban trước khi kích hoạt tài khoản.",
          category: "Nhân sự",
          frequency: "Theo yêu cầu",
          priority: "high",
          status: "in_progress",
          progress: 65,
          dueDate: new Date("2026-05-30"),
          ownerName: "Phòng Nhân sự",
          assignedUserIds: [],
          allowedRoles: ["admin", "nhansu", "bangiamdoc"],
          editableForAssignee: true,
          sopId: "sop-hr-001",
          sopTitle: "SOP tạo và xác thực tài khoản nhân sự",
          tasks: [
            { id: "task-1", name: "Xác minh email và số điện thoại", done: true },
            { id: "task-2", name: "Gán vai trò hệ thống đúng nghiệp vụ", done: true },
            { id: "task-3", name: "Gán phòng ban và người quản lý trực tiếp", done: false },
            { id: "task-4", name: "Gửi thông tin đăng nhập ban đầu", done: false }
          ]
        },
        {
          title: "Rà soát tài liệu SOP trước khi phát hành",
          description: "Kiểm tra version, người duyệt, tài liệu liên quan và phạm vi áp dụng trước khi chuyển trạng thái published.",
          category: "Tài liệu",
          frequency: "Hàng tuần",
          priority: "medium",
          status: "todo",
          progress: 20,
          dueDate: new Date("2026-05-28"),
          ownerName: "Ban điều hành",
          assignedUserIds: [],
          allowedRoles: ["admin", "bangiamdoc", "truongbophan", "nhansu"],
          editableForAssignee: false,
          sopId: "sop-doc-002",
          sopTitle: "SOP kiểm soát phiên bản tài liệu",
          tasks: [
            { id: "task-1", name: "Đọc lại nội dung nghiệp vụ", done: false },
            { id: "task-2", name: "Kiểm tra file đính kèm", done: true },
            { id: "task-3", name: "Xác nhận quyền xem theo role", done: false }
          ]
        },
        {
          title: "Kiểm tra log hoạt động bất thường",
          description: "Xem audit log, rà soát đăng nhập thất bại, thao tác khóa/mở khóa user và cập nhật quyền.",
          category: "Hệ thống",
          frequency: "Hàng ngày",
          priority: "high",
          status: "todo",
          progress: 0,
          dueDate: new Date("2026-05-24"),
          ownerName: "Admin hệ thống",
          assignedUserIds: [],
          allowedRoles: ["admin", "hethong"],
          editableForAssignee: false,
          sopId: "sop-sec-003",
          sopTitle: "SOP kiểm tra và xử lý audit log",
          tasks: [
            { id: "task-1", name: "Lọc log theo mức cảnh báo", done: false },
            { id: "task-2", name: "Xác nhận tài khoản thao tác", done: false },
            { id: "task-3", name: "Ghi nhận kết quả kiểm tra", done: false }
          ]
        },
        {
          title: "Đối soát danh sách phòng ban đang hiển thị",
          description: "Đảm bảo phòng ban ẩn không xuất hiện trong dropdown tạo tài khoản và báo cáo nhân sự.",
          category: "Phòng ban",
          frequency: "Hàng tháng",
          priority: "low",
          status: "completed",
          progress: 100,
          completedAt: new Date("2026-05-20"),
          dueDate: new Date("2026-05-20"),
          ownerName: "Phòng Nhân sự",
          assignedUserIds: [],
          allowedRoles: ["all"],
          editableForAssignee: true,
          sopId: "sop-dept-004",
          sopTitle: "SOP quản lý phòng ban",
          tasks: [
            { id: "task-1", name: "Kiểm tra danh sách phòng ban", done: true },
            { id: "task-2", name: "Đối chiếu trạng thái ẩn/hiện", done: true },
            { id: "task-3", name: "Lưu kết quả rà soát", done: true }
          ]
        }
      ];

      await Checklist.insertMany(defaultChecklists);
      console.log('Checklists seeded successfully!');
    }
  } catch (error) {
    console.error('Error seeding Checklists:', error.message);
  }
};

module.exports = seedChecklists;
