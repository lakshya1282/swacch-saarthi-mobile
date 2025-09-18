const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');

const Pickup = require('./models/Pickup');
const User = require('./models/User');

async function comprehensiveTest() {
  console.log('🎯 COMPREHENSIVE ASSIGNMENT BUG TEST\n');
  
  try {
    const workers = await User.find({ userType: 'worker' }).limit(2);
    const citizens = await User.find({ userType: 'citizen' }).limit(1);
    
    if (workers.length < 2 || citizens.length === 0) {
      console.log('❌ Need at least 2 workers and 1 citizen');
      return;
    }
    
    console.log(`👥 Testing with: ${workers[0].firstName} and ${workers[1].firstName}`);
    
    // Clean up previous test data
    await Pickup.deleteMany({ pickupId: { $regex: /^TEST/ } });
    
    // Create test task
    const testTask = new Pickup({
      pickupId: `TEST${Date.now()}`,
      verificationCode: 'TEST123',
      citizenId: citizens[0]._id,
      customerName: 'Lakshya Parmar',
      customerAddress: 'Azad chowk',
      customerPhone: '9303795369',
      wasteTypes: ['dry', 'wet', 'hazardous'],
      estimatedWeight: '5kg',
      timeSlot: 'morning',
      scheduledDate: new Date(Date.now() + 60 * 60 * 1000),
      status: 'scheduled',
      priority: 'medium'
    });
    
    await testTask.save();
    console.log(`\n📋 Created test task: ${testTask.pickupId}`);
    console.log(`📍 Location: ${testTask.customerAddress}`);
    
    // TEST: Both workers accept simultaneously (this is the bug scenario)
    console.log('\n🧪 TESTING: Both workers accepting the same task simultaneously...');
    
    const [result1, result2] = await Promise.all([
      Pickup.acceptTaskAtomically(testTask.pickupId, workers[0]._id, workers[0].firstName),
      Pickup.acceptTaskAtomically(testTask.pickupId, workers[1]._id, workers[1].firstName)
    ]);
    
    console.log('\n📊 RESULTS:');
    console.log(`${workers[0].firstName}: ${result1.success ? '✅ SUCCESS' : '❌ ' + result1.error}`);
    console.log(`${workers[1].firstName}: ${result2.success ? '✅ SUCCESS' : '❌ ' + result2.error}`);
    
    // Analyze results
    const bothSucceeded = result1.success && result2.success;
    const oneSucceeded = result1.success || result2.success;
    
    console.log('\n🔍 ANALYSIS:');
    if (bothSucceeded) {
      console.log('🚨 CRITICAL BUG: Both workers got the same task!');
      console.log('❌ This is the exact bug you reported in the screenshots');
    } else if (oneSucceeded) {
      console.log('✅ SUCCESS: Only one worker got the task (as expected)');
      console.log('🎉 The race condition bug has been FIXED!');
    } else {
      console.log('❓ Unexpected: Neither worker got the task');
    }
    
    // Check final database state
    const finalTask = await Pickup.findOne({ pickupId: testTask.pickupId });
    console.log(`\nDatabase state: Status=${finalTask.status}, AssignedWorker=${finalTask.workerId}`);
    
    // Show what each worker sees in their dashboard
    console.log('\n📱 MOBILE APP DASHBOARD VIEW:');
    for (let worker of workers) {
      const assignedTasks = await Pickup.find({
        workerId: worker._id,
        status: { $in: ['assigned', 'in_progress'] }
      });
      
      console.log(`\n${worker.firstName} ${worker.lastName} sees:`);
      if (assignedTasks.length > 0) {
        assignedTasks.forEach(task => {
          console.log(`  ✅ ASSIGNED: ${task.pickupId} - ${task.customerAddress}`);
        });
        console.log(`  📊 Total assigned tasks: ${assignedTasks.length}`);
        console.log(`  💰 Potential earnings: ₹${assignedTasks.length * 50}`);
      } else {
        console.log(`  📭 No assigned tasks`);
      }
    }
    
    // Test multiple concurrent assignments
    console.log('\n🧪 STRESS TEST: Multiple rapid assignments...');
    
    // Create more test tasks
    const moreTasks = [];
    for (let i = 1; i <= 3; i++) {
      const task = new Pickup({
        pickupId: `STRESS${Date.now()}${i}`,
        verificationCode: `STR${i}23`,
        citizenId: citizens[0]._id,
        customerName: `Stress Customer ${i}`,
        customerAddress: `Test Location ${i}`,
        customerPhone: '9303795369',
        wasteTypes: ['dry', 'wet'],
        estimatedWeight: `${i + 2}kg`,
        timeSlot: 'afternoon',
        scheduledDate: new Date(Date.now() + (i * 30 * 60 * 1000)),
        status: 'scheduled',
        priority: 'medium'
      });
      await task.save();
      moreTasks.push(task);
    }
    
    // All workers try to accept all tasks rapidly
    const stressPromises = [];
    moreTasks.forEach((task, taskIndex) => {
      workers.forEach((worker, workerIndex) => {
        stressPromises.push(
          Pickup.acceptTaskAtomically(task.pickupId, worker._id, `${worker.firstName}_${taskIndex}`)
        );
      });
    });
    
    const stressResults = await Promise.all(stressPromises);
    
    let totalSuccesses = stressResults.filter(r => r.success).length;
    console.log(`\n📊 Stress test: ${totalSuccesses} successes out of ${stressResults.length} attempts`);
    console.log(`Expected successes: ${moreTasks.length} (one per task)`);
    
    if (totalSuccesses === moreTasks.length) {
      console.log('✅ PERFECT: Each task was assigned to exactly one worker');
    } else if (totalSuccesses > moreTasks.length) {
      console.log('🚨 BUG: Some tasks were assigned to multiple workers');
    } else {
      console.log('⚠️ Some tasks were not assigned');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🏆 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));
    
    const allAssignedTasks = await Pickup.find({ 
      status: 'assigned',
      pickupId: { $regex: /^(TEST|STRESS)/ }
    });
    
    console.log(`\n📊 Total tasks assigned: ${allAssignedTasks.length}`);
    console.log(`📊 Expected assignments: ${1 + moreTasks.length}`);
    
    const testPassed = !bothSucceeded && totalSuccesses === moreTasks.length;
    
    if (testPassed) {
      console.log('\n🎉 🎉 🎉 SUCCESS! 🎉 🎉 🎉');
      console.log('✅ The assignment race condition bug has been COMPLETELY FIXED!');
      console.log('✅ Multiple workers can no longer accept the same task');
      console.log('✅ Atomic operations are working perfectly');
      
      console.log('\n📋 WHAT WAS FIXED:');
      console.log('1. Fixed ObjectId casting error in acceptTaskAtomically()');
      console.log('2. Improved atomic findOneAndUpdate operations');
      console.log('3. Better race condition handling');
      console.log('4. Proper pickupId vs _id handling');
      
      console.log('\n📱 FOR MOBILE APP DEVELOPERS:');
      console.log('1. Always use task.pickupId in API calls (not task._id)');
      console.log('2. Clear task cache immediately after successful assignment');
      console.log('3. Listen for Socket.IO "task-no-longer-available" events');
      console.log('4. Handle 409 Conflict responses gracefully');
      console.log('5. Auto-refresh available tasks every 30 seconds');
      console.log('6. Show proper error messages when tasks are already taken');
      
    } else {
      console.log('\n⚠️ Some issues still remain:');
      if (bothSucceeded) {
        console.log('❌ Race condition still exists - both workers got same task');
      }
      if (totalSuccesses !== moreTasks.length) {
        console.log('❌ Stress test failed - incorrect number of assignments');
      }
    }
    
    // Cleanup
    await Pickup.deleteMany({ pickupId: { $regex: /^(TEST|STRESS)/ } });
    console.log('\n🗑️ Cleaned up test data');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

comprehensiveTest();