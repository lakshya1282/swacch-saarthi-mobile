const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management';

console.log('MongoDB URI:', MONGODB_URI.substring(0, 30) + '...');

async function createAdminUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin1@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Admin Details:', {
        id: existingAdmin._id,
        email: existingAdmin.email,
        name: `${existingAdmin.firstName} ${existingAdmin.lastName}`,
        userType: existingAdmin.userType,
        isActive: existingAdmin.isActive
      });
      
      // Update password if needed
      const hashedPassword = await bcrypt.hash('123456', 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.userType = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Admin password updated to: 123456');
      
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin1@gmail.com',
      password: hashedPassword,
      phone: '9000000001', // Valid format for Indian mobile - unique for admin
      userType: 'admin',
      isActive: true,
      address: 'Admin Office, City Center',
      pincode: '110001', // Valid Indian pincode format
      location: {
        latitude: 28.6139, // Delhi coordinates
        longitude: 77.2090
      },
      isVerified: true
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    admin1@gmail.com');
    console.log('Password: 123456');
    console.log('User ID:  ' + adminUser._id);
    console.log('Type:     ' + adminUser.userType);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser();
