// Socket Connection Test Utility
// This script tests various connection methods to help diagnose socket issues

const io = require('socket.io-client');

const testUrls = [
  'http://10.0.8.184:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

console.log('🔍 Testing Socket.IO connections...\n');

testUrls.forEach((url, index) => {
  console.log(`\n📡 Attempting connection ${index + 1}: ${url}`);
  
  const socket = io(url, {
    timeout: 5000,
    transports: ['websocket', 'polling'],
  });
  
  let connected = false;
  
  socket.on('connect', () => {
    connected = true;
    console.log(`✅ Successfully connected to ${url}`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   Transport: ${socket.io.engine.transport.name}`);
    
    // Test joining a room
    socket.emit('join-worker-room', 'test-worker-123');
    
    // Close after successful test
    setTimeout(() => {
      socket.disconnect();
      console.log(`   Disconnected from ${url}`);
    }, 1000);
  });
  
  socket.on('connect_error', (error) => {
    console.log(`❌ Failed to connect to ${url}`);
    console.log(`   Error: ${error.message}`);
  });
  
  // Timeout handler
  setTimeout(() => {
    if (!connected) {
      console.log(`⏱️  Connection timeout for ${url}`);
      socket.disconnect();
    }
  }, 6000);
});

// Test HTTP endpoints as well
const http = require('http');

console.log('\n\n🔍 Testing HTTP API endpoints...\n');

testUrls.forEach(url => {
  const apiUrl = `${url}/api/health`;
  console.log(`📡 Testing: ${apiUrl}`);
  
  http.get(apiUrl, { timeout: 5000 }, (res) => {
    let data = '';
    
    res.on('data', chunk => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.status === 'healthy' || response.success) {
          console.log(`✅ API is healthy at ${url}`);
        } else {
          console.log(`⚠️  API responded but may have issues at ${url}`);
        }
      } catch (e) {
        console.log(`❌ Invalid response from ${url}`);
      }
    });
  }).on('error', (err) => {
    console.log(`❌ Failed to reach ${apiUrl}: ${err.message}`);
  });
});

console.log('\n\n💡 Tips for fixing connection issues:');
console.log('1. Ensure server is running: node server/index.js');
console.log('2. Check Windows Firewall allows Node.js');
console.log('3. Verify your IP address: ipconfig');
console.log('4. Make sure MongoDB is running if needed');
console.log('5. Check if ports 3000 is not blocked');