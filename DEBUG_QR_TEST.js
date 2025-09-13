// DEBUG QR CODE GENERATOR - Run this in browser console
// This creates a simple test QR code that you can download and use for testing

function generateTestQR(orderID = 'PU-1012-2001') {
    // Create the QR data
    const qrData = {
        pickupId: orderID,
        verificationCode: `TEST${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        customerName: "Test Customer",
        address: `Test Address for ${orderID}`
    };

    console.log('Generated QR Data:', qrData);

    // Create a simple visual QR representation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 350;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 300, 350);

    // Border
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 290, 290);

    // Simple QR pattern
    ctx.fillStyle = 'black';
    
    // Corner markers
    function drawCorner(x, y) {
        ctx.fillRect(x, y, 40, 40);
        ctx.fillStyle = 'white';
        ctx.fillRect(x + 8, y + 8, 24, 24);
        ctx.fillStyle = 'black';
        ctx.fillRect(x + 16, y + 16, 8, 8);
    }

    drawCorner(20, 20);
    drawCorner(240, 20);
    drawCorner(20, 240);

    // Random data pattern
    for (let x = 80; x < 220; x += 12) {
        for (let y = 80; y < 220; y += 12) {
            if (Math.random() > 0.5) {
                ctx.fillRect(x, y, 10, 10);
            }
        }
    }

    // Add text labels
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST QR CODE', 150, 320);
    
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.fillText(orderID, 150, 340);

    // Add data as text (this is what would be in a real QR code)
    const jsonData = JSON.stringify(qrData);
    
    console.log('QR Code contains this data:');
    console.log(jsonData);

    // Create download link
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `test-qr-${orderID.toLowerCase()}.png`;
        
        // Auto-download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log(`✅ Downloaded test QR code: test-qr-${orderID.toLowerCase()}.png`);
        console.log('📱 Upload this image in the worker app to test!');
    });

    return qrData;
}

// Quick test functions
function testValidQR() {
    return generateTestQR('PU-1012-2001');
}

function testInvalidQR() {
    return generateTestQR('WRONG-123');
}

// Instructions
console.log(`
🔍 QR CODE DEBUG HELPER LOADED

Use these functions in the browser console:

1. generateTestQR('PU-1012-2001') - Generate QR for specific order
2. testValidQR() - Generate QR for existing demo order
3. testInvalidQR() - Generate QR with wrong order ID

Each function will:
- Create a visual QR code image
- Download it automatically 
- Log the QR data to console
- Provide testing instructions

Example:
> testValidQR()
> // Downloads test-qr-pu-1012-2001.png
> // Upload this in the worker app!
`);

// Auto-generate one test QR code
setTimeout(() => {
    console.log('🚀 Auto-generating test QR code for PU-1012-2001...');
    testValidQR();
}, 1000);
