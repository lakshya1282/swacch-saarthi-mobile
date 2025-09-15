const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const officeOperatorSchema = new mongoose.Schema({
  // Personal Information
  personalInfo: {
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
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    designation: {
      type: String,
      required: true,
      enum: ['Office Manager', 'Operations Manager', 'Supervisor', 'Data Operator', 'Admin Officer', 'Field Coordinator']
    },
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: {
        type: String,
        match: /^[0-9]{6}$/
      }
    }
  },
  
  // Authentication
  authentication: {
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    lastLogin: Date,
    passwordChangedAt: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  
  // Office Association
  officeInfo: {
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Office',
      required: true
    },
    department: {
      type: String,
      enum: ['Operations', 'Monitoring', 'Analytics', 'Field Management', 'Administration'],
      default: 'Operations'
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfficeOperator'
    }
  },
  
  // Permissions and Access
  permissions: {
    dashboardAccess: {
      type: Boolean,
      default: true
    },
    workerManagement: {
      type: Boolean,
      default: false
    },
    incentiveManagement: {
      type: Boolean,
      default: false
    },
    reportGeneration: {
      type: Boolean,
      default: false
    },
    systemSettings: {
      type: Boolean,
      default: false
    },
    realTimeMonitoring: {
      type: Boolean,
      default: true
    }
  },
  
  // Activity Tracking
  activity: {
    lastActiveAt: Date,
    sessionsCount: {
      type: Number,
      default: 0
    },
    totalHoursWorked: {
      type: Number,
      default: 0
    },
    actionsPerformed: {
      type: Number,
      default: 0
    },
    workersMonitored: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker'
    }]
  },
  
  // Status and Settings
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'on_leave'],
    default: 'active'
  },
  
  preferences: {
    dashboardTheme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    refreshInterval: {
      type: Number,
      default: 30 // seconds
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

// Password hashing middleware
officeOperatorSchema.pre('save', async function(next) {
  if (!this.isModified('authentication.password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.authentication.password = await bcrypt.hash(this.authentication.password, salt);
    this.authentication.passwordChangedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp
officeOperatorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Password comparison method
officeOperatorSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.authentication.password);
};

// Check if account is locked
officeOperatorSchema.virtual('isLocked').get(function() {
  return !!(this.authentication.lockUntil && this.authentication.lockUntil > Date.now());
});

// Increment login attempts
officeOperatorSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.authentication.lockUntil && this.authentication.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        'authentication.lockUntil': 1,
      },
      $set: {
        'authentication.loginAttempts': 1,
      }
    });
  }
  
  const updates = { $inc: { 'authentication.loginAttempts': 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.authentication.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      'authentication.lockUntil': Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// Get full name
officeOperatorSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Get display info
officeOperatorSchema.virtual('displayInfo').get(function() {
  return {
    name: this.fullName,
    employeeId: this.personalInfo.employeeId,
    designation: this.personalInfo.designation,
    email: this.personalInfo.email,
    office: this.officeInfo.officeId
  };
});

// Indexes for efficient queries (employeeId and email already have unique: true)
officeOperatorSchema.index({ 'officeInfo.officeId': 1 });
officeOperatorSchema.index({ status: 1 });

module.exports = mongoose.model('OfficeOperator', officeOperatorSchema);