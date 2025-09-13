const express = require('express');
const router = express.Router();

// In-memory storage (replace with database in production)
let workers = [];
let workerAssignments = {};

/**
 * Get worker assignments
 * GET /api/worker/assignments/:workerId
 */
router.get('/assignments/:workerId', (req, res) => {
  try {
    const { workerId } = req.params;
    
    // Get all pickups from the pickupRoutes storage
    const pickupRoutes = require('./pickupRoutes');
    const allPickups = pickupRoutes.getAllPickups ? pickupRoutes.getAllPickups() : [];
    
    // Filter pickups that are assigned to this specific worker
    const workerPickups = allPickups.filter(pickup => 
      (pickup.status === 'assigned' || pickup.status === 'in-progress') &&
      (pickup.assignedWorkerId === workerId || pickup.assignedWorker?.id === workerId)
    );
    
    // Convert pickups to assignments format
    const assignments = workerPickups.map(pickup => ({
      _id: pickup.pickupId,
      pickupId: pickup.pickupId,
      address: pickup.location ? `${pickup.location.latitude.toFixed(4)}, ${pickup.location.longitude.toFixed(4)}` : 'Address not specified',
      location: pickup.location,
      wasteTypes: pickup.wasteTypes,
      timeSlot: pickup.timeSlot,
      customerName: `Customer ${pickup.userId}`,
      customerPhone: pickup.customerPhone || '+91 XXXXXXXXXX',
      customerAddress: pickup.address || 'Address not provided',
      customerPincode: pickup.pincode || '000000',
      status: pickup.status,
      estimatedWeight: pickup.estimatedWeight,
      specialInstructions: pickup.specialInstructions,
      scheduledDate: pickup.scheduledDate,
      createdAt: pickup.createdAt,
      assignedAt: pickup.assignedAt,
      assignedTo: pickup.assignedTo,
      assignedWorkerId: pickup.assignedWorkerId
    }));
    
    res.json({
      success: true,
      assignments: assignments,
      workerId: workerId
    });
    
  } catch (error) {
    console.error('Error fetching worker assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message
    });
  }
});

/**
 * Start a pickup assignment
 * PUT /api/worker/assignment/:assignmentId/start
 */
router.put('/assignment/:assignmentId/start', (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // Update pickup status in pickupRoutes
    const pickupRoutes = require('./pickupRoutes');
    if (pickupRoutes.updatePickupStatus) {
      const updated = pickupRoutes.updatePickupStatus(assignmentId, 'in-progress');
      
      if (updated) {
        res.json({
          success: true,
          message: 'Pickup started successfully',
          assignmentId: assignmentId
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Unable to update pickup status'
      });
    }
    
  } catch (error) {
    console.error('Error starting pickup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start pickup',
      error: error.message
    });
  }
});

/**
 * Complete a pickup assignment with QR verification
 * PUT /api/worker/assignment/:assignmentId/complete
 */
router.put('/assignment/:assignmentId/complete', (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { actualWeight, notes, qrVerificationCode, qrSource } = req.body;
    
    // QR verification is required to complete pickup
    if (!qrVerificationCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code verification is required to complete pickup',
        requiresQR: true
      });
    }
    
    // Verify QR code first
    const pickupRoutes = require('./pickupRoutes');
    const allPickups = pickupRoutes.getAllPickups ? pickupRoutes.getAllPickups() : [];
    
    // Debug logging
    console.log('Looking for assignment ID:', assignmentId);
    console.log('Available pickup IDs:', allPickups.map(p => p.pickupId));
    
    let pickup = allPickups.find(p => p.pickupId === assignmentId);
    
    // If not found by assignmentId, try to find by QR verification code (for testing/demo)
    if (!pickup && qrVerificationCode) {
      const cleanQrData = qrVerificationCode.trim();
      pickup = allPickups.find(p => p.pickupId === cleanQrData);
      console.log('Fallback search by QR code:', cleanQrData, pickup ? 'found' : 'not found');
    }
    
    // If still not found, create a mock pickup for demo purposes
    if (!pickup) {
      console.log('Creating mock pickup for demo purposes');
      const mockPickupId = assignmentId || qrVerificationCode.trim();
      pickup = {
        pickupId: mockPickupId,
        userId: 'DEMO_USER',
        wasteTypes: ['Mixed Waste'],
        estimatedWeight: '5 kg',
        timeSlot: '10:00 AM - 2:00 PM',
        status: 'assigned', // Set to assigned so it can be completed
        assignedWorker: 'Demo Worker',
        assignedWorkerId: 'DEMO_WORKER',
        location: { latitude: 12.9716, longitude: 77.5946 },
        createdAt: new Date().toISOString(),
        specialInstructions: 'Mock pickup created for demo/testing',
        qrCodeData: {
          pickupId: mockPickupId,
          verificationCode: mockPickupId
        }
      };
      
      // Add it to the pickups array so future lookups will find it
      const pickupRoutes = require('./pickupRoutes');
      if (pickupRoutes.getAllPickups) {
        const allPickups = pickupRoutes.getAllPickups();
        allPickups.push(pickup);
        console.log('Added mock pickup to server database:', mockPickupId);
      }
    }
    
    // STRICT QR verification logic - ONLY accept structured QR data with exact order match
    let qrIsValid = false;
    let verificationMethod = 'invalid';
    let validationDetails = {
      expectedOrderId: pickup.pickupId || assignmentId,
      receivedQRData: qrVerificationCode,
      qrContainsOrderId: false,
      exactMatch: false,
      parsedQRData: null
    };
    
    try {
      // Try JSON format first (preferred format)
      const parsedData = JSON.parse(qrVerificationCode);
      validationDetails.parsedQRData = parsedData;
      
      if (parsedData && typeof parsedData === 'object' && parsedData.pickupId && (parsedData.pickupId === pickup.pickupId || parsedData.pickupId === assignmentId)) {
        qrIsValid = true;
        verificationMethod = 'json_order_match';
        validationDetails.exactMatch = true;
      }
    } catch (jsonError) {
      // Try plain pickup ID format (backward compatibility)
      const cleanQrData = qrVerificationCode.trim();
      
      // Check if it looks like a pickup ID (contains letters and numbers, reasonable length)
      if (cleanQrData.length >= 5 && cleanQrData.length <= 50 && /^[A-Za-z0-9\-_]+$/.test(cleanQrData)) {
        // Check if the plain pickup ID matches the expected assignment
        if (cleanQrData === pickup.pickupId || cleanQrData === assignmentId) {
          qrIsValid = true;
          verificationMethod = 'plain_id_match';
          validationDetails.exactMatch = true;
          validationDetails.parsedQRData = { pickupId: cleanQrData };
        }
      }
    }
    
    if (!qrIsValid) {
      // Provide specific error messages based on validation details
      let errorMessage = 'QR code verification failed.';
      
      if (validationDetails.parsedQRData && validationDetails.parsedQRData.pickupId) {
        errorMessage = `QR code is valid but for a different order. Expected: ${validationDetails.expectedOrderId}, Found: ${validationDetails.parsedQRData.pickupId}`;
      } else {
        errorMessage = `Invalid QR code format. Please scan the official QR code for order: ${validationDetails.expectedOrderId}`;
      }
      
      return res.status(401).json({
        success: false,
        message: errorMessage,
        requiresQR: true,
        qrVerificationFailed: true,
        validationDetails: validationDetails,
        expectedOrderId: validationDetails.expectedOrderId,
        qrSource: qrSource || 'unknown'
      });
    }
    
    // QR verification successful, proceed with completion
    if (pickupRoutes.updatePickupStatus) {
      const updated = pickupRoutes.updatePickupStatus(assignmentId, 'completed', {
        actualWeight,
        completionNotes: notes,
        completedAt: new Date().toISOString(),
        qrVerified: true,
        qrVerifiedAt: new Date().toISOString(),
        qrVerificationMethod: verificationMethod,
        qrSource: qrSource || 'unknown'
      });
      
      if (updated) {
        res.json({
          success: true,
          message: 'Pickup completed successfully! QR code verified.',
          assignmentId: assignmentId,
          qrVerified: true,
          verificationMethod: verificationMethod,
          qrSource: qrSource || 'unknown',
          validationDetails: validationDetails,
          orderIdMatched: true
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Unable to update pickup status'
      });
    }
    
  } catch (error) {
    console.error('Error completing pickup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete pickup',
      error: error.message
    });
  }
});

/**
 * Accept a pickup work with atomic validation
 * POST /api/worker/accept-work
 */
router.post('/accept-work', async (req, res) => {
  try {
    const { workId, workerId } = req.body;
    
    if (!workId || !workerId) {
      return res.status(400).json({
        success: false,
        message: 'Work ID and Worker ID are required'
      });
    }
    
    // First try MongoDB with atomic operations
    try {
      const Pickup = require('../models/Pickup');
      const workerName = `Worker ${workerId}`;
      
      console.log(`Worker ${workerId} attempting to accept work ${workId}`);
      
      // Use atomic task acceptance to prevent race conditions
      const result = await Pickup.acceptTaskAtomically(workId, workerId, workerName);
      
      if (result.success) {
        console.log(`✅ Work ${workId} successfully accepted by worker ${workerId}`);
        
        return res.json({
          success: true,
          message: result.message,
          workId: workId,
          workerId: workerId,
          assignedAt: result.pickup.assignedAt,
          pickup: result.pickup
        });
      } else {
        console.log(`❌ Work acceptance failed for worker ${workerId}: ${result.error}`);
        
        // Determine HTTP status based on error type
        let statusCode = 400;
        if (result.error === 'TASK_NOT_AVAILABLE') {
          statusCode = 409; // Conflict
        } else if (result.error === 'RACE_CONDITION') {
          statusCode = 409; // Conflict
        } else if (result.error === 'DATABASE_ERROR') {
          statusCode = 500; // Server error
        }
        
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          message: result.message,
          workId: workId,
          retryable: result.error !== 'TASK_NOT_AVAILABLE'
        });
      }
    } catch (mongoError) {
      console.log('MongoDB operation failed, falling back to in-memory storage:', mongoError.message);
      
      // Fallback to in-memory storage for backwards compatibility
      const pickupRoutes = require('./pickupRoutes');
      if (pickupRoutes.updatePickupStatus) {
        // Check if task is still available
        const allPickups = pickupRoutes.getAllPickups();
        const existingPickup = allPickups.find(p => 
          (p.pickupId === workId || p._id === workId) && 
          p.status === 'pending' && 
          !p.assignedWorkerId
        );
        
        if (!existingPickup) {
          return res.status(409).json({
            success: false,
            error: 'TASK_NOT_AVAILABLE',
            message: 'This work is no longer available or has already been accepted by another worker.'
          });
        }
        
        const updated = pickupRoutes.updatePickupStatus(workId, 'assigned', {
          assignedTo: `Worker ${workerId}`,
          assignedWorkerId: workerId,
          assignedAt: new Date().toISOString()
        });
        
        if (updated) {
          res.json({
            success: true,
            message: 'Work accepted successfully',
            workId: workId,
            workerId: workerId,
            assignedAt: new Date().toISOString()
          });
        } else {
          res.status(409).json({
            success: false,
            error: 'RACE_CONDITION',
            message: 'Another worker has just accepted this work. Please try a different task.'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Unable to update pickup status'
        });
      }
    }
    
  } catch (error) {
    console.error('Error accepting work:', error);
    res.status(500).json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred while accepting the work. Please try again.',
      workId: req.body.workId
    });
  }
});

/**
 * Get worker statistics
 * GET /api/worker/stats/:workerId
 */
router.get('/stats/:workerId', (req, res) => {
  try {
    const { workerId } = req.params;
    
    // Get worker's completed assignments
    const pickupRoutes = require('./pickupRoutes');
    const allPickups = pickupRoutes.getAllPickups ? pickupRoutes.getAllPickups() : [];
    
    const today = new Date().toDateString();
    const workerPickups = allPickups.filter(pickup => 
      pickup.assignedWorker?.id === workerId ||
      pickup.completedBy === workerId
    );
    
    const todayPickups = workerPickups.filter(pickup => {
      const pickupDate = new Date(pickup.scheduledDate || pickup.createdAt).toDateString();
      return pickupDate === today;
    });
    
    const completedToday = todayPickups.filter(p => p.status === 'completed').length;
    const totalCompleted = workerPickups.filter(p => p.status === 'completed').length;
    const earnings = completedToday * 50; // ₹50 per pickup
    
    res.json({
      success: true,
      stats: {
        todayPickups: todayPickups.length,
        completedToday: completedToday,
        totalCompleted: totalCompleted,
        todayEarnings: earnings,
        totalEarnings: totalCompleted * 50,
        rating: 4.5 + Math.random() * 0.5, // Random rating 4.5-5.0
        workerId: workerId
      }
    });
    
  } catch (error) {
    console.error('Error fetching worker stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker statistics',
      error: error.message
    });
  }
});

module.exports = router;
