const mongoose = require('mongoose');

const courseLeadSpamSchema = new mongoose.Schema({
  normalizedPhone: {
    type: String,
    required: true,
    unique: true
  },
  attempts: {
    type: Number,
    default: 1
  },
  firstAttemptAt: {
    type: Date,
    default: Date.now
  },
  lockedUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CourseLeadSpam', courseLeadSpamSchema);
