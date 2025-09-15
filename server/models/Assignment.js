const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  // Assignment identification
  assignmentId: {
    type: String,
    required: [true, 'Assignment ID is required'],
    unique: true,
    uppercase: true
  },
  
  // Core assignment data
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: [true, 'Worker ID is required'],
    index: true
  },
  pickupRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupRequest',
    required: [true, 'Pickup request ID is required'],
    index: true
  },
  
  // Assignment status
  status: {
    type: String,
    enum: {
      values: ['PENDING', 'ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
      message: 'Status must be one of: PENDING, ACCEPTED, DECLINED, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED'
    },
    default: 'PENDING',
    required: true,
    index: true
  },
  
  // Assignment type and priority
  assignmentType: {
    type: String,
    enum: ['auto', 'manual', 'emergency', 'rescheduled'],
    default: 'auto',
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    min: [1, 'Priority must be at least 1'],
    max: [10, 'Priority cannot exceed 10'],
    index: true
  },
  
  // Timing information
  timestamps: {
    assigned: {
      type: Date,
      default: Date.now,
      index: true
    },
    accepted: Date,
    declined: Date,
    started: Date,
    completed: Date,
    cancelled: Date,
    expired: Date
  },
  
  // Worker response time tracking
  responseWindow: {
    expiresAt: {
      type: Date,
      required: true,
      index: true // For TTL-like queries
    },
    responseTimeMinutes: {
      type: Number,
      default: 15, // Default 15 minutes to respond
      min: [1, 'Response time must be at least 1 minute'],
      max: [120, 'Response time cannot exceed 120 minutes']
    },
    remindersSent: {
      type: Number,
      default: 0,
      min: [0, 'Reminders sent cannot be negative']
    },
    lastReminderAt: Date
  },
  
  // Route and logistics
  logistics: {
    estimatedDistance: {
      type: Number,
      min: [0, 'Distance cannot be negative'] // in kilometers
    },
    estimatedTravelTime: {
      type: Number,
      min: [0, 'Travel time cannot be negative'] // in minutes
    },
    actualDistance: {
      type: Number,
      min: [0, 'Distance cannot be negative'] // in kilometers
    },
    actualTravelTime: {
      type: Number,
      min: [0, 'Travel time cannot be negative'] // in minutes
    },
    routeOptimized: {
      type: Boolean,
      default: false
    },
    batchAssignment: {
      type: Boolean,
      default: false
    },
    batchId: String,
    sequenceNumber: {
      type: Number,
      min: [1, 'Sequence number must be at least 1']
    }
  },
  
  // Worker location tracking
  workerLocation: {
    assignmentStart: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number], // [longitude, latitude]
      timestamp: Date
    },
    pickupLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number], // [longitude, latitude]
      timestamp: Date
    },
    completionLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number], // [longitude, latitude]
      timestamp: Date
    }
  },
  
  // Assignment criteria and matching
  assignmentCriteria: {
    preferredWorkers: [{
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker'
      },
      score: {
        type: Number,
        min: [0, 'Score cannot be negative'],
        max: [100, 'Score cannot exceed 100']
      },
      reason: String
    }],
    excludedWorkers: [{
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker'
      },
      reason: String,
      excludedUntil: Date
    }],
    assignmentScore: {
      type: Number,
      min: [0, 'Assignment score cannot be negative'],
      max: [100, 'Assignment score cannot exceed 100']
    },
    matchingFactors: {
      proximityScore: Number,
      capacityScore: Number,
      experienceScore: Number,
      availabilityScore: Number,
      performanceScore: Number
    }
  },
  
  // Communication and notifications
  communications: {
    notificationsSent: [{
      type: {
        type: String,
        enum: ['push', 'sms', 'email', 'call'],
        required: true
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['sent', 'delivered', 'failed', 'read'],
        default: 'sent'
      },
      message: String,
      response: String
    }],
    workerNotes: String,
    systemNotes: String,
    customerFeedback: String
  },
  
  // Performance tracking
  performance: {
    responseTime: Number, // Minutes from assignment to acceptance
    completionTime: Number, // Minutes from acceptance to completion
    efficiencyScore: {
      type: Number,
      min: [0, 'Efficiency score cannot be negative'],
      max: [100, 'Efficiency score cannot exceed 100']
    },
    qualityScore: {
      type: Number,
      min: [0, 'Quality score cannot be negative'],
      max: [100, 'Quality score cannot exceed 100']
    },
    customerSatisfactionRating: {
      type: Number,
      min: [1, 'Customer satisfaction rating must be at least 1'],
      max: [5, 'Customer satisfaction rating cannot exceed 5']
    },
    issues: [{
      type: {
        type: String,
        enum: ['delay', 'quality', 'communication', 'safety', 'equipment', 'other'],
        required: true
      },
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      },
      reportedAt: {
        type: Date,
        default: Date.now
      },
      resolvedAt: Date,
      resolution: String
    }]
  },
  
  // Retry and fallback logic
  retryAttempts: {
    count: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative']
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: [1, 'Max attempts must be at least 1'],
      max: [10, 'Max attempts cannot exceed 10']
    },
    lastAttemptAt: Date,
    nextAttemptAt: Date,
    strategy: {
      type: String,
      enum: ['immediate', 'delayed', 'escalated', 'manual'],
      default: 'delayed'
    }
  },
  
  // Emergency and escalation
  escalation: {
    isEscalated: {
      type: Boolean,
      default: false,
      index: true
    },
    escalatedAt: Date,
    escalationLevel: {
      type: Number,
      min: [1, 'Escalation level must be at least 1'],
      max: [5, 'Escalation level cannot exceed 5']
    },
    escalationReason: String,
    manualAssignment: {
      type: Boolean,
      default: false
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'escalation.assignedByModel'
    },
    assignedByModel: {
      type: String,
      enum: ['Worker', 'User', 'System']
    }
  },
  
  // System metadata
  metadata: {
    version: {
      type: Number,
      default: 1
    },
    algorithm: {
      type: String,
      default: 'proximity_based'
    },
    confidence: {
      type: Number,
      min: [0, 'Confidence cannot be negative'],
      max: [1, 'Confidence cannot exceed 1']
    },
    alternativeAssignments: [{
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker'
      },
      score: Number,
      reason: String
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
assignmentSchema.index({ workerId: 1, status: 1, createdAt: -1 }); // Worker's assignments
assignmentSchema.index({ pickupRequestId: 1 }, { unique: true }); // One assignment per pickup request
assignmentSchema.index({ status: 1, priority: -1, 'timestamps.assigned': 1 }); // Priority queue
assignmentSchema.index({ 'responseWindow.expiresAt': 1, status: 1 }); // Expiration queries
assignmentSchema.index({ assignmentType: 1, status: 1 }); // Type-based queries
assignmentSchema.index({ 'escalation.isEscalated': 1, 'escalation.escalationLevel': 1 }); // Escalation queries
assignmentSchema.index({ 'logistics.batchId': 1 }); // Batch assignments
assignmentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 days

// Virtual for total duration
assignmentSchema.virtual('totalDuration').get(function() {
  const start = this.timestamps.assigned;
  const end = this.timestamps.completed || this.timestamps.cancelled || new Date();
  return Math.round((end - start) / (1000 * 60)); // minutes
});

// Virtual for response time
assignmentSchema.virtual('responseTime').get(function() {
  if (this.timestamps.accepted && this.timestamps.assigned) {
    return Math.round((this.timestamps.accepted - this.timestamps.assigned) / (1000 * 60)); // minutes
  }
  return null;
});

// Virtual for assignment age
assignmentSchema.virtual('ageMinutes').get(function() {
  return Math.round((new Date() - this.timestamps.assigned) / (1000 * 60));
});

// Virtual for expiration status
assignmentSchema.virtual('isExpired').get(function() {
  return new Date() > this.responseWindow.expiresAt && this.status === 'PENDING';
});

// Virtual for progress percentage
assignmentSchema.virtual('progressPercentage').get(function() {
  const progressMap = {
    'PENDING': 0,
    'ACCEPTED': 25,
    'IN_PROGRESS': 50,
    'COMPLETED': 100,
    'DECLINED': 0,
    'CANCELLED': 0,
    'EXPIRED': 0
  };
  return progressMap[this.status] || 0;
});

// Pre-save middleware
assignmentSchema.pre('save', function(next) {
  // Generate assignment ID if not provided
  if (!this.assignmentId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase();
    this.assignmentId = `ASN${timestamp}${random}`;
  }
  
  // Set expiration time if not provided
  if (!this.responseWindow.expiresAt) {
    this.responseWindow.expiresAt = new Date(
      this.timestamps.assigned.getTime() + (this.responseWindow.responseTimeMinutes * 60 * 1000)
    );
  }
  
  // Update timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'ACCEPTED':
        this.timestamps.accepted = now;
        break;
      case 'DECLINED':
        this.timestamps.declined = now;
        break;
      case 'IN_PROGRESS':
        this.timestamps.started = now;
        break;
      case 'COMPLETED':
        this.timestamps.completed = now;
        break;
      case 'CANCELLED':
        this.timestamps.cancelled = now;
        break;
      case 'EXPIRED':
        this.timestamps.expired = now;
        break;
    }
  }
  
  // Calculate performance metrics
  if (this.timestamps.accepted && this.timestamps.assigned) {
    this.performance.responseTime = Math.round(
      (this.timestamps.accepted - this.timestamps.assigned) / (1000 * 60)
    );
  }
  
  if (this.timestamps.completed && this.timestamps.accepted) {
    this.performance.completionTime = Math.round(
      (this.timestamps.completed - this.timestamps.accepted) / (1000 * 60)
    );
  }
  
  next();
});

// Instance methods
assignmentSchema.methods.accept = function(workerLocation = null, notes = '') {
  if (this.status !== 'PENDING') {
    throw new Error(`Cannot accept assignment with status: ${this.status}`);
  }
  
  if (this.isExpired) {
    throw new Error('Assignment has expired');
  }
  
  this.status = 'ACCEPTED';
  
  if (workerLocation) {
    this.workerLocation.assignmentStart = {
      type: 'Point',
      coordinates: workerLocation,
      timestamp: new Date()
    };
  }
  
  if (notes) {
    this.communications.workerNotes = notes;
  }
  
  return this.save();
};

assignmentSchema.methods.decline = function(reason = '', suggestAlternative = null) {
  if (this.status !== 'PENDING') {
    throw new Error(`Cannot decline assignment with status: ${this.status}`);
  }
  
  this.status = 'DECLINED';
  this.communications.workerNotes = reason;
  
  if (suggestAlternative) {
    this.metadata.alternativeAssignments.push(suggestAlternative);
  }
  
  return this.save();
};

assignmentSchema.methods.start = function(location = null) {
  if (this.status !== 'ACCEPTED') {
    throw new Error(`Cannot start assignment with status: ${this.status}`);
  }
  
  this.status = 'IN_PROGRESS';
  
  if (location) {
    this.workerLocation.pickupLocation = {
      type: 'Point',
      coordinates: location,
      timestamp: new Date()
    };
  }
  
  return this.save();
};

assignmentSchema.methods.complete = function(completionData = {}) {
  if (this.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot complete assignment with status: ${this.status}`);
  }
  
  this.status = 'COMPLETED';
  
  if (completionData.location) {
    this.workerLocation.completionLocation = {
      type: 'Point',
      coordinates: completionData.location,
      timestamp: new Date()
    };
  }
  
  if (completionData.actualDistance) {
    this.logistics.actualDistance = completionData.actualDistance;
  }
  
  if (completionData.actualTravelTime) {
    this.logistics.actualTravelTime = completionData.actualTravelTime;
  }
  
  if (completionData.qualityScore) {
    this.performance.qualityScore = completionData.qualityScore;
  }
  
  if (completionData.notes) {
    this.communications.workerNotes = (this.communications.workerNotes || '') + 
      `\nCompletion: ${completionData.notes}`;
  }
  
  return this.save();
};

assignmentSchema.methods.cancel = function(reason, cancelledBy = 'system') {
  if (['COMPLETED', 'CANCELLED'].includes(this.status)) {
    throw new Error(`Cannot cancel assignment with status: ${this.status}`);
  }
  
  this.status = 'CANCELLED';
  this.communications.systemNotes = (this.communications.systemNotes || '') + 
    `\nCancelled by ${cancelledBy}: ${reason}`;
  
  return this.save();
};

assignmentSchema.methods.escalate = function(level = 1, reason = '') {
  this.escalation.isEscalated = true;
  this.escalation.escalatedAt = new Date();
  this.escalation.escalationLevel = level;
  this.escalation.escalationReason = reason;
  
  // Adjust priority based on escalation
  this.priority = Math.min(10, this.priority + level);
  
  return this.save();
};

assignmentSchema.methods.sendReminder = function() {
  this.responseWindow.remindersSent += 1;
  this.responseWindow.lastReminderAt = new Date();
  
  // Add communication record
  this.communications.notificationsSent.push({
    type: 'push',
    message: 'Assignment reminder',
    sentAt: new Date()
  });
  
  return this.save();
};

// Static methods
assignmentSchema.statics.findPendingAssignments = function(workerId = null, limit = 50) {
  const query = {
    status: 'PENDING',
    'responseWindow.expiresAt': { $gt: new Date() }
  };
  
  if (workerId) {
    query.workerId = workerId;
  }
  
  return this.find(query)
    .populate('workerId', 'firstName lastName phone status')
    .populate('pickupRequestId')
    .sort({ priority: -1, 'timestamps.assigned': 1 })
    .limit(limit);
};

assignmentSchema.statics.findExpiredAssignments = function() {
  return this.find({
    status: 'PENDING',
    'responseWindow.expiresAt': { $lte: new Date() }
  }).populate('workerId', 'firstName lastName phone')
    .populate('pickupRequestId');
};

assignmentSchema.statics.findWorkerAssignments = function(workerId, status = null, limit = 50) {
  const query = { workerId };
  
  if (status) {
    if (Array.isArray(status)) {
      query.status = { $in: status };
    } else {
      query.status = status;
    }
  }
  
  return this.find(query)
    .populate('pickupRequestId')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

assignmentSchema.statics.getAssignmentStats = function(workerId = null, dateRange = null) {
  const matchStage = {};
  
  if (workerId) {
    matchStage.workerId = mongoose.Types.ObjectId(workerId);
  }
  
  if (dateRange && dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: workerId ? '$workerId' : null,
        totalAssignments: { $sum: 1 },
        acceptedAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'ACCEPTED'] }, 1, 0] }
        },
        completedAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
        },
        declinedAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'DECLINED'] }, 1, 0] }
        },
        expiredAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] }
        },
        averageResponseTime: { $avg: '$performance.responseTime' },
        averageCompletionTime: { $avg: '$performance.completionTime' },
        averageCustomerRating: { $avg: '$performance.customerSatisfactionRating' },
        totalDistance: { $sum: '$logistics.actualDistance' }
      }
    },
    {
      $project: {
        totalAssignments: 1,
        acceptedAssignments: 1,
        completedAssignments: 1,
        declinedAssignments: 1,
        expiredAssignments: 1,
        acceptanceRate: {
          $round: [
            { $divide: ['$acceptedAssignments', '$totalAssignments'] },
            4
          ]
        },
        completionRate: {
          $round: [
            { $divide: ['$completedAssignments', '$acceptedAssignments'] },
            4
          ]
        },
        averageResponseTime: { $round: ['$averageResponseTime', 2] },
        averageCompletionTime: { $round: ['$averageCompletionTime', 2] },
        averageCustomerRating: { $round: ['$averageCustomerRating', 2] },
        totalDistance: { $round: ['$totalDistance', 2] }
      }
    }
  ]);
};

assignmentSchema.statics.createBatchAssignment = function(assignments) {
  const batchId = `BATCH_${Date.now()}`;
  
  return assignments.map((assignment, index) => ({
    ...assignment,
    'logistics.batchAssignment': true,
    'logistics.batchId': batchId,
    'logistics.sequenceNumber': index + 1
  }));
};

module.exports = mongoose.model('Assignment', assignmentSchema);