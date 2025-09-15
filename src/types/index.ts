/**
 * TypeScript type definitions and interfaces
 */

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  userType: 'citizen' | 'worker' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

export interface CitizenUser extends User {
  userType: 'citizen';
  householdId?: string;
  location?: Location;
  pickupHistory?: Pickup[];
}

export interface WorkerUser extends User {
  userType: 'worker';
  assignedArea?: string;
  vehicleNumber?: string;
  currentLocation?: Location;
  tasksCompleted?: number;
}

// Location Type
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

// Pickup/Task Types
export interface Pickup {
  pickupId: string;
  userId: string;
  userName?: string;
  address: string;
  wasteTypes: string[];
  estimatedWeight: string;
  timeSlot: string;
  scheduledDate: string;
  status: PickupStatus;
  location?: Location;
  qrCodeData?: QRCodeData;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  actualWeight?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PickupStatus = 
  | 'pending'
  | 'scheduled'
  | 'assigned'
  | 'in_progress'
  | 'reached'
  | 'collected'
  | 'completed'
  | 'cancelled';

// QR Code Types
export interface QRCodeData {
  pickupId?: string;
  userId: string;
  customerName: string;
  wasteTypes?: string[];
  estimatedWeight?: string;
  timeSlot?: string;
  scheduledDate?: string;
  location: Location;
  verificationCode?: string;
  timestamp?: number;
}

export interface HouseholdQRData {
  citizenId: string;
  householdId: string;
  householdAddress: string;
  citizenName: string;
  location: Location;
  timestamp: number;
}

// Scan Result Type
export interface ScanResult {
  pickupId?: string;
  userId: string;
  userName: string;
  address: string;
  wasteType?: string;
  status: string;
  isValid: boolean;
  scanType: 'household' | 'pickup';
  citizenId?: string;
  householdId?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  userType: string;
  userData: User;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  userId?: string;
}

// Form Data Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  userType: 'citizen' | 'worker';
}

export interface SchedulePickupFormData {
  wasteTypes: string[];
  estimatedWeight: string;
  preferredDate: string;
  preferredTime: string;
  specialInstructions?: string;
  location?: Location;
}

// Navigation Types
export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  CitizenMain: undefined;
  WorkerMain: undefined;
  WasteValidation: undefined;
  QRCode: undefined;
  Home: undefined;
  Training: undefined;
  Schedule: undefined;
  Profile: undefined;
  Dashboard: undefined;
  Tasks: undefined;
  Scanner: undefined;
  Settings: { profile?: any };
  PickupHistory: undefined;
};

// Worker Task Assignment
export interface TaskAssignment {
  taskId: string;
  workerId: string;
  assignedAt: number;
  status: 'assigned' | 'in_progress' | 'completed';
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
  data?: any;
}

// Training Module Types
export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  imageUrl?: string;
  videoUrl?: string;
  completed?: boolean;
  progress?: number;
}

// Statistics Types
export interface UserStatistics {
  totalPickups?: number;
  completedPickups?: number;
  wasteCollected?: string;
  carbonSaved?: string;
  treesEquivalent?: number;
  ranking?: number;
}

export interface WorkerStatistics extends UserStatistics {
  tasksToday?: number;
  tasksCompleted?: number;
  averageRating?: number;
  totalDistance?: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Socket Event Types
export interface SocketEvent {
  event: string;
  data: any;
  timestamp: number;
}

// Feature Configuration
export interface FeatureConfig {
  icon: string;
  title: string;
  description: string;
  color: string;
}

// App State Types
export interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  userType: 'citizen' | 'worker' | null;
  userData: User | null;
  token: string | null;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  loading: boolean;
  notifications: Notification[];
  error: AppError | null;
}