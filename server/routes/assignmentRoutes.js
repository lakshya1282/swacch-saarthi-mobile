const express = require('express');
const router = express.Router();
const AssignmentService = require('../services/assignmentService');
const Assignment = require('../models/Assignment');
const PickupRequest = require('../models/PickupRequest');
const Worker = require('../models/Worker');
const authMiddleware = require('../middleware/auth');

// Worker authentication middleware - ensures only workers can access worker-specific routes
const workerAuthMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'worker') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Worker authorization required.' });
  }
};

// Get worker assignments - only accessible by the assigned worker or admin
router.get('/worker/:workerId', authMiddleware, async (req, res) => {
  try {
    // Ensure the worker can only access their own assignments
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.workerId) {
      return res.status(403).json({ error: 'You can only access your own assignments' });
    }
    
    const status = req.query.status ? req.query.status.split(',') : null;
    const assignments = await AssignmentService.getWorkerAssignments(req.params.workerId, status);
    
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create an assignment for a pickup request - admin only
router.post('/create/:pickupRequestId', authMiddleware, async (req, res) => {
  try {
    // Only admins can create assignments
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create assignments' });
    }
    
    const assignment = await AssignmentService.createAssignment(
      req.params.pickupRequestId, 
      req.body
    );
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept an assignment - only accessible by the assigned worker
router.post('/accept/:assignmentId', authMiddleware, workerAuthMiddleware, async (req, res) => {
  try {
    const assignment = await AssignmentService.acceptAssignment(
      req.params.assignmentId,
      req.user._id, // Using req.user._id from auth middleware (equivalent to req.worker._id)
      req.body
    );
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    // Handle specific authorization/conflict errors with 403 status
    if (error.message.includes('not authorized') || 
        error.message.includes('already accepted') ||
        error.message.includes('Cannot accept')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Decline an assignment - only accessible by the assigned worker
router.post('/decline/:assignmentId', authMiddleware, workerAuthMiddleware, async (req, res) => {
  try {
    const assignment = await AssignmentService.declineAssignment(
      req.params.assignmentId,
      req.user._id,
      req.body
    );
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('Cannot decline')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Start an assignment (worker arrived at pickup location) - only by assigned worker
router.post('/start/:assignmentId', authMiddleware, workerAuthMiddleware, async (req, res) => {
  try {
    // First, check if this worker is assigned to this task
    const assignment = await Assignment.findById(req.params.assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Verify this worker is assigned to this task
    if (assignment.workerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'You are not authorized to start this assignment' 
      });
    }
    
    // Start the assignment
    await assignment.start(req.body.location || null);
    
    // Update pickup request status
    const pickupRequest = await PickupRequest.findById(assignment.pickupRequestId);
    pickupRequest.status = 'ARRIVED';
    pickupRequest.timestamps.workerArrived = new Date();
    await pickupRequest.save();
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete an assignment - only by assigned worker
router.post('/complete/:assignmentId', authMiddleware, workerAuthMiddleware, async (req, res) => {
  try {
    // First, check if this worker is assigned to this task
    const assignment = await Assignment.findById(req.params.assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Verify this worker is assigned to this task
    if (assignment.workerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'You are not authorized to complete this assignment' 
      });
    }
    
    // Complete the assignment
    await assignment.complete(req.body);
    
    // Update pickup request status
    const pickupRequest = await PickupRequest.findById(assignment.pickupRequestId);
    pickupRequest.status = 'COMPLETED';
    pickupRequest.timestamps.completed = new Date();
    
    // Update actual weight if provided
    if (req.body.actualWeight) {
      pickupRequest.wasteDetails.actualKg = req.body.actualWeight;
    }
    
    await pickupRequest.save();
    
    // Update worker status to available again
    const worker = await Worker.findById(req.user._id);
    worker.status.current = 'available';
    worker.currentAssignmentId = null;
    
    // Update worker's load if provided
    if (req.body.actualWeight) {
      worker.currentLoad.currentKg += req.body.actualWeight;
    }
    
    await worker.save();
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel an assignment - admin only
router.post('/cancel/:assignmentId', authMiddleware, async (req, res) => {
  try {
    // Only admins can cancel assignments
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can cancel assignments' });
    }
    
    const assignment = await Assignment.findById(req.params.assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Cancel the assignment
    await assignment.cancel(req.body.reason || 'Cancelled by admin', 'admin');
    
    // Reset pickup request
    const pickupRequest = await PickupRequest.findById(assignment.pickupRequestId);
    pickupRequest.status = 'SCHEDULED';
    pickupRequest.assignedTo = null;
    pickupRequest.assignmentId = null;
    pickupRequest.assignedAt = null;
    pickupRequest.timestamps.assigned = null;
    pickupRequest.timestamps.cancelled = new Date();
    await pickupRequest.save();
    
    // Clear worker assignment
    if (assignment.workerId) {
      const worker = await Worker.findById(assignment.workerId);
      if (worker && worker.currentAssignmentId && 
          worker.currentAssignmentId.toString() === assignment._id.toString()) {
        worker.currentAssignmentId = null;
        await worker.save();
      }
    }
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get assignment details - accessible by assigned worker or admin
router.get('/:assignmentId', authMiddleware, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId)
      .populate('workerId', 'firstName lastName phone vehicle currentLocation')
      .populate({
        path: 'pickupRequestId',
        populate: [
          { path: 'userId', select: 'firstName lastName phone' },
          { path: 'zoneId' },
          { path: 'timeSlotId' }
        ]
      });
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Check authorization - only assigned worker or admin can view details
    if (req.user.role !== 'admin' && 
        (!assignment.workerId || assignment.workerId._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'You are not authorized to view this assignment' });
    }
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all assignments - admin only
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Only admins can view all assignments
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can view all assignments' });
    }
    
    const query = {};
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const assignments = await Assignment.find(query)
      .populate('workerId', 'firstName lastName phone')
      .populate('pickupRequestId', 'requestId location address preferredDate status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Assignment.countDocuments(query);
    
    res.json({
      success: true,
      data: assignments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get assignment statistics - admin only
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    // Only admins can view stats
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can view assignment statistics' });
    }
    
    const dateRange = req.query.startDate && req.query.endDate ? {
      start: new Date(req.query.startDate),
      end: new Date(req.query.endDate)
    } : null;
    
    const workerId = req.query.workerId || null;
    
    const stats = await AssignmentService.getAssignmentStats(workerId, dateRange);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;