# Office Enrollment Integration Test Guide

## Overview
This document outlines the complete workflow for testing the worker office enrollment system that connects the mobile app with the office dashboard.

## Test Workflow

### 1. Worker Profile and Office Enrollment Test

#### Prerequisites
- Server running on `http://localhost:3000`
- Mobile app running on `http://localhost:3001` 
- Dashboard running (if testing office operator view)
- MongoDB connected with proper models

#### Test Steps

**Step 1: Register/Login as Worker**
1. Navigate to mobile app
2. Register or login with userType = 'worker'
3. Verify authentication works

**Step 2: Access Worker Profile**
1. Navigate to `/worker` (Worker Dashboard)
2. Click on "Profile" in navigation
3. Verify Worker Profile component loads
4. Check personal information display

**Step 3: Office Enrollment Process**
1. In profile page, find "Office Enrollment" section
2. Should show "Not Enrolled in Any Office" status
3. Click "Enroll to Office" button
4. Enter a valid office code (create test office first)
5. Verify office information confirmation dialog
6. Confirm enrollment
7. Verify success message and profile refresh

**Step 4: Verify Enrollment Status**
1. Check profile shows enrolled office details
2. Navigate back to Worker Dashboard
3. Verify dashboard shows enrollment status
4. Check "View Performance" link appears

**Step 5: Performance Tracking**
1. Click "View Performance" or navigate to `/worker/performance`
2. Verify performance component loads
3. Check office information display
4. Test period selection (week/month/3months)

### 2. Office Dashboard Integration Test

#### Test Office Management APIs

**Test 1: Get Office Workers**
```bash
curl -X GET "http://localhost:3000/api/dashboard/office/[OFFICE_CODE]/workers/details"
```

**Test 2: Get Office Performance Summary**
```bash
curl -X GET "http://localhost:3000/api/dashboard/office/[OFFICE_CODE]/summary"
```

**Test 3: Get Worker Performance Metrics**
```bash
curl -X GET "http://localhost:3000/api/dashboard/office/[OFFICE_ID]/workers/performance?period=month"
```

### 3. Database Verification

#### Check Database Records
1. **Worker/User Collection**: Verify enrollment fields
```javascript
db.users.find({ userType: 'worker', enrollmentStatus: 'enrolled' })
```

2. **Office Collection**: Verify worker statistics update
```javascript
db.offices.find({ officeCode: '[OFFICE_CODE]' })
```

3. **WorkerPerformance Collection**: Check performance tracking
```javascript
db.workerperformances.find({ officeId: ObjectId('[OFFICE_ID]') })
```

## API Endpoints Testing

### Worker Profile Management
- `GET /api/worker/profile/:workerId` - Get worker profile
- `PUT /api/worker/profile/:workerId` - Update worker profile
- `GET /api/worker/performance/:workerId` - Get performance metrics

### Office Enrollment
- `POST /api/worker/verify-office-code` - Verify office code
- `POST /api/worker/enroll-in-office` - Enroll worker in office
- `GET /api/worker/enrollment-status/:workerId` - Get enrollment status
- `POST /api/worker/unenroll-office` - Unenroll from office

### Office Management
- `GET /api/dashboard/office/:officeCode/workers/details` - Get office workers
- `GET /api/dashboard/office/:officeCode/summary` - Get office summary
- `GET /api/dashboard/office/:officeId/workers/performance` - Get performance data
- `POST /api/dashboard/office/:officeCode/worker/:workerId/performance` - Update performance

## Expected Results

### Mobile App Features
✅ Worker profile management with edit functionality
✅ Office enrollment with code verification
✅ Office information display after enrollment
✅ Performance tracking with metrics and trends
✅ Navigation between profile, dashboard, and performance pages
✅ Proper error handling and success messages

### Dashboard Features
✅ View enrolled workers by office code
✅ Track worker performance metrics
✅ Monitor attendance and punctuality
✅ Calculate incentives based on waste collection
✅ View office summary statistics

### Database Integration
✅ Proper worker-office relationships
✅ Performance data tracking
✅ Office statistics updates
✅ Data consistency between Worker and User models

## Common Issues and Troubleshooting

### Issue 1: Office Code Not Found
- Verify office exists in database with correct code format
- Check case sensitivity (codes are uppercase)

### Issue 2: Worker Profile Not Loading  
- Check authentication token validity
- Verify worker exists in database
- Check API endpoint accessibility

### Issue 3: Performance Data Missing
- Ensure worker is enrolled in office
- Check WorkerPerformance collection has records
- Verify date range filters

### Issue 4: Dashboard API Errors
- Verify office ID vs office code usage
- Check MongoDB connection
- Ensure proper model relationships

## Success Criteria

The integration is successful when:

1. **Worker Enrollment Flow Works**:
   - Worker can view profile
   - Worker can enroll using office code
   - Enrollment status updates correctly
   - Dashboard reflects enrollment

2. **Performance Tracking Functions**:
   - Performance metrics display correctly
   - Office information shows after enrollment
   - Trends and statistics calculate properly
   - Period filtering works

3. **Office Dashboard Integration**:
   - Office operators can view enrolled workers
   - Performance data accessible via APIs
   - Office statistics update with enrollments
   - Real-time data sync between components

4. **Database Consistency**:
   - Worker enrollment status persists
   - Office worker counts update
   - Performance records link correctly
   - No data integrity issues

## Test Data Setup

### Create Test Office
```javascript
// Via dashboard or direct DB insert
{
  officeName: "Test Waste Management Office",
  address: {
    street: "123 Clean Street",
    city: "Test City", 
    state: "Test State",
    pincode: "123456"
  },
  location: {
    latitude: 12.9716,
    longitude: 77.5946
  }
  // officeCode will be auto-generated
}
```

### Create Test Worker Performance Record
```javascript
{
  workerId: ObjectId("worker_id"),
  officeId: ObjectId("office_id"),
  date: new Date(),
  wasteCollection: {
    totalWeight: 20,
    pickupsCompleted: 5
  },
  incentive: {
    earnedAmount: 50 // (20-15) * 10
  },
  summary: {
    efficiency: 85
  }
}
```

## Conclusion

This comprehensive integration connects workers to office management through:
- Mobile app profile management and enrollment
- Performance tracking and metrics
- Office dashboard monitoring capabilities
- Real-time data synchronization
- Incentive calculation system

The system provides transparency and motivation for workers while giving office operators the tools to monitor and manage their workforce effectively.