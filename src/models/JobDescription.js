const mongoose = require('mongoose');

const jobDescriptionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      type: String,
      default: '',
    },
    benefits: {
      type: String,
      default: '',
    },
    salaryRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: 'VND' },
    },
    workingType: {
      type: String,
      enum: ['full-time', 'part-time', 'remote', 'hybrid', 'freelance'],
      default: 'full-time',
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('JobDescription', jobDescriptionSchema, 'job_descriptions');
