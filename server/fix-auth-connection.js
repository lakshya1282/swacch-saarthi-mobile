/**
 * Script to diagnose and fix MongoDB connection issues
 * Run this before starting the server to ensure proper database connection
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

// Import User model
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management';

async function checkMongoDBConnection() {
  console.log('🔍 Checking MongoDB Connection...');
  console.log('📍 MongoDB URI:', MONGODB_URI);
  
  try {
    // Try to connect with proper options
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('\n🔧 To fix this issue:');
    console.log('1. Make sure MongoDB is installed');
    console.log('2. Start MongoDB by running: start-mongodb.bat');
    console.log('3. Or run: mongod --dbpath "E:\\project\\WasteManagementApp\\mongodb-data"');
    return false;
  }
}

async function checkExistingUsers() {
  console.log('\n🔍 Checking existing users in database...');
  
  try {
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await User.find({}, 'email firstName lastName userType').limit(5);
      console.log('\n👥 Sample users:');
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - Type: ${user.userType}`);
      });
    }
    
    return userCount;
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    return 0;
  }
}

async function createTestUser() {
  console.log('\n🔧 Creating a test user for authentication testing...');
  
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('ℹ️ Test user already exists');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Password: Test123456');
      return existingUser;
    }
    
    // Create new test user
    const hashedPassword = await bcrypt.hash('Test123456', 10);
    
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '9876543210',
      password: hashedPassword,
      address: 'Test Address, Bangalore',
      pincode: '560001',
      userType: 'citizen',
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      isActive: true,
      isVerified: true
    });
    
    await testUser.save();
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: Test123456');
    console.log('👤 Type: citizen');
    
    return testUser;
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    return null;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing authentication flow...');
  
  try {
    const testEmail = 'test@example.com';
    const testPassword = 'Test123456';
    
    // Find user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ Test user not found');
      return false;
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(testPassword, user.password);
    
    if (isValidPassword) {
      console.log('✅ Authentication test passed!');
      console.log('   User can login with correct credentials');
      return true;
    } else {
      console.log('❌ Password verification failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('====================================');
  console.log('MongoDB Connection & Auth Diagnostic');
  console.log('====================================\n');
  
  // Step 1: Check MongoDB connection
  const isConnected = await checkMongoDBConnection();
  
  if (!isConnected) {
    console.log('\n⚠️ Please start MongoDB first and run this script again.');
    process.exit(1);
  }
  
  // Step 2: Check existing users
  const userCount = await checkExistingUsers();
  
  // Step 3: Create test user if needed
  if (userCount === 0) {
    console.log('\n⚠️ No users found in database. Creating test user...');
  }
  await createTestUser();
  
  // Step 4: Test authentication
  await testAuthentication();
  
  console.log('\n====================================');
  console.log('Diagnostic Complete');
  console.log('====================================');
  
  console.log('\n✅ Next steps:');
  console.log('1. Make sure MongoDB is running (use start-mongodb.bat)');
  console.log('2. Start the server: npm start (in server directory)');
  console.log('3. Try logging in with test@example.com / Test123456');
  console.log('4. The app should authenticate against MongoDB, not demo mode');
  
  // Close connection
  await mongoose.connection.close();
  console.log('\n👋 Connection closed');
}

// Run the diagnostic
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});