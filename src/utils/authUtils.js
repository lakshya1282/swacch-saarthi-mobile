/**
 * Authentication utilities for the Waste Management App
 */

export const authUtils = {
  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    // Check if token exists and is not expired
    if (token && userId) {
      // Check if it's a demo token (doesn't need JWT validation)
      if (token.startsWith('demo-token-')) {
        return true;
      }
      
      try {
        // Decode JWT token (basic check - in production, verify signature)
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        // Check if token is expired
        if (tokenData.exp && tokenData.exp < currentTime) {
          this.logout();
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Invalid token:', error);
        this.logout();
        return false;
      }
    }
    
    return false;
  },

  /**
   * Get current user info
   */
  getCurrentUser() {
    if (!this.isLoggedIn()) {
      return null;
    }
    
    return {
      userId: localStorage.getItem('userId'),
      userType: localStorage.getItem('userType'),
      firstName: localStorage.getItem('firstName'),
      lastName: localStorage.getItem('lastName'),
      email: localStorage.getItem('email')
    };
  },

  /**
   * Save user authentication data
   */
  login(token, userData) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userData.id || userData.userId);
    localStorage.setItem('userType', userData.userType);
    localStorage.setItem('firstName', userData.firstName);
    localStorage.setItem('lastName', userData.lastName);
    localStorage.setItem('email', userData.email);
    
    // Save additional user info if available
    if (userData.phone) {
      localStorage.setItem('userPhone', userData.phone);
    }
    if (userData.address) {
      localStorage.setItem('userAddress', userData.address);
    }
    if (userData.pincode) {
      localStorage.setItem('userPincode', userData.pincode);
    }
  },

  /**
   * Clear authentication data (preserves pickup history)
   */
  logout() {
    // Clear only authentication-related data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('email');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userPincode');
    
    // NOTE: We deliberately do NOT clear 'pickupHistory' here
    // Pickup history should persist across login sessions and be managed by the database
    // localStorage.removeItem('pickupHistory'); // REMOVED - preserves history
  },

  /**
   * Get authentication token
   */
  getToken() {
    return localStorage.getItem('authToken');
  },

  /**
   * Check if user is a citizen
   */
  isCitizen() {
    return this.isLoggedIn() && localStorage.getItem('userType') === 'citizen';
  },

  /**
   * Check if user is a worker
   */
  isWorker() {
    return this.isLoggedIn() && localStorage.getItem('userType') === 'worker';
  }
};

export default authUtils;
