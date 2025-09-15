const axios = require('axios');

// Test data matching the form fields exactly
const testOfficeData = {
  office: {
    officeName: "SS",
    address: {
      street: "azad chowk",
      area: "21",  // Area/Locality field
      city: "raipur",
      state: "chattisgarh",
      pincode: "492001"
    },
    location: {
      latitude: 21.2785,
      longitude: 81.6866
    }
  }
  // Note: No operator data required for simplified registration
};

async function testRegistration() {
  try {
    console.log('🚀 Testing simplified office registration...\n');
    console.log('📝 Sending registration data:');
    console.log(JSON.stringify(testOfficeData, null, 2));
    
    const response = await axios.post(
      'http://localhost:3000/api/dashboard/register-office',
      testOfficeData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ Registration successful!');
    console.log('\n📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.office.officeCode) {
      console.log(`\n🔑 Auto-generated Office Code: ${response.data.office.officeCode}`);
    }
    
  } catch (error) {
    console.error('\n❌ Registration failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testRegistration();