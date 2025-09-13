const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./models/User');
const Pickup = require('./models/Pickup');
const Training = require('./models/Training');
const WasteValidation = require('./models/WasteValidation');

async function verifyDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');
    console.log('✅ Connected to MongoDB');
    console.log('📍 Database: waste-management\n');
    
    console.log('🔍 Verifying database status...\n');
    
    // Check all collections
    const collections = [
      { model: User, name: 'Users' },
      { model: Pickup, name: 'Pickups' },
      { model: Training, name: 'Training Records' },
      { model: WasteValidation, name: 'Waste Validations' }
    ];
    
    let totalDocuments = 0;
    console.log('📊 Collection Status:');
    console.log('━'.repeat(50));
    
    for (const collection of collections) {
      const count = await collection.model.countDocuments();
      totalDocuments += count;
      const status = count === 0 ? '✅ EMPTY' : `⚠️  Contains ${count} documents`;
      console.log(`   ${collection.name.padEnd(20)} : ${status}`);
    }
    
    console.log('━'.repeat(50));
    
    if (totalDocuments === 0) {
      console.log('\n✨ SUCCESS: Database is completely clean!');
      console.log('🎯 The database is ready for production use.\n');
      console.log('📱 Users can now:');
      console.log('   • Register new accounts through the mobile app');
      console.log('   • Schedule waste pickups');
      console.log('   • Track their waste management activities');
      console.log('   • All data will be real production data\n');
      console.log('🚀 The Waste Management System is ready for deployment!');
    } else {
      console.log(`\n⚠️  WARNING: Database still contains ${totalDocuments} documents`);
      console.log('   Run cleanup-database.js to remove all data');
    }
    
    // Show database info
    console.log('\n📋 Database Information:');
    console.log(`   • URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management'}`);
    console.log(`   • Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   • Server Port: ${process.env.PORT || 3000}`);
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the verification
verifyDatabase();