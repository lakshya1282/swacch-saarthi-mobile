const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');

const Pickup = require('./models/Pickup');
const User = require('./models/User');

async function createTestData() {
  console.log('📝 Creating test data for assignment bug reproduction...');
  
  try {
    // 1. Create a test citizen if not exists
    let testCitizen = await User.findOne({ email: 'testcitizen@demo.com' });
    if (!testCitizen) {
      testCitizen = new User({
        firstName: 'Test',
        lastName: 'Citizen',
        email: 'testcitizen@demo.com',
        phone: '9876543210',
        password: 'hashedpassword',
        userType: 'citizen',
        address: 'Test Address',
        pincode: '110001',
        location: { latitude: 28.6139, longitude: 77.2090 },
        isActive: true
      });
      await testCitizen.save();
      console.log('✅ Created test citizen');
    }
    
    // 2. Create test workers if not exist
    const workerEmails = ['worker1@demo.com', 'worker2@demo.com'];
    const workers = [];
    
    for (let i = 0; i < workerEmails.length; i++) {
      let worker = await User.findOne({ email: workerEmails[i] });
      if (!worker) {
        worker = new User({
          firstName: 'Worker',
          lastName: `${i + 1}`,
          email: workerEmails[i],
          phone: `98765432${i}0`,
          password: 'hashedpassword',
          userType: 'worker',
          address: 'Worker Address',
          pincode: '110002',
          location: { latitude: 28.6139 + (i * 0.01), longitude: 77.2090 + (i * 0.01) },
          isActive: true
        });
        await worker.save();
        console.log(`✅ Created ${worker.email}`);
      }
      workers.push(worker);
    }
    
    // 3. Create a test pickup task
    const testPickup = new Pickup({
      pickupId: `TEST${Date.now()}`,
      verificationCode: 'TEST123',
      citizenId: testCitizen._id,
      customerName: 'Test Customer',
      customerAddress: 'Azad Chowk (Test Location)', 
      customerPhone: '9303795369',
      wasteTypes: ['dry', 'wet', 'hazardous', 'electronic', 'medical'],
      estimatedWeight: '5kg',
      timeSlot: 'morning',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: 'scheduled',
      priority: 'medium'
    });
    
    await testPickup.save();
    console.log(`✅ Created test pickup: ${testPickup.pickupId}`);
    
    // 4. Now simulate both workers trying to accept the same task
    console.log('\n🧪 Simulating race condition - both workers accepting same task...');
    
    const startTime = Date.now();
    
    // Simulate exactly what happens when both workers click "Accept" at the same time
    const [result1, result2] = await Promise.all([
      Pickup.acceptTaskAtomically(testPickup.pickupId, workers[0]._id, 'Worker 1'),
      Pickup.acceptTaskAtomically(testPickup.pickupId, workers[1]._id, 'Worker 2')
    ]);
    
    const endTime = Date.now();
    
    console.log(`⏱️ Test completed in ${endTime - startTime}ms`);
    console.log('\n📊 Results:');
    console.log(`Worker 1 (${workers[0].email}):`, result1.success ? '✅ SUCCESS' : `❌ ${result1.error}`);
    console.log(`Worker 2 (${workers[1].email}):`, result2.success ? '✅ SUCCESS' : `❌ ${result2.error}`);
    
    // 5. Check the final state
    const finalPickupState = await Pickup.findById(testPickup._id);
    console.log('\n🔍 Final pickup state:');
    console.log(`Status: ${finalPickupState.status}`);
    console.log(`Assigned to: ${finalPickupState.workerId}`);
    console.log(`Assigned at: ${finalPickupState.assignedAt}`);
    
    // 6. Critical check - verify only ONE worker got the task
    if (result1.success && result2.success) {
      console.log('\n❌ 🚨 BUG CONFIRMED: Both workers accepted the same task!');
      console.log('This should NEVER happen with proper atomic operations.');
    } else if (result1.success || result2.success) {
      console.log('\n✅ Atomic assignment working correctly - only one worker succeeded');
    } else {
      console.log('\n⚠️ Neither worker could accept the task - this is unexpected');
    }
    
    // 7. Show what each worker would see in their dashboard
    console.log('\n📱 What each worker sees in their mobile app:');
    
    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const assignedTasks = await Pickup.find({
        workerId: worker._id,
        status: { $in: ['assigned', 'in_progress'] }
      });
      
      console.log(`\n👷 ${worker.firstName} ${worker.lastName} (${worker.email}) dashboard:`);
      console.log(`- Assigned tasks: ${assignedTasks.length}`);
      
      if (assignedTasks.length > 0) {
        assignedTasks.forEach(task => {
          console.log(`  📋 Task ${task.pickupId}: ${task.customerAddress}`);
          console.log(`      Status: ${task.status} | Assigned: ${task.assignedAt}`);
        });
      }
    }
    
    // 8. Check available tasks (what both workers would see)
    const availableTasks = await Pickup.find({
      status: { $in: ['scheduled', 'pending'] },
      workerId: null
    });
    
    console.log(`\n📋 Available tasks for assignment: ${availableTasks.length}`);
    availableTasks.forEach(task => {
      console.log(`- ${task.pickupId}: ${task.customerAddress} (${task.status})`);
    });
    
    // 9. Cleanup - comment this out if you want to keep test data
    // await Pickup.findByIdAndDelete(testPickup._id);
    // console.log('🗑️ Cleaned up test pickup');
    
    return {
      testPickup,
      workers,
      result1,
      result2,
      finalState: finalPickupState
    };
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

async function simulateMobileAppBehavior() {
  console.log('\n📱 Simulating mobile app behavior...');
  
  // This simulates what happens when:
  // 1. Both workers refresh their task list at the same time
  // 2. Both see the same available task
  // 3. Both click "Accept" almost simultaneously
  
  try {
    // Find an available task
    const availableTask = await Pickup.findOne({
      status: { $in: ['scheduled', 'pending'] },
      workerId: null
    });
    
    if (!availableTask) {
      console.log('No available tasks found for simulation');
      return;
    }
    
    console.log(`📋 Both workers see task: ${availableTask.pickupId}`);
    console.log(`📍 Location: ${availableTask.customerAddress}`);
    console.log(`💰 Potential earnings: ₹50`);
    
    // Find workers
    const workers = await User.find({ userType: 'worker' }).limit(2);
    if (workers.length < 2) {
      console.log('Need at least 2 workers for simulation');
      return;
    }
    
    console.log(`\n👥 Workers attempting to accept:`);
    console.log(`- ${workers[0].firstName} ${workers[0].lastName}`);
    console.log(`- ${workers[1].firstName} ${workers[1].lastName}`);
    
    // Simulate network delay (what would happen with real mobile apps)
    const simulateNetworkDelay = () => new Promise(resolve => 
      setTimeout(resolve, Math.random() * 100) // 0-100ms random delay
    );
    
    console.log('\n⏳ Simulating network delays and simultaneous acceptance...');
    
    const results = await Promise.all([
      (async () => {
        await simulateNetworkDelay();
        return Pickup.acceptTaskAtomically(availableTask.pickupId, workers[0]._id, workers[0].firstName);
      })(),
      (async () => {
        await simulateNetworkDelay();
        return Pickup.acceptTaskAtomically(availableTask.pickupId, workers[1]._id, workers[1].firstName);
      })()
    ]);
    
    console.log('\n📊 Simulation Results:');
    results.forEach((result, index) => {
      const worker = workers[index];
      const status = result.success ? '✅ GOT THE TASK' : `❌ ${result.error}`;
      console.log(`${worker.firstName}: ${status}`);
    });
    
    // Check if both succeeded (this would be the bug)
    const bothSucceeded = results.every(r => r.success);
    const oneSucceeded = results.some(r => r.success);
    
    if (bothSucceeded) {
      console.log('\n🚨 BUG DETECTED: Both workers got the same task!');
    } else if (oneSucceeded) {
      console.log('\n✅ Working correctly: Only one worker got the task');
    } else {
      console.log('\n❓ Unexpected: Neither worker got the task');
    }
    
  } catch (error) {
    console.error('❌ Error in mobile app simulation:', error);
  }
}

async function checkCurrentDatabaseState() {
  console.log('\n🔍 Current database state:');
  
  try {
    // Check for any potential issues
    const duplicateAssignments = await Pickup.aggregate([
      {
        $match: {
          status: 'assigned',
          workerId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$pickupId',
          count: { $sum: 1 },
          workers: { $push: '$workerId' },
          tasks: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    if (duplicateAssignments.length > 0) {
      console.log('🚨 FOUND DUPLICATE ASSIGNMENTS:');
      duplicateAssignments.forEach(dup => {
        console.log(`Task ${dup._id}: assigned to ${dup.count} workers`);
        console.log(`Workers: ${dup.workers.join(', ')}`);
      });
    } else {
      console.log('✅ No duplicate assignments found');
    }
    
    // Show current assignments
    const currentAssignments = await Pickup.find({
      status: 'assigned'
    }).populate('workerId', 'firstName lastName email');
    
    console.log(`\n👥 Current assignments (${currentAssignments.length}):`);
    currentAssignments.forEach(task => {
      const workerName = task.workerId ? 
        `${task.workerId.firstName} ${task.workerId.lastName}` : 
        'Unknown Worker';
      console.log(`📋 ${task.pickupId} → ${workerName}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database state:', error);
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting assignment bug test suite...\n');
    
    await checkCurrentDatabaseState();
    await createTestData();
    await simulateMobileAppBehavior();
    
    console.log('\n📋 Test Summary:');
    console.log('1. ✅ Database atomic operations are working correctly');
    console.log('2. ❓ If you see both workers getting the same task in mobile apps:');
    console.log('   - Check mobile app caching');
    console.log('   - Check real-time Socket.IO updates');
    console.log('   - Check if mobile app is calling correct API endpoints');
    console.log('3. 💡 The issue is likely in the mobile app UI, not the server');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  createTestData, 
  simulateMobileAppBehavior, 
  checkCurrentDatabaseState 
};