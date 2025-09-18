#!/usr/bin/env node

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_TASK_ID = 'TEST_TASK_' + Date.now();

// Mock JWT tokens for two workers
const WORKER_A_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ3b3JrZXJfQSIsImVtYWlsIjoid29ya2VyYUBleGFtcGxlLmNvbSIsInVzZXJUeXBlIjoid29ya2VyIiwiaWF0IjoxNjAwMDAwMDAwfQ.xyz';
const WORKER_B_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ3b3JrZXJfQiIsImVtYWlsIjoid29ya2VyYkBleGFtcGxlLmNvbSIsInVzZXJUeXBlIjoid29ya2VyIiwiaWF0IjoxNjAwMDAwMDAwfQ.xyz';

console.log('🧪 Starting Race Condition Test for Task Acceptance');
console.log('=' .repeat(60));

async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function createTestPickup() {
  const Pickup = require('./models/Pickup');
  
  const testPickup = new Pickup({
    pickupId: TEST_TASK_ID,
    verificationCode: 'TEST123',
    citizenId: 'test_citizen_123',
    wasteTypes: ['dry', 'wet'],
    estimatedWeight: '5 kg',
    timeSlot: 'morning',
    specialInstructions: 'Test pickup for race condition testing',
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    status: 'scheduled',
    createdAt: new Date(),
    customerName: 'Test Customer',
    customerAddress: 'Test Address',
    customerPhone: '+91 9999999999'
  });

  await testPickup.save();
  console.log(`✅ Created test pickup: ${TEST_TASK_ID}`);
  return testPickup;
}

async function simulateWorkerAcceptance(workerId, token, taskId, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const response = await axios.post(
          `${SERVER_URL}/api/worker/tasks/${taskId}/accept`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        
        resolve({
          workerId,
          success: response.data.success,
          status: response.status,
          message: response.data.message,
          error: response.data.error
        });
      } catch (error) {
        resolve({
          workerId,
          success: false,
          status: error.response?.status || 0,
          message: error.response?.data?.message || error.message,
          error: error.response?.data?.error || 'NETWORK_ERROR'
        });
      }
    }, delay);
  });
}

async function runRaceConditionTest() {
  console.log('🚀 Starting simultaneous task acceptance test...');
  
  // Simulate both workers trying to accept the same task simultaneously
  const promises = [
    simulateWorkerAcceptance('worker_A', WORKER_A_TOKEN, TEST_TASK_ID, 0),
    simulateWorkerAcceptance('worker_B', WORKER_B_TOKEN, TEST_TASK_ID, 10) // 10ms delay
  ];
  
  const results = await Promise.all(promises);
  
  console.log('\\n📊 Test Results:');
  console.log('-'.repeat(40));
  
  let successCount = 0;
  let conflictCount = 0;
  
  results.forEach(result => {
    console.log(`Worker ${result.workerId}:`);
    console.log(`  ✓ Success: ${result.success}`);
    console.log(`  ✓ Status: ${result.status}`);
    console.log(`  ✓ Message: ${result.message}`);
    console.log(`  ✓ Error: ${result.error || 'None'}`);
    console.log('');
    
    if (result.success) {
      successCount++;
    } else if (result.status === 409) { // Conflict status
      conflictCount++;
    }
  });
  
  console.log('🔍 Analysis:');
  console.log('-'.repeat(40));
  console.log(`✅ Successful acceptances: ${successCount}`);
  console.log(`⚠️  Conflicts (expected): ${conflictCount}`);
  
  if (successCount === 1 && conflictCount >= 1) {
    console.log('✅ RACE CONDITION TEST PASSED!');
    console.log('   - Only one worker successfully accepted the task');
    console.log('   - Other worker(s) received proper conflict response');
    return true;
  } else if (successCount > 1) {
    console.log('❌ RACE CONDITION TEST FAILED!');
    console.log('   - Multiple workers accepted the same task');
    console.log('   - This indicates a race condition bug');
    return false;
  } else if (successCount === 0) {
    console.log('⚠️  INCONCLUSIVE TEST RESULT');
    console.log('   - No worker successfully accepted the task');
    console.log('   - Check server logs for errors');
    return false;
  }
}

async function cleanup() {
  try {
    const Pickup = require('./models/Pickup');
    await Pickup.deleteOne({ pickupId: TEST_TASK_ID });
    console.log(`🧹 Cleaned up test pickup: ${TEST_TASK_ID}`);
  } catch (error) {
    console.log('❌ Cleanup failed:', error.message);
  }
}

async function main() {
  const isMongoConnected = await connectToMongoDB();
  
  if (!isMongoConnected) {
    console.log('❌ Cannot run test without MongoDB connection');
    process.exit(1);
  }
  
  try {
    // Create test data
    await createTestPickup();
    
    // Wait a moment for the server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run the race condition test
    const testPassed = await runRaceConditionTest();
    
    // Cleanup
    await cleanup();
    
    console.log('\\n' + '='.repeat(60));
    if (testPassed) {
      console.log('🎉 RACE CONDITION FIX VERIFICATION: SUCCESSFUL');
      process.exit(0);
    } else {
      console.log('💥 RACE CONDITION FIX VERIFICATION: FAILED');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await cleanup();
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}