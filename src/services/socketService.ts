import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  private socket: Socket | null = null;
  private serverUrls: string[] = [
    'http://192.168.29.93:3000',    // Primary: Current network IP
    'http://localhost:3000',        // Fallback for emulator
    'http://10.0.2.2:3000',         // Android emulator specific
  ];
  private currentUrlIndex: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private listeners: Map<string, Set<Function>> = new Map();
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
  }

  connect = async () => {
    try {
      if (this.socket?.connected) {
        console.log('Socket already connected');
        return;
      }

      const serverUrl = this.serverUrls[this.currentUrlIndex];
      console.log(`Attempting Socket.IO connection to: ${serverUrl}`);
      
      // Clear any existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'], // Add polling as fallback
        reconnection: false, // We handle reconnection manually
        timeout: 5000, // Connection timeout
        forceNew: true, // Force new connection
      });

      // Set a timeout for connection attempt
      this.connectionTimeout = setTimeout(() => {
        if (!this.socket?.connected) {
          console.log(`Connection timeout for ${serverUrl}`);
          this.socket?.disconnect();
          this.tryNextUrl();
        }
      }, 5000);

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Socket connection error:', error);
      this.tryNextUrl();
    }
  };

  private setupEventHandlers = () => {
    if (!this.socket) return;

    this.socket.on('connect', async () => {
      console.log('✅ Socket connected:', this.socket?.id);
      console.log('Connected to:', this.serverUrls[this.currentUrlIndex]);
      
      // Clear connection timeout on successful connection
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Reset connection attempts
      this.reconnectAttempts = 0;
      
      // Join appropriate room based on user type
      const userType = await AsyncStorage.getItem('userType');
      const userData = await AsyncStorage.getItem('userData');
      
      if (userType === 'worker' && userData) {
        const user = JSON.parse(userData);
        this.joinWorkerRoom(user.id);
      } else if (userType === 'citizen' && userData) {
        const user = JSON.parse(userData);
        this.joinCitizenRoom(user.id);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      console.error('Failed URL:', this.serverUrls[this.currentUrlIndex]);
      // Don't call handleReconnect here as tryNextUrl will handle it
    });

    // Listen for pickup updates
    this.socket.on('pickup-update', (data) => {
      console.log('📡 Received pickup update:', data.type);
      this.notifyListeners('pickup-update', data);
    });

    this.socket.on('new-pickup', (data) => {
      console.log('🆕 New pickup available:', data);
      this.notifyListeners('new-pickup', data);
    });

    this.socket.on('pickup-assigned', (data) => {
      console.log('✅ Pickup assigned:', data);
      this.notifyListeners('pickup-assigned', data);
    });

    this.socket.on('pickup-status-changed', (data) => {
      console.log('🔄 Pickup status changed:', data);
      this.notifyListeners('pickup-status-changed', data);
    });

    this.socket.on('task-update', (data) => {
      console.log('📋 Task update:', data);
      this.notifyListeners('task-update', data);
    });
  };

  private handleReconnect = () => {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached for all URLs');
      // Reset to try from the beginning after a longer delay
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.currentUrlIndex = 0;
        this.connect();
      }, 60000); // Try again after 1 minute
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  };

  private tryNextUrl = () => {
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Disconnect current socket if exists
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Move to next URL
    this.currentUrlIndex = (this.currentUrlIndex + 1) % this.serverUrls.length;
    
    // If we've tried all URLs, increment reconnect attempts
    if (this.currentUrlIndex === 0) {
      this.handleReconnect();
    } else {
      // Try next URL immediately
      this.connect();
    }
  };

  joinWorkerRoom = (workerId: string) => {
    if (!this.socket?.connected) {
      console.log('Socket not connected, cannot join worker room');
      return;
    }
    
    this.socket.emit('join-worker-room', workerId);
    console.log(`Joined worker room for worker: ${workerId}`);
  };

  joinCitizenRoom = (citizenId: string) => {
    if (!this.socket?.connected) {
      console.log('Socket not connected, cannot join citizen room');
      return;
    }
    
    this.socket.emit('join-citizen-room', citizenId);
    console.log(`Joined citizen room for citizen: ${citizenId}`);
  };

  // Subscribe to events
  on = (event: string, callback: Function) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    
    // Also register with socket if connected
    if (this.socket?.connected) {
      this.socket.on(event, callback as any);
    }
  };

  // Unsubscribe from events
  off = (event: string, callback: Function) => {
    this.listeners.get(event)?.delete(callback);
    
    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  };

  // Notify all listeners for an event
  private notifyListeners = (event: string, data: any) => {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  };

  // Emit custom events
  emit = (event: string, data: any) => {
    if (!this.socket?.connected) {
      console.log('Socket not connected, cannot emit event');
      return;
    }
    
    this.socket.emit(event, data);
  };

  // Check connection status
  isConnected = (): boolean => {
    return this.socket?.connected || false;
  };

  // Disconnect socket
  disconnect = () => {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('Socket disconnected');
    }
  };

  // Reconnect socket
  reconnect = () => {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  };
}

export default new SocketService();
