const mongoose = require('mongoose');

const surveyResponseSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Survey',
      default: null,
    },
    surveyTitle: {
      type: String,
      default: '',
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    ctvCode: {
      type: String,
      default: '',
      trim: true,
    },
    collaboratorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    collaboratorName: { type: String, default: '', trim: true },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sheetSynced: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'survey_responses',
    timestamps: true,
  }
);

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);
