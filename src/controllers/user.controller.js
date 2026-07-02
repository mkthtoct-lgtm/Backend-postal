const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userService = require('../services/user.service');

// Hàm helper kiểm tra định dạng email hợp lệ
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Hàm helper kiểm tra độ phức tạp của mật khẩu
const validatePasswordComplexity = (password) => {
  if (password.length <= 6) {
    return {
      isValid: false,
      message: 'Mật khẩu phải dài hơn 6 ký tự.',
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]{};':"\\|\\`~]/.test(password);

  if (!hasUppercase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      message: 'Mật khẩu phải chứa ít nhất 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt.',
    };
  }

  return { isValid: true };
};

// Hàm helper làm sạch và chuyển đổi User object chỉ giữ lại các trường của Mongoose Schema
const toCleanUserResponse = (user) => {
  if (!user) return null;
  return {
    _id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || null,
    socialLink: user.socialLink || null,
    zaloLink: user.zaloLink || null,
    instagramLink: user.instagramLink || null,
    city: user.city || null,
    ward: user.ward || null,
    addressDetail: user.addressDetail || null,
    address: user.address || null,
    referral_code_user: user.referral_code_user || null,
    referral_code: user.referral_code || null,
    referred_by_user_id: user.referred_by_user_id || null,
    avatarUrl: user.avatarUrl || null,
    bannerUrl: user.bannerUrl || null,
    roleId: user.roleId ? (user.roleId._id || user.roleId) : null,
    departmentId: user.departmentId || null,
    status: user.status,
    hasSeenAdminTutorial: user.hasSeenAdminTutorial || false,
    seenTours: user.seenTours || [],
    dealCount: user.dealCount || 0,
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// Hàm helper giải mã và lưu ảnh base64 vật lý lên server
const saveBase64Image = (base64Str) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // Khớp định dạng: data:image/png;base64,iVBORw...
    const matches = base64Str.match(/^data:image\/([A-Za-z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const extension = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    // Tạo tên file duy nhất giống multer
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-upload.${extension}`;
    const uploadDir = path.join(__dirname, '../../uploads');

    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error('[Base64 Upload Error] Lỗi khi lưu ảnh:', error);
    return null;
  }
};

class UserController {
  /**
   * Lấy danh sách toàn bộ người dùng (Có phân trang, tìm kiếm)
   */
  async getAllUsers(req, res) {
    try {
      let { search, status, departmentId } = req.query;

      search = search ? search.trim() : '';

      // Kiểm soát giá trị lọc status hợp lệ
      if (status && !['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái lọc status không hợp lệ. Chỉ chấp nhận: active, inactive, suspended.',
        });
      }

      const result = await userService.findAll({ search, status, departmentId });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách người dùng thành công.',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách người dùng.',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết một người dùng bằng ID
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra định dạng ObjectId của MongoDB
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ.',
        });
      }

      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa khỏi hệ thống.',
        });
      }

      // Đếm số lượng deal thực tế từ lead
      const Lead = require('../models/Lead');
      const dealCount = await Lead.countDocuments({ collaboratorId: id, status: 'xu_ly_ho_so', deletedAt: null });
      user.dealCount = dealCount;

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết người dùng thành công.',
        data: toCleanUserResponse(user),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết người dùng.',
        error: error.message,
      });
    }
  }
  /**
   * Quản trị viên tạo người dùng mới trực tiếp
   */
  async createUser(req, res) {
    try {
      const { email, password, fullName, roleId, departmentId } = req.body;

      // Validation bắt buộc các trường cơ bản (name, email, password, role)
      if (!fullName || !email || !password || !roleId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ các thông tin bắt buộc: Họ tên, Email, Mật khẩu và Vai trò.',
        });
      }

      // Kiểm duyệt định dạng email
      if (!validateEmailFormat(email)) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng Email không hợp lệ (Ví dụ: user@example.com).',
        });
      }

      // Kiểm duyệt độ phức tạp mật khẩu
      const passwordValidation = validatePasswordComplexity(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
        });
      }

      // Kiểm duyệt tính hợp lệ của roleId (phải là MongoDB ObjectId hợp lệ)
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Vai trò (roleId) được cung cấp không hợp lệ.',
        });
      }

      // Kiểm duyệt departmentId (nếu được truyền lên, phải là ObjectId hợp lệ, ngược lại đặt về null)
      let cleanDepartmentId = null;
      if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
        cleanDepartmentId = new mongoose.Types.ObjectId(departmentId);
      }

      // Kiểm tra email trùng lặp trong hệ thống
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng trong hệ thống.',
        });
      }

      // Mã hóa mật khẩu
      const passwordHash = await bcrypt.hash(password, 10);

      // Tạo mới tài khoản
      const newUser = await userService.create({
        fullName,
        email,
        passwordHash,
        roleId: new mongoose.Types.ObjectId(roleId),
        departmentId: cleanDepartmentId,
        status: 'active', // Trạng thái mặc định là active
      });

      // Ẩn mật khẩu khi phản hồi
      const userObj = newUser.toObject();
      delete userObj.passwordHash;

      // Ghi lịch sử tạo user (log dưới dạng user.update)
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'user.update',
        { type: 'user', id: newUser._id.toString(), name: newUser.fullName },
        { created: true, email: newUser.email, fullName: newUser.fullName }
      );

      // Nếu có gán phòng ban ngay khi tạo
      if (cleanDepartmentId) {
        const departmentService = require('../services/department.service');
        departmentService.findById(cleanDepartmentId).then((dept) => {
          if (dept) {
            auditLogService.log(
              req.user.sub,
              'department.assign_user',
              { type: 'department', id: dept._id.toString(), name: dept.name },
              { userId: newUser._id.toString(), userName: newUser.fullName, userEmail: newUser.email }
            );
          }
        }).catch((err) => console.error('Failed to log department.assign_user on user creation:', err));
      }

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản người dùng mới thành công.',
        data: userObj,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo mới người dùng.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật thông tin người dùng
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, fullName, phone, status, roleId, departmentId, socialLink, zaloLink, instagramLink, city, ward, addressDetail, avatarUrl, bannerUrl, hasSeenAdminTutorial, seenTours } = req.body;

      // Kiểm tra định dạng ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ.',
        });
      }

      // Kiểm tra user có tồn tại không
      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa khỏi hệ thống.',
        });
      }

      // Kiểm soát bảo mật: Kiểm tra thay đổi các trường nhạy cảm (roleId, departmentId, status)
      // Chỉ cho phép nếu người dùng đang thực hiện (req.user) có quyền `users:write` hoặc `*`
      const isChangingRole = roleId !== undefined && roleId.toString() !== (user.roleId ? user.roleId.toString() : '');
      const isChangingDept = departmentId !== undefined && (departmentId ? departmentId.toString() : null) !== (user.departmentId ? user.departmentId.toString() : null);
      const isChangingStatus = status !== undefined && status !== user.status;

      if (isChangingRole || isChangingDept || isChangingStatus) {
        const Role = require('../models/Role');
        const userRole = await Role.findById(req.user.roleId);
        const hasWritePermission = userRole && (userRole.permissions.includes('*') || userRole.permissions.includes('users:write'));

        if (!hasWritePermission) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền thay đổi các thông tin quản trị nhạy cảm (vai trò, phòng ban, trạng thái).',
          });
        }
      }

      const updateData = {};

      if (hasSeenAdminTutorial !== undefined) {
        updateData.hasSeenAdminTutorial = Boolean(hasSeenAdminTutorial);
      }

      if (seenTours !== undefined) {
        updateData.seenTours = Array.isArray(seenTours) ? seenTours : [];
      }

      // Xử lý các tệp tải lên nếu có (avatar, banner)
      if (req.files) {
        if (req.files.avatar && req.files.avatar[0]) {
          const avatarFile = req.files.avatar[0];
          updateData.avatarUrl = `/uploads/${avatarFile.filename}`;
        }

        if (req.files.banner && req.files.banner[0]) {
          const bannerFile = req.files.banner[0];
          updateData.bannerUrl = `/uploads/${bannerFile.filename}`;
        }
      }

      if (fullName !== undefined) {
        if (!fullName.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Họ tên không được phép để trống.',
          });
        }
        updateData.fullName = fullName.trim();
      }

      if (phone !== undefined) {
        updateData.phone = phone ? phone.trim() : null;
      }

      // Ép kiểu và kiểm duyệt tính hợp lệ của roleId nếu được gửi lên
      if (roleId !== undefined) {
        if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
          return res.status(400).json({
            success: false,
            message: 'Vai trò (roleId) được cung cấp không hợp lệ.',
          });
        }
        updateData.roleId = new mongoose.Types.ObjectId(roleId);

        // reset cờ tutorial nếu vai trò mới là Admin
        try {
          const Role = require('../models/Role');
          const newRole = await Role.findById(roleId);
          if (newRole && (newRole.slug === 'admin' || newRole.name.toLowerCase() === 'admin')) {
            updateData.hasSeenAdminTutorial = false;
          }
        } catch (err) {
          console.error('Lỗi khi kiểm tra vai trò mới:', err);
        }
      }

      // Ép kiểu và kiểm duyệt tính hợp lệ của departmentId
      if (departmentId !== undefined) {
        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
          updateData.departmentId = new mongoose.Types.ObjectId(departmentId);
        } else {
          updateData.departmentId = null; // Đặt về null nếu rỗng hoặc không phải ObjectId hợp lệ
        }
      }

      if (status !== undefined) {
        if (!['active', 'inactive', 'suspended'].includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'Trạng thái status không hợp lệ. Chỉ chấp nhận: active, inactive, suspended.',
          });
        }
        updateData.status = status;
      }

      if (socialLink !== undefined) {
        updateData.socialLink = socialLink ? socialLink.trim() : null;
      }

      if (zaloLink !== undefined) {
        updateData.zaloLink = zaloLink ? zaloLink.trim() : null;
      }

      if (instagramLink !== undefined) {
        updateData.instagramLink = instagramLink ? instagramLink.trim() : null;
      }

      if (city !== undefined) {
        updateData.city = city ? city.trim() : null;
      }

      if (ward !== undefined) {
        updateData.ward = ward ? ward.trim() : null;
      }

      if (addressDetail !== undefined) {
        updateData.addressDetail = addressDetail ? addressDetail.trim() : null;
      }

      if (avatarUrl !== undefined && !updateData.avatarUrl) {
        if (avatarUrl && avatarUrl.startsWith('data:image/')) {
          const savedUrl = saveBase64Image(avatarUrl);
          if (savedUrl) {
            updateData.avatarUrl = savedUrl;
          }
        } else {
          updateData.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
        }
      }

      if (bannerUrl !== undefined && !updateData.bannerUrl) {
        if (bannerUrl && bannerUrl.startsWith('data:image/')) {
          const savedUrl = saveBase64Image(bannerUrl);
          if (savedUrl) {
            updateData.bannerUrl = savedUrl;
          }
        } else {
          updateData.bannerUrl = bannerUrl ? bannerUrl.trim() : null;
        }
      }

      // Tự động ghép nối địa chỉ đầy đủ nếu có bất kỳ trường địa chỉ nào thay đổi
      if (city !== undefined || ward !== undefined || addressDetail !== undefined) {
        const finalDetail = addressDetail !== undefined ? (addressDetail ? addressDetail.trim() : '') : (user.addressDetail || '');
        const finalWard = ward !== undefined ? (ward ? ward.trim() : '') : (user.ward || '');
        const finalCity = city !== undefined ? (city ? city.trim() : '') : (user.city || '');
        updateData.address = [finalDetail, finalWard, finalCity].filter(Boolean).join(', ') || null;
      }

      // Xử lý cập nhật Email
      if (email && email.toLowerCase().trim() !== user.email) {
        const cleanEmail = email.toLowerCase().trim();
        if (!validateEmailFormat(cleanEmail)) {
          return res.status(400).json({
            success: false,
            message: 'Định dạng Email mới không hợp lệ.',
          });
        }

        const emailInUse = await userService.findByEmail(cleanEmail);
        if (emailInUse) {
          return res.status(400).json({
            success: false,
            message: 'Email mới này đã được sử dụng bởi một tài khoản khác.',
          });
        }
        updateData.email = cleanEmail;
      }

      // So sánh sự thay đổi của departmentId
      const oldDeptId = user.departmentId ? user.departmentId.toString() : null;
      const newDeptId = updateData.departmentId !== undefined
        ? (updateData.departmentId ? updateData.departmentId.toString() : null)
        : oldDeptId;

      const updatedUser = await userService.update(id, updateData);

      // Ghi lịch sử thao tác
      const auditLogService = require('../services/auditLog.service');
      
      // 1. Ghi log cập nhật thông tin user chung
      auditLogService.log(
        req.user.sub,
        'user.update',
        { type: 'user', id: updatedUser._id.toString(), name: updatedUser.fullName },
        { updatedFields: Object.keys(updateData) }
      );

      // 2. Ghi log điều động nhân sự phòng ban
      if (oldDeptId !== newDeptId) {
        const departmentService = require('../services/department.service');
        
        // Log gỡ khỏi phòng ban cũ
        if (oldDeptId) {
          departmentService.findById(oldDeptId).then((oldDept) => {
            if (oldDept) {
              auditLogService.log(
                req.user.sub,
                'department.remove_user',
                { type: 'department', id: oldDept._id.toString(), name: oldDept.name },
                { userId: updatedUser._id.toString(), userName: updatedUser.fullName, userEmail: updatedUser.email }
              );
            }
          }).catch((err) => console.error('Failed to log department.remove_user:', err));
        }

        // Log thêm vào phòng ban mới
        if (newDeptId) {
          departmentService.findById(newDeptId).then((newDept) => {
            if (newDept) {
              auditLogService.log(
                req.user.sub,
                'department.assign_user',
                { type: 'department', id: newDept._id.toString(), name: newDept.name },
                { userId: updatedUser._id.toString(), userName: updatedUser.fullName, userEmail: updatedUser.email }
              );
            }
          }).catch((err) => console.error('Failed to log department.assign_user:', err));
        }
      }

      // Đếm số lượng deal thực tế từ lead
      const Lead = require('../models/Lead');
      const dealCount = await Lead.countDocuments({ collaboratorId: id, status: 'xu_ly_ho_so', deletedAt: null });
      updatedUser.dealCount = dealCount;

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin người dùng thành công.',
        data: toCleanUserResponse(updatedUser),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật thông tin người dùng.',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật trạng thái người dùng (Khóa/Mở khóa)
   */
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Kiểm tra định dạng ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ.',
        });
      }

      if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái status không hợp lệ. Chỉ chấp nhận: active, inactive, suspended.',
        });
      }

      // Kiểm tra user có tồn tại không
      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa khỏi hệ thống.',
        });
      }

      const updatedUser = await userService.update(id, { status });

      // Ghi lịch sử đổi trạng thái hoạt động user
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'user.update',
        { type: 'user', id: updatedUser._id.toString(), name: updatedUser.fullName },
        { status }
      );

      return res.status(200).json({
        success: true,
        message: status === 'active' ? 'Mở khóa tài khoản thành công.' : 'Khóa tài khoản thành công.',
        data: updatedUser,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái người dùng.',
        error: error.message,
      });
    }
  }

  /**
   * Xóa mềm tài khoản người dùng (Soft Delete - ẩn khỏi danh sách)
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra định dạng ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ.',
        });
      }

      const user = await userService.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa trước đó.',
        });
      }

      // Thực thi xóa mềm
      await userService.softDelete(id);

      // Ghi lịch sử xóa mềm user
      const auditLogService = require('../services/auditLog.service');
      auditLogService.log(
        req.user.sub,
        'user.update',
        { type: 'user', id: user._id.toString(), name: user.fullName },
        { deleted: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Xóa tài khoản người dùng thành công (ẩn danh sách).',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa người dùng.',
        error: error.message,
      });
    }
  }
}

module.exports = new UserController();
