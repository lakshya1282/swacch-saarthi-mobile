/**
 * Demo QR Code Generator for Testing
 * Generates downloadable QR code images for testing the upload functionality
 */

export class DemoQRGenerator {
  /**
   * Create a downloadable QR code image for testing
   * @param {string} assignmentId - Assignment ID
   * @param {string} verificationCode - Verification code to embed
   */
  static downloadQRImage(assignmentId, verificationCode = null) {
    const code = verificationCode || `DEMO${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Create canvas for QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 300;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 300, 300);
    
    // Create QR pattern (simplified simulation)
    ctx.fillStyle = 'black';
    
    // Border
    ctx.fillRect(20, 20, 260, 20); // Top
    ctx.fillRect(20, 260, 260, 20); // Bottom  
    ctx.fillRect(20, 20, 20, 260); // Left
    ctx.fillRect(260, 20, 20, 260); // Right
    
    // Corner squares (QR code positioning markers)
    this.drawCornerSquare(ctx, 40, 40);
    this.drawCornerSquare(ctx, 220, 40);
    this.drawCornerSquare(ctx, 40, 220);
    
    // Random pattern for QR data
    for (let x = 80; x < 220; x += 12) {
      for (let y = 80; y < 220; y += 12) {
        if (Math.random() > 0.4) {
          ctx.fillRect(x, y, 10, 10);
        }
      }
    }
    
    // Add text information
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PICKUP QR CODE', 150, 290);
    ctx.fillText(code, 150, 15);
    
    // Create download link
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${assignmentId}-${code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Downloaded QR code: ${code} for assignment: ${assignmentId}`);
    }, 'image/png');
    
    return code;
  }
  
  /**
   * Draw QR code corner positioning squares
   */
  static drawCornerSquare(ctx, x, y) {
    ctx.fillStyle = 'black';
    // Outer square
    ctx.fillRect(x, y, 30, 30);
    // Inner white square
    ctx.fillStyle = 'white';
    ctx.fillRect(x + 6, y + 6, 18, 18);
    // Inner black square
    ctx.fillStyle = 'black';
    ctx.fillRect(x + 12, y + 12, 6, 6);
  }
  
  /**
   * Generate QR data in JSON format
   */
  static generateQRData(assignmentId, verificationCode = null) {
    const code = verificationCode || `DEMO${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    return JSON.stringify({
      pickupId: assignmentId,
      verificationCode: code,
      timestamp: new Date().toISOString(),
      customerName: 'Demo Customer',
      address: 'Demo Address'
    });
  }
  
  /**
   * Create a test QR image with specific text content
   */
  static createTestQRImageBlob(content) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 200;
      canvas.height = 200;
      
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 200);
      
      // Simple QR pattern
      ctx.fillStyle = 'black';
      for (let x = 20; x < 180; x += 15) {
        for (let y = 20; y < 180; y += 15) {
          if (Math.random() > 0.5) {
            ctx.fillRect(x, y, 12, 12);
          }
        }
      }
      
      // Add border
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, 180, 180);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }
}

export default DemoQRGenerator;
