const mongoose = require('mongoose');

const schoolSourceSchema = new mongoose.Schema(
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
    spreadsheetId: {
      type: String,
      required: true,
      trim: true,
    },
    gid: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastSyncCount: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'school_sources',
    timestamps: true,
  }
);

module.exports = mongoose.model('SchoolSource', schoolSourceSchema);
