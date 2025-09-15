const mongoose = require('mongoose');

const officeSchema = new mongoose.Schema({
  officeName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  officeCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    sparse: true  // Allow null/undefined values while maintaining uniqueness
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    area: {  // Add area/locality field as shown in the form
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      match: /^[0-9]{6}$/
    }
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  coverageArea: {
    radius: {
      type: Number,
      default: 5, // km
      min: 1,
      max: 50
    },
    zones: [String] // Area zones covered by this office
  },
  contactInfo: {
    phone: {
      type: String,
      match: /^[0-9]{10}$/
    },
    email: {
      type: String,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    website: String
  },
  clientNumber: {
    type: String,
    unique: true,
    sparse: true,  // This allows null values while maintaining uniqueness for non-null values
    trim: true,
    match: /^[A-Z0-9]{8}$/, // Example: 8 alphanumeric characters, all caps
  },
  operationalHours: {
    startTime: {
      type: String,
      default: '08:00'
    },
    endTime: {
      type: String,
      default: '18:00'
    },
    workingDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  statistics: {
    totalWorkers: {
      type: Number,
      default: 0
    },
    activeWorkers: {
      type: Number,
      default: 0
    },
    totalPickups: {
      type: Number,
      default: 0
    },
    totalWasteCollected: {
      type: Number,
      default: 0 // in kg
    },
    totalIncentivesPaid: {
      type: Number,
      default: 0 // in rupees
    }
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

// Auto-generate office code if not provided
officeSchema.pre('save', async function(next) {
  // Update timestamp
  this.updatedAt = Date.now();
  
  // Auto-generate office code if not provided
  if (!this.officeCode) {
    // Generate a unique office code based on city and timestamp
    const cityCode = this.address.city.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    this.officeCode = `${cityCode}${timestamp}${randomNum}`;
  }
  
  next();
});

// Index for efficient queries (officeCode already has unique: true, sparse: true)
officeSchema.index({ 'address.city': 1 });
officeSchema.index({ status: 1 });
officeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Office', officeSchema);