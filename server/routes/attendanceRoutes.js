const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Import models
const Office = require('../models/Office');
const Worker = require('../models/Worker');
const User = require('../models/User');

// Import authentication middleware
const { authenticateWorker, validateAttendanceOwnership } = require('../middleware/workerAuth');

// Attendance model schema
const attendanceSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  workerName: {
    type: String,
    required: true
  },
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Office',
    required: true,
    index: true
  },
  officeCode: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  checkIn: {
    time: {
      type: Date,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      }
    },
    method: {
      type: String,
      enum: ['qr_scan', 'manual', 'auto'],
      default: 'qr_scan'
    }
  },
  checkOut: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      }
    },
    method: {
      type: String,
      enum: ['qr_scan', 'manual', 'auto'],
      default: 'qr_scan'
    }
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day'],
    default: 'present',
    index: true
  },
  isLate: {
    type: Boolean,
    default: false
  },
  hoursWorked: {
    type: Number,
    default: 0
  },
  notes: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfficeOperator'
  }
}, {
  timestamps: true
});

// Create compound indexes
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ officeCode: 1, date: 1 });
attendanceSchema.index({ date: -1, status: 1 });

// Virtual for readable date
attendanceSchema.virtual('dateString').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Method to calculate hours worked
attendanceSchema.methods.calculateHours = function() {
  if (this.checkIn.time && this.checkOut?.time) {
    const diff = this.checkOut.time - this.checkIn.time;
    this.hoursWorked = Math.round((diff / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
  }
  return this.hoursWorked;
};

// Static method to get attendance stats
attendanceSchema.statics.getAttendanceStats = async function(officeCode, date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  // Validate office code
  if (!officeCode || typeof officeCode !== 'string') {
    console.error('Invalid office code provided:', officeCode);
    throw new Error(`Invalid office code provided: ${officeCode}`);
  }
  
  // Get office to find total workers
  const office = await Office.findOne({ officeCode: officeCode.toUpperCase() });
  if (!office) {
    console.error(`Office not found for code: ${officeCode.toUpperCase()}`);
    // List available office codes for debugging
    const availableOffices = await Office.find({}, 'officeCode officeName');
    console.error('Available office codes:', availableOffices.map(o => ({ code: o.officeCode, name: o.officeName })));
    throw new Error(`Office not found for code: ${officeCode.toUpperCase()}`);
  }
  
  // Get enrolled workers count
  const totalWorkers = await User.countDocuments({
    userType: 'worker',
    officeCode: officeCode.toUpperCase(),
    enrollmentStatus: 'enrolled'
  }) + await Worker.countDocuments({
    officeId: office._id,
    enrollmentStatus: 'enrolled'
  });
  
  // Get attendance records for the day
  const attendanceRecords = await this.find({
    officeCode: officeCode.toUpperCase(),
    date: { $gte: startDate, $lte: endDate }
  });
  
  const presentToday = attendanceRecords.filter(r => r.status === 'present').length;
  const lateArrivals = attendanceRecords.filter(r => r.isLate).length;
  const absentToday = totalWorkers - presentToday;
  const attendanceRate = totalWorkers > 0 ? (presentToday / totalWorkers) * 100 : 0;
  
  return {
    totalWorkers,
    presentToday,
    absentToday,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    lateArrivals,
    earlyArrivals: attendanceRecords.filter(r => 
      r.checkIn?.time && new Date(r.checkIn.time).getHours() < 9
    ).length
  };
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Authentication middleware
const authenticateRequest = (req, res, next) => {
  // For now, we'll skip authentication for attendance endpoints
  // In production, you should implement proper authentication
  next();
};

// Get attendance data for a specific date and office
router.get('/attendance/:officeCode', authenticateRequest, async (req, res) => {
  try {
    const { officeCode } = req.params;
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    console.log(`📅 Fetching attendance data for office: ${officeCode}, date: ${date}`);
    
    // Validate office code
    if (!officeCode) {
      console.error('❌ No office code provided');
      return res.status(400).json({
        success: false,
        message: 'Office code is required',
        error: 'Missing office code parameter'
      });
    }
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    // Get attendance records
    const attendanceData = await Attendance.find({
      officeCode: officeCode.toUpperCase(),
      date: { $gte: startDate, $lte: endDate }
    }).sort({ 'checkIn.time': 1 });
    
    console.log(`📊 Found ${attendanceData.length} attendance records`);
    
    // Get statistics
    const stats = await Attendance.getAttendanceStats(officeCode, date);
    
    console.log('✅ Attendance stats calculated successfully');
    
    res.json({
      success: true,
      data: {
        attendance: attendanceData,
        stats: stats,
        date: date
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching attendance data:', error);
    
    // Handle specific error cases
    if (error.message.includes('Office not found')) {
      return res.status(404).json({
        success: false,
        message: 'Office not found',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data',
      error: error.message
    });
  }
});

// Mark attendance (check in/out)
// CRITICAL: Added worker authentication to ensure only the authenticated worker can mark their own attendance
router.post('/attendance/mark', authenticateWorker, validateAttendanceOwnership, async (req, res) => {
  try {
    const {
      workerId,
      workerName,
      officeCode,
      attendanceCode,
      action = 'check_in', // 'check_in' or 'check_out'
      location,
      method = 'qr_scan'
    } = req.body;
    
    if (!workerId || !officeCode || !attendanceCode) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID, office code, and attendance code are required'
      });
    }
    
    // Verify office and attendance code
    const office = await Office.findOne({ officeCode: officeCode.toUpperCase() });
    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Invalid office code'
      });
    }
    
    // Verify attendance code format
    const expectedAttendanceCode = `ATT-${officeCode.toUpperCase()}`;
    if (attendanceCode !== expectedAttendanceCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance code'
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find existing attendance record for today - MUST be unique per worker
    let attendanceRecord = await Attendance.findOne({
      workerId: workerId,  // CRITICAL: Must match exact worker ID
      officeCode: officeCode.toUpperCase(),
      date: today
    });
    
    const now = new Date();
    const locationData = location ? {
      type: 'Point',
      coordinates: [location.longitude, location.latitude]
    } : undefined;
    
    if (action === 'check_in') {
      if (attendanceRecord) {
        return res.status(400).json({
          success: false,
          message: 'Already checked in for today'
        });
      }
      
      // Determine if late (after 9:00 AM)
      const isLate = now.getHours() >= 9;
      
      // IMPORTANT: Create attendance record with exact worker ID
      attendanceRecord = new Attendance({
        workerId: workerId,  // Must be the specific worker's ID
        workerName: workerName || 'Unknown Worker',
        officeId: office._id,
        officeCode: officeCode.toUpperCase(),
        date: today,
        checkIn: {
          time: now,
          location: locationData,
          method: method
        },
        status: isLate ? 'late' : 'present',
        isLate: isLate
      });
      
      await attendanceRecord.save();
      
      res.json({
        success: true,
        message: `Check-in successful${isLate ? ' (Late arrival)' : ''}`,
        data: {
          attendanceId: attendanceRecord._id,
          checkInTime: now,
          status: attendanceRecord.status,
          isLate: isLate
        }
      });
      
    } else if (action === 'check_out') {
      if (!attendanceRecord) {
        return res.status(400).json({
          success: false,
          message: 'No check-in record found for today'
        });
      }
      
      if (attendanceRecord.checkOut?.time) {
        return res.status(400).json({
          success: false,
          message: 'Already checked out for today'
        });
      }
      
      attendanceRecord.checkOut = {
        time: now,
        location: locationData,
        method: method
      };
      
      // Calculate hours worked
      attendanceRecord.calculateHours();
      
      await attendanceRecord.save();
      
      res.json({
        success: true,
        message: 'Check-out successful',
        data: {
          attendanceId: attendanceRecord._id,
          checkOutTime: now,
          hoursWorked: attendanceRecord.hoursWorked
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use check_in or check_out'
      });
    }
    
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
});

// Get attendance history for a worker
router.get('/attendance/worker/:workerId', authenticateWorker, async (req, res) => {
  try {
    const { workerId } = req.params;
    
    // CRITICAL: Ensure worker can only view their own attendance
    if (workerId !== req.authenticatedWorkerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own attendance history',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }
    const { startDate, endDate, limit = 30 } = req.query;
    
    let query = { workerId: workerId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const attendanceHistory = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: attendanceHistory
    });
    
  } catch (error) {
    console.error('Error fetching worker attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
      error: error.message
    });
  }
});

// Generate attendance report
router.get('/attendance/report/:officeCode', authenticateRequest, async (req, res) => {
  try {
    const { officeCode } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;
    
    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    
    const attendanceData = await Attendance.find({
      officeCode: officeCode.toUpperCase(),
      ...(Object.keys(dateQuery).length > 0 && { date: dateQuery })
    }).sort({ date: -1, 'checkIn.time': 1 });
    
    // Generate summary statistics
    const summary = {
      totalRecords: attendanceData.length,
      presentDays: attendanceData.filter(r => r.status === 'present').length,
      lateDays: attendanceData.filter(r => r.isLate).length,
      averageHours: attendanceData.reduce((sum, r) => sum + (r.hoursWorked || 0), 0) / attendanceData.length || 0
    };
    
    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = 'Date,Worker Name,Worker ID,Check In,Check Out,Hours Worked,Status,Late\n';
      const csvData = attendanceData.map(record => 
        `${record.dateString},${record.workerName},${record.workerId},${record.checkIn?.time || ''},${record.checkOut?.time || ''},${record.hoursWorked || 0},${record.status},${record.isLate}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${officeCode}-${Date.now()}.csv"`);
      res.send(csvHeaders + csvData);
    } else {
      res.json({
        success: true,
        data: {
          attendance: attendanceData,
          summary: summary,
          dateRange: {
            startDate: startDate || 'All time',
            endDate: endDate || 'Present'
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate attendance report',
      error: error.message
    });
  }
});

module.exports = router;