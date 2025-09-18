const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
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
  alternativePhone: {
    type: String,
    required: false,
    sparse: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      maxlength: [100, 'Street address cannot exceed 100 characters']
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      maxlength: [50, 'Area cannot exceed 50 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[1-9][0-9]{5}$/, 'Please enter a valid pincode']
    },
    fullAddress: {
      type: String,
      required: false
    }
  },
  // GeoJSON Point format for MongoDB 2dsphere index
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
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Zone assignment is required'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: null
  },
  // Pickup statistics
  totalPickups: {
    type: Number,
    default: 0,
    min: [0, 'Total pickups cannot be negative']
  },
  totalWasteCollected: {
    type: Number,
    default: 0, // in kg
    min: [0, 'Total waste collected cannot be negative']
  },
  // Rating from workers
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
  },
  // Preferences
  preferences: {
    preferredTimeSlots: [{
      type: String,
      enum: ['06:00-09:00', '09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00']
    }],
    wasteTypes: [{
      type: String,
      enum: ['organic', 'recyclable', 'hazardous', 'electronic', 'mixed']
    }],
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  // Subscription details
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
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
citizenSchema.index({ location: '2dsphere' }); // Main geospatial index
citizenSchema.index({ zoneId: 1, isActive: 1 }); // Zone-based queries
citizenSchema.index({ email: 1 }, { unique: true });
citizenSchema.index({ phone: 1 }, { unique: true });
citizenSchema.index({ 'address.pincode': 1 }); // Pincode-based searches
citizenSchema.index({ createdAt: -1 }); // Recent registrations

// Virtual for full name
citizenSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for formatted address
citizenSchema.virtual('formattedAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.area}, ${addr.city} - ${addr.pincode}`;
});

// Virtual for coordinates in lat/lng format (for frontend)
citizenSchema.virtual('coordinates').get(function() {
  return {
    latitude: this.location.coordinates[1],
    longitude: this.location.coordinates[0]
  };
});

// Pre-save middleware
citizenSchema.pre('save', function(next) {
  // Generate full address
  if (this.isModified('address')) {
    const addr = this.address;
    this.address.fullAddress = `${addr.street}, ${addr.area}, ${addr.city} - ${addr.pincode}`;
  }
  next();
});

// Instance methods
citizenSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

citizenSchema.methods.incrementPickupStats = function(wasteKg = 0) {
  this.totalPickups += 1;
  this.totalWasteCollected += wasteKg;
  return this.save();
};

// Static methods
citizenSchema.statics.findByZone = function(zoneId, options = {}) {
  const query = { zoneId, isActive: true };
  if (options.verified) query.isVerified = true;
  return this.find(query);
};

citizenSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    location: {
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

citizenSchema.statics.getTopUsers = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ totalWasteCollected: -1, totalPickups: -1 })
    .limit(limit)
    .select('firstName lastName totalPickups totalWasteCollected rating');
};

// Remove sensitive data from JSON output
citizenSchema.methods.toJSON = function() {
  const citizen = this.toObject();
  delete citizen.password;
  return citizen;
};

module.exports = mongoose.model('Citizen', citizenSchema);