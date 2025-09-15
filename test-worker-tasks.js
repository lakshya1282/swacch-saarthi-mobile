// Test script for worker-specific tasks endpoint
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test worker IDs (adjust these based on your actual data)
const TEST_WORKER_ID = '68c6688b54e9418d99508601'; // Dhairya Parmar
const TEST_WORKER_ID_2 = '68c668e354e9418d99508605'; // Leeza Khiyani

async function testWorkerTasksEndpoint() {
  console.log('🧪 Testing Worker-Specific Tasks Endpoint\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Get tasks for first worker
    console.log('\n📋 Test 1: Fetching tasks for Worker ID:', TEST_WORKER_ID);
    console.log('-'.repeat(50));
    
    const response1 = await axios.get(`${API_BASE}/pickups/worker/${TEST_WORKER_ID}/tasks`);
    
    if (response1.data.success) {
      console.log('✅ Success! Retrieved tasks for worker');
      console.log(`📊 Total tasks: ${response1.data.data.length}`);
      
      if (response1.data.stats) {
        console.log('\n📈 Statistics:');
        console.log(`  - Total: ${response1.data.stats.total}`);
        console.log(`  - Assigned: ${response1.data.stats.assigned}`);
        console.log(`  - In Progress: ${response1.data.stats.inProgress}`);
        console.log(`  - Completed: ${response1.data.stats.completed}`);
        console.log(`  - Today's Tasks: ${response1.data.stats.todayTasks}`);
      }
      
      if (response1.data.data.length > 0) {
        console.log('\n📦 Sample Tasks:');
        response1.data.data.slice(0, 3).forEach((task, index) => {
          console.log(`\n  Task ${index + 1}:`);
          console.log(`    - Pickup ID: ${task.pickupId}`);
          console.log(`    - Status: ${task.statusLabel} (${task.status})`);
          console.log(`    - Customer: ${task.customerName}`);
          console.log(`    - Address: ${task.customerAddress}`);
          console.log(`    - Created: ${task.timeAgo}`);
          if (task.assignedTimeAgo) {
            console.log(`    - Assigned: ${task.assignedTimeAgo}`);
          }
        });
      } else {
        console.log('ℹ️ No tasks found for this worker');
      }
    } else {
      console.log('❌ Failed to retrieve tasks:', response1.data.message);
    }
    
    // Test 2: Get tasks for second worker
    console.log('\n\n📋 Test 2: Fetching tasks for Worker ID:', TEST_WORKER_ID_2);
    console.log('-'.repeat(50));
    
    const response2 = await axios.get(`${API_BASE}/pickups/worker/${TEST_WORKER_ID_2}/tasks`);
    
    if (response2.data.success) {
      console.log('✅ Success! Retrieved tasks for second worker');
      console.log(`📊 Total tasks: ${response2.data.data.length}`);
      
      // Check that tasks are properly filtered
      const hasScheduledTasks = response2.data.data.some(task => task.status === 'scheduled');
      if (hasScheduledTasks) {
        console.log('⚠️ WARNING: Found "scheduled" (available) tasks - these should be excluded!');
      } else {
        console.log('✅ Correctly excluding "scheduled" (available) tasks');
      }
    }
    
    // Test 3: Test with invalid worker ID
    console.log('\n\n📋 Test 3: Testing with non-existent worker ID');
    console.log('-'.repeat(50));
    
    const response3 = await axios.get(`${API_BASE}/pickups/worker/INVALID_WORKER_ID/tasks`);
    
    if (response3.data.success) {
      console.log(`ℹ️ Response received - Found ${response3.data.data.length} tasks`);
      if (response3.data.data.length === 0) {
        console.log('✅ Correctly returns empty array for non-existent worker');
      }
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data.message || error.response.statusText);
      console.error('   Status:', error.response.status);
    } else if (error.request) {
      console.error('❌ No response from server. Is the server running?');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test completed!\n');
}

// Run the test
testWorkerTasksEndpoint();