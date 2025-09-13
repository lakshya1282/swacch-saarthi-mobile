const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createMissingUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/waste-management');
    console.log('Connected to MongoDB');

    // Check if the user already exists
    const existingUser = await User.findOne({ email: 'leezakhiyani13@gmail.com' });
    if (existingUser) {
      console.log('User leezakhiyani13@gmail.com already exists:', {
        name: existingUser.firstName + ' ' + existingUser.lastName,
        userType: existingUser.userType
      });
      process.exit(0);
    }

    // Hash password
    const password = 'password123'; // Default password - user should change this
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the third user as a worker
    const newUser = new User({
      firstName: 'Leeza',
      lastName: 'Khiyani',
      email: 'leezakhiyani13@gmail.com',
      phone: '9876543210', // Make sure this doesn't conflict
      password: hashedPassword,
      address: 'Demo Address, City, State',
      pincode: '123456',
      userType: 'worker', // Making this a worker as mentioned
      location: {
        latitude: 20.5937,
        longitude: 78.9629
      },
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    });

    await newUser.save();
    console.log('✅ User created successfully!');
    console.log('- Name:', newUser.firstName, newUser.lastName);
    console.log('- Email:', newUser.email);
    console.log('- Type:', newUser.userType);
    console.log('- Default password:', password);
    console.log('\n⚠️ Remember to change the default password after first login!');

    // Check updated user count
    const totalUsers = await User.countDocuments();
    console.log('\nTotal users in database:', totalUsers);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createMissingUser();