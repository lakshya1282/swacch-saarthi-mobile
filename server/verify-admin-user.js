const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management';

async function verifyAdminUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find admin user
    const admin = await User.findOne({ email: 'admin1@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('Run: node server/create-admin-user.js to create the admin user');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ Admin user found!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:          ${admin._id}`);
    console.log(`Email:       ${admin.email}`);
    console.log(`Name:        ${admin.firstName} ${admin.lastName}`);
    console.log(`Phone:       ${admin.phone}`);
    console.log(`User Type:   ${admin.userType}`);
    console.log(`Is Active:   ${admin.isActive}`);
    console.log(`Is Verified: ${admin.isVerified}`);
    console.log(`Created:     ${admin.createdAt}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (admin.userType !== 'admin') {
      console.log('⚠️  WARNING: User type is not "admin"!');
      console.log('Updating user type to "admin"...');
      admin.userType = 'admin';
      await admin.save();
      console.log('✅ User type updated to "admin"\n');
    }

    console.log('🎉 Admin user is correctly configured!');
    console.log('\n📱 Login Credentials:');
    console.log('   Email:    admin1@gmail.com');
    console.log('   Password: 123456');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAdminUser();
