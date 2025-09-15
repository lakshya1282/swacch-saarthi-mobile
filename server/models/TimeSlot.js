const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Time slot name is required'],
    trim: true,
    maxlength: [100, 'Time slot name cannot exceed 100 characters']
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Zone ID is required'],
    index: true
  },
  // Time slot definition
  startHour: {
    type: Number,
    required: [true, 'Start hour is required'],
    min: [0, 'Start hour must be between 0 and 23'],
    max: [23, 'Start hour must be between 0 and 23']
  },
  startMinute: {
    type: Number,
    default: 0,
    min: [0, 'Start minute must be between 0 and 59'],
    max: [59, 'Start minute must be between 0 and 59']
  },
  endHour: {
    type: Number,
    required: [true, 'End hour is required'],
    min: [0, 'End hour must be between 0 and 23'],
    max: [23, 'End hour must be between 0 and 23']
  },
  endMinute: {
    type: Number,
    default: 0,
    min: [0, 'End minute must be between 0 and 59'],
    max: [59, 'End minute must be between 0 and 59']
  },
  // Capacity limits
  maxRequests: {
    type: Number,
    required: [true, 'Maximum requests limit is required'],
    min: [1, 'Maximum requests must be at least 1']
  },
  maxKg: {
    type: Number,
    required: [true, 'Maximum weight capacity is required'],
    min: [10, 'Maximum weight must be at least 10 KG']
  },
  // Days when this slot is available
  availableDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  }],
  // Slot type and priority
  slotType: {
    type: String,
    enum: ['regular', 'express', 'bulk', 'emergency'],
    default: 'regular'
  },
  priority: {
    type: Number,
    default: 1,
    min: [1, 'Priority must be at least 1'],
    max: [10, 'Priority cannot exceed 10']
  },
  // Pricing information
  basePricing: {
    regularRate: {
      type: Number,
      default: 0,
      min: [0, 'Regular rate cannot be negative']
    },
    expressRate: {
      type: Number,
      default: 0,
      min: [0, 'Express rate cannot be negative']
    },
    bulkDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Bulk discount cannot be negative'],
      max: [100, 'Bulk discount cannot exceed 100%']
    }
  },
  // Buffer time between pickups
  bufferTimeMinutes: {
    type: Number,
    default: 15,
    min: [0, 'Buffer time cannot be negative'],
    max: [120, 'Buffer time cannot exceed 120 minutes']
  },
  // Worker requirements
  minimumWorkers: {
    type: Number,
    default: 1,
    min: [1, 'Minimum workers must be at least 1']
  },
  preferredVehicleTypes: [{
    type: String,
    enum: ['bicycle', 'motorbike', 'auto_rickshaw', 'van', 'truck']
  }],
  // Status and availability
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isBookable: {
    type: Boolean,
    default: true
  },
  // Special configurations
  configuration: {
    allowOverCapacity: {
      type: Boolean,
      default: false
    },
    requireAdvanceBooking: {
      type: Boolean,
      default: false
    },
    advanceBookingHours: {
      type: Number,
      default: 2, // Minimum hours in advance
      min: [0, 'Advance booking hours cannot be negative']
    },
    allowWeekendBooking: {
      type: Boolean,
      default: true
    },
    allowHolidayBooking: {
      type: Boolean,
      default: false
    }
  },
  // Seasonal adjustments
  seasonalAdjustments: [{
    name: String,
    startDate: Date,
    endDate: Date,
    capacityMultiplier: {
      type: Number,
      default: 1.0,
      min: [0.1, 'Capacity multiplier must be at least 0.1']
    },
    pricingMultiplier: {
      type: Number,
      default: 1.0,
      min: [0.1, 'Pricing multiplier must be at least 0.1']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Statistics
  statistics: {
    totalBookings: {
      type: Number,
      default: 0,
      min: [0, 'Total bookings cannot be negative']
    },
    completedBookings: {
      type: Number,
      default: 0,
      min: [0, 'Completed bookings cannot be negative']
    },
    cancelledBookings: {
      type: Number,
      default: 0,
      min: [0, 'Cancelled bookings cannot be negative']
    },
    averageUtilization: {
      type: Number,
      default: 0,
      min: [0, 'Average utilization cannot be negative'],
      max: [100, 'Average utilization cannot exceed 100%']
    },
    totalWasteCollected: {
      type: Number,
      default: 0,
      min: [0, 'Total waste collected cannot be negative']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
timeSlotSchema.index({ zoneId: 1, isActive: 1, isBookable: 1 });
timeSlotSchema.index({ zoneId: 1, startHour: 1, endHour: 1 });
timeSlotSchema.index({ availableDays: 1, isActive: 1 });
timeSlotSchema.index({ slotType: 1, priority: -1 });
timeSlotSchema.index({ 'configuration.requireAdvanceBooking': 1, 'configuration.advanceBookingHours': 1 });

// Validation for time slot logic
timeSlotSchema.pre('validate', function(next) {
  // Ensure end time is after start time
  const startTotalMinutes = this.startHour * 60 + this.startMinute;
  const endTotalMinutes = this.endHour * 60 + this.endMinute;
  
  if (endTotalMinutes <= startTotalMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  // Ensure at least one available day
  if (!this.availableDays || this.availableDays.length === 0) {
    return next(new Error('At least one available day must be specified'));
  }
  
  next();
});

// Virtual for formatted time range
timeSlotSchema.virtual('timeRange').get(function() {
  const formatTime = (hour, minute) => {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  };
  
  return `${formatTime(this.startHour, this.startMinute)} - ${formatTime(this.endHour, this.endMinute)}`;
});

// Virtual for duration in minutes
timeSlotSchema.virtual('durationMinutes').get(function() {
  const startTotalMinutes = this.startHour * 60 + this.startMinute;
  const endTotalMinutes = this.endHour * 60 + this.endMinute;
  return endTotalMinutes - startTotalMinutes;
});

// Virtual for completion rate
timeSlotSchema.virtual('completionRate').get(function() {
  if (this.statistics.totalBookings === 0) return 0;
  return Math.round((this.statistics.completedBookings / this.statistics.totalBookings) * 100);
});

// Virtual for current capacity utilization
timeSlotSchema.virtual('currentUtilization').get(function() {
  // This would typically be calculated based on today's bookings
  return this.statistics.averageUtilization;
});

// Virtual for available capacity
timeSlotSchema.virtual('availableCapacity').get(function() {
  const currentSeasonalMultiplier = this.getCurrentSeasonalMultiplier();
  return {
    requests: Math.floor(this.maxRequests * currentSeasonalMultiplier),
    kg: Math.floor(this.maxKg * currentSeasonalMultiplier)
  };
});

// Instance methods
timeSlotSchema.methods.isAvailableOnDate = function(date) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return this.availableDays.includes(dayOfWeek);
};

timeSlotSchema.methods.getCurrentSeasonalMultiplier = function() {
  const now = new Date();
  const activeAdjustment = this.seasonalAdjustments.find(adj => 
    adj.isActive && 
    adj.startDate <= now && 
    adj.endDate >= now
  );
  
  return activeAdjustment ? activeAdjustment.capacityMultiplier : 1.0;
};

timeSlotSchema.methods.canAcceptBooking = function(requestedKg = 0, requestedDate = new Date()) {
  // Check if slot is active and bookable
  if (!this.isActive || !this.isBookable) {
    return {
      canBook: false,
      reason: 'Slot is not available for booking'
    };
  }
  
  // Check if date is available
  if (!this.isAvailableOnDate(requestedDate)) {
    return {
      canBook: false,
      reason: 'Slot is not available on the requested day'
    };
  }
  
  // Check advance booking requirement
  if (this.configuration.requireAdvanceBooking) {
    const hoursUntilSlot = (requestedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursUntilSlot < this.configuration.advanceBookingHours) {
      return {
        canBook: false,
        reason: `Advance booking required: ${this.configuration.advanceBookingHours} hours minimum`
      };
    }
  }
  
  // Check weekend/holiday restrictions
  const isWeekend = [0, 6].includes(requestedDate.getDay()); // Sunday = 0, Saturday = 6
  if (isWeekend && !this.configuration.allowWeekendBooking) {
    return {
      canBook: false,
      reason: 'Weekend bookings not allowed for this slot'
    };
  }
  
  return {
    canBook: true,
    availableCapacity: this.availableCapacity
  };
};

timeSlotSchema.methods.updateStatistics = function(bookingCompleted = false, wasteKg = 0, cancelled = false) {
  this.statistics.totalBookings += 1;
  
  if (bookingCompleted) {
    this.statistics.completedBookings += 1;
    this.statistics.totalWasteCollected += wasteKg;
  } else if (cancelled) {
    this.statistics.cancelledBookings += 1;
  }
  
  // Update average utilization (simplified calculation)
  if (this.statistics.totalBookings > 0) {
    this.statistics.averageUtilization = Math.round(
      (this.statistics.completedBookings / this.statistics.totalBookings) * 100
    );
  }
  
  return this.save();
};

// Static methods
timeSlotSchema.statics.findAvailableSlots = function(zoneId, date = new Date(), options = {}) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  const query = {
    zoneId,
    isActive: true,
    isBookable: true,
    availableDays: dayOfWeek
  };
  
  if (options.slotType) {
    query.slotType = options.slotType;
  }
  
  if (options.minCapacityKg) {
    query.maxKg = { $gte: options.minCapacityKg };
  }
  
  return this.find(query)
    .populate('zoneId', 'name code')
    .sort({ priority: -1, startHour: 1 });
};

timeSlotSchema.statics.findOverlappingSlots = function(zoneId, startHour, endHour, excludeId = null) {
  const query = {
    zoneId,
    isActive: true,
    $or: [
      // New slot starts during existing slot
      {
        startHour: { $lte: startHour },
        endHour: { $gt: startHour }
      },
      // New slot ends during existing slot
      {
        startHour: { $lt: endHour },
        endHour: { $gte: endHour }
      },
      // New slot completely contains existing slot
      {
        startHour: { $gte: startHour },
        endHour: { $lte: endHour }
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

timeSlotSchema.statics.getSlotStatistics = function(zoneId = null, dateRange = null) {
  const matchStage = { isActive: true };
  if (zoneId) matchStage.zoneId = mongoose.Types.ObjectId(zoneId);
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: zoneId ? '$zoneId' : null,
        totalSlots: { $sum: 1 },
        totalCapacity: { $sum: '$maxRequests' },
        totalWeightCapacity: { $sum: '$maxKg' },
        totalBookings: { $sum: '$statistics.totalBookings' },
        totalCompleted: { $sum: '$statistics.completedBookings' },
        totalCancelled: { $sum: '$statistics.cancelledBookings' },
        averageUtilization: { $avg: '$statistics.averageUtilization' },
        totalWasteCollected: { $sum: '$statistics.totalWasteCollected' }
      }
    }
  ]);
};

timeSlotSchema.statics.findBestSlotForPickup = function(zoneId, preferredDate, estimatedKg, preferredTimeRange = null) {
  return this.findAvailableSlots(zoneId, preferredDate, { minCapacityKg: estimatedKg })
    .then(slots => {
      if (slots.length === 0) return null;
      
      // Filter by preferred time range if provided
      let filteredSlots = slots;
      if (preferredTimeRange) {
        const [preferredStart, preferredEnd] = preferredTimeRange;
        filteredSlots = slots.filter(slot => 
          slot.startHour >= preferredStart && slot.endHour <= preferredEnd
        );
        
        // Fall back to all slots if no match in preferred range
        if (filteredSlots.length === 0) {
          filteredSlots = slots;
        }
      }
      
      // Sort by priority, then by lowest utilization
      return filteredSlots.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.statistics.averageUtilization - b.statistics.averageUtilization; // Lower utilization first
      })[0];
    });
};

module.exports = mongoose.model('TimeSlot', timeSlotSchema);