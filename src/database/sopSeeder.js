const Sop = require('../models/Sop');

const seedSops = async () => {
  try {
    const count = await Sop.countDocuments();
    if (count === 0) {
      console.log('Seeding default SOPs into "sops"...');
      const defaultSops = [
        {
          code: "SOP-HR-001",
          title: "SOP tạo và xác thực tài khoản nhân sự",
          summary: "Quy trình tiếp nhận thông tin, tạo tài khoản, gán vai trò, phòng ban và xác thực email cho nhân sự mới.",
          category: "Nhân sự",
          department: "Phòng Nhân sự",
          ownerName: "Trưởng phòng Nhân sự",
          version: "v1.4",
          status: "published",
          effectiveDate: new Date("2026-05-01"),
          allowedRoles: ["admin", "nhansu", "bangiamdoc"],
          tags: ["onboarding", "tài khoản", "phân quyền"],
          conditions: [
            "Áp dụng cho tài khoản nhân viên nội bộ.",
            "Chỉ thực hiện sau khi hồ sơ nhân sự đã được xác nhận.",
            "Người tạo phải có quyền users:create hoặc quyền quản trị hệ thống."
          ],
          steps: [
            "Tiếp nhận thông tin nhân sự từ phòng phụ trách.",
            "Kiểm tra email, số điện thoại và phòng ban.",
            "Tạo tài khoản trên hệ thống, gán role_id và department_id phù hợp.",
            "Gửi thông tin đăng nhập ban đầu và yêu cầu đổi mật khẩu.",
            "Ghi nhận kết quả vào audit log hoặc checklist onboarding."
          ],
          relatedDocs: [
            { id: "doc-01", title: "Biểu mẫu thông tin nhân sự mới", type: "Form", url: "#" },
            { id: "doc-02", title: "Ma trận phân quyền tài khoản", type: "Policy", url: "#" }
          ]
        },
        {
          code: "SOP-DOC-002",
          title: "SOP kiểm soát phiên bản tài liệu",
          summary: "Chuẩn hóa cách đặt mã, cập nhật version, liên kết tài liệu và duyệt SOP trước khi phát hành cho người dùng.",
          category: "Tài liệu",
          department: "Ban điều hành",
          ownerName: "Ban giám độcc",
          version: "v2.1",
          status: "published",
          effectiveDate: new Date("2026-04-15"),
          allowedRoles: ["admin", "bangiamdoc", "truongbophan", "nhansu"],
          tags: ["document", "version", "approval"],
          conditions: [
            "Mọi tài liệu SOP phát hành nội bộ đều phải có mã SOP.",
            "Version mới cần có người duyệt và ngày hiệu lực.",
            "Không chỉnh sửa trực tiếp SOP đã published nếu chưa tạo bản nháp mới."
          ],
          steps: [
            "Tạo bản nháp SOP với mã và tiêu đề rõ ràng.",
            "Liên kết biểu mẫu, chính sách hoặc tài liệu tham chiếu.",
            "Gửi duyệt cho người phụ trách nghiệp vụ.",
            "Cập nhật trạng thái published khi được duyệt.",
            "Thông báo cho nhóm người dùng được quyền xem."
          ],
          relatedDocs: [
            { id: "doc-03", title: "Template SOP chuẩn", type: "Template", url: "#" },
            { id: "doc-04", title: "Checklist rà soát tài liệu", type: "Checklist", url: "#" }
          ]
        },
        {
          code: "SOP-SEC-003",
          title: "SOP kiểm tra và xử lý audit log",
          summary: "Hướng dẫn đọc log, phân loại mức độ rủi ro và xử lý các thao tác bất thường liên quan đến tài khoản, vai trò và phòng ban.",
          category: "Bảo mật",
          department: "Hệ thống",
          ownerName: "Admin hệ thống",
          version: "v1.0",
          status: "reviewing",
          effectiveDate: new Date("2026-05-10"),
          allowedRoles: ["admin", "hethong", "bangiamdoc"],
          tags: ["audit", "security", "risk"],
          conditions: [
            "Áp dụng khi phát hiện đăng nhập thất bại nhiều lần hoặc thay đổi quyền bất thường.",
            "Chỉ người có quyền audit_logs:view hoặc admin mới xem được log chi tiết."
          ],
          steps: [
            "Lọc audit log theo thời gian và loại hành động.",
            "Xác định tài khoản thực hiện, IP và module bị tác động.",
            "Đánh giá mức độ rủi ro: thấp, trung bình, cao.",
            "Khóa tài khoản hoặc thu hồi quyền nếu có dấu hiệu bất thường.",
            "Ghi nhận kết quả xử lý và thông báo cho quản lý liên quan."
          ],
          relatedDocs: [
            { id: "doc-05", title: "Quy định bảo mật tài khoản", type: "Policy", url: "#" }
          ]
        },
        {
          code: "SOP-DEPT-004",
          title: "SOP quản lý phòng ban",
          summary: "Quy trình tạo, sửa, ẩn phòng ban và liên kết nhân sự vào phòng ban đúng cấu trúc tổ chức.",
          category: "Phòng ban",
          department: "Phòng Nhân sự",
          ownerName: "Phòng Nhân sự",
          version: "v1.2",
          status: "published",
          effectiveDate: new Date("2026-03-28"),
          allowedRoles: ["all"],
          tags: ["department", "organization"],
          conditions: [
            "Phòng ban mới phải có tên rõ ràng và không trùng với phòng ban đang hoạt động.",
            "Ẩn phòng ban chỉ áp dụng khi không còn nhu cầu hiển thị trong form tạo tài khoản."
          ],
          steps: [
            "Kiểm tra phòng ban đã tồn tại hay chưa.",
            "Tạo mới hoặc cập nhật thông tin phòng ban.",
            "Gán nhân sự vào phòng ban nếu cần.",
            "Ẩn phòng ban không còn sử dụng thay vì xóa cứng.",
            "Kiểm tra lại dropdown ở form tài khoản."
          ],
          relatedDocs: [
            { id: "doc-06", title: "Sơ đồ tổ chức nội bộ", type: "Diagram", url: "#" }
          ]
        }
      ];

      await Sop.insertMany(defaultSops);
      console.log('SOPs seeded successfully!');
    }
  } catch (error) {
    console.error('Error seeding SOPs:', error.message);
  }
};

module.exports = seedSops;
