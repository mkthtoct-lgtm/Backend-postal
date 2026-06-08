const NewsPost = require('../models/NewsPost');

const seedNewsPosts = async () => {
  try {
    const count = await NewsPost.countDocuments();
    if (count === 0) {
      console.log('Seeding default news & events into "news_posts"...');
      const defaultArticles = [
        {
          title: "Webinar: Lộ trình du học nghề Đức năm 2026",
          type: "event",
          category: "Du học Đức",
          date: new Date("2026-06-15T09:00:00Z"),
          location: "Online Meet",
          status: "Sắp diễn ra",
          summary: "Cập nhật điều kiện, ngành nghề nổi bật, thời điểm học tiếng và checklist hồ sơ cần chuẩn bị.",
          content: "Buổi webinar giúp học viên và phụ huynh hiểu rõ lộ trình từ tư vấn ban đầu, học tiếng Đức, chuẩn bị hồ sơ, xin visa đến giai đoạn nhập cảnh và ổn định tại Đức.",
          image: "/assets/images/banner-web-korean.jpg",
          author: "HTO Education",
          featured: true,
        },
        {
          title: "Cập nhật checklist hồ sơ visa cho học viên tháng 06",
          type: "news",
          category: "Visa",
          date: new Date("2026-06-03T10:00:00Z"),
          location: "HT Ocean Group",
          status: "Đã đăng",
          summary: "HTO chuẩn hóa lại danh sách giấy tờ để giảm sai sót trước khi đặt lịch và nộp hồ sơ.",
          content: "Bộ phận hồ sơ khuyến nghị học viên rà soát hộ chiếu, ảnh, giấy tờ học tập, chứng minh tài chính và các bản dịch công chứng theo từng nhóm hồ sơ.",
          image: "/assets/images/banner-second.jpg",
          author: "Phòng Hồ sơ",
          featured: false,
        },
        {
          title: "Ngày kiểm tra trình độ tiếng Đức đầu vào",
          type: "event",
          category: "Đào tạo ngôn ngữ",
          date: new Date("2026-06-30T08:00:00Z"),
          location: "Văn phòng HTO",
          status: "Đang mở đăng ký",
          summary: "Kiểm tra năng lực, tư vấn lớp học và xây dựng kế hoạch học tiếng theo mục tiêu hồ sơ.",
          content: "Học viên sẽ làm bài kiểm tra ngắn, trao đổi với giáo viên và nhận lộ trình học phù hợp với mốc nộp hồ sơ dự kiến.",
          image: "/assets/images/hito_3.png",
          author: "Phòng Đào tạo",
          featured: false,
        },
      ];

      await NewsPost.insertMany(defaultArticles);
      console.log('News & events seeded successfully into "news_posts"!');
    }
  } catch (error) {
    console.error('Error seeding news & events:', error.message);
  }
};

module.exports = seedNewsPosts;
