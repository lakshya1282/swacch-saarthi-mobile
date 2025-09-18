const mongoose = require('mongoose');
const Worker = require('./models/Worker');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management')
  .then(() => {
    console.log('Connected to MongoDB');
    debugWorkerEnrollment();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function debugWorkerEnrollment() {
  try {
    console.log('🔍 Debugging worker enrollment issue...\n');

    // Check how many workers exist in Worker collection
    const workerCount = await Worker.countDocuments();
    console.log(`📊 Total workers in Worker collection: ${workerCount}`);

    // Check how many users with userType 'worker' exist in User collection
    const workerUserCount = await User.countDocuments({ userType: 'worker' });
    console.log(`📊 Total users with userType 'worker' in User collection: ${workerUserCount}`);

    if (workerUserCount > 0) {
      console.log('\n👥 Worker users in User collection:');
      const workerUsers = await User.find({ userType: 'worker' }).select('firstName lastName email _id').limit(5);
      workerUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user._id}`);
      });

      // Check if any of these users exist in Worker collection
      console.log('\n🔄 Checking if these users have corresponding Worker records:');
      for (let user of workerUsers) {
        const workerRecord = await Worker.findById(user._id);
        if (workerRecord) {
          console.log(`   ✅ ${user.firstName} ${user.lastName} - Has Worker record with enrollment status: ${workerRecord.enrollmentStatus || 'undefined'}`);
        } else {
          console.log(`   ❌ ${user.firstName} ${user.lastName} - NO Worker record found`);
        }
      }
    }

    if (workerCount > 0) {
      console.log('\n🔧 Workers in Worker collection:');
      const workers = await Worker.find().select('firstName lastName email enrollmentStatus officeCode _id').limit(5);
      workers.forEach((worker, index) => {
        console.log(`   ${index + 1}. ${worker.firstName} ${worker.lastName} (${worker.email}) - Status: ${worker.enrollmentStatus || 'not_set'} - Office: ${worker.officeCode || 'none'} - ID: ${worker._id}`);
      });
    }

    console.log('\n💡 Potential issues:');
    if (workerUserCount > 0 && workerCount === 0) {
      console.log('   ❌ Workers exist in User collection but not in Worker collection');
      console.log('   🛠️  Solution: Create Worker records for existing worker users');
    } else if (workerUserCount === 0 && workerCount === 0) {
      console.log('   ❌ No workers found in either collection');
      console.log('   🛠️  Solution: Register a worker account first');
    } else if (workerUserCount > 0 && workerCount > 0) {
      console.log('   ⚠️  Workers exist in both collections - check for ID mismatches');
    }

  } catch (error) {
    console.error('❌ Error debugging worker enrollment:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}