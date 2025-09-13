const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./models/User');
const Pickup = require('./models/Pickup');
const Training = require('./models/Training');
const WasteValidation = require('./models/WasteValidation');

async function cleanupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧹 Starting database cleanup...\n');
    
    // Count documents before cleanup
    const userCount = await User.countDocuments();
    const pickupCount = await Pickup.countDocuments();
    const trainingCount = await Training.countDocuments();
    const validationCount = await WasteValidation.countDocuments();
    
    console.log('📊 Current database status:');
    console.log(`   - Users: ${userCount} documents`);
    console.log(`   - Pickups: ${pickupCount} documents`);
    console.log(`   - Training: ${trainingCount} documents`);
    console.log(`   - WasteValidations: ${validationCount} documents`);
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will delete ALL data from the database!');
    console.log('    This includes all users, pickups, training records, and validations.');
    console.log('    This action cannot be undone!\n');
    
    // For safety, we'll add a 3-second delay
    console.log('🕐 Proceeding with cleanup in 3 seconds... (Press Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Remove all test/sample users
    console.log('\n🗑️  Removing all users...');
    const deletedUsers = await User.deleteMany({});
    console.log(`   ✅ Removed ${deletedUsers.deletedCount} users`);
    
    // Remove all pickups
    console.log('🗑️  Removing all pickups...');
    const deletedPickups = await Pickup.deleteMany({});
    console.log(`   ✅ Removed ${deletedPickups.deletedCount} pickups`);
    
    // Remove all training records
    console.log('🗑️  Removing all training records...');
    const deletedTraining = await Training.deleteMany({});
    console.log(`   ✅ Removed ${deletedTraining.deletedCount} training records`);
    
    // Remove all waste validations
    console.log('🗑️  Removing all waste validations...');
    const deletedValidations = await WasteValidation.deleteMany({});
    console.log(`   ✅ Removed ${deletedValidations.deletedCount} waste validations`);
    
    // Verify cleanup
    console.log('\n📊 Verifying cleanup...');
    const finalUserCount = await User.countDocuments();
    const finalPickupCount = await Pickup.countDocuments();
    const finalTrainingCount = await Training.countDocuments();
    const finalValidationCount = await WasteValidation.countDocuments();
    
    console.log('✅ Database cleanup complete!');
    console.log('\n📊 Final database status:');
    console.log(`   - Users: ${finalUserCount} documents`);
    console.log(`   - Pickups: ${finalPickupCount} documents`);
    console.log(`   - Training: ${finalTrainingCount} documents`);
    console.log(`   - WasteValidations: ${finalValidationCount} documents`);
    
    console.log('\n✨ Database is now clean and ready for production data!');
    console.log('📝 Next steps:');
    console.log('   1. Users can register through the mobile app or web interface');
    console.log('   2. All data will be real-time production data');
    console.log('   3. The system is ready for actual waste management operations');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupDatabase();