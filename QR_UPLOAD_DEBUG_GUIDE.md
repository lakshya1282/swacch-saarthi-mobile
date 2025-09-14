# 🔍 QR Upload Debug Guide

## Current Issue
The QR upload functionality is showing "Failed to scan QR code" error. Let's debug this step by step.

## 🚀 Quick Debug Steps

### Step 1: Check Console Logs
1. **Open browser dev tools** (F12)
2. **Go to Console tab**
3. **Try uploading a QR image**
4. **Look for these debug messages**:
   - "File upload started"
   - "File selected: {name, type, size}"
   - "Processing QR from file..."
   - "QR processing successful! Raw data: ..."

### Step 2: Generate Test QR Code
1. **Copy contents of DEBUG_QR_TEST.js**
2. **Paste into browser console**
3. **Run**: `testValidQR()` 
4. **This will download a test QR image**
5. **Try uploading this image**

### Step 3: Check qr-scanner Library
The issue might be that the `qr-scanner` library isn't working properly. Let's test it:

1. **In browser console, run**:
```javascript
// Test if qr-scanner is loaded
console.log('QR Scanner available:', typeof QrScanner !== 'undefined');

// If it's not available, the library isn't loaded properly
```

### Step 4: Check Network/Import Issues
1. **Check Network tab** for failed imports
2. **Look for qr-scanner related 404 errors**
3. **Verify the library is properly installed**

## 🛠️ Potential Fixes

### Fix 1: Check qr-scanner Installation
```bash
npm list qr-scanner
# Should show: qr-scanner@1.x.x

# If not installed properly:
npm install qr-scanner --save
```

### Fix 2: Alternative QR Processing (Fallback)
If qr-scanner isn't working, we can add a fallback method:

```javascript
// In QRProcessor.processQRFromFile(), add fallback:
try {
  // Try qr-scanner first
  const qrResult = await QrScanner.scanImage(imageUrl, {...});
  return qrResult.data;
} catch (scanError) {
  // Fallback: Ask user to manually enter QR data
  throw new Error('Could not automatically read QR code. Please use manual entry.');
}
```

### Fix 3: Simplify for Testing
For immediate testing, we can bypass QR processing:

```javascript
// Temporary test mode in handleFileUpload:
if (file.name.includes('test')) {
  // Mock QR data for testing
  const mockQRData = JSON.stringify({
    pickupId: 'PU-1012-2001',
    verificationCode: 'TEST123ABC',
    timestamp: new Date().toISOString()
  });
  
  setQrDataForVerification(mockQRData);
  setQrSourceForVerification('uploaded_image');
  setShowVerificationWindow(true);
  return;
}
```

## 🧪 Testing Scenarios

### Test 1: Basic File Upload
1. **Upload any image file**
2. **Check console for**: "File selected: {name, type, size}"
3. **Verify file validation works**

### Test 2: QR Library Test
1. **Create a real QR code** using online generator
2. **Generate QR with text**: `{"pickupId":"PU-1012-2001","verificationCode":"TEST123"}`
3. **Upload this QR image**
4. **Check if qr-scanner can read it**

### Test 3: Manual Entry Bypass
1. **Click "Enter Code Manually"**
2. **Type**: `PU-1012-2001`
3. **Verify verification window opens**
4. **This tests the verification flow without QR processing**

## 🔧 Debug Commands

Run these in browser console while on the worker page:

```javascript
// 1. Test QR processor manually
const testFile = new File(['test'], 'test.png', { type: 'image/png' });
console.log('Test file created:', testFile);

// 2. Check if QR scanner library is loaded
console.log('QrScanner available:', typeof QrScanner);

// 3. Generate test QR data
const testQR = {
  pickupId: 'PU-1012-2001',
  verificationCode: 'DEBUGTEST123'
};
console.log('Test QR data:', JSON.stringify(testQR));

// 4. Check current assignment ID
console.log('Current assignment ID from URL or state');
```

## 🎯 Expected Behavior

### Success Flow:
1. **File selected** → Console: "File selected: {name, type, size}"
2. **QR processing** → Console: "Processing QR from file..."
3. **QR data extracted** → Console: "QR processing successful! Raw data: ..."
4. **Verification window opens** → Shows validation steps
5. **Validation passes/fails** → Clear feedback to user

### Error Scenarios:
- **No QR code in image**: "No QR code detected in this image"
- **Invalid file type**: "Please select a valid image file"
- **File too large**: "Image file is too large"
- **Library error**: "QR processing error: [specific error]"

## 🚨 Common Issues

1. **qr-scanner not loaded**: Check network tab, reinstall if needed
2. **CORS issues**: QR scanner might have CORS restrictions
3. **Image format issues**: Some image formats might not be supported
4. **File permissions**: Check if app has proper file access permissions

## 🎉 Success Criteria

When working properly, you should see:
1. ✅ File upload starts without errors
2. ✅ QR data is extracted successfully 
3. ✅ Verification window opens with QR data
4. ✅ Validation shows expected vs found order IDs
5. ✅ User can confirm or reject based on validation

---

**Next Steps**: 
1. Follow debug steps above
2. Share console error messages
3. Try manual entry as fallback
4. Generate test QR codes for testing
