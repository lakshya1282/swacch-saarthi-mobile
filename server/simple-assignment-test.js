const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');

const Pickup = require('./models/Pickup');
const User = require('./models/User');

async function testAssignment() {
  console.log('🧪 Testing assignment mechanism...\n');
  
  try {
    // 1. Find existing workers
    const workers = await User.find({ userType: 'worker' }).limit(2);
    
    if (workers.length < 2) {
      console.log('❌ Need at least 2 workers to test. Please create workers first.');
      return;
    }
    
    console.log('👥 Found workers:');
    workers.forEach((worker, i) => {
      console.log(`${i + 1}. ${worker.firstName} ${worker.lastName} (${worker.email})`);
    });
    
    // 2. Find existing citizen
    const citizen = await User.findOne({ userType: 'citizen' });
    if (!citizen) {
      console.log('❌ No citizens found. Please create a citizen first.');
      return;
    }
    
    console.log(`\n👤 Found citizen: ${citizen.firstName} ${citizen.lastName}`);
    
    // 3. Create a simple test pickup
    const testPickupId = `TEST${Date.now()}`;
    
    const testPickup = new Pickup({
      pickupId: testPickupId,
      verificationCode: 'TEST123',
      citizenId: citizen._id,
      customerName: 'Lakshya Parmar',
      customerAddress: 'Azad chowk',
      customerPhone: '9303795369',
      wasteTypes: ['dry', 'wet', 'hazardous'],
      estimatedWeight: '5kg',
      timeSlot: 'morning',
      scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: 'scheduled',
      priority: 'medium'
    });
    
    await testPickup.save();
    console.log(`\n📋 Created test pickup: ${testPickupId}`);
    console.log(`📍 Location: ${testPickup.customerAddress}`);
    console.log(`⏰ Scheduled: ${testPickup.scheduledDate}`);
    
    // 4. Test atomic assignment
    console.log('\n🎯 Testing atomic assignment with both workers...');
    
    const startTime = Date.now();
    
    // Both workers try to accept at EXACTLY the same time
    const [result1, result2] = await Promise.all([
      Pickup.acceptTaskAtomically(testPickupId, workers[0]._id, workers[0].firstName + ' ' + workers[0].lastName),
      Pickup.acceptTaskAtomically(testPickupId, workers[1]._id, workers[1].firstName + ' ' + workers[1].lastName)
    ]);
    
    const endTime = Date.now();
    console.log(`⏱️  Assignment completed in ${endTime - startTime}ms`);
    
    // 5. Show results
    console.log('\n📊 Results:');
    console.log(`${workers[0].firstName}: ${result1.success ? '✅ SUCCESS' : '❌ ' + result1.error}`);
    console.log(`${workers[1].firstName}: ${result2.success ? '✅ SUCCESS' : '❌ ' + result2.error}`);
    
    // 6. Critical analysis
    const bothSucceeded = result1.success && result2.success;
    const oneSucceeded = result1.success || result2.success;
    
    if (bothSucceeded) {
      console.log('\n🚨 CRITICAL BUG: Both workers accepted the same task!');
      console.log('This is the exact bug you\'re experiencing.');
    } else if (oneSucceeded) {
      console.log('\n✅ Working correctly: Only one worker got the assignment');
      
      // Show who got it
      const winner = result1.success ? workers[0] : workers[1];
      console.log(`🏆 Task assigned to: ${winner.firstName} ${winner.lastName}`);
    } else {
      console.log('\n❓ Unexpected: Neither worker got the task');
    }
    
    // 7. Check final database state
    const finalPickup = await Pickup.findById(testPickup._id);
    console.log('\n🔍 Final database state:');
    console.log(`Status: ${finalPickup.status}`);
    console.log(`Assigned to worker ID: ${finalPickup.workerId}`);
    console.log(`Assignment time: ${finalPickup.assignedAt}`);
    
    // 8. Show what each worker would see in their mobile app
    console.log('\n📱 Mobile app dashboard view:');
    
    for (let worker of workers) {
      const workerTasks = await Pickup.find({
        workerId: worker._id,
        status: { $in: ['assigned', 'in_progress'] }
      });
      
      console.log(`\n${worker.firstName} ${worker.lastName} would see:`);
      if (workerTasks.length > 0) {
        workerTasks.forEach(task => {
          console.log(`  ✅ ASSIGNED: ${task.pickupId} - ${task.customerAddress}`);
        });
      } else {
        console.log(`  📭 No assigned tasks`);
      }
    }
    
    // 9. Check available tasks (what both workers see before assignment)
    const availableTasks = await Pickup.find({
      status: { $in: ['scheduled', 'pending'] },
      workerId: null,
      _id: { $ne: testPickup._id } // Exclude our test pickup
    });
    
    console.log(`\n📋 Other available tasks: ${availableTasks.length}`);
    
    // 10. Clean up test data
    await Pickup.findByIdAndDelete(testPickup._id);
    console.log(`\n🗑️  Cleaned up test pickup: ${testPickupId}`);
    
    // 11. Conclusions
    console.log('\n🎯 CONCLUSIONS:');
    console.log('================');
    
    if (bothSucceeded) {
      console.log('❌ The server has a race condition bug in atomic assignment');
      console.log('❌ Multiple workers can accept the same task simultaneously');
      console.log('🔧 This needs to be fixed at the database/server level');
    } else {
      console.log('✅ Server atomic assignment is working correctly');
      console.log('💡 The issue you\'re seeing is likely:');
      console.log('   1. Mobile app caching outdated task lists');
      console.log('   2. Real-time updates not working properly');  
      console.log('   3. Mobile app showing tasks that are already taken');
      console.log('   4. UI not refreshing after successful assignment');
    }
    
    console.log('\n📱 MOBILE APP FIXES NEEDED:');
    console.log('1. Clear task cache immediately after any assignment');
    console.log('2. Listen for Socket.IO "task-no-longer-available" events');
    console.log('3. Auto-refresh task list every 30 seconds');
    console.log('4. Show proper error when task is already taken (409 status)');
    console.log('5. Remove assigned tasks from other workers\' UI immediately');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testAssignment();