# Complaint Submission Fix

## Problem
The mobile app was receiving a 500 error when submitting complaints with the error:
```
ERROR Error submitting complaint: [AxiosError: Request failed with status code 500]
```

## Root Causes Identified

### 1. Required Field Issue - `complaintId`
**Problem:** The `complaintId` field in the Complaint model was marked as `required: true`, but it's auto-generated in a pre-save hook. This caused validation to fail before the hook could run.

**Fix:** Changed `required: true` to `required: false` in the schema definition since the field is auto-generated.

```javascript
// Before:
complaintId: {
  type: String,
  unique: true,
  required: true  // ❌ This caused validation error
}

// After:
complaintId: {
  type: String,
  unique: true,
  required: false  // ✅ Auto-generated in pre-save hook
}
```

### 2. Required Contact Fields
**Problem:** The model required `citizenName`, `citizenEmail`, and `citizenPhone` fields, but the mobile app didn't send these. While the route tried to fetch them from the User model, if the lookup failed or returned incomplete data, the complaint couldn't be saved.

**Fix:** Made these fields optional with default values:

```javascript
// Before:
citizenName: {
  type: String,
  required: true  // ❌ Mobile app doesn't send this
}

// After:
citizenName: {
  type: String,
  required: false,  // ✅ Optional field
  default: 'Citizen'
}
```

### 3. Missing Reason Mappings
**Problem:** The mobile app sends reason codes like `'late'` and `'did_not_come'`, but the backend's mapping only included different codes like `'missed_pickup'`.

**Fix:** Added mobile app reason codes to the mapping:

```javascript
const reasonToCategory = {
  // Original mappings
  'missed_pickup': 'Missed Pickup',
  'damaged_bin': 'Damaged Bin',
  // ... others
  
  // Mobile app mappings
  'late': 'Delayed Service',              // ✅ Added
  'did_not_come': 'Missed Pickup',        // ✅ Added
  'late_pickup': 'Delayed Service'        // ✅ Added
};
```

### 4. Pickup Reference Handling
**Problem:** The mobile app sends `pickupId` as a string (e.g., "PICKUP001"), but the model expects `relatedPickupId` as an ObjectId reference.

**Fix:** Added logic to look up the pickup by its string ID and convert it to an ObjectId:

```javascript
// Lookup pickup to get its ObjectId if pickupId is provided
let pickupObjectId = null;
if (pickupId) {
  const pickup = await Pickup.findOne({ pickupId: pickupId });
  if (pickup) {
    pickupObjectId = pickup._id;
  }
}

// Use ObjectId if found, otherwise use string ID
if (pickupObjectId) {
  complaintData.relatedPickupId = pickupObjectId;
}
```

### 5. Enhanced Error Logging
**Added:** Detailed error logging to help diagnose issues:

```javascript
} catch (error) {
  console.error('❌ Error submitting complaint:', error);
  console.error('Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    requestBody: req.body
  });
  
  // Send specific error messages
  let errorMessage = 'Failed to submit complaint';
  if (error.name === 'ValidationError') {
    errorMessage = `Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
  }
  
  res.status(500).json({
    success: false,
    message: errorMessage,
    error: error.message,
    details: error.name === 'ValidationError' ? error.errors : undefined
  });
}
```

## Files Modified

1. **server/models/Complaint.js**
   - Changed `complaintId` from required to optional
   - Made `citizenName`, `citizenEmail`, `citizenPhone` optional with defaults
   - Added Pickup model import

2. **server/routes/complaintRoutes.js**
   - Added Pickup model import
   - Added pickup lookup logic
   - Enhanced reason-to-category mapping
   - Improved error handling and logging

## Testing

Created test scripts to verify all complaint types work:
- ✅ Late Pickup
- ✅ Did Not Come
- ✅ Others with Custom Reason

All tests pass successfully!

## Mobile App Format

The mobile app sends complaints in this format:
```json
{
  "citizenId": "68ea8768cf1acb7ee4b503b2",
  "pickupId": "PICKUP001",
  "reason": "late",
  "customReason": "Optional - only for 'others'",
  "description": "Additional details"
}
```

Backend now properly handles this format and:
1. Looks up user info to populate contact fields
2. Maps reason codes to categories
3. Converts pickupId to ObjectId reference
4. Auto-generates complaintId
5. Creates proper complaint with all required fields

## Result

✅ Complaint submission now works perfectly from the mobile app!
✅ All complaint types are supported
✅ Better error messages for debugging
✅ Proper data transformation and validation
