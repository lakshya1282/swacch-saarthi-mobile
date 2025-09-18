# Race Condition Fix: Task Assignment

## Problem Description

The original system had a critical race condition where multiple workers could accept the same task simultaneously. This happened because:

1. **Multiple workers fetch available tasks** → Both see the same unassigned task
2. **Both workers click "Accept" at nearly the same time**
3. **Both API calls process simultaneously** → Both workers get assigned the same task
4. **Real-world result**: Two workers show up at the same location for the same pickup

## Root Causes

### 1. Non-Atomic Task Assignment
The original code had a simple query-then-update pattern:
```javascript
// PROBLEMATIC CODE (before fix):
const task = await Pickup.findById(taskId);
if (task && !task.workerId) {
    task.workerId = workerId;
    await task.save();
}
```

### 2. Incorrect Available Tasks Query
```javascript
// WRONG: Returned ALL tasks instead of only available ones
const tasks = await Pickup.find().sort({ createdAt: -1 });
```

### 3. No Real-Time Synchronization
When a task was accepted, other workers' dashboards weren't immediately updated.

## Solution Implemented

### 1. Atomic Task Assignment with MongoDB Transactions
```javascript
// NEW: Atomic task acceptance using MongoDB transactions
pickupSchema.statics.acceptTaskAtomically = async function(taskId, workerId, workerName) {
  const session = await this.db.startSession();
  
  try {
    return await session.withTransaction(async () => {
      // Find and atomically update in a single operation
      const updateResult = await this.findOneAndUpdate(
        {
          _id: pickup._id,
          status: { $in: ['scheduled', 'pending'] },
          workerId: null  // Ensure still unassigned
        },
        {
          status: 'assigned',
          workerId: workerId,
          assignedAt: new Date(),
          assignedWorkerName: workerName
        },
        {
          new: true,
          session: session
        }
      );
      
      if (!updateResult) {
        return {
          success: false,
          error: 'RACE_CONDITION',
          message: 'Another worker has just accepted this task.'
        };
      }
      
      return {
        success: true,
        pickup: updateResult,
        message: 'Task accepted successfully!'
      };
    });
  } finally {
    await session.endSession();
  }
};
```

### 2. Proper Available Tasks Query
```javascript
// NEW: Only return truly available tasks
app.get('/api/worker/tasks', authenticateToken, async (req, res) => {
  const availableTasks = await Pickup.find({
    status: { $in: ['scheduled', 'pending'] },
    workerId: null,  // CRITICAL: Ensure no worker assigned
    scheduledDate: { $gte: new Date() }  // Only future tasks
  });
});
```

### 3. Enhanced Real-Time Notifications
```javascript
// NEW: Immediate notification to all workers when task is accepted
if (result.success) {
  // Notify all workers that this task is no longer available
  emitTaskNoLongerAvailable({
    pickupId: result.pickup._id,
    taskId: taskId,
    originalStatus: 'scheduled'
  }, workerId);
}
```

## Key Benefits

### ✅ **Atomic Operations**
- Uses MongoDB's ACID transactions
- Guarantees only one worker can accept a task
- Prevents race conditions at the database level

### ✅ **Proper Error Handling**
- Returns specific error codes (`RACE_CONDITION`, `TASK_NOT_AVAILABLE`)
- Provides user-friendly error messages
- Allows clients to handle conflicts gracefully

### ✅ **Real-Time Updates**
- Immediately removes accepted tasks from other workers' dashboards
- Uses Socket.IO for instant notifications
- Improves user experience

### ✅ **Scalability**
- Works correctly with multiple concurrent users
- Handles high load scenarios
- Database-level consistency guarantees

## API Endpoints Updated

### 1. Task Acceptance
- **Endpoint**: `POST /api/worker/tasks/:taskId/accept`
- **Behavior**: Atomic task assignment with conflict detection
- **Response Codes**:
  - `200`: Task accepted successfully
  - `409`: Conflict - task already accepted by another worker
  - `404`: Task not found or not available

### 2. Available Tasks
- **Endpoint**: `GET /api/worker/tasks`
- **Behavior**: Returns only unassigned, scheduled tasks
- **Enhancement**: Excludes already assigned tasks

### 3. Worker Dashboard
- **Endpoint**: `GET /api/worker/available-tasks`
- **Behavior**: Optimized query for worker dashboard
- **Features**: Real-time updates via Socket.IO

## Testing

Run the race condition test:
```bash
cd server
node test-race-condition-fix.js
```

Expected output:
```
✅ RACE CONDITION TEST PASSED!
   - Only one worker successfully accepted the task
   - Other worker(s) received proper conflict response
```

## Migration Notes

### Frontend Changes Required
Workers' frontend should handle the new error responses:
```javascript
// Handle race condition in frontend
try {
  const response = await acceptTask(taskId);
  if (response.success) {
    showSuccess('Task accepted successfully!');
    refreshTaskList();
  }
} catch (error) {
  if (error.status === 409) {
    showWarning('This task was just accepted by another worker. Please choose a different task.');
    refreshTaskList(); // Refresh to show current available tasks
  }
}
```

### Socket.IO Integration
Listen for real-time task updates:
```javascript
socket.on('task-no-longer-available', (data) => {
  removeTaskFromUI(data.taskId);
  showNotification(`Task ${data.taskId} was accepted by another worker`);
});
```

## Conclusion

This fix ensures that:
1. **Only one worker can accept each task** (no double-booking)
2. **Workers see real-time updates** when tasks are taken
3. **The system scales properly** under concurrent load
4. **Error handling is user-friendly** and informative

The implementation uses industry-standard practices (ACID transactions, atomic operations, real-time notifications) to solve this critical business logic issue.