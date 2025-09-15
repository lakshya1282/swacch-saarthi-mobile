const mongoose = require('mongoose');

const workerPerformanceSchema = new mongoose.Schema({
  // Worker Information
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Office',
    required: true
  },
  
  // Daily Performance Data
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Collection Metrics
  wasteCollection: {
    totalWeight: {
      type: Number,
      required: true,
      min: 0,
      default: 0 // in kg
    },
    wasteTypes: {
      dryWaste: {
        type: Number,
        default: 0 // in kg
      },
      wetWaste: {
        type: Number,
        default: 0 // in kg
      },
      hazardousWaste: {
        type: Number,
        default: 0 // in kg
      },
      recyclableWaste: {
        type: Number,
        default: 0 // in kg
      }
    },
    pickupsCompleted: {
      type: Number,
      default: 0
    },
    pickupDetails: [{
      pickupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pickup'
      },
      weight: Number,
      wasteType: String,
      completedAt: Date,
      location: {
        latitude: Number,
        longitude: Number
      },
      verified: {
        type: Boolean,
        default: false
      }
    }]
  },
  
  // Incentive Calculation (₹10/kg above 15kg threshold)
  incentive: {
    thresholdWeight: {
      type: Number,
      default: 15 // kg
    },
    incentiveRate: {
      type: Number,
      default: 10 // ₹ per kg
    },
    qualifyingWeight: {
      type: Number,
      default: 0 // weight above threshold
    },
    earnedAmount: {
      type: Number,
      default: 0 // ₹
    },
    paid: {
      type: Boolean,
      default: false
    },
    paymentDate: Date,
    paymentReference: String
  },
  
  // Time Tracking
  workHours: {
    startTime: Date,
    endTime: Date,
    totalHours: {
      type: Number,
      default: 0
    },
    breakTime: {
      type: Number,
      default: 0 // in minutes
    },
    overtimeHours: {
      type: Number,
      default: 0
    }
  },
  
  // Location Tracking
  locationData: {
    startLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    endLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    totalDistance: {
      type: Number,
      default: 0 // in km
    },
    route: [{
      timestamp: Date,
      latitude: Number,
      longitude: Number
    }]
  },
  
  // Quality Metrics
  qualityScore: {
    wasteSegregationAccuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    timelinessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 90
    },
    customerSatisfaction: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    overallRating: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    }
  },
  
  // Issues and Feedback
  issues: [{
    type: {
      type: String,
      enum: ['late_start', 'missed_pickup', 'customer_complaint', 'equipment_failure', 'route_deviation']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: Date,
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open'
    }
  }],
  
  // Daily Summary
  summary: {
    efficiency: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    productivity: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    notes: String,
    supervisorComments: String,
    weatherConditions: String,
    vehicleCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'pending_review', 'approved'],
    default: 'active'
  },
  
  // Metadata
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfficeOperator'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfficeOperator'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate incentives
workerPerformanceSchema.pre('save', function(next) {
  // Calculate incentive based on weight threshold
  if (this.wasteCollection.totalWeight > this.incentive.thresholdWeight) {
    this.incentive.qualifyingWeight = this.wasteCollection.totalWeight - this.incentive.thresholdWeight;
    this.incentive.earnedAmount = this.incentive.qualifyingWeight * this.incentive.incentiveRate;
  } else {
    this.incentive.qualifyingWeight = 0;
    this.incentive.earnedAmount = 0;
  }
  
  // Calculate total work hours
  if (this.workHours.startTime && this.workHours.endTime) {
    const timeDiff = this.workHours.endTime - this.workHours.startTime;
    this.workHours.totalHours = Math.round((timeDiff / (1000 * 60 * 60)) * 100) / 100;
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

// Methods for performance calculations
workerPerformanceSchema.methods.calculateDailyEfficiency = function() {
  const baseScore = 70;
  let score = baseScore;
  
  // Weight performance (30 points max)
  if (this.wasteCollection.totalWeight >= 20) score += 30;
  else if (this.wasteCollection.totalWeight >= 15) score += 20;
  else if (this.wasteCollection.totalWeight >= 10) score += 10;
  
  // Time performance (bonus/penalty)
  if (this.workHours.totalHours >= 8) score += 10;
  if (this.workHours.totalHours < 6) score -= 15;
  
  // Quality score impact
  score += (this.qualityScore.overallRating - 85) * 0.2;
  
  return Math.min(100, Math.max(0, score));
};

workerPerformanceSchema.methods.getIncentiveDetails = function() {
  return {
    totalWeight: this.wasteCollection.totalWeight,
    threshold: this.incentive.thresholdWeight,
    qualifyingWeight: this.incentive.qualifyingWeight,
    rate: this.incentive.incentiveRate,
    earnedAmount: this.incentive.earnedAmount,
    qualifiesForIncentive: this.wasteCollection.totalWeight > this.incentive.thresholdWeight,
    paymentStatus: this.incentive.paid ? 'Paid' : 'Pending'
  };
};

// Static methods for aggregation
workerPerformanceSchema.statics.getWorkerMonthlyStats = async function(workerId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const stats = await this.aggregate([
    {
      $match: {
        workerId: mongoose.Types.ObjectId(workerId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$workerId',
        totalDays: { $sum: 1 },
        totalWeight: { $sum: '$wasteCollection.totalWeight' },
        totalIncentive: { $sum: '$incentive.earnedAmount' },
        avgEfficiency: { $avg: '$summary.efficiency' },
        totalPickups: { $sum: '$wasteCollection.pickupsCompleted' },
        totalHours: { $sum: '$workHours.totalHours' }
      }
    }
  ]);
  
  return stats[0] || null;
};

workerPerformanceSchema.statics.getOfficeMonthlyStats = async function(officeId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const stats = await this.aggregate([
    {
      $match: {
        officeId: mongoose.Types.ObjectId(officeId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$officeId',
        totalWorkers: { $addToSet: '$workerId' },
        totalWeight: { $sum: '$wasteCollection.totalWeight' },
        totalIncentives: { $sum: '$incentive.earnedAmount' },
        totalPickups: { $sum: '$wasteCollection.pickupsCompleted' },
        avgEfficiency: { $avg: '$summary.efficiency' }
      }
    },
    {
      $project: {
        totalWorkers: { $size: '$totalWorkers' },
        totalWeight: 1,
        totalIncentives: 1,
        totalPickups: 1,
        avgEfficiency: 1
      }
    }
  ]);
  
  return stats[0] || null;
};

// Indexes for efficient queries
workerPerformanceSchema.index({ workerId: 1, date: -1 });
workerPerformanceSchema.index({ officeId: 1, date: -1 });
workerPerformanceSchema.index({ date: -1 });
workerPerformanceSchema.index({ 'incentive.paid': 1 });
workerPerformanceSchema.index({ status: 1 });

module.exports = mongoose.model('WorkerPerformance', workerPerformanceSchema);