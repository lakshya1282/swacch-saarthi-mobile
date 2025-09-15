# QR Scanner Testing Guide

## 🎯 Overview
This guide provides comprehensive testing procedures for the newly implemented QR scanning functionality in the Waste Management Mobile App.

## ✅ Setup Validation (COMPLETED)
- ✅ Real camera scanning enabled
- ✅ Demo mode removed
- ✅ Dependencies installed (expo-camera, expo-barcode-scanner)
- ✅ Permissions configured in app.json
- ✅ QRScanner component properly implemented

## 📱 Testing Requirements

### Device Requirements
- **Physical Device Required**: Camera functionality cannot be tested on simulators/emulators
- **Supported Platforms**: iOS and Android devices with camera support
- **Permissions**: App will request camera permissions on first use

### Test Environment Setup
1. Run development server: `npm start` or `expo start`
2. Install Expo Go app on your physical device
3. Scan the QR code from the development server with Expo Go
4. Ensure device has good lighting for QR scanning

## 🧪 Test Cases

### Test Case 1: Camera Permissions
**Objective**: Verify camera permission handling
**Steps**:
1. Open app on device
2. Navigate to Worker → Scan QR Code
3. Verify camera permission prompt appears
4. Grant permission
5. Verify camera view loads

**Expected Results**:
- Permission dialog displays clearly
- Camera activates after granting permission
- No crashes or errors

### Test Case 2: QR Scanner UI
**Objective**: Verify scanner interface
**Steps**:
1. Access QR scanner screen
2. Check for scanning frame overlay
3. Test flash toggle button
4. Test cancel/back navigation

**Expected Results**:
- Camera feed displays properly
- Scanning frame visible and centered
- Flash toggle works (if device supports)
- Navigation buttons respond correctly

### Test Case 3: QR Code Scanning
**Objective**: Test actual QR code scanning
**Steps**:
1. Generate test QR codes with different content:
   - Simple text: "TEST123"
   - JSON format: `{"pickupId": "123", "verificationCode": "ABC123"}`
   - URL format: "https://example.com/pickup/123"
2. Point camera at QR codes
3. Verify scanning detection and feedback

**Expected Results**:
- QR codes detected quickly (< 2 seconds)
- Scanning feedback provided (vibration/sound)
- Scanned data processed correctly
- UI updates appropriately after scan

### Test Case 4: Error Handling
**Objective**: Test error scenarios
**Steps**:
1. Test with poor lighting
2. Test with damaged/partial QR codes
3. Test with non-QR barcodes
4. Test permission denied scenario

**Expected Results**:
- Appropriate error messages displayed
- App remains stable during errors
- User can retry scanning
- Clear guidance provided for resolution

### Test Case 5: Integration Testing
**Objective**: Test end-to-end workflow
**Steps**:
1. Schedule pickup as citizen (generates QR code)
2. View/save the generated QR code
3. Use worker app to scan the QR code
4. Verify data matches and workflow continues

**Expected Results**:
- QR code contains correct pickup data
- Worker app successfully scans and processes
- Data validation works properly
- Workflow proceeds to next step

## 🔧 Development Testing Commands

### Start Development Server
```bash
npm start
# or
expo start
```

### Test on Device
1. Install Expo Go from app store
2. Scan QR code from terminal/browser
3. App loads on device with camera access

### Generate Test QR Codes
You can use online QR generators or create them programmatically:
```javascript
// Example QR code content for testing
const testData = {
  pickupId: "PICKUP_001",
  citizenId: "CITIZEN_123", 
  scheduledDate: "2024-01-20",
  verificationCode: "VERIFY_ABC123",
  wasteType: "household"
};
```

## 🐛 Troubleshooting

### Common Issues
1. **Camera not loading**: Check permissions in device settings
2. **App crashes on scan**: Ensure all dependencies installed correctly
3. **QR not detected**: Improve lighting, ensure QR code is clear
4. **Performance issues**: Test on different devices, optimize if needed

### Debug Commands
```bash
# Check for errors
npx expo install --check

# Clear cache if issues
npx expo r -c

# Check logs
npx expo logs
```

## 📊 Success Criteria
- ✅ Camera permissions work smoothly
- ✅ QR codes scan reliably (>90% success rate)
- ✅ UI is responsive and intuitive  
- ✅ Error handling is robust
- ✅ Integration with pickup flow works
- ✅ Performance is acceptable (< 3 second scan time)

## 🚀 Next Steps After Testing
1. Fix any identified issues
2. Optimize performance if needed
3. Add analytics/logging for production
4. Prepare for production deployment
5. Update user documentation

## 📝 Testing Notes
- Test in various lighting conditions
- Try different QR code sizes and distances
- Test with various QR code content formats
- Document any device-specific issues
- Note performance differences between iOS/Android

---
*Last Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm")*