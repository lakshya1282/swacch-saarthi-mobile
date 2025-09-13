const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function resetTestPasswords() {
  try {
    await mongoose.connect('mongodb://localhost:27017/waste-management');
    console.log('Connected to MongoDB');

    const testPassword = 'test123'; // Common test password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(testPassword, saltRounds);

    const accounts = [
      'lakshyapratap5911@gmail.com',
      'lakshyaparmar1282@gmail.com',
      'leezakhiyani13@gmail.com'
    ];

    console.log(`🔑 Setting password to '${testPassword}' for all test accounts:\n`);

    for (const email of accounts) {
      const user = await User.findOneAndUpdate(
        { email },
        { 
          password: hashedPassword,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (user) {
        console.log(`✅ Password updated for ${user.firstName} ${user.lastName} (${email}) - ${user.userType}`);
      } else {
        console.log(`❌ User not found: ${email}`);
      }
    }

    console.log(`\n🎉 All passwords have been set to: ${testPassword}`);
    console.log('You can now test login with any of these accounts using this password.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetTestPasswords();