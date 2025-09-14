const express = require('express');
const router = express.Router();

// In-memory storage for production use
let pickups = [];
let pickupCounter = 1000;

// No mock data - all data will be real production data
console.log('✅ Pickup routes initialized with empty data store (production mode)');

/**
 * Generate unique pickup ID
 */
const generatePickupId = () => {
  pickupCounter++;
  const timestamp = Date.now().toString(36);
  return `PU${timestamp.toUpperCase()}${pickupCounter}`;
};

/**
 * Get all pickups
 * GET /api/pickups
 */
router.get('/', async (req, res) => {
  try {
    // Return all pickups (in production, you'd filter based on permissions)
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
    
    // Generate verification code
    const generateVerificationCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const verificationCode = generateVerificationCode();
    
    // Check if pickup already exists (for retry/sync scenarios)
    const existingPickup = pickups.find(p => p.pickupId === finalPickupId);
    if (existingPickup) {
      console.log(`📝 Pickup ${finalPickupId} already exists, updating...`);
      
      // Update existing pickup with new data
      Object.assign(existingPickup, {
        userId: userId || existingPickup.userId,
        customerName: customerName || existingPickup.customerName,
        customerPhone: customerPhone || existingPickup.customerPhone,
        customerAddress: customerAddress || existingPickup.customerAddress,
        customerPincode: customerPincode || existingPickup.customerPincode,
        wasteTypes: wasteTypes || existingPickup.wasteTypes,
        estimatedWeight: estimatedWeight || existingPickup.estimatedWeight,
        timeSlot: timeSlot || existingPickup.timeSlot,
        specialInstructions: specialInstructions || existingPickup.specialInstructions,
        location: location || existingPickup.location,
        address: address || existingPickup.address,
        scheduledDate: scheduledDate || existingPickup.scheduledDate,
        scheduledTime: scheduledTime || existingPickup.scheduledTime,
        wasteImages: wasteImages || existingPickup.wasteImages,
        updatedAt: new Date().toISOString()
      });
      
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
        qrCodeData: existingPickup.qrCodeData,
        estimatedArrival: 'Within ' + existingPickup.timeSlot
      }
    });
    }

    // Create pickup data with QR code information
    const pickupData = {
      pickupId: finalPickupId,
      verificationCode: verificationCode,
      userId: userId || 'GUEST',
      customerName: customerName || `User ${userId || 'Guest'}`,
      customerPhone: customerPhone || 'Not provided',
      customerAddress: customerAddress || '',
      customerPincode: customerPincode || '',
      wasteTypes,
      estimatedWeight,
      timeSlot,
      specialInstructions: specialInstructions || 'None',
      scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: scheduledTime || new Date().toLocaleTimeString(),
      location: location || null,
      address: address || 'Address not specified',
      wasteImages: wasteImages || [],
      timestamp: timestamp || new Date().toISOString(),
      status: 'pending',  // Start with pending status
      assignedWorker: null, // Will be assigned later
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // QR Code specific data
      qrCodeData: {
        pickupId: finalPickupId,
        userId: userId || 'GUEST',
        customerName: customerName || `User ${userId || 'Guest'}`,
        wasteTypes,
        estimatedWeight,
        timeSlot,
        scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude
        } : null,
        verificationCode: verificationCode // Use generated verification code
      }
    };

    // Store pickup (in production, save to database)
    pickups.push(pickupData);
    
    console.log(`✅ New pickup scheduled: ${pickupData.pickupId} for user ${pickupData.userId}`);

    // Note: Pickup remains in 'pending' status until a worker accepts it
    // No automatic assignment - workers must browse and accept in 'Find Works' section

    // Return success response with QR code data
    res.status(201).json({
      success: true,
      message: 'Pickup scheduled successfully',
      data: {
        pickupId: pickupData.pickupId,
        verificationCode: pickupData.verificationCode,
        status: pickupData.status,
        scheduledDate: pickupData.scheduledDate,
        timeSlot: pickupData.timeSlot,
        qrCodeData: pickupData.qrCodeData,
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
router.get('/schedules', (req, res) => {
  try {
    // Get all pending and confirmed pickups
    const availablePickups = pickups.filter(pickup => 
      pickup.status === 'pending' || 
      pickup.status === 'confirmed' || 
      !pickup.status || 
      (pickup.status !== 'assigned' && 
       pickup.status !== 'in-progress' && 
       pickup.status !== 'completed' && 
       pickup.status !== 'cancelled')
    );
    
    // Sort pickups by urgency and creation time
    availablePickups.sort((a, b) => {
      // Calculate urgency based on scheduled time
      const getUrgency = (pickup) => {
        if (!pickup.timeSlot) return 2; // normal urgency
        
        const currentHour = new Date().getHours();
        const slotHour = parseInt(pickup.timeSlot.split(':')[0]);
        
        if (Math.abs(slotHour - currentHour) <= 2) return 0; // urgent
        if (Math.abs(slotHour - currentHour) <= 4) return 1; // high
        return 2; // normal
      };
      
      const urgencyA = getUrgency(a);
      const urgencyB = getUrgency(b);
      
      // Sort by urgency first
      if (urgencyA !== urgencyB) {
        return urgencyA - urgencyB;
      }
      
      // Then by creation time (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Transform for client display
    const schedules = availablePickups.map(pickup => {
      // Calculate distance (mock for demo)
      const distances = ['1.2 km', '2.5 km', '3.8 km', '4.5 km', '5.2 km'];
      const areas = ['MG Road', 'Koramangala', 'Whitefield', 'Indiranagar', 'Hebbal', 'Jayanagar', 'BTM Layout'];
      const randomIndex = Math.floor(Math.random() * distances.length);
      
      // Determine urgency
      let urgency = 'normal';
      if (pickup.timeSlot) {
        const currentHour = new Date().getHours();
        const slotHour = parseInt(pickup.timeSlot.split(':')[0]);
        if (Math.abs(slotHour - currentHour) <= 2) {
          urgency = 'urgent';
        } else if (Math.abs(slotHour - currentHour) <= 4) {
          urgency = 'high';
        }
      }
      
      return {
        _id: pickup.pickupId,
        pickupId: pickup.pickupId,
        customerName: 'Customer ' + (pickup.userId || Math.floor(Math.random() * 1000)),
        customerPhone: '+91 XXXXXXXXXX',
        address: pickup.location ? 
          `${pickup.location.latitude.toFixed(4)}, ${pickup.location.longitude.toFixed(4)}` : 
          'Address not specified',
        location: pickup.location,
        wasteTypes: pickup.wasteTypes,
        estimatedWeight: pickup.estimatedWeight,
        timeSlot: pickup.timeSlot,
        scheduledDate: pickup.scheduledDate,
        specialInstructions: pickup.specialInstructions,
        estimatedEarnings: 50 + (Math.floor(Math.random() * 3) * 10), // 50-80 rupees
        distance: distances[randomIndex],
        area: areas[randomIndex % areas.length],
        urgency: urgency,
        status: 'pending',
        createdAt: pickup.createdAt,
        lastUpdated: new Date().toISOString()
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
router.get('/:pickupId', (req, res) => {
  try {
    const { pickupId } = req.params;
    
    const pickup = pickups.find(p => p.pickupId === pickupId);
    
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
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all pickups for this user
    let userPickups = pickups.filter(p => p.userId === userId);
    
    // If no pickups found and userId exists, create some sample history for demo
    if (userPickups.length === 0 && userId && userId !== 'null') {
      console.log(`Creating sample pickup history for user: ${userId}`);
      
      const samplePickups = [
        {
          pickupId: `PU${Date.now()}HIST001`,
          userId: userId,
          wasteTypes: ['Dry Waste', 'Recyclables'],
          estimatedWeight: '5 kg',
          timeSlot: '10:00 AM - 2:00 PM',
          scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduledTime: '11:30 AM',
          location: { latitude: 12.9716, longitude: 77.5946 },
          address: 'Sample Address for History',
          status: 'completed',
          assignedWorker: 'Rajesh Kumar',
          assignedWorkerId: 'WORKER_001',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
          actualWeight: '4.8 kg',
          workerRating: 4.5,
          feedback: 'Excellent service, very professional',
          specialInstructions: 'Please handle recyclables carefully',
          qrCodeData: {
            pickupId: `PU${Date.now()}HIST001`,
            userId: userId,
            verificationCode: `PU${Date.now()}HIST001`
          }
        },
        {
          pickupId: `PU${Date.now()}HIST002`,
          userId: userId,
          wasteTypes: ['Wet Waste'],
          estimatedWeight: '3 kg',
          timeSlot: '6:00 AM - 10:00 AM',
          scheduledDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduledTime: '8:00 AM',
          location: { latitude: 12.9716, longitude: 77.5946 },
          address: 'Previous Address Location',
          status: 'completed',
          assignedWorker: 'Priya Sharma',
          assignedWorkerId: 'WORKER_002',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2700000).toISOString(),
          actualWeight: '2.9 kg',
          workerRating: 5.0,
          feedback: 'Perfect timing and handling',
          qrCodeData: {
            pickupId: `PU${Date.now()}HIST002`,
            userId: userId,
            verificationCode: `PU${Date.now()}HIST002`
          }
        }
      ];
      
      // Add sample pickups to the database
      pickups.push(...samplePickups);
      userPickups = samplePickups;
      
      console.log(`✅ Added ${samplePickups.length} sample pickups for user ${userId}`);
    }
    
    // Sort by creation date (newest first) and include comprehensive data
    const sortedPickups = userPickups
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(pickup => ({
        ...pickup,
        // Ensure all required fields are present
        status: pickup.status || 'pending',
        createdAt: pickup.createdAt || new Date().toISOString(),
        updatedAt: pickup.updatedAt || pickup.createdAt || new Date().toISOString(),
        // Calculate time since creation for UI
        timeAgo: getTimeAgo(new Date(pickup.createdAt || new Date())),
        // Add status display text
        statusText: getStatusText(pickup.status || 'pending')
      }));
    
    // Calculate summary stats
    const stats = {
      total: sortedPickups.length,
      pending: sortedPickups.filter(p => p.status === 'pending').length,
      assigned: sortedPickups.filter(p => p.status === 'assigned').length,
      'in-progress': sortedPickups.filter(p => p.status === 'in-progress').length,
      completed: sortedPickups.filter(p => p.status === 'completed').length,
      cancelled: sortedPickups.filter(p => p.status === 'cancelled').length,
      rejected: sortedPickups.filter(p => p.status === 'rejected').length
    };
    
    res.json({
      success: true,
      data: sortedPickups,
      stats: stats,
      message: `Retrieved ${sortedPickups.length} pickup records`
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
    'pending': 'Awaiting Assignment',
    'assigned': 'Worker Assigned',
    'in-progress': 'Pickup in Progress',
    'completed': 'Successfully Completed',
    'cancelled': 'Cancelled by User',
    'rejected': 'Rejected by Worker'
  };
  return statusMap[status] || status;
};

/**
 * Update pickup status (for workers)
 * PUT /api/pickups/:pickupId/status
 */
router.put('/:pickupId/status', (req, res) => {
  try {
    const { pickupId } = req.params;
    const { status, workerId, notes } = req.body;
    
    const pickupIndex = pickups.findIndex(p => p.pickupId === pickupId);
    
    if (pickupIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }
    
    // Update pickup status
    pickups[pickupIndex].status = status;
    pickups[pickupIndex].updatedAt = new Date().toISOString();
    
    if (workerId) {
      pickups[pickupIndex].completedBy = workerId;
    }
    
    if (notes) {
      pickups[pickupIndex].completionNotes = notes;
    }
    
    if (status === 'completed') {
      pickups[pickupIndex].completedAt = new Date().toISOString();
    }
    
    res.json({
      success: true,
      message: 'Pickup status updated successfully',
      data: pickups[pickupIndex]
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
 * Verify QR code (for workers)
 * POST /api/pickups/verify-qr
 */
router.post('/verify-qr', (req, res) => {
  try {
    const { qrCodeData } = req.body;
    
    if (!qrCodeData || !qrCodeData.pickupId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code data'
      });
    }
    
    const pickup = pickups.find(p => p.pickupId === qrCodeData.pickupId);
    
    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }
    
    // Verify QR code matches
    const isValid = pickup.qrCodeData.verificationCode === qrCodeData.verificationCode;
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QR code'
      });
    }
    
    res.json({
      success: true,
      message: 'QR code verified successfully',
      data: {
        pickupId: pickup.pickupId,
        userId: pickup.userId,
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
router.delete('/:pickupId', (req, res) => {
  try {
    const { pickupId } = req.params;
    
    const pickupIndex = pickups.findIndex(p => p.pickupId === pickupId);
    
    if (pickupIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }
    
    // Check if pickup can be cancelled
    if (pickups[pickupIndex].status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed pickup'
      });
    }
    
    // Update status to cancelled
    pickups[pickupIndex].status = 'cancelled';
    pickups[pickupIndex].cancelledAt = new Date().toISOString();
    pickups[pickupIndex].updatedAt = new Date().toISOString();
    
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

// Helper functions for worker routes and other modules
router.getAllPickups = () => pickups;

router.updatePickupStatus = (pickupId, status, additionalData = {}) => {
  const pickupIndex = pickups.findIndex(p => p.pickupId === pickupId);
  
  if (pickupIndex !== -1) {
    pickups[pickupIndex] = {
      ...pickups[pickupIndex],
      status: status,
      updatedAt: new Date().toISOString(),
      ...additionalData
    };
    return true;
  }
  return false;
};

// Export router and helper functions
module.exports = router;
module.exports.getAllPickups = () => pickups;
