# Waste Management Dashboard Backend

This backend system provides comprehensive APIs and real-time functionality for the waste management dashboard, including office management, worker performance tracking, and incentive calculation.

## Features

### 🏢 Office Management
- Office registration with location and contact details
- Operator authentication and authorization
- Multi-office support with proper access controls

### 👥 Worker Performance Tracking
- Real-time performance data collection from mobile apps
- Weight-based tracking with detailed metrics
- Location tracking and route optimization
- Time tracking with break management

### 💰 Incentive System
- **15kg Threshold**: Workers earn incentives for weight collected above 15kg
- **₹10 per kg**: Incentive rate for excess weight
- Automatic calculation and payment processing
- Detailed payment history and analytics

### 📊 Real-time Dashboard
- Live worker location tracking
- Real-time performance updates via Socket.IO
- Comprehensive analytics and reporting
- Export capabilities for data analysis

## API Endpoints

### Office Registration and Authentication

#### Register Office and Operator
```http
POST /api/dashboard/register-office
```

**Request Body:**
```json
{
  "office": {
    "officeName": "Green City Waste Management",
    "officeCode": "GCWM001",
    "address": {
      "street": "123 Environment Street",
      "city": "Eco City",
      "state": "Green State",
      "pincode": "123456",
      "area": "Sector 21"
    },
    "location": {
      "latitude": 20.5937,
      "longitude": 78.9629
    },
    "contactInfo": {
      "primaryPhone": "9876543210",
      "email": "office@greencity.com",
      "website": "www.greencity.com"
    },
    "operationalHours": {
      "weekdays": { "start": "08:00", "end": "18:00" },
      "saturday": { "start": "08:00", "end": "14:00" },
      "sunday": { "start": "closed", "end": "closed" }
    },
    "coverageArea": {
      "zones": ["Zone A", "Zone B", "Zone C", "Zone D"],
      "radius": 10,
      "wasteTypes": ["dry", "wet", "mixed", "hazardous"]
    }
  },
  "operator": {
    "personalInfo": {
      "firstName": "John",
      "lastName": "Manager",
      "employeeId": "EMP001",
      "designation": "Operations Manager",
      "email": "john.manager@greencity.com",
      "phone": "9876543210"
    },
    "authentication": {
      "password": "securepassword123"
    },
    "permissions": {
      "viewWorkerPerformance": true,
      "processIncentives": true,
      "manageWorkers": true,
      "viewAnalytics": true,
      "exportReports": true
    }
  }
}
```

#### Login Operator
```http
POST /api/dashboard/login
```

**Request Body:**
```json
{
  "email": "john.manager@greencity.com",
  "password": "securepassword123"
}
```

### Dashboard Data Endpoints

#### Get Dashboard Overview
```http
GET /api/dashboard/overview/{officeId}?range=today
```

**Query Parameters:**
- `range`: `today`, `week`, `month`, `quarter`

**Response:**
```json
{
  "totalWorkers": 15,
  "activeWorkers": 12,
  "totalWasteCollected": 245.5,
  "totalIncentivesEarned": 1250,
  "totalPickups": 48,
  "efficiency": 87
}
```

#### Get Workers Data
```http
GET /api/dashboard/workers/{officeId}
```

**Response:**
```json
[
  {
    "_id": "worker_id",
    "personalInfo": {
      "firstName": "Ram",
      "lastName": "Singh"
    },
    "workerId": "W001",
    "todayPerformance": {
      "totalWeight": 18.5,
      "pickupsCompleted": 6
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Performance Analytics
```http
GET /api/dashboard/performance/{officeId}?range=week
```

#### Get Incentives Data
```http
GET /api/dashboard/incentives/{officeId}?range=month
```

### Performance Submission

#### Submit Worker Performance
```http
POST /api/dashboard/submit-performance
```

**Request Body:**
```json
{
  "workerId": "WORKER_001",
  "officeId": "office_id",
  "wasteCollection": {
    "totalWeight": 18.5,
    "pickupsCompleted": 6,
    "wasteTypes": ["mixed", "dry"],
    "locations": [
      {
        "area": "Zone A",
        "weight": 8.0,
        "timestamp": "2024-01-15T09:00:00Z"
      }
    ]
  },
  "timeTracking": {
    "startTime": "2024-01-15T08:00:00Z",
    "endTime": "2024-01-15T16:00:00Z",
    "totalDuration": 480,
    "activeTime": 420,
    "breakTime": 60
  }
}
```

**Response:**
```json
{
  "message": "Performance submitted successfully",
  "performance": { ... },
  "incentiveDetails": {
    "qualifyingWeight": 3.5,
    "earnedAmount": 35,
    "threshold": 15
  }
}
```

#### Process Incentive Payment
```http
POST /api/dashboard/process-incentive-payment
```

**Request Body:**
```json
{
  "performanceIds": ["perf_id_1", "perf_id_2"],
  "paymentReference": "PAY_2024_001"
}
```

## Socket.IO Integration

### Namespace: `/dashboard`

The dashboard uses a dedicated Socket.IO namespace for real-time communication.

### Connection
```javascript
const socket = io('http://localhost:3001/dashboard', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Client → Server Events

- **subscribe-worker-tracking**: Subscribe to specific workers' real-time updates
- **performance-update**: Submit performance data in real-time
- **manual-performance-entry**: Manually enter performance data
- **process-incentive-payment**: Process incentive payments
- **request-analytics-update**: Request updated analytics data

#### Server → Client Events

- **dashboard-connected**: Connection confirmation
- **worker-performance-updated**: Real-time performance updates
- **worker-location-update**: Worker location changes
- **pickup-completed**: Pickup completion notifications
- **incentive-payments-processed**: Payment processing confirmations
- **analytics-update**: Updated analytics data
- **system-alert**: System alerts and notifications

### Example Usage

```javascript
// Subscribe to worker tracking
socket.emit('subscribe-worker-tracking', {
  workerIds: ['worker1_id', 'worker2_id']
});

// Listen for performance updates
socket.on('worker-performance-updated', (data) => {
  console.log('Worker performance updated:', data);
  // Update dashboard UI
});

// Submit manual performance entry
socket.emit('manual-performance-entry', {
  workerId: 'worker_id',
  wasteCollection: {
    totalWeight: 20,
    pickupsCompleted: 5
  },
  notes: 'Manual entry for exceptional performance'
});
```

## Incentive Calculation Logic

The system automatically calculates incentives based on the following rules:

### Threshold System
- **Base Threshold**: 15kg per day
- **Incentive Rate**: ₹10 per kg for weight exceeding the threshold
- **Daily Calculation**: Incentives are calculated per day, not cumulative

### Example Calculations

| Total Weight | Qualifying Weight | Incentive Amount |
|-------------|------------------|-----------------|
| 12kg        | 0kg              | ₹0              |
| 15kg        | 0kg              | ₹0              |
| 18kg        | 3kg              | ₹30             |
| 25kg        | 10kg             | ₹100            |
| 30kg        | 15kg             | ₹150            |

### Implementation
```javascript
// Automatic calculation in WorkerPerformance model
calculateIncentive() {
  const threshold = 15; // kg
  const ratePerKg = 10; // ₹10 per kg
  
  const qualifyingWeight = Math.max(0, this.wasteCollection.totalWeight - threshold);
  const earnedAmount = qualifyingWeight * ratePerKg;
  
  return {
    qualifyingWeight,
    earnedAmount,
    threshold,
    ratePerKg
  };
}
```

## Mobile App Integration

### Integration Flow

1. **Office Setup**: Register office and operator through dashboard
2. **Worker Authentication**: Workers authenticate through mobile app
3. **Performance Tracking**: Mobile app automatically submits performance data
4. **Real-time Updates**: Dashboard receives real-time updates via Socket.IO
5. **Incentive Calculation**: System automatically calculates and displays incentives
6. **Payment Processing**: Operators can process payments through dashboard

### Mobile App Code Example

```javascript
// Submit performance when pickup is completed
const submitPerformance = async (pickupData) => {
  const performanceData = {
    workerId: currentWorker.id,
    officeId: currentWorker.officeId,
    wasteCollection: {
      totalWeight: pickupData.weight,
      pickupsCompleted: 1,
      wasteTypes: [pickupData.type],
      locations: [{
        area: pickupData.location,
        weight: pickupData.weight,
        timestamp: new Date()
      }]
    }
  };

  try {
    const response = await axios.post('/api/dashboard/submit-performance', performanceData);
    console.log('Incentive earned:', response.data.incentiveDetails.earnedAmount);
  } catch (error) {
    console.error('Failed to submit performance:', error);
  }
};
```

## Installation and Setup

### Prerequisites
- Node.js 14+
- MongoDB 4.4+
- npm or yarn

### Installation
```bash
cd server
npm install
```

### Required Dependencies
- express
- mongoose
- socket.io
- jsonwebtoken
- bcryptjs
- date-fns
- cors

### Environment Variables
Create a `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/waste-management
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
PORT=3001
```

### Starting the Server
```bash
npm start
```

The server will start on `http://localhost:3001` with:
- REST API endpoints at `/api/dashboard/*`
- Socket.IO namespace at `/dashboard`
- Real-time dashboard functionality

## Testing

### Run the Integration Example
```bash
cd server/examples
node mobileAppIntegration.js
```

This will demonstrate:
- Office and operator registration
- Mobile app connection
- Performance data submission
- Incentive calculation
- Real-time dashboard updates

## Architecture

### Database Models
- **Office**: Office information and configuration
- **OfficeOperator**: Dashboard user authentication and permissions
- **WorkerPerformance**: Daily performance tracking with automatic incentive calculation
- **Worker**: Worker profiles (referenced from main app)

### Real-time Communication
- **Socket.IO Namespaces**: Separate namespaces for dashboard and mobile app
- **Room-based Broadcasting**: Office-specific rooms for targeted updates
- **Event-driven Architecture**: Decoupled real-time updates

### Security
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Operator permissions and office-specific access
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse

## Support

For technical support or questions about the dashboard backend system:
- Check the integration examples in `/server/examples/`
- Review the API documentation above
- Test with the provided demonstration scripts
- Ensure all required dependencies are installed

The system is designed to seamlessly integrate with existing mobile waste management applications while providing real-time monitoring and automated incentive calculation based on the 15kg threshold at ₹10 per kg excess weight.