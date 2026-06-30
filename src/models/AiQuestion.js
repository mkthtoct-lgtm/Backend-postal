const mongoose = require('mongoose');

const aiQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    askedBy: {
      type: String,
      default: 'Anonymous',
      trim: true,
    },
    askedByEmail: {
      type: String,
      default: '',
      trim: true,
    },
    topic: {
      type: String,
      default: 'General',
      trim: true,
    },
    source: {
      type: String,
      default: 'Chatbot',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'answered'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    suggestedDocuments: {
      type: [
        {
          id: { type: String, trim: true },
          title: { type: String, trim: true },
        },
      ],
      default: [],
    },
    answer: {
      type: String,
      default: '',
      trim: true,
    },
    internalNote: {
      type: String,
      default: '',
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    linkedDocumentIds: {
      type: [String],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'ai_questions',
    timestamps: true,
  }
);

aiQuestionSchema.index({ status: 1 });
aiQuestionSchema.index({ priority: 1 });

module.exports = mongoose.model('AiQuestion', aiQuestionSchema);
