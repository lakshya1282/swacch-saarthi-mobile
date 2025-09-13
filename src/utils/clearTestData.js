/**
 * Clear Test Data Generator
 * Generates human-readable test data for worker dashboard testing
 */

export const clearTestData = {
  /**
   * Generate clear pickup data with real contact information
   */
  generateClearPickups() {
    const pickups = [
      {
        pickupId: 'PU-1012-1001',
        userId: 'citizen_001',
        customerName: 'Rajesh Kumar',
        customerPhone: '+91 98765 43210',
        customerAddress: '45, MG Road, Near City Mall, Bangalore',
        customerPincode: '560001',
        wasteTypes: ['Dry Waste', 'Wet Waste'],
        estimatedWeight: '5 kg',
        timeSlot: '9:00 AM - 11:00 AM',
        location: {
          latitude: 12.9716,
          longitude: 77.5946
        },
        address: 'MG Road, Bangalore, Karnataka 560001',
        specialInstructions: 'Please ring doorbell twice. Gate code: 1234',
        status: 'pending',
        scheduledDate: new Date().toLocaleDateString(),
        createdAt: new Date().toISOString()
      },
      {
        pickupId: 'PU-1012-1002',
        userId: 'citizen_002',
        customerName: 'Priya Sharma',
        customerPhone: '+91 99887 76655',
        customerAddress: '12B, Koramangala 4th Block, Bangalore',
        customerPincode: '560034',
        wasteTypes: ['Wet Waste'],
        estimatedWeight: '3 kg',
        timeSlot: '11:00 AM - 1:00 PM',
        location: {
          latitude: 12.9352,
          longitude: 77.6245
        },
        address: 'Koramangala 4th Block, Bangalore, Karnataka 560034',
        specialInstructions: 'Call before arriving',
        status: 'pending',
        scheduledDate: new Date().toLocaleDateString(),
        createdAt: new Date().toISOString()
      },
      {
        pickupId: 'PU-1012-1003',
        userId: 'citizen_003',
        customerName: 'Amit Singh',
        customerPhone: '+91 88990 01122',
        customerAddress: '78, Whitefield Main Road, Bangalore',
        customerPincode: '560066',
        wasteTypes: ['Dry Waste', 'Hazardous Waste'],
        estimatedWeight: '7 kg',
        timeSlot: '2:00 PM - 4:00 PM',
        location: {
          latitude: 12.9698,
          longitude: 77.7500
        },
        address: 'Whitefield Main Road, Bangalore, Karnataka 560066',
        specialInstructions: 'Electronic waste included - handle with care',
        status: 'pending',
        scheduledDate: new Date().toLocaleDateString(),
        createdAt: new Date().toISOString()
      }
    ];

    return pickups;
  },

  /**
   * Load clear test pickups into localStorage
   */
  loadClearTestData() {
    const clearPickups = this.generateClearPickups();
    localStorage.setItem('pickupHistory', JSON.stringify(clearPickups));
    
    console.log('Clear test data loaded successfully!');
    console.log('Pickups loaded:', clearPickups);
    
    return clearPickups;
  },

  /**
   * Create a single clear pickup with full details
   */
  createSingleClearPickup(customData = {}) {
    const defaultPickup = {
      pickupId: `PU-${new Date().getDate()}${new Date().getMonth() + 1}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: 'citizen_' + Math.floor(Math.random() * 100),
      customerName: 'Rajesh Kumar',
      customerPhone: '+91 98765 43210',
      customerAddress: '45, MG Road, Near City Mall, Bangalore',
      customerPincode: '560001',
      wasteTypes: ['Dry Waste', 'Wet Waste'],
      estimatedWeight: '5 kg',
      timeSlot: '9:00 AM - 11:00 AM',
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      address: 'MG Road, Bangalore, Karnataka 560001',
      specialInstructions: 'Please ring doorbell twice',
      status: 'pending',
      scheduledDate: new Date().toLocaleDateString(),
      createdAt: new Date().toISOString()
    };

    const pickup = { ...defaultPickup, ...customData };
    
    // Add to existing pickups
    const pickupHistory = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
    pickupHistory.unshift(pickup);
    localStorage.setItem('pickupHistory', JSON.stringify(pickupHistory));
    
    console.log('Clear pickup created:', pickup);
    return pickup;
  },

  /**
   * Set up worker view with clear test data
   */
  setupWorkerView() {
    // Set worker credentials
    localStorage.setItem('userId', 'worker_001');
    localStorage.setItem('firstName', 'Suresh');
    localStorage.setItem('lastName', 'Yadav');
    localStorage.setItem('email', 'suresh.worker@example.com');
    localStorage.setItem('userType', 'worker');
    localStorage.setItem('authToken', 'worker-token-' + Date.now());
    
    // Load clear pickup data
    this.loadClearTestData();
    
    console.log('Worker view set up with clear test data');
    console.log('Navigate to /worker-dashboard to see the assignments');
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  window.clearTestData = clearTestData;
}

export default clearTestData;
