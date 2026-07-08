const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: null,
    },
    socialLink: {
      type: String,
      default: null,
    },
    zaloLink: {
      type: String,
      default: null,
    },
    instagramLink: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    ward: {
      type: String,
      default: null,
    },
    addressDetail: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    referral_code_user: {
      type: String,
      default: null,
    },
    referral_code: {
      type: String,
      unique: true,
      sparse: true,
    },
    referred_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      // Mặc định tài khoản tự đăng ký là Cộng tác viên.
      default: () => new mongoose.Types.ObjectId('69fc5af682ef85451120772f'),
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'active',
    },
    rank: {
      type: String,
      enum: ['Loyal', 'Bronze', 'Silver', 'Gold', 'Daimion', 'Master'],
      default: 'Bronze',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    bannerUrl: {
      type: String,
      default: null,
    },
    hasSeenAdminTutorial: {
      type: Boolean,
      default: false,
    },
    seenTours: {
      type: [String],
      default: [],
    },
    grantedPermissions: {
      type: [String],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Tự động quản lý createdAt và updatedAt
  }
);

module.exports = mongoose.model('User', userSchema);
