// Socket.io server for real-time communication
const socketIO = require('socket.io');

class SocketServer {
  constructor() {
    this.io = null;
    this.connectedWorkers = new Map(); // workerId -> socketId
    this.connectedDashboards = new Map(); // officeCode -> [socketIds]
    this.officeRooms = new Map(); // officeCode -> Set of socketIds
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:8081"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('✅ Socket.io server initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New connection: ${socket.id}`);

      // Worker enrollment notification
      socket.on('worker-enrolled', (data) => {
        const { workerId, officeCode, workerName } = data;
        
        // CRITICAL: Store worker connection with unique socket ID
        // Prevent multiple workers from sharing the same socket
        if (this.connectedWorkers.has(workerId)) {
          // Disconnect the old socket if a worker reconnects
          const oldSocketId = this.connectedWorkers.get(workerId);
          const oldSocket = this.io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.disconnect(true);
          }
        }
        this.connectedWorkers.set(workerId, socket.id);
        
        // Join office room and UNIQUE worker room
        socket.join(`office-${officeCode}`);
        socket.join(`worker-${workerId}`);  // UNIQUE room per worker
        
        // Store worker ID on socket for later reference
        socket.workerId = workerId;
        socket.officeCode = officeCode;
        
        // Notify dashboard
        this.io.to(`dashboard-${officeCode}`).emit('new-worker-enrolled', {
          workerId,
          workerName,
          enrolledAt: new Date().toISOString(),
          status: 'active'
        });
        
        console.log(`✅ Worker ${workerName} (ID: ${workerId}) enrolled in office ${officeCode}`);
      });

      // Dashboard connection
      socket.on('dashboard-connect', (data) => {
        const { officeCode, operatorId } = data;
        
        // Join dashboard room
        socket.join(`dashboard-${officeCode}`);
        socket.join(`office-${officeCode}`);
        
        // Store dashboard connection
        if (!this.connectedDashboards.has(officeCode)) {
          this.connectedDashboards.set(officeCode, []);
        }
        this.connectedDashboards.get(officeCode).push(socket.id);
        
        console.log(`📊 Dashboard connected for office ${officeCode}`);
        
        // Send current worker status
        socket.emit('workers-status-update', this.getOfficeWorkersStatus(officeCode));
      });

      // Worker attendance check-in/out
      socket.on('attendance-marked', (data) => {
        const { workerId, workerName, officeCode, action, time, location } = data;
        
        // CRITICAL: Verify this socket belongs to the worker marking attendance
        if (socket.workerId && socket.workerId !== workerId) {
          console.error(`⚠️ Worker ${socket.workerId} tried to mark attendance for worker ${workerId}`);
          socket.emit('error', {
            message: 'You can only mark your own attendance',
            code: 'UNAUTHORIZED_ATTENDANCE'
          });
          return;
        }
        
        // Broadcast to dashboard ONLY
        this.io.to(`dashboard-${officeCode}`).emit('worker-attendance-update', {
          workerId,  // Specific worker ID
          workerName,
          action, // 'check_in' or 'check_out'
          time,
          location,
          timestamp: new Date().toISOString()
        });
        
        // Send confirmation ONLY to the specific worker
        socket.emit('attendance-confirmed', {
          action,
          time,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Attendance ${action} for ${workerName} (ID: ${workerId}) at ${time}`);
      });

      // Pickup assignment events
      socket.on('pickup-scheduled', (data) => {
        const { pickupId, citizenId, location, wasteTypes, scheduledTime } = data;
        
        // Notify all connected dashboards
        this.io.to('all-dashboards').emit('new-pickup-request', {
          pickupId,
          citizenId,
          location,
          wasteTypes,
          scheduledTime,
          status: 'pending',
          timestamp: new Date().toISOString()
        });
        
        console.log(`📦 New pickup scheduled: ${pickupId}`);
      });

      // Worker accepts pickup
      socket.on('pickup-accepted', (data) => {
        const { pickupId, workerId, workerName, officeCode } = data;
        
        // CRITICAL: Verify this is the correct worker accepting
        if (socket.workerId && socket.workerId !== workerId) {
          console.error(`⚠️ Worker ${socket.workerId} tried to accept pickup for worker ${workerId}`);
          socket.emit('error', {
            message: 'You cannot accept pickups for other workers',
            code: 'UNAUTHORIZED_PICKUP_ACCEPT'
          });
          return;
        }
        
        // Notify dashboard
        this.io.to(`dashboard-${officeCode}`).emit('pickup-assignment-update', {
          pickupId,
          workerId,  // Specific worker ID
          workerName,
          status: 'assigned',
          assignedAt: new Date().toISOString()
        });
        
        // Notify ONLY other workers to remove this from their available list
        socket.broadcast.to(`office-${officeCode}`).emit('pickup-no-longer-available', {
          pickupId,
          acceptedBy: workerId
        });
        
        // Notify citizen
        if (data.citizenId) {
          this.io.to(`citizen-${data.citizenId}`).emit('pickup-assigned', {
            pickupId,
            workerName,
            estimatedArrival: data.estimatedArrival
          });
        }
        
        console.log(`✅ Pickup ${pickupId} accepted by ${workerName} (ID: ${workerId})`);
      });

      // Worker starts pickup
      socket.on('pickup-started', (data) => {
        const { pickupId, workerId, location, officeCode } = data;
        
        this.io.to(`dashboard-${officeCode}`).emit('pickup-status-update', {
          pickupId,
          workerId,
          status: 'in-progress',
          currentLocation: location,
          startedAt: new Date().toISOString()
        });
        
        console.log(`🚛 Pickup ${pickupId} started`);
      });

      // Pickup completed with QR verification
      socket.on('pickup-completed', (data) => {
        const { 
          pickupId, 
          workerId, 
          officeCode, 
          qrVerified, 
          actualWeight, 
          completionPhoto 
        } = data;
        
        // Calculate incentive if weight > 15kg
        let incentiveEarned = 0;
        if (actualWeight > 15) {
          incentiveEarned = (actualWeight - 15) * 10; // ₹10 per kg above 15kg
        }
        
        // Notify dashboard with completion details
        this.io.to(`dashboard-${officeCode}`).emit('pickup-completed', {
          pickupId,
          workerId,
          status: 'completed',
          qrVerified,
          actualWeight,
          incentiveEarned,
          completionPhoto,
          completedAt: new Date().toISOString()
        });
        
        // Update worker stats
        this.io.to(`worker-${workerId}`).emit('stats-update', {
          pickupsCompleted: '+1',
          incentiveEarned,
          totalWeight: actualWeight
        });
        
        console.log(`✅ Pickup ${pickupId} completed. Incentive: ₹${incentiveEarned}`);
      });

      // Worker location update
      socket.on('worker-location-update', (data) => {
        const { workerId, officeCode, location, status } = data;
        
        // Broadcast to dashboard
        this.io.to(`dashboard-${officeCode}`).emit('worker-location-changed', {
          workerId,
          location,
          status,
          lastUpdated: new Date().toISOString()
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Disconnected: ${socket.id}`);
        
        // Remove from connected workers
        for (const [workerId, socketId] of this.connectedWorkers.entries()) {
          if (socketId === socket.id) {
            this.connectedWorkers.delete(workerId);
            
            // Notify dashboard worker is offline
            socket.broadcast.emit('worker-offline', { workerId });
            break;
          }
        }
        
        // Remove from connected dashboards
        for (const [officeCode, socketIds] of this.connectedDashboards.entries()) {
          const index = socketIds.indexOf(socket.id);
          if (index > -1) {
            socketIds.splice(index, 1);
            if (socketIds.length === 0) {
              this.connectedDashboards.delete(officeCode);
            }
            break;
          }
        }
      });
    });
  }

  // Helper method to get office workers status
  getOfficeWorkersStatus(officeCode) {
    const workers = [];
    for (const [workerId, socketId] of this.connectedWorkers.entries()) {
      // Check if worker belongs to this office
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.rooms.has(`office-${officeCode}`)) {
        workers.push({
          workerId,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      }
    }
    return workers;
  }

  // Send notification to specific worker
  notifyWorker(workerId, event, data) {
    const socketId = this.connectedWorkers.get(workerId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Broadcast to all dashboards in an office
  notifyOffice(officeCode, event, data) {
    this.io.to(`dashboard-${officeCode}`).emit(event, data);
  }
}

module.exports = SocketServer;