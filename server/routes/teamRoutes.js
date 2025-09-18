const express = require('express');
const router = express.Router();
const WorkerTeam = require('../models/WorkerTeam');
const User = require('../models/User');
const Pickup = require('../models/Pickup');

/**
 * Create a new worker team
 * POST /api/team/create
 */
router.post('/create', async (req, res) => {
  try {
    const { 
      teamName, 
      supervisorId, 
      coverageArea, 
      maxTeamSize = 5,
      operatingRadius 
    } = req.body;

    // Verify supervisor exists and is a worker
    const supervisor = await User.findOne({ 
      _id: supervisorId, 
      userType: 'worker' 
    });

    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found or is not a worker'
      });
    }

    // Check if supervisor is already managing a team
    const existingTeam = await WorkerTeam.findOne({ 
      supervisorId: supervisorId, 
      status: 'active' 
    });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'Supervisor is already managing a team'
      });
    }

    // Generate unique team ID
    const teamId = `TEAM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const newTeam = new WorkerTeam({
      teamId,
      teamName,
      supervisorId,
      supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
      coverageArea,
      maxTeamSize,
      operatingRadius
    });

    await newTeam.save();

    res.json({
      success: true,
      message: 'Team created successfully',
      team: newTeam
    });

  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
});

/**
 * Get team members for a supervisor
 * GET /api/team/members/:supervisorId
 */
router.get('/members/:supervisorId', async (req, res) => {
  try {
    const { supervisorId } = req.params;

    const team = await WorkerTeam.findOne({
      supervisorId: supervisorId,
      status: 'active'
    }).populate('teamMembers.workerId', 'firstName lastName email phone location');

    if (!team) {
      return res.json({
        success: true,
        team: null,
        message: 'No active team found for supervisor'
      });
    }

    res.json({
      success: true,
      team: team,
      memberCount: team.activeTeamMembersCount
    });

  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
});

/**
 * Add worker to team
 * PUT /api/team/add-member/:teamId/:workerId
 */
router.put('/add-member/:teamId/:workerId', async (req, res) => {
  try {
    const { teamId, workerId } = req.params;
    const { hasPhone = false, phoneNumber = null } = req.body;

    // Find the team
    const team = await WorkerTeam.findOne({ teamId: teamId, status: 'active' });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Find the worker
    const worker = await User.findOne({ 
      _id: workerId, 
      userType: 'worker' 
    });
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Check if worker is already in another team
    const existingTeam = await WorkerTeam.findOne({
      'teamMembers.workerId': workerId,
      status: 'active'
    });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'Worker is already in another team'
      });
    }

    // Add worker to team
    await team.addTeamMember({
      workerId: workerId,
      workerName: `${worker.firstName} ${worker.lastName}`,
      hasPhone,
      phoneNumber
    });

    res.json({
      success: true,
      message: 'Worker added to team successfully',
      teamId: teamId,
      workerId: workerId
    });

  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add team member'
    });
  }
});

/**
 * Remove worker from team
 * PUT /api/team/remove-member/:teamId/:workerId
 */
router.put('/remove-member/:teamId/:workerId', async (req, res) => {
  try {
    const { teamId, workerId } = req.params;

    const team = await WorkerTeam.findOne({ teamId: teamId, status: 'active' });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await team.removeTeamMember(workerId);

    res.json({
      success: true,
      message: 'Worker removed from team successfully'
    });

  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member',
      error: error.message
    });
  }
});

/**
 * Accept work on behalf of team member (supervised task assignment)
 * POST /api/team/accept-work-for-member
 */
router.post('/accept-work-for-member', async (req, res) => {
  try {
    const { 
      supervisorId, 
      workerId, 
      pickupId 
    } = req.body;

    // Verify supervisor's team
    const team = await WorkerTeam.findOne({
      supervisorId: supervisorId,
      status: 'active'
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor team not found'
      });
    }

    // Verify worker is in the team
    const teamMember = team.teamMembers.find(
      member => member.workerId.toString() === workerId.toString()
    );

    if (!teamMember) {
      return res.status(400).json({
        success: false,
        message: 'Worker is not a member of supervisor\'s team'
      });
    }

    // Use the atomic task acceptance from Pickup model
    const result = await Pickup.acceptTaskAtomically(
      pickupId, 
      workerId,
      teamMember.workerName
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Update pickup with team information
    await Pickup.findByIdAndUpdate(result.pickup._id, {
      supervisorId: supervisorId,
      assignmentMethod: 'supervised',
      teamId: team.teamId
    });

    res.json({
      success: true,
      message: 'Task assigned to team member successfully',
      pickup: result.pickup,
      assignedTo: teamMember.workerName,
      supervisorId: supervisorId
    });

  } catch (error) {
    console.error('Error accepting work for team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign task to team member',
      error: error.message
    });
  }
});

/**
 * Update pickup status on behalf of team member
 * PUT /api/team/update-status/:pickupId
 */
router.put('/update-status/:pickupId', async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { 
      supervisorId, 
      status, 
      actualWeight, 
      notes,
      qrVerificationCode
    } = req.body;

    // Verify supervisor's authorization
    const pickup = await Pickup.findOne({
      $or: [
        { _id: pickupId },
        { pickupId: pickupId }
      ]
    });

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found'
      });
    }

    // Verify supervisor is authorized to update this pickup
    if (pickup.supervisorId.toString() !== supervisorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Supervisor not authorized to update this pickup'
      });
    }

    // Update pickup status
    const updateData = {
      status: status,
      updatedAt: new Date()
    };

    if (status === 'in_progress') {
      updateData.startedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
      if (actualWeight) updateData.actualWeight = actualWeight;
      if (notes) updateData.completionNotes = notes;
      if (qrVerificationCode) {
        updateData.qrVerified = true;
        updateData.qrVerifiedAt = new Date();
      }
    }

    const updatedPickup = await Pickup.findByIdAndUpdate(
      pickup._id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: `Pickup status updated to ${status}`,
      pickup: updatedPickup
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
 * Get all tasks assigned to team members
 * GET /api/team/tasks/:supervisorId
 */
router.get('/tasks/:supervisorId', async (req, res) => {
  try {
    const { supervisorId } = req.params;

    // Get supervisor's team
    const team = await WorkerTeam.findOne({
      supervisorId: supervisorId,
      status: 'active'
    });

    if (!team) {
      return res.json({
        success: true,
        tasks: [],
        message: 'No active team found'
      });
    }

    // Get all team member IDs
    const memberIds = team.teamMembers.map(member => member.workerId);

    // Fetch tasks assigned to team members
    const tasks = await Pickup.find({
      assignedWorkerId: { $in: memberIds },
      status: { $in: ['assigned', 'in_progress'] }
    }).populate('assignedWorkerId', 'firstName lastName');

    // Add team member info to each task
    const tasksWithTeamInfo = tasks.map(task => {
      const teamMember = team.teamMembers.find(
        member => member.workerId.toString() === task.assignedWorkerId.toString()
      );

      return {
        ...task.toObject(),
        teamMember: teamMember ? {
          workerName: teamMember.workerName,
          hasPhone: teamMember.hasPhone,
          phoneNumber: teamMember.phoneNumber
        } : null
      };
    });

    res.json({
      success: true,
      tasks: tasksWithTeamInfo,
      teamInfo: {
        teamId: team.teamId,
        teamName: team.teamName,
        memberCount: team.activeTeamMembersCount
      }
    });

  } catch (error) {
    console.error('Error fetching team tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team tasks',
      error: error.message
    });
  }
});

/**
 * Get available workers for team supervision (workers without phones)
 * GET /api/team/available-workers
 */
router.get('/available-workers', async (req, res) => {
  try {
    const availableWorkers = await WorkerTeam.getAvailableWorkersForSupervision();

    res.json({
      success: true,
      workers: availableWorkers,
      count: availableWorkers.length
    });

  } catch (error) {
    console.error('Error fetching available workers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available workers',
      error: error.message
    });
  }
});

/**
 * Get team performance metrics
 * GET /api/team/metrics/:teamId
 */
router.get('/metrics/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await WorkerTeam.findOne({ teamId: teamId, status: 'active' });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Calculate team metrics
    const metrics = await team.calculateTeamMetrics();
    const workloadDistribution = await team.getWorkloadDistribution();

    res.json({
      success: true,
      teamMetrics: metrics,
      workloadDistribution: workloadDistribution,
      teamInfo: {
        teamName: team.teamName,
        memberCount: team.activeTeamMembersCount,
        coverageArea: team.coverageArea
      }
    });

  } catch (error) {
    console.error('Error fetching team metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team metrics',
      error: error.message
    });
  }
});

/**
 * Generate printable route sheet for team
 * GET /api/team/route-sheet/:supervisorId
 */
router.get('/route-sheet/:supervisorId', async (req, res) => {
  try {
    const { supervisorId } = req.params;

    // Get supervisor's team and tasks
    const team = await WorkerTeam.findOne({
      supervisorId: supervisorId,
      status: 'active'
    });

    if (!team) {
      return res.json({
        success: true,
        routeSheet: null,
        message: 'No active team found'
      });
    }

    const memberIds = team.teamMembers.map(member => member.workerId);
    const tasks = await Pickup.find({
      assignedWorkerId: { $in: memberIds },
      status: 'assigned',
      scheduledDate: { $gte: new Date().toISOString().split('T')[0] } // Today or future
    }).sort({ scheduledDate: 1, timeSlot: 1 });

    // Format route sheet data
    const routeSheet = {
      teamInfo: {
        teamName: team.teamName,
        supervisorName: team.supervisorName,
        date: new Date().toISOString().split('T')[0],
        memberCount: team.activeTeamMembersCount
      },
      tasks: tasks.map(task => {
        const assignedMember = team.teamMembers.find(
          member => member.workerId.toString() === task.assignedWorkerId.toString()
        );

        return {
          pickupId: task.pickupId,
          address: task.customerAddress || task.address,
          wasteTypes: task.wasteTypes,
          timeSlot: task.timeSlot,
          estimatedWeight: task.estimatedWeight,
          specialInstructions: task.specialInstructions,
          assignedWorker: assignedMember?.workerName || 'Unassigned',
          verificationCode: task.verificationCode || task.pickupId,
          customerPhone: task.customerPhone,
          priority: task.priority || 'medium'
        };
      })
    };

    res.json({
      success: true,
      routeSheet: routeSheet
    });

  } catch (error) {
    console.error('Error generating route sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate route sheet',
      error: error.message
    });
  }
});

module.exports = router;