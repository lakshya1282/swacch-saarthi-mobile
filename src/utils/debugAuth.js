/**
 * Debug helper for authentication
 * Use this in browser console to check auth state
 */

const debugAuth = {
  // Check current auth state
  checkAuthState() {
    console.log('=== Current Auth State ===');
    console.log('authToken:', localStorage.getItem('authToken'));
    console.log('userId:', localStorage.getItem('userId'));
    console.log('userType:', localStorage.getItem('userType'));
    console.log('firstName:', localStorage.getItem('firstName'));
    console.log('lastName:', localStorage.getItem('lastName'));
    console.log('email:', localStorage.getItem('email'));
    console.log('========================');
  },

  // Simulate worker login (for testing)
  simulateWorkerLogin() {
    const testWorkerData = {
      token: 'test-jwt-token-' + Date.now(),
      user: {
        id: 'worker_' + Date.now(),
        userType: 'worker',
        firstName: 'Test',
        lastName: 'Worker',
        email: 'worker@test.com'
      }
    };

    localStorage.setItem('authToken', testWorkerData.token);
    localStorage.setItem('userId', testWorkerData.user.id);
    localStorage.setItem('userType', testWorkerData.user.userType);
    localStorage.setItem('firstName', testWorkerData.user.firstName);
    localStorage.setItem('lastName', testWorkerData.user.lastName);
    localStorage.setItem('email', testWorkerData.user.email);

    console.log('Worker login simulated. Refresh the page to see changes.');
    this.checkAuthState();
  },

  // Clear all auth data
  clearAuth() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('email');
    localStorage.removeItem('pickupHistory');
    console.log('Auth data cleared. Refresh the page to see changes.');
  }
};

// Make it available globally in development
if (process.env.NODE_ENV === 'development') {
  window.debugAuth = debugAuth;
}

export default debugAuth;
