/**
 * API Service - Centralized API communication layer
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { API_CONFIG, ERROR_MESSAGES, STORAGE_KEYS } from '../constants';
import { storage, getApiBaseUrl, delay } from '../utils';
import type {
  ApiResponse,
  LoginResponse,
  RegisterResponse,
  LoginFormData,
  RegisterFormData,
  SchedulePickupFormData,
  Pickup,
  User,
  TaskAssignment,
} from '../types';

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API Service Class
 */
class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private retryCount: Map<string, number> = new Map();

  constructor() {
    this.baseURL = getApiBaseUrl();
    this.api = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Creates and configures Axios instance
   */
  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.baseURL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Sets up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = await storage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request in development
        if (__DEV__) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        // Log response in development
        if (__DEV__) {
          console.log(`✅ API Response: ${response.config.url}`, response.status);
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        const requestKey = `${originalRequest?.method}-${originalRequest?.url}`;

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          await this.handleUnauthorized();
          throw new ApiError('UNAUTHORIZED', ERROR_MESSAGES.SESSION_EXPIRED);
        }

        // Handle network errors with retry
        if (!error.response && originalRequest && !originalRequest._retry) {
          const currentRetryCount = this.retryCount.get(requestKey) || 0;
          
          if (currentRetryCount < API_CONFIG.RETRY_ATTEMPTS) {
            originalRequest._retry = true;
            this.retryCount.set(requestKey, currentRetryCount + 1);
            
            // Exponential backoff
            await delay(Math.pow(2, currentRetryCount) * 1000);
            
            try {
              return await this.api.request(originalRequest);
            } finally {
              this.retryCount.delete(requestKey);
            }
          }
          
          throw new ApiError('NETWORK_ERROR', ERROR_MESSAGES.NETWORK_ERROR);
        }

        // Handle other errors
        const errorMessage = error.response?.data?.message || ERROR_MESSAGES.SERVER_ERROR;
        const errorCode = error.response?.status?.toString() || 'UNKNOWN';
        
        if (__DEV__) {
          console.error(`❌ API Error: ${error.config?.url}`, error.response?.status, errorMessage);
        }

        throw new ApiError(errorCode, errorMessage, error.response?.data);
      }
    );
  }

  /**
   * Handles unauthorized access
   */
  private async handleUnauthorized(): Promise<void> {
    // Clear auth data
    await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await storage.removeItem(STORAGE_KEYS.USER_TYPE);
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // TODO: Navigate to login screen or emit event
  }

  /**
   * Generic request method with error handling
   */
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.api.request<ApiResponse<T>>(config);
      
      // Handle API response structure
      if (response.data.success === false) {
        throw new ApiError('API_ERROR', response.data.message || ERROR_MESSAGES.GENERIC_ERROR);
      }
      
      return response.data.data || response.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('UNKNOWN', ERROR_MESSAGES.GENERIC_ERROR, error);
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * User login
   */
  async login(credentials: LoginFormData): Promise<LoginResponse> {
    return this.request<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    });
  }

  /**
   * User registration
   */
  async register(userData: RegisterFormData): Promise<RegisterResponse> {
    const { confirmPassword, ...registrationData } = userData;
    return this.request<RegisterResponse>({
      method: 'POST',
      url: '/auth/register',
      data: registrationData,
    });
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    try {
      await this.request({
        method: 'POST',
        url: '/auth/logout',
      });
    } finally {
      // Clear local storage regardless of API response
      await storage.clearAll();
    }
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<User> {
    return this.request<User>({
      method: 'GET',
      url: '/users/profile',
    });
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData: Partial<User>): Promise<User> {
    return this.request<User>({
      method: 'PUT',
      url: '/users/profile',
      data: profileData,
    });
  }

  /**
   * Check phone number availability
   */
  async checkPhoneAvailability(phone: string): Promise<{ available: boolean; message: string }> {
    return this.request({
      method: 'POST',
      url: '/users/check-phone',
      data: { phone },
    });
  }

  /**
   * Get user's pickup history
   */
  async getPickupHistory(): Promise<any> {
    return this.request({
      method: 'GET',
      url: '/users/pickup-history',
    });
  }

  /**
   * Submit review for a pickup
   */
  async submitPickupReview(pickupId: string, rating: number, feedback?: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: `/pickups/${pickupId}/review`,
      data: { rating, feedback },
    });
  }

  /**
   * Update user location
   */
  async updateLocation(location: { latitude: number; longitude: number }): Promise<void> {
    return this.request({
      method: 'POST',
      url: '/users/location',
      data: location,
    });
  }

  // ==================== PICKUP ENDPOINTS ====================

  /**
   * Get user's pickups
   */
  async getPickups(): Promise<Pickup[]> {
    const userData = await storage.getItem<User>(STORAGE_KEYS.USER_DATA);
    const userId = userData?.id;

    if (userId) {
      try {
        return await this.request<Pickup[]>({
          method: 'GET',
          url: `/pickups/user/${userId}`,
        });
      } catch (error) {
        // Fallback to general endpoint
      }
    }

    return this.request<Pickup[]>({
      method: 'GET',
      url: '/pickups/schedules',
    });
  }

  /**
   * Schedule a new pickup
   */
  async schedulePickup(pickupData: SchedulePickupFormData): Promise<Pickup> {
    return this.request<Pickup>({
      method: 'POST',
      url: '/pickups/schedule',
      data: pickupData,
    });
  }

  /**
   * Update pickup status
   */
  async updatePickupStatus(pickupId: string, status: string): Promise<Pickup> {
    return this.request<Pickup>({
      method: 'PUT',
      url: `/pickups/${pickupId}/status`,
      data: { status },
    });
  }

  /**
   * Cancel a pickup
   */
  async cancelPickup(pickupId: string): Promise<void> {
    return this.request({
      method: 'DELETE',
      url: `/pickups/${pickupId}`,
    });
  }

  /**
   * Get nearby pickups
   */
  async getNearbyPickups(location: { 
    latitude: number; 
    longitude: number; 
    radius?: number 
  }): Promise<Pickup[]> {
    return this.request<Pickup[]>({
      method: 'POST',
      url: '/pickups/nearby',
      data: location,
    });
  }

  // ==================== WORKER ENDPOINTS ====================

  /**
   * Get worker tasks
   */
  async getWorkerTasks(): Promise<Pickup[]> {
    try {
      return await this.request<Pickup[]>({
        method: 'GET',
        url: '/worker/tasks',
      });
    } catch (error) {
      // Fallback to pickups endpoint
      return this.getPickups();
    }
  }

  /**
   * Accept a task
   */
  async acceptTask(taskId: string): Promise<void> {
    try {
      await this.request({
        method: 'POST',
        url: `/worker/tasks/${taskId}/accept`,
      });
    } catch (error) {
      // Fallback to status update
      await this.updatePickupStatus(taskId, 'assigned');
    }
  }

  /**
   * Start a task
   */
  async startTask(taskId: string): Promise<void> {
    try {
      await this.request({
        method: 'POST',
        url: `/worker/tasks/${taskId}/start`,
      });
    } catch (error) {
      // Fallback to status update
      await this.updatePickupStatus(taskId, 'in_progress');
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, completionData?: any): Promise<void> {
    try {
      await this.request({
        method: 'POST',
        url: `/worker/tasks/${taskId}/complete`,
        data: completionData,
      });
    } catch (error) {
      // Fallback to status update
      await this.updatePickupStatus(taskId, 'completed');
    }
  }

  /**
   * Mark household as reached
   */
  async markHouseholdReached(data: {
    citizenId: string;
    householdId: string;
    timestamp: number;
  }): Promise<any> {
    try {
      return await this.request({
        method: 'POST',
        url: '/worker/household/reached',
        data,
      });
    } catch (error) {
      // Mock response for demo
      if (__DEV__) {
        console.log('Using mock response for markHouseholdReached');
        return {
          success: true,
          message: 'Household marked as reached',
          ...data,
          status: 'reached',
        };
      }
      throw error;
    }
  }

  /**
   * Scan QR code
   */
  async scanQRCode(qrData: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: '/worker/scan',
      data: { qrData },
    });
  }

  /**
   * Report an issue with a task
   */
  async reportIssue(taskId: string, issueData: any): Promise<void> {
    return this.request({
      method: 'POST',
      url: `/worker/tasks/${taskId}/report-issue`,
      data: issueData,
    });
  }

  // ==================== QR CODE ENDPOINTS ====================

  /**
   * Generate QR code
   */
  async generateQRCode(data: any): Promise<{ qrCode: string }> {
    return this.request({
      method: 'POST',
      url: '/qr/generate',
      data,
    });
  }

  /**
   * Validate QR code
   */
  async validateQRCode(qrData: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: '/qr/validate',
      data: { qrData },
    });
  }

  // ==================== WASTE VALIDATION ====================

  /**
   * Validate waste
   */
  async validateWaste(wasteData: any): Promise<any> {
    return this.request({
      method: 'POST',
      url: '/waste/validate',
      data: wasteData,
    });
  }

  /**
   * Get waste types
   */
  async getWasteTypes(): Promise<string[]> {
    return this.request<string[]>({
      method: 'GET',
      url: '/waste/types',
    });
  }

  // ==================== FILE UPLOAD ====================

  /**
   * Upload file
   */
  async uploadFile(formData: FormData): Promise<{ url: string }> {
    return this.request({
      method: 'POST',
      url: '/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Check API health
   */
  async checkHealth(): Promise<{ status: string }> {
    return this.request({
      method: 'GET',
      url: '/health',
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Update base URL (for environment switching)
   */
  updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    this.api.defaults.baseURL = newBaseURL;
  }

  /**
   * Get current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Clear retry counts
   */
  clearRetryCount(): void {
    this.retryCount.clear();
  }
}

// Export singleton instance
export const apiService = new ApiService();
export { ApiError };
export default apiService;