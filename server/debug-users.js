const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

// Debug users in database
async function debugUsers() {
  try {
    await connectToMongoDB();
    
    console.log('\n🔍 Debugging Users in Database:');
    console.log('=====================================');
    
    // Get all users
    const users = await User.find({}).select('firstName lastName email userType createdAt');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 User Type: ${user.userType}`);
      console.log(`   📅 Created: ${user.createdAt}`);
      console.log('   ──────────────────────────');
    });
    
    // Check for specific emails mentioned in demo credentials
    console.log('\n🔎 Checking Demo Credentials:');
    console.log('=====================================');
    
    const citizenUser = await User.findOne({ email: 'citizen@demo.com' });
    if (citizenUser) {
      console.log('✅ citizen@demo.com found:', {
        userType: citizenUser.userType,
        firstName: citizenUser.firstName,
        lastName: citizenUser.lastName
      });
    } else {
      console.log('❌ citizen@demo.com not found in database');
    }
    
    const workerUser = await User.findOne({ email: 'worker@demo.com' });
    if (workerUser) {
      console.log('✅ worker@demo.com found:', {
        userType: workerUser.userType,
        firstName: workerUser.firstName,
        lastName: workerUser.lastName
      });
    } else {
      console.log('❌ worker@demo.com not found in database');
    }
    
    // Check for any userType inconsistencies
    console.log('\n📊 User Type Distribution:');
    console.log('=====================================');
    
    const citizenCount = await User.countDocuments({ userType: 'citizen' });
    const workerCount = await User.countDocuments({ userType: 'worker' });
    const adminCount = await User.countDocuments({ userType: 'admin' });
    
    console.log(`Citizens: ${citizenCount}`);
    console.log(`Workers: ${workerCount}`);
    console.log(`Admins: ${adminCount}`);
    
    // Check for any null or undefined userTypes
    const invalidUsers = await User.find({ 
      $or: [
        { userType: { $exists: false } },
        { userType: null },
        { userType: '' },
        { userType: { $nin: ['citizen', 'worker', 'admin'] } }
      ]
    });
    
    if (invalidUsers.length > 0) {
      console.log('\n⚠️ Found users with invalid userType:');
      invalidUsers.forEach(user => {
        console.log(`   ${user.email}: ${user.userType}`);
      });
    } else {
      console.log('\n✅ All users have valid userType values');
    }
    
  } catch (error) {
    console.error('Error debugging users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the debug script
debugUsers().catch(console.error);