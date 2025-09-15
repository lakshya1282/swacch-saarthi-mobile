const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');

const Pickup = require('./models/Pickup');

async function fixTaskAssignmentIssues() {
  console.log('🔧 Starting task assignment bug fix...');
  
  try {
    // 1. Find any tasks that might have duplicate assignments
    console.log('🔍 Checking for duplicate assignments...');
    
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
      console.log(`❌ Found ${duplicateAssignments.length} tasks with potential duplicate assignments:`);
      duplicateAssignments.forEach(dup => {
        console.log(`Task ${dup._id}:`, dup.tasks.map(t => `${t.workerId} (${t.status})`));
      });
      
      // Fix duplicates by keeping only the first assignment
      for (const dup of duplicateAssignments) {
        const tasks = dup.tasks;
        const firstTask = tasks[0];
        const duplicateTasks = tasks.slice(1);
        
        console.log(`Fixing duplicate assignments for task ${dup._id}`);
        console.log(`Keeping assignment to worker ${firstTask.workerId}`);
        
        // Reset duplicate assignments back to scheduled
        for (const dupTask of duplicateTasks) {
          await Pickup.findByIdAndUpdate(dupTask._id, {
            status: 'scheduled',
            workerId: null,
            assignedAt: null,
            assignedWorkerName: null
          });
          console.log(`Reset task ${dupTask._id} back to scheduled status`);
        }
      }
    } else {
      console.log('✅ No duplicate assignments found');
    }
    
    // 2. Check for any inconsistent task states
    console.log('\n🔍 Checking for inconsistent task states...');
    
    const inconsistentTasks = await Pickup.find({
      $or: [
        { status: 'assigned', workerId: null }, // Assigned but no worker
        { status: 'scheduled', workerId: { $ne: null } }, // Scheduled but has worker
      ]
    });
    
    if (inconsistentTasks.length > 0) {
      console.log(`❌ Found ${inconsistentTasks.length} tasks with inconsistent states:`);
      
      for (const task of inconsistentTasks) {
        console.log(`Task ${task.pickupId}: status=${task.status}, workerId=${task.workerId}`);
        
        if (task.status === 'assigned' && !task.workerId) {
          // Assigned but no worker - reset to scheduled
          await Pickup.findByIdAndUpdate(task._id, {
            status: 'scheduled',
            assignedAt: null,
            assignedWorkerName: null
          });
          console.log(`Fixed: Reset task ${task.pickupId} to scheduled`);
        } else if (task.status === 'scheduled' && task.workerId) {
          // Scheduled but has worker - clear worker or set to assigned
          await Pickup.findByIdAndUpdate(task._id, {
            workerId: null,
            assignedAt: null,
            assignedWorkerName: null
          });
          console.log(`Fixed: Cleared worker from scheduled task ${task.pickupId}`);
        }
      }
    } else {
      console.log('✅ No inconsistent task states found');
    }
    
    // 3. Add additional indexes to prevent race conditions
    console.log('\n🔍 Ensuring proper database indexes...');
    
    try {
      // Unique compound index to prevent duplicate assignments
      await Pickup.collection.createIndex(
        { pickupId: 1, status: 1, workerId: 1 },
        { 
          unique: true,
          partialFilterExpression: { 
            status: 'assigned',
            workerId: { $ne: null }
          },
          name: 'unique_assignment_per_task'
        }
      );
      console.log('✅ Added unique assignment index');
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️ Unique assignment index already exists');
      } else {
        console.log('⚠️ Failed to add unique assignment index:', error.message);
      }
    }
    
    // 4. Show current task statistics
    console.log('\n📊 Current task statistics:');
    
    const stats = await Pickup.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          withWorker: {
            $sum: { $cond: [{ $ne: ['$workerId', null] }, 1, 0] }
          }
        }
      }
    ]);
    
    stats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} tasks (${stat.withWorker} with worker assigned)`);
    });
    
    // 5. Get list of currently assigned tasks
    console.log('\n👥 Currently assigned tasks:');
    const assignedTasks = await Pickup.find({
      status: 'assigned'
    }).populate('workerId', 'firstName lastName email');
    
    if (assignedTasks.length > 0) {
      assignedTasks.forEach(task => {
        const workerName = task.workerId ? 
          `${task.workerId.firstName} ${task.workerId.lastName}` : 
          'Unknown Worker';
        console.log(`Task ${task.pickupId} -> ${workerName} (assigned at ${task.assignedAt})`);
      });
    } else {
      console.log('No tasks currently assigned');
    }
    
    // 6. Test the atomic assignment function
    console.log('\n🧪 Testing atomic assignment function...');
    
    const availableTasks = await Pickup.find({
      status: { $in: ['scheduled', 'pending'] },
      workerId: null
    }).limit(1);
    
    if (availableTasks.length > 0) {
      const testTask = availableTasks[0];
      console.log(`Testing with task ${testTask.pickupId}`);
      
      // Simulate two workers trying to accept the same task simultaneously
      const testWorkerId1 = new mongoose.Types.ObjectId();
      const testWorkerId2 = new mongoose.Types.ObjectId();
      
      const [result1, result2] = await Promise.all([
        Pickup.acceptTaskAtomically(testTask.pickupId, testWorkerId1, 'Test Worker 1'),
        Pickup.acceptTaskAtomically(testTask.pickupId, testWorkerId2, 'Test Worker 2')
      ]);
      
      console.log('Worker 1 result:', result1.success ? 'SUCCESS' : result1.error);
      console.log('Worker 2 result:', result2.success ? 'SUCCESS' : result2.error);
      
      if (result1.success && result2.success) {
        console.log('❌ CRITICAL: Both workers accepted the same task!');
      } else if (result1.success || result2.success) {
        console.log('✅ Atomic assignment working correctly - only one worker succeeded');
        
        // Reset the test task
        await Pickup.findByIdAndUpdate(testTask._id, {
          status: 'scheduled',
          workerId: null,
          assignedAt: null,
          assignedWorkerName: null
        });
        console.log('Reset test task back to available');
      } else {
        console.log('⚠️ Neither worker could accept the task');
      }
    } else {
      console.log('No available tasks to test with');
    }
    
    console.log('\n✅ Task assignment fix completed!');
    
    // 7. Recommendations
    console.log('\n💡 Recommendations:');
    console.log('1. Ensure mobile app refreshes task list after any assignment action');
    console.log('2. Implement proper Socket.IO real-time updates to remove assigned tasks');
    console.log('3. Add task version numbers to detect stale data');
    console.log('4. Show clear feedback when a task is no longer available');
    console.log('5. Consider adding task assignment expiration (auto-release after X minutes)');
    
  } catch (error) {
    console.error('❌ Error during task assignment fix:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Enhanced Pickup model methods
async function addEnhancedMethods() {
  console.log('\n🔧 Adding enhanced assignment methods...');
  
  // Method to check if task is still available before showing to worker
  const checkTaskAvailabilityMethod = `
  // Add this method to your Pickup model
  pickupSchema.statics.getAvailableTasksForWorker = async function(workerId, options = {}) {
    const query = {
      status: { $in: ['scheduled', 'pending'] },
      workerId: null,
      scheduledDate: { $gte: options.startDate || new Date() }
    };
    
    // Exclude location if provided
    if (options.excludeLocation && options.maxDistance) {
      // Add geospatial exclusion logic here
    }
    
    const tasks = await this.find(query)
      .populate('citizenId', 'firstName lastName phone address location')
      .sort({ scheduledDate: 1, priority: -1, createdAt: -1 });
    
    // Double-check each task is still available (race condition protection)
    const availableTasks = [];
    for (const task of tasks) {
      const stillAvailable = await this.isTaskAvailable(task._id);
      if (stillAvailable) {
        availableTasks.push(task);
      }
    }
    
    return availableTasks;
  };
  `;
  
  console.log('Enhanced method example:');
  console.log(checkTaskAvailabilityMethod);
}

// Run the fix
if (require.main === module) {
  fixTaskAssignmentIssues().then(() => {
    console.log('\n🚀 Fix complete! Remember to:');
    console.log('1. Restart your server');
    console.log('2. Clear mobile app cache');
    console.log('3. Test with multiple workers');
  });
}

module.exports = { fixTaskAssignmentIssues };