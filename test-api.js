const axios = require('axios');

const testAPIConnectivity = async () => {
  const baseURL = 'http://10.0.8.184:3000/api';
  
  console.log('🔍 Testing API connectivity to:', baseURL);
  console.log('=====================================\n');

  // Test health endpoint
  console.log('1. Testing /health endpoint...');
  try {
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check passed!');
    console.log('Response:', JSON.stringify(healthResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Health check failed!');
    console.error('Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️ Connection refused - Make sure the backend server is running on port 3000');
    }
  }
  
  console.log('\n=====================================');

  // Test auth endpoint (without credentials)
  console.log('2. Testing /auth/login endpoint existence...');
  try {
    const authResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'test@example.com',
      password: 'test123'
    });
    console.log('✅ Auth endpoint is reachable!');
  } catch (error) {
    if (error.response) {
      console.log('✅ Auth endpoint is reachable!');
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    } else {
      console.error('❌ Auth endpoint unreachable!');
      console.error('Error:', error.message);
    }
  }

  console.log('\n=====================================');
  
  // Test pickups endpoint
  console.log('3. Testing /pickups endpoint...');
  try {
    const pickupsResponse = await axios.get(`${baseURL}/pickups`);
    console.log('✅ Pickups endpoint is reachable!');
    console.log('Response status:', pickupsResponse.status);
    console.log('Number of pickups:', Array.isArray(pickupsResponse.data) ? pickupsResponse.data.length : 
                 (pickupsResponse.data.data ? pickupsResponse.data.data.length : 'unknown'));
  } catch (error) {
    if (error.response) {
      console.log('✅ Pickups endpoint is reachable!');
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    } else {
      console.error('❌ Pickups endpoint unreachable!');
      console.error('Error:', error.message);
    }
  }

  console.log('\n=====================================');
  console.log('📊 Test Summary:');
  console.log('Base URL:', baseURL);
  console.log('Server Status: Check the results above');
  console.log('\n💡 If all tests passed, the API is working correctly.');
  console.log('💡 If tests failed, make sure:');
  console.log('   1. The backend server is running (npm run dev in server directory)');
  console.log('   2. MongoDB is running (if required)');
  console.log('   3. The IP address is correct (current: 10.0.8.184)');
  console.log('   4. Port 3000 is not blocked by firewall');
};

// Run the test
testAPIConnectivity().catch(console.error);