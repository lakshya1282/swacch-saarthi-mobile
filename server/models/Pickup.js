const mongoose = require('mongoose');

const pickupSchema = new mongoose.Schema({
  pickupId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  verificationCode: {
    type: String,
    required: true
  },
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    default: 'Customer'
  },
  customerAddress: {
    type: String,
    default: 'Address'
  },
  customerPhone: {
    type: String,
    default: 'Phone'
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  wasteTypes: [{
    type: String,
    enum: ['dry', 'wet', 'hazardous'],
    required: true
  }],
  estimatedWeight: {
    type: String,
    required: true
  },
  actualWeight: {
    type: Number,
    default: null // in kg, filled when pickup is completed
  },
  timeSlot: {
    type: String,
    enum: ['morning', 'midday', 'afternoon', 'evening'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  specialInstructions: {
    type: String,
    maxlength: 500,
    default: ''
  },
  status: {
    type: String,
    enum: ['scheduled', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Pickup location (usually same as citizen's address but can be different)
  pickupLocation: {
    address: String,
    latitude: Number,
    longitude: Number
  },
  // QR code data for confirmation
  qrConfirmation: {
    type: String,
    default: null
  },
  // Completion notes from worker
  completionNotes: {
    type: String,
    default: ''
  },
  // QR verification status
  qrVerified: {
    type: Boolean,
    default: false
  },
  // Images of waste (before and after pickup)
  images: {
    before: [String], // Array of image URLs
    after: [String]   // Array of image URLs
  },
  // Ratings and feedback
  citizenRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      maxlength: 500,
      default: ''
    },
    ratedAt: {
      type: Date,
      default: null
    }
  },
  workerRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      maxlength: 500,
      default: ''
    },
    ratedAt: {
      type: Date,
      default: null
    }
  },
  // Tracking information
  assignedAt: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  // Payment information
  cost: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet'],
    default: null
  },
  // Cancellation information
  cancellationReason: {
    type: String,
    maxlength: 200,
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['citizen', 'worker', 'admin', 'system'],
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  // Metadata
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
pickupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
pickupSchema.index({ citizenId: 1, createdAt: -1 });
pickupSchema.index({ workerId: 1, status: 1 });
pickupSchema.index({ status: 1, scheduledDate: 1 });
pickupSchema.index({ 'pickupLocation.latitude': 1, 'pickupLocation.longitude': 1 });

// Compound unique index to prevent race conditions in task assignment
// Only one pickup can be assigned per status change
pickupSchema.index({ _id: 1, status: 1 }, { 
  partialFilterExpression: { status: { $in: ['assigned', 'in_progress'] } }
});

// Virtual for total duration
pickupSchema.virtual('duration').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / (1000 * 60)); // Duration in minutes
  }
  return null;
});

// Method to check if pickup is overdue
pickupSchema.methods.isOverdue = function() {
  const now = new Date();
  const scheduledEnd = new Date(this.scheduledDate);
  
  // Add time slot duration (assuming 4 hours per slot)
  scheduledEnd.setHours(scheduledEnd.getHours() + 4);
  
  return now > scheduledEnd && !['completed', 'cancelled'].includes(this.status);
};

// Method to calculate estimated cost based on waste type and weight
pickupSchema.methods.calculateCost = function() {
  const baseCost = 10; // Base cost in rupees
  const rates = {
    dry: 2,     // Rs 2 per kg
    wet: 1.5,   // Rs 1.5 per kg
    hazardous: 5 // Rs 5 per kg
  };
  
  let totalCost = baseCost;
  
  if (this.actualWeight) {
    this.wasteTypes.forEach(type => {
      totalCost += (this.actualWeight / this.wasteTypes.length) * rates[type];
    });
  }
  
  return Math.round(totalCost);
};

// Method to get time slot details
pickupSchema.methods.getTimeSlotDetails = function() {
  const timeSlots = {
    morning: { start: '06:00', end: '10:00', label: '6:00 AM - 10:00 AM' },
    midday: { start: '10:00', end: '14:00', label: '10:00 AM - 2:00 PM' },
    afternoon: { start: '14:00', end: '18:00', label: '2:00 PM - 6:00 PM' },
    evening: { start: '18:00', end: '20:00', label: '6:00 PM - 8:00 PM' }
  };
  
  return timeSlots[this.timeSlot] || null;
};

// Static method to get pickup statistics
pickupSchema.statics.getStatistics = function(dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalPickups: { $sum: 1 },
        completedPickups: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledPickups: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalWeight: { $sum: '$actualWeight' },
        averageRating: { $avg: '$citizenRating.rating' }
      }
    }
  ]);
};

// Static method to find pickups needing assignment
pickupSchema.statics.findUnassigned = function() {
  return this.find({
    status: 'scheduled',
    workerId: null,
    scheduledDate: { $gte: new Date() }
  }).populate('citizenId', 'firstName lastName phone address location');
};

// Static method to find nearby pickups for a worker
pickupSchema.statics.findNearbyPickups = function(latitude, longitude, maxDistance = 5) {
  return this.find({
    status: { $in: ['scheduled', 'assigned'] },
    'pickupLocation.latitude': {
      $gte: latitude - (maxDistance / 111), // Rough conversion from km to degrees
      $lte: latitude + (maxDistance / 111)
    },
    'pickupLocation.longitude': {
      $gte: longitude - (maxDistance / 111),
      $lte: longitude + (maxDistance / 111)
    }
  }).populate('citizenId', 'firstName lastName phone');
};

// Static method for atomic task acceptance with race condition prevention
pickupSchema.statics.acceptTaskAtomically = async function(taskId, workerId, workerName) {
  const session = await this.db.startSession();
  
  try {
    return await session.withTransaction(async () => {
      // Find the pickup and ensure it's still available
      const pickup = await this.findOne({
        $or: [
          { _id: taskId },
          { pickupId: taskId }
        ],
        status: { $in: ['scheduled', 'pending'] }, // Only accept if still pending
        workerId: null // Ensure no worker is already assigned
      }).session(session);
      
      if (!pickup) {
        // Task not found or already assigned
        return {
          success: false,
          error: 'TASK_NOT_AVAILABLE',
          message: 'This task is no longer available or has already been accepted by another worker.'
        };
      }
      
      // Atomically update the pickup with worker assignment
      const updateResult = await this.findOneAndUpdate(
        {
          _id: pickup._id,
          status: { $in: ['scheduled', 'pending'] },
          workerId: null
        },
        {
          status: 'assigned',
          workerId: workerId,
          assignedAt: new Date(),
          // Store worker name for display purposes
          assignedWorkerName: workerName
        },
        {
          new: true,
          session: session
        }
      );
      
      if (!updateResult) {
        // Race condition: task was accepted by another worker between our checks
        return {
          success: false,
          error: 'RACE_CONDITION',
          message: 'Another worker has just accepted this task. Please try a different task.'
        };
      }
      
      return {
        success: true,
        pickup: updateResult,
        message: 'Task accepted successfully!'
      };
    });
  } catch (error) {
    console.error('Error in atomic task acceptance:', error);
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Failed to accept task due to database error. Please try again.'
    };
  } finally {
    await session.endSession();
  }
};

// Static method to check if a task is still available
pickupSchema.statics.isTaskAvailable = function(taskId) {
  return this.findOne({
    $or: [
      { _id: taskId },
      { pickupId: taskId }
    ],
    status: { $in: ['scheduled', 'pending'] },
    workerId: null
  });
};

module.exports = mongoose.model('Pickup', pickupSchema);
