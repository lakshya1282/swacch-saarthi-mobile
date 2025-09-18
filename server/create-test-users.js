const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the User model
const User = require('./models/User');

// MongoDB connection
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    return false;
  }
};

// Function to hash password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Function to create test users
const createTestUsers = async () => {
  try {
    console.log('🚀 Starting to create test users...');
    
    // Test users data
    const testUsers = [
      {
        firstName: 'Lakshya',
        lastName: 'Pratap',
        email: 'lakshyapratap5911@gmail.com',
        phone: '9876543210',
        password: 'demo123', // Will be hashed
        address: '123 Main Street, Bangalore',
        pincode: '560001',
        userType: 'citizen',
        location: { latitude: 12.9716, longitude: 77.5946 },
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Demo',
        lastName: 'Citizen',
        email: 'citizen@demo.com',
        phone: '9876543211',
        password: 'demo123',
        address: '456 Demo Street, Bangalore',
        pincode: '560002',
        userType: 'citizen',
        location: { latitude: 12.9352, longitude: 77.6245 },
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Demo',
        lastName: 'Worker',
        email: 'worker@demo.com',
        phone: '9876543212',
        password: 'demo123',
        address: '789 Worker Lane, Bangalore',
        pincode: '560003',
        userType: 'worker',
        location: { latitude: 12.9082, longitude: 77.5830 },
        vehicleType: 'motorbike',
        assignedArea: 'South Bangalore',
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '9876543213',
        password: 'password',
        address: '101 Test Avenue, Bangalore',
        pincode: '560004',
        userType: 'citizen',
        location: { latitude: 12.9700, longitude: 77.7500 },
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        phone: '9876543214',
        password: 'admin123',
        address: '999 Admin Plaza, Bangalore',
        pincode: '560005',
        userType: 'admin',
        location: { latitude: 12.9800, longitude: 77.6000 },
        isActive: true,
        isVerified: true
      }
    ];
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
          $or: [
            { email: userData.email }, 
            { phone: userData.phone }
          ]
        });
        
        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email}`);
          
          // Update password if needed
          const hashedPassword = await hashPassword(userData.password);
          existingUser.password = hashedPassword;
          await existingUser.save();
          console.log(`🔄 Updated password for: ${userData.email}`);
          continue;
        }
        
        // Hash the password
        const hashedPassword = await hashPassword(userData.password);
        
        // Create new user
        const user = new User({
          ...userData,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await user.save();
        console.log(`✅ Created user: ${userData.email} (${userData.userType})`);
        
      } catch (userError) {
        console.error(`❌ Error creating user ${userData.email}:`, userError.message);
      }
    }
    
    console.log('🎉 Test users creation completed!');
    
  } catch (error) {
    console.error('❌ Error in createTestUsers:', error);
  }
};

// Function to verify users can login
const verifyUserLogin = async () => {
  console.log('🔍 Verifying user login...');
  
  try {
    const testEmail = 'lakshyapratap5911@gmail.com';
    const testPassword = 'demo123';
    
    const user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log(`❌ User not found: ${testEmail}`);
      return;
    }
    
    const isValidPassword = await bcrypt.compare(testPassword, user.password);
    if (isValidPassword) {
      console.log(`✅ Login verification successful for: ${testEmail}`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   User Type: ${user.userType}`);
      console.log(`   Full Name: ${user.firstName} ${user.lastName}`);
    } else {
      console.log(`❌ Password verification failed for: ${testEmail}`);
    }
    
  } catch (error) {
    console.error('❌ Error in verifyUserLogin:', error);
  }
};

// Function to list all users
const listAllUsers = async () => {
  try {
    console.log('👥 Listing all users in database...');
    
    const users = await User.find({}).select('firstName lastName email phone userType isActive createdAt');
    
    if (users.length === 0) {
      console.log('📭 No users found in database');
      return;
    }
    
    console.log(`📊 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Type: ${user.userType}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   ID: ${user._id}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
};

// Main execution function
const main = async () => {
  console.log('🔧 Database Setup Tool - Creating Test Users');
  console.log('=====================================');
  
  const connected = await connectToMongoDB();
  if (!connected) {
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Create test users
  await createTestUsers();
  
  // List all users
  await listAllUsers();
  
  // Verify login
  await verifyUserLogin();
  
  console.log('🏁 All done! You can now use these credentials to login:');
  console.log('✉️  lakshyapratap5911@gmail.com / demo123');
  console.log('✉️  citizen@demo.com / demo123');
  console.log('✉️  worker@demo.com / demo123');
  console.log('✉️  test@test.com / password');
  console.log('✉️  admin@test.com / admin123');
  
  // Close database connection
  await mongoose.connection.close();
  process.exit(0);
};

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { createTestUsers, verifyUserLogin, listAllUsers };