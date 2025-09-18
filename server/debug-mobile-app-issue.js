const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');

const Pickup = require('./models/Pickup');
const User = require('./models/User');

async function debugMobileAppIssue() {
  console.log('🔍 Debugging Mobile App Issue...\n');
  
  try {
    // 1. Find all pickups in database
    const allPickups = await Pickup.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📋 Found ${allPickups.length} pickups in database:`);
    allPickups.forEach((pickup, i) => {
      console.log(`${i + 1}. ID: ${pickup._id}`);
      console.log(`   pickupId: ${pickup.pickupId}`);
      console.log(`   Status: ${pickup.status}`);
      console.log(`   Worker: ${pickup.workerId || 'None'}`);
      console.log(`   Address: ${pickup.customerAddress || pickup.address || 'N/A'}`);
      console.log(`   Created: ${pickup.createdAt}`);
      console.log('   ---');
    });
    
    // 2. Find available tasks (what workers should see)
    const availableTasks = await Pickup.find({
      status: { $in: ['scheduled', 'pending'] },
      workerId: null
    }).sort({ createdAt: -1 });
    
    console.log(`\n🎯 Available tasks for workers (${availableTasks.length}):`);
    if (availableTasks.length === 0) {
      console.log('❌ No available tasks found!');
      
      // Create a test task
      const citizen = await User.findOne({ userType: 'citizen' });
      if (citizen) {
        const testTask = new Pickup({
          pickupId: `MOBILE${Date.now()}`,
          verificationCode: 'MOBILE123',
          citizenId: citizen._id,
          customerName: 'Mobile Test',
          customerAddress: 'Test Address for Mobile',
          customerPhone: '9876543210',
          wasteTypes: ['dry', 'wet'],
          estimatedWeight: '3kg',
          timeSlot: 'morning',
          scheduledDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          status: 'scheduled',
          priority: 'medium'
        });
        
        await testTask.save();
        console.log(`✅ Created test task: ${testTask.pickupId}`);
        availableTasks.push(testTask);
      }
    }
    
    availableTasks.forEach((task, i) => {
      console.log(`${i + 1}. 🏷️  Task ID for mobile: "${task.pickupId}" (use this in API calls)`);
      console.log(`   📱 Mobile should call: POST /api/worker/tasks/${task.pickupId}/accept`);
      console.log(`   📍 Location: ${task.customerAddress || task.address}`);
      console.log(`   💰 Earning: ₹50`);
      console.log(`   ⏰ Time: ${task.getTimeSlotDetails ? task.getTimeSlotDetails()?.label : task.timeSlot}`);
      console.log('   ---');
    });
    
    // 3. Test the assignment with the correct ID format
    if (availableTasks.length > 0) {
      const testTask = availableTasks[0];
      const workers = await User.find({ userType: 'worker' }).limit(2);
      
      if (workers.length >= 2) {
        console.log(`\n🧪 Testing assignment with task: ${testTask.pickupId}`);
        console.log(`Workers: ${workers[0].firstName}, ${workers[1].firstName}`);
        
        // Test what happens when both workers try to accept
        const [result1, result2] = await Promise.all([
          Pickup.acceptTaskAtomically(testTask.pickupId, workers[0]._id, workers[0].firstName), // Use pickupId, not _id
          Pickup.acceptTaskAtomically(testTask.pickupId, workers[1]._id, workers[1].firstName)  // Use pickupId, not _id
        ]);
        
        console.log('\n📊 Test Results:');
        console.log(`${workers[0].firstName}: ${result1.success ? '✅ SUCCESS' : '❌ ' + result1.error}`);
        console.log(`${workers[1].firstName}: ${result2.success ? '✅ SUCCESS' : '❌ ' + result2.error}`);
        
        if (result1.success && result2.success) {
          console.log('\n🚨 BUG CONFIRMED: Both workers got the same task!');
        } else {
          console.log('\n✅ Atomic assignment is working correctly');
        }
        
        // Check final state
        const finalTask = await Pickup.findOne({ pickupId: testTask.pickupId });
        console.log(`\n🔍 Final state: Status=${finalTask.status}, Worker=${finalTask.workerId}`);
        
        // Reset for next test
        if (finalTask.status === 'assigned') {
          finalTask.status = 'scheduled';
          finalTask.workerId = null;
          finalTask.assignedAt = null;
          await finalTask.save();
          console.log('🔄 Reset task for next test');
        }
      }
    }
    
    // 4. Show the exact mobile app workflow
    console.log('\n📱 CORRECT MOBILE APP WORKFLOW:');
    console.log('=====================================');
    console.log('1. Mobile app calls: GET /api/worker/available-tasks');
    console.log('2. Server returns tasks with "pickupId" field');
    console.log('3. Worker clicks accept on a task');
    console.log('4. Mobile app calls: POST /api/worker/tasks/{pickupId}/accept');
    console.log('   - Use the "pickupId" field, NOT the "_id" field');
    console.log('   - pickupId is a string like "PU123ABC"');
    console.log('   - _id is a MongoDB ObjectId like "507f1f77bcf86cd799439011"');
    
    console.log('\n❌ COMMON MISTAKES:');
    console.log('- Using _id instead of pickupId in API calls');
    console.log('- Not clearing task cache after acceptance');
    console.log('- Not listening to real-time Socket.IO updates');
    console.log('- Showing tasks that are already assigned to other workers');
    
    console.log('\n✅ MOBILE APP FIXES:');
    console.log('1. Always use task.pickupId (not task._id) in API calls');
    console.log('2. Clear task list immediately after successful acceptance');
    console.log('3. Listen for "task-no-longer-available" Socket.IO events');
    console.log('4. Auto-refresh task list every 30 seconds');
    console.log('5. Handle 409 Conflict responses gracefully');
    console.log('6. Show "Task already taken" message when API returns 409');
    
    // 5. Check if there are any problematic assigned tasks
    const assignedTasks = await Pickup.find({ status: 'assigned' });
    console.log(`\n👷 Currently assigned tasks: ${assignedTasks.length}`);
    assignedTasks.forEach(task => {
      console.log(`- ${task.pickupId} → Worker ID: ${task.workerId}`);
    });
    
    // 6. Generate mobile app test data
    if (assignedTasks.length === 0 && availableTasks.length > 0) {
      console.log('\n🎯 TEST SCENARIO FOR MOBILE APPS:');
      console.log('Open both worker mobile apps and try to accept the same task:');
      availableTasks.slice(0, 3).forEach(task => {
        console.log(`📋 Task: ${task.pickupId}`);
        console.log(`   📍 ${task.customerAddress}`);
        console.log(`   ⏰ ${task.timeSlot}`);
        console.log(`   💰 ₹50 potential earning`);
      });
      
      console.log('\n🧪 Expected behavior:');
      console.log('✅ Only ONE worker should be able to accept each task');
      console.log('❌ If both workers show the same task as "accepted", that\'s the bug');
      console.log('✅ The other worker should see "Task no longer available" or similar');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugMobileAppIssue();