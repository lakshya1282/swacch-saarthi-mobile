const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const Worker = require('../models/Worker');
const PickupRequest = require('../models/PickupRequest');
const Zone = require('../models/Zone');

class AssignmentService {
  /**
   * Create a single assignment for a pickup request
   * Ensures only ONE worker is assigned at a time
   */
  static async createAssignment(pickupRequestId, options = {}) {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();
      
      // Check if assignment already exists for this pickup request
      const existingAssignment = await Assignment.findOne({ 
        pickupRequestId 
      }).session(session);
      
      if (existingAssignment) {
        throw new Error('Assignment already exists for this pickup request');
      }
      
      // Get pickup request details
      const pickupRequest = await PickupRequest.findById(pickupRequestId)
        .populate('zoneId')
        .session(session);
      
      if (!pickupRequest) {
        throw new Error('Pickup request not found');
      }
      
      if (pickupRequest.status !== 'SCHEDULED') {
        throw new Error(`Cannot assign pickup request with status: ${pickupRequest.status}`);
      }
      
      // Find the best available worker
      const bestWorker = await this.findBestWorker(pickupRequest, options, session);
      
      if (!bestWorker) {
        throw new Error('No available workers found for this assignment');
      }
      
      // Create the assignment
      const assignment = new Assignment({
        pickupRequestId,
        workerId: bestWorker._id,
        assignmentType: options.assignmentType || 'auto',
        priority: options.priority || this.calculatePriority(pickupRequest),
        logistics: {
          estimatedDistance: bestWorker.distance,
          estimatedTravelTime: bestWorker.travelTime,
          routeOptimized: options.routeOptimized || false
        },
        assignmentCriteria: {
          assignmentScore: bestWorker.score,
          matchingFactors: bestWorker.matchingFactors
        },
        responseWindow: {
          responseTimeMinutes: options.responseTimeMinutes || 15,
          expiresAt: new Date(Date.now() + (options.responseTimeMinutes || 15) * 60 * 1000)
        }
      });
      
      // Save assignment
      await assignment.save({ session });
      
      // Update pickup request status and assignment info
      pickupRequest.status = 'ASSIGNED';
      pickupRequest.assignedTo = bestWorker._id;
      pickupRequest.assignmentId = assignment._id;
      pickupRequest.assignedAt = new Date();
      pickupRequest.timestamps.assigned = new Date();
      
      await pickupRequest.save({ session });
      
      // Update worker's current assignment
      await Worker.findByIdAndUpdate(
        bestWorker._id,
        { 
          currentAssignmentId: assignment._id,
          lastActivityAt: new Date()
        },
        { session }
      );
      
      await session.commitTransaction();
      
      return assignment.populate('workerId pickupRequestId');
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Handle worker accepting an assignment
   * Ensures only the assigned worker can accept - using atomic operations
   * FIXED: Prevents race conditions by using findOneAndUpdate with proper conditions
   */
  static async acceptAssignment(assignmentId, workerId, acceptanceData = {}) {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();
      
      // ATOMIC OPERATION: Find and update assignment only if conditions are met
      // This prevents race conditions where multiple workers try to accept the same assignment
      
      // Build update object dynamically
      const updateFields = {
        status: 'ACCEPTED',
        'timestamps.accepted': new Date()
      };
      
      // Add worker location if provided
      if (acceptanceData.location) {
        updateFields['workerLocation.assignmentStart'] = {
          type: 'Point',
          coordinates: acceptanceData.location,
          timestamp: new Date()
        };
      }
      
      // Add notes if provided
      if (acceptanceData.notes) {
        updateFields['communications.workerNotes'] = acceptanceData.notes;
      }
      
      const assignment = await Assignment.findOneAndUpdate(
        {
          _id: assignmentId,
          workerId: workerId, // Only the assigned worker
          status: 'PENDING', // Only pending assignments
          'responseWindow.expiresAt': { $gt: new Date() } // Not expired
        },
        {
          $set: updateFields
        },
        { 
          new: true,
          session
        }
      ).populate('pickupRequestId');
      
      // If no assignment was found/updated, it means conditions weren't met
      if (!assignment) {
        // Check specific reason for failure to provide better error messages
        const originalAssignment = await Assignment.findById(assignmentId).session(session);
        
        if (!originalAssignment) {
          throw new Error('Assignment not found');
        }
        
        if (originalAssignment.workerId.toString() !== workerId.toString()) {
          throw new Error('Not authorized or already accepted');
        }
        
        if (originalAssignment.status !== 'PENDING') {
          throw new Error('Not authorized or already accepted');
        }
        
        if (new Date() > originalAssignment.responseWindow.expiresAt) {
          throw new Error('Assignment has expired');
        }
        
        // Fallback error
        throw new Error('Not authorized or already accepted');
      }
      
      // ATOMIC OPERATION: Update pickup request status only if it belongs to this assignment
      const pickupRequestUpdate = await PickupRequest.findOneAndUpdate(
        {
          _id: assignment.pickupRequestId._id,
          assignedTo: workerId, // Ensure it's assigned to the same worker
          status: { $in: ['ASSIGNED'] } // Must be in ASSIGNED status
        },
        {
          $set: {
            status: 'IN_TRANSIT',
            'timestamps.workerEnRoute': new Date()
          }
        },
        { 
          new: true,
          session
        }
      );
      
      // If pickup request update failed, abort transaction
      if (!pickupRequestUpdate) {
        throw new Error('Pickup request update failed - assignment mismatch');
      }
      
      // Update worker status
      await Worker.findByIdAndUpdate(
        workerId,
        { 
          'status.current': 'assigned',
          lastActivityAt: new Date()
        },
        { session }
      );
      
      await session.commitTransaction();
      
      return assignment;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Handle worker declining an assignment
   * Triggers reassignment process
   */
  static async declineAssignment(assignmentId, workerId, declineData = {}) {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();
      
      // Find the assignment
      const assignment = await Assignment.findById(assignmentId)
        .populate('pickupRequestId')
        .session(session);
      
      if (!assignment) {
        throw new Error('Assignment not found');
      }
      
      // Ensure only the assigned worker can decline
      if (assignment.workerId.toString() !== workerId.toString()) {
        throw new Error('You are not authorized to decline this assignment');
      }
      
      if (assignment.status !== 'PENDING') {
        throw new Error(`Cannot decline assignment with status: ${assignment.status}`);
      }
      
      // Decline the assignment
      await assignment.decline(declineData.reason, declineData.suggestAlternative);
      
      // Reset pickup request status
      const pickupRequest = assignment.pickupRequestId;
      pickupRequest.status = 'SCHEDULED';
      pickupRequest.assignedTo = null;
      pickupRequest.assignmentId = null;
      pickupRequest.assignedAt = null;
      pickupRequest.timestamps.assigned = null;
      
      await pickupRequest.save({ session });
      
      // Clear worker's current assignment
      await Worker.findByIdAndUpdate(
        workerId,
        { 
          currentAssignmentId: null,
          lastActivityAt: new Date()
        },
        { session }
      );
      
      await session.commitTransaction();
      
      // Trigger reassignment (outside transaction)
      setTimeout(async () => {
        try {
          await this.reassignPickupRequest(pickupRequest._id, {
            excludeWorkers: [workerId],
            assignmentType: 'auto',
            priority: Math.min(10, assignment.priority + 1) // Increase priority
          });
        } catch (error) {
          console.error('Reassignment failed:', error);
        }
      }, 1000);
      
      return assignment;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Find the best available worker for a pickup request
   */
  static async findBestWorker(pickupRequest, options = {}, session = null) {
    const query = {
      'status.current': 'available',
      'status.isActive': true,
      currentAssignmentId: null,
      zoneAssignments: pickupRequest.zoneId._id
    };
    
    // Exclude specific workers if provided
    if (options.excludeWorkers && options.excludeWorkers.length > 0) {
      query._id = { $nin: options.excludeWorkers };
    }
    
    // Find available workers in the zone
    const workers = await Worker.find(query, null, { session });
    
    if (workers.length === 0) {
      return null;
    }
    
    // Calculate scores for each worker
    const scoredWorkers = await Promise.all(
      workers.map(async (worker) => {
        const score = await this.calculateWorkerScore(worker, pickupRequest);
        return {
          ...worker.toObject(),
          score: score.total,
          matchingFactors: score.factors,
          distance: score.distance,
          travelTime: score.travelTime
        };
      })
    );
    
    // Sort by score (highest first)
    scoredWorkers.sort((a, b) => b.score - a.score);
    
    return scoredWorkers[0];
  }
  
  /**
   * Calculate worker score for assignment matching
   */
  static async calculateWorkerScore(worker, pickupRequest) {
    const factors = {};
    
    // 1. Proximity Score (40% weight)
    const distance = this.calculateDistance(
      worker.currentLocation.coordinates,
      pickupRequest.location.coordinates
    );
    factors.proximityScore = Math.max(0, 100 - (distance * 10)); // Decreases by 10 points per km
    
    // 2. Capacity Score (20% weight)
    const requiredCapacity = pickupRequest.wasteDetails.totalEstimatedKg;
    const availableCapacity = worker.vehicle.capacityKg - worker.currentLoad.currentKg;
    factors.capacityScore = availableCapacity >= requiredCapacity ? 100 : 
      Math.max(0, (availableCapacity / requiredCapacity) * 100);
    
    // 3. Experience Score (15% weight)
    factors.experienceScore = Math.min(100, worker.performance.completedJobs * 2);
    
    // 4. Availability Score (10% weight)
    const now = new Date();
    const workingHours = worker.schedule.workingHours;
    const currentHour = now.getHours();
    factors.availabilityScore = (currentHour >= workingHours.start && 
      currentHour < workingHours.end) ? 100 : 50;
    
    // 5. Performance Score (15% weight)
    factors.performanceScore = worker.performance.rating * 20; // Convert 5-star to 100-point scale
    
    // Calculate weighted total
    const total = (
      factors.proximityScore * 0.4 +
      factors.capacityScore * 0.2 +
      factors.experienceScore * 0.15 +
      factors.availabilityScore * 0.1 +
      factors.performanceScore * 0.15
    );
    
    // Estimate travel time (rough calculation)
    const travelTime = Math.round(distance * 3); // Assuming 20 km/h average speed
    
    return {
      total: Math.round(total),
      factors,
      distance: Math.round(distance * 100) / 100,
      travelTime
    };
  }
  
  /**
   * Calculate distance between two coordinates (in km)
   */
  static calculateDistance(coords1, coords2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degToRad(coords2[1] - coords1[1]);
    const dLon = this.degToRad(coords2[0] - coords1[0]);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(coords1[1])) * Math.cos(this.degToRad(coords2[1])) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  static degToRad(deg) {
    return deg * (Math.PI/180);
  }
  
  /**
   * Calculate priority based on pickup request characteristics
   */
  static calculatePriority(pickupRequest) {
    let priority = 1;
    
    if (pickupRequest.priority === 'urgent') priority = 10;
    else if (pickupRequest.priority === 'high') priority = 7;
    else if (pickupRequest.priority === 'normal') priority = 4;
    else priority = 1;
    
    // Increase priority for hazardous waste
    if (pickupRequest.wasteDetails.types.some(type => type.category === 'hazardous')) {
      priority = Math.min(10, priority + 2);
    }
    
    // Increase priority for special handling
    if (pickupRequest.wasteDetails.requiresSpecialHandling) {
      priority = Math.min(10, priority + 1);
    }
    
    return priority;
  }
  
  /**
   * Reassign a pickup request to a different worker
   */
  static async reassignPickupRequest(pickupRequestId, options = {}) {
    try {
      // Delete existing assignment if any
      await Assignment.findOneAndDelete({ pickupRequestId });
      
      // Create new assignment
      return await this.createAssignment(pickupRequestId, options);
      
    } catch (error) {
      throw new Error(`Reassignment failed: ${error.message}`);
    }
  }
  
  /**
   * Handle expired assignments
   */
  static async handleExpiredAssignments() {
    try {
      const expiredAssignments = await Assignment.findExpiredAssignments();
      
      for (const assignment of expiredAssignments) {
        await this.processExpiredAssignment(assignment);
      }
      
      return expiredAssignments.length;
      
    } catch (error) {
      console.error('Error handling expired assignments:', error);
      throw error;
    }
  }
  
  /**
   * Process a single expired assignment
   */
  static async processExpiredAssignment(assignment) {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();
      
      // Mark assignment as expired
      assignment.status = 'EXPIRED';
      await assignment.save({ session });
      
      // Reset pickup request
      const pickupRequest = await PickupRequest.findById(assignment.pickupRequestId)
        .session(session);
      
      if (pickupRequest) {
        pickupRequest.status = 'SCHEDULED';
        pickupRequest.assignedTo = null;
        pickupRequest.assignmentId = null;
        pickupRequest.assignedAt = null;
        pickupRequest.timestamps.assigned = null;
        await pickupRequest.save({ session });
      }
      
      // Clear worker assignment
      await Worker.findByIdAndUpdate(
        assignment.workerId,
        { currentAssignmentId: null },
        { session }
      );
      
      await session.commitTransaction();
      
      // Trigger reassignment with escalation
      setTimeout(async () => {
        try {
          await this.reassignPickupRequest(assignment.pickupRequestId, {
            assignmentType: 'escalated',
            priority: Math.min(10, assignment.priority + 2),
            excludeWorkers: [assignment.workerId]
          });
        } catch (error) {
          console.error('Escalated reassignment failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Get worker's pending assignments
   */
  static async getWorkerAssignments(workerId, status = null) {
    return await Assignment.findWorkerAssignments(workerId, status);
  }
  
  /**
   * Get assignment statistics
   */
  static async getAssignmentStats(workerId = null, dateRange = null) {
    return await Assignment.getAssignmentStats(workerId, dateRange);
  }
}

module.exports = AssignmentService;