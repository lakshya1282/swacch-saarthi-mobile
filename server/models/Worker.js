const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    uppercase: true
  },
  // Worker status
  status: {
    type: String,
    enum: {
      values: ['AVAILABLE', 'ON_ROUTE', 'BUSY', 'OFF_DUTY', 'MAINTENANCE'],
      message: 'Status must be one of: AVAILABLE, ON_ROUTE, BUSY, OFF_DUTY, MAINTENANCE'
    },
    default: 'OFF_DUTY',
    required: true,
    index: true
  },
  // Zone assignments
  zoneIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  }],
  primaryZoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Primary zone assignment is required']
  },
  // Capacity and load
  capacityKg: {
    type: Number,
    required: [true, 'Vehicle capacity in KG is required'],
    min: [50, 'Minimum capacity is 50 KG'],
    max: [10000, 'Maximum capacity is 10000 KG']
  },
  currentLoadKg: {
    type: Number,
    default: 0,
    min: [0, 'Current load cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.capacityKg;
      },
      message: 'Current load cannot exceed vehicle capacity'
    }
  },
  // Current location (GeoJSON Point)
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false,
      validate: {
        validator: function(coordinates) {
          if (!coordinates || coordinates.length !== 2) return false;
          return coordinates[0] >= -180 && coordinates[0] <= 180 && // longitude
                 coordinates[1] >= -90 && coordinates[1] <= 90;    // latitude
        },
        message: 'Coordinates must be [longitude, latitude] within valid ranges'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Home base location
  baseLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Base location coordinates are required'],
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
  // Vehicle information
  vehicle: {
    type: {
      type: String,
      enum: ['bicycle', 'motorbike', 'auto_rickshaw', 'van', 'truck'],
      required: [true, 'Vehicle type is required']
    },
    registrationNumber: {
      type: String,
      required: [true, 'Vehicle registration number is required'],
      uppercase: true,
      unique: true
    },
    model: String,
    year: {
      type: Number,
      min: [2000, 'Vehicle year cannot be before 2000'],
      max: [new Date().getFullYear(), 'Vehicle year cannot be in the future']
    }
  },
  // License information
  license: {
    number: {
      type: String,
      required: [true, 'License number is required'],
      uppercase: true
    },
    type: {
      type: String,
      enum: ['light_motor_vehicle', 'heavy_motor_vehicle', 'commercial'],
      required: [true, 'License type is required']
    },
    expiryDate: {
      type: Date,
      required: [true, 'License expiry date is required'],
      validate: {
        validator: function(date) {
          return date > new Date();
        },
        message: 'License must not be expired'
      }
    }
  },
  // Work schedule
  workSchedule: {
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'flexible'],
      default: 'morning'
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    startTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    endTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    }
  },
  // Performance metrics
  performance: {
    totalAssignments: {
      type: Number,
      default: 0,
      min: [0, 'Total assignments cannot be negative']
    },
    completedAssignments: {
      type: Number,
      default: 0,
      min: [0, 'Completed assignments cannot be negative']
    },
    totalWasteCollected: {
      type: Number,
      default: 0, // in kg
      min: [0, 'Total waste collected cannot be negative']
    },
    averageCompletionTime: {
      type: Number,
      default: 0 // in minutes
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5']
      },
      count: {
        type: Number,
        default: 0,
        min: [0, 'Rating count cannot be negative']
      }
    }
  },
  // Emergency contact
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required']
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required'],
      match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
    },
    relationship: {
      type: String,
      required: [true, 'Relationship with emergency contact is required']
    }
  },
  // Office Association and Enrollment
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Office',
    required: false // Workers can exist without office initially
  },
  officeCode: {
    type: String,
    uppercase: true,
    trim: true,
    required: false // Will be set when worker enrolls
  },
  enrollmentStatus: {
    type: String,
    enum: ['not_enrolled', 'enrolled', 'pending_approval'],
    default: 'not_enrolled',
    index: true
  },
  enrolledAt: {
    type: Date,
    required: false // Set when worker successfully enrolls
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Current assignment tracking
  currentAssignment: {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment'
    },
    startTime: Date,
    estimatedEndTime: Date,
    pickupCount: {
      type: Number,
      default: 0
    }
  },
  // Last activity timestamp
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for geospatial queries and performance
workerSchema.index({ currentLocation: '2dsphere' }); // Current location for proximity queries
workerSchema.index({ baseLocation: '2dsphere' }); // Base location
workerSchema.index({ zoneIds: 1, status: 1 }); // Zone and status queries
workerSchema.index({ primaryZoneId: 1, status: 1, isActive: 1 }); // Primary zone queries
workerSchema.index({ status: 1, isActive: 1 }); // Status-based queries
// employeeId and vehicle.registrationNumber already have unique: true in field definitions
workerSchema.index({ lastActiveAt: -1 }); // Recent activity
workerSchema.index({ 'workSchedule.shiftType': 1 }); // Shift-based queries

// Virtual for full name
workerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for remaining capacity
workerSchema.virtual('remainingCapacityKg').get(function() {
  return this.capacityKg - this.currentLoadKg;
});

// Virtual for capacity utilization percentage
workerSchema.virtual('capacityUtilization').get(function() {
  return Math.round((this.currentLoadKg / this.capacityKg) * 100);
});

// Virtual for completion rate
workerSchema.virtual('completionRate').get(function() {
  if (this.performance.totalAssignments === 0) return 0;
  return Math.round((this.performance.completedAssignments / this.performance.totalAssignments) * 100);
});

// Virtual for current coordinates in lat/lng format
workerSchema.virtual('coordinates').get(function() {
  if (!this.currentLocation.coordinates || this.currentLocation.coordinates.length !== 2) {
    return null;
  }
  return {
    latitude: this.currentLocation.coordinates[1],
    longitude: this.currentLocation.coordinates[0]
  };
});

// Pre-save middleware
workerSchema.pre('save', function(next) {
  // Update lastActiveAt when status changes
  if (this.isModified('status')) {
    this.lastActiveAt = new Date();
  }
  
  // Update current location timestamp
  if (this.isModified('currentLocation.coordinates')) {
    this.currentLocation.lastUpdated = new Date();
  }
  
  // Ensure primary zone is in zoneIds array
  if (this.isModified('primaryZoneId') && this.primaryZoneId) {
    if (!this.zoneIds.includes(this.primaryZoneId)) {
      this.zoneIds.push(this.primaryZoneId);
    }
  }
  
  next();
});

// Instance methods
workerSchema.methods.updateLocation = function(longitude, latitude) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
    lastUpdated: new Date()
  };
  this.lastActiveAt = new Date();
  return this.save();
};

workerSchema.methods.updateStatus = function(newStatus, assignmentId = null) {
  this.status = newStatus;
  this.lastActiveAt = new Date();
  
  if (newStatus === 'ON_ROUTE' && assignmentId) {
    this.currentAssignment.assignmentId = assignmentId;
    this.currentAssignment.startTime = new Date();
  } else if (newStatus === 'AVAILABLE') {
    this.currentAssignment = {};
  }
  
  return this.save();
};

workerSchema.methods.updateLoad = function(additionalKg) {
  const newLoad = this.currentLoadKg + additionalKg;
  if (newLoad < 0 || newLoad > this.capacityKg) {
    throw new Error('Invalid load update: exceeds capacity or results in negative load');
  }
  this.currentLoadKg = newLoad;
  return this.save();
};

workerSchema.methods.completeAssignment = function(wasteKg = 0, completionTimeMinutes = 0) {
  this.performance.completedAssignments += 1;
  this.performance.totalWasteCollected += wasteKg;
  
  // Update average completion time
  const totalTime = this.performance.averageCompletionTime * (this.performance.completedAssignments - 1) + completionTimeMinutes;
  this.performance.averageCompletionTime = totalTime / this.performance.completedAssignments;
  
  // Update load
  this.currentLoadKg += wasteKg;
  
  // Clear current assignment
  this.currentAssignment = {};
  this.status = 'AVAILABLE';
  
  return this.save();
};

workerSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.performance.rating.average * this.performance.rating.count;
  this.performance.rating.count += 1;
  this.performance.rating.average = (currentTotal + newRating) / this.performance.rating.count;
  return this.save();
};

// Static methods
workerSchema.statics.findAvailableInZone = function(zoneId, options = {}) {
  const query = {
    $or: [
      { primaryZoneId: zoneId },
      { zoneIds: zoneId }
    ],
    status: 'AVAILABLE',
    isActive: true
  };
  
  if (options.minCapacity) {
    query.$expr = {
      $gte: [
        { $subtract: ['$capacityKg', '$currentLoadKg'] },
        options.minCapacity
      ]
    };
  }
  
  return this.find(query);
};

workerSchema.statics.findNearestAvailable = function(longitude, latitude, zoneId, minCapacityKg = 0) {
  return this.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: 50000, // 50km radius
        spherical: true,
        query: {
          $or: [
            { primaryZoneId: zoneId },
            { zoneIds: zoneId }
          ],
          status: 'AVAILABLE',
          isActive: true,
          $expr: {
            $gte: [
              { $subtract: ['$capacityKg', '$currentLoadKg'] },
              minCapacityKg
            ]
          }
        }
      }
    },
    {
      $limit: 5
    },
    {
      $sort: {
        distance: 1,
        'performance.rating.average': -1
      }
    }
  ]);
};

workerSchema.statics.getPerformanceStats = function(workerId = null) {
  const matchStage = { isActive: true };
  if (workerId) matchStage._id = mongoose.Types.ObjectId(workerId);
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: workerId ? '$_id' : null,
        totalWorkers: { $sum: 1 },
        totalAssignments: { $sum: '$performance.totalAssignments' },
        totalCompleted: { $sum: '$performance.completedAssignments' },
        totalWasteCollected: { $sum: '$performance.totalWasteCollected' },
        averageRating: { $avg: '$performance.rating.average' },
        averageCompletionTime: { $avg: '$performance.averageCompletionTime' }
      }
    }
  ]);
};

// Remove sensitive data from JSON output
workerSchema.methods.toJSON = function() {
  const worker = this.toObject();
  delete worker.password;
  return worker;
};

module.exports = mongoose.model('Worker', workerSchema);