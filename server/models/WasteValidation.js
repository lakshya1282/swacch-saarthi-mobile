const mongoose = require('mongoose');

const wasteValidationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imagePath: {
    type: String,
    required: true
  },
  result: {
    isCorrect: {
      type: Boolean,
      required: true
    },
    wasteType: {
      type: String,
      enum: ['Dry Waste', 'Wet Waste', 'Hazardous Waste'],
      default: null
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    detectedItems: [String],
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    message: String,
    tips: [String],
    warning: String,
    recommendedBin: String,
    issues: [{
      item: String,
      currentBin: String,
      correctBin: String,
      reason: String
    }]
  },
  feedback: {
    userRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    wasHelpful: {
      type: Boolean,
      default: null
    },
    comments: {
      type: String,
      maxlength: 500,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
wasteValidationSchema.index({ userId: 1, createdAt: -1 });
wasteValidationSchema.index({ 'result.isCorrect': 1 });
wasteValidationSchema.index({ 'result.wasteType': 1 });

module.exports = mongoose.model('WasteValidation', wasteValidationSchema);
