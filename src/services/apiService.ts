import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../config/env';

class ApiService {
  private baseURL: string;
  private api: AxiosInstance;

  constructor() {
    // Dynamic base URL based on platform and environment
    this.baseURL = this.getBaseURL();
    console.log('API Base URL:', this.baseURL);
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private getBaseURL(): string {
    // Use centralized environment configuration
    return getApiBaseUrl();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, logout user
          await AsyncStorage.multiRemove(['authToken', 'userType', 'userData']);
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.api.post('/auth/login', { email, password });
  }

  async register(userData: any) {
    return this.api.post('/auth/register', userData);
  }

  async logout() {
    return this.api.post('/auth/logout');
  }

  // User endpoints
  async getUserProfile() {
    return this.api.get('/users/profile');
  }

  async updateUserProfile(profileData: any) {
    return this.api.put('/users/profile', profileData);
  }

  // Pickup endpoints - Updated to match backend routes
  async getPickups() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        return this.api.get(`/pickups/user/${user.id}`);
      } else {
        // Fallback to general pickup endpoint if no user ID
        return this.api.get('/pickups/schedules');
      }
    } catch (error) {
      console.error('Error getting user data for pickups:', error);
      // Fallback to schedules endpoint
      return this.api.get('/pickups/schedules');
    }
  }

  async schedulePickup(pickupData: any) {
    return this.api.post('/pickups/schedule', pickupData);
  }

  async updatePickupStatus(pickupId: string, status: string) {
    return this.api.put(`/pickups/${pickupId}/status`, { status });
  }

  async cancelPickup(pickupId: string) {
    return this.api.delete(`/pickups/${pickupId}`);
  }

  // QR Code endpoints
  async generateQRCode(data: any) {
    return this.api.post('/qr/generate', data);
  }

  async validateQRCode(qrData: string) {
    return this.api.post('/qr/validate', { qrData });
  }

  // Waste validation endpoints
  async validateWaste(wasteData: any) {
    return this.api.post('/waste/validate', wasteData);
  }

  async getWasteTypes() {
    return this.api.get('/waste/types');
  }

  // Worker specific endpoints
  async getWorkerProfile() {
    try {
      // Try to get worker profile from dedicated endpoint
      return await this.api.get('/worker/profile');
    } catch (error) {
      // Fallback to user profile endpoint
      return this.api.get('/users/profile');
    }
  }

  // Office enrollment endpoints
  async checkOfficeCode(officeCode: string) {
    // Use the correct endpoint to verify office code
    const response = await this.api.post('/worker/verify-office-code', { officeCode });
    // Transform response to match expected format
    return {
      data: {
        exists: response.data.success,
        office: response.data.office,
        message: response.data.message
      }
    };
  }

  async getOfficeByCode(officeCode: string) {
    // Use verify endpoint to get office details
    const response = await this.api.post('/worker/verify-office-code', { officeCode });
    return {
      data: response.data.office
    };
  }

  async enrollToOffice(officeCode: string) {
    // Get the worker ID from AsyncStorage
    const userData = await AsyncStorage.getItem('userData');
    const userId = await AsyncStorage.getItem('userId');
    
    let workerId = null;
    if (userData) {
      const user = JSON.parse(userData);
      workerId = user.id || user._id;
    } else if (userId) {
      workerId = userId;
    }
    
    if (!workerId) {
      throw new Error('Worker ID not found. Please login again.');
    }
    
    // Use the correct enrollment endpoint with worker ID
    return this.api.post('/worker/enroll-in-office', { 
      workerId,
      officeCode 
    });
  }

  async getEnrollmentStatus() {
    try {
      return await this.api.get('/worker/enrollment-status');
    } catch (error) {
      // Get enrollment status from profile
      const profile = await this.getWorkerProfile();
      if (profile.data) {
        const data = profile.data.data || profile.data;
        return {
          data: {
            enrollmentStatus: data.enrollmentStatus || 'not_enrolled',
            officeId: data.officeId,
            officeCode: data.officeCode,
            officeName: data.officeName,
            enrolledAt: data.enrolledAt
          }
        };
      }
      throw error;
    }
  }

  async cancelEnrollment() {
    try {
      return await this.api.post('/worker/cancel-enrollment');
    } catch (error) {
      return this.api.delete('/offices/enrollment');
    }
  }

  async updateWorkerProfile(profileData: any) {
    try {
      // Try to update worker profile through dedicated endpoint
      return await this.api.put('/worker/profile', profileData);
    } catch (error) {
      // Fallback to user profile endpoint
      return this.api.put('/users/profile', profileData);
    }
  }

  async getWorkerStats() {
    try {
      // Get worker statistics (earnings, tasks, ratings, etc.)
      const response = await this.api.get('/worker/stats');
      return response;
    } catch (error) {
      // Try to calculate stats from pickups data
      console.log('Worker stats endpoint not available, calculating from pickups');
      
      try {
        const userData = await AsyncStorage.getItem('userData');
        const workerId = userData ? JSON.parse(userData).id : null;
        
        // Get all pickups to calculate stats
        const pickupsResponse = await this.api.get('/pickups');
        const allPickups = pickupsResponse.data?.data || pickupsResponse.data || [];
        
        // Filter worker's completed tasks
        const workerTasks = allPickups.filter((pickup: any) => 
          pickup.workerId === workerId || pickup.assignedWorkerId === workerId
        );
        
        const completedTasks = workerTasks.filter((task: any) => 
          task.status === 'completed'
        );
        
        const today = new Date().toDateString();
        const tasksToday = workerTasks.filter((task: any) => 
          new Date(task.createdAt).toDateString() === today
        );
        
        const pendingTasks = workerTasks.filter((task: any) => 
          task.status === 'assigned' || task.status === 'in_progress'
        );
        
        // Calculate basic stats from available data
        return {
          data: {
            workerId,
            todayEarnings: tasksToday.length * 150, // Estimated earnings per task
            monthlyEarnings: completedTasks.length * 150,
            totalEarnings: completedTasks.length * 150,
            rating: 4.0, // Default rating if not available
            totalReviews: 0,
            tasksCompleted: completedTasks.length,
            tasksToday: tasksToday.length,
            tasksPending: pendingTasks.length,
          }
        };
      } catch (calcError) {
        console.error('Error calculating stats:', calcError);
        // Return minimal stats structure
        return {
          data: {
            todayEarnings: 0,
            monthlyEarnings: 0,
            totalEarnings: 0,
            rating: 0,
            totalReviews: 0,
            tasksCompleted: 0,
            tasksToday: 0,
            tasksPending: 0,
          }
        };
      }
    }
  }

  async getWorkerTasks() {
    // First try worker-specific endpoint, then fall back to pickups
    try {
      return await this.api.get('/worker/tasks');
    } catch (error) {
      // Fallback to pickups endpoint for tasks
      return this.api.get('/pickups');
    }
  }

  async getAvailableTasksOnly() {
    try {
      const response = await this.api.get('/pickups');
      const allPickups = response.data?.data || response.data || [];
      // Filter only truly available tasks: pending status AND no assigned worker
      const availableTasks = allPickups.filter((pickup: any) => 
        (pickup.status === 'pending' || pickup.status === 'scheduled') && 
        !pickup.assignedWorkerId
      );
      console.log(`Found ${availableTasks.length} available tasks out of ${allPickups.length} total pickups`);
      return { ...response, data: availableTasks };
    } catch (error) {
      console.error('Error fetching available tasks:', error);
      throw error;
    }
  }

  async getMyTasksOnly() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const workerId = userData ? JSON.parse(userData).id : null;
      
      const response = await this.api.get('/pickups');
      const allPickups = response.data?.data || response.data || [];
      
      // Filter tasks assigned to or in progress by current worker
      const myTasks = allPickups.filter((pickup: any) => 
        (pickup.status === 'assigned' || pickup.status === 'in_progress') &&
        (!pickup.assignedWorkerId || pickup.assignedWorkerId === workerId)
      );
      return { ...response, data: myTasks };
    } catch (error) {
      console.error('Error fetching my tasks:', error);
      throw error;
    }
  }

  async getWorkerDashboard() {
    return this.api.get('/worker/dashboard');
  }

  async getAvailableTasks() {
    // Get all pickups with status 'pending' or 'scheduled'
    try {
      return await this.api.get('/worker/tasks/available');
    } catch (error) {
      // Fallback to pickups with pending status
      return this.api.get('/pickups?status=pending');
    }
  }

  // Attendance endpoints
  async markAttendance(attendanceData: any) {
    try {
      // Try to mark attendance through dedicated endpoint
      return await this.api.post('/worker/attendance/mark', attendanceData);
    } catch (error) {
      // Fallback to generic attendance endpoint
      return this.api.post('/attendance/mark', attendanceData);
    }
  }

  async getAttendanceHistory() {
    try {
      // Get worker's attendance history
      return await this.api.get('/worker/attendance/history');
    } catch (error) {
      // Fallback to generic attendance history
      return this.api.get('/attendance/history');
    }
  }

  async getTodayAttendance() {
    try {
      const today = new Date().toISOString().split('T')[0];
      return await this.api.get(`/worker/attendance/today?date=${today}`);
    } catch (error) {
      // Fallback to generic today attendance
      const today = new Date().toISOString().split('T')[0];
      return this.api.get(`/attendance/today?date=${today}`);
    }
  }

  async validateAttendanceQR(qrData: string) {
    try {
      // Validate attendance QR code
      return await this.api.post('/worker/attendance/validate-qr', { qrData });
    } catch (error) {
      // Try generic QR validation with attendance context
      return this.api.post('/qr/validate', { qrData, type: 'attendance' });
    }
  }

  async getMyTasks() {
    try {
      return await this.api.get('/worker/tasks/my-tasks');
    } catch (error) {
      // Fallback to pickups assigned to current worker
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        return this.api.get(`/pickups?workerId=${user.id}`);
      }
      return this.api.get('/pickups?status=assigned');
    }
  }

  // Get all pickups (for workers to see as tasks)
  async getAllPickups() {
    return this.api.get('/pickups');
  }
  
  // Check if a specific task is available for assignment
  async checkTaskAvailability(taskId: string) {
    try {
      const response = await this.api.get('/pickups');
      const allPickups = response.data?.data || response.data || [];
      const task = allPickups.find((pickup: any) => 
        pickup.pickupId === taskId || pickup._id === taskId || pickup.id === taskId
      );
      
      if (!task) {
        return { available: false, reason: 'TASK_NOT_FOUND' };
      }
      
      // Task is available only if it's pending and not assigned to anyone
      if (task.status === 'pending' && !task.assignedWorkerId) {
        return { available: true, task };
      }
      
      // Task is already assigned or in progress
      if (task.assignedWorkerId) {
        return { 
          available: false, 
          reason: 'TASK_ALREADY_ASSIGNED',
          assignedTo: task.assignedWorkerId,
          status: task.status
        };
      }
      
      return { 
        available: false, 
        reason: 'TASK_NOT_AVAILABLE',
        status: task.status 
      };
    } catch (error) {
      console.error('Error checking task availability:', error);
      return { available: false, reason: 'CHECK_FAILED', error: error.message };
    }
  }

  async acceptTask(taskId: string) {
    // First check if task is available
    const availability = await this.checkTaskAvailability(taskId);
    if (!availability.available) {
      throw new Error(`Task acceptance failed: ${availability.reason}`);
    }
    
    try {
      // Get current worker data
      const userData = await AsyncStorage.getItem('userData');
      const workerId = userData ? JSON.parse(userData).id : null;
      const workerName = userData ? JSON.parse(userData).name : null;
      
      console.log(`Worker ${workerId} attempting to accept task ${taskId}`);
      
      return await this.api.post(`/worker/tasks/${taskId}/accept`, {
        workerId,
        workerName,
        assignedAt: new Date().toISOString()
      });
    } catch (error) {
      // Fallback: Update pickup status to 'assigned' if worker endpoints don't exist
      console.log('Worker task endpoint not available, using pickup status update');
      
      // Get current worker data for fallback
      const userData = await AsyncStorage.getItem('userData');
      const workerId = userData ? JSON.parse(userData).id : null;
      const workerName = userData ? JSON.parse(userData).name : null;
      
      console.log(`Fallback: Updating pickup ${taskId} status directly for worker ${workerId}`);
      
      return this.api.put(`/pickups/${taskId}/status`, { 
        status: 'assigned',
        assignedWorkerId: workerId,
        assignedWorkerName: workerName,
        assignedAt: new Date().toISOString()
      });
    }
  }

  async startTask(taskId: string) {
    try {
      return await this.api.post(`/worker/tasks/${taskId}/start`);
    } catch (error) {
      // Fallback: Update pickup status to 'in_progress' if worker endpoints don't exist
      console.log('Worker task endpoint not available, using pickup status update');
      return this.api.put(`/pickups/${taskId}/status`, { status: 'in_progress' });
    }
  }

  async completeTask(taskId: string, completionData?: any) {
    try {
      return await this.api.post(`/worker/tasks/${taskId}/complete`, completionData || {});
    } catch (error) {
      // Fallback: Update pickup status to 'completed' if worker endpoints don't exist
      console.log('Worker task endpoint not available, using pickup status update');
      return this.api.put(`/pickups/${taskId}/status`, { status: 'completed', ...completionData });
    }
  }

  async updateTaskStatus(taskId: string, status: string) {
    return this.api.put(`/worker/tasks/${taskId}`, { status });
  }

  async scanQRCode(qrData: string) {
    return this.api.post('/worker/scan', { qrData });
  }

  async markHouseholdReached(data: { citizenId: string; householdId: string; timestamp: number }) {
    try {
      return await this.api.post('/worker/household/reached', data);
    } catch (error) {
      // Mock response for demo when endpoint doesn't exist
      console.log('Household reached endpoint not available, returning mock response');
      return {
        data: {
          success: true,
          message: 'Household marked as reached',
          citizenId: data.citizenId,
          householdId: data.householdId,
          status: 'reached',
          timestamp: data.timestamp
        }
      };
    }
  }

  async getTaskDetails(taskId: string) {
    return this.api.get(`/worker/tasks/${taskId}`);
  }

  async reportIssue(taskId: string, issueData: any) {
    return this.api.post(`/worker/tasks/${taskId}/report-issue`, issueData);
  }

  // Location endpoints
  async updateLocation(locationData: { latitude: number; longitude: number }) {
    return this.api.post('/users/location', locationData);
  }

  async getNearbyPickups(locationData: { latitude: number; longitude: number; radius?: number }) {
    return this.api.post('/pickups/nearby', locationData);
  }

  // File upload endpoint
  async uploadFile(formData: FormData) {
    return this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Generic request method
  async request(config: AxiosRequestConfig) {
    return this.api.request(config);
  }

  // Update base URL (useful for switching between dev/prod environments)
  updateBaseURL(newBaseURL: string) {
    this.baseURL = newBaseURL;
    this.api.defaults.baseURL = newBaseURL;
  }

  // Check server connectivity
  async checkHealth() {
    try {
      return await this.api.get('/health');
    } catch (error) {
      console.log('Server connectivity check failed:', error);
      throw error;
    }
  }

  // Attendance endpoints
  async markAttendance(attendanceData: {
    workerId: string;
    workerName: string;
    officeCode: string;
    attendanceCode: string;
    action?: 'check_in' | 'check_out';
    location?: { latitude: number; longitude: number };
    method?: 'qr_scan' | 'manual' | 'auto';
  }) {
    try {
      const response = await this.api.post('/attendance/mark', attendanceData);
      return response.data;
    } catch (error: any) {
      console.error('Mark attendance error:', error);
      
      // Demo mode fallback when backend is unavailable
      if (error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
        console.log('Backend unavailable, returning demo attendance response');
        return {
          success: true,
          message: 'Attendance marked successfully (Demo Mode)',
          data: {
            attendanceId: `demo-att-${Date.now()}`,
            checkInTime: new Date(),
            status: 'present',
            isLate: false
          }
        };
      }
      
      throw error;
    }
  }

  async getAttendanceStatus(workerId: string, date?: string) {
    try {
      const response = await this.api.get(`/attendance/worker/${workerId}`, {
        params: { date: date || new Date().toISOString().split('T')[0] }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get attendance status error:', error);
      
      // Demo mode fallback
      if (error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
        return {
          success: true,
          data: [],
          hasMarkedAttendance: false
        };
      }
      
      throw error;
    }
  }

  async getAttendanceHistory(workerId: string, startDate?: string, endDate?: string, limit?: number) {
    try {
      const response = await this.api.get(`/attendance/worker/${workerId}`, {
        params: { startDate, endDate, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get attendance history error:', error);
      
      // Demo mode fallback
      if (error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
        return {
          success: true,
          data: []
        };
      }
      
      throw error;
    }
  }

  async checkAttendanceForToday(workerId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await this.getAttendanceStatus(workerId, today);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        // Check if there's any attendance record for today
        return response.data.length > 0;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking today\'s attendance:', error);
      // In case of error, assume no attendance to be safe
      return false;
    }
  }

  // Complaint endpoints
  async submitComplaint(complaintData: any) {
    return this.api.post('/complaints/submit', complaintData);
  }

  async getComplaints() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        
        // Admin users should fetch all complaints
        if (user.userType === 'admin') {
          console.log('Fetching all complaints for admin');
          return this.api.get('/complaints/all');
        }
        
        // Citizens fetch their own complaints
        console.log(`Fetching complaints for citizen: ${user.id}`);
        return this.api.get(`/complaints/citizen/${user.id}`);
      }
      return this.api.get('/complaints/all');
    } catch (error) {
      console.error('Error getting user data for complaints:', error);
      return this.api.get('/complaints/all');
    }
  }

  async getComplaintById(complaintId: string) {
    return this.api.get(`/complaints/${complaintId}`);
  }

  async updateComplaintStatus(complaintId: string, statusData: any) {
    return this.api.put(`/complaints/${complaintId}/status`, statusData);
  }
}

export default new ApiService();
