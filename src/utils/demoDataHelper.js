/**
 * Demo Data Helper for Testing
 * This helper provides functions to populate sample data for testing the app
 */

export const demoDataHelper = {
  /**
   * Populate sample citizen registration data
   */
  populateSampleCitizenData() {
    const sampleCitizens = [
      {
        userId: 'citizen_001',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh.kumar@example.com',
        phone: '+91 9876543210',
        address: '45, MG Road, Near City Mall, Bangalore',
        pincode: '560001',
        userType: 'citizen'
      },
      {
        userId: 'citizen_002',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@example.com',
        phone: '+91 9988776655',
        address: '12B, Koramangala 4th Block, Bangalore',
        pincode: '560034',
        userType: 'citizen'
      },
      {
        userId: 'citizen_003',
        firstName: 'Amit',
        lastName: 'Singh',
        email: 'amit.singh@example.com',
        phone: '+91 8899001122',
        address: '78, Whitefield Main Road, Bangalore',
        pincode: '560066',
        userType: 'citizen'
      }
    ];

    // Get a random citizen
    const randomCitizen = sampleCitizens[Math.floor(Math.random() * sampleCitizens.length)];
    
    // Populate localStorage with sample data
    localStorage.setItem('userId', randomCitizen.userId);
    localStorage.setItem('firstName', randomCitizen.firstName);
    localStorage.setItem('lastName', randomCitizen.lastName);
    localStorage.setItem('email', randomCitizen.email);
    localStorage.setItem('userPhone', randomCitizen.phone);
    localStorage.setItem('userAddress', randomCitizen.address);
    localStorage.setItem('userPincode', randomCitizen.pincode);
    localStorage.setItem('userType', randomCitizen.userType);
    localStorage.setItem('authToken', 'demo-token-' + Date.now());
    
    console.log('Sample citizen data populated:', randomCitizen);
    return randomCitizen;
  },

  /**
   * Populate sample worker data
   */
  populateSampleWorkerData() {
    const sampleWorker = {
      userId: 'worker_001',
      firstName: 'Suresh',
      lastName: 'Yadav',
      email: 'suresh.worker@example.com',
      phone: '+91 7788990011',
      userType: 'worker'
    };
    
    localStorage.setItem('userId', sampleWorker.userId);
    localStorage.setItem('firstName', sampleWorker.firstName);
    localStorage.setItem('lastName', sampleWorker.lastName);
    localStorage.setItem('email', sampleWorker.email);
    localStorage.setItem('userPhone', sampleWorker.phone);
    localStorage.setItem('userType', sampleWorker.userType);
    localStorage.setItem('authToken', 'demo-worker-token-' + Date.now());
    
    console.log('Sample worker data populated:', sampleWorker);
    return sampleWorker;
  },

  /**
   * Create sample pickup with citizen info
   */
  createSamplePickupWithCitizenInfo() {
    const citizen = this.populateSampleCitizenData();
    
    const samplePickup = {
      pickupId: 'PU' + Date.now(),
      userId: citizen.userId,
      customerName: `${citizen.firstName} ${citizen.lastName}`,
      customerPhone: citizen.phone,
      customerAddress: citizen.address,
      customerPincode: citizen.pincode,
      wasteTypes: ['Dry Waste', 'Wet Waste'],
      estimatedWeight: '5 kg',
      timeSlot: '9:00 AM - 11:00 AM',
      location: {
        latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
        longitude: 77.5946 + (Math.random() - 0.5) * 0.1
      },
      specialInstructions: 'Please ring the doorbell twice',
      status: 'pending',
      scheduledDate: new Date().toLocaleDateString(),
      createdAt: new Date().toISOString()
    };
    
    // Add to pickup history
    const pickupHistory = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
    pickupHistory.unshift(samplePickup);
    localStorage.setItem('pickupHistory', JSON.stringify(pickupHistory));
    
    console.log('Sample pickup created:', samplePickup);
    return samplePickup;
  },

  /**
   * Clear all demo data
   */
  clearDemoData() {
    const keysToRemove = [
      'authToken', 'userId', 'userType', 
      'firstName', 'lastName', 'email',
      'userPhone', 'userAddress', 'userPincode',
      'pickupHistory'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('Demo data cleared');
  }
};

// Make it available globally in development mode
if (process.env.NODE_ENV === 'development') {
  window.demoDataHelper = demoDataHelper;
}

export default demoDataHelper;
