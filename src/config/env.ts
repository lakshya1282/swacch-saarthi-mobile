/**
 * Environment Configuration Helper
 * Loads environment variables and provides API/Socket URLs
 */

import { Platform } from 'react-native';

// Load environment variables from .env if available
// Note: For React Native, you may need react-native-config or react-native-dotenv
// For now, we'll use a fallback approach with manual configuration

// Default values (update these if your IP changes)
const DEFAULT_API_HOST = '192.168.137.176';
const DEFAULT_API_PORT = '3001';

/**
 * Get the current API host from environment or default
 */
export const getApiHost = (): string => {
  // Try to get from environment variable (if using react-native-config)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env?.API_HOST) {
    // @ts-ignore
    return process.env.API_HOST;
  }
  return DEFAULT_API_HOST;
};

/**
 * Get the current API port from environment or default
 */
export const getApiPort = (): string => {
  // Try to get from environment variable
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env?.API_PORT) {
    // @ts-ignore
    return process.env.API_PORT;
  }
  return DEFAULT_API_PORT;
};

/**
 * Get the base API URL based on platform and environment
 */
export const getApiBaseUrl = (): string => {
  const host = getApiHost();
  const port = getApiPort();

  // For Android Emulator, localhost needs to be 10.0.2.2
  if (Platform.OS === 'android' && __DEV__) {
    // Check if running on emulator vs physical device
    // Physical device will use the network IP
    return `http://${host}:${port}/api`;
  }

  // For iOS Simulator and physical devices
  return `http://${host}:${port}/api`;
};

/**
 * Get Socket.IO URL based on platform and environment
 */
export const getSocketUrl = (): string => {
  const host = getApiHost();
  const port = getApiPort();

  // For Android Emulator
  if (Platform.OS === 'android' && __DEV__) {
    return `http://${host}:${port}`;
  }

  // For iOS and physical devices
  return `http://${host}:${port}`;
};

/**
 * Get multiple Socket.IO URLs for fallback connections
 */
export const getSocketUrls = (): string[] => {
  const host = getApiHost();
  const port = getApiPort();

  return [
    `http://${host}:${port}`,           // Primary: Network IP
    `http://localhost:${port}`,         // Fallback: Localhost (for simulators)
    `http://10.0.2.2:${port}`,          // Fallback: Android emulator
  ];
};

/**
 * Environment configuration export
 */
export const ENV_CONFIG = {
  API_HOST: getApiHost(),
  API_PORT: getApiPort(),
  API_BASE_URL: getApiBaseUrl(),
  SOCKET_URL: getSocketUrl(),
  SOCKET_URLS: getSocketUrls(),
  IS_DEV: __DEV__,
  PLATFORM: Platform.OS,
} as const;

export default ENV_CONFIG;
