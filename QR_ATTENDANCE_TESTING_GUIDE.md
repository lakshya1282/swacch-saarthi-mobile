# QR-Based Attendance System - Testing Guide

## Overview

The QR-based attendance system ensures workers must mark their attendance before accessing work tasks. This guide explains how to test the complete implementation.

## System Components

### 1. Backend Components
- **Attendance Routes**: `/server/routes/attendanceRoutes.js` - API endpoints for attendance management
- **Attendance Model**: MongoDB schema with check-in/check-out tracking
- **Office Integration**: Links attendance to office codes and worker verification

### 2. Mobile App Components
- **AttendanceScreen**: QR scanner interface for marking attendance
- **AttendanceContext**: State management for attendance status
- **API Integration**: Methods for attendance marking and checking
- **Navigation Guard**: Prevents access to worker features without attendance

### 3. Testing Tools
- **ATTENDANCE_QR_GENERATOR.html**: Browser-based tool to generate test QR codes
- **Demo Mode**: Fallback functionality when backend is unavailable

## Testing Workflow

### Step 1: Generate Attendance QR Code

1. Open `ATTENDANCE_QR_GENERATOR.html` in your browser
2. Select an office code (e.g., WM001, WM002, etc.)
3. Set the date (usually today)
4. Click "Generate Attendance QR Code"
5. Save or print the generated QR code for testing

### Step 2: Start Backend Server

```powershell
# Navigate to server directory
cd E:\lawda\WasteManagementApp\server

# Start the server (port 3001)
npm run dev
```

**Note**: The attendance routes are now automatically mounted at `/api/attendance/*`

### Step 3: Test Worker Login Flow

1. **Start Mobile App**:
   ```powershell
   cd E:\lawda\WasteManagementApp
   npm start
   ```

2. **Login as Worker**:
   - Use demo credentials: `worker@demo.com` / `demo123`
   - Or use any registered worker account

3. **Attendance Flow**:
   - After login, the app automatically checks attendance status
   - If attendance not marked, shows AttendanceScreen
   - If attendance already marked, shows worker dashboard

### Step 4: Test Attendance Marking

1. **Attendance Screen Appears**:
   - Shows instructions and "Start Scanning" button
   - Cannot access worker features until attendance is marked
   - Back button is disabled/shows warning

2. **QR Code Scanning**:
   - Tap "Start Scanning"
   - Grant camera permissions if requested
   - Scan the generated attendance QR code
   - Expected format: `ATT-OFFICECODE` (e.g., `ATT-WM001`)

3. **Successful Attendance**:
   - Shows success message with check-in time
   - Automatically navigates to worker dashboard
   - Attendance status is cached locally

### Step 5: Test Attendance Persistence

1. **Close and Reopen App**:
   - Attendance status should be remembered
   - Should directly show worker dashboard
   - No need to mark attendance again for the same day

2. **Next Day Testing**:
   - Change system date or wait until next day
   - Should again require attendance marking
   - Previous day's attendance remains in history

## API Endpoints

### Mark Attendance
```javascript
POST /api/attendance/mark
{
  "workerId": "worker_id",
  "workerName": "Worker Name", 
  "officeCode": "WM001",
  "attendanceCode": "ATT-WM001",
  "action": "check_in",
  "method": "qr_scan"
}
```

### Get Attendance Status
```javascript
GET /api/attendance/worker/{workerId}?date=2024-01-15
```

### Get Attendance History
```javascript
GET /api/attendance/worker/{workerId}?startDate=2024-01-01&endDate=2024-01-31
```

## Error Scenarios to Test

### 1. Invalid QR Code
- **Test**: Scan a regular QR code or pickup QR code
- **Expected**: Error message "Invalid QR Code"
- **Action**: Shows option to scan again

### 2. Wrong Office Code
- **Test**: Scan attendance QR with wrong office code
- **Expected**: "Invalid office code" error
- **Note**: Office code must exist in database

### 3. Already Marked Attendance
- **Test**: Try to mark attendance twice in same day
- **Expected**: "Already checked in for today" message
- **Action**: Automatically proceeds to dashboard

### 4. Network Issues
- **Test**: Turn off server or internet connection
- **Expected**: Demo mode fallback
- **Action**: Shows success message with "(Demo Mode)" indicator

### 5. Camera Permission Denied
- **Test**: Deny camera permissions
- **Expected**: Permission request screen
- **Action**: Shows button to grant permissions

## Demo Mode Fallback

When the backend server is unavailable:

1. **Attendance Check**: Returns false (requires marking)
2. **Attendance Marking**: Returns demo success response
3. **Local Caching**: Still works to prevent repeated requests
4. **User Experience**: Seamless with demo indicators

## Database Structure

The attendance system creates records with:

```javascript
{
  workerId: ObjectId,
  workerName: String,
  officeId: ObjectId,
  officeCode: String,
  date: Date,
  checkIn: {
    time: Date,
    method: 'qr_scan',
    location: { coordinates: [lng, lat] }
  },
  status: 'present' | 'late' | 'absent',
  isLate: Boolean,
  hoursWorked: Number
}
```

## Production Considerations

### 1. QR Code Generation
- In production, office administrators generate QR codes through dashboard
- QR codes should be unique per day and office
- Consider adding time-based expiration

### 2. Security
- Validate office codes against database
- Ensure worker belongs to the office
- Add rate limiting for attendance marking

### 3. Offline Support
- Current implementation caches attendance status locally
- Consider sync mechanism when coming back online
- Handle clock skew between devices

### 4. Reporting
- Dashboard integration for attendance monitoring
- Export attendance data for payroll
- Generate attendance reports by date range

## Troubleshooting

### Common Issues

1. **"Camera permission denied"**
   - Solution: Enable camera permissions in device settings

2. **"Invalid attendance code"**
   - Check QR code format starts with "ATT-"
   - Verify office code exists in database

3. **"Backend unavailable"**
   - Start the server with `npm run dev`
   - Check server is running on port 3001

4. **App crashes on QR scan**
   - Update Expo SDK if using older version
   - Check expo-barcode-scanner is properly installed

5. **Attendance not persisting**
   - Check AsyncStorage permissions
   - Verify cache key format matches implementation

## Next Steps

After successful testing:

1. **Dashboard Integration**: Add attendance QR generation to admin dashboard
2. **Reporting Features**: Create attendance analytics and exports
3. **Check-out System**: Implement check-out QR scanning for end of day
4. **Geofencing**: Add location validation for attendance marking
5. **Bulk Operations**: Allow administrators to mark attendance manually

This system ensures workers maintain accountability while providing a smooth user experience with robust fallback mechanisms.