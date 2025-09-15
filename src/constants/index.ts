/**
 * Application-wide constants
 */

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  BASE_URLS: {
    ANDROID_EMULATOR: 'http://10.0.2.2:3000/api',
    IOS_SIMULATOR: 'http://localhost:3000/api',
    PHYSICAL_DEVICE: 'http://192.168.29.93:3000/api',
    PRODUCTION: 'https://api.swacch-saarthii.com/api', // Update with actual production URL
  },
} as const;

// Navigation Routes
export const ROUTES = {
  // Auth Routes
  LANDING: 'Landing',
  LOGIN: 'Login',
  REGISTER: 'Register',
  
  // Citizen Routes
  CITIZEN_MAIN: 'CitizenMain',
  HOME: 'Home',
  TRAINING: 'Training',
  SCHEDULE: 'Schedule',
  PROFILE: 'Profile',
  WASTE_VALIDATION: 'WasteValidation',
  QR_CODE: 'QRCode',
  
  // Worker Routes
  WORKER_MAIN: 'WorkerMain',
  DASHBOARD: 'Dashboard',
  TASKS: 'Tasks',
  SCANNER: 'Scanner',
} as const;

// Colors
export const COLORS = {
  PRIMARY: '#4CAF50',
  SECONDARY: '#FF9800',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  INFO: '#2196F3',
  
  // Status Colors
  STATUS: {
    PENDING: '#FF9800',
    ASSIGNED: '#2196F3',
    IN_PROGRESS: '#9C27B0',
    REACHED: '#03A9F4',
    COLLECTED: '#4CAF50',
    COMPLETED: '#4CAF50',
    CANCELLED: '#F44336',
  },
  
  // Gradient Colors
  GRADIENT: {
    PRIMARY: ['#4CAF50', '#45a049'],
    SECONDARY: ['#FF9800', '#F57C00'],
    LANDING: ['#1e88e5', '#1565c0', '#0d47a1'],
  },
  
  // Text Colors
  TEXT: {
    PRIMARY: '#333',
    SECONDARY: '#666',
    LIGHT: '#999',
    WHITE: '#fff',
  },
  
  // Background Colors
  BACKGROUND: {
    PRIMARY: '#f5f5f5',
    SECONDARY: '#fff',
    OVERLAY: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_TYPE: 'userType',
  USER_DATA: 'userData',
  ACCEPTED_TASKS: 'acceptedTasks',
  TASK_ASSIGNMENTS: 'taskAssignments',
} as const;

// User Types
export const USER_TYPES = {
  CITIZEN: 'citizen',
  WORKER: 'worker',
  ADMIN: 'admin',
} as const;

// Task/Pickup Status
export const TASK_STATUS = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  REACHED: 'reached',
  COLLECTED: 'collected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Waste Types
export const WASTE_TYPES = {
  ORGANIC: 'Organic',
  RECYCLABLE: 'Recyclable',
  HAZARDOUS: 'Hazardous',
  ELECTRONIC: 'E-Waste',
  MIXED: 'Mixed',
} as const;

// Time Slots
export const TIME_SLOTS = [
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
] as const;

// Motivational Quotes
export const MOTIVATIONAL_QUOTES = [
  'Together, we can make our cities cleaner and greener',
  'Every small step towards cleanliness counts',
  'Be the change you wish to see in your community',
  'Clean surroundings, healthy living',
  'Your waste today is tomorrow\'s resource',
  'A clean city is a healthy city',
  'Reduce, Reuse, Recycle - The three Rs of sustainability',
  'Small actions, when multiplied by millions, can transform the world',
] as const;

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[6-9]\d{9}$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  ADDRESS_MIN_LENGTH: 10,
  ADDRESS_MAX_LENGTH: 200,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful! Please login.',
  PICKUP_SCHEDULED: 'Pickup scheduled successfully!',
  TASK_ACCEPTED: 'Task accepted successfully!',
  TASK_COMPLETED: 'Task completed successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  QR_SCANNED: 'QR code scanned successfully!',
} as const;