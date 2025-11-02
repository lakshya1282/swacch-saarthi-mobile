/**
 * Utility functions for the application
 */

import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VALIDATION, ERROR_MESSAGES, COLORS, STORAGE_KEYS } from '../constants';
import type { PickupStatus, Location } from '../types';

/**
 * Validation utilities
 */
export const validators = {
  /**
   * Validates email format
   */
  isValidEmail: (email: string): boolean => {
    return VALIDATION.EMAIL_REGEX.test(email.trim());
  },

  /**
   * Validates phone number (Indian format)
   */
  isValidPhone: (phone: string): boolean => {
    return VALIDATION.PHONE_REGEX.test(phone.trim());
  },

  /**
   * Validates password strength
   */
  isValidPassword: (password: string): boolean => {
    return password.length >= VALIDATION.PASSWORD_MIN_LENGTH;
  },

  /**
   * Validates name
   */
  isValidName: (name: string): boolean => {
    const trimmedName = name.trim();
    return (
      trimmedName.length >= VALIDATION.NAME_MIN_LENGTH &&
      trimmedName.length <= VALIDATION.NAME_MAX_LENGTH
    );
  },

  /**
   * Validates address
   */
  isValidAddress: (address: string): boolean => {
    const trimmedAddress = address.trim();
    return (
      trimmedAddress.length >= VALIDATION.ADDRESS_MIN_LENGTH &&
      trimmedAddress.length <= VALIDATION.ADDRESS_MAX_LENGTH
    );
  },
};

/**
 * Format utilities
 */
export const formatters = {
  /**
   * Formats date to readable string
   */
  formatDate: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  },

  /**
   * Formats time to readable string
   */
  formatTime: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  },

  /**
   * Formats date and time
   */
  formatDateTime: (date: string | Date): string => {
    return `${formatters.formatDate(date)} at ${formatters.formatTime(date)}`;
  },

  /**
   * Formats phone number
   */
  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+91 ${match[1]} ${match[2]} ${match[3]}`;
    }
    return phone;
  },

  /**
   * Formats weight
   */
  formatWeight: (weight: string | number): string => {
    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
    if (numWeight >= 1000) {
      return `${(numWeight / 1000).toFixed(1)} tons`;
    }
    return `${numWeight} kg`;
  },

  /**
   * Truncates text with ellipsis
   */
  truncateText: (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  },

  /**
   * Capitalizes first letter of each word
   */
  capitalizeWords: (text: string): string => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },
};

/**
 * Storage utilities
 */
export const storage = {
  /**
   * Stores data in AsyncStorage
   */
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      let stringValue: string;
      
      // Special handling for auth token - store as plain string
      if (key === STORAGE_KEYS.AUTH_TOKEN && typeof value === 'string') {
        stringValue = value;
      } else {
        // Store other values as JSON
        stringValue = JSON.stringify(value);
      }
      
      await AsyncStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  },

  /**
   * Retrieves data from AsyncStorage
   */
  getItem: async <T = any>(key: string): Promise<T | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      
      // Special handling for auth token (might be stored as plain string)
      if (key === STORAGE_KEYS.AUTH_TOKEN) {
        // Check if it's already a plain string (not JSON)
        if (!value.startsWith('{') && !value.startsWith('[') && !value.startsWith('"')) {
          return value as any;
        }
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(value);
      } catch {
        // If parsing fails, return as plain string
        return value as any;
      }
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  },

  /**
   * Removes item from AsyncStorage
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  },

  /**
   * Clears all app data from AsyncStorage
   */
  clearAll: async (): Promise<void> => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },
};

/**
 * Alert utilities
 */
export const alerts = {
  /**
   * Shows success alert
   */
  success: (title: string, message?: string, onOk?: () => void) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  },

  /**
   * Shows error alert
   */
  error: (title: string = 'Error', message: string = ERROR_MESSAGES.GENERIC_ERROR) => {
    Alert.alert(title, message, [{ text: 'OK', style: 'cancel' }]);
  },

  /**
   * Shows confirmation alert
   */
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      { text: confirmText, onPress: onConfirm },
    ]);
  },
};

/**
 * Gets status color based on pickup status
 */
export const getStatusColor = (status: PickupStatus | string): string => {
  const statusColors: Record<string, string> = {
    pending: COLORS.STATUS.PENDING,
    scheduled: COLORS.STATUS.PENDING,
    assigned: COLORS.STATUS.ASSIGNED,
    in_progress: COLORS.STATUS.IN_PROGRESS,
    reached: COLORS.STATUS.REACHED,
    collected: COLORS.STATUS.COLLECTED,
    completed: COLORS.STATUS.COMPLETED,
    cancelled: COLORS.STATUS.CANCELLED,
  };
  return statusColors[status.toLowerCase()] || COLORS.TEXT.SECONDARY;
};

/**
 * Calculates distance between two coordinates (in km)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10; // Round to 1 decimal place
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Generates a unique ID
 */
export const generateId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${randomStr}`.toUpperCase() : `${timestamp}${randomStr}`.toUpperCase();
};

/**
 * Debounce function to limit function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Checks if the app is running on a physical device
 */
export const isPhysicalDevice = (): boolean => {
  return !__DEV__ || Platform.OS === 'android' || Platform.OS === 'ios';
};

/**
 * Gets appropriate API base URL based on environment
 */
export const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    return 'https://api.swacch-saarthii.com/api'; // Production URL
  }
  
  // Always use the actual IP address in development
  // This works for both physical devices and emulators on the same network
  return 'http://192.168.29.154:3000/api';
};

/**
 * Safely parses JSON
 */
export const safeJsonParse = <T = any>(json: string, fallback: T | null = null): T | null => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

/**
 * Groups array items by a key
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Delays execution for specified milliseconds
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Creates a map URL for navigation
 */
export const createMapUrl = (address: string, platform: 'google' | 'apple' | 'waze' = 'google'): string => {
  const encodedAddress = encodeURIComponent(address);
  
  const urls = {
    google: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    apple: `http://maps.apple.com/?q=${encodedAddress}`,
    waze: `https://waze.com/ul?q=${encodedAddress}`,
  };
  
  return urls[platform];
};