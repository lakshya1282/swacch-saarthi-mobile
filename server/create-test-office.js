const mongoose = require('mongoose');
const Office = require('./models/Office');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management')
  .then(() => {
    console.log('Connected to MongoDB');
    createTestOffice();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function createTestOffice() {
  try {
    // Check if test office already exists
    const existingOffice = await Office.findOne({ officeCode: 'TEST001' });
    
    if (existingOffice) {
      console.log('✅ Test office already exists:');
      console.log(`   Office Name: ${existingOffice.officeName}`);
      console.log(`   Office Code: ${existingOffice.officeCode}`);
      console.log(`   Address: ${existingOffice.address.street}, ${existingOffice.address.city}`);
      console.log('\n🔑 Use office code "TEST001" for enrollment testing');
      process.exit(0);
    }

    // Create a test office
    const testOffice = new Office({
      officeName: 'Test Zone Office - Bangalore Central',
      officeCode: 'TEST001', // Manual code for testing
      address: {
        street: '123 MG Road, Test Building',
        area: 'Central Business District',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001'
      },
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      coverageArea: {
        radius: 15,
        zones: ['Central Bangalore', 'MG Road Area', 'Brigade Road']
      },
      contactInfo: {
        phone: '8012345678',
        email: 'test.office@wastmgmt.com',
        website: 'https://bangalore-waste.gov.in'
      },
      operationalHours: {
        startTime: '08:00',
        endTime: '18:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      status: 'active'
    });

    await testOffice.save();
    
    console.log('✅ Test office created successfully!');
    console.log('📍 Office Details:');
    console.log(`   Office Name: ${testOffice.officeName}`);
    console.log(`   Office Code: ${testOffice.officeCode}`);
    console.log(`   Address: ${testOffice.address.street}, ${testOffice.address.city}`);
    console.log(`   Contact: ${testOffice.contactInfo.phone}`);
    console.log(`   Working Hours: ${testOffice.operationalHours.startTime} - ${testOffice.operationalHours.endTime}`);
    console.log('\n🔑 Workers can now use office code "TEST001" to enroll');
    console.log('💡 You can create additional offices with different codes as needed');
    
  } catch (error) {
    console.error('❌ Error creating test office:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}