const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/waste-management');
    console.log('Connected to MongoDB');
    
    const users = await User.find({}).select('firstName lastName email userType');
    
    console.log('\n=== Users in database ===');
    console.log('Total users:', users.length);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Type: ${user.userType}`);
      console.log(`   ID: ${user._id}`);
      console.log('---');
    });
    
    console.log('\n=== User Types Summary ===');
    const userTypes = users.reduce((acc, user) => {
      acc[user.userType] = (acc[user.userType] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(userTypes).forEach(([type, count]) => {
      console.log(`${type}: ${count} users`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();