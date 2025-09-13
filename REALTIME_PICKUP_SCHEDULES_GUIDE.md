# Real-time Pickup Schedules Feature Guide

## Overview
This guide documents the newly implemented real-time pickup schedules feature in the Worker's Dashboard "Find Works" section. This feature provides workers with live updates of available pickup requests, automatic refresh functionality, and enhanced UI for better user experience.

## Features Implemented

### 1. Backend API Enhancements

#### New Endpoints Added:

**GET /api/pickups/schedules**
- Fetches all available pickup requests in real-time
- Filters pending, confirmed, and unassigned pickups
- Sorts by urgency and creation time
- Returns formatted data optimized for worker dashboard

**POST /api/worker/accept-work**
- Allows workers to accept pickup requests
- Updates pickup status to 'assigned'
- Tracks worker assignment details
- Returns success confirmation

### 2. Frontend Enhancements

#### Worker Dashboard (`src/components/WorkerDashboard.js`)
- Added real-time pickup schedules preview section
- Live status indicator with pulsing animation
- Quick access to Browse Available Works
- CSS animations for better visual feedback

#### Find Works Component (`src/components/FindWorks.js`)
- Enhanced with real-time API integration
- Auto-refresh every 30 seconds
- Manual refresh functionality
- Real-time status bar with last updated timestamp
- Improved urgency indicators with timestamps
- Better pickup request cards with priority badges

### 3. Real-time Features

#### Auto-refresh Mechanism
- Automatic data refresh every 30 seconds
- Manual refresh button for instant updates
- Live status indicators showing real-time connection
- Last updated timestamp display

#### Urgency Classification System
- **Urgent (Red)**: Pickup requests within 2 hours
- **High Priority (Orange)**: Pickup requests within 4 hours  
- **Normal (Green)**: All other requests

#### Enhanced UI/UX
- Pulsing animation for live indicators
- Priority-based color coding
- Time-based sorting
- Detailed pickup information cards
- Better mobile responsiveness

## Technical Implementation

### API Endpoints Structure

```javascript
// GET /api/pickups/schedules
{
  "success": true,
  "data": [
    {
      "_id": "pickup_id",
      "pickupId": "PU-1009-1001",
      "customerName": "Customer Name",
      "customerPhone": "+91 XXXXXXXXXX",
      "address": "Customer Address",
      "location": {
        "latitude": 12.9716,
        "longitude": 77.5946
      },
      "wasteTypes": ["Dry Waste", "Recyclables"],
      "estimatedWeight": "5 kg",
      "timeSlot": "9:00 AM - 11:00 AM",
      "scheduledDate": "2025-09-10",
      "specialInstructions": "Ring doorbell",
      "estimatedEarnings": 60,
      "distance": "2.5 km",
      "area": "MG Road",
      "urgency": "urgent|high|normal",
      "status": "pending",
      "createdAt": "2025-09-10T09:30:00.000Z",
      "lastUpdated": "2025-09-10T09:30:00.000Z"
    }
  ],
  "timestamp": "2025-09-10T09:30:00.000Z"
}

// POST /api/worker/accept-work
// Request Body:
{
  "workId": "pickup_id",
  "workerId": "worker_id"
}

// Response:
{
  "success": true,
  "message": "Work accepted successfully",
  "workId": "pickup_id",
  "workerId": "worker_id", 
  "assignedAt": "2025-09-10T09:30:00.000Z"
}
```

### Frontend Components Updates

#### Enhanced Worker Dashboard Features:
- Real-time pickup schedules preview section
- Live status indicators with pulse animation
- Integrated navigation to Find Works section
- CSS animations for visual feedback

#### Enhanced Find Works Features:
- Real-time API integration with localStorage fallback
- 30-second auto-refresh interval
- Manual refresh button
- Enhanced filtering by area and waste type
- Priority-based sorting and display
- Improved work request cards with:
  - Priority badges with color coding
  - Timestamp information
  - Customer details section
  - Waste type and weight information
  - Estimated earnings display
  - Accept/View on Map buttons

### CSS Animations Added

```css
@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

## Usage Instructions

### For Workers:

1. **Access Real-time Schedules**:
   - Navigate to Worker Dashboard
   - See real-time pickup schedules preview
   - Click "Browse Available Works" for full list

2. **View Available Works**:
   - Go to Find Works section
   - See live updates every 30 seconds
   - Use filters to narrow down requests
   - Click "Refresh Now" for manual updates

3. **Accept Pickup Requests**:
   - Review pickup request details
   - Check priority level and earnings
   - Click "Accept Work" to assign to yourself
   - Navigate to "My Works" to see accepted assignments

4. **Monitor Real-time Status**:
   - Green pulsing dot = Live connection active
   - Last updated timestamp shown
   - Priority color coding for urgency levels

### For Developers:

1. **Backend Setup**:
   - Ensure pickup routes are properly registered
   - Route order matters: `/schedules` before `/:pickupId`
   - Worker routes handle work acceptance

2. **Frontend Integration**:
   - Components auto-connect to API endpoints
   - Fallback to localStorage if API unavailable
   - Real-time updates handled automatically

3. **Testing**:
   - Start server: `node server/index.js`
   - Create test pickup via API
   - Verify real-time updates in Find Works

## Data Flow

1. **Pickup Creation**: Citizens schedule pickups via API
2. **Real-time Fetch**: Find Works component fetches schedules every 30s
3. **Priority Sorting**: Requests sorted by urgency and creation time
4. **Worker Display**: Enhanced cards show detailed information
5. **Work Acceptance**: Workers accept via API, status updates immediately
6. **Dashboard Updates**: My Works section reflects accepted assignments

## Error Handling

- API failures fall back to localStorage data
- Connection issues shown in UI with status indicators
- Failed work acceptance attempts show error messages
- Graceful degradation when server unavailable

## Performance Optimizations

- 30-second refresh interval balances real-time with performance
- Efficient data filtering and sorting on backend
- Minimal DOM updates on frontend
- Cached address lookups to reduce API calls

## Security Considerations

- All API endpoints require proper authentication
- Worker IDs validated before work assignment
- Pickup data sanitized before display
- Secure token-based authentication maintained

## Future Enhancements

Potential areas for improvement:
- WebSocket integration for instant real-time updates
- Push notifications for new pickup requests
- GPS-based distance calculations
- Worker location tracking
- Advanced filtering options
- Pickup request analytics dashboard

## Testing

The feature has been tested with:
- ✅ API endpoint functionality
- ✅ Real-time data fetching
- ✅ Work acceptance workflow
- ✅ Auto-refresh mechanism
- ✅ UI responsiveness and animations
- ✅ Error handling and fallbacks

## Conclusion

The real-time pickup schedules feature significantly enhances the worker experience by providing:
- Live updates of available work
- Better visual feedback and urgency indicators
- Streamlined work acceptance process
- Improved dashboard integration
- Enhanced mobile experience

This implementation provides a solid foundation for real-time workforce management in the waste management application.
