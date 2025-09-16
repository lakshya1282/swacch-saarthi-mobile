const jwt = require('jsonwebtoken');
const Worker = require('../models/Worker');
const User = require('../models/User');

/**
 * Middleware to authenticate and authorize worker-specific actions
 * CRITICAL: This ensures workers can only perform actions for themselves
 */
const authenticateWorker = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'waste-management-secret');
    
    // Check if the user is a worker
    if (decoded.userType !== 'worker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Workers only.'
      });
    }

    // Find the worker by ID
    let worker = await Worker.findById(decoded.userId || decoded._id);
    
    if (!worker) {
      // Fallback to User model
      worker = await User.findById(decoded.userId || decoded._id);
    }

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // CRITICAL: Attach worker information to request
    req.worker = {
      _id: worker._id.toString(),  // Ensure it's a string
      workerId: worker.workerId || worker._id.toString(),
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email,
      officeCode: worker.officeCode,
      officeId: worker.officeId
    };

    // Store the authenticated worker ID for validation
    req.authenticatedWorkerId = worker._id.toString();
    
    next();
  } catch (error) {
    console.error('Worker authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Middleware to validate that the worker is accessing their own resources
 * CRITICAL: Prevents Worker A from accessing Worker B's data
 */
const validateWorkerOwnership = (paramName = 'workerId') => {
  return (req, res, next) => {
    const requestedWorkerId = req.params[paramName] || req.body.workerId;
    const authenticatedWorkerId = req.authenticatedWorkerId;

    if (!requestedWorkerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    // CRITICAL: Ensure the worker is accessing their own data
    if (requestedWorkerId !== authenticatedWorkerId) {
      console.error(`⚠️ Worker ${authenticatedWorkerId} tried to access data for worker ${requestedWorkerId}`);
      
      return res.status(403).json({
        success: false,
        message: 'You can only access your own data',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    next();
  };
};

/**
 * Middleware for attendance marking
 * CRITICAL: Ensures workers can only mark their own attendance
 */
const validateAttendanceOwnership = (req, res, next) => {
  const { workerId } = req.body;
  const authenticatedWorkerId = req.authenticatedWorkerId;

  if (!workerId) {
    return res.status(400).json({
      success: false,
      message: 'Worker ID is required for attendance marking'
    });
  }

  // CRITICAL: Check if worker is marking their own attendance
  if (workerId !== authenticatedWorkerId) {
    console.error(`⚠️ Worker ${authenticatedWorkerId} attempted to mark attendance for worker ${workerId}`);
    
    return res.status(403).json({
      success: false,
      message: 'You can only mark your own attendance',
      code: 'UNAUTHORIZED_ATTENDANCE'
    });
  }

  // Attach verified worker ID to request
  req.verifiedWorkerId = authenticatedWorkerId;
  next();
};

/**
 * Middleware for task acceptance
 * CRITICAL: Ensures workers can only accept tasks assigned to them
 */
const validateTaskAcceptance = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const authenticatedWorkerId = req.authenticatedWorkerId;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Assignment ID is required'
      });
    }

    // Check if this is an assignment or pickup
    const Assignment = require('../models/Assignment');
    const assignment = await Assignment.findById(assignmentId);

    if (assignment) {
      // Check if the assignment is for this worker
      if (assignment.workerId.toString() !== authenticatedWorkerId) {
        console.error(`⚠️ Worker ${authenticatedWorkerId} tried to accept assignment ${assignmentId} assigned to worker ${assignment.workerId}`);
        
        return res.status(403).json({
          success: false,
          message: 'This assignment is not assigned to you',
          code: 'UNAUTHORIZED_ASSIGNMENT'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Task validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate task ownership',
      error: error.message
    });
  }
};

module.exports = {
  authenticateWorker,
  validateWorkerOwnership,
  validateAttendanceOwnership,
  validateTaskAcceptance
};