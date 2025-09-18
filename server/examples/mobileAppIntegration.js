/**
 * Mobile App Integration with Dashboard Backend
 * 
 * This file demonstrates how the mobile waste management app should integrate
 * with the dashboard backend to provide real-time performance tracking and
 * incentive calculation based on the 15kg threshold at ₹10 per kg for excess weight.
 */

const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const DASHBOARD_API_BASE_URL = 'http://localhost:3001/api/dashboard';
const DASHBOARD_SOCKET_URL = 'http://localhost:3001/dashboard';

/**
 * Mobile App Service for Dashboard Integration
 * This service would be integrated into the mobile app
 */
class MobileAppDashboardService {
  constructor(workerToken, officeId) {
    this.workerToken = workerToken;
    this.officeId = officeId;
    this.socket = null;
    this.currentWeight = 0;
    this.pickupsCompleted = 0;
  }

  /**
   * Initialize Socket.IO connection for real-time updates
   */
  initializeRealTimeConnection() {
    this.socket = io(DASHBOARD_SOCKET_URL, {
      auth: {
        token: this.workerToken
      },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('📱 Mobile app connected to dashboard');
    });

    this.socket.on('dashboard-connected', (data) => {
      console.log('🎯 Dashboard connection confirmed:', data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Dashboard connection error:', error);
    });

    return this.socket;
  }

  /**
   * Submit performance data when worker completes a pickup
   * This would be called automatically when a pickup is completed in the mobile app
   */
  async submitPerformanceData(performanceData) {
    try {
      const response = await axios.post(
        `${DASHBOARD_API_BASE_URL}/submit-performance`,
        performanceData,
        {
          headers: {
            'Authorization': `Bearer ${this.workerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Performance data submitted:', response.data);

      // Update local tracking
      this.currentWeight += performanceData.wasteCollection.totalWeight;
      this.pickupsCompleted += 1;

      // Emit real-time update via Socket.IO
      if (this.socket) {
        this.socket.emit('performance-update', {
          workerId: performanceData.workerId,
          performanceData: performanceData
        });
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error submitting performance:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Simulate a complete waste collection workflow
   * This demonstrates the full integration with incentive calculation
   */
  async simulateWasteCollection() {
    console.log('🚀 Starting waste collection simulation...');
    
    // Worker completes pickups throughout the day
    const pickups = [
      { location: 'Zone A', weight: 8, type: 'mixed' },
      { location: 'Zone B', weight: 6, type: 'dry' },
      { location: 'Zone C', weight: 4, type: 'wet' },
      { location: 'Zone D', weight: 3, type: 'mixed' }
    ];

    for (const pickup of pickups) {
      await this.completePickup(pickup);
      await this.delay(2000); // 2 second delay between pickups
    }

    // Final summary
    console.log(`\n📊 Day Summary:`);
    console.log(`Total Weight Collected: ${this.currentWeight} kg`);
    console.log(`Total Pickups: ${this.pickupsCompleted}`);
    
    // Calculate incentive (15kg threshold, ₹10 per kg for excess)
    const incentiveWeight = Math.max(0, this.currentWeight - 15);
    const incentiveAmount = incentiveWeight * 10;
    
    console.log(`Incentive Weight: ${incentiveWeight} kg`);
    console.log(`Incentive Amount: ₹${incentiveAmount}`);
  }

  /**
   * Complete a single pickup and submit to dashboard
   */
  async completePickup(pickup) {
    console.log(`📦 Completing pickup at ${pickup.location} - ${pickup.weight}kg (${pickup.type})`);
    
    const performanceData = {
      workerId: 'WORKER_001', // This would come from the mobile app's auth
      officeId: this.officeId,
      wasteCollection: {
        totalWeight: pickup.weight,
        pickupsCompleted: 1,
        wasteTypes: [pickup.type],
        locations: [{
          area: pickup.location,
          weight: pickup.weight,
          timestamp: new Date()
        }]
      },
      timeTracking: {
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        endTime: new Date(),
        totalDuration: 30, // minutes
        activeTime: 25, // minutes
        breakTime: 5 // minutes
      },
      location: {
        currentLocation: {
          latitude: 20.5937 + Math.random() * 0.01,
          longitude: 78.9629 + Math.random() * 0.01,
          accuracy: 10,
          timestamp: new Date()
        },
        routeData: [
          {
            latitude: 20.5937 + Math.random() * 0.01,
            longitude: 78.9629 + Math.random() * 0.01,
            timestamp: new Date(Date.now() - 15 * 60 * 1000)
          }
        ]
      },
      notes: `Pickup completed at ${pickup.location}. Customer was cooperative.`
    };

    try {
      const result = await this.submitPerformanceData(performanceData);
      console.log(`✅ Pickup submitted. Incentive details:`, result.incentiveDetails);
    } catch (error) {
      console.error(`❌ Failed to submit pickup: ${error.message}`);
    }
  }

  /**
   * Register office and operator (for initial setup)
   * This would typically be done through the dashboard web interface
   */
  static async registerOfficeAndOperator(registrationData) {
    try {
      const response = await axios.post(
        `${DASHBOARD_API_BASE_URL}/register-office`,
        registrationData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Office and operator registered:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Login operator to get dashboard access
   */
  static async loginOperator(email, password) {
    try {
      const response = await axios.post(
        `${DASHBOARD_API_BASE_URL}/login`,
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Operator logged in:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Helper method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example usage and testing
 */
async function demonstrateMobileIntegration() {
  console.log('🏢 Setting up demo office and operator...\n');

  // 1. Register office and operator
  const registrationData = {
    office: {
      officeName: "Green City Waste Management",
      officeCode: "GCWM001",
      address: {
        street: "123 Environment Street",
        city: "Eco City",
        state: "Green State",
        pincode: "123456",
        area: "Sector 21"
      },
      location: {
        latitude: 20.5937,
        longitude: 78.9629
      },
      contactInfo: {
        phone: "9876543210",
        email: "office@greencity.com",
        website: "www.greencity.com"
      },
      operationalHours: {
        weekdays: { start: "08:00", end: "18:00" },
        saturday: { start: "08:00", end: "14:00" },
        sunday: { start: "closed", end: "closed" }
      },
      coverageArea: {
        zones: ["Zone A", "Zone B", "Zone C", "Zone D"],
        radius: 10,
        wasteTypes: ["dry", "wet", "mixed", "hazardous"]
      }
    },
    operator: {
      personalInfo: {
        firstName: "John",
        lastName: "Manager",
        employeeId: "EMP001",
        designation: "Operations Manager",
        email: "john.manager@greencity.com",
        phone: "9876543210",
        dateOfBirth: "1985-06-15",
        address: "456 Manager Colony, Eco City"
      },
      authentication: {
        password: "manager123" // In real app, this should be hashed
      },
      officeInfo: {
        joiningDate: new Date(),
        department: "Operations",
        shift: "morning"
      },
      permissions: {
        viewWorkerPerformance: true,
        processIncentives: true,
        manageWorkers: true,
        viewAnalytics: true,
        exportReports: true,
        systemSettings: false
      }
    }
  };

  try {
    // Register office and get tokens
    const registrationResult = await MobileAppDashboardService.registerOfficeAndOperator(registrationData);
    const operatorToken = registrationResult.token;
    const officeId = registrationResult.office._id;

    console.log(`Office ID: ${officeId}`);
    console.log(`Operator Token: ${operatorToken.substring(0, 20)}...`);

    // 2. Initialize mobile app service
    console.log('\n📱 Initializing mobile app dashboard service...\n');
    const mobileService = new MobileAppDashboardService(operatorToken, officeId);
    
    // Initialize real-time connection
    const socket = mobileService.initializeRealTimeConnection();

    // Wait for connection
    await mobileService.delay(1000);

    // 3. Simulate waste collection workflow
    console.log('🚮 Starting waste collection simulation...\n');
    await mobileService.simulateWasteCollection();

    // 4. Demonstrate dashboard data retrieval
    console.log('\n📊 Fetching dashboard overview...');
    
    try {
      const overviewResponse = await axios.get(
        `${DASHBOARD_API_BASE_URL}/overview/${officeId}?range=today`,
        {
          headers: {
            'Authorization': `Bearer ${operatorToken}`
          }
        }
      );
      
      console.log('Dashboard Overview:', overviewResponse.data);
    } catch (error) {
      console.log('Overview fetch skipped (would work with real server)');
    }

    console.log('\n🎉 Mobile app integration demonstration complete!');
    console.log('📱 The mobile app is now connected to the dashboard system');
    console.log('💰 Workers will automatically earn incentives for weight > 15kg at ₹10/kg');

    // Clean up
    socket?.disconnect();

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Export for use in other files
module.exports = {
  MobileAppDashboardService,
  demonstrateMobileIntegration
};

// Run demonstration if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Mobile App Dashboard Integration Demo\n');
  demonstrateMobileIntegration().catch(console.error);
}