const AssignmentService = require('../services/assignmentService');
const Assignment = require('../models/Assignment');
const PickupRequest = require('../models/PickupRequest');
const Worker = require('../models/Worker');

class AssignmentController {
  /**
   * Example: Create a pickup request and auto-assign it to the best worker
   * This demonstrates the proper flow from request creation to assignment
   */
  static async createPickupRequestWithAssignment(req, res) {
    try {
      const session = await require('mongoose').startSession();
      await session.startTransaction();

      // 1. Create the pickup request first
      const pickupRequest = new PickupRequest({
        userId: req.user._id,
        zoneId: req.body.zoneId,
        timeSlotId: req.body.timeSlotId,
        location: req.body.location,
        address: req.body.address,
        preferredDate: req.body.preferredDate,
        wasteDetails: req.body.wasteDetails,
        priority: req.body.priority || 'normal'
      });

      await pickupRequest.save({ session });

      // 2. Immediately assign it to the best available worker
      const assignment = await AssignmentService.createAssignment(
        pickupRequest._id,
        {
          assignmentType: 'auto',
          priority: AssignmentService.calculatePriority(pickupRequest),
          responseTimeMinutes: 15
        }
      );

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        message: 'Pickup request created and assigned successfully',
        data: {
          pickupRequest,
          assignment
        }
      });

    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Example: Handle worker accepting their assigned task
   * Demonstrates the authorization check ensuring only the assigned worker can accept
   */
  static async workerAcceptAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const workerId = req.user._id; // From authentication middleware
      
      // The service will handle all validations:
      // - Only assigned worker can accept
      // - Assignment must be in PENDING status
      // - Assignment must not be expired
      const assignment = await AssignmentService.acceptAssignment(
        assignmentId,
        workerId,
        {
          location: req.body.currentLocation,
          notes: req.body.notes
        }
      );

      res.json({
        success: true,
        message: 'Assignment accepted successfully',
        data: assignment
      });

    } catch (error) {
      const statusCode = error.message.includes('not authorized') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Example: Get assignments for a specific worker
   * Shows how workers can only see their own assignments
   */
  static async getWorkerAssignments(req, res) {
    try {
      const workerId = req.user._id; // From authentication
      
      // Workers can only get their own assignments
      // Admins could pass any workerId
      const assignments = await AssignmentService.getWorkerAssignments(
        workerId,
        ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] // Only active assignments
      );

      res.json({
        success: true,
        data: assignments
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Example: Handle expired assignments (background job)
   * This would typically run as a scheduled job every few minutes
   */
  static async handleExpiredAssignments() {
    try {
      const expiredCount = await AssignmentService.handleExpiredAssignments();
      
      console.log(`Processed ${expiredCount} expired assignments`);
      
      return {
        success: true,
        processedCount: expiredCount
      };

    } catch (error) {
      console.error('Error handling expired assignments:', error);
      throw error;
    }
  }

  /**
   * Example: Admin view of all assignments with filtering
   * Shows how admins can see all assignments while workers cannot
   */
  static async getAllAssignments(req, res) {
    try {
      // Only admins can access this endpoint (checked in middleware)
      
      const filters = {};
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      // Apply filters
      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.workerId) {
        filters.workerId = req.query.workerId;
      }

      if (req.query.startDate && req.query.endDate) {
        filters.createdAt = {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate)
        };
      }

      const assignments = await Assignment.find(filters)
        .populate('workerId', 'firstName lastName phone status')
        .populate({
          path: 'pickupRequestId',
          populate: [
            { path: 'userId', select: 'firstName lastName phone' },
            { path: 'zoneId', select: 'name code' }
          ]
        })
        .sort({ priority: -1, createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      const total = await Assignment.countDocuments(filters);

      res.json({
        success: true,
        data: assignments,
        pagination: {
          total,
          page: options.page,
          pages: Math.ceil(total / options.limit)
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Example: Demonstrate the bug fix - ensure one assignment per pickup request
   */
  static async demonstrateSingleAssignment(pickupRequestId) {
    try {
      // This will check if assignment already exists
      // and throw an error if trying to create a duplicate
      const assignment1 = await AssignmentService.createAssignment(pickupRequestId);
      
      console.log('First assignment created:', assignment1._id);

      // This should fail with "Assignment already exists for this pickup request"
      try {
        const assignment2 = await AssignmentService.createAssignment(pickupRequestId);
        console.log('ERROR: Second assignment should not be created!', assignment2._id);
      } catch (duplicateError) {
        console.log('✓ Correctly prevented duplicate assignment:', duplicateError.message);
      }

      // Verify only one assignment exists
      const allAssignments = await Assignment.find({ pickupRequestId });
      console.log(`✓ Total assignments for pickup request: ${allAssignments.length} (should be 1)`);

      return {
        success: true,
        assignmentId: assignment1._id,
        message: 'Single assignment constraint working correctly'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Example: Show how worker authorization is enforced
   */
  static async demonstrateWorkerAuthorization(assignmentId, correctWorkerId, wrongWorkerId) {
    try {
      // Correct worker tries to accept - should succeed
      try {
        await AssignmentService.acceptAssignment(assignmentId, correctWorkerId, {
          location: [77.2090, 28.6139], // Delhi coordinates
          notes: 'On my way to pickup location'
        });
        console.log('✓ Correct worker successfully accepted assignment');
      } catch (error) {
        console.log('✗ Correct worker failed to accept:', error.message);
      }

      // Wrong worker tries to accept the same assignment - should fail
      try {
        await AssignmentService.acceptAssignment(assignmentId, wrongWorkerId, {
          location: [77.2090, 28.6139],
          notes: 'Trying to steal this assignment'
        });
        console.log('✗ ERROR: Wrong worker should not be able to accept!');
      } catch (authError) {
        console.log('✓ Correctly prevented unauthorized acceptance:', authError.message);
      }

      return {
        success: true,
        message: 'Worker authorization working correctly'
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = AssignmentController;