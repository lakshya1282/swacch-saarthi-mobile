# Complaints API Documentation

## Overview
The Complaints API provides endpoints for citizens to submit and track complaints related to waste management services.

## Database Connection
✅ Connected to MongoDB Atlas
- Cluster: Swachh-Saarthi
- Database: waste-management
- Collection: complaints

## Endpoints

### 1. Submit a Complaint
**POST** `/api/complaints/submit`

Submit a new complaint with optional image attachments.

**Request Body (multipart/form-data):**
```json
{
  "citizenId": "string (required)",
  "citizenName": "string",
  "citizenEmail": "string",
  "citizenPhone": "string",
  "category": "string (required)",
  "priority": "Low | Medium | High | Urgent",
  "subject": "string (required, max 200)",
  "description": "string (required, max 1000)",
  "address": "string (required)",
  "latitude": "number",
  "longitude": "number",
  "relatedPickupId": "string (optional)",
  "images": "file[] (optional, max 5 images)"
}
```

**Categories:**
- Missed Pickup
- Improper Waste Collection
- Worker Behavior
- Damaged Bin
- Illegal Dumping
- Overflowing Bins
- Hazardous Waste Issue
- Delayed Service
- Other

**Response:**
```json
{
  "success": true,
  "message": "Complaint submitted successfully",
  "data": {
    "complaintId": "CMP...",
    "status": "Pending",
    ...
  }
}
```

---

### 2. Get Citizen's Complaints
**GET** `/api/complaints/citizen/:citizenId`

Retrieve all complaints submitted by a specific citizen.

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

---

### 3. Get All Complaints
**GET** `/api/complaints/all`

Retrieve all complaints (for admin/office use).

**Query Parameters:**
- `status`: Filter by status (Pending, In Progress, Resolved, Rejected, Closed)
- `priority`: Filter by priority (Low, Medium, High, Urgent)
- `category`: Filter by category
- `limit`: Maximum number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

---

### 4. Get Complaint by ID
**GET** `/api/complaints/:complaintId`

Retrieve details of a specific complaint.

**Response:**
```json
{
  "success": true,
  "data": {
    "complaintId": "CMP...",
    "citizenId": {...},
    "category": "...",
    "status": "...",
    "timeline": [...],
    ...
  }
}
```

---

### 5. Update Complaint Status
**PUT** `/api/complaints/:complaintId/status`

Update the status of a complaint (for admin/office use).

**Request Body:**
```json
{
  "status": "In Progress | Resolved | Rejected | Closed",
  "notes": "string (optional)",
  "assignedTo": "userId (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Complaint status updated successfully",
  "data": {...}
}
```

---

### 6. Rate a Complaint
**POST** `/api/complaints/:complaintId/rate`

Submit a rating for a resolved complaint.

**Request Body:**
```json
{
  "score": 1-5,
  "feedback": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback",
  "data": {...}
}
```

---

### 7. Get Complaint Statistics
**GET** `/api/complaints/stats/summary`

Retrieve complaint statistics (for dashboards).

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "pending": 20,
    "inProgress": 30,
    "resolved": 45,
    "closed": 5,
    "byCategory": [...],
    "byPriority": [...]
  }
}
```

---

## Complaint Object Structure

```json
{
  "complaintId": "CMPXXX",
  "citizenId": "ObjectId",
  "citizenName": "string",
  "citizenEmail": "string",
  "citizenPhone": "string",
  "category": "string",
  "priority": "string",
  "subject": "string",
  "description": "string",
  "location": {
    "address": "string",
    "latitude": "number",
    "longitude": "number"
  },
  "images": ["url1", "url2"],
  "status": "Pending | In Progress | Resolved | Rejected | Closed",
  "assignedTo": "ObjectId (optional)",
  "resolution": {
    "resolvedBy": "ObjectId",
    "resolvedAt": "Date",
    "resolutionNotes": "string",
    "resolutionImages": ["url1"]
  },
  "timeline": [
    {
      "status": "string",
      "updatedBy": "ObjectId",
      "updatedByName": "string",
      "notes": "string",
      "timestamp": "Date"
    }
  ],
  "rating": {
    "score": 1-5,
    "feedback": "string",
    "ratedAt": "Date"
  },
  "relatedPickupId": "ObjectId (optional)",
  "isUrgent": "boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## Image Upload

- Maximum 5 images per complaint
- Maximum file size: 5MB per image
- Supported formats: All image types (jpeg, png, gif, etc.)
- Images are stored in: `uploads/complaints/`
- Image URLs are returned in the format: `/uploads/complaints/complaint-XXXXX.jpg`

---

## Error Responses

All endpoints return error responses in this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development mode)"
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created (for new complaints)
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Server Error

---

## Testing

To test the complaints API, restart your server:

```bash
npm run dev
```

The complaints endpoints will be available at:
```
http://localhost:3001/api/complaints/*
```

---

## Notes

1. All complaints are stored in MongoDB Atlas
2. Complaint IDs are auto-generated with format: `CMP{timestamp}{random}`
3. Timeline is automatically updated when status changes
4. Images are stored locally in the `uploads/complaints/` directory
5. The API supports both ObjectId and custom complaintId for lookups
