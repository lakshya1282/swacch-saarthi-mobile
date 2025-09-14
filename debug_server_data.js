// Debug script to check what pickups are in the server
// Run this with: node debug_server_data.js

const axios = require('axios');

async function checkServerData() {
  try {
    console.log('Checking server data...\n');
    
    // Check if server is running
    try {
      const response = await axios.get('http://localhost:3000/api/pickups/schedules');
      console.log('✅ Server is running on port 3000');
      
      if (response.data.success) {
        const pickups = response.data.data;
        console.log(`\n📦 Found ${pickups.length} pickups in server:\n`);
        
        pickups.forEach((pickup, index) => {
          console.log(`${index + 1}. Pickup ID: ${pickup.pickupId}`);
          console.log(`   Status: ${pickup.status}`);
          console.log(`   Customer: ${pickup.customerName}`);
          console.log(`   Waste Types: ${pickup.wasteTypes?.join(', ') || 'N/A'}`);
          console.log(`   Created: ${pickup.createdAt}`);
          console.log('');
        });
        
        // Check if our specific pickup ID exists
        const targetId = 'PUMFE750QN1001';
        const found = pickups.find(p => p.pickupId === targetId);
        
        if (found) {
          console.log(`✅ Found target pickup ID: ${targetId}`);
        } else {
          console.log(`❌ Target pickup ID not found: ${targetId}`);
          console.log(`\nAvailable IDs:`);
          pickups.forEach(p => console.log(`   - ${p.pickupId}`));
        }
        
      } else {
        console.log('❌ Server responded but with error:', response.data.message);
      }
      
    } catch (serverError) {
      if (serverError.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running on port 3000');
        console.log('   Start the server with: cd server && npm start');
      } else {
        console.log('❌ Error connecting to server:', serverError.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Also create some test pickups
async function createTestPickup() {
  try {
    console.log('\n🧪 Creating test pickup...');
    
    const testPickup = {
      userId: 'TEST_USER',
      wasteTypes: ['Dry Waste'],
      estimatedWeight: '3 kg',
      timeSlot: '10:00 AM - 2:00 PM',
      specialInstructions: 'Test pickup for debugging',
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      },
      scheduledDate: new Date().toISOString().split('T')[0]
    };
    
    // Would need authentication token for this to work
    // const response = await axios.post('http://localhost:3001/api/pickups/schedule', testPickup);
    
    console.log('Test pickup data prepared:', testPickup);
    console.log('Note: Actual creation requires authentication token');
    
  } catch (error) {
    console.log('Error creating test pickup:', error.message);
  }
}

// Run the checks
checkServerData().then(() => {
  createTestPickup();
});
