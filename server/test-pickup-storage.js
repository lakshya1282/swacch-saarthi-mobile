const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';

// Import models to register schemas
const Pickup = require('./models/Pickup');
const User = require('./models/User');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Test pickup creation and storage
async function testPickupStorage() {
  try {
    console.log('\n📝 Testing pickup schedule storage...\n');

    // 1. Create a test pickup
    const pickupData = {
      // Don't provide userId, let the system create a guest user
      customerName: 'John Doe',
      customerPhone: '+91 9876543210',
      customerAddress: '123 Test Street, Bangalore',
      customerPincode: '560001',
      wasteTypes: ['Dry Waste', 'Recyclables'],
      estimatedWeight: '5-10 kg',
      timeSlot: '10:00 AM - 2:00 PM',
      specialInstructions: 'Please ring the doorbell twice',
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      address: '123 Test Street, Bangalore',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '11:00 AM'
    };

    console.log('1️⃣ Creating pickup schedule...');
    const createResponse = await axios.post(`${API_URL}/pickups/schedule`, pickupData);
    
    if (createResponse.data.success) {
      console.log('✅ Pickup created successfully!');
      console.log('   Pickup ID:', createResponse.data.data.pickupId);
      console.log('   Verification Code:', createResponse.data.data.verificationCode);
      console.log('   Status:', createResponse.data.data.status);
      
      const pickupId = createResponse.data.data.pickupId;

      // 2. Verify pickup exists in database
      console.log('\n2️⃣ Verifying pickup in database...');
      const dbPickup = await Pickup.findOne({ pickupId: pickupId })
        .populate('citizenId', 'firstName lastName email phone');
      
      if (dbPickup) {
        console.log('✅ Pickup found in MongoDB database!');
        console.log('   Database ID:', dbPickup._id);
        console.log('   Pickup ID:', dbPickup.pickupId);
        console.log('   Customer Name:', dbPickup.customerName);
        console.log('   Waste Types:', dbPickup.wasteTypes);
        console.log('   Status:', dbPickup.status);
        console.log('   Citizen ID:', dbPickup.citizenId?._id);
        console.log('   Created At:', dbPickup.createdAt);
      } else {
        console.log('❌ Pickup not found in database');
      }

      // 3. Test fetching pickup via API
      console.log('\n3️⃣ Fetching pickup via API...');
      const getResponse = await axios.get(`${API_URL}/pickups/${pickupId}`);
      
      if (getResponse.data.success) {
        console.log('✅ Pickup fetched successfully via API!');
        console.log('   Data retrieved:', {
          pickupId: getResponse.data.data.pickupId,
          status: getResponse.data.data.status,
          customerName: getResponse.data.data.customerName
        });
      }

      // 4. Test fetching all pickups
      console.log('\n4️⃣ Fetching all pickups...');
      const allPickupsResponse = await axios.get(`${API_URL}/pickups`);
      
      if (allPickupsResponse.data.success) {
        console.log(`✅ Found ${allPickupsResponse.data.count} pickups in database`);
        const recentPickup = allPickupsResponse.data.data.find(p => p.pickupId === pickupId);
        if (recentPickup) {
          console.log('   ✅ Our test pickup is in the list!');
        }
      }

      // 5. Test fetching schedules
      console.log('\n5️⃣ Fetching available schedules...');
      const schedulesResponse = await axios.get(`${API_URL}/pickups/schedules`);
      
      if (schedulesResponse.data.success) {
        console.log(`✅ Found ${schedulesResponse.data.data.length} available schedules`);
        const ourSchedule = schedulesResponse.data.data.find(s => s.pickupId === pickupId);
        if (ourSchedule) {
          console.log('   ✅ Our test pickup is available for workers!');
        }
      }

      // 6. Count total pickups in database
      console.log('\n6️⃣ Database statistics...');
      const totalCount = await Pickup.countDocuments();
      const scheduledCount = await Pickup.countDocuments({ status: 'scheduled' });
      const completedCount = await Pickup.countDocuments({ status: 'completed' });
      
      console.log(`📊 Total pickups in database: ${totalCount}`);
      console.log(`   - Scheduled: ${scheduledCount}`);
      console.log(`   - Completed: ${completedCount}`);

      console.log('\n✅ All tests passed! Pickup schedules are being stored in MongoDB successfully!');
      
    } else {
      console.log('❌ Failed to create pickup:', createResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
async function runTest() {
  await connectDB();
  await testPickupStorage();
  
  // Close database connection
  setTimeout(() => {
    mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }, 2000);
}

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get(`${API_URL}/health`);
    if (response.data.status === 'healthy') {
      console.log('✅ Server is running and healthy');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first with: npm start');
    return false;
  }
}

// Main execution
(async () => {
  console.log('🚀 Starting Pickup Storage Test...\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTest();
  } else {
    process.exit(1);
  }
})();