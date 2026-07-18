const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    baseUrl: {
      type: String,
      required: true,
      trim: true,
    },
    googleSheetWebhookUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'surveys',
    timestamps: true,
  }
);

module.exports = mongoose.model('Survey', surveySchema);
