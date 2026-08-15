const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['visa_result', 'video_library', 'document'],
    },
    country_tag: {
      type: String,
      default: 'All',
      trim: true,
    },
    thumbnail_url: {
      type: String,
      default: '',
      trim: true,
    },
    customer_name: {
      type: String,
      default: '',
      trim: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    customer_country: {
      type: String,
      default: '',
      trim: true,
    },
    visa_country: {
      type: String,
      default: '',
      trim: true,
    },
    visa_result_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', ''],
      default: '',
      trim: true,
    },
    visa_result_date: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    approval_date: {
      type: Date,
      default: Date.now,
    },
    status_badge: {
      type: String,
      default: '',
      trim: true,
    },
    imageFileId: {
      type: String,
      default: '',
      trim: true,
    },
    imageMimeType: {
      type: String,
      default: '',
      trim: true,
    },
    // ---- MEDIA REPOSITORY V3 FIELDS ----
    storageProvider: {
      type: String,
      enum: ['GOOGLE_DRIVE', 'YOUTUBE'],
      default: 'GOOGLE_DRIVE',
    },
    storageFileId: {
      type: String,
      default: '',
      trim: true,
    },
    youtubeVideoId: {
      type: String,
      default: '',
      trim: true,
    },
    privacyStatus: {
      type: String,
      enum: ['private', 'unlisted', 'public'],
      default: 'unlisted',
    },
    fileName: {
      type: String,
      default: '',
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: '',
      trim: true,
    },
    uploadStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed',
    }
  },
  {
    collection: 'medias',
    timestamps: true,
  }
);

module.exports = mongoose.model('Media', mediaSchema);
