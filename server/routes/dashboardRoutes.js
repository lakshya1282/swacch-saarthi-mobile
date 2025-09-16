const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Office = require('../models/Office');
const OfficeOperator = require('../models/OfficeOperator');
const WorkerPerformance = require('../models/WorkerPerformance');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Pickup = require('../models/Pickup');
const { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');

// Import attendance routes
const attendanceRoutes = require('./attendanceRoutes');

const router = express.Router();

// Use attendance routes
router.use('/', attendanceRoutes);

// Get enrolled workers for office dashboard
router.get('/enrolled-workers/:officeCode', async (req, res) => {
  try {
    const { officeCode } = req.params;
    
    // Find office by code
    const office = await Office.findOne({ officeCode: officeCode.toUpperCase() });
    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Office not found'
      });
    }
    
    // Find enrolled workers (stored in User collection)
    const enrolledWorkers = await User.find({
      userType: 'worker',
      officeCode: officeCode.toUpperCase(),
      enrollmentStatus: 'enrolled'
    }).select('firstName lastName email phone workerId enrolledAt totalPickups totalWasteCollected rating isActive isAvailable updatedAt');
    
    // Get performance statistics
    const totalWorkers = enrolledWorkers.length;
    const activeWorkers = enrolledWorkers.filter(w => w.isActive && w.isAvailable).length;
    const totalPickups = enrolledWorkers.reduce((sum, w) => sum + (w.totalPickups || 0), 0);
    const totalWasteCollected = enrolledWorkers.reduce((sum, w) => sum + (w.totalWasteCollected || 0), 0);
    
    // Calculate average rating
    const workersWithRatings = enrolledWorkers.filter(w => w.rating?.count > 0);
    const averageRating = workersWithRatings.length > 0 
      ? workersWithRatings.reduce((sum, w) => sum + w.rating.average, 0) / workersWithRatings.length 
      : 0;
    
    // Get recent enrollments (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEnrollments = enrolledWorkers.filter(w => 
      w.enrolledAt && new Date(w.enrolledAt) > sevenDaysAgo
    ).length;
    
    res.json({
      success: true,
      office: {
        _id: office._id,
        officeName: office.officeName,
        officeCode: office.officeCode,
        address: office.address
      },
      statistics: {
        totalWorkers,
        activeWorkers,
        totalPickups,
        totalWasteCollected: Math.round(totalWasteCollected * 100) / 100, // Round to 2 decimal places
        averageRating: Math.round(averageRating * 100) / 100,
        recentEnrollments
      },
      workers: enrolledWorkers.map(worker => ({
        _id: worker._id,
        name: `${worker.firstName} ${worker.lastName}`,
        email: worker.email,
        phone: worker.phone,
        workerId: worker.workerId,
        status: worker.isActive ? (worker.isAvailable ? 'AVAILABLE' : 'BUSY') : 'OFF_DUTY',
        enrolledAt: worker.enrolledAt,
        lastActiveAt: worker.updatedAt,
        performance: {
          totalPickups: worker.totalPickups || 0,
          totalWasteCollected: worker.totalWasteCollected || 0,
          rating: {
            average: worker.rating?.average || 0,
            count: worker.rating?.count || 0
          }
        }
      }))
    });
    
  } catch (error) {
    console.error('Error fetching enrolled workers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled workers',
      error: error.message
    });
  }
});

// Dashboard Authentication Middleware
const authenticateOperator = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'waste-management-secret');
    const operator = await OfficeOperator.findById(decoded.operatorId).populate('officeInfo.officeId');
    
    if (!operator) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (operator.status !== 'active') {
      return res.status(403).json({ message: 'Account is inactive.' });
    }

    req.operator = operator;
    req.office = operator.officeInfo.officeId;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Helper function to get date range
const getDateRange = (range) => {
  const now = new Date();
  
  switch (range) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
      return { start: quarterStart, end: quarterEnd };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
};

// Simplified Office Registration
router.post('/register-office', async (req, res) => {
  try {
    const { office: officeData, operator: operatorData } = req.body;

    console.log('📝 Simplified registration attempt');
    
    // For simplified registration, we only need basic office info
    if (!officeData) {
      return res.status(400).json({ message: 'Office data is required.' });
    }

    // Validate only essential fields as per the form
    if (!officeData.officeName) {
      return res.status(400).json({ 
        message: 'Office name is required.',
        field: 'officeName'
      });
    }

    if (!officeData.address) {
      return res.status(400).json({ 
        message: 'Address information is required.',
        field: 'address'
      });
    }

    // Validate address fields
    const requiredAddressFields = ['street', 'city', 'state', 'pincode'];
    for (const field of requiredAddressFields) {
      if (!officeData.address[field]) {
        return res.status(400).json({ 
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`,
          field: field
        });
      }
    }

    // Validate pincode format
    if (officeData.address.pincode && !officeData.address.pincode.match(/^[0-9]{6}$/)) {
      return res.status(400).json({ 
        message: 'Pincode must be exactly 6 digits.',
        field: 'pincode'
      });
    }

    // Validate location coordinates
    if (!officeData.location || !officeData.location.latitude || !officeData.location.longitude) {
      return res.status(400).json({ 
        message: 'Location coordinates (latitude and longitude) are required.',
        field: 'location'
      });
    }

    // Office code will be auto-generated, so we only check if manually provided
    if (officeData.officeCode) {
      const existingOffice = await Office.findOne({ officeCode: officeData.officeCode });
      if (existingOffice) {
        return res.status(400).json({ 
          message: 'Office code already exists. Please choose a different code.',
          field: 'officeCode'
        });
      }
    }

    // Only validate operator data if provided
    if (operatorData) {
      // Check if operator email already exists
      if (operatorData.personalInfo && operatorData.personalInfo.email) {
        const existingOperator = await OfficeOperator.findOne({ 
          'personalInfo.email': operatorData.personalInfo.email 
        });
        if (existingOperator) {
          return res.status(400).json({ 
            message: 'Email already registered. Please use a different email.',
            field: 'operatorEmail'
          });
        }
      }

      // Check if employee ID already exists
      if (operatorData.personalInfo && operatorData.personalInfo.employeeId) {
        const existingEmployeeId = await OfficeOperator.findOne({ 
          'personalInfo.employeeId': operatorData.personalInfo.employeeId 
        });
        if (existingEmployeeId) {
          return res.status(400).json({ 
            message: 'Employee ID already exists. Please use a different ID.',
            field: 'employeeId'
          });
        }
      }
    }

    // Create office with only the essential fields
    const newOffice = new Office({
      officeName: officeData.officeName,
      address: {
        street: officeData.address.street,
        area: officeData.address.area || officeData.address.locality, // Support both field names
        city: officeData.address.city,
        state: officeData.address.state,
        pincode: officeData.address.pincode
      },
      location: {
        latitude: parseFloat(officeData.location.latitude),
        longitude: parseFloat(officeData.location.longitude)
      },
      // Optional fields with defaults
      contactInfo: officeData.contactInfo || {},
      coverageArea: officeData.coverageArea || { radius: 5, zones: [] },
      operationalHours: officeData.operationalHours || { 
        startTime: '08:00', 
        endTime: '18:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      }
    });
    
    await newOffice.save();
    console.log(`✅ Office created with code: ${newOffice.officeCode}`);

    // Create operator only if data is provided
    let newOperator = null;
    if (operatorData && operatorData.personalInfo) {
      newOperator = new OfficeOperator({
        ...operatorData,
        officeInfo: {
          ...operatorData.officeInfo,
          officeId: newOffice._id
        }
      });
      await newOperator.save();
    }

    // Generate JWT token (only if operator was created)
    let token = null;
    if (newOperator) {
      token = jwt.sign(
        { 
          operatorId: newOperator._id,
          officeId: newOffice._id,
          type: 'dashboard'
        },
        process.env.JWT_SECRET || 'waste-management-secret',
        { expiresIn: '7d' }
      );
    }

    // Return success response
    const response = {
      message: 'Office registered successfully',
      office: {
        _id: newOffice._id,
        officeName: newOffice.officeName,
        officeCode: newOffice.officeCode,  // Auto-generated code
        address: newOffice.address,
        location: newOffice.location,
        coverageArea: newOffice.coverageArea,
        contactInfo: newOffice.contactInfo,
        operationalHours: newOffice.operationalHours
      }
    };

    // Include operator and token only if operator was created
    if (newOperator) {
      response.token = token;
      response.operator = {
        _id: newOperator._id,
        personalInfo: {
          firstName: newOperator.personalInfo.firstName,
          lastName: newOperator.personalInfo.lastName,
          employeeId: newOperator.personalInfo.employeeId,
          designation: newOperator.personalInfo.designation,
          email: newOperator.personalInfo.email,
          phone: newOperator.personalInfo.phone
        },
        officeInfo: newOperator.officeInfo,
        permissions: newOperator.permissions
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: 'Duplicate value for unique field',
        field
      });
    }

    res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message 
    });
  }
});

// Login Operator
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find operator by email
    const operator = await OfficeOperator.findOne({ 
      'personalInfo.email': email 
    }).populate('officeInfo.officeId');

    if (!operator) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if account is locked
    if (operator.isLocked) {
      return res.status(423).json({ 
        message: 'Account is temporarily locked due to too many failed login attempts.' 
      });
    }

    // Verify password
    const isValidPassword = await operator.comparePassword(password);
    
    if (!isValidPassword) {
      await operator.incrementLoginAttempts();
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Reset login attempts on successful login
    await operator.updateOne({
      $unset: { 'authentication.loginAttempts': 1, 'authentication.lockUntil': 1 },
      $set: { 
        'authentication.lastLogin': new Date(),
        'activity.lastActiveAt': new Date()
      },
      $inc: { 'activity.sessionsCount': 1 }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        operatorId: operator._id,
        officeId: operator.officeInfo.officeId._id,
        type: 'dashboard'
      },
      process.env.JWT_SECRET || 'waste-management-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      office: operator.officeInfo.officeId,
      operator: {
        _id: operator._id,
        personalInfo: operator.personalInfo,
        officeInfo: operator.officeInfo,
        permissions: operator.permissions,
        preferences: operator.preferences
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get Dashboard Overview
router.get('/overview/:officeId', authenticateOperator, async (req, res) => {
  try {
    const { officeId } = req.params;
    const { range = 'today' } = req.query;
    const { start, end } = getDateRange(range);

    // Verify office access
    if (req.office._id.toString() !== officeId) {
      return res.status(403).json({ message: 'Access denied to this office data.' });
    }

    // Get workers for this office
    const workers = await Worker.find({ 'workLocation.officeId': officeId });
    const workerIds = workers.map(w => w._id);

    // Get performance data for the date range
    const performances = await WorkerPerformance.find({
      officeId,
      workerId: { $in: workerIds },
      date: { $gte: start, $lte: end }
    });

    // Calculate overview statistics
    const overview = {
      totalWorkers: workers.length,
      activeWorkers: workers.filter(w => w.status === 'active').length,
      totalWasteCollected: performances.reduce((sum, p) => sum + (p.wasteCollection?.totalWeight || 0), 0),
      totalIncentivesEarned: performances.reduce((sum, p) => sum + (p.incentive?.earnedAmount || 0), 0),
      totalPickups: performances.reduce((sum, p) => sum + (p.wasteCollection?.pickupsCompleted || 0), 0),
      efficiency: performances.length > 0 ? 
        Math.round(performances.reduce((sum, p) => sum + (p.summary?.efficiency || 0), 0) / performances.length) : 0
    };

    // Update office statistics
    await Office.findByIdAndUpdate(officeId, {
      'statistics.totalWorkers': overview.totalWorkers,
      'statistics.activeWorkers': overview.activeWorkers,
      'statistics.totalWasteCollected': overview.totalWasteCollected,
      'statistics.totalIncentivesPaid': overview.totalIncentivesEarned
    });

    res.json(overview);

  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ message: 'Error fetching overview data' });
  }
});

// Get Workers Data
router.get('/workers/:officeId', authenticateOperator, async (req, res) => {
  try {
    const { officeId } = req.params;

    // Verify office access
    if (req.office._id.toString() !== officeId) {
      return res.status(403).json({ message: 'Access denied to this office data.' });
    }

    // Get workers with today's performance
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const workers = await Worker.find({ 
      'workLocation.officeId': officeId 
    }).lean();

    // Get today's performance for each worker
    const workersWithPerformance = await Promise.all(
      workers.map(async (worker) => {
        const todayPerformance = await WorkerPerformance.findOne({
          workerId: worker._id,
          officeId,
          date: { $gte: startOfToday, $lte: endOfToday }
        }).lean();

        return {
          ...worker,
          todayPerformance: todayPerformance?.wasteCollection || {
            totalWeight: 0,
            pickupsCompleted: 0
          },
          lastUpdated: todayPerformance?.updatedAt || null
        };
      })
    );

    res.json(workersWithPerformance);

  } catch (error) {
    console.error('Workers error:', error);
    res.status(500).json({ message: 'Error fetching workers data' });
  }
});

// Get Performance Analytics
router.get('/performance/:officeId', authenticateOperator, async (req, res) => {
  try {
    const { officeId } = req.params;
    const { range = 'week' } = req.query;

    // Verify office access
    if (req.office._id.toString() !== officeId) {
      return res.status(403).json({ message: 'Access denied to this office data.' });
    }

    const { start, end } = getDateRange(range);

    // Get aggregated performance data
    const performanceData = await WorkerPerformance.aggregate([
      {
        $match: {
          officeId: require('mongoose').Types.ObjectId(officeId),
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          totalWeight: { $sum: "$wasteCollection.totalWeight" },
          totalPickups: { $sum: "$wasteCollection.pickupsCompleted" },
          totalIncentives: { $sum: "$incentive.earnedAmount" },
          activeWorkers: { $addToSet: "$workerId" },
          avgEfficiency: { $avg: "$summary.efficiency" }
        }
      },
      {
        $project: {
          date: "$_id",
          totalWeight: 1,
          totalPickups: 1,
          totalIncentives: 1,
          activeWorkers: { $size: "$activeWorkers" },
          avgEfficiency: { $round: ["$avgEfficiency", 1] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json(performanceData);

  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ message: 'Error fetching performance data' });
  }
});

// Get Incentives Data
router.get('/incentives/:officeId', authenticateOperator, async (req, res) => {
  try {
    const { officeId } = req.params;
    const { range = 'month' } = req.query;

    // Verify office access
    if (req.office._id.toString() !== officeId) {
      return res.status(403).json({ message: 'Access denied to this office data.' });
    }

    const { start, end } = getDateRange(range);

    // Get incentive data with worker details
    const incentives = await WorkerPerformance.find({
      officeId,
      date: { $gte: start, $lte: end },
      'incentive.earnedAmount': { $gt: 0 }
    }).populate('workerId', 'personalInfo workerId').lean();

    // Format incentive data
    const formattedIncentives = incentives.map(perf => ({
      workerId: perf.workerId._id,
      workerName: `${perf.workerId.personalInfo.firstName} ${perf.workerId.personalInfo.lastName}`,
      workerCode: perf.workerId.workerId,
      date: perf.date,
      totalWeight: perf.wasteCollection.totalWeight,
      qualifyingWeight: perf.incentive.qualifyingWeight,
      earnedAmount: perf.incentive.earnedAmount,
      paid: perf.incentive.paid,
      paymentDate: perf.incentive.paymentDate
    }));

    res.json(formattedIncentives);

  } catch (error) {
    console.error('Incentives error:', error);
    res.status(500).json({ message: 'Error fetching incentives data' });
  }
});

// Submit Worker Performance (from mobile app)
router.post('/submit-performance', authenticateOperator, async (req, res) => {
  try {
    const performanceData = req.body;

    // Validate required fields
    if (!performanceData.workerId || !performanceData.officeId) {
      return res.status(400).json({ message: 'Worker ID and Office ID are required.' });
    }

    // Check if performance already exists for today
    const today = new Date();
    const existingPerformance = await WorkerPerformance.findOne({
      workerId: performanceData.workerId,
      officeId: performanceData.officeId,
      date: {
        $gte: startOfDay(today),
        $lte: endOfDay(today)
      }
    });

    let performance;
    
    if (existingPerformance) {
      // Update existing performance
      Object.assign(existingPerformance, performanceData);
      performance = await existingPerformance.save();
    } else {
      // Create new performance record
      performance = new WorkerPerformance({
        ...performanceData,
        date: today,
        reportedBy: req.operator._id
      });
      await performance.save();
    }

    // Emit real-time update
    req.app.locals.io?.to(`office-${performanceData.officeId}`).emit('worker-performance-update', {
      workerId: performance.workerId,
      performance: performance.wasteCollection,
      incentive: performance.getIncentiveDetails()
    });

    res.json({
      message: 'Performance submitted successfully',
      performance: performance,
      incentiveDetails: performance.getIncentiveDetails()
    });

  } catch (error) {
    console.error('Submit performance error:', error);
    res.status(500).json({ message: 'Error submitting performance data' });
  }
});

// Process Incentive Payments
router.post('/process-incentive-payment', authenticateOperator, async (req, res) => {
  try {
    const { performanceIds, paymentReference } = req.body;

    if (!performanceIds || !Array.isArray(performanceIds) || performanceIds.length === 0) {
      return res.status(400).json({ message: 'Performance IDs are required.' });
    }

    // Update payment status
    const updateResult = await WorkerPerformance.updateMany(
      {
        _id: { $in: performanceIds },
        officeId: req.office._id,
        'incentive.earnedAmount': { $gt: 0 },
        'incentive.paid': false
      },
      {
        $set: {
          'incentive.paid': true,
          'incentive.paymentDate': new Date(),
          'incentive.paymentReference': paymentReference || `PAY-${Date.now()}`,
          verifiedBy: req.operator._id
        }
      }
    );

    // Calculate total payment amount
    const payments = await WorkerPerformance.find({
      _id: { $in: performanceIds }
    }).populate('workerId', 'personalInfo');

    const totalAmount = payments.reduce((sum, p) => sum + p.incentive.earnedAmount, 0);

    // Update office statistics
    await Office.findByIdAndUpdate(req.office._id, {
      $inc: { 'statistics.totalIncentivesPaid': totalAmount }
    });

    res.json({
      message: 'Incentive payments processed successfully',
      paymentsProcessed: updateResult.modifiedCount,
      totalAmount,
      paymentReference: paymentReference || `PAY-${Date.now()}`
    });

  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Error processing incentive payments' });
  }
});

// Get Operator Profile
router.get('/profile', authenticateOperator, async (req, res) => {
  try {
    const operator = await OfficeOperator.findById(req.operator._id)
      .populate('officeInfo.officeId')
      .select('-authentication.password');

    res.json(operator);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Error fetching profile data' });
  }
});

// Update Operator Preferences
router.put('/preferences', authenticateOperator, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const operator = await OfficeOperator.findByIdAndUpdate(
      req.operator._id,
      { 
        preferences: { ...req.operator.preferences, ...preferences },
        'activity.lastActiveAt': new Date()
      },
      { new: true }
    ).select('preferences');

    res.json({
      message: 'Preferences updated successfully',
      preferences: operator.preferences
    });
  } catch (error) {
    console.error('Preferences error:', error);
    res.status(500).json({ message: 'Error updating preferences' });
  }
});

// Office Profile Routes
router.get('/office-profile/:officeId', authenticateOperator, async (req, res) => {
  try {
    const { officeId } = req.params;
    
    // Ensure operator can only access their own office
    if (req.office._id.toString() !== officeId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const office = await Office.findById(officeId);
    if (!office) {
      return res.status(404).json({ message: 'Office not found.' });
    }
    
    res.json(office);
  } catch (error) {
    console.error('Error fetching office profile:', error);
    res.status(500).json({ message: 'Failed to fetch office profile.' });
  }
});

// Update Office Profile
router.put('/office-profile/:officeId', authenticateOperator, async (req, res) => {
  try {
    const { officeId } = req.params;
    const updateData = req.body;
    
    // Ensure operator can only update their own office
    if (req.office._id.toString() !== officeId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    // Only allow certain fields to be updated
    const allowedFields = ['officeName', 'contactInfo', 'operationalHours', 'coverageArea'];
    const filteredUpdate = {};
    
    allowedFields.forEach(field => {
      if (updateData[field]) {
        filteredUpdate[field] = updateData[field];
      }
    });
    
    const office = await Office.findByIdAndUpdate(
      officeId,
      { ...filteredUpdate, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!office) {
      return res.status(404).json({ message: 'Office not found.' });
    }
    
    res.json(office);
  } catch (error) {
    console.error('Error updating office profile:', error);
    res.status(500).json({ message: 'Failed to update office profile.' });
  }
});

// Get Enrollment Statistics
router.get('/enrollment-stats/:officeId', authenticateOperator, async (req, res) => {
  try {
    const { officeId } = req.params;
    
    // Ensure operator can only access their own office stats
    if (req.office._id.toString() !== officeId) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    // Get workers associated with this office
    const totalWorkers = await Worker.countDocuments({ officeId: officeId });
    const activeWorkers = await Worker.countDocuments({ 
      officeId: officeId, 
      isActive: true,
      status: 'AVAILABLE' 
    });
    
    // Get recent enrollments (workers who joined in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEnrollments = await Worker.find({
      officeId: officeId,
      createdAt: { $gte: thirtyDaysAgo }
    })
    .select('firstName lastName createdAt isActive')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    // Format recent enrollments
    const formattedEnrollments = recentEnrollments.map(worker => ({
      id: worker._id,
      name: `${worker.firstName} ${worker.lastName}`,
      joinedAt: worker.createdAt,
      status: worker.isActive ? 'active' : 'pending'
    }));
    
    // Count pending applications (inactive workers)
    const pendingApplications = await Worker.countDocuments({ 
      officeId: officeId, 
      isActive: false 
    });
    
    res.json({
      totalWorkers,
      activeWorkers,
      pendingApplications,
      recentEnrollments: formattedEnrollments
    });
  } catch (error) {
    console.error('Error fetching enrollment stats:', error);
    res.status(500).json({ message: 'Failed to fetch enrollment statistics.' });
  }
});

// Worker Enrollment with Office Code
router.post('/worker-enrollment', async (req, res) => {
  try {
    const { officeCode, workerData } = req.body;
    
    if (!officeCode) {
      return res.status(400).json({ message: 'Office code is required.' });
    }
    
    // Find office by code
    const office = await Office.findOne({ officeCode: officeCode.toUpperCase() });
    if (!office) {
      return res.status(404).json({ message: 'Invalid office code.' });
    }
    
    if (office.status !== 'active') {
      return res.status(400).json({ message: 'Office is not currently accepting enrollments.' });
    }
    
    // Check if worker already exists
    const existingWorker = await Worker.findOne({ 
      $or: [
        { email: workerData.email },
        { phone: workerData.phone },
        { employeeId: workerData.employeeId }
      ]
    });
    
    if (existingWorker) {
      return res.status(400).json({ 
        message: 'Worker with this email, phone, or employee ID already exists.' 
      });
    }
    
    // Create new worker with office association
    const worker = new Worker({
      ...workerData,
      officeId: office._id,
      isActive: false, // Pending approval
      isVerified: false
    });
    
    await worker.save();
    
    // Update office statistics
    await Office.findByIdAndUpdate(office._id, {
      $inc: { 'statistics.totalWorkers': 1 }
    });
    
    res.status(201).json({
      message: 'Worker enrollment submitted successfully. Awaiting office approval.',
      worker: {
        id: worker._id,
        name: `${worker.firstName} ${worker.lastName}`,
        email: worker.email,
        status: 'pending'
      },
      office: {
        name: office.officeName,
        code: office.officeCode
      }
    });
    
  } catch (error) {
    console.error('Error processing worker enrollment:', error);
    res.status(500).json({ message: 'Failed to process worker enrollment.' });
  }
});

// Approve/Reject Worker Enrollment
router.put('/worker-enrollment/:workerId/:action', authenticateOperator, async (req, res) => {
  try {
    const { workerId, action } = req.params;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use approve or reject.' });
    }
    
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found.' });
    }
    
    // Ensure operator can only manage workers from their office
    if (worker.officeId && worker.officeId.toString() !== req.office._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    if (action === 'approve') {
      worker.isActive = true;
      worker.isVerified = true;
      await worker.save();
      
      // Update office statistics
      await Office.findByIdAndUpdate(req.office._id, {
        $inc: { 'statistics.activeWorkers': 1 }
      });
      
      res.json({ message: 'Worker approved successfully.', worker });
    } else {
      // Reject - remove worker
      await Worker.findByIdAndDelete(workerId);
      
      // Update office statistics
      await Office.findByIdAndUpdate(req.office._id, {
        $inc: { 'statistics.totalWorkers': -1 }
      });
      
      res.json({ message: 'Worker enrollment rejected.' });
    }
    
  } catch (error) {
    console.error('Error processing worker enrollment action:', error);
    res.status(500).json({ message: 'Failed to process worker enrollment action.' });
  }
});

// Get office worker performance metrics
router.get('/office/:officeId/workers/performance', async (req, res) => {
  try {
    const { officeId } = req.params;
    const { period = 'month', workerId } = req.query;
    
    // Verify office exists
    const office = await Office.findById(officeId);
    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Office not found'
      });
    }
    
    // Get date range
    const { start, end } = getDateRange(period);
    
    // Find workers enrolled in this office
    const workersQuery = workerId ? 
      { _id: workerId, officeId: officeId } : 
      { officeId: officeId, enrollmentStatus: 'enrolled' };
    
    const workers = await Worker.find(workersQuery)
      .select('firstName lastName employeeId performance enrolledAt status');
    
    if (workers.length === 0) {
      return res.json({
        success: true,
        data: {
          office: { name: office.officeName, code: office.officeCode },
          period: { start, end, type: period },
          workers: [],
          summary: {
            totalWorkers: 0,
            totalWeight: 0,
            totalPickups: 0,
            averageEfficiency: 0,
            totalIncentives: 0
          }
        }
      });
    }
    
    // Get performance records for the period
    const performancePromises = workers.map(async (worker) => {
      const records = await WorkerPerformance.find({
        workerId: worker._id,
        date: { $gte: start, $lte: end }
      }).sort({ date: -1 });
      
      // Calculate metrics
      const totalWeight = records.reduce((sum, r) => sum + (r.wasteCollection.totalWeight || 0), 0);
      const totalPickups = records.reduce((sum, r) => sum + (r.wasteCollection.pickupsCompleted || 0), 0);
      const totalIncentives = records.reduce((sum, r) => sum + (r.incentive.earnedAmount || 0), 0);
      const avgEfficiency = records.length > 0 ? 
        records.reduce((sum, r) => sum + (r.summary.efficiency || 0), 0) / records.length : 0;
      
      // Calculate attendance
      const expectedDays = getWorkingDaysBetweenDates(start, end, worker.workSchedule);
      const attendanceRate = expectedDays > 0 ? (records.length / expectedDays) * 100 : 0;
      
      // Get recent trend (last 7 days)
      const recentRecords = records.slice(0, 7);
      const trend = recentRecords.map(r => ({
        date: r.date,
        weight: r.wasteCollection.totalWeight,
        pickups: r.wasteCollection.pickupsCompleted,
        efficiency: r.summary.efficiency
      }));
      
      return {
        worker: {
          id: worker._id,
          name: worker.fullName,
          employeeId: worker.employeeId,
          status: worker.status,
          enrolledAt: worker.enrolledAt
        },
        metrics: {
          attendance: {
            rate: Math.round(attendanceRate),
            daysWorked: records.length,
            expectedDays
          },
          performance: {
            totalWeight: Math.round(totalWeight * 100) / 100,
            totalPickups,
            averageEfficiency: Math.round(avgEfficiency),
            totalIncentives: Math.round(totalIncentives * 100) / 100
          },
          rating: {
            average: worker.performance.rating.average || 0,
            count: worker.performance.rating.count || 0
          },
          completionRate: worker.completionRate || 0
        },
        trend
      };
    });
    
    const workerPerformances = await Promise.all(performancePromises);
    
    // Calculate office summary
    const summary = {
      totalWorkers: workers.length,
      totalWeight: workerPerformances.reduce((sum, wp) => sum + wp.metrics.performance.totalWeight, 0),
      totalPickups: workerPerformances.reduce((sum, wp) => sum + wp.metrics.performance.totalPickups, 0),
      averageEfficiency: workerPerformances.length > 0 ? 
        workerPerformances.reduce((sum, wp) => sum + wp.metrics.performance.averageEfficiency, 0) / workerPerformances.length : 0,
      totalIncentives: workerPerformances.reduce((sum, wp) => sum + wp.metrics.performance.totalIncentives, 0),
      averageAttendance: workerPerformances.length > 0 ? 
        workerPerformances.reduce((sum, wp) => sum + wp.metrics.attendance.rate, 0) / workerPerformances.length : 0
    };
    
    res.json({
      success: true,
      data: {
        office: {
          id: office._id,
          name: office.officeName,
          code: office.officeCode
        },
        period: { start, end, type: period },
        workers: workerPerformances,
        summary: {
          ...summary,
          totalWeight: Math.round(summary.totalWeight * 100) / 100,
          averageEfficiency: Math.round(summary.averageEfficiency),
          totalIncentives: Math.round(summary.totalIncentives * 100) / 100,
          averageAttendance: Math.round(summary.averageAttendance)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching office worker performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker performance data',
      error: error.message
    });
  }
});

// Get office worker details with enrollment status
router.get('/office/:officeCode/workers/details', async (req, res) => {
  try {
    const { officeCode } = req.params;
    
    // Find office
    const office = await Office.findOne({ officeCode: officeCode.toUpperCase() });
    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Office not found'
      });
    }
    
    // Find workers enrolled in this office (check both Worker and User models)
    const workerPromises = [
      Worker.find({ officeId: office._id, enrollmentStatus: 'enrolled' })
        .select('firstName lastName email phone employeeId status enrolledAt performance workSchedule'),
      User.find({ 
        userType: 'worker',
        officeCode: officeCode.toUpperCase(),
        enrollmentStatus: 'enrolled'
      }).select('firstName lastName email phone enrolledAt totalPickups totalWasteCollected rating isActive')
    ];
    
    const [workersFromWorkerModel, workersFromUserModel] = await Promise.all(workerPromises);
    
    // Combine workers from both models
    const allWorkers = [
      ...workersFromWorkerModel.map(w => ({
        ...w.toObject(),
        source: 'worker_model',
        fullName: w.fullName,
        completionRate: w.completionRate
      })),
      ...workersFromUserModel.map(w => ({
        ...w.toObject(),
        source: 'user_model',
        fullName: `${w.firstName} ${w.lastName}`,
        status: w.isActive ? 'AVAILABLE' : 'OFF_DUTY',
        performance: {
          totalAssignments: w.totalPickups || 0,
          completedAssignments: w.totalPickups || 0,
          totalWasteCollected: w.totalWasteCollected || 0,
          rating: w.rating || { average: 0, count: 0 }
        },
        completionRate: 100 // Assume 100% for user model workers
      }))
    ];
    
    // Remove duplicates (same worker might exist in both models)
    const uniqueWorkers = allWorkers.reduce((unique, worker) => {
      const existing = unique.find(u => u.email === worker.email);
      if (!existing) {
        unique.push(worker);
      } else if (worker.source === 'worker_model' && existing.source === 'user_model') {
        // Prefer worker model data
        const index = unique.findIndex(u => u.email === worker.email);
        unique[index] = worker;
      }
      return unique;
    }, []);
    
    // Get recent performance data for each worker
    const workersWithPerformance = await Promise.all(
      uniqueWorkers.map(async (worker) => {
        const recentPerformance = await WorkerPerformance.find({
          workerId: worker._id,
          date: { $gte: subDays(new Date(), 30) }
        }).sort({ date: -1 }).limit(10);
        
        const thisMonth = await WorkerPerformance.find({
          workerId: worker._id,
          date: { 
            $gte: startOfMonth(new Date()),
            $lte: endOfMonth(new Date())
          }
        });
        
        const monthlyWeight = thisMonth.reduce((sum, r) => sum + (r.wasteCollection.totalWeight || 0), 0);
        const monthlyPickups = thisMonth.reduce((sum, r) => sum + (r.wasteCollection.pickupsCompleted || 0), 0);
        const monthlyIncentives = thisMonth.reduce((sum, r) => sum + (r.incentive.earnedAmount || 0), 0);
        
        return {
          ...worker,
          monthlyStats: {
            weight: Math.round(monthlyWeight * 100) / 100,
            pickups: monthlyPickups,
            incentives: Math.round(monthlyIncentives * 100) / 100,
            workDays: thisMonth.length
          },
          recentPerformance: recentPerformance.slice(0, 5).map(r => ({
            date: r.date,
            weight: r.wasteCollection.totalWeight,
            pickups: r.wasteCollection.pickupsCompleted,
            efficiency: r.summary.efficiency
          }))
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        office: {
          id: office._id,
          name: office.officeName,
          code: office.officeCode,
          address: office.address
        },
        workers: workersWithPerformance,
        summary: {
          total: uniqueWorkers.length,
          active: uniqueWorkers.filter(w => w.status === 'AVAILABLE').length,
          busy: uniqueWorkers.filter(w => w.status === 'BUSY' || w.status === 'ON_ROUTE').length,
          offline: uniqueWorkers.filter(w => w.status === 'OFF_DUTY').length
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching worker details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker details',
      error: error.message
    });
  }
});

// Update worker performance (for manual tracking by operator)
router.post('/office/:officeCode/worker/:workerId/performance', async (req, res) => {
  try {
    const { officeCode, workerId } = req.params;
    const performanceData = req.body;
    
    // Verify office exists
    const office = await Office.findOne({ officeCode: officeCode.toUpperCase() });
    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Office not found'
      });
    }
    
    // Verify worker exists and is enrolled in this office
    const worker = await Worker.findOne({
      _id: workerId,
      officeId: office._id,
      enrollmentStatus: 'enrolled'
    });
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found or not enrolled in this office'
      });
    }
    
    // Create or update performance record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let performanceRecord = await WorkerPerformance.findOne({
      workerId: workerId,
      officeId: office._id,
      date: today
    });
    
    if (performanceRecord) {
      // Update existing record
      Object.assign(performanceRecord, performanceData);
    } else {
      // Create new record
      performanceRecord = new WorkerPerformance({
        workerId: workerId,
        officeId: office._id,
        date: today,
        ...performanceData
      });
    }
    
    await performanceRecord.save();
    
    res.json({
      success: true,
      message: 'Performance data updated successfully',
      data: performanceRecord
    });
    
  } catch (error) {
    console.error('Error updating worker performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update performance data',
      error: error.message
    });
  }
});

// Get office dashboard summary
router.get('/office/:officeCode/summary', async (req, res) => {
  try {
    const { officeCode } = req.params;
    
    // Find office
    const office = await Office.findOne({ officeCode: officeCode.toUpperCase() });
    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Office not found'
      });
    }
    
    // Get current date ranges
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Get enrolled workers count
    const totalWorkers = await Worker.countDocuments({
      officeId: office._id,
      enrollmentStatus: 'enrolled'
    }) + await User.countDocuments({
      userType: 'worker',
      officeCode: officeCode.toUpperCase(),
      enrollmentStatus: 'enrolled'
    });
    
    // Get today's performance summary
    const todayPerformance = await WorkerPerformance.aggregate([
      {
        $match: {
          officeId: office._id,
          date: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: '$wasteCollection.totalWeight' },
          totalPickups: { $sum: '$wasteCollection.pickupsCompleted' },
          totalIncentives: { $sum: '$incentive.earnedAmount' },
          workersActive: { $addToSet: '$workerId' },
          avgEfficiency: { $avg: '$summary.efficiency' }
        }
      }
    ]);
    
    // Get monthly performance summary
    const monthlyPerformance = await WorkerPerformance.aggregate([
      {
        $match: {
          officeId: office._id,
          date: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: '$wasteCollection.totalWeight' },
          totalPickups: { $sum: '$wasteCollection.pickupsCompleted' },
          totalIncentives: { $sum: '$incentive.earnedAmount' },
          uniqueWorkers: { $addToSet: '$workerId' },
          avgEfficiency: { $avg: '$summary.efficiency' }
        }
      }
    ]);
    
    const todayStats = todayPerformance[0] || {
      totalWeight: 0,
      totalPickups: 0,
      totalIncentives: 0,
      workersActive: [],
      avgEfficiency: 0
    };
    
    const monthlyStats = monthlyPerformance[0] || {
      totalWeight: 0,
      totalPickups: 0,
      totalIncentives: 0,
      uniqueWorkers: [],
      avgEfficiency: 0
    };
    
    res.json({
      success: true,
      data: {
        office: {
          id: office._id,
          name: office.officeName,
          code: office.officeCode,
          address: office.address,
          totalWorkers
        },
        today: {
          weight: Math.round(todayStats.totalWeight * 100) / 100,
          pickups: todayStats.totalPickups,
          incentives: Math.round(todayStats.totalIncentives * 100) / 100,
          activeWorkers: todayStats.workersActive.length,
          efficiency: Math.round(todayStats.avgEfficiency || 0)
        },
        thisMonth: {
          weight: Math.round(monthlyStats.totalWeight * 100) / 100,
          pickups: monthlyStats.totalPickups,
          incentives: Math.round(monthlyStats.totalIncentives * 100) / 100,
          activeWorkers: monthlyStats.uniqueWorkers.length,
          efficiency: Math.round(monthlyStats.avgEfficiency || 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching office summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch office summary',
      error: error.message
    });
  }
});

// Helper function to calculate working days between dates
function getWorkingDaysBetweenDates(startDate, endDate, workSchedule) {
  if (!workSchedule || !workSchedule.workingDays) {
    // Default to Monday-Friday
    return getBusinessDays(startDate, endDate);
  }
  
  let count = 0;
  const current = new Date(startDate);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  while (current <= endDate) {
    const dayName = dayNames[current.getDay()];
    if (workSchedule.workingDays.includes(dayName)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// Helper function to calculate business days
function getBusinessDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

module.exports = router;
