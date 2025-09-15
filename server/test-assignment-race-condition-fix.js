/**
 * Test Script: Assignment Race Condition Fix Verification
 * 
 * This script tests the race condition fix that prevents multiple workers
 * from accepting the same pickup assignment.
 * 
 * Tests:
 * 1. Worker A assigned → accepts successfully
 * 2. Worker B tries to accept same assignment → fails with 403
 * 3. If already accepted, no one else can overwrite it
 * 4. Worker tries to accept non-existent assignment → fails
 */

const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const PickupRequest = require('./models/PickupRequest');
const Worker = require('./models/Worker');
const Citizen = require('./models/Citizen');
const Zone = require('./models/Zone');
const TimeSlot = require('./models/TimeSlot');
const AssignmentService = require('./services/assignmentService');

// Test configuration
const TEST_CONFIG = {
  mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/waste-management',
  testWorkerA: {
    firstName: 'John',
    lastName: 'Worker',
    email: 'worker.a@test.com',
    phone: '+1234567890',
    password: 'testpassword123'
  },
  testWorkerB: {
    firstName: 'Jane',
    lastName: 'Worker',
    email: 'worker.b@test.com',
    phone: '+1234567891',
    password: 'testpassword123'
  },
  testCitizen: {
    firstName: 'Test',
    lastName: 'Citizen',
    email: 'citizen@test.com',
    phone: '+1234567892',
    password: 'testpassword123'
  }
};

let testData = {
  workerA: null,
  workerB: null,
  citizen: null,
  zone: null,
  timeSlot: null,
  pickupRequest: null,
  assignment: null
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectToDatabase() {
  try {
    await mongoose.connect(TEST_CONFIG.mongoUrl);
    log('✅ Connected to MongoDB', 'green');
  } catch (error) {
    log(`❌ MongoDB connection failed: ${error.message}`, 'red');
    throw error;
  }
}

async function createTestData() {
  log('\n🔧 Creating test data...', 'blue');
  
  try {
    // Clean up existing test data
    await cleanup();
    
    // Create zone
    testData.zone = new Zone({
      name: 'Test Zone',
      code: 'TZ001',
      coordinates: {
        type: 'Polygon',
        coordinates: [[[77.1, 28.5], [77.2, 28.5], [77.2, 28.6], [77.1, 28.6], [77.1, 28.5]]]
      }
    });
    await testData.zone.save();
    
    // Create time slot
    testData.timeSlot = new TimeSlot({
      name: 'Morning Slot',
      timeRange: {
        start: '09:00',
        end: '12:00'
      },
      maxCapacity: 10,
      currentBookings: 0
    });
    await testData.timeSlot.save();
    
    // Create test citizen
    testData.citizen = new Citizen({
      ...TEST_CONFIG.testCitizen,
      address: {
        street: '123 Test Street',
        area: 'Test Area',
        city: 'Test City',
        pincode: '123456'
      },
      location: {
        type: 'Point',
        coordinates: [77.15, 28.55]
      }
    });
    await testData.citizen.save();
    
    // Create worker A
    testData.workerA = new Worker({
      ...TEST_CONFIG.testWorkerA,
      userType: 'worker',
      zoneAssignments: [testData.zone._id],
      currentLocation: {
        type: 'Point',
        coordinates: [77.14, 28.54]
      },
      vehicle: {
        type: 'truck',
        registrationNumber: 'TEST001',
        capacityKg: 1000
      },
      status: {
        current: 'available',
        isActive: true
      }
    });
    await testData.workerA.save();
    
    // Create worker B
    testData.workerB = new Worker({
      ...TEST_CONFIG.testWorkerB,
      userType: 'worker',
      zoneAssignments: [testData.zone._id],
      currentLocation: {
        type: 'Point',
        coordinates: [77.16, 28.56]
      },
      vehicle: {
        type: 'truck',
        registrationNumber: 'TEST002',
        capacityKg: 1000
      },
      status: {
        current: 'available',
        isActive: true
      }
    });
    await testData.workerB.save();
    
    // Create pickup request
    testData.pickupRequest = new PickupRequest({
      userId: testData.citizen._id,
      zoneId: testData.zone._id,
      timeSlotId: testData.timeSlot._id,
      location: {
        type: 'Point',
        coordinates: [77.15, 28.55]
      },
      address: {
        street: '123 Test Street',
        area: 'Test Area',
        instructions: 'Test pickup'
      },
      preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      wasteDetails: {
        types: [{
          category: 'mixed',
          items: ['general waste'],
          estimatedKg: 5
        }],
        totalEstimatedKg: 5
      },
      status: 'SCHEDULED'
    });
    await testData.pickupRequest.save();
    
    log('✅ Test data created successfully', 'green');
    
  } catch (error) {
    log(`❌ Failed to create test data: ${error.message}`, 'red');
    throw error;
  }
}

async function createAssignment() {
  log('\n🔧 Creating assignment...', 'blue');
  
  try {
    // Create assignment for worker A
    testData.assignment = await AssignmentService.createAssignment(
      testData.pickupRequest._id,
      {
        assignmentType: 'manual',
        priority: 5,
        responseTimeMinutes: 15
      }
    );
    
    log(`✅ Assignment created: ${testData.assignment.assignmentId}`, 'green');
    log(`   Assigned to: ${testData.assignment.workerId}`, 'green');
    log(`   Worker A ID: ${testData.workerA._id}`, 'green');
    
  } catch (error) {
    log(`❌ Failed to create assignment: ${error.message}`, 'red');
    throw error;
  }
}

async function testWorkerAAcceptsSuccessfully() {
  log('\n🧪 TEST 1: Worker A (assigned) tries to accept...', 'yellow');
  
  try {
    const acceptedAssignment = await AssignmentService.acceptAssignment(
      testData.assignment._id,
      testData.workerA._id,
      {
        location: [77.14, 28.54],
        notes: 'On my way to pickup location'
      }
    );
    
    if (acceptedAssignment.status === 'ACCEPTED') {
      log('✅ PASS: Worker A successfully accepted assignment', 'green');
      return true;
    } else {
      log(`❌ FAIL: Unexpected status: ${acceptedAssignment.status}`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ FAIL: Worker A should have been able to accept: ${error.message}`, 'red');
    return false;
  }
}

async function testWorkerBCannotAccept() {
  log('\n🧪 TEST 2: Worker B (not assigned) tries to accept...', 'yellow');
  
  try {
    await AssignmentService.acceptAssignment(
      testData.assignment._id,
      testData.workerB._id,
      {
        location: [77.16, 28.56],
        notes: 'Trying to steal this assignment'
      }
    );
    
    log('❌ FAIL: Worker B should NOT have been able to accept', 'red');
    return false;
    
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('already accepted')) {
      log('✅ PASS: Worker B correctly prevented from accepting', 'green');
      log(`   Error: ${error.message}`, 'green');
      return true;
    } else {
      log(`❌ FAIL: Unexpected error: ${error.message}`, 'red');
      return false;
    }
  }
}

async function testAlreadyAcceptedCannotBeOverwritten() {
  log('\n🧪 TEST 3: Try to accept already accepted assignment...', 'yellow');
  
  try {
    // Try worker A again (should fail since already accepted)
    await AssignmentService.acceptAssignment(
      testData.assignment._id,
      testData.workerA._id,
      {
        location: [77.14, 28.54],
        notes: 'Trying to accept again'
      }
    );
    
    log('❌ FAIL: Should not be able to accept already accepted assignment', 'red');
    return false;
    
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('already accepted')) {
      log('✅ PASS: Already accepted assignment correctly protected', 'green');
      log(`   Error: ${error.message}`, 'green');
      return true;
    } else {
      log(`❌ FAIL: Unexpected error: ${error.message}`, 'red');
      return false;
    }
  }
}

async function testNonExistentAssignment() {
  log('\n🧪 TEST 4: Try to accept non-existent assignment...', 'yellow');
  
  try {
    const fakeAssignmentId = new mongoose.Types.ObjectId();
    
    await AssignmentService.acceptAssignment(
      fakeAssignmentId,
      testData.workerA._id,
      {
        location: [77.14, 28.54],
        notes: 'Trying to accept fake assignment'
      }
    );
    
    log('❌ FAIL: Should not be able to accept non-existent assignment', 'red');
    return false;
    
  } catch (error) {
    if (error.message.includes('Assignment not found')) {
      log('✅ PASS: Non-existent assignment correctly rejected', 'green');
      log(`   Error: ${error.message}`, 'green');
      return true;
    } else {
      log(`❌ FAIL: Unexpected error: ${error.message}`, 'red');
      return false;
    }
  }
}

async function verifyDatabaseState() {
  log('\n🔍 Verifying database state...', 'blue');
  
  try {
    // Check assignment status
    const assignment = await Assignment.findById(testData.assignment._id).populate('pickupRequestId');
    log(`Assignment status: ${assignment.status}`, 'blue');
    log(`Assignment accepted at: ${assignment.timestamps.accepted}`, 'blue');
    
    // Check pickup request status
    const pickupRequest = await PickupRequest.findById(testData.pickupRequest._id);
    log(`Pickup request status: ${pickupRequest.status}`, 'blue');
    log(`Assigned to: ${pickupRequest.assignedTo}`, 'blue');
    
    // Verify only one assignment exists for this pickup request
    const allAssignments = await Assignment.find({ pickupRequestId: testData.pickupRequest._id });
    log(`Total assignments for pickup request: ${allAssignments.length}`, 'blue');
    
    if (allAssignments.length === 1) {
      log('✅ PASS: Only one assignment exists per pickup request', 'green');
      return true;
    } else {
      log('❌ FAIL: Multiple assignments found for same pickup request', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Database verification failed: ${error.message}`, 'red');
    return false;
  }
}

async function cleanup() {
  try {
    // Clean up test data
    await Assignment.deleteMany({ 
      $or: [
        { assignmentId: { $regex: /^ASN.*/ } },
        { pickupRequestId: { $in: [testData.pickupRequest?._id].filter(Boolean) } }
      ]
    });
    
    await PickupRequest.deleteMany({ 
      userId: { $in: [testData.citizen?._id].filter(Boolean) }
    });
    
    await Worker.deleteMany({ 
      email: { $in: [TEST_CONFIG.testWorkerA.email, TEST_CONFIG.testWorkerB.email] }
    });
    
    await Citizen.deleteMany({ 
      email: TEST_CONFIG.testCitizen.email 
    });
    
    await Zone.deleteMany({ 
      code: 'TZ001' 
    });
    
    await TimeSlot.deleteMany({ 
      name: 'Morning Slot' 
    });
    
    log('🧹 Cleanup completed', 'blue');
    
  } catch (error) {
    log(`⚠️ Cleanup error (non-critical): ${error.message}`, 'yellow');
  }
}

async function runAllTests() {
  log('🚀 Starting Assignment Race Condition Fix Tests', 'blue');
  log('='.repeat(60), 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 5
  };
  
  try {
    // Setup
    await connectToDatabase();
    await createTestData();
    await createAssignment();
    
    // Run tests
    const test1 = await testWorkerAAcceptsSuccessfully();
    const test2 = await testWorkerBCannotAccept();
    const test3 = await testAlreadyAcceptedCannotBeOverwritten();
    const test4 = await testNonExistentAssignment();
    const test5 = await verifyDatabaseState();
    
    // Count results
    [test1, test2, test3, test4, test5].forEach(result => {
      if (result) results.passed++;
      else results.failed++;
    });
    
  } catch (error) {
    log(`💥 Test suite failed with error: ${error.message}`, 'red');
    results.failed = results.total;
  } finally {
    await cleanup();
    await mongoose.disconnect();
  }
  
  // Print summary
  log('\n' + '=' * 60, 'blue');
  log('📊 TEST SUMMARY', 'blue');
  log('=' * 60, 'blue');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, results.passed === results.total ? 'green' : 'yellow');
  log(`Failed: ${results.failed}`, results.failed === 0 ? 'green' : 'red');
  
  if (results.passed === results.total) {
    log('\n🎉 ALL TESTS PASSED! Race condition fix is working correctly.', 'green');
  } else {
    log('\n❌ Some tests failed. Please review the implementation.', 'red');
  }
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests if script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testWorkerAAcceptsSuccessfully,
  testWorkerBCannotAccept,
  testAlreadyAcceptedCannotBeOverwritten,
  testNonExistentAssignment,
  verifyDatabaseState
};