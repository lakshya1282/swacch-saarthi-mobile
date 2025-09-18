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
    PHYSICAL_DEVICE: 'http://10.145.5.1:3000/api',
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

// Modern Color System
export const COLORS = {
  // Brand Colors
  PRIMARY: '#2ECC71',      // Modern green
  SECONDARY: '#F39C12',    // Warm orange
  ACCENT: '#3498DB',       // Bright blue
  
  // Semantic Colors
  SUCCESS: '#27AE60',      // Success green
  WARNING: '#F1C40F',     // Warning yellow
  ERROR: '#E74C3C',       // Error red
  INFO: '#3498DB',        // Info blue
  
  // Status Colors
  STATUS: {
    PENDING: '#F39C12',     // Orange
    ASSIGNED: '#3498DB',    // Blue
    IN_PROGRESS: '#9B59B6', // Purple
    REACHED: '#17A2B8',     // Teal
    COLLECTED: '#28A745',   // Green
    COMPLETED: '#27AE60',   // Success green
    CANCELLED: '#E74C3C',   // Red
  },
  
  // Gradient Colors
  GRADIENT: {
    PRIMARY: ['#2ECC71', '#27AE60'],
    SECONDARY: ['#F39C12', '#E67E22'],
    ACCENT: ['#3498DB', '#2980B9'],
    SUNSET: ['#FF6B6B', '#FF8E53'],
    OCEAN: ['#4FACFE', '#00F2FE'],
    FOREST: ['#56AB2F', '#A8E6CF'],
    NIGHT: ['#2C3E50', '#34495E'],
  },
  
  // Neutral Colors
  NEUTRAL: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Text Colors
  TEXT: {
    PRIMARY: '#212121',     // Dark text
    SECONDARY: '#757575',   // Medium text
    TERTIARY: '#BDBDBD',    // Light text
    DISABLED: '#E0E0E0',    // Disabled text
    WHITE: '#FFFFFF',       // White text
    INVERSE: '#FAFAFA',     // Inverse text
  },
  
  // Background Colors
  BACKGROUND: {
    PRIMARY: '#FAFAFA',     // Primary background
    SECONDARY: '#FFFFFF',   // Secondary background
    TERTIARY: '#F5F5F5',    // Tertiary background
    OVERLAY: 'rgba(33, 33, 33, 0.6)',
    MODAL: 'rgba(0, 0, 0, 0.5)',
    CARD: '#FFFFFF',
    SURFACE: '#F8F9FA',
  },
  
  // Border Colors
  BORDER: {
    LIGHT: '#E0E0E0',
    MEDIUM: '#BDBDBD',
    DARK: '#757575',
    FOCUS: '#3498DB',
    ERROR: '#E74C3C',
    SUCCESS: '#27AE60',
  },
  
  // Shadow Colors
  SHADOW: {
    LIGHT: 'rgba(0, 0, 0, 0.05)',
    MEDIUM: 'rgba(0, 0, 0, 0.1)',
    DARK: 'rgba(0, 0, 0, 0.15)',
    COLORED: 'rgba(46, 204, 113, 0.2)',
  },
} as const;

// Design Tokens
export const DESIGN_TOKENS = {
  // Spacing
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  
  // Border Radius
  BORDER_RADIUS: {
    XS: 4,
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 24,
    PILL: 999,
  },
  
  // Typography
  TYPOGRAPHY: {
    // Font Sizes
    FONT_SIZE: {
      XS: 12,
      SM: 14,
      MD: 16,
      LG: 18,
      XL: 20,
      XXL: 24,
      XXXL: 32,
    },
    
    // Line Heights
    LINE_HEIGHT: {
      TIGHT: 1.2,
      NORMAL: 1.5,
      RELAXED: 1.8,
    },
    
    // Font Weights
    FONT_WEIGHT: {
      LIGHT: '300',
      NORMAL: '400',
      MEDIUM: '500',
      SEMIBOLD: '600',
      BOLD: '700',
      EXTRABOLD: '800',
    },
  },
  
  // Shadows
  SHADOWS: {
    SMALL: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    MEDIUM: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    LARGE: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    COLORED: {
      shadowColor: COLORS.PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  
  // Animation
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 250,
      SLOW: 350,
    },
    EASING: {
      EASE_IN: 'ease-in',
      EASE_OUT: 'ease-out',
      EASE_IN_OUT: 'ease-in-out',
    },
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