const mongoose = require('mongoose');

const newsPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['news', 'event'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '/assets/images/banner-second.jpg',
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'news_posts', // Chỉ định rõ bảng có sẵn trong Database
    timestamps: true, // Tự động quản lý createdAt và updatedAt
  }
);

module.exports = mongoose.model('NewsPost', newsPostSchema);
