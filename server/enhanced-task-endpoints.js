// Enhanced task endpoints to prevent duplicate assignments
// Replace your existing task endpoints with these improved versions

const express = require('express');
const Pickup = require('./models/Pickup');

// Enhanced worker task accept endpoint with comprehensive validation
const enhancedTaskAcceptEndpoint = async (req, res) => {
  try {
    const { taskId } = req.params;
    const workerId = req.user?.userId || req.user?.id || 'demo-worker';
    const workerName = req.user?.name || `Worker ${workerId}`;
    
    console.log(`🎯 Worker ${workerId} (${workerName}) attempting to accept task ${taskId}`);
    
    // First check if task is still available before attempting atomic operation
    const preCheck = await Pickup.isTaskAvailable(taskId);
    if (!preCheck) {
      console.log(`❌ Pre-check failed: Task ${taskId} is no longer available`);
      return res.status(409).json({
        success: false,
        error: 'TASK_NOT_AVAILABLE',
        message: 'This task has already been accepted by another worker or is no longer available.',
        taskId: taskId
      });
    }
    
    // Use atomic task acceptance to prevent race conditions
    const result = await Pickup.acceptTaskAtomically(taskId, workerId, workerName);
    
    if (result.success) {
      console.log(`✅ Task ${taskId} successfully accepted by worker ${workerId}`);
      
      // Enhanced real-time notifications
      const io = req.app.locals.io; // Assuming you store io in app.locals
      
      if (io) {
        // 1. Notify all workers that this task is no longer available
        io.to('workers').emit('task-no-longer-available', {
          taskId: taskId,
          pickupId: result.pickup._id,
          acceptedBy: workerId,
          acceptedByName: workerName,
          timestamp: new Date().toISOString(),
          message: `Task ${taskId} has been accepted by ${workerName}`
        });
        
        // 2. Notify the specific worker who got the assignment
        io.to(`worker-${workerId}`).emit('task-assigned-to-you', {
          taskId: taskId,
          pickup: result.pickup,
          message: 'Task successfully assigned to you!',
          timestamp: new Date().toISOString()
        });
        
        // 3. Notify citizen about assignment
        if (result.pickup.citizenId) {
          io.to(`citizen-${result.pickup.citizenId}`).emit('pickup-assigned', {
            pickupId: result.pickup._id,
            workerId: workerId,
            workerName: workerName,
            estimatedArrival: result.pickup.scheduledDate,
            timestamp: new Date().toISOString()
          });
        }
        
        // 4. Broadcast updated task counts
        const availableCount = await Pickup.countDocuments({
          status: { $in: ['scheduled', 'pending'] },
          workerId: null
        });
        
        io.to('workers').emit('available-tasks-count-updated', {
          count: availableCount,
          timestamp: new Date().toISOString()
        });
        
        console.log(`📡 Sent real-time notifications for task ${taskId} acceptance`);
      }
      
      // Response to the worker who accepted the task
      res.json({
        success: true,
        message: result.message,
        task: result.pickup,
        assignedAt: result.pickup.assignedAt,
        nextAction: 'start_pickup',
        estimatedArrival: result.pickup.scheduledDate
      });
      
    } else {
      console.log(`❌ Task acceptance failed for worker ${workerId}: ${result.error}`);
      
      // Determine HTTP status based on error type
      let statusCode = 400;
      if (result.error === 'TASK_NOT_AVAILABLE') {
        statusCode = 409; // Conflict - task already taken
      } else if (result.error === 'RACE_CONDITION') {
        statusCode = 409; // Conflict - another worker got it first
      } else if (result.error === 'DATABASE_ERROR') {
        statusCode = 500; // Server error
      }
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        message: result.message,
        taskId: taskId,
        retryable: result.error !== 'TASK_NOT_AVAILABLE',
        suggestions: [
          'Refresh your task list to see current available tasks',
          'Try accepting a different task',
          'Check your internet connection and try again'
        ]
      });
    }
  } catch (error) {
    console.error('💥 Error in task acceptance endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred while accepting the task. Please try again.',
      taskId: req.params.taskId
    });
  }
};

// Enhanced available tasks endpoint with real-time checks
const enhancedAvailableTasksEndpoint = async (req, res) => {
  try {
    const Pickup = require('./models/Pickup');
    const workerId = req.user?.userId || req.user?.id;
    
    console.log(`📋 Fetching available tasks for worker ${workerId}`);
    
    // Find potentially available tasks
    const potentialTasks = await Pickup.find({
      status: { $in: ['scheduled', 'pending'] },
      workerId: null,
      scheduledDate: { $gte: new Date() } // Only future or today's tasks
    }).populate('citizenId', 'firstName lastName phone address location')
      .sort({ scheduledDate: 1, priority: -1, createdAt: -1 })
      .limit(50); // Limit to prevent too much data
    
    // Double-check each task is still available (prevents showing stale tasks)
    const availableTasks = [];
    for (const task of potentialTasks) {
      const stillAvailable = await Pickup.isTaskAvailable(task._id);
      if (stillAvailable) {
        // Add computed fields for mobile app
        const taskWithExtras = {
          ...task.toObject(),
          distanceFromWorker: null, // Could calculate based on worker location
          estimatedEarnings: task.calculateCost ? task.calculateCost() : 50,
          timeSlotLabel: task.getTimeSlotDetails ? task.getTimeSlotDetails()?.label : task.timeSlot,
          isUrgent: task.priority === 'urgent' || task.isOverdue?.(),
          canAccept: true, // Always true since we already checked availability
          lastChecked: new Date().toISOString()
        };
        availableTasks.push(taskWithExtras);
      } else {
        console.log(`⚠️ Task ${task.pickupId} appeared available but was actually taken`);
      }
    }
    
    console.log(`✅ Found ${availableTasks.length} verified available tasks`);
    
    res.json({
      success: true,
      tasks: availableTasks,
      count: availableTasks.length,
      message: `Found ${availableTasks.length} tasks available for assignment`,
      lastUpdated: new Date().toISOString(),
      refreshInterval: 30, // Suggest mobile app refresh every 30 seconds
      metadata: {
        workerId: workerId,
        totalPotential: potentialTasks.length,
        filtered: potentialTasks.length - availableTasks.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching available tasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch available tasks', 
      error: error.message,
      tasks: [] // Return empty array to prevent app crashes
    });
  }
};

// Enhanced worker dashboard with real-time stats
const enhancedWorkerDashboardEndpoint = async (req, res) => {
  try {
    const workerId = req.user?.userId || req.user?.id;
    console.log(`📊 Fetching dashboard data for worker ${workerId}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get various statistics
    const [
      assignedTasks,
      availableTasksCount,
      completedToday,
      totalEarningsToday,
      workerStats
    ] = await Promise.all([
      // Tasks assigned to this worker
      Pickup.find({
        workerId: workerId,
        status: { $in: ['assigned', 'in_progress'] }
      }).populate('citizenId', 'firstName lastName phone address'),
      
      // Available tasks count
      Pickup.countDocuments({
        status: { $in: ['scheduled', 'pending'] },
        workerId: null,
        scheduledDate: { $gte: new Date() }
      }),
      
      // Completed today
      Pickup.countDocuments({
        workerId: workerId,
        status: 'completed',
        completedAt: { $gte: today }
      }),
      
      // Earnings today (simplified calculation)
      Pickup.aggregate([
        {
          $match: {
            workerId: mongoose.Types.ObjectId(workerId),
            status: 'completed',
            completedAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalWeight: { $sum: '$actualWeight' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Worker overall stats
      Pickup.aggregate([
        {
          $match: {
            workerId: mongoose.Types.ObjectId(workerId)
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    // Calculate earnings (Rs 50 base + Rs 10 per kg)
    const todayEarnings = totalEarningsToday[0] ? 
      (totalEarningsToday[0].count * 50) + (totalEarningsToday[0].totalWeight * 10) : 0;
    
    // Format worker stats
    const statsMap = {};
    workerStats.forEach(stat => {
      statsMap[stat._id] = stat.count;
    });
    
    // Add urgency indicators to assigned tasks
    const tasksWithUrgency = assignedTasks.map(task => ({
      ...task.toObject(),
      isUrgent: task.priority === 'urgent' || (task.isOverdue && task.isOverdue()),
      timeUntilDue: task.scheduledDate ? 
        Math.max(0, Math.round((task.scheduledDate - new Date()) / (1000 * 60))) : null,
      estimatedEarnings: task.calculateCost ? task.calculateCost() : 50
    }));
    
    res.json({
      success: true,
      stats: {
        assignedTasks: tasksWithUrgency.length,
        availableTasks: availableTasksCount,
        completedToday: completedToday,
        todayEarnings: todayEarnings,
        totalCompleted: statsMap.completed || 0,
        totalAssigned: statsMap.assigned || 0,
        averageRating: 4.2, // Could calculate from actual ratings
        responseTime: '12 min', // Could calculate from actual data
        efficiency: '85%' // Could calculate from actual performance
      },
      assignedTasks: tasksWithUrgency,
      quickActions: [
        {
          id: 'find_tasks',
          title: 'Find New Tasks',
          description: `${availableTasksCount} tasks available`,
          enabled: availableTasksCount > 0,
          action: 'navigate_to_tasks'
        },
        {
          id: 'scan_qr',
          title: 'Scan QR Code',
          description: 'Complete pickup verification',
          enabled: tasksWithUrgency.some(t => t.status === 'in_progress'),
          action: 'open_scanner'
        },
        {
          id: 'view_map',
          title: 'View Map',
          description: 'See nearby pickups',
          enabled: true,
          action: 'open_map'
        }
      ],
      lastUpdated: new Date().toISOString(),
      nextRefresh: new Date(Date.now() + 60000).toISOString() // Suggest refresh in 1 minute
    });
    
  } catch (error) {
    console.error('❌ Error fetching worker dashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard data', 
      error: error.message 
    });
  }
};

// Middleware to attach Socket.IO to requests
const attachSocketIO = (io) => {
  return (req, res, next) => {
    req.app.locals.io = io;
    next();
  };
};

// Enhanced real-time event handlers
const setupEnhancedSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
    
    // Worker joins their specific room
    socket.on('join-worker-room', (workerId) => {
      socket.join('workers');
      socket.join(`worker-${workerId}`);
      console.log(`👷 Worker ${workerId} joined rooms`);
      
      // Send current available task count to this worker
      Pickup.countDocuments({
        status: { $in: ['scheduled', 'pending'] },
        workerId: null,
        scheduledDate: { $gte: new Date() }
      }).then(count => {
        socket.emit('available-tasks-count', { count, timestamp: new Date().toISOString() });
      });
    });
    
    // Citizen joins their room
    socket.on('join-citizen-room', (citizenId) => {
      socket.join('citizens');
      socket.join(`citizen-${citizenId}`);
      console.log(`👤 Citizen ${citizenId} joined rooms`);
    });
    
    // Worker requests task refresh
    socket.on('refresh-available-tasks', async (workerId) => {
      try {
        const count = await Pickup.countDocuments({
          status: { $in: ['scheduled', 'pending'] },
          workerId: null,
          scheduledDate: { $gte: new Date() }
        });
        
        socket.emit('available-tasks-count-updated', {
          count,
          timestamp: new Date().toISOString(),
          requestedBy: workerId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to refresh task count' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
};

module.exports = {
  enhancedTaskAcceptEndpoint,
  enhancedAvailableTasksEndpoint,
  enhancedWorkerDashboardEndpoint,
  attachSocketIO,
  setupEnhancedSocketHandlers
};

/* 
USAGE INSTRUCTIONS:

1. Replace your existing endpoints in index.js:

// Replace the task accept endpoint
app.post('/api/worker/tasks/:taskId/accept', authenticateToken, enhancedTaskAcceptEndpoint);

// Replace the available tasks endpoint  
app.get('/api/worker/available-tasks', authenticateToken, enhancedAvailableTasksEndpoint);

// Replace the dashboard endpoint
app.get('/api/worker/dashboard', authenticateToken, enhancedWorkerDashboardEndpoint);

2. Add the Socket.IO middleware:
app.use(attachSocketIO(io));

3. Setup enhanced socket handlers:
setupEnhancedSocketHandlers(io);

4. Mobile App Changes Needed:
- Listen for 'task-no-longer-available' events to remove tasks from UI immediately
- Implement auto-refresh every 30 seconds for task list
- Show "Task no longer available" message when assignment fails with 409 status
- Clear task list cache after any successful assignment
*/