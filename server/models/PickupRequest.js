const mongoose = require('mongoose');

const pickupRequestSchema = new mongoose.Schema({
  // Request identification
  requestId: {
    type: String,
    required: [true, 'Request ID is required'],
    unique: true,
    uppercase: true
  },
  
  // User and location details
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Citizen',
    required: [true, 'User ID is required'],
    index: true
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Zone ID is required'],
    index: true
  },
  timeSlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlot',
    required: [true, 'Time slot ID is required'],
    index: true
  },
  
  // Pickup location (GeoJSON Point)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Location coordinates are required'],
      validate: {
        validator: function(coordinates) {
          return coordinates.length === 2 && 
                 coordinates[0] >= -180 && coordinates[0] <= 180 && // longitude
                 coordinates[1] >= -90 && coordinates[1] <= 90;    // latitude
        },
        message: 'Coordinates must be [longitude, latitude] within valid ranges'
      }
    }
  },
  
  // Address details
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    area: String,
    landmark: String,
    instructions: {
      type: String,
      maxlength: [500, 'Instructions cannot exceed 500 characters']
    },
    floor: String,
    apartmentNumber: String
  },
  
  // Scheduling details
  preferredDate: {
    type: Date,
    required: [true, 'Preferred date is required'],
    index: true
  },
  actualScheduledDate: {
    type: Date,
    index: true
  },
  timeWindow: {
    startTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    endTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    }
  },
  
  // Waste details
  wasteDetails: {
    types: [{
      category: {
        type: String,
        enum: ['organic', 'recyclable', 'hazardous', 'electronic', 'mixed'],
        required: true
      },
      items: [String],
      estimatedKg: {
        type: Number,
        required: true,
        min: [0.1, 'Estimated weight must be at least 0.1 KG']
      }
    }],
    totalEstimatedKg: {
      type: Number,
      required: [true, 'Total estimated weight is required'],
      min: [0.1, 'Total estimated weight must be at least 0.1 KG']
    },
    actualKg: {
      type: Number,
      min: [0, 'Actual weight cannot be negative']
    },
    specialInstructions: {
      type: String,
      maxlength: [500, 'Special instructions cannot exceed 500 characters']
    },
    requiresSpecialHandling: {
      type: Boolean,
      default: false
    }
  },
  
  // Status tracking with proper workflow
  status: {
    type: String,
    enum: {
      values: ['SCHEDULED', 'ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      message: 'Status must be one of: SCHEDULED, ASSIGNED, IN_TRANSIT, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW'
    },
    default: 'SCHEDULED',
    required: true,
    index: true
  },
  
  // Assignment details
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    index: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    index: true
  },
  assignedAt: Date,
  
  // Timing information
  timestamps: {
    requested: {
      type: Date,
      default: Date.now
    },
    scheduled: Date,
    assigned: Date,
    workerEnRoute: Date,
    workerArrived: Date,
    pickupStarted: Date,
    completed: Date,
    cancelled: Date
  },
  
  // Priority and urgency
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  urgencyReason: {
    type: String,
    maxlength: [200, 'Urgency reason cannot exceed 200 characters']
  },
  
  // Payment and pricing
  pricing: {
    baseRate: {
      type: Number,
      default: 0,
      min: [0, 'Base rate cannot be negative']
    },
    additionalCharges: [{
      type: {
        type: String,
        enum: ['express', 'bulk', 'hazardous', 'special_handling', 'distance'],
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
      },
      description: String
    }],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online', 'wallet', 'card'],
      default: 'cash'
    }
  },
  
  // Verification and proof
  verification: {
    pickupCode: {
      type: String,
      required: true,
      uppercase: true,
      minlength: [4, 'Pickup code must be at least 4 characters'],
      maxlength: [10, 'Pickup code cannot exceed 10 characters']
    },
    qrCode: String,
    beforePhotos: [String], // URLs to images
    afterPhotos: [String], // URLs to images
    workerSignature: String,
    customerSignature: String,
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['qr_code', 'pickup_code', 'photo', 'signature', 'gps'],
      default: 'pickup_code'
    }
  },
  
  // Communication and updates
  communication: {
    notificationsSent: [{
      type: {
        type: String,
        enum: ['sms', 'email', 'push', 'call'],
        required: true
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['sent', 'delivered', 'failed'],
        default: 'sent'
      },
      message: String
    }],
    customerNotes: String,
    workerNotes: String,
    adminNotes: String
  },
  
  // Feedback and ratings
  feedback: {
    customerRating: {
      rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
      },
      comment: {
        type: String,
        maxlength: [500, 'Comment cannot exceed 500 characters']
      },
      ratedAt: Date
    },
    workerRating: {
      rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
      },
      comment: {
        type: String,
        maxlength: [500, 'Comment cannot exceed 500 characters']
      },
      ratedAt: Date
    }
  },
  
  // Cancellation details
  cancellation: {
    reason: {
      type: String,
      enum: ['customer_request', 'worker_unavailable', 'weather', 'emergency', 'technical_issue', 'other']
    },
    cancelledBy: {
      type: String,
      enum: ['customer', 'worker', 'system', 'admin']
    },
    notes: {
      type: String,
      maxlength: [500, 'Cancellation notes cannot exceed 500 characters']
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending'
    }
  },
  
  // Analytics and performance
  analytics: {
    responseTime: Number, // Time from request to assignment (minutes)
    completionTime: Number, // Time from assignment to completion (minutes)
    customerWaitTime: Number, // Time from scheduled to actual completion (minutes)
    distanceTraveled: Number, // Distance traveled by worker (km)
    fuelConsumption: Number, // Estimated fuel consumption (liters)
    carbonFootprint: Number // Estimated CO2 emissions (kg)
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
pickupRequestSchema.index({ zoneId: 1, preferredDate: 1, timeSlotId: 1, status: 1 }); // Main query index
pickupRequestSchema.index({ userId: 1, status: 1, createdAt: -1 }); // User's requests
pickupRequestSchema.index({ assignedTo: 1, status: 1, preferredDate: 1 }); // Worker assignments
pickupRequestSchema.index({ status: 1, priority: -1, createdAt: 1 }); // Status and priority
pickupRequestSchema.index({ location: '2dsphere' }); // Geospatial queries
pickupRequestSchema.index({ 'verification.pickupCode': 1 }); // Code verification
pickupRequestSchema.index({ requestId: 1 }, { unique: true }); // Request ID lookup
pickupRequestSchema.index({ preferredDate: 1, zoneId: 1 }); // Date-zone queries

// Virtual for formatted request ID
pickupRequestSchema.virtual('formattedRequestId').get(function() {
  return `WM-${this.requestId}`;
});

// Virtual for total duration
pickupRequestSchema.virtual('totalDuration').get(function() {
  if (this.timestamps.completed && this.timestamps.requested) {
    return Math.round((this.timestamps.completed - this.timestamps.requested) / (1000 * 60)); // minutes
  }
  return null;
});

// Virtual for status progress percentage
pickupRequestSchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    'SCHEDULED': 10,
    'ASSIGNED': 25,
    'IN_TRANSIT': 50,
    'ARRIVED': 70,
    'IN_PROGRESS': 85,
    'COMPLETED': 100,
    'CANCELLED': 0,
    'NO_SHOW': 0
  };
  return statusProgress[this.status] || 0;
});

// Virtual for estimated completion time
pickupRequestSchema.virtual('estimatedCompletion').get(function() {
  if (this.actualScheduledDate && this.timeWindow.endTime) {
    const [hours, minutes] = this.timeWindow.endTime.split(':').map(Number);
    const completion = new Date(this.actualScheduledDate);
    completion.setHours(hours, minutes, 0, 0);
    return completion;
  }
  return null;
});

// Virtual for delay status
pickupRequestSchema.virtual('isDelayed').get(function() {
  const now = new Date();
  const estimatedCompletion = this.estimatedCompletion;
  return estimatedCompletion && now > estimatedCompletion && !['COMPLETED', 'CANCELLED'].includes(this.status);
});

// Pre-save middleware
pickupRequestSchema.pre('save', function(next) {
  // Generate request ID if not provided
  if (!this.requestId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase();
    this.requestId = `${timestamp}${random}`;
  }
  
  // Generate pickup code if not provided
  if (!this.verification.pickupCode) {
    this.verification.pickupCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  // Update timestamp based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'SCHEDULED':
        this.timestamps.scheduled = now;
        break;
      case 'ASSIGNED':
        this.timestamps.assigned = now;
        break;
      case 'IN_TRANSIT':
        this.timestamps.workerEnRoute = now;
        break;
      case 'ARRIVED':
        this.timestamps.workerArrived = now;
        break;
      case 'IN_PROGRESS':
        this.timestamps.pickupStarted = now;
        break;
      case 'COMPLETED':
        this.timestamps.completed = now;
        break;
      case 'CANCELLED':
        this.timestamps.cancelled = now;
        break;
    }
  }
  
  // Calculate total amount
  let total = this.pricing.baseRate || 0;
  if (this.pricing.additionalCharges && this.pricing.additionalCharges.length > 0) {
    total += this.pricing.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
  }
  this.pricing.totalAmount = total;
  
  // Calculate analytics
  if (this.timestamps.assigned && this.timestamps.requested) {
    this.analytics.responseTime = Math.round((this.timestamps.assigned - this.timestamps.requested) / (1000 * 60));
  }
  
  if (this.timestamps.completed && this.timestamps.assigned) {
    this.analytics.completionTime = Math.round((this.timestamps.completed - this.timestamps.assigned) / (1000 * 60));
  }
  
  next();
});

// Instance methods
pickupRequestSchema.methods.updateStatus = function(newStatus, workerId = null, notes = '') {
  // Validate status transition
  const validTransitions = {
    'SCHEDULED': ['ASSIGNED', 'CANCELLED'],
    'ASSIGNED': ['IN_TRANSIT', 'CANCELLED', 'NO_SHOW'],
    'IN_TRANSIT': ['ARRIVED', 'CANCELLED'],
    'ARRIVED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
    'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [], // Terminal state
    'CANCELLED': [], // Terminal state
    'NO_SHOW': ['SCHEDULED'] // Can be rescheduled
  };
  
  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  if (newStatus === 'ASSIGNED' && workerId) {
    this.assignedTo = workerId;
    this.assignedAt = new Date();
  }
  
  if (notes) {
    if (workerId) {
      this.communication.workerNotes = (this.communication.workerNotes || '') + `\n${new Date().toISOString()}: ${notes}`;
    } else {
      this.communication.adminNotes = (this.communication.adminNotes || '') + `\n${new Date().toISOString()}: ${notes}`;
    }
  }
  
  return this.save();
};

pickupRequestSchema.methods.cancel = function(reason, cancelledBy, notes = '', refundAmount = 0) {
  this.status = 'CANCELLED';
  this.cancellation = {
    reason,
    cancelledBy,
    notes,
    refundAmount,
    refundStatus: refundAmount > 0 ? 'pending' : 'processed'
  };
  
  return this.save();
};

pickupRequestSchema.methods.complete = function(actualKg, workerNotes = '', photos = []) {
  this.status = 'COMPLETED';
  this.wasteDetails.actualKg = actualKg;
  this.verification.afterPhotos = photos;
  this.verification.verifiedAt = new Date();
  
  if (workerNotes) {
    this.communication.workerNotes = (this.communication.workerNotes || '') + `\nCompletion: ${workerNotes}`;
  }
  
  return this.save();
};

pickupRequestSchema.methods.addCustomerRating = function(rating, comment = '') {
  this.feedback.customerRating = {
    rating,
    comment,
    ratedAt: new Date()
  };
  
  return this.save();
};

// Static methods
pickupRequestSchema.statics.findByZoneAndDate = function(zoneId, date, status = null) {
  const query = { zoneId, preferredDate: date };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('userId', 'firstName lastName phone')
    .populate('assignedTo', 'firstName lastName phone')
    .populate('timeSlotId', 'name timeRange')
    .sort({ priority: -1, createdAt: 1 });
};

pickupRequestSchema.statics.findPendingAssignments = function(zoneId = null, limit = 50) {
  const query = { 
    status: 'SCHEDULED',
    preferredDate: { $gte: new Date() }
  };
  
  if (zoneId) {
    query.zoneId = zoneId;
  }
  
  return this.find(query)
    .populate('userId', 'firstName lastName phone location')
    .populate('zoneId', 'name')
    .populate('timeSlotId', 'name timeRange priority')
    .sort({ priority: -1, preferredDate: 1, createdAt: 1 })
    .limit(limit);
};

pickupRequestSchema.statics.findNearbyRequests = function(longitude, latitude, maxDistance = 5000, status = 'SCHEDULED') {
  return this.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: maxDistance,
        spherical: true,
        query: {
          status: status,
          preferredDate: { $gte: new Date() }
        }
      }
    },
    { $limit: 20 },
    {
      $lookup: {
        from: 'citizens',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $lookup: {
        from: 'timeslots',
        localField: 'timeSlotId',
        foreignField: '_id',
        as: 'timeSlot'
      }
    }
  ]);
};

pickupRequestSchema.statics.getDailyPickupStats = function(zoneId = null, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const matchQuery = {
    preferredDate: { $gte: startOfDay, $lte: endOfDay }
  };
  
  if (zoneId) {
    matchQuery.zoneId = mongoose.Types.ObjectId(zoneId);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          zoneId: '$zoneId',
          status: '$status'
        },
        count: { $sum: 1 },
        totalKg: { $sum: '$wasteDetails.totalEstimatedKg' },
        actualKg: { $sum: { $ifNull: ['$wasteDetails.actualKg', 0] } }
      }
    },
    {
      $group: {
        _id: '$_id.zoneId',
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalKg: '$totalKg',
            actualKg: '$actualKg'
          }
        },
        totalRequests: { $sum: '$count' },
        totalEstimatedKg: { $sum: '$totalKg' },
        totalActualKg: { $sum: '$actualKg' }
      }
    }
  ]);
};

module.exports = mongoose.model('PickupRequest', pickupRequestSchema);