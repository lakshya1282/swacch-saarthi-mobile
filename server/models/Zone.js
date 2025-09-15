const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    trim: true,
    maxlength: [100, 'Zone name cannot exceed 100 characters'],
    unique: true
  },
  code: {
    type: String,
    required: [true, 'Zone code is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,10}$/, 'Zone code must be 3-10 characters alphanumeric']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // Geographic boundary using GeoJSON Polygon
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of coordinates [[[lng, lat], [lng, lat]...]]
      required: [true, 'Zone boundary coordinates are required'],
      validate: {
        validator: function(coordinates) {
          // Basic validation for polygon coordinates
          return coordinates && 
                 coordinates.length > 0 && 
                 coordinates[0].length >= 4 && // Minimum 4 points for a polygon
                 JSON.stringify(coordinates[0][0]) === JSON.stringify(coordinates[0][coordinates[0].length - 1]); // Closed polygon
        },
        message: 'Invalid polygon coordinates. Polygon must be closed with at least 4 points.'
      }
    }
  },
  // Center point for quick distance calculations
  centerPoint: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Center point coordinates are required'],
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
  // Administrative details
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^[1-9][0-9]{5}$/, 'Please enter a valid pincode']
  },
  // Zone capacity and limits
  capacity: {
    maxDailyPickups: {
      type: Number,
      required: [true, 'Maximum daily pickups is required'],
      min: [1, 'Maximum daily pickups must be at least 1']
    },
    maxDailyWasteKg: {
      type: Number,
      required: [true, 'Maximum daily waste capacity is required'],
      min: [100, 'Maximum daily waste capacity must be at least 100 KG']
    },
    populationDensity: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high'],
      default: 'medium'
    }
  },
  // Service availability
  serviceHours: {
    start: {
      type: String,
      required: [true, 'Service start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    end: {
      type: String,
      required: [true, 'Service end time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  // Zone manager/supervisor
  supervisor: {
    name: String,
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email']
    }
  },
  // Statistics and metrics
  statistics: {
    totalPickupsCompleted: {
      type: Number,
      default: 0,
      min: [0, 'Total pickups cannot be negative']
    },
    totalWasteCollected: {
      type: Number,
      default: 0, // in kg
      min: [0, 'Total waste collected cannot be negative']
    },
    averageResponseTime: {
      type: Number,
      default: 0 // in minutes
    },
    customerSatisfactionRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    activeWorkers: {
      type: Number,
      default: 0,
      min: [0, 'Active workers cannot be negative']
    },
    activeCitizens: {
      type: Number,
      default: 0,
      min: [0, 'Active citizens cannot be negative']
    }
  },
  // Zone status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Special configurations
  configuration: {
    allowOverCapacity: {
      type: Boolean,
      default: false
    },
    requirePreBooking: {
      type: Boolean,
      default: false
    },
    emergencyContactsEnabled: {
      type: Boolean,
      default: true
    },
    autoAssignmentEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for geospatial queries and performance
zoneSchema.index({ boundary: '2dsphere' }); // Main geospatial index for area queries
zoneSchema.index({ centerPoint: '2dsphere' }); // Center point for distance queries
zoneSchema.index({ code: 1 }, { unique: true }); // Zone code lookup
zoneSchema.index({ name: 1 }, { unique: true }); // Zone name lookup
zoneSchema.index({ city: 1, state: 1 }); // Administrative queries
zoneSchema.index({ pincode: 1 }); // Pincode-based queries
zoneSchema.index({ isActive: 1, priority: 1 }); // Active zone queries
zoneSchema.index({ 'capacity.populationDensity': 1 }); // Density-based queries

// Virtual for area in square kilometers (approximate)
zoneSchema.virtual('areaKm2').get(function() {
  // This is a simplified calculation and should be replaced with proper area calculation
  // For now, we'll return a placeholder
  return 'calculated_area_km2';
});

// Virtual for center coordinates in lat/lng format
zoneSchema.virtual('centerCoordinates').get(function() {
  return {
    latitude: this.centerPoint.coordinates[1],
    longitude: this.centerPoint.coordinates[0]
  };
});

// Virtual for capacity utilization percentage
zoneSchema.virtual('capacityUtilization').get(function() {
  if (this.capacity.maxDailyPickups === 0) return 0;
  // This would typically be calculated based on current day's bookings
  return Math.round((this.statistics.totalPickupsCompleted / this.capacity.maxDailyPickups) * 100);
});

// Virtual for formatted service hours
zoneSchema.virtual('formattedServiceHours').get(function() {
  return `${this.serviceHours.start} - ${this.serviceHours.end}`;
});

// Pre-save middleware
zoneSchema.pre('save', function(next) {
  // Auto-generate zone code if not provided
  if (!this.code && this.name) {
    this.code = this.name.replace(/\s+/g, '_').toUpperCase().substring(0, 10);
  }
  
  // Calculate center point from boundary if not provided
  if (!this.centerPoint.coordinates && this.boundary.coordinates && this.boundary.coordinates[0]) {
    const coords = this.boundary.coordinates[0];
    let totalLng = 0, totalLat = 0;
    const numPoints = coords.length - 1; // Exclude the closing point
    
    for (let i = 0; i < numPoints; i++) {
      totalLng += coords[i][0];
      totalLat += coords[i][1];
    }
    
    this.centerPoint.coordinates = [totalLng / numPoints, totalLat / numPoints];
  }
  
  next();
});

// Instance methods
zoneSchema.methods.isPointInZone = function(longitude, latitude) {
  // This would use MongoDB's geospatial query to check if a point is within the zone
  // For now, returning a placeholder
  return mongoose.model('Zone').findOne({
    _id: this._id,
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    }
  }).then(result => !!result);
};

zoneSchema.methods.updateStatistics = function(pickupsCompleted = 0, wasteCollectedKg = 0, responseTimeMinutes = 0) {
  this.statistics.totalPickupsCompleted += pickupsCompleted;
  this.statistics.totalWasteCollected += wasteCollectedKg;
  
  // Update average response time
  if (responseTimeMinutes > 0 && pickupsCompleted > 0) {
    const totalResponseTime = this.statistics.averageResponseTime * (this.statistics.totalPickupsCompleted - pickupsCompleted) + 
                             (responseTimeMinutes * pickupsCompleted);
    this.statistics.averageResponseTime = totalResponseTime / this.statistics.totalPickupsCompleted;
  }
  
  return this.save();
};

zoneSchema.methods.canAcceptMorePickups = function(additionalPickups = 1, additionalWasteKg = 0) {
  // This would typically check today's bookings against capacity
  // For now, using the total statistics as a simple check
  const wouldExceedPickupCapacity = this.capacity.allowOverCapacity ? false : 
    (this.statistics.totalPickupsCompleted + additionalPickups) > this.capacity.maxDailyPickups;
  
  const wouldExceedWasteCapacity = this.capacity.allowOverCapacity ? false :
    (this.statistics.totalWasteCollected + additionalWasteKg) > this.capacity.maxDailyWasteKg;
  
  return {
    canAccept: !wouldExceedPickupCapacity && !wouldExceedWasteCapacity,
    reasons: {
      pickupCapacityExceeded: wouldExceedPickupCapacity,
      wasteCapacityExceeded: wouldExceedWasteCapacity
    }
  };
};

// Static methods
zoneSchema.statics.findZoneByLocation = function(longitude, latitude) {
  return this.findOne({
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    },
    isActive: true
  });
};

zoneSchema.statics.findNearbyZones = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    centerPoint: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    },
    isActive: true
  });
};

zoneSchema.statics.getZoneStatistics = function(zoneId = null) {
  const matchStage = { isActive: true };
  if (zoneId) matchStage._id = mongoose.Types.ObjectId(zoneId);
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: zoneId ? '$_id' : null,
        totalZones: { $sum: 1 },
        totalCapacity: { $sum: '$capacity.maxDailyPickups' },
        totalWasteCapacity: { $sum: '$capacity.maxDailyWasteKg' },
        totalPickupsCompleted: { $sum: '$statistics.totalPickupsCompleted' },
        totalWasteCollected: { $sum: '$statistics.totalWasteCollected' },
        averageResponseTime: { $avg: '$statistics.averageResponseTime' },
        averageSatisfactionRating: { $avg: '$statistics.customerSatisfactionRating' },
        totalActiveWorkers: { $sum: '$statistics.activeWorkers' },
        totalActiveCitizens: { $sum: '$statistics.activeCitizens' }
      }
    }
  ]);
};

zoneSchema.statics.findHighPriorityZones = function() {
  return this.find({
    priority: { $in: ['high', 'critical'] },
    isActive: true
  }).sort({ priority: -1, 'statistics.customerSatisfactionRating': 1 });
};

module.exports = mongoose.model('Zone', zoneSchema);