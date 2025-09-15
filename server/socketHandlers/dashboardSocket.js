const jwt = require('jsonwebtoken');
const OfficeOperator = require('../models/OfficeOperator');
const WorkerPerformance = require('../models/WorkerPerformance');
const Worker = require('../models/Worker');

// Dashboard Socket Authentication Middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'waste-management-secret');
    
    // Verify it's a dashboard token
    if (decoded.type !== 'dashboard') {
      return next(new Error('Invalid token type for dashboard'));
    }

    const operator = await OfficeOperator.findById(decoded.operatorId)
      .populate('officeInfo.officeId');
    
    if (!operator || operator.status !== 'active') {
      return next(new Error('Invalid or inactive operator'));
    }

    socket.operator = operator;
    socket.officeId = decoded.officeId;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// Dashboard Socket Event Handlers
const handleDashboardConnection = (io) => {
  const dashboardNamespace = io.of('/dashboard');
  
  dashboardNamespace.use(authenticateSocket);
  
  dashboardNamespace.on('connection', (socket) => {
    console.log(`Dashboard operator connected: ${socket.operator.personalInfo.email}`);
    
    // Join office-specific room
    const officeRoom = `office-${socket.officeId}`;
    socket.join(officeRoom);
    
    // Join operator-specific room
    const operatorRoom = `operator-${socket.operator._id}`;
    socket.join(operatorRoom);

    // Send initial connection confirmation
    socket.emit('dashboard-connected', {
      operatorId: socket.operator._id,
      officeId: socket.officeId,
      officeName: socket.operator.officeInfo.officeId.officeName,
      timestamp: new Date()
    });

    // Handle real-time worker tracking subscription
    socket.on('subscribe-worker-tracking', async (data) => {
      try {
        const { workerIds = [] } = data;
        
        // Validate workers belong to this office
        const workers = await Worker.find({
          _id: { $in: workerIds },
          'workLocation.officeId': socket.officeId
        });

        if (workers.length !== workerIds.length) {
          socket.emit('error', {
            message: 'Some workers do not belong to your office',
            code: 'INVALID_WORKER_ACCESS'
          });
          return;
        }

        // Join worker-specific rooms for tracking
        workerIds.forEach(workerId => {
          socket.join(`worker-${workerId}`);
        });

        socket.emit('worker-tracking-subscribed', {
          subscribedWorkers: workers.map(w => ({
            _id: w._id,
            name: `${w.personalInfo.firstName} ${w.personalInfo.lastName}`,
            workerId: w.workerId
          }))
        });

      } catch (error) {
        console.error('Worker tracking subscription error:', error);
        socket.emit('error', {
          message: 'Failed to subscribe to worker tracking',
          code: 'SUBSCRIPTION_ERROR'
        });
      }
    });

    // Handle performance data update from mobile app
    socket.on('performance-update', async (data) => {
      try {
        const { workerId, performanceData } = data;
        
        // Verify worker belongs to this office
        const worker = await Worker.findOne({
          _id: workerId,
          'workLocation.officeId': socket.officeId
        });

        if (!worker) {
          socket.emit('error', {
            message: 'Worker not found in your office',
            code: 'WORKER_NOT_FOUND'
          });
          return;
        }

        // Update performance data
        const performance = await WorkerPerformance.findOneAndUpdate(
          {
            workerId,
            officeId: socket.officeId,
            date: {
              $gte: new Date().setHours(0, 0, 0, 0),
              $lte: new Date().setHours(23, 59, 59, 999)
            }
          },
          {
            $set: {
              ...performanceData,
              updatedAt: new Date(),
              reportedBy: socket.operator._id
            }
          },
          { 
            upsert: true, 
            new: true,
            runValidators: true 
          }
        );

        // Emit real-time update to all dashboard clients in this office
        dashboardNamespace.to(officeRoom).emit('worker-performance-updated', {
          workerId,
          workerName: `${worker.personalInfo.firstName} ${worker.personalInfo.lastName}`,
          performance: performance.wasteCollection,
          incentive: performance.getIncentiveDetails(),
          timestamp: new Date()
        });

        socket.emit('performance-update-success', {
          workerId,
          performance: performance.wasteCollection,
          incentive: performance.getIncentiveDetails()
        });

      } catch (error) {
        console.error('Performance update error:', error);
        socket.emit('error', {
          message: 'Failed to update performance data',
          code: 'PERFORMANCE_UPDATE_ERROR'
        });
      }
    });

    // Handle manual performance entry
    socket.on('manual-performance-entry', async (data) => {
      try {
        const { workerId, wasteCollection, notes } = data;
        
        // Verify worker belongs to this office
        const worker = await Worker.findOne({
          _id: workerId,
          'workLocation.officeId': socket.officeId
        });

        if (!worker) {
          socket.emit('error', {
            message: 'Worker not found in your office',
            code: 'WORKER_NOT_FOUND'
          });
          return;
        }

        // Create or update performance record
        const performance = await WorkerPerformance.findOneAndUpdate(
          {
            workerId,
            officeId: socket.officeId,
            date: {
              $gte: new Date().setHours(0, 0, 0, 0),
              $lte: new Date().setHours(23, 59, 59, 999)
            }
          },
          {
            $set: {
              wasteCollection,
              notes,
              updatedAt: new Date(),
              reportedBy: socket.operator._id,
              entryType: 'manual'
            }
          },
          { 
            upsert: true, 
            new: true,
            runValidators: true 
          }
        );

        // Broadcast update to all office dashboard clients
        dashboardNamespace.to(officeRoom).emit('worker-performance-updated', {
          workerId,
          workerName: `${worker.personalInfo.firstName} ${worker.personalInfo.lastName}`,
          performance: performance.wasteCollection,
          incentive: performance.getIncentiveDetails(),
          entryType: 'manual',
          timestamp: new Date()
        });

        socket.emit('manual-entry-success', {
          workerId,
          performance: performance.wasteCollection,
          incentive: performance.getIncentiveDetails()
        });

      } catch (error) {
        console.error('Manual performance entry error:', error);
        socket.emit('error', {
          message: 'Failed to record manual performance entry',
          code: 'MANUAL_ENTRY_ERROR'
        });
      }
    });

    // Handle incentive payment processing
    socket.on('process-incentive-payment', async (data) => {
      try {
        const { performanceIds, paymentReference } = data;

        // Verify all performances belong to this office
        const performances = await WorkerPerformance.find({
          _id: { $in: performanceIds },
          officeId: socket.officeId,
          'incentive.earnedAmount': { $gt: 0 },
          'incentive.paid': false
        }).populate('workerId', 'personalInfo workerId');

        if (performances.length !== performanceIds.length) {
          socket.emit('error', {
            message: 'Some performance records not found or already paid',
            code: 'INVALID_PERFORMANCE_IDS'
          });
          return;
        }

        // Process payments
        const totalAmount = performances.reduce((sum, p) => sum + p.incentive.earnedAmount, 0);
        const paymentRef = paymentReference || `PAY-${Date.now()}`;

        await WorkerPerformance.updateMany(
          { _id: { $in: performanceIds } },
          {
            $set: {
              'incentive.paid': true,
              'incentive.paymentDate': new Date(),
              'incentive.paymentReference': paymentRef,
              verifiedBy: socket.operator._id
            }
          }
        );

        // Broadcast payment update
        dashboardNamespace.to(officeRoom).emit('incentive-payments-processed', {
          paymentReference: paymentRef,
          totalAmount,
          paymentsProcessed: performances.length,
          workerPayments: performances.map(p => ({
            workerId: p.workerId._id,
            workerName: `${p.workerId.personalInfo.firstName} ${p.workerId.personalInfo.lastName}`,
            workerCode: p.workerId.workerId,
            amount: p.incentive.earnedAmount,
            date: p.date
          })),
          processedBy: socket.operator.personalInfo.firstName,
          timestamp: new Date()
        });

        socket.emit('payment-processing-success', {
          paymentReference: paymentRef,
          totalAmount,
          paymentsProcessed: performances.length
        });

      } catch (error) {
        console.error('Incentive payment processing error:', error);
        socket.emit('error', {
          message: 'Failed to process incentive payments',
          code: 'PAYMENT_PROCESSING_ERROR'
        });
      }
    });

    // Handle dashboard analytics request
    socket.on('request-analytics-update', async (data) => {
      try {
        const { range = 'today', metrics = [] } = data;
        
        // Get date range
        const getDateRange = (range) => {
          const now = new Date();
          switch (range) {
            case 'today':
              return { 
                start: new Date(now.setHours(0, 0, 0, 0)), 
                end: new Date(now.setHours(23, 59, 59, 999)) 
              };
            case 'week':
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              startOfWeek.setHours(0, 0, 0, 0);
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              endOfWeek.setHours(23, 59, 59, 999);
              return { start: startOfWeek, end: endOfWeek };
            case 'month':
              return { 
                start: new Date(now.getFullYear(), now.getMonth(), 1), 
                end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) 
              };
            default:
              return { 
                start: new Date(now.setHours(0, 0, 0, 0)), 
                end: new Date(now.setHours(23, 59, 59, 999)) 
              };
          }
        };

        const { start, end } = getDateRange(range);

        // Get analytics data
        const performances = await WorkerPerformance.find({
          officeId: socket.officeId,
          date: { $gte: start, $lte: end }
        }).populate('workerId', 'personalInfo workerId');

        const analytics = {
          totalWasteCollected: performances.reduce((sum, p) => sum + (p.wasteCollection?.totalWeight || 0), 0),
          totalPickups: performances.reduce((sum, p) => sum + (p.wasteCollection?.pickupsCompleted || 0), 0),
          totalIncentives: performances.reduce((sum, p) => sum + (p.incentive?.earnedAmount || 0), 0),
          activeWorkers: [...new Set(performances.map(p => p.workerId._id.toString()))].length,
          averageEfficiency: performances.length > 0 ? 
            Math.round(performances.reduce((sum, p) => sum + (p.summary?.efficiency || 0), 0) / performances.length) : 0,
          topPerformers: performances
            .sort((a, b) => (b.wasteCollection?.totalWeight || 0) - (a.wasteCollection?.totalWeight || 0))
            .slice(0, 5)
            .map(p => ({
              workerId: p.workerId._id,
              workerName: `${p.workerId.personalInfo.firstName} ${p.workerId.personalInfo.lastName}`,
              workerCode: p.workerId.workerId,
              totalWeight: p.wasteCollection?.totalWeight || 0,
              incentiveEarned: p.incentive?.earnedAmount || 0
            }))
        };

        socket.emit('analytics-update', {
          range,
          analytics,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Analytics update error:', error);
        socket.emit('error', {
          message: 'Failed to fetch analytics data',
          code: 'ANALYTICS_ERROR'
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Dashboard operator disconnected: ${socket.operator.personalInfo.email}, reason: ${reason}`);
      
      // Update last active time
      OfficeOperator.findByIdAndUpdate(socket.operator._id, {
        'activity.lastActiveAt': new Date()
      }).catch(err => console.error('Error updating last active time:', err));
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Dashboard socket error:', error);
      socket.emit('error', {
        message: 'Socket connection error',
        code: 'SOCKET_ERROR'
      });
    });
  });

  return dashboardNamespace;
};

// Helper function to emit updates from mobile app
const emitWorkerLocationUpdate = (io, officeId, locationData) => {
  const dashboardNamespace = io.of('/dashboard');
  dashboardNamespace.to(`office-${officeId}`).emit('worker-location-update', {
    workerId: locationData.workerId,
    location: locationData.location,
    timestamp: locationData.timestamp,
    status: locationData.status
  });
};

// Helper function to emit pickup completion updates
const emitPickupCompletion = (io, officeId, pickupData) => {
  const dashboardNamespace = io.of('/dashboard');
  dashboardNamespace.to(`office-${officeId}`).emit('pickup-completed', {
    workerId: pickupData.workerId,
    pickupId: pickupData.pickupId,
    weight: pickupData.weight,
    location: pickupData.location,
    timestamp: new Date(),
    incentiveImpact: pickupData.incentiveImpact
  });
};

// Helper function to emit system alerts
const emitSystemAlert = (io, officeId, alertData) => {
  const dashboardNamespace = io.of('/dashboard');
  dashboardNamespace.to(`office-${officeId}`).emit('system-alert', {
    type: alertData.type,
    message: alertData.message,
    severity: alertData.severity,
    workerId: alertData.workerId,
    timestamp: new Date(),
    actionRequired: alertData.actionRequired
  });
};

module.exports = {
  handleDashboardConnection,
  emitWorkerLocationUpdate,
  emitPickupCompletion,
  emitSystemAlert
};