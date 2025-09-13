/**
 * Test QR Code Generator
 * Provides utilities to generate valid QR codes for testing the waste management app
 */

export class TestQRGenerator {
  /**
   * Generate a valid QR code data for a specific pickup ID
   * @param {string} pickupId - The pickup ID (e.g., 'PU-0112-2001')
   * @returns {string} - JSON string representing valid QR data
   */
  static generateValidQR(pickupId) {
    const qrData = {
      pickupId: pickupId,
      verificationCode: `VRF${pickupId.split('-')[2] || '001'}${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      customerName: "Test Customer",
      address: "Test Address",
      source: 'test_generator'
    };
    
    return JSON.stringify(qrData);
  }
  
  /**
   * Generate a valid structured QR code (PICKUP:ID:CODE format)
   * @param {string} pickupId - The pickup ID
   * @returns {string} - Structured QR code string
   */
  static generateStructuredQR(pickupId) {
    const verificationCode = `VRF${pickupId.split('-')[2] || '001'}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    return `PICKUP:${pickupId}:${verificationCode}`;
  }
  
  /**
   * Generate an invalid QR code for testing rejection
   * @returns {string} - Invalid QR code data
   */
  static generateInvalidQR() {
    const invalidFormats = [
      "Just some random text",
      "12345",
      "INVALID:FORMAT",
      JSON.stringify({ pickupId: "PU-0000-0000" }), // Missing verification code
      JSON.stringify({ verificationCode: "ABC123" }), // Missing pickup ID
      "PICKUP:PU-0000-0000", // Missing verification code
      "PICKUP::INVALID", // Empty pickup ID
    ];
    
    return invalidFormats[Math.floor(Math.random() * invalidFormats.length)];
  }
  
  /**
   * Generate QR for wrong pickup ID (should fail validation)
   * @param {string} correctPickupId - The correct pickup ID
   * @returns {string} - QR with wrong pickup ID
   */
  static generateWrongPickupQR(correctPickupId) {
    // Generate a different pickup ID
    const wrongId = `PU-0112-${Math.floor(Math.random() * 9000) + 1000}`;
    return this.generateValidQR(wrongId);
  }
  
  /**
   * Create test QR codes for all active assignments
   * @param {Array} assignments - Array of pickup assignments
   * @returns {Object} - Map of assignment IDs to QR codes
   */
  static generateTestQRMap(assignments) {
    const qrMap = {};
    
    assignments.forEach(assignment => {
      if (assignment.pickupId) {
        qrMap[assignment.pickupId] = {
          valid: this.generateValidQR(assignment.pickupId),
          structured: this.generateStructuredQR(assignment.pickupId),
          invalid: this.generateInvalidQR(),
          wrong: this.generateWrongPickupQR(assignment.pickupId)
        };
      }
    });
    
    return qrMap;
  }
  
  /**
   * Create a visual QR code representation (for display purposes)
   * @param {string} pickupId - The pickup ID
   * @returns {string} - Data URL for a simple QR-like image
   */
  static createVisualQR(pickupId) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 240;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 200, 240);
    
    // Black border
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 200, 20);
    ctx.fillRect(0, 180, 200, 20);
    ctx.fillRect(0, 0, 20, 200);
    ctx.fillRect(180, 0, 20, 200);
    
    // QR pattern (simplified grid)
    ctx.fillStyle = 'black';
    for (let x = 30; x < 170; x += 15) {
      for (let y = 30; y < 170; y += 15) {
        // Create a pattern based on pickup ID
        const hash = this.simpleHash(pickupId + x + y);
        if (hash % 2 === 0) {
          ctx.fillRect(x, y, 12, 12);
        }
      }
    }
    
    // Add text labels
    ctx.fillStyle = 'black';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Valid Test QR', 100, 215);
    
    ctx.font = '10px Arial';
    ctx.fillText(`Pickup: ${pickupId}`, 100, 230);
    
    return canvas.toDataURL('image/png');
  }
  
  /**
   * Simple hash function for pattern generation
   * @param {string} str - Input string
   * @returns {number} - Hash value
   */
  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Create a downloadable QR image file
   * @param {string} pickupId - The pickup ID
   * @param {string} filename - Optional filename
   */
  static downloadTestQR(pickupId, filename = null) {
    const dataUrl = this.createVisualQR(pickupId);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || `test-qr-${pickupId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default TestQRGenerator;
