const mongoose = require('mongoose');

const checklistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'Chưa phân nhóm',
      trim: true,
    },
    frequency: {
      type: String,
      default: 'Không lặp',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
    },
    progress: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    ownerName: {
      type: String,
      default: '',
      trim: true,
    },
    assignedUserIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    allowedRoles: {
      type: [String],
      default: ['all'],
    },
    editableForAssignee: {
      type: Boolean,
      default: true,
    },
    sopId: {
      type: String,
      default: '',
      trim: true,
    },
    sopTitle: {
      type: String,
      default: '',
      trim: true,
    },
    tasks: {
      type: [
        {
          id: { type: String, trim: true },
          name: { type: String, required: true, trim: true },
          done: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'checklists',
    timestamps: true,
  }
);

checklistSchema.index({ status: 1 });
checklistSchema.index({ category: 1 });
checklistSchema.index({ assignedUserIds: 1 });

module.exports = mongoose.model('Checklist', checklistSchema);
