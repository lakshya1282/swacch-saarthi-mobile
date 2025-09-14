const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLogin() {
  const baseUrl = 'http://localhost:3000/api';
  
  console.log('🧪 Testing API Login Functionality\n');
  
  // Test cases
  const testAccounts = [
    { email: 'lakshyapratap5911@gmail.com', userType: 'worker', description: 'Worker Account 1', password: 'test123' },
    { email: 'lakshyaparmar1282@gmail.com', userType: 'citizen', description: 'Citizen Account', password: 'test123' },
    { email: 'leezakhiyani13@gmail.com', userType: 'worker', description: 'Worker Account 2 (except)', password: 'test123' },
  ];
  
  for (const account of testAccounts) {
    console.log(`Testing ${account.description}: ${account.email}`);
    
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: account.email,
          password: account.password,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`✅ Login successful for ${account.email}`);
        console.log(`   User Type: ${result.user.userType}`);
        console.log(`   User Name: ${result.user.firstName} ${result.user.lastName}`);
        console.log(`   Demo Mode: ${result.demoMode || false}`);
      } else {
        console.log(`❌ Login failed for ${account.email}`);
        console.log(`   Error: ${result.message}`);
      }
    } catch (error) {
      console.log(`💥 Network error for ${account.email}: ${error.message}`);
    }
    
    console.log('---');
  }
  
  // Test health endpoint
  console.log('\n🏥 Testing Health Endpoint');
  try {
    const response = await fetch(`${baseUrl}/health`);
    const result = await response.json();
    console.log('Health Status:', result);
  } catch (error) {
    console.log('Health check failed:', error.message);
  }
}

testLogin();