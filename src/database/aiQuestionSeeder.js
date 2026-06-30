const AiQuestion = require('../models/AiQuestion');

const seedAiQuestions = async () => {
  try {
    const count = await AiQuestion.countDocuments();
    if (count === 0) {
      console.log('Seeding default AI Questions into "ai_questions"...');
      const defaultQuestions = [
        {
          question: "Khách hàng chưa có bằng B1 thì có thể nộp hồ sơ du học nghề Đức trước không?",
          askedBy: "Nguyễn Minh Anh",
          askedByEmail: "minhanh@example.com",
          topic: "Du học Đức",
          source: "Chatbot website",
          status: "pending",
          priority: "high",
          suggestedDocuments: [
            { id: "doc-002", title: "Checklist hồ sơ visa du học" },
            { id: "doc-007", title: "Tài liệu đào tạo tư vấn viên mới" }
          ]
        },
        {
          question: "Nếu khách hàng muốn đổi ngành sau khi đã nhận tư vấn thì quy trình CRM xử lý thế nào?",
          askedBy: "Trần Quốc Huy",
          askedByEmail: "huy.tran@example.com",
          topic: "CRM",
          source: "AI nội bộ",
          status: "pending",
          priority: "medium",
          suggestedDocuments: [
            { id: "doc-003", title: "SOP xử lý lead từ website" }
          ]
        },
        {
          question: "Tài liệu nào quy định quyền tạo mới tài khoản nhân sự?",
          askedBy: "Lê Thanh",
          askedByEmail: "lethanh@example.com",
          topic: "Phân quyền",
          source: "AI nội bộ",
          status: "reviewing",
          priority: "low",
          suggestedDocuments: [
            { id: "doc-004", title: "Chính sách phân quyền tài khoản nội bộ" }
          ]
        },
        {
          question: "Khách hàng hỏi chi phí định cư theo diện đầu tư thì nên dùng bảng giá nào?",
          askedBy: "Phạm Quỳnh",
          askedByEmail: "quynh.pham@example.com",
          topic: "Định cư",
          source: "Chatbot website",
          status: "pending",
          priority: "high",
          suggestedDocuments: [
            { id: "doc-006", title: "Bảng giá dịch vụ tham khảo" },
            { id: "doc-009", title: "FAQ chương trình định cư" }
          ]
        }
      ];

      await AiQuestion.insertMany(defaultQuestions);
      console.log('AI Questions seeded successfully!');
    }
  } catch (error) {
    console.error('Error seeding AI Questions:', error.message);
  }
};

module.exports = seedAiQuestions;
