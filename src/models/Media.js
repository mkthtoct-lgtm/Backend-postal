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
    approval_date: {
      type: Date,
      default: Date.now,
    },
    status_badge: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    collection: 'medias',
    timestamps: true,
  }
);

module.exports = mongoose.model('Media', mediaSchema);
