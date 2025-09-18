const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Pickup = require('../models/Pickup');
const User = require('../models/User');

console.log('✅ Pickup routes initialized with MongoDB database storage');

/**
 * Generate unique pickup ID
 */
const generatePickupId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `PU${timestamp.toUpperCase()}${random.toUpperCase()}`;
};

/**
 * Generate verification code
 */
const generateVerificationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Get all pickups
 * GET /api/pickups
 */
router.get('/', async (req, res) => {
  try {
    const pickups = await Pickup.find()
      .populate('citizenId', 'firstName lastName email phone')
      .populate('workerId', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: pickups,
      count: pickups.length
    });
  } catch (error) {
    console.error('Error fetching pickups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickups',
      error: error.message
    });
  }
});

/**
 * Schedule a new pickup
 * POST /api/pickups/schedule
 */
router.post('/schedule', async (req, res) => {
  try {
    const {
      pickupId, // Accept client-generated pickup ID
      userId,
      customerName,
      customerPhone,
      customerAddress,
      customerPincode,
      wasteTypes,
      estimatedWeight,
      timeSlot,
      specialInstructions,
      location,
      address,
      scheduledDate,
      scheduledTime,
      wasteImages,
      timestamp,
      createdAt
    } = req.body;

    // Validate required fields
    if (!wasteTypes || wasteTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one waste type'
      });
    }

    if (!timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Please select a time slot'
      });
    }

    if (!estimatedWeight) {
      return res.status(400).json({
        success: false,
        message: 'Please provide estimated weight'
      });
    }

    // Use client-provided pickup ID or generate new one
    const finalPickupId = pickupId || generatePickupId();
    const verificationCode = generateVerificationCode();
    
    // Check if pickup already exists (for retry/sync scenarios)
    const existingPickup = await Pickup.findOne({ pickupId: finalPickupId });
    
    if (existingPickup) {
      console.log(`📝 Pickup ${finalPickupId} already exists, updating...`);
      
      // Update existing pickup with new data
      existingPickup.customerName = customerName || existingPickup.customerName;
      existingPickup.customerPhone = customerPhone || existingPickup.customerPhone;
      existingPickup.customerAddress = customerAddress || existingPickup.customerAddress;
      existingPickup.wasteTypes = mapWasteTypes(wasteTypes);
      existingPickup.estimatedWeight = estimatedWeight;
      existingPickup.timeSlot = mapTimeSlot(timeSlot);
      existingPickup.specialInstructions = specialInstructions || existingPickup.specialInstructions;
      existingPickup.pickupLocation = location ? {
        address: address || customerAddress,
        latitude: location.latitude,
        longitude: location.longitude
      } : existingPickup.pickupLocation;
      existingPickup.scheduledDate = scheduledDate || existingPickup.scheduledDate;
      existingPickup.updatedAt = new Date();
      
      await existingPickup.save();
      
      // Return success response for updated pickup
      return res.status(200).json({
        success: true,
        message: 'Pickup updated successfully',
        data: {
          pickupId: existingPickup.pickupId,
          verificationCode: existingPickup.verificationCode,
          status: existingPickup.status,
          scheduledDate: existingPickup.scheduledDate,
          timeSlot: existingPickup.timeSlot,
          qrCodeData: {
            pickupId: existingPickup.pickupId,
            userId: existingPickup.citizenId,
            verificationCode: existingPickup.verificationCode
          },
          estimatedArrival: 'Within ' + timeSlot
        }
      });
    }

    // Get citizen ID from userId or create anonymous citizen
    let citizenId = null;
    if (userId && userId !== 'GUEST' && userId !== 'null') {
      // Try to find user in database
      const user = await User.findOne({ 
        $or: [
          { _id: userId },
          { email: userId },
          { phone: userId }
        ]
      });
      
      if (user) {
        citizenId = user._id;
      } else {
        // Create a new citizen user if not found
        const cleanPhone = customerPhone ? customerPhone.replace(/[^0-9]/g, '') : '';
        const validPhone = cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone) 
          ? cleanPhone 
          : `${6 + Math.floor(Math.random() * 4)}${Math.floor(Math.random() * 900000000) + 100000000}`;
        
        const newUser = new User({
          firstName: customerName?.split(' ')[0] || 'Guest',
          lastName: customerName?.split(' ').slice(1).join(' ') || 'User',
          email: `guest_${Date.now()}@wasteapp.com`,
          phone: validPhone,
          password: Math.random().toString(36).substr(2, 10), // Random password
          userType: 'citizen',
          address: customerAddress || address || 'Address not specified',
          pincode: customerPincode || '560001', // Default Bangalore pincode
          location: location || { latitude: 12.9716, longitude: 77.5946 } // Default Bangalore coordinates
        });
        
        await newUser.save();
        citizenId = newUser._id;
        console.log(`Created new citizen user: ${citizenId}`);
      }
    } else {
      // Create anonymous user for guest pickups
      const cleanPhone = customerPhone ? customerPhone.replace(/[^0-9]/g, '') : '';
      const validPhone = cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone) 
        ? cleanPhone 
        : `${6 + Math.floor(Math.random() * 4)}${Math.floor(Math.random() * 900000000) + 100000000}`;
      
      const guestUser = new User({
        firstName: 'Guest',
        lastName: `User_${Date.now()}`,
        email: `guest_${Date.now()}@wasteapp.com`,
        phone: validPhone,
        password: Math.random().toString(36).substr(2, 10),
        userType: 'citizen',
        address: customerAddress || address || 'Address not specified',
        pincode: customerPincode || '560001', // Default Bangalore pincode
        location: location || { latitude: 12.9716, longitude: 77.5946 } // Default Bangalore coordinates
      });
      
      await guestUser.save();
      citizenId = guestUser._id;
      console.log(`Created guest user: ${citizenId}`);
    }

    // Create pickup document
    const pickupData = new Pickup({
      pickupId: finalPickupId,
      verificationCode: verificationCode,
      citizenId: citizenId,
      customerName: customerName || `User ${userId || 'Guest'}`,
      customerPhone: customerPhone || 'Not provided',
      customerAddress: customerAddress || address || 'Address not specified',
      wasteTypes: mapWasteTypes(wasteTypes),
      estimatedWeight: estimatedWeight,
      timeSlot: mapTimeSlot(timeSlot),
      specialInstructions: specialInstructions || 'None',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      status: 'scheduled',  // Start with scheduled status
      pickupLocation: location ? {
        address: address || customerAddress,
        latitude: location.latitude,
        longitude: location.longitude
      } : undefined,
      images: {
        before: wasteImages || []
      },
      createdAt: createdAt ? new Date(createdAt) : new Date()
    });

    // Save to database
    await pickupData.save();
    
    console.log(`✅ New pickup scheduled in database: ${pickupData.pickupId} for citizen ${citizenId}`);

    // Return success response with QR code data
    res.status(201).json({
      success: true,
      message: 'Pickup scheduled successfully and saved to database',
      data: {
        pickupId: pickupData.pickupId,
        verificationCode: pickupData.verificationCode,
        status: pickupData.status,
        scheduledDate: pickupData.scheduledDate,
        timeSlot: pickupData.timeSlot,
        qrCodeData: {
          pickupId: pickupData.pickupId,
          userId: citizenId,
          customerName: pickupData.customerName,
          wasteTypes: wasteTypes,
          estimatedWeight: pickupData.estimatedWeight,
          timeSlot: timeSlot,
          scheduledDate: pickupData.scheduledDate,
          location: location,
          verificationCode: pickupData.verificationCode
        },
        estimatedArrival: 'Within ' + (timeSlot || 'scheduled time slot')
      }
    });

  } catch (error) {
    console.error('Error scheduling pickup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule pickup',
      error: error.message
    });
  }
});

/**
 * Get real-time pickup schedules
 * GET /api/pickups/schedules
 */
router.get('/schedules', async (req, res) => {
  try {
    // Get all pending and scheduled pickups
    const availablePickups = await Pickup.find({
      status: { $in: ['scheduled', 'pending'] },
      workerId: null
    })
    .populate('citizenId', 'firstName lastName phone address location')
    .sort({ createdAt: -1 });
    
    // Transform for client display
    const schedules = availablePickups.map(pickup => {
      // Calculate distance (mock for demo)
      const distances = ['1.2 km', '2.5 km', '3.8 km', '4.5 km', '5.2 km'];
      const areas = ['MG Road', 'Koramangala', 'Whitefield', 'Indiranagar', 'Hebbal', 'Jayanagar', 'BTM Layout'];
      const randomIndex = Math.floor(Math.random() * distances.length);
      
      // Determine urgency
      let urgency = 'normal';
      const timeSlotDetails = pickup.getTimeSlotDetails();
      if (timeSlotDetails) {
        const currentHour = new Date().getHours();
        const slotHour = parseInt(timeSlotDetails.start.split(':')[0]);
        if (Math.abs(slotHour - currentHour) <= 2) {
          urgency = 'urgent';
        } else if (Math.abs(slotHour - currentHour) <= 4) {
          urgency = 'high';
        }
      }
      
      return {
        _id: pickup._id,
        pickupId: pickup.pickupId,
        customerName: pickup.customerName || (pickup.citizenId ? `${pickup.citizenId.firstName} ${pickup.citizenId.lastName}` : 'Customer'),
        customerPhone: pickup.customerPhone || pickup.citizenId?.phone || '+91 XXXXXXXXXX',
        address: pickup.pickupLocation?.address || pickup.customerAddress,
        location: pickup.pickupLocation || pickup.citizenId?.location,
        wasteTypes: pickup.wasteTypes,
        estimatedWeight: pickup.estimatedWeight,
        timeSlot: pickup.timeSlot,
        scheduledDate: pickup.scheduledDate,
        specialInstructions: pickup.specialInstructions,
        estimatedEarnings: 50 + (Math.floor(Math.random() * 3) * 10), // 50-80 rupees
        distance: distances[randomIndex],
        area: areas[randomIndex % areas.length],
        urgency: urgency,
        status: pickup.status,
        createdAt: pickup.createdAt,
        lastUpdated: pickup.updatedAt || pickup.createdAt
      };
    });
    
    res.json({
      success: true,
      data: schedules,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching real-time pickup schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickup schedules',
      error: error.message
    });
  }
});

/**
 * Get pickup details by ID
 * GET /api/pickups/:pickupId
 */
router.get('/:pickupId', async (req, res) => {
  try {
    const { pickupId } = req.params;
    let pickup = null;
    
    // Check if pickupId is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(pickupId) && pickupId.match(/^[0-9a-fA-F]{24}$/)) {
      // Try to find by MongoDB _id
      pickup = await Pickup.findById(pickupId)
        .populate('citizenId', 'firstName lastName email phone address')
        .populate('workerId', 'firstName lastName email phone');
    }
    
    // If not found or not a valid ObjectId, try by pickupId field
    if (!pickup) {
      pickup = await Pickup.findOne({ pickupId: pickupId })
        .populate('citizenId', 'firstName lastName email phone address')
        .populate('workerId', 'firstName lastName email phone');
    }
    
    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }
    
    res.json({
      success: true,
      data: pickup
    });
    
  } catch (error) {
    console.error('Error fetching pickup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickup details',
      error: error.message
    });
  }
});

/**
 * Get user's pickup history with comprehensive data
 * GET /api/pickups/user/:userId
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user first
    const user = await User.findOne({
      $or: [
        { _id: userId },
        { email: userId },
        { phone: userId }
      ]
    });
    
    if (!user) {
      return res.json({
        success: true,
        data: [],
        stats: {
          total: 0,
          pending: 0,
          assigned: 0,
          'in-progress': 0,
          completed: 0,
          cancelled: 0
        },
        message: 'No pickup history found for this user'
      });
    }
    
    // Get all pickups for this user
    const userPickups = await Pickup.find({ citizenId: user._id })
      .populate('workerId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Transform and add calculated fields
    const transformedPickups = userPickups.map(pickup => ({
      ...pickup.toObject(),
      timeAgo: getTimeAgo(pickup.createdAt),
      statusText: getStatusText(pickup.status),
      timeSlotDetails: pickup.getTimeSlotDetails()
    }));
    
    // Calculate summary stats
    const stats = {
      total: transformedPickups.length,
      scheduled: transformedPickups.filter(p => p.status === 'scheduled').length,
      assigned: transformedPickups.filter(p => p.status === 'assigned').length,
      'in_progress': transformedPickups.filter(p => p.status === 'in_progress').length,
      completed: transformedPickups.filter(p => p.status === 'completed').length,
      cancelled: transformedPickups.filter(p => p.status === 'cancelled').length
    };
    
    res.json({
      success: true,
      data: transformedPickups,
      stats: stats,
      message: `Retrieved ${transformedPickups.length} pickup records from database`
    });
    
  } catch (error) {
    console.error('Error fetching user pickups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickup history',
      error: error.message
    });
  }
});

/**
 * Update pickup status (for workers)
 * PUT /api/pickups/:pickupId/status
 */
router.put('/:pickupId/status', async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { status, workerId, notes } = req.body;
    
    // Find pickup
    let pickup = await Pickup.findById(pickupId);
    
    if (!pickup) {
      pickup = await Pickup.findOne({ pickupId: pickupId });
    }
    
    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }
    
    // Update pickup status
    pickup.status = status;
    pickup.updatedAt = new Date();
    
    if (workerId) {
      pickup.workerId = workerId;
      pickup.assignedAt = new Date();
    }
    
    if (notes) {
      pickup.completionNotes = notes;
    }
    
    if (status === 'completed') {
      pickup.completedAt = new Date();
    } else if (status === 'cancelled') {
      pickup.cancelledAt = new Date();
      pickup.cancelledBy = 'worker';
    } else if (status === 'in_progress') {
      pickup.startedAt = new Date();
    }
    
    await pickup.save();
    
    res.json({
      success: true,
      message: 'Pickup status updated successfully',
      data: pickup
    });
    
  } catch (error) {
    console.error('Error updating pickup status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pickup status',
      error: error.message
    });
  }
});

/**
 * Get worker-specific tasks (excluding available/scheduled tasks)
 * GET /api/pickups/worker/:workerId/tasks
 */
router.get('/worker/:workerId/tasks', async (req, res) => {
  try {
    const { workerId } = req.params;
    
    // Validate worker ID
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }
    
    // Find all pickups assigned to this worker (excluding 'scheduled' status which means available)
    const workerTasks = await Pickup.find({
      workerId: workerId,
      status: { $ne: 'scheduled' } // Exclude 'scheduled' (available) status
    })
    .populate('citizenId', 'firstName lastName email phone address')
    .sort({ 
      // Sort by status priority: in_progress first, then assigned, then completed
      status: 1,
      createdAt: -1 
    });
    
    // Transform the tasks to include additional information
    const transformedTasks = workerTasks.map(task => {
      const taskObj = task.toObject();
      
      // Add human-readable status
      let statusLabel = '';
      let statusColor = '';
      switch(task.status) {
        case 'assigned':
          statusLabel = 'Assigned';
          statusColor = 'orange';
          break;
        case 'in_progress':
          statusLabel = 'In Progress';
          statusColor = 'blue';
          break;
        case 'completed':
          statusLabel = 'Completed';
          statusColor = 'green';
          break;
        case 'cancelled':
          statusLabel = 'Cancelled';
          statusColor = 'red';
          break;
        default:
          statusLabel = task.status;
          statusColor = 'gray';
      }
      
      return {
        ...taskObj,
        statusLabel,
        statusColor,
        customerName: task.citizenId ? 
          `${task.citizenId.firstName} ${task.citizenId.lastName}` : 
          task.customerName || 'Unknown Customer',
        customerPhone: task.citizenId?.phone || task.customerPhone || 'N/A',
        customerAddress: task.citizenId?.address || task.customerAddress || task.pickupLocation?.address || 'Address not specified',
        timeAgo: getTimeAgo(task.createdAt),
        assignedTimeAgo: task.assignedAt ? getTimeAgo(task.assignedAt) : null,
        completedTimeAgo: task.completedAt ? getTimeAgo(task.completedAt) : null
      };
    });
    
    // Calculate statistics
    const stats = {
      total: transformedTasks.length,
      assigned: transformedTasks.filter(t => t.status === 'assigned').length,
      inProgress: transformedTasks.filter(t => t.status === 'in_progress').length,
      completed: transformedTasks.filter(t => t.status === 'completed').length,
      cancelled: transformedTasks.filter(t => t.status === 'cancelled').length,
      todayTasks: transformedTasks.filter(t => {
        const taskDate = new Date(t.scheduledDate || t.createdAt);
        const today = new Date();
        return taskDate.toDateString() === today.toDateString();
      }).length
    };
    
    console.log(`📋 Found ${transformedTasks.length} tasks for worker ${workerId}`);
    
    res.json({
      success: true,
      data: transformedTasks,
      stats: stats,
      workerId: workerId,
      message: `Retrieved ${transformedTasks.length} tasks for worker`
    });
    
  } catch (error) {
    console.error('Error fetching worker tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker tasks',
      error: error.message
    });
  }
});

/**
 * Verify QR code (for workers)
 * POST /api/pickups/verify-qr
 */
router.post('/verify-qr', async (req, res) => {
  try {
    const { qrCodeData } = req.body;
    
    if (!qrCodeData || !qrCodeData.pickupId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code data'
      });
    }
    
    const pickup = await Pickup.findOne({ 
      pickupId: qrCodeData.pickupId 
    }).populate('citizenId', 'firstName lastName phone');
    
    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }
    
    // Verify QR code matches
    const isValid = pickup.verificationCode === qrCodeData.verificationCode;
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QR code'
      });
    }
    
    // Mark as QR verified
    pickup.qrVerified = true;
    await pickup.save();
    
    res.json({
      success: true,
      message: 'QR code verified successfully',
      data: {
        pickupId: pickup.pickupId,
        userId: pickup.citizenId?._id,
        wasteTypes: pickup.wasteTypes,
        estimatedWeight: pickup.estimatedWeight,
        specialInstructions: pickup.specialInstructions,
        status: pickup.status
      }
    });
    
  } catch (error) {
    console.error('Error verifying QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify QR code',
      error: error.message
    });
  }
});

/**
 * Cancel pickup
 * DELETE /api/pickups/:pickupId
 */
router.delete('/:pickupId', async (req, res) => {
  try {
    const { pickupId } = req.params;
    
    // Find pickup
    let pickup = await Pickup.findById(pickupId);
    
    if (!pickup) {
      pickup = await Pickup.findOne({ pickupId: pickupId });
    }
    
    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }
    
    // Check if pickup can be cancelled
    if (pickup.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed pickup'
      });
    }
    
    // Update status to cancelled
    pickup.status = 'cancelled';
    pickup.cancelledAt = new Date();
    pickup.cancelledBy = 'citizen';
    pickup.updatedAt = new Date();
    
    await pickup.save();
    
    res.json({
      success: true,
      message: 'Pickup cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling pickup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel pickup',
      error: error.message
    });
  }
});

// Helper functions

/**
 * Map waste types from frontend to database enum values
 */
const mapWasteTypes = (wasteTypes) => {
  if (!wasteTypes) return [];
  
  const typeMap = {
    'Dry Waste': 'dry',
    'Wet Waste': 'wet',
    'Hazardous': 'hazardous',
    'E-Waste': 'hazardous',
    'Recyclables': 'dry'
  };
  
  return wasteTypes.map(type => typeMap[type] || 'dry');
};

/**
 * Map time slot from frontend to database enum values
 */
const mapTimeSlot = (timeSlot) => {
  if (!timeSlot) return 'morning';
  
  const slotMap = {
    '6:00 AM - 10:00 AM': 'morning',
    '10:00 AM - 2:00 PM': 'midday',
    '2:00 PM - 6:00 PM': 'afternoon',
    '6:00 PM - 8:00 PM': 'evening'
  };
  
  // Check if it's already in the correct format
  if (['morning', 'midday', 'afternoon', 'evening'].includes(timeSlot)) {
    return timeSlot;
  }
  
  return slotMap[timeSlot] || 'morning';
};

/**
 * Helper function to get time ago text
 */
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
};

/**
 * Helper function to get status display text
 */
const getStatusText = (status) => {
  const statusMap = {
    'scheduled': 'Awaiting Assignment',
    'pending': 'Awaiting Assignment',
    'assigned': 'Worker Assigned',
    'in_progress': 'Pickup in Progress',
    'completed': 'Successfully Completed',
    'cancelled': 'Cancelled'
  };
  return statusMap[status] || status;
};

// Export router
module.exports = router;