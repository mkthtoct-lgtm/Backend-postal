const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    program: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    majors: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    admissionSystem: {
      type: String,
      default: '',
      trim: true,
    },
    deadlineRegister: {
      type: String,
      default: '',
      trim: true,
    },
    deadlineDocument: {
      type: String,
      default: '',
      trim: true,
    },
    requirements: {
      type: String,
      default: '',
      trim: true,
    },
    tuitionLanguage: {
      type: String,
      default: '',
      trim: true,
    },
    tuitionMajor: {
      type: String,
      default: '',
      trim: true,
    },
    dormitory: {
      type: String,
      default: '',
      trim: true,
    },
    scholarship: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    // Store any extra columns from the Sheet that don't map to known fields
    extraFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolSource',
      default: null,
    },
    stt: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'schools',
    timestamps: true,
  }
);

// Index for fast filtering
schoolSchema.index({ country: 1, program: 1 });
schoolSchema.index({ sourceId: 1 });

module.exports = mongoose.model('School', schoolSchema);
