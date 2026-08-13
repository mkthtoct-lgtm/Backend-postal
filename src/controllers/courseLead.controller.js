const CourseLead = require('../models/courseLead.model');

const leadController = {
  // Tạo Lead mới từ form tư vấn
  createLead: async (req, res) => {
    try {
      const { customerName, phoneNumber, email, notes, courseId } = req.body;

      // Validation căn bản
      if (!customerName || !phoneNumber || !courseId) {
        return res.status(400).json({
          success: false,
          message: 'Họ tên, số điện thoại và ID khóa học là bắt buộc.',
        });
      }

      const newLead = await CourseLead.create({
        customerName,
        phoneNumber,
        email,
        notes,
        courseId,
      });

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tư vấn thành công.',
        data: newLead,
      });
    } catch (error) {
      console.error('Lỗi khi tạo Lead khóa học:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ. Vui lòng thử lại sau.',
        error: error.message,
      });
    }
  },

  // Lấy danh sách Lead cho Sale Team
  getLeads: async (req, res) => {
    try {
      // Sort mới nhất lên đầu (-1)
      const leads = await CourseLead.find()
        .sort({ createdAt: -1 })
        .populate('courseId', 'name description'); // Chỉ lấy các trường cần thiết của Course

      return res.status(200).json({
        success: true,
        data: leads,
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách Lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy dữ liệu.',
        error: error.message,
      });
    }
  },

  // Cập nhật trạng thái xử lý
  updateLeadStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate enum
      const validStatuses = ['new', 'processing', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái không hợp lệ.',
        });
      }

      const updatedLead = await CourseLead.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true } // new: true trả về document sau khi update
      );

      if (!updatedLead) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy Lead với ID được cung cấp.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái thành công.',
        data: updatedLead,
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật Lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật.',
        error: error.message,
      });
    }
  },
};

module.exports = leadController;
