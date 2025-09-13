import axios from 'axios';

const SERVER_URL = 'http://192.168.29.93:3000';

export interface ServerHealth {
  isServerRunning: boolean;
  isDatabaseConnected: boolean;
  message: string;
}

export const checkServerHealth = async (): Promise<ServerHealth> => {
  try {
    // First check if server is reachable
    const response = await axios.get(`${SERVER_URL}/api/health`, {
      timeout: 5000
    });
    
    return {
      isServerRunning: true,
      isDatabaseConnected: response.data?.database === 'connected',
      message: 'Server is healthy'
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        return {
          isServerRunning: false,
          isDatabaseConnected: false,
          message: 'Cannot connect to server. Please ensure the backend is running.'
        };
      } else if (error.response?.status === 503) {
        // Server is running but database is down
        return {
          isServerRunning: true,
          isDatabaseConnected: false,
          message: 'Server is running but database is not connected. Please ensure MongoDB is running.'
        };
      }
    }
    
    return {
      isServerRunning: false,
      isDatabaseConnected: false,
      message: 'Unknown error occurred while checking server health'
    };
  }
};

export const getServerStatusMessage = (health: ServerHealth): string => {
  if (!health.isServerRunning) {
    return '🔴 Server is not running. Please start the backend server.';
  } else if (!health.isDatabaseConnected) {
    return '🟡 Server is running but MongoDB is not connected. Please start MongoDB.';
  } else {
    return '🟢 Server and database are healthy.';
  }
};
