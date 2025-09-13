const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function testAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');
    console.log('✅ Connected to MongoDB');
    
    // Check existing users
    const users = await User.find();
    console.log(`\n📊 Found ${users.length} existing users:`);
    
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - Type: ${user.userType}`);
      });
    }
    
    // Create test users if none exist
    if (users.length === 0) {
      console.log('\n🔧 No users found. Creating test users...');
      
      // Create test citizen
      const citizenPassword = await bcrypt.hash('password123', 10);
      const citizen = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'citizen@test.com',
        phone: '9876543210',
        password: citizenPassword,
        address: '123 Main St, Mumbai',
        pincode: '400001',
        userType: 'citizen',
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        isActive: true,
        createdAt: new Date()
      });
      await citizen.save();
      console.log('   ✅ Created test citizen: citizen@test.com / password123');
      
      // Create test worker
      const workerPassword = await bcrypt.hash('worker123', 10);
      const worker = new User({
        firstName: 'Mike',
        lastName: 'Worker',
        email: 'worker@test.com',
        phone: '8765432109',
        password: workerPassword,
        address: '456 Worker Ave, Delhi',
        pincode: '110001',
        userType: 'worker',
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        isActive: true,
        createdAt: new Date()
      });
      await worker.save();
      console.log('   ✅ Created test worker: worker@test.com / worker123');
      
      // Create test admin
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        phone: '7654321098',
        password: adminPassword,
        address: '789 Admin Blvd, Bangalore',
        pincode: '560001',
        userType: 'admin',
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        isActive: true,
        createdAt: new Date()
      });
      await admin.save();
      console.log('   ✅ Created test admin: admin@test.com / admin123');
    }
    
    // Test login with citizen account
    console.log('\n🔐 Testing login with citizen@test.com...');
    const testUser = await User.findOne({ email: 'citizen@test.com' });
    if (testUser) {
      const isValid = await bcrypt.compare('password123', testUser.password);
      console.log(`   Password validation: ${isValid ? '✅ Success' : '❌ Failed'}`);
    }
    
    console.log('\n✅ Authentication test complete!');
    console.log('\n📝 You can now login with these credentials:');
    console.log('   Citizen: citizen@test.com / password123');
    console.log('   Worker: worker@test.com / worker123');
    console.log('   Admin: admin@test.com / admin123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testAuth();