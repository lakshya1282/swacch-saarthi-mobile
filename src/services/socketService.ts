import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string = 'http://192.168.29.93:3000';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.connect();
  }

  connect = async () => {
    try {
      if (this.socket?.connected) {
        console.log('Socket already connected');
        return;
      }

      console.log('Connecting to Socket.IO server...');
      
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    }
  };

  private setupEventHandlers = () => {
    if (!this.socket) return;

    this.socket.on('connect', async () => {
      console.log('✅ Socket connected:', this.socket?.id);
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
      this.handleReconnect();
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
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
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
