const axios = require('axios');

const API_BASE_URL = 'http://192.168.29.93:3000/api';
const OFFICE_CODE = 'RAI397490';
const WORKER_ID = '68c852550f08db6128d5adc2'; // The worker ID from the mobile app logs

async function testEnrollment() {
  console.log('Testing Office Enrollment Flow');
  console.log('================================\n');

  try {
    // Step 1: Verify office code
    console.log('Step 1: Verifying office code...');
    const verifyResponse = await axios.post(`${API_BASE_URL}/worker/verify-office-code`, {
      officeCode: OFFICE_CODE
    });
    
    if (verifyResponse.data.success) {
      console.log('✅ Office code verified successfully!');
      console.log('Office Name:', verifyResponse.data.office.officeName);
      console.log('Office Code:', verifyResponse.data.office.officeCode);
      console.log('Office Address:', verifyResponse.data.office.address);
      console.log('\n');
    } else {
      console.log('❌ Office code verification failed');
      return;
    }

    // Step 2: Check current enrollment status
    console.log('Step 2: Checking current enrollment status...');
    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/worker/enrollment-status/${WORKER_ID}`);
      console.log('Current enrollment status:', statusResponse.data.enrollment?.status || 'not_enrolled');
      
      if (statusResponse.data.enrollment?.status === 'enrolled' && 
          statusResponse.data.enrollment?.officeCode === OFFICE_CODE) {
        console.log('⚠️ Worker is already enrolled in this office');
        return;
      }
    } catch (error) {
      console.log('Worker not enrolled yet (this is expected for new enrollments)');
    }
    console.log('\n');

    // Step 3: Enroll in office
    console.log('Step 3: Enrolling worker in office...');
    const enrollResponse = await axios.post(`${API_BASE_URL}/worker/enroll-in-office`, {
      workerId: WORKER_ID,
      officeCode: OFFICE_CODE
    });
    
    if (enrollResponse.data.success) {
      console.log('✅ Enrollment successful!');
      console.log('Message:', enrollResponse.data.message);
      console.log('Enrollment Details:', enrollResponse.data.enrollment);
    } else {
      console.log('❌ Enrollment failed');
      console.log('Error:', enrollResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error during enrollment test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message || error.response.statusText);
      console.error('Full response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testEnrollment();