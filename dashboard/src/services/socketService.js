// Socket.io client service for dashboard real-time updates
import io from 'socket.io-client';

class DashboardSocketService {
  constructor() {
    this.socket = null;
    this.serverUrl = 'http://localhost:3000';
    this.officeCode = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
  }

  initialize(officeCode, authToken, operatorId) {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    this.officeCode = officeCode;

    // Initialize socket connection
    this.socket = io(this.serverUrl, {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers(operatorId);
    console.log('✅ Dashboard socket service initialized');
  }

  setupEventHandlers(operatorId) {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Dashboard connected to socket server');
      this.reconnectAttempts = 0;
      
      // Register dashboard
      this.socket.emit('dashboard-connect', {
        officeCode: this.officeCode,
        operatorId: operatorId
      });
      
      // Trigger connected callback
      this.triggerListeners('connected', { officeCode: this.officeCode });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Dashboard disconnected from socket server');
      this.triggerListeners('disconnected', {});
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    // Worker enrollment updates
    this.socket.on('new-worker-enrolled', (data) => {
      console.log('👷 New worker enrolled:', data);
      this.showNotification('New Worker Enrolled', `${data.workerName} has joined your office`);
      this.triggerListeners('worker-enrolled', data);
    });

    // Worker attendance updates
    this.socket.on('worker-attendance-update', (data) => {
      console.log('📋 Worker attendance update:', data);
      const action = data.action === 'check_in' ? 'checked in' : 'checked out';
      this.showNotification('Attendance Update', `${data.workerName} ${action}`);
      this.triggerListeners('attendance-update', data);
    });

    // Pickup request updates
    this.socket.on('new-pickup-request', (data) => {
      console.log('📦 New pickup request:', data);
      this.showNotification('New Pickup Request', `Pickup scheduled at ${data.location}`);
      this.triggerListeners('new-pickup', data);
    });

    // Pickup assignment updates
    this.socket.on('pickup-assignment-update', (data) => {
      console.log('✅ Pickup assigned:', data);
      this.triggerListeners('pickup-assigned', data);
    });

    // Pickup status updates
    this.socket.on('pickup-status-update', (data) => {
      console.log('🚛 Pickup status update:', data);
      this.triggerListeners('pickup-status', data);
    });

    // Pickup completion with incentive calculation
    this.socket.on('pickup-completed', (data) => {
      console.log('✅ Pickup completed:', data);
      
      if (data.incentiveEarned > 0) {
        this.showNotification(
          'Pickup Completed with Incentive',
          `Worker earned ₹${data.incentiveEarned} for collecting ${data.actualWeight}kg`
        );
      } else {
        this.showNotification('Pickup Completed', `${data.actualWeight}kg collected`);
      }
      
      this.triggerListeners('pickup-completed', data);
    });

    // Worker location updates
    this.socket.on('worker-location-changed', (data) => {
      // Update worker marker on map
      this.triggerListeners('worker-location', data);
    });

    // Worker offline notification
    this.socket.on('worker-offline', (data) => {
      console.log('📴 Worker went offline:', data.workerId);
      this.triggerListeners('worker-offline', data);
    });

    // Workers status update
    this.socket.on('workers-status-update', (workers) => {
      console.log('👥 Workers status:', workers);
      this.triggerListeners('workers-status', workers);
    });
  }

  // Show browser notification
  showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/notification-icon.png',
        badge: '/badge-icon.png',
        vibrate: [200, 100, 200]
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body: message });
        }
      });
    }
    
    // Also trigger internal notification
    this.triggerListeners('notification', { title, message });
  }

  // Send events to server
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`⚠️ Socket not connected, cannot emit ${event}`);
    }
  }

  // Broadcast message to all workers
  broadcastToWorkers(message) {
    this.emit('broadcast-to-workers', {
      officeCode: this.officeCode,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  // Send notification to specific worker
  notifyWorker(workerId, message) {
    this.emit('notify-worker', {
      workerId: workerId,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  // Request worker status
  requestWorkersStatus() {
    this.emit('request-workers-status', {
      officeCode: this.officeCode
    });
  }

  // Add event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Trigger all listeners for an event
  triggerListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Dashboard socket disconnected');
    }
  }

  // Check connection status
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Get connection status details
  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      officeCode: this.officeCode
    };
  }
}

// Create and export singleton instance
const dashboardSocketService = new DashboardSocketService();
export default dashboardSocketService;