const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/waste-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Delete from Worker collection
    const Worker = require('./models/Worker');
    const workerResult = await Worker.deleteMany({});
    console.log(`✅ Deleted ${workerResult.deletedCount} records from Worker collection`);
    
    // Also delete workers from User collection (userType = 'worker')
    const User = require('./models/User');
    const userResult = await User.deleteMany({ userType: 'worker' });
    console.log(`✅ Deleted ${userResult.deletedCount} worker records from User collection`);
    
    console.log('\n🎯 All worker data has been cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error deleting worker records:', error);
    process.exit(1);
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});