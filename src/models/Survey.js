const mongoose = require('mongoose');

const surveyQuestionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  type: { type: String, enum: ['text', 'textarea', 'select', 'radio', 'checkbox'], default: 'text' },
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] },
}, { _id: true });

const surveySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    kind: { type: String, enum: ['internal', 'external'], default: 'external' },
    baseUrl: {
      type: String,
      default: '',
      trim: true,
    },
    description: { type: String, default: '', trim: true },
    questions: { type: [surveyQuestionSchema], default: [] },
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
