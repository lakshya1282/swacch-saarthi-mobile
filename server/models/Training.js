const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moduleId: {
    type: Number,
    required: true
  },
  moduleName: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 1
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
trainingSchema.index({ userId: 1, moduleId: 1 });
trainingSchema.index({ userId: 1, completed: 1 });

module.exports = mongoose.model('Training', trainingSchema);
