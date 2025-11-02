const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: false // Auto-generated in pre-save hook
  },
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  citizenName: {
    type: String,
    required: false,
    default: 'Citizen'
  },
  citizenEmail: {
    type: String,
    required: false,
    default: ''
  },
  citizenPhone: {
    type: String,
    required: false,
    default: ''
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Missed Pickup',
      'Improper Waste Collection',
      'Worker Behavior',
      'Damaged Bin',
      'Illegal Dumping',
      'Overflowing Bins',
      'Hazardous Waste Issue',
      'Delayed Service',
      'Other'
    ]
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  location: {
    address: {
      type: String,
      required: true
    },
    latitude: Number,
    longitude: Number
  },
  images: [{
    type: String // URLs or file paths
  }],
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed'],
    default: 'Pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Worker or Office Operator
  },
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    resolutionNotes: String,
    resolutionImages: [String]
  },
  timeline: [{
    status: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedByName: String,
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  },
  relatedPickupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pickup'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
complaintSchema.index({ citizenId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ complaintId: 1 });

// Generate complaint ID before saving
complaintSchema.pre('save', async function(next) {
  if (!this.complaintId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase();
    this.complaintId = `CMP${timestamp}${random}`;
  }
  next();
});

// Add timeline entry on status change
complaintSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      notes: `Status changed to ${this.status}`,
      timestamp: new Date()
    });
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
