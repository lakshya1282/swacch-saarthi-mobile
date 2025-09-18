# Office Profile Feature

## Overview

The Office Profile feature allows office administrators to manage their office information and worker enrollment system. Each office gets an auto-generated office code that workers can use to join the office.

## Features

### 📋 Office Profile Management
- **Auto-generated Office Code**: Each office gets a unique code (e.g., `DEL902487`)
- **Office Information Display**: Shows complete office details
- **Editable Profile**: Update contact info, operational hours, and coverage area
- **Office Status Tracking**: Monitor office status and statistics

### 👥 Worker Enrollment System
- **Office Code Registration**: Workers use the office code to apply
- **Enrollment Statistics**: Track total workers, active workers, pending applications
- **Recent Enrollments**: View recent worker applications
- **Approval/Rejection System**: Approve or reject worker applications

### 📊 Analytics & Reporting
- **Real-time Statistics**: Live data on worker counts and enrollments
- **Enrollment History**: Track worker joining patterns
- **Office Metrics**: Monitor office performance and capacity

## How It Works

### For Office Administrators:

1. **Access Office Profile**:
   - Login to the dashboard
   - Click on "Office Profile" in the sidebar
   - View your auto-generated office code

2. **Share Office Code**:
   - Copy the office code from the profile page
   - Share with potential workers
   - Workers use this code to apply

3. **Manage Worker Applications**:
   - View pending applications in the enrollments section
   - Approve or reject applications
   - Monitor worker statistics

### For Workers:

1. **Get Office Code**:
   - Obtain the office code from the office administrator

2. **Apply to Join**:
   - Use the worker enrollment form (or mobile app)
   - Enter the office code and personal details
   - Submit application

3. **Wait for Approval**:
   - Office admin reviews the application
   - Worker receives approval/rejection notification

## API Endpoints

### Office Profile
- `GET /api/dashboard/office-profile/:officeId` - Get office profile
- `PUT /api/dashboard/office-profile/:officeId` - Update office profile

### Enrollment Statistics
- `GET /api/dashboard/enrollment-stats/:officeId` - Get enrollment statistics

### Worker Enrollment
- `POST /api/dashboard/worker-enrollment` - Worker applies to join office
- `PUT /api/dashboard/worker-enrollment/:workerId/:action` - Approve/reject worker

## Database Schema Updates

### Office Model
- `officeCode`: Auto-generated unique code for worker enrollment
- `statistics`: Track worker counts and office metrics

### Worker Model
- `officeId`: Reference to the office the worker belongs to
- `isActive`: Approval status for office enrollment
- `isVerified`: Verification status

## Office Code Generation

Office codes are automatically generated using:
- First 3 letters of the city name (uppercase)
- Last 4 digits of the current timestamp
- 2-digit random number

**Example**: For a city "Delhi", the code might be `DEL902487`

## File Structure

```
dashboard/
├── src/
│   └── components/
│       ├── OfficeProfile.js      # Main office profile component
│       ├── OfficeProfile.css     # Styles for office profile
│       └── Dashboard.js          # Updated with profile navigation
server/
├── routes/
│   └── dashboardRoutes.js        # Office profile API routes
├── models/
│   ├── Office.js                 # Office model with auto-generated codes
│   └── Worker.js                 # Worker model with office association
worker-enrollment-demo.html       # Demo worker enrollment page
```

## Usage Instructions

### 1. Start the Server
```bash
cd server
npm run dev
```

### 2. Start the Dashboard
```bash
cd dashboard
npm start
```

### 3. Access Office Profile
- Login to the dashboard
- Navigate to "Office Profile" in the sidebar
- View and copy your office code

### 4. Test Worker Enrollment
- Open `worker-enrollment-demo.html` in a browser
- Use the office code from the dashboard
- Fill in worker details and submit

### 5. Manage Applications
- Return to the Office Profile in the dashboard
- View recent enrollments
- Approve or reject applications as needed

## Security Features

- **Authentication Required**: All API endpoints require valid operator authentication
- **Office Association**: Operators can only access their own office data
- **Input Validation**: All form inputs are validated on both frontend and backend
- **Sanitized Updates**: Only allowed fields can be updated in office profiles

## Future Enhancements

- **Mobile App Integration**: Full mobile app for workers
- **Email Notifications**: Automatic notifications for approvals/rejections
- **QR Code Support**: Generate QR codes for office codes
- **Bulk Operations**: Approve/reject multiple applications at once
- **Advanced Analytics**: Detailed reporting and analytics

## Troubleshooting

### Common Issues

1. **Office Code Not Generated**:
   - Ensure the office has a valid city name
   - Check that the office is saved properly

2. **Worker Enrollment Fails**:
   - Verify the office code is correct
   - Check that the office status is 'active'
   - Ensure required worker fields are provided

3. **Statistics Not Loading**:
   - Check database connection
   - Verify worker records have proper officeId references

### Error Handling

- All API endpoints include proper error handling
- Frontend displays user-friendly error messages
- Server logs detailed error information for debugging