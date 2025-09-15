const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true,
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
    required: true,
    minlength: 6
  },
  address: {
    type: String,
    required: true,
    maxlength: 200
  },
  pincode: {
    type: String,
    required: true,
    match: [/^[1-9][0-9]{5}$/, 'Please enter a valid pincode']
  },
  userType: {
    type: String,
    enum: ['citizen', 'worker', 'admin'],
    required: true,
    default: 'citizen'
  },
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: null
  },
  trainingCompleted: {
    type: Boolean,
    default: false
  },
  totalPickups: {
    type: Number,
    default: 0
  },
  totalWasteCollected: {
    type: Number,
    default: 0 // in kg
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // Worker-specific fields
  workerId: {
    type: String,
    sparse: true, // Only for workers
    unique: true
  },
  vehicleType: {
    type: String,
    enum: ['bicycle', 'motorbike', 'van', 'truck'],
    required: false
  },
  licenseNumber: {
    type: String,
    required: false
  },
  assignedArea: {
    type: String,
    required: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    updatedAt: Date
  },
  // Office enrollment fields (for workers)
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Office',
    required: false
  },
  officeCode: {
    type: String,
    uppercase: true,
    trim: true,
    required: false
  },
  enrollmentStatus: {
    type: String,
    enum: ['not_enrolled', 'enrolled', 'pending_approval'],
    default: 'not_enrolled',
    index: true
  },
  enrolledAt: {
    type: Date,
    required: false
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

// Update updatedAt before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ 'currentLocation': '2dsphere' });

// Index for text search
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to calculate distance between two users
userSchema.methods.distanceTo = function(otherUser) {
  const R = 6371; // Earth's radius in km
  const dLat = (otherUser.location.latitude - this.location.latitude) * Math.PI / 180;
  const dLon = (otherUser.location.longitude - this.location.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.location.latitude * Math.PI / 180) * Math.cos(otherUser.location.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Method to update rating
userSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

// Static method to find nearby workers
userSchema.statics.findNearbyWorkers = function(latitude, longitude, maxDistance = 10) {
  return this.find({
    userType: 'worker',
    isActive: true,
    isAvailable: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    }
  });
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
