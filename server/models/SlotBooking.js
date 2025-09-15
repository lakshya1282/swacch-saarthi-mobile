const mongoose = require('mongoose');

const slotBookingSchema = new mongoose.Schema({
  timeSlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlot',
    required: [true, 'Time slot ID is required'],
    index: true
  },
  // Date for which the slot is being tracked
  date: {
    type: Date,
    required: [true, 'Booking date is required'],
    index: true
  },
  // Current booking counts
  count: {
    type: Number,
    default: 0,
    min: [0, 'Booking count cannot be negative']
  },
  totalKg: {
    type: Number,
    default: 0,
    min: [0, 'Total weight cannot be negative']
  },
  // Capacity limits (copied from TimeSlot for performance)
  maxCount: {
    type: Number,
    required: [true, 'Maximum count is required'],
    min: [1, 'Maximum count must be at least 1']
  },
  maxKg: {
    type: Number,
    required: [true, 'Maximum weight is required'],
    min: [1, 'Maximum weight must be at least 1']
  },
  // Zone reference for quick queries
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Zone ID is required'],
    index: true
  },
  // Booking status
  status: {
    type: String,
    enum: ['active', 'full', 'overbooked', 'suspended', 'expired'],
    default: 'active',
    index: true
  },
  // Historical tracking
  bookingHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['booked', 'cancelled', 'completed', 'no_show'],
      required: true
    },
    pickupRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PickupRequest'
    },
    previousCount: Number,
    previousKg: Number,
    deltaCount: Number,
    deltaKg: Number,
    reason: String
  }],
  // Real-time availability
  availability: {
    remainingSlots: {
      type: Number,
      default: function() { return this.maxCount - this.count; }
    },
    remainingKg: {
      type: Number,
      default: function() { return this.maxKg - this.totalKg; }
    },
    utilizationPercent: {
      type: Number,
      default: 0,
      min: [0, 'Utilization cannot be negative'],
      max: [150, 'Utilization cannot exceed 150%'] // Allow some overbooking
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Performance metrics
  metrics: {
    averagePickupTime: {
      type: Number,
      default: 0 // in minutes
    },
    completionRate: {
      type: Number,
      default: 0,
      min: [0, 'Completion rate cannot be negative'],
      max: [100, 'Completion rate cannot exceed 100%']
    },
    noShowRate: {
      type: Number,
      default: 0,
      min: [0, 'No-show rate cannot be negative'],
      max: [100, 'No-show rate cannot exceed 100%']
    },
    customerSatisfactionRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    }
  },
  // Emergency overrides
  overrides: {
    allowOverbooking: {
      type: Boolean,
      default: false
    },
    maxOverbookingPercent: {
      type: Number,
      default: 10,
      min: [0, 'Overbooking percentage cannot be negative'],
      max: [50, 'Overbooking percentage cannot exceed 50%']
    },
    emergencyCapacity: {
      type: Boolean,
      default: false
    },
    notes: String
  },
  // Audit trail
  audit: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'audit.createdByModel'
    },
    createdByModel: {
      type: String,
      enum: ['User', 'Worker', 'System']
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'audit.lastModifiedByModel'
    },
    lastModifiedByModel: {
      type: String,
      enum: ['User', 'Worker', 'System']
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries and concurrency control
slotBookingSchema.index({ timeSlotId: 1, date: 1 }, { unique: true }); // Primary constraint
slotBookingSchema.index({ zoneId: 1, date: 1, status: 1 }); // Zone-based queries
slotBookingSchema.index({ date: 1, status: 1 }); // Date-based queries
slotBookingSchema.index({ 'availability.lastUpdated': 1 }); // Freshness queries
slotBookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 * 30 }); // TTL: 30 days

// Virtual for availability status
slotBookingSchema.virtual('availabilityStatus').get(function() {
  if (this.availability.remainingSlots <= 0 || this.availability.remainingKg <= 0) {
    return 'full';
  } else if (this.availability.utilizationPercent > 80) {
    return 'limited';
  } else {
    return 'available';
  }
});

// Virtual for overbooking status
slotBookingSchema.virtual('isOverbooked').get(function() {
  return this.count > this.maxCount || this.totalKg > this.maxKg;
});

// Virtual for effective capacity (including overbooking)
slotBookingSchema.virtual('effectiveCapacity').get(function() {
  const overbookingMultiplier = this.overrides.allowOverbooking ? 
    (1 + this.overrides.maxOverbookingPercent / 100) : 1;
  
  return {
    maxCount: Math.floor(this.maxCount * overbookingMultiplier),
    maxKg: Math.floor(this.maxKg * overbookingMultiplier)
  };
});

// Pre-save middleware for automatic calculations
slotBookingSchema.pre('save', function(next) {
  // Update availability calculations
  this.availability.remainingSlots = this.maxCount - this.count;
  this.availability.remainingKg = this.maxKg - this.totalKg;
  this.availability.utilizationPercent = Math.round((this.count / this.maxCount) * 100);
  this.availability.lastUpdated = new Date();
  
  // Update status based on capacity
  if (this.count >= this.maxCount || this.totalKg >= this.maxKg) {
    if (this.overrides.allowOverbooking) {
      const effective = this.effectiveCapacity;
      if (this.count >= effective.maxCount || this.totalKg >= effective.maxKg) {
        this.status = 'overbooked';
      } else {
        this.status = 'full';
      }
    } else {
      this.status = 'full';
    }
  } else {
    this.status = 'active';
  }
  
  // Update version for optimistic locking
  this.audit.version += 1;
  
  next();
});

// Instance methods
slotBookingSchema.methods.canAcceptBooking = function(requestCount = 1, requestKg = 0) {
  if (this.status === 'suspended' || this.status === 'expired') {
    return {
      canAccept: false,
      reason: `Slot booking is ${this.status}`,
      availableSlots: 0,
      availableKg: 0
    };
  }
  
  const effective = this.effectiveCapacity;
  const availableSlots = effective.maxCount - this.count;
  const availableKg = effective.maxKg - this.totalKg;
  
  const canAcceptCount = requestCount <= availableSlots;
  const canAcceptKg = requestKg <= availableKg;
  
  return {
    canAccept: canAcceptCount && canAcceptKg,
    reason: !canAcceptCount ? 'Insufficient slot capacity' : 
            !canAcceptKg ? 'Insufficient weight capacity' : null,
    availableSlots: Math.max(0, availableSlots),
    availableKg: Math.max(0, availableKg),
    wouldOverbook: (this.count + requestCount > this.maxCount) || 
                   (this.totalKg + requestKg > this.maxKg)
  };
};

slotBookingSchema.methods.incrementBooking = function(pickupRequestId, deltaCount = 1, deltaKg = 0, reason = 'booked') {
  const previousCount = this.count;
  const previousKg = this.totalKg;
  
  this.count += deltaCount;
  this.totalKg += deltaKg;
  
  // Add to booking history
  this.bookingHistory.push({
    timestamp: new Date(),
    action: reason,
    pickupRequestId,
    previousCount,
    previousKg,
    deltaCount,
    deltaKg,
    reason
  });
  
  return this.save();
};

slotBookingSchema.methods.decrementBooking = function(pickupRequestId, deltaCount = 1, deltaKg = 0, reason = 'cancelled') {
  const previousCount = this.count;
  const previousKg = this.totalKg;
  
  this.count = Math.max(0, this.count - deltaCount);
  this.totalKg = Math.max(0, this.totalKg - deltaKg);
  
  // Add to booking history
  this.bookingHistory.push({
    timestamp: new Date(),
    action: reason,
    pickupRequestId,
    previousCount,
    previousKg,
    deltaCount: -deltaCount,
    deltaKg: -deltaKg,
    reason
  });
  
  return this.save();
};

slotBookingSchema.methods.updateMetrics = function(completedCount = 0, totalTime = 0, noShowCount = 0, rating = 0) {
  const totalBookings = this.bookingHistory.filter(h => h.action === 'booked').length;
  
  if (totalBookings > 0) {
    // Update completion rate
    this.metrics.completionRate = Math.round((completedCount / totalBookings) * 100);
    
    // Update no-show rate
    this.metrics.noShowRate = Math.round((noShowCount / totalBookings) * 100);
    
    // Update average pickup time
    if (completedCount > 0 && totalTime > 0) {
      this.metrics.averagePickupTime = Math.round(totalTime / completedCount);
    }
    
    // Update customer satisfaction rating
    if (rating > 0) {
      const currentRatingWeight = this.metrics.customerSatisfactionRating * (completedCount - 1);
      this.metrics.customerSatisfactionRating = (currentRatingWeight + rating) / completedCount;
    }
  }
  
  return this.save();
};

// Static methods
slotBookingSchema.statics.findOrCreateBooking = async function(timeSlotId, date, zoneId = null) {
  // Try to find existing booking
  let booking = await this.findOne({ timeSlotId, date });
  
  if (!booking) {
    // Get time slot details to create new booking
    const TimeSlot = mongoose.model('TimeSlot');
    const timeSlot = await TimeSlot.findById(timeSlotId);
    
    if (!timeSlot) {
      throw new Error('Time slot not found');
    }
    
    // Create new booking
    booking = new this({
      timeSlotId,
      date,
      zoneId: zoneId || timeSlot.zoneId,
      maxCount: timeSlot.maxRequests,
      maxKg: timeSlot.maxKg,
      audit: {
        createdByModel: 'System'
      }
    });
    
    await booking.save();
  }
  
  return booking;
};

slotBookingSchema.statics.getAvailableCapacity = function(zoneId, date, timeSlotId = null) {
  const matchQuery = { zoneId, date, status: { $in: ['active', 'full'] } };
  
  if (timeSlotId) {
    matchQuery.timeSlotId = timeSlotId;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'timeslots',
        localField: 'timeSlotId',
        foreignField: '_id',
        as: 'timeSlot'
      }
    },
    { $unwind: '$timeSlot' },
    {
      $project: {
        timeSlotId: 1,
        'timeSlot.name': 1,
        'timeSlot.timeRange': 1,
        'timeSlot.slotType': 1,
        maxCount: 1,
        maxKg: 1,
        currentCount: '$count',
        currentKg: '$totalKg',
        availableSlots: { $subtract: ['$maxCount', '$count'] },
        availableKg: { $subtract: ['$maxKg', '$totalKg'] },
        utilizationPercent: '$availability.utilizationPercent',
        status: 1
      }
    },
    { $sort: { 'timeSlot.startHour': 1 } }
  ]);
};

slotBookingSchema.statics.findAvailableSlots = function(zoneId, date, minSlots = 1, minKg = 0) {
  return this.aggregate([
    {
      $match: {
        zoneId,
        date,
        status: { $in: ['active'] },
        $expr: {
          $and: [
            { $gte: [{ $subtract: ['$maxCount', '$count'] }, minSlots] },
            { $gte: [{ $subtract: ['$maxKg', '$totalKg'] }, minKg] }
          ]
        }
      }
    },
    {
      $lookup: {
        from: 'timeslots',
        localField: 'timeSlotId',
        foreignField: '_id',
        as: 'timeSlot'
      }
    },
    { $unwind: '$timeSlot' },
    {
      $project: {
        timeSlotId: 1,
        timeSlotInfo: '$timeSlot',
        availableSlots: { $subtract: ['$maxCount', '$count'] },
        availableKg: { $subtract: ['$maxKg', '$totalKg'] },
        utilizationPercent: '$availability.utilizationPercent'
      }
    },
    { $sort: { 'timeSlot.priority': -1, 'timeSlot.startHour': 1 } }
  ]);
};

slotBookingSchema.statics.getBookingStatistics = function(zoneId = null, dateRange = null) {
  const matchStage = {};
  
  if (zoneId) {
    matchStage.zoneId = mongoose.Types.ObjectId(zoneId);
  }
  
  if (dateRange && dateRange.start && dateRange.end) {
    matchStage.date = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: zoneId ? '$zoneId' : null,
        totalSlotBookings: { $sum: 1 },
        totalBookedSlots: { $sum: '$count' },
        totalBookedKg: { $sum: '$totalKg' },
        totalCapacitySlots: { $sum: '$maxCount' },
        totalCapacityKg: { $sum: '$maxKg' },
        averageUtilization: { $avg: '$availability.utilizationPercent' },
        averageCompletionRate: { $avg: '$metrics.completionRate' },
        averageNoShowRate: { $avg: '$metrics.noShowRate' },
        averageCustomerRating: { $avg: '$metrics.customerSatisfactionRating' }
      }
    },
    {
      $project: {
        totalSlotBookings: 1,
        totalBookedSlots: 1,
        totalBookedKg: 1,
        totalCapacitySlots: 1,
        totalCapacityKg: 1,
        utilizationRate: { $round: [{ $divide: ['$totalBookedSlots', '$totalCapacitySlots'] }, 4] },
        weightUtilizationRate: { $round: [{ $divide: ['$totalBookedKg', '$totalCapacityKg'] }, 4] },
        averageUtilization: { $round: ['$averageUtilization', 2] },
        averageCompletionRate: { $round: ['$averageCompletionRate', 2] },
        averageNoShowRate: { $round: ['$averageNoShowRate', 2] },
        averageCustomerRating: { $round: ['$averageCustomerRating', 2] }
      }
    }
  ]);
};

// Static method for atomic booking operations
slotBookingSchema.statics.atomicBookingUpdate = async function(timeSlotId, date, deltaCount, deltaKg, pickupRequestId, reason = 'booked') {
  const session = await mongoose.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      // Find or create the slot booking
      let booking = await this.findOne({ timeSlotId, date }).session(session);
      
      if (!booking) {
        const TimeSlot = mongoose.model('TimeSlot');
        const timeSlot = await TimeSlot.findById(timeSlotId).session(session);
        
        if (!timeSlot) {
          throw new Error('Time slot not found');
        }
        
        booking = new this({
          timeSlotId,
          date,
          zoneId: timeSlot.zoneId,
          maxCount: timeSlot.maxRequests,
          maxKg: timeSlot.maxKg,
          audit: { createdByModel: 'System' }
        });
      }
      
      // Check if booking can be accepted
      const canAccept = booking.canAcceptBooking(Math.abs(deltaCount), Math.abs(deltaKg));
      
      if (deltaCount > 0 && !canAccept.canAccept) {
        throw new Error(`Booking failed: ${canAccept.reason}`);
      }
      
      // Update the booking
      if (deltaCount > 0) {
        await booking.incrementBooking(pickupRequestId, deltaCount, deltaKg, reason);
      } else if (deltaCount < 0) {
        await booking.decrementBooking(pickupRequestId, Math.abs(deltaCount), Math.abs(deltaKg), reason);
      }
      
      return booking;
    });
    
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = mongoose.model('SlotBooking', slotBookingSchema);