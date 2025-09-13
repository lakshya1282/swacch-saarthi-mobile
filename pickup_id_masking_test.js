// Test script for Pickup ID masking functionality
// This script tests the maskPickupId function used in worker components

function maskPickupId(pickupId) {
  if (!pickupId) return '';
  const idString = String(pickupId);
  if (idString.length <= 5) return idString;
  return `****${idString.slice(-5)}`;
}

// Test cases
const testCases = [
  { input: 'PUMFE750QN1001', expected: '****N1001' },
  { input: 'PU-0112-2001', expected: '*****2001' },
  { input: 'PU17337891234561', expected: '****34561' },
  { input: '12345', expected: '12345' }, // Short ID, no masking
  { input: '123', expected: '123' },     // Very short ID, no masking
  { input: '', expected: '' },           // Empty input
  { input: null, expected: '' },         // Null input
  { input: undefined, expected: '' },    // Undefined input
];

console.log('Testing Pickup ID Masking Function');
console.log('=====================================');

testCases.forEach((testCase, index) => {
  const result = maskPickupId(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log('');
});

// Example worker view simulation
console.log('Worker Dashboard View Examples:');
console.log('==============================');
console.log(`Original ID: PUMFE750QN1001 → Worker sees: ${maskPickupId('PUMFE750QN1001')}`);
console.log(`Original ID: PU-0112-2001 → Worker sees: ${maskPickupId('PU-0112-2001')}`);
console.log(`Original ID: PU17337891234561 → Worker sees: ${maskPickupId('PU17337891234561')}`);
